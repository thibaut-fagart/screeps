var _ = require('lodash');
var  util = require('./util');

var ProcessTable = require('./process.table');
var Kernel = require('./process.kernel');
var RoomProcess = require('./process.room');

var profiler = require('./screeps-profiler');
profiler.enable();
Creep.prototype.log= function() {
    console.log([this.name , this.pos, this.memory.role ].concat(Array.prototype.slice.call(arguments)));
};
Spawn.prototype.log= function() {
    console.log([this.name , this.room.name ].concat(Array.prototype.slice.call(arguments)));
};
Room.prototype.log = function() {
    console.log([this.name , this.controller.level].concat(Array.prototype.slice.call(arguments)));
};
Structure.prototype.log = function() {
    console.log([this.structureType, this.id].concat(Array.prototype.slice.call(arguments)));
};
Structure.prototype.memory = function() {
    "use strict";
    let mem = this.room.memory.structures;
    if (! mem) {
        mem = this.room.memory.structures = {};
    }
    if (! mem.id) {
        return mem.id = {}
    } else {
        return mem.id;
    }

};
function boot() {
    "use strict";
    let processTable = new ProcessTable();
    let home = Game.spawns.Spawn1.room;

    let kernel = new Kernel();
    processTable.register(kernel);
    let roomProcess = new RoomProcess(kernel,1);
    roomProcess.roomName = _.keys(Game.rooms)[0];
    processTable.register(roomProcess);
    return processTable;
}
// RoomObject.prototype.creeps = [];
module.exports.loop = function () {
    // profiler.wrap(function () {
let processTable;
    if (!Memory.processes) {
        processTable= boot();
    } else {
        processTable = new ProcessTable();
        processTable.load(Memory.processes);
    }
    processTable.forEach((p)=>p.run());
        // counting walkable tiles neer location:
        //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
    // });
};