/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.spawn');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    maxCreeps: 13,
    BODY_COST :{"move":50, "work":100, "carry":50, "attack":80,"ranged_attack":150,"heal":250, "claim":600, "tough":10},
    patterns: {
                'harvester': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, /*400*/ MOVE,WORK, CARRY, MOVE, CARRY, WORK, /* 800*/ MOVE,MOVE], count: 3, memory: {role: 'harvester'}},
                'upgrader': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 4, memory: {role: 'upgrader'}},
                'builder': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 1, memory: {role: 'builder'}},
                'repair': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 4, memory: {role: 'repair'}},
                // 'attack': {body: [WORK, CARRY, MOVE, ATTACK, CARRY, MOVE,ATTACK , MOVE,WORK, CARRY, MOVE, ATTACK, CARRY, ATTACK, MOVE,MOVE], count: 1, memory: {role: 'attack'}},
    },
    shapeBody: function(spawn, perfectBody) {

        // adds the parts untill they can't be built
        var maxEnergy = spawn.room.energyCapacityAvailable;
        var body  = [];
        var cost = 0;
        for (var i = 0; i < perfectBody.length && cost < maxEnergy; i++) {
            var part = perfectBody[i];

            if (cost + this.BODY_COST[part] <= maxEnergy) {
                cost = cost + this.BODY_COST[part];
                body.push(part);
            }
        }
        return body;

    },
    isFull: function (spawn) {
        if (spawn.energy < spawn.energyCapacity) return false;
        return spawn.room.find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_EXTENSION}}).every(function (extension) {
            return extension.energy == extension.energyCapacity
        })
    },
    updateNeeds: function(creep) {
        if (_.size(creep.room.find(FIND_MY_CONSTRUCTION_SITES)) ==0) {
            // console.log("NO NEED FOR BUILDERS");
            this.patterns.builder.count=0;
        }
        if (_.size(creep.room.find(FIND_MY_STRUCTURES, {filter: function (structure)  {
        				return structure.hits < structure.hitsMax;
        			}})) == 0) {
            this.patterns.repair.count = 0;
            // console.log("NO NEED FOR REPAIRERS");
        }
        if (_.size(Game.creeps) >= this.maxCreeps) {
            this.patterns.harvester.count = 1;
        }
/*
        if (_.size(creep.room.find(FIND_STRUCTURES, {
                filter: function(structure) {
                    return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                        structure.energy < structure.energyCapacity;
                }
        })) ==0) {
            this.patterns.harvester.count = 1;
            // console.log("NO building to refill=> no HARVESTERS");
        }
*/

    },
    whatToBuild: function(patterns, creep){
        var targetCount = _.reduce(patterns, (s, spec) => {return s + spec.count;}, 0);

        var targetSplit = _.mapValues(patterns,(spec)=>{return spec.count / targetCount}); /* {role: target%}*/
        console.log("targetSplit " , JSON.stringify(targetSplit));
        var creepCount = _.keys(Game.creeps).length;
        var currentSplit = _.reduce(
            _.map(Game.creeps,(creep)=>{return creep.memory.role}),
            (m, role)=>{ m[role] =(undefined === m[role])?1:m[role] +1; return m;},
            {});
        if (currentSplit.harvester==0){
            return patterns.harvester;
        }
        currentSplit = _.mapValues(currentSplit, (v)=>{return v/creepCount;});
        console.log("currentSplit " , JSON.stringify(currentSplit));
        var required = {};
        /* required : {role : need filled%}*/
         _.keys(targetSplit).forEach(function(role) {if (role) required[role] = (currentSplit[role]?currentSplit[role]:0)/targetSplit[role]});
        console.log("building " , JSON.stringify(required));
        var result = 'harvester';
        var roleScore = required[result];
        _.keys(patterns).forEach(function(role) {if (roleScore > required[role]) {result = role; roleScore = required[result]}});
        // _.keys(patterns).forEach(function(role) {if (required[role]> currentSplit[role]) {result = role}});
        // if (!result) {result = 'harvester'};
        return patterns[result];

    },
    reassignCreeps: function(spawn) {
        var reassign = spawn.room.find(FIND_MY_CREEPS, {filter:function(creep) {
            return undefined === creep.memory.role
            }});
        for (var i = 0; i < reassign.length;i++) {
            var role = this.whatToBuild(this.patterns, spawn).memory.role;
            console.log("reassigning to ", role);
            reassign[i].memory.role = role;
        }
        
    },
    run: function (creep) {
        this.updateNeeds(creep);
        this.reassignCreeps(creep);
        if (creep.spawning) return;
        var full = this.isFull(creep);
        if (!full) return;
        var energy = _.reduce(creep.room.find(FIND_SOURCES), function (total, source){ return total + source.energy});
        if (energy == 0) {
            console.log("LIMITING CREEPS ", _.size(Game.creeps) - 1);
            this.maxCreeps =_.size(Game.creeps)-1;
        }
        if (_.size(Game.creeps) >= this.maxCreeps) {
            return;
        }

        var buildSpec = this.whatToBuild(this.patterns, creep);
       // console.log("shapebody : ", JSON.stringify(this.shapeBody(creep, buildSpec.body)));
        if (!buildSpec) {
            console.log("no buildspec ??");
            return ;
        }
        buildSpec.body = this.shapeBody(creep, buildSpec.body);
        console.log("building ", JSON.stringify(buildSpec));
        creep.createCreep(buildSpec.body, undefined, buildSpec.memory);

        var harvesters = creep.room.find(FIND_MY_CREEPS, {
            filter: function (creep) {
                return 'harvester' === creep.memory.role
            }
        });
        if (harvesters.length == 0) {
            var target = _.sample(Game.creeps);
            // reassign another creep to harvester
            console.log("no more harvesters, reassigning a ", target.memory.role);
            delete target.memory.target;
            delete target.memory.source;
            target.memory.role = 'harvester';
        }
    }

};