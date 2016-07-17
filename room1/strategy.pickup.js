var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class PickupStrategy extends BaseStrategy {
    /**
     *
     * @param resource
     * @param {Function(Creep)} predicate
     */
    constructor(resource, predicate) {
        super();
        if (!resource) resource = null;
        this.resource = resource;
        this.predicate = (predicate || function (creep) {
            return ((drop)=> true);
        });
        this.PATH = 'pickupSource';
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
            delete plannedPickups[id];
        });
        // let afterCount = _.size(_.keys(this.plannedPickups));
        // creep.log('validating reserves','before', beforeCount, afterCount);
        return plannedPickups;
    }


    /**
     * TODO doesn't work
     * @param {Creep} creep
     * @param {Resource} drop
     * **/
    nonReservedAmount(creep, drop) {
        return drop.amount;
        /*
         let a = this.roomPlannedPickups(creep)[drop.id];
         if (a) {
         let reservedByOthers = _.filter(_.pairs(a), (pair)=>pair.creepid != creep.id);
         // creep.log('nonReserved reservedByOthers', JSON.stringify(reservedByOthers));
         let reservedAmount = _.sum(reservedByOthers, (pair)=>pair[1]);
         /!*
         if (reservedByOthers [0]) {
         creep.log('a pair', JSON.stringify(reservedByOthers[0]));
         }
         *!/
         // creep.log('already reserved amount', reservedAmount);
         return drop.amount - reservedAmount;
         }
         return drop.amount;
         */
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
        if (!creep.carryCapacity || _.sum(creep.carry) == creep.carryCapacity) return false;
        /** @type Resource */
        let source = util.objectFromMemory(creep.memory, this.PATH, (r)=>r.amount > 0);
        if (!source) {
            source = this.findSource(creep);
            // source = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
            if (source) {
                creep.memory[this.PATH] = source.id;
            }
        }
        // creep.log('pickup?', source, (source?source.amount:''));
        if (source) {
            // try transfering/moving
            // creep.log('pickup2', source.id, source.resourceType);

            let ret = creep.pickup(source);
            if (ret == ERR_NOT_IN_RANGE) {
                let move = this.moveTo(creep, source);
                // creep.log('pickup  move?', move);
            } else if (ret == OK) {
                delete creep.memory[this.PATH];
                this.pickedUp(creep, source);
                // creep.log('successfully picked up', source.id, oldEnergy, creep.carry.energy);

            }
        }
        // creep.log("pickup ? ", true && source);
        return (source ? this : null);


    }

    findSource(creep) {
        let source;
        let drops = this.findDrops(creep);
        drops = drops.filter(this.predicate(creep));
        // creep.log('filtered drops', countBefore, drops.length);
        // if (creep.room.name ==='E36S14') creep.log('drops', drops.length);
        let sortedDrops = drops.sort((d) => (d.amount - 5 * creep.pos.getRangeTo(d))*-1);
        // creep.log('sortedDrops', sortedDrops.length, (sortedDrops.reduce(((str,drop)=> str + drop.amount+','),'')));
        if (sortedDrops.length) {
            let drop = sortedDrops.shift();
            // creep.log('choosing drop', drop.amount, JSON.stringify(drop.pos));
            let myAmount = this.nonReservedAmount(creep, drop);
            // creep.log('myAmount', drop.id, drop.amount, myAmount);
            if (myAmount > 0) {
                // creep.log('reserved', drop.id, myAmount);
                source = drop;
                this.reserve(creep, drop);
            }
        }
        return source;
    }

    findDrops(creep) {
        // creep.log('findDrops',this.resource)
        return creep.room.find(FIND_DROPPED_RESOURCES, {filter: (e)=> (!this.resource || this.resource == e.resourceType) && (e.amount > Math.max(20, creep.pos.getRangeTo(e.pos)))});
    }

    moveTo(creep, source) {
        let ret = creep.moveTo(source);
        if (ret == ERR_NO_PATH) {
            creep.log("no path to source");
            delete creep.memory[this.PATH];
            source = null;
        }
        return ret;
    }
}

module.exports = PickupStrategy;