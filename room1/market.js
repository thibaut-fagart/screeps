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
Game.market.createOrder('sell','K',2, 50000, 'W55S43')
Game.market.deal('58064bb5c7e74bc826a5907c',10000,'W54S43')
Game.market.deal('57f69484cdf4b87c68cc688f',14412,'W55S43')
Game.rooms.W52S45.terminal.send('L',5000,'W54S42')
Game.rooms.W54S42.terminal.send('L',10000,'W52S45')
Game.rooms.W55S43.terminal.send('energy',10000,'W52S37')


Game.market.outgoingTransactions.filter(t=>t.destination=='W31S41')
JSON.stringify(Game.market.outgoingTransactions.filter(t=>t.recipient.username !== 'Finndibaen'))

Game.market.outgoingTransactions.filter(t=>t.recipient.username !== 'Finndibaen').reduce((sum, t)=>sum+t.amount, 0)
Game.market.incomingTransactions.filter(t=>t.sender.username !== 'Finndibaen').reduce((sum, t)=>sum+t.amount, 0)
l=  [{"time":14477585,"sender":{"username":"Finndibaen"},"recipient":{"username":"BlackLotus"},"resourceType":"U","amount":10000,"from":"W52S47","to":"W31S41","description":null,"transactionId":"5801022d0b2f6fb11652199d"}]


Memory.streamingOrders.push({from:'W54S43',to:'W49S29',what:'energy',initialAmount:'',step:10000})