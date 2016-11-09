module.exports = {};
let goals;
function getResourceGoals() {
    if (!goals) {
        let resources = {};
        let MILITARY_T3_TARGET = 25000 ;
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
module.exports.printResources = function () {
    var resourceMap = this.globalLedger();
    console.log(generateReport(resourceMap));

};
