var _ = require('lodash');
var util = require('./util');
var Decay = require('./util.decay'), decay = new Decay();
//  Game.spawns.Spawn1.createCreep([WORK, MOVE, WORK, WORK, WORK, WORK, ], undefined, {role:'harvester'})
let spawn = {
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
            body: [MOVE, CARRY, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/
                CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/],
            count: 1,
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
            body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE,
                WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE,],
            count: 1,
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
            body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, WORK, WORK, WORK,WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, WORK, WORK, WORK,
                WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, WORK, WORK, WORK,WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, WORK, WORK, WORK,],
            count: 1,
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
            body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */ WORK, MOVE,
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

    /***
     *
     * @param {number} available available energy to create the creep
     * @param perfectBody
     * @returns {{cost: number, body: [string]}}
     */
    shapeBody: function (available, perfectBody) {

        // adds the parts untill they can't be built
        var maxEnergy = available;
        var cost = 0;
        let max = 0;
        for (var i = 0; i < perfectBody.length && cost < maxEnergy; i++) {
            var part = perfectBody[i];
            if ((cost += this.BODY_COST[part]) <= maxEnergy) {
                max = i;
            }
        }

        let realBody = perfectBody.slice(0, max + 1);
        var newbody = _.sortBy(realBody, (part)=>this.BODY_ORDER.indexOf(part));
        // console.log('shapeBody', maxEnergy, cost, JSON.stringify(newbody));
        return {cost: cost, body: newbody};

    },

    /**
     *
     * @param {Room} room
     * @param {Object} roomPatterns
     */
    updateNeeds: function (room, roomPatterns) {
        if (_.size(room.find(FIND_MY_CONSTRUCTION_SITES)) == 0) {
            // room.log("NO NEED FOR BUILDERS");
            roomPatterns.builder.count = 0;
        }
        if (_.size(room.find(FIND_STRUCTURES, {
                filter: function (structure) {
                    return structure.hits < structure.hitsMax;
                }
            })) == 0) {
            roomPatterns.repair2.count = 0;
            // room.log("NO NEED FOR REPAIRERS");
        }

    },
    findSafeSources: function (remoteRoom) {
        return util.findSafeSources(remoteRoom);
    },
    findCreepsMatching: function (room, memory) {
        return _.filter(room.find(FIND_MY_CREEPS), (c)=> _.all(_.keys(memory), (k)=>memory[k] === c.memory[k]));
    },
    queue: function (room, queue, role, patterns, currentSplit, remoteRoster, upTo, memory) {
        'use strict';

        let __new = _.cloneDeep(patterns[role]);
        if (!__new) {
            room.log('ERROR ', 'no memory for ', role);
            room.log('pattern', JSON.stringify(patterns[role]));
            throw new Error('ERROR ' + 'no memory for ' + role);
        }
        _.merge(__new.memory, memory);
        let l = queue.length;
        let currentCount = 0 + (currentSplit[role] || 0) + (remoteRoster ? (remoteRoster[role] || 0) : 0);
        // room.log('queueing ',role, currentCount, 'to', upTo);
        for (let i = currentCount; i < upTo; i++) {
            queue.push(__new);
        }
        let queued = queue.length - l;
        // if (queued) room.log('queued ',queued, role);

    },
    remoteRoster: function (roomName, predicate) {
        return _.countBy(_.values(Game.creeps).filter((c)=>c.memory.remoteRoom === roomName && (predicate ? predicate(c) : true)), (c)=>c.memory.role);
    },
    availableEnergy: function (remoteRoom) {
        let droppedResources = remoteRoom.find(FIND_DROPPED_RESOURCES);
        // remoteRoom.log('droppedResources', droppedResources.length, droppedResources.length?JSON.stringify(droppedResources[0]):'');
        let total = _.sum(droppedResources, (r)=>r.amount);
        // if (total > 1000) return true;
        let containers = remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_CONTAINER}});
        total += _.sum(containers, (c)=>_.sum(c.store));
        // if (total > 1000) return true;
        return total;
    },
    addRemoteMiningToQueue: function (remoteRoomName, room, patterns, currentSplit, queue) {

        let remoteRoom = Game.rooms[remoteRoomName];
        let remoteRoster = this.remoteRoster(remoteRoomName, ((c)=>c.ticksToLive > 100));
        if (!room.memory.lastRemoteMiningUpdate || room.memory.lastRemoteMiningUpdate + 50 < Game.time) {
            room.memory.lastRemoteMiningUpdate = Game.time;
            if (remoteRoom) {
                // room.log('queueing for remoteMining', remoteRoom.name);
                let hasKeeperLairs = remoteRoom.hasKeeperLairs();
                /*remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});*/
                let safeSourcesAndMinerals = this.findSafeSources(remoteRoom, hasKeeperLairs);
                let roomDistance = util.roomDistance(room.name, remoteRoomName);
                // room.log('roomDistance', room.name, remoteRoomName, roomDistance);
                // room.log('safeSourcesAndMinerals', safeSourcesAndMinerals.length);
                if (hasKeeperLairs) {
                    if (room.energyCapacityAvailable >= 1800) {
                        this.queue(room, queue, 'keeperGuard', patterns, currentSplit, remoteRoster, 3, {remoteRoom: remoteRoomName});
                        // room.log('keeperGuards?',patterns['keeperGuard'].count,remoteRoster['keeperGuard']||0);
                    }
                }
                let energyReady = this.availableEnergy(remoteRoom);
                if (safeSourcesAndMinerals.length) {
                    // room.log('remoteMining');
                    if (hasKeeperLairs) {
                        if (remoteRoster['keeperGuard'] > 2 && room.energyCapacityAvailable >= 1800) {
                            this.queue(room, queue, 'keeperHarvester', patterns, currentSplit, remoteRoster, remoteRoom.find(FIND_SOURCES).length + remoteRoom.find(FIND_MINERALS).length, {remoteRoom: remoteRoomName});
                            this.queue(room, queue, 'remoteCarryKeeper', patterns, currentSplit, remoteRoster, (2 * remoteRoster['keeperHarvester'] || 0), {
                                remoteRoom: remoteRoomName,
                                action: 'go_remote_room'
                            });
                        }
                    } else {
                        if (energyReady < 2000) {
                            this.queue(room, queue, 'remoteHarvester', patterns, currentSplit, remoteRoster,
                                Math.max(0, safeSourcesAndMinerals.filter((s)=> s instanceof Source).length), {
                                    remoteRoom: remoteRoomName,
                                    action: 'go_remote_room'
                                });
                        }
                        room.log('remoteMining', remoteRoomName, 'energyReady',energyReady);
                        
                        if (energyReady > 1000) this.queue(room, queue, 'remoteCarry', patterns, currentSplit, remoteRoster, (3 * remoteRoster['remoteHarvester'] || 0), {
                            remoteRoom: remoteRoomName,
                            action: 'go_remote_room'
                        });
                        // estimate when invaders will come
                        // todo need to check if there are nearby neutral rooms, otherwise no invaders
                        // let exits = Game.map.describeExits(remoteRoomName);
                        // todo determine dynamically

                        if (room.memory.threatAssessment.harvested > 200000) { // looks like invaders never spawn in that room
                            let invaderExpectedIn = (100000 - room.memory.threatAssessment.harvested) / room.memory.threatAssessment.harvestRate;
                            let squadSize = 2;
                            let delayBeforeArriving = roomDistance * 50 + squadSize * patterns['roleSoldier'].body.length * 3;
                            /*
                             room.log('remoteRoom', remoteRoomName, 'harvested', room.memory.threatAssessment.harvested, 'harvestRate', room.memory.threatAssessment.harvestRate,
                             'invaderExpectedIn', invaderExpectedIn, 'delayBeforeArriving', delayBeforeArriving);
                             */
                            if (roomDistance && (invaderExpectedIn - delayBeforeArriving < 0 )) {
                                // room.log('queuing protection for', remoteRoomName, 'expected',invaderExpectedIn, 'delay',delayBeforeArriving);
                                this.queue(room, queue, 'roleSoldier', patterns, currentSplit, remoteRoster, squadSize, {remoteRoom: remoteRoomName});
                            } else if (!roomDistance) {
                                // shouldn't happen
                                room.log('no known path', remoteRoomName);
                            }
                        }
                    }
                } else if (!hasKeeperLairs) {
                    // room.log('hostiles present, no remoteMining!');
                    this.queue(room, queue, 'roleSoldier', patterns, currentSplit, remoteRoster, 2, {remoteRoom: remoteRoomName});
                }
                let spawnReserve = ( !(hasKeeperLairs) && remoteRoom.controller && (!remoteRoom.controller.reservation || room.controller.owner.username !== remoteRoom.controller.reservation.username)
                || (remoteRoom.controller && remoteRoom.controller.reservation.ticksToEnd < 500));
                // room.log('current reservation  ?', remoteRoom.name, JSON.stringify(remoteRoom.controller.reservation));
                // spawn reserver if  the room is not reserved, or due to expire soon
                if (spawnReserve) {
                    this.queue(room, queue, 'reserver', patterns, currentSplit, remoteRoster, 1, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });
                }

                this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {
                    remoteRoom: remoteRoomName,
                    action: 'go_remote_room'
                });
            } else {
                // room.log('queueing scout for remoteMining', remoteRoomName);
                this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {
                    remoteRoom: remoteRoomName,
                    action: 'go_remote_room'
                });
            }
        }
    },

    whatToBuild: function (patterns, room) {
        let queue = [];
        if (room.controller && room.controller.my && room.controller.level < 2) {
            return patterns['upgrader'];
        }
        var currentSplit = util.roster(room, (c)=> c.ticksToLive > 50 && !c.memory.remoteRoom);
        _.values(room.memory.building).forEach((spec)=>currentSplit[spec.memory.role]++);
        // room.log('initial split', JSON.stringify(currentSplit));
        // room.log('correct harvester to ? ',  notDyingRoster['harvester']);
        // room.log('correct carry to ? ',  notDyingRoster['carry']);
        /*        _.uniq(['remoteMining', 'attack', 'remotebuild', 'claim', 'reserve']
         .map((mem)=>room.memory[mem])) // don't count several times the same room
         .map((roomName)=> roomName ? util.roster(roomName, (c)=> c.ticksToLive > 50) : {})// roster of not dying
         .forEach((roster)=> {
         'use strict';
         _.keys(roster).forEach((k)=> currentSplit[k] = (currentSplit[k] || 0) + roster[k]);
         });*/ // add the remote Roster

        if (room.memory.remoteMining) {
            let remoteRoomName = room.memory.remoteMining;
            let rooms = _.isString(remoteRoomName) ? [room.memory.remoteMining] : room.memory.remoteMining;
            // room.log('rooms', JSON.stringify(rooms));
            rooms.forEach((name)=>this.addRemoteMiningToQueue(name, room, patterns, currentSplit, queue));
        }

        if (room.controller.level > 4 && room.memory.claim) {
            let rooms = _.isString(room.memory.claim) ? [room.memory.claim] : room.memory.claim;
            let remoteRoster = this.remoteRoster(room.memory.claim);
            roooms.forEach((room)=> {
                'use strict';
                let remoteRoom = Game.rooms[room];
                if (remoteRoom && remoteRoom.controller && !remoteRoom.controller.my) {
                    this.queue(room, queue, 'claimer', patterns, currentSplit, remoteRoster, 1, {
                        remoteRoom: room,
                        action: 'go_remote_room'
                    });
                } else if (remoteRoom && remoteRoom.controller && remoteRoom.controller.my && remoteRoom.controller.level < 3) {
                    let remoteRoster = util.roster(remoteRoom, (c)=> c.ticksToLive > 100);
                    this.queue(room, queue, 'remoteUpgrader', patterns, currentSplit, remoteRoster, 2, {
                        remoteRoom: room,
                        action: 'go_remote_room'
                    });
                }
            });
        }
        if (room.memory.remotebuild) {
            let rooms = _.isString(room.memory.remotebuild) ? [room.memory.remotebuild] : room.memory.remotebuild;
            rooms.forEach((roomName)=> {
                'use strict';
                let remoteRoom = Game.rooms[roomName];
                if (!remoteRoom) {
                    patterns['remoteBuilder'].count = 0;
                } else {
                    let remoteRoster = util.roster(remoteRoom, (c)=> c.ticksToLive > 100);
                    if (!(remoteRoom.controller) || (remoteRoom.controller && !remoteRoom.controller.my)) {
                        let constructionSites = remoteRoom.find(FIND_CONSTRUCTION_SITES);
                        if (constructionSites.length > 0) {
                            let wantedBuilderCount = constructionSites.find((site)=>site.structureType == STRUCTURE_SPAWN) ? 3 : 1;
                            // room.log('queueing remoteBuilders', wantedBuilderCount);
                            this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, wantedBuilderCount, {
                                remoteRoom: roomName,
                                action: 'go_remote_room'
                            });
                        }
                    } else if (remoteRoom.controller && remoteRoom.controller.my && remoteRoom.find(FIND_MY_SPAWNS) == 0) {
                        // room.log('queueing remoteBuilders', wantedBuilderCount);
                        this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 3, {
                            remoteRoom: roomName,
                            action: 'go_remote_room'
                        });
                    } else if (remoteRoom.find(FIND_MY_SPAWNS) > 0) {
                        // room.log('disabling remotebuilds');
                        this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 3 - remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTENSION}}).length
                            , {remoteRoom: roomName, action: 'go_remote_room'});
                    }
                }
            });
            // room.log('remotebuilders', patterns['remoteBuilder'].count)
        }


        if (room.controller.level >= 4) {
            if (room.storage) {
                if (room.storage.store.energy < 10000) {
                    patterns['upgrader'].count = 0;
                } else {
                    patterns['upgrader'].count = Math.floor(Math.min(room.storage.store.energy / 10000, 2));
                }
                if (room.storage.store.energy > 5000) {
                    patterns['carry'].count = 0;
                    patterns['energyFiller'].count = 2;
                    patterns['energyGatherer'].count = 1;
                } else {
                    // patterns['carry'].count = 2;
                }
            }
            // room.log('upgrader set', patterns['upgrader'].count);

        }
        if (room.controller.level >= 6) {
            if (room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}}).length > 0) {
                let find = room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) > 1000 && s.store.energy !== _.sum(s.store)});
                if (find.length) {
                    patterns['mineralGatherer'].count = 1;
                    room.log('containers with minerals', find.length, find[0].id);
                }

                if (room.storage && room.storage.store.energy > 10000) {
                    let minerals = room.find(FIND_MINERALS);
                    let storedMinerals = room.storage.store;
                    minerals.forEach((m)=> {
                        // room.log('mineral', m.mineralType, storedMinerals[m.mineralType], storedMinerals[m.mineralType] < 100000, m.mineralAmount);
                        if (!(storedMinerals[m.mineralType]) || storedMinerals[m.mineralType] < 100000 && m.mineralAmount) {
                            patterns['mineralHarvester'].count = 1;
                        }
                    });
                }
                // room.log('mineralHarvester?', patterns['mineralHarvester'].count);

            }
            let labs = room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LAB}});
            if (labs.length > 0
                && (labs.find((lab)=>lab.mineralAmount < 0.1 * lab.mineralCapacity // empty labs
                        && room.storage.store[room.expectedMineralType(lab)] // but available minerals
                    ) || labs.find((lab)=>lab.mineralAmount > 0.9 * lab.mineralCapacity) // full labs
                )
            ) {
                patterns['labOperator'].count = 1;
            }
        }

        if (room.storage) {
            patterns['upgrader'].count = patterns['upgrader'].count + Math.floor(room.storage.store.energy) / 100000;
        } else {
            let nonFullStructures = room.find(FIND_STRUCTURES,
                {filter: (s)=>((s.energyCapacity && s.energy !== s.energyCapacity) || (s.storeCapacity && _.sum(s.store) !== s.storeCapacity))})
                .filter((s)=>((!room.memory.harvestContainers || room.memory.harvestContainers.indexOf(s.id) < 0)));
            if (!nonFullStructures.length) {
                room.log('energy overflowing, upgrader');
                patterns['upgrader'].count = (currentSplit['upgrader'] || 0) + 1;
            } else {
                // room.log('nonFullStructures',JSON.stringify(nonFullStructures.map((s)=>s.pos)),nonFullStructures.length);
            }
        }
        if (room.find(FIND_CONSTRUCTION_SITES, {filter: (c)=> STRUCTURE_EXTENSION === c.structureType}).length > 0) {
            patterns['builder'].count = (0 || patterns['builder'].count) + patterns['upgrader'].count;
            patterns['upgrader'].count = 0;
        }
        // room.log("currentSplit " , JSON.stringify(currentSplit));
        // room.log("targetSplit" , JSON.stringify(_.values(patterns).map((p)=>({role:p.memory.role, count: p.count})).filter((e)=>e.count)));

        _.keys(patterns)
        // .forEach((role)
        // ['harvester', 'carry', 'energyFiller', 'energyGatherer', 'builder', 'repair2', 'mineralHarvester', 'mineralGatherer', 'upgrader']
            .forEach((role)=> {

                'use strict';
                let count = patterns[role].count;
                if (count > 0) {
                    // if (['harvester', 'carry', 'energyFiller', 'energyGatherer', 'builder', 'repair2', 'mineralHarvester', 'mineralGatherer', 'upgrader'].indexOf(role) < 0) {
                    //     room.log('want ', role, count, currentSplit[role]);
                    // } else
                    this.queue(room, queue, role, patterns, currentSplit, undefined, patterns[role].count, {});
                }
            });
        // currentSplit = _.mapValues(currentSplit, (v)=>{return v/creepCount;});
        // if (queue.length) room.log('queuePriorities', JSON.stringify(queue.map((e)=>e.priority)));
        queue = _.sortBy(queue, (elem)=> elem.priority);
        // if (queue.length) room.log('queuePriorities afterSort', JSON.stringify(queue.map((e)=>e.priority)));
        // if (queue.length) room.log('queue', JSON.stringify(queue.map((e)=>({priority:e.priority,memory:e.memory}))));
        room.memory.queueLength = queue.length;
        room.memory.queue = _.countBy(queue, (pat)=>pat.memory.role);
        // if (queue.length) room.log('queued ', JSON.stringify(_.countBy(queue, (c)=>c.memory.role)));
        return queue;
    },
    reassignCreeps: function (room, roomPatterns) {
        "use strict";
        // todo
    },
    buildTower: function (room) {
        "use strict";
        if (room.controller && room.controller.my && room.controller.level >= 3 && room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).length == 0) {
            let towerFlags = room.find(FIND_FLAGS, {filter: {color: COLOR_PURPLE}});
            if (towerFlags.length > 0) {
                let lookFor = towerFlags[0].pos.lookFor(LOOK_CONSTRUCTION_SITES);
                if (!lookFor.length) {
                    room.createConstructionSite(towerFlags[0].pos, STRUCTURE_TOWER);
                }
            }
        }

    },
    createCreep: function (creep, buildSpec) {
        // creep.log('createCreep', JSON.stringify(buildSpec));
        if (!buildSpec.memory || !buildSpec.body) {
            creep.log('ERROR, invalid create', JSON.stringify(buildSpec));
        }
        let name = buildSpec.memory.role + '_' + Game.time % 1500;
        let canCreate = creep.createCreep(buildSpec.body, name, buildSpec.memory);
        // if (canCreate === ERR_NAME_EXISTS) name = creep.room.name + '_' + name; // todo if it ever happens ...
        if ('number' !== typeof canCreate) {
            this.updateCounters(creep, {spawning: 1});
            creep.log("building ", creep.room.energyAvailable, creep.room.energyCapacityAvailable, JSON.stringify(_.countBy(buildSpec.body)), JSON.stringify(buildSpec.memory));
            creep.memory.build = {start: Game.time, name: canCreate, memory: buildSpec.memory};
            creep.room.memory.building = creep.room.memory.building || {};
            creep.room.memory.building[creep.memory.build.name] = creep.memory.build;
        } else if (ERR_NAME_EXISTS === canCreate) {
            Game.notify('name conflict ' + name);
            creep.log('name conflict ' + name);
        } else {
            creep.log('create?', canCreate);
        }
    },

    run: function (room) {
        "use strict";
        let localRoster = util.roster(room);

        let spawns = room.find(FIND_MY_SPAWNS, {
            filter: (spawn)=> {
                if (spawn.spawning) {
                    this.updateCounters(room, {spawning: 1});
                    // spawn.log('adding to localRoster', spawn.memory.build.memory.role);
                    localRoster[spawn.memory.build.memory.role] = localRoster[spawn.memory.build.memory.role] + 1;
                    return false;
                } else {
                    if (spawn.memory.build && spawn.memory.build.name) {
                        delete room.memory.building[spawn.memory.build.name];
                    }
                    return true;
                }
            }
        });
        if (!(Game.time % 100)) this.buildTower(room);
        if (spawns.length === 0) {
            // creep.log('spawning');
            return;
        }
        let roomPatterns = _.cloneDeep(this.patterns);
        this.updateNeeds(room, roomPatterns);
        this.reassignCreeps(room, roomPatterns);

        let myCreeps = room.find(FIND_MY_CREEPS);
        var harvesters = _.filter(myCreeps, (c) =>c.memory.role == 'harvester');

        var energy = _.reduce(room.find(FIND_SOURCES), (total, source)=>total + source.energy);
        if (energy == 0) {
            room.log('LIMITING CREEPS ', _.size(myCreeps) - 1);
            this.maxCreeps = _.size(myCreeps) - 1;
        }

        let available = room.energyAvailable;

        // creep.log('harvesters', harvesters.length);
        let needEmergencyHarvester = (harvesters.length < room.find(FIND_SOURCES).length || _.filter(harvesters, (c)=>c.ticksToLive > 50) < 2) && room.energyAvailable > 250;
        let needEmergencyCarry = (localRoster['carry'] || 0) + (localRoster['energyGatherer'] || 0) + (localRoster['energyFiller'] || 0) === 0;
        let queue = this.whatToBuild(roomPatterns, room);
        // room.log('queue', JSON.stringify(_.countBy(queue, (e)=>e.memory.role)));
        // TODO if drop containers are > 75% increase creep count ?
        spawns.forEach((spawn) => {
            let shapedAndCost, buildSpec;
            let waitFull = false;
            if (needEmergencyHarvester) {
                if (queue[0].memory.role === 'harvester') {
                    buildSpec = queue.shift();
                } else {
                    buildSpec = roomPatterns.harvester;
                }
                shapedAndCost = this.shapeBody(available, buildSpec.body);
            } else if (queue.length) {
                if (queue.length > 1 && queue[0].memory.role == 'keeperGuard') {
                    let queued = queue.filter((spec)=>spec.memory.role == 'keeperGuard').length;
                    let keeperCost = _.sum(queue[0].body, (part=>this.BODY_COST[part]));
                    let maxAffordable = Math.floor(room.energyCapacityAvailable / keeperCost);
                    if (Math.min(queued, maxAffordable) * keeperCost <= room.energyAvailable) {
                        // ok
                        buildSpec = queue.shift();
                        shapedAndCost = this.shapeBody(available, buildSpec.body);
                    } else {
                        // wait so we can group spawns rather than have them waiting for brothers
                        waitFull = true;
                    }
                }
                buildSpec = queue.shift();
                shapedAndCost = this.shapeBody(available, buildSpec.body);
            }
            if (buildSpec && shapedAndCost) {
                if (shapedAndCost.body.length == buildSpec.body.length) {
                    // room.log('can fully afford, building', shapedAndCost.cost, JSON.stringify(shapedAndCost.body));
                    // ok cn fully afford
                    available -= shapedAndCost.cost;
                    buildSpec.body = shapedAndCost.body;
                    this.createCreep(spawn, buildSpec);
                } else if (_.sum(buildSpec.body.slice(0, shapedAndCost.body.length + 1), (part=>this.BODY_COST[part])) > room.energyCapacityAvailable) {
                    //  this is the max we can build anyway
                    // room.log('best we can do ..., building', shapedAndCost.cost, JSON.stringify(shapedAndCost.body));
                    available -= shapedAndCost.cost;
                    buildSpec.body = shapedAndCost.body;
                    this.createCreep(spawn, buildSpec);
                } else {
                    // room.log('we can afford if we wait', available, shapedAndCost.cost, _.sum(buildSpec.body, (part=>this.BODY_COST[part])), JSON.stringify(shapedAndCost.body));
                    this.updateCounters(spawn, {waitFull: 1});
                    queue.unshift(buildSpec);
                }
            } else if (waitFull) {
                this.updateCounters(spawn, {waitFull: 1});
            } else {
                this.updateCounters(spawn, {idle: 1});
            }
        });
        let base = {idle: 0, waitFull: 0, spawning: 0};
        _.keys(base).forEach((k)=> {
            // sum the bits for each spawns 
            Memory['room.' + room.name + '.spawns.' + k] = _.sum(room.find(FIND_MY_SPAWNS), (s)=> s.memory.spawns[k]);
        });

    },
    updateCounters: function (spawn, o) {
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
            if (!spawn.memory.spawns) {
                spawn.memory.spawns = {};
            }
            if (!spawn.memory.spawns[k + 'Bits']) {
                spawn.memory.spawns[k + 'Bits'] = new Array(50);
                _.fill(spawn.memory.spawns[k + 'Bits'], 0);
            }
            let old = spawn.memory.spawns[k + 'Bits'][j];
            spawn.memory.spawns[k + 'Bits'][j] = (spawn.memory.spawns[k + 'Bits'][j] << 1) | base[k];
            spawn.memory.spawns[k] = _.sum(spawn.memory.spawns[k + 'Bits'], (x)=> countBits(x));
            // room.log('setting bit', k, old, room.memory.spawns[k + 'Bits'][j]);
        });


        // creep.memory[]
    }

};
let p = 0;
_.keys(spawn.patterns).forEach((k)=> spawn.patterns[k].priority = p++);

module.exports = spawn;