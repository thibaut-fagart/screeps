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
        this.noGoalLoadStrategies = [
            new PickupStrategy(util.ANY_MINERAL),
            new LoadFromContainerStrategy(util.ANY_MINERAL, STRUCTURE_CONTAINER,(creep)=>((s)=>s.structureType === STRUCTURE_CONTAINER && s.store && (_.sum(s.store)-(s.store.energy||0)>creep.carryCapacity/2) )),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_TERMINAL, (creep)=>((s)=>s.structureType === STRUCTURE_TERMINAL && s.store && s.store[RESOURCE_ENERGY] > this.TERMINAL_ENERGY_TARGET + creep.carryCapacity)),

        ];
        this.loadStrategies = [
            new LoadFromContainerStrategy((creep)=>creep.memory.lab_goal.mineralType || 'none', undefined,
                (creep) => {
                    if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_FILL) {
                        // creep.log('fill lab predicate');
                        return function (s) {
                            if (creep.memory.lab_goal.container) {
                                return creep.memory.lab_goal.container == s.id;
                            } else if (s.structureType === STRUCTURE_TERMINAL) {
                                // creep.log('testing terminal', !!creep.memory.lab_goal.lab && (!creep.room.memory.exports || creep.room.memory.exports.indexOf(creep.memory.lab_goal.mineralType) < 0));
                                return !!creep.memory.lab_goal.lab && (!creep.room.memory.exports || creep.room.memory.exports.indexOf(creep.memory.lab_goal.mineralType) < 0); // only load from terminal if we intend to load a lab
                            } else if ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LAB].indexOf(s.structureType) < 0) {
                                return false;
                            }
                            // creep.log('testing ', s, (s.store && s.store[creep.memory.lab_goal.mineralType]));
                            return !!(creep.memory.lab_goal && (creep.memory.lab_goal.lab !== s.id) && (s.structureType !== STRUCTURE_LAB || s.mineralType === creep.memory.lab_goal.mineralType && creep.memory.lab_goal.mineralAmount > 0));
                        };
                    } else if (creep.memory.lab_goal && creep.memory.lab_goal.action == this.ACTION_UNLOAD) {
                        // creep.log('unloadlab predicate');
                        return function (s) {
                            // if (s.structureType === STRUCTURE_LAB) creep.log('testing ', s.id, creep.memory.lab_goal.lab.id, creep.memory.lab_goal.lab === s.id);
                            return s.structureType === STRUCTURE_LAB && creep.memory.lab_goal && (creep.memory.lab_goal.lab === s.id);
                        };
                    }
                    return ()=>false;
                }
            ),
            new LoadFromContainerStrategy((creep)=>creep.memory.lab_goal.mineralType, STRUCTURE_CONTAINER),
            new LoadFromContainerStrategy((creep)=>creep.memory.lab_goal.mineralType || 'none', STRUCTURE_TERMINAL, (creep)=>((s)=>creep.memory.lab_goal && s.store && s.store[creep.memory.lab_goal.mineralType])),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE, (creep)=> {
                if (creep.memory.lab_goal && creep.memory.lab_goal.mineralType === RESOURCE_ENERGY) return ()=>true;
                else return ()=>false;
            }),
            new PickupStrategy()
        ];
        this.unloadStrategies = [
            new DropToContainerStrategy((creep)=>(creep.memory && creep.memory.lab_goal && ('fillLab' ===creep.memory.lab_goal.name) && creep.memory.lab_goal.mineralType ? creep.memory.lab_goal.mineralType : 'none'), STRUCTURE_LAB,
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
            new DropToContainerStrategy(undefined, STRUCTURE_TERMINAL,
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
        this.TERMINAL_ENERGY_TARGET = 10000;

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
            let s = util.currentStrategy(creep, this.unloadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
        }
        if (creep.memory.action == this.ACTION_FILL) {
            // this.oldGoalLogic(creep);
            this.newGoalLogic(creep);
            strategy = util.getAndExecuteCurrentStrategy(creep, (creep.memory.lab_goal?this.loadStrategies:this.noGoalLoadStrategies));
            if (!strategy) {
                strategy = _.find((creep.memory.lab_goal?this.loadStrategies:this.noGoalLoadStrategies), (strat)=>(strat.accepts(creep)));
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                // creep.log('no strategy', JSON.stringify(creep.memory.lab_goal));
                if (_.sum(creep.carry) > 0 && creep.memory.lab_goal) {
                    creep.memory.action = this.ACTION_UNLOAD;
                } else {
                    delete creep.memory.lab_goal;
                }

                // creep.log('no load strategy, clearing current goal');
            }

        } else {
            if (creep.memory.lab_goal && creep.carry && !creep.carry[creep.memory.lab_goal.mineralType]) {
                creep.log('creep empty', JSON.stringify(creep.memory.lab_goal));
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


    /**
     * each room focuses on one production
     * empty the labs with the procution results, fill the labs with the production ingredients
     * @param creep
     */
    newGoalLogic(creep) {
        if (creep.memory.lab_goal && !this.isGoalValid(creep, creep.memory.lab_goal)) {
            creep.log('invalidGoal', JSON.stringify(creep.memory.lab_goal));
            delete creep.memory.lab_goal;
        }
        if (!creep.memory.lab_goal) {
            // export minerals go to terminal

            // labs with bad min
            // fill almost empty labs
            // unload almost full labs
            // fill lab energy
            let labs = creep.room.structures[STRUCTURE_LAB];
            let roomProduction = creep.room.memory.lab_production;
            // if (!roomProduction) {
            //     return this.oldGoalLogic(creep);
            // }

            // creep.log('room labs', labs, labs.map((lab)=>this.expectedMineralType(lab)));
            let requireEmptying = (lab)=>(lab.mineralType && (lab.mineralType !== lab.room.expectedMineralType(lab)
            || (lab.room.expectedMineralType(lab) === roomProduction && lab.mineralAmount > lab.mineralCapacity / 2)));
            let requireRefilling = (lab)=> {
                let expected = lab.room.expectedMineralType(lab);
                return (!roomProduction || expected !== roomProduction) // production target, ignore
                    && (!lab.mineralType || lab.mineralType === expected)
                    && (!lab.mineralAmount || lab.mineralAmount < lab.mineralCapacity / 2); // ingredient, refill
            };
            let terminal = creep.room.terminal;

            let goalFinders = [
                // empty lab
                (labs)=> {
                    let needEmptying = _.sortBy(labs.filter((lab)=> requireEmptying(lab)), lab=>-lab.mineralAmount);
                    // creep.log('needEmptying labs', needEmptying, needEmptying.map((lab)=>creep.room.expectedMineralType(lab)));
                    let goal = needEmptying.reduce((goal, lab)=> {
                        if (goal) {
                            return goal;
                        } else {
                            let containerId = lab.room.find(FIND_STRUCTURES).filter(s=>!s.runReaction && s.store && s.store[lab.mineralType]) // do not drop in other labs
                                    .map((c)=>c.id).find((s)=>s.id !== lab.id) || lab.room.storage.id;
                            if (containerId) {
                                // TODO 
                                return {
                                    name: 'unloadLab',
                                    action: this.ACTION_UNLOAD,
                                    lab: lab.id,
                                    mineralType: lab.mineralType,
                                    container: containerId
                                };
                            } else {
                                return undefined;
                            }
                        }

                    }, undefined);
                    // creep.log('not full labs goals ', JSON.stringify(goals));
                    if (goal) {
                        creep.memory.lab_goal = goal;
                    }
                },
                // refill lab mineral
                (labs)=> {
                    let needRefilling = _.sortBy(labs.filter((lab)=> requireRefilling(lab)), lab=>lab.mineralAmount);

                    // creep.log('needRefilling labs', needRefilling, needRefilling.map((lab)=>lab.room.expectedMineralType(lab)));
                    let lab = needRefilling.find((lab)=>lab.room.findContainers().filter((s)=>s.id !== lab.id && s.store && s.store[lab.room.expectedMineralType(lab)] > 0).length > 0);
                    if (lab) {
                        creep.memory.lab_goal = {
                            name: 'fillLab',
                            action: this.ACTION_FILL,
                            lab: lab.id,
                            mineralType: lab.room.expectedMineralType(lab),
                        };
                    }
                },
                // refill lab energy
                (labs)=> {
                    let missingEnergyLabs = labs.filter((lab)=>lab.energy < lab.energyCapacity);
                    // creep.log('missingEnergyLabs', missingEnergyLabs.length);
                    let goal = _.sample(missingEnergyLabs.map((lab)=> {
                        let goal = {
                            name: 'fillEnergy',
                            action: this.ACTION_FILL,
                            lab: lab.id,
                            mineralType: RESOURCE_ENERGY,
                            container: _.sortBy(lab.room.structures[STRUCTURE_LAB].filter(s => s.store && s.store[RESOURCE_ENERGY]), (s)=>-s.store[RESOURCE_ENERGY])
                                .map((c)=>c.id).find(()=>true) || lab.room.storage.id
                        };
                        return goal;
                    }));
                    // creep.log('not full labs goals ', JSON.stringify(goals));
                    if (goal && goal.container) {
                        creep.memory.lab_goal = goal;
                    }
                },
                // export mineral , fill terminal
                (labs)=> {
                    if (creep.room.memory.exports && creep.room.storage && creep.room.storage.store && terminal && terminal.storeCapacity > _.sum(terminal.store)) {
                        // creep.log('seeking exports', JSON.stringify(creep.room.memory.exports), JSON.stringify(creep.room.storage.store));
                        let min = creep.room.memory.exports.find((min)=> {
                            // creep.log('testing', min, creep.room.storage.store[min], (!terminal.store || ! terminal.store[min] ||terminal.store[min]<10000));
                            return (creep.room.storage.store[min] ||0) > ((RESOURCE_ENERGY === min) ? 20000 : 0) + creep.carryCapacity // enough stored to spare
                                && (!terminal.store || !terminal.store[min] || terminal.store[min] < 10000);
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
                // refill terminal energy
                (labs)=> {
                    let terminalEnergy = _.get(terminal,['store',RESOURCE_ENERGY],0);
                    let storageEnergy = _.get(creep.room.storage,['store',RESOURCE_ENERGY],0);
                    if (terminal && creep.room.memory.exports && creep.room.memory.exports.length > 0
                        && ((terminalEnergy < this.TERMINAL_ENERGY_TARGET) || (creep.room.controller.level ==8 &&terminalEnergy < 100000)) && storageEnergy > 10000) {
                        let goal = {
                            name: 'fillTerminal',
                            action: this.ACTION_FILL,
                            // lab: terminal.id,
                            mineralType: RESOURCE_ENERGY,
                            container: _.sortBy(creep.room.structures[STRUCTURE_LAB].filter(s =>s.store && s.store[RESOURCE_ENERGY]), (s)=>-s.store[RESOURCE_ENERGY])
                                .map((c)=>c.id).find(()=>true) || creep.room.storage.id
                        };
                        if (goal && goal.container) {
                            creep.memory.lab_goal = goal;
                        }
                    }

                },

            ];
            for (let i = 0, max = goalFinders.length; i < max && !creep.memory.lab_goal; i++) {
                // creep.log('finding goal', i);
                goalFinders[i](labs);
            }
            // creep.log('chosen goal', JSON.stringify(creep.memory.lab_goal));
        }


    }


    isGoalValid(creep, lab_goal) {
        let valid = false;
        if (lab_goal && lab_goal.name ) {
            let lab = Game.getObjectById(lab_goal.lab);
            switch (lab_goal.name) {
                case 'fillTerminal':
                    valid = true;
                    break;
                case 'unloadLab':
                    valid = lab && (lab.mineralAmount && lab.mineralAmount > 0 && lab.mineralType === lab_goal.mineralType);
                    break;
                case 'fillLab':
                    valid = lab && (!lab.mineralType || (lab.mineralAmount < lab.mineralCapacity && lab.mineralType === lab_goal.mineralType));
                    break;
                case 'fillEnergy':
                    valid = lab && (!lab.energy || lab.energy < lab.energyCapacity);
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
require('./profiler').registerClass(RoleLabOperator, 'RoleLabOperator');
module.exports = RoleLabOperator;
