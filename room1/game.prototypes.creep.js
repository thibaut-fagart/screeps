var _ = require('lodash');
var util = require('./util');

Creep.prototype.getSquadTarget = function () {
    "use strict";
    if (this.memory['SquadAttackStrategy']) {
        let pos = this.memory['SquadAttackStrategy'].target;
        return new RoomPosition(pos.x, pos.y, pos.roomName);
    }
};

Creep.prototype.boostPartType = function (parts) {
    "use strict";
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
            this.log(`no lab for ${part_type} , boosts : ${boosts}` );
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
module.exports = Room.prototype;