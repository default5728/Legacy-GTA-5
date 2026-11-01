'use strict';

mp.nametags.enabled = false;

const NAMETAG_MAX_DISTANCE = 25;
const NAMETAG_FADE_START_DISTANCE = 18;
const NAMETAG_COMBAT_MAX_DISTANCE = 20;
const NAMETAG_COMBAT_FADE_START_DISTANCE = 14;
const NAMETAG_HEIGHT_REFERENCE_DISTANCE = 40;
const NAMETAG_HEAD_BONE = 12844;
const NAMETAG_SKEL_HEAD = 31086;
const NAMETAG_HEAD_WORLD_Z = 0.38;
const NAMETAG_FALLBACK_Z = 1.18;
const NAMETAG_BASE_LIFT = 0.040;
const NAMETAG_DIST_LIFT = 0.042;
const NAMETAG_NAME_FONT = 4;
const NAMETAG_NAME_SCALE = 0.40;
const NAMETAG_ADMIN_TEXT = 'Администратор сервера';
const NAMETAG_ADMIN_SCALE = 0.29;
const NAMETAG_ADMIN_Y = 0.033;
const NAMETAG_VOICE_Y = 0.018;
const NAMETAG_HP_WIDTH = 0.038;
const NAMETAG_HP_HEIGHT = 0.006;
const NAMETAG_HP_BORDER = 0.001;
const NAMETAG_HP_BAR_Y = 0.04;
/** HP/armor при прицеле — та же дистанция, что у неймтега (не дальше имени). */
const NAMETAG_HP_AIM_DISTANCE = NAMETAG_MAX_DISTANCE;
/** World + vehicles + objects + vegetation. Без peds — иначе луч бьёт в саму цель. */
const NAMETAG_WALL_FLAGS = 1 | 2 | 8 | 16;
const NAMETAG_LOS_TTL_MS = 80;
const VOICE_SPEAK_FRAMES = [
    'leaderboard_audio_1',
    'leaderboard_audio_2',
    'leaderboard_audio_3'
];

const TEXT_CENTER = { outline: true, centre: true };

const gfx = mp.game.graphics;
let screenRes = { x: 1920, y: 1080 };

try { gfx.requestStreamedTextureDict('mpleaderboard', true); } catch (_e) {}

let texResMicro = { x: 32, y: 32 };
let texResMute = { x: 32, y: 32 };

setTimeout(() => {
    try {
        screenRes = gfx.getScreenResolution(0, 0);
        texResMicro = gfx.getTextureResolution('mpleaderboard', 'leaderboard_audio_3');
        texResMute = gfx.getTextureResolution('mpleaderboard', 'leaderboard_audio_mute');
    } catch (_e2) {}
}, 5000);

function nametagsEnabled() {
    try {
        const lp = mp.players.local;
        if (!lp || lp.getVariable('auth') !== true) return false;
        return lp.getVariable('names') !== false;
    } catch (_e) {
        return false;
    }
}

function getNametagDistances() {
    try {
        const me = mp.players.local;
        if (me && (me.getVariable('inCapt') === true || me.getVariable('inBizwar') === true)) {
            return { maxDistance: NAMETAG_COMBAT_MAX_DISTANCE, fadeStart: NAMETAG_COMBAT_FADE_START_DISTANCE };
        }
    } catch (_e) {}
    return { maxDistance: NAMETAG_MAX_DISTANCE, fadeStart: NAMETAG_FADE_START_DISTANCE };
}

function resolvePlayerMpId(player) {
    if (typeof global.resolvePlayerMpId === 'function') {
        return global.resolvePlayerMpId(player);
    }
    if (!player || !mp.players.exists(player)) return 0;
    const synced = player.getVariable('mpId');
    if (synced !== undefined && synced !== null && synced !== '') {
        const n = parseInt(synced, 10);
        if (!Number.isNaN(n)) return n;
    }
    if (typeof player.remoteId === 'number' && player.remoteId >= 0) return player.remoteId;
    return player.id;
}

function resolveNametagLogin(player) {
    if (!player || !mp.players.exists(player)) return '';
    return typeof global.citizenResolveLogin === 'function'
        ? global.citizenResolveLogin(player)
        : player.getVariable('login');
}

function isPlayerNametagHidden(player) {
    if (!player || !mp.players.exists(player)) return true;
    const inv = player.getVariable('invisible');
    if (inv === 0 || inv === false) return true;
    try {
        if (typeof player.getAlpha === 'function' && player.getAlpha() < 10) return true;
    } catch (_e) {}
    return false;
}

function isPlayerNametagOnScreen(player) {
    try {
        if (typeof player.isOnScreen === 'function') return player.isOnScreen();
    } catch (_e) {}
    return true;
}

function shouldShowNametagAdmin(player) {
    if (!player || player.getVariable('redname') !== true) return false;
    const adminlvl = Number(player.getVariable('adminlvl')) || 0;
    let adminTrue = player.getVariable('adminTrueLvl');
    if (adminTrue == null || adminTrue === undefined) adminTrue = adminlvl;
    const trueLv = Number(adminTrue) || 0;
    const fly = player.getVariable('fly') === true;
    const sessionAd = player.getVariable('adminSession') === true;
    if (trueLv >= 8 && adminlvl >= 1) return true;
    if (trueLv >= 1 && trueLv <= 7 && sessionAd && !fly) return true;
    return false;
}

function buildNametagLoginLine(player) {
    let login = resolveNametagLogin(player);
    if (!login) {
        try {
            login = (player.name && String(player.name).trim()) || '';
        } catch (_e) {
            login = '';
        }
    }
    if (!login) login = 'Игрок';
    const staticId = player.getVariable('static');
    const staticStr = (staticId != null && staticId !== '') ? String(staticId) : '';
    const family = player.getVariable('family');
    const showFamily = !!(family && login !== 'Гражданин' && login !== 'Игрок');
    const suffix = staticStr ? ` (${staticStr})` : '';
    return showFamily ? `[${family}] ${login}${suffix}` : `${login}${suffix}`;
}

function refreshNametagPlayerCache(player) {
    if (!player || !mp.players.exists(player) || player.type !== 'player') return;
    player.__flowNametagAdmin = shouldShowNametagAdmin(player);
    player.__flowNametagLogin = buildNametagLoginLine(player);
}

function refreshAllNametagCaches() {
    try {
        mp.players.forEachInStreamRange(refreshNametagPlayerCache);
    } catch (_e) {}
}

const NAMETAG_CACHE_VARS = [
    'login', 'static', 'family', 'invisible', 'redname', 'adminlvl',
    'adminTrueLvl', 'adminSession', 'fly', 'mpId', 'voice', 'mute', 'voicee'
];

NAMETAG_CACHE_VARS.forEach((varName) => {
    mp.events.addDataHandler(varName, (entity) => {
        if (entity && entity.type === 'player') refreshNametagPlayerCache(entity);
    });
});

mp.events.add('entityStreamIn', (entity) => {
    if (entity && entity.type === 'player') refreshNametagPlayerCache(entity);
});

mp.events.add('citizen:sync:c', refreshAllNametagCaches);

setInterval(refreshAllNametagCaches, 1500);

function getNametagDistanceLift(distance) {
    const distT = Math.min(1, Math.max(0, distance / NAMETAG_HEIGHT_REFERENCE_DISTANCE));
    return NAMETAG_BASE_LIFT + distT * NAMETAG_DIST_LIFT;
}

function getNametagAlpha(distance, maxDistance = NAMETAG_MAX_DISTANCE, fadeStart = NAMETAG_FADE_START_DISTANCE) {
    if (distance <= fadeStart) return 255;
    const fadeRange = maxDistance - fadeStart;
    const fade = 1 - ((distance - fadeStart) / fadeRange);
    return Math.max(0, Math.min(255, Math.round(fade * 255)));
}

const activeVoicePlayers=new WeakSet();
mp.events.add('playerStartTalking',player=>{if(player&&player!==mp.players.local)activeVoicePlayers.add(player);});
mp.events.add('playerStopTalking',player=>{if(player)activeVoicePlayers.delete(player);});
function getVoiceSpriteName(player) {
    if (mp.players.local.getVariable('voicee') === false) return '';
    if (player.getVariable('voicee') === false) return '';
    if (player.getVariable('voice') === true || activeVoicePlayers.has(player)) {
        return VOICE_SPEAK_FRAMES[Math.floor(Date.now() / 200) % VOICE_SPEAK_FRAMES.length];
    }
    return '';
}

function ensureNametagCache(player) {
    if (player.__flowNametagLogin == null) {
        refreshNametagPlayerCache(player);
    }
}

function drawPlayerNametag(player, x, y, alpha, distance, maxDistance = NAMETAG_MAX_DISTANCE) {
    ensureNametagCache(player);

    const loginLine = player.__flowNametagLogin;
    if (!loginLine) return false;

    if (player.__flowNametagAdmin) {
        gfx.drawText(NAMETAG_ADMIN_TEXT, [x, y - NAMETAG_ADMIN_Y], {
            font: NAMETAG_NAME_FONT,
            color: [255, 0, 0, alpha],
            scale: [NAMETAG_ADMIN_SCALE, NAMETAG_ADMIN_SCALE],
            ...TEXT_CENTER
        });
    }

    gfx.drawText(loginLine, [x, y], {
        font: NAMETAG_NAME_FONT,
        color: [255, 255, 255, alpha],
        scale: [NAMETAG_NAME_SCALE, NAMETAG_NAME_SCALE],
        ...TEXT_CENTER
    });

    const voiceSprite = getVoiceSpriteName(player);
    const voiceY = y + 0.011;
    if (voiceSprite) {
        let nameWidth=0;
        try {
            mp.game.ui.setTextEntryForWidth('STRING');
            mp.game.ui.addTextComponentSubstringPlayerName(loginLine);
            mp.game.ui.setTextFont(NAMETAG_NAME_FONT);
            mp.game.ui.setTextScale(NAMETAG_NAME_SCALE,NAMETAG_NAME_SCALE);
            nameWidth=mp.game.ui.getTextScreenWidth(true);
        } catch (_) { nameWidth=String(loginLine).length*8/screenRes.x; }

        gfx.drawSprite(
            'mpleaderboard',
            voiceSprite,
            x + nameWidth/2 + 12/screenRes.x,
            voiceY,
            18 / screenRes.x,
            18 / screenRes.y,
            0,
            240, 240, 240, alpha
        );
    }

    return true;
}

/** HP/армор бар при прицеливании — своя дистанция (не зависит от неймтега). */
function drawAimHealthBar(player, x, y) {
    const w = NAMETAG_HP_WIDTH;
    const h = NAMETAG_HP_HEIGHT;
    const b = NAMETAG_HP_BORDER;
    let barY = y + NAMETAG_HP_BAR_Y;
    let hp = player.getHealth();
    hp = hp <= 100 ? hp / 100 : (hp - 100) / 100;
    const armour = player.getArmour() / 100;

    if (armour > 0) {
        gfx.drawRect(x, barY, w + 2 * b, h + 2 * b, 0, 0, 0, 200);
        gfx.drawRect(x, barY, w, h, 41, 66, 78, 255);
        gfx.drawRect(x - w / 2 * (1 - armour), barY, w * armour, h, 48, 108, 135, 200);
        barY -= 0.008;
        gfx.drawRect(x, barY, w + 2 * b, h + 2 * b, 0, 0, 0, 200);
        gfx.drawRect(x, barY, w, h, 150, 150, 150, 255);
        gfx.drawRect(x - w / 2 * (1 - hp), barY, w * hp, h, 255, 255, 255, 200);
    } else {
        gfx.drawRect(x, barY, w + 2 * b, h + 2 * b, 0, 0, 0, 200);
        gfx.drawRect(x, barY, w, h, 150, 150, 150, 255);
        gfx.drawRect(x - w / 2 * (1 - hp), barY, w * hp, h, 255, 255, 255, 200);
    }
}

/** Позиция бара при прицеливании с отдельной дистанцией (LOS соблюдается). */
function resolveAimBarScreenPos(player, localPlayer, maxDistance = NAMETAG_MAX_DISTANCE) {
    const worldPos = getNametagWorldHeadPos(player);
    if (!worldPos) return null;

    const lp = localPlayer.position;
    const distance = mp.game.system.vdist(lp.x, lp.y, lp.z, worldPos.x, worldPos.y, worldPos.z);
    if (distance >= maxDistance) return null;

    let screenPos;
    try {
        screenPos = gfx.world3dToScreen2d(new mp.Vector3(worldPos.x, worldPos.y, worldPos.z));
    } catch (_e) {
        return null;
    }
    if (!screenPos || !Number.isFinite(screenPos.x) || !Number.isFinite(screenPos.y)) return null;

    return {
        x: screenPos.x,
        y: screenPos.y - getNametagDistanceLift(distance),
        distance
    };
}

/** Рисуем HP/армор бар при прицеливании в той же дистанции, что и неймтег. */
function tryDrawAimHealthBar(player, localPlayer, maxDistance = NAMETAG_MAX_DISTANCE) {
    if (isPlayerNametagHidden(player)) return;
    if (!isPlayerNametagOnScreen(player)) return;
    if (!hasNametagLineOfSight(player)) return;

    const aiming =
        mp.game.player.isFreeAimingAtEntity(player.handle) ||
        mp.game.player.isTargettingEntity(player.handle);
    if (!aiming) return;

    const screen = resolveAimBarScreenPos(player, localPlayer, maxDistance);
    if (!screen) return;

    drawAimHealthBar(player, screen.x, screen.y);
}

function getNametagWorldHeadPos(player) {
    if (!player || !mp.players.exists(player)) return null;

    try {
        if (player.handle && player.handle !== 0) {
            let bonePos = player.getBoneCoords(NAMETAG_SKEL_HEAD, 0, 0, 0);
            if (!bonePos || !Number.isFinite(bonePos.x)) {
                bonePos = player.getBoneCoords(NAMETAG_HEAD_BONE, 0, 0, 0);
            }
            if (bonePos && Number.isFinite(bonePos.x)) {
                return new mp.Vector3(bonePos.x, bonePos.y, bonePos.z + NAMETAG_HEAD_WORLD_Z);
            }
        }
    } catch (_e) {}

    try {
        const p = player.position;
        if (p && Number.isFinite(p.x)) {
            return new mp.Vector3(p.x, p.y, p.z + NAMETAG_FALLBACK_Z);
        }
    } catch (_e2) {}

    return null;
}

function resolveNametagScreenPos(player, localPlayer, distances) {
    if (!player || !localPlayer) return null;

    const worldPos = getNametagWorldHeadPos(player);
    if (!worldPos) return null;

    const lp = localPlayer.position;
    const distance = mp.game.system.vdist(lp.x, lp.y, lp.z, worldPos.x, worldPos.y, worldPos.z);
    if (distance >= distances.maxDistance) return null;

    let screenPos;
    try {
        screenPos = gfx.world3dToScreen2d(new mp.Vector3(worldPos.x, worldPos.y, worldPos.z));
    } catch (_e) {
        return null;
    }
    if (!screenPos || !Number.isFinite(screenPos.x) || !Number.isFinite(screenPos.y)) return null;

    return {
        x: screenPos.x,
        y: screenPos.y - getNametagDistanceLift(distance),
        distance,
        maxDistance: distances.maxDistance
    };
}

function getNametagLosOrigin() {
    try {
        if (mp.cameras && mp.cameras.gameplay) {
            const cam = mp.cameras.gameplay.getCoord();
            if (cam && Number.isFinite(cam.x)) return cam;
        }
    } catch (_e) {}
    try {
        const cam = mp.game.cam.getGameplayCamCoord();
        if (cam && Number.isFinite(cam.x)) return cam;
    } catch (_e2) {}
    return getNametagWorldHeadPos(mp.players.local);
}

function nametagEntityHandle(entity) {
    if (entity == null || entity === false) return 0;
    if (typeof entity === 'number') return entity;
    try {
        if (typeof entity.handle === 'number') return entity.handle;
    } catch (_e) {}
    return 0;
}

function isNametagLosIgnoredEntity(entity, target) {
    if (!entity) return false;
    const handle = nametagEntityHandle(entity);
    const me = mp.players.local;
    try {
        if (entity === me || entity === target) return true;
        if (handle && (handle === me.handle || handle === target.handle)) return true;
        if (mp.players.exists(entity) && (entity === target || entity === me)) return true;
    } catch (_e) {}
    try {
        const veh = target && target.vehicle;
        if (veh && mp.vehicles.exists(veh) && (entity === veh || (handle && handle === veh.handle))) return true;
    } catch (_e2) {}
    try {
        const myVeh = me && me.vehicle;
        if (myVeh && mp.vehicles.exists(myVeh) && (entity === myVeh || (handle && handle === myVeh.handle))) return true;
    } catch (_e3) {}
    return false;
}

function nametagRayIsClear(hit, target) {
    if (!hit) return true;
    const hasPos = !!(hit.position && Number.isFinite(hit.position.x));
    const hasEnt = hit.entity != null && hit.entity !== 0 && hit.entity !== false;
    if (!hasPos && !hasEnt) return true;
    if (hasEnt && isNametagLosIgnoredEntity(hit.entity, target)) return true;
    return false;
}

/**
 * Прямая видимость от камеры до головы цели.
 * Ник не рисуем, если луч упирается в стену / объект / чужую машину.
 */
function hasNametagLineOfSight(player) {
    const now = Date.now();
    if (player.__flowNametagLosUntil >= now) return player.__flowNametagLos !== false;
    player.__flowNametagLosUntil = now + NAMETAG_LOS_TTL_MS;

    let visible = false;
    try {
        const fromPos = getNametagLosOrigin();
        const toPos = getNametagWorldHeadPos(player);
        if (!fromPos || !toPos) {
            visible = false;
        } else {
            visible = nametagRayIsClear(
                mp.raycasting.testPointToPoint(fromPos, toPos, mp.players.local, NAMETAG_WALL_FLAGS),
                player
            );
        }
    } catch (_e) {
        visible = true;
    }
    player.__flowNametagLos = visible;
    return visible;
}

function tryDrawPlayerNametag(player, localPlayer, distances) {
    if (isPlayerNametagHidden(player)) return false;
    if (!isPlayerNametagOnScreen(player)) return false;
    if (!hasNametagLineOfSight(player)) return false;

    const screen = resolveNametagScreenPos(player, localPlayer, distances);
    if (!screen) return false;

    return drawPlayerNametag(
        player,
        screen.x,
        screen.y,
        getNametagAlpha(screen.distance, distances.maxDistance, distances.fadeStart),
        screen.distance,
        screen.maxDistance
    );
}

mp.events.add('render', () => {
    try {
        if (!nametagsEnabled()) return;

        const localPlayer = mp.players.local;
        const distances = getNametagDistances();
        mp.players.forEachInStreamRange((player) => {
            if (!player || player === localPlayer) return;
            tryDrawPlayerNametag(player, localPlayer, distances);
            tryDrawAimHealthBar(player, localPlayer, distances.maxDistance);
        });
    } catch (_e) {}
});
