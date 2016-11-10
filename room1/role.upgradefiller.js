var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var RoleCarry = require('./role.carry');
var DropToContainerStrategy = require('./strategy.drop_to_container');

class RoleUpgradeFiller extends RoleCarry {
    constructor() {
        super();
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
        ];
        this.unloadStrategies = [
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> {
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
                let cpos = creep.room.controller.pos;
                return ((s)=>!s.room.isHarvestContainer(s) &&  cpos.getRangeTo(s) < 3);
            }),
        ];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
    }
}
require('./profiler').registerClass(RoleUpgradeFiller, 'RoleUpgradeFiller');

module.exports = RoleUpgradeFiller;
