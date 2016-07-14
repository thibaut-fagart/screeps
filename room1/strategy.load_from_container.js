var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class LoadFromContainerStrategy extends BaseStrategy {

    constructor(resource, structure, predicate) {
        super();
        if (!resource) resource = RESOURCE_ENERGY;
        // if (!structure) structure = STRUCTURE_CONTAINER;
        this.resource = resource;
        this.structure = structure;
        this.predicate = predicate;
        this.PATH = 'containerSource';
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        let neededCarry = creep.carryCapacity - _.sum(creep.carry);
        let source = util.objectFromMemory(creep.memory, this.PATH, (c)=>this.containerQty(creep,c) > neededCarry);
        if (!source) {
            source = this.findSource(creep, neededCarry, source);
        }
        if (source) {
            // creep.log('LoadFromContainerStrategy', 'loading',JSON.stringify(source.pos));
            // try transfering/moving
            if (source.structureType == STRUCTURE_LINK && source.energy < neededCarry) {
                let otherLinks = creep.room.find(FIND_STRUCTURES, {filter: (s)=> s.structureType == STRUCTURE_LINK && s.id != source.id});
                otherLinks = _.sortBy(otherLinks, (s)=>-s.energy);
                for (let i = 0, sum = 0; i < otherLinks.length && sum < neededCarry; i++) {
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
            if (source.transfer || source.transferEnergy) {
                this.transferFromSource(source, creep, neededCarry);
            } else {
                creep.log('source!transfer', source.structureType || source.prototype);
                return null;
            }

        }

        // creep.log('source', null == source);
        return (source ? this : null);

    }

    transferFromSource(source, creep, neededCarry) {
        let ret;
/*
        if (this.resource === LoadFromContainerStrategy.ANY) {
            creep.log('transfer from ', source.structureType, JSON.stringify(source.store));
        }
*/
        switch (this.resource) {
            case RESOURCE_ENERGY: {
                ret = source.transferEnergy ? source.transferEnergy(creep) : source.transfer(creep, this.resource);
                break;
            }
            case LoadFromContainerStrategy.ANY : {
                let resource = _.keys(source.store).find((r)=> RESOURCE_ENERGY !== r && source.store[r]>0);
                ret = source.transfer(creep, resource);
                break;

            }
            default: {
                ret = source.transfer(creep, this.resource);
            }
        }

        // let qty = Math.min(neededCarry, source.transferEnergy ? source.energy : source.store.energy);
        // let ret = (source.transferEnergy ? source.transferEnergy(creep, qty) : source.transfer(creep, this.resource, qty));
        // creep.log('LoadFromContainerStrategy', 'transfer ?', ret);
        if (ret == ERR_NOT_ENOUGH_RESOURCES || ret === ERR_NOT_ENOUGH_ENERGY) {
            creep.log('transfer?', ret);
            delete creep.memory[this.PATH];
        } else if (ret === ERR_NOT_IN_RANGE) {
            ret = creep.moveTo(source);
            if (ret == ERR_NO_PATH) {
                creep.log("no path to source");
                delete creep.memory[this.PATH];
            }
        } else if (ret == OK) {
            delete creep.memory[this.PATH];
        }
    }

    findSource(creep, neededCarry, source) {
        delete creep.memory[this.PATH];
        // creep.log('LoadFromContainerStrategy', 'finding source');
        // find a new source, if no type specified, allow links if shared links have enough energy
        let allSources = creep.room.find(FIND_STRUCTURES,
            {
                filter: (s) =>
                (this.structure ? (s.structureType == this.structure ) : true)
                && (!this.predicate || this.predicate(s))
                && (this.containerQty(creep,s))
            });
/*
        if (this.resource === LoadFromContainerStrategy.ANY) {
            creep.log('LoadFromContainerStrategy', this.structure, 'finding source', 'allSources',allSources.length);
        }
*/
        // creep.log(this.constructor.name, 'storage ? ',_.find(allSources,(s)=>s.structureType ==STRUCTURE_STORAGE));

        var fullEnoughSources = _.filter(allSources, (s) => this.containerQty(creep,s) >= neededCarry);
        var fullSources = _.filter(fullEnoughSources, (s) => this.containerQty(creep,s) == s.storeCapacity);
        // creep.log('full', fullEnoughSources.length, fullSources.length);

        if (this.structureType == STRUCTURE_LINK || !this.structure) {
            // creep.log('links allowed');
            let links = creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LINK}});
            allSources.concat(links);
            if (_.sum(links, (s)=>s.energy) >= neededCarry) {
                fullEnoughSources = fullEnoughSources.concat(links);
            }
        }
        if (fullSources.length > 0) {
            source = creep.pos.findClosestByRange(fullSources);
        } else if (fullEnoughSources.length > 0) {
            source = creep.pos.findClosestByRange(fullEnoughSources);
        } else {
            source = _.sortBy(allSources, (s)=>-1 * this.containerQty(creep,s))[0];
        }
        // creep.log('LoadFromContainerStrategy', this.structure, 'fullEnoughSources',allSources.length);
        // creep.log('LoadFromContainerStrategy', this.structure, 'source',source);
        // var sources = fullEnoughSources.length > 0 ? fullEnoughSources : allSources;
        // source = creep.pos.findClosestByRange(sources);
        if (source) {
            // creep.log('LoadFromContainerStrategy', 'finding source', 'chose',JSON.stringify(source.pos), source.store.energy);
            creep.memory[this.PATH] = source.id;
            // creep.memory.action = 'load';
        } else {
            // creep.log('LoadFromContainerStrategy', 'finding source', 'failed');
        }
        return source;
    }

    containerQty(creep,s) {
        try {
            let ret =0;
            switch (this.resource) {
                case  RESOURCE_ENERGY :
                    ret = s.store ? s.store.energy : s.energy; break;

                case LoadFromContainerStrategy.ANY :
                    ret = s.store ? _.sum(s.store)- s.store.energy  : 0; break;
                default:
                    ret = s.store[this.resource];
                    break;
            }
/*
            if (creep.room.name ==='E37S14' && this.resource === RESOURCE_ENERGY) {
                creep.log('qty?', s.structureType, this.resource, JSON.stringify(s.store), ret);
            }
*/
            return ret;
        } catch (e) {
            console.log(this.constructor.name, this.resource, s.structureType);
            console.log(e.stack);
            throw e;
        }
    }
}
LoadFromContainerStrategy.ANY = 'any';

module.exports = LoadFromContainerStrategy;