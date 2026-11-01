let crawlPlayer = mp.players.local;
crawlPlayer.crawling = false;
let crawlInterval;
let currentAnim;
let lastLiePressTime = 0;

/** Ползание / лежать (настраиваемая клавиша; gangwar + антиспам 3 с) */
global.toggleLieCrawl = function () {
    if (typeof global.isCaptOrBizwarPrepFrozen === 'function' && global.isCaptOrBizwarPrepFrozen()) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (!mp.players.local.getVariable('auth')) return;
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.getVariable('famcreate')) return;
    if (mp.players.local.getVariable('familymenu')) return;
    if (mp.players.local.getVariable('casmenu')) return;
    if (mp.players.local.getVariable('amenu')) return;
    if (mp.players.local.getVariable('blackmenu')) return;
    if (mp.players.local.getVariable('animsmenu')) return;
    if (mp.players.local.getVariable('shopc')) return;
    if (mp.players.local.getVariable('fly')) return;
    if (mp.players.local.getVariable('phone')) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;

    const currentTime = Date.now();
    if (currentTime - lastLiePressTime < 3000) return;
    lastLiePressTime = currentTime;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('f3key')) return;
    if (mp.gui.cursor.visible) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.crawling) {
        stopCrawling();
    } else {
        startCrawling();
    }
};

function startCrawling() {
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.getVariable('famcreate')) return;
    if (mp.players.local.getVariable('familymenu')) return;
    if (mp.players.local.getVariable('casmenu')) return;
    if (mp.players.local.getVariable('amenu')) return;
    if (mp.players.local.getVariable('blackmenu')) return;
    if (mp.players.local.getVariable('animsmenu')) return;
    if (mp.players.local.getVariable('shopc')) return;
    crawlInterval = setInterval(handleControls, 0);
    crawlPlayer.crawling = true;
    mp.game.streaming.requestAnimDict('move_crawlprone2crawlfront');
    crawlPlayer.taskPlayAnim(
        'move_crawlprone2crawlfront',
        'front',
        8.0,
        1000,
        -1,
        2,
        0,
        false,
        false,
        false
    );
}

function stopCrawling() {    
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.getVariable('famcreate')) return;
    if (mp.players.local.getVariable('familymenu')) return;
    if (mp.players.local.getVariable('casmenu')) return;
    if (mp.players.local.getVariable('amenu')) return;
    if (mp.players.local.getVariable('blackmenu')) return;
    if (mp.players.local.getVariable('animsmenu')) return;
    if (mp.players.local.getVariable('shopc')) return;
    try {
        mp.players.local.crawling = false;
        clearInterval(crawlInterval);
        mp.players.local.clearTasks();
        mp.players.local.clearSecondaryTask();
    } catch {
        return
    }
}

mp.events.add('stopcrawling', () => {
    stopCrawling()
});

function handleControls() {
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.getVariable('famcreate')) return;
    if (mp.players.local.getVariable('familymenu')) return;
    if (mp.players.local.getVariable('casmenu')) return;
    if (mp.players.local.getVariable('amenu')) return;
    if (mp.players.local.getVariable('blackmenu')) return;
    if (mp.players.local.getVariable('animsmenu')) return;
    if (mp.players.local.getVariable('shopc')) return;
    if (!crawlPlayer.crawling) return;
    let rotation = crawlPlayer.getRotation(2);
    mp.game.controls.disableControlAction(0, 32, true);
    mp.game.controls.disableControlAction(0, 33, true);
    mp.game.controls.disableControlAction(0, 34, true);
    mp.game.controls.disableControlAction(0, 35, true);
    if (mp.game.controls.isDisabledControlPressed(0, 34)) {
        crawlPlayer.setRotation(rotation.x, rotation.y, rotation.z + 0.2, 2, true);
    }
    if (mp.game.controls.isDisabledControlPressed(0, 35)) {
        crawlPlayer.setRotation(rotation.x, rotation.y, rotation.z - 0.2, 2, true);
    }
    if (mp.game.controls.isDisabledControlPressed(0, 32)) {
        playCrawlAnimation('onfront_fwd');
    }
    if (mp.game.controls.isDisabledControlPressed(0, 33)) {
        playCrawlAnimation('onfront_bwd');
    }
}

function playCrawlAnimation(animation) {
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.getVariable('famcreate')) return;
    if (mp.players.local.getVariable('familymenu')) return;
    if (mp.players.local.getVariable('casmenu')) return;
    if (mp.players.local.getVariable('amenu')) return;
    if (mp.players.local.getVariable('blackmenu')) return;
    if (mp.players.local.getVariable('animsmenu')) return;
    if (mp.players.local.getVariable('shopc')) return;
    if (currentAnim === animation) return;    
    let dict = 'move_crawl';
    let duration = mp.game.entity.getEntityAnimDuration(dict, animation);
    mp.game.streaming.requestAnimDict(dict);
    crawlPlayer.taskPlayAnim(dict, animation, 8.0, 1000, -1, 2, 0, false, false, false);
    currentAnim = animation;
    setTimeout(() => {
        currentAnim = undefined;
    }, (duration - 0.1) * 1000);
}

let lastCursorToggleAt = 0;

function canToggleGameplayCursor() {
    try {
        const p = mp.players.local;
        if (!p || p.getVariable('auth') !== true) return false;
        if (mp.game.ui.isPauseMenuActive()) return false;
        if (p.isTypingInTextChat) return false;
        if (typeof global !== 'undefined' && global.__chatInputOpen === true) return false;
        if (p.getVariable('dead') === true) return false;
        if (p.getVariable('jail') === true) return false;
        if (p.getVariable('f3key') === true) return false;
        if (p.getVariable('phone') === true) return false;
        if (p.getVariable('invkey') === true) return false;
        if (p.getVariable('shopc') === true) return false;
        if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return false;
        if (p.getVariable('amenu') === true) return false;
        if (p.getVariable('casmenu') === true) return false;
        if (p.getVariable('blackmenu') === true) return false;
        if (p.getVariable('animsmenu') === true) return false;
        if (p.getVariable('targetmenu') === true) return false;
        if (p.getVariable('famcreate') === true) return false;
        if (p.getVariable('familymenu') === true) return false;
        if (typeof global !== 'undefined' && typeof global.isFamilyTabletOpen === 'function' && global.isFamilyTabletOpen()) return false;
        if (global.__menubr && mp.browsers.exists(global.__menubr) && global.__menubr.active) return false;
        if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return false;
        if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) return false;
        return true;
    } catch (_e) {
        return false;
    }
}

function setGameplayCursorVisible(show) {
    const on = !!show;
    mp.gui.cursor.show(on, on);
    mp.gui.cursor.visible = on;
}

function legacyCursorKeyHandler() {
    try {
        const p = mp.players.local;
        /* На экране смерти — F2 переключает курсор: скрыть = осмотреться, снова показать = кнопки респавна. */
        if (p && p.getVariable('auth') === true && p.getVariable('dead') === true) {
            const now = Date.now();
            if (now - lastCursorToggleAt < 160) return;
            lastCursorToggleAt = now;
            const nextVisible = !mp.gui.cursor.visible;
            setGameplayCursorVisible(nextVisible);
            if (typeof global.setDeathMenuInteractable === 'function') {
                global.setDeathMenuInteractable(nextVisible);
            }
            return;
        }
    } catch (_e) {}
    if (!canToggleGameplayCursor()) return;
    const now = Date.now();
    if (now - lastCursorToggleAt < 160) return;
    lastCursorToggleAt = now;
    setGameplayCursorVisible(!mp.gui.cursor.visible);
}
let cursorBindKey=113,cursorMouseHeld=false;
function rebindLegacyCursor(){
    global.unbindGameplayKey(cursorBindKey,true,legacyCursorKeyHandler);
    const key=Number((mp.storage.data.settings||{}).cursor_key);
    cursorBindKey=Number.isInteger(key)&&key>0&&key<=255?key:113;
    if(cursorBindKey>6)global.bindGameplayKey(cursorBindKey,true,legacyCursorKeyHandler);
    cursorMouseHeld=cursorBindKey<=6&&mp.keys.isDown(cursorBindKey);
}
rebindLegacyCursor();
mp.events.add('keybindsReload',rebindLegacyCursor);
mp.events.add('updateKeybind',name=>{if(name==='cursor')rebindLegacyCursor();});
mp.events.add('render',()=>{const held=cursorBindKey<=6&&mp.keys.isDown(cursorBindKey);if(held&&!cursorMouseHeld&&!global.__keybindCaptureActive&&!global.__chatInputOpen&&!global.__cefTextInputOpen)legacyCursorKeyHandler();cursorMouseHeld=held;});


global.isGameplayCursorToggleAllowed = canToggleGameplayCursor;
global.hideGameplayCursor = function () {
    setGameplayCursorVisible(false);
};

global.seatbeltStatus = false;
let lastSeatbeltToggle = 0;
global.toggleSeatBelt = function () {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('f3key') === true) return;
    if (!mp.players.local.vehicle) return;
    if (typeof global.isLocalPlayerOnSkate === 'function' && global.isLocalPlayerOnSkate()) return;
    if (typeof global.isSkateVehicle === 'function' && global.isSkateVehicle(mp.players.local.vehicle)) return;
    const now = Date.now();
    if (now - lastSeatbeltToggle < 1000) return;
    lastSeatbeltToggle = now;
    if (seatbeltStatus == false) {
        mp.players.local.setConfigFlag(32, false);
        seatbeltStatus = true;
        mp.events.call('notify:client', 3, "bottom-mid", "Ремень безопасности пристёгнут.", 3000);
    } else {
        mp.players.local.setConfigFlag(32, true);
        seatbeltStatus = false;
        mp.events.call('notify:client', 3, "bottom-mid", "Ремень безопасности отстёгнут.", 3000);
        if (typeof global.closeVehicleOverlaysForSeatbelt === 'function') global.closeVehicleOverlaysForSeatbelt();
    }
};

/* Ремень: настраиваемая клавиша в keybinds.js (seatbelt_key, по умолчанию J) */