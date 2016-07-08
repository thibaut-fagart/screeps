var Process = require('./process');

/**
 * locks a source and a container near it if possible
 * state : room, source, container, creep
 */
class HarvestProcess extends Process {
    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {int} subpriority
     */
    constructor(parent, subpriority) {
        super('harvest',parent, subpriority);
    }
    
    requiresNew() {
        
    }
}

module.exports = HarvestProcess;