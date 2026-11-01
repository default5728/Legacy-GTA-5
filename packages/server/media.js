/**
 * Медиа-статус: выдача админом 8 lvl, тег в чате/репортах/над головой, канал Media.
 */

const MEDIA_CHAT_TAG = ' !{#22c55e}[MEDIA]';

function ensureMediaColumn() {
    if (!global.DB) {
        setTimeout(ensureMediaColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN media TINYINT(1) NOT NULL DEFAULT 0',
        [],
        (err) => {
            if (!err) {
                console.log('[media] колонка accounts.media создана автоматически.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[media] ALTER:', err.code || err.message);
        }
    );
}

ensureMediaColumn();

global.playerHasMedia = function playerHasMedia(player) {
    if (!player) return false;
    return player.media === true || player.getVariable('media') === true;
};

global.getMediaChatTagRage = function getMediaChatTagRage(player) {
    return global.playerHasMedia(player) ? MEDIA_CHAT_TAG : '';
};

global.syncMediaStatusClient = function syncMediaStatusClient(player, enabled) {
    if (!mp.players.exists(player)) return;
    const v = enabled === true || enabled === 1 || enabled === '1';
    player.media = v;
    player.setVariable('media', v);
    try {
        player.call('chat:syncChannels');
    } catch (_e) {}
};

function findOnlineByStatic(staticId) {
    const sid = parseInt(staticId, 10);
    if (!Number.isFinite(sid)) return null;
    return mp.players.toArray().find((p) => p && mp.players.exists(p) && parseInt(p.static, 10) === sid) || null;
}

function setMediaStatusByStatic(admin, staticId, enabled) {
    const adminLvl = Number(admin.adminlvl) || 0;
    const needLvl = enabled ? 6 : 8;
    if (adminLvl < needLvl) {
        return isNotify(admin, 2, 'top-mid', `Команда доступна с ${needLvl} уровня админки.`, 3500);
    }
    const sid = String(staticId || '').trim();
    if (!sid) {
        return admin.outputChatBox(enabled ? 'Использование: /givemedia [static]' : 'Использование: /takemedia [static] или /removemedia [static]');
    }

    global.DB.query('SELECT static, login, media, adminlvl FROM accounts WHERE static = ? LIMIT 1', [sid], (err, rows) => {
        if (err) return console.log('[media] SELECT:', err.message || err);
        if (!rows || !rows.length) return admin.outputChatBox('Игрок не найден.');

        const row = rows[0];
        if (typeof global.canAdminActOnLevel === 'function' && !global.canAdminActOnLevel(admin, Number(row.adminlvl) || 0, enabled ? 'givemedia' : 'takemedia', sid)) return;
        const hasMedia = Number(row.media) === 1;
        if (enabled && hasMedia) return admin.outputChatBox(`У игрока ${row.login} уже есть медиа-статус.`);
        if (!enabled && !hasMedia) return admin.outputChatBox(`У игрока ${row.login} нет медиа-статуса.`);

        global.DB.query('UPDATE accounts SET media = ? WHERE static = ?', [enabled ? 1 : 0, sid], (err2) => {
            if (err2) return console.log('[media] UPDATE:', err2.message || err2);

            const target = findOnlineByStatic(sid);
            if (target) {
                global.syncMediaStatusClient(target, enabled);
                isNotify(
                    target,
                    enabled ? 3 : 2,
                    'bottom-mid',
                    enabled
                        ? `Вам выдан медиа-статус администратором ${admin.login}.`
                        : `Ваш медиа-статус снят администратором ${admin.login}.`,
                    5000
                );
            }

            admin.outputChatBox(
                enabled
                    ? `Медиа-статус выдан игроку ${row.login} (#${sid}).`
                    : `Медиа-статус снят с игрока ${row.login} (#${sid}). Команды: /takemedia, /removemedia`
            );

            try {
                global.sendDiscordLog(
                    `${enabled ? 'Выдача' : 'Снятие'} медиа-статуса\n\nАдминистратор — ${admin.login}\nИгрок — ${row.login} (#${sid})`,
                    '1266445805355532368'
                );
            } catch (_eD) {}
        });
    });
}

mp.events.addCommand('givemedia', (player, _, staticId) => {
    try {
        if (!player.getVariable('auth')) return;
        setMediaStatusByStatic(player, staticId, true);
    } catch (e) {
        console.log('[media] givemedia:', e.message || e);
    }
});

mp.events.addCommand('takemedia', (player, _, staticId) => {
    try {
        if (!player.getVariable('auth')) return;
        setMediaStatusByStatic(player, staticId, false);
    } catch (e) {
        console.log('[media] takemedia:', e.message || e);
    }
});

mp.events.addCommand('removemedia', (player, _, staticId) => {
    try {
        if (!player.getVariable('auth')) return;
        setMediaStatusByStatic(player, staticId, false);
    } catch (e) {
        console.log('[media] removemedia:', e.message || e);
    }
});
