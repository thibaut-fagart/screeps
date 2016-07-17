var _ = require('lodash');
var util = require('./util');
var PickupStrategy = require('./strategy.pickup');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class KeeperPickupStrategy extends PickupStrategy {
    constructor(resource) {
        super();
        this.PATH_TO_SOURCE_PATH = 'pickupPath';
    }


    findDrops(creep) {
        return super.findDrops(creep).filter((drop)=> drop.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length ==0);
    }


    accepts(creep) {
        let oldid = creep.memory[this.PATH];
        let oldDrop = Game.getObjectById(oldid);
        if (oldDrop.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length == 0) delete creep.memory[this.PATH];
        return super.accepts(creep);
    }

    moveTo(creep, source) {
        let path = creep.memory[this.PATH_TO_SOURCE_PATH];
        if (!path) {
            let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);

            path = PathFinder.search(creep.pos, {pos: container.pos, range: 0}, {
                roomCallback: util.avoidCostMatrix(creep, hostiles)
            }).path;
            creep.memory[this.PATH_TO_SOURCE_PATH] = path;
        }
        if (path.length) {
            let moveTo = creep.moveTo(path[0].x, path[0].y, container, {noPathFinding: true});
            if (moveTo === OK) {
                path.shift();
            }
            // creep.log('moveTo?', moveTo);
            if (ERR_INVALID_TARGET === moveTo || ERR_NO_PATH === moveTo) {
                creep.log('unreachable? switching targets');
                this.clearMemory(creep);
            }
        } else {
            // should be home !
            // creep.log('home?', creep.pos.getRangeTo(container));
            delete creep.memory[this.PATH_TO_SOURCE_PATH];
            path = void(0);
        }
    }
    
}

module.exports = KeeperPickupStrategy;