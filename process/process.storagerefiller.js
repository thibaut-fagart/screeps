var Process = require('./process');

/**
 */
class StorageRefiller extends Process {
    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {int} subpriority
     */
    constructor(parent, subpriority) {
        super('storagefiller',parent, subpriority);
    }

}

module.exports = StorageRefiller;