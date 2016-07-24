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
                    // console.log('invalid', id, o);
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
                creep.log(object.id, 'is already reserved');
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
        // if (ownerid) creep.log('testing lock', object, ownerid);
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
        if (strategy && strategy.accepts(creep)) {
            return strategy;
        } else {
            return null;
        }
    }

    /**
     *
     * @param {Creep} creep
     * @param strategy
     */
    setCurrentStrategy(creep, strategy) {
        if (strategy) {
            creep.memory[this.CURRENT_STRATEGY] = {
                name: strategy.constructor.name,
                state: strategy.saveState()
            };
        } else {
            if (creep.memory[this.CURRENT_STRATEGY]) {

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
    remember (creep,fromRoom, toRoom, exitJson)  {
        if (_.isString(exitJson) && exitJson[0] == '{') {
            creep.log('Memory.rooms[' + fromRoom + '].exits['+toRoom + ']=' + exitJson);
            Memory.rooms[fromRoom] = Memory.rooms[fromRoom] || {};
            Memory.rooms[fromRoom].exits = Memory.rooms[fromRoom].exits || {};
            Memory.rooms[fromRoom].exits[toRoom] = exitJson;
            creep.log('exits', Memory.rooms[fromRoom].exits);
        } else {
            creep.log('ERROR : trying ro remember undefined', fromRoom, toRoom, exitJson)
        }
    }

    findExit(creep, targetRoom, roomMemoryName) {
        if (!targetRoom || (creep.room.name === targetRoom)) {
            creep.log('util.findExit,invalid params', creep.room.name, targetRoom, roomMemoryName);
            throw new Error('util.findExit,invalid params');
        }
        // creep.log('findExit', targetRoom, roomMemoryName);
        let exit;
        // creep.log('known?',!!creep.room.memory[roomMemoryName]);
        let roomExits =(creep.room.memory.exits = creep.room.memory.exits ||{});
        if (!roomExits[targetRoom]) { // todo refresh  exit every once in a while ?
            let mirror = (x)=>x === 0 || x === 49 ? 49 - x : x;
            creep.log('finding exit', creep.room.name, targetRoom);
            let route = Game.map.findRoute(creep.room, targetRoom);
            creep.log('route before unshift', route.length, JSON.stringify(route));
            route.unshift({room: creep.room.name});
            creep.log('route', route.length, JSON.stringify(route));
            let entryPoint = creep.pos;
            if (route.length>1) {
                for (let i = 1, max = route.length; i < max; i++) {
                    let currentRoom = route[i-1].room;
                    Memory.rooms[currentRoom] =Memory.rooms[currentRoom] || {};
                    let currentExits =(Memory.rooms[currentRoom].exits =Memory.rooms[currentRoom].exits || {});
                    let roomStep = route[i];
                    let nextRoom = roomStep.room;
                    if (! Game.rooms[currentRoom]) {
                        creep.log('unknown room',currentRoom);
                        continue;
                    }
                    creep.log('map step', nextRoom);
                    if (!currentExits[nextRoom]) {
                        let exitDir = roomStep.exit;
                        creep.log('finding new exit', currentRoom, nextRoom);
                        exit = entryPoint.findClosestByPath(exitDir); // TODO cache
                    } else {
                        exit = JSON.parse(currentExits[nextRoom]);
                    }
                    // store the path from every step in the route
                    let exitJson = JSON.stringify(exit);
                    creep.log(currentRoom, '->', nextRoom, exitJson);
                    for (let j = i, maxj = route.length;j<maxj; j++) {
                        this.remember(creep, currentRoom, route[j].room, exitJson);
                    }
                    entryPoint = new RoomPosition(mirror(exit.x), mirror(exit.y), nextRoom);
                    creep.log('entryPoint ', JSON.stringify(entryPoint));
                    for (let j = i;j>0; j--) {
                        this.remember(creep, nextRoom, route[j-1].room, JSON.stringify(entryPoint));
                    }
                }
            } else  {
                creep.log('ERROR : no route', creep.room.name, targetRoom);
            }
        }
        // creep.log('parsing ',roomExits[targetRoom]);
        exit = JSON.parse(roomExits[targetRoom]);
        // creep.log('findExit', creep.room.name, targetRoom, JSON.stringify(exit));
        return exit;
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
        if (!(hostiles.length)) {
            let deposits = remoteRoom.find(FIND_SOURCES);
            if (mineralsAreHarvestable) {
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
            // console.log('step', JSON.stringify(step));
            let mapped = {
                x: step.x,
                y: step.y,
                dx: step.x - x,
                dy: step.y - y,
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
            new PathFinder.CostMatrix();
            if (roomName == creep.room.name) {
                let matrix = new PathFinder.CostMatrix();
                hostiles.forEach((c)=> {
                    let cost = (c.hits > 100) ? 255 : 60;
                    matrix.set(c.pos.x, c.pos.y, 255);
                    for (let r = 1; r <= range; r++) {
                        let rcost = cost * (range - r + 1) / range;
                        matrix.set(c.pos.x - r, c.pos.y - r, rcost);
                        matrix.set(c.pos.x - r, c.pos.y, rcost);
                        matrix.set(c.pos.x - r, c.pos.y + r, rcost);
                        matrix.set(c.pos.x, c.pos.y - r, rcost);
                        matrix.set(c.pos.x, c.pos.y + r, rcost);
                        matrix.set(c.pos.x + r, c.pos.y - r, rcost);
                        matrix.set(c.pos.x + r, c.pos.y, rcost);
                        matrix.set(c.pos.x + r, c.pos.y + r, rcost);
                    }
                });
                creep.room.find(FIND_MY_CREEPS).forEach((c)=> {
                    matrix.set(c.pos.x, c.pos.y, 255);
                });
                return matrix;
            } else {
                return false;
            }
        };
    }
}

module.exports = new Util();
