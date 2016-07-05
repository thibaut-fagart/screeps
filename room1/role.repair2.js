var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');

class RoleRepair2 {
    constructor() {
        this.loadStrategies = [
			new PickupStrategy(RESOURCE_ENERGY),
			new LoadFromContainerStrategy(RESOURCE_ENERGY),
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
			let strategy =util.getAndExecuteCurrentStrategy(creep,this.loadStrategies);
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
					creep.log('unexpected repair value',ret);
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
		util.release(creep, creep.memory.targetid);
		delete creep.memory.targetid;
	}

/// LEGACY BELOW

	findDamagedStructures (creep) {
		if (!this.myTargets) {

			this.myTargets = _.sortBy(creep.room.find(FIND_STRUCTURES, {
				filter: function (structure) {
					// return this.markedTargets.indexOf(structure) <0 && // marked for dismantle
						return (structure.my
							|| structure.structureType == STRUCTURE_ROAD
							|| structure.structureType == STRUCTURE_CONTAINER)
							&& (structure.hits < structure.hitsMax);
				}
			}), (s) => s.hits);
			// creep.log("findDamagedStructures",JSON.stringify(_.countBy(this.myTargets,(s)=>s.structureType)));
		}
		return this.myTargets;
	}
	findDamagedWalls (creep) {
		if (!this.myWalls) {
			this.myWalls =_.sortBy( creep.room.find(FIND_STRUCTURES, {
				filter: (s)=> s.structureType == STRUCTURE_WALL && s.hits < s.hitsMax && s.pos.y > 20
			}),(w)=>w.hits);
		}
		return this.myWalls;
	}
	findTarget(creep) {
		var target = util.objectFromMemory(creep.memory, 'targetid');
		if (target && target.hits == target.hitsMax) {
			this.clearTarget(creep);
			target = null;
		}
		if (! target) {
			// console.log("finding target for  ", creep.name);
			var myDamagedStructures = this.findDamagedStructures(creep);
			var myDamagedWalls = this.findDamagedWalls(creep);
			// first repair structures in bad shape, then walls, try getting one for each creep
			if (myDamagedStructures.length && (myDamagedStructures[0].hits / myDamagedStructures[0].hitsMax) < 0.5) {
				let damagedContainers = _.filter(myDamagedStructures, (s)=>s.structureType == STRUCTURE_CONTAINER);
				let sortedContainers = _.sortBy(damagedContainers, (s) => s.hits / s.hitsMax);
				let mostDamagedContainer2 = _.find(sortedContainers, (s) => !util.isReserved(creep,s));
				if (mostDamagedContainer2.hits < 10000) {
					target = mostDamagedContainer2;
				} else {
					target = _.find(_.sortBy(myDamagedStructures, (s) => s.hits / s.hitsMax), (s) => !util.isReserved(creep, s));
				}
			} else if (myDamagedWalls.length) {
				target =  _.find(_.sortBy(myDamagedWalls, (s) => s.hits / s.hitsMax), (s) => !util.isReserved(creep, s));
			} else {
				target = creep.pos.findClosestByRange(myDamagedStructures);
			}
			//creep.log("repairing", target.structureType, JSON.stringify(target.pos), '' + target.hits + '/' + target.hitsMax, 'damagedStructures', JSON.stringify(_.countBy(myDamagedStructures, (s)=>s.structureType)));
			if (target &&  util.reserve(creep, target)) creep.memory.targetid = target.id;
			return target;
		} else {
			return target;
		}
	}

}
// module.exports = roleRepair2;
module.exports = RoleRepair2;