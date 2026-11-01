'use strict';

/** Награда активатору (все промокоды из promocodes одинаковые). */
const PROMO_ACTIVATOR_MONEY = 100000;
const PROMO_ACTIVATOR_DP = 100;
/** Награда владельцу за каждую активацию его промокода. */
const PROMO_OWNER_MONEY = 50000;
const PROMO_OWNER_DP = 100;
const PROMO_CODE_RE = /^[a-z0-9]{3,15}$/;

function normalizePromoCode(raw) {
    return String(raw || '').trim().toLowerCase();
}

function isValidPromoCode(code) {
    return PROMO_CODE_RE.test(code);
}

function ensurePromoActivationLogTable() {
    if (!global.DB) {
        setTimeout(ensurePromoActivationLogTable, 1500);
        return;
    }
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS promocode_activation_log (
            id INT NOT NULL AUTO_INCREMENT,
            code VARCHAR(32) NOT NULL,
            owner_static INT NOT NULL,
            actor_static INT NOT NULL,
            actor_login VARCHAR(32) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_pal_owner_time (owner_static, created_at),
            KEY idx_pal_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        [],
        (err) => {
            if (err) console.log('[promocodes] activation_log CREATE:', err.message || err);
        }
    );
}

function logPromoActivation(promoCode, ownerStatic, player) {
    if (!global.DB) return;
    global.DB.query(
        `INSERT INTO promocode_activation_log (code, owner_static, actor_static, actor_login)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE code = VALUES(code), owner_static = VALUES(owner_static), created_at = NOW()`,
        [promoCode, ownerStatic, player.static, player.login],
        (err) => {
            if (err) console.log('[promocodes] log activation:', err.message || err);
        }
    );
}

function ensurePromocodesTable(done) {
    if (!global.DB) {
        setTimeout(() => ensurePromocodesTable(done), 1500);
        return;
    }
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS promocodes (
            id INT NOT NULL AUTO_INCREMENT,
            code VARCHAR(32) NOT NULL,
            owner_static INT NOT NULL,
            activations INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_promocode (code),
            KEY idx_owner (owner_static)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        [],
        (err) => {
            if (err) console.log('[promocodes] CREATE TABLE:', err.message || err);
            if (typeof done === 'function') done(err);
        }
    );
}

function ensureArmorCasesColumn() {
    if (!global.DB) {
        setTimeout(ensureArmorCasesColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN armor_cases INT NOT NULL DEFAULT 0',
        [],
        (err) => {
            if (!err) {
                console.log('[promocodes] колонка accounts.armor_cases создана.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[promocodes] armor_cases ALTER:', err.message || err);
        }
    );
}

function giveFreeSilverCases(player, count) {
    const add = parseInt(count, 10) || 0;
    if (!add || !mp.players.exists(player)) return;
    const newcase = parseInt(player.case, 10) + add;
    player.case = newcase;
    global.DB.query('UPDATE accounts SET cases = ? WHERE static = ?', [newcase, player.static], () => {});
    player.call('updatefreecase1', [typeof global.formatnum1 === 'function' ? global.formatnum1(newcase) : String(newcase)]);
}

function giveFreeArmorCases(player, count) {
    const add = parseInt(count, 10) || 0;
    if (!add || !mp.players.exists(player) || !player.static) return;
    const newCount = (parseInt(player.armorCase, 10) || 0) + add;
    player.armorCase = newCount;
    global.DB.query('UPDATE accounts SET armor_cases = ? WHERE static = ?', [newCount, player.static], () => {});
    try {
        player.call('updatefreearmorcase1', [typeof global.formatnum1 === 'function' ? global.formatnum1(newCount) : String(newCount)]);
    } catch (_e) {}
}

global.giveFreeArmorCases = giveFreeArmorCases;

function givePromoActivatorRewards(player, promoCode) {
    global.givemoney(player, PROMO_ACTIVATOR_MONEY);
    global.givedp(player, PROMO_ACTIVATOR_DP);

    const moneyFmt = typeof global.formatnum1 === 'function'
        ? global.formatnum1(PROMO_ACTIVATOR_MONEY)
        : String(PROMO_ACTIVATOR_MONEY);
    isNotify(
        player,
        3,
        'top-mid',
        `Промокод «${promoCode}»: +${moneyFmt} $, +${PROMO_ACTIVATOR_DP} DP.`,
        5000
    );
    player.call('sound:client', [3]);
}

function giveDpToStatic(staticId, amount) {
    const sid = parseInt(staticId, 10);
    if (!sid || !amount) return;
    if (typeof global.economyAddDp === 'function') {
        global.economyAddDp(sid, amount);
        return;
    }
    global.DB.query(
        'UPDATE accounts SET dp = GREATEST(0, CAST(dp AS SIGNED) + ?) WHERE static = ?',
        [parseInt(amount, 10) || 0, sid],
        () => {
            global.DB.query('SELECT dp FROM accounts WHERE static = ? LIMIT 1', [sid], (err, rows) => {
                if (err || !rows.length) return;
                const newDp = parseInt(rows[0].dp, 10);
                mp.players.forEach((p) => {
                    if (!mp.players.exists(p) || p.static != sid) return;
                    p.dp = newDp;
                    p.call('updatedp', [typeof global.formatnum1 === 'function' ? global.formatnum1(newDp) : newDp]);
                });
            });
        }
    );
}

function giveMoneyToStatic(staticId, amount) {
    const sid = parseInt(staticId, 10);
    if (!sid || !amount) return;
    if (typeof global.economyAddMoney === 'function') {
        global.economyAddMoney(sid, amount);
        return;
    }
    global.DB.query(
        'UPDATE accounts SET money = GREATEST(0, CAST(money AS SIGNED) + ?) WHERE static = ?',
        [parseInt(amount, 10) || 0, sid],
        () => {
            global.DB.query('SELECT money FROM accounts WHERE static = ? LIMIT 1', [sid], (err, rows) => {
                if (err || !rows.length) return;
                const newMoney = parseInt(rows[0].money, 10);
                mp.players.forEach((p) => {
                    if (!mp.players.exists(p) || p.static != sid) return;
                    p.money = newMoney;
                    p.call('updateMoney', [typeof global.formatnum1 === 'function' ? global.formatnum1(newMoney) : newMoney]);
                });
            });
        }
    );
}

function finalizePromoActivation(player, promoCode, ownerStatic, fromTable) {
    // Атомарно: только один параллельный activate проходит
    global.DB.query(
        'UPDATE accounts SET referred = ? WHERE static = ? AND (referred IS NULL OR referred = \'\')',
        [promoCode, player.static],
        (err, result) => {
            if (err) return console.log('[promocodes] referred:', err.message || err);
            if (!result || result.affectedRows < 1) {
                return isNotify(player, 2, 'top-mid', 'Вы уже активировали промокод.', 2000);
            }

            logPromoActivation(promoCode, ownerStatic, player);

            if (fromTable) {
                global.DB.query(
                    'UPDATE promocodes SET activations = activations + 1 WHERE LOWER(code) = ?',
                    [promoCode],
                    () => {}
                );
            }

            const ownerMoneyFmt = typeof global.formatnum1 === 'function'
                ? global.formatnum1(PROMO_OWNER_MONEY)
                : String(PROMO_OWNER_MONEY);

            global.sendDiscordLog(
                `Активация Промокода!\n\nИгрок - ${player.login} [#${player.static}]\nПромокод - ${promoCode}\nВладелец static - ${ownerStatic}\nВладельцу +${PROMO_OWNER_DP} DP, +${ownerMoneyFmt} $`,
                '1350054215829164032'
            );

            giveDpToStatic(ownerStatic, PROMO_OWNER_DP);
            giveMoneyToStatic(ownerStatic, PROMO_OWNER_MONEY);
            mp.players.forEach((ownerPlayer) => {
                if (!mp.players.exists(ownerPlayer) || ownerPlayer.static != ownerStatic) return;
                isNotify(
                    ownerPlayer,
                    3,
                    'bottom-mid',
                    `Промокод «${promoCode}»: +${PROMO_OWNER_DP} DP, +${ownerMoneyFmt} $.`,
                    5000
                );
            });
            givePromoActivatorRewards(player, promoCode);
        }
    );
}

function lookupPromocodeOwner(promoCode, cb) {
    global.DB.query(
        `SELECT p.owner_static, a.login AS owner_login
         FROM promocodes p
         LEFT JOIN accounts a ON a.static = p.owner_static
         WHERE LOWER(p.code) = ?
         LIMIT 1`,
        [promoCode],
        (err, rows) => {
            if (err) return cb(err);
            if (rows.length) {
                return cb(null, {
                    ownerStatic: rows[0].owner_static,
                    ownerLogin: rows[0].owner_login,
                    fromTable: true
                });
            }
            global.DB.query(
                'SELECT static AS owner_static, login AS owner_login FROM accounts WHERE LOWER(promo) = ? LIMIT 1',
                [promoCode],
                (err2, legacy) => {
                    if (err2) return cb(err2);
                    if (!legacy.length) return cb(null, null);
                    cb(null, {
                        ownerStatic: legacy[0].owner_static,
                        ownerLogin: legacy[0].owner_login,
                        fromTable: false
                    });
                }
            );
        }
    );
}

/** Активация промокода (таблица promocodes + legacy accounts.promo). */
global.activateStandardPromocode = function (player, promoCodeRaw) {
    if (!mp.players.exists(player)) return;

    const promoCode = normalizePromoCode(promoCodeRaw);
    if (!isValidPromoCode(promoCode)) {
        return isNotify(player, 2, 'top-mid', 'Некорректный промокод.', 2000);
    }

    if (!global.economyTryLock(player, 'promoActivate', 5000)) {
        return isNotify(player, 2, 'top-mid', 'Подождите…', 1500);
    }

    global.DB.query('SELECT referred FROM accounts WHERE static = ? LIMIT 1', [player.static], (err, referredResults) => {
        if (err) {
            global.economyUnlock(player, 'promoActivate');
            return console.log('[promocodes] referred check:', err.message || err);
        }
        if (!referredResults.length) {
            global.economyUnlock(player, 'promoActivate');
            return;
        }

        if (referredResults[0].referred) {
            global.economyUnlock(player, 'promoActivate');
            return isNotify(player, 2, 'top-mid', 'Вы уже активировали промокод.', 2000);
        }

        lookupPromocodeOwner(promoCode, (lookupErr, info) => {
            if (lookupErr) {
                global.economyUnlock(player, 'promoActivate');
                return console.log('[promocodes] lookup:', lookupErr.message || lookupErr);
            }
            if (!info) {
                global.economyUnlock(player, 'promoActivate');
                return isNotify(player, 2, 'top-mid', 'Промокод не найден.', 2000);
            }
            if (parseInt(info.ownerStatic, 10) === parseInt(player.static, 10)) {
                global.economyUnlock(player, 'promoActivate');
                return isNotify(player, 2, 'top-mid', 'Вы не можете использовать свой собственный промокод.', 2000);
            }
            finalizePromoActivation(player, promoCode, info.ownerStatic, info.fromTable);
            global.economyUnlock(player, 'promoActivate');
        });
    });
};

mp.events.addCommand('newpromo', (player, _, ownerStaticRaw, promoNameRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if ((parseInt(player.adminlvl, 10) || 0) < 6) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно прав.', 3000);
        }

        const ownerStatic = parseInt(ownerStaticRaw, 10);
        const promoCode = normalizePromoCode(promoNameRaw);

        if (!ownerStatic || !promoNameRaw) {
            return player.outputChatBox('!{red}/newpromo [static владельца] [название промокода]');
        }
        if (!isValidPromoCode(promoCode)) {
            return player.outputChatBox('!{red}Промокод: 3–15 символов, латиница и цифры.');
        }

        global.DB.query('SELECT login FROM accounts WHERE static = ? LIMIT 1', [ownerStatic], (err, accRows) => {
            if (err) return console.log('[newpromo]', err.message || err);
            if (!accRows.length) {
                return player.outputChatBox('!{red}Игрок с таким static не найден.');
            }
            const ownerLogin = accRows[0].login;

            global.DB.query(
                'SELECT id FROM promocodes WHERE LOWER(code) = ? LIMIT 1',
                [promoCode],
                (err2, exists) => {
                    if (err2) return console.log('[newpromo]', err2.message || err2);
                    if (exists.length) {
                        return player.outputChatBox(`!{red}Промокод «${promoCode}» уже существует.`);
                    }

                    global.DB.query(
                        'SELECT static FROM accounts WHERE LOWER(promo) = ? LIMIT 1',
                        [promoCode],
                        (err3, legacy) => {
                            if (err3) return console.log('[newpromo]', err3.message || err3);
                            if (legacy.length) {
                                return player.outputChatBox(`!{red}Промокод «${promoCode}» уже занят (legacy).`);
                            }

                            global.DB.query(
                                'INSERT INTO promocodes (code, owner_static) VALUES (?, ?)',
                                [promoCode, ownerStatic],
                                (err4) => {
                                    if (err4) {
                                        console.log('[newpromo] INSERT:', err4.message || err4);
                                        return player.outputChatBox('!{red}Ошибка создания промокода (см. консоль).');
                                    }

                                    global.sendDiscordLog(
                                        `Создание промокода!\n\nАдмин - ${player.login} [#${player.static}]\nВладелец - ${ownerLogin} [#${ownerStatic}]\nПромокод - ${promoCode}`,
                                        '1266445805355532368'
                                    );
                                    player.outputChatBox(
                                        `!{green}Промокод «${promoCode}» создан для ${ownerLogin} [#${ownerStatic}].`
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    } catch (e) {
        console.log('[newpromo]', e.message || e);
    }
});

mp.events.addCommand('delpromo', (player, _, promoNameRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if ((parseInt(player.adminlvl, 10) || 0) < 7) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно прав.', 3000);
        }

        const promoCode = normalizePromoCode(promoNameRaw);

        if (!promoNameRaw) {
            return player.outputChatBox('!{red}/delpromo [название промокода]');
        }

        global.DB.query(
            `SELECT p.code, p.owner_static, p.activations, a.login AS owner_login
             FROM promocodes p
             LEFT JOIN accounts a ON a.static = p.owner_static
             WHERE LOWER(p.code) = ?
             LIMIT 1`,
            [promoCode],
            (err, rows) => {
                if (err) return console.log('[delpromo]', err.message || err);
                if (!rows.length) {
                    return player.outputChatBox(`!{red}Промокод «${promoCode}» не найден.`);
                }

                const row = rows[0];

                global.DB.query(
                    'DELETE FROM promocodes WHERE LOWER(code) = ? LIMIT 1',
                    [promoCode],
                    (err2) => {
                        if (err2) {
                            console.log('[delpromo] DELETE:', err2.message || err2);
                            return player.outputChatBox('!{red}Ошибка удаления промокода (см. консоль).');
                        }

                        global.sendDiscordLog(
                            `Удаление промокода!\n\nАдмин - ${player.login} [#${player.static}]\nБыл владелец - ${row.owner_login || '?'} [#${row.owner_static}]\nПромокод - ${row.code}\nАктиваций было - ${row.activations}`,
                            '1266445805355532368'
                        );
                        player.outputChatBox(
                            `!{green}Промокод «${row.code}» удалён (активаций было: ${row.activations}).`
                        );
                    }
                );
            }
        );
    } catch (e) {
        console.log('[delpromo]', e.message || e);
    }
});

ensurePromocodesTable();
ensurePromoActivationLogTable();
ensureArmorCasesColumn();
