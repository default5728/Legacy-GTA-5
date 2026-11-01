'use strict';

const COMBAT_STACK_BASES = new Set(['item_spank', 'item_alco', 'Бронежилет', 'Аптечка']);
const COMBAT_ARMOR_ITEM = 'Бронежилет';
const COMBAT_SPANK_ITEM = 'item_spank';
const COMBAT_ALCO_ITEM = 'item_alco';

function parseStackEntry(entry) {
    const s = String(entry == null ? '' : entry).trim();
    const m = s.match(/^(.+?)\s*\((\d+)\)\s*$/);
    if (m) {
        const n = parseInt(m[2], 10);
        return { base: m[1].trim(), count: Number.isFinite(n) && n > 0 ? n : 0 };
    }
    if (!s) return { base: '', count: 0 };
    return { base: s, count: 1 };
}

function itemBaseName(item) {
    if (!item) return '';
    return String(item).split('(')[0].trim();
}

function syncPlayerItems(player) {
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    if (typeof global.syncBagContentsArrayToCapacity === 'function') global.syncBagContentsArrayToCapacity(player);
}

function forEachPlayerItem(player, fn) {
    syncPlayerItems(player);
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    for (let i = 0; i < inv.length; i++) {
        const e = inv[i];
        if (e != null && e !== '') fn(e);
    }
    const fs = Array.isArray(player.fastSlots) ? player.fastSlots : [];
    for (let i = 0; i < fs.length; i++) {
        if (fs[i]) fn(fs[i]);
    }
    const bag = Array.isArray(player.bagContents) ? player.bagContents : [];
    for (let i = 0; i < bag.length; i++) {
        if (bag[i]) fn(bag[i]);
    }
}

function countStackBaseOnPlayer(player, baseName) {
    let n = 0;
    forEachPlayerItem(player, (entry) => {
        const { base, count } = parseStackEntry(entry);
        if (base === baseName) n += count;
    });
    return n;
}

function formatStackEntry(base, count) {
    if (!base || count < 1) return null;
    if (count === 1) return base;
    return `${base} (${count})`;
}

function removeStackQtyFromPlayer(player, baseName, qty) {
    if (!mp.players.exists(player) || qty < 1) return false;
    let need = qty;
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    player.fastSlots = Array.isArray(player.fastSlots) ? player.fastSlots : ['', '', ''];

    for (let i = 0; i < player.inventory.length && need > 0; i++) {
        const { base, count } = parseStackEntry(player.inventory[i]);
        if (base !== baseName) continue;
        if (count <= need) {
            need -= count;
            player.inventory.splice(i, 1);
            i--;
        } else {
            player.inventory[i] = formatStackEntry(baseName, count - need);
            need = 0;
        }
    }
    for (let s = 0; s < player.fastSlots.length && need > 0; s++) {
        const slot = player.fastSlots[s];
        if (!slot) continue;
        const { base, count } = parseStackEntry(slot);
        if (base !== baseName) continue;
        if (count <= need) {
            need -= count;
            player.fastSlots[s] = '';
        } else {
            player.fastSlots[s] = formatStackEntry(baseName, count - need);
            need = 0;
        }
    }
    if (need > 0) {
        syncPlayerItems(player);
        const cap = typeof global.getActiveBagCapacity === 'function' ? global.getActiveBagCapacity(player) : 0;
        const bagFull = Array.isArray(player._bagContentsFull) ? player._bagContentsFull : [];
        for (let bi = 0; bi < cap && need > 0; bi++) {
            const entry = bagFull[bi];
            if (!entry) continue;
            const { base, count } = parseStackEntry(entry);
            if (base !== baseName) continue;
            if (count <= need) {
                need -= count;
                bagFull[bi] = null;
            } else {
                bagFull[bi] = formatStackEntry(baseName, count - need);
                need = 0;
            }
        }
    }
    if (need === 0) {
        if (typeof global.syncBagContentsArrayToCapacity === 'function') global.syncBagContentsArrayToCapacity(player);
        if (typeof global.saveInventory === 'function') global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    }
    return need === 0;
}

function combatItemBaseName(item) {
    if (!item || typeof item !== 'string') return '';
    return item.split('(')[0].trim();
}

function combatNormalizeWeaponBase(base) {
    return String(base || '').trim().toLowerCase();
}

function isCombatCaliberWeaponBase(base, weaponToCaliber) {
    const b = combatNormalizeWeaponBase(base);
    return b !== '' && Object.prototype.hasOwnProperty.call(weaponToCaliber, b);
}

function isCombatWeaponAllowedByCalibers(itemBase, calibers, weaponToCaliber) {
    const base = combatNormalizeWeaponBase(itemBase);
    if (!isCombatCaliberWeaponBase(base, weaponToCaliber)) return true;
    if (base === 'weapon_revolver') return true;
    const cal = weaponToCaliber[base];
    return cal !== undefined && calibers.includes(cal);
}

/** Общая проверка быстрых слотов для каптов и бизваров. */
function makeCombatFastSlotGuard(opts) {
    const inCombatVar = opts.inCombatVar;
    const weaponToCaliber = opts.weaponToCaliber || {};
    const getCalibers = typeof opts.getCalibers === 'function' ? opts.getCalibers : () => [];
    const onBlockNotify = typeof opts.onBlockNotify === 'function' ? opts.onBlockNotify : null;

    function checkFastSlot(player, item) {
        try {
            if (!player || !mp.players.exists(player)) return false;
            if (player.getVariable(inCombatVar) !== true) return false;
            if (!item) return false;
            const base = combatNormalizeWeaponBase(combatItemBaseName(item));
            const calibers = getCalibers(player) || [];
            if (base === 'weapon_revolver') {
                if (!calibers.includes('11.43mm')) {
                    if (onBlockNotify) onBlockNotify(player, 'Револьвер недоступен — калибр 11.43mm не выбран.');
                    return true;
                }
                return false;
            }
            if (!isCombatCaliberWeaponBase(base, weaponToCaliber)) return false;
            if (!isCombatWeaponAllowedByCalibers(base, calibers, weaponToCaliber)) {
                if (onBlockNotify) onBlockNotify(player, 'Нельзя! Это оружие не подходит по калибру.');
                return true;
            }
        } catch (_e) {}
        return false;
    }

    function isFastSlotWeaponAllowed(player, item) {
        try {
            if (!player || !mp.players.exists(player) || player.getVariable(inCombatVar) !== true) return true;
            const base = combatNormalizeWeaponBase(combatItemBaseName(item));
            const calibers = getCalibers(player) || [];
            if (base === 'weapon_revolver') return calibers.includes('11.43mm');
            if (!isCombatCaliberWeaponBase(base, weaponToCaliber)) return false;
            return isCombatWeaponAllowedByCalibers(base, calibers, weaponToCaliber);
        } catch (_e) {
            return false;
        }
    }

    return { checkFastSlot, isFastSlotWeaponAllowed };
}

function validateCombatJoinLoadout(player, opts) {
    if (!player || !mp.players.exists(player)) return { ok: false, msg: 'Игрок недоступен.' };

    const calibers = Array.isArray(opts.calibers) ? opts.calibers : [];
    const weaponToCaliber = opts.weaponToCaliber || {};
    const allowArmor = opts.allowArmor === true;
    const allowSpunk = opts.allowSpunk === true;
    const allowAlco = opts.allowAlco === true;
    const armorMax = Number.isFinite(opts.armorMax) ? opts.armorMax : 5;

    const weaponsFastSlotsOnly = opts.weaponsFastSlotsOnly === true;
    let forbiddenWeapon = false;
    if (weaponsFastSlotsOnly) {
        syncPlayerItems(player);
        const fs = Array.isArray(player.fastSlots) ? player.fastSlots : [];
        for (let i = 0; i < fs.length; i++) {
            if (forbiddenWeapon || !fs[i]) continue;
            const base = itemBaseName(fs[i]).toLowerCase();
            if (base === 'weapon_revolver') {
                if (calibers.length && !calibers.includes('11.43mm')) {
                    return { ok: false, msg: 'Уберите револьвер из быстрого слота — калибр 11.43mm не выбран.' };
                }
                continue;
            }
            if (!weaponToCaliber[base]) continue;
            const cal = weaponToCaliber[base];
            if (calibers.length && !calibers.includes(cal)) forbiddenWeapon = true;
        }
    } else {
        forEachPlayerItem(player, (entry) => {
            if (forbiddenWeapon || !entry) return;
            const base = itemBaseName(entry).toLowerCase();
            if (base === 'weapon_revolver') return;
            if (!weaponToCaliber[base]) return;
            const cal = weaponToCaliber[base];
            if (calibers.length && !calibers.includes(cal)) forbiddenWeapon = true;
        });
        if (calibers.length && !calibers.includes('11.43mm')) {
            syncPlayerItems(player);
            const fs = Array.isArray(player.fastSlots) ? player.fastSlots : [];
            for (let i = 0; i < fs.length; i++) {
                if (!fs[i]) continue;
                if (itemBaseName(fs[i]).toLowerCase() === 'weapon_revolver') {
                    return { ok: false, msg: 'Уберите револьвер из быстрого слота — калибр 11.43mm не выбран.' };
                }
            }
        }
    }
    if (forbiddenWeapon) {
        return {
            ok: false,
            msg: weaponsFastSlotsOnly
                ? 'В быстрых слотах запрещённое оружие.'
                : 'В инвентаре или сумке запрещённое оружие.'
        };
    }

    const armorInItems = countStackBaseOnPlayer(player, COMBAT_ARMOR_ITEM);
    const hasEquippedArmor = !!player.getVariable('armor');

    if (!allowArmor) {
        if (armorInItems > 0 || hasEquippedArmor) {
            return { ok: false, msg: 'У вас запрещённые предметы (броня).' };
        }
    } else {
        const armorCount = armorInItems + (hasEquippedArmor ? 1 : 0);
        if (armorCount > armorMax) {
            return { ok: false, msg: `У вас превышение кол-ва бронежилетов (макс ${armorMax}).` };
        }
    }

    if (!allowSpunk && countStackBaseOnPlayer(player, COMBAT_SPANK_ITEM) > 0) {
        return { ok: false, msg: 'У вас запрещённые предметы (спанк).' };
    }
    if (!allowAlco && countStackBaseOnPlayer(player, COMBAT_ALCO_ITEM) > 0) {
        return { ok: false, msg: 'У вас запрещённые предметы (алкоголь).' };
    }

    return { ok: true };
}

const COMBAT_WEAPON_HASH_BY_ITEM = {
    weapon_revolver: 'WEAPON_REVOLVER',
    weapon_revolver_mk2: 'WEAPON_REVOLVER_MK2',
    weapon_specialcarbine: 'WEAPON_SPECIALCARBINE',
    weapon_carbinerifle: 'WEAPON_CARBINERIFLE',
    weapon_minismg: 'WEAPON_MINISMG',
    weapon_heavysniper_mk2: 'WEAPON_HEAVYSNIPER_MK2',
    weapon_heavysniper: 'WEAPON_HEAVYSNIPER',
    weapon_heavyshotgun: 'WEAPON_HEAVYSHOTGUN',
    weapon_assaultshotgun: 'WEAPON_ASSAULTSHOTGUN'
};

/** Предпочтительное оружие в руках по выбранному калибру (Mk2 где есть). */
const CALIBER_PREFERRED_WEAPON_ITEM = {
    '7.62mm': 'weapon_specialcarbine',
    '5.56': 'weapon_minismg',
    '11.43mm': 'weapon_revolver_mk2',
    '.50mm': 'weapon_heavysniper_mk2',
    '12mm': 'weapon_heavyshotgun'
};

function combatWeaponHashFromItem(itemName) {
    const base = combatNormalizeWeaponBase(combatItemBaseName(itemName));
    const key = COMBAT_WEAPON_HASH_BY_ITEM[base];
    return key ? mp.joaat(key) : mp.joaat(combatItemBaseName(itemName) || 'WEAPON_UNARMED');
}

/**
 * Выдать оружие по калибрам в быстрые слоты и в руки (после stashCombatFastSlots).
 */
function applyCombatCaliberLoadout(player, options) {
    if (!mp.players.exists(player)) return;
    const opts = options && typeof options === 'object' ? options : {};
    const calibers = Array.isArray(opts.calibers) ? opts.calibers.filter((c) => typeof c === 'string') : [];
    const weaponToCaliber = opts.weaponToCaliber || {};
    if (!calibers.length) return;

    const items = [];
    for (let i = 0; i < calibers.length && items.length < 3; i++) {
        const cal = calibers[i];
        const pref = CALIBER_PREFERRED_WEAPON_ITEM[cal];
        if (pref && !items.includes(pref)) {
            items.push(pref);
            continue;
        }
        const list = opts.caliberToWeaponItems && opts.caliberToWeaponItems[cal];
        if (Array.isArray(list)) {
            for (let j = 0; j < list.length && items.length < 3; j++) {
                const w = list[j];
                if (w && !items.includes(w)) items.push(w);
            }
        }
    }
    if (!items.length) return;

    player.fastSlots = Array.isArray(player.fastSlots) ? [...player.fastSlots] : ['', '', ''];
    player.inventory = Array.isArray(player.inventory) ? [...player.inventory] : [];
    player.removeAllWeapons();

    const hashes = [];
    for (let slot = 0; slot < 3; slot++) {
        const itemName = items[slot] || '';
        player.fastSlots[slot] = itemName;
        if (!itemName) continue;
        const h = combatWeaponHashFromItem(itemName);
        hashes[slot] = h;
        if (typeof global.metaAcGiveWeapon === 'function') global.metaAcGiveWeapon(player, h, 9999, true, 'combat-loadout');
        else player.giveWeapon(h, 9999, true);
    }

    let firstIdx = 0;
    let firstHash = hashes[0] || 0;
    for (let i = 0; i < 3; i++) {
        if (items[i]) {
            firstIdx = i;
            firstHash = hashes[i];
            break;
        }
    }

    player.setVariable('activeWeaponSlot', firstIdx);
    player.setVariable('captWeaponHash', firstHash);
    if (firstHash) player.call('givegun', [firstHash]);

    try {
        if (typeof global.saveInventory === 'function') global.saveInventory(player);
        player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    } catch (_e) {}
}

module.exports = {
    COMBAT_STACK_BASES,
    COMBAT_ARMOR_ITEM,
    COMBAT_SPANK_ITEM,
    COMBAT_ALCO_ITEM,
    parseStackEntry,
    itemBaseName,
    combatItemBaseName,
    combatNormalizeWeaponBase,
    isCombatCaliberWeaponBase,
    isCombatWeaponAllowedByCalibers,
    makeCombatFastSlotGuard,
    forEachPlayerItem,
    countStackBaseOnPlayer,
    removeStackQtyFromPlayer,
    validateCombatJoinLoadout,
    combatWeaponHashFromItem,
    applyCombatCaliberLoadout,
    CALIBER_PREFERRED_WEAPON_ITEM
};
