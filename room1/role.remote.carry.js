var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var MoveToRoomTask = require('./task.move.toroom');
class RoleRemoteCarry {

    constructor() {
        this.pickupStrategy = new PickupStrategy(undefined, (creep)=> {
            let availableCarry = creep.carryCapacity - _.sum(creep.carry);
            return (drop)=> {
                let range = drop.pos.getRangeTo(creep);
                return range < 5 || drop.amount > availableCarry + range;
            };
        });
        this.loadStrategies = [/*this.pickupStrategy,*/
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER),
            this.pickupStrategy = new PickupStrategy(undefined, (creep)=> ((drop)=>drop.amount > 50))
        ];
        this.unloadStrategies = [
            // new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToContainerStrategy(RESOURCE_ENERGY, undefined,
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
        creep.memory.startTrip = creep.memory.startTrip || Game.time; // remember when the trip started, will allow to know when need to come back
        if (creep.memory.action == 'go_remote_room' && !this.goRemoteTask.accepts(creep)) {
            creep.memory.action = this.ACTION_FILL;
            creep.memory.tripTime = Game.time - creep.memory.startTrip;
            delete creep.memory.startTrip;
            util.setCurrentStrategy(creep, null);
            // creep.log('reached remote room',creep.memory.action)
        } else if (creep.memory.action == this.ACTION_FILL && creep.room.name !== creep.memory.homeroom
            && (_.sum(creep.carry) > 0 // full
            || creep.ticksToLive < (50+ creep.memory.tripTime))) { // will die soon, come back unload
            creep.memory.action = 'go_home_room';
            util.setCurrentStrategy(creep, null);
            // creep.log('full', creep.memory.action);
        } else if (creep.memory.action == 'go_home_room' && !this.goHomeTask.accepts(creep)) {
            creep.memory.action = this.ACTION_UNLOAD;
            delete creep.memory.strategy;
            util.setCurrentStrategy(creep, null);
            // creep.log('reached home room', creep.memory.action);
        } else if (creep.memory.action == this.ACTION_UNLOAD && creep.room.name == creep.memory.homeroom && _.sum(creep.carry) == 0) {
            creep.memory.action = 'go_remote_room';
            util.setCurrentStrategy(creep, null);
            // creep.log('empty',creep.memory.action);
        } else if (creep.room.name !== creep.memory.remoteRoom && _.sum(creep.carry) == 0) {
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
                    strategy = this.pickupStragegy;
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
}

module.exports = RoleRemoteCarry;
