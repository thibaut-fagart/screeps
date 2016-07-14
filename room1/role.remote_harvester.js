var _ = require('lodash');
var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var PickupStrategy = require('./strategy.pickup');
var DropToEnergyStorage = require('./strategy.drop_to_energyStorage');
var DropToContainerStrategy = require('./strategy.drop_to_container');

class RoleRemoteHarvester {
    constructor() {
        this.loadStrategies = [new HarvestEnergySourceToContainerStrategy(RESOURCE_ENERGY), new PickupStrategy(RESOURCE_ENERGY), new HarvestEnergySourceStrategy()];
        this.unloadStrategies = [new DropToContainerStrategy(RESOURCE_ENERGY), new DropToEnergyStorage()];
    }
    /*
    requires : remoteRoom=creep.room.remoteMining, homeroom = creep.room.name, homeroom, remoteSource
     */
    resign(creep) {
        creep.log("resigning");
        delete creep.memory.role;
        delete creep.memory.action; //{go_remote_room, load, go_home, unload}
        delete creep.memory.remoteRoom;
        delete creep.memory.homeroom;
        delete creep.memory.remoteSource;
    }
    init (creep) {
        creep.memory.action = 'go_remote_room';
        creep.memory.homeroom = creep.room.name;
        creep.memory.remoteMining = creep.room.memory.remoteMining;
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
    run (creep) {
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
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.remoteRoom) {
            creep.memory.action = 'load';
            // creep.log('reached remote room',creep.memory.action)
        } else if (creep.memory.action == 'load' && creep.carry.energy == creep.carryCapacity && creep.carryCapacity>0
                && !_.find(creep.pos.lookFor(LOOK_STRUCTURES), (s)=>s.structureType === STRUCTURE_CONTAINER)) {
            
            // creep.memory.action = 'go_home_room';
            // creep.log('full', creep.memory.action);
        } else if (creep.memory.action == 'go_home_room' && creep.room.name == creep.memory.homeroom) {
            creep.memory.action = 'unload';
            // creep.log('reached home room', creep.memory.action);
        } else if (creep.memory.action == 'unload' && creep.room.name == creep.memory.homeroom && creep.carry.energy == 0) {
            creep.memory.action = 'go_remote_room';
            // creep.log('empty',creep.memory.action);
        } else {
            // creep.log(JSON.stringify(creep.memory));
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.homeroom) {
            if (!creep.room.memory.remoteMining) {
                creep.log("no remoteMining room");
                this.resign(creep);
            } else {
                var exit = this.findHomeExit(creep);
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                // console.log("moving to homeExit ", );
            }
        }

        if (creep.memory.action == 'load' && creep.memory.remoteRoom == creep.room.name) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            // creep.log('previousStrategy',util.strategyToLog(strategy));
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=>strat.accepts(creep));
                // creep.log('newStrategy',util.strategyToLog(strategy));
            }
            if (strategy) {
                // creep.log('strategy', strategy.constructor.name);
                util.setCurrentStrategy(creep, strategy);
            } else {
                // creep.log('no loadStrategy');
                return;
            }
        }
        if (creep.memory.action == 'go_home_room' && creep.room.name != creep.memory.homeroom) {
            var exit = this.findRemoteExit(creep);
            if (exit) {
                creep.moveTo(exit.x, exit.y,{reusePath: 50});
            } else {
                creep.log("no exit ?", creep.pos);
            }

            // console.log("moving to remoteExit ", );
        }
        if (creep.memory.action == 'unload' && creep.room.name == creep.memory.homeroom) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                creep.log('no unloadStrategy');
                return;
            }
        }
    }

}

module.exports = RoleRemoteHarvester;