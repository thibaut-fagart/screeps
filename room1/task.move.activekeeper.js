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

    accepts(creep) {
        // creep.log('moveToNextKeeper');
        let notDisabledPredicate = (c)=>_.filter(c.body, (b)=>b.hits > 0).length > 1;
        let keeper = util.objectFromMemory(creep, this.KEEPER_PATH, notDisabledPredicate);
        // creep.log('keeper?', !!keeper);
        if (keeper) {
            let keepers = creep.room.find(FIND_HOSTILE_CREEPS, {filter: (c)=> c.owner.username === 'Source Keeper' && notDisabledPredicate(c)});
            let keeperPositions = this.toComparableString(keepers);
            if (keeperPositions == creep.memory.previousKeeperPositions) {
                // creep.log('keeper', keeper);
                if (creep.pos.gerRangeTo(keeper) < 5) {
                    // stop here
                    // creep.log('close enough, stopping');
                    delete creep.memory[this.KEEPER_PATH];
                    return true;
                }
                let path = util.objectFromMemory(creep, this.KEEPER_PATH_PATH);
                // creep.log('previous path', path.length);
                if (path) {
                    // followpath
                    creep.log('following');
                    let to = creep.moveTo(path[0]);
                    if (OK !== to && ERR_TIRED !== to) {
                        creep.log('moving?', to);
                    } else if (moveTo === ERR_NO_PATH) {
                        let conflicts = path[0].lookFor(LOOK_CREEPS);
                        if (conflicts.length && conflicts[0]) {
                            conflicts[0].moveTo(20, 20);
                        }
                    } else if (OK === to) {
                        path = path.slice(1);
                        creep.memory[this.KEEPER_PATH] = keeper.id;
                        creep.memory[this.KEEPER_PATH_PATH] = path;
                    }
                    return true;
                }

            } else {
                creep.log('keepers moved, updating path');
                delete creep.memory.previousKeeperPositions ;
                delete creep.memory[this.KEEPER_PATH_PATH] ;
                delete creep.memory[this.KEEPER_PATH] ;
            }
        }


        let brothers = this.findBrothers(creep);
        // creep.log('brothers', brothers.length);

        if (brothers.length < 1) return false;
        let leader = _.sortBy(brothers, (b)=>b.name)[0];
        // creep.log('leader', leader.name);
        if (leader.name == creep.name) {
            // creep.log('leader, find path');
            // lookup path
            let keepers = creep.room.find(FIND_HOSTILE_CREEPS, {filter: (c)=> c.owner.username === 'Source Keeper' && notDisabledPredicate(c)});
            // creep.log('keepers', keepers.length);
            if (!keepers.length) return false;
            let sorted = _.sortBy(keepers, (lair)=> -lair.ticksToLive);
            // creep.log('first keeper ? ', sorted.length);
            if (sorted.length) {
                let target = sorted[0];
                let rangeTo = creep.pos.getRangeTo(target);
                // creep.log('target', rangeTo);
                let path = PathFinder.search(creep.pos, {pos: target.pos, range: 1}, {
                    roomCallback: (roomName) => {
                        return (roomName == creep.room.name) ? new PathFinder.CostMatrix() : false;
                    }
                }).path;
                let keeperPositions = this.toComparableString(keepers);

                creep.memory.previousKeeperPositions = keeperPositions;
                creep.memory[this.KEEPER_PATH_PATH] = path;
                creep.memory[this.KEEPER_PATH] = target;
                if (rangeTo > 5) {
                    let moveTo = creep.moveTo(path[0]);
                    if (moveTo === ERR_NO_PATH) {
                        let conflicts = path[0].lookFor(LOOK_CREEPS);
                        if (conflicts.length && conflicts[0]) {
                            conflicts[0].moveTo(20, 20);
                        }

                    } else if (moveTo !== OK && moveTo !== ERR_TIRED) {
                        creep.log('moveTo?', moveTo);
                    }
                    creep.memory[this.KEEPER_PATH_PATH] = path;
                    creep.memory[this.KEEPER_PATH] = target.id;
                    return true;

                }
                return false;
                /*

                 let to = creep.moveTo(path[0]);
                 if (OK !== to && ERR_TIRED !== to) {
                 creep.log('moving?', to);
                 } else if (OK === to) {
                 path = path.slice(1);
                 creep.memory[this.KEEPER_PATH] = target.id;
                 creep.memory[this.KEEPER_PATH_PATH] = path;
                 }
                 */
            }
        } else {
            // follow leader
            // creep.log('following');
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