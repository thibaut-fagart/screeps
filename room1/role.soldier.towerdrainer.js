var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');
var HealStrategy = require('./strategy.remote_heal');

class RoleTowerDrainer {
    constructor() {
        this.healStrategy = new HealStrategy(1);
        this.moveTask = new MoveToRoomTask('attack', 'homeroom', 'remoteRoom');
        this.moveBackTask = new MoveToRoomTask('attack', 'remoteRoom', 'homeroom');
    }

    resign(creep) {
        creep.log('resigning');
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
        if (creep.room.name === creep.memory.homeroom && this.seekBoosts(creep)) {
            return;
        }
        this.healStrategy.accepts(creep);
        let remainingMove = creep.getActiveBodyparts(MOVE);
        let remainingTough = creep.getActiveBodyparts(TOUGH);
        let remainingHeal = creep.getActiveBodyparts(HEAL);
        if (remainingMove+remainingTough < 2*remainingHeal) {
            creep.log('retreating');
            creep.memory.action = 'heal';
        } else if (!creep.body.find((p)=>p.hits < 100)) {
            creep.memory.action = 'go_remote_room';
        } else if ((creep.room.name === creep.memory.homeroom || creep.memory.action == 'defend' )
            && (creep.memory.action !== 'heal')
            && creep.memory.remoteRoom !== creep.room.name) {
            creep.memory.action = 'go_remote_room';
        }
        if (creep.room.name === creep.memory.remoteRoom) {
            creep.log(creep.memory.action, remainingMove, remainingHeal, creep.hits,creep.hitsMax);
        }
        if (creep.memory.action == 'go_remote_room') {
            if (!this.moveTask.accepts(creep)) {
                creep.memory.action = 'defend';
                // creep.log('reached remote room',creep.memory.action);
            }
        } else if (creep.memory.action === 'heal') {
            if (creep.memory.remoteRoom !== creep.room.name) {
                creep.log('getting away from border');
                this.moveInside(creep);
                // creep.log('healing', heal);
            } else {
                creep.log('going back to homeroom');
                this.moveBackTask.accepts(creep);
            }
        } else if (creep.memory.action == 'defend' && creep.room.name === creep.memory.remoteRoom) {
            if (creep.hits > 0.8*creep.hitsMax) {
                this.moveInside(creep);
            }
            let towers = creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_TOWER});
            // creep.log('towers', towers.length, JSON.stringify(towers.map((t)=>t.energy)));
            towers = towers.filter((t=> t.energy > 0));
            creep.log('working towers', creep.hits, towers.length, JSON.stringify(towers.map((t)=>t.energy)));

            if (towers.length == 0) {
                creep.log('job done !');
                Memory.rooms[creep.memory.homeroom].dismantleRoom = [creep.memory.remoteRoom];
                // stay, in case energy is refilled
            } else {// wait untill all TOUGH is gone, then go back
                // creep.log('healing');
            }
        }
    }

    moveInside(creep) {
        //.map(p=>p.creep).filter(c=>!c.my).length==0
        creep.log('moving inside');
        if (( creep.pos.x < 1 || creep.pos.y < 1 || creep.pos.x > 48 || creep.pos.y > 48)) {
            creep.moveTo(24, 24);
        }
    }

    seekBoosts(creep) {
        // creep.log('seekBoosts');

        let boostingPart = _.keys(RoleTowerDrainer.WANTED_BOOSTS).find((partType) => {
            let parts = _.filter(creep.body, (p)=>p.type === partType && !p.boost);
            if (parts.length && this.boostPartType(creep, parts)) {
                return true;
            } else {
                return false;
            }
        });
        return boostingPart;


    }

    boostPartType(creep, parts) {
        let part_type = parts[0].type;
        let labs = creep.room.memory.labs;
//        creep.log('labs?', JSON.stringify(labs));
        if (!labs) return false;
        labs = _.keys(labs).map((id)=>Game.getObjectById(id));
        let lab;
        for (let i = 0; i < RoleRemoteRoomGuard.WANTED_BOOSTS[part_type].length && !lab; i++) {
            let boost = RoleRemoteRoomGuard.WANTED_BOOSTS[part_type][i];
            // creep.log('testing ', boost);
            lab = labs.find((lab)=> {
                return lab.mineralType && boost == lab.mineralType && lab.mineralAmount > 10;
            });
            // creep.log('found', lab);
            if (lab) break;
        }

        if (!lab) {
            creep.log('NO LAB???', JSON.stringify(labs));
            return false;
        }
        let boosted = lab.boostCreep(creep);
        // creep.log('boosted', boosted);
        if (boosted == ERR_NOT_IN_RANGE) {
            // creep.log('moving to lab', JSON.stringify(lab.pos));
            util.moveTo(creep, lab.pos, 'labMove');
            return true;
        } else if (boosted == OK) {
            return false;
        }

        // }

    }

}
RoleTowerDrainer.WANTED_BOOSTS = ['LO'];

module.exports = RoleTowerDrainer;