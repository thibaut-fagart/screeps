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
        room.memory.pickupManager.freeDropAmounts = this.freeDropAmounts = room.memory.pickupManager.freeDropAmounts || {};
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

            let dropIds = room.find(FIND_DROPPED_RESOURCES).map((d)=>d.id);
            dropIds.forEach((dropid)=> {
                let drop = Game.getObjectById(dropid);
                if (!drop) {
                    // this.log('deleting ', dropid);
                    delete this.state[dropid];
                } else {
                    this.state[dropid] = this.state[dropid] || {};
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
            _.keys(room.memory.pickupManager.state).forEach((id)=> {
                if (!Game.getObjectById(id)) {
                    delete room.memory.pickupManager.state[id];
                }
            });
            _.keys(this.freeDropAmounts).forEach((id)=> {
                if (!Game.getObjectById(id)) {
                    delete room.memory.pickupManager.state[id];
                }
            });
            room.memory.pickupManager.tick = Game.time;
        }
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
        let map = _.keys(this.freeDropAmounts).map((id)=>Game.getObjectById(id)).filter((d)=>!!d);
        // creep.log('pickupManager', 'all', map.length);
        map = map.filter((drop)=>this.freeAmount(drop.id) > 0);
        // creep.log('pickupManager', 'available', map.length);
        let availableDrops = map
            .filter((drop)=> /*drop.amount > 50 && */(this.typeMatches(drop, resourceType, predicate(creep))));
        // creep.log('typeMatches', resourceType, availableDrops.length);
        if (availableDrops.length) {
            let freeCapacity = creep.carryCapacity - _.sum(creep.carry);
            let sortedDrops = _.sortBy(availableDrops, (d) => (Math.min(this.freeAmount(d), freeCapacity)) * -1 + 4 * creep.pos.getRangeTo(d));

            let chosen = sortedDrops[0];
            // creep.log('chosen', chosen);
            if (!this.state) {
                this.updateState(Game.rooms[this.roomName]);
            }
            this.state[chosen.id] = this.state[chosen.id] || {};
            this.state[chosen.id][creep.id] = Math.min(freeCapacity, chosen.amount);
            this.freeAmount[chosen.id] = this.freeAmount(chosen.id) - freeCapacity;
            // creep.log('allocateDrop', JSON.stringify(chosen.pos), chosen.amount, freeCapacity, this.freeAmount(chosen.id));
            return chosen;
        }
    }

    releaseDrop(creep, dropid) {
        if (!this.state) return;
        let state = this.state[dropid];
        if (state) {
            // creep.log('releaseDrop');
            delete state[creep.id];
        }
    }

    /**
     *
     * @param {string} dropid
     * @returns {*}
     */
    freeAmount(dropid) {
        // console.log(JSON.stringify('freeDropAmounts', this.freeDropAmounts), this.freeDropAmounts[drop.id], this.freeDropAmounts[drop.id] || drop.amount);
        if (!this.freeDropAmounts) {
            this.freeDropAmounts = {};
        }
        this.freeDropAmounts[dropid] = this.freeDropAmounts[dropid] || (Game.getObjectById(dropid) || {amount: 0}).amount;
        // console.log('freeAmount', drop.pos.roomName, dropid);
        return this.freeDropAmounts[dropid];
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