var _ = require('lodash');
var util = require('./util');
var BuildStrategy = require('./strategy.build');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class CautiousBuidStrategy extends BuildStrategy {
    constructor() {
        super(null);
        this.predicate = ((c)=>c.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length ===0);
    }
    
    findTarget(creep) {
        var target = util.objectFromMemory(this.BUILD_TARGET, undefined,this.predicate(creep));
        if (!target) {
            // console.log("finding target for  ", creep.name);
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES, {filter:this.predicate}).sort((c)=> -(c.pos.getRangeTo(creep)));
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
