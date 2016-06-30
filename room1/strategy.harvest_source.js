var util = require('./util');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestEnergySourceStrategy {
    constructor(resource) {
        this.PATH = 'source';
    }

    /** @param {Creep} creep
     * @return {Source|| null}**/
    accepts(creep) {
        creep.log('HarvestEnergySourceStrategy');
        let source = util.objectFromMemory(creep.memory, this.PATH, (s) => s.energy > 0);
        if (!source) {
            delete creep.memory[this.PATH];
            var sources = creep.room.find(FIND_SOURCES_ACTIVE);
            if (sources.length) {
                source = _.sample(sources);
                creep.memory[this.PATH] = source.id;
            } else {
                creep.log("failed finding source");
            }
        }
        if (source) {
            // try transfering/moving
            let ret = creep.harvest(source);
            // console.log("transfer ? ", ret, ", ", source.store[this.resource]);
            if (ret == ERR_NOT_IN_RANGE) {
                // console.log(creep.name, " moving to source");
                ret = creep.moveTo(source);
                if (ret == ERR_NO_PATH) {
                    creep.log("no path to source");
                    delete creep.memory[this.PATH];
                }
            }
            return source;
        }
        return null;
    }
}

module.exports = HarvestEnergySourceStrategy;