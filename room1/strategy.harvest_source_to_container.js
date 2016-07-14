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
            this.resourceType = RESOURCE_ENERGY;
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
        let doNotShareSourcePredicate = (range)=> ((s)=>s.pos.findInRange(FIND_MY_CREEPS, range, {filter: (c)=> c.memory.role === creep.memory.role && c.id !== creep.id}) === 0);
        let __ret = this.findSourceAndContainer(creep);
        var source = __ret.source;
        var container = __ret.container;
        if (source && container) {
            if (creep.pos.getRangeTo(container.pos) == 0) {
                // creep.log('on container');

                if (creep.carryCapacity && creep.carry.energy
                    && (!util.roster(creep.room).repair2 && container.hits < 0.25 * container.hitsMax || source.energy === 0 || _.sum(container.store) === container.carryCapacity)) {
                    let repair = creep.repair(container);
                    // creep.log('repairing container?', repair);
                    if (repair === OK) return true;
                }
                let freeCapacity = container.storeCapacity - _.sum(container.store);
                if (!this.nooverflow || this.nooverflow && freeCapacity > 0) {
                    let harvestBeforeRegen = source.ticksToRegeneration * 2 * creep.getActiveBodyparts(WORK);
                    // creep.log(source.energy == source.energyCapacity, freeCapacity, harvestBeforeRegen);
                    if (this.isSourceFull(source) || freeCapacity > 0 // no nooverflow
                        || harvestBeforeRegen <= this.harvestableAmount(source)) {// will we deplete energy before regen ?
                        let ret = creep.harvest(source);
                        if (OK !== ret && ERR_NOT_IN_RANGE !== ret && ERR_NOT_ENOUGH_RESOURCES !== ret) {
                            creep.log('harvest?', ret);
                        }
                    }
                }
                // creep.log("transfer ? ", ret, ", ", container.store[this.resource]);
            } else {
                let path = creep.memory[this.PATH_TO_SOURCE_PATH];
                if (!path) {
                    let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);

                    path = PathFinder.search(creep.pos, {pos: container.pos, range: 0}, {
                        roomCallback: this.costMatrix(creep, hostiles)
                    }).path;
                    creep.memory[this.PATH_TO_SOURCE_PATH] = path;
                }
                if (path.length) {
                    let moveTo = creep.moveTo(path[0].x, path[0].y, container, {noPathFinding: true});
                    if (moveTo === OK) {
                        path.shift();
                    }
                    // creep.log('moveTo?', moveTo);
                    if (ERR_INVALID_TARGET === moveTo || ERR_NO_PATH === moveTo) {
                        creep.log('unreachable? switching targets');
                        this.clearMemory(creep);
                    }
                } else {
                    // should be home !
                    creep.log('home?', creep.pos.getRangeTo(container));
                    delete creep.memory[this.PATH_TO_SOURCE_PATH];
                    path = void(0);
                }

            }
            // try transfering/moving
        }

        else if (source) {
            if (creep.pos.getRangeTo(source) == 1) {
                let ret = creep.harvest(source);
                /*
                 if (creep.memory.role === 'keeperHarvester') {
                 creep.log(Game.time, 'harvesting', ret);
                 }
                 */
                if (OK !== ret && ERR_NOT_IN_RANGE !== ret && ERR_NOT_ENOUGH_RESOURCES !== ret) {
                    creep.log('harvest?', ret);
                }
            } else {
                let path = creep.memory[this.PATH_TO_SOURCE_PATH];
                if (!path) {
                    creep.log('looking up path');
                    let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
                    /*
                     if (!creep.pos || !source.pos) {
                     if (!source.pos) {
                     creep.log('!source.pos !!!!', source.id, source);
                     util.release(creep, source,'harvest');
                     delete creep.memory[this.SOURCE_PATH];
                     return false;
                     }
                     }
                     */
                    path = PathFinder.search(creep.pos, {pos: source.pos, range: 1}, {
                        roomCallback: this.costMatrix(creep, hostiles)
                    }).path;
                    creep.memory[this.PATH_TO_SOURCE_PATH] = path;
                }

                if (path.length) {

                    let moveTo = creep.moveTo(path[0].x, path[0].y, container, {noPathFinding: true});
                    if (moveTo === OK) {
                        path.shift();
                    }
                } else {
                    creep.log('home?', creep.pos.getRangeTo(source));
                    delete creep.memory[this.PATH_TO_SOURCE_PATH];

                }
                // this.moveTo(creep, source);
            }


            /* todo needed ?
             if (!(Game.time % 25)) {
             delete creep.memory[this.SOURCE_PATH];
             }
             */
        }

        /*if (creep.memory.role =='remoteHarvester') {
         creep.log(source,container, undefined === source || undefined === container)
         }*/
        return (undefined !== source && undefined !== container );

    }

    findSourceAndContainer(creep) {
        let releaseLambda = (id) => {creep.log('discarding', id); return (util.release(creep, id, 'harvest'))};

        /** @type {Source} */
        let container = util.objectFromMemory(creep.memory, this.CONTAINER_PATH, (s) =>  !util.isReserved(creep, s, 'harvest'), releaseLambda);
        /** @type {StructureContainer} */
        let source = util.objectFromMemory(creep.memory, this.SOURCE_PATH, (s)=> !util.isReserved(creep, s, 'harvest'), releaseLambda);
        if (!source || (!container && this.findFreeContainersNear(creep, source).length)) {
            // find a source, with a free container near it, and reserve it
            // else find a source, without a used container near it
            if (container) {
                util.release(creep, container.id, 'harvest');
            }
            source = container = null;
            /** @type {Source[]| Mineral[]} */
            let sources = _.filter(this.findSources(creep),  (s)=>!util.isReserved(creep, s, 'harvest'));
            if (creep.memory.role ==='mineralHarvester') {
                creep.log('sources', sources.length);
            }

            // Source => [Source|Mineral, Container[]]
            let sourcesWithNearbyNonReservedContainers = _.map(
                sources,
                (s)=> [s, this.findFreeContainersNear(creep, s)]);

            let mySourceAndContainer = _.find(sourcesWithNearbyNonReservedContainers, (pair)=>pair[1].length);
            if (creep.memory.role ==='mineralHarvester') {
                creep.log('mySourceAndContainer', mySourceAndContainer);
            }
            if (mySourceAndContainer) {
                source = mySourceAndContainer[0];
                // creep.log('container?', mySourceAndContainer[1], mySourceAndContainer[1][0]);
                container = mySourceAndContainer[1][0];
            } else {
                source = creep.pos.findClosestByRange(sources);
            }
            (creep.memory.locks || []).forEach((id)=> {
                util.release(creep, id, 'harvest');
                delete creep.memory.locks[id];
            });

            if (source && util.reserve(creep, source, 'harvest')) {
                creep.memory[this.SOURCE_PATH] = source.id;
            } else {
                source = null;
            }
            /*
             if (creep.memory.role === 'keeperHarvester') {
             creep.log('source', source);
             }
             */
            if (container instanceof StructureContainer && util.reserve(creep, container, 'harvest')) {
                // creep.log('source && container');
                creep.memory[this.CONTAINER_PATH] = container.id;
                if (creep.room.memory.harvestContainers && creep.room.memory.harvestContainers.indexOf(container.id) < 0) {
                    creep.room.memory.harvestContainers.push(container.id);
                }
            } else {
                container = null;
            }
            // creep.log('source', source);
            // creep.log('Container', container);
        }
        return {
            source: source, container: container
        };
    }

    findFreeContainersNear(creep, source) {
        return _.filter(source.pos.findInRange(FIND_STRUCTURES, 1), (c) => c.structureType == STRUCTURE_CONTAINER && !util.isReserved(creep, c, 'harvest'));
    }

    costMatrix(creep, hostiles) {
        return (roomName) => {
            new PathFinder.CostMatrix();
            if (roomName == creep.room.name) {
                let matrix = new PathFinder.CostMatrix();
                hostiles.forEach((c)=> {
                    new PathFinder.CostMatrix()
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
                return matrix;
            } else {
                return false;
            }
        };
    }

    harvestableAmount(source) {
        return source instanceof Source ? source.energy : source.mineralAmount;
    }

    findSources(creep) {
        let filter = _.filter((!this.resourceType || this.resourceType === RESOURCE_ENERGY)?creep.room.find(FIND_SOURCES, {filter: this.noHostiles()}):creep.room.find(FIND_MINERALS, {filter: this.noHostiles()}));
        return filter;

    }

    isSourceFull(source) {
        return source instanceof Source ? source.energy == source.energyCapacity : source.mineralAmount > 0;
    }

    noHostiles() {
        return (s)=> 0 === s.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length;
    }
}

module.exports = HarvestEnergySourceToContainerStrategy;
