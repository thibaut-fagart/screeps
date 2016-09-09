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
        count: 0,
        memory: {role: 'harvester'}
    },
    'carry': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, 800), shaperOptions(room, 'carry', budget)),
        count: 3,
        memory: {role: 'carry'}
    },
    'energyFiller': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, room.energyCapacityAvailable/2), shaperOptions(room, 'energyFiller', budget)),
        count: 0,
        memory: {role: 'energyFiller'}
    },
    'energyGatherer': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, 800), shaperOptions(room, 'energyGatherer', budget)),
        count: 0,
        memory: {role: 'energyGatherer'}
    },
    'looter': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 0.5).maximize(CAPACITY), shaperOptions(room, 'looter', budget)),
        count: 0,
        memory: {role: 'looter'}
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
        count: 2,
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
        // assume average distance of 15 to the storage
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 0.5).minimum(CAPACITY, 800), shaperOptions(room, 'mineralGatherer', budget)),
        count: 0,
        memory: {role: 'mineralGatherer'}
    },

    'labOperator': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 0.5).minimum(CAPACITY, 600), shaperOptions(room, 'labOperator', budget)),
        count: 0,
        memory: {role: 'labOperator'}
    },

    'upgrader': {
        body: (room, budget)=> {
            if (room.glanceForAround(LOOK_STRUCTURES, room.controller.pos, 4, true).map(s=>s.structure).filter(s=>s.store).length) {
                if (room.controller.level < 8) {
                    return CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).maximize(UPGRADE_CONTROLLER).minimum(CAPACITY, 100), shaperOptions(room, 'labOperator', budget));
                } else {
                    return CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).minimum(UPGRADE_CONTROLLER, 15).minimum(CAPACITY, 50), shaperOptions(room, 'labOperator', budget));
                }
            } else {
                return [MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
                    MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
                    MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
                    MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY];
            }
        },
        count: 1,
        memory: {role: 'upgrader'}
    },
    'linkOperator': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 1).minimum(CAPACITY, 400), shaperOptions(room, 'linkOperator', budget)),
        count: 0,
        memory: {role: 'linkOperator'}
    },
    'scout': {body: [MOVE], count: 0, memory: {role: 'scout'}},
    'roleSoldier': {
        body: [MOVE, TOUGH, ATTACK, MOVE, ATTACK, TOUGH, MOVE, ATTACK, TOUGH,
            MOVE, ATTACK, TOUGH, MOVE, HEAL, MOVE, MOVE, MOVE, MOVE,
            MOVE, HEAL, MOVE],
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
    'claimer': {
        body: (room, budget)=>
            (room.controller.level >= 3 ? CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_SWAMP_SPEED, 1).minimum(CLAIM, 1), shaperOptions(room, 'claimer', budget)) : []),
        count: 0, memory: {role: 'claimer'}
    },
    'reserver': {
        body: (room, budget)=>
            (room.controller.level >= 3 ? CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_PLAIN_SPEED, 1).minimum(CLAIM, 2), shaperOptions(room, 'claimer', budget)) : [])
        , count: 0, memory: {role: 'reserver'}
    },
    // 'remoteHarvester': {body: [CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE,WORK, MOVE, CARRY,MOVE, WORK, MOVE,MOVE,CARRY], scale:true, count: 2, memory: {role: 'remoteHarvester'}},
    'remoteUpgrader': {
        body: [
            MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, WORK, CARRY, MOVE, CARRY, WORK,
            MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, WORK, CARRY, MOVE, CARRY, WORK,
            MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, WORK, CARRY, MOVE, CARRY, WORK,
            MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, WORK, CARRY, MOVE, CARRY, WORK,
        ],
        count: 0,
        memory: {role: 'remoteUpgrader'}
    },
    'remoteHarvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_PLAIN_SPEED, 1).minimum(CAPACITY, 50).minimum(HARVEST, 12), shaperOptions(room, 'remoteHarvester', budget)),

        count: 0,
        memory: {role: 'remoteHarvester'}
    },
    'remoteBuilder': {
        body: [MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY
        ],
        count: 0,
        memory: {role: 'remoteBuilder'}
    },
    'remoteCarry': {
        body: (room, budget)=> {
            "use strict";
            let requirements = CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(REPAIR, 1);
            if (room.controller.level > 5) {
                requirements.maximize(CAPACITY);
            } else {
                requirements.minimum(CAPACITY, 800);
            }
            return CreepShaper.shape(requirements, shaperOptions(room, 'remoteCarry', budget));
        },
        count: 0,
        memory: {role: 'remoteCarry'}
    },
    'mineralTransport': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY), shaperOptions(room, 'mineralTransport', budget))
        ,
        count: 0,
        memory: {role: 'mineralTransport'}
    },
    'attacker': {
        body: [MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, HEAL, MOVE, HEAL],
        count: 0,
        memory: {role: 'attacker'}
    },
    'remoteDismantler': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 0.5).maximize(DISMANTLE), shaperOptions(room, 'remoteDismantler', budget))
        /*[
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         MOVE, WORK, WORK, WORK, WORK,
         ]*/,
        count: 0,
        memory: {role: 'remoteDismantler'}
    },
    'keeperGuard': {
// ATTACK,HEAL,MOVE boosts
        body: (room, budget) => {
            "use strict";
            switch (room.controller.level) {
                case 1:
                case 2:
                case 3:
                case 4:
                    return [];
                case 5:
                    return CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).minimum(HEAL, 40).maximize(FEATURE_RANGED_ATTACK, 40), shaperOptions(room, 'keeperGuard', budget));
                case 6:
                    return CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).minimum(HEAL, 60).maximize(FEATURE_RANGED_ATTACK, 40), shaperOptions(room, 'keeperGuard', budget));
                case 7:
                    return CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).minimum(HEAL, 100).maximize(FEATURE_RANGED_ATTACK, 40), shaperOptions(room, 'keeperGuard', budget));
                default:
                    return [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,  //15
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
        // body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).minimum(HEAL, 1)
        //     .minimum(CAPACITY, 50).minimum(HARVEST, 15), shaperOptions(room, 'keeperHarvester', budget)),
        body : room=>[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY,
            ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
            ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
            HEAL,HEAL,HEAL
        ],
        count: 0,
        memory: {role: 'keeperHarvester'}
    },
    'keeperMineralHarvester': {
        body: room=>[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,
                    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY,
                    ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
                    ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,
                    HEAL,HEAL,HEAL
                ]
        /*(room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).minimum(HEAL, 1).minimum(CAPACITY, 50).maximize(HARVEST),
            shaperOptions(room, 'keeperMineralHarvester', budget))*/,
        count: 0,
        memory: {role: 'keeperMineralHarvester'}
    },
    'remoteCarryKeeper': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(DAMAGE, 1).minimum(BUILD, 1).minimum(HEAL, 1).maximize(CAPACITY),
            shaperOptions(room, 'remoteCarryKeeper', budget)),
        count: 0,
        memory: {role: 'remoteCarryKeeper'}
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
    'towerDrainer': {
        body:/*(room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(HEAL).minimum(DAMAGE, 1600),
                    shaperOptions(room, 'remoteCarryKeeper', budget)),*/
            [
            MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, HEAL,
            MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, HEAL,
            MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, TOUGH,
            MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, TOUGH,
            MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH,
            MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH,
            MOVE, TOUGH
        ],
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