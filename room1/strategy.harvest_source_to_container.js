var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');
/**
 * finds a non-empty  energy source, chooses at random to spread the load
 */
class HarvestEnergySourceToContainerStrategy extends BaseStrategy {
    constructor(options) {
        super();
        if ('string' === typeof options) {
            this.resourceType = options;
        } else if (!options) {
            this.resourceType = false;
        } else {
            this.resourceType = options.resourceType;
            this.nooverflow = options.nooverflow;
        }

        this.SOURCE_PATH = 'source';
        this.CONTAINER_PATH = 'container';
        this.PATH_TO_SOURCE_PATH = 'pathToSource';
    }

    clearMemory(creep) {
        delete creep.memory[this.SOURCE_PATH];
        delete creep.memory[this.CONTAINER_PATH];
    }


    /** @param {Creep} creep
     * @return {Source|| null}**/
    accepts(creep) {
        // creep.log('source', this.constructor.name);
        let __ret = this.findSourceAndContainer(creep);
        var source = __ret.source;
        var container = __ret.container;
        // creep.log('findSourceAndContainer', source, container);
        if (source && container) {
            if (creep.pos.getRangeTo(container.pos) == 0) {
                // creep.log('on container', !!creep.carryCapacity,(container.hits < 0.5 * container.hitsMax), source.energy === 0, _.sum(container.store) === container.storeCapacity);

                if (creep.carryCapacity && source.energyCapacity
                    && ((container.hits < 0.5 * container.hitsMax) || (source.energy === 0) || _.sum(container.store) === container.storeCapacity)) {
                    if ((creep.carry.energy || 0) < creep.getActiveBodyparts(WORK)) {
                        creep.withdraw(container, RESOURCE_ENERGY);
                    }
                    if (creep.carry.energy) {
                        let repair = creep.repair(container);
                        // creep.log('repairing container?', repair);
                        if (repair === OK) {
                            return true;
                        }
                    }
                }
                let freeCapacity = container.storeCapacity - _.sum(container.store);
                // creep.log('freeCapacity', freeCapacity, this.nooverflow);
                if (!this.nooverflow || (this.nooverflow && freeCapacity > 0)) {
                    if (freeCapacity > 0 || this.isSourceFull(source)) {
                        let ret = creep.harvest(source);
                        // creep.log('harvest', ret);
                        if (OK !== ret && ERR_NOT_IN_RANGE !== ret && ERR_NOT_ENOUGH_RESOURCES !== ret && ERR_TIRED !== ret) {
                            // creep.log('harvest?', ret);
                        } else if (ERR_NOT_ENOUGH_RESOURCES === ret && source.mineralType) {
                            creep.memory.role = 'recycle';
                        } else if (ERR_NO_BODYPART === ret) {
                            if (creep.hits < creep.hitsMax && !creep.room.find(FIND_CREEPS).filter(c=>c.my && c.getActiveBodyparts(HEAL) > 0).find(()=>true)) {
                                if (creep.getActiveBodyparts(MOVE) > 0) {
                                    creep.memory.role = 'recycle';
                                } else {
                                    Game.notify(`${Game.time} ${creep.name},${creep.room.name} no more WORK, suiciding`);
                                    creep.suicide();
                                }
                            }
                        }
                    }
                }
            } else {
                let moved = false;
                if (creep.pos.getRangeTo(container.pos) == 1) {
                    let obstacleCreeps = container.pos.lookFor(LOOK_CREEPS);
                    if (obstacleCreeps.length) {
                        if (!obstacleCreeps[0].memory.role === creep.memory.role) {
                            obstacleCreeps[0].moveTo(creep.pos);
                        } else if (creep.pos.getRangeTo(source.pos) >1){
                            creep.moveTo(source);
                            moved = true;
                        } else {
                            moved = true;
                            creep.harvest(source);
                        }
                    }
                }
                // creep.log('moving to container');
                if (! moved) {
                    this.moveTo(creep, container);
                }

                // creep.log('moveTo?', moveTo);
            }
            // try transfering/moving
        }

        else if (source) {
            // creep.log('source but no container', JSON.stringify(source.pos));
            if (creep.pos.getRangeTo(source) == 1) {
                let ret = creep.harvest(source);
                /*
                 if (creep.memory.role === 'keeperHarvester') {
                 creep.log(Game.time, 'harvesting', ret);
                 }
                 */
                if (OK !== ret && ERR_NOT_IN_RANGE !== ret && ERR_NOT_ENOUGH_RESOURCES !== ret && ERR_TIRED !== ret) {
                    // creep.log('harvest?', ret);
                }
            } else {
                // creep.log('moving to source');
                let moveTo2 = this.moveTo(creep, source);
                if (ERR_NOT_FOUND === moveTo2) {
                    creep.log('discarding path');
                    delete creep.memory[this.PATH_TO_SOURCE_PATH];
                }
            }
        }

        /*if (creep.memory.role =='remoteHarvester') {
         creep.log(source,container, undefined === source || undefined === container)
         }*/
        let returnValue = (source && !util.isReserved(creep, source) /* && undefined !== container */)
        // creep.log('success?', returnValue, source);
        return returnValue;

    }

    moveTo(creep, source) {
        return util.moveTo(creep, source.pos, this.constructor.name + 'Path', {range: source.structureType ? 0 : 1});
    }


    findSourceAndContainer(creep) {
        let releaseLambda = (id) => {
            creep.log('discarding', id);
            return (util.release(creep, id, 'harvest'));
        };

        /** @type {Source} */
        let container = util.objectFromMemory(creep.memory, this.CONTAINER_PATH, (s) => !util.isReserved(creep, s, 'harvest'), releaseLambda);
        /** @type {StructureContainer} */
        let source = util.objectFromMemory(creep.memory, this.SOURCE_PATH, (s)=> !util.isReserved(creep, s, 'harvest'), releaseLambda);
        // creep.log('source', source);
        if (!source || (!container /*&& this.findFreeContainersNear(creep, source).length*/)) {
            // find a source, with a free container near it, and reserve it
            // else find a source, without a used container near it
            // creep.log('searching', source, container);
            if (container) {
                util.release(creep, container.id, 'harvest');
            }
            if (!source) {
                /** @type {(Source|Mineral)[]} */
                let sources = this.findSources(creep).filter((s)=> s.mineralAmount || !util.isReserved(creep, s, 'harvest'));
                // todo order sources by number of harvesters
                // let sourcesByCreeps = _.groupBy(sources, s=>s.room.glanceForAround(LOOK_CREEPS, s.pos, 1, true).map(i=>i.creep).filter(c=>c.memory.role === creep.memory.role));
                // creep.log('sources', this.resourceType, sources.length, JSON.stringify(sources.map((s)=>s.pos)));

                // Source => [Source|Mineral, Container[]]
                let sourcesWithNearbyNonReservedContainers = _.map(
                    sources,
                    (s)=> [s, this.findFreeContainersNear(creep, s)]);

                let mySourceAndContainer = _.find(sourcesWithNearbyNonReservedContainers, (pair)=>pair[1].length);
                // creep.log('mySourceAndContainer', mySourceAndContainer);
                if (mySourceAndContainer) {
                    source = mySourceAndContainer[0];
                    // creep.log('container?', mySourceAndContainer[1], mySourceAndContainer[1][0]);
                    container = mySourceAndContainer[1][0];
                } else {
                    source = creep.pos.findClosestByRange(sources);
                }
                // creep.log('chosen source', source);
            } else {
                let containers = this.findFreeContainersNear(creep, source).length;
                container = containers[0];
            }
            /*
             (creep.memory.locks || []).forEach((id)=> {
             util.release(creep, id, 'harvest');
             delete creep.memory.locks[id];
             });

             */
            if (source && (source.mineralAmount || util.reserve(creep, source, 'harvest'))) {
                creep.memory[this.SOURCE_PATH] = source.id;
            } else {
                source = null;
            }
            /*
             if (creep.memory.role === 'keeperHarvester') {
             creep.log('source', source);
             }
             */
            if (container && container instanceof StructureContainer && util.reserve(creep, container, 'harvest')) {
                // creep.log('source && container');
                creep.memory[this.CONTAINER_PATH] = container.id;
                let harvestContainers = creep.room.memory.harvestContainers || [];
                // creep.log('harvestContainers', harvestContainers, (harvestContainers&& harvestContainers.length));
                if (!container.room.isHarvestContainer(container)) {
                    harvestContainers.push(container.id);
                    creep.room.memory.harvestContainers = harvestContainers;
                }
                // creep.log('harvestContainers2', harvestContainers, (harvestContainers&& harvestContainers.length));

            } else {
                // build a container if none near the source
                if (source && !container && creep.getActiveBodyparts(CARRY) > 0 && !creep.memory.link ) {
                    let area = source.room.glanceAround(source.pos, 1, true);
                    let containers = area.filter((e)=>e.type === 'structure').map((e)=>(e.structure)).filter((s)=>s.structureType === STRUCTURE_CONTAINER);
                    if (!containers.length) {
                        let containerSites = area.filter((e)=>e.type === 'constructionSite').map((e)=>(e.constructionSite)).filter((s)=>s.structureType === STRUCTURE_CONTAINER);
                        if (!containerSites.length) {
                            creep.log('building container');
                            this.buildContainer(source.pos, creep);
                        } else {
                            if (creep.carry) {
                                let activeWork = creep.getActiveBodyparts(WORK);
                                if (creep.carry.energy < activeWork * BUILD_POWER) {
                                    let drop = creep.pos.lookFor(LOOK_RESOURCES).find(l=>l.energy);
                                    if (drop) {
                                        creep.pickup(drop);
                                    }
                                }
                                if (creep.carry.energy === creep.carryCapacity || creep.carry.energy >= activeWork * BUILD_POWER) {
                                    creep.build(containerSites[0]);
                                }
                            }
                        }
                    }
                }
                container = null;
            }
            // creep.log('source', source);
            // creep.log('Container', container);
        }
        // creep.log('found', source, container);
        return {
            source: source, container: container
        };
    }

    buildContainer(pos, creep) {
        if (creep.room.controller && creep.room.controller.owner && creep.room.controller.level < 3) return;
        let buildPos = creep.room.findValidParkingPosition(creep, pos, 1);
        creep.log('building container at', buildPos.x, buildPos.y);
        if (buildPos) {
            let ret = creep.room.createConstructionSite(buildPos.x, buildPos.y, STRUCTURE_CONTAINER);
            creep.log('built a container?', ret, buildPos.x, buildPos.y);
        }
    }

    findFreeContainersNear(creep, source) {
        return creep.room.glanceForAround(LOOK_STRUCTURES, source.pos, 1, true).map(s=>s.structure)
        // source.pos.findInRange(FIND_STRUCTURES, 1)
            .filter((c) => c.structureType == STRUCTURE_CONTAINER && !util.isReserved(creep, c, 'harvest'));
    }

    harvestableAmount(source) {
        return source instanceof Source ? source.energy : source.mineralAmount;
    }

    findSources(creep) {
        let sources = util.findSafeSources(creep.room, (!this.resourceType) || (RESOURCE_ENERGY !== this.resourceType));
        // creep.log('util.safeSources',RESOURCE_ENERGY !==this.resourceType, this.resourceType === util.ANY_MINERAL, this.resourceType, sources.length, JSON.stringify(sources.map((s)=>s.pos)));
        let safeSources = sources.filter((s)=> {
            // if (!this.resourceType) return true;
            switch (this.resourceType) {
                case RESOURCE_ENERGY :
                    return s.energy;
                case util.ANY_MINERAL :
                    return s.mineralAmount;
                default: {
                    return (this.resourceType ? this.mineralType === this.resourceType : true) && (s.mineralAmount || s.energyCapacity);
                }
            }
        });
        // creep.log('safeSources1', safeSources.length, JSON.stringify(safeSources.map((s)=>s.pos)));

        return safeSources;
    }

    isSourceFull(source) {
        return source instanceof Source ? source.energy == source.energyCapacity : source.mineralAmount > 0;
    }

}

require('./profiler').registerClass(HarvestEnergySourceToContainerStrategy, 'HarvestEnergySourceToContainerStrategy');
module.exports = HarvestEnergySourceToContainerStrategy;
