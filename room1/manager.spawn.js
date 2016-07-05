var _ = require('lodash');

const BODY_TEMPLATES = {
    1: {
        'harvester': {
            min: {WORK: 2, CARRY: 2, MOVE: 2},
            max: {WORK: 4, CARRY: 4, MOVE: 4}
        },
        'upgrader': {
            min: {WORK: 2, CARRY: 2, MOVE: 2},
            max: {WORK: 4, CARRY: 4, MOVE: 4}
        },
    },
    2: {
        'builder': {
            min: {WORK: 2, CARRY: 2, MOVE: 2},
            max: {WORK: 4, CARRY: 4, MOVE: 4}
        },
        'repair': {
            min: {WORK: 2, CARRY: 2, MOVE: 2},
            max: {WORK: 4, CARRY: 4, MOVE: 4}
        },
        'carry': {
            min: {CARRY: 6, MOVE: 6},
            max: {CARRY: 12, MOVE: 12}
        },
        'claim': {
            min: {CLAIM: 2, MOVE: 2},
            max: {CLAIM: 2, MOVE: 2}
        },
    }
};

/**
 * number of ticks the manager is allowed to advance existing requests
 * @type {number}
 */
const MAX_SHIFT_REQUESTS = 100;
/**
 * @property {RequestSpec|number} requireQueue sparse array , planned builds are inserted at their start tick, and the time of the start tick is inserted at end tick
 *
 */
class SpawnManager {
    constructor() {
        this.requireQueue = {};
        this.requestQueue = {};
        this.whenPossible = {};
    }

    spawnTime(body) {

        if (!body) return 0;
        else if (body.length)  return 3 * body.length;
        else if (body.MOVE) {
            return _.sum(body);
        }
    }

    /**
     * @typedef {Object} Memory
     * @property {string} role
     */
    /**
     *  normal priority
     *
     * @param {number} needByTick
     * @param {Memory} memory
     */
    request(memory, needByTick) {

    }

    /**
     * This MUST be done, and is prioritized over @requests or @whenPossible
     * @param {Room} room
     * @param {Memory} [memory]
     * @param {number} needByTick
     */
    require(room, memory, needByTick) {
        if (room && room.controller && room.controller.my && memory.role) {
            let request = _.transform(BODY_TEMPLATES[room.controller.level][memory.role], (times, bodySpec, k)=>times[k] = this.spawnTime(bodySpec));
            request.needby = needByTick;
            request.memory = memory;
            return this.insertInQueue(room, this.requireQueue, request);
        } else {
            console.log('spawnManager', room.name, 'require : invalid parameters', room, memory, needByTick);
        }

    }

    /**
     *
     * @param {Memory} memory
     */
    whenPossible(memory) {

    }

    /**
     *
     * @param {string}role
     * @return {number}
     */
    requiredCount(role) {

    }

    isRequired(role) {

    }

    run(room) {

    }

    shapeBody() {
        
    }


    /**
     * @typedef {Object} RequestSpec
     * @property {number} needby
     * @property {Object} memory
     * @property {number} min time for mininum body
     * @property {number} max time for maximum body
     * @property {number} start added when inserted in the queue
     * @property {number} end added when inserted in the queue
     *
     */
    /**
     * if successful, will update the request with start/end of the planned spawn
     * @param {Room} room
     * @param {(RequestSpec|number)[]} requireQueue
     * @param {RequestSpec} request
     */
    insertInQueue(room, requireQueue, request) {
        // check that another request won't be in progress at @needby
        // check that there is an open window (size [request.min,request.max]) before @needby
        let startNeededForMaxBody = request.needby - request.max-1;
        let startNeededForMinBody = request.needby - request.min-1;
        let buildEndTarget = request.needby-1;
        let conflict = false;
        for (let i = request.needby; i > request.needby - 600 && (!request.start) && i > Game.time; i--) {
            if ('number' === typeof requireQueue[i] && 'number' === typeof requireQueue[requireQueue[i]]) {
                console.log('ERROR !');
            }
            conflict = conflict || (requireQueue[i] && 'number' === typeof requireQueue[i] // hit the end of a previous order
                && this.backshift(requireQueue, requireQueue[requireQueue[i]], i - startNeededForMaxBody));
            if ('object' === typeof requireQueue[i]) {
                // hit the start of a previous request, we need to backup
                startNeededForMaxBody = i - request.max-1;
                startNeededForMinBody = i - request.min-1;
                buildEndTarget= i;
            }
            if (i == startNeededForMaxBody && !requireQueue[i]) {
                // found a slot for max body, stop
                request.start = i;
                request.end = buildEndTarget;
                if(!requireQueue[i]) requireQueue[i] = request; else console.log('error slot occupied ', i);
                if(!requireQueue[buildEndTarget]) requireQueue[buildEndTarget] = i; else console.log('error slot occupied ', i);
            }
        }
        return request;

    }

    /**
     *
     * @param {(RequestSpec|number)[]} requireQueue
     * @param {RequestSpec} request
     * @param {number} neededbackshift
     * @returns {boolean} true if successful
     */
    backshift(requireQueue, request, neededbackshift) {
        let startFrom = request.end;
        let conflict = false;
        for (let j = startFrom; j > startFrom- neededbackshift && j > Game.time && !conflict && ((!request.needby && (request.needby-MAX_SHIFT_REQUESTS>j+request.max))); j--) {
            conflict =conflict ||  (requireQueue[j] && !this.backshift(requireQueue, requireQueue[requireQueue[j]],neededbackshift- (startFrom-j+1))) ;
        }
        if (!conflict) {
            delete requireQueue[request.start];
            delete requireQueue[request.end];
            request.start = request.start - neededbackshift;
            request.end = request.end - neededbackshift;
            requireQueue[request.start] = request;
            requireQueue[request.end] = request.start;
            //
        }
        return !conflict;
    }

    /**
     * todo fallback on previous RCL specs if not found
     * @param {Room} room
     * @param {string} role
     * @returns {*}
     */
    bodySpec(room, role) {

        return BODY_TEMPLATES[room.controller.level][role];
    }
}

module.exports = SpawnManager;