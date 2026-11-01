/**
 * Админ-слежка: attach + камера на голову, плавное переключение камеры, гашение управления.
 */

const SP_FOV = 52;
const SP_CAM_BLEND_IN = 220;
const SP_CAM_BLEND_OUT = 260;

let spcam = null;
let spectating = false;
/** @type {PlayerMp | null} */
let sptarget = null;

function destroySPCam() {
    try {
        if (spcam != null) {
            spcam.destroy();
            spcam = null;
        }
        mp.game.cam.renderScriptCams(false, true, SP_CAM_BLEND_OUT, true, true);
    } catch (_e) {}
}

function setSpectateLocalOff() {
    destroySPCam();
    try {
        mp.players.local.detach(true, true);
    } catch (_e) {}
    try {
        mp.players.local.freezePosition(false);
    } catch (_e) {}
    try {
        mp.players.local.setInvincible(false);
    } catch (_e2) {}
    spectating = false;
    sptarget = null;
    if (typeof global !== 'undefined') global.adminSpectateClientActive = false;
}

function parseToggle(toggle) {
    return toggle === true || toggle === 1 || toggle === '1' || toggle === 'true';
}

function attachSpectateCamera(target) {
    try {
        const camRot = mp.game.cam.getGameplayCamRot(2);
        const rot = new mp.Vector3(camRot.x, camRot.y, camRot.z);
        spcam = mp.cameras.new(
            'default',
            new mp.Vector3(target.position.x, target.position.y, target.position.z),
            rot,
            SP_FOV
        );
        try {
            spcam.setFov(SP_FOV);
        } catch (_f) {}
        spcam.setActive(true);
        try {
            // Кость головы (31086): чуть ближе и плотнее «в затылок», чем -5.5 / 5.2
            spcam.attachToPedBone(target.handle, 31086, -0.75, -3.95, 4.55, false);
        } catch (_bone) {
            try {
                spcam.attachToPedBone(target.handle, 31086, -1.0, -4.6, 4.85, false);
            } catch (_bone2) {
                console.log('[admin_spectate] attachToPedBone fallback failed');
            }
        }
        mp.game.cam.renderScriptCams(true, true, SP_CAM_BLEND_IN, true, false);
    } catch (e) {
        console.log(e);
        throw e;
    }
}

/** Боевое и взаимодействия — не мешают обзору. */
const SP_BLOCKED_CONTROLS = [24, 25, 37, 44, 45, 47, 58, 68, 69, 75, 92, 140, 141, 257, 263, 264];

mp.events.add('admin:spmode', (remoteId, toggle) => {
    try {
        const on = parseToggle(toggle);
        if (on) {
            const rid = Number(remoteId);
            if (!Number.isFinite(rid)) return;

            const target = mp.players.atRemoteId(rid);
            if (!target || !mp.players.exists(target)) {
                mp.events.callRemote('admin:spectate:unspec');
                return;
            }

            if (typeof global !== 'undefined' && global.flyStatus === true) {
                mp.events.call('adminSession:setFly', false, true);
            }

            try {
                mp.players.local.setAlpha(0);
            } catch (_al) {}
            mp.events.callRemote('setInvisible', 0);

            destroySPCam();

            sptarget = target;
            spectating = true;
            if (typeof global !== 'undefined') global.adminSpectateClientActive = true;

            mp.players.local.attachTo(
                target.handle,
                -1,
                0,
                0,
                -6,
                0,
                0,
                0,
                true,
                false,
                false,
                false,
                0,
                false
            );
            try {
                mp.players.local.setInvincible(true);
            } catch (_i) {}

            attachSpectateCamera(target);
            mp.players.local.freezePosition(true);
        } else {
            if (typeof global !== 'undefined' && typeof global.forceSpectateExitFlyCleanup === 'function') {
                global.forceSpectateExitFlyCleanup();
            }
            setSpectateLocalOff();
        }
    } catch (e) {
        console.log(e);
        setSpectateLocalOff();
    }
});

mp.events.add('render', () => {
    if (!spectating) return;

    if (!sptarget || !mp.players.exists(sptarget)) {
        setSpectateLocalOff();
        mp.events.callRemote('admin:spectate:unspec');
        return;
    }

    try {
        for (let g = 0; g <= 2; g++) {
            for (let i = 0; i < SP_BLOCKED_CONTROLS.length; i++) {
                mp.game.controls.disableControlAction(g, SP_BLOCKED_CONTROLS[i], true);
            }
        }
    } catch (_e) {}

    if (spcam == null) return;

    try {
        const rotation = spcam.getRot(2);
        const xMagnitude = mp.game.controls.getDisabledControlNormal(0, 1);
        const yMagnitude = mp.game.controls.getDisabledControlNormal(0, 2);
        if (xMagnitude !== 0) rotation.z += -xMagnitude * 5.5;
        if (yMagnitude !== 0) {
            rotation.x += -yMagnitude * 5.5;
            if (rotation.x <= -89.0) rotation.x = -89.0;
            else if (rotation.x >= 89.0) rotation.x = 89.0;
        }
        spcam.setRot(rotation.x, rotation.y, rotation.z, 2);
    } catch (_e2) {}
});

if (typeof global !== 'undefined') {
    global.tryCloseAdminSpectateEsc = () => {
        if (!spectating) return false;
        mp.events.callRemote('admin:spectate:unspec');
        return true;
    };

    global.forceAdminSpectateDeathCleanup = () => {
        if (!spectating) return;
        if (typeof global !== 'undefined' && typeof global.forceSpectateExitFlyCleanup === 'function') {
            global.forceSpectateExitFlyCleanup();
        }
        setSpectateLocalOff();
        mp.events.callRemote('admin:spectate:abort');
    };
}

function canUseSpectateKeys() {
    return (
        spectating &&
        !mp.game.ui.isPauseMenuActive() &&
        !mp.players.local.isTypingInTextChat &&
        mp.players.local.getVariable('dead') !== true
    );
}

global.bindGameplayKey(0xdb, true, () => {
    if (!canUseSpectateKeys()) return;
    mp.events.callRemote('admin:spectate:cycle', false);
});

global.bindGameplayKey(0xdd, true, () => {
    if (!canUseSpectateKeys()) return;
    mp.events.callRemote('admin:spectate:cycle', true);
});
