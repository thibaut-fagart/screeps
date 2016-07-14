var _ = require('lodash');
var HealStrategy = require('./strategy.remote_heal');
var RoleRemoteCarry = require('./role.remote.carry');

class RoleRemoteCarryKeeper extends RoleRemoteCarry {

    constructor() {
        super();
        this.loadStrategies.unshift(new AvoidRespawnStrategy());
        this.healStrategy = new HealStrategy(2);
    }

    run(creep) {
        if (creep.hits < creep.hitsMax) {
            this.healStrategy.accepts(creep);
        } else super.run(creep);
    }
}

module.exports = RoleRemoteCarry;
