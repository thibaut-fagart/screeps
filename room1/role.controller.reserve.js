var _ = require('lodash');
var util = require('./util');
var ReserveControllerStrategy = require('./strategy.controller.reserve');
var MoveToRoomTask = require('./task.move.toroom');

class RoleReserveController {
    constructor() {
        this.loadStrategies = [new ReserveControllerStrategy()];
        this.moveTask = new MoveToRoomTask('reserve','homeroom','remoteRoom');

    }

    /*
     requires : remoteRoom=creep.room.remoteMining, homeroom = creep.room.name, homeroom, remoteSource
     */
    resign(creep) {
        creep.log("resigning");
        delete creep.memory.role;
        delete creep.memory.action; //{go_remote_room, load, go_home, unload}
        delete creep.memory.remoteRoom;
        delete creep.memory.homeroom;
    }

    init(creep) {
        creep.memory.action = 'go_remote_room';
        creep.memory.homeroom = creep.room.name;
        creep.memory.remoteRoom = creep.memory.remoteRoom ||creep.room.memory.reserve;

    }


    /** @param {Creep} creep **/
    run(creep) {
        if (creep.memory.action !== 'reserve' && this.moveTask.accepts(creep)) {
            return;
        } else {
            creep.memory.action = 'load';
        }

 /*       if (!creep.memory.homeroom) {
            creep.memory.homeroom = creep.room.name;
        }
        if (!creep.memory.action) {
            this.init(creep)
        }
        let remoteRoom = Game.rooms[creep.memory.remoteRoom];
        let roomAlreadyClaimed = remoteRoom && remoteRoom.controller  &&  remoteRoom.controller.owner
            && remoteRoom.controller.owner.username == creep.owner.username;
        // creep.log('claimed ok ? ', roomAlreadyClaimed, JSON.stringify(Game.rooms[creep.memory.remoteRoom].controller.owner));
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.remoteRoom && !(roomAlreadyClaimed)) {
            creep.memory.action = 'load';
            // creep.log('reached remote room',creep.memory.action)
        } else if (creep.memory.action == 'load' && creep.room.name != creep.memory.homeroom && roomAlreadyClaimed) {
            creep.memory.action = 'go_home_room';
            delete creep.memory.target;
            // creep.log('full', creep.memory.action);
        } else if (creep.memory.action == 'go_home_room' && creep.room.name == creep.memory.homeroom && !roomAlreadyClaimed) {
            creep.memory.action = 'go_remote_room';
            delete creep.memory.target;
        } else {
            // creep.log(JSON.stringify(creep.memory));
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.homeroom) {
            if (!creep.memory.remoteRoom) {
                creep.log("no remote room");
            } else {
                let exit = this.findHomeExit(creep);
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                // console.log("moving to homeExit ", );
            }
        }
*/
        if (creep.memory.action == 'load' && creep.memory.remoteRoom == creep.room.name) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            // creep.log('previousStrategy',util.strategyToLog(strategy));
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=>strat.accepts(creep));
                // creep.log('newStrategy',util.strategyToLog(strategy));
            }
            if (strategy) {
                // creep.log('strategy', strategy.constructor.name);
                util.setCurrentStrategy(creep, strategy);
            } else {
                // creep.log('no loadStrategy');
                return;
            }
        }
    }
}

module.exports = RoleReserveController;