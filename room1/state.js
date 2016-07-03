var _ = require('lodash');
class State {

    /**
     * @typedef {Function} Trigger
     * @param {Object} context
     * @return {boolean}
     */
    /**
     * @typedef {Object} Transition
     * @param {string} event
     * @param {Trigger} trigger
     */
    /**
     *
     * @param name
     * @param {Transition[]} transitions
     */
    contructor(name, transitions) {
        this.name = name;
    }

    /**
     * 
     * @param creep
     * @return 
     */
    handle(creep) {
        
    }
}
module.exports = State;