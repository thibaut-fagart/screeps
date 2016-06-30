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
}
module.exports = new Util();
