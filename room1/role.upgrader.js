var roleUpgrader = {
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
    /** @param {Creep} creep **/
    run: function(creep) {
	    if(creep.carry.energy == 0) {
	        creep.memory.action='fill';
            delete creep.memory.source;
	    }
	    if (creep.memory.action =='fill') {
            var source = this.findSource(creep);
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
            if (creep.carry.energy == creep.carryCapacity) {
                creep.memory.action='upgrade';
            }
        }
        else {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
            if (creep.carry.energy == 0) {
                creep.memory.action = 'fill';
            }
        }
	}
};

module.exports = roleUpgrader;