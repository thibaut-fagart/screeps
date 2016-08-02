var _ = require('lodash');
var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var DropToEnergyStorage = require('./strategy.drop_to_energyStorage');
var DropToContainerStrategy = require('./strategy.drop_to_container');
class RoleHarvester {
    constructor() {
        this.loadStrategies = [new HarvestEnergySourceToContainerStrategy(RESOURCE_ENERGY), new HarvestEnergySourceStrategy(RESOURCE_ENERGY)];
        this.unloadStrategies = [new DropToEnergyStorage(STRUCTURE_EXTENSION), new DropToEnergyStorage(STRUCTURE_SPAWN),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER), new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE)];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);

    }

    run(creep) {
        let strategy;
        // creep.log(creep.carry.energy, creep.carryCapacity, creep.memory.currentStrategy);
        if (creep.carry.energy == creep.carryCapacity && creep.carryCapacity > 0) {
            strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=> (strat.accepts(creep)));
            }
            // creep.log(util.strategyToLog(strategy));

            if (strategy) {
				util.setCurrentStrategy(creep, strategy);
				// creep.log('strategy ', strategy.constructor.name);
			} else {
				// creep.log('no harvestStrategy');
				return;
			}
        } else {
            strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }
            // creep.log(util.strategyToLog(strategy));
            
            if (strategy) {
				util.setCurrentStrategy(creep, strategy);
				// creep.log('strategy ', strategy.constructor.name);
			} else {
				// creep.log('no harvestStrategy');
				return;
			}
        }
    }
}

module.exports = RoleHarvester;