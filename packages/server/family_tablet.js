/**
 * family_tablet.js
 * Планшет семьи — серверная логика (паттерны fraction_system.js tablet).
 *
 * require после family.js:
 *   require('./family.js');
 *   require('./family_tablet.js');
 */

'use strict';

const {
    CALIBER_KEYS: CAPT_CALIBER_KEYS,
    CALIBER_TO_WEAPON_ITEMS
} = require('./config/capt_bizwar_calibers.js');

const CAPT_VALID_WEAPON_KEYS = ['carbine', 'revolver', 'specialcarbine', 'minismg'];
const CAPT_ITEM_TO_LEGACY_KEY = {
    weapon_carbinerifle: 'carbine',
    weapon_specialcarbine: 'specialcarbine',
    weapon_minismg: 'minismg',
    weapon_revolver: 'revolver',
    weapon_revolver_mk2: 'revolver',
    weapon_heavysniper: 'carbine',
    weapon_heavysniper_mk2: 'carbine',
    weapon_heavyshotgun: 'carbine',
    weapon_assaultshotgun: 'carbine'
};
const CAPT_CALIBER_TO_WEAPONS = {};
for (const [cal, items] of Object.entries(CALIBER_TO_WEAPON_ITEMS)) {
    CAPT_CALIBER_TO_WEAPONS[cal] = items
        .map((item) => CAPT_ITEM_TO_LEGACY_KEY[item] || 'carbine')
        .filter((k, i, arr) => arr.indexOf(k) === i);
}
const DEFAULT_POINTS_COUNT = 90;
const ADVERT_PRICE = 100000;
const ADVERT_CD_MS = 60 * 60 * 1000;

/** Лимит участников семьи по умолчанию и ступени расширения (цена с баланса → новый max). */
const FAMILY_MEMBERS_BASE = 20;
const FAMILY_EXPAND_TIERS = [
    { max: 30, price: 200000 },
    { max: 50, price: 500000 },
    { max: 100, price: 1000000 }
];
/** Смена названия: 1-я бесплатно, 2-я 200 реп, 3-я 500 реп (всего 3 раза). */
const FAMILY_RENAME_MAX = 3;
const FAMILY_RENAME_COSTS = [0, 200, 500];

function familyRenameCost(nameChangesDone) {
    const n = Math.max(0, parseInt(nameChangesDone, 10) || 0);
    if (n >= FAMILY_RENAME_MAX) return null;
    return FAMILY_RENAME_COSTS[n] != null ? FAMILY_RENAME_COSTS[n] : null;
}

function getFamilyExpandNext(currentMax) {
    const cur = Math.max(FAMILY_MEMBERS_BASE, parseInt(currentMax, 10) || FAMILY_MEMBERS_BASE);
    for (let i = 0; i < FAMILY_EXPAND_TIERS.length; i++) {
        if (FAMILY_EXPAND_TIERS[i].max > cur) return FAMILY_EXPAND_TIERS[i];
    }
    return null;
}

function ensureFamilySettingsColumns(cb) {
    if (!global.DB) { if (cb) cb(); return; }
    const addCol = (name, ddl, next) => {
        global.DB.query(
            `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'families' AND COLUMN_NAME = ?`,
            [name],
            (err, rows) => {
                if (err || (rows && rows[0] && Number(rows[0].c) > 0)) return next();
                global.DB.query(ddl, [], () => next());
            }
        );
    };
    addCol(
        'members_max',
        `ALTER TABLE families ADD COLUMN members_max INT UNSIGNED NOT NULL DEFAULT ${FAMILY_MEMBERS_BASE}`,
        () => {
            addCol(
                'name_changes',
                'ALTER TABLE families ADD COLUMN name_changes TINYINT UNSIGNED NOT NULL DEFAULT 0',
                () => {
                    // Старые семьи без значения → база 20
                    global.DB.query(
                        `UPDATE families SET members_max = ? WHERE members_max IS NULL OR members_max < ?`,
                        [FAMILY_MEMBERS_BASE, FAMILY_MEMBERS_BASE],
                        () => { if (cb) cb(); }
                    );
                }
            );
        }
    );
}

// ─── DB bootstrap ─────────────────────────────────────────────────────────────

function ensureFamilyLogsTable(cb) {
    if (!global.DB) { if (cb) cb(); return; }
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS family_logs (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            family_name VARCHAR(255) NOT NULL,
            actor_static INT UNSIGNED NOT NULL DEFAULT 0,
            actor_name VARCHAR(64) NOT NULL DEFAULT '',
            action_type VARCHAR(32) NOT NULL DEFAULT '',
            action_text VARCHAR(512) NOT NULL DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_family_time (family_name, id),
            KEY idx_family_actor (family_name, actor_static)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        [],
        (err) => {
            if (err) console.log('[FAMILY TABLET] ensureFamilyLogsTable:', err.message || err);
            if (cb) cb();
        }
    );
}

function ensureFamilyWarehouseOpenColumn(cb) {
    if (!global.DB) { if (cb) cb(); return; }
    global.DB.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'families' AND COLUMN_NAME = 'warehouse_open'`,
        [],
        (err, rows) => {
            if (err || !rows || !rows[0] || Number(rows[0].c) > 0) return cb ? cb() : null;
            global.DB.query(
                'ALTER TABLE families ADD COLUMN warehouse_open TINYINT(1) NOT NULL DEFAULT 1',
                [],
                () => { if (cb) cb(); }
            );
        }
    );
}

/** Постоянный лог действий семьи в БД. */
function logFamilyAction(familyName, player, actionType, actionText) {
    const fam = String(familyName || '').trim();
    if (!global.DB || !fam) return;
    const actorStatic = player && player.static ? parseInt(player.static, 10) || 0 : 0;
    const actorName = player && (player.login || player.name)
        ? String(player.login || player.name).slice(0, 64)
        : 'Система';
    const type = String(actionType || 'other').slice(0, 32);
    const text = String(actionText || '').slice(0, 512);
    global.DB.query(
        'INSERT INTO family_logs (family_name, actor_static, actor_name, action_type, action_text) VALUES (?, ?, ?, ?, ?)',
        [fam, actorStatic, actorName, type, text],
        (err) => { if (err) console.log('[FAMILY TABLET] logFamilyAction:', err.message || err); }
    );
}

global.logFamilyAction = logFamilyAction;

// ─── helpers ──────────────────────────────────────────────────────────────────

function playerFamilyName(player) {
    return String(player && player.family ? player.family : '').trim();
}

function playerFamilyRank(player) {
    return parseInt(player && player.famRank, 10) || 0;
}

function isFamilyLeader(player) {
    return playerFamilyRank(player) === 10;
}

function normalizeCaptFamilyKey(name) {
    if (name == null || name === undefined) return '';
    return String(name).trim();
}

function parseFamilyRankArray(rankJson) {
    try {
        const arr = typeof rankJson === 'string' ? JSON.parse(rankJson) : rankJson;
        if (!Array.isArray(arr)) return [];
        for (let i = 0; i < arr.length; i++) {
            if (!arr[i] || typeof arr[i] !== 'object') arr[i] = {};
            if (arr[i].familyWarehouseToggle === undefined) {
                arr[i].familyWarehouseToggle = (i === 10 || Number(arr[i].familyWarehouse) === 1) ? 1 : 0;
            }
            if (arr[i].familyWarehouseClosed === undefined) {
                arr[i].familyWarehouseClosed = i === 10 ? 1 : 0;
            }
        }
        return arr;
    } catch (_e) {
        return [];
    }
}

function familyRankFlag(row, key) {
    if (!row) return false;
    return Number(row[key]) === 1;
}

function familyRankHasPerm(rankArr, player, permKey) {
    if (!rankArr || !player) return false;
    const ids = typeof global.getPlayerFamilyRankIds === 'function'
        ? global.getPlayerFamilyRankIds(player)
        : [playerFamilyRank(player)].filter((r) => r >= 1 && r <= 10);
    if (ids.indexOf(10) !== -1) return true;
    const map = {
        changeRank: 'ChangeRank',
        canKick: 'CanKick',
        canInvite: 'CanInvite',
        familyWarehouse: 'familyWarehouse',
        familyWarehouseClosed: 'familyWarehouseClosed',
        familyWarehouseToggle: 'familyWarehouseToggle',
        captParticipate: 'captParticipate',
        fleetEvac: 'fleetEvac',
        fleetSummon: 'fleetSummon',
        withdrawMoney: 'withdrawMoney',
        canLogs: 'canLogs'
    };
    const dbKey = map[permKey] || permKey;
    for (let i = 0; i < ids.length; i++) {
        if (familyRankFlag(rankArr[ids[i]], dbKey)) return true;
    }
    return false;
}

function countFamilyMembersOnline(familyName) {
    if (typeof global.countFamilyMembersOnline === 'function') {
        return global.countFamilyMembersOnline(familyName);
    }
    const target = typeof global.normalizeCaptFamilyKey === 'function'
        ? global.normalizeCaptFamilyKey(familyName)
        : String(familyName || '').trim();
    if (!target) return 0;
    let n = 0;
    const list = typeof mp.players.toArray === 'function' ? (mp.players.toArray() || []) : [];
    const visit = (p) => {
        try {
            if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
            const raw = p.family || p.getVariable('family');
            const fam = typeof global.normalizeCaptFamilyKey === 'function'
                ? global.normalizeCaptFamilyKey(raw)
                : String(raw || '').trim();
            if (fam === target) n++;
        } catch (_e) {}
    };
    if (list.length) list.forEach(visit);
    else mp.players.forEach(visit);
    return n;
}

function captMaxNForPoint(attackerFamily, targetPoint, isCounterDef) {
    if (typeof global.captMaxNForPoint === 'function') {
        return global.captMaxNForPoint(attackerFamily, targetPoint, isCounterDef);
    }
    const attackerOnline = countFamilyMembersOnline(attackerFamily);
    const ownerRaw = targetPoint && targetPoint.owner;
    const ownerKey = normalizeCaptFamilyKey(ownerRaw);
    if (!ownerKey || ownerKey === 'Свободна') {
        return { maxN: attackerOnline, attackerOnline, defenderOnline: 0, hasDefender: false };
    }
    if (ownerKey === normalizeCaptFamilyKey(attackerFamily)) {
        return { maxN: attackerOnline, attackerOnline, defenderOnline: 0, hasDefender: false };
    }
    const defenderOnline = countFamilyMembersOnline(ownerKey);
    return {
        maxN: attackerOnline,
        attackerOnline,
        defenderOnline,
        hasDefender: true
    };
}

function captCalibersToWeaponSlots(calibers) {
    const picked = [];
    (calibers || []).forEach((cal) => {
        const key = String(cal || '').trim();
        if (!CAPT_CALIBER_KEYS.includes(key)) return;
        const list = CAPT_CALIBER_TO_WEAPONS[key] || [];
        list.forEach((w) => {
            if (CAPT_VALID_WEAPON_KEYS.includes(w) && picked.indexOf(w) === -1) picked.push(w);
        });
    });
    if (!picked.length) picked.push('carbine');
    return picked.slice(0, 3);
}

function parseCaptFormatN(formatStr) {
    if (typeof formatStr !== 'string') return 5;
    const m = /^(\d+)x(\d+)$/.exec(formatStr.trim());
    if (!m) return 5;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 5;
}

function isFamilyRankSlotCreated(row, index) {
    if (index === 10) return true;
    if (!row || typeof row !== 'object') return false;
    // Legacy: нет поля created → слот считается созданным
    if (row.created === undefined || row.created === null) return true;
    return Number(row.created) === 1;
}

function buildTabletRanksArray(rankArr) {
    const out = [];
    for (let i = 1; i <= 9; i++) {
        const row = rankArr[i] || {};
        const created = isFamilyRankSlotCreated(row, i);
        const name = String(row.rankName || '').trim() || `Ранг ${i}`;
        out.push({
            rank: i,
            name,
            created,
            changeRank: familyRankFlag(row, 'ChangeRank'),
            canKick: familyRankFlag(row, 'CanKick'),
            canInvite: familyRankFlag(row, 'CanInvite'),
            familyWarehouse: familyRankFlag(row, 'familyWarehouse'),
            familyWarehouseClosed: familyRankFlag(row, 'familyWarehouseClosed'),
            familyWarehouseToggle: familyRankFlag(row, 'familyWarehouseToggle'),
            captParticipate: familyRankFlag(row, 'captParticipate'),
            fleetEvac: familyRankFlag(row, 'fleetEvac'),
            fleetSummon: familyRankFlag(row, 'fleetSummon'),
            withdrawMoney: familyRankFlag(row, 'withdrawMoney'),
            canLogs: familyRankFlag(row, 'canLogs'),
            warehouseAccess: familyRankFlag(row, 'familyWarehouse'),
            warehouseClosedAccess: familyRankFlag(row, 'familyWarehouseClosed'),
            warehouseToggle: familyRankFlag(row, 'familyWarehouseToggle'),
            bizwar: familyRankFlag(row, 'captParticipate')
        });
    }
    return out;
}

function remappedFamilyRankAfterDelete(famRank, deletedSet, fallbackRank) {
    const r = parseInt(famRank, 10) || 0;
    if (r === 10) return 10;
    if (!deletedSet[r]) return r >= 1 && r <= 9 ? r : fallbackRank;
    return fallbackRank;
}

function cleanExtrasAfterRankDelete(extrasRaw, deletedSet, mainRank) {
    let arr = [];
    try {
        const j = typeof extrasRaw === 'string' ? JSON.parse(extrasRaw || '[]') : extrasRaw;
        if (Array.isArray(j)) arr = j;
    } catch (_e) {}
    return arr
        .map((n) => parseInt(n, 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9 && !deletedSet[n] && n !== mainRank)
        .slice(0, 3);
}

function fetchFamilyMembersList(familyName, rankArr, cb) {
    global.DB.query(
        'SELECT static, login, famRank, fam_rank_extra, last_login FROM accounts WHERE family = ? ORDER BY famRank DESC, login ASC',
        [familyName],
        (err, rows) => {
            if (err) {
                // fallback without last_login / fam_rank_extra
                return global.DB.query(
                    'SELECT static, login, famRank FROM accounts WHERE family = ? ORDER BY famRank DESC, login ASC',
                    [familyName],
                    (err2, rows2) => {
                        if (err2) {
                            console.log('[FAMILY TABLET] fetchFamilyMembersList:', err2.message || err2);
                            return cb([]);
                        }
                        mapAndReturn(rows2 || [], rankArr, familyName, cb);
                    }
                );
            }
            mapAndReturn(rows || [], rankArr, familyName, cb);
        }
    );
}

function mapAndReturn(rows, rankArr, familyName, cb) {
    const onlineByStatic = new Map();
    const famKey = typeof global.normalizeCaptFamilyKey === 'function'
        ? global.normalizeCaptFamilyKey(familyName)
        : normalizeCaptFamilyKey(familyName);
    const onlinePlayers = typeof mp.players.toArray === 'function' ? (mp.players.toArray() || []) : [];
    const markOnline = (p) => {
        try {
            if (!p || !mp.players.exists(p) || p.static == null) return;
            const rawName = p.family || (typeof p.getVariable === 'function' ? p.getVariable('family') : '');
            const nameKey = typeof global.normalizeCaptFamilyKey === 'function'
                ? global.normalizeCaptFamilyKey(rawName)
                : normalizeCaptFamilyKey(rawName);
            if (nameKey && nameKey === famKey) {
                onlineByStatic.set(Number(p.static), p);
            }
        } catch (_e) {}
    };
    if (onlinePlayers.length) onlinePlayers.forEach(markOnline);
    else {
        try { mp.players.forEach(markOnline); } catch (_e2) {}
    }
    const list = (rows || []).map((row) => {
        const rank = parseInt(row.famRank, 10) || 0;
        const staticId = Number(row.static);
        const extras = [];
        try {
            const ex = row.fam_rank_extra != null ? JSON.parse(String(row.fam_rank_extra)) : [];
            if (Array.isArray(ex)) {
                ex.forEach((n) => {
                    const r = parseInt(n, 10);
                    if (r >= 1 && r <= 9 && r !== rank && extras.indexOf(r) === -1) extras.push(r);
                });
            }
        } catch (_e) {}
        extras.sort((a, b) => b - a);

        // Для UI редактирования: только группы 1–9 (у лидера — доп. ранги)
        const editIds = rank === 10
            ? extras.slice(0, 3)
            : [rank, ...extras].filter((r, i, arr) => r >= 1 && r <= 9 && arr.indexOf(r) === i).slice(0, 4);

        const nameBits = editIds.map((r) => {
            const rRow = rankArr[r];
            return (rRow && String(rRow.rankName || '').trim()) || `Ранг ${r}`;
        });
        let rankName;
        if (rank === 10) {
            rankName = nameBits.length ? `Лидер, ${nameBits.join(', ')}` : 'Лидер';
        } else {
            rankName = nameBits.length
                ? nameBits.join(', ')
                : ((rankArr[rank] && String(rankArr[rank].rankName || '').trim()) || `Ранг ${rank}`);
        }
        const onlinePlayer = onlineByStatic.get(staticId);
        return {
            id: onlinePlayer ? onlinePlayer.id : 0,
            static: staticId,
            name: row.login || `Игрок #${staticId}`,
            rank,
            rankIds: editIds,
            rankName,
            prefix: null,
            online: !!onlinePlayer,
            lastLogin: row.last_login != null ? parseInt(row.last_login, 10) || 0 : 0
        };
    });
    cb(list);
}

function buildFamilyTabletPayload(player, familyRow, rankArr, membersList, mansionInfo) {
    const rank = playerFamilyRank(player);
    const canManageRanks = familyRankHasPerm(rankArr, player, 'changeRank');
    const canKickMember = familyRankHasPerm(rankArr, player, 'canKick');
    const canInvite = familyRankHasPerm(rankArr, player, 'canInvite');
    const canWarehouse = familyRankHasPerm(rankArr, player, 'familyWarehouse');
    const canWarehouseClosed = familyRankHasPerm(rankArr, player, 'familyWarehouseClosed');
    const canWarehouseToggle = familyRankHasPerm(rankArr, player, 'familyWarehouseToggle');
    const canCapt = familyRankHasPerm(rankArr, player, 'captParticipate');
    const canWithdrawMoney = rank === 10 || familyRankHasPerm(rankArr, player, 'withdrawMoney');
    const canLogs = rank === 10 || familyRankHasPerm(rankArr, player, 'canLogs');
    const totalZones = (global.serverPoints && global.serverPoints.length) || DEFAULT_POINTS_COUNT;
    const territories = parseInt(familyRow.territories, 10) || 0;
    const hasMansion = !!(mansionInfo && mansionInfo.hasMansion);
    const mansionDoorOpen = !!(mansionInfo && mansionInfo.doorOpen);
    const mansionId = mansionInfo && mansionInfo.mansionId != null ? Number(mansionInfo.mansionId) : 0;

    return {
        familyName: familyRow.name,
        createDate: familyRow.regdate ? String(familyRow.regdate) : '',
        playerRank: rank,
        playerStatic: player.static != null ? Number(player.static) : null,
        myName: player.login ? String(player.login) : (player.name ? String(player.name) : ''),
        playerName: player.login ? String(player.login) : (player.name ? String(player.name) : ''),
        isLeader: rank === 10,
        canManageRanks,
        canKickMember,
        canInvite,
        canWarehouse,
        canWarehouseClosed,
        canWarehouseToggle,
        canCapt,
        canWithdrawMoney,
        canLogs,
        hasMansion,
        mansionId: mansionId || undefined,
        mansionDoorOpen,
        mansionPrice: typeof global.FAMILY_MANSION_PRICE === 'number' ? global.FAMILY_MANSION_PRICE : 8000000,
        mansionRent: typeof global.FAMILY_MANSION_WEEKLY_TAX === 'number' ? global.FAMILY_MANSION_WEEKLY_TAX : 100000,
        warehouseOpen: familyRow.warehouse_open == null ? true : Number(familyRow.warehouse_open) !== 0,
        hasCaptTab: true,
        hasGarageTab: hasMansion,
        membersMaxCount: Math.max(FAMILY_MEMBERS_BASE, parseInt(familyRow.members_max, 10) || FAMILY_MEMBERS_BASE),
        nameChanges: Math.max(0, Math.min(FAMILY_RENAME_MAX, parseInt(familyRow.name_changes, 10) || 0)),
        renameCost: familyRenameCost(parseInt(familyRow.name_changes, 10) || 0),
        renameLeft: Math.max(0, FAMILY_RENAME_MAX - (parseInt(familyRow.name_changes, 10) || 0)),
        expandNext: getFamilyExpandNext(parseInt(familyRow.members_max, 10) || FAMILY_MEMBERS_BASE),
        stats: {
            balance: parseInt(familyRow.balance, 10) || 0,
            ratingPoints: parseInt(familyRow.rating_points, 10) || 0,
            territories,
            captLevel: parseInt(familyRow.capts, 10) || 0
        },
        members: membersList,
        ranks: buildTabletRanksArray(rankArr),
        ownedZones: territories,
        totalZones
    };
}

function loadFamilyTabletContext(player, cb) {
    const fam = playerFamilyName(player);
    if (!fam) return cb(new Error('no family'));

    global.DB.query(
        'SELECT id, name, regdate, `rank`, balance, rating_points, territories, capts, warehouse_open, members_max, name_changes FROM families WHERE name = ? LIMIT 1',
        [fam],
        (err, rows) => {
            if (err) {
                return global.DB.query(
                    'SELECT id, name, regdate, `rank`, balance, rating_points, territories, capts, warehouse_open FROM families WHERE name = ? LIMIT 1',
                    [fam],
                    (err2, rows2) => {
                        if (err2) return cb(err2);
                        if (!rows2 || !rows2.length) return cb(new Error('family not found'));
                        continueTabletLoad(player, rows2[0], cb);
                    }
                );
            }
            if (!rows || !rows.length) return cb(new Error('family not found'));
            continueTabletLoad(player, rows[0], cb);
        }
    );
}

function continueTabletLoad(player, familyRow, cb) {
    const fam = playerFamilyName(player);
    const rankArr = parseFamilyRankArray(familyRow.rank);
    const fid = parseInt(familyRow.id, 10);
    const finish = (mansionInfo) => {
        fetchFamilyMembersList(fam, rankArr, (membersList) => {
            if (!mp.players.exists(player)) return;
            cb(null, buildFamilyTabletPayload(player, familyRow, rankArr, membersList, mansionInfo));
        });
    };
    if (!fid) return finish({ hasMansion: false, doorOpen: false, mansionId: 0 });

    global.DB.query(
        'SELECT mansion_id, door_open FROM family_mansion_ownership WHERE family_id = ? LIMIT 1',
        [fid],
        (e2, mRows) => {
            if (e2 || !mRows || !mRows.length) {
                return global.DB.query(
                    'SELECT mansion_id FROM family_mansion_ownership WHERE family_id = ? LIMIT 1',
                    [fid],
                    (e3, mRows2) => {
                        const has = !e3 && mRows2 && mRows2.length > 0;
                        finish({
                            hasMansion: has,
                            doorOpen: false,
                            mansionId: has ? Number(mRows2[0].mansion_id) : 0
                        });
                    }
                );
            }
            finish({
                hasMansion: true,
                doorOpen: Number(mRows[0].door_open) !== 0,
                mansionId: Number(mRows[0].mansion_id) || 0
            });
        }
    );
}

function syncServerPointOwner(id, owner) {
    if (!global.serverPoints) global.serverPoints = [];
    const ownerVal = owner != null && String(owner).trim() !== '' ? String(owner).trim() : null;
    let pt = global.serverPoints.find((p) => p.id === id);
    if (pt) {
        pt.owner = ownerVal;
    } else {
        global.serverPoints.push({ id, owner: ownerVal, underAttack: false, capturedAt: null });
    }
}

function buildServerPointsOwnerMap() {
    const total = Math.max(
        DEFAULT_POINTS_COUNT,
        ...(global.serverPoints || []).map((p) => (p && p.id ? Number(p.id) : 0)),
        0
    );
    const map = {};
    for (let i = 1; i <= total; i++) map[i] = '';
    (global.serverPoints || []).forEach((p) => {
        if (!p || p.id == null) return;
        const own = p.owner != null && String(p.owner).trim() !== '' ? String(p.owner).trim() : '';
        map[p.id] = own;
    });
    return map;
}

/** Актуальная карта владельцев 1…N из family_points (+ синхронизация global.serverPoints). */
function queryFamilyPointsOwnerMap(cb) {
    if (!global.DB) return cb(buildServerPointsOwnerMap());

    global.DB.query('SELECT id, owner_family FROM family_points ORDER BY id', [], (err, rows) => {
        const total = Math.max(
            DEFAULT_POINTS_COUNT,
            ...(global.serverPoints || []).map((p) => (p && p.id ? Number(p.id) : 0)),
            ...(rows || []).map((r) => Number(r.id)),
            0
        );
        const map = {};
        for (let i = 1; i <= total; i++) map[i] = '';

        if (!err && rows && rows.length) {
            rows.forEach((r) => {
                const id = parseInt(r.id, 10);
                if (!Number.isFinite(id) || id < 1) return;
                const own = r.owner_family != null ? String(r.owner_family).trim() : '';
                map[id] = own;
                syncServerPointOwner(id, own || null);
            });
        } else {
            Object.assign(map, buildServerPointsOwnerMap());
        }
        cb(map);
    });
}

function buildFamilyPointsUiMap(ownerMap) {
    const total = Math.max(
        DEFAULT_POINTS_COUNT,
        ...(global.serverPoints || []).map((p) => (p && p.id ? Number(p.id) : 0)),
        ...Object.keys(ownerMap || {}).map((k) => Number(k)),
        0
    );
    const out = {};
    for (let i = 1; i <= total; i++) {
        const pt = (global.serverPoints || []).find((p) => p.id === i);
        const ownerFromPt = pt && pt.owner != null ? String(pt.owner).trim() : '';
        const ownerFromMap = ownerMap && ownerMap[i] != null ? String(ownerMap[i]).trim() : '';
        out[i] = {
            owner: ownerFromPt || ownerFromMap || '',
            underAttack: !!(pt && pt.underAttack)
        };
    }
    return out;
}

function pushFamilyWarMapStatsToPlayer(player, territoriesOverride) {
    if (!mp.players.exists(player)) return;
    const fam = playerFamilyName(player);
    if (!fam) {
        try { player.call('family:warMap:stats:c', [0, 0, 0]); } catch (_e) {}
        return;
    }

    const sendStats = (territories) => {
        if (!mp.players.exists(player)) return;
        const stats = typeof global.getFamilyTerritoryHourlyIncome === 'function'
            ? global.getFamilyTerritoryHourlyIncome(territories)
            : { moneyPerHour: 0, reputationPerHour: 0, territories: 0 };
        try {
            player.call('family:warMap:stats:c', [
                stats.moneyPerHour,
                stats.reputationPerHour,
                stats.territories,
                fam
            ]);
        } catch (_e2) {}
    };

    if (territoriesOverride != null && Number.isFinite(Number(territoriesOverride))) {
        sendStats(parseInt(territoriesOverride, 10) || 0);
        return;
    }

    if (!global.DB) return sendStats(0);
    global.DB.query('SELECT territories FROM families WHERE name = ? LIMIT 1', [fam], (err, rows) => {
        if (!mp.players.exists(player)) return;
        if (err || !rows || !rows.length) return sendStats(0);
        sendStats(parseInt(rows[0].territories, 10) || 0);
    });
}

function refreshFamilyWarMapStatsForFamily(familyName) {
    const key = String(familyName || '').trim();
    if (!key) return;
    mp.players.forEach((player) => {
        if (!player.getVariable('auth') || playerFamilyName(player) !== key) return;
        pushFamilyWarMapStatsToPlayer(player);
    });
}

global.pushFamilyWarMapStatsToPlayer = pushFamilyWarMapStatsToPlayer;
global.refreshFamilyWarMapStatsForFamily = refreshFamilyWarMapStatsForFamily;

function pushFamilyPointsMapToPlayer(player, cb) {
    queryFamilyPointsOwnerMap((map) => {
        if (!mp.players.exists(player)) return;
        const payload = buildFamilyPointsUiMap(map);
        try {
            player.call('family:points:data:c', [JSON.stringify(payload)]);
        } catch (_e) {}
        pushFamilyWarMapStatsToPlayer(player);
        if (cb) cb(payload);
    });
}

function buildFamilyAdvertLines(familyName) {
    const fn = familyName || 'Семья';
    return {
        1: [
            '!{#00ff37}----------------ОБЪЯВЛЕНИЕ----------------',
            `!{#00ff37}Семья ${fn} приветствует всех игроков сервера!`,
            '!{#00ff37}Хотим проинформировать Вас о том, что прямо сейчас мы ведём набор в нашу семью.',
            '!{#00ff37}Всех желающих вступить в наши ряды ждём около офиса Arcadius!'
        ],
        2: [
            '!{#00ff37}----------------ОБЪЯВЛЕНИЕ----------------',
            `!{#00ff37}На связи семья ${fn}!`,
            '!{#00ff37}Прямо сейчас мы проводим набор в нашу семью!',
            '!{#00ff37}Хочешь играть Капты, зарабатывать деньги, завести новые знакомства? Тогда тебе к нам.',
            '!{#00ff37}Всех, кто хочет присоединиться к нам ждём около офиса Arcadius!'
        ],
        3: [
            '!{#00ff37}----------------ОБЪЯВЛЕНИЕ----------------',
            `!{#00ff37}Прямо сейчас проводится набор в семью ${fn}!`,
            '!{#00ff37}Если ты хочешь получить ещё больше контента, перестрелок, Каптов, интересных мероприятий - тогда тебе к нам!',
            '!{#00ff37}Всех желающих вступить в наши ряды ждём около офиса Arcadius!'
        ]
    };
}

/** Обёртка для существующего family:kick:s (static id). */
function familyKickMember(player, targetStatic) {
    mp.events.call('family:kick:s', player, targetStatic);
}

// ─── Планшет: открытие ───────────────────────────────────────────────────────

mp.events.add('family:tablet:open:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam) return isNotify(player, 2, 'top-mid', 'Вы не состоите в семье.', 3000);

        loadFamilyTabletContext(player, (err, payload) => {
            if (err) {
                console.log('[FAMILY TABLET] tablet:open:', err.message || err);
                return isNotify(player, 2, 'top-mid', 'Данные семьи не найдены.', 3000);
            }
            if (!mp.players.exists(player)) return;
            player.call('family:tablet:open:c', [JSON.stringify(payload)]);
            mp.events.call('family:loadplayers:s', player);
        });
    } catch (e) { console.log('[FAMILY TABLET] tablet:open:', e.message || e); }
});

// ─── Участники ────────────────────────────────────────────────────────────────

mp.events.add('family:members:refresh:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam) return;

        global.DB.query('SELECT `rank` FROM families WHERE name = ? LIMIT 1', [fam], (err, rows) => {
            if (err || !rows || !rows.length) return;
            const rankArr = parseFamilyRankArray(rows[0].rank);
            fetchFamilyMembersList(fam, rankArr, (membersList) => {
                if (!mp.players.exists(player)) return;
                player.call('family:members:list:c', [JSON.stringify(membersList)]);
            });
        });
    } catch (e) { console.log('[FAMILY TABLET] members:refresh:', e.message || e); }
});

// ─── Ранг участника ───────────────────────────────────────────────────────────

mp.events.add('family:rank:set:s', (player, targetStaticRaw, newRankRaw, reasonRaw, extrasJsonRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam) return;

        const targetStatic = parseInt(targetStaticRaw, 10);
        let newRank = parseInt(newRankRaw, 10);
        const reason = String(reasonRaw || '').trim().slice(0, 256) || 'Причина не указана';
        const isSelf = Number(player.static) === Number(targetStatic);

        if (!Number.isFinite(targetStatic) || targetStatic < 1) {
            return isNotify(player, 2, 'top-mid', 'Неверный игрок.', 3000);
        }
        if (isSelf) {
            return isNotify(player, 2, 'top-mid', 'Вы не можете изменять ранг самому себе.', 3000);
        }
        if (!Number.isFinite(newRank) || newRank < 1 || newRank > 9) {
            return isNotify(player, 2, 'top-mid', 'Неверный ранг (1-9).', 3000);
        }

        let extrasArr = [];
        if (extrasJsonRaw != null && String(extrasJsonRaw).trim() !== '') {
            try {
                const ex = JSON.parse(String(extrasJsonRaw));
                if (Array.isArray(ex)) {
                    extrasArr = [
                        ...new Set(
                            ex
                                .map((n) => parseInt(n, 10))
                                .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9 && n !== newRank)
                        )
                    ].slice(0, 3);
                }
            } catch (_e) {
                extrasArr = [];
            }
        }

        global.DB.query('SELECT `rank` FROM families WHERE name = ? LIMIT 1', [fam], (err, rows) => {
            if (err || !rows || !rows.length) {
                return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
            }
            const rankArr = parseFamilyRankArray(rows[0].rank);
            if (newRank >= 1 && newRank <= 9 && !isFamilyRankSlotCreated(rankArr[newRank], newRank)) {
                return isNotify(player, 2, 'top-mid', 'Этот ранг ещё не создан.', 3000);
            }
            extrasArr = extrasArr.filter((n) => isFamilyRankSlotCreated(rankArr[n], n));
            const extrasJson = JSON.stringify(extrasArr);

            player._famRankSetMeta = { reason, fam, targetStatic, newRank, extrasJson };
            mp.events.call('family:changerank:s', player, targetStatic, newRank, extrasJson);
        });
    } catch (e) { console.log('[FAMILY TABLET] rank:set:', e.message || e); }
});

// ─── Настройки рангов ─────────────────────────────────────────────────────────

mp.events.add('family:rankconfig:save:s', (player, ranksJsonRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam || !isFamilyLeader(player)) {
            return isNotify(player, 2, 'top-mid', 'Только лидер может настраивать ранги.', 3000);
        }

        let incoming;
        try { incoming = JSON.parse(ranksJsonRaw); } catch (_) {
            return isNotify(player, 2, 'top-mid', 'Ошибка данных.', 3000);
        }
        if (!Array.isArray(incoming)) return;

        global.DB.query('SELECT `rank` FROM families WHERE name = ? LIMIT 1', [fam], (err, rows) => {
            if (err || !rows || !rows.length) {
                return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
            }
            const current = parseFamilyRankArray(rows[0].rank);
            while (current.length < 11) current.push({});

            const deletedSet = {};
            let createdCount = 0;
            for (let i = 1; i <= 9; i++) {
                const src = incoming.find((r) => parseInt(r.rank, 10) === i) || {};
                const prev = current[i] || {};
                const wasCreated = isFamilyRankSlotCreated(prev, i);
                let nowCreated;
                if (src.created === false || src.created === 0 || src.created === '0') nowCreated = 0;
                else if (src.created === true || src.created === 1 || src.created === '1') nowCreated = 1;
                else nowCreated = wasCreated ? 1 : 0;

                if (nowCreated) createdCount++;
                if (wasCreated && !nowCreated) deletedSet[i] = true;

                current[i] = {
                    CanInvite: nowCreated && src.canInvite ? 1 : 0,
                    ChangeRank: nowCreated && src.changeRank ? 1 : 0,
                    CanKick: nowCreated && src.canKick ? 1 : 0,
                    withdrawMoney: nowCreated && src.withdrawMoney ? 1 : 0,
                    familyWarehouse: nowCreated && (src.familyWarehouse || src.warehouseAccess) ? 1 : 0,
                    familyWarehouseClosed: nowCreated && (src.familyWarehouseClosed || src.warehouseClosedAccess) ? 1 : 0,
                    familyWarehouseToggle: nowCreated && (src.familyWarehouseToggle || src.warehouseToggle) ? 1 : 0,
                    captParticipate: nowCreated && (src.captParticipate || src.bizwar) ? 1 : 0,
                    fleetEvac: nowCreated && src.fleetEvac ? 1 : 0,
                    fleetSummon: nowCreated && src.fleetSummon ? 1 : 0,
                    canLogs: nowCreated && src.canLogs ? 1 : 0,
                    created: nowCreated,
                    rankName: nowCreated
                        ? String(src.name || src.rankName || prev.rankName || (`Ранг ${i}`)).trim().slice(0, 40)
                        : ''
                };
            }

            if (createdCount < 1) {
                return isNotify(player, 2, 'top-mid', 'Нужен хотя бы один ранг.', 3000);
            }
            if (createdCount > 9) {
                return isNotify(player, 2, 'top-mid', 'Максимум 9 рангов.', 3000);
            }

            let fallbackRank = 1;
            for (let i = 1; i <= 9; i++) {
                if (isFamilyRankSlotCreated(current[i], i)) {
                    fallbackRank = i;
                    break;
                }
            }

            let rankJson = JSON.stringify(current);
            if (typeof global.normalizeFamilyRankJson === 'function') {
                rankJson = global.normalizeFamilyRankJson(current);
            }

            const finishSave = () => {
                global.DB.query('UPDATE families SET `rank` = ? WHERE name = ?', [rankJson, fam], (e2) => {
                    if (e2) {
                        console.log('[FAMILY TABLET] rankconfig:save:', e2.message || e2);
                        return isNotify(player, 2, 'top-mid', 'Не удалось сохранить ранги.', 3000);
                    }
                    logFamilyAction(fam, player, 'rank_config', 'Обновил настройки рангов 1–9');
                    isNotify(player, 1, 'top-mid', 'Настройки рангов сохранены.', 3000);
                });
            };

            const deletedIds = Object.keys(deletedSet).map((x) => parseInt(x, 10)).filter((n) => n >= 1 && n <= 9);
            if (!deletedIds.length) {
                return finishSave();
            }

            global.DB.query(
                'SELECT static, famRank, fam_rank_extra FROM accounts WHERE family = ?',
                [fam],
                (eMem, memRows) => {
                    if (eMem) {
                        // Колонка fam_rank_extra может отсутствовать — fallback
                        return global.DB.query(
                            'SELECT static, famRank FROM accounts WHERE family = ?',
                            [fam],
                            (e2, rows2) => {
                                if (e2 || !rows2 || !rows2.length) return finishSave();
                                remapMembersAfterRankDelete(rows2, deletedSet, fallbackRank, finishSave);
                            }
                        );
                    }
                    if (!memRows || !memRows.length) return finishSave();
                    remapMembersAfterRankDelete(memRows, deletedSet, fallbackRank, finishSave);
                }
            );
        });
    } catch (e) { console.log('[FAMILY TABLET] rankconfig:save:', e.message || e); }
});

function remapMembersAfterRankDelete(memRows, deletedSet, fallbackRank, done) {
    let pending = memRows.length;
    const doneOne = () => {
        pending--;
        if (pending <= 0) done();
    };
    memRows.forEach((row) => {
        const oldMain = parseInt(row.famRank, 10) || 0;
        const newMain = remappedFamilyRankAfterDelete(oldMain, deletedSet, fallbackRank);
        const newExtras = cleanExtrasAfterRankDelete(row.fam_rank_extra, deletedSet, newMain);
        const extrasJson = JSON.stringify(newExtras);
        const oldExtras = String(row.fam_rank_extra != null ? row.fam_rank_extra : '[]');
        if (newMain === oldMain && extrasJson === oldExtras) return doneOne();

        const applyOnline = () => {
            try {
                mp.players.forEach((p) => {
                    if (!mp.players.exists(p) || !p.getVariable('auth')) return;
                    if (Number(p.static) !== Number(row.static)) return;
                    p.famRank = newMain;
                    p.famRankExtra = extrasJson;
                    try { p.setVariable('famRank', newMain); } catch (_e) {}
                });
            } catch (_e2) {}
            doneOne();
        };

        global.DB.query(
            'UPDATE accounts SET famRank = ?, fam_rank_extra = ? WHERE static = ? LIMIT 1',
            [newMain, extrasJson, row.static],
            (eUp) => {
                if (eUp) {
                    return global.DB.query(
                        'UPDATE accounts SET famRank = ? WHERE static = ? LIMIT 1',
                        [newMain, row.static],
                        () => applyOnline()
                    );
                }
                applyOnline();
            }
        );
    });
}

// ─── Склад: открыть/закрыть ───────────────────────────────────────────────────

mp.events.add('family:warehouse:toggle:s', (player, openRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam) return;

        global.DB.query('SELECT `rank` FROM families WHERE name = ? LIMIT 1', [fam], (err, rows) => {
            if (err || !rows || !rows.length) {
                return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
            }
            const rankArr = parseFamilyRankArray(rows[0].rank);
            if (!isFamilyLeader(player) && !familyRankHasPerm(rankArr, player, 'familyWarehouseToggle')) {
                return isNotify(player, 2, 'top-mid', 'Нет права управлять складом.', 3500);
            }

            const open = openRaw === true || openRaw === 1 || openRaw === '1' || String(openRaw).toLowerCase() === 'true';

            global.DB.query('UPDATE families SET warehouse_open = ? WHERE name = ?', [open ? 1 : 0, fam], (e2) => {
                if (e2) {
                    console.log('[FAMILY TABLET] warehouse:toggle:', e2.message || e2);
                    return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
                }
                logFamilyAction(fam, player, 'warehouse_toggle', open ? 'Склад открыт' : 'Склад закрыт');
                isNotify(player, 3, 'top-mid', open ? 'Склад семьи открыт.' : 'Склад семьи закрыт.', 3000);
                try { player.call('family:warehouse:toggle:c', [open ? 1 : 0]); } catch (_e) {}
                mp.players.forEach((tp) => {
                    if (!mp.players.exists(tp) || !tp.getVariable('auth')) return;
                    if (String(tp.family || '').trim() !== fam) return;
                    try { tp.call('family:warehouse:toggle:c', [open ? 1 : 0]); } catch (_e2) {}
                });
            });
        });
    } catch (e) { console.log('[FAMILY TABLET] warehouse:toggle:', e.message || e); }
});

// ─── Логи ─────────────────────────────────────────────────────────────────────

mp.events.add('family:logs:request:s', (player, searchRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam) return;

        global.DB.query('SELECT `rank` FROM families WHERE name = ? LIMIT 1', [fam], (errRank, rowsRank) => {
            if (errRank || !rowsRank || !rowsRank.length) return;
            const rankArr = parseFamilyRankArray(rowsRank[0].rank);
            if (!familyRankHasPerm(rankArr, player, 'canLogs')) {
                return isNotify(player, 2, 'top-mid', 'Недостаточно прав для просмотра логов.', 3000);
            }

            const search = String(searchRaw || '').trim().slice(0, 64);
            let sql = 'SELECT id, actor_static, actor_name, action_type, action_text, created_at FROM family_logs WHERE family_name=?';
            const params = [fam];

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
                    console.log('[FAMILY TABLET] logs:request:', err.message || err);
                    return;
                }
                const payload = JSON.stringify((rows || []).map((r) => ({
                    id: r.id,
                    static: r.actor_static,
                    name: r.actor_name,
                    type: r.action_type,
                    text: r.action_text,
                    time: r.created_at
                })));
                player.call('family:logs:data:c', [payload]);
            });
        });
    } catch (e) { console.log('[FAMILY TABLET] logs:request:', e.message || e); }
});

// ─── Точки на карте ───────────────────────────────────────────────────────────

mp.events.add('family:points:request:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        pushFamilyPointsMapToPlayer(player);
    } catch (e) { console.log('[FAMILY TABLET] points:request:', e.message || e); }
});

// ─── Рейтинг семей (для вкладки планшета) ─────────────────────────────────────

mp.events.add('family:rating:request:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        global.DB.query(
            'SELECT name, territories, rating_points FROM families WHERE territories > 0 ORDER BY territories DESC, rating_points DESC LIMIT 50',
            [],
            (err, rows) => {
                if (err) {
                    console.log('[FAMILY TABLET] rating:request:', err.message || err);
                    return;
                }
                const palette = ['#dc2626', '#8b21c9', '#16a34a', '#ca8a04', '#0891b2', '#ef4444', '#22c55e'];
                const rating = (rows || []).map((row, idx) => ({
                    name: row.name,
                    zones: parseInt(row.territories, 10) || 0,
                    color: palette[idx % palette.length]
                }));
                player.call('family:rating:data:c', [JSON.stringify(rating)]);
            }
        );
    } catch (e) { console.log('[FAMILY TABLET] rating:request:', e.message || e); }
});

// ─── Капт: клик по точке ──────────────────────────────────────────────────────

mp.events.add('family:capt:zone:click:s', (player, pointIdRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam) return isNotify(player, 2, 'top-mid', 'Вы не состоите в семье.', 3000);

        const pointId = parseInt(pointIdRaw, 10);
        if (isNaN(pointId) || pointId < 1 || pointId > DEFAULT_POINTS_COUNT) {
            return isNotify(player, 2, 'top-mid', 'Неверный номер точки.', 2000);
        }

        global.DB.query('SELECT `rank` FROM families WHERE name = ? LIMIT 1', [fam], (err, rows) => {
            if (err || !rows || !rows.length) return;
            const rankArr = parseFamilyRankArray(rows[0].rank);
            if (!familyRankHasPerm(rankArr, player, 'captParticipate')) {
                return isNotify(player, 2, 'top-mid', 'Нет прав для участия в Войне семей.', 3000);
            }

            const point = (global.serverPoints || []).find((p) => p.id === pointId);
            if (!point) return isNotify(player, 2, 'top-mid', 'Точка не найдена.', 2000);

            const battle = global.activeBattles && global.activeBattles[pointId];
            const myFam = normalizeCaptFamilyKey(fam);

            if (point.underAttack) {
                if (!battle) {
                    return isNotify(player, 2, 'top-mid', 'На этой точке уже идёт бой. Забить новую Войну семей нельзя.', 3500);
                }

                const atkFam = normalizeCaptFamilyKey(battle.attackerFamily);
                const defFam = normalizeCaptFamilyKey(battle.defenderFamily);
                if (myFam !== atkFam && myFam !== defFam && defFam !== 'Свободна') {
                    return isNotify(player, 2, 'top-mid', 'Эта точка уже атакована другой семьёй.', 3000);
                }
                const joinCalibers = Array.isArray(battle.calibers) && battle.calibers.length
                    ? battle.calibers.filter((c) => CAPT_CALIBER_KEYS.includes(c))
                    : CAPT_CALIBER_KEYS;
                const payload = {
                    zoneId: pointId,
                    pointId,
                    ownerFamily: point.owner || '',
                    attackerFamily: battle.attackerFamily,
                    defenderFamily: battle.defenderFamily,
                    calibers: joinCalibers,
                    count: parseCaptFormatN(battle.format),
                    allowArmor: !!battle.allowArmor,
                    allowSpunk: battle.allowSpank !== false,
                    allowAlco: battle.allowAlco !== false,
                    isJoin: true,
                    myFamily: fam
                };
                player.call('family:capt:menu:open:c', [JSON.stringify(payload)]);
                return;
            }

            const ownerKey = normalizeCaptFamilyKey(point.owner);
            if (ownerKey && ownerKey === myFam) {
                return isNotify(player, 2, 'top-mid', 'Это ваша точка.', 3000);
            }

            const protectUntil = typeof global.getPointIncomingProtectUntil === 'function'
                ? global.getPointIncomingProtectUntil(point)
                : (Number(point.defCooldownUntil) || 0);
            if (protectUntil > Date.now()) {
                const left = typeof global.formatCaptCdLeft === 'function'
                    ? global.formatCaptCdLeft(protectUntil)
                    : `${Math.ceil((protectUntil - Date.now()) / 60000)} мин.`;
                return isNotify(
                    player,
                    2,
                    'top-mid',
                    `Семья-владелец под защитой после войны. Забить точку можно через ${left}`,
                    4500
                );
            }

            const isCounterDef = typeof global.isCaptCounterDefAttack === 'function'
                ? global.isCaptCounterDefAttack(fam, point)
                : false;
            const limits = captMaxNForPoint(fam, point, isCounterDef);
            if (limits.attackerOnline < 3) {
                return isNotify(
                    player,
                    2,
                    'top-mid',
                    `Нужно минимум 3 онлайн-игроков вашей семьи. Сейчас: ${limits.attackerOnline}`,
                    4500
                );
            }
            if (limits.hasDefender && !isCounterDef && limits.defenderOnline < 3) {
                const offlineHint = limits.defenderOnline <= 0
                    ? ' Семья-владелец не в сети — бить точку в AFK нельзя.'
                    : '';
                return isNotify(
                    player,
                    2,
                    'top-mid',
                    `У семьи-владельца точки нужно минимум 3 онлайн. Сейчас: ${limits.defenderOnline}.${offlineHint}`,
                    5500
                );
            }
            const ownerDisplay = point.owner && String(point.owner).trim() !== ''
                ? String(point.owner).trim()
                : 'Свободна';
            const payload = {
                zoneId: pointId,
                pointId,
                ownerFamily: ownerDisplay,
                attackerFamily: fam,
                defenderFamily: ownerDisplay,
                calibers: CAPT_CALIBER_KEYS,
                atkOnline: limits.attackerOnline,
                defOnline: limits.defenderOnline,
                maxCount: Math.max(3, Math.min(30, limits.maxN || limits.attackerOnline || 3)),
                myFamily: fam,
                isJoin: false
            };
            player.call('family:capt:menu:open:c', [JSON.stringify(payload)]);
        });
    } catch (e) { console.log('[FAMILY TABLET] capt:zone:click:', e.message || e); }
});

// ─── Капт: подтверждение атаки ────────────────────────────────────────────────

mp.events.add('family:capt:attack:confirm:s', (player, pointIdRaw, countRaw, weaponsJson, allowArmorRaw, allowSpunkRaw, allowAlcoRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam) return isNotify(player, 2, 'top-mid', 'Вы не состоите в семье.', 3000);

        const pointId = parseInt(pointIdRaw, 10);
        const countParsed = parseInt(countRaw, 10);
        if (!Number.isFinite(countParsed) || countParsed < 3) {
            return isNotify(player, 2, 'top-mid', 'Минимальный формат Войны семей: 3x3.', 3500);
        }
        const count = Math.min(30, countParsed);
        if (isNaN(pointId) || pointId < 1) {
            return isNotify(player, 2, 'top-mid', 'Неверный номер точки.', 2000);
        }

        let calibers = [];
        try { calibers = JSON.parse(weaponsJson); } catch (_) { calibers = []; }
        if (!Array.isArray(calibers)) calibers = [];
        calibers = calibers.filter((c) => CAPT_CALIBER_KEYS.includes(c)).slice(0, 3);
        if (calibers.length < 1) {
            return isNotify(player, 2, 'top-mid', 'Выберите минимум 1 калибр.', 3000);
        }

        const weaponSlots = captCalibersToWeaponSlots(calibers);
        const format = `${count}x${count}`;
        const opts = JSON.stringify({
            weapon2: weaponSlots[1] || '',
            weapon3: weaponSlots[2] || '',
            calibers,
            allowArmor: allowArmorRaw === 'true' || allowArmorRaw === true || allowArmorRaw === 1 || allowArmorRaw === '1',
            allowSpank: allowSpunkRaw === 'true' || allowSpunkRaw === true || allowSpunkRaw === 1 || allowSpunkRaw === '1',
            allowAlco: allowAlcoRaw === 'true' || allowAlcoRaw === true || allowAlcoRaw === 1 || allowAlcoRaw === '1'
        });

        mp.events.call('family:attack:s', player, format, weaponSlots[0], pointId, 1, opts);
    } catch (e) { console.log('[FAMILY TABLET] capt:attack:confirm:', e.message || e); }
});

// ─── Реклама (лидер, 100k, КД 1 ч) ──────────────────────────────────────────

mp.events.add('family:advert:broadcast:s', (player, variantRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam || !isFamilyLeader(player)) {
            return isNotify(player, 2, 'top-mid', 'Только лидер может отправлять рекламу.', 3000);
        }

        const variant = parseInt(variantRaw, 10);
        if (isNaN(variant) || variant < 1 || variant > 3) {
            return isNotify(player, 2, 'top-mid', 'Неверный вариант рекламы (1-3).', 3000);
        }

        global.familyBuys = global.familyBuys || new Map();
        const now = Date.now();
        const last = global.familyBuys.get(fam) || 0;
        if (now - last < ADVERT_CD_MS) {
            const leftMin = Math.ceil((ADVERT_CD_MS - (now - last)) / 60000);
            return isNotify(player, 2, 'top-mid', `Повтор рекламы через ${leftMin} мин.`, 3000);
        }

        if (ADVERT_PRICE > Number(player.money)) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно средств для покупки.', 3000);
        }

        const lines = buildFamilyAdvertLines(fam)[variant];
        if (!lines) return isNotify(player, 2, 'top-mid', 'Неверный вариант рекламы (1-3).', 3000);

        const newMoney = parseInt(Number(player.money), 10) - ADVERT_PRICE;
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], (err) => {
            if (err) console.log('[FAMILY TABLET] advert:broadcast money:', err.message || err);
        });
        player.money = newMoney;
        player.call('updateMoney', [global.formatnum1(newMoney)]);

        global.familyBuys.set(fam, now);
        logFamilyAction(fam, player, 'advert', `Опубликовал рекламу вариант ${variant} (−${ADVERT_PRICE}$)`);

        mp.players.forEach((tp) => {
            if (!tp || !mp.players.exists(tp) || !tp.getVariable('auth')) return;
            isNotify(tp, 1, 'top-mid', 'Объявление! Посмотрите в чат.', 3000);
            lines.forEach((line) => {
                try { tp.outputChatBox(line); } catch (_e) {}
            });
        });

        isNotify(player, 3, 'top-mid', 'Реклама отправлена в чат!', 3000);
        try { player.call('sound:client', [3]); } catch (_e) {}
    } catch (e) { console.log('[FAMILY TABLET] advert:broadcast:', e.message || e); }
});

// ─── Настройки: название / слоты / роспуск ────────────────────────────────────

function destroyFamilyFleetVehiclesLive(familyId) {
    const fid = Math.floor(Number(familyId) || 0);
    if (!fid) return;
    try {
        mp.vehicles.forEach((v) => {
            if (!v || !mp.vehicles.exists(v)) return;
            try {
                if (Number(v.getVariable('familyId')) !== fid) return;
                v.destroy();
            } catch (_e) {}
        });
    } catch (_e2) {}
}

function clearFamilyMemberOnline(p, familyName, msg) {
    if (!mp.players.exists(p)) return;
    if (String(p.family || '') !== String(familyName || '')) return;
    p.family = null;
    p.familyID = null;
    p.famLeader = null;
    p.famRank = null;
    p.famRankExtra = null;
    p.setVariable('family', null);
    p.setVariable('famRank', null);
    p.setVariable('famRankExtra', '');
    p.setVariable('familyID', 0);
    p.setVariable('familyInteriorDim', 0);
    try { p.call('family:close'); } catch (_e) {}
    try { p.call('family:cef:clear'); } catch (_e2) {}
    if (msg) isNotify(p, 1, 'top-mid', msg, 6000);
    if (typeof global.pushMenuAccountProfile === 'function') {
        try { global.pushMenuAccountProfile(p); } catch (_e3) {}
    }
}

mp.events.add('family:rename:s', (player, newNameRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam || !isFamilyLeader(player)) {
            return isNotify(player, 2, 'top-mid', 'Только лидер может менять название.', 3000);
        }
        const newName = String(newNameRaw || '').trim().normalize('NFC');
        const newNameLen = Array.from(newName).length;
        if (newNameLen < 3 || newNameLen > 17) {
            return isNotify(player, 2, 'top-mid', 'Название: от 3 до 17 символов.', 3000);
        }
        // Как при создании: RU/EN, цифры, пробелы и печатные символы. Без невидимых.
        if (/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(newName)) {
            return isNotify(player, 2, 'top-mid', 'Название содержит недопустимые невидимые символы.', 3000);
        }
        if (newName === fam) {
            return isNotify(player, 2, 'top-mid', 'Это текущее название семьи.', 3000);
        }

        ensureFamilySettingsColumns(() => {
            global.DB.query(
                'SELECT id, name_changes, rating_points FROM families WHERE name = ? LIMIT 1',
                [fam],
                (err, rows) => {
                    if (err || !rows || !rows.length) return isNotify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
                    const fid = parseInt(rows[0].id, 10);
                    const changes = parseInt(rows[0].name_changes, 10) || 0;
                    const rep = parseInt(rows[0].rating_points, 10) || 0;
                    if (changes >= FAMILY_RENAME_MAX) {
                        return isNotify(player, 2, 'top-mid', 'Лимит смен названия исчерпан (3/3).', 4000);
                    }
                    const cost = familyRenameCost(changes);
                    if (cost == null) {
                        return isNotify(player, 2, 'top-mid', 'Лимит смен названия исчерпан (3/3).', 4000);
                    }
                    if (cost > 0 && rep < cost) {
                        return isNotify(player, 2, 'top-mid', `Нужно ${cost} репутации семьи.`, 4000);
                    }

                    global.DB.query('SELECT id FROM families WHERE name = ? LIMIT 1', [newName], (eDup, dup) => {
                        if (eDup) return isNotify(player, 2, 'top-mid', 'Ошибка проверки названия.', 3000);
                        if (dup && dup.length) {
                            return isNotify(player, 2, 'top-mid', 'Семья с таким названием уже есть.', 3000);
                        }

                        const applyRename = () => {
                            global.DB.query(
                                'UPDATE families SET name = ?, name_changes = name_changes + 1 WHERE id = ?',
                                [newName, fid],
                                (eUp) => {
                                    if (eUp) return isNotify(player, 2, 'top-mid', 'Не удалось сменить название.', 3000);
                                    global.DB.query('UPDATE accounts SET family = ? WHERE family = ?', [newName, fam], () => {
                                        global.DB.query(
                                            'UPDATE family_points SET owner_family = ? WHERE owner_family = ?',
                                            [newName, fam],
                                            () => {}
                                        );
                                        global.DB.query(
                                            'UPDATE family_logs SET family_name = ? WHERE family_name = ?',
                                            [newName, fam],
                                            () => {}
                                        );
                                        mp.players.forEach((p) => {
                                            if (!mp.players.exists(p) || !p.getVariable('auth')) return;
                                            const sameFam = typeof global.normalizeCaptFamilyKey === 'function'
                                                ? global.normalizeCaptFamilyKey(p.family || p.getVariable('family')) === global.normalizeCaptFamilyKey(fam)
                                                : String(p.family || '') === fam;
                                            if (!sameFam) return;
                                            p.family = newName;
                                            p.setVariable('family', newName);
                                        });
                                        if (typeof global.forgetFamilyIdentity === 'function') global.forgetFamilyIdentity(fam);
                                        if (typeof global.rememberFamilyIdentity === 'function') global.rememberFamilyIdentity(newName, fid);
                                        try {
                                            if (global.serverPoints) {
                                                global.serverPoints.forEach((pt) => {
                                                    if (pt && String(pt.owner || '') === fam) pt.owner = newName;
                                                });
                                            }
                                        } catch (_eSp) {}
                                        logFamilyAction(newName, player, 'rename', `Сменил название: «${fam}» → «${newName}»`);
                                        isNotify(player, 3, 'top-mid', `Название семьи: ${newName}`, 4000);
                                        mp.events.call('family:tablet:open:s', player);
                                    });
                                }
                            );
                        };

                        if (cost > 0) {
                            global.DB.query(
                                'UPDATE families SET rating_points = rating_points - ? WHERE id = ? AND rating_points >= ?',
                                [cost, fid, cost],
                                (eRep, res) => {
                                    if (eRep || !res || res.affectedRows === 0) {
                                        return isNotify(player, 2, 'top-mid', `Нужно ${cost} репутации семьи.`, 4000);
                                    }
                                    applyRename();
                                }
                            );
                        } else {
                            applyRename();
                        }
                    });
                }
            );
        });
    } catch (e) { console.log('[FAMILY TABLET] rename:', e.message || e); }
});

mp.events.add('family:expand:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam || !isFamilyLeader(player)) {
            return isNotify(player, 2, 'top-mid', 'Только лидер может расширять семью.', 3000);
        }
        ensureFamilySettingsColumns(() => {
            global.DB.query(
                'SELECT id, members_max, balance FROM families WHERE name = ? LIMIT 1',
                [fam],
                (err, rows) => {
                    if (err || !rows || !rows.length) return isNotify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
                    const fid = parseInt(rows[0].id, 10);
                    const curMax = Math.max(FAMILY_MEMBERS_BASE, parseInt(rows[0].members_max, 10) || FAMILY_MEMBERS_BASE);
                    const next = getFamilyExpandNext(curMax);
                    if (!next) {
                        return isNotify(player, 2, 'top-mid', 'Достигнут максимальный лимит (100).', 4000);
                    }
                    const bal = parseInt(rows[0].balance, 10) || 0;
                    if (bal < next.price) {
                        return isNotify(
                            player,
                            2,
                            'top-mid',
                            `Нужно ${next.price.toLocaleString('ru-RU')}$ на балансе семьи.`,
                            4000
                        );
                    }
                    global.DB.query(
                        'UPDATE families SET balance = balance - ?, members_max = ? WHERE id = ? AND balance >= ?',
                        [next.price, next.max, fid, next.price],
                        (e2, res) => {
                            if (e2 || !res || res.affectedRows === 0) {
                                return isNotify(player, 2, 'top-mid', 'Недостаточно средств на балансе семьи.', 4000);
                            }
                            const newBal = bal - next.price;
                            try {
                                if (typeof global.broadcastFamilyBalance === 'function') {
                                    global.broadcastFamilyBalance(fam, newBal);
                                } else {
                                    player.call('family:cef:setbalance', [newBal]);
                                }
                            } catch (_eB) {}
                            logFamilyAction(
                                fam,
                                player,
                                'expand',
                                `Расширил лимит участников до ${next.max} за ${next.price}$`
                            );
                            isNotify(player, 3, 'top-mid', `Лимит участников: ${next.max}`, 4000);
                            mp.events.call('family:tablet:open:s', player);
                        }
                    );
                }
            );
        });
    } catch (e) { console.log('[FAMILY TABLET] expand:', e.message || e); }
});

mp.events.add('family:disband:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = playerFamilyName(player);
        if (!fam || !isFamilyLeader(player)) {
            return isNotify(player, 2, 'top-mid', 'Только лидер может распустить семью.', 3000);
        }
        if (new Date().getTime() - (player.clicked || 0) < 2000) {
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        }
        player.clicked = new Date().getTime();

        global.DB.query('SELECT id FROM families WHERE name = ? LIMIT 1', [fam], (err, rows) => {
            if (err || !rows || !rows.length) return isNotify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
            const fid = parseInt(rows[0].id, 10);
            const mansionPrice =
                typeof global.FAMILY_MANSION_PRICE === 'number' ? global.FAMILY_MANSION_PRICE : 8000000;
            const refund = Math.floor(mansionPrice / 2);

            global.DB.query(
                'SELECT mansion_id FROM family_mansion_ownership WHERE family_id = ? LIMIT 1',
                [fid],
                (eM, mRows) => {
                    const hasMansion = !eM && mRows && mRows.length > 0;
                    const mid = hasMansion ? Number(mRows[0].mansion_id) : 0;

                    const finishDelete = () => {
                        destroyFamilyFleetVehiclesLive(fid);
                        global.DB.query(
                            'UPDATE family_points SET owner_family = NULL WHERE owner_family = ?',
                            [fam],
                            () => {
                                try {
                                    if (global.serverPoints) {
                                        global.serverPoints.forEach((pt) => {
                                            if (pt && String(pt.owner || '') === fam) pt.owner = null;
                                        });
                                    }
                                } catch (_eSp) {}
                                const afterRelease = () => {
                                    const runDelete = () => {
                                        global.DB.query('DELETE FROM family_logs WHERE family_name = ?', [fam], () => {
                                            global.DB.query('DELETE FROM families WHERE id = ?', [fid], () => {
                                                global.DB.query(
                                                    'UPDATE accounts SET family = NULL, famRank = NULL, fam_rank_extra = NULL WHERE family = ?',
                                                    [fam],
                                                    () => {
                                                        mp.players.forEach((p) => {
                                                            clearFamilyMemberOnline(
                                                                p,
                                                                fam,
                                                                `Семья «${fam}» распущена лидером.`
                                                            );
                                                        });
                                                        if (mp.players.exists(player)) {
                                                            isNotify(
                                                                player,
                                                                3,
                                                                'top-mid',
                                                                hasMansion
                                                                    ? `Семья распущена. Возврат за особняк: ${refund.toLocaleString('ru-RU')}$.`
                                                                    : 'Семья распущена.',
                                                                7000
                                                            );
                                                        }
                                                        try {
                                                            global.sendDiscordLog(
                                                                `Роспуск семьи!\n\nЛидер - ${player.login} (#${player.static})\nСемья - ${fam}\nОсобняк - ${hasMansion ? `#${mid}, возврат ${refund}$` : 'нет'}`,
                                                                '1331529638127861864'
                                                            );
                                                        } catch (_eD) {}
                                                    }
                                                );
                                            });
                                        });
                                    };
                                    if (typeof global.releaseFamilyWarPointsOnFamilyDelete === 'function') {
                                        global.releaseFamilyWarPointsOnFamilyDelete(fam, runDelete);
                                    } else {
                                        runDelete();
                                    }
                                };
                                if (typeof global.releaseFamilyMansionOnFamilyDelete === 'function') {
                                    global.releaseFamilyMansionOnFamilyDelete(fid, afterRelease);
                                } else {
                                    afterRelease();
                                }
                            }
                        );
                    };

                    if (hasMansion && refund > 0 && mp.players.exists(player)) {
                        const money = parseInt(player.money, 10) || 0;
                        const newMoney = money + refund;
                        global.DB.query(
                            'UPDATE accounts SET money = ? WHERE static = ?',
                            [newMoney, player.static],
                            (ePay) => {
                                if (!ePay && mp.players.exists(player)) {
                                    player.money = newMoney;
                                    try {
                                        player.call('updateMoney', [global.formatnum1(newMoney)]);
                                    } catch (_eU) {}
                                }
                                if (typeof global.kickPlayersFromSeizedMansion === 'function') {
                                    try {
                                        // kickPlayersFromSeizedMansion may be local - use mansion seize path
                                    } catch (_eK) {}
                                }
                                finishDelete();
                            }
                        );
                    } else {
                        finishDelete();
                    }
                }
            );
        });
    } catch (e) { console.log('[FAMILY TABLET] disband:', e.message || e); }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

ensureFamilyLogsTable(() => {
    ensureFamilyWarehouseOpenColumn(() => {
        ensureFamilySettingsColumns(() => {
            console.log('[FAMILY TABLET] Ready');
        });
    });
});

module.exports = {
    logFamilyAction,
    familyKickMember,
    FAMILY_MEMBERS_BASE,
    getFamilyExpandNext,
    familyRenameCost
};

