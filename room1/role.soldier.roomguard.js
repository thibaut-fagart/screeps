var _ = require('lodash');
var util = require('./util');
var RemoteAttackStrategy = require('./strategy.remote_target');
var RegroupStrategy = require('./strategy.regroup');
var CloseAttackStrategy = require('./strategy.closeattack_target');
var HealStrategy = require('./strategy.remote_heal');
var RemoteHealKeeperGuardStrategy = require('./strategy.remote_heal_keeperguard');
var SquadAttackStrategy = require('./strategy.squadattack');
var AttackStructureStrategy = require('./strategy.attack.structure');

class RoleRemoteRoomGuard {
    constructor() {
        this.nonExclusiveStrategies = [/*new CloseAttackStrategy(5)*/];
        this.attackStrategies = [
            new RemoteHealKeeperGuardStrategy(5), new SquadAttackStrategy(),new RemoteAttackStrategy(5),
            new HealStrategy(),new CloseAttackStrategy(),new RegroupStrategy(COLOR_BLUE)/*,new AttackStructureStrategy()*/];
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
        creep.memory.action = creep.memory.action || 'wait';
        creep.memory.homeroom = creep.memory.homeroom || creep.room.name;
        creep.memory.remoteRoom = creep.memory.remoteRoom || creep.room.memory.remoteMining || creep.room.memory.claim ||creep.room.memory.attack;
    }

    findHomeExit(creep) {
        return util.findExit(creep, creep.memory.remoteRoom, 'homeExit');
    }

    /** @param {Creep} creep **/
    run(creep) {
        if (!creep.memory.action) {
            this.init(creep);
        }
        let brotherCount = this.brotherCount(creep);
        if (creep.memory.action === 'wait') {
            let remoteRoom = Game.rooms[creep.memory.remoteRoom];
            if (remoteRoom && remoteRoom.find(FIND_HOSTILE_CREEPS) == 0) {
                creep.memory.action = 'go_remote_room';
            } else {
                // creep.log('brothers?', brotherCount);
                if (!creep.room.memory.attack_min || (creep.room.memory.attack_min <= (brotherCount))) {
                    creep.memory.action = 'go_remote_room';
                } else {
                    this.regroup(creep);
                }
            }
        }
        if (creep.memory.action == 'go_remote_room' && creep.room.name != creep.memory.homeroom) {
            creep.memory.action = 'defend';
            creep.memory.controller = (creep.room.controller? creep.room.controller.id:'none');
            // creep.log('reached remote room',creep.memory.action)
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.homeroom) {
            if (!creep.memory.remoteRoom) {
                creep.memory.remoteRoom = creep.memory.remoteRoom || creep.room.memory.remoteMining || creep.room.memory.claim || creep.room.memory.attack;
                creep.log('no remoteMining room');
                // this.resign(creep);
            } else {

                var exit = this.findHomeExit(creep);
                let creeps = creep.room.lookForAt(LOOK_CREEPS, exit.x, exit.y);
                if (creeps.length) {
                    // creep.log('conflict ', creeps);
                    if (!exit.x || exit.x == 49) {
                        let number = exit.y + Math.floor(Math.random()*3)-1;
                        // creep.log('trying ', exit.x, number);
                        creep.moveTo(exit.x, number);
                    } else if (!exit.y || exit.y == 49) {
                        creep.moveTo(exit.x+ Math.floor(Math.random()*3)-1, exit.y);
                    }
                } else {
                    let moveTo = creep.moveTo(exit.x, exit.y, {reusePath: 50});
                }
                // creep.log("moving to homeExit ", moveTo, exit.x, exit.y);
            }
        }
        if (creep.memory.action ==='defend' && creep.memory.homeroom == creep.room.name) {
            var exit = this.findHomeExit(creep);
            creep.moveTo(exit.x, exit.y, {reusePath: 50});
        } else if (creep.memory.action == 'defend' && creep.memory.remoteRoom == creep.room.name) {
            let atDoor = util.isAtDoor(creep);
            if (atDoor) {
                creep.moveTo(20, 20);
            }
            let brothers = this.findBrothers(creep);
            creep.memory.brotherCount = brotherCount;
            creep.memory.leader = _.sortBy(brothers, (b)=>b.name)[0].name;
            
            let strategy = null;
                // util.getAndExecuteCurrentStrategy(creep, this.attackStrategies); // attackStrategy,movetosource
            // creep.log('previousStrategy',util.strategyToLog(strategy));
            if (!strategy) {
                _.filter(this.nonExclusiveStrategies, (strat)=>strat.accepts(creep));
                let strategy = _.find(this.attackStrategies, (strat)=>strat.accepts(creep));
                // creep.log('newStrategy',util.strategyToLog(strategy));
            }
            if (strategy) {
                // creep.log('strategy', strategy.constructor.name);
                // util.setCurrentStrategy(creep, strategy);
                delete creep.memory['fleepath'];
            } else {
                // creep.log('no attackStrategy, moving to controller');
                let controller = util.objectFromMemory(creep.memory, 'controller');
                if (controller) this.regroup(creep);
                /*
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
                 */
                return;
            }
        }
    }

    regroup(creep) {
        let regroupFlags = creep.room.find(FIND_FLAGS, {filter: {color: COLOR_BLUE}});
        if (regroupFlags.length) {
            let flag = regroupFlags[0];
            let fleepath = util.objectFromMemory(creep.memory, 'fleepath');
            if (!fleepath) {
                fleepath = PathFinder.search(creep.pos, flag.pos, {range: 1}).path;
                // creep.log('pathingto', fleepath.length,fleepath[fleepath.length-1]);
                if (fleepath.length) {
                    fleepath = creep.room.findPath(creep.pos, fleepath[fleepath.length - 1]);
                }
                // creep.log('fleepath', JSON.stringify(fleepath));

                creep.memory['fleepath'] = fleepath;
            }
            creep.moveByPath(fleepath);
        }
    }

    findBrothers(creep) {
        return creep.pos.findInRange(FIND_MY_CREEPS, 10, {filter: (c) => c.memory.role === creep.memory.role});
    }
    brotherCount(creep) {
        let inRange = creep.pos.findInRange(FIND_MY_CREEPS, 5, {filter: (c) => c.memory.role === creep.memory.role}).length;
        let room = Game.rooms[creep.memory.remoteRoom];
        // if (creep.room.name === 'E37S14') creep.log('brothers in room', inRange);
        if (room) {
            let remoteBrothers = room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role === creep.memory.role}).length;
            // if (creep.room.name === 'E37S14') creep.log('remoteBrothers', remoteBrothers);
            inRange+=  remoteBrothers;
        }
        // if (creep.room.name === 'E37S14') creep.log('brothers?', inRange);
        return inRange;
    }
}



module.exports = RoleRemoteRoomGuard;