var _ = require('lodash');
var util = require('./util');
var RemoteHealStrategy = require('./strategy.remote_heal');
var RoleRemoteHarvester = require('./role.remote_harvester');
var HarvestKeeperSourceToContainerStrategy = require('./strategy.harvest_keepersource_to_container');
var HarvestKeeperSourceStrategy = require('./strategy.harvest_keepersource');
var AvoidRespawnStrategy = require('./strategy.avoidrespawn');
var CloseAttackStrategy = require('./strategy.closeattack_target');

class RoleRemoteHarvesterKeeper extends RoleRemoteHarvester {
    constructor() {
        super();
        this.fleeStrategy = {accepts:()=>false};

        this.healStrategy = new RemoteHealStrategy(1/*, (creep)=>((c)=>(creep.id ===c.id && creep.hits +this.healingCapacity(creep) < creep.hitsMax)) || creep.id !==c.id */);
        this.harvestStrategy = new HarvestKeeperSourceToContainerStrategy(RESOURCE_ENERGY);
        //this.harvestStrategy = new HarvestKeeperSourceStrategy();
        this.attackStrategy = new CloseAttackStrategy(5);
        this.loadStrategies = [this.harvestStrategy];
        util.indexStrategies(this.loadStrategies);

    }

    /** @param {Creep} creep **/
    run(creep) {
        // creep.log('running', this.loadStrategies.length);
        creep.memory.isFighter = _.isUndefined(creep.memory.isFighter) ? !!creep.body.find(p =>p.type === ATTACK) : creep.memory.isFighter;

        if (creep.memory.remoteRoom === creep.room.name && creep.memory.isFighter) {
            if (creep.hits < creep.hitsMax) {
                let ennemies = creep.room.glanceForAround(LOOK_CREEPS, creep.pos, 5, true).map(d=>d.creep).filter(c=>!c.my);
                let closest = creep.pos.findClosestByRange(ennemies);
                if (creep.pos.getRangeTo(closest)===4) {
                    this.healStrategy.accepts(creep);
                    return;
                }
            }

            if (creep.room.glanceForAround(LOOK_CREEPS, creep.pos, 4, true).map(d=>d.creep).find(c=>!c.my)) {
                // creep.log('in range, attacking');
                this.attackStrategy.accepts(creep);
            } else {
                this.healStrategy.accepts(creep);
                if (this.isNearSource(creep)) {
                    // creep.log('near source');
                    if (!creep.memory.lair) {
                        let keeperLairs =
                            creep.room.glanceForAround(LOOK_STRUCTURES, creep.pos, 7, true).map(s=>s.structure)
                        // creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 7)
                            .filter(s=>s.structureType === STRUCTURE_KEEPER_LAIR);
                        if (keeperLairs.length) {
                            creep.memory.lair = keeperLairs[0].id;
                        }
                    }
                    let ticks = Game.getObjectById(creep.memory.lair).ticksToSpawn;
                    if (ticks && ticks > Game.time && ticks + 10 < Game.time) {
                        // creep.log('moving to lair, about to respawn');
                        // almost respawn, move to lair
                        creep.moveTo(Game.getObjectById(creep.memory.lair));
                        return;
                    }

                }
                super.run(creep);
            }
        } else {
            this.healStrategy.accepts(creep);
            if (creep.hits + util.healingCapacity(creep) < creep.hitsMax) {
                if (this.fleeStrategy.accepts(creep)) {
                    this.harvestStrategy.SOURCE_PATH = 'source';
                    this.harvestStrategy.CONTAINER_PATH = 'container';
                    this.harvestStrategy.PATH_TO_SOURCE_PATH = 'pathToSource';

                    util.release(creep, creep.memory[this.harvestStrategy.SOURCE_PATH], 'harvest');
                    util.release(creep, creep.memory[this.harvestStrategy.CONTAINER_PATH], 'harvest');
                    delete creep.memory[this.harvestStrategy.SOURCE_PATH];
                    delete creep.memory[this.harvestStrategy.CONTAINER_PATH];
                    delete creep.memory[this.harvestStrategy.PATH_TO_SOURCE_PATH];
                }
            } else if (creep.memory.isFighter || !this.fleeStrategy.accepts(creep)) {
                // creep.log('super');
                super.run(creep);
            }
        }
    }

    isNearSource(creep) {
        let sourceid = creep.memory.source || creep.memory.source2;
        let source = Game.getObjectById(sourceid);
        return source && creep.pos.getRangeTo(source) == 1;
    }

}
RoleRemoteHarvesterKeeper.WANTED_BOOSTS = {};
RoleRemoteHarvesterKeeper.WANTED_BOOSTS[HEAL] = [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_LEMERGIUM_OXIDE];

require('./profiler').registerClass(RoleRemoteHarvesterKeeper, 'RoleRemoteHarvesterKeeper'); module.exports = RoleRemoteHarvesterKeeper;