var _ = require('lodash');
var util = require('./util');
var BuildStrategy = require('./strategy.build');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class CautiousBuidStrategy extends BuildStrategy {
    constructor(resourceType) {
        super(null);
    }
    
    findTarget(creep) {
        var target = util.objectFromMemory(this.BUILD_TARGET);
        if (!target) {
            // console.log("finding target for  ", creep.name);
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES).sort((c)=> -(c.progress / c.progressTotal)).filter((c)=>c.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length ===0);
            if (targets.length) {
                target = targets[0];
                creep.memory[this.BUILD_TARGET] = target.id;
            }
        }
        return target;
    }


    findSources(creep) {
        let safeSources = _.filter(util.findSafeSources(creep.room, true));
        // creep.log('safeSources', safeSources.length);
        return safeSources;
    }
}

module.exports = CautiousBuidStrategy;
