var BaseStrategy = require('./strategy.base'); 

class RemoteHealStrategy extends BaseStrategy {
    constructor() {
        super();
    }

    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        // find my damaged creeps, heal closest if time
        // order by type (heal > *)  and distance
        let previousTarget = this.getRemoteTarget(creep);
        if (previousTarget) {
            return previousTarget;
        }
        let damaged = creep.pos.findClosestByRange(FIND_MY_CREEPS, {filter: (c) => (c.hits < c.hitsMax)});
        return this.setRemoteTarget(creep, damaged);
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