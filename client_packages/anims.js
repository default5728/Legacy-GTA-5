function isLocalAnimPlaying() {
    try {
        return mp.players.local.getVariable('anim') === true;
    } catch (_e) {
        return false;
    }
}

function stopLocalMenuAnim() {
    animExtendLookBehindBlock(650);
    pendingAnimMenuKey = '';
    activeAnimMenuKey = '';
    animMenuClearSelection();
    mp.events.callRemote('s:stopanim');
}

/** GTA «обернуться» (C) — блокируем, пока идёт анимация из меню U (нативное действие не должно сбивать позу). */
const ANIM_BLOCK_LOOK_BEHIND_CONTROLS = [26, 79]; // INPUT_LOOK_BEHIND, INPUT_VEH_LOOK_BEHIND
/** Стрельба / прицел / мили во время «сдачи» (руки вверх, за спину и т.п.). */
const ANIM_COMBAT_LOCK_CONTROLS = [
    24, 25, 47, 58, 69, 70, 92, 114, 121, 140, 141, 142, 257, 263, 264,
    37, 12, 13, 99, 100, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167
];
const ANIM_COMBAT_LOCK_ANIMS = [
    { dict: 'random@mugging3', name: 'handsup_standing_base' },
    { dict: 'random@arrests', name: 'kneeling_arrest_idle' },
    { dict: 'random@shop_robbery', name: 'kneel_loop_p' },
    { dict: 'anim@move_hostages@male', name: 'male_idle' },
    { dict: 'anim@miss@low@fin@vagos@', name: 'idle_ped06' },
    { dict: 'amb@code_human_cower@male@react_cowering', name: 'base_front' },
    { dict: 'anim@heists@prison_heistunfinished_biz@popov_react', name: 'popov_cower' },
    { dict: 'anim@heists@ornate_bank@hostages@cashier_b@', name: 'flinch_loop_underfire' },
    { dict: 'anim@mp_player_intcelebrationfemale@surrender', name: 'surrender' }
];
let animSuppressLookBehindUntil = 0;

function isAnimCombatLockActive() {
    try {
        if (mp.players.local.getVariable('animCombatLock') === true) return true;
    } catch (_e) {}
    try {
        if (mp.players.local.getVariable('anim') !== true) return false;
        for (let i = 0; i < ANIM_COMBAT_LOCK_ANIMS.length; i++) {
            const a = ANIM_COMBAT_LOCK_ANIMS[i];
            if (mp.players.local.isPlayingAnim(a.dict, a.name, 3)) return true;
        }
    } catch (_e2) {}
    return false;
}

function animBlockCombatControlsNow() {
    const n = mp.game.controls;
    for (let i = 0; i < ANIM_COMBAT_LOCK_CONTROLS.length; i++) {
        n.disableControlAction(0, ANIM_COMBAT_LOCK_CONTROLS[i], true);
        n.disableControlAction(1, ANIM_COMBAT_LOCK_CONTROLS[i], true);
        n.disableControlAction(2, ANIM_COMBAT_LOCK_CONTROLS[i], true);
    }
}

function animBlockCombatWhileLocked() {
    if (!isAnimCombatLockActive()) return;
    animBlockCombatControlsNow();
    try {
        const w = mp.players.local.weapon;
        if (w && w !== mp.game.joaat('weapon_unarmed') && w !== 2725352035) {
            mp.players.local.weapon = mp.game.joaat('weapon_unarmed');
        }
    } catch (_e) {}
}

function animExtendLookBehindBlock(ms) {
    const until = Date.now() + (ms || 500);
    if (until > animSuppressLookBehindUntil) animSuppressLookBehindUntil = until;
}

function animShouldBlockLookBehind() {
    return isLocalAnimPlaying() || Date.now() < animSuppressLookBehindUntil;
}

function animBlockLookBehindControlsNow() {
    for (let group = 0; group <= 2; group++) {
        for (const control of ANIM_BLOCK_LOOK_BEHIND_CONTROLS) {
            mp.game.controls.disableControlAction(group, control, true);
        }
    }
}

function animBlockLookBehindWhilePlaying() {
    if (!animShouldBlockLookBehind()) return;
    animBlockLookBehindControlsNow();
}

function animCanUseStopKey() {
    if (isMenuOpen) return false;
    if (mp.game.ui.isPauseMenuActive()) return false;
    if (mp.players.local.isTypingInTextChat) return false;
    if (typeof global.isTypingInAnyTextField === 'function' && global.isTypingInAnyTextField()) return false;
    if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return false;
    if (global.pairActive) return false;
    if (mp.players.local.getVariable('pairActive') === true) return false;
    return true;
}

/** C вне меню U: останавливает анимацию через disabled-control (без keys.bind — иначе look-behind успевает пройти). */
function animHandleLookBehindStopOnC() {
    if (!animShouldBlockLookBehind() || !animCanUseStopKey()) return;
    if (!isLocalAnimPlaying()) return;
    for (let group = 0; group <= 2; group++) {
        for (const control of ANIM_BLOCK_LOOK_BEHIND_CONTROLS) {
            if (mp.game.controls.isDisabledControlJustPressed(group, control)) {
                animExtendLookBehindBlock(650);
                stopLocalMenuAnim();
                return;
            }
        }
    }
}

const ANIM_BROWSER_ORDER_ID = 140;
let animmenur = mp.browsers.new('package://browsers/anims/index.html?v=10');
animmenur.active = false;
try { animmenur.orderId = ANIM_BROWSER_ORDER_ID; } catch (_eOrd) {}
let isMenuOpen = false;
let lastPress = 0;

function applyAnimMenuWorldOpen() {
    try {
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
        if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
        } else {
            mp.events.call('hideChatServer');
        }
    } catch (_e) {}
}

function applyAnimMenuWorldClose() {
    try {
        mp.events.call('showChatServer');
        if (typeof global.applyChatPresentation === 'function') {
            global.applyChatPresentation();
        }
    } catch (_e) {}
}

function animMenuClearSelection() {
    try {
        if (!animmenur || !mp.browsers.exists(animmenur)) return;
        animmenur.execute('try{if(window.__clearAnimMenuSelection)window.__clearAnimMenuSelection();}catch(_e){}');
    } catch (_e) {}
}

function animMenuSetPlaying(key) {
    try {
        if (!animmenur || !mp.browsers.exists(animmenur)) return;
        const k = key == null ? '' : String(key);
        animmenur.execute(
            'try{if(window.__setAnimMenuPlaying)window.__setAnimMenuPlaying(' + JSON.stringify(k) + ');}catch(_e){}'
        );
    } catch (_e) {}
}

let pendingAnimMenuKey = '';
let activeAnimMenuKey = '';

function closeAnimMenu() {
    if (!isMenuOpen) return false;
    animmenur.active = false;
    isMenuOpen = false;
    mp.gui.cursor.show(false, false);
    mp.events.callRemote('setvara', false);
    applyAnimMenuWorldClose();
    animFavoritesPullFromBrowserAndSave();
    animSlotsPullFromBrowserAndSave();
    return true;
}

function openAnimMenu() {
    if (isMenuOpen) return;
    if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    try { animmenur.orderId = ANIM_BROWSER_ORDER_ID; } catch (_eOrd) {}
    animmenur.active = true;
    isMenuOpen = true;
    applyAnimMenuWorldOpen();
    mp.gui.cursor.show(true, true);
    mp.events.callRemote('setvara', true);

    try {
                animmenur.execute(
            'try{if(typeof AnimMenu!=="undefined"){AnimMenu.Active=1;AnimMenu.openedContextKey="";AnimMenu.contextAnim=null;AnimMenu.searchForm="";}}catch(_e){}'
        );
    } catch (_e) {}

    animFavoritesRequestFromServer();
    animSlotsRequestFromServer();
    setTimeout(() => animFavoritesPushToBrowser(true), 120);
    setTimeout(() => animFavoritesPushToBrowser(false), 400);
    setTimeout(() => animSlotsPushToBrowser(), 120);
    setTimeout(() => animSlotsPushToBrowser(), 400);
}

const ANIM_FAV_STORAGE_KEY = 'bloody_anim_favorites_json';
const ANIM_FAV_LS_KEY = 'bloody_rp_anim_favorites';

let animFavLastServerJson = null;

function animFavoritesReadStorage() {
    try {
        if (!mp.storage.data) return null;
        const v = mp.storage.data[ANIM_FAV_STORAGE_KEY];
        return typeof v === 'string' && v.length ? v : null;
    } catch (_e) {
        return null;
    }
}

function animFavoritesWriteStorage(jsonStr) {
    try {
        if (!mp.storage.data) mp.storage.data = {};
        mp.storage.data[ANIM_FAV_STORAGE_KEY] = jsonStr;
        mp.storage.flush();
    } catch (_e) {}
}

function animFavoritesPushToBrowser(preferStorage) {
    try {
        if (!animmenur || !mp.browsers.exists(animmenur)) return;
        let raw = animFavLastServerJson;
        if (raw == null && preferStorage) raw = animFavoritesReadStorage();
        if (raw == null) return;
        animmenur.execute(
            'try{if(window.__applyAnimFav)window.__applyAnimFav(' +
                JSON.stringify(raw) +
                ');}catch(_e){}'
        );
    } catch (_e) {}
}

function animFavoritesRequestFromServer() {
    try {
        mp.events.callRemote('anim:favorites:request:s');
    } catch (_e) {}
}

function animFavoritesNormalizeJson(raw) {
    try {
        let s = raw == null ? '[]' : String(raw);
        if (!s.length) s = '[]';
        try {
            if (/%[0-9A-Fa-f]{2}/.test(s) && (s.charAt(0) === '%' || s.indexOf('%22') >= 0)) {
                s = decodeURIComponent(s);
            }
        } catch (_e) {}
        const parsed = JSON.parse(s);
        if (!Array.isArray(parsed)) return '[]';
        return JSON.stringify(parsed);
    } catch (_e) {
        return '[]';
    }
}

function animFavoritesPushSaveToServer(jsonStr) {
    try {
        const s = animFavoritesNormalizeJson(jsonStr);
        animFavoritesWriteStorage(s);
        animFavLastServerJson = s;
        mp.events.callRemote('anim:favorites:save:s', s);
    } catch (_e) {}
}

/** CEF: mp.trigger не надёжно передаёт JSON — читаем из localStorage того же браузера. */
function animFavoritesPullFromBrowserAndSave() {
    try {
        if (!animmenur || !mp.browsers.exists(animmenur)) return;
        animmenur.execute(
            "(function(){try{var s=localStorage.getItem(" +
                JSON.stringify(ANIM_FAV_LS_KEY) +
                ")||'[]';if(typeof mp!=='undefined'&&mp.trigger)mp.trigger('anim:fav:payload:c',s);}catch(_e){}})();"
        );
    } catch (_e) {}
}

mp.events.add('anim:favorites:request', () => {
    animFavoritesRequestFromServer();
});

/* CEF: json напрямую (ASCII) или сигнал — тогда читаем localStorage через execute. */
mp.events.add('anim:fav:save:c', (jsonStr) => {
    /* Прямой путь, если аргумент дошёл целым. */
    if (typeof jsonStr === 'string' && jsonStr.length > 1) {
        animFavoritesPushSaveToServer(jsonStr);
    }
    /* Безусловный надёжный путь: читаем актуальный snapshot из CEF localStorage
     * и шлём на сервер. Это страхует случай, когда CEF→client теряет аргумент. */
    animFavoritesPullFromBrowserAndSave();
});

/* Payload из execute браузера (надёжнее, чем mp.trigger из Vue с JSON). */
mp.events.add('anim:fav:payload:c', (jsonStr) => {
    animFavoritesPushSaveToServer(jsonStr);
});

mp.events.add('anim:favorites:save', (jsonStr) => {
    animFavoritesPushSaveToServer(jsonStr);
});

mp.events.add('anim:favorites:hydrate', (jsonStr) => {
    try {
        const s = typeof jsonStr === 'string' ? jsonStr : '';
        if (s.length < 2) return;
        animFavLastServerJson = s;
        animFavoritesWriteStorage(s);
        animFavoritesPushToBrowser(false);
        [120, 350, 800].forEach((ms) => {
            setTimeout(() => {
                try {
                    animFavoritesPushToBrowser(false);
                } catch (_e) {}
            }, ms);
        });
    } catch (_e) {}
});

const ANIM_SLOT_COUNT = 5;
const ANIM_SLOTS_STORAGE_KEY = 'bloody_anim_slots_json';
const ANIM_SLOTS_LS_KEY = 'bloody_rp_anim_slots';

let animSlotsCache = new Array(ANIM_SLOT_COUNT).fill(null);
let animSlotsLastServerJson = null;

function animSlotsEmptyJson() {
    return JSON.stringify(new Array(ANIM_SLOT_COUNT).fill(null));
}

function animSlotsNormalizeJson(raw) {
    try {
        let s = raw == null ? animSlotsEmptyJson() : String(raw);
        const parsed = JSON.parse(s);
        if (!Array.isArray(parsed)) return animSlotsEmptyJson();
        const out = [];
        for (let i = 0; i < ANIM_SLOT_COUNT; i++) {
            const e = parsed[i];
            if (e && typeof e === 'object' && e.animDictionary && e.animationName) {
                out.push({
                    animName: e.animName || e.animationName,
                    animDictionary: String(e.animDictionary),
                    animationName: String(e.animationName),
                    flag: Number.isFinite(Number(e.flag)) ? Number(e.flag) : 49
                });
            } else {
                out.push(null);
            }
        }
        return JSON.stringify(out);
    } catch (_e) {
        return animSlotsEmptyJson();
    }
}

function animSlotsReadStorage() {
    try {
        if (!mp.storage.data) return null;
        const v = mp.storage.data[ANIM_SLOTS_STORAGE_KEY];
        return typeof v === 'string' && v.length ? v : null;
    } catch (_e) {
        return null;
    }
}

function animSlotsWriteStorage(jsonStr) {
    try {
        if (!mp.storage.data) mp.storage.data = {};
        mp.storage.data[ANIM_SLOTS_STORAGE_KEY] = jsonStr;
        mp.storage.flush();
    } catch (_e) {}
}

function animSlotsApplyCacheFromJson(jsonStr) {
    try {
        const s = animSlotsNormalizeJson(jsonStr);
        animSlotsLastServerJson = s;
        const arr = JSON.parse(s);
        for (let i = 0; i < ANIM_SLOT_COUNT; i++) animSlotsCache[i] = arr[i] || null;
        animSlotsWriteStorage(s);
        animSlotsPushToBrowser();
    } catch (_e) {}
}

function animSlotsPushToBrowser() {
    try {
        if (!animmenur || !mp.browsers.exists(animmenur)) return;
        const raw = animSlotsLastServerJson || animSlotsReadStorage();
        if (!raw) return;
        animmenur.execute(
            'try{if(window.__applyAnimSlots)window.__applyAnimSlots(' +
                JSON.stringify(raw) +
                ');}catch(_e){}'
        );
    } catch (_e) {}
}

function animSlotsPushSaveToServer(jsonStr) {
    try {
        animSlotsApplyCacheFromJson(jsonStr);
        mp.events.callRemote('anim:slots:save:s', animSlotsLastServerJson);
    } catch (_e) {}
}

function animSlotsRequestFromServer() {
    try {
        mp.events.callRemote('anim:slots:request:s');
    } catch (_e) {}
}

function animSlotsPullFromBrowserAndSave() {
    try {
        if (!animmenur || !mp.browsers.exists(animmenur)) return;
        animmenur.execute(
            "(function(){try{var s=localStorage.getItem(" +
                JSON.stringify(ANIM_SLOTS_LS_KEY) +
                ")||'[]';if(typeof mp!=='undefined'&&mp.trigger)mp.trigger('anim:slots:payload:c',s);}catch(_e){}})();"
        );
    } catch (_e) {}
}

mp.events.add('anim:slots:save:c', (jsonStr) => {
    try {
        if (typeof jsonStr === 'string' && jsonStr.length > 2) {
            animSlotsPushSaveToServer(jsonStr);
            return;
        }
    } catch (_e) {}
    animSlotsPullFromBrowserAndSave();
});

mp.events.add('anim:slots:payload:c', (jsonStr) => {
    if (typeof jsonStr === 'string' && jsonStr.length > 2) {
        animSlotsPushSaveToServer(jsonStr);
    }
});

mp.events.add('anim:slots:hydrate', (jsonStr) => {
    try {
        animSlotsApplyCacheFromJson(jsonStr);
        [120, 350, 800].forEach((ms) => {
            setTimeout(() => {
                try {
                    animSlotsPushToBrowser();
                } catch (_e) {}
            }, ms);
        });
    } catch (_e) {}
});

if (typeof global !== 'undefined') {
    global.playAnimFromSlot = function (slotIdx) {
        const i = Number(slotIdx);
        if (!Number.isFinite(i) || i < 0 || i >= ANIM_SLOT_COUNT) return;
        if (typeof global.isCaptOrBizwarInArena === 'function' && global.isCaptOrBizwarInArena()) return;
        if (!mp.players.local.getVariable('auth') || mp.players.local.dead) return;
        const anim = animSlotsCache[i];
        if (!anim || !anim.animDictionary || !anim.animationName) return;
        if (new Date().getTime() - mp.players.local.clicked < 1000)
            return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
        mp.players.local.clicked = new Date().getTime();
        mp.events.callRemote('anim:play:s', anim.animDictionary, anim.animationName, anim.flag || 49);
    };
}

mp.events.add('setlogin', () => {
    try {
        animFavoritesRequestFromServer();
        animSlotsRequestFromServer();
    } catch (_e) {}
});

global.bindGameplayKey(0x55, false, function () {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (typeof global.isTypingInAnyTextField === 'function' && global.isTypingInAnyTextField()) return;
    if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return;
    if (typeof global.isTextOrMenuBlockingGameplayKeys === 'function' && global.isTextOrMenuBlockingGameplayKeys()) return;
    if (typeof global.isCaptOrBizwarInArena === 'function' && global.isCaptOrBizwarInArena()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.getVariable('nof3')) return;
    if (mp.players.local.getVariable('amenu')) return;
    if (mp.players.local.getVariable('jail')) return;
    if (mp.players.local.getVariable('famcreate')) return;
    if (mp.players.local.getVariable('familymenu')) return;
    if (mp.players.local.getVariable('casmenu')) return;
    if (mp.players.local.getVariable('blackmenu')) return;
    if (mp.players.local.getVariable('shopc')) return;
    if (mp.players.local.getVariable('phone')) return;
    if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return;
    if (mp.players.local.getVariable('invkey')) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;

    let currentTime = Date.now();
    if (currentTime - lastPress < 500) {
        return;
    }
    lastPress = currentTime;

    if (isMenuOpen) return;
    openAnimMenu();
});

if (typeof global !== 'undefined') {
    global.tryCloseAnimsEsc = () => closeAnimMenu();
}

mp.events.add('close:anim', () => {
    closeAnimMenu();
});

// Send current anim slot names to F2 so the SetAnims panel shows slot info
global.animSlotsPushToF2 = function() {
    try {
        if (!global.__menubr || !mp.browsers.exists(global.__menubr)) return;
        var slots = animSlotsCache || [];
        var js = 'try{[1,2,3,4,5].forEach(function(i){var el=document.getElementById("animSlotName"+i);if(!el)return;var s=' +
            JSON.stringify(slots) + '[i-1];el.textContent=s&&s.animationName?s.animationName:"—";});}catch(_e){}';
        global.__menubr.execute(js);
    } catch (_e) {}
};

mp.events.add('anim:play:c', (a1, a2, a3) => {
    const dict = a1 == null ? '' : String(a1).trim();
    const anim = a2 == null ? '' : String(a2).trim();
    const isStop = !dict || !anim;

    if (isStop) {
        pendingAnimMenuKey = '';
        activeAnimMenuKey = '';
        stopLocalMenuAnim();
        return;
    }

    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        animMenuSetPlaying(activeAnimMenuKey || pendingAnimMenuKey || '');
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    const flag = a3 == null ? 49 : a3;
    pendingAnimMenuKey = dict + '|' + anim + '|' + flag;
    animMenuSetPlaying(pendingAnimMenuKey);
    mp.events.callRemote('anim:play:s', dict, anim, a3);
});

/** Запасной путь на C: сначала гасим look-behind и держим блок, потом стоп анимации. */
global.bindGameplayKey(0x43, true, () => {
    if (!isLocalAnimPlaying() || !animCanUseStopKey()) return;
    animExtendLookBehindBlock(650);
    animBlockLookBehindControlsNow();
    stopLocalMenuAnim();
});

let lastAnimPlayingVar = false;
try {
    lastAnimPlayingVar = mp.players.local.getVariable('anim') === true;
} catch (_eInit) {}

mp.events.addDataHandler('anim', (entity, value) => {
    try {
        if (entity !== mp.players.local) return;
        const on = value === true;
        if (lastAnimPlayingVar && !on) {
            animExtendLookBehindBlock(650);
            const switching = !!(pendingAnimMenuKey && pendingAnimMenuKey !== activeAnimMenuKey);
            if (switching) {
                animMenuSetPlaying(pendingAnimMenuKey);
            } else {
                pendingAnimMenuKey = '';
                activeAnimMenuKey = '';
                animMenuClearSelection();
            }
        } else if (on && pendingAnimMenuKey) {
            activeAnimMenuKey = pendingAnimMenuKey;
            animMenuSetPlaying(activeAnimMenuKey);
        }
        lastAnimPlayingVar = on;
    } catch (_e) {}
});

if (typeof global !== 'undefined') {
    global.isAnimMenuOpen = function () {
        return isMenuOpen;
    };
    global.isLocalAnimPlaying = isLocalAnimPlaying;
}

mp.events.add('render', () => {
    animBlockLookBehindWhilePlaying();
    animHandleLookBehindStopOnC();
    animBlockCombatWhileLocked();
    if (!isMenuOpen) return;
    try {
        mp.gui.chat.activate(false);
        if (global.__chatInputOpen && typeof global.forceCloseChatInput === 'function') {
            global.forceCloseChatInput();
        }
    } catch (_e) {}
});
