var _ = require('lodash');
var BaseStrategy = require('./strategy.base');

class RemoteHealStrategy extends BaseStrategy {
    constructor(range) {
        super();
        this.range = range;
    }

    saveState() {
        return {range: this.range};
    }

    findHealingTargets(creep) {
        let targets = (this.range) ? creep.pos.findInRange(FIND_MY_CREEPS, this.range, {filter: (c) => (c.hits < c.hitsMax)}) : creep.room.find(FIND_MY_CREEPS, {filter: (c) => (c.hits < c.hitsMax)});
        return targets;
    }

    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        let isTower = creep instanceof StructureTower;
        // if (!isTower) creep.log('running');
        if (!isTower  && (creep.body && (creep.getActiveBodyparts(HEAL) == 0))) {
            return null;
        }
        // if (!isTower) creep.log('running');
        
        // find my damaged creeps, heal closest if time
        // order by type (heal > *)  and distance

        // if creep has no attack, try using HEAL so that it can RANGE_ATTACK
        let hasRangedAttack = creep instanceof StructureTower || (creep.getActiveBodyparts(RANGED_ATTACK) > 0);
        let damageds = this.findHealingTargets(creep);
        // if (!isTower) creep.log('damageds1',damageds.length);
        damageds = _.sortBy(damageds, (c)=>c.hits);
        let damaged = (damageds.length ? damageds[0] : null);
        // if (!isTower) creep.log('damaged',damaged);
        let hasAttack = isTower ? false : (creep.getActiveBodyparts(ATTACK));
        if (damaged) {
            // creep.log('damaged', hasRangedAttack, hasAttack, damaged.id, creep.id);
            if (creep instanceof StructureTower) {
                creep.heal(damaged);
            } else if (damaged.id !== creep.id) {
                let range = creep.pos.getRangeTo(damaged.pos);
                let heal;
                if (hasRangedAttack && range == 1) {
                    heal = creep.heal(damaged);
                    // creep.log(`healing ${damaged.id} at (${damaged.pos.x},${damaged.pos.y}), heal ${heal}`);
                    return false;
                } else if (hasRangedAttack) {
                    creep.moveTo(damaged);
                    creep.rangedHeal(damaged);
                    return true;
                } else {
                    heal = creep.rangedHeal(damaged);
                    // creep.log(`ranged healing ${damaged.id} at (${damaged.pos.x},${damaged.pos.y}), heal ${heal}, move ${move}`);
                    return false;
                }

            } else {
                // creep.log('hasRangedAttack',hasRangedAttack,'!hasAttack',!hasAttack);
                if (hasRangedAttack || !hasAttack) {
                    // if (!creep.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length) {
                    //     creep.log('no threat, self healing');
                    creep.log('being hurt, self healing');
                    let ret =creep.heal(creep);
                    if (OK !== ret) {
                        creep.log('heal?', ret);
                    }
                    // }
                    // creep.log('being hurt, pressing on');
                    return true;
                }
            }

        }
    }

    /** @param {Creep||StructureTower} creep
     * @param {Creep} damaged
     * @return {Creep} damaged
     * **/
    setRemoteTarget(creep, damaged) {
        let mymem = this.myMem(creep);
        if (damaged) {
            mymem.healing_remote = damaged.id;
        } else {
            delete mymem.healing_remote;
        }
        return damaged;
    }

    /** @param {Creep||StructureTower} creep
     * @return {Creep} damaged
     * **/
    getRemoteTarget(creep) {
        let mymem = this.myMem(creep);

        let id = mymem.healing_remote;
        if (id) {
            let damaged = Game.getObjectById(id);
            if (!damaged || damaged.hits == damaged.hitsMax) {
                delete mymem.healing_remote
            }
            return damaged;
        }
        return null;

    }

    /** @param {Creep||StructureTower} creep**/
    myMem(creep) {
        return (creep.memory instanceof Function) ? creep.memory() : creep.memory;
    }
}

module.exports = RemoteHealStrategy;