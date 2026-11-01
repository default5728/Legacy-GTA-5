'use strict';

/** Награды за ивенты фракций: AirDrop, перехват поставки FIB. */
const FACTION_EVENT_MATS_REWARD = 5000;
const FACTION_EVENT_MONEY_REWARD = 250000;

function getFactionEventMatsReward() {
    return typeof global.applyServerX2Amount === 'function'
        ? global.applyServerX2Amount(FACTION_EVENT_MATS_REWARD)
        : FACTION_EVENT_MATS_REWARD;
}

function getFactionEventMoneyReward() {
    return typeof global.applyServerX2Amount === 'function'
        ? global.applyServerX2Amount(FACTION_EVENT_MONEY_REWARD)
        : FACTION_EVENT_MONEY_REWARD;
}

module.exports = {
    FACTION_EVENT_MATS_REWARD,
    FACTION_EVENT_MONEY_REWARD,
    getFactionEventMatsReward,
    getFactionEventMoneyReward
};
