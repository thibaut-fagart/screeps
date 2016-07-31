var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class AvoidRespawnStrategy extends BaseStrategy {
    constructor(range, predicate) {
        super();
        this.minrange = range||0;
        this.predicate = predicate || ((creep)=>(()=>true));
    }
    
    accepts (creep) {
        // creep.log('AvoidRespawnStrategy');
        // if (creep.hits === creep.hitsMax) return false;
        let nonDisabled = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {filter:(c)=>(c.pos.getRangeTo(creep) <= this.minrange) || _.filter(c.body, (b)=>b.hits > 0).length > 1});
        if (nonDisabled.length>0 && this.predicate(creep)()) {
            // creep.log('get out ', this.minrange);
            // get the hell out !
            let fleePath = PathFinder.search(creep.pos, {pos: nonDisabled[0].pos, range: 7}, {flee:true}).path;
            creep.moveTo(fleePath[0]);
            return true;
        }
        let lairs = creep.pos.findInRange(FIND_STRUCTURES, 6, {filter: {structureType: STRUCTURE_KEEPER_LAIR}});
        // creep.log('lairs?', lairs.length);
        if (lairs.length && lairs[0].ticksToSpawn < 10) {
            if (lairs[0].pos.getRangeTo(creep) < 10) {
                // get the hell out !
                // creep.log('need fo flee !', lairs[0].ticksToSpawn);
                let search = PathFinder.search(creep.pos, {pos: lairs[0].pos, range: 6}, {flee: true});
                let path = search.path;

                // creep.log('moving to', JSON.stringify(path[0]));
                creep.moveTo(path[0]);
                return true;
            } else {
                return false;
            }
        }
        // creep.log('no threat');
        return false;
    }
}
module.exports = AvoidRespawnStrategy;