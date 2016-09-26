var Process = require('./process');

/**
 * moves energy from
 * - the sources to storage
 * - the storage to spawn/extensions
 * - drops to storage
 * - storage to towers
 * - storage to labs
 *
 */
class Distributor extends Process {
    /**
     *
     * @param {string} parent if null, this is the root process
     */
    constructor(parent) {
        super(parent);
    }

}

module.exports = Distributor;