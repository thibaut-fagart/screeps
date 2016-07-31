var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var PickupStrategy = require('./strategy.pickup');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');

class RoleCarry {
    constructor() {
        this.pickupStrategy = new PickupStrategy(undefined, (creep)=> {
            let availableCarry = creep.carryCapacity - _.sum(creep.carry);
            return (drop)=> {
                let range = drop.pos.getRangeTo(creep);
                return range < 5 || drop.amount > availableCarry + range;
            };
        });
        this.loadStrategies = [
            new PickupStrategy(undefined, (creep)=>((d)=>(d.amount > 50))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> ((s)=>s.pos.getRangeTo(creep) < 2)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK, (creep)=>((s)=>( s.energy && s.room.storage && (s.pos.getRangeTo(s.room.storage) < 5)))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_CONTAINER/*
             ,                (s)=>(
             (!(s.room.memory.harvestContainers) || (s.room.memory.harvestContainers && (s.room.memory.harvestContainers.indexOf(s.id) >= 0))))*/)];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToContainerStrategy(null, STRUCTURE_STORAGE),
            // new DropToContainerStrategy(RESOURCE_ENERGY,STRUCTURE_LINK),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> {
                return ((s)=>( (s.room.memory.harvestContainers || []).indexOf(s.id) >= 0));
            })
        ];
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'fill';
    }


    /** @param {Creep} creep **/
    run(creep) {
        let strategy;
        if (_.sum(creep.carry) == 0 && creep.memory.action != this.ACTION_FILL) {
            creep.memory.action = this.ACTION_FILL;
            delete creep.memory.source;
            let s = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
            delete creep.memory.currentStrategy;
        } else if (_.sum(creep.carry) == creep.carryCapacity && creep.memory.action != this.ACTION_UNLOAD) {
            creep.memory.action = this.ACTION_UNLOAD;
            let s = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
            delete creep.memory.currentStrategy;
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
            }

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
                creep.log('no unloadStrategy');
                return;
            }
            delete creep.memory['unload_container'];
        }
    }

    onNoLoadStrategy(creep) {
        creep.log('no load strategy');

    }

    onNoUnloadStrategy(creep) {

    }
}

module.exports = RoleCarry;
