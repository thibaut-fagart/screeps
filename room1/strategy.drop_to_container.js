var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class DropToContainerStrategy extends BaseStrategy {
    constructor(resource, structure, predicate) {
        super();
        this.structure = structure;
        this.resource = resource;
        this.predicate = predicate || (()=>(()=>true));
        this.PATH = 'containerTarget';
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    droppableQty(creep) {
        return _.sum(_.pairs(creep.carry),(pair)=>this.isAllowed(creep, pair[0])? pair[1]:0);
    }
    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        /*
         creep.log('testing DropToContainerStrategy',this.resource, _.sum(creep.carry) === 0,
         this.resource === util.ANY_MINERAL && (_.sum(creep.carry)  ===  creep.carryEnergy),
         this.resource !== util.ANY_MINERAL && creep.carry[this.resource] ===0
         );
         */
        if (_.sum(creep.carry) === 0 ||!_.keys(creep.carry).find((r)=>this.isAllowed(creep,r))) {
            return null;
        } else if (this.structure === STRUCTURE_LINK && creep.carry.energy === 0) {
            return null;
        }

        let excludedContainers = this.getExcludedContainers(creep);
        let target = util.objectFromMemory(creep.memory, this.PATH, (c)=>_.sum(c.store) < c.storeCapacity && this.getExcludedContainers(creep).indexOf(c.id) < 0 && (this.predicate(creep))(c));
        if (!target) {
            // find a new target
            // creep.log('structure?', this.structure);
            let structureTypePredicate = this.structure ? ((s)=> s.structureType === this.structure) : (()=>true);
            let matchingStructures = creep.room.find(FIND_STRUCTURES, {filter: structureTypePredicate});
            // creep.log('matchingStructures ?', matchingStructures.length,matchingStructures.find((c)=>c.structureType === STRUCTURE_STORAGE));
            var allContainers =
                matchingStructures
                    .filter((s)=>!s.room.isHarvestContainer(s)) // do not drop in harvest containers
                    .filter(this.predicate(creep));
            // creep.log('allCOntainers has storage ?', allContainers.find((c)=>c.structureType === STRUCTURE_STORAGE));
            // creep.log('1allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
            // creep.log('1allCOntainers has labs?', this.structure, allContainers.length, allContainers.filter((c)=>c.structureType === STRUCTURE_LAB).length);
            let containersWithCapacity = allContainers.filter((s)=> s.energyCapacity || s.storeCapacity || s.mineralCapacity);
            // creep.log('1.5allCOntainers has labs?', this.structure, containersWithCapacity.filter((c)=>c.structureType === STRUCTURE_LAB).length);
            // creep.log('1.5allCOntainers has storage?', this.structure, containersWithCapacity.filter((c)=>c.structureType === STRUCTURE_STORAGE).length);
            allContainers = containersWithCapacity.filter((s) =>this.containerAccepts(creep, s) && excludedContainers.indexOf(s.id) < 0);// all containers
            // creep.log('2allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
            // creep.log('2allCOntainers has labs?', this.structure, allContainers.filter((c)=>c.structureType === STRUCTURE_LAB).length);
            allContainers = allContainers.filter((s)=> this.containerFreeSpace(creep, s) > 0// !full
                && !s.room.isHarvestContainer(s));
            // creep.log('allContainers has storage ?', this.structure,allContainers.find((c)=>c.structureType === STRUCTURE_STORAGE));
            // creep.log('allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
            // creep.log('allContainers has lab ?', allContainers.filter((c)=>c.structureType === STRUCTURE_LAB).length);

            var emptyEnoughContainers = _.filter(allContainers, (s) => this.containerFreeSpace(creep, s) >= this.droppableQty(creep));

            /*
             if ((creep.carry.energy == _.sum(creep.carry)) && (this.structureType === STRUCTURE_LINK || !this.structure)) {
             let links = creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LINK}});
             let sum2 = _.sum(links, (s)=>(s.energyCapacity - s.energy));
             // creep.log('links allowed', JSON.stringify(links.map((l)=>({'e':l.energy, 'c':l.cooldown}))), sum2);
             if (sum2 >= creep.carry.energy) {
             emptyEnoughContainers = emptyEnoughContainers.concat(links.filter((l)=>l.cooldown === 0));
             // allContainers.concat(links);
             }
             }
             */
            // creep.log('emptyEnoughContainers has lab ?', emptyEnoughContainers.find((c)=>c.structureType === STRUCTURE_LAB));
            // creep.log('emptyEnoughContainers has lab ?', emptyEnoughContainers.filter((c)=>c.structureType === STRUCTURE_LAB).length);
            var targets = emptyEnoughContainers.length > 0 ? emptyEnoughContainers : allContainers;
            target = creep.pos.findClosestByRange(targets);
            if (target) {
                // creep.log('target', target);
                creep.memory[this.PATH] = target.id;
            }
        }
        if (target) {
            // creep.log('target', JSON.stringify(target.pos), target.structureType);
            // try transfering/moving
            let ret;
            if (this.resource) {
                // creep.log('transfer', this.resource);
                _.keys(creep.carry).forEach((r)=> {
                    if (this.isAllowed(creep, r)) ret = creep.transfer(target, r);
                });
            } else {
                // creep.log('transfering any');
                if (target.store) {
                    // creep.log('transfer all');
                    _.keys(creep.carry).forEach((k)=> {
                        ret = creep.transfer(target, k);
                        if ([OK, ERR_NOT_IN_RANGE].indexOf(ret) < 0 && creep.room.name === 'E37S14') {
                            // creep.log('transfer?', target, JSON.stringify(creep.carry), ret);
                        }
                    });
                } else if (target.energy < target.energyCapacity && creep.carry.energy) {
                    // creep.log('transfer energy');
                    ret = creep.transfer(target, RESOURCE_ENERGY);
                    if ([OK, ERR_NOT_IN_RANGE].indexOf(ret) < 0 && creep.room.name === 'E37S14') {
                        // creep.log('transfer?', target, JSON.stringify(creep.carry), ret);
                    }
                } else if (target.mineralAmount < target.mineralCapacity) {
                    // creep.log('transfering minerals');
                    _.keys(creep.carry).forEach((r)=> {
                        if (r !== RESOURCE_ENERGY) {
                            // creep.log('transfering', target, r);
                            ret = creep.transfer(target, r);
                        }
                    });
                    if ([OK, ERR_NOT_IN_RANGE].indexOf(ret) < 0 && creep.room.name === 'E37S14') {
                        creep.log('transfer?', target, JSON.stringify(creep.carry), ret);
                    }
                }
            }
            // creep.log('transfer?', ret);
            if (ret == ERR_NOT_IN_RANGE) {
                ret = util.moveTo(creep, target.pos, this.constructor.name + 'Path');
                if (ret == ERR_NO_PATH) {
                    creep.log('no path to target');
                    delete creep.memory[this.PATH];
                }
            }
        }
        // creep.log('source', null == source);
        return (target ? this : null);
    }

    getExcludedContainers(creep) {
        let excludedContainers = [];
        let sourceContainerId = creep.memory['containerSource'];
        if (sourceContainerId) excludedContainers.push(sourceContainerId);
        if (creep.room.memory.harvestContainers) excludedContainers = excludedContainers.concat(creep.room.memory.harvestContainers);
        return excludedContainers;
    }

    containerAccepts(creep, container) {
        let accepts = false;
        _.keys(creep.carry).forEach((r)=> {
            if (r === RESOURCE_ENERGY && container.energyCapacity && container.energy < container.energyCapacity) {
                // creep.log('energy', container.energyCapacity && container.energy < container.energyCapacity);
                accepts |= true;
            } else if (container.storeCapacity) {
                // creep.log('container', (container.storeCapacity - _.sum(container.store)) > 0)
                accepts |= (container.storeCapacity - _.sum(container.store)) > 0;
            } else {
                // creep.log('lab', (!container.mineralType || container.mineralType === r), container.mineralAmount < container.mineralCapacity)
                accepts |= (container.mineralType === r) && container.mineralAmount < container.mineralCapacity || (container.room.memory['labs'] && container.room.memory['labs'][container.id] === r);
            }

        });
        // creep.log('accepts?', container, accepts);
        return accepts;
    }

    isAllowed(creep, resource) {
        let theResource = _.isFunction(this.resource) ? this.resource(creep) : this.resource;
        return !theResource
            || (theResource === util.ANY_MINERAL && resource !== RESOURCE_ENERGY)
            || theResource === resource;
    }
    /**
     *
     * @param creep
     * @param {StructureContainer|StructureLink|StructureStorage} container
     * @returns {*}
     */
    containerFreeSpace(creep, container) {
        let space = 0;
        // creep.log('freeSpace for ', container, this.resource);
        if (creep.carry) {
            _.keys(creep.carry).filter((r)=>this.isAllowed(creep, r)).forEach((resource)=> {
                if (RESOURCE_ENERGY === resource) {
                    let resourceSpace = (container.energyCapacity ? container.energyCapacity - container.energy : container.storeCapacity - _.sum(container.store));
                    // creep.log('energy space?', resource, resourceSpace);
                    space += resourceSpace;
                } else {
                    let resourceSpace = container.mineralCapacity ?
                        ((container.mineralType === resource || container.mineralAmount === 0) ? container.mineralCapacity - container.mineralAmount : 0)  // labs only accept one resourceType
                        : container.storeCapacity - _.sum(container.store);
                    // creep.log('mineral space?', resource, resourceSpace);
                    space += resourceSpace;
                    // creep.log('space?', resource);
                }
            });
            // creep.log('freeSpace', container, space);
            return space;
        } else {
            let spaces = [];
            if (container.store || container.mineralCapacity) {
                spaces.push((container.store && container.storeCapacity - _.sum(container.store))
                    || (container.mineralCapacity && container.mineralCapacity - container.mineralAmount));
            }
            if (container.energyCapacity) {
                // if (creep.memory.role === 'mineralGatherer') creep.log('freeSpace?', container.energyCapacity - container.energy);
                spaces.push(container.energyCapacity - container.energy);
            }
            if (spaces.length) return _.max(spaces);
            else {
                creep.log('ERROR unknown container type', container);
                return 0;
            }
        }
    }
}

module.exports = DropToContainerStrategy;