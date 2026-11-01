const moment = require('moment-timezone');
const {
    CALIBER_KEYS: CAPT_CALIBER_KEYS,
    CALIBER_TO_WEAPON_ITEMS: CAPT_CALIBER_TO_WEAPON_ITEMS,
    WEAPON_ITEM_TO_CALIBER: CAPT_WEAPON_ITEM_TO_CALIBER
} = require('./config/capt_bizwar_calibers.js');
const {
    validateCombatJoinLoadout,
    countStackBaseOnPlayer,
    makeCombatFastSlotGuard
} = require('./config/combat_loadout.js');
const {
    getCaptArenaMeta,
    getCombatArenaMetaFromLocation,
    getCombatSpawnFromLocation,
    getRandomCombatArena,
    getCaptSpawnPosition: getCaptSpawnPosFromArena
} = require('./config/combat_arenas.js');

const OFFICE_ENTRY_POS = { x: -115.98319244384766, y: -604.94091796875, z: 36.28074645996094 };
/** Выход из интерьера офиса — центр цилиндра (E). */
const OFFICE_INTERIOR_SPAWN = { x: -141.1987, y: -620.913, z: 168.8205, h: 187.5 };
/** Улица Arcadius — цилиндр «Офис семьи (E)». */
const OFFICE_EXTERIOR_SPAWN = { x: OFFICE_ENTRY_POS.x, y: OFFICE_ENTRY_POS.y, z: OFFICE_ENTRY_POS.z, h: -109.7210693359375 };
const ARCADIUS_AFTER_CAPT_POS = new mp.Vector3(-119.90831756591797, -612.6090698242188, 35.280757904052734);
const MAX_FAMILY_WAREHOUSE_ITEMS = 300;
/** Подготовка войны семей: время зайти в метку до старта боя. */
const FAMILY_WAR_PREP_MS = 3 * 60 * 1000;
const FAMILY_WAR_FIGHT_MS = 10 * 60 * 1000;
global.FAMILY_WAR_PREP_MS = FAMILY_WAR_PREP_MS;

function detectCaptExitPoint(player) {
    const fid = Number(player.familyID);
    if (!fid) return 'arcadius';
    const intDim =
        typeof global.getFamilyMansionInteriorDim === 'function'
            ? global.getFamilyMansionInteriorDim(fid)
            : null;
    if (intDim != null && player.dimension === intDim) return 'mansion';
    if (player.dimension === fid + 5) return 'arcadius';
    return player.captExitPoint || 'arcadius';
}

function ensureCaptExitTable() {
    if (global._captExitTableReady) return;
    global._captExitTableReady = true;
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS capt_player_exit (
            player_static INT NOT NULL,
            point_id INT NOT NULL,
            exit_kind VARCHAR(16) NOT NULL DEFAULT 'arcadius',
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (player_static, point_id)
        )`,
        () => {}
    );
}
ensureCaptExitTable();

function saveCaptExitDb(player, pointId, exitKind) {
    const st = Number(player && player.static);
    const pid = Number(pointId);
    const kind = exitKind === 'mansion' ? 'mansion' : 'arcadius';
    if (!st || !pid) return;
    player.captExitPoint = kind;
    global.DB.query(
        'INSERT INTO capt_player_exit (player_static, point_id, exit_kind) VALUES (?,?,?) ON DUPLICATE KEY UPDATE exit_kind=VALUES(exit_kind)',
        [st, pid, kind],
        () => {}
    );
}

function loadCaptExitDb(player, pointId, cb) {
    const st = Number(player && player.static);
    const pid = Number(pointId);
    if (!st || !pid) return cb(player.captExitPoint || 'arcadius');
    global.DB.query(
        'SELECT exit_kind FROM capt_player_exit WHERE player_static=? AND point_id=? LIMIT 1',
        [st, pid],
        (err, rows) => {
            if (err || !rows || !rows[0]) return cb(player.captExitPoint || 'arcadius');
            cb(rows[0].exit_kind === 'mansion' ? 'mansion' : 'arcadius');
        }
    );
}

function revivePlayerAlive(player) {
    if (!mp.players.exists(player)) return;
    if (typeof global.clearConsumableResists === 'function') {
        global.clearConsumableResists(player);
    }
    player.health = 100;
    player.setVariable('dead', false);
    try {
        player.call('reviveCancel');
    } catch (_e) {}
}

function getCaptCylinderPlacement(exitPoint, player) {
    const fid = Number(player.familyID);
    const officeDim = fid > 0 ? fid + 5 : 0;
    if (exitPoint === 'mansion') {
        const tp = global.FAMILY_MANSION_INTERIOR_CAPT_TP;
        const dim =
            typeof global.getFamilyMansionInteriorDim === 'function'
                ? global.getFamilyMansionInteriorDim(fid)
                : officeDim;
        if (tp) {
            return {
                pos: new mp.Vector3(tp.x, tp.y, tp.z),
                heading: tp.h,
                dimension: dim
            };
        }
    }
    const otp = global.FAMILY_OFFICE_INTERIOR_CAPT_TP;
    if (otp) {
        return {
            pos: new mp.Vector3(otp.x, otp.y, otp.z),
            heading: otp.h,
            dimension: officeDim
        };
    }
    return { pos: ARCADIUS_AFTER_CAPT_POS, heading: null, dimension: 0 };
}

function placePlayerAliveAt(player, pos, heading, dimension) {
    if (!mp.players.exists(player)) return;
    revivePlayerAlive(player);
    if (dimension != null && Number.isFinite(Number(dimension))) {
        player.dimension = Number(dimension);
    }
    const v = pos instanceof mp.Vector3 ? pos : new mp.Vector3(pos.x, pos.y, pos.z);
    try {
        player.spawn(v);
    } catch (_e) {
        player.position = v;
    }
    if (heading != null && Number.isFinite(Number(heading))) player.heading = Number(heading);
}

function teleportPlayerAfterCapt(player) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    const pointId = player.captPointId;
    const apply = (exitPoint) => {
        delete player.captExitPoint;
        const pl = getCaptCylinderPlacement(exitPoint, player);
        placePlayerAliveAt(player, pl.pos, pl.heading, pl.dimension);
    };
    if (player.captExitPoint) return apply(player.captExitPoint);
    if (pointId) return loadCaptExitDb(player, pointId, apply);
    apply('arcadius');
}
global.teleportPlayerAfterCapt = teleportPlayerAfterCapt;
global.revivePlayerAlive = revivePlayerAlive;
global.placePlayerAliveAt = placePlayerAliveAt;

function parseFamilyWarehouseDb(value) {
    let arr = [];
    try {
        arr = JSON.parse(value || '[]');
    } catch (e) {
        arr = [];
    }
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.length > 0) : [];
}

global._familyWarehouseBusy = global._familyWarehouseBusy || {};

function beginFamilyWarehouseOp(fam) {
    const key = String(fam || '').trim();
    if (!key) return false;
    if (global._familyWarehouseBusy[key]) return false;
    global._familyWarehouseBusy[key] = true;
    return true;
}

function endFamilyWarehouseOp(fam) {
    const key = String(fam || '').trim();
    if (key && global._familyWarehouseBusy) delete global._familyWarehouseBusy[key];
}

function failFamilyWarehouseOp(fam, player, msg, notifyType, notifyMs) {
    endFamilyWarehouseOp(fam);
    if (player && mp.players.exists(player) && msg) {
        isNotify(player, notifyType || 2, 'top-mid', msg, notifyMs || 3000);
    }
}

function removeExactInventoryToken(player, token) {
    if (!player || !Array.isArray(player.inventory)) return false;
    const idx = player.inventory.findIndex((x) => x === token);
    if (idx === -1) return false;
    player.inventory.splice(idx, 1);
    return true;
}

function rollbackFamilyWarehouseDeposit(player, wh, stackMode, item, depositQty, removedToken) {
    if (stackMode) {
        removeFromWarehouseStack(wh, item, depositQty);
        addConsumableQtyToPlayer(player, item, depositQty);
    } else if (removedToken) {
        const wi = wh.lastIndexOf(removedToken);
        if (wi !== -1) wh.splice(wi, 1);
        if (typeof global.invGridTryPush === 'function') global.invGridTryPush(player, removedToken);
        else player.inventory.push(removedToken);
    }
    global.saveInventory(player);
}

function rollbackFamilyWarehouseWithdraw(player, wh, stackMode, item, withdrawQty, token) {
    if (stackMode) {
        removeConsumableQtyFromPlayer(player, item, withdrawQty);
        addToWarehouseStack(wh, item, withdrawQty);
    } else if (token) {
        removeExactInventoryToken(player, token);
        wh.push(token);
    }
    global.saveInventory(player);
}

function normalizeWarehouseItemName(raw) {
    if (raw == null) return '';
    const s = String(raw).split('(')[0].trim();
    return s;
}

function parseStackedConsumableEntry(entry) {
    const s = String(entry == null ? '' : entry).trim();
    const m = s.match(/^(.+?)\s*\((\d+)\)\s*$/);
    if (m) {
        const n = parseInt(m[2], 10);
        return { base: m[1].trim(), count: Number.isFinite(n) && n > 0 ? n : 0 };
    }
    if (!s) return { base: '', count: 0 };
    return { base: s, count: 1 };
}

function formatStackedConsumableEntry(base, count) {
    if (!base || count < 1) return null;
    if (count === 1) return base;
    return `${base} (${count})`;
}

function isFamilyWarehouseStackConsumable(baseName) {
    return baseName === 'item_spank' || baseName === 'item_alco' || baseName === 'Бронежилет' || baseName === 'Аптечка';
}

function warehouseItemCellMatches(cell, normalizedBase, rawItem) {
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

function findFamilyWarehouseEntryIndex(wh, normalizedItem, rawItem) {
    const base = normalizeWarehouseItemName(normalizedItem);
    if (!base) return -1;
    for (let i = 0; i < wh.length; i++) {
        if (warehouseItemCellMatches(wh[i], base, rawItem)) return i;
    }
    return -1;
}

function takeWholeWarehouseItemFromPlayer(player, normalizedItem, rawItem) {
    if (!mp.players.exists(player) || !normalizedItem) return null;
    const base = normalizeWarehouseItemName(normalizedItem);
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];

    for (let i = 0; i < player.inventory.length; i++) {
        if (!warehouseItemCellMatches(player.inventory[i], base, rawItem)) continue;
        const token = String(player.inventory[i]);
        player.inventory[i] = null;
        return token;
    }
    for (let s = 0; s < player.fastSlots.length; s++) {
        if (!warehouseItemCellMatches(player.fastSlots[s], base, rawItem)) continue;
        const token = String(player.fastSlots[s]);
        player.fastSlots[s] = '';
        return token;
    }
    if (typeof global.syncBagContentsArrayToCapacity === 'function') global.syncBagContentsArrayToCapacity(player);
    const cap = typeof global.getActiveBagCapacity === 'function' ? global.getActiveBagCapacity(player) : 0;
    const bagFull = Array.isArray(player._bagContentsFull) ? player._bagContentsFull : [];
    for (let bi = 0; bi < cap; bi++) {
        if (!warehouseItemCellMatches(bagFull[bi], base, rawItem)) continue;
        const token = String(bagFull[bi]);
        bagFull[bi] = null;
        if (typeof global.syncBagContentsArrayToCapacity === 'function') global.syncBagContentsArrayToCapacity(player);
        return token;
    }
    return null;
}

function takeWholeWarehouseItemFromPlayerSlot(player, normalizedItem, rawItem, slotRaw) {
    const slot = parseInt(slotRaw, 10);
    if (!mp.players.exists(player) || !Number.isInteger(slot) || slot < 0) return null;
    const base = normalizeWarehouseItemName(normalizedItem);
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const cell = player.inventory[slot];
    if (!warehouseItemCellMatches(cell, base, rawItem)) return null;
    const token = String(cell);
    player.inventory[slot] = null;
    return token;
}

function removeSingleWarehouseItemFromPlayer(player, item) {
    return takeWholeWarehouseItemFromPlayer(player, item, item) != null;
}

function removeConsumableQtyFromPlayer(player, baseName, qty) {
    return require('./config/combat_loadout.js').removeStackQtyFromPlayer(player, baseName, qty);
}

function removeConsumableQtyFromPlayerSlot(player, baseName, qty, slotRaw) {
    const slot = parseInt(slotRaw, 10);
    if (!mp.players.exists(player) || !Number.isInteger(slot) || slot < 0 || qty < 1) return false;
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const { base, count } = parseStackedConsumableEntry(player.inventory[slot]);
    if (base !== baseName || count < qty) return false;
    player.inventory[slot] = count === qty ? null : formatStackedConsumableEntry(baseName, count - qty);
    return true;
}

function addConsumableQtyToPlayer(player, baseName, qty) {
    if (!mp.players.exists(player) || qty < 1) return;
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    let left = qty;
    for (let i = 0; i < player.inventory.length && left > 0; i++) {
        const { base, count } = parseStackedConsumableEntry(player.inventory[i]);
        if (base !== baseName) continue;
        player.inventory[i] = formatStackedConsumableEntry(baseName, count + left);
        left = 0;
        break;
    }
    if (left > 0) {
        player.inventory.push(formatStackedConsumableEntry(baseName, left));
    }
}

function removeFromWarehouseStack(wh, baseName, qty) {
    if (!Array.isArray(wh) || qty < 1) return false;
    let need = qty;
    for (let i = 0; i < wh.length && need > 0; i++) {
        const { base, count } = parseStackedConsumableEntry(wh[i]);
        if (base !== baseName) continue;
        if (count <= need) {
            need -= count;
            wh.splice(i, 1);
            i--;
        } else {
            wh[i] = formatStackedConsumableEntry(baseName, count - need);
            need = 0;
        }
    }
    return need === 0;
}

function removeFromWarehouseStackSlot(wh, baseName, qty, slotRaw) {
    const slot = parseInt(slotRaw, 10);
    if (!Array.isArray(wh) || !Number.isInteger(slot) || slot < 0 || slot >= wh.length || qty < 1) return false;
    const { base, count } = parseStackedConsumableEntry(wh[slot]);
    if (base !== baseName || count < qty) return false;
    if (count === qty) wh.splice(slot, 1);
    else wh[slot] = formatStackedConsumableEntry(baseName, count - qty);
    return true;
}

function addToWarehouseStack(wh, baseName, qty) {
    if (!Array.isArray(wh) || qty < 1) return;
    for (let i = 0; i < wh.length; i++) {
        const { base, count } = parseStackedConsumableEntry(wh[i]);
        if (base !== baseName) continue;
        wh[i] = formatStackedConsumableEntry(baseName, count + qty);
        return;
    }
    wh.push(formatStackedConsumableEntry(baseName, qty));
}

function countConsumableOnPlayer(player, baseName) {
    return countStackBaseOnPlayer(player, baseName);
}

function warehouseHasStackForBase(wh, baseName) {
    return wh.some((e) => parseStackedConsumableEntry(e).base === baseName);
}

function countConsumableOnWarehouse(wh, baseName) {
    let n = 0;
    wh.forEach((e) => {
        const { base, count } = parseStackedConsumableEntry(e);
        if (base === baseName) n += count;
    });
    return n;
}

function buildDefaultFamilyRankJsonString() {
    const arr = [];
    for (let i = 0; i < 11; i++) {
        const created = (i === 1 || i === 10) ? 1 : 0;
        arr.push({
            CanInvite: i === 10 ? 1 : 0,
            ChangeRank: i === 10 ? 1 : 0,
            CanKick: i === 10 ? 1 : 0,
            withdrawMoney: i === 10 ? 1 : 0,
            familyWarehouse: i === 10 ? 1 : 0,
            familyWarehouseClosed: i === 10 ? 1 : 0,
            familyWarehouseToggle: i === 10 ? 1 : 0,
            captParticipate: i === 10 ? 1 : 0,
            fleetEvac: i === 10 ? 1 : 0,
            fleetSummon: i === 10 ? 1 : 0,
            canLogs: i === 10 ? 1 : 0,
            created,
            rankName: i === 1 ? 'Новичок' : (i === 10 ? 'Лидер' : '')
        });
    }
    return normalizeFamilyRankJson(arr);
}

function ensureFamilyRowInDb(familyName, callback) {
    const name = String(familyName || '').trim();
    if (!name) return callback(new Error('empty family name'));
    global.DB.query('SELECT id FROM families WHERE name = ? LIMIT 1', [name], (err, rows) => {
        if (err) return callback(err);
        if (rows && rows.length) return callback(null);
        const rankJson = buildDefaultFamilyRankJsonString();
        global.DB.query(
            'INSERT INTO families (name, `rank`, warehouse, balance) VALUES (?, ?, ?, 0)',
            [name, rankJson, '[]'],
            (e2) => {
                if (!e2) return callback(null);
                global.DB.query(
                    'INSERT INTO families (name, `rank`, warehouse) VALUES (?, ?, ?)',
                    [name, rankJson, '[]'],
                    (e3) => {
                        if (!e3) return callback(null);
                        global.DB.query(
                            'INSERT INTO families (name, `rank`) VALUES (?, ?)',
                            [name, rankJson],
                            (e4) => callback(e4 || null)
                        );
                    }
                );
            }
        );
    });
}

function itemNotAllowedInFamilyWarehouse(item) {
    const itemName = normalizeWarehouseItemName(item);
    if (!itemName) return 'Некорректный предмет.';
    const FixWeaponName = global.formweap ? global.formweap(itemName) : itemName;
    if (FixWeaponName === 'Revolver') return 'Базовый револьвер нельзя переложить.';
    if (FixWeaponName === 'Musket') return 'Это оружие нельзя класть на склад.';
    return null;
}

function getCaptBattleLootContext(player) {
    if (!player || !mp.players.exists(player)) return null;
    const dim = Number(player.dimension) || 0;
    if (dim < 2000 || dim > 2050) return null;
    const pointId = dim - 2000;
    const battle = global.activeBattles && global.activeBattles[pointId];
    if (!battle) return null;
    return { pointId, battle };
}

function captBattlePushLootItem(battle, itemToken) {
    if (!battle || !itemToken) return false;
    const raw = String(itemToken).trim();
    if (!raw) return false;
    const base = normalizeWarehouseItemName(raw);
    if (!base.startsWith('weapon_')) return false;
    if (itemNotAllowedInFamilyWarehouse(base)) return false;
    battle.lootItems = Array.isArray(battle.lootItems) ? battle.lootItems : [];
    battle.lootItems.push(raw);
    return true;
}

function appendCaptLootToWarehouseArray(wh, lootItems) {
    const warehouse = Array.isArray(wh) ? wh.slice() : [];
    const items = Array.isArray(lootItems) ? lootItems : [];
    let added = 0;
    let skipped = 0;
    for (let i = 0; i < items.length; i++) {
        const token = String(items[i] || '').trim();
        if (!token) continue;
        const base = normalizeWarehouseItemName(token);
        if (!base.startsWith('weapon_')) {
            skipped++;
            continue;
        }
        if (itemNotAllowedInFamilyWarehouse(base)) {
            skipped++;
            continue;
        }
        if (!warehouseHasStackForBase(warehouse, base) && warehouse.length >= MAX_FAMILY_WAREHOUSE_ITEMS) {
            skipped++;
            continue;
        }
        warehouse.push(token);
        added++;
    }
    return { warehouse, added, skipped };
}

function notifyFamilyCaptLootDeposit(familyName, added, skipped) {
    const famKey = normalizeCaptFamilyKey(familyName);
    if (!famKey || added <= 0) return;
    const skipNote = skipped > 0 ? ` (${skipped} не влезло на склад)` : '';
    mp.players.forEach((p) => {
        if (!mp.players.exists(p) || !p.getVariable('auth')) return;
        if (normalizeCaptFamilyKey(p.family || p.getVariable('family')) !== famKey) return;
        isNotify(
            p,
            3,
            'top-mid',
            `На склад семьи доставлено оружие с войны: ${added} шт.${skipNote}`,
            6000
        );
    });
}

function depositCaptBattleLootToAttackers(battle, attackerFamily, pointId) {
    const fam = normalizeCaptFamilyKey(attackerFamily);
    const lootItems = battle && Array.isArray(battle.lootItems) ? battle.lootItems.slice() : [];
    if (!fam || !lootItems.length) return;
    ensureFamilyRowInDb(fam, (ensureErr) => {
        if (ensureErr) {
            console.log('[CAPT LOOT] ensureFamilyRowInDb:', ensureErr.message || ensureErr);
            return;
        }
        global.DB.query('SELECT warehouse FROM families WHERE name = ? LIMIT 1', [fam], (err, rows) => {
            if (err) {
                console.log('[CAPT LOOT] load warehouse:', err.message || err);
                return;
            }
            if (!rows || !rows.length) return;
            const merged = appendCaptLootToWarehouseArray(parseFamilyWarehouseDb(rows[0].warehouse), lootItems);
            if (merged.added <= 0) return;
            global.DB.query('UPDATE families SET warehouse = ? WHERE name = ?', [JSON.stringify(merged.warehouse), fam], (e2) => {
                if (e2) {
                    console.log('[CAPT LOOT] save warehouse:', e2.message || e2);
                    return;
                }
                if (typeof global.logFamilyAction === 'function') {
                    global.logFamilyAction(
                        fam,
                        null,
                        'capt_loot_warehouse',
                        `После войны на точке #${pointId} на склад доставлено оружие: ${merged.added} шт.`
                    );
                }
                notifyFamilyCaptLootDeposit(fam, merged.added, merged.skipped);
            });
        });
    });
}

/** Война семей: оружие с убитых не падает на землю — копится до конца боя. */
global.tryCaptBattleCollectWeaponDrop = function tryCaptBattleCollectWeaponDrop(player, itemToken) {
    const ctx = getCaptBattleLootContext(player);
    if (!ctx) return false;
    return captBattlePushLootItem(ctx.battle, itemToken) ? 'collected' : false;
};

global.depositCaptBattleLootToAttackers = depositCaptBattleLootToAttackers;

function playerAtFamilyWarehouse(player) {
    if (!player.family) return false;
    const fid = Number(player.familyID);
    if (!fid || !mp.players.exists(player)) return false;
    const intDim =
        typeof global.getFamilyMansionInteriorDim === 'function'
            ? global.getFamilyMansionInteriorDim(fid)
            : null;
    const p = player.position;
    if (intDim != null && player.dimension === intDim) {
        const w = global.FAMILY_MANSION_INTERIOR_WAREHOUSE;
        if (!w || w.x == null) return false;
        const dist = Math.hypot(p.x - w.x, p.y - w.y, p.z - w.z);
        return dist <= 4.5;
    }
    if (player.dimension === fid + 5) {
        const w = global.FAMILY_OFFICE_INTERIOR_WAREHOUSE;
        if (!w || w.x == null) return false;
        const dist = Math.hypot(p.x - w.x, p.y - w.y, p.z - w.z);
        return dist <= 4.5;
    }
    return false;
}

function pushFamilyWarehouseUI(player, warehouseArr) {
    if (!mp.players.exists(player)) return;
    if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
        global.loadInventory(player);
        isNotify(player, 1, 'top-mid', 'Инвентарь подгружается — нажмите E у склада ещё раз.', 2800);
        return;
    }
    player.call('familyWarehouse:open:c', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots), JSON.stringify({ items: warehouseArr, capacity: MAX_FAMILY_WAREHOUSE_ITEMS })]);
}

function refreshFamilyWarehouseUI(player, warehouseArr) {
    if (!mp.players.exists(player)) return;
    if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) return;
    player.call('familyWarehouse:update:c', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots), JSON.stringify({ items: warehouseArr, capacity: MAX_FAMILY_WAREHOUSE_ITEMS })]);
}

function normalizeFamilyRankJson(rankJson) {
    let arr;
    try {
        arr = typeof rankJson === 'string' ? JSON.parse(rankJson) : rankJson;
    } catch (e) {
        return rankJson;
    }
    if (!Array.isArray(arr)) return typeof rankJson === 'string' ? rankJson : JSON.stringify(rankJson);
    for (let i = 0; i < arr.length; i++) {
        if (!arr[i] || typeof arr[i] !== 'object') arr[i] = {};
        if (arr[i].familyWarehouse === undefined) arr[i].familyWarehouse = i === 10 ? 1 : 0;
        if (arr[i].familyWarehouseToggle === undefined) {
            arr[i].familyWarehouseToggle = (i === 10 || Number(arr[i].familyWarehouse) === 1) ? 1 : 0;
        }
        if (arr[i].familyWarehouseClosed === undefined) arr[i].familyWarehouseClosed = i === 10 ? 1 : 0;
        if (arr[i].captParticipate === undefined) arr[i].captParticipate = i === 10 ? 1 : 0;
        if (arr[i].rankName === undefined) arr[i].rankName = '';
        if (arr[i].fleetEvac === undefined) arr[i].fleetEvac = i === 10 ? 1 : 0;
        if (arr[i].fleetSummon === undefined) arr[i].fleetSummon = i === 10 ? 1 : 0;
        if (arr[i].canLogs === undefined) arr[i].canLogs = i === 10 ? 1 : 0;
        if (arr[i].created === undefined) arr[i].created = (i >= 1 && i <= 10) ? 1 : 0;
    }
    return JSON.stringify(arr);
}

if (typeof global !== 'undefined') {
    global.normalizeFamilyRankJson = normalizeFamilyRankJson;
}

global.getPlayerFamilyRankIds = function (player) {
    if (!player) return [];
    const main = Number(player.famRank);
    const out = [];
    if (Number.isFinite(main) && main >= 1 && main <= 10) out.push(main);
    try {
        const raw = player.famRankExtra;
        if (raw != null && String(raw).trim() !== '') {
            const j = JSON.parse(String(raw));
            if (Array.isArray(j)) {
                j.forEach((n) => {
                    const r = parseInt(n, 10);
                    if (r >= 1 && r <= 9 && out.indexOf(r) === -1) out.push(r);
                });
            }
        }
    } catch (_e) {}
    return out;
};

function hasFamilyCaptAccess(rankSystem, player) {
    if (!rankSystem || !player) return false;
    const ids = global.getPlayerFamilyRankIds(player);
    if (ids.indexOf(10) !== -1) return true;
    for (let i = 0; i < ids.length; i++) {
        const row = rankSystem[ids[i]];
        if (row && Number(row.captParticipate) === 1) return true;
    }
    return false;
}

function requireFamilyCaptStartPerm(player, familyName, onAllowed) {
    if (!player || !familyName || typeof onAllowed !== 'function') return;
    if (parseInt(player.famRank, 10) === 10) {
        onAllowed();
        return;
    }
    global.DB.query('SELECT `rank` FROM families WHERE name = ? LIMIT 1', [familyName], (err, results) => {
        if (!mp.players.exists(player)) return;
        if (err || !results || !results.length) {
            return isNotify(player, 2, 'top-mid', 'Ошибка загрузки рангов семьи.', 3000);
        }
        let rankSystem;
        try {
            rankSystem = JSON.parse(results[0].rank);
        } catch (e) {
            return isNotify(player, 2, 'top-mid', 'Ошибка рангов семьи.', 3000);
        }
        if (!hasFamilyCaptAccess(rankSystem, player)) {
            return isNotify(player, 2, 'top-mid', 'У вашего ранга нет прав для начала войны семей.', 4000);
        }
        onAllowed();
    });
}

function hasFamilyWarehouseAccess(rankSystem, player) {
    if (!rankSystem || !player) return false;
    const ids = global.getPlayerFamilyRankIds(player);
    if (ids.indexOf(10) !== -1) return true;
    for (let i = 0; i < ids.length; i++) {
        const row = rankSystem[ids[i]];
        if (row && Number(row.familyWarehouse) === 1) return true;
    }
    return false;
}

function hasFamilyWarehouseClosedAccess(rankSystem, player) {
    if (!rankSystem || !player) return false;
    const ids = global.getPlayerFamilyRankIds(player);
    if (ids.indexOf(10) !== -1) return true;
    for (let i = 0; i < ids.length; i++) {
        const row = rankSystem[ids[i]];
        if (row && Number(row.familyWarehouseClosed) === 1) return true;
    }
    return false;
}

function checkFamilyWarehouseUseAccess(rankSystem, player, familyRow) {
    const open = isFamilyWarehouseOpen(familyRow);
    if (open) {
        if (!hasFamilyWarehouseAccess(rankSystem, player)) {
            return { ok: false, msg: 'У вашего ранга нет доступа к открытому складу.' };
        }
        return { ok: true };
    }
    if (!hasFamilyWarehouseClosedAccess(rankSystem, player)) {
        return { ok: false, msg: 'Склад семьи закрыт.' };
    }
    return { ok: true };
}

function hasFamilyKickAccess(rankSystem, player) {
    if (!rankSystem || !player) return false;
    const ids = global.getPlayerFamilyRankIds(player);
    if (ids.indexOf(10) !== -1) return true;
    for (let i = 0; i < ids.length; i++) {
        const row = rankSystem[ids[i]];
        if (row && Number(row.CanKick) === 1) return true;
    }
    return false;
}

function hasFamilyInviteAccess(rankSystem, player) {
    if (!rankSystem || !player) return false;
    const ids = global.getPlayerFamilyRankIds(player);
    if (ids.indexOf(10) !== -1) return true;
    for (let i = 0; i < ids.length; i++) {
        const row = rankSystem[ids[i]];
        if (row && Number(row.CanInvite) === 1) return true;
    }
    return false;
}

function isFamilyWarehouseOpen(familyRow) {
    if (!familyRow) return true;
    return familyRow.warehouse_open == null || Number(familyRow.warehouse_open) !== 0;
}

const CAPT_VALID_WEAPON_KEYS = ['carbine', 'revolver', 'specialcarbine', 'minismg'];
const CAPT_WEAPON_ITEMS = Object.keys(CAPT_WEAPON_ITEM_TO_CALIBER);
const CAPT_ARMOR_ITEM = 'Бронежилет';
const CAPT_SPANK_ITEM = 'item_spank';
const CAPT_ALCO_ITEM = 'item_alco';
const CAPT_ARMOR_MAX = 5;

function captItemBaseName(item) {
    if (!item || typeof item !== 'string') return '';
    return item.split('(')[0].trim();
}

function captGetAllowedCalibers(player, battle) {
    if (battle && Array.isArray(battle.calibers) && battle.calibers.length) {
        return battle.calibers.filter((c) => CAPT_CALIBER_KEYS.includes(c));
    }
    const raw = player.getVariable('captCalibers');
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.filter((c) => CAPT_CALIBER_KEYS.includes(c)) : [];
    } catch (_e) {
        return [];
    }
}

function captIsCaptWeaponItemBase(base) {
    return base !== '' && CAPT_WEAPON_ITEM_TO_CALIBER[base] !== undefined;
}

function captUsesCaliberLoadout(battle) {
    return !!(battle && Array.isArray(battle.calibers) && battle.calibers.length);
}

function captIsWeaponAllowedByCalibers(itemBase, calibers) {
    if (!captIsCaptWeaponItemBase(itemBase)) return true;
    if (itemBase === 'weapon_revolver') return true;
    const cal = CAPT_WEAPON_ITEM_TO_CALIBER[itemBase];
    return cal !== undefined && calibers.includes(cal);
}

function captValidateJoinLoadout(player, battle) {
    if (!battle) return { ok: true };
    return validateCombatJoinLoadout(player, {
        calibers: captGetAllowedCalibers(player, battle),
        weaponToCaliber: CAPT_WEAPON_ITEM_TO_CALIBER,
        allowArmor: battle.allowArmor === true,
        allowSpunk: battle.allowSpank === true,
        allowAlco: battle.allowAlco === true,
        armorMax: CAPT_ARMOR_MAX,
        weaponsFastSlotsOnly: true
    });
}

const captFastSlotGuard = makeCombatFastSlotGuard({
    inCombatVar: 'inCapt',
    weaponToCaliber: CAPT_WEAPON_ITEM_TO_CALIBER,
    getCalibers: (player) => {
        const battle = typeof global.getActiveCaptBattleForPlayer === 'function'
            ? global.getActiveCaptBattleForPlayer(player)
            : null;
        return captGetAllowedCalibers(player, battle);
    },
    onBlockNotify: (player, msg) => isNotify(player, 2, 'top-mid', msg, 2500)
});

/** Хук инвентаря: true = запретить положить в быстрый слот. */
global.captCheckFastSlot = captFastSlotGuard.checkFastSlot;

/** Разрешено ли капт-оружие в быстром слоте (переключение 1–3). */
global.captIsFastSlotWeaponAllowed = captFastSlotGuard.isFastSlotWeaponAllowed;

/** Базовое имя предмета (оружие/стак) — до скобки. */
function captWeaponItemBase(item) {
    if (!item || typeof item !== 'string') return '';
    return item.split('(')[0].trim();
}

function isCaptWeaponFastItem(item) {
    const b = captWeaponItemBase(item);
    return b !== '' && CAPT_WEAPON_ITEMS.includes(b);
}

/** Убрать из сетки инвентаря все ячейки с этим базовым id оружия (null вместо значения). */
function captRemoveWeaponBaseFromInventoryGrid(inv, baseName) {
    if (!baseName || !Array.isArray(inv)) return;
    for (let i = 0; i < inv.length; i++) {
        const x = inv[i];
        if (x == null || x === '') continue;
        if (typeof x !== 'string') continue;
        if (captWeaponItemBase(x) === baseName) inv[i] = null;
    }
}

function stashOneItemToInventoryGrid(player, item) {
    if (!item || typeof item !== 'string') return;
    if (typeof global.invGridTryPush === 'function' && global.invGridTryPush(player, item)) return;
    player.inventory.push(item);
}

function isCaptWeaponSlotEmpty(k) {
    return k == null || k === '' || k === 'empty';
}

function sanitizeCaptWeaponTriple(w1, w2, w3) {
    const norm = (k) => {
        if (isCaptWeaponSlotEmpty(k)) return '';
        return CAPT_VALID_WEAPON_KEYS.includes(k) ? k : '';
    };
    let o1 = norm(w1);
    let o2 = norm(w2);
    let o3 = norm(w3);
    if (!o1 && !o2 && !o3) {
        return ['carbine', '', ''];
    }
    const used = new Set();
    const uniq = (k) => {
        if (!k) return '';
        if (used.has(k)) return '';
        used.add(k);
        return k;
    };
    o1 = uniq(o1);
    o2 = uniq(o2);
    o3 = uniq(o3);
    if (!o1 && !o2 && !o3) {
        return ['carbine', '', ''];
    }
    return [o1, o2, o3];
}

function captWeaponKeyToDisplayName(k) {
    if (!k) return '—';
    if (k === 'revolver') return 'Revolver';
    if (k === 'specialcarbine') return 'Special Carbine';
    if (k === 'minismg') return 'Mini SMG';
    return 'Carbine Rifle';
}

global.getActiveCaptBattleForPlayer = function (player) {
    if (!mp.players.exists(player) || player.getVariable('inCapt') !== true) return null;
    const dim = player.dimension;
    if (dim < 2000 || dim > 2050) return null;
    const pointId = dim - 2000;
    return global.activeBattles && global.activeBattles[pointId] ? global.activeBattles[pointId] : null;
};

function normalizeCaptWeaponKey(k) {
    if (isCaptWeaponSlotEmpty(k)) return '';
    return CAPT_VALID_WEAPON_KEYS.includes(k) ? k : '';
}

function captKeyToHash(k) {
    if (!k) return 0;
    if (k === 'revolver') return mp.joaat('WEAPON_REVOLVER_MK2');
    if (k === 'specialcarbine') return mp.joaat('WEAPON_SPECIALCARBINE');
    if (k === 'minismg') return mp.joaat('WEAPON_MINISMG');
    return mp.joaat('WEAPON_CARBINERIFLE');
}

function captKeyToItem(k) {
    if (!k) return '';
    if (k === 'revolver') return 'weapon_revolver_mk2';
    if (k === 'specialcarbine') return 'weapon_specialcarbine';
    if (k === 'minismg') return 'weapon_minismg';
    return 'weapon_carbinerifle';
}

/** Личное оружие из 1–3 слотов уходит в инвентарь перед капт/бизвар (калибровый режим). */
function stashPersonalWeaponsForCapt(player) {
    if (!mp.players.exists(player)) return;
    player.fastSlots = Array.isArray(player.fastSlots) ? [...player.fastSlots] : ['', '', ''];
    player.inventory = Array.isArray(player.inventory) ? [...player.inventory] : [];
    for (let i = 0; i < 3; i++) {
        const item = player.fastSlots[i];
        if (!item) continue;
        stashOneItemToInventoryGrid(player, item);
        player.fastSlots[i] = '';
    }
    try {
        if (global.saveInventory) global.saveInventory(player);
        player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    } catch (e) {}
}

global.stashCombatFastSlots = stashPersonalWeaponsForCapt;

function applyCaptWeaponLoadout(player, battle) {
    if (!mp.players.exists(player) || !battle) return;
    let w1 = normalizeCaptWeaponKey(battle.weapon);
    let w2 = normalizeCaptWeaponKey(battle.weapon2);
    let w3 = normalizeCaptWeaponKey(battle.weapon3);
    let keys = sanitizeCaptWeaponTriple(w1, w2, w3);
    w1 = keys[0];
    w2 = keys[1];
    w3 = keys[2];
    const items = keys.map(captKeyToItem);
    const hashes = keys.map(captKeyToHash);

    player.removeAllWeapons();
    const seen = new Set();
    hashes.forEach((h) => {
        if (!h || seen.has(h)) return;
        seen.add(h);
        if (typeof global.metaAcGiveWeapon === 'function') global.metaAcGiveWeapon(player, h, 9999, true, 'family-capt');
        else player.giveWeapon(h, 9999, true);
    });

    player.fastSlots = Array.isArray(player.fastSlots) ? [...player.fastSlots] : ['', '', ''];
    player.inventory = Array.isArray(player.inventory) ? [...player.inventory] : [];
    for (let i = 0; i < 3; i++) {
        const itemName = items[i];
        if (itemName) {
            const cur = player.fastSlots[i];
            if (cur && captWeaponItemBase(cur) !== itemName) {
                stashOneItemToInventoryGrid(player, cur);
            }
            player.fastSlots[i] = itemName;
            captRemoveWeaponBaseFromInventoryGrid(player.inventory, itemName);
        } else if (isCaptWeaponFastItem(player.fastSlots[i])) {
            player.fastSlots[i] = '';
        }
    }

    let firstIdx = 0;
    let firstKey = w1;
    let firstHash = hashes[0];
    for (let i = 0; i < 3; i++) {
        if (keys[i]) {
            firstIdx = i;
            firstKey = keys[i];
            firstHash = hashes[i];
            break;
        }
    }
    player.captWeapon = firstKey;
    player.setVariable('captWeapon', firstKey);
    player.setVariable('captWeaponHash', firstHash);
    player.setVariable('activeWeaponSlot', firstIdx);
    player.call('givegun', [firstHash]);
    try {
        if (global.saveInventory) global.saveInventory(player);
        player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    } catch (e) {}
}

function setCaptConsumableFlags(player, battle) {
    if (!mp.players.exists(player) || !battle) return;
    player.setVariable('captAllowArmor', battle.allowArmor === true);
    player.setVariable('captAllowSpank', battle.allowSpank === true);
    player.setVariable('captAllowAlco', battle.allowAlco === true);
    player.setVariable('captArmorUses', 0);
    player.setVariable(
        'captCalibers',
        JSON.stringify(Array.isArray(battle.calibers) ? battle.calibers.filter((c) => typeof c === 'string') : [])
    );
}

function clearCaptConsumableFlags(player) {
    if (!mp.players.exists(player)) return;
    player.setVariable('captAllowArmor', false);
    player.setVariable('captAllowSpank', false);
    player.setVariable('captAllowAlco', false);
    player.setVariable('captArmorUses', 0);
    player.setVariable('captCalibers', null);
}

function clearCaptFallInvulnTimer(player) {
    if (!player || !player.captFallInvulnTimeout) return;
    try {
        clearTimeout(player.captFallInvulnTimeout);
    } catch (e) {}
    delete player.captFallInvulnTimeout;
}

function stripCaptWeaponsFromPlayer(player) {
    if (!mp.players.exists(player)) return;
    clearCaptFallInvulnTimer(player);
    clearCaptConsumableFlags(player);
    try {
        player.setInvincible(false);
    } catch (e) {}
    try {
        try {
            if (player.getVariable('ammo') == true) player.call('hideAmmo');
        } catch (_a) {}
        if (typeof global.syncWeaponBodyPlayer === 'function') global.syncWeaponBodyPlayer(player, 0);
    } catch (e) {}
    delete player.captWeapon;
    try {
        player.setVariable('captWeaponHash', 0);
        player.setVariable('captWeapon', '');
    } catch (e) {}
}

/** Единый ключ имени семьи для сравнения (пробелы, регистр, ведущая точка). */
function normalizeCaptFamilyKey(name) {
    if (name == null || name === undefined) return '';
    let s = String(name).trim().replace(/\s+/g, ' ');
    if (!s) return '';
    if (s.toLowerCase() === 'свободна') return 'Свободна';
    return s.replace(/^\.+/, '').toLowerCase();
}

const familyIdByNormName = new Map();
const familyNormNameById = new Map();

function rememberFamilyIdentity(name, id) {
    const key = normalizeCaptFamilyKey(name);
    const fid = parseInt(id, 10) || 0;
    if (!key || key === 'Свободна' || !fid) return;
    familyIdByNormName.set(key, fid);
    familyNormNameById.set(fid, key);
}

function forgetFamilyIdentity(name) {
    const key = normalizeCaptFamilyKey(name);
    if (!key) return;
    const fid = familyIdByNormName.get(key);
    familyIdByNormName.delete(key);
    if (fid) familyNormNameById.delete(fid);
}

function loadFamilyIdentityCache() {
    if (!global.DB) return;
    global.DB.query('SELECT id, name FROM families', [], (err, rows) => {
        if (err) {
            console.log('[FAMILY] loadFamilyIdentityCache:', err.message || err);
            return;
        }
        (rows || []).forEach((r) => rememberFamilyIdentity(r.name, r.id));
    });
}

function collectPlayerFamilyNames(player) {
    const out = [];
    const push = (v) => {
        if (v == null || v === false || v === 'null') return;
        const s = String(v).trim();
        if (s) out.push(s);
    };
    try { push(player.family); } catch (_e) {}
    try {
        if (typeof player.getVariable === 'function') push(player.getVariable('family'));
    } catch (_e2) {}
    return out;
}

function getOnlinePlayerFamilyName(player) {
    if (!player) return '';
    const names = collectPlayerFamilyNames(player);
    return names[0] || '';
}

function getOnlinePlayerFamilyId(player) {
    if (!player) return 0;
    try {
        const a = parseInt(player.familyID, 10);
        if (a > 0) return a;
    } catch (_e) {}
    try {
        if (typeof player.getVariable === 'function') {
            const b = parseInt(player.getVariable('familyID'), 10);
            if (b > 0) return b;
        }
    } catch (_e2) {}
    return 0;
}

function safeOnlinePlayers() {
    let list = [];
    try {
        if (typeof mp.players.toArray === 'function') list = mp.players.toArray() || [];
    } catch (_e) {}
    if (!list.length) {
        try {
            mp.players.forEach((p) => {
                list.push(p);
            });
        } catch (_e2) {}
    }
    return list;
}

function playerBelongsToCaptFamily(player, targetKey, targetId) {
    if (!player || (!targetKey && !targetId)) return false;
    try {
        const names = collectPlayerFamilyNames(player);
        for (let i = 0; i < names.length; i++) {
            if (normalizeCaptFamilyKey(names[i]) === targetKey) return true;
        }
        const pid = getOnlinePlayerFamilyId(player);
        if (targetId && pid && pid === targetId) return true;
        if (pid && familyNormNameById.get(pid) === targetKey) return true;
    } catch (_e) {}
    return false;
}

function isCaptOwnerFreeOrEmpty(owner) {
    const s = normalizeCaptFamilyKey(owner);
    return s === '' || s === 'Свободна';
}

/** Семья уже в активном капте (атака или защита на любой точке) — другие её точки не атакуются. */
function isFamilyInActiveCaptBattle(familyName) {
    const key = normalizeCaptFamilyKey(familyName);
    if (!key || key === 'Свободна') return false;
    if (!global.activeBattles) return false;
    for (const b of Object.values(global.activeBattles)) {
        if (!b) continue;
        if (normalizeCaptFamilyKey(b.attackerFamily) === key) return true;
        const def = normalizeCaptFamilyKey(b.defenderFamily);
        if (def && def !== 'Свободна' && def === key) return true;
    }
    return false;
}

function isCaptTargetPointAllowed(point, attackerFamilyName) {
    if (!point || point.underAttack) return false;
    if (getPointIncomingProtectUntil(point) > Date.now()) return false;
    if (normalizeCaptFamilyKey(point.owner) === normalizeCaptFamilyKey(attackerFamilyName)) return false;
    const owner = point.owner;
    if (owner && !isCaptOwnerFreeOrEmpty(owner) && isFamilyInActiveCaptBattle(owner)) return false;
    return true;
}

const CAPT_FORMAT_MIN_N = 3;
const CAPT_FORMAT_MAX_N = 30;
const CAPT_DEF_COOLDOWN_MS = 10 * 60 * 1000;
const CAPT_ATTACK_COOLDOWN_MS = 10 * 60 * 1000;

/** Сколько членов семьи сейчас в сети (auth). Имя + familyID, без обрыва цикла. */
function countFamilyMembersOnline(familyName) {
    const target = normalizeCaptFamilyKey(familyName);
    if (!target || target === 'Свободна') return 0;
    let targetId = familyIdByNormName.get(target) || 0;
    const players = safeOnlinePlayers();
    if (!targetId) {
        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            try {
                if (!p || !mp.players.exists(p)) continue;
                const id = getOnlinePlayerFamilyId(p);
                if (!id) continue;
                const names = collectPlayerFamilyNames(p);
                if (names.some((n) => normalizeCaptFamilyKey(n) === target)) {
                    targetId = id;
                    rememberFamilyIdentity(familyName, id);
                    break;
                }
            } catch (_e) {}
        }
    }
    let n = 0;
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        try {
            if (!p || !mp.players.exists(p)) continue;
            let authed = false;
            try { authed = !!p.getVariable('auth'); } catch (_eAuth) {}
            if (!authed) continue;
            if (playerBelongsToCaptFamily(p, target, targetId)) n++;
        } catch (_e2) {}
    }
    return n;
}

function parseCaptFormatNxN(format) {
    if (typeof format !== 'string') return { ok: false };
    const m = /^(\d+)x(\d+)$/.exec(format.trim());
    if (!m) return { ok: false };
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a !== b || a < CAPT_FORMAT_MIN_N || a > CAPT_FORMAT_MAX_N) return { ok: false };
    return { ok: true, n: a };
}

function countCaptTeamInDimension(pointId, familyKey, excludePlayer) {
    const dim = 2000 + pointId;
    const fk = normalizeCaptFamilyKey(familyKey);
    if (!fk) return 0;
    let n = 0;
    mp.players.forEach((p) => {
        if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
        if (excludePlayer && p === excludePlayer) return;
        if (p.dimension !== dim || p.getVariable('dead')) return;
        if (p.getVariable('inCapt') !== true) return;
        if (normalizeCaptFamilyKey(getOnlinePlayerFamilyName(p)) === fk) n++;
    });
    return n;
}

function countCaptRegisteredTeam(battle, familyKey, excludeStatic) {
    if (!battle || !battle.players) return 0;
    const fk = normalizeCaptFamilyKey(familyKey);
    if (!fk) return 0;
    const side = normalizeCaptFamilyKey(battle.attackerFamily) === fk
        ? 'attack'
        : (normalizeCaptFamilyKey(battle.defenderFamily) === fk ? 'defend' : '');
    if (!side) return 0;
    let n = 0;
    for (const [staticId, playerSide] of Object.entries(battle.players)) {
        if (excludeStatic != null && String(staticId) === String(excludeStatic)) continue;
        if (playerSide === side) n++;
    }
    return n;
}

/** Лимит размера капта: минимум из онлайна атакующих и (для занятой чужой точки) онлайна владельца. */
function isCaptCounterDefAttack(attackerFamily, targetPoint) {
    const atkKey = normalizeCaptFamilyKey(attackerFamily);
    if (!atkKey || !targetPoint) return false;
    const ownerKey = normalizeCaptFamilyKey(targetPoint.owner);
    const prevKey = normalizeCaptFamilyKey(targetPoint.previousOwner);
    return !!ownerKey && ownerKey !== atkKey && prevKey === atkKey;
}

function captMaxNForPoint(attackerFamily, targetPoint, isCounterDef) {
    const atkKey = normalizeCaptFamilyKey(attackerFamily);
    const attackerOnline = countFamilyMembersOnline(atkKey);
    const ownerRaw = targetPoint && targetPoint.owner;
    if (isCaptOwnerFreeOrEmpty(ownerRaw)) {
        return { maxN: attackerOnline, attackerOnline, defenderOnline: 0, hasDefender: false };
    }
    const defKey = normalizeCaptFamilyKey(ownerRaw);
    if (!defKey || defKey === atkKey) {
        return { maxN: attackerOnline, attackerOnline, defenderOnline: 0, hasDefender: false };
    }
    const defenderOnline = countFamilyMembersOnline(defKey);
    // Чужая занятая точка всегда «с защитником»: 0 онлайн ≠ свободный AFK-капт.
    if (isCounterDef === true) {
        return {
            maxN: attackerOnline,
            attackerOnline,
            defenderOnline,
            hasDefender: true,
            isCounterDef: true
        };
    }
    return {
        maxN: defenderOnline > 0 ? Math.min(attackerOnline, defenderOnline) : 0,
        attackerOnline,
        defenderOnline,
        hasDefender: true,
        isCounterDef: false
    };
}

global.normalizeCaptFamilyKey = normalizeCaptFamilyKey;
global.getOnlinePlayerFamilyName = getOnlinePlayerFamilyName;
global.countFamilyMembersOnline = countFamilyMembersOnline;
global.captMaxNForPoint = captMaxNForPoint;
global.isCaptCounterDefAttack = isCaptCounterDefAttack;
global.rememberFamilyIdentity = rememberFamilyIdentity;
global.forgetFamilyIdentity = forgetFamilyIdentity;
global.getPointIncomingProtectUntil = getPointIncomingProtectUntil;
global.formatCaptCdLeft = formatCaptCdLeft;
global.applyFamilyIncomingProtect = applyFamilyIncomingProtect;

function getFamilyCaptCooldownData(familyName) {
    global.familyAttackCooldowns = global.familyAttackCooldowns || {};
    const key = normalizeCaptFamilyKey(familyName);
    const cur = global.familyAttackCooldowns[key];
    if (cur && typeof cur === 'object') {
        cur.attackUntil = Number(cur.attackUntil) || 0;
        cur.defUntil = Number(cur.defUntil) || 0;
        cur.protectUntil = Number(cur.protectUntil) || 0;
        return cur;
    }
    const legacyTs = Number(cur) || 0;
    const data = { attackUntil: legacyTs, defUntil: 0, protectUntil: 0 };
    global.familyAttackCooldowns[key] = data;
    return data;
}

function formatCaptCdLeft(until) {
    const left = Math.max(0, Number(until) - Date.now());
    const sec = Math.ceil(left / 1000);
    if (sec <= 0) return 'сейчас';
    if (sec < 60) return `${sec} сек.`;
    const min = Math.ceil(sec / 60);
    return `${min} мин.`;
}

function getFamilyPointsProtectUntil(familyName) {
    const key = normalizeCaptFamilyKey(familyName);
    if (!key || key === 'Свободна') return 0;
    return Number(getFamilyCaptCooldownData(key).protectUntil) || 0;
}

/** После войны: все точки семьи нельзя атаковать 10 минут. */
function applyFamilyIncomingProtect(familyName, ms) {
    const key = normalizeCaptFamilyKey(familyName);
    if (!key || key === 'Свободна') return 0;
    const addMs = Number(ms) > 0 ? Number(ms) : CAPT_DEF_COOLDOWN_MS;
    const until = Date.now() + addMs;
    const data = getFamilyCaptCooldownData(key);
    if (until > (Number(data.protectUntil) || 0)) data.protectUntil = until;
    const points = Array.isArray(global.serverPoints) ? global.serverPoints : [];
    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (!pt || isCaptOwnerFreeOrEmpty(pt.owner)) continue;
        if (normalizeCaptFamilyKey(pt.owner) !== key) continue;
        if (until > (Number(pt.defCooldownUntil) || 0)) pt.defCooldownUntil = until;
        try { broadcastFamilyPointPatch(pt); } catch (_e) {}
    }
    return until;
}

function getPointIncomingProtectUntil(point) {
    if (!point) return 0;
    const pointUntil = Number(point.defCooldownUntil) || 0;
    const famUntil = getFamilyPointsProtectUntil(point.owner);
    return Math.max(pointUntil, famUntil);
}

const shapeCreateFam = global.creatorShapeSphere(-121.23036193847656, -615.6834106445312, 36.28070068359375, 2);
const FAMILY_CREATE_LABEL_LIFT = 1.15;
global.creatorLabelsNew("Создание семьи (E)", new mp.Vector3(-121.23036193847656, -615.6834106445312, 36.28070068359375 + FAMILY_CREATE_LABEL_LIFT), {
    font: 4,
    drawDistance: 12,
    color: [255, 255, 255, 255],
    outline: true,
    outlineColor: [0, 0, 0, 200],
    dimension: 0
});

const shapeOffice = global.creatorShapeSphere(OFFICE_ENTRY_POS.x, OFFICE_ENTRY_POS.y, OFFICE_ENTRY_POS.z, 2.5, 0);
global.creatorLabelsNew('Офис семьи (E)', new mp.Vector3(OFFICE_ENTRY_POS.x, OFFICE_ENTRY_POS.y, OFFICE_ENTRY_POS.z + 0.6), {
    los: false,
    font: 4,
    drawDistance: 22,
});
global.creatorMarkersNew(1, new mp.Vector3(OFFICE_ENTRY_POS.x, OFFICE_ENTRY_POS.y, OFFICE_ENTRY_POS.z - 1.0), 1.2, {
    color: [200, 160, 255, 200],
    visible: true,
    dimension: 0,
});

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (shape == shapeCreateFam) {
            player.call('enterCreateSHAPE_CLIENT');
        } else if (shape === shapeOffice) {
            player.call('enterOfficeSHAPE_CLIENT');
        }
    } catch (error) {
        console.log(error);
    }
});
mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (shape == shapeCreateFam) {
            player.call('exitCreateSHAPE_CLIENT');
        } else if (shape === shapeOffice) {
            player.call('exitOfficeSHAPE_CLIENT');
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('family:loadplayers:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        global.DB.query('SELECT `rank` FROM families WHERE name = ?', [player.family], (errF, famRes) => {
            if (errF) return console.log(errF);
            if (!famRes || !famRes.length) return;
            let rankArr = [];
            try {
                rankArr = JSON.parse(famRes[0].rank);
            } catch (_e) {
                rankArr = [];
            }
            global.DB.query(
                'SELECT static, login, famRank, fam_rank_extra FROM accounts WHERE family = ?',
                [player.family],
                (err, results) => {
                    if (err) return console.log(err);

                    const playerInfo = [];
                    results.forEach((account) => {
                        const rank = parseInt(account.famRank, 10);
                        const leader = rank === 10 ? 1 : 0;
                        const tag = leader ? 'Leader' : '';
                        let rankLabel = `Ранг ${rank}`;
                        const rRow = Array.isArray(rankArr) ? rankArr[rank] : null;
                        if (rRow && rRow.rankName && String(rRow.rankName).trim()) {
                            rankLabel = String(rRow.rankName).trim();
                        }
                        try {
                            const ex = account.fam_rank_extra ? JSON.parse(String(account.fam_rank_extra)) : [];
                            if (Array.isArray(ex) && ex.length) {
                                const bits = ex
                                    .map((n) => parseInt(n, 10))
                                    .filter((n) => n >= 1 && n <= 9 && n !== rank)
                                    .map((n) => {
                                        const rr = Array.isArray(rankArr) ? rankArr[n] : null;
                                        return rr && rr.rankName && String(rr.rankName).trim()
                                            ? String(rr.rankName).trim()
                                            : `Ранг ${n}`;
                                    });
                                if (bits.length) rankLabel += ` (+${bits.join(', ')})`;
                            }
                        } catch (_e2) {}

                        let rankExtrasJson = '[]';
                        try {
                            const ex = account.fam_rank_extra ? JSON.parse(String(account.fam_rank_extra)) : [];
                            if (Array.isArray(ex) && ex.length) {
                                rankExtrasJson = JSON.stringify(ex.map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= 9));
                            }
                        } catch (_e3) {
                            rankExtrasJson = '[]';
                        }

                        playerInfo.push({
                            staticID: account.static,
                            login: account.login,
                            rank: rank,
                            leader: leader,
                            tag: tag,
                            rankLabel: rankLabel,
                            rankExtrasJson: rankExtrasJson
                        });
                    });

                    playerInfo.sort((a, b) => b.rank - a.rank);

                    player.call('family:loadplayers:c', [playerInfo]);

                    mp.events.call('family:capts:load:s', player);
                }
            );
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('family:changerank:s', (player, static, rank, extrasJsonRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const targetPlayer = mp.players.toArray().find(p => p.static === static);

        rank = Number(rank);

        global.DB.query('SELECT * FROM accounts WHERE static = ?', [static], function(err, results) {
            if (err) return console.log(err);

            if (results.length === 0) return isNotify(player, 2, "top-mid", "Игрок не найден.", 3000);

            const targetData = results[0];
            if (player.family !== targetData.family) return;

            global.DB.query('SELECT `rank` FROM families WHERE name = ?', [player.family], (err, results) => {
                if (err) return console.log(err);

                if (results.length === 0) return isNotify(player, 2, "top-mid", "Ошибка загрузки данных семьи.", 3000);

                let rankSystem;
                try {
                    rankSystem = JSON.parse(normalizeFamilyRankJson(results[0].rank));
                    if (typeof rankSystem === 'string') rankSystem = JSON.parse(rankSystem);
                } catch (_eRankParse) {
                    rankSystem = [];
                }
                if (!Array.isArray(rankSystem)) rankSystem = [];
                while (rankSystem.length < 11) rankSystem.push({});

                const isLeader = isFamilyLeaderPlayer(player);
                const actorRank = parseInt(player.famRank, 10) || 0;
                const targetRank = parseInt(targetData.famRank, 10) || 0;

                if (!isLeader) {
                    const actorRow = rankSystem[actorRank];
                    if (!actorRow || Number(actorRow.ChangeRank) !== 1) {
                        return isNotify(player, 2, "top-mid", "Недостаточно прав.", 3000);
                    }
                }

                const previousRank = targetRank;
                const isSelf = Number(player.static) === Number(static);

                if (isSelf) {
                    return isNotify(player, 2, "top-mid", "Вы не можете изменять ранг самому себе.", 3000);
                }
                if (targetRank >= 10) {
                    return isNotify(player, 2, "top-mid", "Нельзя изменить ранг лидера.", 3000);
                } else if (rank < 1 || rank > 9) {
                    return isNotify(player, 2, "top-mid", "Укажите ранг от 1 до 9.", 3000);
                } else if (!isLeader && actorRank <= targetRank) {
                    return isNotify(player, 2, "top-mid", "Недостаточно прав.", 3000);
                } else if (!isLeader && rank !== targetRank && actorRank < rank) {
                    return isNotify(player, 2, "top-mid", "Недостаточно прав.", 3000);
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
                                        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9 && n !== rank)
                                )
                            ];
                        }
                    } catch (_e) {}
                }
                const extrasJson = JSON.stringify(extrasArr);

                let prevExtras = [];
                try {
                    const px = JSON.parse(String(targetData.fam_rank_extra || '[]'));
                    if (Array.isArray(px)) {
                        prevExtras = [
                            ...new Set(
                                px
                                    .map((n) => parseInt(n, 10))
                                    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9 && n !== rank)
                            )
                        ];
                    }
                } catch (_e2) {}
                const sameExtras =
                    JSON.stringify([...extrasArr].sort((a, b) => a - b)) ===
                    JSON.stringify([...prevExtras].sort((a, b) => a - b));
                if (rank === targetData.famRank && sameExtras) {
                    return isNotify(player, 2, "top-mid", `Нет изменений для ${targetData.login}.`, 3000);
                }
                global.DB.query(
                    'UPDATE accounts SET famRank = ?, fam_rank_extra = ? WHERE static = ?',
                    [rank, extrasJson, static],
                    function(err, result) {
                    if (err) console.log(err);

                    const action = rank > previousRank ? "Повышение" : "Понижение";
                    const logMessage = `${action} в семье!\n\nИзменил ранг - ${player.login} (#${player.static})\nИзменили ранг - ${targetData.login} (#${targetData.static})\nРанг до - ${previousRank}\nРанг после - ${rank}\nСемья - ${player.family}`;
                    global.sendDiscordLog(logMessage, '1331529638127861864');

                    isNotify(
                        player,
                        3,
                        "top-mid",
                        `Вы изменили ранг ${targetData.login} на - ${rank}.`,
                        3000
                    );

                    if (targetPlayer && mp.players.exists(targetPlayer)) {
                        targetPlayer.famRank = rank;
                        targetPlayer.famRankExtra = extrasJson;
                        targetPlayer.setVariable('famRank', rank);
                        targetPlayer.setVariable('famRankExtra', extrasJson);
                        isNotify(targetPlayer, 1, "top-mid", `${player.login} изменил вам ранг на - ${rank}.`, 3000);
                    }

                    mp.players.forEach(tp => {
                        if (tp.getVariable('auth') && tp.family === player.family) {
                            tp.call('family:cef:changerank', [static, rank]);
                        }
                    });
                    mp.events.call('family:loadplayers:s', player);
                    if (targetPlayer && mp.players.exists(targetPlayer)) {
                        mp.events.call('family:loadplayers:s', targetPlayer);
                    }
                });
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('family:kick:s', (player, static) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        static = Number(static);
                
        const targetPlayer = mp.players.toArray().find(p => p.static === static);

        global.DB.query('SELECT `rank` FROM families WHERE name = ?', [player.family], (err, results) => {
            if (err) console.log(err);
            if (results.length === 0) return;

            const rankSystem = JSON.parse(results[0].rank);

            if (!hasFamilyKickAccess(rankSystem, player)) {
                return isNotify(player, 2, "top-mid", "Недостаточно прав.", 3000);
            }

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static], function(err, results) {
                if (err || results.length === 0) {
                    return isNotify(player, 2, "top-mid", "Игрок не найден.", 3000);
                }

                const targetData = results[0];
                const kickerRank = parseInt(player.famRank, 10) || 0;
                const targetRank = parseInt(targetData.famRank, 10) || 0;
                const kickerFamily = String(player.family || '').trim();
                const targetFamily = String(targetData.family || '').trim();

                if (!targetFamily || targetFamily !== kickerFamily) {
                    return isNotify(player, 2, "top-mid", "Игрок не в вашей семье.", 3000);
                }

                if (player.static === static && isFamilyLeaderPlayer(player)) {
                    return isNotify(player, 2, "top-mid", "Лидер не может покинуть семью. Используйте «Распустить семью».", 4500);
                } else if (player.static === targetData.static) {
                    return isNotify(player, 2, "top-mid", "Вы не можете кикнуть самого себя.", 3000);
                } else if (targetRank >= kickerRank) {
                    return isNotify(player, 2, "top-mid", "Недостаточно прав.", 3000);
                }

                const previousRank = results[0].famRank;
                const pllogin = results[0].login;
                const plstatic = results[0].static;
                global.DB.query('UPDATE accounts SET famRank = ?, family = ?, fam_rank_extra = NULL WHERE static = ?', [null, null, static], function(err, result) {
                    if (err) return console.log(err);

                    global.sendDiscordLog(`Увольнение в семье!\n\nУволил - ${player.login} (#${player.static})\nУволили - ${pllogin} (#${plstatic})\nРанг при увольнении - ${Number(previousRank)}\nСемья - ${player.family}`, '1331529638127861864')
                    if (typeof global.logFamilyAction === 'function') {
                        global.logFamilyAction(player.family, player, 'kick', `Исключил ${pllogin} (#${plstatic})`);
                    }
                    isNotify(player, 3, "top-mid", `Вы исключили ${results[0].login} из вашей семьи.`, 3000);

                    if (targetPlayer && mp.players.exists(targetPlayer)) {
                        targetPlayer.family = null;
                        targetPlayer.famRank = null;
                        targetPlayer.famRankExtra = null;
                        targetPlayer.setVariable('family', null);
                        targetPlayer.setVariable('famRank', null);
                        targetPlayer.setVariable('famRankExtra', '');
                        targetPlayer.setVariable('familyInteriorDim', 0);
                        targetPlayer.familyID = null;
                        targetPlayer.setVariable('familyID', 0);
                        targetPlayer.call('family:tablet:close');
                        targetPlayer.call('family:close');
                        targetPlayer.call('family:cef:clear');
                        isNotify(targetPlayer, 1, "top-mid", `${player.login} исключил вас из семьи.`, 3000);
                    }

                    mp.players.forEach(tp => {
                        if (tp.getVariable('auth') && tp.family === player.family) {
                            tp.call('family:cef:kick', [static]);
                        }
                    });
                    if (mp.players.exists(player)) {
                        mp.events.call('family:members:refresh:s', player);
                    }
                });
            });
        });
    } catch (error) {
        console.log(error);
    }
});
function isFamilyLeaderPlayer(player) {
    return parseInt(player && player.famRank, 10) === 10 || player.famLeader === true;
}

function disbandFamilyByLeader(player) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    if (!player.family) return isNotify(player, 2, "top-mid", "Вы не состоите в семье.", 3000);
    if (!isFamilyLeaderPlayer(player)) {
        return isNotify(player, 2, "top-mid", "Только лидер может распустить семью.", 3000);
    }

    const familyName = player.family;
    const leaderLogin = player.login;
    const leaderStatic = player.static;

    global.DB.query('SELECT id FROM families WHERE name = ? LIMIT 1', [familyName], (err, results) => {
        if (err || !results || !results.length) {
            return isNotify(player, 2, "top-mid", "Семья не найдена.", 3000);
        }

        const deletedFamilyId = parseInt(String(results[0].id), 10);

        global.DB.query('SELECT login FROM accounts WHERE family = ?', [familyName], (err2, accounts) => {
            if (err2) return console.log(err2);

            (accounts || []).forEach((acc) => {
                const tp = mp.players.toArray().find((p) => p.login === acc.login);
                if (!tp) return;
                tp.family = null;
                tp.familyID = null;
                tp.famLeader = null;
                tp.famRank = null;
                tp.famRankExtra = null;
                tp.setVariable('family', null);
                tp.setVariable('famRank', null);
                tp.setVariable('famRankExtra', '');
                tp.setVariable('familyID', 0);
                tp.setVariable('familyInteriorDim', 0);
                tp.call('family:tablet:close');
                tp.call('family:close');
                tp.call('family:cef:clear');
                if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(tp);
                if (tp.login !== leaderLogin) {
                    isNotify(tp, 1, "bottom-mid", `Семью ${familyName} распустил лидер ${leaderLogin}.`, 5000);
                }
            });

            const afterMansionRelease = () => {
                global.DB.query('DELETE FROM families WHERE name = ?', [familyName], (err3) => {
                    if (err3) return console.log(err3);
                    global.DB.query(
                        'UPDATE accounts SET family = NULL, famRank = NULL, fam_rank_extra = NULL WHERE family = ?',
                        [familyName],
                        (err4) => {
                            if (err4) return console.log(err4);
                            global.sendDiscordLog(
                                `Распуск семьи!\n\nЛидер - ${leaderLogin} (#${leaderStatic})\nСемья - ${familyName}`,
                                '1331529638127861864'
                            );
                        }
                    );
                });
            };

            if (typeof global.releaseFamilyMansionOnFamilyDelete === 'function') {
                global.releaseFamilyMansionOnFamilyDelete(deletedFamilyId, afterMansionRelease);
            } else {
                afterMansionRelease();
            }

            isNotify(player, 1, "top-mid", "Семья распущена.", 3000);
        });
    });
}

mp.events.add('family:leave:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.family) return isNotify(player, 2, "top-mid", "Вы не состоите в семье.", 3000);
        if (isFamilyLeaderPlayer(player)) {
            return isNotify(player, 2, "top-mid", "Лидер семьи не может покинуть семью. Используйте «Распустить семью».", 4500);
        }
        const famName = player.family;
        const pllogin = player.login;
        const plstatic = player.static;
        global.DB.query('UPDATE accounts SET famRank = ?, family = ?, fam_rank_extra = NULL WHERE static = ?', [null, null, player.static], function(err, result) {
            if (err) return console.log(err);
            player.family = null;
            player.famRank = null;
            player.famRankExtra = null;
            player.setVariable('family', null);
            player.setVariable('famRank', null);
            player.setVariable('famRankExtra', '');
            player.setVariable('familyInteriorDim', 0);
            player.familyID = null;
            player.setVariable('familyID', 0);
            player.call('family:tablet:close');
            player.call('family:close');
            player.call('family:cef:clear');
            if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
            isNotify(player, 1, "top-mid", "Вы покинули семью.", 3000);
            mp.players.forEach(tp => {
                if (tp.getVariable('auth') && tp.family === famName) {
                    tp.outputChatBox(`(${pllogin}) Покинул семью по собственному желанию`);
                    tp.call('family:cef:kick', [plstatic]);
                }
            });
            global.sendDiscordLog(`Выход из семьи!\n\nВышел - ${pllogin} (#${plstatic})\nСемья - ${famName}`, '1331529638127861864');
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('family:delete:s', (player) => {
    try {
        disbandFamilyByLeader(player);
    } catch (error) {
        console.log(error);
    }
});

// Интерьер офиса Arcadius (ex_dt1_02): 01a–01c Old Spice, 02a–02c Executive, 03a–03c Power Broker.
// Сейчас: Old Spice Classical — ex_dt1_02_office_01b
mp.events.add('playerReady', (player) => {
    try {
        mp.world.removeIpl('ex_dt1_02_office_02b');
    } catch (e) {}
    mp.world.requestIpl('ex_dt1_02_office_01b');
});



function finishArcadiusOfficeTeleport(player) {
    if (!mp.players.exists(player)) return;
    try {
        player.call('arcadius:teleport:done');
    } catch (_e) {}
}

mp.events.add('officeHandler_SERVER', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (player.family === null) {
            finishArcadiusOfficeTeleport(player);
            isNotify(player, 2, "top-mid", "Вы не состоите в семье", 3000);
        } else {
            const fid = Number(player.familyID);
            if (!fid) {
                finishArcadiusOfficeTeleport(player);
                isNotify(player, 2, "top-mid", "Ошибка семьи.", 3000);
                return;
            }
            global.DB.query(
                'SELECT mo.mansion_id AS mid FROM family_mansion_ownership mo INNER JOIN families f ON f.id = mo.family_id WHERE f.id = ? LIMIT 1',
                [fid],
                (e, rows) => {
                    if (!mp.players.exists(player)) return;
                    if (e) {
                        finishArcadiusOfficeTeleport(player);
                        isNotify(player, 2, "top-mid", "Ошибка загрузки особняка.", 3000);
                        return;
                    }
                    const mid = rows && rows[0] ? Number(rows[0].mid) : 0;
                    if (mid > 0) player._familyMansionId = mid;
                    else delete player._familyMansionId;

                    player.dimension = fid + 5;
                    player.position = new mp.Vector3(OFFICE_INTERIOR_SPAWN.x, OFFICE_INTERIOR_SPAWN.y, OFFICE_INTERIOR_SPAWN.z);
                    player.heading = OFFICE_INTERIOR_SPAWN.h;
                    player.call('shapeExitCreate_CLIENT');
                    player.setVariable('officeShapeStatus', true);
                    player.setVariable('office_fam', true);
                    finishArcadiusOfficeTeleport(player);
                }
            );
        }
    } catch (error) {
        console.log(error);
        finishArcadiusOfficeTeleport(player);
    }
})
mp.events.add('officeHandlerExit_SERVER', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        player.dimension = 0;
        player.position = new mp.Vector3(OFFICE_EXTERIOR_SPAWN.x, OFFICE_EXTERIOR_SPAWN.y, OFFICE_EXTERIOR_SPAWN.z);
        player.heading = OFFICE_EXTERIOR_SPAWN.h;
        player.setVariable('office_fam', false);
        finishArcadiusOfficeTeleport(player);
    } catch (error) {
        console.log(error);
        finishArcadiusOfficeTeleport(player);
    }
});

mp.events.add('family:warehouse:use:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.family) return isNotify(player, 2, 'top-mid', 'Вы не состоите в семье.', 3000);
        if (!playerAtFamilyWarehouse(player)) return isNotify(player, 2, 'top-mid', 'Подойдите к складу.', 3000);

        const fam = String(player.family || '').trim();
        if (!fam) return;

        ensureFamilyRowInDb(fam, (e0) => {
            if (e0) {
                console.log('ensureFamilyRowInDb warehouse:use', e0);
                return isNotify(player, 2, 'top-mid', 'Ошибка загрузки данных семьи.', 3000);
            }
            if (!mp.players.exists(player) || !playerAtFamilyWarehouse(player)) return;
            global.DB.query('SELECT `rank`, `warehouse`, warehouse_open FROM families WHERE name = ?', [fam], (err, results) => {
                if (err) {
                    console.log('family warehouse use', err);
                    return isNotify(player, 2, 'top-mid', 'Ошибка загрузки данных семьи.', 3000);
                }
                if (!results.length) return isNotify(player, 2, 'top-mid', 'Ошибка загрузки данных семьи.', 3000);
                if (!playerAtFamilyWarehouse(player)) return;
                const rankSystem = JSON.parse(results[0].rank);
                const access = checkFamilyWarehouseUseAccess(rankSystem, player, results[0]);
                if (!access.ok) return isNotify(player, 2, 'top-mid', access.msg, 3500);
                const wh = parseFamilyWarehouseDb(results[0].warehouse);
                pushFamilyWarehouseUI(player, wh);
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('family:warehouse:deposit:s', (player, rawItem, rawQty, rawSlot) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.family) return isNotify(player, 2, 'top-mid', 'Вы не состоите в семье.', 3000);
        if (!playerAtFamilyWarehouse(player)) return isNotify(player, 2, 'top-mid', 'Подойдите к складу.', 3000);

        const fam = String(player.family || '').trim();
        if (!fam) return;
        if (!beginFamilyWarehouseOp(fam)) {
            return isNotify(player, 2, 'top-mid', 'Подождите, склад обрабатывает другую операцию.', 3000);
        }

        const rawItemFull = String(rawItem == null ? '' : rawItem).trim();
        const item = normalizeWarehouseItemName(rawItemFull);
        const deny = itemNotAllowedInFamilyWarehouse(item);
        if (deny) return failFamilyWarehouseOp(fam, player, deny, 2, 3500);
        const slotIndex = parseInt(rawSlot, 10);
        const hasSlotIndex = Number.isInteger(slotIndex) && slotIndex >= 0;
        if (
            !hasSlotIndex &&
            typeof global.inventoryItemIsBlockedForTransfer === 'function' &&
            global.inventoryItemIsBlockedForTransfer(player, rawItemFull || item)
        ) {
            return failFamilyWarehouseOp(
                fam,
                player,
                'Снимите предмет с экипировки или из быстрого слота — на склад его положить нельзя.',
                2,
                4500
            );
        }
        if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
            global.loadInventory(player);
            return failFamilyWarehouseOp(fam, player, 'Подождите загрузки инвентаря и повторите.', 1, 3000);
        }

        const qtyParsed = parseInt(String(rawQty == null ? '1' : rawQty).replace(/[^\d-]/g, ''), 10);
        let qtyWant = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 1;
        const stackMode = isFamilyWarehouseStackConsumable(item);
        if (qtyParsed === -1 && stackMode) {
            qtyWant = hasSlotIndex
                ? Math.max(1, parseStackedConsumableEntry(player.inventory[slotIndex]).count || 1)
                : Math.max(1, countConsumableOnPlayer(player, item) || 1);
        }
        const depositQty = stackMode ? qtyWant : 1;
        let depositedToken = null;

        ensureFamilyRowInDb(fam, (e0) => {
            if (e0) {
                console.log('ensureFamilyRowInDb deposit', e0);
                return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
            }
            if (!mp.players.exists(player) || !playerAtFamilyWarehouse(player)) {
                return failFamilyWarehouseOp(fam, player, 'Подойдите к складу.', 2, 3000);
            }
            global.DB.query('SELECT `rank`, `warehouse`, warehouse_open FROM families WHERE name = ?', [fam], (err, results) => {
                if (err) {
                    console.log('family warehouse deposit', err);
                    return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
                }
                if (!results.length) return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
                if (!playerAtFamilyWarehouse(player)) return failFamilyWarehouseOp(fam, player, 'Подойдите к складу.', 2, 3000);
                const rankSystem = JSON.parse(results[0].rank);
                const access = checkFamilyWarehouseUseAccess(rankSystem, player, results[0]);
                if (!access.ok) return failFamilyWarehouseOp(fam, player, access.msg, 2, 3500);

                let wh = parseFamilyWarehouseDb(results[0].warehouse);

                if (stackMode) {
                    const have = hasSlotIndex ? parseStackedConsumableEntry(player.inventory[slotIndex]).count : countConsumableOnPlayer(player, item);
                    if (have < depositQty) {
                        return failFamilyWarehouseOp(fam, player, 'Недостаточно предметов в инвентаре.', 2, 3000);
                    }
                    if (!warehouseHasStackForBase(wh, item) && wh.length >= MAX_FAMILY_WAREHOUSE_ITEMS) {
                        return failFamilyWarehouseOp(fam, player, 'Семейный склад переполнен.', 2, 3000);
                    }
                    const removed = hasSlotIndex
                        ? removeConsumableQtyFromPlayerSlot(player, item, depositQty, slotIndex)
                        : removeConsumableQtyFromPlayer(player, item, depositQty);
                    if (!removed) {
                        return failFamilyWarehouseOp(fam, player, 'Предмет не найден в инвентаре.', 2, 3000);
                    }
                    addToWarehouseStack(wh, item, depositQty);
                } else {
                    if (wh.length >= MAX_FAMILY_WAREHOUSE_ITEMS) {
                        return failFamilyWarehouseOp(fam, player, 'Семейный склад переполнен.', 2, 3000);
                    }
                    depositedToken = hasSlotIndex
                        ? takeWholeWarehouseItemFromPlayerSlot(player, item, rawItemFull, slotIndex)
                        : takeWholeWarehouseItemFromPlayer(player, item, rawItemFull);
                    if (!depositedToken) {
                        return failFamilyWarehouseOp(fam, player, 'Предмет не найден в инвентаре.', 2, 3000);
                    }
                    wh.push(depositedToken);
                }

                global.saveInventory(player);
                global.DB.query('UPDATE families SET warehouse = ? WHERE name = ?', [JSON.stringify(wh), fam], (e2) => {
                    endFamilyWarehouseOp(fam);
                    if (e2) {
                        console.log(e2);
                        rollbackFamilyWarehouseDeposit(player, wh, stackMode, item, depositQty, depositedToken);
                        return isNotify(player, 2, 'top-mid', 'Ошибка сохранения склада.', 3000);
                    }
                    if (typeof global.logFamilyAction === 'function') {
                        const qtyLabel = stackMode && depositQty > 1 ? ` x${depositQty}` : '';
                        global.logFamilyAction(fam, player, 'warehouse_deposit', `Положил на склад: ${item}${qtyLabel}`);
                    }
                    refreshFamilyWarehouseUI(player, wh);
                });
            });
        });
    } catch (error) {
        endFamilyWarehouseOp(fam);
        console.log(error);
    }
});

mp.events.add('family:warehouse:withdraw:s', (player, rawItem, rawQty, rawSlot) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.family) return isNotify(player, 2, 'top-mid', 'Вы не состоите в семье.', 3000);
        if (!playerAtFamilyWarehouse(player)) return isNotify(player, 2, 'top-mid', 'Подойдите к складу.', 3000);

        const fam = String(player.family || '').trim();
        if (!fam) return;
        if (!beginFamilyWarehouseOp(fam)) {
            return isNotify(player, 2, 'top-mid', 'Подождите, склад обрабатывает другую операцию.', 3000);
        }

        const rawItemFull = String(rawItem == null ? '' : rawItem).trim();
        const item = normalizeWarehouseItemName(rawItemFull);
        if (!item) return failFamilyWarehouseOp(fam, player, null);
        if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
            global.loadInventory(player);
            return failFamilyWarehouseOp(fam, player, 'Подождите загрузки инвентаря и повторите.', 1, 3000);
        }

        const slotIndex = parseInt(rawSlot, 10);
        const hasSlotIndex = Number.isInteger(slotIndex) && slotIndex >= 0;
        const qtyParsed = parseInt(String(rawQty == null ? '1' : rawQty).replace(/[^\d-]/g, ''), 10);
        let qtyWant = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 1;
        const stackMode = isFamilyWarehouseStackConsumable(item);
        let withdrawnToken = null;

        ensureFamilyRowInDb(fam, (e0) => {
            if (e0) {
                console.log('ensureFamilyRowInDb withdraw', e0);
                return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
            }
            if (!mp.players.exists(player) || !playerAtFamilyWarehouse(player)) {
                return failFamilyWarehouseOp(fam, player, 'Подойдите к складу.', 2, 3000);
            }
            global.DB.query('SELECT `rank`, `warehouse`, warehouse_open FROM families WHERE name = ?', [fam], (err, results) => {
                if (err) {
                    console.log('family warehouse withdraw', err);
                    return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
                }
                if (!results.length) return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
                if (!playerAtFamilyWarehouse(player)) return failFamilyWarehouseOp(fam, player, 'Подойдите к складу.', 2, 3000);
                const rankSystem = JSON.parse(results[0].rank);
                const access = checkFamilyWarehouseUseAccess(rankSystem, player, results[0]);
                if (!access.ok) return failFamilyWarehouseOp(fam, player, access.msg, 2, 3500);

                let wh = parseFamilyWarehouseDb(results[0].warehouse);

                if (qtyParsed === -1 && stackMode) {
                    qtyWant = hasSlotIndex
                        ? Math.max(1, parseStackedConsumableEntry(wh[slotIndex]).count || 1)
                        : Math.max(1, countConsumableOnWarehouse(wh, item) || 1);
                }
                const withdrawQty = stackMode ? qtyWant : 1;

                if (stackMode) {
                    const onWh = hasSlotIndex ? parseStackedConsumableEntry(wh[slotIndex]).count : countConsumableOnWarehouse(wh, item);
                    if (onWh < withdrawQty) {
                        return failFamilyWarehouseOp(fam, player, 'На складе недостаточно предметов.', 2, 3000);
                    }
                    const removed = hasSlotIndex
                        ? removeFromWarehouseStackSlot(wh, item, withdrawQty, slotIndex)
                        : removeFromWarehouseStack(wh, item, withdrawQty);
                    if (!removed) {
                        return failFamilyWarehouseOp(fam, player, 'Предмета нет на складе.', 2, 3000);
                    }
                    addConsumableQtyToPlayer(player, item, withdrawQty);
                } else {
                    const wi = hasSlotIndex && warehouseItemCellMatches(wh[slotIndex], item, rawItemFull)
                        ? slotIndex
                        : findFamilyWarehouseEntryIndex(wh, item, rawItemFull);
                    if (wi === -1) return failFamilyWarehouseOp(fam, player, 'Предмета нет на складе.', 2, 3000);
                    withdrawnToken = wh[wi];
                    wh.splice(wi, 1);
                    let pushed = false;
                    if (typeof global.invGridTryPush === 'function') {
                        pushed = global.invGridTryPush(player, withdrawnToken);
                    } else {
                        player.inventory.push(withdrawnToken);
                        pushed = true;
                    }
                    if (!pushed) {
                        wh.splice(wi, 0, withdrawnToken);
                        withdrawnToken = null;
                        return failFamilyWarehouseOp(fam, player, 'Нет места в инвентаре.', 2, 3000);
                    }
                }

                global.saveInventory(player);
                global.DB.query('UPDATE families SET warehouse = ? WHERE name = ?', [JSON.stringify(wh), fam], (e2) => {
                    endFamilyWarehouseOp(fam);
                    if (e2) {
                        console.log(e2);
                        rollbackFamilyWarehouseWithdraw(player, wh, stackMode, item, withdrawQty, withdrawnToken);
                        return isNotify(player, 2, 'top-mid', 'Ошибка сохранения склада.', 3000);
                    }
                    if (typeof global.logFamilyAction === 'function') {
                        const qtyLabel = stackMode && withdrawQty > 1 ? ` x${withdrawQty}` : '';
                        global.logFamilyAction(fam, player, 'warehouse_withdraw', `Взял со склада: ${item}${qtyLabel}`);
                    }
                    refreshFamilyWarehouseUI(player, wh);
                });
            });
        });
    } catch (error) {
        endFamilyWarehouseOp(fam);
        console.log(error);
    }
});

mp.events.add('family:warehouse:swap:s', (player, rawFrom, rawTo) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.family) return isNotify(player, 2, 'top-mid', 'Вы не состоите в семье.', 3000);
        if (!playerAtFamilyWarehouse(player)) return isNotify(player, 2, 'top-mid', 'Подойдите к складу.', 3000);

        const fam = String(player.family || '').trim();
        if (!fam) return;
        const fromIdx = parseInt(rawFrom, 10);
        const toIdx = parseInt(rawTo, 10);
        if (!Number.isInteger(fromIdx) || !Number.isInteger(toIdx) || fromIdx < 0 || toIdx < 0 || fromIdx === toIdx)
            return;
        if (fromIdx >= MAX_FAMILY_WAREHOUSE_ITEMS || toIdx >= MAX_FAMILY_WAREHOUSE_ITEMS) return;
        if (!beginFamilyWarehouseOp(fam)) {
            return isNotify(player, 2, 'top-mid', 'Подождите, склад обрабатывает другую операцию.', 3000);
        }

        ensureFamilyRowInDb(fam, (e0) => {
            if (e0) {
                console.log('ensureFamilyRowInDb swap', e0);
                return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
            }
            if (!mp.players.exists(player) || !playerAtFamilyWarehouse(player)) {
                return failFamilyWarehouseOp(fam, player, 'Подойдите к складу.', 2, 3000);
            }
            global.DB.query('SELECT `rank`, `warehouse`, warehouse_open FROM families WHERE name = ?', [fam], (err, results) => {
                if (err) {
                    console.log('family warehouse swap', err);
                    return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
                }
                if (!results.length) return failFamilyWarehouseOp(fam, player, 'Ошибка загрузки данных семьи.', 2, 3000);
                if (!playerAtFamilyWarehouse(player)) return failFamilyWarehouseOp(fam, player, 'Подойдите к складу.', 2, 3000);
                const rankSystem = JSON.parse(results[0].rank);
                const access = checkFamilyWarehouseUseAccess(rankSystem, player, results[0]);
                if (!access.ok) return failFamilyWarehouseOp(fam, player, access.msg, 2, 3500);

                let wh = parseFamilyWarehouseDb(results[0].warehouse);
                while (wh.length <= Math.max(fromIdx, toIdx)) wh.push(null);
                const a = wh[fromIdx] || null;
                const b = wh[toIdx] || null;
                wh[fromIdx] = b;
                wh[toIdx] = a;
                for (let i = wh.length - 1; i >= 0; i--) {
                    if (wh[i] == null || wh[i] === '') wh.pop();
                    else break;
                }

                global.DB.query('UPDATE families SET warehouse = ? WHERE name = ?', [JSON.stringify(wh), fam], (e2) => {
                    endFamilyWarehouseOp(fam);
                    if (e2) {
                        console.log(e2);
                        return isNotify(player, 2, 'top-mid', 'Ошибка сохранения склада.', 3000);
                    }
                    refreshFamilyWarehouseUI(player, wh);
                });
            });
        });
    } catch (error) {
        try {
            const fam = player && player.family ? String(player.family).trim() : '';
            if (fam) endFamilyWarehouseOp(fam);
        } catch (_e) {}
        console.log(error);
    }
});

const FAMILY_INVITE_MS = 26000;

mp.events.add('family:invite:s', (player, static_id) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.family === null) return;
        const sid = parseInt(String(static_id == null ? '' : static_id).replace(/[^\d]/g, ''), 10);
        if (!Number.isFinite(sid) || sid < 1) return isNotify(player, 2, "top-mid", "Введите статик.", 3000);

        const targetPlayer = mp.players.toArray().find(p => p.static == sid);

        global.DB.query('SELECT `rank` FROM families WHERE name = ?', [player.family], (err, results) => {
            if (err) console.log(err);
            if (results.length === 0) return;

            const rankSystem = JSON.parse(results[0].rank);

            if (!hasFamilyInviteAccess(rankSystem, player)) return isNotify(player, 2, "top-mid", "Недостаточно прав.", 3000);
            if (!targetPlayer) return isNotify(player, 2, "top-mid", "Игрок с таким статиком не найден на сервере.", 3000);
            if (player === targetPlayer) return isNotify(player, 2, "top-mid", "Вы не можете пригласить самого себя.", 3000);
            if (targetPlayer.family == player.family) return isNotify(player, 2, "top-mid", "Этот игрок уже состоит в вашей семье.", 3000);
            if (targetPlayer.family !== null) return isNotify(player, 2, "top-mid", "Этот игрок уже состоит в семье.", 3000);
            if (targetPlayer.getVariable('jail') === true) return isNotify(player, 2, "top-mid", "Игрок в деморгане.", 3000);
            if (player.getVariable('invsend') === true) return isNotify(player, 2, "top-mid", "Вы уже отправили приглашение, попробуйте позже.", 3000);
            if (targetPlayer.getVariable('inv') === true) return isNotify(player, 2, "top-mid", "Игрок уже получил приглашение, попробуйте позже.", 3000);

            global.DB.query(
                'SELECT f.members_max AS members_max, (SELECT COUNT(*) FROM accounts a WHERE a.family = f.name) AS cnt FROM families f WHERE f.name = ? LIMIT 1',
                [player.family],
                (eLim, limRows) => {
                    if (!mp.players.exists(player) || !mp.players.exists(targetPlayer)) return;
                    const baseMax = 20;
                    let maxM = baseMax;
                    let cnt = 0;
                    if (!eLim && limRows && limRows[0]) {
                        maxM = Math.max(baseMax, parseInt(limRows[0].members_max, 10) || baseMax);
                        cnt = parseInt(limRows[0].cnt, 10) || 0;
                    }
                    if (cnt >= maxM) {
                        return isNotify(player, 2, "top-mid", `Достигнут лимит участников (${cnt}/${maxM}).`, 4000);
                    }

            if (!mp.players.exists(player)) return;
            if (!mp.players.exists(targetPlayer)) return;
            
            const playerPos = player.position;
            const targetPos = targetPlayer.position;

            const distance = Math.sqrt(
                Math.pow(playerPos.x - targetPos.x, 2) +
                Math.pow(playerPos.y - targetPos.y, 2) +
                Math.pow(playerPos.z - targetPos.z, 2)
            );

            if (distance > 5) {
                return isNotify(player, 2, "top-mid", "Игрок далеко от вас.", 3000);
            }

            isNotify(player, 3, "top-mid", `Вы отправили приглашение игроку ${targetPlayer.login}.`, 3000);
            if (typeof global.logFamilyAction === 'function') {
                global.logFamilyAction(player.family, player, 'invite_send', `Пригласил [#${targetPlayer.static}] ${targetPlayer.login}`);
            }
            const inviteFrom = typeof global.citizenDisplayLogin === 'function'
                ? global.citizenDisplayLogin(targetPlayer, player)
                : player.login;
            const inviteFromLabel = `${inviteFrom || 'Гражданин'} #${player.static}`;
            const inviteMsg = `${inviteFromLabel} приглашает вас в семью «${player.family}». Y — принять, N — отклонить`;
            isNotify(targetPlayer, 2, 'top-mid', inviteMsg, FAMILY_INVITE_MS);
            targetPlayer.call('interactionOfferStart', ['ПРИГЛАШЕНИЕ В СЕМЬЮ', `${inviteFromLabel} приглашает вас в семью «${player.family}».`]);
            targetPlayer.setVariable('inv', player.family);
            targetPlayer.setVariable('invid', player.id);
            player.setVariable('invsend', true);

            setTimeout(() => {
                if (mp.players.exists(targetPlayer) && mp.players.exists(player)) {
                    if (player.getVariable('invsend') === true && targetPlayer.getVariable('inv') !== null) {
                        isNotify(player, 1, "top-mid", `Время на принятие инвайта истекло.`, 3000);
                        targetPlayer.call('interactionOfferClear');
                        player.setVariable('invsend', null);
                        targetPlayer.setVariable('inv', null);
                        targetPlayer.setVariable('invid', null);
                    }
                }
            }, FAMILY_INVITE_MS);
                }
            );
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('otvetfam:server', (player, otvet) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.getVariable('inv')) return;
        player.call('interactionOfferClear');
        const target = mp.players.at(player.getVariable('invid'));
        if (target) {
            if (otvet == "yes") {
                player.call('interactionOfferClear');
                if (!target || !mp.players.exists(target) || !target.family) {
                    target && target.setVariable('invsend', null);
                    player.setVariable('inv', null);
                    player.setVariable('invid', null);
                    return isNotify(player, 2, "top-mid", "Приглашение больше недействительно.", 3000);
                }
                const joinFam = String(target.family);
                global.DB.query(
                    'SELECT f.members_max AS members_max, (SELECT COUNT(*) FROM accounts a WHERE a.family = f.name) AS cnt FROM families f WHERE f.name = ? LIMIT 1',
                    [joinFam],
                    (eLim, limRows) => {
                        if (!mp.players.exists(player) || !mp.players.exists(target)) return;
                        const baseMax = 20;
                        let maxM = baseMax;
                        let cnt = 0;
                        if (!eLim && limRows && limRows[0]) {
                            maxM = Math.max(baseMax, parseInt(limRows[0].members_max, 10) || baseMax);
                            cnt = parseInt(limRows[0].cnt, 10) || 0;
                        }
                        if (cnt >= maxM) {
                            target.setVariable('invsend', null);
                            player.setVariable('inv', null);
                            player.setVariable('invid', null);
                            isNotify(target, 2, "top-mid", `Лимит участников семьи (${cnt}/${maxM}).`, 4000);
                            return isNotify(player, 2, "top-mid", "В семье нет свободных мест.", 4000);
                        }
                target.setVariable('invsend', null);
                player.setVariable('inv', null);
                player.setVariable('invid', null);
                isNotify(target, 3, "top-mid", `Игрок принял ваше приглашение в семью.`, 3000);
                isNotify(player, 3, "top-mid", `Вы приняли приглашение в семью.`, 3000);
                if (typeof global.logFamilyAction === 'function') {
                    global.logFamilyAction(target.family, target, 'invite_accept', `Принял приглашение [#${player.static}] ${player.login}`);
                }
                const finishJoin = (useRank) => {
                    const joinRank = (Number.isFinite(useRank) && useRank >= 1 && useRank <= 9) ? useRank : 1;
                    global.DB.query('UPDATE accounts SET family = ?, famRank = ?, fam_rank_extra = NULL WHERE static = ?', [target.family, joinRank, player.static], function(err, results) {
                    if (err) return console.log(err);

                    player.family = target.family;
                    player.familyID = target.familyID;
                    player.famRank = joinRank;
                    player.famRankExtra = null;
                    player.setVariable('family', target.family);
                    player.setVariable('famRank', joinRank);
                    player.setVariable('famRankExtra', '');
                    player.setVariable('familyID', Number(target.familyID));
                    if (typeof global.getFamilyMansionInteriorDim === 'function') {
                        player.setVariable('familyInteriorDim', global.getFamilyMansionInteriorDim(Number(target.familyID)));
                    }

                    player.call('family:cef:setrank', [player.famRank]);

                    DB.query('SELECT id, regdate FROM families WHERE name = ?', [player.family], function (err, results) {
                        if (err) return console.log(err);

                        const regDate = new Date(results[0].regdate);
                        const formattedDate = `${regDate.getDate().toString().padStart(2, '0')}.${(regDate.getMonth() + 1).toString().padStart(2, '0')}.${regDate.getFullYear()} ${regDate.getHours().toString().padStart(2, '0')}:${regDate.getMinutes().toString().padStart(2, '0')}:${regDate.getSeconds().toString().padStart(2, '0')}`;
                        player.call('family:cef:loadinfo', [player.family, formattedDate]);
                        if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
                        mp.events.call('family:loadplayers:s', player);
                    });

                    global.sendDiscordLog(`Принятие в семью!\n\nПринял - ${target.login} (#${target.static})\nПриняли - ${player.login} (#${player.static})\nСемья - ${target.family}`, '1331529638127861864')

                    mp.players.forEach(tp => {
                        if (tp.getVariable('auth') && tp.family === target.family && tp !== player) {
                            tp.call('family:addplayer:c', [player.static, player.login, joinRank, 0, '', `Ранг ${joinRank}`, '[]']);
                        }
                    });
                });
                };
                global.DB.query('SELECT `rank` FROM families WHERE name = ? LIMIT 1', [joinFam], (eRk, rkRows) => {
                    let joinRank = 1;
                    if (!eRk && rkRows && rkRows[0]) {
                        try {
                            const arr = typeof rkRows[0].rank === 'string' ? JSON.parse(rkRows[0].rank) : rkRows[0].rank;
                            if (Array.isArray(arr)) {
                                for (let ri = 1; ri <= 9; ri++) {
                                    const row = arr[ri] || {};
                                    const created = (row.created === undefined || row.created === null)
                                        ? true
                                        : Number(row.created) === 1;
                                    if (created) { joinRank = ri; break; }
                                }
                            }
                        } catch (_e) {}
                    }
                    finishJoin(joinRank);
                });
                    }
                );
            } else {
                player.call('interactionOfferClear');
                target.setVariable('invsend', null);
                player.setVariable('inv', null);
                player.setVariable('invid', null);
                isNotify(target, 2, "top-mid", `Игрок отклонил ваше приглашение в семью.`, 3000);
                isNotify(player, 2, "top-mid", `Вы отклонили приглашение в семью.`, 3000);
                if (typeof global.logFamilyAction === 'function' && target.family) {
                    global.logFamilyAction(target.family, player, 'invite_decline', `Отклонил приглашение в семью «${target.family}»`);
                }
            }
        } else {
            player.call('hideaccept')
            player.setVariable('inv', null);
            player.setVariable('invid', null);
            isNotify(target, 2, "top-mid", `Игрок который вас пригласил вышел.`, 3000);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('fam', (player, fullText, ...message) => {
    try {
        if (!player.getVariable('auth')) return;
        if (player.getVariable('anticheat') === true) return;
        if (!player.family) return isNotify(player, 2, "top-mid", "Вы не состоите в семье.", 3000);
        if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, "top-mid", "Включен глобальный мут чата.", 3000);
        const msg = (message || []).join(' ').trim();
        if (!msg) return player.outputChatBox('/fam [сообщение]');

        global.getRemainingMuteTime(player.static)
            .then((remainingMuteTime) => {
                if (remainingMuteTime > 0) {
                    isNotify(player, 2, "top-mid", `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
                    return;
                }
                const chatMsg = `!{#00d47b}[Fam] !{#fff}[${player.family}] [#${player.static}] ${player.login} (${player.id}): ${msg}`;
                mp.players.forEach(p => {
                    if (p.getVariable('auth') && p.family === player.family) {
                        p.outputChatBox(chatMsg);
                    }
                });
            })
            .catch(() => {});
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('glfam', (player, fullText, ...message) => {
    try {
        if (!player.getVariable('auth')) return;
        if (player.getVariable('anticheat') === true) return;
        if (!player.family) return isNotify(player, 2, "top-mid", "Вы не состоите в семье.", 3000);
        if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, "top-mid", "Включен глобальный мут чата.", 3000);
        const msg = (message || []).join(' ').trim();
        if (!msg) return player.outputChatBox('/glfam [сообщение]');

        global.getRemainingMuteTime(player.static)
            .then((remainingMuteTime) => {
                if (remainingMuteTime > 0) {
                    isNotify(player, 2, "top-mid", `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
                    return;
                }
                global.sendDiscordLog(`[GL-Fam] [${player.family}] [#${player.static}] ${player.login} (${player.id}): ${msg}`, '1259089622424617071');
                const chatMsg = `!{#f5c30f}[GL-Fam] !{#00d47b}[${player.family}] !{#fff}[#${player.static}] ${player.login} (${player.id}): ${msg}`;
                mp.players.forEach(p => {
                    if (p.getVariable('auth') && p.family) {
                        p.outputChatBox(chatMsg);
                    }
                });
            })
            .catch(() => {});
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('gfam', (player, fullText, ...message) => {
    try {
        if (!player.getVariable('auth')) return;
		if (player.getVariable('anticheat') === true) return;
        if (!player.family) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, "top-mid", `Включен глобальный мут чата.`, 3000);
		if (!message.length) return player.outputChatBox('/gfam [message]');

        global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, "top-mid", `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				} else {
                    global.sendDiscordLog(`[GL-Family-Chat] [${player.family}] [#${player.static}] ${player.login} (${player.id}): ${message.join(' ')}`, '1259089622424617071')
                    mp.players.forEach(p => {
                        if (p.adminlvl >= 1 || p.family) {
                            p.outputChatBox(`!{#f5c30f}[GL-Family-Chat] !{#00d47b}[${player.family}] [#${player.static}] ${player.login} (${player.id}): ${message.join(' ')}`);
                        }
                    });
				}
			})
			.catch((err) => {
				return;
			});
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('lfamily', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (!player.family) return;
        if (isFamilyLeaderPlayer(player)) {
            return isNotify(player, 2, "top-mid", "Лидер семьи не может покинуть семью. Используйте «Распустить семью» в планшете.", 4500);
        }

        const familyName = player.family;

        global.DB.query('UPDATE accounts SET family = ?, famRank = ?, fam_rank_extra = NULL WHERE login = ?', [null, null, player.login], function(err) {
            if (err) return console.log(err);

            global.sendDiscordLog(`Выход из семьи!\n\nИгрок - ${player.login} (#${player.static})\nСемья - ${player.family}`, '1331529638127861864')

            player.family = null;
            player.famRank = null;
            player.famRankExtra = null;
            player.setVariable('family', null);
            player.setVariable('famRank', null);
            player.setVariable('famRankExtra', '');
            player.setVariable('familyInteriorDim', 0);
            player.familyID = null;
            player.setVariable('familyID', 0);
            player.call('family:close');
            player.call('family:cef:clear');

            if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
            isNotify(player, 3, "top-mid", "Вы вышли из семьи.", 3000);

            mp.players.forEach(tp => {
                if (tp.getVariable('auth') && tp.family === familyName) {
                    tp.call('family:cef:kick', [player.static]);
                }
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('fam:create:s', (player, famname, typebuy) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        famname = typeof famname === 'string' ? famname.trim().normalize('NFC') : '';
        typebuy = typeof typebuy === 'string' ? typebuy.toLowerCase() : '';
        if (player.family) return isNotify(player, 2, "top-mid", `Вы состоите в семье.`, 3000);
        if (!famname.length) return isNotify(player, 2, "top-mid", `Введите название семьи.`, 3000);
        const famnameLength = Array.from(famname).length;
        if (famnameLength < 3 || famnameLength > 17) {
            return isNotify(player, 2, "top-mid", `Название семьи должно содержать от 3 до 17 символов.`, 3000);
        }
        // Разрешены русские/английские буквы, цифры, пробелы и печатные символы.
        // Блокируем только управляющие и невидимые символы, способные ломать UI/логи.
        if (/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(famname)) {
            return isNotify(player, 2, "top-mid", `Название содержит недопустимые невидимые символы.`, 3000);
        }
        if (typebuy !== 'money' && typebuy !== 'dp') {
            return isNotify(player, 2, "top-mid", `Некорректный способ оплаты.`, 3000);
        }
        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();
        if (!global.economyTryLock(player, 'famCreate', 8000)) {
            return isNotify(player, 2, "top-mid", `Создание уже обрабатывается.`, 2000);
        }
        global.DB.query('SELECT name FROM families WHERE name = ?', [famname], function (err, resluts) {
            if (err) {
                global.economyUnlock(player, 'famCreate');
                console.log(err);
                return isNotify(player, 2, "top-mid", `Не удалось проверить название семьи. Попробуйте ещё раз.`, 3000);
            }
            if (resluts.length > 0) {
                global.economyUnlock(player, 'famCreate');
                return isNotify(player, 2, "top-mid", `Семья с таким названием уже существует.`, 3000);
            }

            const afterPaid = () => {
                player.call('fam:closecreate');
                global.sendDiscordLog(`Создание семьи!\n\nСоздал - ${player.login} (#${player.static})\nНазвание семьи - ${famname}\nСоздал за - ${typebuy}`, '1331529638127861864')
                isNotify(player, 3, "top-mid", `Вы создали семью ${famname}.`, 5000);
                player.outputChatBox('!{#057aff}Вы создали семью, поздравляем! !{yellow}Меню семьи — клавиша M → «Меню семьи». Война семей — M → «Война семей».')
                global.DB.query('INSERT INTO families (name) VALUES (?)', [famname], (err, results) => {
                    global.economyUnlock(player, 'famCreate');
                    if (err) console.log(err);
                    global.DB.query('UPDATE accounts SET family = ?, famRank = ?, fam_rank_extra = NULL WHERE static = ?', [famname, 10, player.static])
                    player.family = famname
                    player.famLeader = true
                    player.famRank = 10
                    player.call('family:cef:setrank', [player.famRank]);
                    player.setVariable('family', famname);
                    player.setVariable('famRank', 10);
                    DB.query('SELECT id, regdate FROM families WHERE name = ?', [player.getVariable('family')], function (err, results) {
                        if (err) return console.log(err);

                        player.familyID = results[0].id;
                        player.setVariable('familyID', Number(results[0].id));
                        if (typeof global.rememberFamilyIdentity === 'function') {
                            global.rememberFamilyIdentity(famname, results[0].id);
                        }
                        if (typeof global.getFamilyMansionInteriorDim === 'function') {
                            player.setVariable('familyInteriorDim', global.getFamilyMansionInteriorDim(Number(player.familyID)));
                        }

                        const regDate = new Date(results[0].regdate);
                        const formattedDate = `${regDate.getDate().toString().padStart(2, '0')}.${(regDate.getMonth() + 1).toString().padStart(2, '0')}.${regDate.getFullYear()} ${regDate.getHours().toString().padStart(2, '0')}:${regDate.getMinutes().toString().padStart(2, '0')}:${regDate.getSeconds().toString().padStart(2, '0')}`;
                        player.call('family:cef:loadinfo', [famname, formattedDate]);
                        if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
                        mp.events.call('family:loadplayers:s', player);
                        if (typeof global.tryCompleteNewbieQuest === 'function') {
                            global.tryCompleteNewbieQuest(player, 'create_family');
                        }
                    });
                });
            };

            if (typebuy === 'money') {
                global.economySpendMoney(player, 800000, (eSpend, ok) => {
                    if (!mp.players.exists(player)) return;
                    if (eSpend || !ok) {
                        global.economyUnlock(player, 'famCreate');
                        return isNotify(player, 2, "top-mid", `Недостаточно средств для покупки.`, 3000);
                    }
                    afterPaid();
                });
            } else if (typebuy === 'dp') {
                global.economySpendDp(player, 2000, (eSpend, ok) => {
                    if (!mp.players.exists(player)) return;
                    if (eSpend || !ok) {
                        global.economyUnlock(player, 'famCreate');
                        return isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
                    }
                    afterPaid();
                });
            } else {
                global.economyUnlock(player, 'famCreate');
            }
        });
    } catch (error) {
        return;
    }
});

mp.events.add('family:rank:load:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        
        const familyName = player.getVariable('family');
        if (!familyName) return;
        
        global.DB.query('SELECT `rank` FROM families WHERE name = ?', [familyName], (err, results) => {
            if (err) return console.log(err);
            if (results.length === 0) return;
            
            const rankSystem = normalizeFamilyRankJson(results[0].rank);
            
            player.call('family:rank:load:c', [rankSystem]);
        });
        
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('family:rank:save:s', (player, rankSystemData, currentRankChange) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        
        const familyName = player.getVariable('family');
        if (!familyName) return;
        
        if (player.famRank !== 10) return;

        const parsedRankSystem = JSON.parse(rankSystemData);

        global.DB.query('SELECT `rank` FROM families WHERE name = ?', [familyName], (err, results) => {
            if (err) return console.log(err);
            if (results.length === 0) return;

            let currentRankSystem = JSON.parse(results[0].rank);

            currentRankSystem[currentRankChange] = {
                CanInvite: parsedRankSystem.CanInvite ? 1 : 0,
                ChangeRank: parsedRankSystem.ChangeRank ? 1 : 0,
                CanKick: parsedRankSystem.CanKick ? 1 : 0,
                withdrawMoney: parsedRankSystem.withdrawMoney ? 1 : 0,
                familyWarehouse: parsedRankSystem.familyWarehouse ? 1 : 0,
                captParticipate: parsedRankSystem.captParticipate ? 1 : 0,
                fleetEvac: parsedRankSystem.fleetEvac ? 1 : 0,
                fleetSummon: parsedRankSystem.fleetSummon ? 1 : 0,
                rankName:
                    parsedRankSystem.rankName != null && String(parsedRankSystem.rankName).trim() !== ''
                        ? String(parsedRankSystem.rankName).trim().slice(0, 40)
                        : (currentRankSystem[currentRankChange] && currentRankSystem[currentRankChange].rankName) || ''
            };

            global.DB.query('UPDATE families SET rank = ? WHERE name = ?', [JSON.stringify(currentRankSystem), familyName], (err, results) => {
                if (err) console.log(err);

                isNotify(player, 3, "top-mid", "Изменения успешно сохранены.", 3000);
            });
        });

    } catch (error) {
        console.log(error);
    }
});

global.familyBuys = new Map();
let cooldownTime = 60 * 60 * 1000; 

mp.events.add('family:adv:buy:s', (player, type) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || player.family == null) return;
        
        let price = 100000;

        let currentTime = Date.now();
        let lastBuyTime = global.familyBuys.get(player.family);
        if (lastBuyTime) {
            let timePassed = currentTime - lastBuyTime;
            if (timePassed < cooldownTime) {
                let minutesLeft = Math.ceil((cooldownTime - timePassed) / 60000);
                return isNotify(player, 2, "top-mid", `Ваша семья сможет купить объявление снова через ${minutesLeft} минут.`, 3000);
            }
        }

        if (price > Number(player.money)) {
            return isNotify(player, 2, "top-mid", `Недостаточно средств для покупки.`, 3000);
        }
        let newMoney = parseInt(Number(player.money)) - parseInt(Number(price));
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err, results) {
            if (err) return console.log(err);
        });

        player.call('updateMoney', [global.formatnum1(newMoney)]);
        player.money = newMoney;
        isNotify(player, 3, "top-mid", `Вы купили рекламу! Объявление опубликовано в чате.`, 3000);
        player.call('sound:client', [3]);

        global.familyBuys.set(player.family, currentTime);

        global.sendDiscordLog(`Отправка объявления!\n\nОтправил - ${player.login} (#${player.static})\nСемья - ${player.family}\nТип объявления - ${type}\nСтоимость - 100.000$`, '1331529638127861864')

        mp.players.forEach(tp => {
            if (tp.getVariable('auth')) {
                isNotify(tp, 1, "top-mid", `Объявление! Посмотрите в чат.`, 3000);

                if (type === 1) {
                    tp.call('chat:pushLine', ['!{#00ff37}----------------ОБЪЯВЛЕНИЕ----------------'])
                    tp.call('chat:pushLine', [`!{#00ff37}Семья ${player.family} приветствует всех игроков сервера!`])
                    tp.call('chat:pushLine', ['!{#00ff37}Хотим проинформировать Вас о том, что прямо сейчас мы ведём набор в нашу семью.'])
                    tp.call('chat:pushLine', ['!{#00ff37}Всех желающих вступить в наши ряды ждём около офиса Arcadius!'])
                } else if (type === 2) {
                    tp.call('chat:pushLine', ['!{#00ff37}----------------ОБЪЯВЛЕНИЕ----------------'])
                    tp.call('chat:pushLine', [`!{#00ff37}На связи семья ${player.family}!`])
                    tp.call('chat:pushLine', ['!{#00ff37}Прямо сейчас мы проводим набор в нашу семью!'])
                    tp.call('chat:pushLine', ['!{#00ff37}Хочешь играть войны семей, зарабатывать деньги, завести новые знакомства? Тогда тебе к нам.'])
                    tp.call('chat:pushLine', ['!{#00ff37}Всех, кто хочет присоединиться к нам ждём около офиса Arcadius!'])
                } else if (type === 3) {
                    tp.call('chat:pushLine', ['!{#00ff37}----------------ОБЪЯВЛЕНИЕ----------------'])
                    tp.call('chat:pushLine', [`!{#00ff37}Прямо сейчас проводится набор в семью ${player.family}!`])
                    tp.call('chat:pushLine', ['!{#00ff37}Если ты хочешь получить ещё больше контента, перестрелок, войн семей, интересных мероприятий - тогда тебе к нам!'])
                    tp.call('chat:pushLine', ['!{#00ff37}Всех желающих вступить в наши ряды ждём около офиса Arcadius!'])
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('famcreatev', (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('famcreate', toogle);
    } catch (error) {
        return;
    }
});

mp.events.add('family:v', (player, toogle) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('familymenu', toogle);
        if (toogle) {
            player.call('family:points:load:c', [JSON.stringify(global.serverPoints || [])]);
        }
    } catch (error) {
        return;
    }
});

function broadcastFamilyBalance(familyName, balance) {
    const b = parseInt(balance, 10) || 0;
    const key = String(familyName || '').trim();
    mp.players.forEach((tp) => {
        if (tp.getVariable('auth') && String(tp.family || '').trim() === key && tp.getVariable('familymenu') === true) {
            tp.call('family:cef:setbalance', [b]);
        }
    });
}
global.broadcastFamilyBalance = broadcastFamilyBalance;

function hasFamilyWithdrawMoneyAccess(rankSystem, player) {
    if (!rankSystem || !player) return false;
    const ids = global.getPlayerFamilyRankIds(player);
    if (ids.indexOf(10) !== -1) return true;
    for (let i = 0; i < ids.length; i++) {
        const row = rankSystem[ids[i]];
        if (row && Number(row.withdrawMoney) === 1) return true;
    }
    return false;
}

function parseFamilyMoneyAmount(amountStr) {
    const raw = String(amountStr == null ? '' : amountStr).replace(/\s/g, '').replace(/[^\d]/g, '');
    const amount = parseInt(raw, 10);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

mp.events.add('family:balance:request:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        const fam = String(player.family || '').trim();
        if (!fam) return;
        ensureFamilyRowInDb(fam, (e0) => {
            if (e0) return console.log('ensureFamilyRowInDb balance:request', e0);
            if (!mp.players.exists(player)) return;
            global.DB.query('SELECT balance FROM families WHERE name = ?', [fam], (err, results) => {
                if (err) return console.log('family balance request', err);
                if (!results.length) return;
                const bal = parseInt(results[0].balance, 10);
                player.call('family:cef:setbalance', [Number.isFinite(bal) ? bal : 0]);
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('family:balance:deposit:s', (player, amountStr) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        const fam = String(player.family || '').trim();
        if (!fam) return;
        const amount = parseFamilyMoneyAmount(amountStr);
        if (amount < 1) return isNotify(player, 2, 'top-mid', 'Укажите корректную сумму.', 3000);
        if (amount > Number(player.money)) return isNotify(player, 2, 'top-mid', 'Недостаточно наличных.', 3000);
        if (typeof global.economyTryLock === 'function' && !global.economyTryLock(player, 'family_balance', 8000)) {
            return isNotify(player, 2, 'top-mid', 'Подождите, операция уже выполняется.', 2500);
        }

        ensureFamilyRowInDb(fam, (e0) => {
            if (e0) {
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'family_balance');
                console.log('ensureFamilyRowInDb balance:deposit', e0);
                return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
            }
            if (!mp.players.exists(player)) return;
            global.economySpendMoney(player, amount, (errSpend, okSpend) => {
                if (!mp.players.exists(player)) return;
                if (errSpend || !okSpend) {
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'family_balance');
                    return isNotify(player, 2, 'top-mid', 'Недостаточно наличных.', 3000);
                }
                global.DB.query('UPDATE families SET balance = balance + ? WHERE name = ?', [amount, fam], (e2) => {
                    if (!mp.players.exists(player)) return;
                    if (e2) {
                        console.log('family balance deposit update', e2);
                        global.economyAddMoney(player, amount, () => {});
                        if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'family_balance');
                        return isNotify(player, 2, 'top-mid', 'Ошибка пополнения.', 3000);
                    }
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'family_balance');
                    global.DB.query('SELECT balance FROM families WHERE name = ?', [fam], (e3, r3) => {
                        const nb = r3 && r3[0] ? parseInt(r3[0].balance, 10) : 0;
                        broadcastFamilyBalance(fam, nb);
                    });
                    if (typeof global.logFamilyAction === 'function') {
                        global.logFamilyAction(fam, player, 'balance_deposit', `Положил деньги на счёт семьи: ${global.formatnum1(amount)}$`);
                    }
                    isNotify(player, 3, 'top-mid', `На счёт семьи зачислено ${global.formatnum1(amount)}$.`, 3500);
                });
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('family:balance:withdraw:s', (player, amountStr) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        const fam = String(player.family || '').trim();
        if (!fam) return;
        const amount = parseFamilyMoneyAmount(amountStr);
        if (amount < 1) return isNotify(player, 2, 'top-mid', 'Укажите корректную сумму.', 3000);

        ensureFamilyRowInDb(fam, (e0) => {
            if (e0) {
                console.log('ensureFamilyRowInDb balance:withdraw', e0);
                return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
            }
            if (!mp.players.exists(player)) return;
            global.DB.query('SELECT `rank`, balance FROM families WHERE name = ?', [fam], (err, results) => {
                if (err) {
                    console.log('family balance withdraw select', err);
                    return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
                }
                if (!results.length) return isNotify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
                const rankSystem = JSON.parse(results[0].rank);
                if (!hasFamilyWithdrawMoneyAccess(rankSystem, player)) {
                    return isNotify(player, 2, 'top-mid', 'Недостаточно прав для снятия.', 3000);
                }
                const curBal = parseInt(results[0].balance, 10) || 0;
                if (amount > curBal) return isNotify(player, 2, 'top-mid', 'На счету семьи недостаточно средств.', 3000);

                global.DB.query('UPDATE families SET balance = balance - ? WHERE name = ? AND balance >= ?', [amount, fam, amount], (e2, res) => {
                    if (e2) {
                        console.log('family balance withdraw update', e2);
                        return isNotify(player, 2, 'top-mid', 'Ошибка снятия.', 3000);
                    }
                    if (!res || res.affectedRows === 0) return isNotify(player, 2, 'top-mid', 'На счету семьи недостаточно средств.', 3000);

                    const newMoney = parseInt(Number(player.money), 10) + amount;
                    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], () => {});
                    player.money = newMoney;
                    player.call('updateMoney', [global.formatnum1(newMoney)]);
                    global.DB.query('SELECT balance FROM families WHERE name = ?', [fam], (e3, r3) => {
                        const nb = r3 && r3[0] ? parseInt(r3[0].balance, 10) : 0;
                        broadcastFamilyBalance(fam, nb);
                    });
                    if (typeof global.logFamilyAction === 'function') {
                        global.logFamilyAction(fam, player, 'balance_withdraw', `Снял деньги со счёта семьи: ${global.formatnum1(amount)}$`);
                    }
                    isNotify(player, 3, 'top-mid', `Вы сняли ${global.formatnum1(amount)}$ со счёта семьи.`, 3500);
                });
            });
        });
    } catch (error) {
        console.log(error);
    }
});

// Система каптов для семей
const CAPTS_LEVELS = [
    { level: 0, name: 'Новички', minPoints: 0, maxPoints: 99 },
    { level: 1, name: 'Опытные', minPoints: 100, maxPoints: 499 },
    { level: 2, name: 'Ветераны', minPoints: 500, maxPoints: 1499 },
    { level: 3, name: 'Элита', minPoints: 1500, maxPoints: 3999 },
    { level: 4, name: 'Легенды', minPoints: 4000, maxPoints: 9999 },
    { level: 5, name: 'Титаны', minPoints: 10000, maxPoints: 99999999 }
];

function getCaptLevel(points) {
    for (let i = CAPTS_LEVELS.length - 1; i >= 0; i--) {
        if (points >= CAPTS_LEVELS[i].minPoints) {
            return CAPTS_LEVELS[i];
        }
    }
    return CAPTS_LEVELS[0];
}

function updateFamilyCapt(familyName) {
    try {
        global.DB.query('SELECT rating_points FROM families WHERE name = ?', [familyName], (err, results) => {
            if (err) return console.log(err);
            if (results.length === 0) return;

            const points = results[0].rating_points;
            const captLevel = getCaptLevel(points);

            global.DB.query('UPDATE families SET capts = ? WHERE name = ?', [captLevel.level, familyName], (err) => {
                if (err) console.log(err);
            });
        });
    } catch (error) {
        console.log(error);
    }
}

function pushFamilyCaptsToPlayer(player, familyData) {
    if (!mp.players.exists(player) || !familyData) return;
    const captLevel = getCaptLevel(familyData.rating_points);
    const nextLevel = CAPTS_LEVELS[Math.min(captLevel.level + 1, CAPTS_LEVELS.length - 1)];
    player.call('family:capts:load:c', [
        captLevel.level,
        captLevel.name,
        familyData.rating_points,
        captLevel.minPoints,
        nextLevel.minPoints,
        familyData.total_kills,
        familyData.total_deaths,
        familyData.territories || 0
    ]);
}
global.pushFamilyCaptsToPlayer = pushFamilyCaptsToPlayer;

// Загрузка информации о каптах семьи
mp.events.add('family:capts:load:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.family) return;

        global.DB.query('SELECT capts, rating_points, total_kills, total_deaths, territories FROM families WHERE name = ?', [player.family], (err, results) => {
            if (err) return console.log(err);
            if (!results || !results.length) return;
            if (!mp.players.exists(player)) return;
            pushFamilyCaptsToPlayer(player, results[0]);
        });
    } catch (error) {
        console.log(error);
    }
});

// Загрузка рейтинга всех семей
mp.events.add('family:rating:load:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        global.DB.query('SELECT name, capts, rating_points, total_kills, total_deaths, territories FROM families WHERE territories > 0 ORDER BY territories DESC, rating_points DESC LIMIT 50', [], (err, results) => {
            if (err) return console.log(err);

            let ratingData = [];
            results.forEach((family, index) => {
                const captLevel = getCaptLevel(family.rating_points);
                ratingData.push({
                    position: index + 1,
                    name: family.name,
                    captLevel: captLevel.level,
                    captName: captLevel.name,
                    points: family.rating_points,
                    kills: family.total_kills,
                    deaths: family.total_deaths,
                    territories: family.territories || 0
                });
            });

            player.call('family:rating:load:c', [JSON.stringify(ratingData)]);
        });
    } catch (error) {
        console.log(error);
    }
});

// Добавление очков рейтинга семье (вызывается при убийстве игрока)
mp.events.add('family:addpoints:s', (familyName, points, isKill) => {
    try {
        if (!familyName) return;

        let updateQuery = 'UPDATE families SET rating_points = rating_points + ?';
        
        if (isKill) {
            updateQuery += ', total_kills = total_kills + 1';
        } else {
            updateQuery += ', total_deaths = total_deaths + 1';
        }
        
        updateQuery += ' WHERE name = ?';

        global.DB.query(updateQuery, [points, familyName], (err) => {
            if (err) return console.log(err);
            updateFamilyCapt(familyName);
        });
    } catch (error) {
        console.log(error);
    }
});

// Добавление/изменение территорий семьи (для админов)
mp.events.add('family:setterritories:s', (familyName, count) => {
    try {
        if (!familyName) return;
        
        global.DB.query('UPDATE families SET territories = ? WHERE name = ?', [count, familyName], (err) => {
            if (err) return console.log(err);
            console.log(`[FAMILY] Territories updated for ${familyName}: ${count}`);
        });
    } catch (error) {
        console.log(error);
    }
});

// Команда для админов: установить количество территорий семье
mp.events.addCommand('setfamterr', (player, fullText, familyName, count) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.adminlvl < 10) return isNotify(player, 2, "top-mid", "Недостаточно прав.", 3000);
        
        if (!familyName || !count) {
            return player.outputChatBox('/setfamterr [название_семьи] [количество_точек]');
        }
        
        count = parseInt(count);
        if (isNaN(count) || count < 0) {
            return isNotify(player, 2, "top-mid", "Укажите корректное количество точек.", 3000);
        }
        
        global.DB.query('SELECT name FROM families WHERE name = ?', [familyName], (err, results) => {
            if (err) return console.log(err);
            if (results.length === 0) {
                return isNotify(player, 2, "top-mid", "Семья не найдена.", 3000);
            }
            
            global.DB.query('UPDATE families SET territories = ? WHERE name = ?', [count, familyName], (err) => {
                if (err) return console.log(err);
                
                isNotify(player, 3, "top-mid", `Установлено ${count} точек для семьи ${familyName}.`, 3000);
                global.sendDiscordLog(`Изменение территорий семьи!\n\nАдминистратор - ${player.login} (#${player.static})\nСемья - ${familyName}\nНовое количество точек - ${count}`, '1331529638127861864');
            });
        });
    } catch (error) {
        console.log(error);
    }
});

// Команда для админов: добавить территории семье
mp.events.addCommand('addfamterr', (player, fullText, familyName, count) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.adminlvl < 10) return isNotify(player, 2, "top-mid", "Недостаточно прав.", 3000);
        
        if (!familyName || !count) {
            return player.outputChatBox('/addfamterr [название_семьи] [количество_точек]');
        }
        
        count = parseInt(count);
        if (isNaN(count)) {
            return isNotify(player, 2, "top-mid", "Укажите корректное количество точек.", 3000);
        }
        
        global.DB.query('SELECT name, territories FROM families WHERE name = ?', [familyName], (err, results) => {
            if (err) return console.log(err);
            if (results.length === 0) {
                return isNotify(player, 2, "top-mid", "Семья не найдена.", 3000);
            }
            
            const currentTerr = results[0].territories || 0;
            const newTerr = Math.max(0, currentTerr + count);
            
            global.DB.query('UPDATE families SET territories = ? WHERE name = ?', [newTerr, familyName], (err) => {
                if (err) return console.log(err);
                
                const action = count > 0 ? 'Добавлено' : 'Убрано';
                isNotify(player, 3, "top-mid", `${action} ${Math.abs(count)} точек для семьи ${familyName}. Всего: ${newTerr}`, 3000);
                global.sendDiscordLog(`Изменение территорий семьи!\n\nАдминистратор - ${player.login} (#${player.static})\nСемья - ${familyName}\nИзменение - ${count > 0 ? '+' : ''}${count}\nВсего точек - ${newTerr}`, '1331529638127861864');
            });
        });
    } catch (error) {
        console.log(error);
    }
});

// ============= СИСТЕМА ТОЧЕК НА СЕРВЕРЕ =============

// Инициализация точек (загружаем из БД или создаём дефолтные)
global.serverPoints = [];
const DEFAULT_POINTS_COUNT = 90;

function formatPointCapturedAt(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString();
    const s = String(val);
    return s.length ? s : null;
}

/** Если в БД нет столбца captured_at — добавляем (иначе SELECT * падает). */
function ensureFamilyPointsCapturedAtColumn(done) {
    if (!global.DB || typeof done !== 'function') {
        if (typeof done === 'function') done();
        return;
    }
    global.DB.query(
        "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'family_points' AND COLUMN_NAME = 'captured_at'",
        [],
        (err, rows) => {
            if (err) {
                console.log('[FAMILY POINTS] Проверка captured_at:', err.message || err);
                done();
                return;
            }
            const n = rows && rows[0] != null ? Number(rows[0].c) : 0;
            if (n > 0) {
                done();
                return;
            }
            global.DB.query(
                'ALTER TABLE family_points ADD COLUMN captured_at DATETIME NULL DEFAULT NULL AFTER owner_family',
                [],
                (aerr) => {
                    if (aerr) {
                        console.log('[FAMILY POINTS] Не удалось ADD captured_at — выполните migration_family_points_captured_at.sql:', aerr.message || aerr);
                    } else {
                        console.log('[FAMILY POINTS] В таблицу family_points добавлен столбец captured_at.');
                    }
                    done();
                }
            );
        }
    );
}

function broadcastFamilyPointPatch(pt) {
    if (!pt) return;
    const own = pt.owner != null && String(pt.owner).trim() !== '' ? String(pt.owner) : null;
    const payload = JSON.stringify({
        id: Number(pt.id),
        owner: own,
        underAttack: !!pt.underAttack,
        capturedAt: pt.capturedAt != null && String(pt.capturedAt).trim() !== '' ? String(pt.capturedAt) : null,
        defCooldownUntil: Number(pt.defCooldownUntil) || 0
    });
    mp.players.forEach((p) => {
        if (!p.getVariable('auth')) return;
        if (!normalizeCaptFamilyKey(p.family || p.getVariable('family'))) return;
        try { p.call('family:point:patch:c', [payload]); } catch (_e) {}
    });
}

/** Мигание зоны в UI планшета (активный капт). */
function broadcastFamilyPointFlash(pointId, active) {
    const id = parseInt(pointId, 10);
    if (!Number.isFinite(id) || id < 1) return;
    const on = !!active;
    mp.players.forEach((p) => {
        if (!p.getVariable('auth')) return;
        if (!normalizeCaptFamilyKey(p.family || p.getVariable('family'))) return;
        try { p.call('family:point:flash:c', [id, on]); } catch (_e) {}
    });
}

function initServerPoints() {
    ensureFamilyPointsCapturedAtColumn(() => {
    global.DB.query('SELECT * FROM family_points ORDER BY id', [], (err, results) => {
        if (err) {
            console.log('[FAMILY POINTS] Error loading points:', err);
            // Создаём дефолтные точки если таблицы нет
            createDefaultPoints();
            return;
        }
        
        if (results.length === 0) {
            createDefaultPoints();
        } else {
            // В БД обычно лежат только занятые точки. В UI нужно всегда показывать полный список (90+),
            // поэтому заполняем массив точек с 1..N, а владельцев подставляем из БД.
            const ownerById = new Map();
            const capturedAtById = new Map();
            let maxId = 0;
            results.forEach(r => {
                const id = Number(r.id);
                if (!Number.isFinite(id) || id <= 0) return;
                maxId = Math.max(maxId, id);
                const rawOwn = r.owner_family != null ? String(r.owner_family).trim() : '';
                ownerById.set(id, rawOwn !== '' ? rawOwn : null);
                if (r.captured_at != null) {
                    capturedAtById.set(id, formatPointCapturedAt(r.captured_at));
                }
            });

            const count = Math.max(DEFAULT_POINTS_COUNT, maxId);
            global.serverPoints = [];
            for (let i = 1; i <= count; i++) {
                global.serverPoints.push({
                    id: i,
                    owner: ownerById.get(i) || null,
                    underAttack: false,
                    capturedAt: capturedAtById.get(i) || null
                });
            }
            console.log(`[FAMILY POINTS] Loaded owners: ${results.length}, built points: ${global.serverPoints.length}`);
        }
    });
    });
}

function createDefaultPoints(opts) {
    // Создаём 90 точек по умолчанию
    global.serverPoints = [];
    for (let i = 1; i <= DEFAULT_POINTS_COUNT; i++) {
        global.serverPoints.push({
            id: i,
            owner: null,
            underAttack: false,
            capturedAt: null
        });
    }
    if (!(opts && opts.silent)) {
        console.log(`[FAMILY POINTS] Created ${DEFAULT_POINTS_COUNT} default points`);
    }
}

// Сразу заполняем список точек (пока грузится БД), чтобы меню не было пустым
createDefaultPoints({ silent: true });
if (typeof global.whenDbReady === 'function') {
    global.whenDbReady(initServerPoints);
    global.whenDbReady(loadFamilyIdentityCache);
} else {
    setTimeout(initServerPoints, 3000);
    setTimeout(loadFamilyIdentityCache, 3000);
}

// Загрузка точек для игрока
mp.events.add('family:points:load:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        
        player.call('family:points:load:c', [JSON.stringify(global.serverPoints)]);
    } catch (error) {
        console.log(error);
    }
});

// Лимиты формата капта для UI (онлайн атакующих / защитников по выбранной точке)
mp.events.add('family:capt:formatLimits:s', (player, pointId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        const attackerFamily = player.family;
        const lim = captMaxNForPoint(attackerFamily, { owner: null });
        let payload = {
            attackerOnline: lim.attackerOnline,
            defenderOnline: 0,
            maxN: lim.maxN,
            hasDefender: false
        };
        pointId = parseInt(pointId, 10) || 0;
        if (pointId > 0 && global.serverPoints) {
            const point = global.serverPoints.find((p) => p.id === pointId);
            if (point) {
                const isCounterDef = isCaptCounterDefAttack(attackerFamily, point);
                const l = captMaxNForPoint(attackerFamily, point, isCounterDef);
                payload = {
                    attackerOnline: l.attackerOnline,
                    defenderOnline: l.defenderOnline,
                    maxN: l.maxN,
                    hasDefender: l.hasDefender,
                    isCounterDef
                };
            }
        }
        player.call('family:capt:formatLimits:c', [JSON.stringify(payload)]);
    } catch (e) {
        console.log(e);
    }
});

// Атака точки
mp.events.add('family:attack:s', (player, format, weapon, pointId, gangId, optionsStr) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.family) return isNotify(player, 2, "top-mid", "Вы не состоите в семье.", 3000);
        const attackerFamily = player.family;
        const nowTs = Date.now();
        if (global.activeBattles) {
            for (const battle of Object.values(global.activeBattles)) {
                if (!battle) continue;
                if (battle.attackerFamily === attackerFamily || battle.defenderFamily === attackerFamily) {
                    return isNotify(player, 2, "top-mid", "Ваша семья уже участвует в войне семей.", 3000);
                }
            }
        }
        
        const parsedFormat = parseCaptFormatNxN(format);
        if (!parsedFormat.ok) {
            return isNotify(player, 2, "top-mid", `Формат боя: от ${CAPT_FORMAT_MIN_N}x${CAPT_FORMAT_MIN_N} до ${CAPT_FORMAT_MAX_N}x${CAPT_FORMAT_MAX_N} (одинаковое число с каждой стороны).`, 4000);
        }
        const requestedN = parsedFormat.n;

        const validWeapons = CAPT_VALID_WEAPON_KEYS;

        let opts = {};
        if (typeof optionsStr === 'string' && optionsStr.length) {
            try {
                opts = JSON.parse(optionsStr);
            } catch (e) {
                opts = {};
            }
        }
        const rawW1 = validWeapons.includes(weapon) ? weapon : '';
        const rawW2 = validWeapons.includes(opts.weapon2) ? opts.weapon2 : '';
        const rawW3 = validWeapons.includes(opts.weapon3) ? opts.weapon3 : '';
        const [slot1Weapon, slot2Weapon, slot3Weapon] = sanitizeCaptWeaponTriple(rawW1, rawW2, rawW3);
        const allowSpank = !!opts.allowSpank;
        const allowAlco = !!opts.allowAlco;
        const allowArmor = !!opts.allowArmor;
        
        requireFamilyCaptStartPerm(player, attackerFamily, () => {

        if (global.activeBattles) {
            for (const battle of Object.values(global.activeBattles)) {
                if (!battle) continue;
                if (battle.attackerFamily === attackerFamily || battle.defenderFamily === attackerFamily) {
                    return isNotify(player, 2, "top-mid", "Ваша семья уже участвует в войне семей.", 3000);
                }
            }
        }

        // Находим точку: по pointId если указан, иначе первую доступную (владелец не в другом капте)
        let targetPoint = null;
        if (pointId && pointId > 0) {
            const wanted = global.serverPoints.find((p) => p.id === pointId);
            if (wanted && (wanted.underAttack || (global.activeBattles && global.activeBattles[wanted.id]))) {
                return isNotify(player, 2, "top-mid", "На эту точку уже объявлена война.", 4000);
            }
            if (wanted && isCaptTargetPointAllowed(wanted, attackerFamily)) {
                targetPoint = wanted;
            } else if (wanted && wanted.owner && normalizeCaptFamilyKey(wanted.owner) !== normalizeCaptFamilyKey(attackerFamily) && !wanted.underAttack && isFamilyInActiveCaptBattle(wanted.owner)) {
                return isNotify(player, 2, "top-mid", "Семья владельца уже в войне семей на другой точке. Сначала дождитесь окончания того боя.", 5000);
            }
        }
        if (!targetPoint) {
            targetPoint = global.serverPoints.find((p) => isCaptTargetPointAllowed(p, attackerFamily));
        }

        if (!targetPoint) {
            return isNotify(player, 2, "top-mid", "Нет доступных точек для атаки (свободных или у семей не в бою).", 4000);
        }

        if (targetPoint.underAttack || (global.activeBattles && global.activeBattles[targetPoint.id])) {
            return isNotify(player, 2, "top-mid", "На эту точку уже объявлена война.", 4000);
        }
        targetPoint.underAttack = true;
        global.activeBattles = global.activeBattles || {};
        const reservedPointId = targetPoint.id;
        global.activeBattles[reservedPointId] = {
            reserving: true,
            pointId: reservedPointId,
            attackerFamily,
            startTime: Date.now()
        };
        const releaseCaptReserve = () => {
            try {
                const cur = global.activeBattles && global.activeBattles[reservedPointId];
                if (cur && cur.reserving && cur.attackerFamily === attackerFamily) {
                    delete global.activeBattles[reservedPointId];
                }
                if (targetPoint && targetPoint.id === reservedPointId) {
                    targetPoint.underAttack = false;
                    broadcastFamilyPointPatch(targetPoint);
                }
            } catch (_e) {}
        };

        const protectUntil = getPointIncomingProtectUntil(targetPoint);
        if (protectUntil > Date.now()) {
            releaseCaptReserve();
            return isNotify(
                player,
                2,
                "top-mid",
                `Семья-владелец под защитой после войны. Забить точку можно через ${formatCaptCdLeft(protectUntil)}`,
                4500
            );
        }

        const isCounterDef = isCaptCounterDefAttack(attackerFamily, targetPoint);
        const captCd = getFamilyCaptCooldownData(attackerFamily);
        const cdUntil = isCounterDef ? captCd.defUntil : captCd.attackUntil;
        if (nowTs < cdUntil) {
            const leftMin = Math.ceil((cdUntil - nowTs) / 60000);
            releaseCaptReserve();
            return isNotify(
                player,
                2,
                "top-mid",
                `${isCounterDef ? 'Война семей (деф)' : 'Война семей (атака)'} доступна через ${leftMin} мин.`,
                3500
            );
        }

        const captLimits = captMaxNForPoint(attackerFamily, targetPoint, isCounterDef);
        if (captLimits.attackerOnline < CAPT_FORMAT_MIN_N) {
            releaseCaptReserve();
            return isNotify(player, 2, "top-mid", `Нужно минимум ${CAPT_FORMAT_MIN_N} онлайн-игроков вашей семьи. Сейчас: ${captLimits.attackerOnline}`, 4500);
        }
        // Владелец точки должен быть в сети (не AFK/оффлайн-капт), в т.ч. контр-деф.
        if (captLimits.hasDefender && captLimits.defenderOnline < CAPT_FORMAT_MIN_N) {
            releaseCaptReserve();
            const offlineHint = captLimits.defenderOnline <= 0
                ? ' Семья-владелец не в сети — бить точку в AFK нельзя.'
                : '';
            return isNotify(
                player,
                2,
                "top-mid",
                `У семьи-владельца точки нужно минимум ${CAPT_FORMAT_MIN_N} онлайн. Сейчас: ${captLimits.defenderOnline}.${offlineHint}`,
                5500
            );
        }
        if (requestedN > captLimits.maxN) {
            releaseCaptReserve();
            const d = captLimits.hasDefender
                ? `онлайн атакующих: ${captLimits.attackerOnline}, защитников: ${captLimits.defenderOnline}`
                : `онлайн вашей семьи: ${captLimits.attackerOnline}`;
            return isNotify(player, 2, "top-mid", `Формат не больше ${captLimits.maxN}x${captLimits.maxN} (${d}).`, 5500);
        }

        const defenderFamily = targetPoint.owner || null;

        const weaponName = captWeaponKeyToDisplayName(slot1Weapon);
        const w2n = captWeaponKeyToDisplayName(slot2Weapon);
        const w3n = captWeaponKeyToDisplayName(slot3Weapon);
        const calStr = Array.isArray(opts.calibers) && opts.calibers.length
            ? opts.calibers.join(', ')
            : `${weaponName} / ${w2n} / ${w3n}`;
        const extraOpt = `Спанк: ${allowSpank ? 'да' : 'нет'}, Алко: ${allowAlco ? 'да' : 'нет'}, Броня: ${allowArmor ? 'да' : 'нет'}`;
        const defenderDisplay = defenderFamily || 'Свободна';

        const arenaLocation = getRandomCombatArena(global.__lastCaptFamilyArena);
        const arenaName = String(arenaLocation && arenaLocation.name || '').trim() || 'Арена';
        if (arenaName && arenaName !== 'Арена') global.__lastCaptFamilyArena = arenaName;
        const arenaMeta = getCombatArenaMetaFromLocation(arenaLocation);
        const mapInfo = `Карта: ${arenaName}`;

        if (typeof global.logFamilyAction === 'function') {
            global.logFamilyAction(attackerFamily, player, 'capt_start',
                `Забил войну семей на точку #${targetPoint.id} vs ${defenderDisplay}. Формат ${format}, калибры: ${calStr}`);
        }
        player.call('family:attack:started');
        
        // Уведомляем всех членов семьи
        const atkKey = normalizeCaptFamilyKey(attackerFamily);
        const defKey = defenderFamily ? normalizeCaptFamilyKey(defenderFamily) : '';
        mp.players.forEach(p => {
            if (!p.getVariable('auth')) return;
            const pfam = normalizeCaptFamilyKey(p.family || p.getVariable('family'));

            if (pfam === atkKey) {
                p.outputChatBox(`!{#ff0000}[ВОЙНА СЕМЕЙ] !{#fff}${player.login} начал атаку точки #${targetPoint.id}! ${mapInfo}. Формат: ${format}, калибры: ${calStr}. ${extraOpt}`);
            }

            if (defKey && pfam === defKey) {
                p.outputChatBox(`!{#ff0000}[ВОЙНА СЕМЕЙ] !{#fff}Семья ${player.family} забила вам войну семей! Точка #${targetPoint.id}. ${mapInfo}. Формат: ${format}, калибры: ${calStr}. ${extraOpt}`);
            }
        });
        
        broadcastFamilyPointPatch(targetPoint);
        broadcastFamilyPointFlash(targetPoint.id, true);
        if (isCounterDef) captCd.defUntil = nowTs + CAPT_DEF_COOLDOWN_MS;
        else captCd.attackUntil = nowTs + CAPT_ATTACK_COOLDOWN_MS;
        
        const gangNames = { 1: 'Ballas', 2: 'Families', 3: 'Bloods', 4: 'Vagos', 5: 'Marabunta' };
        const gangName = gangNames[gangId] || 'Unknown';
        global.sendDiscordLog(`Атака точки!\n\nАтакующий - ${player.login} (#${player.static})\nСемья - ${player.family}\nГан - ${gangName}\nТочка - #${targetPoint.id}\n${mapInfo}\nФормат - ${format}\nКалибры - ${calStr}\n${extraOpt}`, '1331529638127861864');
        
        const captDimension = 2000 + targetPoint.id;
        const attackerFamily2 = player.family;
        const BATTLE_START = FAMILY_WAR_PREP_MS;
        const BATTLE_DURATION = BATTLE_START + FAMILY_WAR_FIGHT_MS;
        const TELEPORT_WINDOW = BATTLE_START;
        
        const captStartTime = Date.now();
        global.activeBattles[targetPoint.id] = {
            pointId: targetPoint.id,
            attackerFamily,
            defenderFamily: defenderDisplay,
            startTime: captStartTime,
            dimension: captDimension,
            weapon: slot1Weapon,
            weapon2: slot2Weapon,
            weapon3: slot3Weapon,
            calibers: Array.isArray(opts.calibers) ? opts.calibers.filter((c) => typeof c === 'string') : [],
            allowSpank,
            allowAlco,
            allowArmor,
            format,
            isStarted: false,
            players: {},
            eliminated: {},
            lootItems: [],
            combatStats: {},
            arenaCx: arenaMeta.cx,
            arenaCy: arenaMeta.cy,
            arenaCz: arenaMeta.cz,
            arenaRadius: arenaMeta.radius,
            arenaLocation,
            arenaName
        };

        if (typeof global.broadcastCaptWarAlerts === 'function') {
            global.broadcastCaptWarAlerts(
                attackerFamily,
                defenderDisplay,
                targetPoint.id,
                calStr,
                extraOpt,
                captStartTime,
                format
            );
        }

        (function postCaptDiscord() {
            try {
                const st = global.activeBattles[targetPoint.id].startTime;
                const snap = {
                    createdMs: st,
                    fightStartMs: st + BATTLE_START,
                    pointId: targetPoint.id,
                    format,
                    calibers: Array.isArray(opts.calibers)
                        ? opts.calibers.filter((c) => typeof c === 'string')
                        : [],
                    w1: weaponName,
                    w2: w2n,
                    w3: w3n,
                    allowAlco,
                    allowSpank,
                    allowArmor,
                    attackerFamily: attackerFamily2,
                    defenderFamily: defenderDisplay
                };
                if (typeof global.postDiscordCaptAnnouncement === 'function') {
                    global.postDiscordCaptAnnouncement(snap).then((meta) => {
                        try {
                            if (meta && global.activeBattles && global.activeBattles[targetPoint.id]) {
                                global.activeBattles[targetPoint.id].discordCapt = { ...meta, snapshot: snap };
                            }
                        } catch (_e) {}
                    });
                }
            } catch (_e) {}
        })();
        
        function updateBattleHud() {
            try {
                const battle = global.activeBattles[targetPoint.id];
                if (!battle) return;
                const elapsed = Date.now() - battle.startTime;
                const totalLeft = Math.max(0, Math.floor((BATTLE_DURATION - elapsed) / 1000));
                const prepLeft = Math.max(0, Math.floor((BATTLE_START - elapsed) / 1000));
                const canTeleport = elapsed < BATTLE_DURATION;
                const teleportLeft = Math.max(0, Math.floor((TELEPORT_WINDOW - elapsed) / 1000));
                const isAlive = (p) => !p.getVariable('dead');
                
                const allPlayers = mp.players.toArray();
                const attackerCount = allPlayers.filter(p => p.dimension === captDimension && (p.family === attackerFamily || p.getVariable('family') === attackerFamily) && isAlive(p)).length;
                const defenderCount = defenderDisplay === 'Свободна' ? 0 : allPlayers.filter(p => p.dimension === captDimension && (p.family === defenderDisplay || p.getVariable('family') === defenderDisplay) && isAlive(p)).length;
                
                const formatTime = (sec) => `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;
                const atkKeyHud = normalizeCaptFamilyKey(attackerFamily);
                const defKeyHud = defenderDisplay !== 'Свободна' ? normalizeCaptFamilyKey(defenderDisplay) : '';
                allPlayers.forEach(p => {
                    if (!p.getVariable('auth') || !mp.players.exists(p)) return;
                    const inBattleDim = p.dimension === captDimension;
                    if (!inBattleDim) return;
                    if (inBattleDim && !battle.allowArmor) {
                        if (p.armour > 0) p.armour = 0;
                        if (p.getVariable('armor')) {
                            p.setVariable('armor', null);
                            p.setClothes(9, 0, 0, 0);
                        }
                    }
                    p.call('captBattle:update', [attackerFamily, defenderDisplay, attackerCount, defenderCount, prepLeft, formatTime(totalLeft), canTeleport, formatTime(teleportLeft), totalLeft]);
                });

                // Start Battle Logic
                if (!battle.isStarted && prepLeft <= 0) {
                    battle.isStarted = true;

                    allPlayers.forEach(p => {
                        if (p.getVariable('auth') && p.dimension === captDimension && mp.players.exists(p)) {
                            if (typeof global.forceClearGreenZone === 'function') global.forceClearGreenZone(p);
                            p.setVariable('captFrozen', false);
                            p.setVariable('captRegDamage', true);
                            clearCaptFallInvulnTimer(p);
                            try {
                                p.setInvincible(false);
                            } catch (e) {}
                            if (!battle.allowArmor) {
                                p.setVariable('armor', null);
                                p.setClothes(9, 0, 0, 0);
                                p.armour = 0;
                            }
                            setCaptConsumableFlags(p, battle);
                            p.call('captBattle:unfreeze');
                        }
                    });
                }

                // Проверка на победу (Last Team Standing)
                if (battle.isStarted) {
                    // Failsafe: разморозка игроков, если они забагались
                    allPlayers.forEach(p => {
                        if (p.dimension === captDimension && p.getVariable('captFrozen')) {
                            clearCaptFallInvulnTimer(p);
                            p.setVariable('captFrozen', false);
                            p.setVariable('captRegDamage', true);
                            try {
                                p.setInvincible(false);
                            } catch (e) {}
                            p.call('captBattle:unfreeze');
                        }
                    });
                    // После нуля таймера бой продолжается — панель держим на 00:00 до победы по убийствам
                    const cx = battle.arenaCx;
                    const cy = battle.arenaCy;
                    const arenaR = battle.arenaRadius;
                    if (typeof cx === 'number' && typeof cy === 'number' && typeof arenaR === 'number') {
                        allPlayers.forEach((p) => {
                            if (!p.getVariable('auth') || p.dimension !== captDimension || !mp.players.exists(p)) return;
                            if (p.getVariable('dead')) return;
                            const dx = p.position.x - cx;
                            const dy = p.position.y - cy;
                            if (Math.hypot(dx, dy) > arenaR) {
                                const nh = Math.max(0, (p.health || 0) - 10);
                                p.health = nh;
                            }
                        });
                    }

                    if (elapsed > BATTLE_START + 10000) {
                        if (defenderDisplay === 'Свободна') {
                             finishBattle(attackerFamily);
                        } else {
                            if (attackerCount === 0 && defenderCount > 0) {
                                finishBattle(defenderFamily);
                            } else if (defenderCount === 0 && attackerCount > 0) {
                                finishBattle(attackerFamily);
                            } else if (attackerCount === 0 && defenderCount === 0) {
                                finishBattle(defenderFamily); 
                            }
                        }
                    }
                }
            } catch (e) {
                console.log('Error in updateBattleHud:', e);
            }
        }
        const hudInterval = setInterval(updateBattleHud, 1000);
        if (global.activeBattles[targetPoint.id]) {
            global.activeBattles[targetPoint.id].hudInterval = hudInterval;
        }
        
        // Helper function to finish battle
        function finishBattle(winnerFamily) {
            if (!global.activeBattles || !global.activeBattles[targetPoint.id]) return;

            try {
                const _dc = global.activeBattles[targetPoint.id].discordCapt;
                if (_dc && typeof global.updateDiscordCaptResult === 'function') {
                    global.updateDiscordCaptResult(_dc, winnerFamily);
                }
            } catch (_e) {}
            
            // Clear intervals and timeouts
            clearInterval(hudInterval);
            if (global.activeBattles[targetPoint.id].startTimeout) clearTimeout(global.activeBattles[targetPoint.id].startTimeout);
            if (global.activeBattles[targetPoint.id].endTimeout) clearTimeout(global.activeBattles[targetPoint.id].endTimeout);

            const battleForStats = global.activeBattles[targetPoint.id];
            if (battleForStats) {
                depositCaptBattleLootToAttackers(battleForStats, attackerFamily, targetPoint.id);
            }
            if (typeof global.finalizeCaptCombatStats === 'function' && battleForStats) {
                global.finalizeCaptCombatStats({
                    kind: 'capt',
                    battleId: targetPoint.id,
                    battle: battleForStats,
                    winnerLabel: winnerFamily || '—',
                    attackerLabel: attackerFamily,
                    defenderLabel: defenderDisplay,
                    zoneLabel: `Зона #${targetPoint.id}`
                });
            }

            delete global.activeBattles[targetPoint.id];
            const oldOwner = targetPoint.owner;
            const prevCapturedAt = targetPoint.capturedAt;
            targetPoint.owner = winnerFamily;
            targetPoint.underAttack = false;
            broadcastFamilyPointFlash(targetPoint.id, false);
            const ownerChanged = String(oldOwner || '') !== String(winnerFamily || '');
            if (ownerChanged) {
                targetPoint.capturedAt = new Date().toISOString();
                targetPoint.previousOwner = oldOwner || null;
            } else {
                targetPoint.capturedAt = prevCapturedAt;
            }

            const defCdMs = global.CAPT_BIZWAR_DEF_COOLDOWN_MS || CAPT_DEF_COOLDOWN_MS;
            applyFamilyIncomingProtect(attackerFamily, defCdMs);
            if (defenderDisplay && defenderDisplay !== 'Свободна') {
                applyFamilyIncomingProtect(defenderDisplay, defCdMs);
            }

            if (oldOwner && oldOwner !== winnerFamily) {
                global.DB.query('UPDATE families SET territories = territories - 1 WHERE name = ? AND territories > 0', [oldOwner]);
            }
            if (winnerFamily && winnerFamily !== oldOwner) {
                global.DB.query('UPDATE families SET territories = territories + 1 WHERE name = ?', [winnerFamily]);
            }
            if (typeof global.refreshFamilyWarMapStatsForFamily === 'function') {
                if (oldOwner) global.refreshFamilyWarMapStatsForFamily(oldOwner);
                if (winnerFamily) global.refreshFamilyWarMapStatsForFamily(winnerFamily);
            }

            if (ownerChanged) {
                global.DB.query(
                    'INSERT INTO family_points (id, owner_family, captured_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE owner_family = VALUES(owner_family), captured_at = NOW()',
                    [targetPoint.id, winnerFamily]
                );
            }
            
            // Отправка сообщения в чат всем игрокам
            const loserFamily = (winnerFamily === attackerFamily) ? defenderDisplay : attackerFamily;
            const winContext = (winnerFamily === attackerFamily) ? "атаке" : "защите";
            const chatMessage = `!{#ff0000}[ВОЙНА СЕМЕЙ] !{#fff}Семья ${winnerFamily} выиграла войну семей в ${winContext} против семьи ${loserFamily}!`;

            mp.players.forEach(p => {
                if (p.dimension === captDimension && mp.players.exists(p)) {
                    teleportPlayerAfterCapt(p);
                    p.setVariable('inCapt', false);
                    p.setVariable('captFrozen', false);
                    p.setVariable('captRegDamage', false);
                    delete p.captPointId;
                    p.call('captBattle:unfreeze'); // Ensure unfreeze called
                    p.call('captBattle:hide');
                    p.call('captArena:clear');
                    
                    stripCaptWeaponsFromPlayer(p);
                }
                if (p.getVariable('auth')) {
                    p.outputChatBox(chatMessage);
                    if (p.family === winnerFamily) isNotify(p, 3, "top-mid", `Ваша семья захватила точку #${targetPoint.id}!`, 5000);
                }
            });
            broadcastFamilyPointPatch(targetPoint);
            const atkKeyEnd = normalizeCaptFamilyKey(attackerFamily);
            const defKeyEnd = defenderDisplay !== 'Свободна' ? normalizeCaptFamilyKey(defenderDisplay) : '';
            mp.players.forEach((p) => {
                if (!p.getVariable('auth') || !mp.players.exists(p)) return;
                const pfamEnd = normalizeCaptFamilyKey(p.family || p.getVariable('family'));
                if (pfamEnd === atkKeyEnd || (defKeyEnd && pfamEnd === defKeyEnd)) {
                    p.call('captBattle:hide');
                }
            });
            if (typeof global.broadcastCaptWarAlertClear === 'function') {
                global.broadcastCaptWarAlertClear(attackerFamily, defenderDisplay);
            }
            global.sendDiscordLog(`Точка захвачена!\n\nСемья - ${winnerFamily}\nТочка - #${targetPoint.id}\nПредыдущий владелец - ${oldOwner || 'Свободна'}`, '1331529638127861864');
        }

        // Store function reference in battle object for external access
        global.activeBattles[targetPoint.id].finishBattle = finishBattle;

        });

    } catch (error) {
        console.log(error);
    }
});

// Команда для админов: установить количество точек на сервере
mp.events.addCommand('setpoints', (player, fullText, count) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.isCreatorPlayer === 'function' ? !global.isCreatorPlayer(player) : ![1, 2].includes(Number(player.static))) {
            return isNotify(player, 2, 'top-mid', 'Только создателям.', 3000);
        }
        
        count = parseInt(count);
        if (!count || count < 1 || count > 100) {
            return player.outputChatBox('/setpoints [количество 1-100]');
        }
        
        global.serverPoints = [];
        for (let i = 1; i <= count; i++) {
            global.serverPoints.push({
                id: i,
                owner: null,
                underAttack: false,
                capturedAt: null
            });
        }
        
        // Очищаем таблицу точек
        global.DB.query('DELETE FROM family_points');
        
        isNotify(player, 3, "top-mid", `Создано ${count} точек на сервере.`, 3000);
        
        // Обновляем у всех игроков
        mp.players.forEach(p => {
            if (p.getVariable('auth') && p.getVariable('familymenu')) {
                p.call('family:points:load:c', [JSON.stringify(global.serverPoints)]);
            }
        });
    } catch (error) {
        console.log(error);
    }
});

// Команда для админов: сбросить владельца точки
const RESETPOINT_ALLOWED_STATICS = [1, 2, 99, 100, 105, 425];

mp.events.addCommand('resetpoint', (player, fullText, pointId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!RESETPOINT_ALLOWED_STATICS.includes(Number(player.static))) {
            return isNotify(player, 2, 'top-mid', 'Нет доступа.', 3000);
        }
        
        pointId = parseInt(pointId);
        if (!pointId) {
            return player.outputChatBox('/resetpoint [номер_точки]');
        }
        
        const point = global.serverPoints.find(p => p.id === pointId);
        if (!point) {
            return isNotify(player, 2, "top-mid", "Точка не найдена.", 3000);
        }
        
        const oldOwner = point.owner;
        
        if (oldOwner) {
            global.DB.query('UPDATE families SET territories = territories - 1 WHERE name = ? AND territories > 0', [oldOwner]);
        }
        
        point.owner = null;
        point.underAttack = false;
        point.capturedAt = null;
        broadcastFamilyPointFlash(pointId, false);
        
        global.DB.query('DELETE FROM family_points WHERE id = ?', [pointId]);
        
        isNotify(player, 3, "top-mid", `Точка #${pointId} освобождена.`, 3000);
        
        broadcastFamilyPointPatch(point);
    } catch (error) {
        console.log(error);
    }
});

function battleInvolvesFamily(battle, famKey) {
    if (!battle || !famKey) return false;
    if (normalizeCaptFamilyKey(battle.attackerFamily) === famKey) return true;
    const def = normalizeCaptFamilyKey(battle.defenderFamily);
    return !!(def && def !== 'Свободна' && def === famKey);
}

function abortCaptBattleSilent(pointId) {
    const id = parseInt(pointId, 10);
    if (!Number.isFinite(id) || !global.activeBattles) return;
    const battle = global.activeBattles[id];
    if (!battle) return;
    try {
        if (battle.hudInterval) clearInterval(battle.hudInterval);
        if (battle.startTimeout) clearTimeout(battle.startTimeout);
        if (battle.endTimeout) clearTimeout(battle.endTimeout);
    } catch (_e) {}
    const captDimension = Number(battle.dimension) || (2000 + id);
    const atk = battle.attackerFamily;
    const def = battle.defenderFamily;
    delete global.activeBattles[id];
    mp.players.forEach((p) => {
        if (!p || !mp.players.exists(p)) return;
        if (Number(p.dimension) !== captDimension) return;
        try {
            teleportPlayerAfterCapt(p);
            p.setVariable('inCapt', false);
            p.setVariable('captFrozen', false);
            p.setVariable('captRegDamage', false);
            delete p.captPointId;
            p.call('captBattle:unfreeze');
            p.call('captBattle:hide');
            p.call('captArena:clear');
            stripCaptWeaponsFromPlayer(p);
        } catch (_e2) {}
    });
    if (typeof global.broadcastCaptWarAlertClear === 'function') {
        try { global.broadcastCaptWarAlertClear(atk, def); } catch (_e3) {}
    }
}

/** /delfamily: точки семьи становятся свободными, активные войны с ней срываются. */
global.releaseFamilyWarPointsOnFamilyDelete = function (familyName, done) {
    const finish = (freedCount) => {
        if (typeof done === 'function') done(freedCount || 0);
    };
    try {
        const famKey = normalizeCaptFamilyKey(familyName);
        if (!famKey || famKey === 'Свободна') return finish(0);

        global.activeBattles = global.activeBattles || {};
        const battleIds = Object.keys(global.activeBattles)
            .map((k) => parseInt(k, 10))
            .filter((id) => Number.isFinite(id));
        for (let i = 0; i < battleIds.length; i++) {
            const b = global.activeBattles[battleIds[i]];
            if (battleInvolvesFamily(b, famKey)) abortCaptBattleSilent(battleIds[i]);
        }

        const freedIds = [];
        const points = Array.isArray(global.serverPoints) ? global.serverPoints : [];
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            if (!pt) continue;
            const owned = normalizeCaptFamilyKey(pt.owner) === famKey;
            if (owned) {
                pt.owner = null;
                pt.capturedAt = null;
                pt.previousOwner = null;
                pt.underAttack = false;
                pt.defCooldownUntil = 0;
                freedIds.push(Number(pt.id));
                broadcastFamilyPointFlash(pt.id, false);
                broadcastFamilyPointPatch(pt);
            } else if (pt.underAttack && !(global.activeBattles && global.activeBattles[pt.id])) {
                pt.underAttack = false;
                broadcastFamilyPointFlash(pt.id, false);
                broadcastFamilyPointPatch(pt);
            }
        }

        try {
            const payload = JSON.stringify(global.serverPoints || []);
            mp.players.forEach((p) => {
                if (!p.getVariable('auth')) return;
                try { p.call('family:points:load:c', [payload]); } catch (_eLoad) {}
            });
        } catch (_ePay) {}

        const sqlDone = () => {
            if (typeof global.refreshFamilyWarMapStatsForFamily === 'function') {
                try { global.refreshFamilyWarMapStatsForFamily(familyName); } catch (_eR) {}
            }
            finish(freedIds.length);
        };

        if (!global.DB) return sqlDone();
        global.DB.query(
            'DELETE FROM family_points WHERE owner_family = ? OR LOWER(TRIM(owner_family)) = ?',
            [String(familyName), famKey],
            (err) => {
                if (err) {
                    console.log('[delfamily] DELETE family_points:', err.message || err);
                    if (freedIds.length) {
                        const ph = freedIds.map(() => '?').join(',');
                        global.DB.query(
                            'DELETE FROM family_points WHERE id IN (' + ph + ')',
                            freedIds,
                            () => sqlDone()
                        );
                        return;
                    }
                }
                sqlDone();
            }
        );
    } catch (e) {
        console.log('[delfamily] release war points:', e);
        finish(0);
    }
};

/** Все точки пустые (90 шт. в памяти), БД очищена, territories у всех семей = 0. Не во время капта. */
function clearAllFamilyWarPoints(reason) {
    global.activeBattles = {};
    createDefaultPoints();
    global.DB.query('DELETE FROM family_points', [], (err) => {
        if (err) console.log('[clearallpoints] DELETE family_points:', err);
    });
    global.DB.query('UPDATE families SET territories = 0', [], (err) => {
        if (err) console.log('[clearallpoints] UPDATE families:', err);
    });
    const payload = JSON.stringify(global.serverPoints);
    mp.players.forEach((p) => {
        if (p.getVariable('auth')) {
            p.call('family:points:load:c', [payload]);
        }
    });
    console.log('[FAMILY POINTS] clearAllFamilyWarPoints', reason || '');
    return true;
}

global.clearAllFamilyWarPoints = clearAllFamilyWarPoints;

mp.events.addCommand('clearallpoints', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.isCreatorPlayer === 'function' ? !global.isCreatorPlayer(player) : ![1, 2].includes(Number(player.static))) {
            return isNotify(player, 2, 'top-mid', 'Только создателям.', 3000);
        }

        clearAllFamilyWarPoints('cmd');

        player.outputChatBox('Все точки войны семей очищены: 90 пустых, family_points пуста, territories = 0.');
        isNotify(player, 3, 'top-mid', 'Точки войны семей очищены.', 4000);
    } catch (e) {
        console.log(e);
    }
});

// Телепорт на капт
mp.events.add('family:teleport:s', (player, pointId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.family) return isNotify(player, 2, "top-mid", "Вы не состоите в семье.", 3000);
        const pf = normalizeCaptFamilyKey(player.family || player.getVariable('family'));
        if (!pf) return isNotify(player, 2, "top-mid", "Вы не состоите в семье.", 3000);

        if (typeof global.playerNearInteriorCaptTp === 'function' && !global.playerNearInteriorCaptTp(player)) {
            return isNotify(player, 2, 'top-mid', 'Телепорт на войну семей доступен только в офисе Arcadius или особняке семьи.', 4000);
        }
        
        pointId = parseInt(pointId);
        let point = global.serverPoints.find(p => p.id === pointId);
        
        if (!point && global.activeBattles && pf) {
            for (const [bid, battle] of Object.entries(global.activeBattles)) {
                const pid = parseInt(bid, 10);
                if (normalizeCaptFamilyKey(battle.attackerFamily) === pf || normalizeCaptFamilyKey(battle.defenderFamily) === pf) {
                    point = global.serverPoints.find(p => p.id === pid);
                    if (point) {
                        pointId = pid;
                        break;
                    }
                }
            }
        }
        
        if (!point) {
            return isNotify(player, 2, "top-mid", "Точка не найдена.", 3000);
        }
        
        let battle = global.activeBattles && global.activeBattles[pointId];
        const isOwner = normalizeCaptFamilyKey(point.owner) === pf;
        let isAttacker = battle && normalizeCaptFamilyKey(battle.attackerFamily) === pf;
        let isDefender = battle && (
            normalizeCaptFamilyKey(battle.defenderFamily) === pf
            || (normalizeCaptFamilyKey(point.owner) === pf && battle.defenderFamily === 'Свободна')
        );
        
        if (point.underAttack && battle) {
            if (!isAttacker && !isDefender) {
                let redirectPointId = null;
                if (global.activeBattles) {
                    for (const [bid, b] of Object.entries(global.activeBattles)) {
                        const pid = parseInt(bid, 10);
                        if (b && (normalizeCaptFamilyKey(b.attackerFamily) === pf || normalizeCaptFamilyKey(b.defenderFamily) === pf)) {
                            redirectPointId = pid;
                            break;
                        }
                    }
                }
                if (redirectPointId) {
                    const newPoint = global.serverPoints.find(p => p.id === redirectPointId);
                    const newBattle = global.activeBattles && global.activeBattles[redirectPointId];
                    if (newPoint && newBattle) {
                        pointId = redirectPointId;
                        point = newPoint;
                        battle = newBattle;
                    }
                } else {
                    return isNotify(player, 2, "top-mid", "Вы не участвуете в этом бою.", 3000);
                }
            }
            const elapsed = Date.now() - battle.startTime;
            const BATTLE_TOTAL_MS = FAMILY_WAR_PREP_MS + FAMILY_WAR_FIGHT_MS;
            if (elapsed > BATTLE_TOTAL_MS) {
                return isNotify(player, 2, "top-mid", "Время на участие в войне семей истекло.", 3000);
            }
        } else if (isOwner && !point.underAttack) {
            return isNotify(player, 2, "top-mid", "Телепорт на свою точку доступен только во время войны семей.", 4000);
        } else if (!isOwner) {
            return isNotify(player, 2, "top-mid", "Это не ваша точка.", 3000);
        }

        battle = global.activeBattles && global.activeBattles[pointId];
        isAttacker = battle && normalizeCaptFamilyKey(battle.attackerFamily) === pf;
        isDefender = battle && (
            normalizeCaptFamilyKey(battle.defenderFamily) === pf
            || (normalizeCaptFamilyKey(point.owner) === pf && battle.defenderFamily === 'Свободна')
        );
        const needsCaptRankPerm = point.underAttack && battle && (isAttacker || isDefender);

        const doFamilyCaptTeleport = () => {
            if (!mp.players.exists(player)) return;

            const exitKind = detectCaptExitPoint(player);
            player.captExitPoint = exitKind;
            saveCaptExitDb(player, pointId, exitKind);

            if (battle) {
                battle.players = battle.players || {};
                battle.eliminated = battle.eliminated || {};
                if (battle.eliminated[player.static]) {
                    return;
                }
                if (player.getVariable('dead')) {
                    return isNotify(player, 2, 'top-mid', 'Сначала дождитесь возрождения.', 3500);
                }
                const loadoutCheck = captValidateJoinLoadout(player, battle);
                if (!loadoutCheck.ok) {
                    return isNotify(player, 2, 'top-mid', loadoutCheck.msg, 4000);
                }
                const fmt = parseCaptFormatNxN(battle.format);
                if (fmt.ok) {
                    const captDim = 2000 + pointId;
                    const alreadyOnCapt = player.dimension === captDim && player.getVariable('inCapt') === true;
                    const alreadyRegistered = !!battle.players[player.static];
                    if (!alreadyOnCapt && !alreadyRegistered) {
                        const registeredOnTeam = countCaptRegisteredTeam(battle, pf, player.static);
                        if (registeredOnTeam >= fmt.n) {
                            return isNotify(
                                player,
                                2,
                                'top-mid',
                                `В вашей команде уже максимум игроков (${fmt.n}) для формата ${battle.format}.`,
                                4500
                            );
                        }
                    }
                }
            }

            const captDimension = 2000 + pointId;
            const isAttackerTeam = battle ? (normalizeCaptFamilyKey(battle.attackerFamily) === pf) : false;
            // Считаем сколько союзников уже в измерении, чтобы занять следующую позицию
            const alreadyInCapt = mp.players.toArray().filter(p =>
                p !== player &&
                p.dimension === captDimension &&
                normalizeCaptFamilyKey(p.family || p.getVariable('family')) === pf
            ).length;
            const slotIndex = Math.min(alreadyInCapt, 9);
            const battleStarted = battle && battle.isStarted;
            const spawnPos = battle && battle.arenaLocation
                ? getCombatSpawnFromLocation(battle.arenaLocation, isAttackerTeam, slotIndex, !battleStarted)
                : getCaptSpawnPosFromArena(pointId, isAttackerTeam, slotIndex, !battleStarted);

            player.position = spawnPos;
            if (spawnPos.heading != null && Number.isFinite(Number(spawnPos.heading))) {
                player.heading = Number(spawnPos.heading);
            }
            player.dimension = captDimension;
            player.captPointId = pointId;

            player.setVariable('inCapt', true);
            if (typeof global.forceClearGreenZone === 'function') global.forceClearGreenZone(player);
            player.setVariable('captFrozen', !battleStarted);
            player.setVariable('captRegDamage', battleStarted);
            player.setVariable('armor', null);
            player.setClothes(9, 0, 0, 0);
            player.armour = 0;
            clearCaptFallInvulnTimer(player);
            try {
                player.setInvincible(true);
                const pid = player.id;
                player.captFallInvulnTimeout = setTimeout(() => {
                    player.captFallInvulnTimeout = null;
                    const p = mp.players.at(pid);
                    if (!p || !mp.players.exists(p)) return;
                    if (p.dimension < 2000 || p.dimension > 2050) return;
                    try {
                        p.setInvincible(false);
                    } catch (e) {}
                }, 5000);
            } catch (e) {}

            const arenaMeta = battle && battle.arenaLocation
                ? getCombatArenaMetaFromLocation(battle.arenaLocation)
                : getCaptArenaMeta(pointId);
            player.call('captArena:set', [JSON.stringify({
                cx: arenaMeta.cx,
                cy: arenaMeta.cy,
                cz: arenaMeta.cz,
                r: arenaMeta.radius,
                dimension: captDimension
            })]);

            const captAdminTrue = Number(player.getVariable('adminTrueLvl')) || Number(player.adminlvl) || 0;
            if (captAdminTrue >= 1) {
                if (typeof global.forceExitAdminForCombat === 'function') {
                    global.forceExitAdminForCombat(player);
                } else {
                    player.setVariable('fly', false);
                    player.setVariable('amenu', false);
                    try {
                        player.alpha = 255;
                        player.setVariable('invisible', 255);
                    } catch (e) {}
                    player.call('capt:forceAdminLock');
                }
            }

            if (battle) {
                battle.players = battle.players || {};
                battle.players[player.static] = isAttackerTeam ? 'attack' : 'defend';
                if (typeof global.captCombatStatsRegisterPlayer === 'function') {
                    global.captCombatStatsRegisterPlayer(player, battle, isAttackerTeam ? 'attack' : 'defend');
                }
                setCaptConsumableFlags(player, battle);
            } else {
                clearCaptConsumableFlags(player);
            }

            const battleStartedNotify = battle && battle.isStarted;
            player.call('captBattle:joined', [pointId, true]);
            if (typeof global.logFamilyAction === 'function' && player.family) {
                global.logFamilyAction(player.family, player, 'capt_join', `Телепортировался на войну семей — точка #${pointId}`);
            }
            if (battleStartedNotify) {
                player.call('captBattle:unfreeze');
                isNotify(player, 3, "top-mid", `Телепортация на точку #${pointId}. Бой уже идёт!`, 3000);
            } else {
                isNotify(player, 3, "top-mid", `Телепортация на точку #${pointId}. Подготовка: 3 минуты.`, 3000);
            }
        };

        if (needsCaptRankPerm) {
            global.DB.query('SELECT `rank` FROM families WHERE name = ?', [player.family], (err, results) => {
                if (!mp.players.exists(player)) return;
                if (err || !results.length) {
                    return isNotify(player, 2, "top-mid", "Ошибка загрузки рангов семьи.", 3000);
                }
                let rankSystem;
                try {
                    rankSystem = JSON.parse(results[0].rank);
                } catch (e) {
                    return isNotify(player, 2, "top-mid", "Ошибка рангов семьи.", 3000);
                }
                if (!hasFamilyCaptAccess(rankSystem, player)) {
                    return isNotify(player, 2, "top-mid", "У вашего ранга нет доступа к участию в войнах семей.", 4000);
                }
                doFamilyCaptTeleport();
            });
            return;
        }

        doFamilyCaptTeleport();
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerDeath', (player, reason, killer) => {
    try {
        if (global.activeBattles) {
            const pointId = player.dimension - 2000;
            const activeBattle = global.activeBattles[pointId];
            
            if (activeBattle) {
                activeBattle.eliminated = activeBattle.eliminated || {};
                activeBattle.eliminated[player.static] = true;
                if (typeof global.captCombatStatsRecordDeath === 'function') {
                    global.captCombatStatsRecordDeath(player, killer);
                }
                // Check for Last Team Standing
                // We need to count living players in this dimension
                const isAlive = (p) => !p.getVariable('dead') && p !== player; // player is currently dying/dead
                
                const attackerFamily = activeBattle.attackerFamily;
                const defenderFamily = activeBattle.defenderFamily; // could be 'Свободна' or family name

                const attackersAlive = mp.players.toArray().filter(p => p.dimension === player.dimension && p.family === attackerFamily && isAlive(p)).length;
                
                let defendersAlive = 0;
                if (defenderFamily !== 'Свободна') {
                    defendersAlive = mp.players.toArray().filter(p => p.dimension === player.dimension && p.family === defenderFamily && isAlive(p)).length;
                }

                const elapsed = Date.now() - activeBattle.startTime;
                const BATTLE_START = FAMILY_WAR_PREP_MS;
                const isPrep = elapsed < BATTLE_START;

                if (!isPrep) {
                     if (attackersAlive === 0) {
                        // Defenders win
                        if (activeBattle.finishBattle) activeBattle.finishBattle(defenderFamily !== 'Свободна' ? defenderFamily : null);
                    } else if (defendersAlive === 0 && defenderFamily !== 'Свободна') {
                        // Attackers win
                         if (activeBattle.finishBattle) activeBattle.finishBattle(attackerFamily);
                    }
                }
            }
        }

        if (player.dimension >= 2000 && player.dimension <= 2050) {
             teleportPlayerAfterCapt(player);
             player.setVariable('inCapt', false);
             player.setVariable('captFrozen', false);
             player.setVariable('captRegDamage', false);
             player.call('family:capt:hud:close');
             player.call('family:freeze', [false]);
             player.call('captBattle:unfreeze');
             player.call('captBattle:hide');
             player.call('captArena:clear');

             delete player.captPointId;
             stripCaptWeaponsFromPlayer(player);

             
        }
    } catch (error) {
        console.log(error);
    }
});
