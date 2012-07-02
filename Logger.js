var Logger = function ( ) {
	
	this.loglevels = new Array ( );
	
	this.currentLogLevel = null;
	
	this.outputDiv = $ ( "<div>" );
	
	this.onLogActions = new Array ( );
	
	this.setOutputDiv = function ( div ) {
		this.outputDiv = $ ( div );
	};
	
	this.setCurrentLogLevel = function ( level ) {
		this.currentLogLevel = level;
	};
	
	this.log = function ( loglevel , message ) {
		
		var actLevelPos = this.loglevels.indexOf ( this.currentLogLevel );
		
		if ( actLevelPos == null || actLevelPos == - 1 )
			throw new ErrorObject ( "Logger", "log", "Unable to log: the position of the curent log level could not be found." );
		
		if ( this.loglevels.indexOf ( loglevel ) >= actLevelPos ) {
			this.outputDiv.append ( "<br />" , message );
			
			for ( var index in this.onLogActions )
				this.onLogActions [ index ] ( message );
		}
		
	};
	
	this.cleanLog = function ( ) {
		this.outputDiv.empty ( );
	};
	
	this.addLogLevel = function ( loglevel ) {
		
		this.loglevels.push ( loglevel );
		
	};
	
	this.addOnLogAction = function ( func ) {
		this.onLogActions.push ( func );
	};
};
