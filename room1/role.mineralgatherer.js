var _ = require('lodash');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var RoleCarry = require('./role.carry');
var util = require('./util');

class RoleMineralGatherer extends RoleCarry{
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_CONTAINER),
            // new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_STORAGE)
            ];
        this.unloadStrategies = [
            // new DropToContainerStrategy(null,STRUCTURE_LAB ) , // add predicate to drop adequate mineral in the good lab
            new DropToContainerStrategy(null,STRUCTURE_STORAGE ) ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }


    onNoLoadStrategy(creep) {
        // creep.memory.role = 'energyFiller';
    }
}
require('./profiler').registerClass(RoleMineralGatherer, 'RoleMineralGatherer'); module.exports = RoleMineralGatherer;
