/** Брелоки Ladydy для сумки LW LDD (drawable 149 → 150…156). */

const SPECTRUM_LDD_BASE = global.SPECTRUM_LDD_BASE_DRAWABLE || 149;
const SPECTRUM_LDD_MAX_CHARMS = global.SPECTRUM_LDD_MAX_CHARMS || 7;
const CHARM_ITEM = 'item_spectrum_charm';

function isSpectrumLddDrawable(d) {
    const n = Number(d);
    return n >= SPECTRUM_LDD_BASE && n <= SPECTRUM_LDD_BASE + SPECTRUM_LDD_MAX_CHARMS;
}

function decodeBagToken(raw) {
    try {
        const s = String(raw || '').split('(')[0].trim();
        if (!s.startsWith('ic1.')) return null;
        if (typeof global.decodeIc1 === 'function') return global.decodeIc1(s);
        return null;
    } catch (_e) {
        return null;
    }
}

function encodeBagToken(pl, suffix) {
    if (typeof global.encodeIc1 !== 'function') return null;
    return global.encodeIc1(pl) + (suffix || '');
}

function lddPreviewImg(tex) {
    if (typeof global.spectrumLddPreviewImg === 'function') return global.spectrumLddPreviewImg(tex);
    const t = Number.isFinite(Number(tex)) ? Number(tex) : 0;
    return `spectrum/p/8/149/${t}.png`;
}

function lddName(charms) {
    if (typeof global.spectrumLddDisplayName === 'function') return global.spectrumLddDisplayName(charms);
    const n = Math.max(0, parseInt(charms, 10) || 0);
    if (n <= 0) return 'Сумка LW LDD без брелков';
    if (n === 1) return 'Сумка LW LDD с 1 брелком';
    return `Сумка LW LDD с ${n} брелками`;
}

function isLddBagPayload(pl) {
    if (!pl || Number(pl.cid) !== 8) return false;
    const nm = String(pl.nm || '');
    if (/LW LDD/i.test(nm)) return true;
    return isSpectrumLddDrawable(pl.d);
}

function patchBagTokenFields(pl, nextD, tex, charms) {
    pl.d = nextD;
    if (Number.isFinite(Number(tex))) pl.t = Number(tex);
    pl.img = lddPreviewImg(pl.t);
    pl.nm = lddName(charms);
    return pl;
}

function patchInventoryBagTokenByInst(player, instId, nextD, tex, charms) {
    if (!player || !Array.isArray(player.inventory)) return false;
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    const bid = Number(instId);
    for (let i = 0; i < player.inventory.length; i++) {
        const cell = player.inventory[i];
        if (!cell) continue;
        const base = String(cell).split('(')[0].trim();
        if (!base.startsWith('ic1.')) continue;
        const pl = decodeBagToken(base);
        if (!pl || Number(pl.bagInst) !== bid) continue;
        patchBagTokenFields(pl, nextD, tex, charms);
        const suffix = String(cell).length > base.length ? String(cell).slice(base.length) : '';
        const next = encodeBagToken(pl, suffix);
        if (next) player.inventory[i] = next;
        return true;
    }
    return false;
}

function patchEquippedLddBag(player, instId, nextD, tex, charms) {
    const canon = player._bagEquipIc1;
    if (typeof canon !== 'string' || !canon.startsWith('ic1.')) return false;
    const base = canon.split('(')[0].trim();
    const pl = decodeBagToken(base);
    if (!pl || Number(pl.bagInst) !== Number(instId)) return false;
    patchBagTokenFields(pl, nextD, tex, charms);
    const suffix = canon.length > base.length ? canon.slice(base.length) : '';
    const next = encodeBagToken(pl, suffix);
    if (!next) return false;
    player._bagEquipIc1 = next;
    if (typeof global.persistClothesBagsEquipIc1 === 'function') global.persistClothesBagsEquipIc1(player);
    return true;
}

function findSpectrumLddBag(player) {
    if (!player) return null;

    // 1) надетая сумка
    if (typeof player._bagEquipIc1 === 'string' && player._bagEquipIc1.startsWith('ic1.')) {
        const pl = decodeBagToken(player._bagEquipIc1);
        if (pl && isLddBagPayload(pl)) {
            const inst = pl.bagInst != null ? Number(pl.bagInst) : NaN;
            if (Number.isFinite(inst) && inst > 0) {
                return { equipped: true, payload: pl, instId: inst, token: player._bagEquipIc1 };
            }
        }
    }

    // 2) сумка в сетке инвентаря
    if (!Array.isArray(player.inventory)) return null;
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    for (let i = 0; i < player.inventory.length; i++) {
        const cell = player.inventory[i];
        if (!cell) continue;
        const pl = decodeBagToken(cell);
        if (!pl || !isLddBagPayload(pl)) continue;
        const inst = pl.bagInst != null ? Number(pl.bagInst) : NaN;
        if (!Number.isFinite(inst) || inst <= 0) continue;
        return { equipped: false, slot: i, token: String(cell), payload: pl, instId: inst };
    }
    return null;
}

global.useSpectrumCharmOnBag = function (player) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
    if (player._spectrumCharmUsePending === true) {
        isNotify(player, 2, 'top-mid', 'Подождите, брелок устанавливается.', 2500);
        return false;
    }
    const hit = findSpectrumLddBag(player);
    if (!hit) {
        isNotify(player, 2, 'top-mid', 'Нужна сумка LW LDD (в инвентаре или на персонаже).', 4000);
        return false;
    }
    player._spectrumCharmUsePending = true;
    const unlock = () => {
        try {
            player._spectrumCharmUsePending = false;
        } catch (_e) {}
    };
    const refundCharm = () => {
        if (!mp.players.exists(player)) return false;
        if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
            return global.mergeConsumableQtyIntoGrid(player, CHARM_ITEM, 1);
        }
        return !!(global.tryPushInventoryItem && global.tryPushInventoryItem(player, CHARM_ITEM));
    };
    global.DB.query(
        'SELECT charms, drawable, texture FROM donate_bag_instances WHERE id = ? AND account_static = ? LIMIT 1',
        [hit.instId, player.static],
        (err, rows) => {
            try {
                if (!mp.players.exists(player)) {
                    unlock();
                    return;
                }
                if (err || !rows || !rows.length) {
                    unlock();
                    return isNotify(player, 2, 'top-mid', 'Сумка не найдена.', 3500);
                }
                const cur = Math.max(0, parseInt(rows[0].charms, 10) || 0);
                if (cur >= SPECTRUM_LDD_MAX_CHARMS) {
                    unlock();
                    return isNotify(player, 2, 'top-mid', 'На сумке уже максимум брелков.', 3500);
                }
                if (!global.consumeOneConsumableForPlayer(player, CHARM_ITEM)) {
                    unlock();
                    return isNotify(player, 2, 'top-mid', 'Брелок не найден.', 3000);
                }
                const nextCharms = cur + 1;
                const nextD = SPECTRUM_LDD_BASE + nextCharms;
                const tex = Number(rows[0].texture) || 0;
                global.DB.query(
                    'UPDATE donate_bag_instances SET charms = ?, drawable = ?, item_name = ?, item_img = ? WHERE id = ? AND account_static = ?',
                    [nextCharms, nextD, lddName(nextCharms), lddPreviewImg(tex), hit.instId, player.static],
                    (upErr, result) => {
                        if (!mp.players.exists(player)) {
                            unlock();
                            return;
                        }
                        if (upErr || !result || result.affectedRows !== 1) {
                            refundCharm();
                            global.saveInventory(player);
                            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                            unlock();
                            return isNotify(player, 2, 'top-mid', 'Ошибка сохранения брелка.', 3500);
                        }
                        patchInventoryBagTokenByInst(player, hit.instId, nextD, tex, nextCharms);
                        patchEquippedLddBag(player, hit.instId, nextD, tex, nextCharms);
                        try {
                            const c5 = player.getClothes(5);
                            if (c5 && isSpectrumLddDrawable(c5.drawable)) {
                                player.setClothes(5, nextD, tex, 0);
                                const staticId = player.static;
                                const fraction = player.getVariable('fraction');
                                global.updateOrInsertClothes(staticId, fraction, 'bags', `${nextD}:${tex}`, () => {});
                                if (typeof global.patchPlayerClothesRowCache === 'function') {
                                    global.patchPlayerClothesRowCache(player, 'bags', `${nextD}:${tex}`);
                                }
                            }
                        } catch (_ePed) {}
                        global.saveInventory(player);
                        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                        unlock();
                        isNotify(
                            player,
                            1,
                            'top-mid',
                            `Брелок установлен (${nextCharms}/${SPECTRUM_LDD_MAX_CHARMS}).`,
                            4000
                        );
                    }
                );
            } catch (e) {
                unlock();
                console.log('[useSpectrumCharmOnBag]', e);
            }
        }
    );
    return true;
};

global.isSpectrumLddDrawable = isSpectrumLddDrawable;
