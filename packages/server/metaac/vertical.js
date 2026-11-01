'use strict';

/**
 * Vertical grace — fall / climb / vault / ragdoll / parachute.
 * Server-owned window: fly AC (local + MetaAC host) ignores the player.
 */

const KINDS = {
    fall: 3500,
    descend: 2800,
    climb: 2200,
    vault: 2200,
    jump: 2200,
    ragdoll: 3500,
    para: 4000,
    swim: 3000
};

const MAX_MS = 4500;
const MAX_CONTINUOUS_MS = 22000;
const CLIENT_MIN_INTERVAL_MS = 350;

function inVerticalGrace(player) {
    try {
        if (!player || !mp.players.exists(player)) return false;
        if (player._metaAcVertUntil && Date.now() < player._metaAcVertUntil) return true;
        if (player.getVariable('acVertical') === true) return true;
        if (player.getVariable('falling') === true) return true;
        if (player.getVariable('parachute') === true) return true;
        if (player.getVariable('ragdoll') === true) return true;
    } catch (_e) {}
    return false;
}

function metaAcMarkVertical(player, reason, ms) {
    try {
        if (!player || !mp.players.exists(player)) return false;
        const now = Date.now();
        const grace = Math.max(800, Math.min(Number(ms) || 2500, MAX_MS));

        if (!player._metaAcVertStarted || now > (player._metaAcVertUntil || 0)) {
            player._metaAcVertStarted = now;
        }
        if (now - player._metaAcVertStarted > MAX_CONTINUOUS_MS) {
            return false;
        }

        player._metaAcVertUntil = now + grace;
        player._metaAcVertReason = String(reason || 'vertical').slice(0, 16);
        try { player._acLastMoveSample = null; } catch (_e) {}
        try { player.setVariable('acVertical', true); } catch (_e2) {}
        return true;
    } catch (_e3) {
        return false;
    }
}

function clearVerticalIfExpired(player) {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (player._metaAcVertUntil && Date.now() >= player._metaAcVertUntil) {
            player._metaAcVertUntil = 0;
            try { player.setVariable('acVertical', false); } catch (_e) {}
        }
    } catch (_e2) {}
}

function acceptClientVertical(player, kindRaw) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return false;
    const now = Date.now();
    if (player._metaAcVertEvtAt && now - player._metaAcVertEvtAt < CLIENT_MIN_INTERVAL_MS) return false;
    player._metaAcVertEvtAt = now;

    const kind = String(kindRaw || '').toLowerCase().slice(0, 16);
    if (!KINDS[kind]) return false;

    let pos = null;
    try { pos = player.position; } catch (_p) { return false; }
    if (!pos || typeof pos.x !== 'number' || !isFinite(pos.x)) return false;
    const last = player._metaAcVertPos;
    player._metaAcVertPos = { x: pos.x, y: pos.y, z: pos.z, t: now };

    let absDz = 0;
    let horiz = 0;
    if (last && now - last.t <= 2500) {
        absDz = Math.abs(pos.z - last.z);
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        horiz = Math.sqrt(dx * dx + dy * dy);
    }

    const already = inVerticalGrace(player);
    if (!already && kind !== 'ragdoll' && kind !== 'para' && absDz < 0.12) return false;
    if (kind === 'climb' && horiz > 14 && absDz < 1.4) return false;

    return metaAcMarkVertical(player, kind, KINDS[kind]);
}

mp.events.add('metaac:vertical', (player, kind) => {
    try {
        acceptClientVertical(player, kind);
    } catch (_e) {}
});

setInterval(() => {
    try {
        mp.players.forEach((p) => {
            if (mp.players.exists(p)) clearVerticalIfExpired(p);
        });
    } catch (_e) {}
}, 800);

global.metaAcMarkVertical = metaAcMarkVertical;
global.metaAcInVerticalGrace = inVerticalGrace;

module.exports = {
    metaAcMarkVertical,
    inVerticalGrace,
    acceptClientVertical
};
