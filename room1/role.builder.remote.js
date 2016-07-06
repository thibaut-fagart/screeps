var RoleBuilder = require('./role.builder');
var MoveToRoomTask = require('./task.move.toroom');


class RoleRemoteBuilder extends RoleBuilder {
    constructor() {
        super();
        this.moveTask = new MoveToRoomTask();
    }
    resign(creep) {
        
   	}
    
    run(creep) {
        
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