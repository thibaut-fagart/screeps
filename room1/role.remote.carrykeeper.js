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
        this.pickupStrategy = new KeeperPickupStrategy(RESOURCE_ENERGY, function (creep) {
            return (drop) => drop.pos.findInRange(FIND_HOSTILE_CREEPS, 5).filter(c=>c.hostile).length === 0 && creep.pos.getRangeTo(drop) < 1;
        });
        this.loadStrategies = [
            new KeeperPickupStrategy(undefined, function (creep) {
                return (drop) =>( !(creep.room.glanceForAround(LOOK_CREEPS, drop.pos, 5, true).map(d=>d.creep).find(c=>!c.my)));
                // drop.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length === 0);
            }),
            this.pickupStrategy,
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, function (creep) {
                return (s)=>
                    !(creep.room.glanceForAround(LOOK_CREEPS, s.pos, 4, true).map(d=>d.creep).find(c=>!c.my));
                // s.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length === 0;
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
        if (this.seekBoosts(creep)) return;
        this.healStrategy.accepts(creep);
        if (!this.fleeStrategy.accepts(creep)) {
            // creep.log('super');
            super.run(creep);
        } else {
            // creep.log('fleeing,canceling pickup');
            creep.say('fleeing');
            this.pickupStrategy.cancelPickup(creep);
        }
    }

    /**
     *
     * @param creep
     * @returns {boolean} true if looking for boost, false if it's all good
     */
    seekBoosts(creep) {
        // creep.log('seekBoosts');
        if (creep.memory.boosted) {
            return;
        }
        let wantsBoosts = _.keys(_.groupBy(creep.body, (p)=>p.type)).find((partType) => {
            let parts = _.filter(creep.body, (p)=>p.type === partType && !p.boost);
            return !!(parts.length && this.boostPartType(creep, parts));
        });
        if (!wantsBoosts) creep.memory.boosted = true;
        return wantsBoosts;


    }

    boostPartType(creep, parts) {
        return creep.boostPartType(parts);
    }
}

require('./profiler').registerClass(RoleRemoteCarryKeeper, 'RoleRemoteCarryKeeper'); module.exports = RoleRemoteCarryKeeper;
