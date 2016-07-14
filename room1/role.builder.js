var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var BuildStrategy = require('./strategy.build');


class RoleBuilder {
    constructor() {
        this.loadStrategies = [
            new PickupStrategy(RESOURCE_ENERGY),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER),
            new HarvestEnergySourceStrategy()];
        this.buildStrategy = new BuildStrategy();
        this.BUILD_TARGET = 'buildtarget';
    }

    resign(creep) {
        creep.log('resigning ');
        creep.memory.role = 'upgrader';
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

    /** @param {Creep} creep **/
    run(creep) {
        if (creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
        }
        if (!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
            creep.memory.building = true;
            delete creep.memory.source;
        }

        if (creep.memory.building) {
            if (!this.buildStrategy.accepts(creep)) {
                this.resign(creep);
            }
/*            var target = this.findTarget(creep);
            // creep.log('building',target);
            if (!target) {
                creep.log('target null');
                delete creep.memory[this.BUILD_TARGET];
                this.resign(creep);
            } else {
                let build = creep.build(target);
                if (build == ERR_NOT_IN_RANGE) {
                    let moveTo = creep.moveTo(target);
                    if (moveTo !== OK && moveTo !== ERR_TIRED) {
                        creep.log('moveTo?', build);
                    }
                } else if (build === ERR_INVALID_TARGET) {
                    delete creep.memory[this.BUILD_TARGET];
                } else if (build !== OK) {
                    creep.log('build?', build);
                }
                if (target.progress == target.progressTotal) {
                    creep.log('build complete', target.name);
                    delete creep.memory[this.BUILD_TARGET];
                }
            }*/
        }
        else {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);

            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            } else {
                creep.log('no loadStrategy');
            }
        }
    }
}

module.exports = RoleBuilder;