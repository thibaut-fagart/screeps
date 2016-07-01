var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var DropToEnergyStorage = require('./strategy.drop_to_energyStorage');
var DropToContainerStrategy = require('./strategy.drop_to_container');
class RoleHarvester {
    constructor() {
        this.loadStrategies = [new HarvestEnergySourceToContainerStrategy(), new HarvestEnergySourceStrategy()];
        this.unloadStrategies = [new DropToEnergyStorage(STRUCTURE_EXTENSION), new DropToEnergyStorage(STRUCTURE_SPAWN),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER), new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE)];

    }

    run(creep) {
        let currentstrategy;
        // creep.log(creep.carry.energy, creep.carryCapacity, creep.memory.currentStrategy);
        if (creep.carry.energy == creep.carryCapacity && creep.carryCapacity > 0) {
            // unload
        } else {
            if (creep.memory.currentStrategy) {
                currentstrategy = _.find(((creep.carry.energy == 0) ? this.loadStrategies : this.unloadStrategies), (strat)=> strat.constructor.name == creep.memory.currentStrategy);
                if (currentstrategy && currentstrategy.accepts(creep)) {

                } else {
                    delete creep.memory.currentStrategy;
                    currentstrategy = null;
                }
            } else {
                currentstrategy = _.find(this.loadStrategies, (strat)=> !(null == strat.accepts(creep)));
            }

            if (currentstrategy) {
                creep.memory.currentStrategy = currentstrategy.constructor.name;
            } else {
                creep.log('no harvest');
            }
        }
    }
}

module.exports = new RoleHarvester();