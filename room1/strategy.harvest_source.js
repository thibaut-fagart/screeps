var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base'); 
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestEnergySourceStrategy extends BaseStrategy {
    constructor() {
        super();
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
                    source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                }
                // creep.log('source2', source);
                if (source) {
                    creep.memory[this.PATH] = source.id;
                    let harvest = creep.harvest(source);
                    // creep.log('transfer', harvest);
                    if (harvest == ERR_NOT_IN_RANGE) {
                        let moveTo = creep.moveTo(source);
                        if (source.room.controller.reservation && source.room.controller.reservation.username != creep.owner.username) {
                            // release strategy for pickup opportunity
                            return null;
                        }
                        // creep.log('move', moveTo);
                    } else if (harvest !== OK){
                        return null;
                    }
                }
            }
        }
        return (source?this:null);
    }
}

module.exports = HarvestEnergySourceStrategy;