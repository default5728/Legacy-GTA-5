'use strict';

/**
 * Client vertical probe → server grant metaac:vertical
 * Only RageMP wrappers (no raw invoke hashes — RAGE rejects unknown natives).
 */

const TICK_MS = 200;
const SEND_MS = 400;

let lastSendAt = 0;
let lastKind = '';

function pedApi(name, ped) {
    try {
        const fn = mp.game.ped && mp.game.ped[name];
        if (typeof fn !== 'function') return false;
        return !!fn(ped);
    } catch (_e) {
        return false;
    }
}

function localApi(name) {
    try {
        const lp = mp.players.local;
        const fn = lp && lp[name];
        if (typeof fn !== 'function') return false;
        return !!fn.call(lp);
    } catch (_e) {
        return false;
    }
}

function detectKind() {
    try {
        const lp = mp.players.local;
        if (!lp || !lp.handle) return '';
        const ped = lp.handle;
        if (lp.vehicle) return '';
        try {
            if (lp.isDead && lp.isDead()) return '';
        } catch (_d) {}

        let paraState = -1;
        try {
            if (mp.game.ped && typeof mp.game.ped.getPedParachuteState === 'function') {
                paraState = mp.game.ped.getPedParachuteState(ped);
            }
        } catch (_p) {}
        if (paraState >= 1 && paraState <= 3) return 'para';

        if (localApi('isFalling') || pedApi('isPedFalling', ped)) return 'fall';
        if (localApi('isRagdoll') || pedApi('isPedRagdoll', ped)) return 'ragdoll';
        if (localApi('isClimbing') || pedApi('isPedClimbing', ped)) return 'climb';
        if (localApi('isJumping') || pedApi('isPedJumping', ped)) return 'jump';
        if (pedApi('isPedVaulting', ped)) return 'vault';
        if (pedApi('isPedSwimming', ped)) return 'swim';

        let vel = null;
        try { vel = lp.getVelocity(); } catch (_v) {}
        if (vel) {
            if (vel.z < -6.5) return 'fall';
            if (vel.z < -3.2) return 'descend';
            if (vel.z > 2.4 && Math.abs(vel.x) + Math.abs(vel.y) < 8) return 'climb';
        }
    } catch (_e) {}
    return '';
}

setInterval(() => {
    try {
        const kind = detectKind();
        if (!kind) {
            lastKind = '';
            return;
        }
        const now = Date.now();
        if (kind === lastKind && now - lastSendAt < SEND_MS) return;
        lastKind = kind;
        lastSendAt = now;
        mp.events.callRemote('metaac:vertical', kind);
    } catch (_e) {}
}, TICK_MS);
