'use strict';

/**
 * Persistent per-player owned-weapon set.
 * Join-grace hydrate trusts whatever they have; after that only metaAcGive/Allow adds.
 */

function ensure(player) {
    if (!player._metaAcOwnedWeapons) player._metaAcOwnedWeapons = new Set();
    return player._metaAcOwnedWeapons;
}

function markOwned(player, weaponHash) {
    try {
        if (!player) return;
        const wh = Number(weaponHash) >>> 0;
        if (!wh) return;
        ensure(player).add(wh);
    } catch (_e) {}
}

function clearOwned(player) {
    try {
        if (!player) return;
        player._metaAcOwnedWeapons = new Set();
    } catch (_e) {}
}

function isOwned(player, weaponHash) {
    try {
        const wh = Number(weaponHash) >>> 0;
        if (!wh) return true;
        const set = player && player._metaAcOwnedWeapons;
        return !!(set && set.has(wh));
    } catch (_e) {
        return false;
    }
}

/** During join grace — mark all current weapons as owned (inventory hydrate). */
function hydrateFromPlayer(player) {
    try {
        if (!player || !mp.players.exists(player)) return;
        const set = ensure(player);
        try {
            const all = player.getAllWeapons && player.getAllWeapons();
            if (all && Array.isArray(all)) {
                for (const w of all) {
                    if (w && w.hash) set.add(Number(w.hash) >>> 0);
                }
            }
        } catch (_e) {}
        try {
            const cur = Number(player.weapon) >>> 0;
            if (cur) set.add(cur);
        } catch (_e2) {}
    } catch (_e) {}
}

module.exports = { markOwned, clearOwned, isOwned, hydrateFromPlayer, ensure };
