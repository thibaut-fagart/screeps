var _ = require('lodash');
var util = require('./util');
var StrategyLootContainer = require('./strategy.loot_container');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var MoveToRoomTask = require('./task.move.toroom');
var RegroupStrategy = require('./strategy.regroup');
var RoleRemoteCarry = require('./role.remote.carry');
var ClosePickupStrategy = require('./strategy.pickup.close');

class RoleLooter extends RoleRemoteCarry {

    constructor() {
        super();
        this.travelingPickup = new ClosePickupStrategy(RESOURCE_ENERGY, 1);
        this.loadStrategies = [
            new PickupStrategy(undefined, function (creep) {
                return ((drop)=>drop.amount > 50);
            }),
            new StrategyLootContainer()
        ];
        this.unloadStrategies = [
            // new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToContainerStrategy(undefined, undefined,
                (creep)=>((s)=>([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK].indexOf(s.structureType) >= 0))),
            new DropToEnergyStorageStrategy()
        ];
        this.regroupStrategy = new RegroupStrategy(COLOR_ORANGE);
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'load';
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);

        this.goRemoteTask = new MoveToRoomTask('goRemote', 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask('goHome', 'remoteRoom', 'homeroom');
    }

    run(creep) {
        if (!creep.memory.homeroom) {
            creep.memory.homeroom = creep.room.name;
        }
        if (creep.memory.remotesource) {
            creep.memory.source = creep.memory.remotesource;
            delete creep.memory.remotesource;
        }
        if (!creep.memory.action) {
            this.init(creep);
        }
        // creep.log('action?', creep.memory.action);
        if (creep.carry && creep.carry.energy && this.repairAround(creep)) {
            creep.log('badly hit, repairing');
            return;
        } else if (creep.carry && creep.carry.energy && creep.fatigue > 0 && this.buildAround(creep)) {
            // creep.log('building');
            return;
        }
        if (this.travelingPickup.accepts(creep)) {
            return;
        }

        creep.memory.startTrip = creep.memory.startTrip || Game.time; // remember when the trip started, will allow to know when need to come back
        if (creep.memory.action === 'go_remote_room') {
            if (_.sum(creep.carry) > 0.95 * creep.carryCapacity) {
                this.setAction(creep, 'go_home_room');
            } else if (!this.goRemoteTask.accepts(creep)) {
                // creep.log('goRemote refused... remote ? ');
                this.setAction(creep, this.ACTION_FILL);
            }
        } else if (creep.memory.action === 'go_home_room') {
            if (_.sum(creep.carry) === 0) {
                this.setAction(creep, 'go_remote_room');
            } else if (!this.goHomeTask.accepts(creep) && creep.room.name === creep.memory.homeroom) {
                this.setAction(creep, this.ACTION_UNLOAD);
                creep.room.deliver(creep.memory.remoteRoom, creep.carry);
            }
        } else if (creep.memory.action === this.ACTION_FILL && _.sum(creep.carry) > 0.95 * creep.carryCapacity) {
            this.setAction(creep, 'go_home_room');
            this.goHomeTask.accepts(creep);
        } else if (creep.memory.action === this.ACTION_FILL && creep.room.name !== creep.memory.remoteRoom) {
            this.setAction(creep, 'go_remote_room');
            this.goRemoteTask.accepts(creep);
        } else if (creep.memory.action === this.ACTION_UNLOAD && _.sum(creep.carry) === 0) {
            // TODO check lifespan , will the creep live long enough to go and bakc ?
            if (creep.room.name !== creep.memory.remoteRoom) {
                let tripToSources = creep.room.tripTimeToSources(creep.memory.remoteRoom);
                let mySpeed = creep.speed();
                let tripTime = 0;
                for (let i in tripToSources) {
                    tripTime += tripToSources[i] * (mySpeed.empty[i] + mySpeed.full[i]);
                }
                //creep.log('trip time', creep.memory.remoteRoom, tripTime);
                if (tripTime + 10 < creep.ticksToLive) {
                    this.setAction(creep, 'go_remote_room');
                    this.goRemoteTask.accepts(creep);
                } else {
                    creep.log('ready to die, recycling', creep.ticksToLive, tripTime);
                    creep.memory.previousRole = creep.memory.role;
                    creep.memory.role = 'recycle';
                    return false;
                }
            }
        }

        if (creep.memory.action == this.ACTION_FILL && creep.memory.remoteRoom == creep.room.name) {
            let strategy;
            if (!this.avoidThreadStrategy.accepts(creep)) {
                if (!this.loadFromNeighbour.accepts(creep) && !this.travelingPickup.accepts(creep)) {
                    // creep.log('no pickup');
                    strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
                    // creep.log('no previous strategy');
                    if (!strategy) {
                        strategy = _.find(this.loadStrategies, (strat)=>(strat.accepts(creep)));
                    }
                } else {
                    //creep.log('travelingPickup/load accepted');
                    return;
                }
                if (strategy) {
                    // creep.log('strategy', strategy.constructor.name);
                    util.setCurrentStrategy(creep, strategy);
                } else {
                    //creep.log('no loadStrategy');
                    this.regroupStrategy.accepts(creep);
                    return false;
                }
            }
        }
        else if (creep.memory.action == this.ACTION_UNLOAD && creep.memory.homeroom == creep.room.name) {
            // creep.log('home, unloading');
            this.travelingDrop.accepts(creep);
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>(strat.accepts(creep)));
                // creep.log('stragegy?', strategy);
            }
            if (strategy) {
                // creep.log('stragegy?', strategy);
                util.setCurrentStrategy(creep, strategy);
            } else {
                util.setCurrentStrategy(creep, null);
            }
        }

    }

}

require('./profiler').registerClass(RoleLooter, 'RoleLooter');
module.exports = RoleLooter;
