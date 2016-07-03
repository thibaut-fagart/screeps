var _ = require('lodash');
var DECAY_CONSTANTS_OWNED = {}
DECAY_CONSTANTS_OWNED[STRUCTURE_CONTAINER] =  {decay: function(pos) {return 5000;}, delay:function(pos) {return 500;}};
DECAY_CONSTANTS_OWNED[STRUCTURE_RAMPART] =  {decay: function(pos) {return 300;}, delay:function(pos) {return 100;}};
DECAY_CONSTANTS_OWNED[STRUCTURE_ROAD] =  {
        isSwamp: /** @param {RoomPosition} pos**/ function(pos) {return (_.find(pos.look(), (l)=>l.type == 'terrain').terrain=='swamp')},
        decay:/** @param {RoomPosition} pos**/function(pos) {return (this.isSwamp(pos))?500:100;},
        delay:function(pos) {return 1000;}};

var DECAY_CONSTANTS_NEUTRAL = {};
DECAY_CONSTANTS_NEUTRAL[STRUCTURE_CONTAINER] =  {decay:function(pos) {return 5000;}, delay:function(pos) {return 100;}};
DECAY_CONSTANTS_NEUTRAL[STRUCTURE_RAMPART] =  {decay:function(pos) {return 300;}, delay:function(pos) {return 100;}};
DECAY_CONSTANTS_NEUTRAL[STRUCTURE_ROAD] =  {
        isSwamp: /** @param {RoomPosition} pos**/ function(pos) {return (_.find(pos.look(), (l)=>l.type == 'terrain').terrain=='swamp')},
        decay:/** @param {RoomPosition} pos**/function(pos) {return (this.isSwamp(pos))?500:100;},
        delay:function(pos) {return 1000;}};
class DecayComputer {
    constructor() {
    }

    /**
     *
     * @param {Structure} structure
     * @return {number}
     */
    ticksToLive(structure) {
        let constants =  (this.isOwned(structure.pos.roomName))? DECAY_CONSTANTS_OWNED:DECAY_CONSTANTS_NEUTRAL;
        // console.log('owned', this.isOwned(structure.pos.roomName));
        // console.log('constants', JSON.stringify(constants));
        let strucDesc = constants[structure.structureType];
        let decay = strucDesc.decay(structure.pos);
        // console.log('decay per tick', decay);
        let delay = strucDesc.delay(structure.pos);
        // console.log('delay', delay);
        let hits = structure.hits;
        let decayTicks = Math.floor(hits / decay);
        // console.log('ticks before last', decayTicks);
        return decayTicks * delay+(structure.ticksToDecay?structure.ticksToDecay:0);

    }

    isOwned(roomName) {
        let room = Game.rooms[roomName];
        return room.controller.my;
    }
}
module.exports = DecayComputer;