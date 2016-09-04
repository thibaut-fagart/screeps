var _ = require('lodash');
var util = require('./util');
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
        if (creep.room.name ==='sim') debugger;
        // return super.moveToAndHeal(creep, damaged); // TODO
        let rangeToDamaged = creep.pos.getRangeTo(damaged);
        let hostiles = damaged.pos.findInRange(FIND_HOSTILE_CREEPS, 5);
        if (rangeToDamaged > 1) {
            if (hostiles.length) {
                // find pos that are both at range1 of damaged and range max of hostiles
                let area = creep.room.glanceAround(damaged.pos, 1);
                let candidateHealing = util.findWalkableTiles(creep.room, area);
                let desirability = [300, 200, 100, 0, 400];
                candidateHealing.forEach(pos=>{
                    let hostileRange =pos.getRangeTo(hostiles[0]);
                    pos.score=hostileRange <desirability.length?desirability[hostileRange]+creep.pos.getRangeTo(pos):400;
                });
                let healingPos = _.min(candidateHealing, pos=>pos.score);
                creep.log('healing from ', healingPos);
                if (healingPos && Infinity !== healingPos) {
                    creep.moveTo(healingPos);
                    creep.rangedHeal(damaged);
                } else {
                    creep.rangedHeal(damaged);
                }
            } else {
                creep.moveTo(damaged);
                if (rangeToDamaged ===1) {
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