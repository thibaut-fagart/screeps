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
                creep.log('midway', creep.memory[this.CREEP_REMOTE_PATH], JSON.stringify(exit));
            }
            if (!exit || null === exit) {
                creep.log('ERROR , no exit', creep.memory[this.CREEP_REMOTE_PATH]);
            }
            if (exit.x === creep.pos.x && exit.y === creep.pos.y && exit.roomName == creep.room.name) {
                creep.log('waiting room change');
                delete creep.memory.roomPath;
                // wait for room change
            } else if (creep.room.name === exit.roomName) {
                // creep.log('path', creep.memory.roomPath);
                creep.memory.roomPath = creep.memory.roomPath || Room.serializePath(util.pathFinderToMoveByPath(creep.pos, util.safeMoveTo(creep, exit)));
                /*
                let creeps = creep.room.lookForAt(LOOK_CREEPS, exit.x, exit.y);
                if (creeps.length && creeps[0].id !== creep.id) {
                    // creep.log('conflict ', creeps);
                    if (!exit.x || exit.x == 49) {
                        let number = exit.y + Math.floor(Math.random() * 3) - 1;
                        // creep.log('trying ', exit.x, number);
                        creep.moveTo(exit.x, number);
                    } else if (!exit.y || exit.y == 49) {
                        creep.moveTo(exit.x + Math.floor(Math.random() * 3) - 1, exit.y);
                    }
                } else {
*/
                    // let moveTo = creep.moveTo(exit.x, exit.y, {reusePath: 50});
                    let moveTo = creep.moveByPath(path);
                    if ([OK, ERR_TIRED].indexOf(moveTo) < 0) {
                        if (ERR_NOT_FOUND === moveTo) {
                            creep.log('discarding path');

                            delete creep.memory.roomPath;
                        }
                        creep.log('moved?', moveTo, exit.x, exit.y);
                    }
                // }
                // creep.log("moving to homeExit ");
                return true;
            } else {
                creep.log('unexpected');
            }
        } else if (creep.room.name == creep.memory[this.CREEP_REMOTE_PATH]) {
            delete creep.memory.roomPath;
            return this.moveIn(creep);
        }
    }

    moveIn(creep) {
        // creep.log('movin in', creep.room.name);

        if (creep.pos.x < 2 || creep.pos.y < 2 || creep.pos.y > 47 || creep.pos.x > 47) {
            if (!creep.memory.moveinpath || !creep.memory.moveinpath.length) {
                let exit = util.findExit(creep, creep.memory[this.CREEP_HOME_PATH]);
                creep.log('movein exit', JSON.stringify(exit));
                creep.memory.moveinpath = PathFinder.search(creep.pos, {pos: exit, range: 3}, {
                    flee: true, roomCallback: (roomName) => {
                        return (roomName == creep.room.name) ? MoveToRoomTask.avoidEntryMatrixy : false;
                    }
                }).path;
                // creep.log('movein path = ', creep.memory.moveinpath);
            }
            let step = creep.memory.moveinpath[0];
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