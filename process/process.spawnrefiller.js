var Process = require('./process');

/**
 */
class SpawnRefiller extends Process {
    /**
     *
     * @param {string} parent if null, this is the root process
     */
    constructor(parent) {
        super(parent);
    }

}

module.exports = SpawnRefiller;