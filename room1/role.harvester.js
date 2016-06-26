
var roleHarvester = {
    resign: function(creep) {
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
    findDroppedEnergy:  function(creep) {
        var drops = creep.room.find(FIND_DROPPED_ENERGY);
        if (drops.length >0) {
            return drops[0];
        } else {
            return null;
        }
    },
    /*
     fill extensions first, the spawn slowly fills itself
     */
    findTarget: function(creep) {
   		if (undefined === creep.memory.target) {
   			// console.log("finding target for  ", creep.name);
            var extensions= creep.room.find(FIND_STRUCTURES, {
                filter: function (structure)  {
                    return (structure.structureType == STRUCTURE_EXTENSION) &&
                        structure.energy < structure.energyCapacity;
                }});
            var spawns = creep.room.find(FIND_STRUCTURES, {
                filter: function (structure)  {
                    return (structure.structureType == STRUCTURE_SPAWN) &&
                        structure.energy < structure.energyCapacity;
                }});

            var target = creep.pos.findClosestByRange((extensions.length == 0 ? spawns : extensions));
   			if (target && !_.isString(target) ) {
   				// var target = _.sample(targets);
   				creep.memory.target = target.id;
   				return target;
            } else {
                // console.log(creep.name, " all full, sending to spawn");
                return _.sample(creep.room.find(FIND_STRUCTURES, {structureType: STRUCTURE_SPAWN}));
   			// } else {
                // do not resign the last harvester
                // if (_.size(creep.room.find(FIND_MY_CREEPS, {filter:(c) =>{return c.memory.role == 'harvester'}}))>1) this.resign(creep);
            }
   		} else {
   			var target = Game.getObjectById(creep.memory.target);
   			if (!target || (target.energy == target.energyCapacity)) {
   				delete creep.memory.target;
   				return this.findTarget(creep);
   			} else {
   				return target;
   			}

   		}
   	},
    /** @param {Creep} creep **/
    run: function(creep) {
        if (! creep.memory.action || (creep.memory.action == 'fill' && creep.carry.energy == 0)) {
            if (this.findDroppedEnergy(creep)) {
                creep.memory.action= 'pickup';
            } else {
                creep.memory.action = 'harvest';
            }
            // console.log(creep.name , " now ", creep.memory.action);
        } else if (creep.memory.action == 'harvest' && creep.carry.energy == creep.carryCapacity) {
            creep.memory.action='fill';
            delete creep.memory.source;
            // console.log(creep.name , " now ", creep.memory.action);
        }
	    if(creep.memory.action=='harvest') {
            var source = this.findSource(creep);
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    var ret = creep.moveTo(source);
                    if (ret == ERR_NO_PATH) {
                        console.log(creep.name, " no path to source");
                        delete creep.memory.source;
                    }
                }
            }
        } else if (creep.memory.action=='pickup') {
            delete creep.memory.source;
            var target = this.findDroppedEnergy(creep);
            if (target) {
                if (creep.pickup(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }

                if (target.amount == 0) {
                    delete creep.memory.target;
                    creep.memory.action = 'fill';
                }
            } else {
                delete creep.memory.action;
            }
        } else if (creep.memory.action=='fill') {
            delete creep.memory.source;
            var target = this.findTarget(creep);
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
                if (target.energy == target.enrgyCapacity) {
                    delete creep.memory.target;
                }
            }
        }
	}
};

module.exports = roleHarvester;