var RoleBuilder = require('./role.builder');
var MoveToRoomTask = require('./task.move.toroom');
var FleeToHomeRoomStrategy = require('./strategy.flee.tohomeroom');

class RoleRemoteBuilder extends RoleBuilder {
    constructor() {
        super();
        this.fleeStrategy = new FleeToHomeRoomStrategy();
        this.moveTask = new MoveToRoomTask();
    }
    resign(creep) {
        
   	}
    
    run(creep) {
        if (this.fleeStrategy.accepts(creep)) {return;}

        let accepts = this.moveTask.accepts(creep);
        if (!accepts) {
            // creep.log('building');
            return super.run(creep);
        } else {
            // creep.log('moving to room');
        }
    }
}
module.exports = RoleRemoteBuilder;