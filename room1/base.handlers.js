var _ = require('lodash');
var util = require('./util');
class Handler {
    constructor(role, include) {
        this.role = role;
        this.include = include;
        this.handler = false;
    }

    run(creep) {
        if (!this.handler) {
            if (this.include) {
                this.handler = new (require(this.include));
            } else {
                creep.log('HANDLER: no include!!');
            }
        }
        return this.handler.run(creep);
    }

    class() {
        return require(this.include);
    }
}
let handlers = {
    'harvester': new Handler('harvester', './role.harvester'),
    'mineralHarvester': new Handler('mineralHarvester', './role.harvester.mineral'),
    'keeperGuard': new Handler('keeperGuard', './role.soldier.keeperguard'),
    'remoteCarryKeeper': new Handler('remoteCarryKeeper', './role.remote.carrykeeper'),
    'recycle': new Handler('recycle', './role.recycle'),
    'claimer': new Handler('claimer', './role.controller.claim'),
    'carry': new Handler('carry', './role.carry'),
    'keeperHarvester': new Handler('keeperHarvester', './role.remote_harvester.keeper'),
    'energyFiller': new Handler('energyFiller', './role.energyfiller'),
    'energyGatherer': new Handler('energyGatherer', './role.energygatherer'),
    'mineralGatherer': new Handler('mineralGatherer', './role.mineralgatherer'),
    'remoteCarry': new Handler('remoteCarry', './role.remote.carry'),
    'upgrader': new Handler('upgrader', './role.upgrader'),
    'repair2': new Handler('repair2', './role.repair2'),
    'reserver': new Handler('reserver', './role.controller.reserve'),
    'builder': new Handler('builder', './role.builder'),
    'scout': new Handler('scout', './role.scout'),
    'remoteBuilder': new Handler('remoteBuilder', './role.builder.remote'),
    'attacker': new Handler('attacker', './role.soldier.attacker'),
    'remoteHarvester': new Handler('remoteHarvester', './role.remote_harvester'),
    'roleRemoteGuard': new Handler('roleRemoteGuard', './role.soldier.roomguard'),
    'roleCloseGuard': new Handler('roleCloseGuard', './role.soldier.roomguard'),
    'roleSoldier': new Handler('roleSoldier', './role.soldier.roomguard'),
    'labOperator': new Handler('labOperator', './role.lab_operator'),
    'tower': new Handler('tower', './role.tower'),
    'towerDrainer': new Handler('towerDrainer', './role.soldier.towerdrainer'),
};

module.exports = handlers;