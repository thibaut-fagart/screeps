var Base = require('./strategy.base');
var util = require('./util');

class RegroupStrategy extends Base {
    constructor(flagcolor) {
        super();
        this.flagColor = flagcolor || COLOR_RED;
        this.PATH = 'regroupPos';
    }

    getRegroupPos(creep) {
        if (creep.memory[this.PATH]) {
            let pos = util.posFromString(creep.memory[this.PATH], creep.room.name);

            if (pos.lookFor && pos.lookFor(LOOK_FLAGS).find(f=>f.color === this.flagColor && f.secondaryColor === this.flagColor)) {
                return pos;
            } else {
                delete creep.memory[this.PATH];
            }
        }
        let regroupFlags = creep.room.find(FIND_FLAGS).filter(f=>f.color== this.flagColor && f.secondaryColor== this.flagColor);
        if (regroupFlags.length) {
            let flag = creep.pos.findClosestByRange(regroupFlags);
            // creep.log('flag ', flag);
            let pos = creep.room.findValidParkingPosition(creep, flag.pos, 1);
            // creep.log('parkAt ', pos);
            if (pos) {
                creep.memory[this.PATH] = util.posToString(pos);
            }
            return pos;
        } else {
            // creep.log('no regroup flag');
        }
    }

    accepts(creep) {
        // creep.log('regroup?');
        let pos = this.getRegroupPos(creep);
        if (pos) {
            // creep.log('regrouping on ', pos);
            util.moveTo(creep, pos, 'regroup_' + this.flagColor);
            // return pos.getRangeTo(creep)> 1;
        }  else {
            // creep.log('no flag', this.flagColor);
        }
        // return !pos;
        return false;
    }

}
require('./profiler').registerClass(RegroupStrategy, 'RegroupStrategy'); module.exports = RegroupStrategy;