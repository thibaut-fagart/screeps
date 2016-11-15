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