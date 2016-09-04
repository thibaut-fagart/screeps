var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class ReserveControllerStrategy extends BaseStrategy {
    constructor(color, secondaryColor) {
        super();
        this.PATH = 'target';
        this.flagColor = color;
        this.secondaryColor= secondaryColor || this.flagColor;
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
            target = creep.room.controller;
            if (!target) {
                creep.log('no controller????');
                return false;
            }
            creep.memory[this.PATH] = target.id;
            // creep.log('controller', target);
            if (target) {
                let reserveFrom = this.findSpot(creep, target);
                if (reserveFrom && !(reserveFrom.x === creep.pos.x && reserveFrom.y === creep.pos.y)) {
                    let moveTo = util.moveTo(creep, reserveFrom,this.constructor.name + 'Path', {range:0});
                    if (moveTo!==OK && moveTo !== ERR_TIRED) creep.log('moved?',moveTo);
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
            let flags = target.room.glanceForAround(LOOK_FLAGS, target.pos,1, true).map((look)=>look.flag).filter(f=>f.color === this.flagColor && f.secondaryColor === this.secondaryColor);
            if (flags && flags.length) {
                pos = flags[0].pos;
            } else return false;
            creep.memory.reserveFrom = pos;
        }
        return new RoomPosition(pos.x, pos.y, pos.roomName);

    }
}

module.exports = ReserveControllerStrategy;