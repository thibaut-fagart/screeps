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
        this.travelingPickupStrategy = new ClosePickupStrategy(RESOURCE_ENERGY, 1);
        this.loadStrategies = [
            new PickupStrategy(undefined, (creep)=>((d)=>(d.amount > 50))),
            new LoadFromContainerStrategy(undefined, STRUCTURE_CONTAINER, (creep)=>(s=>s.room.isHarvestContainer(s))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, STRUCTURE_STORAGE),
        ];
        this.unloadStrategies = [
            new DropToEnergyStorageStrategy(STRUCTURE_TOWER),
            new DropToEnergyStorageStrategy(STRUCTURE_SPAWN),
            new DropToEnergyStorageStrategy(STRUCTURE_EXTENSION),
            new DropToContainerStrategy(RESOURCE_ENERGY, STRUCTURE_CONTAINER, (creep)=> {
                if (creep.carry.energy)  return ((s)=>!s.room.isHarvestContainer(s) && !s.room.glanceForAround(LOOK_STRUCTURES, s.pos, 1, true).map(l=>l.structure).find(s=>s.structureType === STRUCTURE_LINK));
                else return ()=>false;
            }),
            new DropToContainerStrategy(undefined, STRUCTURE_STORAGE),
        ];
        this.ACTION_UNLOAD = 'unload';
        this.ACTION_FILL = 'load';
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
        } else if (_.sum(creep.carry) == creep.carryCapacity && creep.memory.action != this.ACTION_UNLOAD) {
            creep.memory.action = this.ACTION_UNLOAD;
            let s = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
            if (s) {
                s.clearMemory(creep);
            }
            util.setCurrentStrategy(creep, null);
        }
        if (creep.memory.action == this.ACTION_FILL) {
            this.travelingPickupStrategy.accepts(creep);
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
            if (_.sum(creep.carry) < creep.carryCapacity) this.travelingPickupStrategy.accepts(creep);
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
        if (!creep.room.isValidParkingPos(creep, creep.pos)) {
            let pos = creep.room.findValidParkingPosition(creep, creep.pos, 1);
            util.moveTo(creep, pos,'park',{range:0});
        }
        // creep.log('no load strategy');

    }

    onNoUnloadStrategy(creep) {
        if (!creep.room.isValidParkingPos(creep, creep.pos)) {
            let pos = creep.room.findValidParkingPosition(creep, creep.pos, 1);
            creep.moveTo(pos);
        }
        // this.regroupStrategy.accepts(creep);
    }
}
require('./profiler').registerClass(RoleCarry, 'RoleCarry');

module.exports = RoleCarry;
