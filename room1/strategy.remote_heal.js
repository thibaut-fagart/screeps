var _ = require('lodash');
var BaseStrategy = require('./strategy.base');
var util = require('./util');

class RemoteHealStrategy extends BaseStrategy {
    constructor(range, predicate) {
        super();
        this.range = range;
        this.predicate = predicate || (()=> { return ()=>true;});
    }

    saveState() {
        return {range: this.range};
    }

    findHealingTargets(creep) {
        let damagedFilter = (c) => (c.hits < c.hitsMax);
        let targets = (this.range) ? creep.pos.findInRange(FIND_MY_CREEPS, this.range).filter(damagedFilter) : creep.room.find(FIND_MY_CREEPS).filter(damagedFilter);
        // creep.log('findHealingTargets', this.range, targets.length);
        targets = targets.filter(this.predicate(creep));
        // creep.log('findHealingTargets filtered', this.range, targets.length);
        return targets;
    }

    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        let isTower = creep.structureType;
        // if (!isTower) creep.log('RemoteHealStrategy running');
        if (!isTower && (creep.body && (creep.getActiveBodyparts(HEAL) == 0))) {
            return null;
        }
        // if (!isTower) creep.log('running');

        // find my damaged creeps, heal closest if time
        // order by type (heal > *)  and distance

        // if creep has no attack, try using HEAL so that it can RANGE_ATTACK
        let hasRangedAttack = creep instanceof StructureTower || (creep.getActiveBodyparts(RANGED_ATTACK) > 0);
        let damageds = this.findHealingTargets(creep);
        // if (!isTower) creep.log('damageds1',damageds.length);
        damageds = _.sortBy(damageds, (c)=>c.pos.getRangeTo(creep));
        let damaged = (damageds.length ? damageds[0] : null);
        // if (!isTower) creep.log('damaged', damaged);
        let hasAttack = isTower ? false : (creep.getActiveBodyparts(ATTACK));
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        if (damaged) {
            // creep.log('damaged', hasRangedAttack, hasAttack, damaged.id, creep.id);
            if (creep.structureType) {
                creep.heal(damaged);
            } else if (damaged.id !== creep.id) {
                // creep.log('damaged, not me', hasRangedAttack, hasAttack, damaged.name,damaged.id);
                let range = creep.pos.getRangeTo(damaged.pos);
                let heal;
                if (range > 1) {
                    this.moveToAndHeal(creep, damaged);
                    return true;
                } else if ((hasRangedAttack && range == 1) ||hostiles.length ===0) {
                    heal = creep.heal(damaged);
                    creep.log(`healing ${damaged.name} at (${damaged.pos.x},${damaged.pos.y}), heal ${heal}`);
                } else if (hasRangedAttack) {
                    heal = this.moveToAndHeal(creep, damaged);
                    creep.log(`healing ${damaged.name} at (${damaged.pos.x},${damaged.pos.y}), heal ${heal}`);
                } else if (range === 1) {
                    heal = creep.heal(damaged);
                    creep.log(`healing ${damaged.name} at (${damaged.pos.x},${damaged.pos.y}), heal ${heal}`);
                } else if (!hostiles.length) {
                    heal = this.moveToAndHeal(creep, damaged);
                    creep.log(`healing ${damaged.name} at (${damaged.pos.x},${damaged.pos.y}), heal ${heal}`);
                } else {
                    heal = creep.rangedHeal(damaged);
                    creep.log(`healing ${damaged.name} at (${damaged.pos.x},${damaged.pos.y}), heal ${heal}`);
                }
                return 0 == hostiles.length;
            } else {
                // creep.log('damaged, me', hasRangedAttack, hasAttack, damaged.name);
                // creep.log('hasRangedAttack', hasRangedAttack, '!hasAttack', !hasAttack);
                if (hasRangedAttack || !hasAttack) {
                    if (creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length ==0) {
                        creep.log('no threat, self healing');
                        let ret = creep.heal(creep);
                        if (OK !== ret) {
                            creep.log('heal?', ret);
                        }
                    }
                    // creep.log('being hurt, pressing on');
                    return creep.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length == 0;
                } else {
                    if (!creep.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length) {
                        // creep.log('no hostiles, self healing');
                        creep.heal(creep);
                        // first heal before moving into range
                        return creep.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length>0;
                    } else {
                        return false;
                    }
                }
            }

        } else {
            return false;
        }
    }

    moveToAndHeal(creep, damaged) {
        creep.moveTo(damaged);
        if (creep.pos.getRangeTo(damaged) > 1) {
            creep.rangedHeal(damaged);
        } else {
            creep.heal(damaged);
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
                delete mymem.healing_remote;
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

require('./profiler').registerClass(RemoteHealStrategy, 'RemoteHealStrategy'); module.exports = RemoteHealStrategy;