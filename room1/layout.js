var _ = require('lodash');


module.exports = {
    createFlag: function (room, pos) {
        room.createFlag(pos.x, pos.y, undefined, COLOR_CYAN);
/*
        let existingFlags = room.lookForAt(FIND_FLAGS,pos.x,pos.y);
        console.log(Game.cpu.getUsed());
        if (Game.cpu.getUsed() > 40) return;
        // console.log('flags', existingFlags.length,pos.x, pos.y, JSON.stringify(existingFlags));
        if (existingFlags.length) {
            if (!(existingFlags.find((f)=>f.color === COLOR_CYAN))) room.createFlag(pos.x, pos.y, undefined, COLOR_CYAN);
        } else if (existingFlags && existingFlags.color !==COLOR_CYAN) {
            room.createFlag(pos.x, pos.y, undefined, COLOR_CYAN);
        }
*/
    },
    fromStorage: function (roomname, toRoom) {
        "use strict";
        let room = Game.rooms[roomname];
        let dest = JSON.parse(room.memory.exits[toRoom]);
        room.storage.pos.findPathTo(dest.x, dest.y).forEach((pos)=> this.createFlag(room, pos));
    },
    fromExitToExit: function (roomname, fromRoom, toRoom) {
        "use strict";
        let room = Game.rooms[roomname];
        let orig = JSON.parse(room.memory.exits[fromRoom]);
        let dest = JSON.parse(room.memory.exits[toRoom]);
        let path = new RoomPosition(orig.x, orig.y, room.name).findPathTo(dest.x, dest.y);
        console.log('path',path.length);
        path.forEach((pos)=> this.createFlag(room,pos));
    },
    fromExitToSources: function (roomname, fromRoom) {
        "use strict";
        let room = Game.rooms[roomname];
        let orig = JSON.parse(room.memory.exits[fromRoom]);
        room.find(FIND_SOURCES).forEach((s)=> {
            s.pos.findPathTo(dest.x, dest.y).forEach((pos)=> this.createFlag(room,pos));
        });
    },
    clean: function(roomname) {
        "use strict";
        Game.rooms[roomname].find(FIND_FLAGS, {filter:{color:COLOR_CYAN}}).forEach((f)=>{
            let sites = f.pos.lookFor(LOOK_CONSTRUCTION_SITES);
            console.log('sites',sites);
            if (sites && sites.length) {
                sites.forEach((site)=> site.remove());
            }
            f.remove();
        })

    },
    cleanSites: function(roomname) {
        "use strict";
        Game.rooms[roomname].find(FIND_CONSTRUCTION_SITES).forEach((f)=>{f.remove();});

    },
    buildRoads: function(roomname) {
        "use strict";
        let room = Game.rooms[roomname];
        room.find(FIND_FLAGS, {filter: {color: COLOR_CYAN}}).forEach((f)=>{
            if (!f.pos.lookFor(LOOK_STRUCTURES).find((s)=>s.structureType ===STRUCTURE_ROAD)) {
                room.createConstructionSite(f.pos,STRUCTURE_ROAD);
            }
        });
    }
};

// require('./layout').fromStorage('E38S14','E39S14')