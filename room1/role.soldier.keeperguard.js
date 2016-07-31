var _ = require('lodash');
var util = require('./util');
var DisableTargetStrategy = require('./strategy.disable_target');
var RegroupStrategy = require('./strategy.regroup');
var RemoteHealKeeperGuardStrategy = require('./strategy.remote_heal_keeperguard');
var SquadAttackStrategy = require('./strategy.squadattack');
var MoveToSpawningKeeperLair  = require('./task.move.keeperlair');
var MoveToActiveKeeperLair  = require('./task.move.activekeeper');
var RoleRemoteRoomGuard  = require('./role.soldier.roomguard');
var RemoteAttackStrategy = require('./strategy.remote_target');
var SwitchFocusStrategy = require('./strategy.switch_focus');
var StopStrategy = require('./strategy.stop');

class RoleKeeperGuard extends RoleRemoteRoomGuard {
    constructor() {
        super();
        this.attackStrategies = [new RegroupStrategy(COLOR_WHITE), new SwitchFocusStrategy(), new RemoteHealKeeperGuardStrategy(5),
            new SquadAttackStrategy(),new /*DisableTargetStrategy*/RemoteAttackStrategy(5)
            /*new DisableTargetStrategy(5)*/ /*new RemoteHealKeeperGuardStrategy()*//*,new MoveToActiveKeeperLair()*/, new MoveToSpawningKeeperLair(),];
// todo if only 1 free square near a source is free and is occupied by keeper, kill it
    }
    run(creep) {
        
        return super.run(creep);
    }
}



module.exports = RoleKeeperGuard;