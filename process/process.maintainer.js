var Process = require('./process');

/**
 */
class Maintainer extends Process {
    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {int} subpriority
     */
    constructor(parent, subpriority) {
        super('maintainer',parent, subpriority);
    }

}

module.exports = Maintainer;