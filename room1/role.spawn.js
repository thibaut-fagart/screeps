/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.spawn');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
     run: function(creep) {
   var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
   var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
   var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
//    console.log('Harvesters: ' + harvesters.length);
    var patterns = {
        'harvester' :  {body : [WORK,CARRY,MOVE], count: 2, memory : {role: 'harvester'}},
        'upgrader' :  {body : [WORK,CARRY,MOVE], count: 1, memory : {role: 'upgrader'}},
        'builder' :  {body : [WORK,CARRY,MOVE], count: 1, memory : {role: 'builder'}},
    };
   /* var sum = patterns.reduce(function(c, spec) {return c+ spec.count});
    var currentSplit = pattens.map()
    */
    for (var role in patterns) {
        var roleSpec = patterns[role];
        var currentCount =  _.filter(Game.creeps, (creep) => creep.memory.role ==  roleSpec.memory.role);
        if (currentCount < roleSpec.count) {
            creep.createCreep(roleSpec.body, undefined, roleSpec.memory);
        }
    }
/*    if(harvesters.length < 2) {
        var newName = creep.createCreep([WORK,CARRY,MOVE], undefined, {role: 'harvester'});
        console.log('Spawning new harvester: ' + newName);
    }
    if(upgraders.length < 1) {
        var newName = creep.createCreep([WORK,CARRY,MOVE], undefined, {role: 'upgrader'});
        console.log('Spawning new upgrader: ' + newName);
    }*/
}
};