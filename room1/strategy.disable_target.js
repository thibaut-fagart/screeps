var _ = require('lodash');
var StrategyRemoteTarget = require('./strategy.remote_target');

class DisableTargetStrategy extends StrategyRemoteTarget {
    constructor(range) {
        super(range);
    }

    findBrothers(creep) {
        return creep.pos.findInRange(FIND_MY_CREEPS, this.range, {filter: (c) => c.memory.role == creep.memory.role});
    }

    findTargets(creep) {
        return _.filter(super.findTargets(creep),(c)=>!this.isDisabled(c));
    }

    isDisabled(target) {
        return _.filter(target.body, (b)=>b.hits > 0).length == 1;
    }

    performAttack(creep, target) {
        // creep.log('performAttack');
        let isLeader = (!creep.memory.leader) || creep.memory.leader === creep.name;
        let brotherCount = creep.memory.brotherCount||0;
        if (target.owner.username !=='Source Keeper' || _.filter(target.body, (b)=>b.hits > 0).length > 1) {
            return creep.rangedAttack(target);
        } else  if (target.hits < brotherCount * this.getDamage(creep) && !isLeader) {
            let shouldDisable = target.findInRange(FIND_FLAGS, 5, {filer:{color:COLOR_ORANGE}}).length;
            if (!shouldDisable) {
                // kill
                return super.performAttack(creep, target);
            } else {
                creep.log('halting fire, only disabling');
                return OK;
            }
        } else {
            return false;
        }
    }

    getDamage(creep) {
        return creep.getActiveBodyparts(RANGED_ATTACK * 10);
    }
}

module.exports = DisableTargetStrategy;