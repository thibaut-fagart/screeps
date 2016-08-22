var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var BuildStrategy = require('./strategy.build');

class RoleRepair2 {
    constructor() {
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (creep)=>((s)=>(s.structureType !== STRUCTURE_TOWER && s.structureType !== STRUCTURE_LAB))),
            new PickupStrategy(RESOURCE_ENERGY)/*,
             new HarvestEnergySourceStrategy()*/
        ];
        this.ACTION_FILL = 'fill';
        this.buildStrategy = new BuildStrategy();
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
                    creep.memory.boosted = true;
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

    /** @param {Creep} creep **/
    run(creep) {
        if (this.seekBoosts(creep)) return;
        if (creep.carry.energy == 0) {
            creep.memory.action = this.ACTION_FILL;
            this.clearTarget(creep);
            delete creep.memory.source;
        } else if (creep.carry.energy == creep.carryCapacity) {
            delete creep.memory.action;
        }
        if (creep.memory.action == this.ACTION_FILL) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            //creep.log('1',util.strategyToLog(strategy));
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }
            //creep.log('2',util.strategyToLog(strategy));
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                //creep.log('strategy ', strategy.constructor.name);
            } else {
                creep.log('no loadStrategy');
                return;
            }

        }
        else {
            if (/*!this.buildStrategy.accepts(creep)*/true) {
                var target = this.findTarget(creep);
                if (!target) {
                    // creep.log("no repair target");
                } else {
                    // creep.log('3',target.hits, target.hitsMax, target.pos);
                    let ret = creep.repair(target);
                    if (ret == ERR_NOT_IN_RANGE) {
                        util.moveTo(creep, target.pos, this.constructor.name + 'Path');
                    } else if (ret !== OK) {
                        creep.log('unexpected repair value', ret);
                        this.clearTarget(creep);
                    }
                    if (target.hits == target.hitsMax) {
                        this.clearTarget(creep);
                    }
                }
            }
        }
        return false;
    }

    /**
     *
     * @param {Creep} creep
     */
    clearTarget(creep) {
        util.release(creep, creep.memory.targetid, 'repair');
        delete creep.memory.targetid;
    }

/// LEGACY BELOW

    findDamagedStructures(creep) {
        return _.sortBy(creep.room.find(FIND_STRUCTURES, {
            filter: function (structure) {
                return ([STRUCTURE_ROAD, STRUCTURE_CONTAINER].indexOf(structure.structureType) >= 0
                    || (structure.my && structure.ticksToDecay && structure.hits < 1000))
                    && structure.hits < structure.hitsMax;
            }
        }), (s) => s.hits);
    }

    findDamagedWalls(creep) {
        return creep.room.wallsRequiringRepair();
    }

    findTarget(creep) {

        var target = util.objectFromMemory(creep.memory, 'targetid');
        if (target && target.hits == target.hitsMax) {
            util.release(creep, target, 'repair');
            delete creep.memory.targetid;
            target = null;
        }
        if (!target) {
            // console.log("finding target for  ", creep.name);
            let myDamagedStructures = this.findDamagedStructures(creep);
            let myDamagedWalls = this.findDamagedWalls(creep);
            let newWalls = myDamagedWalls.filter((wall)=>wall.hits === 1);
            // first repair structures in bad shape, then walls, try getting one for each creep
            if (myDamagedStructures.length && (myDamagedStructures[0].hits / myDamagedStructures[0].hitsMax) < 0.5) {
                let damagedContainers = _.filter(myDamagedStructures, (s)=>s.structureType == STRUCTURE_CONTAINER);
                let sortedContainers = _.sortBy(damagedContainers, (s) => s.hits / s.hitsMax);
                let mostDamagedContainer2 = _.find(sortedContainers, (s) => !util.isReserved(creep, s, 'repair'));
                if (mostDamagedContainer2 && mostDamagedContainer2.hits < 100000) {
                    target = mostDamagedContainer2;
                } else {
                    target = _.find(_.sortBy(myDamagedStructures, (s) => s.hits), (s) => !util.isReserved(creep, s, 'repair'));
                }
            } else if (myDamagedWalls.length) {
                target = _.sortBy(myDamagedWalls, (s) => s.hits).find((s) => !util.isReserved(creep, s, 'repair'));
                /*
                 let wallsByHealth = _.filter(_.sortBy(myDamagedWalls, (s) => s.hits ), (s) => !util.isReserved(creep, s,'repair'));
                 // creep.log('most damaged wall', wallsByHealth[0], wallsByHealth[0].hits);
                 let baseline = wallsByHealth[0].hits;
                 wallsByHealth = wallsByHealth.slice(0, _.findIndex(wallsByHealth, (w)=> w.hits > 2 * baseline));
                 target = creep.pos.findClosestByRange(wallsByHealth);
                 */

            } else {
                target = creep.pos.findClosestByRange(myDamagedStructures);
            }
            //creep.log("repairing", target.structureType, JSON.stringify(target.pos), '' + target.hits + '/' + target.hitsMax, 'damagedStructures', JSON.stringify(_.countBy(myDamagedStructures, (s)=>s.structureType)));
            // todo clear previous locks ?
            (creep.memory.locks || []).forEach((id)=>util.release(creep, id, 'repair'));

            if (target && util.reserve(creep, target, 'repair')) creep.memory.targetid = target.id;
            return target;
        } else {
            return target;
        }
    }

}
// module.exports = roleRepair2;
module.exports = RoleRepair2;