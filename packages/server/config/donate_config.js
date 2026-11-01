'use strict';

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', 'donate_env.json');

const DEFAULTS = {
    DONATE_SECRET: 'k9F3xR7vN2qL8mZ5wY1pA4bC6dE0gH3jJ7sT2uV9wX6yZ0aB5cD8eF1gI4',
    DONATE_PORT: 8788,
    DONATE_PUBLIC_URL: 'https://flowdm.fun/donate',
    RUB_TO_DP: 2,
    PAYMENT_SBP_PHONE: '+7 977 987 54 81',
    PAYMENT_CARD_NUMBER: '2202 2082 4576 4171',
    PAYMENT_CARD_HOLDER: 'Ярослав',
    PAYMENT_BANK: 'Сбербанк'
};

/** Бонусов нет — обычный курс 1 ₽ = RUB_TO_DP. */
const DONATE_BONUS = [];

function loadDonateEnv() {
    try {
        if (fs.existsSync(ENV_PATH)) {
            const raw = JSON.parse(fs.readFileSync(ENV_PATH, 'utf8'));
            delete raw.TEST_MODE;
            return Object.assign({}, DEFAULTS, raw);
        }
    } catch (e) {
        console.log('[donate_config] donate_env.json read error:', e.message || e);
    }
    return Object.assign({}, DEFAULTS);
}

const cfg = loadDonateEnv();

function getDonatePublicUrl() {
    return String(cfg.DONATE_PUBLIC_URL || DEFAULTS.DONATE_PUBLIC_URL).replace(/\/+$/, '');
}

function getDonateSecret() {
    return String(cfg.DONATE_SECRET || DEFAULTS.DONATE_SECRET);
}

function getDonatePort() {
    const p = parseInt(cfg.DONATE_PORT, 10);
    return Number.isFinite(p) && p > 0 ? p : DEFAULTS.DONATE_PORT;
}

function getRubToDpRate() {
    const n = parseInt(cfg.RUB_TO_DP, 10);
    return Number.isFinite(n) && n > 0 ? n : DEFAULTS.RUB_TO_DP;
}

function calcDpFromRub(rubRaw) {
    const rub = Math.max(0, Math.floor(Number(rubRaw) || 0));
    if (!rub) return 0;
    let mult = 1;
    for (let i = 0; i < DONATE_BONUS.length; i++) {
        const row = DONATE_BONUS[i];
        if (rub >= row[0]) mult = row[1];
    }
    return Math.max(1, Math.floor(rub * getRubToDpRate() * mult));
}

function getPaymentDetails() {
    return {
        sbpPhone: String(cfg.PAYMENT_SBP_PHONE || DEFAULTS.PAYMENT_SBP_PHONE).trim(),
        cardNumber: String(cfg.PAYMENT_CARD_NUMBER || DEFAULTS.PAYMENT_CARD_NUMBER).trim(),
        cardHolder: String(cfg.PAYMENT_CARD_HOLDER || DEFAULTS.PAYMENT_CARD_HOLDER).trim(),
        bank: String(cfg.PAYMENT_BANK || DEFAULTS.PAYMENT_BANK).trim()
    };
}

module.exports = {
    DONATE_BONUS,
    getDonatePublicUrl,
    getDonateSecret,
    getDonatePort,
    getRubToDpRate,
    calcDpFromRub,
    getPaymentDetails
};
