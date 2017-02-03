var _ = require('lodash');
var CreepShaper = require('./base.creep.shaper');
require('./game.prototypes.room');
var util = require('./util');
var Cache = require('./util.cache');
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
        body: (room, budget)=> {
            if (room.controller.level < 7 || room.find(FIND_SOURCES).find(s=>!s.link())) {
                return CreepShaper.shape(CreepShaper.requirements().minimum(HARVEST, 10), shaperOptions(room, 'harvester', budget));
            } else {
                return CreepShaper.shape(CreepShaper.requirements().minimum(HARVEST, 10).minimum(CAPACITY, 50), shaperOptions(room, 'harvester', budget));
            }
        },
        count: 0,
        memory: {role: 'harvester'}
    },
    'carry': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY), shaperOptions(room, 'carry', budget)),
        count: 2,
        memory: {role: 'carry'}
    },
    'energyFiller': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, room.energyCapacityAvailable / 2), shaperOptions(room, 'energyFiller', budget)),
        count: 0,
        memory: {role: 'energyFiller'}
    },
    'upgradeFiller': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, room.energyCapacityAvailable / 2), shaperOptions(room, 'energyFiller', budget)),
        count: 0,
        memory: {role: 'upgradeFiller'}
    },
    'energyGatherer': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, 1200), shaperOptions(room, 'energyGatherer', budget)),
        count: 0,
        memory: {role: 'energyGatherer'}
    },
    'repair2': {
        body: [
            MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY,
        ],
        count: 1,
        memory: {role: 'repair2'}
    },

    'defender': {
        body: (room, budget)=>
            CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_PLAIN_SPEED, 0.5).maximize(ATTACK), shaperOptions(room, 'defender', budget))
        , count: 0, memory: {role: 'defender'}
    },
    'roleSoldier': {
        body: [MOVE, TOUGH, RANGED_ATTACK, MOVE, ATTACK, TOUGH, MOVE, ATTACK, TOUGH,
            MOVE, ATTACK, TOUGH, MOVE, HEAL, MOVE, MOVE, MOVE, MOVE,
            MOVE, HEAL, MOVE, RANGED_ATTACK, MOVE],
        count: 0,
        memory: {role: 'roleSoldier', type: 'close'}
    },
    'scout': {body: [MOVE], count: 0, memory: {role: 'scout'}},
    'scout2': {body: [MOVE], count: 0, memory: {role: 'scout2'}},
    'reserver': {
        body: (room, budget)=>
            (room.controller.level >= 3 ? CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_PLAIN_SPEED, 1).maximize(CLAIM), shaperOptions(room, 'claimer', budget)) : [])
        , count: 0, memory: {role: 'reserver'}
    },
    'builder': {
        body: [MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY,
        ],
        count: 0,
        memory: {role: 'builder'}
    },
    'remoteHarvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 1).minimum(CAPACITY, 50).minimum(HARVEST, 12), shaperOptions(room, 'remoteHarvester', budget)),

        count: 0,
        memory: {role: 'remoteHarvester'}
    },
    'linkOperator': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 1).minimum(CAPACITY, room.controller.level < 7?200:400), shaperOptions(room, 'linkOperator', budget)),
        count: 0,
        memory: {role: 'linkOperator'}
    },
    'upgrader': {
        body: (room, budget)=> {
            if (room.glanceForAround(LOOK_STRUCTURES, room.controller.pos, 4, true).map(s=>s.structure).find(s=>s.structureType === STRUCTURE_CONTAINER)) {
                if (room.controller.level < 8) {
                    return CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).maximize(UPGRADE_CONTROLLER).minimum(CAPACITY, 100), shaperOptions(room, 'upgrader', budget));
                } else {
                    return CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).minimum(UPGRADE_CONTROLLER, 15).minimum(CAPACITY, 50),
                        {
                            budget: budget ? budget : room.energyCapacityAvailable,
                            cache: budget ? {} : room.memory.creepShaper,
                            name: 'upgrader',
                            availableBoosts: []
                        });
                }
            } else {
                let body = [];
                let atom = [MOVE, WORK, CARRY];
                let count = Math.floor(room.energyCapacityAvailable / 200);
                for (let i = 0; i < count; i++) {
                    body = body.concat(atom);
                }
                return body;
            }
        },
        count: 0,
        memory: {role: 'upgrader'}
    },

    'remoteCarry': {
        body: (room, budget)=> {
            'use strict';
            let requirements = CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(REPAIR, 1);
            if (room.controller.level > 5) {
                requirements.maximize(CAPACITY);
            } else {
                requirements.minimum(CAPACITY, 750);
            }
            return CreepShaper.shape(requirements, shaperOptions(room, 'remoteCarry', budget));
        },
        count: 0,
        memory: {role: 'remoteCarry'}
    },
    'labOperator': {
        body: (room, budget)=> {
            let desiredCapacity;
            let mineral = _.head(room.find(FIND_MINERALS));
            let harvesterParts = 42; // todo adapt ?
            if (mineral.mineralAmount && room.structures[STRUCTURE_EXTRACTOR].length) {
                room.log('sizing labOperator for mineral');
                let pathLength = Cache.get(room.memory.cache, 'pathToMineral', () => {
                    'use strict';
                    let path = util.safeMoveTo2({
                        pos: room.storage.pos,
                        room: room,
                        log: room.log
                    }, mineral.pos, {range: 2});
                    return _.sum(util.pathCost(path, this));
                }, 15000);

                desiredCapacity = Math.max(1200, Math.min(33 * 50, 500 + mineral.accessTiles * harvesterParts * 2 * pathLength / (5)));
                room.log(`labOperator sizing : accessTiles ${mineral.accessTiles}, harvesterParts ${harvesterParts}, ${pathLength}=>${desiredCapacity}`);
            } else {
                desiredCapacity = room.controller.level >=7 ? 1200:room.structures[STRUCTURE_LAB].length*150;
            }
            return CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(CAPACITY, desiredCapacity), shaperOptions(room, 'labOperator', budget));
        },
        count: 0,
        memory: {role: 'labOperator'}
    },
    'mineralHarvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.25).minimum(CAPACITY, 50).maximize(HARVEST), shaperOptions(room, 'mineralHarvester', budget)),
        count: 0,
        memory: {role: 'mineralHarvester'}
    },
    /* role taken by labOperator*/
    'mineralGatherer': {
        // assume average distance of 15 to the storage
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY), shaperOptions(room, 'mineralGatherer', budget)),
        count: 0,
        memory: {role: 'mineralGatherer'}
    },
    'archer': {
        body: [
            // MOVE],
            MOVE, TOUGH, MOVE, RANGED_ATTACK, MOVE, HEAL, MOVE, TOUGH, MOVE, RANGED_ATTACK,
            MOVE, HEAL, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
            MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
            MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
        ],
        count: 0,
        memory: {role: 'archer'}
    },
    'harasser': {
        body: [
            // MOVE],
            MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
            // MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
            // MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
            //MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
            MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, HEAL
        ],
        count: 0,
        memory: {role: 'harasser'}
    },
    'smallArcher': {
        body: [
            // MOVE],
            MOVE, TOUGH, MOVE, RANGED_ATTACK, MOVE, HEAL, MOVE, TOUGH, MOVE, RANGED_ATTACK,
            MOVE, HEAL, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
        ],
        count: 0,
        memory: {role: 'smallArcher'}
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
    // 'remoteHarvester': {body: [CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE,WORK, MOVE, CARRY,MOVE, WORK, MOVE,MOVE,CARRY], scale:true, count: 2, memory: {role: 'remoteHarvester'}},
    'remoteUpgrader': {
        body: (room, budget)=> {
            return CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_PLAIN_SPEED, 1).maximize(UPGRADE_CONTROLLER).minimum(CAPACITY, 200), shaperOptions(room, 'remoteUpgrader', budget));
        },
        count: 0,
        memory: {role: 'remoteUpgrader'}
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
    'remoteMineralHarvester': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).maximize(HARVEST), shaperOptions(room, 'remoteMineralHarvester', budget)),
        count: 0,
        memory: {role: 'remoteMineralHarvester'}
    },
    'remotePortalCarry': {
        body: (room, budget)=> {
            'use strict';
            let requirements = CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(REPAIR, 1);
            if (room.controller.level > 5) {
                requirements.maximize(CAPACITY);
            } else {
                requirements.minimum(CAPACITY, 750);
            }
            return CreepShaper.shape(requirements, shaperOptions(room, 'remoteCarry', budget));
        },
        count: 0,
        memory: {role: 'remotePortalCarry'}
    },
    'looter': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY), shaperOptions(room, 'looter', budget)),
        count: 0,
        memory: {role: 'looter'}
    },
    'mineralTransport': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(CAPACITY), shaperOptions(room, 'mineralTransport', budget))
        ,
        count: 0,
        memory: {role: 'mineralTransport'}
    },
    'energyTransporter': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).maximize(CAPACITY), shaperOptions(room, 'energyTransporter', budget))
        ,
        count: 0,
        memory: {role: 'energyTransporter'}
    },
    'attacker': {
        body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
            ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
            ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
            ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
        ],
        count: 0,
        memory: {role: 'attacker'}
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
        // W10M17A17H4
        body: room=>[WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, /*CARRY, CARRY,*/
            ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
            ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
            HEAL, HEAL, HEAL
        ],
        count: 0,
        memory: {role: 'keeperHarvester'}
    },
    'keeperMineralHarvester': {
        body: ()=>[WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK,
            ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
            ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
            HEAL, HEAL, HEAL
        ]
        /*(room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(EMPTY_ROAD_SPEED, 0.5).minimum(HEAL, 1).minimum(CAPACITY, 50).maximize(HARVEST),
         shaperOptions(room, 'keeperMineralHarvester', budget))*/,
        count: 0,
        memory: {role: 'keeperMineralHarvester'}
    },
    'remoteCarryKeeper': {
        body: (room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).minimum(DAMAGE, 1).minimum(BUILD, 1)/*.minimum(HEAL, 1)*/.maximize(CAPACITY),
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
        body: /*(room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 1).maximize(HEAL).minimum(DAMAGE, 1600),
         shaperOptions(room, 'remoteCarryKeeper', budget)),*/
            [
                MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, HEAL,
                MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, HEAL,
                MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, HEAL,
                MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, HEAL,
                MOVE, TOUGH, MOVE, HEAL, MOVE, TOUGH, MOVE, HEAL,
                MOVE, HEAL, MOVE, HEAL, MOVE, HEAL, MOVE, HEAL,
                MOVE, HEAL
            ],
        count: 0,
        memory: {role: 'towerDrainer'}
    },
    'towerAttacker': {
        body: /*(room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_PLAIN_SPEED, 1).minimum(HEAL, 20).maximize(ATTACK, 400).minimum(DAMAGE, 5000),
         shaperOptions(room, 'towerAttacker', budget)),*/
            [
                MOVE, TOUGH, MOVE, ATTACK, MOVE, TOUGH, MOVE, ATTACK,
                MOVE, TOUGH, MOVE, ATTACK, MOVE, TOUGH, MOVE, ATTACK,
                MOVE, TOUGH, MOVE, ATTACK, MOVE, TOUGH, MOVE, ATTACK,
                MOVE, TOUGH, MOVE, ATTACK, MOVE, TOUGH, MOVE, ATTACK,
                MOVE, TOUGH, MOVE, ATTACK, MOVE, TOUGH, MOVE, ATTACK,
                MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, HEAL,
                MOVE, HEAL
            ],

        count: 0,
        memory: {role: 'towerAttacker'}
    },
    'remoteDismantler': {
        body: //(room, budget)=> CreepShaper.shape(CreepShaper.requirements().minimum(FULL_ROAD_SPEED, 0.5).maximize(DISMANTLE), shaperOptions(room, 'remoteDismantler', budget))
            [
                MOVE, TOUGH, MOVE, TOUGH,
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,//1920
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,
                MOVE, WORK, MOVE, WORK,
            ],
        count: 0,
        memory: {role: 'remoteDismantler'}
    },
    'dismantler': {
        body: [WORK, WORK, WORK, WORK,
            MOVE, MOVE, CARRY, CARRY],
        count: 0,
        memory: {role: 'dismantler'}
    },

    // 'attack': {body: [WORK, CARRY, MOVE, ATTACK, CARRY, MOVE,ATTACK , MOVE,WORK, CARRY, MOVE, ATTACK, CARRY, ATTACK, MOVE,MOVE], count: 1, memory: {role: 'attack'}},
};
/**
 *
 * @param {Room} room
 * @param {string} role
 */
module.exports = patterns;