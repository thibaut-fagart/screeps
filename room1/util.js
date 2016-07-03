var _ = require('lodash');
class Util {
    constructor() {
        this.CURRENT_STRATEGY = 'strategy';
    }

    /**
     * @param {Object} memoryRoot
     * @param {string} path
     * @param {Function} memory is cleared if this doest not validate
     *  @return {Object}
     */
    objectFromMemory(memoryRoot, path, validator) {
        if (!memoryRoot || !path) {
            return null;
        }
        let id = memoryRoot[path];
        if (id) {
            let o = Game.getObjectById(id);
            if (o && (!validator || validator(o))) {
                return o;
            } else {
                delete memoryRoot[path];
            }
        }

    }

    /**
     * 
     * @param creep
     * @param object 
     * @returns {boolean} true if object is not already reserved
     */
    reserve(creep, object) {
        if (object && !this.isReserved(creep,object)) {
            creep.room.memory.reserved[object.id] = creep.id;
            // creep.log('reserved',object.id)
            return true;
        } else {
            return false;
        }
    }
    isReserved(creep, object) {
        if (!object) return false;
        let reserved = creep.room.memory.reserved || {};
        creep.room.memory.reserved = reserved;
        let old = reserved[object.id];
        if (old && !Game.getObjectById(old)) {
            delete reserved[object.id];
            old = null;
        }
        return old;
    }

    release (creep, object) {
        // creep.log('releasing ?', object);
        if (!object) return;
        let reserved = creep.room.memory.reserved || {};
        delete  reserved[(typeof object === 'string'  )? object: object.id];
        // creep.log('released',object.id)
    }
    /**
     *
     * @param {Creep} creep
     * @param {Object[]}candidates
     * @returns {T|*}
     */
    getAndExecuteCurrentStrategy(creep, candidates) {
        let s = creep.memory[this.CURRENT_STRATEGY];
        let stratAndParams= {};
        if ('string' == typeof s || 'undefined' == typeof s) {
            stratAndParams.name = s;
        } else {
            stratAndParams = s;
        }
        var strategy = _.find(candidates, (strat)=> strat.acceptsState(stratAndParams));
        if (strategy && strategy.accepts(creep)) {
            return strategy;
        } else {
            return null;
        }
    }

    /**
     *
     * @param {Creep} creep
     * @param strategy
     */
    setCurrentStrategy(creep, strategy) {
        if (strategy) creep.memory[this.CURRENT_STRATEGY] = {name: strategy.constructor.name, state: strategy.saveState()};
        else delete creep.memory[this.CURRENT_STRATEGY];
    }
    strategyToLog(strategy) {
        return (strategy ? strategy.constructor.name : 'none');
    }
    
    findExit(creep, room, memoryName) {
        var exit ;
        if (!creep.memory[memoryName]) { // todo refresh  exit every once in a while ? 
            creep.log("finding exit to", room);
            var exitDir = creep.room.findExitTo(room);
            exit = creep.pos.findClosestByPath(exitDir); // TODO cache
            creep.memory[memoryName] = JSON.stringify(exit);
        } else {
            exit = JSON.parse(creep.memory[memoryName]);
        }
        return exit;
    }

}
module.exports = new Util();
