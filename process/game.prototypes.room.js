var _ = require('lodash');
var util = require('./util');
// var PickupManager = require('./util.manager.pickup');

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
    if (!route) {
        room.log('ERROR no route from', roomName, 'to', targetRoom);
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

    if (force || !cache.tripTimeToSources || !cache.tripTimeToSources[toRoom] || (cache.tripTimeToSources.time + 3000 < Game.time + 100 * Math.random())/*refresh time, random so that not all rooms timeout at the same time*/) {
        // this.log('tripTimeToSources not cached');
        cache.tripTimeToSources = cache.tripTimeToSources || {};
        cache.tripTimeToSources.time = Game.time;
        // console.log('tripTime computing');
        let roomCursor = this.name, startPoint;
        let tripTime = 0;
        startPoint = Room.getExitTo(roomCursor, toRoom).findClosestByRange(this.findContainers().filter(s=>[STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_STORAGE].indexOf(s.structureType) >= 0)).pos;
        // this.log(`tripTime to ${toRoom} using ${startPoint} as drop point`);
        let moveCost = {road: 1, plains: 2, swamp: 10};
        do {
            let exit = Room.getExitTo(roomCursor, toRoom);
            // this.log('tripTime exit', roomCursor, toRoom, JSON.stringify(exit));
            // let path = PathFn;
            if (!exit) {
                return undefined;
            }
            let inRoomPath;

            if (Game.rooms[roomCursor]) {
                inRoomPath = util.safeMoveTo2({pos: startPoint, room: this}, exit, {range: 0}).reduce((acc,pos)=> {
                    if (pos.lookFor(LOOK_STRUCTURES).find(l=>l.structure.structureType === STRUCTURE_ROAD)) return acc+1;
                    return acc+moveCost[pos.lookFor(LOOK_TERRAIN)[0].terrain];
                },0);
            } else {
                // this.log(`tripTime to ${toRoom}, no vision, ranging ${exit}, ${startPoint}, dist ${exit.getRangeTo(startPoint)*1.5}`);
                inRoomPath = Math.floor(exit.getRangeTo(startPoint) * 1.5);
            }
            // this.log(`tripTime to ${toRoom}, ${roomCursor}, ${inRoomPath}`);
            tripTime += inRoomPath;
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
        // this.log(`tripTimeToSources ${toRoom} cached`);
    }
    return cache.tripTimeToSources[toRoom];
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
            // console.log('Cache.get, expired ', path, memory[path].expires, Game.time);
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
Room.prototype.faucetContainers = function () {
    this.memory.cache = this.memory.cache || {};
    this.memory.cache.faucetContainers = this.memory.cache.faucetContainers || {};
    let containerIds = Cache.get(this.memory.cache, 'faucetContainers', ()=>(this.findContainers().filter(s=>this.allowedLoadingContainer(s)), 50);
    return containerIds.map((id)=> Game.getObjectById(id)).filter((s)=>!!s);
};
Room.prototype.buildStructures = function (pos) {
    'use strict';
    let genericBuilder = (type)=> {
        let flags = this.find(FIND_FLAGS, {filter: util.buildColors(type)});
        let unbuiltFlags = flags.filter((f)=>f.pos.lookFor(LOOK_STRUCTURES).filter((s)=>s.structureType === type).length === 0);
        let buildableFlags = unbuiltFlags.filter((f)=>f.pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0);
        // this.log('flags', type, flags.length);
        // this.log('unbuiltFlags', type, unbuiltFlags.length);
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
            if (this.controller.level >= 3 && this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).length < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][this.controller.level]) {
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
        let extensionsBuilder = ()=> {
            let currentExtensionCount = this.find(FIND_STRUCTURES).filter((s)=>s.structureType === STRUCTURE_EXTENSION).length;
            if (this.controller.level >= 2 && CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.controller.level] > currentExtensionCount) {
                return (genericBuilder(STRUCTURE_EXTENSION));
            }
        };
        let extractorBuilder = ()=> {
            if (this.controller.level >= 6 && !this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}})) {
                this.find(FIND_MINERALS).forEach((min)=> min.pos.createConstructionSite(STRUCTURE_EXTRACTOR));
                return true;
            }
        };
        let builders = [towerBuilder, storageBuilder, extensionsBuilder, rampartBuilder, wallsBuilder, extractorBuilder, linksBuilder, roadBuilder];
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
    return structure.structureType !== STRUCTURE_TOWER
        && structure.structureType !== STRUCTURE_LAB &&
        (this.energyCapacity === this.energyCapacityAvailable || [STRUCTURE_SPAWN, STRUCTURE_EXTENSION].indexOf(structure.structureType) < 0);
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
        (data)=>(data.type === LOOK_STRUCTURES )&& (parkForbiddenStructureTypes.indexOf(data.structure.structureType) >= 0),
        (data)=>(data.type === LOOK_CONSTRUCTION_SITES)&& (parkForbiddenStructureTypes.indexOf(data.constructionSite.structureType) >= 0)
    ];
    let rejected = rejects.reduce((acc, predicate)=>(acc || atXY.reduce((acc2, at)=>acc2 || predicate(at), acc)), false);
    // creep.log('isValid ', pos, !rejected, JSON.stringify(atXY));
    return !rejected;
};
/**
 * This callback type is called `requestCallback` and is displayed as a global symbol.
 *
 * @callback parkingPosValid
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
Room.prototype.findValidParkingPosition= function (creep, lookedPosition, range) {
    if (creep.memory.parking) {
        let pos = util.posFromString(creep.memory.parking, creep.room.name);
        if (pos.getRangeTo(lookedPosition)<= range  && this.isValidParkingPos(creep, pos)) {
            // creep.log('restoring upgrade pos', pos);
            return pos;
        } else {
            // creep.log(`discarding parking position ${pos}`);
        }
    }
    let aroundYX = this.glanceAround(lookedPosition, range, false);
    let candidates = [];
    let plainCandidates =[];
    let swampCandidates = [];
    for (let y in aroundYX) {
        if (y%49===0) continue;
        for (let x in aroundYX[y]) {
            if (x%49 ===0) continue;

            let atXY = aroundYX[y][x];
            if (this.isValidParkingPos(atXY)) {
                // creep.log('parking ', JSON.stringify(atXY));
                let terrain =atXY.find(l=>l.type === 'terrain');
                let pos = new RoomPosition(x, y, this.name);
                if (terrain.terrain==='plain') plainCandidates.push(pos );
                else if (terrain.terrain === 'swamp') swampCandidates.push(pos );
                candidates.push(pos);
            }
        }
    }
    // creep.log(`plains ${plainCandidates.length}, swamp ${swampCandidates.length} all ${candidates.length}`);
    let chosen =  creep.pos.findClosestByRange(plainCandidates.length?plainCandidates:swampCandidates);
    if (chosen) {
        creep.memory.parking = util.posToString(chosen);
        creep.log(`parking at ${chosen}`);
    }
    return chosen;
};


let parkForbiddenStructureTypes = OBSTACLE_OBJECT_TYPES.concat([STRUCTURE_ROAD]);

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