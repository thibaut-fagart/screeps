var _ = require('lodash');
class Util {

    constructor() {
        this.CURRENT_STRATEGY = 'strategy';
        this.currentid = Memory.uuid || 0;
        this.ANY_MINERAL = 'anyMineral';
    }

    /**
     * @param {Object} memoryRoot
     * @param {string} path
     * @param {Function} (validator= memory is cleared if this doest not validate
     * @param {Function} (releaseLambda)
     * @return {Object}
     */
    objectFromMemory(memoryRoot, path, validator, releaseLambda) {
        if (!memoryRoot || !path) {
            return null;
        }
        let id = memoryRoot[path];
        if (id) {
            let o = Game.getObjectById(id);
            if (o) {
                if ((!validator || validator(o))) {
                    return o;
                } else {
                    // console.log('invalid', id, o, !validator, !validator || validator(o));
                    // remote reservation
                    if (releaseLambda) releaseLambda(o);
                    delete memoryRoot[path];
                }
            } else {
                delete memoryRoot[path];
            }
        }

    }

    /**
     *
     * @param {Creep}creep
     * @param {Structure} object
     * @param {string} reason
     * @returns {boolean} true if object is not already reserved
     */
    reserve(creep, object, reason) {
        if (object) {
            let reserved = this.reservations(creep, reason);
            let owner = reserved[object.id];
            if (owner && !Game.getObjectById(owner)) {
                // clean old lock
                delete reserved[object.id];
                owner = null;
            }

            if (!owner) {
                reserved[object.id] = creep.id;
                creep.memory.locks = (creep.memory.locks || []);
                if (creep.memory.locks.indexOf(object.id) < 0) {
                    creep.memory.locks.push(object.id);
                }
                // creep.log('reserved', object.id, reason);
                return true;
            } else if (owner !== creep.id) {
                // creep.log(object.id, 'is already reserved');
                return false;
            } else if (owner === creep.id) {
                return true;
            }
        }
        return false;

    }

    /**
     *
     * @param {Creep} creep
     * @param {string} reason
     * @returns {{string:string}|{}}
     */
    reservations(creep, reason) {
        let reserved = creep.room.memory.reserved = creep.room.memory.reserved || {};
        if (reason) {
            reserved[reason] = reserved[reason] || {};
            reserved = reserved[reason];
        }
        return reserved;

    }

    /**
     * true if object is already reserved by some other creep
     * @param {Creep} creep
     * @param {Structure} object
     * @param {string} reason
     * @returns {boolean}
     */
    isReserved(creep, object, reason) {
        if (!object) return false;

        let reserved = this.reservations(creep, reason);
        let ownerid = reserved[object.id];
        if (ownerid && !Game.getObjectById(ownerid)) {
            delete reserved[object.id];
            ownerid = null;
        }
        // creep.log('testing lock', object, ownerid);
        return !!(ownerid && ownerid !== creep.id);
    }

    /**
     *
     * @param {Creep} creep
     * @param {string|Structure} object
     * @param {string} reason
     */
    release(creep, object, reason) {
        // creep.log('releasing ?', object);
        if (!object) return;
        let reserved = this.reservations(creep, reason);
        let creepLocks = (creep.memory.locks || []);
        let idx = creepLocks.indexOf(object);
        if (idx) {
            creepLocks.splice(idx, 1);
        }
        delete  reserved[(typeof object === 'string'  ) ? object : object.id];
        // creep.log('released',object.id)
    }

    /**
     *
     * @param {Creep} creep
     * @param {Object[]}candidates
     * @returns {T|*}
     */
    getAndExecuteCurrentStrategy(creep, candidates) {
        let strategy = this.currentStrategy(creep, candidates);
        // creep.log('testing', JSON.stringify(stratAndParams));
        if (strategy && strategy.accepts(creep)) {
            // creep.log('matched', strategy, JSON.stringify(stratAndParams));
            return strategy;
        } else {
            // creep.log('did not accept', JSON.stringify(stratAndParams));
            if (strategy && strategy.clearMemory) strategy.clearMemory(creep);
            this.setCurrentStrategy(creep, null);
            return null;
        }
    }

    currentStrategy(creep, candidates) {
        let s = creep.memory[this.CURRENT_STRATEGY];
        let stratAndParams = {};
        if ('string' == typeof s || 'undefined' == typeof s) {
            stratAndParams.name = s;
        } else {
            stratAndParams = s;
        }
        return _.find(candidates, (strat)=> strat.constructor.name === stratAndParams.name && strat.acceptsState(stratAndParams.state));
    }

    /**
     *
     * @param {[Object]} strategies
     */
    indexStrategies(strategies) {
        for (let i = 0, max = strategies.length; i < max; i++) {
            strategies[i].index = i;
        }
    }

    /**
     *
     * @param {Creep} creep
     * @param strategy
     */
    setCurrentStrategy(creep, strategy) {
        if (strategy) {
            if (creep.memory[this.CURRENT_STRATEGY] && creep.memory[this.CURRENT_STRATEGY].name !== strategy.constructor.name) {
                // creep.log('strategy change, discarding path', creep.memory[this.CURRENT_STRATEGY].name, strategy.constructor.name); // todo compare state
                delete creep.memory[creep.memory[this.CURRENT_STRATEGY].name + 'Path'];
            }
            creep.memory[this.CURRENT_STRATEGY] = {
                name: strategy.constructor.name,
                state: strategy.saveState()
            };
        } else {
            if (creep.memory[this.CURRENT_STRATEGY] && creep.memory[this.CURRENT_STRATEGY].name) {
                // creep.log('discarding old path', creep.memory[this.CURRENT_STRATEGY].name);
                delete creep.memory[creep.memory[this.CURRENT_STRATEGY].name + 'Path'];
            }
            delete creep.memory[this.CURRENT_STRATEGY];
        }
    }

    strategyToLog(strategy) {
        return (strategy ? strategy.constructor.name : 'none');
    }

    /**
     *
     * @param {RoomPosition| string} exitCursor
     * @returns {RoomPosition}
     */
    nextRoom(exitCursor) {
        let myExit = _.isString(exitCursor) ? JSON.parse(exitCursor) : exitCursor;

        let coords = Util.ROOM_NAME_PATTERN.exec(myExit.roomName);
        let x, y, roomName;
        coords[2] = Number(coords[2]);
        coords[4] = Number(coords[4]);
        // console.log(JSON.stringify(coords));
        if (myExit.x == 0) {
            x = 49;
            y = myExit.y;
            coords [2] += (coords[1] == 'E') ? -1 : 1;
        }
        else if (myExit.x == 49) {
            x = 0;
            y = myExit.y;
            coords[2] += (coords[1] == 'E') ? 1 : -1;
        }
        else if (myExit.y == 0) {
            x = myExit.x;
            y = 49;
            coords[4] += (coords[3] == 'N') ? 1 : -1;
        }
        else if (myExit.y == 49) {
            x = myExit.x;
            y = 0;
            coords[4] += (coords[3] == 'N') ? -1 : 1;
        }
        if (coords[2] < 0) {
            coords[2] = 0;
            coords[1] = coords[1] == 'W' ? 'E' : 'W';
        }
        if (coords[4] < 0) {
            coords[4] = 0;
            coords[3] = coords[3] == 'N' ? 'S' : 'N';
        }
        // console.log(JSON.stringify(coords));
        roomName = coords[1] + coords[2] + coords[3] + coords[4];
        return new RoomPosition(x, y, roomName);

    }

    /**
     * @typedef {Object} Roster
     */
    /**
     *
     * @param {Room|string} [room]
     * @param {Function} [predicate] only counts creeps where predicate is true
     * @return {Roster}
     */
    roster(room, predicate) {
        if (room) {
            // console.log(typeof room);
            if ('string' === typeof room) {
                room = Game.rooms[room];
                if (!room) return {};
            }
        }
        // console.log('room name', (room?room.name:'null'));

        let creeps = (room || predicate) ?
            (predicate ?
                room.find(FIND_MY_CREEPS).filter(predicate)
                : room.find(FIND_MY_CREEPS)) : Game.creeps;
        return _.countBy(creeps, (c) => c.memory.role);
    }

    /**
     *
     * @param {string} [id]
     */
    uuid(id) {
        if (id) {
            return id + '.' + this.currentid++;
        } else {
            return this.currentid++;
        }
    }

    findSafeSources(remoteRoom, allowMinerals) {
        let deposits = [];
        if (!remoteRoom) return [];
        let nonHostiles = remoteRoom.memory.tolerates || [];
        allowMinerals = allowMinerals && !remoteRoom.memory.ignoreMinerals;
        let hostiles = remoteRoom.find(FIND_HOSTILE_CREEPS).filter((c)=>c.owner.username !== 'Source Keeper' && (!c.owner || nonHostiles.indexOf(c.owner.username) < 0));
        let mineralsAreHarvestable = allowMinerals && remoteRoom.structures[STRUCTURE_EXTRACTOR].length;
        // remoteRoom.log('mineralsAreHarvestable', mineralsAreHarvestable, 'hostiles?',!(hostiles.length));
        if (!(hostiles.length)) {
            deposits = remoteRoom.find(FIND_SOURCES);
            if (mineralsAreHarvestable) {
                // remoteRoom.log('adding minerals', mineralsAreHarvestable);
                deposits = deposits.concat(remoteRoom.find(FIND_MINERALS));
            }
        } else {
            let keeperName = 'Source Keeper';
            let keepers = _.filter(hostiles, (h)=>h.owner && keeperName === h.owner.username);
            if (keepers.length === hostiles.length) {
                let safeFilter = (s)=>
                _.filter(
                    s.pos.findInRange(FIND_HOSTILE_CREEPS, 4),
                    (keeper)=> {
                        let activeParts = _.filter(keeper.body, (part)=> part.hits > 0);
                        return activeParts.length > 1;
                    } // non disabled keepers
                ).length == 0;
                deposits = remoteRoom.find(FIND_SOURCES).filter(safeFilter);
                if (mineralsAreHarvestable) {
                    deposits = deposits.concat(remoteRoom.find(FIND_MINERALS).filter(safeFilter)).filter((m)=>m.mineralAmount > 0);
                }
            }
        }
        return remoteRoom.memory.sources ? deposits.filter((s)=>remoteRoom.memory.sources.indexOf(s.id) >= 0) : deposits;
    }

    /**
     * todo it should be possible to exchange pos with a creep for which lastMoved > Game.time -2 && fatigue ===0
     * @param creep
     * @param memorySlot
     * @returns {boolean}
     */
    checkBlocked(creep, memorySlot) {
        if (creep.memory.lastPos
            && creep.pos.x == creep.memory.lastPos.x && creep.pos.y == creep.memory.lastPos.y) {
            // creep.log('blocked ? ', creep.memory.triedMoved, creep.memory.blocked);
            if (creep.memory.triedMoved) { // didn't move, recompute !! todo improve
                creep.memory.blocked = (creep.memory.blocked || 0) + 1;
                // creep.say('blocked');
                if (creep.memory[memorySlot]) {
                    let path = this.restorePath(creep.memory[memorySlot].path);
                    let idx = _.findIndex(path, (i) => i.x - i.dx == creep.pos.x && i.y - i.dy == creep.pos.y);
                    // creep.log('pathIndex', idx);
                    if (idx >= 0 && idx < path.length - 1) {
                        let nextPos = path[idx + 1];
                        let pos = new RoomPosition(nextPos.x, nextPos.y, creep.room.name);
                        let obstacleCreeps = pos.lookFor(LOOK_CREEPS);
                        if (obstacleCreeps.length > 0) {
                            /* {Creep}*/
                            let blocker = obstacleCreeps[0];
                            // creep.log('blocker', blocker.name);
                            if (blocker.fatigue == 0 && blocker.memory.lastMoved > Game.time - 2) {
                                let blockerMoveDir = (path[idx + 1].direction + 4) % 8 + 1;
                                let otherOk = blocker.move(blockerMoveDir);
                                let ok = creep.move(path[idx + 1].direction);
                                if (otherOk === OK && ok === OK) {
                                    // creep.log('movedBlocker', blockerMoveDir);
                                    // creep.log('moved', path[idx+1].direction);
                                    return false;
                                }
                            }
                        }
                    }
                }
                if (creep.memory.blocked > 2) {
                    // creep.log('blocked ? forgeting path');
                    delete creep.memory[memorySlot];
                    // creep.log('giving up', creep.memory[memorySlot]);
                    return true;
                }
            }
        } else {
            creep.memory.blocked = 0;
            creep.memory.lastMoved = Game.time;
            // creep.memory.triedMoved = false;
        }
        return false;
    }

    /**
     *
     * @param {Creep} creep
     * @param {RoomPosition} pos the destination
     * @param {string} [memory] the slot to cache the path, default 'moveInRoomPath'
     * @param {Object} [options] to be passed to PathFinder.search, by default {range:1}
     * @returns {*}
     */
    moveTo(creep, pos, memory, options) {
        options = options || {range: 1, maxOps: 2500};
        if (!_.isNumber(options.range)) options.range = 1;
        memory = memory || 'moveInRoomPath';
        // creep.log('path before moveTo', creep.memory[memory].path);
        // creep.log('moveTo', Game.time, JSON.stringify(pos),JSON.stringify(options));
        let blocked = this.checkBlocked(creep, memory);
        if (blocked) {
            options.avoidCreeps = true;
        }
        let path = creep.memory[memory];
        // creep.log('memory[path]',memory, JSON.stringify(path));
        // check the target pos didn't change
        let isPathValid = path && path.target && (pos.getRangeTo(path.target.x, path.target.y)<=options.range) && pos.roomName == path.target.roomName;
        if (isPathValid) {
            path = this.restorePath(path.path);
            // creep.log('restored path', JSON.stringify(path));
        } else if (path) {
            // creep.log('dropping path, bad destination', JSON.stringify(pos), JSON.stringify(path.target), options.range);
            delete creep.memory[memory];
            path = false;
        }
        if (!path) {
            // check reachability
            // creep.log('no path');
/* this is expensive and seldom used (almost as expensive as finding the path)
            let range = this.checkReachable(creep, pos, options.range);
            if (range !== options.range) {
                creep.log('unreachable tile, widening');
                options.range = range + 1;
            }
*/
            // creep.log('computing path to', JSON.stringify(pos), JSON.stringify(options));
            path = this.safeMoveTo2(creep, pos, options);

            // if (blocked) creep.log('blocked path',JSON.stringify(path));
            path = this.pathFinderToMoveByPath(creep.pos, path);
            this.savePath(creep, memory, path, pos);
            // creep.log('saved memory[path]',memory, JSON.stringify(creep.memory[memory]));
            // if (blocked) creep.log('serialized blocked path',creep.memory[memory]);
        }
        if (path.length) {
            let moveTo = creep.moveByPath(path);
            // creep.log('moveTo?', moveTo);
            if (moveTo === OK) {
                creep.say(`${pos.x},${pos.y} OK`);
                // creep.log('move OK' , (new Error().stack));
                creep.memory.lastPos = creep.pos;
                creep.memory.triedMoved = true;
            } else if (moveTo !== ERR_TIRED) {
                creep.say(`${pos.x},${pos.y} KO`);
                // creep.log('move?', moveTo, JSON.stringify(pos), JSON.stringify(path));
                creep.memory.triedMoved = true;
            } else {
                creep.memory.triedMoved = false;
            }
            if (moveTo === ERR_NOT_FOUND) {
                // creep.log('failed', JSON.stringify(pos), 'path', JSON.stringify(path));
                delete creep.memory[memory];
            }
            // creep.log('moveTo?', moveTo);
            if (moveTo === ERR_INVALID_TARGET || moveTo === ERR_NO_PATH) {
                creep.log('unreachable? switching targets');
                this.clearMemory(creep);
            }
            return moveTo;
        } else if (creep.pos.getRangeTo(pos) <= options.range) {
            return OK;
        } else {
            creep.log('empty path', pos, 'options.range',options.range, 'range',creep.pos.getRangeTo(pos));
            creep.moveTo(pos);
        }
    }

    restorePath(path) {
        return _.isString(path) ? Room.deserializePath(path) : path;
    }

    savePath(creep, memory, path, pos) {
        creep.memory[memory] = {path: Room.serializePath(path), target: pos};
    }

    /**
     *
     * @param creep
     * @returns {false |LEFT|TOP|RIGHT|BOTTOM}
     */
    isAtDoor(creep) {
        let pos = creep.pos;
        if (pos.x <= 1) {
            return LEFT;
        } else if (pos.x >= 48) {
            return RIGHT;
        } else if (pos.y <= 1) {
            return TOP;
        } else if (pos.y >= 48) {
            return BOTTOM;
        }
        return false;
    }

    safeMoveTo(creep, destination) {
        let path = PathFinder.search(creep.pos, destination, {
            roomCallback: this.avoidHostilesCostMatrix(creep), maxOps: 2500
        }).path;
        creep.moveTo(path[0]);
        return path;
    }


    safeMoveTo2(creep, destination, options) {
        // creep.log('safeMoveTo2', creep.name, destination);
        options = options || {};
        let callback = this.avoidHostilesCostMatrix(creep, options);
        // console.log('safeMoveTo2', creep.room.name, creep.name);
/*
        if (creep.room.name === 'W55S44' && !creep.name) {
            // creep.log('matrix',callback, callback(creep.room.name));
            this.debugCostMatrix(creep.room, callback(creep.room.name));
        }
*/
        let goal = (options.range) ? {pos: destination, range: options.range} : destination;
        options = _.merge({
            plainCost: 2,
            swampCost: 10,
            roomCallback: callback
        }, options);
        let path = PathFinder.search(creep.pos, goal, options).path;
        // creep.moveTo(path[0]);
        // creep.log('pathfinder path', JSON.stringify(creep.pos), JSON.stringify(destination), path.length);
        return path;
    }

    healingCapacity(creep) {
        return (creep instanceof Creep) ? creep.getActiveBodyparts(HEAL) * 10 : 100;
    }

    direction(pos1, pos2) {
        if (Math.abs(pos1.x - pos2.x) > 1 || Math.abs(pos1.y - pos2.y) > 1) {
            throw new Error('incorrect use of direction(), pos should be tangent');
        }
        if (pos1.x === pos2.x) {
            return pos2.y > pos1.y ? BOTTOM : TOP;
        } else if (pos1.y === pos2.y) {
            return pos2.x > pos1.x ? RIGHT : LEFT;
        } else if (pos1.x < pos2.x) {
            return (pos2.y < pos1.y) ? TOP_RIGHT : BOTTOM_RIGHT;
        } else return (pos2.y < pos1.y) ? TOP_LEFT : BOTTOM_LEFT;
    }

    /**
     *
     * @param {RoomPosition} pos origin
     * @param {Array} path
     */
    pathFinderToMoveByPath(pos, path) {
        let result = Array(path.length);
        let previousStep = pos;
        for (var i = 0; i < path.length; i++) {

            let step = path[i];
            // console.log('step', i,JSON.stringify(step));
            let mapped = {
                x: step.x,
                y: step.y,
                dx: step.x - (i ? path[i - 1] : pos).x,
                dy: step.y - (i ? path[i - 1] : pos).y,
                direction: this.direction(previousStep, step)
            };
            // console.log('mapped', JSON.stringify(mapped));
            result[i] = mapped;
            previousStep = step;
        }
        return result;
    }

    cachedMatrix(creep, roomName) {
        this.cache = this.cache || {};
        this.cache[roomName] = this.cache[roomName] || {};
        if (!this.cache[roomName].expires || this.cache[roomName].expires < Game.time || !this.cache[roomName].matrix) {
            // creep.log('refreshing cachedMatrix');

            let room = Game.rooms[roomName];
            this.cache[roomName].matrix = {
                expires: Game.time,
                matrix: this.avoidCostMatrix(room, room.find(FIND_HOSTILE_CREEPS), 4)
            };
        } else {
            // creep.log('returning cachedMatrix');

        }
        return this.cache[roomName].matrix;
        /*
         Memory.rooms[roomName] = Memory.rooms[roomName] || {};
         Memory.rooms[roomName].cache = Memory.rooms[roomName].cache || {};
         Memory.rooms[roomName].cache.hostileMatrix = Memory.rooms[roomName].cache.hostileMatrix;
         */
    }

    avoidHostilesCostMatrix(creepOrRoom, options) {
        let room = creepOrRoom.room ? creepOrRoom.room : creepOrRoom;
        return this.avoidCostMatrix(room, (options && options.ignoreHostiles) ? [] : room.find(FIND_HOSTILE_CREEPS), 3, options);
    }
    debugCostMatrix (room, matrix) {
        for(let x = 0; x < 49; x++) {
            for (let y =0; y < 49; y++) {
                let cost = matrix.get(x, y);
                if (cost===255) {
                    room.createFlag(x, y, this.newFlagName(), COLOR_GREY, COLOR_RED);
                }
            }
        }
    }
    avoidCostMatrix(creepOrRoom, hostiles, range, options) {
        range = range || 1;
        options = options || {};
        let room = creepOrRoom.room ? creepOrRoom.room : creepOrRoom;
        // creepOrRoom.log('avoidCostMatrix', room.name, JSON.stringify(options));
        return (roomName) => {
            if (roomName == room.name) {
                let matrix = new PathFinder.CostMatrix();
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
                hostiles.forEach((c)=> {
                    let cost = (c.hits > 100) ? 255 : 60;
                    let top = Math.max(0, c.pos.y - range);
                    let left = Math.max(0, c.pos.x - range);
                    let bottom = Math.min(49, c.pos.y + range);
                    let right = Math.min(49, c.pos.x + range);
                    for (let x = left; x <=right;x++) {
                        for (let y = top; y <= bottom;y++) {
                            matrix.set(x, y, cost);
                        }
                    }
                });
                if (options.avoidCreeps) {
                    // creepOrRoom.log('avoidingCreeps');
                    room.find(FIND_CREEPS).forEach((c)=> {
                        set(c.pos.x, c.pos.y, 255);
                    });
                }
                return matrix;
            } else {
                return false;
            }
        };
    }

    roomDistance(fromRoom, targetRoom) {

        if (!Memory.rooms[fromRoom].roomDistance || !Memory.rooms[fromRoom].roomDistance[targetRoom]) {
            Memory.rooms[fromRoom].roomDistance = Memory.rooms[fromRoom].roomDistance || {};
            let roomName = fromRoom;
            let complete = true;
            let route = [];
            route.push(roomName);
            do {
                // console.log('room', roomName);
                let exitCursor = Room.getExitTo(roomName, targetRoom);
                // console.log('exit', exitCursor);
                if (exitCursor) {
                    roomName = this.nextRoom(exitCursor).roomName;
                    // console.log('nextroom', roomName);
                    route.push(roomName);
                } else {
                    complete = false;
                }
            } while (roomName != targetRoom && complete);
            // console.log('route', JSON.stringify(route));
            if (roomName == targetRoom) {
                for (let i = 0, max = route.length; i < max; i++) {
                    for (let j = i + 1, maxj = route.length; j < maxj; j++) {
                        Memory.rooms[route[i]].roomDistance = Memory.rooms[route[i]].roomDistance || {};
                        Memory.rooms[route[i]].roomDistance[route[j]] = j - i;
                        Memory.rooms[route[j]].roomDistance = Memory.rooms[route[j]].roomDistance || {};
                        Memory.rooms[route[j]].roomDistance[route[i]] = j - i;
                    }
                }
            }

        }
        return Memory.rooms[fromRoom].roomDistance[targetRoom];
    }

    /**
     *
     * @param {Creep} creep
     * @param {RoomPosition} pos
     * @param {number} range
     * @return {number}
     */
    checkReachable(creep, pos, range) {
        if (isNaN(range)) {
            creep.log('NaN !!!');
            creep.log(new Error().stack);
            range = 1;
        }
        let area = creep.room.lookAtArea(Math.max(0, pos.y - range), Math.max(0, pos.x - range), Math.min(49, pos.y + range), Math.min(49, pos.x + range));
        let walkable = this.findWalkableTiles(creep.room, area);
        if (walkable && walkable.length) {
            // creep.log('walkables', JSON.stringify(walkable));
            return range;
        } else {
            // creep.log('widening', JSON.stringify(pos), range + 1);
            return this.checkReachable(creep, pos, range + 1);
        }

    }

    findWalkableTiles(room, squares, options) {
        let candidates = [];
        options = options || {};
        // room.log('findWalkableTiles', JSON.stringify(options), options.ignoreCreeps );
        _.keys(squares).forEach((y)=> {
            _.keys(squares[y]).forEach((x)=> {
                let xy = squares[y][x];
                let impassable = false;
                xy.forEach((e)=> {

                    impassable |= ('wall' === e.terrain || (e.type === 'creep' && !options.ignoreCreeps ) || e.type == 'source');

                    impassable |= OBSTACLE_OBJECT_TYPES.indexOf(e.type) >= 0;
                    if (!impassable && (e.type === 'structure' || (e.type === LOOK_CONSTRUCTION_SITES && e.constructionSite.progress > 0))) {
                        switch ((e.structure || e.constructionSite).structureType) {
                            case STRUCTURE_CONTAINER :
                            case STRUCTURE_PORTAL :
                            case STRUCTURE_ROAD:
                                break;
                            case STRUCTURE_RAMPART:
                                impassable |= (!e.structure.my);
                                break;
                            default:
                                impassable = true;
                        }
                    }
                });
                if (!impassable) {
                    candidates.push(new RoomPosition(x, y, room.name));
                }
            });
        });
        return candidates;
    }

    /*
     findWalkableTiles(room, squares) {
     let candidates = [];
     _.keys(squares).forEach((y)=> {
     _.keys(squares[y]).forEach((x)=> {
     let xy = squares[y][x];
     let impassable = false;
     xy.forEach((e)=> {
     impassable |= OBSTACLE_OBJECT_TYPES.indexOf(e.type)>=0;
     impassable |= (e.type ==='terrain' && OBSTACLE_OBJECT_TYPES.indexOf(e.terrain) );
     impassable |= (e.type ==LOOK_CONSTRUCTION_SITES && OBSTACLE_OBJECT_TYPES.indexOf(e.structureType)>=0);
     });
     if (!impassable) {
     candidates.push(new RoomPosition( x, y, room.name));
     }
     });
     });
     return candidates;
     }

     */
    primaryBuildColor(structureType) {
        'use strict';
        return COLOR_PURPLE + (_.keys(CONSTRUCTION_COST).indexOf(structureType) >= COLORS_ALL.length ? 1 : 0);
    }

    secondaryBuildColor(structureType) {
        'use strict';
        return _.keys(CONSTRUCTION_COST).indexOf(structureType) % COLORS_ALL.length;
    }

    buildColors(structureType) {
        return {color: this.primaryBuildColor(structureType), secondaryColor: this.secondaryBuildColor(structureType)};
    }

    newFlagName() {
        let flagName;
        Memory.temp.flagId = Memory.temp.flagId || 0;
        Memory.temp.flagId = Memory.temp.flagId + 1;
        flagName = 'flag' + Memory.temp.flagId;
        return flagName;
    }

    /**
     *
     * @param {RoomPosition|{x,y}} pos
     * @returns {string}
     */
    posToString(pos) {
        let pad = (i)=> (i < 10 ? '0' + i.toString() : i.toString());
        return pad(pos.x) + pad(pos.y);
    }

    /**
     *
     * @param  {string} pos
     * @param [roomName]
     * @returns {RoomPosition|{x,y}}
     */
    posFromString(pos, roomName) {
        let x = Number.parseInt(pos.substring(0, 2));
        let y = Number.parseInt(pos.substring(2, 4));
        try {
            return new RoomPosition(x, y, roomName);
        } catch (e) {
            console.log('invalid pos', JSON.stringify(pos), roomName);
            throw e;
        }

    }

    /**
     *
     * @param {RoomPosition[]} path
     * @param {log} logWith
     * @return {road,plain,swamp}
     */
    pathCost(path, logWith) {
        let result = {road: 0, plain: 0, swamp: 0};
        return path.reduce((acc, pos)=> {
            let stepCost = 2;
            if (pos.lookFor(LOOK_STRUCTURES).find(l=> l.structureType === STRUCTURE_ROAD)) {
                result.road =result.road + 1;
            } else {
                let terrain = pos.lookFor(LOOK_TERRAIN);
                // logWith.log('terrain', JSON.stringify(terrain));
                result[terrain] = result[terrain] + 1;
            }
            // logWith.log('stepCost', stepCost, JSON.stringify(pos));
            return acc ;
        }, result);
        return result;
    }

    /**
     *
     * @param {BODYPART[]} body
     * @return {string}
     */
    bodyToString(body) {
        return body.reduce((s, part)=>s + partsToChar[part], '');
    }
    /**
     *
     * @param {string} s
     * @return {BODYPART[]} body
     */
    stringToBody(s) {
        let body = [];
        for (let i in s) {
            body.push(charToParts[s.charAt(i)]);
        }
        return body;
    }
}
var partsToChar = {};
partsToChar[MOVE] = 'M';
partsToChar[WORK] = 'W';
partsToChar[CARRY] = 'C';
partsToChar[ATTACK] = 'A';
partsToChar[RANGED_ATTACK] = 'R';
partsToChar[TOUGH] = 'T';
partsToChar[HEAL] = 'H';
partsToChar[CLAIM] = 'D';
var charToParts = {};
_.pairs(partsToChar).forEach(pair=>{
    'use strict';
    charToParts[pair[1]] = pair[0];
});


Util.ROOM_NAME_PATTERN = /([EW])(\d+)([NS])(\d+)/;
require('./profiler').registerClass(Util, 'Util');
module.exports = new Util();
