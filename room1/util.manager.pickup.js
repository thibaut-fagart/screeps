var _ = require('lodash');
var util = require('./util');
/**
 * state : dropid=> {creepid:amount}
 * allocates pickups based on previous pickups and distance
 *
 * pickupManager : {
 *   dropid: {
 *     creepid : amount,
 *   }
 * }
 */
class PickupManager {

    constructor(room) {
        PickupManager.managers[room.name] = this;
        this.roomName = room.name;
        room.memory.pickupManager = room.memory.pickupManager || {};
        // discard outdated reservations
        this.updateState(room);
    }

    log() {
        console.log([this.constructor.name, this.roomName].concat(Array.prototype.slice.call(arguments)));
    }

    /**
     *
     * @param {Room} room
     */
    updateState(room) {
        if (!room.memory.pickupManager) room.memory.pickupManager = {};
        if (Game.time !== room.memory.pickupManager.tick) {
            // let start = Game.cpu.getUsed();
            // this.log('updating state', Game.time,room.memory.pickupManager.tick);
            this.state = room.memory.pickupManager.state || {};
            room.memory.pickupManager.state = this.state;

            this.freeDropAmounts = {};
            _.keys(this.state).forEach((dropid)=> {
                let drop = Game.getObjectById(dropid);
                if (!drop) {
                    // this.log('deleting ', dropid);
                    delete this.state[dropid];
                } else {
                    _.keys(this.state[dropid]).forEach((creepId)=> {
                        // this.log('creepId', creepId);
                        let creep = Game.getObjectById(creepId);
                        // creep.log('pickupManager, drop?',creep.memory[PickupManager.PATH], dropid);
                        if (!creep) {
                            // this.log('creep dead', creepId);
                            delete this.state[dropid][creepId];
                        } else if (dropid !== creep.memory[PickupManager.PATH]) {
                            // this.log('creep gave up on ',creep.name,  dropid);
                            delete this.state[dropid][creepId];
                        }
                    });
                    this.freeDropAmounts[dropid] = drop.amount - _.sum(this.state[dropid]);
                }
                // this.log('updateState took', Game.cpu.getUsed() - start);
            });
            room.memory.pickupManager.tick = Game.time;
        }
    }

    findDrops(creep) {
        // creep.log('findDrops',this.resource)
        return creep.room.find(FIND_DROPPED_RESOURCES, {filter: (e)=> (!this.resource || this.resource == e.resourceType) && (e.amount > Math.max(20, creep.pos.getRangeTo(e.pos)))});
    }

    typeMatches(drop, resourceType, predicate) {
        return ((!resourceType) || resourceType == drop.resourceType || (resourceType === util.ANY_MINERAL && drop.resourceType !== RESOURCE_ENERGY))
            && predicate(drop);
    }

    /**
     *
     * @param {Creep} creep
     * @param {PickupManager.ANY_MINERAL|*}resourceType
     * @param {Function} predicate (creep)=> ((drop)=> whatever)
     * @returns {Resource|undefined}
     */
    allocateDrop(creep, resourceType, predicate) {
        let allMatchingDrops = creep.room.find(FIND_DROPPED_RESOURCES, {filter: (drop)=> drop.amount > 50 && (this.typeMatches(drop, resourceType, predicate))});
        if (allMatchingDrops.length) {
            let freeCapacity = creep.carryCapacity - _.sum(creep.carry);
            let sortedDrops = _.sortBy(allMatchingDrops, (d) => (Math.min(this.freeAmount(d), freeCapacity) - 5 * creep.pos.getRangeTo(d)) * -1);

            let chosen = sortedDrops[0];
            if (!this.state) {
                this.updateState(Game.rooms[this.roomName]);
            }
            this.state[chosen.id] = this.state[chosen.id] || {};
            this.state[chosen.id][creep.id] = Math.min(freeCapacity, chosen.amount);
            this.freeDropAmounts[chosen.id] = this.freeDropAmounts[chosen.id] - freeCapacity;
            return chosen;
        }
    }
    releaseDrop(creep, dropid) {
        if (!this.state) return;
        let state = this.state[dropid];
        if (state) {
            delete state[creep.id];
        }
    }
    freeAmount(drop) {
        // console.log(JSON.stringify('freeDropAmounts', this.freeDropAmounts), this.freeDropAmounts[drop.id], this.freeDropAmounts[drop.id] || drop.amount);
        if (!this.freeDropAmounts) {
            this.freeDropAmounts = {};
        }
        this.freeDropAmounts[drop.id] = this.freeDropAmounts[drop.id] || drop.amount;
        return this.freeDropAmounts[drop.id];
    }
}

PickupManager
    .managers = {};
PickupManager.getManager = function (roomName) {
    'use strict';
    let room = ('string' === typeof roomName) ? Game.rooms[roomName] : roomName;
    if (!PickupManager.managers[roomName]) {
        // console.log('new PickupManager', roomName);
        PickupManager.managers[roomName] = new PickupManager(room);
    }
    let manager = PickupManager.managers[roomName];
    manager.updateState(room);
    return manager;
};
PickupManager.PATH = 'pickupSource'; //TODO remote that from PickupStrategy
module.exports = PickupManager;