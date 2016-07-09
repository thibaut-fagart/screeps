var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;


require('../lib/mocks/gameStateGlobals')();

var role = require('./role.spawn');


describe('BaseStrategy', function () {
    "use strict";
    describe('save&load', function () {
        it('accepts correct state', function () {
            var BaseStrategy = require('./strategy.base');

            let s1 = new BaseStrategy();
            s1.val1 = "val";
            let state = JSON.parse(JSON.stringify(s1.saveState()));
            expect(s1.acceptsState(state), 'strategy should accept state').to.be.equal(true);
        })
    })
});

// return _.isEqual(this, state);

/*
console.log('base', new Strategy().acceptsState({name: 'Strategy'}));
console.log('extended', new Extend().acceptsState({name: 'Extend'}));
console.log('expect true ', util.getAndExecuteCurrentStrategy({memory: {strategy: 'Strategy'}}, [new Strategy()]));
console.log('expect false', util.getAndExecuteCurrentStrategy({memory: {strategy: 'Extend'}}, [new Strategy()]));
console.log('expect true', util.getAndExecuteCurrentStrategy({
    memory: {
        strategy: 'Extend2',
        state: {extend: 'a'}
    }
}, [new Extend()]));
console.log('expect false', util.getAndExecuteCurrentStrategy({memory: {strategy: 'Extend2'}}, [new Extend2()]));
console.log('expect false', util.getAndExecuteCurrentStrategy({
    memory: {
        strategy: 'Extend2',
        state: {extend: 'b'}
    }
}, [new Extend2()]));*/
