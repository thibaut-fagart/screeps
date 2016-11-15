var _ = require('lodash');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var ClosePickupStrategy = require('./strategy.pickup.close');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var RoleCarry = require('./role.carry');
var util = require('./util');

class RoleEnergyGatherer extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new ClosePickupStrategy(RESOURCE_ENERGY, 2),
            new PickupStrategy(RESOURCE_ENERGY, creep=>((drop=> drop.amount -2 * drop.pos.getRangeTo(creep) > 100))),
            new LoadFromContainerStrategy(undefined, STRUCTURE_CONTAINER, (creep)=>((s)=>s.room.isHarvestContainer(s))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE, (creep=>creep.room.energyAvailable  < creep.room.energyCapacityAvailable?()=>true:false))];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToContainerStrategy(undefined, STRUCTURE_STORAGE)
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);

    }

    run(creep) {
        return super.run(creep);
    }
}
require('./profiler').registerClass(RoleEnergyGatherer, 'RoleEnergyGatherer');

module.exports = RoleEnergyGatherer;
