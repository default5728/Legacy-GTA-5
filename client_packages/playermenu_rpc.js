/**
 * RPC-мост для Life5rp PlayerMenu (CEF ↔ client ↔ server).
 */
if (!global.rpc) {
    global.rpc = require('./rage-rpc.min.js');
}
const rpc = global.rpc;

const VK_NAMES = {
    0x71: 'F2', 0x72: 'F3', 0x73: 'F4', 0x74: 'F5', 0x75: 'F6', 0x76: 'F7',
    0x77: 'F8', 0x78: 'F9', 0x79: 'F10',
    0x08: 'BACKSPACE', 0x24: 'HOME', 0x25: '←', 0x26: '↑', 0x27: '→', 0x28: '↓',
    0x41: 'A', 0x49: 'I', 0x31: '1', 0x32: '2', 0x33: '3', 0x42: 'B', 0x4a: 'J', 0x4c: 'L', 0x5a: 'Z',
    0x09: 'TAB', 0x11: 'CTRL', 0x47: 'G', 0x01: 'ЛКМ', 0x02: 'ПКМ', 0x04: 'СКМ',
    0x05: 'M4', 0x06: 'M5'
};

function vkToName(vk) {
    const n = parseInt(vk, 10);
    if (!n || n <= 0) return '-';
    if (typeof global !== 'undefined' && typeof global.formatVkLabel === 'function') {
        return global.formatVkLabel(n);
    }
    return VK_NAMES[n] || ('0x' + n.toString(16).toUpperCase());
}

function getFlowSettings() {
    if (!mp.storage.data.settings) mp.storage.data.settings = {};
    return mp.storage.data.settings;
}

/** F10 «Управление»: action → keybinds.js / mp.storage.data.settings */
const BINDER_ACTION_MAP = {
    MENULIST_OPEN: { bindKey:'player_menu',storageKey:'player_menu_key',updateName:'player_menu' },
    CURSOR_TOGGLE: { bindKey:'cursor',storageKey:'cursor_key',updateName:'cursor' },
    INVENTORY_OPEN: { bindKey: 'inventory', storageKey: 'inventory_key', updateName: 'inventory' },
    HELPMENU_OPEN: { bindKey: 'report', storageKey: 'report_key', updateName: 'report' },
    SMARTPHONE_OPEN: { bindKey: 'phone', storageKey: 'phone_key', updateName: 'phone', allowZero: true },
    VEHICLE_ENGINE: { bindKey: 'engine', storageKey: 'engine_key', updateName: 'engine' },
    VEHICLE_LOCK: { bindKey: 'vehicle_lock', storageKey: 'vehicle_lock_key', updateName: 'vehicle_lock' },
    VEHICLE_SEATBELT: { bindKey: 'seatbelt', storageKey: 'seatbelt_key', updateName: 'seatbelt' },
    VOICE_CHAT_TOGGLE: { bindKey: 'voice_ptt', storageKey: 'voice_key', updateName: 'voice' },
    VOICE_CHAT_RELOAD: { bindKey: 'voice_reload', storageKey: 'voice_reload_key', updateName: 'voice_reload' },
    TOGGLE_CROUCH: { bindKey: 'crouch', storageKey: 'crouch_key', updateName: 'crouch' },
    TOGGLE_WHISTLE: { bindKey: 'whistle', storageKey: 'whistle_key', updateName: 'whistle' },
    BRAWL_VOICE: { bindKey: 'brawl_ptt', storageKey: 'brawl_voice_key', updateName: 'brawl_ptt', allowZero: true },
    BRAWL_MARKER: { bindKey: 'brawl_marker', storageKey: 'brawl_marker_key', updateName: 'brawl_marker', allowZero: true },
    FAST_ANIM_0: { bindKey: 'lie', storageKey: 'lie_key', updateName: 'lie' },
    FAST_ANIM_1: { bindKey: 'anim_slot_1', storageKey: 'anim_slot_1_key', updateName: 'anim_slot_1', allowZero: true },
    FAST_ANIM_2: { bindKey: 'anim_slot_2', storageKey: 'anim_slot_2_key', updateName: 'anim_slot_2', allowZero: true },
    FAST_ANIM_3: { bindKey: 'anim_slot_3', storageKey: 'anim_slot_3_key', updateName: 'anim_slot_3', allowZero: true },
    FAST_ANIM_4: { bindKey: 'anim_slot_4', storageKey: 'anim_slot_4_key', updateName: 'anim_slot_4', allowZero: true },
    FAST_ANIM_5: { bindKey: 'anim_slot_5', storageKey: 'anim_slot_5_key', updateName: 'anim_slot_5', allowZero: true },
    WEAPON_SLOT_0: { bindKey: 'fast_slot_1', storageKey: 'fast_slot_1_key', updateName: 'fast_slot_1' },
    WEAPON_SLOT_1: { bindKey: 'fast_slot_2', storageKey: 'fast_slot_2_key', updateName: 'fast_slot_2' },
    WEAPON_SLOT_2: { bindKey: 'fast_slot_3', storageKey: 'fast_slot_3_key', updateName: 'fast_slot_3' }
};

const BINDER_UI_DEFS = [
    {action:'MENULIST_OPEN',desc:'Меню игры'},
    {action:'CURSOR_TOGGLE',desc:'Курсор'},
    { action: 'INVENTORY_OPEN', desc: 'Инвентарь' },
    { action: 'FAST_ANIM_0', desc: 'Ползать (лежать)' },
    { action: 'TOGGLE_CROUCH', desc: 'Присесть' },
    { action: 'WEAPON_SLOT_0', desc: 'Быстрый слот 1' },
    { action: 'WEAPON_SLOT_1', desc: 'Быстрый слот 2' },
    { action: 'WEAPON_SLOT_2', desc: 'Быстрый слот 3' },
    { action: 'TOGGLE_WHISTLE', desc: 'Свист' },
    { action: 'VOICE_CHAT_TOGGLE', desc: 'Микрофон' },
    { action: 'VOICE_CHAT_RELOAD', desc: 'Перезагрузка голоса' },
    { action: 'BRAWL_VOICE', desc: 'Говорить в Brawl' },
    { action: 'BRAWL_MARKER', desc: 'Отметка в Brawl' },
    { action: 'SMARTPHONE_OPEN', desc: 'Телефон' },
    { action: 'VEHICLE_ENGINE', desc: 'Двигатель' },
    { action: 'VEHICLE_SEATBELT', desc: 'Ремень безопасности' },
    { action: 'VEHICLE_LOCK', desc: 'Закрыть / открыть авто' },
    { action: 'FAST_ANIM_1', desc: 'Анимация - слот 1' },
    { action: 'FAST_ANIM_2', desc: 'Анимация - слот 2' },
    { action: 'FAST_ANIM_3', desc: 'Анимация - слот 3' },
    { action: 'FAST_ANIM_4', desc: 'Анимация - слот 4' },
    { action: 'FAST_ANIM_5', desc: 'Анимация - слот 5' }
];

const BINDER_RESERVED_VK = {
    0x72: 'F3 (меню)'
};

const BINDER_DEFAULT_VK = {
    player_menu:121,cursor:113,
    inventory: 0x49,
    report: 0,
    phone: 0x26,
    engine: 0x32,
    vehicle_lock: 0x4c,
    seatbelt: 0x4a,
    voice_ptt: 0x42,
    voice_reload: 0x77,
    crouch: 0x11,
    whistle: 0x58,
    lie: 0x09,
    brawl_ptt: 0x48,
    brawl_marker: 0x04,
    fast_slot_1: 0x31,
    fast_slot_2: 0x32,
    fast_slot_3: 0x33,
    anim_slot_1: 0,
    anim_slot_2: 0,
    anim_slot_3: 0,
    anim_slot_4: 0,
    anim_slot_5: 0
};

function getKeybindSnapshotValue(bindKey) {
    const map = {
        engine: 'engine_key',
        voice_ptt: 'voice_key',
        voice_reload: 'voice_reload_key',
        seatbelt: 'seatbelt_key',
        vehicle_lock: 'vehicle_lock_key',
        whistle: 'whistle_key',
        lie: 'lie_key',
        crouch: 'crouch_key',
        inventory: 'inventory_key',player_menu:'player_menu_key',cursor:'cursor_key',
        report: 'report_key',
        fast_slot_1: 'fast_slot_1_key',
        fast_slot_2: 'fast_slot_2_key',
        fast_slot_3: 'fast_slot_3_key',
        phone: 'phone_key',
        brawl_ptt: 'brawl_voice_key',
        brawl_marker: 'brawl_marker_key',
        anim_slot_1: 'anim_slot_1_key',
        anim_slot_2: 'anim_slot_2_key',
        anim_slot_3: 'anim_slot_3_key',
        anim_slot_4: 'anim_slot_4_key',
        anim_slot_5: 'anim_slot_5_key'
    };
    const sk = map[bindKey];
    if (!sk) return NaN;
    const raw = getFlowSettings()[sk];
    if (raw === undefined || raw === null || raw === '') {
        return BINDER_DEFAULT_VK[bindKey] != null ? BINDER_DEFAULT_VK[bindKey] : NaN;
    }
    const n = typeof raw === 'string' && raw.trim().toLowerCase().startsWith('0x')
        ? parseInt(raw.trim(), 16)
        : parseInt(raw, 10);
    if ((bindKey === 'phone' || bindKey.indexOf('anim_slot_') === 0 || bindKey === 'brawl_ptt' || bindKey === 'brawl_marker')
        && (raw === 0 || raw === '0' || n === 0)) {
        return 0;
    }
    return isNaN(n) ? NaN : n;
}

function buildBinderData() {
    const rows = [];
    for (let i = 0; i < BINDER_UI_DEFS.length; i++) {
        const def = BINDER_UI_DEFS[i];
        if (def.fixedVk) {
            rows.push({
                action: def.action,
                desc: def.desc,
                key: def.fixedVk,
                keyName: vkToName(def.fixedVk),
                comb: {},
                readOnly: !!def.readOnly
            });
            continue;
        }
        if (def.readOnly && def.fixedLabel) {
            rows.push({
                action: def.action,
                desc: def.desc,
                key: -1,
                keyName: def.fixedLabel,
                comb: {},
                readOnly: true
            });
            continue;
        }

        const map = BINDER_ACTION_MAP[def.action];
        if (!map) continue;

        let vk = getKeybindSnapshotValue(map.bindKey);
        if (map.allowZero && (isNaN(vk) || vk === 0)) {
            rows.push({ action: def.action, desc: def.desc, key: -1, keyName: '-', comb: {} });
            continue;
        }
        if (isNaN(vk) || vk < 1) {
            rows.push({
                action: def.action,
                desc: def.desc,
                key: -1,
                keyName: '-',
                comb: {},
                index: rows.length
            });
            continue;
        }

        rows.push({
            action: def.action,
            desc: def.desc,
            key: vk,
            keyName: vkToName(vk),
            comb: {},
            index: rows.length
        });
    }
    for (let i = 0; i < rows.length; i++) rows[i].index = i;
    return rows;
}

function pushBinderDataToCef() {
    try {
        const br = global.__playermenuBr;
        if (!br || !mp.browsers.exists(br)) return;
        const payload = JSON.stringify(buildBinderData());
        br.execute(
            `(function(){try{` +
            `if(typeof palyerMainMenuMenu==='undefined'||!palyerMainMenuMenu.vue)return;` +
            `var v=palyerMainMenuMenu.vue;` +
            `v.binderData=${payload};` +
            `v.binderSelectKey=-1;` +
            `if(typeof window.refreshBinderKeyLabels==='function')window.refreshBinderKeyLabels(v);` +
            `if(typeof window.bloodSyncBinderGroups==='function')window.bloodSyncBinderGroups(v);` +
            `if(typeof window.bloodSyncBinderGroups==='function')window.bloodSyncBinderGroups(v);` +
            `}catch(_e){}})();`
        );
    } catch (_e) {}
}

function parseBinderComb(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(String(raw));
    } catch (_e) {
        return {};
    }
}

function saveBinderKey(action, vk, combRaw) {
    if (action === 'HELPMENU_OPEN') {
        mp.events.call('notify:client', 2, 'top-mid', 'Репорт открывается только командой /report в чате.', 3500);
        return false;
    }

    const map = BINDER_ACTION_MAP[action];
    if (!map) return false;

    const comb = parseBinderComb(combRaw);
    if (comb.shift || comb.ctrl || comb.alt) {
        mp.events.call('notify:client', 2, 'top-mid', 'Комбинации с Shift/Ctrl/Alt не поддерживаются — назначьте одну клавишу.', 3500);
        return false;
    }

    let code = Number(vk);
    // CEF MouseEvent.button uses 3/4 for the side buttons, while RAGE uses
    // VK_XBUTTON1/VK_XBUTTON2 (5/6) for mp.keys.isDown and gameplay binds.
    if (code === 3) code = 0x05;
    else if (code === 4) code = 0x06;
    if (map.allowZero && code === -1) code = 0;

    if (map.allowZero) {
        if (isNaN(code) || code < 0 || code > 255) {
            mp.events.call('notify:client', 2, 'top-mid', 'Некорректная клавиша.', 2500);
            return false;
        }
    } else if (code === -1) {
        mp.events.call('notify:client', 2, 'top-mid', 'Это действие нельзя отключить — выберите другую клавишу.', 3000);
        return false;
    } else if (isNaN(code) || code < 1 || code > 255) {
        mp.events.call('notify:client', 2, 'top-mid', 'Некорректная клавиша.', 2500);
        return false;
    }

    if (code !== 0 && BINDER_RESERVED_VK[code]) {
        mp.events.call('notify:client', 2, 'top-mid', 'Клавиша занята: ' + BINDER_RESERVED_VK[code] + '.', 3500);
        return false;
    }

    if (code !== 0 && typeof global.keybindConflictForSetting === 'function' && global.keybindConflictForSetting(code, map.storageKey)) {
        mp.events.call('notify:client', 2, 'top-mid', 'Эта клавиша уже занята другим действием.', 3000);
        return false;
    }

    if (!mp.storage.data.settings) mp.storage.data.settings = {};
    mp.storage.data.settings[map.storageKey] = code;
    mp.storage.flush();

    mp.events.call('updateKeybind', map.updateName, code);
    mp.events.call('notify:client', 3, 'top-mid', 'Клавиша сохранена: ' + (code === 0 ? 'выкл.' : vkToName(code)), 2200);
    return true;
}

function getFlowSettingsStorage() {
    if (!mp.storage.data.settings) mp.storage.data.settings = {};
    if (!mp.storage.data.chatSettings) mp.storage.data.chatSettings = {};
    const s = mp.storage.data.settings;
    const c = mp.storage.data.chatSettings;
    return {
        settings: {
            enableHelpBox: s.hud_hints !== false,
            enableQuestBox: s.quests !== false,
            enableTimerBox: true,
            enableNametags: s.names !== false,
            showUI: s.hud !== false,
            enableVoiceChat: s.voice !== false,
            hideChat: s.chat === false,
            hideDisconnectMarker: s.disconnect_marker !== true,
            hideMinimap: s.map === false,
            enableTargetMenuRender: s.target_hint !== false,
            hudVariant: s.hudVariant === 'new' ? 'new' : 'old',
            whistleVariant: s.whistleVariant === 'new' ? 'new' : 'old',
            enableLocalName: false,
            enableCenterInventory: !!s.enableCenterInventory,
            snow: !!s.snow,
            disableScreenEffect: false,
            disableDocumentPhoto: false,
            enableSpeedometer: s.ammo !== false,
            maxVolume3dSound: 100,
            speedometerColor: [255, 255, 255],
            speedometerBackgroundColor: [0, 0, 0]
        },
        chat: {
            height: Number(c.height) > 0 ? Number(c.height) : 195,
            lineHeight: Number(c.lineHeight) > 0 ? Number(c.lineHeight) : 24,
            fontSize: (function () {
                const f = Number(c.fontSize);
                if (!isFinite(f) || f <= 0) return 14;
                return f <= 3 ? Math.round(f * 16) : Math.round(f);
            })(),
            shadow: c.shadow !== false,
            timestamp: !!c.timestamp
        }
    };
}

function applyFlowInterfaceSettingsLive(s) {
    if (!s || typeof s !== 'object') return;
    try {
        if (s.enableHelpBox !== undefined) mp.events.call('saveSettings', 'hud_hints', !!s.enableHelpBox);
        if (s.enableQuestBox !== undefined) mp.events.call('saveSettings', 'quests', !!s.enableQuestBox);
        if (s.showUI !== undefined) mp.events.call('saveSettings', 'hud', !!s.showUI);
        if (s.enableNametags !== undefined) mp.events.call('saveSettings', 'names', !!s.enableNametags);
        if (s.enableVoiceChat !== undefined) mp.events.call('saveSettings', 'voice', !!s.enableVoiceChat);
        if (s.hideChat !== undefined) mp.events.call('saveSettings', 'chat', !s.hideChat);
        if (s.hideDisconnectMarker !== undefined) mp.events.call('saveSettings', 'disconnect_marker', !s.hideDisconnectMarker);
        if (s.hideMinimap !== undefined) mp.events.call('saveSettings', 'map', !s.hideMinimap);
        if (s.enableTargetMenuRender !== undefined) mp.events.call('saveSettings', 'target_hint', !!s.enableTargetMenuRender);
    } catch (_e) {}
}

function flushFlowSettingsStorage(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (!mp.storage.data.settings) mp.storage.data.settings = {};
    if (!mp.storage.data.chatSettings) mp.storage.data.chatSettings = {};
    const s = payload.settings || {};
    const c = payload.chat || {};
    const dst = mp.storage.data.settings;
    if (s.enableHelpBox !== undefined) dst.hud_hints = !!s.enableHelpBox;
    if (s.enableQuestBox !== undefined) dst.quests = !!s.enableQuestBox;
    if (s.showUI !== undefined) dst.hud = !!s.showUI;
    if (s.enableVoiceChat !== undefined) dst.voice = !!s.enableVoiceChat;
    if (s.hideChat !== undefined) dst.chat = !s.hideChat;
    if (s.hideDisconnectMarker !== undefined) dst.disconnect_marker = !s.hideDisconnectMarker;
    if (s.hideMinimap !== undefined) dst.map = !s.hideMinimap;
    if (s.enableTargetMenuRender !== undefined) dst.target_hint = !!s.enableTargetMenuRender;
    if (s.enableNametags !== undefined) dst.names = !!s.enableNametags;
    if (s.enableSpeedometer !== undefined) dst.ammo = !!s.enableSpeedometer;
    if (s.hudVariant !== undefined) dst.hudVariant = s.hudVariant === 'new' ? 'new' : 'old';
    if (s.whistleVariant !== undefined) dst.whistleVariant = s.whistleVariant === 'new' ? 'new' : 'old';
    if (s.enableCenterInventory !== undefined) dst.enableCenterInventory = !!s.enableCenterInventory;
    if (s.snow !== undefined) {
        dst.snow = !!s.snow;
        setFlowSnowEnabled(!!s.snow);
    }
    if (c.height !== undefined) mp.storage.data.chatSettings.height = c.height;
    if (c.lineHeight !== undefined) mp.storage.data.chatSettings.lineHeight = c.lineHeight;
    if (c.fontSize !== undefined) mp.storage.data.chatSettings.fontSize = c.fontSize;
    if (c.shadow !== undefined) mp.storage.data.chatSettings.shadow = c.shadow;
    if (c.timestamp !== undefined) mp.storage.data.chatSettings.timestamp = c.timestamp;
    mp.storage.flush();
    applyFlowInterfaceSettingsLive(s);
    try { mp.events.call('menuSettingsChanged'); } catch (_e) {}
}

function applyFlowKeyHintsSetting(hintsOn) {
    try {
        mp.events.call('saveSettings', 'hud_hints', !!hintsOn);
    } catch (_e) {
        try { mp.events.call('hudKeyHints', !!hintsOn); } catch (_e2) {}
    }
}

const FLOW_SNOW_WEATHER = 'Snow';
let flowSnowActive = false;
let flowSnowTimer = null;
let flowSnowPrevWeather = null;

function setFlowSnowEnabled(on) {
    try {
        on = !!on;
        if (on && !flowSnowActive) {
            try { flowSnowPrevWeather = mp.game.weather.getWeatherType(); } catch (_e) { flowSnowPrevWeather = null; }
            try { mp.game.weather.setWeatherTypeNow(FLOW_SNOW_WEATHER); } catch (_e) {}
            if (!flowSnowTimer) {
                flowSnowTimer = setInterval(() => {
                    try { mp.game.weather.setWeatherTypeNow(FLOW_SNOW_WEATHER); } catch (_e) {}
                }, 30000);
            }
            flowSnowActive = true;
        } else if (!on && flowSnowActive) {
            if (flowSnowTimer) {
                clearInterval(flowSnowTimer);
                flowSnowTimer = null;
            }
            if (flowSnowPrevWeather) {
                try { mp.game.weather.setWeatherTypeNow(flowSnowPrevWeather); } catch (_e) {}
                flowSnowPrevWeather = null;
            }
            flowSnowActive = false;
        }
    } catch (_e) {}
}

(function applyStoredSnowOnStart() {
    try {
        if (mp.storage.data.settings && mp.storage.data.settings.snow) {
            setFlowSnowEnabled(true);
        }
    } catch (_e) {}
})();

rpc.register('client_global_storage_get', () => getFlowSettingsStorage());
rpc.register('client_global_storage_flush', (payload) => {
    flushFlowSettingsStorage(payload);
    return true;
});

rpc.register('client_getGlobalValue', (key) => {
    const k = String(key || '');
    if (k === 'uiVisible') {
        try {
            const s = mp.storage.data && mp.storage.data.settings;
            return !s || s.hud !== false;
        } catch (_e) {
            return true;
        }
    }
    if (k === 'enable3dSound') return true;
    if (k === 'enableCompass') return false;
    if (k === 'targetMenuRender') {
        try {
            const s = mp.storage.data && mp.storage.data.settings;
            return !s || s.target_hint !== false;
        } catch (_e) {
            return true;
        }
    }
    if (k === 'isChatOpen') return !!mp.players.local.isTypingInTextChat;
    return null;
});

rpc.register('__client_voiceChat_getBlockList', () => {
    try {
        return mp.storage.data.voiceBlockList || '';
    } catch (_e) {
        return '';
    }
});

rpc.register('client_menu_playerMainMenu_getBinderData', () => buildBinderData());

/* client_hud_reticle_* — playermenu_reticle_rpc.js */

rpc.register('clientFunc_notifyError', (msg) => {
    try {
        mp.events.call('notify:client', 2, 'top-mid', String(msg || 'Ошибка'), 3500);
    } catch (_e) {}
    return true;
});
rpc.register('clientFunc_notifySuccess', (msg) => {
    try {
        mp.events.call('notify:client', 3, 'top-mid', String(msg || ''), 3000);
    } catch (_e) {}
    return true;
});
rpc.register('clientFunc_notify', (_type, msg) => {
    try {
        mp.events.call('notify:client', 1, 'top-mid', String(msg || ''), 3500);
    } catch (_e) {}
    return true;
});
rpc.register('client_setGlobalValue', (_pair) => true);

mp.events.add('__call_remote_event', (eventName, ...args) => {
    try {
        mp.events.callRemote(String(eventName || ''), ...args);
    } catch (e) {
        mp.console.logError('[PlayerMenu] remote: ' + e);
    }
});

mp.events.add('client.playermenu.promo.enter', (code) => {
    try { mp.events.callRemote('server.playermenu.promo.enter', String(code || '')); } catch (_e) {}
});
mp.events.add('bloodMenuPromoEnter', (code) => {
    try { mp.events.callRemote('server.playermenu.promo.enter', String(code || '')); } catch (_e) {}
});
mp.events.add('client.playermenu.report.send', (message) => {
    try { mp.events.callRemote('server.playermenu.report.send', String(message || '')); } catch (_e) {}
});
mp.events.add('bloodMenuReportCreate', (text) => {
    try { mp.events.callRemote('report:ui:create', String(text || '')); } catch (_e) {}
});
mp.events.add('bloodMenuReportSend', (text) => {
    try { mp.events.callRemote('report:ui:send', String(text || '')); } catch (_e) {}
});
mp.events.add('client.playermenu.bp.buy', (idOrIco, subIndex, price) => {
    try { mp.events.callRemote('server.playermenu.bp.buy', String(idOrIco || ''), Number(subIndex) || 0, Number(price) || 0); } catch (_e) {}
});
mp.events.add('client.playermenu.donate.buy', (price, code, extra) => {
    try {
        mp.events.callRemote('server.playermenu.donate.buy', Number(price) || 0, String(code || ''), String(extra || ''));
    } catch (_e) {}
});
mp.events.add('client.playermenu.gift.claim', (id) => {
    try { mp.events.callRemote('server.playermenu.gift.claim', Number(id) || 0); } catch (_e) {}
});
mp.events.add('client.playermenu.settings.save', (json) => {
    try { mp.events.callRemote('server.playermenu.settings.save', String(json || '{}')); } catch (_e) {}
});

mp.events.add('client_menuManager_taskClose', (menuName) => {
    if (String(menuName) !== 'playerMainMenu') return;
    if (typeof global.cleanupPlayerMenuCef === 'function') {
        global.cleanupPlayerMenuCef();
    }
    if (typeof global.closePlayerMenu === 'function') {
        global.closePlayerMenu({ skipCef: true });
    }
});

mp.events.add('flowPlayerMenuOpenWiki', () => {
    try {
        if (typeof global.closePlayerMenu === 'function') {
            global.closePlayerMenu({ force: true });
        }
    } catch (_eClose) {}
    try {
        mp.events.call('notify:client', 1, 'top-mid', 'Донат через сайт - flowdm.fun/donate', 5000);
    } catch (_e) {
        try {
            if (typeof global.phantomNotify === 'function') {
                global.phantomNotify('info', 'Информация', 'Донат через сайт - flowdm.fun/donate');
            }
        } catch (_e2) {}
    }
});

mp.events.add('__client_menu_playerMenu_uiUpdate', (enableHelpBox, showUI) => {
    if (!mp.storage.data.settings) mp.storage.data.settings = {};
    if (enableHelpBox != null) {
        const hintsOn = !!enableHelpBox;
        mp.storage.data.settings.hud_hints = hintsOn;
        applyFlowKeyHintsSetting(hintsOn);
    }
    if (showUI != null) {
        mp.storage.data.settings.hud = !!showUI;
        try { mp.events.call('saveSettings', 'hud', !!showUI); } catch (_e) {}
    }
    mp.storage.flush();
});

mp.events.add('__client_menu_playerMenu_binderUpdate', (action, vk, combJson) => {
    try {
        saveBinderKey(String(action || ''), vk, combJson);
        /* Всегда синхронизируем CEF со storage (успех и ошибка/конфликт) */
        pushBinderDataToCef();
    } catch (_e) {
        try { pushBinderDataToCef(); } catch (_e2) {}
    }
});

mp.events.add('__client_menu_playerMenu_report', (name, text) => {
    try {
        if (typeof global.pushFlowChatLine === 'function') {
            global.pushFlowChatLine(`!{EE2B4C}[Ответ] !{C9BE3C}[A]${name}: !{FFFFFF} ${text}`);
        } else {
            mp.events.call('chat:pushLine', `!{EE2B4C}[Ответ] !{C9BE3C}[A]${name}: !{FFFFFF} ${text}`);
        }
    } catch (_e) {}
});

mp.events.add('__client_voiceChat_setBlockList', (list) => {
    mp.storage.data.voiceBlockList = String(list || '');
    mp.storage.flush();
});

mp.events.add('clientFunc_setWaypoint', (x, y) => {
    try {
        mp.game.ui.setNewWaypoint(Number(x), Number(y));
    } catch (_e) {}
});

// client_hud_reticle_set_test живёт в playermenu_reticle.js — пустой stub здесь убивал превью

