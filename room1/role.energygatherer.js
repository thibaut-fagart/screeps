var _ = require('lodash');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var ClosePickupStrategy = require('./strategy.pickup.close');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var RoleCarry = require('./role.carry');
var util = require('./util');

class RoleEnergyGatherer extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> ((s)=>s.pos.getRangeTo(creep) < 2)) ,
            new ClosePickupStrategy(RESOURCE_ENERGY, 2),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=>((c)=>(!c.room.memory.harvestContainers || c.room.memory.harvestContainers.indexOf(c.id) >= 0)))];
        this.unloadStrategies = [
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            // new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            // new DropToEnergyStorageStrategy(STRUCTURE_SPAWN)
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);

    }
}

module.exports = RoleEnergyGatherer;
