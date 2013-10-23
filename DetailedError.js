if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['stacktrace-js'], function (stacktrace) {
    /**
     * @class
     * @constructor
     * @param {String} objName Name of the object where the error occured.
     * @param {String} funcName Name of the function where the error occured.
     * @param {String} message A detailed error message.
     * @description Error class for detailed error messages.
     */
    var DetailedError = function (objName, funcName, message) {
        // Prototype call
        Error.call(this);

        /**
         * Prints the Stacktrace by using <a>https://github.com/eriwen/javascript-stacktrace</a>.
         * @public
         * @function
         * @return String
         */
        this.printStackTrace = function () {
            return stacktrace().join("<br />\n");
        };

        /**
         * Returns a String with information about this Error.
         * @public
         * @function
         * @return String
         */
        this.toString = function () {
            return "Error during " + objName + "." + funcName + ": " + message + "<br />Stacktrace: " + this.printStackTrace();
        };
    };
    DetailedError.prototype = Error;
    DetailedError.prototype.constructor = DetailedError;

    return DetailedError;
});