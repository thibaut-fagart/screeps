var Base = require('./strategy.base');
var util = require('./util');

class RegroupStrategy extends Base {
    constructor(flagcolor) {
        super();
        this.flagColor = flagcolor || COLOR_WHITE;
    }

    accepts(creep) {

        let stop = !!creep.room.find(FIND_FLAGS).filter((f)=>f.color === COLOR_WHITE).length;
        if (stop) creep.log('stop');
        return stop;

    }

}
module.exports = RegroupStrategy;