var util = require('./util');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class LoadFromContainerStrategy {
    constructor(resource) {
        if (!resource) resource = RESOURCE_ENERGY;
        this.resource = resource;
        this.PATH = 'containerSource';
    }

    /** @param {Creep} creep
     * @return {StructureContainer|| null}**/
    accepts(creep) {
        let source = util.objectFromMemory(creep.memory, this.PATH, (c)=>c.store[this.resource] > 0);
        if (!source) {
            delete creep.memory[this.PATH];
            // find a new source
            var allSources = creep.room.find(FIND_STRUCTURES,
                {filter: (s) =>(s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE)
                                && s.store[this.resource] > 0});
            var fullSources = _.filter(allSources, (s) => s.store[this.resource] > creep.carryCapacity);
            var sources = fullSources.length > 0 ? fullSources : allSources;
            source = creep.pos.findClosestByRange(sources);
            if (source) {
                creep.memory.source = source.id;
                creep.memory.action = 'load';
            } else {
                creep.log('no container');
            }
        }
        if (source) {
            // try transfering/moving
            let ret = source.transfer(creep, this.resource);
            if (ret == ERR_NOT_IN_RANGE) {
                ret = creep.moveTo(source);
                if (ret == ERR_NO_PATH) {
                    creep.log("no path to source");
                    delete creep.memory[this.PATH];
                }
            }
        }
        return source;
    }
}

module.exports = LoadFromContainerStrategy;