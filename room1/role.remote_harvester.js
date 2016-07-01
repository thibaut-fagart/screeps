var util = require('./util');
var HarvestEnergySourceStrategy = require('./strategy.harvest_source');
var HarvestEnergySourceToContainerStrategy = require('./strategy.harvest_source_to_container');
var DropToEnergyStorage = require('./strategy.drop_to_energyStorage');
var DropToContainerStrategy = require('./strategy.drop_to_container');

class RoleRemoteHarvester {
    constructor() {
        this.loadStrategies = [new HarvestEnergySourceToContainerStrategy(), new HarvestEnergySourceStrategy()];
        this.unloadStrategies = [new DropToContainerStrategy(RESOURCE_ENERGY), new DropToEnergyStorage()];
    }
    /*
    requires : remoteRoom=creep.room.remoteMining, homeroom = creep.room.name, homeroom, remoteSource
     */
    resign(creep) {
        creep.log("resigning");
        delete creep.memory.role;
        delete creep.memory.action; //{go_remote_room, load, go_home, unload}
        delete creep.memory.remoteRoom;
        delete creep.memory.homeRoom;
        delete creep.memory.remoteSource;
    }
    init (creep) {
        creep.memory.action = 'go_remote_room';
        creep.memory.homeroom = creep.room.name;
        creep.memory.remoteMining = creep.room.memory.remoteMining;
        if (!creep.memory.remoteRoom && creep.room.memory.remoteMining) {
            creep.memory.remoteRoom = creep.room.memory.remoteMining;
        }

    }
    findExit(creep, room, memoryName) {
        var exit ;
        if (!creep.memory[memoryName] || Game.time% 1000 ==0) {
            creep.log("finding exit to", room);
            var exitDir = creep.room.findExitTo(room);
            exit = creep.pos.findClosestByPath(exitDir); // TODO cache
            creep.memory[memoryName] = JSON.stringify(exit);
        } else {
            exit = JSON.parse(creep.memory[memoryName]);
        }
        return exit;

    }
    findHomeExit(creep) {
        return this.findExit(creep, creep.room.memory.remoteMining, 'homeExit');
    }
    findRemoteExit(creep) {
        return this.findExit(creep, creep.memory.homeroom, 'remoteExit');
    }
    getCurrentStrategy(creep, candidates) {
        let s = creep.memory[this.CURRENT_STRATEGY];
        let strat = _.find(candidates, (strat)=> strat.constructor.name == s);
        if (strat && !strat.accepts(creep))  {
            this.setCurrentStrategy(creep, strat = null);
        }
        return strat;

    }
    setCurrentStrategy(creep, strategy) {
        if (strategy) creep.memory[this.CURRENT_STRATEGY] = strategy.constructor.name;
        else delete creep.memory[this.CURRENT_STRATEGY];
    }

    /** @param {Creep} creep **/
    run (creep) {
        if (!creep.memory.homeroom) {
            creep.memory.homeroom = creep.room.name;
        }
        if (creep.memory.remotesource) {
            creep.memory.source = creep.memory.remotesource;
            delete creep.memory.remotesource;
        }
        if (!creep.memory.action) {
            this.init(creep)
        }
        if (creep.memory.action == 'go_remote_room' && creep.room.name != creep.memory.homeroom) {
            creep.memory.action = 'load';
            // creep.log('reached remote room',creep.memory.action)
        } else if (creep.memory.action == 'load' && creep.carry.energy == creep.carryCapacity) {
            creep.memory.action = 'go_home_room';
            // creep.log('full', creep.memory.action);
        } else if (creep.memory.action == 'go_home_room' && creep.room.name == creep.memory.homeroom) {
            creep.memory.action = 'unload';
            // creep.log('reached home room', creep.memory.action);
        } else if (creep.memory.action == 'unload' && creep.room.name == creep.memory.homeroom && creep.carry.energy == 0) {
            creep.memory.action = 'go_remote_room';
            // creep.log('empty',creep.memory.action);
        } else {
            // creep.log(JSON.stringify(creep.memory));
        }

        // creep.log(creep.memory.action);
        if (creep.memory.action == 'go_remote_room' && creep.room.name == creep.memory.homeroom) {
            if (!creep.room.memory.remoteMining) {
                creep.log("no remoteMining room");
                this.resign();
            } else {
                var exit = this.findHomeExit(creep);
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                // console.log("moving to homeExit ", );
            }
        }
        if (creep.memory.action == 'load' && creep.memory.remoteRoom == creep.room.name) {
            let strategy = this.getCurrentStrategy(creep, this.loadStrategies);
            if (!strategy) {
                strategy = _.find(this.loadStrategies, (strat)=>strat.accepts(creep));
            }
            if (strategy) {
                // creep.log('strategy', strategy.constructor.name);
                this.setCurrentStrategy(creep, strategy);
            } else {
                creep.log('no loadStrategy');
                return;
            }
        }
        if (creep.memory.action == 'go_home_room' && creep.room.name != creep.memory.homeroom) {
            var exit = this.findRemoteExit(creep);
            if (exit) {
                creep.moveTo(exit.x, exit.y,{reusePath: 50});
            } else {
                creep.log("no exit ?", creep.pos);
            }

            // console.log("moving to remoteExit ", );
        }
        if (creep.memory.action == 'unload' && creep.room.name == creep.memory.homeroom) {
            let strategy = this.getCurrentStrategy(creep, this.unloadStrategies);
            if (!strategy) {
                strategy = _.find(this.unloadStrategies, (strat)=>!(null == strat.accepts(creep)));
            }
            if (strategy) {
                this.setCurrentStrategy(creep, strategy);
            } else {
                creep.log('no unloadStrategy');
                return;
            }
        }
    }
}

module.exports = RoleRemoteHarvester;