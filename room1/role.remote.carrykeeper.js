var _ = require('lodash');
var HealStrategy = require('./strategy.remote_heal');
var util = require('./util');
var RoleRemoteCarry = require('./role.remote.carry');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var KeeperPickupStrategy = require('./strategy.pickup.keeper');
var RegroupStrategy = require('./strategy.regroup');

class RoleRemoteCarryKeeper extends RoleRemoteCarry {

    constructor() {
        super();
        this.fleeStrategy = new AvoidRespawnStrategy(1);
        this.loadStrategies = [
            new KeeperPickupStrategy(RESOURCE_ENERGY, function(creep) {return (drop) => drop.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length === 0 && creep.pos.getRangeTo(drop) < 5;}),
            new KeeperPickupStrategy(undefined, function(creep) {return  (drop)  =>(drop.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length === 0);}),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, function (creep) {
                return (s)=>s.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length === 0;
            })
        ];
        this.unloadStrategies = [
            // new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
            new DropToContainerStrategy(undefined, undefined,
                (creep)=> {
                    return function (s) {
                        return s.structureType === STRUCTURE_LINK || s.structureType === STRUCTURE_STORAGE;
                    };
                })];

        this.healStrategy = new HealStrategy(2);
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }

    healingCapacity(creep) {
        return creep.getActiveBodyparts(HEAL) * 10;
    }

    run(creep) {
        if (creep.hits + this.healingCapacity(creep) < creep.hitsMax) {
            this.healStrategy.accepts(creep);
            creep.log('healing');
            if (this.fleeStrategy.accepts(creep)) {
                // creep.log('fleeing, canceling pickup');
                creep.say('fleeing');
            }
        } else if (!this.fleeStrategy.accepts(creep)) {
            // creep.log('super');
            super.run(creep);
        } else {
            // creep.log('fleeing,canceling pickup');
            creep.say('fleeing');
            this.pickupStrategy.cancelPickup(creep);
        }
    }
}

module.exports = RoleRemoteCarryKeeper;
