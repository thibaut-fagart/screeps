var _ = require('lodash');
var util = require('./util');
var LoadFromContainerStrategy = require('./strategy.load_from_container');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class StrategyLootContainer extends LoadFromContainerStrategy {

    constructor(resource, structure, predicate) {
        super(undefined, undefined,undefined);
    }

    clearMemory(creep) {
        delete creep.memory[LoadFromContainerStrategy.PATH];
    }

    /** @param {Creep} creep
     * @return {boolean}**/
    accepts(creep) {
        let neededCarry = creep.carryCapacity - _.sum(creep.carry);
        let source = util.objectFromMemory(creep.memory, LoadFromContainerStrategy.PATH, (c)=>this.containerQty(creep, c) > neededCarry);
        if (!source || (this.containerQty(creep, source) ===0) || source.room.name !== creep.room.name) {
            source = this.findSource(creep, source);
            if (source) {
                creep.memory[LoadFromContainerStrategy.PATH] = source.id;
            }
        }
         //creep.log('source',source);

        if (source) {
            // creep.log('LoadFromContainerStrategy', 'loading',JSON.stringify(source.pos));
            // try transfering/moving
            if (source.transfer || source.transferEnergy) {
                this.transferFromSource(source, creep, neededCarry);
            } else {
                creep.log('source!transfer', source.structureType, source.prototype, JSON.stringify(source));
                return null;
            }

        }

        // creep.log(this.constructor.name , 'accepts?', null == source);
        return (!!source );

    }

    /**
     *  looks for a container having enough resources in store to fill this creep
     * @param creep
     * @param neededCarry
     * @param source
     * @returns {*}
     */
    findSource(creep, neededCarry, source) {
        delete creep.memory[LoadFromContainerStrategy.PATH];
        creep.log('Looting', 'finding source');
        // find a new source, if no type specified, allow links if shared links have enough energy
        let containers = creep.room.findContainers();
        creep.log('containers', containers.length);
        let nonEmptySources = [];
        containers.forEach((s)=> {
            let qty = this.containerQty(creep, s);
            if (qty > 0) {
                nonEmptySources.push(s);
            }
        });
        creep.log('nonEmpty', nonEmptySources.length);
        source = _.min(nonEmptySources, c=>c.pos.getRangeTo(creep.pos));
        if (source) {
            creep.log('LoadFromContainerStrategy', 'finding source', 'chose',JSON.stringify(source.pos), this.containerQty(creep,source));
            creep.memory[LoadFromContainerStrategy.PATH] = source.id;
            // creep.memory.action = 'load';
        }
        return source;
    }

    /**
     * returns the quantity of resource this creep can pickup from this source
     * @param creep
     * @param structure
     * @returns {number}
     */
    containerQty(creep, structure) {
        if (structure.energy) {
            return structure.energy;
        } else if (structure.store) {
            return _.sum(structure.store);
        } else {
            return 0;
        }
    }
}
require('./profiler').registerClass(StrategyLootContainer, 'StrategyLootContainer'); module.exports = StrategyLootContainer;