var chai = require('chai');
var expect = chai.expect;
var it = require('mocha');
var Room = require('../ScreepsAutocomplete/Room');
var StructureController = require('../ScreepsAutocomplete/Structures/StructureController');
var Source = require('../ScreepsAutocomplete/Source');
var RoomPosition = require('../ScreepsAutocomplete/RoomPosition');
var StructureSpawn = require('../ScreepsAutocomplete/Structures/StructureSpawn');

// it('RCL1', function () {
var SpawnManager = require('./../process/manager.spawn.js'), manager = new SpawnManager();

let room = new Room();
RoomPosition.prototype.getRangeTo = function (firstArg, secondArg) {
    'use strict';
    let x, y;
    if ('number' === typeof firstArg) {
        x = firstArg;
        y = secondArg;
    } else {
        x = firstArg.x;
        y = firstArg.y;
    }
    console.log('getRangeTo', JSON.stringify(this), firstArg, secondArg)
    return Math.max(Math.abs(this.x - x), Math.abs(this.y - y));
};

Room.prototype.find = function (what) {
    'use strict';
    if (what === FIND_SOURCES_ACTIVE) {

        let source = new Source();
        source.room = room;
        source.pos = new RoomPosition();
        source.pos.x = 0;
        source.pos.y = 0;
        return [source];
    } else if (what === FIND_MY_SPAWNS) {
        let spawn = new StructureSpawn();
        spawn.room = room;
        spawn.pos = new RoomPosition();
        spawn.pos.x = -10;
        spawn.pos.y = 0;
        return [spawn];
    }
};
room.controller = new StructureController();
room.controller.level = 1;
room.controller.room = room;
room.controller.pos = new RoomPosition();
room.controller.pos.x = 10;
room.controller.pos.y = 0;
Game.time = 1;

let require2 = manager.require(room, {role: 'harvester'}, 500);
console.log('require2',require2);
expect(require2, 'insertInQueue').to.include.keys('start').and.include.keys('end');
expect(require2.start, 'insertInQueue.start =?500-12').to.equal(488);
expect(require2.end, 'insertInQueue.end =?500').to.equal(499);

let require3 = manager.require(room, {role: 'harvester'}, 512);
console.log('require3',require3);
expect(require3, 'insertInQueue').to.include.keys('start').and.include.keys('end');
expect(require3.start, 'insertInQueue.start =?512-12').to.equal(500);
expect(require3.end, 'insertInQueue.end =?512').to.equal(511);


let require4 = manager.require(room, {role: 'harvester'}, 488);
console.log('require4',require4);
expect(require4, 'insertInQueue').to.include.keys('start').and.include.keys('end');
expect(require4.start, 'insertInQueue.start =?488-12').to.equal(476);
expect(require4.end, 'insertInQueue.end =?488').to.equal(488);
// });

let require5 = manager.require(room, {role: 'harvester'}, 495);
console.log('require5', require5);
console.log('require4', require4);
console.log(JSON.stringify(manager.requestQueue));
expect(require5, 'insertInQueue').to.include.keys('start').and.include.keys('end');
expect(require5.start, 'insertInQueue.start =?487-12').to.equal(483);
expect(require5.end, 'insertInQueue.end =?487').to.equal(495);


console.log('require4', require4);
console.log(JSON.stringify(manager.requestQueue));

expect(require4, 'insertInQueue').to.include.keys('start').and.include.keys('end');
expect(require4.start, 'insertInQueue.start =?463').to.equal(463);
expect(require4.end, 'insertInQueue.end =?475').to.equal(475);
