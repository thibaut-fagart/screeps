var Base = require('./strategy.base');
var util = require('./util');
var taskManager = require('./tasks.Manager');

class RunTaskStrategy extends Base {
    constructor(role) {
        super();
        this.role = role;
    }

    accepts(creep) {
        creep.memory.role2 = this.role;
        let currentCarry = _.sum(creep.carry);
        creep.memory.state = creep.memory.state || (currentCarry === 0 ? 'load' : 'unload');
        if (creep.memory.state === 'unload' && currentCarry === 0) {
            creep.memory.state = 'load';
            if (creep.memory.task)  taskManager.returnTask(creep);
        } else if (creep.memory.state === 'load' && currentCarry > 0) {
            creep.memory.state = 'unload';
            if (creep.memory.task)  taskManager.returnTask(creep);
        }
        if (! creep.memory.task && currentCarry > 0) {
            creep.memory.state = 'unload';
        }
        if (!creep.memory.task) {
            creep.log('requesting task', creep.memory.state === 'load');
            taskManager.assignTask(creep, creep.memory.state === 'load');
        }
        if (creep.memory.task) {
            creep.log(`running task ${creep.memory.task.subtype}`);
            if (this.runTaskTimer(creep)) {
                let obj = Game.getObjectById(creep.memory.task.id);
                if (!obj) {
                    taskManager.finishedTask(creep);
                } else {
                    switch (creep.memory.task.subtype) {
                        case 'pickup': {
                            let pickup = creep.pickup(obj);
                            if (pickup == ERR_NOT_IN_RANGE) {
                                util.moveTo(creep, obj.pos);
                            } else if (pickup !== OK) {    // Action takes one tick... task complete... delete task...
                                taskManager.finishedTask(creep);
                            }

                            break;
                        }
                        case 'withdraw': {
                            let withdraw = creep.withdraw(obj, creep.memory.task.resource,
                                (creep.memory.task.amount > creep.carryCapacity - currentCarry ? null : creep.memory.task.amount));
                            if (withdraw == ERR_NOT_IN_RANGE) {
                                util.moveTo(creep, obj.pos);
                            } else if (withdraw !== OK) {    // Action takes one tick... task complete... delete task...
                                taskManager.finishedTask(creep);
                            }
                            break;
                        }
                        case 'deposit': {
                            // Cycle through all resources and deposit, starting with minerals
                            let resource = creep.memory.task.resource;
                            resource = RESOURCE_ENERGY === resource ? resource : _.keys(creep.carry).find(r=>r !== RESOURCE_ENERGY);

                            let transfer = creep.transfer(obj, resource);
                            if (transfer == ERR_NOT_IN_RANGE) {
                                util.moveTo(creep, obj.pos);
                            } else if (transfer !== OK) {    // Action takes one tick... task complete... delete task...
                                taskManager.finishedTask(creep);
                            }
                            break;
                        }
                        default:
                            break;
                    }
                }
            }
            return true;
        } else {
            return false;
        }

    }

    runTaskTimer(creep) {
        if (!creep.memory.task) {
            return false;
        } else if (creep.memory.task.timer != null) {
            // Process the task timer
            creep.memory.task.timer = creep.memory.task.timer - 1;
            if (creep.memory.task.timer <= 0) {
                if (!taskManager.extendTask(creep)) {
                    taskManager.returnTask(creep);
                }
                return false;
            }
        }

        return true;
    }
}
require('./profiler').registerClass(RunTaskStrategy, 'RunTaskStrategy');
module.exports = RunTaskStrategy;