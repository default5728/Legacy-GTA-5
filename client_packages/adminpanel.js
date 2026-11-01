adminpanelr = mp.browsers.new('package://browsers/adminpanel/index.html?v=4');
adminpanelr.active = false;

/** Поверх HUD (100), чата (110), notify (101) и прочих world UI. */
const ADMIN_PANEL_BROWSER_ORDER_ID = 280;

function applyAdminPanelBrowserLayer() {
    try {
        if (adminpanelr && mp.browsers.exists(adminpanelr)) {
            adminpanelr.orderId = ADMIN_PANEL_BROWSER_ORDER_ID;
        }
    } catch (_e) {}
}

try { applyAdminPanelBrowserLayer(); } catch (_eOrd) {}

let isPanelActive = false;
let panelCapabilities = null;
/** Фокус в поле поиска «Справка»: не отдавать клавиши в игру/чат. */
let adminPanelHelpSearchCapturesKeys = false;
/** Фокус в любом INPUT/TEXTAREA/SELECT панели — блок чата (T) и перехват управления. */
let adminPanelFormFocus = false;

function adminPanelExec(js) {
    try {
        if (!mp.browsers.exists(adminpanelr)) return;
        adminpanelr.execute(js);
    } catch (_e) {}
}

function pushAdminPanelSettings() {
    try {
        const binds = typeof global.getAdminBindsForPanel === 'function'
            ? global.getAdminBindsForPanel()
            : { menuKey: 117, menuKeyExtra: 0, espKey: 123 };
        adminPanelExec(
            'window.applyAdminBindLabels && window.applyAdminBindLabels(' + JSON.stringify(JSON.stringify(binds)) + ')'
        );
    } catch (_e) {}
    mp.events.callRemote('admin:settings:load:s');
}

if (typeof global !== 'undefined') {
    global.adminPanelExec = adminPanelExec;
    global.isAdminPanelOpen = () => isPanelActive;
}

mp.events.add('adminPanel:helpSearchKeys', (enabled) => {
    adminPanelHelpSearchCapturesKeys = enabled === true || enabled === 'true';
});

mp.events.add('adminPanel:formFocus', (enabled) => {
    adminPanelFormFocus = enabled === true || enabled === 'true';
});

mp.events.add('render', () => {
    // Пока панель открыта — T/чат compose всегда блок (не только при фокусе в input)
    if (typeof global !== 'undefined') {
        global.__adminPanelBlocksChat = !!isPanelActive;
        global.__adminPanelCapturesKeys =
            !!(isPanelActive && (adminPanelHelpSearchCapturesKeys || adminPanelFormFocus));
    }
    if (isPanelActive) {
        try {
            if (adminpanelr && mp.browsers.exists(adminpanelr) && adminpanelr.active) {
                applyAdminPanelBrowserLayer();
            }
        } catch (_eLayer) {}
        // Если чат всё же открылся — сразу гасим
        try {
            if (global.__chatInputOpen === true) {
                if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
                else if (typeof global.blockChatForAdminMenuKey === 'function') global.blockChatForAdminMenuKey();
            }
        } catch (_eChat) {}
    }
    const capture =
        isPanelActive && (adminPanelHelpSearchCapturesKeys || adminPanelFormFocus);
    if (!capture) return;
    try {
        for (let g = 0; g < 3; g++) {
            mp.game.controls.disableAllControlActions(g);
        }
    } catch (_e) {}
});

function getEffectiveAdminLevel() {
    return Number(mp.players.local.getVariable('adminlvl')) || 0;
}

function canOpenAdminPanel() {
    const pl = mp.players.local;
    if (mp.game.ui.isPauseMenuActive()) return false;
    if (pl.isTypingInTextChat) return false;
    if (global.isTypingInAnyTextField()) return false;
    if (pl.getVariable('auth') !== true) return false;
    if (pl.getVariable('dead') === true) return false;
    const trueLevel=Number(pl.getVariable('adminTrueLvl'))||getEffectiveAdminLevel();
    if(trueLevel<1)return false;
    if(getEffectiveAdminLevel()>0&&pl.getVariable('flowPanelAccess')!==true)return false;
    if (typeof global.captBlocksAdminTools === 'function' && global.captBlocksAdminTools()) return false;
    if (pl.getVariable('shopc') === true) return false;
    if (pl.getVariable('casmenu') === true) return false;
    if (pl.getVariable('blackmenu') === true) return false;
    if (pl.getVariable('familymenu')) return false;
    if (pl.getVariable('famcreate') === true) return false;
    if (global.__menubr && mp.browsers.exists(global.__menubr) && global.__menubr.active) return false;
    return true;
}

function refreshWorldChromeAfterAdminPanel() {
    try {
        if (typeof global.invalidateWorldChromeRasterCache === 'function') global.invalidateWorldChromeRasterCache();
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') global.syncWorldChromeFromStoredSettings();
        if (typeof global.__hudWorldRefresh === 'function') global.__hudWorldRefresh(true);
        if (typeof global.scheduleWorldChromeRestoreAfterModal === 'function') global.scheduleWorldChromeRestoreAfterModal();
        if (typeof global.applyChatPresentation === 'function') global.applyChatPresentation();
    } catch (_e) {}
}

function closeAdminPanel() {
    if (!isPanelActive) return false;
    adminpanelr.active = false;
    mp.gui.cursor.show(false, false);
    mp.events.callRemote('amenu', false);
    isPanelActive = false;
    adminPanelHelpSearchCapturesKeys = false;
    adminPanelFormFocus = false;
    if (typeof global !== 'undefined') {
        global.__adminPanelBlocksChat = false;
        global.__adminPanelCapturesKeys = false;
    }
    try {
        adminpanelr.execute(
            "try{var e=document.getElementById('commandsSearch');if(e)e.blur();var r=document.getElementById('reply-text');if(r)r.blur();}catch(_x){}"
        );
    } catch (_e) {}
    refreshWorldChromeAfterAdminPanel();
    return true;
}

function openAdminPanel() {
    if (!canOpenAdminPanel()) {
        const trueLv =
            typeof global.getClientAdminTrueLevel === 'function'
                ? global.getClientAdminTrueLevel()
                : Number(mp.players.local.getVariable('adminTrueLvl')) || 0;
        if (trueLv >= 1 && getEffectiveAdminLevel() < 1) {
            mp.events.call('notify:client', 2, 'top-mid', 'Сначала /logadmin и пароль в чат.', 3000);
        } else if (typeof global.captBlocksAdminTools === 'function' && global.captBlocksAdminTools()) {
            mp.events.call('notify:client', 2, 'top-mid', 'В войне семей админ-панель недоступна.', 3000);
        }
        return false;
    }
    if (!mp.browsers.exists(adminpanelr)) return false;
    try {
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
        else if (typeof global.blockChatForAdminMenuKey === 'function') global.blockChatForAdminMenuKey();
    } catch (_eCloseChat) {}
    adminpanelr.active = true;
    applyAdminPanelBrowserLayer();
    mp.gui.cursor.show(true, true);
    mp.events.callRemote('amenu', true);
    isPanelActive = true;
    mp.events.callRemote('legacy:panel:action',JSON.stringify({action:'load'}));
    if (typeof global !== 'undefined') global.__adminPanelBlocksChat = true;
    pushAdminPanelSettings();
    refreshWorldChromeAfterAdminPanel();
    try {
        const trueLv =
            typeof global.getClientAdminTrueLevel === 'function'
                ? global.getClientAdminTrueLevel()
                : Number(mp.players.local.getVariable('adminTrueLvl')) || getEffectiveAdminLevel();
        adminPanelExec(`window.__adminPanelSetLevel && window.__adminPanelSetLevel(${Number(trueLv) || 0})`);
    } catch (_eLv) {}
    return true;
}

function toggleAdminPanel() {
    if (isPanelActive) {
        closeAdminPanel();
        return;
    }
    openAdminPanel();
}

if (typeof global !== 'undefined') {
    global.tryCloseAdminEsc = () => closeAdminPanel();
    global.toggleAdminPanel = toggleAdminPanel;
}

mp.events.add('teleportToInterior', (id) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('teleportToInterior', id);
    setTimeout(() => {
        mp.gui.cursor.show(true, true);
    }, 250);
});

mp.events.add('goto',cid=>mp.events.callRemote('legacy:panel:execute','goto '+String(cid)));
mp.events.add('gethere',cid=>mp.events.callRemote('legacy:panel:execute','tp '+String(cid)));

mp.events.add('capt:forceAdminLock', () => {
    closeAdminPanel();
});

mp.events.add('adminPanel:addReport', (playerStatic, text, isMediaRaw, loginRaw) => {
    if (typeof playerStatic === 'string' && playerStatic.charAt(0) === '{') {
        adminPanelExec('window.addReport && window.addReport(' + JSON.stringify(playerStatic) + ')');
        return;
    }
    const payload = JSON.stringify({
        static: parseInt(playerStatic, 10),
        text: typeof text === 'string' ? text : String(text || ''),
        isMedia: isMediaRaw === true || isMediaRaw === 1 || isMediaRaw === '1',
        login: loginRaw ? String(loginRaw) : undefined
    });
    adminPanelExec('window.addReport && window.addReport(' + payload + ')');
});

mp.events.add('adminPanel:addReportPayload', (jsonStr) => {
    try {
        const s = JSON.stringify(String(jsonStr != null ? jsonStr : '{}'));
        adminPanelExec('window.addReport && window.addReport(JSON.parse(' + s + '))');
    } catch (_e) {}
});

mp.events.add('adminPanel:setReportThread', (jsonStr) => {
    try {
        const s = JSON.stringify(String(jsonStr != null ? jsonStr : '{}'));
        adminPanelExec('window.setReportThread && window.setReportThread(JSON.parse(' + s + '))');
    } catch (_e) {}
});

mp.events.add('adminPanel:appendReportMsg', (playerStatic, msgJson) => {
    try {
        const sid = parseInt(playerStatic, 10);
        const s = JSON.stringify(String(msgJson != null ? msgJson : '{}'));
        adminPanelExec('window.appendReportMessage && window.appendReportMessage(' + sid + ', JSON.parse(' + s + '))');
    } catch (_e) {}
});

mp.events.add('adminPanel:setCmdHints', (jsonStr) => {
    try {
        if (!mp.browsers.exists(adminpanelr)) return;
        const s = JSON.stringify(String(jsonStr != null ? jsonStr : '[]'));
        adminpanelr.execute(`window.__adminPanelSetCmdHints && window.__adminPanelSetCmdHints(${s})`);
    } catch (_e) {}
});

mp.events.add('adminPanel:setAdminLevel', (lvl) => {
    try {
        if (!mp.browsers.exists(adminpanelr)) return;
        const n = Number(lvl) || 0;
        adminpanelr.execute(`window.__adminPanelSetLevel && window.__adminPanelSetLevel(${n})`);
    } catch (_e) {}
});

mp.events.add('adminPanel:notify', (text) => {
    try {
        mp.events.call('notify:client', 2, 'top-mid', String(text || ''), 3500);
    } catch (_e) {}
});

mp.events.add('adminPanel:removeReport', (playerStatic) => {
    if (typeof playerStatic !== 'number') playerStatic = parseInt(playerStatic, 10);
    adminpanelr.execute('removeReportByStatic(' + playerStatic + ')');
});

mp.events.add('report:adminCloseTicket', (targetStatic) => {
    mp.events.callRemote('report:admin:closeTicket', targetStatic);
});

mp.events.add('report:adminReplyOnly', (payloadJson) => {
    mp.events.callRemote('report:admin:replyOnly', payloadJson);
});

mp.events.add('adminPanel:loadReportThread', (staticId) => {
    mp.events.callRemote('report:admin:getThread:s', staticId);
});

mp.events.add('adminPanel:spec', (staticId) => {
    const sid = parseInt(staticId, 10);
    if (!Number.isFinite(sid) || sid <= 0) return;
    mp.events.callRemote('legacy:panel:execute','spec '+sid);setTimeout(closeAdminPanel,100);
});

mp.events.add('adminPanel:saveBinds', (jsonStr) => {
    if (typeof global.applyAdminBindsFromJson === 'function') {
        global.applyAdminBindsFromJson(jsonStr);
    }
});

mp.events.add('adminPanel:resetPass', () => {
    mp.events.callRemote('admin:resetSessionPass:s');
});

mp.events.add('adminPanel:settingsInfo', (jsonStr) => {
    try {
        const s = JSON.stringify(String(jsonStr != null ? jsonStr : '{}'));
        adminPanelExec('window.setSettingsInfo && window.setSettingsInfo(JSON.parse(' + s + '))');
    } catch (_e) {}
});
mp.events.add('legacy:admin:teleported',()=>{
 closeAdminPanel();
 if(typeof global.forceCloseChatInput==='function')global.forceCloseChatInput();
 for(const delay of [0,150,600])setTimeout(()=>{
  if(!global.isPlayerSpawned||global.isDead)return;
  refreshWorldChromeAfterAdminPanel();
  if(typeof global.restoreChatAfterWorldEnter==='function')global.restoreChatAfterWorldEnter();
 },delay);
});

mp.events.add('adminPanel:accessChanged',allowed=>{if(allowed!==true&&((Number(mp.players.local.getVariable('adminTrueLvl'))||0)<1||getEffectiveAdminLevel()>0))closeAdminPanel();});
mp.events.add('legacy:flowpanel:open',()=>{if(!isPanelActive)openAdminPanel();});

mp.events.add('adminPanel:setCapabilities',caps=>{
 panelCapabilities={money:!!(caps&&caps.money),dp:!!(caps&&caps.dp)};
 adminPanelExec('window.__adminPanelSetCapabilities&&window.__adminPanelSetCapabilities('+JSON.stringify(panelCapabilities)+');');
});
mp.events.add('browserDomReady',browser=>{
 if(browser===adminpanelr&&panelCapabilities)adminPanelExec('window.__adminPanelSetCapabilities&&window.__adminPanelSetCapabilities('+JSON.stringify(panelCapabilities)+');');
});
mp.events.add('adminPanel:execCommand',command=>{
 if(!isPanelActive||typeof command!=='string'||command.length>200)return;
 mp.events.callRemote('legacy:panel:execute',command);
});

mp.events.add('legacy:panel:action',raw=>{if(isPanelActive&&typeof raw==='string'&&raw.length<=4000)mp.events.callRemote('legacy:panel:action',raw);});
mp.events.add('legacy:panel:state',raw=>{if(typeof raw==='string')adminPanelExec('window.LegacyAdmin&&LegacyAdmin.update('+JSON.stringify(raw)+');');});
