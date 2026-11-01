'use strict';

/**
 * MetaAC bridge config — RageMP reads MetaAC/server-bridge.json
 * Telemetry goes HTTP to Linux detector (host:port).
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const CONFIG_PATH = path.join(ROOT, 'MetaAC', 'server-bridge.json');

function loadBridge() {
    let prev = {};
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            prev = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) || {};
        }
    } catch (_e) {}

    let secret = prev.secret;
    if (
        !secret ||
        typeof secret !== 'string' ||
        secret.length < 16 ||
        secret === 'WILL_BE_GENERATED_ON_FIRST_SERVER_START' ||
        secret === 'CHANGE_ME_SAME_AS_server-bridge.json'
    ) {
        secret = crypto.randomBytes(32).toString('hex');
    }

    const cfg = {
        enabled: prev.enabled !== false,
        host: String(prev.host || '37.230.162.104'),
        port: Number(prev.port) || 37421,
        http: prev.http !== false,
        fallbackHosts: Array.isArray(prev.fallbackHosts) ? prev.fallbackHosts : [],
        /** write MetaAC/ipc only if explicitly enabled */
        fileIpc: prev.fileIpc === true,
        /**
         * true (default): RageMP sends telemetry/detects; MetaAC HOST decides kick;
         * RageMP applies verdicts from /telemetry response.
         * false: RageMP kicks locally (legacy).
         */
        hostAuthority: prev.hostAuthority !== false,
        /** temporary: admins also get MetaAC/anticheat detects (no admin godmode skip) */
        detectAdmins: prev.detectAdmins === true,
        secret,
        intervalMs: Math.max(400, Number(prev.intervalMs) || 1000),
        adminNotifyMinLvl: Number(prev.adminNotifyMinLvl) || 1,
        testMode: prev.testMode === true,
        sensors: {
            wallshot: prev.sensors ? prev.sensors.wallshot !== false : true,
            silentaim: prev.sensors ? prev.sensors.silentaim !== false : true
        },
        note:
            prev.note ||
            'RageMP → telemetry → HOST decides kick → verdict → RageMP kicks.'
    };

    try {
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
        try {
            const daemonCfgPath = path.join(ROOT, 'MetaAC', 'config.json');
            if (fs.existsSync(daemonCfgPath)) {
                const dcfg = JSON.parse(fs.readFileSync(daemonCfgPath, 'utf8'));
                dcfg.secret = secret;
                dcfg.port = cfg.port;
                dcfg.host = '0.0.0.0';
                fs.writeFileSync(daemonCfgPath, JSON.stringify(dcfg, null, 2), 'utf8');
            }
        } catch (_sync) {}
    } catch (e) {
        console.log('[MetaAC] failed to write server-bridge.json:', e.message || e);
    }

    return cfg;
}

const bridge = loadBridge();

module.exports = {
    NAME: 'MetaAC',
    ROOT,
    CONFIG_PATH,
    WEAPONS_TXT: path.join(ROOT, 'weapons.txt'),
    secret: bridge.secret,
    host: bridge.host,
    port: bridge.port,
    http: bridge.http !== false,
    fallbackHosts: bridge.fallbackHosts || [],
    fileIpc: bridge.fileIpc === true,
    enabled: bridge.enabled !== false,
    testMode: bridge.testMode === true,
    hostAuthority: bridge.hostAuthority !== false,
    detectAdmins: bridge.detectAdmins === true,
    wallshotEnabled: bridge.sensors ? bridge.sensors.wallshot !== false : true,
    silentaimEnabled: bridge.sensors ? bridge.sensors.silentaim !== false : true,
    intervalMs: bridge.intervalMs,
    adminNotifyMinLvl: bridge.adminNotifyMinLvl,
    GRANT_TTL_MS: 10000,
    MAX_GRANTS_IN_PACKET: 4
};

// Temp test flag used by anticheat.js / sensors
global.metaAcDetectAdmins = bridge.detectAdmins === true;
global.metaAcHostLive = false;

/** MetaAC host decides kicks — local anticheat.js detect loops must stay off. */
function metaAcHostActive() {
    if (bridge.testMode) return false;
    if (bridge.hostAuthority === false) return false;
    if (bridge.enabled === false) return false;
    return global.metaAcHostLive === true;
}

global.metaAcHostActive = metaAcHostActive;
