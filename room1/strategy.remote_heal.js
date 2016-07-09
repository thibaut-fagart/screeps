var _ = require('lodash');
var BaseStrategy = require('./strategy.base');

class RemoteHealStrategy extends BaseStrategy {
    constructor(range) {
        super();
    }
    saveState() {
        return {range: this.range};
    }
    
    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        if (!creep instanceof StructureTower || (creep.body && creep.getActiveBodyparts(HEAL) == 0)) {
            return null;
        }
        // find my damaged creeps, heal closest if time
        // order by type (heal > *)  and distance

        let damageds = (this.range) ? creep.pos.findInRange(FIND_MY_CREEPS, this.range, {filter: (c) => (c.hits < c.hitsMax)}) : creep.room.find(FIND_MY_CREEPS, {filter: (c) => (c.hits < c.hitsMax)});
        damageds = _.sortBy(damageds, (c)=>c.hits);
        let damaged = (damageds.length ? damageds[0] : null);
        if (damaged) {
            if (creep instanceof StructureTower) {
                creep.heal(damaged);
            } else {
                creep.heal(damaged);
                if (creep.pos.getRangeTo(damaged) > 3) {
                    creep.moveTo(damaged);
                }

            }
        }
        let remoteTarget = this.setRemoteTarget(creep, damaged);
        // creep.log('remoteTarget', remoteTarget);
        return remoteTarget;
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