/**
 * Автовыдача веб-доната: DP, стартовые наборы, патронтаж, пеинты.
 */
'use strict';

const WEB_PACKS = {
    1: { rub: 299, dp: 600, money: 100000, silverCases: 0, goldCases: 0, vipLvl: 0, vipDays: 0, name: 'Новичок' },
    2: { rub: 499, dp: 1000, money: 500000, silverCases: 1, goldCases: 0, vipLvl: 0, vipDays: 0, name: 'Боец' },
    3: { rub: 799, dp: 1600, money: 1500000, silverCases: 0, goldCases: 0, vipLvl: 2, vipDays: 30, name: 'Ветеран' },
    4: { rub: 1299, dp: 2600, money: 3500000, silverCases: 0, goldCases: 2, vipLvl: 3, vipDays: 31, name: 'Легенда' }
};

const PAIT_COLORS = {
    a: { tex: 0, name: 'Бордовый' },
    b: { tex: 1, name: 'Жёлтый' },
    c: { tex: 2, name: 'Белый' },
    d: { tex: 3, name: 'Чёрно-белый' },
    e: { tex: 4, name: 'Розово-белый' },
    f: { tex: 5, name: 'Розовый' }
};

const PAIT_ITEM_ID_BASE = 85759;

function paitItemId(tex) {
    const t = parseInt(tex, 10) || 0;
    if (t < 0 || t > 5) return PAIT_ITEM_ID_BASE;
    return PAIT_ITEM_ID_BASE + t;
}

function paitPreviewImg(tex) {
    const t = parseInt(tex, 10) || 0;
    return 'ItemsMale/Shoes/173_' + t + '.jpg';
}

const PATRONTAZH_COLORS = {
    '1': { tex: 0, name: 'Чёрный' },
    '2': { tex: 1, name: 'Белый' },
    '3': { tex: 2, name: 'Коричневый' }
};

const WEB_ITEMS = {
    pait: {
        rub: 149,
        name: 'Пеинты',
        clothId: 5,
        itemId: 85759,
        drawable: 173,
        component: 6,
        colors: PAIT_COLORS
    },
    patrontazh: {
        rub: 249,
        name: 'Патронтаж',
        clothId: 9,
        itemId: 87001,
        drawable: 305,
        component: 10,
        colors: PATRONTAZH_COLORS
    }
};

/** Покупка админки на сайте: уровни 1–10. */
const WEB_ADMIN_LEVELS = {
    1: { rub: 269, name: 'Админ 1 уровень' },
    2: { rub: 409, name: 'Админ 2 уровень' },
    3: { rub: 559, name: 'Админ 3 уровень' },
    4: { rub: 719, name: 'Админ 4 уровень' },
    5: { rub: 919, name: 'Админ 5 уровень' },
    6: { rub: 1129, name: 'Админ 6 уровень' },
    7: { rub: 1359, name: 'Админ 7 уровень' },
    8: { rub: 1659, name: 'Админ 8 уровень' },
    9: { rub: 2199, name: 'Админ 9 уровень' },
    10: { rub: 3799, name: 'Админ 10 уровень' }
};

const WEB_ADMIN_PROTECTED_STATICS = { 1: true, 2: true };

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

function ensureGoldCasesColumn() {
    if (!global.DB) {
        setTimeout(ensureGoldCasesColumn, 1500);
        return;
    }
    global.DB.query('ALTER TABLE accounts ADD COLUMN gold_cases INT NOT NULL DEFAULT 0', [], function (err) {
        if (!err) {
            console.log('[donate_fulfill] колонка accounts.gold_cases создана.');
            return;
        }
        const msg = String(err.message || '').toLowerCase();
        if (msg.includes('duplicate') && msg.includes('column')) return;
        console.log('[donate_fulfill] gold_cases ALTER:', err.message || err);
    });
}

function findPlayerByStatic(staticId) {
    const sid = parseInt(staticId, 10);
    if (!sid || typeof mp === 'undefined' || !mp.players) return null;
    let found = null;
    mp.players.forEach(function (p) {
        if (found) return;
        if (!mp.players.exists(p) || p.static != sid) return;
        found = p;
    });
    return found;
}

function orderField(order, key) {
    if (!order || typeof order !== 'object') return undefined;
    if (order[key] != null && order[key] !== '') return order[key];
    const upper = String(key).toUpperCase();
    if (order[upper] != null && order[upper] !== '') return order[upper];
    return undefined;
}

function resolveOrderPack(order) {
    const packId = parseInt(orderField(order, 'pack_id'), 10) || 0;
    if (packId > 0 && WEB_PACKS[packId]) return { id: packId, pack: WEB_PACKS[packId] };
    const rub = parseInt(orderField(order, 'rub'), 10) || 0;
    const ids = Object.keys(WEB_PACKS);
    for (let i = 0; i < ids.length; i++) {
        const id = parseInt(ids[i], 10);
        const pack = WEB_PACKS[id];
        if (pack && pack.rub === rub) return { id: id, pack: pack };
    }
    return null;
}

function creditDp(login, dp, meta) {
    return new Promise(function (resolve) {
        const add = parseInt(dp, 10) || 0;
        if (add < 1) return resolve({ ok: true, skipped: true });
        if (typeof global.creditDpByLogin !== 'function') {
            return resolve({ ok: false, error: 'credit_unavailable' });
        }
        global.creditDpByLogin(login, add, meta || {}, function (result) {
            resolve(result && result.ok ? result : { ok: false, error: (result && result.error) || 'credit_failed' });
        });
    });
}

function syncPlayerMoneyHud(player, newMoney) {
    if (!player || typeof mp === 'undefined' || !mp.players.exists(player)) return;
    if (newMoney != null) player.money = newMoney;
    try {
        player.call(
            'updateMoney',
            [typeof global.formatnum1 === 'function' ? global.formatnum1(player.money) : String(player.money)]
        );
    } catch (_e) {}
    try {
        if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
    } catch (_e2) {}
}

function creditMoney(staticId, amount) {
    return new Promise(function (resolve) {
        const add = parseInt(amount, 10) || 0;
        const sid = parseInt(staticId, 10);
        if (add < 1) return resolve({ ok: true, skipped: true });
        if (!sid) return resolve({ ok: false, error: 'bad_static' });
        const player = findPlayerByStatic(sid);
        const finish = function (err, newMoney) {
            if (err) {
                console.log('[donate_fulfill] creditMoney', err && err.message);
                return resolve({ ok: false, error: 'money_failed' });
            }
            if (player) syncPlayerMoneyHud(player, newMoney);
            resolve({ ok: true, value: newMoney });
        };
        if (typeof global.economyAddMoney === 'function') {
            global.economyAddMoney(player || sid, add, finish);
            return;
        }
        dbQuery('UPDATE accounts SET money = GREATEST(0, CAST(money AS SIGNED) + ?) WHERE static = ?', [add, sid])
            .then(function () {
                return dbQuery('SELECT money FROM accounts WHERE static = ? LIMIT 1', [sid]);
            })
            .then(function (rows) {
                const next = rows && rows[0] ? parseInt(String(rows[0].money).replace(/[^\d-]/g, ''), 10) || 0 : 0;
                finish(null, next);
            })
            .catch(function (err) {
                finish(err);
            });
    });
}

function addAccountInt(staticId, column, amount, liveKey, liveCall) {
    return new Promise(function (resolve) {
        const add = parseInt(amount, 10) || 0;
        if (add < 1) return resolve({ ok: true, skipped: true });
        dbQuery(
            'UPDATE accounts SET ' + column + ' = GREATEST(0, CAST(' + column + ' AS SIGNED) + ?) WHERE static = ?',
            [add, staticId]
        )
            .then(function () {
                return dbQuery('SELECT ' + column + ' FROM accounts WHERE static = ? LIMIT 1', [staticId]);
            })
            .then(function (rows) {
                const next = rows && rows[0] ? parseInt(rows[0][column], 10) || 0 : 0;
                const player = findPlayerByStatic(staticId);
                if (player) {
                    if (liveKey) player[liveKey] = next;
                    if (liveCall) {
                        try {
                            player.call(
                                liveCall,
                                [typeof global.formatnum1 === 'function' ? global.formatnum1(next) : String(next)]
                            );
                        } catch (_e) {}
                    }
                }
                resolve({ ok: true, value: next });
            })
            .catch(function (err) {
                console.log('[donate_fulfill] addAccountInt', column, err && err.message);
                resolve({ ok: false, error: column + '_failed' });
            });
    });
}

function grantVip(staticId, targetLvl, days) {
    return new Promise(function (resolve) {
        const lvl = parseInt(targetLvl, 10) || 0;
        const addDays = parseInt(days, 10) || 0;
        if (lvl < 1 || addDays < 1) return resolve({ ok: true, skipped: true });
        dbQuery('SELECT viplvl, vipdate FROM accounts WHERE static = ? LIMIT 1', [staticId])
            .then(function (rows) {
                const row = (rows && rows[0]) || {};
                const cur = parseInt(row.viplvl, 10) || 0;
                const now = new Date();
                let expiry = row.vipdate ? new Date(row.vipdate) : null;
                if (expiry && isNaN(expiry.getTime())) expiry = null;
                const keepLvl = cur > lvl ? cur : lvl;
                let base = now;
                if (cur >= lvl && expiry && expiry > now) base = expiry;
                const nextDate = new Date(base.getTime());
                nextDate.setDate(nextDate.getDate() + addDays);
                const iso = nextDate.toISOString().slice(0, 16).replace('T', ' ');
                return dbQuery('UPDATE accounts SET viplvl = ?, vipdate = ? WHERE static = ?', [keepLvl, iso, staticId]).then(
                    function () {
                        const player = findPlayerByStatic(staticId);
                        if (player) {
                            player.viplvl = keepLvl;
                            player.vipdate = nextDate;
                            try {
                                player.setVariable('viplvl', keepLvl);
                                player.call('updateviplvl', [keepLvl]);
                                const daysLeft = Math.max(0, Math.floor((nextDate - now) / 86400000));
                                player.call('updatevipdate', [daysLeft + 'д.']);
                                if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
                            } catch (_e) {}
                        }
                        resolve({ ok: true, viplvl: keepLvl });
                    }
                );
            })
            .catch(function (err) {
                console.log('[donate_fulfill] grantVip', err && err.message);
                resolve({ ok: false, error: 'vip_failed' });
            });
    });
}

function makeClothSellItem(spec, colorMeta, frac) {
    const tex = Number(colorMeta.tex) || 0;
    const isPait = Number(spec.clothId) === 5 && Number(spec.drawable) === 173;
    const itemId = isPait ? paitItemId(tex) : spec.itemId;
    return {
        ClothID: spec.clothId,
        ItemID: itemId,
        ItemName: spec.name + ' · ' + colorMeta.name,
        Price: 0,
        Drawable: spec.drawable,
        ItemImg: isPait ? paitPreviewImg(tex) : null,
        Textures: null,
        TopTexture: tex,
        Component: spec.component,
        Torso: null,
        Frac: frac || 1,
        webPait: isPait || undefined
    };
}

function pushTokenOffline(staticId, token) {
    return dbQuery('SELECT inventory FROM accounts WHERE static = ? LIMIT 1', [staticId]).then(function (rows) {
        let inv = [];
        try {
            inv = JSON.parse((rows && rows[0] && rows[0].inventory) || '[]');
        } catch (_e) {
            inv = [];
        }
        if (!Array.isArray(inv)) inv = [];
        const max = 50;
        while (inv.length < max) inv.push(null);
        let placed = false;
        for (let i = 0; i < inv.length; i++) {
            const v = inv[i];
            if (v == null || v === '' || v === false) {
                inv[i] = token;
                placed = true;
                break;
            }
        }
        if (!placed) inv.push(token);
        return dbQuery('UPDATE accounts SET inventory = ? WHERE static = ?', [JSON.stringify(inv), staticId]);
    });
}

function grantClothItem(staticId, spec, colorMeta) {
    return new Promise(function (resolve) {
        const player = findPlayerByStatic(staticId);
        const frac = player && player.getVariable ? parseInt(player.getVariable('fraction'), 10) || 1 : 1;
        const item = makeClothSellItem(spec, colorMeta, frac);
        const token =
            typeof global.inventoryMakeClothToken === 'function' ? global.inventoryMakeClothToken(item) : null;
        if (!token) return resolve({ ok: false, error: 'cloth_token' });

        if (player) {
            const pushed = typeof global.tryPushInventoryItem === 'function' && global.tryPushInventoryItem(player, token);
            if (!pushed) {
                pushTokenOffline(staticId, token)
                    .then(function () {
                        resolve({ ok: true, offline: true, overflow: true });
                    })
                    .catch(function () {
                        resolve({ ok: false, error: 'inventory_full' });
                    });
                return;
            }
            if (typeof global.saveInventory === 'function') global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            try {
                if (typeof isNotify === 'function') {
                    isNotify(player, 3, 'top-mid', 'В инвентарь: ' + item.ItemName, 4000);
                }
                player.call('sound:client', [3]);
            } catch (_e) {}
            return resolve({ ok: true, online: true });
        }

        pushTokenOffline(staticId, token)
            .then(function () {
                resolve({ ok: true, offline: true });
            })
            .catch(function (err) {
                console.log('[donate_fulfill] cloth offline', err && err.message);
                resolve({ ok: false, error: 'inventory_failed' });
            });
    });
}

function resolveWebItem(model, color) {
    const spec = WEB_ITEMS[String(model || '').toLowerCase()];
    if (!spec) return null;
    const key = String(color || '');
    const colorMeta = spec.colors[key] || spec.colors[key.toLowerCase()];
    if (!colorMeta) return null;
    return { spec: spec, color: colorMeta };
}

function resolveWebAdmin(level) {
    const lvl = parseInt(level, 10) || 0;
    const spec = WEB_ADMIN_LEVELS[lvl];
    if (!spec) return null;
    return { level: lvl, spec: spec };
}

function getAccountAdminLevel(staticId) {
    const sid = parseInt(staticId, 10);
    if (!sid) return Promise.resolve(0);
    return dbQuery('SELECT adminlvl FROM accounts WHERE static = ? LIMIT 1', [sid]).then(function (rows) {
        const row = rows && rows[0];
        if (!row) return null;
        return Math.max(0, Math.min(10, parseInt(row.adminlvl, 10) || 0));
    });
}

function quoteWebAdminPurchase(staticId, targetLevel) {
    const sid = parseInt(staticId, 10);
    const target = Math.max(0, Math.min(10, Math.floor(Number(targetLevel) || 0)));
    const spec = WEB_ADMIN_LEVELS[target];
    if (!sid || sid < 1) {
        return Promise.resolve({ ok: false, error: 'invalid_static', message: 'Введите Static ID' });
    }
    if (!spec) {
        return Promise.resolve({ ok: false, error: 'invalid_admin', message: 'Неизвестный уровень админки' });
    }
    if (WEB_ADMIN_PROTECTED_STATICS[sid]) {
        return Promise.resolve({
            ok: false,
            error: 'protected_static',
            message: 'Для этого Static ID покупка админки недоступна'
        });
    }
    return getAccountAdminLevel(sid).then(function (currentLevel) {
        if (currentLevel === null) {
            return { ok: false, error: 'account_not_found', message: 'Аккаунт с Static ID #' + sid + ' не найден' };
        }
        const current = Math.max(0, Math.min(10, currentLevel));
        if (current >= target) {
            return {
                ok: false,
                error: 'admin_already_owned',
                message:
                    current === target
                        ? 'У вас уже админка ' + current + ' уровня'
                        : 'У вас уже админка ' + current + ' уровня — выше выбранного',
                current_level: current,
                target_level: target
            };
        }
        const currentRub = current > 0 && WEB_ADMIN_LEVELS[current] ? WEB_ADMIN_LEVELS[current].rub : 0;
        const rub = spec.rub - currentRub;
        if (rub < 1) {
            return { ok: false, error: 'invalid_price', message: 'Некорректная цена апгрейда' };
        }
        return {
            ok: true,
            rub: rub,
            full_rub: spec.rub,
            upgrade_rub: rub,
            current_level: current,
            target_level: target,
            from_scratch: current < 1,
            name: spec.name
        };
    });
}

function grantWebAdminLevel(staticId, level) {
    return new Promise(function (resolve) {
        const sid = parseInt(staticId, 10);
        const lvl = Math.max(0, Math.min(10, Math.floor(Number(level) || 0)));
        if (!sid || sid < 1) return resolve({ ok: false, error: 'bad_static' });
        if (lvl < 1 || lvl > 10) return resolve({ ok: false, error: 'invalid_admin_level' });
        if (WEB_ADMIN_PROTECTED_STATICS[sid]) {
            return resolve({ ok: false, error: 'protected_static' });
        }
        dbQuery('SELECT login, adminlvl FROM accounts WHERE static = ? LIMIT 1', [sid])
            .then(function (rows) {
                const row = rows && rows[0];
                if (!row) return resolve({ ok: false, error: 'account_not_found' });
                return dbQuery('UPDATE accounts SET adminlvl = ? WHERE static = ?', [String(lvl), sid]).then(function () {
                    const player = findPlayerByStatic(sid);
                    if (player) {
                        try {
                            player.adminlvl = lvl;
                            if (global.adminSessionIsGated && global.adminSessionIsGated(player)) {
                                player._adminSession = false;
                                player._adminPassPrompt = null;
                            }
                            if (typeof global.syncAdminSessionClient === 'function') {
                                global.syncAdminSessionClient(player);
                            } else {
                                player.setVariable('adminlvl', lvl);
                            }
                            if (typeof isNotify === 'function') {
                                isNotify(player, 3, 'top-mid', 'Вам выдана админка ' + lvl + ' уровня', 5000);
                            } else {
                                player.outputChatBox('Вам выдана админка ' + lvl + ' уровня.');
                            }
                        } catch (_e) {}
                    }
                    if (typeof global.sendDiscordLog === 'function') {
                        global.sendDiscordLog(
                            'Покупка админки на сайте!\n\nИгрок — [' +
                                sid +
                                '] ' +
                                row.login +
                                '\nLVL — ' +
                                lvl,
                            '1266445805355532368'
                        );
                    }
                    console.log('[donate_fulfill] admin lvl ' + lvl + ' #' + sid + ' ok');
                    return resolve({ ok: true, level: lvl, login: row.login });
                });
            })
            .catch(function (err) {
                console.log('[donate_fulfill] grantWebAdminLevel', err && err.message);
                resolve({ ok: false, error: 'admin_failed' });
            });
    });
}

function packNotifyText(pack) {
    const bits = [pack.dp + ' DP'];
    if (pack.money > 0) bits.push(pack.money.toLocaleString('ru-RU') + ' $');
    if (pack.silverCases > 0) bits.push(pack.silverCases + ' Silver Case');
    if (pack.goldCases > 0) bits.push(pack.goldCases + ' Gold Case');
    if (pack.vipLvl === 2 && pack.vipDays > 0) bits.push('Silver VIP ' + pack.vipDays + 'д.');
    if (pack.vipLvl === 3 && pack.vipDays > 0) bits.push('Platinum VIP ' + pack.vipDays + 'д.');
    return 'Набор «' + pack.name + '»: ' + bits.join(', ');
}

function grantWebPack(order, source) {
    const resolved = resolveOrderPack(order);
    const pack = resolved && resolved.pack;
    if (!pack) return Promise.resolve({ ok: false, error: 'invalid_pack' });
    const staticId = parseInt(orderField(order, 'static'), 10);
    const login = orderField(order, 'login');
    const meta = {
        rub: orderField(order, 'rub'),
        source: source || 'platega',
        orderId: orderField(order, 'transaction_id')
    };
    return creditDp(login, pack.dp, meta).then(function (dpRes) {
        if (!dpRes.ok) return dpRes;
        return Promise.all([
            creditMoney(staticId, pack.money),
            addAccountInt(staticId, 'cases', pack.silverCases, 'case', 'updatefreecase1'),
            addAccountInt(staticId, 'gold_cases', pack.goldCases, 'goldCase', 'updatefreegoldcase1'),
            grantVip(staticId, pack.vipLvl, pack.vipDays)
        ]).then(function (parts) {
            const failed = [];
            if (parts[0] && parts[0].ok === false) failed.push('money');
            if (parts[1] && parts[1].ok === false) failed.push('silver_case');
            if (parts[2] && parts[2].ok === false) failed.push('gold_case');
            if (parts[3] && parts[3].ok === false) failed.push('vip');
            const player = findPlayerByStatic(staticId);
            if (player) {
                try {
                    if (typeof isNotify === 'function') {
                        isNotify(player, 3, 'top-mid', packNotifyText(pack), 6000);
                    }
                } catch (_e) {}
            }
            console.log(
                '[donate_fulfill] pack «' +
                    pack.name +
                    '» #' +
                    staticId +
                    (failed.length ? ' partial: ' + failed.join(',') : ' ok')
            );
            return {
                ok: true,
                pack: pack,
                credit: dpRes,
                money: parts[0],
                vip: parts[3],
                failed: failed
            };
        });
    });
}

function grantWebItem(order) {
    const resolved = resolveWebItem(orderField(order, 'item_model'), orderField(order, 'item_color'));
    if (!resolved) return Promise.resolve({ ok: false, error: 'invalid_item' });
    return grantClothItem(parseInt(orderField(order, 'static'), 10), resolved.spec, resolved.color).then(function (res) {
        return Object.assign({ item: resolved.spec.name, color: resolved.color.name }, res);
    });
}

function fulfillWebDonateOrder(order, source) {
    const adminLevel = parseInt(orderField(order, 'admin_level'), 10) || 0;
    if (adminLevel > 0) {
        return grantWebAdminLevel(parseInt(orderField(order, 'static'), 10), adminLevel).then(function (res) {
            const spec = WEB_ADMIN_LEVELS[adminLevel];
            return Object.assign({ admin: spec ? spec.name : 'Админ ' + adminLevel }, res);
        });
    }
    const itemModel = String(orderField(order, 'item_model') || '').toLowerCase();
    if (itemModel === 'pait' || itemModel === 'patrontazh') {
        return grantWebItem(order);
    }
    const resolved = resolveOrderPack(order);
    if (resolved) {
        return grantWebPack(Object.assign({}, order, { pack_id: resolved.id }), source);
    }
    return creditDp(orderField(order, 'login'), orderField(order, 'dp'), {
        rub: orderField(order, 'rub'),
        source: source || 'platega',
        orderId: orderField(order, 'transaction_id')
    });
}

ensureGoldCasesColumn();

global.WEB_DONATE_PACKS = WEB_PACKS;
global.WEB_DONATE_ITEMS = WEB_ITEMS;
global.WEB_DONATE_ADMIN = WEB_ADMIN_LEVELS;
global.fulfillWebDonateOrder = fulfillWebDonateOrder;
global.resolveWebDonateItem = resolveWebItem;
global.resolveWebDonateAdmin = resolveWebAdmin;
global.quoteWebAdminPurchase = quoteWebAdminPurchase;

module.exports = {
    WEB_PACKS,
    WEB_ITEMS,
    WEB_ADMIN_LEVELS,
    resolveWebItem,
    resolveWebAdmin,
    quoteWebAdminPurchase,
    fulfillWebDonateOrder
};
