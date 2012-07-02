/**
 * @constructor
 * @public
 * @class Stellt die WebSocket-Verbindung sowie Methoden zum Umgang damit bereit.
 * @description Die Klasse SocketConnectionHandlerObject stellt Methoden bereit, um Daten via WebSocketConnection zu
 *              senden, empfangen, verarbeiten und kontrolliert zu verteilen. Objekte k&ouml;nnen sich bei dem
 *              SocketConnectionHandlerObject registrieren, um Updates zu WebTouchDataPaths zu bekommen.
 */
var SocketConnectionHandlerObject = function ( ) {
	/**
	 * @private
	 * @default String
	 * @description Speichert die URL, zu der die Verbindung aufgebaut wird.
	 */
	this.url = null;
	
	/**
	 * @private
	 * @default WebSocket
	 * @description Die Verbindung.
	 */
	this.sockconn = null;
	
	/**
	 * @private
	 * @default Array
	 * @description Zuweisung von Paths zu Objects, die f&uuml;r Updates benachrichtigt werden soll.
	 */
	this.registeredObjects = new Array ( );
	
	/**
	 * @private
	 * @default Array
	 * @description Buffer f&uuml;r ungesendete Nachrichten.
	 */
	this.unsentMessages = new Array ( );
	
	/**
	 * @private
	 * @default Array
	 * @description Buffer f&uuml;r eingehende Nachrichten.
	 */
	this.recievedMessageBuffer = new Array ( );
	
	/**
	 * @private
	 * @default Integer
	 * @description Gibt an, wie viele Nachrichten vom Stack verarbeitet werden sollen.
	 */
	this.workFromStackRecievedMessages = 10;
	
	/**
	 * @private
	 * @default CacheObject
	 * @description Instanz von {@link CacheObjekte} zum Cachen der Daten.
	 */
	this.cache = new CacheObject ( );
	
	/**
	 * @private
	 * @default Array
	 * @description Store f&uuml;r die Transaktions-IDs und die dazugeh&ouml;rigen Objects, die bei eingehender Antwort
	 *              benachrichtigt werden sollen.
	 */
	this.transactions = new Array ( );
	
	/**
	 * @private
	 * @default Integer
	 * @description Die aktuelle Transaktions-ID. wird von getNetTransID hochgez&auml;hlt.
	 */
	this.transactionID = 0;
	
	/**
	 * @private
	 * @default Integer
	 * @description Z&auml;hler f&uuml;r Abfragen.
	 */
	this.counter = 0;
	
	/**
	 * @private
	 * @default Array
	 * @description Store für verschiedene Flags, mit denen eine Nachricht gesendet werden kann. Wenn eine Nachricht mit
	 *              einem Flag gesendet werden soll und das flag nicht auf true steht, wird die Nahricht nicht gesendet
	 *              und mit einer definierten Handlung abgebrochen.
	 */
	this.flags = new Array ( );
	
	/**
	 * @private
	 * @default Array
	 * @description Der FlagBuffer speichert die Nachrichten mit einem Flag, die nicht gesendet werden konnten. Wenn
	 *              sich der Zustand des Flags verändert, werden die im Buffer befindlichen Nachrichten automatisch
	 *              gesendet.
	 */
	this.flagBuffer = new Array ( );
	
	/**
	 * @private
	 * @default Array
	 * @description Im FlagListener Array sind EventLister hinterlegt f&uuml;r das Event, dass ein Flag auf active =
	 *              true gesetzt wird. Die EventListener werden der reihe nach aufgerufen und je nach Paramter der
	 *              Settings gelöscht oder wiederholt ausgeführt.
	 */
	this.flagListener = new Array ( );
	
	/**
	 * @private
	 * @default Null
	 * @description Der Speicher f&uuml;r das Interval um die Nachrichten vom Stapel zu verarbeiten.
	 */
	this.interval = null;
	
	// ################################################################
	// ----------Funktionen: various-----------------------------------
	// ################################################################
	/**
	 * @function
	 * @returns {Integer} Globaler Counter f&uuml;r z.B. jQuery.ajax()
	 */
	this.getCounter = function ( ) {
		return ++ this.counter;
	};
	
	// ################################################################
	// ----------Funktionen: OpenClose---------------------------------
	// ################################################################
	
	/**
	 * @function
	 * @public
	 * @param {String} url Die URL incl. Port, zu der der WebSocket aufgebaut werden soll.
	 * @description Stellt eine WebSocket-Verbindung zu der &uuml;bergebenden url her. deklariert bei Verbindungsaufbau
	 *              auch die ben&ouml;tigten funktionen wie onMessage.
	 */
	this.connect = function ( url ) {
		this.url = url;
		this.sockconn = null;
		
		this.sockconn = new WebSocket ( this.url );
		
		if ( ( typeof this.sockconn == "undefined" ) || ( this.sockconn == null ) )
			throw new ErrorObject ( "SocketConnectionHandler", "connect", "Socket Connection did'nt establish" );
		
		this.sockconn.connectionHandler = this;
		
		this.sockconn.onopen = function ( evt ) {
			logToConsole ( this.getTimeStamp ( ) + ' CONNECTED: ' + this.connectionHandler.url );
			
			this.connectionHandler.sendBuffer ( );
		};
		
		this.sockconn.onclose = function ( evt ) {
			logToConsole ( this.getTimeStamp ( ) + ' DISCONNECTED: ' + this.connectionHandler.url );
		};
		
		this.sockconn.onmessage = function ( evt ) {
			logToConsole ( '<span style="color: blue;">' + this.getTimeStamp ( ) + ' GOT: ' + evt.data + '</span>' );
			
			this.connectionHandler.handleMessage ( evt.data );
		};
		
		this.sockconn.onerror = function ( evt ) {
			logToConsole ( '<span style="color: red;">' + this.getTimeStamp ( ) + ' ERROR:</span> ' + evt.data );
		};
		
		this.sockconn.getTimeStamp = function ( ) {
			var d = new Date ( );
			return "<span style=\"color: green;\">" + d.getHours ( ) + ":" + d.getMinutes ( ) + ":" + ( ( d.getSeconds ( ) < 10 ) ? "0" + d.getSeconds ( ).toString ( ) : d.getSeconds ( ).toString ( ) ) + ":" + d.getMilliseconds ( ) + "</span>";
		};
		
		this.sockconn.getReadyState = function ( ) {
			return this.readyState;
		};
		
		if ( this.interval != null )
			window.clearTimeout ( this.interval );
		
		var thatConnectionHandler = this;
		this.interval = window.setInterval ( function ( ) {
			thatConnectionHandler.handleMessageFromBuffer ( );
		} , 50 );
	};
	
	/**
	 * @function
	 * @public
	 * @description Schlie&szlig;t die WebSocket-Verbindung.
	 */
	this.close = function ( ) {
		logToConsole ( "DISCONNECTING" );
		this.sockconn.close ( );
		
		if ( this.sockconn.getReadyState ( ) != 3 )
			throw new ErrorObject ( "SocketConnectionHandlerObject", "close", "Closing the WebSocket-Connection unsuccessful." );
		
		if ( this.interval != null ) {
			window.clearTimeout ( this.interval );
			this.interval = null;
		}
		
	};
	
	// ################################################################
	// ----------Funktionen: Senden------------------------------------
	// ################################################################
	
	/**
	 * @function
	 * @private
	 * @param {Object} settings Ein Object mit der Zuweisung name -> Value.
	 * @description Sendet eine Nachricht &uuml;ber die WebSocket-Verbindung. Wenn Keine Verbindung besteht, wird die
	 *              Nachricht in den Buffer geschrieben und gesendet, wenn eine Verbindung hergestellt wird.
	 */
	this.send = function ( settings ) {
		if ( this.sockconn == undefined || this.sockconn == null )
			this.connect ( this.url );
		
		if ( ( typeof settings.flags != "undefined" ) && ( settings.flags != null ) && ( settings.flags.length > 0 ) ) {
			for ( var flag in settings.flags ) {
				flag = settings.flags [ flag ];
				
				if ( typeof this.flags [ flag ] == "undefined" || typeof this.flags [ flag ] != "object" )
					throw new ErrorObject ( "SocketConnectionHandlerObject", "send", "Flag " + flag + " is not in the Flags-Array." );
				
				if ( ! this.flags [ flag ].active ) {
					this.flagBuffer [ flag ].push ( settings );
					return;
				}
			}
		}
		
		if ( typeof settings.nocache != "undefined" || ( typeof settings.nocache != "undefined" && settings.nocache == false ) ) {
			var pathObj = new PathObject ( settings.message );
			var method = pathObj.getCommand ( );
			
			if ( method == "get" || method == "reg" || method == "regget" ) {
				if ( this.cache.isCachedValue ( pathObj ) ) {
					
					return;
				} else if ( this.cache.isCachedValueRequested ( pathObj ) )
					return;
				else
					this.cache.setCachedValueIsRequested ( pathObj );
			}
		}
		
		var state = this.sockconn.getReadyState ( );
		if ( ! this.sockconn || state != 1 ) {
			this.unsentMessages.push ( settings );
			
			if ( state == 3 )
				this.connect ( this.url );
			return;
		}
		
		this.sockconn.send ( settings.message );
		logToConsole ( this.sockconn.getTimeStamp ( ) + "SENT: " + settings.message );
	};
	
	/**
	 * @function
	 * @private
	 * @param {String} message Die zu sendende Nachricht.
	 * @description Sendet eine Nachricht direkt &uuml;ber die WebSocket-Verbindung via send(settings).
	 */
	this.sendDirect = function ( message ) {
		this.send (
			{
				"message": message
			} );
	};
	
	/**
	 * @function
	 * @private
	 * @description Sendet im Buffer befindliche Nachrichten mit der send()-Methode. Wird aufgerufen, wenn eine
	 *              WebSocket-Verbindung hergestellt wird.
	 */
	this.sendBuffer = function ( ) {
		while ( this.unsentMessages.length > 0 ) {
			if ( this.sockconn.getReadyState ( ) == 1 )
				this.send ( this.unsentMessages.shift ( ) );
			else
				return;
		}
	};
	
	/**
	 * @public
	 * @function
	 * @param {Object} settings Das Object mit den Setings und der Nachricht.
	 * @param {Object} obj Das Object, das bei einer Antwort auf die Transaction benachrichtig werden soll.
	 * @returns Die versendete Transaction ID.
	 * @description Sendet Nachrichten unter Benutzung des "tid"- &uuml;ber die send()-Methode.
	 */
	this.sendTransaction = function ( settings , obj ) {
		var tid = this.getNewTransID ( );
		this.transactions [ "trans" + tid + "" ] = obj;
		settings.message = "tid " + tid + " " + settings.message;
		this.send ( settings );
		return tid;
	};
	
	/**
	 * @public
	 * @function
	 * @returns Die neue Transaction ID.
	 * @description Gibt eine neue Transaction ID zur&uuml;ck.
	 */
	this.getNewTransID = function ( ) {
		return this.transactionID ++ ;
	};
	
	// ################################################################
	// ----------Funktionen: Messages verarbeiten----------------------
	// ################################################################
	
	/**
	 * @function
	 * @private
	 * @param {String} msg Die empfangene Nachricht.
	 * @description Verarbeitet &uuml;ber die WebSocket-Verbindung kommende Nachrichten. Diese werden an das lokale
	 *              Array der zu verarbeitenden Messages angeh&auml;ngt.
	 */
	this.handleMessage = function ( msg ) {
		this.recievedMessageBuffer.push ( new PathObject ( msg ) );
	};
	
	/**
	 * @function
	 * @private
	 * @description Verarbeitet eine bestimmte Anzahl an Nachrichten vom Buffer.
	 */
	this.handleMessageFromBuffer = function ( ) {
		
		for ( var counter = 0 ; counter < this.workFromStackRecievedMessages ; counter ++ ) {
			if ( this.recievedMessageBuffer.length == 0 )
				return;
			
			var obj = this.recievedMessageBuffer.shift ( );
			
			if ( obj.isTransaction ( ) ) {
				var index = "trans" + obj.getTransID ( ) + "";
				this.transactions [ index ].update ( obj );
				delete ( this.transactions [ index ] );
			} else {
				this.cache.addCachedValue ( obj );
				this.dispatch ( obj );
			}
		}
		
	};
	
	// ################################################################
	// ----------Funktionen: (un) register-----------------------------
	// ################################################################
	
	/**
	 * @function
	 * @public
	 * @param {PathObj|String} pathObj Der Path, f&uuml;r das sich ein Objekt registriert.
	 * @param {WebtouchDesignObject} obj Das Objekt, das sich f&uuml;r einen WebTouchDataPath registrieren m&ouml;chte.
	 * @description F&uuml;gt einen Listener(DesignObjekt), das sich f&uuml;r WebTouchDataPaths registrieren
	 *              m&ouml;chte, zur Liste registrierter Objekte hinzu. Diese Objekte werden benachrichtigt, wenn ein
	 *              Update f&uuml;r den Wert, f&uuml;r den sie sich registriert haben, &uuml;ber die
	 *              WebSocket-Verbindung emfangen wird.
	 */
	this.register = function ( pathObj , obj ) {
		
		var path = ( pathObj instanceof PathObject ) ? pathObj.getShortPath ( ) : pathObj;
		
		if ( typeof this.registeredObjects [ path ] != "object" )
			this.registeredObjects [ path ] = new Array ( );
		if ( this.registeredObjects [ path ].indexOf ( obj ) != - 1 ) {
			
			obj.update ( this.cache.getCachedValue ( path ) );
			
		} else {
			if ( typeof obj.socketConnectionAnswerCounter == "undefined" )
				obj.socketConnectionAnswerCounter = new Array ( );
			obj.socketConnectionAnswerCounter [ path ] = 0;
			
			this.registeredObjects [ path ].push ( obj );
			
			if ( this.registeredObjects [ path ].length == 1 && ! this.cache.isCachedValue ( path ) )
				
				this.send (
					{
					message: "regget " + ( ( pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj ) ,
					flags: new Array ( "authRequired" ) ,
					nocache: false
					} );
			else
				this.dispatchFromCache ( path );
		}
	};
	
	/**
	 * @function
	 * @public
	 * @param {PathObject|String} pathObj Der Path, f&uuml;r das sich ein Objekt registriert.
	 * @param {WebtouchDesignObject} obj Der Listener, der entfernt werden soll.
	 * @description Entfernt ein Listener (WebtouchDesignObject) aus der Liste registrierter Objekte.
	 */
	this.unregister = function ( pathObj , obj ) {
		
		var path = ( pathObj instanceof PathObject ) ? pathObj.getShortPath ( ) : pathObj;
		
		if ( typeof obj == "undefined" )
			throw new ErrorObject ( "SocketConnectionHandlerObject", "unregister", "Invalid parameter." );
		if ( typeof this.registeredObjects [ path ] == "undefined" )
			throw new ErrorObject ( "SocketConnectionHandlerObject", "unregister", "Path not found." );
		
		var index = this.registeredObjects [ path ].indexOf ( obj );
		if ( index == - 1 )
			throw new ErrorObject ( "SocketConnectionHandlerObject", "unregister", "Object registering for path " + path + "  not in Array." );
		
		this.registeredObjects [ path ].splice ( index , 1 );
		
		delete obj.socketConnectionAnswerCounter [ path ];
		
		if ( this.registeredObjects [ path ].length == 0 ) {
			delete this.registeredObjects [ path ];
			
			this.send (
				{
				message: "unreg " + ( ( pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj ) ,
				flags: new Array ( "authRequired" ) ,
				nocache: true
				} );
			
			this.cache.removeCachedValue ( path );
		}
	};
	
	// ################################################################
	// ----------Funktionen: Updates Verteilen-------------------------
	// ################################################################
	
	/**
	 * @function
	 * @private
	 * @param {PathObject|String} pathObj Das {@link PathObject}, das verteilt werden soll.
	 * @description Holt die zu dem Pfad geh&ouml;renden Werte vom Cache und verteilt diese.
	 */
	this.dispatchFromCache = function ( pathObj ) {
		var cachedValue = this.cache.getCachedValue ( pathObj );
		
		if ( cachedValue instanceof PathObject )
			this.dispatch ( cachedValue );
		else
			for ( var index in cachedValue )
				this.dispatch ( cachedValue [ index ] );
	};
	
	/**
	 * @function
	 * @private
	 * @param {PathObject} pathObj Das {@link PathObject}, das verteilt werden soll.
	 * @description Verteilt einkommende Messages an die Listener, die sich daf&uuml;r registriert haben.
	 */
	this.dispatch = function ( pathObj ) {
		var path = pathObj.getShortPath ( );
		
		for ( index in this.registeredObjects [ path ] ) {
			if ( ( this.registeredObjects [ path ] [ index ].socketConnectionAnswerCounter [ path ] < this.cache.getCachedValueSize ( pathObj ) ) || pathObj.getCommand ( ) != "def" ) {
				this.registeredObjects [ path ] [ index ].socketConnectionAnswerCounter [ path ] ++ ;
				this.registeredObjects [ path ] [ index ].update ( pathObj );
			}
		}
		
	};
	
	// ################################################################
	// ----------Funktionen: Flag Handling-----------------------------
	// ################################################################
	
	/**
	 * @public
	 * @function
	 * @param {Object} settings Ein Object mit der Zuweisung setting -> Value.
	 * @description F&uuml;gt ein Flag hinzu. Das Flag wird in flags gespeichert und im flagBuffer wird ein Array für
	 *              das Flag angelegt.
	 */
	this.addFlag = function ( settings ) {
		if ( typeof settings.name == "undefined" || settings.name == "" || settings.name == " " )
			throw new ErrorObject ( "SocketConnectionHandlerObject", "addFlag", "The Name of the Flag must be set!" );
		
		settings.active = settings.active || false;
		
		var name = settings.name;
		delete settings.name;
		
		this.flags [ name ] = settings;
		this.flagBuffer [ name ] = new Array ( );
		this.flagListener [ name ] = new Array ( );
	};
	
	/**
	 * @public
	 * @function
	 * @param {Object} settings
	 * @description F&uuml;gt einen FlagListener hinzu.
	 */
	/*
	 * settings = {
	 * 	flagName: new Array("authRequired"), //required
	 * 	onActive: function () {}, //required
	 * 	once: true //optional
	 * 	}
	 */
	this.addFlagListener = function ( settings ) {
		if ( typeof this.flags [ settings.flagName ] == "undefined" || settings.flagname == "" || settings.flagName == " " )
			throw new ErrorObject ( "SocketConnectionHandlerObject", "addFlagListener", "Error: No FlagName set in settings Object or Flag not available." );
		else if ( typeof settings.onActive != "function" )
			throw new ErrorObject ( "SocketConnectionHandlerObject", "addFlagListener", "Error: no EventHandler set of typeof parameter not a function." );
		
		if ( typeof settings.once == "undefined" )
			settings.once = true;
		
		if ( this.flags [ settings.flagName ].active ) {
			settings.onActive ( );
			
			if ( settings.once )
				return;
		}
		
		if ( typeof this.flagListener [ settings.flagName ] != "object" )
			this.flagListener [ settings.flagName ] = new Array ( );
		
		this.flagListener [ settings.flagName ].push ( settings );
		
	};
	
	/**
	 * @public
	 * @function
	 * @param {String} name Der Name des Flags.
	 * @description Löscht ein Flag.
	 */
	this.removeFlag = function ( name ) {
		delete this.flags [ name ];
		delete this.flagBuffer [ name ];
	};
	
	/**
	 * @public
	 * @function
	 * @param {String} name Der Name des Flags.
	 * @param {Boolean} status Der zu setzende Status.
	 * @description Setzt den Status eines Flags auf den übergebenen Status.
	 */
	this.setFlag = function ( name , status ) {
		this.flags [ name ].active = status;
		
		if ( status ) {
			// Send messages in Flagbuffer
			while ( this.flagBuffer [ name ].length > 0 )
				this.send ( this.flagBuffer [ name ].shift ( ) );
			
			// Call CallbackFunctions in FlagListener Array
			var settings , endArr = new Array ( );
			while ( this.flagListener [ name ].length > 0 ) {
				settings = this.flagListener [ name ].shift ( );
				
				settings.onActive ( );
				
				if ( ! settings.once )
					endArr.push ( settings );
				
			}
			this.flagListener [ name ] = endArr;
		}
		
	};
	
};
