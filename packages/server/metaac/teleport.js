'use strict';

const grants = require('./grants');
const cfg = require('./config');

/**
 * Mark player as legitimately teleported (grace for fly/speed AC).
 * Use before putIntoVehicle / any warp without always setting position yourself.
 */
function metaAcMarkTeleport(player, reason, ms) {
    try {
        if (!player || !mp.players.exists(player)) return false;
        const pos = player.position;
        const x = pos && Number(pos.x);
        const y = pos && Number(pos.y);
        const z = pos && Number(pos.z);
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            grants.issueTeleportGrant(player, x, y, z, reason || 'mark');
        }
        const grace = Math.max(3000, Number(ms) || 8000);
        player._acJustTeleportedUntil = Date.now() + grace;
        player._metaAcJoinUntil = Math.max(player._metaAcJoinUntil || 0, Date.now() + Math.min(grace, 5000));
        player._metaFlyHist = null;
        player._metaSpeedStreak = 0;
        player._acLastMoveSample = null;
        player._acFlyStreakStartAt = null;
        player._acFlyLastSignalAt = null;
        try {
            player.setVariable('teleporting', true);
            setTimeout(() => {
                try {
                    if (mp.players.exists(player)) player.setVariable('teleporting', false);
                } catch (_e) {}
            }, Math.min(grace, 3500));
        } catch (_e2) {}
        return true;
    } catch (_e3) {
        return false;
    }
}

/**
 * Server-only teleport. Always prefer this over player.position = ...
 */
function metaAcTeleport(player, x, y, z, options) {
    try {
        if (!player || !mp.players.exists(player)) return false;
        const opts = options && typeof options === 'object' ? options : {};
        const reason = opts.reason || 'teleport';
        const nx = Number(x);
        const ny = Number(y);
        const nz = Number(z);
        if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) return false;

        grants.issueTeleportGrant(player, nx, ny, nz, reason);

        const grace = Math.max(5000, Number(opts.graceMs) || 8000);
        try {
            player._acJustTeleportedUntil = Date.now() + grace;
            player._metaAcJoinUntil = Math.max(player._metaAcJoinUntil || 0, Date.now() + Math.min(grace, 5000));
            player._metaFlyHist = null;
            player._metaSpeedStreak = 0;
            player._acLastMoveSample = null;
            player._acFlyStreakStartAt = null;
            player._acFlyLastSignalAt = null;
        } catch (_e) {}

        try {
            player.setVariable('teleporting', true);
            setTimeout(() => {
                try {
                    if (mp.players.exists(player)) player.setVariable('teleporting', false);
                } catch (_e2) {}
            }, Math.min(grace, 3500));
        } catch (_e3) {}

        if (opts.dimension != null && Number.isFinite(Number(opts.dimension))) {
            player.dimension = Number(opts.dimension) | 0;
        }

        const pos = new mp.Vector3(nx, ny, nz);
        try {
            if (opts.withVehicle && player.vehicle && mp.vehicles.exists(player.vehicle)) {
                player.vehicle.position = pos;
            }
        } catch (_ve) {}

        player.position = pos;
        if (opts.heading != null && Number.isFinite(Number(opts.heading))) {
            player.heading = Number(opts.heading);
        }

        try {
            mp.events.call('metaac:internal:teleport', player, nx, ny, nz, reason);
        } catch (_e4) {}
        try {
            mp.events.call('playerTeleport', player);
        } catch (_e5) {}

        return true;
    } catch (e) {
        console.log('[MetaAC] teleport error:', e && e.message ? e.message : e);
        return false;
    }
}

function metaAcTeleportToPlayer(player, target, reason) {
    if (!player || !target || !mp.players.exists(player) || !mp.players.exists(target)) return false;
    const p = target.position;
    return metaAcTeleport(player, p.x, p.y, p.z, {
        reason: reason || 'to-player',
        dimension: target.dimension,
        heading: target.heading
    });
}

global.metaAcTeleport = metaAcTeleport;
global.metaAcTeleportToPlayer = metaAcTeleportToPlayer;
global.metaAcMarkTeleport = metaAcMarkTeleport;

module.exports = {
    metaAcTeleport,
    metaAcTeleportToPlayer,
    metaAcMarkTeleport,
    NAME: cfg.NAME
};
