var _ = require('lodash');
class Util {

    constructor() {
        this.CURRENT_STRATEGY = 'strategy';
        this.currentid = Memory.uuid || 0;
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
        return (ownerid && ownerid !== creep.id);
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
            if (creep.memory[this.CURRENT_STRATEGY])  {
                
            }
            delete creep.memory[this.CURRENT_STRATEGY];
        }
    }

    strategyToLog(strategy) {
        return (strategy ? strategy.constructor.name : 'none');
    }

    findExit(creep, room, memoryName) {
        var exit;
        if (!creep.room.memory[memoryName]) { // todo refresh  exit every once in a while ?
            creep.log("finding exit to", room);
            var exitDir = creep.room.findExitTo(room);
            exit = creep.pos.findClosestByPath(exitDir); // TODO cache
            creep.room.memory[memoryName] = JSON.stringify(exit);
        } else {
            exit = JSON.parse(creep.room.memory[memoryName]);
        }
        return exit;
    }

    /**
     * @typedef {Object} Roster
     */
    /**
     *
     * @param {Room|string} [room]
     * @param {Function} predicate
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
        if (pos.x < 1) {
            return LEFT;
        } else if (pos.x > 48) {
            return RIGHT;
        } else if (pos.y < 1) {
            return TOP;
        } else if (pos.y > 48) {
            return BOTTOM;
        }
        return false;
    }

    safeMoveTo(creep, destitnation) {
        let path = PathFinder.search(creep.pos, destitnation, {
            roomCallback: this.avoidCostMatrix(creep, creep.room.find(FIND_HOSTILE_CREEPS), 3)
        }).path;
        creep.moveTo(path[0]);
        return path;
    }
    healingCapacity(creep) {
        return (creep instanceof Creep) ? creep.getActiveBodyparts(HEAL)*10: 100 ;
    }


    avoidCostMatrix(creep, hostiles, range) {
        range = range || 1;
        return (roomName) => {
            new PathFinder.CostMatrix();
            if (roomName == creep.room.name) {
                let matrix = new PathFinder.CostMatrix();
                hostiles.forEach((c)=> {
                    new PathFinder.CostMatrix()
                    matrix.set(c.pos.x, c.pos.y, 255);
                    for (let r = 1; r <= range; r++) {
                        matrix.set(c.pos.x - r, c.pos.y - r, 10);
                        matrix.set(c.pos.x - r, c.pos.y, 10);
                        matrix.set(c.pos.x - r, c.pos.y + r, 10);
                        matrix.set(c.pos.x, c.pos.y - r, 10);
                        matrix.set(c.pos.x, c.pos.y + r, 10);
                        matrix.set(c.pos.x + r, c.pos.y - r, 10);
                        matrix.set(c.pos.x + r, c.pos.y, 10);
                        matrix.set(c.pos.x + r, c.pos.y + r, 10);
                    }
                });
                return matrix;
            } else {
                return false;
            }
        };
    }
}
module.exports = new Util();
