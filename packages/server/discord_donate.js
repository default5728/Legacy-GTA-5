/**
 * Discord-донат Moon DM: привязка логина/статика, покупка DP через Platega.
 * Курс: 1 ₽ = 2 DP.
 */
'use strict';

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const {
    getDiscordEnvValue,
    postChannelMessage,
    patchChannelMessage,
    interactionCallback,
    discordRequest,
    findBotPanelMessage
} = require('./discord_api.js');

require('./donate_credit.js');
require('./donate_fulfill.js');
const promoCodes = require('./promo_codes.js');

const PANEL_CHANNEL_ID = '1534361420093849620';
const SUPPORT_PANEL_CHANNEL_ID = '1534361436266954783';
const SUPPORT_ROLE_ID = '1534231417100435557';
const RECEIPT_CHANNEL_ID = '1534361734838616234';
const RUB_TO_DP = 2;
const MIN_DP = 2;
const MAX_DP = 300000;
const WEB_MIN_RUB = 50;
const WEB_MAX_RUB = 100000;
const WEB_DONATE_X2 = false;
const WEB_TOPUP_BONUSES = [];
const WEB_PACKS = global.WEB_DONATE_PACKS || {
    1: { rub: 299, dp: 600, name: 'Новичок' },
    2: { rub: 499, dp: 1000, name: 'Боец' },
    3: { rub: 799, dp: 1600, name: 'Ветеран' },
    4: { rub: 1299, dp: 2600, name: 'Легенда' }
};
const MIN_SUPPORT_RUB = 1;
const SUPPORT_ROLE_MIN_RUB = 500;
const MAX_SUPPORT_RUB = 1000000;
const PLATEGA_HOST = 'app.platega.io';
const PAYMENT_METHOD_SBP = 2;
const PAYMENT_METHOD_CRYPTO = 13;

const PAYMENT_METHODS = {
    sbp: { id: PAYMENT_METHOD_SBP, label: 'СБП', manual: false },
    crypto: { id: PAYMENT_METHOD_CRYPTO, label: 'Криптовалюта', manual: false },
    card: { id: null, label: 'Карта', manual: true },
    sber: { id: null, label: 'Сбер', manual: true }
};

/** discordId → 'sbp' | 'crypto' | 'sber' | 'card' */
const pendingPayMethodByDiscord = new Map();
/** discordId → { rub, methodKey } — поток поддержки проекта (без привязки к игре и DP) */
const pendingSupportByDiscord = new Map();
/** transactionId → label способа оплаты (для чека) */
const orderPayMethodLabel = new Map();
/** manual tx → { channelId, messageId } заявки в канале чеков */
const pendingSberAdminMsg = new Map();

let getPaymentDetailsFn = null;
try {
    getPaymentDetailsFn = require('./config/donate_config.js').getPaymentDetails;
} catch (_e) {
    getPaymentDetailsFn = function () {
        return {
            sbpPhone: '+7 977 987 54 81',
            cardNumber: '2202 2082 4576 4171',
            cardHolder: 'Ярослав',
            bank: 'Сбербанк'
        };
    };
}

const AGREEMENT_URL = 'https://telegra.ph/Polzovatelskoe-soglashenie-04-01-19';
const PRIVACY_URL = 'https://telegra.ph/Politika-konfidencialnosti-06-21-31';

let tablesReady = false;
let panelPublished = false;

function uuid() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return crypto.randomBytes(16).toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

function getPlategaMerchantId() {
    return getDiscordEnvValue('PLATEGA_MERCHANT_ID', '');
}

function getPlategaSecret() {
    return getDiscordEnvValue(
        'PLATEGA_SECRET',
        'A6EdsL8oR3kt82M8bqRk9aU9hQfRRUadSTjssuoTLCFP2G4RvUE0kUQZsCw4P1XLpskahr0tUsAO2Yfp3OQgIIX9FWwsaBxUgOjn'
    );
}

function getPanelChannelId() {
    return getDiscordEnvValue('DISCORD_DONATE_CHANNEL_ID', PANEL_CHANNEL_ID);
}

function getReceiptChannelId() {
    return getDiscordEnvValue('DISCORD_RECEIPTS_CHANNEL_ID', RECEIPT_CHANNEL_ID);
}

function getSupportPanelChannelId() {
    return getDiscordEnvValue('DISCORD_SUPPORT_CHANNEL_ID', SUPPORT_PANEL_CHANNEL_ID);
}

function getSupportRoleId() {
    return getDiscordEnvValue('DISCORD_SUPPORT_ROLE_ID', SUPPORT_ROLE_ID);
}

function getDiscordGuildId() {
    return getDiscordEnvValue('DISCORD_GUILD_ID', '');
}

function getReturnUrl() {
    return getDiscordEnvValue('PLATEGA_RETURN_URL', 'https://flowdm.fun');
}

function ephemeral(content) {
    return { type: 4, data: { content: String(content || ''), flags: 64 } };
}

function deferEphemeral() {
    return { type: 5, data: { flags: 64 } };
}

function followUp(interaction, content, components) {
    const body = { content: String(content || ''), flags: 64 };
    if (components) body.components = components;
    return discordRequest(
        'POST',
        '/webhooks/' + interaction.application_id + '/' + interaction.token,
        body
    );
}

function editWebhookMessage(applicationId, token, messageId, content, components) {
    const body = { content: String(content || '') };
    if (components !== undefined) body.components = components || [];
    const mid = messageId ? String(messageId) : '@original';
    return discordRequest(
        'PATCH',
        '/webhooks/' + applicationId + '/' + token + '/messages/' + mid,
        body
    );
}

/**
 * Интеракцию уже подтвердил другой ответчик (например, параллельный gateway
 * standalone-процесса). Отвечать/дублировать нельзя — ошибку считаем нефатальной.
 */
function isAlreadyAcked(err) {
    if (!err) return false;
    const m = String(err && err.message ? err.message : err);
    return /already been acknowledged|unknown interaction/i.test(m);
}

/** txId → { applicationId, token, messageId } для ответа в эпиhemeral вместо ЛС */
const pendingPaidNotify = new Map();

function buildPaidNotifyContent(order, roleGranted) {
    if (Number(order.support_project) === 1) {
        if (roleGranted) {
            return (
                '**Спасибо за поддержку проекта!**\n' +
                '**Сумма: `' +
                order.rub +
                ' ₽`**\n' +
                '**Вам выдана роль «Помог проекту».**'
            );
        }
        return (
            '**Спасибо за поддержку проекта!**\n' +
            '**Сумма: `' +
            order.rub +
            ' ₽`**\n' +
            '**Роль «Помог проекту» выдаётся от ' +
            SUPPORT_ROLE_MIN_RUB +
            ' ₽ суммарно по всем твоим поддержкам.**'
        );
    }
    return (
        '**Оплата получена!**\n' +
        '**На аккаунт** `' +
        order.login +
        '` **(#' +
        order.static +
        ') зачислено ' +
        order.dp +
        ' DP (' +
        order.rub +
        ' ₽).**\n' +
        '**Спасибо за поддержку Moon DM!**'
    );
}

function notifyBuyerPaid(order, roleGranted) {
    const tx = String(order.transaction_id || '');
    const ctx = pendingPaidNotify.get(tx);
    if (ctx) pendingPaidNotify.delete(tx);
    const content = buildPaidNotifyContent(order, roleGranted);
    if (!ctx || !ctx.applicationId || !ctx.token) {
        return Promise.resolve();
    }
    return editWebhookMessage(ctx.applicationId, ctx.token, ctx.messageId, content, [])
        .catch(function (err) {
            console.log('[discord_donate] paid notify edit:', err.message || err);
            return discordRequest(
                'POST',
                '/webhooks/' + ctx.applicationId + '/' + ctx.token,
                { content: content, flags: 64 }
            ).catch(function (e2) {
                console.log('[discord_donate] paid notify followup:', e2.message || e2);
            });
        });
}

function plategaErrorMessage(statusCode, chunks, parsed) {
    const raw = String(chunks || '');
    if (/<!DOCTYPE|<html/i.test(raw)) {
        return 'Platega временно недоступна (HTTP ' + statusCode + ')';
    }
    const fromJson = parsed && (parsed.message || parsed.error || parsed.title);
    const msg = String(fromJson || raw || ('HTTP ' + statusCode));
    return msg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function plategaRequest(method, pathUrl, bodyObj) {
    const merchantId = getPlategaMerchantId();
    const secret = getPlategaSecret();
    if (!merchantId) {
        return Promise.reject(new Error('PLATEGA_MERCHANT_ID не задан в discord_env.json (UUID из кабинета Platega → Настройки)'));
    }
    if (!secret) {
        return Promise.reject(new Error('PLATEGA_SECRET не задан'));
    }
    const body = bodyObj ? JSON.stringify(bodyObj) : null;
    const opts = {
        hostname: PLATEGA_HOST,
        path: pathUrl,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-MerchantId': merchantId,
            'X-Secret': secret,
            Accept: 'application/json'
        }
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body, 'utf8');

    return new Promise(function (resolve, reject) {
        let settled = false;
        const finish = function (err, data) {
            if (settled) return;
            settled = true;
            if (err) reject(err);
            else resolve(data);
        };
        const req = https.request(opts, function (res) {
            let chunks = '';
            res.on('data', function (c) {
                chunks += c;
            });
            res.on('end', function () {
                let parsed = null;
                try {
                    parsed = chunks ? JSON.parse(chunks) : {};
                } catch (_e) {
                    parsed = { raw: chunks };
                }
                if (res.statusCode >= 400) {
                    return finish(new Error(plategaErrorMessage(res.statusCode, chunks, parsed)));
                }
                finish(null, parsed || {});
            });
        });
        req.on('error', function (err) {
            finish(err || new Error('Platega network error'));
        });
        req.setTimeout(15000, function () {
            try { req.destroy(); } catch (_e) {}
            finish(new Error('Platega не ответила (таймаут)'));
        });
        if (body) req.write(body, 'utf8');
        req.end();
    });
}

function createPlategaPayment(amountRub, description, payload, paymentMethod) {
    const txId = uuid();
    const returnUrl = getReturnUrl();
    const methodId = Number(paymentMethod) || PAYMENT_METHOD_SBP;
    return plategaRequest('POST', '/transaction/process', {
        paymentMethod: methodId,
        id: txId,
        paymentDetails: {
            amount: Number(amountRub),
            currency: 'RUB'
        },
        description: String(description || 'Moon DM Donate').slice(0, 200),
        return: returnUrl,
        failedUrl: returnUrl,
        payload: String(payload || txId).slice(0, 200)
    }).then(function (res) {
        return {
            transactionId: String(res.transactionId || res.id || txId),
            redirect: String(res.redirect || res.paymentUrl || res.url || ''),
            status: String(res.status || 'PENDING'),
            paymentMethod: methodId,
            raw: res
        };
    });
}

function getPlategaStatus(transactionId) {
    return plategaRequest('GET', '/transaction/' + encodeURIComponent(transactionId), null);
}

function ensureTables(cb) {
    if (!global.DB || typeof global.DB.query !== 'function') {
        if (cb) cb(new Error('db_unavailable'));
        return;
    }
    const sqls = [
        `CREATE TABLE IF NOT EXISTS discord_donate_binds (
            discord_id VARCHAR(32) NOT NULL PRIMARY KEY,
            login VARCHAR(64) NOT NULL,
            static INT UNSIGNED NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ddb_login (login),
            INDEX idx_ddb_static (static)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS discord_donate_orders (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            transaction_id VARCHAR(64) NOT NULL,
            discord_id VARCHAR(32) NOT NULL,
            login VARCHAR(64) NOT NULL,
            static INT UNSIGNED NOT NULL,
            rub INT NOT NULL DEFAULT 0,
            dp INT NOT NULL DEFAULT 0,
            status ENUM('pending','paid','canceled') NOT NULL DEFAULT 'pending',
            pay_url TEXT NULL,
            support_project TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMP NULL,
            UNIQUE KEY uq_ddo_tx (transaction_id),
            INDEX idx_ddo_discord (discord_id),
            INDEX idx_ddo_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        'ALTER TABLE discord_donate_orders ADD COLUMN support_project TINYINT(1) NOT NULL DEFAULT 0',
        'ALTER TABLE discord_donate_orders ADD COLUMN pack_id INT NOT NULL DEFAULT 0',
        'ALTER TABLE discord_donate_orders ADD COLUMN item_model VARCHAR(32) NULL',
        'ALTER TABLE discord_donate_orders ADD COLUMN item_color VARCHAR(16) NULL',
        'ALTER TABLE discord_donate_orders ADD COLUMN admin_level TINYINT UNSIGNED NOT NULL DEFAULT 0',
        'ALTER TABLE discord_donate_orders ADD COLUMN promo_code VARCHAR(32) NULL',
        'ALTER TABLE discord_donate_orders ADD COLUMN base_rub INT NOT NULL DEFAULT 0',
        'ALTER TABLE discord_donate_orders ADD COLUMN discount_rub INT NOT NULL DEFAULT 0',
        `CREATE TABLE IF NOT EXISTS web_donate_promo_uses (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            promo_code VARCHAR(32) NOT NULL,
            static INT UNSIGNED NOT NULL,
            transaction_id VARCHAR(64) NULL,
            used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_web_promo_static (promo_code, static),
            INDEX idx_web_promo_code (promo_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];
    let i = 0;
    function next(err) {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            if (cb) cb(err);
            return;
        }
        if (i >= sqls.length) {
            tablesReady = true;
            if (cb) cb(null);
            return;
        }
        global.DB.query(sqls[i++], [], next);
    }
    next(null);
}

function dbQuery(sql, params) {
    return new Promise(function (resolve, reject) {
        if (!global.DB || typeof global.DB.query !== 'function') {
            return reject(new Error('db_unavailable'));
        }
        global.DB.query(sql, params || [], function (err, rows) {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
}

function getBind(discordId) {
    return dbQuery('SELECT login, static FROM discord_donate_binds WHERE discord_id = ? LIMIT 1', [
        String(discordId)
    ]).then(function (rows) {
        return rows[0] || null;
    });
}

function setBind(discordId, login, staticId) {
    return dbQuery(
        `INSERT INTO discord_donate_binds (discord_id, login, static)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE login = VALUES(login), static = VALUES(static)`,
        [String(discordId), String(login), parseInt(staticId, 10)]
    );
}

function findAccount(login, staticId) {
    return dbQuery(
        'SELECT login, static FROM accounts WHERE LOWER(login) = LOWER(?) AND static = ? LIMIT 1',
        [String(login), parseInt(staticId, 10)]
    ).then(function (rows) {
        return rows[0] || null;
    });
}

function findAccountByStatic(staticId) {
    const sid = parseInt(staticId, 10);
    if (!sid || sid < 1) return Promise.resolve(null);
    return dbQuery('SELECT login, static FROM accounts WHERE static = ? LIMIT 1', [sid]).then(function (rows) {
        return rows[0] || null;
    });
}

function calcWebDpFromRub(rubRaw) {
    const amount = Math.max(0, Math.floor(Number(rubRaw) || 0));
    if (!amount) return 0;
    let mult = 1;
    for (let i = 0; i < WEB_TOPUP_BONUSES.length; i++) {
        const tier = WEB_TOPUP_BONUSES[i];
        if (amount >= tier[0]) {
            mult = tier[1];
            break;
        }
    }
    const eventMult = WEB_DONATE_X2 ? 2 : 1;
    return Math.max(1, Math.floor(amount * RUB_TO_DP * mult * eventMult));
}

function insertOrder(row) {
    return dbQuery(
        `INSERT INTO discord_donate_orders
          (transaction_id, discord_id, login, static, rub, dp, status, pay_url, support_project, pack_id, item_model, item_color, admin_level, promo_code, base_rub, discount_rub)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            row.transactionId,
            row.discordId,
            row.login,
            row.static,
            row.rub,
            row.dp,
            row.payUrl || null,
            row.supportProject ? 1 : 0,
            parseInt(row.packId, 10) || 0,
            row.itemModel || null,
            row.itemColor || null,
            parseInt(row.adminLevel, 10) || 0,
            row.promoCode || null,
            parseInt(row.baseRub, 10) || 0,
            parseInt(row.discountRub, 10) || 0
        ]
    );
}

function webPromoAlreadyUsed(code, staticId) {
    const key = promoCodes.normalizePromoCode(code);
    const sid = parseInt(staticId, 10);
    if (!key || !sid || !promoCodes.isOncePerStatic(key)) {
        return Promise.resolve(false);
    }
    return dbQuery('SELECT 1 FROM web_donate_promo_uses WHERE promo_code = ? AND static = ? LIMIT 1', [
        key,
        sid
    ]).then(function (rows) {
        return !!(rows && rows.length);
    });
}

function assertWebPromoAvailable(code, staticId) {
    const key = promoCodes.normalizePromoCode(code);
    if (!key || !promoCodes.lookupPromo(key)) {
        return Promise.resolve({
            ok: false,
            error: 'invalid_promo',
            message: 'Промокод не найден или недействителен'
        });
    }
    if (!promoCodes.isOncePerStatic(key)) {
        return Promise.resolve({ ok: true, code: key });
    }
    return webPromoAlreadyUsed(key, staticId).then(function (used) {
        if (used) {
            return {
                ok: false,
                error: 'promo_already_used',
                message: 'Этот промокод уже использован на данном Static ID'
            };
        }
        return { ok: true, code: key };
    });
}

function recordWebPromoUse(order) {
    const key = promoCodes.normalizePromoCode(order && order.promo_code);
    const sid = parseInt(order && order.static, 10);
    if (!key || !sid || !promoCodes.isOncePerStatic(key)) {
        return Promise.resolve();
    }
    return dbQuery(
        'INSERT IGNORE INTO web_donate_promo_uses (promo_code, static, transaction_id) VALUES (?, ?, ?)',
        [key, sid, String(order.transaction_id || '')]
    ).catch(function (err) {
        console.log('[discord_donate] promo use record:', err.message || err);
    });
}

function resolveWebDonateRub(body, staticId) {
    const packIdGuess = parseInt(body.pack_id, 10) || 0;
    const itemModel = String(body.item_model || '').toLowerCase();
    const itemColor = String(body.item_color || '');
    const adminLevel = parseInt(body.admin_level, 10) || 0;
    let packId = packIdGuess;
    let rub = 0;
    let resolvedItem = null;
    let resolvedAdmin = null;

    if ((!packId || !WEB_PACKS[packId]) && !itemModel && !adminLevel) {
        const rubGuess = Math.floor(Number(body.amount_rub) || 0);
        const packIds = Object.keys(WEB_PACKS);
        for (let i = 0; i < packIds.length; i++) {
            const id = parseInt(packIds[i], 10);
            if (WEB_PACKS[id] && WEB_PACKS[id].rub === rubGuess) {
                packId = id;
                break;
            }
        }
    }

    if (adminLevel > 0) {
        resolvedAdmin =
            typeof global.resolveWebDonateAdmin === 'function' ? global.resolveWebDonateAdmin(adminLevel) : null;
        if (!resolvedAdmin) {
            return { error: 'invalid_admin', message: 'Неизвестный уровень админки' };
        }
        if (staticId === 1 || staticId === 2 || staticId === 100) {
            return {
                error: 'protected_static',
                message: 'Для этого Static ID покупка админки недоступна'
            };
        }
        rub = resolvedAdmin.spec.rub;
    } else if (itemModel === 'pait' || itemModel === 'patrontazh') {
        resolvedItem =
            typeof global.resolveWebDonateItem === 'function'
                ? global.resolveWebDonateItem(itemModel, itemColor)
                : null;
        if (!resolvedItem) {
            return { error: 'invalid_item', message: 'Неизвестная донат-вещь' };
        }
        rub = resolvedItem.spec.rub;
    } else if (packId > 0) {
        const pack = WEB_PACKS[packId];
        if (!pack) {
            return { error: 'invalid_pack', message: 'Неизвестный набор' };
        }
        rub = pack.rub;
    } else {
        rub = Math.floor(Number(body.amount_rub) || 0);
        if (rub < WEB_MIN_RUB) {
            return { error: 'min_amount', message: 'Минимум ' + WEB_MIN_RUB + ' ₽', min: WEB_MIN_RUB };
        }
        if (rub > WEB_MAX_RUB) {
            return { error: 'max_amount', message: 'Слишком большая сумма', max: WEB_MAX_RUB };
        }
    }

    return {
        rub: rub,
        packId: packId,
        itemModel: itemModel,
        itemColor: itemColor,
        adminLevel: adminLevel,
        resolvedItem: resolvedItem,
        resolvedAdmin: resolvedAdmin
    };
}

function resolveWebDonateRubAsync(body, staticId) {
    const adminLevel = parseInt(body.admin_level, 10) || 0;
    if (adminLevel > 0 && typeof global.quoteWebAdminPurchase === 'function') {
        return global.quoteWebAdminPurchase(staticId, adminLevel).then(function (quote) {
            if (!quote.ok) {
                return {
                    error: quote.error,
                    message: quote.message,
                    current_level: quote.current_level,
                    target_level: quote.target_level
                };
            }
            const resolvedAdmin =
                typeof global.resolveWebDonateAdmin === 'function'
                    ? global.resolveWebDonateAdmin(adminLevel)
                    : null;
            if (!resolvedAdmin) {
                return { error: 'invalid_admin', message: 'Неизвестный уровень админки' };
            }
            return {
                rub: quote.rub,
                packId: 0,
                itemModel: '',
                itemColor: '',
                adminLevel: adminLevel,
                resolvedItem: null,
                resolvedAdmin: resolvedAdmin,
                admin_quote: quote
            };
        });
    }
    if (adminLevel > 0) {
        return Promise.resolve({
            error: 'service_unavailable',
            message: 'Расчёт цены админки временно недоступен'
        });
    }
    return Promise.resolve(resolveWebDonateRub(body, staticId));
}

function getOrderByTx(transactionId) {
    return dbQuery('SELECT * FROM discord_donate_orders WHERE transaction_id = ? LIMIT 1', [
        String(transactionId)
    ]).then(function (rows) {
        return rows[0] || null;
    });
}

function markOrderPaid(transactionId) {
    return dbQuery(
        `UPDATE discord_donate_orders
         SET status = 'paid', paid_at = CURRENT_TIMESTAMP
         WHERE transaction_id = ? AND status = 'pending'`,
        [String(transactionId)]
    ).then(function (res) {
        return res && res.affectedRows > 0;
    });
}

function markOrderCanceled(transactionId) {
    return dbQuery(
        `UPDATE discord_donate_orders
         SET status = 'canceled'
         WHERE transaction_id = ? AND status = 'pending'`,
        [String(transactionId)]
    );
}

function dpToRub(dp) {
    const n = Math.max(MIN_DP, Math.min(MAX_DP, parseInt(dp, 10) || 0));
    return Math.max(1, Math.ceil(n / RUB_TO_DP));
}

const SITE_DONATE_URL = 'https://flowdm.fun/donate';

function siteDonateRedirectPayload() {
    return {
        type: 4,
        data: {
            flags: 64,
            content:
                '**Покупка DP теперь только на сайте.**\n\n' +
                'Открой: **' +
                SITE_DONATE_URL +
                '**\n' +
                'Введи **Static ID**, сумму и оплати — DP придут на аккаунт автоматически.\n' +
                '**Курс: 1 ₽ = ' +
                RUB_TO_DP +
                ' DP**',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: 'Открыть сайт доната',
                            url: SITE_DONATE_URL
                        }
                    ]
                }
            ]
        }
    };
}

function buildPanelPayload() {
    return {
        embeds: [
            {
                title: 'Покупка доната — Moon DM',
                description:
                    '**Донат теперь только через сайт.**\n\n' +
                    '**→ ' +
                    SITE_DONATE_URL +
                    '**\n\n' +
                    '**Как пополнить:**\n' +
                    '**1)** Открой сайт и введи **Static ID**\n' +
                    '**2)** Укажи сумму и способ оплаты (СБП / карта / крипта)\n' +
                    '**3)** DP зачислятся на аккаунт автоматически\n\n' +
                    '**Курс: 1 ₽ = ' +
                    RUB_TO_DP +
                    ' DP**\n\n' +
                    '**[Пользовательское соглашение](' +
                    AGREEMENT_URL +
                    ')**\n' +
                    '**[Политика конфиденциальности](' +
                    PRIVACY_URL +
                    ')**',
                color: 0xf84c00
            }
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 5,
                        label: 'Открыть сайт доната',
                        url: SITE_DONATE_URL
                    }
                ]
            }
        ]
    };
}

function publishDonatePanel() {
    const channelId = getPanelChannelId();
    if (!channelId) return Promise.reject(new Error('donate channel empty'));
    const payload = buildPanelPayload();
    const title = payload.embeds && payload.embeds[0] ? payload.embeds[0].title : 'Покупка доната — Moon DM';
    return findBotPanelMessage(channelId, 'donate:buy', title)
        .then(function (existing) {
            if (existing && existing.id) {
                return patchChannelMessage(channelId, existing.id, payload).then(function (msg) {
                    panelPublished = true;
                    console.log(
                        '[discord_donate] donate panel → site',
                        channelId,
                        msg && msg.id ? '(msg ' + msg.id + ')' : ''
                    );
                    return msg;
                });
            }
            return postChannelMessage(channelId, payload).then(function (msg) {
                panelPublished = true;
                console.log(
                    '[discord_donate] donate panel posted → site',
                    channelId,
                    msg && msg.id ? '(msg ' + msg.id + ')' : ''
                );
                return msg;
            });
        });
}

function publishSupportPanel() {
    const channelId = getSupportPanelChannelId();
    if (!channelId) return Promise.reject(new Error('support channel empty'));
    const payload = {
        embeds: [
            {
                title: 'Поддержать проект',
                description:
                    '**Благотворительный донат на развитие Moon DM.**\n\n' +
                    '**• Любая сумма от ' +
                    MIN_SUPPORT_RUB +
                    ' ₽** — без привязки к игровому аккаунту\n' +
                    '**• Роль «Помог проекту»** — от **' +
                    SUPPORT_ROLE_MIN_RUB +
                    ' ₽** (считается сумма всех твоих поддержек)\n' +
                    '**• DP и игровые бонусы не выдаются**\n\n' +
                    '**Спасибо, что помогаете серверу жить!**',
                color: 0xfacc15
            }
        ],
        components: [
            {
                type: 1,
                components: [
                    { type: 2, style: 3, label: 'Поддержать', custom_id: 'support:buy' }
                ]
            }
        ]
    };
    return findBotPanelMessage(channelId, 'support:buy', 'Поддержать проект')
        .then(function (existing) {
            if (existing && existing.id) {
                return patchChannelMessage(channelId, existing.id, payload);
            }
            return postChannelMessage(channelId, payload);
        });
}

function grantSupportRole(discordId) {
    const guildId = getDiscordGuildId();
    const roleId = getSupportRoleId();
    if (!guildId || !roleId || !discordId) {
        console.log(
            '[discord_donate] support role skip: guild=' +
                guildId +
                ' role=' +
                roleId +
                ' user=' +
                discordId
        );
        return Promise.resolve(false);
    }
    return discordRequest(
        'PUT',
        '/guilds/' +
            encodeURIComponent(guildId) +
            '/members/' +
            encodeURIComponent(String(discordId)) +
            '/roles/' +
            encodeURIComponent(roleId),
        null
    )
        .then(function () {
            return true;
        })
        .catch(function (err) {
            console.log('[discord_donate] support role:', err.message || err);
            return false;
        });
}

function getSupportPaidTotalRub(discordId) {
    return dbQuery(
        'SELECT COALESCE(SUM(rub), 0) AS total FROM discord_donate_orders WHERE discord_id = ? AND support_project = 1 AND status = ?',
        [String(discordId), 'paid']
    ).then(function (rows) {
        return Math.max(0, Math.floor(Number(rows[0] && rows[0].total) || 0));
    });
}

/** Роль «Помог проекту»: от 500 ₽ за раз или суммарно по всем оплаченным поддержкам. */
function maybeGrantSupportRole(order) {
    const discordId = String(order.discord_id || '');
    const rub = Math.max(0, Math.floor(Number(order.rub) || 0));
    if (!discordId) return Promise.resolve(false);
    if (rub >= SUPPORT_ROLE_MIN_RUB) {
        return grantSupportRole(discordId);
    }
    return getSupportPaidTotalRub(discordId).then(function (total) {
        if (total >= SUPPORT_ROLE_MIN_RUB) {
            return grantSupportRole(discordId);
        }
        return false;
    });
}

function supportRoleHintText(rub) {
    const amount = Math.max(0, Math.floor(Number(rub) || 0));
    if (amount >= SUPPORT_ROLE_MIN_RUB) {
        return '**После оплаты вам будет выдана роль «Помог проекту».**';
    }
    return (
        '**Роль «Помог проекту» — от ' +
        SUPPORT_ROLE_MIN_RUB +
        ' ₽ суммарно.** Сейчас `' +
        amount +
        ' ₽` — спасибо, роль начислится, когда наберётся ' +
        SUPPORT_ROLE_MIN_RUB +
        ' ₽.'
    );
}

function openBindModal(interaction) {
    return interactionCallback(interaction.id, interaction.token, {
        type: 9,
        data: {
            custom_id: 'donate:bind_modal',
            title: 'Привязка аккаунта',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'login',
                            label: 'Логин',
                            style: 1,
                            min_length: 1,
                            max_length: 32,
                            required: true,
                            placeholder: 'Ваш логин в игре'
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'static',
                            label: 'Статик',
                            style: 1,
                            min_length: 1,
                            max_length: 12,
                            required: true,
                            placeholder: 'Ваш статик в игре'
                        }
                    ]
                }
            ]
        }
    });
}

function openAmountModal(interaction) {
    return interactionCallback(interaction.id, interaction.token, {
        type: 9,
        data: {
            custom_id: 'donate:amount_modal',
            title: 'Сумма DP',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'dp',
                            label: 'Сколько DP купить',
                            style: 1,
                            min_length: 1,
                            max_length: 8,
                            required: true,
                            placeholder: '200 (= 100 ₽)'
                        }
                    ]
                }
            ]
        }
    });
}

function openSupportAmountModal(interaction) {
    return interactionCallback(interaction.id, interaction.token, {
        type: 9,
        data: {
            custom_id: 'support:amount_modal',
            title: 'Поддержать проект',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'rub',
                            label: 'Сумма в рублях (любая от ' + MIN_SUPPORT_RUB + ')',
                            style: 1,
                            min_length: 1,
                            max_length: 10,
                            required: true,
                            placeholder: 'Например: 50 · роль от ' + SUPPORT_ROLE_MIN_RUB + ' ₽'
                        }
                    ]
                }
            ]
        }
    });
}

function modalValue(interaction, customId) {
    const rows = (interaction.data && interaction.data.components) || [];
    for (let i = 0; i < rows.length; i++) {
        const comps = rows[i].components || [];
        for (let j = 0; j < comps.length; j++) {
            if (comps[j].custom_id === customId) return String(comps[j].value || '').trim();
        }
    }
    return '';
}

function handleBindModal(interaction) {
    const discordId = String(interaction.member && interaction.member.user ? interaction.member.user.id : interaction.user.id);
    const login = modalValue(interaction, 'login');
    const staticRaw = modalValue(interaction, 'static');
    const staticId = parseInt(staticRaw.replace(/\D/g, ''), 10);

    return interactionCallback(interaction.id, interaction.token, deferEphemeral())
        .then(function () {
            if (!login || !staticId) {
                return followUp(interaction, '**Укажите корректный логин и статик.**');
            }
            return findAccount(login, staticId).then(function (acc) {
                if (!acc) {
                    return followUp(
                        interaction,
                        '**Аккаунт не найден. Проверьте логин и статик (они должны совпадать с данными в игре).**'
                    );
                }
                return setBind(discordId, acc.login, acc.static).then(function () {
                    return followUp(
                        interaction,
                        '**Аккаунт привязан:** `' +
                            acc.login +
                            '` **(#' +
                            acc.static +
                            ').**\n**Теперь все покупки доната будут зачисляться на этот логин.**'
                    );
                });
            });
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            console.log('[discord_donate] bind:', err.message || err);
            return followUp(interaction, '**Ошибка привязки:** ' + (err.message || err)).catch(function () {});
        });
}

function handleBindButton(interaction) {
    const discordId = String(interaction.member && interaction.member.user ? interaction.member.user.id : interaction.user.id);
    return getBind(discordId)
        .then(function (bind) {
            if (bind) {
                return interactionCallback(
                    interaction.id,
                    interaction.token,
                    ephemeral(
                        '**Аккаунт уже привязан:** `' +
                            bind.login +
                            '` **(#' +
                            bind.static +
                            ').**\n**Можно сразу нажать «Купить».**'
                    )
                );
            }
            return openBindModal(interaction);
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            console.log('[discord_donate] bind btn:', err.message || err);
            return interactionCallback(
                interaction.id,
                interaction.token,
                ephemeral('**Ошибка:** ' + (err.message || err))
            ).catch(function () {});
        });
}

function handleBuyButton(interaction) {
    return interactionCallback(interaction.id, interaction.token, siteDonateRedirectPayload()).catch(function (err) {
        if (isAlreadyAcked(err)) return Promise.resolve();
        console.log('[discord_donate] buy→site:', err.message || err);
        return Promise.resolve();
    });
}

function handleSupportButton(interaction) {
    return openSupportAmountModal(interaction);
}

function handleSupportAmountModal(interaction) {
    const discordId = String(interaction.member && interaction.member.user ? interaction.member.user.id : interaction.user.id);
    const rubRaw = modalValue(interaction, 'rub');
    const rub = Math.floor(parseInt(String(rubRaw).replace(/[^\d]/g, ''), 10) || 0);
    return interactionCallback(interaction.id, interaction.token, deferEphemeral())
        .then(function () {
            if (!rub || rub < MIN_SUPPORT_RUB) {
                return followUp(
                    interaction,
                    '**Укажите сумму числом.** Минимум **' + MIN_SUPPORT_RUB + ' ₽**. Можно любую сумму.'
                );
            }
            if (rub > MAX_SUPPORT_RUB) {
                return followUp(interaction, '**Слишком много. Максимум ' + MAX_SUPPORT_RUB + ' ₽.**');
            }
            pendingSupportByDiscord.set(discordId, { rub: rub, methodKey: null, at: Date.now() });
            return followUp(
                interaction,
                '**Спасибо, что хотите поддержать проект!**\n\n' +
                    '**Сумма: `' +
                    rub +
                    ' ₽`**\n' +
                    supportRoleHintText(rub) +
                    '\n\n**Выберите способ оплаты:**',
                [
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 3, label: 'СБП', custom_id: 'support:pay:sbp' },
                            { type: 2, style: 1, label: 'Криптовалюта', custom_id: 'support:pay:crypto' },
                            { type: 2, style: 2, label: 'Сбер', custom_id: 'support:pay:sber' },
                            { type: 2, style: 1, label: 'Карта', custom_id: 'support:pay:card' }
                        ]
                    }
                ]
            );
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            console.log('[discord_donate] support amount:', err.message || err);
            return followUp(interaction, '**Ошибка:** ' + (err.message || err)).catch(function () {});
        });
}

function handleSupportMethodButton(interaction, methodKey) {
    const discordId = String(interaction.member && interaction.member.user ? interaction.member.user.id : interaction.user.id);
    const state = pendingSupportByDiscord.get(discordId);
    if (!state || !state.rub || state.rub < MIN_SUPPORT_RUB) {
        return interactionCallback(
            interaction.id,
            interaction.token,
            ephemeral('**Сначала нажмите «Поддержать» и укажите сумму (любая от ' + MIN_SUPPORT_RUB + ' ₽).**')
        ).catch(function () {});
    }
    if (state.at && Date.now() - state.at > 30 * 60 * 1000) {
        pendingSupportByDiscord.delete(discordId);
        return interactionCallback(
            interaction.id,
            interaction.token,
            ephemeral('**Сессия устарела. Нажмите «Поддержать» ещё раз и введите сумму.**')
        ).catch(function () {});
    }
    const method = PAYMENT_METHODS[methodKey];
    if (!method) {
        return interactionCallback(
            interaction.id,
            interaction.token,
            ephemeral('**Неизвестный способ оплаты.**')
        ).catch(function () {});
    }
    const supportBind = { login: 'support_project', static: 0 };
    if (method.manual) {
        return interactionCallback(interaction.id, interaction.token, deferEphemeral())
            .then(function () {
                return createManualOrder(interaction, discordId, supportBind, state.rub, 0, methodKey, true);
            })
            .catch(function (err) {
                if (isAlreadyAcked(err)) return Promise.resolve();
                console.log('[discord_donate] support manual:', err.message || err);
                return followUp(interaction, '**Не удалось создать оплату:** ' + (err.message || err)).catch(function () {});
            });
    }
    return createSupportPlategaOrder(interaction, discordId, state.rub, methodKey);
}

function createSupportPlategaOrder(interaction, discordId, rub, methodKey) {
    const method = PAYMENT_METHODS[methodKey];
    return interactionCallback(interaction.id, interaction.token, deferEphemeral())
        .then(function () {
            return createPlategaPayment(rub, 'Moon DM Project Support ' + rub + ' RUB', 'support:' + discordId, method.id);
        })
        .then(function (pay) {
            if (!pay.redirect) throw new Error('Platega не вернула ссылку на оплату');
            pendingSupportByDiscord.delete(discordId);
            orderPayMethodLabel.set(String(pay.transactionId), method.label);
            return insertOrder({
                transactionId: pay.transactionId,
                discordId: discordId,
                login: 'support_project',
                static: 0,
                rub: rub,
                dp: 0,
                payUrl: pay.redirect,
                supportProject: true
            }).then(function () {
                scheduleOrderPoll(pay.transactionId);
                return followUp(
                    interaction,
                    '**Заказ создан.**\n' +
                        '**Способ:** ' +
                        method.label +
                        '\n' +
                        '**К оплате: ' +
                        rub +
                        ' ₽**\n' +
                        supportRoleHintText(rub) +
                        '\n' +
                        '**Спасибо за поддержку Moon DM!**',
                    [
                        {
                            type: 1,
                            components: [{ type: 2, style: 5, label: 'Оплатить', url: pay.redirect }]
                        }
                    ]
                ).then(function (msg) {
                    pendingPaidNotify.set(String(pay.transactionId), {
                        applicationId: interaction.application_id,
                        token: interaction.token,
                        messageId: msg && msg.id ? String(msg.id) : null
                    });
                });
            });
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            console.log('[discord_donate] support platega:', err && err.message ? err.message : err);
            return followUp(
                interaction,
                '**Не удалось создать оплату:** ' + ((err && err.message) || 'Platega недоступна')
            ).catch(function () {});
        });
}

function handlePayMethodButton(interaction, methodKey) {
    return handleBuyButton(interaction);
}

function handleAmountModal(interaction) {
    const discordId = String(interaction.member && interaction.member.user ? interaction.member.user.id : interaction.user.id);
    const amountRaw = modalValue(interaction, 'dp');
    const dpWanted = parseInt(String(amountRaw).replace(/\D/g, ''), 10) || 0;
    const methodKey = pendingPayMethodByDiscord.get(discordId) || 'sbp';
    const method = PAYMENT_METHODS[methodKey] || PAYMENT_METHODS.sbp;

    return interactionCallback(interaction.id, interaction.token, deferEphemeral())
        .then(function () {
            if (dpWanted < MIN_DP) {
                return followUp(interaction, '**Минимум ' + MIN_DP + ' DP (1 ₽).**');
            }
            if (dpWanted > MAX_DP) {
                return followUp(interaction, '**Слишком большая сумма. Максимум ' + MAX_DP + ' DP.**');
            }
            const rub = dpToRub(dpWanted);
            const dp = rub * RUB_TO_DP;

            return getBind(discordId).then(function (bind) {
                if (!bind) {
                    return followUp(interaction, '**Сначала привяжите статик.**');
                }

                if (method.manual) {
                    return createManualOrder(interaction, discordId, bind, rub, dp, methodKey, false);
                }

                return createPlategaPayment(
                    rub,
                    'Moon DM Donate ' + dp + ' DP (' + bind.login + ') ' + method.label,
                    'discord:' + discordId + ':' + bind.static,
                    method.id
                ).then(function (pay) {
                    if (!pay.redirect) {
                        throw new Error('Platega не вернула ссылку на оплату');
                    }
                    pendingPayMethodByDiscord.delete(discordId);
                    orderPayMethodLabel.set(String(pay.transactionId), method.label);
                    return insertOrder({
                        transactionId: pay.transactionId,
                        discordId: discordId,
                        login: bind.login,
                        static: bind.static,
                        rub: rub,
                        dp: dp,
                        payUrl: pay.redirect,
                        supportProject: false
                    }).then(function () {
                        scheduleOrderPoll(pay.transactionId);
                        return followUp(
                            interaction,
                            '**Заказ создан.**\n' +
                                '**Способ:** ' +
                                method.label +
                                '\n' +
                                '**К оплате: ' +
                                rub +
                                ' ₽ → ' +
                                dp +
                                ' DP**\n' +
                                '**Логин:** `' +
                                bind.login +
                                '` **(#' +
                                bind.static +
                                ')**\n' +
                                '**После оплаты DP зачислятся автоматически.**',
                            [
                                {
                                    type: 1,
                                    components: [
                                        {
                                            type: 2,
                                            style: 5,
                                            label: 'Оплатить',
                                            url: pay.redirect
                                        }
                                    ]
                                }
                            ]
                        ).then(function (msg) {
                            pendingPaidNotify.set(String(pay.transactionId), {
                                applicationId: interaction.application_id,
                                token: interaction.token,
                                messageId: msg && msg.id ? String(msg.id) : null
                            });
                        });
                    });
                });
            });
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            console.log('[discord_donate] amount:', err.message || err);
            return followUp(interaction, '**Не удалось создать оплату:** ' + (err.message || err)).catch(function () {});
        });
}

function createManualOrder(interaction, discordId, bind, rub, dp, methodKey, supportProjectFlag) {
    const method = PAYMENT_METHODS[methodKey] || PAYMENT_METHODS.sber;
    const supportProject = !!supportProjectFlag;
    const pay = getPaymentDetailsFn();
    const isCard = methodKey === 'card';
    const txId = (isCard ? 'card_' : 'sber_') + uuid();
    pendingPayMethodByDiscord.delete(discordId);
    orderPayMethodLabel.set(txId, method.label);

    const payHint = isCard
        ? '**Переведите ' +
          rub +
          ' ₽ на карту:**\n' +
          '`' +
          (pay.cardNumber || '2202 2082 4576 4171') +
          '`\n' +
          '**Банк:** ' +
          (pay.bank || 'Сбербанк') +
          '\n' +
          '**Получатель:** ' +
          (pay.cardHolder || 'Ярослав') +
          '\n\n'
        : '**Переведите ' +
          rub +
          ' ₽ на Сбер по номеру:**\n' +
          '`' +
          (pay.sbpPhone || '+7 977 987 54 81') +
          '`\n' +
          '**Банк:** ' +
          (pay.bank || 'Сбербанк') +
          '\n' +
          '**Получатель:** ' +
          (pay.cardHolder || 'Ярослав') +
          '\n\n';

    return insertOrder({
        transactionId: txId,
        discordId: discordId,
        login: bind.login,
        static: bind.static,
        rub: rub,
        dp: dp,
        payUrl: null,
        supportProject: supportProject
    }).then(function () {
        return followUp(
            interaction,
            '**Заказ создан (' +
                method.label +
                ').**\n' +
                '**К оплате: ' +
                rub +
                (supportProject
                    ? ' ₽**\n' + supportRoleHintText(rub) + '\n\n'
                    : ' ₽ → ' +
                        dp +
                        ' DP**\n' +
                        '**Логин:** `' +
                        bind.login +
                        '` **(#' +
                        bind.static +
                        ')**\n\n') +
                payHint +
                '**После перевода нажмите «Я перевёл».**',
            [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: 'Я перевёл',
                            custom_id: 'donate:manual:paid:' + txId
                        }
                    ]
                }
            ]
        ).then(function (msg) {
            pendingPaidNotify.set(txId, {
                applicationId: interaction.application_id,
                token: interaction.token,
                messageId: msg && msg.id ? String(msg.id) : null
            });
        });
    });
}

function memberHasReceiptsRole(interaction) {
    const roleId = getDiscordEnvValue('DISCORD_RECEIPTS_ROLE_ID', '1532465024868679800');
    if (!roleId) return true;
    const member = interaction.member;
    if (!member || !Array.isArray(member.roles)) return false;
    return member.roles.indexOf(roleId) !== -1;
}

function transferEmbedTitle(methodLabel) {
    const label = methodLabel === 'Карта' ? 'на карту' : methodLabel;
    return 'Перевод ' + label + ' — Moon DM';
}

function orderCreditLabel(order) {
    const adminLevel = parseInt(order.admin_level, 10) || 0;
    if (adminLevel > 0) {
        const spec =
            global.WEB_DONATE_ADMIN && global.WEB_DONATE_ADMIN[adminLevel]
                ? global.WEB_DONATE_ADMIN[adminLevel]
                : null;
        return spec ? spec.name : 'Админ ' + adminLevel + ' уровень';
    }
    const itemModel = String(order.item_model || '').toLowerCase();
    if (itemModel === 'pait' || itemModel === 'patrontazh') {
        const resolved =
            typeof global.resolveWebDonateItem === 'function'
                ? global.resolveWebDonateItem(itemModel, order.item_color)
                : null;
        if (resolved) return resolved.spec.name + ' · ' + resolved.color.name;
    }
    const packId = parseInt(order.pack_id, 10) || 0;
    if (packId > 0 && global.WEB_DONATE_PACKS && global.WEB_DONATE_PACKS[packId]) {
        return global.WEB_DONATE_PACKS[packId].name;
    }
    return String(order.dp || 0) + ' DP';
}

function manualOrderFields(order, methodLabel) {
    const isSupport = Number(order.support_project) === 1;
    const isWeb = String(order.discord_id || '').indexOf('web:') === 0;
    const fields = [
        isWeb
            ? {
                  name: '**Источник**',
                  value: '**Сайт flowdm.fun** · Static **#' + String(order.discord_id || '').slice(4) + '**',
                  inline: false
              }
            : { name: '**Discord**', value: '<@' + order.discord_id + '>', inline: true },
        { name: '**Сумма**', value: '**' + order.rub + ' ₽**', inline: true },
        { name: '**Способ**', value: '**' + methodLabel + '**', inline: true }
    ];
    if (isSupport) {
        fields.splice(1, 0, { name: '**Назначение**', value: '**Поддержка проекта**', inline: true });
        fields.push({
            name: '**Роль**',
            value:
                Number(order.rub) >= SUPPORT_ROLE_MIN_RUB
                    ? '**Помог проекту (от ' + SUPPORT_ROLE_MIN_RUB + ' ₽)**'
                    : '**После ' + SUPPORT_ROLE_MIN_RUB + ' ₽ суммарно**',
            inline: true
        });
    } else {
        fields.splice(
            1,
            0,
            { name: '**Логин**', value: '`' + order.login + '`', inline: true },
            { name: '**Статик**', value: '**#' + order.static + '**', inline: true }
        );
        const adminLevel = parseInt(order.admin_level, 10) || 0;
        if (adminLevel > 0) {
            fields.push({ name: '**Товар**', value: '**' + orderCreditLabel(order) + '**', inline: true });
        } else if (String(order.item_model || '').toLowerCase() === 'pait' || String(order.item_model || '').toLowerCase() === 'patrontazh') {
            fields.push({ name: '**Товар**', value: '**' + orderCreditLabel(order) + '**', inline: true });
        } else if ((parseInt(order.pack_id, 10) || 0) > 0) {
            fields.push({ name: '**Набор**', value: '**' + orderCreditLabel(order) + '**', inline: true });
        } else {
            fields.push({ name: '**DP**', value: '**' + String(order.dp) + '**', inline: true });
        }
    }
    return fields;
}

function submitManualOrderForReview(txId) {
    return getOrderByTx(txId).then(function (order) {
        if (!order) return Promise.reject(new Error('order_not_found'));
        if (order.status === 'paid') return Promise.reject(new Error('already_paid'));
        if (order.status === 'canceled') return Promise.reject(new Error('canceled'));
        if (pendingSberAdminMsg.has(String(txId))) {
            return { ok: true, already: true, order: order };
        }

        const channelId = getReceiptChannelId();
        if (!channelId) return Promise.reject(new Error('receipt_channel_missing'));

        const methodLabel =
            orderPayMethodLabel.get(String(txId)) ||
            (String(txId).indexOf('card_') === 0 ? 'Карта' : 'Сбер');
        const roleId = getDiscordEnvValue('DISCORD_RECEIPTS_ROLE_ID', '1532465024868679800');
        const content = roleId ? '<@&' + roleId + '>' : '';

        return postChannelMessage(channelId, {
            content: content,
            embeds: [
                {
                    title: transferEmbedTitle(methodLabel),
                    color: 0xf84c00,
                    fields: manualOrderFields(order, methodLabel),
                    footer: { text: 'Ожидает проверки' },
                    timestamp: new Date().toISOString()
                }
            ],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: 'Принять',
                            custom_id: 'donate:manual:approve:' + txId
                        },
                        {
                            type: 2,
                            style: 4,
                            label: 'Отклонить',
                            custom_id: 'donate:manual:reject:' + txId
                        }
                    ]
                }
            ]
        }).then(function (msg) {
            if (msg && msg.id) {
                pendingSberAdminMsg.set(String(txId), {
                    channelId: channelId,
                    messageId: String(msg.id)
                });
            }
            return { ok: true, order: order };
        });
    });
}

function buildWebManualPayment(provider, rub) {
    const pay = getPaymentDetailsFn();
    if (provider === 'card') {
        return {
            type: 'card',
            amount: rub,
            cardNumber: pay.cardNumber || '2202 2082 4576 4171',
            bank: pay.bank || 'Сбербанк',
            cardHolder: pay.cardHolder || 'Ярослав'
        };
    }
    return {
        type: 'sber',
        amount: rub,
        sbpPhone: pay.sbpPhone || '+7 977 987 54 81',
        bank: pay.bank || 'Сбербанк',
        cardHolder: pay.cardHolder || 'Ярослав'
    };
}

function handleSberPaidButton(interaction, txId) {
    return interactionCallback(interaction.id, interaction.token, deferEphemeral())
        .then(function () {
            return submitManualOrderForReview(txId);
        })
        .then(function (result) {
            const order = result.order;
            const ctx = pendingPaidNotify.get(String(txId));
            const waitText =
                Number(order.support_project) === 1
                    ? '**Заявка отправлена на проверку.**\n' + supportRoleHintText(order.rub)
                    : '**Заявка отправлена на проверку.**\n**После подтверждения DP зачислятся автоматически.**';
            if (ctx && ctx.applicationId && ctx.token) {
                return editWebhookMessage(ctx.applicationId, ctx.token, ctx.messageId, waitText, []).then(
                    function () {
                        return followUp(interaction, '**Заявка отправлена модераторам.**');
                    }
                );
            }
            return followUp(interaction, waitText);
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            const msg = err && err.message ? err.message : String(err);
            if (msg === 'order_not_found') return followUp(interaction, '**Заказ не найден.**').catch(function () {});
            if (msg === 'already_paid') return followUp(interaction, '**Этот платёж уже зачислен.**').catch(function () {});
            if (msg === 'canceled') return followUp(interaction, '**Заказ отменён.**').catch(function () {});
            if (msg === 'receipt_channel_missing') {
                return followUp(interaction, '**Канал проверки не настроен.**').catch(function () {});
            }
            console.log('[discord_donate] manual paid:', msg);
            return followUp(interaction, '**Ошибка:** ' + msg).catch(function () {});
        });
}

function handleSberAdminButton(interaction, action, txId) {
    if (!memberHasReceiptsRole(interaction)) {
        return interactionCallback(
            interaction.id,
            interaction.token,
            ephemeral('**Нет прав. Нужна роль для проверки чеков.**')
        ).catch(function () {});
    }

    return interactionCallback(interaction.id, interaction.token, { type: 6 })
        .then(function () {
            return getOrderByTx(txId);
        })
        .then(function (order) {
            if (!order) throw new Error('order_not_found');
            if (order.status === 'paid') throw new Error('already_paid');
            if (order.status === 'canceled') throw new Error('canceled');

            const methodLabel =
                orderPayMethodLabel.get(String(txId)) ||
                (String(txId).indexOf('card_') === 0 ? 'Карта' : 'Сбер');
            const adminMsg = pendingSberAdminMsg.get(String(txId));
            const disableButtons = function (footerText, color) {
                if (!adminMsg) return Promise.resolve();
                return discordRequest(
                    'PATCH',
                    '/channels/' + adminMsg.channelId + '/messages/' + adminMsg.messageId,
                    {
                        embeds: [
                            {
                                title: transferEmbedTitle(methodLabel),
                                color: color,
                                fields: manualOrderFields(order, methodLabel),
                                footer: { text: footerText },
                                timestamp: new Date().toISOString()
                            }
                        ],
                        components: []
                    }
                ).catch(function () {});
            };

            if (action === 'reject') {
                return markOrderCanceled(txId).then(function () {
                    pendingSberAdminMsg.delete(String(txId));
                    return disableButtons('Отклонён', 0xe74c3c);
                });
            }

            const source = String(txId).indexOf('card_') === 0 ? 'card_manual' : 'sber_manual';
            return fulfillPaidOrder(txId, source).then(function (result) {
                pendingSberAdminMsg.delete(String(txId));
                return disableButtons(result && result.ok ? 'Принят' : 'Ошибка зачисления', result && result.ok ? 0x2ecc71 : 0xe74c3c);
            });
        })
        .catch(function (err) {
            if (isAlreadyAcked(err)) return Promise.resolve();
            const msg = err && err.message ? err.message : String(err);
            console.log('[discord_donate] manual admin:', msg);
            return discordRequest(
                'POST',
                '/webhooks/' + interaction.application_id + '/' + interaction.token,
                {
                    content:
                        msg === 'already_paid'
                            ? '**Уже зачислено.**'
                            : msg === 'canceled'
                              ? '**Заказ отменён.**'
                              : '**Ошибка:** ' + msg,
                    flags: 64
                }
            ).catch(function () {});
        });
}

function postPaidReceipt(order, credit) {
    const channelId = getReceiptChannelId();
    if (!channelId) return Promise.resolve();
    const isSupport = Number(order.support_project) === 1;
    const fields = isSupport
        ? [
              { name: '**Discord**', value: '<@' + order.discord_id + '>', inline: true },
              { name: '**Назначение**', value: '**Поддержка проекта**', inline: true },
              { name: '**Сумма**', value: '**' + order.rub + ' ₽**', inline: true },
              {
                  name: '**Способ**',
                  value: '**' + (orderPayMethodLabel.get(String(order.transaction_id)) || 'СБП') + '**',
                  inline: true
              },
              { name: '**Роль**', value: '**Помог проекту**', inline: true },
              { name: '**Платёж Platega**', value: '`' + order.transaction_id + '`', inline: false }
          ]
        : [
              {
                  name: '**Источник**',
                  value: String(order.discord_id || '').indexOf('web:') === 0 ? '**Сайт flowdm.fun**' : '<@' + order.discord_id + '>',
                  inline: true
              },
              { name: '**Логин**', value: '`' + order.login + '`', inline: true },
              { name: '**Статик**', value: '**#' + order.static + '**', inline: true },
              { name: '**Сумма**', value: '**' + order.rub + ' ₽**', inline: true },
              {
                  name: '**Выдано**',
                  value: '**' + orderCreditLabel(order) + '**',
                  inline: true
              },
              {
                  name: '**Способ**',
                  value: '**' + (orderPayMethodLabel.get(String(order.transaction_id)) || 'СБП') + '**',
                  inline: true
              },
              {
                  name: '**Баланс после**',
                  value: credit && credit.newDp != null ? '**' + String(credit.newDp) + '**' : '**—**',
                  inline: true
              },
              { name: '**Платёж Platega**', value: '`' + order.transaction_id + '`', inline: false }
          ];
    return postChannelMessage(channelId, {
        embeds: [
            {
                title: isSupport ? 'Чек поддержки проекта — Moon DM' : 'Чек оплаты доната — Moon DM',
                color: isSupport ? 0xfacc15 : 0xf84c00,
                fields: fields,
                footer: { text: 'Оплачено автоматически' },
                timestamp: new Date().toISOString()
            }
        ]
    }).catch(function (err) {
        console.log('[discord_donate] receipt channel:', err.message || err);
    });
}

function fulfillPaidOrder(transactionId, source) {
    return getOrderByTx(transactionId).then(function (order) {
        if (!order) return { ok: false, error: 'order_not_found' };
        if (order.status === 'paid') return { ok: true, already: true, order: order };
        if (order.status === 'canceled') return { ok: false, error: 'canceled' };

        return markOrderPaid(transactionId).then(function (updated) {
            if (!updated) {
                return getOrderByTx(transactionId).then(function (o2) {
                    return { ok: true, already: true, order: o2 || order };
                });
            }
            if (Number(order.support_project) === 1) {
                return maybeGrantSupportRole(order).then(function (roleGranted) {
                    return Promise.all([
                        postPaidReceipt(order, null),
                        notifyBuyerPaid(order, !!roleGranted)
                    ]).then(function () {
                        return { ok: true, order: order, supportProject: true, roleGranted: !!roleGranted };
                    });
                });
            }
            return Promise.resolve()
                .then(function () {
                    if (typeof global.fulfillWebDonateOrder === 'function') {
                        return global.fulfillWebDonateOrder(order, source || 'platega');
                    }
                    return new Promise(function (resolve) {
                        if (typeof global.creditDpByLogin !== 'function') {
                            return resolve({ ok: false, error: 'credit_unavailable' });
                        }
                        global.creditDpByLogin(
                            order.login,
                            order.dp,
                            { rub: order.rub, source: source || 'platega', orderId: transactionId },
                            function (result) {
                                resolve(result && result.ok ? result : { ok: false, error: (result && result.error) || 'credit_failed' });
                            }
                        );
                    });
                })
                .then(function (result) {
                    return {
                        ok: !!(result && result.ok),
                        credit: result,
                        order: order,
                        error: result && result.error
                    };
                })
                .then(function (payload) {
                if (!payload.ok) {
                    console.log('[discord_donate] credit failed for', transactionId, payload.error);
                    return payload;
                }
                return Promise.all([
                    postPaidReceipt(payload.order, payload.credit),
                    notifyBuyerPaid(payload.order),
                    recordWebPromoUse(payload.order)
                ]).then(function () {
                    return payload;
                });
            });
        });
    });
}

const pollTimers = new Map();

function scheduleOrderPoll(transactionId) {
    const tx = String(transactionId);
    if (pollTimers.has(tx)) return;
    let tries = 0;
    const tick = function () {
        tries += 1;
        if (tries > 60) {
            const t = pollTimers.get(tx);
            if (t) clearInterval(t);
            pollTimers.delete(tx);
            return;
        }
        checkAndFulfill(tx).catch(function () {});
    };
    tick();
    const timer = setInterval(tick, 10000);
    pollTimers.set(tx, timer);
}

function checkAndFulfill(transactionId) {
    return getOrderByTx(transactionId).then(function (order) {
        if (!order) return { ok: false, error: 'order_not_found' };
        if (order.status === 'paid') {
            const t = pollTimers.get(String(transactionId));
            if (t) {
                clearInterval(t);
                pollTimers.delete(String(transactionId));
            }
            return { ok: true, already: true, order: order };
        }
        return getPlategaStatus(transactionId).then(function (st) {
            const status = String((st && (st.status || st.Status)) || '').toUpperCase();
            if (status === 'CONFIRMED') {
                const t = pollTimers.get(String(transactionId));
                if (t) {
                    clearInterval(t);
                    pollTimers.delete(String(transactionId));
                }
                return fulfillPaidOrder(transactionId, 'platega_poll');
            }
            if (status === 'CANCELED' || status === 'FAILED' || status === 'EXPIRED') {
                markOrderCanceled(transactionId).catch(function () {});
                const t = pollTimers.get(String(transactionId));
                if (t) {
                    clearInterval(t);
                    pollTimers.delete(String(transactionId));
                }
                return { ok: false, error: status.toLowerCase() };
            }
            return { ok: false, error: 'pending', status: status };
        }).catch(function (err) {
            const msg = err && err.message ? err.message : String(err);
            if (!/таймаут|недоступна|HTTP 50/i.test(msg)) {
                console.log('[discord_donate] platega status:', msg);
            }
            return { ok: false, error: 'platega_status' };
        });
    });
}

function catchDonate(p) {
    if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
            const msg = err && err.message ? err.message : String(err);
            if (msg) console.log('[discord_donate]', msg.slice(0, 180));
        });
    }
    return p;
}

function handleDonateInteraction(interaction) {
    if (!interaction || !interaction.data) return false;
    const type = interaction.type;
    const customId = String((interaction.data && interaction.data.custom_id) || '');

    if (type === 3) {
        if (customId === 'donate:bind') {
            catchDonate(handleBindButton(interaction));
            return true;
        }
        if (customId === 'donate:buy') {
            catchDonate(handleBuyButton(interaction));
            return true;
        }
        if (customId === 'support:buy') {
            catchDonate(handleSupportButton(interaction));
            return true;
        }
        if (customId === 'support:pay:sbp') {
            catchDonate(handleSupportMethodButton(interaction, 'sbp'));
            return true;
        }
        if (customId === 'support:pay:crypto') {
            catchDonate(handleSupportMethodButton(interaction, 'crypto'));
            return true;
        }
        if (customId === 'support:pay:sber') {
            catchDonate(handleSupportMethodButton(interaction, 'sber'));
            return true;
        }
        if (customId === 'support:pay:card') {
            catchDonate(handleSupportMethodButton(interaction, 'card'));
            return true;
        }
        if (customId === 'donate:pay:sbp') {
            catchDonate(handlePayMethodButton(interaction, 'sbp'));
            return true;
        }
        if (customId === 'donate:pay:crypto') {
            catchDonate(handlePayMethodButton(interaction, 'crypto'));
            return true;
        }
        if (customId === 'donate:pay:sber') {
            catchDonate(handlePayMethodButton(interaction, 'sber'));
            return true;
        }
        if (customId === 'donate:pay:card') {
            catchDonate(handlePayMethodButton(interaction, 'card'));
            return true;
        }
        if (customId.indexOf('donate:manual:paid:') === 0) {
            catchDonate(handleSberPaidButton(interaction, customId.slice('donate:manual:paid:'.length)));
            return true;
        }
        if (customId.indexOf('donate:manual:approve:') === 0) {
            catchDonate(handleSberAdminButton(interaction, 'approve', customId.slice('donate:manual:approve:'.length)));
            return true;
        }
        if (customId.indexOf('donate:manual:reject:') === 0) {
            catchDonate(handleSberAdminButton(interaction, 'reject', customId.slice('donate:manual:reject:'.length)));
            return true;
        }
        // legacy Сбер-кнопки (старые сообщения)
        if (customId.indexOf('donate:sber:paid:') === 0) {
            catchDonate(handleSberPaidButton(interaction, customId.slice('donate:sber:paid:'.length)));
            return true;
        }
        if (customId.indexOf('donate:sber:approve:') === 0) {
            catchDonate(handleSberAdminButton(interaction, 'approve', customId.slice('donate:sber:approve:'.length)));
            return true;
        }
        if (customId.indexOf('donate:sber:reject:') === 0) {
            catchDonate(handleSberAdminButton(interaction, 'reject', customId.slice('donate:sber:reject:'.length)));
            return true;
        }
        if (customId === 'donate:amount') {
            catchDonate(handleBuyButton(interaction));
            return true;
        }
    }

    if (type === 5) {
        if (customId === 'donate:bind_modal') {
            catchDonate(handleBindModal(interaction));
            return true;
        }
        if (customId === 'donate:amount_modal') {
            catchDonate(handleBuyButton(interaction));
            return true;
        }
        if (customId === 'support:amount_modal') {
            catchDonate(handleSupportAmountModal(interaction));
            return true;
        }
    }

    return false;
}

/** Проверка промокода с сайта (POST /donate/validate-promo). */
function handleWebValidatePromo(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const staticId = parseInt(body.static, 10);
    const promoRaw = body.promo_code || body.promo;

    if (!staticId || staticId < 1) {
        res.status(400).json({ ok: false, error: 'invalid_static', message: 'Введите Static ID' });
        return;
    }
    if (!global.DB || typeof global.DB.query !== 'function') {
        res.status(503).json({ ok: false, error: 'db_unavailable', message: 'Сервер временно недоступен' });
        return;
    }

    const finish = function () {
        resolveWebDonateRubAsync(body, staticId).then(function (resolved) {
            if (resolved.error) {
                res.status(400).json({
                    ok: false,
                    error: resolved.error,
                    message: resolved.message,
                    min: resolved.min,
                    max: resolved.max,
                    current_level: resolved.current_level,
                    target_level: resolved.target_level
                });
                return;
            }
            if (!promoRaw) {
                res.status(200).json({
                    ok: true,
                    code: null,
                    base_rub: resolved.rub,
                    final_rub: resolved.rub,
                    discount_rub: 0,
                    admin_quote: resolved.admin_quote || null
                });
                return;
            }
            assertWebPromoAvailable(promoRaw, staticId)
                .then(function (check) {
                    if (!check.ok) {
                        res.status(400).json({
                            ok: false,
                            error: check.error,
                            message: check.message || 'Промокод недоступен'
                        });
                        return;
                    }
                    const priced = promoCodes.applyPromoDiscount(resolved.rub, promoRaw);
                    if (!priced.ok) {
                        res.status(400).json({
                            ok: false,
                            error: 'invalid_promo',
                            message: 'Промокод не найден или недействителен'
                        });
                        return;
                    }
                    res.status(200).json({
                        ok: true,
                        code: priced.promo,
                        label: priced.label || null,
                        base_rub: priced.base_rub,
                        final_rub: priced.final_rub,
                        discount_rub: priced.discount_rub,
                        once_per_static: !!priced.once_per_static,
                        admin_quote: resolved.admin_quote || null
                    });
                })
                .catch(function (err) {
                    console.log('[discord_donate] validate-promo:', err.message || err);
                    res.status(500).json({ ok: false, error: 'server_error', message: 'Ошибка проверки промокода' });
                });
        }).catch(function (err) {
            console.log('[discord_donate] validate-promo pricing:', err.message || err);
            res.status(500).json({ ok: false, error: 'server_error', message: 'Ошибка расчёта цены' });
        });
    };

    if (tablesReady) {
        finish();
        return;
    }
    ensureTables(function (err) {
        if (err) {
            res.status(503).json({ ok: false, error: 'db_unavailable', message: 'База данных недоступна' });
            return;
        }
        finish();
    });
}

/** Расчёт цены админки с учётом текущего уровня (POST /donate/admin-quote). */
function handleWebAdminQuote(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const staticId = parseInt(body.static, 10);
    const adminLevel = parseInt(body.admin_level, 10) || 0;

    if (!staticId || staticId < 1) {
        res.status(400).json({ ok: false, error: 'invalid_static', message: 'Введите Static ID' });
        return;
    }
    if (!adminLevel || adminLevel < 1 || adminLevel > 10) {
        res.status(400).json({ ok: false, error: 'invalid_admin', message: 'Неизвестный уровень админки' });
        return;
    }
    if (!global.DB || typeof global.DB.query !== 'function') {
        res.status(503).json({ ok: false, error: 'db_unavailable', message: 'Сервер временно недоступен' });
        return;
    }
    if (typeof global.quoteWebAdminPurchase !== 'function') {
        res.status(503).json({ ok: false, error: 'service_unavailable', message: 'Сервис временно недоступен' });
        return;
    }

    const finish = function () {
        global.quoteWebAdminPurchase(staticId, adminLevel)
            .then(function (quote) {
                if (!quote.ok) {
                    res.status(400).json(quote);
                    return;
                }
                res.status(200).json(quote);
            })
            .catch(function (err) {
                console.log('[discord_donate] admin-quote:', err.message || err);
                res.status(500).json({ ok: false, error: 'server_error', message: 'Ошибка расчёта цены' });
            });
    };

    if (tablesReady) {
        finish();
        return;
    }
    ensureTables(function (err) {
        if (err) {
            res.status(503).json({ ok: false, error: 'db_unavailable', message: 'База данных недоступна' });
            return;
        }
        finish();
    });
}

/** Создание заказа с сайта (POST /donate/create-order). */
function handleWebCreateOrder(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const staticId = parseInt(body.static, 10);
    let packId = parseInt(body.pack_id, 10) || 0;
    const itemModel = String(body.item_model || '').toLowerCase();
    const itemColor = String(body.item_color || '');
    const adminLevel = parseInt(body.admin_level, 10) || 0;
    const provider = String(body.payment_provider || 'sbp').toLowerCase();

    if (!body.accept_terms) {
        res.status(400).json({ ok: false, error: 'accept_terms_required', message: 'Примите пользовательское соглашение' });
        return;
    }
    if (!staticId || staticId < 1) {
        res.status(400).json({ ok: false, error: 'invalid_static', message: 'Введите Static ID' });
        return;
    }
    if (!global.DB || typeof global.DB.query !== 'function') {
        res.status(503).json({ ok: false, error: 'db_unavailable', message: 'Сервер временно недоступен' });
        return;
    }

    let rub = 0;
    let dp = 0;
    let description = '';
    let resolvedItem = null;
    let resolvedAdmin = null;

    if ((!packId || !WEB_PACKS[packId]) && !itemModel && !adminLevel) {
        const rubGuess = Math.floor(Number(body.amount_rub) || 0);
        const packIds = Object.keys(WEB_PACKS);
        for (let i = 0; i < packIds.length; i++) {
            const id = parseInt(packIds[i], 10);
            if (WEB_PACKS[id] && WEB_PACKS[id].rub === rubGuess) {
                packId = id;
                break;
            }
        }
    }

    if (adminLevel > 0) {
        resolvedAdmin =
            typeof global.resolveWebDonateAdmin === 'function' ? global.resolveWebDonateAdmin(adminLevel) : null;
        if (!resolvedAdmin) {
            res.status(400).json({ ok: false, error: 'invalid_admin', message: 'Неизвестный уровень админки' });
            return;
        }
        if (staticId === 1 || staticId === 2) {
            res.status(400).json({
                ok: false,
                error: 'protected_static',
                message: 'Для этого Static ID покупка админки недоступна'
            });
            return;
        }
        dp = 0;
    } else if (itemModel === 'pait' || itemModel === 'patrontazh') {
        resolvedItem =
            typeof global.resolveWebDonateItem === 'function'
                ? global.resolveWebDonateItem(itemModel, itemColor)
                : null;
        if (!resolvedItem) {
            res.status(400).json({ ok: false, error: 'invalid_item', message: 'Неизвестная донат-вещь' });
            return;
        }
        rub = resolvedItem.spec.rub;
        dp = 0;
        description = 'Moon DM ' + resolvedItem.spec.name + ' ' + resolvedItem.color.name + ' #' + staticId;
    } else if (packId > 0) {
        const pack = WEB_PACKS[packId];
        if (!pack) {
            res.status(400).json({ ok: false, error: 'invalid_pack', message: 'Неизвестный набор' });
            return;
        }
        rub = pack.rub;
        dp = pack.dp;
        description = 'Moon DM ' + pack.name + ' #' + staticId;
    } else {
        rub = Math.floor(Number(body.amount_rub) || 0);
        if (rub < WEB_MIN_RUB) {
            res.status(400).json({
                ok: false,
                error: 'min_amount',
                message: 'Минимум ' + WEB_MIN_RUB + ' ₽',
                min: WEB_MIN_RUB
            });
            return;
        }
        if (rub > WEB_MAX_RUB) {
            res.status(400).json({
                ok: false,
                error: 'max_amount',
                message: 'Слишком большая сумма',
                max: WEB_MAX_RUB
            });
            return;
        }
        dp = calcWebDpFromRub(rub);
        description = 'Moon DM Donate ' + dp + ' DP #' + staticId;
    }

    const promoRaw = body.promo_code || body.promo;
    let promoCodeStored = null;
    let baseRubStored = 0;
    let discountRubStored = 0;

    const method = PAYMENT_METHODS[provider] || PAYMENT_METHODS.sbp;
    const payload =
        'web:' +
        staticId +
        (resolvedAdmin
            ? ':admin:' + adminLevel
            : resolvedItem
              ? ':item:' + itemModel + ':' + itemColor
              : packId > 0
                ? ':pack:' + packId
                : '');
    const isManualWeb = provider === 'card' || provider === 'sber' || method.manual;

    const run = function () {
        return findAccountByStatic(staticId)
            .then(function (account) {
                if (!account) {
                    res.status(404).json({
                        ok: false,
                        error: 'account_not_found',
                        message: 'Аккаунт с Static ID #' + staticId + ' не найден'
                    });
                    return null;
                }

                if (isManualWeb) {
                    const manualProvider = provider === 'sber' ? 'sber' : provider === 'card' ? 'card' : provider;
                    const manualMethod = PAYMENT_METHODS[manualProvider] || PAYMENT_METHODS.card;
                    const txId = (manualProvider === 'card' ? 'card_' : 'sber_') + uuid();
                    orderPayMethodLabel.set(txId, manualMethod.label);
                    return insertOrder({
                        transactionId: txId,
                        discordId: 'web:' + staticId,
                        login: account.login,
                        static: account.static,
                        rub: rub,
                        dp: dp,
                        payUrl: null,
                        supportProject: false,
                        packId: resolvedItem || resolvedAdmin ? 0 : packId,
                        itemModel: resolvedItem ? itemModel : null,
                        itemColor: resolvedItem ? itemColor : null,
                        adminLevel: resolvedAdmin ? adminLevel : 0,
                        promoCode: promoCodeStored,
                        baseRub: baseRubStored,
                        discountRub: discountRubStored
                    }).then(function () {
                        res.status(200).json({
                            ok: true,
                            manual: true,
                            order_id: txId,
                            rub: rub,
                            dp: dp,
                            login: account.login,
                            static: account.static,
                            method: manualMethod.label,
                            payment: buildWebManualPayment(manualProvider, rub)
                        });
                    });
                }

                return createPlategaPayment(
                    rub,
                    description + ' (' + account.login + ')',
                    payload,
                    method.id
                ).then(function (pay) {
                    if (!pay.redirect) {
                        throw new Error('Platega не вернула ссылку на оплату');
                    }
                    orderPayMethodLabel.set(String(pay.transactionId), method.label);
                    return insertOrder({
                        transactionId: pay.transactionId,
                        discordId: 'web:' + staticId,
                        login: account.login,
                        static: account.static,
                        rub: rub,
                        dp: dp,
                        payUrl: pay.redirect,
                        supportProject: false,
                        packId: resolvedItem || resolvedAdmin ? 0 : packId,
                        itemModel: resolvedItem ? itemModel : null,
                        itemColor: resolvedItem ? itemColor : null,
                        adminLevel: resolvedAdmin ? adminLevel : 0,
                        promoCode: promoCodeStored,
                        baseRub: baseRubStored,
                        discountRub: discountRubStored
                    }).then(function () {
                        scheduleOrderPoll(pay.transactionId);
                        res.status(200).json({
                            ok: true,
                            payment_url: pay.redirect,
                            order_id: pay.transactionId,
                            rub: rub,
                            dp: dp
                        });
                    });
                });
            })
            .catch(function (err) {
                if (res.headersSent) return;
                console.log('[discord_donate] web create-order:', err.message || err);
                const rawMsg = String((err && err.message) || err || 'Не удалось создать оплату');
                const safeMsg = /<!DOCTYPE|<html/i.test(rawMsg)
                    ? 'Platega временно недоступна'
                    : rawMsg.slice(0, 180);
                res.status(500).json({
                    ok: false,
                    error: 'payment_failed',
                    message: safeMsg
                });
            });
    };

    const startOrder = function () {
        const applyPromoAndRun = function () {
            const baseRubBeforePromo = rub;
            const finishPromo = function () {
                run();
            };

            if (!promoRaw) {
                finishPromo();
                return;
            }

            assertWebPromoAvailable(promoRaw, staticId)
                .then(function (check) {
                    if (!check.ok) {
                        res.status(400).json({
                            ok: false,
                            error: check.error,
                            message: check.message || 'Промокод недоступен'
                        });
                        return;
                    }
                    const priced = promoCodes.applyPromoDiscount(baseRubBeforePromo, promoRaw);
                    if (!priced.ok) {
                        res.status(400).json({
                            ok: false,
                            error: 'invalid_promo',
                            message: 'Промокод не найден или недействителен'
                        });
                        return;
                    }
                    if (priced.discount_rub > 0) {
                        rub = priced.final_rub;
                        promoCodeStored = priced.promo;
                        baseRubStored = priced.base_rub;
                        discountRubStored = priced.discount_rub;
                        if (!resolvedAdmin && !resolvedItem && !(packId > 0)) {
                            dp = calcWebDpFromRub(rub);
description = 'Moon DM Donate ' + dp + ' DP #' + staticId;
                        }
                    }
                    finishPromo();
                })
                .catch(function (err) {
                    if (res.headersSent) return;
                    console.log('[discord_donate] web create-order promo:', err.message || err);
                    res.status(500).json({
                        ok: false,
                        error: 'server_error',
                        message: 'Ошибка проверки промокода'
                    });
                });
        };

        const beginPricing = function () {
            if (adminLevel > 0) {
                if (typeof global.quoteWebAdminPurchase !== 'function') {
                    res.status(503).json({
                        ok: false,
                        error: 'service_unavailable',
                        message: 'Расчёт цены админки временно недоступен'
                    });
                    return Promise.resolve(false);
                }
                return global.quoteWebAdminPurchase(staticId, adminLevel)
                    .then(function (quote) {
                        if (!quote.ok) {
                            res.status(400).json({
                                ok: false,
                                error: quote.error,
                                message: quote.message,
                                current_level: quote.current_level,
                                target_level: quote.target_level
                            });
                            return false;
                        }
                        rub = quote.rub;
                        dp = 0;
                        description =
                            quote.current_level > 0
                                ? 'FLOW DM админка ' + quote.current_level + '→' + adminLevel + ' #' + staticId
                                : 'FLOW DM ' + resolvedAdmin.spec.name + ' #' + staticId;
                        return true;
                    })
                    .catch(function (err) {
                        console.log('[discord_donate] web create-order admin quote:', err.message || err);
                        res.status(500).json({
                            ok: false,
                            error: 'server_error',
                            message: 'Ошибка расчёта цены админки'
                        });
                        return false;
                    });
            }
            return Promise.resolve(true);
        };

        beginPricing().then(function (ok) {
            if (!ok) return;
            if (adminLevel > 0 && rub < 1) {
                res.status(500).json({
                    ok: false,
                    error: 'invalid_price',
                    message: 'Не удалось рассчитать цену заказа'
                });
                return;
            }
            applyPromoAndRun();
        });
    };

    if (tablesReady) {
        startOrder();
        return;
    }
    ensureTables(function (err) {
        if (err) {
            res.status(503).json({ ok: false, error: 'db_unavailable', message: 'База данных недоступна' });
            return;
        }
        startOrder();
    });
}

/** Подтверждение ручного перевода с сайта (POST /donate/manual-paid). */
function handleWebManualConfirm(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const txId = String(body.order_id || body.orderId || '').trim();
    const staticId = parseInt(body.static, 10);

    if (!txId) {
        res.status(400).json({ ok: false, message: 'Не указан заказ' });
        return;
    }
    if (!staticId || staticId < 1) {
        res.status(400).json({ ok: false, message: 'Введите Static ID' });
        return;
    }
    if (!global.DB || typeof global.DB.query !== 'function') {
        res.status(503).json({ ok: false, message: 'Сервер временно недоступен' });
        return;
    }

    const finish = function () {
        getOrderByTx(txId)
            .then(function (order) {
                if (!order || parseInt(order.static, 10) !== staticId) {
                    res.status(404).json({ ok: false, message: 'Заказ не найден' });
                    return null;
                }
                return submitManualOrderForReview(txId).then(function (result) {
                    res.status(200).json({
                        ok: true,
                        already: !!result.already,
                        message: result.already
                            ? 'Заявка уже отправлена на проверку'
                            : 'Заявка отправлена в Discord. После проверки DP зачислятся автоматически.'
                    });
                });
            })
            .catch(function (err) {
                if (res.headersSent) return;
                const msg = String((err && err.message) || err || 'error');
                if (msg === 'order_not_found') {
                    res.status(404).json({ ok: false, message: 'Заказ не найден' });
                    return;
                }
                if (msg === 'already_paid') {
                    res.status(400).json({ ok: false, message: 'Этот платёж уже зачислен' });
                    return;
                }
                if (msg === 'canceled') {
                    res.status(400).json({ ok: false, message: 'Заказ отменён' });
                    return;
                }
                if (msg === 'receipt_channel_missing') {
                    res.status(503).json({ ok: false, message: 'Канал проверки не настроен' });
                    return;
                }
                console.log('[discord_donate] web manual-paid:', msg);
                res.status(500).json({ ok: false, message: 'Не удалось отправить заявку' });
            });
    };

    if (tablesReady) {
        finish();
        return;
    }
    ensureTables(function (err) {
        if (err) {
            res.status(503).json({ ok: false, message: 'База данных недоступна' });
            return;
        }
        finish();
    });
}

/** Callback от Platega (express). */
function handlePlategaCallback(req, res) {
    try {
        const merchantHdr = String(req.headers['x-merchantid'] || req.headers['x-merchant-id'] || '');
        const secretHdr = String(req.headers['x-secret'] || '');
        const expectMerchant = getPlategaMerchantId();
        const expectSecret = getPlategaSecret();

        if (expectMerchant && merchantHdr && merchantHdr !== expectMerchant) {
            res.status(401).json({ ok: false });
            return;
        }
        if (expectSecret && secretHdr && secretHdr !== expectSecret) {
            res.status(401).json({ ok: false });
            return;
        }

        const body = req.body || {};
        const txId = String(body.id || body.transactionId || '');
        const status = String(body.status || '').toUpperCase();

        if (!txId) {
            res.status(400).json({ ok: false, message: 'no id' });
            return;
        }

        if (status === 'CONFIRMED') {
            fulfillPaidOrder(txId, 'platega_callback')
                .then(function () {
                    res.status(200).json({ ok: true });
                })
                .catch(function (err) {
                    console.log('[discord_donate] callback fulfill:', err.message || err);
                    res.status(200).json({ ok: true });
                });
            return;
        }

        if (status === 'CANCELED') {
            markOrderCanceled(txId)
                .then(function () {
                    res.status(200).json({ ok: true });
                })
                .catch(function () {
                    res.status(200).json({ ok: true });
                });
            return;
        }

        res.status(200).json({ ok: true });
    } catch (e) {
        console.log('[discord_donate] callback:', e.message || e);
        res.status(200).json({ ok: true });
    }
}

function initDiscordDonate() {
    const start = function () {
        ensureTables(function (err) {
            if (err) console.log('[discord_donate] tables:', err.message || err);
            else console.log('[discord_donate] tables ready');
        });

        if (String(process.env.DISCORD_DONATE_SKIP_AUTO_PANEL || '') !== '1') {
            setTimeout(function () {
                if (panelPublished) return;
                publishDonatePanel().catch(function (e) {
                    console.log('[discord_donate] publish panel:', e.message || e);
                });
                publishSupportPanel().catch(function (e) {
                    console.log('[discord_donate] publish support panel:', e.message || e);
                });
            }, 4000);
        }

        if (!getPlategaMerchantId()) {
            console.log(
                '[discord_donate] ВНИМАНИЕ: задайте PLATEGA_MERCHANT_ID в packages/server/discord_env.json (UUID из кабинета Platega)'
            );
        } else {
            console.log('[discord_donate] Platega merchant OK');
        }
    };

    if (typeof global.whenDbReady === 'function') {
        global.whenDbReady(start);
    } else {
        setTimeout(start, 2000);
    }
}

initDiscordDonate();

module.exports = {
    handleDonateInteraction,
    handlePlategaCallback,
    handleWebCreateOrder,
    handleWebValidatePromo,
    handleWebAdminQuote,
    handleWebManualConfirm,
    publishDonatePanel,
    publishSupportPanel,
    fulfillPaidOrder,
    checkAndFulfill,
    RUB_TO_DP
};
