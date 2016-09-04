var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestKeeperEnergySourceToContainerStrategy extends HarvestEnergySourceToContainerStrategy {
    constructor(resourceType) {
        super(resourceType);
    }


    findSources(creep) {

        let sources = creep.room.find(FIND_SOURCES);
        if (creep.room.find(FIND_STRUCTURES).filter((s)=>s.structureType === STRUCTURE_EXTRACTOR).length) {
            sources = sources.concat(creep.room.find(FIND_MINERALS));
        }
        // creep.log('raw sources', sources.length);
        if (creep.room.memory.sources) {
            // creep.log('only mining ', JSON.stringify(creep.room.memory.sources));
            let allowedSources = _.isString(creep.room.memory.sources) ? [creep.room.memory.sources] : creep.room.memory.sources;
            sources = sources.filter((s)=>allowedSources.indexOf(s.id) >= 0);
            // creep.log('subset ', sources.length);
        }
        sources = sources.filter((s)=>s.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length === 0);
        // creep.log('safe subset ', sources.length);

        return sources;
    }
}

module.exports = HarvestKeeperEnergySourceToContainerStrategy;
