var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class MoveToRoomTask extends BaseStrategy {
    /**
     * 
     * @param {string} [roomMemory]
     * @param {string} [memoryfrom]
     * @param {string} [memoryto]
     */
    constructor(roomMemory, memoryfrom, memoryto) {
        super();
        this.ROOM_REMOTE_PATH = roomMemory ? roomMemory : 'claim';
        this.CREEP_REMOTE_PATH = memoryto ? memoryto : 'remoteRoom';
        this.CREEP_HOME_PATH = memoryfrom ? memoryto : 'homeroom';
    }
    
    findHomeExit(creep) {
        return util.findExit(creep, creep.memory[this.CREEP_REMOTE_PATH], 'homeExit');
    }

    accepts (creep) {
        if (!creep.memory[this.CREEP_REMOTE_PATH] && creep.room.memory[this.ROOM_REMOTE_PATH]) {
            creep.memory[this.CREEP_REMOTE_PATH] = creep.room.memory[this.ROOM_REMOTE_PATH];
        }

        creep.memory.action = creep.memory.action || 'go_remote_room';
        creep.memory[this.CREEP_HOME_PATH]=  creep.memory[this.CREEP_HOME_PATH] || creep.room.name;
        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory[this.CREEP_HOME_PATH]) {
            if (!creep.memory[this.CREEP_REMOTE_PATH]) {
                creep.log('no remoteMining room');
                return false;
            } else {
                var exit = this.findHomeExit(creep);
                let creeps = creep.room.lookForAt(LOOK_CREEPS, exit.x, exit.y);
                if (creeps.length) {
                    // creep.log('conflict ', creeps);
                    if (!exit.x || exit.x == 49) {
                        let number = exit.y + Math.floor(Math.random()*3)-1;
                        // creep.log('trying ', exit.x, number);
                        creep.moveTo(exit.x, number);
                    } else if (!exit.y || exit.y == 49) {
                        creep.moveTo(exit.x+ Math.floor(Math.random()*3)-1, exit.y);
                    }
                } else {
                    let moveTo = creep.moveTo(exit.x, exit.y, {reusePath: 50});
                }
                return true;
                // console.log("moving to homeExit ", );
            }
        } else if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory[this.CREEP_REMOTE_PATH]) {
            if (creep.pos.x ===0) {
                creep.move(RIGHT);
                return true;
            } else if (creep.pos.y ===0) {
                creep.move(TOP);
                return true;
            } else if (creep.pos.y ===49) {
                creep.move(BOTTOM);
                return true;
            } else if(creep.pos.x ===49) {
                creep.move(LEFT);
                return true;
            }
            // creep.log(creep.memory.action, creep.room.name, creep.memory.homeroom);
            return false;
        }
        
    }
}
module.exports = MoveToRoomTask;