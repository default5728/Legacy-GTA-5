'use strict';

const PORT_CEF_URL = 'package://cef/Port/index.html?v=5';
const MINIGAME_KEYS = [69];
const CRATE_MODEL = 'prop_cs_cardbox_01';
const CRATE_BONE = 18905;
const CRATE_OFFSET = new mp.Vector3(0.12, 0.08, 0.26);
const CRATE_ROT = new mp.Vector3(-10, -75, -40);

let portBrowser = null;
let portNearNpc = false;
let portWorking = false;
let portPayment = 0;
let portCratePay = 2500;
let portMinigame = false;
let portDialogOpen = false;
let portLastE = 0;
let portWorkBlip = null;
let portKeyBinds = [];

try {
    if (mp.attachmentMngr && typeof mp.attachmentMngr.register === 'function') {
        mp.attachmentMngr.register('portCrate', CRATE_MODEL, CRATE_BONE, CRATE_OFFSET, CRATE_ROT);
    }
    try {
        mp.game.streaming.requestModel(mp.game.joaat(CRATE_MODEL));
    } catch (_eMod) {}
} catch (_eReg) {}

try {
    portBrowser = mp.browsers.new(PORT_CEF_URL);
    if (portBrowser) portBrowser.active = false;
} catch (_eBr) {
    portBrowser = null;
}

global.getPortJobBrowser = function () {
    if (portDialogOpen && typeof global.getSharedPedDialogBrowser === 'function') {
        return global.getSharedPedDialogBrowser();
    }
    if (!portMinigame) return null;
    return portBrowser && mp.browsers.exists(portBrowser) ? portBrowser : null;
};

function closePortDialog() {
    if (!portDialogOpen) return;
    portDialogOpen = false;
    try {
        if (typeof global.hideSharedPedDialog === 'function') global.hideSharedPedDialog();
    } catch (_eHide) {}
    try {
        if (typeof global.closeNpcDialogModal === 'function') global.closeNpcDialogModal({ unfreeze: true });
        else {
            mp.gui.cursor.show(false, false);
            mp.players.local.freezePosition(false);
        }
    } catch (_eClose) {}
}

function openPortDialog() {
    if (portDialogOpen || portMinigame) return;
    portDialogOpen = true;
    try {
        if (typeof global.openNpcDialogModal === 'function') global.openNpcDialogModal({ freeze: true });
        else {
            mp.gui.cursor.show(true, true);
            mp.players.local.freezePosition(true);
        }
    } catch (_eOpen) {}

    const working = portWorking === true;
    const earned = parseInt(portPayment, 10) || 0;
    const cratePay = parseInt(portCratePay, 10) || 2500;
    const cfg = {
        header: 'Прораб',
        text: working
            ? (earned > 0
                ? `За эту смену ты заработал ${earned}$. Закончить работу можно здесь, но сначала отнеси ящик, если он в руках.`
                : 'Пока ничего не заработал. Бери ящики, сдавай на второй точке. Закончить работу можно здесь, но сначала отнеси ящик, если он в руках.')
            : `Нужна работа? Бери ящики на метке, тащи на точку сдачи. За каждый ящик - ${cratePay}$. Деньги получишь, когда закончишь смену.`,
        buttons: working
            ? [
                { id: 'stop', label: 'Закончить работу' },
                { id: 'leave', label: 'Уйти' }
            ]
            : [
                { id: 'start', label: 'Начать работу' },
                { id: 'leave', label: 'Уйти' }
            ]
    };
    try {
        if (typeof global.showSharedPedDialog === 'function') global.showSharedPedDialog(cfg);
    } catch (_eShow) {
        closePortDialog();
    }
}

function portExec(code) {
    if (!portBrowser || !mp.browsers.exists(portBrowser)) return;
    if (typeof global.browserExecWhen === 'function') {
        global.browserExecWhen(portBrowser, 'typeof window.portInit==="function"', code);
    } else if (typeof global.browserExec === 'function') {
        global.browserExec(portBrowser, code);
    } else {
        try { portBrowser.execute(code); } catch (_e) {}
    }
}

function ensureAnimDict(dict) {
    try {
        if (!mp.game.streaming.hasAnimDictLoaded(dict)) mp.game.streaming.requestAnimDict(dict);
    } catch (_e) {}
}

ensureAnimDict('anim@heists@box_carry@');
ensureAnimDict('anim@mp_snowball');

function setBrowserActive(on) {
    if (!portBrowser || !mp.browsers.exists(portBrowser)) return;
    portBrowser.active = !!on;
}

function unbindMinigameKeys() {
    portKeyBinds.forEach((vk) => {
        try { global.unbindGameplayKey(vk, true, onMinigameKey); } catch (_e) {}
    });
    portKeyBinds = [];
}

function bindMinigameKeys() {
    unbindMinigameKeys();
    MINIGAME_KEYS.forEach((vk) => {
        try {
            global.bindGameplayKey(vk, true, onMinigameKey);
            portKeyBinds.push(vk);
        } catch (_e) {}
    });
}

function onMinigameKey() {
    if (!portMinigame) return;
    try {
        if (mp.players.local.isTypingInTextChat) return;
    } catch (_e) {}
    let vk = 0;
    try {
        for (let i = 0; i < MINIGAME_KEYS.length; i++) {
            if (global.isGameplayKeyDown(MINIGAME_KEYS[i])) {
                vk = MINIGAME_KEYS[i];
                break;
            }
        }
    } catch (_e2) {}
    if (!vk) return;
    portExec(`try{window.portTryKey(${vk});}catch(_e){}`);
}

function closeMinigameLocal() {
    if (!portMinigame) {
        portExec('try{window.portCloseMinigame();}catch(_e){}');
        return;
    }
    portMinigame = false;
    global.__portMinigameOpen = false;
    global.disableKeys = false;
    unbindMinigameKeys();
    portExec('try{window.portCloseMinigame();}catch(_e){}');
    try { mp.players.local.freezePosition(false); } catch (_e) {}
    setBrowserActive(false);
}

function destroyWorkBlip() {
    if (portWorkBlip) {
        try { if (mp.blips.exists(portWorkBlip)) portWorkBlip.destroy(); } catch (_e) {}
        portWorkBlip = null;
    }
}

mp.events.add('port:nearNpc', (flag) => {
    portNearNpc = flag === true || flag === 1;
    if (!portNearNpc) closePortDialog();
});

mp.events.add('port:hud', (open, payment, _crate, cratePay) => {
    portWorking = !!open;
    portPayment = parseInt(payment, 10) || 0;
    portCratePay = parseInt(cratePay, 10) || 2500;
    if (!portWorking) {
        portPayment = 0;
        destroyWorkBlip();
        if (!portMinigame) setBrowserActive(false);
    }
});

mp.events.add('port:freeze', (on) => {
    try { mp.players.local.freezePosition(!!on); } catch (_e) {}
});

mp.events.add('port:startMinigame', () => {
    portMinigame = true;
    global.__portMinigameOpen = true;
    global.disableKeys = true;
    setBrowserActive(true);
    portExec('try{window.portInit(0);}catch(_e){}');
    bindMinigameKeys();
    try { mp.players.local.freezePosition(true); } catch (_e) {}
});

mp.events.add('port:closeMinigame', () => {
    closeMinigameLocal();
});

mp.events.add('port:waypoint', (x, y, z, label) => {
    destroyWorkBlip();
});

mp.events.add('client.portmenu.yes', () => {
    if (!portMinigame) return;
    closeMinigameLocal();
    mp.events.callRemote('port:minigameYes');
});

mp.events.add('client.portmenu.no', () => {
    if (!portMinigame) return;
    closeMinigameLocal();
    mp.events.callRemote('port:minigameNo');
});

global.bindGameplayKey(0x45, true, () => {
    try {
        if (portMinigame) return;
        if (mp.game.ui.isPauseMenuActive()) return;
        if (mp.players.local.isTypingInTextChat) return;
        if (mp.gui.cursor.visible) return;
        if (global.isChatOpen) return;
        if (mp.players.local.vehicle) return;
        if (mp.players.local.getVariable('dead') === true) return;
        if (!mp.players.local.getVariable('auth')) return;
        const now = Date.now();
        if (now - portLastE < 700) return;
        if (portNearNpc) {
            portLastE = now;
            openPortDialog();
        }
    } catch (_e) {}
});

mp.events.add('peddialog:button', (btn) => {
    if (!portDialogOpen) return;
    const id = String(btn || '');
    if (id === 'start') {
        closePortDialog();
        mp.events.callRemote('port:joinWork');
        return;
    }
    if (id === 'stop') {
        closePortDialog();
        mp.events.callRemote('port:leaveWork');
        return;
    }
    closePortDialog();
});

mp.events.add('playerDeath', () => {
    closePortDialog();
    closeMinigameLocal();
    destroyWorkBlip();
    portWorking = false;
    setBrowserActive(false);
});

mp.events.add('render', () => {
    if (portMinigame) {
        try {
            mp.game.controls.disableControlAction(0, 24, true);
            mp.game.controls.disableControlAction(0, 25, true);
            mp.game.controls.disableControlAction(0, 68, true);
            mp.game.controls.disableControlAction(0, 69, true);
            mp.game.controls.disableControlAction(0, 70, true);
            mp.game.controls.disableControlAction(0, 75, true);
            mp.game.controls.disableControlAction(0, 22, true);
            mp.game.controls.disableControlAction(0, 23, true);
        } catch (_e) {}
        return;
    }
    try {
        if (mp.players.local.getVariable('portCarrying') === true) {
            mp.game.controls.disableControlAction(0, 23, true);
            mp.game.controls.disableControlAction(0, 75, true);
        }
    } catch (_e2) {}
});
