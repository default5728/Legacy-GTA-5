/**
 * NPC у склада бронежилетов FIB (только fraction 6).
 * Позиция рядом с интерьером штаба FIB.
 */

const FIB_ARMOR_NPC_POS = new mp.Vector3(457.2924499511719, -988.6533203125, 30.689603805541992);
const FIB_ARMOR_NPC_HEADING = 153.95875549316406;
const FIB_ARMOR_PED_MODEL = mp.joaat('mp_s_m_armoured_01');

const FIB_V4_VARIANT_INDEX = 3;
const FIB_V4_PRICE_DP = 500;

const FIB_ARMOR_VARIANTS = [
    { d: 65, t: 0, label: 'Бронежилет FIB · вариант 1' },
    { d: 67, t: 0, label: 'Бронежилет FIB · вариант 2' },
    { d: 68, t: 0, label: 'Бронежилет FIB · вариант 3' },
    { d: 69, t: 0, label: 'Бронежилет FIB · вариант 4', priceDp: FIB_V4_PRICE_DP }
];

/** Старые drawable FIB-жилетов → новые (миграция clothes.armor). */
const FIB_ARMOR_LEGACY_DRAWABLE_MAP = { 62: 69, 68: 65, 70: 67, 71: 68, 72: 69 };

function migrateFibArmorDrawable(d) {
    const dd = Number(d);
    if (FIB_ARMOR_LEGACY_DRAWABLE_MAP[dd] != null) return FIB_ARMOR_LEGACY_DRAWABLE_MAP[dd];
    return dd;
}

global.migrateFibArmorPair = function (d, t) {
    const tt = Number.isFinite(Number(t)) ? Number(t) : 0;
    return { d: migrateFibArmorDrawable(d), t: tt };
};

function parseFibArmorVariantIndex(variantRaw) {
    if (variantRaw == null) return NaN;
    if (Array.isArray(variantRaw)) return parseInt(String(variantRaw[0]), 10);
    return parseInt(String(variantRaw), 10);
}

function hasFibArmorV4Unlocked(player) {
    if (!player || !mp.players.exists(player)) return false;
    const x = player.fib_armor_v4;
    if (x === true) return true;
    if (x === false || x == null) return false;
    const n = Number(x);
    return n === 1;
}

global.hasFibArmorV4Unlocked = function (player) {
    return hasFibArmorV4Unlocked(player);
};

function isBadFieldMysqlError(err) {
    if (!err) return false;
    if (err.code === 'ER_BAD_FIELD_ERROR') return true;
    if (err.errno === 1054) return true;
    const msg = String(err.message || '');
    return msg.includes('Unknown column') && msg.includes('fib_armor_v4');
}

function fibArmorApplyVariant(player, staticId, fr, v, opts) {
    const skipSaveNotify = opts && opts.skipSaveNotify === true;
    if (v.d === 69 && v.t === 0 && !hasFibArmorV4Unlocked(player)) {
        if (typeof global.isNotify === 'function') {
            global.isNotify(
                player,
                2,
                'top-mid',
                `Сначала купите «${v.label}» за ${FIB_V4_PRICE_DP} DP.`,
                4000
            );
        }
        return;
    }
    const val = `${v.d}:${v.t}`;
    if (!player._clothesRowCache) player._clothesRowCache = {};
    player._clothesRowCache.armor = val;
    player._cosmeticArmorPersist = val;

    if (typeof global.updateOrInsertClothes === 'function') {
        global.updateOrInsertClothes(staticId, fr, 'armor', val, () => {});
    }

    if (player.getVariable('armor') === true && typeof global.applyGameplayArmorVestVisual === 'function') {
        global.applyGameplayArmorVestVisual(player);
    } else {
        player.setClothes(9, 0, 0, 0);
    }

    if (!skipSaveNotify && typeof global.isNotify === 'function') {
        global.isNotify(player, 3, 'top-mid', 'Вариант сохранён.', 3200);
    }
}

/** Сверка с БД: иначе в памяти мог остаться ложный «куплено». */
function syncFibArmorV4UnlockFromDb(player, staticId, fr, onDone) {
    if (!global.DB || typeof global.DB.query !== 'function' || staticId == null) {
        if (onDone) onDone();
        return;
    }
    let pending = 2;
    let accRead = false;
    let cloRead = false;
    let accOn = false;
    let cloOn = false;
    const finish = () => {
        pending--;
        if (pending > 0) return;
        if (accRead || cloRead) {
            player.fib_armor_v4 = accOn || cloOn;
        }
        if (onDone) onDone();
    };
    global.DB.query('SELECT fib_armor_v4 FROM accounts WHERE static = ? LIMIT 1', [staticId], (err, rows) => {
        if (!err && rows && rows[0] && Object.prototype.hasOwnProperty.call(rows[0], 'fib_armor_v4')) {
            accRead = true;
            accOn = Number(rows[0].fib_armor_v4) === 1;
        }
        finish();
    });
    const clothesFr =
        typeof global.getClothesFractionForPlayer === 'function'
            ? global.getClothesFractionForPlayer(player)
            : 0;
    global.DB.query(
        'SELECT fib_armor_v4 FROM clothes WHERE static = ? AND fraction = ? LIMIT 1',
        [staticId, clothesFr],
        (err, rows) => {
            if (!err && rows && rows[0] && Object.prototype.hasOwnProperty.call(rows[0], 'fib_armor_v4')) {
                cloRead = true;
                cloOn = Number(rows[0].fib_armor_v4) === 1;
            }
            finish();
        }
    );
}

function persistFibV4UnlockClothesFallback(player, staticId, fr, onOk) {
    if (typeof global.updateOrInsertClothes !== 'function') {
        if (onOk) onOk(new Error('no updateOrInsertClothes'));
        return;
    }
    global.updateOrInsertClothes(staticId, fr, 'fib_armor_v4', 1, (err) => {
        if (onOk) onOk(err || null);
    });
}

try {
    global.creatorPedsNew(FIB_ARMOR_PED_MODEL, FIB_ARMOR_NPC_POS, {
        dynamic: true,
        invincible: true,
        frozen: true,
        heading: FIB_ARMOR_NPC_HEADING
    });
} catch (_e) {}

try {
    global.creatorLabelsNew('Бронежилет FIB (E)', new mp.Vector3(FIB_ARMOR_NPC_POS.x, FIB_ARMOR_NPC_POS.y, FIB_ARMOR_NPC_POS.z + 1.05), {
        font: 4,
        color: [232, 232, 232, 255],
        drawDistance: 12,
        scale: [1.2, 1.2],
        outline: true,
        outlineColor: [0, 0, 0, 255]
    });
} catch (_e2) {}

try {
    global.creatorMarkersNew(1, new mp.Vector3(FIB_ARMOR_NPC_POS.x, FIB_ARMOR_NPC_POS.y, FIB_ARMOR_NPC_POS.z - 1.1), 1, {
        color: [220, 38, 38, 90],
        visible: true,
        dimension: 0
    });
} catch (_e3) {}

const fibArmorColshape = global.creatorShapeSphere(FIB_ARMOR_NPC_POS.x, FIB_ARMOR_NPC_POS.y, FIB_ARMOR_NPC_POS.z, 2.0);

function playerNearFibArmorNpc(player) {
    try {
        if (!player || !mp.players.exists(player) || player.dimension !== 0) return false;
        const p = player.position;
        const dx = p.x - FIB_ARMOR_NPC_POS.x;
        const dy = p.y - FIB_ARMOR_NPC_POS.y;
        const dz = Math.abs((p.z || 0) - FIB_ARMOR_NPC_POS.z);
        if (dz > 4.0) return false;
        return Math.sqrt((dx * dx) + (dy * dy)) <= 4.5;
    } catch (_e) {
        return false;
    }
}

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === fibArmorColshape) {
            player.call('fibArmorNpc:near', [true]);
            const sid = player.static;
            const frPl = String(player.getVariable('fraction') || '6');
            syncFibArmorV4UnlockFromDb(player, sid, frPl, () => {
                if (!mp.players.exists(player)) return;
                try {
                    player.call('fibArmor:v4Unlocked', [hasFibArmorV4Unlocked(player)]);
                } catch (_c) {}
            });
        }
    } catch (_e) {}
});

mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (!mp.players.exists(player)) return;
        if (shape === fibArmorColshape) player.call('fibArmorNpc:near', [false]);
    } catch (_e) {}
});

function finalizeFibV4Purchase(player, staticId, fr, v, newdp) {
    player.dp = newdp;
    player.fib_armor_v4 = true;
    if (!player._clothesRowCache) player._clothesRowCache = {};
    player._clothesRowCache.fib_armor_v4 = 1;
    try {
        player.call('fibArmor:v4Unlocked', [true]);
    } catch (_u) {}
    try {
        player.call('updatedp', [global.formatnum1(newdp)]);
    } catch (_c) {}
    if (typeof global.updateOrInsertClothes === 'function') {
        global.updateOrInsertClothes(staticId, fr, 'fib_armor_v4', 1, () => {});
    }
    if (typeof global.isNotify === 'function') {
        const spent =
            v.priceDp != null && typeof global.formatnum1 === 'function'
                ? global.formatnum1(v.priceDp)
                : String(v.priceDp != null ? v.priceDp : 500);
        global.isNotify(
            player,
            3,
            'top-mid',
            `−${spent} DP. Куплен и применён жилет «${v.label}».`,
            4500
        );
    }
    fibArmorApplyVariant(player, staticId, fr, v, { skipSaveNotify: true });
}

mp.events.add('fibArmor:choose:s', (player, variantRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!playerNearFibArmorNpc(player)) {
            try { player.call('fibArmorNpc:near', [false]); } catch (_e) {}
            if (typeof global.isNotify === 'function') global.isNotify(player, 2, 'top-mid', 'Подойдите к NPC бронежилетов.', 3000);
            return;
        }
        const fr = String(player.getVariable('fraction') || '');
        if (fr !== '6') {
            if (typeof global.isNotify === 'function') global.isNotify(player, 2, 'top-mid', 'Только для сотрудников FIB.', 3000);
            return;
        }
        const vi = parseFibArmorVariantIndex(variantRaw);
        if (Number.isNaN(vi) || vi < 0 || vi >= FIB_ARMOR_VARIANTS.length) {
            if (typeof global.isNotify === 'function') {
                global.isNotify(player, 2, 'top-mid', 'Некорректный вариант жилета.', 2500);
            }
            return;
        }
        const v = FIB_ARMOR_VARIANTS[vi];
        const staticId = player.static;
        if (staticId == null) return;

        const runChoice = () => {
            if (!mp.players.exists(player)) return;
            const needsV4Purchase = vi === FIB_V4_VARIANT_INDEX && !hasFibArmorV4Unlocked(player);
            const priceDp = v.priceDp != null ? v.priceDp : FIB_V4_PRICE_DP;
            if (needsV4Purchase) {
            const curDp = parseInt(String(player.dp != null ? player.dp : 0), 10);
            if (!Number.isFinite(curDp) || curDp < priceDp) {
                if (typeof global.isNotify === 'function') {
                    global.isNotify(player, 2, 'top-mid', `Недостаточно DP (нужно ${priceDp}).`, 3500);
                }
                return;
            }
            const newdp = curDp - priceDp;
            if (!global.DB || typeof global.DB.query !== 'function') {
                console.log('[fibArmor:choose:s] global.DB missing');
                return;
            }
            global.DB.query(
                'UPDATE accounts SET dp = ?, fib_armor_v4 = 1 WHERE static = ?',
                [newdp, staticId],
                (err) => {
                    if (!mp.players.exists(player)) return;
                    if (!err) {
                        finalizeFibV4Purchase(player, staticId, fr, v, newdp);
                        return;
                    }
                    if (isBadFieldMysqlError(err)) {
                        global.DB.query(
                            'UPDATE accounts SET dp = ? WHERE static = ?',
                            [newdp, staticId],
                            (err2) => {
                                if (!mp.players.exists(player)) return;
                                if (err2) {
                                    console.log('[fibArmor:choose:s] dp-only', err2);
                                    if (typeof global.isNotify === 'function') {
                                        global.isNotify(player, 2, 'top-mid', 'Ошибка оплаты. Проверьте миграцию БД (fib_armor_v4).', 5000);
                                    }
                                    return;
                                }
                                persistFibV4UnlockClothesFallback(player, staticId, fr, (err3) => {
                                    if (!mp.players.exists(player)) return;
                                    if (err3) {
                                        console.log('[fibArmor:choose:s] clothes unlock', err3);
                                        if (typeof global.isNotify === 'function') {
                                            global.isNotify(
                                                player,
                                                2,
                                                'top-mid',
                                                'Ошибка сохранения покупки. Выполните SQL из packages/server/sql/accounts_fib_armor_v4.sql',
                                                6500
                                            );
                                        }
                                        return;
                                    }
                                    finalizeFibV4Purchase(player, staticId, fr, v, newdp);
                                });
                            }
                        );
                        return;
                    }
                    console.log('[fibArmor:choose:s]', err);
                    if (typeof global.isNotify === 'function') {
                        global.isNotify(player, 2, 'top-mid', 'Ошибка оплаты. Обратитесь к администрации.', 4000);
                    }
                }
            );
            return;
            }

            fibArmorApplyVariant(player, staticId, fr, v);
        };

        if (vi === FIB_V4_VARIANT_INDEX) {
            syncFibArmorV4UnlockFromDb(player, staticId, fr, runChoice);
        } else {
            runChoice();
        }
    } catch (e) {
        console.log('[fibArmor:choose:s]', e);
    }
});
