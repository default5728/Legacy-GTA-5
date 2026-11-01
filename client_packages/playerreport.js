/**
 * Меню репорта — только /report в чате (клавиша F7 и бинды отключены).
 */
let reportbr = mp.browsers.new('package://browsers/playerreport/index.html');
reportbr.active = false;
let lastReportSyncPayload = null;

/** Админы 1–7 не открывают меню репорта; с 8 уровня — могут. */
function isReportMenuBlockedForAdmin() { return false; }

function canOpenReportMenu() {
    if (mp.players.local.isTypingInTextChat) return false;
    if (typeof global.isReportKeybindBlocked === 'function' && global.isReportKeybindBlocked()) return false;
    if (!mp.players.local.getVariable('auth')) return false;
    if (!mp.players.local.getVariable('authtwo')) return false;
    if (isReportMenuBlockedForAdmin()) return false;
    return true;
}

function isMenuKeepingCursorVisible() {
    try {
        if (global.__menubr && mp.browsers.exists(global.__menubr) && global.__menubr.active) return true;
        if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return true;
        if (global.__playermenuOpen) return true;
    } catch (_e) {}
    return false;
}

function hideReportCursorIfNeeded() {
    if (!isMenuKeepingCursorVisible()) {
        mp.gui.cursor.show(false, false);
    }
}

function openReportFromChat(draftText) {
    if (typeof global.openPlayerMenuReportFromChat === 'function') {
        global.openPlayerMenuReportFromChat(draftText);
        return;
    }
    if (!canOpenReportMenu()) {
        if (isReportMenuBlockedForAdmin()) {
            try {
                mp.events.call('notify:client', 2, 'top-mid', 'Репорты с админ-аккаунта доступны с 8 уровня.', 4000);
            } catch (_e) {}
        }
    }
}

global.openReportFromChat = openReportFromChat;

mp.events.add('client.openReportFromChat', (draft) => {
    openReportFromChat(draft);
});

mp.events.add('chatOpenReportUi', (draft) => {
    openReportFromChat(draft);
});

function openReportMenu() {
    if (typeof global.openPlayerMenuReportFromChat === 'function') {
        global.openPlayerMenuReportFromChat('');
        return;
    }
    if (!canOpenReportMenu()) return;
}

function closeReportMenu() {
    global.__playermenuReportFocus = false;
    if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) {
        if (typeof global.closePlayerMenu === 'function') global.closePlayerMenu();
        return;
    }
    if (reportbr && mp.browsers.exists(reportbr) && reportbr.active) {
        reportbr.active = false;
    }
    mp.events.callRemote('report:ui:setOpen', false);
    hideReportCursorIfNeeded();
}

if (typeof global !== 'undefined') {
    global.tryCloseReportEsc = () => {
        if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen() && global.__playermenuReportFocus) {
            closeReportMenu();
            return true;
        }
        if (reportbr && mp.browsers.exists(reportbr) && reportbr.active) {
            closeReportMenu();
            return true;
        }
        return false;
    };
}

mp.events.add('togglePlayerReportMenu', () => {
    if (
        typeof global.isPlayerMenuOpen === 'function' &&
        global.isPlayerMenuOpen() &&
        global.__playermenuReportFocus
    ) {
        closeReportMenu();
        return;
    }
    if (reportbr && mp.browsers.exists(reportbr) && reportbr.active) {
        closeReportMenu();
        return;
    }
    if (!canOpenReportMenu()) return;
    openReportMenu();
});

mp.events.add('report:ui:sync', (payload) => {
    try {
        const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
        lastReportSyncPayload = s;
        if (typeof global.pushReportToBrowser === 'function') {
            try {
                const parsed = JSON.parse(s);
                global.pushReportToBrowser({
                    messages: Array.isArray(parsed.messages)
                        ? parsed.messages.map(function (m) {
                            return {
                                name: m.role === 'admin'
                                    ? '[A] ' + (m.author || 'Admin')
                                    : (m.author || 'Вы'),
                                text: String(m.text || ''),
                                ts: m.ts || 0
                            };
                        })
                        : [],
                    openTab: parsed.open ? 7 : null
                });
            } catch (_pf) {}
        }
        if (reportbr && mp.browsers.exists(reportbr)) {
            reportbr.execute(`if(window.reportApp)window.reportApp.setState(${JSON.stringify(s)})`);
        }
    } catch (_e) {}
});

mp.events.add('report:ui:closed', (reason) => {
    try {
        const r = typeof reason === 'string' ? reason : 'admin';
        if (reportbr && mp.browsers.exists(reportbr)) {
            reportbr.execute(`if(window.reportApp)window.reportApp.onClosed(${JSON.stringify(r)})`);
        }
        let closedPayload = { open: false, messages: [] };
        if (lastReportSyncPayload) {
            try {
                const prev = JSON.parse(lastReportSyncPayload);
                if (Array.isArray(prev.messages) && prev.messages.length) {
                    closedPayload.messages = prev.messages;
                }
            } catch (_eParse) {}
        }
        if (r === 'player') {
            closedPayload.messages = [];
        }
        if (reportbr && mp.browsers.exists(reportbr) && reportbr.active) {
            reportbr.active = false;
            hideReportCursorIfNeeded();
            mp.events.callRemote('report:ui:setOpen', false);
        }
        hideReportCursorIfNeeded();
    } catch (_e) {}
});

mp.events.add('report:ui:create', (text) => {
    mp.events.callRemote('report:ui:create', text);
});

mp.events.add('report:ui:send', (text) => {
    mp.events.callRemote('report:ui:send', text);
});

mp.events.add('report:ui:close', () => {
    mp.events.callRemote('report:ui:close');
});

mp.events.add('reportEmbedPull', () => {
    if (lastReportSyncPayload) {
        return;
    }
    try {
        mp.events.callRemote('report:ui:requestState');
    } catch (_e) {}
});
