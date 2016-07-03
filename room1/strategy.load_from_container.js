var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base'); 
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class LoadFromContainerStrategy extends BaseStrategy {
    constructor(resource, structure) {
        super();
        if (!resource) resource = RESOURCE_ENERGY;
        // if (!structure) structure = STRUCTURE_CONTAINER;
        this.structure = structure;
        this.resource = resource;
        this.PATH = 'containerSource';
    }
    /**
     *
     * @param {Object}state
     * @return {true|false}
     */
    acceptsState(state) {
        return super.acceptsState(state)
            && state.structure == this.structure
            && state.resource == this.resource;
    }
    saveState() {
        let s = super.saveState();
        s.structure = this.structure;
        s.resource = this.resource;
        return s;
    }
    
    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }
    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        let source = util.objectFromMemory(creep.memory, this.PATH, (c)=>c.store[this.resource] > 0);
        let neededCarry = creep.carryCapacity - _.sum(creep.carry);
        if (!source) {
            // creep.log('LoadFromContainerStrategy', 'finding source');
            delete creep.memory[this.PATH]; 
            // find a new source, if no type specified, allow links if shared links have enough energy
            let allSources = creep.room.find(FIND_STRUCTURES,
                {filter:
                    (s) =>
                        (this.structure?(s.structureType == this.structure ) : true)
                        && (s.store && (s.store[this.resource] > 0))
                });

            // creep.log('LoadFromContainerStrategy', 'finding source', 'allSources',allSources.length);
            // creep.log(this.constructor.name, 'storage ? ',_.find(allSources,(s)=>s.structureType ==STRUCTURE_STORAGE));

            var fullSources = _.filter(allSources, (s) => s.store[this.resource] >= neededCarry);
            if (this.structureType ==STRUCTURE_LINK || !this.structure) {
                // creep.log('links allowed');
                let links = creep.room.find(FIND_STRUCTURES, {filter:{structureType: STRUCTURE_LINK}});
                allSources.concat(links);
                if (_.sum(links, (s)=>s.energy)>=neededCarry) {
                    fullSources = fullSources.concat(links);
                }
            }

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
            if (source.structureType == STRUCTURE_LINK && source.energy < neededCarry) {
                let otherLinks = creep.room.find(FIND_STRUCTURES, {filter:(s)=> s.structureType== STRUCTURE_LINK && s.id != source.id});
                otherLinks = _.sortBy(otherLinks, (s)=>-s.energy);
                for (let i =0, sum= 0; i< otherLinks.length && sum < neededCarry; i++) {
                    let otherLink = otherLinks[i];
                    // creep.log('otherLink', otherLink,otherLink.cooldown,otherLink.energy,neededCarry);
                    if (otherLink.cooldown == 0) {
                        let k = otherLink.energy;
                        let ret = otherLink.transferEnergy(source, k);
                        sum += (ret == 0) ? k : 0;
                        // creep.log('link =>link', k,ret);
                    }
                }
            }
            let ret = (source.structureType == STRUCTURE_LINK?source.transferEnergy(creep):source.transfer(creep, this.resource));
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
        return (source?this:null);
        
    }
}

module.exports = LoadFromContainerStrategy;