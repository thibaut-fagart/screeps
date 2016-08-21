var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class MoveToActiveKeeperLair extends BaseStrategy {
    constructor() {
        super();
        this.KEEPER_PATH_PATH = 'keeper_path';
        this.KEEPER_PATH = 'keeper';
    }

    findBrothers(creep) {
        return creep.pos.findInRange(FIND_MY_CREEPS, 10, {filter: (c) => c.memory.role == creep.memory.role});
    }

    /**
     * let the leader lead
     * for the leader, check if the keepers moved/disapaeared/popped.
     * If not , reuse previous ppath if found
     * else find path
     * @param creep
     * @returns {*}
     */
    accepts(creep) {
        // creep.log('moveToNextKeeper');
        let notDisabledPredicate = (c)=>_.filter(c.body, (b)=>b.hits > 0).length > 1;
        // let keeperMem = creep.memory[this.KEEPER_PATH];
        // let keeper = Game.getObjectById(keeperMem);
        // creep.log('memory', keeperMem, keeperObj, (keeperObj && notDisabledPredicate(keeperObj)));
        /*if (!keeper) {
            delete creep.memory[this.KEEPER_PATH];
            delete creep.memory[this.KEEPER_PATH_PATH];
        }
        */
        let keeper = util.objectFromMemory(creep.memory, this.KEEPER_PATH, notDisabledPredicate); // TODO figure why this is not working !
        // creep.log('preivous keeper?', keeper);
        let brotherCount = creep.memory.brotherCount || 0;
        if (brotherCount < 1) return false;
        // creep.log('leader', leader.name);
        let isLeader = (!creep.memory.leader ) || (creep.memory.leader === creep.name);
        let leader = (creep.memory.leader ) ? Game.creeps[creep.memory.leader] : creep;
        if (isLeader && !keeper) {
            let keepers = creep.room.find(FIND_HOSTILE_CREEPS, {filter: (c)=> c.owner.username === 'Source Keeper' && notDisabledPredicate(c)});
            // creep.log('keepers?', keepers.length);
            let keeperPositions = this.toComparableString(keepers);
            // update path
            delete creep.memory[this.KEEPER_PATH_PATH];
            delete creep.memory[this.KEEPER_PATH];
            let sorted = _.sortBy(keepers, (lair)=> -lair.ticksToLive);
            if (sorted.length) {
                keeper = sorted[0];
                creep.memory.previousKeeperPositions = keeperPositions;
            } else {
                // all dead, clean up
                delete creep.memory.previousKeeperPositions;
                return false;
            }
        }
        // creep.log('moving, keeper ? ', keeper);
        if (isLeader && keeper) {
            util.moveTo(creep, keeper.pos, this.constructor.name);
            return true;
        } else if (!isLeader) {
            creep.moveTo(leader);
            return true;
        }
        return false;
    }

    toComparableString(keepers) {
        return JSON.stringify(_.sortBy(_.map(keepers, (k)=>JSON.stringify(k.pos))));
    }
}
module.exports = MoveToActiveKeeperLair;