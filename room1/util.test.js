var _ = require('lodash');
global.Memory = {};
var chai = require('chai');
var expect = chai.expect;
// var it = require('mocha')({ui:'tdd'});
require('../lib/mocks/gameStateGlobals')();

var util = require('./util');

describe('util', function () {
    describe('findExit', function () {
        'use strict';
        it('', function () {
            let creep = new Creep();
            let room = new Room();
            creep.room = room;
            Creep.prototype.log = function () {
                console.log.apply(console, arguments);
            }
            room.memory = {};
            room.name = 'A';
            global.Game.map = {
                findRoute: function () {
                    return [{room: 'B', exit: 'left'}, {room: 'C', exit: 'left'}];
                }
            };
            Memory.rooms = {};
            Memory.rooms[creep.room.name] = creep.room.memory;
            // Memory.rooms['A']= {};
            // Memory.rooms['B']= {};
            Game.rooms['A'] = room;
            Game.rooms['B'] = new Room();
            let exit_A = new RoomPosition(0, 10, 'A');
            RoomPosition.prototype.findClosestByPath = function () {
                if (this.roomName === 'A') {
                    return exit_A;
                }
                else if (this.roomName === 'B') return new RoomPosition(10, 0, 'B');
            };
            creep.pos = new RoomPosition(10, 10, 'A');
            let result = util.findExit(creep, 'C');
            expect(result.x).to.equal(exit_A.x);
            expect(result.y).to.equal(exit_A.y);
            expect(result.roomName).to.equal(exit_A.roomName);
        });
    });
    describe('isReserved', function () {
        it('non locked objects should return false', function () {
            'use strict';

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            room.memory = {};
            let subject = {id: 'o'};

            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);

        });
        it('objects locked by me should return false', function () {
            'use strict';

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return true;
            };
            util.reserve(creep, subject, 'r');
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);

        });
        it('objects locked by others should return true', function () {
            'use strict';

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return true;
            };
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(true);

        });
        it('objects locked by dead should return false', function () {
            'use strict';

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return false;
            };
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);

        });
    });
    describe('release', function () {
        it('released locks should  be free', function () {
            'use strict';

            let creep = new Creep();
            let creep2 = new Creep();
            creep.id = '1';
            creep2.id = '2';
            let room = new Room();
            creep.room = room;
            creep2.room = room;
            creep.memory = {};
            creep2.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            util.reserve(creep, subject, 'r');
            Game.getObjectById = (id)=> {
                return true;
            };
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            expect(util.isReserved(creep2, subject, 'r'), 'lck should be free').to.equal(true);
            util.release(creep, subject, 'r');
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            expect(util.isReserved(creep2, subject, 'r'), 'lck should be free').to.equal(false);

        });
        it('objects locked by me should return false', function () {
            'use strict';

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return true;
            };
            util.reserve(creep, subject, 'r');
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            // expect(JSON.parse(childString), 'root save').to.deep.equal(child);

        });
        it('objects locked by others should return true', function () {
            'use strict';

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return true;
            };
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(true);
            // expect(JSON.parse(childString), 'root save').to.deep.equal(child);

        });
        it('objects locked by dead should return false', function () {
            'use strict';

            let creep = new Creep();
            creep.id = '1';
            let room = new Room();
            creep.room = room;
            creep.memory = {};
            room.memory = {};
            let subject = {id: 'o'};
            Game.getObjectById = (id)=> {
                return false;
            };
            util.reserve(creep, subject, 'r');
            creep.id = '2';
            expect(util.isReserved(creep, subject, 'r'), 'lck should be free').to.equal(false);
            // expect(JSON.parse(childString), 'root save').to.deep.equal(child);

        });
    });
    it('should be profileable', function () {
        'use strict';
        let f = (object)=>object.prototype ? object.prototype : (Object.getPrototypeOf(object) ? Object.getPrototypeOf(object) : object);
        console.log(JSON.stringify(Object.keys(f(util))));
        console.log(Object.getPrototypeOf(util) == util.prototype);
        console.log(Object.getPrototypeOf(util) == util.constructor);
        console.log(Object.getPrototypeOf(util));
        console.log(JSON.stringify(Object.getOwnPropertyNames(util)));
        // console.log(JSON.stringify(Object.keys(util.prototype)));
        console.log(JSON.stringify(Object.keys(util.constructor)));
        console.log(JSON.stringify(Object.keys(Object.getPrototypeOf(util))));
        console.log(JSON.stringify(Object.getOwnPropertyNames(Object.getPrototypeOf(util))));
        // console.log(JSON.stringify(Object.getOwnPropertyNames(Object.getPrototypeOf(util))));

    });
});
describe('findWalkableTiles', function () {
    "use strict";
    let room = new Room('test');
    let squares = {
        "12": {
            "21": [{"type": "terrain", "terrain": "wall"}],
            "22": [{"type": "terrain", "terrain": "wall"}],
            "23": [{"type": "terrain", "terrain": "wall"}]
        },
        "13": {
            "21": [{"type": "terrain", "terrain": "plain"}],
            "22": [{
                "type": "mineral",
                "mineral": {
                    "room": {
                        "name": "W52S41",
                        "mode": "world",
                        "energyAvailable": 9850,
                        "energyCapacityAvailable": 12900
                    },
                    "pos": {"x": 22, "y": 13, "roomName": "W52S41"},
                    "id": "579fab83b1f02a3b0cff002c",
                    "mineralType": "Z",
                    "mineralAmount": 31171,
                    "density": 3
                }
            }, {
                "type": "structure",
                "structure": {
                    "room": {
                        "name": "W52S41",
                        "mode": "world",
                        "energyAvailable": 9850,
                        "energyCapacityAvailable": 12900
                    },
                    "pos": {"x": 22, "y": 13, "roomName": "W52S41"},
                    "id": "580c677a8a4ea2104d9133bf",
                    "cooldown": 3,
                    "owner": {"username": "Finndibaen"},
                    "my": true,
                    "hits": 500,
                    "hitsMax": 500,
                    "structureType": "extractor"
                }
            }, {"type": "terrain", "terrain": "wall"}],
            "23": [{"type": "terrain", "terrain": "wall"}]
        },
        "14": {
            "21": [{
                "type": "creep",
                "creep": {
                    "room": {
                        "name": "W52S41",
                        "mode": "world",
                        "energyAvailable": 9850,
                        "energyCapacityAvailable": 12900
                    },
                    "pos": {"x": 21, "y": 14, "roomName": "W52S41"},
                    "id": "581f76b7f39956bf59ed284f",
                    "name": "mineralHarvester_W52S41_614",
                    "body": [{"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "work", "hits": 100}, {
                        "type": "work",
                        "hits": 100
                    }, {"type": "work", "hits": 100}, {"type": "move", "hits": 100}, {
                        "type": "move",
                        "hits": 100
                    }, {"type": "move", "hits": 100}, {"type": "move", "hits": 100}, {
                        "type": "move",
                        "hits": 100
                    }, {"type": "move", "hits": 100}],
                    "my": true,
                    "owner": {"username": "Finndibaen"},
                    "spawning": false,
                    "ticksToLive": 312,
                    "carryCapacity": 0,
                    "carry": {"energy": 0},
                    "fatigue": 0,
                    "hits": 4900,
                    "hitsMax": 4900
                }
            }, {
                "type": "structure",
                "structure": {
                    "room": {
                        "name": "W52S41",
                        "mode": "world",
                        "energyAvailable": 9850,
                        "energyCapacityAvailable": 12900
                    },
                    "pos": {"x": 21, "y": 14, "roomName": "W52S41"},
                    "id": "580c782ad20740f87ed129b5",
                    "store": {"energy": 0, "Z": 172},
                    "storeCapacity": 2000,
                    "ticksToDecay": 263,
                    "hits": 128800,
                    "hitsMax": 250000,
                    "structureType": "container"
                }
            }, {"type": "terrain", "terrain": "plain"}],
            "22": [{"type": "terrain", "terrain": "wall"}],
            "23": [{"type": "terrain", "terrain": "wall"}]
        }
    };


    util.findWalkableTiles(room, squares, {ignoreCreeps: true});
});
describe('reactions', function () {
    'use strict';
    let constants = require('../lib/mocks/constants');
    it('should work', function () {
        function reverseReactions() {
            'use strict';
            let result = {};
            _.keys(constants.REACTIONS).forEach((min1)=> {
                let temp = constants.REACTIONS[min1];
                _.keys(temp).forEach((min2)=> {
                    result[temp[min2]] = [min1, min2];
                });
            });
            return result;
        };
        console.log(JSON.stringify(reverseReactions()));
    });

});
describe('serializations', function () {
    'use strict';
    it('should serialize corrrectly', function () {
        let body = [MOVE, WORK, CARRY];
        expect(util.bodyToString(body)).to.be.equal('MWC');
    });
    it('should deserialize corrrectly', function () {
        let body = [MOVE, WORK, CARRY];
        expect(JSON.stringify(util.stringToBody('MWC'))).to.be.equal(JSON.stringify(body));
    });
    it('random tests', function () {
        for (let i = 0; i < 100; i++) {
            let bodyLength = Math.ceil(50 * Math.random());
            let body = [];
            for (let b = 0; b < bodyLength; b++) {
                body.push(BODYPARTS_ALL[Math.floor(BODYPARTS_ALL.length * Math.random())]);
            }
            let serialized = util.bodyToString(body);
            expect(JSON.stringify(util.stringToBody(serialized))).to.be.equal(JSON.stringify(body));

        }
    })
});

describe('stringbitarrays', function () {
    "use strict";
    // useable values : >34 && != 92
    it('test performance', function () {
        let act = {};
        Game.cpu={bucket: 10000};

        let start = new Date().getTime();
        for (let i = 0; i < 100000; i ++) {
            let o = {idle: Math.random() > 0.5 ? 1 : 0};
            util.recordActivityString(act, o, 1500,i);
            // util.recordActivity(act, o, 1500,i);
        }
        let end = new Date().getTime();
        console.log(`recount, 100K , string => ${end - start}\n`);
    });
    it('test performance', function () {
        let act = {};
        Game.cpu={bucket: 10000};

        let start = new Date().getTime();
        for (let i = 0; i < 100000; i ++) {
            let o = {idle: Math.random() > 0.5 ? 1 : 0};
            // util.recordActivityString(act, o, 1500,i);
            util.recordActivity(act, o, 1500,i);
        }
        let end = new Date().getTime();
        console.log(`recount, 100K , int array => ${end - start}\n`);
    });
    it('test performance', function () {
        let act = {};
        Game.cpu={bucket: 100};

        let start = new Date().getTime();
        for (let i = 0; i < 100000; i ++) {
            let o = {idle: Math.random() > 0.5 ? 1 : 0};
            util.recordActivityString(act, o, 1500,i);
            // util.recordActivity(act, o, 1500,i);
        }
        let end = new Date().getTime();
        console.log(`delta, 100K , string => ${end - start}\n`);
    });
    it('test performance', function () {
        let act = {};
        Game.cpu={bucket: 100};

        let start = new Date().getTime();
        for (let i = 0; i < 100000; i ++) {
            let o = {idle: Math.random() > 0.5 ? 1 : 0};
            // util.recordActivityString(act, o, 1500,i);
            util.recordActivity(act, o, 1500,i);
        }
        let end = new Date().getTime();
        console.log(`delta, 100K , int array => ${end - start}\n`);
    });

    it('test charCodeAt', function () {
        let char = String.fromCharCode(Math.floor(Math.random() * 0x8000) | 0x8000);
        let start = new Date().getTime();
        for (let i = 0; i < 100000; i++) {
            for (let j = 0; j < 100; j++) {
                char.charCodeAt(0);
            }
        }
        let end = new Date().getTime();
        console.log('1500*100K charCodeAt', (end - start));
    });

    it('test', function () {
        Game.cpu={bucket: 100};
        let store = {};
        for (let i = 0; i < 1500; i++) {
            util.recordActivity(store, _.merge({active:0,inactive:0}, {active:1}),1500, i);
        }
        console.log(JSON.stringify(store));
        for (let i = 1501; i < 3000; i++) {
            util.recordActivity(store, _.merge({active:0,inactive:0}, {inactive:1}),1500, i);
        }
        console.log(JSON.stringify(store));

    });
});

describe('min/max performance test', ()=>{
    it('min',()=> {
        "use strict";
        let time = (count, func)=> {
            let start = new Date().getTime();
            for (let i = count; i > 0; i--) {
                func();
            }
            let end = new Date().getTime();
            return end - start;
        };
        let repeat = 10*1000*1000;
        console.log(`${repeat} random closure`, time(repeat, ()=> Math.random()*50));
        console.log(`${repeat} random function`, time(repeat, ()=> {return Math.random()*50;}));
        console.log(`${repeat} random function`, time(repeat, function() {return Math.random()*50;}));
        console.log(`${repeat} Min(Max)`, time(repeat, ()=> Math.min(20,Math.max(5,Math.random()*50))));
        console.log(`${repeat} custom`, time(repeat, ()=> {
            let number = Math.random();
            return number > 20 ? 20 : number < 5 ? 5 : number;
        }));
        console.log(`${repeat} custom function`, time(repeat, function () {
            let number = Math.random();
            return number > 20 ? 20 : number < 5 ? 5 : number;
        }));

    })
});
JSON.stringify(_.keys(Memory.rooms).filter(k=>Memory.rooms[k].scouted && Memory.rooms[k].scouted.sourceCount === 2).reduce((total, k)=> {
    total[k] = {s: Memory.rooms[k].scouted.sourceCount, m: _.head(Memory.rooms[k].scouted.minerals)};
    return total;
}, {}));

describe('lab rotatations',()=>{
    "use strict";
    it('',()=>{
        let ledger = {"energy":534537,"H":3,"O":760,"U":2060,"K":57299,"L":760,"Z":23441,"X":3,"G":11190,"ZK":11265,"UL":9760,"UH":42220,"KO":16710,"LO":9630,"ZH":9392,"ZO":720,"GH":680,"GO":9265,"UH2O":10550,"KHO2":16320,"LH2O":5000,"LHO2":4887,"ZH2O":12337,"ZHO2":16780,"GH2O":1160,"GHO2":4587,"XUH2O":25200,"XKHO2":2470,"XLH2O":5000,"XLHO2":4247,"XZH2O":3720,"XZHO2":26094,"XGH2O":220,"XGHO2":18518};
        let globalLedger = {"XUH2O":{"amount":421243,"goal":275000,"ratio":1.5317927272727272},"XKHO2":{"amount":113688,"goal":275000,"ratio":0.4134109090909091},"XGHO2":{"amount":188230,"goal":223000,"ratio":0.8440807174887892},"XLHO2":{"amount":181441,"goal":276500,"ratio":0.6562061482820977},"XZHO2":{"amount":184894,"goal":275000,"ratio":0.6723418181818182},"XZH2O":{"amount":101152,"goal":275000,"ratio":0.36782545454545457},"G":{"amount":119171,"goal":450388828,"ratio":2.1667454545454548},"XLH2O":{"amount":57880,"goal":33000,"ratio":1.753939393939394},"GO":{"amount":87722,"goal":31280682,"ratio":5.848133333333333},"OH":{"amount":431,"goal":560666372,"ratio":0.00862},"energy":{"amount":2227141,"goal":200000,"ratio":11.135705},"O":{"amount":111853,"goal":14496625119,"ratio":22.3706},"U":{"amount":809087,"goal":49771549571,"ratio":112.57645749269514},"L":{"amount":239675,"goal":51209852167},"Z":{"amount":313025,"goal":53943917095},"X":{"amount":230467,"goal":24979275},"ZK":{"amount":82761,"goal":4976967836},"UL":{"amount":90341,"goal":4976967836},"UH":{"amount":211621,"goal":0},"KO":{"amount":78678,"goal":165827900,"ratio":3.9339},"LO":{"amount":203946,"goal":94445340,"ratio":33.991},"ZH":{"amount":97959,"goal":180052390,"ratio":9.7959},"ZO":{"amount":66441,"goal":89061060},"GH":{"amount":23620,"goal":0},"UH2O":{"amount":82213,"goal":0},"LHO2":{"amount":87705,"goal":4277655},"ZH2O":{"amount":70258,"goal":7823160},"ZHO2":{"amount":93376,"goal":4054770},"GHO2":{"amount":107444,"goal":1564650},"XGH2O":{"amount":20423,"goal":18987,"ratio":1.0756306946858376},"LH2O":{"amount":23821,"goal":0},"H":{"amount":79836,"goal":11481541489,"ratio":15.9672},"K":{"amount":115844,"goal":52355167022,"ratio":3.2600889289131536},"KHO2":{"amount":73180,"goal":7259040},"GH2O":{"amount":9284,"goal":0},"LH":{"amount":70730,"goal":0},"UO":{"amount":21430,"goal":0}};
        let reactions= require('./role.lab_operator').reactions;
        let produceable ={"LHO2":4354};
        Game.gcl = {level:12};
        // {"XKHO2":73180,"XGHO2":107444,"XLHO2":87705,"XZHO2":93376,"XZH2O":73857,"OH":82065,"KO":113099,"ZH":82065,"LHO2":4354,"ZH2O":4354,"KHO2":4354};

        _.keys(produceable)
            .map(min=>[min, reactions[min] ?
                reactions[min].reduce((available, i)=>{
                    var locallyAvailable = ((ledger[i] || 0) > 2000 ? 1 : 0) ;
                    var globallyAvailable = ((_.get(globalLedger, [min, 'amount'], 0) < Game.gcl.level * 3000 ? -1 : 0));
                    return available + locallyAvailable + globallyAvailable

                },0)
                : 0]);

    })
})


