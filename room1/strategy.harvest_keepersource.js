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
        let sources = creep.room.find(FIND_SOURCES).filter((s)=>s.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length ===0);
        // creep.log(sources.length);
        if (sources.length) {
            return creep.pos.findClosestByRange(sources);
            }
        return false;
    }
}

module.exports = HarvestKeeperSourceStrategy;