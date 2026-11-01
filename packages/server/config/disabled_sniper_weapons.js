'use strict';

const SNIPER_WEAPON_BASES = new Set([
    'weapon_sniperrifle',
    'weapon_heavysniper',
    'weapon_heavysniper_mk2',
    'weapon_marksmanrifle',
    'weapon_marksmanrifle_mk2',
    'weapon_precisionrifle',
]);

const HEAVY_SNIPER_BASES = new Set([
    'weapon_heavysniper',
    'weapon_heavysniper_mk2',
]);

function weaponTokenBase(token) {
    if (token == null || token === '') return '';
    const s = (typeof token === 'string' ? token : String(token)).trim().split('(')[0].trim().toLowerCase();
    return s;
}

function isSniperWeaponToken(token) {
    return SNIPER_WEAPON_BASES.has(weaponTokenBase(token));
}

function isSniperWeaponBase(base) {
    if (!base) return false;
    return SNIPER_WEAPON_BASES.has(String(base).trim().toLowerCase());
}

function isHeavySniperWeaponToken(token) {
    return HEAVY_SNIPER_BASES.has(weaponTokenBase(token));
}

function isHeavySniperWeaponBase(base) {
    if (!base) return false;
    return HEAVY_SNIPER_BASES.has(String(base).trim().toLowerCase());
}

function isHeavySniperWeaponHash(hash) {
    if (hash == null || typeof mp === 'undefined' || !mp.joaat) return false;
    const h = Number(hash) >>> 0;
    return h === (mp.joaat('weapon_heavysniper') >>> 0)
        || h === (mp.joaat('weapon_heavysniper_mk2') >>> 0);
}

function stripSnipersFromPlayerInventory(player) {
    if (!player) return false;
    let dirty = false;

    if (Array.isArray(player.inventory)) {
        const filtered = player.inventory.filter((it) => {
            if (it == null || it === '') return true;
            if (isSniperWeaponToken(it)) {
                dirty = true;
                return false;
            }
            return true;
        });
        if (dirty) player.inventory = filtered;
    }

    if (Array.isArray(player.fastSlots)) {
        player.fastSlots = player.fastSlots.map((slot) => {
            if (isSniperWeaponToken(slot)) {
                dirty = true;
                return '';
            }
            return slot == null ? '' : slot;
        });
    }

    return dirty;
}

function stripHeavySnipersFromPlayer(player) {
    if (!player) return false;
    let dirty = false;

    if (Array.isArray(player.inventory)) {
        const filtered = player.inventory.filter((it) => {
            if (it == null || it === '') return true;
            if (isHeavySniperWeaponToken(it)) {
                dirty = true;
                return false;
            }
            return true;
        });
        if (dirty) player.inventory = filtered;
    }

    if (Array.isArray(player.fastSlots)) {
        player.fastSlots = player.fastSlots.map((slot) => {
            if (isHeavySniperWeaponToken(slot)) {
                dirty = true;
                return '';
            }
            return slot == null ? '' : slot;
        });
    }

    return dirty;
}

function collectHeavySnipersFromPlayer(player) {
    const found = [];
    if (!player) return found;

    if (Array.isArray(player.fastSlots)) {
        for (let i = 0; i < player.fastSlots.length; i++) {
            const slot = player.fastSlots[i];
            if (isHeavySniperWeaponToken(slot)) {
                found.push(slot);
                player.fastSlots[i] = '';
            }
        }
    }

    if (Array.isArray(player.inventory)) {
        player.inventory = player.inventory.map((it) => {
            if (isHeavySniperWeaponToken(it)) {
                found.push(it);
                return null;
            }
            return it;
        });
    }

    return found;
}

function restoreHeavySnipersToPlayer(player, items) {
    if (!player || !Array.isArray(items) || !items.length) return;
    items.forEach((item) => {
        if (!item) return;
        if (typeof global.invGridTryPush === 'function') {
            global.invGridTryPush(player, item);
        }
    });
}

function getActiveWeaponBase(player) {
    if (!player) return '';
    const slot = player.getVariable ? player.getVariable('activeWeaponSlot') : player.activeWeaponSlot;
    if (slot == null || slot < 0 || slot >= 3) return '';
    const fast = Array.isArray(player.fastSlots) ? player.fastSlots : [];
    return weaponTokenBase(fast[slot]);
}

module.exports = {
    SNIPER_WEAPON_BASES,
    HEAVY_SNIPER_BASES,
    isSniperWeaponToken,
    isSniperWeaponBase,
    isHeavySniperWeaponToken,
    isHeavySniperWeaponBase,
    isHeavySniperWeaponHash,
    stripSnipersFromPlayerInventory,
    stripHeavySnipersFromPlayer,
    collectHeavySnipersFromPlayer,
    restoreHeavySnipersToPlayer,
    getActiveWeaponBase,
    weaponTokenBase,
};
