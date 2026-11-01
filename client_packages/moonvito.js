'use strict';

const moonvitoBrowser = mp.browsers.new('package://browsers/moonvito/index.html');
moonvitoBrowser.active = false;
try { moonvitoBrowser.orderId = 120; } catch (_eOrd) {}

let moonvitoOpen = false;
if (typeof global !== 'undefined') global.__moonvitoOpen = false;

function setMoonvitoUiOpen(on) {
    moonvitoOpen = !!on;
    if (typeof global !== 'undefined') global.__moonvitoOpen = moonvitoOpen;
    try { mp.events.callRemote('moonvito:setOpen:s', !!on); } catch (_eFlag) {}
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

function moonvitoExec(code) {
    try {
        if (mp.browsers.exists(moonvitoBrowser)) moonvitoBrowser.execute(code);
    } catch (_e) {}
}

function openMoonvito() {
    if (moonvitoOpen) return;
    moonvitoBrowser.active = true;
    setMoonvitoUiOpen(true);
    moonvitoExec('if (typeof window.show === "function") window.show();');
    setTimeout(() => {
        if (moonvitoOpen) moonvitoExec('if (typeof window.show === "function") window.show();');
    }, 180);
}

function closeMoonvito() {
    if (!moonvitoOpen) return;
    moonvitoExec('if (typeof window.hide === "function") window.hide();');
    moonvitoBrowser.active = false;
    setMoonvitoUiOpen(false);
}

global.openMoonvito = openMoonvito;
global.closeMoonvito = closeMoonvito;
global.isMoonvitoOpen = function () { return moonvitoOpen; };
global.getMoonvitoBrowser = function () { return moonvitoOpen ? moonvitoBrowser : null; };

if (typeof global.registerActiveBrowserOverlay === 'function') {
    global.registerActiveBrowserOverlay(() => (moonvitoOpen ? moonvitoBrowser : null));
}

function moonvitoClickGuard() {
    const now = Date.now();
    const last = Number(mp.players.local.clicked) || 0;
    if (now - last < 1000) {
        mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
        return false;
    }
    mp.players.local.clicked = now;
    return true;
}

function sendMoonvitoSell(invIndex, price, name) {
    if (!moonvitoClickGuard()) return;
    const idx = parseInt(invIndex, 10);
    const pr = String(price == null ? '' : price).replace(/\D/g, '');
    const nm = String(name == null ? '' : name);
    if (!Number.isInteger(idx) || idx < 0) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не выбран предмет.', 2500);
    }
    if (!pr) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Укажите цену.', 2500);
    }
    mp.events.callRemote('salePhone:SERVER', 0, pr, idx, nm);
}

function sendMoonvitoBuy(indexbd, name) {
    if (!moonvitoClickGuard()) return;
    mp.events.callRemote('buyPhone:SERVER', Number(indexbd) || 0, String(name || ''));
}

function sendMoonvitoCancel(indexbd, name) {
    if (!moonvitoClickGuard()) return;
    mp.events.callRemote('cancelPhone:SERVER', Number(indexbd) || 0, String(name || ''));
}

mp.events.add('moonvito:open:CLIENT', () => {
    openMoonvito();
});

mp.events.add('moonvito:close', () => {
    closeMoonvito();
});

mp.events.add('moonvito:request', () => {
    mp.events.callRemote('phone:moonvito:open:s');
});

mp.events.add('moonvito:buy', (indexbd, name) => sendMoonvitoBuy(indexbd, name));
mp.events.add('moonvito:sell', (invIndex, price, name) => sendMoonvitoSell(invIndex, price, name));
mp.events.add('moonvito:cancel', (indexbd, name) => sendMoonvitoCancel(indexbd, name));

// legacy triggers from phone CEF
mp.events.add('phone:moonvito:buy:CLIENT', (indexbd, name) => sendMoonvitoBuy(indexbd, name));
mp.events.add('phone:moonvito:sell:CLIENT', (invIndex, price, name) => sendMoonvitoSell(invIndex, price, name));
mp.events.add('phone:moonvito:cancel:CLIENT', (indexbd, name) => sendMoonvitoCancel(indexbd, name));

mp.events.add('phone:moonvito:state:c', (jsonRaw) => {
    try {
        if (!mp.browsers.exists(moonvitoBrowser)) return;
        const esc = JSON.stringify(String(jsonRaw || '{}'));
        moonvitoExec(`if (typeof window.setMoonvitoState === "function") window.setMoonvitoState(JSON.parse(${esc}));`);
        if (typeof phoner !== 'undefined' && mp.browsers.exists(phoner)) {
            try {
                phoner.execute(`if (typeof phoneMain !== "undefined" && phoneMain.setMoonvitoState) phoneMain.setMoonvitoState(JSON.parse(${esc}));`);
            } catch (_e2) {}
        }
    } catch (_e) {}
});

global.bindGameplayKey(0x1B, false, () => {
    if (!moonvitoOpen) return;
    closeMoonvito();
});
