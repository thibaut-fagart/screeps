var _ = require('lodash');
var util = require('./util');
var handlers = require('./base.handlers');
var PickupManager = require('./util.manager.pickup');

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
    let currentRoomEnergy = (this.storage ? this.storage.energy || 0 : 0);
    return _.sortBy(
        this.find(FIND_STRUCTURES, {
            filter: (s)=>
                ((s.structureType == STRUCTURE_WALL || (s.structureType == STRUCTURE_RAMPART && s.my)) &&
                ((currentRoomEnergy < 10000 && s.hits < 100000)
                || (currentRoomEnergy < 50000 && s.hits < 1000000)
                || currentRoomEnergy > 50000)
                && s.hits < s.hitsMax)
        }),
        (w)=>w.hits
    );

};
Room.prototype.operateLabs = function () {
    'use strict';
    _.keys(this.memory.labs).forEach((labid)=> {
        let lab = Game.getObjectById(labid);
        if (!lab.cooldown) {
            // this.log('testing ', labid);
            let reaction = this.expectedMineralType(lab);
            // this.log('using ', reaction);
            if (reaction) {
                let ingredients = handlers['labOperator'].class().reactions [reaction];
                // this.log('searching labs with ingredients', ingredients, !!ingredients);

                if (ingredients) {
                    let sourceLabs = ingredients.map((i)=>this.findLabWith(i));
                    if (sourceLabs[0] && sourceLabs[1]) {

                        // this.log('running with ', JSON.stringify(sourceLabs.map((lab)=>lab.id)));
                        let result = lab.runReaction(sourceLabs[0], sourceLabs[1]);
                        if (result !== OK) this.log('run reaction?', lab.mineralType, result);
                    }
                }
            }

        }
    });
};
Room.prototype.hasKeeperLairs = function () {
    let coords = /([EW])(\d+)([NS])(\d+)/.exec(this.name);
    let x = Math.abs(coords[2] % 10 - 5);
    let y = Math.abs(coords[4] % 10 - 5);
    return (x <= 1 && y <= 1 && !(x == 0 && y == 0));
    // this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}})
};
Room.prototype.operateLinks = function () {
    let links = this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LINK}});
    if (!links.length) return;
    let storageLink = (this.storage) && links.find((l)=> l.pos.getRangeTo(this.storage) < 4);
    let controllerLink = links.find((l)=> l.pos.getRangeTo(this.controller.pos) < 5);
    let otherLinks = links.filter((l)=> (!storageLink || (storageLink && l.id !== storageLink.id)) && (!controllerLink || (controllerLink && l.id !== controllerLink.id)));
    otherLinks = _.sortBy(otherLinks.filter((l)=>l.cooldown === 0), (l)=> -l.energy);
    let linkAccepts = (link, amount) => link && /*!link.cooldown && */link.energy + amount < link.energyCapacity;
    let chooseTargetLink = (amount, l1, l2)=> {
        if (linkAccepts(l1, amount)) {
            return l1;
        } else if (linkAccepts(l2, amount)) {
            return l2;
        } else {
            if (!l1 || !l2) {
                return l1 ? l1 : l2;
            } else if (l1.energy < l2.energy) {
                return l1;
            } else {
                return l2;
            }
        }
    };

    otherLinks.forEach((l)=> {
        'use strict';
        let target = chooseTargetLink(l.energy, controllerLink, storageLink);
        if (target) l.transferEnergy(target);
    });
    let target = storageLink ? chooseTargetLink(storageLink.energy, controllerLink, undefined) : undefined;
    if (target) {
        storageLink.transferEnergy(target);
    }
};
Room.prototype.isHarvestContainer = function (container) {
    return this.memory.harvestContainers && this.memory.harvestContainers.indexOf(container.id)>=0;
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
    if (this.find(FIND_HOSTILE_CREEPS, {filter: (c)=>c.owner.username == 'Invader'}).length && !this.memory.threatAssessment.invaders) {
        this.memory.threatAssessment.invaders = true;
        this.memory.threatAssessment.harvested = 0;
        this.memory.threatAssessment.lastInvadersAt = Game.time;
    } else {
        this.memory.threatAssessment.invaders = false;
    }
    let lastSeen = this.memory.threatAssessment.lastSeen;
    let oldHarvested = this.memory.threatAssessment.harvested;

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
        let oldMems = Memory.rooms[roomName].oldEfficiencies = Memory.rooms[roomName].oldEfficiencies || [];
        if (roomMem.date + 1500 < Game.time) {
            oldMems.push(roomMem);
            if (oldMems.length > 10) oldMems.shift();
            roomMem = Memory.rooms[roomName].efficiency = {date: Game.time};
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
    this.log('delivered', _.sum(carry));

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
    if (!this.memory.towersCache.towers || this.memory.towersCache.date + 500 < Game.time) {
        this.memory.towersCache.towers = this.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER}).map((s) => s.id);
    }
    this.memory.towersCache.towers.forEach((towerid)=> {
        let tower = Game.getObjectById(towerid);
        if (tower) handlers['tower'].run(tower);
        else this.memory.towersCache.towers = this.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER}).map((s) => s.id);
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
function mirror(x) {
    if ('number'===typeof x) {
        return x === 0 || x === 49 ? 49 - x : x;
    } else if ('number'===typeof x.x && 'number'===typeof x.y) {
        return {x: mirror(x.x), y: mirror(x.y)};
    } else {
        throw new Error('unexpected argument',x);
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
    if (!route) {
        room.log('ERROR no route from', roomName, 'to', targetRoom);
    }
    roomMemory.roomDistance = roomMemory.roomDistance || {};
    roomMemory.roomDistance [targetRoom] = route.length;
    // logWith.log('route before unshift', route.length, JSON.stringify(route));
    route.unshift({room: roomName});
    // logWith.log('route', route.length, JSON.stringify(route));
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
            // logWith.log('map step', nextRoom);
            let currentExit = !Room.getExitTo(currentRoom, nextRoom, true);
            if (currentExit) {
                let exitDir = roomStep.exit;
                room.log('finding new exit', currentRoom, nextRoom);
                exit = entryPoint.findClosestByPath(exitDir); // TODO cache
                // todo try to choose an exit which does not touch a wall to limite future pathfinding issues
            } else {
                exit = currentExit;
            }
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
    if (!cached) {
        let room = Game.rooms[fromRoom];
        if (room && !failIfAbsent) {
            cached = findExit(room, toRoom);
            room.setExitTo(toRoom, cached);
            return cached;
        } else {
            return undefined;
        }
    }
    if (cached && _.isString(cached) && cached[0] == '{') {
        // old way, update
        cached = JSON.parse(cached);
        Room.setExitTo(fromRoom, toRoom, cached);
    } else {
        let x = Number.parseInt(cached.substring(0, 2));
        let y = Number.parseInt(cached.substring(2, 4));
        return cached = new RoomPosition(x, y, fromRoom);
    }
    return cached;
};

/**
 *
 * @param {string}toRoom
 * @param {RoomPosition} pos
 */
Room.prototype.setExitTo = function (toRoom, pos) {
    'use strict';
    Room.setExitTo(this.name, toRoom, pos);
    Room.setExitTo(toRoom, this.name, mirror(pos));
};
Room.setExitTo = function (fromRoom, toRoom, pos) {
    'use strict';
    let roomMemory = Memory.rooms[fromRoom] = Memory.rooms[fromRoom] || {};
    let exits = roomMemory.exits = (roomMemory.exits || {});
    let pad = (i)=> (i < 10 ? '0' + i.toString() : i.toString());
    exits[toRoom] = pad(pos.x) + pad(pos.y);
};
/**
 *
 * @param {string} toRoom
 * @returns {number}
 */
Room.prototype.tripTimeToSources = function (toRoom) {
    'use strict';
    /**
     * fromRoom to exit
     * [from exit to exit]
     * average(from exit to sources)
     */
    Memory.rooms[this.name].cache = Memory.rooms[this.name].cache || {};
    Memory.rooms[this.name].cache.remoteMining = Memory.rooms[this.name].cache.remoteMining || {};
    // console.log('tripTime',JSON.stringify(Memory.rooms[this.name].cache.remoteMining));
    let cache = Memory.rooms[this.name].cache.remoteMining;

    if (!cache.tripTimeToSources || !cache.tripTimeToSources[toRoom] || (cache.tripTimeToSources.time + 3000 < Game.time + 100 * Math.random())/*refresh time, random so that not all rooms timeout at the same time*/) {
        // this.log('tripTimeToSources not cached');
        cache.tripTimeToSources = cache.tripTimeToSources || {};
        cache.tripTimeToSources.time = Game.time;
        // console.log('tripTime computing');
        let roomCursor = this.name, startPoint;
        let tripTime = 0;
        startPoint = this.storage ? this.storage.pos : this.controller.pos;
        // this.log('tripTime using ', startPoint, ' as drop point');
        do {
            let exit = Room.getExitTo(roomCursor, toRoom);
            // this.log('tripTime exit', roomCursor, toRoom, JSON.stringify(exit));
            // let path = PathFn;
            if (!exit) {
                return undefined;
            }
            if (Game.rooms[roomCursor]) {
                tripTime += util.safeMoveTo2({pos: startPoint, room: this}, exit, {range: 0}).length;
            } else {
                tripTime += Math.floor(exit.getRangeTo(startPoint * 1.5));
            }
            startPoint = util.nextRoom(exit);
            roomCursor = startPoint.roomName;
            // this.log('tripTime',this.name, roomCursor, tripTime);
        } while (roomCursor !== toRoom);
        let targetRoom = Game.rooms[toRoom];

        if (targetRoom) {
            let temp = 0;
            let sources = targetRoom.find(FIND_SOURCES);
            sources.forEach((s)=>temp += util.safeMoveTo2({
                pos: startPoint,
                room: targetRoom
            }, s.pos, {range: 2}).length);
            // this.log('average trip to sources', roomCursor, startPoint, temp);
            tripTime += temp / sources.length;
        } else {
            tripTime += 50;
        }
        // this.log('tripTime', this.name, toRoom, tripTime);
        cache.tripTimeToSources[toRoom] = tripTime;
    } else {
        // this.log('tripTimeToSources cached');
    }
    return cache.tripTimeToSources[toRoom];
};

Room.prototype.updateCheapStats = function () {

    Memory.stats['room.' + this.name + '.spawns.queueLength'] = this.memory.queueLength;
    let building = this.memory.building;
    let buildingRoles = building ? _.countBy(_.values(building).map((spec)=>spec.memory.role)) : {};
    let queuePrefix = 'room.' + this.name + '.spawns.queue.';
    let buildingPrefix = 'room.' + this.name + '.spawns.building.';
    _.keys(handlers).forEach((role)=> {
        if (this.memory.queue && this.memory.queue[role]) {
            Memory.stats[queuePrefix + role] = this.memory.queue[role];
        } else {
            delete Memory.stats[queuePrefix + role];
        }
        let buildingRole = buildingRoles[role] || 0;
        if (buildingRole) {
            Memory.stats[buildingPrefix + role] = buildingRole;
        } else {
            delete Memory.stats[buildingPrefix + role];
        }

    });
    if (this.storage) {
        _.keys(this.storage.store).forEach((min)=>Memory.stats[`room.${this.name}.resources.storage.${min}`] = this.storage.store[min]);
    }
    if (this.terminal) {
        _.keys(this.terminal.store).forEach((min)=>Memory.stats[`room.${this.name}.resources.terminal.${min}`] = this.terminal.store[min]);
    }
    Memory.stats['room.' + this.name + '.energyAvailable'] = this.energyAvailable;
    Memory.stats['room.' + this.name + '.energyCapacityAvailable'] = this.energyCapacityAvailable;
    Memory.stats['room.' + this.name + '.threats.harvested'] = (this.memory.threatAssessment || {harvested: 0}).harvested;
    Memory.stats['room.' + this.name + '.reservedCount'] = _.size(this.memory.reserved);
    Memory.stats['room.' + this.name + '.energyInSources'] = _.sum(_.map(this.find(FIND_SOURCES_ACTIVE), (s)=> s.energy));
    if (this.controller && this.controller.my) {
        Memory.stats['room.' + this.name + '.controller.progress'] = this.controller.progress;
        Memory.stats['room.' + this.name + '.controller.progressTotal'] = this.controller.progressTotal;
        Memory.stats['room.' + this.name + '.controller.ProgressRatio'] = 100 * this.controller.progress / this.controller.progressTotal;
    }

    let spawnStats = this.find(FIND_MY_SPAWNS)
        .reduce(
            (sum, spawn)=> {
                _.keys(spawn.memory.spawns).forEach((k)=> {
                    if (!(/.*Bits/.exec(k))) {
                        sum[k] = (sum[k] || 0) + spawn.memory.spawns[k];
                    }
                });
                return sum;
            }, {});
    // this.log('spawnStats', JSON.stringify(spawnStats));
    let spawnPrefix = `room.${this.name}.spawns.`;
    _.keys(spawnStats).forEach((k)=> {
        let value = spawnStats[k];
        if (value === 0) delete Memory.stats[spawnPrefix + k];
        else  Memory.stats[spawnPrefix + k] = value;
    });
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
var Cache = {
    get: function (memory, path, fetcher, ttl) {
        if (!memory[path] || !memory[path].expires || ( Game.time > memory[path].expires)) {
            console.log('Cache.get, expired ', path, memory[path].expires, Game.time);
            memory[path] = {value: fetcher(), expires: Game.time + ttl};
        } else {
            //console.log('Cache.get, !expired ',path, memory[path].expires+ttl- Game.time);

        }
        return memory[path].value;
    }
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
    this.memory.cache = this.memory.cache || {};
    this.memory.cache.containers = this.memory.cache.containers || {};
    let containerIds = Cache.get(this.memory.cache, 'containers', ()=>(this.find(FIND_STRUCTURES).filter((s)=> (s.storeCapacity || s.energyCapacity)).map((s)=>s.id)), 50);
    return containerIds.map((id)=> Game.getObjectById(id)).filter((s)=>!!s);
};

Room.prototype.buildStructures = function () {
    'use strict';
    let genericBuilder = (type)=> {
        let flags = this.find(FIND_FLAGS, {filter: util.buildColors(type)});
        let flagsWithoutSite = flags.filter((f)=>f.pos.lookFor(LOOK_STRUCTURES).filter((s)=>s.structureType ===type).length ===0);
        this.log('flags',type, flags.length);
        this.log('flagsWithoutSite',type, flagsWithoutSite.length);
        if (flagsWithoutSite.length > 0) {
            let lookFor = flagsWithoutSite[0].pos.lookFor(LOOK_CONSTRUCTION_SITES);
            if (!lookFor.length) {
                let built = flagsWithoutSite[0].pos.createConstructionSite(type);
                this.log('building', type, JSON.stringify(flagsWithoutSite[0].pos), built);
                return built === OK;
            }
        }
        return false;
    };
    if (this.controller && this.controller.my && this.find(FIND_CONSTRUCTION_SITES).length == 0) {
        let towerBuilder = ()=> {
            if (this.controller.level >= 3 && this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).length < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][this.controller.level]) {
                if (genericBuilder(STRUCTURE_TOWER))
                    return true;
            }
        };
        let rampartBuilder = ()=> {
            if (genericBuilder(STRUCTURE_RAMPART))
                return true;
        };
        let roadBuilder = ()=> {
            if (genericBuilder(STRUCTURE_ROAD))
                return true;
        };
        let storageBuilder = ()=> {
            if (this.controller.level >= 4 && !this.storage) {
                if (genericBuilder(STRUCTURE_STORAGE))
                    return true;
            }
        };
        let extensionsBuilder = ()=> {
            let currentExtensionCount = this.find(FIND_STRUCTURES).filter((s)=>s.structureType === STRUCTURE_EXTENSION).length;
            if (this.controller.level >= 2 && CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.controller.level] > currentExtensionCount) {
                if (genericBuilder(STRUCTURE_EXTENSION))
                    return true;
            }
        };
        let extractorBuilder = ()=> {
            if (this.controller.level >= 6 && !this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}})) {
                this.find(FIND_MINERALS).forEach((min)=> min.pos.createConstructionSite(STRUCTURE_EXTRACTOR));
                return true;
            }
        };
        let builders = [towerBuilder, storageBuilder, extensionsBuilder, rampartBuilder, extractorBuilder, roadBuilder];
        builders.find((builder)=>builder());

    }

};
Room.prototype.availableBoosts = function () {
    'use strict';
    if (!(this.memory.boosts && this.memory.boosts.date && this.memory.boosts.date > Game.time - 1000)) {
        this.memory.boosts = {
            date: Game.time,
            value: this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LAB}}).map((lab)=>lab.mineralType).filter((min)=>EFFICIENT_BOOSTS.indexOf(min) >= 0)

        };
    }
    return this.memory.boosts.value;
};
Room.prototype.allowedBoosts = function (role) {
    'use strict';
    let boosts = [];
    switch (role) {
        case 'keeperGuard':
        case 'roleSoldier':
        case 'roleRemoteGuard':
        case 'keeperMineralHarvester':
        case 'towerDrainer': {
            return this.availableBoosts();
        }
        case 'mineralHarvester':
        case 'remoteCarry' :
        case 'mineralTransport':
        case 'remoteCarryKeeper': {
            let key = `room.${this.name}.spawns.spawning`;
            if (Memory.stats && Memory.stats[key] && (Memory.stats[key] / this.find(FIND_MY_SPAWNS).length > 1300)) {
                boosts = _.keys(BOOSTS[FATIGUE]).concat(_.keys(BOOSTS[CARRY]).concat(_.keys(BOOSTS[WORK])));
            }
            break;
        }
        default: {
            boosts = boosts.concat(_.keys(BOOSTS[WORK]));
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
    let labs = this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LAB}});
    let minerals = labs.map((lab)=>lab.mineralType);
    if (!minerals) return 1;
    else return _.max(_.keys(BOOSTS[part])
        .filter((boost)=>minerals.indexOf(boost) >= 0) // available in the room
        .map((boost)=>BOOSTS[part][boost][feature])); // bonus
};
/**
 *
 * @param {Structure} structure
 * @returns {boolean} true if consumer creeps are allowed to pickup from this container
 */
Room.prototype.allowedLoadingContainer = function (structure) {
    return structure.structureType !== STRUCTURE_TOWER && structure.structureType !== STRUCTURE_LAB && (this.energyCapacity === this.energyCapacityAvailable || [STRUCTURE_SPAWN, STRUCTURE_EXTENSION].indexOf(structure.structureType) < 0);
};

Object.defineProperty(Room.prototype, 'import',
    {
        get: function () {
            if (this.memory.minerals && this.memory.minerals.import && !this.memory.import) {
                this.memory.import = _.uniq(_.keys(this.memory.minerals.import).reduce((acc, fromRoom)=> {
                    return acc.concat(
                        _.isString(this.memory.minerals.import[fromRoom]) ? [this.memory.minerals.import[fromRoom]] : this.memory.minerals.import[fromRoom]);
                }, []));
                this.log('import', this.memory.import);
                delete this.memory.minerals;
            }
            return this.memory.import || [];
        },
        set: function (value) {
            this.memory.import = _.isString(value) ? [value] : value;
        },
        configurable: true
    }
);
Object.defineProperty(Room.prototype, 'export',
    {
        get: function () {
            return this.memory.export || [];
        },
        set: function (value) {
            this.memory.exports = _.isString(value) ? [value] : value;
        },
        configurable: true
    }
);

module.exports = Room.prototype;