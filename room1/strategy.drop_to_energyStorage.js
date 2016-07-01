var util = require('./util');
var BaseStrategy = require('./strategy.base'); 
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class DropToEnergyStorageStrategy extends BaseStrategy {
    constructor(structureType) {
        super();
        if (!structureType) structureType = STRUCTURE_EXTENSION;
        this.resource = RESOURCE_ENERGY;
        this.structureType = structureType;
        this.PATH = 'energyStoreTarget';
    }
    /**
     *
     * @param {Object}state
     * @return {true|false}
     */
    acceptsState(state) {
        return super.acceptsState(state)
            && state.structureType == this.structureType
            && state.resource == this.resource;
    }
    saveState() {
        let s = super.saveState();
        s.structureType = this.structureType;
        s.resource = this.resource;
        return s;
    }
    
    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }
    setTarget (creep, s) {
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
        let target = util.objectFromMemory(creep.memory, this.PATH, (c)=>_.sum(c.store) < c.storeCapacity);
        if (!target) {

            var targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    ((!(this.structure && structure.energy && structure.energyCapacity) 
                    || (structure.structureType == this.structureType))) && structure.energy < structure.energyCapacity
            });

            if (targets.length >0 ) {
                target = this.setTarget(creep, creep.pos.findClosestByPath(targets));
            }
        }
        if (target) {
            // try transfering/moving
            let ret = creep.transfer(target, this.resource);
            if (ret == ERR_NOT_IN_RANGE) {
                ret = creep.moveTo(target);
                if (ret == ERR_NO_PATH) {
                    creep.log("no path to target");
                    delete creep.memory[this.PATH];
                }
            }
        }
        // creep.log('source', null == source);
        return (target?this:null);
    }
}

module.exports = DropToEnergyStorageStrategy;