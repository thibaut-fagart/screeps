var _ = require('lodash');
var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var HarvestKeeperEnergySourceToContainerStrategy = require('./strategy.harvest_keepersource_to_container');
var PickupStrategy = require('./strategy.pickup');
var DropToEnergyStorage = require('./strategy.drop_to_energyStorage');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var MoveToRoomTask = require('./task.move.toroom');
var RegroupStrategy = require('./strategy.regroup');
var BuildStrategy = require('./strategy.build');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');

class RoleRemoteHarvester {
    constructor() {
        this.buildStrategy = new BuildStrategy((creep)=>((cs)=> {
            let source = util.objectFromMemory(creep.memory, 'source');
            let build = true && source && source.pos.getRangeTo(cs) == 1;
            if (build) {
                creep.log('building my container', JSON.stringify(cs));
            }
            return build;

        }));
        this.fleeStrategy = new AvoidRespawnStrategy(-1);

        this.loadStrategies = [
            new HarvestKeeperEnergySourceToContainerStrategy(RESOURCE_ENERGY),
            new PickupStrategy(RESOURCE_ENERGY, (creep)=> {
                return (drop)=> drop.pos.getRangeTo(creep) === 0
            }),
            new HarvestEnergySourceStrategy() /*,new RegroupStrategy(COLOR_ORANGE)*/];
        this.unloadStrategies = [new DropToContainerStrategy(RESOURCE_ENERGY), new DropToEnergyStorage()];
        this.goRemoteTask = new MoveToRoomTask(undefined, 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask(undefined, 'remoteRoom', 'homeroom');
        this.regroupStrategy = new RegroupStrategy(COLOR_ORANGE);
    }

    /*
     requires : remoteRoom=creep.room.remoteMining, homeroom = creep.room.name, homeroom, remoteSource
     */
    resign(creep) {
        creep.log('resigning');
        delete creep.memory.role;
        delete creep.memory.action; //{go_remote_room, load, go_home, unload}
        delete creep.memory.remoteRoom;
        delete creep.memory.homeroom;
        delete creep.memory.remoteSource;
    }

    init(creep) {
        creep.memory.action = 'go_remote_room';
        creep.memory.homeroom = creep.room.name;
        creep.memory.remoteMining = creep.memory.remoteMining || _.isString(creep.room.memory.remoteMining) ? creep.room.memory.remoteMining : creep.room.memory.remoteMining[0];
        if (!creep.memory.remoteRoom && creep.room.memory.remoteMining) {
            creep.memory.remoteRoom = _.isString(creep.room.memory.remoteMining) ? creep.room.memory.remoteMining : creep.room.memory.remoteMining[0];
        }

    }

    findRemoteExit(creep) {
        return util.findExit(creep, creep.memory.homeroom);
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
        if (creep.memory.action !== 'go_remote_room' && creep.room.name !== creep.memory.remoteRoom) {
            creep.memory.action = 'go_remote_room';
        } else if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.remoteRoom) {
            creep.memory.action = 'load';
            // creep.log('reached remote room',creep.memory.action)
        } else if (creep.memory.action == 'load' && creep.carry.energy == creep.carryCapacity && creep.carryCapacity > 0
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
        if (creep.memory.action == 'go_remote_room') {
            if (!this.goRemoteTask.accepts(creep)) {
                creep.memory.action = 'load';
            }
            // console.log("moving to homeExit ", );
        } else if (creep.memory.action == 'go_home_room') {
            if (!this.goHomeTask.accepts(creep)) {
                creep.memory.action = 'unload';
            }

            // console.log("moving to remoteExit ", );
        }
        if (this.fleeStrategy.accepts(creep)) return ;
        if (creep.memory.action == 'load') {
            if (/*!this.buildStrategy.accepts(creep)*/true) {
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
                    this.regroupStrategy.accepts(creep);
                    return;
                }
            }
        } else if (creep.memory.action == 'unload') {
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