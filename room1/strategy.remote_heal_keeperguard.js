var _ = require('lodash');
var RemoteHealStrategy = require('./strategy.remote_heal');

class RemoteHealKeeperGuardStrategy extends RemoteHealStrategy {

    constructor(range) {
        super(range);
        this.matrix = void(0);
    }

    findHealingTargets(creep) {
        let targets = super.findHealingTargets(creep)
            .filter((c)=> {
                if (c.memory.role !== creep.memory.role) return (c.hits < 0.5 * c.hitsMax);
                let ratio = c.hits / c.hitsMax;
                return (ratio < 0.75) || (ratio < 1 && c.pos.getRangeTo(creep) == 1);
            });
        // creep.log('healing targets', targets.length);
        return targets;

    }

    moveToAndHeal(creep, damaged) {
        let rangeToDamaged = creep.pos.getRangeTo(damaged);
        if (rangeToDamaged > 1) {
            let hostiles = damaged.pos.findInRange(FIND_HOSTILE_CREEPS);
            if (hostiles.length) {
                let rangeTo = hostiles[0].pos.getRangeTo(creep.pos);
                if (rangeTo === 3) {
                    creep.moveTo(hostiles[0]);
                    creep.rangedHeal(damaged);
                } else if (rangeTo ===2) {
                    creep.moveTo(damaged);
                    creep.heal(damaged);
                }
            } else {
                creep.moveTo(damaged);
                if (rangeToDamaged ===2) {
                    creep.heal(damaged);
                }  else {
                    creep.rangedHeal(damaged);
                }
            }
/*
            let matrix = new PathFinder.CostMatrix();
            let hostiles = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
            let range = (p, x, y) => (Math.abs(p.x - x) + Math.abs(p.y - y));

            for (let x = 0; x < 50; x++) {
                for (let y = 0; y < 50; y++) {
                    hostiles.forEach((h)=> {
                        if (range(h.pos, x, y) > 3) {
                            matrix.set(x, y, 10);
                        }
                    });
                }
            }
            let path = PathFinder.search(creep.pos, {pos: damaged.pos, range: 1}, {
                roomCallback: (roomName) => {
                    return (roomName == creep.room.name) ? matrix : false;
                }
            }).path;
            if (path.length) {
                creep.moveTo(path[0]);
                creep.rangedHeal(damaged);
            } else {
                creep.log('path failed');
                return super.moveToAndHeal(creep, damaged);
            }
*/
        } else {
            creep.heal(damaged);
        }

    }

    /*
     moveToAndHeal(creep, damaged) {
     // try not to get OUT OF RANGE (eg, move closer rather than further from hostile)
     if (creep.pos.getRangeTo(damaged)>1) {
     if (!this.matrix) {
     let matrix = new PathFinder.CostMatrix();
     let hostiles = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
     let range = (p, x, y) => (Math.abs(p.x - x) + Math.abs(p.y - y));
     for (let x = 0; x < 50; x++) {
     for (let y = 0; y < 50; y++) {
     matrix.set(x, y, 10);
     }
     }
     // best place is as far as possible, but still in range
     hostiles.forEach((h)=> {
     for (let r = 3; r>0; r--) {
     for (let x = h.pos.x-r; x < h.pos.x+r; x++) {
     for (let y = h.pos.y-r; x < h.pos.y+r; y++) {
     matrix.set(x, y, 9/r);
     }
     }
     }
     matrix.set(h.pos.x, h.pos.y, 255);
     });

     this.matrix =matrix
     }
     let path = PathFinder.search(creep.pos, {pos: damaged.pos, range: 1}, {
     roomCallback: (roomName) => {
     return (roomName == creep.room.name) ? this.matrix: false;
     }
     }).path;
     if (path.length) {
     creep.moveTo(path[0]);
     creep.rangedHeal(damaged);
     } else {
     creep.log('path failed');
     return super.moveToAndHeal(creep, damaged);
     }
     }
     creep.heal(damaged);


     }
     */

    accepts(creep) {
        // creep.log('sub');
        super.accepts(creep);
    }
}

module.exports = RemoteHealKeeperGuardStrategy;