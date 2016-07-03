var _ = require('lodash');
class BaseStrategy {
    constructor() {
    }

    clearMemory(creep) {
        console.log("base clear", this.name, creep);
    }

    /**
     *
     * @param {Object}state
     * @return {true|false}
     */
    acceptsState(state) {
        return state.name == this.constructor.name;
    }
    saveState() {
        return {};
    }
    accepts(creep) {
        return true;
    }
}


module.exports = BaseStrategy;