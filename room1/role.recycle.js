var _ = require('lodash');
var util = require('./util');
var MoveTask = require('./task.move.toroom');

class RoleRecycle {
    constructor() {
    }



    /** @param {Creep} creep **/
    run(creep) {
        let spawns = creep.room.find (FIND_MY_SPAWNS);
        if (spawns.length) {
            let spawn = spawns[0];
            let range = creep.pos.getRangeTo(spawn.pos);
            if (range ==1) {
                spawn.recycleCreep(creep);
            } else  util.moveTo(creep, spawn.pos, this.constructor.name+'Path');
        } else if (creep.memory.homeroom) {
            creep.log('recycle move');
            if (!creep.memory.homeroom === creep.room.name)creep.memory.action = 'go_remote_room';
            new MoveTask('remoteRoom', 'homeroom').accepts(creep);
        }
    }
}

module.exports = RoleRecycle;