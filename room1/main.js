var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleSpawn = require('role.spawn');

module.exports.loop = function () {

    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }

 
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
   }
   for (var name in Game.spawns) {
       var spawn = Game.spawns[name];
       roleSpawn.run(spawn);
   }
   
}