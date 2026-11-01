'use strict';

const fs = require('fs');
const path = require('path');

/** Корень сервера (flowdm/): logger_<static>.jsonl */
const SERVER_ROOT = path.join(__dirname, '..', '..');
const STATE_FILE = path.join(SERVER_ROOT, 'shoot_logger_state.json');
const LABEL_FILE = path.join(SERVER_ROOT, 'shoot_logger_labels.json');
const loggerEnabledStatics = new Set();
/** staticId → 0 legit | 1 cheat */
const loggerLabels = new Map();
const MAX_ROWS_PER_SUBMIT = 800;
const LOGGER_ADMIN_LEVEL = 10;

function loadLoggerState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const arr = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            if (Array.isArray(arr)) {
                arr.forEach((id) => {
                    const n = parseInt(id, 10);
                    if (n > 0) loggerEnabledStatics.add(n);
                });
            }
        }
    } catch (e) {
        console.log('[shoot_logger] load state:', e.message || e);
    }
    try {
        if (fs.existsSync(LABEL_FILE)) {
            const obj = JSON.parse(fs.readFileSync(LABEL_FILE, 'utf8'));
            if (obj && typeof obj === 'object') {
                Object.keys(obj).forEach((k) => {
                    const sid = parseInt(k, 10);
                    if (sid > 0) loggerLabels.set(sid, Number(obj[k]) === 1 ? 1 : 0);
                });
            }
        }
    } catch (e) {
        console.log('[shoot_logger] load labels:', e.message || e);
    }
}

function saveLoggerState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify([...loggerEnabledStatics]), 'utf8');
    } catch (e) {
        console.log('[shoot_logger] save state:', e.message || e);
    }
}

function saveLoggerLabels() {
    try {
        const obj = {};
        loggerLabels.forEach((v, k) => {
            obj[String(k)] = v ? 1 : 0;
        });
        fs.writeFileSync(LABEL_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.log('[shoot_logger] save labels:', e.message || e);
    }
}

loadLoggerState();

function loggerFilePath(staticId) {
    return path.join(SERVER_ROOT, `logger_${staticId}.jsonl`);
}

function ensureLoggerFile(filePath) {
    if (fs.existsSync(filePath)) return;
    fs.writeFileSync(filePath, '', 'utf8');
}

function appendLoggerRows(filePath, rows) {
    ensureLoggerFile(filePath);
    const lines = rows.map((r) => JSON.stringify(r));
    fs.appendFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function isLoggerEnabled(player) {
    const staticId = parseInt(player && player.static, 10);
    return staticId > 0 && loggerEnabledStatics.has(staticId);
}

function getLabelForStatic(staticId) {
    return loggerLabels.has(staticId) ? (loggerLabels.get(staticId) ? 1 : 0) : 0;
}

function setLoggerStateByStatic(staticId, enabled) {
    if (!staticId || staticId <= 0) return;
    if (enabled) loggerEnabledStatics.add(staticId);
    else loggerEnabledStatics.delete(staticId);
    saveLoggerState();
}

function pushLoggerToClient(player) {
    if (!player || !mp.players.exists(player)) return;
    const staticId = parseInt(player.static, 10);
    if (!staticId) return;
    const on = loggerEnabledStatics.has(staticId);
    const lab = getLabelForStatic(staticId);
    try {
        player.call('shootLogger:set', [on, lab]);
    } catch (_e) {}
}

function restoreShootLoggerForPlayer(player) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    pushLoggerToClient(player);
}

global.restoreShootLoggerForPlayer = restoreShootLoggerForPlayer;

function showLoggerUsage(player) {
    player.outputChatBox('!{#9ad0ff}/logger [static] on|off!{#FFFFFF} — лог → logger_<static>.jsonl');
    player.outputChatBox('!{#9ad0ff}/logger [static] label 0|1!{#FFFFFF} — 0=legit, 1=cheat');
}

mp.events.addCommand('logger', (player, fullText, a1, a2, a3) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (Number(player.adminlvl) < LOGGER_ADMIN_LEVEL) {
            player.outputChatBox(`Нет доступа. Нужен уровень админки ${LOGGER_ADMIN_LEVEL}+.`);
            return;
        }

        // Support both (player, fullText) and (player, _, static, mode, extra)
        let args = [];
        if (a1 != null || a2 != null) {
            args = [a1, a2, a3].filter((x) => x != null && String(x).length);
        } else {
            const raw = String(fullText || '').trim();
            args = raw.split(/\s+/).filter(Boolean);
            if (args[0] && String(args[0]).toLowerCase() === 'logger') args = args.slice(1);
        }

        if (args.length < 2) {
            showLoggerUsage(player);
            return;
        }

        const staticId = parseInt(args[0], 10);
        if (!staticId || staticId <= 0) {
            showLoggerUsage(player);
            return;
        }

        const cmd = String(args[1] || '').toLowerCase();
        const extra = String(args[2] || '').toLowerCase();

        const target =
            typeof global.findOnlinePlayerByStatic === 'function'
                ? global.findOnlinePlayerByStatic(String(staticId))
                : null;

        if (target && mp.players.exists(target)) {
            if (
                typeof global.canAdminTargetPlayer === 'function' &&
                !global.canAdminTargetPlayer(player, target, 'logger')
            ) {
                return;
            }
        }

        if (cmd === 'label') {
            if (extra !== '0' && extra !== '1') {
                showLoggerUsage(player);
                return;
            }
            const lab = extra === '1' ? 1 : 0;
            loggerLabels.set(staticId, lab);
            saveLoggerLabels();
            if (target && mp.players.exists(target)) {
                try {
                    target.call('shootLogger:setLabel', [lab]);
                } catch (_e) {}
                target.outputChatBox(`Метка логгера: ${lab === 1 ? 'CHEAT(1)' : 'LEGIT(0)'}`);
            }
            player.outputChatBox(`Label #${staticId} = ${lab} (${lab === 1 ? 'cheat' : 'legit'}).`);
            return;
        }

        if (cmd !== 'on' && cmd !== 'off') {
            showLoggerUsage(player);
            return;
        }

        const enabled = cmd === 'on';
        setLoggerStateByStatic(staticId, enabled);

        if (target && mp.players.exists(target)) {
            pushLoggerToClient(target);
            target.outputChatBox(
                enabled
                    ? `Логирование ON (label=${getLabelForStatic(staticId)}).`
                    : 'Логирование OFF.'
            );
        }

        player.outputChatBox(
            `Лог ${enabled ? 'ON' : 'OFF'} #${staticId}, label=${getLabelForStatic(staticId)}.` +
                (target ? '' : ' Оффлайн — при входе.') +
                ` → logger_${staticId}.jsonl`
        );
    } catch (e) {
        console.log('[shoot_logger] command:', e.message || e);
    }
});

mp.events.add('shootLogger:submit:s', (player, payloadRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!isLoggerEnabled(player)) return;

        const staticId = parseInt(player.static, 10);
        if (!staticId) return;

        let rows;
        try {
            rows = JSON.parse(String(payloadRaw || '[]'));
        } catch (_parse) {
            return;
        }
        if (!Array.isArray(rows) || !rows.length) return;
        if (rows.length > MAX_ROWS_PER_SUBMIT) rows = rows.slice(0, MAX_ROWS_PER_SUBMIT);

        const forcedLabel = getLabelForStatic(staticId);
        const out = [];
        const now = Date.now();

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i] || {};
            const yaw = Number(r.yaw_speed);
            const pitch = Number(r.pitch_speed);
            const dist = Number(r.distance);
            if (!Number.isFinite(yaw) || !Number.isFinite(pitch) || !Number.isFinite(dist)) continue;

            out.push({
                v: 2,
                static: staticId,
                at: now,
                burst_id: Number(r.burst_id) || 0,
                i: Number(r.i) || 0,
                t_ms: Number(r.t_ms) || 0,
                yaw_speed: yaw,
                pitch_speed: pitch,
                yaw_acc: Number(r.yaw_acc) || 0,
                pitch_acc: Number(r.pitch_acc) || 0,
                yaw: Number(r.yaw) || 0,
                pitch: Number(r.pitch) || 0,
                distance: dist,
                aim_err_deg: Number(r.aim_err_deg) || 0,
                miss_m: Number(r.miss_m) || 0,
                has_target: Number(r.has_target) === 1 ? 1 : 0,
                target_id: Number(r.target_id),
                is_headshot: Number(r.is_headshot) === 1 ? 1 : 0,
                is_hit: Number(r.is_hit) === 1 ? 1 : 0,
                is_aiming: Number(r.is_aiming) === 1 ? 1 : 0,
                weapon: Number(r.weapon) >>> 0,
                label: forcedLabel
            });
        }
        if (!out.length) return;

        appendLoggerRows(loggerFilePath(staticId), out);
    } catch (e) {
        console.log('[shoot_logger] submit:', e.message || e);
    }
});
