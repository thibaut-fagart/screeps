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
        this.predicate = predicate || ((s)=>true);
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
        if (_.sum(creep.carry) === 0) {
            return null;
        } else if (this.structure === STRUCTURE_LINK && creep.carry.energy === 0) {
            return null;
        }

        let excludedContainers = this.getExcludedContainers(creep);
        let target = util.objectFromMemory(creep.memory.strategy, this.PATH, (c)=>_.sum(c.store) < c.storeCapacity && this.getExcludedContainers(creep).indexOf(c.id) < 0);
        if (!target) {
            // find a new target
            var allContainers =
                creep.room.find(FIND_STRUCTURES).filter(this.predicate);
            // creep.log('1allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
            allContainers = allContainers.filter((s)=> s.energyCapacity || s.store || s.mineralCapacity)
                .filter((s) =>(!this.structure || (s.structureType === this.structure)) && this.containerAccepts(creep, s) && excludedContainers.indexOf(s.id) < 0);// all containers
            // creep.log('2allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
            allContainers = allContainers
                .filter((s)=> this.containerFreeSpace(creep, s) > 0// !full
                && !this.isHarvestContainer(s));
            // creep.log('allCOntainers has storage ?', allContainers.find((c)=>c.structureType === STRUCTURE_STORAGE));
            // creep.log('allCOntainers has links?', allContainers.find((c)=>c.structureType === STRUCTURE_LINK));
            /*
             if (this.structure === STRUCTURE_LAB) {
             creep.log('allContainers has lab ?', allContainers.find((c)=>c.structureType === STRUCTURE_LAB));
             }
             */
            var emptyEnoughContainers = _.filter(allContainers, (s) => this.containerFreeSpace(creep, s) >= creep.carry[this.resource]);
            if ((creep.carry.energy == _.sum(creep.carry)) && (this.structureType === STRUCTURE_LINK || !this.structure)) {
                // creep.log('links allowed');
                let links = creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_LINK}});
                allContainers.concat(links);
                if (_.sum(links, (s)=>(s.energyCapacity - s.energy) >= creep.carry.energy)) {
                    emptyEnoughContainers = emptyEnoughContainers.concat(links);
                }
            }
            // creep.log('allCOntainers has storage ?', emptyEnoughContainers.find((c)=>c.structureType === STRUCTURE_STORAGE));
            var targets = emptyEnoughContainers.length > 0 ? emptyEnoughContainers : allContainers;
            target = creep.pos.findClosestByRange(targets);
            if (target) {
                creep.memory.strategy[this.PATH] = target.id;
            }
        }
        // creep.log('target', target);
        if (target) {
            // creep.log(target.structureType);
            // try transfering/moving
            if (target.structureType == STRUCTURE_LINK && (target.energyCapacity - target.energy) < creep.carry.energy && target.cooldown === 0) {
                let otherLinks = creep.room.find(FIND_STRUCTURES, {filter: (s)=> s.structureType == STRUCTURE_LINK && s.id != target.id});
                otherLinks = _.sortBy(otherLinks, (s)=>s.energy);
                for (let i = 0, sum = 0; i < otherLinks.length && sum < creep.carry.energy; i++) {
                    let otherLink = otherLinks[i];
                    let k = Math.min(otherLink.carryCapacity - otherLink.energy, creep.carry.energy);
                    // creep.log('otherLink', otherLink);
                    let ret = target.transferEnergy(otherLink, k);
                    sum += (ret == 0) ? k : 0;
                    // creep.log('link =>link', ret, k);
                }
            }
            let ret;
            if (this.resource) {
                // creep.log('transfer', this.resource);
                ret = creep.transfer(target, this.resource);
            } else {
                // creep.log('transfer all');
                _.keys(creep.carry).forEach((k)=> {
                    ret = creep.transfer(target, k);
                    if ([OK, ERR_NOT_IN_RANGE].indexOf(ret) < 0 && creep.room.name === 'E37S14') {
                        // creep.log('transfer?',target,JSON.stringify(creep.carry), ret);
                    }
                });
            }
            if (ret == ERR_NOT_IN_RANGE) {
                ret = creep.moveTo(target);
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
        return (container.structureType === STRUCTURE_LINK && creep.carry.energy > 0) || (container.structureType !== STRUCTURE_LINK);
    }

    /**
     *
     * @param creep
     * @param {StructureContainer|StructureLink|StructureStorage} container
     * @returns {*}
     */
    containerFreeSpace(creep, container) {
        if (container.store || container.mineralCapacity) {
            return (container.store && container.storeCapacity - _.sum(container.store))
                || (container.mineralCapacity && container.mineralCapacity - container.mineralAmount);
        } else if (container instanceof StructureLink) {
            let otherLinks = creep.room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_LINK && s !== container});
            if (otherLinks.length) {
                let mostEmptyLink = _.min(otherLinks, (l)=>l.energy);
                return 2 * container.energyCapacity - (mostEmptyLink.energy + container.energy);
            } else {
                return container.energyCapacity - container.energy;
            }
        } else if (container.energyCapacity ) {
            return container.energyCapacity - container.energy;
        } else {
            creep.log('ERROR unknown container type', container);
        }
    }
}

module.exports = DropToContainerStrategy;