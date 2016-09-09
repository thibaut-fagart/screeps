var Base = require('./strategy.base');
var util = require('./util');

class AttackStructureStrategy extends Base {
    constructor() {
        super();
    }

    accepts(creep) {
        let targetStructure;
        creep.log('searching structures');
        if (!(targetStructure = util.objectFromMemory(creep.memory, 'targetStructure'))) {
            /** {Flag}**/
            let closestFlag= creep.pos.findClosestByPath(creep.room.find(FIND_FLAGS, (f)=> f.color === COLOR_RED));

            if (closestFlag) {
                let lookFor = closestFlag.pos.lookFor(LOOK_STRUCTURES);
                if (lookFor || lookFor.length) {
                    targetStructure = lookFor.length ? lookFor[0] : lookFor;
                }
                if (targetStructure) {
                    creep.memory.targetStructure = targetStructure.id
                } else {
                    closestFlag.remove();
                }
            }
            creep.log('targetStructure', targetStructure);
            if (!targetStructure) {
                let structures = creep.room.find(FIND_STRUCTURES, (s) => {
                    return [STRUCTURE_CONTAINER, /*STRUCTURE_WALL, */STRUCTURE_RAMPART].indexOf(s.structureType) >= 0 && (!structure.owner || structure.owner.username !== creep.owner.username );
                });
                targetStructure = creep.pos.findClosestByPath(structures);
                if (!targetStructure) {
                    creep.memory['targetStructure'] = targetStructure.id;
                }
            }
        }
        // creep.log('found',targetStructure);
        if (targetStructure) {
            let attack = creep.attack(targetStructure);
            if (attack == ERR_NOT_IN_RANGE) {
                let moveTo = creep.moveTo(targetStructure);
                creep.log('moving to attack', targetStructure, moveTo);
            } else if (attack !== OK) {
                creep.log('attack?', attack);
            }
        }
        return targetStructure? this:null;
    }
}
require('./profiler').registerClass(AttackStructureStrategy, 'AttackStructureStrategy'); module.exports = AttackStructureStrategy;