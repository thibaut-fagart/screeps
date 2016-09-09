var _ = require('lodash');
var util = require('./util');
var DisableTargetStrategy = require('./strategy.disable_target');
var RegroupStrategy = require('./strategy.regroup');
var RemoteHealKeeperGuardStrategy = require('./strategy.remote_heal_keeperguard');
var SquadAttackStrategy = require('./strategy.squadattack');
var MoveToSpawningKeeperLair = require('./task.move.keeperlair');
var MoveToActiveKeeperLair = require('./task.move.activekeeper');
var RoleRemoteRoomGuard = require('./role.soldier.roomguard');
var RemoteAttackStrategy = require('./strategy.remote_target');
var SwitchFocusStrategy = require('./strategy.switch_focus');
var StopStrategy = require('./strategy.stop');
var CloseAttackStrategy = require('./strategy.closeattack_target');

class RoleKeeperGuard extends RoleRemoteRoomGuard {
    constructor() {
        super();
        this.attackStrategies = [new RegroupStrategy(COLOR_WHITE), /*new SwitchFocusStrategy(),*/ new RemoteHealKeeperGuardStrategy(10),
            new CloseAttackStrategy(undefined, (creep)=> {
                // creep.log('return predicate');
                if (creep.room.memory.sources) {
                    let sources = creep.room.memory.sources;
                    return ((target)=> {
                        // creep.log('testing', target.pos);
                        return target.pos.findInRange(FIND_SOURCES, 4).find((s)=>sources.indexOf(s.id) >= 0)
                            || target.pos.findInRange(FIND_MINERALS, 4).find((s)=>sources.indexOf(s.id) >= 0);
                    });
                } else {
                    return (target)=>(true);
                }
            }),
             new SquadAttackStrategy(3, creep=>{
                 if (Memory.rooms[creep.memory.remoteRoom] && Memory.rooms[creep.memory.remoteRoom].sources ) {
                     return (target)=> Memory.rooms[creep.memory.remoteRoom].sources.map(id=>Game.getObjectById(id)).find(s=>s.pos.getRangeTo(target) < 5);
                 } else return ()=>true;

             }),
            new RemoteAttackStrategy(4),
             /*new DisableTargetStrategy(5)*/ /*new RemoteHealKeeperGuardStrategy()*//*,new MoveToActiveKeeperLair()*/
            new MoveToSpawningKeeperLair((creep)=> {
                if (creep.room.memory.sources) {
                    let sources = creep.room.memory.sources;
                    return creep.room.memory.sources?((target)=> {
                        return target.pos.findInRange(FIND_SOURCES, 6).filter((s)=>sources.indexOf(s.id) >= 0).length > 0
                            || target.pos.findInRange(FIND_MINERALS, 6).filter((s)=>sources.indexOf(s.id) >= 0).length > 0;
                    }):()=>true;
                } else {
                    return (target)=>(true);
                }
            })];
// todo if only 1 free square near a source is free and is occupied by keeper, kill it
        util.indexStrategies(this.attackStrategies);
    }

    run(creep) {

        return super.run(creep);
    }

    /**
     *
     * @param creep
     * @returns {boolean} true if looking for boost, false if it's all good
     */
    seekBoosts(creep) {
        // creep.log('seekBoosts');

        let boostingPart = _.keys(RoleRemoteRoomGuard.WANTED_BOOSTS).find((partType) => {
            let parts = _.filter(creep.body, (p)=>p.type === partType && !p.boost);
            if (parts.length && this.boostPartType(creep, parts)) {
                return true;
            } else {
                return false;
            }
        });
        return boostingPart;


    }

    onNoHostiles(creep) {
        // keeper guards don't move
    }
}


require('./profiler').registerClass(RoleKeeperGuard, 'RoleKeeperGuard'); module.exports = RoleKeeperGuard;