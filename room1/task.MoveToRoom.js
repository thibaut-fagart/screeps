var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');

/*
creep.memory.tasks = [{
    task:'MoveToRoom',
    args:{room:'aRoom'}
}];
*/
class MoveToRoom  {
    /**
     *
     * @param {{room}} [state]
     */
    constructor(state) {
        this.state = state;
    }

    /**
     *
     * @param creep
     * @returns {boolean} true if the task is complete
     */
    run(creep) {
        creep.memory['task_moveToDest'] = creep.memory['task_moveToDest'] || this.state.room;
        let taskExec = new MoveToRoomTask(undefined, 'task_moveToFrom', 'task_moveToDest').accepts(creep);
        if (!taskExec) {
            let isAtBorder = (creep.pos.x % 49) < 1 || (creep.pos.y % 49) < 1;
            if (isAtBorder) {
                creep.moveTo(20, 20);
            } else {
                delete creep.memory['task_moveToDest'];
                delete creep.memory['task_moveToFrom'];
                return true;
            }
        }
        return false;

    }
}
require('./profiler').registerClass(MoveToRoom, 'MoveToRoom'); module.exports = MoveToRoom;