module.exports = {};
let goals;
function getResourceGoals() {
    if (!goals) {
        let resources = {};
        let MILITARY_T3_TARGET = 25000;
        let GHODIUM_TARGET = 5000;
        let T3_UPGRADE_TARGET = 10000;
        let T1_TARGET = 5000;

        resources[RESOURCE_OXYGEN] = T1_TARGET;
        resources[RESOURCE_HYDROGEN] = T1_TARGET;
        resources[RESOURCE_LEMERGIUM] = T1_TARGET;
        resources[RESOURCE_UTRIUM] = T1_TARGET;
        resources[RESOURCE_KEANIUM] = T1_TARGET;
        resources[RESOURCE_ZYNTHIUM] = T1_TARGET;
        resources[RESOURCE_CATALYST] = T1_TARGET;
        resources[RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE] = MILITARY_T3_TARGET;
        resources[RESOURCE_CATALYZED_UTRIUM_ACID] = MILITARY_T3_TARGET;
        resources[RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE] = MILITARY_T3_TARGET;
        resources[RESOURCE_CATALYZED_KEANIUM_ALKALIDE] = MILITARY_T3_TARGET;
        resources[RESOURCE_CATALYZED_GHODIUM_ALKALIDE] = MILITARY_T3_TARGET;
        resources[RESOURCE_GHODIUM] = GHODIUM_TARGET;
        resources[RESOURCE_CATALYZED_GHODIUM_ACID] = T3_UPGRADE_TARGET;
        goals = resources;
    }
    return goals;
}
function getPercentColorCode(percent) {
    if (percent <= 0.2) {
        return 'FF0000';
    }
    if (percent <= 0.4) {
        return 'FF5D00';
    }
    if (percent <= 0.6) {
        return 'FFE100';
    }
    if (percent <= 0.8) {
        return '9DFF00';
    }
    if (percent > 0.8) {
        return '4EDA78';
    }
    return 'FF0000';
}
function generateReport(resourceMap) {
    let report = '<table><tr><th>RESOURCE </th><th>| AMOUNT </th><th>| GOAL </th><th> | PERCENT</th></tr>';
    for (let resource in resourceMap) {
        let percent = _.round((resourceMap[resource].amount / resourceMap[resource].goal), 2);
        let colorCode = getPercentColorCode(percent);
        report +=
            '<tr><td>' + resource + ' </td><td>| <font color="#' + colorCode + '">' + resourceMap[resource].amount + '</font></td><td>| ' + resourceMap[resource].goal + '</td><td> | ' + _.round(percent * 100, 0) + '%</td></tr>';
    }
    report += '</table>';
    return report;
}

function generateProductionReport(map) {
    let report = '<table><tr><th>ROOM </th><th>| PRODUCTION </th><th>| AVAILABLE </th></tr>';
    for (let roomName in map) {
        report +=
            `<tr><td>${roomName} </td><td>| ${map[roomName].production}</td><td>| ${map[roomName].available}</td></tr>`;
    }
    report += '</table>';
    return report;
}

module.exports.globalLedger = function () {
    let resourceMap = {};
    _.forEach(Game.rooms, room => {
        if (!(room.controller && room.controller.my && room.controller.level >= 6)) {
            return;
        }
        let desired = room.desiredLedger;
        let current = room.currentLedger;
        let mix = _.uniq(_.keys(desired).concat(_.keys(current)));
        mix.forEach(resource => {
            resourceMap[resource] = resourceMap[resource] || {amount: 0, goal: 0};
            resourceMap[resource].amount += current[resource] || 0;
            resourceMap[resource].goal += desired[resource] || 0;
        });
    });
    return resourceMap;
};
module.exports.rcl8 = ()=>_.values(Game.rooms).filter(r=>r.controller && r.controller.my && r.controller.level === 8);
module.exports.productionData = ()=> {
    'use strict';
    let reactions = require('./role.lab_operator').reactions;
    let data = module.exports.rcl8()
        .filter(r=>r.lab_production)
        .reduce((acc, r)=> {
            acc[r.name] = {
                production: r.lab_production,
                available: reactions[r.lab_production].reduce(
                    (total, min)=>Math.min(
                        total,
                        r.structures[STRUCTURE_LAB].reduce((total, lab)=>(lab.mineralType === min ? lab.mineralAmount : 0), 0) + (r.currentLedger[min] || 0)
                    ), Infinity)
            };
            return acc;
        }, {});
    return data;
};
module.exports.printResources = function () {
    var resourceMap = this.globalLedger();
    console.log(generateReport(resourceMap));

};
module.exports.printProductions = function () {
    var map = this.productionData();
    console.log(generateProductionReport(map));

};

/**
 * 1 table per mineral
 * 1 table for sources (number of sources in columns)
 * 1 table for portals
 * TODO
 * @returns {string}
 */
module.exports.scout = function () {
    let scoutData = _.keys(Memory.rooms).reduce((acc, rname)=> {
        if (Memory.rooms[rname].scouted) {
            let raw = Memory.rooms[rname].scouted;
            let data = {};
            data.name = rname;
            data.age = Game.time - raw.time;
            data.mineral = raw.minerals && raw.minerals.length ? _.head(raw.minerals) : '';
            data.portal = raw.portal ? {
                to: raw.portal.destination.roomName,
                decayIn: raw.portal.decayAt ? raw.portal.decayAt - Game.time : 'stable'
            } : undefined;
            data.sources = raw.sourceCount || 0;
            acc[rname] = data;
        }
        return acc;
    }, {});

    let report = '<table><tr><th colspan="3">PORTALS</th></tr><tr><th>ROOM </th><th>| STABLE</th><th>| TO</th></tr>';
    scoutData.forEach(data=> {
        if (data.portal) {
            report += `<tr><td>${data.name}</td><td>${data.portal.destination}</td><td>${data.portal.decay}</td></tr>`;
        }
    });
    report += '</table>';
    report += '<table><tr><th>ROOM </th><th>|AGE </th><th>| MINERAL </th><th>| SOURCES</th></tr>';
    let ageSorted = _.sortBy(_.keys(scoutData), k=>scoutData[k].age);
    ageSorted.forEach(roomName => {
        try {
            let mineralColorCode = scoutData[roomName].mineral ? getPercentColorCode(Number.parseInt(/.(\d)/.exec(scoutData[roomName].mineral)[1]) / 4) : getPercentColorCode(0);
            let sourceColorCode = scoutData[roomName].sources ? getPercentColorCode(Number.parseInt(/.\d/.exec(scoutData[roomName].sources)) / 2) : getPercentColorCode(0);
            let ageColorCode = getPercentColorCode(Math.max(15000 - scoutData[roomName].age, 0) / 15000);

            report +=
                `<tr><td>${roomName} </td><td>|<font color="#${ageColorCode}">${scoutData[roomName].age}</font> </td><td>|<font color="#${mineralColorCode}"> ${scoutData[roomName].mineral}</font></td><td>| <font color="#' + ${sourceColorCode} + '">${scoutData[roomName].sources}</font></td></tr>`;
        } catch (e) {
            console.log(e);
            console.log(JSON.stringify(scoutData[roomName]));

        }
    });
    report += '</table>';
    return report;


};
