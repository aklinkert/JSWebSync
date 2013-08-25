/**
 * A class to provide message halding, caching and a registration system for updates.
 * @constructor
 * @public
 * @param {Logger} The Logger instance to use or null if none shall be used.
 * @class Provides methods to register, unregister, cache and handle messages.
 */
var SocketConnectionHandler = function ( logger ) {
	/**
     * Stores the url to connect to.
	 * @private
	 * @default String
	 */
	var url = null;
	
	/**
     * The connection instance.
	 * @private
	 * @default WebSocket
	 */
	var sockConn = null;
	
	/**
     * Stores all callbacks.
	 * @private
	 * @default Array
	 */
	var aRegisteredCallbacks = new Array ( );

    /**
     * Stores the index name of list listener.
     * @private
     * @type {string}
     * @default string
     */
    var sListRegisteredIndex = "listListener";

	/**
     * Buffer for unset messages.
	 * @private
	 * @default Array
	 */
	 var aUnsentMessages = new Array ( );
	
	/**
     * Buffer for incoming messages.
	 * @private
	 * @default Array
	 */
    var aReceivedMessageBuffer = new Array ( );
	
	/**
     * How many messages shall be procedured.
	 * @private
	 * @default Integer
	 */
    var iWorkFromStackReceivedMessages = 10;
	
	/**
     * Instance of {@link Cache} to cache messages.
	 * @private
	 * @default Cache
	 */
    var oCache = new Cache ( );
	
	/**
     * Stores transaction callbacks.
	 * @private
	 * @default Array
	 */
    var aTransactions = new Array ( );
	
	/**
     * The actual transaction ID.
	 * @private
	 * @default Integer
	 */
    var iTransactionID = 0;
	
	/**
     * Message counter.
	 * @private
	 * @default Integer
	 */
    var iCounter = 0;
	
	/**
     * Flag store.
	 * @private
	 * @default Array
	 */
    var aFlags = new Array ( );
	
	/**
     * The flag buffer stores messages that are unsent cause of inactive flag state.
	 * @private
	 * @default Array
	 */
    var aFlagBuffer = new Array ( );
	
	/**
     * Stores the flag listener that wait for flag state change.
	 * @private
	 * @default Array
	 */
    var aFlagListener = new Array ( );
	
	/**
     * Stores the interval to complete the messages.
	 * @private
	 * @default Null
	 */
    var iInterval = null;
	
	/**
     * Logger instance store.
	 * @private
	 * @default Logger
	 */
    var oLogger = ( logger instanceof Logger ) ? logger : new Logger ( );
	
	/**
     * returns the new message counter.
	 * @function
	 * @returns {Integer} Global counter f.e. jQuery.ajax()
	 */
	this.getCounter = function ( ) {
		return ++ iCounter;
	};
	
	/**
     * Establishes a WebSocket connection to the given url.
	 * @function
	 * @public
	 * @param {String} urlparam The url the WebSocket should be established to.
	 */
	this.connect = function ( urlparam ) {
		url = urlparam || url;
		sockConn = null;
		
		sockConn = new WebSocket ( url );
		
		if ( ( typeof sockConn == "undefined" ) || ( sockConn == null ) )
			throw new DetailedError ( "SocketConnectionHandler", "connect", "Socket Connection didn't establish" );
		
		sockConn.connectionHandler = this;
		
		sockConn.onopen = function ( evt ) {
			oLogger.log ( "io" , " CONNECTED: " + this.connectionHandler.url );
			
			this.connectionHandler.sendBuffer ( );
		};
		
		sockConn.onclose = function ( evt ) {
			oLogger.log ( "io" , " DISCONNECTED: " + this.connectionHandler.url );
		};
		
		sockConn.onmessage = function ( evt ) {
			oLogger.log ( "io" , "GOT: " + evt.data );
			
			this.connectionHandler.handleMessage ( evt.data );
		};
		
		sockConn.onerror = function ( evt ) {
			oLogger.log ( "io" , "ERROR:" + evt.data );
		};
		
		sockConn.getReadyState = function ( ) {
			return this.readyState;
		};
		
		if ( iInterval != null )
			window.clearTimeout ( iInterval );
		
		var thatConnectionHandler = this;
		iInterval = window.setInterval ( function ( ) {
			thatConnectionHandler.handleMessageFromBuffer ( );
		} , 50 );
	};
	
	/**
	 * @function
	 * @public
	 * @description Closes the WebSocket connection.
	 */
	this.close = function ( ) {
		sockConn.close ( );
		
		if ( sockConn.getReadyState ( ) != 3 )
			throw new DetailedError ( "SocketConnectionHandlerObject", "close", "Closing the WebSocket-Connection unsuccessful." );
		
		if ( iInterval != null ) {
			window.clearTimeout ( iInterval );
			iInterval = null;
		}
	};

	/**
     * Sends a message.
	 * @function
	 * @private
	 * @param {Message} message A Message.
	 */
	this.send = function ( message ) {
		if ( typeof(sockConn) == "undefined" || sockConn == null ) {
			this.connect ( url );
        }

        var flags = message.getFlags();
		if ( ( typeof flags != "undefined" ) && ( flags != null ) && ( flags.length > 0 ) ) {
			for ( var key in flags ) {
				var flag = flags [ key ];
				
				if ( typeof flags [ flag ] == "undefined" || typeof flags [ flag ] != "object" ) {
					throw new DetailedError ( "SocketConnectionHandlerObject", "send", "Flag " + flag + " is not in the Flags-Array." );
                }
				if ( ! flags [ flag ].active ) {
					aFlagBuffer [ flag ].push ( message );
					return;
				}
			}
		}

		if ( !message.getNocache() &&  message.getAction() == "get" && message.getId() != null) {
            if ( oCache.contains ( message ) || oCache.isValueRequested ( message ) ) {
                return;
            }

            oCache.setValueIsRequested ( message );
        }
		
		var state = sockConn.getReadyState ( );
		if ( ! sockConn || state != 1 ) {
			aUnsentMessages.push ( message );
			
			if ( state == 3 ) {
				this.connect ( url );
            }
			return;
		}
		
		sockConn.send ( message.buildJSON() );
		oLogger.log ( "io" , "SENT: " + message.buildJSON() );
	};
	
	/**
     * Sends a direct message.
	 * @function
	 * @private
	 * @param {String} message The message that should be send.
     * @deprecated
	 */
	this.sendDirect = function ( message ) {
		throw new DetailedError("SocketConnectionHandler", "sendDirect", "Method is deprecated.");
	};
	
	/**
     * Sends the content of the buffer.
	 * @function
	 * @private
	 */
	this.sendBuffer = function ( ) {
		while ( aUnsentMessages.length > 0 ) {
			if ( sockConn.getReadyState ( ) == 1 )
				this.send ( aUnsentMessages.shift ( ) );
			else
				return;
		}
	};
	
	/**
     * Sends a message via transaction to the server.
	 * @public
	 * @function
	 * @param {Object} settings The settings Object containing the message too.
	 * @param {Object} obj The callback to call to call back for callback.
	 * @returns The iTransactionID of the message.
	 */
	this.sendTransaction = function ( settings , obj ) {
		var tid = this.getNewTransID ( );
		aTransactions [ "trans" + tid + "" ] = obj;
		settings.message = "tid " + tid + " " + settings.message;
		this.send ( settings );
		return tid;
	};
	
	/**
     * Returns a new transaction ID.
	 * @public
	 * @function
	 * @returns The new transaction ID.
	 */
	this.getNewTransID = function ( ) {
		return iTransactionID ++ ;
	};

	/**
     * Handles the recieved Message.
	 * @function
	 * @private
	 * @param {String} msg The recieved Message.
	 */
	this.handleMessage = function ( msg ) {
		aReceivedMessageBuffer.push ( msg );
	};
	
	/**
     * Handles a defined amount of messages from buffer.
	 * @function
	 * @private
	 */
	this.handleMessageFromBuffer = function ( ) {
		
		for ( var counter = 0 ; counter < iWorkFromStackReceivedMessages ; counter ++ ) {
			if ( aReceivedMessageBuffer.length == 0 ) {
				return;
            }
			
			var obj = aReceivedMessageBuffer.shift ( );
			
			if ( obj.isTransaction ( ) ) {
				var index = "trans" + obj.getTransID ( ) + "";
				aTransactions [ index ].update ( obj );
				delete ( aTransactions [ index ] );
			} else {
				oCache.add ( obj );
				this.dispatch ( obj );
			}
		}
		
	};

	/**
     * Registers a CallbackHandler for message results.
	 * @function
	 * @public
	 * @param {Message} oMsg The Message to register for.
     * @param {CallbackHandler} oCbHandler The {@link CallbackHandler} to handle the result.
	 */
	this.register = function ( oMsg, oCbHandler ) {

        var sType = oMsg.getType();
        var sId = oMsg.getId();

        if (null == sId) {
            sId = sListRegisteredIndex;
        }

        if (typeof(aRegisteredCallbacks[sType]) != "object") {
            aRegisteredCallbacks[sType] = new Array();
        }
        if (typeof(aRegisteredCallbacks[sType][sId]) != "object") {
            aRegisteredCallbacks[sType][sId] = new Array();
        }
        aRegisteredCallbacks[sType][sId].push(oCbHandler);

        if (!oMsg.getNocache()) {
            if (oCache.contains(oMsg)) {
                oCbHandler.callback(sType, oCache.get(oMsg));
                return;
            } else if (oCache.isValueRequested(oMsg)) {
                return;
            }

            oCache.setValueIsRequested(oMsg);
        }

        this.send(oMsg);

        /*
		if ( typeof aRegisteredCallbacks [ path ] != "object" )
			aRegisteredCallbacks [ path ] = new Array ( );
		if ( aRegisteredCallbacks [ path ].indexOf ( obj ) != - 1 ) {
			
			obj.update ( oCache.get ( path ) );
			
		} else {
			if ( typeof obj.socketConnectionAnswerCounter == "undefined" )
				obj.socketConnectionAnswerCounter = new Array ( );
			obj.socketConnectionAnswerCounter [ path ] = 0;
			
			aRegisteredCallbacks [ path ].push ( obj );
			
			if ( aRegisteredCallbacks [ path ].length == 1 && ! oCache.contains ( path ) )
				this.send ({
					message: "regget " + ( ( pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj ) ,
					flags: new Array ( "authRequired" ) ,
					nocache: false
				});
			else
				this.dispatchFromCache ( path );
		}
		*/
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
			throw new DetailedError ( "SocketConnectionHandlerObject", "unregister", "Invalid parameter." );
		if ( typeof aRegisteredCallbacks [ path ] == "undefined" )
			throw new DetailedError ( "SocketConnectionHandlerObject", "unregister", "Path not found." );
		
		var index = aRegisteredCallbacks [ path ].indexOf ( obj );
		if ( index == - 1 )
			throw new DetailedError ( "SocketConnectionHandlerObject", "unregister", "Object registering for path " + path + "  not in Array." );
		
		aRegisteredCallbacks [ path ].splice ( index , 1 );
		
		delete obj.socketConnectionAnswerCounter [ path ];
		
		if ( aRegisteredCallbacks [ path ].length == 0 ) {
			delete aRegisteredCallbacks [ path ];
			
			this.send (
				{
				message: "unreg " + ( ( pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj ) ,
				flags: new Array ( "authRequired" ) ,
				nocache: true
				} );
			
			oCache.remove ( path );
		}
	};

	/**
	 * @function
	 * @private
	 * @param {PathObject|String} pathObj Das {@link PathObject}, das verteilt werden soll.
	 * @description Holt die zu dem Pfad geh&ouml;renden Werte vom Cache und verteilt diese.
	 */
	this.dispatchFromCache = function ( pathObj ) {
		var cachedValue = oCache.get ( pathObj );
		
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
		
		for ( index in aRegisteredCallbacks [ path ] ) {
			if ( ( aRegisteredCallbacks [ path ] [ index ].socketConnectionAnswerCounter [ path ] < oCache.getCachedValueSize ( pathObj ) ) || pathObj.getCommand ( ) != "def" ) {
				aRegisteredCallbacks [ path ] [ index ].socketConnectionAnswerCounter [ path ] ++ ;
				aRegisteredCallbacks [ path ] [ index ].update ( pathObj );
			}
		}
		
	};

	/**
     * Adds a new flag.
	 * @public
	 * @function
	 * @param {Object} settings The setings object.
	 */
	this.addFlag = function ( settings ) {
		if ( typeof settings.name == "undefined" || settings.name == "" || settings.name == " " )
			throw new DetailedError ( "SocketConnectionHandlerObject", "addFlag", "The Name of the Flag must be set!" );
		
		settings.active = settings.active || false;
		
		var name = settings.name;
		delete settings.name;
		
		aFlags [ name ] = settings;
		aFlagBuffer [ name ] = new Array ( );
		aFlagListener [ name ] = new Array ( );
	};

    /*
     * settings = {
     * 	flagName: new Array("authRequired"), //required
     * 	onActive: function () {}, //required
     * 	once: true //optional
     * 	}
     */
	/**
     * Adds a flag listener.
	 * @public
	 * @function
	 * @param {Object} settings
	 */
	this.addFlagListener = function ( settings ) {
		if ( typeof aFlags [ settings.flagName ] == "undefined" || settings.flagname == "" || settings.flagName == " " )
			throw new DetailedError ( "SocketConnectionHandlerObject", "addFlagListener", "Error: No FlagName set in settings Object or Flag not available." );
		else if ( typeof settings.onActive != "function" )
			throw new DetailedError ( "SocketConnectionHandlerObject", "addFlagListener", "Error: no EventHandler set of typeof parameter not a function." );
		
		if ( typeof settings.once == "undefined" )
			settings.once = true;
		
		if ( aFlags [ settings.flagName ].active ) {
			settings.onActive ( );
			
			if ( settings.once )
				return;
		}
		
		if ( typeof aFlagListener [ settings.flagName ] != "object" )
			aFlagListener [ settings.flagName ] = new Array ( );
		
		aFlagListener [ settings.flagName ].push ( settings );
		
	};
	
	/**
     * Removes a flag by name.
	 * @public
	 * @function
	 * @param {String} name The flag name.
	 */
	this.removeFlag = function ( name ) {
		delete aFlags [ name ];
		delete aFlagBuffer [ name ];
	};
	
	/**
     * Sets a flag by name to the given status.
	 * @public
	 * @function
	 * @param {String} name The flag name.
	 * @param {Boolean} status The status to set.
	 */
	this.setFlag = function ( name , status ) {
		aFlags [ name ].active = status;
		
		if ( status ) {
			// Send messages in Flagbuffer
			while ( aFlagBuffer [ name ].length > 0 )
				this.send ( aFlagBuffer [ name ].shift ( ) );
			
			// Call CallbackFunctions in FlagListener Array
			var settings , endArr = new Array ( );
			while ( aFlagListener [ name ].length > 0 ) {
				settings = aFlagListener [ name ].shift ( );
				
				settings.onActive ( );
				
				if ( ! settings.once )
					endArr.push ( settings );
				
			}
			aFlagListener [ name ] = endArr;
		}
		
	};
	
};
