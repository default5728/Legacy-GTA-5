/**
 * fraction_system.js
 * Система лидерок фракций — Moon DM
 *
 * Таблицы БД:
 *   fractions(id, name, leader_static, ranks_json, stock_json, advert)
 *   accounts: +fraction_rank (0=нет,1-9=ранг,10=лидер)
 *   gangspoints(id, gangid)  — зоны гетто
 *
 * Фракции: 1=Ballas,2=Families,3=Bloods,4=Vagos,5=Marabunta,6=FIB
 */

'use strict';

const moment = require('moment-timezone');
const { FACTION_HQ } = require('./config/faction_hq.js');
const { getBizwarZoneSpawnPos, getBizwarZoneArenaMeta } = require('./config/bizwar_zone_positions.js');
const {
    validateCombatJoinLoadout,
    countStackBaseOnPlayer,
    makeCombatFastSlotGuard
} = require('./config/combat_loadout.js');
const {
    CALIBER_KEYS: BIZWAR_CALIBER_KEYS,
    CALIBER_TO_WEAPON_ITEMS: BIZWAR_CALIBERS,
    WEAPON_ITEM_TO_CALIBER: WEAPON_TO_CALIBER
} = require('./config/capt_bizwar_calibers.js');

// ─── константы ───────────────────────────────────────────────────────────────
const FACTION_NAMES = {
    1: 'Ballas',
    2: 'Families',
    3: 'Bloods',
    4: 'Vagos',
    5: 'Marabunta',
    6: 'FIB'
};

/** Цвета фракций (hex для CEF) */
const FACTION_COLORS = {
    0: '#555555',
    1: '#8b21c9',   // Ballas — фиолетовый
    2: '#16a34a',   // Families — зелёный
    3: '#dc2626',   // Bloods — красный
    4: '#ca8a04',   // Vagos — жёлтый
    5: '#0891b2',   // Marabunta — голубой
    6: '#e5e7eb'    // FIB — белый
};

/** GTA-цвет blip для каждой фракции (RAGE MP color index) */
const FACTION_BLIP_COLOR = {
    1: 27,   // фиолетовый
    2: 2,    // зелёный
    3: 6,    // красный
    4: 5,    // жёлтый
    5: 4,    // синий
    6: 0     // белый
};

/** Координаты складов */
const WAREHOUSE_POSITIONS = {
    1: { ...FACTION_HQ[1].warehouse, radius: 3.0 },
    2: { ...FACTION_HQ[2].warehouse, radius: 3.0 },
    3: { ...FACTION_HQ[3].warehouse, radius: 3.0 },
    4: { ...FACTION_HQ[4].warehouse, radius: 3.0 },
    5: { ...FACTION_HQ[5].warehouse, radius: 3.0 },
    6: { x: 451.5704345703125, y: -979.305908203125, z: 30.689611434936523, radius: 3.0, heading: 170.95504760742188 }
};

/** Телепорт на капт у HQ (цилиндр на клиенте только при активном капте) */
const BIZWAR_TP_POSITIONS = {
    1: FACTION_HQ[1].bizwarTp,
    2: FACTION_HQ[2].bizwarTp,
    3: FACTION_HQ[3].bizwarTp,
    4: FACTION_HQ[4].bizwarTp,
    5: FACTION_HQ[5].bizwarTp
};

/** Не-FIB фракции участвуют в каптах */
const BIZWAR_FRACTIONS = new Set([1, 2, 3, 4, 5]);

mp.events.add('fraction:v', (player, toggle) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        player.setVariable('fractionmenu', toggle === true || toggle === 1 || toggle === '1');
    } catch (_e) {}
});

/** Дефолтные ранги для новой фракции */
function defaultRanks() {
    return [
        { rank: 1, name: 'Рядовой',       changeRank: false, warehouseAccess: false, warehouseClosedAccess: false, warehouseToggle: false, bizwar: false, withdrawMoney: false, craftAccess: false, canInvite: false, canDismiss: false, canLogs: false },
        { rank: 2, name: 'Участник',       changeRank: false, warehouseAccess: false, warehouseClosedAccess: false, warehouseToggle: false, bizwar: true,  withdrawMoney: false, craftAccess: false, canInvite: false, canDismiss: false, canLogs: false },
        { rank: 3, name: 'Боец',           changeRank: false, warehouseAccess: false, warehouseClosedAccess: false, warehouseToggle: false, bizwar: true,  withdrawMoney: false, craftAccess: false, canInvite: false, canDismiss: false, canLogs: false },
        { rank: 4, name: 'Солдат',         changeRank: false, warehouseAccess: true,  warehouseClosedAccess: false, warehouseToggle: false, bizwar: true,  withdrawMoney: false, craftAccess: false, canInvite: false, canDismiss: false, canLogs: false },
        { rank: 5, name: 'Сержант',        changeRank: false, warehouseAccess: true,  warehouseClosedAccess: false, warehouseToggle: false, bizwar: true,  withdrawMoney: false, craftAccess: false, canInvite: false, canDismiss: false, canLogs: false },
        { rank: 6, name: 'Лейтенант',      changeRank: true,  warehouseAccess: true,  warehouseClosedAccess: false, warehouseToggle: false, bizwar: true,  withdrawMoney: false, craftAccess: false, canInvite: false, canDismiss: false, canLogs: false },
        { rank: 7, name: 'Капитан',        changeRank: true,  warehouseAccess: true,  warehouseClosedAccess: false, warehouseToggle: false, bizwar: true,  withdrawMoney: false, craftAccess: false, canInvite: false, canDismiss: false, canLogs: false },
        { rank: 8, name: 'Майор',          changeRank: true,  warehouseAccess: true,  warehouseClosedAccess: false, warehouseToggle: false, bizwar: true,  withdrawMoney: false, craftAccess: false, canInvite: false, canDismiss: false, canLogs: false },
        { rank: 9, name: 'Заместитель',    changeRank: true,  warehouseAccess: true,  warehouseClosedAccess: true,  warehouseToggle: true,  bizwar: true,  withdrawMoney: true,  craftAccess: true,  canInvite: true,  canDismiss: true,  canLogs: true  }
    ];
}

function normalizeFractionRanks(fractionId, incoming, previous) {
    const defaults = defaultRanks();
    const prev = Array.isArray(previous) ? previous : [];
    const inc = Array.isArray(incoming) ? incoming : [];
    const isBizwarFrac = BIZWAR_FRACTIONS.has(fractionId);
    const result = [];
    for (let i = 1; i <= 9; i++) {
        const def = defaults.find((r) => r.rank === i) || { rank: i, name: `Ранг ${i}` };
        const old = prev.find((r) => parseInt(r.rank, 10) === i) || {};
        const src = inc.find((r) => parseInt(r.rank, 10) === i) || {};
        result.push({
            rank: i,
            name: String(src.name || old.name || def.name || `Ранг ${i}`).trim().slice(0, 32) || `Ранг ${i}`,
            changeRank: src.changeRank != null ? !!src.changeRank : (old.changeRank != null ? !!old.changeRank : !!def.changeRank),
            warehouseAccess: src.warehouseAccess != null ? !!src.warehouseAccess : (old.warehouseAccess != null ? !!old.warehouseAccess : !!def.warehouseAccess),
            warehouseClosedAccess: src.warehouseClosedAccess != null ? !!src.warehouseClosedAccess : (old.warehouseClosedAccess != null ? !!old.warehouseClosedAccess : !!def.warehouseClosedAccess),
            warehouseToggle: src.warehouseToggle != null ? !!src.warehouseToggle : (old.warehouseToggle != null ? !!old.warehouseToggle : !!def.warehouseToggle),
            bizwar: isBizwarFrac
                ? (src.bizwar != null ? !!src.bizwar : (old.bizwar != null ? !!old.bizwar : !!def.bizwar))
                : false,
            withdrawMoney: src.withdrawMoney != null ? !!src.withdrawMoney : (old.withdrawMoney != null ? !!old.withdrawMoney : !!def.withdrawMoney),
            craftAccess: src.craftAccess != null ? !!src.craftAccess : (old.craftAccess != null ? !!old.craftAccess : !!def.craftAccess),
            canInvite: src.canInvite != null ? !!src.canInvite : (old.canInvite != null ? !!old.canInvite : !!def.canInvite),
            canDismiss: src.canDismiss != null ? !!src.canDismiss : (old.canDismiss != null ? !!old.canDismiss : !!def.canDismiss),
            canLogs: src.canLogs != null ? !!src.canLogs : (old.canLogs != null ? !!old.canLogs : !!def.canLogs)
        });
    }
    return result;
}

// ─── in-memory состояние ─────────────────────────────────────────────────────
/** global.fractionsData = { [id]: { id, name, leaderStatic, ranks[], stock[], advert } } */
global.fractionsData = {};

/** global.gangZones = { [zoneId]: ownerFractionId (0=нейтрально) } */
global.gangZones = {};

/** Складские colshapes { [fractionId]: mp.Colshape } */
const warehouseColshapes = {};

// ─── хелперы ─────────────────────────────────────────────────────────────────
function getFractionName(id) {
    if (global.fractionsData[id]) return global.fractionsData[id].name;
    return FACTION_NAMES[id] || `Фракция #${id}`;
}

function playerFractionId(player) {
    const f = player.getVariable('fraction');
    return f != null ? parseInt(f, 10) || 0 : 0;
}

function playerFractionRank(player) {
    return parseInt(player.fraction_rank, 10) || 0;
}

function isLeader(player) {
    if (playerFractionRank(player) === 10) return true;
    const fid = playerFractionId(player);
    const fraction = global.fractionsData && global.fractionsData[fid];
    return !!(fraction && sameStatic(fraction.leaderStatic, player.static));
}

function sameStatic(a, b) {
    if (a == null || b == null) return false;
    return String(a).trim() === String(b).trim();
}

function findOnlinePlayerByStatic(staticId) {
    let found = null;
    mp.players.forEach((p) => {
        if (!mp.players.exists(p)) return;
        if (sameStatic(p.static, staticId)) found = p;
    });
    return found;
}

/** Снять лидера фракции, если leaderStatic совпадает с static игрока. */
function clearFractionLeaderByStatic(fractionId, staticId) {
    if (!fractionId || fractionId < 1 || fractionId > 6) return;
    const fracData = global.fractionsData && global.fractionsData[fractionId];
    if (!fracData || !sameStatic(fracData.leaderStatic, staticId)) return;
    fracData.leaderStatic = null;
    saveFraction(fractionId, null);
}

/** Снять звание лидера у всех игроков фракции (онлайн + БД). */
function demoteFractionLeaders(fractionId, cb) {
    let onlineDemoted = 0;
    mp.players.forEach((p) => {
        if (!p || !mp.players.exists(p)) return;
        if (playerFractionId(p) !== fractionId) return;
        if (playerFractionRank(p) !== 10) return;
        savePlayerFractionRank(p, 9);
        onlineDemoted++;
        try { p.call('fraction:rank:updated', [9, 'Заместитель']); } catch (_) {}
        try { isNotify(p, 2, 'top-mid', 'Вы сняты с поста лидера фракции.', 5000); } catch (_) {}
    });
    global.DB.query(
        'UPDATE accounts SET fraction_rank=9 WHERE fraction=? AND fraction_rank=10',
        [fractionId],
        (err, result) => {
            if (err) console.log('[FRACTIONS] demoteFractionLeaders DB:', err.message || err);
            const dbAffected = result && result.affectedRows != null ? Number(result.affectedRows) : 0;
            if (cb) cb(err, onlineDemoted, dbAffected);
        }
    );
}

/** Получить данные фракции игрока */
function getPlayerFraction(player) {
    const fid = playerFractionId(player);
    if (!fid || !global.fractionsData[fid]) return null;
    return global.fractionsData[fid];
}

/** Разрешение по рангу */
function rankHasPerm(fraction, rank, perm) {
    if (!fraction) return false;
    if (rank === 10) return true; // лидер — всё разрешено
    const r = fraction.ranks.find(x => x.rank === rank);
    if (!r) return false;
    return !!r[perm];
}

/** Сохранить фракцию в БД */
function saveFraction(fractionId, cb) {
    const f = global.fractionsData[fractionId];
    if (!f) { if (cb) cb(new Error('Фракция не найдена')); return; }
    global.DB.query(
        'UPDATE fractions SET leader_static=?, ranks_json=?, stock_json=?, advert=?, warehouse_open=?, balance=?, materials=?, news_json=? WHERE id=?',
        [
            f.leaderStatic || null,
            JSON.stringify(f.ranks),
            JSON.stringify(f.stock),
            f.advert || null,
            f.warehouseOpen !== false ? 1 : 0,
            parseInt(f.balance, 10) || 0,
            parseInt(f.materials, 10) || 0,
            JSON.stringify(Array.isArray(f.news) ? f.news : []),
            fractionId
        ],
        (err) => {
            if (err) {
                // fallback без news_json (колонка ещё не создана)
                global.DB.query(
                    'UPDATE fractions SET leader_static=?, ranks_json=?, stock_json=?, advert=?, warehouse_open=?, balance=?, materials=? WHERE id=?',
                    [
                        f.leaderStatic || null,
                        JSON.stringify(f.ranks),
                        JSON.stringify(f.stock),
                        f.advert || null,
                        f.warehouseOpen !== false ? 1 : 0,
                        parseInt(f.balance, 10) || 0,
                        parseInt(f.materials, 10) || 0,
                        fractionId
                    ],
                    (err2) => {
                        if (err2) console.log('[FRACTIONS] saveFraction:', err2.message || err2);
                        if (cb) cb(err2 || null);
                    }
                );
                return;
            }
            if (cb) cb(null);
        }
    );
}

/** Ранги сохраняются отдельным запросом, чтобы старые необязательные колонки не блокировали редактор. */
function saveFractionRanks(fractionId, ranks, cb) {
    global.DB.query(
        'UPDATE fractions SET ranks_json=? WHERE id=?',
        [JSON.stringify(ranks), fractionId],
        (err) => {
            if (err) console.log('[FRACTIONS] saveFractionRanks:', err.message || err);
            if (cb) cb(err || null);
        }
    );
}

function ensureFractionWarehouseOpenColumn(cb) {
    if (!global.DB) { if (cb) cb(); return; }
    global.DB.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fractions' AND COLUMN_NAME = 'warehouse_open'`,
        [],
        (err, rows) => {
            if (err || !rows || !rows[0] || Number(rows[0].c) > 0) return ensureFractionBalanceColumn(cb);
            global.DB.query(
                'ALTER TABLE fractions ADD COLUMN warehouse_open TINYINT(1) NOT NULL DEFAULT 1',
                [],
                () => ensureFractionBalanceColumn(cb)
            );
        }
    );
}

function ensureFractionBalanceColumn(cb) {
    if (!global.DB) { if (cb) cb(); return; }
    global.DB.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fractions' AND COLUMN_NAME = 'balance'`,
        [],
        (err, rows) => {
            if (err || !rows || !rows[0] || Number(rows[0].c) > 0) return ensureFractionMaterialsColumn(cb);
            global.DB.query(
                'ALTER TABLE fractions ADD COLUMN balance BIGINT(20) NOT NULL DEFAULT 0',
                [],
                () => ensureFractionMaterialsColumn(cb)
            );
        }
    );
}

function ensureFractionMaterialsColumn(cb) {
    if (!global.DB) { if (cb) cb(); return; }
    global.DB.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fractions' AND COLUMN_NAME = 'materials'`,
        [],
        (err, rows) => {
            if (err || !rows || !rows[0] || Number(rows[0].c) > 0) return ensureFractionNewsColumn(cb);
            global.DB.query(
                'ALTER TABLE fractions ADD COLUMN materials BIGINT(20) NOT NULL DEFAULT 0',
                [],
                () => ensureFractionNewsColumn(cb)
            );
        }
    );
}

function ensureFractionNewsColumn(cb) {
    if (!global.DB) { if (cb) cb(); return; }
    global.DB.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fractions' AND COLUMN_NAME = 'news_json'`,
        [],
        (err, rows) => {
            if (err || !rows || !rows[0] || Number(rows[0].c) > 0) return cb ? cb() : null;
            global.DB.query(
                'ALTER TABLE fractions ADD COLUMN news_json LONGTEXT NULL',
                [],
                () => { if (cb) cb(); }
            );
        }
    );
}

function ensureFractionLogsTable(cb) {
    if (!global.DB) { if (cb) cb(); return; }
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS fraction_logs (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            fraction_id TINYINT UNSIGNED NOT NULL,
            actor_static INT UNSIGNED NOT NULL DEFAULT 0,
            actor_name VARCHAR(64) NOT NULL DEFAULT '',
            action_type VARCHAR(32) NOT NULL DEFAULT '',
            action_text VARCHAR(512) NOT NULL DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_fraction_time (fraction_id, id),
            KEY idx_fraction_actor (fraction_id, actor_static)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        [],
        (err) => {
            if (err) console.log('[FRACTIONS] ensureFractionLogsTable:', err.message || err);
            if (cb) cb();
        }
    );
}

/** Постоянный лог действий фракции в БД. */
function logFractionAction(fractionId, player, actionType, actionText) {
    if (!global.DB || !fractionId) return;
    const actorStatic = player && player.static ? parseInt(player.static, 10) || 0 : 0;
    const actorName = player && (player.login || player.name)
        ? String(player.login || player.name).slice(0, 64)
        : 'Система';
    const type = String(actionType || 'other').slice(0, 32);
    const text = String(actionText || '').slice(0, 512);
    global.DB.query(
        'INSERT INTO fraction_logs (fraction_id, actor_static, actor_name, action_type, action_text) VALUES (?, ?, ?, ?, ?)',
        [fractionId, actorStatic, actorName, type, text],
        (err) => { if (err) console.log('[FRACTIONS] logFractionAction:', err.message || err); }
    );
}

function logFractionSystemAction(fractionId, actionType, actionText) {
    logFractionAction(fractionId, null, actionType, actionText);
}

/** Сохранить ранг в аккаунте */
function savePlayerFractionRank(player, rank) {
    player.fraction_rank = rank;
    if (!player.static) return;
    global.DB.query(
        'UPDATE accounts SET fraction_rank=? WHERE static=?',
        [rank, player.static],
        (err) => { if (err) console.log('[FRACTIONS] savePlayerFractionRank:', err.message || err); }
    );
}

/** Сохранить зону в gangspoints + INSERT если такой записи нет */
function saveGangZone(zoneId, fractionId) {
    global.gangZones[zoneId] = fractionId;
    global.DB.query(
        'INSERT INTO gangspoints (id, gangid) VALUES (?, ?) ON DUPLICATE KEY UPDATE gangid = VALUES(gangid)',
        [zoneId, fractionId],
        (err) => { if (err) console.log('[FRACTIONS] saveGangZone:', err.message || err); }
    );
}

/** Синхронизировать зоны всем онлайн-игрокам (полный список) */
function broadcastZones() {
    try {
        const payload = JSON.stringify(global.gangZones);
        mp.players.forEach(p => {
            if (p.getVariable && p.getVariable('auth')) {
                try { p.call('fraction:zones:update', [payload]); } catch (_e) {}
            }
        });
    } catch (e) { console.log('[FRACTIONS] broadcastZones:', e.message || e); }
}

/** Точечная рассылка цвета одной зоны всем игрокам */
function broadcastZoneColor(zoneId, fractionId) {
    try {
        mp.players.forEach(p => {
            if (p.getVariable && p.getVariable('auth')) {
                try { p.call('fraction:zone:setColor', [zoneId, fractionId]); } catch (_e) {}
            }
        });
    } catch (_) {}
}

// ─── загрузка из БД ──────────────────────────────────────────────────────────
function loadFractions() {
    global.DB.query('SELECT * FROM fractions', [], (err, rows) => {
        if (err) { console.log('[FRACTIONS] load error:', err.message || err); return; }
        rows.forEach(row => {
            let ranks = [];
            let stock = [];
            try { ranks = JSON.parse(row.ranks_json || 'null') || defaultRanks(); } catch (_) { ranks = defaultRanks(); }
            ranks = ranks.map((r) => ({
                ...r,
                craftAccess: r.craftAccess != null ? !!r.craftAccess : (parseInt(r.rank, 10) === 9),
                canInvite: r.canInvite != null ? !!r.canInvite : (parseInt(r.rank, 10) === 9),
                canDismiss: r.canDismiss != null ? !!r.canDismiss : (parseInt(r.rank, 10) === 9),
                canLogs: r.canLogs != null ? !!r.canLogs : (parseInt(r.rank, 10) === 9),
                warehouseClosedAccess: r.warehouseClosedAccess != null ? !!r.warehouseClosedAccess : (parseInt(r.rank, 10) === 9),
                warehouseToggle: r.warehouseToggle != null ? !!r.warehouseToggle : (parseInt(r.rank, 10) === 9)
            }));
            try { stock = JSON.parse(row.stock_json || 'null') || []; } catch (_) { stock = []; }
            global.fractionsData[row.id] = {
                id: row.id,
                name: String(row.name || FACTION_NAMES[row.id] || `Frac${row.id}`),
                leaderStatic: row.leader_static || null,
                ranks,
                stock,
                advert: row.advert || '',
                news: (function () {
                    try {
                        const n = JSON.parse(row.news_json || 'null');
                        return Array.isArray(n) ? n : [];
                    } catch (_e) { return []; }
                })(),
                warehouseOpen: row.warehouse_open == null ? true : Number(row.warehouse_open) !== 0,
                balance: parseInt(row.balance, 10) || 0,
                materials: parseInt(row.materials, 10) || 0
            };
        });
        // Убедиться что все 6 есть
        for (let i = 1; i <= 6; i++) {
            if (!global.fractionsData[i]) {
                global.fractionsData[i] = {
                    id: i,
                    name: FACTION_NAMES[i] || `Frac${i}`,
                    leaderStatic: null,
                    ranks: defaultRanks(),
                    stock: [],
                    advert: '',
                    news: [],
                    warehouseOpen: true,
                    balance: 0,
                    materials: 0
                };
            }
        }
        console.log('[FRACTIONS] Loaded', Object.keys(global.fractionsData).length, 'fractions');
    });
}

/** Кол-во зон по умолчанию — строго как ZONE_POSITIONS.length в client_packages/fraction_system.js */
const DEFAULT_ZONE_COUNT = 128;

function normalizeGangId(raw) {
    if (raw == null || raw === '') return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
}

function loadGangZones() {
    if (!global.DB) return;
    global.DB.query('SELECT id, gangid FROM gangspoints ORDER BY id', [], (err, rows) => {
        if (err) { console.log('[FRACTIONS] loadGangZones:', err.message || err); return; }
        rows.forEach(row => {
            const id = parseInt(row.id, 10);
            if (!Number.isFinite(id) || id < 1) return;
            global.gangZones[id] = normalizeGangId(row.gangid);
        });
        Object.keys(global.gangZones).forEach((k) => {
            const id = parseInt(k, 10);
            if (Number.isFinite(id) && id > DEFAULT_ZONE_COUNT) delete global.gangZones[id];
        });
        console.log('[FRACTIONS] Loaded', rows.length, 'gang zones from DB');

        // Дозаполнить id 1…DEFAULT, если в таблице дырки (или после смены DEFAULT_ZONE_COUNT)
        const missing = [];
        const persistedZoneIds = new Set(rows.map(row => Number(row.id)));
        for (let i = 1; i <= DEFAULT_ZONE_COUNT; i++) {
            if (!persistedZoneIds.has(i)) {
                global.gangZones[i] = 0;
                missing.push([i, 0]);
            }
        }
        if (missing.length > 0) {
            global.DB.query('INSERT IGNORE INTO gangspoints (id, gangid) VALUES ?', [missing], (e2) => {
                if (e2) console.log('[FRACTIONS] insert default zones:', e2.message || e2);
                else console.log('[FRACTIONS] inserted default zones:', missing.length);
            });
        }

        // Обязательно: иначе игроки, вошедшие до загрузки, навсегда видят серым (нули)
        broadcastZones();
    });
}

// Заполнить дефолтными значениями немедленно (до загрузки из БД)
for (let i = 1; i <= DEFAULT_ZONE_COUNT; i++) global.gangZones[i] = 0;

/** Вызывается из db.js сразу после успешного подключения MySQL */
global.fractionOnDatabaseReady = function fractionOnDatabaseReady() {
    ensureFractionLogsTable(() => {
        ensureFractionWarehouseOpenColumn(() => {
            loadFractions();
            loadGangZones();
        });
    });
};

// ─── колшейпы складов ────────────────────────────────────────────────────────
function initWarehouseColshapes() {
    for (const [fidStr, pos] of Object.entries(WAREHOUSE_POSITIONS)) {
        const fid = parseInt(fidStr, 10);
        try {
            const cs = global.creatorShapeSphere(pos.x, pos.y, pos.z, pos.radius);
            cs.setVariable('isWarehouse', true);
            cs.setVariable('warehouseFraction', fid);
            warehouseColshapes[fid] = cs;
        } catch (e) {
            console.log('[FRACTIONS] warehouse colshape err:', e.message || e);
        }
    }
    console.log('[FRACTIONS] Warehouse colshapes created');
}
setTimeout(initWarehouseColshapes, 5000);

// ─── admin команда /setleader ─────────────────────────────────────────────────
mp.events.addCommand('setleader', (player, _, fractionIdRaw, playerIdRaw) => {
    try {
        const adminLvl = parseInt(player.getVariable('adminlvl') || player.adminlvl, 10) || 0;
        if (adminLvl < 10) return player.outputChatBox('!{red}Недостаточно прав (требуется 10 уровень).');

        const fractionId = parseInt(fractionIdRaw, 10);
        const targetId   = parseInt(playerIdRaw, 10);

        if (isNaN(fractionId) || fractionId < 1 || fractionId > 6)
            return player.outputChatBox('!{red}Использование: /setleader [ID фракции 1-6] [static]');
        if (isNaN(targetId))
            return player.outputChatBox('!{red}Использование: /setleader [ID фракции 1-6] [static]');

        const target = typeof global.findOnlinePlayerByStatic === 'function'
            ? global.findOnlinePlayerByStatic(targetId, { fallbackSessionId: true })
            : findOnlinePlayerByStatic(targetId);
        if (!target || !mp.players.exists(target))
            return player.outputChatBox('!{red}Игрок не найден онлайн (укажите static).');
        if (!target.getVariable('auth'))
            return player.outputChatBox('!{red}Игрок не авторизован.');
        if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, target, 'setleader')) return;

        const targetFrac = playerFractionId(target);
        if (targetFrac === 0) {
            return player.outputChatBox('!{red}Игрок не состоит во фракции. Сначала назначьте ему фракцию.');
        }
        if (targetFrac !== fractionId) {
            return player.outputChatBox(`!{red}Игрок состоит во фракции ${targetFrac}, а не ${fractionId}. Сначала смените ему фракцию.`);
        }

        const fracData = global.fractionsData[fractionId];
        if (!fracData) return player.outputChatBox('!{red}Фракция не найдена в данных.');

        // Снять звание лидера у предыдущего лидера
        if (fracData.leaderStatic && !sameStatic(fracData.leaderStatic, target.static)) {
            mp.players.forEach((p) => {
                if (!sameStatic(p.static, fracData.leaderStatic)) return;
                if (playerFractionId(p) !== fractionId || playerFractionRank(p) !== 10) return;
                savePlayerFractionRank(p, 9);
                try { p.call('fraction:rank:updated', [9]); } catch (_) {}
                try { isNotify(p, 2, 'top-mid', 'Вы больше не лидер фракции.', 4000); } catch (_) {}
            });
            global.DB.query(
                'UPDATE accounts SET fraction_rank=9 WHERE static=? AND fraction=? AND fraction_rank=10',
                [fracData.leaderStatic, fractionId],
                (err) => { if (err) console.log('[FRACTIONS] setleader demote prev:', err.message || err); }
            );
        }

        fracData.leaderStatic = target.static;
        savePlayerFractionRank(target, 10);
        saveFraction(fractionId, null);

        try { target.call('fraction:rank:updated', [10]); } catch (_) {}
        try { isNotify(target, 1, 'top-mid', `Вы назначены лидером фракции ${fracData.name}!`, 5000); } catch (_) {}

        player.outputChatBox(`!{green}[FRACTIONS] Игрок ${target.name} назначен лидером фракции ${fracData.name}.`);
        console.log(`[FRACTIONS] ${player.name} set leader of frac ${fractionId} → ${target.static}`);

    } catch (e) { console.log('[FRACTIONS] /setleader:', e.message || e); }
});

// ─── admin команда /setfrac ───────────────────────────────────────────────────
mp.events.addCommand('setfrac', (player, _, staticRaw, fractionIdRaw) => {
    try {
        const adminLvl = parseInt(player.getVariable('adminlvl') || player.adminlvl, 10) || 0;
        if (adminLvl < 10) return player.outputChatBox('!{red}Недостаточно прав (требуется 10 уровень).');

        const targetStatic = parseInt(String(staticRaw || '').trim(), 10);
        const fractionId = parseInt(fractionIdRaw, 10);

        if (!Number.isFinite(targetStatic) || targetStatic < 1) {
            return player.outputChatBox('!{red}Использование: /setfrac [static] [фракция 0-6]');
        }
        if (isNaN(fractionId) || fractionId < 0 || fractionId > 6) {
            return player.outputChatBox('!{red}Использование: /setfrac [static] [фракция 0-6]');
        }

        global.DB.query(
            'SELECT static, login, fraction, fraction_rank, adminlvl FROM accounts WHERE static = ? LIMIT 1',
            [targetStatic],
            (err, rows) => {
                if (err) return player.outputChatBox('!{red}Ошибка базы данных.');
                if (!rows || !rows.length) return player.outputChatBox('!{red}Игрок не найден.');

                const row = rows[0];
                if (typeof global.canAdminActOnLevel === 'function' && !global.canAdminActOnLevel(player, Number(row.adminlvl) || 0, 'setfrac', targetStatic)) return;
                const targetName = row.login || `#${targetStatic}`;
                const prevFrac = parseInt(row.fraction, 10) || 0;

                if (fractionId === 0) {
                    if (prevFrac === 0) {
                        return player.outputChatBox(`!{yellow}У игрока ${targetName} уже нет фракции.`);
                    }
                    clearFractionLeaderByStatic(prevFrac, targetStatic);
                    const targetOnline = findOnlinePlayerByStatic(targetStatic);
                    if (targetOnline) {
                        removePlayerFromFraction(targetOnline, {
                            notify: `Администратор ${player.login} снял с вас фракцию.`
                        });
                    } else {
                        global.DB.query(
                            'UPDATE accounts SET fraction=0, fraction_rank=0, fraction_prefix=NULL WHERE static=?',
                            [targetStatic],
                            () => {}
                        );
                    }
                    player.outputChatBox(`!{green}[FRACTIONS] У игрока ${targetName} (#${targetStatic}) фракция снята.`);
                    console.log(`[FRACTIONS] ${player.login} setfrac ${targetStatic} → 0`);
                    return;
                }

                const fracData = global.fractionsData[fractionId];
                if (!fracData) return player.outputChatBox('!{red}Фракция не найдена.');

                if (prevFrac === fractionId) {
                    return player.outputChatBox(`!{yellow}Игрок ${targetName} уже во фракции ${fracData.name}.`);
                }

                if (prevFrac >= 1 && prevFrac <= 6) {
                    clearFractionLeaderByStatic(prevFrac, targetStatic);
                }

                global.DB.query(
                    'UPDATE accounts SET fraction=?, fraction_rank=1, fraction_prefix=NULL, lastfraction=? WHERE static=?',
                    [fractionId, Date.now(), targetStatic],
                    (err2) => {
                        if (err2) {
                            console.log('[FRACTIONS] setfrac UPDATE:', err2.message || err2);
                            return player.outputChatBox('!{red}Не удалось сохранить фракцию.');
                        }

                        const targetOnline = findOnlinePlayerByStatic(targetStatic);
                        if (targetOnline && mp.players.exists(targetOnline)) {
                            targetOnline.setVariable('fraction', fractionId);
                            targetOnline.setVariable('factionlessHub', null);
                            targetOnline.fraction_rank = 1;
                            targetOnline.fraction_prefix = null;
                            savePlayerFractionRank(targetOnline, 1);
                            try { targetOnline.call('fraction:rank:updated', [1]); } catch (_) {}
                            targetOnline.call('setfraction', [fractionId]);
                            finishFractionJoin(targetOnline, fractionId, null);
                            isNotify(targetOnline, 1, 'top-mid', `Администратор назначил вас во фракцию «${fracData.name}».`, 5000);
                        }

                        player.outputChatBox(`!{green}[FRACTIONS] Игрок ${targetName} (#${targetStatic}) → ${fracData.name}.`);
                        console.log(`[FRACTIONS] ${player.login} setfrac ${targetStatic} → ${fractionId}`);
                    }
                );
            }
        );
    } catch (e) { console.log('[FRACTIONS] /setfrac:', e.message || e); }
});

function finishRemoveLeader(adminPlayer, fractionId, fracData, prevStatic) {
    demoteFractionLeaders(fractionId, (err, onlineDemoted, dbAffected) => {
        if (err) return adminPlayer.outputChatBox('!{red}Ошибка при снятии лидера.');
        if (onlineDemoted < 1 && dbAffected < 1 && !prevStatic) {
            return adminPlayer.outputChatBox('!{red}У этой фракции нет лидера.');
        }
        fracData.leaderStatic = null;
        saveFraction(fractionId, null);
        const who = prevStatic ? `(static: ${prevStatic})` : `(снято: ${Math.max(onlineDemoted, dbAffected)} чел.)`;
        adminPlayer.outputChatBox(`!{green}[FRACTIONS] Лидер фракции ${fracData.name} ${who} снят.`);
        console.log(`[FRACTIONS] ${adminPlayer.name} removed leader of frac ${fractionId} (was ${prevStatic || 'unknown'})`);
    });
}

// ─── admin команда /removeleader ─────────────────────────────────────────────
mp.events.addCommand('removeleader', (player, _, fractionIdRaw) => {
    try {
        const adminLvl = parseInt(player.getVariable('adminlvl') || player.adminlvl, 10) || 0;
        if (adminLvl < 8) return player.outputChatBox('!{red}Недостаточно прав (требуется 8 уровень).');

        const fractionId = parseInt(fractionIdRaw, 10);
        if (isNaN(fractionId) || fractionId < 1 || fractionId > 6)
            return player.outputChatBox('!{red}Использование: /removeleader [ID фракции 1-6]');

        const fracData = global.fractionsData[fractionId];
        if (!fracData) return player.outputChatBox('!{red}Фракция не найдена.');

        const prevStatic = fracData.leaderStatic;
        let hasOnlineLeader = false;
        mp.players.forEach((p) => {
            if (playerFractionId(p) === fractionId && playerFractionRank(p) === 10) hasOnlineLeader = true;
        });

        const proceedRemoveLeader = () => finishRemoveLeader(player, fractionId, fracData, prevStatic);

        if (typeof global.canAdminActOnLevel === 'function' && prevStatic) {
            return global.DB.query(
                'SELECT adminlvl FROM accounts WHERE static = ? LIMIT 1',
                [prevStatic],
                (err, rows) => {
                    const tLvl = err || !rows || !rows[0] ? 0 : Number(rows[0].adminlvl) || 0;
                    if (tLvl >= 1 && !global.canAdminActOnLevel(player, tLvl, 'removeleader', prevStatic)) return;
                    if (!prevStatic && !hasOnlineLeader) {
                        return global.DB.query(
                            'SELECT COUNT(*) AS c FROM accounts WHERE fraction=? AND fraction_rank=10',
                            [fractionId],
                            (err2, rows2) => {
                                const dbCount = err2 || !rows2 || !rows2[0] ? 0 : parseInt(rows2[0].c, 10) || 0;
                                if (dbCount < 1) return player.outputChatBox('!{red}У этой фракции нет лидера.');
                                proceedRemoveLeader();
                            }
                        );
                    }
                    proceedRemoveLeader();
                }
            );
        }

        if (!prevStatic && !hasOnlineLeader) {
            return global.DB.query(
                'SELECT COUNT(*) AS c FROM accounts WHERE fraction=? AND fraction_rank=10',
                [fractionId],
                (err, rows) => {
                    const dbCount = err || !rows || !rows[0] ? 0 : parseInt(rows[0].c, 10) || 0;
                    if (dbCount < 1) return player.outputChatBox('!{red}У этой фракции нет лидера.');
                    finishRemoveLeader(player, fractionId, fracData, prevStatic);
                }
            );
        }
        finishRemoveLeader(player, fractionId, fracData, prevStatic);
    } catch (e) { console.log('[FRACTIONS] /removeleader:', e.message || e); }
});

// ─── admin команды /setzone и /setcolour ─────────────────────────────────────
function adminSetZoneHandler(player, _, zoneIdRaw, fractionIdRaw) {
    try {
        const adminLvl = parseInt(player.getVariable('adminlvl') || player.adminlvl, 10) || 0;
        if (adminLvl < 8) return player.outputChatBox('!{red}Требуется 8 уровень.');

        const zoneId     = parseInt(zoneIdRaw, 10);
        const fractionId = parseInt(fractionIdRaw, 10);

        if (isNaN(zoneId) || zoneId < 1 || zoneId > DEFAULT_ZONE_COUNT) {
            return player.outputChatBox(`!{red}/setcolour [зона 1-${DEFAULT_ZONE_COUNT}] [фракция 0-5]`);
        }
        if (isNaN(fractionId) || fractionId < 0 || fractionId > 6) {
            return player.outputChatBox(`!{red}/setcolour [зона 1-${DEFAULT_ZONE_COUNT}] [фракция 0-5]`);
        }

        saveGangZone(zoneId, fractionId);
        broadcastZoneColor(zoneId, fractionId);
        const fname = fractionId === 0 ? 'нейтрально' : getFractionName(fractionId);
        player.outputChatBox(`!{green}[ZONES] Зона #${zoneId} → ${fname}`);
    } catch (e) { console.log('[FRACTIONS] /setcolour:', e.message || e); }
}
mp.events.addCommand('setzone',   adminSetZoneHandler);
mp.events.addCommand('setcolour', adminSetZoneHandler);
mp.events.addCommand('setcolor',  adminSetZoneHandler);

/** Обнулить все зоны каптов/bizwar (gangspoints → 0, память + клиенты). */
function clearAllGangZones(reason) {
    try {
        if (global.activeBizwars && typeof global.activeBizwars === 'object') {
            Object.keys(global.activeBizwars).forEach((k) => {
                try { delete global.activeBizwars[k]; } catch (_e) {}
            });
        }
        Object.keys(bizwarPreviousZoneOwners).forEach((k) => {
            delete bizwarPreviousZoneOwners[k];
        });
        for (let i = 1; i <= DEFAULT_ZONE_COUNT; i++) {
            global.gangZones[i] = 0;
        }
        Object.keys(global.gangZones).forEach((k) => {
            const id = parseInt(k, 10);
            if (Number.isFinite(id) && id > DEFAULT_ZONE_COUNT) delete global.gangZones[id];
        });
        global.DB.query('UPDATE gangspoints SET gangid = 0', [], (err) => {
            if (err) console.log('[FRACTIONS] clearAllGangZones:', err.message || err);
        });
        broadcastZones();
        console.log('[FRACTIONS] clearAllGangZones', reason || '');
        return true;
    } catch (e) {
        console.log('[FRACTIONS] clearAllGangZones err:', e.message || e);
        return false;
    }
}

global.clearAllGangZones = clearAllGangZones;

mp.events.addCommand('clearallzones', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.isCreatorPlayer === 'function' ? !global.isCreatorPlayer(player) : ![1, 2].includes(Number(player.static))) {
            return isNotify(player, 2, 'top-mid', 'Только создателям.', 3000);
        }
        clearAllGangZones('cmd');
        player.outputChatBox('Все зоны каптов обнулены (gangid = 0).');
        isNotify(player, 3, 'top-mid', 'Зоны каптов обнулены.', 4000);
    } catch (e) {
        console.log('[FRACTIONS] /clearallzones:', e.message || e);
    }
});

mp.events.addCommand('clearallwars', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.isCreatorPlayer === 'function' ? !global.isCreatorPlayer(player) : ![1, 2].includes(Number(player.static))) {
            return isNotify(player, 2, 'top-mid', 'Только создателям.', 3000);
        }
        if (typeof global.clearAllFamilyWarPoints === 'function') global.clearAllFamilyWarPoints('cmd-wars');
        clearAllGangZones('cmd-wars');
        player.outputChatBox('Обнулено: точки войны семей + зоны каптов.');
        isNotify(player, 3, 'top-mid', 'Все территории войн обнулены.', 4000);
    } catch (e) {
        console.log('[FRACTIONS] /clearallwars:', e.message || e);
    }
});

/** Все участники фракции из БД + статус онлайн (для планшета). */
function fetchFractionMembersList(fid, fracData, cb) {
    global.DB.query(
        'SELECT static, login, fraction_rank, fraction_prefix, last_login FROM accounts WHERE fraction = ? ORDER BY fraction_rank DESC, login ASC',
        [fid],
        (err, rows) => {
            if (err) {
                console.log('[FRACTIONS] fetchFractionMembersList:', err.message || err);
                return cb([]);
            }
            const onlineByStatic = new Map();
            mp.players.forEach((p) => {
                if (!mp.players.exists(p)) return;
                if (playerFractionId(p) !== fid) return;
                if (p.static) onlineByStatic.set(p.static, p);
            });
            const list = (rows || []).map((row) => {
                const rank = parseInt(row.fraction_rank, 10) || 0;
                const rankName = rank === 10
                    ? 'Лидер'
                    : (fracData.ranks.find(r => r.rank === rank) || { name: `Ранг ${rank}` }).name;
                const onlinePlayer = onlineByStatic.get(row.static);
                const lastLoginTs = row.last_login
                    ? Math.floor(new Date(row.last_login).getTime() / 1000)
                    : 0;
                return {
                    id: onlinePlayer ? onlinePlayer.id : 0,
                    static: row.static,
                    name: row.login || `Игрок #${row.static}`,
                    rank,
                    rankName,
                    prefix: row.fraction_prefix || null,
                    online: !!onlinePlayer,
                    lastLogin: lastLoginTs
                };
            });
            cb(list);
        }
    );
}

/** Цвет рекламы/чата: банды — свой цвет, FIB — серый. */
function getFractionChatColor(fid) {
    if (fid === 6) return '#9ca3af';
    return FACTION_COLORS[fid] || '#dc2626';
}

function buildFractionAdvertLines(fid, fn) {
    const c = getFractionChatColor(fid);
    const tag = '!{#22c55e}[Реклама]';
    const body = `!{${c}}`;

    if (fid === 6) {
        return {
            1: `${tag} ${body}${fn} набирает новых бойцов!\nНужны активные и собранные игроки.\nКапты, захваты зон и сильный состав. Пишите лидеру.`,
            2: `${tag} ${body}${fn} ищет бойцов в состав!\nЕсли готов к PvP и командной игре — заходи.\nРегулярные бои и поддержка от фракции.`,
            3: `${tag} ${body}Вступай в ${fn}!\nАктивный состав, капты и захват территорий.\nДокажи, что ты сильнее остальных.`
        };
    }

    return {
        1: `${tag} ${body}${fn} открывает набор!\nИщем активных бойцов в состав.\nКапты, захваты зон и сильная команда. Заявки открыты!`,
        2: `${tag} ${body}Набор в ${fn}!\nНужны уверенные игроки для PvP и захватов.\nПоднимайся по рангам вместе с нами.`,
        3: `${tag} ${body}Стань частью ${fn}!\nАктивный состав, бои за районы и поддержка.\nВступай и покажи, на что способен.`
    };
}

function buildFractionTabletPayload(player, fid, fracData, membersList) {
    const rank = playerFractionRank(player);
    const ownedZones = Object.values(global.gangZones).filter(g => g === fid).length;
    const isBizwarFaction = BIZWAR_FRACTIONS.has(fid);
    const viplvl = parseInt(player.viplvl != null ? player.viplvl : player.getVariable('viplvl'), 10) || 0;
    return {
        fractionId: fid,
        fractionName: fracData.name,
        fractionColor: FACTION_COLORS[fid] || '#888888',
        fractionChatColor: getFractionChatColor(fid),
        playerStatic: parseInt(player.static, 10) || 0,
        playerRank: rank,
        viplvl,
        canSelfLeaveFaction: viplvl >= 3 && !isLeader(player),
        isLeader: isLeader(player),
        isBizwarFaction,
        canManageRanks: rankHasPerm(fracData, rank, 'changeRank'),
        canWarehouse: rankHasPerm(fracData, rank, 'warehouseAccess'),
        canWarehouseClosed: rankHasPerm(fracData, rank, 'warehouseClosedAccess'),
        canWarehouseToggle: rankHasPerm(fracData, rank, 'warehouseToggle'),
        canBizwar: isBizwarFaction && rankHasPerm(fracData, rank, 'bizwar'),
        members: membersList,
        ranks: fracData.ranks,
        advert: fracData.advert || '',
        news: Array.isArray(fracData.news) ? fracData.news : [],
        warehouseOpen: fracData.warehouseOpen !== false,
        ownedZones,
        totalZones: Object.keys(global.gangZones).length,
        balance: parseInt(fracData.balance, 10) || 0,
        materials: parseInt(fracData.materials, 10) || 0,
        materialsPerHour: ownedZones * 20,
        canWithdrawMoney: rank === 10 || rankHasPerm(fracData, rank, 'withdrawMoney'),
        canCraft: rank === 10 || rankHasPerm(fracData, rank, 'craftAccess'),
        canInvite: rankHasPerm(fracData, rank, 'canInvite'),
        canDismiss: rankHasPerm(fracData, rank, 'canDismiss'),
        canLogs: isLeader(player) || rankHasPerm(fracData, rank, 'canLogs')
    };
}

// ─── Планшет: открытие ───────────────────────────────────────────────────────
mp.events.add('fraction:tablet:open:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const fid   = playerFractionId(player);
        if (!fid) return isNotify(player, 2, 'top-mid', 'Вы не состоите во фракции.', 3000);

        const fracData = global.fractionsData[fid];
        if (!fracData) return isNotify(player, 2, 'top-mid', 'Данные фракции не найдены.', 3000);

        fetchFractionMembersList(fid, fracData, (membersList) => {
            if (!mp.players.exists(player)) return;
            const payload = buildFractionTabletPayload(player, fid, fracData, membersList);
            player.call('fraction:tablet:open:c', [JSON.stringify(payload)]);
        });
    } catch (e) { console.log('[FRACTIONS] tablet:open:', e.message || e); }
});

// ─── Планшет: список участников (обновить) ────────────────────────────────────
mp.events.add('fraction:members:refresh:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!fid) return;
        const fracData = global.fractionsData[fid];
        if (!fracData) return;

        fetchFractionMembersList(fid, fracData, (membersList) => {
            if (!mp.players.exists(player)) return;
            player.call('fraction:members:list:c', [JSON.stringify(membersList)]);
        });
    } catch (e) { console.log('[FRACTIONS] members:refresh:', e.message || e); }
});

// ─── Планшет: изменить ранг участника ────────────────────────────────────────
mp.events.add('fraction:rank:set:s', (player, targetStaticRaw, newRankRaw, reasonRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid  = playerFractionId(player);
        const rank = playerFractionRank(player);
        const fracData = global.fractionsData[fid];
        if (!fracData) return;

        if (!rankHasPerm(fracData, rank, 'changeRank'))
            return isNotify(player, 2, 'top-mid', 'Нет прав на изменение рангов.', 3000);

        const targetStatic = parseInt(targetStaticRaw, 10);
        const newRank  = parseInt(newRankRaw, 10);
        if (isNaN(targetStatic) || targetStatic < 1 || isNaN(newRank) || newRank < 1 || newRank > 9)
            return isNotify(player, 2, 'top-mid', 'Неверный ранг (1-9).', 3000);

        const reason = String(reasonRaw || '').trim().slice(0, 256) || 'Причина не указана';

        let targetOnline = null;
        mp.players.forEach((p) => {
            if (!mp.players.exists(p)) return;
            if (p.static === targetStatic && playerFractionId(p) === fid) targetOnline = p;
        });

        global.DB.query(
            'SELECT login, fraction_rank FROM accounts WHERE static=? AND fraction=? LIMIT 1',
            [targetStatic, fid],
            (err, rows) => {
                if (err) {
                    console.log('[FRACTIONS] rank:set DB:', err.message || err);
                    return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
                }
                if (!rows || !rows.length)
                    return isNotify(player, 2, 'top-mid', 'Игрок не найден во фракции.', 3000);

                const row = rows[0];
                const prevRank = parseInt(row.fraction_rank, 10) || 0;
                if (prevRank === 10)
                    return isNotify(player, 2, 'top-mid', 'Нельзя изменить ранг лидера.', 3000);
                if (!isLeader(player) && prevRank >= rank)
                    return isNotify(player, 2, 'top-mid', 'Нельзя изменять ранг игрока вашего или более высокого ранга.', 3000);
                if (!isLeader(player) && newRank >= rank)
                    return isNotify(player, 2, 'top-mid', 'Нельзя назначить игроку ваш или более высокий ранг.', 3000);

                const rankName = fracData.ranks.find(r => r.rank === newRank)?.name || `Ранг ${newRank}`;
                const prevRankName = fracData.ranks.find(r => r.rank === prevRank)?.name || `Ранг ${prevRank}`;
                const direction = newRank > prevRank ? 'повышен' : 'понижен';
                const targetName = row.login || `#${targetStatic}`;

                const finish = () => {
                    logFractionAction(fid, player, 'rank_change',
                        `Изменил ранг [#${targetStatic}] ${targetName}: ${prevRankName} → ${rankName}. Причина: ${reason}`);
                    isNotify(player, 1, 'top-mid', `Ранг игрока ${targetName} изменён на ${rankName}.`, 3500);
                    mp.events.call('fraction:members:refresh:s', player);
                };

                if (targetOnline && mp.players.exists(targetOnline)) {
                    savePlayerFractionRank(targetOnline, newRank);
                    try { targetOnline.call('fraction:rank:updated', [newRank, rankName]); } catch (_) {}
                    try {
                        targetOnline.outputChatBox(`!{#dc2626}[Фракция] !{#e8e8e8}Вы ${direction} до ранга «${rankName}» по причине: ${reason}`);
                    } catch (_) {}
                    return finish();
                }

                global.DB.query(
                    'UPDATE accounts SET fraction_rank=? WHERE static=? AND fraction=?',
                    [newRank, targetStatic, fid],
                    (err2) => {
                        if (err2) {
                            console.log('[FRACTIONS] rank:set offline DB:', err2.message || err2);
                            return isNotify(player, 2, 'top-mid', 'Не удалось сохранить ранг.', 3000);
                        }
                        finish();
                    }
                );
            }
        );
    } catch (e) { console.log('[FRACTIONS] rank:set:', e.message || e); }
});

// ─── Планшет: установить префикс участнику ───────────────────────────────────
mp.events.add('fraction:prefix:set:s', (player, targetStaticRaw, prefixRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid  = playerFractionId(player);
        const rank = playerFractionRank(player);
        const fracData = global.fractionsData[fid];
        if (!fracData) return;
        if (!rankHasPerm(fracData, rank, 'changeRank'))
            return isNotify(player, 2, 'top-mid', 'Нет прав на изменение приписки.', 3000);

        const targetStatic = parseInt(targetStaticRaw, 10);
        const prefix = String(prefixRaw || '').trim().slice(0, 32);
        if (isNaN(targetStatic) || targetStatic < 1)
            return isNotify(player, 2, 'top-mid', 'Игрок не найден.', 3000);

        let targetOnline = null;
        mp.players.forEach((p) => {
            if (!mp.players.exists(p)) return;
            if (p.static === targetStatic && playerFractionId(p) === fid) targetOnline = p;
        });

        global.DB.query(
            'SELECT login, fraction_rank FROM accounts WHERE static=? AND fraction=? LIMIT 1',
            [targetStatic, fid],
            (err, rows) => {
                if (err) {
                    console.log('[FRACTIONS] prefix:set DB:', err.message || err);
                    return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
                }
                if (!rows || !rows.length)
                    return isNotify(player, 2, 'top-mid', 'Игрок не найден во фракции.', 3000);

                const targetName = rows[0].login || `#${targetStatic}`;
                global.DB.query(
                    'UPDATE accounts SET fraction_prefix=? WHERE static=? AND fraction=?',
                    [prefix || null, targetStatic, fid],
                    (err2) => {
                        if (err2) {
                            console.log('[FRACTIONS] prefix:set save:', err2.message || err2);
                            return isNotify(player, 2, 'top-mid', 'Не удалось сохранить приписку.', 3000);
                        }
                        if (targetOnline && mp.players.exists(targetOnline)) {
                            targetOnline.fraction_prefix = prefix || null;
                            try {
                                if (prefix) targetOnline.outputChatBox(`!{#dc2626}[Фракция] !{#e8e8e8}Вам установлена приписка: ${prefix}`);
                                else targetOnline.outputChatBox('!{#dc2626}[Фракция] !{#e8e8e8}Ваша приписка снята.');
                            } catch (_) {}
                        }
                        logFractionAction(fid, player, 'prefix',
                            `Приписка [#${targetStatic}] ${targetName}: ${prefix || '(снята)'}`);
                        isNotify(player, 1, 'top-mid', `Приписка игрока ${targetName} обновлена.`, 3000);
                        mp.events.call('fraction:members:refresh:s', player);
                    }
                );
            }
        );
    } catch (e) { console.log('[FRACTIONS] prefix:set:', e.message || e); }
});

// ─── Планшет: реклама фракции (публикация в чат) ────────────────────────────
/** Хранится в памяти (сбрасывается при рестарте) */
const fractionAdvertLastSent = {};

mp.events.add('fraction:advert:broadcast:s', (player, variantRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!fid || !isLeader(player))
            return isNotify(player, 2, 'top-mid', 'Только лидер может отправлять рекламу.', 3000);

        const fracData = global.fractionsData[fid];
        if (!fracData) return;

        const variant = parseInt(variantRaw, 10);
        if (isNaN(variant) || variant < 1 || variant > 3)
            return isNotify(player, 2, 'top-mid', 'Неверный вариант рекламы (1-3).', 3000);

        const CD_MS = 4 * 60 * 60 * 1000;
        const last  = fractionAdvertLastSent[fid] || 0;
        const now   = Date.now();
        if (now - last < CD_MS) {
            const leftMin = Math.ceil((CD_MS - (now - last)) / 60000);
            return isNotify(player, 2, 'top-mid', `Повтор рекламы через ${leftMin} мин.`, 3000);
        }

        const fn = fracData.name;
        const ADVERTS = buildFractionAdvertLines(fid, fn);

        fractionAdvertLastSent[fid] = now;

        const line = ADVERTS[variant];
        if (!line) return isNotify(player, 2, 'top-mid', 'Неверный вариант рекламы (1-3).', 3000);
        try {
            mp.players.forEach(p => {
                if (p && mp.players.exists(p) && p.getVariable('auth')) {
                    p.call('chat:pushLine', [line]);
                }
            });
        } catch (_) {}
        isNotify(player, 1, 'top-mid', 'Реклама отправлена в чат!', 3000);
        logFractionAction(fid, player, 'advert', `Отправил рекламу в чат (вариант ${variant})`);
        console.log(`[FRACTIONS] advert sent frac=${fid} variant=${variant}`);
    } catch (e) { console.log('[FRACTIONS] advert:broadcast:', e.message || e); }
});

// ─── Планшет: настройки ранга (лидер) ────────────────────────────────────────
mp.events.add('fraction:rankconfig:save:s', (player, ranksJsonRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!fid || !isLeader(player)) return isNotify(player, 2, 'top-mid', 'Только лидер может настраивать ранги.', 3000);

        let newRanks;
        try { newRanks = JSON.parse(ranksJsonRaw); } catch (_) { return isNotify(player, 2, 'top-mid', 'Ошибка данных.', 3000); }
        if (!Array.isArray(newRanks)) return;

        const fracData = global.fractionsData[fid];
        if (!fracData) return isNotify(player, 2, 'top-mid', 'Данные фракции не найдены.', 3000);
        fracData.ranks = normalizeFractionRanks(fid, newRanks, fracData.ranks);
        saveFractionRanks(fid, fracData.ranks, (saveErr) => {
            if (!mp.players.exists(player)) return;
            if (saveErr) return isNotify(player, 2, 'top-mid', 'Не удалось сохранить ранги в БД.', 3000);
            logFractionAction(fid, player, 'rank_config', 'Обновил настройки рангов 1–9');
            isNotify(player, 1, 'top-mid', 'Настройки рангов сохранены.', 3000);
            try {
                player.call('fraction:rankconfig:saved:c');
                player.call('fraction:rankconfig:update:c', [JSON.stringify(fracData.ranks)]);
            } catch (_) {}
        });
    } catch (e) { console.log('[FRACTIONS] rankconfig:save:', e.message || e); }
});

// ─── Планшет: реклама ─────────────────────────────────────────────────────────
mp.events.add('fraction:advert:save:s', (player, text) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!fid || !isLeader(player)) return isNotify(player, 2, 'top-mid', 'Только лидер может редактировать рекламу.', 3000);
        const fracData = global.fractionsData[fid];
        fracData.advert = String(text || '').slice(0, 512);
        saveFraction(fid, null);
        logFractionAction(fid, player, 'advert', 'Обновил рекламу фракции');
        isNotify(player, 1, 'top-mid', 'Реклама обновлена.', 3000);
    } catch (e) { console.log('[FRACTIONS] advert:save:', e.message || e); }
});

function persistFractionNews(fractionId, newsArr, cb) {
    const fid = parseInt(fractionId, 10);
    if (!fid) { if (cb) cb(new Error('bad fid')); return; }
    const normalized = Array.isArray(newsArr) ? newsArr.slice(0, 50) : [];
    if (global.fractionsData[fid]) global.fractionsData[fid].news = normalized;
    if (!global.DB) { if (cb) cb(null); return; }
    global.DB.query(
        'UPDATE fractions SET news_json=? WHERE id=?',
        [JSON.stringify(normalized), fid],
        (err) => {
            if (err) console.log('[FRACTIONS] persistFractionNews:', err.message || err);
            if (cb) cb(err);
        }
    );
}

function createFractionNewsEntry(player, titleRaw, textRaw) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) {
        return { ok: false, msg: 'Не авторизован.' };
    }
    const fid = playerFractionId(player);
    if (!fid) return { ok: false, msg: 'Вы не состоите во фракции.' };
    if (!isLeader(player)) {
        return { ok: false, msg: 'Только лидер может публиковать новости.' };
    }
    const fracData = global.fractionsData[fid];
    if (!fracData) return { ok: false, msg: 'Данные фракции не найдены.' };

    const title = String(titleRaw || '').trim().slice(0, 64);
    const text = String(textRaw || '').trim().slice(0, 512);
    if (!title || !text) {
        return { ok: false, msg: 'Заполните заголовок и текст новости.' };
    }

    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    const entry = {
        title,
        text,
        date: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
        author: String(player.login || player.name || 'Лидер').slice(0, 32)
    };

    if (!Array.isArray(fracData.news)) fracData.news = [];
    fracData.news.unshift(entry);
    if (fracData.news.length > 30) fracData.news.length = 30;

    return { ok: true, fid, title, news: fracData.news.slice() };
}

function finalizeFractionNewsCreate(player, result) {
    if (!result || !result.ok) {
        if (player && mp.players.exists(player) && result && result.msg) {
            isNotify(player, 2, 'top-mid', result.msg, 3000);
        }
        return;
    }
    persistFractionNews(result.fid, result.news, (err) => {
        if (err) {
            if (mp.players.exists(player)) {
                isNotify(player, 2, 'top-mid', 'Не удалось сохранить новость в БД.', 3500);
            }
            return;
        }
        if (!mp.players.exists(player)) return;
        try {
            player.call('fraction:news:update:c', [JSON.stringify(result.news)]);
        } catch (_e) {}
        isNotify(player, 1, 'top-mid', 'Новость опубликована.', 3000);
        logFractionAction(result.fid, player, 'news_create', `Опубликовал новость: ${result.title}`);
    });
}

mp.events.add('fraction:news:create:s', (player, titleRaw, textRaw) => {
    try {
        finalizeFractionNewsCreate(player, createFractionNewsEntry(player, titleRaw, textRaw));
    } catch (e) { console.log('[FRACTIONS] news:create:', e.message || e); }
});

// ─── Склад фракции (инвентарь + колонка, как у семьи) ────────────────────────
const MAX_FRACTION_WAREHOUSE_ITEMS = 300;
global._fractionWarehouseBusy = global._fractionWarehouseBusy || {};

function beginFractionWarehouseOp(fid) {
    const key = String(parseInt(fid, 10) || '');
    if (!key) return false;
    if (global._fractionWarehouseBusy[key]) return false;
    global._fractionWarehouseBusy[key] = true;
    return true;
}

function endFractionWarehouseOp(fid) {
    const key = String(parseInt(fid, 10) || '');
    if (key && global._fractionWarehouseBusy) delete global._fractionWarehouseBusy[key];
}

function playerAtFractionWarehouse(player) {
    const fid = playerFractionId(player);
    const whPos = WAREHOUSE_POSITIONS[fid];
    if (!whPos || !mp.players.exists(player)) return false;
    if (player.dimension !== 0) return false;
    return player.dist(new mp.Vector3(whPos.x, whPos.y, whPos.z)) <= (whPos.radius || 3.0) + 0.5;
}

function normalizeFractionWarehouseItem(raw) {
    if (raw == null) return '';
    return String(raw).split('(')[0].trim();
}

function parseFractionStackEntry(entry) {
    const s = String(entry == null ? '' : entry).trim();
    const m = s.match(/^(.+?)\s*\((\d+)\)\s*$/);
    if (m) {
        const n = parseInt(m[2], 10);
        return { base: m[1].trim(), count: Number.isFinite(n) && n > 0 ? n : 0 };
    }
    if (!s) return { base: '', count: 0 };
    return { base: s, count: 1 };
}

function formatFractionStackEntry(base, count) {
    if (!base || count < 1) return null;
    if (count === 1) return base;
    return `${base} (${count})`;
}

function isFractionWarehouseStackItem(baseName) {
    return baseName === 'item_spank' || baseName === 'item_alco' || baseName === 'Бронежилет' || baseName === 'Аптечка';
}

function fractionWarehouseCellMatches(cell, normalizedBase, rawItem) {
    if (cell == null || cell === '') return false;
    const s = String(cell);
    const raw = String(rawItem || '').trim();
    if (raw && s === raw) return true;
    if (s === normalizedBase) return true;
    if (normalizedBase === 'item_bong' && s.startsWith('item_bong')) return true;
    if (normalizedBase === 'item_drone' && s.startsWith('item_drone')) return true;
    if (normalizedBase === 'item_thermos' && (s.startsWith('item_thermos') || s.startsWith('item_thermocup'))) return true;
    return false;
}

function findFractionWarehouseEntryIndex(stock, normalizedItem, rawItem) {
    const base = normalizeFractionWarehouseItem(normalizedItem);
    if (!base) return -1;
    for (let i = 0; i < stock.length; i++) {
        if (fractionWarehouseCellMatches(stock[i], base, rawItem)) return i;
    }
    return -1;
}

function takeWholeFractionWarehouseItemFromPlayer(player, normalizedItem, rawItem) {
    if (!mp.players.exists(player) || !normalizedItem) return null;
    const base = normalizeFractionWarehouseItem(normalizedItem);
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];

    for (let i = 0; i < player.inventory.length; i++) {
        if (!fractionWarehouseCellMatches(player.inventory[i], base, rawItem)) continue;
        const token = String(player.inventory[i]);
        player.inventory[i] = null;
        return token;
    }
    for (let s = 0; s < player.fastSlots.length; s++) {
        if (!fractionWarehouseCellMatches(player.fastSlots[s], base, rawItem)) continue;
        const token = String(player.fastSlots[s]);
        player.fastSlots[s] = '';
        return token;
    }
    if (typeof global.syncBagContentsArrayToCapacity === 'function') global.syncBagContentsArrayToCapacity(player);
    const cap = typeof global.getActiveBagCapacity === 'function' ? global.getActiveBagCapacity(player) : 0;
    const bagFull = Array.isArray(player._bagContentsFull) ? player._bagContentsFull : [];
    for (let bi = 0; bi < cap; bi++) {
        if (!fractionWarehouseCellMatches(bagFull[bi], base, rawItem)) continue;
        const token = String(bagFull[bi]);
        bagFull[bi] = null;
        if (typeof global.syncBagContentsArrayToCapacity === 'function') global.syncBagContentsArrayToCapacity(player);
        return token;
    }
    return null;
}

function takeWholeFractionWarehouseItemFromPlayerSlot(player, normalizedItem, rawItem, slotRaw) {
    const slot = parseInt(slotRaw, 10);
    if (!mp.players.exists(player) || !Number.isInteger(slot) || slot < 0) return null;
    const base = normalizeFractionWarehouseItem(normalizedItem);
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const cell = player.inventory[slot];
    if (!fractionWarehouseCellMatches(cell, base, rawItem)) return null;
    const token = String(cell);
    player.inventory[slot] = null;
    return token;
}

function removeSingleFractionWarehouseItemFromPlayer(player, item) {
    return takeWholeFractionWarehouseItemFromPlayer(player, item, item) != null;
}

/** Название предмета для логов — как подпись в инвентаре. */
function formatFractionWarehouseLogItem(rawItem, qty) {
    const base = normalizeFractionWarehouseItem(rawItem);
    if (!base) return 'предмет';

    let name = '';
    if (base.startsWith('ic1.') || base.startsWith('frdef:')) {
        name = (typeof global.clothTokenDropLabel === 'function' && global.clothTokenDropLabel(base)) || 'Одежда';
    } else if (base.startsWith('ivhol:')) {
        if (base === 'ivhol:cobura') name = 'Чёрная Кобура';
        else if (base === 'ivhol:coburaw') name = 'Белая Кобура';
        else name = 'Кобура';
    } else if (base.startsWith('ivbag:')) {
        const k = base.slice(6);
        const reg = global.DONATE_BAGS_REGISTRY;
        name = (reg && reg[k] && reg[k].name) ? reg[k].name : 'Сумка';
    } else if (base === 'Бронежилет') {
        name = 'Бронежилет';
    } else if (global.formweap) {
        name = global.formweap(base);
    } else {
        name = base.replace(/^item_/, '').replace(/^iten_/, '');
    }

    const q = parseInt(qty, 10);
    if (Number.isFinite(q) && q > 1) return `${name} (${q})`;
    return name;
}

function removeConsumableQtyFromPlayerFrac(player, baseName, qty) {
    return require('./config/combat_loadout.js').removeStackQtyFromPlayer(player, baseName, qty);
}

function removeConsumableQtyFromPlayerFracSlot(player, baseName, qty, slotRaw) {
    const slot = parseInt(slotRaw, 10);
    if (!mp.players.exists(player) || !Number.isInteger(slot) || slot < 0 || qty < 1) return false;
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const { base, count } = parseFractionStackEntry(player.inventory[slot]);
    if (base !== baseName || count < qty) return false;
    player.inventory[slot] = count === qty ? null : formatFractionStackEntry(baseName, count - qty);
    return true;
}

function addConsumableQtyToPlayerFrac(player, baseName, qty) {
    if (!mp.players.exists(player) || qty < 1) return;
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    let left = qty;
    for (let i = 0; i < player.inventory.length && left > 0; i++) {
        const { base, count } = parseFractionStackEntry(player.inventory[i]);
        if (base !== baseName) continue;
        player.inventory[i] = formatFractionStackEntry(baseName, count + left);
        left = 0;
        break;
    }
    if (left > 0) player.inventory.push(formatFractionStackEntry(baseName, left));
}

function addToFractionWarehouseStack(stock, baseName, qty) {
    if (!Array.isArray(stock) || qty < 1) return;
    for (let i = 0; i < stock.length; i++) {
        const { base, count } = parseFractionStackEntry(stock[i]);
        if (base !== baseName) continue;
        stock[i] = formatFractionStackEntry(baseName, count + qty);
        return;
    }
    stock.push(formatFractionStackEntry(baseName, qty));
}

function removeFromFractionWarehouseStack(stock, baseName, qty) {
    if (!Array.isArray(stock) || qty < 1) return false;
    let need = qty;
    for (let i = 0; i < stock.length && need > 0; i++) {
        const { base, count } = parseFractionStackEntry(stock[i]);
        if (base !== baseName) continue;
        if (count <= need) {
            need -= count;
            stock.splice(i, 1);
            i--;
        } else {
            stock[i] = formatFractionStackEntry(baseName, count - need);
            need = 0;
        }
    }
    return need === 0;
}

function removeFromFractionWarehouseStackSlot(stock, baseName, qty, slotRaw) {
    const slot = parseInt(slotRaw, 10);
    if (!Array.isArray(stock) || !Number.isInteger(slot) || slot < 0 || slot >= stock.length || qty < 1) return false;
    const { base, count } = parseFractionStackEntry(stock[slot]);
    if (base !== baseName || count < qty) return false;
    if (count === qty) stock.splice(slot, 1);
    else stock[slot] = formatFractionStackEntry(baseName, count - qty);
    return true;
}

function countConsumableOnFractionWarehouse(stock, baseName) {
    let n = 0;
    (stock || []).forEach((e) => {
        const { base, count } = parseFractionStackEntry(e);
        if (base === baseName) n += count;
    });
    return n;
}

function fractionWarehouseHasStackForBase(stock, baseName) {
    return (stock || []).some((e) => parseFractionStackEntry(e).base === baseName);
}

function countConsumableOnPlayerFrac(player, baseName) {
    return countStackBaseOnPlayer(player, baseName);
}

function itemNotAllowedInFractionWarehouse(item) {
    const itemName = normalizeFractionWarehouseItem(item);
    if (!itemName) return 'Некорректный предмет.';
    if (itemName === global.MATERIALS_ITEM || itemName === 'item_materials') {
        return 'Материалы передаются только лидером через отдельный слот на складе.';
    }
    const fixName = global.formweap ? global.formweap(itemName) : itemName;
    if (fixName === 'Revolver') return 'Базовый револьвер нельзя переложить.';
    if (fixName === 'Musket') return 'Это оружие нельзя класть на склад.';
    return null;
}

function buildFractionWarehousePayload(fracData, player) {
    const rank = playerFractionRank(player);
    return {
        items: Array.isArray(fracData.stock) ? fracData.stock : [],
        capacity: MAX_FRACTION_WAREHOUSE_ITEMS,
        materials: parseInt(fracData.materials, 10) || 0,
        canMaterials: rank === 10
    };
}

function pushFractionWarehouseUI(player, fracData) {
    if (!mp.players.exists(player)) return;
    if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
        if (typeof global.loadInventory === 'function') global.loadInventory(player);
        return isNotify(player, 1, 'top-mid', 'Инвентарь подгружается — нажмите E у склада ещё раз.', 2800);
    }
    player.call('fractionWarehouse:open:c', [
        JSON.stringify(player.inventory),
        JSON.stringify(player.fastSlots),
        JSON.stringify(buildFractionWarehousePayload(fracData, player))
    ]);
}

function refreshFractionWarehouseUI(player, fracData) {
    if (!mp.players.exists(player)) return;
    if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) return;
    player.call('fractionWarehouse:update:c', [
        JSON.stringify(player.inventory),
        JSON.stringify(player.fastSlots),
        JSON.stringify(buildFractionWarehousePayload(fracData, player))
    ]);
}

function getFractionWarehouseAccess(player) {
    const fid = playerFractionId(player);
    const rank = playerFractionRank(player);
    const fracData = global.fractionsData[fid];
    if (!fracData) return { ok: false, msg: 'Фракция не найдена.' };
    const open = fracData.warehouseOpen !== false;
    if (open) {
        if (!rankHasPerm(fracData, rank, 'warehouseAccess'))
            return { ok: false, msg: 'Нет доступа к открытому складу фракции.' };
        return { ok: true, fid, fracData };
    }
    if (!rankHasPerm(fracData, rank, 'warehouseClosedAccess'))
        return { ok: false, msg: 'Склад фракции закрыт.' };
    return { ok: true, fid, fracData };
}

mp.events.add('fraction:warehouse:toggle:s', (player, openRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        const rank = playerFractionRank(player);
        const fracData = global.fractionsData[fid];
        if (!fid || !fracData) return;
        if (!rankHasPerm(fracData, rank, 'warehouseToggle'))
            return isNotify(player, 2, 'top-mid', 'Нет права открывать и закрывать склад.', 3500);
        const open = openRaw === true || openRaw === 1 || openRaw === '1' || String(openRaw).toLowerCase() === 'true';
        fracData.warehouseOpen = open;
        saveFraction(fid, null);
        logFractionAction(fid, player, 'warehouse_toggle', open ? 'Склад открыт' : 'Склад закрыт');
        isNotify(player, 3, 'top-mid', open ? 'Склад фракции открыт.' : 'Склад фракции закрыт.', 3000);
        mp.players.forEach((tp) => {
            if (!mp.players.exists(tp) || !tp.getVariable('auth')) return;
            if (playerFractionId(tp) !== fid) return;
            try { tp.call('fraction:warehouse:toggle:c', [open ? 1 : 0]); } catch (_e2) {}
        });
    } catch (e) { console.log('[FRACTIONS] warehouse:toggle:', e.message || e); }
});

mp.events.add('fraction:warehouse:use:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.dimension !== 0) return;
        if (player.vehicle) return isNotify(player, 2, 'top-mid', 'Выйдите из транспорта.', 3000);
        if (!playerAtFractionWarehouse(player))
            return isNotify(player, 2, 'top-mid', 'Подойдите к складу фракции.', 3000);

        const access = getFractionWarehouseAccess(player);
        if (!access.ok) return isNotify(player, 2, 'top-mid', access.msg, 3000);

        pushFractionWarehouseUI(player, access.fracData);
    } catch (e) { console.log('[FRACTIONS] warehouse:use:', e.message || e); }
});

mp.events.add('fraction:materials:withdraw:s', (player, rawQty) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!playerAtFractionWarehouse(player))
            return isNotify(player, 2, 'top-mid', 'Подойдите к складу фракции.', 3000);
        const fid = playerFractionId(player);
        if (!fid || !isLeader(player))
            return isNotify(player, 2, 'top-mid', 'Материалы со склада может забирать только лидер.', 3500);
        const fracData = global.fractionsData[fid];
        if (!fracData) return;
        const qtyParsed = parseInt(String(rawQty == null ? '1' : rawQty).replace(/\D/g, ''), 10);
        const qty = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 1;
        const cur = parseInt(fracData.materials, 10) || 0;
        if (cur < qty) return isNotify(player, 2, 'top-mid', 'На складе недостаточно материалов.', 3000);
        if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
            if (typeof global.loadInventory === 'function') global.loadInventory(player);
            return isNotify(player, 1, 'top-mid', 'Подождите загрузки инвентаря.', 3000);
        }
        if (!global.removeFactionMaterials(fid, qty)) {
            return isNotify(player, 2, 'top-mid', 'Не удалось списать материалы.', 3000);
        }
        if (typeof global.mergeMaterialsQtyIntoGrid !== 'function'
            || !global.mergeMaterialsQtyIntoGrid(player, qty)) {
            global.addFactionMaterials(fid, qty, () => {});
            return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре для материалов.', 3500);
        }
        if (typeof global.saveInventory === 'function') global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        logFractionAction(fid, player, 'materials_withdraw', `Забрал материалы: ${qty}`);
        refreshFractionWarehouseUI(player, fracData);
        isNotify(player, 3, 'top-mid', `Забрано материалов: ${qty}.`, 3000);
    } catch (e) { console.log('[FRACTIONS] materials:withdraw:', e.message || e); }
});

mp.events.add('fraction:materials:deposit:s', (player, rawQty) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!playerAtFractionWarehouse(player))
            return isNotify(player, 2, 'top-mid', 'Подойдите к складу фракции.', 3000);
        const fid = playerFractionId(player);
        if (!fid || !isLeader(player))
            return isNotify(player, 2, 'top-mid', 'Материалы на склад может класть только лидер.', 3500);
        const fracData = global.fractionsData[fid];
        if (!fracData) return;
        const qtyParsed = parseInt(String(rawQty == null ? '1' : rawQty).replace(/\D/g, ''), 10);
        const qty = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 1;
        if (!Array.isArray(player.inventory)) {
            if (typeof global.loadInventory === 'function') global.loadInventory(player);
            return isNotify(player, 1, 'top-mid', 'Подождите загрузки инвентаря.', 3000);
        }
        if (typeof global.removeMaterialsQtyFromPlayer !== 'function'
            || !global.removeMaterialsQtyFromPlayer(player, qty)) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно материалов в инвентаре.', 3000);
        }
        global.addFactionMaterials(fid, qty, (err) => {
            if (err) return isNotify(player, 2, 'top-mid', 'Не удалось положить материалы на склад.', 3000);
            if (typeof global.saveInventory === 'function') global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            logFractionAction(fid, player, 'materials_deposit', `Положил материалы: ${qty}`);
            refreshFractionWarehouseUI(player, fracData);
            isNotify(player, 3, 'top-mid', `На склад положено материалов: ${qty}.`, 3000);
        });
    } catch (e) { console.log('[FRACTIONS] materials:deposit:', e.message || e); }
});

mp.events.add('fraction:warehouse:deposit:s', (player, rawItem, rawQty, rawSlot) => {
    let whLockedFid = null;
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!playerAtFractionWarehouse(player))
            return isNotify(player, 2, 'top-mid', 'Подойдите к складу фракции.', 3000);

        const access = getFractionWarehouseAccess(player);
        if (!access.ok) return isNotify(player, 2, 'top-mid', access.msg, 3000);
        if (!beginFractionWarehouseOp(access.fid)) {
            return isNotify(player, 2, 'top-mid', 'Склад занят другой операцией, подождите.', 2500);
        }
        whLockedFid = access.fid;

        const rawItemFull = String(rawItem == null ? '' : rawItem).trim();
        const item = normalizeFractionWarehouseItem(rawItemFull);
        const deny = itemNotAllowedInFractionWarehouse(item);
        if (deny) return isNotify(player, 2, 'top-mid', deny, 3500);
        const slotIndex = parseInt(rawSlot, 10);
        const hasSlotIndex = Number.isInteger(slotIndex) && slotIndex >= 0;
        if (
            !hasSlotIndex &&
            typeof global.inventoryItemIsBlockedForTransfer === 'function' &&
            global.inventoryItemIsBlockedForTransfer(player, rawItemFull || item)
        ) {
            return isNotify(player, 2, 'top-mid', 'Снимите предмет с экипировки или из быстрого слота — на склад его положить нельзя.', 4500);
        }
        if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
            if (typeof global.loadInventory === 'function') global.loadInventory(player);
            return isNotify(player, 1, 'top-mid', 'Подождите загрузки инвентаря и повторите.', 3000);
        }

        const qtyParsed = parseInt(String(rawQty == null ? '1' : rawQty).replace(/[^\d-]/g, ''), 10);
        let qtyWant = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 1;
        const stackMode = isFractionWarehouseStackItem(item);
        if (qtyParsed === -1 && stackMode) {
            qtyWant = hasSlotIndex
                ? Math.max(1, parseFractionStackEntry(player.inventory[slotIndex]).count || 1)
                : Math.max(1, countConsumableOnPlayerFrac(player, item) || 1);
        }
        const depositQty = stackMode ? qtyWant : 1;
        const { fid, fracData } = access;
        const stock = fracData.stock;

        if (stackMode) {
            const have = hasSlotIndex ? parseFractionStackEntry(player.inventory[slotIndex]).count : countConsumableOnPlayerFrac(player, item);
            if (have < depositQty)
                return isNotify(player, 2, 'top-mid', 'Недостаточно предметов в инвентаре.', 3000);
            if (!fractionWarehouseHasStackForBase(stock, item) && stock.length >= MAX_FRACTION_WAREHOUSE_ITEMS)
                return isNotify(player, 2, 'top-mid', 'Склад фракции переполнен.', 3000);
            const removed = hasSlotIndex
                ? removeConsumableQtyFromPlayerFracSlot(player, item, depositQty, slotIndex)
                : removeConsumableQtyFromPlayerFrac(player, item, depositQty);
            if (!removed)
                return isNotify(player, 2, 'top-mid', 'Предмет не найден в инвентаре.', 3000);
            addToFractionWarehouseStack(stock, item, depositQty);
        } else {
            if (stock.length >= MAX_FRACTION_WAREHOUSE_ITEMS)
                return isNotify(player, 2, 'top-mid', 'Склад фракции переполнен.', 3000);
            const removedToken = hasSlotIndex
                ? takeWholeFractionWarehouseItemFromPlayerSlot(player, item, rawItemFull, slotIndex)
                : takeWholeFractionWarehouseItemFromPlayer(player, item, rawItemFull);
            if (!removedToken) return isNotify(player, 2, 'top-mid', 'Предмет не найден в инвентаре.', 3000);
            stock.push(removedToken);
        }

        if (typeof global.saveInventory === 'function') global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        saveFraction(fid, null);
        logFractionAction(fid, player, 'warehouse_deposit',
            `Положил на склад: ${formatFractionWarehouseLogItem(item, stackMode ? depositQty : 1)}`);
        refreshFractionWarehouseUI(player, fracData);
    } catch (e) { console.log('[FRACTIONS] warehouse:deposit:', e.message || e); }
    finally {
        if (whLockedFid != null) endFractionWarehouseOp(whLockedFid);
    }
});

mp.events.add('fraction:warehouse:withdraw:s', (player, rawItem, rawQty, rawSlot) => {
    let whLockedFid = null;
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!playerAtFractionWarehouse(player))
            return isNotify(player, 2, 'top-mid', 'Подойдите к складу фракции.', 3000);

        const access = getFractionWarehouseAccess(player);
        if (!access.ok) return isNotify(player, 2, 'top-mid', access.msg, 3000);
        if (!beginFractionWarehouseOp(access.fid)) {
            return isNotify(player, 2, 'top-mid', 'Склад занят другой операцией, подождите.', 2500);
        }
        whLockedFid = access.fid;

        const rawItemFull = String(rawItem == null ? '' : rawItem).trim();
        const item = normalizeFractionWarehouseItem(rawItemFull);
        if (!item) return;
        if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
            if (typeof global.loadInventory === 'function') global.loadInventory(player);
            return isNotify(player, 1, 'top-mid', 'Подождите загрузки инвентаря и повторите.', 3000);
        }

        const slotIndex = parseInt(rawSlot, 10);
        const hasSlotIndex = Number.isInteger(slotIndex) && slotIndex >= 0;
        const qtyParsed = parseInt(String(rawQty == null ? '1' : rawQty).replace(/[^\d-]/g, ''), 10);
        let qtyWant = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 1;
        const stackMode = isFractionWarehouseStackItem(item);
        if (qtyParsed === -1 && stackMode) {
            qtyWant = hasSlotIndex
                ? Math.max(1, parseFractionStackEntry(access.fracData.stock[slotIndex]).count || 1)
                : Math.max(1, countConsumableOnFractionWarehouse(access.fracData.stock, item) || 1);
        }
        const withdrawQty = stackMode ? qtyWant : 1;
        const { fid, fracData } = access;
        const stock = fracData.stock;

        if (stackMode) {
            const onWh = hasSlotIndex ? parseFractionStackEntry(stock[slotIndex]).count : countConsumableOnFractionWarehouse(stock, item);
            if (onWh < withdrawQty)
                return isNotify(player, 2, 'top-mid', 'На складе недостаточно предметов.', 3000);
            const removed = hasSlotIndex
                ? removeFromFractionWarehouseStackSlot(stock, item, withdrawQty, slotIndex)
                : removeFromFractionWarehouseStack(stock, item, withdrawQty);
            if (!removed)
                return isNotify(player, 2, 'top-mid', 'Предмета нет на складе.', 3000);
            addConsumableQtyToPlayerFrac(player, item, withdrawQty);
        } else {
            const wi = hasSlotIndex && fractionWarehouseCellMatches(stock[slotIndex], item, rawItemFull)
                ? slotIndex
                : findFractionWarehouseEntryIndex(stock, item, rawItemFull);
            if (wi === -1) return isNotify(player, 2, 'top-mid', 'Предмета нет на складе.', 3000);
            const token = stock[wi];
            stock.splice(wi, 1);
            let pushed = false;
            if (typeof global.invGridTryPush === 'function') {
                pushed = global.invGridTryPush(player, token);
            } else {
                player.inventory.push(token);
                pushed = true;
            }
            if (!pushed) {
                stock.splice(wi, 0, token);
                return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
            }
        }

        if (typeof global.saveInventory === 'function') global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        saveFraction(fid, null);
        logFractionAction(fid, player, 'warehouse_withdraw',
            `Забрал со склада: ${formatFractionWarehouseLogItem(item, stackMode ? withdrawQty : 1)}`);
        refreshFractionWarehouseUI(player, fracData);
    } catch (e) { console.log('[FRACTIONS] warehouse:withdraw:', e.message || e); }
    finally {
        if (whLockedFid != null) endFractionWarehouseOp(whLockedFid);
    }
});

mp.events.add('fraction:warehouse:swap:s', (player, rawFrom, rawTo) => {
    let whLockedFid = null;
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!playerAtFractionWarehouse(player))
            return isNotify(player, 2, 'top-mid', 'Подойдите к складу фракции.', 3000);
        const access = getFractionWarehouseAccess(player);
        if (!access.ok) return isNotify(player, 2, 'top-mid', access.msg, 3000);
        const fromIdx = parseInt(rawFrom, 10);
        const toIdx = parseInt(rawTo, 10);
        if (!Number.isInteger(fromIdx) || !Number.isInteger(toIdx) || fromIdx < 0 || toIdx < 0 || fromIdx === toIdx)
            return;
        if (!beginFractionWarehouseOp(access.fid)) {
            return isNotify(player, 2, 'top-mid', 'Склад занят другой операцией, подождите.', 2500);
        }
        whLockedFid = access.fid;
        const stock = access.fracData.stock;
        if (!Array.isArray(stock)) return;
        while (stock.length <= Math.max(fromIdx, toIdx)) stock.push(null);
        if (fromIdx >= MAX_FRACTION_WAREHOUSE_ITEMS || toIdx >= MAX_FRACTION_WAREHOUSE_ITEMS) return;
        const a = stock[fromIdx] || null;
        const b = stock[toIdx] || null;
        stock[fromIdx] = b;
        stock[toIdx] = a;
        for (let i = stock.length - 1; i >= 0; i--) {
            if (stock[i] == null || stock[i] === '') stock.pop();
            else break;
        }
        saveFraction(access.fid, null);
        refreshFractionWarehouseUI(player, access.fracData);
    } catch (e) { console.log('[FRACTIONS] warehouse:swap:', e.message || e); }
    finally {
        if (whLockedFid != null) endFractionWarehouseOp(whLockedFid);
    }
});

// ─── Планшет: зоны гетто ──────────────────────────────────────────────────────
mp.events.add('fraction:zones:request:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!BIZWAR_FRACTIONS.has(fid)) return;
        const payload = JSON.stringify(global.gangZones);
        player.call('fraction:zones:update', [payload]);
        const fracData = global.fractionsData[fid];
        player.call('fraction:warMap:materials:c', [parseInt(fracData && fracData.materials, 10) || 0]);
    } catch (e) { console.log('[FRACTIONS] zones:request:', e.message || e); }
});

// ─── Планшет: рейтинг фракций ────────────────────────────────────────────────
mp.events.add('fraction:rating:request:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!BIZWAR_FRACTIONS.has(fid)) return;
        const zoneCounts = {};
        Object.values(global.gangZones).forEach(gid => {
            if (gid > 0) zoneCounts[gid] = (zoneCounts[gid] || 0) + 1;
        });
        const rating = [];
        for (const fid of [1, 2, 3, 4, 5]) {
            const fdata = global.fractionsData[fid];
            rating.push({
                id: fid,
                name: fdata ? fdata.name : FACTION_NAMES[fid],
                color: FACTION_COLORS[fid] || '#888',
                zones: zoneCounts[fid] || 0
            });
        }
        rating.sort((a, b) => b.zones - a.zones);
        const withZones = rating.filter((row) => (parseInt(row.zones, 10) || 0) > 0);
        player.call('fraction:rating:data:c', [JSON.stringify(withZones)]);
    } catch (e) { console.log('[FRACTIONS] rating:request:', e.message || e); }
});

// ─── Планшет: логи фракции ────────────────────────────────────────────────────
mp.events.add('fraction:logs:request:s', (player, searchRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!fid) return;
        const fracData = global.fractionsData[fid];
        const rank = playerFractionRank(player);
        if (!isLeader(player) && !rankHasPerm(fracData, rank, 'canLogs')) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно прав для просмотра логов.', 3000);
        }

        const search = String(searchRaw || '').trim().slice(0, 64);
        let sql = 'SELECT id, actor_static, actor_name, action_type, action_text, created_at FROM fraction_logs WHERE fraction_id=?';
        const params = [fid];

        if (search) {
            const asNum = parseInt(search, 10);
            if (!isNaN(asNum) && String(asNum) === search) {
                sql += ' AND (actor_static=? OR id=?)';
                params.push(asNum, asNum);
            } else {
                sql += ' AND (action_text LIKE ? OR actor_name LIKE ? OR action_type LIKE ?)';
                const like = `%${search}%`;
                params.push(like, like, like);
            }
        }

        sql += ' ORDER BY id DESC LIMIT 200';

        global.DB.query(sql, params, (err, rows) => {
            if (err) {
                console.log('[FRACTIONS] logs:request:', err.message || err);
                try { isNotify(player, 2, 'top-mid', 'Не удалось загрузить логи.', 3000); } catch (_e) {}
                try { player.call('fraction:logs:data:c', ['[]']); } catch (_e2) {}
                return;
            }
            const payload = JSON.stringify((rows || []).map(r => ({
                id: r.id,
                static: r.actor_static,
                name: r.actor_name,
                type: r.action_type,
                text: r.action_text,
                time: r.created_at
            })));
            player.call('fraction:logs:data:c', [payload]);
        });
    } catch (e) { console.log('[FRACTIONS] logs:request:', e.message || e); }
});

// ─── Внутренний helper: синхронизировать зоны на одного игрока ────────────────
global.fractionSyncZonesToPlayer = function(player) {
    try {
        if (!player || !mp.players.exists(player)) return;
        const payload = JSON.stringify(global.gangZones || {});
        player.call('fraction:zones:update', [payload]);
    } catch (_) {}
};

// Принудительная синхронизация после готовности игрока (игрок сам запросит)
mp.events.add('fraction:zones:ready:s', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        const payload = JSON.stringify(global.gangZones || {});
        player.call('fraction:zones:update', [payload]);
        syncBizwarTpForPlayer(player);
        if (typeof global.scheduleSyncActiveWarsForPlayer === 'function') {
            global.scheduleSyncActiveWarsForPlayer(player, 800);
        }
    } catch (_) {}
});

// ─── Хук: после капта обновить зону ─────────────────────────────────────────
/**
 * Если capt-зона захвачена семьёй, находим её ближайшую фракцию и обновляем gangid.
 * Вызов: global.fractionOnCaptWin(pointId, winnerFamilyName)
 */
global.fractionOnCaptWin = function(pointId, winnerFamilyName) {
    try {
        if (!pointId || !winnerFamilyName) return;
        // Определить фракцию по имени семьи (если семья не совпадает — пропустить)
        // Нужна карта "семья → фракция", которую может настроить сервер.
        // Пока оставляем хук пустым — зоны обновляются через /setzone вручную.
        // TODO: добавить маппинг family→fraction когда семьи будут привязаны.
    } catch (e) {}
};

// ─── Синхронизировать зоны при входе игрока ──────────────────────────────────
mp.events.add('fraction:syncOnJoin', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const payload = JSON.stringify(global.gangZones);
        player.call('fraction:zones:update', [payload]);
        syncBizwarTpForPlayer(player);
        if (typeof global.scheduleSyncActiveWarsForPlayer === 'function') {
            global.scheduleSyncActiveWarsForPlayer(player, 1000);
        }
    } catch (_) {}
});

// ═══════════════════════════════════════════════════════════════════════════
// ── BIZWAR SYSTEM ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** Калибры — packages/server/config/capt_bizwar_calibers.js */

/** Бронежилет-предмет (как в инвентаре / capt) */
const BIZWAR_ARMOR_ITEM = 'Бронежилет';
const BIZWAR_SPANK_ITEM = 'item_spank';
const BIZWAR_ALCO_ITEM = 'item_alco';

function bizwarItemBaseName(item) {
    if (!item) return '';
    return String(item).split('(')[0].trim();
}
/** Максимум бронежилетов в инвентаре (включая одетый) */
const BIZWAR_ARMOR_MAX = 5;

/**
 * Активные капты:
 * { [zoneId]: { attackerFrac, defenderFrac, calibers:string[], count:number,
 *               allowArmor:bool, allowSpunk:bool, allowAlco:bool,
 *               startedAt:number, players:{[static]:side} } }
 */
global.activeBizwars = global.activeBizwars || {};

/**
 * Cooldown-записи:
 * { [fracId]: { anyAttackUntil:number, nextPointUntil:number } }
 */
const bizwarCooldowns = {};

function getBizwarCooldown(fracId) {
    if (!bizwarCooldowns[fracId]) bizwarCooldowns[fracId] = { anyAttackUntil: 0, nextPointUntil: 0 };
    return bizwarCooldowns[fracId];
}

/** Кол-во онлайн-игроков данной фракции с доступом к капту */
function countFracOnline(fracId) {
    let n = 0;
    const fracData = global.fractionsData[fracId];
    mp.players.forEach(p => {
        if (!mp.players.exists(p) || !p.getVariable('auth')) return;
        if (playerFractionId(p) !== fracId) return;
        const rank = playerFractionRank(p);
        if (rankHasPerm(fracData, rank, 'bizwar')) n++;
    });
    return n;
}

/** Разослать состояние зоны всем — флаш (атакована/нет) */
function broadcastZoneFlash(zoneId, state) {
    try {
        mp.players.forEach(p => {
            if (p && mp.players.exists(p) && p.getVariable('auth')) {
                try { p.call('fraction:zone:setFlash', [zoneId, state]); } catch (_) {}
            }
        });
    } catch (_) {}
}

function getActiveBizwarZonesForFraction(fid) {
    const zones = [];
    if (!fid) return zones;
    for (const [zidStr, bw] of Object.entries(global.activeBizwars || {})) {
        if (!bw) continue;
        const zid = parseInt(zidStr, 10);
        if (!Number.isFinite(zid)) continue;
        if (bw.attackerFrac === fid || bw.defenderFrac === fid) zones.push(zid);
    }
    return zones;
}

function getFirstActiveBizwarZoneId(excludeZoneId) {
    for (const [zidStr, bw] of Object.entries(global.activeBizwars || {})) {
        if (!bw) continue;
        const zid = parseInt(zidStr, 10);
        if (!Number.isFinite(zid)) continue;
        if (excludeZoneId != null && zid === excludeZoneId) continue;
        return zid;
    }
    return null;
}

function syncBizwarTpForPlayer(player) {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!BIZWAR_FRACTIONS.has(fid)) {
            player.call('bizwar:hq:sync', ['[]']);
            return;
        }
        player.call('bizwar:hq:sync', [JSON.stringify(getActiveBizwarZonesForFraction(fid))]);
    } catch (_) {}
}

function broadcastBizwarTpSync(...fractionIds) {
    const set = new Set(fractionIds.filter(fid => BIZWAR_FRACTIONS.has(fid)));
    if (set.size === 0) return;
    mp.players.forEach(p => {
        if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
        const pf = playerFractionId(p);
        if (set.has(pf)) syncBizwarTpForPlayer(p);
    });
}

const BIZWAR_PREP_MS = 8 * 60 * 1000;
const BIZWAR_NEUTRAL_HOLD_MS = 20 * 1000;
const BIZWAR_MAX_MS = 20 * 60 * 1000;
const BIZWAR_PREP_FALL_EXTRA_Z = 1.15;
const BIZWAR_MIN_TEAM_PLAYERS = 3;
const BIZWAR_MAX_TEAM_PLAYERS = 10;
const BIZWAR_ONLY_CALIBER = '11.43mm';
const BIZWAR_DEF_COOLDOWN_MS = 10 * 60 * 1000;
const BIZWAR_ATTACK_COOLDOWN_MS = 10 * 60 * 1000;
/** Ночной запрет каптов (МСК): с 01:00 включительно до 08:00 исключительно. */
const BIZWAR_NIGHT_LOCK_START_HOUR_MSK = 1;
const BIZWAR_NIGHT_LOCK_END_HOUR_MSK = 8;
const bizwarPreviousZoneOwners = {};

function isBizwarNightLocked() {
    try {
        const hour = moment().tz('Europe/Moscow').hour();
        return hour >= BIZWAR_NIGHT_LOCK_START_HOUR_MSK && hour < BIZWAR_NIGHT_LOCK_END_HOUR_MSK;
    } catch (_e) {
        const hour = (new Date().getUTCHours() + 3) % 24;
        return hour >= BIZWAR_NIGHT_LOCK_START_HOUR_MSK && hour < BIZWAR_NIGHT_LOCK_END_HOUR_MSK;
    }
}

function bizwarNightLockMessage() {
    return `Ночью нельзя забивать капт (${String(BIZWAR_NIGHT_LOCK_START_HOUR_MSK).padStart(2, '0')}:00–${String(BIZWAR_NIGHT_LOCK_END_HOUR_MSK).padStart(2, '0')}:00 МСК).`;
}

function isBizwarCounterDefAttack(attackerFrac, zoneId, ownerFrac) {
    const atk = Number(attackerFrac) || 0;
    const owner = Number(ownerFrac) || 0;
    if (!atk || !owner || atk === owner) return false;
    return Number(bizwarPreviousZoneOwners[zoneId]) === atk;
}

function bizwarDimension(zoneId) {
    return 3000 + zoneId;
}

function countBizwarSideOnlineInDim(zoneId, fracId, excludePlayer) {
    if (!fracId) return 0;
    const dim = bizwarDimension(zoneId);
    let n = 0;
    mp.players.forEach((p) => {
        if (!mp.players.exists(p) || !p.getVariable('auth')) return;
        if (excludePlayer && p === excludePlayer) return;
        if (p.dimension !== dim || p.getVariable('dead')) return;
        if (p.getVariable('inBizwar') !== true) return;
        if (playerFractionId(p) === fracId) n++;
    });
    return n;
}

function countBizwarRegisteredSide(bw, fracId, excludeStatic) {
    if (!bw || !fracId || !bw.players) return 0;
    const side = bw.attackerFrac === fracId ? 'attack' : (bw.defenderFrac === fracId ? 'defend' : '');
    if (!side) return 0;
    let n = 0;
    for (const [staticId, playerSide] of Object.entries(bw.players)) {
        if (excludeStatic != null && String(staticId) === String(excludeStatic)) continue;
        if (playerSide === side) n++;
    }
    return n;
}

function clearBizwarCombatFlags(player) {
    if (!mp.players.exists(player)) return;
    try {
        player.setVariable('bizwarFrozen', null);
        player.setVariable('bizwarRegDamage', null);
        player.setVariable('captAllowArmor', null);
        player.setVariable('captAllowSpank', null);
        player.setVariable('captAllowAlco', null);
        player.call('captBattle:hide');
        player.call('captArena:clear');
    } catch (_) {}
}

function tickActiveBizwars() {
    const now = Date.now();
    for (const [zidStr, bw] of Object.entries(global.activeBizwars || {})) {
        if (!bw || bw.ending) continue;
        const zoneId = parseInt(zidStr, 10);
        if (!Number.isFinite(zoneId)) continue;

        const dim = bizwarDimension(zoneId);
        const elapsed = now - bw.startedAt;
        const prepLeftSec = Math.max(0, Math.floor((BIZWAR_PREP_MS - elapsed) / 1000));
        const atkName = getFractionName(bw.attackerFrac);
        const defName = bw.defenderFrac > 0 ? getFractionName(bw.defenderFrac) : 'Нейтрально';
        const atkCount = countBizwarSideOnlineInDim(zoneId, bw.attackerFrac);
        const defCount = bw.defenderFrac > 0 ? countBizwarSideOnlineInDim(zoneId, bw.defenderFrac) : 0;

        let totalLeftSec;
        if (bw.defenderFrac === 0 && bw.isStarted && bw.fightStartedAt) {
            totalLeftSec = Math.max(0, Math.floor((BIZWAR_NEUTRAL_HOLD_MS - (now - bw.fightStartedAt)) / 1000));
        } else {
            totalLeftSec = Math.max(0, Math.floor((BIZWAR_MAX_MS - elapsed) / 1000));
        }

        const formatTime = (sec) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
        const canTeleport = elapsed < BIZWAR_MAX_MS;
        const teleportLeftSec = prepLeftSec;

        mp.players.forEach((p) => {
            if (!mp.players.exists(p) || !p.getVariable('auth')) return;
            const inDim = p.dimension === dim && bw.players[p.static];
            if (!inDim) return;
            if (!bw.allowArmor) {
                if (p.armour > 0) p.armour = 0;
                if (p.getVariable('armor')) {
                    p.setVariable('armor', null);
                    p.setClothes(9, 0, 0, 0);
                }
            }
            p.call('captBattle:update', [
                atkName, defName, atkCount, defCount,
                prepLeftSec, formatTime(totalLeftSec),
                canTeleport, formatTime(teleportLeftSec), totalLeftSec
            ]);
        });

        if (!bw.isStarted && elapsed >= BIZWAR_PREP_MS) {
            bw.isStarted = true;
            bw.fightStartedAt = now;
            mp.players.forEach((p) => {
                if (!mp.players.exists(p) || !p.getVariable('auth')) return;
                if (p.dimension !== dim || !bw.players[p.static]) return;
                if (typeof global.forceClearGreenZone === 'function') global.forceClearGreenZone(p);
                p.setVariable('bizwarFrozen', false);
                p.setVariable('bizwarRegDamage', true);
                p.call('captBattle:unfreeze');
            });
        }

        if (bw.defenderFrac === 0 && bw.isStarted && bw.fightStartedAt && (now - bw.fightStartedAt >= BIZWAR_NEUTRAL_HOLD_MS)) {
            endBizwar(zoneId, bw.attackerFrac);
            continue;
        }

        // Таймер боя является серверным правилом, а не только отображением HUD.
        if (elapsed >= BIZWAR_MAX_MS) {
            endBizwar(zoneId, bw.defenderFrac > 0 ? bw.defenderFrac : bw.attackerFrac);
            continue;
        }

        if (bw.isStarted && bw.defenderFrac > 0 && elapsed > BIZWAR_PREP_MS + 10000) {
            if (atkCount === 0 && defCount > 0) {
                endBizwar(zoneId, bw.defenderFrac);
                continue;
            }
            if (defCount === 0 && atkCount > 0) {
                endBizwar(zoneId, bw.attackerFrac);
                continue;
            }
        }

        if (bw.isStarted) {
            const cx = bw.arenaCx;
            const cy = bw.arenaCy;
            const arenaR = bw.arenaRadius;
            if (typeof cx === 'number' && typeof cy === 'number' && typeof arenaR === 'number') {
                mp.players.forEach((p) => {
                    if (!p.getVariable('auth') || p.dimension !== dim || !mp.players.exists(p)) return;
                    if (!bw.players[p.static]) return;
                    if (p.getVariable('dead')) return;
                    const dx = p.position.x - cx;
                    const dy = p.position.y - cy;
                    if (Math.hypot(dx, dy) > arenaR) {
                        const nh = Math.max(0, (p.health || 0) - 10);
                        p.health = nh;
                    }
                });
            }
        }
    }
}

setInterval(tickActiveBizwars, 1000);

function teleportBizwarPlayerToFractionBase(player) {
    if (!mp.players.exists(player)) return;
    const fid = playerFractionId(player);
    if (typeof global.revivePlayerAlive === 'function') {
        global.revivePlayerAlive(player);
    } else {
        player.health = 100;
        player.setVariable('dead', false);
        try {
            player.call('reviveCancel');
        } catch (_e) {}
    }
    player.dimension = 0;
    const hqTp = BIZWAR_TP_POSITIONS[fid];
    if (hqTp && player.bizwarReturnTp === 'hq') {
        const pos = new mp.Vector3(hqTp.x, hqTp.y, hqTp.z);
        try {
            player.spawn(pos);
        } catch (_e) {
            player.position = pos;
        }
        if (hqTp.h != null) player.heading = hqTp.h;
        delete player.bizwarReturnTp;
        return;
    }
    delete player.bizwarReturnTp;
    const sp = global.FRACTION_SPAWN_BY_ID && global.FRACTION_SPAWN_BY_ID[fid];
    if (sp) {
        const pos = new mp.Vector3(sp.x, sp.y, sp.z);
        try {
            player.spawn(pos);
        } catch (_e) {
            player.position = pos;
        }
        if (sp.h != null) player.heading = sp.h;
    } else {
        player.position = new mp.Vector3(-524.01, -240.37, 36.08);
    }
}

/** Завершить капт (победа / вышел лимит) */
function endBizwar(zoneId, winnerFrac) {
    const bw = global.activeBizwars[zoneId];
    if (!bw || bw.ending) return;
    bw.ending = true;

    const defFrac   = bw.defenderFrac;
    const atkFrac   = bw.attackerFrac;
    const oldOwnerFrac = global.gangZones[zoneId] || 0;

    if (typeof global.finalizeCaptCombatStats === 'function') {
        global.finalizeCaptCombatStats({
            kind: 'bizwar',
            battleId: zoneId,
            battle: bw,
            winnerLabel: getFractionName(winnerFrac),
            attackerLabel: getFractionName(atkFrac),
            defenderLabel: defFrac > 0 ? getFractionName(defFrac) : 'Нейтрально',
            zoneLabel: `Капт #${zoneId}`
        });
    }

    // Сразу обновить цвет и владельца на карте
    saveGangZone(zoneId, winnerFrac);
    if (oldOwnerFrac && oldOwnerFrac !== winnerFrac) {
        bizwarPreviousZoneOwners[zoneId] = oldOwnerFrac;
    }
    broadcastZoneColor(zoneId, winnerFrac);
    broadcastZoneFlash(zoneId, false);
    if (typeof global.broadcastBizwarWarAlertClear === 'function') {
        global.broadcastBizwarWarAlertClear(atkFrac, defFrac);
    }

    // Вернуть всех участников на базу своей фракции (убитые остаются мёртвыми)
    mp.players.forEach(p => {
        if (!mp.players.exists(p)) return;
        const side = bw.players[p.static];
        if (!side) return;
        try {
            p.setVariable('inBizwar', null);
            p.setVariable('bizwarZone', null);
            p.setVariable('bizwarCalibers', null);
            p.setVariable('bizwarAllowArmor', null);
            p.setVariable('bizwarAllowSpunk', null);
            p.setVariable('bizwarAllowAlco', null);
            clearBizwarCombatFlags(p);
            teleportBizwarPlayerToFractionBase(p);
            try { isNotify(p, 1, 'top-mid', `Капт завершён. Победитель: ${getFractionName(winnerFrac)}`, 6000); } catch (_) {}
        } catch (_) {}
    });

    if (defFrac === 0 && winnerFrac === atkFrac) {
        const winName = getFractionName(winnerFrac);
        mp.players.forEach(p => {
            if (!mp.players.exists(p) || !p.getVariable('auth')) return;
            if (playerFractionId(p) !== atkFrac) return;
            try {
                isNotify(p, 1, 'top-mid', `Нейтральная зона #${zoneId} захвачена: ${winName}`, 5000);
                p.call('chat:pushLine', [`!{#dc2626}[КАПТЫ] !{#e8e8e8}${winName} захватили нейтральную зону #${zoneId}.`]);
            } catch (_) {}
        });
    }

    // Cooldown на атаку: атакующая и защищающая фракции
    const now = Date.now();
    for (const fid of [atkFrac, defFrac]) {
        if (!fid) continue;
        const cd = getBizwarCooldown(fid);
        cd.anyAttackUntil = now + BIZWAR_ATTACK_COOLDOWN_MS;
        cd.nextPointUntil = now + BIZWAR_DEF_COOLDOWN_MS;
    }

    const defCdMs = global.CAPT_BIZWAR_DEF_COOLDOWN_MS || BIZWAR_DEF_COOLDOWN_MS;
    if (defFrac > 0 && winnerFrac === defFrac) {
        global.gangZoneDefCooldowns = global.gangZoneDefCooldowns || {};
        global.gangZoneDefCooldowns[zoneId] = now + defCdMs;
        const defCd = getBizwarCooldown(defFrac);
        defCd.nextPointUntil = now + defCdMs;
    }

    // Discord — правка того же сообщения (как у каптов)
    try {
        const dc = bw.discordBizwar;
        if (dc && typeof global.updateDiscordBizwarResult === 'function') {
            global.updateDiscordBizwarResult(dc, getFractionName(winnerFrac));
        }
    } catch (_) {}

    const endMsg = `Капт зона #${zoneId} завершён. Победитель: ${getFractionName(winnerFrac)}`;
    logFractionSystemAction(atkFrac, 'bizwar_end', endMsg);
    if (defFrac > 0 && defFrac !== atkFrac) logFractionSystemAction(defFrac, 'bizwar_end', endMsg);

    mp.players.forEach((p) => {
        if (!mp.players.exists(p) || !p.getVariable('auth')) return;
        const fid = playerFractionId(p);
        if (fid === atkFrac || (defFrac > 0 && fid === defFrac)) p.call('captBattle:hide');
    });

    delete global.activeBizwars[zoneId];
    broadcastBizwarTpSync(atkFrac, defFrac);
    console.log(`[BIZWAR] Zone #${zoneId} ended, winner: frac ${winnerFrac}`);
}

// ─── Запрос открыть меню капта (клик по зоне) ──────────────────────────────
mp.events.add('bizwar:zone:click:s', (player, zoneIdRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        if (!fid || !BIZWAR_FRACTIONS.has(fid)) {
            return isNotify(player, 2, 'top-mid', 'Капт доступен только бандам (1–5).', 3500);
        }
        const fracData = global.fractionsData[fid];
        if (!fracData) {
            return isNotify(player, 2, 'top-mid', 'Данные фракции не загружены. Перезайдите.', 3500);
        }
        const rank = playerFractionRank(player);
        if (!isLeader(player) && !rankHasPerm(fracData, rank, 'bizwar'))
            return isNotify(player, 2, 'top-mid', 'Нет прав для участия в капте.', 3000);

        const zoneId = parseInt(zoneIdRaw, 10);
        if (isNaN(zoneId) || zoneId < 1 || zoneId > DEFAULT_ZONE_COUNT)
            return isNotify(player, 2, 'top-mid', 'Неверный номер зоны.', 2000);

        const ownerFrac = global.gangZones[zoneId] || 0;

        // Если уже идёт капт — показать инфо или дать присоединиться
        if (global.activeBizwars[zoneId]) {
            const bw = global.activeBizwars[zoneId];
            if (bw.attackerFrac !== fid && bw.defenderFrac !== fid)
                return isNotify(player, 2, 'top-mid', 'Эта зона уже атакована другой фракцией.', 3000);
            // Позволить присоединиться → открыть меню телепорта
            const payload = {
                zoneId, ownerFrac,
                attackerFrac: bw.attackerFrac,
                defenderFrac: bw.defenderFrac,
                calibers: bw.calibers,
                count: bw.count,
                allowArmor: bw.allowArmor,
                allowSpunk: bw.allowSpunk,
                allowAlco:  bw.allowAlco,
                isJoin: true,
                myFrac: fid
            };
            player.call('bizwar:menu:open:c', [JSON.stringify(payload)]);
            return;
        }

        if (!isLeader(player) && !rankHasPerm(fracData, rank, 'bizwar'))
            return isNotify(player, 2, 'top-mid', 'Нет прав для начала капта.', 3000);

        if (isBizwarNightLocked()) {
            return isNotify(player, 2, 'top-mid', bizwarNightLockMessage(), 5000);
        }

        // Нельзя атаковать свою зону
        if (ownerFrac === fid)
            return isNotify(player, 2, 'top-mid', 'Это ваша зона.', 3000);

        // Cooldown-проверка
        const cd  = getBizwarCooldown(fid);
        const now = Date.now();
        const isCounterDef = isBizwarCounterDefAttack(fid, zoneId, ownerFrac);
        if (isCounterDef) {
            if (now < cd.nextPointUntil) {
                const left = Math.ceil((cd.nextPointUntil - now) / 60000);
                return isNotify(player, 2, 'top-mid', `КД на деф: ещё ${left} мин.`, 3000);
            }
        } else if (now < cd.anyAttackUntil) {
            const left = Math.ceil((cd.anyAttackUntil - now) / 60000);
            return isNotify(player, 2, 'top-mid', `КД на атаку: ещё ${left} мин.`, 3000);
        }
        global.gangZoneDefCooldowns = global.gangZoneDefCooldowns || {};
        const zoneDefCdMenu = global.gangZoneDefCooldowns[zoneId];
        if (zoneDefCdMenu && Date.now() < zoneDefCdMenu) {
            const left = Math.ceil((zoneDefCdMenu - Date.now()) / 60000);
            return isNotify(player, 2, 'top-mid', `Зона под защитой после успешного дефа. Атака через ${left} мин.`, 4500);
        }

        const atkOnline = countFracOnline(fid);
        const defOnline = ownerFrac > 0 ? countFracOnline(ownerFrac) : 0;
        const isNeutralZone = ownerFrac <= 0;

        if (atkOnline < BIZWAR_MIN_TEAM_PLAYERS) {
            return isNotify(
                player,
                2,
                'top-mid',
                `Нужно минимум ${BIZWAR_MIN_TEAM_PLAYERS} онлайн-игроков вашей фракции. Сейчас: ${atkOnline}`,
                4500
            );
        }
        if (!isNeutralZone && defOnline < BIZWAR_MIN_TEAM_PLAYERS) {
            return isNotify(
                player,
                2,
                'top-mid',
                `У защищающейся фракции нужно минимум ${BIZWAR_MIN_TEAM_PLAYERS} онлайн. Сейчас: ${defOnline}`,
                5000
            );
        }

        const payload = {
            zoneId, ownerFrac,
            calibers: BIZWAR_CALIBER_KEYS,
            atkOnline, defOnline,
            maxCount: Math.max(
                BIZWAR_MIN_TEAM_PLAYERS,
                Math.min(BIZWAR_MAX_TEAM_PLAYERS, isNeutralZone ? atkOnline : Math.min(atkOnline, defOnline || atkOnline))
            ),
            myFrac: fid,
            isJoin: false,
            isCounterDef
        };
        player.call('bizwar:menu:open:c', [JSON.stringify(payload)]);
    } catch (e) { console.log('[BIZWAR] zone:click:', e.message || e); }
});

// ─── Лидер подтверждает атаку (выбрал калибры и кол-во) ─────────────────────
mp.events.add('bizwar:attack:confirm:s', (player, zoneIdRaw, countRaw, calibersJson, allowArmorRaw, allowSpunkRaw, allowAlcoRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const fid    = playerFractionId(player);
        const fracData = fid ? global.fractionsData[fid] : null;
        const rank = playerFractionRank(player);
        if (!fid || !fracData || (!isLeader(player) && !rankHasPerm(fracData, rank, 'bizwar'))) {
            return isNotify(player, 2, 'top-mid', 'Нет прав для начала капта.', 3000);
        }
        if (isBizwarNightLocked()) {
            return isNotify(player, 2, 'top-mid', bizwarNightLockMessage(), 5000);
        }
        const zoneId = parseInt(zoneIdRaw, 10);
        const count = parseInt(countRaw, 10);

        if (isNaN(zoneId) || zoneId < 1 || zoneId > DEFAULT_ZONE_COUNT)
            return isNotify(player, 2, 'top-mid', 'Неверный номер зоны.', 2000);
        if (!Number.isInteger(count) || count < BIZWAR_MIN_TEAM_PLAYERS || count > BIZWAR_MAX_TEAM_PLAYERS) {
            return isNotify(player, 2, 'top-mid', `Размер состава должен быть от ${BIZWAR_MIN_TEAM_PLAYERS} до ${BIZWAR_MAX_TEAM_PLAYERS}.`, 3000);
        }

        if (global.activeBizwars[zoneId])
            return isNotify(player, 2, 'top-mid', 'Капт на этой зоне уже идёт.', 3000);

        const busyZoneId = getFirstActiveBizwarZoneId();
        if (busyZoneId != null) {
            return isNotify(
                player,
                2,
                'top-mid',
                `На сервере уже идёт капт (зона #${busyZoneId}). Дождитесь окончания.`,
                4500
            );
        }

        const activeForFrac = getActiveBizwarZonesForFraction(fid);
        if (activeForFrac.length >= 1) {
            return isNotify(
                player,
                2,
                'top-mid',
                `Ваша фракция уже в капте (зона #${activeForFrac[0]}).`,
                4500
            );
        }

        const ownerFrac = global.gangZones[zoneId] || 0;
        if (ownerFrac === fid) return isNotify(player, 2, 'top-mid', 'Это ваша зона.', 3000);
        const isCounterDef = isBizwarCounterDefAttack(fid, zoneId, ownerFrac);

        global.gangZoneDefCooldowns = global.gangZoneDefCooldowns || {};
        const zoneDefCd = global.gangZoneDefCooldowns[zoneId];
        if (zoneDefCd && Date.now() < zoneDefCd) {
            const left = Math.ceil((zoneDefCd - Date.now()) / 60000);
            return isNotify(player, 2, 'top-mid', `Зона под защитой после успешного дефа. Атака через ${left} мин.`, 4500);
        }

        // Cooldown
        const cd  = getBizwarCooldown(fid);
        const now = Date.now();
        if (isCounterDef) {
            if (now < cd.nextPointUntil) {
                const left = Math.ceil((cd.nextPointUntil - now) / 60000);
                return isNotify(player, 2, 'top-mid', `КД на деф: ещё ${left} мин.`, 3000);
            }
        } else if (now < cd.anyAttackUntil) {
            const left = Math.ceil((cd.anyAttackUntil - now) / 60000);
            return isNotify(player, 2, 'top-mid', `КД на атаку: ещё ${left} мин.`, 3000);
        }

        // Правило капта фиксированное: только 11.43 mm. Параметр CEF намеренно игнорируется.
        const calibers = [BIZWAR_ONLY_CALIBER];

        const allowArmor = allowArmorRaw === 'true' || allowArmorRaw === true;
        const allowSpunk = allowSpunkRaw === 'true' || allowSpunkRaw === true;
        const allowAlco  = allowAlcoRaw  === 'true' || allowAlcoRaw  === true;
        const isNeutralZone = ownerFrac === 0;

        // Проверить кол-во онлайн (нейтральные зоны — без проверки)
        const atkOnline = countFracOnline(fid);
        const defOnline = isNeutralZone ? 0 : countFracOnline(ownerFrac);

        if (atkOnline < BIZWAR_MIN_TEAM_PLAYERS) {
            return isNotify(player, 2, 'top-mid', `Нужно минимум ${BIZWAR_MIN_TEAM_PLAYERS} онлайн-игроков вашей фракции. Сейчас: ${atkOnline}`, 4500);
        }
        if (!isCounterDef && !isNeutralZone && defOnline < BIZWAR_MIN_TEAM_PLAYERS) {
            return isNotify(player, 2, 'top-mid', `У защищающейся фракции нужно минимум ${BIZWAR_MIN_TEAM_PLAYERS} онлайн. Сейчас: ${defOnline}`, 4500);
        }
        if (!isNeutralZone) {
            if (atkOnline < count)
                return isNotify(player, 2, 'top-mid', `Нужно минимум ${count} онлайн-игроков. Сейчас: ${atkOnline}`, 4000);
            if (!isCounterDef && defOnline < count)
                return isNotify(player, 2, 'top-mid', `У защищающейся фракции только ${defOnline} онлайн-игроков (нужно ${count}).`, 4000);
        }

        const arenaMeta = getBizwarZoneArenaMeta(zoneId);
        if (!arenaMeta) return isNotify(player, 2, 'top-mid', 'Арена для этой зоны не настроена.', 3000);

        const busyBeforeStart = getFirstActiveBizwarZoneId();
        if (busyBeforeStart != null) {
            return isNotify(
                player,
                2,
                'top-mid',
                `На сервере уже идёт капт (зона #${busyBeforeStart}). Дождитесь окончания.`,
                4500
            );
        }

        const startedAt = Date.now();

        // Создать капт
        global.activeBizwars[zoneId] = {
            attackerFrac: fid,
            defenderFrac: ownerFrac,
            calibers,
            count,
            allowArmor, allowSpunk, allowAlco,
            allowMedic: true,
            startedAt,
            isStarted: false,
            fightStartedAt: 0,
            players: {},
            eliminated: {},
            combatStats: {},
            arenaCx: arenaMeta.cx,
            arenaCy: arenaMeta.cy,
            arenaCz: arenaMeta.cz,
            arenaRadius: arenaMeta.radius
        };

        broadcastZoneFlash(zoneId, true);

        const atkName = getFractionName(fid);
        const defName = isNeutralZone ? 'Нейтрально' : getFractionName(ownerFrac);
        const calStr  = calibers.join(', ');

        (function postBizwarDiscord() {
            try {
                const st = global.activeBizwars[zoneId].startedAt;
                const snap = {
                    createdMs: st,
                    fightStartMs: st + BIZWAR_PREP_MS,
                    zoneId,
                    format: `${count}v${count}`,
                    calibers,
                    allowAlco,
                    allowSpunk,
                    allowArmor,
                    attackerFrac: fid,
                    defenderFrac: ownerFrac,
                    attackerName: atkName,
                    defenderName: defName
                };
                if (typeof global.postDiscordBizwarAnnouncement === 'function') {
                    global.postDiscordBizwarAnnouncement(snap).then((meta) => {
                        try {
                            if (meta && global.activeBizwars && global.activeBizwars[zoneId]) {
                                global.activeBizwars[zoneId].discordBizwar = { ...meta, snapshot: snap };
                            }
                        } catch (_e) {}
                    });
                }
            } catch (_e) {}
        })();

        // Уведомить всех в обеих фракциях
        mp.players.forEach(p => {
            if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
            const pFid = playerFractionId(p);
            if (pFid === fid || pFid === ownerFrac) {
                try {
                    p.call('chat:pushLine', [`!{#dc2626}[КАПТЫ] !{#e8e8e8}${atkName} атакует зону #${zoneId} (${defName}). Калибры: ${calStr}. Формат: ${count}v${count}`]);
                } catch (_) {}
            }
        });

        isNotify(player, 1, 'top-mid', `Капт на зоне #${zoneId} начат! Телепорт у HQ.`, 5000);
        logFractionAction(fid, player, 'bizwar_start',
            `Забил капт за зону #${zoneId} vs ${defName}. Формат ${count}v${count}, калибры: ${calStr}`);
        broadcastBizwarTpSync(fid, ownerFrac);
        const extrasStr = `Спанк: ${allowSpunk ? 'да' : 'нет'}, Алко: ${allowAlco ? 'да' : 'нет'}, Броня: ${allowArmor ? 'да' : 'нет'}`;
        if (typeof global.broadcastBizwarWarAlerts === 'function') {
            global.broadcastBizwarWarAlerts(fid, ownerFrac, zoneId, calStr, extrasStr, startedAt, atkName, defName, count);
        }
        mp.players.forEach((p) => {
            if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
            const pFid = playerFractionId(p);
            if (pFid === fid || pFid === ownerFrac) {
                try { p.call('bizwar:attack:started'); } catch (_e) {}
            }
        });
        console.log(`[BIZWAR] Zone #${zoneId} started by frac=${fid} vs frac=${ownerFrac} count=${count} cals=${calibers}`);
    } catch (e) { console.log('[BIZWAR] attack:confirm:', e.message || e); }
});

// ─── Телепорт на капт (E у HQ) ─────────────────────────────────────────────
mp.events.add('bizwar:hq:use:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.dimension !== 0) return;
        if (player.vehicle) return isNotify(player, 2, 'top-mid', 'Выйдите из транспорта.', 3000);

        const fid = playerFractionId(player);
        if (!fid || !BIZWAR_FRACTIONS.has(fid))
            return isNotify(player, 2, 'top-mid', 'Вы не участник фракции.', 3000);

        const tp = BIZWAR_TP_POSITIONS[fid];
        if (!tp) return;

        const dist = player.dist(new mp.Vector3(tp.x, tp.y, tp.z));
        if (dist > 2.5) return;

        const zones = getActiveBizwarZonesForFraction(fid);
        if (zones.length === 0)
            return isNotify(player, 2, 'top-mid', 'Сейчас нет активного капта для вашей фракции.', 3000);

        doBizwarTeleport(player, zones[0]);
    } catch (e) { console.log('[BIZWAR] hq:use:', e.message || e); }
});

function doBizwarTeleport(player, zoneIdRaw) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
    const fid = playerFractionId(player);
    const zoneId = parseInt(zoneIdRaw, 10);

    if (!fid || !BIZWAR_FRACTIONS.has(fid)) {
        isNotify(player, 2, 'top-mid', 'Вы не участник фракции.', 3000);
        return false;
    }

    const bw = global.activeBizwars[zoneId];
    if (!bw) {
        isNotify(player, 2, 'top-mid', 'Капт на этой зоне не активен.', 3000);
        return false;
    }
    if (bw.attackerFrac !== fid && (bw.defenderFrac === 0 || bw.defenderFrac !== fid)) {
        isNotify(player, 2, 'top-mid', 'Вы не участвуете в этом капте.', 3000);
        return false;
    }
    const elapsedJoin = Date.now() - bw.startedAt;
    if (elapsedJoin >= BIZWAR_MAX_MS) {
        isNotify(player, 2, 'top-mid', 'Капт уже завершается.', 3000);
        return false;
    }

    bw.eliminated = bw.eliminated || {};
    if (bw.eliminated[player.static]) {
        isNotify(player, 2, 'top-mid', 'Вы уже погибли на этом капте и не можете вернуться.', 4500);
        return false;
    }

    if (player.getVariable('dead') && typeof global.revivePlayerAlive === 'function') {
        global.revivePlayerAlive(player);
    }

    const fracData = global.fractionsData[fid];
    if (!rankHasPerm(fracData, playerFractionRank(player), 'bizwar')) {
        isNotify(player, 2, 'top-mid', 'Нет разрешения на участие в капте.', 3000);
        return false;
    }

    const { calibers, allowArmor, allowSpunk, allowAlco } = bw;
    const maxTeam = parseInt(bw.count, 10);
    const teamMax = Number.isFinite(maxTeam) && maxTeam > 0 ? maxTeam : 5;
    const dim = bizwarDimension(zoneId);
    const alreadyOnBizwar = player.dimension === dim && player.getVariable('inBizwar') === true;
    const alreadyRegistered = !!(bw.players && bw.players[player.static]);
    if (!alreadyOnBizwar && !alreadyRegistered) {
        const registeredOnTeam = countBizwarRegisteredSide(bw, fid, player.static);
        if (registeredOnTeam >= teamMax) {
            isNotify(
                player,
                2,
                'top-mid',
                `В вашей команде уже максимум игроков (${teamMax}) для формата ${teamMax}v${teamMax}.`,
                4500
            );
            return false;
        }
    }

    const loadoutCheck = validateCombatJoinLoadout(player, {
        calibers,
        weaponToCaliber: WEAPON_TO_CALIBER,
        allowArmor,
        allowSpunk,
        allowAlco,
        armorMax: BIZWAR_ARMOR_MAX,
        weaponsFastSlotsOnly: true
    });
    if (!loadoutCheck.ok) {
        isNotify(player, 2, 'top-mid', loadoutCheck.msg, 4000);
        return false;
    }

    const isPrep = !bw.isStarted;
    const isAttacker = bw.attackerFrac === fid;
    const alreadyIn = countBizwarSideOnlineInDim(zoneId, fid, player);
    const slotIndex = Math.min(Math.max(0, alreadyIn), 9);
    const spawnPos = getBizwarZoneSpawnPos(zoneId, isAttacker, slotIndex, isPrep);
    if (!spawnPos) {
        isNotify(player, 2, 'top-mid', 'Не удалось определить точку телепорта.', 3000);
        return false;
    }

    const side = isAttacker ? 'attack' : 'defend';
    bw.players[player.static] = side;
    if (typeof global.captCombatStatsRegisterPlayer === 'function') {
        global.captCombatStatsRegisterPlayer(player, bw, side);
    }

    player.position = spawnPos;
    if (spawnPos.heading != null && Number.isFinite(Number(spawnPos.heading))) {
        player.heading = Number(spawnPos.heading);
    }
    player.dimension = dim;

    player.bizwarReturnTp = 'hq';
    player.setVariable('inBizwar', true);
    if (typeof global.forceClearGreenZone === 'function') global.forceClearGreenZone(player);
    player.setVariable('bizwarZone', zoneId);
    player.setVariable('bizwarCalibers', JSON.stringify(calibers));
    player.setVariable('bizwarAllowArmor', allowArmor);
    player.setVariable('bizwarAllowSpunk', allowSpunk);
    player.setVariable('bizwarAllowAlco', allowAlco);
    player.setVariable('bizwarFrozen', isPrep);
    player.setVariable('bizwarRegDamage', !isPrep);
    player.setVariable('captAllowArmor', allowArmor === true);
    player.setVariable('captAllowSpank', allowSpunk === true);
    player.setVariable('captAllowAlco', allowAlco === true);
    if (!allowArmor) {
        player.setVariable('armor', null);
        player.setClothes(9, 0, 0, 0);
        player.armour = 0;
    }

    player.call('bizwar:teleport:c', [zoneId, side, isPrep, spawnPos.x, spawnPos.y, spawnPos.z]);
    const arenaMeta = getBizwarZoneArenaMeta(zoneId);
    if (arenaMeta) {
        player.call('captArena:set', [JSON.stringify({
            cx: arenaMeta.cx,
            cy: arenaMeta.cy,
            cz: arenaMeta.cz,
            r: arenaMeta.radius,
            dimension: dim
        })]);
    }
    player.call('captBattle:joined');
    logFractionAction(fid, player, 'bizwar_join',
        `Присоединился к капту зона #${zoneId} (${side === 'attack' ? 'атака' : 'защита'})`);
    const bizAdminTrue = Number(player.getVariable('adminTrueLvl')) || Number(player.adminlvl) || 0;
    if (bizAdminTrue >= 1 && typeof global.forceExitAdminForCombat === 'function') {
        global.forceExitAdminForCombat(player);
    }
    isNotify(player, 1, 'top-mid', `Вы телепортированы на капт! Зона #${zoneId}`, 3000);
    return true;
}

// ─── Телепорт на капт ───────────────────────────────────────────────────────
mp.events.add('bizwar:teleport:s', (player, zoneIdRaw) => {
    try {
        doBizwarTeleport(player, zoneIdRaw);
    } catch (e) { console.log('[BIZWAR] teleport:', e.message || e); }
});

// ─── Выход из капта ─────────────────────────────────────────────────────────
mp.events.add('bizwar:exit:s', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('inBizwar') !== true) return;
        const bwZone = player.getVariable('bizwarZone');
        player.setVariable('inBizwar', null);
        player.setVariable('bizwarZone', null);
        player.setVariable('bizwarCalibers', null);
        player.setVariable('bizwarAllowArmor', null);
        player.setVariable('bizwarAllowSpunk', null);
        player.setVariable('bizwarAllowAlco', null);
        clearBizwarCombatFlags(player);
        if (player._testVzpActive === true) {
            player._testVzpActive = false;
        }
        try { player.call('captArena:clear'); } catch (_eClear) {}
        if (bwZone && global.activeBizwars[bwZone]) {
            const battle = global.activeBizwars[bwZone];
            delete battle.players[player.static];
            battle.eliminated[player.static] = true;
        }
        teleportBizwarPlayerToFractionBase(player);
        isNotify(player, 3, 'top-mid', 'Вы вышли из капта.', 3000);
    } catch (e) {}
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        const zoneId = parseInt(player.getVariable && player.getVariable('bizwarZone'), 10);
        const battle = global.activeBizwars && global.activeBizwars[zoneId];
        if (!battle || player.static == null) return;
        delete battle.players[player.static];
        battle.eliminated[player.static] = true;
    } catch (e) {
        console.log('[BIZWAR] playerQuit cleanup:', e.message || e);
    }
});

function bizwarGetAllowedCalibers(player) {
    const raw = player.getVariable('bizwarCalibers');
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((c) => BIZWAR_CALIBER_KEYS.includes(c)) : [];
    } catch (_) {
        return [];
    }
}

const bizwarFastSlotGuard = makeCombatFastSlotGuard({
    inCombatVar: 'inBizwar',
    weaponToCaliber: WEAPON_TO_CALIBER,
    getCalibers: bizwarGetAllowedCalibers,
    onBlockNotify: (player, msg) => isNotify(player, 2, 'top-mid', msg, 2500)
});

// ─── Проверка быстрых слотов внутри капта (сервер-сайд хук) ────────────────
/** true = запретить положить в быстрый слот. */
global.bizwarCheckFastSlot = bizwarFastSlotGuard.checkFastSlot;

/** true = разрешено переключать слот 1–3. */
global.bizwarIsFastSlotWeaponAllowed = bizwarFastSlotGuard.isFastSlotWeaponAllowed;

global.endBizwar = endBizwar;

function parseFractionMoneyAmount(amountStr) {
    const raw = String(amountStr == null ? '' : amountStr).replace(/\s/g, '').replace(/[^\d]/g, '');
    const amount = parseInt(raw, 10);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function broadcastFractionBalance(fid, balance) {
    const b = parseInt(balance, 10) || 0;
    mp.players.forEach((tp) => {
        if (!tp.getVariable('auth')) return;
        const pFid = playerFractionId(tp);
        if (pFid === fid && tp.getVariable('fractionmenu') === true) {
            tp.call('fraction:cef:setbalance', [b]);
        }
    });
}

mp.events.add('fraction:balance:request:s', (player) => {
    try {
        const fid = playerFractionId(player);
        if (!fid) return;
        const fracData = global.fractionsData[fid];
        if (!fracData) return;
        player.call('fraction:cef:setbalance', [parseInt(fracData.balance, 10) || 0]);
    } catch (e) { console.log('[FRACTIONS] balance:request:', e.message || e); }
});

mp.events.add('fraction:balance:deposit:s', (player, amountStr) => {
    try {
        const fid = playerFractionId(player);
        if (!fid) return;
        const fracData = global.fractionsData[fid];
        if (!fracData) return;
        const amount = parseFractionMoneyAmount(amountStr);
        if (amount < 1) return isNotify(player, 2, 'top-mid', 'Укажите корректную сумму.', 3000);
        if (amount > Number(player.money)) return isNotify(player, 2, 'top-mid', 'Недостаточно наличных.', 3000);

        const newMoney = parseInt(Number(player.money), 10) - amount;
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], () => {});
        player.money = newMoney;
        player.call('updateMoney', [global.formatnum1(newMoney)]);

        fracData.balance = (parseInt(fracData.balance, 10) || 0) + amount;
        saveFraction(fid, () => {
            broadcastFractionBalance(fid, fracData.balance);
            logFractionAction(fid, player, 'balance_deposit', `Положил деньги на счёт фракции: ${global.formatnum1(amount)}$`);
            isNotify(player, 3, 'top-mid', `На счёт фракции зачислено ${global.formatnum1(amount)}$.`, 3500);
        });
    } catch (e) { console.log('[FRACTIONS] balance:deposit:', e.message || e); }
});

mp.events.add('fraction:balance:withdraw:s', (player, amountStr) => {
    try {
        const fid = playerFractionId(player);
        if (!fid) return;
        const fracData = global.fractionsData[fid];
        if (!fracData) return;
        const rank = playerFractionRank(player);
        if (rank !== 10 && !rankHasPerm(fracData, rank, 'withdrawMoney')) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно прав для снятия.', 3000);
        }
        const amount = parseFractionMoneyAmount(amountStr);
        if (amount < 1) return isNotify(player, 2, 'top-mid', 'Укажите корректную сумму.', 3000);
        const curBal = parseInt(fracData.balance, 10) || 0;
        if (amount > curBal) return isNotify(player, 2, 'top-mid', 'На счету фракции недостаточно средств.', 3000);

        fracData.balance = curBal - amount;
        saveFraction(fid, () => {
            const newMoney = parseInt(Number(player.money), 10) + amount;
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], () => {});
            player.money = newMoney;
            player.call('updateMoney', [global.formatnum1(newMoney)]);
            broadcastFractionBalance(fid, fracData.balance);
            logFractionAction(fid, player, 'balance_withdraw', `Снял деньги со счёта фракции: ${global.formatnum1(amount)}$`);
            isNotify(player, 3, 'top-mid', `Вы сняли ${global.formatnum1(amount)}$ со счёта фракции.`, 3500);
        });
    } catch (e) { console.log('[FRACTIONS] balance:withdraw:', e.message || e); }
});

function playerHasFraction(player) {
    const f = parseInt(player.getVariable('fraction') || 0, 10) || 0;
    return f >= 1 && f <= 6;
}

function finishFractionJoin(player, newFraction, inviter) {
    if (!mp.players.exists(player)) return;
    const fn = getFractionName(newFraction);
    isNotify(player, 3, 'top-mid', `Вы вступили во фракцию «${fn}».`, 5000);
    try { player.call('sound:client', [3]); } catch (_s) {}
    if (typeof global.tryCompleteNewbieQuest === 'function') {
        global.tryCompleteNewbieQuest(player, 'join_fraction');
    }
    if (typeof global.pushMenuAccountProfile === 'function') {
        global.pushMenuAccountProfile(player);
    }
    if (inviter && mp.players.exists(inviter)) {
        isNotify(inviter, 3, 'top-mid', `${player.login} принял приглашение во фракцию.`, 4000);
        logFractionAction(newFraction, inviter, 'invite_accept', `Принял приглашение [#${player.static}] ${player.login}`);
    }
    player.call('dstatus', ['Играет на FLOW DM', 'GANGWAR (#' + player.static + ')']);
    if (typeof global.setCount === 'function') global.setCount();

    if (newFraction === 6) {
        player.setVariable('afklobby', null);
        player.setVariable('revolverdm', null);
        player.setVariable('carabinedm', null);
        player.setVariable('heavydm', null);
        player.setVariable('gangwar', true);
        player.setVariable('mp', false);
        player.setVariable('mpp', false);
        player.call('closemenu');
        player.call('hideselect');
        if (typeof global.applyFactionChangeInPlace === 'function') {
            global.applyFactionChangeInPlace(player, 6);
        } else {
            mp.events.call('playerModelChange6', player);
        }
        return;
    }

    if (player.getVariable('gangwar') === true || player.getVariable('factionlessHub') === true) {
        player.setVariable('factionlessHub', null);
        player.setVariable('gangwar', true);
        player.call('closemenu');
        player.call('hideselect');
        if (typeof global.applyFactionChangeInPlace === 'function') {
            global.applyFactionChangeInPlace(player, newFraction);
        } else {
            mp.events.call(`playerModelChange${newFraction}`, player);
        }
    }
}

mp.events.add('fraction:self:leave:s', (player, reasonRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const viplvl = parseInt(player.viplvl != null ? player.viplvl : player.getVariable('viplvl'), 10) || 0;
        if (viplvl < 3) {
            return isNotify(player, 2, 'top-mid', 'Самостоятельный выход из фракции доступен с VIP Platinum.', 4500);
        }
        const fid = playerFractionId(player);
        if (!fid) return isNotify(player, 2, 'top-mid', 'Вы не состоите во фракции.', 3000);
        if (isLeader(player)) {
            return isNotify(player, 2, 'top-mid', 'Лидер фракции не может покинуть фракцию самостоятельно.', 4500);
        }
        const reason = String(reasonRaw || '').trim().slice(0, 200) || 'Причина не указана';
        const fn = getFractionName(fid);
        logFractionAction(fid, player, 'self_leave', `Увольняется с фракции «${fn}» по причине: ${reason}`);
        removePlayerFromFraction(player, {
            notify: `Вы покинули фракцию «${fn}». Причина: ${reason}`
        });
        try { player.call('fraction:tablet:close'); } catch (_c) {}
    } catch (e) {
        console.log('[FRACTIONS] self:leave:', e.message || e);
    }
});

function joinPlayerToFraction(player, fractionId, inviter) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
    const newFraction = parseInt(fractionId, 10) || 0;
    if (newFraction < 1 || newFraction > 6) return false;
    if (playerHasFraction(player)) return false;

    global.DB.query(
        'UPDATE accounts SET fraction=?, fraction_rank=1, lastfraction=? WHERE static=?',
        [newFraction, Date.now(), player.static],
        (err) => {
            if (err) {
                console.log('[FRACTIONS] joinPlayerToFraction:', err.message || err);
                return;
            }
            if (!mp.players.exists(player)) return;
            player.setVariable('fraction', newFraction);
            player.setVariable('factionlessHub', null);
            player.fraction_rank = 1;
            savePlayerFractionRank(player, 1);
            player.call('setfraction', [newFraction]);
            finishFractionJoin(player, newFraction, inviter);
        }
    );
    return true;
}

function removePlayerFromFraction(player, opts) {
    if (!player || !mp.players.exists(player) || !player.static) return;
    const wasInGangwar = player.getVariable('gangwar') === true;
    global.DB.query(
        'UPDATE accounts SET fraction=0, fraction_rank=0, fraction_prefix=NULL WHERE static=?',
        [player.static],
        (err) => {
            if (err) console.log('[FRACTIONS] removePlayerFromFraction:', err.message || err);
            if (!mp.players.exists(player)) return;
            player.setVariable('fraction', 0);
            player.setVariable('factionlessHub', null);
            player.fraction_rank = 0;
            player.fraction_prefix = null;
            player.call('setfraction', [0]);
            try { player.call('fraction:tablet:close'); } catch (_c) {}
            if (opts && opts.notify) {
                isNotify(player, 1, 'top-mid', opts.notify, 5500);
            }
            player.call('dstatus', ['Играет FLOW DM', 'NO FACTION (#' + player.static + ')']);
            if (typeof global.pushMenuAccountProfile === 'function') {
                global.pushMenuAccountProfile(player);
            }
        }
    );
}

mp.events.add('fraction:invite:s', (player, targetStaticRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        const fracData = global.fractionsData[fid];
        if (!fid || !fracData) return isNotify(player, 2, 'top-mid', 'Вы не состоите во фракции.', 3000);

        const rank = playerFractionRank(player);
        if (!rankHasPerm(fracData, rank, 'canInvite')) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно прав для приглашения.', 3000);
        }

        const targetStatic = parseInt(targetStaticRaw, 10);
        if (isNaN(targetStatic) || targetStatic < 1) {
            return isNotify(player, 2, 'top-mid', 'Игрок не найден.', 3000);
        }

        const target = mp.players.toArray().find((p) => Number(p.static) === targetStatic);
        if (!target || !mp.players.exists(target)) {
            return isNotify(player, 2, 'top-mid', 'Игрок не найден.', 3000);
        }
        if (target === player) return isNotify(player, 2, 'top-mid', 'Нельзя пригласить самого себя.', 3000);

        const targetFrac = parseInt(target.getVariable('fraction') || 0, 10) || 0;
        if (targetFrac > 0) {
            return isNotify(player, 2, 'top-mid', 'Игрок уже состоит во фракции.', 3000);
        }

        if (typeof global.proposeP2pInteraction !== 'function') {
            return isNotify(player, 2, 'top-mid', 'Система приглашений недоступна.', 3000);
        }
        if (!global.proposeP2pInteraction(player, target, 'fraction_invite', { fid, fname: fracData.name })) return;

        logFractionAction(fid, player, 'invite_send', `Пригласил [#${target.static}] ${target.login}`);
        isNotify(player, 3, 'top-mid', `Приглашение во фракцию «${fracData.name}» отправлено игроку ${target.login}.`, 4500);
        player.call('target:close');
    } catch (e) { console.log('[FRACTIONS] invite:s:', e.message || e); }
});

mp.events.add('fraction:kick:s', (player, targetStaticRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fid = playerFractionId(player);
        const fracData = global.fractionsData[fid];
        if (!fid || !fracData) return isNotify(player, 2, 'top-mid', 'Вы не состоите во фракции.', 3000);

        const kickerRank = playerFractionRank(player);
        if (!rankHasPerm(fracData, kickerRank, 'canDismiss')) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно прав для увольнения.', 3000);
        }

        const targetStatic = parseInt(targetStaticRaw, 10);
        if (isNaN(targetStatic) || targetStatic < 1) {
            return isNotify(player, 2, 'top-mid', 'Игрок не найден.', 3000);
        }
        if (targetStatic === player.static) {
            return isNotify(player, 2, 'top-mid', 'Вы не можете уволить самого себя.', 3000);
        }

        let targetOnline = null;
        mp.players.forEach((p) => {
            if (!mp.players.exists(p)) return;
            if (sameStatic(p.static, targetStatic)) targetOnline = p;
        });

        global.DB.query(
            'SELECT login, fraction_rank FROM accounts WHERE static=? AND fraction=? LIMIT 1',
            [targetStatic, fid],
            (err, rows) => {
                if (err) return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
                if (!rows || !rows.length) {
                    return isNotify(player, 2, 'top-mid', 'Игрок не найден во фракции.', 3000);
                }
                const targetRank = parseInt(rows[0].fraction_rank, 10) || 0;
                const targetName = rows[0].login || `#${targetStatic}`;
                if (targetRank === 10) {
                    return isNotify(player, 2, 'top-mid', 'Нельзя уволить лидера фракции.', 3000);
                }
                if (!isLeader(player) && targetRank >= kickerRank) {
                    return isNotify(player, 2, 'top-mid', 'Недостаточно прав.', 3000);
                }

                logFractionAction(fid, player, 'kick', `Уволил [#${targetStatic}] ${targetName}`);
                isNotify(player, 3, 'top-mid', `Вы уволили ${targetName} из фракции.`, 3500);

                if (targetOnline && mp.players.exists(targetOnline)) {
                    removePlayerFromFraction(targetOnline, {
                        notify: `Вас уволили из фракции «${fracData.name}».`
                    });
                } else {
                    global.DB.query(
                        'UPDATE accounts SET fraction=0, fraction_rank=0, fraction_prefix=NULL WHERE static=? AND fraction=?',
                        [targetStatic, fid],
                        () => {}
                    );
                }
                mp.events.call('fraction:members:refresh:s', player);
            }
        );
    } catch (e) { console.log('[FRACTIONS] kick:s:', e.message || e); }
});

mp.events.add('playerDeath', (player, reason, killer) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('inBizwar') !== true) return;
        const zoneId = player.getVariable('bizwarZone');
        const zid = zoneId != null ? parseInt(zoneId, 10) : NaN;
        const bw = Number.isFinite(zid) && global.activeBizwars ? global.activeBizwars[zid] : null;

        if (typeof global.captCombatStatsRecordDeath === 'function') {
            global.captCombatStatsRecordDeath(player, killer);
        }

        if (bw && bw.isStarted && bw.defenderFrac > 0) {
            const elapsed = Date.now() - bw.startedAt;
            if (elapsed > BIZWAR_PREP_MS + 10000) {
                const atkCount = countBizwarSideOnlineInDim(zid, bw.attackerFrac, player);
                const defCount = countBizwarSideOnlineInDim(zid, bw.defenderFrac, player);
                if (atkCount === 0 && defCount > 0) {
                    endBizwar(zid, bw.defenderFrac);
                } else if (defCount === 0 && atkCount > 0) {
                    endBizwar(zid, bw.attackerFrac);
                }
            }
        }

        if (Number.isFinite(zid) && bw) {
            bw.eliminated = bw.eliminated || {};
            bw.eliminated[player.static] = true;
        }
        player.setVariable('inBizwar', null);
        player.setVariable('bizwarZone', null);
        player.setVariable('bizwarCalibers', null);
        player.setVariable('bizwarAllowArmor', null);
        player.setVariable('bizwarAllowSpunk', null);
        player.setVariable('bizwarAllowAlco', null);
        clearBizwarCombatFlags(player);
        teleportBizwarPlayerToFractionBase(player);
        try {
            player.call('captBattle:hide');
            player.call('captArena:clear');
        } catch (_e) {}
        isNotify(player, 3, 'top-mid', 'Вы погибли на капте и больше не можете вернуться в этот бой.', 4500);
    } catch (e) {
        console.log('[BIZWAR] playerDeath:', e.message || e);
    }
});

global.joinPlayerToFraction = joinPlayerToFraction;
global.removePlayerFromFraction = removePlayerFromFraction;

// ─── GTA5RP faction menu: RPC + CEF bridge ────────────────────────────────────
(function registerFactionMenuRpc() {
    function pad2(n) {
        return n < 10 ? '0' + n : String(n);
    }
    function formatNewsDate(d) {
        return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear() +
            ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }
    function okData(data) {
        return { error: false, data: data };
    }
    function errData(text) {
        return { error: true, errorText: String(text || 'Ошибка') };
    }
    function replyPlayer(player, reqId, ok, payload) {
        try {
            player.call('factionMenu:rpc:result:c', [
                String(reqId || ''),
                ok ? 1 : 0,
                JSON.stringify(payload)
            ]);
        } catch (_e) {}
    }

    function parseMemberKey(raw) {
        const s = String(raw || '').trim();
        const m = s.match(/\(#\s*(\d+)\s*\)\s*$/);
        if (m) {
            return {
                staticId: parseInt(m[1], 10),
                login: s.replace(/\s*\(#\s*\d+\s*\)\s*$/, '').replace(/_/g, ' ').trim()
            };
        }
        return { staticId: 0, login: s.replace(/_/g, ' ').trim() };
    }

    function resolveMember(fid, key, cb) {
        const parsed = parseMemberKey(key);
        if (parsed.staticId > 0) {
            return global.DB.query(
                'SELECT static, login, fraction_rank FROM accounts WHERE fraction=? AND static=? LIMIT 1',
                [fid, parsed.staticId],
                (err, rows) => cb(err, rows && rows[0] ? rows[0] : null)
            );
        }
        const login = parsed.login;
        const loginUs = login.replace(/ /g, '_');
        global.DB.query(
            'SELECT static, login, fraction_rank FROM accounts WHERE fraction=? AND (login=? OR login=?) LIMIT 1',
            [fid, login, loginUs],
            (err, rows) => cb(err, rows && rows[0] ? rows[0] : null)
        );
    }

    function handleFactionManage(player, name, args) {
        return new Promise((resolve) => {
            try {
                if (!mp.players.exists(player) || !player.getVariable('auth')) {
                    return resolve(name.indexOf('unInvite') >= 0 ? { error: 1 } : (name.indexOf('members_rank') >= 0 || name.indexOf('rank_set') >= 0 ? errData('Нет доступа') : 'Нет доступа'));
                }
                const fid = playerFractionId(player);
                const fracData = global.fractionsData[fid];
                const myRank = playerFractionRank(player);
                if (!fid || !fracData) {
                    return resolve(name.indexOf('unInvite') >= 0 ? { error: 1 } : (name.indexOf('members_rank') >= 0 || name.indexOf('rank_set') >= 0 ? errData('Фракция не найдена') : 'Фракция не найдена'));
                }

                if (name === 'server_faction_manage_notify') {
                    if (!isLeader(player)) return resolve('Только лидер может менять оповещение');
                    fracData.advert = String(args == null ? '' : args).slice(0, 512);
                    saveFraction(fid, null);
                    logFractionAction(fid, player, 'advert', 'Обновил оповещение фракции');
                    isNotify(player, 1, 'top-mid', 'Оповещение сохранено.', 2500);
                    return resolve('ok');
                }

                if (name === 'server_faction_manage_new_news') {
                    if (!isLeader(player)) return resolve('Только лидер');
                    const title = Array.isArray(args) ? String(args[0] || '').trim() : '';
                    const text = Array.isArray(args) ? String(args[1] || '').trim() : '';
                    if (!title || !text) return resolve('Заполните заголовок и текст');
                    if (!Array.isArray(fracData.news)) fracData.news = [];
                    const item = { title: title.slice(0, 120), text: text.slice(0, 2000), date: formatNewsDate(new Date()) };
                    fracData.news.unshift(item);
                    if (fracData.news.length > 50) fracData.news = fracData.news.slice(0, 50);
                    persistFractionNews(fid, fracData.news, () => {});
                    saveFraction(fid, null);
                    logFractionAction(fid, player, 'news_create', `Опубликовал новость: ${item.title}`);
                    try { player.call('fraction:menu:news:c', [JSON.stringify(fracData.news)]); } catch (_e) {}
                    try { player.call('fraction:news:update:c', [JSON.stringify(fracData.news)]); } catch (_e2) {}
                    isNotify(player, 1, 'top-mid', 'Новость создана.', 2500);
                    return resolve('ok');
                }

                if (name === 'server_faction_manage_warehouse_closeStatus') {
                    if (!rankHasPerm(fracData, myRank, 'warehouseToggle') && !isLeader(player)) {
                        return resolve('Нет прав на склад');
                    }
                    const closed = !!args;
                    fracData.warehouseOpen = !closed;
                    saveFraction(fid, null);
                    logFractionAction(fid, player, 'warehouse_toggle', fracData.warehouseOpen ? 'Склад открыт' : 'Склад закрыт');
                    try { player.call('fraction:warehouse:toggle:c', [fracData.warehouseOpen ? 1 : 0]); } catch (_e) {}
                    isNotify(player, 1, 'top-mid', fracData.warehouseOpen ? 'Склад открыт.' : 'Склад закрыт.', 2500);
                    return resolve('ok');
                }

                if (name === 'server_faction_manage_members_unInvite') {
                    if (!rankHasPerm(fracData, myRank, 'canDismiss') && !isLeader(player)) {
                        return resolve({ error: 1 });
                    }
                    return resolveMember(fid, args, (err, row) => {
                        if (err || !row) return resolve({ error: 1 });
                        const targetStatic = parseInt(row.static, 10);
                        const targetRank = parseInt(row.fraction_rank, 10) || 0;
                        if (targetRank === 10) return resolve({ error: 1 });
                        if (sameStatic(targetStatic, player.static)) return resolve({ error: 1 });
                        if (!isLeader(player) && targetRank >= myRank) return resolve({ error: 1 });
                        try {
                            mp.events.call('fraction:kick:s', player, String(targetStatic));
                        } catch (_e) {
                            return resolve({ error: 1 });
                        }
                        resolve({ error: 0 });
                    });
                }

                if (name === 'server_faction_manage_members_rank') {
                    if (!rankHasPerm(fracData, myRank, 'changeRank') && !isLeader(player)) {
                        return resolve(errData('Нет прав'));
                    }
                    const memberName = args && args.name;
                    const mode = args && args.mode;
                    return resolveMember(fid, memberName, (err, row) => {
                        if (err || !row) return resolve(errData('Игрок не найден'));
                        const targetStatic = parseInt(row.static, 10);
                        let newRank = parseInt(row.fraction_rank, 10) || 1;
                        if (newRank === 10) return resolve(errData('Нельзя менять ранг лидера'));
                        if (!isLeader(player) && newRank >= myRank) {
                            return resolve(errData('Нельзя изменять ранг игрока вашего или более высокого ранга'));
                        }
                        if (mode === '+') newRank = Math.min(9, newRank + 1);
                        else newRank = Math.max(1, newRank - 1);
                        if (!isLeader(player) && newRank >= myRank) return resolve(errData('Ранг слишком высокий'));
                        try {
                            mp.events.call('fraction:rank:set:s', player, String(targetStatic), String(newRank), 'Меню фракции');
                        } catch (_e) {
                            return resolve(errData('Ошибка'));
                        }
                        const rankName = ((fracData.ranks.find((r) => r.rank === newRank) || {}).name) || ('Ранг ' + newRank);
                        resolve(okData(rankName));
                    });
                }

                if (name === 'server_faction_manage_rank_setPermission') {
                    if (!isLeader(player)) {
                        return resolve(errData('Только лидер может менять права рангов'));
                    }
                    const index = Array.isArray(args) ? parseInt(args[0], 10) : -1;
                    const rankName = Array.isArray(args) ? String(args[1] || '') : '';
                    const perms = Array.isArray(args) && Array.isArray(args[2]) ? args[2] : [];
                    const rankNum = index + 1;
                    if (rankNum < 1 || rankNum > 9) return resolve(errData('Неверный ранг'));
                    const cleanRankName = rankName.trim();
                    if (!cleanRankName) return resolve(errData('Введите название должности'));
                    const isBizwarFrac = BIZWAR_FRACTIONS.has(fid);
                    const codes = new Set(perms.map(String));
                    const previousRanks = (fracData.ranks || []).map((rank) => ({ ...rank }));
                    let found = false;
                    fracData.ranks = (fracData.ranks || []).map((r) => {
                        if (parseInt(r.rank, 10) !== rankNum) return r;
                        found = true;
                        return {
                            rank: rankNum,
                            name: cleanRankName.slice(0, 32),
                            changeRank: codes.has('changeRank'),
                            warehouseAccess: codes.has('warehouseAccess'),
                            warehouseClosedAccess: codes.has('warehouseClosedAccess'),
                            warehouseToggle: codes.has('warehouseToggle'),
                            bizwar: isBizwarFrac ? codes.has('bizwar') : false,
                            withdrawMoney: codes.has('withdrawMoney'),
                            craftAccess: codes.has('craftAccess'),
                            canInvite: codes.has('canInvite'),
                            canDismiss: codes.has('canDismiss'),
                            canLogs: codes.has('canLogs')
                        };
                    });
                    if (!found) {
                        fracData.ranks.push({
                            rank: rankNum,
                            name: cleanRankName.slice(0, 32),
                            changeRank: codes.has('changeRank'),
                            warehouseAccess: codes.has('warehouseAccess'),
                            warehouseClosedAccess: codes.has('warehouseClosedAccess'),
                            warehouseToggle: codes.has('warehouseToggle'),
                            bizwar: isBizwarFrac ? codes.has('bizwar') : false,
                            withdrawMoney: codes.has('withdrawMoney'),
                            craftAccess: codes.has('craftAccess'),
                            canInvite: codes.has('canInvite'),
                            canDismiss: codes.has('canDismiss'),
                            canLogs: codes.has('canLogs')
                        });
                    }
                    // keep leader display name at index 9 as Лидер in UI — rank 10 not in ranks array
                    return saveFractionRanks(fid, fracData.ranks, (saveErr) => {
                        if (saveErr) {
                            fracData.ranks = previousRanks;
                            return resolve(errData('Не удалось сохранить настройки ранга'));
                        }
                        logFractionAction(fid, player, 'rank_config', `Обновил ранг ${rankNum}: «${cleanRankName.slice(0, 32)}»`);
                        isNotify(player, 1, 'top-mid', 'Настройки ранга сохранены.', 2500);
                        resolve(okData(true));
                    });
                }

                // stubs
                if (
                    name === 'server_faction_manage_vehicle_setRank' ||
                    name === 'server_faction_manage_vehicle_spawn' ||
                    name === 'server_faction_manage_editOrCreateWeaponSet' ||
                    name === 'server_faction_manage_deleteWeaponSet' ||
                    name === 'server_faction_manage_weaponSetEnable'
                ) {
                    return resolve(errData('Недоступно'));
                }
                if (name === 'server_faction_acr_accept') return resolve(okData(false));
                if (name === 'server_faction_acr_cancel') return resolve(okData(true));

                resolve(errData('Неизвестная команда'));
            } catch (e) {
                console.log('[FRACTIONS] handleFactionManage:', e && e.message ? e.message : e);
                resolve(errData('Ошибка сервера'));
            }
        });
    }

    // Bridge from CEF (через клиентский mp.trigger)
    mp.events.add('factionMenu:rpc:s', (player, nameRaw, argsJson, reqId) => {
        try {
            if (!mp.players.exists(player)) return;
            const name = String(nameRaw || '');
            let args = null;
            try {
                args = JSON.parse(String(argsJson || 'null'));
            } catch (_e) {
                return replyPlayer(player, reqId, true, errData('Некорректные данные формы'));
            }
            handleFactionManage(player, name, args).then((result) => {
                // Всегда resolve в CEF: setNotify/createNews ждут строку;
                // getAsync — {error,data}; unInvite — {error:0|1}.
                replyPlayer(player, reqId, true, result);
            }).catch((e) => {
                replyPlayer(player, reqId, false, String(e || 'Ошибка'));
            });
        } catch (e) {
            console.log('[FRACTIONS] factionMenu:rpc:s:', e && e.message ? e.message : e);
            try { replyPlayer(player, reqId, false, 'Ошибка'); } catch (_e) {}
        }
    });

    // Маппер GTA5RP weaponIndex → калибры
    function gta5rpWeaponToCalibers(idx) {
        return [BIZWAR_ONLY_CALIBER];
    }

    // Также регистрируем через rage-rpc (если CEF дойдёт напрямую)
    if (!global.rpc) {
        try { global.rpc = require('./rage-rpc.min.js'); } catch (_e) {}
    }
    const rpc = global.rpc;
    if (rpc && typeof rpc.register === 'function') {
        const names = [
            'server_faction_manage_notify',
            'server_faction_manage_new_news',
            'server_faction_manage_warehouse_closeStatus',
            'server_faction_manage_members_unInvite',
            'server_faction_manage_members_rank',
            'server_faction_manage_rank_setPermission',
            'server_faction_manage_vehicle_setRank',
            'server_faction_manage_vehicle_spawn',
            'server_faction_acr_accept',
            'server_faction_acr_cancel',
            'server_faction_manage_editOrCreateWeaponSet',
            'server_faction_manage_deleteWeaponSet',
            'server_faction_manage_weaponSetEnable',
            'server_faction_gang_capture',
            'server_faction_mafia_bizwar'
        ];
        names.forEach((n) => {
            rpc.register(n, (args, info) => {
                const player = info && info.player;
                if (n === 'server_faction_gang_capture' || n === 'server_faction_mafia_bizwar') {
                    return handleGta5rpBizwarRpc(player, n, args);
                }
                return handleFactionManage(player, n, args);
            });
        });
        console.log('[FRACTIONS] GTA5RP faction menu RPC registered (+capt/bizwar)');
    }

    async function handleGta5rpBizwarRpc(player, name, args) {
        try {
            const fid    = playerFractionId(player);
            const fracData = fid ? global.fractionsData[fid] : null;
            const rank = playerFractionRank(player);
            if (!fid || !fracData || (!isLeader(player) && !rankHasPerm(fracData, rank, 'bizwar'))) {
                return { error: 1, errorText: 'Нет прав для начала капта.' };
            }
            if (isBizwarNightLocked()) {
                return { error: 1, errorText: bizwarNightLockMessage() };
            }

            const zoneId   = parseInt(args[0], 10);
            const count = parseInt(args[1], 10);
            const isTrue = (value) => value === true || value === 1 || value === '1' || value === 'true';
            const allowAlco = isTrue(args[2]);
            const allowSpunk = isTrue(args[3]);
            const allowArmor = isTrue(args[5]);
            const weaponIdx   = parseInt(args[6], 10) || 0;

            if (isNaN(zoneId) || zoneId < 1 || zoneId > DEFAULT_ZONE_COUNT)
                return { error: 1, errorText: 'Неверный номер зоны.' };
            if (!Number.isInteger(count) || count < BIZWAR_MIN_TEAM_PLAYERS || count > BIZWAR_MAX_TEAM_PLAYERS) {
                return { error: 1, errorText: `Размер состава должен быть от ${BIZWAR_MIN_TEAM_PLAYERS} до ${BIZWAR_MAX_TEAM_PLAYERS}.` };
            }

            if (global.activeBizwars[zoneId])
                return { error: 1, errorText: 'Капт на этой зоне уже идёт.' };

            const busyZoneId = getFirstActiveBizwarZoneId();
            if (busyZoneId != null) {
                return { error: 1, errorText: `На сервере уже идёт капт (зона #${busyZoneId}). Дождитесь окончания.` };
            }

            const activeForFrac = getActiveBizwarZonesForFraction(fid);
            if (activeForFrac.length >= 1)
                return { error: 1, errorText: `Ваша фракция уже в капте (зона #${activeForFrac[0]}).` };

            const ownerFrac = global.gangZones[zoneId] || 0;
            if (ownerFrac === fid) return { error: 1, errorText: 'Это ваша зона.' };
            const isCounterDef = isBizwarCounterDefAttack(fid, zoneId, ownerFrac);

            global.gangZoneDefCooldowns = global.gangZoneDefCooldowns || {};
            const zoneDefCd = global.gangZoneDefCooldowns[zoneId];
            if (zoneDefCd && Date.now() < zoneDefCd) {
                const left = Math.ceil((zoneDefCd - Date.now()) / 60000);
                return { error: 1, errorText: `Зона под защитой после успешного дефа. Атака через ${left} мин.` };
            }

            const cd  = getBizwarCooldown(fid);
            const now = Date.now();
            if (isCounterDef) {
                if (now < cd.nextPointUntil) {
                    const left = Math.ceil((cd.nextPointUntil - now) / 60000);
                    return { error: 1, errorText: `КД на деф: ещё ${left} мин.` };
                }
            } else if (now < cd.anyAttackUntil) {
                const left = Math.ceil((cd.anyAttackUntil - now) / 60000);
                return { error: 1, errorText: `КД на атаку: ещё ${left} мин.` };
            }

            const calibers = gta5rpWeaponToCalibers(weaponIdx);

            const isNeutralZone = ownerFrac === 0;
            const atkOnline = countFracOnline(fid);
            const defOnline = isNeutralZone ? 0 : countFracOnline(ownerFrac);

            if (atkOnline < BIZWAR_MIN_TEAM_PLAYERS)
                return { error: 1, errorText: `Нужно минимум ${BIZWAR_MIN_TEAM_PLAYERS} онлайн-игроков вашей фракции. Сейчас: ${atkOnline}` };
            if (!isCounterDef && !isNeutralZone && defOnline < BIZWAR_MIN_TEAM_PLAYERS)
                return { error: 1, errorText: `У защищающейся фракции нужно минимум ${BIZWAR_MIN_TEAM_PLAYERS} онлайн. Сейчас: ${defOnline}` };
            if (!isNeutralZone) {
                if (atkOnline < count)
                    return { error: 1, errorText: `Нужно минимум ${count} онлайн-игроков. Сейчас: ${atkOnline}` };
                if (!isCounterDef && defOnline < count)
                    return { error: 1, errorText: `У защищающейся фракции только ${defOnline} онлайн-игроков (нужно ${count}).` };
            }

            const arenaMeta = getBizwarZoneArenaMeta(zoneId);
            if (!arenaMeta) return { error: 1, errorText: 'Арена для этой зоны не настроена.' };

            const busyBeforeStart = getFirstActiveBizwarZoneId();
            if (busyBeforeStart != null) {
                return { error: 1, errorText: `На сервере уже идёт капт (зона #${busyBeforeStart}). Дождитесь окончания.` };
            }

            const startedAt = Date.now();
            global.activeBizwars[zoneId] = {
                attackerFrac: fid,
                defenderFrac: ownerFrac,
                calibers, count,
                allowArmor, allowSpunk, allowAlco,
                allowMedic: true,
                startedAt, isStarted: false, fightStartedAt: 0,
                players: {}, eliminated: {}, combatStats: {},
                arenaCx: arenaMeta.cx,
                arenaCy: arenaMeta.cy,
                arenaCz: arenaMeta.cz,
                arenaRadius: arenaMeta.radius
            };

            broadcastZoneFlash(zoneId, true);

            const atkName = getFractionName(fid);
            const defName = isNeutralZone ? 'Нейтрально' : getFractionName(ownerFrac);
            const calStr  = calibers.join(', ');

            (function postBizwarDiscord() {
                try {
                    const st = global.activeBizwars[zoneId].startedAt;
                    const snap = {
                        createdMs: st,
                        fightStartMs: st + BIZWAR_PREP_MS,
                        zoneId, format: `${count}v${count}`,
                        calibers, allowAlco, allowSpunk, allowArmor,
                        attackerFrac: fid, defenderFrac: ownerFrac,
                        attackerName: atkName, defenderName: defName
                    };
                    if (typeof global.postDiscordBizwarAnnouncement === 'function') {
                        global.postDiscordBizwarAnnouncement(snap).then((meta) => {
                            try {
                                if (meta && global.activeBizwars && global.activeBizwars[zoneId]) {
                                    global.activeBizwars[zoneId].discordBizwar = { ...meta, snapshot: snap };
                                }
                            } catch (_e) {}
                        });
                    }
                } catch (_e) {}
            })();

            mp.players.forEach(p => {
                if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
                const pFid = playerFractionId(p);
                if (pFid === fid || pFid === ownerFrac) {
                    try {
                        p.call('chat:pushLine', [`!{#dc2626}[КАПТЫ] !{#e8e8e8}${atkName} атакует зону #${zoneId} (${defName}). Калибры: ${calStr}. Формат: ${count}v${count}`]);
                    } catch (_) {}
                }
            });

            logFractionAction(fid, player, 'bizwar_start',
                `Забил капт за зону #${zoneId} vs ${defName}. Формат ${count}v${count}, калибры: ${calStr}`);
            broadcastBizwarTpSync(fid, ownerFrac);
            const extrasStr = `Спанк: ${allowSpunk ? 'да' : 'нет'}, Алко: ${allowAlco ? 'да' : 'нет'}, Броня: ${allowArmor ? 'да' : 'нет'}`;
            if (typeof global.broadcastBizwarWarAlerts === 'function') {
                global.broadcastBizwarWarAlerts(fid, ownerFrac, zoneId, calStr, extrasStr, startedAt, atkName, defName, count);
            }
            console.log(`[BIZWAR][RPC] Zone #${zoneId} started by frac=${fid} vs frac=${ownerFrac} count=${count} cals=${calibers}`);

            return { error: 0 };
        } catch (e) {
            console.log('[BIZWAR][RPC] handleGta5rpBizwarRpc error:', e && e.message ? e.message : e);
            return { error: 1, errorText: 'Ошибка сервера.' };
        }
    }

    console.log('[FRACTIONS] GTA5RP faction menu bridge ready');
})();

console.log('[FRACTIONS] fraction_system.js loaded');
