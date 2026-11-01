localPlayer = mp.players.local;
let flyStatus = false;
const gameplayCam = mp.cameras.new('gameplay');
let flyData = { f: 2, l: 2, w: 2, h: 2 };

/** Уровень админки с сервера. F5: 8+ всегда; 1–7 только после /logadmin (adminSession). */
function getClientAdminTrueLevel() {
    const t = Number(mp.players.local.getVariable('adminTrueLvl')) || 0;
    const e = Number(mp.players.local.getVariable('adminlvl')) || 0;
    return Math.max(t, e);
}

function canUseAdminFly() {
    const trueLv = getClientAdminTrueLevel();
    if (trueLv >= 8) return true;
    if (trueLv >= 1 && trueLv <= 7 && mp.players.local.getVariable('adminSession') === true) return true;
    return false;
}

function tryToggleAdminFly() {
    if (!canUseAdminFly()) {
        const trueLv = getClientAdminTrueLevel();
        if (trueLv >= 1 && trueLv <= 7) {
            mp.events.call('notify:client', 2, 'top-mid', 'Сначала /logadmin и пароль в чат.', 3000);
        }
        return;
    }
    if (!flyStatus && isFlyBlocked()) {
        mp.events.call('notify:client', 2, 'top-mid', 'Флай недоступен: вы недавно получили урон.', 1500);
        return;
    }
    setClientFlyState(!flyStatus);
}

/** КД флая после получения урона (ставит damage.js). */
global.flyBlockUntil = 0;
const FLY_BLOCK_MS = 5000;

function isFlyBlocked() {
    return Date.now() < (global.flyBlockUntil || 0);
}

function blockFlyFor(ms) {
    global.flyBlockUntil = Date.now() + (Number(ms) || 0);
}

/** На капте/бизваре: во время таймера подготовки — все админ-инструменты; в бою — для уровней 1–7. */
function captBlocksAdminTools() {
    const pl = mp.players.local;
    if (pl.getVariable('captFrozen') === true || pl.getVariable('bizwarFrozen') === true) return true;
    if (pl.getVariable('inCapt') !== true && pl.getVariable('inBizwar') !== true) return false;
    return getClientAdminTrueLevel() < 8;
}

if (typeof global !== 'undefined') {
    global.getClientAdminTrueLevel = getClientAdminTrueLevel;
    global.canUseAdminFly = canUseAdminFly;
    global.captBlocksAdminTools = captBlocksAdminTools;
}

/**
 * @param {boolean} enable
 * @param {boolean} [spectateAfterDisable] если true — выключаем полёт перед слежкой, не шлём setInvisible 255 (сервер уже перевёл в «невидим»)
 */
function setClientFlyState(enable, spectateAfterDisable) {
    if (!mp.players.local.getVariable('auth')) return;
    if (captBlocksAdminTools()) return;
    const want = enable === true;
    if (flyStatus === want) return;
    flyStatus = want;
    global.flyStatus = want;
    if (!flyStatus) {
        mp.events.remove("render", renderFunction);
        const a = localPlayer.position;
        a.z = mp.game.gameplay.getGroundZFor3dCoord(a.x, a.y, a.z, 0, false);
        localPlayer.setCoordsNoOffset(a.x, a.y, a.z, false, false, false);
        mp.events.callRemote('noinvisible');
        mp.events.callRemote('setvariablefly', false);
        localPlayer.setInvincible(flyStatus);
        localPlayer.freezePosition(flyStatus);
        if (!spectateAfterDisable) {
            mp.events.callRemote('setInvisible', flyStatus ? 0 : 255);
        }
        global.flyEnableNametags = 0;
        global.flyEnableFaction = 0;
        global.flyEnableFamily = 0;
    } else {
        mp.events.add("render", renderFunction);
        localPlayer.setInvincible(flyStatus);
        localPlayer.freezePosition(flyStatus);
        localPlayer.setAlpha(flyStatus ? 0 : 255);
        mp.events.callRemote('setInvisible', flyStatus ? 0 : 255);
        mp.events.callRemote('setvariablefly', true);
        global.flyEnableNametags = 1;
        global.flyEnableFaction = 1;
        global.flyEnableFamily = 1;
    }
}

/** После слежки: если fly уже false, ранний return в setClientFlyState не чинит альфу — выравниваем локально и с сервером. */
function forceSpectateExitFlyCleanup() {
    if (!mp.players.local.getVariable('auth')) return;
    if (captBlocksAdminTools()) return;
    if (flyStatus === true) {
        setClientFlyState(false);
        return;
    }
    mp.players.local.setAlpha(255);
    mp.events.callRemote('setInvisible', 255);
    mp.events.callRemote('setvariablefly', false);
}

global.forceSpectateExitFlyCleanup = forceSpectateExitFlyCleanup;

mp.events.add("client_player_toggleFly", () => {
    tryToggleAdminFly();
});

/** Сервер: принудительно вкл/выкл NoClip (второй аргумент — перед слежкой, не делать видимым) */
mp.events.add('adminSession:setFly', (enable, spectateAfterDisable) => {
    const want = enable === true || enable === 1 || enable === 'true' || enable === '1';
    setClientFlyState(want, spectateAfterDisable === true || spectateAfterDisable === 1 || spectateAfterDisable === '1');
});

global.bindGameplayKey(0x74, true, () => {
    if (mp.game.ui.isPauseMenuActive()) return;
    tryToggleAdminFly();
});

const controlsIds = {
    W: 32, S: 33, A: 34, D: 35, SHIFT: 21, Space: 321, LCtrl: 326
};

global.flyStatus = false;
global.flyFirstSpeed = 1.005;
global.flyFirstMaxSpeed = 1.2;
global.flyFirstMaxSubSpeed = 0.8;
global.flySecondSpeed = 1.035;
global.flySecondMaxSpeed = 10;
global.flySecondMaxSubSpeed = 2;
global.flyCameraRotInterval = 1000 / 60;
global.flyCameraRotSpeed = 1;
global.flyEnableNametags = 1;
global.flyEnableFaction = 1;
global.flyEnableFamily = 1;

const renderFunction = () => {
    var a = Math.min;
    const b = mp.game.controls;
    const c = gameplayCam.getDirection();
    let d = false;
    const e = localPlayer.position;

    const f = b.isControlPressed(0, controlsIds.SHIFT) ? global.flySecondSpeed : global.flyFirstSpeed;
    const g = b.isControlPressed(0, controlsIds.SHIFT) ? global.flySecondMaxSpeed : global.flyFirstMaxSpeed;
    const h = b.isControlPressed(0, controlsIds.SHIFT) ? global.flySecondMaxSubSpeed : global.flyFirstMaxSubSpeed;

    if (b.isControlPressed(0, controlsIds.W)) {
        flyData.f = a(g, flyData.f * f);
        e.x += c.x * flyData.f;
        e.y += c.y * flyData.f;
        e.z += c.z * flyData.f;
        d = true;
    } else if (b.isControlPressed(0, controlsIds.S)) {
        flyData.f = a(g, flyData.f * f);
        e.x -= c.x * flyData.f;
        e.y -= c.y * flyData.f;
        e.z -= c.z * flyData.f;
        d = true;
    } else flyData.f = h;

    if (b.isControlPressed(0, controlsIds.A)) {
        flyData.l = a(g, flyData.l * f);
        e.x += -c.y * flyData.l;
        e.y += c.x * flyData.l;
        d = true;
    } else if (b.isControlPressed(0, controlsIds.D)) {
        flyData.l = a(g, flyData.l * f);
        e.x -= -c.y * flyData.l;
        e.y -= c.x * flyData.l;
        d = true;
    } else flyData.l = h;

    if (b.isControlPressed(0, controlsIds.Space)) {
        flyData.h = a(g, flyData.h * f);
        e.z += flyData.h;
        d = true;
    } else if (b.isControlPressed(0, controlsIds.LCtrl)) {
        flyData.h = a(g, flyData.h * f);
        e.z -= flyData.h;
        d = true;
    } else flyData.h = h;

    b.disableControlAction(0, 124, true);
    b.disableControlAction(0, 125, true);

    if (b.isDisabledControlPressed(0, 124)) {
        mp.game.cam.setGameplayCamRelativeHeading(mp.game.cam.getGameplayCamRelativeHeading() - global.flyCameraRotSpeed);
    } else if (b.isDisabledControlPressed(0, 125)) {
        mp.game.cam.setGameplayCamRelativeHeading(mp.game.cam.getGameplayCamRelativeHeading() + global.flyCameraRotSpeed);
    }

    if (d) localPlayer.setCoordsNoOffset(e.x, e.y, e.z, false, false, false);
};

mp.events.add('capt:forceAdminLock', () => {
    if (getClientAdminTrueLevel() < 1) return;
    if (flyStatus) setClientFlyState(false);
});
