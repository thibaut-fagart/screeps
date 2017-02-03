var _ = require('lodash');
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
        //creep.log('ClaimControllerStrategy');
        let target;
        if (creep.getActiveBodyparts(CLAIM) > 0) {
            target = util.objectFromMemory(creep.memory, this.PATH, (/**@param {StructureController}s*/s)=> (!s.owner && (!s.reservation || s.reservation.username == creep.owner.username)));
            if (!target) {
                target = creep.room.controller;
                creep.memory[this.PATH] = target.id;
            }

            //creep.log('target', target);
            if (target) {
                let claim = creep.claimController(target);
                if (claim == ERR_NOT_IN_RANGE) {
                    if (creep.fatigue == 0) {
                        let moveTo = util.moveTo(creep, target.pos);
                        if (moveTo !== OK) {
                            creep.log('move?', moveTo);
                        }
                    }
                } else if (claim !== OK) {
                    creep.log('claim?', claim, target.upgradeBlocked, JSON.stringify(target.reservation), JSON.stringify(target));
                    delete creep.memory[this.PATH];
                    return null;
                }
            }
        }
        return (target ? this : null);
    }
}

require('./profiler').registerClass(ClaimControllerStrategy, 'ClaimControllerStrategy'); module.exports = ClaimControllerStrategy;