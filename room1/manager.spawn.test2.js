var chai = require('chai');
var expect = chai.expect;
var it = require('mocha');
var Room = require('../ScreepsAutocomplete/Room');
var StructureController = require('../ScreepsAutocomplete/Structures/StructureController');
var Source = require('../ScreepsAutocomplete/Source');
var RoomPosition = require('../ScreepsAutocomplete/RoomPosition');
var StructureSpawn = require('../ScreepsAutocomplete/Structures/StructureSpawn');

// it('RCL1', function () {
var SpawnManager = require('./manager.spawn'), manager = new SpawnManager();

let room = new Room();
RoomPosition.prototype.getRangeTo = function (firstArg, secondArg) {
    "use strict";
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
    "use strict";
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


JSON.stringify(_.sum(require('./util').roster()))
JSON.stringify(require('./util').roster('E38S14'))
Game.spawns.Spawn1.createCreep([TOUGH,TOUGH, TOUGH,TOUGH,MOVE, MOVE,MOVE,MOVE, ,MOVE,MOVE,ATTACK, ATTACK,ATTACK,ATTACK,MOVE, MOVE, MOVE, HEAL,HEAL], undefined, {role:'roleCloseGuard'})
var decays = {'container': (s) => 10000,'ramparts' : (s) => 3000,'road' : (s) => 'plain' === s.pos.lookFor(LOOK_TERRAIN) ? 1000 : 5000};_.sum(Game.rooms.E37S14.find(FIND_STRUCTURES, (s) => [STRUCTURE_CONTAINER, STRUCTURE_ROAD, STRUCTURE_RAMPART].indexOf(s.structureType)>=0),(s) => (decays[s.structureType])?decays[s.structureType](s):0)

_.filter(Game.rooms.E38S14.find(FIND_MY_CREEPS),(c)=>c.memory.role==='roleCloseGuard').forEach((c)=>delete c.memory.fleepath)
_.filter(Game.creeps,(c)=>c.memory.role==='roleCloseGuard').forEach((c)=>delete c.memory.fleepath)
_.filter(Game.rooms.E38S14.find(FIND_MY_CREEPS),(c)=>c.memory.role==='repair2').forEach((c)=>c.memory.role='builder')
_.filter(Game.rooms.E38S14.find(FIND_MY_CREEPS),(c)=>c.memory.role==='builder').slice(1,2).forEach((c)=>c.memory.role='harvester')
var extension = _.sortBy(Game.rooms.E38S14.find(FIND_CONSTRUCTION_SITES, {filter: {structureType: STRUCTURE_EXTENSION}}),(cs)=>-cs.progress)[0]; _.filter(Game.rooms.E38S14.find(FIND_MY_CREEPS),(c)=>c.memory.role=='builder').forEach((c)=>c.memory.target=extension.id);

map(_.union([controller], creep.room.find(FIND_SOURCES), creep.room.find(FIND_STRUCTURES,
                            (s)=>s.structureType === STRUCTURE_SPAWN || s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_EXTENSION))
                        , (s)=> {return {range:1, pos:s.pos}});
var creep = Game.creeps.Kaitlyn; function(creep) {let fleepoints = _.map(creep.room.find(FIND_SOURCES),function(creep){return {range:5, pos:s.pos}});
JSON.stringify(PathFinder.search(Game.rooms.E38S14.controller.pos, fleepoints, {flee: true}))

Game.spawns.Spawn1.createCreep([MOVE, MOVE, WORK, WORK, WORK, WORK, WORK], undefined, {role:'remoteHarvester'})
Game.spawns.Spawn1.createCreep([WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], undefined, {role:'remoteBuilder'})
Game.spawns.Spawn1.createCreep([CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE], undefined, {role:'remoteCarry'})
var creep = Game.spawns.Spawn1, Decay = require ('./util.decay'), decay = new Decay();_.sum(creep.room.find(FIND_STRUCTURES), (s)=>decay.repairNeedPer10k(s))
var creep = Game.spawns.Spawn1, role = require('./role.spawn');role.repairRequired(creep)
    _.filter(Game.creeps, (c)=>!c.memory.role).forEach((c)=> c.memory.role = 'upgrader');

    var creep = Game.spawns.Spawn2; var route = creep.pos.findRouteTo(Game.rooms[creep.room.memory.remoteMining].find(FIND_SOURCES_ACTIVE)[0]); JSON.stringify(route)

    require('./util').roster('E36S14');
    
_.filter(_.sortBy(Game.rooms.E38S14.find(FIND_STRUCTURES,), (s) => s.hits / s.hitsMax),(s) => !util.isReserved(creep, s))

_.values(Game.creeps).forEach((c)=> delete c.memory.strategy)

    var room = Game.rooms.E37S14; JSON.stringify(_.map(_.pairs(_.groupBy(room.find(FIND_STRUCTURES), (s)=>s.structureType)), (array)=>[array[0], _.sum(array[1], (s)=>s.hitsMax - s.hits)]))
var c= Game.creeps.Evelyn; _.merge(c.memory, {role:'remoteHarvester',action:'load',remoteRoom:'E39S14',homeroom:'E38S14'}


        JSON.stringify(PathFinder.search(new RoomPosition(21,31,'E38S14'), new RoomPosition(31,30, 'E39S14')))
    
varposes=[{"x":22,"y":32,"roomName":"E38S14"},{"x":23,"y":33,"roomName":"E38S14"},{"x":24,"y":34,"roomName":"E38S14"},{"x":24,"y":35,"roomName":"E38S14"},{"x":24,"y":36,"roomName":"E38S14"},{"x":24,"y":37,"roomName":"E38S14"},{"x":24,"y":38,"roomName":"E38S14"},{"x":24,"y":39,"roomName":"E38S14"},{"x":25,"y":40,"roomName":"E38S14"},{"x":26,"y":41,"roomName":"E38S14"},{"x":27,"y":42,"roomName":"E38S14"},{"x":28,"y":43,"roomName":"E38S14"},{"x":29,"y":44,"roomName":"E38S14"},{"x":30,"y":45,"roomName":"E38S14"},{"x":31,"y":46,"roomName":"E38S14"},{"x":32,"y":47,"roomName":"E38S14"},{"x":33,"y":48,"roomName":"E38S14"},{"x":34,"y":48,"roomName":"E38S14"},{"x":35,"y":48,"roomName":"E38S14"},{"x":36,"y":47,"roomName":"E38S14"},{"x":37,"y":46,"roomName":"E38S14"},{"x":38,"y":45,"roomName":"E38S14"},{"x":39,"y":45,"roomName":"E38S14"},{"x":40,"y":45,"roomName":"E38S14"},{"x":41,"y":45,"roomName":"E38S14"},{"x":42,"y":44,"roomName":"E38S14"},{"x":43,"y":43,"roomName":"E38S14"},{"x":44,"y":42,"roomName":"E38S14"},{"x":45,"y":41,"roomName":"E38S14"},{"x":46,"y":40,"roomName":"E38S14"},{"x":47,"y":39,"roomName":"E38S14"},{"x":48,"y":38,"roomName":"E38S14"},{"x":48,"y":37,"roomName":"E38S14"},{"x":48,"y":36,"roomName":"E38S14"},{"x":49,"y":35,"roomName":"E38S14"},{"x":0,"y":35,"roomName":"E39S14"},{"x":1,"y":36,"roomName":"E39S14"},{"x":2,"y":37,"roomName":"E39S14"},{"x":3,"y":38,"roomName":"E39S14"},{"x":4,"y":39,"roomName":"E39S14"},{"x":5,"y":39,"roomName":"E39S14"},{"x":6,"y":40,"roomName":"E39S14"},{"x":7,"y":40,"roomName":"E39S14"},{"x":8,"y":40,"roomName":"E39S14"},{"x":9,"y":40,"roomName":"E39S14"},{"x":10,"y":40,"roomName":"E39S14"},{"x":11,"y":40,"roomName":"E39S14"},{"x":12,"y":39,"roomName":"E39S14"},{"x":13,"y":38,"roomName":"E39S14"},{"x":14,"y":37,"roomName":"E39S14"},{"x":15,"y":36,"roomName":"E39S14"},{"x":16,"y":36,"roomName":"E39S14"},{"x":17,"y":35,"roomName":"E39S14"},{"x":18,"y":34,"roomName":"E39S14"},{"x":19,"y":33,"roomName":"E39S14"},{"x":20,"y":32,"roomName":"E39S14"},{"x":21,"y":31,"roomName":"E39S14"},{"x":22,"y":30,"roomName":"E39S14"},{"x":23,"y":30,"roomName":"E39S14"},{"x":24,"y":30,"roomName":"E39S14"},{"x":25,"y":30,"roomName":"E39S14"},{"x":26,"y":30,"roomName":"E39S14"},{"x":27,"y":30,"roomName":"E39S14"},{"x":28,"y":30,"roomName":"E39S14"},{"x":29,"y":30,"roomName":"E39S14"},{"x":30,"y":30,"roomName":"E39S14"},{"x":31,"y":30,"roomName":"E39S14"}];poses.forEach((pos)=> console.log(Game.rooms[pos.roomName].createFlag(pos.x, pos.y, undefined, COLOR_YELLOW)))

var pos = {"x":22,"y":32,"roomName":"E38S14"}; Game.rooms[pos.roomName].createFlag(pos.x, pos.y, undefined, COLOR_YELLOW);
    