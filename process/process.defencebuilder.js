var Process = require('./process');

/**
 */
class DefenceBuilder extends Process {
    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {int} subpriority
     */
    constructor(parent, subpriority) {
        super('defencebuilder',parent, subpriority);
    }

}

module.exports = DefenceBuilder;