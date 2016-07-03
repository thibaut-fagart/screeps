var _ = require('lodash');
var roleRepair = {
	findContainerSource: function (creep) {
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

	},
	findDismantleTarget: function(creep) {
		if (creep.memory.source && creep.memory.dismantling ) {
			var source = Game.getObjectById(creep.memory.source);
			if (source) return source;
		}
		var dismantleTargets = this.findMarkedStructures(creep);
		if (!dismantleTargets.length) {
			dismantleTargets = creep.room.find(FIND_STRUCTURES, {
				filter: function (s) {
					return s.structureType == STRUCTURE_WALL && s.pos.y <= 20
                }
            });
        }
		var target = creep.pos.findClosestByRange(dismantleTargets);
		if (target) {
			creep.memory.dismantling = true;
			creep.memory.source = target.id;
			creep.log("dismantling", JSON.stringify(target.pos));

		}
		return target;
	},
	findSource: function (creep) {
		var source ;
		var dismantleSource = this.findDismantleTarget(creep);
		if (dismantleSource) {
			return dismantleSource;
		}

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
		 if (source && source.transfer && source.store.energy > 0) {
			 return source;
		 } else if (!source.transfer && source.energy > 0) {
             return source;
         } else {
             delete creep.memory.source;
			 delete creep.memory.dismantling;
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
	findMarkedStructures: function(creep) {
		if (!this.markedTargets) {
			var targetIds = creep.room.memory.dismantle || [];
			var obsolete = [];
			var targets = _.filter(_.map(targetIds, function(id) {
				var target = Game.getObjectById(id);
				if (!target) {obsolete.push(id);}
	               return target;
			}), function(s) {return 'undefined' !== typeof s;});
			targetIds = _.filter(targetIds, function (id) {
				return obsolete.indexOf(id) < 0;
			});
			creep.room.memory.dismantle = JSON.stringify(targetIds);
			this.markedTargets = targets;
		}
		// return [];
		return this.markedTargets;
	},
	findDamagedStructures: function (creep) {
		if (!this.myTargets) {

			this.myTargets = _.sortBy(creep.room.find(FIND_STRUCTURES, {
				filter: function (structure) {
					// return this.markedTargets.indexOf(structure) <0 && // marked for dismantle
						return (structure.my || structure.structureType == STRUCTURE_ROAD) && structure.hits < structure.hitsMax && structure.pos > 20;
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
					// return this.targetIds.indexOf(structure.id) <0 && // marked for dismantle
					   return s.structureType == STRUCTURE_WALL && s.hits < s.hitsMax && s.pos.y > 20
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
			creep.log("repairing", target.structureType);
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
			delete creep.memory.dismantling;
	    }

	    if(creep.memory.building) {
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
		} else {
			var source = this.findSource(creep);
			if (creep.memory.dismantling) {
				if(creep.dismantle(source) == ERR_NOT_IN_RANGE) {
	                creep.moveTo(source);
	            }
			} else {
				if (source.transfer) {
                    let ret = source.transfer(creep, RESOURCE_ENERGY);
					if (ERR_NOT_IN_RANGE == ret) {
						creep.moveTo(source);
					} else if (OK !== ret) {
						creep.log('fail transfer', ret);
					}
				} else  if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
					creep.moveTo(source);
				}
			}
	    }
		
	}
};

module.exports = roleRepair;