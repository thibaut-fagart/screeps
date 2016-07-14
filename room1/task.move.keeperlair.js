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
        let lair = util.objectFromMemory(creep, this.KEEPER_PATH, (lair)=>lair.ticksToSpawn || lair.pos.findInRange(FIND_HOSTILE_CREEPS).length == 0);
        // creep.log('lair?', !!lair);
        if (lair) {
            // creep.log('lair', lair);
            if (creep.pos.gerRangeTo(lair) < 8) {
                // stop here
                creep.log('close enough, stopping');
                delete creep.memory[this.KEEPER_PATH];
                return true;
            }
            let path = util.objectFromMemory(creep, this.KEEPER_PATH_PATH);
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


        let brothers = this.findBrothers(creep);
        // creep.log('brothers', brothers.count);
        if (brothers.length < 1) return false;
        let leader = _.sortBy(brothers, (b)=>b.name)[0];
        // creep.log('leader',leader.name);
        if (leader.id === creep.id) {
            // creep.log('leader, find path');
            // lookup path
            let lairs = creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});
            // creep.log('lairs', lairs.length);
            if (!lairs.length) return false;
            let sorted = _.sortBy(_.filter(lairs, (lair)=> lair.ticksToSpawn), (lair)=> lair.ticksToSpawn);
            // creep.log('first lair ? ', sorted.length);
            if (sorted.length) {
                let target = sorted[0];
                // creep.log('target', JSON.stringify(target.pos.getRangeTo(creep)));
                let rangeTo = creep.pos.getRangeTo(target);
                if (rangeTo > 10) {
                    let path = PathFinder.search(creep.pos, {pos: target.pos, range: 5}, {
                        roomCallback: this.getCostMatrix(creep)}).path;


                    let to = creep.moveTo(path[0]);
                    if (OK !== to && ERR_TIRED !== to) {
                        creep.log('moving?', to);
                    } else if (OK === to) {
                        path = path.slice(1);
                        creep.memory[this.KEEPER_PATH] = target.id;
                        creep.memory[this.KEEPER_PATH_PATH] = path;
                    }
                } else if (rangeTo < 5) {
                    let path = PathFinder.search(creep.pos, {pos: target.pos, range: 5}, {
                        flee: true,
                        roomCallback: this.getCostMatrix(creep)
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

    getCostMatrix(creep) {
        return (roomName) => {
            if (roomName !== creep.room.name) return false;

            let matrixCache = creep.room.keeperCostMatrixes = creep.room.keeperCostMatrixes || {}

            let matrix = matrixCache[roomName];
            if (matrix) {
                return matrix;
            }
            matrix = new PathFinder.CostMatrix();
            let hostiles = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS);
            hostiles.forEach((c)=> {

                matrix.set(c.pos.x, c.pos.y, 255);
                matrix.set(c.pos.x - 1, c.pos.y - 1, 255);
                matrix.set(c.pos.x - 1, c.pos.y, 255);
                matrix.set(c.pos.x - 1, c.pos.y + 1, 255);
                matrix.set(c.pos.x, c.pos.y - 1, 255);
                matrix.set(c.pos.x, c.pos.y, 255);
                matrix.set(c.pos.x, c.pos.y + 1, 255);
                matrix.set(c.pos.x + 1, c.pos.y - 1, 255);
                matrix.set(c.pos.x + 1, c.pos.y, 255);
                matrix.set(c.pos.x + 1, c.pos.y + 1, 255);
            });
            MoveToSpawningKeeperLair.costMatrixes[roomName] = matrix;
            return matrix;
        };
    }

}
MoveToSpawningKeeperLair.costMatrixes = {};
module.exports = MoveToSpawningKeeperLair;