var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class ReserveControllerStrategy extends BaseStrategy {
    constructor(color) {
        super();
        this.PATH = 'target';
        this.flagColor = color;
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
            if (creep.carryCapacity > 0 && creep.carry.energy == creep.carryCapacity) {
                // creep.log('full');
                delete creep.memory[this.PATH];
            } else {
                target = util.objectFromMemory(creep.memory, this.PATH, (/**@param {StructureController}s*/s)=> (!s.owner && (!s.reservation || s.reservation.username == creep.owner.username)));
                if (!target) {
                    target = creep.room.controller;
                    if (!target) {
                        creep.log('no controller????');
                        return false;
                    } else {
                        creep.memory[this.PATH] = target.id;
                    }
                }
                // creep.log('target', target);
                if (target) {
                    let reserveFrom = this.findSpot(creep, target)
                    if (reserveFrom && !(reserveFrom.x === creep.pos.x && reserveFrom.y === creep.pos.y)) {
                        creep.moveTo(reserveFrom);
                    } else {
                        let claim;
                        claim = creep.reserveController(target);
                        // creep.log('transfer', claim);
                        if (claim == ERR_NOT_IN_RANGE) {
                            let moveTo = util.moveTo(creep, target.pos, this.constructor.name + 'Path');
                            // creep.log('move', moveTo);
                        } else if (claim !== OK) {
                            // creep.log('claim?', claim, target.upgradeBlocked, JSON.stringify(target.reservation), JSON.stringify(target));
                            delete creep.memory[this.PATH];
                            return null;
                        }

                    }
                }
            }
        }
        return (target ? this : null);
    }

    /**
     *
     * @param {Creep} creep
     * @param {StructureController} target
     * @returns {boolean|RoomPosition}
     */
    findSpot(creep, target) {
        let pos = creep.memory.reserveFrom;
        if (!pos) {
            let flags = target.room.lookForAtArea(LOOK_FLAGS, target.pos.y - 1, target.pos.x - 1, target.pos.y + 1, target.pos.x + 1, true).map((look)=>look.flag);
            if (flags && flags.length) {
                pos = flags[0].pos;
            } else return false;
            creep.memory.reserveFrom = pos;
        }
        return new RoomPosition(pos.x, pos.y, pos.roomName);

    }
}

module.exports = ReserveControllerStrategy;