var Base = require('./strategy.base');
var RegroupStrategy = require('./strategy.regroup');
var util = require('./util');

class SquadAttackStrategy extends Base {
    constructor(flagcolor) {
        this.flagColor = flagcolor || COLOR_GREEN;
        this.regroupStrategy = new RegroupStrategy(this.flagColor);
    }
    findBrothers(creep) {
        return creep.pos.findInRange(FIND_MY_CREEPS, 5, {filter: (c) => c.memory.role == creep.memory.role});
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
        let regroupFlags = creep.room.find(FIND_FLAGS, {filter: {color: this.flagColor}});
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);

        if (!hostiles.length) {
            this.setPreviousClosest(creep);
            return false;
        }
        let closest = creep.pos.findClosestByRange(hostiles).getRangeTo(creep.pos);
        if (closest < 4) {
            return false;
        }
        // if they're coming, let them coming and stay together !
        let minBrothers = Game.rooms[creep.homeroom].min_attack || 1;
        if (this.previousClosest(creep) >  closest || this.findBrothers()>= minBrothers)  {
    // wait, regroup on squad
            return this.regroupStrategy.accepts(creep);
        }
        if (!(Game.time % 10)) {
            this.previousClosest(creep, closest);
        }
        return false;
    }

}
module.exports = RegroupStrategy;