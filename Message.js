if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['jquery'], function (jQuery) {
    var Message = function () {
        /*
         {
         "msgid": 1,                                             // Transaction ID
         "action": "get",                                        // Action type
         "type": "user",                                         // Class / Type / DB Table
         "id": "520de388df0b810f810027ac",                       // ... id ...
         "rels": ["circle"],                                     // Array of Relations to sideload
         "sub": true,                                            // subscription
         "nocache": true,                                        // If the response shouldn't be taken from cache
         "flags": []                                             // list of used flags
         }
         */
        var oMessage = {},
            oFields = {
                messageId: "msgid",
                id: "id",
                type: "type",
                action: "action",
                subscription: "sub",
                nocache: "nocache",
                relations: "rels",
                flags: "flags",
                data: "data"
            },
            sMessageId = null,
            sId = null,
            sType = null,
            sAction = null,
            aRelations = [],
            aFlags = [],
            bSubscription = true,
            bNocache = false,
            oData = {};

        this.setMessageId = function (messageId) {
            sMessageId = messageId;
        };

        this.getMessageId = function () {
            return sMessageId;
        };

        this.hasMessageId = function () {
            return sMessageId != null;
        };

        this.setId = function (id) {
            sId = id;
        };

        this.getId = function () {
            return sId;
        };

        this.hasId = function () {
            return sId != null;
        };

        this.setType = function (type) {
            sType = type;
        };

        this.getType = function () {
            return sType;
        };

        this.setAction = function (action) {
            sAction = action;
        };

        this.getAction = function () {
            return sAction;
        };

        this.setSubscription = function (sub) {
            bSubscription = sub;
        };

        this.getSubscription = function () {
            return bSubscription;
        };

        this.setNocache = function (nocache) {
            bNocache = nocache;
        };

        this.getNocache = function () {
            return bNocache;
        };

        this.setData = function (data) {
            sType = data;
        };

        this.getData = function () {
            return oData;
        };

        this.getRelations = function () {
            return aRelations;
        };

        this.addRelation = function (rel) {
            aRelations.push(rel);
        };

        this.removeRelation = function (rel) {
            aRelations.splice(aRelations.indexOf(rel), 1);
        };

        this.getFlags = function () {
            return aFlags;
        };

        this.addFlag = function (flag) {
            aFlags.push(flag);
        };

        this.removeFlag = function (flag) {
            aFlags.splice(aFlags.indexOf(flag), 1);
        };

        this.readFromObject = function (oMessage) {
            sMessageId = oMessage[oFields.messageId];
            sId = oMessage[oFields.id];
            sType = oMessage[oFields.type];
            sAction = oMessage[oFields.action];
            bSubscription = oMessage[oFields.subscription];
            bNocache = oMessage[oFields.nocache];
            aRelations = oMessage[oFields.relations] || [];
            aFlags = oMessage[oFields.flags] || [];
            oData = oMessage[oFields.data] || {};
        };

        this.buildJSON = function () {
            oMessage = {};
            oMessage[oFields.messageId] = sMessageId;
            oMessage[oFields.id] = sId;
            oMessage[oFields.type] = sType;
            oMessage[oFields.action] = sAction;
            oMessage[oFields.subscription] = bSubscription;
            oMessage[oFields.nocache] = bNocache;
            oMessage[oFields.relations] = aRelations;
            oMessage[oFields.flags] = aFlags;
            oMessage[oFields.data] = oData;

            return JSON.stringify(oMessage);
        };
    };

    Message.createInstance = function (json) {
        var oMessage = new Message();
        oMessage.readFromObject(json);
        return oMessage;
    };

    Message.createInstanceFromJSON = function (sJson) {
        return Message.createInstance(jQuery.parseJSON(sJson));
    };

    return Message;
});