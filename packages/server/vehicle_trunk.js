'use strict';

const VEHICLE_TRUNK_SIZE = 30;
const trunkCache = new Map();
/** @type {Map<number, { trunkKey: string, vehId: number }>} */
const trunkViewers = new Map();

function ensureTrunkGrid(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    const out = new Array(VEHICLE_TRUNK_SIZE).fill(null);
    for (let i = 0; i < Math.min(arr.length, VEHICLE_TRUNK_SIZE); i++) {
        const cell = arr[i];
        out[i] = cell != null && String(cell).length ? String(cell) : null;
    }
    return out;
}

function trunkUsedCount(grid) {
    let n = 0;
    for (let i = 0; i < grid.length; i++) if (grid[i]) n++;
    return n;
}

function normalizeTrunkItem(raw) {
    if (raw == null) return '';
    return String(raw).split('(')[0].trim();
}

function parseTrunkStackEntry(entry) {
    const s = String(entry == null ? '' : entry).trim();
    const m = s.match(/^(.+?)\s*\((\d+)\)\s*$/);
    if (m) {
        const n = parseInt(m[2], 10);
        return { base: m[1].trim(), count: Number.isFinite(n) && n > 0 ? n : 0 };
    }
    if (!s) return { base: '', count: 0 };
    return { base: s, count: 1 };
}

function formatTrunkStackEntry(base, count) {
    if (!base || count < 1) return null;
    if (count === 1) return base;
    return `${base} (${count})`;
}

function isTrunkStackItem(baseName) {
    return baseName === 'item_spank' || baseName === 'item_alco' || baseName === 'Бронежилет' || baseName === 'Аптечка';
}

function trunkCellMatches(cell, normalizedBase, rawItem) {
    if (cell == null || cell === '') return false;
    const s = String(cell);
    const raw = String(rawItem || '').trim();
    if (raw && s === raw) return true;
    if (s === normalizedBase) return true;
    if (parseTrunkStackEntry(s).base === normalizedBase) return true;
    if (normalizedBase === 'item_bong' && s.startsWith('item_bong')) return true;
    if (normalizedBase === 'item_thermos' && s.startsWith('item_thermos')) return true;
    if (normalizedBase.startsWith('item_elfbar_') && s.startsWith(normalizedBase)) return true;
    return false;
}

function findTrunkEntryIndex(grid, normalizedItem, rawItem) {
    const base = normalizeTrunkItem(normalizedItem);
    if (!base) return -1;
    for (let i = 0; i < grid.length; i++) {
        if (trunkCellMatches(grid[i], base, rawItem)) return i;
    }
    return -1;
}

function trunkHasStackForBase(grid, baseName) {
    return findTrunkEntryIndex(grid, baseName, baseName) >= 0;
}

function addToTrunkStack(grid, baseName, qty, preferredSlot) {
    const idx = findTrunkEntryIndex(grid, baseName, baseName);
    if (idx >= 0) {
        const cur = parseTrunkStackEntry(grid[idx]);
        grid[idx] = formatTrunkStackEntry(baseName, cur.count + qty);
        return true;
    }
    const slot = Number.isInteger(preferredSlot) && preferredSlot >= 0 && preferredSlot < grid.length && !grid[preferredSlot]
        ? preferredSlot
        : grid.findIndex((c) => !c);
    if (slot < 0) return false;
    grid[slot] = formatTrunkStackEntry(baseName, qty);
    return true;
}

function placeTokenInTrunk(grid, token, preferredSlot) {
    if (Number.isInteger(preferredSlot) && preferredSlot >= 0 && preferredSlot < grid.length && !grid[preferredSlot]) {
        grid[preferredSlot] = token;
        return true;
    }
    const slot = grid.findIndex((c) => !c);
    if (slot < 0) return false;
    grid[slot] = token;
    return true;
}

function takeWholeTrunkItem(grid, normalizedItem, rawItem) {
    const idx = findTrunkEntryIndex(grid, normalizedItem, rawItem);
    if (idx < 0) return null;
    const token = grid[idx];
    grid[idx] = null;
    return token;
}

function countConsumableOnTrunk(grid, baseName) {
    let total = 0;
    if (!Array.isArray(grid)) return 0;
    for (let i = 0; i < grid.length; i++) {
        if (!grid[i]) continue;
        const p = parseTrunkStackEntry(grid[i]);
        if (p.base === baseName) total += p.count;
    }
    return total;
}

function removeTrunkStackQty(grid, baseName, qty, slotRaw) {
    const slot = parseInt(slotRaw, 10);
    let idx = -1;
    if (Number.isInteger(slot) && slot >= 0 && slot < grid.length && grid[slot]) {
        const atSlot = parseTrunkStackEntry(grid[slot]);
        if (atSlot.base === baseName && atSlot.count > 0) idx = slot;
    }
    if (idx < 0) idx = findTrunkEntryIndex(grid, baseName, baseName);
    if (idx < 0) return false;
    const cur = parseTrunkStackEntry(grid[idx]);
    if (cur.base !== baseName || cur.count < qty) return false;
    if (cur.count === qty) grid[idx] = null;
    else grid[idx] = formatTrunkStackEntry(baseName, cur.count - qty);
    return true;
}

function itemNotAllowedInVehicleTrunk(item) {
    const itemName = normalizeTrunkItem(item);
    if (!itemName) return 'Некорректный предмет.';
    const fix = global.formweap ? global.formweap(itemName) : itemName;
    if (fix === 'Revolver') return 'Базовый револьвер нельзя переложить.';
    if (fix === 'Musket') return 'Это оружие нельзя класть в багажник.';
    if (itemName === 'item_materials') return 'Материалы нельзя класть в багажник.';
    if (itemName === 'item_kontrabanda') return 'Посылку нельзя класть в багажник.';
    return null;
}

function formatTrunkLogItem(item, qty) {
    const base = normalizeTrunkItem(item);
    if (base === 'item_spank') return qty > 1 ? `x${qty} Spank` : 'Spank';
    if (base === 'item_alco') return qty > 1 ? `x${qty} Медовуха` : 'Медовуха';
    if (qty > 1) return `x${qty} ${base}`;
    return base || String(item);
}

function serverPlayerVehicleDistance(player, vehicle) {
    if (!player || !vehicle || !player.position || !vehicle.position) return 1e9;
    return player.dist(vehicle.position);
}

function resolveVehicleMenuDisplayName(vehicle, meta) {
    let model = '';
    if (vehicle && mp.vehicles.exists(vehicle)) {
        model = String(vehicle.getVariable('carModel') || '').trim();
    }
    if (!model && meta && meta.model) model = String(meta.model).trim();
    if (typeof global.getVehicleDisplayName === 'function') {
        return global.getVehicleDisplayName(model);
    }
    return model || 'Транспорт';
}

function resolveVehicleTrunkMeta(vehicle) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return null;

    if (vehicle.getVariable('fractioncar') === true) {
        const fid = parseInt(vehicle.getVariable('fraction'), 10) || 0;
        const plate = String(vehicle.getVariable('startnumber') || vehicle.numberPlate || '').trim();
        const idx = parseInt(vehicle.getVariable('fractionCarIndex'), 10) || 0;
        if (!fid || !plate) return null;
        return {
            kind: 'fraction',
            trunkKey: `f:${fid}:${plate}`,
            logCarLabel: idx > 0 ? `Машину #${idx}` : `Машину (${plate})`,
            logCarLabelFrom: idx > 0 ? `Машины #${idx}` : `Машины (${plate})`,
            fractionId: fid,
            carIndex: idx
        };
    }

    if (vehicle.getVariable('familyGarage') === true) {
        const familyId = parseInt(vehicle.getVariable('familyId'), 10) || 0;
        const slot = parseInt(vehicle.getVariable('familyVehSlot'), 10) || 0;
        if (!familyId || !slot) return null;
        return {
            kind: 'family',
            trunkKey: `fam:${familyId}:${slot}`,
            logCarLabel: `Машину #${slot}`,
            logCarLabelFrom: `Машины #${slot}`,
            familyId,
            slot,
            model: String(vehicle.getVariable('carModel') || '').trim()
        };
    }

    const owner = parseInt(vehicle.getVariable('owner'), 10) || 0;
    if (owner > 0 && vehicle.getVariable('rent') !== true && vehicle.getVariable('adminveh') !== true) {
        const model = String(vehicle.getVariable('carModel') || '').trim();
        const uid = String(vehicle.getVariable('carId') || '').trim();
        const trunkKey = uid ? `p:${owner}:${uid}` : `p:${owner}:${model.toLowerCase()}`;
        return {
            kind: 'personal',
            trunkKey,
            logCarLabel: model || 'Машины',
            ownerStatic: owner,
            model,
            uid
        };
    }

    return null;
}

function canAccessVehicleTrunk(player, meta, vehicle) {
    if (!meta) return { ok: false, msg: 'У этого транспорта нет багажника.' };
    if (!mp.players.exists(player) || !vehicle || !mp.vehicles.exists(vehicle)) {
        return { ok: false, msg: 'Транспорт недоступен.' };
    }
    if (serverPlayerVehicleDistance(player, vehicle) > 5) {
        return { ok: false, msg: 'Подойдите ближе к транспорту.' };
    }
    if (meta.kind === 'personal') {
        if (parseInt(player.static, 10) !== meta.ownerStatic) {
            return { ok: false, msg: 'Это не ваш транспорт.' };
        }
        return { ok: true };
    }
    if (meta.kind === 'fraction') {
        const pf = parseInt(player.getVariable('fraction'), 10) || 0;
        if (pf !== meta.fractionId) return { ok: false, msg: 'Это транспорт другой фракции.' };
        return { ok: true };
    }
    if (meta.kind === 'family') {
        const fid = Number(player.familyID) || 0;
        if (!player.family || fid !== meta.familyId) {
            return { ok: false, msg: 'Это семейный транспорт другой семьи.' };
        }
        return { ok: true };
    }
    return { ok: false, msg: 'Нет доступа к багажнику.' };
}

function canToggleVehicleLock(player, meta, vehicle) {
    return canAccessVehicleTrunk(player, meta, vehicle);
}

function canSellPersonalVehicle(player, meta, vehicle) {
    if (!meta || meta.kind !== 'personal') return { ok: false, msg: 'Этот транспорт нельзя продать.' };
    if (parseInt(player.static, 10) !== meta.ownerStatic) {
        return { ok: false, msg: 'Продать можно только свой транспорт.' };
    }
    if (vehicle.getVariable('rent') === true) {
        return { ok: false, msg: 'Нельзя продать арендованный транспорт.' };
    }
    if (vehicle.getVariable('adminveh') === true) {
        return { ok: false, msg: 'Нельзя продать админский транспорт.' };
    }
    const price = typeof global.getVehicleSvalkaSellPrice === 'function'
        ? global.getVehicleSvalkaSellPrice(meta.model)
        : null;
    if (price == null || price <= 0) {
        return { ok: false, msg: 'Этот транспорт нельзя продать.' };
    }
    return { ok: true, price, model: meta.model, uid: meta.uid };
}

function vehicleMatchesClientNetId(veh, clientRid) {
    if (!veh || !mp.vehicles.exists(veh)) return false;
    const rid = parseInt(String(clientRid), 10);
    if (!Number.isFinite(rid) || rid < 0) return false;
    if (typeof veh.id === 'number' && veh.id === rid) return true;
    if (typeof veh.remoteId === 'number' && veh.remoteId === rid) return true;
    return false;
}

function vehicleMatchesAnyClientNetId(veh, rawA, rawB) {
    if (vehicleMatchesClientNetId(veh, rawA)) return true;
    if (rawB !== undefined && rawB !== null && String(rawB) !== String(rawA)) {
        if (vehicleMatchesClientNetId(veh, rawB)) return true;
    }
    return false;
}

function resolveVehicleFromClient(player, clientRemoteIdRaw, clientAltIdRaw) {
    if (!mp.players.exists(player)) return null;
    const dim = Number(player.dimension);
    const tryIds = [];
    const a = parseInt(String(clientRemoteIdRaw), 10);
    const b = parseInt(String(clientAltIdRaw), 10);
    if (Number.isFinite(a) && a >= 0) tryIds.push(a);
    if (Number.isFinite(b) && b >= 0 && tryIds.indexOf(b) === -1) tryIds.push(b);

    for (let i = 0; i < tryIds.length; i++) {
        try {
            const at = mp.vehicles.at(tryIds[i]);
            if (!at || !mp.vehicles.exists(at) || at.getVariable('deleted')) continue;
            if (Number(at.dimension) !== dim) continue;
            if (vehicleMatchesAnyClientNetId(at, clientRemoteIdRaw, clientAltIdRaw)) return at;
        } catch (_eAt) {}
    }

    let found = null;
    try {
        mp.vehicles.forEach((veh) => {
            if (found || !veh || !mp.vehicles.exists(veh) || veh.getVariable('deleted')) return;
            if (Number(veh.dimension) !== dim) return;
            if (vehicleMatchesAnyClientNetId(veh, clientRemoteIdRaw, clientAltIdRaw)) found = veh;
        });
    } catch (_eScan) {}
    return found;
}

function getVehicleByServerId(vehId) {
    const id = parseInt(vehId, 10);
    if (!Number.isFinite(id)) return null;
    try {
        const veh = mp.vehicles.at(id);
        if (veh && mp.vehicles.exists(veh) && !veh.getVariable('deleted')) return veh;
    } catch (_e) {}
    return null;
}

function vehicleSeatTaken(vehicle, seat) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return true;
    try {
        const occ = vehicle.getOccupant(seat);
        if (occ && mp.players.exists(occ)) return true;
    } catch (_e) {}
    if (seat === 0 || seat === -1) {
        try {
            const d0 = vehicle.getOccupant(0);
            const dm1 = vehicle.getOccupant(-1);
            if ((d0 && mp.players.exists(d0)) || (dm1 && mp.players.exists(dm1))) return true;
        } catch (_e2) {}
    }
    return false;
}

function findFreeVehicleSeat(vehicle) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return null;
    const occupied = new Set();
    try {
        const list = vehicle.getOccupants();
        if (Array.isArray(list)) {
            for (let i = 0; i < list.length; i++) {
                const p = list[i];
                if (!p || !mp.players.exists(p)) continue;
                try {
                    const s = p.seat;
                    if (Number.isInteger(s)) occupied.add(s);
                } catch (_e) {}
            }
        }
    } catch (_e2) {}
    const seats = [0, 1, 2, 3, 4, 5, 6, 7];
    for (let i = 0; i < seats.length; i++) {
        const seat = seats[i];
        if (occupied.has(seat)) continue;
        if (vehicleSeatTaken(vehicle, seat)) continue;
        return seat;
    }
    return null;
}

function trySeatPlayerInVehicle(player, vehicle) {
    if (!mp.players.exists(player) || !vehicle || !mp.vehicles.exists(vehicle)) return false;
    const order = [];
    const preferred = findFreeVehicleSeat(vehicle);
    if (preferred != null) order.push(preferred);
    [0, 1, 2, 3, 4, 5, 6, 7, -1].forEach((s) => {
        if (order.indexOf(s) === -1) order.push(s);
    });
    for (let i = 0; i < order.length; i++) {
        const seat = order[i];
        if (vehicleSeatTaken(vehicle, seat)) continue;
        try {
            player.putIntoVehicle(vehicle, seat);
            return true;
        } catch (_e) {}
    }
    return false;
}

function loadTrunkGrid(trunkKey, cb) {
    const key = String(trunkKey || '').trim();
    if (!key) return cb(new Error('empty key'));
    if (trunkCache.has(key)) return cb(null, trunkCache.get(key).grid.slice());
    if (!global.DB) {
        const grid = ensureTrunkGrid([]);
        trunkCache.set(key, { grid, dirty: false });
        return cb(null, grid.slice());
    }
    global.DB.query('SELECT items_json FROM vehicle_trunks WHERE trunk_key = ? LIMIT 1', [key], (err, rows) => {
        let grid = ensureTrunkGrid([]);
        if (!err && rows && rows[0] && rows[0].items_json) {
            try { grid = ensureTrunkGrid(JSON.parse(rows[0].items_json)); } catch (_e) {}
        }
        trunkCache.set(key, { grid, dirty: false });
        cb(null, grid.slice());
    });
}

function persistTrunkGrid(trunkKey, grid, cb) {
    const key = String(trunkKey || '').trim();
    if (!key) return cb && cb(new Error('empty key'));
    const normalized = ensureTrunkGrid(grid);
    trunkCache.set(key, { grid: normalized, dirty: false });
    if (!global.DB) return cb && cb(null);
    const json = JSON.stringify(normalized);
    global.DB.query(
        'INSERT INTO vehicle_trunks (trunk_key, items_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE items_json = VALUES(items_json)',
        [key, json],
        (err) => { if (cb) cb(err); }
    );
}

function logTrunkAction(meta, player, actionType, text) {
    if (!meta || !text) return;
    if (meta.kind === 'fraction' && typeof global.logFractionAction === 'function') {
        global.logFractionAction(meta.fractionId, player, actionType, text);
    } else if (meta.kind === 'family' && player && player.family && typeof global.logFamilyAction === 'function') {
        global.logFamilyAction(player.family, player, actionType, text);
    }
}

function trunkPayload(grid) {
    return JSON.stringify({ items: grid, capacity: VEHICLE_TRUNK_SIZE });
}

function refreshVehicleTrunkUI(player, grid) {
    if (!mp.players.exists(player)) return;
    if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) return;
    player.call('vehicleTrunk:update:c', [
        JSON.stringify(player.inventory),
        JSON.stringify(player.fastSlots),
        trunkPayload(grid)
    ]);
}

function openVehicleTrunkUI(player, vehicle, meta, grid) {
    if (!mp.players.exists(player)) return;
    if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
        if (typeof global.loadInventory === 'function') global.loadInventory(player);
        return isNotify(player, 1, 'top-mid', 'Подождите загрузки инвентаря и повторите.', 3000);
    }
    player._vehicleTrunkView = { trunkKey: meta.trunkKey, vehId: vehicle.id };
    trunkViewers.set(player.id, { trunkKey: meta.trunkKey, vehId: vehicle.id });
    player.call('vehicleTrunk:open:c', [
        JSON.stringify(player.inventory),
        JSON.stringify(player.fastSlots),
        trunkPayload(grid)
    ]);
}

function closeVehicleTrunkView(player) {
    if (!player) return;
    delete player._vehicleTrunkView;
    trunkViewers.delete(player.id);
}

function withActiveTrunk(player, cb) {
    const sess = player._vehicleTrunkView;
    if (!sess || !sess.trunkKey) {
        return isNotify(player, 2, 'top-mid', 'Багажник не открыт.', 3000);
    }
    const vehicle = getVehicleByServerId(sess.vehId);
    if (!vehicle) {
        closeVehicleTrunkView(player);
        return isNotify(player, 2, 'top-mid', 'Транспорт недоступен.', 3000);
    }
    const meta = resolveVehicleTrunkMeta(vehicle);
    const access = canAccessVehicleTrunk(player, meta, vehicle);
    if (!access.ok) return isNotify(player, 2, 'top-mid', access.msg, 3000);
    if (meta.trunkKey !== sess.trunkKey) {
        closeVehicleTrunkView(player);
        return isNotify(player, 2, 'top-mid', 'Багажник закрыт.', 3000);
    }
    loadTrunkGrid(meta.trunkKey, (err, grid) => {
        if (err) return isNotify(player, 2, 'top-mid', 'Ошибка загрузки багажника.', 3000);
        cb(meta, vehicle, grid);
    });
}

function ensureVehicleTrunksTable(cb) {
    if (!global.DB) return cb && cb();
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS vehicle_trunks (
            trunk_key VARCHAR(96) NOT NULL PRIMARY KEY,
            items_json LONGTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        [],
        () => { if (cb) cb(); }
    );
}

mp.events.add('packagesLoaded', () => {
    ensureVehicleTrunksTable();
});

function takeWholeTrunkItemFromPlayerSlot(player, normalizedItem, rawItem, slotIndex) {
    if (!mp.players.exists(player)) return null;
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];
    if (Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < player.inventory.length) {
        if (!trunkCellMatches(player.inventory[slotIndex], normalizedItem, rawItem)) return null;
        const token = String(player.inventory[slotIndex]);
        player.inventory[slotIndex] = null;
        return token;
    }
    for (let i = 0; i < player.inventory.length; i++) {
        if (!trunkCellMatches(player.inventory[i], normalizedItem, rawItem)) continue;
        const token = String(player.inventory[i]);
        player.inventory[i] = null;
        return token;
    }
    for (let s = 0; s < player.fastSlots.length; s++) {
        if (!trunkCellMatches(player.fastSlots[s], normalizedItem, rawItem)) continue;
        const token = String(player.fastSlots[s]);
        player.fastSlots[s] = '';
        return token;
    }
    return null;
}

function countConsumableOnPlayerTrunk(player, baseName) {
    let total = 0;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    for (let i = 0; i < inv.length; i++) {
        if (!inv[i]) continue;
        const p = parseTrunkStackEntry(inv[i]);
        if (p.base === baseName) total += p.count;
    }
    const fs = Array.isArray(player.fastSlots) ? player.fastSlots : [];
    for (let s = 0; s < fs.length; s++) {
        if (!fs[s]) continue;
        const p = parseTrunkStackEntry(fs[s]);
        if (p.base === baseName) total += p.count;
    }
    return total;
}

function removeConsumableQtyFromPlayerTrunkSlot(player, baseName, qty, slotIndex) {
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return false;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    if (slotIndex >= inv.length || !inv[slotIndex]) return false;
    const p = parseTrunkStackEntry(inv[slotIndex]);
    if (p.base !== baseName || p.count < qty) return false;
    if (p.count === qty) inv[slotIndex] = null;
    else inv[slotIndex] = formatTrunkStackEntry(baseName, p.count - qty);
    return true;
}

function removeConsumableQtyFromPlayerTrunk(player, baseName, qty) {
    let left = qty;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    for (let i = 0; i < inv.length && left > 0; i++) {
        if (!inv[i]) continue;
        const p = parseTrunkStackEntry(inv[i]);
        if (p.base !== baseName) continue;
        const take = Math.min(left, p.count);
        left -= take;
        if (p.count === take) inv[i] = null;
        else inv[i] = formatTrunkStackEntry(baseName, p.count - take);
    }
    const fs = Array.isArray(player.fastSlots) ? player.fastSlots : [];
    for (let s = 0; s < fs.length && left > 0; s++) {
        if (!fs[s]) continue;
        const p = parseTrunkStackEntry(fs[s]);
        if (p.base !== baseName) continue;
        const take = Math.min(left, p.count);
        left -= take;
        if (p.count === take) fs[s] = '';
        else fs[s] = formatTrunkStackEntry(baseName, p.count - take);
    }
    return left <= 0;
}

function addConsumableQtyToPlayerTrunk(player, baseName, qty, preferredSlot) {
    if (!mp.players.exists(player) || qty < 1) return false;
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    let left = qty;
    const ps = parseInt(preferredSlot, 10);
    if (Number.isInteger(ps) && ps >= 0 && ps < player.inventory.length) {
        const cell = player.inventory[ps];
        if (cell == null || cell === '') {
            player.inventory[ps] = formatTrunkStackEntry(baseName, left);
            return true;
        }
        const atSlot = parseTrunkStackEntry(cell);
        if (atSlot.base === baseName) {
            player.inventory[ps] = formatTrunkStackEntry(baseName, atSlot.count + left);
            return true;
        }
    }
    for (let i = 0; i < player.inventory.length && left > 0; i++) {
        const atCell = parseTrunkStackEntry(player.inventory[i]);
        if (atCell.base !== baseName) continue;
        player.inventory[i] = formatTrunkStackEntry(baseName, atCell.count + left);
        left = 0;
        break;
    }
    if (left > 0) {
        if (typeof global.mergeConsumableQtyIntoGrid === 'function') {
            return global.mergeConsumableQtyIntoGrid(player, baseName, left);
        }
        if (typeof global.invGridTryPush === 'function') {
            return global.invGridTryPush(player, formatTrunkStackEntry(baseName, left));
        }
        return false;
    }
    return true;
}

mp.events.add('target:vehicle:open:s', (player, vehRemoteId, vehAltId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const vehicle = resolveVehicleFromClient(player, vehRemoteId, vehAltId);
        if (!vehicle) return isNotify(player, 2, 'top-mid', 'Транспорт не найден.', 3000);
        if (serverPlayerVehicleDistance(player, vehicle) > 5) {
            return isNotify(player, 2, 'top-mid', 'Подойдите ближе к транспорту.', 3000);
        }
        const meta = resolveVehicleTrunkMeta(vehicle);
        const locked = !!vehicle.locked;
        const sell = canSellPersonalVehicle(player, meta, vehicle);
        const displayName = resolveVehicleMenuDisplayName(vehicle, meta);
        player.call('target:vehicle:open:c', [
            vehRemoteId,
            displayName.replace(/'/g, ''),
            locked ? 1 : 0,
            sell.ok ? 1 : 0,
            sell.ok ? sell.price : 0,
            meta ? 1 : 0
        ]);
    } catch (e) {
        console.log('[vehicle_trunk] target:vehicle:open:s', e.message || e);
    }
});

mp.events.add('target:vehicle:lock:s', (player, vehRemoteId, vehAltId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (new Date().getTime() - (player.clicked || 0) < 500) {
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        }
        player.clicked = new Date().getTime();
        const vehicle = resolveVehicleFromClient(player, vehRemoteId, vehAltId);
        if (!vehicle) return isNotify(player, 2, 'top-mid', 'Транспорт не найден.', 3000);
        const meta = resolveVehicleTrunkMeta(vehicle);
        const access = canToggleVehicleLock(player, meta, vehicle);
        if (!access.ok) return isNotify(player, 2, 'top-mid', access.msg, 3000);
        vehicle.locked = !vehicle.locked;
        isNotify(player, 3, 'top-mid', vehicle.locked ? 'Транспорт закрыт.' : 'Транспорт открыт.', 2500);
        player.call('target:vehicle:lock:c', [vehicle.locked ? 1 : 0]);
    } catch (e) {
        console.log('[vehicle_trunk] target:vehicle:lock:s', e.message || e);
    }
});

mp.events.add('target:vehicle:sit:s', (player, vehRemoteId, vehAltId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.vehicle) return isNotify(player, 2, 'top-mid', 'Вы уже в транспорте.', 3000);
        const vehicle = resolveVehicleFromClient(player, vehRemoteId, vehAltId);
        if (!vehicle) return isNotify(player, 2, 'top-mid', 'Транспорт не найден.', 3000);
        if (serverPlayerVehicleDistance(player, vehicle) > 5) {
            return isNotify(player, 2, 'top-mid', 'Подойдите ближе к транспорту.', 3000);
        }
        if (vehicle.locked) return isNotify(player, 2, 'top-mid', 'Транспорт закрыт.', 3000);
        if (trySeatPlayerInVehicle(player, vehicle)) return;
        try {
            player.call('target:vehicle:sit:c', [Number(vehRemoteId) || 0, Number(vehAltId) || -1]);
        } catch (_eCall) {
            isNotify(player, 2, 'top-mid', 'Нет свободных мест.', 3000);
        }
    } catch (e) {
        console.log('[vehicle_trunk] target:vehicle:sit:s', e.message || e);
    }
});

mp.events.add('target:vehicle:sell:s', (player, vehRemoteId, vehAltId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const vehicle = resolveVehicleFromClient(player, vehRemoteId, vehAltId);
        if (!vehicle) return isNotify(player, 2, 'top-mid', 'Транспорт не найден.', 3000);
        const meta = resolveVehicleTrunkMeta(vehicle);
        const sell = canSellPersonalVehicle(player, meta, vehicle);
        if (!sell.ok) return isNotify(player, 2, 'top-mid', sell.msg, 3000);
        const displayName = resolveVehicleMenuDisplayName(vehicle, meta);
        player.call('target:vehicle:sell:c', [displayName.replace(/'/g, ''), global.formatnum1(sell.price)]);
    } catch (e) {
        console.log('[vehicle_trunk] target:vehicle:sell:s', e.message || e);
    }
});

mp.events.add('target:vehicle:sell:yes:s', (player, vehRemoteId, vehAltId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.dimension !== 0) return;
        if (new Date().getTime() - (player.clicked || 0) < 1000) {
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        }
        player.clicked = new Date().getTime();

        const vehicle = resolveVehicleFromClient(player, vehRemoteId, vehAltId);
        if (!vehicle) return isNotify(player, 2, 'top-mid', 'Транспорт не найден.', 3000);
        const meta = resolveVehicleTrunkMeta(vehicle);
        const sell = canSellPersonalVehicle(player, meta, vehicle);
        if (!sell.ok) return isNotify(player, 2, 'top-mid', sell.msg, 3000);

        global.queryAccountCarsRaw(player.static, player, (err, carsRaw) => {
            if (err) return console.log(err);
            if (carsRaw == null) return;
            let carsNorm;
            try {
                carsNorm = global.normalizeCarsArray(JSON.parse(carsRaw || '[]'));
            } catch (_e) {
                carsNorm = [];
            }

            let removed = false;
            if (sell.uid && typeof global.findCarEntry === 'function') {
                const entry = global.findCarEntry(carsNorm, sell.model, sell.uid);
                if (entry) {
                    const idx = carsNorm.indexOf(entry);
                    if (idx >= 0) {
                        carsNorm.splice(idx, 1);
                        removed = true;
                    }
                }
            }
            if (!removed && !global.carsListHasModel(carsNorm, sell.model)) {
                return isNotify(player, 2, 'top-mid', 'У вас нет этого транспорта.', 3000);
            }
            if (!removed) {
                const idx = carsNorm.findIndex((e) => String(e.m).toLowerCase() === String(sell.model).toLowerCase());
                if (idx >= 0) carsNorm.splice(idx, 1);
            }

            const updatedCars = global.serializeCarsForDb(carsNorm);
            global.DB.query('UPDATE accounts SET money = money + ?, cars = ? WHERE static = ?', [sell.price, updatedCars, player.static], (err2) => {
                if (err2) return console.log(err2);
                try { player.cars = updatedCars; } catch (_eCars) {}
                if (typeof global.seedAccountCarsCache === 'function') {
                    global.seedAccountCarsCache(player.static, updatedCars);
                }
                player.money = parseInt(player.money, 10) + sell.price;
                player.call('updateMoney', [global.formatnum1(player.money)]);
                player.call('carsLoad:CLIENT', [global.carsPayloadForClient(updatedCars)]);
                if (typeof global.pushMenuAccountProfile === 'function') {
                    try { global.pushMenuAccountProfile(player); } catch (_eProf) {}
                }
                if (meta && meta.trunkKey) {
                    global.DB.query('DELETE FROM vehicle_trunks WHERE trunk_key = ?', [meta.trunkKey], () => {});
                    trunkCache.delete(meta.trunkKey);
                }
                isNotify(player, 3, 'top-mid', `+${global.formatnum1(sell.price)}$`, 3000);
                player.call('target:vehicle:sell:done:c');
                if (vehicle && mp.vehicles.exists(vehicle)) {
                    if (player.carActive === vehicle) player.carActive = null;
                    if (typeof global.deleteVeh === 'function') global.deleteVeh(vehicle);
                    else vehicle.destroy();
                }
            });
        });
    } catch (e) {
        console.log('[vehicle_trunk] target:vehicle:sell:yes:s', e.message || e);
    }
});

mp.events.add('vehicle:trunk:open:s', (player, vehRemoteId, vehAltId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const vehicle = resolveVehicleFromClient(player, vehRemoteId, vehAltId);
        if (!vehicle) return isNotify(player, 2, 'top-mid', 'Транспорт не найден.', 3000);
        const meta = resolveVehicleTrunkMeta(vehicle);
        const access = canAccessVehicleTrunk(player, meta, vehicle);
        if (!access.ok) return isNotify(player, 2, 'top-mid', access.msg, 3000);
        loadTrunkGrid(meta.trunkKey, (err, grid) => {
            if (err) return isNotify(player, 2, 'top-mid', 'Ошибка загрузки багажника.', 3000);
            openVehicleTrunkUI(player, vehicle, meta, grid);
        });
    } catch (e) {
        console.log('[vehicle_trunk] vehicle:trunk:open:s', e.message || e);
    }
});

mp.events.add('vehicle:trunk:close:s', (player) => {
    closeVehicleTrunkView(player);
});

mp.events.add('vehicle:trunk:deposit:s', (player, rawItem, rawQty, rawSlot, rawToSlot) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        withActiveTrunk(player, (meta, vehicle, grid) => {
            const rawItemFull = String(rawItem == null ? '' : rawItem).trim();
            const item = normalizeTrunkItem(rawItemFull);
            const deny = itemNotAllowedInVehicleTrunk(item);
            if (deny) return isNotify(player, 2, 'top-mid', deny, 3500);
            const slotIndex = parseInt(rawSlot, 10);
            const hasSlotIndex = Number.isInteger(slotIndex) && slotIndex >= 0;
            const toSlotIndex = parseInt(rawToSlot, 10);
            const hasToSlot = Number.isInteger(toSlotIndex) && toSlotIndex >= 0;
            if (
                !hasSlotIndex &&
                typeof global.inventoryItemIsBlockedForTransfer === 'function' &&
                global.inventoryItemIsBlockedForTransfer(player, rawItemFull || item)
            ) {
                return isNotify(player, 2, 'top-mid', 'Снимите предмет с экипировки или из быстрого слота.', 4500);
            }
            if (!Array.isArray(player.inventory) || !Array.isArray(player.fastSlots)) {
                if (typeof global.loadInventory === 'function') global.loadInventory(player);
                return isNotify(player, 1, 'top-mid', 'Подождите загрузки инвентаря.', 3000);
            }
            const qtyParsed = parseInt(String(rawQty == null ? '1' : rawQty).replace(/[^\d-]/g, ''), 10);
            let qtyWant = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 1;
            const stackMode = isTrunkStackItem(item);
            if (qtyParsed === -1 && stackMode) {
                if (hasSlotIndex) {
                    qtyWant = Math.max(1, parseTrunkStackEntry(player.inventory[slotIndex]).count || 1);
                } else {
                    qtyWant = Math.max(1, countConsumableOnPlayerTrunk(player, item) || 1);
                }
            }
            const depositQty = stackMode ? qtyWant : 1;
            const preferred = hasToSlot ? toSlotIndex : -1;

            if (stackMode) {
                const have = hasSlotIndex
                    ? parseTrunkStackEntry(player.inventory[slotIndex]).count
                    : countConsumableOnPlayerTrunk(player, item);
                if (have < depositQty) return isNotify(player, 2, 'top-mid', 'Недостаточно предметов.', 3000);
                if (!trunkHasStackForBase(grid, item) && trunkUsedCount(grid) >= VEHICLE_TRUNK_SIZE) {
                    return isNotify(player, 2, 'top-mid', 'Багажник переполнен.', 3000);
                }
                const removed = hasSlotIndex
                    ? removeConsumableQtyFromPlayerTrunkSlot(player, item, depositQty, slotIndex)
                    : removeConsumableQtyFromPlayerTrunk(player, item, depositQty);
                if (!removed) return isNotify(player, 2, 'top-mid', 'Предмет не найден.', 3000);
                if (!addToTrunkStack(grid, item, depositQty, preferred)) {
                    if (hasSlotIndex) addConsumableQtyToPlayerTrunk(player, item, depositQty, slotIndex);
                    else addConsumableQtyToPlayerTrunk(player, item, depositQty);
                    return isNotify(player, 2, 'top-mid', 'Багажник переполнен.', 3000);
                }
            } else {
                if (trunkUsedCount(grid) >= VEHICLE_TRUNK_SIZE) {
                    return isNotify(player, 2, 'top-mid', 'Багажник переполнен.', 3000);
                }
                const removedToken = takeWholeTrunkItemFromPlayerSlot(player, item, rawItemFull, hasSlotIndex ? slotIndex : -1);
                if (!removedToken) return isNotify(player, 2, 'top-mid', 'Предмет не найден.', 3000);
                if (!placeTokenInTrunk(grid, removedToken, preferred)) {
                    if (typeof global.invGridTryPush === 'function') global.invGridTryPush(player, removedToken);
                    return isNotify(player, 2, 'top-mid', 'Багажник переполнен.', 3000);
                }
            }

            if (typeof global.saveInventory === 'function') global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            persistTrunkGrid(meta.trunkKey, grid, () => {});
            if (meta.kind !== 'personal') {
                logTrunkAction(meta, player, 'trunk_deposit',
                    `Положил в ${meta.logCarLabel}: ${formatTrunkLogItem(item, stackMode ? depositQty : 1)}`);
            }
            refreshVehicleTrunkUI(player, grid);
        });
    } catch (e) {
        console.log('[vehicle_trunk] vehicle:trunk:deposit:s', e.message || e);
    }
});

mp.events.add('vehicle:trunk:withdraw:s', (player, rawItem, rawQty, rawSlot, rawToSlot) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        withActiveTrunk(player, (meta, vehicle, grid) => {
            const rawItemFull = String(rawItem == null ? '' : rawItem).trim();
            const item = normalizeTrunkItem(rawItemFull);
            const slotIndex = parseInt(rawSlot, 10);
            const hasSlotIndex = Number.isInteger(slotIndex) && slotIndex >= 0;
            const toSlotIndex = parseInt(rawToSlot, 10);
            const hasToSlot = Number.isInteger(toSlotIndex) && toSlotIndex >= 0;
            const qtyParsed = parseInt(String(rawQty == null ? '1' : rawQty).replace(/[^\d-]/g, ''), 10);
            let qtyWant = Number.isFinite(qtyParsed) && qtyParsed > 0 ? qtyParsed : 1;
            const stackMode = isTrunkStackItem(item);
            if (qtyParsed === -1 && stackMode) {
                if (hasSlotIndex) {
                    qtyWant = Math.max(1, parseTrunkStackEntry(grid[slotIndex]).count || 1);
                } else {
                    qtyWant = Math.max(1, countConsumableOnTrunk(grid, item) || 1);
                }
            }
            const withdrawQty = stackMode ? qtyWant : 1;
            const preferredInv = hasToSlot ? toSlotIndex : -1;

            if (stackMode) {
                const srcIdx = hasSlotIndex ? slotIndex : findTrunkEntryIndex(grid, item, rawItemFull);
                if (srcIdx < 0) return isNotify(player, 2, 'top-mid', 'Предмет не найден в багажнике.', 3000);
                const cur = parseTrunkStackEntry(grid[srcIdx]);
                if (cur.base !== item || cur.count < withdrawQty) {
                    return isNotify(player, 2, 'top-mid', 'Недостаточно в багажнике.', 3000);
                }
                if (!removeTrunkStackQty(grid, item, withdrawQty, hasSlotIndex ? slotIndex : -1)) {
                    return isNotify(player, 2, 'top-mid', 'Ошибка изъятия.', 3000);
                }
                let pushed = addConsumableQtyToPlayerTrunk(player, item, withdrawQty, preferredInv);
                if (!pushed) {
                    addToTrunkStack(grid, item, withdrawQty, srcIdx);
                    return isNotify(player, 2, 'top-mid', 'Инвентарь переполнен.', 3000);
                }
            } else {
                let token = null;
                if (hasSlotIndex) {
                    if (slotIndex >= 0 && slotIndex < grid.length && trunkCellMatches(grid[slotIndex], item, rawItemFull)) {
                        token = grid[slotIndex];
                        grid[slotIndex] = null;
                    }
                } else {
                    token = takeWholeTrunkItem(grid, item, rawItemFull);
                }
                if (!token) return isNotify(player, 2, 'top-mid', 'Предмет не найден в багажнике.', 3000);
                let pushed = false;
                if (typeof global.invGridTryPushAt === 'function') pushed = global.invGridTryPushAt(player, token, preferredInv);
                else if (typeof global.invGridTryPush === 'function') pushed = global.invGridTryPush(player, token);
                if (!pushed) {
                    placeTokenInTrunk(grid, token, hasSlotIndex ? slotIndex : -1);
                    return isNotify(player, 2, 'top-mid', 'Инвентарь переполнен.', 3000);
                }
            }

            if (typeof global.saveInventory === 'function') global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            persistTrunkGrid(meta.trunkKey, grid, () => {});
            if (meta.kind !== 'personal') {
                logTrunkAction(meta, player, 'trunk_withdraw',
                    `Забрал из ${meta.logCarLabelFrom || meta.logCarLabel}: ${formatTrunkLogItem(item, stackMode ? withdrawQty : 1)}`);
            }
            refreshVehicleTrunkUI(player, grid);
        });
    } catch (e) {
        console.log('[vehicle_trunk] vehicle:trunk:withdraw:s', e.message || e);
    }
});

mp.events.add('vehicle:trunk:swap:s', (player, fromRaw, toRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        withActiveTrunk(player, (meta, vehicle, grid) => {
            const a = parseInt(fromRaw, 10);
            const b = parseInt(toRaw, 10);
            if (!Number.isInteger(a) || !Number.isInteger(b)) return;
            if (a < 0 || b < 0 || a >= VEHICLE_TRUNK_SIZE || b >= VEHICLE_TRUNK_SIZE) return;
            const tmp = grid[a];
            grid[a] = grid[b];
            grid[b] = tmp;
            persistTrunkGrid(meta.trunkKey, grid, () => {});
            refreshVehicleTrunkUI(player, grid);
        });
    } catch (e) {
        console.log('[vehicle_trunk] vehicle:trunk:swap:s', e.message || e);
    }
});

mp.events.add('playerQuit', (player) => {
    closeVehicleTrunkView(player);
});

global.resolveVehicleTrunkMeta = resolveVehicleTrunkMeta;
global.getVehicleTrunkKeyFromVehicle = function (vehicle) {
    const meta = resolveVehicleTrunkMeta(vehicle);
    return meta ? meta.trunkKey : null;
};
