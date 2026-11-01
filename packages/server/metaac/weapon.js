'use strict';

const fs = require('fs');
const grants = require('./grants');
const cfg = require('./config');

/** weapon_id → hash (unsigned) from weapons.txt */
let allowedIds = new Set();
let allowedHashes = new Set();
let idByHash = new Map();

function parseWeaponsTxt(filePath) {
    const ids = new Set();
    const hashes = new Set();
    const map = new Map();
    try {
        if (!fs.existsSync(filePath)) return { ids, hashes, map };
        const text = fs.readFileSync(filePath, 'utf8');
        let currentId = null;
        for (const line of text.split(/\r?\n/)) {
            const idM = /^ID:\s*(\S+)/i.exec(line);
            if (idM) {
                currentId = idM[1].trim().toLowerCase();
                ids.add(currentId);
                continue;
            }
            const hashM = /^Hash:\s*(0x[0-9a-fA-F]+|\d+)/i.exec(line);
            if (hashM && currentId) {
                let h = 0;
                if (/^0x/i.test(hashM[1])) h = Number(hashM[1]) >>> 0;
                else h = Number(hashM[1]) >>> 0;
                try {
                    const joaat = mp.joaat(currentId) >>> 0;
                    hashes.add(joaat);
                    map.set(joaat, currentId);
                    if (h) {
                        hashes.add(h);
                        map.set(h, currentId);
                    }
                } catch (_e) {
                    if (h) {
                        hashes.add(h);
                        map.set(h, currentId);
                    }
                }
                currentId = null;
            }
        }
        // Always allow fists / unarmed
        try {
            const u = mp.joaat('weapon_unarmed') >>> 0;
            hashes.add(u);
            map.set(u, 'weapon_unarmed');
            ids.add('weapon_unarmed');
        } catch (_e2) {}
        try {
            const p = mp.joaat('gadget_parachute') >>> 0;
            hashes.add(p);
            map.set(p, 'gadget_parachute');
            ids.add('gadget_parachute');
        } catch (_e3) {}
    } catch (e) {
        console.log('[MetaAC] weapons.txt parse failed:', e.message || e);
    }
    return { ids, hashes, map };
}

function reloadWhitelist() {
    const parsed = parseWeaponsTxt(cfg.WEAPONS_TXT);
    allowedIds = parsed.ids;
    allowedHashes = parsed.hashes;
    idByHash = parsed.map;
    console.log(`[MetaAC] weapons whitelist: ${allowedIds.size} ids / ${allowedHashes.size} hashes`);
}

function isWeaponWhitelisted(hash) {
    const h = Number(hash) >>> 0;
    if (!h) return true;
    return allowedHashes.has(h);
}

function weaponNameOf(hash) {
    const h = Number(hash) >>> 0;
    return idByHash.get(h) || `0x${h.toString(16)}`;
}

/**
 * Server-only weapon give. Issues HMAC grant then calls RageMP giveWeapon.
 * Use this for every legitimate give path so MetaAC can tell cheat gives apart.
 */
function metaAcGiveWeapon(player, weaponHash, ammo, equipNow, reason) {
    try {
        if (!player || !mp.players.exists(player)) return false;
        const wh = typeof weaponHash === 'string' ? (mp.joaat(weaponHash) >>> 0) : (Number(weaponHash) >>> 0);
        if (!wh) return false;
        grants.issueWeaponGrant(player, wh, reason || 'give');
        try {
            const owned = require('./owned_weapons');
            owned.markOwned(player, wh);
        } catch (_o) {}
        const a = ammo == null ? 0 : Number(ammo) | 0;
        const eq = equipNow !== false;
        try {
            player.giveWeapon(wh, a, eq);
        } catch (_e) {}
        try {
            mp.events.call('metaac:internal:weapon', player, wh, reason || 'give');
        } catch (_e2) {}
        return true;
    } catch (e) {
        console.log('[MetaAC] giveWeapon error:', e && e.message ? e.message : e);
        return false;
    }
}

/** Mark an already-given / client-synced weapon as legitimate (e.g. givegun). */
function metaAcAllowWeapon(player, weaponHash, reason) {
    try {
        if (!player || !mp.players.exists(player)) return false;
        const wh = typeof weaponHash === 'string' ? (mp.joaat(weaponHash) >>> 0) : (Number(weaponHash) >>> 0);
        if (!wh) return false;
        grants.issueWeaponGrant(player, wh, reason || 'allow');
        try {
            const owned = require('./owned_weapons');
            owned.markOwned(player, wh);
        } catch (_o) {}
        return true;
    } catch (_e) {
        return false;
    }
}

function getPlayerWeaponHashes(player) {
    const out = [];
    try {
        if (!player || !mp.players.exists(player)) return out;
        const all = player.getAllWeapons && player.getAllWeapons();
        if (all && Array.isArray(all)) {
            for (const w of all) {
                if (w && w.hash != null && w.hash !== 0) out.push(Number(w.hash) >>> 0);
            }
        }
    } catch (_e) {}
    try {
        if (!player || !mp.players.exists(player)) return out;
        const cur = player.weapon;
        if (cur != null && cur !== 0) {
            const h = Number(cur) >>> 0;
            if (!out.includes(h)) out.push(h);
        }
    } catch (_e2) {}
    return out;
}

function getAdminLevel(player) {
    if (!player) return 0;
    const a = Number(player.adminlvl);
    if (!Number.isNaN(a) && a > 0) return a;
    try {
        const v = Number(player.getVariable('adminlvl'));
        return Number.isNaN(v) ? 0 : v;
    } catch (_e) {
        return 0;
    }
}

reloadWhitelist();
try {
    fs.watchFile(cfg.WEAPONS_TXT, { interval: 5000 }, () => {
        try { reloadWhitelist(); } catch (_e) {}
    });
} catch (_e) {}

global.metaAcGiveWeapon = metaAcGiveWeapon;
global.metaAcAllowWeapon = metaAcAllowWeapon;
global.metaAcIsWeaponAllowed = isWeaponWhitelisted;
global.metaAcReloadWeapons = reloadWhitelist;

module.exports = {
    metaAcGiveWeapon,
    metaAcAllowWeapon,
    isWeaponWhitelisted,
    weaponNameOf,
    getPlayerWeaponHashes,
    getAdminLevel,
    reloadWhitelist,
    getAllowedHashes: () => allowedHashes,
    getAllowedIds: () => allowedIds
};
