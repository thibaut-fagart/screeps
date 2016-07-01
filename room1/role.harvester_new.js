var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var DropToEnergyStorage = require('./strategy.drop_to_energyStorage');
var DropToContainerStrategy = require('./strategy.drop_to_container');
class RoleHarvester {
    constructor() {
        this.loadStrategies = [new HarvestEnergySourceToContainerStrategy(),new HarvestEnergySourceStrategy()];
        this.unloadStrategies = [new DropToEnergyStorage(STRUCTURE_EXTENSION), new DropToEnergyStorage(STRUCTURE_SPAWN),
            new DropToContainerStrategy(STRUCTURE_CONTAINER),new DropToContainerStrategy(STRUCTURE_STORAGE)];

    }
    run(creep) {
        let currentstrategy;
        // creep.log(creep.carry.energy, creep.carryCapacity, creep.memory.currentStrategy);
        if (creep.carry.energy == creep.carryCapacity && creep.carryCapacity > 0) {
            // unload
        } else {
            if (creep.memory.currentStrategy) {
                currentstrategy = _.find(((creep.carry.energy == 0) ? this.loadStrategies : this.unloadStrategies), (strat)=> strat.constructor.name == creep.memory.currentStrategy);
                if (currentstrategy && currentstrategy.accepts(creep)) {

                }else {
                    delete creep.memory.currentStrategy;
                    currentstrategy = null;
                }
            } else {
                currentstrategy = _.find(this.loadStrategies, (strat)=> !(null == strat.accepts(creep)));
            }

            if (currentstrategy) {
                creep.memory.currentStrategy = currentstrategy.constructor.name;
            } else {
                creep.log('no harvest');
            }
        }
    }
}
var roleHarvester = {
    resign: function(creep) {
        creep.log("resigning ");
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
            if (source.energy > 0) {
                return source;
            } else {
                creep.log("source exhausted, recomputing");
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
            if (this.findDroppedEnergy(creep) && creep.carryCapacity >0 ) {
                creep.memory.action= 'pickup';
            } else {
                creep.memory.action = 'harvest';
            }
            // console.log(creep.name , " now ", creep.memory.action);
        } else if (creep.memory.action == 'harvest' && creep.carry.energy == creep.carryCapacity && creep.carryCapacity >0) {
            creep.memory.action='fill';
            delete creep.memory.source;
            // console.log(creep.name , " now ", creep.memory.action);
        }
	    if(creep.memory.action=='harvest') {
            if (creep.carryCapacity > 0 ) {
                var source = this.findSource(creep);
                if (source) {
                    if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                        var ret = creep.moveTo(source);
                        if (ret == ERR_NO_PATH) {
                            creep.log("no path to source");
                            delete creep.memory.source;
                        }
                    }
                }
            } else {
                if (!creep.memory.dropAt || ! creep.memory.source) {
                    delete creep.memory.dropAt;
                    // console.log("finding source");
                    var sources = creep.room.find(FIND_SOURCES, {
                       				filter: function (source) {
                       					return source.energy > 0;
                       				}
                       			});

                    sources.forEach(function(source) {
                        if (creep.memory.dropAt) return;
                        // console.log("looking for containers around source");
                        var structuresAroundSource = creep.room.lookForAtArea(LOOK_STRUCTURES, source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true);
                        // console.log("found structures ", structuresAroundSource.length);

                        var containers = _.filter(_.map(structuresAroundSource, function(o) {return o.structure;}), {structureType: STRUCTURE_CONTAINER});
                        // containers.forEach(function(s) {
                        //     console.log(creep.room.lookForAt(LOOK_CREEPS, s).length);});
                        containers = _.filter(containers,function(s) {
                            var creeps = creep.room.lookForAt(LOOK_CREEPS, s);
                            return creeps.length == 0 || creeps[0].id == creep.id;});
                        if (containers.length) {
                            var container = containers[0];
                            // console.log("found a container at ",JSON.stringify(container.pos));
                            creep.memory.dropAt = container.id;
                            creep.memory.source = source.id;
                        }
                    });
                    if (!creep.memory.dropAt) {
                        creep.moveTo(creep.room.find(FIND_MY_SPAWNS)[0]);
                    }
                } else {
                    // console.log("reusing container");
                    var container = Game.getObjectById(creep.memory.dropAt);
                }

                if (container) {
                    if (creep.pos.x == container.pos.x && creep.pos.y == container.pos.y) {
                        var source = Game.getObjectById(creep.memory.source);
                        //  try not to waste, do not harvest if container is full (unless source is full too)
                        if ((_.sum(container.store) < container.storeCapacity) || (source.energy == source.energyCapacity)){
                            var ret = creep.harvest(source);
                            if (ret == ERR_NOT_IN_RANGE) {
                                delete creep.memory.source ;
                            } else if (ret != 0) {
                                creep.log("failed harvest", ret);
                            }
                        } else {
                            // console.log("waiting");
                        }
                    } else {
                        // console.log("moving to container");
                        creep.moveTo(container)
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
                if (target.energy == target.energyCapacity) {
                    delete creep.memory.target;
                }
            }
        }
	}
};

// module.exports = roleHarvester;
module.exports = new RoleHarvester();