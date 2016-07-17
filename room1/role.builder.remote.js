var util = require('./util');
var RoleBuilder = require('./role.builder');
var MoveToRoomTask = require('./task.move.toroom');
var FleeToHomeRoomStrategy = require('./strategy.flee.tohomeroom');
var CautiousBuidStrategy = require('./strategy.build.cautious');
var HealStrategy = require('./strategy.remote_heal');

class RoleRemoteBuilder extends RoleBuilder {
    constructor() {
        super();
        this.buildStrategy = new CautiousBuidStrategy();
        this.fleeStrategy = new FleeToHomeRoomStrategy(4);
        this.moveTask = new MoveToRoomTask('remotebuild');
        this.healStrategy = new HealStrategy(3);
    }

    resign(creep) {
        // do not resign in remote room, go back home
        creep.log('returning home');
        if (creep.memory['resign_on_move']) {
            delete creep.memory['resign_on_move'];
            super.resign(creep);
        }
        creep.memory['resign_on_move'] = true;
        let oldRemote = creep.memory[this.moveTask.CREEP_REMOTE_PATH];
        creep.memory[this.moveTask.CREEP_REMOTE_PATH] = creep.memory[this.moveTask.CREEP_HOME_PATH];
        creep.memory[this.moveTask.CREEP_HOME_PATH] = oldRemote;
    }

    run(creep) {

        let accepts = this.moveTask.accepts(creep);
        // creep.log('accepts?', accepts);
        if (!accepts) {
            creep.memory.action = 'LOAD';
            this.healStrategy.accepts(creep);
            if (creep.hits + util.healingCapacity(creep)< creep.hitsMax) {
                this.fleeStrategy.accepts(creep);
            }
        } else if (!this.fleeStrategy.accepts(creep)) {
            super.run(creep);
        }
    }
}
module.exports = RoleRemoteBuilder;