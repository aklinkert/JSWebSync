/**
 * @class
 * @constructor
 * @param {String} objName Name of the object where the error occured.
 * @param {String} funcName Name of the function where the error occured.
 * @param {String} message A detailed error message.
 * @description Error class for detailed error messages.
 */
var DetailedError = function ( objName , funcName , message ) {
	// Prototype call
	Error.call ( this );
	
	/**
     * Local reference to objName.
	 * @private
	 * @default String
	 */
	var objName = objName;
	
	/**
     * Local reference to funcName.
	 * @private
	 * @default String
	 */
	var funcName = funcName;
	
	/**
     * Local reference to message.
	 * @private
	 * @default String
	 */
	var message = message;
	
	/**
     * Prints the Stacktrace by using <a>https://github.com/eriwen/javascript-stacktrace</a>.
	 * @public
	 * @function
	 * @return String
	 */
	this.printStackTrace = function ( ) {
		return printStackTrace ( ).join ( "<br />\n" );
	};
	
	/**
     * Returns a String with information about this Error.
	 * @public
	 * @function
	 * @return String
	 */
	this.toString = function ( ) {
		return "Error during " + objName + "." + funcName + ": " + message + "<br />Stacktrace: " + this.printStackTrace ( );
	};
};
DetailedError.prototype = Error;
DetailedError.prototype.constructor = DetailedError;
