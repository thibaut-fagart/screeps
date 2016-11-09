var _ = require('lodash');

Source.prototype.container = function () {
    'use strict';
    return _.head(this.room.glanceForAround(LOOK_STRUCTURES, this.pos, 1, true).map(f=>f.structure).filter(s => s.structureType == STRUCTURE_CONTAINER));
};

Object.defineProperty(Mineral.prototype, 'accessTiles', {
    get: function () {
        'use strict';
        let cached = _.get(this.room.memory, ['_sources', this.id, 'accessTiles'], {w: 0});
        if (cached.w < Game.time - 15000) {
            cached.w = Game.time;
            let pos = this.pos;
            let area = this.room.lookAtArea(Math.max(0, pos.y - 1), Math.max(0, pos.x - 1), Math.min(49, pos.y + 1), Math.min(49, pos.x + 1));
            cached.v = require('./util').findWalkableTiles(this.room, area, {ignoreCreeps: true}).length;
            this.room.memory._sources = this.room.memory._sources || {};
            this.room.memory._sources[this.id] = cached;
        }
        return cached.v;
    },
    configurable: true
});

Object.defineProperty(StructureRoad.prototype, 'ticksToVanish', {
    configurable: true,
    get: function () {
        'use strict';
        if (!this._ticksToVanish) {
            let decayPerPeriod = ROAD_DECAY_AMOUNT * (this.pos.lookFor(LOOK_TERRAIN) === 'swamp' ? CONSTRUCTION_COST_ROAD_SWAMP_RATIO : 1);
            let decayToVanish = Math.floor(this.hits / decayPerPeriod) * ROAD_DECAY_TIME + this.ticksToDecay;
            this._ticksToVanish = decayToVanish;
        }
        return this._ticksToVanish;
    }
});
Object.defineProperty(StructureContainer.prototype, 'ticksToVanish', {
    configurable: true,
    get: function () {
        'use strict';
        if (!this._ticksToVanish) {
            this._ticksToVanish = Math.floor(this.hits / CONTAINER_DECAY) * ((this.room.controller && this.room.controller.my && this.room.controller.level >= 1) ? CONTAINER_DECAY_TIME_OWNED : CONTAINER_DECAY_TIME) + this.ticksToDecay;
        }
        return this._ticksToVanish;
    }
});
Mineral.prototype.container = Source.prototype.container;

/*
Object.defineProperty(StructureLab.prototype, 'store', {
    get:function() {
        'use strict';
        let store = {energy : this.energy};

        if (this.mineralAmount) {
            store[this.mineralType] = this.mineralAmount;
        }
        return store;
    },
    configurable:true
});
*/

//Game.getObjectById('579fab83b1f02a3b0cff002c').accessTiles
//var pos =  Game.getObjectById('579fab83b1f02a3b0cff002c').pos; require('./util').findWalkableTiles(Game.rooms.W52S41,Game.rooms.W52S41.lookAtArea(Math.max(0, pos.y - 1), Math.max(0, pos.x - 1), Math.min(49, pos.y + 1), Math.min(49, pos.x + 1)),{ignoreCreeps: true})