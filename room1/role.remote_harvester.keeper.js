var _ = require('lodash');
var util = require('./util');
var RemoteHealStrategy = require('./strategy.remote_heal');
var RoleRemoteHarvester = require('./role.remote_harvester');
var HarvestKeeperSourceToContainerStrategy = require('./strategy.harvest_keepersource_to_container');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');

class RoleRemoteHarvesterKeeper extends RoleRemoteHarvester {
    constructor() {
        super();
        this.fleeStrategy = new AvoidRespawnStrategy();
        this.healStrategy = new RemoteHealStrategy(0);
        super.loadStrategies = [new HarvestKeeperSourceToContainerStrategy()];
    }
    healingCapacity(creep) {
        return creep.getActiveBodyparts(HEAL)*10;
    }
    /** @param {Creep} creep **/
    run(creep) {
        if (creep.hits +this.healingCapacity(creep) < creep.hitsMax) {
            this.healStrategy.accepts(creep);
        } else  if (!this.fleeStrategy.accepts(creep)) {
            super.run(creep);
        }
    }

}

module.exports = RoleRemoteHarvesterKeeper;