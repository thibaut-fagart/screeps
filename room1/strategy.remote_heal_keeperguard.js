var _ = require('lodash');
var RemoteHealStrategy = require('./strategy.remote_heal');

class RemoteHealKeeperGuardStrategy extends RemoteHealStrategy {
    constructor(range) {
        super(range);
    }

    findHealingTargets(creep) {
        return _.filter(super.findHealingTargets(creep), (c)=> ((c.memory.role === creep.memory.role) && c.hits < 0.8 * c.hitsMax) || (c.hits < 0.25* c.hitsMax) );
    }
    accepts (creep) {
        // creep.log('sub');
        super.accepts(creep);
    }
}

module.exports = RemoteHealKeeperGuardStrategy;