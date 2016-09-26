var _ = require('lodash');
var util = require('./util');
var RemoteHealStrategy = require('./strategy.remote_heal');
var RoleRemoteHarvesterKeeper = require('./role.remote_harvester.keeper');
var HarvestKeeperSourceToContainerStrategy = require('./strategy.harvest_keepersource_to_container');
var HarvestKeeperSourceStrategy = require('./strategy.harvest_keepersource');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');

class RoleRemoteMineralHarvesterKeeper extends RoleRemoteHarvesterKeeper {
    constructor() {
        super();
        this.harvestStrategy = new HarvestKeeperSourceToContainerStrategy(util.ANY_MINERAL);
        //this.harvestStrategy = new HarvestKeeperSourceStrategy();
        this.loadStrategies = [this.harvestStrategy ];
        util.indexStrategies(this.loadStrategies);

    }

}

require('./profiler').registerClass(RoleRemoteMineralHarvesterKeeper, 'RoleRemoteMineralHarvesterKeeper'); module.exports = RoleRemoteMineralHarvesterKeeper;