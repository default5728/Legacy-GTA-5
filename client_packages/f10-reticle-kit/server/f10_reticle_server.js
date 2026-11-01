/**
 * Сервер: сохранение прицела в accounts.crosshair_json + колонка при старте.
 * Подключить в packages/server/index.js: require('./f10_reticle_server.js');
 */
const CROSSHAIR_JSON_DB_MAX = 12000;
const CROSSHAIR_DB_FLUSH_MS = 900;

function ensureCrosshairJsonColumn() {
    if (!global.DB) {
        setTimeout(ensureCrosshairJsonColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN crosshair_json MEDIUMTEXT NULL DEFAULT NULL',
        [],
        (err) => {
            if (!err) {
                console.log('[f10-reticle] колонка accounts.crosshair_json создана.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[f10-reticle] ALTER accounts ADD crosshair_json:', err.code || err.message);
        }
    );
}

function flushCrosshairJsonPending(player) {
    if (!player || !mp.players.exists(player)) return;
    player._crosshairDbFlushTimer = null;
    const payload = player._crosshairJsonPending;
    player._crosshairJsonPending = null;
    if (!payload || !global.DB) return;
    const sid = player.static;
    if (sid == null || sid === '') return;
    global.DB.query(
        'UPDATE accounts SET crosshair_json = ? WHERE static = ? LIMIT 1',
        [payload, sid],
        () => {}
    );
}

mp.events.add('crosshairSettingsSave:s', (player, jsonStr) => {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return;
        const sid = player.static;
        if (sid == null || sid === '') return;
        const raw = jsonStr == null ? '' : String(jsonStr);
        if (!raw.length || raw.length > CROSSHAIR_JSON_DB_MAX) return;
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (_e) {
            return;
        }
        if (!Array.isArray(parsed) || !parsed[0] || typeof parsed[0] !== 'object') return;
        player._crosshairJsonPending = raw;
        if (player._crosshairDbFlushTimer) return;
        player._crosshairDbFlushTimer = setTimeout(() => flushCrosshairJsonPending(player), CROSSHAIR_DB_FLUSH_MS);
    } catch (_e2) {}
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player || !player._crosshairJsonPending) return;
        if (player._crosshairDbFlushTimer) {
            clearTimeout(player._crosshairDbFlushTimer);
            player._crosshairDbFlushTimer = null;
        }
        flushCrosshairJsonPending(player);
    } catch (_e) {}
});

mp.events.add('packagesLoaded', () => {
    setTimeout(ensureCrosshairJsonColumn, 2000);
});

/** Вызвать после SELECT * FROM accounts при логине */
function hydrateCrosshairSettingsFromAccount(player, row) {
    try {
        if (!mp.players.exists(player) || !row) return;
        const ch = row.crosshair_json;
        if (typeof ch !== 'string' || !ch.trim().length) return;
        player.call('crosshairSettingsHydrate', [ch.trim()]);
    } catch (_e) {}
}

global.hydrateCrosshairSettingsFromAccount = hydrateCrosshairSettingsFromAccount;
