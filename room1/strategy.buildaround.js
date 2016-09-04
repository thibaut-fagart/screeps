var _ = require('lodash');
var util = require('./util');
var BuildStrategy = require('./strategy.build');


class BuildAroundStrategy extends BuildStrategy {
    constructor(range, predicate) {
        super(predicate);
        this.range = _.isNumber(range) ? range : 2;
    }

    findTarget(creep) {
        // creep.log('predicate',this.predicate(creep)((Game.getObjectById(creep.memory[this.BUILD_TARGET]))));
        let target = util.objectFromMemory(creep.memory, this.BUILD_TARGET, this.predicate(creep));
        if (!target || target.pos.getRangeTo(creep.pos) > this.range) {
            // console.log('finding target for  ', creep.name);
            let targets = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, this.range, {filter: this.predicate(creep)});
            if (targets.length) {
                target = _.max(targets, cs=>cs.progress);
                if (target) {
                    creep.memory[this.BUILD_TARGET] = target.id;
                }
            }
        }
        // if (target) creep.log('buildTarget', target,target.pos);
        return target;
    }

    /**
     * we won't move
     * @param {Creep| {pos}} creep
     * @param {ConstructionSite} target
     * @returns {RoomPosition}
     */
    findBuildPos(creep, target) {
        return creep.pos;
    }

    requestConstructionSite(creep) {
        creep.log('requesting contrucution site ');
        return super.requestConstructionSite(creep);
    }
}

module.exports = BuildAroundStrategy;