var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleSpawn = require('role.spawn');
var roleBuilder = require('role.builder');
var roleRepair = require('role.repair');
var profiler = require('screeps-profiler');

// This line monkey patches the global prototypes.
profiler.enable();
Source.prototype.consumers= 0;
RoomObject.prototype.creeps = [];
module.exports.loop = function () {
    profiler.wrap(function () {
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            // room.prototype.sourceConsumers = {};
            var creeps = room.find(FIND_MY_CREEPS);
            room.creeps = creeps;
            creeps.forEach(function (creep) {
                // var creep = roomCreeps[i];
                if (creep.memory.role == 'harvester') {
                    roleHarvester.run(creep);
                } else if (creep.memory.role == 'upgrader') {
                    roleUpgrader.run(creep);
                } else if (creep.memory.role == 'repair') {
                    roleRepair.run(creep);
                } else if (creep.memory.role == 'builder') {
                    roleBuilder.run(creep);
                }
            });
            room.find(FIND_MY_SPAWNS).forEach(function (spawn) {
                roleSpawn.run(spawn);
            });
            if (roleRepair.underRepair) {
                if (!room.memory.needRepairAmount) {
                    room.memory.needRepairAmount = 0
                }
                var deltaRepair = room.memory.needRepairAmount - roleRepair.needRepairAmount;
                room.memory.needRepairAmount = roleRepair.needRepairAmount;
                if (deltaRepair!=0) {
                    console.log('' + roleRepair.needRepairs.length + ' waiting for repairs, delta ' + deltaRepair + ',total needed ' + roleRepair.needRepairAmount);
                }
            }
        }
        // counting walkable tiles neer location:
        //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
    });
}