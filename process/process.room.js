var Process = require('./process');

/**
 * Basic enonomy : harvest source, refill, upgrade, repair
 * HIGHEST
 * 1 harvest process per source, harvestToContainer if container is present, otherwise request one
 * 1 carry (enough capacity) to bring from source to home storage
 *
 * HIGH
 * RoomMaintainance
 *
 * MEDIUM
 * RoomUpgrade
 *
 * state :
 * roomName
 */
class RoomEnonomyProcess extends Process {
    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {int} subpriority
     */
    constructor(parent, subpriority) {
        super('room',parent, subpriority);
    }

}
module.exports = RoomEnonomyProcess;