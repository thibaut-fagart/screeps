var _ = require('lodash');
class Util {

    constructor() {
        this.CURRENT_STRATEGY = 'strategy';
        this.currentid = Memory.uuid|| 0;
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
     * @param reason
 * @returns {boolean} true if object is not already reserved
     */
    reserve(creep, object, reason) {
        if (object && !this.isReserved(creep, object, reason)) {
            let reserved = this.reservations(creep, reason);
            reserved[object.id] = creep.id;
            // creep.log('reserved',object.id)
            return true;
        } else {
            return false;
        }
    }

    reservations(creep, reason) {
        let reserved = creep.room.memory.reserved = creep.room.memory.reserved || {};
        if (reason) {
            reserved[reason] = reserved[reason] || {};
            reserved = reserved[reason];
        }
        return reserved;

    }
    /**
     * true if object is already reserved by some other creep
     * @param creep
     * @param object
     * @param reason
     * @returns {boolean}
     */
    isReserved(creep, object, reason) {
        if (!object) return false;

        let reserved = this.reservations(creep, reason);
        let owner = reserved[object.id];
        if (owner && !Game.getObjectById(owner)) {
            delete reserved[object.id];
            owner = null;
        }
        // if (owner) creep.log('testing lock', object, owner);
        return (owner && owner !== creep.id)?true:false;
    }

    release(creep, object, reason) {
        // creep.log('releasing ?', object);
        if (!object) return;
        let reserved = this.reservations(creep, reason);
        delete  reserved[(typeof object === 'string'  ) ? object : object.id];
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
        let stratAndParams = {};
        if ('string' == typeof s || 'undefined' == typeof s) {
            stratAndParams.name = s;
        } else {
            stratAndParams = s;
        }
        var strategy = _.find(candidates, (strat)=> strat.constructor.name === stratAndParams.name && strat.acceptsState(stratAndParams.state));
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
        if (strategy) creep.memory[this.CURRENT_STRATEGY] = {
            name: strategy.constructor.name,
            state: strategy.saveState()
        };
        else delete creep.memory[this.CURRENT_STRATEGY];
    }

    strategyToLog(strategy) {
        return (strategy ? strategy.constructor.name : 'none');
    }

    findExit(creep, room, memoryName) {
        var exit;
        if (!creep.room.memory[memoryName]) { // todo refresh  exit every once in a while ?
            creep.log("finding exit to", room);
            var exitDir = creep.room.findExitTo(room);
            exit = creep.pos.findClosestByPath(exitDir); // TODO cache
            creep.room.memory[memoryName] = JSON.stringify(exit);
        } else {
            exit = JSON.parse(creep.room.memory[memoryName]);
        }
        return exit;
    }

    /**
     * @typedef {Object} Roster
     */
    /**
     *
     * @param {Room|string} [room]
     * @param {Function} predicate
     * @return {Roster}
     */
    roster(room, predicate) {
        if (room) {
            // console.log(typeof room);
            if ('string' === typeof room) {
                room = Game.rooms[room];
                if (!room) return {};
            }
        }
        // console.log('room name', (room?room.name:'null'));

        let creeps = (room || predicate) ? 
            (predicate?
                room.find(FIND_MY_CREEPS, {filter:predicate})
                :room.find(FIND_MY_CREEPS)) : Game.creeps;
        return _.countBy(creeps, (c) => c.memory.role);
    }

    /**
     *
     * @param {string} [id]
     */
    uuid(id) {
        if(id) {
            return id + '.' + this.currentid++;
        } else {
            return this.currentid++;
        }
    }
}
module.exports = new Util();
