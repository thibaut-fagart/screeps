var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base'); 
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestEnergySourceStrategy extends BaseStrategy {
    constructor() {
        super();
        this.PATH = 'source2';
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
                    this.findSource(creep);
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

    findSource(creep) {
        let source;
        let sources = creep.room.find(FIND_SOURCES).sort((s)=>-s.energy);
        if (sources.length) {
            let max = sources[0].energy;
            sources = creep.pos.findClosestByRange(_.filter(sources, (s)=> s.energy == max));
            if (sources && sources[0] && (sources[0].energy > creep.carryCapacity - _.sum(creep.carry))) {
                source = sources[0];
                // } else {
                //     source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            }
        }
        return source;
    }
}

module.exports = HarvestEnergySourceStrategy;