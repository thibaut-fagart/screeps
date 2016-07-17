var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');

class RoleRepair2 {
    constructor() {
        this.loadStrategies = [
            new PickupStrategy(RESOURCE_ENERGY),
            new LoadFromContainerStrategy(RESOURCE_ENERGY ,undefined, (s)=>(s.structureType !== STRUCTURE_TOWER )),
            new HarvestEnergySourceStrategy()
        ];
        this.ACTION_FILL = 'fill';
    }

    /** @param {Creep} creep **/
    run(creep) {
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
            var target = this.findTarget(creep);
            if (!target) {
                creep.log("no repair target");
            } else {
                // creep.log('3',target.hits, target.hitsMax, target.pos);
                let ret = creep.repair(target);
                if (ret == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                } else if (ret !== OK) {
                    creep.log('unexpected repair value', ret);
                    this.clearTarget(creep);
                }
                if (target.hits == target.hitsMax) {
                    this.clearTarget(creep);
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
        util.release(creep, creep.memory.targetid,'repair');
        delete creep.memory.targetid;
    }

/// LEGACY BELOW

    findDamagedStructures(creep) {
        return _.sortBy(creep.room.find(FIND_STRUCTURES, {
            filter: function (structure) {
                // return this.markedTargets.indexOf(structure) <0 && // marked for dismantle
                return (structure.structureType == STRUCTURE_ROAD
                    || structure.structureType == STRUCTURE_CONTAINER)
                    && (structure.hits < structure.hitsMax);
            }
        }), (s) => s.hits);
    }

    findDamagedWalls(creep) {
        return _.sortBy(creep.room.find(FIND_STRUCTURES, {
            filter: (s)=> (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART) && s.hits < s.hitsMax
        }), (w)=>w.hits);
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
            var myDamagedStructures = this.findDamagedStructures(creep);
            var myDamagedWalls = this.findDamagedWalls(creep);
            // first repair structures in bad shape, then walls, try getting one for each creep
            if (myDamagedStructures.length && (myDamagedStructures[0].hits / myDamagedStructures[0].hitsMax) < 0.5) {
                let damagedContainers = _.filter(myDamagedStructures, (s)=>s.structureType == STRUCTURE_CONTAINER);
                let sortedContainers = _.sortBy(damagedContainers, (s) => s.hits / s.hitsMax);
                let mostDamagedContainer2 = _.find(sortedContainers, (s) => !util.isReserved(creep, s, 'repair'));
                if (mostDamagedContainer2 && mostDamagedContainer2.hits < 10000) {
                    target = mostDamagedContainer2;
                } else {
                    target = _.find(_.sortBy(myDamagedStructures, (s) => s.hits ), (s) => !util.isReserved(creep, s, 'repair'));
                }
            } else if (myDamagedWalls.length) {
                target =  _.find(_.sortBy(myDamagedWalls, (s) => s.hits ), (s) => !util.isReserved(creep, s, 'repair'));
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