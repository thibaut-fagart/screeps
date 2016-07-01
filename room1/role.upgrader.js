var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');

class RoleUpgrader {
    constructor() {
        this.loadStrategies = [
            new PickupStrategy(RESOURCE_ENERGY),
            new LoadFromContainerStrategy(RESOURCE_ENERGY),
            new HarvestEnergySourceStrategy()];
        this.ACTION_FILL = 'fill';
    }

    /** @param {Creep} creep **/
    run(creep) {
        if (creep.carry.energy == 0) {
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
        } else if (creep.carry.energy == creep.carryCapacity) {
            delete creep.memory.action;
            
        }
        if (creep.memory.action == this.ACTION_FILL) {
            let strategy = _.find(this.loadStrategies, (strat)=>undefined !== strat.accepts(creep));
            if (!strategy ) {
                creep.log('no loadStrategy');
                return;
            }
        }
        else {
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
            if (creep.carry.energy == 0) {
                creep.memory.action = this.ACTION_FILL;
            }
        }
        return false;
    }

}

module.exports = new RoleUpgrader();