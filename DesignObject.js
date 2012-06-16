/**
 * @constructor
 * @public
 * @class Generelles Parent-Objekt.
 * @description Das DesignObject ist die wichtigste Klasse des CMS. Von Ihr leiten sich alle Objekte ab, die entweder a)
 *              den Inhalt der Seite manipulieren oder b) auf eine einkommende Nachricht der WebSocket-Verbindung
 *              reagieren oder c) auf ein Event des Users regiert. Ebenso stellt das DesignObjekt den erbenden Objekten
 *              Methoden zur Verf&uuml;gung, um den eigenen Content zu ver&auml;ndern und eine DesignStruktur
 *              auszugeben.
 */
var DesignObject = function ( ) {
	// ################################################################
	// ----------VARIABLEN---------------------------------------------
	// ################################################################
	
	/**
	 * @private
	 * @default jQuerySelector
	 * @description JQuery-Objekt des von diesem Designhandler repr&auml;sentierten Objekts (Die eigenen Sandbox).
	 */
	this.thisObj = null;
	
	/**
	 * @private
	 * @default wtdoUpdatePath
	 * @description Beinhaltet den Namen des Attributes, in dem der WebTouchDataPath f&uuml;r die Updates steht
	 */
	this.spanAttr = DesignParts.DesignSnippets.general.spanAttr;
	
	/**
	 * @private
	 * @default DesignObjekt
	 * @description Eltern-Objekt
	 */
	this.parent = null;
	
	/**
	 * @private
	 * @default Array
	 * @description Array mit den Kinder-Objekten
	 */
	this.children = new Array ( );
	
	/**
	 * @private
	 * @default Array
	 * @description Zuweisung von Paths->Funktionen. Die Funktionen werden f&uuml;r jedes Objekt in registeredObjects
	 *              aufgerufen.
	 */
	this.registeredFunctions = new Array ( );
	
	/**
	 * @private
	 * @default Array
	 * @description Zuweisung Funktions->Objects. Die Objekte werden bei einem Update an die Funktion &uuml;bergeben.
	 */
	this.registeredObjects = new Array ( );
	
	/**
	 * @private
	 * @default SocketConnectionHandlerObjekt
	 * @description Objekt des {@link SocketConnectionHandlerObject}s.
	 */
	this.connectionHandler = getProject ( ).getConnectionHandler ( );
	
	/**
	 * @private
	 * @default Array
	 * @description Store f&uur;r die gesendeten TransactionIDs.
	 */
	this.sentTransactions = new Array ( );
	
	// ################################################################
	// ----------Funktionen: general-----------------------------------
	// ################################################################
	
	/**
	 * @function
	 * @public
	 * @description Init()-Funktion zum Initialisieren von Werten und Einstellungen
	 */
	this.init = function ( ) {
		// empty function, interface for extended childs
	};
	
	/**
	 * @function
	 * @public
	 * @description Anzeigen des mit dem DesignObjekt verkn&uuml;pften jQuery-Element
	 */
	this.show = function ( ) {
		$ ( this.thisObj ).show ( );
	};
	
	/**
	 * @function
	 * @public
	 * @description Ausblenden des mit dem DesignObjekt verkn&uuml;pften jQuery-Element
	 */
	this.hide = function ( ) {
		$ ( this.thisObj ).hide ( );
	};
	
	// ################################################################
	// ----------Funktionen: Socket, Updates, Children-----------------
	// ################################################################
	
	/**
	 * @function
	 * @private
	 * @param {String} path WebTouchDataPath, der Registriert werden soll
	 * @param {Object} obj Das Object, das f&uuml;r den path registriert werden soll
	 * @param {Function} func Die Function, die auf das Object angewendet werden soll.
	 * @returns {Boolean} Gibt zur&uuml;ck, ob der Vorgang erfolgreich war
	 * @description Registriert einen Pfad, f&uuml;r den dieses DesignObjekt Updates bekommen soll, bei dem
	 *              {@link SocketConnectionHandlerObject}. Hierbei werden allerdings neben dem zu registrierenden Path
	 *              auch noch das Object, das das Update erhalten soll, und eine Funktion, der das Object und der Path
	 *              &uuml;bergeben werden und die daraufhin "irgendwelche Magic" mit dem Object macht, &uuml;bergeben.
	 */
	this.registerToSocket = function ( path , obj , func ) {
		if ( ( typeof path == "undefined" ) || ( typeof obj == "undefined" ) || ( typeof func == "undefined" ) )
			throw new ErrorObject ( "DesignObject", "registerToSocket", "IllegalArguments" );
		
		// Die Function func für den WebTouchDataPath path eintragen
		if ( this.registeredFunctions [ path ] == undefined )
			this.registeredFunctions [ path ] = new Array ( );
		
		//überprüfen, ob in dem Array die Function schon enthalten ist
		if ( this.registeredFunctions [ path ].indexOf ( func ) == - 1 )
			this.registeredFunctions [ path ].push ( func );
		
		// Das jQueryObject obj für die Function func eintragen
		if ( this.registeredObjects [ path ] == undefined )
			this.registeredObjects [ path ] = new Array ( );
		
		//Überprüfen, ob in dem Array das Object schon enthalten ist. Wenn ja, mit Fehlermeldung abbrechen.
		if ( this.registeredObjects [ path ].indexOf ( obj ) == - 1 )
			this.registeredObjects [ path ].push ( obj );
		
		try {
			this.connectionHandler.register ( path , this );
		} catch ( e ) {
			logError ( "Error during registring path to socket in DesignObject.registerToSocket: " + e.toString ( ) );
		}
	};
	
	/**
	 * @function
	 * @private
	 * @param {String} path WebTouchDataPath, der Unregistriert werden soll
	 * @param {Object} obj Das Object, das f&uuml;r den path registriert werden sollte
	 * @returns {Boolean} Gibt zur&uuml;ck, ob der Vorgang erfolgreich war
	 * @description Unregistriert einen Pfad bei dem {@link SocketConnectionHandlerObject}.
	 */
	this.unregisterFromSocket = function ( path , obj ) {
		delete this.registeredObjects [ path ] [ this.registeredObjects [ path ].indexOf ( obj ) ];
		
		try {
			this.connectionHandler.unregister ( path , this );
		} catch ( e ) {
			logError ( "Error during unregistring path to socket in DesignObject.registerToSocket: " + e.toString ( ) );
		}
	};
	
	/**
	 * @function
	 * @public
	 * @param {PathObject} pathObj {@link PathObject}, das von dem {@link SocketConnectionHandlerObject} bei einem
	 *        Update verteilt wird.
	 * @description Ruft this.updateChildren und this.doUpdate auf. doUpdate wird dann von den Erbenden Elementen
	 *              entsprechend ver&auml;ndert.
	 */
	this.update = function ( pathObj ) {
		if ( pathObj.isTransaction ( ) ) {
			var index = "trans" + pathObj.getTransID ( ) + "";
			this.sentTransactions [ index ] ( pathObj );
			delete ( this.sentTransactions [ index ] );
		} else {
			this.updateChildren ( pathObj );
			this.doUpdate ( pathObj );
		}
	};
	
	/**
	 * @function
	 * @private
	 * @param {PathObject} pathObj {@link PathObject}, das von dem {@link SocketConnectionHandlerObject} bei einem
	 *        Update verteilt wird.
	 * @description Dummy-Methiode; Wird von jedem erbenden Child selber definiert, da Aufgaben bei Parent noch nicht
	 *              klar sind.
	 */
	this.doUpdate = function ( pathObj ) {
		// Dummy-Methode
	};
	
	/**
	 * @function
	 * @private
	 * @param {PathObject} pathObj Das {@link PathObject}, das &uuml;bergeben werden soll.
	 * @description F&uuml;hrt die Funktionen aus, die f&uuml;r die Objects des paths eingetragen wurden. Das Object
	 *              wird dabei als Parameter &uuml;bergeben.
	 */
	this.updateChildren = function ( pathObj ) {
		var path = pathObj.getShortPath ( );
		
		for ( var indexFunc in this.registeredFunctions [ path ] ) {
			for ( var indexObj in this.registeredObjects [ path ] ) {
				var func = this.registeredFunctions [ path ] [ indexFunc ];
				var obj = this.registeredObjects [ path ] [ indexObj ];
				func ( obj , pathObj );
			}
		}
	};
	
	/**
	 * @function
	 * @private
	 * @param {Function} func Eine Funktion, die f&uurml;r alle gefundenen Objects ausgef&uuml;hrt werden soll.
	 * @param {jQueryObject} Otionaler Parameter f&uuml;r einen alternativen Container.
	 * @description Registriert die HTML-Elemente, die in diesem Element enthalten sind, bei der SocketConnection.
	 *              Registriert dabei alle Tags einzeln mit der gleichen Function.
	 */
	this.registerChildsToSocket = function ( func , container ) {
		var container = container || this.thisObj;
		
		if ( typeof func != "function" )
			/**
			 * @ignore
			 */
			func = function ( obj ) {
			};
		
		this.registerEachToSocket ( this.selectChildren ( container , "span" , func ) , function ( obj , pathObj ) {
			$ ( obj ).html ( pathObj.getSingleValue ( ) );
		} );
		this.registerEachToSocket ( this.selectChildren ( container , "img" , func ) , function ( obj , pathObj ) {
			$ ( obj ).attr ( "src" , pathObj.getSingleValue ( ) );
		} );
	};
	
	/**
	 * @function
	 * @private
	 * @param {jQueryObject} container Der beinhaltende Container.
	 * @param {String} elementTag Der HTML-Tag, nachdem gefiltert werden soll.
	 * @param {Function} func Eine Funktion, die f&uuml;r jedes gefunde jQueryObject ausgef&uuml;hrt werden soll.
	 * @returns {Array} die gefundenen jQueryObjects.
	 * @description Gibt alle KinderObjekte mit dem &uuml;bergebenen HTML-Tag zur&uuml;ck.
	 */
	this.selectChildren = function ( container , elementTag , func ) {
		return container.children ( ).filter ( ":not(.managedContainer)" ).find ( elementTag + '[' + this.spanAttr + ']' ).filter ( ":not(.registered)" ).each ( function ( ) {
			// Führt die übergebene Funktion aus, falls vorhanden
			if ( func != null && typeof func == "function" ) {
				func ( this );
			}
			
		} ).toArray ( );
	};
	
	/**
	 * @function
	 * @private
	 * @param {Array} arr Ein Array mit jQueryObjects, die registriert werden sollen
	 * @param {Function} func Die Funktion, die f&uuml;r die Objects aufgerufen werden soll.
	 * @description Registriert die Objects in arr mit der Function func f&uuml;r updates.
	 */
	this.registerEachToSocket = function ( arr , func ) {
		for ( el in arr )
			this.registerToSocket ( $ ( arr [ el ] ).addClass ( "registered" ).attr ( this.spanAttr ) , arr [ el ] , func , true );
	};
	
	/**
	 * @function
	 * @private
	 * @param {jQueryObject} container Der Container, der die ChildElemente enth&auml;lt.
	 * @description Unregistriert alle Children, die in dem Container drin sind, vom
	 *              {@link SocketConnectionHandlerObject}.
	 */
	this.unregisterChildsFromSocket = function ( container ) {
		this.unregisterEachFromSocket ( container.children ( ).filter ( ":not(.managedContainer)" ).filter ( ".registered" ).toArray ( ) , null );
		
	};
	
	/**
	 * @function
	 * @private
	 * @param {Array} arr Ein Array mit zu unregistrierenden Objects.
	 * @param {String path Der Path, auf den das Object registriert wurde.
	 * @description Unregistriert jedes Object im Array arr von der SocketConnection.
	 */
	this.unregisterEachFromSocket = function ( arr , path ) {
		for ( var obj in arr )
			this.unregisterFromSocket ( ( ( ( typeof path == "string" ) && ( path != null ) ) ? path : $ ( arr [ obj ] ).attr ( this.spanAttr ) ) , arr [ obj ] );
	};
	
	/**
	 * @function
	 * @private
	 * @description Unregistriert alle registrierten Children vom {@link SocketConnectionHandlerObject}.
	 */
	this.unregisterAllChildsFromSocket = function ( ) {
		for ( var path in this.registeredObjects )
			this.unregisterEachFromSocket ( this.registeredObjects [ path ] , path );
	};
	
	/**
	 * @function
	 * @private
	 * @param {Object} settings Die Paramter f&uuml;r die Nachricht.
	 * @param {Function} func Die Callback-Function, die bei eingehender Nachricht aufgerufen werden soll.
	 * @description Sendet eine Transaction-Nachricht &uuml;ber die WebSocket-Connection.
	 */
	this.sendTransaction = function ( settings , func ) {
		this.sentTransactions [ "trans" + this.connectionHandler.sendTransaction ( settings , this ) + "" ] = func;
	};
	
	// ################################################################
	// ----------Funktionen: UserInput---------------------------------
	// ################################################################
	
	/**
	 * @function
	 * @public
	 * @description Dummy-Funktion; Wird von jedem erbenden Child selber definiert, da Aufgaben bei Parent-Definition
	 *              noch nicht klar sind. Wird bei einem onClick event aufgerufen.
	 */
	this.click = function ( ) {
		// Dummy-Function
	};
	
	/**
	 * @function
	 * @public
	 * @param {Function} func Die Funktion, die bei onClick aufgerufen werden soll.
	 * @description F&uuml;gt dem repr&auml;sentierenden HTML-Element ein OnClick-Event mit der &uuml;bergebenden
	 *              Funktion hinzu.
	 */
	this.addClickEvent = function ( func ) {
		$ ( this.thisObj ).on ( "click" , func );
	};
	
	// ################################################################
	// ----------Funktionen: Design------------------------------------
	// ################################################################
	
	/**
	 * @function
	 * @public
	 * @param {Object} obj Das jQuery-Objekt, das von diesem DesignObjekt repr&auml;sentiert werden soll.
	 * @description Setzt die Variable this.thisObj auf das &uuml;bergebene jQuery-Objekt.
	 */
	this.allocateContainer = function ( obj ) {
		this.thisObj = obj;
		$ ( this.thisObj ).addClass ( "managedContainer" );
	};
	
	/**
	 * @function
	 * @private
	 * @description Zeichnet das Element. Dummy-Methode f&uuml:r Vererbung. Child-Objekte definieren Methode.
	 */
	this.draw = function ( ) {
		
	};
	
	// ################################################################
	// ----------Funktionen: ObjectManagement--------------------------
	// ################################################################
	
	/**
	 * @function
	 * @public
	 * @description Entfernt sich selbst. Ruft die onRemove-Methode der Kinder auf (rekursives l&ouml;schen).
	 */
	this.remove = function ( ) {
		for ( a in this.children )
			this.children [ a ].remove ( );
		this.onRemove ( );
		this.unregisterAllChildsFromSocket ( );
	};
	
	/**
	 * @function
	 * @private
	 * @description Die Aktionen, die ausgef&uuml;hrt werden sollen, wenn dieses Objekt gel&ouml;scht wird.
	 */
	this.onRemove = function ( ) {
		// Dummy-Funktion, sollte im Optimalfall von erbender Child-Klasse überschrieben werden.
		
		$ ( this.thisObj ).empty ( );
	};
	
	/**
	 * @function
	 * @private
	 * @param {String} [className] Wenn dem Element eine oder mehrere Klassen gesetzt werden sollen, k&ouml;nnen diese
	 *        hier &uuml;bergeben werden.
	 * @returns {Object} das erzeugte Element.
	 * @description Erzeugt ein neues Child-Element. Setzt optionalerweise eine Klasse f&uuml;r das Element.
	 */
	this.createChild = function ( className ) {
		var ret = $ ( "<div>" );
		if ( className != null )
			$ ( ret ).addClass ( className );
		
		return ret;
	};
	
	/**
	 * @function
	 * @public
	 * @param {Object} obj Das DesignObjekt, dem das erstellte Element zugewiesen werden soll.
	 * @description F&uuml;gt ein Child an erste Stelle ein und weist das Element dem &uuml;bergebenen Objekt zu.
	 */
	this.prependChild = function ( obj ) {
		var newElement = $ ( "<div>" );
		$ ( this.thisObj ).prepend ( newElement );
		obj.allocateContainer ( newElement );
		
		this.children.unshift ( obj );
	};
	
	/**
	 * @function
	 * @public
	 * @param {Object} obj Das DesignObjekt, dem das erstellte Element zugewiesen werden soll.
	 * @param {Integer} index Der Index, an dem das Element eingef&uuml;gt werden soll.
	 * @description F&uuml;gt ein Child an erste Stelle ein und weist das Element dem &uuml;bergebenen Objekt zu.
	 */
	this.insertChild = function ( obj , index ) {
		var newElement = $ ( "<div>" );
		$ ( this.thisObj ).eq ( index ).before ( newElement );
		obj.allocateContainer ( newElement );
		
		this.children = this.children.slice ( 0 , index ).concat ( this.children.slice ( index ).unshift ( obj ) );
	};
	
	/**
	 * @function
	 * @public
	 * @param {Object} obj Das DesignObjekt, dem das erstellte Element zugewiesen werden soll.
	 * @description F&uuml;gt ein Child an letzter Stelle ein und weist das Element dem &uuml;bergebenen Objekt zu.
	 */
	this.appendChild = function ( obj ) {
		var newElement = $ ( "<div>" );
		$ ( this.thisObj ).append ( newElement );
		obj.allocateContainer ( newElement );
		
		this.children.push ( obj );
	};
	
	/**
	 * @function
	 * @public
	 * @param {jQueryObject} container Der zu sortierende Container.
	 * @param {String} attribute Zu sortierendes Attribut. Wenn Leer, wird .text() sortiert.
	 * @description Sortiert die Child-Elemente alphabetisch aufsteigend. Wenn kein Container &uumlM;bergeben wird,
	 *              werden die Elemente in thisObj sortiert.
	 */
	this.sortChildren = function ( container , attribute ) {
		if ( typeof container == "undefined" )
			container = this.thisObj;
		
		var childrenElements = container.children ( ).get ( );
		childrenElements.sort ( function ( a , b ) {
			var elementA , elementB;
			
			if ( typeof attribute == undefined ) {
				elementA = $ ( a ).text ( ).toUpperCase ( );
				elementB = $ ( b ).text ( ).toUpperCase ( );
			} else {
				elementA = $ ( a ).attr ( attribute ).toUpperCase ( );
				elementB = $ ( b ).attr ( attribute ).toUpperCase ( );
			}
			
			return ( elementA < elementB ) ? - 1 : ( elementA > elementB ) ? 1 : 0;
		} ).each ( function ( index , element ) {
			container.append ( element );
		} );
	};
	
	/**
	 * @function
	 * @public
	 * @description Entfernt alle Children incl. aufrufen derer onRemove()-Methode.
	 */
	this.removeAllChildren = function ( ) {
		for ( a in this.children ) {
			this.children [ a ].onRemove ( );
		}
		
		$ ( this.thisObj ).empty ( );
	};
	
	/**
	 * @function
	 * @public
	 * @param {Integer} index Der Index, an dem das Element eingef&uuml;gt werden soll.
	 * @description Entfernt ein Child am &uuml;bergebenen Index.
	 */
	this.removeChild = function ( index ) {
		this.children [ index ].onRemove ( );
		this.children.splice ( index , 1 );
		$ ( this.thisObj ).append ( obj );
	};
};
