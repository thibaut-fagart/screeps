

var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;


require('../lib/mocks/gameStateGlobals')();

var role  = require('./role.spawn');


describe ('RoleSpawn',function() {
    "use strict";
    describe('shapeBody', function() {
        it ('should order correctly the parts', function() {
            var Spawn = require('../ScreepsAutocomplete/Structures/StructureSpawn');
            var spawn = new Spawn();
            spawn.room = {energyAvailable: 200};
            let body = role.shapeBody(spawn, [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY]);
            console.log(body);
            expect('there shoulbe some MOVE', body.indexOf(MOVE) >= 0);
            expect('there shoulbe some WORK', body.indexOf(WORK) >= 0);
            expect('there shoulbe some MOVE', body.indexOf(CARRY) >= 0);
        })
    })
})
