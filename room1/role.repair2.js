var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var BaseStrategy = require('./strategy.base');
var PickupStrategy = require('./strategy.pickup');
var BuildStrategy = require('./strategy.build');
var WaitStrategy = require('./strategy.wait');


class RepairStrategy extends BaseStrategy {
    constructor() {
        super();
    }
    clearTarget(creep) {
        util.release(creep, creep.memory.targetid, 'repair');
        delete creep.memory.targetid;
    }
    accepts(creep) {
        var target = this.findTarget(creep);
        if (!target) {
            // creep.log("no repair target");
        } else {
            // creep.log('3',target.hits, target.hitsMax, target.pos);
            let repairPos = creep.room.findValidParkingPosition(creep, target.pos, 3);
            if (repairPos && !creep.pos.isEqualTo(repairPos)) {
                util.moveTo(creep, repairPos, undefined, {range: 0});
            } else {
                let ret = creep.repair(target);
                if (ret == ERR_NOT_IN_RANGE && !repairPos) {
                    util.moveTo(creep, target.pos);
                } else if (ret !== OK) {
                    creep.log('unexpected repair value', ret);
                    this.clearTarget(creep);
                }

                if (target.hits == target.hitsMax) {
                    this.clearTarget(creep);
                }
            }
        }
        return !!target;

    }
    findDamagedStructures(creep) {
        return _.sortBy(creep.room.find(FIND_STRUCTURES, {
            filter: function (structure) {
                return ([STRUCTURE_ROAD, STRUCTURE_CONTAINER].indexOf(structure.structureType) >= 0
                    || (structure.my && structure.ticksToDecay && structure.hits < 1000))
                    && structure.hits < structure.hitsMax / 2;
            }
        }), (s) => s.ticksToVanish);
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
            // first repair structures in bad shape, then walls, try getting one for each creep
            if (myDamagedStructures.length) {
                target = _.head(myDamagedStructures);
            }
            if (!target) {
                let myDamagedWalls = this.findDamagedWalls(creep);
                if (myDamagedWalls.length) {
                    target = _.sortBy(myDamagedWalls, (s) => s.hits).find((s) => !util.isReserved(creep, s, 'repair'));
                } else {
                    target = creep.pos.findClosestByRange(myDamagedStructures);
                }
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

    /**
     *
     * @param {Creep| {pos}} creep
     * @param {Structure} target repair target
     * @returns {RoomPosition}
     */
    findRepairPos(creep, target) {
        return creep.room.findValidParkingPosition(creep, target.pos, 3);
    }
}
class RoleRepair2 {
    constructor() {
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined),
            new PickupStrategy(RESOURCE_ENERGY)/*,
             new HarvestEnergySourceStrategy()*/
        ];
        this.unloadStrategies = [
            new RepairStrategy(),
            new WaitStrategy(10)/*,
             new HarvestEnergySourceStrategy()*/
        ];
        this.ACTION_FILL = 'fill';
        this.buildStrategy = new BuildStrategy();
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
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
            let labs = (creep.room.structures[STRUCTURE_LAB] || []).filter(s=> s.mineralType === 'LH');
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
                    util.moveTo(creep, lab.pos, undefined, {range: 1});
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
        let strategies = creep.memory.action == this.ACTION_FILL ? this.loadStrategies : this.unloadStrategies;
        let strategy = util.getAndExecuteCurrentStrategy(creep, strategies);
        //creep.log('1',util.strategyToLog(strategy));
        if (!strategy) {
            strategy = _.find(strategies, (strat)=> (strat.accepts(creep)));
        }
        //creep.log('2',util.strategyToLog(strategy));
        if (strategy) {
            util.setCurrentStrategy(creep, strategy);
            //creep.log('strategy ', strategy.constructor.name);
        } else {
            creep.log(`no ${creep.memory.action} strategy`);
            return;
        }

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

}
// module.exports = roleRepair2;
require('./profiler').registerClass(RoleRepair2, 'RoleRepair2');
module.exports = RoleRepair2;