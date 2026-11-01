/** Особняки: блипы на карте + цилиндры у меток, интерьер, гараж, капт. */

const MANSION_PRICE_LABEL = '12500000$';

const MANSIONS_CFG = [
    { id: 1, ix: -582.30859375, iy: 501.9804382324219, iz: 105.70633697509766, ih: 19.288501739501953, ex: -580.4091186523438, ey: 492.4953918457031, ez: 108.90758514404297, eh: -168.30410766601562 },
    { id: 2, ix: -358.838134765625, iy: 512.0712280273438, iz: 119.59171295166016, ih: 128.03170776367188, ex: -349.6734313964844, ey: 514.48876953125, ez: 120.64421844482422, eh: -46.63935852050781 },
    { id: 3, ix: -304.0026550292969, iy: 385.0133361816406, iz: 110.30699157714844, ih: 29.675514221191406, ex: -298.14111328125, ey: 380.59539794921875, ez: 112.08951568603516, eh: -158.30589294433594 },
    { id: 4, ix: -1067.10009765625, iy: 434.9850769042969, iz: 73.86373138427734, ih: 80.48563385009766, ex: -1052.1641845703125, ey: 431.77008056640625, ez: 77.06375885009766, eh: 4.8257269859313965 },
    { id: 5, ix: -1123.2196044921875, iy: 474.9895935058594, iz: 82.16499328613281, ih: -116.4195327758789, ex: -1122.8006591796875, ey: 485.7011413574219, ez: 82.16085052490234, eh: -12.150529861450195 },
    { id: 6, ix: -608.0416259765625, iy: 519.77294921875, iz: 107.27452850341797, ih: 122.76521301269531, ex: -595.9595336914062, ey: 529.4129028320312, ez: 107.75602722167969, eh: -46.91120910644531 },
    { id: 7, ix: -621.4627685546875, iy: 496.3157653808594, iz: 107.57801818847656, ih: 54.163963317871094, ex: -622.6990356445312, ey: 489.4276123046875, ez: 108.83218383789062, eh: 179.4967803955078 },
    { id: 8, ix: -1082.7020263671875, iy: 433.4906921386719, iz: 73.6487808227539, ih: -95.53361511230469, ex: -1092.57568359375, ey: 427.01910400390625, ez: 75.6807632446289, eh: 48.325286865234375 },
    { id: 9, ix: -1025.3714599609375, iy: 498.7810363769531, iz: 79.21095275878906, ih: -65.4825439453125, ex: -1028.3265380859375, ey: 516.5233764648438, ez: 84.3809585571289, eh: 105.69652557373047 },
    { id: 10, ix: -979.107177734375, iy: 507.7668151855469, iz: 79.82669067382812, ih: 153.07440185546875, ex: -968.25634765625, ey: 509.2956237792969, ez: 81.67138671875, eh: -33.2565803527832 },
    { id: 11, ix: -345.731689453125, iy: 373.2847900390625, iz: 109.97480010986328, ih: 62.90401077270508, ex: -329.1776123046875, ey: 370.3535461425781, ez: 110.01727294921875, eh: -117.63123321533203 },
    { id: 12, ix: -362.9975280761719, iy: 362.08953857421875, iz: 109.59324645996094, ih: 158.8162841796875, ex: -371.3292541503906, ey: 345.0207214355469, ez: 110.04022979736328, eh: 166.82778930664062 },
    { id: 13, ix: -404.13128662109375, iy: 348.9764404296875, iz: 108.21487426757812, ih: 129.23379516601562, ex: -408.60797119140625, ey: 341.8921203613281, ez: 108.9074478149414, eh: 111.90351104736328 },
    { id: 14, ix: -323.5626220703125, iy: 468.6138610839844, iz: 109.18079376220703, ih: 80.31552124023438, ex: -312.3284606933594, ey: 474.61065673828125, ez: 111.8178482055664, eh: -52.68975830078125 },
    { id: 15, ix: -317.7733154296875, iy: 436.1032409667969, iz: 108.91425323486328, ih: 22.07636260986328, ex: -305.2979431152344, ey: 432.4039306640625, ez: 110.30926513671875, eh: -169.27841186523438 },
    { id: 16, ix: -528.482421875, iy: 438.21435546875, iz: 97.51220703125, ih: 118.42138671875, ex: -516.80810546875, ey: 433.21533203125, ez: 97.807861328125, eh: -61.583984375 },
    { id: 17, ix: -512.8134765625, iy: 556.482421875, iz: 120.1982421875, ih: 102.3046875, ex: -497.5126953125, ey: 550.81298828125, ez: 120.89794921875, eh: -78.92578125 },
    { id: 18, ix: -390.521484375, iy: 552.791015625, iz: 123.4013671875, ih: 108.984375, ex: -375.81298828125, ey: 546.521484375, ez: 124.1484375, eh: -72.421875 },
    { id: 19, ix: -532.541015625, iy: 598.81298828125, iz: 120.4013671875, ih: 96.328125, ex: -517.81298828125, ey: 592.521484375, ez: 121.1259765625, eh: -84.375 },
    { id: 20, ix: -1099.521484375, iy: 483.18798828125, iz: 77.1982421875, ih: 88.59375, ex: -1085.18798828125, ey: 477.81298828125, ez: 77.81298828125, eh: -91.40625 }
];

const MANSION_CFG_MAX_ID = MANSIONS_CFG.reduce((max, m) => Math.max(max, m.id), 0);

const DIM_GARAGE_BASE = 8610;

/** Меню: улица / гараж (интерьер особняка). */
const INTERIOR_HUB_MENU = {
    x: 556.7576293945312,
    y: 10.40213680267334,
    z: -48.99991989135742
};
const INTERIOR_HUB_RADIUS = 3.5;

const INTERIOR_WAREHOUSE = { x: 543.9423217773438, y: 2.154895305633545, z: -48.99991989135742 };

const INTERIOR_CAPT_TP = { x: 561.5744018554688, y: -2.2084014415740967, z: -48.999881744384766 };

const OFFICE_WAREHOUSE = { x: -147.208251953125, y: -637.8573608398438, z: 168.82046508789062 };

const OFFICE_CAPT_TP = { x: -145.54095458984375, y: -643.2066040039062, z: 168.82046508789062 };

const INTERIOR_ZONE_R = 2.6;

/** Показывать плоский маркер-диск, если игрок в пределах (м). */
const MANSION_MARKER_DRAW_DIST = 72;

/** Центр зоны слотов семейного гаража (interior) — подсказка «Выход» над полом. */
const GARAGE_EXIT_HINT = { x: -85.58, y: -1993.45, z: 18.05 };

/** Точка выхода из офиса Arcadius (цилиндр там не рисуется — якорь для подписи). */
const OFFICE_EXIT_HINT = { x: -141.1987, y: -620.913, z: 168.8205 };

const MANSION_GROUND_Z_CACHE_MS = 700;
const mansionGroundZCache = new Map();

/** Z пола под точкой: короткий raycast вниз от конфиг-Z (не «небо» от getGroundZ на холмах), + clamp к Z из настроек. */
function markerFloorZ(wx, wy, zGuess) {
    const dim = mp.players.local.dimension;
    const key = `${dim}|${wx.toFixed(2)}|${wy.toFixed(2)}|${zGuess.toFixed(1)}`;
    const now = Date.now();
    const prev = mansionGroundZCache.get(key);
    if (prev && now - prev.t < MANSION_GROUND_Z_CACHE_MS) return prev.z;
    let floorZ = zGuess;
    try {
        const flags = 1 | 2 | 4 | 8 | 16 | 32;
        let hit = mp.raycasting.testPointToPoint(
            new mp.Vector3(wx, wy, zGuess + 1.25),
            new mp.Vector3(wx, wy, zGuess - 6.0),
            mp.players.local,
            flags
        );
        if (hit && hit.position && isFinite(hit.position.z)) {
            floorZ = hit.position.z;
        } else {
            hit = mp.raycasting.testPointToPoint(
                new mp.Vector3(wx, wy, zGuess + 18.0),
                new mp.Vector3(wx, wy, zGuess - 12.0),
                mp.players.local,
                flags
            );
            if (hit && hit.position && isFinite(hit.position.z)) floorZ = hit.position.z;
        }
        if (!(isFinite(floorZ) && floorZ > -500)) floorZ = zGuess;
        let gz = mp.game.gameplay.getGroundZFor3dCoord(wx, wy, zGuess + 35.0, 0, false);
        if (typeof gz === 'number' && isFinite(gz) && gz > 0 && Math.abs(gz - zGuess) < 12.0) {
            const low = Math.min(floorZ, gz);
            const high = Math.max(floorZ, gz);
            floorZ = low;
            if (high <= zGuess + 0.45) floorZ = high;
        }
        if (floorZ > zGuess + 0.55) floorZ = zGuess;
        if (floorZ < zGuess - 2.5) floorZ = zGuess;
    } catch (_e) {
        floorZ = zGuess;
    }
    const zOut = floorZ + 0.04;
    mansionGroundZCache.set(key, { z: zOut, t: now });
    return zOut;
}

/** На полу: цилиндр типа 1; нижняя кромка на markerFloorZ, без двойного подъёма. */
function drawMansionCylinder(wx, wy, wz, scaleXY, height, r, g, b, a) {
    try {
        const base = markerFloorZ(wx, wy, wz);
        mp.game.graphics.drawMarker(
            1,
            wx,
            wy,
            base,
            0,
            0,
            0,
            0,
            0,
            0,
            scaleXY,
            scaleXY,
            height,
            r,
            g,
            b,
            a,
            false,
            false,
            2,
            false,
            null,
            null,
            false
        );
    } catch (_e) {}
}

/**
 * Подпись над полом / над цилиндром (мировые координаты), не привязка к HUD.
 * @param {number} heightAboveFloor от markerFloorZ (напр. высота цилиндра + зазор)
 */
function drawMansionWorldLabel(wx, wy, wzGuess, heightAboveFloor, text) {
    const base = markerFloorZ(wx, wy, wzGuess);
    const z = base + (typeof heightAboveFloor === 'number' ? heightAboveFloor : 0.35);
    try {
        mp.game.graphics.drawText(String(text), [wx, wy, z], {
            font: 4,
            color: [232, 232, 238, 240],
            scale: [0.36, 0.36],
            outline: true
        });
    } catch (_e) {}
}

function isLocalPlayerVehicleDriver(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return false;
    const p = mp.players.local;
    try {
        if (veh.getPedInSeat(-1) === p.handle) return true;
    } catch (_e) {}
    try {
        if (typeof veh.getPedInSeat === 'function' && veh.getPedInSeat(0) === p.handle) return true;
    } catch (_e1b) {}
    try {
        if (p.vehicle === veh && (p.seat === 0 || p.seat === -1)) return true;
    } catch (_e2) {}
    return false;
}

/** В гараже p.vehicle иногда отстаёт; ищем ТС, где локальный пед водитель. */
function getLocalVehicleAsDriver() {
    const p = mp.players.local;
    const wantDim = p.dimension;
    let v = p.vehicle;
    if (v && mp.vehicles.exists(v) && Number(v.dimension) === Number(wantDim) && isLocalPlayerVehicleDriver(v)) return v;
    let found = null;
    try {
        mp.vehicles.forEach((veh) => {
            if (found || !veh || !mp.vehicles.exists(veh)) return;
            if (Number(veh.dimension) !== Number(wantDim)) return;
            if (isLocalPlayerVehicleDriver(veh)) found = veh;
        });
    } catch (_e) {}
    return found && mp.vehicles.exists(found) ? found : null;
}

let mansionSyncList = [];

const blipsSale = [];
const blipsOwn = [];

function destroyBlip(b) {
    try {
        if (b && mp.blips.exists(b)) b.destroy();
    } catch (_e) {}
}

function clearMansionWorldGfx() {
    blipsSale.forEach(destroyBlip);
    blipsSale.length = 0;
    blipsOwn.forEach(destroyBlip);
    blipsOwn.length = 0;
}

function rebuildMansionWorldGfx() {
    clearMansionWorldGfx();
    let myFam = '';
    try {
        const f = mp.players.local.getVariable('family');
        if (f != null && String(f).trim() !== '') myFam = String(f).trim();
    } catch (_e) {}

    mansionSyncList.forEach((row) => {
        const cfg = MANSIONS_CFG.find((m) => m.id === row.id);
        if (!cfg) return;
        const owned = row.ownerFamilyName && String(row.ownerFamilyName).trim() !== '';
        const mine = owned && myFam && myFam === String(row.ownerFamilyName);
        /** Легенда карты сортирует имена лексикографически — для порядка 1..15 паддим до 2 цифр. */
        const nm = `Особняк ${String(row.id).padStart(2, '0')}`;

        if (!owned) {
            /* Как POI в blips.js (EMS и т.д.): shortRange — жёлтый «дом» на миникарте рядом + та же метка на карте. */
            const bSale = mp.blips.new(40, new mp.Vector3(cfg.ex, cfg.ey, cfg.ez), {
                name: nm,
                scale: 1.0,
                color: 5,
                shortRange: true,
                dimension: 0
            });
            blipsSale.push(bSale);
        } else if (mine) {
            const bMine = mp.blips.new(40, new mp.Vector3(cfg.ex, cfg.ey, cfg.ez), {
                name: nm,
                scale: 0.92,
                color: 2,
                shortRange: false,
                dimension: 0
            });
            blipsOwn.push(bMine);
        }
    });
}

function dist(ax, ay, az, bx, by, bz) {
    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function drawMansionWorldRings(px, py, pz, p) {
    let myFam = '';
    try {
        const f = p.getVariable('family');
        if (f != null && String(f).trim() !== '') myFam = String(f).trim();
    } catch (_e) {}

    mansionSyncList.forEach((row) => {
        const cfg = MANSIONS_CFG.find((m) => m.id === row.id);
        if (!cfg) return;
        const owned = row.ownerFamilyName && String(row.ownerFamilyName).trim() !== '';
        const mine = owned && myFam && myFam === String(row.ownerFamilyName);

        // Красный цилиндр у метки «инфо»: и при гос. продаже, и после покупки (текст владельца на месте).
        if (dist(px, py, pz, cfg.ix, cfg.iy, cfg.iz) < MANSION_MARKER_DRAW_DIST) {
            drawMansionCylinder(cfg.ix, cfg.iy, cfg.iz, 1.12, 0.42, 220, 38, 38, 200);
        }

        if (!owned) {
            if (dist(px, py, pz, cfg.ex, cfg.ey, cfg.ez) < MANSION_MARKER_DRAW_DIST) {
                drawMansionCylinder(cfg.ex, cfg.ey, cfg.ez, 1.0, 0.4, 232, 232, 238, 195);
            }
        } else if (mine) {
            if (dist(px, py, pz, cfg.ex, cfg.ey, cfg.ez) < MANSION_MARKER_DRAW_DIST) {
                drawMansionCylinder(cfg.ex, cfg.ey, cfg.ez, 1.04, 0.4, 232, 232, 238, 205);
            }
        }
    });
}

function getInteriorDimLocal() {
    try {
        const v = mp.players.local.getVariable('familyInteriorDim');
        const n = parseInt(String(v), 10);
        return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (_e) {
        return 0;
    }
}

function isInFamilyInterior() {
    const need = getInteriorDimLocal();
    if (!need) return false;
    return mp.players.local.dimension === need;
}

mp.events.add('familyMansion:sync:c', (json) => {
    try {
        mansionSyncList = JSON.parse(String(json || '[]'));
        if (!Array.isArray(mansionSyncList)) mansionSyncList = [];
        rebuildMansionWorldGfx();
    } catch (_e) {
        mansionSyncList = [];
    }
});

function resolveVehicleByRemoteId(rid) {
    const id = parseInt(String(rid), 10);
    if (!Number.isFinite(id) || id < 0) return null;
    let v = null;
    try {
        if (typeof mp.vehicles.atRemoteId === 'function') v = mp.vehicles.atRemoteId(id);
    } catch (_e) {}
    if (v && mp.vehicles.exists(v)) return v;
    try {
        mp.vehicles.forEach((veh) => {
            if (v || !veh || !mp.vehicles.exists(veh)) return;
            if (veh.remoteId === id || veh.id === id) v = veh;
        });
    } catch (_e2) {}
    return v && mp.vehicles.exists(v) ? v : null;
}

/** Сервер сразу снимает с ТС — local.vehicle часто null; ищем по remoteId или семейное авто в том же измерении. */
function resolveFamilyGarageVehicleForExit(vehRemoteId) {
    const p = mp.players.local;
    let v = resolveVehicleByRemoteId(vehRemoteId);
    if (v && mp.vehicles.exists(v)) return v;
    try {
        if (p.vehicle && mp.vehicles.exists(p.vehicle)) return p.vehicle;
    } catch (_e0) {}
    const wantDim = p.dimension;
    let best = null;
    let bestDist = 1e12;
    const px = p.position.x;
    const py = p.position.y;
    const pz = p.position.z;
    try {
        mp.vehicles.forEach((veh) => {
            if (!veh || !mp.vehicles.exists(veh)) return;
            try {
                if (veh.dimension !== wantDim) return;
                if (veh.getVariable('familyGarage') !== true && veh.getVariable('familyGarage') !== 1) return;
                const dx = veh.position.x - px;
                const dy = veh.position.y - py;
                const dz = veh.position.z - pz;
                const d = dx * dx + dy * dy + dz * dz;
                if (d < bestDist) {
                    bestDist = d;
                    best = veh;
                }
            } catch (_e1) {}
        });
    } catch (_e2) {}
    return best && mp.vehicles.exists(best) ? best : null;
}

let famGarExitApplyToken = 0;

mp.events.add('familyMansion:garageEngineExit:c', (vehRemoteId, x, y, z, h) => {
    const tok = ++famGarExitApplyToken;
    const xf = Number(x);
    const yf = Number(y);
    const zf = Number(z);
    if (!isFinite(xf) || !isFinite(yf) || !isFinite(zf)) return;
    setTimeout(() => {
        if (tok !== famGarExitApplyToken) return;
        const veh = resolveFamilyGarageVehicleForExit(vehRemoteId);
        if (!veh || !mp.vehicles.exists(veh)) return;
        try {
            mp.game.streaming.requestCollisionAtCoord(xf, yf, zf);
        } catch (_e0) {}
        try {
            if (veh.handle) mp.game.entity.placeOnGroundProperly(veh.handle, false);
        } catch (_ePg) {}
    }, 320);
});

function requestMansionSyncFromServer() {
    try {
        if (!mp.players.local.getVariable('auth')) return;
        mp.events.callRemote('familyMansion:sync:s');
    } catch (_e) {}
}

mp.events.add('playerReady', () => {
    setTimeout(requestMansionSyncFromServer, 4000);
});

mp.events.addDataHandler('auth', (entity, value) => {
    try {
        if (entity !== mp.players.local) return;
        if (value === true || value === 1) {
            setTimeout(requestMansionSyncFromServer, 600);
            setTimeout(requestMansionSyncFromServer, 3500);
        }
    } catch (_e) {}
});

mp.events.add('hideLogin', () => {
    setTimeout(requestMansionSyncFromServer, 800);
});

mp.events.addDataHandler('family', () => {
    rebuildMansionWorldGfx();
});

mp.events.addDataHandler('familyInteriorDim', () => {
    rebuildMansionWorldGfx();
});

let lastE = 0;

/** В машине GTA часто блокирует E — 38 + 51 (context), обычный и disabled. */
function garageInteractEJustPressed() {
    try {
        if (mp.game.controls.isControlJustPressed(0, 38)) return true;
    } catch (_e) {}
    try {
        if (mp.game.controls.isControlJustPressed(0, 51)) return true;
    } catch (_e05) {}
    try {
        if (typeof mp.game.controls.isDisabledControlJustPressed === 'function' && mp.game.controls.isDisabledControlJustPressed(0, 38)) {
            return true;
        }
    } catch (_e2) {}
    try {
        if (
            typeof mp.game.controls.isDisabledControlJustPressed === 'function' &&
            mp.game.controls.isDisabledControlJustPressed(0, 51)
        ) {
            return true;
        }
    } catch (_e3) {}
    return false;
}

function canE() {
    const n = Date.now();
    if (n - lastE < 600) return false;
    lastE = n;
    return true;
}

function getLocalFamilyId() {
    try {
        const v = mp.players.local.getVariable('familyID');
        const n = parseInt(String(v), 10);
        return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (_e) {
        return 0;
    }
}

function isFamilyOfficeInterior() {
    const fid = getLocalFamilyId();
    return fid > 0 && mp.players.local.dimension === fid + 5;
}

function inArcadiusOfficeExitZone() {
    const fid = getLocalFamilyId();
    if (!fid || mp.players.local.dimension !== fid + 5) return false;
    const p = mp.players.local.position;
    return dist(p.x, p.y, p.z, -141.1987, -620.913, 168.8205) < 2.15;
}

function drawInteriorFlatRings(px, py, pz) {
    const drawAt = (wx, wy, wz, sc, h) => {
        if (dist(px, py, pz, wx, wy, wz) > 48) return;
        drawMansionCylinder(wx, wy, wz, sc, h, 232, 232, 238, 198);
    };
    const drawCaptTp = (wx, wy, wz) => {
        if (dist(px, py, pz, wx, wy, wz) > 48) return;
        drawMansionCylinder(wx, wy, wz, 0.95, 0.42, 220, 38, 38, 228);
    };
    if (isInFamilyInterior()) {
        drawAt(INTERIOR_HUB_MENU.x, INTERIOR_HUB_MENU.y, INTERIOR_HUB_MENU.z, 1.0, 0.38);
        drawAt(INTERIOR_WAREHOUSE.x, INTERIOR_WAREHOUSE.y, INTERIOR_WAREHOUSE.z, 0.95, 0.36);
        drawCaptTp(INTERIOR_CAPT_TP.x, INTERIOR_CAPT_TP.y, INTERIOR_CAPT_TP.z);
    } else if (isFamilyOfficeInterior()) {
        drawAt(OFFICE_EXIT_HINT.x, OFFICE_EXIT_HINT.y, OFFICE_EXIT_HINT.z, 1.0, 0.38);
        drawAt(OFFICE_WAREHOUSE.x, OFFICE_WAREHOUSE.y, OFFICE_WAREHOUSE.z, 0.95, 0.36);
        drawCaptTp(OFFICE_CAPT_TP.x, OFFICE_CAPT_TP.y, OFFICE_CAPT_TP.z);
    }
}

let hubExitBrowser = null;
let hubExitCtx = '';
let hubExitOpenToken = 0;
let hubExitModalOpen = false;

/** Как в аренде/EMS: заморозка игрока, скрытие HUD/чата и курсор — через общий NPC-модал. */
function openFamilyHubExitModal() {
    if (hubExitModalOpen) return;
    hubExitModalOpen = true;
    if (typeof global.openNpcDialogModal === 'function') {
        global.openNpcDialogModal({ freeze: true });
        return;
    }
    if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();
    try {
        mp.players.local.freezePosition(true);
    } catch (_e) {}
    try {
        mp.gui.cursor.show(true, true);
    } catch (_e2) {}
}

function closeFamilyHubExitModal() {
    if (!hubExitModalOpen) return;
    hubExitModalOpen = false;
    if (typeof global.closeNpcDialogModal === 'function') {
        global.closeNpcDialogModal({ unfreeze: true });
        return;
    }
    try {
        mp.players.local.freezePosition(false);
    } catch (_e) {}
    try {
        mp.gui.cursor.show(false, false);
    } catch (_e2) {}
    if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
}

function closeFamilyHubExitUI() {
    try {
        if (hubExitBrowser && mp.browsers.exists(hubExitBrowser)) hubExitBrowser.destroy();
    } catch (_e) {}
    hubExitBrowser = null;
    hubExitCtx = '';
    closeFamilyHubExitModal();
}

mp.events.add('familyHubExit:open', (ctxRaw) => {
    if (!mp.players.local.getVariable('auth')) return;
    const ctx = String(ctxRaw || '');
    if (ctx !== 'mansion') return;
    closeFamilyHubExitUI();
    hubExitCtx = ctx;
    const tok = ++hubExitOpenToken;
    hubExitBrowser = mp.browsers.new('package://browsers/family/hubexit/index.html');
    hubExitBrowser.active = true;
    const tj = JSON.stringify('Выход из особняка');
    /* execute до готовности CEF теряется, поэтому повторяем; hubExitShow идемпотентен. */
    const showJs = `if(typeof hubExitShow==='function'){hubExitShow(${tj});}else{var r=document.getElementById('root');if(r){var h=document.getElementById('title');if(h)h.textContent=${tj};r.classList.add('active');}}`;
    [60, 180, 420, 900].forEach((ms) => {
        setTimeout(() => {
            if (tok !== hubExitOpenToken) return;
            try {
                if (hubExitBrowser && mp.browsers.exists(hubExitBrowser)) hubExitBrowser.execute(showJs);
            } catch (_e3) {}
        }, ms);
    });
    openFamilyHubExitModal();
});

mp.events.add('familyHubExit:pick', (choice) => {
    const ctx = hubExitCtx;
    closeFamilyHubExitUI();
    if (choice === 'cancel') return;
    if (choice !== 'street' && choice !== 'garage') return;
    if (ctx === 'mansion') {
        if (choice === 'street') mp.events.callRemote('familyMansion:exitInterior:s');
        else mp.events.callRemote('familyMansion:enterGarage:s');
    }
});

/** Смерть при открытом окне оставила бы игрока замороженным и без HUD. */
mp.events.addDataHandler('dead', (entity, value) => {
    try {
        if (entity !== mp.players.local) return;
        if (value === true || value === 1) closeFamilyHubExitUI();
    } catch (_e) {}
});

mp.events.add('render', () => {
    try {
        if (!mp.players.local.getVariable('auth')) return;
        if (mp.players.local.getVariable('dead')) return;
        if (mp.game.ui.isPauseMenuActive()) return;
        if (mp.players.local.isTypingInTextChat) return;
        /* Окно выхода модальное: пока открыто — без мировых меток и без реакции на E. */
        if (hubExitBrowser) return;

        const p = mp.players.local;
        const px = p.position.x;
        const py = p.position.y;
        const pz = p.position.z;
        const dim = p.dimension;

        if (isInFamilyInterior() || isFamilyOfficeInterior()) {
            drawInteriorFlatRings(px, py, pz);
        }

        if (dim === 0) {
            drawMansionWorldRings(px, py, pz, p);

            mansionSyncList.forEach((row) => {
                const cfg = MANSIONS_CFG.find((m) => m.id === row.id);
                if (!cfg) return;
                const owned = row.ownerFamilyName && String(row.ownerFamilyName).trim() !== '';
                const myFam = p.getVariable('family');
                const my = myFam != null && String(myFam).trim() !== '' ? String(myFam).trim() : '';

                const di = dist(px, py, pz, cfg.ix, cfg.iy, cfg.iz);
                if (di < 2.8) {
                    const nm = `Особняк ${row.id}`;
                    const priceStr = row.price != null ? `${row.price}$` : MANSION_PRICE_LABEL;
                    let label;
                    if (owned) {
                        label = `~w~${nm}\n~s~Владелец: ~y~${row.ownerFamilyName}`;
                    } else {
                        label = `~w~${nm} — инфо\n~s~Гос. продажа\n~g~${priceStr}\n~s~E — купить`;
                    }
                    drawMansionWorldLabel(cfg.ix, cfg.iy, cfg.iz, 0.42 + 0.16, label);
                    if (mp.game.controls.isControlJustPressed(0, 38) && canE()) {
                        if (!owned) {
                            mp.events.callRemote('familyMansion:purchase:s', row.id);
                        }
                    }
                }

                if (!owned) {
                    const deU = dist(px, py, pz, cfg.ex, cfg.ey, cfg.ez);
                    if (deU < 2.2 && di >= 2.8) {
                        const nmU = `Особняк ${row.id}`;
                        drawMansionWorldLabel(cfg.ex, cfg.ey, cfg.ez, 0.4 + 0.16, `~w~${nmU} — вход\n~s~Покупка у метки ~r~инфо`);
                    }
                }

                if (owned && my && my === String(row.ownerFamilyName)) {
                    const de = dist(px, py, pz, cfg.ex, cfg.ey, cfg.ez);
                    if (de < 2.2) {
                        drawMansionWorldLabel(cfg.ex, cfg.ey, cfg.ez, 0.4 + 0.16, `~w~Особняк ${row.id} — Вход`);
                        if (mp.game.controls.isControlJustPressed(0, 38) && canE()) {
                            mp.events.callRemote('familyMansion:enterInterior:s', row.id);
                        }
                    }
                }
            });
        }

        const inManInt = isInFamilyInterior();
        const inOffInt = isFamilyOfficeInterior();
        if (inManInt || inOffInt) {
            const wh = inManInt ? INTERIOR_WAREHOUSE : OFFICE_WAREHOUSE;
            const cap = inManInt ? INTERIOR_CAPT_TP : OFFICE_CAPT_TP;
            const dHubM = dist(px, py, pz, INTERIOR_HUB_MENU.x, INTERIOR_HUB_MENU.y, INTERIOR_HUB_MENU.z);
            const dWh = dist(px, py, pz, wh.x, wh.y, wh.z);
            const dCap = dist(px, py, pz, cap.x, cap.y, cap.z);

            const atMansionExit = inManInt && dHubM < INTERIOR_HUB_RADIUS;
            const atOfficeExit = inOffInt && inArcadiusOfficeExitZone();

            if (atMansionExit) {
                drawMansionWorldLabel(
                    INTERIOR_HUB_MENU.x,
                    INTERIOR_HUB_MENU.y,
                    INTERIOR_HUB_MENU.z,
                    0.38 + 0.15,
                    '~w~Выход из особняка'
                );
                if (mp.game.controls.isControlJustPressed(0, 38) && canE()) {
                    mp.events.call('familyHubExit:open', 'mansion');
                }
            } else if (atOfficeExit) {
                drawMansionWorldLabel(
                    OFFICE_EXIT_HINT.x,
                    OFFICE_EXIT_HINT.y,
                    OFFICE_EXIT_HINT.z,
                    0.38,
                    '~w~Выход с офиса (E)'
                );
            } else if (dWh < INTERIOR_ZONE_R) {
                drawMansionWorldLabel(wh.x, wh.y, wh.z, 0.36 + 0.14, '~w~Семейный склад');
                if (mp.game.controls.isControlJustPressed(0, 38) && canE()) {
                    mp.events.callRemote('family:warehouse:use:s');
                }
            } else if (dCap < INTERIOR_ZONE_R) {
                drawMansionWorldLabel(cap.x, cap.y, cap.z, 0.42 + 0.14, '~w~Телепорт на войну семей (E)');
                if (mp.game.controls.isControlJustPressed(0, 38) && canE()) {
                    mp.events.callRemote('familyMansion:warTeleport:s');
                }
            }
        }

        if (dim >= DIM_GARAGE_BASE + 1 && dim <= DIM_GARAGE_BASE + MANSION_CFG_MAX_ID) {
            drawMansionWorldLabel(GARAGE_EXIT_HINT.x, GARAGE_EXIT_HINT.y, GARAGE_EXIT_HINT.z, 0.52, '~w~Выход\n~s~E');
            const drvVeh = getLocalVehicleAsDriver();
            if (!drvVeh && garageInteractEJustPressed() && canE()) {
                mp.events.callRemote('familyMansion:garageExitWorld:s');
            }
            if (drvVeh) {
                const v = drvVeh;
                const rem = typeof v.remoteId === 'number' ? v.remoteId : -1;
                const loc = typeof v.id === 'number' ? v.id : -1;
                if (garageInteractEJustPressed() && canE()) {
                    mp.events.callRemote('familyMansion:garageEngineExit:s', rem, loc);
                }
            }
        }
    } catch (_e) {}
});

global.FAMILY_MANSION_GARAGE_DIM_MAX = DIM_GARAGE_BASE + MANSION_CFG_MAX_ID;

global.tryCloseFamilyHubExitEsc = function() {
    if (!hubExitBrowser) return false;
    closeFamilyHubExitUI();
    return true;
};
