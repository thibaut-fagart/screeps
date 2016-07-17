var _ = require('lodash');
var HealStrategy = require('./strategy.remote_heal');
var util= require('./util');
var RoleRemoteCarry = require('./role.remote.carry');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var KeeperPickupStrategy = require('./strategy.pickup.keeper');
var PickupStrategy = require('./strategy.pickup');

class RoleRemoteCarryKeeper extends RoleRemoteCarry {

    constructor() {
        super();
        this.pickupStrategy = new KeeperPickupStrategy(undefined,function(creep){
            return ((drop)=>  {
                return (drop.pos.findInRange(FIND_HOSTILE_CREEPS, 2).length === 0);
            });
        });
        this.fleeStrategy = new AvoidRespawnStrategy(1);
        this.loadStrategies.unshift(new AvoidRespawnStrategy(1));
        this.unloadStrategies = [ new DropToContainerStrategy()];
        this.healStrategy = new HealStrategy(2);
    }
    healingCapacity(creep) {
        return creep.getActiveBodyparts(HEAL)*10;
    }

    run(creep) {
        if (creep.hits +this.healingCapacity(creep) < creep.hitsMax) {
            this.healStrategy.accepts(creep);
            this.fleeStrategy.accepts(creep);
        } else  if (!this.fleeStrategy.accepts(creep)) {
            // creep.log('super');
            super.run(creep);
        }
    }
}
/*
class RoleRemoteCarryKeeper extends RoleRemoteCarry {

    constructor() {
        super();
        this.fleeStrategy = new AvoidRespawnStrategy(1);
        this.loadStrategies = [new AvoidRespawnStrategy(1), new KeeperPickupStrategy(/!*RESOURCE_ENERGY*!/),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER)];
        this.unloadStrategies = [ new DropToContainerStrategy()];
        this.healStrategy = new HealStrategy(3);
    }

    run(creep) {
        if (creep.hits + util.healingCapacity(creep) < creep.hitsMax) {
            this.healStrategy.accepts(creep);
            this.fleeStrategy.accepts(creep);
            let dropped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
            if (dropped.length) {
                creep.pickup(dropped[0]);
            }
        } else  if (!this.fleeStrategy.accepts(creep)) {
            this.healStrategy.accepts(creep);
            super.run(creep);
        }
    }


    moveTo(creep, exit) {
        // let exitPos = creep.pos.findClosestByRange(exit)
        // creep.log('exitPos', JSON.stringify(exit), JSON.stringify(exitPos));
        util.safeMoveTo(creep, exit);
    }
}
*/

module.exports = RoleRemoteCarryKeeper;
