var _ = require('lodash');
var util = require('./util');
var DismantleStrategy = require('./strategy.dismantle');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');


class RoleDismantler {
    constructor() {
        this.loadStrategies = [new DismantleStrategy()];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
            // new DropToContainerStrategy(RESOURCE_ENERGY,STRUCTURE_LINK),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> {
                return ((s)=>s.room.isHarvestContainer(s));
            })];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }
    resign(creep) {
        creep.log('resigning ?');
        // creep.memory.role = 'upgrader';
    }

    /*
     findTarget(creep) {
     var target = util.objectFromMemory(this.BUILD_TARGET);
     if (!target) {
     // console.log("finding target for  ", creep.name);
     var targets = creep.room.find(FIND_CONSTRUCTION_SITES).sort((c)=> -(c.progress / c.progressTotal));
     if (targets.length) {
     target = targets[0];

     creep.memory[this.BUILD_TARGET] = target.id;
     }
     }
     return target;
     }
     */

    onNoLoadStrategy(creep) {

    }

    /** @param {Creep} creep **/
    run(creep) {
        if (creep.memory.dismantling && _.sum(creep.carry) == creep.carryCapacity) {
            creep.memory.dismantling = false;
            util.setCurrentStrategy(creep, null);
        }
        if (!creep.memory.dismantling && _.sum(creep.carry) ===0 ) {
            creep.memory.dismantling = true;
            util.setCurrentStrategy(creep, null);
        }

        if (creep.memory.dismantling) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);

            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            } else {
                this.onNoLoadStrategy(creep);
                // creep.log('no loadStrategy');
            }
        } else {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);

            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=> (strat.accepts(creep)));
            }

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            }
        }
    }
}

module.exports = RoleDismantler;