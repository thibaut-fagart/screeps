var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;


require('../lib/mocks/gameStateGlobals')();

var CreepShaper = require('./base.creep.shaper');
let patterns = require('./base.creep.patterns');
_.keys(patterns).forEach((name)=> {
    let spec = patterns[name];
    if (!_.isFunction(spec.body)) {
        delete patterns[name]
    }
});

describe('CreepShaper', function () {
    "use strict";
    describe('shapeBody', function () {
        function shaperOptions(room, role, budget) {
            'use strict';
            room.memory.creepShaper = room.memory.creepShaper || {};
            return {
                budget: budget ? budget : room.energyCapacityAvailable,
                cache: budget ? {} : room.memory.creepShaper,
                name: role,
                availableBoosts: room.allowedBoosts(role)
            };
        }
        it('', function () {
            let shaper = CreepShaper;
            let requirements = shaper.requirements();
            requirements.minimum('fullPlainSpeed', 1);
            requirements.minimum(HEAL, 50);
            requirements.maximize(ATTACK);
            let body = shaper.shape(requirements, {budget: 2250});
            let bodyMakeup = _.countBy(body);
            console.log(JSON.stringify(bodyMakeup));
            expect(bodyMakeup[HEAL]).to.be.equal(5);
            expect(bodyMakeup[ATTACK]).to.be.equal(5);
        });
        it('carry', function () {
            let shaper = CreepShaper;
            let body = shaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY), {budget: 5000});
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('remoteCarryRoad', function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>[/*'ZO'*/];
            room.controller = {level: 5};
            room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[room.controller.level] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level] + SPAWN_ENERGY_CAPACITY;
            let body = CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(REPAIR,1).maximize(CAPACITY), shaperOptions(room, 'remoteCarry'));
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('remoteCarryPlain', function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>[/*'ZO'*/];
            room.controller = {level: 5};
            room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[room.controller.level] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level] + SPAWN_ENERGY_CAPACITY;
            let body = CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).minimum(REPAIR,1).maximize(CAPACITY), shaperOptions(room, 'remoteCarry'));
            console.log(JSON.stringify(_.countBy(body)));
        });
        it('base minerals in boosts', function () {
            let body = CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY), {budget: 5000, allowedBoosts: ['O', 'H']});
            console.log(JSON.stringify(_.countBy(body)));
        });
        it ('RCL5 keeper Guard',function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>[/*'ZO'*/];
            room.controller = {level: 5};
            room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[room.controller.level] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level] + SPAWN_ENERGY_CAPACITY;
            let body = patterns['keeperGuard'].body(room);
            console.log(room.energyCapacityAvailable, JSON.stringify(_.countBy(body)));
        });
        it('RCLs with boosts', function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>['KO','LO'];
            room.glanceForAround = ()=> [];
            for (let rcl = 1; rcl <= 8; rcl++) {
                room.controller = {level: rcl};
                console.log('RCL ', rcl);
                room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[rcl] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl] + SPAWN_ENERGY_CAPACITY;

                let bodies = _.mapValues(patterns, (spec)=> {
                    if (_.isFunction(spec.body)) {
                        return spec.body(room);
                    } else {
                        return spec.body;
                    }
                });
                console.log(JSON.stringify(_.mapValues(bodies, (body)=>({
                    body: _.countBy(body),
                    cost: _.sum(body, (p)=>BODYPART_COST[p])
                }))));
            }
        });
        it('carry with RCL 5', function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>[];
            room.glanceForAround = ()=> [];
            room.find = ()=>1;
            room.name = 'W55S43';
            room.controller = {level: 3};
            console.log('RCL ', room.controller.level);
            room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[room.controller.level] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level] + SPAWN_ENERGY_CAPACITY;
            room.find = (find)=> {
                if (FIND_MINERALS === find) {
                    return [{mineralAmount: 0}];
                } else if (FIND_SOURCES === find) {
                    return [];
                }
            };
            let body = ((spec)=> {
                if (_.isFunction(spec.body)) {
                    return spec.body(room);
                } else {
                    return spec.body;
                }
            })(patterns['carry']);
            console.log(JSON.stringify(_.mapValues([body], (body)=>({
                body: _.countBy(body),
                cost: _.sum(body, (p)=>BODYPART_COST[p])
            }))));

        });
        it('upgrader RCL8', function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>[];
            room.glanceForAround = ()=> [{structure:{structureType:STRUCTURE_CONTAINER}}];
            room.find = ()=>1;
            room.name = 'W55S43';
            room.controller = {level:8};
            console.log('RCL ', room.controller.level);
            room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[room.controller.level] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level] + SPAWN_ENERGY_CAPACITY;
            room.find = (find)=> {
                if (FIND_MINERALS === find) {
                    return [{mineralAmount: 0}];
                } else if (FIND_SOURCES === find) {
                    return [];
                }
            };
            let body = ((spec)=> {
                if (_.isFunction(spec.body)) {
                    return spec.body(room);
                } else {
                    return spec.body;
                }
            })(patterns['upgrader']);
            console.log(JSON.stringify(_.mapValues([body], (body)=>({
                body: _.countBy(body),
                cost: _.sum(body, (p)=>BODYPART_COST[p])
            }))));

        });
        it('RCLs', function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>[];
            room.glanceForAround = ()=> [];
            room.find = ()=>1;
            room.name = 'W55S43';
            for (let rcl = 1; rcl <= 8; rcl++) {
                room.controller = {level: rcl};
                console.log('RCL ', rcl);
                room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[rcl] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl] + SPAWN_ENERGY_CAPACITY;
                room.find = (find)=> {
                    if (FIND_MINERALS === find) {
                        return [{mineralAmount: 0}];
                    } else if (FIND_SOURCES ===find) {
                        return  [];
                    }
                };
                let bodies = _.mapValues(patterns, (spec)=> {
                    if (_.isFunction(spec.body)) {
                        return spec.body(room);
                    } else {
                        return spec.body;
                    }
                });
                console.log(JSON.stringify(_.mapValues(bodies, (body)=>({
                    body: _.countBy(body),
                    cost: _.sum(body, (p)=>BODYPART_COST[p])
                }))));
            }
        });
        it('RCLs with budget', function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>['ZO'];
            for (let rcl = 1; rcl <= 8; rcl++) {
                console.log('RCL ', rcl);
                room.controller = {level: rcl};
                room.glanceForAround=()=> ([{structure:{store:{}}}]);
                room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[rcl] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl] + SPAWN_ENERGY_CAPACITY;

                let bodies = _.mapValues(patterns, (spec)=> {
                    if (_.isFunction(spec.body)) {
                        return spec.body(room,400);
                    } else {
                        return spec.body;
                    }
                });
                console.log(JSON.stringify(_.mapValues(bodies, (body)=>({
                    body: _.countBy(body),
                    cost: _.sum(body, (p)=>BODYPART_COST[p])
                }))));
            }
        });
        it('defender', function () {
            let room = new Room();
            room.name = 'my';
            room.memory = {allowedBoosts: []};
            room.availableBoosts = () =>[];

            for (let rcl = 1; rcl <= 8; rcl++) {
                console.log('RCL ', rcl);
                room.energyCapacityAvailable = EXTENSION_ENERGY_CAPACITY[rcl] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl] + SPAWN_ENERGY_CAPACITY;

                let body= ((spec)=> {
                    if (_.isFunction(spec.body)) {
                        return spec.body(room);
                    } else {
                        return spec.body;
                    }
                })(patterns['defender']);
                console.log(({
                    body: body,
                    cost: _.sum(body, (p)=>BODYPART_COST[p])
                }));
            }
        });
        it('use patterns', function () {
            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 2300;
            room.controller = {level: 6};
            room.availableBoosts = ()=>([/*'UH2O', 'ZO', 'LO'*/]);
            room.glanceForAround=()=> ([{structure:{store:{}}}]);
            let bodies = _.mapValues(patterns, (spec)=> {
                console.log(spec.memory.role);
                if (_.isFunction(spec.body)) {
                    return spec.body(room);
                } else {
                    return spec.body;
                }
            });
            console.log(JSON.stringify(_.mapValues(bodies, (body)=>_.sum(body, (p)=>BODYPART_COST[p]))));
        });
        it('filtering test', function () {
            let objects = [];
            for (let i =0; i < 100000; i++) {
                objects.push({
                    type: 'someType', fun: function () {

                    }
                });
            }


            let shaper = CreepShaper;
            let room = new Room();
            room.memory = {allowedBoosts: []};
            room.energyCapacityAvailable = 2300;
            room.availableBoosts = ()=>([/*'UH2O', 'ZO', 'LO'*/]);
            room.controller = {level: 6};
            room.glanceForAround=()=> ([{structure:{store:{}}}]);
            let bodies = _.mapValues(patterns, (spec)=> {
                console.log(spec.memory.role);
                if (_.isFunction(spec.body)) {
                    return spec.body(room);
                } else {
                    return spec.body;
                }
            });
            console.log(JSON.stringify(_.mapValues(bodies, (body)=>_.sum(body, (p)=>BODYPART_COST[p]))));
        });
    });
});
