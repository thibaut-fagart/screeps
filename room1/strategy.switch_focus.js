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
        if (creep.hits < creep.hitsMax && creep.memory.lastHits > creep.hits) {

            let moveParts = 0;
            let disabledMoveParts = 0;
            creep.body.forEach((p)=> {
                if (p.type === MOVE) {
                    moveParts++;
                    if (p.hits < 100) {
                        disabledMoveParts++;
                    }
                }
            });
            // creep.log('disabled , out of', disabledMoveParts, moveParts);
            if (2 * disabledMoveParts > moveParts) {
                // move out of reach
                let closest = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                if (!closest || closest.pos.getRangeTo(creep) > 3) return false;
                let matrix = new PathFinder.CostMatrix();
                for (let x = 0; x < 50; x++) {
                    matrix.set(x, 0, 255);
                    matrix.set(x, 1, 255);
                    matrix.set(x, 48, 255);
                    matrix.set(1, x, 255);
                    matrix.set(48, x, 255);
                }
                let path = PathFinder.search(creep.pos, {pos: closest.pos, range: 4}, {
                    flee: true, roomCallback: (roomName) => {
                        return (roomName == creep.room.name) ? matrix : false;
                    }
                }).path;
                creep.moveByPath(path);
                // creep.log('moving out');
            }
        }
        creep.memory.lastHits = creep.hits;
        return false;
    }

}
module.exports = SwitchFocusStrategy;