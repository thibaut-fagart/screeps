var _ = require('lodash');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var RoleCarry = require('./role.carry');

class RoleMineralGatherer extends RoleCarry{
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_CONTAINER, 
                (creep)=>((c)=>(!c.room.memory.harvestContainers || c.room.memory.harvestContainers.indexOf(c.id) >=0))),
            // new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_STORAGE)
            ];
        this.unloadStrategies = [
            // new DropToContainerStrategy(null,STRUCTURE_LAB ) , // add predicate to drop adequate mineral in the good lab
            new DropToContainerStrategy(null,STRUCTURE_STORAGE ) ];
    }


    onNoLoadStrategy(creep) {
        // creep.memory.role = 'energyFiller';
    }
}
module.exports = RoleMineralGatherer;
