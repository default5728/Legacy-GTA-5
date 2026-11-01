'use strict';

/**
 * Одноразовое восстановление инвентаря персонажей из accounts,
 * если в characters пусто/меньше предметов (после миграции на multi-char).
 * На Flow инвентарь хранится только в accounts — миграция пропускается.
 */

let _charactersTableChecked = false;
let _charactersTableExists = false;

function flowUsesCharactersTable(cb) {
    const done = typeof cb === 'function' ? cb : () => {};
    if (!global.DB) return done(false);
    if (_charactersTableChecked) return done(_charactersTableExists);

    global.DB.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'characters' LIMIT 1",
        [],
        (err, rows) => {
            _charactersTableChecked = true;
            _charactersTableExists = !err && rows && rows.length > 0;
            if (!_charactersTableExists) {
                console.log('[inventory_recovery] таблица characters отсутствует — используется accounts (Flow)');
            }
            done(_charactersTableExists);
        }
    );
}

function countDbInventoryItems(val) {
    if (val == null || val === '') return 0;
    const s = String(val).trim();
    if (s === '[]' || s === '') return 0;
    try {
        const parsed = JSON.parse(s);
        if (!Array.isArray(parsed)) return 0;
        return parsed.filter((x) => x != null && x !== '' && x !== 0).length;
    } catch (_e) {
        return 0;
    }
}

function isDbFieldEmpty(val) {
    if (val == null || val === '') return true;
    const s = String(val).trim();
    return s === '[]' || s === '{}' || s === '';
}

global.repairCharacterInventoryRowFromAccount = function repairCharacterInventoryRowFromAccount(charId, staticId, cb) {
    const done = typeof cb === 'function' ? cb : () => {};
    if (!global.DB) return done({ ok: false, error: 'no_db' });

    flowUsesCharactersTable((hasCharacters) => {
        if (!hasCharacters) return done({ ok: true, changed: false, skipped: true });

        global.DB.query(
        `SELECT c.id, c.inventory AS c_inv, c.fast AS c_fast, c.bag_contents AS c_bag,
                c.inv_slot_binds AS c_binds, c.donate_bag_state AS c_donate,
                a.inventory AS a_inv, a.fast AS a_fast, a.bag_contents AS a_bag,
                a.inv_slot_binds AS a_binds, a.donate_bag_state AS a_donate
         FROM characters c
         JOIN accounts a ON a.static = c.account_static
         WHERE c.id = ? AND c.account_static = ? LIMIT 1`,
        [charId, staticId],
        (err, rows) => {
            if (err || !rows || !rows.length) return done({ ok: false, error: 'not_found' });
            const r = rows[0];
            const charCount = countDbInventoryItems(r.c_inv);
            const accCount = countDbInventoryItems(r.a_inv);
            if (accCount <= charCount) return done({ ok: true, changed: false, charCount, accCount });

            const fast = countDbInventoryItems(r.c_fast) < countDbInventoryItems(r.a_fast) ? r.a_fast : r.c_fast;
            const bag = isDbFieldEmpty(r.c_bag) && !isDbFieldEmpty(r.a_bag) ? r.a_bag : r.c_bag;
            const binds = isDbFieldEmpty(r.c_binds) && !isDbFieldEmpty(r.a_binds) ? r.a_binds : r.c_binds;
            const donate = isDbFieldEmpty(r.c_donate) && !isDbFieldEmpty(r.a_donate) ? r.a_donate : r.c_donate;

            global.DB.query(
                `UPDATE characters SET inventory = ?, fast = ?, bag_contents = ?, inv_slot_binds = ?, donate_bag_state = ? WHERE id = ?`,
                [r.a_inv, fast, bag, binds, donate, charId],
                (err2) => {
                    if (err2) return done({ ok: false, error: 'db_update' });
                    console.log(
                        '[inventory_recovery] DB repair static=' + staticId +
                        ' char=' + charId + ' ' + charCount + ' -> ' + accCount + ' items'
                    );
                    done({ ok: true, changed: true, charCount, accCount });
                }
            );
        }
        );
    });
};

global.runInventoryRecoveryMigration = function runInventoryRecoveryMigration(cb) {
    const done = typeof cb === 'function' ? cb : () => {};
    if (!global.DB) return done({ ok: false });

    flowUsesCharactersTable((hasCharacters) => {
        if (!hasCharacters) return done({ ok: true, skipped: true });

        global.DB.query(
        `SELECT c.id, c.account_static, c.inventory AS c_inv, a.inventory AS a_inv
         FROM characters c
         INNER JOIN accounts a ON a.static = c.account_static
         WHERE a.inventory IS NOT NULL AND TRIM(a.inventory) NOT IN ('', '[]')`,
        [],
        (err, rows) => {
            if (err) {
                console.log('[inventory_recovery] migration query error', err);
                return done({ ok: false });
            }
            let repaired = 0;
            let checked = 0;
            const list = rows || [];

            const next = (i) => {
                if (i >= list.length) {
                    console.log('[inventory_recovery] migration done checked=' + checked + ' repaired=' + repaired);
                    return done({ ok: true, checked, repaired });
                }
                const row = list[i];
                checked += 1;
                const charCount = countDbInventoryItems(row.c_inv);
                const accCount = countDbInventoryItems(row.a_inv);
                if (accCount <= charCount) return next(i + 1);

                global.repairCharacterInventoryRowFromAccount(row.id, row.account_static, (r) => {
                    if (r && r.changed) repaired += 1;
                    next(i + 1);
                });
            };
            next(0);
        }
        );
    });
};

mp.events.add('packagesLoaded', () => {
    setTimeout(() => {
        if (typeof global.runInventoryRecoveryMigration === 'function') {
            global.runInventoryRecoveryMigration();
        }
    }, 8000);
});

mp.events.addCommand('repairinv', (player, _, staticRaw) => {
    try {
        if (!mp.players.exists(player) || Number(player.adminlvl) < 8) return;
        const staticId = staticRaw != null && String(staticRaw).trim() !== ''
            ? parseInt(staticRaw, 10)
            : player.static;
        if (!Number.isFinite(staticId) || staticId <= 0) {
            return player.outputChatBox('Использование: /repairinv [static]');
        }

        const target = mp.players.toArray().find((p) => p.static === staticId);
        const charId = target && target.characterId > 0
            ? parseInt(target.characterId, 10)
            : null;

        if (charId) {
            global.repairCharacterInventoryRowFromAccount(charId, staticId, (r) => {
                if (r && r.skipped) {
                    return player.outputChatBox('На этом сервере инвентарь хранится в accounts (миграция не нужна).');
                }
                if (!r.ok) return player.outputChatBox('Ошибка восстановления.');
                if (!r.changed) {
                    return player.outputChatBox(`Инвентарь #${staticId} уже актуален (${r.charCount} предм.).`);
                }
                player.outputChatBox(`Восстановлено: ${r.charCount} -> ${r.accCount} предметов в БД.`);
                if (target && mp.players.exists(target)) {
                    global.loadInventory(target);
                    setTimeout(() => {
                        if (mp.players.exists(target) && typeof global.hydratePlayerClothesFromDb === 'function') {
                            global.hydratePlayerClothesFromDb(target);
                        }
                    }, 600);
                }
            });
            return;
        }

        flowUsesCharactersTable((hasCharacters) => {
            if (!hasCharacters) {
                return player.outputChatBox('На этом сервере инвентарь хранится в accounts (миграция не нужна).');
            }

            global.DB.query(
            'SELECT id FROM characters WHERE account_static = ? ORDER BY id ASC LIMIT 1',
            [staticId],
            (err, rows) => {
                if (err || !rows || !rows.length) {
                    return player.outputChatBox('Персонаж не найден в БД.');
                }
                global.repairCharacterInventoryRowFromAccount(rows[0].id, staticId, (r) => {
                    if (!r.ok) return player.outputChatBox('Ошибка восстановления.');
                    player.outputChatBox(
                        r.changed
                            ? `Восстановлено в БД: ${r.charCount} -> ${r.accCount} предметов.`
                            : `Инвентарь уже актуален (${r.charCount} предм.).`
                    );
                });
            }
        );
        });
    } catch (e) {
        console.log('[repairinv]', e);
    }
});
