var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class DismantleStrategy extends BaseStrategy {
    constructor(predicate) {
        super();
        this.predicate = (predicate) || (creep=> ((s)=>true));
        this.DISMANTLE_TARGET = 'dismantletarget';
    }

    findTarget(creep) {
        // creep.log('predicate',this.predicate(creep)((Game.getObjectById(creep.memory[this.DISMANTLE_TARGET]))));
        let target = util.objectFromMemory(creep.memory, this.DISMANTLE_TARGET, this.predicate(creep));
        // creep.log(this.constructor.name, 'findTarget', target, !target);
        if (!target) {
            // console.log("finding target for  ", creep.name);
            let flaggedStructures = creep.room.find(FIND_FLAGS, {
                filter: {
                    color: COLOR_RED,
                    secondaryColor: COLOR_RED
                }
            }).map(f=>f.pos.lookFor(LOOK_STRUCTURES).concat(f.pos.lookFor(LOOK_CONSTRUCTION_SITES))).filter(s=>s.length > 0).map(l=>l[0]);
            let targets;
            if (flaggedStructures.length > 0) {
                targets = flaggedStructures;
            } else {
                targets = creep.room.find(FIND_HOSTILE_STRUCTURES).filter(s=>(!s.storeCapacity || _.sum(s.store)===0) && (!s.mineralCapacity || s.mineralAmount ===0) && (this.predicate(creep))(s));
            }
            if (!targets.length) {
                targets = creep.room.dismantleTargets();
            }
            if (targets.length) {
                target = creep.pos.findClosestByRange(targets);
                if (target) {
                    creep.memory[this.DISMANTLE_TARGET] = target.id;
                }
            }
        }
        return target;
    }

    /** @param {Creep} creep **/
    accepts(creep) {
        // creep.log(this.constructor.name);
        // creep.log('BEFORE', creep.memory[this.DISMANTLE_TARGET]);
        var target = this.findTarget(creep);
        // creep.log('building',target);
        if (!target) {
            // creep.log('target null');
            delete creep.memory[this.DISMANTLE_TARGET];
        } else {
            // creep.log('dismantling', target.structureType, target.hits);
            let dismantle = creep.dismantle(target);
            if (dismantle == ERR_NOT_IN_RANGE) {
                util.moveTo(creep, target.pos);
                // util.moveTo(creep, target.pos, this.constructor.name + 'Path', {range: 1, avoidCreeps:true});
                /*
                 let moveTo = creep.moveTo(target);
                 if (moveTo !== OK && moveTo !== ERR_TIRED) {
                 creep.log('moveTo?', build);
                 }
                 */
            } else if (dismantle === ERR_INVALID_TARGET) {
                creep.log('ERR_INVALID_TARGET ');
                delete creep.memory[this.DISMANTLE_TARGET];
            } else if (dismantle !== OK) {
                creep.log('dismantle?', dismantle);
            }
        }
        // creep.log('AFTER ', creep.memory[this.DISMANTLE_TARGET]);
        return target;
    }
}

require('./profiler').registerClass(DismantleStrategy, 'DismantleStrategy'); module.exports = DismantleStrategy;