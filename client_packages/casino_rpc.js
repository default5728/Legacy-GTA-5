'use strict';

try {
    global.rpc = require('./rage-rpc.min.js');
} catch (_e) {
    try {
        global.rpc = require('./utils/rage-rpc.min.js');
    } catch (_e2) {
        mp.console.logWarning('[casino_rpc] rage-rpc not loaded');
    }
}

if (typeof global.isChatOpen === 'undefined') {
    global.isChatOpen = false;
    mp.events.add('render', () => {
        try { global.isChatOpen = !!mp.players.local.isTypingInTextChat; } catch (_e) {}
    });
}
if (typeof global.disableKeys === 'undefined') {
    global.disableKeys = false;
}

/** Ref-counted cursor для казино/CEF-меню (Flow не определяет showCursor глобально). */
if (typeof global.showCursor !== 'function') {
    let __overlayCursorLocks = 0;
    function applyOverlayCursor() {
        const on = __overlayCursorLocks > 0;
        try {
            mp.gui.cursor.show(on, on);
            mp.gui.cursor.visible = on;
        } catch (_e) {}
    }
    global.showCursor = (show) => {
        if (show) __overlayCursorLocks++;
        else __overlayCursorLocks = Math.max(0, __overlayCursorLocks - 1);
        applyOverlayCursor();
    };
    global.forceHideAllCursors = () => {
        __overlayCursorLocks = 0;
        applyOverlayCursor();
    };
}

const rpc = global.rpc;

global.casinoNotifyError = function casinoNotifyError(msg) {
    try {
        mp.events.call('notify:client', 2, 'top-mid', String(msg || 'Ошибка'), 3000);
    } catch (_e) {}
};

mp.events.add('__call_remote_event', (eventName, ...args) => {
    try {
        mp.events.callRemote(String(eventName), ...args);
    } catch (_e) {}
});

if (rpc && rpc.register) {
    rpc.register('clientFunc_notifyError', (msg) => {
        try {
            mp.events.call('notify:client', 2, 'top-mid', String(msg || 'Ошибка'), 3000);
        } catch (_e) {}
        return true;
    });

    rpc.register('clientFunc_notifySuccess', (msg) => {
        try {
            mp.events.call('notify:client', 3, 'top-mid', String(msg || 'Готово'), 3000);
        } catch (_e) {}
        return true;
    });
}
