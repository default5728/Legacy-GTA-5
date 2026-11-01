'use strict';

const crypto = require('crypto');
const cfg = require('./config');

/** In-memory player grants — never sent as forgeable client events. */
const byStatic = new Map();

function sidOf(player) {
    if (!player || player.static == null) return null;
    return Number(player.static);
}

function getBag(sid) {
    if (!byStatic.has(sid)) {
        byStatic.set(sid, {
            teleports: [],
            weapons: [],
            kickScoreHint: 0
        });
    }
    return byStatic.get(sid);
}

function prune(list, now) {
    const ttl = cfg.GRANT_TTL_MS;
    let i = 0;
    while (i < list.length) {
        if (now - list[i].at > ttl) list.splice(i, 1);
        else i++;
    }
}

function hmacToken(payload) {
    return crypto.createHmac('sha256', cfg.secret).update(payload).digest('hex').slice(0, 24);
}

/**
 * Issue a server-only teleport grant. Clients cannot forge this —
 * there is no callRemote handler that accepts arbitrary grants.
 */
function issueTeleportGrant(player, x, y, z, reason) {
    const sid = sidOf(player);
    if (sid == null) return null;
    const now = Date.now();
    const bag = getBag(sid);
    prune(bag.teleports, now);
    const nonce = crypto.randomBytes(8).toString('hex');
    const payload = `tp|${sid}|${x.toFixed(2)}|${y.toFixed(2)}|${z.toFixed(2)}|${now}|${nonce}`;
    const token = hmacToken(payload);
    const grant = {
        t: 'tp',
        at: now,
        x: Number(x),
        y: Number(y),
        z: Number(z),
        r: String(reason || 'server').slice(0, 32),
        n: nonce,
        k: token
    };
    bag.teleports.push(grant);
    if (bag.teleports.length > 12) bag.teleports.splice(0, bag.teleports.length - 12);
    return grant;
}

/**
 * Issue a server-only weapon grant (give / equip / buy path).
 */
function issueWeaponGrant(player, weaponHash, reason) {
    const sid = sidOf(player);
    if (sid == null) return null;
    const now = Date.now();
    const bag = getBag(sid);
    prune(bag.weapons, now);
    const wh = Number(weaponHash) >>> 0;
    const nonce = crypto.randomBytes(8).toString('hex');
    const payload = `wpn|${sid}|${wh}|${now}|${nonce}`;
    const token = hmacToken(payload);
    const grant = {
        t: 'wpn',
        at: now,
        w: wh,
        r: String(reason || 'server').slice(0, 32),
        n: nonce,
        k: token
    };
    bag.weapons.push(grant);
    if (bag.weapons.length > 16) bag.weapons.splice(0, bag.weapons.length - 16);
    return grant;
}

function snapshotGrants(player) {
    const sid = sidOf(player);
    if (sid == null) return { tp: [], wpn: [] };
    const bag = getBag(sid);
    const now = Date.now();
    prune(bag.teleports, now);
    prune(bag.weapons, now);
    const max = cfg.MAX_GRANTS_IN_PACKET;
    return {
        tp: bag.teleports.slice(-max).map((g) => ({
            at: g.at,
            x: Math.round(g.x * 10) / 10,
            y: Math.round(g.y * 10) / 10,
            z: Math.round(g.z * 10) / 10,
            r: g.r,
            k: g.k
        })),
        wpn: bag.weapons.slice(-max).map((g) => ({
            at: g.at,
            w: g.w,
            r: g.r,
            k: g.k
        }))
    };
}

function clearPlayer(staticId) {
    byStatic.delete(Number(staticId));
}

function hasRecentTeleport(player, maxAgeMs) {
    const sid = sidOf(player);
    if (sid == null) return false;
    const bag = getBag(sid);
    const now = Date.now();
    const age = maxAgeMs != null ? maxAgeMs : cfg.GRANT_TTL_MS;
    prune(bag.teleports, now);
    return bag.teleports.some((g) => now - g.at <= age);
}

function hasRecentWeapon(player, weaponHash, maxAgeMs) {
    const sid = sidOf(player);
    if (sid == null) return false;
    const bag = getBag(sid);
    const now = Date.now();
    const wh = Number(weaponHash) >>> 0;
    const age = maxAgeMs != null ? maxAgeMs : cfg.GRANT_TTL_MS;
    prune(bag.weapons, now);
    return bag.weapons.some((g) => g.w === wh && now - g.at <= age);
}

module.exports = {
    issueTeleportGrant,
    issueWeaponGrant,
    snapshotGrants,
    clearPlayer,
    hasRecentTeleport,
    hasRecentWeapon
};
