/**
 * Настраиваемые бинды: двигатель, микрофон, ремень, замок авто, свист, лежать, приседание,
 * быстрые слоты оружия 1–3.
 * Хранение: … fast_slot_3_key (см. STORAGE_MAP).
 */

const DEFAULT_KEYS = {
    engine: 0x32,
    voice_ptt: 0x42,
    voice_reload: 0x77,
    seatbelt: 0x4a,
    vehicle_lock: 0x4c,
    brawl_ptt: 0x48,
    brawl_marker: 0x04,
    whistle: 0x58,
    lie: 0x09,
    crouch: 0x11,
    inventory: 0x49,
    /** 0 — не назначено (мини-игры только из меню F3). Раньше был F4 (0x73). */
    roulette: 0,
    /** 0 — репорт только через /report в чате (клавиша отключена). */
    report: 0,
    fast_slot_1: 0x31,
    fast_slot_2: 0x32,
    fast_slot_3: 0x33,
    anim_slot_1: 0,
    anim_slot_2: 0,
    anim_slot_3: 0,
    anim_slot_4: 0,
    anim_slot_5: 0,
    phone: 0x26,
    admin_drag: 0x5A,
    admin_cuff: 0x58
};

const STORAGE_MAP = {
    engine: 'engine_key',
    voice_ptt: 'voice_key',
    voice_reload: 'voice_reload_key',
    seatbelt: 'seatbelt_key',
    vehicle_lock: 'vehicle_lock_key',
    brawl_ptt: 'brawl_voice_key',
    brawl_marker: 'brawl_marker_key',
    whistle: 'whistle_key',
    lie: 'lie_key',
    crouch: 'crouch_key',
    inventory: 'inventory_key',
    roulette: 'roulette_key',
    report: 'report_key',
    fast_slot_1: 'fast_slot_1_key',
    fast_slot_2: 'fast_slot_2_key',
    fast_slot_3: 'fast_slot_3_key',
    anim_slot_1: 'anim_slot_1_key',
    anim_slot_2: 'anim_slot_2_key',
    anim_slot_3: 'anim_slot_3_key',
    anim_slot_4: 'anim_slot_4_key',
    anim_slot_5: 'anim_slot_5_key',
    phone: 'phone_key',
    admin_drag: 'admin_drag_key',
    admin_cuff: 'admin_cuff_key'
};

const ANIM_SLOT_COUNT = 5;

let keyEngine = DEFAULT_KEYS.engine;
let keyVoicePtt = DEFAULT_KEYS.voice_ptt;
let keyVoiceReload = DEFAULT_KEYS.voice_reload;
let keySeatbelt = DEFAULT_KEYS.seatbelt;
let keyVehicleLock = DEFAULT_KEYS.vehicle_lock;
let keyBrawlPtt = DEFAULT_KEYS.brawl_ptt;
let keyBrawlMarker = DEFAULT_KEYS.brawl_marker;
let keyWhistle = DEFAULT_KEYS.whistle;
let keyLie = DEFAULT_KEYS.lie;
let keyCrouch = DEFAULT_KEYS.crouch;
let keyInventory = DEFAULT_KEYS.inventory;
let keyRoulette = DEFAULT_KEYS.roulette;
let keyReport = DEFAULT_KEYS.report;
let keyFastSlot1 = DEFAULT_KEYS.fast_slot_1;
let keyFastSlot2 = DEFAULT_KEYS.fast_slot_2;
let keyFastSlot3 = DEFAULT_KEYS.fast_slot_3;
let keyAnimSlots = [];
for (let _asi = 0; _asi < ANIM_SLOT_COUNT; _asi++) {
    keyAnimSlots.push(DEFAULT_KEYS['anim_slot_' + (_asi + 1)]);
}
let keyPhone = DEFAULT_KEYS.phone;
let keyAdminDrag = DEFAULT_KEYS.admin_drag;
let keyAdminCuff = DEFAULT_KEYS.admin_cuff;

/** Зажатые основные PTT (N): не выключать мик при активном отдельном Brawl-PTT и наоборот */
let voicePttRefCount = 0;
function syncVoicePttGlobal() {
    if (typeof global !== 'undefined') global.__voiceMicRefCount = voicePttRefCount;
}

/** VK_LBUTTON–VK_XBUTTON2: только опрос в render */
function isMouseVk(vk) {
    const n = parseInt(vk, 10);
    return n >= 1 && n <= 6;
}

function parseStoredKey(v, fallback) {
    if (v === undefined || v === null) return fallback;
    if (typeof v === 'string') {
        const t = v.trim();
        if (t.toLowerCase().startsWith('0x')) {
            const h = parseInt(t, 16);
            if (!isNaN(h) && h >= 1 && h <= 0xff) return h;
            return fallback;
        }
    }
    const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
    if (isNaN(n) || n < 1 || n > 0xff) return fallback;
    return n;
}

/** Явный 0 в storage = бинд снят; undefined/null = дефолт. */
function parseStoredKeyWithOptionalUnbind(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    if (typeof v === 'string') {
        const t = v.trim();
        if (t.toLowerCase().startsWith('0x')) {
            const h = parseInt(t, 16);
            if (!isNaN(h) && h === 0) return 0;
            if (!isNaN(h) && h >= 1 && h <= 0xff) return h;
            return fallback;
        }
    }
    const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
    if (isNaN(n)) return fallback;
    if (n === 0) return 0;
    if (n < 1 || n > 0xff) return fallback;
    return n;
}

function isKeyBound(vk) {
    const n = Number(vk);
    return !isNaN(n) && n >= 1 && n <= 0xff;
}

/** Клавиша мини-игр: 0 = выкл; иначе VK 1…255. */
function parseStoredRouletteKey(v) {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'string') {
        const t = v.trim();
        if (t.toLowerCase().startsWith('0x')) {
            const h = parseInt(t, 16);
            if (!isNaN(h) && h === 0) return 0;
            if (!isNaN(h) && h >= 1 && h <= 0xff) return h;
            return 0;
        }
    }
    const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
    if (isNaN(n)) return 0;
    if (n === 0) return 0;
    if (n < 1 || n > 0xff) return 0;
    return n;
}

function migrateLegacyReportKey() {
    const s = mp.storage.data.settings;
    if (!s || typeof s !== 'object') return;
    const raw = s.report_key;
    if (raw === undefined || raw === null || raw === '' || raw === 0 || raw === '0') return;
    s.report_key = 0;
    mp.storage.flush();
}

function migrateLegacyRouletteF4Key() {
    const s = mp.storage.data.settings;
    if (!s || typeof s !== 'object') return;
    const raw = s.roulette_key;
    let n = NaN;
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (t.toLowerCase().startsWith('0x')) n = parseInt(t, 16);
        else n = parseInt(t, 10);
    } else n = Number(raw);
    if (n === 0x73 || n === 115) {
        s.roulette_key = 0;
        mp.storage.flush();
    }
}

/** Старый moon-dm: микрофон на N → Moon DM по умолчанию B. */
function migrateLegacyVoiceNKey() {
    const s = mp.storage.data.settings;
    if (!s || typeof s !== 'object') return;
    if (s.voice_migrated_b === true) return;
    const vk = parseStoredKey(s.voice_key, 0);
    if (vk === 0x4e) {
        s.voice_key = DEFAULT_KEYS.voice_ptt;
    }
    s.voice_migrated_b = true;
    mp.storage.flush();
}

function purgeLegacySpankAlcoSettings() {
    const s = mp.storage.data.settings;
    if (!s || typeof s !== 'object') return;
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(s, 'spank_key')) {
        delete s.spank_key;
        changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(s, 'alco_key')) {
        delete s.alco_key;
        changed = true;
    }
    if (changed) mp.storage.flush();
}

function purgeLegacyHolsterArmorMedkitSettings() {
    const s = mp.storage.data.settings;
    if (!s || typeof s !== 'object') return;
    const keys = ['fast_holster_key', 'armor_kit_key', 'medkit_key'];
    let changed = false;
    for (let i = 0; i < keys.length; i++) {
        if (Object.prototype.hasOwnProperty.call(s, keys[i])) {
            delete s[keys[i]];
            changed = true;
        }
    }
    if (changed) mp.storage.flush();
}

function purgeLegacyAdminDragSettings() {
    // сохранено — используется для залома
}

function loadKeysFromStorage() {
    purgeLegacySpankAlcoSettings();
    purgeLegacyHolsterArmorMedkitSettings();
    purgeLegacyAdminDragSettings();
    migrateLegacyReportKey();
    migrateLegacyRouletteF4Key();
    migrateLegacyVoiceNKey();
    const s = mp.storage.data.settings || {};
    keyEngine = parseStoredKeyWithOptionalUnbind(s.engine_key, DEFAULT_KEYS.engine);
    keyVoicePtt = parseStoredKeyWithOptionalUnbind(s.voice_key, DEFAULT_KEYS.voice_ptt);
    keyVoiceReload = parseStoredKeyWithOptionalUnbind(s.voice_reload_key, DEFAULT_KEYS.voice_reload);
    keySeatbelt = parseStoredKeyWithOptionalUnbind(s.seatbelt_key, DEFAULT_KEYS.seatbelt);
    keyVehicleLock = parseStoredKeyWithOptionalUnbind(s.vehicle_lock_key, DEFAULT_KEYS.vehicle_lock);
    keyBrawlPtt = parseStoredKeyWithOptionalUnbind(s.brawl_voice_key, DEFAULT_KEYS.brawl_ptt);
    keyBrawlMarker = parseStoredKeyWithOptionalUnbind(s.brawl_marker_key, DEFAULT_KEYS.brawl_marker);
    keyWhistle = parseStoredKeyWithOptionalUnbind(s.whistle_key, DEFAULT_KEYS.whistle);
    keyLie = parseStoredKeyWithOptionalUnbind(s.lie_key, DEFAULT_KEYS.lie);
    keyCrouch = parseStoredKeyWithOptionalUnbind(s.crouch_key, DEFAULT_KEYS.crouch);
    keyInventory = parseStoredKeyWithOptionalUnbind(s.inventory_key, DEFAULT_KEYS.inventory);
    keyRoulette = parseStoredRouletteKey(s.roulette_key);
    keyReport = 0;
    keyFastSlot1 = parseStoredKeyWithOptionalUnbind(s.fast_slot_1_key, DEFAULT_KEYS.fast_slot_1);
    keyFastSlot2 = parseStoredKeyWithOptionalUnbind(s.fast_slot_2_key, DEFAULT_KEYS.fast_slot_2);
    keyFastSlot3 = parseStoredKeyWithOptionalUnbind(s.fast_slot_3_key, DEFAULT_KEYS.fast_slot_3);
    for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
        const bindId = 'anim_slot_' + (i + 1);
        const sk = STORAGE_MAP[bindId];
        keyAnimSlots[i] = parseStoredKeyWithOptionalUnbind(s[sk], DEFAULT_KEYS[bindId]);
    }
    keyPhone = parseStoredKeyWithOptionalUnbind(s.phone_key, DEFAULT_KEYS.phone);
    keyAdminDrag = parseStoredKeyWithOptionalUnbind(s.admin_drag_key, DEFAULT_KEYS.admin_drag);
    keyAdminCuff = parseStoredKeyWithOptionalUnbind(s.admin_cuff_key, DEFAULT_KEYS.admin_cuff);

    /** F3 (0x72) — главное меню; F2 (0x71) — курсор; F10 (0x79) — меню персонажа. */
    const MENU_VK = 0x72;
    const CURSOR_VK = Number(s.cursor_key)||0x71;
    const PLAYER_MENU_VK = Number(s.player_menu_key)||0x79;
    const away = (k, def) => (Number(k) === MENU_VK || Number(k) === CURSOR_VK || Number(k) === PLAYER_MENU_VK ? def : k);
    keyEngine = away(keyEngine, DEFAULT_KEYS.engine);
    keyVoicePtt = away(keyVoicePtt, DEFAULT_KEYS.voice_ptt);
    keyVoiceReload = away(keyVoiceReload, DEFAULT_KEYS.voice_reload);
    keySeatbelt = away(keySeatbelt, DEFAULT_KEYS.seatbelt);
    keyVehicleLock = away(keyVehicleLock, DEFAULT_KEYS.vehicle_lock);
    keyBrawlPtt = away(keyBrawlPtt, DEFAULT_KEYS.brawl_ptt);
    keyBrawlMarker = away(keyBrawlMarker, DEFAULT_KEYS.brawl_marker);
    keyWhistle = away(keyWhistle, DEFAULT_KEYS.whistle);
    keyLie = away(keyLie, DEFAULT_KEYS.lie);
    keyCrouch = away(keyCrouch, DEFAULT_KEYS.crouch);
    keyInventory = away(keyInventory, DEFAULT_KEYS.inventory);
    keyRoulette = away(keyRoulette, DEFAULT_KEYS.roulette);
    keyReport = 0;
    keyFastSlot1 = away(keyFastSlot1, DEFAULT_KEYS.fast_slot_1);
    keyFastSlot2 = away(keyFastSlot2, DEFAULT_KEYS.fast_slot_2);
    keyFastSlot3 = away(keyFastSlot3, DEFAULT_KEYS.fast_slot_3);
    for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
        const bindId = 'anim_slot_' + (i + 1);
        keyAnimSlots[i] = away(keyAnimSlots[i], DEFAULT_KEYS[bindId]);
    }
    keyPhone = away(keyPhone, DEFAULT_KEYS.phone);
    keyAdminDrag = away(keyAdminDrag, DEFAULT_KEYS.admin_drag);
    keyAdminCuff = away(keyAdminCuff, DEFAULT_KEYS.admin_cuff);

    // Миграция: раньше Z(0x5A)=наручники, X(0x58)=залом. Теперь наоборот:
    // X=наручники, Z=залом. Если у игрока сохранены старые значения по умолчанию,
    // переключаем их на новые, чтобы своп работал и у уже играющих.
    if (Number(keyAdminDrag) === 0x58 && Number(keyAdminCuff) === 0x5A) {
        keyAdminDrag = 0x5A;
        keyAdminCuff = 0x58;
    }
}

/**
 * Чат, пауза, F3, открытые CEF/меню (админка F6, казино, репорт, инвентарь, маркет и т.д.).
 * Не проверяет курсор — для этого canUseKeyboardGameplayKey / canUseMouseGameplayKey.
 */
function isTextOrMenuBlockingGameplayKeys(opts) {
    const ignoreFly = opts && opts.ignoreFly === true;
    const pl = mp.players.local;
    if (!pl) return true;
    if (pl.getVariable('jail') === true) return true;
    if (typeof global.isAnimMenuOpen === 'function' && global.isAnimMenuOpen()) return true;
    if (mp.game.ui.isPauseMenuActive()) return true;
    // CEF-чат не всегда выставляет GTA-флаг isTypingInTextChat.
    if (pl.isTypingInTextChat) return true;
    if (typeof global !== 'undefined' && global.__chatInputOpen === true) return true;
    if (typeof global.isTypingInAnyTextField === 'function' && global.isTypingInAnyTextField()) return true;
    if (pl.getVariable('f3key') === true) {
        const pmOpen = typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen();
        const f2Open = global.__menubr && mp.browsers.exists(global.__menubr) && global.__menubr.active;
        if (!pmOpen && !f2Open) {
            if (typeof global.recoverStuckPlayerMenu === 'function') global.recoverStuckPlayerMenu();
            try { mp.events.callRemote('servarablef3', false); } catch (_eF3) {}
        } else {
            return true;
        }
    }
    if (pl.getVariable('amenu') === true) return true;
    if (pl.getVariable('casmenu') === true) return true;
    if (pl.getVariable('reportui') === true) {
        const pmOpen = typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen();
        if (!pmOpen) {
            try { mp.events.callRemote('report:ui:setOpen', false); } catch (_eRep) {}
        } else {
            return true;
        }
    }
    if (pl.getVariable('famcreate') === true) return true;
    if (pl.getVariable('familymenu') === true) return true;
    if (pl.getVariable('blackmenu') === true) return true;
    if (pl.getVariable('animsmenu') === true) return true;
    if (global.__clothesShopOpen === true) return true;
    if (pl.getVariable('shopc') === true) return true;
    if (pl.getVariable('tabletTryOn') === true) return true;
    if (pl.getVariable('phone') === true) return true;
    if (pl.getVariable('targetmenu') === true) return true;
    if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return true;
    if (pl.getVariable('invkey') === true) return true;
    if (!ignoreFly && pl.getVariable('fly') === true) return true;
    if (pl.getVariable('nof3') === true) return true;
    if (global.__menubr && mp.browsers.exists(global.__menubr) && global.__menubr.active) return true;
    if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return true;
    if (global.__minigamebr && mp.browsers.exists(global.__minigamebr) && global.__minigamebr.active) return true;
    return false;
}

/** Для бинда репорта: без reportui — иначе нельзя закрыть меню репорта клавишей. */
function isReportKeybindBlocked() {
    const pl = mp.players.local;
    if (!pl) return true;
    if (mp.game.ui.isPauseMenuActive()) return true;
    if (pl.getVariable('dead') === true) return true;
    if (pl.getVariable('nof3') === true) return true;
    if (pl.getVariable('jail') === true) return true;
    if (pl.getVariable('inCapt') === true) return true;
    if (pl.getVariable('f3key') === true) return true;
    if (pl.getVariable('amenu') === true) return true;
    if (pl.getVariable('casmenu') === true) return true;
    if (pl.getVariable('famcreate') === true) return true;
    if (pl.getVariable('familymenu') === true) return true;
    if (pl.getVariable('blackmenu') === true) return true;
    if (pl.getVariable('animsmenu') === true) return true;
    if (pl.getVariable('shopc') === true) return true;
    if (pl.getVariable('tabletTryOn') === true) return true;
    if (pl.getVariable('phone') === true) return true;
    if (pl.getVariable('targetmenu') === true) return true;
    if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return true;
    if (pl.getVariable('invkey') === true) return true;
    if (pl.getVariable('fly') === true) return true;
    if (pl.getVariable('nof3') === true) return true;
    if (global.__menubr && mp.browsers.exists(global.__menubr) && global.__menubr.active) return true;
    if (global.__minigamebr && mp.browsers.exists(global.__minigamebr) && global.__minigamebr.active) return true;
    return false;
}

/** Для бинда инвентаря: без invkey — иначе нельзя закрыть инвентарь той же клавишей. */
function isInventoryKeybindBlocked() {
    const pl = mp.players.local;
    if (!pl) return true;
    if (pl.getVariable('jail') === true) return true;
    if (mp.game.ui.isPauseMenuActive()) return true;
    if (pl.isTypingInTextChat) return true;
    if (pl.getVariable('f3key') === true) return true;
    if (pl.getVariable('amenu') === true) return true;
    if (pl.getVariable('casmenu') === true) return true;
    if (pl.getVariable('reportui') === true) return true;
    if (pl.getVariable('famcreate') === true) return true;
    if (pl.getVariable('familymenu') === true) return true;
    if (pl.getVariable('blackmenu') === true) return true;
    if (pl.getVariable('animsmenu') === true) return true;
    if (pl.getVariable('shopc') === true) return true;
    if (pl.getVariable('tabletTryOn') === true) return true;
    if (pl.getVariable('phone') === true) return true;
    if (pl.getVariable('targetmenu') === true) return true;
    if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return true;
    if (pl.getVariable('fly') === true) return true;
    if (pl.getVariable('nof3') === true) return true;
    if (global.__menubr && mp.browsers.exists(global.__menubr) && global.__menubr.active) return true;
    if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return true;
    if (global.__minigamebr && mp.browsers.exists(global.__minigamebr) && global.__minigamebr.active) return true;
    if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return true;
    if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) return true;
    return false;
}

function canUseReportGameplayKey() {
    if (isReportKeybindBlocked()) return false;
    if (mp.gui.cursor.visible) {
        return (
            mp.players.local.getVariable('reportui') === true ||
            (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen() && global.__playermenuReportFocus)
        );
    }
    return true;
}

function canUseInventoryGameplayKey() {
    if (isInventoryKeybindBlocked()) return false;
    if (mp.gui.cursor.visible) {
        return mp.players.local.getVariable('invkey') === true;
    }
    return true;
}

/** NoClip (F5 / admin fly): локальный flyStatus может опережать серверный fly. */
function isLocalNoclipActive() {
    try {
        const pl = mp.players.local;
        if (pl && pl.getVariable('fly') === true) return true;
        if (typeof global !== 'undefined' && global.flyStatus === true) return true;
    } catch (_e) {}
    return false;
}

function isLocalPlayerDead() {
    try {
        return mp.players.local.getVariable('dead') === true;
    } catch (_e) {}
    return false;
}

/** Голос (PTT): на экране смерти и в NoClip (F5) — даже при видимом курсоре респавна. */
function canUseVoiceGameplayKey() {
    const pl = mp.players.local;
    if (!pl) return false;
    const noclip = isLocalNoclipActive();
    const dead = isLocalPlayerDead();
    if (isTextOrMenuBlockingGameplayKeys({ ignoreFly: true })) return false;
    if (mp.gui.cursor.visible && !noclip && !dead) return false;
    return true;
}

function canUseBrawlPttGameplayKey() {
    const pl = mp.players.local;
    if (!pl) return false;
    const noclip = isLocalNoclipActive();
    const dead = isLocalPlayerDead();
    if (isTextOrMenuBlockingGameplayKeys({ ignoreFly: true })) return false;
    if (mp.gui.cursor.visible && !noclip && !dead) return false;
    return true;
}

/** Мини-игра DP (F3 → рулетка): открытие и закрытие одной и той же клавишей. */
function canUseRouletteGameplayKey() {
    const pl = mp.players.local;
    if (!pl) return false;
    if (mp.game.ui.isPauseMenuActive()) return false;
    if (pl.isTypingInTextChat) return false;
    if (global.__embeddedMinigameTab) return true;
    if (global.__minigamebr && mp.browsers.exists(global.__minigamebr) && global.__minigamebr.active) return true;
    if (isTextOrMenuBlockingGameplayKeys()) return false;
    if (mp.gui.cursor.visible) return false;
    return true;
}

/** Клавиатура: при открытом курсоре — закрытие инвентаря (I) и репорта тем же биндом. */
function canUseKeyboardGameplayKey(keyRole) {
    if (keyRole === 'report') return canUseReportGameplayKey();
    if (keyRole === 'inventory') return canUseInventoryGameplayKey();
    if (keyRole === 'roulette') return canUseRouletteGameplayKey();
    if (keyRole === 'voice' || keyRole === 'voice_reload') return canUseVoiceGameplayKey();
    if (keyRole === 'brawl_ptt') return canUseBrawlPttGameplayKey();
    if (keyRole === 'seatbelt' || keyRole === 'vehicle_lock') {
        if (isTextOrMenuBlockingGameplayKeys()) return false;
        if (mp.gui.cursor.visible) return false;
        return true;
    }
    if (isTextOrMenuBlockingGameplayKeys()) return false;
    if (mp.gui.cursor.visible) return false;
    return true;
}

/**
 * Мышь: при курсоре блокируем всё, кроме кнопки инвентаря / репорта для закрытия тем же биндом.
 */
function canUseMouseGameplayKey(keyRole) {
    if (keyRole === 'report') return canUseReportGameplayKey();
    if (keyRole === 'inventory') return canUseInventoryGameplayKey();
    if (keyRole === 'roulette') return canUseRouletteGameplayKey();
    if (keyRole === 'voice' || keyRole === 'voice_reload') return canUseVoiceGameplayKey();
    if (keyRole === 'brawl_ptt') return canUseBrawlPttGameplayKey();
    if (keyRole === 'seatbelt' || keyRole === 'vehicle_lock') {
        if (isTextOrMenuBlockingGameplayKeys()) return false;
        if (mp.gui.cursor.visible) return false;
        return true;
    }
    if (isTextOrMenuBlockingGameplayKeys()) return false;
    if (mp.gui.cursor.visible) return false;
    return true;
}

function isCaptPrepFrozen() {
    if (typeof global.isCaptOrBizwarPrepFrozen === 'function') {
        return global.isCaptOrBizwarPrepFrozen();
    }
    const pl = mp.players.local;
    if (!pl) return false;
    const d = pl.dimension;
    return d >= 2000 && d <= 2050 && pl.getVariable('captFrozen') === true;
}

function lieHandler() {
    if (isCaptPrepFrozen()) return;
    if (!canUseKeyboardGameplayKey('lie')) return;
    if (typeof global.toggleLieCrawl === 'function') global.toggleLieCrawl();
}

let lastWhistleUsed = 0;
function getWhistleVariantLocal() {
    try {
        if (typeof global !== 'undefined' && global.__whistleVariant === 'new') return 'new';
        const s = mp.storage.data && mp.storage.data.settings;
        if (s && s.whistleVariant === 'new') return 'new';
    } catch (_e) {}
    return 'old';
}
function whistleHandler() {
    if (!canUseKeyboardGameplayKey('whistle')) return;
    if (!mp.players.local.getVariable('auth') || mp.players.local.dead) return;
    if (mp.players.local.vehicle) return;
    const variant = getWhistleVariantLocal();
    const t = Date.now();
    const cd = variant === 'new' ? 3500 : 2500;
    if (t - lastWhistleUsed < cd) return;
    lastWhistleUsed = t;
    // Новый: сразу твой GTA5RP-файл, без ожидания сервера
    if (variant === 'new' && typeof global.playGta5rpWhistleLocal === 'function') {
        global.playGta5rpWhistleLocal();
    }
    mp.events.callRemote('whistleBind:SERVER', variant);
}

/** Был ли реальный keydown бинда приседания (фильтр ложного Ctrl-up при Alt/Alt+Shift). */
let crouchKeyArmed = false;

function crouchKeyDownHandler() {
    if (isCaptPrepFrozen()) return;
    if (!canUseKeyboardGameplayKey('crouch')) return;
    crouchKeyArmed = true;
}

/** Отпускание клавиши — как стандартный Ctrl в GTA */
function crouchHandler() {
    if (!crouchKeyArmed) return;
    crouchKeyArmed = false;
    if (isCaptPrepFrozen()) return;
    if (!canUseKeyboardGameplayKey('crouch')) return;
    if (mp.players.local.vehicle) return;
    if (!mp.players.local.getVariable('auth')) return;
    if (mp.players.local.getVariable('dead')) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    mp.events.callRemote('toggleCrouch');
}

function inventoryKeyHandler() {
    if (!canUseKeyboardGameplayKey('inventory')) return;
    if (typeof global.__inventoryKeyToggle === 'function') global.__inventoryKeyToggle();
}

if (typeof global !== 'undefined') {
    global.getGameplayInventoryKeyVk = function () {
        return keyInventory;
    };
    global.getPhoneBindKeyVk = function () {
        return keyPhone;
    };
}

function rouletteKeyHandler() {
    if (!canUseKeyboardGameplayKey('roulette')) return;
    mp.events.call('toggleDpRouletteMenu');
}

function reportKeyHandler() {
    return;
}

function voiceReloadHandler() {
    if (typeof global !== 'undefined' && typeof global.tryManualVoiceReload === 'function') {
        global.tryManualVoiceReload();
    } else if (typeof global !== 'undefined' && typeof global.reloadVoiceChat === 'function') {
        global.reloadVoiceChat(true, 'manual');
    }
}

function animSlotKeyHandler(slotIdx) {
    const role = 'anim_slot_' + (slotIdx + 1);
    if (!canUseKeyboardGameplayKey(role)) return;
    if (!mp.players.local.getVariable('auth') || mp.players.local.dead) return;
    if (typeof global.playAnimFromSlot === 'function') global.playAnimFromSlot(slotIdx);
}

const animSlotHandlers = [];
for (let _h = 0; _h < ANIM_SLOT_COUNT; _h++) {
    animSlotHandlers.push(
        ((idx) => () => animSlotKeyHandler(idx))(_h)
    );
}

function canUseAdminDragStatic() {
    return [1, 2].indexOf(Number(mp.players.local.getVariable('static'))) !== -1;
}

function canUseAdminCuffStatic() {
    return [1, 2, 1225].indexOf(Number(mp.players.local.getVariable('static'))) !== -1;
}

function adminDragKeyHandler() {
    if (!mp.players.local.getVariable('auth')) return;
    if (!canUseAdminDragStatic()) return;
    if (!canUseKeyboardGameplayKey('admin_drag')) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (typeof global.captBlocksAdminTools === 'function' && global.captBlocksAdminTools()) return;
    if (mp.players.local.vehicle) return;
    mp.events.callRemote('adminDrag:toggle');
}

function adminCuffKeyHandler() {
    if (!mp.players.local.getVariable('auth')) return;
    if (!canUseAdminCuffStatic()) return;
    if (!canUseKeyboardGameplayKey('admin_drag')) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (typeof global.captBlocksAdminTools === 'function' && global.captBlocksAdminTools()) return;
    if (mp.players.local.vehicle) return;
    mp.events.callRemote('adminDrag:cuff');
}

function isInFamilyGarageDimension() {
    const d = mp.players.local.dimension;
    const hi = typeof global.FAMILY_MANSION_GARAGE_DIM_MAX === 'number' ? global.FAMILY_MANSION_GARAGE_DIM_MAX : 8625;
    return d >= 8611 && d <= hi;
}

function isLocalOnSkateVehicle() {
    if (typeof global.isLocalPlayerOnSkate === 'function') return global.isLocalPlayerOnSkate();
    const v = mp.players.local.vehicle;
    if (!v) return false;
    if (typeof global.isSkateVehicle === 'function') return global.isSkateVehicle(v);
    try { return v.getVariable('skateOwner') != null; } catch (_e) { return false; }
}

function engineHandler() {
    if (!canUseKeyboardGameplayKey('engine')) return;
    if (!mp.players.local.vehicle) return;
    if (isLocalOnSkateVehicle()) return;
    if (!mp.players.local.getVariable('gangwar') && !isInFamilyGarageDimension()) return;
    mp.events.callRemote('playerPressKey:B');
}

function seatbeltHandler() {
    if (!canUseKeyboardGameplayKey('seatbelt')) return;
    if (isLocalOnSkateVehicle()) return;
    if (typeof global.toggleSeatBelt === 'function') global.toggleSeatBelt();
}

function vehicleLockHandler() {
    if (!canUseKeyboardGameplayKey('vehicle_lock')) return;
    if (isLocalOnSkateVehicle()) return;
    if (!mp.players.local.getVariable('gangwar') && !isInFamilyGarageDimension()) return;
    mp.events.callRemote('playerPressKey:L');
}

function voiceMicDown() {
    if (!canUseKeyboardGameplayKey('voice')) return;
    if (mp.players.local.getVariable('anticheat') === true) return;
    if (mp.players.local.getVariable('voicee') === false) return mp.events.call('notify:client', 2, 'top-mid', `У вас выключен голосовой чат.`, 3000);
    if (mp.players.local.getVariable('mute') === true) return mp.events.call('notify:client', 2, 'top-mid', 'У вас присутствует активный мут, вы не можете использовать голосовой чат.', 1500);
    if (mp.players.local.getVariable('jail') === true) return mp.events.call('notify:client', 2, 'top-mid', 'Вы не можете использовать голосовой чат находясь в деморгане.', 1500);

    if (voicePttRefCount > 0) {
        voicePttRefCount++;
        syncVoicePttGlobal();
        return;
    }
    voicePttRefCount = 1;
    syncVoicePttGlobal();

    const brawlHeld = typeof global !== 'undefined' ? Number(global.__brawlMicRefCount) || 0 : 0;
    if (brawlHeld === 0) {
        if (typeof global !== 'undefined') global.__voiceBrawlOutgoing = false;
        try {
            mp.events.callRemote('brawlVoiceTransmit', false);
        } catch (_e) {}
    }

    mp.voiceChat.muted = false;
    mp.events.callRemote('voice:anim', true);
    if (typeof hudr !== 'undefined' && hudr && mp.browsers.exists(hudr)) {
        try {
            hudr.execute('hudMain.updateMicro(true);');
        } catch (_e) {}
    }
    mp.events.callRemote('setvariablevoice', true);
}

function voiceMicUp() {
    if (voicePttRefCount <= 0) return;
    voicePttRefCount--;
    syncVoicePttGlobal();
    if (voicePttRefCount > 0) return;

    const brawlRefs = typeof global !== 'undefined' ? Number(global.__brawlMicRefCount) || 0 : 0;
    if (mp.players.local.getVariable('brawlCh') && brawlRefs > 0) return;

    mp.voiceChat.muted = true;
    mp.events.callRemote('voice:anim', false);
    if (typeof hudr !== 'undefined' && hudr && mp.browsers.exists(hudr)) {
        try {
            hudr.execute('hudMain.updateMicro(false);');
        } catch (_e) {}
    }
    mp.events.callRemote('setvariablevoice', false);
}

function brawlPttDownHandler() {
    if (!canUseKeyboardGameplayKey('brawl_ptt')) return;
    mp.events.call('brawl:pttDown');
}

function brawlPttUpHandler() {
    mp.events.call('brawl:pttUp');
}

function syncGlobalBrawlVks() {
    if (typeof global !== 'undefined') {
        global.brawlPttVk = keyBrawlPtt;
    }
}

function brawlMarkerHandler() {
    if (!canUseKeyboardGameplayKey('brawl_marker')) return;
    if (typeof global !== 'undefined' && typeof global.brawlPlaceMarkerFromBind === 'function') {
        global.brawlPlaceMarkerFromBind();
        return;
    }
    mp.events.call('brawl:placeMarker');
}

const _fastGameplayCd = {};
function takeFastGameplayCooldown(token) {
    const now = Date.now();
    const k = String(token);
    if (_fastGameplayCd[k] && now - _fastGameplayCd[k] < 1000) return false;
    _fastGameplayCd[k] = now;
    return true;
}

function fastWeaponSlotHandler(slotIdx) {
    if (isTextOrMenuBlockingGameplayKeys()) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (!mp.players.local.getVariable('auth')) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (mp.players.local.vehicle) return;
    if (!takeFastGameplayCooldown('fs' + slotIdx)) return;
    mp.events.callRemote('setvariableslot', slotIdx);
}

const fastSlot0Handler = () => fastWeaponSlotHandler(0);
const fastSlot1Handler = () => fastWeaponSlotHandler(1);
const fastSlot2Handler = () => fastWeaponSlotHandler(2);

function unbindAll() {
    try {
        global.unbindGameplayKey(keyEngine, true, engineHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keySeatbelt, true, seatbeltHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyVehicleLock, true, vehicleLockHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyVoicePtt, true, voiceMicDown);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyVoicePtt, false, voiceMicUp);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyVoiceReload, true, voiceReloadHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyBrawlPtt, true, brawlPttDownHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyBrawlPtt, false, brawlPttUpHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyLie, true, lieHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyWhistle, true, whistleHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyCrouch, true, crouchKeyDownHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyCrouch, false, crouchHandler);
    } catch (_e) {}
    crouchKeyArmed = false;
    try {
        global.unbindGameplayKey(keyInventory, true, inventoryKeyHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyRoulette, true, rouletteKeyHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyReport, true, reportKeyHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyBrawlMarker, true, brawlMarkerHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyFastSlot1, true, fastSlot0Handler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyFastSlot2, true, fastSlot1Handler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyFastSlot3, true, fastSlot2Handler);
    } catch (_e) {}
    for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
        try {
            global.unbindGameplayKey(keyAnimSlots[i], true, animSlotHandlers[i]);
        } catch (_e) {}
    }
    try {
        global.unbindGameplayKey(keyAdminDrag, true, adminDragKeyHandler);
    } catch (_e) {}
    try {
        global.unbindGameplayKey(keyAdminCuff, true, adminCuffKeyHandler);
    } catch (_e) {}
    try {
        if (typeof global.__phoneRebindKey === 'function') global.__phoneRebindKey(0);
    } catch (_ePhone) {}
}

function bindAll() {
    if (isKeyBound(keyEngine) && !isMouseVk(keyEngine)) global.bindGameplayKey(keyEngine, true, engineHandler);
    if (isKeyBound(keySeatbelt) && !isMouseVk(keySeatbelt)) global.bindGameplayKey(keySeatbelt, true, seatbeltHandler);
    if (isKeyBound(keyVehicleLock) && !isMouseVk(keyVehicleLock)) global.bindGameplayKey(keyVehicleLock, true, vehicleLockHandler);
    if (isKeyBound(keyVoicePtt) && !isMouseVk(keyVoicePtt)) {
        global.bindGameplayKey(keyVoicePtt, true, voiceMicDown);
        global.bindGameplayKey(keyVoicePtt, false, voiceMicUp);
    }
    if (isKeyBound(keyVoiceReload) && !isMouseVk(keyVoiceReload)) {
        global.bindGameplayKey(keyVoiceReload, true, voiceReloadHandler);
    }
    if (isKeyBound(keyBrawlPtt) && !isMouseVk(keyBrawlPtt)) {
        global.bindGameplayKey(keyBrawlPtt, true, brawlPttDownHandler);
        global.bindGameplayKey(keyBrawlPtt, false, brawlPttUpHandler);
    }
    if (isKeyBound(keyLie) && !isMouseVk(keyLie)) global.bindGameplayKey(keyLie, true, lieHandler);
    if (isKeyBound(keyWhistle) && !isMouseVk(keyWhistle)) global.bindGameplayKey(keyWhistle, true, whistleHandler);
    if (isKeyBound(keyCrouch) && !isMouseVk(keyCrouch)) {
        global.bindGameplayKey(keyCrouch, true, crouchKeyDownHandler);
        global.bindGameplayKey(keyCrouch, false, crouchHandler);
    }
    if (isKeyBound(keyInventory) && !isMouseVk(keyInventory)) global.bindGameplayKey(keyInventory, true, inventoryKeyHandler);
    if (isKeyBound(keyRoulette) && !isMouseVk(keyRoulette)) global.bindGameplayKey(keyRoulette, true, rouletteKeyHandler);
    if (isKeyBound(keyBrawlMarker) && !isMouseVk(keyBrawlMarker)) global.bindGameplayKey(keyBrawlMarker, true, brawlMarkerHandler);
    if (isKeyBound(keyFastSlot1) && !isMouseVk(keyFastSlot1)) global.bindGameplayKey(keyFastSlot1, true, fastSlot0Handler);
    if (isKeyBound(keyFastSlot2) && !isMouseVk(keyFastSlot2)) global.bindGameplayKey(keyFastSlot2, true, fastSlot1Handler);
    if (isKeyBound(keyFastSlot3) && !isMouseVk(keyFastSlot3)) global.bindGameplayKey(keyFastSlot3, true, fastSlot2Handler);
    for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
        if (isKeyBound(keyAnimSlots[i]) && !isMouseVk(keyAnimSlots[i])) {
            global.bindGameplayKey(keyAnimSlots[i], true, animSlotHandlers[i]);
        }
    }
    try {
        if (typeof global.__phoneRebindKey === 'function') {
            global.__phoneRebindKey(isKeyBound(keyPhone) ? keyPhone : 0);
        }
    } catch (_ePhoneBind) {}
    if (isKeyBound(keyAdminDrag) && !isMouseVk(keyAdminDrag)) global.bindGameplayKey(keyAdminDrag, true, adminDragKeyHandler);
    if (isKeyBound(keyAdminCuff) && !isMouseVk(keyAdminCuff)) global.bindGameplayKey(keyAdminCuff, true, adminCuffKeyHandler);
    syncGlobalBrawlVks();
}

const mouseEdge = {
    engine: false,
    seatbelt: false,
    vehicle_lock: false,
    voice: false,
    voice_reload: false,
    brawl_ptt: false,
    brawl_marker: false,
    lie: false,
    whistle: false,
    crouch: false,
    inventory: false,
    roulette: false,
    report: false,
    fast_slot_1: false,
    fast_slot_2: false,
    fast_slot_3: false,
    phone: false,
    anim_slot_1: false,
    anim_slot_2: false,
    anim_slot_3: false,
    anim_slot_4: false,
    anim_slot_5: false,
    admin_drag: false,
    admin_cuff: false
};

function resetMouseEdge() {
    mouseEdge.engine = false;
    mouseEdge.seatbelt = false;
    mouseEdge.vehicle_lock = false;
    mouseEdge.voice = false;
    mouseEdge.voice_reload = false;
    mouseEdge.brawl_ptt = false;
    mouseEdge.brawl_marker = false;
    mouseEdge.lie = false;
    mouseEdge.whistle = false;
    mouseEdge.crouch = false;
    mouseEdge.inventory = false;
    mouseEdge.roulette = false;
    mouseEdge.report = false;
    mouseEdge.fast_slot_1 = false;
    mouseEdge.fast_slot_2 = false;
    mouseEdge.fast_slot_3 = false;
    mouseEdge.phone = false;
    mouseEdge.anim_slot_1 = false;
    mouseEdge.anim_slot_2 = false;
    mouseEdge.anim_slot_3 = false;
    mouseEdge.anim_slot_4 = false;
    mouseEdge.anim_slot_5 = false;
    mouseEdge.admin_drag = false;
    mouseEdge.admin_cuff = false;
}

function mouseKeyDown(vk) {
    return isMouseVk(vk) && global.isGameplayKeyDown(vk);
}

function anyAnimSlotMouseBound() {
    for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
        if (isMouseVk(keyAnimSlots[i])) return true;
    }
    return false;
}

function tickMouseBinds() {
    if (
        !isMouseVk(keyEngine) &&
        !isMouseVk(keySeatbelt) &&
        !isMouseVk(keyVehicleLock) &&
        !isMouseVk(keyVoicePtt) &&
        !isMouseVk(keyVoiceReload) &&
        !isMouseVk(keyBrawlPtt) &&
        !isMouseVk(keyBrawlMarker) &&
        !isMouseVk(keyLie) &&
        !isMouseVk(keyWhistle) &&
        !anyAnimSlotMouseBound() &&
        !isMouseVk(keyCrouch) &&
        !isMouseVk(keyInventory) &&
        !isMouseVk(keyRoulette) &&
        !isMouseVk(keyReport) &&
        !isMouseVk(keyFastSlot1) &&
        !isMouseVk(keyFastSlot2) &&
        !isMouseVk(keyFastSlot3) &&
        !isMouseVk(keyAdminDrag) &&
        !isMouseVk(keyAdminCuff) &&
        !isMouseVk(keyPhone)
    )
        return;

    if (isMouseVk(keyEngine)) {
        const d = mouseKeyDown(keyEngine);
        if (d && !mouseEdge.engine && canUseMouseGameplayKey('engine')) engineHandler();
        mouseEdge.engine = d;
    } else {
        mouseEdge.engine = false;
    }

    if (isMouseVk(keySeatbelt)) {
        const d = mouseKeyDown(keySeatbelt);
        if (d && !mouseEdge.seatbelt && canUseMouseGameplayKey('seatbelt')) seatbeltHandler();
        mouseEdge.seatbelt = d;
    } else {
        mouseEdge.seatbelt = false;
    }

    if (isMouseVk(keyVehicleLock)) {
        const d = mouseKeyDown(keyVehicleLock);
        if (d && !mouseEdge.vehicle_lock && canUseMouseGameplayKey('vehicle_lock')) vehicleLockHandler();
        mouseEdge.vehicle_lock = d;
    } else {
        mouseEdge.vehicle_lock = false;
    }

    if (isMouseVk(keyVoicePtt)) {
        const d = mouseKeyDown(keyVoicePtt);
        const can = canUseMouseGameplayKey('voice');
        if (!can) {
            if (mouseEdge.voice) voiceMicUp();
            mouseEdge.voice = false;
        } else {
            if (d && !mouseEdge.voice) voiceMicDown();
            if (!d && mouseEdge.voice) voiceMicUp();
            mouseEdge.voice = d;
        }
    } else {
        mouseEdge.voice = false;
    }

    if (isMouseVk(keyVoiceReload)) {
        const d = mouseKeyDown(keyVoiceReload);
        if (d && !mouseEdge.voice_reload) voiceReloadHandler();
        mouseEdge.voice_reload = d;
    } else {
        mouseEdge.voice_reload = false;
    }

    if (isMouseVk(keyBrawlPtt)) {
        const d = mouseKeyDown(keyBrawlPtt);
        const can = canUseMouseGameplayKey('brawl_ptt');
        if (!can) {
            if (mouseEdge.brawl_ptt) brawlPttUpHandler();
            mouseEdge.brawl_ptt = false;
        } else {
            if (d && !mouseEdge.brawl_ptt) brawlPttDownHandler();
            if (!d && mouseEdge.brawl_ptt) brawlPttUpHandler();
            mouseEdge.brawl_ptt = d;
        }
    } else {
        mouseEdge.brawl_ptt = false;
    }

    if (isMouseVk(keyBrawlMarker)) {
        const d = mouseKeyDown(keyBrawlMarker);
        if (d && !mouseEdge.brawl_marker && canUseMouseGameplayKey('brawl_marker')) brawlMarkerHandler();
        mouseEdge.brawl_marker = d;
    } else {
        mouseEdge.brawl_marker = false;
    }

    if (isMouseVk(keyLie)) {
        const d = mouseKeyDown(keyLie);
        if (d && !mouseEdge.lie && canUseMouseGameplayKey('lie')) lieHandler();
        mouseEdge.lie = d;
    } else {
        mouseEdge.lie = false;
    }

    if (isMouseVk(keyWhistle)) {
        const d = mouseKeyDown(keyWhistle);
        if (d && !mouseEdge.whistle && canUseMouseGameplayKey('whistle')) whistleHandler();
        mouseEdge.whistle = d;
    } else {
        mouseEdge.whistle = false;
    }

    if (isMouseVk(keyCrouch)) {
        const d = mouseKeyDown(keyCrouch);
        if (d && !mouseEdge.crouch) crouchKeyArmed = true;
        if (mouseEdge.crouch && !d && canUseMouseGameplayKey('crouch')) crouchHandler();
        mouseEdge.crouch = d;
    } else {
        mouseEdge.crouch = false;
    }

    if (isMouseVk(keyInventory)) {
        const d = mouseKeyDown(keyInventory);
        if (d && !mouseEdge.inventory && canUseMouseGameplayKey('inventory')) inventoryKeyHandler();
        mouseEdge.inventory = d;
    } else {
        mouseEdge.inventory = false;
    }

    if (isMouseVk(keyRoulette)) {
        const d = mouseKeyDown(keyRoulette);
        if (d && !mouseEdge.roulette && canUseMouseGameplayKey('roulette')) rouletteKeyHandler();
        mouseEdge.roulette = d;
    } else {
        mouseEdge.roulette = false;
    }

    if (isMouseVk(keyReport)) {
        const d = mouseKeyDown(keyReport);
        if (d && !mouseEdge.report && canUseMouseGameplayKey('report')) reportKeyHandler();
        mouseEdge.report = d;
    } else {
        mouseEdge.report = false;
    }

    if (isMouseVk(keyFastSlot1)) {
        const d = mouseKeyDown(keyFastSlot1);
        if (d && !mouseEdge.fast_slot_1) fastSlot0Handler();
        mouseEdge.fast_slot_1 = d;
    } else {
        mouseEdge.fast_slot_1 = false;
    }

    if (isMouseVk(keyFastSlot2)) {
        const d = mouseKeyDown(keyFastSlot2);
        if (d && !mouseEdge.fast_slot_2) fastSlot1Handler();
        mouseEdge.fast_slot_2 = d;
    } else {
        mouseEdge.fast_slot_2 = false;
    }

    if (isMouseVk(keyFastSlot3)) {
        const d = mouseKeyDown(keyFastSlot3);
        if (d && !mouseEdge.fast_slot_3) fastSlot2Handler();
        mouseEdge.fast_slot_3 = d;
    } else {
        mouseEdge.fast_slot_3 = false;
    }

    for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
        const edgeKey = 'anim_slot_' + (i + 1);
        const vk = keyAnimSlots[i];
        if (isMouseVk(vk)) {
            const d = mouseKeyDown(vk);
            if (d && !mouseEdge[edgeKey] && canUseMouseGameplayKey(edgeKey)) animSlotKeyHandler(i);
            mouseEdge[edgeKey] = d;
        } else {
            mouseEdge[edgeKey] = false;
        }
    }

    if (isMouseVk(keyAdminDrag)) {
        const d = mouseKeyDown(keyAdminDrag);
        if (d && !mouseEdge.admin_drag && canUseMouseGameplayKey('admin_drag')) adminDragKeyHandler();
        mouseEdge.admin_drag = d;
    } else {
        mouseEdge.admin_drag = false;
    }

    if (isMouseVk(keyAdminCuff)) {
        const d = mouseKeyDown(keyAdminCuff);
        if (d && !mouseEdge.admin_cuff && canUseMouseGameplayKey('admin_drag')) adminCuffKeyHandler();
        mouseEdge.admin_cuff = d;
    } else {
        mouseEdge.admin_cuff = false;
    }

    if (isMouseVk(keyPhone)) {
        const d = mouseKeyDown(keyPhone);
        if (d && !mouseEdge.phone && canUseMouseGameplayKey('phone')) {
            if (typeof global !== 'undefined' && typeof global.__phoneFireMouseBind === 'function') {
                global.__phoneFireMouseBind();
            }
        }
        mouseEdge.phone = d;
    } else {
        mouseEdge.phone = false;
    }
}

function applyKeysFromStorage() {
    loadKeysFromStorage();
    if (mouseEdge.voice && isMouseVk(keyVoicePtt)) {
        try {
            voiceMicUp();
        } catch (_e) {}
    }
    if (mouseEdge.brawl_ptt && isMouseVk(keyBrawlPtt)) {
        try {
            brawlPttUpHandler();
        } catch (_e) {}
    }
    resetMouseEdge();
    unbindAll();
    bindAll();
    try {
        if (typeof global !== 'undefined' && typeof global.__invHudRefreshQuickMeta === 'function') global.__invHudRefreshQuickMeta();
    } catch (_e) {}
}

applyKeysFromStorage();
syncVoicePttGlobal();

mp.events.add('keybindsReload', () => {
    applyKeysFromStorage();
    mp.events.call('hudKeyHintsRefresh');
});

function normalizeConflictBindId(itemName) {
    if (itemName === 'voice' || itemName === 'voice_ptt') return 'voice_ptt';
    return itemName;
}

/** Одинаковая клавиша в разных категориях разрешена; внутри категории — нет (кроме «transport»: там можно одну клавишу на двигатель/ремень/замок). */
function keybindConflictCategory(bindId) {
    if (['engine', 'seatbelt', 'vehicle_lock'].includes(bindId)) return 'transport';
    if (['voice_ptt', 'brawl_ptt', 'brawl_marker', 'whistle', 'voice_reload'].includes(bindId)) return 'action';
    if (['lie', 'crouch', 'inventory', 'phone', 'fast_slot_1', 'fast_slot_2', 'fast_slot_3'].includes(bindId)) return 'player';
    if (/^anim_slot_[1-5]$/.test(bindId)) return 'anim';
    return 'meta';
}

function getConflictForVk(vk, exceptBindId) {
    const v = Number(vk);
    const exCat = keybindConflictCategory(exceptBindId);
    const settings=mp.storage.data.settings||{};
    const meta=[['player_menu',Number(settings.player_menu_key)||121],['cursor',Number(settings.cursor_key)||113]];
    if (meta.some(([id,key])=>id!==exceptBindId&&key===v)) return 'meta';
    const pairs = [
        ['engine', keyEngine],
        ['seatbelt', keySeatbelt],
        ['vehicle_lock', keyVehicleLock],
        ['voice_ptt', keyVoicePtt],
        ['voice_reload', keyVoiceReload],
        ['brawl_ptt', keyBrawlPtt],
        ['brawl_marker', keyBrawlMarker],
        ['whistle', keyWhistle],
        ['lie', keyLie],
        ['crouch', keyCrouch],
        ['inventory', keyInventory],
        ['roulette', keyRoulette],
        ['report', keyReport],
        ['fast_slot_1', keyFastSlot1],
        ['fast_slot_2', keyFastSlot2],
        ['fast_slot_3', keyFastSlot3],
        ['phone', keyPhone],
        ['admin_cuff', keyAdminCuff]
    ];
    for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
        pairs.push(['anim_slot_' + (i + 1), keyAnimSlots[i]]);
    }
    for (let i = 0; i < pairs.length; i++) {
        if (pairs[i][0] === exceptBindId) continue;
        if (Number(pairs[i][1]) !== v) continue;
        if (!['player_menu','cursor'].includes(exceptBindId)&&keybindConflictCategory(pairs[i][0]) !== exCat) continue;
        if (exCat === 'transport') continue;
        return pairs[i][0];
    }
    return null;
}

const SETTING_TO_BIND = {
    player_menu_key:'player_menu',cursor_key:'cursor',
    engine_key: 'engine',
    voice_key: 'voice_ptt',
    voice_reload_key: 'voice_reload',
    seatbelt_key: 'seatbelt',
    vehicle_lock_key: 'vehicle_lock',
    brawl_voice_key: 'brawl_ptt',
    brawl_marker_key: 'brawl_marker',
    whistle_key: 'whistle',
    lie_key: 'lie',
    crouch_key: 'crouch',
    inventory_key: 'inventory',
    roulette_key: 'roulette',
    report_key: 'report',
    fast_slot_1_key: 'fast_slot_1',
    fast_slot_2_key: 'fast_slot_2',
    fast_slot_3_key: 'fast_slot_3',
    anim_slot_1_key: 'anim_slot_1',
    anim_slot_2_key: 'anim_slot_2',
    anim_slot_3_key: 'anim_slot_3',
    anim_slot_4_key: 'anim_slot_4',
    anim_slot_5_key: 'anim_slot_5',
    phone_key: 'phone',
    admin_cuff_key: 'admin_cuff'
};

global.keybindConflictForSetting = function (vk, settingName) {
    const bid = SETTING_TO_BIND[settingName];
    if (!bid) return null;
    return getConflictForVk(vk, bid);
};

mp.events.add('updateKeybind', (itemName, keyVal) => {
    const exceptId = normalizeConflictBindId(itemName);
    let code;
    if (exceptId === 'roulette') {
        code = parseStoredRouletteKey(keyVal);
    } else {
        code = parseStoredKeyWithOptionalUnbind(keyVal, null);
        if (code === null) return;
    }
    if (isKeyBound(code) && getConflictForVk(code, exceptId)) {
        mp.events.call('notify:client', 2, 'top-mid', 'Эта клавиша уже занята другим действием.', 3000);
        return;
    }

    if (itemName === 'engine') {
        try {
            global.unbindGameplayKey(keyEngine, true, engineHandler);
        } catch (_e) {}
        keyEngine = code;
        if (isKeyBound(keyEngine) && !isMouseVk(keyEngine)) global.bindGameplayKey(keyEngine, true, engineHandler);
        mouseEdge.engine = false;
    } else if (itemName === 'seatbelt') {
        try {
            global.unbindGameplayKey(keySeatbelt, true, seatbeltHandler);
        } catch (_e) {}
        keySeatbelt = code;
        if (isKeyBound(keySeatbelt) && !isMouseVk(keySeatbelt)) global.bindGameplayKey(keySeatbelt, true, seatbeltHandler);
        mouseEdge.seatbelt = false;
    } else if (itemName === 'vehicle_lock') {
        try {
            global.unbindGameplayKey(keyVehicleLock, true, vehicleLockHandler);
        } catch (_e) {}
        keyVehicleLock = code;
        if (isKeyBound(keyVehicleLock) && !isMouseVk(keyVehicleLock)) global.bindGameplayKey(keyVehicleLock, true, vehicleLockHandler);
        mouseEdge.vehicle_lock = false;
    } else if (itemName === 'voice' || itemName === 'voice_ptt') {
        try {
            global.unbindGameplayKey(keyVoicePtt, true, voiceMicDown);
        } catch (_e) {}
        try {
            global.unbindGameplayKey(keyVoicePtt, false, voiceMicUp);
        } catch (_e) {}
        if (mouseEdge.voice && isMouseVk(keyVoicePtt)) {
            try {
                voiceMicUp();
            } catch (_e) {}
        }
        keyVoicePtt = code;
        if (isKeyBound(keyVoicePtt) && !isMouseVk(keyVoicePtt)) {
            global.bindGameplayKey(keyVoicePtt, true, voiceMicDown);
            global.bindGameplayKey(keyVoicePtt, false, voiceMicUp);
        }
        mouseEdge.voice = false;
    } else if (itemName === 'voice_reload') {
        try {
            global.unbindGameplayKey(keyVoiceReload, true, voiceReloadHandler);
        } catch (_e) {}
        keyVoiceReload = code;
        if (isKeyBound(keyVoiceReload) && !isMouseVk(keyVoiceReload)) {
            global.bindGameplayKey(keyVoiceReload, true, voiceReloadHandler);
        }
        mouseEdge.voice_reload = false;
    } else if (itemName === 'lie') {
        try {
            global.unbindGameplayKey(keyLie, true, lieHandler);
        } catch (_e) {}
        keyLie = code;
        if (isKeyBound(keyLie) && !isMouseVk(keyLie)) global.bindGameplayKey(keyLie, true, lieHandler);
        mouseEdge.lie = false;
    } else if (itemName === 'whistle') {
        try {
            global.unbindGameplayKey(keyWhistle, true, whistleHandler);
        } catch (_e) {}
        keyWhistle = code;
        if (isKeyBound(keyWhistle) && !isMouseVk(keyWhistle)) global.bindGameplayKey(keyWhistle, true, whistleHandler);
        mouseEdge.whistle = false;
    } else if (itemName === 'crouch') {
        try {
            global.unbindGameplayKey(keyCrouch, true, crouchKeyDownHandler);
        } catch (_e) {}
        try {
            global.unbindGameplayKey(keyCrouch, false, crouchHandler);
        } catch (_e) {}
        keyCrouch = code;
        crouchKeyArmed = false;
        if (isKeyBound(keyCrouch) && !isMouseVk(keyCrouch)) {
            global.bindGameplayKey(keyCrouch, true, crouchKeyDownHandler);
            global.bindGameplayKey(keyCrouch, false, crouchHandler);
        }
        mouseEdge.crouch = false;
    } else if (itemName === 'inventory') {
        try {
            global.unbindGameplayKey(keyInventory, true, inventoryKeyHandler);
        } catch (_e) {}
        keyInventory = code;
        if (isKeyBound(keyInventory) && !isMouseVk(keyInventory)) global.bindGameplayKey(keyInventory, true, inventoryKeyHandler);
        mouseEdge.inventory = false;
    } else if (itemName === 'roulette') {
        try {
            global.unbindGameplayKey(keyRoulette, true, rouletteKeyHandler);
        } catch (_e) {}
        keyRoulette = code;
        if (isKeyBound(keyRoulette) && !isMouseVk(keyRoulette)) global.bindGameplayKey(keyRoulette, true, rouletteKeyHandler);
        mouseEdge.roulette = false;
    } else if (itemName === 'report') {
        try {
            global.unbindGameplayKey(keyReport, true, reportKeyHandler);
        } catch (_e) {}
        keyReport = 0;
        mouseEdge.report = false;
        if (!mp.storage.data.settings) mp.storage.data.settings = {};
        mp.storage.data.settings.report_key = 0;
        mp.storage.flush();
        mp.events.call('notify:client', 2, 'top-mid', 'Репорт открывается только командой /report в чате.', 3500);
    } else if (itemName === 'brawl_ptt') {
        try {
            global.unbindGameplayKey(keyBrawlPtt, true, brawlPttDownHandler);
        } catch (_e) {}
        try {
            global.unbindGameplayKey(keyBrawlPtt, false, brawlPttUpHandler);
        } catch (_e) {}
        if (mouseEdge.brawl_ptt && isMouseVk(keyBrawlPtt)) {
            try {
                brawlPttUpHandler();
            } catch (_e) {}
        }
        keyBrawlPtt = code;
        if (isKeyBound(keyBrawlPtt) && !isMouseVk(keyBrawlPtt)) {
            global.bindGameplayKey(keyBrawlPtt, true, brawlPttDownHandler);
            global.bindGameplayKey(keyBrawlPtt, false, brawlPttUpHandler);
        }
        mouseEdge.brawl_ptt = false;
        syncGlobalBrawlVks();
    } else if (itemName === 'brawl_marker') {
        try {
            global.unbindGameplayKey(keyBrawlMarker, true, brawlMarkerHandler);
        } catch (_e) {}
        keyBrawlMarker = code;
        if (isKeyBound(keyBrawlMarker) && !isMouseVk(keyBrawlMarker)) global.bindGameplayKey(keyBrawlMarker, true, brawlMarkerHandler);
        mouseEdge.brawl_marker = false;
        syncGlobalBrawlVks();
    } else if (/^anim_slot_[1-5]$/.test(itemName)) {
        const slotIdx = parseInt(itemName.replace('anim_slot_', ''), 10) - 1;
        if (slotIdx < 0 || slotIdx >= ANIM_SLOT_COUNT) return;
        try {
            global.unbindGameplayKey(keyAnimSlots[slotIdx], true, animSlotHandlers[slotIdx]);
        } catch (_e) {}
        keyAnimSlots[slotIdx] = code;
        if (isKeyBound(keyAnimSlots[slotIdx]) && !isMouseVk(keyAnimSlots[slotIdx])) {
            global.bindGameplayKey(keyAnimSlots[slotIdx], true, animSlotHandlers[slotIdx]);
        }
        mouseEdge['anim_slot_' + (slotIdx + 1)] = false;
    } else if (itemName === 'fast_slot_1') {
        try {
            global.unbindGameplayKey(keyFastSlot1, true, fastSlot0Handler);
        } catch (_e) {}
        keyFastSlot1 = code;
        if (isKeyBound(keyFastSlot1) && !isMouseVk(keyFastSlot1)) global.bindGameplayKey(keyFastSlot1, true, fastSlot0Handler);
        mouseEdge.fast_slot_1 = false;
    } else if (itemName === 'fast_slot_2') {
        try {
            global.unbindGameplayKey(keyFastSlot2, true, fastSlot1Handler);
        } catch (_e) {}
        keyFastSlot2 = code;
        if (isKeyBound(keyFastSlot2) && !isMouseVk(keyFastSlot2)) global.bindGameplayKey(keyFastSlot2, true, fastSlot1Handler);
        mouseEdge.fast_slot_2 = false;
    } else if (itemName === 'fast_slot_3') {
        try {
            global.unbindGameplayKey(keyFastSlot3, true, fastSlot2Handler);
        } catch (_e) {}
        keyFastSlot3 = code;
        if (isKeyBound(keyFastSlot3) && !isMouseVk(keyFastSlot3)) global.bindGameplayKey(keyFastSlot3, true, fastSlot2Handler);
        mouseEdge.fast_slot_3 = false;
    } else if (itemName === 'phone') {
        keyPhone = code;
        if (typeof global !== 'undefined' && typeof global.__phoneRebindKey === 'function') {
            global.__phoneRebindKey(code);
        }
    } else if (itemName === 'admin_drag') {
        try {
            global.unbindGameplayKey(keyAdminDrag, true, adminDragKeyHandler);
        } catch (_e) {}
        keyAdminDrag = code;
        if (isKeyBound(keyAdminDrag) && !isMouseVk(keyAdminDrag)) global.bindGameplayKey(keyAdminDrag, true, adminDragKeyHandler);
        mouseEdge.admin_drag = false;
    } else if (itemName === 'admin_cuff') {
        try {
            global.unbindGameplayKey(keyAdminCuff, true, adminCuffKeyHandler);
        } catch (_e) {}
        keyAdminCuff = code;
        if (isKeyBound(keyAdminCuff) && !isMouseVk(keyAdminCuff)) global.bindGameplayKey(keyAdminCuff, true, adminCuffKeyHandler);
        mouseEdge.admin_cuff = false;
    }
    try {
        if (typeof global !== 'undefined' && typeof global.__invHudRefreshQuickMeta === 'function') global.__invHudRefreshQuickMeta();
    } catch (_e) {}
    mp.events.call('hudKeyHintsRefresh');
});

/** Захват клавиши в настройках */
let keybindCapture = null;
let captureSince = 0;
let capturePrevDown = new Set();

function menubrExec(js) {
    try {
        if (global.__menubr && mp.browsers.exists(global.__menubr)) {
            global.__menubr.execute(js);
        }
    } catch (_e) {}
}

function adminPanelExec(js) {
    try {
        if (typeof global !== 'undefined' && typeof global.adminPanelExec === 'function') {
            global.adminPanelExec(js);
        }
    } catch (_e) {}
}

function pushKeybindUILabel(bindId, label) {
    const bid = JSON.stringify(bindId);
    const lbl = label === '' || label == null ? '—' : String(label);
    const esc = JSON.stringify(lbl);
    menubrExec(`if(typeof window.setKeybindButtonLabel==='function')window.setKeybindButtonLabel(${bid}, ${esc});`);
    adminPanelExec(`if(typeof window.setAdminKeybindLabel==='function')window.setAdminKeybindLabel(${bid}, ${esc});`);
}

mp.events.add('keybindCaptureStart', (bindId) => {
    const allowed =
        bindId === 'engine' ||
        bindId === 'seatbelt' ||
        bindId === 'vehicle_lock' ||
        bindId === 'voice_ptt' ||
        bindId === 'brawl_ptt' ||
        bindId === 'brawl_marker' ||
        bindId === 'whistle' ||
        bindId === 'lie' ||
        bindId === 'crouch' ||
        bindId === 'inventory' ||
        bindId === 'roulette' ||
        bindId === 'fast_slot_1' ||
        bindId === 'fast_slot_2' ||
        bindId === 'fast_slot_3' ||
        /^anim_slot_[1-5]$/.test(bindId) ||
        bindId === 'phone' ||
        bindId === 'admin_drag' ||
        bindId === 'admin_cuff';
    if (!allowed) return;
    if (typeof global !== 'undefined') global.__keybindCaptureActive = true;
    keybindCapture = bindId;
    captureSince = Date.now();
    capturePrevDown = new Set();
    for (let vk = 1; vk <= 0xff; vk++) {
        if (global.isGameplayKeyDown(vk)) capturePrevDown.add(vk);
    }
    mp.events.call('notify:client', 3, 'top-mid', 'Нажмите клавишу или кнопку мыши. Esc — сброс бинда.', 4500);
});

mp.events.add('render', () => {
    if (keybindCapture) {
        // Auto-cancel after 10 seconds of inactivity
        if (Date.now() - captureSince > 10000) {
            pushKeybindUILabel(keybindCapture, '—');
            keybindCapture = null;
            if (typeof global !== 'undefined') global.__keybindCaptureActive = false;
            return;
        }
        if (Date.now() - captureSince < 220) return;

        const downNow = new Set();
        for (let vk = 1; vk <= 0xff; vk++) {
            if (global.isGameplayKeyDown(vk)) downNow.add(vk);
        }

        for (const vk of downNow) {
            if (!capturePrevDown.has(vk)) {
                if (vk === 0x1b) {
                    if (typeof global !== 'undefined') {
                        global.__keybindCaptureSuppressMenuEscUntil = Date.now() + 300;
                    }
                    const bindId = keybindCapture;
                    const storageKey = STORAGE_MAP[bindId];
                    const updateName = bindId === 'voice_ptt' ? 'voice' : bindId;

                    if (!mp.storage.data.settings) mp.storage.data.settings = {};
                    mp.storage.data.settings[storageKey] = 0;
                    mp.storage.flush();

                    mp.events.call('updateKeybind', updateName, 0);

                    pushKeybindUILabel(bindId, '—');

                    keybindCapture = null;
                    if (typeof global !== 'undefined') global.__keybindCaptureActive = false;
                    capturePrevDown = downNow;
                    mp.events.call('notify:client', 3, 'top-mid', 'Бинд сброшен.', 2000);
                    return;
                }
                if (vk === 0x71 || vk === 0x72 || vk === 0x79) continue;

                if (getConflictForVk(vk, keybindCapture)) {
                    mp.events.call('notify:client', 2, 'top-mid', 'Эта клавиша уже занята другим действием.', 3000);
                    keybindCapture = null;
                    if (typeof global !== 'undefined') global.__keybindCaptureActive = false;
                    capturePrevDown = downNow;
                    return;
                }

                const storageKey = STORAGE_MAP[keybindCapture];
                const updateName = keybindCapture === 'voice_ptt' ? 'voice' : keybindCapture;

                if (!mp.storage.data.settings) mp.storage.data.settings = {};
                mp.storage.data.settings[storageKey] = vk;
                mp.storage.flush();

                mp.events.call('updateKeybind', updateName, vk);

                const label = formatVkLabel(vk);
                pushKeybindUILabel(keybindCapture, label);

                keybindCapture = null;
                if (typeof global !== 'undefined') global.__keybindCaptureActive = false;
                capturePrevDown = downNow;
                mp.events.call('notify:client', 3, 'top-mid', 'Клавиша сохранена: ' + label, 2000);
                return;
            }
        }
        capturePrevDown = downNow;
        return;
    }

    tickMouseBinds();
});

global.isTextOrMenuBlockingGameplayKeys = isTextOrMenuBlockingGameplayKeys;
global.isLocalNoclipActive = isLocalNoclipActive;
global.isInventoryKeybindBlocked = isInventoryKeybindBlocked;
global.isReportKeybindBlocked = isReportKeybindBlocked;

function formatVkLabel(vk) {
    vk = Number(vk);
    if (!vk) return '-';
    if (vk === 0x01) return 'ЛКМ';
    if (vk === 0x02) return 'ПКМ';
    if (vk === 0x04) return 'СКМ';
    if (vk === 0x05) return 'M4';
    if (vk === 0x06) return 'M5';
    if (vk === 0x08) return 'BACKSPACE';
    if (vk === 0x09) return 'TAB';
    if (vk === 0x0d) return 'ENTER';
    if (vk === 0x10) return 'SHIFT';
    if (vk === 0x11) return 'CTRL';
    if (vk === 0x12) return 'ALT';
    if (vk === 0x14) return 'CAPS LOCK';
    if (vk === 0x1b) return 'ESC';
    if (vk === 0x20) return 'SPACE';
    if (vk === 0x21) return 'PAGE UP';
    if (vk === 0x22) return 'PAGE DOWN';
    if (vk === 0x23) return 'END';
    if (vk === 0x24) return 'HOME';
    if (vk === 0x25) return '←';
    if (vk === 0x26) return '↑';
    if (vk === 0x27) return '→';
    if (vk === 0x28) return '↓';
    if (vk === 0x2d) return 'INSERT';
    if (vk === 0x2e) return 'DELETE';
    if (vk === 0x90) return 'NUM LOCK';
    if (vk === 0x91) return 'SCROLL LOCK';
    if (vk === 0xba) return ';';
    if (vk === 0xbb) return '=';
    if (vk === 0xbc) return ',';
    if (vk === 0xbd) return '-';
    if (vk === 0xbe) return '.';
    if (vk === 0xbf) return '/';
    if (vk === 0xc0) return '`';
    if (vk === 0xdb) return '[';
    if (vk === 0xdc) return '\\';
    if (vk === 0xdd) return ']';
    if (vk === 0xde) return "'";
    if (vk === 0x6a) return 'NUM *';
    if (vk === 0x6b) return 'NUM +';
    if (vk === 0x6d) return 'NUM -';
    if (vk === 0x6e) return 'NUM .';
    if (vk === 0x6f) return 'NUM /';
    if (vk >= 0x60 && vk <= 0x69) return 'NUM ' + (vk - 0x60);
    if (vk >= 0x30 && vk <= 0x39) return String.fromCharCode(vk);
    if (vk >= 0x41 && vk <= 0x5a) return String.fromCharCode(vk);
    if (vk >= 0x70 && vk <= 0x87) return 'F' + (vk - 0x6f);
    if (vk >= 0xa0 && vk <= 0xa5) {
        const n = ['LSHIFT', 'RSHIFT', 'LCTRL', 'RCTRL', 'LALT', 'RALT'];
        return n[vk - 0xa0] || ('VK ' + vk);
    }
    return 'VK ' + vk;
}

global.formatVkLabel = formatVkLabel;

global.buildHudKeyHintsRows = function buildHudKeyHintsRowsFromKeybinds() {
    const label = formatVkLabel;
    const phoneOpen = global.__phoneOpenForHints === true;
    const rows = [
        { k: phoneOpen ? 'BACK' : label(keyPhone), t: phoneOpen ? ' Закрыть телефон' : ' Телефон' },
        { k: label(keyInventory), t: ' Инвентарь' },
        { k: label(keyVoicePtt), t: ' Микрофон' },
        { k: 'T', t: ' Чат' },
        { k: 'M', t: ' Меню' },
        { k: 'U', t: ' Анимации' },
        { k: 'F2', t: ' Курсор' },
        { k: 'F10', t: ' Помощь' }
    ];
    return rows;
};

global.isVkUsedByAnyGameplayKeybind = function (vk) {
    const v = Number(vk);
    if (!v) return false;
    const keys = [
        keyEngine, keySeatbelt, keyVehicleLock, keyVoicePtt, keyBrawlPtt, keyBrawlMarker,
        keyWhistle, keyLie, keyCrouch, keyInventory, keyRoulette, keyReport,
        keyFastSlot1, keyFastSlot2, keyFastSlot3, keyPhone, keyAdminDrag, keyAdminCuff
    ].concat(keyAnimSlots);
    for (let i = 0; i < keys.length; i++) {
        if (Number(keys[i]) === v) return true;
    }
    return false;
};
