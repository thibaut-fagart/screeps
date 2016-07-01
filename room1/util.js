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
        let reserved = creep.room.memory.reserved || {};
        let old = reserved[object.id];
        if (Game.getObjectById(old)) {
            creep.room.memory.reserved = reserved;
            return true;
        } else {
            return false;
        }
    }
    isReserved(object) {
        let reserved = creep.room.memory.reserved || {};
        let old = reserved[object.id];
        if (!old && Game.getObjectById(old)) {
            delete reserved[object.id];
            old = undefined;
        }
        return !old;
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
        if (strategy) {
            strategy = strategy.accepts(creep);
        }
        return strategy ;

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

}
module.exports = new Util();
