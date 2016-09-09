var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');
var RegroupStrategy = require('./strategy.regroup');


class RoleScout {
    constructor() {
        this.moveTask = new MoveToRoomTask('scout');
        this.regroupTask = new RegroupStrategy(COLOR_YELLOW);
    }

    /** @param {Creep} creep **/
    run(creep) {
        this.scout(creep, creep.room);
        if (creep.memory.action !== 'scout') {
            let accepts = this.moveTask.accepts(creep);
            if (accepts) return;
        }
        if (creep.memory.remoteRoom === creep.room.name) {
            creep.memory.action = 'scout';
            this.regroupTask.accepts(creep);
        } else {
            creep.memory.action = 'go_remote_room';
        }


    }
    scout(creep, room) {
        room.memory.scouted = room.memory.scouted || {time: -Infinity};
        let scouted =room.memory.scouted;
        if (scouted.time < Game.time + 10000) {
            Memory.scouting = Memory.scouting || {};
            Memory.scouting.needScouting = _.pull(Memory.scouting.needScouting||[], room.name);
            Memory.scouting.scouted = Memory.scouting.scouted || [];
            scouted.time = Game.time;
            if(!_.includes(Memory.scouting.scouted, room.name)) {
                Memory.scouting.scouted.push(room.name);
            }
            scouted.minerals = room.find(FIND_MINERALS).map(min=>min.mineralType);
            scouted.owner = room.controller && room.controller.owner && room.controller.owner.username;
            scouted.level = room.controller && room.controller.level;
            scouted.sourceCount = room.find(FIND_SOURCES).length;
        }
    }
}

require('./profiler').registerClass(RoleScout, 'RoleScout'); module.exports = RoleScout;