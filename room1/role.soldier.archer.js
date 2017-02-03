var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');
var HealStrategy = require('./strategy.remote_heal');
var RegroupStrategy = require('./strategy.regroup');

class RoleArcher {
    constructor() {
        this.healStrategy = new HealStrategy(3);
        this.moveTask = new MoveToRoomTask('attack');
        this.regroupStrategy = new RegroupStrategy(COLOR_BROWN);
    }

    resign(creep) {
        creep.log('resigning');
        delete creep.memory.role;
        delete creep.memory.action; //{go_remote_room, load, go_home, unload}
        delete creep.memory.remoteRoom;
        delete creep.memory.homeroom;
        delete creep.memory.target;
    }

    init(creep) {
        creep.memory.action = creep.memory.action || 'go_remote_room';
        creep.memory.homeroom = creep.memory.homeroom || creep.room.name;
        creep.memory.remoteRoom = creep.memory.remoteRoom || creep.room.memory.attack;
    }

    /**
     * whenever range <3 move away
     * @param {Creep} creep **/
    run(creep) {
        if (!creep.memory.action) {
            this.init(creep);
        }
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.remoteRoom) {
            creep.memory.action = 'attack';
            // creep.log('reached remote room',creep.memory.action)
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name !== creep.memory.remoteRoom) {
            let accepts = this.moveTask.accepts(creep);
            if (accepts) return;
        }

        this.healStrategy.accepts(creep);
        /*
         if (creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL)>0) {
         creep.heal(creep);
         }
         */
        if (creep.memory.action == 'attack' && creep.memory.remoteRoom == creep.room.name) {
            let hostiles = creep.room.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile && c.owner.username !== 'Source Keeper');
            if (creep.memory.ignoreInvader) {
                hostiles = hostiles.filter(c=>c.owner.username !== 'Invader');
            }
            if (hostiles.length) {
                let dangerous = hostiles.filter(c=>c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) > 0);
                let closestDangerous = creep.pos.findClosestByRange(dangerous);
                let closest = creep.pos.findClosestByRange(hostiles);
                if (closestDangerous && creep.pos.getRangeTo(closest) > creep.pos.getRangeTo(closestDangerous) - 10) {
                    closest = closestDangerous;
                }
                let range = creep.pos.getRangeTo(closest);
                if (range > 4 || (range === 4 && (closest.getActiveBodyparts(MOVE) === 0 || closest.getActiveBodyparts(ATTACK) === 0 || closest.fatigue > 0))) {
                    delete creep.memory.atRange4;
                    creep.moveTo(closest);
                } else if (range === 4) {
                    if (creep.memory.atRange4 > 3) {
                        creep.moveTo(closest);
                    } else {
                        creep.memory.atRange4 = (creep.memory.atRange4 || 0) + 1;
                    }

                    // do not advance, or we can end up in range
                } else {
                    delete creep.memory.atRange4;
                    let MAdamage = [0, 10, 4, 1];
                    let massAttackDamage = hostiles.reduce((total, h)=> {
                        let range = h.pos.getRangeTo(creep);
                        return total + (range <= 3 ? MAdamage[range] : 0);
                    }, 0);
                    if (massAttackDamage < 10) {
                        creep.rangedAttack(closest);
                    } else {
                        creep.rangedMassAttack();
                    }
                    if (range < 3 && dangerous.length) {
                        let pathAndCost = PathFinder.search(creep.pos, dangerous.map(c=>({
                            pos: c.pos,
                            range: 10
                        })), {flee: true, maxRooms: 1});
                        let path = pathAndCost.path;
                        creep.move(creep.pos.getDirectionTo(path[0]));
                    } else if (range > 2 || !dangerous.length) {
                        creep.moveTo(closest);
                    }
                }
            } else {
                this.regroupStrategy.accepts(creep);
            }

        }
    }
}
;

require('./profiler').registerClass(RoleArcher, 'RoleArcher');
module.exports = RoleArcher;