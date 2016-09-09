var _ = require('lodash');
let RemoteTargetStrategy = require('./strategy.remote_target');
let RemoteHealStrategy = require('./strategy.remote_heal');
// let RemoteRepairStrategy = require('./strategy.remote_repair');
class RoleTower {
    constructor() {
        this.remoteAttackStrategy = new RemoteTargetStrategy(undefined,(tower)=>{
            return function(target) {
                let ignoredStructures = [STRUCTURE_ROAD, STRUCTURE_EXTRACTOR];
                let endangeredStructures = tower.room.glanceForAround(LOOK_STRUCTURES, target.pos, 3, true).map(p=>p.structure).filter((s)=>ignoredStructures.indexOf(s.structureType)<0 );
                let endangeredCreeps = tower.room.glanceForAround(LOOK_CREEPS, target.pos, 5, true).map(p=>p.creep).filter((c)=>c.my );
                tower.log(`target ${JSON.stringify(target.pos)}, ${target.owner.username} endangeredStructures ${endangeredStructures.length}, endangeredCreeps ${endangeredCreeps.length}`);
                Game.notify(`target ${JSON.stringify(target.pos)}, ${target.owner.username} endangeredStructures ${endangeredStructures.length}, endangeredCreeps ${endangeredCreeps.length}`);
                return (target.owner.username === 'Invader' && 0<target.getActiveBodyparts(RANGED_ATTACK)+target.getActiveBodyparts(ATTACK) )||  tower.pos.getRangeTo(target)<= 5 || ((endangeredStructures.length+endangeredCreeps.length)>0);
            };
        });
        this.remoteHealStrategy = new RemoteHealStrategy(undefined,(tower)=>(creep=>{
            if (creep.getActiveBodyparts(HEAL)>0 && creep.hits > 1000) return false;
            return true;
        }));
        // this.remoteRepairStrategy = new RemoteRepairStrategy();
    }

    /** @param {StructureTower} tower **/
    run(tower) {

        let remoteTarget = this.remoteAttackStrategy.accepts(tower);
        if (remoteTarget) {
            tower.log('tower attacking', JSON.stringify(remoteTarget.owner));
            try {
                Game.notify([tower.structureType, tower.room.name, tower.id].concat(['tower attacking', JSON.stringify(remoteTarget.owner)]));
            } catch(e) {
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

require('./profiler').registerClass(RoleTower, 'RoleTower'); module.exports = RoleTower;