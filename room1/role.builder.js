var roleBuilder = {
	resign: function (creep) {
		console.log("resigning ", creep.memory.role);
		delete creep.memory.role;
		delete creep.memory.source;
		delete creep.memory.target;
	},
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
	findTarget: function(creep) {
		var target ;
		if (! creep.memory.target) {
			// console.log("finding target for  ", creep.name);
			var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
			if (targets.length) {
				target = _.sample(targets);
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
	},
    /** @param {Creep} creep **/
    run: function(creep) {

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
				console.log("target null for ", creep);
				delete creep.memory.target;
				this.resign(creep);
			} else {
				if (creep.build(target) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target);
				}
				if (target.progress == target.progressTotal) {
					console.log(target.name, " build complete");
					delete creep.memory.target;
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

module.exports = roleBuilder;