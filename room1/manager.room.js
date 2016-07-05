var _ = require('lodash');
var util = require('./util');
var SpawnManager = require('./manager.spawn');
class RoomManager {

    constructor(spawnManager) {
        this.spawnManager = (spawnManager || new SpawnManager());
    }

    // [WORK,MOVE,MOVE,CARRY,CARRY] => 300
    // harvest 2 energy/tick = >150 tick to recoup + move
    // build 5/tick, 50 tick to fill + 20 ticks to build => 70 tick per trip + move (  3 tick per range for 2way)
    // 1 upgrader consumers 300 (build) + 1500/(70 + 3 *range[source,controller]) * 100 per life
    // 1 harvester consumers 300 (build) +
    /**
     *
     * @param {Room} room
     */
    run(room) {
        let roster = util.roster(room);
        switch (room.controller.level) {
            case 1:
            {
                // lvl 1 : we want to upgrade ASAP, focus on general purpose upgraders/harvesters
                // what is the best split for spawn-refillers/upgraders
                /*
                 U: upgrader count, H harvester count(refill spawn)
                 Eu: Energy requiredby U life, Eh Energy required by H life (1500 ticks)
                 Ru: Range (source, controller), Rh: Range (source, spawn)
                 trips per life for U : 1500/ (ticksToFill + ticks to build + move) = 1500 / (70+3*Ru)
                 trips per life for H : 1500/ (ticksToFill + move) = 1500 / (50+3*Rh)
                 Energy collected per life = 100*trips, plus build cost
                 Eh = 300 + (1500/(50+3Rh))*100
                 Eu = 300 + (1500/(70+3Ru))*100
                 Harvester needed = enough to build U and H
                 H *(Eh-300) (collected) = U *300 + H* 300 = (H+U) *300
                 H* (1500/(50+3Rh))*100 = 300* (H+U)+300 *H
                 H* (1500/(50+3Rh)) = 3* (2H+U) = 6H +3U
                 [1]H* (1500/(50+3Rh)-6)/3 =U

                 total energy from source per life = 15000 (refill every 300 => 5 refills per life) + 1500 (spawn autoregen)
                 Eh + Eu = 15000 +1500
                 [2] H * (300 +(1500/(50+3Rh))*100) + U*(300 + (1500/(70+3Ru))*100) = 16500
                 H * (300 +(1500/(50+3Rh))*100) +H* (1500/(50+3Rh)-6)/3* (300 + (1500/(70+3Ru))*100) = 16500
                 H* ((300 +(1500/(50+3Rh))*100) +(1500/(50+3Rh)-6)/3* (300 + (1500/(70+3Ru))*100) )=16500
                 H = 16500/(((300 +(1500/(50+3Rh))*100) +(1500/(50+3Rh)-6)/3* (300 + (1500/(70+3Ru))*100) ))

                 */
                let spawn = room.find(FIND_MY_SPAWNS)[0];
                if (!spawn) {
                    return; // todo plan spawn ?
                }
                let targetRoster = this.targetRoster(room);

                console.log('targetRoster', targetRoster);
/*
                if (!this.spawnManager.isRoleQueued('harvester')) {
                    this.spawnManager.require({role: 'harvester', fixedTarget: spawn.id});

                }

                if (roster.harvester + this.spawnManager.requiredCount('harvester') < 2 * targetRoster.harvester) {
                    this.spawnManager.require({role: 'harvester'});
                }
*/
                break;
            }
            default:
                room.log('roomManager', 'unsupported RCL');
        }
    }

    targetRoster(room) {
        let targetRoster;
        if (room.memory.managers && room.memory.managers.room && room.memory.managers.room.targetRoster) {
            targetRoster = room.memory.managers.room.targetRoster;
        } else {
            let targetRoster = {
                harvester: Math.ceil(this.optimalHarvesterCountRCL1(room)),
                upgrader: Math.ceil(this.optimalUpgraderCountRCL1(room))
            };
            room.memory.managers = room.memory.managers || {};
            room.memory.managers.room = room.memory.managers.room || {};
            room.memory.managers.room.targetRoster = targetRoster;
        }
        return targetRoster;
    }

    /**
     *
     * @param {Room|StructureSpawn} room
     * @param {Source} [source]
     * @returns {number}
     */
    optimalUpgraderCountRCL1(room, source) {
        if (!source) {
            let spawns = room.find(FIND_MY_SPAWNS);
            console.log('spawns', spawns, spawns.length);
            let spawn = spawns[0];
            return _.sum(room.find(FIND_SOURCES_ACTIVE), (source)=>this.optimalUpgraderCountRCL1(spawn, source));
        }
        //U = 16500/(((300 +(1500/(50+3Rh))*100) +(1500/(50+3Rh)-6)/3* (300 + (1500/(70+3Ru))*100) ))* ((1500/(50+3Rh)-6)/3)
        let spawn = room;
        let Rh = source.pos.getRangeTo(spawn.pos);
        console.log('Rh', Rh);
        let Ru = spawn.pos.getRangeTo(spawn.room.controller.pos);
        console.log('Ru', Ru);
        return 16500 / (300 + (1500 / (50 + 3 * Rh)) * 100 + (1500 / (50 + 3 * Rh) - 6) / 3 * (300 + (1500 / (70 + 3 * Ru)) * 100)) * ((1500 / (50 + 3 * Rh) - 6) / 3)
    }

    /**
     *
     * @param {Room|StructureSpawn} room
     * @param {Source} [source]
     * @returns {number}
     */
    optimalHarvesterCountRCL1(room, source) {
        if (!source) {
            return _.sum(room.find(FIND_SOURCES_ACTIVE), (source)=> {
                console.log('source', source);
                let spawns = room.find(FIND_MY_SPAWNS);
                console.log('spawn', spawns, spawns.length);
                if (!spawns.length) console.log('room', room.name);
                return this.optimalHarvesterCountRCL1(room.find(FIND_MY_SPAWNS)[0], source);

            });
        }
        /**
         *
         * @type {StructureSpawn}
         */
        let spawn = room;
        console.log(spawn);
        let Rh = source.pos.getRangeTo(spawn.pos);
        console.log('Rh', Rh);
        let Ru = spawn.pos.getRangeTo(spawn.room.controller.pos);
        console.log('Ru', Ru);

        let number = 16500 / (300 + 150000 / (50 + 3 * Rh) + (1500 / (50 + 3 * Rh) - 6) / 3 * (300 + (1500 / (70 + 3 * Ru)) * 100));
        console.log('opt harvester', number);
        return number
    }
}

module.exports = RoomManager;