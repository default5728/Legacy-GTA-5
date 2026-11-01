'use strict';

/** Минимальный уровень для /hideme — визуально игрок, права админа на сервере сохраняются. */
global.ADMIN_HIDEME_MIN_LVL = 10;

global.getTrueAdminLevel = function getTrueAdminLevel(player) {
    if (!player || !mp.players.exists(player)) return 0;
    return Number(player.adminlvl) || 0;
};

global.isAdminHideMeActive = function isAdminHideMeActive(player) {
    if (!player || !mp.players.exists(player)) return false;
    return !!player._adminHideMe && global.getTrueAdminLevel(player) >= global.ADMIN_HIDEME_MIN_LVL;
};

/** Публичный админ-тег в чате / над головой /admins / ESP. */
global.shouldShowAdminPublicly = function shouldShowAdminPublicly(player) {
    if (!player || !mp.players.exists(player)) return false;
    if (global.isAdminHideMeActive(player)) return false;
    const trueLv = global.getTrueAdminLevel(player);
    if (trueLv < 1) return false;
    if (typeof global.hasAdminSessionPrivileges === 'function') {
        return global.hasAdminSessionPrivileges(player);
    }
    return true;
};

global.buildChatSpeakerSuffix = function buildChatSpeakerSuffix(player) {
    if (!player || !mp.players.exists(player)) return '';
    const nick = typeof global.getPlayerDisplayName === 'function'
        ? global.getPlayerDisplayName(player)
        : (typeof global.safeDisplayName === 'function'
            ? global.safeDisplayName(player.login || player.name)
            : String(player.login || player.name || '').trim());
    const safeNick = typeof global.safeDisplayName === 'function'
        ? global.safeDisplayName(nick)
        : String(nick || 'Игрок').trim();
    return `${safeNick || 'Игрок'} (${player.id})`;
};

global.shouldShowAdminChatTag = function shouldShowAdminChatTag(player) {
    if (!player || !mp.players.exists(player)) return false;
    if (global.isAdminHideMeActive(player)) return false;
    if (player.getVariable('radname') !== true) return false;
    if (typeof global.hasAdminSessionPrivileges === 'function') {
        return global.hasAdminSessionPrivileges(player);
    }
    return Number(player.adminlvl) >= 1;
};

function syncStealthVariables(player) {
    if (!player || !mp.players.exists(player)) return;
    player.setVariable('adminHideMe', global.isAdminHideMeActive(player));
}

const origSyncAdminSessionClient = global.syncAdminSessionClient;
global.syncAdminSessionClient = function syncAdminSessionClientPatched(player) {
    if (!player || !mp.players.exists(player)) return;
    const trueLv = Number(player.adminlvl) || 0;
    origSyncAdminSessionClient(player);
    if (global.isAdminHideMeActive(player)) {
        player.setVariable('adminlvl', 0);
    }
    syncStealthVariables(player);
    player.setVariable('adminTrueLvl', trueLv);
};

const origApplyAdminSessionOnAuth = global.applyAdminSessionOnAuth;
global.applyAdminSessionOnAuth = function applyAdminSessionOnAuthPatched(player) {
    if (!player || !mp.players.exists(player)) return;
    player._adminHideMe = false;
    origApplyAdminSessionOnAuth(player);
};

mp.events.addCommand('hideme', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const trueLv = global.getTrueAdminLevel(player);
        if (trueLv < global.ADMIN_HIDEME_MIN_LVL) {
            return isNotify(player, 2, 'top-mid', `Команда доступна с ${global.ADMIN_HIDEME_MIN_LVL} уровня админки.`, 3500);
        }
        player._adminHideMe = !player._adminHideMe;
        global.syncAdminSessionClient(player);
        if (player._adminHideMe) {
            isNotify(player, 3, 'top-mid', 'Режим hideme включён: для других вы обычный игрок, права админа сохранены.', 4500);
            player.outputChatBox('!{#888888}[hideme] Включено — скрыты ESP, /admins, тег [ADMIN] в чате.');
        } else {
            isNotify(player, 3, 'top-mid', 'Режим hideme выключен.', 3000);
            player.outputChatBox('!{#888888}[hideme] Выключено.');
        }
    } catch (e) {
        console.log('[hideme]', e);
    }
});
