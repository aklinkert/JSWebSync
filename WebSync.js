if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([
    'jswebsync/Message',
    'jswebsync/Cache',
    'jswebsync/Logger',
    'jswebsync/SocketConnectionHandler',
    'jswebsync/CallbackHandler',
    'jswebsync/DetailedError'
], function (Message, Cache, Logger, SocketConnectionHandler, CallbackHandler, DetailedError ) {
    return {
        'Message': Message,
        'Cache': Cache,
        'SocketConnectionHandler': SocketConnectionHandler,
        'Logger': Logger,
        'DetailedError': DetailedError,
        'CallbackHandler': CallbackHandler
    };
});