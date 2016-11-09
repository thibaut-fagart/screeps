var _ = require('lodash');
require('./game.prototypes.room');
require('./game.prototypes.Source');
require('./game.prototypes.creep');
require('./game.prototypes.lab');
var util = require('./util');
var handlers = require('./base.handlers');
var roleSpawn = require('./role.spawn');
var debugPerfs = false;
var profiler = require('./profiler');
if (!Game.rooms['sim'] && !Memory.disableProfiler) profiler.enable();


// var RoomManager = require('./manager.room'), roomManager = new RoomManager(); // todo manager
// This line monkey patches the global prototypes.
// if (Game.cpu.bucket> 500)
function debugCreep(name) {
    'use strict';
    Memory.debug = Memory.debug || {};
    let debugCreeps = Memory.debug.creeps || [];
    return (!debugCreeps.length || (debugCreeps.indexOf(name) >= 0));
}
function debugRole(name) {
    'use strict';
    Memory.debug = Memory.debug || {};
    let debugRole = Memory.debug.roles || [];
    return (!debugRole.length || (debugRole.indexOf(name) >= 0));
}
function debugRoom(name) {
    'use strict';
    Memory.debug = Memory.debug || {};
    let debugRooms = Memory.debug.rooms || [];
    return (!debugRooms.length || (debugRooms.indexOf(name) >= 0));
}
Memory.debug = Memory.debug || {};
Creep.prototype.log = function () {
    if (debugRole(this.memory.role)
        && debugRoom(this.room.name)
        && debugCreep(this.name)
    ) {
        console.log([Game.time, this.name, this.pos, this.memory.role].concat(Array.prototype.slice.call(arguments)));
    }
};
Spawn.prototype.log = function () {
    if (debugRole(this.memory.role)
        && debugRoom(this.room.name)
        && debugCreep(this.name)
    ) {
        console.log([Game.time, this.name, this.room.name].concat(Array.prototype.slice.call(arguments)));
    }
};
Room.prototype.log = function () {
    if (debugRoom(this.name)) {
        console.log([Game.time, this.name, this.controller ? this.controller.level : 'neutral'].concat(Array.prototype.slice.call(arguments)));
    }
};
Structure.prototype.log = function () {
    console.log([Game.time, this.structureType, this.room.name, this.id].concat(Array.prototype.slice.call(arguments)));
};
Object.defineProperty(Structure.prototype, 'memory',
    {
        get: function () {
            'use strict';
            this.room.memory.structures = this.room.memory.structures || {};
            let mem = this.room.memory.structures;
            mem[this.id] = mem[this.id] || {};
            return mem[this.id];
        },
        set: function (value) {
            let mem = this.room.memory.structures = this.room.memory.structures || {};
            mem[this.id] = value;
        },
        configurable: true
    });

Object.defineProperty(StructureLink.prototype, 'operator',
    {
        get: function () {
            // this.log('getOperator', this.memory.operator);
            let opId = this.memory.operator;
            if (opId) {
                let creep = Game.getObjectById(opId);
                if (!creep) {
                    delete this.memory.operator;
                }
                return creep;
            }
            return undefined;
        },
        set: function (value) {
            // this.log('setOperator', value);
            this.memory.operator = value && value.id;
        },
        configurable: true
    });
let pathFinderCost = {time: Game.time, cost: 0, count: 0};
function wrapPathFinder() {
    'use strict';
    let basePathFinderSearch = PathFinder.search;
    PathFinder.search = function () {
        'use strict';
        if (pathFinderCost.time !== Game.time) {
            pathFinderCost = {time: Game.time, cost: 0, count: 0};
        }
        let start = Game.cpu.getUsed();
        // console.log('called PathFinder.search', PathFinder.callCount);
        let result = basePathFinderSearch.apply(this, arguments);
        pathFinderCost.cost = pathFinderCost.cost + (Game.cpu.getUsed() - start);
        pathFinderCost.count = pathFinderCost.count + 1;
        return result;
    };
}
let frequencies = {};
function updateFrequencies(frequencies) {
    frequencies['computeTasks'] = 10;
    frequencies['runSpawn'] = 11 - Math.ceil(Game.cpu.bucket / 1000);
    frequencies['buildStructures'] = 10 * (11 - Math.ceil(Game.cpu.bucket / 1000));
    frequencies['operateLinks'] = 11 - Math.ceil(Game.cpu.bucket / 1000);
    frequencies['labs'] = Math.floor(Math.max(10, Math.min(100, 110 - Game.cpu.bucket / 50)));
    frequencies['import'] = 1500;
    frequencies['updateProductions'] = frequencies['labs'];
    frequencies['handleStreamingOrders'] = 100;
    return frequencies;
}

let roomTasks = {
    computeTasks: (r)=> {
        if (!Game.rooms.sim) return;
        const frequency = frequencies['computeTasks'];
        if (r.hash % frequency === Game.time % frequency) {
            r.computeTasks();
        }
    },
    runSpawn: (r)=> {
        'use strict';
        let freq = frequencies['runSpawn'];
        if (r.hash % freq === Game.time % freq) {
            try {
                if (r.controller && r.controller.my && r.controller.level > 0) {
                    roleSpawn.run(r);
                }
            } catch (e) {
                Game.notify(e.stack);
                console.log(e.stack);
            }
        }
    },
    operateTowers: (r)=> r.operateTowers(),
    buildStructures: (r)=> {
        let freq = frequencies['buildStructures'];
        if (r.hash % freq === Game.time % freq) {
            r.buildStructures();
        }

    },
    operateLinks: (r)=> {
        let freq = frequencies['operateLinks'];
        if (r.hash % freq === Game.time % freq) {
            try {
                r.operateLinks();
            } catch (e) {
                Game.notify(e.stack);
                console.log(e.stack);
            }
        }
    },
    harvestContainers: (r)=>(r.memory.harvestContainers = r.memory.harvestContainers || []),
    updateLocks: (r)=> r.updateLocks(),
    gc: (r)=> {
        if (0 == Game.time % 100) {
            r.gc();
        }
    },
    assessThreat: (r)=> {
        if (Game.cpu.bucket > 200) r.assessThreat();
    },
    labs: (r)=> {
        let freq = frequencies['labs'];
        if (r.memory.labs && (r.hash % freq === Game.time % freq)) {
            r.operateLabs();
        }
    },
    import: (r)=> {
        'use strict';
        const frequency = frequencies['import'];
        if (r.controller && r.controller.my && r.controller.level >= 6 && r.hash % frequency === Game.time % frequency) {
            r.updateImportExports();
            r.importMinerals();
        }
    },
    updateProductions: (r)=> {
        'use strict';
        let freq = frequencies['updateProductions'];
        if (r.hash % freq === Game.time % freq) {
            Memory.stats.ledger = Memory.stats.ledger || {time: 0};
            if (Memory.stats.ledger.time < Game.time - 500) {
                let globalLedger = require('./reports').globalLedger();
                Memory.stats.ledger.v = globalLedger;
                Memory.stats.ledger.time = Game.time;
                _.keys(globalLedger).forEach(key=> {
                    if (globalLedger[key].goal > 0) {
                        globalLedger[key].ratio = globalLedger[key].amount / globalLedger[key].goal
                    }
                });
            }
            const ledger = Memory.stats.ledger.v;
            let missing = _.keys(ledger).filter(min=>ledger[min].amount < ledger[min].goal);
            _.sortBy(missing, min => ledger[min].amount / ledger[min].goal);
            Memory.stats.ledger.needs = missing;
            let reactions = require('./role.lab_operator').reactions;
            let produceable = Memory.stats.ledger.needs.filter(min=> {
                let ingredients = reactions[min];
                return ingredients && ingredients.reduce((allAvailable, i)=> allAvailable && (_.get(ledger, [i, 'amount'], 0) > 2000), true);
            });
            Memory.stats.ledger.produceable = _.sortBy(produceable, min=>_.get(ledger.v, [min, 'amount'], 0) / _.get(ledger.v, [min, 'goal'], 0));
        }

    },
    observe: (r)=> {
        if (Game.cpu.bucket > 5000) {
            r.runObserver();
        }
    },

};

function handleStreamingOrders() {
    'use strict';
    let maxAffordable = (room, toRoomName, isEnergy)=> {
        let distance = Game.map.getRoomLinearDistance(room.name, toRoomName, true);
        let number = Math.log((distance + 9) * 0.1) + 0.1;
        let amount = (room.terminal.store.energy || 0);

        if (isEnergy) {
            return {amount: Math.floor((amount / (1 + number))), cost: Math.ceil(amount * (number))};
        } else {
            return {amount: Math.ceil(amount / number), cost: amount};
        }

    };
    if (Memory.streamingOrders) {
        Memory.streamingOrders.forEach(order=> {
            let from = Game.rooms[order.from];
            if (undefined === order.amount) {
                order.amount = order.initialAmount;
            }

            if (from && from.terminal && order.to && order.what && (order.amount || 0) > 0) {
                if (_.get(Game.rooms, [order.to, 'controller', 'my'], false) && !_.get(Game.rooms, [order.to, 'terminal'], false)) {
                    // terminal not built
                    return;
                }
                let available = _.get(from.terminal, ['store', order.what], 0);

                const toRoom = Game.rooms[order.to];
                let freeSpace = (toRoom && toRoom.terminal) ? toRoom.terminal.storeCapacity - _.sum(toRoom.terminal.store) : 10000;
                let howMuch = Math.min(maxAffordable(from, order.to, order.what === RESOURCE_ENERGY).amount, order.amount, available, freeSpace, (order.step || Infinity));
                if (howMuch > 100) {
                    let result = from.terminal.send(order.what, howMuch, order.to);
                    from.log(`streaming ${howMuch} ${order.what} to ${order.to}`);
                    // Game.notify(`streaming ${howMuch} ${order.what} to ${order.to}, ${JSON.stringify(order)}`);
                    order.transfers = order.transfers || [];
                    order.transfers.push({time: Game.time, amount: howMuch, result: result});
                    if (result === OK) {
                        order.amount = order.amount - howMuch;
                        if (order.amount < 100) {
                            Game.notify(`completed streaming order ${JSON.stringify(order)}`);
                        }
                    }
                }
            } else if (from && from.terminal && order.deal && (order.amount || 0) > 0) {
                let deal = Game.market.getOrderById(order.deal);
                if (!deal) return;
                if (deal.type === 'buy') {
                    let available = _.get(from.terminal, ['store', deal.resourceType], 0);
                    if (deal.remainingAmount > 0) {
                        let howMuch = Math.min(maxAffordable(from, deal.roomName, deal.resourceType === RESOURCE_ENERGY).amount, order.amount, available, (order.step || Infinity));
                        if (howMuch > 100) {
                            let result = Game.market.deal(order.deal, howMuch, order.from);
                            order.transfers = order.transfers || [];
                            order.transfers.push({time: Game.time, amount: howMuch, result: result});
                            // Game.notify(`streaming ${howMuch} ${order.what} to ${order.to}, ${JSON.stringify(order)}`);
                            if (result === OK) {
                                from.log(`sold ${howMuch} ${deal.resourceType}`);
                                order.amount = order.amount - howMuch;
                                if (order.amount < 100) {
                                    Game.notify(`completed dealing order ${JSON.stringify(order)}`);
                                }
                            }
                        }

                    }
                } else if (deal.type === 'sell') {
                    let available = Game.market.credits / deal.price;
                    from.log('credits limit => ', available);
                    if (deal.remainingAmount > 0) {
                        let howMuch = Math.min(maxAffordable(from, deal.roomName, deal.resourceType === RESOURCE_ENERGY).amount, order.amount, available, (order.step || Infinity));
                        from.log(`howMuch(${maxAffordable(from, deal.roomName, deal.resourceType === RESOURCE_ENERGY).amount},${order.amount},${available},${(order.step || Infinity)}) => `, howMuch);
                        if (howMuch > 100) {
                            let result = Game.market.deal(order.deal, howMuch, order.from);
                            order.transfers = order.transfers || [];
                            order.transfers.push({time: Game.time, amount: howMuch, result: result});
                            // Game.notify(`streaming ${howMuch} ${order.what} to ${order.to}, ${JSON.stringify(order)}`);
                            if (result === OK) {
                                from.log(`bought ${howMuch} ${deal.resourceType}`);
                                order.amount = order.amount - howMuch;
                                if (order.amount < 100) {
                                    Game.notify(`completed dealing order ${JSON.stringify(order)}`);
                                }
                            }
                        }

                    }

                }
            }
        });
        let sellDeals = ['581113e3cf85704a295d7c0a', '5814c098da6094320ab7a229', '5812445ebf5da5a116930be1', '582212f4d961f798201823f6'];
        let buyDeals = ['58119c4a8cc4b9d24c43c373', '5821d2f2d961f79820f7b965'];
        sellDeals.forEach(dealId => {
            let sellDeal = Game.market.orders[dealId];
            if (sellDeal && sellDeal.remainingAmount < 100) {
                Game.market.extendOrder(sellDeal, 2000);
            }
        });
        let homeroom = 'W55S43';
        let energyPrice = _.max(Game.market.getAllOrders(o=>o.type === 'buy' && o.resourceType === RESOURCE_ENERGY), o=>o.price).price;
        let closestEnergyDeal = _.min(Game.market.getAllOrders(o=>o.type === 'buy' && o.resourceType === RESOURCE_ENERGY && o.price === energyPrice), o=>Game.market.calcTransactionCost(100, homeroom, o.roomName));
        let energyPriceWithTransport = 100 * closestEnergyDeal.price / (Game.market.calcTransactionCost(100, homeroom, closestEnergyDeal.roomName) + 100);
        if (Game.market.credits > 50000) {
            buyDeals.forEach(dealId=> {
                let deal = Game.market.orders[dealId];
                if (deal && deal.remainingAmount < 100 && (Game.rooms[deal.roomName].currentLedger[deal.resourceType] || 0) < 10000) {
                    let maxPrice = _.max(Game.market.getAllOrders((o)=>o.type === 'buy' && o.resourceType === deal.resourceType && o.id !== deal.id), o=>o.price).price;
                    if (maxPrice < deal.price) {
                        let newPrice = (maxPrice + 0.01);
                        Game.notify(`aligning price for ${deal.resourceType} ${deal.price}=>${newPrice}`);
                        Game.market.changeOrderPrice(deal.id, newPrice);
                    }
                    let extendQty = 5000;
                    Game.notify(`extending ${deal.type}:${deal.resourceType} by ${extendQty}`);
                    Game.market.extendOrder(dealId, Math.min((0.2 * Game.market.credits) / deal.price, extendQty));
                }
            });
            let buy = (roomName, resource, maxPrice) => {
                maxPrice = maxPrice || 1;
                if (Game.market.credits > 50000 && _.get(Game.rooms, [roomName, 'terminal', 'store', resource], 0) < 2000) {
                    let sellOrders = Game.market.getAllOrders(o=>o.type === 'sell' && o.resourceType === resource && o.price < maxPrice);
                    _.sortBy(sellOrders, o=>o.price + energyPriceWithTransport * Game.market.calcTransactionCost(100, roomName, o.roomName) / 100);
                    let deal = _.head(sellOrders);
                    if (deal) {
                        let qty = Math.min(5000, deal.remainingAmount);
                        let ret = Game.market.deal(deal.id, qty, roomName);
                        Game.notify(`buying ${qty} ${resource} in ${roomName} at ${deal.price} from ${deal.roomName}: ${ret}`);
                    }
                }
            };
            buy('W52S45', 'O', 0.5);
            buy('W53S43', 'H', 0.5);
            // buy('W52S37', 'X', 1);
        }
        // Memory.streamingOrders = Memory.streamingOrders.filter(order=>order.amount >= 100);
    }
}
function innerLoop() {
    let updateStats = true;
    let messages = [], skipped = [];
    wrapPathFinder();
    Memory.stats.deaths = 0;
    let globalStart = Game.cpu.getUsed();
    let oldSeenTick = Game.time || (Memory.counters && Memory.counters.seenTick);
    Memory.counters = {tick: Game.time, seenTick: oldSeenTick + 1};
    Memory.stats.room = Memory.stats.room || {};
    if (0 == Game.time % 100) {
        _.keys(Memory.creeps).forEach((name)=> {
            if (!Game.creeps[name]) {
                let creepMem = Memory.creeps[name];
                if (creepMem.role !== 'recycle') {
                    let age;
                    if (creepMem.birthTime) {
                        age = (creepMem.lastAlive || Game.time) - creepMem.birthTime; // TODO if not run every tick
                    } else {
                        let match = /.*_(\d+)/.exec(name);
                        if (match) {
                            let birth = match[1];
                            age = creepMem.lastAlive % 1500 - birth;
                            age = (age < 0) ? age + 1500 : age;
                        }
                    }
                    let expectedDeath = /claimer.*/.exec(name) || /reserver.*/.exec(name) ? 490 : 1490;
                    if (age < expectedDeath) {
                        Game.notify(`${Game.time} creep ${name} died at ${creepMem.lastAlive + 1} unnaturally at age ${age}`);
                        Memory.stats.deaths = Memory.stats.deaths + 1;
                    }
                }
                delete Memory.creeps[name];
            }
        });
        _.keys(Memory.spawns).forEach((name)=> {
            if (!Game.spawns[name]) {
                delete Memory.spawns[name];
            }
        });
    }
    let cpu = {creeps: {}, roomTasks: {}}, roomCpu = {}, remoteCpu = {};
    let availableCpu = Game.cpu.tickLimit;

    if (updateStats) {
        cpu.creeps = cpu.creeps || {};
        _.keys(handlers).forEach((k)=>cpu.creeps[k] = 0);
    }
    let rooms = _.groupBy(_.values(Game.rooms), r=>!!(r.controller && r.controller.my && r.controller.level > 0));
    let ownedRooms = rooms['true'] || [];
    let remoteRooms = rooms['false'] || [];
    let taskPairs = _.pairs(roomTasks);
    try {
        if (0 === Game.time % frequencies['handleStreamingOrders']) {
            handleStreamingOrders();
        }
    } catch (e) {
        console.log(e);
        console.log(e.stack);
        Game.notify(e);
        Game.notify(e.stack);
    }
    ownedRooms.concat(remoteRooms).forEach(room=> {
        'use strict';
        let roomName = room.name;
        taskPairs.forEach((pair)=> {
            'use strict';
            let taskName = pair[0], task = pair[1];
            let start = Game.cpu.getUsed();
            if (start < availableCpu - 100) {
                try {
                    task(room);
                } catch (e) {
                    console.log(e);
                    console.log(e.stack);
                }
            } else {
                if (updateStats) skipped.push(`${roomName}.task`);
            }
            if (updateStats) {
                cpu.roomTasks[taskName] = (cpu.roomTasks[taskName] || 0) + Game.cpu.getUsed() - start;
            }
        });
    });
    _.sortBy(ownedRooms, r=>(r.memory.emergency ? -1 : 8 - r.controller.level));
    let sortedRooms = ownedRooms.concat(remoteRooms);
    // _.sortBy(_.values(Game.rooms), (r)=> r.controller && r.controller.my ? r.controller.level : 10);
    if (updateStats && Game.cpu.tickLimit < 500 && debugPerfs) console.log('room, controller, roomTasks , creeps ,spawns , labs , stats, room');
    sortedRooms.forEach((room)=> {
        // for (var roomName in Game.rooms) {
        //     var room = Game.rooms[roomName];
        // cpu['roomTasks'] = (cpu['roomTasks'] || 0) + roomTasksCpu - roomStartCpu;
        // roomManager.run(room); // todo manager
        // room.prototype.sourceConsumers = {};
        let roomName = room.name;
        let roomStartCpu = Game.cpu.getUsed();
        if (roomStartCpu < availableCpu - 100) {
            var creeps = room.find(FIND_MY_CREEPS);
            // room.creeps = creeps;
            creeps.forEach(function (creep) {
                creep.memory.lastAlive = Game.time;
                try {
                    if (!creep.spawning) {
                        creep.memory.birthTime = creep.memory.birthTime || Game.time;
                        let start = Game.cpu.getUsed();
                        if (start < availableCpu - 100) {
                            if (creep.memory.tasks && creep.memory.tasks.length) {
                                let task = new (require('task.' + creep.memory.tasks[0].name))(creep.memory.tasks[0].args);
                                let taskComplete = task.run(creep);
                                if (taskComplete) {
                                    creep.memory.tasks.splice(0, 1);
                                    if (!creep.memory.tasks.length) {
                                        delete creep.memory.tasks;
                                    }
                                }
                            } else {
                                let handler = handlers[creep.memory.role];
                                if (handler) handler.run(creep);
                                else {
                                    creep.log('!!!!!!no handler !! ');
                                }
                            }
                        } else {
                            if (updateStats) skipped.push(`${roomName}.${creep.name}`);
                        }
                        let end = Game.cpu.getUsed();
                        if (updateStats) {
                            cpu.creeps[creep.memory.role] = (cpu.creeps[creep.memory.role] || 0) + (end - start);
                            if (creep.memory.remoteRoom) {
                                remoteCpu[creep.memory.remoteRoom] = (remoteCpu[creep.memory.remoteRoom] || 0) + (end - start);
                            }
                        }
                    }
                } catch (e) {
                    creep.log(e.stack);
                    Game.notify(e.stack);
                }
            });
        } else {
            if (updateStats) skipped.push(`${roomName}.creeps`);
        }
        let creepsCpu = Game.cpu.getUsed();
        // room.log('creepsCpu', creepsCpu);
        let labsCpu = creepsCpu;

        if (Game.cpu.getUsed() < availableCpu - 100 && updateStats) {
            room.updateCheapStats();
        }
        if (Game.cpu.getUsed() < availableCpu - 100 && updateStats) {
            Memory.stats.room = Memory.stats.room || {};
            Memory.stats.room[room.name] = Memory.stats.room[room.name] || {};
            let roomStat = Memory.stats.room[room.name];
            roomStat.energyInStructures = room.find(FIND_MY_STRUCTURES).reduce((sum, s)=>sum + (s.store ? s.store.energy : (s.energy || 0)), 0);
            // roomStat.energyDropped = _.sum(_.map(room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType == RESOURCE_ENERGY), (s)=> s.amount));
            // room.log('stat efficiency',Game.time % 50);
            if (0 == (Game.time % 50)) {
                let roomEfficiency = Room.efficiency(roomName);
                if (roomEfficiency && roomEfficiency.remoteMining) {
                    roomStat.efficiency = {
                        remoteMining: roomEfficiency.remoteMining,
                        remoteMiningBalance: _.sum(roomEfficiency.remoteMining)
                    };
                }
            }

            let strangers = room.find(FIND_HOSTILE_CREEPS);
            let hostiles = _.filter(strangers, (c)=>c.hostile && _.sum(c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) > 0));

            /*
             if (hostiles.length > 0) {
             messages.push(' strangers ' + JSON.stringify(_.map(hostiles, (h) => {
             let subset = _.pick(h, ['name', 'pos', 'body', 'owner', 'hits', 'hitsMax']);
             subset.body = _.countBy(subset.body, 'type');
             return subset;
             })));
             }
             */
            roomStat.strangers = _.size(strangers);
            roomStat.hostiles = _.size(hostiles);
            roomStat.creeps = util.roster(room);
        }
        let statsCpu = Game.cpu.getUsed();
        if (updateStats) cpu ['stats'] = (cpu ['stats'] || 0) + statsCpu - labsCpu;
        if (updateStats) roomCpu[roomName] = Game.cpu.getUsed() - roomStartCpu;
        if (updateStats && Game.cpu.tickLimit < 500 && debugPerfs) room.log(
            (creepsCpu - roomStartCpu).toFixed(1),
            (labsCpu - creepsCpu).toFixed(1),
            (statsCpu - labsCpu).toFixed(1),
            (roomCpu [roomName]).toFixed(1)
        );
    });
    if (updateStats) skipped.forEach((s)=> console.log('skipped', s));
    Memory.stats.remoteRooms = {};
    _.keys(Memory.rooms).forEach((k)=> {
        let stat = _.get(Memory.stats, 'room.' + k + '.efficiency.remoteMining', undefined);
        if (stat && remoteCpu[k] || 0) {
            Memory.stats.remoteRooms[k] = Memory.stats.remoteRooms[k] || {};
            Memory.stats.remoteRooms[k].cpu_efficiency = stat / remoteCpu[k];
        }
        // console.log(`cpu.room, ${k},${roomCpu[k] || 0}`);
    });
    if (messages.length > 0) {
        Game.notify(messages);
    }
    if (updateStats) {
        Memory.stats.cpu_bucket = Game.cpu.bucket;
        Memory.stats.cpu_ = cpu;
        Memory.stats.cpu_.rooms = roomCpu;
        Memory.stats.cpu_.remoteRooms = remoteCpu;
        Memory.stats.cpu_.main = Game.cpu.getUsed() - _.sum(cpu) - globalStart;
        Memory.stats.cpu = Game.cpu.getUsed();
        Memory.stats.gcl = Game.gcl;
        // console.log('PathFinder.callCount', (PathFinder.callCount || 0));
        Memory.stats.performance = {PathFinder: {search: pathFinderCost}};
        // Memory.stats.performance = {'PathFinder.searchCost': pathFinderCost.cost};
        Memory.stats.roster = util.roster();
        Memory.stats.market = {credits: Game.market.credits};
        // _.keys(handlers).forEach((k)=> Memory.stats['roster.' + k] = roster[k] || 0);

    }

    // counting walkable tiles neer location:
    //_.filter(Game.rooms.E37S14.lookAtArea(y-1,x-1,y+1,x+1,true), function(o) {return o.type== 'terrain' &&(o.terrain =='plain' || o.terrain =='swamp')}).length
}

// RoomObject.prototype.creeps = [];
module.exports.loop = function () {
    let mainStart = Game.cpu.getUsed();
    Memory.stats = Memory.stats || {};
    Memory.stats.cpu_ = Memory.stats.cpu_ || {};
    Memory.stats.cpu_.init = mainStart;

    try {
        frequencies = updateFrequencies(frequencies);
        Memory.stats.frequencies = frequencies;

        if (Game.cpu.bucket > 200 && !Game.rooms['sim'] && !Memory.disableProfiler) {
            profiler.wrap(innerLoop);
            // innerLoop();
        } else {
            innerLoop();
        }
    }
    catch (e) {
        console.log(e);
        console.log(e.stack);
    }
    if (Game.cpu.tickLimit < 500) console.log(mainStart, Game.cpu.getUsed(), Game.cpu.bucket);

};