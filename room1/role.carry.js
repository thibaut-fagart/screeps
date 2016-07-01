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
            new DropToContainerStrategy(RESOURCE_ENERGY,STRUCTURE_LINK),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE )
        ];
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'fill';
        this.CURRENT_STRATEGY='currentStrategy';
    }

    getCurrentStrategy(creep, candidates) {
        let s = creep.memory[this.CURRENT_STRATEGY];
        let strat = _.find(candidates, (strat)=> strat.constructor.name == s);
        if (strat && !strat.accepts(creep))  {
            this.setCurrentStrategy(creep, strat = null);
        }
        return strat;

    }
    setCurrentStrategy(creep, strategy) {
        if (strategy) creep.memory[this.CURRENT_STRATEGY] = strategy.constructor.name;
        else delete creep.memory[this.CURRENT_STRATEGY];
    }


    /** @param {Creep} creep **/
    run(creep) {
        if (creep.carry.energy == 0) {
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
            delete creep.memory.currentStrategy;
            let s = this.getCurrentStrategy(creep, this.loadStrategies);
            if (s) {s.clearMemory(creep);}
            delete creep[this.CURRENT_STRATEGY];
        } else if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.action = this.ACTION_UNLOAD;
            delete creep.memory.action;
            delete creep.memory.currentStrategy;
            let s = this.getCurrentStrategy(creep, this.unloadStrategies);
            if (s) {s.clearMemory(creep);}
            delete creep[this.CURRENT_STRATEGY];
        }
        if (creep.memory.action == this.ACTION_FILL) {
            let strategy = this.getCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                this.setCurrentStrategy(creep, strategy);
            } else {
                creep.log('no loadStrategy');
                return;
            }
        }
        else {
            let strategy = this.getCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                this.setCurrentStrategy(creep, strategy);
            } else {
                creep.log('no unloadStrategy');
                return;
            }
        }
    }

}

module.exports = RoleCarry;
