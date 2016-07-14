var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');


class RoleScout {
    constructor() {
        this.moveTask = new MoveToRoomTask('scout');
    }

    /** @param {Creep} creep **/
    run(creep) {
        let accepts = this.moveTask.accepts(creep);
        if (!accepts ) {
            let atDoor = util.isAtDoor(creep);
            if (atDoor) {
                creep.moveTo(20, 20);
            }
        }

    }
}

module.exports = RoleScout;