var Process = require('./process');

/**
 */
class ProcessSpawnQueue extends Process {
    /**
     *
     * @param {Process} parent if null, this is the root process
     * @param {StructureSpawn} spawn
     * @param {int} subpriority
     */
    constructor(parent, spawn, subpriority) {
        super(ProcessSpawnQueue.TYPE, parent, subpriority);
        this.spawnid = spawn.id;
    }

}
ProcessSpawnQueue.TYPE = 'spawnqueue';
module.exports = ProcessSpawnQueue;