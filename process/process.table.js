var _ = require('lodash');
/**
 *
 */
class ProcessTable {
    constructor() {
        this.processes = [];
    }

    /**
     * @return {string[]} array of serialized processes
     */
    save() {
        let array = [];
        this.processes.forEach((p)=> array.push(ProcessTable.save(p)));
        return array;
    }

    /**
     *
     * @param {Process} process
     */
    register(process) {
        this.processes.push(process);
        this.processes = this.processes.sort((p)=> p.priority);
        return process;
    }

    /**
     *
     * @param {Process} process
     * @returns {Process}
     */
    getParent(process) {
        return this.processes.find((p)=>p.id === process.parentid);
    }
    /**
     *
     * @param {Process} process
     * @returns {Process}
     */
    getChildren(process) {
        return _.values(this.processes).filter((p)=>p.parentid === process.id);
    }
    /**
     *
     * @param {string} pid
     * @returns {Process}
     */
    get(pid) {
        return this.processes.find((p)=>p.id === pid);
    }
    /**
     *
     * @param {Object[]} array
     */
    load(array) {
        this.processes = [];
        _.forEach(array,(o) => {
            let process = ProcessTable.loadProcess(o);
            process.processTable = this;
            this.processes.push(process);
        });
        this.processes = this.processes.sort((p)=> p.priority);
        return this;
    }

    /**
     *
     * @param {Process} process
     */
    static save(process) {
        "use strict";

        process.type = process.constructor.name;
        delete process.processTable;
        return process;
    }
    static load(object) {
        let table = new ProcessTable();
        return table.load(object);
    }
    /**
     *
     * @param {Object} object
     * @returns {Process}
     */
    static loadProcess(object) {
        'use strict';
        let file;
        let type = object.type;
        if (/Process$/.exec(type)) {
            file = './process';
        } else {
            file = './process.'+[type];
        }
        /** {Process}*/
        let clazz = require(file);
        let process = new clazz(object);
        // process.state = object;
        return process;
    }
}

module.exports = ProcessTable;