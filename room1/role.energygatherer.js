var _ = require('lodash');
var RoleCarry = require('./role.carry');
var util = require('./util');
var WaitStrategy = require('./strategy.wait');
var BaseStrategy = require('./strategy.base');

class GathererDropStrategy extends BaseStrategy {
    constructor() {
        super();
    }

    findTarget(creep, exclude) {
        'use strict';
        let room = creep.room;
        let target, resource = RESOURCE_ENERGY;
        if (creep.carry.energy && room.energyAvailable < room.energyCapacityAvailable) {
            let spawnAndExtensions = room.structures[STRUCTURE_SPAWN].filter(s=>s.energy < s.energyCapacity && s !== exclude).concat(room.structures[STRUCTURE_EXTENSION].filter(s=>s.energy < s.energyCapacity && s !== exclude));
            target = creep.pos.findClosestByRange(spawnAndExtensions);
        } else if (!_.sum(creep.carry) !== creep.carry.energy && room.storage) {
            target = room.storage;
            resource = _.max(_.keys(creep.carry), k=>creep.carry[k]);
        }
        if (!target) {
            target = room.storage;
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
                            // creep.log('found new target ', targetAndResource.target,creep.pos.getRangeTo(targetAndResource.target),targetObject);
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

class GathererLoadStrategy extends BaseStrategy {
    constructor() {
        super();
    }

    findTarget(creep) {
        'use strict';
        let room = creep.room;
        let target, resource = RESOURCE_ENERGY;
        let drops = creep.room.glanceForAround(LOOK_RESOURCES, creep.pos, 2, true).map(l=>l.resource);
        target = creep.pos.findClosestByRange(drops);
        if (target) {
            resource = target.resourceType;
        }
        if (!target) {
            let drops = creep.room.find(FIND_DROPPED_RESOURCES);

            let target = creep.pos.findClosestByRange(drops);
            // PickupManager.getManager(creep.room.name).allocateDrop(creep, undefined, creep=>((drop=> drop.amount - 2 * drop.pos.getRangeTo(creep) > 100)));
            if (target) {
                resource = target.resourceType;
            }
        }
        if (!target) {
            let containers = (room.harvestContainers).filter(c=>_.sum(c.store) > 0.5 * c.storeCapacity);
            target = creep.pos.findClosestByRange(containers);
            if (target) {
                resource = _.max(_.keys(target.store), min=>target.store[min] || 0);
            }
        }
        if (!target && room.energyAvailable < 0.8 * room.energyCapacityAvailable && _.get(room, ['storage', 'store', RESOURCE_ENERGY], 0) > 0) {
            target = room.storage;
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
                let withdraw;
                if (targetObject.amount) {
                    withdraw = creep.pickup(targetObject);
                } else { // creep.log(`delivering ${creep.memory.resource} to ${targetObject}`);
                    withdraw = creep.withdraw(targetObject, creep.memory.lResource);
                }
                if (ERR_NOT_IN_RANGE === withdraw) {
                    util.moveTo(creep, targetObject.pos);
                    return true;
                } else if (OK === withdraw) {
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


class RoleEnergyGatherer extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new GathererLoadStrategy(),
            new WaitStrategy(10)
        ];

        this.unloadStrategies = [
            new GathererDropStrategy(),
            new WaitStrategy(10)
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);

    }

    run(creep) {
        return super.run(creep);
    }
}
require('./profiler').registerClass(RoleEnergyGatherer, 'RoleEnergyGatherer');
require('./profiler').registerClass(GathererDropStrategy, 'GathererDropStrategy');
require('./profiler').registerClass(GathererLoadStrategy, 'GathererLoadStrategy');

module.exports = RoleEnergyGatherer;
