var util = require('./util');
var RoleBuilder = require('./role.builder');
var MoveToRoomTask = require('./task.move.toroom');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var CautiousBuidStrategy = require('./strategy.build.cautious');
var HealStrategy = require('./strategy.remote_heal');
var PickupStrategy = require('./strategy.pickup');
var KeeperPickupStrategy = require('./strategy.pickup.keeper');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestKeeperSourceStrategy = require('./strategy.harvest_keepersource');

class RoleRemoteBuilder extends RoleBuilder {
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined ),
            new KeeperPickupStrategy(RESOURCE_ENERGY),
            new PickupStrategy(RESOURCE_ENERGY),
            new HarvestKeeperSourceStrategy(RESOURCE_ENERGY)];
        this.fleeStrategy = new AvoidRespawnStrategy(4);
        this.moveTask = new MoveToRoomTask('remotebuild', 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask('remotebuild', 'remoteRoom', 'homeroom');
        this.healStrategy = new HealStrategy(3);
        util.indexStrategies(this.loadStrategies);

    }

    onNoLoadStrategy(creep) {
        // creep.memory.action = 'go_home_room';
    }

    resign(creep) {
        // do not resign in remote room, go back home
        creep.log('resigning ??');
        creep.memory.role = 'repair2';
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
        if (creep.seekBoosts(WORK,['LH'])) return;
        if (this.fleeStrategy.accepts(creep))return;
        this.healStrategy.accepts(creep);
        if (!creep.memory.action) creep.memory.action = 'go_remote_room';
        if (creep.carryCapacity === _.sum(creep.carry) && creep.memory.action === 'go_home_room') {
            creep.memory.action = 'go_remote_room';
        }
        if (_.sum(creep.carry) !== creep.carry.energy) {
            _.keys(creep.carry).forEach((resource)=> {
                if (RESOURCE_ENERGY !== resource) creep.drop(resource);
            });
        }
        if (creep.memory.action === 'go_remote_room') {
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
            } else if (!this.goHomeTask.accepts(creep)) {
                creep.memory.action = 'LOAD';
            }
        } else if (creep.room.name !== creep.memory.remoteRoom) {
            creep.memory.action = 'go_remote_room';
        } else {
            super.run(creep);
        }

    }
}
require('./profiler').registerClass(RoleRemoteBuilder, 'RoleRemoteBuilder');

module.exports = RoleRemoteBuilder;