var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
require('../lib/mocks/gameStateGlobals')();
global.Game.time = 1;
global.Game.spawns = {Spawn1:new Spawn()};
global.Game.spawns.Spawn1.name='Spawn1';
global.Game.rooms = {sim:new Room()};
global.Game.rooms.sim.name = 'sim';
global.Game.rooms.sim.controller= {level:1};
let source = new Source();
source.energy = 3000;
source.energyCapacity = 3000;
source.id= 's1';
Game.objects = {};
Game.objects[source.id] = source;
Game.getObjectById = function (id) {
    "use strict";
    return Game.objects[id];
};
global.Game.rooms.sim.find= function(type) {
    "use strict";
    switch (type) {
        case FIND_SOURCES:
            return [source];
    }
};

global.Game.spawns.Spawn1.room=global.Game.rooms.sim;
global.Memory.rooms.sim = {};
global.Game.rooms.sim.memory = global.Memory.rooms.sim;

var mainLoop= require('./main');

mainLoop.loop();
console.log(JSON.stringify(Memory, undefined));
Game.time++;
mainLoop.loop();
console.log(JSON.stringify(Memory, undefined));
Game.time++;
mainLoop.loop();
console.log(JSON.stringify(Memory, undefined));
