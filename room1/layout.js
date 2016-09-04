var _ = require('lodash');
var util = require('./util');
let flagsUnderCreation = {};
module.exports = {
    /**
     *
     * @param {Room} room
     * @param {RoomPosition} pos
     * @param {Object} [options]
     * @param {number} [options.color]
     * @param {number} [options.secondaryColor}
     */
    createFlag: function (room, pos, options) {
        let color = options && options.color || util.primaryBuildColor(STRUCTURE_ROAD);
        let secondaryColor = options && options.secondaryColor || util.secondaryBuildColor(STRUCTURE_ROAD);
        let flag;
        if (pos.x %49 ===0 || pos.y%49 ===0) return ; // no flags on borders
        let flags = room.lookForAt(LOOK_FLAGS, pos.x, pos.y);
        let posId = '' + pos.x + ',' + pos.y;
        if (flags && flags.length) {
            flag = flags.find((f)=>f.color === color && f.secondaryColor === secondaryColor);
        } else {
            if (flagsUnderCreation[room.name] && flagsUnderCreation[room.name][Game.time]) {
                let posIds = flagsUnderCreation[room.name][Game.time];
                flag = posIds.indexOf(posId) > 0;
            }
        }

        if (50 + Game.cpu.getUsed() > Game.cpuLimit) {
            return;
        }
        if (!flag) {
            let flagName = util.newFlagName();
            flagName = room.createFlag(pos.x, pos.y, flagName, color, secondaryColor);
            if (_.isString(flagName)) {
                // room.log('flag', flagName);
                flagsUnderCreation[room.name] = flagsUnderCreation[room.name] || {};
                flagsUnderCreation[room.name][Game.time] = flagsUnderCreation[room.name][Game.time] || [];
                flagsUnderCreation[room.name][Game.time].push(posId);
            }

        } else {
            console.log('flag present');
        }
    },
    /**
     *
     * @param {Room} roomname
     */
    fromStorageToSources: function (roomname) {
        'use strict';
        if (Game.rooms[roomname].storage) this.fromSourcesTo(Game.rooms[roomname].storage);
    },
    /**
     *
     * @param {RoomObject} source
     * @param {RoomObject} object
     */
    fromTo: function (source, object) {
        'use strict';
        let room = object.room;
        this.createFlags(this.findPath(room, object.pos, source.pos, 1), room);
    },
    /**
     *
     * @param {RoomObject} object
     */
    fromSourcesTo: function (object) {
        'use strict';
        let room = object.room;
        let sources = room.find(FIND_SOURCES).concat(room.find(FIND_MINERALS).filter((m)=>m.pos.lookFor(LOOK_STRUCTURES).length > 0));
        if (room.memory.sources) sources = sources.filter((s)=>room.memory.sources.indexOf(s.id) >= 0);
        sources.forEach((s)=> this.createFlags(this.findPath(room, object.pos, s.pos, 2), room), room);
    },
    /**
     *
     * @param {RoomObject} object
     */
    fromMineralTo: function (object) {
        'use strict';
        let room = object.room;
        let sources = room.find(FIND_MINERALS);
        if (room.memory.sources) sources = sources.filter((s)=>room.memory.sources.indexOf(s.id) >= 0);
        sources.forEach((s)=> this.createFlags(this.findPath(room, object.pos, s.pos, 2), room), room);
    },

    /**
     *
     * @param {RoomObject} object
     * @param {string} toRoom
     */
    fromObjectToExit: function (object, toRoom) {
        'use strict';
        let room = object.room;
        let dest = room.getExitTo(toRoom);
        // room.log('pathing to ', dest);
        this.createFlags(this.findPath(room, object.pos, dest, 1), room);
    },
    /**
     *
     * @param {string} roomname
     * @param {string} toRoom
     */
    fromStorageToExit: function (roomname, toRoom) {
        'use strict';
        let room = Game.rooms[roomname];
        let dest = room.getExitTo(toRoom);
        this.createFlags(this.findPath(room, room.storage.pos, dest,1), room);
    },
    /**
     *
     * @param {Room} room
     * @param {RoomPosition} orig
     * @param {RoomPosition} dest
     * @param {number} [range]
     * @returns {Array}
     */
    findPath: function (room, orig, dest, range) {
        let roomname = room.name;
        console.log('findPath start', Game.cpu.getUsed(), orig, dest);
        range = range || 0;
        // return util.safeMoveTo2({pos: orig, room: room}, dest);
        let matrix = this.costMatrix(roomname);
        this.findRoadFlags(roomname).forEach((f)=>matrix.set(f.pos.x, f.pos.y, 1));
        console.log('findPath start pathfinding', Game.cpu.getUsed());
        let path = PathFinder.search(new RoomPosition(orig.x, orig.y, orig.roomName), {
            pos: new RoomPosition(dest.x, dest.y, dest.roomName),
            range: range
        }, {
            ignoreCreep: true,
            plainCost: 4, swampCost: 20, roomCallback: function (roomName) {
                if (roomName !== roomname) return false;
                else return matrix;
            }
        }).path;
        console.log('findPath end pathfinding', Game.cpu.getUsed(), path.length);
        return path;
    },
    /**
     *
     * @param {string} roomName
     * @returns {PathFinder.CostMatrix}
     */
    costMatrix: function (roomName) {
        'use strict';
        let matrix = util.avoidHostilesCostMatrix(Game.rooms[roomName])(roomName);
            // new PathFinder.CostMatrix();
        let structures = Game.rooms[roomName].find(FIND_STRUCTURES);
        structures.forEach((s)=> {
            if (s.structureType === STRUCTURE_ROAD) {
                matrix.set(s.pos.x, s.pos.y, 1);
            } else if (s.structureType === STRUCTURE_CONTAINER || (s.structureType === STRUCTURE_RAMPART && s.my)) {
            } else if (s.structureType === STRUCTURE_PORTAL) {
                matrix.set(s.pos.x, s.pos.y, 0xff);
            } else {
                matrix.set(s.pos.x, s.pos.y, 0xff);
            }
        });
        let constructionSites = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES);
        constructionSites.forEach((s)=> {
            if (s.structureType === STRUCTURE_ROAD) {
                matrix.set(s.pos.x, s.pos.y, 1);
            } else if (s.structureType === STRUCTURE_CONTAINER || (s.structureType === STRUCTURE_RAMPART && s.my)) {

            } else {
                matrix.set(s.pos.x, s.pos.y, 0xff);
            }
        });
        let room = Game.rooms[roomName];
        let set = (x, y, cost)=> {
            if (!room.lookForAt(LOOK_TERRAIN, x, y).find((t)=>t === 'wall'))  matrix.set(x, y, cost);
        };
        return matrix;

    },
    /**
     *
     * @param {Array} path
     * @param {Room} room
     * @param {Object} [options]
     * @param {number} [options.color]
     * @param {number} [options.secondaryColor}
     */
    createFlags: function (path, room, options) {
        path.forEach((pos)=> this.createFlag(room, pos, options));
    },
    /**
     *
     * @param {string} roomname
     * @param {string} fromRoom
     * @param {string} toRoom
     */
    fromExitToExit: function (roomname, fromRoom, toRoom) {
        'use strict';
        let room = Game.rooms[roomname];
        let orig = room.getExitTo(fromRoom);
        let dest = room.getExitTo(toRoom);
        var path = this.findPath(room, orig, dest,1);
        // let path = new RoomPosition(orig.x, orig.y, room.name).findPathTo(dest.x, dest.y);
        console.log('path', path.length);
        this.createFlags(path, room);
    },

    /**
     *
     * @param {string} roomname
     */
    fromSourcesToSources: function (roomname) {
        'use strict';
        'use strict';
        let room = Game.rooms[roomname];
        room.memory.temp = room.memory.temp || {};
        let startCpu = Game.cpu.getUsed();
        let limit = Game.cpu.tickLimit;
        console.log('start', startCpu, limit);
        let sources = room.find(FIND_SOURCES).concat(room.find(FIND_MINERALS).filter((s)=>s.pos.lookFor(LOOK_STRUCTURES).length > 0));
        if (room.memory.sources) sources = sources.filter((s)=>room.memory.sources.indexOf(s.id) >= 0);
        console.log('sources found', Game.cpu.getUsed(), limit);
        let stop = false;
        let flagCount = 0;
        for (let i = 0, max = sources.length; i < max; i++) {
            let source1 = sources[i];
            for (let j = i; j < max; j++) {
                let source2 = sources[j];

                if (!stop) {
                    let pathHolder = room.memory.temp[source1.id + '_' + source2.id] = room.memory.temp[source1.id + '_' + source2.id] || {};
                    let used = Game.cpu.getUsed();

                    if (!pathHolder.path && used - startCpu < limit - used) {
                        pathHolder.path = this.findPath(room, source1.pos, source2.pos, 2);
                        console.log('path found', Game.cpu.getUsed() - used);
                    }
                    used = Game.cpu.getUsed();
                    console.log('test', !!pathHolder.path, !pathHolder.flags, pathHolder.path.length);
                    if (pathHolder.path && !pathHolder.flags) {
                        pathHolder.path.forEach((pos)=> {
                            if (!stop) {
                                console.log('test cpu', limit - Game.cpu.getUsed());
                                if (limit - Game.cpu.getUsed() > 100) {
                                    this.createFlag(room, pos);
                                    flagCount++;
                                } else {
                                    console.log('cpu consumed', Game.cpu.getUsed());
                                    stop = true;
                                }
                            }
                        });
                        if (!stop) pathHolder.flags = true;
                        console.log('flags layed', flagCount, Game.cpu.getUsed() - used);
                    }
                }

            }

        }

    },
    /**
     *
     * @param {string}roomname
     * @param {string} fromRoom
     */
    fromExitToSources: function (roomname, fromRoom) {
        'use strict';
        let room = Game.rooms[roomname];
        room.memory.temp = room.memory.temp || {};
        let orig = room.getExitTo(fromRoom);
        this.fromSourcesTo({pos: orig, room: room});
        /*
         let startCpu = Game.cpu.getUsed();
         let limit = Math.min(Game.cpuLimit, Game.cpu.bucket);
         console.log('start', startCpu, limit);
         let sources = room.find(FIND_SOURCES).concat(room.find(FIND_STRUCTURES,  {filter:{structureType:STRUCTURE_EXTRACTOR}}));
         console.log('sources found', Game.cpu.getUsed(), limit);
         let stop = false;
         let flagCount  = 0;
         sources.forEach((s)=> {
         if (!stop) {
         room.memory.temp[s.id] = room.memory.temp[s.id] || {};
         let used = Game.cpu.getUsed();

         if (!room.memory.temp[s.id].path && used - startCpu < limit - used) {
         room.memory.temp[s.id].path = this.findPath(room, s.pos, orig, 1);
         console.log('path found', Game.cpu.getUsed() - used);
         }
         used = Game.cpu.getUsed();
         console.log('test', !!room.memory.temp[s.id].path, !!!room.memory.temp[s.id].flags, room.memory.temp[s.id].path.length);
         if (room.memory.temp[s.id].path && !room.memory.temp[s.id].flags) {
         room.memory.temp[s.id].path.forEach((pos)=> {
         if (!stop) {
         console.log('test cpu', limit - Game.cpu.getUsed());
         if (limit - Game.cpu.getUsed() > 100) {
         this.createFlag(room, pos);
         flagCount++;
         } else {
         console.log('cpu consumed', Game.cpu.getUsed());
         stop = true;
         }
         }
         });
         if (!stop) room.memory.temp[s.id].flags = true;
         console.log('flags layed',flagCount,  Game.cpu.getUsed() - used);
         }
         }
         }
         )
         ;
         */
    },
    /**
     *
     * @param {string} roomname
     * @returns {Flag[]}
     */
    findRoadFlags: function (roomname) {
        return this.findBuildFlags(roomname, STRUCTURE_ROAD);
    },
    /**
     *
     * @param {string} roomname
     * @param {string} structureType
     * @returns {Flag[]}
     */
    findBuildFlags: function (roomname, structureType) {
        let colors = util.buildColors(structureType);
        return Game.rooms[roomname].find(FIND_FLAGS, {filter: colors});
    },
    /**
     *
     * @param {string} roomname
     * @param {string} [structureType=STRUCTURE_ROAD]
     */
    clean: function (roomname, structureType) {
        structureType = structureType || STRUCTURE_ROAD;
        'use strict';
        this.findBuildFlags(roomname, structureType).forEach((f)=> {
            let sites = f.pos.lookFor(LOOK_CONSTRUCTION_SITES);
            // console.log('sites', sites);
            if (sites && sites.length) {
                sites.forEach((site)=> {
                    if (site.structureType === structureType) {
                        site.remove();
                    }
                });
            }
            f.remove();
        });
    },
    /**
     *
     * @param {string} roomname
     * @param {string} [structureType] if none, will remove all sites
     */
    cleanSites: function (roomname, structureType) {
        'use strict';
        Game.rooms[roomname].find(FIND_CONSTRUCTION_SITES).forEach((f)=> {
            if ((!structureType || f.structureType === structureType) && f.progress === 0) {
                f.remove();
            }
        });

    },

    /**
     *
     * @param {string} roomname
     * @param {string} [structureType=STRUCTURE_ROAD]
     */
    cleanFlags: function (roomname, structureType) {
        'use strict';
        structureType = structureType || STRUCTURE_ROAD;
        let colors = util.buildColors(structureType);

        Game.rooms[roomname].find(FIND_FLAGS, {filter: colors}).forEach((f)=> {
            f.remove();
        });

    },
    /**
     *
     * @param {string} roomname
     * @param {string} [color]
     */

    cleanFlagsColor: function (roomname, color, secondaryColor) {
        'use strict';
        let predicate = color && secondaryColor?(f)=>f.color === color && f.secondaryColor === secondaryColor:
            (color?(f)=>f.color === color:()=>true);
        Game.rooms[roomname].find(FIND_FLAGS).filter(predicate).forEach((f)=> {
            f.remove();
        });
    },
    /**
     *
     * @param {string} roomname
     */
    buildRoads: function (roomname) {
        'use strict';
        let room = Game.rooms[roomname];
        let color = util.primaryBuildColor(STRUCTURE_ROAD);
        let secondaryColor = util.secondaryBuildColor(STRUCTURE_ROAD);

        let flags = room.find(FIND_FLAGS, {filter: {color: color, secondaryColor: secondaryColor}});
        // console.log('flags', flags.length);
        let roadSites = flags.filter((f)=> {
            let s = f.pos.lookFor(LOOK_STRUCTURES);
            return !(s && s.length && s.find((s)=>s.structureType === STRUCTURE_ROAD));
        });
        roadSites = roadSites.filter((f)=> {
            let s = f.pos.lookFor(LOOK_CONSTRUCTION_SITES);
            return !(s && s.length && s.find((s)=>s.structureType === STRUCTURE_ROAD));
        });
        // console.log('toBuild', roadSites.length);
        roadSites.forEach((r)=> {
            // console.log('building',r.pos)
            room.createConstructionSite(r.pos, STRUCTURE_ROAD);
        });
    },
    /**
     * builds the container as close to fromroom as possible
     * @param {string} roomname
     * @param {string} fromroom
     */
    buildSourceContainers: function (roomname, fromroom) {
        'use strict';
        let room = Game.rooms[roomname];
        let pos = room.getExitTo(fromroom);
        pos = new RoomPosition(pos.x, pos.y, roomname);
        if (room) {
            room.find(FIND_SOURCES).forEach((source)=> {
                let area = source.room.lookAtArea(source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true);
                let containers = area.filter((e)=>e.type === 'structure').map((e)=>(e.structure)).filter((s)=>s.structureType === STRUCTURE_CONTAINER);
                if (!containers.length) {
                    let containerSites = area.filter((e)=>e.type === 'constructionSite').map((e)=>(e.constructionSite)).filter((s)=>s.structureType === STRUCTURE_CONTAINER);
                    if (!containerSites.length) {
                        // find a place
                        let terrain = area.filter((e)=>e.type === 'terrain');
                        let nonWallTerrain = terrain.filter((e)=>e.terrain !== 'wall');
                        let minRange = 100;
                        let minT;
                        for (let i = 0, max = nonWallTerrain.length; i < max; i++) {
                            let t = nonWallTerrain[i];
                            let range = pos.getRangeTo(t.x, t.y);
                            if (range < minRange) {
                                minT = t;
                                minRange = range;
                            }
                        }
                        room.createConstructionSite(minT.x, minT.y, STRUCTURE_CONTAINER);
                    }
                }
            });
        }

    },

    /**
     *
     * @param {RoomPosition} pos1 one extremity of the exit (a wal)
     * @param {RoomPosition} pos2 the other extremity of the exit (a wal)
     */
    designWall: function (pos1, pos2) {
        console.log('designWall', pos1, pos2);
        let matrix = new PathFinder.CostMatrix();
        let colors = util.buildColors(STRUCTURE_WALL);
        // favor walls
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                if ('wall' === new RoomPosition(x, y, pos1.roomName).lookFor(LOOK_TERRAIN)[0]) {
                    matrix.set(x, y, 1);
                } else {
                    matrix.set(x, y, 5);
                }
            }
        }
        // no walls near exits
        if (pos1.x === pos2.x) {
            let starty = Math.min(pos1.y, pos2.y) + 1;
            let endy = Math.max(pos1.y, pos2.y) - 1;
            let x = pos1.x;
            let nextx = x === 0 ? 1 : 48;
            for (let y = starty; y <= endy; y++) {
                matrix.set(x, y, 0xff);
                matrix.set(nextx, y, 0xff);
            }
            matrix.set(nextx, starty - 1, 0xff);
            matrix.set(nextx, endy + 1, 0xff);

        } else if (pos1.y === pos2.y) {
            let startx = Math.min(pos1.x, pos2.x) + 1;
            let endx = Math.max(pos1.x, pos2.x) - 1;
            let y = pos1.y;
            let nexty = y === 0 ? 1 : 48;
            for (let x = startx; x <= endx; x++) {
                matrix.set(x, y, 0xff);
                matrix.set(x, nexty, 0xff);
            }
            matrix.set(startx - 1, y, 0xff);
            matrix.set(endx + 1, y, 0xff);
        } else {
            // todo
        }
        /*
         for (let x = 0; x < 50; x++) {
         for (let y = 0; y < 50; y++) {
         let pos = new RoomPosition(x, y, pos1.roomName);
         if (matrix.get(x, y) === 0xff && !pos.lookFor(LOOK_FLAGS).find((f)=>f.color === COLOR_GREEN)) {
         let flagName;
         if (Memory.temp.flagId) {
         Memory.temp.flagId = Memory.temp.flagId + 1;
         flagName = 'flag' + Memory.temp.flagId;
         }
         pos.createFlag(flagName, COLOR_GREEN);
         }
         if (matrix.get(x, y) === 1 && !pos.lookFor(LOOK_FLAGS).find((f)=>f.color === COLOR_RED)) {
         let flagName;
         if (Memory.temp.flagId) {
         Memory.temp.flagId = Memory.temp.flagId + 1;
         flagName = 'flag' + Memory.temp.flagId;
         }
         pos.createFlag(flagName, COLOR_RED);
         }
         }
         }
         */

        let result = PathFinder.search(pos1, {pos: pos2, range: 0}, {
            roomCallback: function (roomName) {
                if (roomName !== pos1.roomName) {
                    return false;
                } else {
                    return matrix;
                }
            }
        });
        console.log(JSON.stringify(result));
        this.createFlags(result.path, Game.rooms[pos1.roomName], colors);
    }
}
;

// require('./layout').fromStorage('E38S14','E39S14')