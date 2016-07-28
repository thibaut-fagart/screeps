var _ = require('lodash');
var util = require('./util');
var RemoteAttackStrategy = require('./strategy.remote_target');
var RegroupStrategy = require('./strategy.regroup');
var CloseAttackStrategy = require('./strategy.closeattack_target');
var HealStrategy = require('./strategy.remote_heal');
var RemoteHealKeeperGuardStrategy = require('./strategy.remote_heal_keeperguard');
var SquadAttackStrategy = require('./strategy.squadattack');
var AttackStructureStrategy = require('./strategy.attack.structure');
var MoveToRoomTask = require('./task.move.toroom');

class RoleRemoteRoomGuard {
    constructor() {
        this.nonExclusiveStrategies = [/*new CloseAttackStrategy(5)*/];
        this.attackStrategies = [
            new RemoteHealKeeperGuardStrategy(5), new RemoteAttackStrategy(5), new SquadAttackStrategy(),new RemoteAttackStrategy(),
            new HealStrategy(),new CloseAttackStrategy(),new RegroupStrategy(COLOR_BLUE)/*,new AttackStructureStrategy()*/];
        this.moveTask = new MoveToRoomTask('attack','homeroom','remoteRoom');
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
        creep.memory.remoteRoom = creep.memory.remoteRoom || (_.isString(creep.room.memory.remoteMining)?creep.room.memory.remoteMining:creep.room.memory.remoteMining[0])
            || creep.room.memory.claim ||creep.room.memory.attack;
    }

    findHomeExit(creep) {
        return util.findExit(creep, creep.memory.remoteRoom);
    }

    findRemoteExit(creep) {
        return util.findExit(creep, creep.memory.homeroom);
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
        if (creep.memory.action == 'go_remote_room') {
            if (!this.moveTask.accepts(creep)) {
                creep.memory.action = 'defend';
                creep.memory.controller = (creep.room.controller ? creep.room.controller.id : 'none');
                // creep.log('reached remote room',creep.memory.action)
            } else {
                return;
            }
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action ==='defend' && creep.memory.homeroom == creep.room.name) {
            creep.memory.action = 'go_remote_room';
            // var exit = this.findHomeExit(creep);
            // creep.moveTo(exit.x, exit.y, {reusePath: 50});
        } else if (creep.memory.action == 'defend'/* && creep.memory.remoteRoom == creep.room.name*/) {
/*
            let atDoor = util.isAtDoor(creep);
            if (atDoor) {
                creep.moveTo(20, 20);
            }
*/
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
                creep.log('strategy', strategy.constructor.name);
                // util.setCurrentStrategy(creep, strategy);
                delete creep.memory['fleepath'];
            } else {
                // creep.log('no attackStrategy, moving to controller');
                let controller = util.objectFromMemory(creep.memory, 'controller');
                if (controller) this.regroup(creep);
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
        if (room && room.name !== creep.room.name) {
            let remoteBrothers = room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role === creep.memory.role}).length;
            // if (creep.room.name === 'E37S14') creep.log('remoteBrothers', remoteBrothers);
            inRange+=  remoteBrothers;
        }
        // if (creep.room.name === 'E37S14') creep.log('brothers?', inRange);
        return inRange;
    }
}



module.exports = RoleRemoteRoomGuard;