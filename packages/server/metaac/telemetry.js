'use strict';

/**
 * MetaAC telemetry: RageMP → Linux HTTP (primary), file-IPC fallback.
 */

const http = require('http');
const crypto = require('crypto');
const cfg = require('./config');
const grants = require('./grants');
const weapon = require('./weapon');
const fileIpc = require('./file_ipc');
const sensors = require('./sensors');
const bypass = require('./bypass');

let lastSendAt = 0;
let inFlight = false;
let seq = 0;
let lastOkAt = 0;
let lastErrLogAt = 0;
let failStreak = 0;
let httpEnabled = cfg.http !== false;
let httpPausedUntil = 0;
let fileModeOk = false;
let activeHost = cfg.host || '127.0.0.1';
let activePort = Number(cfg.port) || 37421;
let hostIndex = 0;
let pingReady = false;
let lastPingOkAt = 0;
let pingFailStreak = 0;
let pingInFlight = false;
const PING_INTERVAL_MS = 5000;
const PING_FAILS_OFFLINE = 5;
const recentKickByStatic = new Map();
const KICK_DEDUP_MS = 8000;

function setHostLive(live, reason) {
    const next = !!live;
    if (global.metaAcHostLive === next) return;
    global.metaAcHostLive = next;
    const msg = next
        ? `host ONLINE ${activeHost}:${activePort} — детект/kick только MetaAC (локальный anticheat.js выкл.)`
        : `host OFFLINE — fallback: локальный anticheat.js`;
    try { notifyAdmins(msg); } catch (_e) {}
}

function hostList() {
    const list = [];
    const primary = String(cfg.host || '').trim();
    if (primary) list.push(primary);
    const fb = Array.isArray(cfg.fallbackHosts) ? cfg.fallbackHosts : ['127.0.0.1'];
    for (const h of fb) {
        const s = String(h || '').trim();
        if (s && !list.includes(s)) list.push(s);
    }
    if (!list.length) list.push('127.0.0.1');
    return list;
}

function signBody(bodyStr, ts) {
    return crypto.createHmac('sha256', cfg.secret).update(`${ts}.${bodyStr}`).digest('hex');
}

function adminLvl(player) {
    return weapon.getAdminLevel(player);
}

function notifyAdmins(message) {
    const min = cfg.adminNotifyMinLvl || 1;
    mp.players.forEach((p) => {
        try {
            if (!mp.players.exists(p)) return;
            if (adminLvl(p) < min) return;
            p.outputChatBox(`!{#7CFC00}[${cfg.NAME}] !{white}${message}`);
        } catch (_e) {}
    });
    console.log(`[MetaAC] ${message}`);
}

function buildPlayerRow(player) {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return null;
        let pos = null;
        try { pos = player.position; } catch (_pos) { return null; }
        if (!pos || typeof pos.x !== 'number' || !isFinite(pos.x)) return null;

        const g = grants.snapshotGrants(player);
        let wh = 0;
        try { wh = Number(player.weapon) >>> 0; } catch (_w) { wh = 0; }
        const weapons = weapon.getPlayerWeaponHashes(player);

        let spd = 0;
        let dz = 0;
        const now = Date.now();
        const last = player._metaAcSample;
        if (last && now - last.t >= 200 && now - last.t <= 3000) {
            const dt = (now - last.t) / 1000;
            const dx = pos.x - last.x;
            const dy = pos.y - last.y;
            dz = pos.z - last.z;
            spd = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;
        }
        player._metaAcSample = { x: pos.x, y: pos.y, z: pos.z, t: now };

        const invSet = sensors.inventoryWeaponHashes(player);
        const inv = [];
        for (const h of invSet) {
            inv.push(h >>> 0);
            if (inv.length >= 12) break;
        }

        let dim = 0;
        let hp = 0;
        let ar = 0;
        let inVeh = 0;
        try { dim = player.dimension | 0; } catch (_d) { dim = 0; }
        try { hp = Math.max(0, Math.round(Number(player.health) || 0)); } catch (_h) { hp = 0; }
        try { ar = Math.max(0, Math.round(Number(player.armour) || 0)); } catch (_a) { ar = 0; }
        try { inVeh = player.vehicle ? 1 : 0; } catch (_v) { inVeh = 0; }

        const row = {
            i: player.id,
            s: player.static != null ? Number(player.static) : -1,
            n: String(player.login || player.name || '').slice(0, 24),
            x: Math.round(pos.x * 10) / 10,
            y: Math.round(pos.y * 10) / 10,
            z: Math.round(pos.z * 10) / 10,
            d: dim,
            w: wh || 0,
            ws: weapons.length <= 6 ? weapons : weapons.slice(0, 6),
            inv,
            h: hp,
            ar,
            v: inVeh,
            al: adminLvl(player) | 0,
            spd: Math.round(spd * 10) / 10,
            dz: Math.round(dz * 10) / 10,
            para:
                (Number(wh) >>> 0) === (0xfbab5776 >>> 0) ||
                weapons.some((h) => (Number(h) >>> 0) === (0xfbab5776 >>> 0))
                    ? 1
                    : 0,
            // jg = skip host detects. Always skip join-grace + F5/spectate duty.
            // detectAdmins only means "scan admins who are NOT on duty".
            jg:
                (typeof global.metaAcInJoinGrace === 'function' && global.metaAcInJoinGrace(player)) ||
                bypass.isDutyBypass(player)
                    ? 1
                    : 0,
            vg: 0
        };

        if (Math.abs(dz) <= -2.8 && typeof global.metaAcMarkVertical === 'function') {
            try {
                global.metaAcMarkVertical(player, 'fall', 2600);
            } catch (_vg) {}
        }
        if (typeof global.metaAcInVerticalGrace === 'function' && global.metaAcInVerticalGrace(player)) {
            row.vg = 1;
        }

        if (g.tp.length) row.tp = g.tp;
        if (g.wpn.length) row.wp = g.wpn;
        return row;
    } catch (_e) {
        return null;
    }
}

function buildPacket() {
    const players = [];
    try {
        mp.players.forEach((p) => {
            const row = buildPlayerRow(p);
            if (row) players.push(row);
        });
    } catch (_e) {}
    seq = (seq + 1) >>> 0;
    return { v: 1, ac: cfg.NAME, seq, t: Date.now(), c: players.length, p: players };
}

function postJson(pathname, obj, cb) {
    if (!httpEnabled) {
        if (cb) cb(new Error('http-disabled'));
        return;
    }
    const body = JSON.stringify(obj);
    const ts = String(Date.now());
    const sig = signBody(body, ts);
    const isLocal = activeHost === '127.0.0.1' || activeHost === 'localhost';
    let done = false;
    const once = (err, status, data) => {
        if (done) return;
        done = true;
        if (cb) cb(err, status, data);
    };

    const req = http.request(
        {
            host: activeHost,
            port: activePort,
            path: pathname,
            method: 'POST',
            timeout: isLocal ? 2500 : 12000,
            family: 4,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'X-MetaAC-Ts': ts,
                'X-MetaAC-Sign': sig
            }
        },
        (res) => {
            const chunks = [];
            res.on('data', (d) => chunks.push(d));
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
                } catch (_e) {
                    parsed = null;
                }
                once(null, res.statusCode, parsed);
            });
        }
    );
    req.on('error', (err) => once(err));
    req.on('timeout', () => {
        try { req.destroy(); } catch (_e) {}
        once(new Error('timeout'));
    });
    try { req.setTimeout(isLocal ? 2500 : 12000); } catch (_st) {}
    req.write(body);
    req.end();
}

function findByStatic(staticId) {
    const sid = Number(staticId);
    let found = null;
    mp.players.forEach((p) => {
        if (found) return;
        if (mp.players.exists(p) && Number(p.static) === sid) found = p;
    });
    return found;
}

function applyVerdicts(verdicts) {
    if (!Array.isArray(verdicts) || !verdicts.length) return;
    for (const v of verdicts) {
        try {
            if (!v || !v.action) continue;
            const player = findByStatic(v.static);
            if (!player || !mp.players.exists(player)) continue;
            const reason = String(v.reason || 'MetaAC').slice(0, 120);
            const login = player.login || '?';
            const sid = player.static != null ? player.static : '?';

            if (v.action === 'kick') {
                if (cfg.testMode) {
                    notifyAdmins(`⚠ HOST WOULD KICK #${sid} ${login}: ${reason}`);
                    continue;
                }
                if (typeof global.metaAcInJoinGrace === 'function' && global.metaAcInJoinGrace(player)) continue;
                const dedupKey = `${sid}:${reason.slice(0, 48)}`;
                const dedupAt = recentKickByStatic.get(dedupKey) || 0;
                if (Date.now() - dedupAt < KICK_DEDUP_MS) continue;
                recentKickByStatic.set(dedupKey, Date.now());
                notifyAdmins(`HOST KICK #${sid} ${login}: ${reason}`);
                try { player.outputChatBox(`!{red}[${cfg.NAME}] Вы кикнуты: ${reason}`); } catch (_e) {}
                setTimeout(() => {
                    try { if (mp.players.exists(player)) player.kick(`[${cfg.NAME}] ${reason}`); } catch (_e2) {}
                }, 250);
            } else if (v.action === 'warn' || v.action === 'notify') {
                notifyAdmins(`HOST #${sid} ${login}: ${reason}`);
            } else if (v.action === 'strip_weapons') {
                try { player.removeAllWeapons(); } catch (_e3) {}
                notifyAdmins(`HOST STRIP #${sid} ${login}: ${reason}`);
            }
        } catch (_e) {}
    }
}

function applyOutbox(data) {
    if (!data) return;
    if (data.verdicts) applyVerdicts(data.verdicts);
    if (Array.isArray(data.adminMessages)) {
        for (const m of data.adminMessages) if (m) notifyAdmins(String(m));
    }
}

function rotateHost() {
    const hosts = hostList();
    hostIndex = (hostIndex + 1) % hosts.length;
    activeHost = hosts[hostIndex];
}

function flushTelemetry() {
    if (!cfg.enabled) return;
    if (inFlight) return;
    if (!pingReady) return;
    const now = Date.now();
    if (now - lastSendAt < cfg.intervalMs - 20) return;
    lastSendAt = now;
    inFlight = true;

    let packet;
    try {
        packet = buildPacket();
    } catch (_e) {
        inFlight = false;
        return;
    }

    // Optional file-IPC (off by default — remote Linux only)
    if (cfg.fileIpc === true) {
        try {
            fileIpc.publishTelemetry(packet);
            if (!fileModeOk) {
                fileModeOk = true;
                console.log(`[MetaAC] file-IPC OK → ${fileIpc.IPC_DIR}`);
            }
            const out = fileIpc.consumeVerdicts();
            if (out) applyOutbox(out);
        } catch (e) {
            console.log('[MetaAC] file-IPC error:', e.message || e);
        }
    }

    if (!httpEnabled || cfg.http === false) {
        inFlight = false;
        return;
    }

    // Temporary pause after fails — auto-retry later
    if (httpPausedUntil && Date.now() < httpPausedUntil) {
        inFlight = false;
        return;
    }

    postJson('/telemetry', packet, (err, status, data) => {
        inFlight = false;
        if (err || !data || status === 401 || (status && status >= 400)) {
            failStreak++;
            const reason = err
                ? err.message
                : status === 401
                    ? '401 bad secret/clock'
                    : `HTTP ${status}`;

            if (status === 401) {
                if (!lastErrLogAt || Date.now() - lastErrLogAt > 15000) {
                    lastErrLogAt = Date.now();
                    console.log(
                        `[MetaAC] telemetry 401 ${activeHost}:${activePort} — secret server-bridge.json = Linux config.json`
                    );
                }
                return;
            }

            rotateHost();

            if (failStreak >= 60) {
                failStreak = 0;
                httpPausedUntil = Date.now() + 8000;
                if (!lastErrLogAt || Date.now() - lastErrLogAt > 20000) {
                    lastErrLogAt = Date.now();
                    console.log(
                        `[MetaAC] telemetry pause 8s ${cfg.host}:${cfg.port} (${reason})` +
                        (global.metaAcHostLive ? ' · MetaAC ON (ping жив)' : '')
                    );
                }
                return;
            }

            if (!lastErrLogAt || Date.now() - lastErrLogAt > 12000) {
                lastErrLogAt = Date.now();
                console.log(`[MetaAC] telemetry FAIL ${activeHost}:${activePort} (${reason})`);
            }
            return;
        }
        failStreak = 0;
        httpPausedUntil = 0;
        lastOkAt = Date.now();
        setHostLive(true);
        applyOutbox(data);
    });
}

function reportEvent(evt) {
    if (!cfg.enabled || !evt) return;
    if (cfg.fileIpc === true) {
        try { fileIpc.publishEvent(evt); } catch (_e) {}
    }
    if (!httpEnabled || cfg.http === false) return;
    if (httpPausedUntil && Date.now() < httpPausedUntil) return;
    try {
        postJson('/event', { ac: cfg.NAME, t: Date.now(), ...evt }, (err, status, data) => {
            if (!err && data && status < 400) applyOutbox(data);
        });
    } catch (_e2) {}
}

function startTelemetry() {
    const hosts = hostList();
    activeHost = hosts[0];
    activePort = Number(cfg.port) || 37421;
    httpEnabled = cfg.http !== false;
    httpPausedUntil = 0;
    if (cfg.fileIpc === true) fileIpc.ensureDir();

    setInterval(() => {
        try { flushTelemetry(); } catch (_e) {}
    }, Math.max(200, Math.floor(cfg.intervalMs / 2)));

    console.log(`[MetaAC] telemetry → Linux HTTP ${activeHost}:${activePort}`);
    if (cfg.fileIpc === true) console.log(`[MetaAC] file-IPC also on`);

    if (!httpEnabled) {
        console.log('[MetaAC] HTTP disabled in bridge');
        return;
    }

    const doPing = () => {
        if (!httpEnabled || pingInFlight) return;
        pingInFlight = true;
        postJson('/ping', { ac: cfg.NAME, t: Date.now() }, (err, status) => {
            pingInFlight = false;
            pingReady = true;
            if (err || status >= 400) {
                pingFailStreak++;
                if (pingFailStreak >= PING_FAILS_OFFLINE) {
                    setHostLive(false, err ? err.message : `HTTP ${status}`);
                    if (!lastErrLogAt || Date.now() - lastErrLogAt > 20000) {
                        lastErrLogAt = Date.now();
                        console.log(
                            `[MetaAC] ping FAIL ${activeHost}:${activePort} — локальный anticheat.js. ` +
                            `curl http://${activeHost}:${activePort}/health`
                        );
                    }
                }
                return;
            }
            pingFailStreak = 0;
            lastPingOkAt = Date.now();
            httpPausedUntil = 0;
            setHostLive(true);
            if (!lastOkAt) lastOkAt = Date.now();
        });
    };

    setTimeout(doPing, 800);
    setInterval(() => {
        try { doPing(); } catch (_e) {}
    }, PING_INTERVAL_MS);
}

global.metaAcReportEvent = reportEvent;
global.metaAcNotifyAdmins = notifyAdmins;

module.exports = {
    startTelemetry,
    flushTelemetry,
    buildPacket,
    notifyAdmins,
    applyVerdicts,
    reportEvent
};
