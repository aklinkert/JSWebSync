/**
 * @constructor
 * @public
 * @class Repr&auml;sentiert einen Cache
 * @description Stellt einen Cache und die Methoden, um diesen zu f&uuml;llen und abzufragen, bereit.
 */
var CacheObject = function ( ) {
	/**
	 * @private
	 * @default Array
	 */
	this.cachedValues = new Array ( );
	
	/**
	 * @function
	 * @public
	 * @param {PathObject|String} pathObj Der Path, der &uuml;berpr&uuml;ft werden soll
	 * @returns {Boolean} Gibt zur&uuml;ck, ob ein Wert im Cache vorhanden ist
	 * @description is-Funktion. Gibt True zur&uuml;ck, wenn ein Wert im Cache vorhanden ist.
	 */
	this.isCachedValue = function ( pathObj ) {
		var path = ( typeof pathObj == "object" && pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj;
		
		return ( typeof ( this.cachedValues [ path ] ) != "undefined" && this.cachedValues [ path ] != null ) ? true : false;
	};
	
	/**
	 * @function
	 * @public
	 * @param {PathObject|String} pathObj Der Path, dessen gecachter Wert zur&uuml;ckgegeben werden soll
	 * @returns Object
	 * @description Gibt den gespeicherten Wert aus dem Cache zur&uuml;ck.
	 */
	this.getCachedValue = function ( pathObj ) {
		var path = ( typeof pathObj == "object" && pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj;
		
		var cache = this.cachedValues [ path ];
		
		if ( isUndefined ( cache ) )
			throw new ErrorObject ( "CacheObject", "getCachedValue", "No cached Value at given index!" );
		
		if ( typeof cache == "object" )
			return cache;
		else
			logError ( "Invalid typeof CachedValue: " + typeof cache + "; value: " + cache );
		
	};
	
	/**
	 * @function
	 * @public
	 * @param {PathObject|String} pathObj Das {@link PathObject}, zu dem die Anzahl der Values zur&uuml;ckgegeben
	 *        werden soll.
	 * @description Gibt die Anzahl der Values zu dem von pathObj repr&auml;sentierten Path zur&uuml;ck.
	 */
	this.getCachedValueSize = function ( pathObj ) {
		var path = ( typeof pathObj == "object" && pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj;
		
		return ( this.isCachedValue ( path ) ) ? ( ( this.cachedValues [ path ] instanceof PathObject ) ? 1 : this.cachedValues [ path ].length ) : 0;
	};
	
	/**
	 * @function
	 * @public
	 * @param {PathObject} pathObj Das {@link PathObject}, das in den Cache gespeichert werden soll.
	 * @description is-Funktion. Gibt True zur&uuml;ck, wenn ein Wert im Cache vorhanden ist.
	 */
	this.addCachedValue = function ( pathObj ) {
		var pathStr = pathObj.getPath ( );
		var method = pathObj.getCommand ( );
		
		if ( method == "def" ) {
			if ( isUndefined ( this.cachedValues [ pathStr ] ) || this.cachedValues [ pathStr ] == null )
				this.cachedValues [ pathStr ] = pathObj;
			else if ( typeof this.cachedValues [ pathStr ] == "object" ) {
				if ( this.cachedValues [ pathStr ] instanceof PathObject ) {
					var obj = this.cachedValues [ pathStr ];
					this.cachedValues [ pathStr ] = new Array ( );
					this.cachedValues [ pathStr ].push ( obj , pathObj );
				} else
					this.cachedValues [ pathStr ].push ( pathObj );
			} else
				logError ( "komischer cache type: " + typeof this.cachedValues [ pathStr ] );
			
		} else if ( method == "upd" )
			this.cachedValues [ pathStr ] = pathObj;
	};
	
	/**
	 * @function
	 * @public
	 * @param {PathObject} pathObj Das zu &uuml;berpr&uuml;fende PathObject.
	 * @returns Boolean
	 * @description Pr&uuml;ft, ob ein path bereits angefragt wurde. Diese Funkionalit&auml;t wurde notwenig, als klar
	 *              wurde, dass es auf einige Paths keine antworten gibt, da keine Datensätze vorhanden sind (z.B. keine
	 *              Contags in einer Contactgroup). In diesem Fall wird der Eintrag null sein und das registrierte
	 *              Object wird normal benachrichtigt, wenn irgendwann eine Antwort kommt.
	 */
	this.isCachedValueRequested = function ( pathObj ) {
		var path = ( typeof pathObj == "object" && pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj;
		
		return ( ! isUndefined ( this.cachedValues [ path ] ) && this.cachedValues [ path ] == null ) ? true : false;
	};
	
	/**
	 * @function
	 * @public
	 * @param {PathObject|String} pathObj Das zu setzende {@link PathObject}.
	 * @description Setzt den Wert des Paths auf null, was soviel bedeutet wie &quote;Path wurde schon gesendet, auf
	 *              Antwort wird gewartet.&quote;.
	 */
	this.setCachedValueIsRequested = function ( pathObj ) {
		var path = ( typeof pathObj == "object" && pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj;
		
		if ( this.isCachedValue ( path ) )
			return;
		
		this.cachedValues [ path ] = null;
		
	};
	
	/**
	 * @function
	 * @public
	 * @param {PathObject|String} pathObj Das zu l&ouml;schende {@link PathObject}.
	 * @description L&ouml;scht einen Path und die dazu geh&ouml;renden Werte aus dem Cache.
	 */
	this.removeCachedValue = function ( pathObj ) {
		var path = ( typeof pathObj == "object" && pathObj instanceof PathObject ) ? pathObj.getPath ( ) : pathObj;
		
		delete this.cachedValues [ path ];
	};
};
