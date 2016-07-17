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
        'scout': {body: [MOVE], count: 0, scale: false, memory: {role: 'scout'}},
        'roleRemoteGuard': {
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
            body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 *//*
             CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/],
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
        'claimer': {body: [MOVE, MOVE, CLAIM, CLAIM,], count: 0, scale: true, memory: {role: 'claimer'}},
        'reserver': {body: [MOVE, MOVE, CLAIM, CLAIM,], count: 0, scale: true, memory: {role: 'reserver'}},
        'roleCloseGuard': {
            body: [TOUGH, MOVE, ATTACK, MOVE
                /*
                 [TOUGH,TOUGH, TOUGH,TOUGH,MOVE, MOVE,MOVE,MOVE,
                 ATTACK, MOVE, ATTACK,MOVE, HEAL,MOVE,HEAL,MOVE,HEAL,MOVE,
                 ATTACK,MOVE,ATTACK,MOVE,TOUGH,MOVE,HEAL, MOVE,ATTACK,MOVE,ATTACK,MOVE
                 */
            ], count: 0, scale: true, memory: {role: 'roleSoldier', type: 'close'}
        },
        'upgrader': {
            body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE],
            count: 2,
            scale: true,
            memory: {role: 'upgrader'}
        },
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
        /*
         if (_.size(Game.creeps) >= this.maxCreeps) {
         roomPatterns.harvester.count = 1;
         }
         */
        /*
         if (_.size(creep.room.find(FIND_STRUCTURES, {
         filter: function(structure) {
         return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
         structure.energy < structure.energyCapacity;
         }
         })) ==0) {
         roomPatterns.harvester.count = 1;
         // creep.log("NO building to refill=> no HARVESTERS");
         }
         */

    },
    findSafeSources: function (remoteRoom) {
        return util.findSafeSources(remoteRoom);
    },
    findCreepsMatching: function (room, memory) {
        return _.filter(room.find(FIND_MY_CREEPS), (c)=> _.all(_.keys(memory), (k)=>memory[k] === c.memory[k]));
    },

    whatToBuild: function (patterns, creep) {

        var currentSplit = util.roster(creep.room, (c)=> c.ticksToLive > 50);
        // creep.log('roster',JSON.stringify(currentSplit ))
        /*
         var harvesters = currentSplit.harvester || 0;
         if (harvesters < 2 || _.filter(harvesters, function(c) {return c.ticksToLive> 100}).length<2) {
         return patterns.harvester;
         }

         var carrys = currentSplit.carry||0;
         if (_.filter(carrys, function(c) {return c.ticksToLive> 100}).length < 1) {
         return patterns.carry;
         }
         */
        _.uniq(['remoteMining', 'attack', 'remotebuild', 'claim', 'reserve']
            .map((mem)=>creep.room.memory[mem])) // don't count several times the same room
            .map((roomName)=> roomName ? util.roster(roomName, (c)=> c.ticksToLive > 50) : {})// roster of not dying
            .forEach((roster)=> {
                "use strict";
                _.keys(roster).forEach((k)=> currentSplit[k] = (currentSplit[k] || 0) + roster[k])
            }); // add the remote Roster

        if (creep.room.memory.remoteMining) {
            let remoteRoom = Game.rooms[creep.room.memory.remoteMining];

            if (remoteRoom) {
                let keeperLairs = remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});
                let safeSourcesAndMinerals = this.findSafeSources(remoteRoom, keeperLairs.length ? true : false);
                // creep.log('safeSourcesAndMinerals', safeSourcesAndMinerals.length);
                if (keeperLairs.length && creep.room.energyCapacityAvailable >= 1800) {
                    let dyingCount = remoteRoom.find(FIND_MY_CREEPS, {filter: (c)=> c.memory.role === 'keeperGuard'}).filter((c)=>c.ticksToLive < 100).length;
                    patterns['keeperGuard'].count = 3 + dyingCount;
                    patterns['roleCloseGuard'].count = 0;
                    patterns['roleRemoteGuard'].count = 0;
                    // creep.log('keeperGuards?',patterns['keeperGuard'].count,remoteRoster['keeperGuard']||0, dyingCount);
                }
                if (safeSourcesAndMinerals.length) {
                    // creep.log('remoteMining');
                    if (keeperLairs.length) {
                        if (currentSplit['keeperGuard'] > 0 && creep.room.energyCapacityAvailable >= 1800) {
                            // creep.log('keepers');
                            patterns['keeperHarvester'].count = Math.max(0, safeSourcesAndMinerals.length);
                            patterns['remoteCarryKeeper'].count = 3 * currentSplit['keeperHarvester'] || 0;
                        }
                    } else {
                        patterns['remoteHarvester'].count = Math.max(0, safeSourcesAndMinerals.filter((s)=> s instanceof Source).length);
                        patterns['roleRemoteGuard'].count = creep.room.memory.attack_min;
                        patterns['remoteCarry'].count = patterns['remoteHarvester'].count * 3;
                    }
                    patterns['remoteCarryKeeper'].count = (patterns['remoteCarryKeeper'].count || 0);
                    patterns['keeperHarvester'].count = (patterns['keeperHarvester'].count || 0);
                    patterns['remoteHarvester'].count = (patterns['remoteHarvester'].count || 0);
                    patterns['remoteCarry'].count = (patterns['remoteCarry'].count || 0);

                } else if (!keeperLairs.length) {
                    // creep.log('hostiles present, no remoteMining!');
                    patterns['roleRemoteGuard'].count = creep.room.memory.attack_min;
                    patterns['remoteHarvester'].count = 0; // scout it first !
                    patterns['remoteCarry'].count = 0; // scout it first !
                }
                patterns['scout'].count = currentSplit['scout'] ? 0 : 1; // scout it first !
            } else {
                patterns['scout'].count = 1; // scout it first !
                // creep.log('no remoteMining before scouting !');
                patterns['remoteHarvester'].count = 0; // scout it first !
                patterns['remoteCarry'].count = 0; // scout it first !
            }
        } else {
            patterns['remoteHarvester'].count = 0; // scout it first !
            patterns['remoteCarry'].count = 0; // scout it first !
        }

        if (creep.room.controller.level < 4 || !creep.room.memory.remotebuild) {
            patterns['remoteUpgrader'].count = 0;
        }
        if (creep.room.controller.level >= 4) {
            if (creep.room.storage && creep.room.storage.store.energy > 10000) {
                patterns['carry'].count = 0;
                patterns['energyFiller'].count = 2;
                patterns['energyGatherer'].count = 1;
            }
        }
        if (creep.room.controller.level >= 6 && creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}}).length > 0) {

            let minerals = creep.room.find(FIND_MINERALS);
            let storedMinerals = creep.room.storage.store;
            minerals.forEach((m)=> {
                if (storedMinerals[m.mineralType] < 100000 && m.mineralAmount) {
                    patterns['mineralHarvester'].count = 1;
                    // patterns['mineralGatherer'].count = 1;
                }
            });

        }
        if (!currentSplit['claimer'] && creep.room.memory.claim) {
            // creep.log('adjusting for claims');
            let remoteRoom = Game.rooms[creep.room.memory.claim];
            if (!remoteRoom || !remoteRoom.controller.my) {
                patterns['claimer'].count = 1;
            }
        } else {
            // creep.log('claimers', !currentSplit['claimer'], 'claim', creep.room.memory.claim);
        }
        if (creep.room.memory.remotebuild) {
            let remoteRoom = Game.rooms[creep.room.memory.remotebuild];
            if (!remoteRoom) {
                patterns['remoteBuilder'].count = 0;
            } else {
                if (remoteRoom.controller && !remoteRoom.controller.my) {
                    if (remoteRoom.find(FIND_CONSTRUCTION_SITES).length > 0) {
                        patterns['remoteBuilder'].count = Math.max(1, patterns['remoteBuilder'].count);
                    } else {
                        patterns['remoteBuilder'].count = 0;
                    }

                } else if (remoteRoom.controller && remoteRoom.controller.my && remoteRoom.find(FIND_MY_SPAWNS) == 0) {
                    patterns['remoteBuilder'].count = 3;
                } else if (remoteRoom.find(FIND_MY_SPAWNS) > 0) {
                    // creep.log('disabling remotebuilds');
                    patterns['remoteBuilder'].count = 3 - remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTENSION}}).length;
                } else {
                    patterns['remoteBuilder'].count = 1;
                }
            }
            // creep.log('remotebuilders', patterns['remoteBuilder'].count)
        } else {
            patterns['remoteBuilder'].count = 0;
        }
        if (creep.room.find(FIND_CONSTRUCTION_SITES, {filter: (c)=> STRUCTURE_EXTENSION === c.structureType}).length > 0) {
            patterns['upgrader'].count = 0;
        }

        if (creep.room.find(FIND_STRUCTURES, {filter:{structureType:STRUCTURE_CONTAINER}}).filter((s)=>_.sum(s.store)> s.store.energy).length >0) {
            patterns['mineralGatherer'].count = 1;
        } else if (currentSplit['mineralGatherer']||0 >0) {
            creep.find(FIND_MY_CREEPS, {filter: (c)=>c.memory.role === 'mineralGatherer'}).forEach((c)=>c.memory.role = 'energyFiller');
        }

        /*
         if (creep.room.storage && creep.room.controller.my && creep.room.controller.level < 8) {
         patterns['upgrader'] += (creep.room.storage.store.energy - 20000) / 10000;
         }
         */
        ['roleCloseGuard', 'roleRemoteGuard', 'keeperGuard'].forEach((role) => {
            'use strict';
            if (patterns[role].count) {
                if (creep.room.memory.attack) {
                    let room = Game.rooms[creep.room.memory.attack];
                    if (room) {
                        let matches = this.findCreepsMatching(room, patterns[role].memory);
                        let count = _.filter(matches, (c)=> c.ticksToLive > 150).length;
                        // creep.log('found', room.name, role, count);
                        patterns[role].count -= count;
                    }
                } else {
                    patterns[role].count = 0;
                }
                let matchingCreeps = this.findCreepsMatching(creep.room, patterns[role].memory);
                // creep.log('found', creep.room.name, role, matchingCreeps.length);
                // add the OTHERS , as they will be decreased (bug !)
                // creep.log('matching',role, matchingCreeps.length);
                patterns[role].count += ((currentSplit[role] || 0) - matchingCreeps.length);
            }
            // creep.log('corrected', role, patterns[role].count);
        });
        if (creep.room.memory.nomilitary) {
            patterns['roleCloseGuard'].count = 0;
            patterns['roleRemoteGuard'].count = 0;
        }
        let notDyingRoster = util.roster(creep.room, (c)=>c.ticksToLive > 50);
        // creep.log('correct harvester to ? ',  notDyingRoster['harvester']);
        // creep.log('correct carry to ? ',  notDyingRoster['carry']);
        currentSplit['harvester'] = notDyingRoster['harvester'];
        currentSplit['carry'] = notDyingRoster['carry'];
        if (!currentSplit['reserver'] && creep.room.memory.reserve) {
            // creep.log('adjusting for reserves');
            let remoteRoom = Game.rooms[creep.room.memory.reserve];
            if (remoteRoom) {
                let spawnReserve = ( !remoteRoom.controller || !remoteRoom.controller.reservation || creep.owner.username !== remoteRoom.controller.reservation.username)
                    || (remoteRoom.controller && remoteRoom.controller.reservation.ticksToEnd < 500);
                // creep.log('current reservation  ?', remoteRoom.name, JSON.stringify(remoteRoom.controller.reservation));
                // spawn reserver if  the room is not reserved, or due to expire soon
                if (spawnReserve) {
                    let currentReservers = remoteRoom.find(FIND_MY_CREEPS, {filter: (c)=> c.memory.role === 'reserver' && c.ticksToLive > 100});
                    patterns['reserver'].count = currentReservers.length == 0 ? 1 : 0;
                }
            }
        } else {
            // creep.log('reserver', !currentSplit['reserver'], 'reserve', creep.room.memory.reserver);
        }
        if (creep.room.storage) {
            patterns['upgrader'].count = patterns['upgrader'].count + Math.floor(creep.room.storage.store.energy) / 100000;
        }
        // currentSplit = _.mapValues(currentSplit, (v)=>{return v/creepCount;});
        // creep.log("currentSplit " , JSON.stringify(currentSplit));
        var required = {};


        // creep.log('targetCount', targetCount);
        var targetSplit = _.mapValues(patterns, (spec)=>spec.count);
        // creep.log('targetSplit ', JSON.stringify(targetSplit));
        /* required : {role : need filled%}*/
        _.keys(targetSplit).forEach((role)=> {
            targetSplit[role] -= (currentSplit[role] || 0);
        });
        let result = _.find(_.keys(targetSplit), (role) => (targetSplit[role] && targetSplit[role] > 0));
        // creep.log('no result?', JSON.stringify(targetSplit));
/*
        if (result) {
            creep.log('targetSplit-current', JSON.stringify(targetSplit));
        }
*/

        //function(role) {if (role) required[role] = (currentSplit[role]?currentSplit[role]:0)/targetSplit[role]});
        if (result /*targetSplit[result]>0*/) {
            return patterns[result];
        } else {
            let availableStorage = _.sum(creep.room.find(FIND_STRUCTURES, {filter: (c)=>c.store}), (c)=>c.storeCapacity - _.sum(c.store));
            return availableStorage < 1000 ? patterns['upgrader'] : null;

        }
        // var result = 'upgrader';
        // var roleScore = required[result];
        // _.keys(patterns).forEach(function(role) {if (roleScore > required[role]) {result = role; roleScore = required[result]}});
        // _.keys(patterns).forEach(function(role) {if (required[role]> currentSplit[role]) {result = role}});
        // if (!result) {result = 'harvester'};
        // return patterns[result];

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
        if (!buildSpec.memory || !buildSpec.body) {
            creep.log('ERROR, invalid create', JSON.stringify(buildSpec));
        }
        let creep2 = creep.createCreep(buildSpec.body, undefined, buildSpec.memory);
        if ('number' !== typeof creep2) {
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
        let idleCounters = creep.memory.idle || 0;
        let localRoster = util.roster(creep.room);
        let roomPatterns = _.cloneDeep(this.patterns);
        if (creep.memory.build && !creep.spawning) {
            creep.log('built', JSON.stringify(creep.memory.build));
            delete creep.memory.build;
        }
        this.updateNeeds(creep, roomPatterns);
        this.reassignCreeps(creep, roomPatterns);
        if (!(Game.time % 100)) this.buildTower(creep);
        if (creep.spawning) return;

        let myCreeps = creep.room.find(FIND_MY_CREEPS);
        var harvesters = _.filter(myCreeps, function (c) {
            return c.memory.role == 'harvester';
        });
        // creep.log('harvesters', harvesters.length);
        if ((harvesters.length < 2 || _.filter(harvesters, (c)=>c.ticksToLive > 100) < 2) && creep.room.energyAvailable > 250) {
            creep.log("emergency harvester");
            let spec = _.cloneDeep(roomPatterns.harvester);
            spec.body = this.shapeBody(creep, roomPatterns.harvester.body);
            this.createCreep(creep, spec);
            return;
        }
        if (((localRoster['carry'] || 0) + (localRoster['energyGatherer'] || 0) + (localRoster['energyFiller'] || 0) === 0) && creep.room.energyAvailable > 250) {
            let spec = _.cloneDeep(roomPatterns.carry);
            spec.body = this.shapeBody(creep, roomPatterns.carry.body);
            this.createCreep(creep, spec);
            // creep.log("emergency carry");
            return;
        }

        var energy = _.reduce(creep.room.find(FIND_SOURCES), function (total, source) {
            return total + source.energy
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
            idleCounters++;
            creep.memory.idle = idleCounters;
            return;
        }
        let perfectBodyCount = buildSpec.body.length;
        var full = this.isFull(creep);
        buildSpec.body = this.shapeBody(creep, buildSpec.body);
        if (!full) {
            if (perfectBodyCount == buildSpec.body.length) {
                this.createCreep(creep, buildSpec);
            } else {
                creep.memory.waitFull = (creep.memory.waitFull || 0) + 1;
            }
        } else {
            this.createCreep(creep, buildSpec);
        }
    }

};