'use strict';

require('./shared/hair_styles.js');

if (!global.rpc) {
    global.rpc = require('./rage-rpc.min.js');
}
const rpc = global.rpc;

/**
 * Создание персонажа — GTA5RP UI (Vue) + клиентские RPC как в Life5rp.
 * Сцена: локальный пед + камера на Maze Bank Tower.
 */

let ccBrowser = null;
let ccCam = null;
let ccActive = false;
let ccBodyCam = false;
let ccLoadPoll = null;
let ccBrowserReady = false;
let ccUiLoaded = false;
let ccRpcReady = false;
let ccRenderBound = false;
/** Смена внешности у уже играющего игрока (EMS NPC) */
let ccEditMode = false;
let ccSavedPos = null;
/** Страховка: если редактор «залип» (finish не пришёл), принудительно разблокировать паузу/карту. */
let ccDeadline = 0;
/** ESC-отмена уже отправлена: keyup из esc_universal должен знать, что редактор закрывается ESC,
 *  и не сбрасывать подавление паузы (иначе та же клавиша ESC открывает карту). */
let ccEscCancelPendingAt = 0;
const CC_ESC_SUPPRESS_MS = 600;
const CC_PAUSE_SUPPRESS_FRAMES = 24;
let ccPauseSuppressFrames = 0;

const CC_POS = { x: -75.7522, y: -818.6097, z: 326.1745 };
/** Направление персонажа при входе в редактор */
const CC_BASE_HEADING = 110.0;
/** Фиксированный угол камеры в мире — не крутится вместе с персонажем (GTA5RP) */
const CC_CAM_HEADING = 110.0;

/** Как в GTA5RP / phantom dm: лицо близко, одежда — полный рост с обувью */
const CC_CAM = {
    face: { dist: 1.1, camZ: 0.65, lookZ: 0.5, fov: 40, interp: 800 },
    body: { dist: 2.9, camZ: 0.6, lookZ: 0.0, fov: 40, interp: 800 }
};

/** В режиме смены внешности (edit) скрываем вкладку «Одежда» — наряд из редактора не сохраняется. */
function ccBuildUiLoad() {
    return {
        changeSex: false,
        changeParents: true,
        changeFace: true,
        changeHair: true,
        changeSkin: true,
        changeClothes: !ccEditMode,
        defaultSex: true,
        defalutData: {}
    };
}

function blockCharCreatorPauseControls() {
    for (let g = 0; g <= 2; g++) {
        mp.game.controls.disableControlAction(g, 156, true);
        mp.game.controls.disableControlAction(g, 199, true);
        mp.game.controls.disableControlAction(g, 200, true);
    }
}

function ccSuppressPauseAfterClose() {
    ccPauseSuppressFrames = CC_PAUSE_SUPPRESS_FRAMES;
    try { mp.game.ui.setPauseMenuActive(false); } catch (_pm) {}
    if (typeof global.suppressPauseMenuAfterEsc === 'function') {
        global.suppressPauseMenuAfterEsc();
    }
}

function ccEnforceWorldUiHidden() {
    try {
        if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();
        else {
            mp.events.call('hud', false);
            mp.events.call('help', false);
            mp.events.call('hudKeyHints', false);
            mp.events.call('minimap', false);
            mp.game.ui.displayRadar(false);
            mp.game.ui.displayHud(false);
            mp.gui.chat.show(false);
            mp.gui.chat.activate(false);
        }
        mp.events.call('hideChatServer');
        if (typeof global.enforceChatHiddenForOverlay === 'function') global.enforceChatHiddenForOverlay();
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
        /* История чата не чистится — только скрываем чат на время редактора. */
    } catch (_e) {}
}

function ccOnRender() {
    if (!ccActive) {
        if (ccPauseSuppressFrames > 0) {
            ccPauseSuppressFrames--;
            blockCharCreatorPauseControls();
            try { mp.game.ui.setPauseMenuActive(false); } catch (_pm) {}
            if (ccPauseSuppressFrames <= 0) ccUnbindRenderGuard(true);
        }
        return;
    }
    try {
        mp.game.controls.disableControlAction(0, 1, true);
        mp.game.controls.disableControlAction(0, 2, true);
        mp.game.controls.disableControlAction(0, 24, true);
        mp.game.controls.disableControlAction(0, 25, true);
        mp.game.controls.disableControlAction(0, 106, true);
        blockCharCreatorPauseControls();
        mp.game.ui.displayRadar(false);
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
        /* Страховка от «залипшего» редактора: если finish не пришёл, локально всё выключаем,
           чтобы блокировка паузы не осталась навсегда и карта открывалась как обычно. */
        if (ccDeadline > 0 && Date.now() > ccDeadline) {
            ccActive = false;
            ccEditMode = false;
            ccDeadline = 0;
            ccSuppressPauseAfterClose();
            try {
                if (ccBrowser && mp.browsers.exists(ccBrowser)) ccBrowser.active = false;
            } catch (_b) {}
            try { mp.gui.cursor.show(false, false); } catch (_c) {}
            try { mp.game.cam.renderScriptCams(false, true, 500, true, false); } catch (_cc) {}
            try { mp.game.ui.setPauseMenuActive(false); } catch (_pm) {}
            ccStopLoadPoll();
            return;
        }
    } catch (_e) {}
}

function ccBindRenderGuard() {
    if (ccRenderBound) return;
    ccRenderBound = true;
    mp.events.add('render', ccOnRender);
}

function ccUnbindRenderGuard(force) {
    if (!force && (ccActive || ccPauseSuppressFrames > 0)) return;
    if (!ccRenderBound) return;
    ccRenderBound = false;
    mp.events.remove('render', ccOnRender);
    try { mp.game.ui.displayRadar(true); } catch (_r) {}
}

function ccGetAuthLobbySpawn() {
    if (typeof global.getAuthLobbySpawn === 'function') return global.getAuthLobbySpawn();
    return {
        x: global.AUTH_LOBBY_BASE.x,
        y: global.AUTH_LOBBY_BASE.y,
        z: global.AUTH_LOBBY_BASE.z,
        heading: global.AUTH_LOBBY_HEADING
    };
}

function ccExec(code) {
    try {
        if (ccBrowser && mp.browsers.exists(ccBrowser)) ccBrowser.execute(code);
    } catch (_e) {}
}

function ccStopLoadPoll() {
    if (ccLoadPoll != null) {
        try { clearInterval(ccLoadPoll); } catch (_e) {}
        ccLoadPoll = null;
    }
}

function ccDestroyCam() {
    try {
        if (ccCam && mp.cameras.exists(ccCam)) {
            ccCam.setActive(false);
            ccCam.destroy();
        }
    } catch (_e) {}
    ccCam = null;
}

function ccCurrentCamMode() {
    return ccBodyCam ? CC_CAM.body : CC_CAM.face;
}

function ccCameraCoords(mode) {
    const lp = mp.players.local;
    const pos = lp.position;
    const rad = (CC_CAM_HEADING * Math.PI) / 180;
    const camX = pos.x - Math.sin(rad) * mode.dist;
    const camY = pos.y + Math.cos(rad) * mode.dist;
    const camZ = pos.z + mode.camZ;
    const lookZ = pos.z + mode.lookZ;
    return {
        from: new mp.Vector3(camX, camY, camZ),
        at: new mp.Vector3(pos.x, pos.y, lookZ)
    };
}

function ccApplyCameraPosition(interpolate) {
    try {
        const lp = mp.players.local;
        if (!lp) return;
        const mode = ccCurrentCamMode();
        const { from, at } = ccCameraCoords(mode);
        const interp = interpolate ? mode.interp : 0;

        if (!ccCam || !mp.cameras.exists(ccCam)) {
            ccCam = mp.cameras.new('default', from, new mp.Vector3(0, 0, 0), mode.fov);
            ccCam.pointAtCoord(at.x, at.y, at.z);
            ccCam.setActive(true);
            mp.game.cam.renderScriptCams(true, !!interp, interp, true, false);
            return;
        }

        if (interp > 0) {
            ccDestroyCam();
            ccCam = mp.cameras.new('default', from, new mp.Vector3(0, 0, 0), mode.fov);
            ccCam.pointAtCoord(at.x, at.y, at.z);
            ccCam.setActive(true);
            mp.game.cam.renderScriptCams(true, true, interp, true, false);
        } else {
            ccCam.setCoord(from.x, from.y, from.z);
            ccCam.setFov(mode.fov);
            ccCam.pointAtCoord(at.x, at.y, at.z);
        }
    } catch (_e) {}
}

async function ccPlayIdleAnim() {
    try {
        const lp = mp.players.local;
        if (!lp) return;
        const dict = 'anim@mp_player_intcelebrationfemale@surrender';
        if (!mp.game.streaming.hasAnimDictLoaded(dict)) {
            mp.game.streaming.requestAnimDict(dict);
            let tries = 0;
            while (!mp.game.streaming.hasAnimDictLoaded(dict) && tries < 100) {
                await mp.game.waitAsync(10);
                tries++;
            }
        }
        lp.taskPlayAnim(dict, 'surrender', 1, 1, -1, 2, 1, false, false, false);
    } catch (_e) {}
}

function ccEnsureModel(isMale) {
    const hash = mp.game.joaat(isMale === false ? 'mp_f_freemode_01' : 'mp_m_freemode_01');
    try { mp.game.streaming.requestModel(hash); } catch (_e) {}
    try {
        if (mp.players.local && mp.players.local.model !== hash) mp.players.local.model = hash;
    } catch (_e2) {}
    return hash;
}

function ccSetupPed() {
    try {
        const lp = mp.players.local;
        if (!lp) return;
        lp.position = new mp.Vector3(CC_POS.x, CC_POS.y, CC_POS.z);
        try { lp.setCoordsNoOffset(CC_POS.x, CC_POS.y, CC_POS.z, false, false, false); } catch (_p) {}
        lp.setHeading(CC_BASE_HEADING);
        lp.freezePosition(true);
        lp.setAlpha(255);
        lp.setVisible(true, false);
    } catch (_e) {}
}

/** Голый freemode — те же drawable, что clothesEmpty в clothesEditor.js */
function ccResetMaleClothes() {
    const lp = mp.players.local;
    if (!lp) return;
    try {
        lp.setComponentVariation(1, 0, 0, 2);
        lp.setComponentVariation(11, 15, 0, 2);
        lp.setComponentVariation(8, 15, 0, 2);
        lp.setComponentVariation(3, 15, 0, 2);
        lp.setComponentVariation(4, 14, 0, 2);
        lp.setComponentVariation(6, 34, 0, 2);
        lp.setComponentVariation(5, 0, 0, 2);
        lp.setComponentVariation(7, 0, 0, 2);
        lp.setComponentVariation(9, 0, 0, 2);
        lp.setComponentVariation(10, 0, 0, 2);
        try { lp.clearProp(0); } catch (_p0) { try { lp.setProp(0, -1, 0); } catch (_p1) {} }
        try { lp.clearProp(1); } catch (_p2) {}
    } catch (_e) {}
}

function ccResetFemaleClothes() {
    const lp = mp.players.local;
    if (!lp) return;
    try {
        lp.setComponentVariation(1, 0, 0, 2);
        lp.setComponentVariation(11, 15, 0, 2);
        lp.setComponentVariation(8, 6, 0, 2);
        lp.setComponentVariation(3, 15, 0, 2);
        lp.setComponentVariation(4, 15, 0, 2);
        lp.setComponentVariation(6, 35, 0, 2);
        lp.setComponentVariation(5, 0, 0, 2);
        lp.setComponentVariation(7, 0, 0, 2);
        lp.setComponentVariation(9, 0, 0, 2);
        lp.setComponentVariation(10, 0, 0, 2);
        try { lp.clearProp(0); } catch (_p0) { try { lp.setProp(0, -1, 0); } catch (_p1) {} }
        try { lp.clearProp(1); } catch (_p2) {}
    } catch (_e) {}
}

function ccDefaultAppearancePayload(isMale = true) {
    const male = isMale !== false;
    return {
        isMale: male,
        father: 0,
        mother: 21,
        similarity: 0.5,
        skin: 0.5,
        features: new Array(20).fill(0),
        hair: { style: 0, color: 0, highlight: 0 },
        eyebrows: { style: 0, color: 0, opacity: 1.0 },
        beard: { style: 255, color: 0, opacity: 0.0 },
        eyeColor: 0,
        skinOverlays: null
    };
}

function ccApplyAppearancePayload(payload, withNakedClothes) {
    if (!payload || typeof payload !== 'object') return;
    if (typeof payload.isMale !== 'boolean') payload.isMale = mp.players.local.model !== mp.game.joaat('mp_f_freemode_01');
    ccEnsureModel(payload.isMale);
    const lp = mp.players.local;
    if (!lp) return;
    if (payload.father != null && payload.mother != null) {
        lp.setHeadBlendData(
            payload.mother, payload.father, 0,
            payload.mother, payload.father, 0,
            payload.similarity != null ? payload.similarity : 0.5,
            payload.skin != null ? payload.skin : 0.5,
            0, true
        );
    }
    if (Array.isArray(payload.features)) {
        for (let i = 0; i < 20; i++) lp.setFaceFeature(i, payload.features[i] || 0);
    }
    if (payload.hair && payload.hair.style != null) {
        lp.setComponentVariation(2, payload.hair.style, 0, 0);
        lp.setHairColor(payload.hair.color || 0, payload.hair.highlight || 0);
    }
    if (payload.eyebrows) {
        const bs = payload.eyebrows.style;
        lp.setHeadOverlay(2, bs === 255 ? 0 : bs, payload.eyebrows.opacity != null ? payload.eyebrows.opacity : 1.0, 1, 1);
        lp.setHeadOverlayColor(2, 1, payload.eyebrows.color || 0, 0);
    }
    if (payload.beard && payload.isMale !== false) {
        const bs = payload.beard.style;
        lp.setHeadOverlay(1, bs === 255 ? 0 : bs, payload.beard.opacity != null ? payload.beard.opacity : 1.0, 1, 1);
        lp.setHeadOverlayColor(1, 1, payload.beard.color || 0, 0);
    } else {
        lp.setHeadOverlay(1, 0, 0.0, 1, 1);
    }
    if (payload.eyeColor != null) lp.setEyeColor(payload.eyeColor);
    if (payload.skinOverlays && typeof payload.skinOverlays === 'object') {
        const s = payload.skinOverlays;
        const apply = (slot, val) => {
            if (val == null || val === 255) lp.setHeadOverlay(slot, 0, 0.0, 0, 0);
            else lp.setHeadOverlay(slot, val, 1.0, 0, 0);
        };
        apply(0, s.blemish);
        apply(3, s.aging);
        apply(7, s.complexion);
        apply(9, s.freckles);
    } else if (Array.isArray(payload.appearance)) {
        const a = payload.appearance;
        const apply = (slot, idx) => {
            const v = a[idx];
            if (v == null || v === 255) lp.setHeadOverlay(slot, 0, 0.0, 0, 0);
            else lp.setHeadOverlay(slot, v, 1.0, 0, 0);
        };
        apply(0, 0);
        apply(3, 3);
        apply(7, 7);
        apply(9, 9);
    } else {
        [0, 3, 7, 9].forEach((slot) => lp.setHeadOverlay(slot, 0, 0.0, 0, 0));
    }
    if (withNakedClothes !== false) {
        ccResetMaleClothes();
    }
}

function ccWaitModelThenApply(tries) {
    if (!ccActive) return;
    const male = ccEnsureModel(true);
    let loaded = false;
    try { loaded = mp.game.streaming.hasModelLoaded(male); } catch (_e) {}
    if (loaded || tries <= 0) {
        ccSetupPed();
        ccApplyAppearancePayload(ccDefaultAppearancePayload(true), true);
        ccPlayIdleAnim();
        return;
    }
    setTimeout(() => ccWaitModelThenApply(tries - 1), 100);
}

function ccReturnToAuthLobby() {
    try {
        const lp = mp.players.local;
        const spawn = ccGetAuthLobbySpawn();
        if (lp) {
            lp.setCoordsNoOffset(spawn.x, spawn.y, spawn.z, false, false, false);
            lp.position = new mp.Vector3(spawn.x, spawn.y, spawn.z);
            lp.setHeading(spawn.heading);
            lp.freezePosition(true);
            lp.setAlpha(0);
        }
    } catch (_e) {}
    try { mp.game.clock.setTime(23, 0, 0); } catch (_t) {}
    mp.events.call('createAuthCameraVeprais');
}

function ccEnsureBrowser() {
    if (!ccBrowser || !mp.browsers.exists(ccBrowser)) {
        ccBrowser = mp.browsers.new('package://browsers/charcreator/index.html');
        ccBrowser.active = false;
        ccBrowserReady = false;
    }
    return ccBrowser;
}

function ccTryApplyUiLoad() {
    if (ccUiLoaded) return true;
    if (!ccActive || !ccBrowser || !mp.browsers.exists(ccBrowser) || !ccBrowserReady) return false;
    const payload = escape(JSON.stringify(ccBuildUiLoad()));
    ccExec(
        `if(!window.__charLoaded&&typeof mainVue!=="undefined"&&mainVue.load){` +
        `window.__charLoaded=true;mainVue.load('${payload}');` +
        `if(typeof mainVue.updateAll==="function"){try{mainVue.updateAll();}catch(_e){}}` +
        `if(typeof mp!=="undefined")mp.trigger("charCreator:uiLoaded");}`
    );
    return false;
}

function ccPushUiLoad() {
    ccStopLoadPoll();
    if (!ccActive) return;
    ccEnsureBrowser();
    if (ccBrowserReady && ccTryApplyUiLoad()) return;
    ccLoadPoll = setInterval(() => {
        if (!ccActive || !ccBrowser || !mp.browsers.exists(ccBrowser)) {
            ccStopLoadPoll();
            return;
        }
        if (ccBrowserReady && ccTryApplyUiLoad()) ccStopLoadPoll();
    }, 50);
    setTimeout(() => ccStopLoadPoll(), 15000);
}

function ccPreloadModels() {
    try {
        mp.game.streaming.requestModel(mp.joaat('mp_m_freemode_01'));
    } catch (_e) {}
}

function ccPreloadBrowser() {
    try { ccEnsureBrowser(); } catch (_e) {}
}

function ccResetSaveUi(errText) {
    if (!errText) return;
    const errJson = JSON.stringify(String(errText));
    ccExec(`if(typeof mainVue!=='undefined'){mainVue.blockEnd=false;}var m=${errJson};if(m){alert(m);}`);
}

function ccBuildSkinOverlays(appearance) {
    if (!Array.isArray(appearance)) return null;
    const slots = [
        ['blemish', 0, 23],
        ['aging', 3, 14],
        ['complexion', 7, 11],
        ['freckles', 9, 17]
    ];
    const out = {};
    for (const [key, idx] of slots) {
        const n = parseInt(appearance[idx], 10);
        if (Number.isFinite(n) && n !== 255) out[key] = n;
    }
    return Object.keys(out).length ? out : null;
}

function ccGta5ToFlowPayload(stockValuesJson, featuresJson, appearanceJson, hairJson, clothesJson) {
    const stock = typeof stockValuesJson === 'string' ? JSON.parse(stockValuesJson) : stockValuesJson;
    const features = typeof featuresJson === 'string' ? JSON.parse(featuresJson) : featuresJson;
    const hairArr = typeof hairJson === 'string' ? JSON.parse(hairJson) : hairJson;
    const appearance = typeof appearanceJson === 'string' ? JSON.parse(appearanceJson) : appearanceJson;

    const isMale = mp.players.local.model !== mp.game.joaat('mp_f_freemode_01');
    const hairColor = hairArr[1] != null ? parseInt(hairArr[1], 10) : 0;
    const eyeColor = hairArr.length >= 9
        ? (hairArr[5] != null ? parseInt(hairArr[5], 10) : 0)
        : (hairArr[4] != null ? parseInt(hairArr[4], 10) : 0);
    let beardStyle = appearance && appearance[1] != null
        ? parseInt(appearance[1], 10)
        : (hairArr[2] != null ? parseInt(hairArr[2], 10) : 255);
    if (!isMale) beardStyle = 255;
    const browStyle = appearance && appearance[2] != null
        ? parseInt(appearance[2], 10)
        : (hairArr[3] != null ? parseInt(hairArr[3], 10) : 0);

    let clothes = null;
    try {
        clothes = typeof clothesJson === 'string' ? JSON.parse(clothesJson) : clothesJson;
    } catch (_e) {
        clothes = null;
    }

    return {
        isMale,
        father: stock[1] != null ? parseInt(stock[1], 10) : 0,
        mother: stock[2] != null ? parseInt(stock[2], 10) : 21,
        similarity: stock[3] != null ? parseFloat(stock[3]) : 0.5,
        skin: stock[4] != null ? parseFloat(stock[4]) : 0.5,
        features: Array.isArray(features) ? features : [],
        hair: {
            style: hairArr[0] != null ? parseInt(hairArr[0], 10) : 0,
            color: hairColor,
            highlight: hairColor
        },
        eyebrows: {
            style: browStyle,
            color: hairColor,
            opacity: browStyle === 255 ? 0.0 : 1.0
        },
        beard: {
            style: beardStyle,
            color: hairColor,
            opacity: beardStyle === 255 ? 0.0 : 1.0
        },
        eyeColor,
        skinOverlays: ccBuildSkinOverlays(appearance),
        clothes
    };
}

function ccRegisterRpcHandlers() {
    if (ccRpcReady) return;
    ccRpcReady = true;

    rpc.on('__client_character_camera', (bodyMode) => {
        ccBodyCam = !!bodyMode;
        ccApplyCameraPosition(true);
    });

    rpc.on('__client_character_rotate', (delta) => {
        if (!ccActive) return;
        const lp = mp.players.local;
        if (!lp || lp.handle === 0) return;
        const d = Number(delta) || 0;
        if (d === 0) return;
        try {
            lp.setHeading(lp.getHeading() + d);
        } catch (_e) {}
    });

    rpc.register('__client_character_isPlayerLoad', () => {
        try { return mp.players.local.handle !== 0; } catch (_e) { return false; }
    });

    rpc.register('__client_character_setSex', (_isMale) => {
        ccEnsureModel(true);
        return new Promise((resolve) => {
            const timer = setInterval(() => {
                try {
                    if (mp.players.local.handle === 0) return;
                    clearInterval(timer);
                    ccPlayIdleAnim();
                    ccResetMaleClothes();
                    resolve(true);
                } catch (_e) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, 200);
            setTimeout(() => { try { clearInterval(timer); } catch (_t) {} resolve(false); }, 5000);
        });
    });

    rpc.register('__client_character_resetClothes', (_isMale) => {
        ccResetMaleClothes();
        return true;
    });

    rpc.register('__client_character_updateParents', (arr) => {
        try {
            mp.players.local.setHeadBlendData(arr[0], arr[1], 0, arr[0], arr[1], 0, arr[2], arr[3], 0, true);
        } catch (_e) {}
        return true;
    });

    rpc.register('__client_character_updateFace', (arr) => {
        try {
            const feats = arr[0] || [];
            for (let i = 0; i < 20; i++) mp.players.local.setFaceFeature(i, feats[i] || 0);
            mp.players.local.setEyeColor(arr[1] || 0);
        } catch (_e) {}
        return true;
    });

    rpc.register('__client_character_updateSkin', (appearance) => {
        try {
            const lp = mp.players.local;
            const apply = (slot, idx) => {
                const v = appearance[idx];
                if (v == null || v === 255) {
                    lp.setHeadOverlay(slot, 0, 0.0, 0, 0);
                    return;
                }
                lp.setHeadOverlay(slot, v, 1.0, 0, 0);
            };
            apply(0, 0);
            apply(3, 3);
            apply(7, 7);
            apply(9, 9);
        } catch (_e) {}
        return true;
    });

    rpc.register('__client_character_updateHair', (arr) => {
        try {
            const lp = mp.players.local;
            lp.setComponentVariation(2, arr[0], 0, 2);
            lp.setHairColor(arr[1], 0);
            lp.setHeadOverlay(1, arr[2], arr[2] === 255 ? 0.0 : 1.0, 1, 1);
            lp.setHeadOverlay(2, arr[3], arr[3] === 255 ? 0.0 : 1.0, 1, 1);
            lp.setHeadOverlayColor(2, 1, arr[1], 0);
            lp.setHeadOverlayColor(1, 1, arr[1], 0);
            lp.setEyeColor(arr[4] || 0);
        } catch (_e) {}
        return true;
    });

    rpc.register('__client_character_updateClothes', (arr) => {
        try {
            const slot = arr[0];
            const item = arr[1];
            const lp = mp.players.local;
            if (slot === 0) {
                lp.setComponentVariation(11, item[3][0], item[3][2], 2);
                lp.setComponentVariation(3, item[3][1], 0, 2);
            } else if (slot === 1) {
                lp.setComponentVariation(4, item[3][0], item[3][1], 2);
            } else if (slot === 2) {
                lp.setComponentVariation(6, item[3][0], item[3][1], 2);
            }
        } catch (_e) {}
        return true;
    });
}

ccRegisterRpcHandlers();

global.isCharCreatorActive = function isCharCreatorActive() {
    return !!ccActive;
};

mp.events.add('charCreator:begin', (editMode) => {
    if (ccActive) return;
    ccActive = true;
    ccEditMode = !!editMode;
    ccBodyCam = false;
    ccDeadline = Date.now() + 20 * 60 * 1000;
    try { mp.game.ui.setPauseMenuActive(false); } catch (_pm) {}
    try {
        const lp = mp.players.local;
        if (lp) ccSavedPos = { x: lp.position.x, y: lp.position.y, z: lp.position.z, heading: lp.getHeading() };
    } catch (_e) { ccSavedPos = null; }
    ccEnforceWorldUiHidden();
    try { mp.events.call('removeCamera'); } catch (_e) {}
    ccBindRenderGuard();
    try {
        if (typeof loginBrowserr !== 'undefined' && loginBrowserr && mp.browsers.exists(loginBrowserr)) {
            loginBrowserr.active = false;
        }
    } catch (_e) {}

    ccEnsureModel(true);
    ccSetupPed();
    ccPlayIdleAnim();
    setTimeout(() => ccApplyCameraPosition(true), 300);

    ccEnsureBrowser();
    ccUiLoaded = false;
    ccExec('window.__charLoaded=false;');
    ccBrowser.active = true;
    mp.gui.cursor.show(true, true);

    if (ccEditMode) ccInjectEditEscHandler();
    ccPushUiLoad();
    setTimeout(() => ccWaitModelThenApply(40), 0);
});

/** ESC в редакторе смены внешности отменяет без списания (без кнопки «ОТМЕНА»). */
function ccInjectEditEscHandler() {
    try {
        ccExec(
            'if(!window.__ccEditEsc){window.__ccEditEsc=true;' +
            'document.addEventListener("keydown",function(e){' +
            'if(e.key==="Escape"&&typeof mp!=="undefined"&&mp.trigger){' +
            'e.preventDefault();e.stopPropagation();mp.trigger("charCreator:cancel");' +
            '}});}'
        );
    } catch (_e) {}
}

mp.events.add('charCreator:finish', () => {
    const wasEdit = ccEditMode;
    ccActive = false;
    ccEditMode = false;
    ccDeadline = 0;
    ccUiLoaded = false;
    ccStopLoadPoll();
    ccSuppressPauseAfterClose();
    /* Самовосстановление: если состояние паузы движка «сбилось» (движок считает паузу
       открытой, хотя её нет), один раз сбрасываем в OFF — иначе карта после редактора
       открывается только со второго нажатия/при зажатии. */
    try { mp.game.ui.setPauseMenuActive(false); } catch (_pm) {}
    try {
        if (ccBrowser && mp.browsers.exists(ccBrowser)) ccBrowser.active = false;
    } catch (_e) {}
    ccDestroyCam();
    try {
        const lp = mp.players.local;
        if (lp) {
            lp.freezePosition(false);
            lp.setVisible(true, false);
            lp.setAlpha(255);
            try {
                lp.setComponentVariation(1, 0, 0, 0);
                lp.clearProp(0);
                lp.clearProp(1);
            } catch (_cl) {}
        }
    } catch (_e2) {}
    try { mp.game.cam.renderScriptCams(false, true, 500, true, false); } catch (_c) {}
    try { mp.gui.cursor.show(false, false); } catch (_cur) {}
    if (wasEdit && ccSavedPos) {
        try {
            const lp = mp.players.local;
            if (lp) {
                lp.setCoordsNoOffset(ccSavedPos.x, ccSavedPos.y, ccSavedPos.z, false, false, false);
                lp.position = new mp.Vector3(ccSavedPos.x, ccSavedPos.y, ccSavedPos.z);
                lp.setHeading(ccSavedPos.heading);
            }
        } catch (_e3) {}
        try {
            if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
        } catch (_e4) {}
    }
    ccSavedPos = null;
});

mp.events.add('charCreator:cancel', () => {
    if (!ccActive || !ccEditMode) return;
    ccEscCancelPendingAt = Date.now();
    ccSuppressPauseAfterClose();
    mp.events.callRemote('charCreator:cancel:s');
});

global.tryCloseCharCreatorEditEsc = function () {
    /* Редактор уже закрыт этим же нажатием ESC через CEF (keydown) — keyup должен
       вернуть true, чтобы esc_universal подавил паузу и не открыл карту. */
    if (ccEscCancelPendingAt && Date.now() - ccEscCancelPendingAt < CC_ESC_SUPPRESS_MS) return true;
    if (!ccActive || !ccEditMode) return false;
    ccEscCancelPendingAt = Date.now();
    ccSuppressPauseAfterClose();
    mp.events.callRemote('charCreator:cancel:s');
    return true;
};

mp.events.add('charCreator:applyClient', (jsonStr) => {
    try {
        const payload = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        ccApplyAppearancePayload(payload, false);
    } catch (_e) {}
});

mp.events.add('charCreator:resetClient', (jsonStr) => {
    if (!ccActive) return;
    try {
        const payload = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        ccApplyAppearancePayload(payload || ccDefaultAppearancePayload(true), true);
        ccExec('window.__charLoaded=false;');
        ccUiLoaded = false;
        ccPushUiLoad();
    } catch (_e) {}
});

mp.events.add('charCreator:saveFailed', (message) => {
    ccResetSaveUi(message || 'Ошибка сохранения');
});

mp.events.add('charCreator:gta5Save', (stockValuesJson, featuresJson, appearanceJson, hairJson, clothesJson) => {
    if (!ccActive) return;
    try {
        const out = ccGta5ToFlowPayload(stockValuesJson, featuresJson, appearanceJson, hairJson, clothesJson);
        mp.events.callRemote('charCreator:save:s', JSON.stringify(out));
    } catch (e) {
        ccResetSaveUi('Ошибка данных внешности');
    }
});

mp.events.add('browserDomReady', (browser) => {
    if (browser !== ccBrowser) return;
    ccBrowserReady = true;
    if (ccActive) ccPushUiLoad();
});

mp.events.add('charCreator:cefReady', () => {
    ccBrowserReady = true;
    if (ccActive) ccPushUiLoad();
});

mp.events.add('charCreator:uiLoaded', () => {
    ccUiLoaded = true;
    ccStopLoadPoll();
});

setTimeout(() => {
    ccPreloadBrowser();
    ccPreloadModels();
}, 400);
