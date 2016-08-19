var _ = require('lodash');
var util = require('./util');
var layout = require('./layout');

//  Game.spawns.Spawn1.createCreep([WORK, MOVE, WORK, WORK, WORK, WORK, ], undefined, {role:'harvester'})
class RoleSpawn {
    constructor() {
        this.patterns = {
            'harvester': {
                body: [MOVE, WORK, WORK, WORK, WORK, WORK,],
                count: 2,
                scale: false,
                memory: {role: 'harvester'}
            },
            'carry': {
                body: [MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
                    MOVE, CARRY, CARRY, MOVE, CARRY, CARRY],
                count: 2,
                scale: false,
                memory: {role: 'carry'}
            },
            'energyFiller': {
                body: [MOVE, CARRY, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/
                    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/],
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
                body: [WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE,
                    CARRY, WORK, MOVE, WORK, CARRY, WORK, CARRY, MOVE, CARRY, WORK,
                    CARRY, CARRY, WORK, WORK, CARRY, WORK, CARRY, MOVE, CARRY, WORK,
                    MOVE],
                count: 0,
                scale: true,
                memory: {role: 'builder'}
            },
            'dismantler': {
                body: [WORK, WORK, WORK, WORK,
                    MOVE, MOVE, CARRY, CARRY],
                count: 0,
                scale: true,
                memory: {role: 'dismantler'}
            },
            'repair2': {
                body: [WORK, MOVE, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE,
                    CARRY, WORK, MOVE, MOVE, /*WORK, CARRY, MOVE, CARRY, WORK, MOVE,
                     MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK*/],
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
            /* role taken by labOperator
             'mineralGatherer': {
             body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /!* 300 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 600 *!/
             CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 900 *!//!*CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, *!//!* 1200 *!/],
             count: 0,
             scale: false,
             memory: {role: 'mineralGatherer'}
             },
             */
            'labOperator': {
                body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/],
                count: 0,
                scale: false,
                memory: {role: 'labOperator'}
            },
            'upgrader': {
                body: [MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
                    MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
                    MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
                    MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY],
                count: 2,
                scale: true,
                memory: {role: 'upgrader'}
            },
            'scout': {body: [MOVE], count: 0, scale: false, memory: {role: 'scout'}},
            'roleSoldier': {
                body: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE,
                    MOVE,
                    ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
                    HEAL, MOVE, HEAL, MOVE],
                count: 0,
                scale: true,
                memory: {role: 'roleSoldier', type: 'close'}
            },
            'roleRemoteGuard': {
                body: [TOUGH, TOUGH, MOVE, MOVE, MOVE, RANGED_ATTACK, MOVE, HEAL,
                    MOVE, RANGED_ATTACK, MOVE, HEAL
                ],
                count: 0,
                scale: true,
                memory: {role: 'roleRemoteGuard', type: 'remote'}
            },
            'claimer': {body: [MOVE, CLAIM, MOVE, CLAIM,], count: 0, scale: true, memory: {role: 'claimer'}},
            'reserver': {body: [MOVE, CLAIM, MOVE, CLAIM,], count: 0, scale: true, memory: {role: 'reserver'}},
            // 'remoteHarvester': {body: [CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE,WORK, MOVE, CARRY,MOVE, WORK, MOVE,MOVE,CARRY], scale:true, count: 2, memory: {role: 'remoteHarvester'}},
            'remoteHarvester': {
                body: [MOVE, MOVE, MOVE, CARRY, WORK, WORK, WORK, WORK, MOVE, WORK, MOVE, WORK],
                scale: true,
                count: 0,
                memory: {role: 'remoteHarvester'}
            },
            'remoteCarry': {
                body: [MOVE, WORK,
                    CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                    CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                    CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                    CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                ],
                count: 0,
                scale: false,
                memory: {role: 'remoteCarry'}
            },
            'mineralTransport': {
                body: [MOVE, WORK,
                    CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                    CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                    CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                    CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                ],
                count: 0,
                scale: false,
                memory: {role: 'mineralTransport'}
            },
            'remoteUpgrader': {
                body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE],
                count: 0,
                scale: true,
                memory: {role: 'remoteUpgrader'}
            },
            /*
             'keeperGuard': {
             body: [MOVE, HEAL, MOVE, HEAL, MOVE, HEAL, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
             MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK],
             count: 0,
             scale: true,
             memory: {role: 'keeperGuard'}
             },
             */
            'keeperGuard': {
                body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,  //7
                    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, //15
                    ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,//17
                    HEAL, HEAL, HEAL, HEAL, HEAL, HEAL], //6
                count: 0,
                scale: true,
                memory: {role: 'keeperGuard'}
            },
            'remoteCarryKeeper': {
                body: [TOUGH, HEAL, MOVE, MOVE, CARRY, WORK, MOVE, CARRY, CARRY, MOVE,
                    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
                    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY],
                count: 0,
                scale: false,
                memory: {role: 'remoteCarryKeeper'}
            },
            'keeperHarvester': {
                body: [MOVE, CARRY, MOVE, MOVE, WORK, WORK, WORK, HEAL, HEAL, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, WORK, HEAL],
                scale: true,
                count: 0,
                memory: {role: 'keeperHarvester'}
            },
            'remoteBuilder': {
                body: [WORK, MOVE, CARRY, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE, CARRY, MOVE, WORK, MOVE],
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
            'towerDrainer': {
                body: [TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
                    TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
                    TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
                    TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
                    TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,],
                count: 0,
                scale: true,
                memory: {role: 'towerDrainer'}
            }

            // 'attack': {body: [WORK, CARRY, MOVE, ATTACK, CARRY, MOVE,ATTACK , MOVE,WORK, CARRY, MOVE, ATTACK, CARRY, ATTACK, MOVE,MOVE], count: 1, memory: {role: 'attack'}},
        };
        let p = 0;
        _.keys(this.patterns).forEach((k)=> this.patterns[k].priority = p++);

        this.BODY_ORDER = [TOUGH, WORK, CARRY, MOVE, ATTACK, HEAL, RANGED_ATTACK, CLAIM];
    }

    /***
     *
     * @param {number} available available energy to create the creep
     * @param perfectBody
     * @returns {{cost: number, body: [string]}}
     */
    shapeBody(available, perfectBody) {

        // adds the parts untill they can't be built
        var maxEnergy = available;
        var cost = 0;
        let max = 0;
        for (var i = 0; i < perfectBody.length && cost < maxEnergy; i++) {
            var part = perfectBody[i];
            if ((cost += BODYPART_COST[part]) <= maxEnergy) {
                max = i;
            }
        }

        let realBody = perfectBody.slice(0, max + 1);
        var newbody = _.sortBy(realBody, (part)=>this.BODY_ORDER.indexOf(part));
        // console.log('shapeBody', maxEnergy, cost, JSON.stringify(newbody));
        return {cost: cost, body: newbody};

    }

    /**
     *
     * @param {Room} room
     * @param {Object} roomPatterns
     */
    updateNeeds(room, roomPatterns) {
        /*
         if (_.size(room.find(FIND_MY_CONSTRUCTION_SITES)) == 0) {
         // room.log("NO NEED FOR BUILDERS");
         roomPatterns.builder.count = 0;
         }
         */
        if (room.find(FIND_STRUCTURES, {filter: (structure) => structure.hits < structure.hitsMax}).length == 0) {
            roomPatterns.repair2.count = 0;
            // room.log("NO NEED FOR REPAIRERS");
        }

    }

    /**
     *
     * @param {Room} remoteRoom
     * @returns {*}
     */
    findSafeSources(remoteRoom) {
        // if (remoteRoom.find(FIND_HOSTILE_CREEPS).filter((c)=>c.owner.username !== 'Invader' && c.owner.invader !== 'Source Keeper').length > 0) return [];
        // else
        return util.findSafeSources(remoteRoom);
    }

    findCreepsMatching(room, memory) {
        return _.filter(room.find(FIND_MY_CREEPS), (c)=> _.all(_.keys(memory), (k)=>memory[k] === c.memory[k]));
    }

    queue(room, queue, role, patterns, currentSplit, remoteRoster, upTo, memory) {
        'use strict';

        let __new = _.cloneDeep(patterns[role]);
        if (!__new) {
            room.log('ERROR ', 'no memory for ', role);
            room.log('pattern', JSON.stringify(patterns[role]));
            throw new Error('ERROR ' + 'no memory for ' + role);
        }
        // if ('remoteCarry' === role) {
        //     room.log('queueing remoteCarry', (currentSplit[role] || 0), (remoteRoster ? (remoteRoster[role] || 0) : 0), upTo);
        // }
        _.merge(__new.memory, memory);
        let l = queue.length;
        let currentCount = 0 + (currentSplit[role] || 0) + (remoteRoster ? (remoteRoster[role] || 0) : 0);
        // room.log('queueing ',role, currentCount, 'to', upTo);
        for (let i = currentCount; i < upTo; i++) {
            queue.push(__new);
        }
        let queued = queue.length - l;
        // if ('remoteCarry' === role) room.log('queued ',queued, role);

    }

    remoteRoster(roomName, predicate) {
        return _.countBy(_.values(Game.creeps).filter((c)=>c.memory.remoteRoom === roomName && (predicate ? predicate(c) : true)), (c)=>c.memory.role);
    }

    availableEnergy(remoteRoom) {
        let droppedResources = remoteRoom.find(FIND_DROPPED_RESOURCES);
        // remoteRoom.log('droppedResources', droppedResources.length, droppedResources.length?JSON.stringify(droppedResources[0]):'');
        let total = _.sum(droppedResources, (r)=>r.amount);
        // if (total > 1000) return true;
        let containers = remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_CONTAINER}});
        total += _.sum(containers, (c)=>_.sum(c.store));
        // if (total > 1000) return true;
        return total;
    }

    carryCapacity(room, buildSpec) {
        "use strict";
        let body = this.shapeBody(room.energyCapacityAvailable, buildSpec.body).body;
        return (_.countBy(body)[CARRY] || 0) * 50;
    }

    /**
     *
     * @param {string} remoteRoomName
     * @param {Room} room
     * @param {Object} patterns
     * @param {Object} currentSplit
     * @param {Object[]}queue
     * @returns {number}
     */
    addRemoteMiningToQueue(remoteRoomName, room, patterns, currentSplit, queue) {
        let previousQueueLength = queue.length;
        let remoteRoom = Game.rooms[remoteRoomName];
        let tripTimeToSources = room.tripTimeToSources(remoteRoomName);
        let remoteRoster = this.remoteRoster(remoteRoomName, ((c)=>c.ticksToLive > (tripTimeToSources || 0) + 50 ));
        var requiredCarry = function (safeSourcesAndMinerals) {
            if (!tripTimeToSources) return 1;
            let carryTransportTime = 3 * tripTimeToSources; // TODO approximate distance from exit to source
            let carryCapacityWithTransport = this.carryCapacity(room, patterns['remoteCarry']) * 1500 / carryTransportTime;
            let requiredCarryCount = Math.ceil(5 * _.sum(safeSourcesAndMinerals, (s)=>s.energyCapacity) / carryCapacityWithTransport);
            return requiredCarryCount;
        };
        if ('number' === typeof room.memory.lastRemoteMiningUpdate) {
            delete room.memory.lastRemoteMiningUpdate;
        }
        let updateMem = room.memory.lastRemoteMiningUpdate = room.memory.lastRemoteMiningUpdate || {};
        updateMem[remoteRoomName] = updateMem[remoteRoomName] || {};
        if (!updateMem[remoteRoomName] || !updateMem[remoteRoomName].when || updateMem[remoteRoomName].when + 20 < 0 || updateMem[remoteRoomName].when + 20 < Game.time/*true*/) {
            updateMem[remoteRoomName].when = Game.time;
            if (remoteRoom) {
                // room.log('queueing for remoteMining', remoteRoom.name);
                let hasKeeperLairs = remoteRoom.hasKeeperLairs();
                /*remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});*/
                let safeSourcesAndMinerals = this.findSafeSources(remoteRoom, hasKeeperLairs);
                let roomDistance = util.roomDistance(room.name, remoteRoomName);
                // room.log('roomDistance', room.name, remoteRoomName, roomDistance);
                // room.log('safeSourcesAndMinerals', safeSourcesAndMinerals.length);
                if (hasKeeperLairs && !room.memory.nomilitary) {
                    if (room.energyCapacityAvailable >= 1800) {
                        this.queue(room, queue, 'keeperGuard', patterns, {}, remoteRoster, 3, {remoteRoom: remoteRoomName});
                        // room.log('keeperGuards?',patterns['keeperGuard'].count,remoteRoster['keeperGuard']||0);
                    }
                }
                if (remoteRoom.memory.guards && !room.memory.nomilitary) {
                    _.pairs(remoteRoom.memory.guards).forEach((roleAndCount)=> {
                        this.queue(room, queue, roleAndCount[0], patterns, {}, remoteRoster, roleAndCount[1], {remoteRoom: remoteRoomName});
                    });
                }
                let energyReady = this.availableEnergy(remoteRoom);
                // room.log('remoteMining', energyReady, safeSourcesAndMinerals.length, hasKeeperLairs);
                if (safeSourcesAndMinerals.length) {
                    if (hasKeeperLairs) {
                        if (remoteRoster['keeperGuard'] > 2 && room.energyCapacityAvailable >= 1800) {
                            // build carry for the existing harvesters before more harvesters
                            if ((remoteRoster['remoteCarryKeeper'] || 0) == (2 * remoteRoster['keeperHarvester'] || 0)) {
                                this.queue(room, queue, 'keeperHarvester', patterns, {}, remoteRoster, remoteRoom.find(FIND_SOURCES).length + remoteRoom.find(FIND_MINERALS).length, {remoteRoom: remoteRoomName});
                            }
                            this.queue(room, queue, 'remoteCarryKeeper', patterns, {}, remoteRoster, requiredCarry.call(this, safeSourcesAndMinerals), {
                                remoteRoom: remoteRoomName,
                                action: 'go_remote_room'
                            });
                        }
                    } else {
                        /**
                         * during a cycle of 1500 ticks
                         * carry transport time = 3* (distance to room+ distance in room)
                         * carry capacity = carryCapacity * 1500/carry transport time
                         * carry required = energy produced (sources * source.max)/ carryCapacity
                         */
                            // room.log('queueing',remoteRoomName, 'remoteHarvester', Math.max(0, safeSourcesAndMinerals.length));
                        let sampleSource = safeSourcesAndMinerals.find((s) => s instanceof Source);
                        let requiredHarvestPerTick = sampleSource.energyCapacity / 300;
                        let requiredWorkParts = Math.ceil(requiredHarvestPerTick / HARVEST_POWER); // TODO update when boosting is possible
                        // room.log('remoteHarvester work needed', remoteRoomName, requiredWorkParts);
                        let body = [MOVE, CARRY];
                        for (let i = 0; i < requiredWorkParts; i++) {
                            body.push(MOVE);
                            body.push(WORK);
                        }
                        // room.log('harvester body ', requiredHarvestPerTick, requiredWorkParts, JSON.stringify(body));
                        let oldBody = patterns['remoteHarvester'].body;
                        patterns['remoteHarvester'].body = body;
                        // room.log('queueing remote harvesters', remoteRoomName, safeSourcesAndMinerals.length);
                        this.queue(room, queue, 'remoteHarvester', patterns, {}, remoteRoster,
                            Math.max(0, safeSourcesAndMinerals.filter((s)=>s.energyCapacity || s.mineralAmount).length), {
                                remoteRoom: remoteRoomName,
                                action: 'go_remote_room'
                            });
                        patterns['remoteHarvester'].body = oldBody;
                        // room.log('remoteMining', remoteRoomName, 'energyReady', energyReady);
                        var requiredCarryCount = requiredCarry.call(this, safeSourcesAndMinerals);
                        // room.log(`remoteMiningCarryNeeed ${remoteRoomName}, required ${requiredCarryCount} ,current ${remoteRoster['remoteCarry']}`);
                        // if (energyReady > 1000) {
                        this.queue(room, queue, 'remoteCarry', patterns, {}, remoteRoster, requiredCarryCount, {
                            remoteRoom: remoteRoomName,
                            action: 'go_remote_room'
                        });
                        // }
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
                                // this.queue(room, queue, 'roleSoldier', patterns, currentSplit, remoteRoster, squadSize, {remoteRoom: remoteRoomName}); // TODO
                            } else if (!roomDistance) {
                                // shouldn't happen
                                room.log('no known path', remoteRoomName);
                            }
                        }
                    }
                } else if (!hasKeeperLairs && !room.memory.nomilitary) {
                    // room.log('hostiles present, no remoteMining!');
                    this.queue(room, queue, 'roleSoldier', patterns, {}, remoteRoster, 1, {remoteRoom: remoteRoomName});
                }
                let spawnReserve = ( !(hasKeeperLairs) && remoteRoom.controller && (!remoteRoom.controller.reservation || room.controller.owner.username !== remoteRoom.controller.reservation.username)
                || (remoteRoom.controller && remoteRoom.controller.reservation.ticksToEnd < 500));
                // room.log('current reservation  ?', remoteRoom.name, JSON.stringify(remoteRoom.controller.reservation));
                // spawn reserver if  the room is not reserved, or due to expire soon
                if (spawnReserve && room.energyCapacityAvailable > BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]) {
                    this.queue(room, queue, 'reserver', patterns, {}, remoteRoster, 1, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });
                }
                let constructionSites = remoteRoom.find(FIND_CONSTRUCTION_SITES);
                if (constructionSites.length) {
                    this.queue(room, queue, 'remoteBuilder', patterns, {}, remoteRoster, 1, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });
                }
            } else {
                room.log('queueing scout for remoteMining', remoteRoomName);
                this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {
                    remoteRoom: remoteRoomName,
                    action: 'go_remote_room'
                });
            }
        }
        return queue.length - previousQueueLength;
    }

    whatToBuild(patterns, room) {
        let queue = [];
        var currentSplit = util.roster(room, (c)=> c.ticksToLive > (10 + c.body.length) && !c.memory.remoteRoom);
        if (room.controller && room.controller.my && room.controller.level < 2) {
            this.queue(room, queue, 'upgrader', patterns, currentSplit, {}, 3, {});
            return queue;
        }
        _.values(room.memory.building).forEach((spec)=>currentSplit[spec.memory.role] = (currentSplit[spec.memory.role] || 0) + 1);
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
            let queued = false;
            rooms = _.sortBy(rooms, (r)=>util.roomDistance(room.name, r));
            rooms.forEach((name)=> {
                this.addRemoteMiningToQueue(name, room, patterns, currentSplit, queue);
            });
        }
        if (room.memory.siege) {
            let remoteRoomName = room.memory.siege;
            let remoteRoster = this.remoteRoster(remoteRoomName);
            if (!Game.rooms[remoteRoomName]) {
                this.queue(room, queue, 'towerDrainer', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
            }
        }
        if (room.controller.level > 4 && room.memory.claim) {
            let rooms = _.isString(room.memory.claim) ? [room.memory.claim] : room.memory.claim;
            let remoteRoster = this.remoteRoster(room.memory.claim);
            rooms.forEach((remoteRoomName)=> {
                'use strict';
                let remoteRoom = Game.rooms[remoteRoomName];
                if (remoteRoom && remoteRoom.controller && !remoteRoom.controller.my) {
                    this.queue(room, queue, 'claimer', patterns, currentSplit, remoteRoster, 1, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });
                } else if (remoteRoom && remoteRoom.controller && remoteRoom.controller.my) {
                    let remoteRoster = this.remoteRoster(remoteRoom, (c)=> c.ticksToLive > 100);
                    if (remoteRoom.controller.level < 3) {
                        this.queue(room, queue, 'remoteHarvester', patterns, currentSplit, remoteRoster, 1, {
                            remoteRoom: remoteRoomName,
                            action: 'go_remote_room'
                        });
                    }
                    if (remoteRoom.controller.level < 4) {
                        this.queue(room, queue, 'remoteUpgrader', patterns, currentSplit, remoteRoster, 1, {
                            remoteRoom: remoteRoomName,
                            action: 'go_remote_room'
                        });
                    }
                } else if (!remoteRoom) {
                    //send scout
                    this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });
                }
            });
        }
        if (room.memory.remotebuild) {
            let rooms = _.isString(room.memory.remotebuild) ? [room.memory.remotebuild] : room.memory.remotebuild;
            rooms.forEach((roomName)=> {
                'use strict';
                let remoteRoster = this.remoteRoster(roomName, (c)=> c.ticksToLive > 100);
                let remoteRoom = Game.rooms[roomName];
                if (!remoteRoom) {
                    patterns['remoteBuilder'].count = 0;
                } else {
                    if (!(remoteRoom.controller) || (remoteRoom.controller && !remoteRoom.controller.my)) {
                        let constructionSites = remoteRoom.find(FIND_CONSTRUCTION_SITES);
                        if (constructionSites.length > 0) {
                            let wantedBuilderCount = constructionSites.find((site)=>site.structureType == STRUCTURE_SPAWN) ? 3 : 1;
                            // room.log('queueing remoteBuilders', wantedBuilderCount);
                            /*this.queue(room, queue, 'remoteHarvester', patterns, {}, remoteRoster, remoteRoom.find(FIND_SOURCES).length, {
                             remoteRoom: roomName,
                             action: 'go_remote_room'
                             });*/
                            this.queue(room, queue, 'remoteBuilder', patterns, {}, remoteRoster, wantedBuilderCount, {
                                remoteRoom: roomName,
                                action: 'go_remote_room'
                            });
                        }
                    } else if (remoteRoom.controller && remoteRoom.controller.my && remoteRoom.find(FIND_MY_SPAWNS) == 0) {
                        // room.log('queueing remoteBuilders', wantedBuilderCount);
                        this.queue(room, queue, 'remoteHarvester', patterns, {}, remoteRoster, remoteRoom.find(FIND_SOURCES).length, {
                            remoteRoom: roomName,
                            action: 'go_remote_room'
                        });
                        this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 3, {
                            remoteRoom: roomName,
                            action: 'go_remote_room'
                        });
                    } else if (remoteRoom.find(FIND_MY_SPAWNS) > 0) {
                        // room.log('disabling remotebuilds');
                        this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 3 - remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTENSION}}).length
                            , {remoteRoom: roomName, action: 'go_remote_room'});
                    } else {
                        this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 1
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
                    patterns['upgrader'].count = Math.floor(Math.max(room.storage.store.energy / 15000, 2));
                }
                if (room.storage.store.energy > 5000) {
                    patterns['carry'].count = 0;
                    patterns['energyFiller'].count = (Memory.stats["room." + room.name + ".spawns.waitFull"] > 500) ? 2 : 1;
                    patterns['energyGatherer'].count = 1;
                } else {
                    // patterns['carry'].count = 2;
                }
            }
            // room.log('upgrader set', patterns['upgrader'].count);

        } else if (room.storage) {
            patterns['upgrader'].count = Math.max(1, Math.floor(room.storage.store.energy) / 100000);
        } else {
            let nonFullStructures = room.find(FIND_STRUCTURES,
                {filter: (s)=>((s.energyCapacity && s.energy !== s.energyCapacity) || (s.storeCapacity && _.sum(s.store) !== s.storeCapacity))})
                .filter((s)=>((!room.memory.harvestContainers || room.memory.harvestContainers.indexOf(s.id) < 0)));
            if (!nonFullStructures.length) {
                room.log('energy overflowing, upgrader');
                patterns['upgrader'].count = Math.min(5,(currentSplit['upgrader'] || 0) + 1);
            } else {
                // room.log('nonFullStructures',JSON.stringify(nonFullStructures.map((s)=>s.pos)),nonFullStructures.length);
            }
        }
        if (room.controller.level >= 6) {
            if (room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}}).length > 0) {
                let find = room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) > 1000 && s.store.energy !== _.sum(s.store)});
                if (find.length) {
                    patterns['labOperator'].count = 1;
                    // room.log('containers with minerals', find.length, find[0].id);
                }

                if (room.storage /*&& room.storage.store.energy > 10000*/) {
                    let minerals = room.find(FIND_MINERALS).filter((min)=>min.mineralAmount>0);
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
            this.handleMineralImport(room, queue, patterns);
        }

        let constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        if (constructionSites.length) {
            patterns['builder'].count = (room.storage ? (room.storage.store && room.storage.store.energy > 10000) : true) ? 1 : 0;
            patterns['upgrader'].count = 0;
            /*
             if (constructionSites.find((c)=> STRUCTURE_EXTENSION === c.structureType)) {
             patterns['builder'].count =patterns['upgrader'].count;
             }
             */
        }
        if (room.energyCapacityAvailable> 500) {
            let hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
            if (hostileStructures.length) {
                patterns['dismantler'].count = 1;
            }
        }
        // room.log("currentSplit " , JSON.stringify(currentSplit));
        // room.log("targetSplit" , JSON.stringify(_.values(patterns).map((p)=>({role:p.memory.role, count: p.count})).filter((e)=>e.count)));
        let sources = room.find(FIND_SOURCES);
        patterns['harvester'].count = Math.min(2, sources.length);
        patterns['carry'].count = Math.ceil(patterns['carry'].count);
        // patterns['upgrader'].count = Math.ceil(patterns['upgrader'].count * sources.length / 2);
        patterns['repair2'].count = Math.ceil(patterns['repair2'].count * sources.length / 2);
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
        if (queue.length == 0 && room.energyAvailable === room.energyCapacityAvailable && room.findContainers()
                .filter((s)=>
                    (s.energyCapacity && s.energy !== s.energyCapacity )
                    || (s.storeCapacity && s.storeCapacity !== _.sum(s.store))
                ).length === 0) {
            room.log('overflowing, building upgrader');
            this.queue(room, queue, 'upgrader', patterns, currentSplit, undefined, 4, {});
        }

        // currentSplit = _.mapValues(currentSplit, (v)=>{return v/creepCount;});
        // if (queue.length) room.log('queuePriorities', JSON.stringify(queue.map((e)=>e.priority)));
        queue = _.sortBy(queue, (elem)=> elem.priority);
        // if (queue.length) room.log('queuePriorities afterSort', JSON.stringify(queue.map((e)=>e.priority)));
        // if (queue.length) room.log('queue', JSON.stringify(queue.map((e)=>({priority:e.priority,memory:e.memory}))));
        room.memory.queueLength = queue.length;
        room.memory.queue = _.countBy(queue, (pat)=>pat.memory.role);
        // if (queue.length) room.log('queued ', JSON.stringify(_.countBy(queue, (c)=>c.memory.role)));
        return queue;
    }

    handleMineralImport(room, queue, patterns) {
        if (room.memory.minerals && room.memory.minerals.import) {
            _.keys(room.memory.minerals.import).forEach((remoteRoom)=> {
                let theRoom = Game.rooms[remoteRoom];
                let role = 'mineralTransport';
                let minerals = room.memory.minerals.import[remoteRoom];
                minerals = _.isString(minerals) ? [minerals] : minerals;
                minerals.forEach((mineral) => {
                    if (room.storage && (!room.storage.store[mineral] || room.storage.store[mineral] < 50000)) {
                        if (room.terminal && theRoom && theRoom.terminal && theRoom.terminal.store && theRoom.terminal.store[mineral]) {
                            // use terminal to import
                            room.log('importing using terminal', mineral);
                            let currentTerminalQty = room.terminal.store && room.terminal.store[mineral] ? room.terminal.store[mineral] : 0;
                            let qty = 5000 - currentTerminalQty;
                            if (qty > 0) {
                                let imported = theRoom.terminal.send(mineral, qty, room.name, 'import from ' + room.name);
                                room.log('importing using terminal', mineral, qty, imported);
                                Game.notify((`importing using terminal ${mineral} ${qty} ${imported}`));
                            }
                        } else {
                            let currentTransporters = _.values(Game.creeps).filter(
                                (c)=>remoteRoom === c.memory.remoteRoom && room.name === c.memory.homeroom && c.memory.role === role && c.memory.mineral === mineral);
                            if (!currentTransporters.length) {
                                room.log('queueing', room, queue, role, patterns, {}, {}, 1, {
                                    remoteRoom: remoteRoom,
                                    mineral: mineral,
                                    homeroom: room.name
                                });
                                this.queue(room, queue, role, patterns, {}, {}, 1, {
                                    remoteRoom: remoteRoom,
                                    mineral: mineral,
                                    homeroom: room.name
                                });
                            }
                        }
                    }
                });
            })
        }
    }

    reassignCreeps(room, roomPatterns) {
        "use strict";
        // todo
    }

    buildTower(room) {
        "use strict";
        if (room.controller && room.controller.my && room.controller.level >= 3 && room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).length == 0) {
            let towerFlags = room.find(FIND_FLAGS, {filter: {color: COLOR_PURPLE}}).filter((f)=>f.secondaryColor=COLOR_PURPLE);
            if (towerFlags.length > 0) {
                let lookFor = towerFlags[0].pos.lookFor(LOOK_CONSTRUCTION_SITES);
                if (!lookFor.length) {
                    room.createConstructionSite(towerFlags[0].pos, STRUCTURE_TOWER);
                }
            }
        }
        if (room.controller && room.controller.my) {
            let currentExtensionCount = room.find(FIND_STRUCTURES).filter((s)=>s.structureType === STRUCTURE_EXTENSION).length;
            room.log('currentExtensionCount', currentExtensionCount, CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]);
            if (CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]>currentExtensionCount) {
                let extensionFlags = room.find(FIND_FLAGS, {filter: {color: COLOR_PURPLE}}).filter((f)=>f.secondaryColor=COLOR_ORANGE);
                room.log('marks', extensionFlags.length);
                extensionFlags =extensionFlags.filter((f)=>f.pos.lookFor(LOOK_CONSTRUCTION_SITES).length ===0);
                room.log('non built marks', extensionFlags.length);
                extensionFlags.forEach((f)=>room.createConstructionSite(f.pos, STRUCTURE_EXTENSION));
            }
        }

    }

    createCreep(creep, buildSpec) {
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
            if (buildSpec.memory.remoteRoom) {
                creep.room.memory.efficiency = creep.room.memory.efficiency || {};
                creep.room.memory.efficiency.remoteMining = creep.room.memory.efficiency.remoteMining || {};
                let creepCost = _.sum(buildSpec.body, (part=>BODYPART_COST[part]))
                creep.room.memory.efficiency.remoteMining [buildSpec.memory.remoteRoom] = (creep.room.memory.efficiency.remoteMining [buildSpec.memory.remoteRoom] || 0) - creepCost;
            }
        } else if (ERR_NAME_EXISTS === canCreate) {
            Game.notify('name conflict ' + name);
            creep.log('name conflict ' + name);
        } else {
            creep.log('create?', canCreate, JSON.stringify(buildSpec.body), JSON.stringify(buildSpec.memory));

        }
    }

    run(room) {
        "use strict";
        let localRoster = util.roster(room);

        let spawns = room.find(FIND_MY_SPAWNS, {
            filter: (spawn)=> {
                if (spawn.spawning) {
                    this.updateCounters(spawn, {spawning: 1});
                    // spawn.log('adding to localRoster', spawn.memory.build.memory.role);
                    localRoster[spawn.memory.build.memory.role] = (localRoster[spawn.memory.build.memory.role] || 0) + 1;
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
        // this.updateNeeds(room, roomPatterns);
        this.reassignCreeps(room, roomPatterns);

        let available = room.energyAvailable;

        // creep.log('harvesters', harvesters.length);
        let queue = room.memory.spawnQueue || [];
        if (queue.length && (Game.time % 20)) {
            // room.log('using cached spawn queue');
        } else {
            // room.log('recomputing spawn queue',queue.length,!!(Game.time%20));
            queue = this.whatToBuild(roomPatterns, room);
        }

        // room.log('queue', JSON.stringify(_.countBy(queue, (e)=>e.memory.role)));
        // TODO if drop containers are > 75% increase creep count ?
        spawns.forEach((spawn) => {
            let buildSpec;
            let waitFull = false, immediate = false;
            if ((localRoster['harvester'] || 0) < 1 && room.energyAvailable >= 250) {
                buildSpec = queue.shift();
                immediate = true;
            } else if ((localRoster['carry'] || 0) + (localRoster['energyFiller'] || 0) < 1 && room.energyAvailable >= 100) {
                buildSpec = this.patterns['carry'];
                immediate = true;
            } else if (queue.length) {
                if (queue.length > 1 && queue[0].memory.role == 'keeperGuard') {
                    let queued = queue.filter((spec)=>spec.memory.role == 'keeperGuard').length;
                    let keeperCost = _.sum(queue[0].body, (part=>BODYPART_COST[part]));
                    let maxAffordable = Math.floor(room.energyCapacityAvailable / keeperCost);
                    if (Math.min(queued, maxAffordable) * keeperCost <= room.energyAvailable) {
                        // ok
                        buildSpec = queue.shift();
                    } else {
                        // wait so we can group spawns rather than have them waiting for brothers
                        waitFull = true;
                    }
                }
                buildSpec = queue.shift();
            }
            if (buildSpec) {
                let shapedAndCost = this.shapeBody(available, buildSpec.body)
                if (shapedAndCost.body.length == buildSpec.body.length) {
                    // room.log('can fully afford, building', shapedAndCost.cost, JSON.stringify(shapedAndCost.body));
                    // ok cn fully afford
                    available -= shapedAndCost.cost;
                    buildSpec.body = shapedAndCost.body;
                    spawn.log('queue length', queue.length);
                    this.createCreep(spawn, buildSpec);
                } else if (immediate || (_.sum(buildSpec.body.slice(0, shapedAndCost.body.length + 1), (part=>BODYPART_COST[part])) > room.energyCapacityAvailable)) {
                    //  this is the max we can build anyway
                    // room.log('best we can do ..., building', shapedAndCost.cost, JSON.stringify(shapedAndCost.body));
                    available -= shapedAndCost.cost;
                    buildSpec.body = shapedAndCost.body;
                    spawn.log('queue length', queue.length);
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
        room.memory.spawnQueue = queue;

    }

    updateCounters(spawn, o) {
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

}

module.exports = new RoleSpawn();