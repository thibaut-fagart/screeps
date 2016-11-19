var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');
var BuildAroundStrategy = require('./strategy.buildaround');
var ClosePickupStrategy = require('./strategy.pickup.close');

/*
 creep.memory.tasks = [{
 name:'MoveToRoom',
 args:{room:'aRoom'}
 }];
 */
class MoveToRoom {
    static addLast(creep, room) {
        creep.memory.tasks = creep.memory.tasks || [];
        creep.memory.tasks.push(this.create(room));
    }

    static addFirst(creep, room) {
        creep.memory.tasks = creep.memory.tasks || [];
        creep.memory.tasks.unshift(this.create(room));
    }

    static create(room) {
        return {
            name: 'MoveToRoom',
            args: {room: room}
        };
    }

    /**
     *
     * @param {{room}} [state]
     */
    constructor(state) {
        this.state = state;
        this.travelingPickup = new ClosePickupStrategy(RESOURCE_ENERGY, 1, (creep)=>creep.room.name === creep.memory.homeroom ? ()=>false : ()=>true);
        this.travelingBuild = new BuildAroundStrategy(3);
    }

    /**
     *
     * @param creep
     * @returns {boolean} true if the task is complete
     */
    run(creep) {
        creep.memory['task_moveToDest'] = creep.memory['task_moveToDest'] || this.state.room;
        if (creep.carry && creep.carry.energy &&
            (this.repairAround(creep) || (creep.fatigue > 0 && this.travelingBuild.accepts(creep)))) {
            return false;
        }

        if (creep.hits <creep.hitsMax) {
            creep.heal(creep);
        }
        let taskExec = new MoveToRoomTask(undefined, 'task_moveToFrom', 'task_moveToDest').accepts(creep);
        if (!taskExec) {
            let isAtBorder = (creep.pos.x % 49) < 1 || (creep.pos.y % 49) < 1;
            if (isAtBorder) {
                creep.moveTo(20, 20);
            } else {
                delete creep.memory['task_moveToDest'];
                delete creep.memory['task_moveToFrom'];
                return true;
            }
        }
        return false;

    }

    /**
     *
     * @param creep
     * @return {boolean} false if repair level is satisfying
     */
    repairAround(creep) {
        let range = 3;
        let repairCapacity = creep.repairCapacity;
        let structures = creep.room.lookForAtArea(LOOK_STRUCTURES, Math.max(0, creep.pos.y - range), Math.max(0, creep.pos.x - range),
            Math.min(creep.pos.y + range, 49), Math.min(49, creep.pos.x + range), true);
        let needRepair = structures.filter((s)=>s.ticksToDecay && s.hits + repairCapacity < s.hitsMax);
        if (needRepair.length) {
            // creep.log('repairing');
            creep.repair(needRepair[0]);
            return needRepair[0].hits < needRepair[0].hitsMax / 2;
        }
    }

}
require('./profiler').registerClass(MoveToRoom, 'MoveToRoom');
module.exports = MoveToRoom;