'use strict';

let warMapBrowser = null;
let warMapReady = false;
let warMapQueue = [];
let warMapOpen = false;
let warMapMode = '';
let warMapPauseSuppressFrames = 0;
let pendingWarMapAttackPayload = null;
let warMapUiOpened = false;
const WAR_MAP_PAUSE_SUPPRESS_FRAMES = 24;
const WAR_MAP_BROWSER_ORDER = 220;

function activateWarMapBrowser(browser) {
    if (!browser || !mp.browsers.exists(browser)) return;
    try {
        browser.orderId = WAR_MAP_BROWSER_ORDER;
        browser.active = true;
    } catch (_e) {}
}

function deactivateBlockingBrowsersForWarMap() {
    try {
        if (typeof global.closeFracInteractMenu === 'function') {
            global.closeFracInteractMenu(true);
        }
    } catch (_e) {}
    try {
        const fracB = typeof global.__fracInteractBrowser === 'function' ? global.__fracInteractBrowser() : null;
        if (fracB && mp.browsers.exists(fracB)) fracB.active = false;
    } catch (_e2) {}
}

function flushPendingWarMapAttack() {
    if (!warMapOpen || !pendingWarMapAttackPayload) return;
    const payload = pendingWarMapAttackPayload;
    pendingWarMapAttackPayload = null;
    warMapExec(`WarMap.openAttack(JSON.parse(${JSON.stringify(String(payload || '{}'))}))`);
}

function queueWarMapAttack(payloadJson, mode) {
    const targetMode = mode === 'faction' ? 'faction' : 'family';
    const payload = String(payloadJson || '{}');
    if (warMapOpen && warMapMode === targetMode) {
        warMapExec(`WarMap.openAttack(JSON.parse(${JSON.stringify(payload)}))`);
        return;
    }
    pendingWarMapAttackPayload = payload;
    openWarMap(targetMode);
}

function pushWarMapUiOpen() {
    // WarMap.open() сбрасывает state.zones/rating. Повторный вызов (см. ensureWarMapUiOpen)
    // стирает уже загруженные с сервера точки. Открываем UI только один раз за открытие.
    if (warMapUiOpened) return;
    warMapUiOpened = true;
    const mode = JSON.stringify(warMapMode);
    warMapExec(`WarMap.open(${mode})`);
    if (warMapMode === 'faction' && Array.isArray(global.fractionZonePositions)) {
        warMapExec(`WarMap.setZonePositions(${JSON.stringify(global.fractionZonePositions)})`);
    }
}

function ensureWarMapUiOpen() {
    if (!warMapOpen) return;
    pushWarMapUiOpen();
    try {
        if (warMapBrowser && mp.browsers.exists(warMapBrowser)) {
            warMapBrowser.execute(
                `try{var r=document.getElementById("root");if(r)r.classList.add("open");}catch(_e){}`
            );
        }
    } catch (_e) {}
}

/** Как в casino_menu: пока открыта карта — не даём ESC открыть паузу GTA. */
function blockWarMapPauseControls() {
    for (let g = 0; g <= 2; g++) {
        mp.game.controls.disableControlAction(g, 156, true);
        mp.game.controls.disableControlAction(g, 199, true);
        mp.game.controls.disableControlAction(g, 200, true);
    }
}

function suppressPauseAfterWarMapClose() {
    warMapPauseSuppressFrames = WAR_MAP_PAUSE_SUPPRESS_FRAMES;
    if (typeof global.suppressPauseMenuAfterEsc === 'function') {
        global.suppressPauseMenuAfterEsc();
    }
}

function getWarMapBrowser() {
    if (warMapBrowser && mp.browsers.exists(warMapBrowser)) return warMapBrowser;
    warMapReady = false;
    warMapQueue = [];
    warMapBrowser = mp.browsers.new('package://browsers/war_map/index.html?v=3');
    try {
        warMapBrowser.active = false;
        warMapBrowser.orderId = WAR_MAP_BROWSER_ORDER;
    } catch (_e) {}
    if (typeof global.registerActiveBrowserOverlay === 'function') {
        global.registerActiveBrowserOverlay(() => warMapBrowser);
    }
    return warMapBrowser;
}

function warMapExec(code) {
    const browser = getWarMapBrowser();
    if (!browser || !mp.browsers.exists(browser)) return;
    if (!warMapReady) {
        warMapQueue.push(code);
        return;
    }
    try { browser.execute(code); } catch (_e) {}
}

function setWarMapCursor(visible) {
    const show = !!visible;
    try { mp.gui.cursor.show(show, show); } catch (_e) {}
    try { mp.gui.cursor.visible = show; } catch (_e2) {}
    try { mp.gui.chat.activate(!show); } catch (_e3) {}
}

function shouldKeepCursorAfterWarMapReject() {
    try {
        if (typeof global.isFactionTabletOpen === 'function' && global.isFactionTabletOpen()) return true;
        if (typeof global.isFamilyTabletOpen === 'function' && global.isFamilyTabletOpen()) return true;
        if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return true;
    } catch (_e) {}
    return false;
}

function rejectWarMapOpen(message) {
    pendingWarMapAttackPayload = null;
    warMapOpen = false;
    warMapUiOpened = false;
    if (!shouldKeepCursorAfterWarMapReject()) setWarMapCursor(false);
    if (message) {
        try { mp.events.call('notify:client', 2, 'top-mid', message, 3000); } catch (_e) {}
    }
    return false;
}

function requestWarMapData() {
    if (warMapMode === 'family') {
        mp.events.call('fam:points:request');
        mp.events.call('fam:rating:request');
    } else if (warMapMode === 'faction') {
        mp.events.call('frac:zones:request');
        mp.events.call('frac:rating:request');
    }
}

function warMapMinimapEnabledInSettings() {
    try {
        if (typeof global.__getMenuSettingBool === 'function') {
            return global.__getMenuSettingBool('map', true);
        }
        const s = mp.storage.data && mp.storage.data.settings;
        return !s || s.map !== false;
    } catch (_e) {
        return true;
    }
}

function hideUiForWarMap() {
    /** Карта войны — оверлей поверх мира: миникарта, район/улица и патроны остаются как в игре. */
    try {
        mp.events.call('help', false);
        mp.events.call('hudKeyHints', false);
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
        if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
        } else {
            mp.events.call('hideChatServer');
        }
    } catch (_e) {}
}

function syncWarMapHudChrome() {
    if (!warMapOpen) return;
    try {
        const mapOn = warMapMinimapEnabledInSettings();
        mp.game.ui.displayHud(true);
        if (mapOn) {
            mp.game.ui.displayRadar(true);
            mp.events.call('minimap', true);
        }
        mp.events.call('hud', true);
        if (typeof global.__hudWorldRefresh === 'function') {
            global.__hudWorldRefresh(false);
        }
    } catch (_e) {}
}

function openWarMap(mode) {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (mp.players.local.getVariable('inCapt') === true) return;

    const targetMode = mode === 'faction' ? 'faction' : 'family';
    const fraction = parseInt(mp.players.local.getVariable('fraction'), 10) || 0;
    const family =
        String(
            mp.players.local.getVariable('family') ||
            mp.players.local.getVariable('familyName') ||
            ''
        ).trim();

    if (targetMode === 'faction' && (fraction < 1 || fraction > 5)) {
        return rejectWarMapOpen('Вы не состоите в боевой фракции.');
    }
    if (targetMode === 'family' && !family) {
        return rejectWarMapOpen('Вы не состоите в семье.');
    }

    try { mp.events.call('closemenu'); } catch (_e) {}
    deactivateBlockingBrowsersForWarMap();
    warMapMode = targetMode;
    warMapOpen = true;
    warMapUiOpened = false;

    const browser = getWarMapBrowser();
    activateWarMapBrowser(browser);
    setWarMapCursor(true);
    hideUiForWarMap();
    syncWarMapHudChrome();

    pushWarMapUiOpen();
    [80, 200, 450, 900].forEach((ms) => setTimeout(() => ensureWarMapUiOpen(), ms));
    setTimeout(() => {
        requestWarMapData();
        flushPendingWarMapAttack();
    }, 80);
    [150, 350, 700].forEach((ms) => setTimeout(() => flushPendingWarMapAttack(), ms));
}

function closeWarMap() {
    if (!warMapOpen) return;
    warMapOpen = false;
    warMapMode = '';
    warMapUiOpened = false;
    pendingWarMapAttackPayload = null;
    try {
        if (warMapBrowser && mp.browsers.exists(warMapBrowser)) {
            warMapBrowser.execute('try{WarMap.closeAttack();document.getElementById("root").classList.remove("open");}catch(_e){}');
            warMapBrowser.active = false;
        }
    } catch (_e) {}
    setWarMapCursor(false);
    suppressPauseAfterWarMapClose();
    if (typeof global.setWorldUiUnlocked === 'function') global.setWorldUiUnlocked(true);
    if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal('warMap');
    else {
        try { mp.events.callRemote('showHud:SERVER'); } catch (_e2) {}
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        }
    }
}

global.isWarMapOpen = () => warMapOpen;
global.queueWarMapAttack = queueWarMapAttack;
global.openWarMapAttack = (payloadJson) => {
    if (!warMapOpen) return false;
    warMapExec(`WarMap.openAttack(JSON.parse(${JSON.stringify(String(payloadJson || '{}'))}))`);
    return true;
};
global.tryCloseWarMapEsc = () => {
    if (!warMapOpen) return false;
    warMapExec(`try{
        var layer=document.getElementById('attackLayer');
        if(layer&&layer.classList.contains('open')){WarMap.closeAttack();}
        else if(typeof WarMap!=='undefined'&&WarMap.close){WarMap.close();}
        else if(typeof mp!=='undefined'&&mp.trigger){mp.trigger('warMap:close');}
    }catch(_e){try{if(typeof mp!=='undefined'&&mp.trigger)mp.trigger('warMap:close');}catch(_e2){}}`);
    suppressPauseAfterWarMapClose();
    return true;
};

mp.events.add('render', () => {
    if (warMapOpen) {
        blockWarMapPauseControls();
        syncWarMapHudChrome();
    } else if (warMapPauseSuppressFrames > 0) {
        warMapPauseSuppressFrames--;
        blockWarMapPauseControls();
    }
});

mp.events.add('warMap:ready', () => {
    warMapReady = true;
    const queue = warMapQueue.slice();
    warMapQueue = [];
    queue.forEach((code) => {
        try { if (warMapBrowser && mp.browsers.exists(warMapBrowser)) warMapBrowser.execute(code); } catch (_e) {}
    });
    if (warMapOpen) ensureWarMapUiOpen();
    flushPendingWarMapAttack();
});

mp.events.add('warMap:openFamily', () => openWarMap('family'));
mp.events.add('warMap:openFaction', () => openWarMap('faction'));
mp.events.add('warMap:close', closeWarMap);

mp.events.add('warMap:attackConfirm', (mode, zoneId, count, calibers, armor, spank, alcohol) => {
    if (!warMapOpen || mode !== warMapMode) return;
    const zid = parseInt(zoneId, 10);
    const cnt = parseInt(count, 10);
    if (!Number.isFinite(zid) || !Number.isFinite(cnt)) return;
    const cals = String(calibers == null ? '[]' : calibers);
    const arm = armor === true || armor === 'true' || armor === 1 || armor === '1';
    const sp = spank === true || spank === 'true' || spank === 1 || spank === '1';
    const al = alcohol === true || alcohol === 'true' || alcohol === 1 || alcohol === '1';
    if (mode === 'family') {
        mp.events.callRemote('family:capt:attack:confirm:s', zid, cnt, cals, arm, sp, al);
    } else {
        mp.events.callRemote('bizwar:attack:confirm:s', zid, cnt, cals, arm, sp, al);
    }
});

mp.events.add('warMap:teleport', (mode, zoneId) => {
    if (!warMapOpen || mode !== warMapMode) return;
    const zid = parseInt(zoneId, 10);
    if (!Number.isFinite(zid)) return;
    if (mode === 'family') mp.events.callRemote('family:teleport:s', zid);
    else mp.events.callRemote('bizwar:teleport:s', zid);
});

mp.events.add('warMap:zoneClick', (mode, zoneId) => {
    if (!warMapOpen || mode !== warMapMode) return;
    const zid = parseInt(zoneId, 10);
    if (!Number.isFinite(zid)) return;
    if (mode === 'family') mp.events.callRemote('family:capt:zone:click:s', zid);
    else mp.events.callRemote('bizwar:zone:click:s', zid);
});

mp.events.add('family:points:data:c', (json) => {
    if (warMapOpen && warMapMode === 'family') {
        warMapExec(`WarMap.setZones(${JSON.stringify(String(json || '{}'))})`);
    }
});
mp.events.add('family:warMap:stats:c', (moneyPerHour, reputationPerHour, territories, familyName) => {
    if (!warMapOpen || warMapMode !== 'family') return;
    warMapExec(
        `WarMap.setFamilyHourlyStats(${parseInt(moneyPerHour, 10) || 0},${parseInt(reputationPerHour, 10) || 0},${parseInt(territories, 10) || 0},${JSON.stringify(String(familyName || ''))})`
    );
});
mp.events.add('family:rating:data:c', (json) => {
    if (warMapOpen && warMapMode === 'family') {
        warMapExec(`WarMap.setRating(${JSON.stringify(String(json || '[]'))})`);
    }
});
mp.events.add('family:point:patch:c', (payload) => {
    if (!warMapOpen || warMapMode !== 'family') return;
    try {
        const point = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!point || point.id == null) return;
        warMapExec(
            `WarMap.patchZone(${Number(point.id)},${JSON.stringify(String(point.owner || ''))},${!!point.underAttack})`
        );
    } catch (_e) {}
});
mp.events.add('family:point:flash:c', (pointId, active) => {
    if (!warMapOpen || warMapMode !== 'family') return;
    const id = parseInt(pointId, 10);
    if (!Number.isFinite(id)) return;
    warMapExec(`WarMap.setBattleFlash(${id},${active ? 'true' : 'false'})`);
});

mp.events.add('fraction:zones:update', (json) => {
    if (warMapOpen && warMapMode === 'faction') {
        warMapExec(`WarMap.setZones(${JSON.stringify(String(json || '{}'))})`);
    }
});
mp.events.add('fraction:rating:data:c', (json) => {
    if (warMapOpen && warMapMode === 'faction') {
        warMapExec(`WarMap.setRating(${JSON.stringify(String(json || '[]'))})`);
    }
});
mp.events.add('fraction:warMap:materials:c', (materials) => {
    if (warMapOpen && warMapMode === 'faction') {
        warMapExec(`WarMap.setMaterials(${parseInt(materials, 10) || 0})`);
    }
});
mp.events.add('fraction:zone:setColor', () => {
    if (warMapOpen && warMapMode === 'faction') requestWarMapData();
});

mp.events.add('fraction:zone:setFlash', (zoneId, state) => {
    if (!warMapOpen || warMapMode !== 'faction') return;
    const id = parseInt(zoneId, 10);
    if (!Number.isFinite(id)) return;
    warMapExec(`WarMap.setBattleFlash(${id},${state ? 'true' : 'false'})`);
});

mp.events.add('bizwar:attack:started', () => {
    if (!warMapOpen || warMapMode !== 'faction') return;
    mp.events.call('frac:zones:request');
});

global.__warMapBrowser = () => (warMapOpen && warMapBrowser && mp.browsers.exists(warMapBrowser) ? warMapBrowser : null);

mp.events.add('family:attack:started', () => {
    if (!warMapOpen || warMapMode !== 'family') return;
    mp.events.call('fam:points:request');
});
