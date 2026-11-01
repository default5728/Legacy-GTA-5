global.chatr = mp.browsers.new("package://kepler-compat/hud/index.html");
global.__chatInputOpen = false;

mp.events.add('chatTypingState', (state) => {
    global.__chatInputOpen = state === true || state === 1 || state === 'true' || state === '1';
    global.isChatInputActive = global.__chatInputOpen;
});

global.isChatComposeOpen = function isChatComposeOpen() {
    return global.__chatInputOpen === true;
};

global.forceCloseChatInput = function forceCloseChatInput() {
    global.__chatInputOpen = false;
    closeChatCompose();
};

mp.events.add('chat:forceCloseInput', () => {
    global.forceCloseChatInput();
});

global.tryCloseChatEsc = function tryCloseChatEsc() {
    if (global.__chatInputOpen !== true) return false;
    global.forceCloseChatInput();
    if (typeof global.suppressPauseMenuAfterEsc === 'function') {
        global.suppressPauseMenuAfterEsc();
    }
    return true;
};

mp.events.add('chatSuppressPauseAfterEsc', () => {
    if (typeof global.suppressPauseMenuAfterEsc === 'function') {
        global.suppressPauseMenuAfterEsc();
    }
});

/** Пока открыт CEF-чат — блокируем WASD, прыжок, спринт, удары (T не ставит isTypingInTextChat). */
const CHAT_BLOCK_CONTROLS = [21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35, 36, 37, 44, 140, 141, 257, 263, 264];

mp.events.add('render', () => {
    if (!global.__chatInputOpen) return;
    try {
        for (let group = 0; group < 3; group++) mp.game.controls.disableAllControlActions(group);
    } catch (_e) {}
});

function pushLineToChatBrowser(text) {
    try {
        if (!mp.browsers.exists(global.chatr)) return;
        const esc = JSON.stringify(String(text));
        global.chatr.execute(`(function(){try{if(window.chatAPI&&chatAPI.push)chatAPI.push(${esc});}catch(_e){}})();`);
        if (!shouldChatBeVisible()) return;
        global.chatr.active = true;
        global.chatr.execute('try{if(typeof showChat==="function")showChat();}catch(_e){}');
    } catch (_e) {}
}

function execChatBrowser(cmd) {
    try {
        if (!mp.browsers.exists(global.chatr)) return;
        global.chatr.execute(cmd);
    } catch (_e) {}
}

function closeChatCompose() {
    execChatBrowser('window.__chatForceCloseCompose && window.__chatForceCloseCompose()');
}

let chatHudAllowed = false;
let chatPhoneOpen = false;
let chatMenuAllowed = true;
let chatServerForcedHidden = false;
let chatUiVisible = null;

function isAdminConsoleBlockingChat() {
    try {
        if (typeof global !== 'undefined' && global.__adminConsoleBlocksChat === true) return true;
        if (typeof global.adminConsoleBlocksUi === 'function' && global.adminConsoleBlocksUi()) return true;
    } catch (_e) {}
    return false;
}

function isPlayerMenuOpenSafe() {
    try {
        if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return true;
        if (global.__playermenuOpen === true) return true;
    } catch (_e) {}
    return false;
}

function isChatOverlayBlocked() {
    try {
        try {
            if (typeof global.isGtaPauseMenuOpen === 'function') {
                if (global.isGtaPauseMenuOpen()) return true;
            } else if (mp.game.ui.isPauseMenuActive()) {
                return true;
            }
        } catch (_ePause) {}
        if (isAdminConsoleBlockingChat()) return true;
        // F10: чат никогда поверх меню (тумблер только пишет preference)
        if (isPlayerMenuOpenSafe()) return true;
        // Админ-панель: T не открывает чат (репорты / любые поля)
        if (typeof global !== 'undefined' && global.__adminPanelBlocksChat === true) return true;
        if (typeof global.isAdminPanelOpen === 'function' && global.isAdminPanelOpen()) return true;
        try {
            if (mp.players.local && mp.players.local.getVariable('amenu') === true) return true;
        } catch (_eAmenu) {}
        if (typeof global.isCharCreatorActive === 'function' && global.isCharCreatorActive()) return true;
        if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) return true;
        if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return true;
        if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) return true;
        if (typeof global.isTattooShopOpen === 'function' && global.isTattooShopOpen()) return true;
        if (typeof global.isAutosalonOpen === 'function' && global.isAutosalonOpen()) return true;
        if (global.__amunationUiOpen === true) return true;
        if (global.__kablukBarShopOpen === true) return true;
        if (global.__moonvitoOpen === true) return true;
        if (typeof global.isNpcDialogModalOpen === 'function' && global.isNpcDialogModalOpen()) return true;
        if (typeof global.isAnimMenuOpen === 'function' && global.isAnimMenuOpen()) return true;
        try {
            if (mp.players.local && mp.players.local.getVariable('animsmenu') === true) return true;
        } catch (_eAnim) {}
        if (typeof global.isFracInteractOpen === 'function' && global.isFracInteractOpen()) return true;
        if (typeof global.isFactionTabletOpen === 'function' && global.isFactionTabletOpen()) return true;
        if (typeof global.isFamilyTabletOpen === 'function' && global.isFamilyTabletOpen()) return true;
        try {
            if (mp.players.local && mp.players.local.getVariable('familymenu') === true) return true;
        } catch (_eFam) {}
        if (typeof global.isBizwarMenuOpen === 'function' && global.isBizwarMenuOpen()) return true;
        if (typeof global.isWarMapOpen === 'function' && global.isWarMapOpen()) return true;
        if (typeof global.isFracInteractOpen === 'function' && global.isFracInteractOpen()) return true;
        if (typeof global.isWorldChromeSuppressedByOverlay === 'function' && global.isWorldChromeSuppressedByOverlay()) return true;
        if (chatPhoneOpen) return true;
        try {
            const p = mp.players.local;
            if (p && p.getVariable('phone') === true) return true;
            if (p && p.getVariable('f3key') === true) return true;
            if (typeof global.isF3MainMenuOpen === 'function' && global.isF3MainMenuOpen()) return true;
            if (typeof global.isMainMenuBrowserActive === 'function' && global.isMainMenuBrowserActive()) return true;
        } catch (_ePhone) {}
        if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return true;
        if (typeof global.__hudOverlayBlocksWorldChrome === 'function') {
            return global.__hudOverlayBlocksWorldChrome();
        }
    } catch (_e) {}
    return false;
}

global.isChatBlockedByOverlay = isChatOverlayBlocked;
global.isChatHiddenByUiModal = isChatOverlayBlocked;

function isPlayerInWorldForChat() {
    try {
        if (mp.players.local.getVariable('auth') !== true) return false;
        if (typeof global.isCharCreatorActive === 'function' && global.isCharCreatorActive()) return false;
        if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return false;
        if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) return false;
        if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) return false;
        if (typeof global.clientMayShowWorldChrome === 'function') return global.clientMayShowWorldChrome();
        return true;
    } catch (_e) {
        return false;
    }
}

function shouldChatBeVisible() {
    if (mp.storage.data.toggleChat === false) return false;
    if (chatServerForcedHidden || chatMenuAllowed === false) return false;
    if (isChatOverlayBlocked()) return false;
    if (isPlayerInWorldForChat()) return true;
    if (!chatHudAllowed) return false;
    return true;
}

function applyChatVisibility() {
    try {
        const pauseOpen = (typeof global.isGtaPauseMenuOpen === 'function' && global.isGtaPauseMenuOpen())
            || mp.game.ui.isPauseMenuActive();
        if (pauseOpen) {
            chatUiVisible = false;
            closeChatCompose();
            execChatBrowser('hideChat()');
            return;
        }
    } catch (_ePause) {}
    if (global.__chatInputOpen) {
        execChatBrowser('showChat()');
        chatUiVisible = true;
        return;
    }
    const visible = shouldChatBeVisible();
    if (!visible) {
        chatUiVisible = false;
        closeChatCompose();
        execChatBrowser('hideChat()');
        return;
    }
    if (chatUiVisible === true) return;
    chatUiVisible = true;
    execChatBrowser('showChat()');
}

global.isChatWorldVisible = function () {
    return shouldChatBeVisible();
};

mp.events.add('hud', (toggle) => {
    chatHudAllowed = !!toggle;
    applyChatVisibility();
});

mp.events.add('phonehud', (open) => {
    chatPhoneOpen = !!open;
    applyChatVisibility();
});

mp.events.add('showHud:CLIENT', () => {
    chatHudAllowed = true;
    applyChatVisibility();
});

mp.events.add('lobbySpawnComplete', () => {
    chatHudAllowed = true;
    applyChatVisibility();
    setTimeout(() => {
        try { global.restoreChatAfterWorldEnter(); } catch (_e) {}
    }, 1200);
});
mp.events.add('worldHudRefresh', () => {
    chatHudAllowed = true;
    applyChatVisibility();
});

setInterval(applyChatVisibility, 110);

mp.events.add("chat:pushLine", pushLineToChatBrowser);
mp.events.add("chat:push", pushLineToChatBrowser);

mp.events.add('chatLinkCopied', () => {
    mp.events.call('notify:client', 1, 'top-mid', 'Ссылка скопирована', 4000);
});

function runChatCommandFromBrowser(commandBody) {
    const body = String(commandBody || '').trim();
    if (!body) return;
    try {
        mp.events.callRemote('chat:execSlashCommand', body);
        return;
    } catch (_remote) {}
    try {
        if (mp.browsers.exists(global.chatr)) {
            const esc = JSON.stringify(body);
            global.chatr.execute(`try{mp.invoke("command",${esc})}catch(_e){}`);
        }
    } catch (_e) {}
}

mp.events.add("chatSendChannel", (mode, text) => {
    const m = String(mode || "").toLowerCase();
    const msg = String(text || "").trim();
    if (!msg) return;

    if (msg.charAt(0) === "/") {
        if (msg.length >= 2) {
            runChatCommandFromBrowser(msg.slice(1));
        }
        return;
    }

    if (m === "admin" || m === "fraction" || m === "fraction_nrp" || m === "department" || m === "family" || m === "family_nrp" || m === "media") {
        mp.events.callRemote("chat:sendChannel", m, msg);
        return;
    }

    mp.events.callRemote("chat:cefSay", msg);
});

mp.events.add("chatSendSay", (text) => {
    const msg = String(text || "").trim();
    if (!msg) return;
    if (msg.charAt(0) === "/") {
        if (msg.length >= 2) runChatCommandFromBrowser(msg.slice(1));
        return;
    }
    mp.events.callRemote("chat:cefSay", msg);
});

mp.events.add("chatExecCommand", (cmdLine) => {
    const line = String(cmdLine || "").trim();
    if (!line) return;
    runChatCommandFromBrowser(line);
});

global.__chatCmdHintsCache = "[]";
let chatCmdHintsRequestedAt = 0;

function pushAdminCmdHintsToBrowser(jsonStr) {
    try {
        if (!mp.browsers.exists(global.chatr)) return;
        global.__chatCmdHintsCache = String(jsonStr != null ? jsonStr : "[]");
        const s = JSON.stringify(global.__chatCmdHintsCache);
        global.chatr.execute(`window.__setAdminCmdHints && window.__setAdminCmdHints(${s})`);
    } catch (_e) {}
}

mp.events.add("chatRequestCmdHints", () => {
    pushAdminCmdHintsToBrowser(global.__chatCmdHintsCache);
    syncChatChannelsToBrowser();
    const now = Date.now();
    if (now - chatCmdHintsRequestedAt >= 1500) {
        chatCmdHintsRequestedAt = now;
        try {
            mp.events.callRemote("chat:requestCmdHints");
        } catch (_e) {}
    }
});

function pushAdminSuggestStateToChat() {
    pushAdminCmdHintsToBrowser(global.__chatCmdHintsCache);
    try {
        if (!mp.browsers.exists(global.chatr)) return;
        global.chatr.execute("window.__setAdminSuggestActive && window.__setAdminSuggestActive(true)");
    } catch (_e) {}
}

function syncChatChannelsToBrowser() {
    try {
        if (!mp.browsers.exists(global.chatr)) return;
        const admin = (typeof global.getClientAdminTrueLevel === 'function'
            ? global.getClientAdminTrueLevel()
            : (mp.players.local.getVariable("adminlvl") || 0)) >= 1;
        const hasMedia = mp.players.local.getVariable("media") === true;
        const fam = mp.players.local.getVariable("family");
        const hasFam = fam != null && fam !== "";
        const fr = mp.players.local.getVariable("fraction");
        const hasFrac = fr != null && fr !== "" && Number(fr) !== 0;
        const payload = JSON.stringify({ admin, hasFam, hasFrac, hasMedia });
        global.chatr.execute(`window.__chatSetChannels && window.__chatSetChannels(${payload})`);
    } catch (_e) {}
}

mp.events.add("chat:syncChannels", syncChatChannelsToBrowser);

mp.events.add("cef:setAdminCmdHints", (jsonStr) => {
    pushAdminCmdHintsToBrowser(jsonStr);
});

const CHAT_FONT_OPTIONS = ["Inter", "Onest", "Manrope", "Rubik", "JetBrains Mono"];
const CHAT_DEFAULTS = {
    width: 40,
    height: 195,
    fontSize: 14,
    lineHeight: 24,
    opacity: 1,
    fontFamily: "Inter",
    scale: 1.2
};

function migrateChatHeight(value) {
    const n = Number(value);
    if (!isFinite(n) || n <= 0) return CHAT_DEFAULTS.height;
    const r = n <= 60 ? Math.round(n * 9) : Math.round(n);
    return Math.min(400, Math.max(80, r));
}

function migrateChatLineHeight(value) {
    const n = Number(value);
    if (!isFinite(n) || n <= 0) return CHAT_DEFAULTS.lineHeight;
    const r = n <= 3 ? Math.round(n * 16) : Math.round(n);
    return Math.min(40, Math.max(14, r));
}

if (mp.storage.data.timeStamp === undefined) mp.storage.data.timeStamp = false;
if (mp.storage.data.pageSize === undefined) mp.storage.data.pageSize = CHAT_DEFAULTS.height;
else mp.storage.data.pageSize = migrateChatHeight(mp.storage.data.pageSize);
if (mp.storage.data.fontSize === undefined) mp.storage.data.fontSize = CHAT_DEFAULTS.fontSize;
if (mp.storage.data.toggleChat === undefined) mp.storage.data.toggleChat = true;

function ensureChatSettings() {
    let cs = mp.storage.data.chatSettings;
    if (!cs || typeof cs !== "object") cs = {};

    if (typeof cs.width !== "number" || !isFinite(cs.width) || cs.width < 18 || cs.width > 90) cs.width = CHAT_DEFAULTS.width;
    if (typeof cs.height !== "number" || !isFinite(cs.height) || cs.height < 80 || cs.height > 400) {
        cs.height = CHAT_DEFAULTS.height;
    } else {
        cs.height = migrateChatHeight(cs.height);
    }
    if (typeof cs.fontSize !== "number" || !isFinite(cs.fontSize) || cs.fontSize <= 3) {
        cs.fontSize = CHAT_DEFAULTS.fontSize;
    }
    if (typeof cs.lineHeight !== "number" || !isFinite(cs.lineHeight) || cs.lineHeight < 14 || cs.lineHeight > 40) {
        cs.lineHeight = CHAT_DEFAULTS.lineHeight;
    } else {
        cs.lineHeight = migrateChatLineHeight(cs.lineHeight);
    }
    if (typeof cs.opacity !== "number" || !isFinite(cs.opacity) || cs.opacity < 0.1 || cs.opacity > 1) cs.opacity = CHAT_DEFAULTS.opacity;
    if (typeof cs.scale !== "number" || !isFinite(cs.scale) || cs.scale < 1.0 || cs.scale > 1.5) cs.scale = CHAT_DEFAULTS.scale;
    if (typeof cs.fontFamily !== "string" || CHAT_FONT_OPTIONS.indexOf(cs.fontFamily) === -1) {
        const legacyFont = mp.storage.data.chatFontFamily;
        cs.fontFamily = (typeof legacyFont === "string" && CHAT_FONT_OPTIONS.indexOf(legacyFont) !== -1)
            ? legacyFont
            : CHAT_DEFAULTS.fontFamily;
    }

    mp.storage.data.chatSettings = cs;
    mp.storage.data.pageSize = cs.height;
    mp.storage.data.fontSize = cs.fontSize;
    mp.storage.data.chatFontFamily = cs.fontFamily;
    return cs;
}

function pushChatSettingsToBrowser() {
    try {
        if (!mp.browsers.exists(global.chatr)) return;
        const cs = ensureChatSettings();
        let fs = Number(cs.fontSize) || CHAT_DEFAULTS.fontSize;
        if (fs <= 3) fs = Math.round(fs * 16);
        fs = Math.min(18, Math.max(12, Math.round(fs)));
        let h = Number(cs.height) || 240;
        if (h <= 60) h = Math.round(h * 9);
        h = Math.min(400, Math.max(80, Math.round(h)));
        const payload = JSON.stringify({
            fontSize: fs,
            pageSize: h,
            chatWidth: cs.width || CHAT_DEFAULTS.width,
            lineHeight: cs.lineHeight || 24,
            opacity: cs.opacity,
            scale: cs.scale,
            timeStamp: !!mp.storage.data.timeStamp,
            chatToggle: !!mp.storage.data.toggleChat
        });
        global.chatr.execute(`window.applyChatSettings && window.applyChatSettings(${payload})`);
    } catch (_e) {}
}

function pushChatSettingsToMenu() {
    try {
        const cs = ensureChatSettings();
        const menuCs = Object.assign({}, cs);
        if (typeof menuCs.fontSize === 'number' && menuCs.fontSize > 3) {
            menuCs.fontSize = Math.round((menuCs.fontSize / 16) * 100) / 100;
        }
        const payload = JSON.stringify(menuCs);
        const code = `window.applyChatSettingsToMenu && window.applyChatSettingsToMenu(${payload})`;
        const mb = global.__menubr;
        if (mb && mp.browsers.exists(mb)) mb.execute(code);
        const pm = global.__playermenuBr;
        if (pm && mp.browsers.exists(pm)) pm.execute(code);
    } catch (_e) {}
}

function clampChatNumber(value, min, max, fallback) {
    const v = Number(value);
    if (!isFinite(v)) return fallback;
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

mp.events.add("CustomChatSettingsSet", (mode, raw) => {
    const cs = ensureChatSettings();
    const idx = Number(mode);
    switch (idx) {
        case 0:
            cs.height = clampChatNumber(raw, 80, 400, cs.height);
            break;
        case 1:
            cs.width = clampChatNumber(raw, 18, 90, cs.width);
            break;
        case 2:
            cs.fontSize = clampChatNumber(raw, 0.4, 2.5, cs.fontSize);
            break;
        case 3:
            cs.lineHeight = clampChatNumber(raw, 14, 40, cs.lineHeight);
            break;
        case 4:
            cs.opacity = clampChatNumber(raw, 0.2, 1.0, cs.opacity);
            break;
        case 5:
            cs.width = CHAT_DEFAULTS.width;
            cs.height = CHAT_DEFAULTS.height;
            cs.fontSize = CHAT_DEFAULTS.fontSize;
            cs.lineHeight = CHAT_DEFAULTS.lineHeight;
            cs.opacity = CHAT_DEFAULTS.opacity;
            cs.fontFamily = CHAT_DEFAULTS.fontFamily;
            cs.scale = CHAT_DEFAULTS.scale;
            mp.storage.data.pageSize = cs.height;
            mp.storage.data.fontSize = cs.fontSize;
            mp.storage.data.chatFontFamily = cs.fontFamily;
            break;
        case 6: {
            const name = String(raw || "").trim();
            if (CHAT_FONT_OPTIONS.indexOf(name) !== -1) cs.fontFamily = name;
            break;
        }
        case 7:
            cs.scale = clampChatNumber(raw, 1.0, 1.5, cs.scale);
            break;
        default:
            return;
    }
    mp.storage.data.chatSettings = cs;
    if (idx === 0) mp.storage.data.pageSize = cs.height;
    if (idx === 2) mp.storage.data.fontSize = cs.fontSize;
    if (idx === 6) mp.storage.data.chatFontFamily = cs.fontFamily;
    try { mp.storage.flush(); } catch (_e) {}
    pushChatSettingsToBrowser();
    pushChatSettingsToMenu();
    applyChatVisibility();
});

mp.events.add("CustomChatSettingsRequest", () => {
    pushChatSettingsToMenu();
});

const CHAT_OPEN_KEY = 0x54;
const TAB_KEY = 0x09;
const ADMIN_MENU_KEY = 0x75;
let adminMenuChatBlockFrames = 0;

function blockChatForAdminMenuKey() {
    adminMenuChatBlockFrames = 4;
    global.__chatInputOpen = false;
    closeChatCompose();
    try {
        mp.gui.chat.activate(false);
        mp.gui.chat.show(false);
    } catch (_e) {}
    execChatBrowser(
        'window.__chatBlockOpenCompose=true;window.__chatForceCloseCompose&&window.__chatForceCloseCompose();' +
            'setTimeout(function(){window.__chatBlockOpenCompose=false;},300);'
    );
}

if (typeof global !== 'undefined') {
    global.blockChatForAdminMenuKey = blockChatForAdminMenuKey;
}

mp.gui.chat.show(false);
chatr.markAsChat();

global.bindGameplayKey(ADMIN_MENU_KEY, true, blockChatForAdminMenuKey);

mp.events.add('render', () => {
    if (adminMenuChatBlockFrames <= 0) return;
    adminMenuChatBlockFrames--;
    if (global.__chatInputOpen) {
        global.__chatInputOpen = false;
        closeChatCompose();
    }
    try {
        mp.gui.chat.activate(false);
    } catch (_e) {}
});

function releaseChatBrowserFocusFromClient() {
    if (global.__chatInputOpen) return;
    try { mp.gui.chat.activate(false); } catch (_e) {}
    execChatBrowser('window.__chatReleaseFocus && window.__chatReleaseFocus();');
}

global.bindGameplayKey(TAB_KEY, true, () => {
    if (global.__chatInputOpen) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    // Tab = инвентарь: не снимаем CEF-фокус, иначе курсор в инвентаре «мёртвый»
    try {
        if (typeof global.getGameplayInventoryKeyVk === 'function' && global.getGameplayInventoryKeyVk() === TAB_KEY) {
            return;
        }
        if (typeof global.isLocalInventoryModalOpen === 'function' && global.isLocalInventoryModalOpen()) {
            return;
        }
        if (mp.players.local.getVariable('invkey') === true) return;
    } catch (_e) {}
    releaseChatBrowserFocusFromClient();
});

global.bindGameplayKey(CHAT_OPEN_KEY, true, function () {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (typeof global.isTypingInAnyTextField === 'function' && global.isTypingInAnyTextField()) return;
    if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return;
    if (isAdminConsoleBlockingChat()) return;
    if (typeof global.isPreAuthUiBlockingGameplay === "function" && global.isPreAuthUiBlockingGameplay()) return;
    if (mp.players.local.getVariable("shopc") === true) return;
    if (mp.players.local.getVariable("tabletTryOn") === true) return;
    if (typeof global !== "undefined" && global.__adminPanelBlocksChat === true) return;
    if (typeof global.isAdminPanelOpen === "function" && global.isAdminPanelOpen()) return;
    try {
        if (mp.players.local.getVariable("amenu") === true) return;
    } catch (_eAmenu) {}
    if (isChatOverlayBlocked()) return;
    if (mp.storage.data.toggleChat === false) return;
    if (chatServerForcedHidden || chatMenuAllowed === false) return;
    chatServerForcedHidden = false;
    chatMenuAllowed = true;
    global.__chatInputOpen = true;
    syncChatChannelsToBrowser();
    pushAdminSuggestStateToChat();
    const shift = global.isGameplayKeyDown(0x10);
    const ctrl = global.isGameplayKeyDown(0x11);
    execChatBrowser('showChat()');
    if (shift) chatr.execute("chatOpenWithMode(1)");
    else if (ctrl) chatr.execute("chatOpenWithMode(7)");
    else chatr.execute("chatOpen()");
});

chatr.execute(`window.setToggleTimestamp && window.setToggleTimestamp(${!!mp.storage.data.timeStamp})`);
chatr.execute(`window.setToggleChat && window.setToggleChat(${!!mp.storage.data.toggleChat})`);
ensureChatSettings();
try { mp.storage.flush(); } catch (_e) {}
setTimeout(() => {
    pushChatSettingsToBrowser();
    applyChatVisibility();
}, 250);
setTimeout(() => {
    if (isPlayerInWorldForChat()) {
        chatHudAllowed = true;
        applyChatVisibility();
    }
}, 1200);
[2500, 5000, 8000].forEach((ms) => {
    setTimeout(() => {
        try {
            if (typeof global.__ensureWorldUiUnlockedIfReady === 'function') {
                global.__ensureWorldUiUnlockedIfReady();
            }
            if (isPlayerInWorldForChat()) {
                chatHudAllowed = true;
                applyChatVisibility();
            }
        } catch (_e) {}
    }, ms);
});

mp.events.add("hideChatServer", () => {
    chatServerForcedHidden = true;
    chatMenuAllowed = false;
    chatUiVisible = null;
    applyChatVisibility();
});

mp.events.add("showChatServer", () => {
    chatHudAllowed = true;
    chatMenuAllowed = true;
    chatServerForcedHidden = false;
    chatUiVisible = null;
    applyChatVisibility();
});

function hideChatCleint() {
    mp.events.callRemote("hideChatClient");
}

mp.players.local.lastMessage = new Date().getTime();
mp.events.add("setLastMessage", (ms) => {
    mp.players.local.lastMessage = ms + 350;
});

mp.events.add("server:clearChat", () => {
    chatr.execute("window.chatAPI && chatAPI.reset && chatAPI.reset();");
});

global.applyChatPresentation = function applyChatPresentation() {
    try {
        if (!mp.browsers.exists(global.chatr)) return;
        global.chatr.active = true;
        chatHudAllowed = true;
        chatUiVisible = null;
        if (isChatOverlayBlocked()) return;
        applyChatVisibility();
    } catch (_e) {}
};

global.shouldDisplayFlowChat = function shouldDisplayFlowChat() {
    return shouldChatBeVisible();
};

global.resetChatPresentationCache = function resetChatPresentationCache() {
    chatUiVisible = null;
};

global.enforceChatHiddenForOverlay = function enforceChatHiddenForOverlay() {
    try {
        global.__chatInputOpen = false;
        closeChatCompose();
        execChatBrowser('hideChat()');
    } catch (_e) {}
};

global.restoreChatAfterWorldEnter = function restoreChatAfterWorldEnter() {
    try {
        chatHudAllowed = true;
        chatServerForcedHidden = false;
        applyChatVisibility();
    } catch (_e) {}
};

global.openFlowChat = function openFlowChat() {
    try {
        if (isChatOverlayBlocked()) return;
        if (mp.storage.data.toggleChat === false) return;
        chatServerForcedHidden = false;
        chatMenuAllowed = true;
        syncChatChannelsToBrowser();
        pushAdminSuggestStateToChat();
        execChatBrowser('showChat()');
        chatr.execute("chatOpen()");
    } catch (_e) {}
};

global.openChatComposeFromClient = global.openFlowChat;
global.pushFlowChatLine = pushLineToChatBrowser;
global.sendMessageToChat = global.pushFlowChatLine;

try {
    chatr.active = true;
    chatr.orderId = 110;
} catch (_eOrd) {}

function refreshChatTopHudReserve() {
    /* Чат больше не сдвигается вниз во время капта/бизвара — всегда остаётся в одной позиции. */
}

global.refreshChatTopHudReserve = refreshChatTopHudReserve;

['inCapt', 'inBizwar'].forEach((key) => {
    mp.events.addDataHandler(key, (entity) => {
        try {
            if (entity !== mp.players.local) return;
            refreshChatTopHudReserve();
        } catch (_e) {}
    });
});

setTimeout(() => refreshChatTopHudReserve(), 1500);

mp.events.add('render',()=>{mp.gui.chat.show(false);});

mp.events.add('playerReady',()=>{mp.gui.chat.show(false);});
