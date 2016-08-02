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
        let s = creep.memory[this.CURRENT_STRATEGY];
        let stratAndParams = {};
        if ('string' == typeof s || 'undefined' == typeof s) {
            stratAndParams.name = s;
        } else {
            stratAndParams = s;
        }
        var strategy = _.find(candidates, (strat)=> strat.constructor.name === stratAndParams.name && strat.acceptsState(stratAndParams.state));
        // creep.log('testing', JSON.stringify(stratAndParams));
        if (strategy && strategy.accepts(creep)) {
            // creep.log('matched', strategy, JSON.stringify(stratAndParams));
            return strategy;
        } else {
            // creep.log('did not accept', JSON.stringify(stratAndParams));
            return null;
        }
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
     * @param {Creep} creep
     * @param {string} targetRoom name of the room to go to
     * @param roomMemoryName memory slot to store the exit
     * @returns {RoomPosition}
     */
    findExitOld(creep, targetRoom) {
        if (!targetRoom || (creep.room.name === targetRoom)) {
            creep.log('util.findExit,invalid params', creep.room.name, targetRoom, roomMemoryName);
            throw new Error('util.findExit,invalid params');
        }
        // creep.log('findExit', targetRoom, roomMemoryName);
        let exit;
        if (!creep.room.memory[roomMemoryName]) { // todo refresh  exit every once in a while ?
            creep.log('finding exit', creep.room.name, targetRoom);

            let exitDir = creep.room.findExitTo(targetRoom);
            exit = creep.pos.findClosestByPath(exitDir); // TODO cache
            creep.room.memory[roomMemoryName] = JSON.stringify(exit);
        } else {
            // creep.log('parsing ', creep.room.memory[roomMemoryName]);
            exit = JSON.parse(creep.room.memory[roomMemoryName]);
        }
        return exit;
    }

    remember(logWith, fromRoom, toRoom, exitJson) {
        if (_.isString(exitJson) && exitJson[0] == '{') {
            // logWith.log('Memory.rooms[' + fromRoom + '].exits['+toRoom + ']=' + exitJson);
            Memory.rooms[fromRoom] = Memory.rooms[fromRoom] || {};
            Memory.rooms[fromRoom].exits = Memory.rooms[fromRoom].exits || {};
            Memory.rooms[fromRoom].exits[toRoom] = exitJson;
            // logWith.log('exits', Memory.rooms[fromRoom].exits);
        } else {
            logWith.log('ERROR : trying ro remember undefined', fromRoom, toRoom, exitJson)
        }
    }

    /**
     *
     * @param {Creep|Room} creepOrRoom
     * @param targetRoom
     * @returns {RoomPosition}
     */
    findExit(creepOrRoom, targetRoom) {
        let roomName, logWith, roomMemory, entryPoint;
        if (creepOrRoom.pos) {
            // creep case
            roomName = creepOrRoom.room.name;
            roomMemory = creepOrRoom.room.memory;
            logWith = creepOrRoom;
            entryPoint = creepOrRoom.pos;
        } else if (_.isString(creepOrRoom)) {
            // rooomName Case
            roomName = creepOrRoom;
            roomMemory = Memory.rooms[roomName];
            logWith = console;
            entryPoint = new RoomPosition(20, 20, roomName);
        } else {
            // room case
            roomName = creepOrRoom.name;
            roomMemory = creepOrRoom.memory;
            logWith = creepOrRoom;
            entryPoint = new RoomPosition(20, 20, roomName);
        }
        if (!targetRoom || (roomName === targetRoom)) {
            creepOrRoom.log('util.findExit,invalid params', roomName, targetRoom);
            throw new Error('util.findExit,invalid params');
        }
        // logWith.log('findExit', targetRoom, roomMemoryName);
        let exit;
        // logWith.log('known?',!!roomMemory[roomMemoryName]);
        let roomExits = (roomMemory.exits = roomMemory.exits || {});
        if (!roomExits[targetRoom]) { // todo refresh  exit every once in a while ?
            let mirror = (x)=>x === 0 || x === 49 ? 49 - x : x;
            // logWith.log('finding exit', roomName, targetRoom);
            let route = Game.map.findRoute(roomName, targetRoom);
            if (!route) {
                creep.log('ERROR no route from', roomName, 'to', targetRoom);
            }
            roomMemory.roomDistance = roomMemory.roomDistance || {};
            roomMemory.roomDistance [targetRoom] = route.length;
            // logWith.log('route before unshift', route.length, JSON.stringify(route));
            route.unshift({room: roomName});
            // logWith.log('route', route.length, JSON.stringify(route));
            if (route.length > 1) {
                for (let i = 1, max = route.length; i < max; i++) {
                    let currentRoom = route[i - 1].room;
                    Memory.rooms[currentRoom] = Memory.rooms[currentRoom] || {};
                    let currentExits = (Memory.rooms[currentRoom].exits = Memory.rooms[currentRoom].exits || {});
                    let roomStep = route[i];
                    let nextRoom = roomStep.room;
                    if (!Game.rooms[currentRoom]) {
                        logWith.log('unknown room', currentRoom);
                        continue;
                    }
                    // logWith.log('map step', nextRoom);
                    if (!currentExits[nextRoom]) {
                        let exitDir = roomStep.exit;
                        logWith.log('finding new exit', currentRoom, nextRoom);
                        exit = entryPoint.findClosestByPath(exitDir); // TODO cache
                        // todo try to choose an exit which does not touch a wall to limite future pathfinding issues
                    } else {
                        exit = JSON.parse(currentExits[nextRoom]);
                    }
                    // store the path from every step in the route
                    let exitJson = JSON.stringify(exit);
                    logWith.log(currentRoom, '->', nextRoom, exitJson);
                    for (let j = i, maxj = route.length; j < maxj; j++) {
                        this.remember(logWith, currentRoom, route[j].room, exitJson);
                    }
                    entryPoint = new RoomPosition(mirror(exit.x), mirror(exit.y), nextRoom);
                    // logWith.log('entryPoint ', JSON.stringify(entryPoint));
                    for (let j = i; j > 0; j--) {
                        this.remember(logWith, nextRoom, route[j - 1].room, JSON.stringify(entryPoint));
                    }
                }
            } else {
                logWith.log('ERROR : no route', roomName, targetRoom);
            }
        }
        // logWith.log('parsing ',roomExits[targetRoom]);
        exit = JSON.parse(roomExits[targetRoom]);
        exit = new RoomPosition(exit.x, exit.y, exit.roomName);
        // logWith.log('findExit', roomName, targetRoom, JSON.stringify(exit));
        return exit;
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
                room.find(FIND_MY_CREEPS, {filter: predicate})
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
        if (!remoteRoom) return [];
        let hostiles = remoteRoom.find(FIND_HOSTILE_CREEPS);
        let mineralsAreHarvestable = allowMinerals && remoteRoom.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}}).length;
        // remoteRoom.log('mineralsAreHarvestable', mineralsAreHarvestable, 'hostiles?',!(hostiles.length));
        if (!(hostiles.length)) {
            let deposits = remoteRoom.find(FIND_SOURCES);
            if (mineralsAreHarvestable) {
                // remoteRoom.log('adding minerals', mineralsAreHarvestable);
                deposits = deposits.concat(remoteRoom.find(FIND_MINERALS));
            }
            return deposits;
        }
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
            let safeSources = remoteRoom.find(FIND_SOURCES, {filter: safeFilter});
            if (mineralsAreHarvestable) {
                safeSources = safeSources.concat(remoteRoom.find(FIND_MINERALS, {filter: safeFilter}));
            }
            return safeSources;
        } else {
            return [];
        }
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
        options = options || {range: 1};
        memory = memory || 'moveInRoomPath';
        // creep.log('moveTo', Game.time);
        if (creep.memory.lastPos
            && creep.pos.x == creep.memory.lastPos.x && creep.pos.y == creep.memory.lastPos.y) {
            // creep.log('blocked ? ', creep.memory.triedMoved );
            if (creep.memory.triedMoved) { // didn't move, recompute !! todo improve
                creep.memory.blocked = (creep.memory.blocked || 0) + 1;
                creep.say('blocked');
                if (creep.memory.blocked > 3) {
                    // creep.log('blocked ? forgeting path');
                    creep.say('giving up');
                    delete creep.memory[memory];
                }
            }
        } else {
            creep.memory.blocked = 0;
            creep.memory.lastMoved = Game.time;
            // creep.memory.triedMoved = false;
        }

        let path = creep.memory[memory];
        if (path && path.target && pos.isEqualTo(path.target.x, path.target.y)) {
            path = path.path;
        } else {
            delete creep.memory[memory];
            path = false;
        }
        if (!path) {
            // check reachability
            let range = this.checkReachable(creep, pos, options.range);
            if (range !== options.range) {
                creep.log('unreachable tile, widening');
                options.range = range;
            }
            // creep.log('computing path to', JSON.stringify(pos), JSON.stringify(options));
            path = this.safeMoveTo2(creep, pos, options);
            // creep.log(path.length);
            path = this.pathFinderToMoveByPath(creep.pos, path);
            creep.memory[memory] = {path: path, target: pos};
        }
        if (path.length) {
            let moveTo = creep.moveByPath(path);
            if (moveTo === OK) {
                creep.say('' + pos.x + ',' + pos.y + ' OK');
                // creep.log('move OK' , (new Error().stack));
                creep.memory.lastPos = creep.pos;
                creep.memory.triedMoved = true;
            } else if (moveTo !== ERR_TIRED) {
                creep.say('' + pos.x + ',' + pos.y + ' KO');
                creep.log('move?', /*JSON.stringify(pos), JSON.stringify(path),*/ moveTo);
                creep.memory.triedMoved = true;
            } else {
                creep.memory.triedMoved = false;
            }
            if (moveTo === ERR_NOT_FOUND) {
                // creep.log('failed',JSON.stringify(pos),'path', JSON.stringify(path));
                delete creep.memory[memory];
            }
            // creep.log('moveTo?', moveTo);
            if (ERR_INVALID_TARGET === moveTo || ERR_NO_PATH === moveTo) {
                creep.log('unreachable? switching targets');
                this.clearMemory(creep);
            }
            return moveTo;
        }
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
            roomCallback: this.avoidCostMatrix(creep, creep.room.find(FIND_HOSTILE_CREEPS), 3)
        }).path;
        creep.moveTo(path[0]);
        return path;
    }

    safeMoveTo2(creep, destination, options) {
        options = options || {};
        let callback = this.avoidCostMatrix(creep, creep.room.find(FIND_HOSTILE_CREEPS).concat(creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_KEEPER_LAIR}})), 4);
        let path = PathFinder.search(creep.pos, (options.range ? {
            pos: destination,
            range: options.range
        } : destination), _.merge({
            plainCost: 2,
            swampCost: 10,
            roomCallback: callback
        }, options)).path;
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
            return pos2.y > pos1.y ? 5 : 1;
        } else if (pos1.y === pos2.y) {
            return pos2.x > pos1.x ? 3 : 7;
        } else if (pos1.x < pos2.x) {
            return (pos2.y < pos1.y) ? 2 : 4;
        } else return (pos2.y < pos1.y) ? 8 : 6;
    }

    /**
     *
     * @param {RoomPosition} pos origin
     * @param {Array} path
     */
    pathFinderToMoveByPath(pos, path) {
        let x = pos.x, y = pos.y;
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

    avoidCostMatrix(creep, hostiles, range) {
        range = range || 1;
        return (roomName) => {
            if (roomName == creep.room.name) {
                let matrix = new PathFinder.CostMatrix();
                let structures = Game.rooms[roomName].find(FIND_STRUCTURES);
                structures.forEach((s)=> {
                    if (s.structureType === STRUCTURE_ROAD) {
                        matrix.set(s.pos.x, s.pos.y, 1);
                    } else if (s.structureType === STRUCTURE_CONTAINER || (s.structureType === STRUCTURE_RAMPART && s.my)) {

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
                    matrix.set(c.pos.x, c.pos.y, 255);
                    for (let r = 1; r <= range; r++) {
                        let rcost = cost /** (range - r + 1) / range*/;
                        set(c.pos.x - r, c.pos.y - r, rcost);
                        set(c.pos.x - r, c.pos.y, rcost);
                        set(c.pos.x - r, c.pos.y + r, rcost);
                        set(c.pos.x, c.pos.y - r, rcost);
                        set(c.pos.x, c.pos.y + r, rcost);
                        set(c.pos.x + r, c.pos.y - r, rcost);
                        set(c.pos.x + r, c.pos.y, rcost);
                        set(c.pos.x + r, c.pos.y + r, rcost);
                    }
                });
                creep.room.find(FIND_MY_CREEPS).forEach((c)=> {
                    set(c.pos.x, c.pos.y, 255);
                });
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
            let distance = 0, complete = true;
            let route = [];
            route.push(roomName);
            do {
                console.log('room', roomName);
                let remoteRoomMemory = Memory.rooms[roomName];
                remoteRoomMemory.exits = remoteRoomMemory.exits || {};
                let exitCursor = remoteRoomMemory.exits[targetRoom];
                console.log('exit', exitCursor);
                if (exitCursor) {
                    distance++;
                    roomName = this.nextRoom(exitCursor).roomName;
                    console.log('nextroom', roomName);
                    route.push(roomName);
                } else {
                    complete = false;
                }
            } while (roomName != targetRoom && complete);
            console.log('route', JSON.stringify(route));
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
        let area = creep.room.lookAtArea(Math.max(0, pos.y - range), Math.max(0, pos.x - range), Math.min(49, pos.y + range), Math.min(49, pos.x + range));
        let walkable = this.findWalkableTiles(creep.room, area);
        if (walkable && walkable.length) {
            // creep.log('walkables', JSON.stringify(walkable));
            return range;
        } else {
            // creep.log('widening', range + 1);
            return this.checkReachable(creep, pos, range + 1);
        }

    }

    findWalkableTiles(room, squares,options) {
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
                    if (!impassable && (e.type === 'structure' || (e.type === LOOK_CONSTRUCTION_SITES && e.constructionSite.progress >0))) {
                        switch ((e.structure||e.constructionSite).structureType) {
                            case STRUCTURE_CONTAINER :
                            case STRUCTURE_ROAD:
                                break;
                            case STRUCTURE_RAMPART:
                                impassable |= (!e.structure.my);
                                break;
                            default: impassable = true ;
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
}
Util.ROOM_NAME_PATTERN = /([EW])(\d+)([NS])(\d+)/;
module.exports = new Util();
