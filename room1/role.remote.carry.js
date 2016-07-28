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
        this.pickupStrategy = new PickupStrategy(undefined, (creep)=> {
            let availableCarry = creep.carryCapacity - _.sum(creep.carry);
            return (drop)=> {
                let range = drop.pos.getRangeTo(creep);
                return range < 5 || drop.amount > availableCarry + range;
            };
        });
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER),
            new PickupStrategy(undefined, (creep)=> ((drop)=>drop.amount > 50)),
            new RegroupStrategy(COLOR_ORANGE)
        ];
        this.unloadStrategies = [
            // new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToContainerStrategy(undefined, undefined,
                (creep)=>((s)=>([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK].indexOf(s.structureType) >= 0))),
            new DropToEnergyStorageStrategy()
        ];
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
        this.repairAround(creep);
        this.buildAround(creep);
        creep.memory.startTrip = creep.memory.startTrip || Game.time; // remember when the trip started, will allow to know when need to come back
        if (creep.memory.action == 'go_remote_room') {
            this.travelingPickup.accepts(creep);
            if (!this.goRemoteTask.accepts(creep)) {
                creep.memory.action = this.ACTION_FILL;
                creep.memory.tripTime = Game.time - creep.memory.startTrip;
                delete creep.memory.startTrip;
                util.setCurrentStrategy(creep, null);
                // creep.log('reached remote room',creep.memory.action) 
            }
        } else if (creep.memory.action == this.ACTION_FILL && creep.room.name !== creep.memory.homeroom &&
            (_.sum(creep.carry) > 0 // full
            && creep.ticksToLive < (50 + creep.memory.tripTime))) { // will die soon, come back unload
            creep.log('going home', creep.ticksToLive);
            creep.memory.action = 'go_home_room';
            util.setCurrentStrategy(creep, null);
            // creep.log('full', creep.memory.action);
        } else if (creep.memory.action == 'go_home_room') {
            if (!this.goHomeTask.accepts(creep)) {
                creep.memory.carry = creep.carry;
                creep.memory.action = this.ACTION_UNLOAD;
                delete creep.memory.strategy;
                util.setCurrentStrategy(creep, null);
                // creep.log('reached home room', creep.memory.action);
            }
        } else if (_.sum(creep.carry) == 0 && creep.memory.action !== 'go_remote_room' && creep.room.name !== creep.memory.remoteRoom) {
            creep.log('empty, go remote');
            if (creep.memory.carry) {
                creep.room.memory.efficiency = creep.room.memory.efficiency || {};
                creep.room.memory.efficiency.remoteMining = creep.room.memory.efficiency.remoteMining || {};
                creep.room.memory.efficiency.remoteMining[creep.memory.remoteRoom] = (creep.room.memory.efficiency.remoteMining[creep.memory.remoteRoom] || 0) + _.sum(creep.memory.carry);
                delete creep.memory.carry;
            }
            creep.memory.action = 'go_remote_room';
            util.setCurrentStrategy(creep, null);
        } else if (creep.room.name === creep.memory.remoteRoom && _.sum(creep.carry) == creep.carryCapacity) {
            creep.memory.action = 'go_home_room';
            util.setCurrentStrategy(creep, null);
        }


        if (creep.memory.action == this.ACTION_FILL && creep.memory.remoteRoom == creep.room.name) {
            let strategy;
            if (!this.avoidThreadStrategy.accepts(creep)) {

                if (!this.pickupStrategy.accepts(creep)) {
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

    repairAround(creep) {
        let range = 3;
        let structures = creep.room.lookForAtArea(LOOK_STRUCTURES, Math.max(0,creep.pos.y - range), Math.max(0,creep.pos.x - range),
            Math.min(creep.pos.y + range,49), Math.min(49,creep.pos.x + range), true);
        let needRepair = structures.filter((s)=>s.hits < s.hitsMax && s.ticksToDecay);
        if (needRepair.length) {
            creep.log('repairing');
            creep.repair(needRepair[0]);
        }
    }
    buildAround(creep) {
        let range = 3;
        let sites = creep.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, Math.max(0,creep.pos.y - range), Math.max(0,creep.pos.x - range),
            Math.min(creep.pos.y + range,49), Math.min(49,creep.pos.x + range), true);
        if (sites && sites.length) {
            // creep.log('building', JSON.stringify(sites[0]));
            creep.build(sites[0]);

        }
    }
}

module.exports = RoleRemoteCarry;
