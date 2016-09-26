var _ = require('lodash');
var Process = require('./process');
var patterns = require('./base.creep.patterns');
/**
 * locks a source and a container near it if possible
 * drops energy at the spawn if no controller near it is available, otherwise a the container or storage
 * state : room, source, container, creep
 * creates and caches a path between the source and storage if present, otherwise spawn
 */
class Harvest extends Process {

    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {int} priority
     * @param {Source|string} source
     */
    constructor(parent, source) {
        super(parent);
        if (typeof parent === 'object') {
            this.log('restored', this);
            this.log('this.creeps', JSON.stringify(this.creeps));
        } else if (source) {
            this.sourceid = _.isString(source) ? source : source.id;
            this.harvesters = [];
            this.carriers = [];
            this.dropAtId = this.findDropId();
            this.initialize();
        }
    }

    initialize() {
        let source = this.source;
        if (source) {
            let p = source.pos;
            this.requiredHarvest = source.energyCapacity / ENERGY_REGEN_TIME;
            let dropAt = this.dropAt;
            let path = p.findPathTo(dropAt.pos, {ignoreCreeps: true, maxRooms: 1});
            let dist = path.length;
            this.requiredCarry = Math.ceil((source.energyCapacity * CREEP_LIFE_TIME / (ENERGY_REGEN_TIME * 2 * dist * CARRY_CAPACITY)));
            let terrains = source.room.glanceForAround(LOOK_TERRAIN, p, 1, true);
            console.log(JSON.stringify(terrains));
            this.harvestPositions = terrains.filter((t)=>OBSTACLE_OBJECT_TYPES.indexOf(t.terrain) === 0).map((t)=>({
                x: t.x,
                y: t.y
            }));
        }
    }

    run(processTable) {
        super.run(processTable);
        let hasAnyHarvester = this.harvesters.length > 0;

        let hasAnyCarriers = this.carriers.length > 0;
        let missingHarvestParts = this.missingHarvestParts();
        let missingCarryParts = this.missingCarryParts();
        if (this.requestedCreeps.length == 0 && !hasAnyHarvester || (hasAnyCarriers && missingHarvestParts)) {
            if (!this.requestedCreeps.find((req)=>/^harvester.*/.exec(req))) {
                let spec = _.cloneDeep(patterns['harvester']);
                this.requestCreep(spec, this);
            }
        } else if (this.requestedCreeps.length == 0 && !hasAnyCarriers || (hasAnyHarvester && !missingCarryParts)) {
            if (!this.requestedCreeps.find((req)=>/^carry.*/.exec(req))) {
                this.requestCreep(patterns['carry'], this);
            }
        }
        this.harvesters.forEach(name=> {
            let creep = Game.creeps[name];
            this.log('harvester', name, creep, 'spawning?', creep.spawning);
            if (!creep.spawning) {
                let source = this.source;
                if (creep.pos.getRangeTo(this.source) > 1) {
                    creep.moveTo(source);
                }
                console.log('harvest', creep.harvest(this.source));
            }
        });
    }

    satisfied() {
        return this.missingHarvestParts() == 0 &&  this.missingCarryParts() == 0;
    }

    missingHarvestParts() {
        let harvestParts = _.sum(this.harvesters, (name)=>Game.creeps[name].body.filter((part)=>part.type === WORK).length);
        let requiredHarvestParts = this.requiredHarvest / HARVEST_POWER;
        if (harvestParts < requiredHarvestParts) {
            if (this.harvestPositions.length < this.creeps.length) {
                return requiredHarvestParts - harvestParts;
            }
        }
    }

    missingCarryParts() {
        let carryParts = _.sum(this.carriers, (name)=>Game.creeps[name].body.filter((part)=>part.type === CARRY).length);
        let requiredCarryParts = this.requiredCarry / CARRY_CAPACITY;
        if (carryParts < requiredCarryParts) {
            return requiredCarryParts - carryParts;
        }
    }

    creepRequestProcessed(requestId, creepName) {
        super.creepRequestProcessed(requestId, creepName);
        // debugger;
        this.creeps.forEach((name)=> {
            let creep = Game.creeps[name];
            switch (creep.memory.role) {
                case  'carry':
                    this.carriers.push(creep.name);
                    _.pull(this.creeps, creep.name);
                    break;
                case  'harvester':
                    this.harvesters.push(creep.name);
                    _.pull(this.creeps, creep.name);
                    break;
                default:
                    this.log('ERROR, creep with unknown role ', creep.memory.role);
            }
        });

    }

    findDropId() {
        let source = this.source;
        if (this.source.room.storage) {
            return source.room.storage;
        } else {
            let spawns = source.room.find(FIND_MY_SPAWNS);
            if (spawns.length) {
                let spawn = spawns[0];
                let inRange = spawn.pos.findInRange(FIND_STRUCTURES, 2);
                let container = inRange.find(s=>s.store);
                return container && container.id || spawn.id;
            }
            throw new Error('ProcessHarvest with no spawn');
        }
    }

    get dropAt() {
        return Game.getObjectById(this.dropAtId);
    }

    /**
     * @return {Source}
     */
    get source() {
        return Game.getObjectById(this.sourceid);
    }

    /**
     *
     * @param {Source} aSource
     */
    set source(aSource) {
        this.sourceid = aSource.id;
    }

}

module.exports = Harvest;