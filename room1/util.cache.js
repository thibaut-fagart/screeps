module.exports = {
    get: function (memory, path, fetcher, ttl) {
        if (!memory[path] || !memory[path].e || ( Game.time > memory[path].e)) {
            // console.log('Cache.get, expired ', path, memory[path].expires, Game.time);
            memory[path] = {v: fetcher(), e: Game.time + ttl, h:0};
        }
        // memory[path].h = memory[path].h + 1;
        return memory[path].v;
    }
};
