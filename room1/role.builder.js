var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var ClosePickupStrategy = require('./strategy.pickup.close');
var BuildStrategy = require('./strategy.build');


class RoleBuilder {
    constructor() {
        this.travelingPickup = new ClosePickupStrategy(RESOURCE_ENERGY, 2);
        this.loadFromNeighbour = new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (creep)=> {
            return (s)=> {
                if (s.structureType === STRUCTURE_LAB) return false;
                let range = s.pos.getRangeTo(creep);
                return range < 2 && s.energy > 50;
            };
        });
        this.loadStrategies = [
            new ClosePickupStrategy(RESOURCE_ENERGY, 5),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (creep)=> ((s)=>s.structureType !== STRUCTURE_LAB && s.pos.getRangeTo(creep) < 5)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (creep)=> ((s)=>s.structureType !== STRUCTURE_LAB ) /*,(creep)=>((s)=>([STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION].indexOf(s.structureType) < 0))*/),
            new PickupStrategy(RESOURCE_ENERGY)/*,
            new HarvestEnergySourceStrategy()*/];
        this.buildStrategy = new BuildStrategy();
        this.BUILD_TARGET = 'buildtarget';
        util.indexStrategies(this.loadStrategies);
    }
/**
     *
     * @param creep
     * @returns {boolean} true if looking for boost, false if it's all good
     */
    seekBoosts(creep) {
        // creep.log('seekBoosts');
        if (creep.memory.boosted) return false;
        let workParts = _.filter(creep.body, (p)=>p.type === WORK);
        if (workParts.length) {
            let neededBoosts = workParts.length - workParts.filter((p)=>p.boost).length;
            if (!neededBoosts) return false;
            let labs = creep.room.find(FIND_STRUCTURES, {filter: (s)=>s.structureType === STRUCTURE_LAB && s.mineralType === 'LH'});
            labs = labs.filter((l)=>l.mineralAmount >= neededBoosts * 30 && l.energy >= 20 * neededBoosts);
            // creep.log('boosting?', attackParts.length, neededBoosts, labs.length);
            if (labs.length && neededBoosts) {
                // creep.log('labs', JSON.stringify(labs));
                let lab = creep.pos.findClosestByRange(labs);
                // creep.log('lab', JSON.stringify(lab));
                if (!lab) {
//                    creep.log('NO LAB???', JSON.stringify(labs));
                    creep.memory.boosted  =true;
                    return false;
                }
                let boosted = lab.boostCreep(creep);
                if (boosted == ERR_NOT_IN_RANGE) {
                    creep.log('moving to lab', JSON.stringify(lab.pos));
                    creep.moveTo(lab);
                    return true;
                } else if (boosted == OK) {
                    creep.memory.boosted = true;
                    return false;
                }

            }
        }
        return false;

    }
    resign(creep) {
        creep.log('resigning ?');
        // creep.memory.role = 'upgrader';
    }

    /*
     findTarget(creep) {
     var target = util.objectFromMemory(this.BUILD_TARGET);
     if (!target) {
     // console.log("finding target for  ", creep.name);
     var targets = creep.room.find(FIND_CONSTRUCTION_SITES).sort((c)=> -(c.progress / c.progressTotal));
     if (targets.length) {
     target = targets[0];

     creep.memory[this.BUILD_TARGET] = target.id;
     }
     }
     return target;
     }
     */

    onNoLoadStrategy(creep) {

    }

    /** @param {Creep} creep **/
    run(creep) {
        if (this.seekBoosts(creep)) return;
        if (creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            delete creep.memory[util.CURRENT_STRATEGY];
        }
        if (!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
            creep.memory.building = true;
            delete creep.memory.source;
            delete creep.memory.pickupSource;
            util.setCurrentStrategy(creep, null);
            delete creep.memory[this.buildStrategy.BUILD_TARGET];
        }

        if (creep.memory.building) {
            if (!this.buildStrategy.accepts(creep)) {
                this.resign(creep);
            }
        } else {
            this.travelingPickup.accepts(creep);
            this.loadFromNeighbour.accepts(creep);
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);

            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            } else {
                this.onNoLoadStrategy(creep);
                // creep.log('no loadStrategy');
            }
        }
    }
}

module.exports = RoleBuilder;