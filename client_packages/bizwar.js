'use strict';

/** Единая панель капта / бизвара — Events/BizWar/ui.html (1:1) для family capt и fraction bizwar. */
let bizWarBrowser = null;
let bizWarPanelActive = false;
/** Панель скрыта, пока открыто любое меню (F3, инвентарь, казино и т.д. — они зовут 'hud', false). */
let bizWarMenuHidden = false;
/** Панель скрыта, пока открыта нативная пауза (ESC). */
let bizWarPauseHidden = false;
/** Избегаем лишних дёрганий active в render каждый кадр. */
let bizWarLastActiveState = null;

function bizWarSetBrowserVisible(visible) {
    try {
        if (!bizWarBrowser || !mp.browsers.exists(bizWarBrowser)) return;
        if (bizWarLastActiveState === visible) return;
        bizWarLastActiveState = visible;
        bizWarBrowser.active = !!visible;
    } catch (_e) {}
}

function bizWarResolveVisibility() {
    if (!bizWarPanelActive) return false;
    if (bizWarMenuHidden) return false;
    if (bizWarPauseHidden) return false;
    return isLocalInWarPanel();
}

function bizWarSyncVisibility() {
    bizWarSetBrowserVisible(bizWarResolveVisibility());
}

/** Событие 'hud' шлют все большие меню при открытии/закрытии. */
mp.events.add('hud', (toggle) => {
    bizWarMenuHidden = toggle !== true;
    bizWarSyncVisibility();
});

/** ESC-пауза: CEF рисуется поверх нативной паузы — глушим панель, пока открыта. */
mp.events.add('render', () => {
    try {
        const onPause = mp.game.ui.isPauseMenuActive();
        if (onPause !== bizWarPauseHidden) {
            bizWarPauseHidden = onPause;
            bizWarSyncVisibility();
        }
    } catch (_e) {}
});

function isLocalInWarPanel() {
    try {
        const pl = mp.players.local;
        return pl.getVariable('inBizwar') === true || pl.getVariable('inCapt') === true;
    } catch (_e) {
        return false;
    }
}

function bizWarFormatSec(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
    }
    const text = String(value == null ? '' : value).trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(text);
    if (m) return (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0);
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function bizWarEnsureBrowser() {
    if (!bizWarBrowser || !mp.browsers.exists(bizWarBrowser)) {
        bizWarBrowser = mp.browsers.new('package://Events/BizWar/ui.html');
        try { bizWarBrowser.orderId = 115; } catch (_ord) {}
        bizWarLastActiveState = null;
    }
    return bizWarBrowser;
}

function syncChatTopHudReserve() {
    try {
        if (typeof global.refreshChatTopHudReserve === 'function') {
            global.refreshChatTopHudReserve();
        }
    } catch (_e) {}
}

function bizWarBuildPayload(attacker, defender, attackerCount, defenderCount, prepLeft, totalLeft, totalLeftSec) {
    const prepSec = bizWarFormatSec(prepLeft);
    let time = 0;
    if (prepSec > 0) {
        time = prepSec;
    } else if (totalLeftSec != null && totalLeftSec !== '') {
        time = bizWarFormatSec(totalLeftSec);
    } else if (totalLeft != null && String(totalLeft).trim() !== '') {
        time = bizWarFormatSec(totalLeft);
    }

    return {
        status: true,
        attacker: attacker || '',
        defender: defender || '—',
        time: Math.max(0, time),
        prep: prepSec > 0,
        prepLeft: prepSec,
        attackerCount: Number(attackerCount) || 0,
        defenderCount: Number(defenderCount) || 0
    };
}

function bizWarExecShow(payload) {
    const br = bizWarEnsureBrowser();
    const json = JSON.stringify(payload);
    const apply = () => {
        if (!br || !mp.browsers.exists(br)) return;
        if (!isLocalInWarPanel()) return;
        if (!bizWarPanelActive) {
            bizWarPanelActive = true;
            try { if (br && mp.browsers.exists(br)) br.orderId = 115; } catch (_ord) {}
            syncChatTopHudReserve();
            br.execute(`if(window.bizWarApp&&window.bizWarApp.load)window.bizWarApp.load(${json});`);
        } else {
            br.execute(`if(window.bizWarApp&&window.bizWarApp.update)window.bizWarApp.update(${json});`);
        }
        bizWarSyncVisibility();
    };
    // Do not delay updates to an already visible browser: delaying creates a visible
    // gap at the handoff between preparation and the active battle timer.
    if (bizWarPanelActive) apply();
    else setTimeout(apply, 80);
}

function bizWarShow(attacker, defender, attackerCount, defenderCount, prepLeft, totalLeft, totalLeftSec) {
    if (!isLocalInWarPanel()) return;
    bizWarExecShow(bizWarBuildPayload(
        attacker, defender, attackerCount, defenderCount, prepLeft, totalLeft, totalLeftSec
    ));
}

function bizWarDestroy() {
    bizWarPanelActive = false;
    bizWarLastActiveState = null;
    syncChatTopHudReserve();
    if (bizWarBrowser && mp.browsers.exists(bizWarBrowser)) {
        try {
            bizWarBrowser.execute('if(window.bizWarApp&&window.bizWarApp.hide)window.bizWarApp.hide();');
        } catch (_e) {}
        try {
            bizWarBrowser.destroy();
        } catch (_e2) {}
    }
    bizWarBrowser = null;
}

mp.events.add('captBattle:update', (attacker, defender, attackerCount, defenderCount, prepLeft, totalLeft, _canTeleport, _teleportLeft, totalLeftSec) => {
    if (!isLocalInWarPanel()) {
        bizWarDestroy();
        return;
    }
    try {
        const isCaptive = mp.players.local.getVariable('inCapt') === true;
        const myFamily = String(mp.players.local.getVariable('family') || '').trim();
        global.bizwarCaptFamily = isCaptive ? (myFamily || String(attacker || '').trim() || null) : null;
    } catch (_e) {}
    bizWarShow(attacker, defender, attackerCount, defenderCount, prepLeft, totalLeft, totalLeftSec);
});

mp.events.add('captBattle:hud:show', (attackerName, defenderName) => {
    if (!isLocalInWarPanel()) return;
    bizWarShow(attackerName, defenderName, 0, 0, 0, '00:00', 0);
});

mp.events.add('captBattle:joined', () => {
    if (!isLocalInWarPanel()) return;
    // The first real update carries the names, counts and timer. Do not show a
    // temporary 00:00 panel before it arrives.
});

mp.events.add('captBattle:hide', () => {
    bizWarDestroy();
});
