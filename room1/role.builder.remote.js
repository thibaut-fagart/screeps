var util = require('./util');
var RoleBuilder = require('./role.builder');
var MoveToRoomTask = require('./task.move.toroom');
var FleeToHomeRoomStrategy = require('./strategy.flee.tohomeroom');
var CautiousBuidStrategy = require('./strategy.build.cautious');
var HealStrategy = require('./strategy.remote_heal');
var PickupStrategy = require('./strategy.pickup');
var KeeperPickupStrategy = require('./strategy.pickup.keeper');
var HarvestKeeperEnergySourceToContainerStrategy = require('./strategy.harvest_keepersource_to_container');
var LoadFromContainerStrategy = require('./strategy.load_from_container');

class RoleRemoteBuilder extends RoleBuilder {
    constructor() {
        super();
        this.buildStrategy = new CautiousBuidStrategy();
        this.loadStrategies = [
            // new PickupStrategy(RESOURCE_ENERGY),
            new KeeperPickupStrategy(RESOURCE_ENERGY),
                   new LoadFromContainerStrategy(RESOURCE_ENERGY,  undefined /*,(creep)=>((s)=>([STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION].indexOf(s.structureType) < 0))*/),
                   new PickupStrategy(RESOURCE_ENERGY),
                   new HarvestKeeperEnergySourceToContainerStrategy()];
        this.fleeStrategy = new FleeToHomeRoomStrategy(3);
        this.moveTask = new MoveToRoomTask('remotebuild', 'homeroom','remoteRoom');
        this.goHomeTask = new MoveToRoomTask('remotebuild', 'remoteRoom', 'homeroom');
        this.healStrategy = new HealStrategy(3);
    }

    resign(creep) {
        // do not resign in remote room, go back home
        creep.log('resigning ??');
        // creep.memory.building = false;
        // creep.memory.action = 'go_home_room';
/*
        if (creep.memory['resign_on_move']) {
            delete creep.memory['resign_on_move'];
            super.resign(creep);
        }
        creep.memory['resign_on_move'] = true;
        let oldRemote = creep.memory[this.moveTask.CREEP_REMOTE_PATH];
        creep.memory[this.moveTask.CREEP_REMOTE_PATH] = creep.memory[this.moveTask.CREEP_HOME_PATH];
        creep.memory[this.moveTask.CREEP_HOME_PATH] = oldRemote;
*/
    }

    run(creep) {
        if (this.fleeStrategy.accepts(creep))return;
        this.healStrategy.accepts(creep);
        if (!creep.memory.action) creep.memory.action = 'go_remote_room;';
        if (creep.carryCapacity === _.sum(creep.carry) && creep.memory.action === 'go_home_room') {
            creep.memory.action = 'go_remote_room';
        }
        if(creep.memory.action === 'go_remote_room') {
            if (!this.moveTask.accepts(creep)) {
                creep.memory.action = 'LOAD';
                if (creep.hits + util.healingCapacity(creep) < creep.hitsMax) {
                    if (this.fleeStrategy.accepts(creep)) return;
                }
                // creep.log('super.run');
                super.run(creep);
            }
        } else if (creep.memory.action === 'go_home_room') {
            if (creep.memory.move_previousRoom !== creep.room.name) {
                creep.memory.action = 'LOAD';
                super.run(creep);
            } else  if (!this.goHomeTask.accepts(creep)) {
                creep.memory.action = 'LOAD';
            }
        } else {
            super.run(creep);
        }

    }
}
module.exports = RoleRemoteBuilder;