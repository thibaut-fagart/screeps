var _ = require('lodash');
var util = require('./util');
var RemoteAttackStrategy = require('./strategy.remote_target');
var AttackWallStrategy = require('./strategy.attack_wall');
var MoveToRoomTask = require('./task.move.toroom');
var AttackStructureStrategy = require('./strategy.attack.structure');
var CloseAttackStrategy = require('./strategy.closeattack_target');
var HealStrategy = require('./strategy.remote_heal');
var RegroupStrategy = require('./strategy.regroup');

class RoleTowerAttacker {
    constructor() {
        this.attackStrategies = [
            new CloseAttackStrategy(4),
            // new CloseAttackStrategy(undefined,(creep)=>((target)=>target.getActiveBodyparts(ATTACK)+target.getActiveBodyparts(HEAL)>0)),
            // new RemoteAttackStrategy(),
            new AttackStructureStrategy(10),
            new HealStrategy()/*, new AttackWallStrategy()*/,
            new RegroupStrategy(COLOR_GREEN)
            /*new AttackStructureStrategy()*/];
        this.moveTask = new MoveToRoomTask('attack');
        this.moveBackTask = new MoveToRoomTask('attack', 'remoteRoom', 'homeroom');
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
        if (creep.room.name === creep.memory.homeroom && this.seekBoosts(creep)) {
            return;
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
        } else  if (creep.memory.action == 'go_home_room') {
            if (!this.moveTask.accepts(creep)) {
                creep.memory.action = 'defend';
                // creep.log('reached remote room',creep.memory.action);
            } else {
                return;
            }
        }
        if (creep.memory.action == 'attack' && creep.memory.remoteRoom == creep.room.name) {
            let strategy;
            // = util.getAndExecuteCurrentStrategy(creep, this.attackStrategies); // attackStrategy,movetosource
            creep.log('previousStrategy',util.strategyToLog(strategy));
            // if (!strategy) {
                strategy = _.find(this.attackStrategies, (strat)=>strat.accepts(creep));
                creep.log('newStrategy',util.strategyToLog(strategy));
            // }
            if (strategy) {
                creep.log('strategy', strategy.constructor.name);
                // util.setCurrentStrategy(creep, strategy);
            } else {
                let myColor = creep.memory.color || COLOR_GREEN;
                let myflag = creep.room.find(FIND_FLAGS).filter(f=>f.color === myColor).find(f=>true);
                // creep.log('moving to flag ', greenFlag);
                if (myflag) {
                    creep.moveTo(myflag);
                    return ;
                }
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
        } else {
            new HealStrategy().accepts(creep);
        }
    }
    boostPartType(creep, parts) {
        let part_type = parts[0].type;
        let labs = creep.room.memory.labs;
//        creep.log('labs?', JSON.stringify(labs));
        if (!labs) return false;
        labs = _.keys(labs).map((id)=>Game.getObjectById(id));
        let lab;
        for (let i = 0; i < RoleTowerAttacker.WANTED_BOOSTS[part_type].length && !lab; i++) {
            let boost = RoleTowerAttacker.WANTED_BOOSTS[part_type][i];
            // creep.log('testing ', boost);
            lab = labs.find((lab)=> {
                return lab.mineralType && boost == lab.mineralType && lab.mineralAmount > 10;
            });
            // creep.log('found', lab);
            if (lab) break;
        }

        if (!lab) {
            creep.log('NO LAB???', JSON.stringify(labs));
            return false;
        }
        let boosted = lab.boostCreep(creep);
        // creep.log('boosted', boosted);
        if (boosted == ERR_NOT_IN_RANGE) {
            // creep.log('moving to lab', JSON.stringify(lab.pos));
            util.moveTo(creep, lab.pos, 'labMove');
            return true;
        } else if (boosted == OK) {
            return false;
        }

        // }

    }
    seekBoosts(creep) {

        let boostingPart = _.keys(RoleTowerAttacker.WANTED_BOOSTS).find((partType) => {
            let parts = _.filter(creep.body, (p)=>p.type === partType && !p.boost);
            if (parts.length && this.boostPartType(creep, parts)) {
                return true;
            } else {
                return false;
            }
        });
        return boostingPart;
    }


};
RoleTowerAttacker.WANTED_BOOSTS = {};
RoleTowerAttacker.WANTED_BOOSTS[HEAL] = [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_OXIDE];
RoleTowerAttacker.WANTED_BOOSTS[TOUGH] = [RESOURCE_GHODIUM_OXIDE];

require('./profiler').registerClass(RoleTowerAttacker, 'RoleTowerAttacker'); module.exports = RoleTowerAttacker;