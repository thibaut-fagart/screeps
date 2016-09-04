var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var RoleCarry = require('./role.carry');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');

class RoleEnergyFiller extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> ((s)=> s.store && s.store.energy >100  && s.pos.getRangeTo(creep) < 2)),
            // new PickupStrategy(RESOURCE_ENERGY, (creep)=>((d)=>(d.pos.getRangeTo(creep)< 2))),
            new PickupStrategy(RESOURCE_ENERGY, (creep)=>(function (d) {
                return d.amount > 50;
            })),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK, (creep)=> ((s)=>s.room.storage && (s.pos.getRangeTo(s.room.storage) < 5))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK, (creep)=> creep.room.energyCapacityAvailable===creep.room.energyAvailable?()=>true:()=>false),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE, (creep)=> ((s)=>creep.room.energyAvailable < creep.room.energyCapacityAvailable)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_TERMINAL , (creep)=> ((s)=>creep.room.energyAvailable < creep.room.energyCapacityAvailable || s.store.energy > 5000)),
        ];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            new DropToEnergyStorageStrategy(STRUCTURE_LAB),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_TERMINAL, (creep)=> {
                if (!creep.room.terminal) {
                    return (s)=>false;
                } else if (creep.room.storage.store && creep.room.storage.store[RESOURCE_ENERGY] && creep.room.storage.store[RESOURCE_ENERGY] > 5000
                    && (!creep.room.terminal.store.energy || creep.room.terminal.store.energy < 5000)) {
                    return ()=>true;
                } else {
                    return ()=>false;
                }
            }),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }


    onNoLoadStrategy(creep) {
        // suppress logging
        // return super.onNoLoadStrategy(creep);
    }

    onNoUnloadStrategy(creep) {
        return super.onNoUnloadStrategy(creep);
    }
}

module.exports = RoleEnergyFiller;
