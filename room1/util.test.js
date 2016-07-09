var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;
// var it = require('mocha')({ui:'tdd'});
require('../lib/mocks/gameStateGlobals')();

var util = require('./util');

describe('util', function () {
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
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById=(id)=>{return true;};
            util.reserve(creep, subject, 'r');
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);

        });
        it('objects locked by others should return true', function () {
            "use strict";

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById=(id)=>{return true;};
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
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById=(id)=>{return false;};
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);

        });
    }) ;
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
            room.memory = {};
            let subject = {id: 'o'};
            util.reserve(creep, subject, 'r');
            Game.getObjectById=(id)=>{return true;};
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
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById=(id)=>{return true;};
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
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById=(id)=>{return true;};
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
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById=(id)=>{return false;};
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            // expect(JSON.parse(childString), 'root save').to.deep.equal(child);

        });
    });
});
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
