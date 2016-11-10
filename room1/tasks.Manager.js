var _ = require('lodash');
var util = require('./util');
Room.prototype.compileTasks = function () {
    let structures;
    let amOwner = (this.controller == null || this.controller.level == 0) ? false : this.controller.my;
    let taskManager = require('./tasks.Manager');
    let creepCarryCapacity = 1000; // todo scale with room level

    /* Worker-based tasks (upgrading controllers, building and maintaining structures) */
    if (amOwner) {
        if (this.controller.ticksToDowngrade < 3500) {
            taskManager.addTask(this.name,
                {
                    room: this.name,
                    type: 'work',
                    subtype: 'upgrade',
                    id: this.controller.id,
                    key: `work:upgrade-${this.controller.id}`,
                    timer: 20,
                    creeps: 15, // todo scale with energy in storage
                    priority: 1
                });
        } else {
            taskManager.addTask(this.name,
                {
                    room: this.name,
                    type: 'work',
                    subtype: 'upgrade',
                    id: this.controller.id,
                    key: `work:upgrade-${this.controller.id}`,
                    timer: 20,
                    creeps: 20, // todo scale with energy in storage
                    priority: 5
                });
        }
    }

    /*
     structures = __Colony.findByNeed_RepairMaintenance(this);
     for (let i in structures) {
     if (amOwner || structures[i].structureType == 'road' || structures[i].structureType == 'container') {
     taskManager.addTask(this.name,
     {
     room: this.name,
     type: 'work',
     subtype: 'repair',
     id: structures[i].id,
     pos: structures[i].pos,
     key: `work:repair-${structures[i].id}`,
     timer: 20,
     creeps: 2,
     priority: 6
     });
     }
     }

     structures = __Colony.findByNeed_RepairCritical(this);
     for (let i in structures) {
     if (amOwner || structures[i].structureType == 'road' || structures[i].structureType == 'container') {
     taskManager.addTask(this.name,
     {
     room: this.name,
     type: 'work',
     subtype: 'repair',
     id: structures[i].id,
     pos: structures[i].pos,
     key: `work:repair-${structures[i].id}`,
     timer: 20,
     creeps: 2,
     priority: 2
     });
     }
     }
     */

    structures = this.find(FIND_CONSTRUCTION_SITES, {
        filter: s => {
            return s.my;
        }
    });
    for (let i in structures) {
        taskManager.addTask(this.name,
            {
                room: this.name,
                type: 'work',
                subtype: 'build',
                id: structures[i].id,
                key: `work:build-${structures[i].id}`,
                timer: 30,
                creeps: 3, // todo scale with remaining cost
                priority: 3
            });
    }

    /* Carrier-based tasks & energy supply for workers) */
    let piles = this.find(FIND_DROPPED_ENERGY);
    for (let i in piles) {
        taskManager.addTask(this.name,
            {
                room: this.name,
                type: 'carry',
                subtype: 'pickup',
                resource: piles[i].resourceType == 'energy' ? 'energy' : 'mineral',
                id: piles[i].id,
                key: `carry:pickup-${piles[i].id}`,
                timer: 15,
                creeps: Math.ceil(piles[i].amount / creepCarryCapacity),
                priority: piles[i].resourceType == 'energy' ? 2 : 1,
            });
    }

    let sources = this.find(FIND_SOURCES, {
        filter: s => {
            return s.energy > 0;
        }
    });
    for (let i in sources) {
        let container = _.get(Memory, ['rooms', this.name, 'sources', sources[i].id, 'container']);
        container = (container == null) ? null : Game.getObjectById(container);
        if (container == null) {
            container = _.head(sources[i].pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => {
                    return s.structureType == 'container';
                }
            }));
            _.set(Memory, ['rooms', this.name, 'sources', sources[i].id, 'container'], container == null ? null : container.id);
        }

        let access_tiles = _.get(Memory, ['rooms', this.name, 'sources', sources[i].id, 'access_tiles']);
        if (access_tiles == null) {
            // todo take constructions into account (built walls?)
            access_tiles = this.glanceForAround(LOOK_TERRAIN, sources[i].pos, 1, true).filter(l=>l.terrain && l.terrain !== 'wall').length;
            _.set(Memory, ['rooms', this.name, 'sources', sources[i].id, 'access_tiles'], access_tiles);
        }

        taskManager.addTask(this.name,
            {
                room: this.name,
                type: 'mine',
                subtype: 'harvest',
                resource: 'energy',
                id: sources[i].id,
                key: `mine:harvest-${sources[i].id}`,
                timer: 60,
                creeps: container ? 1 : access_tiles,
                priority: 1
            });
    }

    let minerals = this.find(FIND_MINERALS, {
        filter: m => {
            return m.mineralAmount > 0;
        }
    });
    for (let i in minerals) {
        let look = minerals[i].pos.look();
        for (let l = 0; l < look.length; l++) {
            if (look[l].structure != null && look[l].structure.structureType == 'extractor') {
                let container = _.get(Memory, ['rooms', this.name, 'sources', minerals[i].id, 'container']);
                container = (container == null) ? null : Game.getObjectById(container);
                if (container == null) {
                    container = _.head(minerals[i].pos.findInRange(FIND_STRUCTURES, 1, {
                        filter: s => {
                            return s.structureType == 'container';
                        }
                    }));
                    _.set(Memory, ['rooms', this.name, 'sources', minerals[i].id, 'container'], container == null ? null : container.id);
                }

                let access_tiles = _.get(Memory, ['rooms', this.name, 'sources', minerals[i].id, 'access_tiles']);
                if (access_tiles == null) {
                    // todo take constructions into account (built walls?)
                    access_tiles = this.glanceForAround(LOOK_TERRAIN, minerals[i].pos, 1, true).filter(l=>l.terrain && l.terrain !== 'wall').length;
                    _.set(Memory, ['rooms', this.name, 'sources', minerals[i].id, 'access_tiles'], access_tiles);
                }

                taskManager.addTask(this.name,
                    {
                        room: this.name,
                        type: 'mine',
                        subtype: 'harvest',
                        resource: 'mineral',
                        id: minerals[i].id,
                        key: `mine:harvest-${minerals[i].id}`,
                        timer: 20,
                        creeps: container ? 1 : access_tiles,
                        priority: 2
                    });
            }
        }
    }

    let storages = this.find(FIND_STRUCTURES, {
        filter: s => {
            return (s.structureType == STRUCTURE_STORAGE && s.my)
                || (s.structureType == STRUCTURE_CONTAINER);
        }
    });
    for (let i in storages) {
        if (storages[i].store['energy'] > 0) {
            taskManager.addTask(this.name,
                {
                    room: this.name,
                    type: 'energy',
                    subtype: 'withdraw',
                    structure: storages[i].structureType,
                    resource: 'energy',
                    id: storages[i].id,
                    key: `energy:withdraw-energy-${storages[i].id}`,
                    timer: 10,
                    creeps: Math.ceil(storages[i].store['energy'] / creepCarryCapacity),
                    priority: 3
                });
        }
        if (_.sum(storages[i].store) < storages[i].storeCapacity) {
            let creepCount = Math.ceil(storages[i].storeCapacity - _.sum(storages[i].store)) / creepCarryCapacity;
            taskManager.addTask(this.name,
                {
                    room: this.name,
                    type: 'carry',
                    subtype: 'deposit',
                    structure: storages[i].structureType,
                    resource: 'energy',
                    id: storages[i].id,
                    key: `carry:deposit-energy-${storages[i].id}`,
                    timer: 20,
                    creeps: creepCount,
                    priority: (storages[i].structureType == 'storage' ? 8 : 9)
                });
            if (storages[i].structureType == 'storage') {
                // Storages receive all minerals... industry tasks work from storage!
                taskManager.addTask(this.name,
                    {
                        room: this.name,
                        type: 'carry',
                        subtype: 'deposit',
                        structure: storages[i].structureType,
                        resource: 'mineral',
                        id: storages[i].id,
                        key: `carry:deposit-mineral-${storages[i].id}`,
                        timer: 20,
                        creeps: creepCount,
                        priority: 9
                    });
            } else if (storages[i].structureType == 'container') {
                // Empty stray minerals from containers! type: 'energy' for carriers (not an industry task!)
                _.each(_.filter(Object.keys(storages[i].store), res => {
                    return res != 'energy';
                }), res => {
                    taskManager.addTask(this.name,
                        {
                            room: this.name,
                            type: 'energy',
                            subtype: 'withdraw',
                            structure: storages[i].structureType,
                            resource: res,
                            id: storages[i].id,
                            key: `energy:withdraw-energy-${storages[i].id}`,
                            timer: 10,
                            creeps: Math.ceil(storages[i].store[res] / creepCarryCapacity),
                            priority: 2
                        });
                });
            }
        }
    }

    if (amOwner) {
        if (Memory['rooms'][this.name]['links'] != null) {
            let links = Memory['rooms'][this.name]['links'];
            for (let l in links) {
                let link = Game.getObjectById(links[l]['id']);
                if (links[l]['role'] == 'send' && link != null && link.energy < link.energyCapacity * 0.9) {
                    taskManager.addTask(this.name,
                        {
                            room: this.name,
                            type: 'carry',
                            subtype: 'deposit',
                            structure: 'link',
                            resource: 'energy',
                            id: links[l]['id'],
                            key: `carry:deposit-${links[l]['id']}`,
                            timer: 20,
                            creeps: 1,
                            priority: 3
                        });
                } else if (links[l]['role'] == 'receive' && link != null && link.energy > 0) {
                    taskManager.addTask(this.name,
                        {
                            room: this.name,
                            type: 'energy',
                            subtype: 'withdraw',
                            structure: 'link',
                            resource: 'energy',
                            id: links[l]['id'],
                            key: `energy:withdraw-${links[l]['id']}`,
                            timer: 5,
                            creeps: 2,
                            priority: 3
                        });
                }
            }
        }

        let towers = this.find(FIND_MY_STRUCTURES, {
            filter: s => {
                return s.structureType == STRUCTURE_TOWER;
            }
        });
        for (let i in towers) {
            if (towers[i].energy < towers[i].energyCapacity * 0.4) {
                taskManager.addTask(this.name,
                    {
                        room: this.name,
                        type: 'carry',
                        subtype: 'deposit',
                        structure: 'tower',
                        resource: 'energy',
                        id: towers[i].id,
                        key: `carry:deposit-${towers[i].id}`,
                        timer: 30,
                        creeps: 1,
                        priority: 1
                    });
            } else if (towers[i].energy < towers[i].energyCapacity) {
                taskManager.addTask(this.name,
                    {
                        room: this.name,
                        type: 'carry',
                        subtype: 'deposit',
                        structure: 'tower',
                        resource: 'energy',
                        id: towers[i].id,
                        key: `carry:deposit-${towers[i].id}`,
                        timer: 30,
                        creeps: 1,
                        priority: 5
                    });
            }
        }

        structures = this.find(FIND_MY_STRUCTURES, {
            filter: s => {
                return (s.structureType == STRUCTURE_SPAWN && s.energy < s.energyCapacity * 0.85)
                    || (s.structureType == STRUCTURE_EXTENSION && s.energy < s.energyCapacity);
            }
        });
        for (let i in structures) {
            if (structures.energyCapacity) {
                taskManager.addTask(this.name,
                    {
                        room: this.name,
                        type: 'carry',
                        subtype: 'deposit',
                        structure: structures[i].structureType,
                        resource: 'energy',
                        id: structures[i].id,
                        key: `carry:deposit-${structures[i].id}`,
                        timer: 20,
                        creeps: 1,
                        priority: 2
                    });
            }
        }
    }

};
Room.prototype.computeTasks = function () {
    'use strict';
    this.memory.tasks = {};
    let amOwner = this.controller && this.controller.level && this.controller.my;
    let rmName = this.name;
    this.log('computing tasks');
    let taskManager = require('./tasks.Manager');
    /* Worker-based tasks (upgrading controllers, building and maintaining structures) */
    let courrierCapacity = amOwner?100 + this.controller.level * 100: 1000;
    if(this.memory.tasks) {
        _.keys(this.memory.tasks).forEach(k=> {
            if (this.memory.tasks[k].id && !Game.getObjectById(this.memory.tasks[k].id)) {
                this.log(`gc task ${k}`);
                delete this.memory.tasks[k];
            }
        });
    }
    /* Carrier-based tasks & energy supply for workers) */
    this.find(FIND_DROPPED_RESOURCES).forEach(pile=>
        taskManager.addTask(rmName,
            {
                room: rmName,
                type: 'carry',
                subtype: 'pickup',
                resource: pile.resourceType == 'energy' ? 'energy' : 'mineral',
                id: pile.id,
                pos: pile.pos,
                key: `carry:pickup-${pile.id}`,
                timer: 15,
                amount:pile.amount,
                creeps: Math.ceil(pile.amount / courrierCapacity),
                priority: pile.resourceType == 'energy' ? 1 : 2 + (Math.floor(pile.amount / 1000)),
            })
    );

    let containers = this.structures[STRUCTURE_CONTAINER];
    containers = this.storage?containers.concat([this.storage]):containers;
    containers = this.terminal?containers.concat([this.terminal]):containers;

    containers
        .forEach(storage=> {
            if (storage.store['energy'] > 0) {
                taskManager.addTask(rmName,
                    {
                        room: rmName,
                        type: 'carry',
                        subtype: 'withdraw',
                        structure: storage.structureType,
                        resource: 'energy',
                        id: storage.id,
                        pos: storage.pos,
                        key: `carry:withdraw-energy-${storage.id}`,
                        timer: 10,
                        amount:storage.store.energy,
                        creeps: Math.ceil(storage.store['energy'] / courrierCapacity),
                        priority: 3
                    });
            }
            let usedStore = _.sum(storage.store);
            if (usedStore < storage.storeCapacity) {
                taskManager.addTask(rmName,
                    {
                        this: rmName,
                        type: 'carry',
                        subtype: 'deposit',
                        structure: storage.structureType,
                        resource: 'energy',
                        id: storage.id,
                        pos: storage.pos,
                        key: `carry:deposit-energy-${storage.id}`,
                        timer: 20,
                        amount:storage.storeCapacity - _.sum(storage.store),
                        creeps: 10,
                        priority: (storage.structureType == 'storage' ? 8 : 9)
                    });
                if (storage.structureType == 'storage') {
                    // Storages receive all minerals... industry tasks work from storage!
                    taskManager.addTask(rmName,
                        {
                            room: rmName,
                            type: 'carry',
                            subtype: 'deposit',
                            structure: storage.structureType,
                            resource: 'mineral',
                            id: storage.id,
                            pos: storage.pos,
                            key: `carry:deposit-mineral-${storage.id}`,
                            timer: 20,
                            amount:storage.storeCapacity - _.sum(storage.store),
                            creeps: 10,
                            priority: 9
                        });
                } else if (storage.structureType == 'container') {
                    // Empty stray minerals from containers! type: "energy" for carriers (not an industry task!)
                    _.each(_.filter(Object.keys(storage.store), res => {
                        return res != 'energy';
                    }), res => {
                        taskManager.addTask(rmName,
                            {
                                room: rmName,
                                type: 'carry',
                                subtype: 'withdraw',
                                structure: storage.structureType,
                                resource: 'mineral',
                                id: storage.id,
                                pos: storage.pos,
                                key: `carry:withdraw-mineral-${storage.id}`,
                                timer: 10,
                                amount:_.sum(storage.store)-(storage.store.energy||0),
                                creeps: Math.ceil(storage.store[res] / courrierCapacity),
                                priority: 2
                            });
                    });
                }
            }

        });

    if (amOwner) {
// todo LINKS
        this.structures[STRUCTURE_TOWER].forEach(tower => {
            if (tower.energy < tower.energyCapacity) {
                taskManager.addTask(rmName,
                    {
                        room: rmName,
                        type: 'carry',
                        subtype: 'deposit',
                        structure: 'tower',
                        resource: 'energy',
                        id: tower.id,
                        pos: tower.pos,
                        key: `carry:deposit-${tower.id}`,
                        timer: 30,
                        amount:tower.energyCapacity-tower.energy,
                        creeps: 1,
                        priority: tower.energy < tower.energyCapacity * 0.4?1:5
                    });
            }

        });

        let spawnExtRefiller = (priority)=>((structure) => {
            if (structure.energy < structure.energyCapacity) {
                taskManager.addTask(rmName,
                    {
                        room: rmName,
                        type: 'carry',
                        subtype: 'deposit',
                        structure: structure.structureType,
                        resource: 'energy',
                        id: structure.id,
                        pos: structure.pos,
                        key: `carry:deposit-${structure.id}`,
                        timer: 20,
                        amount:structure.energyCapacity-structure.energy,
                        creeps: 1,
                        priority: priority
                    });
            }
        });
        this.structures[STRUCTURE_SPAWN].forEach(spawnExtRefiller(2));
        // this.structures[STRUCTURE_SPAWN].forEach(spawnExtRefiller(10));
        this.structures[STRUCTURE_EXTENSION].forEach(spawnExtRefiller(2));
    }

};

module.exports = {
    addTask: function (rmName, incTask) {
        /* Task format:
         type:       combat | work | mine | carry | energy | industry | wait
         subtype:    pickup | withdraw | deposit | harvest | upgrade | repair | dismantle | attack | defend | heal | wait
         priority:   on a scale of 1-10; only competes with tasks of same type
         structure:  link | storage
         resource:   energy | mineral
         amount:		#
         id:         target gameobject id
         pos:        room position
         timer:      run for x ticks
         goal:       e.g. hp goal for repairing, amount to deposit, etc.
         creeps:     maximum # of creeps to run this task
         */
        /*
         runningTasks records the reserved amount by current creeps
         */
        if (incTask.key == null) {
            console.log(`<font color=\'#FF0000'>[Error]</font> Task missing key: ${incTask.room} ${incTask.type} ${incTask.subtype}`);
        }

        Memory.rooms[rmName].tasks_running = Memory.rooms[rmName].tasks_running || {};
        Memory.rooms[rmName].tasks = Memory.rooms[rmName].tasks || {};
        if (Memory.rooms[rmName].tasks_running && Memory.rooms[rmName].tasks_running[incTask.key]) {
            incTask.creeps = Math.max(0, incTask.creeps - Object.keys(Memory.rooms[rmName].tasks_running[incTask.key]).length);
            incTask.amount = Math.max(0, incTask.creeps - Object.keys(Memory.rooms[rmName].tasks_running[incTask.key]).length);
        }
        Memory.rooms[rmName].tasks[incTask.key] = incTask;
    },
    giveTask: function (creep, task) {

        task.room = task.room || creep.room.name;
        if (task.key) {
            creep.memory.task = _.cloneDeep(task);
            _.set(Memory.rooms, [task.room, 'tasks_running', task.key, creep.name], true);
        } else {
            task.key = this.randomName();
            creep.memory.task = task;
        }


        if (_.isNumber(task.creeps)) {
            task.creeps -= 1;
        }

    },
    extendTask: function (creep) {
        'use strict';
        let task = creep.memory.task;

        debugger;
        if (task == null) {
            return false;
        } else if (Memory.rooms[task.room].tasks[task.key] && task.id && Game.getObjectById(task.id)) {
            creep.log(`extending task ${creep.memory.task}`);
            creep.memory.task.timer = Memory.rooms[task.room].tasks[task.key].timer;
            return true;
        } else {
            creep.log(`NOT extending task ${creep.memory.task}`);
            return false;
        }
    },
    returnTask: function (creep) {
        creep.log(`returning task ${creep.memory.task}`);
        let task = creep.memory.task;

        if (task == null)
            return;

        if (Memory.rooms[task.room].tasks_running != null && Memory.rooms[task.room].tasks_running[task.key])
            delete Memory.rooms[task.room].tasks_running[task.key][creep.name];
        task.creeps += 1;
        delete creep.memory.task;
    },
    finishedTask: function (creep) {
        creep.log(`finished task ${creep.memory.task}`);
        let task = creep.memory.task;
        if (_.has(Memory.rooms, [task.room, 'tasks_running', task.key])) {
            delete Memory.rooms[task.room].tasks_running[task.key][creep.name];
        }
        delete creep.memory.task;
    },
    assignTask: function (creep, isRefueling) {
        if (creep.memory.task != null && Object.keys(creep.memory.task).length > 0) {
            return;
        }

        // Assign role tasks
        switch (creep.memory.role2) {
            default:
                return;

            case 'multirole':
            case 'worker':
                this.assignTask_Work(creep, isRefueling);
                break;

            case 'courier':
                this.assignTask_Industry(creep, isRefueling);
                break;

            case 'miner':
            case 'burrower':
            case 'carrier':
                this.assignTask_Mine(creep, isRefueling);
                break;

            case 'extractor':
                this.assignTask_Extract(creep, isRefueling);
                break;
        }
    },
    assignTask_Mine: function (creep, isRefueling) {
        let task;

        if (isRefueling) {
            /*
             if (creep.room.name != creep.memory.room) {
             let _Creep = require('util.creep');
             _Creep.moveToRoom(creep, creep.memory.room, isRefueling);
             return;
             }
             */

            if (creep.memory.role == 'burrower') {
                task = _.head(_.sortBy(_.filter(creep.room.memory.tasks,
                    t => t.type == 'mine' && t.resource == 'energy' && (t.creeps == null || t.creeps > 0)),
                    t => creep.pos.getRangeTo(t.pos.x, t.pos.y)));
                if (task != null) {
                    this.giveTask(creep, task);
                    return;
                }
            } else if (creep.memory.role == 'miner' || creep.memory.role == 'carrier') {
                task = _.head(_.sortBy(_.sortBy(_.filter(creep.room.memory.tasks,
                    t => (t.subtype == 'pickup' || (t.type == 'energy' && t.structure != 'link'))
                    && (t.creeps == null || t.creeps > 0)),
                    t => creep.pos.getRangeTo(t.pos.x, t.pos.y)),
                    'priority'));
                if (task != null) {
                    this.giveTask(creep, task);
                    return;
                }

                if (creep.getActiveBodyparts('work') > 0) {
                    task = _.head(_.sortBy(_.filter(creep.room.memory.tasks,
                        t => t.type == 'mine' && t.resource == 'energy' && (t.creeps == null || t.creeps > 0)),
                        t => creep.pos.getRangeTo(t.pos.x, t.pos.y)));
                    if (task != null) {
                        this.giveTask(creep, task);
                        return;
                    }
                }

                if (creep.memory.task == null) {
                    // If there is no energy to get... deliver or wait.
                    if (_.sum(creep.carry) > creep.carryCapacity * 0.85) {
                        creep.memory.state = 'unload';
                        return;
                    } else {
                        this.giveTask(creep, {type: 'wait', subtype: 'wait', timer: 5});
                        return;
                    }
                }
            }
        } else {
            /*
             if (creep.room.name != creep.memory.colony) {
             let _Creep = require('util.creep');
             _Creep.moveToRoom(creep, creep.memory.colony, isRefueling);
             return;
             }
             */

            if (_.get(creep, ['carry', 'energy'], 0) > 0) {
                task = _.head(_.sortBy(_.sortBy(_.filter(creep.room.memory.tasks,
                    t => t.type == 'carry' && t.subtype == 'deposit' && t.resource == 'energy' && (t.creeps == null || t.creeps > 0)),
                    t => creep.pos.getRangeTo(t.pos.x, t.pos.y)),
                    'priority'));
            } else if (_.sum(creep.carry) > 0 && _.get(creep, ['carry', 'energy'], 0) == 0) {
                task = _.head(_.sortBy(_.sortBy(_.filter(creep.room.memory.tasks,
                    t => t.type == 'carry' && t.subtype == 'deposit' && t.resource == 'mineral' && (t.creeps == null || t.creeps > 0)),
                    t => creep.pos.getRangeTo(t.pos.x, t.pos.y)),
                    'priority'));
            }
            if (task != null) {
                this.giveTask(creep, task);
                return;
            }
        }
    },
    assignTask_Industry: function (creep, isRefueling) {
        let task;
        let creepRoomTasks = _.filter(Memory.rooms[creep.room.name].tasks, t=>t.creeps == null || t.creeps > 0);
        if (isRefueling) {
            let needed = creep.carryCapacity - _.sum(creep.carry);
            let sources = _.filter(creepRoomTasks,
                t => (t.type == 'carry' || t.type == 'industry') && (t.subtype == 'withdraw' || t.subtype === 'pickup'));
            let fullEnough = sources.filter(s=>s.amount >= needed);
            if (fullEnough.length > 0) {
                task = _.head(_.sortBy(_.sortBy(fullEnough,
                    t => creep.pos.getRangeTo(t.pos.x, t.pos.y)),
                    'priority'));
            } else {
                task = _.head(_.sortBy(_.sortBy(sources,
                    t => creep.pos.getRangeTo(t.pos.x, t.pos.y)),
                    'priority'));
            }
            if (task != null) {
                this.giveTask(creep, task);
            } else {    // If no tasks, then wait
                this.giveTask(creep, {type: 'wait', subtype: 'wait', timer: 10});
            }
        } else {
            let resources = _.sortBy(Object.keys(creep.carry), (c) => {
                return -creep.carry[c];
            });
            let resource = Object.keys(resources).length > 0 ? resources[0] : 'energy';
            task = _.head(_.sortBy(_.sortBy(_.filter(creepRoomTasks,
                t => (t.type == 'carry' || t.type == 'industry') && t.subtype == 'deposit' && t.resource == resource),// todo changed from type === industry
                t => creep.pos.getRangeTo(t.pos.x, t.pos.y)),
                'priority'));
            if (task != null) {
                this.giveTask(creep, task);
                return;
            }

            // If stuck without a task... drop off energy/minerals in storage... or wait...
            if (Object.keys(creep.carry).includes('energy')) {
                task = _.head(_.sortBy(_.filter(creepRoomTasks,
                    t => t.type == 'carry' && t.subtype == 'deposit' && t.resource == 'energy'),
                    t => creep.pos.getRangeTo(t.pos.x, t.pos.y)));
                if (task != null) {
                    this.giveTask(creep, task);
                    return;
                }
            } else if (Object.keys(creep.carry).length > 0) {
                task = _.head(_.sortBy(_.filter(creepRoomTasks,
                    t => t.type == 'carry' && t.subtype == 'deposit' && t.resource == 'mineral'),
                    t => creep.pos.getRangeTo(t.pos.x, t.pos.y)));
                if (task != null) {
                    this.giveTask(creep, task);
                    return;
                }
            } else {
                debugger;
                this.giveTask(creep, {type: 'wait', subtype: 'wait', timer: 10});
                return;
            }
        }
    },
    randomName: function () {
        return 'xxxxxx-xxxxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
};
require('./profiler').registerObject(module.exports, 'TaskManager');
