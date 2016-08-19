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
Room.prototype.operateLabs = function() {
    "use strict";
    _.keys(this.memory.labs).forEach((labid)=> {
        let lab = Game.getObjectById(labid);
        if (!lab.cooldown) {
            // creep.log('testing ', labid);
            let reaction = this.expectedMineralType(lab);
            //room.log('using ', reaction);
            if (reaction) {
                let ingredients = handlers['labOperator'].class().reactions [reaction];
                // creep.log('searching labs with ingredients', ingredients, !!ingredients);

                if (ingredients) {
                    let sourceLabs = ingredients.map((i)=>this.findLabWith(i));
                    if (sourceLabs[0] && sourceLabs[1]) {

                        // console.log('running with ', JSON.stringify(sourceLabs.map((lab)=>lab.id)));
                        let result = lab.runReaction(sourceLabs[0], sourceLabs[1]);
                        // console.log('run?', lab.mineralType, result);
                    }
                }
            }

        }
    })

}
Room.prototype.hasKeeperLairs = function () {
    let coords = /([EW])(\d+)([NS])(\d+)/.exec(this.name);
    return (Math.abs(coords[2] % 10 - 5) == 1 && Math.abs(coords[4] % 10 - 5) == 1  );
    // this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}})
};
Room.prototype.operateLinks = function () {
    let links = this.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LINK}});
    if (!links.length) return;
    let storageLink = (this.storage) && links.find((l)=> l.pos.getRangeTo(this.storage) < 4);
    let controllerLink = links.find((l)=> l.pos.getRangeTo(this.controller.pos) < 4);
    let otherLinks = links.filter((l)=> (!storageLink || (storageLink && l.id !== storageLink.id)) && (!controllerLink || (controllerLink && l.id !== controllerLink.id)));
    otherLinks = _.sortBy(otherLinks.filter((l)=>l.cooldown === 0), (l)=> -l.energy);
    let actioned = [];
    let linkAccepts = (link, amount) => link && !link.cooldown && link.energy + amount < link.energyCapacity;
    let chooseTargetLink = (amount, l1, l2)=> {
        if (linkAccepts(l1, amount)) {
            return l1;
        } else if (linkAccepts(l2, amount)) {
            return l2;
        } else if (!l1 || !l2) {
            return l1 ? l1 : l2;
        } else if (l1.energy < l2.energy) {
            return l1;
        } else {
            return l2;
        }
    };
    /*
     if (linkAccepts(controllerLink)) {
     if (otherLinks.length && otherLinks[0].energy > 0) {
     otherLinks[0].transferEnergy(controllerLink);
     actioned.push(otherLinks[0].id);
     // this.log(this.name, 'link transfer other to controller', otherLinks[0].id, otherLinks[0].energy);
     } else if (storageLink && storageLink.energy > 0 && storageLink.cooldown === 0) {
     storageLink.transferEnergy(controllerLink);
     actioned.push(storageLink.id);
     // this.log(this.name, 'link transfer storage to controller', storageLink.energy);
     }
     }
     */
    otherLinks.forEach((l)=> {
        "use strict";
        let target = chooseTargetLink(l.energy, controllerLink, storageLink);
        if (target) l.transferEnergy(target);
    });
    let target = chooseTargetLink(storageLink.energy, controllerLink, undefined);
    if (target) {
        storageLink.transferEnergy(target);
    }
};
Room.prototype.harvestPositions = function () {
    "use strict";
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
    "use strict";
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
        "use strict";
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
            Memory.rooms[roomName].efficiency = {date: Game.time};
        }
        // [{remoteMining: {room:value}]
        let result = _.cloneDeep(roomMem);
        // console.log('oldMems', JSON.stringify(oldMems));
        oldMems.reduce((previous, current)=> {
            // console.log('previous', JSON.stringify(previous), 'current', JSON.stringify(current));
            _.keys(current).forEach((type)=> {
                "use strict";
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
    "use strict";
    let locks = _.pairs(this.memory.reserved);
    // this.log('updating locks');
    locks.forEach((p)=> {
        let reason = p[0];
        let sublocks = p[1]
        if (!_.isString(sublocks)) {
            _.pairs(sublocks).forEach((q)=> {
                "use strict";
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
    if (this.memory.towersCache.date + 500 < Game.time) {
        this.memory.towersCache.towers = this.find(FIND_MY_STRUCTURES, {filter: (s) => s instanceof StructureTower}).map((s) => s.id);
    }
    this.memory.towersCache.towers.forEach((towerid)=> {
        let tower = Game.getObjectById(towerid);
        if (tower) handlers['tower'].run(tower);
        else this.memory.towersCache.towers = this.find(FIND_MY_STRUCTURES, {filter: (s) => s instanceof StructureTower}).map((s) => s.id);
    });
};
Room.prototype.gc = function () {
    "use strict";
    let structuresMemory = this.memory.structures;
    if (structuresMemory) {
        for (var id in structuresMemory) {
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
 * @param {string} toRoom
 * @returns {number}
 */
Room.prototype.tripTimeToSources = function (toRoom) {
    "use strict";
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
        this.log('tripTimeToSources not cached');
        cache.tripTimeToSources = cache.tripTimeToSources || {};
        cache.tripTimeToSources.time = Game.time;
        // console.log('tripTime computing');
        let roomCursor = this.name, startPoint;
        let tripTime = 0;
        let startRoom = this;
        let candidateStartingPoints = startRoom.find(FIND_STRUCTURES, {filter: (s)=> [STRUCTURE_LINK, STRUCTURE_STORAGE, STRUCTURE_SPAWN].indexOf(s.structureType) >= 0});
        startPoint = util.findExit(startRoom, toRoom).findClosestByPath(candidateStartingPoints);
        // startRoom.log('tripTime using ', startPoint, ' as drop point');

        do {
            let exit = util.findExit(roomCursor, toRoom);
            console.log('tripTime exit', roomCursor, toRoom, JSON.stringify(exit));
            // let path = PathFn;
            if (!exit) {
                return undefined;
            }
            tripTime += exit.getRangeTo(startPoint);// todo path.length;
            startPoint = util.nextRoom(exit);
            roomCursor = startPoint.roomName;
            // console.log('tripTime',roomCursor, tripTime);
        } while (roomCursor !== toRoom);
        let targetRoom = Game.rooms[toRoom];

        if (targetRoom) {
            let temp = 0;
            let sources = targetRoom.find(FIND_SOURCES);
            sources.forEach((s)=>temp += s.pos.getRangeTo(startPoint));
            tripTime += temp / sources.length;
        } else {
            tripTime += 20;
        }
        // console.log('tripTime', this.name, toRoom, tripTime);
        cache.tripTimeToSources[toRoom] = tripTime;
    } else {
        // this.log('tripTimeToSources cached');
    }
    return cache.tripTimeToSources[toRoom];
};
Room.prototype.updateCheapStats = function () {

    Memory.stats['room.' + this.name + '.spawns.queueLength'] = this.memory.queueLength;
    let building = this.memory.building;
    let buildingRoles = building?_.countBy(_.values(building).map((spec)=>spec.memory.role)):{};
    let queuePrefix = 'room.' + this.name + '.spawns.queue.';
    let buildingPrefix = 'room.' + this.name + '.spawns.building.';
    _.keys(handlers).forEach((role)=> {
        if (this.memory.queue && this.memory.queue[role]) {
            Memory.stats[queuePrefix+ role] = this.memory.queue[role];
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
    Memory.stats["room." + this.name + ".energyAvailable"] = this.energyAvailable;
    Memory.stats["room." + this.name + ".energyCapacityAvailable"] = this.energyCapacityAvailable;
    Memory.stats["room." + this.name + ".threats.harvested"] = this.memory.threatAssessment.harvested;
    Memory.stats["room." + this.name + ".reservedCount"] = _.size(this.memory.reserved);
    Memory.stats["room." + this.name + ".energyInSources"] = _.sum(_.map(this.find(FIND_SOURCES_ACTIVE), (s)=> s.energy));
    if (this.controller && this.controller.my) {
        Memory.stats["room." + this.name + ".controller.progress"] = this.controller.progress;
        Memory.stats["room." + this.name + ".controller.progressTotal"] = this.controller.progressTotal;
        Memory.stats["room." + this.name + ".controller.ProgressRatio"] = 100 * this.controller.progress / this.controller.progressTotal;
    }

    let spawnStats = this.find(FIND_MY_SPAWNS)
        .reduce((sum, spawn)=> {
                _.keys(spawn.memory.spawns).forEach((k)=> {
                    if (!(/.*Bits/.exec(k))) {
                        sum[k] = (sum[k] || 0) + spawn.memory.spawns[k];
                    }
                });
                return sum;
            },
            {});
    // this.log('spawnStats', JSON.stringify(spawnStats));
    let spawnPrefix = 'room.' + this.name + '.spawns.';
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
    return this.lookAtArea(type,
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

Room.prototype.findContainers = function () {
    this.memory.cache = this.memory.cache || {};
    this.memory.cache.containers = this.memory.cache.containers || {};
    let containerIds = Cache.get(this.memory.cache, 'containers', ()=>(this.find(FIND_STRUCTURES).filter((s)=> (s.storeCapacity || s.energyCapacity)).map((s)=>s.id)), 50);
    return containerIds.map((id)=> Game.getObjectById(id)).filter((s)=>!!s);
};

/*
 Room.prototype._find = Room.prototype.find;
 Room.prototype.find = function (type, opts) {
 "use strict";
 if (opts) {
 return this._find(type, opts);
 } else {
 this.cache = (this.cache && this.cache.time === Game.time)? this.cache: {time:Game.time};
 if (this.cache[type]) {
 return this.cache[type];
 } else {
 let find = this._find(type, opts);
 this.cache[type] = find;
 return find;
 }

 }
 };
 */

module.exports = Room.prototype;