var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class DismantleStrategy extends BaseStrategy {
    constructor(predicate) {
        super();
        this.predicate = (predicate) || (function(creep) {return function (cs) {return true}});
        this.DISMANTLE_TARGET = 'dismantletarget';
    }

    findTarget(creep) {
        // creep.log('predicate',this.predicate(creep)((Game.getObjectById(creep.memory[this.DISMANTLE_TARGET]))));
        var target = util.objectFromMemory(creep.memory, this.DISMANTLE_TARGET, this.predicate(creep));
        // creep.log('buildTarget', target);
        if (!target) {
            // console.log("finding target for  ", creep.name);
            var targets = creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: this.predicate(creep)});
            if (!targets.length) {
                targets = creep.room.dismantleTargets();
            }
            if (targets.length) {
                target = creep.pos.findClosestByPath(targets);
                if (target) creep.memory[this.DISMANTLE_TARGET] = target.id;
            }
        }
        return target;
    }

    /** @param {Creep} creep **/
    accepts(creep) {

        var target;
            target = this.findTarget(creep);
            // creep.log('building',target);
            if (!target) {
                // creep.log('target null');
                delete creep.memory[this.DISMANTLE_TARGET];
            } else {
                creep.log('dismantling', target.structureType);
                let dismantle= creep.dismantle(target);
                if (dismantle == ERR_NOT_IN_RANGE) {
                    util.moveTo(creep, target.pos,this.constructor.name+ 'Path', {range:1});
/*
                    let moveTo = creep.moveTo(target);
                    if (moveTo !== OK && moveTo !== ERR_TIRED) {
                        creep.log('moveTo?', build);
                    }
*/
                } else if (dismantle === ERR_INVALID_TARGET) {
                    delete creep.memory[this.DISMANTLE_TARGET];
                } else if (dismantle !== OK) {
                    creep.log('dismantle?', dismantle);
                }
            }
        return target;
    }
}

module.exports = DismantleStrategy;