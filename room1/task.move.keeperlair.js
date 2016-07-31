var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class MoveToSpawningKeeperLair extends BaseStrategy {
    constructor() {
        super();
        this.KEEPER_PATH_PATH = 'lair_path';
        this.KEEPER_PATH = 'lair';
    }

    findBrothers(creep) {
        return creep.pos.findInRange(FIND_MY_CREEPS, 10, {filter: (c) => c.memory.role == creep.memory.role});
    }

    accepts(creep) {
        // creep.log('moveToNextKeeperLair');
        let lair = util.objectFromMemory(creep.memory, this.KEEPER_PATH, (lair)=>lair.ticksToSpawn || lair.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length == 0);
        // creep.log('lair?', !!lair);
        if (lair) {
            // creep.log('lair', lair);
            if (creep.pos.getRangeTo(lair) < 8) {
                // stop here
                creep.log('close enough, stopping');
                delete creep.memory[this.KEEPER_PATH];
                return true;
            }
            let path = util.objectFromMemory(creep.memory, this.KEEPER_PATH_PATH);
            // creep.log('previous path', path.length);
            if (path) {
                // followpath
                // creep.log('following');
                let to = creep.moveTo(path[0]);
                if (OK !== to && ERR_TIRED !== to) {
                    creep.log('moving?', to);
                } else if (OK === to) {
                    path = path.slice(1);
                    creep.memory[this.KEEPER_PATH] = lair.id;
                    creep.memory[this.KEEPER_PATH_PATH] = path;
                }
                return true;
            }
        }


        let brotherCount = creep.memory.brotherCount || 0;
        if (brotherCount < 1) return false;
        // creep.log('leader', leader.name);
        let isLeader = (!creep.memory.leader ) || (creep.memory.leader === creep.name);
        let leader = (creep.memory.leader )?Game.creeps[creep.memory.leader]:creep;

        if (brotherCount < 1) return false;
        // creep.log('leader',leader.name);
        if (isLeader) {
            // creep.log('leader, find path');
            // lookup path
            let lairs = creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});
            // creep.log('lairs', lairs.length);
            if (!lairs.length) return false;
            let sorted = _.sortBy(_.filter(lairs, (lair)=> lair.ticksToSpawn), (lair)=> lair.ticksToSpawn);
            // creep.log('first lair ? ', sorted.length);
            if (sorted.length) {
                let target = sorted[0];
                // creep.log('lair at', target.pos, JSON.stringify(target.pos.getRangeTo(creep)), creep.pos.getRangeTo(target));
                let rangeTo = creep.pos.getRangeTo(target);
                let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
                if (rangeTo > 10) {
                    let path = PathFinder.search(creep.pos, {pos: target.pos, range: 5}, {
                        roomCallback: util.avoidCostMatrix(creep,hostiles,4)}).path;
                    let to = creep.moveTo(path[0]);
                    // creep.log('moving', JSON.stringify(path[0]));
                    if (OK !== to && ERR_TIRED !== to) {
                        creep.log('moving?', to);
                    } else if (OK === to) {
                        path = path.slice(1);
                        creep.memory[this.KEEPER_PATH] = target.id;
                        creep.memory[this.KEEPER_PATH_PATH] = path;
                    }
                } else if (rangeTo < 7) {
                    let path = PathFinder.search(creep.pos, {pos: target.pos, range: 5}, {
                        flee: true,
                        roomCallback: util.avoidCostMatrix(creep, hostiles)
                    });

                    let byPath = creep.moveByPath(path.path);
                    if (OK !== byPath && ERR_TIRED !== byPath) {
                        creep.log('moving?', byPath);
                    }

                }
                return true;
            }
        } else {
            // follow leader
            // creep.log('following');
            creep.moveTo(leader);
        }

        return true;

    }
}
MoveToSpawningKeeperLair.costMatrixes = {};
module.exports = MoveToSpawningKeeperLair;