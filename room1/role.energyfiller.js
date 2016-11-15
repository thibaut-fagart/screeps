var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var RoleCarry = require('./role.carry');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var RegroupStrategy = require('./strategy.regroup');
var PickupStrategy = require('./strategy.pickup');

class RoleEnergyFiller extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new PickupStrategy(undefined,(creep=>(creep.room.controller && creep.room.controller.level >=7 ? ()=>true :()=>false))), // re introduced for when no gatherers are present and all mines go through links
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_TERMINAL),
            new LoadFromContainerStrategy(undefined, STRUCTURE_CONTAINER, (creep)=>((s)=>s.room.isHarvestContainer(s)))
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
            new DropToEnergyStorageStrategy(STRUCTURE_NUKER),
            new DropToContainerStrategy(util.ANY_MINERAL, STRUCTURE_STORAGE),
            // new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }


    run(creep) {
        let ret = super.run(creep);
        if (creep.carry.energy && creep.memory.energyStoreTarget && Game.getObjectById(creep.memory.energyStoreTarget).canCreateCreep) {
            let nearbyEmptyExtension = _.head(creep.room.glanceForAround(LOOK_STRUCTURES, creep.pos, 1, true).map(s=>s.structure).filter(s=>s.structureType === STRUCTURE_EXTENSION && s.energy < s.energyCapacity));
            if (nearbyEmptyExtension) {
                creep.transfer(nearbyEmptyExtension, RESOURCE_ENERGY);
            }
        }
        return ret;
    }
}
require('./profiler').registerClass(RoleEnergyFiller, 'RoleEnergyFiller');

module.exports = RoleEnergyFiller;
