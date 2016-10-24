var Base = require('./strategy.base');
var util = require('./util');

class SquadAttackStrategy extends Base {
    constructor(range, predicate) {
        super();
        this.range = range || 3;
        this.predicate = predicate || (()=>(()=>true));
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

        let isAtBorder = (creep.pos.x % 49) < 2 || (creep.pos.y % 49) < 2;
        if (isAtBorder) {
            creep.log('overriding squad, near border');
        }
        let leader = (isAtBorder) ? creep : _.sortBy(squad, (b)=>b.name)[0];
        // creep.log(JSON.stringify(_.sortBy(squad, (b)=>b.name).map((c)=> c.name)))
        let isLeader = (!leader || leader.name === creep.name);
        let brotherFurthestToLeader = _.sortBy(squad, (c)=>-c.pos.getRangeTo(leader)).find(()=>true) || creep;

        let maxDistanceToLeader = brotherFurthestToLeader.pos.getRangeTo(leader);
        let myDistanceToLeader = creep.pos.getRangeTo(leader);
        // if roster is not enough, regroup to exit
        // keep the squad together
        let homeroomMem = Memory.rooms[creep.memory.homeroom];
        // creep.log('squad.length', squad.length, homeroomMem.attack_min);
        // creep.log('leader?', isLeader, myDistanceToLeader, 'max', maxDistanceToLeader, squad.length);
        let squadIsComplete = isAtBorder || (!homeroomMem.attack_min) || !homeroomMem.attack_min[creep.memory.remoteRoom]
            || (homeroomMem.attack_min && homeroomMem.attack_min[creep.memory.remoteRoom]
            && squad.length >= homeroomMem.attack_min[creep.memory.remoteRoom]);
        if (/*!isLeader && */!squadIsComplete) {
            // let the leader lead the way, safely
            creep.log('wait for brothers', homeroomMem.attack_min[creep.memory.remoteRoom]);
            return true;
        }
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS).filter(c=>c.hostile).filter(this.predicate(creep));
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
        let leaderTargets = leader.pos.findInRange(FIND_HOSTILE_CREEPS, 3).filter(c=>c.hostile);
        let leaderTarget = leaderTargets.length && _.min(leaderTargets, c=>c.pos.getRangeTo(leader.pos));
        if (myRange < 4) {
            // ok, attack
            // creep.log('ok, attack');
            return false;
        }

        if (isLeader) {
            creep.log('isLeader');

            // creep.log('leader',maxDistanceToLeader,squad.length);
            // move forwards if everyone is nearby, otherwise go back
            // if (maxDistanceToLeader < squad.length + 3) {
            if (myRange < 4) {
                // determine best spot : need 2 available cells at range 3
                creep.log('deleting path');
                return false;
            } else if (myRange < 6 && maxDistanceToLeader > 1) {
                // wait for brothers
                creep.log('wait for brothers');
                return true;
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
                    range: 2
                });
                return true;

            }
        } else {
            if (myRange > 6 && leaderTarget) {
                creep.moveTo(leaderTarget);
                return true;
            } else if (myRange > 3 && maxDistanceToLeader > 1) {
                let damaged = squad.find((c)=>c.hits < c.hitsMax);
                if (damaged) {
                    creep.log('damaged member, healing');
                    if (creep.pos.getRangeTo(damaged) > 1) {
                        creep.moveTo(damaged);
                        creep.heal(damaged);
                        return true;
                    } else {
                        creep.heal(damaged);
                        return true;
                    }
                    // wait
                } else {
                    creep.log('move to leader')
                    creep.moveTo(leader);
                    return true;
                }
            } else {
                return false;
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

    findAttackingPositions(creep, hostile) {
        // find walkable tiles around hostile
        // rate each tile with its range
        // find a tile  of range max, with n other tiles at range max touching it
        let center = hostile.pos;
        let range = 3;
        let area = hostile.room.glanceForAround(LOOK_TERRAIN, center, range);
        // console.log('center', JSON.stringify(center));
        let rangeTo = (center, x, y)=>Math.max(Math.abs(center.x - x), Math.abs(center.y - y));
        for (let y in area) {
            for (let x in area[y]) {
                let terrain = area[y][x][0];
                if (terrain === 'wall') {
                    area[y][x] = 0;
                } else {
                    let myRange = rangeTo(center, x, y);
                    area[y][x] = myRange;
                }
            }
        }
        // console.log('area', JSON.stringify(area));
        let mapAt = (array, x, y)=>(array[y] || [])[x] || 0;
        let minimumScore = range;
        let chosenPositions = [];
        for (let sy in area) {
            let y = Number.parseInt(sy);
            for (let sx in area[y]) {
                let x = Number.parseInt(sx);
                let positionsOk = [];
                if ((mapAt(area, x, y) >= minimumScore)) {
                    positionsOk.push({x: x, y: y});
                    if ((mapAt(area, x, y - 1) >= minimumScore)) {
                        positionsOk.push({x: x, y: y - 1});
                    }
                    if ((mapAt(area, x, y + 1) >= minimumScore)) {
                        positionsOk.push({x: x, y: y + 1});
                    }
                    if ((mapAt(area, x - 1, y) >= minimumScore)) {
                        positionsOk.push({x: x - 1, y: y});
                    }
                    if ((mapAt(area, x + 1, y) >= minimumScore)) {
                        positionsOk.push({x: x + 1, y: y});
                    }
                    if (positionsOk.length >= 3) {
                        chosenPositions.push(positionsOk);
                    }
                }
            }
        }
        if (chosenPositions.length > 0) {
            console.log('validPositions', chosenPositions.length);
            let chosen = chosenPositions.reduce((chosen,positions)=>{
                let myRange = creep.pos.getRangeTo(positions[0].x, positions[0].y);
                if (myRange< chosen.range) {
                    chosen.range = myRange;
                    chosen.positions = positions;
                }
                return chosen;
            }, {positions:[],range:Infinity});
            console.log('chosen', JSON.stringify(chosen));
            console.log('chosen', JSON.stringify(chosen.positions));
            return chosen.positions;
        }
    }
}
SquadAttackStrategy.REFRESH_SQUAD = 10;
require('./profiler').registerClass(SquadAttackStrategy, 'SquadAttackStrategy'); module.exports = SquadAttackStrategy;