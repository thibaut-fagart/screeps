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
            delete creep.memory.move_Task;
            delete creep.memory.roomPathDest;
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
            if (JSON.stringify(exit) != creep.memory.roomPathDest) {
                // destination changed
                delete creep.memory.move_Task;
                delete creep.memory.roomPathDest;
            }
            if (exit.x === creep.pos.x && exit.y === creep.pos.y && exit.roomName == creep.room.name) {
                // creep.log('waiting room change');
                delete creep.memory.move_Task;
                delete creep.memory.roomPathDest;
                return false;
                // wait for room change
            } else if (creep.room.name === exit.roomName) {
                this.repairRoad(creep);
                // creep.log('path', creep.memory.roomPath);
                creep.memory.roomPathDest = JSON.stringify(exit);
                let moveTo = util.moveTo(creep, exit, 'move_Task', {range: 0});
                if (moveTo !== OK && moveTo !== ERR_TIRED) {
                    creep.log('checking collision');
                    if (creep.pos.getRangeTo(exit) ==1) {
                        // find another exit point
                        let area = {top: Math.max(0,exit.y-1), left: Math.max(0,exit.x-1), bottom: Math.min(49,exit.y+1), right: Math.min(49,exit.x+1)};
/*
                        if (exit.x ===0 || exit.x ===49) {
                            area.top = exit.y-1;
                            area.bottom= exit.y+1;
                        } else  {
                            area.left = exit.x-1;
                            area.right= exit.x+1;
                        }
*/
                        let walkables = util.findWalkableTiles(creep.room, creep.room.lookAtArea(area.top, area.left, area.bottom, area.right));
                        if (walkables.length) {
                            walkables = walkables.filter((pos)=>!pos.isEqualTo(exit));
                            let test = _.sample(walkables);
                            creep.log('trying', JSON.stringify(test));
                            creep.log('moved?', util.moveTo(creep, test,undefined,{range: 0}));

                        }
                    }
                }

                /*               creep.memory.roomPath = creep.memory.roomPath
                 || Room.serializePath(util.pathFinderToMoveByPath(creep.pos, util.safeMoveTo2(creep, exit)));

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
                 delete creep.memory.roomPathDest;
                 }
                 // creep.log('moved?', moveTo, exit.x, exit.y);
                 return true;
                 } else if (OK === moveTo) {
                 creep.memory.lastPos = creep.pos;
                 // creep.log('moved ok ');
                 return true;
                 }*/
                // }
                // creep.log("should not reach ");
                return true;
            } else {
                // creep.log('unexpected');
            }
        } else if (creep.room.name == creep.memory[this.CREEP_REMOTE_PATH]) {
            delete creep.memory.move_Task;
            delete creep.memory.roomPathDest;
            return this.moveIn(creep);
        }
        // creep.log('should not reach ....');
        return true;
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
        return false;
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
            // creep.log('searching')
            let candidates = [];
            for (let i = 0, max = searchAreas.length; i < max && candidates.length === 0; i++) {
                let squares = creep.room.lookAtArea(searchAreas[0], true);
                candidates = util.findWalkableTiles(creep.room, squares);
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
}
MoveToRoomTask.avoidEntryMatrix = new PathFinder.CostMatrix();

module.exports = MoveToRoomTask;