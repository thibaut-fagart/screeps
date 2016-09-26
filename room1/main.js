var _ = require('lodash');
require('./game.prototypes.room');
require('./game.prototypes.creep');
require('./game.prototypes.lab');
var util = require('./util');
var handlers = require('./base.handlers');
var roleSpawn = require('./role.spawn');
var debugPerfs = false;
var profiler = require('./profiler');
if (!Game.rooms['sim'] && !Memory.disableProfiler) profiler.enable();

// var RoomManager = require('./manager.room'), roomManager = new RoomManager(); // todo manager
// This line monkey patches the global prototypes.
// if (Game.cpu.bucket> 500)
function debugCreep(name) {
    'use strict';
    Memory.debug = Memory.debug || {};
    let debugCreeps = Memory.debug.creeps || [];
    return (!debugCreeps.length || (debugCreeps.indexOf(name) >= 0));
}
function debugRole(name) {
    'use strict';
    Memory.debug = Memory.debug || {};
    let debugRole = Memory.debug.roles || [];
    return (!debugRole.length || (debugRole.indexOf(name) >= 0));
}
function debugRoom(name) {
    'use strict';
    Memory.debug = Memory.debug || {};
    let debugRooms = Memory.debug.rooms || [];
    return (!debugRooms.length || (debugRooms.indexOf(name) >= 0));
}
Memory.debug = Memory.debug || {};
Creep.prototype.log = function () {
    if (debugRole(this.memory.role)
        && debugRoom(this.room.name)
        && debugCreep(this.name)
    ) {
        console.log([Game.time, this.name, this.pos, this.memory.role].concat(Array.prototype.slice.call(arguments)));
    }
};
Spawn.prototype.log = function () {
    if (debugRole(this.memory.role)
        && debugRoom(this.room.name)
        && debugCreep(this.name)
    ) {
        console.log([Game.time, this.name, this.room.name].concat(Array.prototype.slice.call(arguments)));
    }
};
Room.prototype.log = function () {
    if (debugRoom(this.name)) {
        console.log([Game.time, this.name, this.controller ? this.controller.level : 'neutral'].concat(Array.prototype.slice.call(arguments)));
    }
};
Structure.prototype.log = function () {
    console.log([Game.time, this.structureType, this.room.name, this.id].concat(Array.prototype.slice.call(arguments)));
};

Object.defineProperty(Structure.prototype, 'memory',
    {
        get: function () {
            'use strict';
            this.room.memory.structures = this.room.memory.structures || {};
            let mem = this.room.memory.structures;
            mem[this.id] = mem[this.id] || {};
            return mem[this.id];
        },
        set: function (value) {
            let mem = this.room.memory.structures = this.room.memory.structures || {};
            mem[this.id] = value;
        },
        configurable: true
    });

Object.defineProperty(StructureLink.prototype, 'operator',
    {
        get: function () {
            // this.log('getOperator', this.memory.operator);
            let opId = this.memory.operator;
            if (opId) {
                let creep = Game.getObjectById(opId);
                if (!creep) {
                    delete this.memory.operator;
                }
                return creep;
            }
            return undefined;
        },
        set: function (value) {
            // this.log('setOperator', value);
            this.memory.operator = value && value.id;
        },
        configurable: true
    });

function wrapPathFinder() {
    'use strict';
    let basePathFinderSearch = PathFinder.search;
    PathFinder.search = function () {
        'use strict';
        PathFinder.callCount = (PathFinder.callCount || 0) + 1;
        // console.log('called PathFinder.search', PathFinder.callCount);
        return basePathFinderSearch.apply(this, arguments);
    };
}
let roomTasks = {
    runSpawn: (r)=> {
        'use strict';
        try {
            if (r.controller && r.controller.my && r.controller.level >0) {
                roleSpawn.run(r);
            }
        } catch (e) {
            Game.notify(e.stack);
            console.log(e.stack);
        }
    },
    operateTowers: (r)=> r.operateTowers(),
    operateLinks: (r)=>r.operateLinks(),
    harvestContainers: (r)=>(r.memory.harvestContainers = r.memory.harvestContainers || []),
    updateLocks: (r)=> r.updateLocks(),
    gc: (r)=> {
        if (0 == Game.time % 100) {
            r.gc();
        }
    },
    assessThreat: (r)=> {
        if (Game.cpu.bucket > 200) r.assessThreat();
    },
    labs: (r)=> {
        if (!(Game.time % 10) && r.memory.labs) r.operateLabs();
    },

};

function innerLoop() {
    let updateStats = true;
    let messages = [], skipped = [];
    wrapPathFinder();
    Memory.stats.deaths = 0;
    let globalStart = Game.cpu.getUsed();
    let oldSeenTick = Game.time || (Memory.counters && Memory.counters.seenTick);
    Memory.counters = {tick: Game.time, seenTick: oldSeenTick + 1};
    Memory.stats.room = Memory.stats.room||{};
    if (/*0 == Game.time % 100*/true) {
        _.keys(Memory.creeps).forEach((name)=> {
            if (!Game.creeps[name]) {
                let creepMem = Memory.creeps[name];
                if (creepMem.role !== 'recycle') {
                    let age;
                    if (creepMem.birthTime) {
                        age = Game.time - creepMem.birthTime; // TODO if not run every tick
                    } else {
                        let match = /.*_(\d+)/.exec(name);
                        if (match) {
                            let birth = match[1];
                            age = Game.time % 1500 - birth;
                            age = (age < 0) ? age + 1500 : age;
                        }
                    }
                    let expectedDeath = /claimer.*/.exec(name) || /reserver.*/.exec(name) ? 490 : 1490;
                    if (age < expectedDeath) {
                        Game.notify(`${Game.time} creep ${name} died unnaturally at age ${age}`);
                        Memory.stats.deaths = Memory.stats.deaths + 1;
                    }
                }
                delete Memory.creeps[name];
            }
        });
        _.keys(Memory.spawns).forEach((name)=> {
            if (!Game.spawns[name]) {
                delete Memory.spawns[name];
            }
        });
    }
    let cpu = {creeps: {}, roomTasks: {}}, roomCpu = {}, remoteCpu = {};
    let availableCpu = Game.cpu.tickLimit;

    if (updateStats) {
        cpu.creeps = cpu.creeps || {};
        _.keys(handlers).forEach((k)=>cpu.creeps[k] = 0);
    }
    let rooms = _.groupBy(_.values(Game.rooms),r=>!!(r.controller && r.controller.my && r.controller.level > 0));
    let ownedRooms  = rooms['true'];
    let remoteRooms = rooms['false'];
    let taskPairs = _.pairs(roomTasks);
    ownedRooms.concat(remoteRooms).forEach(room=> {
        'use strict';
        let roomName = room.name;
        taskPairs.forEach((pair)=> {
            'use strict';
            let taskName = pair[0], task = pair[1];
            let start = Game.cpu.getUsed();
            if (start < availableCpu - 100) {
                try {
                    task(room);
                } catch (e) {
                    console.log(e);
                    console.log(e.stack);
                }
            } else {
                if (updateStats) skipped.push(`${roomName}.task`);
            }
            if (updateStats) {
                cpu.roomTasks[taskName] = (cpu.roomTasks[taskName] || 0) + Game.cpu.getUsed() - start;
            }
        });
    });
    _.sortBy(ownedRooms, r=>(r.memory.emergency?-1:8-r.controller.level));
    let sortedRooms = ownedRooms.concat(remoteRooms);
        // _.sortBy(_.values(Game.rooms), (r)=> r.controller && r.controller.my ? r.controller.level : 10);
    if (updateStats && Game.cpu.tickLimit < 500 && debugPerfs) console.log('room, controller, roomTasks , creeps ,spawns , labs , stats, room');
    sortedRooms.forEach((room)=> {
        // for (var roomName in Game.rooms) {
        //     var room = Game.rooms[roomName];
        // cpu['roomTasks'] = (cpu['roomTasks'] || 0) + roomTasksCpu - roomStartCpu;
        // roomManager.run(room); // todo manager
        // room.prototype.sourceConsumers = {};
        let roomName = room.name;
        let roomStartCpu = Game.cpu.getUsed();
        if (roomStartCpu < availableCpu - 100) {
            var creeps = room.find(FIND_MY_CREEPS);
            // room.creeps = creeps;
            creeps.forEach(function (creep) {
                creep.memory.lastAlive = Game.time;
                try {
                    if (!creep.spawning) {
                        creep.memory.birthTime = creep.memory.birthTime || Game.time;
                        let start = Game.cpu.getUsed();
                        if (start < availableCpu - 100) {
                            if (creep.memory.tasks && creep.memory.tasks.length) {
                                let task = new (require('task.' + creep.memory.tasks[0].name))(creep.memory.tasks[0].args);
                                let taskComplete = task.run(creep);
                                if (taskComplete) {
                                    creep.memory.tasks.splice(0, 1);
                                    if (!creep.memory.tasks.length) {
                                        delete creep.memory.tasks;
                                    }
                                }
                            } else {
                                let handler = handlers[creep.memory.role];
                                if (handler) handler.run(creep);
                                else {
                                    creep.log('!!!!!!no handler !! ');
                                }
                            }
                        } else {
                            if (updateStats) skipped.push(`${roomName}.${creep.name}`);
                        }
                        let end = Game.cpu.getUsed();
                        if (updateStats) {
                            cpu.creeps[creep.memory.role] = (cpu.creeps[creep.memory.role] || 0) + (end - start);
                            if (creep.memory.remoteRoom) {
                                remoteCpu[creep.memory.remoteRoom] = (remoteCpu[creep.memory.remoteRoom] || 0) + (end - start);
                            }
                        }
                    }
                } catch (e) {
                    creep.log(e.stack);
                    Game.notify(e.stack);
                }
            });
        } else {
            if (updateStats) skipped.push(`${roomName}.creeps`);
        }
        let creepsCpu = Game.cpu.getUsed();
        // room.log('creepsCpu', creepsCpu);
        let spawnCpu = creepsCpu;
        let labsCpu = spawnCpu;

        if (Game.cpu.getUsed() < availableCpu - 100 && updateStats) {
            room.updateCheapStats();
        }
        if (Game.cpu.getUsed() < availableCpu - 100 && updateStats) {
            Memory.stats.room = Memory.stats.room || {};
            Memory.stats.room[room.name] = Memory.stats.room[room.name] || {};
            let roomStat = Memory.stats.room[room.name];
            roomStat.energyInStructures = room.find(FIND_MY_STRUCTURES).reduce((sum, s)=>sum + (s.store ? s.store.energy : (s.energy || 0)), 0);
            // roomStat.energyDropped = _.sum(_.map(room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType == RESOURCE_ENERGY), (s)=> s.amount));
            // room.log('stat efficiency',Game.time % 50);
            if (0 == (Game.time % 50)) {
                let roomEfficiency = Room.efficiency(roomName);
                if (roomEfficiency && roomEfficiency.remoteMining) {
                    roomStat.efficiency = {
                        remoteMining: roomEfficiency.remoteMining,
                        remoteMiningBalance: _.sum(roomEfficiency.remoteMining)
                    };
                }
            }

            let strangers = room.find(FIND_HOSTILE_CREEPS);
            let hostiles = _.filter(strangers, (c)=>_.sum(c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) > 0));

/*
            if (hostiles.length > 0) {
                messages.push(' strangers ' + JSON.stringify(_.map(hostiles, (h) => {
                        let subset = _.pick(h, ['name', 'pos', 'body', 'owner', 'hits', 'hitsMax']);
                        subset.body = _.countBy(subset.body, 'type');
                        return subset;
                    })));
            }
*/
            roomStat.strangers = _.size(strangers);
            roomStat.hostiles = _.size(hostiles);
            roomStat.creeps = util.roster(room);
        }
        let statsCpu = Game.cpu.getUsed();
        if (updateStats) cpu ['stats'] = (cpu ['stats'] || 0) + statsCpu - labsCpu;
        if (updateStats) roomCpu[roomName] = Game.cpu.getUsed() - roomStartCpu;
        if (updateStats && Game.cpu.tickLimit < 500 && debugPerfs) room.log(
            (creepsCpu - roomStartCpu).toFixed(1),
            (spawnCpu - creepsCpu).toFixed(1),
            (labsCpu - spawnCpu).toFixed(1),
            (statsCpu - labsCpu).toFixed(1),
            (roomCpu [roomName]).toFixed(1)
        );
    });
    if (updateStats) skipped.forEach((s)=> console.log('skipped', s));
    Memory.stats.remoteRooms = {};
    _.keys(Memory.rooms).forEach((k)=> {
        let stat = _.get(Memory.stats, 'room.' + k + '.efficiency.remoteMining', undefined);
        if (stat && remoteCpu[k] || 0) {
            Memory.stats.remoteRooms[k] = Memory.stats.remoteRooms[k] || {};
            Memory.stats.remoteRooms[k].cpu_efficiency = stat / remoteCpu[k];
        }
        // console.log(`cpu.room, ${k},${roomCpu[k] || 0}`);
    });
    if (messages.length > 0) {
        Game.notify(messages);
    }
    if (updateStats) {
        Memory.stats.cpu_bucket = Game.cpu.bucket;
        Memory.stats.cpu_ = cpu;
        Memory.stats.cpu_.rooms = roomCpu;
        Memory.stats.cpu_.remoteRooms = remoteCpu;
        Memory.stats.cpu_.main = Game.cpu.getUsed() - _.sum(cpu) - globalStart;
        Memory.stats.cpu = Game.cpu.getUsed();
        Memory.stats.gcl = Game.gcl;
        // console.log('PathFinder.callCount', (PathFinder.callCount || 0));
        Memory.stats.performance = {'PathFinder.search': (PathFinder.callCount || 0)};
        Memory.stats.roster = util.roster();
        // _.keys(handlers).forEach((k)=> Memory.stats['roster.' + k] = roster[k] || 0);

    }

    // counting walkable tiles neer location:
    //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
}

// RoomObject.prototype.creeps = [];
module.exports.loop = function () {
    let mainStart = Game.cpu.getUsed();
    Memory.stats = Memory.stats || {};
    Memory.stats.cpu_ = Memory.stats.cpu_ || {};
    Memory.stats.cpu_.init = mainStart;

    try {
        if (Game.cpu.bucket > 200 && !Game.rooms['sim'] && !Memory.disableProfiler) {
            profiler.wrap(innerLoop);   
            // innerLoop();
        } else {
            innerLoop();
        }
    }
    catch (e) {
        console.log(e);
        console.log(e.stack);
    }
    if (Game.cpu.tickLimit < 500) console.log(mainStart, Game.cpu.getUsed(), Game.cpu.bucket);

};