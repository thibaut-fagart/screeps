var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;

var Process = require('./process');
var ProcessRoom = require('./process.OwnedRoom.js');
var ProcessHarvest = require('./process.Harvest.js');


let root = new Process();
let child = new ProcessRoom(root);
let child2 = new ProcessHarvest(root, 1);


console.log(root);
console.log(child);
console.log(child2);

expect()

// var bs =  Game.rooms.E38S14.find(FIND_MY_CREEPS, {filter:(c) => c.memory.role  ==='remoteBuilder'}); while (bs.length > 1) { bs.shift().memory.role = 'upgrader'}

console.log(/repairs2/.exec('test.repairs2.toto'))
console.log(/repairs2/.exec('test.repairs.toto'))

