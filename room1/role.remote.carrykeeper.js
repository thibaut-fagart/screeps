var _ = require('lodash');
var HealStrategy = require('./strategy.remote_heal');
var util = require('./util');
var RoleRemoteCarry = require('./role.remote.carry');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var KeeperPickupStrategy = require('./strategy.pickup.keeper');
var PickupStrategy = require('./strategy.pickup');

class RoleRemoteCarryKeeper extends RoleRemoteCarry {

    constructor() {
        super();
        this.pickupStrategy = new KeeperPickupStrategy(undefined, function (drop) {
            return (drop.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length === 0);

        });
        this.fleeStrategy = new AvoidRespawnStrategy(1);
        this.loadStrategies.unshift(new AvoidRespawnStrategy(1));
        this.unloadStrategies = [
            // new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
            new DropToContainerStrategy(undefined, undefined,
            (creep)=> {
                return function (s) {
                    return s.structureType === STRUCTURE_LINK || s.structureType === STRUCTURE_STORAGE;
                };
            })];

        this.healStrategy = new HealStrategy(2);
    }

    healingCapacity(creep) {
        return creep.getActiveBodyparts(HEAL) * 10;
    }

    run(creep) {
        if (creep.hits + this.healingCapacity(creep) < creep.hitsMax) {
            this.healStrategy.accepts(creep);
            creep.log('healing');
            if (this.fleeStrategy.accepts(creep)) {
                this.pickupStrategy.cancelPickup(creep);
                creep.log('fleeing');
            }
        } else if (!this.fleeStrategy.accepts(creep)) {
            // creep.log('super');
            super.run(creep);
        } else {
            this.pickupStrategy.cancelPickup(creep);
        }
    }
}

module.exports = RoleRemoteCarryKeeper;
