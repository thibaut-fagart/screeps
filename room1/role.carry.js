var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');

class RoleCarry {
    constructor() {
        this.loadStrategies = [new PickupStrategy(RESOURCE_ENERGY),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (c)=>(!c.room.memory.harvestContainers || c.room.memory.harvestContainers.indexOf(c.id)>=0))];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToContainerStrategy(RESOURCE_ENERGY,STRUCTURE_LINK),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE ),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER )

        ];
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'fill';
    }


    /** @param {Creep} creep **/
    run(creep) {
        if (creep.carry.energy == 0) {
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
            delete creep.memory.currentStrategy;
            let s = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (s) {s.clearMemory(creep);}
            util.setCurrentStrategy(creep, null);
        } else if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.action = this.ACTION_UNLOAD;
            delete creep.memory.action;
            delete creep.memory.currentStrategy;
            let s = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (s) {s.clearMemory(creep);}
            util.setCurrentStrategy(creep, null);
        }
        if (creep.memory.action == this.ACTION_FILL) {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                creep.log('no loadStrategy');
                return;
            }
        }
        else {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                let target = util.objectFromMemory(creep.memory, 'unload_container', (c)=>_.sum(c.store) < c.storeCapacity);
                if (!target) {
                    let array = _.filter(creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_CONTAINER}}),
                        (c)=> _.sum(c.store) < c.storeCapacity);
                    creep.log('containers', array.length);
                    if (array.length) {
                        target = array.shift();
                    }
                    creep.log('target', target);
                    if (target)  creep.memory['unload_container'] = target.id;
                }
                if (target) {
                    // creep.log('unloading to', target);
                    let transfer = creep.transfer(target, RESOURCE_ENERGY);
                    if (ERR_NOT_IN_RANGE === transfer) {
                        creep.log('moving to', target);
                        creep.moveTo(target);
                    } else if(transfer !== OK  && transfer !== ERR_TIRED){

                        creep.log('transfer?',transfer);
                    }
                    return;
                }
                creep.log('no unloadStrategy');
                return;
            }
            delete creep.memory['unload_container'];
        }
    }

}

module.exports = RoleCarry;
