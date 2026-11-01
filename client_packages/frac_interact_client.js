'use strict';

/**
 * Меню взаимодействия фракции (клавиша M) — курсорное:
 * «Забить капт» / «Меню фракции».
 */

let fracInteractBrowser = null;
let fracInteractReady = false;
let fracInteractOpen = false;
let fracInteractPending = null;
let localFractionId = 0;

function getLocalFractionId() {
    const raw = mp.players.local.getVariable('fraction');
    if (raw != null) return parseInt(raw, 10) || 0;
    return localFractionId;
}

function getFracInteractBrowser() {
    if (fracInteractBrowser && mp.browsers.exists(fracInteractBrowser)) return fracInteractBrowser;
    fracInteractReady = false;
    fracInteractPending = null;
    fracInteractBrowser = mp.browsers.new('package://browsers/frac_interact/index.html?v=5');
    fracInteractBrowser.active = true;
    try { fracInteractBrowser.orderId = 210; } catch (_e) {}
    return fracInteractBrowser;
}

function fracInteractExec(code) {
    const b = getFracInteractBrowser();
    if (!mp.browsers.exists(b)) return;
    try { b.execute(code); } catch (_e) {}
}

function getCursorScreenPos() {
    try {
        const pos = mp.gui.cursor.position;
        if (Array.isArray(pos) && pos.length >= 2) {
            return { x: Number(pos[0]) || 0, y: Number(pos[1]) || 0 };
        }
        if (pos && typeof pos === 'object') {
            return { x: Number(pos.x) || 0, y: Number(pos.y) || 0 };
        }
    } catch (_e) {}
    try {
        const res = mp.game.graphics.getScreenActiveResolution(0, 0);
        return { x: (res.x || 1920) * 0.5, y: (res.y || 1080) * 0.5 };
    } catch (_e2) {
        return { x: 200, y: 200 };
    }
}

function canOpenFracInteract() {
    if (!mp.players.local.getVariable('auth')) return false;
    if (mp.players.local.isTypingInTextChat) return false;
    if (mp.game.ui.isPauseMenuActive()) return false;
    if (mp.players.local.getVariable('dead')) return false;
    if (mp.players.local.getVariable('inCapt') === true) return false;
    if (mp.players.local.getVariable('inBizwar') === true) return false;
    if (mp.players.local.getVariable('invkey') === true) return false;
    if (mp.players.local.getVariable('phone') === true) return false;
    if (mp.players.local.getVariable('shopc') === true) return false;
    if (mp.players.local.getVariable('casmenu') === true) return false;
    if (mp.players.local.getVariable('amenu') === true) return false;
    if (mp.players.local.getVariable('blackmenu') === true) return false;
    if (mp.players.local.getVariable('familymenu')) return false;
    if (mp.players.local.getVariable('nof3') === true) return false;
    if (typeof global.isMainMenuBrowserActive === 'function' && global.isMainMenuBrowserActive()) return false;
    if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return false;
    if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return false;
    if (typeof global.isWarMapOpen === 'function' && global.isWarMapOpen()) return false;
    return true;
}

function openFracInteractMenu() {
    if (fracInteractOpen) return true;
    if (!canOpenFracInteract()) return false;
    if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    activateFracInteractBrowser();
    let wasCursor = false;
    try { wasCursor = !!mp.gui.cursor.visible; } catch (_e) {}
    try { mp.gui.cursor.visible = true; } catch (_e2) {}
    let cur;
    if (wasCursor) {
        cur = getCursorScreenPos();
    } else {
        try {
            const res = mp.game.graphics.getScreenActiveResolution(0, 0);
            cur = { x: (Number(res.x) || 1920) * 0.5, y: (Number(res.y) || 1080) * 0.42 };
        } catch (_e3) {
            cur = { x: 480, y: 320 };
        }
    }
    const fractionId = getLocalFractionId();
    const fam = mp.players.local.getVariable('family');
    const hasFamily = fam != null && String(fam).trim() !== '';
    const code = 'try{FracInteract.open(' + Number(cur.x) + ',' + Number(cur.y) + ',' + Number(fractionId) + ',' + (hasFamily ? 'true' : 'false') + ');}catch(_e){}';
    if (!fracInteractReady) {
        fracInteractPending = code;
    } else {
        fracInteractExec(code);
    }
    fracInteractOpen = true;
    return true;
}

function activateFracInteractBrowser() {
    const b = getFracInteractBrowser();
    if (!b || !mp.browsers.exists(b)) return;
    try {
        b.orderId = 210;
        b.active = true;
    } catch (_e) {}
}

function hideCursorIfWarMapDidNotOpen() {
    try {
        if (typeof global.isWarMapOpen === 'function' && global.isWarMapOpen()) return;
    } catch (_e) {}
    try { mp.gui.cursor.show(false, false); } catch (_eShow) {}
    try { mp.gui.cursor.visible = false; } catch (_eVis) {}
}

function deactivateFracInteractBrowser() {
    try {
        if (fracInteractBrowser && mp.browsers.exists(fracInteractBrowser)) {
            fracInteractBrowser.active = false;
        }
    } catch (_e) {}
}

function closeFracInteractMenu(keepCursor) {
    if (!fracInteractOpen) return false;
    fracInteractOpen = false;
    fracInteractPending = null;
    fracInteractExec('try{FracInteract.close();}catch(_e){}');
    deactivateFracInteractBrowser();
    try {
        const keep = !!keepCursor ||
            (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) ||
            (typeof global.isFactionTabletOpen === 'function' && global.isFactionTabletOpen());
        if (!keep) {
            try { mp.gui.cursor.show(false, false); } catch (_eShow) {}
            try { mp.gui.cursor.visible = false; } catch (_eVis) {}
        }
    } catch (_e) {
        try { mp.gui.cursor.visible = false; } catch (_e2) {}
    }
    return true;
}

mp.events.add('fracInteract:ready', () => {
    fracInteractReady = true;
    if (fracInteractPending && fracInteractOpen) {
        fracInteractExec(fracInteractPending);
        fracInteractPending = null;
    }
});

mp.events.add('setfraction', (fractionId) => {
    localFractionId = parseInt(fractionId, 10) || 0;
});

mp.events.add('fracInteract:close', () => {
    closeFracInteractMenu();
});

mp.events.add('fracInteract:action', (actionRaw) => {
    const action = String(actionRaw || '');
    fracInteractOpen = false;
    fracInteractPending = null;
    fracInteractExec('try{FracInteract.close();}catch(_e){}');

    if (action === 'faction') {
        deactivateFracInteractBrowser();
        try { mp.gui.cursor.visible = true; } catch (_e) {}
        try { mp.events.callRemote('fraction:tablet:open:s'); } catch (_e2) {}
        return;
    }

    if (action === 'character') {
        try { global.openPlayerMenu(); } catch (_e) {}
        return;
    }

    if (action === 'family') {
        deactivateFracInteractBrowser();
        try { mp.events.call('family:openMainMenu', true); } catch (_eFam) {}
        return;
    }

    if (action === 'familyWar') {
        deactivateFracInteractBrowser();
        try { mp.events.call('warMap:openFamily'); } catch (_eWar) {}
        hideCursorIfWarMapDidNotOpen();
        return;
    }

    if (action === 'attack' || action === 'factionWar') {
        deactivateFracInteractBrowser();
        try { mp.events.call('warMap:openFaction'); } catch (_eCapt) {}
        hideCursorIfWarMapDidNotOpen();
        return;
    }

    try { mp.gui.cursor.show(false, false); } catch (_e3) {}
    try { mp.gui.cursor.visible = false; } catch (_e4) {}
});

global.bindGameplayKey(0x4d, true, () => {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (fracInteractOpen) {
        closeFracInteractMenu();
        return;
    }
    openFracInteractMenu();
});

if (typeof global !== 'undefined') {
    global.isFracInteractOpen = function () {
        return fracInteractOpen === true;
    };
    global.tryCloseFracInteractEsc = function () {
        return closeFracInteractMenu();
    };
    global.closeFracInteractMenu = closeFracInteractMenu;
    global.__fracInteractBrowser = () => (fracInteractOpen ? fracInteractBrowser : null);
}
