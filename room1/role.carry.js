var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');

class RoleCarry {
    constructor() {
        this.pickupStrategy = new PickupStrategy(RESOURCE_ENERGY, (creep)=>(function(d){return d.amount > 50;}));
        this.loadStrategies = [new PickupStrategy(),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK, (creep)=>((s)=>( s.energy && s.room.storage && (s.pos.getRangeTo(s.room.storage) < 5)))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER),
            new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_CONTAINER/*
,                (s)=>(
                    (!(s.room.memory.harvestContainers) || (s.room.memory.harvestContainers && (s.room.memory.harvestContainers.indexOf(s.id) >= 0))))*/)];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK),
            new DropToContainerStrategy(null, STRUCTURE_STORAGE),
            // new DropToContainerStrategy(RESOURCE_ENERGY,STRUCTURE_LINK),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=>{
                return ((s)=>( (s.room.memory.harvestContainers || []).indexOf(s.id) >= 0));
            })

        ];
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'fill';
    }


    /** @param {Creep} creep **/
    run(creep) {
        let strategy;
        if (_.sum(creep.carry) == 0) {
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
            delete creep.memory.currentStrategy;
            let s = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
        } else if (_.sum(creep.carry) == creep.carryCapacity) {
            creep.memory.action = this.ACTION_UNLOAD;
            delete creep.memory.action;
            delete creep.memory.currentStrategy;
            let s = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
        }
        if (creep.memory.action == this.ACTION_FILL) {
            strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                this.onNoLoadStrategy(creep);
                creep.log('no load strategy');
            }

/*
            if (!this.pickupStrategy.accepts(creep)) {
                strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
                if (!strategy) {
                    strategy = _.find(this.loadStrategies, (strat)=>!(null == strat.accepts(creep)));
                }
            } else {
                creep.log('pickup');
                strategy = this.pickupStrategy;
            }
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                // creep.log('no loadStrategy');
                return;
            }
*/
        }
        else {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            // creep.log(util.strategyToLog(strategy));
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                this.onNoUnloadStrategy(creep);
/*                let target = util.objectFromMemory(creep.memory, 'unload_container', (c)=>_.sum(c.store) < c.storeCapacity);
                if (!target) {
                    let array = _.filter(creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_CONTAINER}}),
                        (c)=> _.sum(c.store) < c.storeCapacity);
                    // creep.log('containers', array.length);
                    if (array.length) {
                        target = array.shift();
                    }
                    // creep.log('target', target);
                    if (target)  creep.memory['unload_container'] = target.id;
                }
                if (target) {
                    // creep.log('unloading to', target);
                    let transfer
                    if (this.resource) {
                        transfer = creep.transfer(target, this.resource);
                    } else {
                        _.keys(creep.carry).forEach((k)=> transfer = creep.transfer(target, k));
                    }

                    if (ERR_NOT_IN_RANGE === transfer) {
                        // creep.log('moving to', target);
                        creep.moveTo(target);
/!*
                    } else if (transfer !== OK && transfer !== ERR_TIRED) {
                        creep.log('transfer?', target, JSON.stringify(creep.carry), transfer);
*!/
                    }
                    return;
                }*/
                creep.log('no unloadStrategy');
                return;
            }
            delete creep.memory['unload_container'];
        }
    }

    onNoLoadStrategy(creep) {

    }
    onNoUnloadStrategy(creep) {

    }
}

module.exports = RoleCarry;
