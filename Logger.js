if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['jquery'], function ($) {
    /**
     * The Logger is an object to log events and messages seperated with loglevels. By setting the loglevel you can choose, how much should be logged.
     * @constructor
     * @public
     * @class Logs events in a div and executes ections per message.
     */
    var Logger = function () {
        /**
         * Stores the available log levels.
         * @private
         * @default Array
         */
        this.loglevels = [];

        /**
         * Stores the current log level.
         * @private
         * @default null
         */
        this.currentLogLevel = null;

        /**
         * The div where the log messages should be shown in.
         * @private
         * @default jQueryObject
         */
        this.outputDiv = $("<div>");

        /**
         * Stores the functions that should be executed on logging action.
         * @private
         * @default Array
         */
        this.onLogActions = [];

        /**
         * Sets the output div to #div.
         * @public
         * @function
         * @param {jQueryObject} A jQuery Selector with a div.
         */
        this.setOutputDiv = function (div) {
            this.outputDiv = $(div);
        };

        /**
         * Sets the current log level to #level.
         * @public
         * @function
         * @param {String} The current log level.
         */
        this.setCurrentLogLevel = function (level) {
            this.currentLogLevel = level;
        };

        /**
         * Logs a message.
         * @public
         * @function
         * @param {String} loglevel The level, at which the message should be logged.
         * @param {String} message The Message that should be logged.
         */
        this.log = function (loglevel, message) {

            var actLevelPos = this.loglevels.indexOf(this.currentLogLevel),
                index;

            if (actLevelPos == null || actLevelPos == -1) {
                return;
            }
            if (this.loglevels.indexOf(loglevel) <= actLevelPos) {
                this.outputDiv.prepend("<br />", this.getTimeStamp() + " " + message).scrollTop(0);

                for (index in this.onLogActions) {
                    this.onLogActions[index](message);
                }
            }

        };

        /**
         * Returns a timestamp string.
         * @private
         * @function
         * @returns String
         */
        this.getTimeStamp = function () {
            var d = new Date();
            return "<span style=\"color: grey;\">" + d.getHours() + ":" + d.getMinutes() + ":" + ((d.getSeconds() < 10) ? "0" + d.getSeconds().toString() : d.getSeconds().toString()) + ":" + d.getMilliseconds() + "</span>";
        };

        /**
         * Cleans the output div.
         * @public
         * @function
         */
        this.cleanLog = function () {
            this.outputDiv.empty();
        };

        /**
         * Adds a log level to the available log levels. It will be appended at the end, so the lowest level should be added at first.
         * @public
         * @function
         * @param {String} loglevel The level to be added.
         */
        this.addLogLevel = function (loglevel) {

            this.loglevels.push(loglevel);

        };

        /**
         * Adds a function to the array of functions, that are executed when a message is logged.
         * @public
         * @function
         * @param {Function} func The function to be added.
         */
        this.addOnLogAction = function (func) {
            this.onLogActions.push(func);
        };
    };

    return Logger;
});
