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
        let toleratePredicate = (creep)=> {
            if (creep.room.memory.tolerates) {
                let tolerated = creep.room.memory.tolerates;
                return function (target) {
                    return !target.owner // npc ?
                        || (target.getActiveBodyparts(ATTACK) > 0 || target.getActiveBodyparts(RANGED_ATTACK) > 0) // hostile
                        || tolerated.indexOf(target.owner.username) < 0; //accepted
                };
            } else {
                return ()=>true;
            }
        };
        this.healStrategy = new RemoteHealKeeperGuardStrategy(5);
        this.attackStrategies = [
            this.healStrategy, new RegroupStrategy(COLOR_WHITE), new RemoteAttackStrategy(5, toleratePredicate), new SquadAttackStrategy(3, toleratePredicate), new RemoteAttackStrategy(undefined, toleratePredicate),
            new HealStrategy(), new CloseAttackStrategy(undefined, toleratePredicate)/*,new AttackStructureStrategy()*/];
        this.regroupStrategy = new RegroupStrategy(COLOR_BLUE);
        this.moveTask = new MoveToRoomTask('attack', 'homeroom', 'remoteRoom');
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
        creep.memory.action = creep.memory.action || 'wait';
        creep.memory.homeroom = creep.memory.homeroom || creep.room.name;
        creep.memory.remoteRoom = creep.memory.remoteRoom || (_.isString(creep.room.memory.remoteMining) ? creep.room.memory.remoteMining : creep.room.memory.remoteMining[0])
            || creep.room.memory.claim || creep.room.memory.attack;
    }

    /** @param {Creep} creep **/
    run(creep) {
        if (!creep.memory.action) {
            this.init(creep);
        }
        if (!this.healStrategy.accepts(creep) && new RegroupStrategy(COLOR_WHITE).accepts(creep)) return;
        if (creep.room.name === creep.memory.homeroom) {
            let seeking = this.seekBoosts(creep);
            // creep.log('seeking ? ', seeking);
            if (seeking) return;
        }
        let brotherCount = this.brotherCount(creep);
        if (creep.memory.action === 'wait') {
            let remoteRoom = Game.rooms[creep.memory.remoteRoom];
            if (remoteRoom && remoteRoom.find(FIND_HOSTILE_CREEPS) == 0) {
                creep.memory.action = 'go_remote_room';
            } else {
                // creep.log('brothers?', brotherCount);
                if (!creep.room.memory.attack_min || (creep.room.memory.attack_min && creep.room.memory.attack_min[creep.memory.remoteRoom]<= (brotherCount))) {
                    creep.memory.action = 'go_remote_room';
                } else {
                    this.regroup(creep);
                }
            }
        } else if (creep.room.name !== creep.memory.remoteRoom && creep.room.name !== creep.memory.homeroom) {
            creep.memory.action = 'go_remote_room';
        }

        if (creep.memory.action == 'go_remote_room') {
            if (!this.moveTask.accepts(creep)) {
                creep.memory.action = 'defend';
                creep.memory.controller = (creep.room.controller ? creep.room.controller.id : 'none');
                // creep.log('reached remote room',creep.memory.action)
            } else {
                return;
            }
        } else if (creep.memory.action == 'go_home_room') {
            if (!new MoveToRoomTask(undefined, 'remoteRoom', 'homeroom').accepts(creep)) {
                creep.memory.action = 'stop';
                creep.memory.controller = (creep.room.controller ? creep.room.controller.id : 'none');
                // creep.log('reached remote room',creep.memory.action)
            } else {
                return;
            }
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action === 'defend' && creep.memory.homeroom == creep.room.name) {
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
                strategy = _.find(this.attackStrategies, (strat)=>strat.accepts(creep));
                creep.log('newStrategy',util.strategyToLog(strategy));
            }
            if (strategy) {
                // creep.log('strategy', strategy.constructor.name);
                // util.setCurrentStrategy(creep, strategy);
                delete creep.memory['fleepath'];
            } else {
                // creep.log('no attackStrategy, moving to controller');
                this.regroup(creep);
                return;
            }
        }
    }

    regroup(creep) {
        this.regroupStrategy.accepts(creep);
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
            inRange += remoteBrothers;
        }
        // if (creep.room.name === 'E37S14') creep.log('brothers?', inRange);
        return inRange;
    }

    /**
     *
     * @param creep
     * @returns {boolean} true if looking for boost, false if it's all good
     */
    seekBoosts(creep) {
        // creep.log('seekBoosts');
    }

    boostPartType(creep, parts) {
        let part_type = parts[0].type;
        let labs = creep.room.memory.labs;
//        creep.log('labs?', JSON.stringify(labs));
        if (!labs) return false;
        labs = _.keys(labs).map((id)=>Game.getObjectById(id));
        let lab;
        for (let i = 0; i < RoleRemoteRoomGuard.WANTED_BOOSTS[part_type].length && !lab; i++) {
            let boost = RoleRemoteRoomGuard.WANTED_BOOSTS[part_type][i];
            // creep.log('testing ', boost);
            lab = labs.find((lab)=> {
                return lab.mineralType && boost == lab.mineralType && lab.mineralAmount > 10;
            });
            // creep.log('found', lab);
            if (lab) break;
        }
        // creep.log('boosting with ', lab);
        /*
         labs = labs.filter((lab)=>{
         // creep.log('testing ', JSON.stringify(RoleRemoteRoomGuard.WANTED_BOOSTS[part_type]), lab.mineralType, lab.mineralAmount, lab.mineralType && RoleRemoteRoomGuard.WANTED_BOOSTS[part_type].indexOf(lab.mineralType)>=0 && lab.mineralAmount > 10);
         return lab.mineralType && RoleRemoteRoomGuard.WANTED_BOOSTS[part_type].indexOf(lab.mineralType)>=0 && lab.mineralAmount > 10;
         });
         */
        // creep.log('boosting labs for',RoleRemoteRoomGuard.WANTED_BOOSTS[part_type],JSON.stringify(labs));
        // let labs = creep.room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_LAB && s.mineralType === 'UH'});
        // labs = labs.filter((l)=>l.mineralAmount >= neededBoosts * 30 && l.energy >= 20 * neededBoosts);
        // creep.log('boosting?', attackParts.length, neededBoosts, labs.length);
        // if (labs.length) {
        // creep.log('labs', JSON.stringify(labs));
        // let lab = creep.pos.findClosestByRange(labs);
        // creep.log('lab', JSON.stringify(lab));
        if (!lab) {
            creep.log('NO LAB???', JSON.stringify(labs));
            return false;
        }
        let boosted = lab.boostCreep(creep);
        // creep.log('boosted', boosted);
        if (boosted == ERR_NOT_IN_RANGE) {
            // creep.log('moving to lab', JSON.stringify(lab.pos));
            util.moveTo(creep, lab.pos,'labMove');
            return true;
        } else if (boosted == OK) {
            return false;
        }

        // }

    }
}
RoleRemoteRoomGuard.WANTED_BOOSTS = {};
RoleRemoteRoomGuard.WANTED_BOOSTS[ATTACK] = [RESOURCE_CATALYZED_UTRIUM_ACID, RESOURCE_UTRIUM_ACID, RESOURCE_UTRIUM_HYDRIDE];
RoleRemoteRoomGuard.WANTED_BOOSTS[RANGED_ATTACK] = [RESOURCE_CATALYZED_KEANIUM_ALKALIDE, RESOURCE_KEANIUM_ALKALIDE, RESOURCE_KEANIUM_OXIDE];
RoleRemoteRoomGuard.WANTED_BOOSTS[HEAL] = [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_OXIDE];
RoleRemoteRoomGuard.WANTED_BOOSTS[MOVE] = [RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_ZYNTHIUM_OXIDE];


module.exports = RoleRemoteRoomGuard;