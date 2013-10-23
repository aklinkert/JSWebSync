if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([
    './DetailedError',
    './Cache',
    './Message',
    'socketio'
], function (DetailedError, Cache, Message, io) {

    /**
     * A class to provide message halding, caching and a registration system for updates.
     * @constructor
     * @public
     * @param {String} urls The url to connect to.
     * @param {Logger} logger The Logger instance to use or null if none shall be used.
     * @class SocketConnectionHandler Provides methods to register, unregister, cache and handle messages.
     */
    return function (url) {
        'use strict';

        /**
         * Stores a local reference to this object for use in callbacks and other anonymous functions.
         * @private
         * @type {SocketConnectionHandler}
         * @default SocketConnectionHandler
         */
        var oThat = this,

        /**
         * Stores the url to connect to.
         * @private
         * @default String
         */
            sUrl = url,

        /**
         * Socket.IO Connection instance.
         * @private
         * @default WebSocket
         */
            oSockConn = null,

        /**
         * Stores the state if socket.io is connected or not.
         * @private
         * @default Boolean
         */
            bSockConnConnected = false,

        /**
         * Stores all callbacks.
         * @private
         * @default Array
         */
            aRegisteredCallbacks = [],

        /**
         * Stores the index name of list listener.
         * @private
         * @type {string}
         * @default string
         */
            sListRegisteredIndex = "listListener",

        /**
         * Buffer for unset messages.
         * @private
         * @default Array
         */
            aUnsentMessages = [],

        /**
         * Buffer for incoming messages.
         * @private
         * @default Array
         */
            aReceivedMessageBuffer = [],

        /**
         * How many messages shall be procedured.
         * @private
         * @default Integer
         */
            iWorkFromStackReceivedMessages = 10,

        /**
         * Instance of {@link Cache} to cache messages.
         * @private
         * @default Cache
         */
            oCache = new Cache(),

        /**
         * Stores transaction callbacks.
         * @private
         * @default Array
         */
            aMessages = [],

        /**
         * The actual message ID.
         * @private
         * @default Integer
         */
            iMessageId = 0,

        /**
         * Flag store.
         * @private
         * @default Array
         */
            aFlags = [],

        /**
         * The flag buffer stores messages that are unsent cause of inactive flag state.
         * @private
         * @default Array
         */
            aFlagBuffer = [],

        /**
         * Stores the flag listener that wait for flag state change.
         * @private
         * @default Array
         */
            aFlagListener = [],

        /**
         * Stores the interval to complete the messages.
         * @private
         * @default Null
         */
            oInterval = null;

        /**
         * Establishes a WebSocket connection to the given url.
         * @function
         * @public
         * @param {String} urlparam The url the WebSocket should be established to.
         */
        this.connect = function (urlparam) {
            sUrl = urlparam || sUrl;


            /* use of oldschool direct WebSocket access.
             oSockConn = new WebSocket(sUrl);

             if (oSockConn == null) {
             throw new DetailedError("SocketConnectionHandler", "connect", "Socket Connection didn't establish");
             }

             oSockConn.connectionHandler = this;

             oSockConn.onopen = function () {
             console.log(" CONNECTED: " + sUrl);

             this.connectionHandler.sendBuffer();
             };

             oSockConn.onclose = function (event) {
             console.log(" DISCONNECTED: " + event);
             };

             oSockConn.onmessage = function (event) {
             console.log("GOT: " + event.data);

             this.connectionHandler.handleMessage(event.data);
             };

             oSockConn.onerror = function (event) {
             console.log("ERROR:" + event.data);
             };

             oSockConn.getReadyState = function () {
             return this.readyState;
             };

             */

            if (oSockConn == null) {
                oSockConn = io.connect(sUrl);
                oSockConn.on('connect', function () {
                    console.log(" CONNECTED: " + sUrl);

                    oSockConn.on('sm-data', function (data) {
                        console.log("GOT: " + data);

                        oThat.handleMessage(data);
                    });
                    oSockConn.on('disconnect', function () {
                        console.log(" DISCONNECTED: " + event);
                        bSockConnConnected = false;

                        if (oInterval != null) {
                            window.clearTimeout(oInterval);
                            oInterval = null;
                        }
                    });
                    oSockConn.on('error', function () {
                        console.log("ERROR:" + event.data);
                    });

                    bSockConnConnected = true;
                    oThat.sendBuffer();
                });
            } else {
                oSockConn.socket.connect();
            }

            if (oInterval != null) {
                window.clearTimeout(oInterval);
            }

            oInterval = window.setInterval(function () {
                oThat.handleMessageFromBuffer();
            }, 50);
        };

        /**
         * @function
         * @public
         * @description Closes the WebSocket connection.
         */
        this.close = function () {
            oSockConn.disconnect();

            if (oInterval != null) {
                window.clearTimeout(oInterval);
                oInterval = null;
            }
        };

        /**
         * Sends a message.
         * @function
         * @private
         * @param {Message} oMsg A Message.
         * @return int The messageId.
         */
        this.send = function (oMsg) {
            if (oSockConn == null) {
                this.connect(sUrl);
            }

            var iMsgId = this.getNewMessageID(),
                aFlags = oMsg.getFlags(),
                sKey = null,
                aFlag = null;
            oMsg.setMessageId(iMsgId);

            if (aFlags.length > 0) {
                for (sKey in aFlags) {
                    aFlag = aFlags[sKey];

                    if (typeof aFlags[aFlag] != "object") {
                        throw new DetailedError("SocketConnectionHandlerObject", "send", "Flag " + aFlag + " is not in the Flags-Array.");
                    }
                    if (!aFlags[aFlag].active) {
                        aFlagBuffer[aFlag].push(oMsg);
                        return iMsgId;
                    }
                }
            }

            if (!bSockConnConnected) {
                aUnsentMessages.push(oMsg);
                this.connect(sUrl);
                return iMsgId;
            }

            if (!oMsg.getNocache() && oMsg.getAction() == "get" && oMsg.getId() != null) {
                if (oCache.contains(oMsg) || oCache.isValueRequested(oMsg)) {
                    return iMsgId;
                }

                oCache.setValueIsRequested(oMsg);
            }

            oSockConn.emit('sm-data', oMsg.buildJSON());
            console.log("SENT: " + oMsg.buildJSON());

            return iMsgId;
        };

        /**
         * Sends a direct message.
         * @function
         * @private
         * @param {String} message The message that should be send.
         * @deprecated
         */
        this.sendDirect = function (message) {
            throw new DetailedError("SocketConnectionHandler", "sendDirect", "Method is deprecated.");
        };

        /**
         * Sends the content of the buffer.
         * @function
         * @private
         */
        this.sendBuffer = function () {
            while (aUnsentMessages.length > 0) {
                if (bSockConnConnected) {
                    this.send(aUnsentMessages.shift());
                } else {
                    return;
                }
            }
        };

        /**
         * Returns a new transaction ID.
         * @public
         * @function
         * @returns int The new transaction ID.
         */
        this.getNewMessageID = function () {
            return iMessageId++;
        };

        /**
         * Handles the recieved Message.
         * @function
         * @private
         * @param {String} oMsg The recieved Message.
         */
        this.handleMessage = function (sJson) {
            aReceivedMessageBuffer.push(Message.createInstanceFromJSON(sJson));
        };

        /**
         * Handles a defined amount of messages from buffer.
         * @function
         * @private
         */
        this.handleMessageFromBuffer = function () {
            var counter = 0,
                oMsg = null,
                iMsgId = null;

            for (counter; counter < iWorkFromStackReceivedMessages; counter++) {
                if (aReceivedMessageBuffer.length == 0) {
                    return;
                }

                oMsg = aReceivedMessageBuffer.shift();
                iMsgId = oMsg.getMessageId();
                if (oMsg.hasMessageId() && typeof (aMessages[iMsgId]) == "object") {
                    aMessages[iMsgId].callback(oMsg);
                    aMessages.splice(iMsgId, 1);
                } else {
                    oCache.add(oMsg);
                    this.dispatch(oMsg);
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
        this.register = function (oMsg, oCbHandler) {

            var sType = oMsg.getType(),
                sId = oMsg.getId(),
                iMsgId = null;

            if (null == sId) {
                sId = sListRegisteredIndex;
            }

            if (typeof (aRegisteredCallbacks[sType]) != "object") {
                aRegisteredCallbacks[sType] = [];
            }
            if (typeof (aRegisteredCallbacks[sType][sId]) != "object") {
                aRegisteredCallbacks[sType][sId] = [];
            }
            aRegisteredCallbacks[sType][sId].push(oCbHandler);

            if (!oMsg.getNocache()) {
                if (oCache.contains(oMsg)) {
                    oCbHandler.callback(sType, oCache.get(oMsg));
                } else if (!oCache.isValueRequested(oMsg)) {
                    iMsgId = this.send(oMsg);
                    aMessages[iMsgId] = oCbHandler;
                }
            }
        };

        /**
         * Unregisters a {@link CallbackHandler} for a message.
         * @function
         * @public
         * @param {Message} oMsg
         * @param {CallbackHandler} oCbHandler
         */
        this.unregister = function (oMsg, oCbHandler) {

            var sType = oMsg.getType(),
                sId = oMsg.getId(),
                iIndex;

            if (null == sId) {
                sId = sListRegisteredIndex;
            }

            if (typeof (aRegisteredCallbacks[sType]) != "object") {
                return;
            }

            iIndex = aRegisteredCallbacks[sType][sId].indexOf(oCbHandler);
            if (iIndex == -1) {
                return;
            }

            aRegisteredCallbacks[sType][sId].splice(iIndex, 1);
            if (aRegisteredCallbacks[sType][sId].length == 0) {
                this.send(Message.createInstance({
                    type: oMsg.getType(),
                    id: oMsg.getId(),
                    action: "unsub",
                    nocache: true
                }));

                oCache.remove(oMsg);
            }
        };

        /**
         * Dispatches a value of the given message from the cache.
         * @function
         * @private
         * @param {Message} oMsg The Message to dispatch the value from.
         */
        this.dispatchFromCache = function (oMsg) {
            var cachedValue = oCache.get(oMsg),
                index;

            if (cachedValue instanceof Message) {
                this.dispatch(cachedValue);
            } else {
                for (index in cachedValue) {
                    this.dispatch(cachedValue[index]);
                }
            }
        };

        /**
         * Dispatches an incoming message to the listener.
         * @function
         * @private
         * @param {Message} oMsg The message to dispatch.
         */
        this.dispatch = function (oMsg) {
            var sType = oMsg.getType(),
                sId = oMsg.getId(),
                sKey;

            if (sId == null) {
                sId = sListRegisteredIndex;
            }

            if (typeof (aRegisteredCallbacks[sType][sId]) == "object") {
                for (sKey in aRegisteredCallbacks[sType][sId]) {
                    aRegisteredCallbacks[sType][sId][sKey].callback(oMsg);
                }
            }

        };

        /**
         * Adds a new flag.
         * @public
         * @function
         * @param {Object} settings The setings object.
         */
        this.addFlag = function (settings) {
            if (typeof settings.name == "undefined" || settings.name == "" || settings.name == " ")
                throw new DetailedError("SocketConnectionHandlerObject", "addFlag", "The Name of the Flag must be set!");

            settings.active = settings.active || false;

            var name = settings.name;
            delete settings.name;

            aFlags [ name ] = settings;
            aFlagBuffer [ name ] = [];
            aFlagListener [ name ] = [];
        };

        /*
         * settings = {
         *     flagName: new Array("authRequired"), //required
         *     onActive: function () {}, //required
         *     once: true //optional
         *     }
         */
        /**
         * Adds a flag listener.
         * @public
         * @function
         * @param {Object} settings
         */
        this.addFlagListener = function (settings) {
            if (typeof aFlags [ settings.flagName ] == "undefined" || settings.flagname == "" || settings.flagName == " ")
                throw new DetailedError("SocketConnectionHandlerObject", "addFlagListener", "Error: No FlagName set in settings Object or Flag not available.");
            else if (typeof settings.onActive != "function")
                throw new DetailedError("SocketConnectionHandlerObject", "addFlagListener", "Error: no EventHandler set of typeof parameter not a function.");

            if (typeof settings.once == "undefined")
                settings.once = true;

            if (aFlags [ settings.flagName ].active) {
                settings.onActive();

                if (settings.once)
                    return;
            }

            if (typeof aFlagListener [ settings.flagName ] != "object")
                aFlagListener [ settings.flagName ] = [];

            aFlagListener [ settings.flagName ].push(settings);

        };

        /**
         * Removes a flag by name.
         * @public
         * @function
         * @param {String} name The flag name.
         */
        this.removeFlag = function (name) {
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
        this.setFlag = function (name, status) {
            aFlags [ name ].active = status;

            if (status) {
                // Send messages in Flagbuffer
                while (aFlagBuffer [ name ].length > 0)
                    this.send(aFlagBuffer [ name ].shift());

                // Call CallbackFunctions in FlagListener Array
                var settings , endArr = [];
                while (aFlagListener [ name ].length > 0) {
                    settings = aFlagListener [ name ].shift();

                    settings.onActive();

                    if (!settings.once)
                        endArr.push(settings);

                }
                aFlagListener [ name ] = endArr;
            }

        };
    };
});