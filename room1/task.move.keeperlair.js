var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class MoveToSpawningKeeperLair extends BaseStrategy {
    constructor(predicate) {
        super();
        this.predicate = predicate || ((creep)=>((target)=>true));
        this.KEEPER_PATH_PATH = 'lair_path';
        this.KEEPER_PATH = 'lair';
    }

    findBrothers(creep) {
        return creep.pos.findInRange(FIND_MY_CREEPS, 10, {filter: (c) => c.memory.role == creep.memory.role});
    }

    accepts(creep) {
        // creep.log('moveToNextKeeperLair');
        let lair = util.objectFromMemory(creep.memory, this.KEEPER_PATH, (lair)=>lair.ticksToSpawn || lair.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length == 0);
        // creep.log('lair?', lair);
        if (lair) {
            let desiredRange = creep.getActiveBodyparts(ATTACK) > 0 ? 3 : 6;
            let range = creep.pos.getRangeTo(lair);
            // creep.log(`lair ${lair} desiredRange ${desiredRange}, range ${range}`);
            if (range< desiredRange) {
                let path = PathFinder.search(creep.pos, {pos: lair.pos, range: desiredRange}, {flee: true}).path;
                creep.log('moving out', path[0]);
                creep.move(path[0]);
                // delete creep.memory[this.KEEPER_PATH];
                return true;
            } else if (range === desiredRange) {
                // stop here
                // creep.log('close enough, stopping');
                // delete creep.memory[this.KEEPER_PATH];
                return true;
            } else {
                util.moveTo(creep, lair.pos, this.constructor.name, {range: 1});
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
            lairs = lairs.filter(this.predicate(creep));
            // creep.log('lairs', lairs.length);
            if (!lairs.length) return false;
            let sorted = _.sortBy(_.filter(lairs, (lair)=> lair.ticksToSpawn), (lair)=> lair.ticksToSpawn);
            // creep.log('first lair ? ', sorted.length);
            if (sorted.length) {
                let target = sorted[0];
                creep.memory[this.KEEPER_PATH] = target.id;
                // creep.log('lair at', target.pos, JSON.stringify(target.pos.getRangeTo(creep)), creep.pos.getRangeTo(target));
                let rangeTo = creep.pos.getRangeTo(target);
                // creep.log('rangeto lair', rangeTo);
                if (rangeTo > 7 && target && target.pos) {
                    let to = util.moveTo(creep, target.pos, this.constructor.name, {range:5});

                    // let path = PathFinder.search(creep.pos, {pos: target.pos, range: 5}, {
                    //     roomCallback: util.avoidCostMatrix(creep,hostiles,4)}).path;
                    // let to = creep.moveTo(path[0]);
                    // creep.log('moving', JSON.stringify(path[0]));
                    if (OK !== to && ERR_TIRED !== to) {
                        creep.log('moving?', to);
                    }
                } else if (rangeTo <= (creep.getActiveBodyparts(ATTACK).length>0?4:8)) {
                    let byPath = util.moveTo(creep, target.pos, this.constructor.name, {range:2, avoidCreeps:true});
                    // let path = PathFinder.search(creep.pos, {pos: target.pos, range: 1}, {
                    //     flee: true,
                    //     roomCallback: util.avoidCostMatrix(creep, hostiles)
                    // });
                    //
                    // let byPath = creep.moveByPath(path.path);
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