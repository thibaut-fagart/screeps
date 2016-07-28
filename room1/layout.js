var _ = require('lodash');
var util = require('./util');

module.exports = {
    createFlag: function (room, pos) {
        let flag;
        let start = Game.cpu.getUsed();
        let flags = room.lookForAt(LOOK_FLAGS, pos.x, pos.y);
        if (flags && flags.length) {
            flag = flags.find((f)=>f.color === COLOR_CYAN);
        }
        let endCheck = Game.cpu.getUsed();
/*
        if (50 + Game.cpu.getUsed() > Game.cpuLimit) {
            console.log('createFlag', Game.cpu.getUsed(), Game.cpu.limit);
            return;
        }
*/
        if (!flag) {
            room.createFlag(pos.x, pos.y, undefined, COLOR_CYAN);
        } else {
            console.log('flag present');
        }
        let end = Game.cpu.getUsed();
        // console.log('createFlag', start, endCheck-start, end-start);
    },
    fromStorage: function (roomname, toRoom) {
        "use strict";
        let room = Game.rooms[roomname];
        let dest = JSON.parse(room.memory.exits[toRoom]);
        room.storage.pos.findPathTo(dest.x, dest.y).forEach((pos)=> this.createFlag(room, pos));
    },
    findPath: function (room, roomname, orig, dest, range) {
        console.log('findPath start', Game.cpu.getUsed(), orig, dest);
        range = range || 0;
        return util.safeMoveTo2({pos: orig, room: room}, dest);
        let matrix = new PathFinder.CostMatrix();
        this.findRoadFlags(roomname).forEach((f)=>matrix.set(f.pos.x, f.pos.y, 1));
        room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_ROAD}}).forEach((f)=>matrix.set(f.pos.x, f.pos.y, 1));
        console.log('findPath start pathfinding', Game.cpu.getUsed());
        let path = PathFinder.search(new RoomPosition(orig.x, orig.y, orig.roomName), {
            pos: new RoomPosition(dest.x, dest.y, dest.roomName),
            range: range
        }, {
            plainCost: 2, swampCost: 10, roomCallback: function (roomName) {
                if (roomName !== roomname) return false;
                else return matrix;
            }
        }).path;
        console.log('findPath end pathfinding', Game.cpu.getUsed(), path.length);
        return path;
    },
    fromExitToExit: function (roomname, fromRoom, toRoom) {
        "use strict";
        let room = Game.rooms[roomname];
        let orig = JSON.parse(room.memory.exits[fromRoom]);
        let dest = JSON.parse(room.memory.exits[toRoom]);
        var path = this.findPath(room, roomname, orig, dest);
        // let path = new RoomPosition(orig.x, orig.y, room.name).findPathTo(dest.x, dest.y);
        console.log('path', path.length);
        path.forEach((pos)=> this.createFlag(room, pos));
    },
    fromExitToSources: function (roomname, fromRoom) {
        "use strict";
        let room = Game.rooms[roomname];
        room.memory.temp = room.memory.temp || {};
        let orig = JSON.parse(room.memory.exits[fromRoom]);
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
                        room.memory.temp[s.id].path = this.findPath(room, roomname, s.pos, orig, 1);
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
    },
    findRoadFlags: function (roomname) {
        return Game.rooms[roomname].find(FIND_FLAGS, {filter: {color: COLOR_CYAN}});
    }
    ,
    clean: function (roomname) {
        "use strict";
        this.findRoadFlags(roomname).forEach((f)=> {
            let sites = f.pos.lookFor(LOOK_CONSTRUCTION_SITES);
            // console.log('sites', sites);
            if (sites && sites.length) {
                sites.forEach((site)=> site.remove());
            }
            f.remove();
        })

    }
    ,
    cleanSites: function (roomname) {
        "use strict";
        Game.rooms[roomname].find(FIND_CONSTRUCTION_SITES).forEach((f)=> {
            f.remove();
        });

    }
    ,
    buildRoads: function (roomname) {
        "use strict";
        let room = Game.rooms[roomname];
        let flags = room.find(FIND_FLAGS, {filter: {color: COLOR_CYAN}});
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

    buildSourceContainers: function (roomname, fromroom) {
        "use strict";
        let room = Game.rooms[roomname];
        let pos = JSON.parse(room.memory.exits[fromroom]);
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
                        let ret = room.createConstructionSite(minT.x, minT.y, STRUCTURE_CONTAINER);
                    }
                }
            });
        }

    }
}
;

// require('./layout').fromStorage('E38S14','E39S14')