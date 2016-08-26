global.FATIGUE = 'fatigue';
global.HARVEST = 'harvest';
global.BUILD = 'build';
global.REPAIR = 'repair';
global.DISMANTLE = 'dismantle';
global.UPGRADE_CONTROLLER = 'upgradeController';
global.RANGED_MASS_ATTACK = 'rangedMassAttack';
global.CAPACITY = 'capacity';
global.RANGED_HEAL = 'rangedHeal';
global.DAMAGE = 'damage';
global.FULL_ROAD_SPEED = 'fullRoadSpeed';
global.FULL_PLAIN_SPEED = 'fullPlainSpeed';
global.FULL_SWAMP_SPEED = 'fullSwampSpeed';
global.EMPTY_ROAD_SPEED = 'emptyRoadSpeed';
global.EMPTY_PLAIN_SPEED = 'emptyPlainSpeed';
global.EMPTY_SWAMP_SPEED = 'emptySwampSpeed';
class Requirements {
    constructor() {
        this.features = {};
    }

    /**
     * @param feature
     */
    maximize(feature) {
        if (feature) {
            this._maximize = feature;
            return this;
        } else {
            return this._maximize;
        }
    }

    minimum(feature, value) {
        this.features[feature] = value;
        return this;
    }

    accepts(body, factors) {
        let invalidFeatures = [];
        let bodyMakeup = _.countBy(body);
        let bodyFeatures = {};
        _.keys(factors).forEach((feature)=>bodyFeatures[feature] = bodyMakeup[CreepShaper.featureParts[feature]] * factors[feature]);
        let fatigueReduction = bodyFeatures[FATIGUE] * 2;
        let emptyFatigueIncrease = body.length - (bodyMakeup[MOVE] || 0) - (bodyMakeup[CARRY] || 0);
        let fullFatigueIncrease = body.length - (bodyMakeup[MOVE] || 0);
        _.keys(this.features).forEach(
            (feature)=> {
                switch (feature) {
                    case FULL_ROAD_SPEED : {
                        if (fatigueReduction / fullFatigueIncrease < this.features[feature]) {
                            invalidFeatures.push(FATIGUE);
                        }
                        break;
                    }
                    case FULL_PLAIN_SPEED :
                        if (fatigueReduction / (2 * fullFatigueIncrease) < this.features[feature]) {
                            invalidFeatures.push(FATIGUE);
                        }

                        break;
                    case  FULL_SWAMP_SPEED :
                        if (fatigueReduction / (10 * fullFatigueIncrease) < this.features[feature]) {
                            invalidFeatures.push(FATIGUE);
                        }
                        break;
                    case EMPTY_ROAD_SPEED : {
                        if (fatigueReduction / (emptyFatigueIncrease) < this.features[feature]) {
                            invalidFeatures.push(FATIGUE);
                        }
                        break;
                    }
                    case EMPTY_PLAIN_SPEED :
                        if (fatigueReduction / (2 * emptyFatigueIncrease) < this.features[feature]) {
                            invalidFeatures.push(FATIGUE);
                        }
                        break;
                    case  EMPTY_SWAMP_SPEED :
                        if (fatigueReduction / (2 * emptyFatigueIncrease) < this.features[feature]) {
                            invalidFeatures.push(FATIGUE);
                        }
                        break;
                    case DAMAGE :
                        if (isNaN(bodyFeatures[feature]) || bodyFeatures[feature] < this.features[feature]) {
                            invalidFeatures.push(feature);
                        }
                        break;
                    default:
                        if (isNaN(bodyFeatures[feature]) || bodyFeatures[feature] * CreepShaper.baseFeatures[feature] < this.features[feature]) {
                            invalidFeatures.push(feature);
                        }
                }
            }
        )
        ;
        return invalidFeatures;
    }
}
class CreepShaper {

    /**
     *
     * @param {Requirements} requirements
     * @param {{cache:{}, name, budget, availableBoosts}} options
     * @return {Array} the body
     */
    shape(requirements, options) {
        'use strict';
        let budget = _.isFunction(options.budget)?options.budget(): options.budget;
        let currentCost = 0;
        let factors =  this.factors(options);
        let lastValid = 0;
        let body = [];
        let bodyFeatures = {};

        currentCost = this.addPart(body, bodyFeatures, MOVE, factors, currentCost);
        let maximize = requirements.maximize();
        let complete = ()=>body.length >= 50 || currentCost > budget || (maximize ? false : lastValid);
        let canAfford = (part)=>currentCost + BODYPART_COST[part] <= budget;
        while (!complete()) {
            let invalidFeatures = requirements.accepts(body, factors);
            if (invalidFeatures.length == 0) {
                // console.log('valid', JSON.stringify(body));
                lastValid = body.length;
                if (maximize) {
                    let part = CreepShaper.featureParts[maximize];
                    if (canAfford(part)) {
                        currentCost = this.addPart(body, bodyFeatures, part, factors, currentCost);
                    } else {
                        complete = ()=>true;
                    }
                }
            } else {
                // console.log('invalid', JSON.stringify(body));
                let part = (invalidFeatures.indexOf(FATIGUE) >= 0) ? MOVE : CreepShaper.featureParts[invalidFeatures[0]];
                if (canAfford(part)) {
                    currentCost = lastValid ? this.insertPart(body, bodyFeatures, part, factors, currentCost, lastValid) : this.addPart(body, bodyFeatures, part, factors, currentCost);
                } else {
                    complete = ()=>true;
                }
            }
        }
        return lastValid?body.slice(0, lastValid):body;

    }

    /**
     *
     * @param {{cache:{}, name, budget, availableBoosts}} options
     */
    factors(options) {

        if (options.cache && options.name && options.cache[options.name] && options.cache[options.name].date  && options.cache[options.name].date > Game.time -1500 && options.cache[options.name].factors) {
            return options.cache[options.name].factors;
        }

        let boosts = (_.isFunction(options.availableBoosts) ? options.availableBoosts(): options.availableBoosts) ||[];
        let factors = {};
        let bestBoosts = {};
        _.keys(CreepShaper.featureParts).forEach((feature)=> {
            let boostingMinerals = _.keys(BOOSTS[CreepShaper.featureParts[feature]]).filter((min)=>BOOSTS[CreepShaper.featureParts[feature]][min][feature]);
            let matchingAvailableBoosts = boostingMinerals.filter((min)=>boosts.indexOf(min) >= 0);
            if (matchingAvailableBoosts.length) {
                let bestBoost = _.max(matchingAvailableBoosts, (min)=>BOOSTS[CreepShaper.featureParts[feature]][min][feature] || 0);
                // room.log('best boost' ,feature, bestBoost, JSON.stringify(boostingMinerals),JSON.stringify(matchingAvailableBoosts));
                bestBoosts[feature] = bestBoost;
                factors[feature] = BOOSTS[CreepShaper.featureParts[feature]][bestBoost][feature];
            } else {
                factors[feature] = 1;
            }
        });
        if (options.cache && options.name) {
            options.cache[options.name] = {date: Game.time, factors: factors};
        }
        return factors;
    }

    addPart(body, bodyFeatures, part, factors, cost) {
        CreepShaper.partFeatures[part].forEach((feature)=> {
            bodyFeatures[feature] = (bodyFeatures[feature] || 0) + factors[feature];
        });
        body.push(part);
        return cost + BODYPART_COST[part];
    }

    insertPart(body, bodyFeatures, part, factors, cost, index) {
        CreepShaper.partFeatures[part].forEach((feature)=> {
            bodyFeatures[feature] = (bodyFeatures[feature] || 0) + factors[feature];
        });
        body = body.splice(index, 0, part);
        return cost + BODYPART_COST[part];
    }

    requirements() {
        return new Requirements();
    }
}

/**
 * the parts that gives each feature, fatigue => carry etc
 */
CreepShaper.featureParts = (function () {
    let result = {};
    _.keys(BOOSTS).forEach((part)=> {
        'use strict';
        _.keys(BOOSTS[part]).forEach((boost)=> {
            _.keys(BOOSTS[part][boost]).forEach((feature) => {
                result [feature] = part;
            });
        });
    });
    return result;
})();
CreepShaper.partFeatures = (function () {
    let result = {};
    _.keys(BOOSTS).forEach((part)=> {
        'use strict';
        _.keys(BOOSTS[part]).forEach((boost)=> {
            _.keys(BOOSTS[part][boost]).forEach((feature) => {
                result[part] = result[part] || [];
                if (result[part].indexOf(feature) < 0) result[part].push(feature);
            });
        });
    });
    return result;
})();

CreepShaper.baseFeatures = (function () {
    let result = {};
    result[ATTACK] = ATTACK_POWER;
    result[RANGED_ATTACK] = RANGED_ATTACK_POWER;
    result[RANGED_MASS_ATTACK] = RANGED_ATTACK_POWER;
    result[HEAL] = HEAL_POWER;
    result[RANGED_HEAL] = RANGED_HEAL_POWER;
    result[HARVEST] = HARVEST_POWER;
    result[BUILD] = BUILD_POWER;
    result[REPAIR] = REPAIR_POWER;
    result[DISMANTLE] = DISMANTLE_POWER;
    result[UPGRADE_CONTROLLER] = UPGRADE_CONTROLLER_POWER;
    result[CAPACITY] = CARRY_CAPACITY;
    result[FATIGUE] = 2;
    result[DAMAGE] = 1;
    return result;
})();

global.EFFICIENT_BOOSTS = (function(){
    'use strict';
    return _.values(BOOSTS).reduce((acc, current)=>(acc.concat(_.keys(current))), []);
})();
/**
 *
 * @param {Room} room
 * @param {string} role
 */
module.exports = new CreepShaper();