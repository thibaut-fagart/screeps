const _ = require('lodash');
const reactions = require('./role.lab_operator').reactions;

module.exports = {

    handleStreamingOrders: function () {
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
            let energyPriceWithTransport = Infinity == closestEnergyDeal ? 1 : 100 * closestEnergyDeal.price / (Game.market.calcTransactionCost(100, homeroom, closestEnergyDeal.roomName) + 100);
            if (Game.market.credits > 50000 && closestEnergyDeal && Infinity !== closestEnergyDeal) {
                // if (!closestEnergyDeal || Infinity !== closestEnergyDeal)
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
                    if (Game.market.credits > 50000 && _.get(Memory.stats, ['ledger', 'v', resource], 0) < 50000 && _.get(Game.rooms, [roomName, 'terminal', 'store', resource], 0) < 2000) {
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
                let sell = (roomName, resource, minPrice) => {
                    minPrice = minPrice || 1;
                    if (_.get(Memory.stats, ['ledger', 'v', resource.amount], 0) > 250000 && _.get(Game.rooms, [roomName, 'terminal', 'store', resource], 0) > 5000) {
                        let buyOrders = Game.market.getAllOrders(o=>o.type === 'buy' && o.resourceType === resource && o.price >= minPrice);
                        _.sortBy(buyOrders, o=>o.price - energyPriceWithTransport * Game.market.calcTransactionCost(100, roomName, o.roomName) / 100);
                        let deal = _.head(buyOrders);
                        if (deal) {
                            let qty = Math.min(5000, deal.remainingAmount);
                            let ret = Game.market.deal(deal.id, qty, roomName);
                            Game.notify(`sold ${qty} ${resource} from ${roomName} at ${deal.price} to ${deal.roomName}: ${ret}`);
                        }
                    }
                };
                buy('W52S45', 'O', 0.5);
                buy('W53S43', 'H', 0.5);
                buy('W53S43', 'X', 0.75);
                sell('W57S45', 'L', 0.35);
                sell('W54S42', 'L', 0.35);
                sell('W52S47', 'U', 0.35);
                sell('W54S43', 'U', 0.35);
                // buy('W52S37', 'X', 1);
            }
            // Memory.streamingOrders = Memory.streamingOrders.filter(order=>order.amount >= 100);
        }
    },

    updateProductions: function () {
        Memory.stats.ledger = Memory.stats.ledger || {time: 0};
        if (Memory.stats.ledger.time < Game.time - 500) {
            let globalLedger = require('./reports').globalLedger();
            Memory.stats.ledger.v = globalLedger;
            Memory.stats.ledger.time = Game.time;
            _.keys(globalLedger).forEach(key=> {
                if (globalLedger[key].goal > 0) {
                    globalLedger[key].ratio = globalLedger[key].amount / globalLedger[key].goal;
                }
            });
        }
        const ledger = Memory.stats.ledger.v;
        // missing as per desired ledger
        let addRequiredIngredientsToLedger = (min, qty)=> {
            // console.log('addRequiredIngredientsToLedger ', min, qty);
            if (qty > 0) {
                (reactions[min] || []).forEach(m=> {
                    ledger[m] = ledger[m] || {amount: 0, goal: 0};
                    ledger[m].goal = (ledger[m].goal || 0) + qty;
                    addRequiredIngredientsToLedger(m, qty - ledger[min].amount);
                });
            }
        };
        // consolidate ingredients of missing compounds to ledger (desired)
        _.keys(ledger).forEach(min=> {
            if ('energy' !== min && ledger[min].amount < ledger[min].goal) {
                addRequiredIngredientsToLedger(min, Math.max(0, ledger[min].goal - ledger[min].amount));
            }
        });

        let missingMinsWithQty = _.keys(ledger).reduce((acc, min)=> {
            'use strict';
            if (min !== RESOURCE_ENERGY && ledger[min].amount < ledger[min].goal) {
                acc[min] = (acc[min] || 0) + (ledger[min].goal - ledger[min].amount);
            }
            return acc;
        }, {});
        // console.log('missing missingMinsWithQty : ', JSON.stringify(missingMinsWithQty));

        Memory.stats.ledger.needs = _.keys(ledger).filter(min=>ledger[min].amount < ledger[min].goal);

        Memory.stats.ledger.produceable = Memory.stats.ledger.needs.filter(min=>reactions[min]).reduce((acc, min)=> {
            let ingredients = reactions[min];
            if (ingredients) {
                acc[min] = ingredients.reduce((available, i)=> Math.min(available, _.get(ledger, [i, 'amount'], 0)), Infinity);
            }
            return acc;
        }, {});
        // sort by available quantity of ingredients
        // todo this clears the previous sort
        // Memory.stats.ledger.produceable = _.sortBy(produceable, pair=>-pair[1]);
        // console.log('production needs ', JSON.stringify(Memory.stats.ledger.needs));
        _.sortBy(Memory.stats.ledger.needs, min=>-1 * Memory.stats.ledger.produceable[min] + (Memory.stats.ledger.v[min].goal - Memory.stats.ledger.v[min].amount));
        Memory.stats.producing = _.values(Game.rooms).filter(r=>r.controller && r.controller.my && r.controller.level > 6).reduce((acc, r)=> {
            if (r.lab_production) {
                acc[r.lab_production] = (acc[r.lab_production] || 0) + 1;
            }
            return acc;
        }, _.keys(reactions).reduce((acc, m)=> {
            acc[m] = 0;
            return acc;
        }, {}));
    }
};