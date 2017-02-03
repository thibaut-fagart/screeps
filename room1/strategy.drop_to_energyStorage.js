var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class DropToEnergyStorageStrategy extends BaseStrategy {
    constructor(structureType, predicate) {
        super();
        if (!structureType) structureType = STRUCTURE_EXTENSION;
        this.resource = RESOURCE_ENERGY;
        this.structureType = structureType;
        this.predicate = predicate || (()=>(()=>true));
        this.PATH = 'energyStoreTarget';
    }

    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }

    setTarget(creep, s) {
        if (s) {
            creep.memory[this.PATH] = s.id;
            return s;
        } else {
            delete creep.memory[this.PATH];
        }
    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        if (creep.carry.energy === 0|| creep.room.energyAvailable === creep.room.energyCapacityAvailable ) return null;
        let target = util.objectFromMemory(creep.memory, this.PATH, (c)=> (c.energy < c.energyCapacity && (this.predicate(creep))(c)));
        // creep.log(this.structureType, 'target', target);
        if (!target || target.room.name !== creep.room.name) {
            // if (this.structureType === STRUCTURE_EXTENSION) creep.log('finding target');
            target = this.acquireTarget(creep);
        }
        if (target) {
            // try transfering/moving
            let ret = creep.transfer(target, this.resource);
            // creep.log('transfer', target.pos, ret);
            if (ret == ERR_NOT_IN_RANGE && creep.fatigue == 0) {
                // creep.log('moving', JSON.stringify(target.pos));
                this.moveToTarget(creep, target);
            } else if (ret === OK && creep.fatigue === 0 && creep.carry.energy > target.energyCapacity - target.energy) {
                target = this.acquireTarget(creep, target);
                // creep.log('delivered ,next target ?', target ? target.pos : undefined);
                if (target && target.pos.getRangeTo(creep) > 1) {
                    // creep.log(`range ${target.pos.getRangeTo(creep)} moving`);
                    this.moveToTarget(creep, target);
                }
            } else {
                this.setTarget(creep, undefined);
            }

            // } else {
            //     creep.log('no target');
        }
        // creep.log('source', null == source);
        return (target ? this : null);
    }

    moveToTarget(creep, target) {
        // creep.log('moving to ', target.pos);
        let ret = util.moveTo(creep, target.pos, undefined, {ignoreHostiles: true, range: 1});
        if (ret == ERR_NO_PATH) {
            creep.log('no path to target');
            delete creep.memory[this.PATH];
            target = null;
        }
        return ret;
    }

    acquireTarget(creep,exclude) {
        var targets = (this.structureType ? (creep.room.structures[this.structureType]||[]) : creep.room.find(FIND_STRUCTURES))
            .filter((s)=> s.my && (s.energy < s.energyCapacity) && (exclude ? s.id !== exclude.id:true)  && (this.predicate(creep))(s));
        if (targets.length > 0) {
            return this.setTarget(creep, creep.pos.findClosestByPath(targets));
        }
        return false;
    }
}

require('./profiler').registerClass(DropToEnergyStorageStrategy, 'DropToEnergyStorageStrategy');
module.exports = DropToEnergyStorageStrategy;