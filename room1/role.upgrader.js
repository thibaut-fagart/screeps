var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');

class RoleUpgrader {
    constructor() {
        this.loadStrategies = [
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (creep)=> ((s)=>s.pos.getRangeTo(creep) < 5)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined),
            new PickupStrategy(RESOURCE_ENERGY)/*,
             new HarvestEnergySourceStrategy()*/];
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
            let upgradePos = this.findUpgradePos(creep);
            if (upgradePos &&!upgradePos.isEqualTo(creep.pos)) {
                util.moveTo(creep, upgradePos, this.constructor.name + 'Path', {range: 0});
            } else if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.log('unexpected, moving');
                if (!upgradePos ) {
                    util.moveTo(creep, creep.room.controller.pos, this.constructor.name + 'Path', {range: 3});
                }
            }
            if (creep.carry.energy == 0) {
                creep.memory.action = this.ACTION_FILL;
            }
        }
        return false;
    }

    /**
     *
     * @param {Creep| {pos}} creep
     * @returns {RoomPosition}
     */
    findUpgradePos(creep) {
        let lookedPosition = creep.room.controller.pos;
        return creep.room.findValidParkingPosition(creep, lookedPosition, 3);
    }
}

module.exports = RoleUpgrader;