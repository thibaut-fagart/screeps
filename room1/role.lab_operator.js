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
            new LoadFromContainerStrategy((creep)=>(creep.memory.lab_goal ? creep.memory.lab_goal.mineralType || 'none' : 'none'), undefined,
                (creep) => {
                    if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_FILL) {
                        // creep.log('fill lab predicate');
                        return function (s) {
                            if (creep.memory.lab_goal.container) {
                                return creep.memory.lab_goal.container == s.id;
                            }
                            else if (s.structureType === STRUCTURE_TERMINAL) {
                                return !!creep.memory.lab_goal.lab; // only load from terminal if we intend to load a lab
                            } else if ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LAB].indexOf(s.structureType) < 0) return false;
                            // creep.log('testing ', s.id, creep.memory.lab_goal.container.id === s.id);
                            return !!(creep.memory.lab_goal && (creep.memory.lab_goal.lab !== s.id) );
                        };
                    } else if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_UNLOAD) {
                        // creep.log('unloadlab predicate');
                        return function (s) {
                            // if (s.structureType === STRUCTURE_LAB) creep.log('testing ', s.id, creep.memory.lab_goal.lab.id, creep.memory.lab_goal.lab === s.id);
                            return s.structureType === STRUCTURE_LAB && creep.memory.lab_goal && (creep.memory.lab_goal.lab === s.id) && creep;
                        };
                    }
                    return ()=>false;
                }
            ),
            new LoadFromContainerStrategy((creep)=>(creep.memory.lab_goal ? creep.memory.lab_goal.mineralType : util.ANY_MINERAL), STRUCTURE_CONTAINER),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_TERMINAL, (creep)=>((s)=>s.store && s.store[RESOURCE_ENERGY] > 5000 + creep.carryCapacity)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE,(creep)=>{
                if (creep.memory.lab_goal && creep.memory.lab_goal.mineralType ===RESOURCE_ENERGY) return ()=>true;
                else return ()=>false;
            })
        ];
        this.unloadStrategies = [
            new DropToContainerStrategy((creep)=>(creep.memory && creep.memory.lab_goal && creep.memory.lab_goal.mineralType ? creep.memory.lab_goal.mineralType : 'none'), STRUCTURE_LAB,
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
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LAB, (creep)=>((lab)=>creep.carry && creep.carry.energy)),

            new DropToContainerStrategy(undefined, STRUCTURE_STORAGE)
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
            let s = util.currentStrategy(creep, this.loadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            s = util.currentStrategy(creep, this.unloadStrategies);
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
                                return creep.room.storage.store[min] && creep.room.storage.store[min] > 2000 + creep.carryCapacity // enough stored to spare
                                    && (!creep.room.terminal.store || !creep.room.terminal.store[min] || creep.room.terminal.store[min] < 10000);
                            });
                            // creep.log('trying export', min);
                            if (min) {
                                creep.memory.lab_goal = {
                                    name: 'fillTerminal',
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
                                name: 'unloadLab',
                                action: this.ACTION_UNLOAD,
                                mineralType: labWithIncorrectMin.mineralType,
                                lab: labWithIncorrectMin.id
                            };
                        }
                    },
                    (labs)=> {
                        let notFullLabs = labs.filter((lab)=>lab.mineralAmount < lab.mineralCapacity / 3);
                        // creep.log('not full labs', notFullLabs, notFullLabs.map((lab)=>this.expectedMineralType(lab)));
                        notFullLabs = notFullLabs.filter((lab)=>lab.room.findContainers().filter((s)=>s.id !== lab.id && s.store && s.store[lab.room.expectedMineralType(lab)] > 0).length > 0);

                        let goal = _.sample(notFullLabs.map((lab)=> {
                            let expectedMin = lab.room.expectedMineralType(lab);
                            let goal = {
                                name: 'fillLab',
                                action: this.ACTION_FILL,
                                lab: lab.id,
                                mineralType: expectedMin,
                            };
                            return goal;
                        }));
                        // creep.log('not full labs goals ', JSON.stringify(goals));
                        if (goal) {
                            creep.memory.lab_goal = goal;
                        }
                        // creep.log('goal[2]', JSON.stringify(creep.memory.lab_goal));

                    },
                    (labs)=> {
                        let notEmptyLabs = labs.filter((lab)=>lab.mineralAmount > 2 * lab.mineralCapacity / 3);
                        // creep.log('not full labs', notFullLabs, notFullLabs.map((lab)=>this.expectedMineralType(lab)));

                        let goal = _.sample(notEmptyLabs.map((lab)=> {
                            let goal = {
                                name: 'unloadLab',
                                action: this.ACTION_UNLOAD,
                                lab: lab.id,
                                mineralType: lab.mineralType,
                                container: lab.room.find(FIND_STRUCTURES, {filter: (s)=>!s.runReaction && s.store && s.store[lab.mineralType]}) // do not drop in other labs
                                    .map((c)=>c.id).find((s)=>s.id !== lab.id) || lab.room.storage.id
                            };

                            return goal;
                        }).filter((o)=>o.container));
                        // creep.log('not full labs goals ', JSON.stringify(goals));
                        if (goal) {
                            creep.memory.lab_goal = goal;
                        }
                    },
                    (labs)=> {
                        let missingEnergyLabs = labs.filter((lab)=>lab.energy < lab.energyCapacity);
                        // creep.log('missingEnergyLabs', missingEnergyLabs.length);
                        let goal = _.sample(missingEnergyLabs.map((lab)=> {
                            let goal = {
                                name: 'fillEnergy',
                                action: this.ACTION_FILL,
                                lab: lab.id,
                                mineralType: RESOURCE_ENERGY,
                                container: _.sortBy(lab.room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType !== STRUCTURE_LAB && s.store && s.store[RESOURCE_ENERGY]}), (s)=>-s.store[RESOURCE_ENERGY])
                                    .map((c)=>c.id).find(()=>true) || lab.room.storage.id
                            };
                            return goal;
                        }));
                        // creep.log('not full labs goals ', JSON.stringify(goals));
                        if (goal && goal.container) {
                            creep.memory.lab_goal = goal;
                        }
                    },
                    (labs)=> {
                        if (creep.room.terminal && creep.room.exports && creep.room.exports.length > 0
                            && (!creep.room.terminal.store || !creep.room.terminal.store[RESOURCE_ENERGY] || creep.room.terminal.store[RESOURCE_ENERGY] < 1000)) {
                            let goal = {
                                name: 'fillEnergy',
                                action: this.ACTION_FILL,
                                lab: creep.room.terminal.id,
                                mineralType: RESOURCE_ENERGY,
                                container: _.sortBy(creep.room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType !== STRUCTURE_LAB && s.store && s.store[RESOURCE_ENERGY]}), (s)=>-s.store[RESOURCE_ENERGY])
                                    .map((c)=>c.id).find(()=>true) || creep.room.storage.id
                            };
                            if (goal && goal.container) {
                                creep.memory.lab_goal = goal;
                            }
                        }

                    }

                ];
                for (let i = 0, max = goalFinders.length; i < max && !creep.memory.lab_goal; i++) {
                    // creep.log('finding goal', i);
                    goalFinders[i](labs);
                }
            } else if (!this.isGoalValid(creep, creep.memory.lab_goal)) {
                delete creep.memory.lab_goal;
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

    isGoalValid(creep, lab_goal) {
        let valid = false;
        if (lab_goal && lab_goal.name) {
            let lab = Game.getObjectById(lab_goal.lab);
            switch (lab_goal.name) {
                case 'fillTerminal':
                    valid = true;
                    break;
                case 'unloadLab':
                    valid = lab.mineralAmount > 0 && lab.mineralType === lab_goal.mineralType;
                    break;
                case 'fillLab':
                    valid = lab.mineralAmount < lab.mineralCapacity && lab.mineralType === lab_goal.mineralType;
                    break;
                case 'fillEnergy':
                    valid = lab.energy < lab.energyCapacity;
                    break;
                default:
                    break;
            }
        }
        return valid;
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
