var RoleUpgrader = require('./role.upgrader');
var MoveToRoomTask = require('./task.move.toroom');
var LootContainerStrategy = require('./strategy.loot_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');

class RoleRemoteUpgrader extends RoleUpgrader{
    constructor() {
        super();
        this.loadStrategies.push(new LootContainerStrategy(RESOURCE_ENERGY));
        // this.fleeStrategy = new FleeToHomeRoomStrategy();
        this.moveTask = new MoveToRoomTask('remoteupgrade');
        require('./util').indexStrategies(this.loadStrategies);
    }
    resign(creep) {
   	}
    
    run(creep) {
        if (!(creep.room.find(FIND_MY_CREEPS).find(c=>c.memory.role  === 'harvester' || c.memory.role ==='remoteHarvester'))) {
            this.loadStrategies.push(new HarvestEnergySourceStrategy());
        }
        // if (this.fleeStrategy.accepts(creep)) {return;}

        let accepts = this.moveTask.accepts(creep);
        if (!accepts  && creep.memory.remoteRoom === creep.room.name) {
            // creep.log('building');
            return super.run(creep);
        } else {
            // creep.log('moving to room');
        }
    }
}
require('./profiler').registerClass(RoleRemoteUpgrader, 'RoleRemoteUpgrader'); module.exports = RoleRemoteUpgrader;