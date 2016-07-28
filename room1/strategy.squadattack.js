var Base = require('./strategy.base');
var RegroupStrategy = require('./strategy.regroup');
var util = require('./util');

class SquadAttackStrategy extends Base {
    constructor(range) {
        super();
        this.range = range || 3;
        this.MOVE_PATH = 'movePath';
    }

    previousClosest(creep) {
        return creep.memory['previousClosest'];
    }

    setPreviousClosest(creep, v) {
        if (v) creep.memory['previousClosest'] = v; else delete creep.memory['previousClosest'];
    }

    /**
     * waits for , either the hostiles to get in range, or the number of squad to mathc homeroom.min_attack
     * @param creep
     * @returns {*}
     */
    accepts(creep) {
        let squad = this.getSquad(creep);
        // creep.log('squad?', squad.length);

        let leader = _.sortBy(squad, (b)=>b.name)[0];
        // creep.log(JSON.stringify(_.sortBy(squad, (b)=>b.name).map((c)=> c.name)))
        let isLeader = leader.name === creep.name;
        // creep.log("leader?", isLeader);
        let brotherFurthestToLeader = _.sortBy(squad, (c)=>-c.pos.getRangeTo(leader))[0];
        let maxDistanceToLeader = brotherFurthestToLeader.pos.getRangeTo(leader);
        let myDistanceToLeader = creep.pos.getRangeTo(leader);
        // do not prevent coming in
        let exitToHome = util.findExit(creep, creep.memory.homeroom);
        if (creep.pos.getRangeTo(exitToHome.x, exitToHome.y)< 3) return false;
        // if roster is not enough, regroup to exit
        // keep the squad together
        // creep.log('squad.length', squad.length, Game.rooms[creep.memory.homeroom].memory.attack_min);
        // creep.log('leader?', isLeader, myDistanceToLeader, 'max', maxDistanceToLeader);
        if (squad.length < Game.rooms[creep.memory.homeroom].memory.attack_min) {
            // let the leader lead the way, safely
            if (isLeader) {
                let exitToHome = util.findExit(creep, creep.memory.homeroom);
                // creep.log('exitToHome', JSON.stringify(exitToHome));
                let exitDist = creep.pos.getRangeTo(exitToHome.x, exitToHome.y);
                // creep.log('exit at?', exitDist);
                if (exitDist > 5) {
                    // creep.log('moving to exit');
                    util.safeMoveTo(creep, exitToHome);
                    return true;
                } else if (creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length) {
                    // creep.log('hostiles near regroup point, fighting');
                    return false;
                } else {
                    // creep.log('moving to exit2');
                    let pathToExit;
                    if (!creep.memory.pathToExit || !creep.memory.pathToExit.length || creep.pos.getRangeTo(creep.memory.pathToExit[0].x, creep.memory.pathToExit[0].y)>1) {
                        pathToExit  = creep.memory.pathToExit = util.safeMoveTo(creep, exitToHome);
                    } else {
                        pathToExit  = creep.memory.pathToExit;
                        if (creep.pos.getRangeTo(pathToExit[0].x, pathToExit[0].y) ==0) {
                            creep.memory.pathToExit = pathToExit = pathToExit.slice(1);
                        }
                    }
                    if (pathToExit && pathToExit.length) {
                        let moveTo = creep.moveTo(pathToExit[0].x,pathToExit[0].y);
                        // creep.log('waiting for reinforcements',moveTo , JSON.stringify(pathToExit[0]));
                    } else  {
                        creep.log('no path ??');
                    }

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
        // creep.log('squad read');
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
            // creep.log('no hostiles');
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
            // creep.log('ok, attack');
            return false;
        }

        if (isLeader) {
            // creep.log('isLeader');

            if (!creep.memory.path) {
                // creep.log('initializing path');
                creep.memory.path =[];
            }
            // creep.log('leader',maxDistanceToLeader,squad.length);
            // move forwards if everyone is nearby, otherwise go back
            if (maxDistanceToLeader < squad.length+1) {
                if (myRange <= 4) {
                    delete creep.memory.path[closestEnemy.id];
                    // determine best spot : need 2 available cells at range 3
                    // creep.log('deleting path');
                    return false;
                } else {
                    let damaged = squad.find((c)=>c.hits<c.hitsMax);
                    if (damaged) {
                        // creep.log('damaged member, healing');
                        // wait
                        creep.heal(damaged);
                        return true;
                    }
                    // creep.log('computing safe path');
                    let lastPos = creep.memory.lastPos || creep.pos;
                    let stoppedCounter = creep.memory.ticksAtLastPos||0;
                    if (this.samePos(lastPos, creep.pos)) {
                        creep.memory.ticksAtLastPos =stoppedCounter ++;
                    } else {
                        creep.memory.ticksAtLastPos =0;
                        creep.memory.lastPos = creep.pos;
                    }
                    let path = creep.memory.path[closestEnemy.id];
                    if (!path || path.length ===0) {
                        if (stoppedCounter < 3) {
                            path = creep.memory.path[closestEnemy.id] || util.safeMoveTo(creep, closestEnemy.pos);
                            creep.memory.path[closestEnemy.id] = path;
                        } else {
                            creep.memory.path[closestEnemy.id] = util.safeMoveTo(creep, closestEnemy.pos)
                            path = creep.memory.path[closestEnemy.id];
                        }
                    }
                    // creep.log(path[0], creep.memory.path[closestEnemy.id]);
                    if (this.samePos(path[0], creep.pos)) {
                        path.shift();
                    }
                    // creep.log('moving to enemy');
                    creep.moveTo(path[0]);
                    return true;
                }
            } else if (maxDistanceToLeader < 2*squad.length){
                // creep.log('too spread out, waiting');
                // just wait
                return true;
            } else {
                // creep.log('too spread out, gathering');
                util.safeMoveTo(creep, brotherFurthestToLeader.pos);
                return true;
            }
        } else {
            if (maxDistanceToLeader < squad.length) {
                if (myRange >4) {
                    let damaged = squad.find((c)=>c.hits<c.hitsMax);
                    if (damaged) {
                        // creep.log('damaged member, healing');
                        if (creep.pos.getRangeTo(damaged)>1) {
                            creep.moveTo(damaged);
                            creep.heal(damaged);
                            return true;
                        } else {
                            creep.heal(damaged);
                            return true;
                        }
                        // wait
                    }
                } else {
                    // creep.log('in range');
                    return false;
                }
            } else {
                //move to leader
                // creep.log('closing on leader', JSON.stringify(leader.pos));
                creep.moveTo(leader.pos);
                return true;
            }
        }
    }
    
    getSquad(creep) {
        creep.room.memory.squad = creep.room.memory.squad ||{};
        let needsUpdate = (creep.room.memory.squad.refreshed || 0) + SquadAttackStrategy.REFRESH_SQUAD < Game.time;
        // if (needsUpdate) creep.log('getSquad', true);
        if (needsUpdate) {
            creep.room.memory.squad = {refreshed:Game.time, members: creep.room.find(FIND_MY_CREEPS).filter((c)=>(c.memory.role === creep.memory.role)).map((c)=>c.id)};
        } else {
            // creep.log('count', creep.room.memory.squad.members.length);
            creep.room.memory.squad.members = creep.room.memory.squad.members.filter((id)=> {
                let member = Game.getObjectById(id);
                let b = member && member.room.name == creep.room.name;
                if (!b) {
                    // creep.log('filtering ! ', member, member.room.name, creep.room.name);
                }
                return b;
            });
            // creep.log('count2', creep.room.memory.squad.members.length);
        }
        // creep.log('getSquad', creep.room.memory.squad.members.length, creep.room.memory.squad.members);
        return creep.room.memory.squad.members.map((id)=>Game.getObjectById(id));

    }

    findLeaderTarget(leader, hostiles) {
        let nonKeepers = hostiles.filter((c)=>c.owner.username !== 'Keeper Source');
        if (!nonKeepers.length) {
            hostiles = nonKeepers;
        }
        return leader.pos.findClosestByRange(hostiles);
    }

    samePos(lastPos, pos) {
        return lastPos.x === pos.x && lastPos.y === pos.y && lastPos.roomName === pos.roomName;
    }
}
SquadAttackStrategy.REFRESH_SQUAD = 10;
module.exports = SquadAttackStrategy;