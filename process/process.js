var util = require('./util');
var _ = require('lodash');


/**
 * @property {string} id
 * @property {string} [parentid]
 * @property {string} priority
 * @property {Object} state
 * @property {Status} status
 */
class Process {
    /**
     * @typed {Process.STATUS_NEW|Process.STATUS_READY|Process.STATUS_WAITING|Process.STATUS_RUNNING|Process.STATUS_TERMINATED} Status
     */
    /**
     *
     * @param {string|Object} [parent] if null, this is the root process. if an object, it's a load
     * @param {string} id
     */
    constructor(parent, id) {
        if (typeof parent === 'object') {
            console.log('restoring', JSON.stringify(parent));
            // debugger;
            _.merge(this, parent);
            if (!this.requestedCreeps) {
                // debugger;
                this.requestedCreeps = [];
            }
        } else {
            console.log('creating', JSON.stringify(parent));
            this.parentid = parent ? (('string' === typeof parent) ? parent : parent.id) : undefined;
            this.id = id || util.uuid(this.parentid);
            this.creeps = [];
            this.requestedCreeps = [];
            this.locks = [];
            this.status = Process.STATUS_NEW;
            this.creepsUpdated = -1;
            this.processTable = undefined;
        }
    }


    getCreeps() {
        let ret = [];
        this.creeps.forEach((id)=> {
            let creep = Game.getObjectById(id);
            if (creep) ret.push(creep);
        });
        if (this.creepsUpdated !== Game.time) {
            // debugger;
            this.creeps = ret.map((c)=>c.id);
        }
        return ret;
    }

    /**
     * replaced by a lookup in the process table
     * @param id
     */
    lookup(id) {
    }

    load(state) {
        _.keys(state).forEach((k)=> this[k] = state[k]);
        this.loaded();
        return this;
    }

    /**
     *
     * @param {Object} spec as in patterns
     * @param {Process} owner
     */
    requestCreep(spec, owner) {
        let parent = this.processTable.getParent(this);
        if (parent) {
            let requestId = parent.requestCreep(spec, owner);
            // debugger;
            if (owner === this && requestId) {
                this.log('request accepted', requestId);
                this.requestedCreeps.push(requestId);
            }
            return requestId;
        } else {
            this.log(`requestCreep[${spec.name}] , no parent`);
            return undefined;
        }

    }

    creepRequestProcessed(requestId, creepName) {
        this.log(`requested Creep being built ${requestId}, ${creepName}`);
        // debugger;
        this.creeps.push(creepName);
        _.pull(this.requestedCreeps, requestId);
    }


    /**
     *
     * @param {string} requestId
     */
    requestCanceled(requestId) {
        // debugger;
        this.log('requestCanceled', requestId, 'not overridden');
        _.pull(this.requestedCreeps, requestId);
    }

    isValid() {

    }

    /**
     *
     * @param {ProcessTable}processTable
     */
    run(processTable) {

    }

    /**
     * called after reloading from memory
     */
    loaded() {

    }

    log() {
        console.log([this.type, this.id].concat(Array.prototype.slice.call(arguments)));
    }
}
Process.STATUS_NEW = 'NEW';
Process.STATUS_READY = 'READY';
Process.STATUS_WAITING = 'WAITING';
Process.STATUS_RUNNING = 'RUNNING';
Process.STATUS_TERMINATED = 'TERMINATED';

module.exports = Process;