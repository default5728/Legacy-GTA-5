'use strict';

/** Статистика каптов / войны семей: выстрелы, оверлей после боя, планшет. */

let captResultBrowser = null;
let captResultOpen = false;

function getCaptResultBrowser() {
    if (captResultBrowser && mp.browsers.exists(captResultBrowser)) return captResultBrowser;
    captResultBrowser = mp.browsers.new('package://browsers/capt_result/index.html');
    if (captResultBrowser) captResultBrowser.active = false;
    if (typeof global.registerActiveBrowserOverlay === 'function') {
        global.registerActiveBrowserOverlay(() => captResultBrowser);
    }
    return captResultBrowser;
}

function isCaptCombatDamageActive() {
    const pl = mp.players.local;
    if (!pl) return false;
    return pl.getVariable('captRegDamage') === true || pl.getVariable('bizwarRegDamage') === true;
}

function pushCaptStatsToTablets(jsonStr) {
    const sid = Number(mp.players.local.getVariable('static')) || 0;
    try {
        if (typeof global.famPushCaptCombatStats === 'function') {
            global.famPushCaptCombatStats(jsonStr, sid);
        }
    } catch (_e) {}
    try {
        if (typeof global.fracPushCaptCombatStats === 'function') {
            global.fracPushCaptCombatStats(jsonStr, sid);
        }
    } catch (_e) {}
}

function showCaptResult(jsonStr) {
    if (!jsonStr || !String(jsonStr).trim()) return;
    const b = getCaptResultBrowser();
    if (!mp.browsers.exists(b)) return;

    captResultOpen = true;
    b.active = true;
    try { mp.gui.cursor.visible = true; } catch (_e) {}
    try { mp.gui.chat.activate(false); } catch (_e2) {}
    if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();

    const sid = Number(mp.players.local.getVariable('static')) || 0;
    const cmd = `try{if(window.CaptResultApp)CaptResultApp.show(JSON.parse(${JSON.stringify(String(jsonStr))}),${sid});}catch(_e){}`;
    try { b.execute(cmd); } catch (_e3) {}
}

function hideCaptResult() {
    if (!captResultOpen) return false;
    captResultOpen = false;
    try { mp.gui.cursor.visible = false; } catch (_e) {}
    const b = captResultBrowser;
    if (b && mp.browsers.exists(b)) {
        try { b.execute('try{if(window.CaptResultApp)CaptResultApp.hide();}catch(_e){}'); } catch (_e2) {}
        b.active = false;
    }
    if (typeof global.setWorldUiUnlocked === 'function') global.setWorldUiUnlocked(true);
    if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
    else {
        try { mp.events.callRemote('showHud:SERVER'); } catch (_e3) {}
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        }
    }
    return true;
}

global.tryCloseCaptResultEsc = hideCaptResult;

mp.events.add('playerWeaponShot', () => {
    if (!isCaptCombatDamageActive()) return;
    mp.events.callRemote('capt:combat:shot:s');
});

mp.events.add('capt:combat:result:c', (jsonStr) => {
    showCaptResult(jsonStr);
    pushCaptStatsToTablets(jsonStr);
});

mp.events.add('capt:combat:stats:load:c', (jsonStr) => {
    pushCaptStatsToTablets(jsonStr);
});

mp.events.add('capt:stats:request', () => {
    mp.events.callRemote('capt:combat:stats:request:s');
});

mp.events.add('capt:result:close', () => {
    hideCaptResult();
});

mp.events.add('playerDeath', () => {
    if (captResultOpen) hideCaptResult();
});

mp.events.add('playerSpawn', () => {
    if (captResultOpen) hideCaptResult();
});
