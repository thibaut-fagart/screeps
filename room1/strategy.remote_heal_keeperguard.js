var _ = require('lodash');
var RemoteHealStrategy = require('./strategy.remote_heal');

class RemoteHealKeeperGuardStrategy extends RemoteHealStrategy {

    constructor(range) {
        super(range);
        this.matrix = void(0);
    }

    findHealingTargets(creep) {
        let targets = super.findHealingTargets(creep)
            .filter((c)=> {
                if (c.memory.role !== creep.memory.role) return (c.hits < 0.5 * c.hitsMax);
                let ratio = c.hits / c.hitsMax;
                return (ratio < 0.75) || (ratio < 1 && c.pos.getRangeTo(creep) == 1);
            });
        // creep.log('healing targets', targets.length);
        return targets;

    }

    moveToAndHeal(creep, damaged) {
        let rangeToDamaged = creep.pos.getRangeTo(damaged);
        if (rangeToDamaged > 1) {
            let hostiles = damaged.pos.findInRange(FIND_HOSTILE_CREEPS);
            if (hostiles.length) {
                let rangeTo = hostiles[0].pos.getRangeTo(creep.pos);
                if (rangeTo === 3) {
                    creep.moveTo(hostiles[0]);
                    creep.rangedHeal(damaged);
                } else if (rangeTo ===2) {
                    creep.moveTo(damaged);
                    creep.heal(damaged);
                }
            } else {
                creep.moveTo(damaged);
                if (rangeToDamaged ===2) {
                    creep.heal(damaged);
                }  else {
                    creep.rangedHeal(damaged);
                }
            }
        } else {
            creep.heal(damaged);
        }

    }
    
    accepts(creep) {
        // creep.log('sub');
        super.accepts(creep);
    }
}

module.exports = RemoteHealKeeperGuardStrategy;