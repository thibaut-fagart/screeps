var _ = require('lodash');
var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var DropToEnergyStorage = require('./strategy.drop_to_energyStorage');
var DropToContainerStrategy = require('./strategy.drop_to_container');
class RoleHarvester {
    constructor() {
        this.loadStrategies = [new HarvestEnergySourceToContainerStrategy(RESOURCE_ENERGY), new HarvestEnergySourceStrategy(RESOURCE_ENERGY)];
        this.unloadStrategies = [new DropToEnergyStorage(STRUCTURE_EXTENSION), new DropToEnergyStorage(STRUCTURE_SPAWN),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER), new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE)];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);

    }

    run(creep) {
        let strategy;
        if (creep.carryCapacity > 0) {
            if (creep.carry.energy == creep.carryCapacity) {
                creep.memory.action = 'unload';
            } else if (creep.carry.energy == 0) {
                creep.memory.action = 'mining';
            }
        } else {
            creep.memory.action = 'mining';
        }
        let link = creep.memory.link ? Game.getObjectById(creep.memory.link) : undefined;
        creep.memory.hSpeed = creep.memory.hSpeed || creep.getActiveBodyparts(WORK) * 2;
        // creep.log(creep.carry.energy, creep.carryCapacity, creep.memory.currentStrategy);
        if (creep.memory.action === 'unload' && !link) {
            // TODO add logic to detect link not emptying ?
            strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=> (strat.accepts(creep)));
            }
            // creep.log(util.strategyToLog(strategy));

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            } else {
                // creep.log('no harvestStrategy');
                return;
            }
        } else {
            if (link) {
                if (!creep.memory.harvestFrom) {
                    let source = _.head(creep.room.glanceForAround(LOOK_SOURCES, link.pos, 2, true).map(s=>s.source));
                    let positions = creep.room.findValidParkingPositions(creep, [
                        {pos: link.pos, range: 1}, {pos: source.pos, range: 1}
                    ]);
                    let position = creep.pos.findClosestByRange(positions);
                    if (position) {
                        creep.memory.harvestFrom = util.posToString(position);
                    }
                }
                if (creep.memory.harvestFrom) {
                    let harvestPos = util.posFromString(creep.memory.harvestFrom,creep.room.name);
                    if (harvestPos.getRangeTo(creep.pos)>0) {
                        util.moveTo(creep, harvestPos, undefined, {range: 0});
                        return ;
                    }
                }
                let carry = _.sum(creep.carry);
                // creep.log('using link',carry);
                if (carry + creep.memory.hSpeed > creep.carryCapacity) {
                    // creep.log('unloading',carry);
                    if (ERR_NOT_IN_RANGE === creep.transfer(link, RESOURCE_ENERGY)) {
                        creep.log('ERRROR, should be in range of link');
                        util.moveTo(creep, link.pos, undefined, {range: 1});
                    }
                } else if (carry < 2 * creep.memory.hSpeed && Game.time % 10 === 0) {
                    if (undefined === creep.memory.linkContainer) {
                        creep.memory.linkContainer = (link.container || {id: false}).id;
                    }
                    let container = Game.getObjectById(creep.memory.linkContainer);
                    if (container && (container.store.energy || 0) > 0) {
                        creep.withdraw(container, RESOURCE_ENERGY);
                    }
                }
            }
            strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }
            // creep.log(util.strategyToLog(strategy));

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            } else {
                // creep.log('no harvestStrategy');
                return;
            }
        }
    }
}
require('./profiler').registerClass(RoleHarvester, 'RoleHarvester');

module.exports = RoleHarvester;