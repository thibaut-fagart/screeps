var _ = require('lodash');
var Strategy = require('./strategy.base');
var util = require('./util');
global._ = require('lodash');
class Extend extends Strategy {
    constructor() {
        super();
    }

}
class Extend2 extends Strategy {
    constructor() {
        super();
    }

    acceptsState(state) {
        return super.acceptsState(state) && state.extend && state.extend == 'a'
    }
}

console.log('base', new Strategy().acceptsState({name: 'Strategy'}));
console.log('extended', new Extend().acceptsState({name: 'Extend'}));
console.log('expect true ', util.getAndExecuteCurrentStrategy({memory: {strategy: 'Strategy'}}, [new Strategy()]));
console.log('expect false', util.getAndExecuteCurrentStrategy({memory: {strategy: 'Extend'}}, [new Strategy()]));
console.log('expect true', util.getAndExecuteCurrentStrategy({memory: {strategy: 'Extend2', state:{extend:'a'}}}, [new Extend()]));
console.log('expect false', util.getAndExecuteCurrentStrategy({memory: {strategy: 'Extend2'}}, [new Extend2()]));
console.log('expect false', util.getAndExecuteCurrentStrategy({memory: {strategy: 'Extend2', state: {extend:'b'}}}, [new Extend2()]));