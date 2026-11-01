'use strict';

/** Подготовка до боя. Война семей — 3 мин, капт фракций — 8 мин. */
const FAMILY_WAR_PREP_MS = 3 * 60 * 1000;
const BIZWAR_PREP_MS = 8 * 60 * 1000;

function pushHudWarAlert(player, payload) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    try {
        player.call('hud:warAlert:c', [JSON.stringify(payload)]);
    } catch (_e) {}
}

function clearHudWarAlert(player, kind) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.call('hud:warAlert:clear:c', [kind != null ? String(kind) : '']);
    } catch (_e) {}
}

/** «5x5» / «5v5» → «5v5» для HUD */
function normalizeWarFormatLabel(formatRaw) {
    const s = String(formatRaw || '').trim();
    if (!s) return '';
    let m = /^(\d+)x(\d+)$/i.exec(s);
    if (m && m[1] === m[2]) return `${m[1]}v${m[2]}`;
    m = /^(\d+)v(\d+)$/i.exec(s);
    if (m && m[1] === m[2]) return `${m[1]}v${m[2]}`;
    return s;
}

function buildWarNotifyText(kind, role, themName, target, format, calibers, extras) {
    const fmt = normalizeWarFormatLabel(format);
    const fmtPart = fmt ? ` Формат: ${fmt}.` : '';
    const calPart = calibers ? ` Калибры: ${calibers}.` : '';
    const extraPart = extras ? ` ${extras}` : '';
    const enemy = String(themName || '').trim() || 'противник';
    const place = String(target || '').trim();

    if (kind === 'bizwar') {
        if (role === 'defender') {
            return `Фракция «${enemy}» забила вам капт!${place ? ` ${place}.` : ''}${fmtPart}${calPart}${extraPart}`.trim();
        }
        return `Ваша фракция забила капт!${place ? ` ${place}` : ''} против «${enemy}».${fmtPart}${calPart}${extraPart}`.trim();
    }

    if (role === 'defender') {
        return `Семья «${enemy}» забила вам войну семей!${place ? ` ${place}.` : ''}${fmtPart}${calPart}${extraPart}`.trim();
    }
    const vsPart = enemy && enemy !== 'свободную точку' ? ` против «${enemy}»` : '';
    return `Ваша семья забила войну семей!${place ? ` ${place}` : ''}${vsPart}.${fmtPart}${calPart}${extraPart}`.trim();
}

function famKey(name) {
    return String(name == null ? '' : name).trim();
}

function playerFractionIdSafe(player) {
    if (typeof global.playerFractionId === 'function') {
        return global.playerFractionId(player) || 0;
    }
    return parseInt(player.getVariable('fraction'), 10) || 0;
}

function fractionDisplayName(fid) {
    if (typeof global.getFracName === 'function') return global.getFracName(fid);
    return `фракция #${fid}`;
}

function captExtrasFromBattle(battle) {
    if (!battle) return '';
    return `Спанк: ${battle.allowSpank ? 'да' : 'нет'}, Алко: ${battle.allowAlco ? 'да' : 'нет'}, Броня: ${battle.allowArmor ? 'да' : 'нет'}`;
}

function captCalibersStr(battle) {
    if (!battle) return '—';
    if (Array.isArray(battle.calibers) && battle.calibers.length) return battle.calibers.join(', ');
    return '—';
}

function bizwarExtrasFromBw(bw) {
    if (!bw) return '';
    return `Спанк: ${bw.allowSpunk ? 'да' : 'нет'}, Алко: ${bw.allowAlco ? 'да' : 'нет'}, Броня: ${bw.allowArmor ? 'да' : 'нет'}`;
}

function bizwarCalibersStr(bw) {
    if (!bw) return '—';
    if (Array.isArray(bw.calibers) && bw.calibers.length) return bw.calibers.join(', ');
    return '—';
}

function broadcastCaptWarAlerts(attackerFamily, defenderFamily, pointId, calibersStr, extrasStr, startTimeMs, formatRaw) {
    const atk = String(attackerFamily || '').trim();
    const def = defenderFamily && defenderFamily !== 'Свободна' ? String(defenderFamily).trim() : '';
    if (!atk) return;
    const fightStartAt = Number(startTimeMs) + FAMILY_WAR_PREP_MS;
    const target = `точка №${pointId}`;
    const prepSec = Math.floor(FAMILY_WAR_PREP_MS / 1000);
    const format = normalizeWarFormatLabel(formatRaw);

    mp.players.forEach((p) => {
        const fam = String(p.family || p.getVariable('family') || '').trim();
        if (!fam) return;
        let role = null;
        if (fam === atk) role = 'attacker';
        else if (def && fam === def) role = 'defender';
        if (!role) return;
        const themName = role === 'attacker' ? (def || 'свободную точку') : atk;
        pushHudWarAlert(p, {
            kind: 'capt',
            role,
            usName: fam,
            themName,
            calibers: calibersStr || '—',
            extras: extrasStr || '',
            target,
            text: buildWarNotifyText('capt', role, themName, target, format, calibersStr, extrasStr),
            fightStartAt,
            prepSec,
            format
        });
    });
}

function broadcastCaptWarAlertClear(attackerFamily, defenderFamily) {
    const keys = new Set();
    const a = String(attackerFamily || '').trim();
    const d = String(defenderFamily || '').trim();
    if (a) keys.add(a);
    if (d && d !== 'Свободна') keys.add(d);
    if (!keys.size) return;
    mp.players.forEach((p) => {
        const fam = String(p.family || p.getVariable('family') || '').trim();
        if (keys.has(fam)) clearHudWarAlert(p, 'capt');
    });
}

function broadcastBizwarWarAlerts(attackerFrac, defenderFrac, zoneId, calibersStr, extrasStr, startTimeMs, atkName, defName, countPerSide) {
    const fightStartAt = Number(startTimeMs) + BIZWAR_PREP_MS;
    const target = `квадрат №${zoneId}`;
    const prepSec = Math.floor(BIZWAR_PREP_MS / 1000);
    const atk = parseInt(attackerFrac, 10) || 0;
    const def = parseInt(defenderFrac, 10) || 0;
    const n = Math.max(1, parseInt(countPerSide, 10) || 0);
    const format = normalizeWarFormatLabel(`${n}v${n}`);

    mp.players.forEach((p) => {
        if (!p.getVariable('auth')) return;
        const fid = typeof global.playerFractionId === 'function'
            ? global.playerFractionId(p)
            : parseInt(p.getVariable('fraction'), 10) || 0;
        if (!fid) return;
        let role = null;
        if (fid === atk) role = 'attacker';
        else if (def > 0 && fid === def) role = 'defender';
        if (!role) return;
        const us = role === 'attacker' ? (atkName || `фракция #${atk}`) : (defName || `фракция #${def}`);
        const them = role === 'attacker' ? (defName || 'нейтральную зону') : (atkName || `фракция #${atk}`);
        pushHudWarAlert(p, {
            kind: 'bizwar',
            role,
            usName: us,
            themName: them,
            calibers: calibersStr || '—',
            extras: extrasStr || '',
            target,
            text: buildWarNotifyText('bizwar', role, them, target, format, calibersStr, extrasStr),
            fightStartAt,
            prepSec,
            format
        });
    });
}

function broadcastBizwarWarAlertClear(attackerFrac, defenderFrac) {
    const fracs = new Set();
    const a = parseInt(attackerFrac, 10) || 0;
    const d = parseInt(defenderFrac, 10) || 0;
    if (a) fracs.add(a);
    if (d) fracs.add(d);
    if (!fracs.size) return;
    mp.players.forEach((p) => {
        if (!p.getVariable('auth')) return;
        const fid = typeof global.playerFractionId === 'function'
            ? global.playerFractionId(p)
            : parseInt(p.getVariable('fraction'), 10) || 0;
        if (fracs.has(fid)) clearHudWarAlert(p, 'bizwar');
    });
}

/**
 * После реконнекта HUD-алерты «забили капт / войну семей» пропадают —
 * восстанавливаем все активные бои для семьи/фракции игрока.
 */
function syncActiveWarsForPlayer(player) {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;

        const fam = famKey(player.family || player.getVariable('family'));
        if (fam) {
            for (const [bid, battle] of Object.entries(global.activeBattles || {})) {
                if (!battle) continue;
                const pointId = parseInt(battle.pointId != null ? battle.pointId : bid, 10);
                if (!Number.isFinite(pointId)) continue;
                const atk = famKey(battle.attackerFamily);
                const defRaw = famKey(battle.defenderFamily);
                const def = defRaw && defRaw !== 'Свободна' ? defRaw : '';
                let role = null;
                if (fam === atk) role = 'attacker';
                else if (def && fam === def) role = 'defender';
                if (!role) continue;

                const startTimeMs = Number(battle.startTime) || Date.now();
                const fightStartAt = startTimeMs + FAMILY_WAR_PREP_MS;
                const target = `точка №${pointId}`;
                const calStr = captCalibersStr(battle);
                const extrasStr = captExtrasFromBattle(battle);
                const format = normalizeWarFormatLabel(battle.format);
                const themName = role === 'attacker' ? (def || 'свободную точку') : atk;
                const payload = {
                    kind: 'capt',
                    role,
                    usName: fam,
                    themName,
                    calibers: calStr,
                    extras: extrasStr,
                    target,
                    text: buildWarNotifyText('capt', role, themName, target, format, calStr, extrasStr),
                    fightStartAt,
                    prepSec: Math.floor(FAMILY_WAR_PREP_MS / 1000),
                    format
                };
                pushHudWarAlert(player, payload);
                try {
                    if (role === 'defender') {
                        player.outputChatBox(
                            `!{#ff0000}[ВОЙНА СЕМЕЙ] !{#fff}Семья ${atk} забила вам войну семей! Точка #${pointId}. Формат: ${format || '—'}, калибры: ${calStr}. ${extrasStr}`
                        );
                    } else {
                        player.outputChatBox(
                            `!{#ff0000}[ВОЙНА СЕМЕЙ] !{#fff}Активная война семей: точка #${pointId}. Формат: ${format || '—'}, калибры: ${calStr}. ${extrasStr}`
                        );
                    }
                } catch (_eChat) {}
            }
        }

        const fid = playerFractionIdSafe(player);
        if (fid) {
            for (const [zidStr, bw] of Object.entries(global.activeBizwars || {})) {
                if (!bw) continue;
                const zoneId = parseInt(zidStr, 10);
                if (!Number.isFinite(zoneId)) continue;
                const atk = parseInt(bw.attackerFrac, 10) || 0;
                const def = parseInt(bw.defenderFrac, 10) || 0;
                let role = null;
                if (fid === atk) role = 'attacker';
                else if (def > 0 && fid === def) role = 'defender';
                if (!role) continue;

                const startTimeMs = Number(bw.startedAt) || Date.now();
                const fightStartAt = startTimeMs + BIZWAR_PREP_MS;
                const target = `квадрат №${zoneId}`;
                const calStr = bizwarCalibersStr(bw);
                const extrasStr = bizwarExtrasFromBw(bw);
                const n = Math.max(1, parseInt(bw.count, 10) || 0);
                const format = normalizeWarFormatLabel(`${n}v${n}`);
                const atkName = fractionDisplayName(atk);
                const defName = def > 0 ? fractionDisplayName(def) : 'Нейтрально';
                const us = role === 'attacker' ? atkName : defName;
                const them = role === 'attacker' ? (def > 0 ? defName : 'нейтральную зону') : atkName;
                pushHudWarAlert(player, {
                    kind: 'bizwar',
                    role,
                    usName: us,
                    themName: them,
                    calibers: calStr,
                    extras: extrasStr,
                    target,
                    text: buildWarNotifyText('bizwar', role, them, target, format, calStr, extrasStr),
                    fightStartAt,
                    prepSec: Math.floor(BIZWAR_PREP_MS / 1000),
                    format
                });
                try {
                    player.outputChatBox(
                        `!{#dc2626}[КАПТЫ] !{#e8e8e8}${atkName} атакует зону #${zoneId} (${defName}). Калибры: ${calStr}. Формат: ${format}`
                    );
                } catch (_eChat2) {}
            }
        }
    } catch (e) {
        console.log('[WAR] syncActiveWarsForPlayer:', e && e.message ? e.message : e);
    }
}

/** Отложенный вызов — HUD CEF успевает подняться после спавна. */
function scheduleSyncActiveWarsForPlayer(player, delayMs) {
    if (!player || !mp.players.exists(player)) return;
    const wait = Math.max(0, Number(delayMs) || 1200);
    try {
        if (player._warSyncTimer) clearTimeout(player._warSyncTimer);
    } catch (_e) {}
    player._warSyncTimer = setTimeout(() => {
        try { delete player._warSyncTimer; } catch (_e2) {}
        if (!player || !mp.players.exists(player)) return;
        syncActiveWarsForPlayer(player);
    }, wait);
}

global.broadcastCaptWarAlerts = broadcastCaptWarAlerts;
global.broadcastCaptWarAlertClear = broadcastCaptWarAlertClear;
global.broadcastBizwarWarAlerts = broadcastBizwarWarAlerts;
global.broadcastBizwarWarAlertClear = broadcastBizwarWarAlertClear;
global.syncActiveWarsForPlayer = syncActiveWarsForPlayer;
global.scheduleSyncActiveWarsForPlayer = scheduleSyncActiveWarsForPlayer;
