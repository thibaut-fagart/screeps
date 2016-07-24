var _ = require('lodash');
var util = require('./util');
var Decay = require('./util.decay'), decay = new Decay();
/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.spawn');
 * mod.thing == 'a thing'; // true
 */
//  Game.spawns.Spawn1.createCreep([WORK, MOVE, WORK, WORK, WORK, WORK, ], undefined, {role:'harvester'})
module.exports = {
    maxCreeps: 15,
    BODY_COST: {
        'move': 50,
        'work': 100,
        'carry': 50,
        'attack': 80,
        'ranged_attack': 150,
        'heal': 250,
        'claim': 600,
        'tough': 10
    },
    patterns: {
        'harvester': {body: [MOVE, WORK, WORK, WORK, WORK, WORK,], count: 2, scale: false, memory: {role: 'harvester'}},
        'carry': {
            body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/],
            count: 2,
            scale: false,
            memory: {role: 'carry'}
        },
        'energyFiller': {
            body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 900 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 1200 */],
            count: 0,
            scale: false,
            memory: {role: 'energyFiller'}
        },
        'energyGatherer': {
            body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 900 *//*CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, *//* 1200 */],
            count: 0,
            scale: false,
            memory: {role: 'energyGatherer'}
        },
        'builder': {
            body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE],
            count: 1,
            scale: true,
            memory: {role: 'builder'}
        },
        'repair2': {
            body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE],
            count: 2,
            scale: true,
            memory: {role: 'repair2'}
        },
        // 'repair': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 2, scale:true, memory: {role: 'repair'}},
        'mineralHarvester': {
            body: [MOVE, WORK, WORK, WORK, WORK, WORK,],
            count: 0,
            scale: false,
            memory: {role: 'mineralHarvester'}
        },
        'mineralGatherer': {
            body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 900 *//*CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, *//* 1200 */],
            count: 0,
            scale: false,
            memory: {role: 'mineralGatherer'}
        },
        'upgrader': {
            body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, WORK, WORK, WORK ],
            count: 2,
            scale: true,
            memory: {role: 'upgrader'}
        },
        'labOperator': {
            body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/],
            count: 0,
            scale: false,
            memory: {role: 'labOperator'}
        },
        'scout': {body: [MOVE], count: 0, scale: false, memory: {role: 'scout'}},
        'roleSoldier': {
            body: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                RANGED_ATTACK, HEAL, RANGED_ATTACK, HEAL, RANGED_ATTACK, HEAL, RANGED_ATTACK, RANGED_ATTACK],
            count: 0,
            scale: true,
            memory: {role: 'roleSoldier', type: 'remote'}
        },
        'remoteUpgrader': {
            body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE],
            count: 0,
            scale: true,
            memory: {role: 'remoteUpgrader'}
        },
        'claimer': {body: [MOVE, MOVE, CLAIM, CLAIM,], count: 0, scale: true, memory: {role: 'claimer'}},
        'reserver': {body: [MOVE, MOVE, CLAIM, CLAIM,], count: 0, scale: true, memory: {role: 'reserver'}},
        // 'remoteHarvester': {body: [CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE,WORK, MOVE, CARRY,MOVE, WORK, MOVE,MOVE,CARRY], scale:true, count: 2, memory: {role: 'remoteHarvester'}},
        'remoteHarvester': {
            body: [MOVE, MOVE, MOVE, CARRY, WORK, WORK, WORK, WORK, MOVE, WORK, MOVE, WORK],
            scale: true,
            count: 0,
            memory: {role: 'remoteHarvester'}
        },
        'keeperGuard': {
            body: [MOVE, HEAL, MOVE, HEAL, MOVE, HEAL, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
                MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK],
            count: 0,
            scale: true,
            memory: {role: 'keeperGuard'}
        },
        'remoteCarryKeeper': {
            body: [TOUGH, HEAL, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
            count: 0,
            scale: false,
            memory: {role: 'remoteCarryKeeper'}
        },
        'keeperHarvester': {
            body: [MOVE, MOVE, MOVE, WORK, WORK, WORK, HEAL, HEAL, WORK, MOVE, WORK, MOVE, WORK, WORK, HEAL],
            scale: true,
            count: 0,
            memory: {role: 'keeperHarvester'}
        },
        'remoteCarry': {
            body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 900 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 1200 */],
            count: 0,
            scale: false,
            memory: {role: 'remoteCarry'}
        },
        'remoteBuilder': {
            body: [WORK, MOVE, CARRY, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE, CARRY, MOVE, WORK, MOVE, HEAL],
            count: 0,
            scale: true,
            memory: {role: 'remoteBuilder'}
        },
        /*
         'roleCloseGuard': {
         body: [TOUGH, MOVE, ATTACK, MOVE
         /!*
         [TOUGH,TOUGH, TOUGH,TOUGH,MOVE, MOVE,MOVE,MOVE,
         ATTACK, MOVE, ATTACK,MOVE, HEAL,MOVE,HEAL,MOVE,HEAL,MOVE,
         ATTACK,MOVE,ATTACK,MOVE,TOUGH,MOVE,HEAL, MOVE,ATTACK,MOVE,ATTACK,MOVE
         *!/
         ], count: 0, scale: true, memory: {role: 'roleSoldier', type: 'close'}
         },
         */
        'attacker': {
            body: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, HEAL, HEAL, MOVE, MOVE],
            count: 0,
            scale: true,
            memory: {role: 'attacker'}
        },

        // 'attack': {body: [WORK, CARRY, MOVE, ATTACK, CARRY, MOVE,ATTACK , MOVE,WORK, CARRY, MOVE, ATTACK, CARRY, ATTACK, MOVE,MOVE], count: 1, memory: {role: 'attack'}},
    },
    BODY_ORDER: [TOUGH, WORK, CARRY, MOVE, ATTACK, HEAL, RANGED_ATTACK, CLAIM],
    //Game.spawns.Spawn1.createCreep([CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE], undefined, {role:'carry'})
    shapeBody: function (spawn, perfectBody) {

        // adds the parts untill they can't be built
        var maxEnergy = spawn.room.energyAvailable;
        var body = [];
        var cost = 0;
        let max = 0;
        for (var i = 0; i < perfectBody.length && cost < maxEnergy; i++) {
            var part = perfectBody[i];
            if ((cost += this.BODY_COST[part]) <= maxEnergy) {
                max = i;
            }
        }

        let realBody = perfectBody.slice(0, max + 1);
        var newbody = realBody;
        newbody = _.sortBy(realBody, (part)=>this.BODY_ORDER.indexOf(part));
        return newbody;

    },
    repairRequired(creep) {
        "use strict";
        let repairNeedPer10k = _.sum(creep.room.find(FIND_STRUCTURES), (s)=>decay.repairNeedPer10k(s));
        creep.log('repairNeedPer10k', repairers.length);
        let repairers = creep.room.find(FIND_MY_CREEPS, {filter: (c)=>c.memory.role == 'repair2'});
        creep.log('repairers', repairers.length);
        let repairCapacity = 10000 * _.sum(repairers, (c)=>c.getActiveBodyparts(WORK)) * 100 / 3; // assume repairing 33% moving 33%
        creep.log('repair capacity', repairCapacity);

        // count
    },
    isFull: function (spawn) {
        if (spawn.energy < spawn.energyCapacity) return false;
        return spawn.room.energyAvailable >= spawn.room.energyCapacityAvailable;
        // (_.min(spawn.room.energyCapacityAvailable, 1000));
    },
    updateNeeds: function (creep, roomPatterns) {
        if (_.size(creep.room.find(FIND_MY_CONSTRUCTION_SITES)) == 0) {
            // creep.log("NO NEED FOR BUILDERS");
            roomPatterns.builder.count = 0;
        }
        if (_.size(creep.room.find(FIND_STRUCTURES, {
                filter: function (structure) {
                    return structure.hits < structure.hitsMax;
                }
            })) == 0) {
            roomPatterns.repair2.count = 0;
            // creep.log("NO NEED FOR REPAIRERS");
        }

    },
    findSafeSources: function (remoteRoom) {
        return util.findSafeSources(remoteRoom);
    },
    findCreepsMatching: function (room, memory) {
        return _.filter(room.find(FIND_MY_CREEPS), (c)=> _.all(_.keys(memory), (k)=>memory[k] === c.memory[k]));
    },
    queue: function (creep, queue, role, patterns, currentSplit, remoteRoster, upTo, memory) {
        'use strict';
        let __new = _.cloneDeep(patterns[role]);
        _.merge(__new.memory, memory);
        let l = queue.length;
        let currentCount = 0 + (currentSplit[role] || 0) + (remoteRoster ? (remoteRoster[role] || 0) : 0);
        // creep.log('queueing ',role, currentCount, 'to', upTo);
        for (let i = currentCount; i < upTo; i++) {
            queue.push(__new);
        }
        let queued = queue.length - l;
        // if (queued) creep.log('queued ',queued, role);

    },
    remoteRoster: function (roomName, predicate) {
        return _.countBy(_.values(Game.creeps).filter((c)=>c.memory.remoteRoom === roomName && (predicate ? predicate(c) : true)), (c)=>c.memory.role);
    },
    addRemoteMiningToQueue: function (remoteRoomName, creep, patterns, currentSplit, queue) {

        let remoteRoom = Game.rooms[remoteRoomName];
        let remoteRoster = this.remoteRoster(remoteRoomName, ((c)=>c.ticksToLive > 100));
        if (remoteRoom) {
            // creep.log('queueing for remoteMining', remoteRoom.name);
            let keeperLairs = remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});
            let safeSourcesAndMinerals = this.findSafeSources(remoteRoom, keeperLairs.length ? true : false);
            // creep.log('safeSourcesAndMinerals', safeSourcesAndMinerals.length);
            if (keeperLairs.length && creep.room.energyCapacityAvailable >= 1800) {
                this.queue(creep, queue, 'keeperGuard', patterns, currentSplit, remoteRoster, 3, {remoteRoom: remoteRoomName});
                // creep.log('keeperGuards?',patterns['keeperGuard'].count,remoteRoster['keeperGuard']||0);
            }
            if (safeSourcesAndMinerals.length) {
                // creep.log('remoteMining');
                if (keeperLairs.length) {
                    if (remoteRoster['keeperGuard'] > 2 && creep.room.energyCapacityAvailable >= 1800) {
                        this.queue(creep, queue, 'keeperHarvester', patterns, currentSplit, remoteRoster, remoteRoom.find(FIND_SOURCES).length + remoteRoom.find(FIND_MINERALS).length, {remoteRoom: remoteRoomName});
                        this.queue(creep, queue, 'remoteCarryKeeper', patterns, currentSplit, remoteRoster, (3 * remoteRoster['keeperHarvester'] || 0), {remoteRoom: remoteRoomName});
                    }
                } else {

                    this.queue(creep, queue, 'remoteHarvester', patterns, currentSplit, remoteRoster,
                        Math.max(0, safeSourcesAndMinerals.filter((s)=> s instanceof Source).length), {remoteRoom: remoteRoomName});

                    this.queue(creep, queue, 'remoteCarry', patterns, currentSplit, remoteRoster, (2 * remoteRoster['remoteHarvester'] || 0), {remoteRoom: remoteRoomName});
                    // this.queue(creep, queue, 'roleSoldier', patterns, currentSplit, remoteRoster, 2, {remoteRoom: remoteRoomName});
                }
            } else if (!keeperLairs.length) {
                // creep.log('hostiles present, no remoteMining!');
                this.queue(creep, queue, 'roleSoldier', patterns, currentSplit, remoteRoster, 2, {remoteRoom: remoteRoomName});
            }
            let spawnReserve = ( !(keeperLairs.length) && (!remoteRoom.controller || !remoteRoom.controller.reservation || creep.owner.username !== remoteRoom.controller.reservation.username)
            || (remoteRoom.controller && remoteRoom.controller.reservation.ticksToEnd < 500));
            // creep.log('current reservation  ?', remoteRoom.name, JSON.stringify(remoteRoom.controller.reservation));
            // spawn reserver if  the room is not reserved, or due to expire soon
            if (spawnReserve) {
                this.queue(creep, queue, 'reserver', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
            }

            this.queue(creep, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
        } else {
            // creep.log('queueing scout for remoteMining', remoteRoomName);
            this.queue(creep, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
        }
    },

    whatToBuild: function (patterns, creep) {
        let queue = [];
        if (creep.room.controller && creep.room.controller.my && creep.room.controller.level < 2) {
            return patterns['upgrader'];
        }
        var currentSplit = util.roster(creep.room, (c)=> c.ticksToLive > 50 && !c.memory.remoteRoom);
        // creep.log('initial split', JSON.stringify(currentSplit));
        // creep.log('correct harvester to ? ',  notDyingRoster['harvester']);
        // creep.log('correct carry to ? ',  notDyingRoster['carry']);
        /*        _.uniq(['remoteMining', 'attack', 'remotebuild', 'claim', 'reserve']
         .map((mem)=>creep.room.memory[mem])) // don't count several times the same room
         .map((roomName)=> roomName ? util.roster(roomName, (c)=> c.ticksToLive > 50) : {})// roster of not dying
         .forEach((roster)=> {
         'use strict';
         _.keys(roster).forEach((k)=> currentSplit[k] = (currentSplit[k] || 0) + roster[k]);
         });*/ // add the remote Roster

        if (creep.room.memory.remoteMining) {
            let remoteRoomName = creep.room.memory.remoteMining;
            let rooms = _.isString(remoteRoomName) ? [creep.room.memory.remoteMining] : creep.room.memory.remoteMining;
            // creep.log('rooms', JSON.stringify(rooms));
            rooms.forEach((name)=>this.addRemoteMiningToQueue(name, creep, patterns, currentSplit, queue));
        }

        if (creep.room.controller.level > 4 && creep.room.memory.claim) {
            let rooms = _.isString(creep.room.memory.claim) ? [creep.room.memory.claim] : creep.room.memory.claim;
            let remoteRoster = this.remoteRoster(creep.room.memory.claim);
            roooms.forEach((room)=> {
                'use strict';
                let remoteRoom = Game.rooms[room];
                if (remoteRoom && remoteRoom.controller && !remoteRoom.controller.my) {
                    this.queue(creep, queue, 'claimer', currentSplit, remoteRoster, 1, {remoteRoom: room});
                } else if (remoteRoom && remoteRoom.controller && remoteRoom.controller.my && remoteRoom.controller.level < 3) {
                    let remoteRoster = util.roster(remoteRoom, (c)=> c.ticksToLive > 100);
                    this.queue(creep, queue, 'remoteUpgrader', currentSplit, remoteRoster, 2, {remoteRoom: room});
                }
            });
        }
        if (creep.room.memory.remotebuild) {
            let rooms = _.isString(creep.room.memory.remotebuild) ? [creep.room.memory.remotebuild.claim] : creep.room.memory.remotebuild;
            let remoteRoster = this.remoteRoster(creep.room.memory.remotebuild);
            rooms.forEach((roomName)=> {
                'use strict';
                let remoteRoom = Game.rooms[roomName];
                if (!remoteRoom) {
                    patterns['remoteBuilder'].count = 0;
                } else {
                    let remoteRoster = util.roster(remoteRoom, (c)=> c.ticksToLive > 100);
                    if (remoteRoom.controller && !remoteRoom.controller.my) {
                        let constructionSites = remoteRoom.find(FIND_CONSTRUCTION_SITES);
                        if (constructionSites.length > 0) {
                            let wantedBuilderCount = constructionSites.find((site)=>site.structureType == STRUCTURE_SPAWN) ? 3 : 1;
                            this.queue(creep, queue, 'remoteBuilder', currentSplit, remoteRoster, wantedBuilderCount, {remoteRoom: roomName});
                        }

                    } else if (remoteRoom.controller && remoteRoom.controller.my && remoteRoom.find(FIND_MY_SPAWNS) == 0) {
                        this.queue(creep, queue, 'remoteBuilder', currentSplit, remoteRoster, 3, {remoteRoom: roomName});
                    } else if (remoteRoom.find(FIND_MY_SPAWNS) > 0) {
                        // creep.log('disabling remotebuilds');
                        this.queue(creep, queue, 'remoteBuilder', currentSplit, remoteRoster, 3 - remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTENSION}}).length
                            , {remoteRoom: roomName});
                    }
                }
            });
            // creep.log('remotebuilders', patterns['remoteBuilder'].count)
        }


        if (creep.room.controller.level >= 4) {
            if (creep.room.storage) {
                if (creep.room.storage.store.energy < 10000) {
                    patterns['upgrader'].count = 0;
                } else {
                    patterns['upgrader'].count = Math.floor(Math.min(creep.room.storage.store.energy / 10000, 2));
                }
                if (creep.room.storage.store.energy > 5000) {
                    patterns['carry'].count = 0;
                    patterns['energyFiller'].count = 2;
                    patterns['energyGatherer'].count = 1;
                } else {
                    patterns['carry'].count = 2;
                }
            }
            // creep.log('upgrader set', patterns['upgrader'].count);

        }
        if (creep.room.controller.level >= 6) {
            if (creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}}).length > 0) {
                let find = creep.room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) > 1000 && s.store.energy !== _.sum(s.store)});
                if (find.length) {
                    patterns['mineralGatherer'].count = 1;
                    creep.log('containers with minerals', find.length, find[0].id);
                }

                if (creep.room.storage && creep.room.storage.store.energy > 10000) {
                    let minerals = creep.room.find(FIND_MINERALS);
                    let storedMinerals = creep.room.storage.store;
                    minerals.forEach((m)=> {
                        // creep.log('mineral', m.mineralType, storedMinerals[m.mineralType], storedMinerals[m.mineralType] < 100000, m.mineralAmount);
                        if (!(storedMinerals[m.mineralType]) || storedMinerals[m.mineralType] < 100000 && m.mineralAmount) {
                            patterns['mineralHarvester'].count = 1;
                        }
                    });
                }
                // creep.log('mineralHarvester?', patterns['mineralHarvester'].count);

            }
            let labs = creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LAB}});
            if (labs.length > 0
                && (labs.find((lab)=>lab.mineralAmount < 0.1 * lab.mineralCapacity // empty labs
                        && creep.room.storage.store[creep.room.expectedMineralType(lab)] // but available minerals
                    ) || labs.find((lab)=>lab.mineralAmount > 0.9 * lab.mineralCapacity) // full labs
                )
            ) {
                patterns['labOperator'].count = 1;
            }
        }

        if (creep.room.storage) {
            patterns['upgrader'].count = patterns['upgrader'].count + Math.floor(creep.room.storage.store.energy) / 100000;
        } else {
            let nonFullStructures = creep.room.find(FIND_STRUCTURES,
                {filter: (s)=>((s.energyCapacity && s.energy !== s.energyCapacity) || (s.storeCapacity && _.sum(s.store) !== s.storeCapacity))})
                .filter((s)=>((!creep.room.memory.harvestContainers || creep.room.memory.harvestContainers.indexOf(s.id) < 0)));
            if (!nonFullStructures.length) {
                creep.log('energy overflowing, upgrader');
                patterns['upgrader'].count = (currentSplit['upgrader'] || 0) + 1;
            } else {
                // creep.log('nonFullStructures',JSON.stringify(nonFullStructures.map((s)=>s.pos)),nonFullStructures.length);
            }
        }
        if (creep.room.find(FIND_CONSTRUCTION_SITES, {filter: (c)=> STRUCTURE_EXTENSION === c.structureType}).length > 0) {
            patterns['builder'].count = (0 || patterns['builder'].count) + patterns['upgrader'].count;
            patterns['upgrader'].count = 0;
        }
        // creep.log("currentSplit " , JSON.stringify(currentSplit));
        // creep.log("targetSplit" , JSON.stringify(_.values(patterns).map((p)=>({role:p.memory.role, count: p.count})).filter((e)=>e.count)));
        
        _.keys(patterns)
            // .forEach((role) 
        // ['harvester', 'carry', 'energyFiller', 'energyGatherer', 'builder', 'repair2', 'mineralHarvester', 'mineralGatherer', 'upgrader']
            .forEach((role)=> {
                
                'use strict';
                let count = patterns[role].count;
                if (count > 0) {
                    // if (['harvester', 'carry', 'energyFiller', 'energyGatherer', 'builder', 'repair2', 'mineralHarvester', 'mineralGatherer', 'upgrader'].indexOf(role) < 0) {
                    //     creep.log('want ', role, count, currentSplit[role]);
                    // } else
                        this.queue(creep, queue, role, patterns, currentSplit, undefined, patterns[role].count, {});
                }
            });
        // currentSplit = _.mapValues(currentSplit, (v)=>{return v/creepCount;});
        // if (queue.length) creep.log('queuePriorities', JSON.stringify(queue.map((e)=>e.priority)));
        queue = _.sortBy(queue, (elem)=> elem.priority);
        // if (queue.length) creep.log('queuePriorities afterSort', JSON.stringify(queue.map((e)=>e.priority)));
        // if (queue.length) creep.log('queue', JSON.stringify(queue.map((e)=>({priority:e.priority,memory:e.memory}))));
        creep.memory.queueLength = queue.length;
        creep.memory.queue = _.countBy(queue, (pat)=>pat.memory.role);
        // if (queue.length) creep.log('queued ', JSON.stringify(_.countBy(queue, (c)=>c.memory.role)));
        let result = queue.shift();
        // creep.log('first in queue ', JSON.stringify(result));
        return result;
        // creep.log('targetCount', targetCount);
    },
    reassignCreeps: function (spawn, roomPatterns) {
        /*
         var reassign = spawn.room.find(FIND_MY_CREEPS, {filter:function(creep) {
         return undefined === creep.memory.role
         }});
         for (var i = 0; i < reassign.length;i++) {
         var role = this.whatToBuild(roomPatterns, spawn).memory.role;
         spawn.log("reassigning to ", role);
         delete Memory.creeps[reassign[i].name];
         reassign[i].memory.role = role;
         }

         */
    },
    buildTower: function (spawn) {
        "use strict";
        if (spawn.room.controller.level >= 3 && spawn.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).length == 0) {
            let towerFlags = spawn.room.find(FIND_FLAGS, {filter: {color: COLOR_PURPLE}});
            if (towerFlags.length > 0) {
                let lookFor = towerFlags[0].pos.lookFor(LOOK_CONSTRUCTION_SITES);
                if (!lookFor.length) {
                    spawn.room.createConstructionSite(towerFlags[0].pos, STRUCTURE_TOWER);
                }
            }
        }

    },
    createCreep: function (creep, buildSpec) {
        creep.log('createCreep', JSON.stringify(buildSpec));
        if (!buildSpec.memory || !buildSpec.body) {
            creep.log('ERROR, invalid create', JSON.stringify(buildSpec));
        }
        let creep2 = creep.createCreep(buildSpec.body, undefined, buildSpec.memory);
        if ('number' !== typeof creep2) {
            this.updateCounters(creep, {spawning: 1});
            creep.log("building ", creep.room.energyAvailable, creep.room.energyCapacityAvailable, JSON.stringify(buildSpec));
            creep.memory.build = {start: Game.time, buildTime: buildSpec.body.length};
        } else {
            creep.log('create?', creep2);
        }
    }, /**
     *
     * @param {StructureSpawn} creep
     */
    run: function (creep) {
        let p = 0;
        _.keys(this.patterns).forEach((k)=> this.patterns[k].priority = p++);
        let localRoster = util.roster(creep.room);
        let roomPatterns = _.cloneDeep(this.patterns);
        if (creep.memory.build && !creep.spawning) {
            creep.log('built', JSON.stringify(creep.memory.build));
            delete creep.memory.build;
        }
        this.updateNeeds(creep, roomPatterns);
        this.reassignCreeps(creep, roomPatterns);
        if (!(Game.time % 100)) this.buildTower(creep);
        if (creep.spawning) {
            // creep.log('spawning');
            this.updateCounters(creep, {spawning: 1});
            return;
        }

        let myCreeps = creep.room.find(FIND_MY_CREEPS);
        var harvesters = _.filter(myCreeps, (c) =>c.memory.role == 'harvester');
        // creep.log('harvesters', harvesters.length);
        if ((harvesters.length < 2 || _.filter(harvesters, (c)=>c.ticksToLive > 100) < 2) && creep.room.energyAvailable > 250) {
            creep.log("emergency harvester");
            let spec = _.cloneDeep(roomPatterns.harvester);
            spec.body = this.shapeBody(creep, roomPatterns.harvester.body);
            this.createCreep(creep, spec);
            return;
        }
        if (((localRoster['carry'] || 0) + (localRoster['energyGatherer'] || 0) + (localRoster['energyFiller'] || 0) === 0)
            && creep.room.energyAvailable > 250 && creep.room.energyAvailable < 800) {
            let spec = _.cloneDeep(roomPatterns.carry);
            spec.body = this.shapeBody(creep, roomPatterns.carry.body);
            this.createCreep(creep, spec);
            // creep.log("emergency carry");
            return;
        }

        var energy = _.reduce(creep.room.find(FIND_SOURCES), function (total, source) {
            return total + source.energy;
        });
        if (energy == 0) {
            creep.log("LIMITING CREEPS ", _.size(myCreeps) - 1);
            this.maxCreeps = _.size(myCreeps) - 1;
        }
        // TODO if drop containers are > 75% increase creep count ?

        var buildSpec = this.whatToBuild(roomPatterns, creep);
        // creep.log('build?',JSON.stringify(buildSpec));
        // creep.log('build?',JSON.stringify(roomPatterns[buildSpec]));
        if (!buildSpec) {
            this.updateCounters(creep, {idle: 1});
            return;
        }
        let perfectBodyCount = buildSpec.body.length;
        var full = this.isFull(creep);
        buildSpec.body = this.shapeBody(creep, buildSpec.body);
        if (!full) {
            if (perfectBodyCount == buildSpec.body.length) {
                this.createCreep(creep, buildSpec);
            } else {
                this.updateCounters(creep, {waitFull: 1});
            }
        } else {
            this.createCreep(creep, buildSpec);
        }
    },
    updateCounters: function (creep, o) {
        'use strict';
        let base = {idle: 0, waitFull: 0, spawning: 0};
        _.merge(base, o);
        let i = Game.time % (50 * 32);
        let j = Math.floor(i / 32);
        let countBits = (x) => {
            x = x - ((x >> 1) & 0x55555555);
            x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
            x = (x + (x >> 4)) & 0x0f0f0f0f;
            x = x + (x >> 8);
            x = x + (x >> 16);
            return x & 0x0000003f;
        };
        // creep.log('counters', JSON.stringify(base));
        _.keys(base).forEach((k)=> {
            if (!creep.room.memory.spawns) {
                creep.room.memory.spawns = {};
            }
            if (!creep.room.memory.spawns[k + 'Bits']) {
                creep.room.memory.spawns[k + 'Bits'] = new Array(50);
                _.fill(creep.room.memory.spawns[k + 'Bits'], 0);
            }
            let old = creep.room.memory.spawns[k + 'Bits'][j];
            creep.room.memory.spawns[k + 'Bits'][j] = (creep.room.memory.spawns[k + 'Bits'][j] << 1) | base[k];
            // creep.log('setting bit', k, old, creep.room.memory.spawns[k + 'Bits'][j]);
            Memory.stats['room.' + creep.room.name + '.spawns.' + k] = _.sum(creep.room.memory.spawns[k + 'Bits'], (x)=> countBits(x));

        });


        // creep.memory[]
    }

};