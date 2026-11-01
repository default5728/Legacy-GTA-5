'use strict';

/** Камера авторизации — как veprais RP (auth.js setStartCam). */
let sceneryCamera = null;

const AUTH_CAM_VEPRAIS = {
    x: 809.11414,
    y: -19.974813,
    z: 97.08313,
    rx: 0,
    ry: 0,
    rz: -97.68315,
    fov: 70
};

function destroySceneryCamera() {
    if (!sceneryCamera) return;
    try {
        sceneryCamera.setActive(false);
        mp.game.cam.renderScriptCams(false, false, 0, true, false);
        sceneryCamera.destroy();
    } catch (_e) {}
    sceneryCamera = null;
}

function createVepraisAuthCamera() {
    destroySceneryCamera();
    sceneryCamera = mp.cameras.new(
        'default',
        new mp.Vector3(AUTH_CAM_VEPRAIS.x, AUTH_CAM_VEPRAIS.y, AUTH_CAM_VEPRAIS.z),
        new mp.Vector3(0, 0, 0),
        AUTH_CAM_VEPRAIS.fov
    );
    sceneryCamera.setRot(AUTH_CAM_VEPRAIS.rx, AUTH_CAM_VEPRAIS.ry, AUTH_CAM_VEPRAIS.rz, 2);
    sceneryCamera.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
}

mp.events.add('createCamera', (x, y, z, pointX, pointY, pointZ) => {
    destroySceneryCamera();
    sceneryCamera = mp.cameras.new('default', new mp.Vector3(x, y, z), new mp.Vector3(0, 0, 0), 40);
    sceneryCamera.pointAtCoord(pointX, pointY, pointZ);
    sceneryCamera.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
});

mp.events.add('createAuthCameraVeprais', () => {
    createVepraisAuthCamera();
});

mp.events.add('createCameraWithInterp', (x, y, z, pointX, pointY, pointZ) => {
    const duration = 3000;
    const targetCamera = mp.cameras.new('default', new mp.Vector3(x, y, z), new mp.Vector3(0, 0, 0), 40);
    targetCamera.pointAtCoord(pointX, pointY, pointZ);

    if (sceneryCamera) {
        targetCamera.setActiveWithInterp(sceneryCamera.handle, duration, 1, 1);
    } else {
        targetCamera.setActive(true);
        mp.game.cam.renderScriptCams(true, false, 0, true, false);
    }
    sceneryCamera = targetCamera;
});

mp.events.add('removeCamera', () => {
    destroySceneryCamera();
});
