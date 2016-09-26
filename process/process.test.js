var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;
// var it = require('mocha')({ui:'tdd'});

var Process = require('./process');
var ProcessRoom = require('./process.OwnedRoom.js');
var ProcessHarvest = require('./process.Harvest.js');


describe('process', function () {
    describe('load', function () {
        it('should load the process as they were saved', function () {
            "use strict";
            let root = new Process();
            let child = new ProcessRoom(root, {roomName:'room1'});
            let child2 = new ProcessHarvest(root, 1);
            root.type = root.constructor.name;
            child.type = child.constructor.name;
            child2.type = child2.constructor.name;
            let rootString = JSON.stringify(root);
            let childString = JSON.stringify(child);

            expect(JSON.parse(rootString), 'root save').to.deep.equal(root);
            expect(JSON.parse(childString), 'root save').to.deep.equal(child);

        });
        it('should be able to find parent process', function () {
            "use strict";
            let processTable = new (require('./process.table'))();
            let root = processTable.register(new Process());

            let child = processTable.register(new ProcessRoom(root.id,{roomName:'room1'}));
            expect(processTable.get(child.parentid)).to.be.equal(root);

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
