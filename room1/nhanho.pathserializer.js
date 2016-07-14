exports.serialize = function (l) {
    var posByRoom = _.groupBy(l, function (rp) {
        return rp.roomName;
    });
    var result = {};
    if (l.length === 1) {
        return {"noRoom": ""};
    }
    for (var roomName in posByRoom) {
        var path = posByRoom[roomName];
        var p = _.reduce(posByRoom[roomName], function (result, value, key, col) {
            if (key < (col.length - 1)) {
                return result + value.getDirectionTo(col[key + 1]);
            }
            return result;
        }, "");
        var lastPos = path[path.length - 1];
        if (lastPos.x === 0) {
            p = p + LEFT;
        }
        if (lastPos.x === 49) {
            p = p + RIGHT;
        }
        if (lastPos.y === 0) {
            p = p + TOP;
        }
        if (lastPos.y === 49) {
            p = p + BOTTOM;
        }
        var f_x = posByRoom[roomName][1].x;
        var f_y = posByRoom[roomName][1].y;
        p = f_y.toString() + p;
        if (f_y < 10)
            p = "0" + p;
        p = f_x.toString() + p;
        if (f_x < 10)
            p = "0" + p;
        result[roomName] = p;
    }
    return result;
};
​
Creep.prototype.moveOnCachedPath = function (path) {
    var currentRoom = this.pos.roomName;
    var currentRoomPath = path[currentRoom];
    var result = this.moveByPath(currentRoomPath);
    if (result == ERR_NOT_FOUND) {
        var x = void 0, y = void 0;
        if (_.isString(currentRoomPath)) {
            var strPath = currentRoomPath;
            x = parseInt(currentRoomPath[0] + currentRoomPath[1]);
            y = parseInt(currentRoomPath[2] + currentRoomPath[3]);
        }
        else {
            var strPath = currentRoomPath;
            x = currentRoomPath[0].x;
            y = currentRoomPath[0].y;
        }
        PathFinder.use(false);
        result = this.moveTo(x, y);
        PathFinder.use(true);
    }
    return result;
};