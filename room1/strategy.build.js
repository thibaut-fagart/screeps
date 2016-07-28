var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class BuildStrategy extends BaseStrategy {
    constructor(predicate) {
        super();
        this.predicate = (predicate) || ((creep)=>((cs)=>true));
        this.BUILD_TARGET = 'buildtarget';
    }

    findTarget(creep) {
        var target = util.objectFromMemory(this.BUILD_TARGET, this.predicate(creep));
        if (!target) {
            // console.log("finding target for  ", creep.name);
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES, {filter: this.predicate(creep)}).sort((c)=> -(c.progress / c.progressTotal));
            if (targets.length) {
                if (targets[0].progress > 0) {
                    target = targets[0];
                } else if (creep.carryCapacity === _.sum(creep.carry)) {
                    target = creep.pos.findClosestByPath(targets);
                } else {
                    creep.memory.building = false;
                    return null;
                }
                if (target) creep.memory[this.BUILD_TARGET] = target.id;
            }
        }
        return target;
    }

    /** @param {Creep} creep **/
    accepts(creep) {

        var target;
        if (creep.memory.building && creep.carry.energy) {
            target = this.findTarget(creep);
            // creep.log('building',target);
            if (!target) {
                // creep.log('target null');
                delete creep.memory[this.BUILD_TARGET];
            } else {
                let build = creep.build(target);
                if (build == ERR_NOT_IN_RANGE) {
                    util.moveTo(creep, target.pos,this.constructor.name+ 'Path');
/*
                    let moveTo = creep.moveTo(target);
                    if (moveTo !== OK && moveTo !== ERR_TIRED) {
                        creep.log('moveTo?', build);
                    }
*/
                } else if (build === ERR_INVALID_TARGET) {
                    delete creep.memory[this.BUILD_TARGET];
                } else if (build !== OK) {
                    creep.log('build?', build);
                }
                if (target.progress == target.progressTotal) {
                    // creep.log('build complete', target.name);
                    delete creep.memory[this.BUILD_TARGET];
                }
            }
        }
        return target;
    }
}

module.exports = BuildStrategy;