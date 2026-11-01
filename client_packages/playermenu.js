/**
 * PlayerMenu (F10) — Flow client controller + Life5rp CEF.
 */
const PM_BROWSER_URL = 'package://cef/PlayerMenu/PlayerMenuMain/playermenu.html?v=102';
let PM_KEY = 0x79;
const PM_BROWSER_ORDER_ID = 130;
const PM_KEY_DEBOUNCE_MS = 250;
const PM_OPEN_TIMEOUT_MS = 8000;
const REPORT_MIN_TEXT_LENGTH = 6;

let playerMenuOpen = false;
let playerMenuWantOpen = false;
let playerMenuOpening = false;
let playerMenuClosing = false;
let playerMenuBrowser = null;
let playerMenuReady = false;
let playerMenuPendingOpen = null;
let playerMenuExecQueue = [];
let playerMenuOpenTimer = null;
let lastPmKeyAt = 0;

const PM_VUE_CLOSE_JS =
    'try{if(typeof palyerMainMenuMenu!=="undefined"&&palyerMainMenuMenu.vue)palyerMainMenuMenu.vue.close();}catch(_e){}';

function escapeBrowserArg(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

function mapLegacyPayloadToMenuData(payload) {
    let raw = payload;
    if (typeof payload === 'string') {
        try { raw = JSON.parse(payload); } catch (_e) { raw = null; }
    }
    if (!raw) return { openTab: 0 };
    if (!Array.isArray(raw)) {
        if (raw.playerData && typeof raw.playerData === 'object') {
            return Object.assign({}, raw.playerData, raw);
        }
        return raw;
    }

    const openTab = raw[0];
    const level = Math.max(1, Number(raw[11]) || 1);
    const exp = Math.max(0, Number(raw[12]) || 0);
    const expMax = level * 4;
    const skillsRaw = Array.isArray(raw[16]) ? raw[16] : [];
    let skills = [
        [0, 0, 100, 10],
        [1, 0, 100, 10],
        [1, 0, 100, 10],
        [0, 0, 100, 10],
        [0, 0, 100, 10]
    ];
    if (skillsRaw.length === 1 && Array.isArray(skillsRaw[0]) && skillsRaw[0].length >= 4) {
        skills[1] = [
            Number(skillsRaw[0][0]) || 1,
            Number(skillsRaw[0][1]) || 0,
            Number(skillsRaw[0][2]) > 0 ? Number(skillsRaw[0][2]) : 100,
            Number(skillsRaw[0][3]) > 0 ? Number(skillsRaw[0][3]) : 10
        ];
    } else if (skillsRaw.length >= 2 && Array.isArray(skillsRaw[1])) {
        skills = skillsRaw;
    } else if (skillsRaw.length >= 1 && Array.isArray(skillsRaw[0])) {
        skills[1] = skillsRaw[0];
    }

    return {
        name: String(raw[1] || ''),
        donatePoint: Number(raw[2]) || 0,
        bp: Number(raw[3]) || 0,
        donatePrice: Number(raw[4]) || 2,
        donateBonus: Array.isArray(raw[5]) ? raw[5] : [],
        hasVIP: !!raw[6],
        vipTime: Number(raw[7]) || 0,
        vipLevel: Number(raw[8]) || 0,
        cash: Number(raw[9]) || 0,
        bank: Number(raw[10]) || 0,
        level,
        exp,
        expMax,
        mood: raw[13] != null ? Number(raw[13]) : 100,
        satiety: raw[14] != null ? Number(raw[14]) : 100,
        minutesPlayed: Number(raw[15]) || 0,
        skills,
        house: null,
        apartment: null,
        businessList: Array.isArray(raw[19]) ? raw[19] : [],
        vehList: Array.isArray(raw[20]) ? raw[20] : [],
        questList: Array.isArray(raw[21]) ? raw[21] : [],
        mutedFirstLevel: !!raw[22],
        mutedNews: !!raw[23],
        accountEmail: String(raw[24] || ''),
        openTab: openTab != null ? openTab : 0
    };
}

function ensurePlayerMenuBrowser() {
    if (!playerMenuBrowser || !mp.browsers.exists(playerMenuBrowser)) {
        playerMenuReady = false;
        playerMenuPendingOpen = null;
        playerMenuExecQueue = [];
        playerMenuBrowser = mp.browsers.new(PM_BROWSER_URL);
        playerMenuBrowser.active = false;
        try { playerMenuBrowser.orderId = PM_BROWSER_ORDER_ID; } catch (_eOrd) {}
    }
    return playerMenuBrowser;
}

function applyPlayerMenuBrowserLayer() {
    try {
        if (playerMenuBrowser && mp.browsers.exists(playerMenuBrowser)) {
            playerMenuBrowser.orderId = PM_BROWSER_ORDER_ID;
        }
    } catch (_e) {}
}

function preloadPlayerMenuBrowser() {
    try { ensurePlayerMenuBrowser(); } catch (_e) {}
}

function browserExec(code) {
    if (!playerMenuBrowser || !mp.browsers.exists(playerMenuBrowser)) return;
    if (!playerMenuReady) {
        playerMenuExecQueue.push(code);
        return;
    }
    try { playerMenuBrowser.execute(code); } catch (_e) {}
}

function flushPlayerMenuExecQueue() {
    if (!playerMenuBrowser || !mp.browsers.exists(playerMenuBrowser)) return;
    const queue = playerMenuExecQueue.slice();
    playerMenuExecQueue = [];
    queue.forEach((code) => {
        try { playerMenuBrowser.execute(code); } catch (_e) {}
    });
}

function pushMenuEvent(eventName, payload) {
    const mapped = mapLegacyPayloadToMenuData(payload);
    const json = JSON.stringify(mapped);
    browserExec(`window.events.callEvent("${String(eventName)}", \`${escapeBrowserArg(json)}\`)`);
}

function pushOpenToBrowser(payload) {
    try {
        const s = (mp.storage.data && mp.storage.data.settings) ? mp.storage.data.settings : {};
        browserExec(
            'try{if(typeof setSettings==="function")setSettings(' + JSON.stringify(s) + ');}' +
            'catch(_e){}' +
            'try{if(typeof bloodHydrateInterfaceFromStorage==="function")bloodHydrateInterfaceFromStorage();}' +
            'catch(_e2){}'
        );
    } catch (_ePushSet) {}
    pushMenuEvent('cef.playermenu.open', payload);
}

function markPlayerMenuReady() {
    if (playerMenuReady) return;
    playerMenuReady = true;
    flushPlayerMenuExecQueue();
    if (playerMenuPendingOpen != null) {
        const pending = playerMenuPendingOpen;
        playerMenuPendingOpen = null;
        pushOpenToBrowser(pending);
    }
}

function clearPlayerMenuOpenTimer() {
    if (playerMenuOpenTimer) {
        clearTimeout(playerMenuOpenTimer);
        playerMenuOpenTimer = null;
    }
}

function forceHideChatForPlayerMenu() {
    try { mp.events.call('hideChatServer'); } catch (_e) {}
    try { mp.gui.chat.show(false); mp.gui.chat.activate(false); } catch (_e) {}
    try {
        if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
        }
    } catch (_e) {}
    try {
        if (typeof global.applyCustomChatVisibility === 'function') {
            global.applyCustomChatVisibility(false);
        }
    } catch (_e) {}
}

function applyPlayerMenuWorldOpen() {
    try {
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    } catch (_e0) {}
    try {
        mp.gui.cursor.show(true, true);
        mp.gui.cursor.visible = true;
    } catch (_e2) {
        try {
            mp.gui.cursor.show(true, true);
            mp.gui.cursor.visible = true;
        } catch (_e3) {}
    }
    forceHideChatForPlayerMenu();
    refreshPlayerMenuWorldChrome();
    // sync настроек мог кратко поднять чат — гасим снова
    forceHideChatForPlayerMenu();
    setTimeout(forceHideChatForPlayerMenu, 0);
    setTimeout(forceHideChatForPlayerMenu, 50);
}

function refreshPlayerMenuWorldChrome() {
    try {
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        } else {
            mp.events.call('hud', true);
            mp.events.call('help', true);
            mp.events.call('minimap', true);
        }
    } catch (_e) {}
    try {
        if (typeof global.__hudWorldRefresh === 'function') global.__hudWorldRefresh(true);
    } catch (_e2) {}
}

function ensurePlayerMenuWorldVisible() {
    ensurePlayerMenuBrowser();
    applyPlayerMenuWorldOpen();
    playerMenuBrowser.active = true;
    applyPlayerMenuBrowserLayer();
    browserExec(`try{if(typeof mp!=='undefined'&&mp.invoke)mp.invoke('focus',true);}catch(_e){}`);
}

function applyPlayerMenuWorldClose() {
    try {
        if (typeof global.suppressPauseMenuAfterEsc === 'function') {
            global.suppressPauseMenuAfterEsc();
        }
    } catch (_sp) {}
    try {
        if (typeof global.menuClose === 'function') global.menuClose();
        else {
            mp.gui.cursor.show(false, false);
            mp.gui.cursor.visible = false;
        }
    } catch (_e) {
        mp.gui.cursor.show(false, false);
        mp.gui.cursor.visible = false;
    }
    try {
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        } else {
            mp.events.call('hud', true);
        }
        if (typeof global.__hudWorldRefresh === 'function') global.__hudWorldRefresh(true);
    } catch (_e2) {}
    // Чат восстанавливается из settings через sync — без безусловного showChatServer
}

function isPlayerMenuBlocked() {
    try {
        const pl = mp.players.local;
        if (!pl) return true;
        if (mp.game.ui.isPauseMenuActive()) return true;
        if (pl.isTypingInTextChat) return true;
        if (global.isTypingInAnyTextField()) return true;
        if (pl.getVariable('auth') !== true) return true;
        if (pl.getVariable('invkey') === true) return true;
        if (pl.getVariable('jail') === true) return true;
        if (pl.getVariable('phone') === true) return true;
        if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return true;
        if (pl.getVariable('f3key') === true) return true;
        if (pl.getVariable('amenu') === true) return true;
        if (pl.getVariable('casmenu') === true) return true;
        if (pl.getVariable('reportui') === true) return true;
        if (pl.getVariable('famcreate') === true) return true;
        if (pl.getVariable('familymenu') === true) return true;
        if (pl.getVariable('blackmenu') === true) return true;
        if (pl.getVariable('animsmenu') === true) return true;
        if (pl.getVariable('shopc') === true) return true;
        if (pl.getVariable('dead') === true) return true;
        if (global.__menubr && mp.browsers.exists(global.__menubr) && global.__menubr.active) return true;
        if (typeof global.menuCheck === 'function' && global.menuCheck() && !playerMenuOpen) return true;
    } catch (_e) {}
    return false;
}

function abortPlayerMenuOpen() {
    if (!playerMenuWantOpen && !playerMenuOpening) return;
    playerMenuWantOpen = false;
    playerMenuOpening = false;
    clearPlayerMenuOpenTimer();
    global.__chatReportDraftPending = null;
    try { mp.events.callRemote('report:ui:setOpen', false); } catch (_eRep) {}
    if (!playerMenuOpen) {
        if (playerMenuBrowser && mp.browsers.exists(playerMenuBrowser)) {
            playerMenuBrowser.active = false;
        }
        applyPlayerMenuWorldClose();
    }
}

function openPlayerMenu() {
    if (playerMenuOpen || playerMenuOpening || playerMenuWantOpen) return;
    if (isPlayerMenuBlocked()) return;

    playerMenuWantOpen = true;
    playerMenuOpening = true;
    ensurePlayerMenuBrowser();
    applyPlayerMenuWorldOpen();

    clearPlayerMenuOpenTimer();
    playerMenuOpenTimer = setTimeout(() => {
        if (playerMenuWantOpen && !playerMenuOpen) abortPlayerMenuOpen();
    }, PM_OPEN_TIMEOUT_MS);

    try { mp.events.callRemote('server.playermenu.open'); } catch (_e) {}
}

function cleanupPlayerMenuCef() {
    browserExec(PM_VUE_CLOSE_JS);
}

function closePlayerMenu(options) {
    if (playerMenuClosing && !(options && options.force)) return;
    /* vue.close() присылает client_menuManager_taskClose обратно из CEF уже после закрытия.
       Повторный проход сбросил бы курсор и HUD у меню, открытого сразу после F10. */
    if (!playerMenuOpen && !playerMenuWantOpen && !playerMenuOpening && !(options && options.force)) return;

    playerMenuClosing = true;
    playerMenuWantOpen = false;
    playerMenuOpening = false;
    clearPlayerMenuOpenTimer();

    if (!(options && options.skipCef)) cleanupPlayerMenuCef();

    if (playerMenuBrowser && mp.browsers.exists(playerMenuBrowser)) {
        playerMenuBrowser.active = false;
    }
    browserExec(`try{if(typeof mp!=='undefined'&&mp.invoke)mp.invoke('focus',false);}catch(_e){}`);

    playerMenuOpen = false;
    global.__playermenuOpen = false;
    global.__playermenuReportFocus = false;
    global.__cefTextInputOpen = false;
    global.__chatReportDraftPending = null;
    try {
        if (typeof global !== 'undefined' && global.__f10Reticle
            && typeof global.__f10Reticle.cancelReticlePreview === 'function') {
            global.__f10Reticle.cancelReticlePreview();
        } else {
            mp.events.call('hudReticlePreviewLayer', false);
        }
    } catch (_eHudLayer) {}
    try {
        global.__keybindCaptureActive = false;
        global.__keybindCaptureSuppressMenuEscUntil = 0;
        __flowPmBindCaptureSince = 0;
        __flowPmBindPrevDown.clear();
    } catch (_eCapClear) {}
    try { mp.events.callRemote('report:ui:setOpen', false); } catch (_eRep) {}
    applyPlayerMenuWorldClose();
    playerMenuClosing = false;
}

function openPlayerMenuWithPayload(payload) {
    clearPlayerMenuOpenTimer();
    playerMenuWantOpen = false;
    playerMenuOpening = false;

    ensurePlayerMenuWorldVisible();
    playerMenuOpen = true;
    global.__playermenuOpen = true;

    if (!playerMenuReady) {
        playerMenuPendingOpen = payload;
        return;
    }
    pushOpenToBrowser(payload);
}

function finishPlayerMenuReportOpen(openPayload, reportPayload) {
    clearPlayerMenuOpenTimer();
    playerMenuWantOpen = false;
    playerMenuOpening = false;

    ensurePlayerMenuWorldVisible();
    playerMenuOpen = true;
    global.__playermenuOpen = true;

    if (openPayload != null && playerMenuReady) {
        pushOpenToBrowser(openPayload);
    } else if (openPayload != null) {
        playerMenuPendingOpen = openPayload;
    }

    if (reportPayload) {
        pushReportToBrowser(reportPayload);
        if (Number(reportPayload.openTab) === 7) setPlayerMenuTab(7);
    }
    global.__chatReportDraftPending = null;
}

function pushReportToBrowser(payload) {
    const json = JSON.stringify(payload || {});
    browserExec(`window.events.callEvent("cef.playermenu.setReport", \`${escapeBrowserArg(json)}\`)`);
}

function isPlayerMenuReportBlocked() {
    try {
        const pl = mp.players.local;
        if (!pl || pl.getVariable('auth') !== true) return true;
        if (pl.getVariable('authtwo') !== true) return true;
        const trueLv = Number(pl.getVariable('adminTrueLvl')) || Number(pl.getVariable('adminlvl')) || 0;
        return trueLv >= 1 && trueLv < 8;
    } catch (_e) {
        return true;
    }
}

function showPlayerNotify(message, type) {
    const msg = String(message || '');
    const t = type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info');
    const title = t === 'error' ? 'Ошибка' : (t === 'success' ? 'Успешно' : 'Информация');
    try {
        if (typeof global.phantomNotify === 'function') {
            global.phantomNotify(t, title, msg);
            return;
        }
        mp.events.call('notify', t, title, msg);
    } catch (_e) {}
}

function openPlayerMenuReportFromChat(draftText) {
    if (isPlayerMenuReportBlocked()) {
        showPlayerNotify('Репорты с админ-аккаунта доступны с 8 уровня.', 'error');
        return;
    }

    if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();

    const draft = String(draftText == null ? '' : draftText).trim();
    if (draft.length > 0 && draft.length < REPORT_MIN_TEXT_LENGTH) {
        showPlayerNotify(`Слишком короткое сообщение. Минимум ${REPORT_MIN_TEXT_LENGTH} символов.`, 'error');
        return;
    }
    global.__chatReportDraftPending = draft;
    global.__playermenuReportFocus = true;

    if (playerMenuOpen) {
        try { mp.events.callRemote('server.playermenu.openReport', draft); } catch (_e) {}
        global.__chatReportDraftPending = null;
        return;
    }

    if (playerMenuWantOpen || playerMenuOpening) {
        try { mp.events.callRemote('server.playermenu.openReport', draft); } catch (_e) {}
        return;
    }

    playerMenuWantOpen = true;
    playerMenuOpening = true;
    ensurePlayerMenuBrowser();

    clearPlayerMenuOpenTimer();
    playerMenuOpenTimer = setTimeout(() => {
        if (playerMenuWantOpen && !playerMenuOpen) abortPlayerMenuOpen();
    }, PM_OPEN_TIMEOUT_MS);

    try { mp.events.callRemote('server.playermenu.openReport', draft); } catch (_e) {
        abortPlayerMenuOpen();
    }
}

function isPlayerMenuStuck() {
    if (playerMenuOpen) return false;
    if ((playerMenuWantOpen || playerMenuOpening) && playerMenuOpenTimer) return false;
    try {
        if (playerMenuBrowser && mp.browsers.exists(playerMenuBrowser) && playerMenuBrowser.active) return true;
    } catch (_e) {}
    if (playerMenuWantOpen || playerMenuOpening) return true;
    return false;
}

function recoverStuckPlayerMenu() {
    if (isPlayerMenuStuck()) {
        abortPlayerMenuOpen();
        return true;
    }
    return false;
}

function setPlayerMenuData(payload) {
    const mapped = mapLegacyPayloadToMenuData(payload);
    const json = JSON.stringify({ playerData: mapped });
    browserExec(`window.events.callEvent("cef.playermenu.setData", \`${escapeBrowserArg(json)}\`)`);
}

function setPlayerMenuTab(tabIndex) {
    browserExec(`window.events.callEvent("cef.playermenu.setTab", ${Number(tabIndex) || 0})`);
}

function pmF10KeyHandler() {
    try {
        if (playerMenuOpen || playerMenuOpening || playerMenuWantOpen) return;
        if (mp.players.local && mp.players.local.isTypingInTextChat) return;
        if (global.__keybindCaptureActive) return;
        const now = Date.now();
        if (now - lastPmKeyAt < PM_KEY_DEBOUNCE_MS) return;
        lastPmKeyAt = now;
        openPlayerMenu();
    } catch (_e) {}
}

function bindPlayerMenuF10Key() {
    try { global.unbindGameplayKey(PM_KEY, true, pmF10KeyHandler); } catch (_e) {}
    const value=Number((mp.storage.data.settings||{}).player_menu_key);
    PM_KEY=Number.isInteger(value)&&value>0&&value<=255?value:121;
    if(PM_KEY>6)global.bindGameplayKey(PM_KEY, true, pmF10KeyHandler);
}

mp.events.add('browserDomReady', (browser) => {
    if (browser !== playerMenuBrowser) return;
    try {
        browser.execute('try{if(typeof mp!=="undefined")mp.trigger("playermenu:cef:ping");}catch(_e){}');
    } catch (_e) {}
});

mp.events.add('playermenu:cef:ping', () => {
    try {
        playerMenuBrowser.execute(
            'try{if(typeof palyerMainMenuMenu!=="undefined")mp.trigger("playermenu:cef:ready");}catch(_e){}'
        );
    } catch (_e) {}
});

mp.events.add('playermenu:cef:ready', () => {
    markPlayerMenuReady();
});

function hexToRgbaParam(hex) {
    const h = String(hex || '#ffffff').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    const v = Number.isFinite(n) ? n : 0xffffff;
    return { rgba: { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255, a: 1 } };
}

function packedReticleToPayload(type, packed) {
    const p = String(packed || '').split('|');
    if (type === 'point2') {
        return [type, [parseInt(p[0], 10) || 10, hexToRgbaParam(p[1]), hexToRgbaParam(p[2])]];
    }
    if (type === 'cross2') {
        return [type, [
            parseInt(p[0], 10) || 10,
            parseInt(p[1], 10) || 10,
            parseInt(p[2], 10) || 10,
            hexToRgbaParam(p[3]),
            hexToRgbaParam(p[4])
        ]];
    }
    return [String(type || ''), []];
}

mp.events.add('playermenu:reticle:save', (raw) => {
    try {
        const line = raw == null ? '' : String(raw);
        let type = '';
        let packed = '';
        if (line.indexOf('SAVE:') === 0) {
            const rest = line.slice(5);
            const colon = rest.indexOf(':');
            if (colon >= 0) {
                type = rest.slice(0, colon);
                packed = rest.slice(colon + 1);
            } else {
                type = rest;
            }
        } else if (line === 'point2' || line === 'cross2') {
            type = line;
        }
        if (type !== 'point2' && type !== 'cross2') return;
        if (typeof global.__f10Reticle !== 'undefined' && typeof global.__f10Reticle.setReticleFromPayload === 'function') {
            global.__f10Reticle.setReticleFromPayload(packedReticleToPayload(type, packed));
        }
        if (typeof global.resetCrosshairRenderState === 'function') {
            global.resetCrosshairRenderState();
        }
        mp.events.call('notify:client', 3, 'top-mid', 'Прицел сохранён.', 2200);
    } catch (_eSave) {}
});

mp.events.add('client.playermenu.open', (payload) => {
    openPlayerMenuWithPayload(payload);
});

mp.events.add('playermenu:cef:esc', () => {
    try {
        if (typeof global.tryClosePlayerMenuEsc === 'function') {
            global.tryClosePlayerMenuEsc();
        }
    } catch (_e) {}
});

mp.events.add('client.playermenu.close', () => {
    closePlayerMenu();
});

mp.events.add('client.playermenu.setData', (payload) => {
    setPlayerMenuData(payload);
});

mp.events.add('client.playermenu.setReport', (payload) => {
    try {
        const raw = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
        const parsed = JSON.parse(raw);
        if (parsed && parsed.submitted) {
            global.__chatReportDraftPending = null;
        } else if (parsed && parsed.draftText == null && global.__chatReportDraftPending != null) {
            parsed.draftText = String(global.__chatReportDraftPending);
        }
        if (!parsed.openTab) parsed.openTab = 7;
        if (!parsed.submitted && parsed.draftText != null && parsed.draftText !== '') {
            parsed.focusInput = true;
        }
        if (!playerMenuOpen) {
            finishPlayerMenuReportOpen(null, parsed);
            return;
        }
        pushReportToBrowser(parsed);
        if (Number(parsed.openTab) === 7) setPlayerMenuTab(7);
        global.__chatReportDraftPending = null;
    } catch (_e) {
        finishPlayerMenuReportOpen(null, { messages: [], openTab: 7 });
    }
});

mp.events.add('client.playermenu.setTab', (tabIndex) => {
    setPlayerMenuTab(tabIndex);
});

mp.events.add('client.playermenu.toast', (text) => {
    if (!text) return;
    try {
        if (typeof global.phantomNotify === 'function') global.phantomNotify('info', 'Информация', String(text));
        else if (typeof global.notify === 'function') global.notify(String(text), 'info');
        else if (typeof global.pushFlowChatLine === 'function') global.pushFlowChatLine(String(text));
        else mp.events.call('chat:pushLine', String(text));
    } catch (_e) {}
});

global.binderFunctions = global.binderFunctions || {};
global.binderFunctions.o_playermenu = openPlayerMenu;
global.binderFunctions.c_playermenu = () => closePlayerMenu();

global.openPlayerMenu = openPlayerMenu;
global.closePlayerMenu = closePlayerMenu;
global.isPlayerMenuOpen = () => !!playerMenuOpen;
global.openPlayerMenuWithPayload = openPlayerMenuWithPayload;
global.setPlayerMenuData = setPlayerMenuData;
global.setPlayerMenuTab = setPlayerMenuTab;
global.pushReportToBrowser = pushReportToBrowser;
global.openPlayerMenuReportFromChat = openPlayerMenuReportFromChat;
global.isPlayerMenuStuck = isPlayerMenuStuck;
global.recoverStuckPlayerMenu = recoverStuckPlayerMenu;
global.cleanupPlayerMenuCef = cleanupPlayerMenuCef;
function markBinderEscCancelled() {
    global.__keybindEscSwallowUntilUp = true;
    global.__keybindCaptureSuppressMenuEscUntil = Date.now() + 500;
    global.__keybindCaptureActive = false;
    __flowPmBindCaptureSince = 0;
    __flowPmBindPrevDown.clear();
}

let __flowPmEscCloseToken = 0;

global.bindGameplayKey(0x1B, false, () => {
    global.__keybindEscSwallowUntilUp = false;
});

global.tryClosePlayerMenuEsc = () => {
    /* ESC во время назначения бинда: только отмена захвата, F10 не закрывать */
    const capturing = !!global.__keybindCaptureActive;
    const swallow = !!global.__keybindEscSwallowUntilUp;

    try {
        if (playerMenuBrowser && mp.browsers.exists(playerMenuBrowser) && playerMenuOpen) {
            playerMenuBrowser.execute(
                '(function(){try{' +
                'var v=(typeof palyerMainMenuMenu!=="undefined"&&palyerMainMenuMenu.vue)?palyerMainMenuMenu.vue:null;' +
                'var cap=!!(v&&v.binderSelectKey!=null&&v.binderSelectKey>=0);' +
                'if(cap){window.__pmEscCancelUntil=Date.now()+500;' +
                'if(window.cancelBinderCaptureFromEsc)window.cancelBinderCaptureFromEsc();' +
                'else if(window.flowEscClearBinderCapture)window.flowEscClearBinderCapture();' +
                'else if(v)v.binderSelectKey=-1;' +
                'mp.trigger("flowPmBinderEscCancelled");}' +
                '}catch(_e){}})();'
            );
        }
    } catch (_eCef) {}

    if (capturing || swallow) {
        markBinderEscCancelled();
        try {
            if (typeof global.suppressPauseMenuAfterEsc === 'function') {
                global.suppressPauseMenuAfterEsc();
            }
        } catch (_sp) {}
        return true;
    }
    if (playerMenuOpen) {
        const token = ++__flowPmEscCloseToken;
        setTimeout(() => {
            if (token !== __flowPmEscCloseToken) return;
            if (global.__keybindEscSwallowUntilUp) return;
            if (global.__keybindCaptureActive) return;
            if (!playerMenuOpen) return;
            closePlayerMenu();
        }, 50);
        return true;
    }
    if (playerMenuWantOpen || playerMenuOpening) {
        abortPlayerMenuOpen();
        try {
            if (typeof global.suppressPauseMenuAfterEsc === 'function') {
                global.suppressPauseMenuAfterEsc();
            }
        } catch (_sp) {}
        return true;
    }
    return false;
};

function playerMenuRenderTick() {
    if (!playerMenuOpen && !playerMenuOpening && !playerMenuWantOpen) return;

    for (let g = 0; g <= 2; g++) {
        mp.game.controls.disableControlAction(g, 199, true);
        mp.game.controls.disableControlAction(g, 200, true);
        mp.game.controls.disableControlAction(g, 156, true);
    }

    if (!playerMenuOpen) return;

    try {
        if (!playerMenuBrowser || !mp.browsers.exists(playerMenuBrowser) || !playerMenuBrowser.active) return;
        applyPlayerMenuBrowserLayer();
        if (!mp.gui.cursor.visible) {
            mp.gui.cursor.show(true, true);
            mp.gui.cursor.visible = true;
        }
    } catch (_e) {}
}

mp.events.add('render', playerMenuRenderTick);

Object.defineProperty(global, '__playermenuBr', {
    configurable: true,
    get() { return playerMenuBrowser; }
});

Object.defineProperty(global, '__playermenuOpen', {
    configurable: true,
    get() { return playerMenuOpen; },
    set(v) { playerMenuOpen = !!v; }
});

bindPlayerMenuF10Key();
mp.events.add('keybindsReload', () => setTimeout(bindPlayerMenuF10Key, 50));
mp.events.add('playerReady', () => setTimeout(preloadPlayerMenuBrowser, 150));
setTimeout(preloadPlayerMenuBrowser, 800);

/** F10 «Управление»: опрос mp.keys для Mouse4/Mouse5 (CEF часто не ловит side buttons). */
let __flowPmBindCaptureSince = 0;
let __flowPmBindPrevDown = new Set();

mp.events.add('flowMenuBinderCaptureStart', () => {
    global.__keybindCaptureActive = true;
    __flowPmBindCaptureSince = Date.now();
    __flowPmBindPrevDown.clear();
    for (let vk = 1; vk <= 0xff; vk++) {
        try { if (global.isGameplayKeyDown(vk)) __flowPmBindPrevDown.add(vk); } catch (_e) {}
    }
});
mp.events.add('bloodMenuBinderCaptureStart', () => {
    mp.events.call('flowMenuBinderCaptureStart');
});

mp.events.add('flowMenuBinderCaptureEnd', () => {
    global.__keybindCaptureActive = false;
    __flowPmBindCaptureSince = 0;
    __flowPmBindPrevDown.clear();
});
mp.events.add('bloodMenuBinderCaptureEnd', () => {
    mp.events.call('flowMenuBinderCaptureEnd');
});

mp.events.add('flowMenuBinderCaptureEsc', () => {
    markBinderEscCancelled();
});
mp.events.add('flowPmBinderEscCancelled', () => {
    markBinderEscCancelled();
});
mp.events.add('bloodMenuBinderCaptureEsc', () => {
    mp.events.call('flowMenuBinderCaptureEsc');
});

mp.events.add('render', () => {
    if (!global.__keybindCaptureActive || !__flowPmBindCaptureSince) return;
    if (Date.now() - __flowPmBindCaptureSince < 350) return;
    if (Date.now() - __flowPmBindCaptureSince > 15000) {
        __flowPmBindCaptureSince = 0;
        __flowPmBindPrevDown.clear();
        global.__keybindCaptureActive = false;
        return;
    }
    const br = global.__playermenuBr;
    if (!br || !mp.browsers.exists(br)) return;

    const downNow = new Set();
    for (let vk = 1; vk <= 0xff; vk++) {
        try { if (mp.keys.isDown(vk)) downNow.add(vk); } catch (_e) {}
    }

    for (const vk of downNow) {
        if (__flowPmBindPrevDown.has(vk)) continue;
        if (vk === 0x1b) {
            br.execute('(function(){try{if(window.flowEscClearBinderCapture)window.flowEscClearBinderCapture();}catch(_e){}})();');
            markBinderEscCancelled();
            return;
        }

        const label = (typeof global.formatVkLabel === 'function') ? global.formatVkLabel(vk) : ('VK' + vk);
        br.execute(
            `(function(){try{if(typeof window.flowCefMouseBindCapture==='function')window.flowCefMouseBindCapture(${vk},${JSON.stringify(label)});}catch(_e){}})();`
        );
        __flowPmBindPrevDown = downNow;
        __flowPmBindCaptureSince = Date.now();
        return;
    }
    __flowPmBindPrevDown = downNow;
});

mp.events.add('updateKeybind',(name)=>{if(name==='player_menu')bindPlayerMenuF10Key();});
let pmMouseHeld=false;mp.events.add('render',()=>{const held=PM_KEY<=6&&mp.keys.isDown(PM_KEY);if(held&&!pmMouseHeld&&!global.__chatInputOpen&&!global.__cefTextInputOpen)pmF10KeyHandler();pmMouseHeld=held;});
