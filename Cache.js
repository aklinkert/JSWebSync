/**
 * Provides a powerful cache.
 * @constructor
 * @public
 * @class a cache.
 */
var Cache = function ( ) {
	/**
     * The cache!
	 * @private
	 * @default Array
	 */
	var cachedValues = new Array ( );
	
	/**
     * Returns if the given message is available in cache.
	 * @function
	 * @public
	 * @param {Message} oMsg The message to check.
	 * @returns {Boolean} True if the message is available in cache, false if not.
	 */
	this.isCachedValue = function ( oMsg ) {
        var type = oMsg.getType();
        var id = oMsg.getId();

        if (null == id){
            return false;
        }

		return ( 
            'undefined' != typeof ( cachedValues [ type ] )
            && null != cachedValues [ type ]
            && 'undefined' != typeof (cachedValues[type][id])
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
	this.getCachedValue = function ( oMsg ) {
		if (typeof(cachedValues[oMsg.getType()]) == "object" && typeof(cachedValues[oMsg.getType()][oMsg.getId()]) == "object") {
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
	this.addCachedValue = function ( oMsg ) {
        if (typeof(cachedValues[oMsg.getType()]) != "object") {
            cachedValues[oMsg.getType()] = new Array();
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
	this.isCachedValueRequested = function ( oMsg ) {
		return ( typeof ( cachedValues [ oMsg.getType() ] ) == "object" && cachedValues [oMsg.getType()][oMsg.getId()] == null );
	};
	
	/**
     * Sets the value = null to say that the value is already requested.
	 * @function
	 * @public
	 * @param {Message} oMsg The {@link Message} to set.
	 */
	this.setCachedValueIsRequested = function ( oMsg ) {
		if ( this.isCachedValue ( oMsg ) )
			return;
		
		cachedValues [ oMsg.getType() ][ oMsg.getId() ] = null;
		
	};
	
	/**
     * Removes a value from the cache.
	 * @function
	 * @public
	 * @param Message oMsg The Message to remove.
	 */
	this.removeCachedValue = function ( oMsg ) {
		delete cachedValues [ oMsg.getType() ][ oMsg.getId() ];
	};
};
