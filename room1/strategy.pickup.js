var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
var PickupManager = require('./util.manager.pickup');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class PickupStrategy extends BaseStrategy {

    /**
     * @typedef {Function} PickupPredicate
     * @param {Creep} creep 
     * @return {CreepPickupPredicate}
     */
    /**
     * @typedef {Function} CreepPickupPredicate
     * @param {Resource} drop
     * @return {boolean}
     */
    /**
     *
     * @param {string} resource
     * @param {PickupPredicate} predicate
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
    cancelPickup(creep) {
        PickupManager.getManager(creep.room).releaseDrop(creep, creep.memory[this.PATH]);
        delete creep.memory[this.PATH];
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