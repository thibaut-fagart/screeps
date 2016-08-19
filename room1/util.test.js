var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;
// var it = require('mocha')({ui:'tdd'});
require('../lib/mocks/gameStateGlobals')();

var util = require('./util');

describe('util', function () {
    describe('findExit', function () {
        "use strict";
        it("", function () {
            let creep = new Creep();
            let room = new Room();
            creep.room = room;
            Creep.prototype.log = function() {
                console.log.apply(console, arguments);
            }
            room.memory = {};
            room.name = 'A';
            global.Game.map = {
                findRoute: function () {
                    return [{room: 'B', exit: 'left'}, {room: 'C', exit: 'left'}];
                }
            };
            Memory.rooms={};
            Memory.rooms[creep.room.name] = creep.room.memory;
            // Memory.rooms['A']= {};
            // Memory.rooms['B']= {};
            Game.rooms['A'] = room;
            Game.rooms['B'] = new Room();
            let exit_A = new RoomPosition(0,10,'A');
            RoomPosition.prototype.findClosestByPath = function() {
                if (this.roomName === 'A') {
                    return exit_A;
                }
                else if (this.roomName === 'B') return new RoomPosition(10,0, 'B');
            };
            creep.pos = new RoomPosition(10, 10, 'A');
            let result = util.findExit(creep, 'C');
            expect(result.x).to.equal(exit_A.x);
            expect(result.y).to.equal(exit_A.y);
            expect(result.roomName).to.equal(exit_A.roomName);
        });
    });
    describe('isReserved', function () {
        it('non locked objects should return false', function () {
            "use strict";

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            room.memory = {};
            let subject = {id: 'o'};

            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);

        });
        it('objects locked by me should return false', function () {
            "use strict";

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return true;
            };
            util.reserve(creep, subject, 'r');
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);

        });
        it('objects locked by others should return true', function () {
            "use strict";

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return true;
            };
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(true);

        });
        it('objects locked by dead should return false', function () {
            "use strict";

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return false;
            };
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);

        });
    });
    describe('release', function () {
        it('released locks should  be free', function () {
            "use strict";

            let creep = new Creep();
            let creep2 = new Creep();
            creep.id = '1';
            creep2.id = '2';
            let room = new Room();
            creep.room = room;
            creep2.room = room;
            creep.memory = {};
            creep2.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            util.reserve(creep, subject, 'r');
            Game.getObjectById = (id)=> {
                return true;
            };
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            expect(util.isReserved(creep2, subject, 'r'), 'lck should be free').to.equal(true);
            util.release(creep, subject, 'r');
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            expect(util.isReserved(creep2, subject, 'r'), 'lck should be free').to.equal(false);

        });
        it('objects locked by me should return false', function () {
            "use strict";

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return true;
            };
            util.reserve(creep, subject, 'r');
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            // expect(JSON.parse(childString), 'root save').to.deep.equal(child);

        });
        it('objects locked by others should return true', function () {
            "use strict";

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return true;
            };
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(true);
            // expect(JSON.parse(childString), 'root save').to.deep.equal(child);

        });
        it('objects locked by dead should return false', function () {
            "use strict";

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return false;
            };
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            // expect(JSON.parse(childString), 'root save').to.deep.equal(child);

        });
    });
    it("should be profileable", function () {
        "use strict";
        let f = (object)=>object.prototype ? object.prototype :(Object.getPrototypeOf(object)?Object.getPrototypeOf(object):object);
        console.log(JSON.stringify(Object.keys(f(util))));
        console.log(Object.getPrototypeOf(util) == util.prototype);
        console.log(Object.getPrototypeOf(util) == util.constructor);
        console.log(Object.getPrototypeOf(util));
        console.log(JSON.stringify(Object.getOwnPropertyNames(util)));
        // console.log(JSON.stringify(Object.keys(util.prototype)));
        console.log(JSON.stringify(Object.keys(util.constructor)));
        console.log(JSON.stringify(Object.keys(Object.getPrototypeOf(util))));
        console.log(JSON.stringify(Object.getOwnPropertyNames(Object.getPrototypeOf(util))));
        // console.log(JSON.stringify(Object.getOwnPropertyNames(Object.getPrototypeOf(util))));

    });
});

describe('reactions', function() {
    "use strict";
    let constants = require('../lib/mocks/constants');
    it("should work", function () {
        function reverseReactions() {
            'use strict';
            let result = {};
            _.keys(constants.REACTIONS).forEach((min1)=> {
                let temp = constants.REACTIONS[min1];
                _.keys(temp).forEach((min2)=> {
                    result[temp[min2]] = [min1, min2];
                });
            });
            return result;
        };
        console.log(JSON.stringify(reverseReactions()));
    });

})
/*
 let ProcessTable = require('./process.table'), processTable = new  ProcessTable();


 console.log('emptytable', processTable);

 console.log(root);
 console.log(child);
 console.log(child2);

 processTable.register(root);
 processTable.register(child);
 processTable.register(child2);

 let savedData = processTable.save();
 console.log(savedData);
 let saved = JSON.parse(JSON.stringify(savedData));
 console.log('saved' ,saved);

 processTable = ProcessTable.load(saved);

 console.log('loaded',(processTable));




 // var bs =  Game.rooms.E38S14.find(FIND_MY_CREEPS, {filter:(c) => c.memory.role  ==='remoteBuilder'}); while (bs.length > 1) { bs.shift().memory.role = 'upgrader'}

 console.log(/repairs2/.exec('test.repairs2.toto'))
 console.log(/repairs2/.exec('test.repairs.toto'))

 */
