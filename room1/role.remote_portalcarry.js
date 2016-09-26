var _ = require('lodash');
var util = require('./util');
var RoleRemoteCarry = require('./role.remote.carry');

class RoleRemotePortalCarry extends RoleRemoteCarry {
    constructor() {
        super();
    }


    /**
     * creep memory : homeroom, portal_room, final_room
     * on the way to portal : carry ===0 ,
     * @param creep
     */
    init(creep) {
        creep.memory.action = 'go_remote_room';
        creep.memory.homeroom = creep.room.name;
        creep.memory.remoteMining = creep.memory.remoteMining || _.isString(creep.room.memory.remoteMining) ? creep.room.memory.remoteMining : creep.room.memory.remoteMining[0];
        if (!creep.memory.remoteRoom && creep.room.memory.remoteMining) {
            creep.memory.remoteRoom = _.isString(creep.room.memory.remoteMining) ? creep.room.memory.remoteMining : creep.room.memory.remoteMining[0];
        }

    }

    /** @param {Creep} creep **/
    run(creep) {
        let carry = _.sum(creep.carry);
        creep.memory.tasks = creep.memory.tasks || [];
        if (creep.room.name === creep.memory.portal_room) {
            if (carry === 0) {
                creep.memory.tasks.push({name: 'GoThroughPortal', args: {room: creep.room.name}});
            } else {
                creep.memory.tasks.push({name: 'MoveToRoom', args: {room: creep.memory.homeroom}});
            }
        } else if (creep.room.name === creep.memory.final_room) {
            if (carry === creep.carryCapacity) {
                creep.log('going back to portal');
                creep.memory.tasks.push({name: 'GoThroughPortal', args: {room: creep.room.name}});
            } else {
                // load up
                // creep.log('no pickup');
                let strategy = util.getAndExecuteCurrentStrategy(creep, this.loadStrategies);
                // creep.log('no previous strategy');
                if (!strategy) {
                    strategy = _.find(this.loadStrategies, (strat)=>(strat.accepts(creep)));
                }
                if (strategy) {
                    // creep.log('strategy', strategy.constructor.name);
                    util.setCurrentStrategy(creep, strategy);
                } else {
                    //creep.log('no loadStrategy');
                    this.regroupStrategy.accepts(creep);
                    return false;
                }
            }
        } else if (creep.room.name === creep.memory.homeroom) {
            if (carry === 0) {
                if (!this.ensureYoungEnoughForAnotherTrip(creep, creep.memory.portal_room)){
                    creep.memory.tasks.push({name: 'MoveToRoom', args: {room: creep.memory.portal_room}});
                }
            } else {
                // unload
                // creep.log('home, unloading');
                let strategy = util.getAndExecuteCurrentStrategy(creep, this.unloadStrategies);
                if (!strategy) {
                    strategy = _.find(this.unloadStrategies, (strat)=>(strat.accepts(creep)));
                    // creep.log('stragegy?', strategy);
                }
                if (strategy) {
                    // creep.log('stragegy?', strategy);
                    util.setCurrentStrategy(creep, strategy);
                } else {
                    util.setCurrentStrategy(creep, null);
                }

            }

        }
        creep.log('tasks', JSON.stringify(creep.memory.tasks));
    }

}

require('./profiler').registerClass(RoleRemotePortalCarry, 'RoleRemotePortalCarry');
module.exports = RoleRemotePortalCarry;