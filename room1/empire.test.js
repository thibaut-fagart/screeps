var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;

var Room = require('../ScreepsAutocomplete/Room');
var StructureController = require('../ScreepsAutocomplete/Structures/StructureController');
var Source = require('../ScreepsAutocomplete/Source');
var RoomPosition = require('../ScreepsAutocomplete/RoomPosition');
var StructureSpawn = require('../ScreepsAutocomplete/Structures/StructureSpawn');
var mocha = require('mocha');
var empire = require('./empire');
Memory = {stats: {}};
var realLedger = {
        'XUH2O': {'amount': 316761, 'goal': 277000},
        'XKHO2': {'amount': 42157, 'goal': 275000},
        'XGHO2': {'amount': 186297, 'goal': 275000},
        'XLHO2': {'amount': 147457, 'goal': 277000},
        'XZHO2': {'amount': 144189, 'goal': 275000},
        'XZH2O': {'amount': 13495, 'goal': 275000},
        'G': {'amount': 97873, 'goal': 55000},
        'energy': {'amount': 3059791, 'goal': 4000000},
        'XLH2O': {'amount': 57880, 'goal': 33000},
        'UL': {'amount': 31298, 'goal': 35000},
        'ZK': {'amount': 11159, 'goal': 35000},
        'H': {'amount': 175822, 'goal': 10000},
        'O': {'amount': 353679, 'goal': 10000},
        'K': {'amount': 83410, 'goal': 35534},
        'L': {'amount': 310902, 'goal': 0},
        'Z': {'amount': 26359, 'goal': 0},
        'X': {'amount': 9291, 'goal': 5000},
        'OH': {'amount': 33513, 'goal': 0},
        'UH': {'amount': 33230, 'goal': 0},
        'KO': {'amount': 125277, 'goal': 0},
        'LO': {'amount': 239289, 'goal': 1000},
        'ZH': {'amount': 36351, 'goal': 0},
        'ZO': {'amount': 68174, 'goal': 0},
        'GH': {'amount': 46085, 'goal': 0},
        'GO': {'amount': 38606, 'goal': 0},
        'UH2O': {'amount': 72104, 'goal': 0},
        'LHO2': {'amount': 60301, 'goal': 0},
        'GH2O': {'amount': 10755, 'goal': 6000},
        'GHO2': {'amount': 15915, 'goal': 0},
        'LH2O': {'amount': 23821, 'goal': 0},
        'ZH2O': {'amount': 81064, 'goal': 0},
        'U': {'amount': 340766, 'goal': 7187},
        'KHO2': {'amount': 5602, 'goal': 5000},
        'ZHO2': {'amount': 47241, 'goal': 0},
        'LH': {'amount': 70730, 'goal': 0},
        'UO': {'amount': 21430, 'goal': 0},
        'XGH2O': {'amount': 12767, 'goal': 20987}
    }
;
function globalLedger() {
    'use strict';
    var testLedger = {
        'ZHO2': {amount: 0, goal: 100000},
        'Z': {amount: 100000, goal: 0},
        'H': {amount: 100000, goal: 0},
        'O': {amount: 200000, goal: 0},
    };
    return  realLedger;
}
Game.time = 1000;
describe('auto-produce', function () {
    it('should find produceable reactions', function () {
        'use strict';
        Memory.stats = {ledger: {v: globalLedger()}};
        empire.updateProductions();
    });
});

