var chai = require('chai');
var expect = chai.expect;
var Room = require('../ScreepsAutocomplete/Room');
var StructureController = require('../ScreepsAutocomplete/Structures/StructureController');
var Source = require('../ScreepsAutocomplete/Source');
var RoomPosition = require('../ScreepsAutocomplete/RoomPosition');
var StructureSpawn = require('../ScreepsAutocomplete/Structures/StructureSpawn');
// var mocha = require('mocha');

it('RCL1', function () {
    var RoomManager = require('./manager.room'), manager = new RoomManager();

    let room = new Room();
    RoomPosition.prototype.getRangeTo = function(firstArg, secondArg) {
        "use strict";
        let x , y;
        if ('number' === typeof firstArg) {
            x = firstArg;
            y = secondArg;
        } else {
            x =firstArg.x;
            y =firstArg.y;
        }
        console.log('getRangeTo', JSON.stringify(this),firstArg,secondArg)
            return Math.max(Math.abs(this.x - x), Math.abs(this.y - y));
        };

    Room.prototype.find = function (what) {
        "use strict";
        if (what === FIND_SOURCES_ACTIVE) {

            let source = new Source();
            source.room = room;
            source.pos = new RoomPosition();
            source.pos.x = 0;
            source.pos.y = 0;
            return [source];
        } else if (what === FIND_MY_SPAWNS) {
            let spawn = new StructureSpawn();
            spawn.room = room;
            spawn.pos = new RoomPosition();
            spawn.pos.x = -10;
            spawn.pos.y = 0;
            return [spawn];
        }
    };
    room.controller = new StructureController();
    room.controller.level = 1;
    room.controller.room= room;
    room.controller.pos = new RoomPosition();
    room.controller.pos.x = 10;
    room.controller.pos.y = 0;

    console.log('harvesters', manager.optimalHarvesterCountRCL1(room));
    console.log('upgraders', manager.optimalUpgraderCountRCL1(room));


});
