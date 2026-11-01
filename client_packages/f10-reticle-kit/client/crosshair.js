/**
 * Кастомный прицел: показ в HUD при сохранённом типе «Перекрестие», прицеливании и оружии.
 * Пока кастомный активен — нативный GTA-reticle (HUD 14) скрывается, чтобы не было двойного прицела.
 */
let _chLastVis = false;
let _chLastTgt = false;

function gameplayCamRotToDirection(rot) {
    try {
        const z = (rot.z * Math.PI) / 180;
        const x = (rot.x * Math.PI) / 180;
        const num = Math.abs(Math.cos(x));
        return { x: -Math.sin(z) * num, y: Math.cos(z) * num, z: Math.sin(x) };
    } catch (_e) {
        return { x: 0, y: 0, z: -1 };
    }
}

function getGameplayCamRay() {
    try {
        if (typeof mp !== 'undefined' && mp.cameras && mp.cameras.gameplay) {
            const gameplayCam = mp.cameras.gameplay.getCoord();
            const cameraDirection = mp.cameras.gameplay.getDirection();
            if (gameplayCam && cameraDirection) return { gameplayCam, cameraDirection };
        }
    } catch (_e) {}
    const gameplayCam = mp.game.cam.getGameplayCamCoord();
    const cameraDirection = gameplayCamRotToDirection(mp.game.cam.getGameplayCamRot(2));
    return { gameplayCam, cameraDirection };
}

function getFreeAimTargetFromRaycast() {
    try {
        const { gameplayCam, cameraDirection } = getGameplayCamRay();
        const R = 220;
        const end = new mp.Vector3(
            gameplayCam.x + cameraDirection.x * R,
            gameplayCam.y + cameraDirection.y * R,
            gameplayCam.z + cameraDirection.z * R
        );
        const flags = 2 | 4 | 8 | 16 | 32;
        const hit = mp.raycasting.testPointToPoint(gameplayCam, end, mp.players.local, flags);
        if (!hit || !hit.entity) return 0;
        if (mp.players.exists(hit.entity) && hit.entity !== mp.players.local) return hit.entity.handle;
        if (mp.vehicles.exists(hit.entity)) return hit.entity.handle;
    } catch (_e) {}
    return 0;
}

function getFreeAimEntity() {
    const hRay = getFreeAimTargetFromRaycast();
    if (hRay) return hRay;
    try {
        if (typeof mp.game.player.getEntityPlayerIsFreeAimingAt === 'function') {
            const r = mp.game.player.getEntityPlayerIsFreeAimingAt(mp.players.local.handle);
            if (r && r !== 0) return r;
        }
    } catch (_e) {}
    return 0;
}

/** PED::IS_PED_RELOADING — при перезарядке флаг прицеливания часто false, кастомный прицел не должен пропадать. */
function isLocalPedReloading() {
    try {
        const r = mp.game.invoke('0x24B100C68C645951', mp.players.local.handle);
        return r === 1 || r === true;
    } catch (_e) {
        return false;
    }
}

function parseCrosshairCfgFromSettings(st) {
    if (!st || typeof st.crosshair !== 'string' || !st.crosshair.length) return null;
    let parsed;
    try {
        parsed = JSON.parse(st.crosshair);
    } catch (_e) {
        return null;
    }
    if (Array.isArray(parsed) && parsed[0] && parsed[0].Type === 'Crosshair') {
        return parsed;
    }
    if (parsed && parsed.v === 2) {
        try {
            if (typeof global !== 'undefined' && global.__f10Reticle
                && typeof global.__f10Reticle.applyCrosshairDbPayload === 'function') {
                global.__f10Reticle.applyCrosshairDbPayload(st.crosshair);
            }
        } catch (_eApply) {}
        const st2 = mp.storage.data && mp.storage.data.settings;
        if (st2 && typeof st2.crosshair === 'string') {
            try {
                const again = JSON.parse(st2.crosshair);
                if (Array.isArray(again) && again[0] && again[0].Type === 'Crosshair') {
                    return again;
                }
            } catch (_e2) {}
        }
        if (Array.isArray(parsed.phantom) && parsed.phantom[0]) {
            const phantomStr = JSON.stringify(parsed.phantom);
            st.crosshair = phantomStr;
            mp.storage.flush();
            mp.events.call('hudCrosshairApply', phantomStr);
            return parsed.phantom;
        }
    }
    return null;
}

function isCustomCrosshairEnabled() {
    const st = mp.storage.data && mp.storage.data.settings;
    if (!st || st.crosshairEnabled === false) return false;
    return !!parseCrosshairCfgFromSettings(st);
}

function isPlayerDeadForCrosshair(p) {
    if (!p) return true;
    return p.getVariable('dead') === true || p.getVariable('mbaDead') === true;
}

function hideCustomCrosshair() {
    if (_chLastVis) {
        _chLastVis = false;
        mp.events.call('hudCrosshairShow', false);
    }
}

function hasCombatWeaponReady(p) {
    const unarmed = mp.game.joaat('weapon_unarmed');
    const weapon = p.weapon;
    return !!(weapon && weapon !== unarmed);
}

/** Прицеливание: ПКМ / free aim; ConfigFlag 78 только вне арены (на арене может залипать). */
function isLocalPlayerAiming() {
    try {
        if (mp.game.controls.isControlPressed(0, 25)) return true;
        if (mp.game.controls.isControlPressed(2, 25)) return true;
        if (mp.game.controls.isControlPressed(0, 257)) return true;
        if (mp.game.controls.isControlPressed(2, 257)) return true;
    } catch (_e) {}
    try {
        if (mp.game.player.isFreeAiming()) return true;
    } catch (_e2) {}
    try {
        const pl = mp.players.local;
        if (pl && pl.getVariable('inMbaArena') !== true && pl.getConfigFlag(78, true)) return true;
    } catch (_e3) {}
    return false;
}

if (typeof global !== 'undefined') {
    global.resetCrosshairRenderState = function resetCrosshairRenderState() {
        _chLastVis = false;
        _chLastTgt = false;
    };
}

mp.events.add('render', () => {
    const p = mp.players.local;
    if (!p || !mp.players.exists(p)) return;

    if (!isCustomCrosshairEnabled()) {
        hideCustomCrosshair();
        return;
    }

    const st = mp.storage.data && mp.storage.data.settings;
    const cfg = parseCrosshairCfgFromSettings(st);
    if (!cfg || !cfg[0] || cfg[0].Type !== 'Crosshair') {
        hideCustomCrosshair();
        return;
    }

    const previewActive = typeof global !== 'undefined'
        && global.__f10ReticlePreviewUntil
        && Date.now() < global.__f10ReticlePreviewUntil;

    if (!p.getVariable('auth') || isPlayerDeadForCrosshair(p)) {
        hideCustomCrosshair();
        return;
    }

    if (!previewActive) {
        if (!hasCombatWeaponReady(p)) {
            hideCustomCrosshair();
            return;
        }

        const reloading = isLocalPedReloading();
        if (!isLocalPlayerAiming() && !reloading) {
            hideCustomCrosshair();
            return;
        }
    }

    mp.game.ui.hideHudComponentThisFrame(14);

    if (!_chLastVis) {
        _chLastVis = true;
        mp.events.call('hudCrosshairShow', true);
    }

    const ent = getFreeAimEntity();
    const hasTarget = !!(ent && ent !== 0);
    if (hasTarget !== _chLastTgt) {
        _chLastTgt = hasTarget;
        mp.events.call('hudCrosshairTarget', hasTarget);
    }
});
