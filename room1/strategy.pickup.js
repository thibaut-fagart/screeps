var util = require('./util');
var BaseStrategy = require('./strategy.base'); 
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class PickupStrategy extends BaseStrategy {
    constructor(resource) {
        super();
        if (!resource) resource = RESOURCE_ENERGY;
        this.resource = resource;
        this.PATH = 'pickupSource';
        this.plannedPickups = null; // {dropid: {creepid : amount }}
    }
    /**
     *
     * @param {Object}state
     * @return {true|false}
     */
    acceptsState(state) {
        return super.acceptsState(state)
            && state.resource == this.resource;
    }
    saveState() {
        let s = super.saveState();
        s.resource = this.resource;
        return s;
    }
    
    clearMemory(creep) {
        delete creep.memory[this.PATH];
    }
    /**
     * @param {Creep} creep
     */
    myMem(creep) {
        if (!this.plannedPickups) {
            this.plannedPickups = creep.room.memory[this.constructor.name] || {};
            // console.log('loaded plannedPickups', JSON.stringify(this.plannedPickups));

            
            let dropids = _.keys(this.plannedPickups);
            // let beforeCount = _.size(dropids);
            _.filter(dropids,(id)=> !Game.getObjectById(id)).forEach((id)=>{delete this.plannedPickups[id]});
            // let afterCount = _.size(_.keys(this.plannedPickups));
            // creep.log('validating reserves','before', beforeCount, afterCount);
            creep.room.memory[this.constructor.name] = this.plannedPickups;

        }
        return this.plannedPickups;
    }

    /**
     * @param {Creep} creep
     */
    saveMem(creep) {
        // console.log('saving plannedPickups', JSON.stringify(this.plannedPickups));
        creep.room.memory[this.constructor.name] = this.plannedPickups;
        // console.log('saving plannedPickups', JSON.stringify(creep.room.memory[this.constructor.name]));
    }
    /**
     * @param {Creep} creep
     * @param {Resource} drop
     * **/
    nonReservedAmount(creep, drop) {
        let a;
        if (a = this.plannedPickups[drop.id]) {
            let filtered= _.filter(_.pairs(a), (pair)=>pair.creepid != creep.id);
            // creep.log('nonReserved filtered', JSON.stringify(filtered));
            let reservedAmount = _.sum(filtered,(pair)=>pair[1]);
/*
            if (filtered [0]) {
                creep.log('a pair', JSON.stringify(filtered[0]));
            }
*/
            // creep.log('already reserved amount', reservedAmount);
            return drop.amount - reservedAmount;
        }
        return drop.amount;
    }
    
    /**
     * @param {Creep} creep
     * @param {Resource} drop
     * **/
    reserve(creep, drop) {
        let a;
        if (!(a = this.plannedPickups[drop.id])) {
            a = this.plannedPickups[drop.id] = {};
        }
        // creep.log('planned before', JSON.stringify(this.plannedPickups));
        a[creep.id] = Math.max(creep.carryCapacity - _.sum(creep.carry), drop.amount);
        // creep.log('reserving',drop.id, a[creep.id]);
        // creep.log('planned after', JSON.stringify(this.plannedPickups));
        return drop;

    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        let source = util.objectFromMemory(creep.memory, this.PATH, (r)=>(r.resourceType ==  this.resource) && r.amount > 0);
        if (!source) {
            let drops = creep.room.find(FIND_DROPPED_ENERGY);
            let sortedDrops = _.sortBy(drops, (d) => d.amount - creep.pos.getRangeTo(d));
            // creep.log('sortedDrops', sortedDrops.length);
            this.myMem(creep);
            while(sortedDrops.length && !source) {
                let drop = sortedDrops.shift();
                let myAmount = this.nonReservedAmount(creep, drop);
                // creep.log('nonreserved', drop.id, myAmount);
                if (myAmount>0)  {
                    source  = this.reserve(creep, drop);
                }
            }

            // source = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
            if (source) {
                // creep.log('pickup', source.id, source.resourceType);
                creep.memory[this.PATH] = source.id;
            }
        }
        if (source) {
            // try transfering/moving
            let oldEnergy = creep.carry.energy;

            let ret = creep.pickup(source);
            if (ret == ERR_NOT_IN_RANGE) {
                ret = creep.moveTo(source);
                if (ret == ERR_NO_PATH) {
                    creep.log("no path to source");
                    delete creep.memory[this.PATH];
                    source = null;
                }
            } else if (ret == OK){
                // creep.log('successfully picked up', source.id, oldEnergy, creep.carry.energy);

            }
            if (source) {
                this.saveMem(creep)
            }
        }
        // creep.log("pickup ? ", true && source);
        return (source?this:null);
        


    }
}

module.exports = PickupStrategy;