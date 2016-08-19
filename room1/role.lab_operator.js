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
            new LoadFromContainerStrategy((creep)=>(creep.memory.lab_goal && creep.memory.lab_goal.mineralType), undefined,
                (creep) => {
                    if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_FILL) {
                        return function (s) {
                            if (s.structureType === STRUCTURE_TERMINAL) {
                                return !!creep.memory.lab_goal.lab; // only load from terminal if we intend to load a lab
                            } else if ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LAB].indexOf(s.structureType) < 0) return false;
                            // creep.log('testing ', s.id, creep.memory.lab_goal.container.id === s.id);
                            return !!(creep.memory.lab_goal && creep.memory.lab_goal.lab !== s.id );
                        };
                    } else if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_UNLOAD) {
                        return function (s) {
                            // if (s.structureType === STRUCTURE_LAB) creep.log('testing ', s.id, creep.memory.lab_goal.lab.id, creep.memory.lab_goal.lab === s.id);
                            return s.structureType === STRUCTURE_LAB && creep.memory.lab_goal && (creep.memory.lab_goal.lab === s.id) && creep;
                        };
                    }
                    return ()=>false;
                }
            ),
            // new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            // new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_CONTAINER)
        ];
        this.unloadStrategies = [
            new DropToContainerStrategy(util.ANY_MINERAL, STRUCTURE_LAB,
                (creep) => {
                    // creep.log('goal', creep.memory.lab_goal? creep.memory.lab_goal.action: 'none');
                    if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_FILL) {
                        // creep.log('returning labfill predicate');
                        return function (s) {
                            // creep.log('testing ', creep.memory.lab_goal.lab, s.id, creep.memory.lab_goal && creep.memory.lab_goal.lab === s.id);
                            return creep.memory.lab_goal && creep.memory.lab_goal.lab === s.id;
                        };
                    } else if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_UNLOAD) {
                        return function (s) {
                            // creep.log('testing ', creep.memory.lab_goal.lab, s.id);
                            return creep.memory.lab_goal && creep.memory.lab_goal.container === s.id;
                        };

                    } else {
                        return ()=>false;
                    }
                }
            ),
            new DropToContainerStrategy(util.ANY_MINERAL, STRUCTURE_TERMINAL,
                (creep) => {
                    // creep.log('goal', creep.memory.lab_goal? creep.memory.lab_goal.action: 'none');
                    if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_FILL && !creep.memory.lab_goal.lab && creep.carry[creep.memory.lab_goal.mineralType] > 0) {
                        return ()=>true;
                    } else {
                        return ()=>false;
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
                // export minerals go to terminal

                // labs with bad min
                // fill almost empty labs
                // unload almost full labs
                // fill lab energy
                let labs = creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LAB}});
                // creep.log('room labs', labs, labs.map((lab)=>this.expectedMineralType(lab)));
                let goalFinders = [
                    (labs)=> {
                        if (creep.room.memory.exports && creep.room.storage && creep.room.storage.store && creep.room.terminal) {
                            // creep.log('seeking exports', JSON.stringify(creep.room.memory.exports), JSON.stringify(creep.room.storage.store));
                            let min = creep.room.memory.exports.find((min)=> {
                                // creep.log('testing', min, creep.room.storage.store[min], (!creep.room.terminal.store || ! creep.room.terminal.store[min] ||creep.room.terminal.store[min]<10000));
                                return creep.room.storage.store[min] && creep.room.storage.store[min] > 5000 + creep.carryCapacity // enough stored to spare
                                    && (!creep.room.terminal.store || !creep.room.terminal.store[min] || creep.room.terminal.store[min] < 10000);
                            });
                            // creep.log('trying export', min);
                            if (min) {
                                creep.memory.lab_goal = {
                                    action: this.ACTION_FILL,
                                    mineralType: min,
                                };
                            }
                        }
                    },
                    (labs)=> {
                        let labWithIncorrectMin = labs.find((lab)=>lab.mineralType && lab.mineralType !== lab.room.expectedMineralType(lab));
                        if (labWithIncorrectMin) {
                            creep.memory.lab_goal = {
                                action: this.ACTION_UNLOAD,
                                mineralType: labWithIncorrectMin.mineralType,
                                lab: labWithIncorrectMin.id
                            };
                        }
                    },
                    (labs)=> {
                        let notFullLabs = labs.filter((lab)=>lab.mineralAmount < lab.mineralCapacity / 3);
                        // creep.log('not full labs', notFullLabs, notFullLabs.map((lab)=>this.expectedMineralType(lab)));

                        let goal = _.sample(notFullLabs
                            .filter((lab)=>lab.room.findContainers().filter((s)=>s.id !== lab.id && s.store && s.store[lab.room.expectedMineralType(lab)] > 0))
                            .map((lab)=> {
                                let expectedMin = lab.room.expectedMineralType(lab);
                                let goal = {};
                                goal.action = this.ACTION_FILL;
                                goal.lab = lab.id;
                                goal.mineralType = expectedMin;
                                return goal;
                            }));
                        // creep.log('not full labs goals ', JSON.stringify(goals));
                        if (goal) {
                            creep.memory.lab_goal = goal;
                        }

                    },
                    (labs)=> {
                        let notEmptyLabs = labs.filter((lab)=>lab.mineralAmount > 2 * lab.mineralCapacity / 3);
                        // creep.log('not full labs', notFullLabs, notFullLabs.map((lab)=>this.expectedMineralType(lab)));

                        let goal = _.sample(notEmptyLabs.map((lab)=> {
                            let expectedMin = lab.room.expectedMineralType(lab);
                            let goal = {};
                            goal.action = this.ACTION_UNLOAD;
                            goal.lab = lab.id;
                            goal.mineralType = expectedMin;
                            goal.container = lab.room.find(FIND_STRUCTURES, {filter: (s)=>s.store && s.store[expectedMin]}).map((c)=>c.id).find((s)=>s.id !== lab.id) || lab.room.storage.id;
                            return goal;
                        }).filter((o)=>o.container));
                        // creep.log('not full labs goals ', JSON.stringify(goals));
                        if (goal) {
                            creep.memory.lab_goal = goal;
                        }
                    },
                    (labs)=> {
                        let missingEnergyLabs = labs.filter((lab)=>lab.energy < lab.energyCapacity);
                        let goal = _.sample(missingEnergyLabs.map((lab)=> {
                            let goal = {};
                            goal.action = this.ACTION_FILL;
                            goal.lab = lab.id;
                            goal.mineralType = RESOURCE_ENERGY;
                            goal.container = lab.room.find(FIND_STRUCTURES, {filter: (s)=>s.store && s.store[RESOURCE_ENERGY]}).map((c)=>c.id).find((s)=>s.id !== lab.id) || lab.room.storage.id;
                            return goal;
                        }));
                        // creep.log('not full labs goals ', JSON.stringify(goals));
                        if (goal && goal.container) {
                            creep.memory.lab_goal = goal;
                        }
                    },
                ];
                for (let i = 0, max = goalFinders.length; i < max && !creep.memory.lab_goal; i++) {
                    goalFinders[i](labs);
                }

                strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
                if (!strategy) {
                    strategy = _.find(this.loadStrategies, (strat)=>(strat.accepts(creep)));
                }
                if (strategy) {
                    util.setCurrentStrategy(creep, strategy);
                } else {
                    delete creep.memory.lab_goal;
                    // creep.log('no load strategy, clearing current goal');
                }
            }
        } else {
            if (creep.memory.lab_goal && creep.carry && !creep.carry[creep.memory.lab_goal.mineralType]) {
                delete creep.memory.lab_goal;
            }
// creep.log('unloading');
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>(strat.accepts(creep)));
            }
// creep.log(util.strategyToLog(strategy));
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            }
            delete creep.memory['unload_container'];
        }
    }
}
function reverseReactions() {
    'use strict';
    let result = {};
    _.keys(REACTIONS).forEach((min1)=> {
        let temp = REACTIONS[min1];
        _.keys(temp).forEach((min2)=> {
            result[temp[min2]] = [min1, min2];
        });
    });
    return result;
}

RoleLabOperator.reactions = reverseReactions();
module.exports = RoleLabOperator;
