
var roleCarry = {
        resign: function (creep) {
            creep.log("resigning");
            delete creep.memory.role;
            delete creep.memory.source;
            delete creep.memory.target;
        },
        findSource: function (creep) {
            var source;
            if (!creep.memory.source) {
                var allSources = creep.room.find(FIND_STRUCTURES, {
                    filter: function (s) {
                        return s.structureType == STRUCTURE_CONTAINER && s.store.energy > 0;}});
                var fullSources = _.filter(allSources, function(s) { return s.store.energy > (creep.carryCapacity - _.sum(creep.carry));});
                // console.log(creep.name + " " + creep.memory.role + " fullSources ", fullSources.length);
                var overflowingSources = _.filter(fullSources, function (s) {
                    return s.store.energy == s.storeCapacity;
                });
                if (overflowingSources.length >0) {
                    source = creep.pos.findClosestByRange(overflowingSources);
                } else  if (fullSources.length>0) {
                    source = creep.pos.findClosestByRange(fullSources);
                } else if (allSources.length>0) {
                    source = _.sortBy(allSources, function(s) {return -s.store.energy})[0];
                }
                // source = creep.pos.findClosestByRange(fullSources.length>0? fullSources: allSources);
                if (!source) {
                    creep.log("failed finding source");
                    return null;
                } else {
                    // console.log(creep.name +" "+ creep.memory.role+  " found source ", source.store.energy);
                }
                // console.log("found a source ", source.store.energy);
                creep.memory.source = source.id;
                return source;
            } else {
                source = Game.getObjectById(creep.memory.source);
                if (source && source.energy > 0) {
                    return source;
                } else {
                    // console.log(creep.name +" "+ creep.memory.role+  " source exhausted, recomputing");
                    delete creep.memory.source;
                    return this.findSource(creep);
                }
            }
        },
        findDroppedEnergy: function (creep) {
            if (creep.memory.source) {
                var target = Game.getObjectById(creep.memory.source);
                if (target && target instanceof Resource
                    && target.resourceType == RESOURCE_ENERGY && target.amount > 0) {
                    return target;
                } else {
                    delete creep.memory.source;
                }
            }
            var drops = creep.room.find(FIND_DROPPED_ENERGY);
            if (drops.length > 0) {
                var target = creep.pos.findClosestByRange(drops);
                creep.memory.source = target.id;
                return target;
            } else {
                return null;
            }
        },
    setTarget: function(creep, s) {
        if (s) {
            creep.memory.target = s.id;
            return s;
        } else {
            delete creep.memory.target;
        }
    },
        /*
         fill extensions first, the spawn slowly fills itself
         */
        findTarget: function (creep) {
            if (undefined === creep.memory.target) {
                // console.log("finding target for  ", creep.name);
                var towers = creep.room.find(FIND_STRUCTURES, {
                    filter: function (structure) {
                        return (structure.structureType == STRUCTURE_TOWER) &&
                            structure.energy < structure.energyCapacity;
                    }
                });
                if (towers.length >0 ) {
                    return this.setTarget(creep, creep.pos.findClosestByPath(towers));
                }
                // console.log("no towers");
                var extensions = creep.room.find(FIND_STRUCTURES, {
                    filter: function (structure) {
                        return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                            structure.energy < structure.energyCapacity;
                    }
                });
                if (extensions.length >0 ) {
                    return this.setTarget(creep, creep.pos.findClosestByPath(extensions));
                }
                var storage = creep.room.find(FIND_STRUCTURES, {
                    filter: function (s) {
                        return s.structureType == STRUCTURE_STORAGE && _.sum(s.store)< s.storeCapacity
                    }
                });
                if (storage.length > 0) {
                    return this.setTarget(creep, _.sample(storage));
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
        run: function (creep) {
            if (creep.memory.action == 'pickup' && creep.memory.source && !Game.getObjectById(creep.memory.source)) {
                delete creep.memory.action;
                delete creep.memory.source;
            }
            if (!creep.memory.action || (creep.memory.action == 'unload' && creep.carry.energy == 0)) {
                if (this.findDroppedEnergy(creep)) {
                    creep.memory.action = 'pickup';
                    delete creep.memory.source;
                } else {
                    creep.memory.action = 'load';
                }
                // console.log(creep.name , " now ", creep.memory.action);
            } else if ((creep.memory.action == 'load' || creep.memory.action == 'pickup') && creep.carry.energy == creep.carryCapacity) {
                creep.memory.action = 'unload';
                // try keeping the same source
                // delete creep.memory.source;
                // console.log(creep.name , " now ", creep.memory.action);
            }
            if (creep.memory.action == 'load') {
                var source = this.findSource(creep);
                if (source) {

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
                } else {
                    creep.log("no source");
                }
            } else if (creep.memory.action == 'pickup') {
                var target = this.findDroppedEnergy(creep);


                if (target) {
                    creep.memory.source = target.id;
                    if (target.amount < (creep.carryCapacity - creep.carry.energy)) {
                        var containers = creep.room.lookForAt(STRUCTURE_CONTAINER, target);
                        if (containers.length>0 && containers[0].store.energy > 0) {
                            containers[0].transfer(creep, RESOURCE_ENERGY, creep.carryCapacity - creep.carry.energy- target.amount)
                        }

                    }
                    if (creep.pickup(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    } else if (target.amount == 0 || _.sum(creep.carry) == creep.carryCapacity) {
                        delete creep.memory.source;
                        creep.memory.action = 'load';
                    }
                } else {
                    delete creep.memory.action;
                    delete creep.memory.source;
                }
            } else if (creep.memory.action == 'unload') {
                delete creep.memory.source;
                var target = this.findTarget(creep);
                if (target) {
                    // console.log(creep.memory.role + ' ' + creep.name + " " + target);
                    var ret = creep.transfer(target, RESOURCE_ENERGY);
                    if (ret == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    } else if (ret !== OK) {
                        creep.log('transfer', ret);
                    }
                    if (target.energy == target.enrgyCapacity) {
                        delete creep.memory.target;
                    }
                } else  {
                    delete creep.memory.target;

                }
            }
        }
    };

module.exports = roleCarry;
