var Base = require('./strategy.base');
var util = require('./util');

class AttackStructureStrategy extends Base {
    constructor() {
        super();
    }

    accepts(creep) {
        let targetStructure;
        // creep.log('searching structures');
        if (!(targetStructure = util.objectFromMemory(creep.memory, 'targetStructure'))) {
            let structures = creep.room.find(FIND_STRUCTURES, (s) => {
                return [STRUCTURE_CONTAINER, /*STRUCTURE_WALL, */STRUCTURE_RAMPART].indexOf(s.structureType) >= 0 && (!structure.owner || structure.owner.username !== creep.owner.username )
            });
            targetStructure = creep.pos.findClosestByPath(structures);
            if (!targetStructure) {
                creep.memory['targetStructure'] = targetStructure.id;
            }
        }
        // creep.log('found',targetStructure);
        if (targetStructure) {
            let moveTo = creep.moveTo(targetStructure);
            let attack = creep.attack(targetStructure);
            if (attack == ERR_NOT_IN_RANGE) {
                creep.moveTo(targetStructure);
            } else if (attack !== OK) {
                creep.log('attack?', attack);
            }
            creep.moveTo(targetStructure);
        }
        return targetStructure? this:null;
    }
}
module.exports = AttackStructureStrategy;