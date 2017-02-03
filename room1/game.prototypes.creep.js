var _ = require('lodash');
var util = require('./util');

Creep.prototype.getSquadTarget = function () {
    'use strict';
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
    if (this.memory.boosted || !this.room.controller || this.room.controller.level < 6 || _.get(this.room.memory,['preparedBoosts'],[]).length===0) {
        this.memory.boosted = true;
        return false;
    }
    let myboost = (minerals || []).find(b=>this.room.memory.preparedBoosts.indexOf(b)>=0);
    if (!myboost) {
        this.memory.boosted = true;
        return false;
    }
    let parts = _.filter(this.body, (p)=>p.type === partType && !p.boost);
    if (parts.length) {
        let labs = this.room.structures[STRUCTURE_LAB];
        let mylabid = _.keys(this.room.memory.labs).find(id=>this.room.memory.labs[id]===myboost);
        if (!mylabid) {
            this.log('NO LAB???', JSON.stringify(labs));
            this.memory.boosted = true;
            return false;
        }
        let mylab = Game.getObjectById(mylabid);
        // this.log('boosting?', parts.length, neededBoosts, labs);
        // this.log('labs', JSON.stringify(labs));
        this.log('lab', JSON.stringify(mylab.pos));
        let boosted = mylab.boostCreep(this);
        if (boosted == ERR_NOT_IN_RANGE) {
            // this.log('moving to lab', JSON.stringify(lab.pos));
            this.moveTo(mylab);
            return true;
        } else if (boosted == OK) {
            this.memory.boosted = true;
            return false;
        } else {
            this.log('boost failed or incomplete', boosted, mylab);
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
        util.moveTo(this, lab.pos);
        return true;
    } else if (boosted == OK) {
        Game.notify(`${this.room.name} , boosted ${this.memory.role} with ${lab.mineralType}`)
        delete this.memory.boostingLab;
        return false;
    }
};

Object.defineProperty(Creep.prototype, 'hostile', {
    get: function () {
        'use strict';
        return !Memory.allies || !this.owner || Memory.allies.indexOf(this.owner.username) < 0;
    },
    configurable:true,
});

/**
 *todo : account for boosts
 */
Object.defineProperty(Creep.prototype, 'repairCapacity', {
    get: function () {
        'use strict';
        this.memory.repairCapacity = this.memory.repairCapacity || this.getActiveBodyparts(WORK) * REPAIR_POWER;
        return this.memory.repairCapacity;
    },
    configurable:true,
});
module.exports = Room.prototype;