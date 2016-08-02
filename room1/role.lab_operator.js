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
            new PickupStrategy(),
            new LoadFromContainerStrategy((creep)=>(creep.memory.lab_goal&&creep.memory.lab_goal.mineralType), undefined,
                (creep) => {
                    if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_FILL) {
                        return function (s) {
                            if ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_TERMINAL].indexOf(s.structureType) < 0) return false;
                            // creep.log('testing ', s.id, creep.memory.lab_goal.container.id === s.id);
                            return creep.memory.lab_goal && (creep.memory.lab_goal.container === s.id) && creep;
                        };
                    } else if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_UNLOAD) {
                        return function (s) {
                            // if (s.structureType === STRUCTURE_LAB) creep.log('testing ', s.id, creep.memory.lab_goal.lab.id, creep.memory.lab_goal.lab === s.id);
                            return s.structureType === STRUCTURE_LAB && creep.memory.lab_goal && (creep.memory.lab_goal.lab === s.id) && creep;
                        };
                    }
                    return (s)=>false;
                }
            ),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_CONTAINER)
        ];
        this.unloadStrategies = [
            new DropToContainerStrategy(util.ANY_MINERAL, STRUCTURE_LAB,
                (creep) => {
                    if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_FILL) {
                        // creep.log('returning labfill predicate');
                        return function (s) {
                            // creep.log('testing ', creep.memory.lab_goal.lab, s.id, creep.memory.lab_goal && creep.memory.lab_goal.lab === s.id);
                            return creep.memory.lab_goal && creep.memory.lab_goal.lab === s.id;
                        };
                    } else if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_UNLOAD) {
                        return function (s) {
                            // creep.log('testing ', creep.memory.lab_goal.lab, s.id);
                            return creep.memory.lab_goal && creep.memory.lab_goal.container=== s.id;
                        };

                    } else {
                        return (s)=>false;
                    }
                }
            ),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LAB),
            new DropToContainerStrategy(null, STRUCTURE_STORAGE)
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
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
            delete creep.memory[util.CURRENT_STRATEGY];
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
                let notFullLabs = labs.filter((lab)=>lab.mineralAmount < lab.mineralCapacity / 3);
                // creep.log('not full labs', notFullLabs, notFullLabs.map((lab)=>this.expectedMineralType(lab)));

                let goals = notFullLabs.map((lab)=> {
                    let expectedMin = lab.room.expectedMineralType(lab);
                    let goal = {};
                    goal.action = this.ACTION_FILL;
                    goal.lab = lab.id;
                    goal.mineralType = expectedMin;
                    goal.container = lab.room.find(FIND_STRUCTURES, {filter: (s)=>s.store && s.store[expectedMin]}).map((c)=>c.id).find((s)=>s.id !== lab.id);
                    return goal;
                });
                // creep.log('not full labs goals ', JSON.stringify(goals));
                let target = _.sample(goals.filter((o)=>o.container));
                if (!target) {
                    let notEmptyLabs = labs.filter((lab)=>lab.mineralAmount > 2 * lab.mineralCapacity / 3);
                    // creep.log('not full labs', notFullLabs, notFullLabs.map((lab)=>this.expectedMineralType(lab)));

                    goals = notEmptyLabs.map((lab)=> {
                        let expectedMin = lab.room.expectedMineralType(lab);
                        let goal = {};
                        goal.action = this.ACTION_UNLOAD;
                        goal.lab = lab.id;
                        goal.mineralType = expectedMin;
                        goal.container = lab.room.find(FIND_STRUCTURES, {filter: (s)=>s.store && s.store[expectedMin]}).map((c)=>c.id).find((s)=>s.id !== lab.id) || lab.room.storage.id;
                        return goal;
                    });
                    // creep.log('not full labs goals ', JSON.stringify(goals));
                    target = _.sample(goals.filter((o)=>o.container));
                }
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
                // creep.log('no load strategy, clearing current goal');
            }
        }
        else {
            // creep.log('unloading');
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
