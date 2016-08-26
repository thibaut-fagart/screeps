var _ = require('lodash');
var util = require('./util');
var patterns = require('./base.creep.patterns');

//  Game.spawns.Spawn1.createCreep([WORK, MOVE, WORK, WORK, WORK, WORK, ], undefined, {role:'harvester'})
class RoleSpawn {
    constructor() {
        this.patterns = patterns;
        let p = 0;
        _.keys(this.patterns).forEach((k)=> this.patterns[k].priority = p++);

        this.BODY_ORDER = [TOUGH, WORK, CARRY, MOVE, ATTACK, HEAL, RANGED_ATTACK, CLAIM];
    }

    /***
     *
     * @param {Room} room
     * @param perfectBody
     * @param {number} [maxEnergy]
     * @returns {{cost: number, body: [string]}}
     */
    shapeBody(room, perfectBody, maxEnergy) {
        if (_.isFunction(perfectBody)) {
            let body = perfectBody(room, maxEnergy);
            let result = {
                cost: _.sum(body, (part)=>BODYPART_COST[part]),
                body: _.sortBy(body, (part)=>this.BODY_ORDER.indexOf(part))
            };
            // console.log('bodyShaper', maxEnergy, JSON.stringify(result));
            return result;
        }

        // adds the parts untill they can't be built
        maxEnergy = maxEnergy || room.energyCapacityAvailable;

        var cost = 0;
        let max = 0;
        for (var i = 0; (i < perfectBody.length) && cost <= maxEnergy; i++) {
            var part = perfectBody[i];
            if ((cost + BODYPART_COST[part]) <= maxEnergy) {
                max = i;
                cost += BODYPART_COST[part];
            } else {
                break;
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

        let repairNeeded = room.find(FIND_STRUCTURES).reduce((acc, s)=>acc + (s.hits ? s.hitsMax - s.hits : 0), 0);
        roomPatterns.repair2.count = (repairNeeded > 0) ? 1 : 0;
        // room.log("NO NEED FOR REPAIRERS");

    }

    findCreepsMatching(room, memory) {
        return _.filter(room.find(FIND_MY_CREEPS), (c)=> _.all(_.keys(memory), (k)=>memory[k] === c.memory[k]));
    }

    /**
     *
     * @param {Room} room
     * @param {Array} queue
     * @param {string} role
     * @param {Object} patterns
     * @param {Object} currentSplit
     * @param {Object} remoteRoster
     * @param {number} upTo
     * @param {Object} memory
     * @returns {number} queued
     */
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
        let currentCount = 0 + (currentSplit[role] || 0);
        let remoteCount = (remoteRoster ? (remoteRoster[role] || 0) : 0);
        let queuedCount = (queue.find((spec)=> JSON.stringify(spec.memory) === JSON.stringify(memory)) || 0);
        let totalCount = currentCount + remoteCount + queuedCount;
        // room.log('queueing ',role, totalCount, 'to', upTo);
        for (let i = totalCount; i < upTo; i++) {
            queue.push(__new);
        }
        // room.log('queued ', upTo - totalCount, role);
        return upTo - totalCount;

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

    /**
     * todo take boosts into account
     * @param room
     * @param buildSpec
     * @returns {number}
     */
    carryCapacity(room, buildSpec) {
        'use strict';
        let body = this.shapeBody(room, buildSpec.body).body;
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
        let remoteRoster = this.remoteRoster(remoteRoomName, ((c)=>c.ticksToLive > (tripTimeToSources || 0) + c.body.length * 3 + 20 ));
        var requiredCarry = function (safeSourcesAndMinerals, harvestRate) {
            if (!tripTimeToSources) return 1;
            let carryTransportTime = 2 * tripTimeToSources;
            let carryCapacityPerLifeWithTransport = this.carryCapacity(room, patterns['remoteCarry']) * CREEP_LIFE_TIME / carryTransportTime;
            let requiredCarryCount = Math.ceil(_.sum(safeSourcesAndMinerals,
                    (s)=>(
                        (s.energyCapacity && s.energyCapacity * (CREEP_LIFE_TIME / ENERGY_REGEN_TIME)) // each source regens 5 times per life
                        || (s.mineralAmount && harvestRate * CREEP_LIFE_TIME) //minerals ... todo should try to harvest faster, to take advantage of regen
                    )) / carryCapacityPerLifeWithTransport);

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
                if (hasKeeperLairs) {
                    // minimum boosts : attack2, heal2, move2
                    if (room.maxBoost(ATTACK, ATTACK) < 2 || room.maxBoost(HEAL, HEAL) < 2 || room.maxBoost(MOVE, 'fatigue') < 2) {
                        room.log('room does not have necessary boosts');
                        return 0;
                    }
                }
                /*remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});*/
                let safeSourcesAndMinerals = util.findSafeSources(remoteRoom);
                let roomDistance = util.roomDistance(room.name, remoteRoomName);
                // room.log('roomDistance', room.name, remoteRoomName, roomDistance);
                // room.log('safeSourcesAndMinerals', safeSourcesAndMinerals.length);
                if (hasKeeperLairs && !room.memory.nomilitary) {
                    if (room.energyCapacityAvailable >= 1800) {
                        this.queue(room, queue, 'keeperGuard', patterns, {}, remoteRoster, 1, {remoteRoom: remoteRoomName});
                        // room.log('keeperGuards?',patterns['keeperGuard'].count,remoteRoster['keeperGuard']||0);
                    }
                }
                if (remoteRoom.memory.guards && !room.memory.nomilitary) {
                    _.pairs(remoteRoom.memory.guards).forEach((roleAndCount)=> {
                        this.queue(room, queue, roleAndCount[0], patterns, {}, remoteRoster, roleAndCount[1], {remoteRoom: remoteRoomName});
                    });
                }
                // let energyReady = this.availableEnergy(remoteRoom);
                // room.log('remoteMining', energyReady, safeSourcesAndMinerals.length, hasKeeperLairs);
                if (safeSourcesAndMinerals.length) {
                    if (hasKeeperLairs) {
                        if (remoteRoster['keeperGuard'] >= 1 && room.energyCapacityAvailable >= 1800) {
                            // build carry for the existing harvesters before more harvesters
                            let perfectMineralHarvester = this.shapeBody(room, patterns['keeperMineralHarvester'].body);
                            let boostFactor = room.maxBoost(WORK, 'harvest');
                            let mineralHarvestRate = boostFactor * HARVEST_MINERAL_POWER * perfectMineralHarvester.body.filter((part)=>part == WORK).length;
                            let requiredCarryCount = requiredCarry.call(this, safeSourcesAndMinerals, mineralHarvestRate);
                            room.log('requiredCarry', remoteRoomName, requiredCarryCount);
                            let queuedCarries = this.queue(room, queue, 'remoteCarryKeeper', patterns, {}, remoteRoster, requiredCarryCount, {
                                remoteRoom: remoteRoomName,
                                action: 'go_remote_room'
                            });
                            // current carries = requiredCarryCount - queuedCarries
                            let harvesterTarget = safeSourcesAndMinerals.filter((s)=>s.energyCapacity).length;
                            harvesterTarget = harvesterTarget * (requiredCarryCount - queuedCarries) / requiredCarryCount; // do not queue all harvesters up front
                            this.queue(room, queue, 'keeperHarvester', patterns, {}, remoteRoster, harvesterTarget, {remoteRoom: remoteRoomName});
                            this.queue(room, queue, 'keeperMineralHarvester', patterns, {}, remoteRoster, safeSourcesAndMinerals.filter((s)=>s.mineralAmount).length, {remoteRoom: remoteRoomName});
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
                        // room.log('queueing remote harvesters', remoteRoomName, safeSourcesAndMinerals.length);
                        this.queue(room, queue, 'remoteHarvester', patterns, {}, remoteRoster,
                            Math.max(0, safeSourcesAndMinerals.filter((s)=>s.energyCapacity || s.mineralAmount).length), {
                                remoteRoom: remoteRoomName,
                                action: 'go_remote_room'
                            });
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
                            let delayBeforeArriving = roomDistance * 50 + squadSize * this.shapeBody(room, patterns['roleSoldier'].body).body.length * 3;
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
                    this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 1, {
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
        var currentSplit = util.roster(room, (c)=> c.ticksToLive > (c.body.length * 3) && !c.memory.remoteRoom);
        _.values(room.memory.building).forEach((spec)=>currentSplit[spec.memory.role] = (currentSplit[spec.memory.role] || 0) + 1);
        if (room.controller && room.controller.my && room.controller.level < 2) {
            this.queue(room, queue, 'upgrader', patterns, currentSplit, {}, 1, {});
            // return queue;
        }

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
                    let tripTime = room.tripTimeToSources(remoteRoomName);
                    let remoteRoster = this.remoteRoster(remoteRoom, (c)=> c.ticksToLive > c.body.length * 3 + tripTime + 10);
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
                let tripTime = room.tripTimeToSources(roomName);
                let remoteRoster = this.remoteRoster(roomName, (c)=> c.ticksToLive > c.body.length * 3 + tripTime + 10);
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
                    patterns['energyFiller'].count = (Memory.stats['room.' + room.name + '.spawns.waitFull'] > 500) ? 2 : 1;
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
                .filter((s)=>((!s.room.isHarvestContainer(s))));
            if (!nonFullStructures.length) {
                room.log('energy overflowing, upgrader');
                patterns['upgrader'].count = Math.min(5, (currentSplit['upgrader'] || 0) + 1);
            } else {
                // room.log('nonFullStructures',JSON.stringify(nonFullStructures.map((s)=>s.pos)),nonFullStructures.length);
            }
        }
        if (room.controller.level >= 6) {
            if (room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}}).length > 0) {
                let find = room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) > 1000 && s.store.energy !== _.sum(s.store)});
                if (find.length) {
                    patterns['mineralGatherer'].count = 1;
                    // room.log('containers with minerals', find.length, find[0].id);
                }

                if (room.storage /*&& room.storage.store.energy > 10000*/) {
                    let minerals = room.find(FIND_MINERALS).filter((min)=>min.mineralAmount > 0);
                    let storedMinerals = room.storage.store;
                    minerals.forEach((m)=> {
                        // room.log('mineral', m.mineralType, storedMinerals[m.mineralType], storedMinerals[m.mineralType] < 100000, m.mineralAmount);
                        if (!(storedMinerals[m.mineralType]) || storedMinerals[m.mineralType] < 300000 && m.mineralAmount) {
                            patterns['mineralHarvester'].count = 1;
                        }
                    });
                }
                // room.log('mineralHarvester?', patterns['mineralHarvester'].count);

            }
            let labs = room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LAB}});
            if (labs.length > 0
                && (labs.find((lab)=>lab.mineralType && lab.mineralType !== room.expectedMineralType(lab)) // mis-fed lab
                    || labs.find((lab)=>lab.mineralAmount < 0.3 * lab.mineralCapacity // empty labs
                        && (room.storage.store[room.expectedMineralType(lab)] || room.terminal && room.terminal.store[room.expectedMineralType(lab)])// but available minerals
                    ) || labs.find((lab)=>lab.mineralAmount > 0.66 * lab.mineralCapacity) // full labs
                )
            ) {
                patterns['labOperator'].count = 1;
            }
            // this.handleMineralImport(room, queue, patterns);
        }

        let constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        if (constructionSites.length) {
            patterns['builder'].count = (room.storage ? (room.storage.store && room.storage.store.energy > 2000) : true) ? 1 : 0;
            patterns['upgrader'].count = 0;
            /*
             if (constructionSites.find((c)=> STRUCTURE_EXTENSION === c.structureType)) {
             patterns['builder'].count =patterns['upgrader'].count;
             }
             */
        }
        if (room.energyCapacityAvailable > 500) {
            let hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
            if (hostileStructures.length || room.dismantleTargets().length) {
                patterns['dismantler'].count = 1;
            }
        }
        // room.log('currentSplit ', JSON.stringify(currentSplit));
        /*
         room.log('targetSplit', JSON.stringify(_.values(patterns).map((p)=>({
         role: p.memory.role,
         count: p.count
         })).filter((e)=>e.count)));
         */
        let sources = room.find(FIND_SOURCES);
        patterns['harvester'].count = Math.min(2, sources.length);
        patterns['carry'].count = Math.ceil(patterns['carry'].count);
        // patterns['upgrader'].count = Math.ceil(patterns['upgrader'].count * sources.length / 2);
        patterns['repair2'].count = Math.ceil(patterns['repair2'].count * sources.length / 2);
        this.updateNeeds(room, patterns);
        _.keys(patterns)
            .forEach((role)=> {
                'use strict';
                let count = patterns[role].count;
                if (count > 0) {
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
        let maxAffordable = (room, theRoom)=> {
            let distance = Game.map.getRoomLinearDistance(room.name, theRoom.name);
            let number = Math.log((distance + 9) * 0.1) + 0.1;
            let amount = (room.terminal.store.energy || 0) / (number);
            return {amount: amount, cost: Math.ceil(amount * (number))};
        };

        if (room.import.length) {
            let role = 'mineralTransport';

            room.import.forEach((mineral)=> {
                let offeringRooms = _.values(Game.rooms).filter(
                    (r)=> r.memory.exports && r.memory.exports.indexOf(mineral) >= 0 // exports
                    && r.terminal && r.terminal.store && r.terminal.store[mineral] // has available
                );
                let offeringRoomsWithEnergy = offeringRooms.filter((r)=> r.terminal.store.energy && r.terminal.store.energy > 1000);
                if (offeringRoomsWithEnergy.length === 0 && offeringRooms.length > 0 && room.terminal && room.terminal.store && room.terminal.store.energy > 2000) {
                    let offeringRoomsWithTerminal = offeringRooms.filter((r)=>r.terminal);
                    offeringRoomsWithTerminal.forEach((r)=> {
                        let _maxAffordable = maxAffordable(room, r);
                        let amount = _maxAffordable.amount - _maxAffordable.cost;
                        room.log(`sending ${amount} energy to ${r.name}`);
                        Game.notify(`${room.name}sending ${amount} energy to ${r.name}`);
                        room.terminal.send(RESOURCE_ENERGY, amount, r.name);
                    });

                } else {
                    let theRoom = _.max(offeringRooms, (r)=>(r.terminal.store && r.terminal.store[mineral]));
                    // room.log(`importing ${mineral} from ${theRoom === -Infinity ? 'none' : theRoom.name}`);
                    if (-Infinity !== theRoom) {
                        if ((room.storage && room.storage.store && room.storage.store[mineral] || 0)
                            + ((room.terminal && room.terminal.store && room.terminal.store[mineral] || 0) < 5000)) {
                            if (room.terminal && theRoom.terminal) {
                                if (theRoom.terminal.store && theRoom.terminal.store[mineral]) {
                                    // use terminal to import
                                    // room.log('importing using terminal', mineral);
                                    let currentTerminalQty = room.terminal.store && room.terminal.store[mineral] ? room.terminal.store[mineral] : 0;
                                    let qty = Math.min(5000 - currentTerminalQty, theRoom.terminal.store[mineral]);
                                    // room.log(`importing ${qty} ${mineral} from ${theRoom.name}`)
                                    if (qty > TERMINAL_MIN_SEND) {
                                        let _maxAffordable = maxAffordable(theRoom, room).amount;
                                        qty = Math.min(qty, _maxAffordable);
                                        if (qty > TERMINAL_MIN_SEND) {
                                            let imported = theRoom.terminal.send(mineral, qty, room.name, 'import from ' + room.name);
                                            room.log('importing using terminal', theRoom.name, mineral, qty, imported);
                                            if (OK !== imported) Game.notify((`${room.name} importing from ${theRoom.name} using terminal ${qty} ${mineral}  : ${imported}`));
                                        }
                                    }
                                }
                            }
                            /*TODO removed to move terminal transfer else if (theRoom && theRoom.storage && theRoom.storage.store && theRoom.storage.store[mineral] > 5000) {
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
                             }*/
                        }
                    } else {
                        room.log(`want import${mineral} but there is no matching export`);
                        Game.notify(`${room.name} want import${mineral} but there is no matching export`);
                    }
                }
                //});
            });
        }
        if (room.terminal && room.controller.level >= 7 && room.terminal.store && room.terminal.store[RESOURCE_ENERGY] >= 5000) {
            let targetRoom = _.values(Game.rooms).find((r)=>r.controller && r.controller.my && r.terminal && r.controller.level < 7);
            if (targetRoom) {
                room.log(`transfering energy to ${targetRoom.name}`);
                room.terminal.send(RESOURCE_ENERGY, 3000, targetRoom.name);
            }
        }
    }

    reassignCreeps(room) {
        'use strict';
        let sites = room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length > 0) {
            let totalProgressRemaining = sites.reduce((acc, site)=>acc + site.progressTotal - site.progress, 0);
            // room.log(`totalProgressRemaining ${totalProgressRemaining}`);
            let requiredBuilderParts = totalProgressRemaining / (BUILD_POWER * CREEP_LIFE_TIME);
            // room.log(`requiredBuilderParts ${requiredBuilderParts}`);
            let builders = room.find(FIND_MY_CREEPS).filter((c)=>c.memory.role === 'builder');
            let currentBuilderParts = builders.reduce((acc, c)=>acc + c.getActiveBodyparts(WORK), 0);
            let upgraders = room.find(FIND_MY_CREEPS).filter((c)=>c.memory.role === 'upgrader');
            let reassigned = 0;
            while (currentBuilderParts < requiredBuilderParts && reassigned < upgraders.length) {
                let assignee = upgraders[reassigned];
                reassigned++;
                assignee.memory.role = 'builder';
                currentBuilderParts += assignee.getActiveBodyparts(WORK);
                room.log(`reassigned ${assignee.name}, builderParts ${currentBuilderParts}/${requiredBuilderParts}`)
            }
        } else {
            room.find(FIND_MY_CREEPS).filter((c)=>c.memory.role === 'builder').forEach((c)=>c.memory.role = 'upgrader');
        }

    }

    buildStructures(room) {
        return room.buildStructures();
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
            creep.log('building ', creep.room.energyAvailable, creep.room.energyCapacityAvailable, JSON.stringify(_.countBy(buildSpec.body)), JSON.stringify(buildSpec.memory));
            creep.memory.build = {start: Game.time, name: canCreate, memory: buildSpec.memory};
            creep.room.memory.building = creep.room.memory.building || {};
            creep.room.memory.building[creep.memory.build.name] = creep.memory.build;
            if (buildSpec.memory.remoteRoom) {
                creep.room.memory.efficiency = creep.room.memory.efficiency || {};
                creep.room.memory.efficiency.remoteMining = creep.room.memory.efficiency.remoteMining || {};
                let creepCost = _.sum(buildSpec.body, (part=>BODYPART_COST[part]));
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
        'use strict';
        this.reassignCreeps(room);
        let localRoster = util.roster(room);

        let spawns = room.find(FIND_MY_SPAWNS, {
            filter: (spawn)=> {
                if (spawn.spawning) {
                    this.updateCounters(spawn, {spawning: 1});
                    // spawn.log('adding to localRoster', spawn.memory.build.memory.role);
                    localRoster[spawn.memory.build.memory.role] = (localRoster[spawn.memory.build.memory.role] || 0) + 1;
                    return false;
                } else {
                    if (spawn.memory.build && spawn.memory.build.name && room.memory.building) {
                        delete room.memory.building[spawn.memory.build.name];
                    }
                    return true;
                }
            }
        });
        if (room.controller && room.controller.my && room.controller.level >= 6 && !Game.time % 100) this.handleMineralImport(room);

        if (!(Game.time % 100)) {
            this.buildStructures(room);

        }
        if (spawns.length === 0) {
            // creep.log('spawning');
            return;
        }
        let roomPatterns = _.cloneDeep(this.patterns);
        // this.updateNeeds(room, roomPatterns);

        let available = room.energyAvailable;
        // creep.log('harvesters', harvesters.length);
        let memoryQueue = room.memory.spawnQueue || {date: -100}, queue;

        if (Game.time < memoryQueue.date + 50 && memoryQueue.queue.length > 0) {
            // room.log('using cached spawn queue');
        } else {
            // room.log('recomputing spawn queue', queue.length, !!(Game.time % 20));
            memoryQueue = {
                queue: this.whatToBuild(roomPatterns, room).map((spec)=> {
                    let shaped = this.shapeBody(room, spec.body);
                    spec.body = shaped.body;
                    spec.cost = shaped.cost;
                    return spec;
                }),
                date: Game.time
            };
        }
        queue = memoryQueue.queue;
        // if all full
        if (queue.length === 0 && room.energyAvailable === room.energyCapacityAvailable) {
            if ((room.storage && room.storage.store && room.storage.store.energy > 5000 * ((localRoster['upgrader'] || 0) + (localRoster['builder'] || 0) + (localRoster['repair2'] || 0) ))
                || room.findContainers().filter((s)=> !s.room.isHarvestContainer(s) && (s.storeCapacity && _.sum(s.store) > 0.9 * s.storeCapacity) || (s.energyCapacity && s.energy > 0.9 * s.energyCapacity)).length === 0) {
                let spec = roomPatterns[(room.find(FIND_CONSTRUCTION_SITES).length === 0) ? 'upgrader' : 'builder'];

                let shaped = this.shapeBody(room, spec.body);
                spec.body = shaped.body;
                spec.cost = shaped.cost;
                queue.push(spec);
            }
        }
        if (room.controller.ticksToDowngrade < 5000) {
            let spec = roomPatterns['upgrader'];
            let shaped = this.shapeBody(room, spec.body);
            spec.body = shaped.body;
            spec.cost = shaped.cost;
            queue.push(spec);
            queue = [spec];
        }
        // room.log('queue length', queue.length);
        // room.log('queue', JSON.stringify(_.countBy(queue, (e)=>e.memory.role)));
        // TODO if drop containers are > 75% increase creep count ?
        let keeperCount = queue.filter((spec)=>spec.memory && spec.memory.role === 'keeperGuard').length;
        if (keeperCount) room.log('queued keeperGuards ', keeperCount);
        // room.log(`queued ${queue.length}`, queue.length ? JSON.stringify(queue[0]) : 'none');
        spawns.forEach(
            (spawn) => {
                let buildSpec;
                let waitFull = false, immediate = true;
                let needHarvester = (localRoster['harvester'] || 0) < 1;
                let needCarry = (localRoster['carry'] || 0) + (localRoster['energyFiller'] || 0) < 1;
                if (needCarry && _.sum(room.find(FIND_DROPPED_ENERGY), (r)=>r.amount) > 300) {
                    if (room.energyAvailable >= 100) {
                        buildSpec = _.cloneDeep(patterns['carry']);
                        buildSpec.body = this.shapeBody(room, buildSpec.body, room.energyAvailable).body;
                        room.log('immediate carry(pickup)', JSON.stringify(buildSpec));
                    }
                } else if (needHarvester) {
                    if (room.energyAvailable >= 250) {
                        buildSpec = _.cloneDeep(patterns['harvester']);
                        buildSpec.body = this.shapeBody(room, buildSpec.body, room.energyAvailable).body;
                        room.log('immediate harvester', JSON.stringify(buildSpec));
                    }
                } else if (needCarry) {
                    if (room.energyAvailable >= 100) {
                        buildSpec = _.cloneDeep(patterns['carry']);
                        buildSpec.body = this.shapeBody(room, buildSpec.body, room.energyAvailable).body;
                        room.log('immediate carry', JSON.stringify(buildSpec));
                    }
                } else if (queue.length > 0) {
                    buildSpec = queue.shift();
                    immediate = false;
                }
                if (buildSpec) {
                    if (!buildSpec.body) {
                        room.log('no body !!', JSON.stringify(buildSpec));
                    } else if (buildSpec.body.indexOf(MOVE) < 0) {
                        room.log('body with no MOVE', JSON.stringify(buildSpec));
                        Game.notify(`${room.name} body with no MOVE ${JSON.stringify(buildSpec)}`);
                    } else {
                        let shapedAndCost = buildSpec;

                        if (shapedAndCost.cost <= room.energyAvailable) {
                            // room.log('can fully afford, building', shapedAndCost.cost, JSON.stringify(shapedAndCost.body));
                            // ok cn fully afford
                            buildSpec.body = shapedAndCost.body;
                            spawn.log('queue length', queue.length);
                            Game.notify(`${Game.time} ${spawn.name} building ${buildSpec.memory.role},queue length ${queue.length} queued keeperGuards ${queue.filter((s)=>s.memory.role === 'keeperGuard').length}`);
                            this.createCreep(spawn, buildSpec);
                        } else if (immediate) {
                            //  this is the max we can build anyway
                            // room.log('best we can do ..., building', shapedAndCost.cost, JSON.stringify(shapedAndCost.body));
                            buildSpec.body = this.shapeBody(room, buildSpec.body, room.energyAvailable).body;
                            spawn.log('queue length', queue.length);
                            Game.notify(`${Game.time} ${spawn.name} building ${buildSpec.memory.role},queue length ${queue.length} queued keeperGuards ${queue.filter((s)=>s.memory.role === 'keeperGuard').length}`);
                            this.createCreep(spawn, buildSpec);
                        } else {
                            // room.log('we can afford if we wait', available, affordableParts,maxParts, shapedAndCost.cost, _.sum(buildSpec.body, (part=>BODYPART_COST[part])), JSON.stringify(shapedAndCost.body));
                            this.updateCounters(spawn, {waitFull: 1});
                            queue.unshift(buildSpec);
                        }
                    }
                } else if (waitFull) {
                    this.updateCounters(spawn, {waitFull: 1});
                } else {
                    this.updateCounters(spawn, {idle: 1});
                }
            }
        );

        let base = {idle: 0, waitFull: 0, spawning: 0};
        _.keys(base).forEach(
            (k)=> {
                // sum the bits for each spawns
                Memory.stats['room.' + room.name + '.spawns.' + k] = _.sum(room.find(FIND_MY_SPAWNS), (s)=> s.memory.spawns[k]);
            }
        );
// room.log(`saving queue ${queue.length} ${memoryQueue.queue.length}`);
        room.memory.spawnQueue = memoryQueue;

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
            spawn.memory.spawns[k + 'Bits'][j] = (old << 1) | base[k];
            spawn.memory.spawns[k] = _.sum(spawn.memory.spawns[k + 'Bits'], (x)=> countBits(x));
            // room.log('setting bit', k, old, room.memory.spawns[k + 'Bits'][j]);
        });


        // creep.memory[]
    }

}

module.exports = new RoleSpawn();