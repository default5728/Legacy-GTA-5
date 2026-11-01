const KABLUK_BAR_POS = new mp.Vector3(127.5905, -1285.5555, 29.2815);
const kablukBarColshape = mp.colshapes.newSphere(KABLUK_BAR_POS.x, KABLUK_BAR_POS.y, KABLUK_BAR_POS.z, 1.5);

const kablukBarBrowser = mp.browsers.new('package://browsers/kabluk_bar/index.html?v=11');
kablukBarBrowser.active = false;
// Поверх HUD (orderId 100), как в ганшопе — HUD не скрываем.
try { kablukBarBrowser.orderId = 110; } catch (_eOrd) {}

let kablukBarInside = false;
let kablukBarMenuOpen = false;
let kablukBarLastPress = 0;

function setKablukBarShopUiOpen(on) {
    kablukBarMenuOpen = !!on;
    if (typeof global !== 'undefined') global.__kablukBarShopOpen = kablukBarMenuOpen;
    if (on) {
        if (typeof global.enforceChatHiddenForOverlay === 'function') global.enforceChatHiddenForOverlay();
        try { mp.gui.cursor.show(true, true); } catch (_e) {}
        try { mp.events.callRemote('s:setvarshopc', true); } catch (_e2) {}
    } else {
        try { mp.gui.cursor.show(false, false); } catch (_e3) {}
        try { mp.events.callRemote('s:setvarshopc', false); } catch (_e4) {}
        try { mp.events.call('showChatServer'); } catch (_e5) {}
    }
}

function executeKablukBarShow() {
    if (!kablukBarMenuOpen) return;
    try {
        kablukBarBrowser.execute("if (typeof window.show === 'function') window.show();");
    } catch (_e) {}
}

function openKablukBarMenu() {
    kablukBarBrowser.active = true;
    setKablukBarShopUiOpen(true);
    executeKablukBarShow();
    setTimeout(() => {
        if (kablukBarMenuOpen) executeKablukBarShow();
    }, 200);
}

function closeKablukBarMenu() {
    if (!kablukBarMenuOpen && !kablukBarBrowser.active) return;
    kablukBarMenuOpen = false;
    try {
        kablukBarBrowser.execute("if (typeof window.hide === 'function') window.hide(true);");
    } catch (_e) {}
    kablukBarBrowser.active = false;
    setKablukBarShopUiOpen(false);
}

mp.events.add('playerEnterColshape', (colshape) => {
    if (colshape === kablukBarColshape) kablukBarInside = true;
});

mp.events.add('playerExitColshape', (colshape) => {
    if (colshape === kablukBarColshape) {
        kablukBarInside = false;
        if (kablukBarMenuOpen) closeKablukBarMenu();
    }
});

global.bindGameplayKey(0x45, true, () => {
    if (mp.game.ui.isPauseMenuActive() || mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('dead') === true || mp.players.local.vehicle) return;

    const now = Date.now();
    if (now - kablukBarLastPress < 650) return;
    kablukBarLastPress = now;

    if (kablukBarMenuOpen) {
        closeKablukBarMenu();
        return;
    }
    if (kablukBarInside) openKablukBarMenu();
});

mp.events.add('kablukBar:close', closeKablukBarMenu);
mp.events.add('kablukBar:ready', () => {
    if (kablukBarMenuOpen) executeKablukBarShow();
});

mp.events.add('render', () => {
    if (!kablukBarMenuOpen) return;
    try {
        if (!mp.gui.cursor.visible) mp.gui.cursor.show(true, true);
    } catch (_e) {}
});

if (typeof global !== 'undefined') {
    global.tryCloseKablukBarEsc = () => {
        if (!kablukBarMenuOpen) return false;
        closeKablukBarMenu();
        return true;
    };
}
