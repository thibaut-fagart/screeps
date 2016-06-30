class RoleBuilder {
	constructor() {
	}
	resign(creep) {
		creep.log("resigning ");
		delete creep.memory.role;
		delete creep.memory.source;
		delete creep.memory.target;
	}
	findContainerSource(creep) {
		var source;
		if (creep.memory.source) {
			source = Game.getObjectById(creep.memory.source);
			if (!source.transfer) return null;
			if (source.store.energy > 0) {
				return source;
			} else {
				delete creep.memory.source;
			}
		}

		var allSources = creep.room.find(FIND_STRUCTURES, {
			filter: function (s) {
				return s.structureType == STRUCTURE_CONTAINER && s.store.energy >0;
			}
		});
		var fullSources = _.filter(allSources, function (s) {
				return s.store.energy > creep.carryCapacity;
			}
		);
		var sources;
		if (fullSources.length > 0) {
			sources = fullSources;
		} else {
			sources = allSources;
		}
		source = creep.pos.findClosestByRange(sources);
		// console.log("found a source ", source.store.energy);
		if (source) {
			creep.memory.source = source.id;
			creep.memory.action = 'load';
		}
		return source;

	}
	findSource(creep) {
		var source ;
		if (!creep.memory.source) {
			source = this.findContainerSource(creep);

			// console.log("container source ? ", source);
			if (source) { return source ; }
			creep.memory.action='harvest';
			var sources = creep.room.find(FIND_SOURCES, {
				filter: function (source) {
					return source.energy > 0;
				}
			});
			// sources = _.sortBy(sources, function (source) {
			// 	return -source.energy ;
			// });
         // JSON.stringify("sorted sources ", sources);
			if (!sources.length) {
             creep.log("failed finding source");
             return null;
			}
			source = _.sample(sources);
			creep.memory.source = source.id;
         // source.consumers = source.consumers +1;
         // console.log(" " + source.consumers + " / " + source.room.creeps.length);
			return source;
		} else {
			var source = Game.getObjectById(creep.memory.source);
			if (source && source.energy > 0) {
				return source;
			} else {
				delete creep.memory.source;
				return this.findSource(creep);
			}
     }
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
					creep.log("build complete",target.name);
					delete creep.memory.target;
				}
			}
		}
		else {
			var source = this.findSource(creep);
			if (source && source.transfer) {
				var ret = source.transfer(creep, RESOURCE_ENERGY);
				// console.log("transfer ? ", ret, ", ", source.store.energy);
				if (ret == ERR_NOT_IN_RANGE) {
					// console.log(creep.name, " moving to source");
					var ret = creep.moveTo(source);
					if (ret == ERR_NO_PATH) {
						creep.log("no path to source");
						delete creep.memory.source;
					}
				}

			} else  if (source) {
				if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
					creep.moveTo(source);
				}
			}
	    }
	}
}

module.exports = RoleBuilder;