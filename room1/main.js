var _ = require('lodash');
var util = require('./util');
class Handler  {
    constructor(role,include) {
        this.role = role; this.include = include;
        this.handler = false;
    }
    run(creep) {
        if (!this.handler) this.handler = new (require(this.include));
        return this.handler.run(creep);
    }
    class() {
        return require(this.include);
    }
}
let handlers = {
    'harvester': new Handler('harvester','./role.harvester'),
    'mineralHarvester': new Handler('mineralHarvester','./role.harvester.mineral'),
    'keeperGuard': new Handler('keeperGuard','./role.soldier.keeperguard'),
    'remoteCarryKeeper': new Handler('remoteCarryKeeper','./role.remote.carrykeeper'),
    'recycle': new Handler('recycle','./role.recycle'),
    'claimer': new Handler('claimer','./role.controller.claim'),
    'carry': new Handler('carry','./role.carry'),
    'keeperHarvester': new Handler('keeperHarvester','./role.remote_harvester.keeper'),
    'energyFiller': new Handler('energyFiller','./role.energyfiller'),
    'energyGatherer': new Handler('energyGatherer','./role.energygatherer'),
    'mineralGatherer': new Handler('mineralGatherer','./role.mineralgatherer'),
    'remoteCarry': new Handler('remoteCarry','./role.remote.carry'),
    'upgrader': new Handler('upgrader','./role.upgrader'),
    'repair2': new Handler('repair2','./role.repair2'),
    'reserver': new Handler('reserver','./role.controller.reserve'),
    'builder': new Handler('builder','./role.builder'),
    'scout': new Handler('scout','./role.scout'),
    'remoteBuilder': new Handler('remoteBuilder','./role.builder.remote'),
    'attacker': new Handler('attacker','./role.soldier.attacker'),
    'remoteHarvester': new Handler('remoteHarvester','./role.remote_harvester'),
    'roleRemoteGuard': new Handler('roleRemoteGuard','./role.soldier.roomguard'),
    'roleCloseGuard': new Handler('roleCloseGuard','./role.soldier.roomguard'),
    'roleSoldier': new Handler('roleSoldier',''),
    'labOperator': new Handler('labOperator','./role.lab_operator'),
    'tower': new Handler('tower','./role.tower'),
};

var roleSpawn = require('./role.spawn');

var profiler = require('./screeps-profiler');

// var RoomManager = require('./manager.room'), roomManager = new RoomManager(); // todo manager
// This line monkey patches the global prototypes.
if (Game.cpu.bucket> 500)  profiler.enable();
var debugRoles = [];
var debugRooms = [];
// var debugCreeps = ['Xavier' ];
Creep.prototype.log = function () {
    if ((!debugRoles.length || (debugRoles.indexOf(this.memory.role) >= 0))) {
        // if ((!debugRooms.length || (debugRooms.indexOf(this.room.name) >= 0))) {
        // if ((!debugCreeps.length || (debugCreeps.indexOf(this.name) >= 0))) {
        console.log([this.name, this.pos, this.memory.role].concat(Array.prototype.slice.call(arguments)));
    }
};
Spawn.prototype.log = function () {
    console.log([this.name, this.room.name].concat(Array.prototype.slice.call(arguments)));
};
Room.prototype.log = function () {
    console.log([this.name, this.controller ? this.controller.level : 'neutral'].concat(Array.prototype.slice.call(arguments)));
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
Structure.prototype.log = function () {
    console.log([this.structureType, this.room.name, this.id].concat(Array.prototype.slice.call(arguments)));
};
Structure.prototype.memory = function () {
    "use strict";
    let mem = this.room.memory.structures;
    if (!mem) {
        mem = this.room.memory.structures = {};
    }
    if (!mem.id) {
        return mem.id = {};
    } else {
        return mem.id;
    }

};
Room.prototype.findLabWith = function (resource) {
    let pairs = _.pairs(this.memory.labs);
    // creep.log('pairs', JSON.stringify(pairs));
    let find = pairs.find((pair)=>pair[1] === resource);
    // creep.log('match', JSON.stringify(find));
    let labid = find[0];
    // creep.log('match', labid);
    return Game.getObjectById(labid);

};
Room.prototype.hasKeeperLairs = function () {
    let coords = /([EW])(\d+)([NS])(\d+)/.exec(this.name);
    return (Math.abs(coords[2] % 10 - 5) <= 1 && Math.abs(coords[4] % 10 - 5) <= 1  );
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
    let linkAcceptsEnergy = (l)=> l && l.energy < l.energyCapacity;
    if (linkAcceptsEnergy(controllerLink)) {
        if (otherLinks.length && otherLinks[0].energy > 0) {
            otherLinks[0].transferEnergy(controllerLink);
            actioned.push(otherLinks[0].id);
            console.log(this.name, 'link transfer other to controller', otherLinks[0].id, otherLinks[0].energy);
        } else if (storageLink && storageLink.energy > 0 && storageLink.cooldown === 0) {
            storageLink.transferEnergy(controllerLink);
            actioned.push(storageLink.id);
            console.log(this.name, 'link transfer storage to controller', storageLink.energy);
        }
    }
    otherLinks.forEach((l)=> {
        "use strict";
        if (actioned.indexOf(l.id) < 0 && linkAcceptsEnergy(storageLink)) {
            if (l.energy > 0) {
                l.transferEnergy(storageLink);
                console.log(this.name, 'link transfer other to storage', l.id, l.energy);
            }
        }
    })
};
Room.prototype.expectedMineralType = function (lab) {
    return (this.memory.labs || [])[lab.id];
};
var handleLabs = function (room) {
    _.keys(room.memory.labs).forEach((labid)=> {
        let lab = Game.getObjectById(labid);
        if (!lab.cooldown) {
            // creep.log('testing ', labid);
            let reaction = room.expectedMineralType(lab);
            // creep.log('using ', reaction);
            if (reaction) {
                let ingredients = handlers['labOperator'].class().reactions [reaction];
                // creep.log('searching labs with ingredients', ingredients, !!ingredients);

                if (ingredients) {
                    let sourceLabs = ingredients.map((i)=>room.findLabWith(i));
                    // console.log('running with ', JSON.stringify(sourceLabs.map((lab)=>lab.id)));
                    let result = lab.runReaction(sourceLabs[0], sourceLabs[1]);
                    // console.log('run?', lab.mineralType, result);
                }
            }

        }
    })
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
Room.prototype.updateLocks = function () {
    "use strict";
    let locks = _.pairs(this.memory.reserved);
    locks.forEach((p)=> {
        if (!_.isString(p[1])) {
            _.pairs(p[1]).forEach((q)=> {
                "use strict";
                if (!Game.getObjectById(q[1])) {
                    delete this.memory.reserved[q[0]];
                }

            });
        } else if (!Game.getObjectById(p[1])) {
            delete this.memory.reserved[p[0]];
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
};
Room.prototype.updateCheapStats = function () {
    Memory.stats['room.' + this.name + '.spawns.queueLength'] = this.memory.queueLength;
    _.keys(this.memory.queue).forEach((role)=> {
        'use strict';
        Memory.stats['room.' + this.name + '.spawns.queue.' + role] = this.memory.queue[role];
    });
    Memory.stats["room." + this.name + ".energyAvailable"] = this.energyAvailable;
    Memory.stats["room." + this.name + ".energyCapacityAvailable"] = this.energyCapacityAvailable;
    Memory.stats["room." + this.name + ".threats.harvested"] = this.memory.threatAssessment.harvested;
    Memory.stats["room." + this.name + ".reservedCount"] = _.size(this.memory.reserved);
    Memory.stats["room." + this.name + ".energyInSources"] = _.sum(_.map(this.find(FIND_SOURCES_ACTIVE), (s)=> s.energy));
    if (this.controller && this.controller.my) {
        Memory.stats["room." + this.name + ".controller.progress"] = this.controller.progress;
        Memory.stats["room." + this.name + ".controller.ProgressRatio"] = 100 * this.controller.progress / this.controller.progressTotal;
    }

};

let roomTasks = [
    (r)=>{/*r.log('running towers');*/r.operateTowers()},
    (r)=>{/*r.log('running links');*/r.operateLinks()},
    (r)=>(r.memory.harvestContainers = r.memory.harvestContainers || []),
    (r)=> {
        if (0 == Game.time % 100) {
            r.updateLocks();
        }
    },
    (r)=> {
        if (0 == Game.time % 100) {
            r.gc();
        }
    },
    (r)=>{
        if (Game.cpu.bucket > 200) r.assessThreat();
    },

];

function innerLoop() {
    let messages = [];
    let globalStart = Game.cpu.getUsed();
    let oldSeenTick = Game.time || (Memory.counters && Memory.counters.seenTick);
    Memory.counters = {tick: Game.time, seenTick: oldSeenTick + 1};
    if (0 == Game.time % 100) {
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }
    let cpu = {};
    let availableCpu = Game.cpu.tickLimit ;
    console.log('availableCpu', availableCpu);
    _.keys(handlers).forEach((k)=>cpu[k] = 0);
    let sortedRooms = _.sortBy(_.values(Game.rooms), (r)=> r.controller && r.controller.my ? r.controller.level : 10);
    sortedRooms.forEach((room)=> {
    // for (var roomName in Game.rooms) {
    //     var room = Game.rooms[roomName];
        let roomName = room.name;
        roomTasks.forEach((task)=> {
            "use strict";
            if (Game.cpu.getUsed() < availableCpu - 5) {
                try {
                    task(room);
                } catch (e) {
                    console.log(e);
                    console.log(e.stack);
                }
            }
        });

        // roomManager.run(room); // todo manager
        // room.prototype.sourceConsumers = {};
        if (Game.cpu.getUsed() < availableCpu - 5) {
            var creeps = room.find(FIND_MY_CREEPS);
            let ran = '';
            // room.creeps = creeps;
            creeps.forEach(function (creep) {
                try {
                    if (!creep.spawning) {
                        let start = Game.cpu.getUsed();
                        if (start + 1 < availableCpu) {
                            ran += creep.memory.role+',';
                            let handler = handlers[creep.memory.role];
                            if (handler) handler.run(creep);
                            else {
                                creep.log('!!!!!!no handler !! ');
                            }
                        }
                        let end = Game.cpu.getUsed();
                        cpu[creep.memory.role] += (end - start);
                    }
                } catch (e) {
                    creep.log(e.stack);
                    Game.notify(e.stack);
                }
            });
            room.log('ran creeps', ran);
        }
        if (Game.cpu.getUsed() < availableCpu ) {
            roleSpawn.run(room);
        }

        if (!(Game.time % 10) && room.memory.labs && Game.cpu.getUsed() < availableCpu - 5) {
            // creep.log('running reactions');
            handleLabs(room);
        }
        if (Game.cpu.getUsed() + 1 < availableCpu) room.updateCheapStats();
        if (Game.cpu.getUsed() + 5 < availableCpu) {
            Memory.stats["room." + this.name + ".energyInStructures"] = _.sum(_.map(room.find(FIND_MY_STRUCTURES), (s)=> s.store ? s.store.energy : 0));
            Memory.stats["room." + room.name + ".energyDropped"] = _.sum(_.map(room.find(FIND_DROPPED_RESOURCES, {filter: (r) => r.resourceType == RESOURCE_ENERGY}), (s)=> s.amount));
            if (room.memory.efficiency) {
                if (room.memory.efficiency.remoteMining) {
                    Memory.stats["room." + room.name + ".efficiency.remoteMining"] = _.sum(room.memory.efficiency.remoteMining);
                    _.keys(room.memory.efficiency.remoteMining).forEach((r)=>Memory.stats["room." + room.name + ".efficiency.remoteMining." + r] = room.memory.efficiency.remoteMining[r]);
                }
            }
            // Memory.stats["room." + room.name + ".spawns.idle"] = _.sum(room.find(FIND_MY_SPAWNS),(s)=>s.memory.idle);
            // Memory.stats["room." + room.name + ".spawns.waitFull"] = _.sum(room.find(FIND_MY_SPAWNS),(s)=>s.memory.waitFull);

            let strangers = room.find(FIND_HOSTILE_CREEPS);
            let hostiles = _.filter(strangers, (c)=>_.sum(c.body, (p)=>p == ATTACK || p == RANGED_ATTACK) > 0);
            //            {"pos":{"x":11,"y":28,"roomName":"E37S14"},"body":[{"type":"work","hits":100},{"type":"carry","hits":100},{"type":"move","hits":100},{"type":"carry","hits":100},{"type":"work","hits":100},{"type":"move","hits":100},{"type":"move","hits":100},{"type":"work","hits":100},{"type":"carry","hits":100},{"type":"move","hits":100},{"type":"carry","hits":100},{"type":"work","hits":100},{"type":"move","hits":100},{"type":"move","hits":100}],"owner":{"username":"Finndibaen"}"hits":1400,"hitsMax":1400}

            if (hostiles.length > 0) {
                messages.push(' strangers ' + JSON.stringify(_.map(hostiles, (h) => {
                        let subset = _.pick(h, ['name', 'pos', 'body', 'owner', 'hits', 'hitsMax']);
                        subset.body = _.countBy(subset.body, 'type');
                        return subset;
                    })));
            }
            Memory.stats["room." + room.name + ".strangers"] = _.size(strangers);
            Memory.stats["room." + room.name + ".hostiles"] = _.size(hostiles);
            let roster = util.roster(room);
            _.keys(handlers).forEach((k)=> Memory.stats["room." + room.name + ".creeps." + k] = roster[k] || 0);
            if (!(Game.time % 10)) {
                Memory.stats = {};
                let repairsNeededByStrcutureArray = _.map(_.pairs(_.groupBy(room.find(FIND_STRUCTURES), (s)=>s.structureType)), (array)=>[array[0], _.sum(array[1], (s)=>s.hitsMax - s.hits)])
                repairsNeededByStrcutureArray.forEach((pair)=> {
                    Memory.stats["room." + room.name + ".repairs2." + pair[0] + "K"] = pair[1];
                });
            }
        }
    });
    if (Game.cpu.getUsed() + 5 < availableCpu) {
        let remoteCreeps = _.groupBy(_.values(Game.creeps), (c)=>c.memory.remoteRoom);
        _.keys(remoteCreeps).forEach((name)=> {
            "use strict";
            if ('undefined' !== typeof name) {
                let remoteRoster = _.countBy(remoteCreeps[name], (c)=>c.memory.role);
                _.keys(remoteRoster).forEach((role)=>Memory.stats["remoteRooms." + name + ".assigned." + role] = remoteRoster[role]);
            }
        });
    }
    _.keys(cpu).forEach((k)=> {
        Memory.stats["cpu_." + k] = cpu[k];
    });
    Memory.stats["cpu_bucket"] = Game.cpu.bucket;
    if (messages.length > 0) {
        Game.notify(messages);
    }
    Memory.stats["cpu_.main"] = Game.cpu.getUsed() - _.sum(cpu);
    Memory.stats["cpu"] = Game.cpu.getUsed();
    Memory.stats["gcl.progress"] = Game.gcl.progress;
    Memory.stats["gcl.progressTotal"] = Game.gcl.progressTotal;
    // counting walkable tiles neer location:
    //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
}

// RoomObject.prototype.creeps = [];
module.exports.loop = function () {

    if (Game.cpu.bucket > 100) innerLoop();
    console.log(Game.cpu.getUsed(), Game.cpu.bucket);
    // profiler.wrap(innerLoop);
};