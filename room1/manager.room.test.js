var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;

var Room = require('../ScreepsAutocomplete/Room');
var StructureController = require('../ScreepsAutocomplete/Structures/StructureController');
var Source = require('../ScreepsAutocomplete/Source');
var RoomPosition = require('../ScreepsAutocomplete/RoomPosition');
var StructureSpawn = require('../ScreepsAutocomplete/Structures/StructureSpawn');
var mocha = require('mocha');

/*describe('RCL1', function () {
 it('should', function () {
 var RoomManager = require('./manager.room'), manager = new RoomManager();

 let room = new Room();
 RoomPosition.prototype.getRangeTo = function (firstArg, secondArg) {
 "use strict";
 let x, y;
 if ('number' === typeof firstArg) {
 x = firstArg;
 y = secondArg;
 } else {
 x = firstArg.x;
 y = firstArg.y;
 }
 console.log('getRangeTo', JSON.stringify(this), firstArg, secondArg)
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
 room.controller.room = room;
 room.controller.pos = new RoomPosition();
 room.controller.pos.x = 10;
 room.controller.pos.y = 0;

 console.log('harvesters', manager.optimalHarvesterCountRCL1(room));
 console.log('upgraders', manager.optimalUpgraderCountRCL1(room));

 });
 });*/
describe('auto-produce', function () {
    it('should find produceable reactions', function () {
        let reactions = require('./role.lab_operator').reactions;
        Memory.needs = ["XUH2O", "XGHO2", "XLHO2", "XZHO2", "GH2O", "GHO2", "KHO2", "Z", "GH"];
        let ledger = {
            "time": 15128060,
            "v": {
                "XUH2O": {"amount": 161210, "goal": 250000},
                "XGHO2": {"amount": 120337, "goal": 250000},
                "XLHO2": {"amount": 59800, "goal": 250000},
                "XZHO2": {"amount": 63475, "goal": 250000},
                "G": {"amount": 85194, "goal": 50000},
                "LHO2": {"amount": 142101, "goal": 5000},
                "X": {"amount": 44115, "goal": 15000},
                "GH2O": {"amount": 29, "goal": 10000},
                "UH2O": {"amount": 169013, "goal": 10000},
                "GHO2": {"amount": 4, "goal": 10000},
                "KHO2": {"amount": 0, "goal": 5000},
                "energy": {"amount": 3687017, "goal": 0},
                "XLH2O": {"amount": 58360, "goal": 0},
                "XGH2O": {"amount": 70489, "goal": 5000},
                "UH": {"amount": 54982, "goal": 5000},
                "KO": {"amount": 174704, "goal": 5000},
                "ZH": {"amount": 230, "goal": 0},
                "GO": {"amount": 67391, "goal": 0},
                "LH2O": {"amount": 23821, "goal": 0},
                "Z": {"amount": 5776, "goal": 10000},
                "O": {"amount": 131603, "goal": 25000},
                "ZO": {"amount": 41800, "goal": 5000},
                "OH": {"amount": 106566, "goal": 20000},
                "ZHO2": {"amount": 21512, "goal": 5000},
                "H": {"amount": 28154, "goal": 20000},
                "LH": {"amount": 70730, "goal": 0},
                "LO": {"amount": 243332, "goal": 5000},
                "K": {"amount": 54454, "goal": 5000},
                "L": {"amount": 294648, "goal": 5000},
                "UO": {"amount": 21430, "goal": 0},
                "GH": {"amount": 19, "goal": 5000},
                "XKHO2": {"amount": 40, "goal": 0},
                "U": {"amount": 122169, "goal": 10000},
                "UL": {"amount": 41573, "goal": 5000},
                "ZK": {"amount": 39153, "goal": 5000}
            },

        };
        let produceable = Memory.needs.filter(min=> {
            let ingredients = reactions[min];
            return ingredients && ingredients.reduce((allAvailable, i)=> allAvailable && (_.get(ledger.v, [i, 'amount'], 0) > 2000), true);
        });
        console.log('able to produce', produceable);
        produceable= _.sortBy(produceable, min=>_.get(ledger.v, [min, 'amount'], 0) / _.get(ledger.v, [min, 'goal'], 0));
        console.log('sorted ', produceable);
        console.log('sorted ', JSON.stringify(produceable.map(min=>[min,_.get(ledger.v, [min, 'amount'], 0) / _.get(ledger.v, [min, 'goal'], 0)])));

    })
});