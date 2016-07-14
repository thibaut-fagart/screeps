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
        let brothers = this.findBrothers(creep);
        let leader = _.sortBy(brothers, (b)=>b.name)[0];
        let isLeader = leader.name === creep.name;
        if (target.hits < brothers.length * this.getDamage(creep) && !isLeader) {
            let source = target.pos.findClosestByRange(FIND_SOURCES);
            let sourcePos = source.pos;
            let area = source.pos.lookAtArea(sourcePos.y - 1, sourcePos.x - 1, sourcePos.y + 1, sourcePos.x + 1, true);
            //{x: 7, y: 11, type: 'terrain', terrain: 'wall'}
            let freeSquares = area.filter((array)=>(array.type === 'terrain' && array.type !== wall) || (array.type === creep && array.creep.owner !== 'Keeper Source'));
            if (freeSquares.length < 3) {
                // kill
            } else {
                creep.log('halting fire, only disabling');
                return OK;
            }
        } else if (_.filter(target.body, (b)=>b.hits > 0).length > 1) {
            // creep.log('me',creep.rangedAttack);

            return creep.rangedAttack(target);
        } else {
            return false;
        }
    }

    getDamage(creep) {
        return creep.getActiveBodyparts(RANGED_ATTACK * 10);
    }
}

module.exports = DisableTargetStrategy;