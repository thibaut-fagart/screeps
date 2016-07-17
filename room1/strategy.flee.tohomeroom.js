var _ = require('lodash');
var BaseStrategy = require('./strategy.base');
var util = require('./util');

class FleeToHomeRoomStrategy extends BaseStrategy {
    constructor(range) {
        super();
        this.range = range || 50;
    }
    clearMemory(creep) {
        delete creep.memory[this.path];
    }
    findHomeExit(creep) {
        return util.findExit(creep, creep.memory.homeroom, 'exitToHome');
    }


    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        if (creep.memory.homeroom &&  creep.room.name !== creep.memory.homeroom) {
            let hostiles = creep.pos.findInRange(FIND_HOSTILE_CREEPS, this.range) ;
            // if(creep instanceof Creep) creep.log('hostiles', hostiles.length);
            if (hostiles.length) {
                var exit = this.findHomeExit(creep);
                creep.memory.exitToHome = exit;
                creep.moveTo(exit.x, exit.y, {reusePath: 50});
                return true;

            }
        }
        if (creep.room.name === creep.memory.homeroom) {
            delete creep.memory.exitToHome;
        }
        return false;
    }

    /** @param {Creep||StructureTower} creep
     * @param {Creep} hostile
     * **/
    setRemoteTarget(creep, hostile) {
        let mymem = this.myMem(creep);
        mymem[this.path] = hostile.id;

    }
    /** @param {Creep||StructureTower} creep
     * @return {Creep} hostile
     * **/
    getRemoteTarget(creep) {
        return util.objectFromMemory(this.myMem(creep), this.path);
    }

    /** @param {Creep||StructureTower} creep**/
    myMem(creep) {
        return (creep.memory instanceof Function) ? creep.memory() : creep.memory;
    }
}

module.exports = FleeToHomeRoomStrategy;