var State = require('./state.js');
/**
 * @property {State[]} states
 */
class Role {
    constructor() {
        this.states = {};
    }

    /**
     *
     * @param {State} state
     */
    addState(state) {
        if (_.isEmpty(this.states)) {
            this.states['initial'] = state;
        }
        this.states[state.name] = state;
    }

    /** @param {string|Creep} creepOrStrategyName
     * @param {Strategy[]) candidates
     * @return {Strategy}**/
    restoreStrategy(creepOrStrategyName, candidates) {
        let stratname = (creepOrStrategyName instanceof Creep) ? creepOrStrategyName.memory.currentStrategy : creepOrStrategyName;

        return (stratname) ?
            _.find(candidates, (s)=>(s.name === stratname)) : null
    }

    /** @param {Creep} creep **/
    run(creep) {
        /*
         restore state
         check transitions
         find previous strategy
         try executing it again, if failed try finding another strategy
         */
        
        let state= this.states[creep.memory.state|| 'initial'] ;
        this.states[state];
    }
}

module.exports = Role;