var _ = require('lodash');
var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestKeeperSourceStrategy extends HarvestEnergySourceStrategy {
    constructor(resource) {
        super(resource);
        this.PATH = 'source2';
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    findSource(creep, source) {

        let sources = creep.room.find(FIND_SOURCES);
        if (this.resource !== RESOURCE_ENERGY && creep.room.structures[STRUCTURE_EXTRACTOR].length) {
            sources = sources.concat(creep.room.find(FIND_MINERALS));
        }
        // creep.log('raw sources', sources.length);
        if (creep.room.memory.sources) {
            // creep.log('only mining ', JSON.stringify(creep.room.memory.sources));
            let allowedSources = _.isString(creep.room.memory.sources) ? [creep.room.memory.sources] : creep.room.memory.sources;
            sources = sources.filter((s)=>allowedSources.indexOf(s.id) >= 0);
            // creep.log('subset ', sources.length);
        }
        sources = sources.filter((s)=>s.pos.findInRange(FIND_HOSTILE_CREEPS, 4).filter(c=>c.hostile).length === 0);
        // creep.log('safe subset ', sources.length);

        if (sources.length) {
            return sources.length ===1 ? sources[0]: creep.pos.findClosestByRange(sources);
        }
        return false;
    }

    isFull(creep) {
        return false;
    }
}

require('./profiler').registerClass(HarvestKeeperSourceStrategy, 'HarvestKeeperSourceStrategy'); module.exports = HarvestKeeperSourceStrategy;