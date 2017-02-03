var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');
var HealStrategy = require('./strategy.remote_heal');

class RoleTowerDrainer {
    constructor() {
        this.healStrategy = new HealStrategy(3);
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
        if (remainingMove+remainingTough < 2*remainingHeal && !(creep.hits ===creep.hitsMax)) {
            creep.log('retreating');
            creep.memory.action = 'heal';
        } else if (creep.memory.action == 'heal' && !creep.body.find((p)=>p.hits < 100)) {
            creep.memory.action = 'go_remote_room';
        } else if ((creep.memory.action !== 'heal') && creep.memory.remoteRoom !== creep.room.name) {
            creep.memory.action = 'go_remote_room';
        }
        if (creep.room.name === creep.memory.remoteRoom) {
            creep.log(creep.memory.action, remainingMove, remainingHeal, creep.hits,creep.hitsMax);
        }
        creep.log('action', creep.memory.action, 'in remote',creep.room.name === creep.memory.remoteRoom);
        if (creep.memory.action == 'go_remote_room') {
            if (!this.moveTask.accepts(creep)) {
                creep.memory.action = 'defend';
                // creep.log('reached remote room',creep.memory.action);
            }
        } else if (creep.memory.action === 'heal') {
            if (creep.memory.remoteRoom !== creep.room.name) {
                // creep.log('getting away from border');
                this.moveInside(creep);
                // creep.log('healing', heal);
            } else {
                // creep.log('going back to homeroom');
                this.moveBackTask.accepts(creep);
            }
        } else if (creep.memory.action == 'defend' && creep.room.name === creep.memory.remoteRoom) {
            let towers = creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_TOWER});
            // creep.log('towers', towers.length, JSON.stringify(towers.map((t)=>t.energy)));
            towers = towers.filter((t=> t.energy > 0));
            // creep.log('working towers', creep.hits, towers.length, JSON.stringify(towers.map((t)=>t.energy)));

            if (towers.length == 0) {
                // creep.log('job done !');
                // TODO re enable
                // Memory.rooms[creep.memory.homeroom].dismantleRoom = [creep.memory.remoteRoom];
                // stay, in case energy is refilled
            } else {// wait untill all TOUGH is gone, then go back
                // creep.log('healing');
                delete Memory.rooms[creep.memory.homeroom].dismantleRoom;
            }
            if (creep.hits > 0.8*creep.hitsMax) {
                if (!this.moveInside(creep)) {

                    let greenFlag = creep.room.find(FIND_FLAGS).filter(f=>f.color === COLOR_GREEN).find(f=>true);
                    // creep.log('moving to flag ', greenFlag);
                    if (greenFlag) {
                        creep.moveTo(greenFlag);
                        return ;
                    }
                }
            }

        }
    }

    moveInside(creep) {
        //.map(p=>p.creep).filter(c=>!c.my).length==0
        creep.log('moving inside');
        if (( creep.pos.x < 1 || creep.pos.y < 1 || creep.pos.x > 48 || creep.pos.y > 48)) {
            creep.moveTo(24, 24);
            return true;
        }
        return false;
    }

    seekBoosts(creep) {

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
        labs = _.keys(labs).map((id)=>Game.getObjectById(id)).filter(lab=>lab);
        let lab;
        for (let i = 0; i < RoleTowerDrainer.WANTED_BOOSTS[part_type].length && !lab; i++) {
            let boost = RoleTowerDrainer.WANTED_BOOSTS[part_type][i];
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
            util.moveTo(creep, lab.pos);
            return true;
        } else if (boosted == OK) {
            return false;
        }

        // }

    }

}
RoleTowerDrainer.WANTED_BOOSTS = {};
RoleTowerDrainer.WANTED_BOOSTS[HEAL] = [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_OXIDE];
RoleTowerDrainer.WANTED_BOOSTS[TOUGH] = [RESOURCE_GHODIUM_OXIDE,'GHO2','XGHO2'];

require('./profiler').registerClass(RoleTowerDrainer, 'RoleTowerDrainer'); module.exports = RoleTowerDrainer;