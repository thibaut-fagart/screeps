var Process = require('./process');

/**
 */
class SpawnQueue extends Process {
    /**
     *
     * @param {string} parent if null, this is the root process
     * @param {StructureSpawn} spawn
     */
    constructor(parent, spawn) {
        super(parent);
        if (spawn) this.spawnid = _.isString(spawn)? spawn:spawn.id;
    }

}
SpawnQueue.TYPE = 'spawnqueue';
module.exports = SpawnQueue;