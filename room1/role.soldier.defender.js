var _ = require('lodash');
var util = require('./util');
var CloseAttackStrategy = require('./strategy.closeattack_target');


class RoleDefender {
    constructor() {
        this.attackStrategy = new CloseAttackStrategy(1);
    }

    init(creep) {
        creep.memory.action = creep.memory.action || 'defend';
    }

    /**
     * search for a rampart in range of an ennemy and beeline for it
     * @param {Creep} creep
     **/
    run(creep) {
        if (!creep.memory.action) {
            this.init(creep);
        }
        if (this.seekBoosts(creep)) {
            return;
        }
        let ennemies = creep.room.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile);
        // search an ennemy with a free rampart in range
        // creep.log('ennemies', ennemies.length);
        let validEnnemies = ennemies.reduce((acc, c)=> {
            let ramparts = creep.room.glanceForAround(LOOK_STRUCTURES, c.pos, 1, true)
                .map(l=>l.structure)
                .filter(s=>s.structureType === STRUCTURE_RAMPART && s.pos.lookFor(LOOK_CREEPS).filter(c=>c.id !== creep.id).length ===0);
            if (ramparts.length) {
                acc.push({creep: c, ramparts: ramparts});
            }
            return acc;
        }, []);
        // creep.log('ennemies near ramparts', validEnnemies.length);

        if (validEnnemies.length == 0) {
            return;
        }
        let chosenEnnemyWithRamparts = _.min(validEnnemies, c=>c.creep.pos.getRangeTo(creep));
        if (chosenEnnemyWithRamparts!==Infinity) {
            let chosenEnnemy = chosenEnnemyWithRamparts.creep;
            if (chosenEnnemy.pos.getRangeTo(creep) > 1) {
                // creep.log('moving to ', chosenEnnemyWithRamparts.ramparts[0].pos);
                util.moveTo(creep, chosenEnnemyWithRamparts.ramparts[0].pos, 'ennemyPath', {range: 0, ignoreHostiles:true});
            } else if (validEnnemies.length) {
                // creep.log('atttacking ', chosenEnnemy.pos);
                creep.attack(chosenEnnemy);
                // this.attackStrategy.accepts(creep);
            }
        }
    }

    boostPartType(creep, parts) {
        let part_type = parts[0].type;
        let labs = creep.room.memory.labs;
//        creep.log('labs?', JSON.stringify(labs));
        if (!labs) return false;
        labs = _.keys(labs).map((id)=>Game.getObjectById(id));
        let lab;
        for (let i = 0; i < RoleDefender.WANTED_BOOSTS[part_type].length && !lab; i++) {
            let boost = RoleDefender.WANTED_BOOSTS[part_type][i];
            // creep.log('testing ', boost);
            lab = labs.find((lab)=> {
                return lab.mineralType && boost == lab.mineralType && lab.mineralAmount > 10;
            });
            // creep.log('found', lab);
            if (lab) break;
        }

        if (!lab) {
            creep.log('NO LAB???', JSON.stringify(labs));
            return false;
        }
        let boosted = lab.boostCreep(creep);
        // creep.log('boosted', boosted);
        if (boosted == ERR_NOT_IN_RANGE) {
            // creep.log('moving to lab', JSON.stringify(lab.pos));
            util.moveTo(creep, lab.pos, 'labMove');
            return true;
        } else if (boosted == OK) {
            return false;
        }

        // }

    }

    seekBoosts(creep) {
        let boostingPart = _.keys(RoleDefender.WANTED_BOOSTS).find((partType) => {
            let parts = _.filter(creep.body, (p)=>p.type === partType && !p.boost);
            if (parts.length && this.boostPartType(creep, parts)) {
                return true;
            } else {
                return false;
            }
        });
        return boostingPart;
    }


}
RoleDefender.WANTED_BOOSTS = {};
RoleDefender.WANTED_BOOSTS[ATTACK] = ['UH2O','UH'];

require('./profiler').registerClass(RoleDefender, 'RoleDefender');
module.exports = RoleDefender;