var CreepShaper = require('./base.creep.shaper');
require('./game.prototypes.room');
function shaperOptions(room, role, budget) {
    'use strict';
    room.memory.creepShaper = room.memory.creepShaper || {};
    return {
        budget: budget ? budget : room.energyCapacityAvailable,
        cache: budget ? {} : room.memory.creepShaper,
        name: role,
        availableBoosts: room.allowedBoosts(role)
    };
}
let patterns = {
    'harvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(HARVEST, 10), shaperOptions(room, 'harvester', budget)),
        count: 2,
        memory: {role: 'harvester'}
    },
    'carry': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY,800), shaperOptions(room, 'carry', budget)),
        count: 2,
        memory: {role: 'carry'}
    },
    'energyFiller': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, 800), shaperOptions(room, 'energyFiller', budget)),
        count: 0,
        memory: {role: 'energyFiller'}
    },
    'energyGatherer': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, 500), shaperOptions(room, 'energyGatherer', budget)),
        count: 0,
        memory: {role: 'energyGatherer'}
    },
    'builder': {
        body: [WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE,
            CARRY, WORK, MOVE, WORK, CARRY, WORK, CARRY, MOVE, CARRY, WORK,
            CARRY, CARRY, WORK, WORK, CARRY, WORK, CARRY, MOVE, CARRY, WORK,
            MOVE],
        count: 0,
        memory: {role: 'builder'}
    },
    'dismantler': {
        body: [WORK, WORK, WORK, WORK,
            MOVE, MOVE, CARRY, CARRY],
        count: 0,
        memory: {role: 'dismantler'}
    },
    'repair2': {
        body: [WORK, MOVE, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE,
            CARRY, WORK, MOVE, MOVE, /*WORK, CARRY, MOVE, CARRY, WORK, MOVE,
             MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK*/],
        count: 1,
        memory: {role: 'repair2'}
    },
    // 'repair': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 2, scale:true, memory: {role: 'repair'}},
    'mineralHarvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.35).maximize(HARVEST), shaperOptions(room, 'mineralHarvester', budget)),
        count: 0,
        memory: {role: 'mineralHarvester'}
    },
    /* role taken by labOperator*/
    'mineralGatherer': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 0.5).maximize(CAPACITY), shaperOptions(room, 'mineralGatherer', budget)),
        count: 0,
        memory: {role: 'mineralGatherer'}
    },

    'labOperator': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 0.5).minimum(CAPACITY, 600), shaperOptions(room, 'labOperator', budget)),
        count: 0,
        memory: {role: 'labOperator'}
    },
    'upgrader': {
        body: [MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY],
        count: 2,
        memory: {role: 'upgrader'}
    },
    'scout': {body: [MOVE], count: 0, memory: {role: 'scout'}},
    'roleSoldier': {
        body: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE,
            MOVE,
            ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
            HEAL, MOVE, HEAL, MOVE],
        count: 0,
        memory: {role: 'roleSoldier', type: 'close'}
    },
    'roleRemoteGuard': {
        body: [TOUGH, TOUGH, MOVE, MOVE, MOVE, RANGED_ATTACK, MOVE, HEAL,
            MOVE, RANGED_ATTACK, MOVE, HEAL
        ],
        count: 0,
        memory: {role: 'roleRemoteGuard', type: 'remote'}
    },
    'claimer': {body: [MOVE, CLAIM, MOVE, CLAIM,], count: 0, memory: {role: 'claimer'}},
    'reserver': {body: [MOVE, CLAIM, MOVE, CLAIM,], count: 0, memory: {role: 'reserver'}},
    // 'remoteHarvester': {body: [CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE,WORK, MOVE, CARRY,MOVE, WORK, MOVE,MOVE,CARRY], scale:true, count: 2, memory: {role: 'remoteHarvester'}},
    'remoteHarvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).minimum(CAPACITY, 50).minimum(HARVEST, 10), shaperOptions(room, 'remoteHarvester', budget)),

        count: 0,
        memory: {role: 'remoteHarvester'}
    },
    'remoteCarry': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(REPAIR,1).maximize(CAPACITY), shaperOptions(room, 'remoteCarry', budget)),
        count: 0,
        memory: {role: 'remoteCarry'}
    },
    'mineralTransport': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY), shaperOptions(room, 'mineralTransport', budget))
        ,
        count: 0,
        memory: {role: 'mineralTransport'}
    },
    'remoteUpgrader': {
        body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE],
        count: 0,
        memory: {role: 'remoteUpgrader'}
    },
    'keeperGuard': {
// ATTACK,HEAL,MOVE boosts
        body: (room, budget) => {
            "use strict";
            switch(room.controller.level) {
                case 1: case 2: case 3: case 4: return [];
                case 5:
                    return CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).minimum(HEAL, 40).maximize(FEATURE_RANGED_ATTACK, 40), shaperOptions(room, 'keeperGuard', budget));
                case 6:
                    return CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).minimum(HEAL, 50).maximize(FEATURE_RANGED_ATTACK, 40), shaperOptions(room, 'keeperGuard', budget));
                case 7:
                    return CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).minimum(HEAL, 100).maximize(FEATURE_RANGED_ATTACK, 40), shaperOptions(room, 'keeperGuard', budget));
                default: return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,  //15
                                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, //14
                                ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, //10
                                HEAL, HEAL, HEAL];
            }
        }

            /*[TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,  //15
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, //14
            ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, //10
            HEAL, HEAL, HEAL]*/, //3
        count: 0,
        memory: {role: 'keeperGuard'}
    },
    'keeperHarvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).minimum(HEAL, 1)
            .minimum(CAPACITY, 50).minimum(HARVEST, 15), shaperOptions(room, 'keeperHarvester', budget)),
        count: 0,
        memory: {role: 'keeperHarvester'}
    },
    'keeperMineralHarvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).minimum(HEAL, 1).minimum(CAPACITY, 50).maximize(HARVEST),
            shaperOptions(room, 'keeperMineralHarvester', budget)),
        count: 0,
        memory: {role: 'keeperMineralHarvester'}
    },
    'remoteCarryKeeper': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(DAMAGE, 1).minimum(HEAL, 1).maximize(CAPACITY),
            shaperOptions(room, 'remoteCarryKeeper', budget)),
        count: 0,
        memory: {role: 'remoteCarryKeeper'}
    },
    'remoteBuilder': {
        body: [WORK, MOVE, CARRY, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, CARRY, MOVE,
            WORK, MOVE, CARRY, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, CARRY, MOVE,
            WORK, MOVE, CARRY, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, CARRY, MOVE,
            WORK, MOVE, CARRY, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, CARRY, MOVE,
            HEAL
        ],
        count: 0,
        memory: {role: 'remoteBuilder'}
    },
    /*
     'roleCloseGuard': {
     body: [TOUGH, MOVE, ATTACK, MOVE
     /!*
     [TOUGH,TOUGH, TOUGH,TOUGH,MOVE, MOVE,MOVE,MOVE,
     ATTACK, MOVE, ATTACK,MOVE, HEAL,MOVE,HEAL,MOVE,HEAL,MOVE,
     ATTACK,MOVE,ATTACK,MOVE,TOUGH,MOVE,HEAL, MOVE,ATTACK,MOVE,ATTACK,MOVE
     *!/
     ], count: 0,  memory: {role: 'roleSoldier', type: 'close'}
     },
     */
    'attacker': {
        body: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, HEAL, HEAL, MOVE, MOVE],
        count: 0,
        memory: {role: 'attacker'}
    },
    'towerDrainer': {
        body: [TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
            TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
            TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
            TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
            TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,],
        count: 0,
        memory: {role: 'towerDrainer'}
    }

    // 'attack': {body: [WORK, CARRY, MOVE, ATTACK, CARRY, MOVE,ATTACK , MOVE,WORK, CARRY, MOVE, ATTACK, CARRY, ATTACK, MOVE,MOVE], count: 1, memory: {role: 'attack'}},
};
/**
 *
 * @param {Room} room
 * @param {string} role
 */
module.exports = patterns;