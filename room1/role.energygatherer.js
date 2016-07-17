var _ = require('lodash');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var RoleCarry = require('./role.carry');

class RoleEnergyGatherer extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (c)=>(!c.room.memory.harvestContainers || c.room.memory.harvestContainers.indexOf(c.id) >= 0))];
        this.unloadStrategies = [
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            // new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            // new DropToEnergyStorageStrategy(STRUCTURE_SPAWN)
        ];
    }
}

module.exports = RoleEnergyGatherer;
