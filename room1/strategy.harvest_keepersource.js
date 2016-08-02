var _ = require('lodash');
var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestKeeperSourceStrategy extends HarvestEnergySourceStrategy {
    constructor() {
        super();
        this.PATH = 'source2';
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    findSource(creep, source) {
        let sources = creep.room.find(FIND_SOURCES).sort((s)=>-s.energy);
        if (sources.length) {
            let max = sources[0].energy;
            sources = creep.pos.findClosestByRange(_.filter(sources, (s)=> s.energy == max));
            if (sources && sources[0] && (sources[0].energy > creep.carryCapacity - _.sum(creep.carry))) {
                source = sources[0];
                // } else {
                //     source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            }
        }
        return source;
    }
}

module.exports = HarvestKeeperSourceStrategy;