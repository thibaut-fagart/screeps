var _ = require('lodash');
var util = require('./util');
var MoveToRoom = require('./task.MoveToRoom');
var GoThroughPortal = require('./task.GoThroughPortal');

/*
 creep.memory.tasks = [{
 name:'FollowFlag',
 args:{nextFlag:'aFlagName'}
 }];
 */
class FollowFlag {
    static addLast(creep, flagName) {
        creep.memory.tasks = creep.memory.tasks || [];
        creep.memory.tasks.push(this.create(flagName));
    }

    static addFirst(creep, flagName) {
        creep.memory.tasks = creep.memory.tasks || [];
        creep.memory.tasks.unshift(this.create(flagName));
    }

    static create(flagName) {
        return {
            name: 'FollowFlag',
            args: {nextFlag: flagName}
        };
    }

    constructor(state) {
        this.state = state;
    }

    /**
     *
     * @param creep
     * @returns {boolean} true if the task is complete
     */
    run(creep) {
        let flag = Game.flags[this.state.nextFlag];
        if (!flag) {
            creep.log('error, next flag missing');
        } else if (creep.room.name === flag.pos.roomName) {
            if (flag.pos.lookFor(LOOK_STRUCTURES).find(s=>s.structureType === STRUCTURE_PORTAL)) {
                let nextFlag = _.get(flag, ['memory', 'nextFlag'], undefined);
                if (nextFlag) {
                    _.head(creep.memory.tasks).args.nextFlag = nextFlag;
                }
                GoThroughPortal.addFirst(creep, flag.pos.roomName);
                new GoThroughPortal(_.head(creep.memory.tasks).args).run(creep);
            } else if (creep.pos.getRangeTo(flag) > 0) {
                if (creep.hits <creep.hitsMax) {
                    creep.heal(creep);
                }
                util.moveTo(creep, flag.pos, undefined,{range: 0});
            } else {
                let nextFlag = _.get(flag, ['memory', 'nextFlag'], undefined);
                if (nextFlag) {
                    _.head(creep.memory.tasks).args.nextFlag = nextFlag;
                    new FollowFlag(_.head(creep.memory.tasks).args).run(creep);
                } else {
                    Game.notify(`creep ${creep.name}, completed follow flag task in room ${creep.room.name}`)
                    return true;
                }
            }
        } else {
            MoveToRoom.addFirst(creep, flag.pos.roomName);
            new MoveToRoom(_.head(creep.memory.tasks).args).run(creep);
        }
        return false;
    }
}
require('./profiler').registerClass(FollowFlag, 'FollowFlag');
module.exports = FollowFlag;