// Дрон из инвентаря (item_drone): видна модель дрона, персонаж скрыт, камера FPV.
const VK_W = 0x57;
const VK_A = 0x41;
const VK_S = 0x53;
const VK_D = 0x44;
const VK_Q = 0x51;
const VK_E = 0x45;
const VK_SPACE = 0x20;
const VK_CTRL = 0x11;
const VK_BACK = 0x08;
const ToggleNightVisionKey = 0x75;
const ToggleThermalVisionKey = 0x76;
const DroneModel = 'ch_prop_casino_drone_02a';
const OffsetX = 0;
const OffsetY = -0.15;
const OffsetZ = -0.12;
const droneSpeed = 0.125;
const camMouseSens = 5.5;
const camKeyRotSpeed = 0.45;
const WALL_RAYCAST_FLAGS = 17;
const NATIVE_SET_ENTITY_COLLISION = '0x8339643499D1222E';
const DRONE_BLOCKED_CONTROLS = [24, 25, 37, 44, 45, 47, 58, 68, 69, 75, 92, 140, 141, 257, 263, 264];

function entityHandleOk(entity) {
    try {
        const h = Number(entity && entity.handle);
        return Number.isFinite(h) && h !== 0;
    } catch (_e) {
        return false;
    }
}

let droneObject = null;
let camObject = null;
let ownServerDroneObjId = null;
let isDroneActive = false;
let isDroneActivating = false;
let HasNightVision = false;
let HashermalVision = false;
let syncPosTick = 0;
let wallBeepCooldown = 0;

global.isDroneActiveClient = function isDroneActiveClient() {
    return isDroneActive === true;
};

function keyDown(vk) {
    try {
        return global.isGameplayKeyDown(vk);
    } catch (_e) {
        return false;
    }
}

function droneUiBlocked() {
    try {
        if (typeof global.isInventoryUiOpen === 'function' && global.isInventoryUiOpen()) return true;
        if (mp.gui.cursor.visible) return true;
        if (mp.game.ui.isPauseMenuActive()) return true;
    } catch (_e) {}
    return false;
}

function droneBlocked() {
    try {
        if (mp.players.local.vehicle) return true;
        if (typeof global.isCaptOrBizwarInArena === 'function' && global.isCaptOrBizwarInArena()) return true;
    } catch (_e) {}
    return false;
}

function hidePlayerPed(lp) {
    try {
        lp.setAlpha(0);
        lp.setVisible(false, false);
    } catch (_e) {}
}

function showPlayerPed(lp) {
    try {
        lp.setAlpha(255);
        lp.setVisible(true, true);
    } catch (_e) {}
}

function setPlayerDroneCollision(lp, enabled) {
    if (!entityHandleOk(lp)) return;
    try {
        mp.game.invoke(NATIVE_SET_ENTITY_COLLISION, lp.handle, enabled ? 1 : 0, enabled ? 1 : 0);
    } catch (_e) {}
}

function setDroneObjectCollision(enabled) {
    if (!droneObject || !mp.objects.exists(droneObject) || !entityHandleOk(droneObject)) return;
    try {
        mp.game.invoke(NATIVE_SET_ENTITY_COLLISION, droneObject.handle, enabled ? 1 : 0, enabled ? 1 : 0);
    } catch (_e) {}
}

function syncPlayerToDronePos(lp) {
    if (!droneObject || !mp.objects.exists(droneObject)) return;
    const p = droneObject.position;
    try {
        lp.setCoordsNoOffset(p.x, p.y, p.z, false, false, false);
    } catch (_e) {}
}

function getDroneYaw() {
    try {
        if (camObject) {
            const rot = camObject.getRot(2);
            if (rot && Number.isFinite(rot.z)) return rot.z;
        }
    } catch (_e) {}
    try {
        const h = mp.players.local.getHeading ? mp.players.local.getHeading() : 0;
        return Number.isFinite(h) ? h : 0;
    } catch (_e2) {
        return 0;
    }
}

function getMyStaticKey() {
    const myStatic = mp.players.local.getVariable('static');
    if (myStatic == null || myStatic === undefined) return null;
    return String(myStatic);
}

function droneObjIdMatches(obj, id) {
    if (!obj || id == null) return false;
    const numId = Number(id);
    if (!Number.isFinite(numId)) return false;
    return obj.id === numId || obj.remoteId === numId;
}

function isOwnServerDroneObj(obj) {
    if (!obj || obj === droneObject) return false;
    try {
        if (ownServerDroneObjId != null && droneObjIdMatches(obj, ownServerDroneObjId)) return true;
        const myStatic = getMyStaticKey();
        if (myStatic == null) return false;
        const ownerStatic = obj.getVariable('droneOwnerStatic');
        if (ownerStatic == null || ownerStatic === undefined) return false;
        return String(ownerStatic) === myStatic;
    } catch (_e) {
        return false;
    }
}

function hideServerDroneObj(obj) {
    if (!obj || !mp.objects.exists(obj)) return;
    try {
        obj.setAlpha(0);
        obj.setVisible(false, false);
    } catch (_e) {}
}

function hideOwnServerDroneProp() {
    if (ownServerDroneObjId != null) {
        mp.objects.forEach((obj) => {
            try {
                if (!droneObjIdMatches(obj, ownServerDroneObjId)) return;
                hideServerDroneObj(obj);
            } catch (_e) {}
        });
    }
    const myStatic = getMyStaticKey();
    if (myStatic == null) return;
    mp.objects.forEach((obj) => {
        try {
            if (!isOwnServerDroneObj(obj)) return;
            hideServerDroneObj(obj);
        } catch (_e) {}
    });
}

function groundZAt(x, y, zGuess) {
    let gz = zGuess;
    try {
        const hint = mp.game.gameplay.getGroundZFor3dCoord(x, y, zGuess + 2.0, 0, false);
        if (Number.isFinite(hint) && hint > 0) gz = hint;
    } catch (_e) {}
    try {
        const hit = mp.raycasting.testPointToPoint(
            new mp.Vector3(x, y, zGuess + 1.5),
            new mp.Vector3(x, y, zGuess - 40.0),
            mp.players.local,
            17
        );
        if (hit && hit.position && Number.isFinite(hit.position.z)) gz = hit.position.z;
    } catch (_e2) {}
    return gz;
}

function destroyDroneCamera() {
    if (!camObject) return;
    try {
        camObject.detach();
        camObject.destroy();
    } catch (_e) {}
    camObject = null;
    try {
        mp.game.cam.renderScriptCams(false, true, 400, false, false);
    } catch (_e2) {}
}

function deactivateDrone() {
    if (!isDroneActive && !droneObject && !camObject) return;
    isDroneActive = false;
    isDroneActivating = false;
    ownServerDroneObjId = null;
    syncPosTick = 0;
    wallBeepCooldown = 0;

    let exitX = 0;
    let exitY = 0;
    let exitZ = 0;
    if (droneObject && mp.objects.exists(droneObject)) {
        const dp = droneObject.position;
        exitX = dp.x;
        exitY = dp.y;
        exitZ = groundZAt(dp.x, dp.y, dp.z) + 1.0;
    }

    try {
        mp.game.audio.playSound(-1, 'QUIT', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true, 0, true);
    } catch (_e) {}

    const lp = mp.players.local;
    destroyDroneCamera();

    if (droneObject) {
        try {
            droneObject.destroy();
        } catch (_e2) {}
        droneObject = null;
    }

    try {
        if (exitX || exitY || exitZ) {
            lp.setCoordsNoOffset(exitX, exitY, exitZ, false, false, false);
        }
        lp.freezePosition(false);
        setPlayerDroneCollision(lp, true);
        showPlayerPed(lp);
        mp.game.graphics.setSeethrough(false);
        mp.game.graphics.setNightvision(false);
    } catch (_e3) {}

    HasNightVision = false;
    HashermalVision = false;

    try {
        mp.events.callRemote('drone:setActive', false, exitX, exitY, exitZ);
    } catch (_e4) {}
}

function loadDroneModelHash() {
    return new Promise((resolve) => {
        try {
            const hash = mp.game.joaat(DroneModel) >>> 0;
            mp.game.streaming.requestModel(hash);
            let tries = 0;
            const id = setInterval(() => {
                if (mp.game.streaming.hasModelLoaded(hash) || ++tries > 200) {
                    clearInterval(id);
                    resolve(mp.game.streaming.hasModelLoaded(hash) ? hash : 0);
                }
            }, 25);
        } catch (_e) {
            resolve(0);
        }
    });
}

function attachDroneCamera() {
    if (!droneObject || !mp.objects.exists(droneObject)) return;
    destroyDroneCamera();
    const p = droneObject.position;
    let rotZ = 0;
    try {
        const h = mp.players.local.getHeading ? mp.players.local.getHeading() : 0;
        if (Number.isFinite(h)) rotZ = h;
    } catch (_e) {}
    camObject = mp.cameras.new('DroneCamera', new mp.Vector3(p.x, p.y, p.z), new mp.Vector3(-12, 0, rotZ), 50);
    camObject.attachTo(droneObject.handle, OffsetX, OffsetY, OffsetZ, false);
    camObject.setActive(true);
    mp.game.cam.renderScriptCams(true, true, 400, true, false);
}

function notifyDrone(msg, isError) {
    try {
        if (typeof mp.events.call === 'function') {
            mp.events.call('notify:client', isError ? 2 : 3, 'top-mid', String(msg || ''), 3500);
            return;
        }
    } catch (_e) {}
    try {
        mp.gui.chat.push((isError ? '!{#ff5555}' : '!{#7fdfff}') + String(msg || ''));
    } catch (_e2) {}
}

async function activateDrone() {
    if (isDroneActive || isDroneActivating) return;
    if (droneBlocked()) {
        notifyDrone('Дрон нельзя использовать в транспорте или на арене.', true);
        return;
    }
    isDroneActivating = true;
    const hash = await loadDroneModelHash();
    if (!hash) {
        isDroneActivating = false;
        notifyDrone('Не удалось загрузить модель дрона.', true);
        return;
    }
    if (droneBlocked()) {
        isDroneActivating = false;
        return;
    }

    const lp = mp.players.local;
    const pos = lp.position;
    const spawnZ = pos.z + 4.5;
    const spawnHeading = lp.getHeading ? lp.getHeading() : 0;

    try {
        lp.freezePosition(true);
        hidePlayerPed(lp);
        setPlayerDroneCollision(lp, false);
        mp.game.audio.playSound(-1, 'Hack_Success', 'DLC_HEIST_BIOLAB_PREP_HACKING_SOUNDS', true, 0, true);
        droneObject = mp.objects.new(hash, new mp.Vector3(pos.x, pos.y, spawnZ));
        try {
            droneObject.setAlpha(255);
        } catch (_eAlpha) {}
        setTimeout(() => setDroneObjectCollision(false), 100);
        syncPlayerToDronePos(lp);
        attachDroneCamera();
        isDroneActive = true;
        syncPosTick = 0;
        mp.events.callRemote('drone:setActive', true, pos.x, pos.y, spawnZ, spawnHeading);
    } catch (_e3) {
        deactivateDrone();
    }
    isDroneActivating = false;
}

function requestActivateDrone() {
    if (isDroneActive || isDroneActivating) return;
    if (droneBlocked()) {
        notifyDrone('Дрон нельзя использовать в транспорте или на арене.', true);
        return;
    }
    try {
        mp.events.callRemote('drone:requestStart');
    } catch (_e) {
        notifyDrone('Не удалось запросить запуск дрона.', true);
    }
}

function toggleDrone() {
    if (isDroneActive) deactivateDrone();
    else requestActivateDrone();
}

function flatHoriz(dir) {
    const len = Math.hypot(dir.x, dir.y);
    if (len < 0.001) return null;
    return { x: dir.x / len, y: dir.y / len };
}

function wallHit(from, dir, distance) {
    const end = new mp.Vector3(
        from.x + dir.x * distance,
        from.y + dir.y * distance,
        from.z + dir.z * distance
    );
    return mp.raycasting.testPointToPoint(from, end, mp.players.local, WALL_RAYCAST_FLAGS);
}

function horizontalMoveBlocked(from, dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) return false;
    const dir = { x: dx / len, y: dy / len, z: 0 };
    return !!wallHit(from, dir, Math.max(1.2, len + 0.8));
}

function verticalMoveBlocked(from, dz) {
    if (Math.abs(dz) < 0.0001) return false;
    const dir = { x: 0, y: 0, z: dz > 0 ? 1 : -1 };
    return !!wallHit(from, dir, Math.abs(dz) + 0.6);
}

function warnWallNear() {
    if (wallBeepCooldown > 0) return;
    wallBeepCooldown = 45;
    try {
        mp.game.audio.playSound(-1, 'Beep_Red', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true, 0, true);
    } catch (_e) {}
}

function updateDroneCameraLook() {
    if (!camObject || droneUiBlocked()) return;
    try {
        mp.game.controls.disableControlAction(0, 1, true);
        mp.game.controls.disableControlAction(0, 2, true);
        const rotation = camObject.getRot(2);
        const xMagnitude = mp.game.controls.getDisabledControlNormal(0, 1);
        const yMagnitude = mp.game.controls.getDisabledControlNormal(0, 2);
        if (xMagnitude !== 0) rotation.z += -xMagnitude * camMouseSens;
        if (yMagnitude !== 0) {
            rotation.x += -yMagnitude * camMouseSens;
            if (rotation.x <= -89.0) rotation.x = -89.0;
            else if (rotation.x >= 89.0) rotation.x = 89.0;
        }
        if (keyDown(VK_Q)) rotation.z += camKeyRotSpeed;
        if (keyDown(VK_E)) rotation.z -= camKeyRotSpeed;
        camObject.setRot(rotation.x, rotation.y, rotation.z, 2);
        if (droneObject && mp.objects.exists(droneObject)) {
            droneObject.setRotation(0, 0, rotation.z, 2, true);
        }
    } catch (_e) {}
}

function processDroneFlight() {
    if (!isDroneActive || !droneObject || !mp.objects.exists(droneObject) || !camObject) return;
    if (droneUiBlocked()) return;

    const lp = mp.players.local;
    const direction = camObject.getDirection();
    const flat = flatHoriz(direction);
    let cur = droneObject.position;
    let moved = false;

    const tryMove = (dx, dy, dz) => {
        const isHoriz = Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001;
        if (isHoriz && droneObject.getHeightAboveGround() <= 0.35) return;

        if (isHoriz && horizontalMoveBlocked(cur, dx, dy)) {
            if (camObject) camObject.shake('SMALL_EXPLOSION_SHAKE', 0.06);
            return;
        }
        if (Math.abs(dz) > 0.0001 && verticalMoveBlocked(cur, dz)) {
            if (camObject) camObject.shake('SMALL_EXPLOSION_SHAKE', 0.06);
            return;
        }

        if (flat && isHoriz) {
            const near = wallHit(cur, { x: flat.x, y: flat.y, z: 0 }, 3.5);
            if (near) warnWallNear();
        }

        cur = new mp.Vector3(cur.x + dx, cur.y + dy, cur.z + dz);
        moved = true;
    };

    if (keyDown(VK_W) && flat) tryMove(flat.x * droneSpeed, flat.y * droneSpeed, 0);
    if (keyDown(VK_S) && flat) tryMove(-flat.x * droneSpeed, -flat.y * droneSpeed, 0);
    if (keyDown(VK_A) && flat) tryMove(-flat.y * droneSpeed, flat.x * droneSpeed, 0);
    if (keyDown(VK_D) && flat) tryMove(flat.y * droneSpeed, -flat.x * droneSpeed, 0);
    if (keyDown(VK_SPACE)) tryMove(0, 0, droneSpeed);
    if (keyDown(VK_CTRL)) {
        if (droneObject.getHeightAboveGround() > 0.5) tryMove(0, 0, -droneSpeed);
    }

    if (moved) {
        droneObject.position = cur;
        camObject.setCoord(cur.x, cur.y, cur.z);
        syncPlayerToDronePos(lp);
        syncPosTick += 1;
        if (syncPosTick % 8 === 0) {
            try {
                mp.events.callRemote('drone:syncPos', cur.x, cur.y, cur.z, getDroneYaw());
            } catch (_e) {}
        }
    }
}

function disableDroneControls() {
    try {
        for (let g = 0; g <= 2; g++) {
            for (let i = 0; i < DRONE_BLOCKED_CONTROLS.length; i++) {
                mp.game.controls.disableControlAction(g, DRONE_BLOCKED_CONTROLS[i], true);
            }
        }
    } catch (_e) {}
}

global.bindGameplayKey(ToggleNightVisionKey, false, () => {
    if (!isDroneActive || droneUiBlocked()) return;
    if (HashermalVision) return;
    HasNightVision = !HasNightVision;
    mp.game.graphics.setNightvision(HasNightVision);
});

global.bindGameplayKey(ToggleThermalVisionKey, false, () => {
    if (!isDroneActive || droneUiBlocked()) return;
    if (HasNightVision) return;
    HashermalVision = !HashermalVision;
    mp.game.graphics.setSeethrough(HashermalVision);
});

global.bindGameplayKey(VK_BACK, false, () => {
    if (!isDroneActive || droneUiBlocked()) return;
    deactivateDrone();
});

mp.events.add('drone:toggle:c', () => {
    toggleDrone();
});

mp.events.add('drone:startOk', () => {
    activateDrone();
});

mp.events.add('drone:startDenied', () => {
    isDroneActivating = false;
});

mp.events.add('drone:forceStop', () => {
    deactivateDrone();
});

mp.events.add('drone:worldObjSpawned', (objId) => {
    const id = Number(objId);
    if (!Number.isFinite(id)) return;
    ownServerDroneObjId = id;
    hideOwnServerDroneProp();
});

mp.events.add('drone:worldObjDestroyed', () => {
    ownServerDroneObjId = null;
});

mp.events.add('entityStreamIn', (entity) => {
    if (!isDroneActive) return;
    if (!entity || entity.type !== 'object') return;
    if (isOwnServerDroneObj(entity)) hideServerDroneObj(entity);
});

mp.events.addDataHandler('droneOwnerStatic', (entity, _value) => {
    if (!isDroneActive) return;
    if (!entity || entity.type !== 'object') return;
    if (isOwnServerDroneObj(entity)) hideServerDroneObj(entity);
});

mp.events.add('playerDeath', () => {
    deactivateDrone();
});

mp.events.add('render', () => {
    if (!isDroneActive) return;
    if (wallBeepCooldown > 0) wallBeepCooldown -= 1;
    disableDroneControls();
    hidePlayerPed(mp.players.local);
    hideOwnServerDroneProp();
    syncPlayerToDronePos(mp.players.local);
    if (droneObject && camObject && !droneUiBlocked()) {
        if (HashermalVision) mp.game.graphics.setSeethrough(true);
        else mp.game.graphics.setSeethrough(false);
        if (HasNightVision) mp.game.graphics.setNightvision(true);
        else mp.game.graphics.setNightvision(false);
    }
    updateDroneCameraLook();
    processDroneFlight();
});
