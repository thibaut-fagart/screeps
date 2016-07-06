var _ = require('lodash');
var util = require('./util');
var RemoteAttackStrategy = require('./strategy.remote_target');
var CloseAttackStrategy = require('./strategy.closeattack_target');
var HealStrategy = require('./strategy.remote_heal');
var AttackStructureStrategy = require('./strategy.attack.structure');

class RoleRemoteRoomGuard {
    constructor() {
        this.attackStrategies = [new CloseAttackStrategy(), new RemoteAttackStrategy(), new HealStrategy() /*,new AttackStructureStrategy()*/];
    }

    resign(creep) {
        creep.log("resigning");
        delete creep.memory.role;
        delete creep.memory.action; //{go_remote_room, load, go_home, unload}
        delete creep.memory.remoteRoom;
        delete creep.memory.homeRoom;
        delete creep.memory.target;
    }

    init(creep) {
        creep.memory.action = creep.memory.action || 'go_remote_room';
        creep.memory.homeroom = creep.memory.homeroom || creep.room.name;
        creep.memory.remoteRoom = creep.memory.remoteRoom || creep.room.memory.remoteMining || creep.room.memory.claim;
    }

    findHomeExit(creep) {
        return util.findExit(creep, creep.memory.remoteRoom, 'homeExit');
    }

    /** @param {Creep} creep **/
    run(creep) {
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
                // this.resign(creep);
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
                if (controller.my && creep.pos.getRangeTo(controller.pos) < 5) {
                    // creep.log('fleeing travelled points');
                    let fleepath = util.objectFromMemory(creep.memory, 'fleepath');
                    if (!fleepath) {
                        let fleepoints = _.map(_.union([controller], creep.room.find(FIND_SOURCES), creep.room.find(FIND_STRUCTURES,
                            (s)=>s.structureType === STRUCTURE_SPAWN || s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_EXTENSION))
                        , (s)=> {return {range:10, pos:s.pos}});
                        fleepath = PathFinder.search(creep.pos, fleepoints, {flee: true}).path;
                        // creep.log('pathingto', fleepath.length,fleepath[fleepath.length-1]);
                        fleepath = creep.room.findPath(creep.pos, fleepath[fleepath.length - 1]);
                        // creep.log('fleepath', JSON.stringify(fleepath));

                        creep.memory['fleepath'] = fleepath;
                    }
                    creep.moveByPath(fleepath);
                } else {
                    // creep.log('not fleeing');
                    if (Math.abs(controller.pos.x - creep.pos.x) > 1 || Math.abs(controller.pos.y - creep.pos.y)) {
                        let moveTo = creep.moveTo(controller);
                        if (moveTo !== OK && moveTo !== ERR_TIRED) {
                            creep.log('moveTo?', moveTo);
                        }
                    } else {
                        // creep.log('already at controller, idling');
                    }
                }
                return;
            }
        }
    }
}
;

module.exports = RoleRemoteRoomGuard;