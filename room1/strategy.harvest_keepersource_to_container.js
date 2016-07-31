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
}

module.exports = HarvestKeeperEnergySourceToContainerStrategy;
