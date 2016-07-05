var RoleBuilder = require('./role.builder');
var MoveToRoomTask = require('./task.move.toroom');


class RoleRemoteBuilder extends RoleBuilder {
    constructor() {
        super();
        this.moveTask = new MoveToRoomTask();
    }
    
    run(creep) {
        if (!this.moveTask.accepts(creep)) {
            return super.run(creep);
        }
    }
}
module.exports = RoleRemoteBuilder;