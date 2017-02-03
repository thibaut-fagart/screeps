var _ = require('lodash');
var util = require('./util');
var PickupManager = require('./util.manager.pickup');
var WaitStrategy = require('./strategy.wait');
var BaseStrategy = require('./strategy.base');
const TERMINAL_ENERGY = 50000;

class LabUnloadStrategy extends BaseStrategy {
    constructor() {
        super();
    }

    clearMemory(creep) {
        return super.clearMemory(creep);
    }

    accepts(creep) {
        let goal = creep.memory.lab_goal;
        if (!goal && creep.room.storage) {
            creep.memory.lab_goal = {
                unloadTarget: creep.room.storage.id,
                resourceType: _.keys(creep.carry).find(m => creep.carry[m])
            };
            goal = creep.memory.lab_goal;
        }
        if (!goal) {
            return false;
        }
        if (!goal.unloadTarget) {
            // TODO
            creep.memory.lab_goal.unloadTarget = creep.room.storage.id;
        }
        if (goal.unloadTarget) {
            let target = Game.getObjectById(goal.unloadTarget);
            let resource = goal.mineralType || _.keys(creep.carry).find(m => creep.carry[m]);
            let transfer = creep.transfer(target, resource);
            if (ERR_NOT_IN_RANGE === transfer) {
                util.moveTo(creep, target.pos);
            } else if (OK === transfer) {
                // clean up ?
            } else {
                creep.log('transfer?', target.pos, resource, creep.carry[resource], transfer);
            }
            return true;
        } else {
            return false;
        }
    }
}
class LabLoadStrategy extends BaseStrategy {
    constructor() {
        super();
    }

    clearMemory(creep) {
        return super.clearMemory(creep);
    }

    accepts(creep) {
        let goal = creep.memory.lab_goal;
        if (!goal) {
            let target = PickupManager.getManager(creep.room.name).allocateDrop(creep, undefined, creep => ((drop => drop.amount - 2 * drop.pos.getRangeTo(creep) > 100)));
            if (target) {
                creep.memory.lab_goal = {name: 'pickup', loadTarget: target.id};
                goal = creep.memory.lab_goal;
            } else {
                return false;
            }
        }
        if (!goal.loadTarget) {
            // TODO
            creep.log('goal with no loadTarget', JSON.stringify(goal));
            creep.memory.lab_goal.loadTarget = creep.room.storage.id;
        }
        if (goal.loadTarget) {
            let target = Game.getObjectById(goal.loadTarget);
            if (!target) {
                delete creep.memory.lab_goal;
                return false;
            }
            let transfer = (goal.mineralType) ? creep.withdraw(target, goal.mineralType) : creep.pickup(target);
            if (ERR_NOT_IN_RANGE === transfer) {
                util.moveTo(creep, target.pos);
            } else if (OK === transfer) {
                // clean up ?
            } else if (ERR_NOT_ENOUGH_RESOURCES === transfer && _.sum(creep.carry) > 0) {
                creep.memory.action = 'unload';
            } else {
                creep.log('withdraw?', target.pos, transfer);
            }
            return true;
        } else {
            return false;
        }
    }
}
/**
 * searches for labs missing resources
 */
class RoleLabOperator {
    constructor() {
        this.loadStrategies = [
            new LabLoadStrategy(),
            new WaitStrategy(10)

        ];
        this.unloadStrategies = [
            new LabUnloadStrategy(),
            new WaitStrategy(10)
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'fill';
    }

    terminalEnergyTarget(room) {
        return room.controller && room.controller.level === 8 ? TERMINAL_ENERGY : 10000;
    }

    /** @param {Creep} creep **/
    run(creep) {
        let strategy;
        if (_.sum(creep.carry) == 0 && creep.memory.action !== this.ACTION_FILL) {
            // creep.log('reloading');
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
            delete creep.memory.containerSource;
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
            delete creep.memory.containerTarget;
            delete creep.memory[util.CURRENT_STRATEGY];
            let s = util.currentStrategy(creep, this.unloadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
        }
        if (creep.memory.action == this.ACTION_FILL) {
            // this.oldGoalLogic(creep);
            this.newGoalLogic(creep);
            strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat) => (strat.accepts(creep)));
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else if (_.sum(creep.carry) > 0) {
                // unable to load more, unload
                creep.memory.action = this.ACTION_UNLOAD;
                /*
                 } else if (creep.memory.lab_goal) {
                 creep.log(`no strategy and empty, clearning goal ${JSON.stringify(creep.memory.lab_goal)}`);
                 delete creep.memory.goalCheck;
                 delete creep.memory.lab_goal;
                 */
            }
        } else {
            if (!this.isGoalValid(creep, creep.memory.lab_goal)) {
                delete creep.memory.lab_goal;
            }
            if (creep.memory.lab_goal && creep.carry && !creep.carry[creep.memory.lab_goal.mineralType]) {
                creep.log('creep empty', JSON.stringify(creep.memory.lab_goal));
                delete creep.memory.lab_goal;
                delete creep.memory.goalCheck;
            }
// creep.log('unloading');
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat) => (strat.accepts(creep)));
            }
// creep.log('unloadStrategy ' ,util.strategyToLog(strategy));
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
            if (creep.memory.goalCheck && creep.memory.goalCheck > Game.time - 10) {
                return;
            }
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
            let requireEmptying = (lab) => (lab.mineralType && (lab.mineralType !== lab.room.expectedMineralType(lab)
            || (lab.room.expectedMineralType(lab) === roomProduction && lab.mineralAmount > lab.mineralCapacity / 2)));
            let requireRefilling = (lab) => {
                let expected = lab.room.expectedMineralType(lab);
                return (!roomProduction || expected !== roomProduction) // production target, ignore
                    && (!lab.mineralType || lab.mineralType === expected)
                    && ((lab.mineralAmount || 0) < lab.mineralCapacity / 2); // ingredient, refill
            };
            let terminal = creep.room.terminal;
            let desiredLedger = creep.room.desiredLedger;
            let carryCapacity = creep.carryCapacity;
            let goalFinders = [
                // gather minerals from containers
                () => {
                    let needEmptying = _.max(creep.room.structures[STRUCTURE_CONTAINER] || [], container => {
                        let totalStore = _.sum(container.store) || 0;
                        let energy = (container.store.energy || 0);
                        return energy < totalStore // has minerals
                            && totalStore > 0.5 * container.storeCapacity;
                    });
                    // creep.log('needEmptying labs', needEmptying, needEmptying.map((lab)=>creep.room.expectedMineralType(lab)));
                    if (needEmptying && needEmptying !== -Infinity && _.sum(needEmptying.store) - needEmptying.store.energy) {
                        creep.memory.lab_goal = {
                            name: 'unloadContainer',
                            action: this.ACTION_UNLOAD,
                            loadTarget: needEmptying.id,
                            mineralType: _.max(_.pull(_.keys(needEmptying.store), RESOURCE_ENERGY), r => needEmptying.store[r])
                        };
                    }
                },
                // empty wrong mineral labs
                (labs) => {
                    if ((!creep.room.storage) || (creep.room.storage.storeCapacity - 10000 < _.sum(creep.room.storage.store))) return;
                    let needEmptying = _.sortBy(labs.filter((lab) => requireEmptying(lab)), lab => -lab.mineralAmount);
                    // creep.log('needEmptying labs', needEmptying, needEmptying.map((lab)=>creep.room.expectedMineralType(lab)));
                    let goal = needEmptying.reduce((goal, lab) => {
                        if (goal) {
                            return goal;
                        } else {
                            let containerId = lab.room.find(FIND_STRUCTURES).filter(s => !s.runReaction && s.store && s.store[lab.mineralType]) // do not drop in other labs
                                    .map((c) => c.id).find((s) => s.id !== lab.id) || lab.room.storage.id;
                            if (containerId) {
                                // TODO
                                return {
                                    name: 'unloadLab',
                                    action: this.ACTION_UNLOAD,
                                    unloadTarget: lab.room.storage.id,
                                    mineralType: lab.mineralType,
                                    loadTarget: lab.id,
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
                (labs) => {
                    let ledger = creep.room.currentLedger;
                    let needRefilling = labs.filter((lab) => requireRefilling(lab) && (ledger[lab.room.expectedMineralType(lab)] || 0) > 0);
                    // creep.log('needRefilling labs', needRefilling, needRefilling.map((lab)=>lab.room.expectedMineralType(lab)));
                    if (needRefilling.length ===0) return;
                    let lab = _.min(needRefilling, lab=>lab.mineralAmount);
                    // creep.log('chosen', lab);
                    if (lab) {
                        let expectedMineralType = lab.room.expectedMineralType(lab);
                        let source = lab.room.storage.store[expectedMineralType] ? lab.room.storage : lab.room.terminal;
                        creep.memory.lab_goal = {
                            name: 'fillLab',
                            action: this.ACTION_FILL,
                            loadTarget: source.id,
                            unloadTarget: lab.id,
                            mineralType: expectedMineralType,
                        };
                    }
                },
                // refill lab energy
                (labs) => {
                    let missingEnergyLabs = labs.filter((lab) => lab.energy < lab.energyCapacity);
                    // creep.log('missingEnergyLabs', missingEnergyLabs.length);
                    let goal = _.sample(missingEnergyLabs.map((lab) => {
                        let goal = {
                            name: 'fillLab',
                            action: this.ACTION_FILL,
                            mineralType: RESOURCE_ENERGY,
                            loadTarget: lab.room.storage.id,
                            unloadTarget: lab.id
                        };
                        return goal;
                    }));
                    // creep.log('not full labs goals ', JSON.stringify(goals));
                    if (goal && goal.container) {
                        creep.memory.lab_goal = goal;
                    }
                },
                // refill/unload terminal energy
                () => {
                    let terminalEnergy = _.get(creep.room.terminal, ['store', RESOURCE_ENERGY], 0);
                    let storageEnergy = _.get(creep.room.storage, ['store', RESOURCE_ENERGY], 0);
                    if (terminal) {
                        if (creep.room.export.length > 0 && storageEnergy > 10000 && terminalEnergy < this.terminalEnergyTarget(creep.room) - carryCapacity) {
                            creep.memory.lab_goal = {
                                name: 'fillTerminal',
                                action: this.ACTION_FILL,
                                // lab: terminal.id,
                                mineralType: RESOURCE_ENERGY,
                                unloadTarget: creep.room.terminal.id,
                                loadTarget: creep.room.storage.id,
                            };
                        } else if (terminalEnergy > this.terminalEnergyTarget(creep.room)) {
                            creep.memory.lab_goal = {
                                name: 'fillStorage',
                                action: this.ACTION_UNLOAD,
                                // lab: terminal.id,
                                mineralType: RESOURCE_ENERGY,
                                loadTarget: creep.room.terminal.id,
                                unloadTarget: creep.room.storage.id,
                            };
                        }
                    }
                },
                // export mineral , fill terminal
                () => {
                    let min;
                    if (creep.room.export && _.get(creep.room.storage, ['store', RESOURCE_ENERGY], 0) > 10000 && terminal && terminal.storeCapacity > _.sum(terminal.store)) {
                        // creep.log('seeking exports', JSON.stringify(creep.room.memory.exports), JSON.stringify(creep.room.storage.store));
                        min = creep.room.export.find((min) => {
                            // creep.log('testing', min, creep.room.storage.store[min], (!terminal.store || ! terminal.store[min] ||terminal.store[min]<10000));
                            return RESOURCE_ENERGY !== min
                                && (creep.room.storage.store[min] || 0) - carryCapacity > (desiredLedger[min] || 0)
                                && (_.get(terminal, ['store', min], 0) < 10000);
                        });
                        // creep.log('testing sellOrders?', !min);
                    }
                    if (!min && creep.room.sellOrders) {
                        min = _.keys(creep.room.sellOrders).find(m => creep.room.storage.store[m] && (terminal.store[m] || 0) < Math.min(creep.room.sellOrders[m], 5000));
                        // creep.log('sellOrder min ', min);
                    }
                    if (!min) {
                        let streamingOrder = (Memory.streamingOrders || []).find(
                            o => o.from === creep.room.name && (o.amount > 100) && o.what !== RESOURCE_ENERGY
                            && _.get(creep.room.storage, ['store', o.what], 0) > 0 && _.get(creep.room.terminal, ['store', o.what], 0) < 10000);
                        if (streamingOrder) {
                            min = streamingOrder.what;
                        }
                    }
                    if (min) {
                        creep.memory.lab_goal = {
                            name: 'fillTerminal',
                            unloadTarget: creep.room.terminal.id,
                            loadTarget: creep.room.storage.id,
                            action: this.ACTION_FILL,
                            mineralType: min,
                        };
                    }
                },
                // import mineral , move to storage
                () => {
                    if (creep.room.terminal && creep.room.terminal.store && creep.room.storage && creep.room.storage.storeCapacity - 10000 > _.sum(creep.room.storage.store)) {
                        // creep.log('seeking exports', JSON.stringify(creep.room.memory.exports), JSON.stringify(creep.room.storage.store));
                        let min = _.keys(creep.room.terminal.store).find((min) => {
                            // creep.log('testing', min, creep.room.storage.store[min], (!terminal.store || ! terminal.store[min] ||terminal.store[min]<10000));
                            let neededForTrade = _.sum(_.values(Game.market.orders).filter(o => o.type === 'sell' && o.roomName === creep.room.name && o.resourceType === min), o => o.remainingAmount);
                            let wantedInTerminal = Math.max(neededForTrade, Math.min(10000, (creep.room.currentLedger[min] || 0) - (creep.room.desiredLedger[min] || 0)));
                            return min !== RESOURCE_ENERGY && (creep.room.terminal.store[min] || 0) - carryCapacity > wantedInTerminal;
                        });
                        if (min) {
                            creep.memory.lab_goal = {
                                name: 'fillStorage',
                                unloadTarget: creep.room.storage.id,
                                loadTarget: creep.room.terminal.id,
                                action: this.ACTION_FILL,
                                mineralType: min,
                            };
                        }
                    }
                },
                // fill nuker
                () => {
                    let nuker = _.head(creep.room.structures[STRUCTURE_NUKER]);
                    if (!nuker || (nuker.ghodium || 0) == nuker.ghodiumCapacity) {
                        return;
                    }
                    let ghodiumProvider = [creep.room.storage, creep.room.terminal].find(s => s && _.get(s, ['store', RESOURCE_GHODIUM], 0));
                    if (ghodiumProvider) {
                        let goal = {
                            name: 'fillNuker',
                            action: this.ACTION_FILL,
                            mineralType: RESOURCE_GHODIUM,
                            container: ghodiumProvider.id,
                            unloadTarget: nuker.id
                        };
                        creep.memory.lab_goal = goal;
                    }

                },

            ];
            for (let i = 0, max = goalFinders.length; i < max && !creep.memory.lab_goal; i++) {
                // creep.log('finding goal', i);
                goalFinders[i](labs);
            }

            // creep.log('chosen goal', JSON.stringify(creep.memory.lab_goal));
            if (!creep.memory.lab_goal) {
                creep.memory.goalCheck = Game.time;
            }
        }


    }


    isGoalValid(creep, lab_goal) {
        let valid = false;
        if (lab_goal && lab_goal.name) {
            switch (lab_goal.name) {
                case 'pickup':
                    valid = Game.getObjectById(lab_goal.loadTarget);
                    break;
                case 'fillTerminal':
                    valid = creep.room.terminal.storeCapacity > _.sum(creep.room.terminal.store) - 5000;
                    break;
                case 'fillStorage':
                    valid = creep.room.storage.storeCapacity - 10000 > _.sum(creep.room.storage.store);
                    break;
                case 'unloadContainer': {
                    valid = _.get(Game.getObjectById(lab_goal.loadTarget), ['store', lab_goal.mineralType], 0) > 0;
                    break;
                }
                case 'unloadLab': {
                    let lab = Game.getObjectById(lab_goal.loadTarget);
                    valid = lab && (lab.mineralAmount && lab.mineralAmount > 0 && lab.mineralType === lab_goal.mineralType)
                        && creep.room.storage.storeCapacity - 10000 > _.sum(creep.room.storage.store);
                    break;
                }
                case 'fillLab': {
                    let lab = Game.getObjectById(lab_goal.unloadTarget);
                    valid = lab && (!lab.mineralType || (lab.mineralAmount < lab.mineralCapacity && lab.mineralType === lab_goal.mineralType));
                    break;
                }
                case 'fillEnergy': {
                    let lab = Game.getObjectById(lab_goal.unloadTarget);
                    valid = lab && (!lab.energy || lab.energy < lab.energyCapacity);
                    break;
                }
                case 'fillNuker': {
                    let nuker = Game.getObjectById(lab_goal.unloadTarget);
                    valid = nuker && nuker.ghodium < nuker.ghodiumCapacity;
                    break;
                }
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
    _.keys(REACTIONS).forEach((min1) => {
        let temp = REACTIONS[min1];
        _.keys(temp).forEach((min2) => {
            result[temp[min2]] = [min1, min2];
        });
    });
    return result;
}

RoleLabOperator.reactions = reverseReactions();
require('./profiler').registerClass(RoleLabOperator, 'RoleLabOperator');
module.exports = RoleLabOperator;
