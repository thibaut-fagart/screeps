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
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES, {filter: this.predicate(creep)});
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
        creep.room.buildStructures(creep.pos);
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
                this.requestConstructionSite(creep);
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
        return creep.room.findValidParkingPosition(creep, target.pos, 3);
    }

}

module.exports = BuildStrategy;