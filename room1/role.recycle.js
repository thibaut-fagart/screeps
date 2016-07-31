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
                if (creep.memory.previousRole && creep.memory.remoteRoom) {
                    creep.log('recycling', creep.memory.remoteRoom, _.sum(creep.body, ((p)=>BODYPART_COST[p.type])) *creep.ticksToLive / 1500);
                    creep.room.deliver(creep.memory.remoteRoom, Math.ceil(_.sum(creep.body, ((p)=>BODYPART_COST[p.type])) * creep.ticksToLive / 1500));
                }
                spawn.recycleCreep(creep);
            } else  util.moveTo(creep, spawn.pos, this.constructor.name+'Path');
        } else if (creep.memory.homeroom) {
            creep.log('recycle move');
            if (!creep.memory.homeroom === creep.room.name){
                creep.memory.action = 'go_home_room';
            }
            new MoveTask(undefined, 'remoteRoom', 'homeroom').accepts(creep);
        }
    }
}

module.exports = RoleRecycle;