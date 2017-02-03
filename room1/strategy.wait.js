let util = require('./util');
var BaseStrategy = require('./strategy.base');
class WaitStrategy extends BaseStrategy {
    constructor(delay) {
        super();
        this.delay = delay || 10;
    }

    accepts(creep) {
        if ('number' !== typeof creep.memory.wait) {
            creep.memory.wait = this.delay;
        }

        if (creep.memory.wait > 0) {
            let waitPos;
            if (!creep.memory.waitAt) {
                if (!creep.room.isValidParkingPos(creep)) {
                    waitPos = creep.room.findValidParkingPosition(creep, creep.pos, 5);
                    if (waitPos) {
                        creep.memory.waitAt = util.posToString(waitPos);
                    } else {
                        creep.log('no valid parking pos in range 5');
                    }
                } else {
                    waitPos = creep.pos;
                    creep.memory.waitAt = util.posToString(creep.pos);
                }
            }
            waitPos = creep.memory.waitAt?util.posFromString(creep.memory.waitAt, creep.room.name):false;
            if (waitPos){
                util.moveTo(creep, waitPos, undefined, {range: 0});
            }
            creep.memory.wait = creep.memory.wait - 1;
            return true;
        } else {
            delete creep.memory.wait;
            delete creep.memory.waitAt;
            return false;
        }
    }

    clearMemory(creep) {
        delete creep.memory.wait;
        return super.clearMemory(creep);
    }
}

require('./profiler').registerClass(WaitStrategy,'WaitStrategy');
module.exports = WaitStrategy;