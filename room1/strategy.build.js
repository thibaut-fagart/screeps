var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class BuildStrategy extends BaseStrategy{
    constructor() {
        super();
        this.BUILD_TARGET = 'buildtarget';
    }

    findTarget(creep) {
        var target = util.objectFromMemory(this.BUILD_TARGET);
        if (!target) {
            // console.log("finding target for  ", creep.name);
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES).sort((c)=> -(c.progress / c.progressTotal));
            if (targets.length) {
                target = targets[0];

                creep.memory[this.BUILD_TARGET] = target.id;
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
                creep.log('target null');
                delete creep.memory[this.BUILD_TARGET];
            } else {
                let build = creep.build(target);
                if (build == ERR_NOT_IN_RANGE) {
                    let moveTo = creep.moveTo(target);
                    if (moveTo !== OK && moveTo !== ERR_TIRED) {
                        creep.log('moveTo?', build);
                    }
                } else if (build === ERR_INVALID_TARGET) {
                    delete creep.memory[this.BUILD_TARGET];
                } else if (build !== OK) {
                    creep.log('build?', build);
                }
                if (target.progress == target.progressTotal) {
                    creep.log('build complete', target.name);
                    delete creep.memory[this.BUILD_TARGET];
                }
            }
        }
        return target;
    }
}

module.exports = BuildStrategy;