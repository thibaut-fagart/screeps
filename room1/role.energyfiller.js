var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var RoleCarry = require('./role.carry');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var RegroupStrategy = require('./strategy.regroup');

class RoleEnergyFiller extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> ((s)=> s.store && s.store.energy >100  && s.pos.getRangeTo(creep) < 1 && creep.room.isHarvestContainer(s))),
            // new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK, (creep)=> ((s)=>s.room.storage && (s.pos.getRangeTo(s.room.storage) < 5))),
            // new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK, (creep)=> creep.room.energyCapacityAvailable===creep.room.energyAvailable?()=>true:()=>false),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            // new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_TERMINAL , (creep)=> ((s)=>creep.room.energyAvailable < creep.room.energyCapacityAvailable || s.store.energy > 5000)),
        ];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER, (creep=>(s=>(s.energy < s.energyCapacity*0.8)))),
            new DropToEnergyStorageStrategy(STRUCTURE_LAB, (creep=>(s=>(s.energy < s.energyCapacity/2)))),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_TERMINAL, (creep)=> {
                if (!creep.room.terminal || creep.carry.energy ===0) {
                    return (s)=>false;
                } else if (creep.room.storage.store && creep.room.storage.store[RESOURCE_ENERGY] && creep.room.storage.store[RESOURCE_ENERGY] > 5000
                    && (!creep.room.terminal.store.energy || creep.room.terminal.store.energy < 5000)) {
                    return ()=>true;
                } else {
                    return ()=>false;
                }
            }),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> {
                return ((s)=>!s.room.isHarvestContainer(s) && (Math.abs(25-s.pos.x)<20 )&& (Math.abs(25-s.pos.y)<20 ));
            }),
            new DropToContainerStrategy(util.ANY_MINERAL, STRUCTURE_STORAGE),
            // new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }

}
require('./profiler').registerClass(RoleEnergyFiller, 'RoleEnergyFiller');

module.exports = RoleEnergyFiller;
