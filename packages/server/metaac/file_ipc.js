'use strict';

/**
 * File IPC fallback when HTTP to Linux VPS is unreachable.
 * RageMP writes MetaAC/ipc/from-server.json
 * Local/Linux MetaAC with METAAC_FILE_IPC=1 reads it.
 */

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const IPC_DIR = path.join(cfg.ROOT, 'MetaAC', 'ipc');
const FROM_SERVER = path.join(IPC_DIR, 'from-server.json');
const TO_SERVER = path.join(IPC_DIR, 'to-server.json');
const STATUS_FILE = path.join(IPC_DIR, 'status.json');

const pendingEvents = [];

function ensureDir() {
    try {
        if (!fs.existsSync(IPC_DIR)) fs.mkdirSync(IPC_DIR, { recursive: true });
    } catch (_e) {}
}

function writeJsonAtomic(file, obj) {
    ensureDir();
    const tmp = file + '.tmp';
    const data = JSON.stringify(obj);
    fs.writeFileSync(tmp, data, 'utf8');
    try {
        fs.renameSync(tmp, file);
    } catch (_e) {
        fs.writeFileSync(file, data, 'utf8');
        try { fs.unlinkSync(tmp); } catch (_e2) {}
    }
}

function readJson(file) {
    try {
        if (!fs.existsSync(file)) return null;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_e) {
        return null;
    }
}

function publishEvent(evt) {
    if (!evt) return;
    pendingEvents.push({ ...evt, t: Date.now() });
    if (pendingEvents.length > 40) pendingEvents.splice(0, pendingEvents.length - 40);
}

function publishTelemetry(packet) {
    const events = pendingEvents.splice(0, pendingEvents.length);
    writeJsonAtomic(FROM_SERVER, {
        at: Date.now(),
        packet,
        events
    });
    writeJsonAtomic(STATUS_FILE, {
        at: Date.now(),
        mode: 'file-ipc',
        fromServer: true
    });
}

function consumeVerdicts() {
    const data = readJson(TO_SERVER);
    if (!data || data.consumed) return null;
    const has =
        (Array.isArray(data.verdicts) && data.verdicts.length) ||
        (Array.isArray(data.adminMessages) && data.adminMessages.length);
    try {
        writeJsonAtomic(TO_SERVER, {
            at: Date.now(),
            consumed: true,
            verdicts: [],
            adminMessages: [],
            players: data.players || [],
            packets: data.packets || 0
        });
    } catch (_e) {}
    return has || (data.players && data.players.length) ? data : null;
}

module.exports = {
    IPC_DIR,
    FROM_SERVER,
    TO_SERVER,
    ensureDir,
    publishTelemetry,
    publishEvent,
    consumeVerdicts
};
