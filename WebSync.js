if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([
    './Message',
    './Cache',
    './SocketConnectionHandler',
    './CallbackHandler',
    './DetailedError'
], function (Message, Cache, SocketConnectionHandler, CallbackHandler, DetailedError ) {
    return {
        'Message': Message,
        'Cache': Cache,
        'SocketConnectionHandler': SocketConnectionHandler,
        'DetailedError': DetailedError,
        'CallbackHandler': CallbackHandler
    };
});