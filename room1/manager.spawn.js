var _ = require('lodash');
class SpawnManager{
    
    constructor() {
        this.requireQueue = {};
        this.requestQueue = {};
        this.whenPossible = {};
    }

    /**
     * @typedef {Object} Memory
     * @property {string} role
     */
    /**
     *  normal priority
     *  
     * @param {number} needByTick
     * @param {Memory} memory
     */
    request (needByTick, memory) {
        
    }
    
    /**
     * This MUST be done, and is prioritized over @requests or @whenPossible
     * @param {number} needByTick
     * @param {Memory} memory
     */
    require(needByTick,memory) {
        
    }

    /**
     * 
     * @param {Memory} memory
     */
    whenPossible(memory) {
        
    }

}

module.exports = SpawnManager;