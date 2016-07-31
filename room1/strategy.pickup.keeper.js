var _ = require('lodash');
var util = require('./util');
var PickupStrategy = require('./strategy.pickup');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class KeeperPickupStrategy extends PickupStrategy {
    constructor(resource) {
        super(resource, function(creep){
            return ((drop) => drop.pos.findInRange(FIND_HOSTILE_CREEPS,5).length === 0);
        });
        this.PATH_TO_SOURCE_PATH = 'pickupPath';
    }

    cancelPickup(creep) {
        // creep.log('cancelPickup');
        super.cancelPickup(creep);
        delete creep.memory[this.PATH_TO_SOURCE_PATH];
    }
    findSource(creep) {
        delete creep.memory[this.PATH_TO_SOURCE_PATH];
        return super.findSource(creep);
    }
    

    accepts(creep) {
        let oldid = creep.memory[this.PATH];
        let oldDrop = Game.getObjectById(oldid);
        if (!oldDrop || oldDrop.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length > 0) {
            // if (oldDrop)creep.log('giving up pickup, keeper nearby', oldDrop.pos);
            delete creep.memory[this.PATH];
        }
        return super.accepts(creep);
    }
}

module.exports = KeeperPickupStrategy;