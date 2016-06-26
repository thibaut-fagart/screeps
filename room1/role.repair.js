var roleRepair = {
	findSource: function (creep) {
		var source;
		if (!creep.memory.source) {
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
             console.log(creep.name, " failed finding source");
             return null;
			}
			source = _.sample(sources);
			creep.memory.source = source.id;
         // source.consumers = source.consumers +1;
         // console.log(" " + source.consumers + " / " + source.room.creeps.length);
			return source;
		} else {
         var source = Game.getObjectById(creep.memory.source);
         if (source.energy > 0) {
             return source;
         } else {
             console.log("source exhausted, recomputing");
             delete creep.memory.source;
             return this.findSource(creep);
         }
     }
	},

	repair: function (target) {
		if (!this.underRepair) {
			this.underRepair = [];
		}
		this.underRepair.push(target);
	},
	findDamagedStructures: function (creep) {
		if (!this.myTargets) {
			this.myTargets = _.sortBy(creep.room.find(FIND_STRUCTURES, {
				filter: function (structure) {
					return (structure.my || structure.structureType == STRUCTURE_ROAD) && structure.hits < structure.hitsMax;
				}
			}), function (s) {
				return s.hits / s.hitsMax;
			});
		}
		return this.myTargets;
	},
	findDamagedWalls: function (creep) {
		if (!this.myWalls) {
			this.myWalls = creep.room.find(FIND_STRUCTURES, {
				filter: function (s) {
					return s.structureType == STRUCTURE_WALL && s.hits < s.hitsMax
				}
			});
                }
		return this.myWalls;
	},
	findTarget: function(creep) {
		var target ;
		if (! creep.memory.targetid) {
			// console.log("finding target for  ", creep.name);
			var myDamagedStructures = this.findDamagedStructures(creep);
			var myDamagedWalls = this.findDamagedWalls(creep);
			if (! this.needRepairs) {
				this.needRepairs = _.sortBy(myDamagedStructures.concat(myDamagedWalls), function(s) {return s.hits/s.hitsMax;});
				this.needRepairAmount = _.reduce(this.needRepairs, function (total, s) {
					return total + (s.hitsMax - s.hits)
				}, 0);
			}
			var targets = this.needRepairs;
			// first repair structures in bad shape, then walls, try getting one for each creep
			if (myDamagedStructures.length && (myDamagedStructures[0].hits/myDamagedStructures[0].hitsMax) < 0.5) {
				target = myDamagedStructures.shift();
				this.repair(target);
			} else  if (targets.length) {
				target = _.sample(targets);
				this.repair(target);
			} else if (this.underRepair.length) {
				target = _.sample(this.underRepair);
				// not needed
				// this.repair(target);
			}
			console.log(creep.name, " repairing ", target.structureType);
			creep.memory.targetid = target.id;
			return target;
		} else {
			target = Game.getObjectById(creep.memory.targetid);
			if (!target) {
				delete creep.memory.targetid;
				return this.findTarget(creep);
			} else {
				return target;
			}

		}
	},
    /** @param {Creep} creep **/
    run: function(creep) {

	    if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
			delete creep.memory.targetid;
		}
	    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
			delete creep.memory.source;
	    }

	    if(creep.memory.building) {
			var target = this.findTarget(creep);
			if (!target) {
				console.log("no repair target for ", creep);
			} else {
				if (creep.repair(target) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target);
				}
				if (target.hits == target.hitsMax) {
					delete creep.memory.targetid;
				}
			}
		}
		else {
			var source = this.findSource(creep);
			if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
	    }
		
	}
};

module.exports = roleRepair;