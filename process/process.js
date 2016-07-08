var util = require('./../room1/util');
var _ = require('lodash');

/**
 *
 * @type {string}
 */

/**
 * @property {string} id
 * @property {string} [parentid]
 * @property {string} priority
 * @property {Object} state
 * @property {Status} status
 */
module.exports = class Process {
    /**
     * @typed {NEW|READY|WAITING|RUNNING|TERMINATED} Status
     */
    const NEW = 'NEW ', READY = 'READY', WAITING = 'WAITING', RUNNING = 'RUNNING', TERMINATED = 'TERMINATED';
    /**
     *
     * @param type
     * @param {Process} [parent] if null, this is the root process
     * @param {int} [subpriority]
     * @param {string} id
     */
    constructor(type, parent, subpriority, id) {
        this.parentid = parent ? (('string' === typeof parent) ? parent : parent.id) : '';
        this.id = id || util.uuid(this.parentid);
        this.priority = parent ? (parent.priority + (subpriority ? '.' + subpriority : '')) : '0';
        this.creeps = [];
        this.locks = [];
        this.status = NEW;
        this.type = type;

    }

    load(state) {
        
        _.keys(state).forEach((k)=> this[k] = state[k]);
        return this;
    }
    /**
     *
     * @param {Object} minBodyParts BODYPARHT => int
     */
    requestCreep(minBodyParts) {

    }

    isValid() {

    }

    /**
     * @return Status
     */
    run() {

    }
};


