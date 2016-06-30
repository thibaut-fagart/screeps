class RemoteRepairStrategy {
    constructor() {
    }

    /** @param {StructureTower} tower
     * @return {Structure|| null}**/
    accepts(tower) {
        // find my damaged structures, repair closest
        // order by distance
        let previousTarget = this.getRemoteTarget(tower);
        if (previousTarget) {
            return previousTarget;
        }
        let damaged = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => ((s.my || !s.owner) && (s.hits < s.hitsMax))});
        return this.setRemoteTarget(tower, damaged);
    }

    /** @param {StructureTower} tower
     * @param {Structure} structure
     * @return {Structure} structure
     * **/
    setRemoteTarget(tower, structure) {
        let mymem = this.myMem(tower);
        if (structure) {
            mymem.repairing_remote = structure.id;
        } else {
            delete mymem.repairing_remote;
        }
        return structure;
    }

    /** @param {StructureTower} tower
     * @return {Structure} damaged
     * **/
    getRemoteTarget(tower) {
        let mymem = this.myMem(tower);
        // return util.objectFromMemory(this.myMem(creep), 'repairing_remote', (o) => damaged.hits < damaged.hitsMax);

        let id = mymem.repairing_remote;
        if (id) {
            let damaged = Game.getObjectById(id);
            if (!damaged || damaged.hits == damaged.hitsMax) {
                delete mymem.repairing_remote
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

module.exports = RemoteRepairStrategy;