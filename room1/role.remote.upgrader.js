var RoleUpgrader = require('./role.upgrader');
var MoveToRoomTask = require('./task.move.toroom');
var FleeToHomeRoomStrategy = require('./strategy.flee.tohomeroom');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');

class RoleRemoteUpgrader extends RoleUpgrader{
    constructor() {
        super();
        // this.loadStrategies.push(new HarvestEnergySourceStrategy());
        // this.fleeStrategy = new FleeToHomeRoomStrategy();
        this.moveTask = new MoveToRoomTask('remoteupgrade');
    }
    resign(creep) {
   	}
    
    run(creep) {
        if (creep.room.find(FIND_MY_CREEPS,{filter:(c)=>c.memory.role  === 'harvester' || c.memory.role ==='remoteHarvester'}).length ===0) {
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
module.exports = RoleRemoteUpgrader;