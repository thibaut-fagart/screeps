var _ = require('lodash');
var util = require('./util');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var DropToEnergyStorage = require('./strategy.drop_to_energyStorage');
var DropToContainerStrategy = require('./strategy.drop_to_container');
class RoleHarvester {
    constructor() {
        this.loadStrategies = [
            new HarvestEnergySourceToContainerStrategy(RESOURCE_ENERGY),
        ];
        this.unloadStrategies = [
            new DropToEnergyStorage(STRUCTURE_EXTENSION),
            new DropToEnergyStorage(STRUCTURE_SPAWN),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE)];
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);

    }

    switchSource(creep) {
        let source = _.min(creep.room.find(FIND_SOURCES), s=>s.energy ? -1 : s.ticksToRegeneration);
        if (source) {
            delete creep.memory.link;
            delete creep.memory.linkContainer;
            delete creep.memory.container;
            delete creep.memory.harvestFrom;
            this.loadStrategies.forEach(s=> {
                util.release(creep, creep.memory[s.SOURCE_PATH], 'harvest');
                util.release(creep, creep.memory[s.CONTAINER_PATH], 'harvest');
                util.release(creep, creep.memory[s.PATH], 'harvest');
                creep.memory[s.SOURCE_PATH] = source.id;
                let container = _.find(source.room.glanceForAround(LOOK_STRUCTURES, source.pos, 1, true).map(s=>s.structure),s=>s.structureType === STRUCTURE_CONTAINER);
                if (container) {
                    creep.memory[s.CONTAINER_PATH] = container.id;
                }
                // creep.log(`switching source ${oldSource}=>${creep.memory[s.SOURCE_PATH]}`);
                delete creep.memory[s.PATH];
            });
        }
    }

    /**
     * if source.energy ===0 && source.regenTime > 100, go to the other source
     * @param creep
     */
    run(creep) {
        let strategy;
        if (creep.carryCapacity > 0) {
            if (creep.carry.energy == creep.carryCapacity && !creep.memory.uselink) {
                creep.memory.action = 'unload';
            } else if (creep.carry.energy == 0) {
                creep.memory.action = 'mining';
            }
        } else {
            creep.memory.action = 'mining';
        }
        let link = creep.memory.link ? Game.getObjectById(creep.memory.link) : undefined;
        creep.memory.hSpeed = creep.memory.hSpeed || creep.getActiveBodyparts(WORK) * 2;
        // creep.log(creep.carry.energy, creep.carryCapacity, creep.memory.currentStrategy, link);
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
            if (creep.memory.uselink && !creep.memory.link && creep.memory.source) {
                let links = creep.room.glanceForAround(LOOK_STRUCTURES, Game.getObjectById(creep.memory.source).pos, 2, true).map(s=>s.structure).filter(s=>s.structureType == STRUCTURE_LINK);

                if (links.length) {
                    link = _.head(links);
                    creep.memory.link = link.id;
                }
            }
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
                    let harvestPos = util.posFromString(creep.memory.harvestFrom, creep.room.name);
                    if (harvestPos.getRangeTo(creep.pos) > 0) {
                        util.moveTo(creep, harvestPos, undefined, {range: 0});
                        return;
                    }
                }
                let carry = _.sum(creep.carry);
                // creep.log('using link',carry);
                if (carry + creep.memory.hSpeed > creep.carryCapacity) {
                    // creep.log('unloading', carry);
                    let transfer = creep.transfer(link, RESOURCE_ENERGY);
                    if (ERR_NOT_IN_RANGE === transfer) {
                        creep.log('ERRROR, should be in range of link');
                        util.moveTo(creep, link.pos, undefined, {range: 1});
                    } else if (transfer !== OK) {
                        creep.log('tranfer to link ? ', transfer);
                        // delete creep.memory.link;
                    }
                } else if (creep.carry.energy < creep.carryCapacity / 2) {
                    if (undefined === creep.memory.linkContainer) {
                        creep.memory.linkContainer = (link.container || {id: false}).id;
                    }
                    let container = Game.getObjectById(creep.memory.linkContainer);
                    if (container && (container.store.energy || 0) > 0) {
                        creep.log('emptying container', creep.carry.energy, container.store.energy);
                        creep.withdraw(container, RESOURCE_ENERGY);
                    }
                }
            }
            strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }
            // creep.log(util.strategyToLog(strategy));
            let source = Game.getObjectById(creep.memory.source);
            if (source && source.energy < creep.memory.hSpeed) {
                this.switchSource(creep);
                // creep.log('switched, strategy', strategy);
            }

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