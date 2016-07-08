var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class PickupStrategy extends BaseStrategy {
    constructor(resource) {
        super();
        if (!resource) resource = RESOURCE_ENERGY;
        this.resource = resource;
        this.PATH = 'pickupSource';
    }

    /**
     *
     * @param {Object}state
     * @return {true|false}
     */
    acceptsState(state) {
        return super.acceptsState(state)
            && state.resource == this.resource;
    }

    saveState() {
        let s = super.saveState();
        s.resource = this.resource;
        return s;
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    /**
     * @param {Creep} creep
     */
    roomPlannedPickups(creep) {
        let plannedPickups = creep.room.memory[this.constructor.name] || {};
        creep.room.memory[this.constructor.name] = plannedPickups;
        // console.log('loaded plannedPickups', JSON.stringify(this.plannedPickups));


        let dropids = _.keys(plannedPickups);
        // let beforeCount = _.size(dropids);
        // remove old drops
        _.filter(dropids, (id)=> !Game.getObjectById(id)).forEach((id)=> {
            delete plannedPickups[id]
        });
        // let afterCount = _.size(_.keys(this.plannedPickups));
        // creep.log('validating reserves','before', beforeCount, afterCount);
        return plannedPickups;
    }


    /**
     * @param {Creep} creep
     * @param {Resource} drop
     * **/
    nonReservedAmount(creep, drop) {
        let a = this.roomPlannedPickups(creep)[drop.id];
        if (a) {
            let reservedByOthers = _.filter(_.pairs(a), (pair)=>pair.creepid != creep.id);
            // creep.log('nonReserved reservedByOthers', JSON.stringify(reservedByOthers));
            let reservedAmount = _.sum(reservedByOthers, (pair)=>pair[1]);
            /*
             if (reservedByOthers [0]) {
             creep.log('a pair', JSON.stringify(reservedByOthers[0]));
             }
             */
            // creep.log('already reserved amount', reservedAmount);
            return drop.amount - reservedAmount;
        }
        return drop.amount;
    }

    /**
     * @param {Creep} creep
     * @param {Resource} drop
     * **/
    reserve(creep, drop) {
        let a;
        let myMem2 = this.roomPlannedPickups(creep);
        if (!(a = myMem2[drop.id])) {
            a = myMem2[drop.id] = {};
        }
        // creep.log('planned before', JSON.stringify(this.plannedPickups));
        a[creep.id] = Math.min(creep.carryCapacity - _.sum(creep.carry), drop.amount);
        // creep.log('reserving',drop.id, a[creep.id]);
        // creep.log('planned after', JSON.stringify(this.plannedPickups));
        return a[creep.id];

    }

    /**
     * @param {Creep} creep
     * @param {Resource} drop
     * **/
    pickedUp(creep, drop) {
        let a;
        let myMem2 = this.roomPlannedPickups(creep);
        if (!(a = myMem2[drop.id])) {
            a = myMem2[drop.id] = {};
        }
        delete a[creep.id];

    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        if (!creep.carryCapacity) return false;
        /** @type Resource */
        let source = util.objectFromMemory(creep.memory, this.PATH, (r)=>(r.resourceType == this.resource) && r.amount > 0);
        if (!source) {
            let drops = creep.room.find(FIND_DROPPED_ENERGY, {filter: (e)=>e.amount > 50});
            let sortedDrops = drops.sort((d) => -d.amount / creep.pos.getRangeTo(d));
            // creep.log('sortedDrops', sortedDrops.length);
            let plannedPickups = this.roomPlannedPickups(creep);
            while (sortedDrops.length && !source) {
                let drop = sortedDrops.shift();
                let myAmount = this.nonReservedAmount(creep, drop);
                if (myAmount > 0) {
                    // creep.log('reserved', drop.id, myAmount);
                    source = drop;
                    this.reserve(creep, drop);
                }
            }

            // source = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
            if (source) {
                // creep.log('pickup', source.id, source.resourceType);
                creep.memory[this.PATH] = source.id;
            }
        }
        if (source) {
            // try transfering/moving
            let oldEnergy = creep.carry.energy;

            let ret = creep.pickup(source);
            if (ret == ERR_NOT_IN_RANGE) {
                ret = creep.moveTo(source);
                if (ret == ERR_NO_PATH) {
                    creep.log("no path to source");
                    delete creep.memory[this.PATH];
                    source = null;
                }
            } else if (ret == OK) {
                delete creep.memory[this.PATH];
                this.pickedUp(creep, source);
                // creep.log('successfully picked up', source.id, oldEnergy, creep.carry.energy);

            }
        }
        // creep.log("pickup ? ", true && source);
        return (source ? this : null);


    }
}

module.exports = PickupStrategy;