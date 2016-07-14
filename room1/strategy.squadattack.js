var Base = require('./strategy.base');
var RegroupStrategy = require('./strategy.regroup');
var util = require('./util');

class SquadAttackStrategy extends Base {
    constructor(range) {
        super();
        this.range = range || 3;
        this.MOVE_PATH = 'movePath';
    }
    findBrothers(creep) {
        return creep.pos.findInRange(FIND_MY_CREEPS, this.range, {filter: (c) => c.memory.role == creep.memory.role});
    }
    previousClosest (creep) {
        return creep.memory['previousClosest'];
    }
    setPreviousClosest (creep, v) {
        if (v) creep.memory['previousClosest']= v; else delete creep.memory['previousClosest'];
    }

    /**
     * waits for , either the hostiles to get in range, or the number of brothers to mathc homeroom.min_attack
     * @param creep
     * @returns {*}
     */
    accepts(creep) {
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);


        if (!hostiles.length) {
            this.setPreviousClosest(creep);
            return false;
        }
        let all = creep.room.find(FIND_MY_CREEPS, {filter:(c)=>(c.memory.role === creep.memory.role)})
        let brothers = _.filter(all,(c)=>(c.memory.role === creep.memory.role));
        // creep.log('brothers?', brothers.length);

        let leader = _.sortBy(brothers, (b)=>b.name)[0];
        let isLeader = leader.name === creep.name;
        if (brothers.length < Game.rooms[creep.memory.homeroom].memory.attack_min) {
            if (!isLeader && creep.pos.getRangeTo(leader)>1) {
                creep.moveTo(leader);
            }
            return true;
        }
        // creep.log('leader', leader);
        let closestEnemy = leader.pos.findClosestByRange(hostiles);
        let myRange = closestEnemy.pos.getRangeTo(creep);
        if (myRange< 4) {
            // in range, BANZAI !
            return false;
        } else  if(!isLeader && creep.pos.getRangeTo(leader)>1) {
            creep.moveTo(leader);
        } else {
            let minAttack = Game.rooms[creep.memory.homeroom].memory.attack_min;
            // creep.log('brothers?', brothers.length, minAttack);
            if ((minAttack && (brothers.length +1))< minAttack) {
                // waiit till roster complete
                return true;
            }
            let brothersRange = _.map(brothers, (b)=> [b, b.pos.getRangeTo(closestEnemy)]);
            let brotherAndRangeClosestToEnnemy = _.max(brothersRange, (pair)=>pair[1]);
            let distanceToClosestBrother = creep.pos.getRangeTo(brotherAndRangeClosestToEnnemy[0]);
            // creep.log('closest brother range', brotherAndRangeClosestToEnnemy[0],brotherAndRangeClosestToEnnemy[1], myRange, distanceToClosestBrother);
            if (myRange+2 < brotherAndRangeClosestToEnnemy[1]) {
                if (distanceToClosestBrother < 4) {
                    // wait, i'm too far ahead
                    // creep.log(this.constructor.name, 'waiting');
                    return true;
                } else {
                    // we're too spread out, get to hte center
                    let center = _.reduce(brothers, (center, c) => {
                        center.x += c.pos.x;
                        center.y += c.pos.y;
                        return center;
                    }, {x: 0, y: 0});
                    let moveTo = creep.moveTo(Math.floor(center.x/brothers.length), Math.floor(center.y/brothers.length));
                    creep.log(this.constructor.name, 'gathering', center.x, center.y, moveTo);

                    return true;
                }
            } else if ((myRange > brotherAndRangeClosestToEnnemy[1] + 1) && distanceToClosestBrother> 1) {
                creep.log(this.constructor.name, 'closing on brother');
                creep.moveTo(brotherAndRangeClosestToEnnemy[0]);
                return true;
            } else {
                // ok, same range
                // creep.moveTo
                return false;
            }
        }
    }

}
module.exports = SquadAttackStrategy;