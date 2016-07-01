var util = require('./util');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class LoadFromContainerStrategy {
    constructor(resource, structure) {
        if (!resource) resource = RESOURCE_ENERGY;
        // if (!structure) structure = STRUCTURE_CONTAINER;
        this.structure = structure;
        this.resource = resource;
        this.PATH = 'containerSource';
    }
    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }
    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        let source = util.objectFromMemory(creep.memory, this.PATH, (c)=>c.store[this.resource] > 0);
        if (!source) {
            // creep.log('LoadFromContainerStrategy', 'finding source');
            delete creep.memory[this.PATH]; 
            // find a new source
            var allSources = creep.room.find(FIND_STRUCTURES,
                {filter: (s) =>(this.structure?(s.structureType == this.structure ) : true) && s.store && (s.store[this.resource] > 0)});
            // creep.log('LoadFromContainerStrategy', 'finding source', 'allSources',allSources.length);

            var fullSources = _.filter(allSources, (s) => s.store[this.resource] > creep.carryCapacity);
            // creep.log('LoadFromContainerStrategy', 'finding source', 'fullSources',allSources.length);
            var sources = fullSources.length > 0 ? fullSources : allSources;
            source = creep.pos.findClosestByRange(sources);
            if (source) {
                // creep.log('LoadFromContainerStrategy', 'finding source', 'chose',JSON.stringify(source.pos), source.store.energy);
                creep.memory.source = source.id;
                creep.memory.action = 'load';
            } else {
                // creep.log('LoadFromContainerStrategy', 'finding source', 'failed');
            }
        }
        if (source) {
            // creep.log('LoadFromContainerStrategy', 'loading',JSON.stringify(source.pos));
            // try transfering/moving
            let ret = source.transfer(creep, this.resource);
            // creep.log('LoadFromContainerStrategy', 'transfer ?', ret);
            if (ret == ERR_NOT_IN_RANGE) {

                ret = creep.moveTo(source);
                if (ret == ERR_NO_PATH) {
                    creep.log("no path to source");
                    delete creep.memory[this.PATH];
                }
            }
        }
        // creep.log('source', null == source);
        return source;
    }
}

module.exports = LoadFromContainerStrategy;