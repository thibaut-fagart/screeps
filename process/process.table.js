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
        this.processes.forEach((p)=> array.push(ProcessTable.save(p)))
        return array;
    }

    /**
     *
     * @param {Process} process
     */
    register(process) {
        this.processes.push(process);
        this.processes = this.processes.sort((p)=> p.priority);
        if (process.parentid) {
            this.processes.find((p)=>p.id === process.parentid).children.push(process);
        }
        return process;
    }
    /**
     *
     * @param {Object[]} array
     */
    load(array) {
        this.processes = [];
        _.forEach(array,(o) => this.processes.push(ProcessTable.loadProcess(o)));
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
        "use strict";
        let file;
        let type = object.type;
        if (/Process$/.exec(type)) {
            file = './process';
        } else {
            file = './process.'+[type];
        }
        /** {Process}*/

        let process = new (require(file))().load(object);
        // process.state = object;
        return process;
    }

}

module.exports = ProcessTable;