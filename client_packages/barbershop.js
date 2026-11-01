let inCallShape = false;
let customCamera = null;
let barberBrowserReady = false;
let barberOpenPending = false;
let barberCamMode = 0; // 0 face, 1 chest
/** Фиксированная позиция камеры в мире — крутится только пед (как в тату). */
let barberCamFixed = null;
let barberLookZ = 0.68;

function executeBarberOpen() {
    if (!brrs || !mp.browsers.exists(brrs) || !brrs.active) return;
    try {
        const isFemale = mp.players.local.model === mp.game.joaat('mp_f_freemode_01');
        let maxHair = 73;
        try {
            const n = mp.players.local.getNumberOfDrawableVariations(2);
            if (Number.isFinite(n) && n > 0) maxHair = Math.max(0, n - 1);
        } catch (_eMax) {}
        brrs.execute(
            'if (typeof barberSetMaxHairDrawable === "function") barberSetMaxHairDrawable(' + maxHair + ');' +
            'if (typeof barberSetGender === "function") barberSetGender(' + isFemale + ');' +
            'if (typeof changeBarberShopDisplay === "function") changeBarberShopDisplay("open");'
        );
    } catch (_e) {}
}

function barberCamOffsets(mode) {
    if (mode === 1) return { dist: 1.55, height: 0.35, lookZ: 0.25, fov: 42 };
    return { dist: 0.95, height: 0.68, lookZ: 0.68, fov: 36 };
}

function pointBarberCameraAtPed() {
    if (!customCamera) return;
    const ped = mp.players.local;
    if (!ped || !ped.handle) return;
    const pos = ped.position;
    try {
        customCamera.pointAtCoord(pos.x, pos.y, pos.z + barberLookZ);
    } catch (_e) {}
}

/** Камера ставится один раз перед лицом; дальше пед крутится под ней. */
function setBarberCamera(mode, forceReanchor) {
    barberCamMode = mode === 1 ? 1 : 0;
    const off = barberCamOffsets(barberCamMode);
    barberLookZ = off.lookZ;

    const ped = mp.players.local;
    if (!ped || !ped.handle) return;
    const pos = ped.position;

    if (forceReanchor || !barberCamFixed) {
        const heading = ped.getHeading();
        const rad = (heading * Math.PI) / 180;
        barberCamFixed = {
            x: pos.x - Math.sin(rad) * off.dist,
            y: pos.y + Math.cos(rad) * off.dist,
            z: pos.z + off.height
        };
    } else {
        // Смена режима (лицо/торс): только высота, XY камеры не трогаем
        barberCamFixed.z = pos.z + off.height;
    }

    if (customCamera) {
        try {
            customCamera.setActive(false);
            customCamera.destroy();
        } catch (_e) {}
        customCamera = null;
    }

    customCamera = mp.cameras.new(
        'default',
        new mp.Vector3(barberCamFixed.x, barberCamFixed.y, barberCamFixed.z),
        new mp.Vector3(0, 0, 0),
        off.fov
    );
    customCamera.pointAtCoord(pos.x, pos.y, pos.z + barberLookZ);
    customCamera.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
}

function destroyBarberCamera() {
    if (customCamera) {
        try {
            customCamera.setActive(false);
            customCamera.destroy();
        } catch (_e) {}
        customCamera = null;
    }
    barberCamFixed = null;
    mp.game.cam.renderScriptCams(false, false, 0, true, false);
}

var _0x54f30c = mp.game.graphics.getScreenActiveResolution(0, 0);
let _0x3ee283 = 800, _0x4c37e8, _0x258f5a = [0, 0];

/** Как в donate_clothes_shop / casino: пока барбершоп открыт — глушим паузу GTA, чтобы ESC не открывал карту. */
const BARBERSHOP_PAUSE_SUPPRESS_FRAMES = 24;
let barbershopPauseSuppressFrames = 0;

function blockBarbershopPauseControls() {
    for (let g = 0; g <= 2; g++) {
        mp.game.controls.disableControlAction(g, 156, true);
        mp.game.controls.disableControlAction(g, 199, true);
        mp.game.controls.disableControlAction(g, 200, true);
    }
}

function suppressPauseAfterBarbershopClose() {
    barbershopPauseSuppressFrames = BARBERSHOP_PAUSE_SUPPRESS_FRAMES;
    if (typeof global.suppressPauseMenuAfterEsc === 'function') {
        global.suppressPauseMenuAfterEsc();
    }
}

mp.events.add('render', () => {
    if (barbershopPauseSuppressFrames > 0) {
        barbershopPauseSuppressFrames--;
        blockBarbershopPauseControls();
    }
    if (!brrs || !mp.browsers.exists(brrs) || !brrs.active) return;
    blockBarbershopPauseControls();
});

mp.events.add('render', () => {
    if (customCamera !== null && customCamera.isActive()) {
        mp.game.controls.disableAllControlActions(0);
        mp.game.controls.disableAllControlActions(1);
        mp.game.controls.disableAllControlActions(2);
        const cursor = mp.gui.cursor.position;
        const delta = {
            x: cursor[0] - _0x258f5a[0],
            y: cursor[1] - _0x258f5a[1]
        };
        delta.x /= _0x54f30c.x;
        delta.y /= _0x54f30c.y;
        if (_0x4c37e8 == 'z') {
            const rot = mp.players.local.getRotation(2);
            mp.players.local.setRotation(rot.x, rot.y, rot.z + delta.x * _0x3ee283 * 0.6, 1, true);
            mp.players.local.setHeading(mp.players.local.getHeading());
            pointBarberCameraAtPed();
        }
        _0x258f5a = cursor;
    }
});

mp.events.add('click', (_0x1d9ec3, _0x4bd4b5, _0x1f3b7d) => {
    if (_0x1f3b7d == 'up') {
        _0x4c37e8 = '';
    } else if (_0x1f3b7d == 'down') {
        const _clickX = typeof _0x1d9ec3 === 'number' ? _0x1d9ec3 : 9999;
        const res = _0x54f30c || mp.game.graphics.getScreenActiveResolution(0, 0);
        const w = (res && res.x) || 1920;
        if (_clickX > 380 && _clickX < w - 380 && customCamera !== null && customCamera.isActive()) {
            _0x4c37e8 = 'z';
        }
    }
});

brrs = mp.browsers.new('package://browsers/barbershop/index.html');
brrs.active = false;

if (typeof global.registerActiveBrowserOverlay === 'function') {
    global.registerActiveBrowserOverlay(() => brrs);
}

global.isBarberShopOpen = function isBarberShopOpen() {
    try {
        return !!(brrs && mp.browsers.exists(brrs) && brrs.active);
    } catch (_e) {
        return false;
    }
};

mp.events.add('barber:ready:c', () => {
    barberBrowserReady = true;
    if (barberOpenPending && brrs && brrs.active) {
        barberOpenPending = false;
        executeBarberOpen();
    }
});

mp.events.add('updateColshapeStatus2', (status) => {
    inCallShape = status;
});

function openWorldBarber(approved = false) {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (!approved && !mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;

    if (inCallShape || approved) {
        if (brrs.active) return;
        brrs.active = true;
        mp.events.callRemote('teleportToLocation2', 'teleportCoords');
        mp.gui.cursor.show(true, true);
        mp.events.call('c:minimap', false);
        mp.gui.chat.show(false);
        mp.events.callRemote('s:setvarshopc', true);
        mp.events.call('hud', false);
        try {
            const _hd = mp.players.local.getPropIndex(0);
            if (_hd >= 0 && _hd !== 8) {
                try { mp.players.local.clearProp(0); } catch (_e) {}
                try { mp.players.local.setPropIndex(0, -1, 0, true); } catch (_e2) {}
            }
        } catch (_e3) {}
        // Сброс delayed hair-replay до примерки
        try {
            global.__hatHairApplyGen = (global.__hatHairApplyGen || 0) + 1;
            if (Array.isArray(global.__hatHairApplyTimers)) {
                for (let i = 0; i < global.__hatHairApplyTimers.length; i++) {
                    try { clearTimeout(global.__hatHairApplyTimers[i]); } catch (_eC) {}
                }
                global.__hatHairApplyTimers = [];
            }
            if (typeof global.resetHatHairState === 'function') global.resetHatHairState();
        } catch (_e4) {}
        // Первый якорь камеры после телепорта
        barberCamFixed = null;
        setTimeout(() => setBarberCamera(0, true), 80);
        setTimeout(() => setBarberCamera(0, true), 250);
        setTimeout(() => setBarberCamera(0, false), 500);
        if (barberBrowserReady) executeBarberOpen();
        else {
            barberOpenPending = true;
            setTimeout(executeBarberOpen, 120);
            setTimeout(executeBarberOpen, 400);
            setTimeout(executeBarberOpen, 900);
        }
    }
}
global.bindGameplayKey(0x45,true,()=>{if(typeof global.isWorldNpcNearby==='function'&&global.isWorldNpcNearby())return;openWorldBarber();});
mp.events.add('legacy:world:barber',()=>openWorldBarber(true));

mp.events.add('barber:setcamera:c', (mode) => {
    if (!brrs || !brrs.active) return;
    setBarberCamera(mode, false);
});

mp.events.add('barber:close:c', () => {
    barberOpenPending = false;
    try {
        if (brrs && mp.browsers.exists(brrs)) {
            brrs.execute('if (typeof changeBarberShopDisplay === "function") changeBarberShopDisplay("close");');
        }
    } catch (_e) {}
    mp.events.callRemote('teleportToLocation2', 'exitCoords');
    try { mp.events.callRemote('barber:appearance:revert:s'); } catch (_e) {}
    destroyBarberCamera();
    try { mp.events.callRemote('barber:makeup:resync:s'); } catch (_e) {}
    mp.events.call('c:minimap', true);
    mp.gui.cursor.show(false, false);
    mp.events.callRemote('showHud:SERVER');
    mp.gui.chat.show(false);
    mp.events.callRemote('s:setvarshopc', false);
    brrs.active = false;
    suppressPauseAfterBarbershopClose();
    if (typeof global.forceHatHairResync === 'function') global.forceHatHairResync();
    else if (typeof global.resetHatHairState === 'function') global.resetHatHairState();
});

mp.events.add('barber:rotate:c', (deltaX) => {
    try {
        if (!brrs || !brrs.active) return;
        const d = Number(deltaX);
        if (!Number.isFinite(d) || d === 0) return;
        const ped = mp.players.local;
        const rot = ped.getRotation(2);
        ped.setRotation(rot.x, rot.y, rot.z + d * 0.35, 1, true);
        ped.setHeading(ped.getHeading());
        // Камеру НЕ двигаем — только смотрим на педа
        pointBarberCameraAtPed();
    } catch (_e) {}
});

mp.events.add('barber:makeup:demo:local', function (styleId, opacity) {
    try {
        mp.players.local.setHeadOverlay(4, parseInt(styleId, 10), parseFloat(opacity), 0, 0);
    } catch (_e) {}
});

mp.events.add('barber:eyebrows:demo', function (styleId, colorId) {
    try {
        const lp = mp.players.local;
        lp.setHeadOverlay(2, parseInt(styleId, 10), 1.0, 1, 1);
        lp.setHeadOverlayColor(2, 1, parseInt(colorId, 10) || 0, 0);
    } catch (_e) {}
});

mp.events.add('barber:beard:demo', function (styleId, colorId) {
    try {
        const lp = mp.players.local;
        const s = parseInt(styleId, 10);
        lp.setHeadOverlay(1, s, s === 255 ? 0.0 : 1.0, 1, 1);
        lp.setHeadOverlayColor(1, 1, parseInt(colorId, 10) || 0, 0);
    } catch (_e) {}
});

mp.events.add('barber:eyecolor:demo', function (value) {
    try { mp.players.local.setEyeColor(parseInt(value, 10) || 0); } catch (_e) {}
});

mp.events.add('barber:haircolor:demo', function (color, highlight) {
    try {
        const c = parseInt(color, 10) || 0;
        const h = highlight === undefined || highlight === null || highlight === ''
            ? c
            : (parseInt(highlight, 10) || 0);
        mp.players.local.setHairColor(c, h);
    } catch (_e) {}
});

/** Примерка причёски только локально — без server/canonical/delayed sync (убирает дёрганье). */
mp.events.add('barber:hair:demo', function (drawable, texture) {
    try {
        if (!brrs || !brrs.active) return;
        const ped = mp.players.local;
        if (!ped || !ped.handle) return;
        let d = parseInt(drawable, 10);
        let t = parseInt(texture, 10);
        if (!Number.isFinite(d) || d < 0) d = 0;
        if (!Number.isFinite(t) || t < 0) t = 0;
        try {
            const max = ped.getNumberOfDrawableVariations(2);
            if (Number.isFinite(max) && max > 0 && d >= max) return;
        } catch (_eMax) {}
        // Инвалидируем delayed hat/DLC-replays
        global.__hatHairApplyGen = (global.__hatHairApplyGen || 0) + 1;
        if (Array.isArray(global.__hatHairApplyTimers)) {
            for (let i = 0; i < global.__hatHairApplyTimers.length; i++) {
                try { clearTimeout(global.__hatHairApplyTimers[i]); } catch (_eT) {}
            }
            global.__hatHairApplyTimers = [];
        }
        ped.setComponentVariation(2, d, t, 0);
    } catch (_e) {}
});

mp.events.add('barber:appearance:buy:c', function (category, a, b) {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('barber:appearance:buy:s', category, a, b === undefined || b === null ? 0 : b);
});

mp.events.add('barber:makeup:buy:c', function (styleId, opacity) {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('barber:makeup:buy:s', styleId, opacity);
});

mp.events.add('barber:buy:c', (name, hairColor, hairHighlight) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    const colRaw = hairColor === undefined || hairColor === null || hairColor === '' ? -1 : parseInt(String(hairColor), 10);
    const hiRaw = hairHighlight === undefined || hairHighlight === null || hairHighlight === '' ? colRaw : parseInt(String(hairHighlight), 10);
    mp.events.callRemote(
        'barber:buy:s',
        name,
        Number.isFinite(colRaw) ? colRaw : -1,
        Number.isFinite(hiRaw) ? hiRaw : -1
    );
});

function barberTryArrow(delta) {
    if (!brrs || !mp.browsers.exists(brrs) || !brrs.active) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    try {
        brrs.execute('if (typeof barberShopOnArrow === "function") barberShopOnArrow(' + delta + ');');
    } catch (_e) {}
}

global.bindGameplayKey(0x26, true, () => barberTryArrow(-1));
global.bindGameplayKey(0x28, true, () => barberTryArrow(1));

// Tab не должен оставлять focus-рамку на списке в CEF
global.bindGameplayKey(0x09, true, () => {
    try {
        if (!brrs || !brrs.active) return;
        brrs.execute(
            'try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}catch(e){}'
        );
    } catch (_e) {}
});

mp.events.add('barber:setdemo:c', (name) => {
    // Совместимость: больше не гоняем сервер на каждый клик — только локальная примерка
    try {
        if (!brrs || !brrs.active) return;
        const cfg = global.HairStylesConfig;
        let drawable = 0;
        if (name === 'Налысо') drawable = 0;
        else if (cfg && typeof cfg.buildHairStyles === 'function') {
            const list = cfg.buildHairStyles();
            for (let i = 0; i < list.length; i++) {
                if (list[i].name === name) {
                    drawable = list[i].drawable;
                    break;
                }
            }
        }
        mp.events.call('barber:hair:demo', drawable, 0);
    } catch (_e) {}
});

global.tryCloseBarbershopEsc = function () {
    if (!brrs || !brrs.active) return false;
    mp.events.call('barber:close:c');
    return true;
};
