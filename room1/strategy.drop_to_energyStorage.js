var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class DropToEnergyStorageStrategy extends BaseStrategy {
    constructor(structureType) {
        super();
        if (!structureType) structureType = STRUCTURE_EXTENSION;
        this.resource = RESOURCE_ENERGY;
        this.structureType = structureType;
        this.PATH = 'energyStoreTarget';
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    setTarget(creep, s) {
        if (s) {
            creep.memory[this.PATH] = s.id;
            return s;
        } else {
            delete creep.memory[this.PATH];
        }
    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        if (creep.carry.energy === 0) return null;
        let target = util.objectFromMemory(creep.memory, this.PATH, this.isContainerFullPredicate());
        if (!target) {
            var targets = creep.room.find(FIND_STRUCTURES)
                .filter((structure) => ((this.structureType && this.structureType === structure.structureType) || (!this.structureType)))
                .filter((s)=>(this.isContainerFullPredicate())(s));

            if (targets.length > 0) {
                target = this.setTarget(creep, creep.pos.findClosestByPath(targets));
            }
        }
        if (target) {
            // try transfering/moving
            let ret = creep.transfer(target, this.resource);
            if (ret == ERR_NOT_IN_RANGE && creep.fatigue == 0) {
                ret = creep.moveTo(target);
                if (ret == ERR_NO_PATH) {
                    creep.log("no path to target");
                    delete creep.memory[this.PATH];
                    target = null;
                }
            }

        }
        // creep.log('source', null == source);
        return (target ? this : null);
    }

    isContainerFullPredicate() {
        return (c)=> (c.energy < c.energyCapacity);
    }
}

module.exports = DropToEnergyStorageStrategy;