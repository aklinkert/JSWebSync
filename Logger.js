/**
 * @constructor
 * @public
 * @class Logs events in a div and executes ections per message.
 * @description The Logger is an object to log events and messages seperated with loglevels. By setting the loglevel you
 *              can choose, how much should be logged.
 */
var Logger = function ( ) {
	
	/**
	 * @private
	 * @default Array
	 * @description Stores the available loglevels.
	 */
	this.loglevels = new Array ( );
	
	/**
	 * @private
	 * @default null
	 * @description Stores the current loglevel.
	 */
	this.currentLogLevel = null;
	
	/**
	 * @private
	 * @default jQueryObject
	 * @description The div where the log messages should be shown in.
	 */
	this.outputDiv = $ ( "<div>" );
	
	/**
	 * @private
	 * @default Array
	 * @description Stores the functions that should be executed on logging action.
	 */
	this.onLogActions = new Array ( );
	
	/**
	 * @public
	 * @function
	 * @param {jQueryObject} A jQuery Selector with a div.
	 * @description Sets the output div to #div.
	 */
	this.setOutputDiv = function ( div ) {
		this.outputDiv = $ ( div );
	};
	
	/**
	 * @public
	 * @function
	 * @param {String} The current log level.
	 * @description Sets the current loglevel to #level.
	 */
	this.setCurrentLogLevel = function ( level ) {
		this.currentLogLevel = level;
	};
	
	/**
	 * @public
	 * @function
	 * @param {String} loglevel The level, at which the message should be logged.
	 * @param {String} message The Message that should be logged.
	 */
	this.log = function ( loglevel , message ) {
		
		var actLevelPos = this.loglevels.indexOf ( this.currentLogLevel );
		
		if ( actLevelPos == null || actLevelPos == - 1 )
			throw new ErrorObject ( "Logger", "log", "Unable to log: the position of the curent log level could not be found." );
		
		if ( this.loglevels.indexOf ( loglevel ) <= actLevelPos ) {
			this.outputDiv.prepend ( "<br />" , this.getTimeStamp ( ) + " " + message ).scrollTop ( 0 );
			
			for ( var index in this.onLogActions )
				this.onLogActions [ index ] ( message );
		}
		
	};
	
	/**
	 * @private
	 * @function
	 * @returns String
	 * @description Returns a timestamp as string.
	 */
	this.getTimeStamp = function ( ) {
		var d = new Date ( );
		return "<span style=\"color: grey;\">" + d.getHours ( ) + ":" + d.getMinutes ( ) + ":" + ( ( d.getSeconds ( ) < 10 ) ? "0" + d.getSeconds ( ).toString ( ) : d.getSeconds ( ).toString ( ) ) + ":" + d.getMilliseconds ( ) + "</span>";
	};
	
	/**
	 * @public
	 * @function
	 * @description Cleans the output div.
	 */
	this.cleanLog = function ( ) {
		this.outputDiv.empty ( );
	};
	
	/**
	 * @public
	 * @function
	 * @param {String} loglevel The level to be added.
	 * @description Adds a loglevel to the available loglevels. It will be appended at the end, so the lowest level
	 *              should be added at first.
	 */
	this.addLogLevel = function ( loglevel ) {
		
		this.loglevels.push ( loglevel );
		
	};
	
	/**
	 * @public
	 * @function
	 * @param {Function} func The function to be added.
	 * @description Adds a function to the array of functions, that are executed when a message is logged.
	 */
	this.addOnLogAction = function ( func ) {
		this.onLogActions.push ( func );
	};
};
