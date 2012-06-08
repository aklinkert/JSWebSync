/**
 * @constructor
 * @public
 * @class Repr&auml;sentiert einen path.
 * @description Verarbeitet &uuml;bergebene paths und stellt Methoden bereit, um Teile dessen abzufragen.
 */
var PathObject = function ( messageOrParts ) {
	/**
	 * @private
	 * @default String
	 * @description Die vollst&auml;ndige eingegangene Nachricht (unver&auml;ndert, ungeteilt).
	 */
	this.message = ( typeof messageOrParts == "string" ) ? messageOrParts : null;
	
	/**
	 * @private
	 * @default String
	 * @description Der vollst&auml;ndige Path.
	 */
	this.path = "";
	
	/**
	 * @private
	 * @default Object
	 * @default Das interne Informations-Object, in das Informationen eingelesen werden und aus dem die Informationen in
	 *          den Getter-Methoden ausgelesen werden.
	 */
	this.informations = new Object ( );
	
	/**
	 * @private
	 * @default String
	 * @description Wenn ein Value mitgesendet wurde, wird dieser hier gespeichert.
	 */
	this.value = null;
	
	/**
	 * @private
	 * @default String
	 * @description Wenn die eingehende Nachricht ein fail ist, wird der FailCode hier geespeichert und kann per
	 *              Getter-Methode abgefragt werden.
	 */
	this.fail = false;
	
	/**
	 * @private
	 * @default Boolean
	 * @description Ist die eingehende Nachricht eine Transaktion? Wenn ja, ist dieser Wert true.
	 */
	this.transaction = false;
	
	/**
	 * @private
	 * @default int
	 * @description Wenn die eingehende Nachricht eine Transaktion ist, steht in diesem Wert die Transaction ID.
	 */
	this.transactionID = 0;
	
	/**
	 * @private
	 * @constant
	 * @description RegularExpression zum matchen einer eingehenden Nachricht, wenn diese eine Transaktion ist.
	 */
	this.exprTransactionMessage = /^tid (\d+) ([a-z]+) (.*)/i;
	
	/**
	 * @private
	 * @constant
	 * @description RegularExpression zum matchen einer eingehenden Nachricht, wenn diese keine Transaktion ist.
	 */
	this.exprRegularMessage = /^([a-z]+) (.*)/i;
	
	/**
	 * @private
	 * @constant
	 * @description RegularExpression zum matchen des Paths der eingehenden mesaage.
	 */
	this.exprPath = /(.+@\d+)\/([\w\/]+)(?:\?((?:(?:\w+='.+')|(?:\w+[<>]{1}\w+))(?:&\w+[=<>]'.+')*))?(?:#(\d+\-\d+))?(?: ((?:'.+'(?:,'.+')*)))?/i;
	
	/**
	 * @private
	 * @constant
	 * @description RegularExpression zum matchen der Identifier des Paths.
	 */
	this.exprIdent = /(.+)@(\d+)/i;
	
	/**
	 * @private
	 * @constant
	 * @description RegularExpression zum matchen von Maskierten Werten.
	 */
	this.exprMask = /'(.+)'/i;
	
	/**
	 * @private
	 * @constant
	 * @description RegularExpression zum matchen von Parametern des Paths.
	 */
	this.exprParam = /(\w+)([<>=])(.+)/i;
	
	/**
	 * @private
	 * @constant
	 * @description RegularExpression zum pr&uuml;fen von Hash-Identifiern.
	 */
	this.exprHash = /(-?\d(?:.\d)?)/i;
	
	/**
	 * @function
	 * @private
	 * @param {Object} parts Die Informationen zu dem zu bauenden Path.
	 * @description Baut aus den &uuml;bergebenen Informationen einen Path zusammen.
	 */
	this.buildPath = function ( parts ) {
		if ( typeof parts [ "identifier" ] == "undefined" || parts [ "identifier" ].length == 0 )
			throw new ErrorObject ( "PathObject", "buildPath", "Beim bauen des Paths ist ein Fehler aufgetreten: Es wurden keine Identifier übergeben!" );
		
		if ( typeof parts [ "type" ] == "undefined" || parts [ "type" ] == "" )
			throw new ErrorObject ( "PathObject", "buildPath", "Beim bauen des Paths ist ein Fehler aufgetreten: Es wurde kein ObjectType übergeben!" );
		
		this.informations.command = parts [ "command" ];
		this.informations.identifier = parts [ "identifier" ];
		this.informations.type = parts [ "type" ];
		this.informations.columns = parts [ "columns" ];
		this.informations.fields = parts [ "fields" ];
		this.informations.order = parts [ "order" ];
		this.informations.range = parts [ "range" ];
		this.informations.values = parts [ "values" ];
		
		this.path = "";
		var temp = "";
		
		for ( var index in parts [ "identifier" ] ) {
			if ( temp != "" )
				temp += ",";
			if ( parseInt ( index ) < 0 )
				throw new ErrorObject ( "PathObject", "buildPath", "Beim bauen des Paths ist ein Fehler aufgetreten: Ungültiger Identifier: " + index + "@" + parts [ "identifier" ] [ index ] + "!" );
			
			var ident = parts [ "identifier" ] [ index ];
			var res = ident.match ( this.exprHash );
			if ( res == null )
				ident = this.mask ( ident );
			temp += ident + "@" + index;
		}
		this.path += temp;
		
		this.path += "/" + parts [ "type" ];
		for ( var index in parts [ "columns" ] ) {
			this.path += "/" + parts [ "columns" ] [ index ];
		}
		
		if ( ( "order" in parts && objectLength ( parts [ "order" ] ) > 0 ) || ( "fields" in parts && objectLength ( parts [ "fields" ] ) > 0 ) ) {
			this.path += "?";
			temp = "";
			
			for ( var index in parts [ "fields" ] ) {
				if ( temp != "" )
					temp += "&";
				
				var field = parts [ "fields" ] [ index ];
				temp += index + "=" + this.mask ( field );
			}
			
			for ( var index in parts [ "order" ] ) {
				if ( temp != "" )
					temp += "&";
				
				temp += "order" + ( ( parts [ "order" ] [ index ] == "desc" ) ? ">" : "<" ) + "'" + index + "'";
			}
			
			this.path += temp;
		}
		
		if ( typeof parts [ "range" ] == "object" )
			this.path += "#" + range.start + "-" + range.count;
		
		if ( typeof parts [ "values" ] == "object" && parts [ "values" ].size > 0 ) {
			this.path += " " + parts [ "values" ].shift ( );
			while ( parts [ "values" ].size > 0 )
				this.path += "," + parts [ "values" ].shift ( );
		}
		
	};
	
	/**
	 * @function
	 * @private
	 * @description Verarbeitet {@link message} anhand von Regul&auml;ren Ausdr&uuml;cken. Die resultierenden
	 *              Informationen werden in dem Object {@link informations} gespeichert. Bei Fehlern wird ein
	 *              {@link ErrorObject} geworfen.
	 */
	this.analyze = function ( ) {
		if ( this.message == "" )
			throw new ErrorObject ( "PathObject", "analyze", "Verarbeiten der eingehenden Nachricht fehlgeschlagen: Keine Nachricht übergeben." );
		
		var parts_message = this.message.match ( this.exprRegularMessage );
		
		if ( parts_message == null || parts_message.length <= 1 )
			throw new ErrorObject ( "PathObject", "analyze", "Verarbeiten der eingehenden Nachricht fehlgeschlagen: Aufbau ungültig." );
		
		if ( parts_message [ 1 ] == "tid" ) {
			var trans_parts = this.message.match ( this.exprTransactionMessage );
			
			if ( trans_parts == null )
				throw new ErrorObject ( "PathObject", "analyze", "Verarbeiten der eingehenden Nachricht fehlgeschlagen: Das Format entspricht nicht einer Transaction-Message." );
			
			this.transaction = true;
			this.transactionID = trans_parts [ 1 ];
			
			if ( trans_parts [ 2 ] == "auth" || trans_parts [ 2 ] == "unauth" ) {
				this.informations =
					{
					command: trans_parts [ 2 ] ,
					values:
						{
							value: trans_parts [ 3 ]
						}
					};
				return;
			}
			
			parts_message [ 1 ] = trans_parts [ 2 ];
			parts_message [ 2 ] = trans_parts [ 3 ];
		}
		
		if ( parts_message [ 1 ] == "fail" ) {
			this.fail = true;
			this.informations =
				{
					values:
						{
							value: parts_message [ 2 ]
						}
				};
			return;
		}
		
		this.analyzePath ( parts_message [ 2 ] );
		this.informations.command = parts_message [ 1 ];
	};
	
	/**
	 * @function
	 * @private
	 * @param {String} path Der Path der Nachricht.
	 * @description Verarbeitet den &uuml;bergebenen String.
	 */
	this.analyzePath = function ( path ) {
		
		var splitRes = this.splitSafe ( path , " " );
		if ( splitRes.length == 2 )
			this.path = splitRes [ 0 ];
		else
			this.path = path;
		
		path = path.match ( this.exprPath );
		if ( path == null )
			throw new ErrorObject ( "PathObject", "analyzePath", "Verarbeiten der eingehenden Nachricht fehlgeschlagen: Der Aufbau entspricht nicht den Vorgaben eines regulären Paths." );
		
		var identifier = new Array ( );
		var tmpres = this.splitSafe ( path [ 1 ] , "," );
		for ( var index in tmpres ) {
			var matchres = tmpres [ index ].match ( this.exprIdent );
			if ( matchres == null )
				throw new ErrorObject ( "PathObject", "analyzePath", "Verarbeiten der eingehenden Nachricht fehlgeschlagen: Ungültige identifier!" );
			
			identifier [ matchres [ 2 ] ] = this.unmask ( matchres [ 1 ] );
		}
		
		var type = path [ 2 ];
		var columns = new Array ( );
		if ( type.indexOf ( "/" ) != - 1 ) {
			var splitres = type.split ( "/" );
			type = splitres [ 0 ];
			
			if ( splitres [ 1 ].indexOf ( "," ) != - 1 ) {
				splitres = splitres [ 1 ].split ( "," );
				
				for ( var index in splitres )
					if ( splitres [ index ] != "" )
						columns.push ( splitres [ index ] );
			} else {
				columns.push ( splitres [ 1 ] );
			}
		}
		this.islistrequest = false;
		if ( type.indexOf ( "_" ) != - 1 ) {
			this.islistrequest = true;
			if ( columns.length > 1 )
				throw new ErrorObject ( "PathObject", "analyzePath", "Verarbeiten der eingehenden Nachricht fehlgeschlagen: Ungültige column!" );
		}
		
		var parameters = new Array ( );
		var order = new Array ( );
		var tmpres = this.splitSafe ( path [ 3 ] , "&" );
		if ( tmpres != null ) {
			for ( var index in tmpres ) {
				var matchres = tmpres [ index ].match ( this.exprParam );
				if ( matchres == null )
					throw new Error ( "Invalid parameter!" );
				
				if ( matchres [ 1 ] == "_order" )
					order [ this.unmask ( matchres [ 3 ] ) ] = ( matchres [ 2 ] == "<" ) ? "desc" : "asc";
				else
					parameters [ matchres [ 1 ] ] = this.unmask ( matchres [ 3 ] );
			}
		}
		
		var range = null;
		if ( typeof path [ 4 ] != "undefined" && path [ 4 ].indexOf ( "-" ) != - 1 ) {
			var t = path [ 4 ].split ( "-" );
			if ( t.length != 2 )
				throw new ErrorObject ( "PathObject", "analyzePath", "Verarbeiten der eingehenden Nachricht fehlgeschlagen: Ungültige range!" );
			
			range =
				{
				start: t [ 0 ] ,
				count: t [ 1 ]
				};
		}
		
		var values = new Array ( );
		if ( typeof path [ 5 ] != "undefined" ) {
			var tmpres = this.splitSafe ( path [ 5 ] , "," );
			
			if ( columns.length == 0 && tmpres.length == 1 && type.indexOf ( "_" ) != - 1 ) {
				values [ "value" ] = this.unmask ( tmpres [ 0 ] );
				
			} else if ( columns.length == 0 || tmpres.length > columns.length ) {
				throw new ErrorObject ( "PathObject", "analyzePath", "Verarbeiten der eingehenden Nachricht fehlgeschlagen: Die Anzahl der columns ist nicht gleich der Anzahl der values!" );
				
			} else {
				for ( var i = 0 ; i < tmpres.length ; i ++ )
					values [ columns [ i ] ] = this.unmask ( tmpres [ i ] );
				
			}
		}
		
		this.informations =
			{
			"identifiers": identifier ,
			"type": type ,
			"columns": columns ,
			"parameters": parameters ,
			"order": order ,
			"range": range ,
			"values": values
			};
	};
	
	/**
	 * @function
	 * @private
	 * @param {String} str Die zu verarbeitende Message.
	 * @param {String} seperator Der seperator, an dem getrennt werden soll.
	 * @returns Array
	 * @description Trennt str an seperator, wobei nur ausserhalb von Bereichen in Anf&uuml;hrungszeichen getrennt wird.
	 */
	this.splitSafe = function ( str , seperator ) {
		if ( typeof str == "undefined" )
			return null;
		
		var result = new Array ( );
		if ( typeof str == "undefined" || str.indexOf ( seperator ) == - 1 ) {
			result.push ( str );
			return result;
		}
		
		var arr = str.split ( "" );
		var opened = false;
		for ( var pos = 0 ; pos < arr.length ; pos ++ ) {
			if ( arr [ pos ] == "'" && ( pos == 0 || arr [ pos - 1 ] != "\\" ) )
				opened = ! opened;
			else if ( arr [ pos ] == seperator && opened == false ) {
				result.push ( arr.slice ( 0 , pos ).join ( "" ) );
				arr.splice ( 0 , pos + 1 );
				pos = - 1;
			}
		}
		
		if ( arr.length > 0 ) {
			result.push ( arr.slice ( 0 , arr.length ).join ( "" ) );
		}
		
		return result;
	};
	
	/**
	 * @function
	 * @private
	 * @param {String} strToMask Der zu maskierende String.
	 * @returns String
	 * @description Maskiert die in strToMask vorkommenden Anf&uuml;hrungszeichen.
	 */
	this.mask = function ( strToMask ) {
		var arr = strToMask.split ( '' );
		var strResult = "";
		
		for ( var pos = 0 ; pos < arr.length ; pos ++ ) {
			if ( arr [ pos ] == "'" )
				strResult += "\\";
			strResult += arr [ pos ];
		}
		
		return "'" + strResult + "'";
	};
	
	/**
	 * @private
	 * @function
	 * @param {Array} toMaskArr Ein Array mit zu maskierenden Strings.
	 * @returns Array
	 * @description Maskiert alle Eintr&auml;ge eines Arrays.
	 */
	this.maskEach = function ( toMaskArr ) {
		for ( var index in toMaskArr )
			toMaskArr [ index ] = this.unmask ( toMaskArr [ index ] );
		
		return toMaskArr;
	};
	
	/**
	 * @function
	 * @private
	 * @param {String} strToUnmask Der zu maskierende String.
	 * @returns String
	 * @description Entfernt die Maskierung der in strToUnmask vorkommenden Anf&uuml;hrungszeichen.
	 */
	this.unmask = function ( strToUnmask ) {
		if ( typeof strToUnmask == "undefined" || strToUnmask == "" )
			return '';
		
		var matchres = strToUnmask.match ( this.exprMask );
		if ( matchres != null )
			strToUnmask = matchres [ 1 ];
		
		var arr = strToUnmask.split ( '' );
		var strResult = "";
		
		for ( var pos = 0 ; pos < arr.length ; pos ++ ) {
			if ( arr [ pos ] == "'" )
				if ( arr [ pos - 1 ] == "\\" )
					strResult = strResult.substr ( 0 , strResult.length - 1 );
			strResult += arr [ pos ];
		}
		
		return strResult;
	};
	
	/**
	 * @private
	 * @function
	 * @param {Array} toUnMaskArr Ein Array mit zu unmaskierenden Strings.
	 * @returns Array
	 * @description Unmaskiert alle Eintr&auml;ge eines Arrays.
	 */
	this.unmaskEach = function ( toUnMaskArr ) {
		for ( var index in toUnMaskArr )
			toUnMaskArr [ index ] = this.unmask ( toUnMaskArr [ index ] );
		
		return toUnMaskArr;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} path
	 * @description Gibt den kompletten path zur&uuml;ck, der bei der Initialisierung &uuml;bergeben wurde.
	 */
	this.getPath = function ( ) {
		return this.path;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Der verwendete Command.
	 * @description Gibt den verwendete Command (set, def, fail, tid etc.) zur&uuml;ck.
	 */
	this.getCommand = function ( ) {
		return this.informations.command;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Die &uuml;bergebene Message.
	 * @description Gibt die &uuml;bergebene Message zur&uuml;ck.
	 */
	this.getMessage = function ( ) {
		return ( this.message == null ) ? this.informations.command + " " + this.path : this.message;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Die identifier aus dem path
	 * @description Gibt die identifier des paths zur&uuml;ck.
	 */
	this.getIdentifiers = function ( ) {
		return this.informations.identifiers;
	};
	
	/**
	 * @function
	 * @public
	 * @param {Integer} layer Der Layer, von dem der identifier gefordert wird.
	 * @returns {String|null} Der identifier auf dem Layer
	 * @description Gibt den identifier des paths auf dem &uuml;bergebenen Layer zur&uuml;ck. Wenn der Path auf dem
	 *              Layer keinen Identifier hat, wird null zur&uuml;ckgegeben.
	 */
	this.getIdentifierAtLayer = function ( layer ) {
		if ( typeof this.informations.identifiers [ layer ] != "undefined" ) {
			return this.informations.identifiers [ layer ];
		} else {
			return null;
		}
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Die Table aus dem path
	 * @description Gibt die Table des paths zur&uuml;ck.
	 */
	this.getType = function ( ) {
		return this.informations.type;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Die Columns des Paths
	 * @description Gibt alle Columns des Paths zur&uuml;ck.
	 */
	this.getColumns = function ( ) {
		return this.informations.columns;
	};
	
	/**
	 * @function
	 * @public
	 * @param {String} column Die column, zu der der value zur&uuml;ckgegeben werden soll.
	 * @returns {String} Der value der column
	 * @description Gibt den value der &uuml;bergebenen column zur&uuml;ck.
	 */
	this.getColumnValue = function ( column ) {
		return ( typeof this.informations.values [ column ] == "undefined" ) ? null : this.informations.values [ column ];
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Die Values des paths.
	 * @description Gibt die Values des paths zur&uuml;ck.
	 */
	this.getValues = function ( ) {
		return this.informations.values;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Der Value des paths.
	 * @description Gibt den Value des paths zur&uuml;ck, falls es ein Multirequest ist.
	 */
	this.getSingleValue = function ( ) {
		if ( ! isUndefined ( this.informations.values [ "value" ] ) )
			return this.informations.values [ "value" ];
	};
	
	/**
	 * @function
	 * @public
	 * @param {String} column Das field, zu dem der value gesetzt werden soll.
	 * @param {String} value Der Wert, der gesetzt werden soll
	 * @description F&uuml;gt einen Value hinzu.
	 */
	this.addValue = function ( column , value ) {
		this.informations.values [ column ] = value;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Die Fields aus dem path
	 * @description Gibt alle Fields des paths zur&uuml;ck.
	 */
	this.getParameters = function ( ) {
		return this.informations.parameters;
	};
	
	/**
	 * @function
	 * @public
	 * @param {String} parameter Der parameter, von dem der Wert zur&uuml;chgegeben werden soll.
	 * @returns {String|null} Der value des fields.
	 * @description Gibt en Value des parameters zur&uuml;ck. Wenn der parameter nicht existiert, wird null
	 *              zur&uuml;ckgegeben.
	 */
	this.getParameterValue = function ( parameter ) {
		return ( typeof this.informations.parameters [ fieldname ] == "undefined" ) ? null : this.informations.parameters [ fieldname ];
	};
	
	/**
	 * @function
	 * @public
	 * @returns {String} Die fields aus dem path
	 * @description Gibt die fields des paths zur&uuml;ck.
	 */
	this.getOrders = function ( ) {
		return this.informations.orders;
	};
	
	/**
	 * @function
	 * @public
	 * @param {String} fieldname Der fieldname, von dem der Wert zur&uuml;chgegeben werden soll.
	 * @returns {String|null} Der value des fields.
	 * @description Gibt en Value des fields zur&uuml;ck. Wenn das field nicht existiert, wird null zur&uuml;ckgegeben.
	 */
	this.getOrderDirection = function ( orderfield ) {
		return ( typeof this.informations.orders [ orderfield ] == "undefined" ) ? null : this.informations.orders [ orderfield ];
	};
	
	/**
	 * @function
	 * @public
	 * @returns {Boolean} True bei Fail.
	 * @description Gibt zur&uuml;ck, ob der Path ein Fail enth&auml;lt.
	 */
	this.isFail = function ( ) {
		return this.fail;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {Boolean} True bei Transaction.
	 * @description Gibt zur&uuml;ck, ob der Path eie Transaction ist.
	 */
	this.isTransaction = function ( ) {
		return this.transaction;
	};
	
	/**
	 * @function
	 * @public
	 * @returns {Integer} Die Transaction ID.
	 * @description Gibt die Transaction ID zur&uuml;ck, wenn die Nachricht eine Transaction ist.
	 */
	this.getTransID = function ( ) {
		return this.transactionID;
	};
	
	/**
	 * @ignore
	 */
	try {
		if ( this.message != null )
			this.analyze ( );
		else
			this.buildPath ( messageOrParts );
		
		return this;
	} catch ( e ) {
		logToConsole ( e.toString ( ) );
	}
};
