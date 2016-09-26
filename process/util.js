var _ = require('lodash');
class Util {

    constructor() {
        this.currentid = Memory.uuid || 0;
        this.tickId = [Game.time, 0];
        this.reactions = reverseReactions();
    }


    /**
     *
     * @param {string} [id]
     */
    uuid(id) {
        // console.log(new Error().stack);
        let newid = Memory.uuid = (Memory.uuid || 0) + 1;
        if (id) {
            return id + '.' + newid;
        } else {
            return ''+newid;
        }
    }
    tickUuid() {
        if (this.tickId[0]!==Game.time) {
            this.tickId = [Game.time, 0];
        }
        this.tickId[1] = this.tickId[1] + 1;
        return this.tickId[1];
    }
}
function reverseReactions() {
    'use strict';
    let result = {};
    _.keys(REACTIONS).forEach((min1)=> {
        let temp = REACTIONS[min1];
        _.keys(temp).forEach((min2)=> {
            result[temp[min2]] = [min1, min2];
        });
    });
    return result;
}
module.exports = new Util();
