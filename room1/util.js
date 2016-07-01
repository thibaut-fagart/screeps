class Util {
    constructor() {
    }

    /**
     * @param {Object} memoryRoot
     * @param {string} path
     * @param {Function} memory is cleared if this doest not validate
     *  @return {Object}
     */
    objectFromMemory(memoryRoot, path, validator) {
        if (!memoryRoot || !path) {
            return null;
        }
        let id = memoryRoot[path];
        if (id) {
            let o = Game.getObjectById(id);
            if (o && (!validator || validator(o))) {
                return o;
            } else {
                delete memoryRoot[path];
            }
        }

    }

    /**
     * 
     * @param creep
     * @param object 
     * @returns {boolean} true if object is not already reserved
     */
    reserve(creep, object) {
        let reserved = creep.room.memory.reserved || {};
        let old = reserved[object.id];
        if (Game.getObjectById(old)) {
            creep.room.memory.reserved = reserved;
            return true;
        } else {
            return false;
        }
    }
    
}
module.exports = new Util();
