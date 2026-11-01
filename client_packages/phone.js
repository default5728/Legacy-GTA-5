let phoner = mp.browsers.new("package://browsers/phone/index.html?v=28");
phoner.active = true;
/** Ниже HUD (hudr.orderId = 100), чтобы быстрые слоты не перекрывали телефон при открытии */
phoner.orderId = 10;
let phoneStatus = false;
let phoneCloseAnimPending = false;
let phoneInputFocused = false;
if (typeof global !== 'undefined') global.__phoneOpenForHints = false;
const PHONE_CLOSE_ANIM_MS = 380;

function setPhoneBrowserAboveHud(above) {
    if (!mp.browsers.exists(phoner)) return;
    let hudBase = 100;
    if (typeof hudr !== 'undefined' && hudr && mp.browsers.exists(hudr) && typeof hudr.orderId === 'number') {
        hudBase = hudr.orderId;
    }
    phoner.orderId = above ? hudBase + 50 : 10;
}

function openPhoneShell() {
    if (!phoner || !mp.browsers.exists(phoner)) return;
    phoneCloseAnimPending = false;
    phoneInputFocused = false;
    mp.gui.cursor.visible = true;
    setPhoneBrowserAboveHud(true);
    mp.events.call('phonehud', true);
    try {
        phoner.execute('phoneMain.openShell()');
    } catch (_eOpen) {}
    try { mp.events.callRemote('phone:clock:request:c'); } catch (_e) {}
    mp.events.callRemote('setvrblphone', true);
    if (typeof global !== 'undefined') global.__phoneOpenForHints = true;
    try { mp.events.call('hudKeyHintsRefresh'); } catch (_e) {}
}

function forceClosePhoneShell() {
    if (phoneCloseAnimPending) return;
    phoneCloseAnimPending = true;
    phoneStatus = false;
    mp.gui.cursor.visible = false;
    try {
        phoner.execute('phoneMain.closeAnimated()');
    } catch (_eCloseAnim) {
        try {
            phoner.execute('phoneMain.isActive = false; phoneMain.isClosing = false; phoneMain.currentApp = "home"');
        } catch (_eReset) {}
        finishPhoneCloseAfterAnim();
        return;
    }
    setTimeout(() => finishPhoneCloseAfterAnim(), PHONE_CLOSE_ANIM_MS + 40);
}

function finishPhoneCloseAfterAnim() {
    if (!phoneCloseAnimPending) return;
    phoneCloseAnimPending = false;
    phoneStatus = false;
    phoneInputFocused = false;
    setPhoneBrowserAboveHud(false);
    mp.events.call('phonehud', false);
    mp.events.callRemote('setvrblphone', false);
    if (typeof global !== 'undefined') global.__phoneOpenForHints = false;
    try { mp.events.call('hudKeyHintsRefresh'); } catch (_e) {}
}

function beginPhoneCloseAnimated() {
    if (!phoneStatus || phoneCloseAnimPending) return false;
    phoneCloseAnimPending = true;
    mp.gui.cursor.visible = false;
    try {
        phoner.execute('phoneMain.closeAnimated()');
    } catch (_eClose) {
        finishPhoneCloseAfterAnim();
        return true;
    }
    setTimeout(() => finishPhoneCloseAfterAnim(), PHONE_CLOSE_ANIM_MS + 40);
    return true;
}

function canOpenPhoneNow() {
    if (!mp.players.local.getVariable('auth')) return false;
    try {
        if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) return false;
    } catch (_ePre) {}
    if (mp.players.local.isTypingInTextChat) return false;
    if (mp.players.local.getVariable('dead')) return false;
    if (mp.players.local.getVariable('nof3')) return false;
    if (mp.players.local.getVariable('f3key')) return false;
    if (mp.players.local.getVariable('amenu')) return false;
    if (mp.players.local.getVariable('jail')) return false;
    if (mp.players.local.getVariable('famcreate')) return false;
    if (mp.players.local.getVariable('familymenu')) return false;
    if (mp.players.local.getVariable('casmenu')) return false;
    if (mp.players.local.getVariable('blackmenu')) return false;
    if (mp.players.local.getVariable('animsmenu')) return false;
    if (mp.players.local.getVariable('shopc')) return false;
    if (mp.players.local.getVariable('tabletTryOn')) return false;
    if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return false;
    if (typeof global.isWarMapOpen === 'function' && global.isWarMapOpen()) return false;
    if (typeof global.isFracInteractOpen === 'function' && global.isFracInteractOpen()) return false;
    if (mp.players.local.getVariable('invkey')) return false;
    if (mp.players.local.getVariable('targetmenu')) return false;
    if (!mp.players.local.getVariable('gangwar')) return false;
    return true;
}

function closePhoneIfOpen() {
    return beginPhoneCloseAnimated();
}

function __phoneOpenKeyHandler() {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (phoneCloseAnimPending) return;
    if (phoneStatus) return;
    if (!canOpenPhoneNow()) return;
    if (mp.gui.cursor.visible !== false) return;
    // Только назначенная клавиша (защита от «залипших» старых биндов)
    try {
        let want = Number(__phoneBoundKey) || 0;
        if (typeof global.getPhoneBindKeyVk === 'function') {
            const fromBinds = Number(global.getPhoneBindKeyVk());
            if (!isNaN(fromBinds)) want = fromBinds;
        } else if (typeof global.getPhoneBindVk === 'function') {
            want = Number(global.getPhoneBindVk()) || 0;
        }
        if (!want || want < 1) return;
        if (!global.isGameplayKeyDown(want)) return;
    } catch (_eGate) {}
    openPhoneShell();
    phoneStatus = true;
}

function __phoneCloseKeyHandler() {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (!phoneStatus || phoneCloseAnimPending) return;
    if (phoneInputFocused) return;
    try {
        if (mp.browsers.exists(phoner)) {
            phoner.execute('try{if(window.phoneMain&&phoneMain.handleBackspace)phoneMain.handleBackspace({repeat:false});}catch(_e){}');
            return;
        }
    } catch (_eExec) {}
    beginPhoneCloseAnimated();
}

/** Активный бинд открытия телефона. 0 = не назначен. Не биндим дефолт при загрузке — только через keybinds. */
let __phoneBoundKey = 0;
const __phoneEverBound = [];
const __phoneLegacyClearKeys = [0x08, 0x26, 0x24]; // Backspace / ↑ / Home — старые дефолты

function __phoneUnbindKey(vk) {
    const k = Number(vk);
    if (!k || k < 1 || k > 255) return;
    try { global.unbindGameplayKey(k, true, __phoneOpenKeyHandler); } catch (_e) {}
}

global.__phoneRebindKey = function (newKey) {
    __phoneUnbindKey(__phoneBoundKey);
    for (let i = 0; i < __phoneEverBound.length; i++) {
        __phoneUnbindKey(__phoneEverBound[i]);
    }
    for (let i = 0; i < __phoneLegacyClearKeys.length; i++) {
        __phoneUnbindKey(__phoneLegacyClearKeys[i]);
    }
    const nk = Number(newKey);
    if (!nk || nk < 1 || nk > 255) {
        __phoneBoundKey = 0;
        return;
    }
    __phoneBoundKey = nk;
    if (__phoneEverBound.indexOf(nk) === -1) __phoneEverBound.push(nk);
    try { global.bindGameplayKey(__phoneBoundKey, true, __phoneOpenKeyHandler); } catch (_e2) {}
};

global.getPhoneBindVk = function () {
    return Number(__phoneBoundKey) || 0;
};

global.__phoneFireMouseBind = function () {
    try {
        __phoneOpenKeyHandler();
    } catch (_e) {}
};

try { global.bindGameplayKey(0x08, true, __phoneCloseKeyHandler); } catch (_eBk) {}

mp.events.add('phone:inputFocus:CLIENT', (focused) => {
    phoneInputFocused = focused === true || focused === 'true' || focused === 1;
});

mp.events.add('phone:close:BACKSPACE', () => {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (!phoneStatus || phoneCloseAnimPending) return;
    if (phoneInputFocused) return;
    beginPhoneCloseAnimated();
});

mp.events.add('carsLoad:CLIENT', (carArray) => {
    if (!mp.browsers.exists(phoner)) return;
    try {
        const payload = typeof carArray === 'string' ? carArray : JSON.stringify(carArray || '[]');
        const esc = JSON.stringify(payload);
        phoner.execute(`phoneMain.carLoad(JSON.parse(${esc}))`);
    } catch (_eLoad) {}
});

mp.events.add('carsDelete', () => {
    if (!mp.browsers.exists(phoner)) return;
    phoner.execute(`phoneMain.deleteCars()`);
});

mp.events.add('carCall:CLIENT', (hash) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('carCall:SERVER', hash);
});

mp.events.add('carUncall:CLIENT', (hash) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('carUncall:SERVER', hash);
});

mp.events.add('phoneHide:CLIENT', () => {
    if (phoneStatus || phoneCloseAnimPending) forceClosePhoneShell();
});

mp.events.add('phone:hideAnimDone', () => {
    finishPhoneCloseAfterAnim();
});

function pushBrawlToPhone(jsonStr) {
    try {
        if (!mp.browsers.exists(phoner)) return;
        if (jsonStr == null || jsonStr === '') {
            phoner.execute('phoneMain.brawlSync(null)');
            return;
        }
        const esc = JSON.stringify(jsonStr);
        phoner.execute(`phoneMain.brawlSync(JSON.parse(${esc}))`);
    } catch (_e) {}
}

function pushBrawlSpeakersToPhone(jsonArr) {
    try {
        if (!mp.browsers.exists(phoner)) return;
        phoner.execute(`phoneMain.setBrawlSpeakers(${jsonArr})`);
    } catch (_e) {}
}

mp.events.add('brawl:phoneSync', (jsonStr) => {
    pushBrawlToPhone(jsonStr);
});

if (typeof global !== 'undefined') {
    global.__phoneBrawlPush = pushBrawlToPhone;
    global.__phoneBrawlSpeakersPush = pushBrawlSpeakersToPhone;
    global.tryClosePhoneEsc = closePhoneIfOpen;
    global.forceClosePhoneForDeath = forceClosePhoneShell;
    global.closeVehicleOverlaysForSeatbelt = function () {
        try {
            if (typeof global.forceClosePhoneForDeath === 'function') global.forceClosePhoneForDeath();
            if (typeof global.tryCloseInventoryEsc === 'function') global.tryCloseInventoryEsc();
            if (typeof global.tryClosePhoneMarketEsc === 'function') global.tryClosePhoneMarketEsc();
        } catch (_e) {}
    };
}

mp.events.add('brawl:create:CLIENT', (name, pwd) => {
    mp.events.callRemote('brawl:create', name, pwd || '');
});
mp.events.add('brawl:join:CLIENT', (name, pwd) => {
    mp.events.callRemote('brawl:join', name, pwd || '');
});
mp.events.add('brawl:leave:CLIENT', () => {
    mp.events.callRemote('brawl:leave');
});
mp.events.add('brawl:setting:CLIENT', (key, val) => {
    mp.events.callRemote('brawl:setSetting', key, val);
});
mp.events.add('brawl:member:CLIENT', (targetStatic, action, value) => {
    mp.events.callRemote('brawl:memberAction', targetStatic, action, value);
});
mp.events.add('brawl:vol:CLIENT', (kind, staticId, value) => {
    mp.events.call('brawl:vol', kind, staticId, value);
});

function openPhoneToBrawlFromChat(channelName) {
    const name = String(channelName || '').trim();
    if (name.length < 2) return;
    if (!mp.players.local.getVariable('auth')) return;
    if (!mp.browsers.exists(phoner)) return;
    mp.gui.cursor.visible = true;
    openPhoneShell();
    phoneStatus = true;
    const esc = JSON.stringify(name);
    phoner.execute(`phoneMain.brawlOpenFromChatJoin(JSON.parse(${esc}))`);
}

mp.events.add('brawlChatJoin', (channelName) => {
    openPhoneToBrawlFromChat(channelName);
});

mp.events.add('phone:clock:sync:c', (jsonRaw) => {
    try {
        if (typeof phoner === 'undefined' || !phoner || !mp.browsers.exists(phoner)) return;
        const esc = JSON.stringify(String(jsonRaw || '{}'));
        phoner.execute(`phoneMain.setServerClock(JSON.parse(${esc}))`);
    } catch (_e) {}
});

mp.events.add('phone:bank:open:CLIENT', () => {
    mp.events.callRemote('phone:bank:open:s');
});

mp.events.add('phone:arena:open:CLIENT', () => {
    if (typeof global.canOpenArenaFromPhone === 'function' && !global.canOpenArenaFromPhone()) {
        mp.events.call('notify:client', 2, 'top-mid', 'Вы не возле арены', 3500);
        return;
    }
    if (phoneStatus) {
        beginPhoneCloseAnimated();
    }
    setTimeout(() => {
        mp.gui.cursor.visible = false;
        mp.events.callRemote('arena:open:phone:s');
    }, PHONE_CLOSE_ANIM_MS + 80);
});

mp.events.add('phone:moonvito:open:CLIENT', () => {
    const delay = phoneStatus || phoneCloseAnimPending ? (PHONE_CLOSE_ANIM_MS + 80) : 0;
    if (phoneStatus) beginPhoneCloseAnimated();
    setTimeout(() => {
        try { mp.events.call('moonvito:open:CLIENT'); } catch (_e) {}
    }, delay);
});

mp.events.add('phone:bank:state:c', (jsonRaw) => {
    try {
        if (!mp.browsers.exists(phoner)) return;
        const esc = JSON.stringify(String(jsonRaw || '{}'));
        phoner.execute(`phoneMain.setBankState(JSON.parse(${esc}))`);
    } catch (_e) {}
});

mp.events.add('phone:bank:transfer:CLIENT', (targetStatic, amount) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('phone:bank:transfer:s', String(targetStatic || ''), String(amount || ''));
});

mp.events.add('phone:bank:family:deposit:CLIENT', (amount) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('phone:bank:family:deposit:s', String(amount || ''));
});

mp.events.add('phone:bank:fraction:deposit:CLIENT', (amount) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('phone:bank:fraction:deposit:s', String(amount || ''));
});

mp.events.add('phone:bank:epsilon:deposit:CLIENT', (amount) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('phone:bank:epsilon:deposit:s', String(amount || ''));
});

function phoneCloseThenRun(callback, delayMs) {
    const run = typeof callback === 'function' ? callback : () => {};
    // Дождаться анимации закрытия + запас на синк setvrblphone
    const delay = Number.isFinite(delayMs) ? delayMs : (PHONE_CLOSE_ANIM_MS + 120);
    if (phoneStatus || phoneCloseAnimPending) {
        forceClosePhoneShell();
        try { mp.events.callRemote('setvrblphone', false); } catch (_e) {}
        setTimeout(run, delay);
        return;
    }
    run();
}

mp.events.add('phone:fraction:open', () => {
    phoneCloseThenRun(() => {
        if (!mp.players.local.getVariable('auth')) return;
        mp.events.callRemote('fraction:tablet:open:s');
    });
});


