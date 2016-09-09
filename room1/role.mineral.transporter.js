var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var MoveToRoomTask = require('./task.move.toroom');
var RegroupStrategy = require('./strategy.regroup');
var RoleRemoteCarry = require('./role.remote.carry');

class RoleMineralTransporter extends RoleRemoteCarry {

    constructor() {
        super();
        this.travelingPickup = {accepts: (creep)=>false};
        this.loadFromNeighbour = {accepts: (creep)=>false};
        this.pickupStrategy = {accepts: (creep)=>false};
        this.loadStrategies = [
            new LoadFromContainerStrategy((creep)=>creep.memory.mineral, STRUCTURE_STORAGE, (creep) => {
                return function (s) {
                    return s.store && s.store[creep.memory.mineral] > 0;
                };
            }),
            new LoadFromContainerStrategy((creep)=>creep.memory.mineral, STRUCTURE_CONTAINER, (creep) => {
                return function (s) {
                    return s.store && s.store[creep.memory.mineral] > 0;
                };
            })

        ];
        this.unloadStrategies = [
            new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }


    run(creep) {
        if (creep.memory.homeroom === creep.room.name && _.sum(creep.carry) ===0) {
            // creep.log('checking reverse import');
            let remoteRoom = Game.rooms[creep.memory.remoteRoom];
            let remoteMem = remoteRoom.memory;
            if (remoteMem.minerals && remoteMem.minerals.import  && remoteMem.minerals.import[creep.memory.homeroom]  && creep.room.storage) {
                let eligibleMinerals = [remoteMem.minerals.import[creep.memory.homeroom]] // todo allow importing several minerals
                    .filter((min)=>remoteRoom.storage.store[min] < 50000 && creep.room.storage.store[min] > 50000);
                if (eligibleMinerals.length) {
                    creep.log('exporting ', eligibleMinerals[0], creep.memory.remoteRoom);
                    creep.memory.homeroom = creep.memory.remoteRoom;
                    creep.memory.remoteRoom = creep.room.name;
                    creep.memory.mineral = eligibleMinerals[0];
                } else {
                    creep.log('no reverse import');
                }
            }
            // check if remoteroom has some import orders too
        }
        return super.run(creep);
    }
}

require('./profiler').registerClass(RoleMineralTransporter, 'RoleMineralTransporter'); module.exports = RoleMineralTransporter;
