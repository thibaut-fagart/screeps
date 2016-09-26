var _ = require('lodash');
var util = require('./util');
var MoveToRoomTask = require('./task.move.toroom');

/*
 creep.memory.tasks = [{
 task:'GoThroughPortal',
 args:{room:'aRoom'}
 }];
 */
class GoThroughPortal {
    /**
     *
     * @param {{room}} [state]
     */
    constructor(state) {
        this.state = state;
    }

    /**
     *
     * @param creep
     * @returns {boolean} true if the task is complete
     */
    run(creep) {
        if (creep.room.name === this.state.room) {
            if (!this.state.portal_id) {
                let portals = creep.room.find(FIND_STRUCTURES).filter(s=>STRUCTURE_PORTAL === s.structureType);
                let chosen = creep.pos.findClosestByRange(portals);
                this.state.portal_id = chosen.id;
            }
            let chosen = Game.getObjectById(this.state.portal_id);
            let moved;
            if (chosen.pos.getRangeTo(creep)===1) {
                moved = creep.moveTo(chosen);
            }else {
                moved = util.moveTo(creep, chosen.pos, 'portal_path', {range: 1});
            }
            // creep.log('moving to portal ', chosen.pos, moved);
            return false;
        } else {
            // get out of the portal
            // creep.log('moving out of portal');
            if (creep.pos.lookFor(LOOK_STRUCTURES).find(s=>STRUCTURE_PORTAL === s.structureType)) {

                let portals = creep.room.find(FIND_STRUCTURES).filter(s=>STRUCTURE_PORTAL === s.structureType);
                let pathAndCost = PathFinder.search(creep.pos, portals.map(p=>({pos: p.pos, range: 1})), {flee: true});
                let moved = creep.move(creep.pos.getDirectionTo(pathAndCost.path[0]));
                // creep.log('moved to ', pathAndCost.path[0], moved);
            } else {
                return true;
            }
        }
    }
}
require('./profiler').registerClass(GoThroughPortal, 'GoThroughPortal');
module.exports = GoThroughPortal;