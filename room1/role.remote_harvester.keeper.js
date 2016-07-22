var _ = require('lodash');
var util = require('./util');
var RemoteHealStrategy = require('./strategy.remote_heal');
var RoleRemoteHarvester = require('./role.remote_harvester');
var HarvestKeeperSourceToContainerStrategy = require('./strategy.harvest_keepersource_to_container');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');

class RoleRemoteHarvesterKeeper extends RoleRemoteHarvester {
    constructor() {
        super();
        this.fleeStrategy = new AvoidRespawnStrategy(-1);
        this.healStrategy = new RemoteHealStrategy(1/*, (creep)=>((c)=>(creep.id ===c.id && creep.hits +this.healingCapacity(creep) < creep.hitsMax)) || creep.id !==c.id */);
        this.harvestStrategy = new HarvestKeeperSourceToContainerStrategy();
        super.loadStrategies = [this.harvestStrategy];
        
    }
    /** @param {Creep} creep **/
    run(creep) {
        // creep.log(creep.hits +this.healingCapacity(creep),creep.hitsMax)
        this.healStrategy.accepts(creep);
        if (creep.hits + util.healingCapacity(creep) < creep.hitsMax) {
            if (this.fleeStrategy.accepts(creep)) {
                this.harvestStrategy.SOURCE_PATH = 'source';
                this.harvestStrategy.CONTAINER_PATH = 'container';
                this.harvestStrategy.PATH_TO_SOURCE_PATH = 'pathToSource';

                util.release(creep, creep.memory[this.harvestStrategy.SOURCE_PATH], 'harvest');
                util.release(creep, creep.memory[this.harvestStrategy.CONTAINER_PATH], 'harvest');
                delete creep.memory[this.harvestStrategy.SOURCE_PATH];
                delete creep.memory[this.harvestStrategy.CONTAINER_PATH];
                delete creep.memory[this.harvestStrategy.PATH_TO_SOURCE_PATH];
            }
        } else  if (!this.fleeStrategy.accepts(creep)) {
            super.run(creep);
        }
    }

}

module.exports = RoleRemoteHarvesterKeeper;