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
        let drops = creep.pos.findInRange(FIND_DROPPED_ENERGY, 1);
        let creepCarry = _.sum(creep.carry);
        if (drops.length && creepCarry < creep.carryCapacity) {
            creep.pickup(drops[0]);
            return;
        }
        // creep.log(`controller ? ${isControllerLink}, storage? ${isStorageLink}, link ${link}`);
        if (isControllerLink/*|| isStorageLink*/) {
            // keep link empty
            let container = isControllerLink ? this.getContainer(creep) : creep.room.storage;
            this.getInPosition(creep, link, container);
            if (container) {
                let containerStore = _.sum(container.store);
                let myStore = creepCarry;
                if (creep.ticksToLive <= 2) {
                    let freeContainerStore = container.storeCapacity - _.sum(container.store);
                    let freeLinkSpace = link.energyCapacity - link.energy;
                    let target;
                    if (freeContainerStore >= creepCarry) {
                        target = container;
                    } else if (freeLinkSpace >= creepCarry) {
                        target = link;
                    } else {
                        target = freeContainerStore> freeLinkSpace?container:link;
                    }
                    creep.transfer(target, RESOURCE_ENERGY);
                } else if ((myStore === creep.carryCapacity && containerStore < container.storeCapacity)) {
                    creep.transfer(container, RESOURCE_ENERGY);
                } else if (creep.ticksToLive > 1 && myStore < creep.carryCapacity && link.energy) {
                    creep.withdraw(link, RESOURCE_ENERGY);
                } else if (container.store && container.store.energy < 500 && myStore > 0) {
                    creep.transfer(container, RESOURCE_ENERGY);
                }

            }
        } else {
            // keep link full
            let container = this.getContainer(creep);
            this.getInPosition(creep, link, container);
            if (container) {
                let myStore = creepCarry;
                // creep.log('fillingLink operator', myStore, container.store.energy, link.energy);
                if ((myStore > 0 && link.energy < link.energyCapacity)) {
                    creep.transfer(link, RESOURCE_ENERGY);
                } else if (myStore < creep.carryCapacity && container.store && container.store.energy > 0) {
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
        if (!container && creep.pos.getRangeTo(link.pos) > 1) {
            util.moveTo(creep, link.pos, this.constructor.name);
        } else if (!creep.memory.operateFrom) {
            let area = creep.room.glanceAround(link.pos, 1);
            let candidates = util.findWalkableTiles(creep.room, area);
            candidates = candidates.filter(pos=>pos.getRangeTo(container) === 1 && creep.room.isValidParkingPos(creep, pos));

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
            let links = creep.room.controller.pos.findInRange(FIND_STRUCTURES, 5).filter(s=>s.structureType === STRUCTURE_LINK && !s.operator);
            creep.log('found links', links.length, links[0]);
            if (links.length) {
                creep.memory.link = links[0].id;
                links[0].operator = creep;
            } else {
                creep.log('no link near controller');
            }
        }
        let link = Game.getObjectById(creep.memory.link);
        link.operator = creep;
        return link;
    }

    getContainer(creep) {
        if (!creep.memory.container) {
            let link = this.getLink(creep);
            let containers = link.pos.findInRange(FIND_STRUCTURES, 2, {filter: s=>s.structureType===STRUCTURE_CONTAINER || s.structureType===STRUCTURE_STORAGE});
            creep.log('found containers', containers.length, containers[0], link);
            if (containers.length) {
                creep.memory.container = containers[0].id;
            } else {
                creep.log('no container near link');
            }
        }
        return Game.getObjectById(creep.memory.container);
    }
}

module.exports = RoleLinkOperator;
