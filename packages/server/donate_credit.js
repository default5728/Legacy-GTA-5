/**
 * Начисление DP по логину (Discord-донат / чеки).
 */
'use strict';

function normalizeLogin(login) {
    return String(login || '')
        .trim()
        .slice(0, 32);
}

function parsePositiveInt(n) {
    const v = parseInt(String(n != null ? n : 0).replace(/[^\d]/g, ''), 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * @param {string} login
 * @param {number} dpAmount
 * @param {{ rub?: number, source?: string, orderId?: string }} meta
 * @param {(result: { ok: boolean, error?: string, static?: number, dp?: number, newDp?: number }) => void} cb
 */
global.creditDpByLogin = function creditDpByLogin(login, dpAmount, meta, cb) {
    const done = typeof cb === 'function' ? cb : function () {};
    const loginNorm = normalizeLogin(login);
    const add = parsePositiveInt(dpAmount);
    const info = meta && typeof meta === 'object' ? meta : {};

    if (!loginNorm) return done({ ok: false, error: 'empty_login' });
    if (!add) return done({ ok: false, error: 'bad_dp' });
    if (!global.DB || typeof global.DB.query !== 'function') {
        return done({ ok: false, error: 'db_unavailable' });
    }

    global.DB.query(
        'SELECT static, dp, login FROM accounts WHERE LOWER(login) = LOWER(?) LIMIT 1',
        [loginNorm],
        function (err, rows) {
            if (err) {
                console.log('[creditDpByLogin]', err);
                return done({ ok: false, error: 'db_error' });
            }
            if (!rows || !rows.length) {
                return done({ ok: false, error: 'account_not_found' });
            }

            const staticId = parsePositiveInt(rows[0].static);
            const loginDb = String(rows[0].login || loginNorm);
            if (!staticId) return done({ ok: false, error: 'bad_static' });

            const finish = function (newDp) {
                try {
                    console.log(
                        '[creditDpByLogin] +' +
                            add +
                            ' DP → ' +
                            loginDb +
                            ' (#' +
                            staticId +
                            ') source=' +
                            String(info.source || 'unknown') +
                            ' order=' +
                            String(info.orderId || '-')
                    );
                } catch (_e) {}
                done({
                    ok: true,
                    static: staticId,
                    login: loginDb,
                    dp: add,
                    newDp: newDp,
                    rub: parsePositiveInt(info.rub)
                });
            };

            if (typeof global.economyAddDp === 'function') {
                global.economyAddDp(staticId, add, function (e2, newDp) {
                    if (e2) return done({ ok: false, error: 'credit_failed' });
                    finish(newDp);
                });
                return;
            }

            global.DB.query(
                'UPDATE accounts SET dp = GREATEST(0, CAST(dp AS SIGNED) + ?) WHERE static = ?',
                [add, staticId],
                function (e3) {
                    if (e3) {
                        console.log('[creditDpByLogin] update:', e3);
                        return done({ ok: false, error: 'credit_failed' });
                    }
                    global.DB.query('SELECT dp FROM accounts WHERE static = ? LIMIT 1', [staticId], function (e4, r2) {
                        const newDp = !e4 && r2 && r2[0] ? parsePositiveInt(r2[0].dp) : 0;
                        try {
                            const players = (typeof mp !== 'undefined' && mp && mp.players) || (global.mp && global.mp.players);
                            if (players && typeof players.forEach === 'function') {
                                players.forEach(function (p) {
                                    if (!players.exists || !players.exists(p) || p.static != staticId) return;
                                    p.dp = newDp;
                                    try {
                                        p.call(
                                            'updatedp',
                                            [
                                                typeof global.formatnum1 === 'function'
                                                    ? global.formatnum1(newDp)
                                                    : newDp
                                            ]
                                        );
                                    } catch (_e) {}
                                });
                            }
                        } catch (_e) {}
                        finish(newDp);
                    });
                }
            );
        }
    );
};

module.exports = {};
