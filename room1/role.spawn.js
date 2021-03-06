var _ = require('lodash');
var util = require('./util');
var patterns = require('./base.creep.patterns');
var CreepShaper = require('./base.creep.shaper');
let Cache = require('./util.cache');

function hash(value) {
    'use strict';
    if (typeof value === 'object' && !_.isArray(value)) {
        return _.keys(value).reduce((total, key)=>total + util.hash(key) + hash(value[key]), 0);
    } else {
        return util.hash(value.toString());
    }
}
Memory.cache = Memory.cache || {};
// needs to be checked on per room basis
// var patternsChanged = Memory.cache.patternsHash === currentHash;
Memory.cache.patternsHash = hash(patterns);
//  Game.spawns.Spawn1.createCreep([WORK, MOVE, WORK, WORK, WORK, WORK, ], undefined, {role:'harvester'})
class RoleSpawn {
    constructor() {
        this.patterns = patterns;
        let p = 0;
        _.keys(this.patterns).forEach((k)=> this.patterns[k].priority = p++);

        this.BODY_ORDER = [TOUGH, WORK, CARRY, MOVE, ATTACK, RANGED_ATTACK, HEAL, CLAIM];
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

        // let repairNeeded = room.find(FIND_STRUCTURES).reduce((acc, s)=>acc + (s.hits ? s.hitsMax - s.hits : 0), 0);
        // roomPatterns.repair2.count = (repairNeeded > 0) ? 1 : 0;
        if (room.storage && (!room.storage.store || !room.storage.store.energy || room.storage.store.energy < 10000)) {
            roomPatterns['builder'].count = 0;
        }
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
        let queuedCount = queue.filter((spec)=> _.isEqual(spec.memory, __new.memory)).length;
        let spawning = room.find(FIND_MY_SPAWNS).filter(s=>Cache.get(s.memory, 'active', ()=>s.isActive(), 1500) && s.spawning && _.isEqual(s.memory.build.memory, __new.memory)).length;
        let totalCount = currentCount + remoteCount + queuedCount + spawning;
        // room.log('queueing ',role, totalCount, 'to', upTo, currentCount, remoteCount, queuedCount);
        for (let i = totalCount; i < upTo; i++) {
            // room.log('queued 1');
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
        let containers = remoteRoom.structures[STRUCTURE_CONTAINER];
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

    handleEnergyAssist(room, patterns, queue) {
        if (_.isString(room.memory.assist)) {
            room.memory.assist = [room.memory.assist];
        }
        if (room.currentLedger.energy > 50000) {
            let newAssists = room.memory.assist;

            (room.memory.assist || []).forEach(remoteRoom=> {
                if (_.get(Game.rooms,[remoteRoom,'controller','level'],0)>=6) {
                    _.pull(newAssists, remoteRoom);
                }
                let currentTransporters = _.values(Game.creeps).filter(
                    (c)=>(room.name === c.memory.remoteRoom && remoteRoom === c.memory.homeroom) && c.memory.role === 'energyTransporter');
                if ((currentTransporters.length || 0) < 3) {
                    this.queue(room, queue, 'energyTransporter', patterns, {}, {}, 2, {
                        remoteRoom: room.name,
                        homeroom: remoteRoom,
                        action: 'load'
                    });
                }
            });
            room.memory.assist = newAssists;
        }
    }

    addRemotePortalMiningToQueue(remoteRoomName, room, patterns, currentSplit, queue, force) {
        let remoteRoom = Game.rooms[remoteRoomName];
        if ('number' === typeof room.memory.lastRemoteMiningUpdate) {
            delete room.memory.lastRemoteMiningUpdate;
        }
        // use tripTimeToSources to the protal room as approximation
        let tripTimeToSources = room.tripTimeToSources(remoteRoomName);
        let predicate = ((c)=>(undefined === c.ticksToLive) || c.ticksToLive > (_.sum(tripTimeToSources) || 0) + c.body.length * 3 + 20 );
        let remoteRoster = _.countBy(_.values(Game.creeps).filter((c)=>c.memory.portal_room === remoteRoomName && (predicate ? predicate(c) : true)), (c)=>c.memory.role);
        let portal = remoteRoom.find(FIND_STRUCTURES).find(s=>s.structureType === STRUCTURE_PORTAL);
        if (!portal || portal.ticksToDecay < 2000) return;
        let destination = portal.destination.roomName;
        let portalRoom = Game.rooms[destination];

        if (!portalRoom) {
            this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {
                role: 'scout',
                remoteRoom: destination,
                homeroom: room.name,
                tasks: [{name: 'MoveToRoom', args: {room: remoteRoomName}},
                    {name: 'GoThroughPortal', args: {room: remoteRoomName}}]
            });

        } else {
            if (portalRoom && portalRoom.find(FIND_HOSTILE_CREEPS).find(c=>c.owner.username === 'Invader')) {
                this.queue(room, queue, 'roleSoldier', patterns, currentSplit, this.remoteRoster(remoteRoomName), 1, {
                    homeroom: room.name,
                    tasks: [{name: 'MoveToRoom', args: {room: remoteRoomName}},
                        {name: 'GoThroughPortal', args: {room: remoteRoomName}}]
                });
            } else {
                let sources = util.findSafeSources(portalRoom, true);
                var requiredCarry = function (safeSourcesAndMinerals, harvestRate) {
                    if (!tripTimeToSources) return 1;
                    let speed = {road: 2, plain: 3, swamp: 11};
                    let carryTransportTime = 0;
                    for (let i in tripTimeToSources) {
                        carryTransportTime += speed[i] * tripTimeToSources[i];
                    }
                    // room.log(`transportTime for ${remoteRoomName} ${carryTransportTime}`);
                    let carryCapacityPerLifeWithTransport = this.carryCapacity(room, patterns['remoteCarry']) * CREEP_LIFE_TIME / carryTransportTime;
                    let requiredCarryCapacity = Math.ceil(_.sum(safeSourcesAndMinerals,
                        (s)=>(
                            (s.energyCapacity && s.energyCapacity * (CREEP_LIFE_TIME / ENERGY_REGEN_TIME)) // each source regens 5 times per life
                            || (s.mineralAmount && harvestRate * CREEP_LIFE_TIME) //minerals ... todo should try to harvest faster, to take advantage of regen
                        )));
                    // room.log('required carryCapacity for', remoteRoomName, requiredCarryCapacity, requiredCarryCapacity / carryCapacityPerLifeWithTransport);
                    return requiredCarryCapacity / carryCapacityPerLifeWithTransport;
                };
                let perfectMineralHarvester = this.shapeBody(room, patterns['remoteMineralHarvester'].body);
                let mineralHarvestRate = HARVEST_MINERAL_POWER * perfectMineralHarvester.body.filter((part)=>part == WORK).length;
                let requiredCarryCount = requiredCarry.call(this, sources, mineralHarvestRate);
                // room.log('requiredCarry', remoteRoomName, requiredCarryCount);
                if (sources.find(s=>s.mineralAmount)) {
                    this.queue(room, queue, 'remoteMineralHarvester', patterns, currentSplit, remoteRoster, 1, {
                        role: 'remoteMineralHarvester',
                        homeroom: room.name,
                        remoteRoom: destination,
                        final_room: destination,
                        portal_room: remoteRoomName,
                        tasks: [{name: 'MoveToRoom', args: {room: remoteRoomName}},
                            {name: 'GoThroughPortal', args: {room: remoteRoomName}}]
                    });

                }
                this.queue(room, queue, 'remoteHarvester', patterns, currentSplit, remoteRoster, sources.filter(s=>s.energyCapacity).length, {
                    role: 'remoteHarvester',
                    remoteRoom: destination,
                    homeroom: room.name,
                    final_room: destination,
                    portal_room: remoteRoomName,
                    tasks: [{name: 'MoveToRoom', args: {room: remoteRoomName}},
                        {name: 'GoThroughPortal', args: {room: remoteRoomName}}]
                });
                this.queue(room, queue, 'remotePortalCarry', patterns, currentSplit, remoteRoster, requiredCarryCount, {
                    role: 'remotePortalCarry',
                    remoteRoom: destination,
                    homeroom: room.name,
                    final_room: destination,
                    portal_room: remoteRoomName,
                    tasks: [{name: 'MoveToRoom', args: {room: remoteRoomName}},
                        {name: 'GoThroughPortal', args: {room: remoteRoomName}}]
                });

            }
        }
    }

    /**
     *
     * @param {string} remoteRoomName
     * @param {Room} room
     * @param {Object} patterns
     * @param {Object} currentSplit
     * @param {Object[]}queue
     * @param {boolean}[force]
     * @returns {number}
     */
    addRemoteMiningToQueue(remoteRoomName, room, patterns, currentSplit, queue, force) {
        // if (!force) return ;
        let previousQueueLength = queue.length;
        let remoteRoom = Game.rooms[remoteRoomName];
        if ('number' === typeof room.memory.lastRemoteMiningUpdate) {
            delete room.memory.lastRemoteMiningUpdate;
        }
        if ((Memory.rooms[remoteRoomName] && Memory.rooms[remoteRoomName].disabledUntil || 0) > Game.time) {
            Game.notify(`remoteMining disabled for ${remoteRoomName} for ${Game.time - Memory.rooms[remoteRoomName].disabledUntil }`);
            room.log(`remoteMining disabled for ${remoteRoomName} for ${Game.time - Memory.rooms[remoteRoomName].disabledUntil }`);
            return 0;
        } else if (Memory.rooms[remoteRoomName]) {
            delete Memory.rooms[remoteRoomName].disabledUntil;
        }
        let tripTimeToSources = room.tripTimeToSources(remoteRoomName);
        let remoteRoster = this.remoteRoster(remoteRoomName, ((c)=>(undefined === c.ticksToLive) || c.ticksToLive > (_.sum(tripTimeToSources) || 0) + c.body.length * 3 + 20 ));
        let updateMem = room.memory.lastRemoteMiningUpdate = room.memory.lastRemoteMiningUpdate || {};
        if ('number' !== typeof updateMem[remoteRoomName]) {
            delete updateMem[remoteRoomName];
        }
        updateMem[remoteRoomName] = updateMem[remoteRoomName] || 0;
        if (!updateMem[remoteRoomName] || updateMem[remoteRoomName] + 100 < 0 || updateMem[remoteRoomName] + 100 < Game.time/*true*/) {
            updateMem[remoteRoomName] = Game.time;
            // room.log('remoteMining', remoteRoomName);
            var requiredCarry = function (safeSourcesAndMinerals, harvestRate) {
                if (!tripTimeToSources) return 1;
                let speed = {road: 2, plain: 3, swamp: 11};
                let roundTripTicks = 0;
                for (let i in tripTimeToSources) {
                    roundTripTicks += speed[i] * tripTimeToSources[i];
                }
                room.log(`transportTime for ${remoteRoomName} ${roundTripTicks}`);
                let carryCapacityPerLifeWithTransport = this.carryCapacity(room, patterns['remoteCarry']) * Math.floor(CREEP_LIFE_TIME / roundTripTicks);
                let requiredCarryCapacity = Math.ceil(_.sum(safeSourcesAndMinerals,
                    (s)=>(
                        (s.energyCapacity && s.energyCapacity * (CREEP_LIFE_TIME / ENERGY_REGEN_TIME)) // each source regens 5 times per life
                        || (s.mineralAmount && harvestRate * CREEP_LIFE_TIME) //minerals ... todo should try to harvest faster, to take advantage of regen
                    )));
                room.log('required carryCapacity for', remoteRoomName, requiredCarryCapacity, requiredCarryCapacity / carryCapacityPerLifeWithTransport);
                return Math.ceil(requiredCarryCapacity / carryCapacityPerLifeWithTransport);
            };
            if (remoteRoom) {
                room.log('queueing for remoteMining', remoteRoom.name);
                let hasKeeperLairs = remoteRoom.hasKeeperLairs();
                let isRoomMinable = hasKeeperLairs || !(
                        remoteRoom.controller && remoteRoom.controller.reservation && room.controller.owner.username !== remoteRoom.controller.reservation.username // reserved
                        || remoteRoom.controller && remoteRoom.controller.owner && room.controller.owner.username !== remoteRoom.controller.owner.username // owned
                    );
                if (!isRoomMinable) {
                    return 0;
                }

                let threat = _.get(remoteRoom.memory, ['threatAssessment', 'harvested'], 0);
                if (threat > 70000 && threat < 130000) {
                    if (!remoteRoom.find(FIND_HOSTILE_CREEPS, {filter: c=>c.hostile}).length) {
                        this.queueCustomGuard(room, queue, [], patterns, remoteRoster, remoteRoomName);
                    }
                }

                let safeSourcesAndMinerals = util.findSafeSources(remoteRoom, hasKeeperLairs || remoteRoom.isCenterRoom());
                let roomDistance = util.roomDistance(room.name, remoteRoomName);
                let harvesterHasAttack = patterns['keeperHarvester'].body(room).find(p=>p == ATTACK);
                // room.log('roomDistance', room.name, remoteRoomName, roomDistance);
                // room.log('safeSourcesAndMinerals', safeSourcesAndMinerals.length);
                if (hasKeeperLairs && !room.memory.nomilitary && !harvesterHasAttack) {
                    room.memory.attack_min = room.memory.attack_min || {};
                    room.memory.attack_min [remoteRoomName] = Math.max(8 - room.controller.level, 1);
                    if (room.energyCapacityAvailable >= 1800) {
                        let upTo = 1;
                        this.queue(room, queue, 'keeperGuard', patterns, {}, remoteRoster, upTo, {
                            remoteRoom: remoteRoomName,
                            homeroom: room.name
                        });
                        room.log('keeperGuards?', patterns['keeperGuard'].count, remoteRoster['keeperGuard'] || 0);
                    }
                }
                if (remoteRoom.memory.guards && !room.memory.nomilitary) {
                    _.pairs(remoteRoom.memory.guards).forEach((roleAndCount)=> {
                        this.queue(room, queue, roleAndCount[0], patterns, {}, remoteRoster, roleAndCount[1], {
                            remoteRoom: remoteRoomName,
                            homeroom: room.name
                        });
                    });
                }
                // let energyReady = this.availableEnergy(remoteRoom);
                // room.log('remoteMining', energyReady, safeSourcesAndMinerals.length, hasKeeperLairs);
                if (safeSourcesAndMinerals.length || harvesterHasAttack) {
                    if (hasKeeperLairs) {
                        if ((harvesterHasAttack || remoteRoster['keeperGuard'] >= 1) && room.energyCapacityAvailable >= 1800) {
                            // build carry for the existing harvesters before more harvesters

                            let requiredCarryCount = 1;
                            // room.log('requiredCarry', remoteRoomName, requiredCarryCount);
                            let queuedCarries = this.queue(room, queue, 'remoteCarryKeeper', patterns, {}, remoteRoster, requiredCarryCount, {
                                remoteRoom: remoteRoomName, homeroom: room.name,
                                action: 'go_remote_room'
                            });
                            this.queue(room, queue, 'keeperHarvester', patterns, {}, remoteRoster, safeSourcesAndMinerals.filter((s)=>s.energyCapacity).length, {
                                remoteRoom: remoteRoomName,
                                homeroom: room.name
                            });
                            let minerals = safeSourcesAndMinerals.filter((s)=>s.mineralAmount);
                            this.queue(room, queue, 'keeperMineralHarvester', patterns, {}, remoteRoster, minerals.length, {
                                remoteRoom: remoteRoomName,
                                homeroom: room.name
                            });
                            this.queue(room, queue, 'remoteMineralHarvester', patterns, {}, remoteRoster, minerals.length, {
                                remoteRoom: remoteRoomName,
                                homeroom: room.name,
                                tasks: [{name: 'MoveToRoom', args: {room: remoteRoomName}}]
                            });
                            // current carries = requiredCarryCount - queuedCarries
                        }
                    } else {
                        /**
                         * during a cycle of 1500 ticks
                         * carry transport time = 3* (distance to room+ distance in room)
                         * carry capacity = carryCapacity * 1500/carry transport time
                         * carry required = energy produced (sources * source.max)/ carryCapacity
                         */
                            // room.log('queueing',remoteRoomName, 'remoteHarvester', Math.max(0, safeSourcesAndMinerals.length));
                            // room.log('queueing remote harvesters', remoteRoomName, safeSourcesAndMinerals.length);
                        let source = safeSourcesAndMinerals.find((s)=>s.energyCapacity);

                        if (source && source.energyCapacity > 3000) {
                            patterns['remoteHarvester'] = _.cloneDeep(patterns['remoteHarvester']);
                            room.memory.creepShaper = room.memory.creepShaper || {};
                            let shaperOptions = {
                                budget: room.energyCapacityAvailable,
                                cache: room.memory.creepShaper,
                                name: 'remoteHarvester',
                                availableBoosts: room.allowedBoosts('remoteHarvester')
                            };

                            patterns['remoteHarvester'].body = (room, budget)=> CreepShaper.shape(
                                CreepShaper.requirements().minimum(EMPTY_PLAIN_SPEED, 1).minimum(CAPACITY, 50).minimum(HARVEST, source.energyCapacity / 300), shaperOptions);
                        }
                        this.queue(room, queue, 'remoteHarvester', patterns, {}, remoteRoster,
                            Math.max(0, safeSourcesAndMinerals.filter((s)=>s.energyCapacity || s.mineralAmount).length), {
                                remoteRoom: remoteRoomName, homeroom: room.name,
                                action: 'go_remote_room'
                            });
                        // room.log('remoteMining', remoteRoomName, 'energyReady', energyReady);
                        var requiredCarryCount = requiredCarry.call(this, safeSourcesAndMinerals);
                        room.log(`remoteMiningCarryNeeed ${remoteRoomName}, required ${requiredCarryCount} ,current ${remoteRoster['remoteCarry']}`);
                        // if (energyReady > 1000) {
                        this.queue(room, queue, 'remoteCarry', patterns, {}, remoteRoster, requiredCarryCount, {
                            remoteRoom: remoteRoomName, homeroom: room.name,
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
                } else if (!room.memory.nomilitary) {
                    let hostiles = remoteRoom.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile && c.owner.username !== 'Source Keeper');

                    room.log('hostiles present, no remoteMining!');
                    let hostileParts = hostiles.reduce((sum, c)=>sum + c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) + c.getActiveBodyparts(HEAL), 0);
                    if (hostiles.length > 0 && hostileParts < 15) {
                        room.log(`invaders in ${remoteRoomName}, queuing soldier`);
                        this.queueCustomGuard(room, queue, hostiles, patterns, remoteRoster, remoteRoomName);
                        // this.queue(room, queue, 'roleSoldier', patterns, {}, remoteRoster, 1, {remoteRoom: remoteRoomName});
                    } else if (hostiles.length > 0 && hostileParts > 15) {
                        Game.notify(`${Game.time} ${room.name}=>${remoteRoomName} too many hostiles ${hostiles.length}, ${hostileParts}, blacklisting`);
                        remoteRoom.memory.disabledUntil = Game.time + _.max(hostiles, h=>h.ticksToLive);
                        return 0;
                    }
                }
                let spawnReserve = !(hasKeeperLairs) // keeper rooms are not reservable
                    && !remoteRoom.isCentralRoom()
                    && (!remoteRoom.controller || !remoteRoom.controller.reservation || (remoteRoom.controller.reservation && remoteRoom.controller.reservation.ticksToEnd < 500));
                // room.log('current reservation  ?', remoteRoom.name, JSON.stringify(remoteRoom.controller.reservation));
                // spawn reserver if  the room is not reserved, or due to expire soon
                if (spawnReserve && room.energyCapacityAvailable > BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]) {
                    this.queue(room, queue, 'reserver', patterns, {}, remoteRoster, 1, {
                        remoteRoom: remoteRoomName, homeroom: room.name,
                        action: 'go_remote_room'
                    });
                }
                let constructionSites = remoteRoom.find(FIND_CONSTRUCTION_SITES);
                if (constructionSites.length > 10) {
                    this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 1, {
                        remoteRoom: remoteRoomName, homeroom: room.name,
                        action: 'go_remote_room'
                    });
                }
            } else {
                room.log('queueing scout for remoteMining', remoteRoomName);
                this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {
                    remoteRoom: remoteRoomName, homeroom: room.name,
                    action: 'go_remote_room'
                });
            }
        } else {
            if (remoteRoom) {
                let hostiles = remoteRoom.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile);
                let hasKeeperLairs = remoteRoom.hasKeeperLairs();
                let hostileParts = hostiles.reduce((sum, c)=>sum + c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) + c.getActiveBodyparts(HEAL), 0);
                if (!hasKeeperLairs && hostiles.length > 0 && hostileParts < 15) {
                    room.log(`invaders in ${remoteRoomName}, queuing soldier`);
                    this.queueCustomGuard(room, queue, hostiles, patterns, remoteRoster, remoteRoomName);
                    // this.queue(room, queue, 'roleSoldier', patterns, {}, remoteRoster, 1, {remoteRoom: remoteRoomName});
                } else if (!hasKeeperLairs && hostiles.length > 0 && hostileParts < 15) {
                    Game.notify(`${Game.time} ${room.name}=>${remoteRoomName} too many hostiles, blacklisting ${hostiles.map(c=>c.owner.username + ':' + util.bodyToShortString(c.body)).join(',')}`);
                    remoteRoom.memory.disabledUntil = Game.time + 1500;
                }
            }
        }
        return queue.length - previousQueueLength;
    }

    queueCustomGuard(room, queue, hostiles, patterns, remoteRoster, remoteRoomName) {
        let remoteRoom = Game.rooms[remoteRoomName];
        return this.queue(room, queue, remoteRoom.hasKeeperLairs() || remoteRoom.isCenterRoom() ? 'archer' : 'smallArcher', patterns, {}, remoteRoster, 1, {remoteRoom: remoteRoomName});

    }

    whatToBuild(patterns, room) {
        let queue = [];
        let currentSplit = util.roster(room, (c)=> (!c.ticksToLive) || c.ticksToLive > (c.body.length * 3) && !c.memory.remoteRoom);
        _.values(room.memory.building).forEach((spec)=>currentSplit[spec.memory.role] = (currentSplit[spec.memory.role] || 0) + 1);
        if (room.controller && room.controller.my && room.controller.level < 2) {
            this.queue(room, queue, 'upgrader', patterns, currentSplit, {}, 1, {});
            // return queue;
        }

        let hostiles = room.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile && c.owner.username !== 'Invader');
        let forces = hostiles.reduce((acc, c)=> {
            acc[HEAL] = (acc[HEAL] || 0) + c.getActiveBodyparts(HEAL);
            acc[ATTACK] = (acc[ATTACK] || 0) + c.getActiveBodyparts(ATTACK);
            acc[HEAL] = (acc[RANGED_ATTACK] || 0) + c.getActiveBodyparts(RANGED_ATTACK);
            acc[WORK] = (acc[WORK] || 0) + c.getActiveBodyparts(WORK);
            return acc;
        }, {});
        room.memory.underattack = forces[HEAL]> 10 && (forces[ATTACK]+forces[WORK]+forces[RANGED_ATTACK])>50;
        if (room.memory.underattack) {
            Game.notify(`${room.name} underAttack, ${hostiles.length} hostiles, ${JSON.stringify(forces)}`);
        }
        if (!room.memory.underattack && room.memory.dismantleRoom) {
            let roomNames = _.isString(room.memory.dismantleRoom) ? [room.memory.dismantleRoom] : room.memory.dismantleRoom;
            roomNames.forEach(remoteRoomName => {
                room.log('queueing remoteDismantlers');
                let remoteRoster = this.remoteRoster(remoteRoomName);
                if (true || Game.rooms[remoteRoomName]) {
                    this.queue(room, queue, 'remoteDismantler', patterns, {}, remoteRoster, 10, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });
                } else {
                    this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
                }
            });
        }
        if (!room.memory.underattack && room.memory.loot && (room.currentLedger[RESOURCE_ENERGY] || 0) > 8000) {
            let roomNames = _.isString(room.memory.loot) ? [room.memory.loot] : room.memory.loot;
            room.memory.loot = roomNames;
            roomNames.forEach(remoteRoomName => {
                room.log('queueing looters for ', remoteRoomName);
                room.log('queueing looters for ', remoteRoomName);
                let remoteRoster = this.remoteRoster(remoteRoomName);
                // this.queue(room, queue, 'archer', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
                if (Game.rooms[remoteRoomName]) {
                    let max = Game.rooms[remoteRoomName].find(FIND_STRUCTURES).reduce((total, s)=> {
                        total = total + (s.energy || (s.store && _.sum(s.store)) || 0) + (s.mineralAmount || 0);
                        return total;
                    }, 0);
                    max = Game.rooms[remoteRoomName].find(FIND_DROPPED_RESOURCES).reduce((total, s)=> (total + s.amount), max);
                    if (max === 0) {
                        _.pull(room.memory.loot, remoteRoomName);
                    } else {
                        this.queue(room, queue, 'looter', patterns, currentSplit, remoteRoster, Math.ceil(max / 15000), {remoteRoom: remoteRoomName});
                    }
                } else {
                    this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
                }
            });
        }
        if (!room.memory.underattack && room.memory.harass) {
            let roomNames = _.isString(room.memory.harass) ? [room.memory.harass] : room.memory.harass;
            room.memory.harass = roomNames;
            roomNames.forEach(remoteRoomName => {
                // room.log('queueing harassers for ', remoteRoomName);
                let remoteRoster = this.remoteRoster(remoteRoomName);
                this.queue(room, queue, 'harasser', patterns, currentSplit, remoteRoster, 1, {
                    remoteRoom: remoteRoomName,
                    ignoreInvader: true
                });
            });
        }
        // fill one room at a time
        if (!room.memory.underattack && room.memory.remoteMining) {
            let memory = room.memory.remoteMining;
            let rooms = _.isString(memory) ? [memory] : memory;
            // room.log('remoteMining rooms', JSON.stringify(rooms));
            // rooms = _.sortBy(rooms, (r)=>util.roomDistance(room.name, r));
            // only process next room when previous one is full
            rooms.find((name)=> {
                if (Game.rooms[name]) {
                    let hostiles = Game.rooms[name].find(FIND_HOSTILE_CREEPS).filter(c=>!c.owner || c.owner.username === 'Invader');
                    if (hostiles.length) {
                        this.queueCustomGuard(room, queue, hostiles, patterns, this.remoteRoster(name), name);
                    }
                    // this.queue(room, queue, 'roleSoldier', patterns, currentSplit, this.remoteRoster(name), 1, {remoteRoom: name});
                }
                // room.log(`queued ${queued} for ${name} remoteMining`);
                let previousQueueLength = queue.length;
                this.addRemoteMiningToQueue(name, room, patterns, currentSplit, queue);
                return queue.length - previousQueueLength;
            });

        }
        if (!room.memory.underattack && room.memory.remotePortalMining) {
            let memory = room.memory.remotePortalMining;
            let rooms = _.isString(memory) ? [memory] : memory;
            // room.log('remoteMining rooms', JSON.stringify(rooms));
            // rooms = _.sortBy(rooms, (r)=>util.roomDistance(room.name, r));
            // only process next room when previous one is full
            rooms.forEach((name)=> {
                // room.log(`queued ${queued} for ${name} remoteMining`);
                this.addRemotePortalMiningToQueue(name, room, patterns, currentSplit, queue);
            });

        }

        if (!room.memory.underattack && room.memory.siege) {
            let siege = _.isString(room.memory.siege) ? [room.memory.siege] : room.memory.siege;
            siege.forEach(remoteRoomName=> {
                let required = _.get(Memory, ['siege', remoteRoomName, 'squad'], {towerDrainer: 1, towerAttacker: 1});
                let memory = _.get(Memory, ['siege', remoteRoomName, 'memory'], {remoteRoom: remoteRoomName});
                let remoteRoster = this.remoteRoster(remoteRoomName, c=>c.spawning || c.ticksToLive > 250);
                _.keys(required).forEach(role=>this.queue(room, queue, role, patterns, currentSplit, remoteRoster, required[role], memory));
                // this.queue(room, queue, 'towerDrainer', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
                // if (Game.rooms[remoteRoomName]) {
                // this.queue(room, queue, 'towerAttacker', patterns, currentSplit, remoteRoster, 2, {remoteRoom: remoteRoomName});
                // this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
                // this.queue(room, queue, 'scout2', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
                // }
            });
        }
        if (!room.memory.underattack && room.memory.attack) {
            let remoteRoomName = room.memory.attack;
            let remoteRoster = this.remoteRoster(remoteRoomName);
            if (!Game.rooms[remoteRoomName] || remoteRoster['attacker'] || 0 < 1) {
                this.queue(room, queue, 'attacker', patterns, currentSplit, remoteRoster, 1, {remoteRoom: remoteRoomName});
            }
        }
        if (!room.memory.underattack && (room.controller.level > 4 && room.memory.reserve)) {
            let rooms = _.isString(room.memory.reserve) ? [room.memory.reserve] : room.memory.reserve;
            rooms.forEach((remoteRoomName)=> {
                let remoteRoster = this.remoteRoster(remoteRoomName, (c)=> (!c.ticksToLive) || c.ticksToLive > c.body.length * 3 + 50);

                let remoteRoom = Game.rooms[remoteRoomName];
                if (!remoteRoom) {
                    this.queue(room, queue, 'scout', patterns, currentSplit, remoteRoster, 1, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });

                } else if (remoteRoom.controller && !remoteRoom.controller.owner
                    && _.get(remoteRoom.controller, ['reservation', 'username'], room.controller.owner.username) === room.controller.owner.username
                    && _.get(remoteRoom.controller, ['reservation', 'ticksToEnd'], 0) < 1000) {
                    this.queue(room, queue, 'reserver', patterns, currentSplit, remoteRoster, 1, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });
                }
            });
        }
        if (!room.memory.underattack && (room.controller.level > 4 && room.memory.claim)) {
            room.memory.claim = _.isString(room.memory.claim) ? [room.memory.claim] : room.memory.claim;
            let rooms = room.memory.claim;
            rooms.forEach((remoteRoomName)=> {
                if (Memory.rooms[remoteRoomName]) {
                    Memory.rooms[remoteRoomName].assistedBy = room.name;
                }
                let tripTime = _.sum(room.tripTimeToSources(remoteRoomName));
                let claimerRemoteRoster = this.remoteRoster(remoteRoomName);
                let remoteRoster = this.remoteRoster(remoteRoomName, (c)=> (!c.ticksToLive) || c.ticksToLive > c.body.length * 3 + tripTime + 10);
                'use strict';
                let remoteRoom = Game.rooms[remoteRoomName];
                if (remoteRoom && remoteRoom.controller && !remoteRoom.controller.my && _.get(remoteRoom.controller,['reservation','username'],'Finndibaen') ==='Finndibaen') {
                    this.queue(room, queue, 'claimer', patterns, currentSplit, claimerRemoteRoster, 1, {
                        remoteRoom: remoteRoomName,
                        action: 'go_remote_room'
                    });
                } else if (remoteRoom && remoteRoom.controller && remoteRoom.controller.my) {
                    let remoteSourceCount = remoteRoom.find(FIND_SOURCES).length;
                    if (remoteRoom) {
                        let hostiles = remoteRoom.find(FIND_HOSTILE_CREEPS).filter(c=>c.owner.username === 'Invader');
                        if (hostiles.length) {
                            this.queueCustomGuard(room, queue, hostiles, patterns, remoteRoster, remoteRoomName);
                        }
                        // this.queue(room, queue, 'roleSoldier', patterns, {}, remoteRoster, 1, {remoteRoom: remoteRoomName});
                    }
                    if (remoteRoom.controller.level < 4 && remoteRoom.energyCapacityAvailable < 550) {
                        room.log('queueing remoteHarvester for claimed room', tripTime, remoteRoster['remoteHarvester']);
                        this.queue(room, queue, 'remoteHarvester', patterns, currentSplit, remoteRoster, remoteSourceCount, {
                            remoteRoom: remoteRoomName,
                            action: 'go_remote_room'
                        });
                        let carryRoster = _.countBy(_.values(Game.creeps).filter((c)=> c.memory.role === 'carry' && c.memory.homeroom === remoteRoomName), (c)=>c.memory.role);
                        this.queue(room, queue, 'carry', patterns, carryRoster, {}, 1, {
                            homeroom: remoteRoomName,
                            tasks: [{name: 'MoveToRoom', args: {room: remoteRoomName}}]
                        });
                        if (remoteRoom.memory.remoteMining) {
                            remoteRoom.memory.remoteMining.forEach(remoteMining => {
                                this.addRemoteMiningToQueue(remoteMining, remoteRoom, patterns, remoteRoster, queue);
                            });
                        }
                    }
                    if (remoteRoom.controller.level < 4) {
                        this.queue(room, queue, 'remoteUpgrader', patterns, currentSplit, remoteRoster, 1, {
                            remoteRoom: remoteRoomName,
                            action: 'go_remote_room'
                        });
                    } else if (_.head(remoteRoom.find(FIND_MY_SPAWNS))) {
                        delete remoteRoom.assistedBy;
                        _.pull(room.memory.claim, remoteRoom.name);
                    }

                    if (remoteRoom.find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
                        this.queue(room, queue, 'remoteBuilder', patterns, {}, remoteRoster, 1, {
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
        if (!room.memory.underattack && room.memory.remotebuild) {
            let rooms = _.isString(room.memory.remotebuild) ? [room.memory.remotebuild] : room.memory.remotebuild;
            rooms.forEach((roomName)=> {
                'use strict';
                let tripTime = _.sum(room.tripTimeToSources(roomName));
                let remoteRoster = this.remoteRoster(roomName, (c)=> (!c.ticksToLive) || c.ticksToLive > c.body.length * 3 + tripTime + 10);
                let remoteRoom = Game.rooms[roomName];
                if (!remoteRoom) {
                    patterns['remoteBuilder'].count = 0;
                    this.queue(room, queue, 'scout', patterns, currentSplit, {}, 1, {remoteRoom: roomName});
                } else {
                    if (remoteRoom.controller && remoteRoom.controller.my && remoteRoom.find(FIND_MY_SPAWNS) == 0) {
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
                        this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 3 - remoteRoom.structures[STRUCTURE_EXTENSION].length
                            , {remoteRoom: roomName, action: 'go_remote_room'});
                    } else {
                        this.queue(room, queue, 'remoteBuilder', patterns, currentSplit, remoteRoster, 1
                            , {remoteRoom: roomName, action: 'go_remote_room'});
                    }
                }
            });
            // room.log('remotebuilders', patterns['remoteBuilder'].count)
        }
        this.handleEnergyAssist(room, patterns, queue);
        if (room.memory.underattack) {
            this.queue(room, queue, 'defender', patterns, currentSplit, {}, hostiles.length, {});
            Game.notify(`${Game.time} hostiles ${room.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile && c.owner.username !== 'Invader').map(c=>c.owner.username)}, queueing defender`);
        }
        if (!room.memory.underattack && room.memory.scout) {
            this.queue(room, queue, 'scout', patterns, {}, this.remoteRoster(room.memory.scout), 1, {});
        }
        if (room.controller.level >= 4 && room.storage) {
            if ((room.currentLedger[RESOURCE_ENERGY] || 0) > 2000) {
                if (room.storage.store.energy < 10000) {
                    patterns['upgrader'].count = 0;
                } else if (room.controller.level < 7) {
                    patterns['upgrader'].count = Math.floor(Math.min(room.storage.store.energy / 15000, 1));
                } else if (room.controller.level >= 7) {
                    patterns['upgrader'].count = Math.min(Math.floor(room.storage.store.energy / 50000), 2 - (room.controller.level - 7));
                }
                let neededGatherers = Cache.get(room.memory.cache, 'neededGatherers', () => {
                    let sourceWithoutLinks = room.find(FIND_SOURCES).filter(source =>!source.link());
                    let totalDistance = sourceWithoutLinks.reduce((d, s)=>d + room.storage.pos.findPathTo(s).length, 0);
                    let carryNeeded = 3000 * (2 * totalDistance) / 300; // 3K energy per source every 300 ticks, round trip distance
                    let sampleGatherer = room.find(FIND_MY_CREEPS).find(c=>c.memory.role === 'energyGatherer');
                    return carryNeeded ? Math.ceil(carryNeeded / (sampleGatherer ? sampleGatherer.carryCapacity : 800)) : 0;
                }, 1500);
                room.memory.cache.neededGatherers = room.memory.cache.neededGatherers || {date: 0};
                patterns['carry'].count = 0;
                patterns['energyFiller'].count = (room.currentLedger[RESOURCE_ENERGY] || 0) > 5000 && room.spawnWait > 500 ? 2 : 1;
                if (room.controller.level >= 4 && currentSplit['upgrader'] > 0) {
                    let linksDeliverySpeed = Cache.get(room.memory.cache, 'upgraderLinkSpeed', () => {
                        // upgrade container can be filled by links AND upgradeFillers
                        let linksDeliverySpeed = 0;
                        let links = room.structures[STRUCTURE_LINK];
                        if (links.length) {
                            let linksWithContainers = links.filter(l=>
                            l.room.glanceForAround(LOOK_STRUCTURES, l.pos, 2, true).map(s=>s.structure)
                                .filter(s=> s.structureType === STRUCTURE_CONTAINER || s === room.storage).length > 0);
                            // room.log('linksWithContainers', linksWithContainers.length);
                            let controllerLink = linksWithContainers.find(l=>l.type().indexOf('controller') >= 0);
                            let storageLink = linksWithContainers.find(l=>l.type().indexOf('storage') >= 0);
                            if (controllerLink && storageLink) {
                                linksDeliverySpeed = 800 / (storageLink.pos.getRangeTo(controllerLink));
                            } else {
                                linksDeliverySpeed = 0;
                            }
                        }
                        return linksDeliverySpeed;
                    }, 1500);
                    let upgradeFillerSpeed = Cache.get(room.memory.cache, 'upgraderFillerSpeed', () => {
                        let path = util.safeMoveTo2({
                            pos: room.controller.pos,
                            room: room,
                            log: this.log
                        }, room.storage.pos, {range: 1});
                        let pathLength = _.sum(util.pathCost(path, this));
                        // room.log('path length to controller', pathLength);
                        let capacity = this.carryCapacity(room, patterns['upgradeFiller']);
                        return capacity / (2 * pathLength);
                    }, 1500);
                    let upgraderSpeed = Cache.get(room.memory.cache, 'upgraderSpeed', () => {
                        let upgraderBody = this.shapeBody(room, patterns['upgrader'].body).body;
                        return _.countBy(upgraderBody)[WORK];
                    }, 1500);
                    // room.log(`upgraders ${currentSplit['upgrader']} upgradeSpeed ${upgraderSpeed}, linksDeliverySpeed ${linksDeliverySpeed}, upgradeFillerSpeed ${upgradeFillerSpeed}`);
                    let neededFillers = Math.floor(((currentSplit['upgrader'] || 0) * upgraderSpeed - linksDeliverySpeed) / upgradeFillerSpeed);
                    // room.log(`neededFillers ${1.2 * ((currentSplit['upgrader'] || 0) * upgraderSpeed - linksDeliverySpeed) / upgradeFillerSpeed}`);
                    patterns['upgradeFiller'].count = neededFillers;
                }
                if (currentSplit['carry'] > 0) {
                    let carrys = room.find(FIND_MY_CREEPS).filter(c=>'carry' === c.memory.role && !c.memory.homeroom);
                    let repurposedGatherers = 0;
                    room.find(FIND_SOURCES).forEach(s=> {
                        //  make sure we dont transform all carrys into gatherers
                        if (carrys.length) {
                            carrys.pop().memory.role = 'energyFiller';
                        }
                        if (carrys.length && repurposedGatherers < neededGatherers) {
                            repurposedGatherers++;
                            carrys.pop().memory.role = 'energyGatherer';
                        }
                    });

                    while (carrys.length && repurposedGatherers < neededGatherers) {
                        repurposedGatherers++;
                        carrys.pop().memory.role = 'energyGatherer';
                    }
                    while (carrys.length) {
                        carrys.pop().memory.role = 'energyFiller';
                    }
                    currentSplit = util.roster(room, (c)=> (!c.ticksToLive) || c.ticksToLive > (c.body.length * 3) && !c.memory.remoteRoom);
                }
                patterns['energyGatherer'].count = neededGatherers;
            } else {
                if (currentSplit['energyFiller'] + currentSplit['energyGatherer'] > 0) {
                    room.find(FIND_MY_CREEPS).filter(c=>['energyFiller', 'energyGatherer'].indexOf(c.memory.role) >= 0).forEach(c=>c.memory.role = 'carry');
                    currentSplit = util.roster(room, (c)=> (!c.ticksToLive) || c.ticksToLive > (c.body.length * 3) && !c.memory.remoteRoom);
                }
            }
        } else {
            patterns['carry'].count = 2; // at least 2 carry to not be stuck with 0 then the 1 dies
        }
        if (room.controller.level >= 5) {
            // room.log('checking linkOperators');
            let links = room.structures[STRUCTURE_LINK].filter(s=>Cache.get(s.memory, 'active', ()=>s.isActive(), 1500));
            if (links.length) {
                let linksWithContainers = links.filter(l=> !l.source() && l.container);
                let currentOperators = room.find(FIND_MY_CREEPS).filter(c=>c.memory.role === 'linkOperator');
                // room.log('linksWithContainers', linksWithContainers.length);

                let linksMissingOperators = linksWithContainers.filter(l=>!(currentOperators.find(c=>c.memory.link === l.id))
                    && (l.pos.getRangeTo(l.room.controller) > 5 || currentSplit['upgrader'])// controller link only needs operators if upgraders
                );
                linksMissingOperators.forEach(l=> {
                    // room.log('link with no operator', l.id, l.pos);
                    this.queue(room, queue, 'linkOperator', patterns, {}, {}, 1, {link: l.id});
                });

            }
        } else {
            // room.log('no need for linkOperators');
        }

        if (room.controller.level >= 6) {
            let extractors = room.structures[STRUCTURE_EXTRACTOR];
            if (extractors.length > 0) {
                if (room.storage /*&& room.storage.store.energy > 10000*/) {
                    let minerals = room.find(FIND_MINERALS).filter((min)=>min.mineralAmount > 0);
                    let storedMinerals = room.storage.store;
                    minerals.forEach((m)=> {
                        // room.log('mineral', m.mineralType, storedMinerals[m.mineralType], storedMinerals[m.mineralType] < 100000, m.mineralAmount);
                        if (!(storedMinerals[m.mineralType]) || storedMinerals[m.mineralType] < 300000 && m.mineralAmount) {
                            patterns['mineralHarvester'].count = m.accessTiles;
                            patterns['labOperator'].count = 1;
                        }
                    });
                }
                // room.log('mineralHarvester?', patterns['mineralHarvester'].count);

            }
            let labs = room.structures[STRUCTURE_LAB];
            if (labs.length || room.terminal) {
                patterns['labOperator'].count = 1;
            }
            // this.handleMineralImport(room, queue, patterns);
        }
        let constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        if (constructionSites.length) {
            patterns['builder'].count = (room.storage ? (room.currentLedger['energy'] || 0) > 5000 : true) ? 1 : 0;
            patterns['upgrader'].count = 0;
            // patterns['repair2'].count = 1;
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
        let sources = room.find(FIND_SOURCES);
        if (!room.memory.sourceDistance) {
            room.memory.sourceDistance = sources.length > 1 ? PathFinder.search(sources[0].pos, {
                pos: sources[1].pos,
                range: 1
            }, {
                plainCost: 1,
                swampCost: 1
            }).path.length : Infinity;
        }
        let sourceAndLinks = sources.map(s=>[s, s.link()]);
        let useLinks = room.controller.level >= 5 && !sourceAndLinks.find(pair=>!pair[1]);
        if (sources.length > 1 && room.memory.sourceDistance <= 25 && room.energyCapacityAvailable >= 1550) {
            patterns['harvester'].count = 1;
            patterns['harvester'].body = (room, budget)=> {
                let harvestNeeded;
                if (room.memory.sourceDistance <= 6 || room.memory.sourceDistance === 13) {
                    harvestNeeded = 22;
                } else if (room.memory.sourceDistance === 14) {
                    harvestNeeded = 26;
                } else {
                    harvestNeeded = 24;
                }
                let speedNeeded = Math.floor((150 - (3000 / harvestNeeded )) / room.memory.sourceDistance);
                let requirements = CreepShaper.requirements().minimum(HARVEST, harvestNeeded).minimum(EMPTY_ROAD_SPEED, 1 / speedNeeded);
                if (useLinks) {
                    requirements = requirements.minimum(CAPACITY, 50);
                }
                return CreepShaper.shape(requirements,
                    {
                        budget: budget ? budget : room.energyCapacityAvailable,
                        cache: budget ? {} : room.memory.creepShaper,
                        name: 'harvester',
                        availableBoosts: room.allowedBoosts('harvester')
                    });
            };
            patterns['harvester'].memory.uselink = useLinks;
        } else {
            if (!useLinks) {
                patterns['harvester'].count = sources.length;
            } else {
                patterns['harvester'].count = 0;
                let harvesters = room.find(FIND_MY_CREEPS).filter(c=>c.memory.role === 'harvester').concat(queue.filter(spec=>spec.memory.role === 'harvester'));
                if (harvesters.length < sourceAndLinks.length) {
                    sourceAndLinks.forEach(pair=> {
                        this.queue(room, queue, 'harvester', patterns, {harvester: harvesters.filter(c=>c.memory.source === pair[0].id && c.memory.link === pair[1].id).length}, {}, 1, {
                            source: pair[0].id,
                            link: pair[1].id,
                            uselink: true
                        });
                    });
                }

            }
        }
        // room.log('carry:',patterns['carry'].count);
        // patterns['upgrader'].count = Math.ceil(patterns['upgrader'].count * sources.length / 2);
        this.updateNeeds(room, patterns);
        _.keys(patterns)
            .forEach((role)=> {
                'use strict';
                let count = patterns[role].count;
                if (count > 0) {
                    // room.log('queueing', role, patterns[role].count);
                    this.queue(room, queue, role, patterns, currentSplit, {}, patterns[role].count, {});
                }
            });
        if (queue.length == 0 && room.controller.level <= 7 && room.energyAvailable >= room.energyCapacityAvailable && room.findContainers()
                .filter((s)=>
                    (s.energyCapacity && s.energy !== s.energyCapacity )
                    || (s.storeCapacity && s.storeCapacity !== _.sum(s.store))
                ).length === 0) {
            room.log('overflowing, building upgrader');
            this.queue(room, queue, 'upgrader', patterns, currentSplit, {}, currentSplit['upgrader'] + 1, {});
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

    createCreep(creep, buildSpec) {
        // creep.log('createCreep', JSON.stringify(buildSpec));
        if (!buildSpec.memory || !buildSpec.body) {
            creep.log('ERROR, invalid create', JSON.stringify(buildSpec));
        }
        if (_.isString(buildSpec.body)) {
            buildSpec.body = util.stringToBody(buildSpec.body);
        }
        let name = `${buildSpec.memory.role}_${creep.room.name}_${Game.time % 1500}`;
        let canCreate = creep.createCreep(buildSpec.body, name, buildSpec.memory);
        // if (canCreate === ERR_NAME_EXISTS) name = creep.room.name + '_' + name; // todo if it ever happens ...
        if ('number' !== typeof canCreate) {
            this.updateCounters(creep, {spawning: 1});
            creep.room.memory.addRefillTasks = true;
            creep.log('building ', creep.room.energyAvailable, creep.room.energyCapacityAvailable, JSON.stringify(_.countBy(buildSpec.body)), JSON.stringify(buildSpec.memory));
            creep.memory.build = {start: Game.time, name: canCreate, memory: buildSpec.memory};
            creep.room.memory.building = creep.room.memory.building || {};
            _.keys(creep.room.memory.building).filter(k=>creep.room.memory.building[k].start < Game.time - 150).forEach(k=>delete creep.room.memory.building[k]);
            creep.room.memory.building[creep.memory.build.name] = creep.memory.build;
            if (buildSpec.memory.remoteRoom) {
                creep.room.memory.efficiency = creep.room.memory.efficiency || {};
                creep.room.memory.efficiency.remoteMining = creep.room.memory.efficiency.remoteMining || {};
                let creepCost = _.sum(buildSpec.body, (part=>BODYPART_COST[part]));
                creep.room.memory.efficiency.remoteMining [buildSpec.memory.remoteRoom] = (creep.room.memory.efficiency.remoteMining [buildSpec.memory.remoteRoom] || 0) - creepCost;
            }
        } else if (ERR_NAME_EXISTS === canCreate) {
            // TODO keeps happening a lot
            // Game.notify('name conflict ' + name);
            creep.log('name conflict ' + name);
        } else {
            creep.log('create?', canCreate, JSON.stringify(buildSpec.body), JSON.stringify(buildSpec.memory));

        }
    }

    run(room) {
        'use strict';
        if (!room.controller || !room.controller.my || !room.controller.level) {
            return;
        }
        let localRoster = util.roster(room);

        let nonSpawningSpawns = room.find(FIND_MY_SPAWNS, {
            filter: (spawn)=> {
                if (spawn.spawning) {
                    this.updateCounters(spawn, {spawning: 1});
                    // spawn.log('adding to localRoster', spawn.memory.build.memory.role);
                    localRoster[spawn.memory.build.memory.role] = (localRoster[spawn.memory.build.memory.role] || 0) + 1;
                    return false;
                } else if (!Cache.get(spawn.memory, 'active', ()=>spawn.isActive(), 1500)) {
                    return false;
                } else {
                    if (spawn.memory.build && spawn.memory.build.name && room.memory.building) {
                        delete room.memory.building[spawn.memory.build.name];
                    }
                    return true;
                }
            }
        });

        if (nonSpawningSpawns.length === 0 || room.memory.assisted) {
            // creep.log('spawning');
            return;
        }
        let roomPatterns = _.cloneDeep(this.patterns);
        // this.updateNeeds(room, roomPatterns);

        // creep.log('harvesters', harvesters.length);
        let memoryQueue = room.memory.spawnQueue || {date: -100}, queue;
        let hostiles = room.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile);
        if (hostiles.filter(c=>'Invader' !== c.owner.username && c.getActiveBodyparts(HEAL) > 10).length > 0 && room.structures[STRUCTURE_TOWER].length > 0) {
            room.memory.emergency = true;
            Game.notify(`${Game.time} EMERGENCY in ${room.name}, ${hostiles.map(c=>util.bodyToShortString(c.body))} ${hostiles.map(c=>c.owner.username)}`);
            // room.prepareBoosts(['XUH2O']);
        } else {
            room.memory.emergency = false;
            // if (_.contains(room.memory.preparedBoosts, 'XUH2O')) {
            //     _.pull(room.memory.preparedBoosts, 'XUH2O');
            // }
        }

        if (room.memory.emergency && !(localRoster['defender'])) {
            memoryQueue = {queue: [], date: Game.time};
            queue = memoryQueue.queue;
            this.queue(room, queue, 'defender', patterns, localRoster, {}, room.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile).length / 4);
            this.queue(room, queue, 'energyFiller', patterns, localRoster, {}, patterns['energyFiller'].count + 1);
            memoryQueue.queue = memoryQueue.queue.map((spec)=> {
                let shaped = this.shapeBody(room, spec.body);
                spec.body = shaped.body;
                spec.cost = shaped.cost;
                return spec;
            });
        } else if (Game.time < memoryQueue.date + 50 && memoryQueue.queue.length > 0) {
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
        if (room.controller.level >= 2 && room.controller.level < 8 && queue.length === 0 && room.energyAvailable >= room.energyCapacityAvailable) {
            // approximation of energy consumed per tick
            let factors = {
                upgrader: 6 * room.controller.level,
                repair2: 2 * room.controller.level,
                builder: 8 * room.controller.level
            };
            let baseline = _.keys(localRoster).reduce((sum, role)=>sum + (factors[role] || 0) * (localRoster[role] || 0), 0);
            if ((room.storage && (room.currentLedger['energy'] || 0) > room.controller.level * 10000 + 1500 * baseline )
                // all container full or almost
                || !room.findContainers().find((s)=> !s.room.isHarvestContainer(s) && (s.storeCapacity && _.sum(s.store) < 0.9 * s.storeCapacity) || (s.energyCapacity && s.energy < 0.9 * s.energyCapacity))) {
                let spec = roomPatterns[(room.find(FIND_CONSTRUCTION_SITES).length === 0 && room.controller.level < 8) ? 'upgrader' : 'builder'];
                let wantMore = true;
                if (wantMore) {
                    let shaped = this.shapeBody(room, spec.body);
                    spec.body = shaped.body;
                    spec.cost = shaped.cost;
                    queue.push(spec);
                }
            }
        }
        if (!room.memory.emergency && room.controller.ticksToDowngrade < 1000 && !localRoster['upgrader']) {
            let spec = roomPatterns['upgrader'];
            let shaped = this.shapeBody(room, spec.body);
            spec.body = shaped.body;
            spec.cost = shaped.cost;
            queue = [spec];
        }
        // TODO if drop containers are > 75% increase creep count ?
        // let keeperCount = queue.filter((spec)=>spec.memory && spec.memory.role === 'keeperGuard').length;
        // if (keeperCount) room.log('queued keeperGuards ', keeperCount);
        // room.log(`queued ${queue.length}`, queue.length ? JSON.stringify(queue[0]) : 'none');
        if (queue.length === 0) {
            let idleTicks = _.sum(nonSpawningSpawns, s=>(s.memory.spawns || {}).idle);

            // room.log(`empty room, looking for steal opportunities, idling ${idleTicks}`);
            try {
                if (idleTicks > 100 * nonSpawningSpawns.length) {
// find room to help
                    let remoteSpawns = _.values(Game.spawns).filter(s=>s.room.name !== room.name);
                    if (remoteSpawns.length) {
                        // room.log(`checking for queue stealing`);
                        let stolen = this.stealFromSpawnQueue(room, remoteSpawns);
                        if (stolen) {
                            room.log(`stole ${stolen.memory.role}, ${JSON.stringify(stolen.memory)}`);
                            Game.notify(`${room.name} stole ${stolen.memory.role}, ${JSON.stringify(stolen.memory)} from ${stolen.memory.homeroom}`);
                            queue.push(stolen);
                        }
                    }
                }
            } catch (e) {
                room.log(e);
                room.log(e.stack);
            }
        }
        let currentlySpawning = (role, memory)=> {
            let allSpawns = room.find(FIND_MY_SPAWNS).filter(s=>Cache.get(s.memory, 'active', ()=>s.isActive(), 1500));
            return !!allSpawns.find(s=>s.spawning && _.get(s.memory, ['build', 'memory', 'role']) === role && _.isEqual(memory, _.get(s.memory, ['build', 'memory'])));
        };
        if (room.memory.assistedBy) {
            if (_.get(Game.rooms, [room.memory.assistedBy,'memory','assist'],[]).indexOf(room.name)<0) {
                delete room.memory.assistedBy;
            } else if (_.get(room,['controller','level'],0)>=6) {
                delete room.memory.assistedBy;
                _.pull(_.get(Game.rooms, [room.memory.assistedBy,'memory','assist'],[]),room.name);
            }
        }
        let needHarvester = localRoster['harvester'] == 0 && !(room.memory.assistedBy && room.energyCapacityAvailable < 550)/*
         && !currentlySpawning('harvester')*/;
        let needCarry = ((localRoster['carry'] || 0) + (localRoster['energyFiller'] || 0) == 0) && !room.memory.assistedBy;
        // && !currentlySpawning('energyFiller')
        // && !currentlySpawning('carry');

        if (room.storage) {
            let storageLink = room.structures[STRUCTURE_LINK].find(l=>Cache.get(l.memory, 'active', ()=>l.isActive(), 1500) && l.pos.getRangeTo(room.storage) <= 2);
            if (storageLink && !storageLink.operator
                && !currentlySpawning('linkOperator', {role: 'linkOperator', link: storageLink.id})/*
             && !(queue.find(s=>s.memory.role === 'linkOperator' && s.memory.link === storageLink.id))*/
            ) {
                let queued = queue.find(s=>s.memory.role === 'linkOperator' && s.memory.link === storageLink.id);
                if (queued) {
                    queued.priority = 3.5;
                    queue = _.sortBy(queue, (elem)=> elem.priority);
                } else {
                    let buildSpec = _.cloneDeep(patterns['linkOperator']);
                    buildSpec.memory.emergency = true;
                    buildSpec.memory.link = storageLink.id;
                    let shapeBody2 = this.shapeBody(room, buildSpec.body, room.energyAvailable);
                    buildSpec.body = shapeBody2.body;
                    buildSpec.cost = shapeBody2.cost;
                    queue.unshift(buildSpec);
                }
            }
        }
        nonSpawningSpawns.forEach(
            (spawn) => {
                let buildSpec;
                let waitFull = false, immediate = true;
                if (!room.memory.emergency && needHarvester) {
                    if (room.energyAvailable >= 250) {
                        queue = [];
                        buildSpec = _.cloneDeep(patterns['harvester']);
                        buildSpec.memory.emergency = true;
                        buildSpec.body = this.shapeBody(room, buildSpec.body, room.energyAvailable).body;
                        needHarvester = false;
                        Game.notify(`${room.name} emergency harvester`);
                        room.log('immediate harvester', JSON.stringify(buildSpec));
                    }
                } else if (!room.memory.emergency && needCarry && _.sum(room.find(FIND_DROPPED_RESOURCES).filter(d=>d.resourceType === RESOURCE_ENERGY), (r)=>r.amount) > 300) {
                    if (room.energyAvailable >= 100) {
                        queue = [];
                        buildSpec = _.cloneDeep(patterns['carry']);
                        buildSpec.memory.emergency = true;
                        buildSpec.body = this.shapeBody(room, buildSpec.body, room.energyAvailable).body;
                        needCarry = false;
                        room.log('immediate carry(pickup)', JSON.stringify(buildSpec));
                    }
                } else if (!room.memory.emergency && needCarry) {
                    if (room.energyAvailable >= 100) {
                        queue = [];
                        buildSpec = _.cloneDeep(patterns[_.get(room, ['storage', 'store', 'energy'], 0) > 2000 ? 'energyFiller' : 'carry']);
                        buildSpec.memory.emergency = true;
                        buildSpec.body = this.shapeBody(room, buildSpec.body, room.energyAvailable).body;
                        needCarry = false;
                        room.log('immediate carry', JSON.stringify(buildSpec));
                    }
                } else if (queue.length > 0) {
                    buildSpec = queue.shift();
                    immediate = false;
                }
                if (buildSpec) {
                    if (!buildSpec.body) {
                        room.log('no body !!', JSON.stringify(buildSpec));
                    } else if (!buildSpec.body.indexOf) {
                        Game.notify(`${room.name} body not resolved ${JSON.stringify(buildSpec)}`);
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
                            // Game.notify(`${Game.time} ${spawn.name} building ${buildSpec.memory.role},queue length ${queue.length} queued keeperGuards ${queue.filter((s)=>s.memory.role === 'keeperGuard').length}`);
                            this.createCreep(spawn, buildSpec);
                        } else if (immediate) {
                            //  this is the max we can build anyway
                            // room.log('best we can do ..., building', shapedAndCost.cost, JSON.stringify(shapedAndCost.body));
                            buildSpec.body = this.shapeBody(room, buildSpec.body, room.energyAvailable).body;
                            spawn.log('queue length', queue.length);
                            // Game.notify(`${Game.time} ${spawn.name} building ${buildSpec.memory.role},queue length ${queue.length} queued keeperGuards ${queue.filter((s)=>s.memory.role === 'keeperGuard').length}`);
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
        Memory.stats.room = Memory.stats.room || {};
        Memory.stats.room [room.name] = Memory.stats.room [room.name] || {};
        Memory.stats.room [room.name].spawns = Memory.stats.room [room.name].spawns || {};
        _.keys(base).forEach(
            (k)=> {
                // sum the bits for each spawns
                Memory.stats.room [room.name].spawns[k] = _.sum(room.find(FIND_MY_SPAWNS), (s)=> s.memory.spawns[k]);
            }
        );
// room.log(`saving queue ${queue.length} ${memoryQueue.queue.length}`);
        room.memory.spawnQueue = memoryQueue;
        room.memory.spawnQueue.queue = queue;

    }

    stealFromSpawnQueue(homeroom, remoteSpawns) {
        // disabled
        return false;
        let remoteSpawnsWithDist = remoteSpawns
            .map(s=> ({
                dist: homeroom.memory.roomDistance && homeroom.memory.roomDistance[s.room.name] || Game.map.getRoomLinearDistance(homeroom.name, s.room.name),
                spawn: s,
                idle: s.memory.spawns.idle
            })).filter(s=>s.dist && s.dist < 3 && s.idle < 100);

        remoteSpawnsWithDist = _.sortBy(remoteSpawnsWithDist, s=>s.dist);

        let acceptPredicates = [
            spec =>spec.cost < homeroom.energyAvailable
        ];
        let stealing = remoteSpawnsWithDist.reduce((spec, spawnWithDist)=> {
            if (!spec) {
                let remoteQueue = spawnWithDist.spawn.room.memory.spawnQueue.queue;
                // homeroom.log('spawnWithDist', JSON.stringify(spawnWithDist));
                // homeroom.log(`checking ${spawnWithDist.spawn.room.name}, queue length ${remoteQueue.length}, dist ${spawnWithDist.dist}`);
                let predicates = acceptPredicates;
                let index = remoteQueue.findIndex(spec => predicates.reduce((accepted, pred)=>accepted && pred(spec), true));
                if (index >= 0) {
                    spec = remoteQueue[index];
                    homeroom.log(`stealing ${remoteQueue[index].memory} from ${spawnWithDist.spawn.room.name}`);
                    if (spec.memory.role && /remoteCarry.*/.exec(spec.memory.role)) {
                        spec.memory.homeroom = spawnWithDist.spawn.room.name;
                    } else {
                        spec.memory.tasks = [{name: 'MoveToRoom', args: {room: spawnWithDist.spawn.room.name}}];
                    }
                    remoteQueue.splice(index, 1);
                }
            }
            return spec;
        }, undefined);
        return stealing;
        /*
         let remoteQueue = remoteroom.memory.spawnQueue;
         if (remoteQueue.queue && remoteQueue.queue.length) {
         let targetIdx = remoteQueue.queue.findIndex((spec, idx)=>spec.memory && spec.memory.role && /remoteCarry.*!/.exec(spec.memory.role) && );
         let spec = remoteQueue.queue[targetIdx];
         if (spec) {
         spec.memory.homeroom = remoteroom.name;
         }
         // delete from remoteQueue
         return spec;
         }
         */
    }

    updateCounters(spawn, o) {
        'use strict';
        let obj = {idle: 0, waitFull: 0, spawning: 0, skipped: 0};
        _.merge(obj, o);
        spawn.memory.spawns = spawn.memory.spawns || {};
        util.recordActivity(spawn.memory.spawns, obj, 1500);
    }

}

require('./profiler').registerClass(new RoleSpawn(), 'new RoleSpawn()');
module.exports = new RoleSpawn();