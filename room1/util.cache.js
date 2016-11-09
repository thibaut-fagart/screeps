module.exports = {
    get: function (memory, path, fetcher, ttl) {
        if (!memory[path] || !memory[path].expires || ( Game.time > memory[path].expires)) {
            // console.log('Cache.get, expired ', path, memory[path].expires, Game.time);
            memory[path] = {value: fetcher(), expires: Game.time + ttl};
        } else {
            //console.log('Cache.get, !expired ',path, memory[path].expires+ttl- Game.time);

        }
        return memory[path].value;
    }
};
