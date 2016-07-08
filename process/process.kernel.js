var util = require('./../room1/util');
var _ = require('lodash');

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
module.exports = class Kernel {
    /**
     **/
    constructor() {
        super('kernel');
    }
    run() {
    }
};

