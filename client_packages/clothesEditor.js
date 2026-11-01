/**
 * Админ-редактор компонентов одежды (/tsc), логика камеры как Calamity RP (camera/create.js + camera/other.js).
 * CEF: package://browsers/clotheditor/index.html · только male freemode.
 */

const clothesEmpty = {
    0: { 1: 0, 3: 15, 4: 15, 5: 0, 6: 35, 7: 0, 8: 6, 9: 0, 10: 0, 11: 15 },
    1: { 1: 0, 3: 15, 4: 14, 5: 0, 6: 34, 7: 0, 8: 15, 9: 0, 10: 0, 11: 15 },
};

/** Как у Calamity updateCameraToBone (+ fixRotation добавляется к az мин/макс). */
const TSC_FIX_ROT = 180;

const TSC_BONE = {
    hat: { bone: 12844, ox: 0, oy: 0, oz: 0, azMin: 80, azMax: 160 },
    top: { bone: 11816, ox: -0.13, oy: 0.13, oz: 0, azMin: 80, azMax: 160 },
    legs: { bone: 11816, ox: 0.5, oy: 0.05, oz: 0, azMin: 80, azMax: 120 },
    shoes: { bone: 65245, ox: -0.168, oy: 0, oz: 0.1, azMin: 100, azMax: 130 },
};

let tscGender = 1;
let tscSelectDrawable = 0;
let tscSelectTexture = 0;
let tscEditorOpen = false;

const ClothesDataAgg = { 1: {}, 0: {} };

let tscCam = null;
let tscSavedModel = 0;
let tscLastBoneCamId = -1;
let tscLastBoneWasProp = false;

let tscScrX = 1920;
let tscScrY = 1080;
(function tscInitScreenRes() {
    try {
        const r = mp.game.graphics.getScreenActiveResolution(0, 0);
        if (r && typeof r.x === 'number' && r.x > 0) tscScrX = r.x;
        if (r && typeof r.y === 'number' && r.y > 0) tscScrY = r.y;
    } catch (_e) {}
})();

let tscPrevCursor = [0, 0];
/** true = можно крутить камерой (совпадает по смыслу с тем, когда в Calamity не нависла панель). */
let tscCameraRotateEnabled = true;

let tscOrb = {
    /** Пресет строки для кости ('hat','top','legs','shoes'). */
    preset: 'top',
    polarAngleDeg: 0,
    azimuthAngleDeg: 90 + TSC_FIX_ROT,
    azimutMin: 80 + TSC_FIX_ROT,
    azimutMax: 160 + TSC_FIX_ROT,
    lookZ: 0,
    heightToggled: true,
    radius: -1.5,
    radiusMin: -1.5,
    radiusMax: -0.5,
    overlayToggled: true,
    activeMovementCamera: true,
    init: true,
};

let tscKeyboardMulMs = 0;

let tscBrowser = null;

function tscClamp(x, mn, mx) {
    return Math.max(mn, Math.min(mx, x));
}

function getPolarAngleByHeading(heading, fixHeading) {
    let h = ((heading + 360.0) % 360.0) + 180.0;
    h = h > 360.0 ? -360.0 + h : h;
    return 360 - h + fixHeading;
}

/** Инициализация параметров создания камеры «char», Calamity camera/create.js name==="char". */
function tscOrbInitChar(ped) {
    try {
        tscOrb.polarAngleDeg = getPolarAngleByHeading(ped.getHeading(), 90);
        tscOrb.azimuthAngleDeg = 90 + TSC_FIX_ROT;
        tscOrb.azimutMax = 160 + TSC_FIX_ROT;
        tscOrb.azimutMin = 80 + TSC_FIX_ROT;
        tscOrb.lookZ = 0;
        tscOrb.heightToggled = true;
        tscOrb.radius = -1.5;
        tscOrb.radiusMax = -0.5;
        tscOrb.radiusMin = -1.5;
        tscOrb.overlayToggled = true;
        tscOrb.activeMovementCamera = true;
        tscOrb.init = true;
    } catch (_e) {}
}

/** Сменить кость-привязку (Calamity updateCameraToBone без интерполяции). */
function tscOrbSetPreset(preset) {
    const def = TSC_BONE[preset] || TSC_BONE.top;
    tscOrb.preset = preset;
    tscOrb.azimutMin = def.azMin + TSC_FIX_ROT;
    tscOrb.azimutMax = def.azMax + TSC_FIX_ROT;
    tscOrb.azimuthAngleDeg = tscClamp(tscOrb.azimuthAngleDeg, tscOrb.azimutMin, tscOrb.azimutMax);
    tscOrb.activeMovementCamera = false;
}

function tscOrbBoneParams() {
    return TSC_BONE[tscOrb.preset] || TSC_BONE.top;
}

function tscOrbPivotCoords(ped) {
    const b = tscOrbBoneParams();
    let c = null;
    try {
        c = ped.getBoneCoords(b.bone, b.ox, b.oy, b.oz);
    } catch (_e) {}
    if (!c || typeof c.x !== 'number') {
        const p = ped.position;
        return { x: p.x, y: p.y, z: p.z + 0.5 };
    }
    return c;
}

function tscOrbApplyCamera() {
    if (!tscCam) return;
    const ped = mp.players.local;
    const pivot = tscOrbPivotCoords(ped);
    const cx = pivot.x;
    const cy = pivot.y;
    const cz = pivot.z + tscOrb.lookZ;

    const polarAngleRad = tscOrb.polarAngleDeg * (Math.PI / 180);
    const azimuthAngleRad = tscOrb.azimuthAngleDeg * (Math.PI / 180);
    const nx = cx + tscOrb.radius * (Math.sin(azimuthAngleRad) * Math.cos(polarAngleRad));
    const ny = cy - tscOrb.radius * (Math.sin(azimuthAngleRad) * Math.sin(polarAngleRad));
    const nz = cz - tscOrb.radius * Math.cos(azimuthAngleRad);

    try {
        tscCam.setCoord(nx, ny, nz);
        tscCam.pointAtCoord(cx, cy, cz);
        tscOrb.activeMovementCamera = true;
    } catch (_e) {}
}

function tscOrbPollWheelZoom() {
    try {
        if (mp.game.controls.isDisabledControlJustPressed(0, 241)) {
            tscOrb.radius += 0.12;
            tscOrb.radius = tscClamp(tscOrb.radius, tscOrb.radiusMin, tscOrb.radiusMax);
            return true;
        }
        if (mp.game.controls.isDisabledControlJustPressed(0, 242)) {
            tscOrb.radius -= 0.12;
            tscOrb.radius = tscClamp(tscOrb.radius, tscOrb.radiusMin, tscOrb.radiusMax);
            return true;
        }
    } catch (_e) {}
    return false;
}

function tscOrbPollKeys() {
    const now = Date.now();
    if (now - tscKeyboardMulMs < 90) return;
    let hit = false;
    const tryKey = (vk, fn) => {
        if (global.isGameplayKeyDown(vk)) {
            fn();
            hit = true;
        }
    };
    tryKey(0x6b, () => {
        tscOrb.radius -= 0.08;
        tscOrb.radius = tscClamp(tscOrb.radius, tscOrb.radiusMin, tscOrb.radiusMax);
    });
    tryKey(0x6d, () => {
        tscOrb.radius += 0.08;
        tscOrb.radius = tscClamp(tscOrb.radius, tscOrb.radiusMin, tscOrb.radiusMax);
    });
    if (hit) tscKeyboardMulMs = now;
}

function tscBrowserExists(br) {
    if (!br) return false;
    try {
        return typeof mp.browsers.exists !== 'function' || mp.browsers.exists(br);
    } catch (_e) {
        return true;
    }
}

function tscEnsureBrowser() {
    if (tscBrowser !== null) return tscBrowser === false ? null : tscBrowser;
    try {
        const b = mp.browsers.new('package://browsers/clotheditor/index.html');
        if (b) {
            b.active = false;
            tscBrowser = b;
            return b;
        }
    } catch (e) {
        try {
            mp.console.logError('[TSC] browser: ' + (e.message || e));
        } catch (_e2) {}
    }
    tscBrowser = false;
    return null;
}

function tscDestroyCam() {
    try {
        if (tscCam) {
            tscCam.setActive(false);
            tscCam.destroy();
        }
    } catch (_e) {}
    tscCam = null;
}

function tscEnsureCam() {
    if (tscCam) return;
    try {
        const ped = mp.players.local;
        tscOrbSetPreset('top');
        tscOrbInitChar(ped);
        const p = tscOrbPivotCoords(ped);
        const cx = p.x;
        const cy = p.y;
        const cz = p.z + tscOrb.lookZ;
        const polarAngleRad = tscOrb.polarAngleDeg * (Math.PI / 180);
        const azimuthAngleRad = tscOrb.azimuthAngleDeg * (Math.PI / 180);
        const nx = cx + tscOrb.radius * (Math.sin(azimuthAngleRad) * Math.cos(polarAngleRad));
        const ny = cy - tscOrb.radius * (Math.sin(azimuthAngleRad) * Math.sin(polarAngleRad));
        const nz = cz - tscOrb.radius * Math.cos(azimuthAngleRad);

        tscCam = mp.cameras.new('default', new mp.Vector3(nx, ny, nz), new mp.Vector3(0, 0, 0), 42);
        tscCam.setActive(true);
        mp.game.cam.renderScriptCams(true, false, 0, true, false);
        tscCam.pointAtCoord(cx, cy, cz);
    } catch (_e) {}
}

function tscApplyCameraPreset(preset) {
    if (!preset || !TSC_BONE[preset]) return;
    tscOrbSetPreset(String(preset));
    tscOrbApplyCamera();
}

function tscClearClothesCreator() {
    const ped = mp.players.local;
    const g = tscGender;
    ped.clearProp(0);
    ped.clearProp(1);
    ped.clearProp(2);
    ped.clearProp(6);
    ped.clearProp(7);
    ped.setComponentVariation(1, clothesEmpty[g][1], 0, 0);
    ped.setComponentVariation(3, clothesEmpty[g][3], 0, 0);
    ped.setComponentVariation(4, clothesEmpty[g][4], 0, 0);
    ped.setComponentVariation(5, clothesEmpty[g][5], 0, 0);
    ped.setComponentVariation(6, clothesEmpty[g][6], 0, 0);
    ped.setComponentVariation(7, clothesEmpty[g][7], 0, 0);
    ped.setComponentVariation(8, clothesEmpty[g][8], 0, 0);
    ped.setComponentVariation(9, clothesEmpty[g][9], 0, 0);
    ped.setComponentVariation(10, clothesEmpty[g][10], 0, 0);
    ped.setComponentVariation(11, clothesEmpty[g][11], 0, 0);
}

mp.events.add('render', () => {
    if (!tscEditorOpen || !tscCam) return;
    let camOn = false;
    try {
        camOn = typeof tscCam.isActive === 'function' && tscCam.isActive();
    } catch (_e) {
        return;
    }
    if (!camOn) return;

    try {
        mp.game.controls.disableAllControlActions(0);
        mp.game.controls.disableAllControlActions(1);
        mp.game.controls.disableAllControlActions(2);

        if (tscOrb.overlayToggled) {
            mp.game.controls.enableControlAction(0, 241, true);
            mp.game.controls.enableControlAction(0, 242, true);
        }

        let rmb = false;
        let lmb = false;
        try {
            rmb = global.isGameplayKeyDown(0x02);
            lmb = global.isGameplayKeyDown(0x01);
        } catch (_e) {}

        if (rmb) {
            mp.game.controls.enableControlAction(0, 238, true);
        }
        if (lmb || tscOrb.init) {
            mp.game.controls.enableControlAction(0, 237, true);
            if (tscOrb.init) tscOrb.init = false;
        }

        const cur = mp.gui.cursor.position;
        const delta = {
            x: (cur[0] - tscPrevCursor[0]) / tscScrX,
            y: (cur[1] - tscPrevCursor[1]) / tscScrY,
        };

        if (tscCameraRotateEnabled && tscOrb.activeMovementCamera && rmb && tscOrb.heightToggled) {
            mp.game.controls.enableControlAction(0, 238, true);
            let ymag = 0;
            try {
                ymag = mp.game.controls.getDisabledControlNormal(0, 2);
            } catch (_e4) {}
            if (Math.abs(ymag) < 1e-4 && Math.abs(delta.y) > 1e-5) {
                ymag = -delta.y * 48;
            }
            tscOrb.lookZ = tscClamp(tscOrb.lookZ + ymag * 0.72, -0.35, 0.6);
        }

        tscOrbPollWheelZoom();
        tscOrbPollKeys();

        if (tscCameraRotateEnabled && tscOrb.activeMovementCamera && lmb && !rmb) {
            let xm = 0;
            let ym = 0;
            try {
                xm = mp.game.controls.getDisabledControlNormal(0, 1);
                ym = mp.game.controls.getDisabledControlNormal(0, 2);
            } catch (_e3) {}

            const useCursor = Math.abs(delta.x) + Math.abs(delta.y) > 1e-5 && Math.abs(xm) + Math.abs(ym) < 0.005;
            if (useCursor) {
                xm = delta.x * 42;
                ym = delta.y * 42;
            }

            tscOrb.polarAngleDeg += xm * 10;
            if (tscOrb.polarAngleDeg >= 360) tscOrb.polarAngleDeg -= 360;
            if (tscOrb.polarAngleDeg < 0) tscOrb.polarAngleDeg += 360;

            tscOrb.azimuthAngleDeg += ym * 10;
            tscOrb.azimuthAngleDeg = tscClamp(tscOrb.azimuthAngleDeg, tscOrb.azimutMin, tscOrb.azimutMax);
        }

        tscOrbApplyCamera();
        tscPrevCursor = cur;
    } catch (_e5) {}
});

mp.events.add('client.clothesEditor.data', (_gender, json) => {
    try {
        ClothesDataAgg[Number(_gender)] = JSON.parse(String(json));
    } catch (_e) {}
});

mp.events.add('client.clothesEditor.open', () => {
    try {
        if (!mp.players.local.getVariable('auth')) return;
        if (mp.players.local.getVariable('dead') === true) return;

        tscSavedModel = mp.players.local.model;
        mp.players.local.freezePosition(true);

        mp.players.local.model = mp.game.joaat('mp_m_freemode_01');
        tscGender = 1;
        tscClearClothesCreator();

        tscDestroyCam();
        tscEnsureCam();

        mp.game.ui.displayRadar(false);
        mp.events.call('c:minimap', false);
        mp.gui.cursor.show(true, true);
        mp.gui.chat.show(false);
        mp.events.call('hud', false);
        mp.events.callRemote('s:setvarshopc', true);

        try {
            const r = mp.game.graphics.getScreenActiveResolution(0, 0);
            if (r && typeof r.x === 'number' && r.x > 0) tscScrX = r.x;
            if (r && typeof r.y === 'number' && r.y > 0) tscScrY = r.y;
        } catch (_e) {}

        const br = tscEnsureBrowser();
        if (br && tscBrowserExists(br)) {
            br.active = true;
            br.execute('if(typeof TscUi!=="undefined")TscUi.refresh();');
        }

        tscOrbInitChar(mp.players.local);
        tscOrbSetPreset('top');
        tscOrbApplyCamera();

        tscCameraRotateEnabled = true;
        tscLastBoneCamId = -1;
        tscLastBoneWasProp = false;
        tscPrevCursor = mp.gui.cursor.position;
        tscEditorOpen = true;
        tscOrb.init = true;
    } catch (e) {
        mp.events.call('notify:client', 2, 'top-mid', 'TSC: ' + (e.message || e), 3500);
    }
});

mp.events.add('client.clothesEditor.close', () => {
    try {
        tscEditorOpen = false;
        tscDestroyCam();
        mp.game.cam.renderScriptCams(false, false, 0, true, false);

        mp.game.ui.displayRadar(true);
        mp.events.call('c:minimap', true);
        mp.gui.cursor.show(false, false);
        mp.events.callRemote('showHud:SERVER');
        mp.gui.chat.show(false);
        mp.events.callRemote('s:setvarshopc', false);

        if (tscBrowser && tscBrowser !== false && tscBrowserExists(tscBrowser)) tscBrowser.active = false;

        mp.players.local.freezePosition(false);

        if (tscSavedModel) {
            try {
                mp.players.local.model = tscSavedModel;
            } catch (_e) {}
        }

        mp.events.callRemote('server.clothesEditor.close');
        if (typeof global.forceHatHairResync === 'function') global.forceHatHairResync();
        else if (typeof global.resetHatHairState === 'function') global.resetHatHairState();
    } catch (e) {
        mp.events.call('notify:client', 2, 'top-mid', 'TSC close: ' + (e.message || e), 3500);
    }
});

mp.events.add('client.clothesEditor.update', (_id, _props, _drawable, _texture) => {
    try {
        const idNum = Number(_id);
        const isProp = _props === true || _props === 'true' || _props === 1;
        const dr = Number(_drawable);
        const tx = Number(_texture);

        tscSelectDrawable = dr;
        tscSelectTexture = tx;

        if (!isProp) {
            mp.players.local.setComponentVariation(idNum, dr, tx, 0);
        } else {
            mp.players.local.setPropIndex(idNum, dr, tx, true);
        }

        if (idNum !== tscLastBoneCamId || isProp !== tscLastBoneWasProp) {
            if (!isProp && (idNum === 1 || idNum === 2)) tscApplyCameraPreset('hat');
            else if (isProp && (idNum === 0 || idNum === 1 || idNum === 2)) tscApplyCameraPreset('hat');
            else if (!isProp && (idNum === 7 || idNum === 11 || idNum === 5)) tscApplyCameraPreset('top');
            else if (isProp && (idNum === 7 || idNum === 6)) tscApplyCameraPreset('top');
            else if (!isProp && idNum === 4) tscApplyCameraPreset('legs');
            else if (!isProp && idNum === 6) tscApplyCameraPreset('shoes');
        }
        tscLastBoneCamId = idNum;
        tscLastBoneWasProp = isProp;
    } catch (e) {
        mp.events.call('notify:client', 2, 'top-mid', 'clothesEditor ' + (e.name || '') + ':' + (e.message || e), 3000);
    }
});

/** Совместимость: пол только мужской, без переключения. */
mp.events.add('client.clothesEditor.gender', () => {
    try {
        tscGender = 1;
        mp.players.local.model = mp.game.joaat('mp_m_freemode_01');
        tscClearClothesCreator();
        tscEnsureCam();
        tscOrbInitChar(mp.players.local);
        tscOrbSetPreset('top');
        tscOrbApplyCamera();
    } catch (e) {
        mp.events.call('notify:client', 2, 'top-mid', 'TSC: ' + (e.message || e), 3000);
    }
});

mp.events.add('client.camera.toggled', (toggled) => {
    /** При наведении на панель CEF событие false — камера без ввода (как Calamity cameraInfo.toggled === false стопает render-орбиту). */
    tscCameraRotateEnabled = toggled !== false && toggled !== 'false' && toggled !== 0;
});

global.tryCloseClothesEditorEsc = function() {
    if (!tscEditorOpen) return false;
    mp.events.call('client.clothesEditor.close');
    return true;
};
