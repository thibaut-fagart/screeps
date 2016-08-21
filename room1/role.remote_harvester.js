var _ = require('lodash');
var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var HarvestKeeperEnergySourceToContainerStrategy = require('./strategy.harvest_keepersource_to_container');
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
        this.fleeStrategy = new AvoidRespawnStrategy();

        this.loadStrategies = [
            new HarvestKeeperEnergySourceToContainerStrategy(RESOURCE_ENERGY),
            new HarvestKeeperEnergySourceToContainerStrategy(util.ANY_MINERAL) /*,new RegroupStrategy(COLOR_ORANGE)*/];
        this.unloadStrategies = [new DropToContainerStrategy(RESOURCE_ENERGY), new DropToEnergyStorage()];
        this.goRemoteTask = new MoveToRoomTask(undefined, 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask(undefined, 'remoteRoom', 'homeroom');
        this.regroupStrategy = new RegroupStrategy(COLOR_ORANGE);
        util.indexStrategies(this.loadStrategies);
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
        if (this.fleeStrategy.accepts(creep)) {
            creep.log('fleeing');
            return ;
        }
        if (creep.memory.remoteRoom !== creep.room.name) {
            creep.memory.action = 'go_remote_room';
            if (!this.goRemoteTask.accepts(creep)) {
                // creep.log('goRemote refused', creep.room.name, creep.memory.remoteRoom);
                creep.memory.action = 'load';
            } else {
                // creep.log('goRemote accepted');
            }
            return;
            // console.log("moving to homeExit ", );
        } else {
            creep.memory.action = 'load';
            // creep.log('reached remoteRoom');
        }
        if (creep.memory.action == 'load') {
            // creep.log('finding strategy', this.loadStrategies.length);
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