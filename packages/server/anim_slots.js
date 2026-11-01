'use strict';

/** 5 слотов быстрых анимаций на аккаунт — accounts.anim_slots_json */

const ANIM_SLOT_COUNT = 5;
const ANIM_SLOTS_MAX_LEN = 12000;

function ensureAnimSlotsColumn() {
    if (!global.DB) {
        setTimeout(ensureAnimSlotsColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN anim_slots_json MEDIUMTEXT NULL DEFAULT NULL',
        [],
        (err) => {
            if (!err) return;
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[anim_slots] ALTER:', err.code || err.message);
        }
    );
}

mp.events.add('packagesLoaded', () => {
    setTimeout(ensureAnimSlotsColumn, 4500);
});

function getStaticId(player) {
    let staticId = player.static;
    if (staticId == null) staticId = player.getVariable('static');
    staticId = Number(staticId);
    return Number.isFinite(staticId) ? staticId : null;
}

function normalizeAnimEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const dict = typeof raw.animDictionary === 'string' ? raw.animDictionary.trim() : '';
    const name = typeof raw.animationName === 'string' ? raw.animationName.trim() : '';
    if (!dict || !name) return null;
    const flag = Number.isFinite(Number(raw.flag)) ? Number(raw.flag) : 49;
    const animName = typeof raw.animName === 'string' && raw.animName.length ? raw.animName : name;
    return { animName, animDictionary: dict, animationName: name, flag };
}

/** Массив из 5 элементов: объект анимации или null. */
function normalizeAnimSlotsJson(jsonStr) {
    let parsed;
    try {
        parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    } catch (_e) {
        parsed = [];
    }
    if (!Array.isArray(parsed)) parsed = [];
    const out = [];
    for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
        out.push(normalizeAnimEntry(parsed[i]));
    }
    const s = JSON.stringify(out);
    if (s.length > ANIM_SLOTS_MAX_LEN) return null;
    return s;
}

function emptySlotsJson() {
    return JSON.stringify(new Array(ANIM_SLOT_COUNT).fill(null));
}

function hydrateAnimSlotsForPlayer(player, rawFromDb) {
    try {
        if (!mp.players.exists(player)) return;
        const norm = normalizeAnimSlotsJson(
            typeof rawFromDb === 'string' && rawFromDb.trim().length ? rawFromDb : emptySlotsJson()
        ) || emptySlotsJson();
        player.anim_slots_json = norm;
        player.call('anim:slots:hydrate', [norm]);
    } catch (e) {
        console.log('[anim_slots] hydrate:', e.message || e);
    }
}

global.hydrateAnimSlotsForPlayer = hydrateAnimSlotsForPlayer;

function saveAnimSlotsToDb(player, jsonStr) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const staticId = getStaticId(player);
        if (staticId == null) return;

        const normalized = normalizeAnimSlotsJson(jsonStr);
        if (normalized == null) return;

        player.anim_slots_json = normalized;
        global.DB.query(
            'UPDATE accounts SET anim_slots_json = ? WHERE static = ? LIMIT 1',
            [normalized, staticId],
            (err) => {
                if (err) console.log('[anim_slots] UPDATE:', err.code || err.message);
                else if (mp.players.exists(player)) player.call('anim:slots:hydrate', [normalized]);
            }
        );
    } catch (e) {
        console.log('[anim_slots] save:', e.message || e);
    }
}

mp.events.add('anim:slots:save:s', (player, jsonStr) => {
    saveAnimSlotsToDb(player, jsonStr);
});

mp.events.add('anim:slots:request:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof player.anim_slots_json === 'string') {
            player.call('anim:slots:hydrate', [player.anim_slots_json]);
            return;
        }
        const staticId = getStaticId(player);
        if (staticId == null) return;
        global.DB.query(
            'SELECT anim_slots_json FROM accounts WHERE static = ? LIMIT 1',
            [staticId],
            (err, rows) => {
                if (!mp.players.exists(player)) return;
                let raw = null;
                if (!err && rows && rows.length) raw = rows[0].anim_slots_json;
                hydrateAnimSlotsForPlayer(player, raw);
            }
        );
    } catch (e) {
        console.log('[anim_slots] request:', e.message || e);
    }
});
