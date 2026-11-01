/**
 * Спанк / свист / алко / термокружка — клиент + синхрон по переменным.
 * Asti / медовуха: beer-анима + p_cs_bottle_01.
 * Термокружка: shr_thermos + coffee-анима.
 */

const FLAGS_UPPER_BODY = 49;

const SPANK_MS = 2450;
const WHISTLE_MS = 2260;
const ALCO_MS = 5250;
const THERMO_MS = 5500;
const BONG_MS = 2000;

const SPANK_DICT = 'mp_suicide';
const SPANK_NAME = 'pill_fp';
const BONG_DICT = 'gta5rp@alterned';
const BONG_NAME = 'smoking';
const WHISTLE_DICT = 'rcmnigel1c';
const WHISTLE_NAME = 'hailing_whistle_waive_a';

const ALCO_DICT = 'amb@world_human_drinking@beer@male@idle_a';
const ALCO_NAME = 'idle_b';
const ALCO_PROP_MODEL = 'p_cs_bottle_01';
const ALCO_PROP_HASH = mp.game.joaat(ALCO_PROP_MODEL);
const ALCO_PROP_OFFSET = { x: 0.11, y: -0.02, z: -0.04 };
const ALCO_PROP_ROT = { x: -82, y: 8, z: 4 };

const CIGARETTE_PROP_HASH = 175300549;
const CIGARETTE_PROP_OFFSET = { x: 0.11, y: 0.0, z: -0.02 };
const CIGARETTE_PROP_ROT = { x: -85, y: 5, z: 5 };

// GTA5RP_props3 / prop.txt + anim.txt
const THERMO_DICT = 'amb@world_human_drinking@coffee@female@idle_a';
const THERMO_NAME = 'idle_a';
const THERMO_HAND_BONE = 28422; // PH_R_Hand
const THERMO_PROP_MODEL = 'shr_thermos';
const THERMO_PROP_HASH = mp.game.joaat(THERMO_PROP_MODEL);
const THERMO_PROP_SCALE = 1.0;

const THERMO_ATTACH = {
    bone: THERMO_HAND_BONE,
    offset: { x: -0.01, y: 0.042, z: -0.1 },
    rot: { x: 15, y: 0, z: 0 },
};
let THERMO_PROP_SCALE_LIVE = THERMO_PROP_SCALE;

let thermoPropModelName = THERMO_PROP_MODEL;
let thermoPropHash = THERMO_PROP_HASH;

function getThermoUseProfile() {
    return {
        dict: THERMO_DICT,
        name: THERMO_NAME,
        attach: THERMO_ATTACH,
    };
}

function getThermoAttach() {
    return THERMO_ATTACH;
}

const SYNC_CONFIG = [
    { varName: 'ANIM_SPANK', dict: SPANK_DICT, name: SPANK_NAME, dur: SPANK_MS, speedIn: 8.0, speedOut: 1.0 },
    { varName: 'ANIM_WHISTLE', dict: WHISTLE_DICT, name: WHISTLE_NAME, dur: WHISTLE_MS, speedIn: 8.0, speedOut: -8.0 },
    { varName: 'ANIM_ALCOHOL', dict: ALCO_DICT, name: ALCO_NAME, dur: ALCO_MS, speedIn: 8.0, speedOut: 1.0, prop: 'alco' },
    { varName: 'ANIM_THERMOS', dict: THERMO_DICT, name: THERMO_NAME, dur: THERMO_MS, speedIn: 8.0, speedOut: -8.0, prop: 'thermo' },
    { varName: 'ANIM_BONG', dict: BONG_DICT, name: BONG_NAME, dur: BONG_MS, speedIn: 8.0, speedOut: 1.0 },
    { varName: 'ANIM_CIGARETTE', dict: BONG_DICT, name: BONG_NAME, dur: BONG_MS, speedIn: 8.0, speedOut: 1.0, prop: 'cigarette' },
];

let itemUseAnimInProgress = false;

function finishConsumableUseAnim(player, dict, name) {
    if (!player || !mp.players.exists(player)) return;
    if (player.vehicle) {
        try {
            if (dict && name && typeof player.stopAnimTask === 'function') {
                player.stopAnimTask(dict, name, 3.0);
            }
        } catch (_e) {}
    } else {
        try { player.clearTasks(); } catch (_e2) {}
    }
}

function beginConsumableUseAnim() {
    if (itemUseAnimInProgress) return false;
    itemUseAnimInProgress = true;
    return true;
}

const handPropByRemoteId = new Map();

function requestAnimDict(dict) {
    return new Promise((resolve) => {
        if (mp.game.streaming.hasAnimDictLoaded(dict)) {
            resolve(true);
            return;
        }
        mp.game.streaming.requestAnimDict(dict);
        let n = 0;
        const id = setInterval(() => {
            if (mp.game.streaming.hasAnimDictLoaded(dict) || ++n > 400) {
                clearInterval(id);
                resolve(mp.game.streaming.hasAnimDictLoaded(dict));
            }
        }, 25);
    });
}

function loadModel(hash, forceRequest) {
    return new Promise((resolve) => {
        if (!hash) {
            resolve(false);
            return;
        }
        try {
            if (!forceRequest && mp.game.streaming.isModelInCdimage && !mp.game.streaming.isModelInCdimage(hash)) {
                resolve(false);
                return;
            }
        } catch (_e) {}
        mp.game.streaming.requestModel(hash);
        let n = 0;
        const id = setInterval(() => {
            if (mp.game.streaming.hasModelLoaded(hash) || ++n > 400) {
                clearInterval(id);
                resolve(mp.game.streaming.hasModelLoaded(hash));
            }
        }, 25);
    });
}

function isThermoPropModelHash(hash) {
    if (!hash) return false;
    return hash === THERMO_PROP_HASH || (!!thermoPropHash && hash === thermoPropHash);
}

function resolveThermoPropHash(forceRescan) {
    if (forceRescan) {
        thermoPropHash = 0;
        thermoPropModelName = '';
    }
    if (!forceRescan && thermoPropHash && thermoPropModelName) {
        return Promise.resolve(thermoPropHash);
    }
    return loadModel(THERMO_PROP_HASH, true).then((ok) => {
        if (!ok) {
            thermoPropHash = 0;
            thermoPropModelName = '';
            return 0;
        }
        thermoPropModelName = THERMO_PROP_MODEL;
        thermoPropHash = THERMO_PROP_HASH;
        return THERMO_PROP_HASH;
    });
}

function scaleThermosProp(obj, scale) {
    if (!obj || !obj.handle || !scale || scale === 1) return;
    try {
        const right = new mp.Vector3(0, 0, 0);
        const forward = new mp.Vector3(0, 0, 0);
        const up = new mp.Vector3(0, 0, 0);
        const pos = new mp.Vector3(0, 0, 0);
        obj.getMatrix(right, forward, up, pos);
        forward.x *= scale; forward.y *= scale; forward.z *= scale;
        right.x *= scale; right.y *= scale; right.z *= scale;
        up.x *= scale; up.y *= scale; up.z *= scale;
        mp.game.invoke(
            '0x694E00132F2823ED',
            obj.handle,
            forward.x, forward.y, forward.z,
            right.x, right.y, right.z,
            up.x, up.y, up.z,
            pos.x, pos.y, pos.z
        );
    } catch (_e) {}
}

function getHandBoneIndex(ped, boneId) {
    const id = boneId == null ? 57005 : Number(boneId);
    if (id === 28422) {
        try {
            if (typeof ped.getBoneIndexByName === 'function') {
                const ph = ped.getBoneIndexByName('PH_R_Hand');
                if (ph != null && ph >= 0) return ph;
            }
        } catch (_e) {}
    }
    if (id === 57005) {
        try {
            if (typeof ped.getBoneIndexByName === 'function') {
                const i = ped.getBoneIndexByName('SKEL_R_Hand');
                if (i != null && i >= 0) return i;
            }
        } catch (_e) {}
    }
    try {
        if (ped && ped.handle && mp.game.ped && typeof mp.game.ped.getBoneIndex === 'function') {
            const nativeBone = mp.game.ped.getBoneIndex(ped.handle, id);
            if (nativeBone != null && nativeBone >= 0) return nativeBone;
        }
    } catch (_e) {}
    try {
        const j = ped.getBoneIndex(id);
        if (j != null && j >= 0) return j;
    } catch (_e2) {}
    return id;
}

function pedStillValid(ped) {
    if (!ped) return false;
    try {
        if (ped.type === 'player' && !mp.players.exists(ped)) return false;
        return !!ped.handle;
    } catch (_e) {
        return false;
    }
}

function clearHandProp(remoteId) {
    const rid = Number(remoteId);
    const entry = handPropByRemoteId.get(rid);
    if (!entry) return;
    if (entry.attachIntervalId) {
        try { clearInterval(entry.attachIntervalId); } catch (_e) {}
    }
    if (entry.timerId) {
        try { clearTimeout(entry.timerId); } catch (_e) {}
    }
    try {
        const o = entry.obj;
        if (o && typeof mp.objects.exists === 'function' && mp.objects.exists(o)) o.destroy();
        else if (o && o.destroy) o.destroy();
    } catch (_e) {}
    handPropByRemoteId.delete(rid);
}

function attachPropToPedHand(obj, ped, offset, rot, boneId, useSoftPin, applyThermoScale) {
    if (!obj || !pedStillValid(ped)) return;
    const bone = getHandBoneIndex(ped, boneId == null ? 57005 : boneId);
    try {
        obj.__attMgrData = {
            targetEntity: ped.handle,
            bone,
            offset: new mp.Vector3(offset.x, offset.y, offset.z),
            rotation: new mp.Vector3(rot.x, rot.y, rot.z),
        };
    } catch (_e) {}
    try {
        obj.attachTo(
            ped.handle,
            bone,
            offset.x,
            offset.y,
            offset.z,
            rot.x,
            rot.y,
            rot.z,
            false,
            !!useSoftPin,
            false,
            false,
            2,
            true
        );
        if (applyThermoScale) scaleThermosProp(obj, THERMO_PROP_SCALE_LIVE);
    } catch (_e) {}
}

function spawnHandPropAttached(ped, durationMs, modelHash, offset, rot, boneId, attachDelays) {
    if (!pedStillValid(ped)) return;
    const rid = ped.remoteId;
    clearHandProp(rid);

    const isThermoProp = isThermoPropModelHash(modelHash);
    loadModel(modelHash, isThermoProp).then((modelOk) => {
        if (!modelOk || !pedStillValid(ped)) {
            if (ped === mp.players.local && isThermoProp) {
                mp.events.call('notify:client', 2, 'top-mid', 'Модель термокружки не загрузилась.', 3000);
            }
            return;
        }

        let obj = null;
        try {
            const pos = ped.position;
            const dim = typeof ped.dimension === 'number' ? ped.dimension : 0;
            obj = mp.objects.new(
                modelHash,
                new mp.Vector3(pos.x, pos.y, pos.z + 0.2),
                { dimension: dim }
            );
        } catch (_e) {
            return;
        }
        if (!obj) return;

        try {
            obj.notifyStreaming = true;
        } catch (_e) {}

        const attachOnce = () => attachPropToPedHand(obj, ped, offset, rot, boneId, false, isThermoProp);
        const delays = isThermoProp
            ? [0, 80, 250]
            : (Array.isArray(attachDelays) && attachDelays.length ? attachDelays : [0, 80, 250, 600, 1200]);
        delays.forEach((ms) => setTimeout(attachOnce, ms));

        const timerId = setTimeout(() => clearHandProp(rid), durationMs);
        handPropByRemoteId.set(rid, { obj, timerId, attachIntervalId: null });
    });
}

function playLocalAnim(dict, name, durationMs, speedIn, speedOut) {
    const si = speedIn !== undefined ? speedIn : 8.0;
    const so = speedOut !== undefined ? speedOut : -8.0;
    requestAnimDict(dict).then((ok) => {
        if (!ok) return;
        mp.players.local.taskPlayAnim(dict, name, si, so, durationMs, FLAGS_UPPER_BODY, 0, false, false, false);
    });
}

function playAlcoUseAnim(propHash, propOffset, propRot, dict, name, durationMs, boneId, propDelayMs) {
    const player = mp.players.local;
    if (!player || !beginConsumableUseAnim()) return;

    requestAnimDict(dict).then((ok) => {
        if (!ok) {
            itemUseAnimInProgress = false;
            return;
        }
        player.taskPlayAnim(dict, name, 8.0, 1.0, durationMs, FLAGS_UPPER_BODY, 0, false, false, false);
        const spawnProp = () => {
            spawnHandPropAttached(
                player,
                durationMs,
                propHash,
                propOffset,
                propRot,
                boneId,
                [0, 100, 300, 700, 1400]
            );
        };
        const delay = Number(propDelayMs) || 0;
        if (delay > 0) setTimeout(spawnProp, delay);
        else spawnProp();
        setTimeout(() => {
            finishConsumableUseAnim(player, dict, name);
            itemUseAnimInProgress = false;
        }, durationMs);
    });
}

mp.events.add('playSpankConsumableAnim', () => {
    const player = mp.players.local;
    if (!player || !beginConsumableUseAnim()) return;
    requestAnimDict(SPANK_DICT).then((ok) => {
        if (!ok) {
            itemUseAnimInProgress = false;
            return;
        }
        player.taskPlayAnim(SPANK_DICT, SPANK_NAME, 8.0, 1.0, SPANK_MS, FLAGS_UPPER_BODY, 0, false, false, false);
        setTimeout(() => {
            finishConsumableUseAnim(player, SPANK_DICT, SPANK_NAME);
            itemUseAnimInProgress = false;
        }, SPANK_MS);
    });
});

mp.events.add('cancelSpankConsumableAnim', () => {
    itemUseAnimInProgress = false;
    const player = mp.players.local;
    if (!player) return;
    finishConsumableUseAnim(player, SPANK_DICT, SPANK_NAME);
});

mp.events.add('playWhistleLocalAnim', (variant) => {
    if (variant === 'new') {
        if (typeof global.playGta5rpWhistleLocal === 'function') {
            global.playGta5rpWhistleLocal();
        }
        return;
    }
    playLocalAnim(WHISTLE_DICT, WHISTLE_NAME, WHISTLE_MS, 8.0, -8.0);
    setTimeout(() => {
        if (mp.players.local) finishConsumableUseAnim(mp.players.local, WHISTLE_DICT, WHISTLE_NAME);
    }, WHISTLE_MS);
});

mp.events.add('playBongConsumableAnim', () => {
    const player = mp.players.local;
    if (!player || !beginConsumableUseAnim()) return;
    requestAnimDict(BONG_DICT).then((ok) => {
        if (!ok) {
            itemUseAnimInProgress = false;
            return;
        }
        player.taskPlayAnim(BONG_DICT, BONG_NAME, 8.0, 1.0, BONG_MS, FLAGS_UPPER_BODY, 0, false, false, false);
        setTimeout(() => {
            finishConsumableUseAnim(player, BONG_DICT, BONG_NAME);
            itemUseAnimInProgress = false;
        }, BONG_MS);
    });
});

mp.events.add('playCigaretteConsumableAnim', () => {
    const player = mp.players.local;
    if (!player || !beginConsumableUseAnim()) return;
    requestAnimDict(BONG_DICT).then((ok) => {
        if (!ok) {
            itemUseAnimInProgress = false;
            return;
        }
        player.taskPlayAnim(BONG_DICT, BONG_NAME, 8.0, 1.0, BONG_MS, FLAGS_UPPER_BODY, 0, false, false, false);
        const rid = player.remoteId;
        clearHandProp(rid);
        loadModel(CIGARETTE_PROP_HASH, true).then((loaded) => {
            if (!loaded || !pedStillValid(player)) return;
            try {
                const pos = player.position;
                const obj = mp.objects.new(CIGARETTE_PROP_HASH, new mp.Vector3(pos.x, pos.y, pos.z + 0.2), { dimension: player.dimension || 0 });
                if (!obj) return;
                try { obj.notifyStreaming = true; } catch (_e) {}
                const attach = () => {
                    const bone = player.getBoneIndex(57005);
                    if (bone != null && bone >= 0) {
                        obj.attachTo(player.handle, bone, CIGARETTE_PROP_OFFSET.x, CIGARETTE_PROP_OFFSET.y, CIGARETTE_PROP_OFFSET.z, CIGARETTE_PROP_ROT.x, CIGARETTE_PROP_ROT.y, CIGARETTE_PROP_ROT.z, false, false, false, false, 2, true);
                    }
                };
                [0, 80, 250, 600, 1200].forEach((ms) => setTimeout(attach, ms));
                const timerId = setTimeout(() => {
                    clearHandProp(rid);
                }, BONG_MS);
                handPropByRemoteId.set(rid, { obj, timerId, attachIntervalId: null });
            } catch (_e) {}
        });
        setTimeout(() => {
            finishConsumableUseAnim(player, BONG_DICT, BONG_NAME);
            itemUseAnimInProgress = false;
        }, BONG_MS);
    });
});

mp.events.add('playAlcoConsumableAnim', () => {
    playAlcoUseAnim(ALCO_PROP_HASH, ALCO_PROP_OFFSET, ALCO_PROP_ROT, ALCO_DICT, ALCO_NAME, ALCO_MS);
});

function playThermoCupAnim(hash, profile) {
    const player = mp.players.local;
    if (!player || !beginConsumableUseAnim()) return;

    const attach = profile.attach;
    requestAnimDict(profile.dict).then((ok) => {
        if (!ok) {
            itemUseAnimInProgress = false;
            return;
        }
        player.taskPlayAnim(
            profile.dict,
            profile.name,
            8.0,
            -8.0,
            THERMO_MS,
            FLAGS_UPPER_BODY,
            0,
            false,
            false,
            false
        );
        setTimeout(() => {
            spawnHandPropAttached(
                player,
                THERMO_MS,
                hash,
                attach.offset,
                attach.rot,
                attach.bone != null ? attach.bone : THERMO_HAND_BONE
            );
        }, 120);
        setTimeout(() => {
            finishConsumableUseAnim(player, profile.dict, profile.name);
            itemUseAnimInProgress = false;
        }, THERMO_MS);
    });
}

function startThermoCupConsumableAnim() {
    resolveThermoPropHash(true).then((hash) => {
        if (!hash) {
            itemUseAnimInProgress = false;
            mp.events.call('notify:client', 2, 'top-mid', 'Модель термокружки не найдена в игре.', 3000);
            mp.events.call('spankAlco:reject');
            return;
        }
        playThermoCupAnim(hash, getThermoUseProfile());
    });
}

mp.events.add('playThermoCupConsumableAnim', startThermoCupConsumableAnim);
mp.events.add('playThermosConsumableAnim', startThermoCupConsumableAnim);

const remoteAnimEdge = new Map();

function spawnPropForSyncCfg(ped, cfg) {
    if (cfg.prop === 'thermo') {
        resolveThermoPropHash(false).then((hash) => {
            if (!hash) return;
            const attach = getThermoAttach();
            const doSpawn = () => spawnHandPropAttached(
                ped,
                cfg.dur,
                hash,
                attach.offset,
                attach.rot,
                attach.bone != null ? attach.bone : THERMO_HAND_BONE,
                [0, 80, 250]
            );
            setTimeout(doSpawn, 80);
        });
    } else if (cfg.prop === 'alco') {
        spawnHandPropAttached(ped, cfg.dur, ALCO_PROP_HASH, ALCO_PROP_OFFSET, ALCO_PROP_ROT);
    } else if (cfg.prop === 'cigarette') {
        spawnHandPropAttached(ped, cfg.dur, CIGARETTE_PROP_HASH, CIGARETTE_PROP_OFFSET, CIGARETTE_PROP_ROT);
    }
}

function clearPropForSyncCfg(rid, cfg) {
    if (cfg.prop === 'thermo' || cfg.prop === 'alco' || cfg.prop === 'cigarette') {
        clearHandProp(rid);
    }
}

function syncRemoteConsumableAnims() {
    mp.players.forEach((p) => {
        if (!mp.players.exists(p) || p === mp.players.local) return;
        const rid = p.remoteId;
        for (let i = 0; i < SYNC_CONFIG.length; i++) {
            const cfg = SYNC_CONFIG[i];
            const key = rid + '_' + cfg.varName;
            const on = !!p.getVariable(cfg.varName);
            const was = !!remoteAnimEdge.get(key);
            if (on && !was) {
                remoteAnimEdge.set(key, true);
                let animDict = cfg.dict;
                let animName = cfg.name;
                if (cfg.prop === 'thermo') {
                    const profile = getThermoUseProfile();
                    animDict = profile.dict;
                    animName = profile.name;
                }
                requestAnimDict(animDict).then((ok) => {
                    if (!ok || !mp.players.exists(p) || !p.getVariable(cfg.varName)) return;
                    p.taskPlayAnim(animDict, animName, cfg.speedIn, cfg.speedOut, cfg.dur, FLAGS_UPPER_BODY, 0, false, false, false);
                    if (cfg.prop) spawnPropForSyncCfg(p, cfg);
                });
            } else if (!on && was) {
                remoteAnimEdge.set(key, false);
                clearPropForSyncCfg(rid, cfg);
            }
        }
    });
}

mp.events.add('render', syncRemoteConsumableAnims);

mp.events.add('playerReady', () => {
    resolveThermoPropHash(true);
    loadModel(ALCO_PROP_HASH, true);
    loadModel(CIGARETTE_PROP_HASH, true);
    requestAnimDict(THERMO_DICT);
    requestAnimDict(ALCO_DICT);
    requestAnimDict(BONG_DICT);
});

if (typeof global !== 'undefined') {
    global.getThermoCupPropModelName = () => thermoPropModelName || THERMO_PROP_MODEL;
    global.getThermosPropModelName = () => thermoPropModelName || THERMO_PROP_MODEL;
    global.isConsumableUseAnimBusy = () => itemUseAnimInProgress;
    global.getThermoAttachLive = () => ({
        offset: { ...THERMO_ATTACH.offset },
        rot: { ...THERMO_ATTACH.rot },
        scale: THERMO_PROP_SCALE_LIVE,
        bone: THERMO_ATTACH.bone,
    });
}

/** ─── /tprop — редактор посадки термокружки ─────────────────────────────── */
let thermoEditorOn = false;
let thermoEditorStep = 0.005;
let thermoEditorRotStep = 1;
let thermoEditorKeysBound = false;
let thermoEditorRefreshTimer = null;

function thermoEditorChat(msg) {
    try { mp.gui.chat.push(String(msg)); } catch (_e) {}
}

function thermoEditorPrint() {
    const o = THERMO_ATTACH.offset;
    const r = THERMO_ATTACH.rot;
    const line =
        `offset: { x: ${o.x.toFixed(3)}, y: ${o.y.toFixed(3)}, z: ${o.z.toFixed(3)} }, ` +
        `rot: { x: ${r.x.toFixed(1)}, y: ${r.y.toFixed(1)}, z: ${r.z.toFixed(1)} }, ` +
        `scale: ${Number(THERMO_PROP_SCALE_LIVE).toFixed(2)}`;
    thermoEditorChat('!{#7dffb3}[tprop] ' + line);
    try { mp.console.logInfo('[tprop] ' + line); } catch (_e2) {}
}

function thermoEditorReattach() {
    const player = mp.players.local;
    if (!player) return;
    const attach = THERMO_ATTACH;
    resolveThermoPropHash(false).then((hash) => {
        if (!hash || !thermoEditorOn) return;
        spawnHandPropAttached(
            player,
            60000,
            hash,
            attach.offset,
            attach.rot,
            attach.bone,
            [0, 40, 120]
        );
    });
}

function thermoEditorEnsureAnim() {
    const player = mp.players.local;
    if (!player) return;
    requestAnimDict(THERMO_DICT).then((ok) => {
        if (!ok || !thermoEditorOn) return;
        player.taskPlayAnim(
            THERMO_DICT,
            THERMO_NAME,
            8.0,
            -8.0,
            -1,
            FLAGS_UPPER_BODY,
            0,
            false,
            false,
            false
        );
        thermoEditorReattach();
    });
}

function thermoEditorStop() {
    thermoEditorOn = false;
    if (thermoEditorRefreshTimer) {
        try { clearInterval(thermoEditorRefreshTimer); } catch (_e) {}
        thermoEditorRefreshTimer = null;
    }
    const player = mp.players.local;
    if (player) {
        clearHandProp(player.remoteId);
        finishConsumableUseAnim(player, THERMO_DICT, THERMO_NAME);
    }
    thermoEditorChat('!{#cccccc}[tprop] Выкл. Скопируй значения в THERMO_ATTACH в consumables_anim.js');
}

function thermoEditorStart() {
    thermoEditorOn = true;
    thermoEditorChat('!{#7dffb3}[tprop] ON — стрелки XYZ offset, Q/E rotX, Z/C rotY, R/F rotZ, [/] шаг, -/= scale, Enter=print, Backspace=выкл');
    thermoEditorPrint();
    thermoEditorEnsureAnim();
    if (thermoEditorRefreshTimer) {
        try { clearInterval(thermoEditorRefreshTimer); } catch (_e) {}
    }
    thermoEditorRefreshTimer = setInterval(() => {
        if (!thermoEditorOn) return;
        thermoEditorEnsureAnim();
    }, 4500);
}

function thermoEditorNudge(axis, isRot, dir) {
    if (!thermoEditorOn) return;
    const step = isRot ? thermoEditorRotStep : thermoEditorStep;
    const target = isRot ? THERMO_ATTACH.rot : THERMO_ATTACH.offset;
    target[axis] = Number((target[axis] + dir * step).toFixed(isRot ? 1 : 3));
    thermoEditorReattach();
    thermoEditorPrint();
}

function bindThermoEditorKeys() {
    if (thermoEditorKeysBound) return;
    thermoEditorKeysBound = true;

    const bind = (vk, fn) => {
        global.bindGameplayKey(vk, true, () => {
            if (!thermoEditorOn) return;
            if (mp.gui.cursor.visible) return;
            if (mp.players.local.isTypingInTextChat) return;
            fn();
        });
    };

    bind(0x25, () => thermoEditorNudge('x', false, -1));
    bind(0x27, () => thermoEditorNudge('x', false, 1));
    bind(0x26, () => thermoEditorNudge('y', false, 1));
    bind(0x28, () => thermoEditorNudge('y', false, -1));
    bind(0x21, () => thermoEditorNudge('z', false, 1));
    bind(0x22, () => thermoEditorNudge('z', false, -1));
    bind(0x51, () => thermoEditorNudge('x', true, -1));
    bind(0x45, () => thermoEditorNudge('x', true, 1));
    bind(0x5A, () => thermoEditorNudge('y', true, -1));
    bind(0x43, () => thermoEditorNudge('y', true, 1));
    bind(0x52, () => thermoEditorNudge('z', true, -1));
    bind(0x46, () => thermoEditorNudge('z', true, 1));
    bind(0xDB, () => {
        thermoEditorStep = Math.max(0.001, Number((thermoEditorStep / 2).toFixed(3)));
        thermoEditorRotStep = Math.max(0.5, thermoEditorRotStep / 2);
        thermoEditorChat(`!{#cccccc}[tprop] step=${thermoEditorStep} rotStep=${thermoEditorRotStep}`);
    });
    bind(0xDD, () => {
        thermoEditorStep = Math.min(0.05, Number((thermoEditorStep * 2).toFixed(3)));
        thermoEditorRotStep = Math.min(15, thermoEditorRotStep * 2);
        thermoEditorChat(`!{#cccccc}[tprop] step=${thermoEditorStep} rotStep=${thermoEditorRotStep}`);
    });
    bind(0xBD, () => {
        THERMO_PROP_SCALE_LIVE = Math.max(0.5, Number((THERMO_PROP_SCALE_LIVE - 0.02).toFixed(2)));
        thermoEditorReattach();
        thermoEditorPrint();
    });
    bind(0xBB, () => {
        THERMO_PROP_SCALE_LIVE = Math.min(2.5, Number((THERMO_PROP_SCALE_LIVE + 0.02).toFixed(2)));
        thermoEditorReattach();
        thermoEditorPrint();
    });
    bind(0x0D, () => thermoEditorPrint());
    bind(0x08, () => thermoEditorStop());
}

mp.events.add('thermos:propEditor:c', (toggleRaw) => {
    try {
        if ((mp.players.local.getVariable('adminlvl') || 0) < 1) return;
        bindThermoEditorKeys();
        const t = String(toggleRaw == null ? '' : toggleRaw).toLowerCase();
        if (t === 'off' || t === '0' || t === 'stop') {
            thermoEditorStop();
            return;
        }
        if (thermoEditorOn) thermoEditorStop();
        else thermoEditorStart();
    } catch (_e) {}
});
