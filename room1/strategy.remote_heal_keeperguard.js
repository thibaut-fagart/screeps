var _ = require('lodash');
var RemoteHealStrategy = require('./strategy.remote_heal');

class RemoteHealKeeperGuardStrategy extends RemoteHealStrategy {

    constructor(range) {
        super(range);
    }

    findHealingTargets(creep) {
        let findHealingTargets2 = super.findHealingTargets(creep);
        let hostilesNearby = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length > 0;
        // creep.log('base healing targets', findHealingTargets2.length);
        let targets = findHealingTargets2
            .filter((c)=> {
                if (c.memory.role !== creep.memory.role) return !hostilesNearby;
                let ratio = c.hits / c.hitsMax;
                return (ratio < 0.75) || (ratio < 1 && c.pos.getRangeTo(creep) <= 1);
            }).sort(c=>c.hits / c.hitsMax);
        // creep.log('healing targets', targets.length);
        return targets;

    }

    moveToAndHeal(creep, damaged) {
        creep.log('moveToAndHeal', damaged.name);
        return super.moveToAndHeal(creep, damaged); // TODO
        let rangeToDamaged = creep.pos.getRangeTo(damaged);
        if (rangeToDamaged > 1) {
            let hostiles = damaged.pos.findInRange(FIND_HOSTILE_CREEPS, 5);
            if (hostiles.length) {
                let rangeTo = hostiles[0].pos.getRangeTo(creep.pos);
                if (rangeTo === 3) {
                    // creep.log('at range3, closing on ennemy to heal');
                    creep.moveTo(hostiles[0]);
                    creep.rangedHeal(damaged);
                } else if (rangeTo === 2) {
                    // creep.log('at range2, closing on squadmate to heal');
                    if (creep.moveTo(damaged) === OK) {
                        creep.heal(damaged);
                    } else {
                        creep.rangedHeal(damaged);
                    }
                }
            } else {
                creep.moveTo(damaged);
                if (rangeToDamaged === 2) {
                    creep.heal(damaged);
                } else {
                    creep.rangedHeal(damaged);
                }
            }
        } else {
            creep.heal(damaged);
        }
    }
}

module.exports = RemoteHealKeeperGuardStrategy;