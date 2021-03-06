var _ = require('lodash');
var util = require('./util');
var RemoteAttackStrategy = require('./strategy.remote_target');
var AttackWallStrategy = require('./strategy.attack_wall');
var MoveToRoomTask = require('./task.move.toroom');
var AttackStructureStrategy = require('./strategy.attack.structure');
var RegroupStrategy = require('./strategy.regroup');
var CloseAttackStrategy = require('./strategy.closeattack_target');
var HealStrategy = require('./strategy.remote_heal');

class RoleAttacker {
    constructor() {
        this.attackStrategies = [
            // new CloseAttackStrategy(undefined),
            // new CloseAttackStrategy(undefined,(creep)=>((target)=>target.getActiveBodyparts(ATTACK)+target.getActiveBodyparts(HEAL)>0)),
            new RemoteAttackStrategy(),
            new AttackStructureStrategy(5),
            new HealStrategy()/*, new AttackWallStrategy()*/,
            new RegroupStrategy(COLOR_GREEN)
            /*new AttackStructureStrategy()*/];
        this.moveTask = new MoveToRoomTask('attack');
        util.indexStrategies(this.attackStrategies);
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

    findHomeExit(creep) {
        return creep.room.getExitTo(creep.memory.remoteRoom);
    }

    /** @param {Creep} creep **/
    run(creep) {
        if (!creep.memory.action) {
            this.init(creep);
        }
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.remoteRoom) {
            creep.memory.action = 'attack';
            creep.memory.controller = creep.room.controller.id;
            // creep.log('reached remote room',creep.memory.action)
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name !== creep.memory.remoteRoom) {
            let accepts = this.moveTask.accepts(creep);
            if (accepts) return;
        }

        if (creep.memory.action == 'attack' && creep.memory.remoteRoom == creep.room.name) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.attackStrategies); // attackStrategy,movetosource
            creep.log('previousStrategy',util.strategyToLog(strategy));
            if (!strategy) {
                strategy = _.find(this.attackStrategies, (strat)=>strat.accepts(creep));
                creep.log('newStrategy',util.strategyToLog(strategy));
            }
            if (strategy) {
                creep.log('strategy', strategy.constructor.name);
                util.setCurrentStrategy(creep, strategy);
            } else {
                /*
                 // creep.log('no attackStrategy, moving to controller');
                 let controller = util.objectFromMemory(creep.memory, 'controller');
                 if (!controller) {
                 controller = creep.room.controller;
                 creep.memory ['controller'] = creep.room.controller.id;
                 }
                 if (Math.abs(controller.pos.x-creep.pos.x) >1 || Math.abs(controller.pos.y-creep.pos.y)) {
                 creep.moveTo(controller);
                 } else {
                 // creep.log('already at controller, idling');
                 }
                 return;
                 */
            }
        }
    }
};

require('./profiler').registerClass(RoleAttacker, 'RoleAttacker'); module.exports = RoleAttacker;