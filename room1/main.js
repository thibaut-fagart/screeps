const useTasks = false;
var _ = require('lodash');
require('./game.prototypes.room');
if (useTasks) require('./tasks.Manager');
require('./game.prototypes.Source');
require('./game.prototypes.creep');
require('./game.prototypes.lab');
var util = require('./util');
var handlers = require('./base.handlers');
var roleSpawn = require('./role.spawn');
var debugPerfs = false;
var profiler = require('./profiler');
if (!Game.rooms['sim'] && !Memory.disableProfiler) profiler.enable();
const reactions = require('./role.lab_operator').reactions;
const empire = require('./empire');

const loadGameTime = Game.time;
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
Object.defineProperty(StructureLink.prototype, 'container',
    {
        get: function () {
            // this.log('getOperator', this.memory.operator);
            let cid = require('./util.cache').get(this.memory, 'container', ()=> {
                let containers = this.room.glanceForAround(LOOK_STRUCTURES, this.pos, 2, true).map(s=>s.structure)
                    .filter(s=> undefined !== s.store);
                if (containers.length) {
                    if (containers.length > 1) {
                        // container, storage, terminal, nice order ! inside a type, choose the closest
                        containers = _.sortBy(containers, (c=>c.pos.getRangeTo(this)));
                        containers = _.sortBy(containers, (c=>c.structureType));
                    }
                    return _.head(containers).id;
                } else {
                    return false;
                }
            }, 1500);
            return cid ? Game.getObjectById(cid) : undefined;
        },
        configurable: true
    });
let pathFinderCost = {time: Game.time, cost: 0, count: 0};
function wrapPathFinder() {
    'use strict';
    let basePathFinderSearch = PathFinder.search;
    PathFinder.search = function () {
        'use strict';
        if (pathFinderCost.time !== Game.time) {
            pathFinderCost = {time: Game.time, cost: 0, count: 0};
        }
        let start = Game.cpu.getUsed();
        // console.log('called PathFinder.search', PathFinder.callCount);
        let result = basePathFinderSearch.apply(this, arguments);
        pathFinderCost.cost = pathFinderCost.cost + (Game.cpu.getUsed() - start);
        pathFinderCost.count = pathFinderCost.count + 1;
        return result;
    };
}
let frequencies = {};
function updateFrequencies(frequencies) {
    frequencies['computeTasks'] = 10;
    frequencies['runSpawn'] = 11 - Math.ceil(Game.cpu.bucket / 1000);
    frequencies['operateTowers'] = 1;
    frequencies['addRefillTasks'] = 1;
    frequencies['buildStructures'] = 10 * (11 - Math.ceil(Game.cpu.bucket / 1000));
    frequencies['operateLinks'] = 3 - Math.ceil(Math.min(Game.cpu.bucket, 999) / 333);
    frequencies['gc'] = 1000;
    frequencies['assessThreat'] = 50;
    frequencies['labs'] = Math.floor(Math.max(10, Math.min(100, 110 - Game.cpu.bucket / 5)));
    frequencies['import'] = 1500;
    frequencies['updateProductions'] = frequencies['labs'];
    frequencies['rotateProductions'] = 1500;
    frequencies['handleStreamingOrders'] = 100;
    frequencies['globalGc'] = 1000;
    return frequencies;
}

let globalTasks = {
    globalGc: ()=> {
        'use strict';
        _.keys(Memory.rooms).forEach(name=> {
            let memory = Memory.rooms[name];
            if (!Game.rooms[name]) {
                delete memory.towersCache;
                delete memory.harvestContainers;
                if (_.get(memory, ['threatAssessment', 'lastInvadersAt'], Game.time) < Game.time - 1000 * 1000) {
                    delete memory.threatAssessment;
                    delete memory.oldEfficiencies;
                }
                if (_.get(memory, ['squad', 'refreshed'], Game.time) < 10000) {
                    delete memory.squad;
                }
                delete memory.loot;
                delete memory.claim;
                delete memory.remoteMining;
                delete memory.attack;
                delete memory.observeOffset;
                delete memory.creepShaper;
                delete memory.boosts;
                delete memory.building;
                delete memory.queue;
                delete memory.dismantle;
                delete memory.temp;
                delete memory.structures;
                delete memory.reserve;
                delete memory.spawnQueue;
                delete memory.exports;
                delete memory.import;
                delete memory.export;
                delete memory.underattack;
                delete memory.lab_production;
                delete memory.labs;
                delete memory.transfers;
                delete memory.lab_productions;
                delete memory.lab_rotated;
                delete memory.labs_input;
            }
        });
        _.keys(Memory.creeps).forEach((name)=> {
            if (!Game.creeps[name]) {
                let creepMem = Memory.creeps[name];
                if (creepMem.role !== 'recycle') {
                    let age;
                    if (creepMem.birthTime) {
                        age = (creepMem.lastAlive || Game.time) - creepMem.birthTime; // TODO if not run every tick
                    } else {
                        let match = /.*_(\d+)/.exec(name);
                        if (match) {
                            let birth = match[1];
                            age = creepMem.lastAlive % 1500 - birth;
                            age = (age < 0) ? age + 1500 : age;
                        }
                    }
                    let expectedDeath = /claimer.*/.exec(name) || /reserver.*/.exec(name) ? 490 : 1490;
                    if (age < expectedDeath) {
                        Game.notify(`${Game.time} creep ${name} died at ${creepMem.lastAlive + 1} unnaturally at age ${age}`);
                        Memory.stats.deaths = Memory.stats.deaths + 1;
                    }
                }
                if (creepMem.task && useTasks) {
                    require('./tasks.Manager').returnTask({name: name, memory: creepMem});
                }
                delete Memory.creeps[name];
            }
        });
        _.keys(Memory.spawns).forEach((name)=> {
            if (!Game.spawns[name]) {
                delete Memory.spawns[name];
            }
        });


    },
    updateProductions: ()=> empire.updateProductions(),
    handleStreamingOrders: ()=>empire.handleStreamingOrders()
};
let roomTasks = {
    operateTowers: (r)=> r.operateTowers(),
    addRefillTasks: (r)=> {
        if (useTasks && r.memory.addRefillTasks) {
            r.log('spawned, triggering refill');
            delete r.memory.addRefillTasks;
            r.addRefillTasks(require('./tasks.Manager'));
        }
    },
    computeTasks: (r)=> {
        if (useTasks)  r.compileTasks();
    },
    runSpawn: (r)=> {
        'use strict';
        roleSpawn.run(r);
    },
    operateLinks: (r)=> r.operateLinks(),
    harvestContainers: (r)=>(r.memory.harvestContainers = r.memory.harvestContainers || []),
    updateLocks: (r)=> r.updateLocks(),
    assessThreat: (r)=> {
        if (Game.cpu.bucket > 200) r.assessThreat();
    },
    labs: (r)=> r.operateLabs(),
    rotateProductions: (r)=> {
        if (r.controller && r.controller.my && r.controller.level > 6) {
            r.lab_production = undefined;
        }
    },
    import: (r)=> {
        'use strict';
        if (r.controller && r.controller.my && r.controller.level >= 6) {
            r.updateImportExports();
        }
    },
    buildStructures: (r)=> r.buildStructures(),
    observe: (r)=> {
        if (Game.cpu.bucket > 5000) {
            r.runObserver();
        }
    },
    gc: (r)=> r.gc(),

};
function runRoomTask(taskName, room) {
    'use strict';
    let freq = frequencies[taskName] || 1;
    room.memory.tasksRan = room.memory.tasksRan || [];
    let lastRun = room.memory.tasksRan[roomTasksIndex[taskName]] || 0;
    if (lastRun + freq < Game.time) {
        room.memory.tasksRan[roomTasksIndex[taskName]] = Game.time;
        try {
            return (roomTasks[taskName])(room);
        } catch (e) {
            Game.notify(e.stack);
            console.log(e.stack);
        }
    } else {
        skippedRoomTask(taskName, room);
        return false;
    }
}
function runGlobalTask(taskName) {
    'use strict';
    let freq = frequencies[taskName] || 1;
    Memory.tasksRan = Memory.tasksRan || [];
    let lastRun = Memory.tasksRan[globalTasksIndex[taskName]] || 0;
    if (lastRun + freq < Game.time) {
        Memory.tasksRan[globalTasksIndex[taskName]] = Game.time;
        try {
            return (globalTasks[taskName])();
        } catch (e) {
            Game.notify(e.stack);
            console.log(e.stack);
        }
    } else {
        return false;
    }
}
function skippedRoomTask(taskName, room) {
    'use strict';
    if (taskName === 'labs') {
        room.memory.lab_activity = room.memory.lab_activity || {};
        util.recordActivity(room.memory.lab_activity, {skipped: 1, idle: 0, producing: 0, cooldown: 0}, 1500);
    } else if (taskName === 'runSpawn') {
        room.find(FIND_MY_SPAWNS).forEach(spawn=> {
            spawn.memory.spawns = spawn.memory.spawns || {};
            if (spawn.spawning) {
                util.recordActivity(spawn.memory.spawns, {idle: 0, waitFull: 0, spawning: 1, skipped: 0}, 1500);
            } else if (room.energyAvailable === room.energyCapacityAvailable) {
                util.recordActivity(spawn.memory.spawns, {idle: 0, waitFull: 0, spawning: 0, skipped: 1}, 1500);
            } else {
                util.recordActivity(spawn.memory.spawns, {idle: 0, waitFull: 1, spawning: 0, skipped: 0}, 1500);
            }
        });
    }
}
let roomTasksIndex = _.keys(roomTasks).reduce((acc, k, index)=> {
    acc[k] = index;
    return acc;
}, {});
let globalTasksIndex = _.keys(globalTasks).reduce((acc, k, index)=> {
    acc[k] = index;
    return acc;
}, {});
function innerLoop() {
    let updateStats = true;
    let messages = [], skipped = {};
    wrapPathFinder();
    Memory.stats.deaths = 0;
    let globalStart = Game.cpu.getUsed();
    let oldSeenTick = Game.time || (Memory.counters && Memory.counters.seenTick);
    Memory.counters = {tick: Game.time, seenTick: oldSeenTick + 1};
    Memory.stats.room = Memory.stats.room || {};
    let cpu = {creeps: {}, roomTasks: {}}, roomCpu = {}, remoteCpu = {};
    let availableCpu = Game.cpu.tickLimit;

    if (updateStats) {
        cpu.creeps = cpu.creeps || {};
        _.keys(handlers).forEach((k)=>cpu.creeps[k] = 0);
    }
    let rooms = _.groupBy(_.values(Game.rooms), r=>!!(r.controller && r.controller.my && r.controller.level > 0));
    let ownedRooms = rooms['true'] || [];
    let remoteRooms = rooms['false'] || [];
    let theTasks = _.keys(roomTasks);
    _.keys(globalTasks).forEach(taskName=> {
        let start = Game.cpu.getUsed();
        if (start < availableCpu - 100) {
            runGlobalTask(taskName);
        } else {
            skipped[taskName] = (skipped[taskName] || 0) + 1;
        }
        if (updateStats) {
            cpu.roomTasks[taskName] = (cpu.roomTasks[taskName] || 0) + Game.cpu.getUsed() - start;
        }
    });
    ownedRooms.concat(remoteRooms).forEach(room=> {
        'use strict';
        let roomName = room.name;
        theTasks.forEach((taskName)=> {
            'use strict';
            let start = Game.cpu.getUsed();
            if (start < availableCpu - 100) {
                runRoomTask(taskName, room);
            } else {
                skipped[taskName] = (skipped[taskName] || 0) + 1;
            }
            if (updateStats) {
                cpu.roomTasks[taskName] = (cpu.roomTasks[taskName] || 0) + Game.cpu.getUsed() - start;
            }
        });
    });
    _.sortBy(ownedRooms, r=>(r.memory.emergency ? -1 : 8 - r.controller.level));
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
                            if (updateStats) {
                                if (creep.memory.role) {
                                    skipped[creep.memory.role] = (skipped[creep.memory.role] || 0) + 1;
                                }
                            }
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
                    creep.log(e);
                    console.log(e.stack);
                    Game.notify(e.stack);
                }
            });
        } else {
            if (updateStats) {
                skipped[roomName + 'creeps'] = (skipped[roomName + 'creeps'] || 0) + 1;
            }
        }
        let creepsCpu = Game.cpu.getUsed();
        // room.log('creepsCpu', creepsCpu);
        let labsCpu = creepsCpu;

        if (Game.cpu.getUsed() < availableCpu - 100 && updateStats && Game.cpu.bucket > 500) {
            room.updateCheapStats();
            Memory.stats.room = Memory.stats.room || {};
            Memory.stats.room[room.name] = Memory.stats.room[room.name] || {};
            let roomStat = Memory.stats.room[room.name];
            // roomStat.energyInStructures = room.find(FIND_MY_STRUCTURES).reduce((sum, s)=>sum + (s.store ? s.store.energy : (s.energy || 0)), 0);
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
            let hostiles = strangers.filter(c=>c.hostile);

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
            (labsCpu - creepsCpu).toFixed(1),
            (statsCpu - labsCpu).toFixed(1),
            (roomCpu [roomName]).toFixed(1)
        );
    });
    if (updateStats) _.keys(skipped).forEach(k=> console.log('skipped ', k, skipped[k]));
    Memory.stats.performance = Memory.stats.performance || {};
    Memory.stats.performance.skipped = skipped;
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
        Memory.stats.performance.PathFinder = {search: pathFinderCost};
        // Memory.stats.performance = {'PathFinder.searchCost': pathFinderCost.cost};
        Memory.stats.roster = util.roster();
        Memory.stats.market = {credits: Game.market.credits};
        // _.keys(handlers).forEach((k)=> Memory.stats['roster.' + k] = roster[k] || 0);

    }

    // counting walkable tiles neer location:
    //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
}

// RoomObject.prototype.creeps = [];
module.exports.loop = function () {
    let mainStart = Game.cpu.getUsed();
    if (loadGameTime === Game.time) {
        if (Memory.lastLoadTime) {
            Memory.stats.scriptReloaded = Game.time - Memory.lastLoadTime;
            console.log('script reloaded', Memory.stats.scriptReloaded);
        }
        Memory.lastLoadTime = loadGameTime;
    }
    Memory.stats = Memory.stats || {};
    Memory.stats.cpu_ = Memory.stats.cpu_ || {};
    Memory.stats.cpu_.init = mainStart;

    try {
        frequencies = updateFrequencies(frequencies);
        Memory.stats.frequencies = frequencies;

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