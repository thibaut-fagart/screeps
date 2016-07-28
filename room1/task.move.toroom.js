var _ = require('lodash');
var util = require('./util');
var BaseStrategy = require('./strategy.base');


class MoveToRoomTask extends BaseStrategy {
    /**
     *
     * @param {string} [roomMemory] memory of the room to init destination
     * @param {string} memoryfrom creep memory slot for the start
     * @param {string} [memoryto] creep memory slot for the destination
     */
    constructor(roomMemory, memoryfrom, memoryto) {
        super();
        this.ROOM_REMOTE_PATH = roomMemory ? roomMemory : 'claim';
        this.CREEP_HOME_PATH = memoryfrom ? memoryfrom : 'homeroom';
        this.CREEP_REMOTE_PATH = memoryto ? memoryto : 'remoteRoom';
    }

    accepts(creep) {
        // creep.log('moveTo', creep.memory[this.CREEP_REMOTE_PATH]);
        if (!creep.memory[this.CREEP_REMOTE_PATH] && creep.room.memory[this.ROOM_REMOTE_PATH]) {
            creep.memory[this.CREEP_REMOTE_PATH] = creep.room.memory[this.ROOM_REMOTE_PATH];
        }
        creep.memory.action = creep.memory.action || 'go_remote_room';
        creep.memory[this.CREEP_HOME_PATH] = creep.memory[this.CREEP_HOME_PATH] || creep.room.name;
        let newRoom = creep.memory.move_previousRoom == creep.room.name;
        let oldRoom = creep.memory.move_previousRoom;
        if (creep.memory.move_previousRoom && creep.memory.move_previousRoom != creep.room.name) {
            // creep.log('changed room', creep.memory.roomPath);
            delete creep.memory.roomPath;
        }
        creep.memory.move_previousRoom = creep.room.name;
        // creep.log('moveTask',creep.memory.action, creep.memory[this.CREEP_HOME_PATH], creep.memory[this.CREEP_REMOTE_PATH],creep.room.name);
        if (creep.room.name != creep.memory[this.CREEP_REMOTE_PATH]) {
            var exit = util.findExit(creep, creep.memory[this.CREEP_REMOTE_PATH]);
            if (!exit || null === exit) {
                creep.log('ERROR , no exit', creep.memory[this.CREEP_REMOTE_PATH]);
                return false;
            }
            // creep.log('exit', JSON.stringify(exit), creep.pos.isEqualTo(exit));

            if (exit.x === creep.pos.x && exit.y === creep.pos.y && exit.roomName == creep.room.name) {
                //creep.log('waiting room change');
                delete creep.memory.roomPath;
                // wait for room change
            } else if (creep.room.name === exit.roomName) {
                this.repairRoad(creep);
                // creep.log('path', creep.memory.roomPath);
                /*
                 if (newRoom) {
                 creep.room.memory.paths = creep.room.memory.paths || {};
                 creep.memory.roomPath = creep.room.memory.paths[oldRoom + "_" + creep.memory[this.CREEP_REMOTE_PATH]];
                 if (!creep.memory.roomPath) {
                 let path = Room.serializePath(util.pathFinderToMoveByPath(util.findExit(creep, oldRoom), util.safeMoveTo2(creep, exit)));
                 creep.room.memory.paths[oldRoom + "_" + creep.memory[this.CREEP_REMOTE_PATH]] = path;
                 creep.memory.roomPath = creep.room.memory.paths[oldRoom + "_" + creep.memory[this.CREEP_REMOTE_PATH]];
                 }
                 }
                 */
                creep.memory.roomPath = creep.memory.roomPath
                    || Room.serializePath(util.pathFinderToMoveByPath(creep.pos, util.safeMoveTo2(creep, exit)));
                // let moveTo = creep.moveTo(exit.x, exit.y, {reusePath: 50});

                if (creep.pos === creep.memory.lastPos && creep.memory.moved) {
                    let path = Room.deserialize(creep.memory.roomPath);
                    for (let i = 0, max = path.length; i < max; i++) {
                        let pos = path[i];
                        if (pos.x === creep.pos.x && pos.y === creep.pos.y) {
                            let creeps = creep.room.lookForAt(LOOK_CREEPS, path[i + 1].x, path[i + 1].y);
                            if (creeps && creeps.length) {
                                let blocker = creeps[0];
                                creep.log('forcing move', blocker.name);
                                blocker.moveTo(creep.pos.x, creep.pos.y, {noPathFinding: true});
                            }
                        }
                    }
                }

                let moveTo = creep.moveByPath(creep.memory.roomPath);
                if ([OK, ERR_TIRED].indexOf(moveTo) < 0) {
                    if (ERR_NOT_FOUND === moveTo) {
                        creep.log('discarding path', creep.memory.roomPath);
                        delete creep.memory.roomPath;
                    }
                    creep.log('moved?', moveTo, exit.x, exit.y);
                } else if (OK === moveTo) {
                    creep.memory.lastPos = creep.pos;
                    // creep.log('moved ok ');
                }
                // }
                // creep.log("moving to homeExit ");
                return true;
            } else {
                creep.log('unexpected');
            }
        } else if (creep.room.name == creep.memory[this.CREEP_REMOTE_PATH]) {
            delete creep.memory.roomPath;
            return this.moveIn(creep);
        }
    }

    repairRoad(creep) {
        let workParts = creep.getActiveBodyparts(WORK);
        if (workParts > 0 && creep.carry.energy) {
            let repairCapacity = workParts * 100; // todo boosts ?
            let structures = creep.pos.lookFor(LOOK_STRUCTURES);
            if (structures && structures.length) {
                let road = structures.find((s)=>s.structureType == STRUCTURE_ROAD && s.hits + repairCapacity < s.hitsMax);
                if (road) creep.repair(road);
            }
        }
    }

    moveIn(creep) {
        // creep.log('movin in', creep.room.name);
        if (creep.pos.x <= 3 || creep.pos.y <= 3 || creep.pos.y >= 46 || creep.pos.x >= 46) {
            let greenFlags = creep.room.find(FIND_FLAGS, {filter: {color: COLOR_GREEN}});
            if (greenFlags.length) {
                creep.moveTo(greenFlags[0]);
            }
        }
        return false;
        if (creep.pos.x <= 3 || creep.pos.y <= 3 || creep.pos.y >= 46 || creep.pos.x >= 46) {
            let searchAreas = [];
            if (creep.pos.x <= 2) {
                searchAreas.push({
                    top: creep.pos.y - 1,
                    left: creep.pos.x + 1,
                    bottom: creep.pos.y + 1,
                    right: creep.pos.x + 1
                });
                searchAreas.push({
                    top: creep.pos.y - 1,
                    left: creep.pos.x,
                    bottom: creep.pos.y + 1,
                    right: creep.pos.x
                });
            } else if (creep.pos.x >= 47) {
                searchAreas.push({
                    top: creep.pos.y - 1,
                    left: creep.pos.x,
                    bottom: creep.pos.y + 1,
                    right: creep.pos.x
                });
                searchAreas.push({
                    top: creep.pos.y - 1,
                    left: creep.pos.x - 1,
                    bottom: creep.pos.y + 1,
                    right: creep.pos.x - 1
                });
            } else if (creep.pos.y <= 2) {
                searchAreas.push({
                    top: creep.pos.y + 1,
                    left: creep.pos.x - 1,
                    bottom: creep.pos.y + 1,
                    right: creep.pos.x + 1
                });
                searchAreas.push({
                    top: creep.pos.y,
                    left: creep.pos.x - 1,
                    bottom: creep.pos.y,
                    right: creep.pos.x + 1
                });
            } else if (creep.pos.y >= 47) {
                searchAreas.push({
                    top: creep.pos.y - 1,
                    left: creep.pos.x - 1,
                    bottom: creep.pos.y - 1,
                    right: creep.pos.x + 1
                });
                searchAreas.push({
                    top: creep.pos.y,
                    left: creep.pos.x - 1,
                    bottom: creep.pos.y,
                    right: creep.pos.x + 1
                });
            }
            creep.log('searching')
            let candidates = [];
            for (let i = 0, max = searchAreas.length; i < max && candidates.length === 0; i++) {
                let squares = creep.room.lookAtArea(searchAreas[0], true);
                candidates = this.findWalkableTiles(creep.room, squares);
            }
            if (candidates.length === 0) {
                // failed
                creep.say('failed in');
                creep.log('failed moving in');
            } else {
                _.sortBy(candidates, (p)=>center.getRangeTo(p.x, p.y));
                creep.moveTo(candidates[0], {noPathFinding: true});
            }
            return true;
        } else {
            return false;
        }

        // creep.log('moving in?', dir, move);


    }

    /**
     *
     * @param squares result of Rooom.lookAtArea(array =false)
     * @returns {[{x, y}]}
     */
    findWalkableTiles(room, squares) {
        let candidates = [];
        _.keys(squares).forEach((y)=> {
            _.keys(squares[y]).forEach((x)=> {
                let xy = squares[y][x];
                xy.forEach((e)=> {
                    let impassable = ('wall' === e.terrain || e.type === 'creep');
                    if (!impassable && e.type === 'structure') {
                        switch (e.structure.structureType) {
                            case STRUCTURE_CONTAINER :
                                break;
                            case STRUCTURE_ROAD:
                                break;
                            case STRUCTURE_RAMPART:
                                impassable |= (!e.structure.my);
                                break;
                            default:
                                ;
                        }
                    }
                    if (!impassable) {
                        candidates.push({x: x, y: y, roomName: room.name});
                    }
                });

            });
        });
        return candidates;
    }
}
MoveToRoomTask.avoidEntryMatrix = new PathFinder.CostMatrix();
/*
 return (roomName) => {
 new PathFinder.CostMatrix();
 if (roomName == creep.room.name) {
 let matrix = new PathFinder.CostMatrix();
 let structures = Game.rooms[roomName].find(FIND_STRUCTURES);
 structures.forEach((s)=>{
 if (s.structureType === STRUCTURE_ROAD) {
 matrix.set(s.pos.x, s.pos.y, 1);
 } else if (s.structureType === STRUCTURE_CONTAINER  || (s.structureType === STRUCTURE_RAMPART && s.my)) {

 } else {
 matrix.set(s.pos.x, s.pos.y, 0xff);
 }
 });
 let room = Game.rooms[roomName];
 let set = (x,y,cost)=> {
 if (!room.lookForAt(LOOK_TERRAIN, x, y).find((t)=>t==='wall'))  matrix.set(x, y, cost);
 };
 creep.room.find(FIND_MY_CREEPS).forEach((c)=> {
 set(c.pos.x,c.pos.y, 255);
 });
 return matrix;
 } else {
 return false;
 }
 };
 */

/*
 for (let r = 0; r < 2; r++) {
 for (let i = r; i < 50 - r; i++) {
 MoveToRoomTask.avoidEntryMatrix.set(i, r, 255 - 50 * r);
 MoveToRoomTask.avoidEntryMatrix.set(i, 49 - r, 255 - 50 * r);
 MoveToRoomTask.avoidEntryMatrix.set(r, i, 255 - 50 * r);
 MoveToRoomTask.avoidEntryMatrix.set(49 - r, i, 255 - 50 * r);
 }
 }
 */

module.exports = MoveToRoomTask;