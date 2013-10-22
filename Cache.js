if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([], function () {
    /**
     * Provides a powerful cache.
     * @constructor
     * @public
     * @class Cache
     */
    var Cache = function () {
        /**
         * The cache!
         * @private
         * @default Array
         */
        var cachedValues = [];

        /**
         * Returns if the given message is available in cache.
         * @function
         * @public
         * @param {Message} oMsg The message to check.
         * @returns {Boolean} True if the message is available in cache, false if not.
         */
        this.contains = function (oMsg) {
            var type = oMsg.getType(),
                id = oMsg.getId();

            if (null == id) {
                return false;
            }

            return (
                undefined !== cachedValues[type]
                    && null != cachedValues[type]
                    && undefined !== cachedValues[type][id]
                    && null != cachedValues[type][id]
                    && cachedValues[type][id] instanceof Message
                );
        };

        /**
         * Returns the cached value.
         * @function
         * @public
         * @param {Message} oMsg The Message which cached value should be cached.
         * @returns Message
         */
        this.get = function (oMsg) {
            if (typeof (cachedValues[oMsg.getType()]) == "object" && typeof (cachedValues[oMsg.getType()][oMsg.getId()]) == "object") {
                return cachedValues[oMsg.getType()][oMsg.getId()];
            }
            return null;
        };

        /**
         * Add a value to the cache.
         * @function
         * @public
         * @param {Message} oMsg The {@link Message} to be saved in cache.
         */
        this.add = function (oMsg) {
            if (typeof (cachedValues[oMsg.getType()]) != "object") {
                cachedValues[oMsg.getType()] = [];
            }
            cachedValues[oMsg.getType()][oMsg.getId()] = oMsg;
        };

        /**
         * Checks if a value is already requested.
         * @function
         * @public
         * @param {Message} oMsg The message to check.
         * @returns Boolean
         */
        this.isValueRequested = function (oMsg) {
            return (typeof (cachedValues[oMsg.getType()]) == "object" && cachedValues[oMsg.getType()][oMsg.getId()] == null);
        };

        /**
         * Sets the value = null to say that the value is already requested.
         * @function
         * @public
         * @param {Message} oMsg The {@link Message} to set.
         */
        this.setValueIsRequested = function (oMsg) {
            if (this.contains(oMsg)) {
                return;
            }

            var sType = oMsg.getType(),
                sId = oMsg.getId();

            if (cachedValues[sType] === undefined) {
                cachedValues[sType] = [];
            }

            cachedValues[sType][sId] = null;
        };

        /**
         * Removes a value from the cache.
         * @function
         * @public
         * @param {Message} oMsg The Message to remove.
         */
        this.remove = function (oMsg) {
            var sType = oMsg.getType(),
                sId = oMsg.getId();

            if (typeof (cachedValues[sType]) == "object" && typeof (cachedValues[sType][sId]) == "object") {
                cachedValues[sType].splice(cachedValues[sType].indexOf(sId), 1);
            }
        };
    };

    return Cache;
});