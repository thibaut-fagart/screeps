module.exports = {
    get: function (memory, path, fetcher, ttl) {
        if (!memory[path] || !memory[path].expires || ( Game.time > memory[path].expires)) {
            // console.log('Cache.get, expired ', path, memory[path].expires, Game.time);
            memory[path] = {value: fetcher(), expires: Game.time + ttl, hits:0};
        }
        memory[path].hits = memory[path].hits + 1;
        return memory[path].value;
    }
};
