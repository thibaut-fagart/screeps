var _ = require('lodash');
var util = require('./util');
var DropToContainerStrategy = require('./strategy.drop_to_container');
/**
 * finds a non-empty  energy container, preferably enough to fill this creep, otherwise closesst
 */
class DropToContainerCloseStrategy extends DropToContainerStrategy {
    constructor(resource, structure, predicate, range) {
        super(structure, resource, predicate);
        this.range = range || 1;
        this.PATH = 'closeContainerTarget';
    }


    findCandidates(creep) {
        return creep.room.glanceForAround(LOOK_STRUCTURES, creep.pos, this.range, true).map(l=>l.structure);
    }
}

module.exports = DropToContainerCloseStrategy;