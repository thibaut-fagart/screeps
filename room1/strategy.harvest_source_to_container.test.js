var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;


require('../lib/mocks/gameStateGlobals')();
var Creep = require('../ScreepsAutocomplete/Creep');
var Room = require('../ScreepsAutocomplete/Room');
var RoomPosition = require('../ScreepsAutocomplete/RoomPosition');
var Source = require('../ScreepsAutocomplete/Source');
var Container = require('../ScreepsAutocomplete/Structures/StructureContainer');

var role = require('./role.spawn');
var util = require('./util');


describe('Profiler', function () {
    'use strict';
    describe('profiling my functions', function () {
        it('barebones test', function () {
            let HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
            global.Game ={};
            global.Game.getObjectById = (id)=>Game[id];
            let createCreep = (id, room) => {
                let c = new Creep();
                Game[id] = c;
                c.id = id;
                c.memory = {};
                c.room = room;
                return c;
            };
            Creep.prototype.log = function () {
                console.log([this.id].concat(Array.prototype.slice.call(arguments)));
            };
            let room = new Room();
            let h1 = createCreep('h1', room);
            let h2 = createCreep('h2', room);
            let h3 = createCreep('h3', room);

            room.memory = {};


            let c1 = new Container(), c2 = new Container();
            let s1 = new Source(), s2 = new Source();
            c1.id = 'c1';
            c2.id = 'c2';
            s1.id= 's1';
            s2.id = 's2';
            Game[c1.id] = c1;
            Game[c2.id] = c2;
            Game[s1.id] = s1;
            Game[s2.id] = s2;
            s1.pos = new RoomPosition();
            s1.pos.findInRange = (type, range)=> {
                if (type === FIND_STRUCTURES) {
                    return [c1];
                }
            };
            s2.pos = new RoomPosition();
            s2.pos.findInRange = (type, range)=> {
                if (type === FIND_STRUCTURES) {
                    return [c2];
                }
            };
            let sources = [s1, s2];
            h2.room.find = h1.room.find = (type, options) => {
                if (type=== FIND_SOURCES) {
                    return sources;
                } else if (type === FIND_STRUCTURES) {
                    return [c1, c2];
                }
            };
            h1.pos.findClosestByRange = (type) => s1;
            h1.pos.getRangeTo= (s)=> 1;

            console.log(!!util.isReserved(h1, c1, 'harvest'));
            console.log(!!util.isReserved(h1, c2, 'harvest'));
            // console.log(util.isReserved(h2, c1, 'harvest'));
            // console.log(util.isReserved(h2, c2, 'harvest'));
            let strategy = new HarvestEnergySourceToContainerStrategy();
            let ret = strategy.findSourceAndContainer(h1);
            console.log(h1.id,h1);
            console.log('ret', ret);
            console.log(JSON.stringify(h1.room.memory));
            ret = strategy.findSourceAndContainer(h2);
            console.log('ret', ret);
            console.log(h2.id, h2);
            console.log(JSON.stringify(h1.room.memory));
            delete Game[h1.id];
            console.log('h1 dies');
            
            ret = strategy.findSourceAndContainer(h3);
            console.log('ret', ret);
            console.log(h3.id, h3);
            console.log(JSON.stringify(h3.room.memory));

        })
    })
})

