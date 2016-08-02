var _ = require('lodash');
var BaseStrategy = require('./strategy.base');
var RemoteTargetStrategy = require('./strategy.remote_target');
var util = require('./util');

class RemoteTargetNonKeeperStrategy extends RemoteTargetStrategy {
    constructor(range, predicate) {
        super(range, predicate);
    }


    findTargets(creep) {
        return super.findTargets(creep).filter((c)=>c.owner.username !=='Source Keeper');
    }
}

module.exports = RemoteTargetNonKeeperStrategy;