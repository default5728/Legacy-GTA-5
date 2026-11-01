/**
 * Brawl — клиент: синхронизация UI, голос (громкости), метки, карта, PTT.
 * Метка (как Calamity crew alertMarker): луч от gameplay-камеры → testPointToPoint(..., 17);
 * картинка — нативный спрайт commonmenu / mp_alerttriangle (не CEF).
 */

const BRWL_MARKER_RANGE = 300;

/** Флаги рейкаста как в Calamity EternalDev crewSystem/alertMarker. */
const BRWL_PLACE_RAYCAST_FLAGS = 17;

/** Метка в мире — те же ассеты, что crew marker в Calamity. */
const BRWL_ALERT_TEX_DICT = 'commonmenu';
const BRWL_ALERT_TEX_NAME = 'mp_alerttriangle';
const BRWL_ALERT_SCALE_SPRITE = 1;

/** Не ниже земли под точкой (кровати/крыши не опускаем, только поднимаем из-под земли). */
function snapMarkerAboveGround(pos) {
    const x = pos.x;
    const y = pos.y;
    const z = pos.z;
    const gz = mp.game.gameplay.getGroundZFor3dCoord(x, y, z + 150.0, 0, false);
    if (typeof gz !== 'number' || isNaN(gz)) return new mp.Vector3(x, y, z);
    const minZ = gz + 0.08;
    if (z < minZ) return new mp.Vector3(x, y, minZ);
    return new mp.Vector3(x, y, z);
}

let brawlState = null;
let brawlMarkers = [];
let brawlMemberBlips = [];
let lastBrawlSpeakersJson = '';
let brawlListenGlobal = 100;
const brawlListenMember = {};
/** Счётчик зажатых PTT в Brawl (основной голос + отдельный бинд): см. brawlMicDown/brawlMicUp */
let brawlPttRefCount = 0;

function syncBrawlPttGlobal() {
    if (typeof global !== 'undefined') global.__brawlMicRefCount = brawlPttRefCount;
}

function getBrawlMeta() {
    try {
        const raw = mp.players.local.getVariable('brawlMeta');
        if (raw == null || raw === '') return null;
        if (typeof raw === 'object') return raw;
        if (typeof raw === 'string') return JSON.parse(raw);
    } catch (_e) {
        return null;
    }
    return null;
}

function inBrawlChannel() {
    const ch = mp.players.local.getVariable('brawlCh');
    return ch != null && ch !== '';
}

function canBrawlSpeak() {
    const m = getBrawlMeta();
    if (!m || !inBrawlChannel()) return false;
    if (m.muted) return false;
    if (m.ownersOnly && !m.isOwner && !m.assistant) return false;
    return true;
}

function canPlaceMarker() {
    if (!inBrawlChannel()) return false;
    const m = getBrawlMeta();
    if (!m) return false;
    const isOwner = !!m.isOwner;
    if (!isOwner && !!m.markersBanned) return false;
    const marksAll = !!m.marksAll;
    const assistant = !!m.assistant;
    const allowMarkers = !!m.allowMarkers;
    if (marksAll || isOwner || assistant || allowMarkers) return true;
    return false;
}

/** Громкость входящего от участника channel (0–1) */
function applyBrawlVoiceVolumes() {
    if (!inBrawlChannel() || !brawlState || !brawlState.members) return;
    const g = brawlListenGlobal / 100;

    mp.players.forEach((p) => {
        if (!p || p === mp.players.local || !mp.players.exists(p)) return;
        if (String(p.getVariable('brawlCh') || '') !== String(mp.players.local.getVariable('brawlCh') || '')) return;
        const st = p.getVariable('static');
        const row = brawlState.members.find((x) => Number(x.static) === Number(st));
        try {
            p.voice3d = false;
            if (row && row.muted) {
                p.voiceVolume = 0;
            } else {
                const localVol = brawlListenMember[String(st)];
                const baseVol = localVol != null ? localVol : (row && row.volume != null ? row.volume : 100);
                const pv = baseVol / 125;
                p.voiceVolume = Math.max(0, Math.min(1, g * pv));
            }
        } catch (_e) {}
    });
}

function resetBrawlListenVolumes() {
    brawlListenGlobal = 100;
    Object.keys(brawlListenMember).forEach((k) => delete brawlListenMember[k]);
}

mp.events.add('brawl:vol', (kind, staticId, value) => {
    const v = parseInt(value, 10);
    if (kind === 'global') {
        brawlListenGlobal = Math.max(0, Math.min(100, Number.isFinite(v) ? v : 100));
    } else if (kind === 'member') {
        const st = String(parseInt(staticId, 10));
        if (!st || st === 'NaN') return;
        brawlListenMember[st] = Math.max(0, Math.min(125, Number.isFinite(v) ? v : 100));
    }
    applyBrawlVoiceVolumes();
});

mp.events.add('brawl:sync', (json) => {
    try {
        brawlState = typeof json === 'string' ? JSON.parse(json) : json;
        if (brawlState) brawlState.myStatic = mp.players.local.getVariable('static');
    } catch (_e) {
        brawlState = null;
    }
    refreshMemberBlips();
    try {
        const payload = brawlState ? JSON.stringify(brawlState) : null;
        if (typeof global !== 'undefined' && typeof global.__phoneBrawlPush === 'function') {
            global.__phoneBrawlPush(payload);
        } else {
            mp.events.call('brawl:phoneSync', payload);
        }
    } catch (_e) {}
});

mp.events.add('brawl:left', () => {
    try {
        if (typeof global !== 'undefined') global.__voiceBrawlOutgoing = false;
        mp.events.callRemote('brawlVoiceTransmit', false);
    } catch (_e) {}
    if (brawlPttRefCount > 0) {
        brawlPttRefCount = 0;
        syncBrawlPttGlobal();
        brawlMicApplyClose();
    }
    brawlState = null;
    resetBrawlListenVolumes();
    clearMemberBlips();
    clearWorldMarkers();
    lastBrawlSpeakersJson = '';
    try {
        if (typeof hudr !== 'undefined' && hudr && mp.browsers.exists(hudr)) hudr.execute('hudMain.setBrawlSpeakers([]);');
    } catch (_e) {}
    try {
        if (typeof global !== 'undefined' && typeof global.__phoneBrawlPush === 'function') {
            global.__phoneBrawlPush(null);
        } else {
            mp.events.call('brawl:phoneSync', null);
        }
    } catch (_e) {}
});

function clearMemberBlips() {
    brawlMemberBlips.forEach((o) => {
        try {
            if (o && o.blip && typeof o.blip.destroy === 'function') o.blip.destroy();
        } catch (_e) {}
    });
    brawlMemberBlips = [];
}

function clearWorldMarkers() {
    brawlMarkers = [];
    clearMapBlips();
}

function refreshMemberBlips() {
    clearMemberBlips();
    if (!brawlState || !brawlState.mapVisible) return;

    mp.players.forEach((p) => {
        if (!p || p === mp.players.local || !mp.players.exists(p)) return;
        if (String(p.getVariable('brawlCh') || '') !== String(mp.players.local.getVariable('brawlCh') || '')) return;
        const st = p.getVariable('static');
        const row = brawlState.members.find((m) => Number(m.static) === Number(st));
        if (!row) return;

        let color = 0;
        if (row.isOwner) color = 5;
        else if (row.assistant) color = 2;

        try {
            const b = mp.blips.new(1, p.position, {
                name: row.login || 'Brawl',
                color: color,
                shortRange: false,
                dimension: p.dimension,
                scale: 0.9,
                alpha: 220
            });
            brawlMemberBlips.push({ blip: b, target: p });
        } catch (_e) {}
    });
}

setInterval(() => {
    brawlMemberBlips.forEach((o) => {
        try {
            if (o.target && mp.players.exists(o.target) && o.blip) {
                o.blip.position = o.target.position;
            }
        } catch (_e) {}
    });
}, 400);

/** Блипы GTA — миникарта и карта в ESC. */
let brawlMapBlips = [];
let lastMapBlipHash = '';

function clearMapBlips() {
    brawlMapBlips.forEach((b) => {
        try {
            if (b && typeof b.destroy === 'function') b.destroy();
        } catch (_e) {}
    });
    brawlMapBlips = [];
    lastMapBlipHash = '';
}

function syncMapBlips() {
    let h = '';
    for (let i = 0; i < brawlMarkers.length; i++) {
        const m = brawlMarkers[i];
        h += m.x.toFixed(1) + ',' + m.y.toFixed(1) + ',' + m.z.toFixed(1) + '|';
    }
    if (h === lastMapBlipHash) return;
    lastMapBlipHash = h;
    clearMapBlips();
    if (brawlMarkers.length === 0) return;
    const dim = mp.players.local.dimension;
    try {
        for (let i = 0; i < brawlMarkers.length; i++) {
            const m = brawlMarkers[i];
            const b = mp.blips.new(162, new mp.Vector3(m.x, m.y, m.z), {
                name: 'Brawl',
                color: 1,
                shortRange: false,
                alpha: 230,
                dimension: dim
            });
            brawlMapBlips.push(b);
        }
    } catch (_e) {}
}

/** RGB спрайта по рангу постановщика (crewSystem/config ALERT_MARKER_COLORS). */
function brawlAlertRgbForPlacer(fromStatic) {
    const member = [14, 98, 13];
    const commander = [172, 125, 21];
    const leader = [182, 162, 26];
    const fallback = [157, 28, 47];
    if (!brawlState || !brawlState.members || fromStatic == null) return fallback;
    const row = brawlState.members.find((m) => Number(m.static) === Number(fromStatic));
    if (!row) return fallback;
    if (row.isOwner) return leader;
    if (row.assistant) return commander;
    return member;
}

function brawlLerp(a, b, t) {
    const x = Math.min(1, Math.max(0, t));
    return a + (b - a) * x;
}

/** Направление луча камеры (градусы → единичный вектор), как в типичных коллегах RageMP. */
function gameplayCamRotToDirection(rot) {
    const z = (rot.z * Math.PI) / 180;
    const x = (rot.x * Math.PI) / 180;
    const num = Math.abs(Math.cos(x));
    const vx = -Math.sin(z) * num;
    const vy = Math.cos(z) * num;
    const vz = Math.sin(x);
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (len < 1e-6) return { x: 0, y: 0, z: 1 };
    return { x: vx / len, y: vy / len, z: vz / len };
}

function getBrawlGameplayCamRay() {
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

/** Calamity crewSystem/alertMarker/utils drawSprite — отрисовка в мире. */
function drawBrawlAlertSprite(textureDict, textureName, wx, wy, wz, wh, heading, colour) {
    mp.game.graphics.setDrawOrigin(wx, wy, wz, 0);
    const resolution = mp.game.graphics.getScreenActiveResolution(0, 0);
    const textureResolution = mp.game.graphics.getTextureResolution(textureDict, textureName);
    const textureScale = [
        (wh[0] * textureResolution.x) / resolution.x,
        (wh[1] * textureResolution.y) / resolution.y
    ];
    if (mp.game.graphics.hasStreamedTextureDictLoaded(textureDict)) {
        mp.game.graphics.drawSprite(
            textureDict,
            textureName,
            0,
            0,
            textureScale[0],
            textureScale[1],
            heading,
            colour.r,
            colour.g,
            colour.b,
            colour.a,
            true
        );
    } else {
        mp.game.graphics.requestStreamedTextureDict(textureDict, true);
    }
    mp.game.graphics.clearDrawOrigin();
}

mp.events.add('brawl:markerShow', (x, y, z, type, fromStatic, durationMs) => {
    const duration = durationMs || 15000;
    const until = Date.now() + duration;
    const meta = getBrawlMeta();
    const s = snapMarkerAboveGround(new mp.Vector3(x, y, z));
    const rgb = brawlAlertRgbForPlacer(fromStatic);
    const entry = {
        x: s.x,
        y: s.y,
        z: s.z,
        until,
        duration,
        type,
        cr: rgb[0],
        cg: rgb[1],
        cb: rgb[2]
    };
    try {
        mp.game.audio.playSoundFrontend(-1, 'Start_Squelch', 'CB_RADIO_SFX', true);
    } catch (_e2) {}
    if (meta && meta.replaceMarks === true) {
        brawlMarkers.push(entry);
    } else {
        brawlMarkers = [entry];
    }
});

function renderBrawlMarkersWorld() {
    const now = Date.now();
    brawlMarkers = brawlMarkers.filter((m) => m.until > now);
    if (brawlMarkers.length === 0) {
        clearMapBlips();
        return;
    }

    syncMapBlips();

    if (mp.game.ui.isPauseMenuActive()) return;

    const lp = mp.players.local.position;
    mp.game.graphics.requestStreamedTextureDict(BRWL_ALERT_TEX_DICT, true);

    for (let i = 0; i < brawlMarkers.length; i++) {
        const m = brawlMarkers[i];
        const pos = snapMarkerAboveGround(new mp.Vector3(m.x, m.y, m.z));
        const realDistance = mp.game.system.vdist(lp.x, lp.y, lp.z, pos.x, pos.y, pos.z);
        let time = (m.until - now) / (m.duration || 15000);
        if (time < 0) time = 0;
        const alpha = Math.round(brawlLerp(0, 255, time));
        const distNorm = realDistance > 30 ? 1 : realDistance / 30;
        const size = brawlLerp(0.5, 1, distNorm);
        const sc = BRWL_ALERT_SCALE_SPRITE;
        drawBrawlAlertSprite(BRWL_ALERT_TEX_DICT, BRWL_ALERT_TEX_NAME, pos.x, pos.y, pos.z, [size * sc * 0.5, size * sc * 0.5], 0, {
            r: Number(m.cr != null ? m.cr : 157),
            g: Number(m.cg != null ? m.cg : 28),
            b: Number(m.cb != null ? m.cb : 47),
            a: alpha
        });
    }
}

mp.events.add('render', renderBrawlMarkersWorld);

// --- Постановка метки: луч от gameplay-камеры (Calamity alertMarker onBind) ---

function tryPlaceMarkerType(type) {
    if (!canPlaceMarker()) return;
    const { gameplayCam, cameraDirection } = getBrawlGameplayCamRay();
    const endPosition = new mp.Vector3(
        BRWL_MARKER_RANGE * cameraDirection.x + gameplayCam.x,
        BRWL_MARKER_RANGE * cameraDirection.y + gameplayCam.y,
        BRWL_MARKER_RANGE * cameraDirection.z + gameplayCam.z
    );
    let hit;
    try {
        hit = mp.raycasting.testPointToPoint(gameplayCam, endPosition, mp.players.local, BRWL_PLACE_RAYCAST_FLAGS);
    } catch (_e) {
        hit = mp.raycasting.testPointToPoint(gameplayCam, endPosition, mp.players.local);
    }

    if (hit && hit.entity && mp.players.exists(hit.entity) && hit.entity !== mp.players.local) {
        const p = hit.entity;
        const myFam = mp.players.local.getVariable('family');
        const tf = p.getVariable('family');
        if (myFam != null && tf != null && myFam === tf) {
            mp.events.call('notify:client', 2, 'top-mid', 'Своих нельзя отмечать.', 2000);
            return;
        }
        mp.events.callRemote('brawl:markerPlayer', p.id);
        return;
    }

    if (!hit || !hit.position) {
        mp.events.call('notify:client', 2, 'top-mid', 'Нет поверхности для метки — наведите на землю или объект.', 2800);
        return;
    }

    let pos = hit.position;
    const dCam = mp.game.gameplay.getDistanceBetweenCoords(
        gameplayCam.x,
        gameplayCam.y,
        gameplayCam.z,
        pos.x,
        pos.y,
        pos.z,
        true
    );
    if (dCam > BRWL_MARKER_RANGE + 0.5) {
        mp.events.call('notify:client', 2, 'top-mid', 'Слишком далеко.', 2000);
        return;
    }

    pos = snapMarkerAboveGround(pos);

    const lp = mp.players.local.position;
    const dx = lp.x - pos.x;
    const dy = lp.y - pos.y;
    const dz = lp.z - pos.z;
    if (dx * dx + dy * dy + dz * dz > BRWL_MARKER_RANGE * BRWL_MARKER_RANGE) {
        mp.events.call('notify:client', 2, 'top-mid', 'Слишком далеко.', 2000);
        return;
    }
    mp.events.callRemote('brawl:marker', pos.x, pos.y, pos.z, type);
}

function updateBrawlVoiceHud() {
    try {
        if (typeof hudr === 'undefined' || !hudr || !mp.browsers.exists(hudr)) return;
    } catch (_e) {
        return;
    }
    if (!inBrawlChannel() || !brawlState || !brawlState.members) {
        if (lastBrawlSpeakersJson !== '[]') {
            lastBrawlSpeakersJson = '[]';
            hudr.execute('hudMain.setBrawlSpeakers([]);');
        }
        return;
    }
    const myCh = String(mp.players.local.getVariable('brawlCh') || '');
    const names = [];
    function remoteBrawlSpeaking(p) {
        try {
            return p.getVariable('brawlVoice') === true;
        } catch (_e) {
            return false;
        }
    }
    function localBrawlSpeaking() {
        try {
            const wide =
                typeof global !== 'undefined' && global.__voiceBrawlOutgoing === true;
            return !!(wide && mp.voiceChat && mp.voiceChat.muted === false);
        } catch (_e) {
            return false;
        }
    }
    mp.players.forEach((p) => {
        if (!p || !mp.players.exists(p)) return;
        if (String(p.getVariable('brawlCh') || '') !== myCh) return;
        const speaking = p === mp.players.local ? localBrawlSpeaking() : remoteBrawlSpeaking(p);
        if (!speaking) return;
        const st = p.getVariable('static');
        const row = brawlState.members.find((m) => Number(m.static) === Number(st));
        names.push(row && row.login ? row.login : '#' + st);
    });
    const j = JSON.stringify(names);
    if (j !== lastBrawlSpeakersJson) {
        lastBrawlSpeakersJson = j;
        hudr.execute(`hudMain.setBrawlSpeakers(${j});`);
        if (typeof global !== 'undefined' && typeof global.__phoneBrawlSpeakersPush === 'function') {
            global.__phoneBrawlSpeakersPush(j);
        }
    }
}

let brawlVoiceHudTick = 0;
setInterval(() => {
    brawlVoiceHudTick++;
    const inCh = inBrawlChannel();
    if (!inCh) {
        if (lastBrawlSpeakersJson !== '[]') updateBrawlVoiceHud();
        return;
    }
    if (brawlVoiceHudTick % 2 === 0 || lastBrawlSpeakersJson === '[]') {
        updateBrawlVoiceHud();
    }
}, 200);

function brawlPlaceMarkerFromBind() {
    if (mp.players.local.isTypingInTextChat) return;
    if (!inBrawlChannel()) {
        mp.events.call('notify:client', 2, 'top-mid', 'Вы не в канале Brawl.', 2000);
        return;
    }
    if (!canPlaceMarker()) {
        mp.events.call('notify:client', 2, 'top-mid', 'Нет права ставить метки.', 2500);
        return;
    }
    tryPlaceMarkerType('here');
}

mp.events.add('brawl:placeMarker', brawlPlaceMarkerFromBind);
if (typeof global !== 'undefined') {
    global.brawlPlaceMarkerFromBind = brawlPlaceMarkerFromBind;
}

setInterval(() => {
    if (inBrawlChannel()) applyBrawlVoiceVolumes();
}, 400);

function brawlHudMic(on) {
    if (typeof hudr !== 'undefined' && hudr && mp.browsers.exists(hudr)) {
        try {
            hudr.execute(`hudMain.updateMicro(${on ? 'true' : 'false'});`);
        } catch (_e) {}
    }
}

function tryOpenBrawlMic() {
    if (!mp.players.local.getVariable('brawlCh')) return false;
    if (!mp.players.local.getVariable('auth')) return false;
    if (mp.players.local.getVariable('anticheat') === true) return false;
    if (mp.players.local.getVariable('voicee') === false) {
        mp.events.call('notify:client', 2, 'top-mid', `У вас выключен голосовой чат.`, 3000);
        return false;
    }
    if (mp.players.local.getVariable('mute') === true) {
        mp.events.call('notify:client', 2, 'top-mid', 'У вас присутствует активный мут, вы не можете использовать голосовой чат.', 1500);
        return false;
    }
    if (mp.players.local.getVariable('jail') === true) {
        mp.events.call('notify:client', 2, 'top-mid', 'Вы не можете использовать голосовой чат находясь в деморгане.', 1500);
        return false;
    }
    if (!canBrawlSpeak()) {
        mp.events.call('notify:client', 2, 'top-mid', 'Нельзя говорить в Brawl (мут или режим «только владельцы»).', 2000);
        return false;
    }
    return true;
}

function brawlMicApplyOpen() {
    if (typeof global !== 'undefined') global.__voiceBrawlOutgoing = true;
    try {
        mp.events.callRemote('brawlVoiceTransmit', true);
    } catch (_e) {}
    mp.voiceChat.muted = false;
    mp.events.callRemote('voice:anim', true);
    brawlHudMic(true);
    mp.events.callRemote('setvariablevoice', true);
}

function brawlMicApplyClose() {
    if (typeof global !== 'undefined') global.__voiceBrawlOutgoing = false;
    try {
        mp.events.callRemote('brawlVoiceTransmit', false);
    } catch (_e) {}
    try {
        const v = typeof global !== 'undefined' ? Number(global.__voiceMicRefCount) || 0 : 0;
        if (v > 0) return;
    } catch (_e) {}
    mp.voiceChat.muted = true;
    mp.events.callRemote('voice:anim', false);
    brawlHudMic(false);
    mp.events.callRemote('setvariablevoice', false);
}

function brawlMicDown() {
    if (mp.players.local.isTypingInTextChat) return;
    if (!mp.players.local.getVariable('brawlCh')) return;
    if (brawlPttRefCount > 0) {
        brawlPttRefCount++;
        syncBrawlPttGlobal();
        return;
    }
    if (!tryOpenBrawlMic()) return;
    brawlPttRefCount = 1;
    syncBrawlPttGlobal();
    brawlMicApplyOpen();
}

function brawlMicUp() {
    if (brawlPttRefCount <= 0) return;
    brawlPttRefCount--;
    syncBrawlPttGlobal();
    if (brawlPttRefCount === 0) {
        brawlMicApplyClose();
    }
}

mp.events.add('brawl:pttDown', () => brawlMicDown());
mp.events.add('brawl:pttUp', () => brawlMicUp());

setTimeout(() => {
    try {
        mp.events.call('keybindsReload');
    } catch (_e) {}
}, 0);

if (typeof global !== 'undefined') {
    global.brawlGetState = () => brawlState;
    global.brawlRefreshBlips = refreshMemberBlips;
    global.__voiceBrawlOutgoing = false;
    syncBrawlPttGlobal();
}
