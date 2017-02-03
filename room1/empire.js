const _ = require('lodash');
const reactions = require('./role.lab_operator').reactions;
var Cache = require('./util.cache');
const homeroom = 'W55S43';
const MAX_DEAL_PER_TICK = 10;
const LIQUIDATE_ABOVE_STORAGE_FILL = 950000;
let maxAffordable = (room, toRoomName, isEnergy) => {
    let distance = Game.map.getRoomLinearDistance(room.name, toRoomName, true);
    let number = Math.log((distance + 9) * 0.1) + 0.1;
    let amount = (room.terminal.store.energy || 0);

    if (isEnergy) {
        return {amount: Math.floor((amount / (1 + number))), cost: Math.ceil(amount * (number))};
    } else {
        return {amount: Math.ceil(amount / number), cost: amount};
    }

};


var empire = {
    ownedRooms: function () {
        'use strict';
        Memory.empire = Memory.empire || {};
        return Cache.get(Memory.empire, 'ownedRooms', () => {
            return _.values(Game.rooms).filter(r => r.controller && r.controller.my).map(r => r.name);
        }, 1000).map(name => Game.rooms[name]);
    },
    remoteMiningRooms: function () {
        'use strict';
        Memory.empire = Memory.empire || {};
        return Cache.get(Memory.empire, 'remoteRooms', () => {
            return this.ownedRooms().reduce((acc, room) => acc.concat(room ? room.memory.remoteMining || [] : []), []);
        }, 1000);
    },

    energyPrice: function () {
        return Cache.get(Memory.cache, 'energyPrice', () => {
            let energyBuyOrders = Game.market.getAllOrders(o => o.type === 'buy' && o.resourceType === RESOURCE_ENERGY);
            let bestDeal = _.max(energyBuyOrders, o => o.price);
            let energyPrice = bestDeal.price;
            // there may be multiple deals at the same price
            // use calcTransactionCost as it takes into account the fact that the world is "round" (eg, E touches W, and N, S) for trades
            let closestEnergyDeal = _.min(energyBuyOrders.filter(o => o.price === energyPrice), o => Game.market.calcTransactionCost(100, homeroom, o.roomName));
            return Infinity == closestEnergyDeal ? 0 : 100 * closestEnergyDeal.price / (Game.market.calcTransactionCost(100, homeroom, closestEnergyDeal.roomName) + 100);
        }, 1500);
    },

    handleStreamingOrders: function () {
        'use strict';
        if (Memory.streamingOrders) {
            Memory.streamingOrders.forEach(order => {
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
        }
    },

    renewBuyOrders: function (globalLedger, myRooms, currentEnergyPrice) {
// if (!closestEnergyDeal || Infinity !== closestEnergyDeal)
        let expiredBuyDeals = _.filter(Game.market.orders,
            o => o.type === 'buy'
                && o.remainingAmount < 100
                && (
                    ('energy' !== o.resourceType && globalLedger[o.resourceType] || {amount: 0}).amount < 100000
                || 'energy' === o.resourceType && Game.rooms[o.roomName].currentLedger[o.resourceType] < 100000
            )
        );
        Game.market.createOrder()
        expiredBuyDeals.forEach(deal => {
            let global = globalLedger[deal.resourceType] || ({amount: 0, goal: 0});

            console.log(`renewing buy ${deal.id}, ${deal.resourceType}: ${global.amount} < ${global.goal} `);
            if (deal && global.amount < global.goal) {
                let maxPrice = _.max(Game.market.getAllOrders((o) => o.type === 'buy' && o.resourceType === deal.resourceType && !Game.market.orders[o.id]), o => o.price).price;
                if (maxPrice < deal.price) {
                    let newPrice = (maxPrice + 0.01);
                    Game.notify(`aligning price for ${deal.resourceType} ${deal.price}=>${newPrice}`);
                    Game.market.changeOrderPrice(deal.id, newPrice);
                }
                let extendQty = 5000;
                Game.notify(`extending ${deal.type}:${deal.resourceType} by ${extendQty}`);
                Game.market.extendOrder(deal.id, Math.min((0.2 * Game.market.credits) / deal.price, extendQty));
            }
        });
        // raise price for orders where we're lacking a lot
        _.filter(Game.market.orders, o => {
            let global = globalLedger[o.resourceType] || ({amount: 0, goal: 0});
            return o.type === 'buy'
                && o.remainingAmount > 100
                && global.amount < 0.5* global.goal;
        }).forEach(deal =>{
            let global = globalLedger[deal.resourceType] || ({amount: 0, goal: 0});

            console.log(`raising price for buy ${deal.id}, ${deal.resourceType}: ${global.amount} < ${global.goal} `);
            let maxPrice = _.max(Game.market.getAllOrders((o) => o.type === 'buy' && o.resourceType === deal.resourceType && !Game.market.orders[o.id]), o => o.price).price;
            if (maxPrice > deal.price) {
                let newPrice = maxPrice ;
                Game.notify(`aligning price upward for ${deal.resourceType} ${deal.price}=>${newPrice}`);
                Game.market.changeOrderPrice(deal.id, newPrice);
            }
        });
        let buy = (resource, maxPrice, maxQty) => {
            let sellOrders = Game.market.getAllOrders(o => o.type === 'sell' && o.resourceType === resource && o.price < maxPrice);
            maxPrice = maxPrice || 1;
            if (Game.market.credits > 50000 && sellOrders.length > 0 && _.get(Memory.stats, ['ledger', 'v', resource, 'amount'], 0) < maxQty) {
                let roomName = myRooms.find(r => _.contains(_.get(Game.rooms, [r, 'import'], []), resource));
                roomName = roomName || _.get(myRooms.find(r => (r.currentLedger[resource] || 0) < 10000), 'name', undefined);
                console.log(`importing ${resource} to ${roomName}`);
                if (roomName) {
                    _.sortBy(sellOrders, o => o.price + currentEnergyPrice * Game.market.calcTransactionCost(100, roomName, o.roomName) / 100);
                    let deal = _.head(sellOrders);
                    if (deal) {
                        let qty = Math.min(5000, deal.remainingAmount);
                        let ret = Game.market.deal(deal.id, qty, roomName);
                        Game.notify(`buying ${qty} ${resource} in ${roomName} at ${deal.price} from ${deal.roomName}: ${ret}`);
                    }
                } else {
                    console.log(`no room needing ${resource}`);
                    Game.notify(`no room needing ${resource}`);
                }
            } else {
                console.log(`not buying ${resource}, credits ${Game.market.credits}, sellOrders below ${maxPrice} ${sellOrders.length}`);
            }
        };
    },

    handleMarket() {
        'use strict';
        let start = Game.cpu.getUsed();
        // renew sell orders
        _.filter(Game.market.orders, o => o.type === 'sell' && o.remainingAmount < 100).forEach(sellDeal => Game.market.extendOrder(sellDeal.id, 2000));
        let globalLedger = require('./reports').globalLedger();

        let currentEnergyPrice = empire.energyPrice();
        let myRooms = empire.ownedRooms().filter(r => r.terminal);
        if (Game.market.credits > 50000 && currentEnergyPrice) {
            this.renewBuyOrders(globalLedger, myRooms, currentEnergyPrice);

        }
        if (Game.cpu.getUsed() > Game.cpuLimit - 10) return;
        let prices = _.merge({
            U: 0.05,
            Z: 0.5,
            L: 0.25,
            K: 0.3,
            O: 0.45,
        }, Memory.floorPrices);
        let selling = ['U', 'Z', 'L', 'K', 'O', 'H', 'X'].filter(min => (globalLedger[min] || {amount: 0}).amount > (globalLedger[min] || {goal: 0}).goal + 100000);
        console.log('selling ?', JSON.stringify(selling));
        let soldCount = 0;
        if (selling.length) {
            console.log('energyPrice', currentEnergyPrice);
            myRooms.forEach(r => r.storageFill = -_.sum(_.get(r, ['storage', 'store'], {})));
            let myRoomsByStorageFill = _.sortBy(myRooms, room => -room.storageFill);
            selling.forEach(min => {
                let storedResource = _.get(Memory.stats, ['ledger', 'v', min], {amount: 0, goal: 0});
                let buyOrders = Game.market.getAllOrders(o => o.type === 'buy' && o.resourceType === min && o.price >= prices[min] - 3 * currentEnergyPrice);
                if (buyOrders && buyOrders.length) {
                    myRoomsByStorageFill.forEach(room => {
                        if (Game.cpu.getUsed() > Game.cpuLimit - 10) return;
                        if (storedResource.amount > storedResource.goal && soldCount < MAX_DEAL_PER_TICK) {
                            if (this.sellAbove(min, room.storageFill> LIQUIDATE_ABOVE_STORAGE_FILL?0:prices[min], room.name, currentEnergyPrice, storedResource.amount, storedResource.goal, buyOrders)) {
                                soldCount++;
                            }
                        }
                    });
                }
            });
        }
        console.log('handleMarket ', Game.cpu.getUsed() - start);

    },

    sellAbove(resource, minPrice, roomName, energyPrice, storedResource, resourceGoal, buyOrders) {
        'use strict';
        let start = Game.cpu.getUsed();
        minPrice = minPrice || 1;
        let tradeable = storedResource - resourceGoal;
        let room = Game.rooms[roomName];
        let sold = false;
        if (_.get(room, ['terminal', 'store', resource], 0) > 0) {
            let deal = _.max(buyOrders, o => o.price - energyPrice * Game.market.calcTransactionCost(100, roomName, o.roomName) / 100);
            /*
             room.log(`sellAbove  ${resource}, ${storedResource}/${resourceGoal}, buyOrders ${buyOrders.length}`, 'adjusted price ',
             deal.price - currentEnergyPrice * Game.market.calcTransactionCost(100, roomName, deal.roomName) / 100);
             */
            // overflowing , sell anyway, even under minPrice
            if (deal !== Infinity && deal.price > minPrice) {
                let qty = Math.min(
                    room.terminal.store[resource],
                    maxAffordable(room, deal.roomName, resource === RESOURCE_ENERGY).amount,
                    deal.remainingAmount,
                    tradeable
                );
                if (qty >= 100) {
                    let ret = Game.market.deal(deal.id, qty, roomName);
                    if (ret === OK) {
                        Memory.stats.ledger.v[resource].amount = Memory.stats.ledger.v[resource].amount - qty;
                        sold = true;
                    }
                    room.log(`sold ${qty} ${resource} at ${deal.price} to ${deal.roomName}: ${ret}`);
                    Game.notify(`sold ${qty} ${resource} from ${roomName} at ${deal.price} to ${deal.roomName}: ${ret}`);
                }
            }
        } else {
            // console.log(`${roomName},${resource}, ${storedResource}/${resourceGoal}`);

        }
        room.log(`sellAbove(${resource}, ${minPrice}, ${energyPrice}) :  ${Game.cpu.getUsed() - start}`);
        return sold;
    },
    updateProductions: function () {
        Memory.stats.ledger = Memory.stats.ledger || {time: 0};
        if (Memory.stats.ledger.time < Game.time - 500) {
            let globalLedger = require('./reports').globalLedger();
            Memory.stats.ledger.v = globalLedger;
            Memory.stats.ledger.time = Game.time;
            _.keys(globalLedger).forEach(key => {
                if (globalLedger[key].goal > 0) {
                    globalLedger[key].ratio = globalLedger[key].amount / globalLedger[key].goal;
                }
            });
        }
        const ledger = Memory.stats.ledger.v;
        // missing as per desired ledger
        let addRequiredIngredientsToLedger = (min, qty) => {
            // console.log('addRequiredIngredientsToLedger ', min, qty);
            if (qty > 0) {
                (reactions[min] || []).forEach(m => {
                    ledger[m] = ledger[m] || {amount: 0, goal: 0};
                    ledger[m].goal = (ledger[m].goal || 0) + qty;
                    addRequiredIngredientsToLedger(m, qty - ledger[min].amount);
                });
            }
        };
        // consolidate ingredients of missing compounds to ledger (desired)
        _.keys(ledger).forEach(min => {
            if ('energy' !== min && ledger[min].amount < ledger[min].goal) {
                addRequiredIngredientsToLedger(min, Math.max(0, ledger[min].goal - ledger[min].amount));
            }
        });

        Memory.needs = _.keys(ledger).filter(min => ledger[min].amount < ledger[min].goal);

        Memory.stats.ledger.produceable = Memory.needs.filter(min => reactions[min]).reduce((acc, min) => {
            let ingredients = reactions[min];
            if (ingredients) {
                acc[min] = ingredients.reduce((available, i) => Math.min(available, _.get(ledger, [i, 'amount'], 0)), Infinity);
            }
            return acc;
        }, {});
        // sort by available quantity of ingredients
        // todo this clears the previous sort
        // Memory.stats.ledger.produceable = _.sortBy(produceable, pair=>-pair[1]);
        // console.log('production needs ', JSON.stringify(Memory.needs));
        _.sortBy(Memory.needs, min => -1 * Memory.stats.ledger.produceable[min] + (Memory.stats.ledger.v[min].goal - Memory.stats.ledger.v[min].amount));
        Memory.stats.producing = _.values(Game.rooms).filter(r => r.controller && r.controller.my && r.controller.level > 6).reduce((acc, r) => {
            if (r.lab_production) {
                acc[r.lab_production] = (acc[r.lab_production] || 0) + 1;
            }
            return acc;
        }, _.keys(reactions).reduce((acc, m) => {
            acc[m] = 0;
            return acc;
        }, {}));
    },


    send(what, howMuch, to, batchSize) {
        'use strict';
        batchSize = batchSize || 10000;
        let remaining = howMuch;
        let planning = {};
        let planUsing = (storageType, planning) => {
            let roomWithMineral = _.values(Game.rooms).filter(r => r.controller && r.controller.my && r.name !== to && _.get(r, [storageType, 'store', what], 0) > 100).reduce((acc, r) => {
                acc[r.name] = r[storageType].store[what];
                return acc;
            }, {});
            console.log(`rooms with ${what} available in ${storageType} : ${JSON.stringify(roomWithMineral)}`);
            let providersByDistance = _.keys(roomWithMineral);
            _.sortBy(providersByDistance, rname => Game.market.calcTransactionCost(1000, rname, to));
            for (let i = 0; i < providersByDistance.length && remaining > 100; i++) {
                let sendingFrom = providersByDistance[i];
                let sending = Math.min(remaining, roomWithMineral[sendingFrom]);
                planning[sendingFrom] = (planning[sendingFrom] || 0) + sending;
                remaining = remaining - sending;
            }
        };
        planUsing(STRUCTURE_TERMINAL, planning);
        if (remaining > 100) {
            planUsing(STRUCTURE_STORAGE, planning);
        }
        let selectedRooms = _.keys(planning);
        let roomBatchSize = Math.ceil(batchSize / _.size(selectedRooms));
        selectedRooms.forEach(rName => {
            Memory.streamingOrders.push({
                from: rName,
                to: to,
                what: what,
                initialAmount: planning[rName],
                step: roomBatchSize
            });
            console.log(`scheduling ${planning[rName]} ${what} from ${rName} to ${to}, by ${roomBatchSize}`);

        });
        console.log(`remaining ${remaining}`);
    },

    incomingTransactionReport: function () {
        'use strict';
        let lastChecked = _.get(Memory, ['empire', 'market', 'incomingCheck'], 0);
        let incoming = Game.market.incomingTransactions.filter(t => t.time > lastChecked && t.sender && t.sender.username !== t.recipient.username && !t.order);
        Memory.stats.incomingTransfers = Memory.stats.incomingTransfers || {};
        let sum = incoming.reduce((acc, o) => {
            acc[o.resourceType] = (acc[o.resourceType] || 0) + o.amount;
            return acc;
        }, {});
        _.merge(Memory.stats.incomingTransfers, sum, (a, b) => a + b);
        _.set(Memory, ['empire', 'market', 'incomingCheck'], Game.time);
        // group by sender+resource
        if (incoming.length) {
            let grouped = _.groupBy(incoming, (t => t.sender.username + ',' + t.resourceType ));
            let message = _.keys(grouped).reduce((msg, trade) => {
                let amount = grouped[trade].reduce((acc, t) => acc + t.amount, 0);
                msg = msg + trade + ':' + amount + '\n';
                return msg;
            }, '');
            Game.notify(`incoming  transfers since ${lastChecked} ${message}`);
        }
    },
    outgoingTransactionReport: function () {
        'use strict';
        let lastChecked = _.get(Memory, ['empire', 'market', 'outgoingCheck'], 0);
        let outgoing = Game.market.outgoingTransactions.filter(t => t.time > lastChecked && t.recipient && t.sender.username !== t.recipient.username && !t.order);
        Memory.stats.outgoingTransfers = Memory.stats.outgoingTransfers || {};
        let sum = outgoing.reduce((acc, o) => {
            acc[o.resourceType] = (acc[o.resourceType] || 0) + o.amount;
            return acc;
        }, {});
        _.merge(Memory.stats.outgoingTransfers, sum, (a, b) => a + b);
        _.set(Memory, ['empire', 'market', 'outgoingCheck'], Game.time);
        // group by sender+resource
        if (outgoing.length) {
            let grouped = _.groupBy(outgoing, (t => t.sender.username + ',' + t.resourceType ));
            let message = _.keys(grouped).reduce((msg, trade) => {
                let amount = grouped[trade].reduce((acc, t) => acc + t.amount, 0);
                msg = msg + trade + ':' + amount + '\n';
                return msg;
            }, '');
            Game.notify(`sent transfers since ${lastChecked} ${message}`);
        }

    },
    outgoingSummary: function () {
        'use strict';
        return Game.market.outgoingTransactions.filter(o => _.get(o, ['recipient', 'username']) !== 'Finndibaen').reduce((acc, o) => {
            let uname = _.get(o, ['recipient', 'username']);
            _.set(acc, [uname, o.resourceType], _.get(acc, [uname, o.resourceType], 0) + o.amount);
            return acc;
        }, {});
    },
    incomingSummary: function () {
        'use strict';
        return Game.market.incomingTransactions.filter(o => _.get(o, ['sender', 'username']) !== 'Finndibaen').reduce((acc, o) => {
            let uname = _.get(o, ['sender', 'username']);
            _.set(acc, [uname, o.resourceType], _.get(acc, [uname, o.resourceType], 0) + o.amount);
            return acc;
        }, {});
    },
    internalIncomingSummary: function () {
        'use strict';
        return Game.market.incomingTransactions.filter(o => o.sender.username === o.recipient.username).reduce((acc, o) => {
            _.set(acc, [o.to, o.resourceType], _.get(acc, [o.to, o.resourceType], 0) + o.amount);
            return acc;
        }, {});
    },

    mineralSummary: function () {
        'use strict';
        return _.values(Game.rooms).filter(r => r.controller && r.controller.my && r.controller.level > 6).reduce((acc, r) => {
            var mineral = _.head(r.find(FIND_MINERALS));
            acc[mineral.mineralType] = (acc[mineral.mineralType] || 0) + MINERAL_DENSITY[mineral.density];
            return acc;
        }, {});
    },

    bestInRange: function (mineral) {
        'use strict';
        let roomsWithMineral = _.keys(Memory.rooms).filter(r => !_.get(Game.rooms, [r, 'controller', 'my'], false) && _.get(Memory.rooms, [r, 'scouted', 'minerals'], []).find(minWithDensity => minWithDensity.startsWith(mineral)));
        return _.sortBy(roomsWithMineral, r => -_.get(Memory.rooms, [r, 'scouted', 'sourceCount'], 0));
    },
    cleanStreaming: function () {
        'use strict';
        let isComplete = o => ('undefined' != typeof o.amount && (o.amount < 100));
        Memory.streamingOrders = Memory.streamingOrders.filter(o => !isComplete(o));
    }


};

module.exports = empire;