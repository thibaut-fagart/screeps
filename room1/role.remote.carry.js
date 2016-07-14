var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');

class RoleRemoteCarry {

    constructor() {
        this.pickupStrategy = new PickupStrategy(/*RESOURCE_ENERGY*/);
        this.loadStrategies = [this.pickupStrategy,
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER)];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(),
            new DropToContainerStrategy(RESOURCE_ENERGY)
        ];
        this.avoidThreadStrategy = new AvoidRespawnStrategy();
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'load';
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
            creep.memory.remoteRoom = creep.room.memory.remoteMining;
        }
    }

    findHomeExit(creep) {
        return util.findExit(creep, creep.room.memory.remoteMining, 'homeExit');
    }

    findRemoteExit(creep) {
        return util.findExit(creep, creep.memory.homeroom, 'remoteExit');
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
        if (creep.memory.action == 'go_remote_room' && creep.room.name != creep.memory.homeroom) {
            creep.memory.action = this.ACTION_FILL;
            util.setCurrentStrategy(creep, null);
            // creep.log('reached remote room',creep.memory.action)
        } else if (creep.memory.action == this.ACTION_FILL && creep.carry.energy == creep.carryCapacity || creep.ticksToLive < 150) {
            creep.memory.action = 'go_home_room';
            util.setCurrentStrategy(creep, null);
            // creep.log('full', creep.memory.action);
        } else if (creep.memory.action == 'go_home_room' && creep.room.name == creep.memory.homeroom) {
            creep.memory.action = this.ACTION_UNLOAD;
            util.setCurrentStrategy(creep, null);
            // creep.log('reached home room', creep.memory.action);
        } else if (creep.memory.action == this.ACTION_UNLOAD && creep.room.name == creep.memory.homeroom && creep.carry.energy == 0) {
            creep.memory.action = 'go_remote_room';
            util.setCurrentStrategy(creep, null);
            // creep.log('empty',creep.memory.action);
        } else if (creep.room.name !== creep.memory.homeroom && _.sum(creep.carry) == creep.carryCapacity) {
            creep.memory.action = 'go_home_room';
            util.setCurrentStrategy(creep, null);
        }

        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.homeroom) {
            if (!creep.memory.remoteRoom) {
                // creep.log("no remoteroom");
                this.resign(creep);
            } else {
                var exit = this.findHomeExit(creep);
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                // console.log("moving to homeExit ", );
            }
        } else if (creep.memory.action == this.ACTION_FILL && creep.memory.remoteRoom == creep.room.name) {
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

        } else if (creep.memory.action == 'go_home_room' && creep.room.name != creep.memory.homeroom) {
            var exit = this.findRemoteExit(creep);
            if (exit) {
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
            } else {
                creep.log("no exit ?", creep.pos);
            }

            // console.log("moving to remoteExit ", );
        }
        else if (creep.memory.action == this.ACTION_UNLOAD) {
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
