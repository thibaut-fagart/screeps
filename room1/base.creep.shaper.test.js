var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;


require('../lib/mocks/gameStateGlobals')();

var CreepShaper = require('./base.creep.shaper');


describe('CreepShaper', function () {
    "use strict";
    describe('shapeBody', function () {
        it('', function () {
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 1000;
            room.availableBoosts = ()=>([/*'ZO'*/]);
            let requirements = shaper.requirements();
            requirements[CAPACITY] = Infinity;
            requirements.minimum('fullPlainSpeed', 1);
            requirements.minimum(HEAL, 50);
            requirements.minimum(HEAL, 50);
            requirements.maximize(ATTACK);
            let body = shaper.shape(room, requirements);
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('carry', function () {
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 5000;
            room.availableBoosts = ()=>([/*'ZO'*/]);
            let body = shaper.shape(room, CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY));
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('harvester', function () {
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 5000;
            room.availableBoosts = ()=>([/*'ZO'*/]);
            let body = shaper.shape(room, CreepShaper.requirements().minimum(HARVEST, 10));
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('mineralHarvester', function () {
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 5000;
            room.availableBoosts = ()=>([/*'ZO'*/]);
            let body = CreepShaper.shape(room, CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.2).maximize(HARVEST));
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('remoteCarryKeeper', function () {
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 5000;
            room.availableBoosts = ()=>(['ZO']);
            let body = shaper.shape(room, shaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(DAMAGE, 1).minimum(HEAL, 1).maximize(CAPACITY));
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('create attacker', function () {
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 5000;
            room.availableBoosts = ()=>(['UH2O', 'ZO', 'LO']);
            let requirements = shaper.requirements();
            requirements[CAPACITY] = Infinity;
            requirements.minimum('fullPlainSpeed', 1);
            requirements.minimum(ATTACK, 600);
            requirements.minimum(HEAL, 50);
            // requirements.maximize(ATTACK);
            let body = shaper.shape(room, requirements);
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('use patterns', function () {
            let patterns = require('./base.creep.patterns');
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 2300;
            room.availableBoosts = ()=>([/*'UH2O', 'ZO', 'LO'*/]);
            let bodies = _.mapValues(patterns, (spec)=> {
                console.log(spec.memory.role);
                if (_.isFunction(spec.body)) {
                    return spec.body(room);
                } else {
                    return spec.body;
                }
            });
            console.log(JSON.stringify(_.mapValues(bodies,(body)=>_.sum(body, (p)=>BODYPART_COST[p]))));
        });
        it('use patterns', function () {
            let patterns = require('./base.creep.patterns');
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 2300;
            room.availableBoosts = ()=>([/*'UH2O', 'ZO', 'LO'*/]);
            let bodies = _.mapValues(patterns, (spec)=> {
                console.log(spec.memory.role);
                if (_.isFunction(spec.body)) {
                    return spec.body(room);
                } else {
                    return spec.body;
                }
            });
            console.log(JSON.stringify(_.mapValues(bodies,(body)=>_.sum(body, (p)=>BODYPART_COST[p]))));
        });
    });
});
