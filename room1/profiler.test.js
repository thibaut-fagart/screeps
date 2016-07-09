var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;


require('../lib/mocks/gameStateGlobals')();

var role  = require('./role.spawn');


describe ('Profiler',function() {
    "use strict";
    describe('profiling my functions', function () {
        it('barebones test', function () {
            var cpu = 0;
            global.Memory ={};
            Game.getUsedCpu = function () {
                return Game.cpu.getUsed();
            };
            Game.cpu = {
                getUsed:function() {
                    return cpu++;
                }
            }
            Game.getObjectById = function () {
                console.log('getObjectById');
            };
            Game.time = 1;
            var profiler = require('./screeps-profiler');
            profiler.enable();
            var run = function () {
                profiler.wrap(function () {
                    Game.getObjectById('test');
                });
            };
            run();
            Game.profiler.profile(1);
            run();
            Game.time ++;
            run();

        });
        it('util functions test', function () {
            var cpu = 0;
            global.Memory ={};
            Game.getUsedCpu = function () {
                return Game.cpu.getUsed();
            };
            Game.cpu = {
                getUsed:function() {
                    return cpu++;
                }
            };
            Game.getObjectById = function () {
                console.log('getObjectById');
            };
            Game.time = 1;
            var profiler = require('./screeps-profiler');
            var util = require('./util');
            profiler.enable();
            var run = function () {
                profiler.wrap(function () {
                    util.objectFromMemory({}, 'test');
                });
            };
            run();
            Game.profiler.profile(1);
            run();
            Game.time ++;
            run();

        });
        it('class functions test', function () {
            var cpu = 0;
            global.Memory ={};
            Game.getUsedCpu = function () {
                return Game.cpu.getUsed();
            };
            Game.cpu = {
                getUsed:function() {
                    return cpu++;
                }
            };
            var RoleRemoteBuilder = require('./role.builder.remote');
            var role = new RoleRemoteBuilder();
            Game.getObjectById = function () {
                console.log('getObjectById');
            };
            let creep = new Creep();
            creep.memory = {};
            creep.log = console.log;
            creep.room = {name: 'room', memory:{removebuild:'otherroom'}};
            creep.room.find = function() {return [];};
            creep.carry = {energy: 0};
            creep.carryCapacity = 100;
            creep.getActiveBodyparts = function() {return 1;};
            Game.time = 1;
            var profiler = require('./screeps-profiler');
            var util = require('./util');
            profiler.enable();
            var run = function () {
                profiler.wrap(function () {
                    role.run(creep);
                });
            };
            run();
            Game.profiler.profile(1);
            run();
            Game.time ++;
            run();

        });
    });
})

