let reviver = null;
let reviverReady = false;
let reviverQueue = [];
let reviverCreating = false;

/** Создать (или пересоздать) браузер смерти — последним, чтобы рендерился поверх всех CEF (включая HUD). */
function ensureReviver() {
    if (reviver && mp.browsers.exists(reviver)) return;
    if (reviverCreating) return;
    reviverCreating = true;
    reviverReady = false;
    reviverQueue = [];
    try {
        reviver = mp.browsers.new("package://browsers/handler/index.html");
        reviver.orderId = 200;
        reviver.active = false;
    } catch (_e) {
        reviver = null;
    }
    setTimeout(() => { reviverCreating = false; }, 500);
}

function reviverExec(code) {
    if (!reviver || !mp.browsers.exists(reviver)) return;
    if (reviverReady) {
        try { reviver.execute(code); } catch (_e) {}
        return;
    }
    reviverQueue.push(code);
}

mp.events.add('browserDomReady', (browser) => {
    if (!reviver || browser !== reviver) return;
    reviverReady = true;
    const q = reviverQueue.slice();
    reviverQueue = [];
    q.forEach((code) => {
        try { reviver.execute(code); } catch (_e) {}
    });
});

let jailBrowser = null;
let pendingJailCmds = [];

function jailExec(cmd) {
    try {
        if (jailBrowser && mp.browsers.exists(jailBrowser)) {
            jailBrowser.execute(cmd);
        } else {
            pendingJailCmds.push(cmd);
        }
    } catch (_e) {}
}

setTimeout(() => {
    try {
        jailBrowser = mp.browsers.new("package://browsers/hud/jail.html");
        jailBrowser.active = true;
        for (const cmd of pendingJailCmds) {
            try { jailBrowser.execute(cmd); } catch (_e) {}
        }
        pendingJailCmds = [];
    } catch (_e) {}
}, 1500);

/** Слоты броня/аптека/спанк после урона: сервер шлёт damageConsumableLockSync (мс до снятия блока). */
let postDamageArmorUntilMs = 0;
let postDamageMedUntilMs = 0;
let postDamageSpankUntilMs = 0;
const POST_DAMAGE_ARM_CLIENT_MS = 5000;
const POST_DAMAGE_MED_CLIENT_MS = 5000;
const POST_DAMAGE_SPANK_CLIENT_MS = 5000;
const USE_COOLDOWN_CLIENT_MS = 2000;
const consumableUseUntilMs = { armor: 0, med: 0, spank: 0, alco: 0 };

function stampLocalConsumableUse(kind) {
    const k = String(kind || '');
    if (!Object.prototype.hasOwnProperty.call(consumableUseUntilMs, k)) return;
    consumableUseUntilMs[k] = Date.now() + USE_COOLDOWN_CLIENT_MS;
}

function isLocalConsumableUseCooldownActive(kind) {
    const k = String(kind || '');
    return Date.now() < (consumableUseUntilMs[k] || 0);
}

mp.events.add('damageConsumableLockSync', (...args) => {
    const now = Date.now();
    const a = Number(args[0]);
    const m = Number(args[1]);
    if (!Number.isFinite(a) || a <= 0) postDamageArmorUntilMs = 0;
    else postDamageArmorUntilMs = now + Math.min(POST_DAMAGE_ARM_CLIENT_MS, Math.round(a));
    if (!Number.isFinite(m) || m <= 0) postDamageMedUntilMs = 0;
    else postDamageMedUntilMs = now + Math.min(POST_DAMAGE_MED_CLIENT_MS, Math.round(m));
    if (args.length >= 3) {
        const s = Number(args[2]);
        if (!Number.isFinite(s) || s <= 0) postDamageSpankUntilMs = 0;
        else postDamageSpankUntilMs = now + Math.min(POST_DAMAGE_SPANK_CLIENT_MS, Math.round(s));
    }
});

function isLocalPostDamageArmorLockActive() {
    return Date.now() < postDamageArmorUntilMs;
}

function isLocalPostDamageMedkitLockActive() {
    return Date.now() < postDamageMedUntilMs;
}

function isLocalPostDamageSpankLockActive() {
    return Date.now() < postDamageSpankUntilMs;
}

function notifyArmorEquipCooldownClient() {
    mp.events.call('notify:client', 2, 'top-mid', 'Вы недавно получили урон.', 2500);
}

function notifyMedkitPostDamageClient() {
    mp.events.call('notify:client', 2, 'top-mid', 'Вы недавно получили урон.', 2500);
}

function getArmorEquipCooldownRemainingSecClient() {
    const ms = postDamageArmorUntilMs - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    const maxSec = Math.ceil(POST_DAMAGE_ARM_CLIENT_MS / 1000);
    return Math.min(maxSec, Math.max(1, Math.ceil(ms / 1000)));
}

if (typeof global !== 'undefined') {
    global.applyPostDamageConsumableLockLocal = function applyPostDamageConsumableLockLocal() {
        const now = Date.now();
        postDamageArmorUntilMs = now + POST_DAMAGE_ARM_CLIENT_MS;
        postDamageMedUntilMs = now + POST_DAMAGE_MED_CLIENT_MS;
        postDamageSpankUntilMs = now + POST_DAMAGE_SPANK_CLIENT_MS;
    };
    global.isLocalArmorEquipCooldownActive = isLocalPostDamageArmorLockActive;
    global.isLocalPostDamageArmorLockActive = isLocalPostDamageArmorLockActive;
    global.isPostDamageMedkitLockActive = isLocalPostDamageMedkitLockActive;
    global.isPostDamageSpankLockActive = isLocalPostDamageSpankLockActive;
    global.getArmorEquipCooldownRemainingSecClient = getArmorEquipCooldownRemainingSecClient;
    global.notifyArmorEquipCooldownClient = notifyArmorEquipCooldownClient;
    global.notifyMedkitPostDamageClient = notifyMedkitPostDamageClient;
    global.isLocalConsumableUseCooldownActive = isLocalConsumableUseCooldownActive;
    global.stampLocalConsumableUse = stampLocalConsumableUse;
}

mp.events.add('consumableUseCooldown:c', (kind) => {
    stampLocalConsumableUse(kind);
});

function closeGameplayUisOnDeath() {
    try {
        if (typeof global.tryCloseF3Esc === 'function') global.tryCloseF3Esc();
    } catch (_e) {}
    try {
        if (typeof global.forceCloseTabletForDeath === 'function') global.forceCloseTabletForDeath();
    } catch (_e2) {}
    try {
        if (typeof global.forceClosePhoneForDeath === 'function') global.forceClosePhoneForDeath();
    } catch (_e3) {}
    try {
        if (typeof global.tryCloseInventoryEsc === 'function') global.tryCloseInventoryEsc();
    } catch (_e4) {}
}

function resolveDeathKillerLabel(killerId) {
    const id = parseInt(killerId, 10) || 0;
    if (!id) return '';
    try {
        let p = null;
        try { p = mp.players.atRemoteId(id); } catch (_e0) {}
        if (!p || !mp.players.exists(p)) {
            mp.players.forEach((pl) => {
                if (p) return;
                if (!pl || !mp.players.exists(pl)) return;
                if (pl.id === id || pl.remoteId === id) p = pl;
            });
        }
        if (p && mp.players.exists(p)) {
            const login = p.getVariable('login') || p.name || '';
            const sid = p.getVariable('static') || id;
            if (login) return String(login) + '[' + sid + ']';
        }
    } catch (_e) {}
    return 'Гражданин[' + id + ']';
}

mp.events.add('deathHandler', (killerId, blockSpotRevive) => {
    /** Повторные playerDeath / deathHandler без респавна — не накапливать setInterval в CEF. */
    if (reviver && mp.browsers.exists(reviver) && reviver.active) return;
    postDamageArmorUntilMs = 0;
    postDamageMedUntilMs = 0;
    postDamageSpankUntilMs = 0;
    try {
        if (typeof global.forceAdminSpectateDeathCleanup === 'function') global.forceAdminSpectateDeathCleanup();
    } catch (_sp) {}
    closeGameplayUisOnDeath();
    try {
        if (typeof global !== 'undefined' && global.chatr && mp.browsers.exists(global.chatr)) {
            global.chatr.execute(`window.__chatForceCloseCompose && window.__chatForceCloseCompose()`);
        }
    } catch (_e) {}
    mp.events.callRemote('removearmor');
    mp.events.callRemote('removeweapondeath');
    const lp = mp.players.local;
    const vipRaw = lp && mp.players.exists(lp) ? lp.getVariable('viplvl') : 0;
    const vipLvl = parseInt(vipRaw, 10);
    let killerPlayerId = parseInt(killerId, 10) || 0;
    if (!killerPlayerId && lp && mp.players.exists(lp)) {
        try {
            const synced = parseInt(lp.getVariable('deathKillerSessionId'), 10);
            if (Number.isFinite(synced) && synced > 0) killerPlayerId = synced;
        } catch (_eK) {}
    }
    const killerLabel = resolveDeathKillerLabel(killerPlayerId);
    const blockSpot = blockSpotRevive === true || blockSpotRevive === 1 || blockSpotRevive === '1';
    /** Пересоздаём браузер смерти как последний CEF — поверх HUD и всех окон. */
    try {
        if (reviver && mp.browsers.exists(reviver)) mp.browsers.destroy(reviver);
    } catch (_e0) {}
    reviver = null;
    ensureReviver();
    if (!reviver || !mp.browsers.exists(reviver)) return;
    reviver.active = true;
    try {
        reviverExec(
            `typeof stopDeathTimers==='function'&&stopDeathTimers();start(${Number.isFinite(vipLvl) ? vipLvl : 0},${JSON.stringify(killerLabel)},${blockSpot ? 'true' : 'false'})`
        );
    } catch (_e2) {}
    mp.gui.cursor.show(true, true);
    mp.gui.cursor.visible = true;
    try {
        reviverExec(
            `(function(){var m=document.getElementById('deathMenu');if(m)m.style.pointerEvents='auto';})();`
        );
    } catch (_ePe) {}
});

/** Курсор на смерти: true — кнопки респавна, false — осмотр камерой (Ё). */
global.setDeathMenuInteractable = function (interactable) {
    try {
        if (!reviver || !mp.browsers.exists(reviver) || !reviver.active) return;
        const pe = interactable ? 'auto' : 'none';
        reviverExec(
            `(function(){var m=document.getElementById('deathMenu');if(m)m.style.pointerEvents=${JSON.stringify(pe)};})();`
        );
    } catch (_e) {}
};

function deathUiStopCefTimers() {
    try {
        reviverExec(`typeof stopDeathTimers==='function'&&stopDeathTimers()`);
    } catch (_e) {}
}

mp.events.add('revive', (type) => {
    deathUiStopCefTimers();
    if (reviver && mp.browsers.exists(reviver)) reviver.active = false;
    mp.events.callRemote('revive', type);
    mp.gui.cursor.show(false, false);
    mp.gui.cursor.visible = false;
});

mp.events.add('reviveCancel', () => {
    deathUiStopCefTimers();
    if (reviver && mp.browsers.exists(reviver)) reviver.active = false;
    mp.gui.cursor.show(false, false);
    mp.gui.cursor.visible = false;
});


mp.events.add('armorplayern', (player) => {
    player.setArmour(0);
});

mp.events.add("freezePlayer", () => {
    mp.players.local.freezePosition(true);
});

mp.events.add("unfreezePlayer", () => {
    mp.players.local.freezePosition(false);
});

mp.events.add('invisible', () => {
    mp.players.local.setVariable('invisible', 255)
});

mp.events.add('noinvisible', () => {
    mp.players.local.setVariable('invisible', 0)
});

mp.events.add('buygun', (buygun) => {
    mp.events.callRemote('buygun:SERVER', (buygun));
});

mp.events.add('buygun10', (buygun) => {
    // Legacy CEF compatibility: Flow weapon shops sell one item per click.
    mp.events.callRemote('amunation:buy:SERVER', String(buygun || ''), 1);
});

mp.events.add('amunation:buy', (buygun, quantity) => {
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > 9999) return;
    mp.events.callRemote('amunation:buy:SERVER', String(buygun || ''), count);
});

mp.events.add('kablukBar:buy', (productId, quantity) => {
    const id = Number(productId);
    if (!Number.isInteger(id) || id < 0) return;
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1) return;
    if (new Date().getTime() - mp.players.local.clicked < 900) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('kablukBar:buy:SERVER', id, count);
});

mp.events.add('chaton', () => {
    // Нативный чат всегда выключен — только CEF
    try {
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
    } catch (_e) {}
    if (typeof global.openFlowChat === 'function') global.openFlowChat();
});

mp.events.add('chatoff', () => {
    try {
        mp.gui.chat.activate(false);
        mp.gui.chat.show(false);
    } catch (_e) {}
    if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
});

mp.events.add('chatofff', () => {
    try {
        mp.gui.chat.activate(false);
        mp.gui.chat.show(false);
    } catch (_e) {}
});

/* Замок авто: keybinds.js (vehicle_lock_key, по умолчанию L) */

/* Двигатель: бинд в keybinds.js (по умолчанию 2) */

mp.events.add('showNotification', (message) => {
    mp.game.graphics.notify(message);
});

mp.events.add('showNotificationGreen', (message) => {
    mp.game.graphics.notify(`~g~${message}`);
});

mp.game.invoke("0x6E9EF3A33C8899F8", true);

mp.events.add('snow', (toogle) => {
    mp.game.invoke("0x6E9EF3A33C8899F8", toogle);
    try { mp.game.graphics.setForceVehicleTrails(!!toogle); } catch (_e) {}
    try { mp.game.graphics.setForcePedFootstepsTracks(!!toogle); } catch (_e2) {}
});

mp.game.streaming.requestIpl("vw_casino_main");

let lastPressTime = 0;
let trevorkaTeleportPending = false;
const TREVORKA_ENTER = { x: 335.4120, y: -1403.5414, z: 32.5088 };

function isNearTrevorkaEnter() {
    try {
        const me = mp.players.local;
        if (!me) return false;
        if (me.getVariable('trevorc') === true || me.getVariable('trevorc') === 1) return true;
        const pos = me.position;
        if (!pos) return false;
        const dx = pos.x - TREVORKA_ENTER.x;
        const dy = pos.y - TREVORKA_ENTER.y;
        const dz = pos.z - TREVORKA_ENTER.z;
        return (dx * dx + dy * dy + dz * dz) <= (2.8 * 2.8);
    } catch (_e) {
        return false;
    }
}

function startTrevorkaTeleport() {
    if (trevorkaTeleportPending) return;
    trevorkaTeleportPending = true;
    try { mp.game.cam.doScreenFadeOut(300); } catch (_eF) {}
    setTimeout(() => {
        mp.events.callRemote('teleportPlayer', 'trevorka');
    }, 350);
    setTimeout(() => {
        if (trevorkaTeleportPending) {
            trevorkaTeleportPending = false;
            try { mp.game.cam.doScreenFadeIn(500); } catch (_eIn) {}
        }
    }, 8000);
}

global.bindGameplayKey(0x45, true, () => {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.getVariable('dead') === true) return;
    const currentTime = Date.now();
    if (currentTime - lastPressTime < 1000) return;
    if (isNearTrevorkaEnter()) {
        lastPressTime = currentTime;
        startTrevorkaTeleport();
        return;
    }
    if (mp.players.local.getVariable('currentWeaponColshape')) return;
    if (currentTime - lastPressTime >= 1000) {
        lastPressTime = currentTime;
        if (!mp.players.local.getVariable('gangwar')) return;
        if (mp.players.local.getVariable('castp') == true) {
            mp.events.callRemote('teleportPlayer', 'to');
        }
        if (mp.players.local.getVariable('casexit') == true) {
            mp.events.callRemote('teleportPlayer', 'exit');
        }
    }
});

mp.events.add('trevorka:teleport:done', () => {
    trevorkaTeleportPending = false;
    mp.game.cam.doScreenFadeIn(500);
});

mp.events.add("c:rotation", (player) => {
    mp.events.callRemote('s:rotation', player.getRotation(2))
});

mp.events.add('c:minimap', (toogle) => {
    if (toogle && typeof global.shouldForceHideMinimap === 'function' && global.shouldForceHideMinimap()) {
        mp.game.ui.displayRadar(false);
        return;
    }
    mp.game.ui.displayRadar(toogle);
});

const movementClipSet = "move_ped_crouched";
const strafeClipSet = "move_ped_crouched_strafing";
const clipSetSwitchTime = 0.25;

const loadClipSet = (clipSetName) => {
    mp.game.streaming.requestClipSet(clipSetName);
    while (!mp.game.streaming.hasClipSetLoaded(clipSetName)) mp.game.wait(0);
};

loadClipSet(movementClipSet);
loadClipSet(strafeClipSet);

mp.events.add("entityStreamIn", (entity) => {
    if (entity.type === "player" && entity.getVariable("isCrouched")) {
        entity.setMovementClipset(movementClipSet, clipSetSwitchTime);
        entity.setStrafeClipset(strafeClipSet);
    }
});

mp.events.addDataHandler("isCrouched", (entity, value) => {
    if (entity.type === "player") {
        if (value) {
            entity.setMovementClipset(movementClipSet, clipSetSwitchTime);
            entity.setStrafeClipset(strafeClipSet);
        } else {
            entity.resetMovementClipset(clipSetSwitchTime);
            entity.resetStrafeClipset();
        }
    }
});

/** Приседание: клавиша в keybinds.js (crouch_key), по умолчанию Ctrl */

mp.events.add('setWorldTime', (hours, minutes, seconds) => {
    mp.game.clock.setTime(hours, minutes, seconds);
});

const Natives = {
    SET_BLIP_CATEGORY: "0x234CDD44D996FD9A",
    SHOW_HEADING_INDICATOR_ON_BLIP: "0x5FBCA48327B914DF"
};

let isEffectActive = false;
let cooldowne = false;
let isAimingStarted = false;

mp.events.add("render", () => {
    let player = mp.players.local;
    let weapon = player.weapon;
    let isAiming = player.getConfigFlag(78, true);
    if (weapon === mp.game.joaat("weapon_heavysniper")) {
        if (isAiming && !isAimingStarted) {
            isAimingStarted = true;
        }
        if (isAiming && global.isGameplayKeyDown(69) && !cooldowne && isAimingStarted) {
            if (!isEffectActive) {
                mp.game.graphics.setNightvision(true);
                mp.game.graphics.setSeethrough(true);
                isEffectActive = true;
            }
        } else if (!isAiming || (isEffectActive && !global.isGameplayKeyDown(69))) {
            if (isEffectActive) {
                mp.game.graphics.setNightvision(false);
                mp.game.graphics.setSeethrough(false);
                isEffectActive = false;

                cooldowne = true;
                setTimeout(() => {
                    cooldowne = false;
                }, 3000);
            }
        }
    } else {
        if (isEffectActive) {
            mp.game.graphics.setNightvision(false);
            mp.game.graphics.setSeethrough(false);
            isEffectActive = false;
        }
        isAimingStarted = false;
    }
    if (!isAiming) {
        isAimingStarted = false;
    }
});

let CPED_CONFIG_FLAG_DisableStartEngine = 429;
mp.players.local.setConfigFlag(CPED_CONFIG_FLAG_DisableStartEngine, true);

mp.game.audio.setUserRadioControlEnabled(false);
mp.events.add('render', () => {
    if (mp.players.local.vehicle) {
        mp.game.audio.setRadioToStationName("OFF");
    }
});

let lastParachuteGive = 0;
setInterval(() => {
    const p = mp.players.local;
    if (!p) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (p.isTypingInTextChat) return;
    if (p.vehicle) return;
    if (p.getVariable('dead')) return;
    if (!p.getVariable('auth')) return;
    if (!p.getVariable('gangwar')) return;
    if (p.getVariable('targetmenu')) return;
    if (!p.isFalling()) return;
    const now = Date.now();
    if (now - lastParachuteGive < 1500) return;
    lastParachuteGive = now;
    mp.events.callRemote('giveParachute');
}, 500);

ml = [];

mp.events.add('jail', (player, ns) => {
    if (ns) {
        try { mp.events.call('closemenu'); } catch (_e) {}
        try { mp.events.call('spawnselect:cancel'); } catch (_e) {}
        try { if (typeof global.closePlayerMenu === 'function') global.closePlayerMenu(); } catch (_e) {}
        try { if (typeof global.tryCloseInventoryEsc === 'function') global.tryCloseInventoryEsc(); } catch (_e) {}
        try { if (typeof global.closePhone === 'function') global.closePhone(); } catch (_e) {}
        try { if (typeof global.hideGameplayCursor === 'function') global.hideGameplayCursor(); } catch (_e) {}
        try { mp.gui.cursor.show(false, false); } catch (_e) {}
    } else {
        ml.forEach(nx => {
            if (mp.peds.exists(nx)) {
                nx.destroy();
            }
        });
        ml = [];
    }
});

mp.events.add('showDemorgan', (reason, admin, seconds) => {
    try {
        const safeReason = String(reason || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const safeAdmin = String(admin || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        jailExec(`showDemorgan('${safeReason}', '${safeAdmin}', ${parseInt(seconds) || 0})`);
    } catch (_e) {}
});

mp.events.add('hideDemorgan', () => {
    jailExec('hideDemorgan()');
});

mp.events.add('syncDemorganTime', (seconds) => {
    jailExec(`syncTime(${parseInt(seconds) || 0})`);
});

mp.events.add('buyprefix:c', (prefix) => {
    mp.events.callRemote('buyprefix:s', prefix);
});

mp.events.add('gzShow2:CLIENT', (player) => {
    if (player.getVariable('fly') !== true) {
        player.setAlpha(128);
    }
});

mp.events.add('gzHide2:CLIENT', (player) => {
    if (player.getVariable('fly') !== true) {
        player.setAlpha(255);
    }
});

mp.events.add('startFlareEffect', (x, y, z) => {
    const effectAsset = 'core';
    const effectName = 'exp_grd_flare';

    mp.game.streaming.requestNamedPtfxAsset(effectAsset);

    let checkInterval = setInterval(() => {
        if (mp.game.streaming.hasNamedPtfxAssetLoaded(effectAsset)) {
            clearInterval(checkInterval);
            mp.game.graphics.setPtfxAssetNextCall(effectAsset);
            mp.game.graphics.startParticleFxLoopedAtCoord(effectName, x, y, z, 0, 0, 0, 1.0, false, false, false, false);
        }
    }, 100);
});

mp.events.add('changeFlareEffect', (x, y, z) => {
    mp.game.graphics.removeParticleFxFromEntity(mp.players.local.handle);
    mp.game.graphics.removeParticleFxInRange(0, 0, 0, 10000.0);

    const effectAsset = 'core';
    const effectName = 'proj_grenade_smoke';

    mp.game.streaming.requestNamedPtfxAsset(effectAsset);

    let checkInterval = setInterval(() => {
        if (mp.game.streaming.hasNamedPtfxAssetLoaded(effectAsset)) {
            clearInterval(checkInterval);
            mp.game.graphics.setPtfxAssetNextCall(effectAsset);
            mp.game.graphics.startParticleFxLoopedAtCoord(effectName, x, y, z, 0, 0, 0, 1.0, false, false, false, false);
        }
    }, 100);
});

mp.events.add('stopFlareEffect', () => {
    mp.game.graphics.removeParticleFxFromEntity(mp.players.local.handle);
    mp.game.graphics.removeParticleFxInRange(0, 0, 0, 10000.0);
});

let ped = mp.peds.new(
    mp.game.joaat('g_m_y_ballaeast_01'), 
    new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875),
    84.31329345703125,
    mp.players.local.dimension
);
let ballas = mp.peds.new(
    mp.game.joaat('mp_m_famdd_01'), 
    new mp.Vector3(-10.661846160888672, -1419.117919921875, 29.32600212097168),
    20.358104705810547,
    mp.players.local.dimension
);
let tbs = mp.peds.new(
    mp.game.joaat('a_m_m_afriamer_01'), 
    new mp.Vector3(924.4903564453125, -1565.514404296875, 30.686203002929688),
    86.51891326904297,
    mp.players.local.dimension
);
let vagos = mp.peds.new(
    mp.game.joaat('a_m_m_stlat_02'), 
    new mp.Vector3(844.349609375, -2332.449951171875, 30.334299087524414),
    178.06666564941406,
    mp.players.local.dimension
);  
let mg = mp.peds.new(
    mp.game.joaat('a_m_y_epsilon_02'), 
    new mp.Vector3(1384.0255126953125, -2074.406494140625, 51.998512268066406),
    36.107093811035156,
    mp.players.local.dimension
);
let fib = mp.peds.new(
    mp.game.joaat('mp_s_m_armoured_01'), 
    new mp.Vector3(435.4013977050781, -984.6724853515625, 30.689603805541992),
    -70.15937042236328,
    mp.players.local.dimension
);

const ghettoNpcHint = { font: 4, color: [255, 255, 255, 255], drawDistance: 20, outline: true, outlineColor: [0, 0, 0, 255] };
mp.labels.new('Магазин оружия (E)', new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875 + 1.05), ghettoNpcHint);
mp.labels.new('Магазин оружия (E)', new mp.Vector3(-10.661846160888672, -1419.117919921875, 29.32600212097168 + 1.05), ghettoNpcHint);
mp.labels.new('Магазин оружия (E)', new mp.Vector3(924.4903564453125, -1565.514404296875, 30.686203002929688 + 1.05), ghettoNpcHint);
mp.labels.new('Магазин оружия (E)', new mp.Vector3(844.349609375, -2332.449951171875, 30.334299087524414 + 1.05), ghettoNpcHint);
mp.labels.new('Магазин оружия (E)', new mp.Vector3(1384.0255126953125, -2074.406494140625, 51.998512268066406 + 1.05), ghettoNpcHint);

// mp.game.audio.startAlarm("PRISON_ALARMS", !0);
// mp.game.audio.startAlarm("PORT_OF_LS_HEIST_FORT_ZANCUDO_ALARMS", !0);


/* Свист и прочие бинды: keybinds.js */

/** Звук свиста. Новый аним — whistle_gta5rp.js (твой Desktop/index.js). */
function playWhistleEntitySound(handle, _variant) {
    if (!handle) return;
    mp.game.audio.playSoundFromEntity(1, 'Whistle', handle, 'DLC_TG_Running_Back_Sounds', false, 0);
}

mp.events.add('Whistle:CLIENT', (playerId, variant) => {
    const p = mp.players.atRemoteId(playerId);
    if (p && mp.players.exists(p) && p.handle !== 0) {
        playWhistleEntitySound(p.handle, variant === 'new' ? 'new' : 'old');
    }
});

mp.events.add('whistleVariantApply', (variant) => {
    try {
        const v = variant === 'new' ? 'new' : 'old';
        if (!mp.storage.data.settings) mp.storage.data.settings = {};
        mp.storage.data.settings.whistleVariant = v;
        mp.storage.flush();
        if (typeof global !== 'undefined') global.__whistleVariant = v;
    } catch (_e) {}
});

try {
    const _ws = mp.storage.data && mp.storage.data.settings;
    if (typeof global !== 'undefined') {
        global.__whistleVariant = _ws && _ws.whistleVariant === 'new' ? 'new' : 'old';
    }
} catch (_e2) {}

/** Фиксированная клавиша (не в F3): 0 — убрать оружие. Броня и аптечка — через инвентарь / хоткеи слотов сетки. */
const OTHER_FIXED_HOLSTER_GAP_MS = 1000;
let _otherHolsterLastMs = 0;
function otherTakeHolsterDebounce() {
    const now = Date.now();
    if (now - _otherHolsterLastMs < OTHER_FIXED_HOLSTER_GAP_MS) return false;
    _otherHolsterLastMs = now;
    return true;
}

global.bindGameplayKey(0x30, true, () => {
    if (typeof global.isTextOrMenuBlockingGameplayKeys === 'function' && global.isTextOrMenuBlockingGameplayKeys()) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    const pl = mp.players.local;
    if (pl.getVariable('dead') === true) return;
    if (pl.getVariable('famcreate') === true) return;
    if (pl.getVariable('familymenu')) return;
    if (pl.getVariable('casmenu') === true) return;
    if (pl.getVariable('amenu')) return;
    if (pl.getVariable('blackmenu')) return;
    if (pl.getVariable('animsmenu')) return;
    if (pl.getVariable('shopc')) return;
    if (!pl.getVariable('auth')) return;
    if (!otherTakeHolsterDebounce()) return;
    mp.events.callRemote('setvariableslot', 3);
});

/** Двигатель не заводится сам при посадке — только по клавише (сервер engineState + B/2). */
function vehicleEngineShouldRun(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return false;
    try {
        if (typeof global.isSkateVehicle === 'function' && global.isSkateVehicle(veh)) return true;
    } catch (_e0) {}
    try {
        if (veh.getVariable('skateOwner') != null) return true;
    } catch (_e) {}
    try {
        if (veh.getVariable('skateRide') === true) return true;
    } catch (_eSk) {}
    try {
        return veh.getVariable('engineState') === true;
    } catch (_e2) {
        return false;
    }
}

function applyVehicleEngineFromState(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return;
    const on = vehicleEngineShouldRun(veh);
    try {
        veh.setEngineOn(on, true, !on);
    } catch (_e) {}
}

function isLocalVehicleDriver() {
    const lp = mp.players.local;
    if (!lp || !lp.vehicle) return false;
    try {
        return lp.vehicle.getPedInSeat(-1) === lp.handle;
    } catch (_e) {
        return lp.seat === 0 || lp.seat === -1;
    }
}

function scheduleVehicleEngineApply(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return;
    applyVehicleEngineFromState(veh);
    [50, 150, 350, 700].forEach((ms) => {
        setTimeout(() => {
            try {
                if (mp.vehicles.exists(veh)) applyVehicleEngineFromState(veh);
            } catch (_e) {}
        }, ms);
    });
}

mp.events.add('playerEnterVehicle', (vehicle, seat) => {
    if (seat !== 0 && seat !== -1) return;
    scheduleVehicleEngineApply(vehicle);
});

mp.events.addDataHandler('engineState', (entity, value) => {
    if (!entity || entity.type !== 'vehicle') return;
    const lp = mp.players.local;
    if (!lp.vehicle || lp.vehicle !== entity) return;
    if (!isLocalVehicleDriver()) return;
    applyVehicleEngineFromState(entity);
});

mp.events.add('render', () => {
    if (!isLocalVehicleDriver()) return;
    const veh = mp.players.local.vehicle;
    if (!veh || !mp.vehicles.exists(veh)) return;
    const shouldRun = vehicleEngineShouldRun(veh);
    let running = false;
    try {
        running = veh.getIsEngineRunning();
    } catch (_e) {
        return;
    }
    if (shouldRun && !running) {
        applyVehicleEngineFromState(veh);
    } else if (!shouldRun && running) {
        applyVehicleEngineFromState(veh);
    }
});
