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
        this.predicate = predicate || ((creep)=>((s)=>true));
        this.PATH = 'containerTarget';
    }

    clearMemory(creep) {
        delete creep.memory.strategy[this.PATH];
    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        if (!creep.memory.strategy) {
            creep.memory.strategy = {};
        }
        /*
         creep.log('testing DropToContainerStrategy',this.resource, _.sum(creep.carry) === 0,
         this.resource === util.ANY_MINERAL && (_.sum(creep.carry)  ===  creep.carryEnergy),
         this.resource !== util.ANY_MINERAL && creep.carry[this.resource] ===0
         );
         */
        if (_.sum(creep.carry) === 0 ||
            (this.resource && (
                ( this.resource === util.ANY_MINERAL && (_.sum(creep.carry) === creep.carryEnergy))
                || (this.resource !== util.ANY_MINERAL && creep.carry[this.resource] === 0 )
            ))) {
            return null;
        } else if (this.structure === STRUCTURE_LINK && creep.carry.energy === 0) {
            return null;
        }

        let excludedContainers = this.getExcludedContainers(creep);
        let target = util.objectFromMemory(creep.memory.strategy, this.PATH, (c)=>_.sum(c.store) < c.storeCapacity && this.getExcludedContainers(creep).indexOf(c.id) < 0 && (this.predicate(creep))(c));
        if (!target) {
            // find a new target
            // creep.log('structure?', this.structure);
            let structureTypePredicate = this.structure ? ((s)=> s.structureType === this.structure) : ((s)=>true);
            let matchingStructures = creep.room.find(FIND_STRUCTURES, {filter: structureTypePredicate});
            // creep.log('matchingStructures ?', matchingStructures.length,matchingStructures.find((c)=>c.structureType === STRUCTURE_LAB));
            var allContainers =
                matchingStructures
                    .filter((s)=>(s.room.memory.harvestContainers || []).indexOf(s.id) < 0) // do not drop in harvest containers
                    .filter(this.predicate(creep));
            // creep.log('allCOntainers has storage ?', allContainers.find((c)=>c.structureType === STRUCTURE_STORAGE));
            // creep.log('1allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
            // creep.log('1allCOntainers has labs?', this.structure, allContainers.length, allContainers.find((c)=>c.structureType === STRUCTURE_LAB));
            let containersWithCapacity = allContainers.filter((s)=> s.energyCapacity || s.storeCapacity || s.mineralCapacity);
            // creep.log('1.5allCOntainers has labs?', this.structure, containersWithCapacity.find((c)=>c.structureType === STRUCTURE_LAB));
            allContainers = containersWithCapacity.filter((s) =>this.containerAccepts(creep, s) && excludedContainers.indexOf(s.id) < 0);// all containers
            // creep.log('2allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
            // creep.log('2allCOntainers has labs?', this.structure, allContainers.find((c)=>c.structureType === STRUCTURE_LAB));
            allContainers = allContainers.filter((s)=> this.containerFreeSpace(creep, s) > 0// !full
            && !this.isHarvestContainer(s));
            // creep.log('allContainers has storage ?', this.structure,allContainers.find((c)=>c.structureType === STRUCTURE_STORAGE));
            // creep.log('allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
/*
            if (this.structure === STRUCTURE_LAB) {
                creep.log('allContainers has lab ?', allContainers.find((c)=>c.structureType === STRUCTURE_LAB));
            }
*/
            var emptyEnoughContainers = _.filter(allContainers, (s) => this.containerFreeSpace(creep, s) >= (this.resource) ? creep.carry[this.resource] : _.sum(creep.carry));

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
            // creep.log('allContainers has lab ?', allContainers.find((c)=>c.structureType === STRUCTURE_LAB));
            var targets = emptyEnoughContainers.length > 0 ? emptyEnoughContainers : allContainers;
            target = creep.pos.findClosestByRange(targets);
            if (target) {
                // creep.log('target', target);
                creep.memory.strategy[this.PATH] = target.id;
            }
        }
        if (target) {
            // creep.log('target', JSON.stringify(target.pos), target.structureType);
            // try transfering/moving
            let ret;
            if (this.resource) {
                // creep.log('transfer', this.resource);
                if (this.resource === util.ANY_MINERAL) {
                    _.keys(creep.carry).forEach((r)=> ret = creep.transfer(target, r));
                } else {
                    ret = creep.transfer(target, this.resource);
                }
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
                    creep.log("no path to target");
                    delete creep.memory.strategy[this.PATH];
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

    isHarvestContainer(container) {
        return container.room && container.room.harvestContainers && (container.room.harvestContainers.indexOf(container.id) >= 0);
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
                accepts |= (container.mineralType === r) && container.mineralAmount < container.mineralCapacity;
            }

        });
        // creep.log('accepts?', container, accepts);
        return accepts;
    }

    /**
     *
     * @param creep
     * @param {StructureContainer|StructureLink|StructureStorage} container
     * @returns {*}
     */
    containerFreeSpace(creep, container) {
        let space = 0;
        if (creep.carry) {
            _.keys(creep.carry).forEach((resource)=> {
                if (RESOURCE_ENERGY === resource) {
                    // creep.log('energy space?');
                    space += (container.energyCapacity ? container.energyCapacity - container.energy : container.storeCapacity - _.sum(container.store));
                } else {
                    // creep.log('space?', resource);
                    space +=
                        container.mineralCapacity ?
                            ((container.mineralType === resource || container.mineralAmount === 0) ? container.mineralCapacity - container.mineralAmount : 0)  // labs only accept one resourceType
                            : container.storeCapacity - _.sum(container.store);
                }
            });
            // creep.log('freeSpace', container, space);
            return space;
        } else {
            if (container.store || container.mineralCapacity) {
                return (container.store && container.storeCapacity - _.sum(container.store))
                    || (container.mineralCapacity && container.mineralCapacity - container.mineralAmount);
            } else if (container.energyCapacity) {
                // if (creep.memory.role === 'mineralGatherer') creep.log('freeSpace?', container.energyCapacity - container.energy);
                return container.energyCapacity - container.energy;
            } else {
                creep.log('ERROR unknown container type', container);
            }
        }
    }
}

module.exports = DropToContainerStrategy;