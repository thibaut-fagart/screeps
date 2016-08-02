var _ = require('lodash');
var util = require('./util');
var PickupStrategy = require('./strategy.pickup');
var PickupManager = require('./util.manager.pickup');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class ClosePickupStrategy extends PickupStrategy{

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
    constructor(resource, range, predicate) {
        super(resource, predicate);
        this.range = range || 2;
    }

    findSource(creep) {
        delete creep.memory[this.constructor.name + "Path"];
        let resources = [];
        // creep.room.glanceForAround(LOOK_RESOURCES, creep.pos, this.range , true).map((r)=>r.resource);
        if (resources.length) {
            // todo find the biggest we can consume completely
            let resource = resources.find((r)=>true);
            PickupManager.getManager(creep.room.name).reserve(creep, resource);

            return resource;
        }
        return undefined;
    }
}

module.exports = ClosePickupStrategy;