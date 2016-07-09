var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestEnergySourceToContainerStrategy extends BaseStrategy {
    constructor() {
        super();
        this.SOURCE_PATH = 'source';
        this.CONTAINER_PATH = 'container';
    }

    clearMemory(creep) {
        delete creep.memory[this.SOURCE_PATH];
        delete creep.memory[this.CONTAINER_PATH];
    }

    /** @param {Creep} creep
     * @return {Source|| null}**/
    accepts(creep) {
        // creep.log('HarvestEnergySourceToContainerStrategy');
        // creep.log('source', this.constructor.name);
        let source = util.objectFromMemory(creep.memory, this.SOURCE_PATH, (s)=> s instanceof Source);
        let container = util.objectFromMemory(creep.memory, this.CONTAINER_PATH, (s) => s instanceof StructureContainer && !util.isReserved(creep, s, 'harvest'));
        // creep.log('source', source);
        if (!source || !container) {
            // find a source, with a free container near it, and reserve it
            // else find a source, without a used container near it
            source = container = null;
            // precond, are there any containers ? any near a source ?
            let containersWithSources = creep.room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_CONTAINER && !_.isEmpty(s.pos.findInRange(FIND_SOURCES, 1))});
            // creep.log('containersWithSources', _.size(containersWithSources));
            // let creepsInRange = _.map(containersWithSources, (c)=>c.pos.findInRange(FIND_CREEPS, 0));
            // creep.log('creepsInRang',creepsInRange);
/*
            let freeContainers = _.filter(containersWithSources, (c)=>{return c.pos.findInRange(FIND_CREEPS, 0,
                            {filter:(c)=> ['harvester','remoteHarvester'].indexOf(c.memory.role)<0 || (c.name && creep.name)}).length == 0}) ;
*/
            let freeContainers = _.filter(containersWithSources, (c)=> !util.isReserved(creep,c, 'harvest')) ; // TODO
            // creep.log('freeContainers', freeContainers);
            if (freeContainers.length) {
                container = creep.pos.findClosestByPath(freeContainers);
                source = container.pos.findInRange(FIND_SOURCES, 1)[0];
                // creep.log('container', container);
            } else if (creep.getActiveBodyparts(CARRY)==0){
                let freeSources = creep.room.find(FIND_SOURCES, {filter: (s) => _.isEmpty(s.pos.findInRange(FIND_STRUCTURES, 1, {filter:{structureType:STRUCTURE_CONTAINER}}))});
                source = freeSources[0];

            }
            if (source) {
                creep.memory[this.SOURCE_PATH] = source.id;
            }
            if (container && util.reserve(creep, container, 'harvest')) {
                // creep.log('source && container');

                creep.memory[this.CONTAINER_PATH] = container.id;
                if (creep.room.memory.harvestContainers && creep.room.memory.harvestContainers.indexOf(container.id) <0) {
                    creep.room.memory.harvestContainers.push(container.id);
                }
            }
            // creep.log('source', source);
            // creep.log('Container', container);
        }
        if (source && container) {
            if (creep.pos.getRangeTo(container.pos)==0) {
                // creep.log('on container');
                if (creep.carryCapacity && creep.carry.energy
                    && (container.hits < 0.1 * container.hitsMax ||source.energy ===0)) {
                    let repair = creep.repair(container);
                    creep.log('repairing container?', repair);
                    if (repair === OK) return true;
                }
                let freeCapacity = container.storeCapacity - _.sum(container.store);
                let harvestBeforeRegen = source.ticksToRegeneration * 2 * creep.getActiveBodyparts(WORK);
                // creep.log(source.energy == source.energyCapacity, freeCapacity, harvestBeforeRegen);
                if (source.energy == source.energyCapacity || freeCapacity >0 // no overflow
                    || harvestBeforeRegen <= source.energy) {// will we deplete energy before regen ?
                    let ret = creep.harvest(source);
                } else {
                    // creep.log('container full, avoiding spoilage', source.ticksToRegeneration, harvestBeforeRegen, source.energy);
                    // creep.log(JSON.stringify(source));

                }
                // creep.log("transfer ? ", ret, ", ", container.store[this.resource]);
                /*
                 if (ret == ERR_NOT_IN_RANGE) {
                 console.log(creep.name, " moving to source");
                 ret = creep.moveTo(container);
                 if (ret == ERR_NO_PATH) {
                 creep.log("no path to source");
                 delete creep.memory[this.PATH];
                 }
                 }
                 */
            } else {
                let moveTo = creep.moveTo(container);
                // creep.log('moveTo?', moveTo);
                if (ERR_INVALID_TARGET === moveTo || ERR_NO_PATH === moveTo) {
                    creep.log('unreachable? switching targets');
                    this.clearMemory(creep);
                }
            }
            // try transfering/moving
            // creep.log('moving');
        } else if (source) {
            if (!ERR_NOT_IN_RANGE == creep.moveTo(source)) {
                let ret = creep.harvest(source);
            }
            if (!(Game.time%25)) {
                delete creep.memory.source;
            }
        }
        /*if (creep.memory.role =='remoteHarvester') {
         creep.log(source,container, undefined === source || undefined === container)
         }*/
        return (undefined !== source && undefined !== container);

    }
}

module.exports = HarvestEnergySourceToContainerStrategy;
