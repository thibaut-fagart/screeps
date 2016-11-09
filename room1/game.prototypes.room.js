var _ = require('lodash');
var util = require('./util');
var Cache = require('./util.cache');
var handlers = require('./base.handlers');
var PickupManager = require('./util.manager.pickup');
const reactions = require('./role.lab_operator').reactions;

Room.prototype.findLabWith = function (resource) {
    let pairs = _.pairs(this.memory.labs);
    // creep.log('pairs', JSON.stringify(pairs));
    let find = pairs.find((pair)=>pair[1] === resource);
    // creep.log('match', JSON.stringify(find));
    if (find) {
        let labid = find[0];
        // creep.log('match', labid);
        return Game.getObjectById(labid);
    } else {
        return false;
    }

};
Room.prototype.wallsRequiringRepair = function () {
    'use strict';
    if (!this._wallsRequiringRepair) {
        let currentRoomEnergy = _.get(this,['storage','store','energy'],0 );
        let myWalls = this.structures[STRUCTURE_WALL].concat(this.structures[STRUCTURE_RAMPART].filter(s=>s.my));
        this.log('myWalls ', myWalls.length, currentRoomEnergy);
        let needRepair = myWalls
            .filter(s=>
                s.hits < s.hitsMax
                && ((currentRoomEnergy < 10000 && s.hits < 100000)
                || ( currentRoomEnergy > 10000 && s.hits < 1000000)
                || currentRoomEnergy > 100000)
            );
        this.log('needRepair ', needRepair.length);
        this._wallsRequiringRepair = _.sortBy(needRepair,(w)=>w.hits);
    }
    return this._wallsRequiringRepair;
};

Room.prototype.hasKeeperLairs = function () {
    let coords = /([EW])(\d+)([NS])(\d+)/.exec(this.name);
    let x = Math.abs(coords[2] % 10 - 5);
    let y = Math.abs(coords[4] % 10 - 5);
    return (x <= 1 && y <= 1 && !(x == 0 && y == 0));
    // this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}})
};
Room.prototype.isCenterRoom = function () {
    let coords = /([EW])(\d+)([NS])(\d+)/.exec(this.name);
    let x = Math.abs(coords[2] % 10 - 5);
    let y = Math.abs(coords[4] % 10 - 5);
    return (x == 0 && y == 0);
    // this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}})
};
Room.prototype.operateLinks = function () {
    let links = this.structures[STRUCTURE_LINK];
    if (!links.length) return;
    let storageLink = (this.storage) && links.find((l)=> l.pos.getRangeTo(this.storage) < 4);
    let controllerLink = links.find((l)=> l.pos.getRangeTo(this.controller.pos) < 5);
    let otherLinks = links.filter((l)=> (!storageLink || (storageLink && l.id !== storageLink.id)) && (!controllerLink || (controllerLink && l.id !== controllerLink.id)));
    // this.log('dropoff links', otherLinks.length);
    otherLinks = otherLinks.filter(l=>l.energy > 0.9 * l.energyCapacity);
    let linkAccepts = (link) => link && !link.energy;
    let chooseTargetLink = (amount, l1, l2)=> {
        if (linkAccepts(l1)) {
            return l1;
        } else if (linkAccepts(l2)) {
            return l2;
        }
    };
    // this.log('full links', otherLinks.length);
    otherLinks.forEach((l)=> {
        'use strict';
        let target = chooseTargetLink(l.energy, controllerLink, storageLink);
        if (target) {
            let ret = l.transferEnergy(target);
            if (ret !== OK && ret !== ERR_TIRED) {
                this.log(`failed link transfer ${l.pos}=>${target.pos} ${ret}`);
            }
        } else {
            // this.log('no valid link target');
        }
    });
    let target = storageLink ? chooseTargetLink(storageLink.energy, controllerLink, undefined) : undefined;
    if (target) {
        storageLink.transferEnergy(target);
    }
};
Room.prototype.isHarvestContainer = function (container) {
    return this.memory.harvestContainers && this.memory.harvestContainers.indexOf(container.id) >= 0;
};

Room.prototype.harvestPositions = function () {
    'use strict';
    // if (!this.memory.harvestPositions) {
    this.log('harvestPositions');
    let sources = this.find(FIND_SOURCES);
    this.log('sources', sources.length);
    this.memory.harvestPositions = sources.reduce((previous, s)=> {
        let myTiles = util.findWalkableTiles(this, this.lookAtArea(s.pos.y - 1, s.pos.x - 1, s.pos.y + 1, s.pos.x + 1), {ignoreCreeps: true});
        this.log('walkable ', myTiles.length);
        return (previous.concat(myTiles));
    }, []);
    // }
    return this.memory.harvestPositions.map((p)=>new RoomPosition(p.x, p.y, p.roomName));

};
Room.prototype.expectedMineralType = function (lab) {
    //this.log('expectedMineralType', lab.id, (this.memory.labs || [])[lab.id])
    return (this.memory.labs || [])[lab.id];
};
Room.prototype.assessThreat = function () {
    'use strict';
    if (!this.memory.threatAssessment) {
        this.memory.threatAssessment = {sources: {}, harvested: 0};
    }
    if (!this.memory.threatAssessment.lastInvadersAt) {
        // initialize to be able to get harvestRate
        this.memory.threatAssessment.lastInvadersAt = Game.time;
    }
    if (this.find(FIND_HOSTILE_CREEPS).find(c=>c.owner.username == 'Invader') && !this.memory.threatAssessment.invaders) {
        this.memory.threatAssessment.invaders = true;
        this.memory.threatAssessment.harvested = 0;
        this.memory.threatAssessment.lastInvadersAt = Game.time;
    } else {
        this.memory.threatAssessment.invaders = false;
    }

    this.memory.threatAssessment.sources = (this.memory.threatAssessment.sources) || {};
    if (this.memory.threatAssessment.sources.length) {
        this.memory.threatAssessment.sources = {};
    }
    this.find(FIND_SOURCES).forEach((source)=> {
        'use strict';
        // keep track of mined energy
        // on each tick, compare current energy to previous one. if  decrease, increment monitored harvested, else reset
        let sourceMem = this.memory.threatAssessment.sources[source.id] = this.memory.threatAssessment.sources[source.id] || {};
        let delta = sourceMem.energy - source.energy;
        if (delta > 0) {
            this.memory.threatAssessment.harvested += delta;
        } else if (delta < 0) {
            // regen occurred
        } else if (delta === 0) {
            // no harvest
        }
        sourceMem.energy = source.energy;
    });
    this.memory.threatAssessment.harvestRate = (this.memory.threatAssessment.harvested) / (Game.time - this.memory.threatAssessment.lastInvadersAt);
};
Room.efficiency = function (roomName) {
    try {
        let roomMem = Memory.rooms[roomName].efficiency || {date: Game.time};
        Memory.rooms[roomName].oldEfficiencies = Memory.rooms[roomName].oldEfficiencies || [];
        let oldMems = Memory.rooms[roomName].oldEfficiencies;
        if (!roomMem.date || roomMem.date + 500 < Game.time) {
            // console.log('archiving old efficiency', oldMems.length);
            oldMems.push(roomMem);
            if (oldMems.length > 10) oldMems.shift();
            roomMem = {date: Game.time};
            Memory.rooms[roomName].efficiency = {date: Game.time};
        }
        // [{remoteMining: {room:value}]
        let result = _.cloneDeep(roomMem);
        // console.log('oldMems', JSON.stringify(oldMems));
        oldMems.reduce((previous, current)=> {
            // console.log('previous', JSON.stringify(previous), 'current', JSON.stringify(current));
            _.keys(current).forEach((type)=> {
                'use strict';
                // console.log('oldmems','type', type);
                _.keys(current[type]).forEach((remoteRoom)=> {
                    // console.log('oldmems','previous[type]', previous[type]);
                    previous[type] = previous[type] || {};
                    previous[type][remoteRoom] = (previous[type][remoteRoom] || 0) + current[type][remoteRoom];
                });
            });
            return previous;
        }, result);
        return result;
    } catch (e) {
        console.log(e);
        console.log(e.stack);
    }
};

Room.prototype.deliver = function (fromRoom, carry) {
    this.memory.efficiency = this.memory.efficiency || {date: Game.time};
    this.memory.efficiency.remoteMining = this.memory.efficiency.remoteMining || {};
    this.memory.efficiency.remoteMining[fromRoom] = (this.memory.efficiency.remoteMining[fromRoom] || 0) + _.sum(carry);
    this.log('delivered from', fromRoom, _.sum(carry));

};
Room.prototype.updateLocks = function () {
    'use strict';
    let locks = _.pairs(this.memory.reserved);
    // this.log('updating locks');
    locks.forEach((p)=> {
        let reason = p[0];
        let sublocks = p[1];
        if (!_.isString(sublocks)) {
            _.pairs(sublocks).forEach((q)=> {
                'use strict';
                let ownerid = q[1];
                let ownee = q[0];
                if (!Game.getObjectById(ownerid)) {
                    delete this.memory.reserved[reason][ownee];
                }

            });
        } else if (!Game.getObjectById(sublocks)) {
            delete this.memory.reserved[reason];
        }
    });

};
Room.prototype.operateTowers = function () {
    this.memory.towersCache = this.memory.towersCache || {date: 0};
    let towers;
    if (!this.memory.towersCache.towers || this.memory.towersCache.date + 500 < Game.time) {
        towers = this.find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_TOWER);
        this.memory.towersCache.towers = towers.map((s) => s.id);
    }
    towers = towers || this.memory.towersCache.map(id=>Game.getObjectById(id)).filter(t=>t);
    if (towers.length && this.find(FIND_HOSTILE_CREEPS).length > 0) {
        let target = this.memory.target ? Game.getObjectById(this.memory.target) : undefined;
        if (!target || target.room.name !== this.name) {
            target = undefined;
        }
        if (!target) {
            let ignoredStructures = [STRUCTURE_ROAD, STRUCTURE_EXTRACTOR];
            let targets = this.find(FIND_HOSTILE_CREEPS).filter((target) => {
                let ranged = target.getActiveBodyparts(RANGED_ATTACK);
                let attack = target.getActiveBodyparts(ATTACK);
                let work = target.getActiveBodyparts(WORK);
                let endangeredStructures = (attack + ranged + work > 0) ? this.glanceForAround(LOOK_STRUCTURES, target.pos, 5, true).map(p=>p.structure).filter((s)=>ignoredStructures.indexOf(s.structureType) < 0) : [];
                let endangeredCreeps = (attack + ranged > 0) ? this.glanceForAround(LOOK_CREEPS, target.pos, 5, true).map(p=>p.creep).filter((c)=>c.my) : [];
                // tower.log(`target ${JSON.stringify(target.pos)}, ${target.owner.username} endangeredStructures ${endangeredStructures.length}, endangeredCreeps ${endangeredCreeps.length}`);
                if ('Invader' !== target.owner.username) {
                    Game.notify(`target ${JSON.stringify(target.pos)}, ${target.owner.username} endangeredStructures ${endangeredStructures.length}, endangeredCreeps ${endangeredCreeps.length}`);
                }
                return (target.owner.username === 'Invader') || ((endangeredStructures.length + endangeredCreeps.length) > 0);
            });
            if (targets.length) {
                target = _.head(targets);
                // todo prioritize
            }
        }
        if (target) {
            this.log(`firing at ${target.owner.username} ${target.pos}`);
            towers.forEach((tower)=> tower.attack(target));
            return;
        }
    }
    let expectedHeal = (creep, tower)=> {
        'use strict';
        let range = creep.pos.getRangeTo(tower);
        let effectiveRange = Math.min(Math.max(5, range), 20);
        return 500 - 20 * effectiveRange;
    };
    let hurtCreeps = _.sortBy(this.find(FIND_MY_CREEPS).filter(c=>c.hits < c.hitsMax && c.getActiveBodyparts(HEAL) == 0), c=>c.hits - c.hitsMax);
    hurtCreeps.forEach(c=> {
        'use strict';
        if (towers.length) {
            let missingHealth = c.hitsMax - c.hits;
            while (towers.length > 0 && missingHealth > 0) {
                _.sortBy(towers, (t=>t.pos.getRangeTo(c)));
                let healBy = _.head(_.pullAt(towers, 0));
                missingHealth = missingHealth - expectedHeal(c, healBy);
                healBy.heal(c);
            }
        }
    });
};
Room.prototype.gc = function () {
    'use strict';
    let structuresMemory = this.memory.structures;
    if (structuresMemory) {
        let ids = _.keys(structuresMemory);
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            if (!Game.getObjectById(id)) {
                delete this.memory.structures.id;
            }
        }
    }
    this.memory.harvestContainers = (this.memory.harvestContainers || []).filter((id)=>Game.getObjectById(id));
    if (this.memory.pickupManager) {
        PickupManager.getManager(this.name).gc();
    }
};
/**
 *
 * @param {number|{x,y}} x
 * @returns {{x,y}}
 */
function mirror(x) {
    if ('number' === typeof x) {
        return x === 0 || x === 49 ? 49 - x : x;
    } else if ('number' === typeof x.x && 'number' === typeof x.y) {
        return {x: mirror(x.x), y: mirror(x.y)};
    } else {
        throw new Error('unexpected argument', x);
    }
}

/**
 * only called when exit doesn't exist
 * computes all missing exits from room to targetRoom
 *
 * @param {Room} room
 * @param {string} targetRoom
 * @returns nothing
 */
function findExit(room, targetRoom) {
    let roomName, roomMemory, entryPoint;
    // room case
    roomName = room.name;
    roomMemory = room.memory;
    entryPoint = new RoomPosition(20, 20, roomName);
    if (!targetRoom || (roomName === targetRoom)) {
        room.log('findExit,invalid params', roomName, targetRoom);
        throw new Error('findExit,invalid params ' + room + ',' + targetRoom);
    }
    // room.log('findExit', targetRoom, roomMemoryName);
    let exit;
    // room.log('known?',!!roomMemory[roomMemoryName]);
    // logWith.log('finding exit', roomName, targetRoom);
    let route = Game.map.findRoute(roomName, targetRoom, {
        routeCallback: function (roomName, fromRoomName) {
            if (Game.rooms[roomName]) {
                return 1;
            } else if (Memory.rooms[fromRoomName] && Memory.rooms[fromRoomName].exits && Memory.rooms[fromRoomName].exits[roomName] && !(Memory.rooms[roomName] && Memory.rooms[roomName].avoid)) {
                return 2;
            } else if (Memory.rooms[roomName] && Memory.rooms[roomName].avoid) {
                return 0xff;
            } else {
                return 3;
            }
        }
    });
    if (ERR_NO_PATH === route) {
        room.log('ERROR no route from', roomName, 'to', targetRoom);
        return;
    }
    roomMemory.roomDistance = roomMemory.roomDistance || {};
    roomMemory.roomDistance [targetRoom] = route.length;
    // room.log('route before unshift', route.length, JSON.stringify(route));
    route.unshift({room: roomName});
    // room.log('route', route.length, JSON.stringify(route));
    if (route.length > 1) {
        for (let i = 1, max = route.length; i < max; i++) {
            let currentRoom = route[i - 1].room;
            let roomStep = route[i];
            let nextRoom = roomStep.room;
            let theRoom = Game.rooms[currentRoom];
            if (!theRoom) {
                room.log('unknown room', currentRoom);
                continue;
            }
            // room.log('map step', nextRoom);
            let currentExit = Room.getExitTo(currentRoom, nextRoom, true);
            if (!currentExit) {
                let exitDir = roomStep.exit;
                // room.log('finding new exit', currentRoom, nextRoom);
                exit = entryPoint.findClosestByPath(exitDir); // TODO cache
                // pahfinding sometimes fails
                exit = exit || entryPoint.findClosestByRange(exitDir);
                // todo try to choose an exit which does not touch a wall to limite future pathfinding issues
            } else {
                exit = currentExit;
            }
            // room.log('exit', exit);
            // store the path from every step in the route
            for (let j = i, maxj = route.length; j < maxj; j++) {
                Room.setExitTo(currentRoom, route[j].room, exit);
            }
            entryPoint = new RoomPosition(mirror(exit.x), mirror(exit.y), nextRoom);
            for (let j = i; j > 0; j--) {
                Room.setExitTo(nextRoom, route[j - 1].room, entryPoint);
            }
        }
    } else {
        room.log('ERROR : no route', roomName, targetRoom);
    }
}
Room.prototype.getExitTo = function (toRoom, failIfAbsent) {
    'use strict';
    return Room.getExitTo(this.name, toRoom, failIfAbsent);
};
Room.getExitTo = function (fromRoom, toRoom, failIfAbsent) {
    'use strict';
    let roomMemory = Memory.rooms[fromRoom] = Memory.rooms[fromRoom] || {};
    let exits = roomMemory.exits = (roomMemory.exits || {});
    let cached = exits[toRoom];
    // console.log(`exit ${fromRoom}->${toRoom} ${cached}`);
    if (!cached) {
        let room = Game.rooms[fromRoom];
        if (room && !failIfAbsent) {
            cached = findExit(room, toRoom);
            if (cached) {
                room.setExitTo(toRoom, cached);
            }
            return cached;
        } else {
            return undefined;
        }
    }
    return util.posFromString(cached, fromRoom);
};

/**
 *
 * @param {string}toRoom
 * @param {RoomPosition} pos
 */
Room.prototype.setExitTo = function (toRoom, pos) {
    'use strict';
    Room.setExitTo(this.name, toRoom, pos);
    Room.setExitTo(util.nextRoom(pos).roomName, this.name, mirror(pos));
};
Room.setExitTo = function (fromRoom, toRoom, pos) {
    'use strict';
    let roomMemory = Memory.rooms[fromRoom] = Memory.rooms[fromRoom] || {};
    let exits = roomMemory.exits = (roomMemory.exits || {});
    exits[toRoom] = util.posToString(pos);
};
/**
 *
 * @param {string} toRoom
 * @returns {number}
 */
Room.prototype.tripTimeToSources = function (toRoom, force) {
    'use strict';
    /**
     * fromRoom to exit
     * [from exit to exit]
     * average(from exit to sources)
     */
    force = force || false;
    Memory.rooms[this.name].cache = Memory.rooms[this.name].cache || {};
    Memory.rooms[this.name].cache.remoteMining = Memory.rooms[this.name].cache.remoteMining || {};
    // console.log('tripTime',JSON.stringify(Memory.rooms[this.name].cache.remoteMining));
    let cache = Memory.rooms[this.name].cache.remoteMining;

    if (force || !cache.tripTimeToSources || !cache.tripTimeToSources[toRoom] || !cache.tripTimeToSources[toRoom].path
        || _.isNumber(cache.tripTimeToSources[toRoom])
        || (cache.tripTimeToSources[toRoom].time + 3000 < Game.time + 100 * Math.random())/*refresh time, random so that not all rooms timeout at the same time*/) {
        // this.log('tripTimeToSources not cached');
        cache.tripTimeToSources = cache.tripTimeToSources || {};
        // console.log('tripTime computing');
        let roomCursor = this.name, startPoint;
        let tripTime = {plain: 0, swamp: 0, road: 0};

        let exitTo = Room.getExitTo(roomCursor, toRoom);
        let containers = this.findContainers().filter(s=>[STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_STORAGE].indexOf(s.structureType) >= 0);
        startPoint = containers.length ? exitTo.findClosestByRange(containers).pos : new RoomPosition(25, 25, this.name);
        this.log(`tripTime to ${toRoom} using ${startPoint} as drop point`);

        do {
            let exit = Room.getExitTo(roomCursor, toRoom);
            // let path = PathFn;
            if (!exit) {
                return undefined;
            }
            let inRoomPath;
            if (Game.rooms[roomCursor]) {
                let path = util.safeMoveTo2({
                    pos: startPoint,
                    room: Game.rooms[roomCursor],
                    log: this.log
                }, exit, {range: 0});
                inRoomPath = util.pathCost(path, this);
                this.log('exact path cost', path.length, JSON.stringify(inRoomPath), JSON.stringify(startPoint), JSON.stringify(exit));
            } else {
                inRoomPath = {plain: Math.floor(exit.getRangeTo(startPoint) * 1.5)};
                // this.log(`tripTime to ${toRoom}, no vision, ranging ${exit}, ${startPoint}, dist ${exit.getRangeTo(startPoint)*1.5}`);
                this.log('heuristic cost', JSON.stringify(inRoomPath), JSON.stringify(startPoint), JSON.stringify(exit));
            }
            // this.log(`tripTime to ${toRoom}, ${roomCursor}, ${inRoomPath}`);
            _.merge(tripTime, inRoomPath, (a, b)=>a + b);
            // tripTime += inRoomPath;
            startPoint = util.nextRoom(exit);
            roomCursor = startPoint.roomName;
            // this.log('tripTime',this.name, roomCursor, tripTime);
        } while (roomCursor !== toRoom);
        let targetRoom = Game.rooms[toRoom];

        if (targetRoom) {
            let temp = {plain: 0, swamp: 0, road: 0};
            let sources = targetRoom.find(FIND_SOURCES);
            let extractors = targetRoom.structures[STRUCTURE_EXTRACTOR];
            if (extractors.length) {
                sources.push(extractors[0]);
            }
            sources.forEach((s)=> {
                let cost = util.pathCost(util.safeMoveTo2({
                    pos: startPoint,
                    room: targetRoom
                }, s.pos, {range: 2}), this);
                // this.log('trip to source',s.id, roomCursor, startPoint, JSON.stringify(cost))
                _.merge(temp, cost, (a, b)=>a + b);
            });
            // this.log('average trip to sources', roomCursor, startPoint, JSON.stringify(temp));
            for (let i in temp) temp[i] = temp[i] / sources.length;
            _.merge(tripTime, temp, (a, b)=>a + b);
        } else {
            _.merge(tripTime, {plain: 25}, (a, b)=>a + b);
        }
        // this.log('tripTime', this.name, toRoom, tripTime);
        cache.tripTimeToSources[toRoom] = {path: tripTime, time: Game.time};

    } else {
        // this.log(`tripTimeToSources ${toRoom} cached`);
    }
    return cache.tripTimeToSources[toRoom].path;
};

Room.prototype.updateCheapStats = function () {
    try {
        let mySpawns = this.find(FIND_MY_SPAWNS);
        Memory.stats.room = Memory.stats.room || {};
        Memory.stats.room [this.name] = Memory.stats.room [this.name] || {};
        let roomStats = Memory.stats.room [this.name];
        roomStats.threats = roomStats.threats || {};
        roomStats.threats.harvested = (this.memory.threatAssessment || {harvested: 0}).harvested;
        roomStats.energyInSources = _.sum(_.map(this.find(FIND_SOURCES_ACTIVE), (s)=> s.energy));

        if (this.controller && this.controller.my) {
            roomStats.queueLength = this.memory.queueLength;
            let building = this.memory.building;
            if (mySpawns.length) {
                let buildingRoles = building ? _.countBy(_.values(building).map((spec)=>spec.memory.role)) : {};
                roomStats.spawns = roomStats.spawns || {};
                roomStats.spawns.queue = this.memory.queue;
                roomStats.spawns.building = buildingRoles;
                roomStats.energyAvailable = this.energyAvailable;
                roomStats.energyCapacityAvailable = this.energyCapacityAvailable;
            }
            let remoteRooms = _.isString(this.memory.remoteMining) ? [this.memory.remoteMining] : this.memory.remoteMining;
            if (remoteRooms && remoteRooms.length) {
                roomStats.remoteRooms = roomStats.remoteRooms || {};
                let c = (trip)=>5 * (trip.swamp || 0) + 2 * (trip.plain || 0) + (trip.road || 0);
                remoteRooms.forEach(remoteRoom=> {
                    roomStats.remoteRooms[remoteRoom] = roomStats.remoteRooms[remoteRoom] || {};
                    roomStats.remoteRooms[remoteRoom].tripTime = c(this.tripTimeToSources(remoteRoom));
                });
            } else {
                delete roomStats.remoteRooms;
            }
            if (this.storage || this.terminal) {
                roomStats.resources = roomStats.resources || {};
                roomStats.resources.storage = this.storage ? this.storage.store : {};
                roomStats.resources.terminal = this.terminal ? this.terminal.store : {};
            } else {
                delete roomStats.resources;
            }
            if (this.terminal) {
                roomStats.transfers = _.keys(this.memory.transfers || {}).reduce((acc, slot)=> _.merge(acc, this.memory.transfers[slot], (a, b)=>_.isNumber(a) ? a + b : undefined), {});
                delete roomStats.transfers.lastUpdate;
            } else {
                delete roomStats.transfers;
            }
            roomStats.reservedCount = _.size(this.memory.reserved);
            roomStats.controller = roomStats.controller || {};
            roomStats.controller.progress = this.controller.progress;
            roomStats.controller.progressTotal = this.controller.progressTotal;
            roomStats.controller.ProgressRatio = 100 * this.controller.progress / this.controller.progressTotal;
            roomStats.lab_activity = _.omit(this.memory.lab_activity, (v)=>_.isArray(v));
        }
        if (mySpawns.length) {
            roomStats.spawns = mySpawns
                .reduce(
                    (sum, spawn)=> {
                        _.keys(spawn.memory.spawns).forEach((k)=> {
                            if (!(/.*Bits/.exec(k))) {
                                sum[k] = (sum[k] || 0) + spawn.memory.spawns[k];
                            }
                        });
                        return sum;
                    }, {});
        } else {
            delete roomStats.spawns;
        }
    } catch (e) {
        console.log(e);
        console.log(e.stack);
    }
};
/**
 *
 * @param {string} type
 * @param {RoomPosition} pos
 * @param {number} range
 * @param {boolean} [asarray]
 * @returns {*}
 */
Room.prototype.glanceForAround = function (type, pos, range, asarray) {
    return this.lookForAtArea(type,
        Math.max(0, pos.y - range),
        Math.max(0, pos.x - range),
        Math.min(49, pos.y + range),
        Math.min(49, pos.x + range),
        asarray
    );
};
/**
 *
 * @param {RoomPosition} pos
 * @param {number} range
 * @param {boolean} [asarray]
 * @returns {*}
 */
Room.prototype.glanceAround = function (pos, range, asarray) {
    return this.lookAtArea(
        Math.max(0, pos.y - range),
        Math.max(0, pos.x - range),
        Math.min(49, pos.y + range),
        Math.min(49, pos.x + range),
        asarray
    );
};
Room.prototype.dismantleTargets = function () {
    'use strict';
    let targets = this.memory.dismantle || [];
    if (_.isString(targets)) {
        targets = [targets];
    }
    let ret = [];
    let newids = [];
    targets.forEach((id)=> {
        let o = Game.getObjectById(id);
        if (o) {
            ret.push(o);
            newids.push(id);
        }
    });
    this.memory.dismantle = newids;
    return ret;
};

Room.prototype.findContainers = function () {
    return Cache.get(this, '_containers', ()=> {
        'use strict';
        this.memory.cache = this.memory.cache || {};
        this.memory.cache.containers = this.memory.cache.containers || {};
        let containerIds = Cache.get(this.memory.cache, 'containers', ()=>(this.find(FIND_STRUCTURES).filter((s)=> (undefined !== s.storeCapacity || undefined !== s.energyCapacity)).map((s)=>s.id)), 150);
        return containerIds.map((id)=> Game.getObjectById(id)).filter((s)=>!!s);
    }, 50);
};
Room.prototype.faucetContainers = function () {
    return this.findContainers().filter((s)=> this.allowedLoadingContainer(s));
};

Room.prototype.allowedLoadingContainer = function (structure) {
    return structure.structureType !== STRUCTURE_TOWER
        && structure.structureType !== STRUCTURE_LAB
        && structure.structureType !== STRUCTURE_NUKER
        && ((this.energyCapacity === this.energyCapacityAvailable && !this.storage) || [STRUCTURE_SPAWN, STRUCTURE_EXTENSION].indexOf(structure.structureType) < 0);
};

Room.prototype.buildStructures = function (pos) {
    'use strict';
    if (this.lastChecked && this.lastChecked + 10 >= Game.time) return;
    this.lastChecked = Game.time;
    let genericBuilder = (type)=> {
        let colors = util.buildColors(type);
        let flags = ((pos) ?
            this.glanceForAround(LOOK_FLAGS, pos, 3, true).map(l=>l.flag)
            : this.find(FIND_FLAGS)).filter(f=>f.color == colors.color && f.secondaryColor === colors.secondaryColor);
        let unbuiltFlags = flags.filter((f)=>f.pos.lookFor(LOOK_STRUCTURES).filter((s)=>s.structureType === type).length === 0);
        let buildableFlags = unbuiltFlags.filter((f)=>f.pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0);
        // this.log('buildStructures',type,'flags', flags.length,'unbuiltFlags', unbuiltFlags.length,'buildableFlags', buildableFlags.length);
        // this.log();
        // this.log('buildableFlags', type, buildableFlags.length);
        if (unbuiltFlags.length > 0) {
            let flag;
            if (pos) {
                flag = pos.findClosestByRange(unbuiltFlags);
            } else {
                let center;
                if (this.storage) {
                    center = this.storage.pos;
                } else {
                    let spawns = this.find(FIND_MY_SPAWNS);
                    if (spawns.length) {
                        center = spawns[0].pos;
                    } else {
                        center = new RoomPosition(25, 25, this.name);
                    }
                }
                flag = center.findClosestByRange(buildableFlags);
            }
            if (flag) {
                let built = flag.pos.createConstructionSite(type);
                // this.log('building', type, JSON.stringify(flag.pos), built);
                return built === OK;
            }
        }
        return false;
    };
    if (this.controller && this.controller.my && this.find(FIND_CONSTRUCTION_SITES).length == 0) {
        let towerBuilder = ()=> {
            if (this.controller.level >= 3 && this.structures[STRUCTURE_TOWER].length < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][this.controller.level]) {
                if (genericBuilder(STRUCTURE_TOWER))
                    return true;
            }
        };
        let rampartBuilder = ()=> {
            return (genericBuilder(STRUCTURE_RAMPART));
        };
        let roadBuilder = ()=> {
            return (genericBuilder(STRUCTURE_ROAD));
        };
        let storageBuilder = ()=> {
            if (this.controller.level >= 4 && !this.storage) {
                return (genericBuilder(STRUCTURE_STORAGE));
            }
        };
        let linksBuilder = ()=> {
            if (this.controller.level >= 5) {
                return (genericBuilder(STRUCTURE_LINK));
            }
        };
        let wallsBuilder = ()=> {
            return (genericBuilder(STRUCTURE_WALL));
        };
        let labsBuilder = ()=> {
            if (this.controller.level >= 6) {
                return (genericBuilder(STRUCTURE_LAB));
            }
        };
        let terminalBuilder = ()=> {
            if (this.controller.level >= 6) {
                return (genericBuilder(STRUCTURE_TERMINAL));
            }
        };
        let containerBuilder = ()=> {
            return (genericBuilder(STRUCTURE_CONTAINER));
        };
        let extensionsBuilder = ()=> {
            let currentExtensionCount = this.structures[STRUCTURE_EXTENSION].length;
            if (this.controller.level >= 2 && CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.controller.level] > currentExtensionCount) {
                return (genericBuilder(STRUCTURE_EXTENSION));
            }
        };
        let extractorBuilder = ()=> {
            if (this.controller.level >= 6 && !this.structures[STRUCTURE_EXTRACTOR]) {
                this.find(FIND_MINERALS).forEach((min)=> min.pos.createConstructionSite(STRUCTURE_EXTRACTOR));
                return true;
            }
        };
        let builders = [extractorBuilder, terminalBuilder, towerBuilder, storageBuilder, rampartBuilder, wallsBuilder, linksBuilder, containerBuilder, roadBuilder, extensionsBuilder, labsBuilder];
        return builders.find((builder)=>builder());

    }

};
Room.prototype.availableBoosts = function () {
    'use strict';
    if (!(this.memory.boosts && this.memory.boosts.date && this.memory.boosts.date > Game.time - 1000)) {
        this.memory.boosts = {
            date: Game.time,
            value: this.structures[STRUCTURE_LAB].map((lab)=>lab.mineralType).filter((min)=>EFFICIENT_BOOSTS.indexOf(min) >= 0)
        };
    }
    return this.memory.boosts.value;
};
Room.prototype.allowedBoosts = function (role) {
    'use strict';
    let boosts = [];
    switch (role) {
        case 'roleSoldier':
        case 'roleRemoteGuard':
        case 'towerDrainer': {
            return this.availableBoosts();
        }
        case 'upgrader':
            boosts = boosts.concat(_.keys(BOOSTS[WORK]));
            break;
        case 'keeperGuard':
        case 'keeperMineralHarvester':
        case 'mineralHarvester':
        case 'remoteCarry' :
        case 'mineralTransport':
        case 'remoteCarryKeeper':
        default: {
            // boosts = boosts.concat(_.keys(BOOSTS[WORK]));
        }
    }
    return _.intersection(boosts, this.availableBoosts());
};
/**
 *
 * @param {string} part
 * @param {string} feature
 */
Room.prototype.maxBoost = function (part, feature) {
    let labs = this.structures[STRUCTURE_LAB];
    let minerals = labs.map((lab)=>lab.mineralType);
    if (!minerals || minerals.length === 0) return 1;
    else {
        let max = _.max(_.keys(BOOSTS[part])
            .filter((boost)=>minerals.indexOf(boost) >= 0) // available in the room
            .map((boost)=>BOOSTS[part][boost][feature]));
        return Math.max(max, 1);
    } // bonus
};
/**
 *
 * @param {Structure} structure
 * @returns {boolean} true if consumer creeps are allowed to pickup from this container
 */
Room.prototype.allowedLoadingContainer = function (structure) {
    return !structure.my || ((structure.structureType !== STRUCTURE_TOWER || structure.energy == structure.energyCapacity && !this.storage)
        && (
            [STRUCTURE_SPAWN, STRUCTURE_EXTENSION].indexOf(structure.structureType) < 0 || (this.energyAvailable === this.energyCapacityAvailable)
        ));
};

/**
 *
 * @param {Creep|{type,(terrain|creep|structure}[]} creep creep  or result of RoomPosition#look
 * @param {RoomPosition} [pos=creep.pos] if creep is not the results of #look, allows to check a position different than creep.pos
 * @returns {boolean}
 */
Room.prototype.isValidParkingPos = function (creep, pos) {
    let atXY;
    if (!_.isArray(creep)) {
        pos = pos || creep.pos;
        atXY = pos.look();
    } else {
        atXY = creep;
    }
    let rejects = [
        (data)=>data.terrain === 'wall',
        (data)=>data.type === LOOK_CREEPS && data.creep.name !== creep.name,
        (data)=>(data.type === LOOK_STRUCTURES ) && (parkForbiddenStructureTypes.indexOf(data.structure.structureType) >= 0),
        (data)=>(data.type === LOOK_CONSTRUCTION_SITES) && (parkForbiddenStructureTypes.indexOf(data.constructionSite.structureType) >= 0)
    ];
    let rejected = rejects.reduce((acc, predicate)=>(acc || atXY.reduce((acc2, at)=>acc2 || predicate(at), acc)), false);
    // creep.log('isValid ', pos, !rejected, JSON.stringify(atXY));
    return !rejected;
};

/**
 *
 * @param creep
 * @param {[{pos,range}]} options
 * @returns {Array}
 */
Room.prototype.findValidParkingPositions = function (creep, options) {
    if (!_.isArray(options)) {
        options = [options];
    }
    let aroundYX = this.glanceAround(options[0].pos, options[0].range, false);
    let candidates = [];
    options.shift();
    let inrange = pos=>!(options.find(posAndRange=>posAndRange.pos.getRangeTo(pos) > posAndRange.range));
    for (let y in aroundYX) {
        if (y % 49 === 0) continue;
        for (let x in aroundYX[y]) {
            if (x % 49 === 0) continue;

            let atXY = aroundYX[y][x];
            let pos = new RoomPosition(x, y, this.name);
            if (this.isValidParkingPos(atXY) && inrange(pos)) {
                // creep.log('parking ', JSON.stringify(atXY));
                candidates.push(pos);
            }
        }
    }
    return candidates;
};
/**
 *@callback parkingPosValid
 * @param {Creep} creep
 * @param {RoomPosition} lookedPosition
 * @return {boolean}
 */
/**
 *
 * @param {Creep} creep
 * @param {RoomPosition} lookedPosition
 * @param {number} range
 * @param {parkingPosValid} validPredicate
 * @returns {RoomPosition|undefined}
 */
Room.prototype.findValidParkingPosition = function (creep, options, range) {
    let lookedPosition = options;
    if (_.isArray(options)) {
        lookedPosition = options[0].pos;
        range = options[0].range;
    }
    let chosen;
    if (this.isValidParkingPos(creep) && creep.pos.getRangeTo(lookedPosition) <= range) {
        chosen = creep.pos;
    } else if (creep.memory.parking) {
        let pos = util.posFromString(creep.memory.parking, creep.room.name);
        if (pos.getRangeTo(lookedPosition) <= range && this.isValidParkingPos(creep, pos)) {
            // creep.log('restoring upgrade pos', pos);
            chosen = pos;
        } else {
            // creep.log(`discarding parking position ${pos}`);
        }
    }
    if (!chosen) {
        let aroundYX = this.glanceAround(lookedPosition, range, false);
        let candidates = [];
        let plainCandidates = [];
        let swampCandidates = [];
        for (let y in aroundYX) {
            if (y % 49 === 0) continue;
            for (let x in aroundYX[y]) {
                if (x % 49 === 0) continue;

                let atXY = aroundYX[y][x];
                if (this.isValidParkingPos(atXY)) {
                    // creep.log('parking ', JSON.stringify(atXY));
                    let terrain = atXY.find(l=>l.type === 'terrain');
                    let pos = new RoomPosition(x, y, this.name);
                    if (terrain.terrain === 'plain') plainCandidates.push(pos);
                    else if (terrain.terrain === 'swamp') swampCandidates.push(pos);
                    candidates.push(pos);
                }
            }
        }
        // creep.log(`plains ${plainCandidates.length}, swamp ${swampCandidates.length} all ${candidates.length}`);
        let myCandidates = plainCandidates.length ? plainCandidates : swampCandidates;
        chosen = creep.pos.findClosestByRange(myCandidates);
    }

    // creep.log('returning ',chosen,'closest to',creep.pos,'of', JSON.stringify(myCandidates));
    if (chosen) {
        creep.memory.parking = util.posToString(chosen);
        // creep.log(`parking at ${chosen}`);
    }
    return chosen;
};
Room.prototype.isCentralRoom = function () {
    'use strict';
    return !!/..5..5/.exec(this.name);
};

Room.prototype.recordTransfer = function (mineral, qty, toRoom, cost) {
    const slotSize = 1500;
    /*
     Memory.global = Memory.global || {};
     Memory.global.transfers = Memory.global.transfers || [];
     Memory.global.transfers.push([Game.time, mineral, this.name, toRoom, qty]);
     let removeBefore = Game.time - 10 * slotSize;
     Memory.global.transfers = Memory.global.transfers.filter(a=>a[0] < removeBefore);
     */
    this.memory.transfers = this.memory.transfers || {lastUpdate: Game.time};
    let slot = Math.floor(Game.time / slotSize) % 10;
    let previousSlot = Math.floor(this.memory.transfers.lastUpdate / slotSize) % 10;
    if (slot !== previousSlot) {
        this.memory.transfers [slot] = {};
        this.memory.transfers.lastUpdate = Game.time;
    } else {
        this.memory.transfers [slot] = this.memory.transfers [slot] || {};
    }
    this.memory.transfers [slot][mineral] = (this.memory.transfers [slot][mineral] || 0) + cost;
};

let parkForbiddenStructureTypes = OBSTACLE_OBJECT_TYPES.concat([STRUCTURE_ROAD]);

Room.prototype.operateLabs = function () {
    'use strict';
    let updateCounters = (o) => {
        'use strict';
        let INT_NUMBER = 50;
        let base = {idle: 0, producing: 0};
        _.merge(base, o);
        let i = Game.time % (INT_NUMBER * 32);
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
            this.memory.lab_activity = this.memory.lab_activity || {};
            if (!this.memory.lab_activity[k + 'Bits']) {
                this.memory.lab_activity[k + 'Bits'] = new Array(INT_NUMBER);
                _.fill(this.memory.lab_activity[k + 'Bits'], 0);
            }
            let old = this.memory.lab_activity[k + 'Bits'][j];
            this.memory.lab_activity[k + 'Bits'][j] = (old << 1) | base[k];
            this.memory.lab_activity[k] = _.sum(this.memory.lab_activity[k + 'Bits'], (x)=> countBits(x));
            // room.log('setting bit', k, old, room.memory.spawns[k + 'Bits'][j]);
        });


        // creep.memory[]
    };
    const OVERFLOWING = 10000;
    let rotateLabs = () => {
        if (Game.time < (this.memory.lab_rotated || 0) + 1500) return;
        try {
            let nextMin = Memory.stats.ledger.produceable.find(min=>_.contains(this.memory.lab_productions, min));
            if (!nextMin) {
                // ingredients locally available ?
                let localIndex = Memory.stats.ledger.produceable.map(min=>[min, reactions[min].reduce((available, i)=>available + (this.currentLedger[i] || 0) > 2000 ? 1 : 0, 0)]);
                if (localIndex.length) {
                    localIndex = _.sortBy(localIndex, pair=>pair[1]);
                    nextMin = _.head(localIndex)[0];
                }
            }
            nextMin = nextMin || _.head(Memory.stats.ledger.produceable);
            if (nextMin && this.lab_production !== nextMin) {
                Game.notify(`${this.name} switching production ${this.lab_production}=> ${nextMin}`);
                this.log(`switching production ${this.lab_production}=> ${nextMin}`);
                this.lab_production = nextMin;
            }
        } catch (e) {
            this.log(e.stack);
        }
    };
    if (_.keys(_.get(this.memory, 'labs', {})).length !== this.structures[STRUCTURE_LAB].length) {
        this.lab_production = this.lab_production;
    }
    let overflowing = (mineral)=>_.get(this.terminal, ['store', mineral], 0) > OVERFLOWING;
    this.log('producing', this.memory.lab_production);
    let ran = false;
    if (overflowing(this.memory.lab_production)) {
        // current production piles up
        this.log(`overflowing ${this.memory.lab_production}, rotating `);
        rotateLabs();
    } else if (!this.memory.lab_production || !this.memory.labs) {
        this.log('no lab production');
        return;
    } else {
        let labPairs = _.pairs(this.memory.labs);
        let ingredientLabs = this.memory.labs_input;
        if (!ingredientLabs) {
            this.log('initializing ingredient labs');
            this.lab_production = this.lab_production;
            return;
        } else {
            ingredientLabs = ingredientLabs.map(id=>Game.getObjectById(id));
        }
        let ingredientsExhausted = false;
        if (!ingredientLabs[0] || !ingredientLabs[1]) {
            this.log('missing ingredients ');
        } else {
            labPairs.forEach((pair)=> {
                let labid = pair[0];
                let lab = Game.getObjectById(labid);
                let reaction = pair[1];

                if (!lab.cooldown && this.lab_production === reaction) {
                    // this.log('testing ', labid);
                    // this.log('using ', reaction);
                    if (reaction) {
                        // this.log('searching labs with ingredients', ingredients, !!ingredients);
                        if (ingredientLabs[0] && ingredientLabs[1]) {
                            // this.log('running with ', JSON.stringify(ingredientLabs.map((lab)=>lab.id)));
                            let result = lab.runReaction(ingredientLabs[0], ingredientLabs[1]);
                            if (result !== OK) {
                                this.log('run reaction?', lab.mineralType, result);
                                ingredientsExhausted |= (ERR_NOT_ENOUGH_RESOURCES === result);
                            } else {
                                ran = true;
                            }
                        }
                    }
                }
            });
        }
        if (this.lab_productions.length && ingredientsExhausted) {
            // no more ingredients
            this.log(`${this.memory.lab_production} out of ingredients, rotating `);
            rotateLabs();
        }
    }

    updateCounters({producing: (ran ? 1 : 0), idle: (ran ? 0 : 1)});
};

Object.defineProperty(Room.prototype, 'spawnWait', {
    get: function () {
        'use strict';
        return _.sum(this.find(FIND_MY_SPAWNS), s=>_.get(s, ['memory', 'spawns', 'waitFull'], 0));
    }
});
Object.defineProperty(Room.prototype, 'lab_productions', {
    get: function () {
        this.memory.lab_productions = this.memory.lab_productions || [];
        return this.memory.lab_productions;
    },
    set: function (value) {
        'use strict';
        this.memory.lab_productions = _.isArray(value) ? value : [value];
        if (this.memory.lab_productions.indexOf(this.lab_production) < 0) {
            this.lab_production = _.min(this.memory.lab_productions, (min=>this.storage.store[min] || 0));
        }
        this.updateImportExports();
    },
    configurable: true
});
Object.defineProperty(Room.prototype, 'lab_production',
    {
        get: function () {
            return this.memory.lab_production;
        },
        set: function (value) {
            let ingredients = reactions[value];
            this.log('ingredients', JSON.stringify(ingredients));
            if (!ingredients || ingredients.length < 2) return;
            this.memory.lab_production = value;
            if (!_.contains(this.lab_productions, value)) {
                this.lab_productions = this.lab_productions.concat([value]);
            }
            this.memory.labs = {};
            _.merge(this.memory.labs, this.memory.reserved_labs);
            let excluded = _.keys(this.memory.reserved_labs) || [];
            let labs = this.find(FIND_STRUCTURES).filter(s=>s.structureType === STRUCTURE_LAB && excluded.indexOf(s.id) < 0);
            this.log('labs ', labs.length);
            let centerLabs = labs.reduce((acc, lab)=> {
                if (acc.length >= 2) {
                    return acc;
                }
                if (!labs.find(l=>l.pos.getRangeTo(lab.pos) > 2)) {
                    acc.push(lab);
                }
                return acc;
            }, []);
            this.memory.labs_input = centerLabs.map(l=>l.id);
            this.log('center labs', centerLabs);
            centerLabs.forEach((lab, idx)=> {
                this.memory.labs[lab.id] = ingredients[idx];
                _.pull(labs, lab);
            });
            labs.forEach(lab=> this.memory.labs[lab.id] = value);
            this.updateImportExports();
            this.importMinerals();
        },
        configurable: true
    }
);
Object.defineProperty(Room.prototype, 'import',
    {
        get: function () {
            return this.memory.import || [];
        },
        set: function (value) {
            this.memory.import = _.uniq(_.isString(value) ? [value] : value);
        },
        configurable: true
    }
);
Object.defineProperty(Room.prototype, 'hash',
    {
        get: function () {
            this.memory.hash = /*this.memory.hash ||*/ util.hash(this.name);
            return this.memory.hash;
        },
        configurable: true
    }
);
Object.defineProperty(Room.prototype, 'export',
    {
        get: function () {
            return this.memory.exports || [];
        },
        set: function (value) {
            this.memory.exports = _.isString(value) ? [value] : value;
        },
        configurable: true
    }
);
Object.defineProperty(Room.prototype, 'structures',
    {
        get: function () {
            if (Game.time !== this._structuresUpdated) {
                this._structuresUpdated = Game.time;
                this._structures = _.groupBy(this.find(FIND_STRUCTURES), 'structureType');
                _.keys(CONTROLLER_STRUCTURES).forEach(type=>this._structures[type] = this._structures[type] || []);
                [STRUCTURE_CONTROLLER, STRUCTURE_KEEPER_LAIR, STRUCTURE_POWER_BANK, STRUCTURE_RAMPART, STRUCTURE_WALL, STRUCTURE_PORTAL, STRUCTURE_ROAD]
                    .forEach(type=>this._structures[type] = this._structures[type] || []);
            }
            return this._structures;
        },
        configurable: true
    }
);
Object.defineProperty(Room.prototype, 'avoidCostMatrix', {
    configurable: true,
    get: function () {
        return Cache.get(this, '_avoidCostMatrix', ()=> {
            'use strict';
            let matrix = new PathFinder.CostMatrix();
            let structures = this.find(FIND_STRUCTURES);
            structures.forEach((s)=> {
                if (s.structureType === STRUCTURE_ROAD) {
                    matrix.set(s.pos.x, s.pos.y, 1);
                } else if (s.structureType === STRUCTURE_PORTAL) {
                    matrix.set(s.pos.x, s.pos.y, 0xff);
                } else if (!(s.structureType === STRUCTURE_CONTAINER || (s.structureType === STRUCTURE_RAMPART && s.my))) {
                    matrix.set(s.pos.x, s.pos.y, 0xff);
                }
            });
            let constructionSites = this.find(FIND_CONSTRUCTION_SITES);
            constructionSites.forEach((s)=> {
                if (s.structureType === STRUCTURE_ROAD) {
                    matrix.set(s.pos.x, s.pos.y, 1);
                } else if (!(s.structureType === STRUCTURE_CONTAINER || (s.structureType === STRUCTURE_RAMPART && s.my))) {
                    matrix.set(s.pos.x, s.pos.y, 0xff);
                }
            });
            return matrix;
        }, 20);
    }
});
Room.prototype.scout = function () {
    this.memory.scouted = this.memory.scouted || {time: -Infinity};
    let scouted = this.memory.scouted;
    if (scouted.time < Game.time + 10000) {
        Memory.scouting = Memory.scouting || {};
        Memory.scouting.needScouting = _.pull(Memory.scouting.needScouting || [], this.name);
        Memory.scouting.scouted = Memory.scouting.scouted || [];
        scouted.time = Game.time;
        if (!_.includes(Memory.scouting.scouted, this.name)) {
            Memory.scouting.scouted.push(this.name);
        }
        scouted.minerals = this.find(FIND_MINERALS).map(min=>min.mineralType + min.density);
        scouted.owner = this.controller && this.controller.owner && this.controller.owner.username;
        scouted.level = this.controller && this.controller.level;
        scouted.sourceCount = this.find(FIND_SOURCES).length;
    }
};
/**
 * relies on memory.observeOffset (of the form :'-5,4', relative to current room).
 * if the room is visible and scouting report is old, updates the scouting info, else proceed to next room (left to right, top to bottom)
 */
Room.prototype.runObserver = function () {
    'use strict';
    let observers = this.structures[STRUCTURE_OBSERVER];
    let observer = observers ? _.head(observers) : undefined;
    if (!observer) {
        return;
    }
    let nameToCoords = (name)=> {
        let coords = /([EW])(\d+)([NS])(\d+)/.exec(name);
        if ('W' === coords[1]) {
            coords[2] = -coords[2];
        }
        if ('S' === coords[3]) {
            coords[4] = -coords[4];
        }
        // this.log('nameToCoords', coords[2], coords[4]);
        return [coords[2], coords[4]];
    };
    let coordsToName = (coords)=> {
        let EW = coords[0] < 0 ? 'W' : 'E';
        let NS = coords[0] < 0 ? 'S' : 'N';
        // this.log('coordsToName', EW+Math.abs(coords[0])+NS+Math.abs(coords[1]));
        return EW + Math.abs(coords[0]) + NS + Math.abs(coords[1]);
    };
    let offset = (offsetVector)=> {
        let coords1 = nameToCoords(this.name);
        let offsetCooords = [coords1[0], coords1[1] + offsetVector[0],
            coords1[2], coords1[3] + offsetVector[1]];
        if (coords1[1] * offsetCooords[1] <= 0) {
            if (offsetCooords[0] === 'W') {
                offsetCooords[0] = 'E';
                offsetCooords[1] = offsetCooords[1] + 1;
            } else {
                offsetCooords[0] = 'W';
                offsetCooords[1] = offsetCooords[1] - 1;
            }
        }
        if (coords1[3] * offsetCooords[3] <= 0) {
            if (offsetCooords[0] === 'S') {
                offsetCooords[0] = 'N';
                offsetCooords[3] = offsetCooords[3] + 1;
            } else {
                offsetCooords[0] = 'S';
                offsetCooords[3] = offsetCooords[3] - 1;
            }
        }
        // this.log('offset', JSON.stringify(offsetVector));
        return coordsToName(offsetCooords);
    };
    let nextOffsetVector = (vector)=> {
        if (vector[0] >= OBSERVER_RANGE) {
            vector[0] = -OBSERVER_RANGE;
            vector[1] = vector[1] >= OBSERVER_RANGE ? -OBSERVER_RANGE : vector[1] + 1;
        } else {
            vector[0] = vector[0] + 1;
        }
        return vector;
    };
    if (!this.memory.observeOffset) {
        this.memory.observeOffset = '-10,-10';
    }
    let offsetVector = this.memory.observeOffset.split(',');
    if (Math.abs(offsetVector[0]) > 100 || Math.abs(offsetVector[1]) > 100) {
        // this.log('invalid offset');
        this.memory.observeOffset = '-10,-10';
        offsetVector = this.memory.observeOffset.split(',');
    }
    offsetVector[0] = Number.parseInt(offsetVector[0]);
    offsetVector[1] = Number.parseInt(offsetVector[1]);
    let observeRoom = offset(offsetVector);
    let lastScouted = _.get(Memory.rooms, [observeRoom, 'scouted', 'time'], 0);
    if (lastScouted < Game.time - 1500) {
        if (!Game.rooms[observeRoom]) {
            // observe
            // this.log(`observing ${observeRoom}`);
            observer.observeRoom(observeRoom);
        } else {
            // scout
            // this.log(`scouting ${observeRoom}`);
            Game.rooms[observeRoom].scout();
            this.memory.observeOffset = nextOffsetVector(offsetVector).join(',');
        }
    } else {
        // this.log(`skipping ${observeRoom}, lastScouted = ${lastScouted}`);
        this.memory.observeOffset = nextOffsetVector(offsetVector).join(',');
    }
};

/**
 * import minerals missing from desiredLedger, import minerals required for production
 *
 */
Room.prototype.updateImportExports = function () {
    'use strict';
    let desired = this.desiredLedger;
    let current = this.currentLedger;
    let imports = [];
    let exports = [];
    const mix = _.uniq(_.keys(desired).concat(_.keys(current)));
    mix.forEach(m=> {
        if (desired[m] > 0 && (!current[m] || current[m] < desired[m])) {
            imports.push(m);
        } else if (RESOURCE_ENERGY !== m && current[m] && (!desired[m] || current[m] > desired[m])) {
            exports.push(m);
        }
    });
    _.pull(exports, RESOURCE_ENERGY);
    this.import = imports;
    // do not import result of other rotations
    this.memory.exports = exports;
};


Room.prototype.importMinerals = function () {
    'use strict';
    // room.log('importCache', JSON.stringify(room.memory.cache.import));
    if (!this.storage || this.storage.energy < 5000) return;
    if (!this.memory.cache.import || !this.memory.cache.import.lastRun || (this.memory.cache.import.lastRun + 20 < Game.time)) {
        this.memory.cache.import = this.memory.cache.import || {};
        this.memory.cache.import.lastRun = Game.time;
        //  cost : Math.ceil(amount * (Math.log((distance + 9) * 0.1) + 0.1));
        let maxAffordable = (room, theRoom, isEnergy)=> {
            let distance = Game.map.getRoomLinearDistance(room.name, theRoom.name, true);
            let number = Math.log((distance + 9) * 0.1) + 0.1;
            let amount = (room.terminal.store.energy || 0);

            if (isEnergy) {
                return {amount: Math.floor((amount / (1 + number))), cost: Math.ceil(amount * (number))};
            } else {
                return {amount: Math.ceil(amount / number), cost: amount};
            }
        };
        this.memory.import.forEach((mineral)=> {
            let offeringRooms = _.values(Game.rooms).filter(
                (r)=> r.name !== this.name
                && r.export && _.contains(r.export, mineral) // exports
                && _.get(r, ['terminal', 'store', mineral], 0) > 100// has available
                && (r.currentLedger[mineral] || 0) > (r.desiredLedger[mineral] || 0)
            );
            // room.log(`trying to import ${mineral}, offering rooms ${offeringRooms}`);
            let offeringRoomsWithEnergy = offeringRooms.filter((r)=> r.terminal.store.energy && r.terminal.store.energy > 1000);
            // room.log(`trying to import ${mineral}, offeringRoomsWithEnergy ${offeringRoomsWithEnergy}`);
            // if there's an exporting room without energy, send energy to it
            if (offeringRoomsWithEnergy.length === 0 && offeringRooms.length > 0 && this.terminal && this.terminal.store && this.terminal.store.energy > 2000) {
                let offeringRoomsWithTerminal = offeringRooms.filter((r)=>r.terminal);
                offeringRoomsWithTerminal.forEach((r)=> {
                    let _maxAffordable = maxAffordable(this, r, RESOURCE_ENERGY);
                    let amount = _maxAffordable.amount;
                    this.log(`would be sending ${amount} energy to ${r.name}`);
                    // Game.notify(`${room.name}sending ${amount} energy to ${r.name}`);
                    // TODO disabled
                    // room.terminal.send(RESOURCE_ENERGY, amount, r.name);
                });
            } else if (offeringRoomsWithEnergy.length > 0) {
                let theRoom = _.min(offeringRooms, (r)=>(Game.map.getRoomLinearDistance(r.name, this.name, true)));
                // this.log(`importing ${mineral} from ${theRoom === Infinity ? 'none' : theRoom.name}`);
                if (Infinity !== theRoom) {
                    if (this.currentLedger[mineral] || 0 < (this.desiredLedger[mineral] || 0)) {
                        if (this.terminal) {
                            // use terminal to import
                            // room.log('importing using terminal', mineral);
                            let currentTerminalQty = _.get(this.terminal, ['store', mineral], 0);
                            let qty = Math.min(5000 - currentTerminalQty, theRoom.terminal.store[mineral], (theRoom.currentLedger[mineral] - theRoom.desiredLedger[mineral] || 0));
                            // room.log(`importing ${qty} ${mineral} from ${theRoom.name}`);
                            if (qty > TERMINAL_MIN_SEND) {
                                let _maxAffordable = maxAffordable(theRoom, this, mineral === RESOURCE_ENERGY).amount;
                                qty = Math.min(qty, _maxAffordable);
                                if (qty > TERMINAL_MIN_SEND) {
                                    let cost = Game.market.calcTransactionCost(qty, this.name, theRoom.name);
                                    let imported = theRoom.terminal.send(mineral, qty, this.name, 'import from ' + this.name);
                                    if (imported === OK) {
                                        theRoom.recordTransfer(mineral, qty, this.name, cost);
                                    }
                                    this.log(`importing ${qty} ${mineral} from ${theRoom.name}: ${imported}`);
                                    //if (OK !== imported) {
                                    Game.notify((`${this.name} importing from ${theRoom.name} using terminal ${qty} ${mineral}  : ${imported}`));
                                    //}
                                }
                            }
                        }
                    }
                }
            }
        });
    }
};
var rcl8Ledger = {
    'XUH2O': 25000,
    'XGHO2': 25000,
    'XLHO2': 25000,
    'XZHO2': 25000,
    'G': 5000
};

Object.defineProperty(Room.prototype, 'desiredLedger', {
    configurable: true,
    get: function () {
        'use strict';
        if (this.controller && this.controller.my && this.controller.level >= 6) {
            if (!this._desiredLedger) {
                let desired = _.cloneDeep(rcl8Ledger);
                // collect each reaction ingredients
                let requiredMinsForLabs = _.uniq(this.lab_productions.reduce((all, reaction)=> all.concat(reactions[reaction]), []));
                // let myMin = _.head(this.find(FIND_MINERALS)).mineralType;
                // remove local mineral
                // _.pull(requiredMinsForLabs, myMin);
                // remove each creation outputs
                // this.lab_productions.forEach(m=> _.pull(requiredMinsForLabs, m));
                requiredMinsForLabs.forEach(m=> desired[m] = 5000);
                _.values(Game.market.orders).forEach(o=> {
                    if (o.type === 'sell' && o.roomName === this.name) {
                        desired[o.resourceType] = (desired[o.resourceType] || 0) + o.remainingAmount;
                    }
                });
                if (this.controller.level < 8) {
                    desired['XGH2O'] = (desired['XGH2O'] || 0) + 5000;
                }
                this._desiredLedger = desired;
            }
            return this._desiredLedger;
        } else {
            return {};
        }
    }
});
Object.defineProperty(Room.prototype, 'currentLedger', {
    configurable: true,
    get: function () {
        'use strict';
        if (!this._ledger) {
            let ledger = {};
            if (this.storage) _.merge(ledger, this.storage.store);
            if (this.terminal) _.merge(ledger, this.terminal.store, (a, b)=>(a || 0) + (b || 0));
            this._ledger = ledger;
        }
        return this._ledger;
    }
});

/**
 * energy suppliers
 *  harvestContainers, importContainers, storage, terminal, upgradeContainers
 * energy consumers
 *  towers, spawn, extensions, labs, terminal, upgradeContainers
 */

module.exports = Room.prototype;