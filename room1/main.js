var _ = require('lodash');
var util = require('./util');
require('./game.prototypes.room');
var handlers = require('./base.handlers');
var roleSpawn = require('./role.spawn');

var profiler = require('./screeps-profiler');

// var RoomManager = require('./manager.room'), roomManager = new RoomManager(); // todo manager
// This line monkey patches the global prototypes.
// if (Game.cpu.bucket> 500)
profiler.enable();
var debugRoles = [];
var debugRooms = [];
var debugCreeps = [];
Creep.prototype.log = function () {
    if ((!debugRoles.length || (debugRoles.indexOf(this.memory.role) >= 0))
        && (!debugRooms.length || (debugRooms.indexOf(this.room.name) >= 0))
        && (!debugCreeps.length || (debugCreeps.indexOf(this.name) >= 0))
    ) {
        console.log([this.name, this.pos, this.memory.role].concat(Array.prototype.slice.call(arguments)));
    }
};
Spawn.prototype.log = function () {
    if ((!debugRooms.length || (debugRooms.indexOf(this.room.name) >= 0))
            && (!debugCreeps.length || (debugCreeps.indexOf(this.name) >= 0))
    ) {
        console.log([this.name, this.room.name].concat(Array.prototype.slice.call(arguments)));
    }
};
Room.prototype.log = function () {
    if ((!debugRooms.length || (debugRooms.indexOf(this.name) >= 0))) {
        console.log([this.name, this.controller ? this.controller.level : 'neutral'].concat(Array.prototype.slice.call(arguments)));
    }
};
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
var handleLabs = function (room) {
    _.keys(room.memory.labs).forEach((labid)=> {
        let lab = Game.getObjectById(labid);
        if (!lab.cooldown) {
            // creep.log('testing ', labid);
            let reaction = room.expectedMineralType(lab);
            // creep.log('using ', reaction);
            if (reaction) {
                let ingredients = handlers['labOperator'].class().reactions [reaction];
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

let roomTasks = [
    (r)=> {/*r.log('running towers');*/
        r.operateTowers();
    },
    (r)=> {/*r.log('running links');*/
        r.operateLinks();
    },
    (r)=>(r.memory.harvestContainers = r.memory.harvestContainers || []),
    (r)=> r.updateLocks(),
    (r)=> {
        if (0 == Game.time % 100) {
            r.gc();
        }
    },
    (r)=> {
        if (Game.cpu.bucket > 200) r.assessThreat();
    },

];

function innerLoop() {
    let messages = [];
    Memory.stats = Memory.stats || {};
    let globalStart = Game.cpu.getUsed();
    let oldSeenTick = Game.time || (Memory.counters && Memory.counters.seenTick);
    Memory.counters = {tick: Game.time, seenTick: oldSeenTick + 1};
    if (0 == Game.time % 100) {
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }
    let cpu = {};
    let availableCpu = Game.cpu.tickLimit;
    _.keys(handlers).forEach((k)=>cpu[k] = 0);
    let sortedRooms = _.sortBy(_.values(Game.rooms), (r)=> r.controller && r.controller.my ? r.controller.level : 10);
    let roomCpu = {};
    if (Game.cpu.tickLimit < 500) console.log('room, controller, roomTasks , creeps ,spawns , labs , stats');
    sortedRooms.forEach((room)=> {
        // for (var roomName in Game.rooms) {
        //     var room = Game.rooms[roomName];
        let roomName = room.name;
        let roomStartCpu = Game.cpu.getUsed();
        roomTasks.forEach((task)=> {
            "use strict";
            if (Game.cpu.getUsed() < availableCpu - 100) {
                try {
                    task(room);
                } catch (e) {
                    console.log(e);
                    console.log(e.stack);
                }
            }
        });
        let roomTasksCpu = Game.cpu.getUsed() ;
        cpu['roomTasks'] = (cpu['roomTasks']||0) +roomTasksCpu-roomStartCpu;
        // roomManager.run(room); // todo manager
        // room.prototype.sourceConsumers = {};
        if (Game.cpu.getUsed() < availableCpu - 100) {
            var creeps = room.find(FIND_MY_CREEPS);
            let ran = '';
            // room.creeps = creeps;
            creeps.forEach(function (creep) {
                try {
                    if (!creep.spawning) {
                        let start = Game.cpu.getUsed();
                        if (start < availableCpu - 100) {
                            ran += creep.memory.role + ',';
                            let handler = handlers[creep.memory.role];
                            if (handler) handler.run(creep);
                            else {
                                creep.log('!!!!!!no handler !! ');
                            }
                        }
                        let end = Game.cpu.getUsed();
                        cpu[creep.memory.role] = (cpu[creep.memory.role]||0)+(end - start);
                    }
                } catch (e) {
                    creep.log(e.stack);
                    Game.notify(e.stack);
                }
            });
        }
        let creepsCpu = Game.cpu.getUsed() ;
        // room.log('creepsCpu', creepsCpu);
        if (Game.cpu.getUsed() < availableCpu - 100) {
            roleSpawn.run(room);
        }
        let spawnCpu = Game.cpu.getUsed() ;
        cpu['spawns'] = (cpu['spawns']||0) +spawnCpu-creepsCpu;

        if (!(Game.time % 10) && room.memory.labs && Game.cpu.getUsed() < availableCpu - 100) {
            // creep.log('running reactions');
            handleLabs(room);
        }
        let labsCpu = Game.cpu.getUsed();
        cpu['labs'] = (cpu['labs']||0) +labsCpu-spawnCpu;

        if (Game.cpu.getUsed() < availableCpu - 100) room.updateCheapStats();
        if (Game.cpu.getUsed() < availableCpu - 100) {
            Memory.stats["room." + room.name + ".energyInStructures"] = _.sum(_.map(room.find(FIND_MY_STRUCTURES), (s)=> s.store ? s.store.energy : 0));
            Memory.stats["room." + room.name + ".energyDropped"] = _.sum(_.map(room.find(FIND_DROPPED_RESOURCES, {filter: (r) => r.resourceType == RESOURCE_ENERGY}), (s)=> s.amount));
            let regexp = new RegExp(`room.${room.name}.efficiency`);
            _.keys(Memory.stats).filter((k)=>regexp.exec(k)).forEach((k)=>delete Memory [k]);
            let roomEfficiency = Room.efficiency(roomName);
            if (roomEfficiency) {
                if (roomEfficiency.remoteMining) {
                    Memory.stats["room." + room.name + ".efficiency.remoteMining"] = _.sum(roomEfficiency.remoteMining);
                    _.keys(roomEfficiency.remoteMining).forEach((r)=>Memory.stats["room." + room.name + ".efficiency.remoteMining." + r] = roomEfficiency.remoteMining[r]);
                }
            }
            // Memory.stats["room." + room.name + ".spawns.idle"] = _.sum(room.find(FIND_MY_SPAWNS),(s)=>s.memory.idle);
            // Memory.stats["room." + room.name + ".spawns.waitFull"] = _.sum(room.find(FIND_MY_SPAWNS),(s)=>s.memory.waitFull);

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
            let roster = util.roster(room);
            _.keys(handlers).forEach((k)=> Memory.stats["room." + room.name + ".creeps." + k] = roster[k] || 0);
        }
        let statsCpu = Game.cpu.getUsed();
        // if (Game.cpu.tickLimit < 500) room.log(roomTasksCpu-roomStartCpu, creepsCpu-roomTasksCpu,spawnCpu-creepsCpu,labsCpu-spawnCpu,statsCpu-labsCpu);
        roomCpu[roomName] = Game.cpu.getUsed() - roomStartCpu;
    });
    if (Game.cpu.getUsed() < availableCpu - 100) {
        let remoteCreeps = _.groupBy(_.values(Game.creeps), (c)=>c.memory.remoteRoom);
        _.keys(handlers).forEach((role)=> {
            "use strict";
            delete Memory.stats["remoteRooms." + name + ".assigned." + role];

        });
        _.keys(remoteCreeps).forEach((name)=> {
            "use strict";
            if ('undefined' !== name) {
                let remoteRoster = _.countBy(remoteCreeps[name], (c)=>c.memory.role);
                _.keys(remoteRoster).forEach((role)=>Memory.stats["remoteRooms." + name + ".assigned." + role] = remoteRoster[role]);
            }
        });
    }
    _.keys(handlers).forEach((k)=> {
        Memory.stats["cpu.roles." + k] = cpu[k] || 0;
    });
    ['labs','spawns','roomTasks'].forEach((k)=>{ Memory.stats["cpu.roles." + k] = cpu[k] || 0;});
    _.keys(roomCpu).forEach((k)=> {
        Memory.stats["cpu.rooms." + k] = roomCpu[k] || 0;
    });
    Memory.stats["cpu_bucket"] = Game.cpu.bucket;
    if (messages.length > 0) {
        Game.notify(messages);
    }
    Memory.stats["cpu_.main"] = Game.cpu.getUsed() - _.sum(cpu);
    Memory.stats["cpu"] = Game.cpu.getUsed();
    Memory.stats["gcl.progress"] = Game.gcl.progress;
    Memory.stats["gcl.progressTotal"] = Game.gcl.progressTotal;
    // counting walkable tiles neer location:
    //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
}

// RoomObject.prototype.creeps = [];
module.exports.loop = function () {
    let mainStart = Game.cpu.getUsed()
    if (Game.cpu.bucket > 100) {
        profiler.wrap(innerLoop);
        // innerLoop();
    }
    if (Game.cpu.tickLimit < 500) console.log(mainStart, Game.cpu.getUsed()-mainStart,Game.cpu.getUsed(), Game.cpu.bucket);

};