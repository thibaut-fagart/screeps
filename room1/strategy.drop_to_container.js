var util = require('./util');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class DropToContainerStrategy {
    constructor(resource, structure) {
        if (!resource) resource = RESOURCE_ENERGY;
        if (!structure) structure = STRUCTURE_CONTAINER;
        this.structure = structure;
        this.resource = resource;
        this.PATH = 'containerTarget';
    }
    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }
    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        let target = util.objectFromMemory(creep.memory, this.PATH, (c)=>_.sum(c.store) < c.storeCapacity);
        if (!target) {
            // find a new target
            var allContainers = creep.room.find(FIND_STRUCTURES,
                {filter: (s) =>(!this.structure||(s.structureType == this.structure))
                                && (s.store &&_.sum(s.store)<s.storeCapacity)});

            var emptyEnoughContainers = _.filter(allContainers, (s) => s.storeCapacity >(_.sum(s.store) +creep.carry[this.resource]));
            var targets = emptyEnoughContainers.length > 0 ? emptyEnoughContainers : allContainers;
            target = creep.pos.findClosestByRange(targets);
            if (target) {
                creep.memory[this.PATH] = target.id;
            }
        }
        if (target) {
            // try transfering/moving
            let ret = creep.transfer(target, this.resource);
            if (ret == ERR_NOT_IN_RANGE) {
                ret = creep.moveTo(target);
                if (ret == ERR_NO_PATH) {
                    creep.log("no path to target");
                    delete creep.memory[this.PATH];
                }
            }
        }
        // creep.log('source', null == source);
        return target;
    }
}

module.exports = DropToContainerStrategy;