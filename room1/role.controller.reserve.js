var _ = require('lodash');
var util = require('./util');
var ReserveControllerStrategy = require('./strategy.controller.reserve');
var MoveToRoomTask = require('./task.move.toroom');
var RegroupStrategy = require('./strategy.regroup');

class RoleReserveController {
    constructor() {
        this.loadStrategies = [new ReserveControllerStrategy(COLOR_GREY,COLOR_RED)];
        this.regroupStrategy = new RegroupStrategy(COLOR_ORANGE);
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
        if (this.moveTask.accepts(creep)) {
            return;
        } else {
            creep.memory.action = 'load';
        }
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
                this.regroupStrategy.accepts(creep);
                return;
            }
        }
    }
}

module.exports = RoleReserveController;