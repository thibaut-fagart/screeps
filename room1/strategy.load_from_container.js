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
        this.PATH_TO_SOURCE_PATH = 'containerPath';
    }

    clearMemory(creep) {
        delete creep.memory[LoadFromContainerStrategy.PATH];
    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        let neededCarry = creep.carryCapacity - _.sum(creep.carry);
        let source = util.objectFromMemory(creep.memory, LoadFromContainerStrategy.PATH, (c)=>this.containerQty(creep, c) > neededCarry);
        if (!source || this.containerQty(creep, source) < neededCarry) {
            source = this.findSource(creep, neededCarry, source);
        }
         //creep.log('source',source);

        if (source) {
            // creep.log('LoadFromContainerStrategy', 'loading',JSON.stringify(source.pos));
            // try transfering/moving
            if (source.transfer || source.transferEnergy) {
                this.transferFromSource(source, creep, neededCarry);
            } else {
                creep.log('source!transfer', source.structureType, source.prototype, JSON.stringify(source));
                return null;
            }

        }

        // creep.log(this.constructor.name , 'accepts?', null == source);
        return (!!source );

    }

    transferFromSource(source, creep, neededCarry) {
        let ret;
        // if (creep.room.name ==='E38S14') creep.log('transferFromSource', source);
        /*
         if (this.resource === LoadFromContainerStrategy.ANY_MINERAL) {
         creep.log('transfer from ', source.structureType, JSON.stringify(source.store));
         }
         */

        let resource = typeof this.resource === 'function' ? this.resource(creep) : this.resource;
        switch (resource) {
            case RESOURCE_ENERGY: {
                // ret = source.transferEnergy ? source.transferEnergy(creep) : source.transfer(creep, this.resource);
                ret = creep.withdraw(source, RESOURCE_ENERGY);
                break;
            }
            case LoadFromContainerStrategy.ANY_MINERAL : {
                let resource = _.keys(source.store).find((r)=> (r !== RESOURCE_ENERGY && source.store[r] > 0));
                ret = creep.withdraw(source, resource);
                break;

            }
            default: {
                ret = creep.withdraw(source, resource);
            }
        }
        // if (creep.room.name ==='E38S14') creep.log('movingToSource?', source.pos, ret);

        // let qty = Math.min(neededCarry, source.transferEnergy ? source.energy : source.store.energy);
        // let ret = (source.transferEnergy ? source.transferEnergy(creep, qty) : source.transfer(creep, this.resource, qty));
        // creep.log('LoadFromContainerStrategy', 'transfer ?', ret);
        if (ret == ERR_NOT_ENOUGH_RESOURCES || ret === ERR_NOT_ENOUGH_ENERGY) {
            // creep.log('transfer?', ret);
            delete creep.memory[LoadFromContainerStrategy.PATH];
        } else if (ret === ERR_NOT_IN_RANGE) {
            ret = util.moveTo(creep, source.pos, this.constructor.name + "Path");
            // ret = creep.moveTo(source);
            if (ret !== OK && ret !== ERR_TIRED) {
                creep.log("no path to source");
                delete creep.memory[LoadFromContainerStrategy.PATH];
            }
        } else if (ret == OK) {
            delete creep.memory[LoadFromContainerStrategy.PATH];
        }
    }

    /**
     *  looks for a container having enough resources in store to fill this creep
     * @param creep
     * @param neededCarry
     * @param source
     * @returns {*}
     */
    findSource(creep, neededCarry, source) {
        delete creep.memory[LoadFromContainerStrategy.PATH];
        // creep.log('LoadFromContainerStrategy', 'finding source');
        // find a new source, if no type specified, allow links if shared links have enough energy
        let containers = creep.room.findContainers();
        let allowSpawn = !creep.room.storage && containers.filter((s)=>s.structureType === STRUCTURE_CONTAINER && s.pos.findInRange(FIND_SOURCES).length==0).length ==0;
        let allSources = containers
            .filter((s)=>(this.structure ? (s.structureType === this.structure ) : true)
                && (!this.predicate || (this.predicate(creep))(s))
                && ((allowSpawn || (STRUCTURE_SPAWN !== s.structureType)  && STRUCTURE_EXTENSION !==s.structureType) || s.room.energyAvailable === s.room.energyCapacityAvailable)
                // }
            );
        // creep.log('allSources', allSources.length);
        // creep.log('allSources has storage ?',this.structure,  allSources.find((c)=>c.structureType === STRUCTURE_STORAGE));
        // if (creep.memory.role ==='mineralGatherer') creep.log('allSources has links?', allSources.find((c)=>c.structureType === STRUCTURE_LINK));
        // if (this.structure === STRUCTURE_LINK) creep.log('allSources?', allSources.length);
        // creep.log('allSources', allSources.length, _.filter(allSources, (s)=>s.structureType === STRUCTURE_LAB).length);
        // creep.log(this.constructor.name, 'storage ? ',_.find(allSources,(s)=>s.structureType ==STRUCTURE_STORAGE));

        let nonEmptySources = [];
            // _.filter(allSources, (s) => this.containerQty(creep, s));

        let fullEnoughSources =[];
            // _.filter(nonEmptySources, (s) => this.containerQty(creep, s) >= neededCarry);


        allSources.forEach((s)=> {
            let qty = this.containerQty(creep, s);
            if (qty > 0) {
                nonEmptySources.push(s);
                if (qty > neededCarry) {
                    fullEnoughSources.push(s);
                }
            }
        });

        // creep.log('fullEnoughSources?', JSON.stringify(_.countBy(fullEnoughSources.map((c)=>c.structureType))));
        // creep.log('nonEmptySources?', JSON.stringify(_.countBy(nonEmptySources.map((c)=>c.structureType))));
        if (fullEnoughSources.length ) {
            source = creep.pos.findClosestByRange(fullEnoughSources);
        } if (nonEmptySources.length){
            source = _.max(nonEmptySources, (s)=> this.containerQty(creep, s));
            // source = (-Infinity ===source)?undefined:source;
        } else {
            source = false;
        }
        // creep.log('LoadFromContainerStrategy', this.structure, 'fullEnoughSources',allSources.length);
        // creep.log('LoadFromContainerStrategy', this.structure, 'source',source);
        // var sources = fullEnoughSources.length > 0 ? fullEnoughSources : allSources;
        // source = creep.pos.findClosestByRange(sources);
        if (source) {
            // creep.log('LoadFromContainerStrategy', 'finding source', 'chose',JSON.stringify(source.pos), this.containerQty(creep,source));
            creep.memory[LoadFromContainerStrategy.PATH] = source.id;
            // creep.memory.action = 'load';
        } else {
            // creep.log('LoadFromContainerStrategy', 'finding source', 'failed');
        }
        return source;
    }

    /**
     * returns the quantity of resource this creep can pickup from this source
     * @param creep
     * @param structure
     * @returns {number}
     */
    containerQty(creep, structure) {
        let ret = 0;
        let resource = typeof this.resource === 'function' ? this.resource(creep) : this.resource;
        try {
            switch (resource) {
                case  RESOURCE_ENERGY :
                    ret = structure.store ? structure.store.energy : structure.energy;
                    break;

                case LoadFromContainerStrategy.ANY_MINERAL :
                    ret = structure.store ? _.sum(structure.store) - structure.store.energy : 0;
                    break;
                default:
                    ret = structure.mineralCapacity ?
                        (structure.mineralType === resource ? structure.mineralAmount : 0) // lab
                        : structure.store ? structure.store[resource] : 0;
                    break;
            }
            /*
             if (creep.room.name ==='E37S14' && this.resource === RESOURCE_ENERGY) {
             creep.log('qty?', s.structureType, this.resource, JSON.stringify(s.store), ret);
             }
             */
            return ret;
        } catch (e) {
            console.log(this.constructor.name, resource, structure.structureType);
            console.log(e.stack);
            throw e;
        }
    }
}
LoadFromContainerStrategy.ANY_MINERAL = util.ANY_MINERAL;
LoadFromContainerStrategy.PATH = 'containerSource';
module.exports = LoadFromContainerStrategy;