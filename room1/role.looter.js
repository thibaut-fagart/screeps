var _ = require('lodash');
var util = require('./util');
var RoleRemoteCarry = require('./role.remote.carry');

class RoleLooter extends RoleRemoteCarry {

    constructor() {
        super();
    }

}

require('./profiler').registerClass(RoleLooter, 'RoleLooter'); module.exports = RoleLooter;
