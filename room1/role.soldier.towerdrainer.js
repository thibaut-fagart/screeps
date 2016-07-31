var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');
var HealStrategy = require('./strategy.remote_heal');

class RoleTowerDrainer {
    constructor() {
        this.healStrategy = new HealStrategy();
        this.moveTask = new MoveToRoomTask('attack', 'homeroom', 'remoteRoom');
        this.moveBackTask = new MoveToRoomTask('attack', 'remoteRoom', 'homeroom');
    }

    resign(creep) {
        creep.log('resigning');
        creep.memory.role = 'recycle';
    }

    init(creep) {
        creep.memory.action = creep.memory.action || 'go_remote_room';
        creep.memory.homeroom = creep.memory.homeroom || creep.room.name;
        creep.memory.remoteRoom = creep.memory.remoteRoom || creep.room.memory.attack;
    }

    /** @param {Creep} creep **/
    run(creep) {
        if (!creep.memory.action) {
            this.init(creep);
        }
        creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room') {
            if (!this.moveTask.accepts(creep)) {
                creep.memory.action = 'defend';
                // creep.log('reached remote room',creep.memory.action);
            } else {
                return;
            }
        }

        if (creep.memory.action === 'heal' && creep.memory.remoteRoom!== creep.room.name) {
            if (creep.body.find((p)=>p.hits <100)) {
                if (creep.pos.x< 2 || creep.pos.y <2 || creep.pos.x > 47|| creep.pos.y ===47) {
                    this.moveBackTask.accepts(creep);
                }
                let heal = creep.heal(creep);
                // creep.log('healing', heal);
            } else {
                // creep.log('going back ');
                creep.memory.action = 'go_remote_room';
            }
        } else if (creep.memory.action == 'defend' && creep.room.name === creep.memory.remoteRoom) {
            let towers = creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_TOWER});
            // creep.log('towers', towers.length, JSON.stringify(towers.map((t)=>t.energy)));
            towers = towers.filter((t=> t.energy >0));
            creep.log('working towers', creep.hits, towers.length, JSON.stringify(towers.map((t)=>t.energy)));

            if (towers.length == 0) {
                creep.log('job done !');
                this.resign(creep);
            }
            // wait untill all TOUGH is gone, then go back
            // creep.log('healing');
            creep.heal(creep);
            let remainingTough = creep.getActiveBodyparts(TOUGH);
            if (remainingTough<=2) {
                creep.log('retreating',remainingTough);
                creep.memory.action = 'heal';
                this.moveBackTask.accepts(creep);
            } else {
                creep.log('enduring', remainingTough);
            }
        }
    }
}


module.exports = RoleTowerDrainer;