var _ = require('lodash');
var BaseStrategy = require('./strategy.base');
var util = require('./util');

var ACTION = 'state';
var STATE_GO_TO_CONTROLLER = 'TO_CONTROLLER';
var STATE_GO_TO_ENTRY = 'TO_ENTRY';
var STATE_CLEAR_PATH = 'CLEAR_PATH';
var STATE_CLEAN_STRUCTURES = 'CLEAN';
var PATH = 'pathToController';
var PATH_TO_CLEAR = 'pathToExit';
var WALL_ACTION = 'WALL_ACTION';
class AttackWallStrategy extends BaseStrategy {
    constructor() {
        super();
    }
//var Role = require('./strategy.attack_wall'); new Role().clearMemory(Game.creeps.Oliver)
    clearMemory(creep) {
        delete creep.memory[PATH];
        delete creep.memory['searched'];
        delete creep.memory['walltarget'];
        delete creep.room.memory[PATH];
    }
    reset(creep) {
        this.clearMemory(creep);
        creep.memory[ACTION] = STATE_GO_TO_ENTRY;
        this.removeFlags(creep);

    }
    /**
     *
     * @param {Creep} creep
     * @returns {{plainCost: number, swampCost: number, roomCallback: roomCallback}}
     */
    avoidingWallsIfPossible(creep) {
        let maxHits = 0;
        creep.room.find(FIND_STRUCTURES,
            (s)=> {
                if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) {
                    if (s.hits > maxHits) {
                        maxHits = s.hits;
                        return true;
                    }
                }
                return false;
            });
        let MAX_EXP = Math.exp(maxHits);
        return {
            // We need to set the defaults costs higher so that we
            // can set the road cost lower in `roomCallback`
            plainCost: 1,
            swampCost: 5,

            roomCallback: function (roomName) {

                let room = Game.rooms[roomName];
                // In this example `room` will always exist, but since PathFinder
                // supports searches which span multiple rooms you should be careful!
                if (!room) return;
                let costs = new PathFinder.CostMatrix;

                room.find(FIND_STRUCTURES).forEach(function (structure) {
                    if (structure === STRUCTURE_WALL) {
                        costs.set(structure.pos.x, structure.pos.y, 255 * Math.exp(structure.hits) / MAX_EXP);
                    } else if ((structure === STRUCTURE_RAMPART && !structure.my)) {
                        costs.set(structure.pos.x, structure.pos.y, 5);
                    }
                });
                return costs;
            }
        }
    };

    /**
     *
     * @param {Creep} creep
     * @returns {{plainCost: number, swampCost: number, roomCallback: roomCallback}}
     */
    ignoreWalls(creep) {
        return {
            // We need to set the defaults costs higher so that we
            // can set the road cost lower in `roomCallback`
            plainCost: 1,
            swampCost: 5,

            roomCallback: function (roomName) {

                let room = Game.rooms[roomName];
                return new PathFinder.CostMatrix;
            }
        }
    };

    /**
     *
     *
     * @param {Creep} creep
     * @returns {Path}
     */
    onRoomEntry(creep) {
        // first step inside, find the path
        creep.log('first step, searching');
        let path;
        if (!creep.room.memory[PATH]) {
            // first creep attacking
            // creep.log('finding path');
            let pathObj = PathFinder.search(creep.pos, {
                pos: creep.room.controller.pos,
                range: 1
            }, this.avoidingWallsIfPossible(creep));
            if (pathObj && pathObj.path.length) {
                creep.room.memory[PATH] = path = this.savePath(creep, pathObj.path);
                this.flagPath(creep, path);
                creep.log('path length', path.length, 'steps ? ', pathObj.opts);
            } else {
                creep.log('PathFinder(controller) > no path!');
            }
        } else {
            creep.log('taking path from room');
            creep.memory[PATH] = creep.room.memory[PATH];
            path = this.loadPath(creep);
        }
        if (!creep.memory[PATH]) {
            delete creep.memory[ACTION];
        } else {
            creep.memory[ACTION] = STATE_GO_TO_CONTROLLER;
            creep.memory.searched = creep.room.controller.id;
        }
        return path;
    }

    /** @param {Creep||StructureTower} creep
     * @return {Creep|| null}**/
    accepts(creep) {
        if ((creep.body && creep.getActiveBodyparts(ATTACK) == 0 && creep.getActiveBodyparts(RANGED_ATTACK) == 0)) {
            return null;
        }

        if (creep.room.name == creep.memory.remoteRoom && !creep.memory.entry) {
            creep.memory.entry = creep.pos;
        }
        if (creep.memory[ACTION] === STATE_GO_TO_ENTRY) {
            let moveTo2;
            if (creep.fatigue == 0) {
                moveTo2 = creep.moveTo(creep.memory.entry.x, creep.memory.entry.y);
                if (moveTo2 !== OK) {
                    creep.log('move to entry ?', moveTo2);
                }
            }
            return true;
        }
        let path;
        // creep.log(creep.memory[PATH], creep.memory[ACTION]);
        // --------------- find path to controller
        if (!creep.memory[PATH] && creep.memory[ACTION] !== STATE_CLEAR_PATH) {
            creep.log('onRoomEntry');
            if (!(path = this.onRoomEntry(creep))) return false;
        }
        if (!path) path = this.loadPath(creep);
        // creep.log('loaded path ', JSON.stringify(path));
        // ------------------------ move to controller
        if (creep.memory[ACTION] === STATE_GO_TO_CONTROLLER && !creep.memory.walltarget && path && path.length) {
            path = this.moveToController(path, creep);
            return true;
        }
        let wall;
        // ------ found a wall, destroy it
        if (wall = util.objectFromMemory(creep.memory.walltarget)) {
            let attack = creep.attack(wall);
            creep.log('attack?', attack);
            if (OK !== attack) {
                delete creep.memory.walltarget;
            }
        }

        // creep.log('creep.memory[WALL_ACTION]', creep.memory[ACTION], CLEAN_STRUCTURES, ACTION == CLEAN_STRUCTURES);

        // --------------------- clean structures
        /*
         if (!creep.memory.walltarget && creep.memory[ACTION] == CLEAN_STRUCTURES) {
         creep.log('attacking ramparts');

         let target = util.objectFromMemory(creep.memory.walltarget, (s) => s.hits && ! s.structureType == STRUCTURE_CONTROLLER);
         creep.log('loaded target', target);
         target = target || creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => s instanceof OwnedStructure && !s.my && s.hits &&  s.structureType !== STRUCTURE_CONTROLLER});
         creep.log('target', target);
         if (target) {
         creep.memory.walltarget = target.id;
         this.savePath(creep, null);
         let attack = creep.attack(target);
         creep.log('attack?', attack);
         if (OK !== attack) {
         creep.log('move?',creep.moveTo(target));
         }
         return true;
         }
         }
         */
        if (creep.memory[ACTION] === STATE_CLEAR_PATH) {
            path = path || this.loadPath(creep);
            if (!path) {
                let homeExit = creep.room.findExitTo(creep.memory.homeroom);
                let exit = creep.pos.findClosestByRange(homeExit);
                // creep.log('entry ?', JSON.stringify(creep.memory.entry));
                let pathObj = PathFinder.search(creep.pos, exit /*creep.memory.entry*/, this.ignoreWalls(creep));
                path = this.savePath(creep, pathObj.path);
                this.flagPath(creep, path, COLOR_CYAN);
            }
            if (path) {
                if (path.length == 0) {
                    creep.log('exit reached?');
                    creep.memory[ACTION] = STATE_CLEAN_STRUCTURES; // TODO
                } else {
                    /*
                     if (creep.pos.x == path[0].x && creep.pos.y == path[0].y) {
                     path = this.savePath(path.slice(1));
                     }
                     */
                    let moveTo = creep.moveByPath(path);
                    if (moveTo === ERR_NO_PATH) {
                        wall = this.findWall(creep, path);
                    }
                    if (wall) {
                        creep.memory.walltarget = wall.id;
                        let attack2 = creep.attack(wall);
                        creep.log('attackWall?', attack2);
                    } else {
                        creep.log('no path but no wall?', moveTo);
                    }
                }
            } else {
                creep.log('no path ! ');
                return false;

            }
        }
    }

    moveToController(path, creep) {
        let wall;
//creep.log('step',JSON.stringify(path[0]), path[0] instanceof RoomPosition);
        // 	if (creep.fatigue !== 0) return true;
        // let step = path[0];
        // creep.log('next step', JSON.stringify(path[0]));
        /*
         if (creep.pos.isEqualTo(step.x ,step.y)) {
         creep.log('step reached slicing');
         path = this.savePath(creep, path.slice(1));
         step = path[0];
         }
         */
        if (creep.fatigue !== 0) {
            return null;
        }
        let moveTo = creep.moveByPath(path);
        // creep.log('moveTo?', moveTo);

        if (ERR_NO_PATH === moveTo || ERR_INVALID_TARGET === moveTo) {
            creep.log('move failed', moveTo);
            if (creep.room.controller.pos.getRangeTo(creep.pos) == 1) {
                this.savePath(creep, null);
                creep.memory[ACTION] = STATE_CLEAR_PATH;
            } else {
                wall = this.findWall(creep, creep.pos);
                creep.log('wall encountered, attacking', creep.memory[PATH].length);
                creep.memory.walltarget = wall.id;
            }

        } else if (ERR_NOT_FOUND == moveTo) {
            creep.log('strayed out of the path ?', moveTo);
        }

        return path;
    }

    findWall(creep, pos) {

        if (pos.length) {
            // path
            // find the current step
            let found = false;
            let path = pos;
            for (i = 0; !found && i< path.length;i ++) {
                found = !(creep.pos.x === path[i].x && crep.pos.y === path[i].y);
            }
            pos = path[index];    
           
        }
        let structures = creep.room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
        let wall = _.find(structures, (s)=> (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART));
        creep.log('found wall?', wall);
        return wall;
    }

    /**
     * @typedef {Object} PosWithoutRoom
     * @property {number} x
     * @property {number} y
     */
    /**
     *
     * @param {Creep} creep
     * @param {PosWithoutRoom[]|RoomPosition[]| null}  path
     * @returns {PosWithoutRoom[]}
     */
    savePath(creep, path) {
        if (path) {
            let short = /*path[0].roomName ? _.map(path, (o)=> {
             return {x: o.x, y: o.y}
             }) : */path;
            creep.memory[PATH] = short;
            return short;
        } else {
            delete creep.memory[PATH];
            return null;
        }
    }

    /**
     *
     * @param {Creep} creep
     * @returns {PosWithoutRoom[]}
     */
    loadPath(creep) {
        return creep.memory[PATH] ? creep.memory[PATH] : null;
    }

    flagPath(creep, path, color) {
        this.removeFlags(creep);
        path.forEach((pos)=>creep.room.createFlag(pos.x, pos.y, undefined, color));
    }

    removeFlags(creep) {
        let oldFlags = creep.room.find(FIND_FLAGS);
        _.values(oldFlags).forEach((f)=> f.remove());
    }
}

module.exports = AttackWallStrategy;
