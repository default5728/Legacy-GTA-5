'use strict';

/**
 * MetaAC RageMP bridge — NO detect/kick logic here (that lives on MetaAC host).
 * Local duties only:
 *  - legit grants (teleport / weapon give)
 *  - telemetry snapshot → host
 *  - apply kick verdicts ← host
 */

const cfg = require('./config');
const grants = require('./grants');
const teleport = require('./teleport');
const weapon = require('./weapon');
const telemetry = require('./telemetry');
const owned = require('./owned_weapons');
const sensors = require('./sensors');
const vertical = require('./vertical');

const FLY_JOIN_GRACE_MS = 40000;

function markFlyGrace(player, ms) {
    try {
        if (!player || !mp.players.exists(player)) return;
        const until = Date.now() + (ms != null ? ms : FLY_JOIN_GRACE_MS);
        player._metaAcJoinUntil = until;
        player._acJustSpawnedUntil = Math.max(player._acJustSpawnedUntil || 0, until);
    } catch (_e) {}
}

function inJoinGrace(player) {
    try {
        if (!player) return true;
        if (player._metaAcJoinUntil && Date.now() < player._metaAcJoinUntil) return true;
        if (player._acJustSpawnedUntil && Date.now() < player._acJustSpawnedUntil) return true;
    } catch (_e) {}
    return false;
}

global.metaAcInJoinGrace = inJoinGrace;
global.metaAcMarkJoinGrace = markFlyGrace;
global.metaAcMarkVertical = vertical.metaAcMarkVertical;
global.metaAcInVerticalGrace = vertical.inVerticalGrace;

mp.events.add('playerQuit', (player) => {
    try {
        if (player && player.static != null) grants.clearPlayer(player.static);
        owned.clearOwned(player);
    } catch (_e) {}
});

mp.events.add('playerAuth', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        grants.clearPlayer(player.static);
        owned.clearOwned(player);
        markFlyGrace(player, FLY_JOIN_GRACE_MS);
        console.log(`[MetaAC] auth #${player.static}: grace ${FLY_JOIN_GRACE_MS / 1000}s (detects on HOST)`);
    } catch (_e) {}
});

mp.events.add('playerSpawn', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (!player._metaAcJoinUntil || Date.now() >= player._metaAcJoinUntil) {
            markFlyGrace(player, 6000);
        }
    } catch (_e) {}
});

mp.events.add('playerDeath', (player) => {
    try {
        owned.clearOwned(player);
    } catch (_e) {}
});

setTimeout(() => {
    try {
        sensors.startSensors();
        telemetry.startTelemetry();
        const mode = cfg.testMode ? 'TEST' : 'LIVE';
        telemetry.notifyAdmins(
            `AC ${mode} · HOST ${cfg.host}:${cfg.port} · host ONLINE = только MetaAC · OFFLINE = anticheat.js`
        );
        console.log(
            `[MetaAC] bridge ON · ${mode} · hostAuthority=${cfg.hostAuthority !== false} · ` +
                `local anticheat.js включается только когда host OFFLINE`
        );
    } catch (e) {
        console.log('[MetaAC] start failed:', e && e.message ? e.message : e);
    }
}, 1200);

module.exports = {
    teleport,
    weapon,
    grants,
    telemetry,
    cfg,
    inJoinGrace,
    markJoinGrace: markFlyGrace,
    vertical
};

try {
    require('./teleport');
} catch (_e) {}
