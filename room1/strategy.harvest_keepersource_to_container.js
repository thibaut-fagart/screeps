var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestKeeperEnergySourceToContainerStrategy extends HarvestEnergySourceToContainerStrategy {
    constructor(resourceType) {
        super({resourceType: resourceType, nooverflow:true});
    }


    moveTo(creep, source) {
        return util.moveTo(creep, source.pos, undefined, {range: source.structureType ? 0: 1, ignoreHostiles: creep.memory.isFighter});
    }



    findSources(creep) {
        // creep.log('findSources');
        let sources = creep.room.find(FIND_SOURCES);
        if (creep.room.structures[STRUCTURE_EXTRACTOR].length>0) {
            sources = sources.concat(creep.room.find(FIND_MINERALS).filter(m=>m.mineralAmount>0));
        }
        // creep.log('raw sources', sources.length, sources.map(s=>s.id));
        if (creep.room.memory.sources) {
            // creep.log('only mining ', JSON.stringify(creep.room.memory.sources));
            let allowedSources = _.isString(creep.room.memory.sources) ? [creep.room.memory.sources] : creep.room.memory.sources;
            sources = sources.filter((s)=>allowedSources.indexOf(s.id) >= 0);
            // creep.log('subset ', sources.length , sources.map(s=>s.id));
        }
        sources = sources.filter((s)=> {
            // if (!this.resourceType) return true;
            switch (this.resourceType) {
                case RESOURCE_ENERGY :
                    return s.energy;
                case util.ANY_MINERAL :
                    return s.mineralAmount;
                default: {
                    return (this.resourceType ? this.mineralType === this.resourceType : true) && (s.mineralAmount || s.energyCapacity);
                }
            }
        });
        if (!creep.memory.isFighter) {
            sources = sources.filter((s)=>!s.pos.findInRange(FIND_HOSTILE_CREEPS, 4).find(c=>c.hostile));
        }
        // creep.log('safe subset ', sources.length, sources.map(s=>s.id));

        return sources;
    }
}

require('./profiler').registerClass(HarvestKeeperEnergySourceToContainerStrategy, 'HarvestKeeperEnergySourceToContainerStrategy'); module.exports = HarvestKeeperEnergySourceToContainerStrategy;
