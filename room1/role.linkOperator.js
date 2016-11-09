var _ = require('lodash');
var util = require('./util');

class RoleLinkOperator {
    constructor() {
    }


    /**
     * if the link is near controller takes from the link and unloads into the container
     * else if link cooldown >0 takes from container and unloads into link otherwise from link to container
     * @param {Creep} creep
     **/
    run(creep) {
        let link = this.getLink(creep);

        let isStorageLink = creep.room.storage && link.pos.getRangeTo(creep.room.storage) <= 2;
        let isControllerLink = link.pos.getRangeTo(creep.room.controller) < 5;
        let drops = creep.room.glanceForAround(LOOK_RESOURCES, creep.pos, 1, true).map(d=>d.resource).filter(d=>d.resourceType === RESOURCE_ENERGY);

        // let drops = creep.pos.findInRange(FIND_DROPPED_ENERGY, 1);
        let creepCarry = _.sum(creep.carry);
        if (drops.length && creepCarry < creep.carryCapacity) {
            creep.pickup(_.head(drops));
            return;
        }
        let container = this.getContainer(creep);
        let freeContainerCapacity = container ? container.storeCapacity - _.sum(container.store) : 0;
        if (creepCarry - creep.carry.energy > 0) {
            if (freeContainerCapacity) {
                creep.transfer(container, _.keys(creep.carry).find(min=>min !== RESOURCE_ENERGY));
                return;
            } else {
                creep.drop(_.keys(creep.carry).find(min=>min !== RESOURCE_ENERGY));
            }
        }
        let fillLink = true;
        if (isStorageLink) {
            let controllerLink = creep.room.glanceForAround(LOOK_STRUCTURES, creep.room.controller.pos, 5, true).map(s=>s.structure).find(s=>s.structureType === STRUCTURE_LINK && s !== link);
            if (controllerLink) {
                fillLink = (controllerLink.energy || 0) === 0;
                // creep.log(`controller link ${controllerLink} energy ${controllerLink.energy} , shouldFill ?${fillLink} `);
            }
        }
        this.getInPosition(creep, link, container);
        // creep.log(`controller ? ${isControllerLink}, storage? ${isStorageLink}, link ${link}, fillLink ${fillLink}`);
        if (isControllerLink || isStorageLink && !fillLink) {
            // creep.log('keeping link empty');
            // keep link empty
            if (container) {
                // creep.log(`creepCarry ${creepCarry} , freeContainerCapacity ${freeContainerCapacity}`);
                if (creep.ticksToLive <= 2) {
                    let freeContainerStore = container.storeCapacity - _.sum(container.store);
                    let freeLinkSpace = link.energyCapacity - link.energy;
                    let target;
                    if (freeContainerStore >= creepCarry) {
                        target = container;
                    } else if (freeLinkSpace >= creepCarry) {
                        target = link;
                    } else {
                        target = freeContainerStore > freeLinkSpace ? container : link;
                    }
                    creep.transfer(target, RESOURCE_ENERGY);
                } else if ((creepCarry === creep.carryCapacity && freeContainerCapacity > 0)) {
                    creep.transfer(container, RESOURCE_ENERGY);
                } else if ((creepCarry === creep.carryCapacity && creep.memory.near_storage)) {
                    creep.transfer(creep.room.storage, RESOURCE_ENERGY);
                } else if (creep.ticksToLive > 1 && creepCarry < creep.carryCapacity && link.energy) {
                    creep.withdraw(link, RESOURCE_ENERGY);
                } else if (creep.ticksToLive > 1 && creepCarry < creep.carryCapacity && isControllerLink && isStorageLink && freeContainerCapacity > 0) {
                    creep.withdraw(creep.room.storage, RESOURCE_ENERGY);
                } else if (container.store && container.store.energy < 500 && creepCarry > 0) {
                    creep.transfer(container, RESOURCE_ENERGY);
                }

            }
        } else {
            // keep link full
            if (container) {

                // creep.log('fillingLink operator', creepCarry, container.store.energy, link.energy);
                if ((creepCarry > 0 && link.energy < link.energyCapacity)) {
                    creep.transfer(link, RESOURCE_ENERGY);
                } else if (creepCarry < creep.carryCapacity && container.store && container.store.energy > 0) {
                    creep.withdraw(container, RESOURCE_ENERGY);
                }
            }

        }
    }

    onNoUnloadStrategy(creep) {
        this.regroupStrategy.accepts(creep);
    }

    /**
     *
     * @param {Creep} creep
     * @param {StructureLink} link
     * @param {StructureContainer|StructureStorage} container
     */
    getInPosition(creep, link, container) {
        let pos;
        let isNearStorage = container !== container.room.storage && link.pos.getRangeTo(container.room.storage) <= 2;
        if (!container && creep.pos.getRangeTo(link.pos) > 1) {
            util.moveTo(creep, link.pos, this.constructor.name);
        } else if (!creep.memory.operateFrom) {
            let constraints = [{pos: container.pos, range: 1}, {pos: link.pos, range: 1}];
            if (isNearStorage) {
                constraints.push({pos: creep.room.storage.pos, range: 1});
            }
            let candidates = creep.room.findValidParkingPositions(creep, constraints);
            // let area = creep.room.glanceAround(link.pos, 1);
            // let candidates = util.findWalkableTiles(creep.room, area);
            // candidates = candidates.filter(pos=>pos.getRangeTo(container) === 1 && creep.room.isValidParkingPos(creep, pos));

            if (candidates.length > 0) {
                pos = candidates[0];
                creep.memory.operateFrom = util.posToString(pos);
            }
        } else {
            pos = util.posFromString(creep.memory.operateFrom, creep.room.name);
        }
        if (pos && !pos.isEqualTo(creep.pos)) {
            // creep.log('moving in position', pos);
            util.moveTo(creep, pos, this.constructor.name, {range: 0});
        }

    }

    getLink(creep) {
        if (!creep.memory.link) {
            // let links = creep.room.controller.pos.findInRange(FIND_STRUCTURES, 5)
            let links = creep.room.glanceForAround(LOOK_STRUCTURES, creep.room.controller.pos, 5, true).map(d=>d.structure)
                .filter(s=>s.structureType === STRUCTURE_LINK && !s.operator);
            // creep.log('found links', links.length, links[0]);
            if (links.length) {
                creep.memory.link = links[0].id;
                links[0].operator = creep;
            } else {
                creep.log('no link near controller');
            }
        }
        let link = Game.getObjectById(creep.memory.link);
        if (!link) {
            delete creep.memory.link;
        }
        link.operator = creep;
        return link;
    }

    getContainer(creep) {
        if (!creep.memory.container) {
            let link = this.getLink(creep);
            let containers = creep.room.glanceForAround(LOOK_STRUCTURES, link.pos, 2, true)
                .map(d=>d.structure)
                .filter(s=>s.structureType === STRUCTURE_CONTAINER);
            let rangeToStorage = link.pos.getRangeTo(link.room.storage);
            if (!containers.length && rangeToStorage <= 2) {
                containers = [link.room.storage];
            }
            creep.memory.near_storage = rangeToStorage <= 2;
            // creep.log('found containers', containers.length, containers[0], link);
            if (containers.length) {
                creep.memory.container = containers[0].id;
            } else {
                creep.log('no container near link');
            }
        }
        let container = Game.getObjectById(creep.memory.container);
        if (!container) {
            delete creep.memory.container;
            container = undefined;
        }
        return container;
    }
}
require('./profiler').registerClass(RoleLinkOperator, 'RoleLinkOperator');
module.exports = RoleLinkOperator;
