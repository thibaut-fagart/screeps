var Base = require('./strategy.base');
var RegroupStrategy = require('./strategy.regroup');
var util = require('./util');

class SquadAttackStrategy extends Base {
    constructor(range, predicate) {
        super();
        this.range = range || 3;
        this.predicate = predicate || (function (creep) {
                return (target)=>true;
            })
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
        let isLeader = (!leader || leader.name === creep.name);
        let brotherFurthestToLeader = _.sortBy(squad, (c)=>-c.pos.getRangeTo(leader))[0];
        let maxDistanceToLeader = brotherFurthestToLeader.pos.getRangeTo(leader);
        let myDistanceToLeader = creep.pos.getRangeTo(leader);
        // if roster is not enough, regroup to exit
        // keep the squad together
        // creep.log('squad.length', squad.length, Game.rooms[creep.memory.homeroom].memory.attack_min);
        // creep.log('leader?', isLeader, myDistanceToLeader, 'max', maxDistanceToLeader, squad.length);
        if (!isLeader && Game.rooms[creep.memory.homeroom].memory.attack_min
            && Game.rooms[creep.memory.homeroom].memory.attack_min[creep.memory.remoteRoom]
            && squad.length < Game.rooms[creep.memory.homeroom].memory.attack_min[creep.memory.remoteRoom]) {
            // let the leader lead the way, safely
            // creep.log('wait for leader');
            return false;
        }
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS).filter(this.predicate(creep));
        // creep.log('hostiles ', hostiles.length);
        if (!hostiles.length) {
            // no hostiles
            // creep.log('no hostiles');
            this.setPreviousClosest(creep);
            if (myDistanceToLeader > squad.length) {
                creep.log('no hostiles, moving to leader');
                util.safeMoveTo(creep, leader.pos);
                return true;
                /*
                 } else if (myDistanceToLeader > 1 && myDistanceToLeader < squad.length) {
                 // creep.log('movingTo to leader');
                 creep.moveTo(leader.pos);
                 return true;
                 */
            }
            // creep.log('no hostiles');
            return false;
        }
        // creep.log('leader', leader, leader.name);
        // choose target
        let closestEnemy = this.findLeaderTarget(leader, hostiles);
        // creep.log('leaderTarget', closestEnemy);
        // and move to it, squad manner
        if (!closestEnemy) {
            return;
        }
        let myRange = closestEnemy.pos.getRangeTo(creep);
        // if (isLeader) creep.log('hostiles', hostiles.length, myRange, JSON.stringify(closestEnemy.pos));
        let rangeToLeader = leader.pos.getRangeTo(closestEnemy);
        if (myRange < 4 && rangeToLeader <= squad.length) {
            // ok, attack
            // creep.log('ok, attack');
            return false;
        }

        if (isLeader) {
            // creep.log('isLeader');

            // creep.log('leader',maxDistanceToLeader,squad.length);
            // move forwards if everyone is nearby, otherwise go back
            // if (maxDistanceToLeader < squad.length + 3) {
            if (myRange < 6 && maxDistanceToLeader > 3) {
                return true;
            } else if (myRange < 4) {
                // determine best spot : need 2 available cells at range 3
                creep.log('deleting path');
                return false;
            } else {
                let damaged = squad.find((c)=>c.hits < c.hitsMax);
                if (damaged) {
                    // creep.log('damaged member, healing');
                    // wait
                    creep.heal(damaged);
                    return true;
                }
                // creep.log('computing safe path');
                let lastPos = creep.memory.lastPos || creep.pos;
                let stoppedCounter = creep.memory.ticksAtLastPos || 0;
                if (this.samePos(lastPos, creep.pos)) {
                    creep.memory.ticksAtLastPos = stoppedCounter++;
                } else {
                    creep.memory.ticksAtLastPos = 0;
                    creep.memory.lastPos = creep.pos;
                }
                creep.log('moving to ennemy', closestEnemy.pos);
                util.moveTo(creep, closestEnemy.pos, this.constructor.name, {
                    avoidCreeps: true,
                    ignoreHostiles: true,
                    range: 3
                });
                return true;

                /*
                 let path = creep.memory.path[closestEnemy.id];
                 if (!path || path.length ===0) {
                 if (stoppedCounter < 3) {
                 creep.log('moving to ennemy');
                 util.moveTo(creep, closestEnemy.pos, this.constructor.name,{avoidCreeps:true, ignoreHostiles:true, range:3})
                 // path = creep.memory.path[closestEnemy.id] || util.safeMoveTo2(creep, closestEnemy.pos, {avoidCreeps:true, ignoreHostiles:true, range:3});
                 // creep.log('path', JSON.stringify(path));
                 // creep.memory.path[closestEnemy.id] = path;
                 return true;
                 } else {
                 creep.log('moving to ennemy2');
                 util.moveTo(creep, closestEnemy.pos, this.constructor.name,{avoidCreeps:true, ignoreHostiles:true, range:3})
                 // creep.memory.path[closestEnemy.id] = util.safeMoveTo2(creep, closestEnemy.pos, {avoidCreeps:true, ignoreHostiles:true, range:3});
                 // creep.log('path', JSON.stringify(path));
                 // path = creep.memory.path[closestEnemy.id];
                 return true;
                 }
                 } else {
                 // creep.log(path[0], creep.memory.path[closestEnemy.id]);
                 if (this.samePos(path[0], creep.pos)) {
                 path.shift();
                 }
                 // creep.log('moving to enemy');
                 creep.moveTo(path[0]);
                 return true;
                 }
                 */
            }
            /*  } else if (maxDistanceToLeader < 2 * squad.length) {
             // creep.log('too spread out, waiting');
             // just wait
             return true;
             } else {
             /!*
             // creep.log('too spread out, gathering');
             util.moveTo(creep, brotherFurthestToLeader.pos, this.constructor.name, {
             avoidCreeps: true,
             ignoreHostiles: true,
             range: 3
             });
             *!/
             // util.safeMoveTo(creep, brotherFurthestToLeader.pos);
             return true;
             }*/
        } else {
            if (maxDistanceToLeader < squad.length + 3) {
                if (myRange > 5) {
                    let damaged = squad.find((c)=>c.hits < c.hitsMax);
                    if (damaged) {
                        // creep.log('damaged member, healing');
                        if (creep.pos.getRangeTo(damaged) > 1) {
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
                if (myRange > 6) {
                    let leaderTarget = leader.getSquadTarget();
                    if (leaderTarget) {
                        creep.log('using leader target', leaderTarget);
                        util.moveTo(creep, leaderTarget, this.constructor.name, {
                            avoidCreeps: true,
                            ignoreHostiles: true,
                            range: 3
                        });
                        return true;
                    }
                }
                /*
                 //move to leader
                 // creep.log('closing on leader', JSON.stringify(leader.pos));
                 creep.moveTo(leader.pos);
                 return true;
                 */
            }
        }
    }

    getSquad(creep) {
        creep.room.memory.squad = creep.room.memory.squad || {};
        let needsUpdate = (creep.room.memory.squad.refreshed || 0) + SquadAttackStrategy.REFRESH_SQUAD < Game.time;
        // if (needsUpdate) creep.log('getSquad', true);
        if (needsUpdate) {
            creep.room.memory.squad = {
                refreshed: Game.time,
                members: creep.room.find(FIND_MY_CREEPS).filter((c)=>(c.memory.role === creep.memory.role)).map((c)=>c.id)
            };
        } else {
            // creep.log('count', creep.room.memory.squad.members.length);
            creep.room.memory.squad.members = creep.room.memory.squad.members.filter((id)=> Game.getObjectById(id));
            // creep.log('count2', creep.room.memory.squad.members.length);
        }
        // creep.log('getSquad', creep.room.memory.squad.members.length, creep.room.memory.squad.members);
        return creep.room.memory.squad.members.map((id)=>Game.getObjectById(id)).filter((creep)=>creep);

    }

    findLeaderTarget(leader, hostiles) {
        let nonKeepers = hostiles.filter((c)=>c.owner.username !== 'Source Keeper');
        // leader.log('nonKeepers', nonKeepers.length);
        if (nonKeepers.length) {
            hostiles = nonKeepers;
        }
        // leader.log('hostiles', hostiles.length);
        return leader.pos.findClosestByRange(hostiles);
    }

    samePos(lastPos, pos) {
        return lastPos.x === pos.x && lastPos.y === pos.y && lastPos.roomName === pos.roomName;
    }
}
SquadAttackStrategy.REFRESH_SQUAD = 10;
module.exports = SquadAttackStrategy;