'use strict';

/** Загружается после inventory_equipment.js — переопределяет лимиты слотов и бонус сумки. */

const INV_GRID_SIZE = 20;

function computeBagStorageMaxFromRegistry() {
    let m = 40;
    const reg = global.DONATE_BAGS_REGISTRY;
    if (reg && typeof global.internalSlotsForDonateBagKey === 'function') {
        for (const k of Object.keys(reg)) {
            const c = global.internalSlotsForDonateBagKey(k);
            if (c > m) m = c;
        }
    }
    return Math.max(40, m);
}

/** Единая длина массива «полки» сумки в JSON (макс. вместимость любой сумки по логике бонуса к сетке). */
const BAG_STORAGE_MAX = computeBagStorageMaxFromRegistry();

function padBagStorage(arr) {
    const out = Array.isArray(arr) ? arr.slice(0, BAG_STORAGE_MAX) : [];
    while (out.length < BAG_STORAGE_MAX) out.push(null);
    return out;
}

const CONSUMABLE_STACK_MAX = Number.MAX_SAFE_INTEGER;
const MATERIALS_STACK_MAX = 10000;
const MATERIALS_ITEM = 'item_materials';

function isGridConsumableStackBase(base) {
    const b = String(base || '').trim();
    return b === 'item_spank' || b === 'item_alco' || b === 'Бронежилет' || b === 'Аптечка' || b === 'item_spectrum_charm' || b === 'item_suppressor' || b === 'item_flashlight' || b === 'item_scope' || b === 'item_grip' || b === 'item_extendedclip';
}

function isMaterialsStackBase(base) {
    return String(base || '').trim() === MATERIALS_ITEM;
}

global.isMaterialsStackBase = isMaterialsStackBase;

global.isGridConsumableStackBase = isGridConsumableStackBase;

const DEFAULT_REVOLVER_ITEM = 'weapon_revolver';

function isDefaultRevolverBase(base) {
    return String(base || '').trim().split('#')[0] === DEFAULT_REVOLVER_ITEM;
}

global.isDefaultRevolverItemToken = function (itemStr) {
    if (itemStr == null || itemStr === '') return false;
    return isDefaultRevolverBase(String(itemStr).split('(')[0].trim());
};

function playerBagHasDefaultRevolver(player) {
    if (!mp.players.exists(player)) return false;
    ensurePlayerBagStorageFromPlayer(player);
    const arr = player._bagContentsFull;
    if (!Array.isArray(arr)) return false;
    for (let i = 0; i < arr.length; i++) {
        const x = arr[i];
        if (x == null || x === '') continue;
        const base = String(x).split('(')[0].trim().split('#')[0].trim();
        if (isDefaultRevolverBase(base)) return true;
    }
    return false;
}

/** Легаси-дюп: стандартный револьвер не должен лежать в сумке. */
global.purgeWeaponsFromBagStorage = function (player) {
    if (!mp.players.exists(player)) return false;
    ensurePlayerBagStorageFromPlayer(player);
    if (!Array.isArray(player._bagContentsFull)) return false;
    let changed = false;
    for (let i = 0; i < player._bagContentsFull.length; i++) {
        const x = player._bagContentsFull[i];
        if (x == null || x === '') continue;
        if (!global.isDefaultRevolverItemToken(x)) continue;
        player._bagContentsFull[i] = null;
        changed = true;
        if (global.invGridTryPush && global.invGridTryPush(player, x)) continue;
        if (Array.isArray(player.fastSlots)) {
            let placed = false;
            for (let s = 0; s < player.fastSlots.length; s++) {
                if (!player.fastSlots[s] || String(player.fastSlots[s]).trim() === '') {
                    player.fastSlots[s] = x;
                    placed = true;
                    break;
                }
            }
            if (placed) continue;
        }
        if (typeof global.isNotify === 'function') {
            global.isNotify(
                player,
                2,
                'top-mid',
                'Стандартный револьвер нельзя хранить в сумке. Освободите слот в инвентаре или быстром слоте.',
                4500
            );
        }
    }
    if (changed && typeof global.syncBagContentsArrayToCapacity === 'function') {
        global.syncBagContentsArrayToCapacity(player);
    }
    return changed;
};

/** Трубка Bong — без лимита затягов; старые item_bong (N) приводим к item_bong. */
global.normalizeBongInPlayerGrid = function (player) {
    if (!mp.players.exists(player) || !Array.isArray(player.inventory)) return;
    global.ensureInventoryGrid50(player);
    for (let i = 0; i < INV_GRID_SIZE; i++) {
        const cell = player.inventory[i];
        if (cell == null || cell === '') continue;
        if (String(cell).startsWith('item_bong')) {
            player.inventory[i] = 'item_bong';
        }
    }
};

/** Дрон — одна штука; старые item_drone (N) приводим к item_drone. */
global.normalizeDroneInPlayerGrid = function (player) {
    if (!mp.players.exists(player) || !Array.isArray(player.inventory)) return;
    global.ensureInventoryGrid50(player);
    for (let i = 0; i < INV_GRID_SIZE; i++) {
        const cell = player.inventory[i];
        if (cell == null || cell === '') continue;
        if (String(cell).startsWith('item_drone')) {
            player.inventory[i] = 'item_drone';
        }
    }
};

global.normalizeThermosInPlayerGrid = function (player) {
    if (!mp.players.exists(player) || !Array.isArray(player.inventory)) return;
    global.ensureInventoryGrid50(player);
    for (let i = 0; i < INV_GRID_SIZE; i++) {
        const cell = player.inventory[i];
        if (cell == null || cell === '') continue;
        const s = String(cell);
        if (s.startsWith('item_thermos') || s.startsWith('item_thermocup')) {
            player.inventory[i] = 'item_thermos';
        }
    }
};

function parseBagConsumStackQty(itemStr) {
    const s = String(itemStr || '').trim();
    const base = s.split('(')[0].trim();
    if (!isGridConsumableStackBase(base)) return 0;
    const m = /\((\d+)\)\s*$/.exec(s);
    if (!m) return 1;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

function consumeOneConsumableFromStackArray(arr, itemName, maxLen) {
    if (!Array.isArray(arr) || !itemName) return false;
    const needle = String(itemName);
    const limit = Number.isFinite(maxLen) && maxLen >= 0 ? Math.min(maxLen, arr.length) : arr.length;
    for (let i = 0; i < limit; i++) {
        const cell = arr[i];
        if (cell == null || cell === '') continue;
        const s = String(cell);
        if (s !== needle && !s.startsWith(needle + ' (')) continue;
        const m = s.match(/\((\d+)\)/);
        const count = m ? parseInt(m[1], 10) : 1;
        const c = Number.isFinite(count) ? count : 1;
        if (c > 1) {
            arr[i] = `${needle} (${c - 1})`;
        } else {
            arr[i] = null;
        }
        return true;
    }
    return false;
}

/** Снять 1 ед. со стака расходников в сетке 50 (без splice — ячейка обнуляется). */
global.consumeOneConsumableStackInGrid = function (player, itemName) {
    if (!mp.players.exists(player) || !itemName) return false;
    global.ensureInventoryGrid50(player);
    return consumeOneConsumableFromStackArray(player.inventory, itemName, INV_GRID_SIZE);
};

/** Снять 1 ед. расходника: сетка → быстрые слоты (не из рюкзака). */
global.consumeOneConsumableForPlayer = function (player, itemName) {
    if (!mp.players.exists(player) || !itemName) return false;
    if (global.consumeOneConsumableStackInGrid(player, itemName)) return true;

    player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];
    if (consumeOneConsumableFromStackArray(player.fastSlots, itemName)) return true;

    return false;
};

const ARMOR_ITEM = 'Бронежилет';

function parseArmorDurabilityFromToken(itemStr) {
    const head = String(itemStr || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .split('(')[0]
        .trim();
    const base = head.split('#')[0].trim();
    if (base !== ARMOR_ITEM) return null;
    const hm = head.match(/#(\d+)/);
    if (!hm) return 100;
    const n = parseInt(hm[1], 10);
    if (!Number.isFinite(n)) return 100;
    return Math.max(1, Math.min(100, n));
}

function formatArmorInventoryToken(pct) {
    const p = Math.max(1, Math.min(100, Math.round(Number(pct) || 0)));
    return p >= 100 ? ARMOR_ITEM : `${ARMOR_ITEM}#${p}`;
}

function playerActiveVipLevel(player) {
    if (!player) return 0;
    const lvl = parseInt(player.viplvl, 10) || 0;
    if (lvl <= 0) return 0;
    if (player.vipdate) {
        const vd = player.vipdate instanceof Date ? player.vipdate : new Date(player.vipdate);
        if (!isNaN(vd.getTime()) && vd.getTime() <= Date.now()) return 0;
    }
    return lvl;
}

function grantArmorPctForPlayer(_player) {
    return 100;
}

function grantArmorQtyMutable(grid, player, qty) {
    if (qty <= 0) return true;
    const token = formatArmorInventoryToken(grantArmorPctForPlayer(player));
    return mergeConsumableQtyMutable(grid, token, qty);
}

function grantArmorQtyIntoGrid(player, qty) {
    if (!mp.players.exists(player) || qty <= 0) return true;
    global.ensureInventoryGrid50(player);
    return grantArmorQtyMutable(player.inventory, player, qty);
}

function canGrantArmorQtyToGrid(player, qty) {
    if (!mp.players.exists(player) || qty <= 0) return true;
    global.ensureInventoryGrid50(player);
    const grid = [];
    for (let i = 0; i < INV_GRID_SIZE; i++) grid[i] = player.inventory[i];
    return grantArmorQtyMutable(grid, player, qty);
}

function isArmorItemCell(itemStr) {
    return parseArmorDurabilityFromToken(itemStr) != null;
}

function consumeOneArmorFromArray(arr, maxLen) {
    if (!Array.isArray(arr)) return null;
    const limit = Number.isFinite(maxLen) && maxLen >= 0 ? Math.min(maxLen, arr.length) : arr.length;
    for (let i = 0; i < limit; i++) {
        const cell = arr[i];
        if (cell == null || cell === '') continue;
        const s = String(cell);
        const pct = parseArmorDurabilityFromToken(s);
        if (pct == null) continue;
        const m = s.match(/\((\d+)\)\s*$/);
        if (m) {
            const count = parseInt(m[1], 10);
            const c = Number.isFinite(count) ? count : 1;
            if (c > 1) {
                arr[i] = `${ARMOR_ITEM} (${c - 1})`;
            } else {
                arr[i] = null;
            }
            return { pct: 100, token: ARMOR_ITEM };
        }
        arr[i] = null;
        return { pct, token: formatArmorInventoryToken(pct) };
    }
    return null;
}

function consumeOneArmorAtIndex(arr, index) {
    if (!Array.isArray(arr) || !Number.isInteger(index) || index < 0 || index >= arr.length) return null;
    const cell = arr[index];
    if (cell == null || cell === '') return null;
    const s = String(cell);
    const pct = parseArmorDurabilityFromToken(s);
    if (pct == null) return null;
    const m = s.match(/\((\d+)\)\s*$/);
    if (m) {
        const count = parseInt(m[1], 10);
        const c = Number.isFinite(count) ? count : 1;
        if (c > 1) {
            arr[index] = `${ARMOR_ITEM} (${c - 1})`;
        } else {
            arr[index] = null;
        }
        return { pct: 100, token: ARMOR_ITEM };
    }
    arr[index] = null;
    return { pct, token: formatArmorInventoryToken(pct) };
}

function armorCellMatchesToken(cell, wantRaw) {
    if (cell == null || cell === '') return false;
    const want = String(wantRaw || '').trim();
    if (!want) return parseArmorDurabilityFromToken(cell) != null;
    return String(cell).split('(')[0].trim() === want.split('(')[0].trim();
}

global.consumeArmorItemForPlayer = function (player, rawToken, opts) {
    if (!mp.players.exists(player)) return null;
    const o = opts && typeof opts === 'object' ? opts : {};
    const source = String(o.source || 'grid').trim();
    const slotIndex = parseInt(o.slotIndex, 10);

    global.ensureInventoryGrid50(player);

    if (Number.isInteger(slotIndex) && slotIndex >= 0) {
        if (source === 'grid' && slotIndex < INV_GRID_SIZE) {
            const cell = player.inventory[slotIndex];
            if (armorCellMatchesToken(cell, rawToken)) return consumeOneArmorAtIndex(player.inventory, slotIndex);
            return null;
        }
        if (source === 'fast' && slotIndex < 3) {
            player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];
            const cell = player.fastSlots[slotIndex];
            if (armorCellMatchesToken(cell, rawToken)) return consumeOneArmorAtIndex(player.fastSlots, slotIndex);
            return null;
        }
        if (source === 'bag') {
            if (typeof global.isNotify === 'function') {
                global.isNotify(player, 2, 'top-mid', 'Сначала перенесите предмет в инвентарь.', 3500);
            }
            return null;
        }
    }

    if (rawToken) {
        for (let i = 0; i < INV_GRID_SIZE; i++) {
            if (armorCellMatchesToken(player.inventory[i], rawToken)) {
                return consumeOneArmorAtIndex(player.inventory, i);
            }
        }
        player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];
        for (let s = 0; s < player.fastSlots.length; s++) {
            if (armorCellMatchesToken(player.fastSlots[s], rawToken)) {
                return consumeOneArmorAtIndex(player.fastSlots, s);
            }
        }
    }

    return global.consumeOneArmorItemForPlayer(player);
};

global.parseArmorDurabilityFromToken = parseArmorDurabilityFromToken;
global.formatArmorInventoryToken = formatArmorInventoryToken;
global.playerActiveVipLevel = playerActiveVipLevel;
global.grantArmorPctForPlayer = grantArmorPctForPlayer;
global.grantArmorQtyIntoGrid = grantArmorQtyIntoGrid;
global.canGrantArmorQtyToGrid = canGrantArmorQtyToGrid;
global.isArmorItemCell = isArmorItemCell;

function giftCellMatchesToken(cell, wantRaw) {
    if (cell == null || cell === '') return false;
    const want = String(wantRaw || '').trim().split('(')[0].trim();
    if (!want) return false;
    return String(cell).split('(')[0].trim() === want;
}

global.consumeArmorGiftTokenForPlayer = function (player, rawToken, opts) {
    if (!mp.players.exists(player)) return false;
    const want = String(rawToken || '').trim().split('(')[0].trim();
    if (!want.startsWith('agift:')) return false;
    const o = opts && typeof opts === 'object' ? opts : {};
    const source = String(o.source || 'grid').trim();
    const slotIndex = parseInt(o.slotIndex, 10);

    global.ensureInventoryGrid50(player);

    const clearAt = (arr, index) => {
        if (!Array.isArray(arr) || index < 0 || index >= arr.length) return false;
        if (!giftCellMatchesToken(arr[index], want)) return false;
        arr[index] = null;
        return true;
    };

    if (Number.isInteger(slotIndex) && slotIndex >= 0) {
        if (source === 'grid' && slotIndex < INV_GRID_SIZE) {
            return clearAt(player.inventory, slotIndex);
        }
        if (source === 'fast' && slotIndex < 3) {
            player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];
            return clearAt(player.fastSlots, slotIndex);
        }
        if (source === 'bag') {
            if (typeof global.isNotify === 'function') {
                global.isNotify(player, 2, 'top-mid', 'Сначала перенесите предмет в инвентарь.', 3500);
            }
            return false;
        }
    }

    for (let i = 0; i < INV_GRID_SIZE; i++) {
        if (giftCellMatchesToken(player.inventory[i], want)) {
            player.inventory[i] = null;
            return true;
        }
    }
    player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];
    for (let s = 0; s < player.fastSlots.length; s++) {
        if (giftCellMatchesToken(player.fastSlots[s], want)) {
            player.fastSlots[s] = null;
            return true;
        }
    }
    return false;
};

global.consumeOneArmorItemForPlayer = function (player) {
    if (!mp.players.exists(player)) return null;
    global.ensureInventoryGrid50(player);
    let got = consumeOneArmorFromArray(player.inventory, INV_GRID_SIZE);
    if (got) return got;

    player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];
    got = consumeOneArmorFromArray(player.fastSlots);
    if (got) return got;

    return null;
};

function parseMoveFromBagQtyRaw(qtyRaw) {
    if (qtyRaw === undefined || qtyRaw === null || qtyRaw === '') return -1;
    const n = parseInt(String(qtyRaw), 10);
    return Number.isFinite(n) ? n : -1;
}

function firstEmptyInConsumableGrid(grid) {
    for (let i = 0; i < INV_GRID_SIZE; i++) {
        const x = grid[i];
        if (x == null || x === '') return i;
    }
    return -1;
}

/** Добавить qty в сетку; расходники держатся одним большим стеком, без зависимости от сумки. */
function mergeConsumableQtyMutable(grid, base, qty) {
    if (qty <= 0) return true;
    let left = qty;
    for (let i = 0; i < INV_GRID_SIZE && left > 0; i++) {
        const invItem = grid[i];
        if (invItem == null || invItem === '') continue;
        const s = String(invItem);
        if (s !== base && !s.startsWith(`${base} (`)) continue;
        const m = s.match(/\((\d+)\)/);
        const count = m ? parseInt(m[1], 10) : 1;
        if (!Number.isFinite(count)) continue;
        const add = left;
        const newCount = count + add;
        grid[i] = newCount <= 1 ? base : `${base} (${newCount})`;
        left -= add;
    }
    while (left > 0) {
        const chunk = left;
        const token = chunk <= 1 ? base : `${base} (${chunk})`;
        const empty = firstEmptyInConsumableGrid(grid);
        if (empty < 0) return false;
        grid[empty] = token;
        left -= chunk;
    }
    return true;
}

/** Добавить qty единиц consumable (тот же лимит стека, что в магазине). false если не хватило слотов. */
function mergeConsumableQtyIntoGrid(player, base, qty) {
    if (!mp.players.exists(player) || qty <= 0) return true;
    global.ensureInventoryGrid50(player);
    return mergeConsumableQtyMutable(player.inventory, base, qty);
}

/** Проверка без изменения инвентаря (для buy x10 и т.п.). */
global.canAddConsumableQtyToGrid = function (player, base, qty) {
    if (!mp.players.exists(player) || qty <= 0) return true;
    global.ensureInventoryGrid50(player);
    const grid = [];
    for (let i = 0; i < INV_GRID_SIZE; i++) grid[i] = player.inventory[i];
    return mergeConsumableQtyMutable(grid, base, qty);
};

global.mergeConsumableQtyIntoGrid = mergeConsumableQtyIntoGrid;

function mergeStackQtyMutable(grid, base, qty, stackMax) {
    if (qty <= 0) return true;
    let left = qty;
    for (let i = 0; i < INV_GRID_SIZE && left > 0; i++) {
        const invItem = grid[i];
        if (invItem == null || invItem === '') continue;
        const s = String(invItem);
        if (s !== base && !s.startsWith(`${base} (`)) continue;
        const m = s.match(/\((\d+)\)/);
        const count = m ? parseInt(m[1], 10) : 1;
        if (!Number.isFinite(count) || count >= stackMax) continue;
        const room = stackMax - count;
        const add = Math.min(left, room);
        const newCount = count + add;
        grid[i] = newCount <= 1 ? base : `${base} (${newCount})`;
        left -= add;
    }
    while (left > 0) {
        const chunk = Math.min(left, stackMax);
        const token = chunk <= 1 ? base : `${base} (${chunk})`;
        const empty = firstEmptyInConsumableGrid(grid);
        if (empty < 0) return false;
        grid[empty] = token;
        left -= chunk;
    }
    return true;
}

function mergeMaterialsQtyIntoGrid(player, qty) {
    if (!mp.players.exists(player) || qty <= 0) return true;
    global.ensureInventoryGrid50(player);
    return mergeStackQtyMutable(player.inventory, MATERIALS_ITEM, qty, MATERIALS_STACK_MAX);
}

function countMaterialsOnPlayer(player) {
    if (!mp.players.exists(player) || !Array.isArray(player.inventory)) return 0;
    let n = 0;
    for (let i = 0; i < player.inventory.length; i++) {
        const cell = player.inventory[i];
        if (cell == null || cell === '') continue;
        const s = String(cell);
        if (s !== MATERIALS_ITEM && !s.startsWith(`${MATERIALS_ITEM} (`)) continue;
        const m = s.match(/\((\d+)\)/);
        n += m ? parseInt(m[1], 10) || 0 : 1;
    }
    return n;
}

function removeMaterialsQtyFromPlayer(player, qty) {
    if (!mp.players.exists(player) || qty <= 0) return false;
    global.ensureInventoryGrid50(player);
    let need = qty;
    for (let i = 0; i < INV_GRID_SIZE && need > 0; i++) {
        const cell = player.inventory[i];
        if (cell == null || cell === '') continue;
        const s = String(cell);
        if (s !== MATERIALS_ITEM && !s.startsWith(`${MATERIALS_ITEM} (`)) continue;
        const m = s.match(/\((\d+)\)/);
        const count = m ? parseInt(m[1], 10) || 0 : 1;
        if (count <= need) {
            need -= count;
            player.inventory[i] = null;
        } else {
            const rem = count - need;
            player.inventory[i] = rem <= 1 ? MATERIALS_ITEM : `${MATERIALS_ITEM} (${rem})`;
            need = 0;
        }
    }
    return need === 0;
}

global.mergeMaterialsQtyIntoGrid = mergeMaterialsQtyIntoGrid;
global.countMaterialsOnPlayer = countMaterialsOnPlayer;
global.removeMaterialsQtyFromPlayer = removeMaterialsQtyFromPlayer;
global.canAddMaterialsQtyToGrid = function (player, qty) {
    if (!mp.players.exists(player) || qty <= 0) return true;
    global.ensureInventoryGrid50(player);
    const grid = [];
    for (let i = 0; i < INV_GRID_SIZE; i++) grid[i] = player.inventory[i];
    return mergeStackQtyMutable(grid, MATERIALS_ITEM, qty, MATERIALS_STACK_MAX);
};

/** Перенос содержимого из ic1bag:… в новый ключ bagped:… (и наоборот) при смене способа вычисления ключа. */
function tryMergeBagPedFromIc1Bag(player, key) {
    if (!player._bagStorageByKey || typeof key !== 'string') return false;
    const m = key.match(/^bagped:([^:]+):([^:]+):s(.+)$/);
    if (!m) return false;
    const suffix = `:${m[1]}:${m[2]}:s${m[3]}`;
    for (const k of Object.keys(player._bagStorageByKey)) {
        if (k === key) continue;
        if (!k.startsWith('ic1bag:') || !k.endsWith(suffix)) continue;
        const arr = player._bagStorageByKey[k];
        if (!Array.isArray(arr) || !arr.some((c) => c != null && c !== '')) continue;
        player._bagStorageByKey[key] = padBagStorage(arr.slice());
        delete player._bagStorageByKey[k];
        return true;
    }
    return false;
}

function tryMergeIc1BagFromBagPed(player, key) {
    if (!player._bagStorageByKey || typeof key !== 'string') return false;
    const m = key.match(/^ic1bag:\d+:\d+:([^:]+):([^:]+):s(.+)$/);
    if (!m) return false;
    const bagpedKey = `bagped:${m[1]}:${m[2]}:s${m[3]}`;
    const arr = player._bagStorageByKey[bagpedKey];
    if (!Array.isArray(arr) || !arr.some((c) => c != null && c !== '')) return false;
    player._bagStorageByKey[key] = padBagStorage(arr.slice());
    delete player._bagStorageByKey[bagpedKey];
    return true;
}

/** Один и тот же ic1-слот мог временно жить под ic1bag:… и под baginst:{id} — сливаем по inst + _bagEquipIc1. */
function tryMergeIc1BagKeyMatchingEquipIntoBagInst(player, baginstKey) {
    if (!player._bagStorageByKey || typeof baginstKey !== 'string' || !baginstKey.startsWith('baginst:')) return false;
    const wantInst = parseInt(baginstKey.slice(8), 10);
    if (!Number.isFinite(wantInst) || wantInst <= 0) return false;
    const ic1eq = player._bagEquipIc1;
    if (typeof ic1eq !== 'string' || !ic1eq.startsWith('ic1.')) return false;
    const pl = decodeIc1QuickForBagCount(ic1eq.split('(')[0].trim());
    if (!pl || Number(pl.cid) !== 8) return false;
    const inst = pl.bagInst != null ? Number(pl.bagInst) : NaN;
    if (!Number.isFinite(inst) || inst !== wantInst) return false;
    const iid = Number.isFinite(Number(pl.iid)) ? Number(pl.iid) : 0;
    const tt = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
    const d = Number(pl.d);
    const sid = player.static != null ? String(player.static) : '0';
    const ic1k = `ic1bag:${pl.cid}:${iid}:${d}:${tt}:s${sid}`;
    const arr = player._bagStorageByKey[ic1k];
    if (!Array.isArray(arr) || !arr.some((c) => c != null && c !== '')) return false;
    player._bagStorageByKey[baginstKey] = padBagStorage(arr.slice());
    delete player._bagStorageByKey[ic1k];
    return true;
}

function ic1CellBaseForBagScan(cell) {
    if (typeof cell !== 'string' || !cell.startsWith('ic1.')) return '';
    return cell.split('(')[0].trim();
}

function bagStorageKeyHasAnyItems(arr) {
    return Array.isArray(arr) && arr.some((c) => c != null && c !== '');
}

/** drawable:texture для экземпляра bagInst из сетки/карманов (если нет колонок drawable в donate_bag_instances). */
function findDrawableTextureForBagInstInStash(player, instId) {
    if (!mp.players.exists(player)) return null;
    const want = Number(instId);
    if (!Number.isFinite(want) || want <= 0) return null;
    const scan = (arr) => {
        if (!Array.isArray(arr)) return null;
        for (let i = 0; i < arr.length; i++) {
            const base = ic1CellBaseForBagScan(arr[i]);
            if (!base) continue;
            const pl = decodeIc1QuickForBagCount(base);
            if (!pl || Number(pl.cid) !== 8) continue;
            const bi = pl.bagInst != null ? Number(pl.bagInst) : NaN;
            if (!Number.isFinite(bi) || bi !== want) continue;
            const tt = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
            return { d: Number(pl.d), t: tt };
        }
        return null;
    };
    let r = scan(player.inventory);
    if (r) return r;
    r = scan(player.fastSlots);
    if (r) return r;
    if (player._bagStorageByKey && typeof player._bagStorageByKey === 'object') {
        for (const k of Object.keys(player._bagStorageByKey)) {
            r = scan(player._bagStorageByKey[k]);
            if (r) return r;
        }
    }
    return null;
}

function donateBagAccountKeyFromDrawableTexture(d, t) {
    const reg = global.DONATE_BAGS_REGISTRY;
    if (!reg || typeof reg !== 'object') return null;
    const wantD = Number(d);
    const wantT = Number.isFinite(Number(t)) ? Number(t) : 0;
    if (!Number.isFinite(wantD)) return null;
    for (const bk of Object.keys(reg)) {
        const b = reg[bk];
        if (b && Number(b.drawable) === wantD && Number(b.texture) === wantT) return bk;
    }
    return null;
}

/**
 * Предметы попадали в ivbag:…:s{static}, а при повторном экипе ключ становится baginst:{id} — переносим, иначе «пустая» сумка.
 */
function tryMigrateIvbagSidIntoBagInst(player, bagInstKey) {
    if (!mp.players.exists(player) || !player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') return false;
    const m = String(bagInstKey).match(/^baginst:(\d+)$/);
    if (!m) return false;
    const instId = parseInt(m[1], 10);
    if (!Number.isInteger(instId) || instId <= 0) return false;
    const cur = player._bagStorageByKey[bagInstKey];
    if (bagStorageKeyHasAnyItems(cur)) return false;
    let dk = null;
    try {
        if (player._donateBagInstIdToDt && typeof player._donateBagInstIdToDt === 'object') {
            dk = player._donateBagInstIdToDt[String(instId)] || player._donateBagInstIdToDt[instId];
        }
    } catch (_eM) {}
    if (!dk || typeof dk !== 'string') {
        const dt = findDrawableTextureForBagInstInStash(player, instId);
        if (dt && Number.isFinite(dt.d)) dk = `${dt.d}:${dt.t}`;
    }
    if (!dk || typeof dk !== 'string') return false;
    const parts = dk.split(':');
    const d = parseInt(parts[0], 10);
    const t = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    const bagAccKey = donateBagAccountKeyFromDrawableTexture(d, t);
    if (!bagAccKey) return false;
    const sid = player.static != null ? String(player.static) : '0';
    const ivk = `ivbag:${bagAccKey}:s${sid}`;
    const src = player._bagStorageByKey[ivk];
    if (!bagStorageKeyHasAnyItems(src)) return false;
    player._bagStorageByKey[bagInstKey] = padBagStorage(src.slice());
    try {
        delete player._bagStorageByKey[ivk];
    } catch (_eD) {}
    if (typeof global.persistSingleDonateBagInstanceContents === 'function') {
        global.persistSingleDonateBagInstanceContents(player, instId);
    }
    return true;
}

/** Каталог сумки (ic1) давал ключ ic1bag:…, позже тот же предмет с bagInst — baginst:{id}; переносим карман. */
function tryMigrateIc1BagKeyIntoBagInst(player, bagInstKey) {
    if (!mp.players.exists(player) || !player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') return false;
    const m = String(bagInstKey).match(/^baginst:(\d+)$/);
    if (!m) return false;
    const instId = parseInt(m[1], 10);
    if (!Number.isInteger(instId) || instId <= 0) return false;
    const cur = player._bagStorageByKey[bagInstKey];
    if (bagStorageKeyHasAnyItems(cur)) return false;
    const pl = findIc1PayloadForBagInstInStash(player, instId);
    if (!pl || Number(pl.cid) !== 8) return false;
    const sid = player.static != null ? String(player.static) : '0';
    const iid = Number.isFinite(Number(pl.iid)) ? Number(pl.iid) : 0;
    const tt = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
    const d = Number(pl.d);
    const ic1key = `ic1bag:${pl.cid}:${iid}:${d}:${tt}:s${sid}`;
    const src = player._bagStorageByKey[ic1key];
    if (!bagStorageKeyHasAnyItems(src)) return false;
    player._bagStorageByKey[bagInstKey] = padBagStorage(src.slice());
    try {
        delete player._bagStorageByKey[ic1key];
    } catch (_eD) {}
    if (typeof global.persistSingleDonateBagInstanceContents === 'function') {
        global.persistSingleDonateBagInstanceContents(player, instId);
    }
    return true;
}

/** Тот же случай, что и ic1bag, но карман жил под bagped:d:t:s (peek без inst). */
function tryMigrateBagpedIntoBagInst(player, bagInstKey) {
    if (!mp.players.exists(player) || !player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') return false;
    const m = String(bagInstKey).match(/^baginst:(\d+)$/);
    if (!m) return false;
    const instId = parseInt(m[1], 10);
    if (!Number.isInteger(instId) || instId <= 0) return false;
    const cur = player._bagStorageByKey[bagInstKey];
    if (bagStorageKeyHasAnyItems(cur)) return false;
    let dk = null;
    try {
        if (player._donateBagInstIdToDt && typeof player._donateBagInstIdToDt === 'object') {
            dk = player._donateBagInstIdToDt[String(instId)] || player._donateBagInstIdToDt[instId];
        }
    } catch (_eM) {}
    if (!dk || typeof dk !== 'string') {
        const dt = findDrawableTextureForBagInstInStash(player, instId);
        if (dt && Number.isFinite(dt.d)) dk = `${dt.d}:${dt.t}`;
    }
    if (!dk || typeof dk !== 'string') return false;
    const parts = dk.split(':');
    const d = parseInt(parts[0], 10);
    const t = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (!Number.isFinite(d)) return false;
    const sid = player.static != null ? String(player.static) : '0';
    const bagpedKey = `bagped:${d}:${t}:s${sid}`;
    const src = player._bagStorageByKey[bagpedKey];
    if (!bagStorageKeyHasAnyItems(src)) return false;
    player._bagStorageByKey[bagInstKey] = padBagStorage(src.slice());
    try {
        delete player._bagStorageByKey[bagpedKey];
    } catch (_eD) {}
    if (typeof global.persistSingleDonateBagInstanceContents === 'function') {
        global.persistSingleDonateBagInstanceContents(player, instId);
    }
    return true;
}

/**
 * Объединить любой непустой legacy-ключ (bagped / ic1bag / ivbag), совпадающий с drawable:texture экземпляра bagInst.
 * Покрывает расхождения в формате ключа, когда точечные миграции не сработали.
 */
function tryScavengeLegacyBagKeysIntoBagInst(player, bagInstKey) {
    if (!mp.players.exists(player) || !player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') return false;
    const m = String(bagInstKey).match(/^baginst:(\d+)$/);
    if (!m) return false;
    const instId = parseInt(m[1], 10);
    if (!Number.isInteger(instId) || instId <= 0) return false;
    const dest = player._bagStorageByKey[bagInstKey];
    if (bagStorageKeyHasAnyItems(dest)) return false;

    let dk = null;
    try {
        if (player._donateBagInstIdToDt && typeof player._donateBagInstIdToDt === 'object') {
            dk = player._donateBagInstIdToDt[String(instId)] || player._donateBagInstIdToDt[instId];
        }
    } catch (_eM) {}
    if (!dk || typeof dk !== 'string') {
        const dt = findDrawableTextureForBagInstInStash(player, instId);
        if (dt && Number.isFinite(dt.d)) dk = `${dt.d}:${dt.t}`;
    }
    if (!dk || typeof dk !== 'string') return false;
    const parts = dk.split(':');
    const dMeta = parseInt(parts[0], 10);
    const tMeta = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (!Number.isFinite(dMeta)) return false;
    const sid = player.static != null ? String(player.static) : '0';
    const bagAcc = donateBagAccountKeyFromDrawableTexture(dMeta, tMeta);

    const keys = Object.keys(player._bagStorageByKey);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k === bagInstKey) continue;
        const arr = player._bagStorageByKey[k];
        if (!bagStorageKeyHasAnyItems(arr)) continue;
        let match = false;
        if (k.startsWith('bagped:')) {
            const mm = k.match(/^bagped:([^:]+):([^:]+):s(.+)$/);
            if (
                mm &&
                mm[3] === sid &&
                Number(mm[1]) === dMeta &&
                Number(mm[2]) === tMeta
            )
                match = true;
        } else if (bagAcc && k.startsWith('ivbag:')) {
            const mm = k.match(/^ivbag:([^:]+):s(.+)$/);
            if (mm && mm[2] === sid && mm[1] === bagAcc) match = true;
        } else if (k.startsWith('ic1bag:')) {
            const mm = k.match(/^ic1bag:\d+:\d+:([^:]+):([^:]+):s(.+)$/);
            if (
                mm &&
                mm[3] === sid &&
                Number(mm[1]) === dMeta &&
                Number(mm[2]) === tMeta
            )
                match = true;
        }
        if (match) {
            player._bagStorageByKey[bagInstKey] = padBagStorage(arr.slice());
            try {
                delete player._bagStorageByKey[k];
            } catch (_eD) {}
            if (typeof global.persistSingleDonateBagInstanceContents === 'function') {
                global.persistSingleDonateBagInstanceContents(player, instId);
            }
            return true;
        }
    }
    return false;
}

function findIc1PayloadForBagInstInStash(player, instId) {
    const want = Number(instId);
    if (!Number.isFinite(want) || want <= 0) return null;
    const scan = (arr) => {
        if (!Array.isArray(arr)) return null;
        for (let i = 0; i < arr.length; i++) {
            const base = ic1CellBaseForBagScan(arr[i]);
            if (!base) continue;
            const pl = decodeIc1QuickForBagCount(base);
            if (!pl || Number(pl.cid) !== 8) continue;
            const bi = pl.bagInst != null ? Number(pl.bagInst) : NaN;
            if (!Number.isFinite(bi) || bi !== want) continue;
            return pl;
        }
        return null;
    };
    let r = scan(player.inventory);
    if (r) return r;
    r = scan(player.fastSlots);
    if (r) return r;
    if (player._bagStorageByKey && typeof player._bagStorageByKey === 'object') {
        for (const k of Object.keys(player._bagStorageByKey)) {
            r = scan(player._bagStorageByKey[k]);
            if (r) return r;
        }
    }
    return null;
}

function tryMergeBagInstIntoIc1BagKey(player, ic1key) {
    if (!player._bagStorageByKey || typeof ic1key !== 'string' || !ic1key.startsWith('ic1bag:')) return false;
    const m = ic1key.match(/^ic1bag:(\d+):(\d+):(\d+):(\d+):s(.+)$/);
    if (!m) return false;
    const ic1eq = player._bagEquipIc1;
    if (typeof ic1eq !== 'string' || !ic1eq.startsWith('ic1.')) return false;
    const pl = decodeIc1QuickForBagCount(ic1eq.split('(')[0].trim());
    if (!pl || Number(pl.cid) !== 8) return false;
    const sidNeed = String(player.static != null ? player.static : '0');
    if (m[5] !== sidNeed) return false;
    const iid = Number.isFinite(Number(pl.iid)) ? Number(pl.iid) : 0;
    const tt = Number.isFinite(Number(pl.t)) ? Number(pl.t) : 0;
    const d = Number(pl.d);
    if (
        Number(pl.cid) !== Number(m[1]) ||
        iid !== Number(m[2]) ||
        d !== Number(m[3]) ||
        tt !== Number(m[4])
    ) {
        return false;
    }
    const inst = pl.bagInst != null ? Number(pl.bagInst) : NaN;
    if (!Number.isFinite(inst) || inst <= 0) return false;
    const bk = `baginst:${inst}`;
    const arr = player._bagStorageByKey[bk];
    if (!Array.isArray(arr) || !arr.some((c) => c != null && c !== '')) return false;
    player._bagStorageByKey[ic1key] = padBagStorage(arr.slice());
    delete player._bagStorageByKey[bk];
    return true;
}

/** Приводит активный массив сумки к ссылке на слот в _bagStorageByKey и длине BAG_STORAGE_MAX. */
function ensurePlayerBagStorageFromPlayer(player) {
    if (!mp.players.exists(player)) return;
    if (typeof global.isPlayerTrunkOpen === 'function' && global.isPlayerTrunkOpen(player)) return;
    if (!player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') player._bagStorageByKey = {};

    if (Object.keys(player._bagStorageByKey).length === 0) {
        const fromRaw = parseJsonArray(player._bagContentsRaw);
        if (fromRaw.length > 0) player._bagStorageByKey.__legacy__ = padBagStorage(fromRaw);
        else if (Array.isArray(player.bagContents) && player.bagContents.length > 0)
            player._bagStorageByKey.__legacy__ = padBagStorage(player.bagContents);
    }

    const key =
        typeof global.computeBagInventoryStorageKey === 'function' ? global.computeBagInventoryStorageKey(player) : null;

    if (!key) {
        /** Не пересоздаём _bagContentsFull — иначе теряется ссылка на карман в _bagStorageByKey при смене сумки. */
        player.bagContents = [];
        return;
    }

    if (String(key).startsWith('baginst:')) {
        const ex = player._bagStorageByKey[key];
        if (!bagStorageKeyHasAnyItems(ex)) {
            tryMigrateIvbagSidIntoBagInst(player, key);
            if (!bagStorageKeyHasAnyItems(player._bagStorageByKey[key])) tryMigrateIc1BagKeyIntoBagInst(player, key);
            if (!bagStorageKeyHasAnyItems(player._bagStorageByKey[key])) tryMigrateBagpedIntoBagInst(player, key);
            if (!bagStorageKeyHasAnyItems(player._bagStorageByKey[key])) tryScavengeLegacyBagKeysIntoBagInst(player, key);
        }
    }

    if (!player._bagStorageByKey[key]) {
        const legacyFracKeys = Object.keys(player._bagStorageByKey).filter(
            (k) => k !== '__legacy__' && /:f[1-6]$/.test(String(k))
        );
        let mergedFrac = null;
        for (let i = 0; i < legacyFracKeys.length; i++) {
            const cand = player._bagStorageByKey[legacyFracKeys[i]];
            if (Array.isArray(cand) && cand.some((c) => c != null && c !== '')) {
                mergedFrac = padBagStorage(cand);
                break;
            }
        }
        if (mergedFrac) {
            player._bagStorageByKey[key] = mergedFrac;
            for (let i = 0; i < legacyFracKeys.length; i++) delete player._bagStorageByKey[legacyFracKeys[i]];
        } else if (player._bagStorageByKey.__legacy__) {
            player._bagStorageByKey[key] = padBagStorage(player._bagStorageByKey.__legacy__);
            delete player._bagStorageByKey.__legacy__;
        } else if (tryMergeBagPedFromIc1Bag(player, key) || tryMergeIc1BagFromBagPed(player, key)) {
            /* ключ заполнен переносом с альтернативного bagped/ic1bag */
        } else if (tryMergeIc1BagKeyMatchingEquipIntoBagInst(player, key) || tryMergeBagInstIntoIc1BagKey(player, key)) {
            /* baginst <-> ic1bag для той же надетой сумки */
        } else {
            player._bagStorageByKey[key] = padBagStorage([]);
        }
    }
    player._bagContentsFull = player._bagStorageByKey[key];
}

global.initPlayerBagStorageEmpty = function (player) {
    if (!mp.players.exists(player)) return;
    player._bagStorageByKey = {};
    player._bagContentsFull = padBagStorage([]);
    player._bagContentsRaw = null;
    player.bagContents = [];
    try {
        player._donateBagInstByDrawableKey = {};
        player._donateBagInstIdToDt = {};
    } catch (_e) {}
};

function pedIvBagKey(player) {
    try {
        if (!mp.players.exists(player)) return null;
        const c = player.getClothes(5);
        if (!c || Number(c.drawable) === 0) return null;
        const d = Number(c.drawable);
        const t = Number(c.texture);
        if (typeof global.ivBagKeyForDrawableTexture === 'function') {
            return global.ivBagKeyForDrawableTexture(d, t);
        }
    } catch (_e) {}
    return null;
}

global.getIvBagKeyFromToken = function (tok) {
    const s = String(tok || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .split('(')[0]
        .trim();
    if (!s.startsWith('ivbag:')) return null;
    const k = s.slice(6);
    return global.DONATE_BAGS_REGISTRY && global.DONATE_BAGS_REGISTRY[k] ? k : null;
};

/** Быстрый decode ic1 (только для подсчёта сумок; inventory_equipment грузится раньше этого файла). */
function decodeIc1QuickForBagCount(s) {
    if (typeof s !== 'string' || !s.startsWith('ic1.')) return null;
    try {
        return JSON.parse(Buffer.from(s.slice(4), 'base64').toString('utf8'));
    } catch (_e) {
        return null;
    }
}

/** Сколько донат-сумок у игрока: надета по телу или лежит в сетке / быстрых слотах (ivbag из реестра + ic1 донат-сумка). */
global.countPlayerIvBags = function (player) {
    if (!mp.players.exists(player)) return 0;
    let n = 0;
    const peek =
        typeof global.peekUnequipTokenForBagSlot === 'function' ? global.peekUnequipTokenForBagSlot(player) : null;
    if (peek && !peek.isEmpty && peek.token) {
        const t = String(peek.token).split('(')[0].trim();
        if (t.startsWith('ivbag:') && global.getIvBagKeyFromToken(peek.token)) n++;
        else if (t.startsWith('ic1.') && typeof global.ivBagKeyForDrawableTexture === 'function') {
            const pl = decodeIc1QuickForBagCount(t);
            if (
                pl &&
                Number(pl.cid) === 8 &&
                global.ivBagKeyForDrawableTexture(Number(pl.d), Number(pl.t))
            )
                n++;
        }
    }
    const scanIvbag = (arr) => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
            if (global.getIvBagKeyFromToken(arr[i])) n++;
        }
    };
    scanIvbag(player.inventory);
    scanIvbag(player.fastSlots);
    return n;
};

global.ensureInventoryGrid50 = function (player) {
    if (!mp.players.exists(player)) return;
    if (!Array.isArray(player.inventory)) player.inventory = [];
    const cleaned = player.inventory.map((x) => {
        if (x == null || x === '') return null;
        if (x === 1 || x === '1') return 'weapon_revolver';
        return typeof x === 'string' ? x : String(x);
    });
    let grid;
    if (cleaned.length === INV_GRID_SIZE) {
        let ok = true;
        grid = new Array(INV_GRID_SIZE);
        for (let i = 0; i < INV_GRID_SIZE; i++) {
            const v = cleaned[i];
            if (v != null && typeof v !== 'string') {
                ok = false;
                break;
            }
            grid[i] = v == null || v === '' ? null : v;
        }
        if (ok) {
            player.inventory = grid;
            return;
        }
    }
    // Не сжимать в начало: в БД часто массив короче 50 без хвостовых null — индексы = слоты сетки.
    grid = new Array(INV_GRID_SIZE).fill(null);
    const nHead = Math.min(cleaned.length, INV_GRID_SIZE);
    for (let i = 0; i < nHead; i++) {
        const v = cleaned[i];
        grid[i] = v == null || v === '' ? null : v;
    }
    if (cleaned.length > INV_GRID_SIZE) {
        for (let i = INV_GRID_SIZE; i < cleaned.length; i++) {
            const it = cleaned[i];
            if (it == null || it === '') continue;
            let empty = -1;
            for (let k = 0; k < INV_GRID_SIZE; k++) {
                if (grid[k] == null || grid[k] === '') {
                    empty = k;
                    break;
                }
            }
            if (empty < 0) break;
            grid[empty] = it;
        }
    }
    player.inventory = grid;
};

global.ensureInventoryGrid20 = global.ensureInventoryGrid50;

global.invGridUsedCount = function (player) {
    if (!Array.isArray(player.inventory)) return 0;
    let n = 0;
    for (let i = 0; i < INV_GRID_SIZE; i++) {
        const x = player.inventory[i];
        if (x != null && x !== '') n++;
    }
    return n;
};

global.invGridFirstEmpty = function (player) {
    if (!Array.isArray(player.inventory)) return -1;
    global.ensureInventoryGrid50(player);
    for (let i = 0; i < INV_GRID_SIZE; i++) {
        const x = player.inventory[i];
        if (x == null || x === '') return i;
    }
    return -1;
};

global.invGridTryPush = function (player, item) {
    if (!mp.players.exists(player)) return false;
    global.ensureInventoryGrid50(player);
    const idx = global.invGridFirstEmpty(player);
    if (idx < 0) return false;
    player.inventory[idx] = item;
    return true;
};

/** Один револьвер: в сетке, быстром слоте или сумке. */
global.dedupeRevolverGrid = function (player) {
    if (!mp.players.exists(player)) return;
    global.ensureInventoryGrid50(player);
    let revolverInFast = false;
    if (Array.isArray(player.fastSlots)) {
        for (let s = 0; s < player.fastSlots.length; s++) {
            const fs = player.fastSlots[s];
            if (fs && String(fs).split('(')[0].trim() === 'weapon_revolver') revolverInFast = true;
        }
    }
    const revolverInBag = playerBagHasDefaultRevolver(player);
    let seen = false;
    for (let i = 0; i < INV_GRID_SIZE; i++) {
        const x = player.inventory[i];
        if (!x) continue;
        if (String(x).split('(')[0].trim() !== 'weapon_revolver') continue;
        if (seen || revolverInFast || revolverInBag) player.inventory[i] = null;
        seen = true;
    }
    if (!seen && !revolverInFast && !revolverInBag) {
        const emp = global.invGridFirstEmpty(player);
        if (emp >= 0) player.inventory[emp] = 'weapon_revolver';
    }
};

global.getInventoryMaxSlots = function () {
    return INV_GRID_SIZE;
};

global.getInventoryUsedSlots = function (player) {
    return global.invGridUsedCount(player);
};

global.getInventoryBagBonusExtra = function () {
    return 0;
};

global.getActiveIvBagKey = function (player) {
    return pedIvBagKey(player);
};

/** Внутренние слоты сумки по надетому компоненту 5 (ic1 из DP и ivbag — одинаково по drawable:texture). */
global.getActiveBagCapacity = function (player) {
    if (!mp.players.exists(player)) return 0;
    try {
        if (typeof global.getBagInnerCapacityFromPedSlot5 === 'function') {
            return global.getBagInnerCapacityFromPedSlot5(player) || 0;
        }
    } catch (_e) {}
    return 0;
};

global.getActiveBagTitle = function (player) {
    if (typeof global.getBagPanelTitleFromEquip === 'function') {
        const t = global.getBagPanelTitleFromEquip(player);
        if (t) return t;
    }
    const k = pedIvBagKey(player);
    if (!k) return 'Сумка';
    const reg = global.DONATE_BAGS_REGISTRY;
    return reg && reg[k] && reg[k].name ? reg[k].name : 'Сумка';
};

function parseJsonArray(raw) {
    if (raw == null || raw === '') return [];
    try {
        const a = JSON.parse(String(raw));
        return Array.isArray(a) ? a : [];
    } catch (_e) {
        return [];
    }
}

global.syncBagContentsArrayToCapacity = function (player) {
    if (!mp.players.exists(player)) return;
    if (typeof global.isPlayerTrunkOpen === 'function' && global.isPlayerTrunkOpen(player)) {
        const cap = global.getActiveBagCapacity(player) || 0;
        if (cap <= 0) {
            player.bagContents = [];
            return;
        }
        const sess = player._trunkSession;
        if (sess && Array.isArray(sess.slotsFull)) {
            player._bagContentsFull = sess.slotsFull;
            while (sess.slotsFull.length < cap) sess.slotsFull.push(null);
            if (sess.slotsFull.length > cap) sess.slotsFull.length = cap;
        }
        player.bagContents = Array.isArray(player._bagContentsFull)
            ? player._bagContentsFull.slice(0, cap)
            : new Array(cap).fill(null);
        return;
    }
    ensurePlayerBagStorageFromPlayer(player);
    const cap = global.getActiveBagCapacity(player);
    if (cap <= 0) {
        /** Нет надетой сумки — панель скрыта, но _bagContentsFull не очищаем (смена фракции / рестарт). */
        player.bagContents = [];
        return;
    }
    player.bagContents = player._bagContentsFull.slice(0, cap);
};

global.hydrateInventoryMetaFromDbRow = function (player, row) {
    if (!mp.players.exists(player)) return;
    player._bagContentsRaw = row && row.bag_contents != null ? row.bag_contents : null;
    player._bagStorageByKey = {};
    try {
        player._donateBagInstByDrawableKey = {};
        player._donateBagInstIdToDt = {};
    } catch (_eDk) {}
    const raw = row && row.bag_contents != null ? row.bag_contents : null;
    try {
        const parsed = raw != null ? JSON.parse(String(raw)) : null;
        if (Array.isArray(parsed)) {
            player._bagStorageByKey.__legacy__ = padBagStorage(parsed);
        } else if (parsed && typeof parsed === 'object' && parsed.v === 2 && parsed.bags && typeof parsed.bags === 'object') {
            for (const [k, arr] of Object.entries(parsed.bags)) {
                player._bagStorageByKey[String(k)] = padBagStorage(Array.isArray(arr) ? arr : []);
            }
        }
    } catch (_e) {
        player._bagStorageByKey.__legacy__ = padBagStorage([]);
    }
    if (Object.keys(player._bagStorageByKey).length === 0) {
        player._bagStorageByKey.__legacy__ = padBagStorage([]);
    }
    player._bagContentsFull = padBagStorage([]);
    try {
        player.invSlotBinds =
            row && row.inv_slot_binds && String(row.inv_slot_binds).trim()
                ? JSON.parse(String(row.inv_slot_binds))
                : {};
        if (!player.invSlotBinds || typeof player.invSlotBinds !== 'object') player.invSlotBinds = {};
    } catch (_e) {
        player.invSlotBinds = {};
    }
    global.ensureInventoryGrid50(player);
    global.syncBagContentsArrayToCapacity(player);
};

global.serializeBagContentsForDb = function (player) {
    if (!mp.players.exists(player)) return JSON.stringify({ v: 2, bags: {} });
    ensurePlayerBagStorageFromPlayer(player);
    if (!player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') player._bagStorageByKey = {};
    const out = {};
    for (const [k, arr] of Object.entries(player._bagStorageByKey)) {
        if (String(k).startsWith('baginst:')) continue;
        out[k] = padBagStorage(Array.isArray(arr) ? arr : []);
    }
    return JSON.stringify({ v: 2, bags: out });
};

/**
 * Содержимое donate-сумок с bagInst хранится в donate_bag_instances.contents (следует за владельцем),
 * а не в accounts.bag_contents — иначе при трейде/луте лутер не видит предметы.
 */
global.persistDonateBagInstanceContentsToTable = function (player, done) {
    if (!mp.players.exists(player) || !player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') {
        if (typeof done === 'function') done();
        return;
    }
    const staticId = player.static;
    if (staticId == null) {
        if (typeof done === 'function') done();
        return;
    }
    ensurePlayerBagStorageFromPlayer(player);
    const tasks = [];
    for (const [k, arr] of Object.entries(player._bagStorageByKey)) {
        if (!String(k).startsWith('baginst:')) continue;
        const id = parseInt(String(k).slice(8), 10);
        if (!Number.isInteger(id) || id <= 0) continue;
        tasks.push({
            id,
            json: JSON.stringify(padBagStorage(Array.isArray(arr) ? arr : []))
        });
    }
    if (tasks.length === 0) {
        if (typeof done === 'function') done();
        return;
    }
    let i = 0;
    function runNext() {
        if (i >= tasks.length) {
            if (typeof done === 'function') done();
            return;
        }
        const t = tasks[i++];
        global.DB.query(
            'UPDATE donate_bag_instances SET contents = ? WHERE id = ? AND account_static = ?',
            [t.json, t.id, staticId],
            () => runNext()
        );
    }
    runNext();
};

/** Один экземпляр (перед удалением ключа из памяти при дропе/трейде). */
global.persistSingleDonateBagInstanceContents = function (player, bagInstId) {
    if (!mp.players.exists(player) || !player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') return;
    const staticId = player.static;
    const id = parseInt(String(bagInstId), 10);
    if (!Number.isInteger(id) || id <= 0 || staticId == null) return;
    const key = `baginst:${id}`;
    const arr = player._bagStorageByKey[key];
    const json = JSON.stringify(padBagStorage(Array.isArray(arr) ? arr : []));
    global.DB.query(
        'UPDATE donate_bag_instances SET contents = ? WHERE id = ? AND account_static = ?',
        [json, id, staticId],
        () => {}
    );
};

/** После SELECT экземпляров сумок аккаунта — подмешать contents в _bagStorageByKey (приоритетнее пустого). */
global.mergeDonateBagInstanceContentsFromDb = function (player, rows, opts) {
    if (!mp.players.exists(player) || !Array.isArray(rows) || rows.length === 0) return;
    if (!player._bagStorageByKey || typeof player._bagStorageByKey !== 'object') player._bagStorageByKey = {};
    const appendOnly = opts && opts.appendOnly === true;
    if (!appendOnly) {
        try {
            player._donateBagInstByDrawableKey = {};
            player._donateBagInstIdToDt = {};
        } catch (_mk) {}
    } else {
        try {
            if (!player._donateBagInstByDrawableKey || typeof player._donateBagInstByDrawableKey !== 'object')
                player._donateBagInstByDrawableKey = {};
            if (!player._donateBagInstIdToDt || typeof player._donateBagInstIdToDt !== 'object')
                player._donateBagInstIdToDt = {};
        } catch (_mkA) {}
    }
    const forceFromDb = opts && opts.forceFromDb === true;
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const id = row && row.id != null ? parseInt(String(row.id), 10) : NaN;
        if (!Number.isInteger(id) || id <= 0) continue;
        const key = `baginst:${id}`;
        try {
            if (row && row.drawable != null && row.texture != null) {
                const d = parseInt(String(row.drawable), 10);
                const t = parseInt(String(row.texture), 10);
                if (Number.isFinite(d) && Number.isFinite(t)) {
                    const dk = `${d}:${t}`;
                    player._donateBagInstIdToDt[String(id)] = dk;
                    if (player._donateBagInstByDrawableKey[dk] == null) player._donateBagInstByDrawableKey[dk] = id;
                }
            }
        } catch (_mapE) {}
        let merged = false;
        if (row.contents != null && String(row.contents).trim() !== '') {
            try {
                const parsed = JSON.parse(String(row.contents));
                if (Array.isArray(parsed)) {
                    player._bagStorageByKey[key] = padBagStorage(parsed);
                    merged = true;
                }
            } catch (_e) {}
        }
        if (!merged && forceFromDb) {
            const ex = player._bagStorageByKey[key];
            if (!bagStorageKeyHasAnyItems(ex)) player._bagStorageByKey[key] = padBagStorage([]);
            merged = true;
        }
        if (!merged && player._bagStorageByKey[key] == null) {
            player._bagStorageByKey[key] = padBagStorage([]);
        }
    }
    try {
        global.syncBagContentsArrayToCapacity(player);
    } catch (_e2) {}
};

/**
 * При первом получении bagInst перенести предметы с общего ключа (ic1bag:/bagped:) в baginst:{id},
 * чтобы две одинаковые сумки без inst не делили один «карман».
 */
global.migrateSharedDonateBagSlotsIntoBagInstKey = function (player, insertId, payload) {
    if (!mp.players.exists(player) || !payload || !player._bagStorageByKey || typeof player._bagStorageByKey !== 'object')
        return;
    const sid = player.static != null ? String(player.static) : '0';
    const newKey = `baginst:${insertId}`;
    const dest = player._bagStorageByKey[newKey];
    if (Array.isArray(dest) && dest.some((x) => x != null && x !== '')) return;
    const cid = Number(payload.cid);
    const d = Number(payload.d);
    const t = Number.isFinite(Number(payload.t)) ? Number(payload.t) : 0;
    const iid = Number.isFinite(Number(payload.iid)) ? Number(payload.iid) : 0;
    if (Number(cid) !== 8 || !Number.isFinite(d)) return;
    const legacyKeys = [`ic1bag:${cid}:${iid}:${d}:${t}:s${sid}`, `bagped:${d}:${t}:s${sid}`];
    for (let i = 0; i < legacyKeys.length; i++) {
        const lk = legacyKeys[i];
        const src = player._bagStorageByKey[lk];
        if (!Array.isArray(src) || src.every((x) => x == null || x === '')) continue;
        player._bagStorageByKey[newKey] = padBagStorage(src.slice());
        for (let j = 0; j < legacyKeys.length; j++) {
            try {
                delete player._bagStorageByKey[legacyKeys[j]];
            } catch (_eD) {}
        }
        break;
    }
};

/**
 * Перечитать donate_bag_instances аккаунта в _bagStorageByKey (трейд/лут без релога — иначе save затирает contents).
 */
global.refreshPlayerDonateBagInstancesFromDb = function (player, cb) {
    if (!mp.players.exists(player)) {
        if (typeof cb === 'function') cb();
        return;
    }
    const sid = player.static;
    if (sid == null) {
        if (typeof cb === 'function') cb();
        return;
    }
    global.DB.query(
        'SELECT id, contents, drawable, texture FROM donate_bag_instances WHERE account_static = ?',
        [sid],
        (err, rows) => {
            if (
                err &&
                (err.code === 'ER_BAD_FIELD_ERROR' || /unknown column/i.test(String(err.message || err.sqlMessage || '')))
            ) {
                global.DB.query(
                    'SELECT id, contents FROM donate_bag_instances WHERE account_static = ?',
                    [sid],
                    (err2, rows2) => {
                        if (!mp.players.exists(player)) {
                            if (typeof cb === 'function') cb();
                            return;
                        }
                        if (!err2 && rows2 && rows2.length && typeof global.mergeDonateBagInstanceContentsFromDb === 'function') {
                            global.mergeDonateBagInstanceContentsFromDb(player, rows2, { forceFromDb: true });
                        }
                        if (typeof cb === 'function') cb();
                    }
                );
                return;
            }
            if (!mp.players.exists(player)) {
                if (typeof cb === 'function') cb();
                return;
            }
            if (!err && rows && rows.length && typeof global.mergeDonateBagInstanceContentsFromDb === 'function') {
                global.mergeDonateBagInstanceContentsFromDb(player, rows, { forceFromDb: true });
            }
            if (typeof cb === 'function') cb();
        }
    );
};

global.serializeInvSlotBindsForDb = function (player) {
    try {
        return JSON.stringify(player.invSlotBinds && typeof player.invSlotBinds === 'object' ? player.invSlotBinds : {});
    } catch (_e) {
        return '{}';
    }
};

global.buildBagPanelSnap = function (player) {
    const cap = global.getActiveBagCapacity(player);
    if (cap <= 0) return null;
    global.syncBagContentsArrayToCapacity(player);
    return {
        title: global.getActiveBagTitle(player),
        capacity: cap,
        slots: player.bagContents.slice()
    };
};

function playerHasBagBonusCompat(player) {
    return global.getActiveBagCapacity(player) > 0;
}

global.playerHasBagBonusCompat = playerHasBagBonusCompat;

mp.events.add('inventory:swapGrid', (player, ia, ib) => {
    try {
        if (!mp.players.exists(player) || !takeInvGridLock(player)) return;
        const a = parseInt(ia, 10);
        const b = parseInt(ib, 10);
        if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return;
        if (a < 0 || a >= INV_GRID_SIZE || b < 0 || b >= INV_GRID_SIZE) return;
        global.ensureInventoryGrid50(player);
        const ta = player.inventory[a];
        const tb = player.inventory[b];
        player.inventory[a] = tb != null && tb !== '' ? tb : null;
        player.inventory[b] = ta != null && ta !== '' ? ta : null;
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    } catch (_e) {}
});

/** Перенос части стака расходника на пустую ячейку сетки (Ctrl+перетаскивание). */
mp.events.add('inventory:gridSplitMove', (player, fromRaw, toRaw, qtyRaw) => {
    try {
        if (!mp.players.exists(player) || !takeInvGridLock(player)) return;
        const from = parseInt(fromRaw, 10);
        const to = parseInt(toRaw, 10);
        const qty = parseInt(qtyRaw, 10);
        if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
        if (from < 0 || from >= INV_GRID_SIZE || to < 0 || to >= INV_GRID_SIZE) return;
        if (!Number.isInteger(qty) || qty < 1) return;
        global.ensureInventoryGrid50(player);
        const src = player.inventory[from];
        const dst = player.inventory[to];
        if (src == null || src === '') return;
        if (dst != null && dst !== '') return;
        const base = String(src).split('(')[0].trim();
        if (!isGridConsumableStackBase(base)) return;
        const stackQty = parseBagConsumStackQty(src);
        if (stackQty <= 1 || qty >= stackQty) return;
        player.inventory[to] = qty === 1 ? base : `${base} (${qty})`;
        const rem = stackQty - qty;
        player.inventory[from] = rem <= 0 ? null : rem === 1 ? base : `${base} (${rem})`;
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    } catch (_e) {}
});

mp.events.add('inventory:mergeGridStack', (player, fromRaw, toRaw) => {
    try {
        if (!mp.players.exists(player) || !takeInvGridLock(player)) return;
        const from = parseInt(fromRaw, 10);
        const to = parseInt(toRaw, 10);
        if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
        if (from < 0 || from >= INV_GRID_SIZE || to < 0 || to >= INV_GRID_SIZE) return;
        global.ensureInventoryGrid50(player);
        const src = player.inventory[from];
        const dst = player.inventory[to];
        if (src == null || src === '' || dst == null || dst === '') return;
        const base = String(src).split('(')[0].trim();
        if (!isGridConsumableStackBase(base)) return;
        if (base !== String(dst).split('(')[0].trim()) return;
        const srcQty = parseBagConsumStackQty(src);
        const dstQty = parseBagConsumStackQty(dst);
        const max = base === MATERIALS_ITEM ? MATERIALS_STACK_MAX : CONSUMABLE_STACK_MAX;
        const room = Math.max(0, max - dstQty);
        if (room <= 0) return;
        const move = Math.min(room, srcQty);
        const nextDst = dstQty + move;
        const remSrc = srcQty - move;
        player.inventory[to] = nextDst === 1 ? base : `${base} (${nextDst})`;
        player.inventory[from] = remSrc <= 0 ? null : remSrc === 1 ? base : `${base} (${remSrc})`;
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    } catch (_e) {}
});

mp.events.add('inventory:moveToBag', (player, invSlot, bagIdx, qtyRaw) => {
    try {
        if (!mp.players.exists(player) || !takeInvGridLock(player)) return;
        const fi = parseInt(invSlot, 10);
        const bi = parseInt(bagIdx, 10);
        const reqQty = parseMoveFromBagQtyRaw(qtyRaw);
        if (!Number.isInteger(fi) || fi < 0 || fi >= INV_GRID_SIZE) return;
        global.ensureInventoryGrid50(player);
        global.syncBagContentsArrayToCapacity(player);
        const cap = global.getActiveBagCapacity(player);
        if (cap <= 0 || !Number.isInteger(bi) || bi < 0 || bi >= cap) return;
        const item = player.inventory[fi];
        if (item == null || item === '') return;
        const base = String(item).split('(')[0].trim().split('#')[0].trim();
        if (isDefaultRevolverBase(base)) {
            if (typeof global.isNotify === 'function') {
                global.isNotify(
                    player,
                    2,
                    'top-mid',
                    'Стандартный револьвер нельзя класть в сумку. Используйте быстрый слот.',
                    3500
                );
            }
            return;
        }
        if (global.getIvBagKeyFromToken(item)) {
            if (typeof global.isNotify === 'function')
                global.isNotify(player, 2, 'top-mid', 'Сумку нельзя класть внутрь сумки.', 3000);
            return;
        }
        if (player.bagContents[bi] != null && player.bagContents[bi] !== '') return;
        ensurePlayerBagStorageFromPlayer(player);
        const isConsum = isGridConsumableStackBase(base);

        if (!isConsum) {
            if (Number.isInteger(reqQty) && reqQty > 0) return;
            player._bagContentsFull[bi] = item;
            player.inventory[fi] = null;
        } else {
            const stackQty = parseBagConsumStackQty(item);
            let moveQty = stackQty;
            if (Number.isInteger(reqQty) && reqQty > 0) moveQty = Math.min(reqQty, stackQty);
            if (moveQty <= 0) return;
            if (moveQty >= stackQty) {
                player._bagContentsFull[bi] = item;
                player.inventory[fi] = null;
            } else {
                player._bagContentsFull[bi] = moveQty === 1 ? base : `${base} (${moveQty})`;
                const rem = stackQty - moveQty;
                player.inventory[fi] = rem <= 0 ? null : rem === 1 ? base : `${base} (${rem})`;
            }
        }

        global.syncBagContentsArrayToCapacity(player);
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    } catch (_e) {}
});

mp.events.add('inventory:moveFromBag', (player, bagIdx, toInv, qtyRaw) => {
    try {
        if (!mp.players.exists(player) || !takeInvGridLock(player)) return;
        const bi = parseInt(bagIdx, 10);
        const ti = parseInt(toInv, 10);
        const reqQty = parseMoveFromBagQtyRaw(qtyRaw);
        global.syncBagContentsArrayToCapacity(player);
        ensurePlayerBagStorageFromPlayer(player);
        const cap = global.getActiveBagCapacity(player);
        if (cap <= 0 || !Number.isInteger(bi) || bi < 0 || bi >= cap) return;
        const item = player._bagContentsFull[bi];
        if (item == null || item === '') return;
        global.ensureInventoryGrid50(player);
        const base = String(item).split('(')[0].trim().split('#')[0].trim();
        const isConsum = isGridConsumableStackBase(base);

        if (!isConsum) {
            if (Number.isInteger(ti) && ti >= 0 && ti < INV_GRID_SIZE) {
                if (player.inventory[ti] != null && player.inventory[ti] !== '') return;
                player.inventory[ti] = item;
            } else {
                const empty = global.invGridFirstEmpty(player);
                if (empty < 0) {
                    if (typeof global.isNotify === 'function')
                        global.isNotify(player, 2, 'top-mid', 'Инвентарь полон.', 3000);
                    return;
                }
                player.inventory[empty] = item;
            }
            player._bagContentsFull[bi] = null;
            global.syncBagContentsArrayToCapacity(player);
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            return;
        }

        const stackQty = parseBagConsumStackQty(item);
        let takeQty = stackQty;
        if (Number.isInteger(reqQty) && reqQty > 0) takeQty = Math.min(reqQty, stackQty);
        if (takeQty <= 0) return;

        const invSlotEmpty =
            Number.isInteger(ti) && ti >= 0 && ti < INV_GRID_SIZE && (player.inventory[ti] == null || player.inventory[ti] === '');

        if (takeQty >= stackQty && invSlotEmpty) {
            player.inventory[ti] = item;
            player._bagContentsFull[bi] = null;
        } else if (takeQty >= stackQty) {
            if (!mergeConsumableQtyIntoGrid(player, base, stackQty)) {
                if (typeof global.isNotify === 'function')
                    global.isNotify(player, 2, 'top-mid', 'Нельзя вместить в инвентарь, нет места.', 3500);
                return;
            }
            player._bagContentsFull[bi] = null;
        } else {
            if (!mergeConsumableQtyIntoGrid(player, base, takeQty)) {
                if (typeof global.isNotify === 'function')
                    global.isNotify(player, 2, 'top-mid', 'Нельзя вместить в инвентарь, нет места.', 3500);
                return;
            }
            const rem = stackQty - takeQty;
            player._bagContentsFull[bi] = rem <= 0 ? null : rem === 1 ? base : `${base} (${rem})`;
        }

        global.syncBagContentsArrayToCapacity(player);
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    } catch (_e) {}
});

mp.events.add('inventory:swapBagSlots', (player, i, j) => {
    try {
        if (!mp.players.exists(player) || !takeInvGridLock(player)) return;
        const a = parseInt(i, 10);
        const b = parseInt(j, 10);
        global.syncBagContentsArrayToCapacity(player);
        const cap = global.getActiveBagCapacity(player);
        if (cap <= 0 || a === b) return;
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= cap || b >= cap) return;
        const ta = player._bagContentsFull[a];
        const tb = player._bagContentsFull[b];
        player._bagContentsFull[a] = tb != null && tb !== '' ? tb : null;
        player._bagContentsFull[b] = ta != null && ta !== '' ? ta : null;
        global.syncBagContentsArrayToCapacity(player);
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    } catch (_e) {}
});

function inventoryTokenIsClothingForHotkey(raw) {
    const base = String(raw || '').split('(')[0].trim().split('#')[0].trim();
    return (
        base.startsWith('ic1.') ||
        base.startsWith('frdef:') ||
        base.startsWith('ivhol:') ||
        base.startsWith('ivbag:')
    );
}

global.sanitizeClothingSlotBinds = function (player) {
    if (!player || !mp.players.exists(player)) return false;
    if (!player.invSlotBinds || typeof player.invSlotBinds !== 'object') return false;
    let changed = false;
    for (const key of Object.keys(player.invSlotBinds)) {
        const idx = Number(key);
        if (!Number.isInteger(idx) || idx < 0 || idx >= INV_GRID_SIZE) {
            delete player.invSlotBinds[key];
            changed = true;
            continue;
        }
        if (inventoryTokenIsClothingForHotkey(Array.isArray(player.inventory) ? player.inventory[idx] : null)) {
            delete player.invSlotBinds[key];
            changed = true;
        }
    }
    return changed;
};

mp.events.add('inventory:setSlotBind', (player, slotStr, payloadJson) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !takeInvGridLock(player)) return;
        const idx = parseInt(slotStr, 10);
        if (!Number.isInteger(idx) || idx < 0 || idx >= INV_GRID_SIZE) return;
        let pl = null;
        try {
            pl = JSON.parse(String(payloadJson || '{}'));
        } catch (_e) {
            pl = null;
        }
        if (!pl || typeof pl !== 'object') return;
        if (!player.invSlotBinds || typeof player.invSlotBinds !== 'object') player.invSlotBinds = {};
        if (pl.clear === true || pl.label == null) {
            delete player.invSlotBinds[String(idx)];
        } else {
            global.ensureInventoryGrid50(player);
            if (inventoryTokenIsClothingForHotkey(player.inventory[idx])) {
                delete player.invSlotBinds[String(idx)];
                isNotify(player, 2, 'top-mid', 'Одежду нельзя привязывать к клавишам.', 3000);
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                return;
            }
            const newCode = Number(pl.code);
            if (Number.isFinite(newCode)) {
                for (const k of Object.keys(player.invSlotBinds)) {
                    if (k === String(idx)) continue;
                    const ent = player.invSlotBinds[k];
                    if (ent && Number(ent.code) === newCode) delete player.invSlotBinds[k];
                }
            }
            player.invSlotBinds[String(idx)] = { label: String(pl.label), code: pl.code, type: pl.type || 'key' };
        }
        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    } catch (_e) {}
});

const INV_GRID_LOCK_MS = 120;
function takeInvGridLock(player) {
    if (!mp.players.exists(player)) return false;
    const now = Date.now();
    if (player._invGridLockUntil && now < player._invGridLockUntil) return false;
    player._invGridLockUntil = now + INV_GRID_LOCK_MS;
    return true;
}

mp.events.add('inventory:hotkeyUse', (player, slotStr) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const idx = parseInt(slotStr, 10);
        if (!Number.isInteger(idx) || idx < 0 || idx >= INV_GRID_SIZE) return;
        global.ensureInventoryGrid50(player);
        const it = player.inventory[idx];
        if (it == null || it === '') return;
        const baseRaw = String(it).split('(')[0].trim();
        const base = baseRaw.split('#')[0].trim();
        if (base.startsWith('weapon_')) {
            if (!global.takeInventoryActionLock || !global.takeInventoryActionLock(player)) return;
            if (typeof global.captCheckFastSlot === 'function' && global.captCheckFastSlot(player, it)) return;
            if (typeof global.bizwarCheckFastSlot === 'function' && global.bizwarCheckFastSlot(player, it)) return;
            global.removeOneInventoryExact(player, it);
            let placed = false;
            let fastSlotPlacedAt = -1;
            if (Array.isArray(player.fastSlots)) {
                for (let s = 0; s < 3; s++) {
                    if (!player.fastSlots[s] || String(player.fastSlots[s]).trim() === '') {
                        player.fastSlots[s] = it;
                        placed = true;
                        fastSlotPlacedAt = s;
                        break;
                    }
                }
            }
            if (!placed) {
                global.invGridTryPush(player, it);
            } else {
                player.lastGiveGunTime = 0;
                if (typeof global.equipFastSlotWeapon === 'function') {
                    global.equipFastSlotWeapon(player, fastSlotPlacedAt, { skipMenuBlock: true });
                } else {
                    try {
                        const weaponMods = require('./config/weapon_mods.js');
                        const hash = mp.joaat(weaponMods.stripWeaponModSuffix(base)) >>> 0;
                        if (typeof global.metaAcGiveWeapon === 'function') global.metaAcGiveWeapon(player, hash, 9999, true, 'inv-grid');
                        else player.giveWeapon(hash, 9999, true);
                        player.call('givegun', hash, weaponMods.getWeaponModComponentsPayload(it));
                    } catch (_e2) {}
                }
            }
            global.saveInventory(player);
            if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            return;
        }
        if (base === 'item_spank' || base === 'item_alco' || base === 'item_spectrum_charm' || base === 'Бронежилет' || base === 'Аптечка') {
            mp.events.call('useConsumable:SERVER', player, baseRaw, 'grid', idx);
            return;
        }
        if (String(baseRaw).indexOf('agift:') === 0) {
            mp.events.call('useConsumable:SERVER', player, baseRaw, 'grid', idx);
            return;
        }
        if (base === 'item_bong') {
            mp.events.call('useBong:SERVER', player);
            return;
        }
        if (base === 'item_drone') {
            if (player.getVariable('droneActive') === true) {
                player.call('drone:forceStop', []);
                return;
            }
            player.call('drone:toggle:c', []);
            return;
        }
        if (base === 'item_thermos' || base === 'item_thermocup') {
            mp.events.call('useThermos:SERVER', player);
            return;
        }
        if (base === 'item_skateboard') {
            player.call('skateboard:hotkeyToggle:c', []);
            return;
        }
        if (inventoryTokenIsClothingForHotkey(it)) {
            if (player.invSlotBinds && typeof player.invSlotBinds === 'object') {
                delete player.invSlotBinds[String(idx)];
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
            }
            isNotify(player, 2, 'top-mid', 'Одежду нельзя использовать по привязанной клавише.', 3000);
            return;
        }
    } catch (_e) {}
});
