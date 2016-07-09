var _ = require('lodash');
var Process = require('./process');
var ProcessTable = require('./process.table');
var ProcessHarvest = require('./process.harvest');
var ProcessSpawnQueue = require('./process.spawnqueue');
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
     * @param {int} [subpriority}
     */
    constructor(parent, roomName, subpriority) {
        super(RoomEnonomyProcess.TYPE, parent, subpriority);
        this.roomName = roomName;
    }

    /**
     *
     * @returns {Room}
     */
    room() {
        return Game.rooms[roomName];
    }

    /**
     *
     * @param {ProcessTable}processTable
     */
    run(processTable) {
        switch (this.status) {
            case STATUS_NEW :
            {
                let room = this.room();
                room.find(FIND_SOURCES).forEach((s)=> {

                    this.createSpawnQueue(processTable, room);
                    processTable.register(new ProcessHarvest(this, s.id));
                });
                break;
            }
            default:
            {

            }
        }

    }

    /**
     *
     * @param {ProcessTable} processTable
     * @param {Room} room
     */
    createSpawnQueue(processTable, room) {
        let spawns = room.find(FIND_MY_SPAWNS);
        spawns.forEach((spawn)=> {
            let existing = _.find(this.children, (process) => {
                return process.type === ProcessSpawnQueue.TYPE && process.spawnid === spawn.id;
            });
            if (!existing) {
                processTable.register(new ProcessSpawnQueue(this, spawn));
            }
        });
    }
}
RoomEnonomyProcess.TYPE = 'room';
module.exports = RoomEnonomyProcess;