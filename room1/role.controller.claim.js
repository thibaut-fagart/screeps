var _ = require('lodash');
var util = require('./util');
var ClaimControllerStrategy = require('./strategy.controller.claim');
var MoveToRoomTask = require('./task.move.toroom');

class RoleClaimController {
    constructor() {
        this.loadStrategies = [new ClaimControllerStrategy()];
        this.goRemoteTask = new MoveToRoomTask('claim', 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask('claim', 'remoteRoom', 'homeroom');
    }

    /*
     requires : remoteRoom=creep.room.claim, homeroom = creep.room.name, homeroom, remoteSource
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
        creep.memory.remoteRoom = creep.room.memory.claim;
    }


    /** @param {Creep} creep **/
    run(creep) {
        if (!creep.memory.homeroom) {
            creep.memory.homeroom = creep.room.name;
        }
        if (!creep.memory.action) {
            this.init(creep);
        }
        let remoteRoom = Game.rooms[creep.memory.remoteRoom];
        let roomAlreadyClaimed = remoteRoom && remoteRoom.controller  &&  remoteRoom.controller.owner
            && remoteRoom.controller.owner.username == creep.owner.username;
        // creep.log('claimed ok ? ', roomAlreadyClaimed, JSON.stringify(Game.rooms[creep.memory.remoteRoom].controller.owner));
        if (creep.memory.action == 'go_remote_room' && !(roomAlreadyClaimed)) {
            if(!this.goRemoteTask.accepts(creep) ) {
                creep.memory.action = 'load';
            } else {
                return;
            }
            // creep.log('reached remote room',creep.memory.action)
        } else if (creep.memory.action == 'load' && creep.room.name != creep.memory.homeroom && roomAlreadyClaimed) {
            creep.memory.action = 'go_home_room';
            delete creep.memory.target;
            // creep.log('full', creep.memory.action);
        } else if (creep.memory.action == 'go_home_room') {
            if (!roomAlreadyClaimed) {
                creep.memory.action = 'go_remote_room';
            } else if (this.goHomeTask.accepts(creep)) {
                return ;
            } else {
                creep.memory.previousRole= creep.memory.role;
                creep.memory.role = 'recycle';
            }
            delete creep.memory.target;
        } else {
            // creep.log(JSON.stringify(creep.memory));
        }

        // creep.log(creep.memory.action);

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

module.exports = RoleClaimController;