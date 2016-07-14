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
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                return true;
                // console.log("moving to homeExit ", );
            }
        } else {
            // creep.log(creep.memory.action, creep.room.name, creep.memory.homeroom);
            return false;
        }
        
    }
}
module.exports = MoveToRoomTask;