if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['./DetailedError'], function (DetailedError) {
    var CallbackHandler = function () {

        var aCallbacks = {},
            aGroupEvents = {};

        this.on = function (sEvent, fCallback) {
            var sIndex;

            if (null == sEvent || sEvent == "") {
                throw new DetailedError("CallbackHandler", "on", "event is empty or null");
            }

            if (typeof (aGroupEvents[sEvent]) == "object") {
                for (sIndex in aGroupEvents[sEvent]) {
                    this.on(aGroupEvents[sEvent][sIndex], fCallback);
                }
            } else {
                if (typeof (aCallbacks[sEvent]) != "object") {
                    aCallbacks[sEvent] = [];
                }

                aCallbacks[sEvent].push(fCallback);
            }

            return this;
        };

        this.callback = function (oMsg, event) {
            var sIndex,
                sEvent = event || oMsg.getAction();

            if (null == sEvent || sEvent == "") {
                throw new DetailedError("CallbackHandler", "on", "event is empty or null");
            }

            if (typeof (aGroupEvents[sEvent]) == "object") {
                for (sIndex in aGroupEvents[sEvent]) {
                    this.callback(oMsg, aGroupEvents[sEvent][sIndex]);
                }
            } else if (typeof (aCallbacks[sEvent]) == "object") {
                for (sIndex in aCallbacks[sEvent]) {
                    aCallbacks[sEvent][sIndex](oMsg.getData());
                }
            }

            return this;
        };

        this.addGroupEvent = function (sGroupEvent, aEvents) {
            if (null == sGroupEvent || sGroupEvent == "") {
                throw new DetailedError("CallbackHandler", "addGroupEvent", "group event is empty or null");
            }
            if (null == aEvents || typeof aEvents != "object" || 0 == aEvents.length) {
                throw new DetailedError("CallbackHandler", "addGroupEvent", "group event is empty or null or not an array");
            }

            aGroupEvents[sGroupEvent] = aEvents;

            return this;
        };
    };

    return CallbackHandler;
});