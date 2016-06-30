//Game.spawns.Spawn1.createCreep([MOVE,CARRY,WORK],undefined,{role:'remoteHarvester'})

var roleRemoteHarvester = {
    /*
    requires : remoteRoom=creep.room.remoteMining, homeroom = creep.room.name, homeroom, remoteSource
     */
    resign: function(creep) {
        creep.log("resigning");
        delete creep.memory.role;
        delete creep.memory.action; //{go_remote_room, load, go_home, unload}
        delete creep.memory.remoteRoom;
        delete creep.memory.homeRoom;
        delete creep.memory.remoteSource;
    },
    findSource: function (creep, memoryName) {
        if (!memoryName) {
            memoryName = 'source';
        }
   		var source;
   		if (!creep.memory[memoryName]) {
   			var sources = creep.room.find(FIND_SOURCES_ACTIVE);
   			if (!sources.length) {
                // creep.log("failed finding source", creep.pos);
                return null;
   			}
   			source = _.sample(sources);
            creep.memory[memoryName] = source.id;
            // source.consumers = source.consumers +1;
            // console.log(" " + source.consumers + " / " + source.room.creeps.length);
   			return source;
   		} else {
            var source = Game.getObjectById(creep.memory[memoryName]);
            if (source.energy > 0) {
                return source;
            } else {
                creep.log("source exhausted, recomputing");
                delete creep.memory[memoryName];
                return this.findSource(creep);
            }
        }
   	},
    /*
     fill extensions first, the spawn slowly fills itself
     */
    findTarget: function(creep) {
   		if (undefined === creep.memory.target) {
   			// console.log("finding target for  ", creep.name);
            var targets= creep.room.find(FIND_STRUCTURES, {
                filter: function (structure)  {
                    return ((structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN)
                            &&structure.energy < structure.energyCapacity)
                        || (structure.structureType == STRUCTURE_CONTAINER && structure.store.energy < structure.storeCapacity);
                }});
            var target = creep.pos.findClosestByRange(targets);
   			if (target && !_.isString(target) ) {
   				// var target = _.sample(targets);
   				creep.memory.target = target.id;
   				return target;
            } else {
                creep.log("all full, sending to spawn");
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
    init : function(creep) {
        creep.memory.action = 'go_remote_room';
        creep.memory.homeroom = creep.room.name;
        creep.memory.remoteMining = creep.room.memory.remoteMining;
    },
    findExit: function(creep, room, memoryName) {
        var exit ;
        if (!creep.memory[memoryName] || ((_.random(0, 50) +Game.time)% 1000 ==0)) {
            creep.log("finding exit to", room);
            var exitDir = creep.room.findExitTo(room);// TODO do we need to recompute that when refreshing path ?
            exit = creep.pos.findClosestByPath(exitDir);
            creep.memory[memoryName] = JSON.stringify(exit);
        } else {
            exit = JSON.parse(creep.memory[memoryName]);
        }
        return exit;

    },
    findHomeExit: function(creep) {
        return this.findExit(creep, creep.room.memory.remoteMining, 'homeExit');
    },
    findRemoteExit: function(creep) {
        return this.findExit(creep, creep.memory.homeroom, 'remoteExit');
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        if (!creep.memory.action) {
            this.init(creep)

        }
        if (creep.memory.action == 'go_remote_room' && creep.room.name != creep.memory.homeroom) {
            creep.memory.action = 'load';
        } else if (creep.memory.action == 'load' && creep.carry.energy == creep.carryCapacity) {
            creep.memory.action = 'go_home_room';
            // console.log(creep.memory.role + creep.memory.action);
        } else if (creep.memory.action == 'go_home_room' && creep.room.name == creep.memory.homeroom) {
            creep.memory.action = 'unload';
            // console.log(creep.memory.role + creep.memory.action);
        } else if (creep.memory.action == 'unload' && creep.room.name == creep.memory.homeroom && creep.carry.energy == 0) {
            creep.memory.action = 'go_remote_room';
            creep.log(creep.memory.action);
        }

        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.homeroom) {
            if (!creep.room.memory.remoteMining) {
                creep.log("no remoteMining room");
                this.resign();
            } else {
                var exit = this.findHomeExit(creep);
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                // console.log("moving to homeExit ", );
            }
        }
        if (creep.memory.action == 'load' && creep.room.name != creep.memory.homeroom) {
            var source = this.findSource(creep, 'remotesource');
            if (source && source.energy > 0) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    var ret = creep.moveTo(source,{reusePath: 50});
                    if (ret== OK){

                    } else if (ret == ERR_NO_PATH) {
                        creep.log("no path to source");
                        creep.moveTo(source);
                        delete creep.memory.remotesource;
                    } else {
                        creep.log("moveTo", ret);
                    }
                }
            }
        }
        if (creep.memory.action == 'go_home_room' && creep.room.name != creep.memory.homeroom) {
            var exit = this.findRemoteExit(creep);
            if (exit) {
                creep.moveTo(exit.x, exit.y,{reusePath: 50});
            } else {
                creep.log("no exit ?", creep.pos);
            }

            // console.log("moving to remoteExit ", );
        }
        if (creep.memory.action == 'unload' && creep.room.name == creep.memory.homeroom) {
            var target = this.findTarget(creep);
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target,{reusePath: 50});
                }
                if (target.energy == target.energyCapacity) {
                    delete creep.memory.target;
                }
            }
        }
    }
};

module.exports = roleRemoteHarvester;