var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var MoveToRoomTask = require('./task.move.toroom');
var RegroupStrategy = require('./strategy.regroup');

class RoleRemoteCarry {

    constructor() {
        this.travelingPickup = new PickupStrategy(undefined, (creep)=> {
            return (drop)=> {
                let range = drop.pos.getRangeTo(creep);
                return range < 2;
            };
        });
        this.loadFromNeighbour= new LoadFromContainerStrategy(undefined, undefined, (creep)=> {
            return (s)=> {
                let range = s.pos.getRangeTo(creep);
                return range < 2 && s.energy >50;
            };
        });
        this.pickupStrategy = new PickupStrategy(undefined, (creep)=> {
            let availableCarry = creep.carryCapacity - _.sum(creep.carry);
            return (drop)=> {
                let range = drop.pos.getRangeTo(creep);
                return range < 5 || drop.amount > availableCarry + range;
            };
        });
        this.loadStrategies = [
            new PickupStrategy(undefined, (creep)=> ((drop)=>drop.amount > 50)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER)
        ];
        this.unloadStrategies = [
            // new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToContainerStrategy(undefined, undefined,
                (creep)=>((s)=>([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK].indexOf(s.structureType) >= 0))),
            new DropToEnergyStorageStrategy()
        ];
        this.regroupStrategy = new RegroupStrategy(COLOR_ORANGE);
        this.avoidThreadStrategy = new AvoidRespawnStrategy();
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'load';

        this.goRemoteTask = new MoveToRoomTask(undefined, 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask(undefined, 'remoteRoom', 'homeroom');
    }

    /*
     requires : remoteRoom=creep.room.remoteMining, homeroom = creep.room.name, homeroom, remoteSource
     */
    resign(creep) {
        creep.log("resigning");
    }

    init(creep) {
        creep.memory.action = 'go_remote_room';
        creep.memory.homeroom = creep.room.name;
        if (!creep.memory.remoteRoom && creep.room.memory.remoteMining) {
            creep.memory.remoteRoom = _.isString(creep.room.memory.remoteMining) ? creep.room.memory.remoteMining : creep.room.memory.remoteMining[0];
        }
    }

    setAction(creep, action) {
        // creep.log('set action', action);
        creep.memory.action = action;
        creep.memory.tripTime = Game.time - creep.memory.startTrip;
        delete creep.memory.startTrip;
        util.setCurrentStrategy(creep, null);

    }

    /** @param {Creep} creep **/
    run(creep) {
        if (!creep.memory.homeroom) {
            creep.memory.homeroom = creep.room.name;
        }
        if (creep.memory.remotesource) {
            creep.memory.source = creep.memory.remotesource;
            delete creep.memory.remotesource;
        }
        if (!creep.memory.action) {
            this.init(creep);
        }
        // creep.log('action?', creep.memory.action);
        if (this.repairAround(creep)) {
            return;
        }
        this.buildAround(creep);
        if (creep.room.name !== creep.memory.remoteRoom) this.travelingPickup.accepts(creep);
        creep.memory.startTrip = creep.memory.startTrip || Game.time; // remember when the trip started, will allow to know when need to come back
        if (creep.memory.action === 'go_remote_room') {
            if (_.sum(creep.carry) > 0.95 * creep.carryCapacity) {
                this.setAction(creep, 'go_home_room');
            } else if (!this.goRemoteTask.accepts(creep)) {
                // creep.log('goRemote refused... remote ? ');
                this.setAction(creep, this.ACTION_FILL);
            }
        } else if (creep.memory.action === 'go_home_room') {
            if (_.sum(creep.carry) === 0) {
                this.setAction(creep, 'go_remote_room');
            } else if (!this.goHomeTask.accepts(creep) && creep.room.name === creep.memory.homeroom) {
                this.setAction(creep, this.ACTION_UNLOAD);
                creep.room.deliver(creep.memory.remoteRoom,creep.carry);
            }
        } else if (creep.memory.action === this.ACTION_FILL && _.sum(creep.carry) > 0.95 * creep.carryCapacity) {
            this.setAction(creep, 'go_home_room');
            this.goHomeTask.accepts(creep);
        } else if (creep.memory.action === this.ACTION_UNLOAD && _.sum(creep.carry) === 0) {
            // TODO check lifespan , will the creep live long enough to go and bakc ?
            let timeToSources = creep.room.tripTimeToSources(creep.memory.remoteRoom);
            if (3*timeToSources< creep.ticksToLive) {
                this.setAction(creep, 'go_remote_room');
                this.goRemoteTask.accepts(creep);
            } else {
                creep.log('ready to die, recycling', creep.ticksToLive, timeToSources);
                creep.memory.previousRole = creep.memory.role;
                creep.memory.role = 'recycle';
                return false;
            }
        }

        if (creep.memory.action == this.ACTION_FILL && creep.memory.remoteRoom == creep.room.name) {
            let strategy;
            if (!this.avoidThreadStrategy.accepts(creep)) {
                if (!this.loadFromNeighbour.accepts(creep) && !this.pickupStrategy.accepts(creep)) {
                    // creep.log('no pickup');
                    strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
                    if (!strategy) {
                        strategy = _.find(this.loadStrategies, (strat)=>!(null == strat.accepts(creep)));
                    }
                } else {
                    // creep.log('pickup');
                    strategy = this.pickupStrategy;
                }
                if (strategy) {
                    // creep.log('strategy', strategy.constructor.name);
                    util.setCurrentStrategy(creep, strategy);
                } else {
                    // creep.log('no loadStrategy');
                    this.regroupStrategy.accepts(creep);
                    return false;
                }
            }
        }
        else if (creep.memory.action == this.ACTION_UNLOAD) {
            // creep.log('home, unloading');
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>!(null == strat.accepts(creep)));
                // creep.log('stragegy?', strategy);
            }
            if (strategy) {
                // creep.log('stragegy?', strategy);
                util.setCurrentStrategy(creep, strategy);
            } else {
                util.setCurrentStrategy(creep, null);
                return;
            }
        }
    }

    /**
     *
     * @param creep
     * @return false if repair level is satisfying
     */
    repairAround(creep) {
        let range = 3;
        let structures = creep.room.lookForAtArea(LOOK_STRUCTURES, Math.max(0, creep.pos.y - range), Math.max(0, creep.pos.x - range),
            Math.min(creep.pos.y + range, 49), Math.min(49, creep.pos.x + range), true);
        let needRepair = structures.filter((s)=>s.hits < s.hitsMax && s.ticksToDecay);
        if (needRepair.length) {
            creep.log('repairing');
            creep.repair(needRepair[0]);
            return needRepair[0].hits < needRepair[0].hitsMax / 2;
        }
    }

    buildAround(creep) {
        let range = 3;
        let sites = creep.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, Math.max(0, creep.pos.y - range), Math.max(0, creep.pos.x - range),
            Math.min(creep.pos.y + range, 49), Math.min(49, creep.pos.x + range), true);
        if (sites && sites.length) {
            // creep.log('building', JSON.stringify(sites[0]));
            creep.build(sites[0]);

        }
    }
}

module.exports = RoleRemoteCarry;
