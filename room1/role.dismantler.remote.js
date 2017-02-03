var util = require('./util');
var RoleDismantler = require('./role.dismantler');
var MoveToRoomTask = require('./task.move.toroom');
var DismantleStrategy = require('./strategy.dismantle');

class RoleRemoteDismantler extends RoleDismantler {
    constructor() {
        super();

        this.moveTask = new MoveToRoomTask('dismantleRoom', 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask('dismantleRoom', 'remoteRoom', 'homeroom');
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
        if (! creep.memory.homeroom) {
            creep.memory.homeroom = creep.room.name;
        }

        if (creep.room.glanceForAround(LOOK_CREEPS, creep.pos, 6,true).map(p=>p.creep).find(c=>!c.my && c.getActiveBodyparts(ATTACK)>0)) {
            creep.log('hostiles around, fleeing home');
            // creep.memory.action = 'go_home_room';
        } else if (_.sum(creep.carry) === 0 && creep.memory.action === 'go_home_room') {
            creep.memory.action = 'go_remote_room';
        }
        if (creep.memory.action === 'go_remote_room') {
            if (!this.moveTask.accepts(creep)) {
                // creep.memory.action = 'LOAD';
                super.run(creep);
            }
        } else if (creep.memory.action === 'go_home_room') {
            if (!this.goHomeTask.accepts(creep)) {
                // creep.memory.action = 'UNLOAD';
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
    boostPartType(creep, parts) {
        creep.seekBoosts(RoleRemoteDismantler.WANTED_BOOSTS[part_type]);
        let part_type = parts[0].type;
        let labs = creep.room.memory.labs;
//        creep.log('labs?', JSON.stringify(labs));
        if (!labs) return false;
        labs = _.keys(labs).map((id)=>Game.getObjectById(id)).filter(lab=>lab);
        let lab;
        for (let i = 0; i < RoleRemoteDismantler.WANTED_BOOSTS[part_type].length && !lab; i++) {
            let boost = RoleRemoteDismantler.WANTED_BOOSTS[part_type][i];
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
    seekBoosts(creep) {

        let boostingPart = _.keys(RoleRemoteDismantler.WANTED_BOOSTS).find((partType) => {
            let parts = _.filter(creep.body, (p)=>p.type === partType && !p.boost);
            if (parts.length && this.boostPartType(creep, parts)) {
                return true;
            } else {
                return false;
            }
        });
        return boostingPart;
    }
}
RoleRemoteDismantler.WANTED_BOOSTS = {};
RoleRemoteDismantler.WANTED_BOOSTS[HEAL] = [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_OXIDE];
RoleRemoteDismantler.WANTED_BOOSTS[TOUGH] = [RESOURCE_GHODIUM_OXIDE];
RoleRemoteDismantler.WANTED_BOOSTS[WORK] = [RESOURCE_GHODIUM_OXIDE];

require('./profiler').registerClass(RoleRemoteDismantler, 'RoleRemoteDismantler');

module.exports = RoleRemoteDismantler;