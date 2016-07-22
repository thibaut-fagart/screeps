var _ = require('lodash');
var util = require('./util');
var RoleHarvester = require('./role.harvester'), roleHarvester = new RoleHarvester();
var RoleMineralHarvester = require('./role.harvester.mineral'), roleMineralHarvester = new RoleMineralHarvester();
var RoleCarry = require('./role.carry'), roleCarry = new RoleCarry();
var RoleEnergyFiller = require('./role.energyfiller'), roleEnergyFiller = new RoleEnergyFiller();
var RoleEnergyGatherer = require('./role.energygatherer'), roleEnergyGatherer = new RoleEnergyGatherer();
var RoleMineralGatherer = require('./role.mineralgatherer'), roleMineralGatherer = new RoleMineralGatherer();
var RoleRemoteCarry = require('./role.remote.carry'), roleRemoteCarry = new RoleRemoteCarry();
var RoleUpgrader = require('./role.upgrader'), roleUpgrader = new RoleUpgrader();
var roleSpawn = require('./role.spawn');
var RoleTower = require('./role.tower'), roleTower = new RoleTower();
var RoleBuilder = require('./role.builder'), roleBuilder = new RoleBuilder();
var roleRepair = require('./role.repair');
var RoleRepair2 = require('./role.repair2'), roleRepair2 = new RoleRepair2();
var RoleClaim = require('./role.controller.claim'), roleClaim = new RoleClaim();
var RoleReserve = require('./role.controller.reserve'), roleReserve = new RoleReserve();
var RoleRemoteHarvester = require('./role.remote_harvester'), roleRemoteHarvester = new RoleRemoteHarvester();
var RoleGuard = require('./role.soldier.roomguard'), roleRemoteGuard = new RoleGuard(), roleCloseGuard = new RoleGuard();
var RoleScout = require('./role.scout'), roleScout = new RoleScout();
var RoleAttacker = require('./role.soldier.attacker'), roleAttacker = new RoleAttacker();
var RoleRemoteBuilder = require('./role.builder.remote'), roleRemoteBuilder = new RoleRemoteBuilder();
var RoleRecycle = require('./role.recycle'), roleRecycle = new RoleRecycle();
var RoleRemoteHarvesterKeeper = require('./role.remote_harvester.keeper'), roleKeeperHarvester = new RoleRemoteHarvesterKeeper();
var RoleKeeperGuard = require('./role.soldier.keeperguard'), roleKeeperGuard = new RoleKeeperGuard();
var RoleLabOperator = require('./role.lab_operator'), roleLabOperator = new RoleLabOperator();
var RoleRemoteCarryKeeper = require('./role.remote.carrykeeper'), roleRemoteCarryKeeper = new RoleRemoteCarryKeeper();


var profiler = require('./screeps-profiler');
// var RoomManager = require('./manager.room'), roomManager = new RoomManager(); // todo manager
// This line monkey patches the global prototypes.
// profiler.enable();
var debugRoles = ['labOperator'];
// var debugRooms = ['E36S14'];
// var debugCreeps = ['Xavier' ];
Creep.prototype.log = function () {
    if ((!debugRoles.length || (debugRoles.indexOf(this.memory.role) >= 0))) {
    // if ((!debugRooms.length || (debugRooms.indexOf(this.room.name) >= 0))) {
    // if ((!debugCreeps.length || (debugCreeps.indexOf(this.name) >= 0))) {
        console.log([this.name, this.pos, this.memory.role].concat(Array.prototype.slice.call(arguments)));
    }
};
Spawn.prototype.log = function () {
    console.log([this.name, this.room.name].concat(Array.prototype.slice.call(arguments)));
};
Room.prototype.log = function () {
    console.log([this.name, this.controller.level].concat(Array.prototype.slice.call(arguments)));
};
/*
Room.prototype._find = Room.prototype.find;
Room.prototype.find = function (type, opts) {
    "use strict";
    if (opts) {
        return this._find(type, opts);
    } else {
        this.cache = (this.cache && this.cache.time === Game.time)? this.cache: {time:Game.time};
        if (this.cache[type]) {
            return this.cache[type];
        } else {
            let find = this._find(type, opts);
            this.cache[type] = find;
            return find;
        }
        
    }
};
*/
Structure.prototype.log = function () {
    console.log([this.structureType, this.room.name, this.id].concat(Array.prototype.slice.call(arguments)));
};
Structure.prototype.memory = function () {
    "use strict";
    let mem = this.room.memory.structures;
    if (!mem) {
        mem = this.room.memory.structures = {};
    }
    if (!mem.id) {
        return mem.id = {};
    } else {
        return mem.id;
    }

};
Room.prototype.findLabWith= function(resource) {
    let pairs = _.pairs(this.memory.labs);
    // creep.log('pairs', JSON.stringify(pairs));
    let find = pairs.find((pair)=>pair[1] === resource);
    // creep.log('match', JSON.stringify(find));
    let labid = find[0];
    // creep.log('match', labid);
    return Game.getObjectById(labid);

};
Room.prototype.expectedMineralType= function(lab) {
    return (this.memory.labs || [])[lab.id];
};
var handleLabs = function (room) {
    _.keys(room.memory.labs).forEach((labid)=> {
        let lab = Game.getObjectById(labid);
        if (!lab.cooldown) {
            // creep.log('testing ', labid);
            let reaction = room.expectedMineralType(lab);
            // creep.log('using ', reaction);
            if (reaction) {
                let ingredients = RoleLabOperator.reactions [reaction];
                // creep.log('searching labs with ingredients', ingredients, !!ingredients);

                if (ingredients) {
                    let sourceLabs = ingredients.map((i)=>room.findLabWith(i));
                    // console.log('running with ', JSON.stringify(sourceLabs.map((lab)=>lab.id)));
                    let result = lab.runReaction(sourceLabs[0], sourceLabs[1]);
                    // console.log('run?', lab.mineralType, result);
                }
            }

        }
    })
};
function innerLoop() {
    let messages = [];
    let globalStart = Game.cpu.getUsed();
    let oldSeenTick = Game.time || (Memory.counters && Memory.counters.seenTick);
    Memory.counters = {tick: Game.time, seenTick: oldSeenTick + 1};
    _.keys(Memory.stats).forEach((k) => {
        if (!/^counter\./.exec(k)) Memory.stats[k] = 0;
    });
    if (0 == Game.time % 100) {
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }
    let handlers = {
        'harvester': roleHarvester,
        'mineralHarvester': roleMineralHarvester,
        'keeperGuard': roleKeeperGuard,
        'remoteCarryKeeper': roleRemoteCarryKeeper,
        'recycle': roleRecycle,
        'claimer': roleClaim,
        'carry': roleCarry,
        'keeperHarvester': roleKeeperHarvester,
        'energyFiller': roleEnergyFiller,
        'energyGatherer': roleEnergyGatherer,
        'mineralGatherer': roleMineralGatherer,
        'remoteCarry': roleRemoteCarry,
        'upgrader': roleUpgrader,
        'repair': roleRepair,
        'repair2': roleRepair2,
        'reserver': roleReserve,
        'builder': roleBuilder,
        'scout': roleScout,
        'remoteBuilder': roleRemoteBuilder,
        'attacker': roleAttacker,
        'remoteHarvester': roleRemoteHarvester,
        'roleRemoteGuard': roleRemoteGuard,
        'roleCloseGuard': roleRemoteGuard,
        'roleSoldier': roleRemoteGuard,
        'labOperator': roleLabOperator,
    };
    let cpu = {};
    _.keys(handlers).forEach((k)=>cpu[k] = 0);
    for (var roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        if (!room.memory.harvestContainers) {
            room.memory.harvestContainers = [];
        }
        if (!(Game.time %10) && room.memory.labs) {
            // creep.log('running reactions');
            handleLabs(room);
        }

        if (0 == Game.time % 100) {
            let locks = _.pairs(room.memory.reserved);
            locks.forEach((p)=> {
                if (!_.isString(p[1])) {
                    _.pairs(p[1]).forEach((q)=> {
                        "use strict";
                        if (!Game.getObjectById(q[1])) {
                            delete room.memory.reserved[q[0]]
                        }

                    });
                } else if (!Game.getObjectById(p[1])) {
                    delete room.memory.reserved[p[0]]
                }
            });
        }
        if (room.controller && room.controller.level >= 3) {
            let towerFilter = {filter: {structureType: STRUCTURE_TOWER}};
            if (room.find(FIND_MY_STRUCTURES, towerFilter) == 0 && room.find(FIND_MY_CONSTRUCTION_SITES, towerFilter)) {
                let avoid = room.find(FIND_STRUCTURES, (s)=> [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER]);
                avoid.push(room.controller);
                avoid = _.map(avoid, (s) => {
                    return {pos: s.pos, range: 3}
                });
                room.createConstructionSite(avoid[avoid.length], STRUCTURE_TOWER);
            }
        }
        let structuresMemory = room.memory.structures;
        if (structuresMemory) {
            for (var id in structuresMemory) {
                if (!Game.getObjectById(id)) {
                    delete room.memory.structures.id;
                }
            }
        }
        // roomManager.run(room); // todo manager
        delete roleRepair2.needRepairs;
        delete roleRepair.needRepairs;
        delete roleRepair2.needRepairAmount;
        delete roleRepair.needRepairAmount;
        // room.prototype.sourceConsumers = {};
        var creeps = room.find(FIND_MY_CREEPS);
        // room.creeps = creeps;
        creeps.forEach(function (creep) {
            try {
                if (creep.spawning) {

                } else {
                    let start = Game.cpu.getUsed();
                    let handler =handlers[creep.memory.role];
                    if (handler) handler.run(creep);
                    else {creep.log('!!!!!!no handler !! ');}
                    
                    let end = Game.cpu.getUsed();
                    cpu[creep.memory.role] += (end - start);
                }
            } catch (e) {
                console.log(e.stack);
                Game.notify(e.stack);
            }
        });

        room.find(FIND_MY_STRUCTURES, {filter: (s) => s instanceof StructureTower}).forEach((tower)=> {
            roleTower.run(tower);
        });
        room.find(FIND_MY_SPAWNS).forEach(function (spawn) {
            roleSpawn.run(spawn);
        });
        if (roleRepair.underRepair) {
            if (!room.memory.needRepairAmount) {
                room.memory.needRepairAmount = 0;
            }
            var deltaRepair = room.memory.needRepairAmount - roleRepair.needRepairAmount;
            room.memory.needRepairAmount = roleRepair.needRepairAmount;
            /*
             if (deltaRepair!=0) {
             console.log('' + roleRepair.needRepairs.length + ' waiting for repairs, delta ' + deltaRepair + ',total needed ' + roleRepair.needRepairAmount);
             }
             */
        }
        /*
         if (!(Game.time % 100)) {
         for (let id in room.memory.reserved) {
         if (!Game.getObjectById(id)) {
         delete room.memory.reserved[id];
         }
         }
         }
         */
        if (!(Game.time % 10)) {
            Memory.stats = {};
            let repairsNeededByStrcutureArray = _.map(_.pairs(_.groupBy(room.find(FIND_STRUCTURES), (s)=>s.structureType)), (array)=>[array[0], _.sum(array[1], (s)=>s.hitsMax - s.hits)])
            repairsNeededByStrcutureArray.forEach((pair)=> {
                Memory.stats["room." + room.name + ".repairs2." + pair[0] + "K"] = pair[1];
            });
        }
        Memory.stats["room." + room.name + ".reservedCount"] = _.size(room.memory.reserved);
        Memory.stats["room." + room.name + ".energyAvailable"] = room.energyAvailable;
        Memory.stats["room." + room.name + ".energyCapacityAvailable"] = room.energyCapacityAvailable;
        Memory.stats["room." + room.name + ".energyInSources"] = _.sum(_.map(room.find(FIND_SOURCES_ACTIVE), (s)=> s.energy));
        Memory.stats["room." + room.name + ".energyInStructures"] = _.sum(_.map(room.find(FIND_MY_STRUCTURES), (s)=> s.store ? s.store.energy : 0));
        Memory.stats["room." + room.name + ".energyDropped"] = _.sum(_.map(room.find(FIND_DROPPED_RESOURCES, {filter: (r) => r.resourceType == RESOURCE_ENERGY}), (s)=> s.amount));
        Memory.stats["room." + room.name + ".spawns.idle"] = _.sum(room.find(FIND_MY_SPAWNS),(s)=>s.memory.idle);
        Memory.stats["room." + room.name + ".spawns.waitFull"] = _.sum(room.find(FIND_MY_SPAWNS),(s)=>s.memory.waitFull);

        let strangers = room.find(FIND_HOSTILE_CREEPS);
        let hostiles = _.filter(strangers, (c)=>_.sum(c.body, (p)=>p == ATTACK || p == RANGED_ATTACK) > 0);
        //            {"pos":{"x":11,"y":28,"roomName":"E37S14"},"body":[{"type":"work","hits":100},{"type":"carry","hits":100},{"type":"move","hits":100},{"type":"carry","hits":100},{"type":"work","hits":100},{"type":"move","hits":100},{"type":"move","hits":100},{"type":"work","hits":100},{"type":"carry","hits":100},{"type":"move","hits":100},{"type":"carry","hits":100},{"type":"work","hits":100},{"type":"move","hits":100},{"type":"move","hits":100}],"owner":{"username":"Finndibaen"}"hits":1400,"hitsMax":1400}

        if (hostiles.length > 0) {
            messages.push(' strangers ' + JSON.stringify(_.map(hostiles, (h) => {
                    let subset = _.pick(h, ['name', 'pos', 'body', 'owner', 'hits', 'hitsMax']);
                    subset.body = _.countBy(subset.body, 'type');
                    return subset;
                })));
        }
        Memory.stats["room." + room.name + ".strangers"] = _.size(strangers);
        Memory.stats["room." + room.name + ".hostiles"] = _.size(hostiles);
        if (room.controller && room.controller.my) {
            Memory.stats["room." + room.name + ".controller.progress"] = room.controller.progress;
            Memory.stats["room." + room.name + ".controller.ProgressRatio"] = 100 * room.controller.progress / room.controller.progressTotal;
        }
        let roster = util.roster(room);
        _.keys(handlers).forEach((k)=> Memory.stats["room." + room.name + ".creeps." + k] = roster[k]||0);
    }
    _.keys(cpu).forEach((k)=> {
        Memory.stats["cpu_." + k] = cpu[k];
    });
    Memory.stats["cpu_bucket"] = Game.cpu.bucket;
    if (messages.length > 0) {
        Game.notify(messages);
    }
    Memory.stats["cpu_.main"] = Game.cpu.getUsed()-_.sum(cpu);
    Memory.stats["cpu"] = Game.cpu.getUsed();
    Memory.stats["gcl.progress"] = Game.gcl.progress;
    Memory.stats["gcl.progressTotal"] = Game.gcl.progressTotal;
    // counting walkable tiles neer location:
    //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
}

// RoomObject.prototype.creeps = [];
module.exports.loop = function () {
    innerLoop();
    // profiler.wrap(innerLoop);
};