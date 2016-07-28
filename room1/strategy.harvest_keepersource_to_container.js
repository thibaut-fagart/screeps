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
        let safeSources = _.filter(util.findSafeSources(creep.room, true), (s)=> {
            switch (this.resourceType) {
                case RESOURCE_ENERGY :
                    return s.energy;
                case util.ANY_MINERAL : return s.mineralAmount;
                default: {
                    return (this.resourceType ? this.mineralType === this.resourceType : true) && s.mineralAmount;
                }
            } 
        });
        // creep.log('safeSources', safeSources.length);
        return safeSources;
    }
}

module.exports = HarvestKeeperEnergySourceToContainerStrategy;
