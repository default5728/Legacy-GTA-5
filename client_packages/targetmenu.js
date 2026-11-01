const localPlayer = mp.players.local;

targetMenu = mp.browsers.new("package://browsers/targetmenu/index.html");
targetMenu.active = false;
tradeBrowser = mp.browsers.new("package://browsers/trade/index.html?v=2");
tradeBrowser.active = false;

/**
 * Информация о взаимодействии с entity
 */
const KEY_INFO = {
    VIRTUAL_KEY: 0x47,
    KEY_TITLE: "G"
}

/**
 * Настройки отображения текста (шрифт как у nametags — font 4)
 */
const DRAWABLE_TEXT_OPTIONS = {
    font: 4,
    color: [220, 220, 220, 255],
    scale: [0.38, 0.38],
    outline: true,
    centre: true
}

/** Локальный оффсет центра модели (min+max)/2 — кэш по hash, чтобы G не прыгала. */
const vehicleHintCenterOff = Object.create(null);

function readModelMinMax(model) {
    try {
        const dim = mp.game.gameplay.getModelDimensions(model);
        if (dim) {
            const min = dim.min || dim[0];
            const max = dim.max || dim[1];
            if (min && max && min.x != null && max.x != null) return { min, max };
        }
    } catch (_e) {}
    try {
        const min = new mp.Vector3(0, 0, 0);
        const max = new mp.Vector3(0, 0, 0);
        mp.game.gameplay.getModelDimensions(model, min, max);
        if (min && max && (min.x !== 0 || max.x !== 0 || min.z !== 0 || max.z !== 0)) {
            return { min, max };
        }
    } catch (_e2) {}
    return null;
}

function getVehicleHintWorldPos(veh) {
    const model = veh.model;
    let off = vehicleHintCenterOff[model];
    if (!off) {
        const mm = readModelMinMax(model);
        if (mm) {
            off = {
                x: (Number(mm.min.x) + Number(mm.max.x)) * 0.5,
                y: (Number(mm.min.y) + Number(mm.max.y)) * 0.5,
                z: (Number(mm.min.z) + Number(mm.max.z)) * 0.5
            };
        } else {
            off = { x: 0, y: 0, z: 0 };
        }
        vehicleHintCenterOff[model] = off;
    }
    try {
        return veh.getOffsetFromInWorldCoords(off.x, off.y, off.z);
    } catch (_e2) {
        return veh.getCoords(true);
    }
}

let entity;
/** static цели target-меню (CEF mp.trigger часто теряет 2-й аргумент). */
let targetMenuTargetStatic = null;
let targetVehicleRemoteId = null;
let targetVehicleAltId = null;
let targetHintEnabled = true;

try {
    const s = mp.storage.data && mp.storage.data.settings;
    if (s) targetHintEnabled = s.target_hint !== false;
} catch (_eInit) {}

mp.events.add('targetHintSetting', (value) => { targetHintEnabled = !!value; });

global.CloseTarget = () => {
    targetMenuTargetStatic = null;
    targetVehicleRemoteId = null;
    targetVehicleAltId = null;
    try {
        if (mp.browsers.exists(targetMenu)) {
            targetMenu.execute(`targetMenu.shutdownUi();`);
        }
    } catch (_e) {}
    setTimeout(()=>{if(!mp.players.local.getVariable('targetmenu'))targetMenu.active=false;},270);
    mp.gui.cursor.visible = false;
    mp.events.callRemote('target:variable', false);
};

mp.events.add('target:pair:c', (kindRaw) => {
    if (!mp.players.local.clicked) mp.players.local.clicked = 0;
    if (new Date().getTime() - mp.players.local.clicked < 800) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();

    const kind = String(kindRaw || '').trim();
    if (kind !== 'handshake') {
        return mp.events.call('notify:client', 2, 'top-mid', 'Некорректное действие.', 2500);
    }
    const targetStatic = targetMenuTargetStatic != null ? targetMenuTargetStatic : mp.players.local._tgtPairStatic;
    if (targetStatic == null || targetStatic === '') {
        return mp.events.call('notify:client', 2, 'top-mid', 'Цель не выбрана. Откройте меню заново (G).', 3000);
    }
    mp.events.callRemote('target:pair:s', targetStatic, kind);
});

mp.events.add('target:transfer:c', (static, send) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();

    mp.events.callRemote('target:transfer:s', static, send);
});

mp.events.add('target:kost:c', (static, send) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();

    mp.events.callRemote('target:kost:s', static, send);
});

mp.events.add('target:coburaSell:c', (targetStatic, coburaId, price) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('target:coburaSell:s', targetStatic, coburaId, price);
});

mp.events.add('target:coburaSellMode', (coburaId, coburaName) => {
    if (targetMenu && mp.browsers.exists(targetMenu)) {
        targetMenu.execute(`targetMenu.showCoburaSell('${coburaId}', '${coburaName.replace(/'/g, "\\'")}');`);
    }
});

mp.events.add('target:canInviteFraction', (flag) => {
    if (targetMenu && mp.browsers.exists(targetMenu)) {
        targetMenu.execute(`targetMenu.setFractionInviteAvailable(${flag ? 'true' : 'false'});`);
    }
});

mp.events.add('target:fractionInvite:c', (targetStatic) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('fraction:invite:s', targetStatic);
});

mp.events.add('target:close', () => {
    global.CloseTarget();
});

mp.events.add('target:vehicle:open:c', (vehRemoteId, vehName, locked, canSell, sellPrice, hasTrunk) => {
    if (!targetMenu || !mp.browsers.exists(targetMenu)) return;
    const escName = JSON.stringify(String(vehName || 'Транспорт'));
    targetMenu.execute(
        `targetMenu.applyVehicleMenuState(${Number(vehRemoteId)}, ${escName}, ${locked ? 1 : 0}, ${canSell ? 1 : 0}, ${Number(sellPrice) || 0}, ${hasTrunk ? 1 : 0});`
    );
});

mp.events.add('target:vehicle:lock:c', (locked) => {
    if (targetMenu && mp.browsers.exists(targetMenu)) {
        targetMenu.execute(`targetMenu.setVehicleLocked(${locked ? 1 : 0});`);
    }
});

mp.events.add('target:vehicle:sell:c', (model, priceFmt) => {
    if (targetMenu && mp.browsers.exists(targetMenu)) {
        const m = JSON.stringify(String(model || ''));
        const p = JSON.stringify(String(priceFmt || ''));
        targetMenu.execute(`targetMenu.openVehicleSellConfirm(${m}, ${p});`);
    }
});

mp.events.add('target:vehicle:sell:done:c', () => {
    global.CloseTarget();
});

mp.events.add('target:vehicle:action:c', (action) => {
    const rid = targetVehicleRemoteId;
    const alt = targetVehicleAltId;
    if (rid == null) return;
    const kind = String(action || '').trim();
    if (kind === 'tuning') {
        mp.events.callRemote('legacy:vehicle:tuning:open', rid);
    } else if (kind === 'plates') {
        global.CloseTarget();
        mp.events.callRemote('server:plates:choose', rid);
    } else if (kind === 'lock') {
        mp.events.callRemote('target:vehicle:lock:s', rid, alt);
        global.CloseTarget();
    } else if (kind === 'trunk') {
        global.CloseTarget();
        mp.events.callRemote('vehicle:trunk:open:s', rid, alt);
    } else if (kind === 'sit') {
        global.CloseTarget();
        mp.events.callRemote('target:vehicle:sit:s', rid, alt);
    } else if (kind === 'sell') mp.events.callRemote('target:vehicle:sell:s', rid, alt);
    else if (kind === 'sellYes') mp.events.callRemote('target:vehicle:sell:yes:s', rid, alt);
});

function resolveTargetVehicleByNetId(remoteId, altId) {
    const tryIds = [];
    const a = parseInt(String(remoteId), 10);
    const b = parseInt(String(altId), 10);
    if (Number.isFinite(a) && a >= 0) tryIds.push(a);
    if (Number.isFinite(b) && b >= 0 && tryIds.indexOf(b) === -1) tryIds.push(b);
    for (let i = 0; i < tryIds.length; i++) {
        const id = tryIds[i];
        try {
            if (typeof mp.vehicles.atRemoteId === 'function') {
                const v = mp.vehicles.atRemoteId(id);
                if (v && mp.vehicles.exists(v)) return v;
            }
        } catch (_e) {}
    }
    let found = null;
    try {
        mp.vehicles.forEach((v) => {
            if (found || !v || !mp.vehicles.exists(v)) return;
            if (tryIds.indexOf(v.remoteId) !== -1 || tryIds.indexOf(v.id) !== -1) found = v;
        });
    } catch (_e2) {}
    return found;
}

function enterVehicleFreeSeat(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return false;
    const ped = mp.players.local.handle;
    const handle = veh.handle;
    if (!handle) return false;
    const seats = [-1, 0, 1, 2, 3, 4, 5, 6, 7];
    for (let i = 0; i < seats.length; i++) {
        const seat = seats[i];
        try {
            if (typeof veh.isSeatFree === 'function' && !veh.isSeatFree(seat)) continue;
        } catch (_e) {}
        try {
            mp.game.task.enterVehicle(ped, handle, 5000, seat, 2.0, 1, 0);
            return true;
        } catch (_e2) {}
    }
    return false;
}

mp.events.add('target:vehicle:sit:c', (vehRemoteId, vehAltId) => {
    if (mp.players.local.vehicle) return;
    const veh = resolveTargetVehicleByNetId(vehRemoteId, vehAltId);
    if (!veh) {
        mp.events.call('notify:client', 2, 'top-mid', 'Транспорт не найден.', 3000);
        return;
    }
    if (!enterVehicleFreeSeat(veh)) {
        mp.events.call('notify:client', 2, 'top-mid', 'Нет свободных мест.', 3000);
    }
});

mp.events.add('trade:start:c', (targetStatic) => {
    if (new Date().getTime() - mp.players.local.clicked < 800) return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    mp.players.local.clicked = new Date().getTime();
    const sid = parseInt(targetStatic, 10);
    if (isNaN(sid)) return mp.events.call('notify:client', 2, 'top-mid', 'Некорректная цель обмена.', 2500);
    mp.events.callRemote('trade:start:s', sid);
});

mp.events.add('trade:addItem:c', (item) => {
    if (new Date().getTime() - mp.players.local.clicked < 200) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('trade:addItem:s', item);
});

mp.events.add('trade:addStack:c', (base, qty) => {
    if (new Date().getTime() - mp.players.local.clicked < 200) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('trade:addStack:s', base, qty);
});

mp.events.add('trade:removeItem:c', (idx) => {
    mp.events.callRemote('trade:removeItem:s', idx);
});

mp.events.add('trade:removeStack:c', (base, qty) => {
    mp.events.callRemote('trade:removeStack:s', base, qty);
});

mp.events.add('trade:setMoney:c', (amount) => {
    mp.events.callRemote('trade:setMoney:s', amount);
});

mp.events.add('trade:ready:c', (ready) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('trade:ready:s', !!ready);
});

mp.events.add('trade:cancel:c', () => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('trade:cancel:s');
});

mp.events.add('trade:addMansion:c', () => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('trade:addFamilyMansion:s');
});

function tradeExec(js) {
    try {
        if (mp.browsers.exists(tradeBrowser)) tradeBrowser.execute(js);
    } catch (_e) {}
}

mp.events.add('trade:open', (partnerLogin, partnerStatic, invJson) => {
    const invEsc = JSON.stringify(invJson == null ? '[]' : String(invJson));
    const loginEsc = JSON.stringify(String(partnerLogin || ''));
    tradeExec(`beginTrade(${loginEsc}, ${Number(partnerStatic)}, ${invEsc});`);
    if (mp.browsers.exists(targetMenu)) {
        targetMenu.execute(`targetMenu.shutdownUi();`);
        targetMenu.active = false;
    }
    tradeBrowser.active = true;
    mp.gui.cursor.visible = true;
    mp.events.callRemote('target:variable', true);
});

mp.events.add('trade:sync', (jsonStr) => {
    const esc = JSON.stringify(String(jsonStr || '{}'));
    tradeExec(`applyTradeSync(${esc});`);
});

mp.events.add('trade:close', () => {
    tradeExec(`resetTradeUi();`);
    if (mp.browsers.exists(tradeBrowser)) tradeBrowser.active = false;
    mp.gui.cursor.visible = false;
    mp.events.callRemote('target:variable', false);
});

setInterval(() => {
    if (localPlayer.isDead()) return entity = null;
    if (localPlayer.vehicle) return entity = localPlayer.vehicle;

    entity = getLookingEntity(["ped", "object"]);
}, 100);

function getLookingEntity(ignoredEntityTypes = []) {
    const resolution = mp.game.graphics.getScreenActiveResolution(1, 1);

    const startPosition = localPlayer.getBoneCoords(12844, 0.5, 0, 0);
    const secondPosition = mp.game.graphics.screen2dToWorld3d([resolution.x / 2, resolution.y / 2, (2 | 4 | 8)]);
    if (secondPosition == undefined) return null;

    startPosition.z -= 0.3;
    const result = mp.raycasting.testPointToPoint(startPosition, secondPosition, localPlayer, (2 | 4 | 8 | 16));

    if (typeof result == "undefined" || !result.entity || !result.entity.handle || ignoredEntityTypes.includes(result.entity.type))
        return null;

    const entityPosition = result.entity.getCoords(true);
    const playerPosition = localPlayer.getCoords(true);

    if (mp.game.gameplay.getDistanceBetweenCoords(entityPosition.x, entityPosition.y, entityPosition.z, playerPosition.x, playerPosition.y, playerPosition.z, true) > 4)
        return null;

    return result.entity;
}

function interfaceEmit(emitCode) {
    if (!mp.browsers.exists(targetMenu)) return;

    targetMenu.execute(`targetMenu.setUiVisible(true); targetMenu.resetPanelHub(); ${emitCode}`);
    targetMenu.active = true;
    mp.events.callRemote('target:variable', true);
}

function isTargetInteractionBlocked() {
    try {
        const pl = mp.players.local;
        if (pl.getVariable('inCapt') === true) return true;
        if (pl.getVariable('inBizwar') === true) return true;
    } catch (_e) {}
    return false;
}

global.bindGameplayKey(KEY_INFO.VIRTUAL_KEY, true, function () {
    if (mp.game.ui.isPauseMenuActive() || !global.isPlayerSpawned) return;
    if (!mp.players.local.getVariable('auth')) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.getVariable('nof3')) return;
    if (mp.players.local.getVariable('amenu')) return;
    if (mp.players.local.getVariable('jail')) return;
    if (mp.players.local.getVariable('mp')) return;
    if (isTargetInteractionBlocked()) return;
    if (mp.players.local.getVariable('famcreate')) return;
    if (mp.players.local.getVariable('familymenu')) return;
    if (mp.players.local.getVariable('casmenu')) return;
    if (mp.players.local.getVariable('blackmenu')) return;
    if (mp.players.local.getVariable('animsmenu')) return;
    if (mp.players.local.getVariable('shopc')) return;
    if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return;
    if (mp.players.local.getVariable('invkey')) return;
    if (targetMenu.active === true) { global.CloseTarget(); return; }
    if (mp.players.local.getVariable('targetmenu')) return;
    if (global.pairActive) return;

    if (targetMenu.active === true) {
        global.CloseTarget();
        return;
    }

    if (localPlayer.vehicle) entity=localPlayer.vehicle;
    if (entity == null) return;

    if (entity.type === 'vehicle') {
        if (!mp.vehicles.exists(entity)) return;
        targetMenuTargetStatic = null;
        targetVehicleRemoteId = entity.remoteId;
        targetVehicleAltId = typeof entity.id === 'number' ? entity.id : null;
        interfaceEmit(`targetMenu.openVehicleMenu(${entity.remoteId},${!!localPlayer.vehicle});`);
        mp.events.callRemote('target:vehicle:open:s', entity.remoteId, targetVehicleAltId);
        mp.gui.cursor.show(true, true);
        mp.gui.cursor.visible = true;
        return;
    }

    const inGangwar = mp.players.local.getVariable('gangwar') === true;
    const inHub = mp.players.local.getVariable('factionlessHub') === true;
    if (!inGangwar && !inHub) return;
    const fraction = parseInt(mp.players.local.getVariable('fraction') || 0, 10);
    if (fraction < 1 && !inHub) return;

    switch (entity.type) {
        case "player":
            if (!mp.players.exists(entity) || localPlayer.isInAnyVehicle(false) || localPlayer.getVariable('afklobby') || entity.getVariable('afklobby'))
                return;

            targetMenuTargetStatic = entity.getVariable('static');
            try { mp.players.local._tgtPairStatic = targetMenuTargetStatic; } catch (_eSt) {}
            const dispLogin = typeof global.citizenResolveLoginEscaped === 'function'
                ? global.citizenResolveLoginEscaped(entity)
                : String(entity.getVariable('login') || 'Гражданин').replace(/'/g, "\\'");
            interfaceEmit(`targetMenu.changeTarget('${dispLogin}', ${targetMenuTargetStatic});`)
            mp.events.callRemote('target:open', targetMenuTargetStatic);
            mp.gui.cursor.visible = true;
            break;
    }
});

const keplerMarker=mp.browsers.new('package://kepler-compat/marker.html');
let keplerMarkerAt=0,keplerVehicleState=null,keplerMarkerSignature='';
mp.events.add('render',()=>{
 const now=Date.now();if(now-keplerMarkerAt<16)return;keplerMarkerAt=now;
 let point=null;
 try{
  if(global.isPlayerSpawned&&targetHintEnabled&&entity&&!localPlayer.vehicle&&!localPlayer.isDead()&&!targetMenu.active&&!isTargetInteractionBlocked()){
   const world=entity.type==='player'?entity.getBoneCoords(11816,0,0,0):getVehicleHintWorldPos(entity);
   const screen=mp.game.graphics.world3dToScreen2d(world);if(screen&&screen.x>=0&&screen.x<=1&&screen.y>=0&&screen.y<=1)point={x:screen.x,y:screen.y};
  }
  const signature=point?point.x.toFixed(5)+':'+point.y.toFixed(5):'hidden';
  if(signature!==keplerMarkerSignature){
   keplerMarkerSignature=signature;
   keplerMarker.execute('window.setMarker&&setMarker('+JSON.stringify(point)+');');
  }
  const inVehicle=Boolean(localPlayer.vehicle);
  if(inVehicle!==keplerVehicleState){keplerVehicleState=inVehicle;targetMenu.execute('window.keplerVehicleState&&keplerVehicleState('+inVehicle+');');}
 }catch(_){}
});

mp.events.add('legacy:vehicle:tuning:state',(id,raw)=>{if(!targetMenu||!targetMenu.active||!mp.browsers.exists(targetMenu))return;try{const value=JSON.parse(raw),v=localPlayer.vehicle;if(v&&v.remoteId===Number(id)&&typeof global.applyLegacyVehicleDynamics==='function')global.applyLegacyVehicleDynamics(v,value);targetMenu.execute('targetMenu.applyVehicleTuning('+Number(id)+','+JSON.stringify(value)+');');}catch(_){}});
mp.events.add('legacy:vehicle:tuning:save:c',(id,raw)=>{if(targetMenu.active&&localPlayer.vehicle&&localPlayer.vehicle.remoteId===Number(id))mp.events.callRemote('legacy:vehicle:tuning:save',Number(id),raw);});
