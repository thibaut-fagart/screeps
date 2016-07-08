var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base'); 
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class DropToContainerStrategy extends BaseStrategy{
    constructor(resource, structure) {
        super();
        if (!resource) resource = RESOURCE_ENERGY;
        if (!structure) structure = STRUCTURE_CONTAINER;
        this.structure = structure;
        this.resource = resource;
        this.PATH = 'containerTarget';
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
        let excludedContainers = this.getExcludedContainers(creep);
        let target = util.objectFromMemory(creep.memory, this.PATH, (c)=>_.sum(c.store) < c.storeCapacity && this.getExcludedContainers(creep).indexOf(c.id)<0);
        if (!target) {
            // find a new target
            var allContainers =
                _.filter(creep.room.find(FIND_STRUCTURES, {filter: (s) =>(!this.structure||(s.structureType == this.structure)) && excludedContainers.indexOf(s.id) <0})// all containers
                    ,(s)=> (s.store &&_.sum(s.store)<s.storeCapacity) // !full
                            && !this.isHarvestContainer(s)
                );

            var emptyEnoughContainers = _.filter(allContainers, (s) => s.storeCapacity >(_.sum(s.store) +creep.carry[this.resource]));
            if (this.structureType ==STRUCTURE_LINK || !this.structure) {
                creep.log('links allowed');
                let links = creep.room.find(FIND_STRUCTURES, {filter:{structureType: STRUCTURE_LINK}});
                allContainers.concat(links);
                if (_.sum(links, (s)=>(s.energyCapacity - s.energy)>=creep.carry.energy)) {
                    emptyEnoughContainers = emptyEnoughContainers.concat(links);
                }
            }
            var targets = emptyEnoughContainers.length > 0 ? emptyEnoughContainers : allContainers;
            target = creep.pos.findClosestByRange(targets);
            if (target) {
                creep.memory[this.PATH] = target.id;
            }
        }
        if (target) {
            // creep.log(target.structureType);
            // try transfering/moving
            if (target.structureType == STRUCTURE_LINK && (target.energyCapacity -target.energy) < creep.carry.energy) {
                let otherLinks = creep.room.find(FIND_STRUCTURES, {filter:(s)=> s.structureType== STRUCTURE_LINK && s.id != target.id});
                otherLinks = _.sortBy(otherLinks, (s)=>s.energy);
                for (let i =0, sum= 0; i< otherLinks.length && sum < creep.carry.energy; i++) {
                    let otherLink = otherLinks[i];
                    if (target.cooldown == 0) {
                        let k = Math.min(otherLink.carryCapacity - otherLink.energy, creep.carry.energy);
                        // creep.log('otherLink', otherLink);
                        let ret = target.transferEnergy(otherLink, k);
                        sum += (ret == 0) ? k : 0;
                        // creep.log('link =>link', ret, k);
                    }
                }
            }
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
        return (target?this:null);
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
}

module.exports = DropToContainerStrategy;