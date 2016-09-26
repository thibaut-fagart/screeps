var _ = require('lodash');
var util = require('./util');

Creep.prototype.getSquadTarget = function () {
    "use strict";
    if (this.memory['SquadAttackStrategy']) {
        let pos = this.memory['SquadAttackStrategy'].target;
        return new RoomPosition(pos.x, pos.y, pos.roomName);
    }
};
/**
 * returns the speed of this creep ,actually ticks to move on each terrain
 * @returns {{empty: {road: number, plain: number, swamp: number}, full: {road: number, plain: number, swamp: number}}}
 */
Creep.prototype.speed = function () {
    'use strict';
    let moves = this.getActiveBodyparts(MOVE);
    let carrys = this.getActiveBodyparts(CARRY);
    let total = this.body.length;
    return {
        empty: {
            road: Math.ceil((total - carrys - moves) / (2 * moves)),
            plain: Math.ceil((total - carrys - moves) / moves),
            swamp: Math.ceil(5 * (total - carrys - moves) / moves),
        }, full: {
            road: Math.ceil((total - moves ) / (2 * moves)),
            plain: Math.ceil((total - moves) / moves),
            swamp: Math.ceil(5 * (total - moves) / moves),
        }
    };
};
/**
 *
 * @returns {boolean} true if looking for boost, false if it's all good
 * @param partType
 * @param minerals
 */
Creep.prototype.seekBoosts = function (partType, minerals) {
    // this.log('seekBoosts');
    if (this.memory.boosted) return false;
    let parts = _.filter(this.body, (p)=>p.type === partType);
    if (parts.length) {
        let neededBoosts = parts.length - parts.filter((p)=>p.boost).length;
        if (!neededBoosts) return false;
        let labs = this.room.structures[STRUCTURE_LAB];
        labs = minerals.reduce((foundLabs, min)=> {
            if (foundLabs && foundLabs.length) return foundLabs;
            let found = labs.filter(lab => lab.mineralType === min && lab.mineralAmount >= 30 && lab.energy >= 20);
            // this.log('testing ', min, found.length);
            if (found.length) {
                return found;
            }
        }, []);
        if (!labs) {
            return false;
        }
        // this.log('boosting?', parts.length, neededBoosts, labs);
        if (labs.length && neededBoosts) {
            // this.log('labs', JSON.stringify(labs));
            let lab = this.pos.findClosestByRange(labs);
            this.log('lab', JSON.stringify(lab));
            if (!lab) {
                this.log('NO LAB???', JSON.stringify(labs));
                this.memory.boosted = true;
                return false;
            }
            let boosted = lab.boostCreep(this);
            if (boosted == ERR_NOT_IN_RANGE) {
                // this.log('moving to lab', JSON.stringify(lab.pos));
                this.moveTo(lab);
                return true;
            } else if (boosted == OK) {
                this.memory.boosted = true;
                return false;
            } else {
                this.log('boost failed', boosted, lab);
            }

        }
    }
    return false;

};

Creep.prototype.boostPartType = function (parts) {
    'use strict';
    let part_type = parts[0].type;
    let lab;
    if (!this.memory.boostingLab) {
        let labs = this.room.memory.labs;
//        this.log('labs?', JSON.stringify(labs));
        if (!labs) return false;
        // what allowed boosts apply to this part
        let boosts = _.intersection(this.room.allowedBoosts(this.memory.role), _.keys(BOOSTS[part_type]));
        labs = _.keys(labs).map((id)=>Game.getObjectById(id));
        for (let i = 0; i < boosts.length && !lab; i++) {
            let boost = boosts[i];
            // this.log('testing ', boost);
            lab = labs.find((lab)=> {
                return lab.mineralType && boost == lab.mineralType && lab.mineralAmount > 10;
            });
            // this.log('found', lab);
            if (lab) break;
        }
        if (!lab) {
            this.log(`no lab for ${part_type} , boosts : ${boosts}`);
            return false;
        }
        if (lab) this.memory.boostingLab = lab.id;
    } else {
        lab = Game.getObjectById(this.memory.boostingLab);

    }
    let boosted = lab.boostCreep(this);
    // this.log('boosted', boosted);
    if (boosted == ERR_NOT_IN_RANGE) {
        // this.log('moving to lab', JSON.stringify(lab.pos));
        util.moveTo(this, lab.pos, 'labMove');
        return true;
    } else if (boosted == OK) {
        Game.notify(`${this.room.name} , boosted ${this.memory.role} with ${lab.mineralType}`)
        delete this.memory.boostingLab;
        return false;
    }
};

/**
 *todo : account for boosts
 */
Object.defineProperty(Creep.prototype, 'repairCapacity', {
    get: function () {
        'use strict';
        this.memory.repairCapacity = this.memory.repairCapacity || this.getActiveBodyparts(WORK) * REPAIR_POWER;
        return this.memory.repairCapacity;
    }
});
module.exports = Room.prototype;