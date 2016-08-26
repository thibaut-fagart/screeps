var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var PickupStrategy = require('./strategy.pickup');
var ClosePickupStrategy = require('./strategy.pickup.close');
var DropToContainerStrategy = require('./strategy.drop_to_container');
var DropToEnergyStorageStrategy = require('./strategy.drop_to_energyStorage');
var RegroupStrategy = require('./strategy.regroup');

class RoleCarry {
    constructor() {
        this.pickupStrategy = new ClosePickupStrategy(RESOURCE_ENERGY, 5);
        this.loadStrategies = [
            new PickupStrategy(undefined, (creep)=>((d)=>(d.amount > 50))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> ((s)=>s.room.isHarvestContainer(s))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> ((s)=>s.pos.getRangeTo(creep) < 2)),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_LINK, (creep)=>((s)=>( s.energy && s.room.storage && (s.pos.getRangeTo(s.room.storage) < 5)))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
            new LoadFromContainerStrategy(LoadFromContainerStrategy.ANY_MINERAL, STRUCTURE_CONTAINER/*
             ,                (s)=>(
             (!(s.room.memory.harvestContainers) || (s.room.memory.harvestContainers && (s.room.memory.harvestContainers.indexOf(s.id) >= 0))))*/)];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
            // new DropToContainerStrategy(RESOURCE_ENERGY,STRUCTURE_LINK),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> {
                return ((s)=>!s.room.isHarvestContainer(s));
            })
        ];
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'fill';
        this.regroupStrategy = new RegroupStrategy(COLOR_GREY);
        util.indexStrategies(this.loadStrategies);
        util.indexStrategies(this.unloadStrategies);
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
                strategy = _.find(this.loadStrategies, (strat)=>(strat.accepts(creep)));
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
                strategy = _.find(this.unloadStrategies, (strat)=>(strat.accepts(creep)));
            }
            // creep.log(util.strategyToLog(strategy));
            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
            } else {
                this.onNoUnloadStrategy(creep);
                // creep.log('no unloadStrategy');
                return;
            }
            delete creep.memory['unload_container'];
        }
    }

    onNoLoadStrategy(creep) {
        // creep.log('no load strategy');

    }

    onNoUnloadStrategy(creep) {
        this.regroupStrategy.accepts(creep);
    }
}

module.exports = RoleCarry;
