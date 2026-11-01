'use strict';

const REGULAR_CASH_BY_CLOTH_ID = Object.freeze({
    0: 10000,
    1: 10000,
    2: 15000,
    3: 20000,
    4: 15000,
    5: 12000,
    6: 12000,
    7: 10000,
    8: 30000,
    12: 10000,
    13: 12000,
    14: 12000,
    15: 20000
});

const PREMIUM_DP_MIN_BY_CLOTH_ID = Object.freeze({
    0: 49,
    1: 49,
    2: 49,
    3: 59,
    4: 59,
    5: 69,
    6: 79,
    7: 69,
    8: 149,
    12: 79,
    13: 79,
    14: 79,
    15: 149
});

function clothIdOf(rowOrId) {
    if (rowOrId && typeof rowOrId === 'object') return Number(rowOrId.ClothID);
    return Number(rowOrId);
}

function regularCashPrice(rowOrId) {
    const cid = clothIdOf(rowOrId);
    const fallback=REGULAR_CASH_BY_CLOTH_ID[cid]||15000;
    return typeof global.legacyPrice==='function'?global.legacyPrice('clothing',String(cid),fallback):fallback;
}

function premiumCashPrice(row) {
    let price = Number(row && row.Price) + 50000;
    if (Number.isNaN(price) || price < 1) price = 1;
    return price;
}

/**
 * Legacy DP formula — кейсы и прочие системы, не премиальный магазин.
 */
function premiumDpPrice(row) {
    const cid = clothIdOf(row);
    const min = PREMIUM_DP_MIN_BY_CLOTH_ID[cid] || 59;
    const legacyCash = Math.max(1, Math.floor(Number(row && row.Price) || 0) + 50000);
    return Math.max(min, Math.min(399, Math.ceil(legacyCash / 5000)));
}

/**
 * Bloody used 10 Spectrum candies per DP. Keeping that ratio preserves
 * the original item hierarchy while removing the intermediate currency.
 */
function spectrumDpPrice(row) {
    const legacyCandy = Math.max(0, Math.floor(Number(row && row.Price) || 0));
    return Math.max(1, Math.ceil(legacyCandy / 10));
}

module.exports = {
    REGULAR_CASH_BY_CLOTH_ID,
    PREMIUM_DP_MIN_BY_CLOTH_ID,
    regularCashPrice,
    premiumCashPrice,
    premiumDpPrice,
    spectrumDpPrice
};
