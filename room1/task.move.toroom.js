var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class MoveToRoomTask extends BaseStrategy {
    /**
     *
     * @param {string} [roomMemory] memory of the room to init destination
     * @param {string} memoryfrom creep memory slot for the start
     * @param {string} [memoryto] creep memory slot for the destination
     */
    constructor(roomMemory, memoryfrom, memoryto) {
        super();
        this.ROOM_REMOTE_PATH = roomMemory ? roomMemory : 'claim';
        this.CREEP_HOME_PATH = memoryfrom ? memoryfrom : 'homeroom';
        this.CREEP_REMOTE_PATH = memoryto ? memoryto : 'remoteRoom';
    }

    accepts(creep) {
        // creep.log('moveTo', creep.memory[this.CREEP_REMOTE_PATH]);
        if (!creep.memory[this.CREEP_REMOTE_PATH] && creep.room.memory[this.ROOM_REMOTE_PATH]) {
            creep.memory[this.CREEP_REMOTE_PATH] = creep.room.memory[this.ROOM_REMOTE_PATH];
        }
        creep.memory.action = creep.memory.action || 'go_remote_room';
        creep.memory[this.CREEP_HOME_PATH] = creep.memory[this.CREEP_HOME_PATH] || creep.room.name;
         // creep.log('moveTask',creep.memory.action, creep.memory[this.CREEP_HOME_PATH], creep.memory[this.CREEP_REMOTE_PATH],creep.room.name);
        if (creep.room.name != creep.memory[this.CREEP_REMOTE_PATH]) {

            delete creep.memory.moveinpath;
            var exit = util.findExit(creep, creep.memory[this.CREEP_REMOTE_PATH]);
            if (creep.room.name != creep.memory[this.CREEP_REMOTE_PATH] && creep.room.name != creep.memory[this.CREEP_HOME_PATH]) {
                // creep.log('midway', creep.memory[this.CREEP_REMOTE_PATH], JSON.stringify(exit));
            }
            if (!exit || null === exit) {
                creep.log('ERROR , no exit', creep.memory[this.CREEP_REMOTE_PATH]);
            }
            // creep.log('exit', JSON.stringify(exit), creep.pos.isEqualTo(exit));

            if (exit.x === creep.pos.x && exit.y === creep.pos.y && exit.roomName == creep.room.name) {
                // creep.log('waiting room change');
                // wait for room change
            } else if (creep.room.name === exit.roomName) {
                let creeps = creep.room.lookForAt(LOOK_CREEPS, exit.x, exit.y);
                let moveTo = creep.moveTo(exit.x, exit.y, {reusePath: 50});
                if ([OK, ERR_TIRED].indexOf(moveTo) < 0) creep.log('moved?', moveTo, exit.x, exit.y);
                // creep.log("moving to homeExit ");
                return true;
            } else {
                this.moveIn(creep);
                // creep.log('unexpected');
            }
        } else if (creep.room.name == creep.memory[this.CREEP_REMOTE_PATH]) {
            return this.moveIn(creep);
        }
    }
    moveIn(creep) {
        // creep.log('movin in', creep.room.name);
        if (creep.pos.x < 2 || creep.pos.y < 2|| creep.pos.y > 46 || creep.pos.x > 46) {
            if (!creep.memory.moveinpath || !creep.memory.moveinpath.length) {
                let exit = new RoomPosition(creep.pos.x < 2?0:(creep.pos.x>47?49:creep.pos.x),creep.pos.y < 2?0:(creep.pos.y>47?49:creep.pos.y),creep.room.name);
                // creep.log('movein exit', JSON.stringify(exit));
                creep.memory.moveinpath = PathFinder.search(creep.pos, {pos: exit, range: 4}, {
                    flee: true, roomCallback: (roomName) => {
                        return (roomName == creep.room.name) ? MoveToRoomTask.avoidEntryMatrixy : false;
                    }
                }).path;

                // creep.log('movein path = ', creep.memory.moveinpath);
            }
            let step = creep.memory.moveinpath[0];
            if (!step) {
                delete creep.memory.moveinpath;
                return false;
            }
            if (step.x === creep.pos.x && step.y === creep.pos.y) {
                creep.memory.moveinpath.shift();
                step = creep.memory.moveinpath[0];
            }
            // creep.log('step', step);
            if (step) {
                let move = creep.moveTo(step.x, step.y);
                if ([OK, ERR_TIRED].indexOf(move) < 0) {
                    creep.log('move?', move);
                }
            } else {
                delete creep.memory.moveinpath;
                return false;
            }
            return true;
        } else {
            return false;
        }

        // creep.log('moving in?', dir, move);


    }
}
MoveToRoomTask.avoidEntryMatrixy = new PathFinder.CostMatrix();
for (let r = 0; r < 3; r++) {
    for (let i = r; i < 50 - r; i++) {
        MoveToRoomTask.avoidEntryMatrixy.set(i, r, 255 - 50 * r);
        MoveToRoomTask.avoidEntryMatrixy.set(i, 49 - r, 255 - 50 * r);
        MoveToRoomTask.avoidEntryMatrixy.set(r, i, 255 - 50 * r);
        MoveToRoomTask.avoidEntryMatrixy.set(49 - r, i, 255 - 50 * r);
    }
}

module.exports = MoveToRoomTask;