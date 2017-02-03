var _ = require('lodash');
class BaseStrategy {
    constructor() {
    }

    clearMemory(creep) {
        // console.log('base clear', this.name, creep);
    }

    /**
     *
     * @param {Object}state
     * @return {true|false}
     */
    acceptsState(state) {
        // if (state.name === this.constructor.name) {
        //     state = state.state;
        let stateKeys = _.keys(state);
        let myKeys = _.keys(this);
        let allKeys = _.union(stateKeys, myKeys);
        let diff = allKeys.find((k)=>this[k] !== state[k]);
        return !diff;
        // }
        // return false;

    }

    saveState() {
        return _.merge({}, this);
    }

    accepts(creep) {
        return true;
    }
}


require('./profiler').registerClass(BaseStrategy, 'BaseStrategy');
module.exports = BaseStrategy;