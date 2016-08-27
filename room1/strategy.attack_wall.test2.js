global._ = require('lodash');
global.Creep = require('../ScreepsAutocomplete/Creep');
console.log('creep', Creep);
global.Room= require('../ScreepsAutocomplete/Room');
global.RoomPosition= require('../ScreepsAutocomplete/RoomPosition');
var Strategy = require('./strategy.attack_wall');
var util = require('./util');
global.PathFinder = require('../ScreepsAutocomplete/PathFinder');
PathFinder.search = function () {
    return {path: [{x: 1, y: 1}, {x: 1, y: 1}, {x: 1, y: 1}, {x: 1, y: 1}, {x: 1, y: 1},], ops: 100};
};

Creep.prototype.getActiveBodyparts = function () {
    "use strict";
    return 1;
};
RoomPosition.prototype.getRangeTo = function () {
    "use strict";
    return 10;
};

let strategy = new Strategy();

let creep = Object.extend(Creep);
creep.memory = {};
creep.memory.remoteRoom='A';
creep.memory.homeroom = 'B';
creep.body = [];
creep.pos = new RoomPosition();
creep.room = new Room();
creep.room.memory = {};

_.values(Game.rooms.E38S14.find(FIND_FLAGS)).forEach((f)=> f.remove())
// PathFinder.search({x: 2, y:31, roomName:'E38S14' }, {x: 6, y:36, roomName:'E38S14'})
JSON.stringify(_.map({"path":[{"x":3,"y":32,"roomName":"E38S14"},{"x":4,"y":33,"roomName":"E38S14"},{"x":5,"y":34,"roomName":"E38S14"},{"x":6,"y":35,"roomName":"E38S14"},{"x":6,"y":36,"roomName":"E38S14"}],"ops":5}.path,(o)=>{return {x:o.x, y:o.y}}))

// strategy.accepts(creep);