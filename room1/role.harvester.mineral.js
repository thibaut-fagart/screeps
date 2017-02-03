var _ = require('lodash');
var util = require('./util');

/**
 * harvests the mineral. will transfer to any nearby container if has a CARRY.
 */
class RoleMineralHarvester {
    constructor() {
    }

    run(creep) {
        let hostiles = creep.room.glanceForAround(LOOK_CREEPS, creep.pos, 5, true).map(l=>l.creep).filter(c=>!c.my);
        if (hostiles.length) {
            let pathAndCost = PathFinder.search(creep.pos, hostiles.map(c=>({pos: c.pos, range: 10})), {
                flee: true,
                maxRooms: 1
            });
            let path = pathAndCost.path;
            creep.move(creep.pos.getDirectionTo(path[0]));
            return;
        }
        let mineral = _.head(creep.room.find(FIND_MINERALS));
        let container = this.getContainer(creep, mineral);
        if (!creep.memory.inplace) {
            let pos = this.getHarvestPos(creep, container, mineral);
            if (pos && pos.isEqualTo(creep.pos)) {
                creep.memory.inplace = true;
            } else if (pos) {
                if (creep.pos.getRangeTo(pos) < 2) {
                    if (!creep.room.isValidParkingPos(creep, pos)) {
                        delete creep.memory.harvestFrom;
                        let newpos = this.getHarvestPos(creep, container, mineral);
                        pos = newpos ? newpos : pos;
                    }
                }
                util.moveTo(creep, pos, undefined, {range: 0});
            } else {
                creep.log('no parking pos near mineral ? ');
                if (creep.pos.getRangeTo(mineral)>2) {
                    util.moveTo(creep, mineral.pos, undefined, {range: 1});
                } else {
                    util.moveTo(creep, mineral.pos, undefined, {range: 1, ignoreCreeps: false});
                }
            }
        }
        if (creep.memory.inplace) {
            let currentCarry = _.sum(creep.carry);
            let freeContainerCapacity = container && container.storeCapacity - _.sum(container.store);
            if (container && freeContainerCapacity < currentCarry) {
                return;
            }
            // creep.log(`currentCarry ${currentCarry}, container ${container}, freeContainerCapacity ${freeContainerCapacity}`);
            if (currentCarry > 0 && container) {
                creep.transfer(container, _.keys(creep.carry).find(r=>creep.carry[r]));
            }
            let drops = creep.pos.lookFor(LOOK_RESOURCES);
            if (creep.carryCapacity > currentCarry && drops.length) {
                let drop = _.head(drops);
                creep.withdraw(drop, drop.resourceType);
            }
            // creep.log('drop', JSON.stringify(drops));
            if (drops && drops.length && _.sum(drops, d=>d.amount) >= 2000) {
                return;
            }
            let harvest = creep.harvest(mineral);
            if (ERR_NOT_ENOUGH_RESOURCES === harvest) {
                // Game.notify(`${Game.time} ${creep.room.name} ${creep.name} resigning, mineral depleted`);
                creep.log('resigning, mineral depleted');
                creep.memory.role = 'recycle';
            } else if (ERR_NOT_IN_RANGE === harvest) {
                creep.memory.inplace = false;
            }
        }
    }

    getHarvestPos(creep, container, mineral) {
        if (!creep.memory.harvestFrom) {
            let constraints = container ? [{
                pos: container.pos,
                range: 1
            }, {pos: mineral.pos, range: 1}] : [{pos: mineral.pos, range: 1}];
            let positions= creep.room.findValidParkingPositions(creep, constraints);
            // creep.log('harvest positions ', JSON.stringify(constraints),JSON.stringify(positions));
            let position = creep.pos.findClosestByRange(positions);
            if (position) {
                creep.memory.harvestFrom = util.posToString(position);
                return position;
            }
        }
        if (creep.memory.harvestFrom) {
            return util.posFromString(creep.memory.harvestFrom, creep.room.name);
        }

    }

    getContainer(creep, mineral) {
        let containerid = creep.memory.container;
        let container = containerid ? Game.getObjectById(containerid) : undefined;
        if (!container ) {
            container = creep.room.glanceForAround(LOOK_STRUCTURES, mineral.pos, 2, true).map(l=>l.structure).find(s=>s.structureType === STRUCTURE_CONTAINER);
        }
        if (container) {
            creep.memory.container = container.id;
            return container;
        } else {
            delete creep.memory.container;
            return undefined;
        }
    }

}
require('./profiler').registerClass(RoleMineralHarvester, 'RoleMineralHarvester');
module.exports = RoleMineralHarvester;