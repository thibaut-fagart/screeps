var util = require('./../room1/util');
var _ = require('lodash');

/**
 *
 * @type {string}
 */
_.merge(global,{STATUS_NEW: 'NEW', STATUS_READY : 'READY', STATUS_WAITING : 'WAITING', STATUS_RUNNING :'RUNNING', STATUS_TERMINATED :'TERMINATED'});


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
        this.status = STATUS_NEW;
        this.type = type;
        this.children=[];
    }

    /**
     * replaced by a lookup in the process table
     * @param id
     */
    lookup(id) {}
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
     * 
     * @param {ProcessTable}processTable
     */
    run(processTable) {
        
    }
};


