var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var RoleRemoteCarry = require('./role.remote.carry');
var ClosePickupStrategy = require('./strategy.pickup.close');

class RoleEnergyTransporter extends RoleRemoteCarry {

    constructor() {
        super();
        this.travelingPickup = new ClosePickupStrategy(RESOURCE_ENERGY, 1);
        this.loadFromNeighbour = {accepts: ()=>false};
        this.pickupStrategy = {accepts: ()=>false};
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
        ];
        this.unloadStrategies = [
            new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
            new DropToContainerStrategy(undefined, STRUCTURE_CONTAINER),
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }


    ensureYoungEnoughForAnotherTrip(creep, remoteRoom) {
        let tripToSources = creep.room.tripTimeToSources(remoteRoom);
        let mySpeed = creep.speed();
        let tripTime = 0;
        for (let i in tripToSources) {
            tripTime += tripToSources[i] * mySpeed.full[i];
        }
        //creep.log('trip time', creep.memory.remoteRoom, tripTime);
        if (tripTime -50 < creep.ticksToLive) {
            this.setAction(creep, 'go_remote_room');
            this.goRemoteTask.accepts(creep);
        } else {
            creep.log('ready to die, recycling', creep.ticksToLive, tripTime);
            creep.memory.previousRole = creep.memory.role;
            creep.memory.role = 'recycle';
            return false;
        }
    }

    run(creep) {
        return super.run(creep);
    }
}

require('./profiler').registerClass(RoleEnergyTransporter, 'RoleEnergyTransporter'); module.exports = RoleEnergyTransporter;
