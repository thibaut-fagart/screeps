var _ = require('lodash');
var PriorityQueue = require('./pqueue');
var Process = require('./process');
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
class SpawnManagerProcess extends Process {
    constructor(parent, spawn) {
        super('spawnmanager', parent);
        this.spawnid = spawn.id;
        this.pqueue = new PriorityQueue({comparator: (spec1, spec2)=>spec1.priority - spec2.priority, capacity: 50});
    }

    /**
     * @typedef {Object} Memory
     * @property {string} role
     */
    /**
     *  normal priority
     *
     * @param {string} owner processid of the requesting process
     * @param body
     * @param {Memory} memory
     * @param priority
     */
    request(owner, body, memory, priority) {
        let spec = {
            owner: owner,
            priority: priority,
            memory: memory,
        };
        if (body.length || (_.isString(body) && this.bodySpec(body))) {
            spec.body = body;
        } else {
            throw 'unexpected body' + JSON.stringify(body);
        }
        this.pqueue.add(spec);
    }

    /**
     * @return {StructureSpawn}
     */
    spawn() {
        return Game.getObjectById(this.spawnid);
    }

    run(processTable) {
        let spawn = this.spawn();
        if (!spawn.spawning) {
            let spec = this.pqueue.top;
            let body;
            if (spec.body.length) {
                body = spec.body;
            } else if (_.isString(spec.body)) {
                // lookup body templates
                let _body = this.bodySpec(spec.body);
                if (_body) {
                    body =this.shapeBody(_body);
                }
            }
            let creepName = spawn.createCreep(body, spec.name, spec.memory);
            if(_.isString(creepName)) {
                // todo notify request's owner
                let owner = processTable.get(spec.owner);
                this.pqueue.pop();
                console.log('notifying', owner.constructor.name, spec.owner, creepName);
            } else {
                spawn.log('error', owner.constructor.name, spec.owner, creepName);
                this.pqueue.pop();
            }
        }
    }

    shapeBody(perfectBody) {
        // adds the parts untill they can't be built
        let maxEnergy = this.spawn.room.energyAvailable;
        let cost = 0,  max = 0;
        for (var i = 0; i < perfectBody.length && cost < maxEnergy; i++) {
            var part = perfectBody[i];
            if ((cost +=this.BODY_COST[part]) <= maxEnergy) {
                max = i;
            }
        }

        let realBody = perfectBody.slice(0, max+1);
        let newbody = _.sortBy(realBody, (part)=>this.BODY_ORDER.indexOf(part));
        return newbody;

    }
    /**
     * todo fallback on previous RCL specs if not found
     * @param {Room} room
     * @param {string} role
     * @returns {*}
     */
    bodySpec(role) {
        return BODY_TEMPLATES[spawn.room.controller.level][role];
    }
}

module.exports = SpawnManagerProcess;