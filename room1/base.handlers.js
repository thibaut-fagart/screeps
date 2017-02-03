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
    'defender': new Handler('defender', './role.soldier.defender'),
    'tower': new Handler('tower', './role.tower'),
    'keeperGuard': new Handler('keeperGuard', './role.soldier.keeperguard'),
    'energyFiller': new Handler('energyFiller', './role.energyfiller'),
    'upgradeFiller': new Handler('upgradeFiller', './role.upgradefiller'),
    'energyGatherer': new Handler('energyGatherer', './role.energygatherer'),
    'carry': new Handler('carry', './role.carry'),
    'claimer': new Handler('claimer', './role.controller.claim'),
    'keeperHarvester': new Handler('keeperHarvester', './role.remote_harvester.keeper'),
    'remoteCarryKeeper': new Handler('remoteCarryKeeper', './role.remote.carrykeeper'),
    'remoteCarry': new Handler('remoteCarry', './role.remote.carry'),
    'mineralGatherer': new Handler('mineralGatherer', './role.mineralgatherer'),
    'keeperMineralHarvester': new Handler('keeperMineralHarvester', './role.remote_mineralharvester.keeper'),
    'mineralTransport': new Handler('mineralTransport', './role.mineral.transporter'),
    'energyTransporter': new Handler('energyTransporter', './role.energy.transporter'),
    'upgrader': new Handler('upgrader', './role.upgrader'),
    'repair2': new Handler('repair2', './role.repair2'),
    'towerAttacker': new Handler('towerAttacker', './role.soldier.towerAttacker'),
    'attacker': new Handler('attacker', './role.soldier.attacker'),
    'remoteHarvester': new Handler('remoteHarvester', './role.remote_harvester'),
    'roleCloseGuard': new Handler('roleCloseGuard', './role.soldier.roomguard'),
    'roleSoldier': new Handler('roleSoldier', './role.soldier.roomguard'),
    'linkOperator': new Handler('linkOperator', './role.linkOperator'),
    'roleRemoteGuard': new Handler('roleRemoteGuard', './role.soldier.roomguard'),
    'labOperator': new Handler('labOperator', './role.lab_operator'),
    'towerDrainer': new Handler('towerDrainer', './role.soldier.towerdrainer'),
    'archer': new Handler('archer', './role.soldier.archer'),
    'harasser': new Handler('harasser', './role.soldier.archer'),
    'smallArcher': new Handler('smallArcher', './role.soldier.archer'),
    'recycle': new Handler('recycle', './role.recycle'),
    'remotePortalCarry': new Handler('remotePortalCarry', './role.remote_portalcarry'),
    'builder': new Handler('builder', './role.builder'),
    'reserver': new Handler('reserver', './role.controller.reserve'),
    'dismantler': new Handler('dismantler', './role.dismantler'),
    'remoteDismantler': new Handler('remoteDismantler', './role.dismantler.remote'),
    'looter': new Handler('looter', './role.looter'),
    'scout': new Handler('scout', './role.scout'),
    'scout2': new Handler('scout', './role.scout'),
    'remoteBuilder': new Handler('remoteBuilder', './role.builder.remote'),
    'remoteUpgrader': new Handler('remoteUpgrader', './role.remote.upgrader'),
    'mineralHarvester': new Handler('mineralHarvester', './role.harvester.mineral'),
    'remoteMineralHarvester': new Handler('remoteMineralHarvester', './role.harvester.mineral'),
};

module.exports = handlers;