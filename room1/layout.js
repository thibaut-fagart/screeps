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
        if (50 + Game.cpu.getUsed() > Game.cpuLimit) {
            // console.log('createFlag', Game.cpu.getUsed(), Game.cpu.limit);
            return;
        }
        if (!flag) {
            let flagName;
            if (Memory.temp.flagId) {
                Memory.temp.flagId = Memory.temp.flagId+1;
                flagName='flag'+Memory.temp.flagId ;
            }
            flagName = room.createFlag(pos.x, pos.y, flagName, COLOR_CYAN);
            if (_.isString(flagName)) {
                let match = /flag(\d+)/.exec(flagName);
                room.log('flag',flagName,JSON.stringify(match));
                if (match) Memory.temp.flagId = Number(match[1]);
            }

        } else {
            console.log('flag present');
        }
        let end = Game.cpu.getUsed();
        // console.log('createFlag', start, endCheck-start, end-start);
    },
    fromStorageToSources: function (roomname) {
        "use strict";
        this.fromSourcesTo(room.storage);
    },
    fromSourcesTo: function (object) {
        "use strict";
        let room = object.room;
        let sources = room.find(FIND_SOURCES).concat(room.find(FIND_STRUCTURES,  {filter:{structureType:STRUCTURE_EXTRACTOR}}));
        sources.forEach((s)=> this.createFlags(this.findPath(room, object.pos, s.pos, 1), room), room);
    },
    fromMineralTo: function (object) {
        "use strict";
        let room = object.room;
        let sources = room.find(FIND_MINERALS);
        sources.forEach((s)=> this.createFlags(this.findPath(room, object.pos, s.pos, 1), room), room);
    },
    fromObjectToExit: function (object,toRoom) {
        "use strict";
        let room = object.room;
        let dest = JSON.parse(room.memory.exits[toRoom]);
        this.createFlags(this.findPath(room, object.pos, dest.pos, 1), room);
    },

    fromStorageToExit: function (roomname, toRoom) {
        "use strict";
        let room = Game.rooms[roomname];
        let dest = JSON.parse(room.memory.exits[toRoom]);
        this.createFlags(this.findPath(room, room.storage.pos, dest), room);
    },
    findPath: function (room,  orig, dest, range) {
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
        }, {ignoreCreep:true,
            plainCost: 4, swampCost: 20, roomCallback: function (roomName) {
                if (roomName !== roomname) return false;
                else return matrix;
            }
        }).path;
        console.log('findPath end pathfinding', Game.cpu.getUsed(), path.length);
        return path;
    },
    costMatrix: function (roomName) {
        "use strict";
        let matrix = new PathFinder.CostMatrix();
        let structures = Game.rooms[roomName].find(FIND_STRUCTURES);
        structures.forEach((s)=> {
            if (s.structureType === STRUCTURE_ROAD) {
                matrix.set(s.pos.x, s.pos.y, 1);
            } else if (s.structureType === STRUCTURE_CONTAINER  || (s.structureType === STRUCTURE_RAMPART && s.my)) {
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

    createFlags: function (path, room) {
        path.forEach((pos)=> this.createFlag(room, pos));
    }, 
    fromExitToExit: function (roomname, fromRoom, toRoom) {
        "use strict";
        let room = Game.rooms[roomname];
        let orig = JSON.parse(room.memory.exits[fromRoom]);
        let dest = JSON.parse(room.memory.exits[toRoom]);
        var path = this.findPath(room, orig, dest);
        // let path = new RoomPosition(orig.x, orig.y, room.name).findPathTo(dest.x, dest.y);
        console.log('path', path.length);
        this.createFlags(path, room);
    },

    fromSourcesToSources: function(roomname) {
        "use strict";
        "use strict";
        let room = Game.rooms[roomname];
        room.memory.temp = room.memory.temp || {};
        let startCpu = Game.cpu.getUsed();
        let limit = Game.cpu.tickLimit;
        console.log('start', startCpu, limit);
        let sources = room.find(FIND_SOURCES).concat(room.find(FIND_STRUCTURES,  {filter:{structureType:STRUCTURE_EXTRACTOR}}));
        console.log('sources found', Game.cpu.getUsed(), limit);
        let stop = false;
        let flagCount  = 0;
        for (let i = 0, max = sources.length; i< max;i++) {
            let source1 = sources[i];
            for (let j= i; j< max;j++) {
                let source2 = sources[j];

                if (!stop) {
                    let pathHolder = room.memory.temp[source1.id+'_'+source2.id] = room.memory.temp[source1.id+'_'+source2.id] || {};
                    let used = Game.cpu.getUsed();

                    if (!pathHolder.path && used - startCpu < limit - used) {
                        pathHolder.path = this.findPath(room, source1.pos, source2.pos, 1);
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
                        console.log('flags layed',flagCount,  Game.cpu.getUsed() - used);
                    }
                }

            }

        }

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
    cleanFlags: function (roomname) {
        "use strict";
        Game.rooms[roomname].find(FIND_FLAGS, {filter:{color:COLOR_CYAN}}).forEach((f)=> {f.remove();});

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