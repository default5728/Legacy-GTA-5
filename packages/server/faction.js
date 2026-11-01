require('./inventory_equipment.js');

const MP_M_FREEMODE_HASH = mp.joaat('mp_m_freemode_01');
const MP_F_FREEMODE_HASH = mp.joaat('mp_f_freemode_01');

global.isFreemodePedHash = function isFreemodePedHash(h) {
    if (h == null || !Number.isFinite(Number(h))) return false;
    const u = Number(h) >>> 0;
    return u === (MP_M_FREEMODE_HASH >>> 0) || u === (MP_F_FREEMODE_HASH >>> 0);
}

function parseTattooListFromDbRow(raw) {
    if (!raw) return [];
    try {
        const tattoos = JSON.parse(raw);
        return global.normalizeTattooList(tattoos);
    } catch (_e) {
        return [];
    }
}

function splitTattooKey(tattoo) {
    const s = String(tattoo || '').trim();
    const i = s.indexOf(':');
    if (i <= 0 || i >= s.length - 1) return null;
    return { collection: s.slice(0, i), overlay: s.slice(i + 1) };
}

global.normalizeTattooList = function normalizeTattooList(raw) {
    if (!raw) return [];
    const src = Array.isArray(raw) ? raw : [];
    const out = [];
    const seen = new Set();
    src.forEach((item) => {
        const parts = splitTattooKey(item);
        if (!parts) return;
        const key = `${parts.collection}:${parts.overlay}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(key);
    });
    return out;
};

global.makeTattooKey = function makeTattooKey(collection, overlay) {
    const col = String(collection || '').trim();
    const ov = String(overlay || '').trim();
    if (!col || !ov) return null;
    return `${col}:${ov}`;
};

/** Синхронно: сохранённые тату + опциональное превью (без async setTatto). */
global.applyTattoosList = function (player, tattoos, previewCollection, previewOverlay) {
    try {
        if (!mp.players.exists(player)) return;
        player.clearDecorations();
        const list = global.normalizeTattooList(tattoos);
        list.forEach((tattoo) => {
            const parts = splitTattooKey(tattoo);
            if (!parts) return;
            player.setDecoration(mp.joaat(parts.collection), mp.joaat(parts.overlay));
        });
        if (previewCollection && previewOverlay) {
            player.setDecoration(mp.joaat(String(previewCollection)), mp.joaat(String(previewOverlay)));
        }
    } catch (e) {
        console.log('[applyTattoosList]', e);
    }
};

global.setTatto = function(player) {
    try {
        if (!mp.players.exists(player) || player.static == null) return;
        global.DB.query('SELECT tatto FROM accounts WHERE static = ?', [player.static], (err, results) => {
            if (err) {
                console.log(err);
                return;
            }
            if (!mp.players.exists(player)) return;
            const tattoos = results.length > 0 ? parseTattooListFromDbRow(results[0].tatto) : [];
            player._tattooPreview = null;
            player._tattooListCache = tattoos;
            if (typeof global.applyTattoosList === 'function') {
                global.applyTattoosList(player, tattoos);
            }
        });
    } catch (error) {
        console.log(error);
    }
}

/** Снимок педа для строки clothes (fraction). */
function collectPedClothesSnapshot(player) {
    try {
        if (!mp.players.exists(player)) return null;
        const p1 = player.getProp(1);
        const p2 = player.getProp(2);
        const p6 = player.getProp(6);
        const p7 = player.getProp(7);
        const c1 = player.getClothes(1);
        const c2 = player.getClothes(2);
        const c3 = player.getClothes(3);
        const c4 = player.getClothes(4);
        const c5 = player.getClothes(5);
        const c6 = player.getClothes(6);
        const c7 = player.getClothes(7);
        const c8 = player.getClothes(8);
        const c10 = player.getClothes(10);
        const c11 = player.getClothes(11);
        const c9 = player.getClothes(9);
        const slotStr = (c) => (c && c.drawable !== undefined ? `${c.drawable}:${c.texture}` : null);
        const headwear =
            typeof global.getPersistHeadwearColumnValue === 'function'
                ? global.getPersistHeadwearColumnValue(player)
                : (() => {
                      const p0 = player.getProp(0);
                      return p0 &&
                          typeof global.isFreemodeHeadwearSlotConsideredEmpty === 'function' &&
                          !global.isFreemodeHeadwearSlotConsideredEmpty(player, p0.drawable, p0.texture)
                          ? `${p0.drawable}:${Number.isFinite(Number(p0.texture)) ? p0.texture : 0}`
                          : null;
                  })();
        const ped = player;
        const visEmpty = (key) =>
            typeof global.isPedAccessorySlotVisuallyEmpty === 'function' &&
            global.isPedAccessorySlotVisuallyEmpty(ped, key);
        const glasses =
            p1 && !visEmpty('glasses') ? `${p1.drawable}:${Number.isFinite(Number(p1.texture)) ? p1.texture : 0}` : null;
        const ears =
            p2 && !visEmpty('ears')
                ? `${p2.drawable}:${Number.isFinite(Number(p2.texture)) ? p2.texture : 0}`
                : null;
        const watch_prop =
            p6 && !visEmpty('watch')
                ? `${p6.drawable}:${Number.isFinite(Number(p6.texture)) ? p6.texture : 0}`
                : null;
        const bracelet_prop =
            p7 && !visEmpty('bracelet')
                ? `${p7.drawable}:${Number.isFinite(Number(p7.texture)) ? p7.texture : 0}`
                : null;
        const masks = c1 && Number(c1.drawable) !== 0 ? slotStr(c1) : null;
        const hair = c2 && c2.drawable !== undefined ? slotStr(c2) : null;
        const top = c11 && c11.drawable !== undefined ? slotStr(c11) : null;
        const tors = c3 && c3.drawable !== undefined ? slotStr(c3) : null;
        const undershirt = c8 && c8.drawable !== undefined ? slotStr(c8) : null;
        const decals = c10 && Number(c10.drawable) !== 0 ? slotStr(c10) : null;
        const bottom = c4 && c4.drawable !== undefined ? slotStr(c4) : null;
        const shoes = c6 && c6.drawable !== undefined ? slotStr(c6) : null;
        const bags = c5 && Number(c5.drawable) !== 0 ? slotStr(c5) : null;
        const bags_equip_ic1 =
            bags && player._bagEquipIc1 && typeof player._bagEquipIc1 === 'string' ? player._bagEquipIc1 : null;
        const accessories = c7 && Number(c7.drawable) !== 0 ? slotStr(c7) : null;
        const gloves =
            player._donateGlovesItemId != null && player._donateGlovesTex != null
                ? `${player._donateGlovesItemId}:${player._donateGlovesTex}`
                : null;
        const armor = snapshotArmorForClothesColumn(player, c9);
        return {
            hair,
            headwear,
            glasses,
            masks,
            accessories,
            top,
            bottom,
            shoes,
            tors,
            bags,
            bags_equip_ic1,
            undershirt,
            decals,
            ears,
            watch_prop,
            bracelet_prop,
            gloves,
            armor
        };
    } catch (_e) {
        return null;
    }
}

function normalizeCosmeticArmorPersist(raw) {
    if (raw == null || String(raw).trim() === '') return null;
    const s = String(raw).trim();
    if (s === '0:0') return null;
    return s;
}

/** В БД/снимке не держим платный 69:0 без unlock (кэш после assign мог остаться со старым значением). */
function sanitizeFibArmorSnapshotValue(player, raw) {
    if (raw == null || String(raw).trim() === '') return raw;
    if (String(player.getVariable('fraction') || '') !== '6') return raw;
    let s = String(raw).trim();
    const p = s.split(':');
    let ad = Number(p[0]);
    const at = Number.isFinite(Number(p[1])) ? Number(p[1]) : 0;
    if (typeof global.migrateFibArmorPair === 'function') {
        const migrated = global.migrateFibArmorPair(ad, at);
        if (migrated.d !== ad || migrated.t !== at) {
            ad = migrated.d;
            s = `${ad}:${migrated.t}`;
        }
    }
    if (
        Number.isFinite(ad) &&
        ad === 69 &&
        at === 0 &&
        typeof global.hasFibArmorV4Unlocked === 'function' &&
        !global.hasFibArmorV4Unlocked(player)
    ) {
        return '64:0';
    }
    return s;
}

/**
 * Колонка clothes.armor = только косметический жилет (FIB и т.д.).
 * Надета боевая броня (переменная armor) — в БД пишем сохранённую косметику из _cosmeticArmorPersist, не drawable с педа (27/28).
 */
function snapshotArmorForClothesColumn(player, c9) {
    try {
        if (!mp.players.exists(player)) return null;
        if (player.getVariable('armor') === true) {
            const fromPersist = normalizeCosmeticArmorPersist(player._cosmeticArmorPersist);
            if (fromPersist) return sanitizeFibArmorSnapshotValue(player, fromPersist);
            const ca =
                player._clothesRowCache && player._clothesRowCache.armor != null
                    ? String(player._clothesRowCache.armor).trim()
                    : '';
            if (ca && ca !== '0:0') return sanitizeFibArmorSnapshotValue(player, ca);
            return null;
        }
        const cachedRaw =
            player._clothesRowCache && player._clothesRowCache.armor != null
                ? String(player._clothesRowCache.armor).trim()
                : '';
        if (cachedRaw && cachedRaw !== '0:0') return sanitizeFibArmorSnapshotValue(player, cachedRaw);
        const persistOnly = normalizeCosmeticArmorPersist(player._cosmeticArmorPersist);
        if (persistOnly) return sanitizeFibArmorSnapshotValue(player, persistOnly);
        if (!c9 || c9.drawable === undefined) return null;
        const d = Number(c9.drawable);
        const t = Number(c9.texture || 0);
        if (!Number.isFinite(d) || (d === 0 && t === 0)) return null;
        return sanitizeFibArmorSnapshotValue(player, `${d}:${Number.isFinite(t) ? t : 0}`);
    } catch (_e) {
        return null;
    }
}

function persistClothesSnapshotForFraction(staticId, fraction, snap, callback) {
    const fr = Number(fraction);
    if (!Number.isFinite(fr) || staticId == null || snap == null) {
        if (callback) callback();
        return;
    }
    const v = [
        snap.hair,
        snap.headwear,
        snap.glasses,
        snap.masks,
        snap.accessories,
        snap.top,
        snap.bottom,
        snap.shoes,
        snap.tors,
        snap.bags,
        snap.bags_equip_ic1,
        snap.undershirt,
        snap.decals,
        snap.ears,
        snap.watch_prop,
        snap.bracelet_prop,
        snap.gloves,
        snap.armor,
        staticId,
        fr
    ];
    global.DB.query(
        `UPDATE clothes SET hair=?, headwear=?, glasses=?, masks=?, accessories=?, top=?, bottom=?, shoes=?, tors=?, bags=?, bags_equip_ic1=?, undershirt=?, decals=?, ears=?, watch_prop=?, bracelet_prop=?, gloves=?, armor=? WHERE static=? AND fraction=?`,
        v,
        (err, res) => {
            if (err) {
                console.log('[persistClothes]', err);
                if (callback) callback(err);
                return;
            }
            if (res && res.affectedRows > 0) {
                if (callback) callback(null);
                return;
            }
            global.DB.query(
                `INSERT INTO clothes (static, fraction, hair, headwear, glasses, masks, accessories, top, bottom, shoes, tors, bags, bags_equip_ic1, undershirt, decals, ears, watch_prop, bracelet_prop, gloves, armor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    staticId,
                    fr,
                    snap.hair,
                    snap.headwear,
                    snap.glasses,
                    snap.masks,
                    snap.accessories,
                    snap.top,
                    snap.bottom,
                    snap.shoes,
                    snap.tors,
                    snap.bags,
                    snap.bags_equip_ic1,
                    snap.undershirt,
                    snap.decals,
                    snap.ears,
                    snap.watch_prop,
                    snap.bracelet_prop,
                    snap.gloves,
                    snap.armor
                ],
                (err2) => {
                    if (err2) console.log('[persistClothes insert]', err2);
                    if (callback) callback(err2);
                }
            );
        }
    );
}

/** Сохранить текущий вид одежды в строку clothes для активной фракции (выход, смена и т.д.). */
global.persistPlayerClothesRow = function (player, callback) {
    try {
        if (!mp.players.exists(player)) {
            if (callback) callback();
            return;
        }
        /** Никогда не сохранять временный визуал примерочной/рынка как купленную одежду. */
        if (
            !!player._clothesShopSession ||
            player.getVariable('shopc') === true ||
            player.getVariable('tabletTryOn') === true
        ) {
            if (callback) callback();
            return;
        }
        /** Форма порта — временная. Сначала вернуть обычную одежду, иначе не писать рабочий комплект в БД. */
        if (player._portOnWork) {
            let restored = false;
            if (typeof global.restorePortWorkClothesIfNeeded === 'function') {
                restored = global.restorePortWorkClothesIfNeeded(player) === true;
            }
            if (!restored) {
                if (callback) callback();
                return;
            }
        }
        if (!isFreemodePedHash(player.model)) {
            if (callback) callback();
            return;
        }
        const staticId = player.static;
        if (staticId == null) {
            if (callback) callback();
            return;
        }
        const clothesFr =
            typeof global.getClothesFractionForPlayer === 'function'
                ? global.getClothesFractionForPlayer(player)
                : 0;
        const snap = collectPedClothesSnapshot(player);
        if (!snap) {
            if (callback) callback();
            return;
        }
        persistClothesSnapshotForFraction(staticId, clothesFr, snap, callback);
    } catch (e) {
        console.log('[persistPlayerClothesRow]', e);
        if (callback) callback(e);
    }
};

function defaultShoesDrawableForFraction(fk) {
    return { d: 34, t: 0 };
}

/** Стартовая одежда при регистрации (можно снять через инвентарь). */
global.STARTER_REGISTRATION_OUTFIT = {
    tors: { drawable: 15, texture: 0 },
    undershirt: { drawable: 15, texture: 0 },
    top: { drawable: 1, texture: 0 },
    bottom: { drawable: 6, texture: 0 },
    shoes: { drawable: 34, texture: 0 }
};

global.applyStarterRegistrationClothes = function applyStarterRegistrationClothes(player) {
    try {
        if (!mp.players.exists(player)) return;
        const o = global.STARTER_REGISTRATION_OUTFIT;
        player.setClothes(3, o.tors.drawable, o.tors.texture, 0);
        player.setClothes(8, o.undershirt.drawable, o.undershirt.texture, 0);
        player.setClothes(10, 0, 0, 0);
        player.setClothes(11, o.top.drawable, o.top.texture, 0);
        player.setClothes(4, o.bottom.drawable, o.bottom.texture, 0);
        player.setClothes(6, o.shoes.drawable, o.shoes.texture, 0);
    } catch (_e) {}
};

/** Записать стартовый комплект в clothes (первый вход после регистрации). */
global.seedStarterRegistrationClothesDb = function seedStarterRegistrationClothesDb(player, callback) {
    const staticId = player && player.static;
    const fr = player && player.getVariable('fraction');
    if (staticId == null || typeof global.updateOrInsertClothes !== 'function') {
        if (callback) callback();
        return;
    }
    const fields = [
        ['tors', '15'],
        ['top', '1:0'],
        ['bottom', '6:0'],
        ['shoes', '34:0'],
        ['undershirt', '15:0'],
        ['decals', null]
    ];
    let idx = 0;
    const next = () => {
        if (idx >= fields.length) {
            if (callback) callback();
            return;
        }
        const pair = fields[idx++];
        global.updateOrInsertClothes(staticId, fr, pair[0], pair[1], next);
    };
    next();
};

/** Снять маску/шапку/очки после редактора — setCustomization часто оставляет «пустой» prop.
 *  Важно: очки НЕ ставить в 0:0 — у женского freemode drawable 0 = видимые очки. */
global.clearCreatorAccessorySlots = function clearCreatorAccessorySlots(player) {
    try {
        if (!mp.players.exists(player)) return;
        player.setClothes(1, 0, 0, 0);
        if (typeof global.clearFreemodeGlassesSlot === 'function') {
            global.clearFreemodeGlassesSlot(player);
        } else {
            player.setProp(1, -1, 0);
            try {
                player.call('sc:syncPropLocal', [1, -1, 0]);
            } catch (_eg) {}
        }
        if (typeof global.clearFreemodeHeadwearSlot === 'function') {
            global.clearFreemodeHeadwearSlot(player);
        } else {
            const isMale = player.model === mp.joaat('mp_m_freemode_01');
            player.setProp(0, isMale ? 8 : -1, 0);
            try {
                player.call('sc:syncPropLocal', [0, isMale ? 8 : -1, 0]);
            } catch (_eh) {}
        }
        try {
            player._headwearEquipIc1 = null;
        } catch (_e0) {}
        if (typeof global.syncHeadwearEquipCanonicalFromDb === 'function') {
            global.syncHeadwearEquipCanonicalFromDb(player, null);
        }
        try {
            player.call('sc:syncClothesLocal', [1, 0, 0]);
        } catch (_e2) {}
    } catch (_e) {}
};

/** Одежда, выбранная в редакторе персонажа при регистрации. */
global.applyCreatorRegistrationClothes = function applyCreatorRegistrationClothes(player, outfit) {
    try {
        if (!mp.players.exists(player) || !outfit || typeof outfit !== 'object') return;
        if (typeof global.clearCreatorAccessorySlots === 'function') {
            global.clearCreatorAccessorySlots(player);
        }
        const isMale = player.model === mp.joaat('mp_m_freemode_01');
        const top = Array.isArray(outfit.top) ? outfit.top : null;
        const bottom = Array.isArray(outfit.bottom) ? outfit.bottom : null;
        const shoes = Array.isArray(outfit.shoes) ? outfit.shoes : null;
        if (top && top.length >= 3) {
            player.setClothes(11, Number(top[0]) || 0, Number(top[2]) || 0, 0);
            player.setClothes(3, Number(top[1]) || 15, 0, 0);
        }
        player.setClothes(8, isMale ? 15 : 6, 0, 0);
        player.setClothes(10, 0, 0, 0);
        if (bottom && bottom.length >= 2) {
            player.setClothes(4, Number(bottom[0]) || 0, Number(bottom[1]) || 0, 0);
        }
        if (shoes && shoes.length >= 2) {
            player.setClothes(6, Number(shoes[0]) || 0, Number(shoes[1]) || 0, 0);
        }
    } catch (_e) {}
};

/** Записать в clothes комплект из редактора персонажа. */
global.seedCreatorRegistrationClothesDb = function seedCreatorRegistrationClothesDb(player, outfit, callback) {
    const staticId = player && player.static;
    const fr = player && player.getVariable('fraction');
    if (staticId == null || typeof global.updateOrInsertClothes !== 'function') {
        if (callback) callback();
        return;
    }
    const top = outfit && Array.isArray(outfit.top) ? outfit.top : null;
    const bottom = outfit && Array.isArray(outfit.bottom) ? outfit.bottom : null;
    const shoes = outfit && Array.isArray(outfit.shoes) ? outfit.shoes : null;
    const isMale = player && player.model === mp.joaat('mp_m_freemode_01');
    const topStr = top && top.length >= 3 ? `${Number(top[0]) || 0}:${Number(top[2]) || 0}` : '15:0';
    const torsStr = top && top.length >= 2 ? `${Number(top[1]) || 15}` : '15';
    const bottomStr = bottom && bottom.length >= 2
        ? `${Number(bottom[0]) || 0}:${Number(bottom[1]) || 0}`
        : (isMale ? '6:0' : '15:0');
    const shoesStr = shoes && shoes.length >= 2
        ? `${Number(shoes[0]) || 0}:${Number(shoes[1]) || 0}`
        : (isMale ? '34:0' : '35:0');
    const fields = [
        ['headwear', null],
        ['masks', null],
        ['glasses', null],
        ['tors', torsStr],
        ['top', topStr],
        ['bottom', bottomStr],
        ['shoes', shoesStr],
        ['undershirt', isMale ? '15:0' : '6:0'],
        ['decals', null]
    ];
    let idx = 0;
    const next = () => {
        if (idx >= fields.length) {
            if (callback) callback();
            return;
        }
        const pair = fields[idx++];
        global.updateOrInsertClothes(staticId, fr, pair[0], pair[1], next);
    };
    next();
};

/** Есть сохранённый набор одежды в clothes для static + fraction */
function hasSavedFactionClothesRow(err, result) {
    return !err && result && result.length > 0;
}

/** Перед входом в магазин/барбер/тату — сохранить боевую броню и активное оружие для восстановления при выходе. */
global.capturePedShopRestoreSnapshot = function (player) {
    try {
        if (!mp.players.exists(player)) return;
        if (player._shopRestoreSnapshot && player._clothesShopSession) return;
        let cosmeticArmor = null;
        const raw =
            player._cosmeticArmorPersist != null
                ? String(player._cosmeticArmorPersist).trim()
                : player._clothesRowCache && player._clothesRowCache.armor != null
                  ? String(player._clothesRowCache.armor).trim()
                  : '';
        if (raw && raw !== '0:0') cosmeticArmor = raw;
        const components = {};
        const props = {};
        for (let slot = 0; slot <= 11; slot++) {
            const value = player.getClothes(slot);
            if (!value) continue;
            components[slot] = {
                drawable: Number(value.drawable) || 0,
                texture: Number(value.texture) || 0,
                palette: Number(value.palette) || 0
            };
        }
        for (let slot = 0; slot <= 7; slot++) {
            const value = player.getProp(slot);
            if (!value) continue;
            props[slot] = {
                drawable: Number.isFinite(Number(value.drawable)) ? Number(value.drawable) : -1,
                texture: Number(value.texture) || 0
            };
        }
        player._shopRestoreSnapshot = {
            armor: player.getVariable('armor') === true,
            armour: Number(player.armour) || 0,
            activeWeaponSlot: player.getVariable('activeWeaponSlot'),
            cosmeticArmor,
            components,
            props
        };
    } catch (_e) {}
};

/** Немедленно вернуть внешний вид до примерки. БД затем подтверждает сохранённую экипировку. */
global.restorePedShopVisualSnapshot = function (player) {
    try {
        if (!mp.players.exists(player)) return false;
        const snap = player._shopRestoreSnapshot;
        if (!snap) return false;
        if (snap.components && typeof snap.components === 'object') {
            for (const key of Object.keys(snap.components)) {
                const slot = Number(key);
                const value = snap.components[key];
                if (!Number.isInteger(slot) || !value) continue;
                player.setClothes(
                    slot,
                    Number(value.drawable) || 0,
                    Number(value.texture) || 0,
                    Number(value.palette) || 0
                );
            }
        }
        if (snap.props && typeof snap.props === 'object') {
            for (const key of Object.keys(snap.props)) {
                const slot = Number(key);
                const value = snap.props[key];
                if (!Number.isInteger(slot) || !value) continue;
                const drawable = Number.isFinite(Number(value.drawable)) ? Number(value.drawable) : -1;
                const texture = Number(value.texture) || 0;
                player.setProp(slot, drawable, texture);
                if (typeof global.replayPropSyncForDelayedSpawn === 'function') {
                    global.replayPropSyncForDelayedSpawn(player, slot, drawable, texture);
                }
            }
        }
        return true;
    } catch (_e) {
        return false;
    }
};

function parseClothesPairValue(raw, defaultTexture) {
    if (raw == null || String(raw).trim() === '') return null;
    const parts = String(raw).trim().split(':');
    const d = Number(parts[0]);
    const t = parts.length > 1 ? Number(parts[1]) : Number(defaultTexture || 0);
    if (!Number.isFinite(d)) return null;
    return { d, t: Number.isFinite(t) ? t : 0 };
}

function reapplyTorsoFromClothesCache(player) {
    try {
        if (!mp.players.exists(player)) return;
        const row = player._clothesRowCache;
        if (!row || row.tors == null || String(row.tors).trim() === '') return;
        const pair = parseClothesPairValue(row.tors, 0);
        if (!pair) return;
        player.setClothes(3, pair.d, pair.t, 0);
        if (typeof global.reapplyDonateGlovesIfEquipped === 'function') {
            global.reapplyDonateGlovesIfEquipped(player);
        }
    } catch (_e) {}
}

/** После clothes из БД — внешность, тату (после setCustomization), броня. */
global.finishPlayerPedVisuals = function (player, opts) {
    opts = opts && typeof opts === 'object' ? opts : {};
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const applyAppearance = () => {
            if (typeof global.reapplyPlayerAppearanceAfterClothes === 'function') {
                global.reapplyPlayerAppearanceAfterClothes(player);
            } else if (typeof global.hydrateCharAppearanceFromDb === 'function') {
                global.hydrateCharAppearanceFromDb(player);
            }
        };

        const applyTattoos = () => {
            if (player.getVariable('shopc') === true) return;
            if (typeof global.setTatto === 'function') global.setTatto(player);
        };

        const applyMakeup = () => {
            if (typeof global.setMakeup === 'function') global.setMakeup(player);
        };

        const restoreSnapshot = () => {
            const snap = player._shopRestoreSnapshot;
            if (opts.restoreShopSnapshot && snap) {
                if (typeof global.restorePedShopVisualSnapshot === 'function') {
                    global.restorePedShopVisualSnapshot(player);
                }
                if (snap.cosmeticArmor) {
                    player._cosmeticArmorPersist = snap.cosmeticArmor;
                    if (!player._clothesRowCache) player._clothesRowCache = {};
                    player._clothesRowCache.armor = snap.cosmeticArmor;
                }
                if (snap.armor === true) {
                    player.setVariable('armor', true);
                    const ar = Number(snap.armour);
                    player.armour = Number.isFinite(ar) && ar > 0 ? ar : 100;
                    if (typeof global.ensureCosmeticArmorPersistFromDb === 'function') {
                        global.ensureCosmeticArmorPersistFromDb(player, () => {
                            if (typeof global.scheduleGameplayArmorVestVisual === 'function') {
                                global.scheduleGameplayArmorVestVisual(player, [0, 200, 600, 1200]);
                            } else if (typeof global.applyGameplayArmorVestVisual === 'function') {
                                global.applyGameplayArmorVestVisual(player);
                            }
                        });
                    } else if (typeof global.scheduleGameplayArmorVestVisual === 'function') {
                        global.scheduleGameplayArmorVestVisual(player, [0, 200, 600, 1200]);
                    } else if (typeof global.applyGameplayArmorVestVisual === 'function') {
                        global.applyGameplayArmorVestVisual(player);
                    }
                }
                if (snap.activeWeaponSlot != null && snap.activeWeaponSlot !== false && snap.activeWeaponSlot !== '') {
                    player.setVariable('activeWeaponSlot', snap.activeWeaponSlot);
                }
                delete player._shopRestoreSnapshot;
                return;
            }
            if (player.getVariable('armor') === true) {
                if (typeof global.scheduleGameplayArmorVestVisual === 'function') {
                    global.scheduleGameplayArmorVestVisual(player, [0, 250, 700]);
                } else if (typeof global.applyGameplayArmorVestVisual === 'function') {
                    global.applyGameplayArmorVestVisual(player);
                }
            }
        };

        applyAppearance();
        reapplyTorsoFromClothesCache(player);
        applyMakeup();
        setTimeout(() => {
            if (!mp.players.exists(player)) return;
            applyTattoos();
            applyMakeup();
            reapplyTorsoFromClothesCache(player);
            restoreSnapshot();
        }, 120);
        setTimeout(() => {
            if (!mp.players.exists(player)) return;
            applyAppearance();
            reapplyTorsoFromClothesCache(player);
            applyTattoos();
            applyMakeup();
            restoreSnapshot();
        }, 450);
        setTimeout(() => {
            if (!mp.players.exists(player)) return;
            reapplyTorsoFromClothesCache(player);
            restoreSnapshot();
        }, 1100);

        if (opts.restoreShopSnapshot) {
            const notifyHatHairResync = () => {
                try {
                    player.call('client:resetHatHairAfterClothing');
                } catch (_eH) {}
            };
            setTimeout(() => {
                if (!mp.players.exists(player)) return;
                notifyHatHairResync();
            }, 450);
            setTimeout(() => {
                if (!mp.players.exists(player)) return;
                notifyHatHairResync();
            }, 1300);
        }
    } catch (e) {
        console.log('[finishPlayerPedVisuals]', e);
    }
};

/** После входа: дефолт фракции + сохранённая одежда из БД. */
global.hydratePlayerClothesFromDb = function (player, opts) {
    opts = opts && typeof opts === 'object' ? opts : {};
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('charCreating') === true) return;
        const staticId = player.static;
        if (staticId == null) return;
        const clothesFr =
            typeof global.getClothesFractionForPlayer === 'function'
                ? global.getClothesFractionForPlayer(player)
                : 0;
        global.DB.query('SELECT * FROM clothes WHERE static = ? AND fraction = ?', [staticId, clothesFr], (err, result) => {
            if (!mp.players.exists(player)) return;
            const applyLoadedClothes = (row) => {
                if (hasSavedFactionClothesRow(null, row ? [row] : [])) {
                    applyClothingFromDB(player, row);
                } else {
                    try {
                        player._clothesRowCache = {};
                        player._cosmeticArmorPersist = null;
                    } catch (_e1) {}
                }
                if (typeof global.syncWornFactionClothesIntoInventory === 'function') {
                    global.syncWornFactionClothesIntoInventory(player);
                }
                setImmediate(() => {
                    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                    if (typeof global.sendLoadInventoryClient === 'function') {
                        global.sendLoadInventoryClient(player);
                    }
                });
                setTimeout(() => {
                    try {
                        if (!mp.players.exists(player)) return;
                        if (typeof global.finishPlayerPedVisuals === 'function') {
                            global.finishPlayerPedVisuals(player, opts);
                        } else if (typeof global.reapplyPlayerAppearanceAfterClothes === 'function') {
                            global.reapplyPlayerAppearanceAfterClothes(player);
                        }
                    } catch (_eApp) {}
                }, 80);
            };
            if (hasSavedFactionClothesRow(err, result)) {
                applyLoadedClothes(result[0]);
                return;
            }
            /** Старые записи clothes могли быть под fraction фракции, а не 0. */
            global.DB.query(
                'SELECT * FROM clothes WHERE static = ? ORDER BY fraction ASC LIMIT 1',
                [staticId],
                (errLegacy, legacyRows) => {
                    if (!mp.players.exists(player)) return;
                    applyLoadedClothes(errLegacy || !legacyRows || !legacyRows.length ? null : legacyRows[0]);
                }
            );
        });
    } catch (e) {
        console.log('[hydratePlayerClothesFromDb]', e);
    }
};

/** После примерки в магазине: восстановить одежду/тату/броню на месте, без телепорта на базу фракции. */
global.reapplyPlayerClothesAfterShopClose = function (player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.restorePedShopVisualSnapshot === 'function') {
            global.restorePedShopVisualSnapshot(player);
        }
        if (typeof global.hydratePlayerClothesFromDb === 'function') {
            global.hydratePlayerClothesFromDb(player, { restoreShopSnapshot: true });
        }
        setTimeout(() => {
            try {
                if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                if (typeof global.syncWornFactionClothesIntoInventory === 'function') {
                    global.syncWornFactionClothesIntoInventory(player);
                }
                if (typeof global.sendLoadInventoryClient === 'function') {
                    global.sendLoadInventoryClient(player);
                }
            } catch (_eSync) {}
        }, 1300);
    } catch (e) {
        console.log('[reapplyPlayerClothesAfterShopClose]', e);
    }
};

function resetPlayerClothes(player) {
    try {
        if (typeof global.clearFreemodeHeadwearSlot === 'function') global.clearFreemodeHeadwearSlot(player);
        else player.setProp(0, 8, 0);
        if (typeof global.clearFreemodeGlassesSlot === 'function') global.clearFreemodeGlassesSlot(player);
        else {
            player.setProp(1, -1, 0);
            try {
                player.call('sc:syncPropLocal', [1, -1, 0]);
            } catch (_eg) {}
        }
        player.setProp(6, 2, 0);
        player.setClothes(1, 0, 0, 0);
        player.setClothes(2, 0, 0, 0);
        player.setClothes(7, 0, 0, 0);
        player.setClothes(5, 0, 0, 0);
        player.call('armorplayern', [player]);
        player.setClothes(9, 0, 0, 0);
        player.setVariable('armor', null);
        player.removeAllWeapons();
        player.setVariable('activeWeaponSlot', null);
        try {
            player._bagEquipIc1 = null;
        } catch (_eBr) {}
        if (player.getVariable('ammo') !== false) player.call('hideAmmo');
    } catch (error) {
        console.log(error);
    }
}

function handlePlayerModelChange(player, fraction, heading, teleportPosition, options) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const opts = options && typeof options === 'object' ? options : {};
        const skipPosition = opts.skipPosition === true;
        const skipOutfitReload = opts.skipOutfitReload === true;
        const targetPos = skipPosition ? null : (opts.targetPos || null);

        const staticId = player.static;
        const clothesFr =
            typeof global.getClothesFractionForPlayer === 'function'
                ? global.getClothesFractionForPlayer(player)
                : 0;

        if (skipOutfitReload) {
            try {
                player.setVariable('fraction', fraction);
                player.call('setfraction', [parseInt(fraction, 10) || 0]);
            } catch (_eTag) {}
            return;
        }

        const shouldSaveOld = false;

        function proceedModelChange() {
            player.setVariable('mp', false);
            player.setVariable('mpp', false);

            global.deleteVeh(player.carActive);

            resetPlayerClothes(player);
            player.setClothes(8, 15, 0, 0);
            let spawnX = null;
            let spawnY = null;
            let spawnZ = null;
            let spawnH = heading;
            if (targetPos && Number.isFinite(Number(targetPos.x)) && Number.isFinite(Number(targetPos.y)) && Number.isFinite(Number(targetPos.z))) {
                spawnX = Number(targetPos.x);
                spawnY = Number(targetPos.y);
                spawnZ = Number(targetPos.z);
                spawnH = targetPos.h != null && Number.isFinite(Number(targetPos.h)) ? Number(targetPos.h) : heading;
            } else if (
                teleportPosition &&
                Number.isFinite(Number(teleportPosition.x)) &&
                Number.isFinite(Number(teleportPosition.y)) &&
                Number.isFinite(Number(teleportPosition.z))
            ) {
                spawnX = Number(teleportPosition.x);
                spawnY = Number(teleportPosition.y);
                spawnZ = Number(teleportPosition.z);
            }
            if (spawnX != null && spawnY != null && spawnZ != null) {
                const pos = new mp.Vector3(spawnX, spawnY, spawnZ);
                try {
                    player.spawn(pos);
                } catch (_eSp) {
                    player.position = pos;
                }
                player.heading = spawnH;
            }
            player.setVariable('fraction', fraction);
            player.call('showHud:CLIENT', [player.id, player.static]);
            if (typeof global.pushHudClockToPlayer === 'function') global.pushHudClockToPlayer(player);
            const _m = Number(player.money);
            if (!Number.isNaN(_m)) {
                player.call('updateMoney', [global.formatnum1(_m)]);
            }
            player.dimension = 0;

            if (typeof global.setMakeup === 'function') global.setMakeup(player);

            global.DB.query(
                'SELECT * FROM clothes WHERE static = ? AND fraction = ?',
                [staticId, clothesFr],
                (err, result) => {
                    if (!mp.players.exists(player)) return;
                    if (hasSavedFactionClothesRow(err, result)) {
                        applyClothingFromDB(player, result[0]);
                    }
                    if (typeof global.syncWornFactionClothesIntoInventory === 'function') {
                        global.syncWornFactionClothesIntoInventory(player);
                    }
                    if (typeof global.finishPlayerPedVisuals === 'function') {
                        global.finishPlayerPedVisuals(player);
                    } else if (typeof global.reapplyPlayerAppearanceAfterClothes === 'function') {
                        global.reapplyPlayerAppearanceAfterClothes(player);
                    }
                    if (typeof global.emitPlayerInventory === 'function') {
                        global.emitPlayerInventory(player);
                    }
                }
            );
        }

        proceedModelChange();
    } catch (error) {
        console.log(error);
    }
}

function applyDefaultClothes(_player, _fraction) {
    /** Фракционная форма больше не надевается автоматически — только сохранённая/стартовая одежда из БД. */
}

function applyArmorVestFromClothingRow(player, clothing) {
    if (!mp.players.exists(player)) return;
    if (player.getVariable('armor') === true) {
        if (typeof global.applyGameplayArmorVestVisual === 'function') {
            global.applyGameplayArmorVestVisual(player);
        }
        return;
    }
    player.setClothes(9, 0, 0, 0);
}

/** Совместимость: без боевой брони слот 9 пустой (косметика жилета не показывается). */
global.applyCosmeticArmorSlotFromCache = function (player) {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('armor') === true) return;
        player.setClothes(9, 0, 0, 0);
    } catch (_e) {}
};

/**
 * Donate-prop с большим drawable (>=128, особенно >=200) при первом spawn часто не успевает применяться
 * на клиенте: serverside setProp+первый client setPropIndex могут прийти раньше готовности педа.
 * Повторяем sc:syncPropLocal несколько раз; client-side вызывает setPropIndex(_, _, _, true).
 */
function replayPropSyncForDelayedSpawn(player, prop, drawable, texture) {
    if (!mp.players.exists(player)) return;
    const p = Number(prop);
    const d = Number(drawable);
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    if (!Number.isFinite(p)) return;
    if (!player._propReplaySlotSeq) player._propReplaySlotSeq = {};
    player._propReplaySlotSeq[p] = (player._propReplaySlotSeq[p] || 0) + 1;
    const mySeq = player._propReplaySlotSeq[p];
    const fire = () => {
        try {
            if (!mp.players.exists(player)) return;
            if (!player._propReplaySlotSeq || player._propReplaySlotSeq[p] !== mySeq) return;
            player.call('sc:syncPropLocal', [p, d, t]);
        } catch (_e) {}
    };
    fire();
    setTimeout(fire, 600);
    setTimeout(fire, 1800);
    setTimeout(fire, 3500);
}
global.replayPropSyncForDelayedSpawn = replayPropSyncForDelayedSpawn;

/** Только props из строки clothes (после setCustomization). */
global.applyClothesAccessoryPropsFromRow = function applyClothesAccessoryPropsFromRow(player, clothing) {
    if (!mp.players.exists(player) || !clothing || typeof clothing !== 'object') return;
    const MALE_FREE = mp.joaat('mp_m_freemode_01');
    let headwearSyncArg = undefined;
    if (Object.prototype.hasOwnProperty.call(clothing, 'headwear')) {
        if (clothing.headwear === null || clothing.headwear === '') {
            if (typeof global.clearFreemodeHeadwearSlot === 'function') global.clearFreemodeHeadwearSlot(player);
            else player.setProp(0, player.model === MALE_FREE ? 8 : -1, 0);
            replayPropSyncForDelayedSpawn(player, 0, player.model === MALE_FREE ? 8 : -1, 0);
            headwearSyncArg = '';
        } else if (clothing.headwear) {
            const raw = String(clothing.headwear).trim();
            const parts = raw.split(':');
            const drawable = Number(parts[0]);
            const texture = Number(parts[1]);
            const tx = Number.isFinite(texture) ? texture : 0;
            if (
                Number.isFinite(drawable) &&
                typeof global.isFreemodeHeadwearSlotConsideredEmpty === 'function' &&
                global.isFreemodeHeadwearSlotConsideredEmpty(player, drawable, tx)
            ) {
                if (typeof global.clearFreemodeHeadwearSlot === 'function') global.clearFreemodeHeadwearSlot(player);
                else player.setProp(0, player.model === MALE_FREE ? 8 : -1, 0);
                replayPropSyncForDelayedSpawn(player, 0, player.model === MALE_FREE ? 8 : -1, 0);
                headwearSyncArg = '';
            } else if (Number.isFinite(drawable)) {
                player.setProp(0, drawable, tx);
                replayPropSyncForDelayedSpawn(player, 0, drawable, tx);
                headwearSyncArg = `${drawable}:${tx}`;
            }
        }
        if (headwearSyncArg !== undefined && typeof global.syncHeadwearEquipCanonicalFromDb === 'function') {
            global.syncHeadwearEquipCanonicalFromDb(player, headwearSyncArg === '' ? null : headwearSyncArg);
        }
    } else if (typeof global.clearFreemodeHeadwearSlot === 'function') {
        /* нет headwear в кэше — не трогаем, если уже применена одежда */
    }

    if (!Object.prototype.hasOwnProperty.call(clothing, 'glasses')) {
        /* нет колонки в кэше — не трогаем prop */
    } else if (clothing.glasses === null || clothing.glasses === '') {
        if (typeof global.clearFreemodeGlassesSlot === 'function') {
            global.clearFreemodeGlassesSlot(player);
        } else {
            player.setProp(1, -1, 0);
            replayPropSyncForDelayedSpawn(player, 1, -1, 0);
        }
    } else if (clothing.glasses) {
        const [drawable, texture] = String(clothing.glasses).split(':').map(Number);
        const tx = Number.isFinite(texture) ? texture : 0;
        if (Number.isFinite(drawable) && drawable >= 0 && !(drawable === 0 && tx === 0)) {
            player.setProp(1, drawable, tx);
            replayPropSyncForDelayedSpawn(player, 1, drawable, tx);
        } else if (typeof global.clearFreemodeGlassesSlot === 'function') {
            global.clearFreemodeGlassesSlot(player);
        } else {
            player.setProp(1, -1, 0);
            replayPropSyncForDelayedSpawn(player, 1, -1, 0);
        }
    }

    if ('ears' in clothing) {
        if (clothing.ears == null || clothing.ears === '') {
            player.setProp(2, -1, 0);
            replayPropSyncForDelayedSpawn(player, 2, -1, 0);
        } else if (clothing.ears) {
            const [d, t] = String(clothing.ears).split(':').map(Number);
            if (Number.isFinite(d)) {
                const tt = Number.isFinite(t) ? t : 0;
                player.setProp(2, d, tt);
                replayPropSyncForDelayedSpawn(player, 2, d, tt);
            }
        }
    }
    if ('watch_prop' in clothing) {
        if (clothing.watch_prop == null || clothing.watch_prop === '') {
            player.setProp(6, -1, 0);
            replayPropSyncForDelayedSpawn(player, 6, -1, 0);
        } else if (clothing.watch_prop) {
            const [d, t] = String(clothing.watch_prop).split(':').map(Number);
            if (Number.isFinite(d)) {
                const tt = Number.isFinite(t) ? t : 0;
                player.setProp(6, d, tt);
                replayPropSyncForDelayedSpawn(player, 6, d, tt);
            }
        }
    }
    if ('bracelet_prop' in clothing) {
        if (clothing.bracelet_prop == null || clothing.bracelet_prop === '') {
            player.setProp(7, -1, 0);
            replayPropSyncForDelayedSpawn(player, 7, -1, 0);
        } else if (clothing.bracelet_prop) {
            const [d, t] = String(clothing.bracelet_prop).split(':').map(Number);
            if (Number.isFinite(d)) {
                const tt = Number.isFinite(t) ? t : 0;
                player.setProp(7, d, tt);
                replayPropSyncForDelayedSpawn(player, 7, d, tt);
            }
        }
    }
};

function clothesPairNorm(raw) {
    if (raw == null || String(raw).trim() === '') return '';
    const parts = String(raw).trim().split(':');
    const d = Number(parts[0]);
    const t = parts.length > 1 ? Number(parts[1]) : 0;
    if (!Number.isFinite(d)) return '';
    return `${d}:${Number.isFinite(t) ? t : 0}`;
}

/** Если в БД залипла форма порта (выход без конца смены) — не надевать её и поправить строку. */
function stripPersistedPortWorkOutfit(player, clothing) {
    try {
        if (!player || !clothing) return false;
        const u = clothesPairNorm(clothing.undershirt);
        const b = clothesPairNorm(clothing.bottom);
        const s = clothesPairNorm(clothing.shoes);
        const male = player.model === MP_M_FREEMODE_HASH;
        const female = player.model === MP_F_FREEMODE_HASH;
        const isWork =
            (male && u === '59:0' && b === '0:5' && s === '48:0') ||
            (female && u === '36:0' && b === '1:5' && s === '49:0');
        if (!isWork) return false;
        clothing.undershirt = '15:0';
        clothing.bottom = '6:0';
        clothing.shoes = '34:0';
        const staticId = player.static;
        const fr =
            typeof global.getClothesFractionForPlayer === 'function'
                ? global.getClothesFractionForPlayer(player)
                : 0;
        if (staticId != null && typeof global.updateOrInsertClothes === 'function') {
            global.updateOrInsertClothes(staticId, fr, 'undershirt', '15:0', () => {});
            global.updateOrInsertClothes(staticId, fr, 'bottom', '6:0', () => {});
            global.updateOrInsertClothes(staticId, fr, 'shoes', '34:0', () => {});
        }
        return true;
    } catch (_e) {
        return false;
    }
}

function applyClothingFromDB(player, clothing) {
    if (
        clothing &&
        global.donateClothesRemapV2 &&
        typeof global.donateClothesRemapV2.migrateClothesRowObject === 'function'
    ) {
        try {
            const mig = global.donateClothesRemapV2.migrateClothesRowObject(clothing);
            if (mig && mig.changed) {
                clothing = mig.row;
                const staticId = player.static;
                const clothesFr =
                    typeof global.getClothesFractionForPlayer === 'function'
                        ? global.getClothesFractionForPlayer(player)
                        : 0;
                if (staticId != null && global.DB) {
                    const cols = [
                        'headwear',
                        'masks',
                        'top',
                        'bottom',
                        'shoes',
                        'accessories',
                        'glasses',
                        'bags',
                        'ears',
                        'watch_prop',
                        'bracelet_prop',
                        'bags_equip_ic1'
                    ];
                    const sets = [];
                    const vals = [];
                    for (let i = 0; i < cols.length; i++) {
                        if (!Object.prototype.hasOwnProperty.call(clothing, cols[i])) continue;
                        sets.push(`${cols[i]} = ?`);
                        vals.push(clothing[cols[i]]);
                    }
                    if (sets.length) {
                        vals.push(staticId, clothesFr);
                        global.DB.query(
                            `UPDATE clothes SET ${sets.join(', ')} WHERE static = ? AND fraction = ?`,
                            vals,
                            () => {}
                        );
                    }
                }
            }
        } catch (_eMig) {}
    }
    stripPersistedPortWorkOutfit(player, clothing);
    const MALE_FREE = mp.joaat('mp_m_freemode_01');
    const fk = String(player.getVariable('fraction') || '1');
    const defShoes = defaultShoesDrawableForFraction(fk);

    if (clothing.tors != null && clothing.tors !== '') {
        const s = String(clothing.tors).trim();
        if (s.indexOf(':') !== -1) {
            const [td, tt] = s.split(':').map(Number);
            if (Number.isFinite(td)) player.setClothes(3, td, Number.isFinite(tt) ? tt : 0, 0);
        } else {
            const tors = Number(clothing.tors);
            if (Number.isFinite(tors)) player.setClothes(3, tors, 0, 0);
        }
    }

    if (clothing.hair) {
        const parts = String(clothing.hair).split(':');
        const hd = parseInt(parts[0], 10);
        const ht = parseInt(parts[1], 10);
        if (Number.isFinite(hd)) {
            const texture = Number.isFinite(ht) ? ht : 0;
            if (typeof global.applyPlayerHairClothes === 'function') {
                global.applyPlayerHairClothes(player, hd, texture);
            } else {
                player.setClothes(2, hd, texture, 0);
            }
        }
    }

    let headwearSyncArg = undefined;
    if (Object.prototype.hasOwnProperty.call(clothing, 'headwear')) {
        if (clothing.headwear === null || clothing.headwear === '') {
            if (typeof global.clearFreemodeHeadwearSlot === 'function') global.clearFreemodeHeadwearSlot(player);
            else player.setProp(0, 8, 0);
            replayPropSyncForDelayedSpawn(player, 0, player.model === MALE_FREE ? 8 : -1, 0);
            headwearSyncArg = '';
        } else if (clothing.headwear) {
            const raw = String(clothing.headwear).trim();
            const parts = raw.split(':');
            const drawable = Number(parts[0]);
            const texture = Number(parts[1]);
            const tx = Number.isFinite(texture) ? texture : 0;
            if (
                Number.isFinite(drawable) &&
                typeof global.isFreemodeHeadwearSlotConsideredEmpty === 'function' &&
                global.isFreemodeHeadwearSlotConsideredEmpty(player, drawable, tx)
            ) {
                if (typeof global.clearFreemodeHeadwearSlot === 'function') global.clearFreemodeHeadwearSlot(player);
                else player.setProp(0, player.model === MALE_FREE ? 8 : -1, 0);
                replayPropSyncForDelayedSpawn(player, 0, player.model === MALE_FREE ? 8 : -1, 0);
                headwearSyncArg = '';
            } else if (Number.isFinite(drawable)) {
                player.setProp(0, drawable, tx);
                replayPropSyncForDelayedSpawn(player, 0, drawable, tx);
                headwearSyncArg = `${drawable}:${tx}`;
            }
        }
        if (headwearSyncArg !== undefined && typeof global.syncHeadwearEquipCanonicalFromDb === 'function') {
            global.syncHeadwearEquipCanonicalFromDb(player, headwearSyncArg === '' ? null : headwearSyncArg);
        }
    }

    if (clothing.glasses === null || clothing.glasses === '') {
        if (typeof global.clearFreemodeGlassesSlot === 'function') {
            global.clearFreemodeGlassesSlot(player);
        } else {
            player.setProp(1, -1, 0);
            replayPropSyncForDelayedSpawn(player, 1, -1, 0);
        }
    } else if (clothing.glasses) {
        const [drawable, texture] = clothing.glasses.split(':').map(Number);
        const tx = Number.isFinite(texture) ? texture : 0;
        if (Number.isFinite(drawable) && drawable >= 0 && !(drawable === 0 && tx === 0)) {
            player.setProp(1, drawable, tx);
            replayPropSyncForDelayedSpawn(player, 1, drawable, tx);
        } else if (typeof global.clearFreemodeGlassesSlot === 'function') {
            global.clearFreemodeGlassesSlot(player);
        } else {
            player.setProp(1, -1, 0);
            replayPropSyncForDelayedSpawn(player, 1, -1, 0);
        }
    }

    if ('ears' in clothing) {
        if (clothing.ears == null || clothing.ears === '') {
            player.setProp(2, -1, 0);
            replayPropSyncForDelayedSpawn(player, 2, -1, 0);
        } else if (clothing.ears) {
            const [d, t] = clothing.ears.split(':').map(Number);
            if (Number.isFinite(d)) {
                const tt = Number.isFinite(t) ? t : 0;
                player.setProp(2, d, tt);
                replayPropSyncForDelayedSpawn(player, 2, d, tt);
            }
        }
    }
    if ('watch_prop' in clothing) {
        if (clothing.watch_prop == null || clothing.watch_prop === '') {
            player.setProp(6, -1, 0);
            replayPropSyncForDelayedSpawn(player, 6, -1, 0);
        } else if (clothing.watch_prop) {
            const [d, t] = clothing.watch_prop.split(':').map(Number);
            if (Number.isFinite(d)) {
                const tt = Number.isFinite(t) ? t : 0;
                player.setProp(6, d, tt);
                replayPropSyncForDelayedSpawn(player, 6, d, tt);
            }
        }
    }
    if ('bracelet_prop' in clothing) {
        if (clothing.bracelet_prop == null || clothing.bracelet_prop === '') {
            player.setProp(7, -1, 0);
            replayPropSyncForDelayedSpawn(player, 7, -1, 0);
        } else if (clothing.bracelet_prop) {
            const [d, t] = clothing.bracelet_prop.split(':').map(Number);
            if (Number.isFinite(d)) {
                const tt = Number.isFinite(t) ? t : 0;
                player.setProp(7, d, tt);
                replayPropSyncForDelayedSpawn(player, 7, d, tt);
            }
        }
    }

    if (!Object.prototype.hasOwnProperty.call(clothing, 'masks') || clothing.masks === null || clothing.masks === '') {
        player.setClothes(1, 0, 0, 0);
    } else if (clothing.masks) {
        const [drawable, texture] = clothing.masks.split(':').map(Number);
        player.setClothes(1, drawable, texture, 0);
    }

    const noTop = clothing.top == null || String(clothing.top).trim() === '';
    const torsBare15 = String(clothing.tors || '') === '15';
    const maleBareUpper = player.model === MALE_FREE && noTop && torsBare15;

    function applyUndershirtFromRow() {
        if (clothing.undershirt === null || clothing.undershirt === '') return;
        if (!clothing.undershirt) return;
        const [ud, ut] = clothing.undershirt.split(':').map(Number);
        if (Number.isFinite(ud)) player.setClothes(8, ud, Number.isFinite(ut) ? ut : 0, 0);
    }

    function applyDecalsFromRow() {
        if (clothing.decals === null || clothing.decals === '') {
            player.setClothes(10, 0, 0, 0);
            return;
        }
        if (clothing.decals) {
            const [dd, dt] = clothing.decals.split(':').map(Number);
            if (Number.isFinite(dd)) player.setClothes(10, dd, Number.isFinite(dt) ? dt : 0, 0);
        }
    }

    if (maleBareUpper) {
        if (clothing.undershirt && String(clothing.undershirt).trim() !== '') applyUndershirtFromRow();
        else player.setClothes(8, 15, 0, 0);
        applyDecalsFromRow();
        player.setClothes(11, 15, 0, 0);
    } else {
        applyUndershirtFromRow();
        if (clothing.top) {
            const [drawable, texture] = clothing.top.split(':').map(Number);
            player.setClothes(11, drawable, texture, 0);
        }
        applyDecalsFromRow();
    }

    if (clothing.bags === null || clothing.bags === '') {
        if (typeof global.applyBagClothesToPed === 'function') global.applyBagClothesToPed(player, 0, 0);
        else player.setClothes(5, 0, 0, 0);
        try {
            player._bagEquipIc1 = null;
        } catch (_eB0) {}
    } else if (clothing.bags) {
        const [drawable, texture] = clothing.bags.split(':').map(Number);
        if (typeof global.applyBagClothesToPed === 'function') {
            global.applyBagClothesToPed(player, drawable, Number.isFinite(texture) ? texture : 0);
        } else {
            player.setClothes(5, drawable, texture, 0);
        }
        try {
            const bec = clothing.bags_equip_ic1;
            if (
                typeof bec === 'string' &&
                bec.startsWith('ic1.') &&
                typeof global.verifyBagEquipIc1PayloadMatchesPed === 'function' &&
                global.verifyBagEquipIc1PayloadMatchesPed(player, bec)
            ) {
                player._bagEquipIc1 = bec.split('(')[0].trim();
            } else {
                player._bagEquipIc1 = null;
            }
        } catch (_eB1) {
            try {
                player._bagEquipIc1 = null;
            } catch (_eB2) {}
        }
    }

    if (clothing.accessories === null || clothing.accessories === '') {
        player.setClothes(7, 0, 0, 0);
    } else if (clothing.accessories) {
        const [drawable, texture] = clothing.accessories.split(':').map(Number);
        player.setClothes(7, drawable, texture, 0);
    }

    if (clothing.bottom === null || clothing.bottom === '') {
        player.setClothes(4, 14, 0, 0);
    } else if (clothing.bottom) {
        const [drawable, texture] = clothing.bottom.split(':').map(Number);
        player.setClothes(4, drawable, texture, 0);
    }

    if (clothing.shoes === null || clothing.shoes === '') {
        player.setClothes(6, defShoes.d, defShoes.t, 0);
    } else if (clothing.shoes) {
        const [drawable, texture] = clothing.shoes.split(':').map(Number);
        player.setClothes(6, drawable, texture, 0);
    }

    applyArmorVestFromClothingRow(player, clothing);

    if (clothing.gloves && String(clothing.gloves).trim() !== '') {
        const gp = String(clothing.gloves).split(':').map(Number);
        const giid = gp[0];
        const gtx = gp[1];
        if (Number.isFinite(giid) && Number.isFinite(gtx)) {
            player._donateGlovesItemId = giid;
            player._donateGlovesTex = global.clampSkeletonGloveTexture(gtx);
            if (typeof global.applyDonateSkeletonGlovesTorso === 'function') {
                global.applyDonateSkeletonGlovesTorso(player, gtx);
            }
        }
    } else {
        player._donateGlovesItemId = null;
        player._donateGlovesTex = null;
        if (typeof global.restoreTorsoAfterDonateGloves === 'function') {
            global.restoreTorsoAfterDonateGloves(player);
        }
    }

    try {
        player._clothesRowCache = Object.assign({}, clothing);
        if (Object.prototype.hasOwnProperty.call(clothing, 'fib_armor_v4')) {
            player.fib_armor_v4 = Number(clothing.fib_armor_v4) === 1;
        }
        let armForPersist = clothing && clothing.armor;
        if (armForPersist != null && String(armForPersist).trim() !== '') {
            const ap = String(armForPersist).trim().split(':');
            let ad = Number(ap[0]);
            let at = Number.isFinite(Number(ap[1])) ? Number(ap[1]) : 0;
            const frSnap = String(player.getVariable('fraction') || '');
            let migratedPersist = false;
            if (frSnap === '6' && typeof global.migrateFibArmorPair === 'function') {
                const migrated = global.migrateFibArmorPair(ad, at);
                if (migrated.d !== ad || migrated.t !== at) {
                    ad = migrated.d;
                    at = migrated.t;
                    migratedPersist = true;
                }
            } else {
                try {
                    const migrated = require('./config/armor_cosmetic').migrateDonationArmorPair(ad, at);
                    if (migrated.d !== ad || migrated.t !== at) {
                        ad = migrated.d;
                        at = migrated.t;
                        migratedPersist = true;
                    }
                } catch (_m) {}
            }
            armForPersist = `${ad}:${at}`;
            if (
                frSnap === '6' &&
                ad === 69 &&
                at === 0 &&
                typeof global.hasFibArmorV4Unlocked === 'function' &&
                !global.hasFibArmorV4Unlocked(player)
            ) {
                armForPersist = '64:0';
                migratedPersist = true;
                const staticId = player.static;
                if (staticId != null && frSnap && typeof global.updateOrInsertClothes === 'function') {
                    global.updateOrInsertClothes(staticId, frSnap, 'armor', '64:0', () => {});
                }
            } else if (migratedPersist) {
                const staticId = player.static;
                if (staticId != null && frSnap && typeof global.updateOrInsertClothes === 'function') {
                    global.updateOrInsertClothes(staticId, frSnap, 'armor', armForPersist, () => {});
                }
            }
        }
        player._cosmeticArmorPersist = normalizeCosmeticArmorPersist(armForPersist);
        try {
            if (armForPersist != null && String(armForPersist).trim() !== '') {
                player._clothesRowCache.armor = String(armForPersist).trim();
            }
        } catch (_e2) {}
    } catch (_e) {}
}

const modelChanges = [
    { event: 'playerModelChange1', fraction: '1', heading: 84.31329345703125, teleport: new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875) },
    { event: 'playerModelChange2', fraction: '2', heading: 20.358104705810547, teleport: new mp.Vector3(-10.661846160888672, -1419.117919921875, 29.32600212097168) },
    { event: 'playerModelChange3', fraction: '3', heading: 91.25193786621094, teleport: new mp.Vector3(924.6547241210938, -1559.1331787109375, 30.755172729492188) },
    { event: 'playerModelChange4', fraction: '4', heading: -89.44387817382812, teleport: new mp.Vector3(840.6149291992188, -2335.831298828125, 30.334321975708008) },
    { event: 'playerModelChange5', fraction: '5', heading: 36.1340446472168, teleport: new mp.Vector3(1379.235107421875, -2079.55322265625, 51.998565673828125) },
    { event: 'playerModelChange6', fraction: '6', heading: 84.05252838134766, teleport: new mp.Vector3(442.406982421875, -982.6343994140625, 30.689603805541992) }
];

modelChanges.forEach(({ event, fraction, heading, teleport }) => {
    mp.events.add(event, (player) => handlePlayerModelChange(player, fraction, heading, teleport));
});

/** Вход в мир с моделью фракции. targetPos=null — спауn на базе фракции, иначе на точку. skipPosition — без перемещения. */
global.applyFactionEnterWorldSpawn = function (player, fractionNum, targetPos, extraOpts) {
    try {
        if (!mp.players.exists(player)) return;
        const fr = String(parseInt(fractionNum, 10) || 0);
        const entry = modelChanges.find((m) => m.fraction === fr);
        if (!entry) return;
        const opts = extraOpts && typeof extraOpts === 'object' ? extraOpts : {};
        let pos = targetPos;
        if (pos && typeof pos === 'object' && pos.skipPosition === true) {
            opts.skipPosition = true;
            pos = null;
        }
        handlePlayerModelChange(player, entry.fraction, entry.heading, entry.teleport, {
            targetPos: pos || null,
            skipPosition: opts.skipPosition === true
        });
    } catch (error) {
        console.log(error);
    }
};

/** Координаты спауна фракций для выбора точки появления */
global.FRACTION_SPAWN_BY_ID = {};
modelChanges.forEach(({ fraction, heading, teleport }) => {
    global.FRACTION_SPAWN_BY_ID[parseInt(fraction, 10)] = {
        x: teleport.x,
        y: teleport.y,
        z: teleport.z,
        h: heading
    };
});

mp.events.add('fixHud', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        player.call('showHud:CLIENT', [player.id, player.static]);
        if (typeof global.pushHudClockToPlayer === 'function') global.pushHudClockToPlayer(player);
        const _m = Number(player.money);
        if (!Number.isNaN(_m)) {
            player.call('updateMoney', [global.formatnum1(_m)]);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player || player.static == null) return;
        if (
            !!player._clothesShopSession ||
            player.getVariable('shopc') === true ||
            player.getVariable('tabletTryOn') === true
        ) {
            if (typeof global.reapplyPlayerClothesAfterShopClose === 'function') {
                global.reapplyPlayerClothesAfterShopClose(player);
            }
            return;
        }
        if (typeof global.persistPlayerClothesRow === 'function') {
            global.persistPlayerClothesRow(player, () => {});
        }
    } catch (_e) {}
});