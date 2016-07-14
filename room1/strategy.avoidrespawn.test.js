var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;


require('../lib/mocks/gameStateGlobals')();
var Creep = require('../ScreepsAutocomplete/Creep')();
var StructureKeeperLair = require('../ScreepsAutocomplete/Structures/StructureKeeperLair')();

var role  = require('./role.spawn');


describe ('Profiler',function() {
    "use strict";
    describe('profiling my functions', function () {
        it('barebones test', function () {
            let Avoid = require('./strategy.avoidrespawn');
            let strategy = new Avoid();

            creep.pos = new RoomPosition();
            let lair = new StructureKeeperLair();
            lair.ticksToRegeneration = 
            creep.pos.findInRange = ()=> [lair] 
            strategy.accepts(creep);

        });
    });
})

