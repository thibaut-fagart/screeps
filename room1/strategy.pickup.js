var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
var PickupManager = require('./util.manager.pickup');
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
        this.PATH = PickupStrategy.PATH;
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }
    
    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        if (!creep.carryCapacity || _.sum(creep.carry) == creep.carryCapacity) return false;
        /** @type Resource */
        let source = util.objectFromMemory(creep.memory, this.PATH, (r)=>(r.amount > 0 && this.predicate(creep)(r)));
        if (!source) {
            source = this.findSource(creep);
            // source = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
            // creep.log('reserved?', source && source.id);
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
                // this.pickedUp(creep, source);
                // creep.log('successfully picked up', source.id, oldEnergy, creep.carry.energy);

            }
        }
        // creep.log("pickup ? ", true && source);
        return (source ? this : null);


    }

    findSource(creep) {
        // if (false)
        // if (true)
            return PickupManager.getManager(creep.room.name).allocateDrop(creep, this.resource, this.predicate);
/*
        else {
            let source;
            let drops = this.findDrops(creep);
            drops = drops.filter(this.predicate(creep));
            // creep.log('filtered drops', countBefore, drops.length);
            // if (creep.room.name ==='E36S14') creep.log('drops', drops.length);
            let availableCarry = creep.carryCapacity - _.sum(creep.carry);
            let sortedDrops = drops.sort((d) => (Math.min(d.amount, availableCarry) - 5 * creep.pos.getRangeTo(d)) * -1);
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
*/
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

PickupStrategy.PATH = 'pickupSource';
module.exports = PickupStrategy;