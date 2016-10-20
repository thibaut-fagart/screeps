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
        if (creep.carry.energy == 0) {
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
        } else if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.action ='upgrade';
        }
        if (creep.room.controller.level < 8  && creep.seekBoosts(WORK, ['XGH2O', 'GH2O', 'GH'])) return;
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
            creep.memory.workParts = creep.memory.workParts || creep.getActiveBodyparts(WORK);
            let upgradePos = this.findUpgradePos(creep);
            if (upgradePos && !upgradePos.isEqualTo(creep.pos)) {
                // creep.upgradeController(creep.room.controller);
                util.moveTo(creep, upgradePos, this.constructor.name + 'Path', {range: 0});
            } else {
                if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.log('unexpected, moving');
                    if (!upgradePos) {
                        util.moveTo(creep, creep.room.controller.pos, this.constructor.name + 'Path', {range: 3});
                    }
                }
                if (creep.carry.energy < creep.memory.workParts) {
                    creep.withdraw(this.getContainer(creep), RESOURCE_ENERGY);
                }

            }
            if (creep.carry.energy == 0) {
                creep.memory.action = this.ACTION_FILL;
            }
        }
        return false;
    }

    getContainer(creep) {
        if (!creep.memory.containerId) {
            let nearbyContainersAndLinks = creep.room.glanceForAround(LOOK_STRUCTURES, creep.room.controller.pos, 4, true).map(s=>s.structure).filter(s=>s.storeCapacity || s.energyCapacity);
            if (nearbyContainersAndLinks.length) {
                let nearbyContainers = nearbyContainersAndLinks.filter(s=>s.store && !s.send);
                if (nearbyContainers.length) {
                    let container = nearbyContainers[0];
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
            let container = this.getContainer(creep);
            let near = [{pos: creep.room.controller.pos, range: 3}];
            if (container) {
                near.push({pos: container.pos, range: 1});
            }
            let position;
            let positions = creep.room.findValidParkingPositions(creep,near);
            if (positions.length) {
                // creep.log('finding closest of ', JSON.stringify(positions), JSON.stringify(positions.map(p=>p instanceof RoomPosition)));
                position = creep.pos.findClosestByPath(positions);
            } else {
                creep.log('no upgrade position near container');
                positions = creep.room.findValidParkingPositions(creep, [{pos: creep.room.controller.pos, range: 3}]);
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
            // creep.log('upgrading from '+creep.memory.upgradeFrom);
            if (position) {
                creep.memory.upgradeFrom = util.posToString(position);
            }
        }
        // creep.log('upgrading from '+creep.memory.upgradeFrom);
        return creep.memory.upgradeFrom?util.posFromString(creep.memory.upgradeFrom, creep.room.name):false;
    }
}

require('./profiler').registerClass(RoleUpgrader, 'RoleUpgrader'); module.exports = RoleUpgrader;