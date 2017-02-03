var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');

class FeedCreepStrategy extends BaseStrategy {
    constructor() {
        super();
    }

    accepts(creep) {
        if (!creep.carry.energy) {
            return false;
        }
        if (!creep.memory.targetCreep) {
            let target = creep.room.find(FIND_MY_CREEPS).find(c=>(/^.*pgrader/.exec(c.memory.role) || /^.*uilder/.exec(c.memory.role)) && _.sum(c.carry) < c.carryCapacity);

            if (target) {
                creep.memory.targetCreep = target.id;
            }
        }
        let target = creep.memory.targetCreep && Game.getObjectById(creep.memory.targetCreep);
        let targetNeedsEnergy = target && _.sum(target.carry) < target.carryCapacity;
        if (targetNeedsEnergy) {
            let transfer = creep.transfer(target, RESOURCE_ENERGY);
            if (ERR_NOT_IN_RANGE === transfer) {
                util.moveTo(creep, target.pos);
            } else if (ERR_FULL === transfer) {
                delete creep.memory.targetCreep;
                target = false;
            } else if (OK === transfer) {
                delete creep.memory.targetCreep;
                target = false;
            }
        } else {
            target = undefined;
            delete creep.memory.targetCreep;
        }
        return target && targetNeedsEnergy;

    }

}
require('./profiler').registerClass(FeedCreepStrategy, 'FeedCreepStrategy');
module.exports = FeedCreepStrategy;