var CallbackHandler = function () {

    var aCallbacks = {};

    var aGroupEvents = {};

    this.on = function (sEvent, fCallback) {
        if (null == sEvent || jQuery.trim(sEvent) == "") {
            throw new DetailedError("CallbackHandler", "on", "event is empty or null");
        }

        if (typeof (aGroupEvents[sEvent]) == "object"){
            for (var sIndex in aGroupEvents[sEvent]) {
                this.on(aGroupEvents[sEvent][sIndex], fCallback);
            }
        } else if (typeof (aCallbacks[sEvent]) == "object") {
            aCallbacks[sEvent].push( fCallback);
        }

        return this;
    };

    this.callback = function (sEvent, oMessage) {
        if (null == sEvent || jQuery.trim(sEvent) == "") {
            throw new DetailedError("CallbackHandler", "on", "event is empty or null");
        }

        if (typeof (aGroupEvents[sEvent]) == "object"){
            for (var sIndex in aGroupEvents[sEvent]) {
                this.callback(aGroupEvents[sEvent][sIndex], oMessage);
            }
        } else if (typeof (aCallbacks[sEvent]) == "object"){
            for (var sIndex in aGroupEvents[sEvent]) {
                var fCallback = aGroupEvents[sEvent][sIndex];

                fCallback(oMessage);
            }
        }

        return this;
    };

    this.addGroupEvent = function (sGroupEvent, aEvents) {
        if (null == sGroupEvent || jQuery.trim(sGroupEvent) == "") {
            throw new DetailedError("CallbackHandler", "addGroupEvent", "group event is empty or null");
        }
        if (null == aEvents || typeof(aEvents) != "object" || 0 == aEvents.length) {
            throw new DetailedError("CallbackHandler", "addGroupEvent", "group event is empty or null or not an array");
        }

        aGroupEvents[sGroupEvent] = aEvents;

        return this;
    };
};