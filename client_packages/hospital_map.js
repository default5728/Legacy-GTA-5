'use strict';

/**
 * Davis EMS hospital — gta5rp_dge_hospital.
 * Стабилизация без мерцания: IPL/refresh/hide один раз, pin без перезагрузки интерьера.
 */
const HOSPITAL_CENTER = { x: 350.0, y: -1400.0, z: 32.5 };
const HOSPITAL_SPAWN = { x: 332.7427, y: -1404.4457, z: 37.9112 };
const HOSPITAL_INTERIOR = { x: 334.0, y: -1402.0, z: 37.5 };
const HOSPITAL_APPROACH_RADIUS = 220;
const HOSPITAL_ACTIVE_RADIUS = 150;
const HIDE_RADIUS = 140;

const PILLBOX_HOSPITAL_IPLS = [
    'rc12b_fixed',
    'rc12b_destroyed',
    'rc12b_default',
    'rc12b_hospitalinterior_lod',
    'rc12b_hospitalinterior',
];

const HOSPITAL_IPLS = [
    'int_medical',
    'hei_bh1_04_0',
    'hei_bh1_04_3',
    'bh1_04_0',
    'bh1_04_3',
    'hei_bh1_occl_02',
];

/** LOD не скрываем — иначе белые вспышки при переключении дистанции. */
const VANILLA_SHELL_MODELS = [
    'hei_bh1_04_build004',
    'bh1_04_build004',
    'hei_bh1_04_em',
    'bh1_04_em',
    'hei_bh1_04_details1',
    'bh1_04_details1',
    'prop_hospitaldoors_start',
    'prop_hospitaldoors_front',
];

const HIDE_ANCHORS = [
    HOSPITAL_CENTER,
    HOSPITAL_SPAWN,
    { x: 358.0, y: -1410.0, z: 32.5 },
    { x: 340.0, y: -1390.0, z: 32.5 },
];

const COLLISION_POINTS = [
    HOSPITAL_CENTER,
    HOSPITAL_SPAWN,
    HOSPITAL_INTERIOR,
    { x: 342.0, y: -1397.0, z: 32.5 },
    { x: 330.0, y: -1410.0, z: 37.9 },
];

let bootstrapDone = false;
let collisionPrimed = false;
let insideHospitalZone = false;

const requestedIpls = new Set();
const hiddenModelKeys = new Set();
const pinnedInteriorIds = new Set();
const refreshedInteriorIds = new Set();

function distSqToHospital(pos) {
    const dx = pos.x - HOSPITAL_CENTER.x;
    const dy = pos.y - HOSPITAL_CENTER.y;
    return dx * dx + dy * dy;
}

function isApproachingHospital() {
    return distSqToHospital(mp.players.local.position) <= HOSPITAL_APPROACH_RADIUS * HOSPITAL_APPROACH_RADIUS;
}

function isInsideHospitalZone() {
    return distSqToHospital(mp.players.local.position) <= HOSPITAL_ACTIVE_RADIUS * HOSPITAL_ACTIVE_RADIUS;
}

function removePillboxHospitalIplsOnce() {
    for (let i = 0; i < PILLBOX_HOSPITAL_IPLS.length; i++) {
        try { mp.game.streaming.removeIpl(PILLBOX_HOSPITAL_IPLS[i]); } catch (_e) {}
    }
}

function requestHospitalIplsOnce() {
    for (let i = 0; i < HOSPITAL_IPLS.length; i++) {
        const ipl = HOSPITAL_IPLS[i];
        if (requestedIpls.has(ipl)) continue;
        try { mp.game.streaming.requestIpl(ipl); } catch (_e) {}
        requestedIpls.add(ipl);
    }
}

function hideVanillaShellOnce() {
    for (let a = 0; a < HIDE_ANCHORS.length; a++) {
        const anchor = HIDE_ANCHORS[a];
        for (let i = 0; i < VANILLA_SHELL_MODELS.length; i++) {
            const hash = mp.game.joaat(VANILLA_SHELL_MODELS[i]) >>> 0;
            const key = `${anchor.x}|${anchor.y}|${hash}`;
            if (hiddenModelKeys.has(key)) continue;
            try {
                if (typeof mp.game.entity.createModelHideExcludingScriptObjects === 'function') {
                    mp.game.entity.createModelHideExcludingScriptObjects(
                        anchor.x, anchor.y, anchor.z, HIDE_RADIUS, hash, true
                    );
                } else {
                    mp.game.entity.createModelHide(anchor.x, anchor.y, anchor.z, HIDE_RADIUS, hash, true);
                }
                hiddenModelKeys.add(key);
            } catch (_e) {}
        }
    }
}

function primeHospitalCollision() {
    for (let i = 0; i < COLLISION_POINTS.length; i++) {
        const p = COLLISION_POINTS[i];
        try { mp.game.streaming.requestCollisionAtCoord(p.x, p.y, p.z); } catch (_e) {}
    }
    const pos = mp.players.local.position;
    try { mp.game.streaming.requestCollisionAtCoord(pos.x, pos.y, pos.z); } catch (_e2) {}
    collisionPrimed = true;
}

function pinHospitalInteriors(allowRefresh) {
    const points = [HOSPITAL_CENTER, HOSPITAL_SPAWN, HOSPITAL_INTERIOR];
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        let interiorId = 0;
        try { interiorId = mp.game.interior.getInteriorAtCoords(p.x, p.y, p.z); } catch (_e) {}
        if (!interiorId) continue;

        if (!pinnedInteriorIds.has(interiorId)) {
            try { mp.game.interior.pinInterior(interiorId); } catch (_e2) {}
            pinnedInteriorIds.add(interiorId);
        }

        if (allowRefresh && !refreshedInteriorIds.has(interiorId)) {
            try { mp.game.interior.refreshInterior(interiorId); } catch (_e3) {}
            refreshedInteriorIds.add(interiorId);
        }
    }
}

function bootstrapHospitalMap() {
    if (bootstrapDone) return;
    removePillboxHospitalIplsOnce();
    requestHospitalIplsOnce();
    hideVanillaShellOnce();
    primeHospitalCollision();
    pinHospitalInteriors(true);
    bootstrapDone = true;
}

function stabilizeHospitalZone() {
    requestHospitalIplsOnce();
    if (!collisionPrimed) primeHospitalCollision();
    pinHospitalInteriors(false);
}

function onHospitalZoneEnter() {
    primeHospitalCollision();
    stabilizeHospitalZone();
}

bootstrapHospitalMap();
mp.events.add('playerReady', () => {
    bootstrapHospitalMap();
    if (isInsideHospitalZone()) onHospitalZoneEnter();
});

mp.events.add('playerSpawn', () => {
    if (!isApproachingHospital()) return;
    primeHospitalCollision();
    if (isInsideHospitalZone()) onHospitalZoneEnter();
});

setInterval(() => {
    const inside = isInsideHospitalZone();
    if (inside && !insideHospitalZone) {
        insideHospitalZone = true;
        onHospitalZoneEnter();
        return;
    }
    if (!inside) {
        insideHospitalZone = false;
        return;
    }
    stabilizeHospitalZone();
}, 15000);

setInterval(() => {
    if (!isApproachingHospital()) return;
    if (!collisionPrimed) primeHospitalCollision();
}, 5000);
