var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');


class RoleBuilder {
	constructor() {
     this.loadStrategies = [
		 new PickupStrategy(RESOURCE_ENERGY),
		 new LoadFromContainerStrategy(RESOURCE_ENERGY),
		 new HarvestEnergySourceStrategy()];
	}
	
	resign(creep) {
		creep.log("resigning ");
		delete creep.memory.role;
	}
	findTarget(creep) {
		var target ;
		if (! creep.memory.target) {
			// console.log("finding target for  ", creep.name);
			var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
			if (targets.length) {
				target = creep.pos.findClosestByRange(targets);
				creep.memory.target = target.id;
				return target;
			}
		} else {
			target = Game.getObjectById(creep.memory.target);
			if (!target) {
				delete creep.memory.target;
				return this.findTarget(creep);
			} else {
				return target;
			}

		}
	}
    /** @param {Creep} creep **/
    run(creep) {
	    if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
	    }
	    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
			delete creep.memory.source;
	    }

		if (creep.memory.building) {
			var target = this.findTarget(creep);
			if (!target) {
				creep.log("target null");
				delete creep.memory.target;
				this.resign(creep);
			} else {
				if (creep.build(target) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target);
				}
				if (target.progress == target.progressTotal) {
					creep.log("build complete", target.name);
					delete creep.memory.target;
				}
			}
		}
		else {
			let strategy =util.getAndExecuteCurrentStrategy(creep,this.loadStrategies);
            
			if (!strategy) {
				strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
			}

			if (strategy) {
				util.setCurrentStrategy(creep, strategy);
				// creep.log('strategy ', strategy.constructor.name);
			} else {
				creep.log('no loadStrategy');
			}
		}
	}
}

module.exports = RoleBuilder;