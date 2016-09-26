var _ = require('lodash');
var util = require('./util');
var HarvestSourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var DropToContainerStrategy = require('./strategy.drop_to_container');
class RoleMineralHarvester {
    constructor() {
        this.loadStrategies = [new HarvestSourceToContainerStrategy({resourceType: util.ANY_MINERAL, nooverflow:true})];
        this.unloadStrategies = [new DropToContainerStrategy(STRUCTURE_STORAGE)];
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
            let container = creep.pos.lookFor(LOOK_STRUCTURES).find(s=>s.structureType === STRUCTURE_CONTAINER);
            if (container && container.storeCapacity - _.sum(container.store) < 100) {
                return;
            }

            let drops = creep.pos.lookFor(LOOK_RESOURCES);
            // creep.log('drop', JSON.stringify(drops));
            if (drops && drops.length && _.sum(drops, d=>d.amount)>=2000) {
                return;
            }
            strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
                if (!strategy) {
                    this.onNoLoadStrategy(creep);
                }
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
    onNoLoadStrategy(creep) {
        Game.notify(`${Game.time} ${creep.room.name} ${creep.name} resigning, mineral depleted`);
        creep.log('resigning, mineral depleted');
        creep.memory.role = 'recycle';
    }
}
require('./profiler').registerClass(RoleMineralHarvester, 'RoleMineralHarvester');

module.exports = RoleMineralHarvester;