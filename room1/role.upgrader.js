var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');

class RoleUpgrader {
    constructor() {
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (s)=>(s.structureType !== STRUCTURE_TOWER )),
            new PickupStrategy(RESOURCE_ENERGY),
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
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            } else {
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

module.exports = RoleUpgrader;