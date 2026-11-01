let captArenaBlip = null;
/** Native blip-handle для заливки области (addBlipForRadius). */
let captArenaRadiusBlipHandle = null;

/** GTA V: цвет 1 = красный (как у marker-блипа выше); alpha 0..255. */
const CAPT_AREA_COLOR = 1;
const CAPT_AREA_FILL_ALPHA = 80;

const STORAGE_BLIP_KEY = 'captArenaBlipHandle';

/**
 * При перезагрузке клиентского скрипта (рестарт сервера) переменная captArenaRadiusBlipHandle
 * сбрасывается в null, но нативный GTA-V блип в движке остаётся.
 * mp.storage.data переживает перезагрузку скрипта — восстанавливаем handle и удаляем блип.
 */
function tryRemoveStoredBlip() {
    try {
        if (!mp.storage || !mp.storage.data) return;
        const h = Number(mp.storage.data[STORAGE_BLIP_KEY]) || 0;
        if (h !== 0) {
            try { mp.game.ui.removeBlip(h); } catch (_) {}
        }
        mp.storage.data[STORAGE_BLIP_KEY] = 0;
    } catch (_) {}
}

function destroyCaptBlip() {
    if (captArenaBlip) {
        try {
            if (typeof captArenaBlip.destroy === 'function') {
                captArenaBlip.destroy();
            }
        } catch (e) {}
        captArenaBlip = null;
    }
    if (captArenaRadiusBlipHandle != null) {
        try {
            mp.game.ui.removeBlip(captArenaRadiusBlipHandle);
        } catch (_e) {}
        captArenaRadiusBlipHandle = null;
    }
    // Также удаляем блип, переживший перезагрузку скрипта
    tryRemoveStoredBlip();
}

function createCaptRadiusBlip(cx, cy, cz, radius, dimension) {
    destroyCaptBlip();
    const dim = typeof dimension === 'number' ? dimension : mp.players.local.dimension;
    // Только заливочный круг — native addBlipForRadius, без обводки
    try {
        const handle = mp.game.ui.addBlipForRadius(cx, cy, cz, radius);
        if (handle && handle !== 0) {
            try { mp.game.ui.setBlipColour(handle, CAPT_AREA_COLOR); } catch (_e1) {}
            try { mp.game.ui.setBlipAlpha(handle, CAPT_AREA_FILL_ALPHA); } catch (_e2) {}
            /* 2 = миникарта + большая карта (пауза). shortRange=false — видно издалека. */
            try { mp.game.ui.setBlipDisplay(handle, 2); } catch (_eDisp) {}
            try { mp.game.ui.setBlipAsShortRange(handle, false); } catch (_eSR) {}
            captArenaRadiusBlipHandle = handle;
            // Сохраняем handle на случай следующей перезагрузки скрипта
            try {
                if (mp.storage && mp.storage.data) mp.storage.data[STORAGE_BLIP_KEY] = handle;
            } catch (_) {}
        }
    } catch (e) {
        captArenaRadiusBlipHandle = null;
    }
}

// При загрузке скрипта — удаляем осиротевший блип от предыдущего запуска (если есть)
tryRemoveStoredBlip();

global.isCaptOrBizwarInArena = function () {
    const pl = mp.players.local;
    if (!pl) return false;
    const d = pl.dimension;
    if (pl.getVariable('inCapt') === true && d >= 2000 && d <= 2050) return true;
    if (pl.getVariable('inBizwar') === true && d >= 3000 && d <= 3128) return true;
    return false;
};

global.isCaptOrBizwarPrepFrozen = function () {
    if (!global.isCaptOrBizwarInArena()) return false;
    const pl = mp.players.local;
    return pl.getVariable('captFrozen') === true || pl.getVariable('bizwarFrozen') === true;
};

let captPrepAnchor = null;
let captSpawnFallMinUntil = 0;
let captSpawnFallMaxUntil = 0;

global.clearCaptPrepFreezeAnchor = function () {
    captPrepAnchor = null;
};

mp.events.add('captBattle:joined', () => {
    captPrepAnchor = null;
    captSpawnFallMinUntil = Date.now() + 650;
    captSpawnFallMaxUntil = Date.now() + 3000;
    try {
        const p = mp.players.local.position;
        mp.game.streaming.requestCollisionAtCoord(p.x, p.y, p.z);
    } catch (_eCollision) {}
    try { mp.players.local.freezePosition(false); } catch (_e) {}
});

mp.events.add('captBattle:unfreeze', () => {
    captSpawnFallMinUntil = 0;
    captSpawnFallMaxUntil = 0;
    captPrepAnchor = null;
    try { mp.players.local.freezePosition(false); } catch (_e) {}
});

mp.events.add('captBattle:hide', () => {
    captSpawnFallMinUntil = 0;
    captSpawnFallMaxUntil = 0;
    captPrepAnchor = null;
    try { mp.players.local.freezePosition(false); } catch (_e) {}
});

function enforceCaptPrepFreeze() {
    const pl = mp.players.local;
    if (!pl) return;
    if (!captPrepAnchor) captPrepAnchor = pl.position;
    pl.freezePosition(true);
    const p = pl.position;
    const a = captPrepAnchor;
    if (Math.abs(p.x - a.x) > 0.05 || Math.abs(p.y - a.y) > 0.05 || Math.abs(p.z - a.z) > 0.2) {
        try {
            pl.position = a;
            if (typeof pl.setCoordsNoOffset === 'function') {
                pl.setCoordsNoOffset(a.x, a.y, a.z, false, false, false);
            }
        } catch (_e) {}
    }
    for (let g = 0; g <= 2; g++) {
        mp.game.controls.disableControlAction(g, 199, true);
        mp.game.controls.disableControlAction(g, 200, true);
    }
}

mp.events.add('captArena:set', (json) => {
    let data;
    try {
        data = typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
        destroyCaptBlip();
        return;
    }
    if (!data || typeof data.r !== 'number' || typeof data.cx !== 'number' || typeof data.cy !== 'number') {
        destroyCaptBlip();
        return;
    }
    const cz = typeof data.cz === 'number' ? data.cz : mp.players.local.position.z;
    const dim = typeof data.dimension === 'number' ? data.dimension : mp.players.local.dimension;
    createCaptRadiusBlip(data.cx, data.cy, cz, data.r, dim);
});

mp.events.add('captArena:clear', () => {
    destroyCaptBlip();
});

mp.events.add('render', () => {
    const dim = mp.players.local.dimension;
    const inCaptDim = dim >= 2000 && dim <= 2050;
    const inBizwarDim = dim >= 3000 && dim <= 3128;
    const pl = mp.players.local;
    const frozen = pl.getVariable('captFrozen') === true
        || pl.getVariable('bizwarFrozen') === true;

    if ((inCaptDim || inBizwarDim) && frozen) {
        if (captSpawnFallMaxUntil > 0) {
            const now = Date.now();
            let inAir = true;
            try { inAir = mp.players.local.isInAir(); } catch (_eAir) {}
            if (now < captSpawnFallMinUntil || (inAir && now < captSpawnFallMaxUntil)) {
                try {
                    const p = mp.players.local.position;
                    mp.game.streaming.requestCollisionAtCoord(p.x, p.y, p.z);
                } catch (_eCollision) {}
                try { mp.players.local.freezePosition(false); } catch (_eFall) {}
                return;
            }
            captSpawnFallMinUntil = 0;
            captSpawnFallMaxUntil = 0;
            captPrepAnchor = null;
        }
        if (typeof global !== 'undefined' && global.flyStatus === true) return;
        enforceCaptPrepFreeze();
        const block = [21, 22, 23, 24, 25, 26, 30, 31, 32, 33, 34, 35, 36, 37, 44, 45, 140, 141, 257, 263, 264, 73];
        for (let i = 0; i < block.length; i++) {
            mp.game.controls.disableControlAction(0, block[i], true);
        }
    }

    if (typeof global.isCaptOrBizwarInArena === 'function' && global.isCaptOrBizwarInArena()) {
        mp.game.controls.disableControlAction(0, 36, true);
        mp.game.controls.disableControlAction(0, 73, true);
    }
});
