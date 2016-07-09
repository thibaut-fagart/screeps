var RoleBuilder = require('./role.builder');
var MoveToRoomTask = require('./task.move.toroom');
var FleeToHomeRoomStrategy = require('./strategy.flee.tohomeroom');

class RoleRemoteBuilder extends RoleBuilder {
    constructor() {
        super();
        this.fleeStrategy = new FleeToHomeRoomStrategy();
        this.moveTask = new MoveToRoomTask('remotebuild');
    }

    resign(creep) {
        // do not resign in remote room, go back home
        creep.log('returning home');
        if (creep.memory['resign_on_move']) {
            delete creep.memory['resign_on_move'];
            super.resign(creep);
        }
        creep.memory['resign_on_move']=true;
        let oldRemote = creep.memory[this.moveTask.CREEP_REMOTE_PATH];
        creep.memory[this.moveTask.CREEP_REMOTE_PATH] = creep.memory[this.moveTask.CREEP_HOME_PATH];
        creep.memory[this.moveTask.CREEP_HOME_PATH] = oldRemote;
    }

    run(creep) {
        if (this.fleeStrategy.accepts(creep)) {
            return;
        }

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