var Process = require('./process');

/**
 */
class Upgrader extends Process {
    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {int} subpriority
     */
    constructor(parent) {
        super(parent);
    }

}

module.exports = Upgrader;