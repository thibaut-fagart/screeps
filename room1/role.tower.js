var _ = require('lodash');
let RemoteTargetStrategy = require('./strategy.remote_target');
let RemoteHealStrategy = require('./strategy.remote_heal');
// let RemoteRepairStrategy = require('./strategy.remote_repair');
class RoleTower {
    constructor() {
        this.remoteAttackStrategy = new RemoteTargetStrategy(undefined,(creep)=>{
            return function(target) {
                return target.owner.username === 'Invader' || true|| creep.pos.getRangeTo(target)< 15;
            };
        });
        this.remoteHealStrategy = new RemoteHealStrategy();
        // this.remoteRepairStrategy = new RemoteRepairStrategy();
    }

    /** @param {StructureTower} tower **/
    run(tower) {

        let remoteTarget = this.remoteAttackStrategy.accepts(tower);
        if (remoteTarget) {
            tower.log('tower attacking', JSON.stringify(remoteTarget.owner));
            try {Game.notify([tower.structureType, tower.room.name, tower.id].concat(['tower attacking', JSON.stringify(remoteTarget.owner)]));} catch(e) {
                tower.log('notification failed');
            }
            // tower.attack(remoteTarget);
            let s = `room.${tower.room.name}.attacks`;
            let stat = Memory.stats[s];
            Memory.stats[s] = (stat ? 1 : stat + 1);
        } else {
            let remoteHeal = this.remoteHealStrategy.accepts(tower);
            if (remoteHeal) {
                tower.log('tower healing ');
                // let ret = tower.heal(remoteHeal);
                // if (!ret) console.log("heal ret", ret);
                let s = `room.${tower.room.name}.heals`;
                let stat = Memory.stats[s];
                Memory.stats[s] = (stat ? 1 : stat + 1);

            } else {
                /* todo decide when repairing is worth it : tower repairing is said to have efficiency of 60-1.5 whereas Creeps repair at 100HP/energy
                 let remoteRepair = this.remoteRepairStrategy.accepts(tower);
                 if (remoteRepair) {
                 */
                // console.log("tower repairing ", remoteRepair.name);
                // tower.heal(remoteHeal);
                // let s = "room." + tower.room.name + ".heals";
                // let stat = Memory.stats[s];
                // Memory.stats[s] = (stat ? 1 : stat + 1);
                // }

            }
        }
    }

}

module.exports = RoleTower;