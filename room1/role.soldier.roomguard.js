var _ = require('lodash');
var util = require('./util');
var RemoteAttackStrategy = require('./strategy.remote_target');
var CloseAttackStrategy = require('./strategy.closeattack_target');
var HealStrategy = require('./strategy.remote_heal');

class RoleRemoteRoomGuard {
    constructor() {
        this.attackStrategies = [new CloseAttackStrategy(), new RemoteAttackStrategy(), new HealStrategy()];
    }
    
    resign(creep) {
        creep.log("resigning");
        delete creep.memory.role;
        delete creep.memory.action; //{go_remote_room, load, go_home, unload}
        delete creep.memory.remoteRoom;
        delete creep.memory.homeRoom;
        delete creep.memory.target;
    }
    init (creep) {
        creep.memory.action = creep.memory.action || 'go_remote_room';
        creep.memory.homeroom = creep.memory.homeroom || creep.room.name;
        creep.memory.remoteRoom = creep.memory.remoteRoom || creep.room.memory.remoteMining;
    }
    findHomeExit(creep) {
        return util.findExit(creep, creep.memory.remoteRoom, 'homeExit');
    }

    /** @param {Creep} creep **/
    run (creep) {
        if (!creep.memory.action) {
            this.init(creep)
        }
        if (creep.memory.action == 'go_remote_room' && creep.room.name != creep.memory.homeroom) {
            creep.memory.action = 'defend';
            creep.memory.controller = creep.room.controller.id;
            // creep.log('reached remote room',creep.memory.action)
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.homeroom) {
            if (!creep.memory.remoteRoom) {
                creep.log("no remoteMining room");
                this.resign();
            } else {
                var exit = this.findHomeExit(creep);
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                // console.log("moving to homeExit ", );
            }
        }

        if (creep.memory.action == 'defend' && creep.memory.remoteRoom == creep.room.name) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.attackStrategies); // attackStrategy,movetosource
            // creep.log('previousStrategy',util.strategyToLog(strategy));
            if (!strategy) {
                strategy = _.find(this.attackStrategies, (strat)=>strat.accepts(creep));
                // creep.log('newStrategy',util.strategyToLog(strategy));
            }
            if (strategy) {
                // creep.log('strategy', strategy.constructor.name);
                util.setCurrentStrategy(creep, strategy);
            } else {
                // creep.log('no attackStrategy, moving to controller');
                let controller = util.objectFromMemory(creep.memory, 'controller');
                if (Math.abs(controller.pos.x-creep.pos.x) >1 || Math.abs(controller.pos.y-creep.pos.y)) {
                    creep.moveTo(controller);
                } else {
                    // creep.log('already at controller, idling');
                }
                return;
            }
        }
    }
};

module.exports = RoleRemoteRoomGuard;