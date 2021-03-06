var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var PickupStrategy = require('./strategy.pickup');
var BuildAroundStrategy = require('./strategy.buildaround');
var ClosePickupStrategy = require('./strategy.pickup.close');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToContainerCloseStrategy = require('./strategy.drop_to_container_close');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var MoveToRoomTask = require('./task.move.toroom');
var RegroupStrategy = require('./strategy.regroup');
var WaitStrategy = require('./strategy.wait');

var repair = true;
class RoleRemoteCarry {

    constructor() {
        this.travelingPickup = new ClosePickupStrategy(undefined, 1, (creep)=>creep.room.name === creep.memory.homeroom ? ()=>false : ()=>true);
        this.travelingBuild = new BuildAroundStrategy(3);
        this.travelingDrop = new DropToContainerCloseStrategy(undefined, undefined,
            (creep)=>((s)=>([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK].indexOf(s.structureType) >= 0)), 1);
        this.loadFromNeighbour = new LoadFromContainerStrategy(undefined, undefined,
            function (creep) {
                return (s)=> {
                    let range = s.pos.getRangeTo(creep);
                    return range < 2 && (_.sum(s.store) > 50);
                };
            });
        this.loadStrategies = [
            new PickupStrategy(undefined, function (creep) {
                return ((drop)=>drop.amount > 50);
            }),
            new LoadFromContainerStrategy(undefined, STRUCTURE_CONTAINER),
            new WaitStrategy(10)
        ];
        this.unloadStrategies = [
            // new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToContainerStrategy(RESOURCE_ENERGY, undefined,
                (creep)=>((s)=>([STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK].indexOf(s.structureType) >= 0))),
            new DropToContainerStrategy(util.ANY_MINERAL, STRUCTURE_STORAGE),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
        ];
        this.regroupStrategy = new RegroupStrategy(COLOR_ORANGE);
        this.avoidThreadStrategy = new AvoidRespawnStrategy();
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'load';
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);

        this.goRemoteTask = new MoveToRoomTask('goRemote', 'homeroom', 'remoteRoom');
        this.goHomeTask = new MoveToRoomTask('goHome', 'remoteRoom', 'homeroom');
    }

    /*
     requires : remoteRoom=creep.room.remoteMining, homeroom = creep.room.name, homeroom, remoteSource
     */
    resign(creep) {
        creep.log("resigning");
    }

    init(creep) {
        creep.memory.action = 'go_remote_room';
        creep.memory.homeroom = creep.room.name;
        if (!creep.memory.remoteRoom && creep.room.memory.remoteMining) {
            creep.memory.remoteRoom = _.isString(creep.room.memory.remoteMining) ? creep.room.memory.remoteMining : creep.room.memory.remoteMining[0];
        }
    }

    setAction(creep, action) {
        // creep.log('set action', action);
        creep.memory.action = action;
        creep.memory.tripTime = Game.time - creep.memory.startTrip;
        delete creep.memory.startTrip;
        util.setCurrentStrategy(creep, null);

    }

    /** @param {Creep} creep **/
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
        if (repair &&creep.fatigue > 0
            && creep.pos.lookFor(LOOK_FLAGS).find(f=>f.color === util.primaryBuildColor(STRUCTURE_ROAD) && f.secondaryColor == util.secondaryBuildColor(STRUCTURE_ROAD))
            && creep.pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0) {
            Game.notify(`rebuilding road ${creep.pos}`);
            creep.pos.createConstructionSite(STRUCTURE_ROAD);
        }
        if (repair && creep.carry && creep.carry.energy && this.repairAround(creep)) {
            creep.log('badly hit, repairing');
            return;
        } else if (repair && creep.carry && creep.carry.energy && creep.fatigue > 0 && this.buildAround(creep)) {
            // creep.log('building');
            return;
        }
        this.travelingPickup.accepts(creep);
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
                this.ensureYoungEnoughForAnotherTrip(creep, creep.memory.remoteRoom);
                return;
            }
        }

        if (creep.memory.action == this.ACTION_FILL && creep.memory.remoteRoom == creep.room.name) {
            let strategy;
            if (!this.avoidThreadStrategy.accepts(creep)) {
                if (true/*!this.loadFromNeighbour.accepts(creep) && !this.travelingPickup.accepts(creep)*/) {
                    // creep.log('no pickup');
                    strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
                    // creep.log('no previous strategy');
                    if (!strategy) {
                        strategy = _.find(this.loadStrategies, (strat)=>(strat.accepts(creep)));
                    }
                    if (!strategy && creep.carry && creep.carry.energy) {
                        this.buildAround(creep);
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

    /**
     *
     * @param creep
     * @returns {boolean} stop if false
     */
    ensureYoungEnoughForAnotherTrip(creep, remoteRoom) {
        let tripToSources = creep.room.tripTimeToSources(remoteRoom);
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

    /**
     *
     * @param creep
     * @return {boolean} false if repair level is satisfying
     */
    repairAround(creep) {
        let range = 3;
        let repairCapacity = creep.repairCapacity;
        let structures = creep.room.glanceForAround(LOOK_STRUCTURES, creep.pos, 3, true);
        let needRepair = structures.filter((s)=>s.ticksToVanish && s.hits + repairCapacity < s.hitsMax);

        if (needRepair.length) {
            creep.log('repairing');
            let target = _.min(needRepair, s=>s.ticksToVanish);
            creep.repair(target);
            return target.ticksToVanish < 1500;
        } else if (creep.fatigue > 0) {
            if (this.buildAround(creep)) {
                return true;
            } else {
                creep.room.buildStructures(creep.pos);
                return false;
            }
        }

    }

    /**
     *
     * @param creep
     * @returns {*}
     */
    buildAround(creep) {
        return this.travelingBuild.accepts(creep);
    }
}
require('./profiler').registerClass(RoleRemoteCarry, 'RoleRemoteCarry');
module.exports = RoleRemoteCarry;
