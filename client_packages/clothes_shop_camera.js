/** Общая камера магазинов одежды — ближе + фокус по категории. */

const CLOTHES_SHOP_CAM_FOV = 42;
const CLOTHES_SHOP_CAM_DIST = 2.35;

/** Точка на теле, куда смотрит камера (относительно ped.z). */
const CATEGORY_TARGET_Z = {
    2: 0.72,
    1: 0.78,
    3: 0.48,
    8: 0.32,
    9: 0.38,
    4: 0.08,
    5: -0.28,
    7: 0.66,
    6: 0.42,
    12: 0.74,
    13: 0.38,
    14: 0.45,
    15: 0.5
};

function categoryTargetZ(clothId) {
    const z = CATEGORY_TARGET_Z[Number(clothId)];
    return Number.isFinite(z) ? z : 0.45;
}

function headingForward(hDeg) {
    const rad = (Number(hDeg) || 0) * (Math.PI / 180);
    return { x: -Math.sin(rad), y: Math.cos(rad) };
}

global.createClothesShopCameraState = function () {
    return {
        cam: null,
        clothId: 3,
        mode: 'strawberry',
        basePos: null,
        heading: 0,
        camHeading: 0,
        dist: CLOTHES_SHOP_CAM_DIST,
        lastCursor: [0, 0],
        res: mp.game.graphics.getScreenActiveResolution(0, 0),
        dragging: false
    };
};

function destroyCam(state) {
    if (!state || !state.cam) return;
    try {
        state.cam.setActive(false);
        state.cam.destroy();
    } catch (_e) {}
    state.cam = null;
    mp.game.cam.renderScriptCams(false, false, 0, true, false);
}

global.CLOTHES_SHOP_STRAWBERRY_PREVIEW = {
    x: 74.81729888916016,
    y: -1400.3656005859375,
    z: 29.376155853271484,
    h: 0
};

function getPedFocusPos(state) {
    const ped = mp.players.local;
    const base = state.mode === 'strawberry'
        ? ped.position
        : (state.basePos || ped.position);
    const tz = categoryTargetZ(state.clothId);
    return new mp.Vector3(base.x, base.y, base.z + tz);
}

function computeWorldCamera(state) {
    const ped = mp.players.local;
    const base = state.basePos || ped.position;
    const h = Number(state.camHeading != null ? state.camHeading : state.heading);
    if (!Number.isFinite(h)) return null;
    const fwd = headingForward(h);
    const target = getPedFocusPos(state);
    const dist = state.dist || CLOTHES_SHOP_CAM_DIST;
    const camPos = new mp.Vector3(
        base.x + fwd.x * dist,
        base.y + fwd.y * dist,
        target.z + 0.08
    );
    return { camPos, target };
}

global.applyClothesShopCamera = function (state) {
    if (!state) return;
    destroyCam(state);

    if (state.mode === 'strawberry') {
        const target = getPedFocusPos(state);
        const camPos = new mp.Vector3(75.0, -1395.0, target.z + 0.12);
        state.cam = mp.cameras.new('default', camPos, new mp.Vector3(0, 0, 0), CLOTHES_SHOP_CAM_FOV);
        state.cam.pointAtCoord(target.x, target.y, target.z);
    } else {
        const cfg = computeWorldCamera(state);
        if (!cfg) return;
        state.cam = mp.cameras.new('default', cfg.camPos, new mp.Vector3(0, 0, 0), CLOTHES_SHOP_CAM_FOV);
        state.cam.pointAtCoord(cfg.target.x, cfg.target.y, cfg.target.z);
    }

    state.cam.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
};

global.setClothesShopCameraCategory = function (state, clothId) {
    if (!state) return;
    state.clothId = Number(clothId) || 3;
    if (state.cam && state.cam.isActive()) global.applyClothesShopCamera(state);
};

global.setClothesShopCameraWorld = function (state, pos, heading, mode) {
    if (!state) return;
    state.mode = mode || 'world';
    state.basePos = pos;
    const h = Number(heading) || 0;
    state.heading = h;
    state.camHeading = h;
    global.applyClothesShopCamera(state);
};

const CLOTHES_SHOP_PANEL_LEFT = 297;
const CLOTHES_SHOP_PANEL_RIGHT = 320;
const CLOTHES_SHOP_ROT_SENS = 50;

let clothesShopCamCtrlState = null;

function clothesShopCursorOnPanel(screenX) {
    const x = Number(screenX);
    if (!Number.isFinite(x)) return false;
    const res = mp.game.graphics.getScreenActiveResolution(0, 0);
    return x < CLOTHES_SHOP_PANEL_LEFT || x > res.x - CLOTHES_SHOP_PANEL_RIGHT;
}

function clothesShopCameraRender() {
    const state = clothesShopCamCtrlState;
    if (!state || !state.cam || !state.cam.isActive()) return;
    if (global.__clothesShopOpen !== true) return;

    mp.game.controls.disableAllControlActions(0);
    mp.game.controls.disableAllControlActions(1);
    mp.game.controls.disableAllControlActions(2);

    const cur = mp.gui.cursor.position;
    const resX = state.res && state.res.x > 0 ? state.res.x : mp.game.graphics.getScreenActiveResolution(0, 0).x;
    const deltaX = (cur[0] - state.lastCursor[0]) / resX;
    const lmb = mp.game.controls.isDisabledControlPressed(0, 24);
    const rmb = mp.game.controls.isDisabledControlPressed(0, 25);
    const dragging = state.dragging === true || lmb || rmb;

    if (dragging && Math.abs(deltaX) > 0.00001 && !clothesShopCursorOnPanel(cur[0])) {
        const ped = mp.players.local;
        ped.setHeading(ped.getHeading() + deltaX * CLOTHES_SHOP_ROT_SENS);
    }
    state.lastCursor = [cur[0], cur[1]];
}

if (!global.__clothesShopCamRenderBound) {
    global.__clothesShopCamRenderBound = true;
    mp.events.add('render', clothesShopCameraRender);
}

if (!global.__clothesShopCamClickBound) {
    global.__clothesShopCamClickBound = true;
    mp.events.add('click', (absX, _absY, upOrDown, leftOrRight) => {
        const state = clothesShopCamCtrlState;
        if (!state || !state.cam || !state.cam.isActive()) return;
        if (global.__clothesShopOpen !== true) return;
        if (leftOrRight !== 'left' && leftOrRight !== 'right') return;
        if (upOrDown === 'down') {
            if (!clothesShopCursorOnPanel(absX)) {
                state.dragging = true;
                const cur = mp.gui.cursor.position;
                state.lastCursor = [cur[0], cur[1]];
            }
        } else if (upOrDown === 'up') {
            state.dragging = false;
        }
    });
}

global.destroyClothesShopCamera = function (state) {
    if (!state) return;
    destroyCam(state);
    state.dragging = false;
    state.basePos = null;
    state.mode = 'strawberry';
    if (clothesShopCamCtrlState === state) clothesShopCamCtrlState = null;
};

global.openClothesShopPreviewCamera = function (state, preview, delayMs) {
    if (!state) return;
    const p = preview || global.CLOTHES_SHOP_STRAWBERRY_PREVIEW;
    const delay = delayMs == null ? 150 : Number(delayMs) || 0;
    const apply = () => {
        const pos = new mp.Vector3(p.x, p.y, p.z);
        global.setClothesShopCameraWorld(state, pos, p.h, 'world');
        global.bindClothesShopCameraControls(state);
    };
    if (delay > 0) setTimeout(apply, delay);
    else apply();
};

global.bindClothesShopCameraControls = function (state) {
    if (!state) return;
    state.res = mp.game.graphics.getScreenActiveResolution(0, 0);
    const cur = mp.gui.cursor.position;
    state.lastCursor = [cur[0], cur[1]];
    state.dragging = false;
    clothesShopCamCtrlState = state;
};

mp.events.add('clothes:shop:category:c', (clothId) => {
    try {
        if (global.__clothesShopOpen !== true) return;
        if (global.__clothesShopCamState) global.setClothesShopCameraCategory(global.__clothesShopCamState, clothId);
    } catch (_e) {}
});
