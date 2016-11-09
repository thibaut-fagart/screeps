var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class BuildStrategy extends BaseStrategy {
    constructor(predicate) {
        super();
        this.predicate = (predicate) || (()=>(()=>true));
        this.BUILD_TARGET = 'buildtarget';
    }

    findTarget(creep) {
        // creep.log('predicate',this.predicate(creep)((Game.getObjectById(creep.memory[this.BUILD_TARGET]))));
        var target = util.objectFromMemory(creep.memory, this.BUILD_TARGET, this.predicate(creep));
        // if (target) creep.log('buildTarget', target);
        if (!target) {
            // console.log('finding target for  ', creep.name);
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES).filter(c=>c.my && (this.predicate(creep))(c));
            if (targets.length) {
                if (targets[0].progress > 0) {
                    target = targets[0];
                } else if (creep.carry.energy) {
                    target = creep.pos.findClosestByPath(targets);
                } else {
                    // creep.memory.building = false;
                    return null;
                }
                if (target) {
                    creep.memory[this.BUILD_TARGET] = target.id;
                }
            }
        }
        return target;
    }

    requestConstructionSite(creep) {
        return creep.room.buildStructures(creep.pos);
    }
    /** @param {Creep} creep **/
    accepts(creep) {

        var target;
        if (creep.carry.energy) {
            target = this.findTarget(creep);
            // creep.log('building',target);
            if (!target) {
                // creep.log('searching for deaying');
                let nearbyDecaying = creep.room.glanceForAround(LOOK_STRUCTURES, creep.pos, 2, true)
                    .map((r)=>r.structure)
                    .filter((s)=>'number' === typeof s.ticksToDecay && s.hits < global[s.structureType.toUpperCase() + '_DECAY_AMOUNT'] * 1500 / global[s.structureType.toUpperCase() + '_DECAY_TIME']);
                // creep.log('found ', JSON.stringify(nearbyDecaying));
                if (nearbyDecaying.length > 0) {
                    creep.repair(nearbyDecaying[0]);
                    return true;
                }
                target = this.requestConstructionSite(creep);
                // creep.log('target null');
                delete creep.memory[this.BUILD_TARGET];
            } else {
                let buildPos = this.findBuildPos(creep, target);
                if (buildPos && !creep.pos.isEqualTo(buildPos)) {
                    // creep.log('moving', buildPos);
                    util.moveTo(creep, buildPos, this.constructor.name + 'Path', {range: 0});
                } else {
                    let build = creep.build(target);
                    if (build == ERR_NOT_IN_RANGE && !buildPos) {
                        util.moveTo(creep, target.pos, this.constructor.name + 'Path', {range: 3});
                    } else if (build === ERR_INVALID_TARGET) {
                        delete creep.memory[this.BUILD_TARGET];
                    } else if (build !== OK) {
                        creep.log('build?', build);
                    }
                }
                if (target.progress == target.progressTotal) {
                    // creep.log('build complete', target.name);
                    delete creep.memory[this.BUILD_TARGET];
                }
            }
        } else {
            delete creep.memory.buildFrom;
        }
        return target;
    }


    /**
     *
     * @param {Creep| {pos}} creep
     * @param {ConstructionSite} target
     * @returns {RoomPosition}
     */
    findBuildPos(creep, target) {
        // return creep.room.findValidParkingPosition(creep, target.pos, 3);
        if (creep.memory.buildFrom) {
            let pos = util.posFromString(creep.memory.buildFrom, creep.room.name);
            let creepAtPos = pos.lookFor(LOOK_CREEPS).filter(c=>c.name !== creep.name);
            // creep.log('creepAtPos', JSON.stringify(creepAtPos));
            if (creepAtPos.length || pos.getRangeTo(target)>3) {
                // creep.log('conflict',creepAtPos[0].name);
                delete creep.memory.buildFrom;
            }
        }
        if (!creep.memory.buildFrom) {
            let position;
            let positions = creep.room.findValidParkingPositions(creep,[{pos: target.pos, range: 3}]);
            if (positions.length) {
                // creep.log('finding closest of ', JSON.stringify(positions), JSON.stringify(positions.map(p=>p instanceof RoomPosition)));
                position = creep.pos.findClosestByPath(positions);
            } else {
                return undefined;
            }

            if (position) {
                creep.memory.buildFrom = util.posToString(position);
            } else {
                return undefined;
            }
            // creep.log('upgrading from '+creep.memory.buildFrom);

        }
        // creep.log('upgrading from '+creep.memory.buildFrom);
        return util.posFromString(creep.memory.buildFrom, creep.room.name);

    }

}

require('./profiler').registerClass(BuildStrategy, 'BuildStrategy'); module.exports = BuildStrategy;