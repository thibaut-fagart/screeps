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
                let rangeTo = creep.pos.getRangeTo(keeper);
                // creep.log('target', rangeTo);
                let path = PathFinder.search(creep.pos, {pos: keeper.pos, range: 1}, {
                    roomCallback: (roomName) => {
                        return (roomName == creep.room.name) ? new PathFinder.CostMatrix() : false;
                    }
                }).path;
                // creep.log('path?', path.length);
                creep.memory.previousKeeperPositions = keeperPositions;
                creep.memory[this.KEEPER_PATH_PATH] = path;
                creep.memory[this.KEEPER_PATH] = keeper.id;
            } else {
                // all dead, clean up
                delete creep.memory.previousKeeperPositions;
                delete creep.memory[this.KEEPER_PATH_PATH];
                delete creep.memory[this.KEEPER_PATH];
                return false;
            }
        }
        // creep.log('moving, keeper ? ', keeper);
        if (isLeader) {
            let path = creep.memory[this.KEEPER_PATH_PATH];
            // creep.log('restored path', path.length);
            if (path) {
                // followpath
                // creep.log('moving to ', path[0]);
                let conflicts = path[0].lookFor(LOOK_CREEPS);
                if (conflicts.length) {
                    creep.log('jam ! ', conflicts[0].name);
                    conflicts[0].moveTo(creep.pos);
                }
                let to = creep.moveTo(path[0]);
                if (OK !== to && ERR_TIRED !== to) {
                    // creep.log('moving?', to);
                } else if (to === ERR_NO_PATH) {
                    let conflicts = conflicts;
                    creep.log('jam ! ', conflicts[0].name);
                    if (conflicts.length && conflicts[0]) {
                        conflicts[0].moveTo(creep.pos);
                    }
                } else if (OK === to) {
                    // creep.log('moved');
                    path = path.slice(1);
                    creep.memory[this.KEEPER_PATH] = keeper.id;
                    creep.memory[this.KEEPER_PATH_PATH] = path;
                } else {
                    // creep.log('moving?');
                }
                return true;
            }
        } else {
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