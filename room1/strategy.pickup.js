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
     * @param {PickupPredicate} [predicate]
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

    cancelPickup(creep) {
        PickupManager.getManager(creep.room).releaseDrop(creep, creep.memory[this.PATH]);
        delete creep.memory[this.PATH];
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
        delete creep.memory[this.constructor.name + "Path"];
    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        if (!creep.carryCapacity || _.sum(creep.carry) == creep.carryCapacity) return false;
        /** @type Resource */
        let source = util.objectFromMemory(creep.memory, this.PATH, (r)=>(this.acceptsResource(r.resourceType) && r.amount > 0) && (this.predicate(creep)(r)));
        if (!source) {
            source = this.findSource(creep);
            // source = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
            // creep.log('reserved?', JSON.stringify(source ));
            if (source) {
                creep.memory[this.PATH] = source.id;
            }
        }
        // creep.log('pickup?', source, (source?source.amount:''));
        if (source && source.room.name ===creep.room.name) {

            // try transfering/moving
            // creep.log('pickup2', source.id, source.resourceType);

            let ret = creep.pickup(source);
            if (ret == ERR_NOT_IN_RANGE) {
                let move = util.moveTo(creep, source.pos,this.constructor.name+"Path");
                // creep.log('pickup  move?', move);
            } else if (ret == OK) {
                delete creep.memory[this.PATH];
                // this.pickedUp(creep, source);
                // creep.log('successfully picked up', source.id, oldEnergy, creep.carry.energy);

            }
        }
        // creep.log("pickup ? ", !!source);
        let accepted = !!(source && source.room.name ===creep.room.name);
        if (!accepted) this.clearMemory(creep);
        return accepted;
    }

    findSource(creep) {
        delete creep.memory[this.constructor.name + "Path"];
        delete creep.memory[this.PATH ];
        return PickupManager.getManager(creep.room.name).allocateDrop(creep, this.resource, this.predicate);
    }

    acceptsResource(resourceType) {
        return !this.resource || (this.resource === util.ANY_MINERAL && resourceType !== RESOURCE_ENERGY) || this.resource === resourceType;
    }
}

require('./profiler').registerClass(PickupStrategy, 'PickupStrategy'); module.exports = PickupStrategy;