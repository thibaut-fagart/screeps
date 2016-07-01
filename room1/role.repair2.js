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
			delete creep.memory.targetid;
			delete creep.memory.source;
		} else if (creep.carry.energy == creep.carryCapacity) {
			delete creep.memory.action;

		}
		if (creep.memory.action == this.ACTION_FILL) {
			let strategy =util.getAndExecuteCurrentStrategy(creep,this.loadStrategies);
			if (!strategy) {
				strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
			}

			if (strategy) {
				util.setCurrentStrategy(creep, strategy);
				// creep.log('strategy ', strategy.constructor.name);
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
				if (creep.repair(target) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target);
				}
				if (target.hits == target.hitsMax) {
					delete creep.memory.targetid;
				}
			}
		}
		return false;
    }
/// LEGACY BELOW

	repair (target) {
		if (!this.underRepair) {
			this.underRepair = [];
		}
		this.underRepair.push(target);
	}

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
		var target = util.objectFromMemory(creep.memory, 'targetid',(s)=> s.hits < s.hitsMax);
		if (! target) {
			// console.log("finding target for  ", creep.name);
			var myDamagedStructures = this.findDamagedStructures(creep);
			var myDamagedWalls = this.findDamagedWalls(creep);
			if (!this.needRepairs) {
				this.needRepairs = _.sortBy(myDamagedStructures.concat(myDamagedWalls), function (s) {
					return s.hits / s.hitsMax;
				});
				this.needRepairAmount = _.reduce(this.needRepairs, function (total, s) {
					return total + (s.hitsMax - s.hits)
				}, 0);
			}
			// first repair structures in bad shape, then walls, try getting one for each creep
			if (myDamagedStructures.length && (myDamagedStructures[0].hits / myDamagedStructures[0].hitsMax) < 0.5) {
				let damagedContainers = _.filter(myDamagedStructures, (s)=>s.structureType == STRUCTURE_CONTAINER);
				let mostDamagedContainer = _.min(damagedContainers, (s) => s.hits/s.hitsMax);
				if (mostDamagedContainer.hits < 10000) {
					target = mostDamagedContainer;
				} else {
					target = _.min(myDamagedStructures, (s) => s.hits / s.hitsMax);
                    this.repair(target);
                }
			} else if (myDamagedWalls.length) {
				target = _.min(myDamagedWalls, (s) => s.hits/s.hitsMax);
				this.repair(target);
			} else {
				target = _.sample(this.needRepairs);
				if (target) {
					this.repair(target);
				}
			}
			creep.log('damagedStructures', JSON.stringify(_.countBy(myDamagedStructures,(s)=>s.structureType)));
			creep.log("repairing", target.structureType, JSON.stringify(target.pos), target.hits);
			creep.memory.targetid = target.id;
			return target;
		} else {
			return target;
		}
	}

}
// module.exports = roleRepair2;
module.exports = new RoleRepair2();