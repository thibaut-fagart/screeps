var Base = require('./strategy.base');
var util = require('./util');

class SwitchFocusStrategy extends Base {
    constructor(flagcolor) {
        super();
    }

    /**
     * if i'm too damaged, move away from hostiles to have them focus someone else
     * @param creep
     * @returns {boolean}
     */
    accepts(creep) {
        if (creep.hits < creep.hitsMax) {
            let moveParts = 0;
            let disabledMoveParts = 0;
            creep.body.forEach((p)=> {
                if (p.type === MOVE) {
                    moveParts++;
                    if (p.hits ===0) {
                        disabledMoveParts++;
                    }
                }
            });
            creep.log('disabled , out of', disabledMoveParts, moveParts);
            if (2*disabledMoveParts< moveParts) {
                // move out of reach
                let closest = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                if (!closest || closest.pos.getRangeTo(creep)>3) return false;
                let path = PathFinder.search(creep.pos, {pos: closest.pos, range: 4}, {flee: true}).path;
                creep.moveByPath(path);
                creep.log('moving out');
                return true;
            }
        }
        return false;
    }

}
module.exports = SwitchFocusStrategy;