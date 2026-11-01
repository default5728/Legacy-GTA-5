'use strict';

let _spawnBrowser = null;
let _spawnReady   = false;
let _spawnQueue   = [];
let _spawnCam     = null;
let _spawnActive  = false;
let _spawnPayload = null;
let _spawnSelected = '';
let _awaitingSpawnSelect = false;
let _spawnFinishFallbackTimer = null;
let _spawnCamMoving = false;
let _spawnCamPanTimer = null;
let _spawnCamPanGen = 0;
let _spawnCamAt = null;
let _spawnCamViewKey = null;
let _spawnCamZoomed = false;

const SPAWN_CAM_PAN_MS = 700;
const SPAWN_COORD_EPS = 0.75;
const SPAWN_FOCUS_ZOOM_DELTA = 320;
const SPAWN_FOCUS_MIN_HEIGHT = 400;
const DEFAULT_CAM_HEIGHT = 1150;
const LOBBY_CAM_HEIGHT = 1150;
const PREVIEW_CAM_HEIGHT = 1150;
const SPAWN_CAM_FOV = 48;
const LOBBY_PREVIEW_POS = { x: -257.0074157714844, y: -313.1483459472656, z: 1993.0535888671875 };

function showSpawnCursor() {
    try { mp.gui.cursor.show(true, true); } catch (_e) {}
    try { mp.gui.cursor.visible = true; } catch (_e2) {}
}

function refocusSpawnBrowser() {
    try {
        const b = _spawnBrowser;
        if (!b || !mp.browsers.exists(b) || !b.active) return;
        b.execute("try{if(typeof mp!=='undefined'&&mp.invoke)mp.invoke('focus',true);}catch(_e){}");
    } catch (_e) {}
}

function suppressChatDuringSpawn() {
    try {
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    } catch (_e0) {}
    try { mp.events.call('hideChatServer'); } catch (_e1) {}
    try {
        if (typeof global.applyChatPresentation === 'function') global.applyChatPresentation();
        else if (typeof global.chatr !== 'undefined' && global.chatr && mp.browsers.exists(global.chatr)) {
            global.chatr.execute('typeof hideChat==="function"&&hideChat();');
        }
    } catch (_e2) {}
}

function restoreChatAfterSpawnIfNeeded() {
    try {
        if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return;
        if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) return;
    } catch (_eGate) {}
    try {
        if (typeof global.restoreChatAfterWorldEnter === 'function') global.restoreChatAfterWorldEnter();
        else if (typeof global.applyChatPresentation === 'function') global.applyChatPresentation();
        else mp.events.call('showChatServer');
    } catch (_eChat) {}
}

/** Логин ставит cursor.show(true, true) + freeze. Last-pos спавн раньше только прятал курсор — GTA E / стрельба / склад не работали, пока не закроешь меню на M. */
function releaseGameplayInputAfterWorldEnter() {
    try {
        if (_spawnActive || _awaitingSpawnSelect) return;
    } catch (_eGate) {}
    try {
        if (typeof global.destroyAuthChromeFully === 'function') global.destroyAuthChromeFully();
    } catch (_eAuth) {}
    try { mp.events.call('removeCamera'); } catch (_eCam) {}
    try { mp.gui.cursor.show(false, false); } catch (_e1) {}
    try { mp.gui.cursor.visible = false; } catch (_e2) {}
    try { global.__cefTextInputOpen = false; } catch (_eCef) {}
    try {
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    } catch (_eChatIn) {}
    try {
        const lp = mp.players.local;
        if (lp) {
            lp.freezePosition(false);
            lp.setVisible(true, false);
            lp.setAlpha(255);
        }
    } catch (_e3) {}
    try { mp.gui.chat.activate(true); } catch (_e4) {}
}

if (typeof global !== 'undefined') {
    global.releaseGameplayInputAfterWorldEnter = releaseGameplayInputAfterWorldEnter;
}
function suppressAuthChromeDuringSpawn() {
    try {
        if (typeof global.destroyAuthChromeFully === 'function') global.destroyAuthChromeFully();
    } catch (_e) {}
}

function suppressInventoryDuringSpawn() {
    try {
        if (typeof global.__invSuppressDuringSpawn === 'function') global.__invSuppressDuringSpawn();
    } catch (_e) {}
}

function clearSpawnFinishFallback() {
    if (_spawnFinishFallbackTimer) {
        clearTimeout(_spawnFinishFallbackTimer);
        _spawnFinishFallbackTimer = null;
    }
}

function scheduleSpawnFinishFallback() {
    clearSpawnFinishFallback();
    _spawnFinishFallbackTimer = setTimeout(() => {
        _spawnFinishFallbackTimer = null;
        if (_spawnActive) finishSpawnSelect();
    }, 15000);
}

function getSpawnBrowser() {
    if (_spawnBrowser && mp.browsers.exists(_spawnBrowser)) return _spawnBrowser;
    _spawnReady = false;
    _spawnQueue = [];
    _spawnBrowser = mp.browsers.new('package://browsers/spawnselect/index.html');
    _spawnBrowser.active = false;
    try { _spawnBrowser.orderId = 150; } catch (_ord) {}
    return _spawnBrowser;
}

mp.events.add('spawnselect:prefetch', () => {
    try { getSpawnBrowser(); } catch (_e) {}
});

function setSpawnBrowserVisible(visible) {
    const b = _spawnBrowser;
    if (b && mp.browsers.exists(b)) b.active = !!visible;
}

function spawnExec(code) {
    const b = getSpawnBrowser();
    if (!mp.browsers.exists(b)) return;
    if (_spawnReady) {
        try { b.execute(code); } catch (_) {}
    } else {
        _spawnQueue.push(code);
    }
}

function destroySpawnCamera() {
    try {
        if (_spawnCam && mp.cameras.exists(_spawnCam)) {
            _spawnCam.setActive(false);
            _spawnCam.destroy();
        }
    } catch (_e) {}
    _spawnCam = null;
    try {
        mp.game.cam.renderScriptCams(false, true, 400, true, false);
    } catch (_e2) {}
}

function hideLocalForSpawnPreview(hide) {
    try {
        const lp = mp.players.local;
        if (!lp) return;
        if (hide) {
            lp.setAlpha(0);
            lp.freezePosition(true);
        } else {
            lp.setVisible(true, false);
            lp.setAlpha(255);
            lp.freezePosition(false);
        }
    } catch (_e) {}
}

function syncLocalPreviewPos(x, y, z) {
    try {
        const lp = mp.players.local;
        if (!lp) return;
        lp.freezePosition(true);
        lp.setAlpha(0);
        lp.position = new mp.Vector3(Number(x), Number(y), Number(z));
    } catch (_e) {}
}

function rememberSpawnCamAt(x, y, z) {
    _spawnCamAt = { x: Number(x), y: Number(y), z: Number(z) };
}

function spawnCoordsEqual(a, b) {
    if (!a || !b) return false;
    return (
        Math.abs(Number(a.x) - Number(b.x)) < SPAWN_COORD_EPS &&
        Math.abs(Number(a.y) - Number(b.y)) < SPAWN_COORD_EPS &&
        Math.abs(Number(a.z) - Number(b.z)) < SPAWN_COORD_EPS
    );
}

function clearSpawnCamPanTimer() {
    if (_spawnCamPanTimer) {
        clearTimeout(_spawnCamPanTimer);
        _spawnCamPanTimer = null;
    }
}

function releaseSpawnCamLock() {
    _spawnCamMoving = false;
    clearSpawnCamPanTimer();
    spawnExec('try{SpawnSelect.setWaitCamera(false);}catch(_e){}');
    showSpawnCursor();
    refocusSpawnBrowser();
}

function isPanGenCurrent(panGen) {
    return panGen === _spawnCamPanGen;
}

function scheduleCamStep(panGen, delayMs, fn) {
    clearSpawnCamPanTimer();
    _spawnCamPanTimer = setTimeout(() => {
        _spawnCamPanTimer = null;
        if (!isPanGenCurrent(panGen)) return;
        fn();
    }, Math.max(0, Number(delayMs) || 0));
}

function activateScriptCams() {
    try { mp.game.cam.renderScriptCams(true, true, 0, true, false); } catch (_e) {}
}

function createTopDownCam(x, y, z, height) {
    destroySpawnCamera();
    try { mp.events.call('removeCamera'); } catch (_e) {}
    const h = Number(height) || DEFAULT_CAM_HEIGHT;
    _spawnCam = mp.cameras.new('default', new mp.Vector3(x, y, z + h), new mp.Vector3(0, 0, 0), SPAWN_CAM_FOV);
    _spawnCam.pointAtCoord(x, y, z);
    _spawnCam.setActive(true);
    mp.game.cam.renderScriptCams(true, true, 450, true, false);
    _spawnCamZoomed = false;
    rememberSpawnCamAt(x, y, z);
}

function panSpawnCamTo(x, y, z, height, durationMs, panGen, onDone) {
    const h = Number(height) || PREVIEW_CAM_HEIGHT;
    const dur = Math.max(300, Number(durationMs) || SPAWN_CAM_PAN_MS);
    const target = mp.cameras.new('default', new mp.Vector3(x, y, z + h), new mp.Vector3(0, 0, 0), SPAWN_CAM_FOV);
    target.pointAtCoord(x, y, z);

    const finish = () => {
        if (!isPanGenCurrent(panGen)) return;
        clearSpawnCamPanTimer();
        _spawnCamZoomed = false;
        rememberSpawnCamAt(x, y, z);
        if (typeof onDone === 'function') onDone();
    };

    syncLocalPreviewPos(x, y, z);

    if (_spawnCam && mp.cameras.exists(_spawnCam)) {
        activateScriptCams();
        target.setActiveWithInterp(_spawnCam.handle, dur, 1, 1);
        scheduleCamStep(panGen, dur + 30, () => {
            try {
                if (_spawnCam && mp.cameras.exists(_spawnCam)) _spawnCam.destroy();
            } catch (_e) {}
            _spawnCam = target;
            finish();
        });
        return;
    }

    _spawnCam = target;
    _spawnCam.setActive(true);
    mp.game.cam.renderScriptCams(true, true, 300, true, false);
    scheduleCamStep(panGen, dur + 30, finish);
}

function zoomSpawnCamFocus(x, y, z, height, durationMs, panGen, onDone) {
    const h = Number(height) || PREVIEW_CAM_HEIGHT;
    const closeH = Math.max(SPAWN_FOCUS_MIN_HEIGHT, h - SPAWN_FOCUS_ZOOM_DELTA);
    const dur = Math.max(300, Number(durationMs) || SPAWN_CAM_PAN_MS);
    const closeCam = mp.cameras.new('default', new mp.Vector3(x, y, z + closeH), new mp.Vector3(0, 0, 0), SPAWN_CAM_FOV);
    closeCam.pointAtCoord(x, y, z);

    const finish = () => {
        if (!isPanGenCurrent(panGen)) return;
        clearSpawnCamPanTimer();
        _spawnCamZoomed = true;
        rememberSpawnCamAt(x, y, z);
        if (typeof onDone === 'function') onDone();
    };

    syncLocalPreviewPos(x, y, z);

    if (_spawnCam && mp.cameras.exists(_spawnCam)) {
        activateScriptCams();
        closeCam.setActiveWithInterp(_spawnCam.handle, dur, 1, 1);
        scheduleCamStep(panGen, dur + 30, () => {
            try {
                if (_spawnCam && mp.cameras.exists(_spawnCam)) _spawnCam.destroy();
            } catch (_e) {}
            _spawnCam = closeCam;
            finish();
        });
        return;
    }

    _spawnCam = closeCam;
    _spawnCamZoomed = true;
    _spawnCam.setActive(true);
    mp.game.cam.renderScriptCams(true, true, 300, true, false);
    scheduleCamStep(panGen, dur + 30, finish);
}

function riseOverviewThenPan(x, y, z, height, durationMs, panGen, onDone) {
    const h = Number(height) || PREVIEW_CAM_HEIGHT;
    const dur = Math.max(300, Number(durationMs) || SPAWN_CAM_PAN_MS);
    const from = _spawnCamAt || { x, y, z };
    const riseDur = Math.max(250, Math.floor(dur * 0.4));
    const overviewCam = mp.cameras.new(
        'default',
        new mp.Vector3(from.x, from.y, from.z + h),
        new mp.Vector3(0, 0, 0),
        SPAWN_CAM_FOV
    );
    overviewCam.pointAtCoord(from.x, from.y, from.z);

    if (!_spawnCam || !mp.cameras.exists(_spawnCam)) {
        _spawnCamZoomed = false;
        panSpawnCamTo(x, y, z, h, dur, panGen, onDone);
        return;
    }

    activateScriptCams();
    overviewCam.setActiveWithInterp(_spawnCam.handle, riseDur, 1, 1);
    scheduleCamStep(panGen, riseDur + 30, () => {
        try {
            if (_spawnCam && mp.cameras.exists(_spawnCam)) _spawnCam.destroy();
        } catch (_e) {}
        _spawnCam = overviewCam;
        _spawnCamZoomed = false;
        rememberSpawnCamAt(from.x, from.y, from.z);
        panSpawnCamTo(x, y, z, h, dur, panGen, onDone);
    });
}

function resolveInitialCamCoords(payload) {
    if (!payload) return null;
    if (Array.isArray(payload.initialCamCoords) && payload.initialCamCoords.length >= 3) {
        return {
            x: Number(payload.initialCamCoords[0]),
            y: Number(payload.initialCamCoords[1]),
            z: Number(payload.initialCamCoords[2])
        };
    }
    if (payload.defaultCamKey) {
        const c = getOptionCoordsFromPayload(payload, payload.defaultCamKey);
        if (c) return c;
    }
    const first = payload.spawnOptions && payload.spawnOptions[0];
    if (!first) return null;
    return { x: Number(first.x), y: Number(first.y), z: Number(first.z) };
}

function getOptionCoordsFromPayload(payload, key) {
    if (!payload || !Array.isArray(payload.spawnOptions)) return null;
    const opt = payload.spawnOptions.find((o) => o.key === key);
    if (!opt) return null;
    return { x: Number(opt.x), y: Number(opt.y), z: Number(opt.z), h: Number(opt.h) || 0 };
}

function getSpawnCamHeight() {
    if (_spawnPayload && Number(_spawnPayload.camHeight) > 0) {
        return Number(_spawnPayload.camHeight);
    }
    return LOBBY_CAM_HEIGHT;
}

function getOptionCoords(key) {
    if (!_spawnPayload || !_spawnPayload.spawnOptions) return null;
    const opt = _spawnPayload.spawnOptions.find((o) => o.key === key);
    if (!opt) return null;
    return { x: Number(opt.x), y: Number(opt.y), z: Number(opt.z), h: Number(opt.h) || 0 };
}

function previewSpawnLocation(key, panGen) {
    const c = getOptionCoords(key);
    if (!c) {
        spawnExec('try{SpawnSelect.setSelected(null);SpawnSelect.setWaitCamera(false);}catch(_e){}');
        releaseSpawnCamLock();
        return;
    }

    const prevKey = _spawnCamViewKey;
    const h = getSpawnCamHeight();
    const sameGround = _spawnCamAt && spawnCoordsEqual(_spawnCamAt, c);
    const finish = () => {
        if (!isPanGenCurrent(panGen)) return;
        _spawnCamViewKey = key;
        releaseSpawnCamLock();
    };

    if (prevKey === null && sameGround && !_spawnCamZoomed) {
        zoomSpawnCamFocus(c.x, c.y, c.z, h, SPAWN_CAM_PAN_MS, panGen, finish);
        return;
    }

    if (_spawnCamZoomed && (!sameGround || prevKey !== key)) {
        riseOverviewThenPan(c.x, c.y, c.z, h, SPAWN_CAM_PAN_MS, panGen, finish);
        return;
    }

    panSpawnCamTo(c.x, c.y, c.z, h, SPAWN_CAM_PAN_MS, panGen, finish);
}

function dismissSpawnSelectUiInstant() {
    setSpawnBrowserVisible(false);
    mp.gui.cursor.show(false, false);
    spawnExec('try{SpawnSelect.dismissInstant();}catch(_e){}');
}

function finishSpawnSelect() {
    clearSpawnFinishFallback();
    _spawnCamMoving = false;
    _spawnCamPanGen++;
    clearSpawnCamPanTimer();
    _spawnActive = false;
    _awaitingSpawnSelect = false;
    _spawnPayload = null;
    _spawnSelected = '';
    _spawnCamAt = null;
    _spawnCamViewKey = null;
    _spawnCamZoomed = false;
    hideLocalForSpawnPreview(false);
    destroySpawnCamera();
    setSpawnBrowserVisible(false);
    releaseGameplayInputAfterWorldEnter();
    restoreChatAfterSpawnIfNeeded();
    spawnExec('try{SpawnSelect.close();}catch(_e){}');
}

if (typeof global !== 'undefined') {
    global.isSpawnSelectActive = function () {
        return !!(_spawnActive || _awaitingSpawnSelect);
    };
    global.isAwaitingSpawnSelect = function () {
        return !!_awaitingSpawnSelect;
    };
    global.getSpawnSelectBrowser = function () {
        return _spawnBrowser && mp.browsers.exists(_spawnBrowser) ? _spawnBrowser : null;
    };
}

if (typeof global.registerActiveBrowserOverlay === 'function') {
    global.registerActiveBrowserOverlay(() => {
        if (!_spawnActive) return null;
        const b = _spawnBrowser;
        return b && mp.browsers.exists(b) && b.active ? b : null;
    });
}

mp.events.add('spawnselect:browser:ready', () => {
    _spawnReady = true;
    _spawnQueue.forEach((c) => {
        try {
            if (_spawnBrowser && mp.browsers.exists(_spawnBrowser)) _spawnBrowser.execute(c);
        } catch (_) {}
    });
    _spawnQueue = [];
});

mp.events.add('spawnselect:await', () => {
    _awaitingSpawnSelect = true;
    suppressChatDuringSpawn();
    suppressInventoryDuringSpawn();
    hideLocalForSpawnPreview(true);
    try { getSpawnBrowser(); } catch (_e) {}
    mp.gui.chat.activate(false);
});

mp.events.add('spawnselect:show:c', (payloadJson) => {
    let payload;
    try {
        payload = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
    } catch (_e) {
        return;
    }
    if (!payload || !Array.isArray(payload.spawnOptions) || !payload.spawnOptions.length) return;

    _awaitingSpawnSelect = false;
    _spawnPayload = payload;
    _spawnSelected = '';
    _spawnActive = true;
    _spawnCamViewKey = null;
    _spawnCamZoomed = false;
    _spawnCamPanGen++;
    clearSpawnCamPanTimer();
    suppressChatDuringSpawn();
    suppressAuthChromeDuringSpawn();
    suppressInventoryDuringSpawn();

    try { mp.events.call('closemenu'); } catch (_e) {}
    try { mp.events.call('removeCamera'); } catch (_e2) {}

    getSpawnBrowser();
    setSpawnBrowserVisible(true);
    showSpawnCursor();
    refocusSpawnBrowser();
    mp.gui.chat.activate(false);
    hideLocalForSpawnPreview(true);

    const initCam = resolveInitialCamCoords(payload);
    if (initCam) {
        syncLocalPreviewPos(initCam.x, initCam.y, initCam.z);
        createTopDownCam(initCam.x, initCam.y, initCam.z, getSpawnCamHeight());
    } else {
        createTopDownCam(LOBBY_PREVIEW_POS.x, LOBBY_PREVIEW_POS.y, LOBBY_PREVIEW_POS.z, LOBBY_CAM_HEIGHT);
    }

    spawnExec(`try{SpawnSelect.open(${JSON.stringify(payload)});}catch(_e){}`);
});

mp.events.add('spawnselect:preview', (key) => {
    if (!_spawnActive || !_spawnPayload) return;

    const k = String(key || '');
    if (!getOptionCoords(k)) {
        spawnExec('try{SpawnSelect.setWaitCamera(false);}catch(_e){}');
        return;
    }

    const panGen = ++_spawnCamPanGen;
    clearSpawnCamPanTimer();
    _spawnCamMoving = true;
    suppressAuthChromeDuringSpawn();
    _spawnSelected = k;

    spawnExec('try{SpawnSelect.setWaitCamera(true);}catch(_e){}');
    spawnExec(`try{SpawnSelect.setSelected(${JSON.stringify(_spawnSelected)});}catch(_e){}`);
    showSpawnCursor();
    previewSpawnLocation(_spawnSelected, panGen);
});

mp.events.add('spawnselect:confirm', (key, fraction) => {
    if (!_spawnActive) return;
    const payload = _spawnPayload;
    const k = String(key || _spawnSelected || 'fraction');
    const frac = String(fraction || (payload && payload.fraction) || 0);

    dismissSpawnSelectUiInstant();
    _spawnCamMoving = false;
    _spawnCamPanGen++;
    clearSpawnCamPanTimer();
    destroySpawnCamera();

    scheduleSpawnFinishFallback();
    mp.events.callRemote('spawnselect:confirm:s', k, frac);
});

mp.events.add('spawnselect:cancel', () => {
    if (!_spawnActive) {
        const wasAwaiting = _awaitingSpawnSelect;
        _awaitingSpawnSelect = false;
        hideLocalForSpawnPreview(false);
        destroySpawnCamera();
        setSpawnBrowserVisible(false);
        spawnExec('try{SpawnSelect.close && SpawnSelect.close();}catch(_e){}');
        if (wasAwaiting) {
            releaseGameplayInputAfterWorldEnter();
            restoreChatAfterSpawnIfNeeded();
            try { mp.events.call('lobbySpawnComplete'); } catch (_e) {}
        }
        return;
    }
    finishSpawnSelect();
});

mp.events.add('spawnselect:choose', (key, fraction) => {
    mp.events.call('spawnselect:confirm', key, fraction);
});

mp.events.add('spawnselect:done:c', () => {
    const wasActive = _spawnActive;
    _awaitingSpawnSelect = false;
    try {
        if (wasActive) finishSpawnSelect();
        else {
            hideLocalForSpawnPreview(false);
            destroySpawnCamera();
            releaseGameplayInputAfterWorldEnter();
        }
    } catch (_e) {}
    restoreChatAfterSpawnIfNeeded();
    try { mp.events.call('lobbySpawnComplete'); } catch (_e2) {}
    try { mp.events.callRemote('showHud:SERVER'); } catch (_e3) {}
    // Логин/await могут ещё один кадр вернуть freeze — повторяем съём блокировки.
    try {
        setTimeout(() => { try { releaseGameplayInputAfterWorldEnter(); } catch (_eR0) {} }, 0);
        setTimeout(() => { try { releaseGameplayInputAfterWorldEnter(); } catch (_eR1) {} }, 250);
    } catch (_eRetry) {}
});

mp.events.add('render', () => {
    if (!_spawnActive) return;
    if (!mp.gui.cursor.visible) showSpawnCursor();
    try { mp.game.ui.hideHudAndRadarThisFrame(); } catch (_e) {}
    try {
        mp.game.ui.displayHud(false);
        mp.game.ui.displayRadar(false);
    } catch (_e2) {}
});
