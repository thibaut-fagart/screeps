var _ = require('lodash');
var BaseStrategy = require('./strategy.base');
var util = require('./util');

class CloseAttackStrategy extends BaseStrategy {
    constructor(range,predicate) {
        super();
        this.range = range;
        this.predicate = predicate || (function(creep){return (target)=>true;})
        this.path = 'attacking';
    }

    clearMemory(creep) {
        delete creep.memory[this.path];
    }
    
    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        if (creep instanceof StructureTower || (creep.body && creep.getActiveBodyparts(ATTACK) == 0)) {
            return null;
        }
        // find strangers
        // order by type (heal > *)  and distance
        let target = this.getRemoteTarget(creep);
        let hostiles = (this.range) ? creep.pos.findInRange(FIND_HOSTILE_CREEPS, this.range) : creep.room.find(FIND_HOSTILE_CREEPS);
        hostiles = hostiles.filter(this.predicate(creep));
        // if(creep instanceof Creep) creep.log('hostiles', hostiles.length);
        if (hostiles.length) {
            // choose target
            let attackerPriorities = [HEAL, RANGED_ATTACK, ATTACK];
            for (var part in attackerPriorities) {
                target = creep.pos.findClosestByRange(hostiles, {filter: (c)=>c.getActiveBodyparts(part) != 0});
                if (target) {
                    creep.log('foundtarget with ', part);
                    break;
                }
            }
            // if(creep instanceof Creep) creep.log('closeAttack target',target);
            target = target || creep.pos.findClosestByRange(hostiles);
            this.setRemoteTarget(creep, target);
            let attack = creep.attack(target);
            if (attack == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            } else if (attack !== OK) {
                // creep.log('attack?', attack);
            }
            let moveTo = creep.moveTo(target.pos);
            // creep.log(this.constructor.name,this.range, 'attacking', JSON.stringify(target.pos),moveTo);
        }
        return target;
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
        return util.objectFromMemory(this.myMem(creep), this.path);
    }

    /** @param {Creep||StructureTower} creep**/
    myMem(creep) {
        return (creep.memory instanceof Function) ? creep.memory() : creep.memory;
    }
}

module.exports = CloseAttackStrategy;