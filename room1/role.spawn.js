var _ = require('lodash');
var util = require('./util');
var Decay = require('./util.decay'), decay = new Decay();
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
    maxCreeps: 15,
    BODY_COST :{'move':50, 'work':100, 'carry':50, 'attack':80,'ranged_attack':150,'heal':250, 'claim':600, 'tough':10},
    patterns: {
        'harvester': {body: [MOVE, WORK, WORK, WORK, WORK, WORK,], count: 2, scale:false, memory: {role: 'harvester'}},
        'carry': {body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
            /*CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/], count: 1, scale:false, memory: {role: 'carry'}} ,
        'remoteCarry': {body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 *//*
            CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/], count: 0, scale:false, memory: {role: 'remoteCarry'}},
        'upgrader': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 2, scale:true, memory: {role: 'upgrader'}},
        'remoteUpgrader': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 0, scale:true, memory: {role: 'remoteUpgrader'}},
        // 'remoteHarvester': {body: [CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE,WORK, MOVE, CARRY,MOVE, WORK, MOVE,MOVE,CARRY], scale:true, count: 2, memory: {role: 'remoteHarvester'}},
        'remoteHarvester': {body: [MOVE, MOVE, CARRY, WORK, WORK, WORK, WORK, WORK], scale:true, count: 2, memory: {role: 'remoteHarvester'}},
        'builder': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 1, scale:true, memory: {role: 'builder'}},
        'remoteBuilder': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 0, scale:true, memory: {role: 'remoteBuilder'}},
        'claimer': {body: [MOVE, MOVE, CLAIM, CLAIM, ], count: 0, scale:true, memory: {role: 'claimer'}},
        'reserver': {body: [MOVE, MOVE, CLAIM,CLAIM, ], count: 0, scale:true, memory: {role: 'reserver'}},
        // 'repair': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 2, scale:true, memory: {role: 'repair'}},
        'repair2': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count:2, scale:true, memory: {role: 'repair2'}},
        'roleRemoteGuard': {body: [TOUGH,TOUGH, TOUGH,TOUGH,MOVE, MOVE,MOVE,MOVE, RANGED_ATTACK, RANGED_ATTACK,MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, RANGED_ATTACK, RANGED_ATTACK,], count:0, scale:true, memory: {role: 'roleSoldier'}},
        'roleCloseGuard': {body: [TOUGH,TOUGH, TOUGH,TOUGH,MOVE, MOVE,MOVE,MOVE, ATTACK, ATTACK,ATTACK,ATTACK,MOVE, MOVE, MOVE, HEAL,HEAL,MOVE,MOVE,TOUGH,MOVE,MOVE, HEAL, ATTACK], count: 0, scale:true, memory: {role: 'roleSoldier'}},
        'attacker': {body: [TOUGH,TOUGH, TOUGH,TOUGH,MOVE, MOVE,MOVE,MOVE, ATTACK, ATTACK,ATTACK,ATTACK,MOVE, MOVE, MOVE, HEAL,HEAL,MOVE,MOVE], count: 0, scale:true, memory: {role: 'attacker'}},
        // 'attack': {body: [WORK, CARRY, MOVE, ATTACK, CARRY, MOVE,ATTACK , MOVE,WORK, CARRY, MOVE, ATTACK, CARRY, ATTACK, MOVE,MOVE], count: 1, memory: {role: 'attack'}},
    },
    BODY_ORDER: [TOUGH, WORK, CARRY, MOVE, ATTACK, HEAL, RANGED_ATTACK, CLAIM],
    //Game.spawns.Spawn1.createCreep([CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE], undefined, {role:'carry'})
    shapeBody: function(spawn, perfectBody) {

        // adds the parts untill they can't be built
        var maxEnergy = spawn.room.energyAvailable;
        var body  = [];
        var cost = 0;
        let max = 0;
        for (var i = 0; i < perfectBody.length && cost < maxEnergy; i++) {
            var part = perfectBody[i];
            if ((cost +=this.BODY_COST[part]) <= maxEnergy) {
                max = i;
            }
        }

        let realBody = perfectBody.slice(0, max+1);
        var newbody = realBody;
        newbody = _.sortBy(realBody, (part)=>this.BODY_ORDER.indexOf(part));
        return newbody;

    },
    repairRequired(creep) {
        "use strict";
        let repairNeedPer10k = _.sum(creep.room.find(FIND_STRUCTURES), (s)=>decay.repairNeedPer10k(s));
        creep.log('repairNeedPer10k', repairers.length);
        let repairers = creep.room.find(FIND_MY_CREEPS, {filter:(c)=>c.memory.role == 'repair2'});
        creep.log('repairers', repairers.length);
        let repairCapacity = 10000*_.sum(repairers, (c)=>c.getActiveBodyparts(WORK))*100/3; // assume repairing 33% moving 33%
        creep.log('repair capacity', repairCapacity);

        // count
    },
    isFull: function (spawn) {
        if (spawn.energy < spawn.energyCapacity) return false;
        return spawn.room.energyAvailable >= spawn.room.energyCapacityAvailable;
            // (_.min(spawn.room.energyCapacityAvailable, 1000));
    },
    updateNeeds: function(creep, roomPatterns) {
        if (_.size(creep.room.find(FIND_MY_CONSTRUCTION_SITES)) ==0) {
            // creep.log("NO NEED FOR BUILDERS");
            roomPatterns.builder.count=0;
        }
        if (_.size(creep.room.find(FIND_STRUCTURES, {filter: function (structure)  {
        				return structure.hits < structure.hitsMax;
        			}})) == 0) {
            roomPatterns.repair2.count = 0;
            // creep.log("NO NEED FOR REPAIRERS");
        }
/*
        if (_.size(Game.creeps) >= this.maxCreeps) {
            roomPatterns.harvester.count = 1;
        }
*/
/*
        if (_.size(creep.room.find(FIND_STRUCTURES, {
                filter: function(structure) {
                    return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                        structure.energy < structure.energyCapacity;
                }
        })) ==0) {
            roomPatterns.harvester.count = 1;
            // creep.log("NO building to refill=> no HARVESTERS");
        }
*/

    },
    whatToBuild: function(patterns, creep){
        
        var currentSplit = util.roster(creep.room);
        // creep.log('roster',JSON.stringify(currentSplit ))
/*
        var harvesters = currentSplit.harvester || 0;
        if (harvesters < 2 || _.filter(harvesters, function(c) {return c.ticksToLive> 100}).length<2) {
            return patterns.harvester;
        }

        var carrys = currentSplit.carry||0;
        if (_.filter(carrys, function(c) {return c.ticksToLive> 100}).length < 1) {
            return patterns.carry;
        }
*/

        if (creep.room.memory.remoteMining) {
            let remoteRoom = Game.rooms[creep.room.memory.remoteMining];
            if (remoteRoom && remoteRoom.find(FIND_HOSTILE_CREEPS).length ===0) {
                // creep.log('remoteMining');
                let remoteRoster = util.roster(remoteRoom);
                patterns['remoteHarvester'].count = Math.max(0,remoteRoom.find(FIND_SOURCES).length - ((remoteRoster['remoteHarvester']||0)+(remoteRoster['harvester']||0)));
                // creep.log('remoteroster', JSON.stringify(remoteRoster));
                let myAwayRemoteCarries = remoteRoster['remoteCarry']||0;
                patterns['remoteCarry'].count = 5*(remoteRoster['remoteHarvester']||0)-myAwayRemoteCarries;
                // creep.log('remoteCarry?', patterns['remoteCarry'].count);

            } else {
                patterns['remoteHarvester'].count = 1; // ENABLE when it works 
            }
        } else {
            patterns['remoteHarvester'].count = 0;
        }

        if (creep.room.controller.level < 4 || ! creep.room.memory.build) {
               patterns['remoteUpgrader'].count = 0;
        }
        if (!currentSplit['claimer'] && creep.room.memory.claim) {
            // creep.log('adjusting for claims');
            let remoteRoom = Game.rooms[creep.room.memory.claim];
            if (!remoteRoom || !remoteRoom.controller.my) {
                patterns['claimer'].count = 1;
            }
        } else {
            // creep.log('claimers', !currentSplit['claimer'], 'claim', creep.room.memory.claim);
        }
        if (creep.room.memory.remotebuild) {
            let remoteRoom = Game.rooms[creep.room.memory.remotebuild];
            if (!remoteRoom) {
                patterns['remoteBuilder'].count = Math.max(1, patterns['remoteBuilder'].count);
            } else if (remoteRoom.controller && !remoteRoom.controller.my) {
                if (remoteRoom.find(FIND_CONSTRUCTION_SITES).length>0){
                    patterns['remoteBuilder'].count = Math.max(1, patterns['remoteBuilder'].count);
                } else {
                    patterns['remoteBuilder'].count = 0;
                }

            } else if (remoteRoom.find(FIND_MY_SPAWNS) == 0) {
                patterns['remoteBuilder'].count = 3;
            } else if (remoteRoom.find(FIND_MY_SPAWNS) > 0) {
                // creep.log('disabling remotebuilds');
                patterns['remoteBuilder'].count = 3 - remoteRoom.find(FIND_STRUCTURES, {filter:{structureType:STRUCTURE_EXTENSION}}).length;
            }
            // creep.log('remotebuilders', patterns['remoteBuilder'].count)
        } else  {
            patterns['remoteBuilder'].count = 0;
        }
        if (creep.room.memory.remotebuild) {
            let remoteRoom = Game.rooms[creep.room.memory.attack];
            if (remoteRoom && util.roster(remoteRoom)['roleSoldier']>= (patterns['roleRemoteGuard'].count+patterns['roleCloseGuard'])
                    ||  (remoteRoom && remoteRoom.find(FIND_MY_STRUCTURES, {filter:{structureType: STRUCTURE_TOWER}}).length >0)) {
                // console.log('disabling remote defenders');
                patterns['roleRemoteGuard'].count = 0;
            }
            if (creep.room.controller.level > 5) {
                if (!remoteRoom) {
                    patterns['remoteUpgrader'].count = 0;
                } else if (remoteRoom.controller.level < 3) {
                    patterns['remoteUpgrader'].count = 3;
                    patterns['upgrader'].count = 1;
                } else {
                    patterns['remoteUpgrader'].count = 0;
                }
            }
        }
        if (creep.room.find(FIND_CONSTRUCTION_SITES, {filter:(c)=> STRUCTURE_EXTENSION === c.structureType}).length >0) {
            patterns['upgrader'].count = 0;
        }
        if (patterns['roleCloseGuard'].count &&creep.room.memory.attack) {
            let remoteRoster = util.roster(creep.room.memory.attack);
            creep.log('decreasing roleCloseGuard', (remoteRoster['roleRemoteGuard']||0)+(remoteRoster['roleCloseGuard'] ||0));
            patterns['roleCloseGuard'].count -= (remoteRoster['roleRemoteGuard']||0)+(remoteRoster['roleCloseGuard'] ||0);
        }
        if (patterns['roleRemoteGuard'].count &&creep.room.memory.attack) {
            let remoteRoster = util.roster(creep.room.memory.attack);
            creep.log('decreasing roleRemoteGuard', (remoteRoster['roleRemoteGuard']||0)+(remoteRoster['roleCloseGuard'] ||0));
            patterns['roleRemoteGuard'].count -= (remoteRoster['roleRemoteGuard']||0)+(remoteRoster['roleCloseGuard'] ||0);
        }
        if (creep.room.memory.nomilitary) {
            patterns['roleCloseGuard'].count = 0;
            patterns['roleRemoteGuard'].count = 0;
        }
        let notDyingRoster = util.roster(creep.room, (c)=>c.ticksToLive > 50);
        // creep.log('correct harvester to ? ',  notDyingRoster['harvester']);
        // creep.log('correct carry to ? ',  notDyingRoster['carry']);
        currentSplit['harvester'] = notDyingRoster['harvester'];
        currentSplit['carry'] = notDyingRoster['carry'];
        if (!currentSplit['reserver'] && creep.room.memory.reserve) {
            // creep.log('adjusting for reserves');
            let remoteRoom = Game.rooms[creep.room.memory.reserve];
            if (remoteRoom) {
                let spawnReserve = ( !remoteRoom.controller || !remoteRoom.controller.reservation || creep.owner.username !== remoteRoom.controller.reservation.username)
                                    || (remoteRoom.controller && remoteRoom.controller.reservation.ticksToEnd < 500);
                // creep.log('current reservation  ?', remoteRoom.name, JSON.stringify(remoteRoom.controller.reservation));
                // spawn reserver if  the room is not reserved, or due to expire soon
                if (spawnReserve) {
                    patterns['reserver'].count = 1;
                }
            }
        } else {
            // creep.log('reserver', !currentSplit['reserver'], 'reserve', creep.room.memory.reserver);
        }

        // currentSplit = _.mapValues(currentSplit, (v)=>{return v/creepCount;});
        // creep.log("currentSplit " , JSON.stringify(currentSplit));
        var required = {};


        // creep.log('targetCount', targetCount);
        var targetSplit = _.mapValues( patterns,(spec)=>spec.count);
        // creep.log("targetSplit ", JSON.stringify(targetSplit));
        /* required : {role : need filled%}*/
        _.keys(targetSplit).forEach((role)=> {
            targetSplit[role] -= (currentSplit[role] || 0)
        });
        // creep.log("targetSplit-current", JSON.stringify(targetSplit));
        let result =  _.max(_.keys(targetSplit), (role) => (targetSplit[role] ));
             
             //function(role) {if (role) required[role] = (currentSplit[role]?currentSplit[role]:0)/targetSplit[role]});
        if (targetSplit[result]>0) {
            return patterns[result];
        } else {
            let availableStorage = _.sum(creep.room.find(FIND_STRUCTURES, {filter:(c)=>c.store}),(c)=>c.storeCapacity - _.sum(c.store));
            return availableStorage < 1000 ? patterns['upgrader']: null;

        }
        // var result = 'upgrader';
        // var roleScore = required[result];
        // _.keys(patterns).forEach(function(role) {if (roleScore > required[role]) {result = role; roleScore = required[result]}});
        // _.keys(patterns).forEach(function(role) {if (required[role]> currentSplit[role]) {result = role}});
        // if (!result) {result = 'harvester'};
        // return patterns[result];

    },
    reassignCreeps: function(spawn, roomPatterns) {
/*
        var reassign = spawn.room.find(FIND_MY_CREEPS, {filter:function(creep) {
            return undefined === creep.memory.role
            }});
        for (var i = 0; i < reassign.length;i++) {
            var role = this.whatToBuild(roomPatterns, spawn).memory.role;
            spawn.log("reassigning to ", role);
            delete Memory.creeps[reassign[i].name];
            reassign[i].memory.role = role;
        }
        
*/
    },
    buildTower: function(spawn) {
        "use strict";
        if (spawn.room.controller.level >=3 && spawn.room.find(FIND_STRUCTURES, {filter:{structureType: STRUCTURE_TOWER}}).length == 0) {
            let towerFlags = spawn.room.find(FIND_FLAGS, {filter:{color: COLOR_PURPLE}});
            if (towerFlags.length >0) {
                let lookFor = towerFlags[0].pos.lookFor(LOOK_CONSTRUCTION_SITES);
                if (!lookFor.length) {
                    spawn.room.createConstructionSite(towerFlags[0].pos, STRUCTURE_TOWER);
                }
            }
        }

    },
    createCreep: function (creep, buildSpec) {
        if (! buildSpec.memory || ! buildSpec.body) {
            creep.log('ERROR, invalid create', JSON.stringify(buildSpec));
        }
        let creep2 = creep.createCreep(buildSpec.body, undefined, buildSpec.memory);
        if ('number' !== typeof creep2) {
            creep.log("building ", creep.room.energyAvailable, creep.room.energyCapacityAvailable,JSON.stringify(buildSpec));
            creep.memory.build = {start: Game.time, buildTime: buildSpec.body.length};
        } else {
            creep.log('create?', creep2);
        }
    }, /**
     *
     * @param {StructureSpawn} creep
     */
    run: function (creep) {
        let roomPatterns = _.cloneDeep(this.patterns);
        if (creep.memory.build && !creep.spawning) {
            creep.log('built', JSON.stringify(creep.memory.build));
            delete creep.memory.build;
        }
        this.updateNeeds(creep, roomPatterns);
        this.reassignCreeps(creep, roomPatterns);
        if (!(Game.time %100)) this.buildTower(creep);
        if (creep.spawning) return;

        let myCreeps = creep.room.find(FIND_MY_CREEPS);
        var harvesters = _.filter(myCreeps, function(c) {return c.memory.role == 'harvester';});
        // creep.log('harvesters', harvesters.length);
        if ((harvesters.length< 2 || _.filter(harvesters, (c)=>c.ticksToLive > 100) <2) && creep.room.energyAvailable > 250) {
            creep.log("emergency harvester");
            let spec = _.cloneDeep(roomPatterns.harvester);
            spec.body = this.shapeBody(creep, roomPatterns.harvester.body);
            this.createCreep(creep, spec);
            return ; 
        }
        var carrys = _.filter(myCreeps, function(c) {return c.memory.role == 'carry';});
        if ((carrys.length< 1 || (carrys.length == 1 && carrys[0].ticksToLive < 100)) && creep.room.energyAvailable > 250) {
            let spec = _.cloneDeep(roomPatterns.carry);
            spec.body = this.shapeBody(creep, roomPatterns.carry.body);
            this.createCreep(creep, spec);
            // creep.log("emergency carry");
            return ;
        }

        var full = this.isFull(creep);
        if (!full) return;
        var energy = _.reduce(creep.room.find(FIND_SOURCES), function (total, source){ return total + source.energy});
        if (energy == 0) {
            creep.log("LIMITING CREEPS ", _.size(myCreeps)- 1);
            this.maxCreeps =_.size(myCreeps)-1;
        }
        // TODO if drop containers are > 75% increase creep count ?
/*
        if (_.size(myCreeps) >= this.maxCreeps) {
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
            // creep.log("fillRatio = ", fillRatio);
            if (fillRatio < 0.75) return; else {
                creep.log("building because of overflowing");
            }
        }
*/

        var buildSpec = this.whatToBuild(roomPatterns, creep);
       // creep.log('build?',JSON.stringify(buildSpec));
       // creep.log('build?',JSON.stringify(roomPatterns[buildSpec]));
        if (!buildSpec) {
            // creep.log("no buildspec ??");
            return ;
        }
        buildSpec.body = this.shapeBody(creep, buildSpec.body);
        this.createCreep(creep, buildSpec);


/*
        if (harvesters.length == 0 || ) {
            var target = _.sample(Game.creeps);
            // reassign another creep to harvester
            creep.log("no more harvesters, reassigning a ", target.memory.role);
            delete target.memory.target;
            delete target.memory.source;
            target.memory.role = 'harvester';
        }
*/
    }

};