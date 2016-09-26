var _ = require('lodash');
var util = require('./util');

StructureLab.prototype.requiresRefill = function () {
    'use strict';
    let mineralType = this.room.expectedMineralType(this);
    return mineralType  && (this.mineralAmount < 0.3 * this.mineralCapacity
        && (this.room.storage && this.room.storage.store[mineralType] || this.room.terminal && this.room.terminal.store[mineralType]));
};
StructureLab.prototype.requiresEmptying = function () {
    'use strict';
    return (this.mineralType && this.mineralType !== this.room.expectedMineralType(this)) || this.mineralAmount > 0.66 * this.mineralCapacity;
};


module.exports = Room.prototype;