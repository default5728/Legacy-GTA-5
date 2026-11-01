let ped = mp.peds.new(
    mp.game.joaat('ig_fbisuit_01'),
    new mp.Vector3(-121.23036193847656, -615.6834106445312, 36.28070068359375),
    -109.7210693359375,
    0
);
let shapeCreateFamStatus = false
mp.events.add('enterCreateSHAPE_CLIENT', () => {
    shapeCreateFamStatus = true
})
mp.events.add('exitCreateSHAPE_CLIENT', () => {
    shapeCreateFamStatus = false
    famMenuCreate.active = false;
    mp.gui.cursor.visible = false;
    mp.gui.chat.activate(false);
    mp.events.callRemote('famcreatev', false);
    try { mp.events.callRemote('showHud:SERVER'); } catch (_e) {}
    if (typeof global.syncWorldChromeFromStoredSettings === 'function') global.syncWorldChromeFromStoredSettings();
})
let family = null;

function famLegacyExec(_code) {}

let captHud = mp.browsers.new("package://browsers/family_capt/index.html");
captHud.active = false


let famMenuCreate = mp.browsers.new("package://browsers/family/createnew/index.html?v=3");
famMenuCreate.active = false

if (typeof global.registerActiveBrowserOverlay === 'function') {
    global.registerActiveBrowserOverlay(() => famMenuCreate);
}

function playerHasFamily() {
    const fam = mp.players.local.getVariable('family');
    return fam != null && String(fam).trim() !== '';
}

global.updateFractionMenuUi = function (fraction) {};

global.bindGameplayKey(0x45, true, function() {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (mp.players.local.getVariable('casmenu') === true) return;
    if (mp.players.local.getVariable('amenu') === true) return;
    if (mp.players.local.getVariable('blackmenu') === true) return;
    if (mp.players.local.getVariable('animsmenu') === true) return;
    if (mp.players.local.getVariable('shopc') === true) return;
    if (mp.players.local.getVariable('f3key') === true) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (shapeCreateFamStatus && famMenuCreate.active === false) {
        if (mp.players.local.getVariable('family')) return mp.events.call('notify:client', 2, "top-mid", "Вы состоите в семье.", 2000);
        famMenuCreate.active = true;
        mp.gui.cursor.visible = true
        mp.gui.chat.activate(false);
        mp.events.call('hud', false);
        mp.events.call('c:minimap', false);
        mp.events.callRemote('famcreatev', true);
    }
});

mp.events.add('fam:closecreate', () => {
    famMenuCreate.active = false;
    mp.gui.cursor.visible = false;
    mp.gui.chat.activate(false);
    mp.events.callRemote('famcreatev', false);
    try { mp.events.callRemote('showHud:SERVER'); } catch (_e) {}
    if (typeof global.syncWorldChromeFromStoredSettings === 'function') global.syncWorldChromeFromStoredSettings();
});

mp.events.add('fam:create:c', (famname, typebuy) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();

    mp.events.callRemote('fam:create:s', famname, typebuy);
});

function openFamilyMainMenu(force) {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (mp.players.local.getVariable('casmenu') === true) return;
    if (!force) {
        if (mp.players.local.getVariable('amenu') === true) return;
        if (mp.players.local.getVariable('f3key') === true) return;
    }
    if (mp.players.local.getVariable('blackmenu') === true) return;
    if (mp.players.local.getVariable('animsmenu') === true) return;
    if (mp.players.local.getVariable('shopc') === true) return;
    if (mp.players.local.getVariable('phone') === true) return;
    if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return;
    if (mp.players.local.getVariable('invkey') === true) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (!playerHasFamily()) {
        mp.events.call('notify:client', 2, 'top-mid', 'Вы не состоите в семье.', 3500);
        return;
    }
    if (typeof global.isFamilyTabletOpen === 'function' && global.isFamilyTabletOpen()) {
        mp.events.call('fam:close');
        return;
    }
    mp.events.callRemote('family:tablet:open:s');
}

mp.events.add('family:openMainMenu', (force) => openFamilyMainMenu(force === true));
mp.events.add('openFamilyMenu', () => openFamilyMainMenu(true));
mp.events.add('CloseFamilyMenu', () => {
    if (typeof global.isFamilyTabletOpen === 'function' && global.isFamilyTabletOpen()) {
        mp.events.call('fam:close');
    }
});

mp.events.add('family:close', () => {
    if (typeof global.isFamilyTabletOpen === 'function' && global.isFamilyTabletOpen()) {
        mp.events.call('fam:close');
        return;
    }
    mp.gui.cursor.visible = false;
    mp.gui.chat.activate(false);
    mp.events.callRemote('family:v', false);
    if (typeof global.setWorldUiUnlocked === 'function') global.setWorldUiUnlocked(true);
    if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
    else {
        try { mp.events.callRemote('showHud:SERVER'); } catch (_e) {}
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') global.syncWorldChromeFromStoredSettings();
    }
})
mp.events.add('family:adv:buy:c', (num) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();
    
    mp.events.callRemote('family:adv:buy:s', num);
});
function familyCefLiteral(value) {
    return JSON.stringify(String(value == null ? '' : value))
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

mp.events.add('family:cef:loadinfo', (name, date) => {
    famLegacyExec(`FamilyMenu.setInfo(${familyCefLiteral(name)}, ${familyCefLiteral(date)});`)
});
mp.events.add('family:loadplayers:c', (playerInfo) => {
    if (!Array.isArray(playerInfo)) return;
    famLegacyExec('FamilyMenu.clearUsersList();');
    playerInfo.forEach(user => {
        const litLogin = JSON.stringify(String(user.login || ''));
        const litTag = JSON.stringify(String(user.tag || ''));
        const litRl = JSON.stringify(String(user.rankLabel != null ? user.rankLabel : ('Ранг ' + user.rank)));
        const litEx = JSON.stringify(String(user.rankExtrasJson != null ? user.rankExtrasJson : '[]'));
        famLegacyExec(`FamilyMenu.addUser(${user.staticID}, ${litLogin}, ${user.rank}, ${user.leader}, ${litTag}, ${litRl}, ${litEx});`);
    });
});
mp.events.add('family:cef:setrank', (rank) => {
    famLegacyExec(`FamilyMenu.setRank(${Number(rank)});`)
});
mp.events.add('family:addplayer:c', (static, login, rank, leader, tag, rankLabel, rankExtrasJson) => {
    const litLogin = JSON.stringify(String(login || ''));
    const litTag = JSON.stringify(String(tag || ''));
    const litRl = JSON.stringify(String(rankLabel != null ? rankLabel : ('Ранг ' + rank)));
    const litEx = JSON.stringify(String(rankExtrasJson != null ? rankExtrasJson : '[]'));
    famLegacyExec(`FamilyMenu.addUser(${static}, ${litLogin}, ${rank}, ${leader}, ${litTag}, ${litRl}, ${litEx});`);
});
mp.events.add('family:changerank:c', (static, rank, extrasJson) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();

    mp.events.callRemote('family:changerank:s', static, rank, extrasJson == null ? '[]' : String(extrasJson));
});
mp.events.add('family:rank:load:c', (json) => {
    famLegacyExec(`FamilyMenu.setRankManagement('${json}');`)
});
mp.events.add('family:rank:save:c', (json, rank) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();

    mp.events.callRemote('family:rank:save:s', json, rank);
});
mp.events.add('family:cef:changerank', (static, rank) => {
    famLegacyExec(`FamilyMenu.FamilySetTargetNewRank(${static}, ${rank})`);
});
mp.events.add('family:kick:c', (static) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();

    mp.events.callRemote('family:kick:s', static)
})
mp.events.add('family:cef:kick', (static) => {
    famLegacyExec(`FamilyMenu.FamilyKickTarget(${static})`);
});
mp.events.add('family:cef:clear', () => {
    famLegacyExec(`FamilyMenu.clear();`);
});

mp.events.add('family:fleet:sync:c', (plate, idx, leaderRaw, vehiclesJson) => {
    try {
        if (!family) return;
        const can = Number(leaderRaw) === 1;
        const j = JSON.stringify(String(plate == null ? '' : plate));
        const n = Number(idx);
        const vEsc = JSON.stringify(vehiclesJson != null ? String(vehiclesJson) : '[]');
        famLegacyExec(`FamilyMenu.applyFleetUi(${j}, ${Number.isFinite(n) ? n : 0}, ${can ? 'true' : 'false'}, ${vEsc});`);
    } catch (_e) {}
});

mp.events.add('family:fleet:tab:open', () => {
    if (!playerHasFamily()) return;
    mp.events.callRemote('family:fleet:pull:s');
});

mp.events.add('family:fleet:ui:save', (plate, idx) => {
    mp.events.callRemote('family:fleet:save:s', plate == null ? '' : String(plate), idx == null ? '0' : String(idx));
});

mp.events.add('family:fleet:ui:saveSlot', (slot, colorIdx, ranksJson) => {
    if (new Date().getTime() - mp.players.local.clicked < 800) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote(
        'family:fleet:saveSlot:s',
        String(slot == null ? '0' : slot),
        String(colorIdx == null ? '0' : colorIdx),
        ranksJson == null ? '[]' : String(ranksJson)
    );
});

mp.events.add('family:fleet:ui:evac', (slot) => {
    if (new Date().getTime() - mp.players.local.clicked < 800) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:fleet:evac:s', String(slot == null ? '0' : slot));
});

mp.events.add('family:fleet:ui:summon', (slot) => {
    if (new Date().getTime() - mp.players.local.clicked < 800) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:fleet:summon:s', String(slot == null ? '0' : slot));
});

mp.events.add('family:invite:c', (static) => {
    const sid = String(static == null ? '' : static).trim().replace(/[^\d]/g, '');
    if (!sid || parseInt(sid, 10) < 1) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Введите статик.', 3000);
    }
    mp.events.callRemote('family:invite:s', sid);
});

mp.events.add('family:leave:c', () => {
    mp.events.callRemote('family:leave:s');
});

const OFFICE_INTERIOR_EXIT = { x: -141.1987, y: -620.913, z: 168.8205 };
let shapeOfficeEnter = false;
let arcadiusTeleportPending = false;

function beginArcadiusOfficeTeleport(remoteEvent) {
    if (arcadiusTeleportPending) return false;
    arcadiusTeleportPending = true;
    mp.game.cam.doScreenFadeOut(300);
    setTimeout(() => {
        mp.events.callRemote(remoteEvent);
    }, 350);
    setTimeout(() => {
        if (arcadiusTeleportPending) {
            arcadiusTeleportPending = false;
            mp.game.cam.doScreenFadeIn(500);
        }
    }, 8000);
    return true;
}

mp.events.add('arcadius:teleport:done', () => {
    arcadiusTeleportPending = false;
    mp.game.cam.doScreenFadeIn(500);
});

mp.events.add('enterOfficeSHAPE_CLIENT', () => {
    shapeOfficeEnter = true;
});
mp.events.add('exitOfficeSHAPE_CLIENT', () => {
    shapeOfficeEnter = false;
});

let shapeOfficeExit = null;
let officeExitMarker = null;

mp.events.add('shapeExitCreate_CLIENT', () => {
    try {
        if (shapeOfficeExit) shapeOfficeExit.destroy();
        if (officeExitMarker) officeExitMarker.destroy();
    } catch (_e) {}
    const dim = mp.players.local.dimension;
    shapeOfficeExit = mp.colshapes.newSphere(OFFICE_INTERIOR_EXIT.x, OFFICE_INTERIOR_EXIT.y, OFFICE_INTERIOR_EXIT.z, 2.15, dim);
    officeExitMarker = mp.markers.new(1, new mp.Vector3(OFFICE_INTERIOR_EXIT.x, OFFICE_INTERIOR_EXIT.y, OFFICE_INTERIOR_EXIT.z - 1.0), 1.0, {
        color: [70, 140, 235, 200],
        dimension: dim
    });
});

let OfficeExitShape = false;
mp.events.add('playerEnterColshape', (shape) => {
    if (shape === shapeOfficeExit) OfficeExitShape = true;
});
mp.events.add('playerExitColshape', (shape) => {
    if (shape === shapeOfficeExit) OfficeExitShape = false;
});

global.bindGameplayKey(0x45, true, function() {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (mp.players.local.getVariable('casmenu') === true) return;
    if (mp.players.local.getVariable('amenu') === true) return;
    if (mp.players.local.getVariable('blackmenu') === true) return;
    if (mp.players.local.getVariable('animsmenu') === true) return;
    if (mp.players.local.getVariable('shopc') === true) return;
    if (mp.players.local.getVariable('f3key') === true) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (shapeOfficeEnter === true) {
        beginArcadiusOfficeTeleport('officeHandler_SERVER');
        return;
    }
    if (OfficeExitShape === true) {
        beginArcadiusOfficeTeleport('officeHandlerExit_SERVER');
    }
});

acceptmenu = mp.browsers.new('package://browsers/family/invite/index.html');
acceptmenu.active = false;

/** Приглашение в семью — Y/N через interaction_offer.js + уведомление (как target menu). */
mp.events.add('showaccept', () => {});

mp.events.add('hideaccept', () => {
    mp.events.call('interactionOfferClear');
});

mp.events.add('otvetfam', (otvet) => {
    mp.events.callRemote('otvetfam:server', otvet);
});

mp.events.add('family:capts:load:c', (level, name, points, currentPoints, nextPoints, kills, deaths, territories) => {
    famLegacyExec(`FamilyMenu.setCaptsInfo(${level}, ${familyCefLiteral(name)}, ${points}, ${currentPoints}, ${nextPoints}, ${kills}, ${deaths}, ${territories || 0});`);
});

mp.events.add('family:capts:limits:c', (attacks, defenses, timeAllowed) => {
    famLegacyExec(`FamilyMenu.setCaptsLimits(${attacks}, ${defenses}, ${timeAllowed});`);
});

mp.events.add('family:rating:load:c', (dataJson) => {
    famLegacyExec(`FamilyMenu.setRatingList(${JSON.stringify(dataJson)});`);
});

mp.events.add('family:capts:request', () => {
    mp.events.callRemote('family:capts:load:s');
    mp.events.callRemote('family:points:load:s');
});

mp.events.add('family:rating:request', () => {
    mp.events.callRemote('family:rating:load:s');
});

// Система точек
mp.events.add('family:capt:formatLimits:request', (pointId) => {
    mp.events.callRemote('family:capt:formatLimits:s', pointId || 0);
});

mp.events.add('family:capt:formatLimits:c', (json) => {
    const s = typeof json === 'string' ? json : JSON.stringify(json);
    famLegacyExec(`FamilyMenu.setCaptFormatLimits(${JSON.stringify(s)});`);
});

mp.events.add('family:attack:territory', (format, weapon, pointId, gangId, optsJson) => {
    const captWeaponKeys = ['carbine', 'revolver', 'specialcarbine', 'minismg'];
    let opts = {};
    try {
        opts = JSON.parse(typeof optsJson === 'string' && optsJson.length ? optsJson : '{}');
    } catch (e) {
        opts = {};
    }
    const slots = [weapon, opts.weapon2, opts.weapon3];
    const hasAny = slots.some((w) => captWeaponKeys.includes(w));
    if (!hasAny) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Выберите хотя бы одно оружие в слотах.', 3500);
    }
    mp.events.callRemote('family:attack:s', format, weapon, pointId || 0, gangId || 1, typeof optsJson === 'string' ? optsJson : '{}');
});
mp.events.add('family:attack:started', () => {
    mp.events.call('family:capts:request');
});

mp.events.add('family:teleport:capt', (pointId) => {
    mp.events.callRemote('family:teleport:s', pointId);
});

mp.events.add('family:points:load:c', (pointsJson) => {
    const s = typeof pointsJson === 'string' ? pointsJson : JSON.stringify(pointsJson);
    famLegacyExec(`FamilyMenu.setServerPoints(${JSON.stringify(s)});`);
});

mp.events.add('family:point:patch:c', (payload) => {
    let d;
    try {
        d = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (e) {
        return;
    }
    const id = Number(d.id);
    const ownerLit = JSON.stringify(d.owner == null ? null : String(d.owner));
    const capLit = d.capturedAt == null ? 'null' : JSON.stringify(String(d.capturedAt));
    famLegacyExec(`FamilyMenu.updatePoint(${id}, ${ownerLit}, ${!!d.underAttack}, ${capLit});`);
});

mp.events.add('family:point:update:c', (pointId, owner, underAttack) => {
    const id = Number(pointId);
    const ownerLit = JSON.stringify(owner == null || owner === '' ? null : String(owner));
    famLegacyExec(`FamilyMenu.updatePoint(${id}, ${ownerLit}, ${!!underAttack});`);
});

mp.events.add('captBattle:joined', () => {
    // Без freezePosition — падение с высоты; верхняя панель и слоты — в hud.js
});

mp.events.add('captBattle:hide', () => {
    mp.players.local.freezePosition(false);
});

mp.events.add('captBattle:unfreeze', () => {
    mp.players.local.freezePosition(false);
});

global.tryCloseFamilyEsc = function() {
    if (famMenuCreate && famMenuCreate.active) {
        mp.events.call('fam:closecreate');
        return true;
    }
    if (typeof global.tryCloseFamilyTabletEsc === 'function' && global.tryCloseFamilyTabletEsc()) {
        return true;
    }
    return false;
};
