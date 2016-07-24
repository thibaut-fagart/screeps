var _ = require('lodash');
var util = require('./util');
var PickupStrategy = require('./strategy.pickup');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class KeeperPickupStrategy extends PickupStrategy {
    constructor(resource) {
        super(resource, function(creep){
            return ((drop) => drop.pos.findInRange(FIND_HOSTILE_CREEPS).length === 0);
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

    findDrops(creep) {
        return super.findDrops(creep).filter((drop)=> drop.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length ==0);
    }


    accepts(creep) {
        let oldid = creep.memory[this.PATH];
        let oldDrop = Game.getObjectById(oldid);
        if (!oldDrop || oldDrop.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length == 0) delete creep.memory[this.PATH];
        return super.accepts(creep);
    }

    moveTo(creep, source) {
        let path = (creep.memory[this.PATH_TO_SOURCE_PATH] || {})[source.id];
        if (creep.pos.getRangeTo(source)==1 || (path&& source.pos.getRangeTo(path[path.length-1])>1 )) {
            creep.log('invalid cache, clearing');
            delete creep.memory[this.PATH_TO_SOURCE_PATH];
            return OK;
        }
        if (!path || !(path.length)  || creep.pos.getRangeTo(path[0].x,path[0].y)>1) {
            // creep.log('finding path to ', JSON.stringify(source.pos));
            path = util.safeMoveTo(creep, source.pos);
            creep.memory[this.PATH_TO_SOURCE_PATH] = creep.memory[this.PATH_TO_SOURCE_PATH]||{};
            creep.memory[this.PATH_TO_SOURCE_PATH][source.id] = path;
        }
        if (path.length && path[0]) {
            // creep.log('at, next',JSON.stringify(creep.pos),JSON.stringify(path[0]));

            if (path[0].x == creep.pos.x && path[0].y == creep.pos.y) {
                // creep.log('next step');
                path = path.slice(1);
                creep.memory[this.PATH_TO_SOURCE_PATH][source.id] = path;
            }
            // creep.log('moving',JSON.stringify(creep.pos),JSON.stringify(path[0]));
            let moveTo = creep.move(creep.pos.getDirectionTo(path[0].x,path[0].y));
            if (moveTo !== OK && moveTo !== ERR_TIRED) {
                creep.log('moving?', moveTo);
            }

            // creep.log('moveTo?', moveTo);
            if (ERR_INVALID_TARGET === moveTo || ERR_NO_PATH === moveTo) {
                creep.log('unreachable? switching targets');
                this.clearMemory(creep);
            }
            return moveTo;
        } else if (source.pos.getRangeTo(creep)<2) {
            // should be home !
            creep.log('home?', creep.pos.getRangeTo(source));
            delete creep.memory[this.PATH_TO_SOURCE_PATH][source.id];
            path = void(0);

        }else {
            creep.log('unexecpted');
        }

    }
    
}

module.exports = KeeperPickupStrategy;