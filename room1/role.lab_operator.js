var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');

/**
 * searches for labs missing resources
 */
class RoleLabOperator {
    constructor() {
        this.loadStrategies = [
            new PickupStrategy(util.ANY_MINERAL),
            new LoadFromContainerStrategy((creep)=>creep.memory.lab_goal.mineralType, undefined,
                (creep) => {
                    return function (s) {
                        if ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_TERMINAL].indexOf(s.structureType) < 0) return false;
                        // creep.log('testing ', s.id, creep.memory.lab_goal.container.id === s.id);
                        return creep.memory.lab_goal && (creep.memory.lab_goal.container === s.id) && creep;
                    };
                }
            ),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE)
        ];
        this.unloadStrategies = [
            new DropToContainerStrategy(util.ANY_MINERAL, STRUCTURE_LAB,
                (creep) => {
                    return function (s) {
                        // creep.log('testing ', creep.memory.lab_goal.lab, s.id);
                        return creep.memory.lab_goal && creep.memory.lab_goal.lab === s.id;
                    };
                }
            ),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LAB),
            new DropToContainerStrategy(null, STRUCTURE_STORAGE)
        ];
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'fill';
    }


    /** @param {Creep} creep **/
    run(creep) {
        let strategy;
        if (_.sum(creep.carry) == 0 && creep.memory.action !== this.ACTION_FILL) {
            // creep.log('reloading');
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
            delete creep.memory.lab_goal;
            delete creep.memory.currentStrategy;
            let s = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
        } else if (_.sum(creep.carry) == creep.carryCapacity && creep.memory.action !== this.ACTION_UNLOAD) {
            // creep.log('unloading');
            creep.memory.action = this.ACTION_UNLOAD;
            delete creep.memory.currentStrategy;
            let s = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
        }
        if (creep.memory.action == this.ACTION_FILL) {
            if (!creep.memory.lab_goal) {
                let labs = creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LAB}});
                // creep.log('room labs', labs, labs.map((lab)=>this.expectedMineralType(lab)));
                let notFullLabs = labs.filter((lab)=>lab.mineralAmount < lab.mineralCapacity);
                // creep.log('not full labs', notFullLabs, notFullLabs.map((lab)=>this.expectedMineralType(lab)));

                let goals = notFullLabs.map((lab)=> {
                    let expectedMin = lab.room.expectedMineralType(lab);
                    let goal = {};
                    goal.lab = lab.id;
                    goal.mineralType = expectedMin;
                    goal.container = lab.room.find(FIND_STRUCTURES, {filter: (s)=>s.store && s.store[expectedMin]}).map((c)=>c.id).find((s)=>s.id !== lab.id);
                    return goal;
                });
                // creep.log('not full labs goals ', JSON.stringify(goals));
                let target = _.sample(goals.filter((o)=>o.container));
                creep.memory.lab_goal = target;
                // creep.log('chosen goal', JSON.stringify(creep.memory.lab_goal));
            }

            strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                delete creep.memory.lab_goal;
                creep.log('no load strategy, clearing current goal');
            }
        }
        else {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            // creep.log(util.strategyToLog(strategy));
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            }
            delete creep.memory['unload_container'];
        }
    }

    expectedMineralType(lab) {
        return lab.room.expectedMineralType(lab);
    }

    findLabWith(creep, resource) {
        return creep.room.findLabWith(resource);
    }
}
RoleLabOperator.reactions = {
    'UH': ['U', 'H']
};
module.exports = RoleLabOperator;
