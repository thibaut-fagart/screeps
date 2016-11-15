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
        let isControllerLink = link.pos.getRangeTo(creep.room.controller) <= 5;
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
        if (container) {
            this.getInPosition(creep, link, container);
        } else {
            creep.log('ERROR : no container !!');
        }
        // creep.log(`controller ? ${isControllerLink}, storage? ${isStorageLink}, link ${link}, fillLink ${fillLink}`);
        if (isControllerLink || isStorageLink && !fillLink) {
            // creep.log('keeping link empty');
            // keep link empty
            if (container) {
                // creep.log(`creepCarry ${creepCarry} , link.energy ${link.energy}, freeContainerCapacity ${freeContainerCapacity}`);
                if ((creepCarry > 0 && freeContainerCapacity > 0)) {
                    creep.transfer(container, RESOURCE_ENERGY);
                } else if ((creepCarry > 0 && creep.memory.near_storage)) {
                    creep.transfer(creep.room.storage, RESOURCE_ENERGY);
                } else if (creep.ticksToLive > 1 && link.energy && (0 < freeContainerCapacity || isStorageLink)) {
                    creep.withdraw(link, RESOURCE_ENERGY, Math.min(link.energy, freeContainerCapacity, creep.carryCapacity - creepCarry));
                } else if (creep.ticksToLive > 1 && isControllerLink && isStorageLink && creep.room.storage.energy && 0 < freeContainerCapacity) {
                    creep.withdraw(creep.room.storage, RESOURCE_ENERGY, Math.min(creep.room.storage.energy, freeContainerCapacity, creep.carryCapacity - creepCarry));
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
                } else if (creepCarry < creep.carryCapacity && container.store && container.store.energy > 0 && link.energy < link.energyCapacity) {
                    creep.withdraw(container, RESOURCE_ENERGY, Math.min(link.energyCapacity - link.energy, creep.carryCapacity - creepCarry, container.store.energy));
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
        if (link.operator !== creep) {
            link.operator = creep;
        }
        if (!link) {
            delete creep.memory.link;
        }
        link.operator = creep;
        return link;
    }

    getContainer(creep) {
        if (!creep.memory.container) {
            let link = this.getLink(creep);
            let container = link.container;
            let rangeToStorage = link.pos.getRangeTo(link.room.storage);
            creep.memory.near_storage = rangeToStorage <= 2;
            // creep.log('found containers', containers.length, containers[0], link);
            if (container) {
                creep.memory.container = container.id;
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
