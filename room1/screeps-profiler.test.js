var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;
// var it = require('mocha')({ui:'tdd'});
require('../lib/mocks/gameStateGlobals')();

var util = require('./util');
var profiler= require('./screeps-profiler');

describe('screeps-profiler', function () {
    it("should be profileable", function () {
        "use strict";
        Game.time = 10;
        let callback =()=>util.direction({x:1,y:1},{x:2,y:2})
        profiler.enable();
        profiler.wrap(callback);

    });
});
