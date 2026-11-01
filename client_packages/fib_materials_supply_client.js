'use strict';

const LOAD_POINT = {
    x: 183.9347,
    y: -3317.1069,
    z: 5.6327,
    label: 'Точка погрузки материалов'
};

const DELIVERY_LABEL = 'Сдача материалов с перехвата';
const FIB_UNLOAD_LABEL = 'Точка разгрузки материалов FIB';

const DELIVERY_POINTS = [
    { factionId: 6, x: 429.9854, y: -1020.6959, z: 28.8832, label: FIB_UNLOAD_LABEL, fibOnly: true },
    { factionId: 5, x: 1408.1099, y: -2055.3450, z: 51.9985, label: DELIVERY_LABEL },
    { factionId: 4, x: 833.9098, y: -2365.2024, z: 30.4660, label: DELIVERY_LABEL },
    { factionId: 3, x: 921.1250, y: -1537.4796, z: 30.8609, label: DELIVERY_LABEL },
    { factionId: 2, x: 7.1102, y: -1413.1913, z: 29.3290, label: DELIVERY_LABEL },
    { factionId: 1, x: 173.5946, y: -1736.8712, z: 29.2916, label: DELIVERY_LABEL }
];

const LOAD_DRAW_DIST = 38;
const LOAD_USE_DIST = 5.0;
const DELIVERY_DRAW_DIST = 18;
const DELIVERY_USE_DIST = 7.0;
const BARRACKS_HASH = mp.game.joaat('barracks');
const FIB_FRACTION_ID = 6;
const CRIME_FRACTION_MIN = 1;
const CRIME_FRACTION_MAX = 5;

let routeBlips = [];
let lastRouteMode = null;
let lastRouteFactionId = null;
let lastLoadPress = 0;
let routeSyncTimers = [];
let loadProgressUntil = 0;

function dist3d(px, py, pz, x, y, z) {
    const dx = px - x;
    const dy = py - y;
    const dz = pz - z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isLocalVehicleDriver() {
    const pl = mp.players.local;
    if (!pl || !pl.vehicle) return false;
    try {
        return pl.vehicle.getPedInSeat(-1) === pl.handle;
    } catch (_e) {
        return pl.seat === 0 || pl.seat === -1;
    }
}

function isDriverSeat(seat) {
    return seat === 0 || seat === -1;
}

function getVehicleModelHash(vehicle) {
    if (!vehicle) return 0;
    try {
        if (typeof vehicle.getModel === 'function') return vehicle.getModel();
        return vehicle.model;
    } catch (_e) {
        return 0;
    }
}

function vehicleFractionId(vehicle) {
    if (!vehicle) return 0;
    try {
        const f = vehicle.getVariable('fraction');
        return f != null ? parseInt(f, 10) || 0 : 0;
    } catch (_e) {
        return 0;
    }
}

function playerFractionId() {
    const pl = mp.players.local;
    if (!pl) return 0;
    const f = pl.getVariable('fraction');
    return f != null ? parseInt(f, 10) || 0 : 0;
}

function isCrimeFraction(fractionId) {
    return fractionId >= CRIME_FRACTION_MIN && fractionId <= CRIME_FRACTION_MAX;
}

/** Единственная точка сдачи для фракции игрока (FIB → база FIB, банда → своя база). */
function getDeliveryPointForFaction(fractionId) {
    const fr = parseInt(fractionId, 10) || 0;
    if (fr === FIB_FRACTION_ID) {
        for (let i = 0; i < DELIVERY_POINTS.length; i++) {
            const point = DELIVERY_POINTS[i];
            if (point.factionId === FIB_FRACTION_ID) return point;
        }
        return null;
    }
    if (isCrimeFraction(fr)) {
        for (let i = 0; i < DELIVERY_POINTS.length; i++) {
            const point = DELIVERY_POINTS[i];
            if (point.factionId === fr) return point;
        }
    }
    return null;
}

function getMyDeliveryPoint() {
    return getDeliveryPointForFaction(playerFractionId());
}

function isFibBarracksVehicle(vehicle, allowPendingMatsFlag) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return false;
    try {
        if (getVehicleModelHash(vehicle) !== BARRACKS_HASH) return false;
        if (vehicleFractionId(vehicle) !== FIB_FRACTION_ID) return false;

        const matsTruck = vehicle.getVariable('fibMatsTruck');
        if (matsTruck === true || matsTruck === 1 || matsTruck === 'true') return true;
        if (allowPendingMatsFlag) {
            if (matsTruck == null || matsTruck === undefined) {
                return vehicle.getVariable('fractioncar') === true;
            }
        }
        return false;
    } catch (_e) {
        return false;
    }
}

function isVehicleLoaded(vehicle) {
    if (!vehicle) return false;
    try {
        return vehicle.getVariable('fibMatsLoaded') === true;
    } catch (_e) {
        return false;
    }
}

function canUseFibMatsTruckNow() {
    const pl = mp.players.local;
    if (!pl || !pl.getVariable('auth')) return false;
    if (pl.dimension !== 0) return false;
    if (!isLocalVehicleDriver()) return false;
    if (!isFibBarracksVehicle(pl.vehicle, false)) return false;

    const fr = playerFractionId();
    const loaded = isVehicleLoaded(pl.vehicle);
    if (loaded) return fr === FIB_FRACTION_ID || isCrimeFraction(fr);
    return fr === FIB_FRACTION_ID;
}

function isFibWithUnloadedMatsTruck() {
    const pl = mp.players.local;
    if (!pl || !isLocalVehicleDriver()) return false;
    if (playerFractionId() !== FIB_FRACTION_ID) return false;
    if (!isFibBarracksVehicle(pl.vehicle, false)) return false;
    return !isVehicleLoaded(pl.vehicle);
}

function isLoadedMatsTruckDriver() {
    const pl = mp.players.local;
    if (!pl || !isLocalVehicleDriver()) return false;
    if (!isFibBarracksVehicle(pl.vehicle, false)) return false;
    if (!isVehicleLoaded(pl.vehicle)) return false;
    return canUseFibMatsTruckNow();
}

function clearRouteSyncTimers() {
    for (let i = 0; i < routeSyncTimers.length; i++) {
        try { clearTimeout(routeSyncTimers[i]); } catch (_e) {}
    }
    routeSyncTimers = [];
}

function clearFibMatsWaypoint() {
    try {
        const wp = mp.game.ui.getFirstBlipInfoId(8);
        if (wp && mp.game.ui.doesBlipExist(wp)) {
            mp.game.ui.removeBlip(wp);
        }
    } catch (_e) {}
}

function clearRouteBlips() {
    for (let i = 0; i < routeBlips.length; i++) {
        const blip = routeBlips[i];
        if (blip && mp.blips.exists(blip)) {
            try { blip.destroy(); } catch (_e) {}
        }
    }
    routeBlips = [];
    if (lastRouteMode != null) {
        clearFibMatsWaypoint();
    }
    lastRouteMode = null;
    lastRouteFactionId = null;
}

function setFibMatsWaypoint(x, y) {
    try { mp.game.ui.setNewWaypoint(Number(x), Number(y)); } catch (_e) {}
}

function createMapBlip(x, y, z, name, scale) {
    try {
        const blip = mp.blips.new(1, new mp.Vector3(Number(x), Number(y), Number(z)), {
            name: String(name || 'Поставка'),
            color: 1,
            shortRange: false,
            scale: scale || 1.0,
            alpha: 255,
            dimension: 0
        });
        if (blip) routeBlips.push(blip);
        return blip;
    } catch (_e) {
        return null;
    }
}

function showFibMatsRoute(loaded) {
    const mode = loaded ? 'delivery' : 'load';
    const routeFactionId = mode === 'delivery' ? playerFractionId() : 0;
    if (lastRouteMode === mode && lastRouteFactionId === routeFactionId && routeBlips.length > 0) return;

    clearRouteBlips();
    lastRouteMode = mode;
    lastRouteFactionId = routeFactionId;

    if (mode === 'load') {
        createMapBlip(LOAD_POINT.x, LOAD_POINT.y, LOAD_POINT.z, LOAD_POINT.label, 1.0);
        setFibMatsWaypoint(LOAD_POINT.x, LOAD_POINT.y);
        return;
    }

    const target = getMyDeliveryPoint();
    if (!target) {
        lastRouteMode = null;
        lastRouteFactionId = null;
        return;
    }

    createMapBlip(target.x, target.y, target.z, target.label || DELIVERY_LABEL, 1.0);
    setFibMatsWaypoint(target.x, target.y);
}

function syncFibMatsRouteBlips(force, loadedOverride) {
    if (!canUseFibMatsTruckNow()) {
        if (routeBlips.length || lastRouteMode != null) clearRouteBlips();
        return;
    }

    const pl = mp.players.local;
    const loaded = typeof loadedOverride === 'boolean'
        ? loadedOverride
        : isVehicleLoaded(pl.vehicle);
    const mode = loaded ? 'delivery' : 'load';
    const routeFactionId = mode === 'delivery' ? playerFractionId() : 0;

    if (!force && lastRouteMode === mode && lastRouteFactionId === routeFactionId && routeBlips.length > 0) return;
    showFibMatsRoute(loaded);
}

function scheduleRouteSync(force, loadedOverride) {
    clearRouteSyncTimers();
    const run = () => syncFibMatsRouteBlips(force, loadedOverride);
    run();
    routeSyncTimers.push(setTimeout(run, 120));
    routeSyncTimers.push(setTimeout(run, 400));
    routeSyncTimers.push(setTimeout(run, 900));
}

function canUseFibMatsLoad() {
    const pl = mp.players.local;
    if (!pl || !pl.getVariable('auth')) return false;
    if (pl.dimension !== 0) return false;
    if (pl.getVariable('dead') === true) return false;
    if (mp.game.ui.isPauseMenuActive()) return false;
    if (pl.isTypingInTextChat) return false;
    return isFibWithUnloadedMatsTruck();
}

function drawRedCylinder(x, y, z, scaleXY, height) {
    try {
        mp.game.graphics.drawMarker(
            1,
            x,
            y,
            z - 0.98,
            0, 0, 0,
            0, 0, 0,
            scaleXY,
            scaleXY,
            height,
            220, 38, 38, 215,
            false, false, 2, false, null, null, false
        );
    } catch (_e) {}
}

function drawRedLabel(x, y, z, text) {
    try {
        mp.game.graphics.drawText(
            text,
            [x, y, z],
            {
                font: 4,
                color: [255, 72, 72, 235],
                scale: [0.34, 0.34],
                outline: true,
                centre: true
            }
        );
    } catch (_e) {}
}

mp.events.add('fibMats:route:sync', (loaded) => {
    try {
        showFibMatsRoute(loaded === true || loaded === 1);
    } catch (_e) {}
});

mp.events.add('fibMats:load:progress', (ms) => {
    try {
        const duration = Math.max(1000, Number(ms) || 5000);
        loadProgressUntil = Date.now() + duration;
    } catch (_e) {
        loadProgressUntil = Date.now() + 5000;
    }
});

mp.events.add('fibMats:load:cancel', () => {
    loadProgressUntil = 0;
});

mp.events.add('fibMats:load:done', () => {
    loadProgressUntil = 0;
});

function isLoadProgressActive() {
    return loadProgressUntil > Date.now();
}

function drawLoadProgressHud() {
    if (!isLoadProgressActive()) return;
    const leftMs = Math.max(0, loadProgressUntil - Date.now());
    const leftSec = Math.max(1, Math.ceil(leftMs / 1000));
    try {
        mp.game.graphics.drawText(`Погрузка материалов... ${leftSec}с`, [0.5, 0.82], {
            font: 4,
            color: [255, 220, 120, 240],
            scale: [0.42, 0.42],
            outline: true,
            centre: true
        });
    } catch (_e) {}
    try {
        mp.game.controls.disableControlAction(0, 71, true);
        mp.game.controls.disableControlAction(0, 72, true);
        mp.game.controls.disableControlAction(0, 63, true);
        mp.game.controls.disableControlAction(0, 64, true);
        mp.game.controls.disableControlAction(0, 75, true);
    } catch (_e2) {}
}

mp.events.add('fibMats:route:clear', () => {
    try {
        clearRouteSyncTimers();
        clearRouteBlips();
    } catch (_e) {}
});

mp.events.addDataHandler('fibMatsLoaded', (entity, value) => {
    try {
        const pl = mp.players.local;
        if (!pl || !pl.vehicle || pl.vehicle !== entity) return;
        if (!isLocalVehicleDriver()) return;
        if (!canUseFibMatsTruckNow()) return;
        showFibMatsRoute(value === true);
    } catch (_e) {}
});

mp.events.addDataHandler('fibMatsTruck', (entity, value) => {
    try {
        const pl = mp.players.local;
        if (!pl || !pl.vehicle || pl.vehicle !== entity) return;
        if (!isLocalVehicleDriver()) return;
        if (value !== true) return;
        scheduleRouteSync(true);
    } catch (_e) {}
});

mp.events.addDataHandler('fraction', (entity) => {
    try {
        if (entity !== mp.players.local) return;
        if (!canUseFibMatsTruckNow()) return;
        scheduleRouteSync(true);
    } catch (_e) {}
});

setInterval(() => syncFibMatsRouteBlips(false), 500);

mp.events.add('playerEnterVehicle', (vehicle, seat) => {
    try {
        if (!isDriverSeat(seat)) return;
        if (!isFibBarracksVehicle(vehicle, true)) return;
        const loaded = isVehicleLoaded(vehicle);
        const fr = playerFractionId();
        if (loaded && (fr === FIB_FRACTION_ID || isCrimeFraction(fr))) {
            scheduleRouteSync(true, true);
            return;
        }
        if (!loaded && fr === FIB_FRACTION_ID) {
            scheduleRouteSync(true, false);
        }
    } catch (_e) {}
});

function onLeaveFibMatsVehicle() {
    try {
        loadProgressUntil = 0;
        clearRouteSyncTimers();
        clearRouteBlips();
    } catch (_e) {}
}

mp.events.add('playerLeaveVehicle', onLeaveFibMatsVehicle);
mp.events.add('playerExitVehicle', onLeaveFibMatsVehicle);

mp.events.add('render', () => {
    try {
        const pl = mp.players.local;
        if (!pl || !pl.getVariable('auth')) return;
        if (pl.dimension !== 0) return;

        drawLoadProgressHud();

        const px = pl.position.x;
        const py = pl.position.y;
        const pz = pl.position.z;

        if (isFibWithUnloadedMatsTruck()) {
            const loadDist = dist3d(px, py, pz, LOAD_POINT.x, LOAD_POINT.y, LOAD_POINT.z);
            if (loadDist <= LOAD_DRAW_DIST) {
                drawRedCylinder(LOAD_POINT.x, LOAD_POINT.y, LOAD_POINT.z, 2.4, 0.45);
                drawRedLabel(LOAD_POINT.x, LOAD_POINT.y, LOAD_POINT.z + 0.65, LOAD_POINT.label);
                if (loadDist <= LOAD_USE_DIST && canUseFibMatsLoad()) {
                    if (isLoadProgressActive()) {
                        drawRedLabel(LOAD_POINT.x, LOAD_POINT.y, LOAD_POINT.z + 1.05, 'Идёт погрузка...');
                    } else {
                        drawRedLabel(LOAD_POINT.x, LOAD_POINT.y, LOAD_POINT.z + 1.05, '[E] Погрузить материалы');
                        if (mp.game.controls.isControlJustPressed(0, 38)) {
                            const now = Date.now();
                            if (now - lastLoadPress < 900) return;
                            lastLoadPress = now;
                            mp.events.callRemote('fibMats:load:s');
                        }
                    }
                }
            }
        }

        if (isLoadedMatsTruckDriver()) {
            const point = getMyDeliveryPoint();
            if (point) {
                const d = dist3d(px, py, pz, point.x, point.y, point.z);
                if (d <= DELIVERY_DRAW_DIST) {
                    drawRedCylinder(point.x, point.y, point.z, 2.2, 0.4);
                    drawRedLabel(point.x, point.y, point.z + 0.65, point.label || DELIVERY_LABEL);
                }
            }
        }
    } catch (_e) {}
});
