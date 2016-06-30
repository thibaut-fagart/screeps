var util = require('./util');
class RemoteTargetStrategy {
    constructor() {
        this.path = 'attacking_remote';
    }

    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        // find strangers
        // order by type (heal > *)  and distance
        let previousTarget = this.getRemoteTarget(creep);
        if (previousTarget) {
            return previousTarget;
        }
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        let closestHealer = creep.pos.findClosestByRange(hostiles, {filter: (c)=>c.getActiveBodyparts(HEAL) != 0});
        if (closestHealer) {
            this.setRemoteTarget(creep, closestHealer);
            return closestHealer;
        } else {
            let closestHostile = creep.pos.findClosestByRange(hostiles);
            if (closestHostile) {
                this.setRemoteTarget(creep, closestHostile);
                return closestHostile;
            }
            return null;
        }
    }

    /** @param {Creep||StructureTower} creep
     * @param {Creep} hostile
     * **/
    setRemoteTarget(creep, hostile) {
        let mymem = this.myMem(creep);
        mymem[this.path] = hostile.id;

    }
    /** @param {Creep||StructureTower} creep
     * @return {Creep} hostile
     * **/
    getRemoteTarget(creep) {
        return util.objectFromMemory(this.myMem(creep), this.path);
    }

    /** @param {Creep||StructureTower} creep**/
    myMem(creep) {
        return (creep.memory instanceof Function) ? creep.memory() : creep.memory;
    }
}

module.exports = RemoteTargetStrategy;