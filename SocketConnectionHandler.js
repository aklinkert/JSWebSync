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
	var sockconn = null;
	
	/**
     * Stores all callbacks.
	 * @private
	 * @default Array
	 */
	var registeredCallbacks = new Array ( );
	
	/**
     * Buffer for unset messages.
	 * @private
	 * @default Array
	 */
	 var unsentMessages = new Array ( );
	
	/**
     * Buffer for incoming messages.
	 * @private
	 * @default Array
	 */
    var receivedMessageBuffer = new Array ( );
	
	/**
     * How many messages shall be procedured.
	 * @private
	 * @default Integer
	 */
    var workFromStackReceivedMessages = 10;
	
	/**
     * Instance of {@link Cache} to cache messages.
	 * @private
	 * @default Cache
	 */
    var cache = new Cache ( );
	
	/**
     * Stores transaction callbacks.
	 * @private
	 * @default Array
	 */
    var transactions = new Array ( );
	
	/**
     * The actual transaction ID.
	 * @private
	 * @default Integer
	 */
    var transactionID = 0;
	
	/**
     * Message counter.
	 * @private
	 * @default Integer
	 */
    var counter = 0;
	
	/**
     * Store flag.
	 * @private
	 * @default Array
	 */
    var flags = new Array ( );
	
	/**
     * The flag buffer stores messages that are unsent cause of inactive flag state.
	 * @private
	 * @default Array
	 */
    var flagBuffer = new Array ( );
	
	/**
     * Stores the flag listener that wait for flag state change.
	 * @private
	 * @default Array
	 */
    var flagListener = new Array ( );
	
	/**
     * Stores the interval to complete the messages.
	 * @private
	 * @default Null
	 */
    var interval = null;
	
	/**
     * Logger instance store.
	 * @private
	 * @default Logger
	 */
    var logger = ( logger instanceof Logger ) ? logger : new Logger ( );
	
	/**
     * returns the new message counter.
	 * @function
	 * @returns {Integer} Global counter f.e. jQuery.ajax()
	 */
	this.getCounter = function ( ) {
		return ++ counter;
	};
	
	/**
     * Establishes a WebSocket connection to the given url.
	 * @function
	 * @public
	 * @param {String} urlparam The url the WebSocket should be established to.
	 */
	this.connect = function ( urlparam ) {
		url = urlparam || url;
		sockconn = null;
		
		sockconn = new WebSocket ( url );
		
		if ( ( typeof sockconn == "undefined" ) || ( sockconn == null ) )
			throw new DetailedError ( "SocketConnectionHandler", "connect", "Socket Connection didn't establish" );
		
		sockconn.connectionHandler = this;
		
		sockconn.onopen = function ( evt ) {
			logger.log ( "io" , " CONNECTED: " + this.connectionHandler.url );
			
			this.connectionHandler.sendBuffer ( );
		};
		
		sockconn.onclose = function ( evt ) {
			logger.log ( "io" , " DISCONNECTED: " + this.connectionHandler.url );
		};
		
		sockconn.onmessage = function ( evt ) {
			logger.log ( "io" , "GOT: " + evt.data );
			
			this.connectionHandler.handleMessage ( evt.data );
		};
		
		sockconn.onerror = function ( evt ) {
			logger.log ( "io" , "ERROR:" + evt.data );
		};
		
		sockconn.getReadyState = function ( ) {
			return this.readyState;
		};
		
		if ( interval != null )
			window.clearTimeout ( interval );
		
		var thatConnectionHandler = this;
		interval = window.setInterval ( function ( ) {
			thatConnectionHandler.handleMessageFromBuffer ( );
		} , 50 );
	};
	
	/**
	 * @function
	 * @public
	 * @description Closes the WebSocket connection.
	 */
	this.close = function ( ) {
		sockconn.close ( );
		
		if ( sockconn.getReadyState ( ) != 3 )
			throw new DetailedError ( "SocketConnectionHandlerObject", "close", "Closing the WebSocket-Connection unsuccessful." );
		
		if ( interval != null ) {
			window.clearTimeout ( interval );
			interval = null;
		}
	};

	/**
     * Sends a message.
	 * @function
	 * @private
	 * @param {Message} message A Message.
	 */
	this.send = function ( message ) {
		if ( typeof(sockconn) == "undefined" || sockconn == null ) {
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
					flagBuffer [ flag ].push ( message );
					return;
				}
			}
		}

		if ( !message.getNocache() &&  message.getAction() == "get" && message.getId() != null) {
            if ( cache.isCachedValue ( message ) || cache.isCachedValueRequested ( message ) ) {
                return;
            }

            cache.setCachedValueIsRequested ( message );
        }
		
		var state = sockconn.getReadyState ( );
		if ( ! sockconn || state != 1 ) {
			unsentMessages.push ( message );
			
			if ( state == 3 ) {
				this.connect ( url );
            }
			return;
		}
		
		sockconn.send ( message.buildJSON() );
		logger.log ( "io" , "SENT: " + message.buildJSON() );
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
		while ( unsentMessages.length > 0 ) {
			if ( sockconn.getReadyState ( ) == 1 )
				this.send ( unsentMessages.shift ( ) );
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
	 * @returns The transactionID of the message.
	 */
	this.sendTransaction = function ( settings , obj ) {
		var tid = this.getNewTransID ( );
		transactions [ "trans" + tid + "" ] = obj;
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
		return transactionID ++ ;
	};

	/**
     * Handles the recieved Message.
	 * @function
	 * @private
	 * @param {String} msg The recieved Message.
	 */
	this.handleMessage = function ( msg ) {
		receivedMessageBuffer.push ( msg );
	};
	
	/**
     * Handles a defined amount of messages from buffer.
	 * @function
	 * @private
	 */
	this.handleMessageFromBuffer = function ( ) {
		
		for ( var counter = 0 ; counter < workFromStackReceivedMessages ; counter ++ ) {
			if ( receivedMessageBuffer.length == 0 ) {
				return;
            }
			
			var obj = receivedMessageBuffer.shift ( );
			
			if ( obj.isTransaction ( ) ) {
				var index = "trans" + obj.getTransID ( ) + "";
				transactions [ index ].update ( obj );
				delete ( transactions [ index ] );
			} else {
				cache.addCachedValue ( obj );
				this.dispatch ( obj );
			}
		}
		
	};

	/**
	 * @function
	 * @public
	 * @param {PathObj|String} pathObj
	 * @param {WebtouchDesignObject}
	 */
	this.register = function ( pathObj , obj ) {
		
		var path = ( pathObj instanceof PathObject ) ? pathObj.getShortPath ( ) : pathObj;
		
		if ( typeof registeredCallbacks [ path ] != "object" )
			registeredCallbacks [ path ] = new Array ( );
		if ( registeredCallbacks [ path ].indexOf ( obj ) != - 1 ) {
			
			obj.update ( cache.getCachedValue ( path ) );
			
		} else {
			if ( typeof obj.socketConnectionAnswerCounter == "undefined" )
				obj.socketConnectionAnswerCounter = new Array ( );
			obj.socketConnectionAnswerCounter [ path ] = 0;
			
			registeredCallbacks [ path ].push ( obj );
			
			if ( registeredCallbacks [ path ].length == 1 && ! cache.isCachedValue ( path ) )
				this.send ({
					message: "regget " + ( ( pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj ) ,
					flags: new Array ( "authRequired" ) ,
					nocache: false
				});
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
			throw new DetailedError ( "SocketConnectionHandlerObject", "unregister", "Invalid parameter." );
		if ( typeof registeredCallbacks [ path ] == "undefined" )
			throw new DetailedError ( "SocketConnectionHandlerObject", "unregister", "Path not found." );
		
		var index = registeredCallbacks [ path ].indexOf ( obj );
		if ( index == - 1 )
			throw new DetailedError ( "SocketConnectionHandlerObject", "unregister", "Object registering for path " + path + "  not in Array." );
		
		registeredCallbacks [ path ].splice ( index , 1 );
		
		delete obj.socketConnectionAnswerCounter [ path ];
		
		if ( registeredCallbacks [ path ].length == 0 ) {
			delete registeredCallbacks [ path ];
			
			this.send (
				{
				message: "unreg " + ( ( pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj ) ,
				flags: new Array ( "authRequired" ) ,
				nocache: true
				} );
			
			cache.removeCachedValue ( path );
		}
	};

	/**
	 * @function
	 * @private
	 * @param {PathObject|String} pathObj Das {@link PathObject}, das verteilt werden soll.
	 * @description Holt die zu dem Pfad geh&ouml;renden Werte vom Cache und verteilt diese.
	 */
	this.dispatchFromCache = function ( pathObj ) {
		var cachedValue = cache.getCachedValue ( pathObj );
		
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
		
		for ( index in registeredCallbacks [ path ] ) {
			if ( ( registeredCallbacks [ path ] [ index ].socketConnectionAnswerCounter [ path ] < cache.getCachedValueSize ( pathObj ) ) || pathObj.getCommand ( ) != "def" ) {
				registeredCallbacks [ path ] [ index ].socketConnectionAnswerCounter [ path ] ++ ;
				registeredCallbacks [ path ] [ index ].update ( pathObj );
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
		
		flags [ name ] = settings;
		flagBuffer [ name ] = new Array ( );
		flagListener [ name ] = new Array ( );
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
		if ( typeof flags [ settings.flagName ] == "undefined" || settings.flagname == "" || settings.flagName == " " )
			throw new DetailedError ( "SocketConnectionHandlerObject", "addFlagListener", "Error: No FlagName set in settings Object or Flag not available." );
		else if ( typeof settings.onActive != "function" )
			throw new DetailedError ( "SocketConnectionHandlerObject", "addFlagListener", "Error: no EventHandler set of typeof parameter not a function." );
		
		if ( typeof settings.once == "undefined" )
			settings.once = true;
		
		if ( flags [ settings.flagName ].active ) {
			settings.onActive ( );
			
			if ( settings.once )
				return;
		}
		
		if ( typeof flagListener [ settings.flagName ] != "object" )
			flagListener [ settings.flagName ] = new Array ( );
		
		flagListener [ settings.flagName ].push ( settings );
		
	};
	
	/**
     * Removes a flag by name.
	 * @public
	 * @function
	 * @param {String} name The flag name.
	 */
	this.removeFlag = function ( name ) {
		delete flags [ name ];
		delete flagBuffer [ name ];
	};
	
	/**
     * Sets a flag by name to the given status.
	 * @public
	 * @function
	 * @param {String} name The flag name.
	 * @param {Boolean} status The status to set.
	 */
	this.setFlag = function ( name , status ) {
		flags [ name ].active = status;
		
		if ( status ) {
			// Send messages in Flagbuffer
			while ( flagBuffer [ name ].length > 0 )
				this.send ( flagBuffer [ name ].shift ( ) );
			
			// Call CallbackFunctions in FlagListener Array
			var settings , endArr = new Array ( );
			while ( flagListener [ name ].length > 0 ) {
				settings = flagListener [ name ].shift ( );
				
				settings.onActive ( );
				
				if ( ! settings.once )
					endArr.push ( settings );
				
			}
			flagListener [ name ] = endArr;
		}
		
	};
	
};
