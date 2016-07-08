var Base = require('./strategy.base');
var util = require('./util');

class RegroupStrategy extends Base {
    constructor(flagcolor) {
        super();
        this.flagColor = flagcolor || COLOR_RED;
    }

    accepts(creep) {
        let regroupFlags = creep.room.find(FIND_FLAGS, {filter: {color: this.flagColor}});
        if (regroupFlags.length) {
            let flag = regroupFlags[0];
            let memoryPath = 'regroup_' + this.flagColor;
            let path = util.objectFromMemory(creep.memory, memoryPath);

            if (!path) {
                path = PathFinder.search(creep.pos, flag.pos, {range: 1}).path;
                // creep.log('pathingto', path.length,path[path.length-1]);
                if (path.length) {
                    path = creep.room.findPath(creep.pos, path[path.length - 1]);
                }
                // creep.log('path', JSON.stringify(path));

                creep.memory[memoryPath] = path;
            }
            creep.moveByPath(path);
            return true;

        }
        return false;
    }

}
module.exports = RegroupStrategy;