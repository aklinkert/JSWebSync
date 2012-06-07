/**
 * @class
 * @constructor
 * @param {String} objName Der Name des Objects, in dem der Fehler auftrat.
 * @param {String} funcName Der Name der Function, in dem der Fehler auftrat.
 * @param {String} message Eine Detaillierte Fehlermeldung.
 * @description Allgemeines ErrorObject f&uuml;r detaillierte Angaben in Try-Catch-Bl&ouml;cken.
 */
var ErrorObject = function ( objName , funcName , message ) {
	// Prototype call
	Error.call ( this );
	
	/**
	 * @private
	 * @default String
	 * @description Locale reference to objName.
	 */
	this.objName = objName;
	
	/**
	 * @private
	 * @default String
	 * @description Locale reference to funcName.
	 */
	this.funcName = funcName;
	
	/**
	 * @private
	 * @default String
	 * @description Locale reference to message.
	 */
	this.message = message;
	
	/**
	 * @public
	 * @function
	 * @return String
	 * @description Prints the Stacetrack by using <a>https://github.com/eriwen/javascript-stacktrace</a>.
	 */
	this.printStackTrace = function ( ) {
		return printStackTrace ( ).join ( "<br />\n" );
	};
	
	/**
	 * @public
	 * @function
	 * @return String
	 * @description Returns a String with informations about this Error.
	 */
	this.toString = function ( ) {
		return "Error during " + this.objName + "." + this.funcName + ": " + this.message + "<br />Stacktrace: " + this.printStackTrace ( );
	};
};
ErrorObject.prototype = Error;
ErrorObject.prototype.constructor = ErrorObject;
