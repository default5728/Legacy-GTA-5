'use strict';

const weaponData = require('../modules/attachment/weaponData.json');

const WEAPON_BY_HASHKEY = {};
for (const key of Object.keys(weaponData)) {
    const entry = weaponData[key];
    if (entry && entry.HashKey) WEAPON_BY_HASHKEY[entry.HashKey] = entry;
}

/** modKey → конфиг (суффикс в инвентаре, native-компонент, предмет-расходник). */
const WEAPON_MOD_DEFS = [
    {
        key: 'supp',
        suffix: '+supp',
        item: 'item_suppressor',
        label: 'глушитель',
        componentNames: ['Suppressor']
    },
    {
        key: 'flash',
        suffix: '+flash',
        item: 'item_flashlight',
        label: 'фонарик',
        componentNames: ['Flashlight']
    },
    {
        key: 'scope',
        suffix: '+scope',
        item: 'item_scope',
        label: 'прицел',
        componentNames: [
            'Medium Scope',
            'Scope',
            'Small Scope',
            'Large Scope',
            'Holographic Sight',
            'Advanced Scope',
            'Zoom Scope',
            'Night Vision Scope',
            'Thermal Scope'
        ]
    },
    {
        key: 'grip',
        suffix: '+grip',
        item: 'item_grip',
        label: 'рукоятка',
        componentNames: ['Grip']
    },
    {
        key: 'exmag',
        suffix: '+exmag',
        item: 'item_extendedclip',
        label: 'увел. маг.',
        componentNames: ['Extended Clip', 'Drum Magazine']
    }
];

const MOD_BY_KEY = {};
const MOD_BY_ITEM = {};
const MOD_BY_SUFFIX = {};
for (const def of WEAPON_MOD_DEFS) {
    MOD_BY_KEY[def.key] = def;
    MOD_BY_ITEM[def.item] = def;
    MOD_BY_SUFFIX[def.suffix] = def;
}

function weaponStemRaw(itemStr) {
    return String(itemStr == null ? '' : itemStr).trim().split('(')[0].trim();
}

function stripWeaponModSuffix(raw) {
    let s = weaponStemRaw(raw);
    let changed = true;
    while (changed) {
        changed = false;
        for (const def of WEAPON_MOD_DEFS) {
            if (s.endsWith(def.suffix)) {
                s = s.slice(0, -def.suffix.length);
                changed = true;
            }
        }
    }
    return s;
}

function parseAppliedModKeys(itemStr) {
    let s = weaponStemRaw(itemStr);
    const keys = [];
    let progress = true;
    while (progress) {
        progress = false;
        for (const def of WEAPON_MOD_DEFS) {
            if (s.endsWith(def.suffix)) {
                keys.unshift(def.key);
                s = s.slice(0, -def.suffix.length);
                progress = true;
                break;
            }
        }
    }
    return keys;
}

function weaponHasMod(itemStr, modKey) {
    const def = MOD_BY_KEY[modKey];
    if (!def) return false;
    return weaponStemRaw(itemStr).includes(def.suffix);
}

function weaponHasSuppressorMod(itemStr) {
    return weaponHasMod(itemStr, 'supp');
}

function findComponentHash(weaponBase, componentNames) {
    const norm = stripWeaponModSuffix(weaponBase).toLowerCase();
    if (!norm.startsWith('weapon_')) return 0;
    const hk = 'WEAPON_' + norm.slice(7).toUpperCase();
    const entry = WEAPON_BY_HASHKEY[hk];
    if (!entry || !entry.Components) return 0;
    const names = Array.isArray(componentNames) ? componentNames : [componentNames];
    for (const prefer of names) {
        for (const cid of Object.keys(entry.Components)) {
            const comp = entry.Components[cid];
            if (comp && comp.Name === prefer && comp.HashKey) {
                return mp.joaat(comp.HashKey) >>> 0;
            }
        }
    }
    return 0;
}

function weaponSupportsMod(weaponBase, modKey) {
    const def = MOD_BY_KEY[modKey];
    if (!def) return false;
    return findComponentHash(weaponBase, def.componentNames) !== 0;
}

function applyModToItem(itemStr, modKey) {
    const def = MOD_BY_KEY[modKey];
    if (!def) return itemStr;
    const base = stripWeaponModSuffix(itemStr);
    if (!base) return itemStr;
    if (weaponHasMod(itemStr, modKey)) return weaponStemRaw(itemStr);
    return weaponStemRaw(itemStr) + def.suffix;
}

function applySuppressorModToItem(itemStr) {
    return applyModToItem(itemStr, 'supp');
}

function getModDefByItem(itemId) {
    return MOD_BY_ITEM[String(itemId || '').trim()] || null;
}

function getWeaponItemModComponents(itemStr) {
    const comps = [];
    for (const key of parseAppliedModKeys(itemStr)) {
        const def = MOD_BY_KEY[key];
        if (!def) continue;
        const h = findComponentHash(itemStr, def.componentNames);
        if (h) comps.push(h);
    }
    return comps;
}

function getWeaponItemSuppressorComponent(itemStr) {
    if (!weaponHasMod(itemStr, 'supp')) return 0;
    return findComponentHash(itemStr, MOD_BY_KEY.supp.componentNames);
}

function findSuppressorComponentHash(weaponBase) {
    return findComponentHash(weaponBase, MOD_BY_KEY.supp.componentNames);
}

function weaponSupportsSuppressor(weaponBase) {
    return weaponSupportsMod(weaponBase, 'supp');
}

function getWeaponModComponentsPayload(itemStr) {
    return JSON.stringify(getWeaponItemModComponents(itemStr));
}

module.exports = {
    WEAPON_MOD_DEFS,
    stripWeaponModSuffix,
    parseAppliedModKeys,
    weaponHasMod,
    weaponHasSuppressorMod,
    applyModToItem,
    applySuppressorModToItem,
    findComponentHash,
    findSuppressorComponentHash,
    getWeaponItemModComponents,
    getWeaponItemSuppressorComponent,
    getWeaponModComponentsPayload,
    weaponSupportsMod,
    weaponSupportsSuppressor,
    getModDefByItem
};
