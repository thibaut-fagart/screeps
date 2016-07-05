var util = require('./util');

class MoveToRoomTask {
    constructor() {
        
    }
    findHomeExit(creep) {
        return util.findExit(creep, creep.memory.remoteRoom, 'homeExit');
    }

    accepts (creep) {
        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.homeroom) {
            if (!creep.memory.remoteRoom) {
                creep.log("no remoteMining room");
                return false;
            } else {
                var exit = this.findHomeExit(creep);
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                return true;
                // console.log("moving to homeExit ", );
            }
        } else {
            return false;
        }
        
    }
}

module.exports = MoveToRoomTask;