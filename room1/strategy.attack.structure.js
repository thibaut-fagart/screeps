var Base = require('./strategy.base');
var util = require('./util');

class AttackStructureStrategy extends Base {
    constructor(range) {
        super();
        this.range = range || Infinity;
    }

    accepts(creep) {
        let targetStructure;
        // creep.log('searching structures');
        if (!(targetStructure = util.objectFromMemory(creep.memory, 'targetStructure'))) {
            /** {Flag}**/
            let flags;
            if (this.range === Infinity) {
                flags = creep.pos.findInRange(FIND_FLAGS, this.range).filter((f)=> f.color === COLOR_RED);
            } else {
                flags = creep.room.find(FIND_FLAGS).filter((f)=> f.color === COLOR_RED);
            }
            let validFlags = flags.filter(f=>f.pos.lookFor(LOOK_STRUCTURES).length + f.pos.lookFor(LOOK_CONSTRUCTION_SITES).length);
            let closestFlag = _.head(_.sortBy(validFlags, (f)=>creep.pos.getRangeTo(f)));

            // creep.log('found flag', closestFlag.pos);
            if (closestFlag && closestFlag.pos.getRangeTo(creep) <= this.range) {
                targetStructure =
                    _.head(closestFlag.pos.lookFor(LOOK_STRUCTURES))
                    || _.head(closestFlag.pos.lookFor(LOOK_CONSTRUCTION_SITES));
                if (targetStructure) {
                    creep.memory.targetStructure = targetStructure.id;
                } else {
                    closestFlag.remove();
                }
            }
            // creep.log('targetStructure', targetStructure);
            if (!targetStructure) {
                let structures = creep.room.find(FIND_STRUCTURES, (s) => {
                    return [STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_ROAD].indexOf(s.structureType) < 0 && (!s.owner || s.owner.username !== creep.owner.username );
                });
                targetStructure = creep.pos.findClosestByPath(structures);
                if (!targetStructure) {
                    creep.memory['targetStructure'] = targetStructure.id;
                }
            }
        }
        creep.log('found', targetStructure);
        if (targetStructure) {
            if (targetStructure.progress) {
                creep.moveTo(targetStructure);
            } else {
                let attack = creep.attack(targetStructure);
                if (attack == ERR_NOT_IN_RANGE) {
                    let moveTo = creep.moveTo(targetStructure);
                    // creep.log('moving to attack', targetStructure, moveTo);
                } else if (attack !== OK) {
                    creep.log('attack?', attack);
                    targetStructure = undefined;
                }
            }

        }
        return targetStructure ? this : null;
    }
}
require('./profiler').registerClass(AttackStructureStrategy, 'AttackStructureStrategy');
module.exports = AttackStructureStrategy;