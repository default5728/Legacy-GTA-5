/**
 * family_tablet_client.js
 * Клиентская сторона планшета семьи (CEF browsers/family/index.html).
 */

'use strict';

const FAM_MENU_URL = 'package://browsers/family/index.html?v=29';
const FAM_MENU_ORDER_ID = 200;

let famBrowser = null;
let famBrowserReady = false;
let famPendingQueue = [];
let famTabletOpen = false;
let famCaptMenuOpen = false;

function getFamBrowser() {
    if (famBrowser && mp.browsers.exists(famBrowser)) return famBrowser;
    famBrowserReady = false;
    famPendingQueue = [];
    famBrowser = mp.browsers.new(FAM_MENU_URL);
    try { famBrowser.active = false; } catch (_e) {}
    try { famBrowser.orderId = FAM_MENU_ORDER_ID; } catch (_eOrd) {}
    if (typeof global.registerActiveBrowserOverlay === 'function') {
        global.registerActiveBrowserOverlay(() => famBrowser);
    }
    return famBrowser;
}

function applyFamMenuLayer() {
    try {
        if (famBrowser && mp.browsers.exists(famBrowser)) {
            famBrowser.active = true;
            famBrowser.orderId = FAM_MENU_ORDER_ID;
        }
    } catch (_e) {}
}

function hideChatForFamilyMenu() {
    try {
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    } catch (_e0) {}
    try { mp.events.call('hideChatServer'); } catch (_e1) {}
    try {
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
    } catch (_e2) {}
    try {
        if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
        }
    } catch (_e3) {}
    try {
        if (typeof global.applyCustomChatVisibility === 'function') {
            global.applyCustomChatVisibility(false);
        }
    } catch (_e4) {}
}

function famExec(code) {
    const b = getFamBrowser();
    if (!b || !mp.browsers.exists(b)) return;
    if (typeof global.browserExecWhen === 'function') {
        global.browserExecWhen(b, 'window.FamApp', code);
    } else if (typeof global.browserExec === 'function') {
        global.browserExec(b, code);
    } else {
        try { b.execute(code); } catch (_e) {}
    }
}

function setFamCursor(visible) {
    const want = !!visible;
    try { mp.gui.cursor.show(want, want); } catch (_e) {}
    try { mp.gui.cursor.visible = want; } catch (_e2) {}
    try { mp.gui.chat.activate(!want); } catch (_e3) {}
}

function openFamTablet(payloadJson) {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (mp.players.local.getVariable('inCapt') === true) return;
    if (mp.players.local.getVariable('jail')) return;

    let payloadObj;
    try {
        payloadObj = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
    } catch (_e) {
        mp.events.call('notify:client', 2, 'top-mid', 'Ошибка данных меню семьи.', 3500);
        return;
    }
    if (!payloadObj || typeof payloadObj !== 'object') {
        mp.events.call('notify:client', 2, 'top-mid', 'Меню семьи недоступно.', 3500);
        return;
    }

    famTabletOpen = true;
    setFamCursor(true);
    try { mp.events.callRemote('family:v', true); } catch (_e) {}
    hideChatForFamilyMenu();
    try {
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        }
    } catch (_eHud) {}
    hideChatForFamilyMenu();
    setTimeout(hideChatForFamilyMenu, 0);
    setTimeout(hideChatForFamilyMenu, 50);

    getFamBrowser();
    applyFamMenuLayer();
    const cmd = 'try{if(window.FamApp)FamApp.open(' + JSON.stringify(payloadObj) + ');}catch(_e){}';
    famExec(cmd);
}

function closeFamTablet() {
    if (!famTabletOpen) return;
    famTabletOpen = false;
    famCaptMenuOpen = false;
    try { global.__cefTextInputOpen = false; } catch (_eInp) {}
    famExec('try{if(window.FamApp&&FamApp.closeBizwar)FamApp.closeBizwar(true);}catch(_e){}');
    famExec('try{FamApp&&FamApp._closeConfirmModal&&FamApp._closeConfirmModal();}catch(_e){}');
    famExec('try{FamApp&&FamApp._closeRankPickModal&&FamApp._closeRankPickModal();}catch(_e){}');
    famExec('try{var m=document.getElementById("playerFamily_mainMenu");if(m)m.classList.remove("blood-open");var b=document.getElementById("familyBackdrop");if(b){b.classList.remove("blood-open");b.classList.remove("open");}var r=document.getElementById("root");if(r)r.classList.remove("open");if(window.playerFamilyMainMenu&&playerFamilyMainMenu.vue)playerFamilyMainMenu.vue.loaded=false;}catch(_e){}');
    setFamCursor(false);
    try { mp.events.callRemote('family:v', false); } catch (_e) {}
    if (famBrowser && mp.browsers.exists(famBrowser)) famBrowser.active = false;
    if (typeof global.setWorldUiUnlocked === 'function') global.setWorldUiUnlocked(true);
    if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal('familyTablet');
    else {
        try { mp.events.callRemote('showHud:SERVER'); } catch (_e) {}
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        }
    }
}

function closeFamCaptOverlay() {
    if (!famCaptMenuOpen) return false;
    famCaptMenuOpen = false;
    famExec('try{var o=document.getElementById("bizwarOverlay");if(o)o.classList.remove("open");}catch(_e){}');
    if (famTabletOpen) setFamCursor(true);
    else setFamCursor(false);
    return true;
}

if (typeof global !== 'undefined') {
    global.isFamilyTabletOpen = function () {
        return !!(famTabletOpen || famCaptMenuOpen);
    };

    global.tryCloseFamilyTabletEsc = function () {
        if (!famTabletOpen && !famCaptMenuOpen) return false;

        if (famCaptMenuOpen) {
            closeFamCaptOverlay();
            return true;
        }

        famExec(`try{
            var c=document.getElementById('famConfirmModal');
            if(c&&c.classList.contains('open')&&window.FamApp&&FamApp._closeConfirmModal){
                FamApp._closeConfirmModal();
            } else {
                var m=document.getElementById('rankPickModal');
                if(m&&m.classList.contains('open')&&window.FamApp&&FamApp._closeRankPickModal){
                    FamApp._closeRankPickModal();
                } else if(window.FamApp&&FamApp.close){
                    FamApp.close();
                }
            }
        }catch(_e){}`);
        return true;
    };
}

// ─── Сервер → клиент ──────────────────────────────────────────────────────────

mp.events.add('family:tablet:open:c', (payloadJson) => {
    openFamTablet(payloadJson);
});

mp.events.add('family:members:list:c', (json) => {
    famExec('FamApp && FamApp.setMembers(' + JSON.stringify(json) + ')');
});

mp.events.add('family:points:data:c', (json) => {
    famExec('FamApp && FamApp.setPoints(' + JSON.stringify(json) + ')');
});

mp.events.add('family:point:patch:c', (payload) => {
    try {
        const d = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!d || d.id == null) return;
        const owner = d.owner == null ? '' : String(d.owner);
        famExec(`FamApp && FamApp.patchPoint(${Number(d.id)}, ${JSON.stringify(owner)}, ${!!d.underAttack})`);
    } catch (_e) {}
});

mp.events.add('family:point:flash:c', (pointId, active) => {
    const id = parseInt(pointId, 10);
    if (!Number.isFinite(id)) return;
    famExec(`FamApp && FamApp.setZoneBattleFlash(${id}, ${!!active})`);
});

mp.events.add('family:capt:menu:open:c', (payloadJson) => {
    if (
        typeof global.openWarMapAttack === 'function' &&
        typeof global.isWarMapOpen === 'function' &&
        global.isWarMapOpen()
    ) {
        global.openWarMapAttack(payloadJson);
        return;
    }
    famCaptMenuOpen = true;
    setFamCursor(true);
    const parsedCmd = `JSON.parse(${JSON.stringify(payloadJson)})`;
    famExec(`try{if(window.FamApp&&FamApp.openBizwar)FamApp.openBizwar(${parsedCmd});}catch(_e){}`);
});

mp.events.add('family:logs:data:c', (json) => {
    famExec('FamApp && FamApp.setLogs(' + JSON.stringify(json) + ')');
});

mp.events.add('family:rating:data:c', (json) => {
    famExec('FamApp && FamApp.setRating(' + JSON.stringify(json) + ')');
});

mp.events.add('family:warehouse:toggle:c', (open) => {
    famExec(`FamApp && FamApp.setWarehouseOpen(${open ? 1 : 0})`);
});

mp.events.add('familyMansion:door:toggle:c', (open) => {
    famExec(`FamApp && FamApp.setMansionDoorOpen(${open ? 1 : 0})`);
});

mp.events.add('family:fleet:sync:c', (plate, idx, leaderRaw, vehiclesJson) => {
    try {
        const jPlate = JSON.stringify(String(plate == null ? '' : plate));
        const n = Number(idx);
        const can = Number(leaderRaw) === 1;
        const vEsc = JSON.stringify(vehiclesJson != null ? String(vehiclesJson) : '[]');
        famExec(`FamApp && FamApp.setFleet(${jPlate}, ${Number.isFinite(n) ? n : 0}, ${can ? 'true' : 'false'}, ${vEsc})`);
    } catch (_e) {}
});

mp.events.add('family:cef:kick', () => {
    if (!famTabletOpen) return;
    famExec('FamApp && FamApp.refreshMembers()');
});

mp.events.add('family:addplayer:c', () => {
    if (!famTabletOpen) return;
    famExec('FamApp && FamApp.refreshMembers()');
});

mp.events.add('family:cef:changerank', () => {
    if (!famTabletOpen) return;
    famExec('FamApp && FamApp.refreshMembers()');
});

mp.events.add('family:close', () => closeFamTablet());
mp.events.add('family:cef:clear', () => closeFamTablet());
mp.events.add('family:tablet:close', () => closeFamTablet());

global.famPushCaptCombatStats = function (jsonStr, myStatic) {
    const sid = Number(myStatic) || 0;
    if (!jsonStr || !String(jsonStr).trim()) {
        famExec(`FamApp && FamApp.setCaptCombatStats(null, ${sid})`);
        return;
    }
    famExec(`FamApp && FamApp.setCaptCombatStats(JSON.parse(${JSON.stringify(String(jsonStr))}), ${sid})`);
};

// ─── CEF → сервер ─────────────────────────────────────────────────────────────

mp.events.add('fam:close', () => closeFamTablet());
mp.events.add('fam:members:refresh', () => mp.events.callRemote('family:members:refresh:s'));
mp.events.add('fam:rank:set', (tid, r, reason, extrasJson) =>
    mp.events.callRemote(
        'family:rank:set:s',
        String(tid),
        String(r),
        String(reason || ''),
        extrasJson != null ? String(extrasJson) : '[]'
    ));
mp.events.add('fam:rankconfig:save', (json) => mp.events.callRemote('family:rankconfig:save:s', json));
mp.events.add('fam:warehouse:toggle', (open) => mp.events.callRemote('family:warehouse:toggle:s', open ? 1 : 0));
mp.events.add('fam:mansion:door:toggle', (open) => mp.events.callRemote('familyMansion:door:toggle:s', open ? 1 : 0));
mp.events.add('fam:advert:broadcast', (variant) => mp.events.callRemote('family:advert:broadcast:s', String(variant)));
mp.events.add('fam:kick', (tid) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:kick:s', String(tid));
});
mp.events.add('fam:points:request', () => mp.events.callRemote('family:points:request:s'));
mp.events.add('fam:zones:request', () => mp.events.callRemote('family:points:request:s'));
mp.events.add('fam:rating:request', () => mp.events.callRemote('family:rating:request:s'));
mp.events.add('fam:logs:request', (search) => mp.events.callRemote('family:logs:request:s', String(search || '')));
mp.events.add('fam:invite', (staticId) => {
    const sid = String(staticId || '').trim().replace(/[^\d]/g, '');
    if (!sid || parseInt(sid, 10) < 1) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Введите статик.', 3000);
    }
    mp.events.callRemote('family:invite:s', sid);
});
mp.events.add('fam:leave', () => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:leave:s');
});
mp.events.add('fam:balance:deposit', (amount) => mp.events.callRemote('family:balance:deposit:s', String(amount || '')));
mp.events.add('fam:balance:withdraw', (amount) => mp.events.callRemote('family:balance:withdraw:s', String(amount || '')));
mp.events.add('fam:rename', (name) => mp.events.callRemote('family:rename:s', String(name || '')));
mp.events.add('fam:expand', () => mp.events.callRemote('family:expand:s'));
mp.events.add('fam:disband', () => {
    if (new Date().getTime() - mp.players.local.clicked < 2000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:disband:s');
});
mp.events.add('fam:delete', () => {
    if (new Date().getTime() - mp.players.local.clicked < 2000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:disband:s');
});
mp.events.add('family:cef:setbalance', (bal) => {
    famExec(`try{if(window.FamApp)FamApp.setBalance(${parseInt(bal, 10) || 0});}catch(_e){}`);
});
mp.events.add('fam:fleet:pull', () => mp.events.callRemote('family:fleet:pull:s'));
mp.events.add('fam:fleet:save', (plate, idx) =>
    mp.events.callRemote('family:fleet:save:s', plate == null ? '' : String(plate), idx == null ? '0' : String(idx)));
mp.events.add('fam:fleet:saveSlot', (slot, colorIdx, ranksJson) => {
    if (new Date().getTime() - mp.players.local.clicked < 800) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote(
        'family:fleet:saveSlot:s',
        String(slot == null ? '0' : slot),
        String(colorIdx == null ? '0' : colorIdx),
        ranksJson == null ? '[]' : String(ranksJson)
    );
});
mp.events.add('fam:fleet:evac', (slot) => {
    if (new Date().getTime() - mp.players.local.clicked < 800) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:fleet:evac:s', String(slot == null ? '0' : slot));
});
mp.events.add('fam:fleet:summon', (slot) => {
    if (new Date().getTime() - mp.players.local.clicked < 800) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:fleet:summon:s', String(slot == null ? '0' : slot));
});

mp.events.add('family:capt:zone:click', (zoneId) =>
    mp.events.callRemote('family:capt:zone:click:s', String(zoneId)));
mp.events.add('family:capt:attack:confirm', (zid, count, weaponsJson, armor, spunk, alco) =>
    mp.events.callRemote(
        'family:capt:attack:confirm:s',
        String(zid),
        String(count),
        String(weaponsJson),
        String(armor),
        String(spunk),
        String(alco)
    ));
mp.events.add('family:capt:teleport', (zid) => mp.events.callRemote('family:teleport:s', String(zid)));

mp.events.add('fam:browser:ready', () => {
    famBrowserReady = true;
    famPendingQueue.forEach((code) => {
        try {
            if (famBrowser && mp.browsers.exists(famBrowser)) famBrowser.execute(code);
        } catch (_) {}
    });
    famPendingQueue = [];
});

mp.events.add('playerDeath', () => {
    if (!famTabletOpen && !famCaptMenuOpen) return;
    try {
        famExec('try{var o=document.getElementById("bizwarOverlay");if(o)o.classList.remove("open");document.getElementById("root")&&document.getElementById("root").classList.remove("open");}catch(_e){}');
    } catch (_) {}
    closeFamTablet();
});

mp.events.add('playerSpawn', () => {
    if (!famTabletOpen && !famCaptMenuOpen) return;
    try {
        famExec('try{var o=document.getElementById("bizwarOverlay");if(o)o.classList.remove("open");document.getElementById("root")&&document.getElementById("root").classList.remove("open");}catch(_e){}');
    } catch (_) {}
    closeFamTablet();
});

mp.events.add('guiReady', () => {
    setTimeout(() => {
        try {
            const b = getFamBrowser();
            if (b) b.active = false;
        } catch (_e) {}
    }, 2200);
});
