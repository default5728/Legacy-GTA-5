'use strict';

const path = require('path');
const hairCfg = require(path.join(__dirname, '../../client_packages/shared/hair_styles.js'));

/**
 * Создание персонажа (внешность) — head-blend из redage v3 / GTA5RP editor.
 * Freemode gender is retained for migrated Kepler characters.
 * Показывается один раз при регистрации; правки внешности (брови/борода/глаза/цвет волос)
 * также делает парикмахерская через global.updateCharAppearanceField.
 *
 * Хранение: accounts.appearance_json — ЧАСТИЧНЫЙ объект (только реально заданные поля),
 * accounts.char_created (0/1). Применяется только то, что присутствует в JSON,
 * поэтому старые аккаунты, поправившие лишь брови, не получают дефолтную причёску/цвет.
 */

const MALE_FREE_MODE_HASH = mp.joaat('mp_m_freemode_01');
const FEMALE_FREE_MODE_HASH = mp.joaat('mp_f_freemode_01');

function resolveIsMale(data) {
    return !data || data.isMale !== false;
}

function resolveFreemodeHash(data, player) {
    if (data && typeof data.isMale === 'boolean') return data.isMale ? MALE_FREE_MODE_HASH : FEMALE_FREE_MODE_HASH;
    return player && player.model === FEMALE_FREE_MODE_HASH ? FEMALE_FREE_MODE_HASH : MALE_FREE_MODE_HASH;
}

/** Клиент hat_hair читает canonicalHair, если на педе ещё 0:0 (гонка после spawn). */
global.syncPlayerCanonicalHair = function (player, drawable, texture) {
    try {
        if (!mp.players.exists(player)) return;
        const d = hairCfg.normalizeHairDrawable(drawable);
        const t = hairCfg.normalizeHairTexture(texture);
        if (d <= 0) {
            player.setVariable('canonicalHair', null);
            return;
        }
        player.setVariable('canonicalHair', `${d}:${t}`);
    } catch (_e) {}
};

function clearHairReplayTimers(player) {
    if (!player || !Array.isArray(player._hairReplayTimers)) return;
    for (let i = 0; i < player._hairReplayTimers.length; i++) {
        try { clearTimeout(player._hairReplayTimers[i]); } catch (_e) {}
    }
    player._hairReplayTimers = [];
}

global.replayHairSyncForDelayedSpawn = function (player, drawable, texture) {
    if (!mp.players.exists(player)) return;
    const d = hairCfg.normalizeHairDrawable(drawable);
    if (!hairCfg.isDlcHairDrawable(d)) return;
    const t = hairCfg.normalizeHairTexture(texture);

    clearHairReplayTimers(player);
    const gen = (player._hairReplayGen = (player._hairReplayGen || 0) + 1);

    // В барбере (приватный dim) и при частой смене — без delayed spam
    const inBarberPreview = player.dimension !== 0;
    if (inBarberPreview) {
        try { player.call('sc:syncClothesLocal', [2, d, t]); } catch (_e) {}
        return;
    }

    const delays = [0, 600, 1800, 3500];
    const fire = () => {
        try {
            if (!mp.players.exists(player)) return;
            if (player._hairReplayGen !== gen) return;
            player.call('sc:syncClothesLocal', [2, d, t]);
        } catch (_e) {}
    };

    player._hairReplayTimers = [];
    for (let i = 0; i < delays.length; i++) {
        const delay = delays[i];
        if (delay <= 0) fire();
        else player._hairReplayTimers.push(setTimeout(fire, delay));
    }
};

global.applyPlayerHairClothes = function (player, drawable, texture) {
    if (!mp.players.exists(player)) return;
    const d = hairCfg.normalizeHairDrawable(drawable);
    const t = hairCfg.normalizeHairTexture(texture);
    if (d <= 0) {
        clearHairReplayTimers(player);
        player._hairReplayGen = (player._hairReplayGen || 0) + 1;
        player.setClothes(2, 0, 0, 0);
        global.syncPlayerCanonicalHair(player, 0, 0);
        return;
    }
    player.setClothes(2, d, t, 0);
    global.syncPlayerCanonicalHair(player, d, t);
    global.replayHairSyncForDelayedSpawn(player, d, t);
};

/* ---------- Колонки в БД ---------- */

function ensureCharColumns() {
    if (!global.DB) {
        setTimeout(ensureCharColumns, 1500);
        return;
    }
    const alters = [
        'ALTER TABLE accounts ADD COLUMN appearance_json MEDIUMTEXT NULL DEFAULT NULL',
        'ALTER TABLE accounts ADD COLUMN char_created TINYINT NOT NULL DEFAULT 0'
    ];
    alters.forEach((sql) => {
        global.DB.query(sql, [], (err) => {
            if (!err) return;
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[charcreator] ALTER:', err.code || err.message);
        });
    });
}

mp.events.add('packagesLoaded', () => {
    setTimeout(ensureCharColumns, 4400);
});

/* ---------- Валидация ---------- */

const num = (v) => (typeof v === 'string' ? Number(v) : v);
const clampF = (v, min, max) => {
    const n = num(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(min, Math.min(max, n));
};
const clampI = (v, min, max) => {
    let n = parseInt(v, 10);
    if (!Number.isFinite(n)) return null;
    return Math.max(min, Math.min(max, n));
};

/** Полная внешность из редактора создания (все поля обязательны). */
function normalizeFull(raw) {
    let data = raw;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_e) { return null; }
    }
    if (!data || typeof data !== 'object') return null;

    const features = [];
    const sf = Array.isArray(data.features) ? data.features : [];
    for (let i = 0; i < 20; i++) {
        const v = clampF(sf[i], -1, 1);
        features.push(v == null ? 0 : v);
    }
    const hair = data.hair && typeof data.hair === 'object' ? data.hair : {};
    const eb = data.eyebrows && typeof data.eyebrows === 'object' ? data.eyebrows : {};
    const bd = data.beard && typeof data.beard === 'object' ? data.beard : {};

    const beardStyle = clampI(bd.style, 0, 255);

    const overlayVal = (v, max) => {
        const n = parseInt(v, 10);
        if (!Number.isFinite(n) || n === 255) return null;
        return clampI(n, 0, max);
    };

    let skinOverlays = null;
    if (data.skinOverlays && typeof data.skinOverlays === 'object') {
        const so = data.skinOverlays;
        const next = {};
        const b = overlayVal(so.blemish, 23);
        const a = overlayVal(so.aging, 14);
        const c = overlayVal(so.complexion, 11);
        const f = overlayVal(so.freckles, 17);
        if (b != null) next.blemish = b;
        if (a != null) next.aging = a;
        if (c != null) next.complexion = c;
        if (f != null) next.freckles = f;
        if (Object.keys(next).length) skinOverlays = next;
    }

    return {
        isMale: resolveIsMale(data),
        father: clampI(data.father, 0, 45) ?? 0,
        mother: clampI(data.mother, 0, 45) ?? 21,
        similarity: clampF(data.similarity, 0, 1) ?? 0.5,
        skin: clampF(data.skin, 0, 1) ?? 0.5,
        features,
        hair: {
            style: hairCfg.normalizeHairDrawable(hair.style),
            color: clampI(hair.color, 0, 63) ?? 0,
            highlight: clampI(hair.highlight, 0, 63) ?? 0
        },
        eyebrows: {
            style: clampI(eb.style, 0, 33) ?? 0,
            color: clampI(eb.color, 0, 63) ?? 0,
            opacity: clampF(eb.opacity, 0, 1) ?? 1.0
        },
        beard: {
            style: beardStyle == null ? 255 : beardStyle,
            color: clampI(bd.color, 0, 63) ?? 0,
            opacity: clampF(bd.opacity, 0, 1) ?? 1.0
        },
        eyeColor: clampI(data.eyeColor, 0, 31) ?? 0,
        skinOverlays
    };
}

/* ---------- Применение к игроку ----------
 * ВАЖНО: на сервере НЕТ setHeadBlend. Голову/кожу/черты лица ставит setCustomization
 * (синхронизируется всем игрокам). Брови/борода — setHeadOverlay(id, [index, opacity, c1, c2]).
 * Причёска (drawable) — setClothes(2, drawable, texture, 0). Цвет волос — setHairColor.
 */

function buildFeatures(p) {
    const out = new Array(20).fill(0.0);
    if (Array.isArray(p.features)) {
        for (let i = 0; i < 20; i++) {
            const v = clampF(p.features[i], -1, 1);
            if (v != null) out[i] = v;
        }
    }
    return out;
}

function hasFullBlend(p) {
    return p && p.father != null && p.mother != null && p.similarity != null && p.skin != null;
}

function applySkinOverlay(player, slot, val, max) {
    if (val == null || val === 255) {
        player.setHeadOverlay(slot, [0, 0.0, 0, 0]);
        return;
    }
    const idx = clampI(val, 0, max);
    player.setHeadOverlay(slot, [idx == null ? 0 : idx, 1.0, 0, 0]);
}

function applyOverlays(player, p) {
    const so = p.skinOverlays && typeof p.skinOverlays === 'object' ? p.skinOverlays : null;
    applySkinOverlay(player, 0, so && so.blemish != null ? so.blemish : 255, 23);
    applySkinOverlay(player, 3, so && so.aging != null ? so.aging : 255, 14);
    applySkinOverlay(player, 7, so && so.complexion != null ? so.complexion : 255, 11);
    applySkinOverlay(player, 9, so && so.freckles != null ? so.freckles : 255, 17);
    if (p.eyebrows && typeof p.eyebrows === 'object' && p.eyebrows.style != null) {
        const op = p.eyebrows.opacity != null ? clampF(p.eyebrows.opacity, 0, 1) : 1.0;
        const c = p.eyebrows.color != null ? clampI(p.eyebrows.color, 0, 63) : 0;
        player.setHeadOverlay(2, [clampI(p.eyebrows.style, 0, 33), op, c, c]);
    }
    if (p.beard && typeof p.beard === 'object' && p.beard.style != null && resolveIsMale(p)) {
        const style = clampI(p.beard.style, 0, 255);
        const op = style === 255 ? 0.0 : (p.beard.opacity != null ? clampF(p.beard.opacity, 0, 1) : 1.0);
        const c = p.beard.color != null ? clampI(p.beard.color, 0, 63) : 0;
        player.setHeadOverlay(1, [style, op, c, c]);
    } else {
        player.setHeadOverlay(1, [0, 0.0, 0, 0]);
    }
}

function scheduleVestAfterAppearance(player) {
    if (!mp.players.exists(player) || player.getVariable('armor') !== true) return;
    if (typeof global.scheduleGameplayArmorVestVisual === 'function') {
        global.scheduleGameplayArmorVestVisual(player, [80, 350, 800, 1400]);
    } else if (typeof global.applyGameplayArmorVestVisual === 'function') {
        setTimeout(() => {
            try {
                if (mp.players.exists(player) && player.getVariable('armor') === true) {
                    global.applyGameplayArmorVestVisual(player);
                }
            } catch (_e) {}
        }, 120);
    }
}

/** Полное применение (есть head-blend) через setCustomization — синхронно всем. */
function applyFull(player, p) {
    try {
        if (!mp.players.exists(player)) return;
        const model = resolveFreemodeHash(p, player);
        if (player.model !== model) player.model = model;

        const father = clampI(p.father, 0, 45) ?? 0;
        const mother = clampI(p.mother, 0, 45) ?? 21;
        const shapeMix = clampF(p.similarity, 0, 1) ?? 0.5;
        const skinMix = clampF(p.skin, 0, 1) ?? 0.5;
        const eyeColor = p.eyeColor != null ? clampI(p.eyeColor, 0, 31) : 0;
        const hairColor = p.hair && p.hair.color != null ? clampI(p.hair.color, 0, 63) : 0;
        const hl = p.hair && p.hair.highlight != null ? clampI(p.hair.highlight, 0, 63) : hairColor;
        const feats = buildFeatures(p);

        /* RAGE MP: shapeFirst/skinFirst = mother, shapeSecond/skinSecond = father. */
        player.setCustomization(
            resolveIsMale(p),
            mother, father, 0,
            mother, father, 0,
            shapeMix, skinMix, 0,
            eyeColor, hairColor, hl,
            feats
        );

        if (p.hair && p.hair.style != null) {
            const hairDrawable = hairCfg.normalizeHairDrawable(p.hair.style);
            global.applyPlayerHairClothes(player, hairDrawable, 0);
            try { player.setHairColor(hairColor, hl); } catch (_hc) {}
        }
        applyOverlays(player, p);
        scheduleVestAfterAppearance(player);
    } catch (e) {
        console.log('[charcreator] applyFull:', e.message || e);
    }
}

/** Частичное применение (без head-blend): только то, что можно ставить отдельно и что синхронизируется. */
function applyPartialPieces(player, p) {
    try {
        if (!mp.players.exists(player) || !p || typeof p !== 'object') return;
        const model = resolveFreemodeHash(p, player);
        if (player.model !== model) player.model = model;

        if (p.hair && typeof p.hair === 'object') {
            if (p.hair.style != null) {
                global.applyPlayerHairClothes(player, p.hair.style, 0);
            }
            if (p.hair.color != null) {
                const c = clampI(p.hair.color, 0, 63);
                const hl = p.hair.highlight != null ? clampI(p.hair.highlight, 0, 63) : c;
                player.setHairColor(c, hl);
            }
        }
        applyOverlays(player, p);
        scheduleVestAfterAppearance(player);
        /* Цвет глаз без head-blend на сервере отдельно не ставится (нет setEyeColor) — пропускаем. */
    } catch (e) {
        console.log('[charcreator] applyPartialPieces:', e.message || e);
    }
}

/** Применить объект внешности: полный — через setCustomization, иначе — частями. */
function applyAppearancePartial(player, p) {
    if (!p || typeof p !== 'object') return;
    if (hasFullBlend(p)) applyFull(player, p);
    else applyPartialPieces(player, p);
}

/** Полное применение (создание персонажа). */
function applyCharAppearance(player, appearance) {
    const full = normalizeFull(appearance);
    if (!full) return;
    applyFull(player, full);
    player.appearanceData = full;
}

global.applyCharAppearance = applyCharAppearance;
global.applyAppearancePartial = applyAppearancePartial;

/** Загрузить внешность из БД и применить (вход). */
function hydrateCharAppearanceFromDb(player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('charCreating') === true) return;
        const staticId = player.static;
        if (staticId == null) return;
        global.DB.query(
            'SELECT appearance_json FROM accounts WHERE static = ? LIMIT 1',
            [staticId],
            (err, rows) => {
                if (err || !rows || !rows.length) return;
                if (!mp.players.exists(player)) return;
                const raw = rows[0].appearance_json;
                if (typeof raw !== 'string' || !raw.trim().length) return;
                let obj;
                try { obj = JSON.parse(raw); } catch (_e) { return; }
                if (obj && typeof obj === 'object') {
                    if (typeof obj.isMale !== 'boolean') obj.isMale = player.model !== FEMALE_FREE_MODE_HASH;
                }
                player.appearanceData = obj;
                applyAppearancePartial(player, obj);
            }
        );
    } catch (e) {
        console.log('[charcreator] hydrate:', e.message || e);
    }
}

global.hydrateCharAppearanceFromDb = hydrateCharAppearanceFromDb;

/**
 * setCustomization сбрасывает props — вернуть шапку/очки/аксессуары из кэша clothes.
 * Без этого у женского freemode снова появляются очки (drawable 0) и фантомная шапка.
 */
function restoreAccessoryPropsAfterAppearance(player) {
    try {
        if (!mp.players.exists(player)) return;
        const row = player._clothesRowCache;
        if (row && typeof row === 'object' && Object.keys(row).length > 0) {
            if (typeof global.applyClothesAccessoryPropsFromRow === 'function') {
                global.applyClothesAccessoryPropsFromRow(player, row);
            }
            /** setCustomization всегда кидает дефолтные props — если в кэше нет колонки, слот пустой. */
            if (!Object.prototype.hasOwnProperty.call(row, 'glasses')) {
                if (typeof global.clearFreemodeGlassesSlot === 'function') global.clearFreemodeGlassesSlot(player);
            }
            if (!Object.prototype.hasOwnProperty.call(row, 'headwear')) {
                if (typeof global.clearFreemodeHeadwearSlot === 'function') global.clearFreemodeHeadwearSlot(player);
            }
            return;
        }
        if (typeof global.clearCreatorAccessorySlots === 'function') {
            global.clearCreatorAccessorySlots(player);
        }
    } catch (_e) {}
}

/** После clothes из БД — вернуть причёску/оверлеи из appearance_json (setCustomization сбрасывает slot 2). */
global.reapplyPlayerAppearanceAfterClothes = function (player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.appearanceData && typeof global.applyAppearancePartial === 'function') {
            global.applyAppearancePartial(player, player.appearanceData);
            restoreAccessoryPropsAfterAppearance(player);
            return;
        }
        if (typeof global.hydrateCharAppearanceFromDb === 'function') {
            global.hydrateCharAppearanceFromDb(player);
            restoreAccessoryPropsAfterAppearance(player);
        }
    } catch (e) {
        console.log('[charcreator] reapplyAfterClothes:', e.message || e);
    }
};

/* ---------- Частичное обновление (парикмахерская) ---------- */

function deepMerge(base, patch) {
    const out = base && typeof base === 'object' ? Object.assign({}, base) : {};
    Object.keys(patch || {}).forEach((k) => {
        const pv = patch[k];
        if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
            out[k] = deepMerge(out[k], pv);
        } else {
            out[k] = pv;
        }
    });
    return out;
}

/** Слить patch, сразу применить на игроке, затем сохранить в БД. cb(err). */
function updateCharAppearanceField(player, patch, cb) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) {
            if (cb) cb(new Error('no-player'));
            return;
        }
        const staticId = player.static;
        if (staticId == null) {
            if (cb) cb(new Error('no-static'));
            return;
        }

        const applyMerged = (merged) => {
            if (!mp.players.exists(player)) return;
            player.appearanceData = merged;
            if (hasFullBlend(merged)) applyFull(player, merged);
            else applyPartialPieces(player, patch);
        };

        /* Сразу применяем из памяти — цвет/брови видны без ожидания БД. */
        const quickMerged = deepMerge(
            (player.appearanceData && typeof player.appearanceData === 'object') ? player.appearanceData : {},
            patch
        );
        applyMerged(quickMerged);

        global.DB.query(
            'SELECT appearance_json FROM accounts WHERE static = ? LIMIT 1',
            [staticId],
            (err, rows) => {
                let curDb = {};
                if (!err && rows && rows.length && typeof rows[0].appearance_json === 'string') {
                    try { curDb = JSON.parse(rows[0].appearance_json) || {}; } catch (_e) { curDb = {}; }
                }
                const merged = deepMerge(curDb, patch);
                const json = JSON.stringify(merged);
                global.DB.query(
                    'UPDATE accounts SET appearance_json = ? WHERE static = ? LIMIT 1',
                    [json, staticId],
                    (e2) => {
                        if (e2) console.log('[charcreator] field UPDATE:', e2.code || e2.message);
                        if (mp.players.exists(player)) applyMerged(merged);
                        if (cb) cb(e2 || null);
                    }
                );
            }
        );
    } catch (e) {
        console.log('[charcreator] updateField:', e.message || e);
        if (cb) cb(e);
    }
}

global.updateCharAppearanceField = updateCharAppearanceField;

/* ---------- Дефолт редактора (сброс после выхода без сохранения) ---------- */

function getDefaultCreatorAppearance() {
    return {
        isMale: true,
        father: 0,
        mother: 21,
        similarity: 0.5,
        skin: 0.5,
        features: new Array(20).fill(0),
        hair: { style: 0, color: 0, highlight: 0 },
        eyebrows: { style: 0, color: 0, opacity: 1.0 },
        beard: { style: 255, color: 0, opacity: 0.0 },
        eyeColor: 0,
        skinOverlays: null
    };
}

global.getDefaultCreatorAppearance = getDefaultCreatorAppearance;

function applyCreatorNakedClothes(player) {
    try {
        if (!mp.players.exists(player)) return;
        player.setClothes(1, 0, 0, 0);
        player.setClothes(11, 15, 0, 0);
        player.setClothes(8, 15, 0, 0);
        player.setClothes(3, 15, 0, 0);
        player.setClothes(4, 14, 0, 0);
        player.setClothes(6, 34, 0, 0);
        player.setClothes(5, 0, 0, 0);
        player.setClothes(7, 0, 0, 0);
        player.setClothes(9, 0, 0, 0);
        player.setClothes(10, 0, 0, 0);
        if (typeof global.clearCreatorAccessorySlots === 'function') {
            global.clearCreatorAccessorySlots(player);
        }
        try {
            player.call('sc:syncClothesLocal', [3, 15, 0]);
            player.call('sc:syncClothesLocal', [4, 14, 0]);
            player.call('sc:syncClothesLocal', [6, 34, 0]);
            player.call('sc:syncClothesLocal', [8, 15, 0]);
            player.call('sc:syncClothesLocal', [11, 15, 0]);
        } catch (_sync) {}
    } catch (e) {
        console.log('[charcreator] applyCreatorNakedClothes:', e.message || e);
    }
}

global.applyCreatorNakedClothes = applyCreatorNakedClothes;

function clearIncompleteCharCreatorDb(staticId, cb) {
    if (staticId == null || !global.DB) {
        if (cb) cb();
        return;
    }
    global.DB.query(
        'UPDATE accounts SET appearance_json = NULL WHERE static = ? AND (char_created IS NULL OR char_created = 0) LIMIT 1',
        [staticId],
        () => { if (cb) cb(); }
    );
}

function resetPlayerForCharCreator(player) {
    try {
        if (!mp.players.exists(player)) return;
        const defaults = getDefaultCreatorAppearance();
        player.appearanceData = defaults;
        player.model = MALE_FREE_MODE_HASH;
        applyFull(player, defaults);
        applyCreatorNakedClothes(player);
        clearIncompleteCharCreatorDb(player.static);
        try {
            player.call('charCreator:resetClient', [JSON.stringify(defaults)]);
        } catch (_c) {}
    } catch (e) {
        console.log('[charcreator] resetPlayerForCharCreator:', e.message || e);
    }
}

global.resetPlayerForCharCreator = resetPlayerForCharCreator;

/* ---------- Открыть редактор при регистрации ---------- */

function openCharCreatorForPlayer(player) {
    try {
        if (!mp.players.exists(player)) return;
        try { player.call('server:clearChat'); } catch (_cl) {}
        resetPlayerForCharCreator(player);
        player.setVariable('charCreating', true);
        player.call('charCreator:begin');
    } catch (e) {
        console.log('[charcreator] open:', e.message || e);
    }
}

global.openCharCreatorForPlayer = openCharCreatorForPlayer;

/* ---------- Смена внешности в процессе игры (EMS NPC) ---------- */

/**
 * Открыть полный редактор создания персонажа у уже играющего игрока.
 * Платеж (если задан player._appearanceEditPay) списывается при сохранении;
 * при отмене (charCreator:cancel:s) — без списания.
 */
global.openAppearanceEditorForPlayer = function (player) {
    try {
        if (!mp.players.exists(player)) return;
        if (!player.getVariable('auth')) return;
        if (player.getVariable('charCreating') === true) return;

        player._appearanceEdit = true;
        /* Приватный дименшен, чтобы в редакторе не было видно других игроков (и они не видели нас). */
        player._appearanceEditPrev = {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z,
            heading: player.heading,
            dimension: player.dimension
        };
        player.dimension = 100000 + (parseInt(player.id, 10) || 0);

        resetPlayerForCharCreator(player);
        player.setVariable('charCreating', true);
        player.call('charCreator:begin', [true]);
    } catch (e) {
        console.log('[charcreator] openEdit:', e.message || e);
    }
};

function restoreAppearanceEditState(player) {
    if (!mp.players.exists(player)) return;
    const prev = player._appearanceEditPrev;
    if (prev && typeof prev === 'object') {
        try {
            player.position = new mp.Vector3(prev.x, prev.y, prev.z);
        } catch (_p) {}
        try { player.heading = prev.heading; } catch (_h) {}
        try { player.dimension = prev.dimension; } catch (_d) {}
    }
}

/** Отмена смены внешности: восстановить внешность/одежду из БД, не списывая платёж. */
mp.events.add('charCreator:cancel:s', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('charCreating') !== true) return;
        if (player._appearanceEdit !== true) return;

        player._appearanceEdit = false;
        player._appearanceEditPay = null;
        player.setVariable('charCreating', false);
        restoreAppearanceEditState(player);
        player._appearanceEditPrev = null;

        if (typeof global.hydrateCharAppearanceFromDb === 'function') {
            global.hydrateCharAppearanceFromDb(player);
        }
        try { player.call('charCreator:finish'); } catch (_c1) {}
        if (typeof global.hydratePlayerClothesFromDb === 'function') {
            global.hydratePlayerClothesFromDb(player);
        }
    } catch (e) {
        console.log('[charcreator] cancelEdit:', e.message || e);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player || player.getVariable('charCreating') !== true) return;
        clearIncompleteCharCreatorDb(player.static);
    } catch (_e) {}
});

/* ---------- Сохранение из редактора ---------- */

mp.events.add('charCreator:save:s', (player, payload) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('charCreating') !== true) return;

        let rawPayload = payload;
        if (typeof rawPayload === 'string') {
            try { rawPayload = JSON.parse(rawPayload); } catch (_e) { rawPayload = null; }
        }
        const clothesOutfit = rawPayload && rawPayload.clothes ? rawPayload.clothes : null;

        const a = normalizeFull(rawPayload);
        if (!a) {
            try { player.call('charCreator:saveFailed', ['Ошибка данных внешности.']); } catch (_sf) {}
            return isNotify(player, 2, 'top-mid', 'Ошибка данных внешности.', 3000);
        }
        a.isMale = resolveIsMale(rawPayload);

        const isEdit = player._appearanceEdit === true;

        applyFull(player, a);
        player.appearanceData = a;

        if (typeof global.clearCreatorAccessorySlots === 'function') {
            global.clearCreatorAccessorySlots(player);
        }
        if (!isEdit && clothesOutfit && typeof global.applyCreatorRegistrationClothes === 'function') {
            global.applyCreatorRegistrationClothes(player, clothesOutfit);
        }

        const json = JSON.stringify(a);
        const staticId = player.static;

        const refreshAfterSpawn = () => {
            if (!mp.players.exists(player)) return;
            if (player._charCreatorPostRefreshDone) return;
            player._charCreatorPostRefreshDone = true;
            player._inventoryReady = true;
            if (typeof global.stripRegistrationOutfitFromInventory === 'function') {
                global.stripRegistrationOutfitFromInventory(player);
            }
            if (typeof global.stripEquippedTopBottomFromInventory === 'function') {
                global.stripEquippedTopBottomFromInventory(player);
            }
            if (typeof global.hydratePlayerClothesFromDb === 'function') {
                global.hydratePlayerClothesFromDb(player);
            } else if (typeof global.sendLoadInventoryClient === 'function') {
                global.sendLoadInventoryClient(player);
            }
        };

        const finishCharCreatorFlow = () => {
            if (!mp.players.exists(player)) return;
            try { player.call('charCreator:applyClient', [json]); } catch (_c1) {}
            player.setVariable('charCreating', false);
            player.call('charCreator:finish');
            if (typeof global.enterPlayAfterLogin === 'function') {
                const row = {
                    fraction: parseInt(player.getVariable('fraction'), 10) || 0,
                    last_x: null,
                    last_y: null,
                    last_z: null,
                    last_pos_dim: 0,
                    char_created: 1
                };
                global.enterPlayAfterLogin(player, row);
            } else {
                player.call('hideLogin');
            }
            setImmediate(refreshAfterSpawn);
            if (typeof global.reapplyPlayerAppearanceAfterClothes === 'function') {
                global.reapplyPlayerAppearanceAfterClothes(player);
                setTimeout(() => {
                    if (!mp.players.exists(player)) return;
                    global.reapplyPlayerAppearanceAfterClothes(player);
                }, 400);
            }
            setTimeout(() => {
                if (!mp.players.exists(player)) return;
                if (typeof global.tryDeliverLoginWelcomeChat === 'function') {
                    global.tryDeliverLoginWelcomeChat(player);
                }
            }, 1500);
        };

        const persistClothesDb = (shouldSeedStarterClothes) => {
            if (!mp.players.exists(player) || shouldSeedStarterClothes !== true) return;
            const afterSeed = () => {
                if (!mp.players.exists(player)) return;
                if (clothesOutfit && typeof global.applyCreatorRegistrationClothes === 'function') {
                    global.applyCreatorRegistrationClothes(player, clothesOutfit);
                }
                setImmediate(refreshAfterSpawn);
            };
            if (clothesOutfit && typeof global.seedCreatorRegistrationClothesDb === 'function') {
                global.seedCreatorRegistrationClothesDb(player, clothesOutfit, afterSeed);
                return;
            }
            if (typeof global.seedStarterRegistrationClothesDb === 'function') {
                global.seedStarterRegistrationClothesDb(player, afterSeed);
            }
        };

        const afterAppearanceSaved = (shouldSeedStarterClothes) => {
            persistClothesDb(shouldSeedStarterClothes);
        };

        const notifySaveFailed = (message) => {
            try { player.call('charCreator:saveFailed', [message || 'Ошибка сохранения.']); } catch (_sf) {}
            isNotify(player, 2, 'top-mid', message || 'Ошибка сохранения.', 3000);
        };

        /* ---------- Смена внешности в процессе игры: сохранить внешность, списать платёж ---------- */
        if (isEdit) {
            const finishEdit = () => {
                if (!mp.players.exists(player)) return;
                player._appearanceEdit = false;
                player._appearanceEditPay = null;
                player.setVariable('charCreating', false);
                restoreAppearanceEditState(player);
                player._appearanceEditPrev = null;
                try { player.call('charCreator:applyClient', [json]); } catch (_c1) {}
                try { player.call('charCreator:finish'); } catch (_c2) {}

                const rehydrate = () => {
                    if (!mp.players.exists(player)) return;
                    if (typeof global.hydratePlayerClothesFromDb === 'function') {
                        global.hydratePlayerClothesFromDb(player);
                    }
                    if (typeof global.reapplyPlayerAppearanceAfterClothes === 'function') {
                        global.reapplyPlayerAppearanceAfterClothes(player);
                        setTimeout(() => {
                            try {
                                if (mp.players.exists(player)) global.reapplyPlayerAppearanceAfterClothes(player);
                            } catch (_eA) {}
                        }, 350);
                    }
                };

                rehydrate();
                isNotify(player, 3, 'top-mid', 'Внешность обновлена.', 3000);
                try { player.call('sound:client', [3]); } catch (_s) {}
            };

            const cancelEditNoPay = (message) => {
                if (!mp.players.exists(player)) return;
                player._appearanceEdit = false;
                player._appearanceEditPay = null;
                player.setVariable('charCreating', false);
                restoreAppearanceEditState(player);
                player._appearanceEditPrev = null;
                try { player.call('charCreator:finish'); } catch (_c) {}
                if (typeof global.hydrateCharAppearanceFromDb === 'function') {
                    global.hydrateCharAppearanceFromDb(player);
                }
                isNotify(player, 2, 'top-mid', message || 'Недостаточно средств.', 3000);
            };

            const chargeAndFinish = () => {
                const pay = player._appearanceEditPay;
                if (!pay || !pay.method) { finishEdit(); return; }
                const charge = (spend) => {
                    try {
                        spend(player, pay.cost, (err, ok) => {
                            if (err || !ok) {
                                console.log('[charcreator] edit pay fail:', err && (err.message || err));
                                cancelEditNoPay('Недостаточно средств.');
                                return;
                            }
                            finishEdit();
                        });
                    } catch (_eP) {
                        cancelEditNoPay('Ошибка оплаты.');
                    }
                };
                if (pay.method === 'dp' && typeof global.economySpendDp === 'function') charge(global.economySpendDp);
                else if (pay.method === 'money' && typeof global.economySpendMoney === 'function') charge(global.economySpendMoney);
                else finishEdit();
            };

            if (staticId == null) {
                chargeAndFinish();
                return;
            }
            global.DB.query(
                'UPDATE accounts SET appearance_json = ? WHERE static = ? LIMIT 1',
                [json, staticId],
                (errUp) => {
                    if (errUp) {
                        console.log('[charcreator] edit save UPDATE:', errUp.code || errUp.message);
                        notifySaveFailed('Не удалось сохранить внешность.');
                        return;
                    }
                    const fr = player.getVariable('fraction');
                    if (typeof global.updateOrInsertClothes === 'function') {
                        const hairVal = a.hair.style === 0 ? null : `${a.hair.style}:0`;
                        global.updateOrInsertClothes(staticId, fr, 'hair', hairVal, () => chargeAndFinish());
                        return;
                    }
                    chargeAndFinish();
                }
            );
            return;
        }

        if (staticId != null) {
            global.DB.query(
                'UPDATE accounts SET appearance_json = ?, char_created = 1 WHERE static = ? AND (char_created IS NULL OR char_created = 0) LIMIT 1',
                [json, staticId],
                (err, res) => {
                    if (err) {
                        console.log('[charcreator] save UPDATE:', err.code || err.message);
                        notifySaveFailed('Не удалось сохранить персонажа.');
                        return;
                    }
                    finishCharCreatorFlow();
                    const shouldSeedStarterClothes = res && Number(res.affectedRows) > 0;
                    if (!shouldSeedStarterClothes) {
                        global.DB.query(
                            'UPDATE accounts SET appearance_json = ? WHERE static = ? LIMIT 1',
                            [json, staticId],
                            (err2) => {
                                if (err2) {
                                    console.log('[charcreator] save appearance UPDATE:', err2.code || err2.message);
                                    notifySaveFailed('Не удалось сохранить внешность.');
                                }
                            }
                        );
                    }
                    const fr = player.getVariable('fraction');
                    if (typeof global.updateOrInsertClothes === 'function') {
                        const hairVal = a.hair.style === 0 ? null : `${a.hair.style}:0`;
                        global.updateOrInsertClothes(staticId, fr, 'hair', hairVal, () => {
                            afterAppearanceSaved(shouldSeedStarterClothes);
                        });
                        return;
                    }
                    afterAppearanceSaved(shouldSeedStarterClothes);
                }
            );
            return;
        }

        finishCharCreatorFlow();
        afterAppearanceSaved(false);
    } catch (e) {
        console.log('[charcreator] save:', e.message || e);
        try { player.call('charCreator:saveFailed', ['Ошибка сохранения.']); } catch (_sf) {}
    }
});
