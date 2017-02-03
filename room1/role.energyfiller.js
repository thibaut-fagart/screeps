var _ = require('lodash');
var util = require('./util');
var Cache = require('./util.cache');
var RoleCarry = require('./role.carry');
var WaitStrategy = require('./strategy.wait');
var BaseStrategy = require('./strategy.base');
var cache = {};
var PickupManager = require('./util.manager.pickup');


/**
 * unload  (mineral to storage), tower(<80%), (spawn/extension), nuker, container (!harvest && < 50%)
 * (lab/terminal, TODO),
 */
class FillerDropStrategy extends BaseStrategy {
    constructor() {
        super();
    }
    clearMemory(creep) {
        delete creep.memory.target;
        delete creep.memory.resource;
        return super.clearMemory(creep);
    }

    findTarget(creep, exclude) {
        'use strict';
        let room = creep.room;
        let target, resource = RESOURCE_ENERGY;
        if (creep.carry.energy < _.sum(creep.carry)) {
            target = room.storage;
            resource = _.keys(creep.carry).find(k=>creep.carry[k]);
        }
        if (!target) {
            let towerNeedsEnergy = room.structures[STRUCTURE_TOWER].filter(t=>t.energy < t.energyCapacity * 0.8 && Cache.get(cache, t.id + 'active', ()=>t.isActive(), 1500) && t !== exclude);
            target = creep.pos.findClosestByRange(towerNeedsEnergy);
        }
        if (!target && (room.energyAvailable < room.energyCapacityAvailable || (room.structures[STRUCTURE_EXTENSION]||[]).length > CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level])) {
            let spawnAndExtensions = room.structures[STRUCTURE_SPAWN].filter(s=>s.energy < s.energyCapacity && s !== exclude).concat(room.structures[STRUCTURE_EXTENSION].filter(s=>s.energy < s.energyCapacity && s !== exclude));
            target = creep.pos.findClosestByRange(spawnAndExtensions);
        }
        if (!target) {
            let lab= _.head(room.structures[STRUCTURE_LAB].filter(lab=>lab.energy < lab.energyCapacity));
            if (lab) {
                target = lab;
            }
        }
        if (!target) {
            let nuker = _.head(room.structures[STRUCTURE_NUKER]);
            if (nuker && nuker.energy < nuker.energyCapacity && nuker !== exclude) {
                target = nuker;
            }
        }
        if (!target) {
            let containers = room.structures[STRUCTURE_CONTAINER].filter(c=> c !== exclude && c.pos.getRangeTo(room.controller) <= 3 && !room.isHarvestContainer(c) && _.sum(c.store) < 0.5 * c.storeCapacity);
            target = creep.pos.findClosestByRange(containers);
        }
        // creep.log(`findTarget ${target}, resource ${resource}`);
        return target && {target: target, resource: resource};
    }

    accepts(creep) {
        'use strict';
        if (!creep.memory.target || !creep.memory.resource) {
            let targetAndResource = this.findTarget(creep);
            if (targetAndResource) {
                creep.memory.target = targetAndResource.target.id;
                creep.memory.resource = targetAndResource.resource;
            } else {
                return false;
            }
        }
        if (creep.memory.target && creep.memory.resource) {
            let targetObject = Game.getObjectById(creep.memory.target);

            if (targetObject) {
                // creep.log(`delivering ${creep.memory.resource} to ${targetObject}`);
                let transfer = creep.transfer(targetObject, creep.memory.resource);
                if (ERR_NOT_IN_RANGE === transfer) {
                    util.moveTo(creep, targetObject.pos);
                    return true;
                } else if (OK === transfer) {
                    let targetAndResource = this.findTarget(creep, targetObject);
                    if (targetAndResource) {
                        if (targetAndResource) {
                            creep.memory.target = targetAndResource.target.id;
                            creep.memory.resource = targetAndResource.resource;
                            // creep.log('found new target ', targetAndResource.target, creep.pos.getRangeTo(targetAndResource.target), targetObject);
                            if (!creep.pos.isNearTo(targetAndResource.target)) {
                                let moved = util.moveTo(creep, targetAndResource.target.pos);
                                // creep.log('moved ', moved);
                            }
                        }
                    } else {
                        delete creep.memory.target;
                        delete creep.memory.resource;
                    }
                    return true;
                }
            } else {
                creep.log(`WARN : target ${creep.memory.target} not found`);
            }
        }
        delete creep.memory.target;
        delete creep.memory.resource;
        return false;
    }
}
/**
 * load : pickup (RCL >=7 other energyGatherer), mineral(if energy full), energy from storage, energy from terminal, energy from harvestContainers
 */
class FillerLoadStrategy extends BaseStrategy {
    constructor() {
        super();
    }

    clearMemory(creep) {
        delete creep.memory.lTarget;
        delete creep.memory.lResource;
        return super.clearMemory(creep);
    }

    findTarget(creep) {
        'use strict';
        let room = creep.room;
        let target, resource = RESOURCE_ENERGY;
        if (_.get(room, ['controller', 'level'], 0) >= 7) {
            target = PickupManager.getManager(creep.room.name).allocateDrop(creep, undefined, creep=>((drop=> drop.amount - 2 * drop.pos.getRangeTo(creep) > 100)));
            if (target) {
                resource = target.resourceType;
            }
        }
        if (!target && room.energyAvailable === room.energyCapacityAvailable) {
            let containersWithMinerals = (room.structures[STRUCTURE_CONTAINER] || []).find(c=>_.sum(c.store) > (c.store.energy || 0));
            target = creep.pos.findClosestByRange(containersWithMinerals);
            if (target) {
                resource = _.max(_.keys(target.store), min=>target.store[min] || 0);
            }
        }
        if (!target && _.get(room, ['storage', 'store', RESOURCE_ENERGY], 0) > 0) {
            target = room.storage;
            resource = RESOURCE_ENERGY;
        }
        if (!target && _.get(room, ['terminal', 'store', RESOURCE_ENERGY], 0) > 0) {
            target = room.terminal;
            resource = RESOURCE_ENERGY;
        }
        if (!target) {
            let hContainers = room.harvestContainers.filter(c=>(c.store.energy || 0) > 0.5 * c.storeCapacity);
            target = creep.pos.findClosestByRange(hContainers);
            resource = RESOURCE_ENERGY;
        }
        return target && {target: target, resource: resource};
    }

    accepts(creep) {
        'use strict';
        if (!creep.memory.lTarget || !creep.memory.lResource) {
            let targetAndResource = this.findTarget(creep);
            if (targetAndResource) {
                creep.memory.lTarget = targetAndResource.target.id;
                creep.memory.lResource = targetAndResource.resource;
            } else {
                creep.log('no load target');
                return false;
            }
        }
        if (creep.memory.lTarget && creep.memory.lResource) {
            let targetObject = Game.getObjectById(creep.memory.lTarget);
            if (targetObject) {
                // creep.log(`delivering ${creep.memory.resource} to ${targetObject}`);
                let result;
                if (targetObject.amount) {
                    result = creep.pickup(targetObject);
                } else {
                    result = creep.withdraw(targetObject, creep.memory.lResource);
                }
                if (ERR_NOT_IN_RANGE === result) {
                    util.moveTo(creep, targetObject.pos);
                    return true;
                } else if (OK === result) {
                    delete creep.memory.lTarget;
                    delete creep.memory.lResource;
                    return true;
                }
            } else {
                creep.log(`WARN : target ${creep.memory.lTarget} not found`);
            }
        }
        delete creep.memory.lTarget;
        delete creep.memory.lResource;
        return false;
    }
}


class RoleEnergyFiller extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new FillerLoadStrategy(),
            new WaitStrategy(10)
        ];
        this.unloadStrategies = [
            new FillerDropStrategy(),
            new WaitStrategy(10),
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }


    run(creep) {
        let ret = super.run(creep);
        return ret;
    }
}
require('./profiler').registerClass(RoleEnergyFiller, 'RoleEnergyFiller');
require('./profiler').registerClass(FillerDropStrategy, 'FillerDropStrategy');
require('./profiler').registerClass(FillerLoadStrategy, 'FillerLoadStrategy');

module.exports = RoleEnergyFiller;
