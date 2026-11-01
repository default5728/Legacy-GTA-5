/** NPC FIB: выбор визуального бронежилета (слот 9), только fraction === 6 */

let fibArmorNear = false;
let fibArmorV4Unlocked = false;
let fibArmorBrowser = null;
let fibArmorMenuOpen = false;
let fibArmorLastE = 0;

try {
    fibArmorBrowser = mp.browsers.new('package://browsers/fib_armor/index.html');
    if (fibArmorBrowser) fibArmorBrowser.active = false;
} catch (_e) {
    fibArmorBrowser = null;
}

function fibArmorExec(code) {
    if (!fibArmorBrowser || !mp.browsers.exists(fibArmorBrowser)) return;
    if (typeof global.browserExecWhen === 'function') {
        global.browserExecWhen(fibArmorBrowser, 'typeof window.show==="function"', code);
    } else if (typeof global.browserExec === 'function') {
        global.browserExec(fibArmorBrowser, code);
    } else {
        try { fibArmorBrowser.execute(code); } catch (_e2) {}
    }
}

function fibArmorHideWorldUi() {
    try {
        if (typeof global.hideWorldUiForModal === 'function') {
            global.hideWorldUiForModal();
            return;
        }
        mp.events.call('hud', false);
        mp.events.call('help', false);
        mp.events.call('hudKeyHints', false);
        mp.events.call('minimap', false);
        mp.game.ui.displayRadar(false);
        mp.game.ui.displayHud(false);
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
        if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
        } else {
            mp.events.call('hideChatServer');
        }
    } catch (_e) {}
}

function fibArmorShowWorldUi() {
    try {
        if (typeof global.forceCloseNpcDialogModal === 'function') {
            global.forceCloseNpcDialogModal({ unfreeze: false });
        }
        if (typeof global.invalidateWorldChromeRasterCache === 'function') {
            global.invalidateWorldChromeRasterCache();
        }
        if (typeof global.showWorldUiAfterModal === 'function') {
            global.showWorldUiAfterModal();
            return;
        }
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
            return;
        }
        mp.events.call('hud', true);
        mp.events.call('help', true);
        mp.events.call('minimap', true);
        mp.game.ui.displayRadar(true);
    } catch (_e) {}
}

mp.events.add('fibArmorNpc:near', (flag) => {
    fibArmorNear = flag === true || flag === 1;
});

mp.events.add('fibArmor:v4Unlocked', (flag) => {
    fibArmorV4Unlocked = flag === true || flag === 1;
    if (fibArmorMenuOpen) {
        fibArmorExec(
            `try{if(typeof window.fibArmorSetV4Unlocked==='function')window.fibArmorSetV4Unlocked(${fibArmorV4Unlocked ? 'true' : 'false'});}catch(_e){}`
        );
    }
});

function fibArmorCloseUi() {
    if (!fibArmorMenuOpen) return;
    fibArmorMenuOpen = false;
    fibArmorExec('try{if(typeof window.hideUiOnly==="function")window.hideUiOnly();}catch(_e){}');
    if (fibArmorBrowser && mp.browsers.exists(fibArmorBrowser)) fibArmorBrowser.active = false;
    mp.gui.cursor.show(false, false);
    fibArmorShowWorldUi();
}

function fibArmorOpenUi() {
    if (!fibArmorBrowser || !mp.browsers.exists(fibArmorBrowser)) return;
    fibArmorMenuOpen = true;
    fibArmorHideWorldUi();
    fibArmorBrowser.active = true;

    const openCodes = [
        `try{if(typeof window.fibArmorSetV4Unlocked==='function')window.fibArmorSetV4Unlocked(${fibArmorV4Unlocked ? 'true' : 'false'});}catch(_e){}`,
        'try{window.show();}catch(_e){}'
    ];
    if (typeof global.openManagedCefWhen === 'function') {
        global.openManagedCefWhen(fibArmorBrowser, 'typeof window.show==="function"', openCodes);
    } else {
        openCodes.forEach((c) => fibArmorExec(c));
    }

    mp.gui.cursor.show(true, true);
}

mp.events.add('fibArmorPick', (idx) => {
    const n = parseInt(idx, 10);
    if (Number.isNaN(n) || n < 0 || n > 3) return;
    mp.events.callRemote('fibArmor:choose:s', String(n));
    fibArmorCloseUi();
});

mp.events.add('fibArmorClose', () => {
    fibArmorCloseUi();
});

mp.events.add('render', () => {
    if (!fibArmorMenuOpen) return;
    try {
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
        mp.game.ui.displayHud(false);
        if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
        }
    } catch (_e) {}
});

global.bindGameplayKey(
    0x45,
    true,
    () => {
        if (mp.game.ui.isPauseMenuActive()) return;
        if (mp.players.local.isTypingInTextChat) return;
        if (mp.players.local.vehicle) return;
        if (mp.players.local.getVariable('dead') === true) return;
        if (!mp.players.local.getVariable('auth')) return;
        if (!fibArmorNear) return;

        const fr = String(mp.players.local.getVariable('fraction') || '');
        if (fr !== '6') {
            mp.events.call('notify:client', 2, 'top-mid', 'Доступно только сотрудникам FIB.', 2500);
            return;
        }

        const now = Date.now();
        if (now - fibArmorLastE < 600) return;
        fibArmorLastE = now;

        if (fibArmorMenuOpen) return;
        fibArmorOpenUi();
    }
);

if (typeof global !== 'undefined') {
    global.tryCloseFibArmorEsc = () => {
        if (!fibArmorMenuOpen) return false;
        fibArmorCloseUi();
        return true;
    };
}
