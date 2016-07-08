var Process = require('./process');

/**
 */
class SpawnRefiller extends Process {
    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {int} subpriority
     */
    constructor(parent, subpriority) {
        super('spawnrefiller',parent, subpriority);
    }

}

module.exports = SpawnRefiller;