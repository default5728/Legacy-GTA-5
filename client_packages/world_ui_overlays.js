'use strict';

/** Как в Downloads/moon-dm: скрытие через hud(false) + серверные флаги (shopc, f3key…), без залипшего __worldUiOverlayHidden. */

let _npcDialogModalDepth = 0;
/** После закрытия NPC-диалога (EMS, аренда, угонка и т.д.) — не открывать паузу GTA при спаме ESC. */
const NPC_DIALOG_PAUSE_SUPPRESS_FRAMES = 24;
let npcDialogPauseSuppressFrames = 0;

function blockNpcDialogPauseControls() {
    for (let g = 0; g <= 2; g++) {
        mp.game.controls.disableControlAction(g, 156, true);
        mp.game.controls.disableControlAction(g, 199, true);
        mp.game.controls.disableControlAction(g, 200, true);
    }
}

function suppressPauseAfterNpcDialogClose() {
    npcDialogPauseSuppressFrames = NPC_DIALOG_PAUSE_SUPPRESS_FRAMES;
    if (typeof global.suppressPauseMenuAfterEsc === 'function') {
        global.suppressPauseMenuAfterEsc();
    }
}

global.suppressPauseAfterNpcDialogClose = suppressPauseAfterNpcDialogClose;

function queueOverlayCheck(fn) {
    if (typeof global.registerWorldUiOverlayCheck === 'function') {
        global.registerWorldUiOverlayCheck(fn);
        return;
    }
    global.__pendingWorldUiOverlayChecks = global.__pendingWorldUiOverlayChecks || [];
    global.__pendingWorldUiOverlayChecks.push(fn);
}

global.registerActiveBrowserOverlay = function registerActiveBrowserOverlay(getBrowser) {
    queueOverlayCheck(() => {
        try {
            const b = typeof getBrowser === 'function' ? getBrowser() : null;
            return !!(b && mp.browsers.exists(b) && b.active);
        } catch (_e) {
            return false;
        }
    });
};

global.isNpcDialogModalOpen = function isNpcDialogModalOpen() {
    return _npcDialogModalDepth > 0;
};

global.isGtaPauseMenuOpen = function isGtaPauseMenuOpen() {
    try {
        return !!mp.game.ui.isPauseMenuActive();
    } catch (_e) {
        return false;
    }
};

global.isWorldChromeSuppressedByOverlay = function isWorldChromeSuppressedByOverlay() {
    try {
        if (typeof global.isGtaPauseMenuOpen === 'function' && global.isGtaPauseMenuOpen()) return true;
        if (typeof global.isNpcDialogModalOpen === 'function' && global.isNpcDialogModalOpen()) return true;
        if (typeof global.isAutosalonOpen === 'function' && global.isAutosalonOpen()) return true;
        if (typeof global.isLsCustomOpen === 'function' && global.isLsCustomOpen()) return true;
        if (typeof global.clientWorldChromeBlocked === 'function' && global.clientWorldChromeBlocked()) return true;
    } catch (_e) {}
    return false;
};

function applyWorldUiHiddenNow(opts) {
    const keepMinimap = !!(opts && opts.keepMinimap);
    try {
        if (!keepMinimap) mp.events.call('preworldChromeEnforceHidden');
        mp.events.call('hud', false);
        mp.events.call('help', false);
        mp.events.call('hudKeyHints', false);
        if (!keepMinimap) {
            mp.events.call('minimap', false);
            mp.game.ui.displayRadar(false);
        }
        mp.game.ui.displayHud(false);
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
        if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
        } else {
            mp.events.call('hideChatServer');
        }
    } catch (_e) {}
}

global.hideWorldUiForModal = function hideWorldUiForModal(opts) {
    applyWorldUiHiddenNow(opts);
};

/** Модалки поверх мира с видимой миникартой (карта войны семей/фракций). */
global.hideWorldUiForModalKeepMinimap = function hideWorldUiForModalKeepMinimap() {
    applyWorldUiHiddenNow({ keepMinimap: true });
};

/** Открытие NPC-диалога (EMS, угонка и т.д.): прячем HUD/чат каждый кадр через флаг. */
global.openNpcDialogModal = function openNpcDialogModal(opts) {
    opts = opts || {};
    const first = _npcDialogModalDepth === 0;
    _npcDialogModalDepth++;
    if (first) applyWorldUiHiddenNow();
    try {
        mp.gui.cursor.show(true, true);
        if (opts.freeze !== false) mp.players.local.freezePosition(true);
    } catch (_e) {}
};

global.closeNpcDialogModal = function closeNpcDialogModal(opts) {
    opts = opts || {};
    if (_npcDialogModalDepth <= 0) return;
    _npcDialogModalDepth = Math.max(0, _npcDialogModalDepth - 1);
    if (_npcDialogModalDepth > 0) return;
    try {
        if (opts.unfreeze !== false) mp.players.local.freezePosition(false);
        mp.gui.cursor.show(false, false);
    } catch (_e) {}
    global.showWorldUiAfterModal();
    suppressPauseAfterNpcDialogClose();
};

global.forceCloseNpcDialogModal = function forceCloseNpcDialogModal(opts) {
    _npcDialogModalDepth = 0;
    try {
        if (!opts || opts.unfreeze !== false) mp.players.local.freezePosition(false);
        mp.gui.cursor.show(false, false);
    } catch (_e) {}
    global.showWorldUiAfterModal();
    suppressPauseAfterNpcDialogClose();
};

global.showWorldUiAfterModal = function showWorldUiAfterModal() {
    try {
        if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return;
        if (typeof global.resetChatPresentationCache === 'function') global.resetChatPresentationCache();
        if (typeof global.applyChatPresentation === 'function') {
            global.applyChatPresentation();
            setTimeout(() => {
                try { global.applyChatPresentation(); } catch (_e2) {}
            }, 120);
        }
        if (typeof global !== 'undefined' && global.__worldUiUnlockedForHud !== true) return;
        if (typeof global.invalidateWorldChromeRasterCache === 'function') {
            global.invalidateWorldChromeRasterCache();
        }
        try { mp.events.callRemote('showHud:SERVER'); } catch (_eSrv) {}
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        }
        if (typeof global.scheduleWorldChromeRestoreAfterModal === 'function') {
            global.scheduleWorldChromeRestoreAfterModal();
        }
    } catch (_e) {}
};

global.enforceWorldUiHiddenForOverlay = global.hideWorldUiForModal;
global.restoreWorldUiAfterOverlay = global.showWorldUiAfterModal;

mp.events.add('render', () => {
    if (npcDialogPauseSuppressFrames > 0) {
        npcDialogPauseSuppressFrames--;
        blockNpcDialogPauseControls();
    }
    if (_npcDialogModalDepth > 0) {
        blockNpcDialogPauseControls();
        try {
            mp.gui.chat.show(false);
            mp.gui.chat.activate(false);
            if (typeof global.enforceChatHiddenForOverlay === 'function') {
                global.enforceChatHiddenForOverlay();
            }
        } catch (_e) {}
    }
});

global.forceRestoreWorldUiChrome = function forceRestoreWorldUiChrome() {
    try {
        mp.events.call('hud', true);
        mp.events.call('help', true);
        const hideMap = typeof global.shouldForceHideMinimap === 'function' && global.shouldForceHideMinimap();
        if (hideMap) {
            mp.events.call('c:minimap', false);
            mp.game.ui.displayRadar(false);
        } else {
            mp.events.call('c:minimap', true);
            mp.game.ui.displayRadar(true);
        }
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
        try { mp.events.callRemote('showHud:SERVER'); } catch (_eSrv) {}
        if (typeof global.applyChatPresentation === 'function') global.applyChatPresentation();
    } catch (_e) {}
};
