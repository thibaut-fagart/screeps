var util = require('./util');
var BaseStrategy = require('./strategy.base'); 
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class ClaimControllerStrategy extends BaseStrategy {
    constructor() {
        super();
        this.PATH = 'target';
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    /** @param {Creep} creep
     * @return {Source|| null}**/
    accepts(creep) {
        // creep.log('ClaimControllerStrategy');
        let target;
        if (creep.getActiveBodyparts(CLAIM)>0) {

            // creep.log('body ok');
            if (creep.carryCapacity > 0 && creep.carry.energy == creep.carryCapacity) {
                // creep.log('full');
                delete creep.memory[this.PATH];
            } else {
                target = util.objectFromMemory(creep.memory, this.PATH, (/**@param {StructureController}s*/s)=> (!s.owner && (!s.reservation || s.reservation.username==creep.owner.username)));
                if (!target) {
                    target = creep.room.controller;
                    creep.memory[this.PATH] = target.id;
                }
                // creep.log('target', target);
                if (target) {
                    let claim = creep.claimController(target);
                    // creep.log('transfer', claim);
                    if (claim == ERR_NOT_IN_RANGE) {
                        let moveTo = creep.moveTo(target);
                        // creep.log('move', moveTo);
                    } else if (claim !== OK){
                        // creep.log('claim?', claim, target.upgradeBlocked, JSON.stringify(target.reservation), JSON.stringify(target));
                        delete creep.memory[this.PATH] ;
                        return null;
                    }
                }
            }
        }
        return (target?this:null);
    }
}

module.exports = ClaimControllerStrategy;