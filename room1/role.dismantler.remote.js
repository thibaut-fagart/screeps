var util = require('./util');
var RoleDismantler = require('./role.dismantler');
var MoveToRoomTask = require('./task.move.toroom');

class RoleRemoteDismantler extends RoleDismantler {
    constructor() {
        super();

        this.moveTask = new MoveToRoomTask('remotebuild', 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask('remotebuild', 'remoteRoom', 'homeroom');
    }

    onNoLoadStrategy(creep) {
        // creep.memory.action = 'go_home_room';
    }

    resign(creep) {
        // do not resign in remote room, go back home
        creep.log('resigning ??');
        creep.memory.role = 'recycle';
    }

    run(creep) {
        // creep.log(this.constructor.name, creep.memory.action);
        if (!creep.memory.action) {
            creep.memory.action = 'go_remote_room;';
        }
        if (creep.room.glanceForAround(LOOK_CREEPS, creep.pos, 6,true).map(p=>p.creep).filter(c=>!c.my && c.getActiveBodyparts(ATTACK)>0)) {
            creep.memory.action = 'go_home_room';
        } else if (_.sum(creep.carry) === 0 && creep.memory.action === 'go_home_room') {
            creep.memory.action = 'go_remote_room';
        }
        if (creep.memory.action === 'go_remote_room') {
            if (!this.moveTask.accepts(creep)) {
                creep.memory.action = 'LOAD';
                super.run(creep);
            }
        } else if ((creep.carryCapacity !== 0 && creep.carryCapacity === _.sum(creep.carry)) && creep.memory.action === 'LOAD') {
            creep.memory.action = 'go_home_room';
        } else if (creep.memory.action === 'go_home_room') {
            if (!this.goHomeTask.accepts(creep)) {
                creep.memory.action = 'UNLOAD';
            }
            super.run(creep);
        } else if (creep.room.name !== creep.memory.remoteRoom && creep.memory.action !== 'go_remote_room' && creep.memory.action !== 'go_home_room') {
            creep.memory.action = 'go_remote_room';
        } else {
            super.run(creep);
        }
        if (creep.room.name === creep.memory.remoteRoom
            && creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: s=>s.structureType === STRUCTURE_TOWER || s.structureType === STRUCTURE_SPAWN}).length === 0 // all offensive towers done
        && creep.room.find(FIND_FLAGS,{filter:{color:COLOR_RED, secondaryColor:COLOR_RED}}).filter(f=>f.pos.lookFor(LOOK_STRUCTURES).length >0).length ==0 // selected structures for cleanup gone
        ) {
            // creep.log('towers and spawns gone, cancel dismantling');
            Memory.rooms[creep.memory.homeroom].loot = creep.room.name;
            let mem = Memory.rooms[creep.memory.homeroom].dismantleRoom;
            if (_.isString(mem)) {
                delete Memory.rooms[creep.memory.homeroom].dismantleRoom;
            } else {
                _.pull(mem, creep.room.name);
            }
            // this.resign(creep);

        }
        // creep.log('super.run');

    }
}
require('./profiler').registerClass(RoleRemoteDismantler, 'RoleRemoteDismantler');

module.exports = RoleRemoteDismantler;