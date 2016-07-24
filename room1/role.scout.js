var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');
var RegroupStrategy = require('./strategy.regroup');


class RoleScout {
    constructor() {
        this.moveTask = new MoveToRoomTask('scout');
        this.regroupTask = new RegroupStrategy(COLOR_YELLOW);
    }

    /** @param {Creep} creep **/
    run(creep) {
        if (creep.memory.action !== 'scout') {
            let accepts = this.moveTask.accepts(creep);
            if (accepts) return;
        }
        creep.memory.action = 'scout';
        this.regroupTask.accepts(creep);

    }
}

module.exports = RoleScout;