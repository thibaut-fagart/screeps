var _ = require('lodash');
var util = require('./util');
var PickupStrategy = require('./strategy.pickup');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class KeeperPickupStrategy extends PickupStrategy {
    constructor(resource) {
        super(resource, function(creep){
            return ((drop) =>
                !(creep.room.glanceForAround(LOOK_CREEPS, drop.pos, 5, true).map(d=>d.creep).find(c=>!c.my))
            // drop.pos.findInRange(FIND_HOSTILE_CREEPS,5).length === 0
            );
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
        if (!oldDrop ||
            creep.room.glanceForAround(LOOK_CREEPS, oldDrop.pos, 3, true).map(d=>d.creep).find(c=>!c.my)
            // oldDrop.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length > 0
        ) {
            // if (oldDrop)creep.log('giving up pickup, keeper nearby', oldDrop.pos);
            delete creep.memory[this.PATH];
        }
        return super.accepts(creep);
    }
}

require('./profiler').registerClass(KeeperPickupStrategy, 'KeeperPickupStrategy'); module.exports = KeeperPickupStrategy;