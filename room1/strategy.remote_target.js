var _ = require('lodash');
var BaseStrategy = require('./strategy.base');
var util = require('./util');

class RemoteTargetStrategy extends BaseStrategy {
    constructor(range) {
        super();
        this.range = 0 || range;
        this.path = 'attacking_remote';
    }

    clearMemory(creep) {
        delete creep.memory[this.path];
    }
    
    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        if (!creep instanceof StructureTower || (creep.body && (creep.getActiveBodyparts(RANGED_ATTACK) == 0))) {
            // if(creep instanceof Creep)creep.log('not compatible with RemoteAttack');
            return null;
        }
        // find strangers
        // order by type (heal > *)  and distance
        let target;
        let hostiles = this.findTargets(creep);
        // if(creep instanceof Creep) creep.log('hostiles', hostiles.length);
        if (hostiles.length) {
            // choose target
            let attackerPriorities = [HEAL, RANGED_ATTACK, ATTACK];
            for (var part in attackerPriorities) {
                target = creep.pos.findClosestByRange(hostiles, {filter: (c)=>c.getActiveBodyparts(part) != 0});
                if (target) {
                    break;
                }
            }
            // if(creep instanceof Creep) creep.log(target);
            target = target || creep.pos.findClosestByRange(hostiles);
            this.setRemoteTarget(creep, target);
            // creep.attack(remoteTarget);
            if (creep instanceof Creep) {

                // if(creep instanceof Creep) creep.log('attacking',target);
                let rangedAttack = this.performAttack(creep, target);
                // creep.log('rangedAttack?', rangedAttack);
                if (rangedAttack === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                    // if(creep instanceof Creep) creep.log('not in range, moving');
                } else if (false === rangedAttack) {// disabling
                    target = null;
                } else if (rangedAttack !== OK) {
                    if (creep instanceof Creep) creep.log('rangedAttack?', rangedAttack);
                }
            } else {
                creep.attack(target);
            }
        }
        return target;
    }

    findTargets(creep) {
        return creep.room.find(FIND_HOSTILE_CREEPS, {filter: (c)=> (this.range ? creep.pos.getRangeTo(c) <= this.range : true)});
    }

    performAttack(creep, target) {
        return creep.rangedAttack(target);
    }

    /** @param {Creep||StructureTower} creep
     * @param {Creep} hostile
     * **/
    setRemoteTarget(creep, hostile) {
        let mymem = this.myMem(creep);
        mymem[this.path] = hostile.id;

    }

    /** @param {Creep||StructureTower} creep
     * @return {Creep} hostile
     * **/
    getRemoteTarget(creep) {
        return util.objectFromMemory(this.myMem(creep), this.path, (o)=> (this.range ? creep.pos.getRangeTo(o) <= this.range : true));
    }

    /** @param {Creep||StructureTower} creep**/
    myMem(creep) {
        return (creep.memory instanceof Function) ? creep.memory() : creep.memory;
    }
}

module.exports = RemoteTargetStrategy;