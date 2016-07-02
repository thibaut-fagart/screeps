var roleHarvester = require('./role.harvester');
global.RoleCarry = require('./role.carry');
var roleCarry = new RoleCarry();
var roleUpgrader = require('./role.upgrader');
var roleSpawn = require('./role.spawn');
var RoleTower = require('./role.tower');
global.RoleBuilder = require('./role.builder');
var roleBuilder = new RoleBuilder();
var roleTower = new RoleTower(); 
var roleRepair = require('./role.repair');
var roleRepair2 = require('./role.repair2');
var RoleRemoteHarvester = require('./role.remote_harvester'), roleRemoteHarvester = new RoleRemoteHarvester();
var RoleGuard = require('./role.soldier.roomguard'); roleRemoteGuard = new RoleGuard();
roleCloseGuard = new RoleGuard();
var profiler = require('./screeps-profiler');

// This line monkey patches the global prototypes.
profiler.enable();
Creep.prototype.log= function() {
    console.log([this.name , this.memory.role ].concat(Array.prototype.slice.call(arguments)));
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
// RoomObject.prototype.creeps = [];
module.exports.loop = function () {
    profiler.wrap(function () {
        Memory.stats = {};
        let messages = [];
        let oldSeenTick = Game.time || (Memory.counters && Memory.counters.seenTick);
        Memory.counters = {tick:Game.time, seenTick: oldSeenTick+1};
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            let structuresMemory = room.memory.structures;
            if (structuresMemory) {
                for (var id in structuresMemory) {
                    if (!Game.getObjectById(id)) {
                        delete room.memory.structures.id;
                    }
                }
            }

            // room.prototype.sourceConsumers = {};
            var creeps = room.find(FIND_MY_CREEPS);
            // room.creeps = creeps;
            creeps.forEach(function (creep) {
                    if (creep.memory.role == 'harvester') {
                        roleHarvester.run(creep);
                    } else if (creep.memory.role == 'carry') {
                        roleCarry.run(creep);
                    } else if (creep.memory.role == 'upgrader') {
                        roleUpgrader.run(creep);
                    } else if (creep.memory.role == 'repair') {
                        roleRepair.run(creep);
                    } else if (creep.memory.role == 'repair2') {
                        roleRepair2.run(creep);
                    } else if (creep.memory.role == 'builder') {
                        roleBuilder.run(creep);
                    } else if (creep.memory.role == 'remoteHarvester') {
                        roleRemoteHarvester.run(creep);
                    } else if (creep.memory.role == 'roleRemoteGuard' || creep.memory.role == 'roleCloseGuard') {
                        roleRemoteGuard.run(creep);
                    }
            });

            room.find(FIND_MY_STRUCTURES, {filter: (s) => s instanceof StructureTower}).forEach((tower)=>{ roleTower.run(tower);});
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
            Memory.stats["room." + room.name + ".energyAvailable"] = room.energyAvailable;
            Memory.stats["room." + room.name + ".energyCapacityAvailable"] = room.energyCapacityAvailable;
            Memory.stats["room." + room.name + ".energyInSources"] = _.sum(_.map(room.find(FIND_SOURCES_ACTIVE), (s)=> s.energy));
            Memory.stats["room." + room.name + ".energyInStructures"] = _.sum(_.map(room.find(FIND_MY_STRUCTURES), (s)=> s.store?s.store.energy :0));
            Memory.stats["room." + room.name + ".energyDropped"] = _.sum(_.map(room.find(FIND_DROPPED_RESOURCES , {filter: (r) => r.resourceType == RESOURCE_ENERGY}),(s)=> s.amount));

            let strangers = room.find(FIND_HOSTILE_CREEPS);
            let hostiles = _.filter(strangers,(c)=>{_.sum(c.body, (p)=>p == ATTACK|| p==RANGED_ATTACK)})
//            {"pos":{"x":11,"y":28,"roomName":"E37S14"},"body":[{"type":"work","hits":100},{"type":"carry","hits":100},{"type":"move","hits":100},{"type":"carry","hits":100},{"type":"work","hits":100},{"type":"move","hits":100},{"type":"move","hits":100},{"type":"work","hits":100},{"type":"carry","hits":100},{"type":"move","hits":100},{"type":"carry","hits":100},{"type":"work","hits":100},{"type":"move","hits":100},{"type":"move","hits":100}],"owner":{"username":"Finndibaen"}"hits":1400,"hitsMax":1400}

            if (hostiles.length>0) {
                messages.push(' strangers ' + JSON.stringify(_.map(hostiles, (h) => {
                        let subset = _.pick(h, ['name', 'pos', 'body', 'owner', 'hits', 'hitsMax']);
                        subset.body = _.countBy(subset.body, 'type');
                        return subset;
                    })));
            }
            Memory.stats["room." + room.name + ".strangers"] = _.size(strangers);
            Memory.stats["room." + room.name + ".hostiles"] = _.size(hostiles);
            if (room.controller && room.controller.my) {
                Memory.stats["room." + room.name + ".controllerProgress"] = room.controller.progress;
            }
            let creepCount = _.countBy(room.find(FIND_MY_CREEPS), (c)=>c.memory.role);
            _.pairs(creepCount).forEach((kv)=>{ Memory.stats["room." + room.name + ".creeps."+kv[0]] = kv[1];});
        }
        Memory.stats["cpu"] = Game.cpu.getUsed();
        if (messages.length > 0) {
            Game.notify(messages);
        }
        // counting walkable tiles neer location:
        //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
    });
}