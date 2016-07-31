var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var PickupStrategy = require('./strategy.pickup');
var BuildStrategy = require('./strategy.build');


class RoleBuilder {
    constructor() {
        this.loadStrategies = [
            new PickupStrategy(RESOURCE_ENERGY, (creep)=>((d)=>(d.pos.getRangeTo(creep)< 5))),
            new LoadFromContainerStrategy(RESOURCE_ENERGY, undefined, (creep)=> ((s)=>s.pos.getRangeTo(creep) < 5)) ,
            new LoadFromContainerStrategy(RESOURCE_ENERGY,  undefined /*,(creep)=>((s)=>([STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION].indexOf(s.structureType) < 0))*/),
            new PickupStrategy(RESOURCE_ENERGY),
            new HarvestEnergySourceStrategy()];
        this.buildStrategy = new BuildStrategy();
        this.BUILD_TARGET = 'buildtarget';
    }

    resign(creep) {
        creep.log('resigning ?');
        creep.memory.role = 'upgrader';
    }

/*
    findTarget(creep) {
        var target = util.objectFromMemory(this.BUILD_TARGET);
        if (!target) {
            // console.log("finding target for  ", creep.name);
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES).sort((c)=> -(c.progress / c.progressTotal));
            if (targets.length) {
                target = targets[0];

                creep.memory[this.BUILD_TARGET] = target.id;
            }
        }
        return target;
    }
*/

    /** @param {Creep} creep **/
    run(creep) {
        if (creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            delete creep.memory[util.CURRENT_STRATEGY];
        }
        if (!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
            creep.memory.building = true;
            delete creep.memory.source;
            delete creep.memory.pickupSource;
            util.setCurrentStrategy(creep, null);
            delete creep.memory[this.buildStrategy.BUILD_TARGET];
        }

        if (creep.memory.building) {
            if (!this.buildStrategy.accepts(creep)) {
                this.resign(creep);
            }
        } else {
            let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);

            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=> (strat.accepts(creep)));
            }

            if (strategy) {
                util.setCurrentStrategy(creep, strategy);
                // creep.log('strategy ', strategy.constructor.name);
            } else {
                // creep.log('no loadStrategy');
            }
        }
    }
}

module.exports = RoleBuilder;