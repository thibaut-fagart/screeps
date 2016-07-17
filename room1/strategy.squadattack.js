var Base = require('./strategy.base');
var RegroupStrategy = require('./strategy.regroup');
var util = require('./util');

class SquadAttackStrategy extends Base {
    constructor(range) {
        super();
        this.range = range || 3;
        this.MOVE_PATH = 'movePath';
    }

    findBrothers(creep) {
        return creep.pos.findInRange(FIND_MY_CREEPS, this.range, {filter: (c) => c.memory.role == creep.memory.role});
    }

    previousClosest(creep) {
        return creep.memory['previousClosest'];
    }

    setPreviousClosest(creep, v) {
        if (v) creep.memory['previousClosest'] = v; else delete creep.memory['previousClosest'];
    }

    findRemoteExit(creep) {
        if (creep.memory.exitToHome) {
            return creep.memory.exitToHome;
        } else if (creep.memory.exitToRemote) {
            let e = creep.memory.exitToRemote;
            let mirrorLamba = (x)=> (x === 0) ? 49 : (x === 49) ? 0 : x;
            let exit = new RoomPosition(mirrorLamba(e.x), mirrorLamba(e.y), creep.room.name);
            creep.memory.exitToHome = exit;
            return exit;
        }
        return util.findExit(creep, creep.memory.homeroom, 'remoteExit');
    }

    /**
     * waits for , either the hostiles to get in range, or the number of squad to mathc homeroom.min_attack
     * @param creep
     * @returns {*}
     */
    accepts(creep) {
        let squad = creep.room.find(FIND_MY_CREEPS).filter((c)=>(c.memory.role === creep.memory.role));
        // creep.log('squad?', squad.length);

        let leader = _.sortBy(squad, (b)=>b.name)[0];
        let isLeader = leader.name === creep.name;

        let brotherFurthestToLeader = _.sortBy(squad, (c)=>-c.pos.getRangeTo(leader))[0];
        let maxDistanceToLeader = brotherFurthestToLeader.pos.getRangeTo(leader);
        let myDistanceToLeader = creep.pos.getRangeTo(leader);
        // if roster is not enough, regroup to exit
        // keep the squad together
        // creep.log('squad.length', squad.length, Game.rooms[creep.memory.homeroom].memory.attack_min);
        // creep.log('leader?', myDistanceToLeader, 'max', maxDistanceToLeader);
        if (squad.length < Game.rooms[creep.memory.homeroom].memory.attack_min) {
            // let the leader lead the way, safely
            if (isLeader) {
                let exitToHome = util.findExit(creep, creep.memory.homeroom,'exitToHome');
                creep.log('exitToHome', JSON.stringify(exitToHome));
                let exitDist = creep.pos.getRangeTo(exitToHome.x, exitToHome.y);
                creep.log('exit at?', exitDist);
                if (creep.pos.getRangeTo(exitToHome) > 5) {
                    util.safeMoveTo(exitToHome);
                    return true;
                } else if (creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length) {
                    creep.log('hostiles near regroup point, fighting');
                    return false;
                } else {
                    let pathToExit;
                    if (!creep.memory.pathToExit || !creep.memory.pathToExit.length || creep.pos.getRangeTo(creep.memory.pathToExit[0].x, creep.memory.pathToExit[0].y)>1) {
                        pathToExit  = creep.memory.pathToExit = util.safeMoveTo(creep, exitToHome);
                    } else {
                        pathToExit  = creep.memory.pathToExit;
                        if (creep.pos.getRangeTo(pathToExit[0].x, pathToExit[0].y) ==0) {
                            creep.memory.pathToExit = pathToExit = pathToExit.slice(1);
                        }
                    }
                    creep.moveTo(pathToExit[0]);
                    creep.log('waiting for reinforcements');
                    return true;
                }
            } else {
                // stick to the leader
                if (myDistanceToLeader > squad.length - 1) {
                    util.safeMoveTo(creep, leader.pos);
                } else if (myDistanceToLeader > 1) {
                    creep.moveTo(leader.pos);
                }
                // creep.log('stick to leader');
                return true;
            }
        }

        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        if (!hostiles.length) {
            this.setPreviousClosest(creep);
            if (myDistanceToLeader > squad.length - 1) {
                util.safeMoveTo(creep, leader.pos);
                return true;
            } else if (myDistanceToLeader > 1 && myDistanceToLeader < squad.length) {
                creep.moveTo(leader.pos);
                return true;
            }
            return false;
        }
        // creep.log('leader', leader);
        // choose target
        let closestEnemy = this.findLeaderTarget(leader, hostiles);
        // and move to it, squad manner
        let myRange = closestEnemy.pos.getRangeTo(creep);
        // if (isLeader) creep.log('hostiles', hostiles.length, myRange, JSON.stringify(closestEnemy.pos));
        let rangeToLeader = leader.pos.getRangeTo(closestEnemy);
        if (myRange <= 4 && rangeToLeader <= squad.length) {
            // ok, attack
            return false;
        }
        if (isLeader) {
            if (!creep.memory.path) {
                creep.memory.path =[];
            }
            // creep.log('leader',maxDistanceToLeader,squad.length);
            // move forwards if everyone is nearby, otherwise go back
            if (maxDistanceToLeader < squad.length+1) {
                if (myRange <= 4) {
                    delete creep.memory.path[closestEnemy.id];
                    return false;
                } else {
                    // creep.log('computing safe path');
                    let lastPos = creep.memory.lastPos || creep.pos;
                    let stoppedCounter = creep.memory.ticksAtLastPos||0;
                    if (this.samePos(lastPos, creep.pos)) {
                        creep.memory.ticksAtLastPos =stoppedCounter ++;
                    } else {
                        creep.memory.ticksAtLastPos =0;
                        creep.memory.lastPos = creep.pos;
                    }
                    let path;
                    if (stoppedCounter< 3) {
                        path = creep.memory.path[closestEnemy.id] || util.safeMoveTo(creep, closestEnemy.pos);
                        creep.memory.path[closestEnemy.id] = path;
                    } else {
                        path = creep.memory.path[closestEnemy.id] = util.safeMoveTo(creep, closestEnemy.pos);
                    }
                    creep.moveByPath(path);
                    return true;
                }
            } else {
                util.safeMoveTo(creep, brotherFurthestToLeader.pos);
                return true;
            }
        } else {
            if (maxDistanceToLeader < squad.length && myRange <= 4) {
                return false;
            } else {
                //move to leader
                // creep.log('closing on leader', JSON.stringify(leader.pos));
                creep.moveTo(leader.pos);
                return true;
            }
        }
    }

    findLeaderTarget(leader, hostiles) {

        return leader.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    }

    samePos(lastPos, pos) {
        return lastPos.x === pos.x && lastPos.y === pos.y && lastPos.roomName === pos.roomName;
    }
}
module.exports = SquadAttackStrategy;