'use strict';

/**
 * Атомарные операции с DP / $ — против гонок и дюпов.
 */

function parseAmount(n) {
    const v = parseInt(String(n != null ? n : 0).replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(v) ? v : 0;
}

function syncPlayerDp(player, newDp) {
    if (!player || !mp.players.exists(player)) return;
    player.dp = newDp;
    try {
        player.call('updatedp', [typeof global.formatnum1 === 'function' ? global.formatnum1(newDp) : newDp]);
    } catch (_e) {}
}

function syncPlayerMoney(player, newMoney) {
    if (!player || !mp.players.exists(player)) return;
    player.money = newMoney;
    try {
        player.call('updateMoney', [typeof global.formatnum1 === 'function' ? global.formatnum1(newMoney) : newMoney]);
    } catch (_e) {}
}

/** Начислить DP атомарно (dp = dp + amount). */
global.economyAddDp = function (playerOrStatic, amount, cb) {
    const add = parseAmount(amount);
    if (add === 0) {
        if (cb) cb(null, null);
        return;
    }
    const isPlayer = playerOrStatic && typeof playerOrStatic === 'object' && mp.players.exists(playerOrStatic);
    const staticId = isPlayer ? playerOrStatic.static : parseAmount(playerOrStatic);
    if (!staticId) {
        if (cb) cb(new Error('bad static'));
        return;
    }
    global.DB.query(
        'UPDATE accounts SET dp = GREATEST(0, CAST(dp AS SIGNED) + ?) WHERE static = ?',
        [add, staticId],
        (err) => {
            if (err) {
                console.log('[economyAddDp]', err);
                if (cb) cb(err);
                return;
            }
            global.DB.query('SELECT dp FROM accounts WHERE static = ? LIMIT 1', [staticId], (e2, rows) => {
                if (e2 || !rows || !rows.length) {
                    if (cb) cb(e2 || new Error('missing'));
                    return;
                }
                const newDp = parseAmount(rows[0].dp);
                if (isPlayer) syncPlayerDp(playerOrStatic, newDp);
                else {
                    mp.players.forEach((p) => {
                        if (mp.players.exists(p) && p.static == staticId) syncPlayerDp(p, newDp);
                    });
                }
                if (cb) cb(null, newDp);
            });
        }
    );
};

/** Начислить $ атомарно. */
global.economyAddMoney = function (playerOrStatic, amount, cb) {
    const add = parseAmount(amount);
    if (add === 0) {
        if (cb) cb(null, null);
        return;
    }
    const isPlayer = playerOrStatic && typeof playerOrStatic === 'object' && mp.players.exists(playerOrStatic);
    const staticId = isPlayer ? playerOrStatic.static : parseAmount(playerOrStatic);
    if (!staticId) {
        if (cb) cb(new Error('bad static'));
        return;
    }
    global.DB.query(
        'UPDATE accounts SET money = GREATEST(0, CAST(money AS SIGNED) + ?) WHERE static = ?',
        [add, staticId],
        (err) => {
            if (err) {
                console.log('[economyAddMoney]', err);
                if (cb) cb(err);
                return;
            }
            global.DB.query('SELECT money FROM accounts WHERE static = ? LIMIT 1', [staticId], (e2, rows) => {
                if (e2 || !rows || !rows.length) {
                    if (cb) cb(e2 || new Error('missing'));
                    return;
                }
                const newMoney = parseAmount(rows[0].money);
                if (isPlayer) syncPlayerMoney(playerOrStatic, newMoney);
                else {
                    mp.players.forEach((p) => {
                        if (mp.players.exists(p) && p.static == staticId) syncPlayerMoney(p, newMoney);
                    });
                }
                if (cb) cb(null, newMoney);
            });
        }
    );
};

/**
 * Списать DP только если хватает.
 * cb(err, ok, newDp) — ok=false если недостаточно.
 */
global.economySpendDp = function (player, amount, cb) {
    const cost = parseAmount(amount);
    if (!player || !mp.players.exists(player) || !player.static) {
        if (cb) cb(new Error('bad player'), false, null);
        return;
    }
    if (cost <= 0) {
        if (cb) cb(null, true, parseAmount(player.dp));
        return;
    }
    const staticId = player.static;
    global.DB.query(
        'UPDATE accounts SET dp = CAST(dp AS SIGNED) - ? WHERE static = ? AND CAST(dp AS SIGNED) >= ?',
        [cost, staticId, cost],
        (err, result) => {
            if (err) {
                console.log('[economySpendDp]', err);
                if (cb) cb(err, false, null);
                return;
            }
            const ok = result && result.affectedRows > 0;
            if (!ok) {
                if (cb) cb(null, false, parseAmount(player.dp));
                return;
            }
            global.DB.query('SELECT dp FROM accounts WHERE static = ? LIMIT 1', [staticId], (e2, rows) => {
                const newDp = !e2 && rows && rows.length ? parseAmount(rows[0].dp) : Math.max(0, parseAmount(player.dp) - cost);
                syncPlayerDp(player, newDp);
                if (cb) cb(null, true, newDp);
            });
        }
    );
};

/** Списать $ только если хватает. */
global.economySpendMoney = function (player, amount, cb) {
    const cost = parseAmount(amount);
    if (!player || !mp.players.exists(player) || !player.static) {
        if (cb) cb(new Error('bad player'), false, null);
        return;
    }
    if (cost <= 0) {
        if (cb) cb(null, true, parseAmount(player.money));
        return;
    }
    const staticId = player.static;
    global.DB.query(
        'UPDATE accounts SET money = CAST(money AS SIGNED) - ? WHERE static = ? AND CAST(money AS SIGNED) >= ?',
        [cost, staticId, cost],
        (err, result) => {
            if (err) {
                console.log('[economySpendMoney]', err);
                if (cb) cb(err, false, null);
                return;
            }
            const ok = result && result.affectedRows > 0;
            if (!ok) {
                if (cb) cb(null, false, parseAmount(player.money));
                return;
            }
            global.DB.query('SELECT money FROM accounts WHERE static = ? LIMIT 1', [staticId], (e2, rows) => {
                const newMoney = !e2 && rows && rows.length ? parseAmount(rows[0].money) : Math.max(0, parseAmount(player.money) - cost);
                syncPlayerMoney(player, newMoney);
                if (cb) cb(null, true, newMoney);
            });
        }
    );
};

/** Одноразовый лок на игрока (анти-гонка). */
global.economyTryLock = function (player, key, ttlMs) {
    if (!player || !mp.players.exists(player)) return false;
    const k = '_econLock_' + String(key || 'default');
    const now = Date.now();
    if (player[k] && now - player[k] < (ttlMs || 5000)) return false;
    player[k] = now;
    return true;
};

global.economyUnlock = function (player, key) {
    if (!player) return;
    try {
        delete player['_econLock_' + String(key || 'default')];
    } catch (_e) {}
};
