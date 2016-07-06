var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');

class RoleCarry {
    constructor() {
        this.loadStrategies = [new PickupStrategy(RESOURCE_ENERGY),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER)];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToContainerStrategy(RESOURCE_ENERGY,STRUCTURE_LINK),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE )
        ];
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'fill';
    }


    /** @param {Creep} creep **/
    run(creep) {
        if (creep.carry.energy == 0) {
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
            delete creep.memory.currentStrategy;
            let s = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (s) {s.clearMemory(creep);}
            util.setCurrentStrategy(creep, null);
        } else if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.action = this.ACTION_UNLOAD;
            delete creep.memory.action;
            delete creep.memory.currentStrategy;
            let s = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (s) {s.clearMemory(creep);}
            util.setCurrentStrategy(creep, null);
        }
        if (creep.memory.action == this.ACTION_FILL) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                creep.log('no loadStrategy');
                return;
            }
        }
        else {
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

module.exports = RoleCarry;
