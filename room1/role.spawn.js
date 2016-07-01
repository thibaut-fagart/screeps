/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.spawn');
 * mod.thing == 'a thing'; // true
 */
//  Game.spawns.Spawn1.createCreep([WORK, MOVE, WORK, WORK, WORK, WORK, ], undefined, {role:'harvester'})
module.exports = {
    maxCreeps: 16,
    BODY_COST :{"move":50, "work":100, "carry":50, "attack":80,"ranged_attack":150,"heal":250, "claim":600, "tough":10},
    patterns: {
                'harvester': {body: [WORK, MOVE, WORK, WORK, WORK, WORK,], count: 1, scale:false, memory: {role: 'harvester'}},
                'carry': {body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
                    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 900 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 1200 */], count: 2, scale:false, memory: {role: 'carry'}},
                'upgrader': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 2, scale:true, memory: {role: 'upgrader'}},
                'remoteHarvester': {body: [CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE,WORK, MOVE, CARRY,MOVE, WORK, MOVE,MOVE,CARRY], scale:true, count: 3, memory: {role: 'remoteHarvester'}},
                'builder': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 2, scale:true, memory: {role: 'builder'}},
                // 'repair': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 2, scale:true, memory: {role: 'repair'}},
                'repair2': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 5, scale:true, memory: {role: 'repair2'}},
                // 'attack': {body: [WORK, CARRY, MOVE, ATTACK, CARRY, MOVE,ATTACK , MOVE,WORK, CARRY, MOVE, ATTACK, CARRY, ATTACK, MOVE,MOVE], count: 1, memory: {role: 'attack'}},
    },
    //Game.spawns.Spawn1.createCreep([CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE], undefined, {role:'carry'})
    shapeBody: function(spawn, perfectBody) {

        // adds the parts untill they can't be built
        var maxEnergy = spawn.room.energyAvailable;
        var body  = [];
        var cost = 0;
        for (var i = 0; i < perfectBody.length && cost < maxEnergy; i++) {
            var part = perfectBody[i];
            if ((cost +=this.BODY_COST[part]) <= maxEnergy) {
                body.push(part);
            }
        }
        
        return body;

    },
    isFull: function (spawn) {
        if (spawn.energy < spawn.energyCapacity) return false;
        return spawn.room.energyAvailable >= spawn.room.energyCapacityAvailable;
            // (_.min(spawn.room.energyCapacityAvailable, 1000));
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
/*
        if (_.size(Game.creeps) >= this.maxCreeps) {
            this.patterns.harvester.count = 1;
        }
*/
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
        var harvesters = _.filter(creep.room.find(FIND_MY_CREEPS), function(c) {return c.memory.role == 'harvester';});
        if (harvesters < 2 || _.filter(harvesters, function(c) {return c.ticksToLive> 100}).length<2) {
            return patterns.harvester;
        }
        var carrys = _.filter(creep.room.find(FIND_MY_CREEPS), function(c) {return c.memory.role == 'carry';});
        if (_.filter(carrys, function(c) {return c.ticksToLive> 100}).length < 1) {
            return patterns.carry;
        }

        var targetCount = _.reduce(patterns, (s, spec) => {return s + spec.count;}, 0);

        var targetSplit = _.mapValues(patterns,(spec)=>{return spec.count / targetCount}); /* {role: target%}*/
        console.log("targetSplit " , JSON.stringify(targetSplit));
        var creepCount = _.keys(Game.creeps).length;
        var currentSplit = _.reduce(
            _.map(Game.creeps,(creep)=>{return creep.memory.role}),
            (m, role)=>{ m[role] =(undefined === m[role])?1:m[role] +1; return m;},
            {});
        currentSplit = _.mapValues(currentSplit, (v)=>{return v/creepCount;});
        console.log("currentSplit " , JSON.stringify(currentSplit));
        var required = {};
        /* required : {role : need filled%}*/
         _.keys(targetSplit).forEach(function(role) {if (role) required[role] = (currentSplit[role]?currentSplit[role]:0)/targetSplit[role]});
        // console.log("building " , JSON.stringify(required));
        var result = 'upgrader';
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
            delete Memory.creeps[reassign[i].name];
            reassign[i].memory.role = role;
        }
        
    },
    run: function (creep) {
        this.updateNeeds(creep);
        this.reassignCreeps(creep);
        if (creep.spawning) return;

        var harvesters = _.filter(creep.room.find(FIND_MY_CREEPS), function(c) {return c.memory.role == 'harvester';});
        if ((harvesters.length< 2 || _.filter(harvesters, (c)=>c.ticksToLive > 100) <2) && creep.room.energyAvailable > 250) {
            console.log("emergency harvester");
            creep.createCreep(this.shapeBody(creep, this.patterns.harvester.body), undefined, this.patterns.harvester.memory);
            return ; 
        }
        var carrys = _.filter(creep.room.find(FIND_MY_CREEPS), function(c) {return c.memory.role == 'carry';});
        if ((carrys.length< 1 || (carrys.length == 1 && carrys[0].ticksToLive < 100)) && creep.room.energyAvailable > 250) {
            console.log("emergency carry");
            creep.createCreep(this.shapeBody(creep, this.patterns.carry.body), undefined, this.patterns.carry.memory);
            return ;
        }

        var full = this.isFull(creep);
        if (!full) return;
        var energy = _.reduce(creep.room.find(FIND_SOURCES), function (total, source){ return total + source.energy});
        if (energy == 0) {
            console.log("LIMITING CREEPS ", _.size(Game.creeps) - 1);
            this.maxCreeps =_.size(Game.creeps)-1;
        }
        // TODO if drop containers are > 75% increase creep count ?
        if (_.size(Game.creeps) >= this.maxCreeps) {
            var sourceContainers =
                _.map(creep.room.find(FIND_SOURCES), function (source) {
                    var structuresAroundSource = creep.room.lookForAtArea(LOOK_STRUCTURES, source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true);
                    var containers = _.filter(_.map(structuresAroundSource, function (o) {
                        return o.structure;
                    }), {structureType: STRUCTURE_CONTAINER});
                    if (containers.length) return containers[0];
                    return null;
                });

            var fillRatio = _.reduce(sourceContainers, function(total, c) {
                if (c) {
                    total.energy = total.energy + c.store.energy;
                    total.capacity = total.capacity + c.storeCapacity;
                }
                return total;
            },
                {energy:0, capacity:0});
            fillRatio = fillRatio.energy / fillRatio.capacity;
            // console.log("fillRatio = ", fillRatio);
            if (fillRatio < 0.75) return; else {
                console.log("building because of overflowing");
            }
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


/*
        if (harvesters.length == 0 || ) {
            var target = _.sample(Game.creeps);
            // reassign another creep to harvester
            console.log("no more harvesters, reassigning a ", target.memory.role);
            delete target.memory.target;
            delete target.memory.source;
            target.memory.role = 'harvester';
        }
*/
    }

};