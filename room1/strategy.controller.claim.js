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
        // creep.log('ClaimControllerStrategy');
        let target;
        if (creep.getActiveBodyparts(CLAIM) > 0) {

            // creep.log('body ok');
            target = util.objectFromMemory(creep.memory, this.PATH, (/**@param {StructureController}s*/s)=> (!s.owner && (!s.reservation || s.reservation.username == creep.owner.username)));
            if (!target) {
                target = creep.room.controller;
                creep.memory[this.PATH] = target.id;
            }
            // creep.log('target', target);
            if (target) {
                let path;
                if (!(path = util.objectFromMemory(creep.memory, 'path_to'))) {
                    path = creep.room.findPath(creep.pos, target.pos, {maxOps: 5000});
                    creep.memory['path_to'] = path;
                }

                let claim = creep.claimController(target);

                if (claim == ERR_NOT_IN_RANGE) {
                    if (creep.fatigue == 0) {
                        let moveTo = creep.moveByPath(path);
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

module.exports = ClaimControllerStrategy;