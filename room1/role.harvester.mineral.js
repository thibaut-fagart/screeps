var _ = require('lodash');
var util = require('./util');
var HarvestSourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var DropToContainerStrategy = require('./strategy.drop_to_container');
class RoleMineralHarvester {
    constructor() {
        this.loadStrategies = [new HarvestSourceToContainerStrategy({resourceType: util.ANY_MINERAL, nooverflow:true})];
        this.unloadStrategies = [new DropToContainerStrategy(STRUCTURE_STORAGE)];

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

module.exports = RoleMineralHarvester;