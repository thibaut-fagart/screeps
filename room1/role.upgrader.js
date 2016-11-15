var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');

class RoleUpgrader {
    constructor() {
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (creep)=> ((s)=>s.pos.getRangeTo(creep) < 2)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (creep)=> ((s)=>s.pos.getRangeTo(creep) < 5)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined),
            new PickupStrategy(RESOURCE_ENERGY)/*,
             new HarvestEnergySourceStrategy()*/];
        this.ACTION_FILL = 'fill';
        util.indexStrategies(this.loadStrategies);
    }

    /** @param {Creep} creep **/
    run(creep) {
        if (creep.carry.energy == 0 && undefined === creep.memory.wait && !creep.memory.inplace) {
            let container = this.getControllerContainer(creep);
            if (!container || container.store.energy === 0 || container.pos.getRangeTo(creep) <= 1) {
                creep.memory.action = this.ACTION_FILL;
                delete creep.memory.source;
            }
        } else if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.action = 'upgrade';
        }
        if (creep.room.controller.level < 8 && creep.seekBoosts(WORK, ['XGH2O', 'GH2O', 'GH'])) return;
        if (creep.memory.action == this.ACTION_FILL) {
            delete creep.memory.upgradeFrom;
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            } else {
                creep.log('no loadStrategy');
                return;
            }

        } else {
            if (creep.carry.energy > 0) {
                delete creep.memory.wait;
            }
            creep.memory.workParts = creep.memory.workParts || creep.getActiveBodyparts(WORK);
            let upgradePos = this.findUpgradePos(creep);
            let upgraded = creep.upgradeController(creep.room.controller);
            creep.memory.inplace = upgradePos && !upgradePos.isEqualTo(creep.pos);
            if (creep.memory.inplace) {
                // creep.upgradeController(creep.room.controller);
                util.moveTo(creep, upgradePos, this.constructor.name + 'Path', {range: 0});
            } else if (upgraded == ERR_NOT_IN_RANGE && !upgradePos) {
                creep.log('unexpected, moving');
                util.moveTo(creep, creep.room.controller.pos, this.constructor.name + 'Path', {range: 3});
            } else if (upgraded !== OK) {
                creep.log('unexpected upgradeController : ', upgraded);
            }
            if (creep.carry.energy < creep.memory.workParts) {
                creep.withdraw(this.getControllerContainer(creep), RESOURCE_ENERGY);
            }
            if (creep.carry.energy == 0 && creep.memory.inplace) {
                creep.memory.wait = (creep.memory.wait || 0) + 1;
                if (creep.memory.wait > 10) {
                    Game.notify(`${Game.time} ${creep.name} giving up waiting`);
                    creep.memory.action = this.ACTION_FILL;
                }
            } else if (creep.carry.energy == creep.memory.workParts && creep.memory.inplace) {
                creep.memory.wait = 0;
            }
        }
        return false;
    }

    getControllerContainer(creep) {
        if (!creep.memory.containerId) {
            let nearbyContainersAndLinks = creep.room.glanceForAround(LOOK_STRUCTURES, creep.room.controller.pos, 4, true).map(s=>s.structure).filter(s=>s.storeCapacity || s.energyCapacity);
            if (nearbyContainersAndLinks.length) {
                let nearbyContainers = nearbyContainersAndLinks.filter(s=>s.store && !s.send);
                if (nearbyContainers.length) {
                    let container = creep.room.controller.pos.findClosestByRange(nearbyContainers);
                    creep.memory.containerId = container.id;
                } else {
                    creep.memory.containerId = nearbyContainersAndLinks[0].id;
                }
            }
        }
        return Game.getObjectById(creep.memory.containerId);
    }

    /**
     *
     * @param {Creep| {pos}} creep
     * @returns {RoomPosition}
     */
    findUpgradePos(creep) {

        if (creep.memory.upgradeFrom) {
            let pos = util.posFromString(creep.memory.upgradeFrom, creep.room.name);
            let creepAtPos = pos.lookFor(LOOK_CREEPS).filter(c=>c.name !== creep.name);
            // creep.log('creepAtPos', JSON.stringify(creepAtPos));
            if (creepAtPos.length) {
                // creep.log('conflict',creepAtPos[0].name);
                delete creep.memory.upgradeFrom;
            }
        }
        if (!creep.memory.upgradeFrom) {
            let container = this.getControllerContainer(creep);
            let position;
            if (creep.room.isValidParkingPos(creep) && creep.pos.getRangeTo(creep.room.controller) <= 3) {
                position = creep.pos;
            } else {
                let near = [{pos: creep.room.controller.pos, range: 3}];
                if (container) {
                    near.push({pos: container.pos, range: 1});
                }
                let positions = creep.room.findValidParkingPositions(creep, near);
                if (positions.length) {
                    // creep.log('finding closest of ', JSON.stringify(positions), JSON.stringify(positions.map(p=>p instanceof RoomPosition)));
                    position = creep.pos.findClosestByPath(positions);
                } else {
                    creep.log('no upgrade position near container');
                    positions = creep.room.findValidParkingPositions(creep, [{
                        pos: creep.room.controller.pos,
                        range: 3
                    }]);
                    if (positions.length) {
                        position = creep.pos.findClosestByPath(positions);
                    } else {
                        let area = creep.room.glanceAround(creep.room.controller.pos, 3);
                        let walkable = util.findWalkableTiles(creep.room, area);
                        if (walkable.length) {
                            position = creep.pos.findClosestByPath(walkable);
                        }
                    }
                }
            }

            // creep.log('upgrading from '+creep.memory.upgradeFrom);
            if (position) {
                creep.memory.upgradeFrom = util.posToString(position);
            }
        }
        // creep.log('upgrading from '+creep.memory.upgradeFrom);
        return creep.memory.upgradeFrom ? util.posFromString(creep.memory.upgradeFrom, creep.room.name) : false;
    }
}

require('./profiler').registerClass(RoleUpgrader, 'RoleUpgrader');
module.exports = RoleUpgrader;