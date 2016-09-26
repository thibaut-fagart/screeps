var _ = require('lodash');
var Process = require('./process');
var ProcessTable = require('./process.table');
var ProcessHarvest = require('./process.Harvest');
var SpawnQueue = require('./process.SpawnQueue');
var util = require('./util');
/**
 * Basic enonomy : harvest source, refill, upgrade, repair
 * HIGHEST
 * 1 harvest process per source, harvestToContainer if container is present, otherwise request one
 * 1 carry (enough capacity) to bring from source to home storage
 *
 * HIGH
 * RoomMaintainance
 *
 * MEDIUM
 * RoomUpgrade
 *
 * state :
 * stage : 0 to 8, improves based on rules
 * 0 == not claimed
 *
 * roomName
 */
class OwnedRoom extends Process {
    /**
     *
     * @param {string} parent pid if null, this is the root process
     * @param roomName
     */
    constructor(parent, roomName) {
        super(parent);
        if (roomName) this.roomName = roomName;
        if (!this.spawnQueue) this.spawnQueue = [];
    }

    /**
     *
     * @returns {Room}
     */
    room() {
        console.log('room ', this.roomName, Game.rooms[this.roomName]);
        return Game.rooms[this.roomName];
    }

    missingCarryParts() {
        let carryParts = _.sum(this.carriers, (name)=>Game.creeps[name].body.filter((part)=>part.type === CARRY).length);
        let requiredCarryParts = this.requiredCarry / CARRY_CAPACITY;
        if (carryParts < requiredCarryParts) {
            return requiredCarryParts - carryParts;
        }
    }


    requestCreep(spec, owner) {
        this.log(`${owner.id} is requesting ${spec.name}`);
        // debugger;
        let specId = spec.name + Game.time + util.tickUuid();
        spec.owner = owner.id;
        spec.body = _.isFunction(spec.body) ? spec.body(this.room()) : spec.body;
        spec.cost = _.sum(spec.body, (part)=>BODYPART_COST[part]);
        spec.requestId = specId;
        spec.memory.owner = owner.id;
        this.spawnQueue.push(spec);
        this.log(`queue length ${this.spawnQueue.length}`);
        return specId;
    }

    /**
     *
     * @param {ProcessTable}processTable
     */
    run(processTable) {
        this.log('running ');
        let room = this.room();
        switch (this.status) {
            case Process.STATUS_NEW : {
                if ((room.memory.previousLevel || 0) !== room.controller.level) {
                    console.log('controller improved');
                    // controller improved TODO

                }
                // this.createSpawnQueue(processTable, room);
                this.sourceCount = room.find(FIND_SOURCES).length;
                this.status = Process.STATUS_RUNNING;
                room.memory.previousLevel = room.controller ? room.controller.level : 0;
                break;
            }
            case Process.STATUS_RUNNING : {
                this.spawnHarvestIfNeeded(processTable, room);
                while (this.spawnQueue.length > 0 && room.energyCapacityAvailable < this.spawnQueue[0].cost) {
                    let spec = this.spawnQueue.shift();
                    this.processTable.get(spec.owner).requestCanceled(spec.requestId);
                    room.log('discarding unaffordable ', JSON.stringify(spec));

                }
                room.find(FIND_MY_SPAWNS).forEach((spawn) => {
                    if (!spawn.spawning) {
                        if (this.spawnQueue.length) {
                            let spec = this.spawnQueue.shift();
                            this.createCreep(spawn, spec);
                        }
                    }
                });

                switch (this.stage) {
                    case 0: {
                        // claimers
                    }
                    case 1: {
                        // upgraders
                    }
                }
                if ((room.memory.previousLevel || 0) !== room.controller.level) {
                    // controller improved TODO

                }
                break;
            }

            default: {

            }
        }

    }

    spawnHarvestIfNeeded(processTable, room) {
        let harvestProcesses = processTable.getChildren(this).filter((p)=>p.type === ProcessHarvest.name);
        if (harvestProcesses.length < this.sourceCount) {
            if (harvestProcesses.find((p)=>!p.satisfied())) {
                room.log('existing process not satisfied, defferring new ones');
            } else {
                let source = room.find(FIND_SOURCES).find((s)=> !harvestProcesses.find((p)=>p.sourceid === s.id));
                let processHarvest = new ProcessHarvest(this.id, source);
                processTable.register(processHarvest);
            }

        }
    }

    createCreep(spawn, buildSpec) {
        spawn.log('createCreep', JSON.stringify(buildSpec));
        if (!buildSpec.memory || !buildSpec.body) {
            spawn.log('ERROR, invalid create', JSON.stringify(buildSpec));
        }
        let name = buildSpec.requestId;
        let canCreate ;
        let suffix = 0;
        do {
            canCreate = spawn.createCreep(buildSpec.body, name, buildSpec.memory);
            if (canCreate === ERR_NAME_EXISTS) {
                spawn.log('name conflict ' + name);
                suffix = suffix + 1;
                name = buildSpec.requestId + '_' + suffix;
            }
        } while (canCreate ===ERR_NAME_EXISTS);

        // if (canCreate === ERR_NAME_EXISTS) name = spawn.room.name + '_' + name; // todo if it ever happens ...
        let created = 'number' !== typeof canCreate;
        if (created) {
            this.updateCounters(spawn, {spawning: 1});
            this.processTable.get(buildSpec.owner).creepRequestProcessed(buildSpec.requestId, canCreate);
            spawn.log('building ', spawn.room.energyAvailable, spawn.room.energyCapacityAvailable, JSON.stringify(_.countBy(buildSpec.body)), JSON.stringify(buildSpec.memory));
            spawn.memory.build = {start: Game.time, name: canCreate, memory: buildSpec.memory};
            spawn.room.memory.building = spawn.room.memory.building || {};
            spawn.room.memory.building[spawn.memory.build.name] = spawn.memory.build;
            if (buildSpec.memory.remoteRoom) {
                spawn.room.memory.efficiency = spawn.room.memory.efficiency || {};
                spawn.room.memory.efficiency.remoteMining = spawn.room.memory.efficiency.remoteMining || {};
                let creepCost = _.sum(buildSpec.body, (part=>BODYPART_COST[part]));
                spawn.room.memory.efficiency.remoteMining [buildSpec.memory.remoteRoom] = (spawn.room.memory.efficiency.remoteMining [buildSpec.memory.remoteRoom] || 0) - creepCost;
            }
        } else {
            spawn.log('create?', canCreate, JSON.stringify(buildSpec.body), JSON.stringify(buildSpec.memory));

        }
        return created;
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

    /**
     *
     * @param {ProcessTable} processTable
     * @param {Room} room
     */
    createSpawnQueue(processTable, room) {
        let spawns = room.find(FIND_MY_SPAWNS);
        processTable.register(new SpawnQueue(this.id, spawn));
    }
}
OwnedRoom.TYPE = 'room';
module.exports = OwnedRoom;