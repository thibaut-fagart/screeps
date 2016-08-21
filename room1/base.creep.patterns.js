var CreepShaper = require('./base.creep.shaper');

let patterns = {
    'harvester': {
        body: [MOVE, WORK, WORK, WORK, WORK, WORK,],
        count: 2,
        scale: false,
        memory: {role: 'harvester'}
    },
    'carry': {
        body: [MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
            MOVE, CARRY, CARRY, MOVE, CARRY, CARRY],
        count: 2,
        scale: false,
        memory: {role: 'carry'}
    },
    'energyFiller': {
        body: [MOVE, CARRY, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
            CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/
            CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/],
        count: 0,
        scale: false,
        memory: {role: 'energyFiller'}
    },
    'energyGatherer': {
        body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
            CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 900 *//*CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, *//* 1200 */],
        count: 0,
        scale: false,
        memory: {role: 'energyGatherer'}
    },
    'builder': {
        body: [WORK, MOVE, CARRY, MOVE, WORK, MOVE, WORK, MOVE, CARRY, MOVE,
            CARRY, WORK, MOVE, WORK, CARRY, WORK, CARRY, MOVE, CARRY, WORK,
            CARRY, CARRY, WORK, WORK, CARRY, WORK, CARRY, MOVE, CARRY, WORK,
            MOVE],
        count: 0,
        scale: true,
        memory: {role: 'builder'}
    },
    'dismantler': {
        body: [WORK, WORK, WORK, WORK,
            MOVE, MOVE, CARRY, CARRY],
        count: 0,
        scale: true,
        memory: {role: 'dismantler'}
    },
    'repair2': {
        body: [WORK, MOVE, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE,
            CARRY, WORK, MOVE, MOVE, /*WORK, CARRY, MOVE, CARRY, WORK, MOVE,
             MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK*/],
        count: 1,
        scale: true,
        memory: {role: 'repair2'}
    },
    // 'repair': {body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE,WORK, CARRY, MOVE, CARRY, WORK, MOVE,MOVE], count: 2, scale:true, memory: {role: 'repair'}},
    'mineralHarvester': {
        body: [MOVE, WORK, WORK, WORK, WORK, WORK,
            MOVE, WORK, WORK, WORK, WORK, WORK,
            MOVE, WORK, WORK, WORK, WORK, WORK,
            MOVE, WORK, WORK, WORK, WORK, WORK,],
        count: 0,
        scale: false,
        memory: {role: 'mineralHarvester'}
    },
    /* role taken by labOperator*/
    'mineralGatherer': {
        body: [MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY,
            MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY,
            MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY,],
        count: 0,
        scale: false,
        memory: {role: 'mineralGatherer'}
    },

    'labOperator': {
        body: [CARRY, MOVE, CARRY, CARRY, CARRY, MOVE, /* 300 */CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /* 600 */
            CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /*/!* 900 *!/CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, /!* 1200 *!/*/],
        count: 0,
        scale: false,
        memory: {role: 'labOperator'}
    },
    'upgrader': {
        body: [MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
            MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY],
        count: 2,
        scale: true,
        memory: {role: 'upgrader'}
    },
    'scout': {body: [MOVE], count: 0, scale: false, memory: {role: 'scout'}},
    'roleSoldier': {
        body: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE,
            MOVE,
            ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
            HEAL, MOVE, HEAL, MOVE],
        count: 0,
        scale: true,
        memory: {role: 'roleSoldier', type: 'close'}
    },
    'roleRemoteGuard': {
        body: [TOUGH, TOUGH, MOVE, MOVE, MOVE, RANGED_ATTACK, MOVE, HEAL,
            MOVE, RANGED_ATTACK, MOVE, HEAL
        ],
        count: 0,
        scale: true,
        memory: {role: 'roleRemoteGuard', type: 'remote'}
    },
    'claimer': {body: [MOVE, CLAIM, MOVE, CLAIM,], count: 0, scale: true, memory: {role: 'claimer'}},
    'reserver': {body: [MOVE, CLAIM, MOVE, CLAIM,], count: 0, scale: true, memory: {role: 'reserver'}},
    // 'remoteHarvester': {body: [CARRY, MOVE, WORK, MOVE, CARRY, MOVE, WORK, MOVE, CARRY, MOVE,WORK, MOVE, CARRY,MOVE, WORK, MOVE,MOVE,CARRY], scale:true, count: 2, memory: {role: 'remoteHarvester'}},
    'remoteHarvester': {
        body: [MOVE, MOVE, MOVE, CARRY, WORK, WORK, WORK, WORK, MOVE, WORK, MOVE, WORK],
        scale: true,
        count: 0,
        memory: {role: 'remoteHarvester'}
    },
    'remoteCarry': {
        body: [MOVE, WORK,
            CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
            CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
            CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
            CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
        ],
        count: 0,
        scale: false,
        memory: {role: 'remoteCarry'}
    },
    'mineralTransport': {
        body: [MOVE, WORK,
            CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
            CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
            CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
            CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
        ],
        count: 0,
        scale: false,
        memory: {role: 'mineralTransport'}
    },
    'remoteUpgrader': {
        body: [WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, WORK, MOVE, MOVE],
        count: 0,
        scale: true,
        memory: {role: 'remoteUpgrader'}
    },
    /*
     'keeperGuard': {
     body: [MOVE, HEAL, MOVE, HEAL, MOVE, HEAL, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK,
     MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK],
     count: 0,
     scale: true,
     memory: {role: 'keeperGuard'}
     },
     */
    'keeperGuard': {
        /*
         body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,  //7
         MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, //15
         ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,//17
         HEAL, HEAL, HEAL, HEAL, HEAL, HEAL], //6
         */
// ATTACK,HEAL,MOVE boosts
        body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,  //15
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, //14
            ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, //10
            HEAL, HEAL, HEAL], //3
        count: 0,
        scale: true,
        memory: {role: 'keeperGuard'}
    },
    'keeperHarvester': {
        body: [MOVE, MOVE, MOVE, WORK, WORK, WORK, HEAL, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, WORK],
        scale: true,
        count: 0,
        memory: {role: 'keeperHarvester'}
    },
    'keeperMineralHarvester': {
        body: [MOVE, WORK, WORK, MOVE, WORK, HEAL, MOVE, WORK, WORK,
            MOVE, WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, WORK,
            MOVE, WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, WORK,
            MOVE, WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, WORK,
            MOVE, WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, WORK,
            MOVE, WORK, WORK,
        ],
        scale: true,
        count: 0,
        memory: {role: 'keeperMineralHarvester'}
    },
    'remoteCarryKeeper': {
        body: [TOUGH, HEAL, MOVE, MOVE, MOVE, WORK, CARRY, MOVE, CARRY, CARRY,
            MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY,
            MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY,
            MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY,
            MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY,
            MOVE, CARRY, CARRY
        ],
        count: 0,
        scale: false,
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
        scale: true,
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
     ], count: 0, scale: true, memory: {role: 'roleSoldier', type: 'close'}
     },
     */
    'attacker': {
        body: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, HEAL, HEAL, MOVE, MOVE],
        count: 0,
        scale: true,
        memory: {role: 'attacker'}
    },
    'towerDrainer': {
        body: [TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
            TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
            TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
            TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,
            TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, TOUGH, MOVE, HEAL, MOVE,],
        count: 0,
        scale: true,
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