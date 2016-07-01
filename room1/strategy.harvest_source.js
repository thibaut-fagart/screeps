var util = require('./util');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestEnergySourceStrategy {
    constructor() {
        this.PATH = 'source';
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    /** @param {Creep} creep
     * @return {Source|| null}**/
    accepts(creep) {
        // creep.log('HarvestEnergySourceStrategy');
        let source;
        if (creep.getActiveBodyparts(WORK)>0) {
            // creep.log('body ok');
            if (creep.carryCapacity > 0 && creep.carry.energy == creep.carryCapacity) {
                // creep.log('full');
                delete creep.memory[this.PATH];
            } else {
                source = util.objectFromMemory(creep.memory, this.PATH, (s)=> creep.carry.energy+s.energy >= creep.carryCapacity);
                // creep.log('source', source);
                if (!source) {
                    source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
                }
                // creep.log('source', source);
                if (source) {
                    creep.memory[this.PATH] = source.id;
                    let transfer = creep.harvest(source);
                    // creep.log('transfer', transfer);
                    if (transfer == ERR_NOT_IN_RANGE) {
                        let moveTo = creep.moveTo(source);
                        // creep.log('move', moveTo);

                    }
                }
            }
        }
        return source;
    }
}

module.exports = HarvestEnergySourceStrategy;