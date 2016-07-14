var _ = require('lodash');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var RoleCarry = require('./role.carry');

class RoleMineralGatherer extends RoleCarry{
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY, STRUCTURE_CONTAINER, (c)=>(!c.room.memory.harvestContainers || c.room.memory.harvestContainers.indexOf(c.id)>=0))];
        this.unloadStrategies = [ new DropToContainerStrategy(null,STRUCTURE_LAB ) ,new DropToContainerStrategy(null,STRUCTURE_STORAGE ) ];
    }
}

module.exports = RoleMineralGatherer;
