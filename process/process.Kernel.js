var _ = require('lodash');
var Process = require('./process');

/**
 * @typed {NEW|READY|WAITING|RUNNING|TERMINATED} Status
 */

/**
 * @property {string} id
 * @property {string} [parentid]
 * @property {string} priority
 * @property {Object} state
 * @property {Status} status
 */
class Kernel extends Process {
    /**
     **/
    constructor(state) {
        super(state);
    }

    run() {
    }
}
module.exports = Kernel;
Kernel.TYPE = 'kernel';
