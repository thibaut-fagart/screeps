var util = require('./util');

/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestEnergySourceToContainerStrategy {
    constructor() {
        this.SOURCE_PATH = 'source';
        this.CONTAINER_PATH = 'source';
    }
    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    /** @param {Creep} creep
     * @return {Source|| null}**/
    accepts(creep) {
        // creep.log('HarvestEnergySourceToContainerStrategy');
        // creep.log('source', this.constructor.name);
        let source = util.objectFromMemory(creep.memory, this.SOURCE_PATH, (s)=> s instanceof Source);
        let container = util.objectFromMemory(creep.memory, this.CONTAINER_PATH, (s) =>  s instanceof StructureContainer && _.isEmpty(_.map(s.pos.findInRange(FIND_CREEPS), (c)=>c.id)));
        // creep.log('source', source);
        if (!source || ! container) {
            source = container = null;
            // precond, are there any containers ? any near a source ?
            let containersWithSources = creep.room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_CONTAINER && !_.isEmpty(s.pos.findInRange(FIND_SOURCES, 1))});
            // creep.log('containersWithSources', _.size(containersWithSources));
            let freeContainers = _.filter(containersWithSources, (c)=>_.isEmpty(c.pos.findInRange(FIND_CREEPS, 0)) || (c.pos.x == creep.pos.x && c.pos.y == creep.pos.y));
            // creep.log('freeContainers', freeContainers);
            container = creep.pos.findClosestByPath(freeContainers);
            // creep.log('container', container);
            if (container) {
                source = container.pos.findInRange(FIND_SOURCES, 1)[0];
            }
            // creep.log('source', source);

            if (source && container) {
                creep.memory[this.SOURCE_PATH] = source.id;
                creep.memory[this.CONTAINER_PATH] = container.id;
            }
            // creep.log('source', source);
            // creep.log('Container', container);
        }
        if (source && container) {
            // try transfering/moving
            if (!ERR_NOT_IN_RANGE == creep.moveTo(container)) {
                let ret = creep.harvest(source);
                // console.log("transfer ? ", ret, ", ", container.store[this.resource]);
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
            }
        }
        if (undefined === source || undefined === container) {
            return null;
        } else return source;
    }
}

module.exports = HarvestEnergySourceToContainerStrategy;
