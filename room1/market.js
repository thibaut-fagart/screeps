JSON.stringify(_.sortBy(Game.market.getAllOrders().filter(o=>o.type ==='buy'), o=>{
    /*console.log(o.roomName);*/
    if (o.roomName) {
        o.distance =  Game.map.getRoomLinearDistance('W55S43',o.roomName);
        return o.distance;
    } else {
        return Infinity;
    }
}).reduce((acc, o)=>{
    if (o.distance < 20) acc.push(o);
    return acc;
},[]));


Game.market.calcTransactionCost(1000,'W54S42','W06N08')
Game.market.createOrder('sell','K',2.5, 10000, 'W55S43')
Game.market.deal('57d5d896b1ed8acf7faba967',1000,'W55S43')