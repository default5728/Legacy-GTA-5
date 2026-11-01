'use strict';

/**
 * Скейтборд — клиент.
 * Анимации управляются сервером через setVariable('skateAnim').
 * Клиент только: держит скейт в руке, читает ввод и шлёт на сервер, применяет анимации всем педам.
 */

const SKATE_DICT_MAIN = 'gta5rp@skateboard';
const SKATE_DICT_RIDE = '5rp_skate';
const SKATE_MODEL_HASH = mp.game.joaat('5rp_skate');
const SKATE_BONE_HAND = 36029; // IK_L_Hand

let sostoyanie    = null; // null | 'ozhidanie_ruki' | 'v_ruke' | 'ozhidanie' | 'edet'
let tehnikaVRuke  = null;
let renderRuki    = false;
let renderVklyuch = false;
let probelZazhat  = false;
let editorRezhim  = null;
let ozhidanieTimer = null;

function etoSkateTehnika(tehnika) {
    if (!tehnika || !mp.vehicles.exists(tehnika)) return false;
    try {
        if (tehnika.model === SKATE_MODEL_HASH) return true;
        if (tehnika.getVariable('skateRide') === true) return true;
        if (tehnika.getVariable('skateOwner') != null) return true;
    } catch (_e) {}
    return false;
}

function vklyuchitSkateMotor(tehnika) {
    if (!tehnika || !mp.vehicles.exists(tehnika)) return;
    try { tehnika.setEngineOn(true, true, false); } catch (_e) {}
    try { mp.game.vehicle.setVehicleEngineOn(tehnika.handle, true, true, false); } catch (_e2) {}
}

global.isSkateVehicle = etoSkateTehnika;
global.isLocalPlayerOnSkate = function () {
    if (sostoyanie === 'edet' || sostoyanie === 'ozhidanie') return true;
    const veh = mp.players.local.vehicle;
    return etoSkateTehnika(veh);
};

function predzagruzitSkateAnim() {
    [SKATE_DICT_MAIN, SKATE_DICT_RIDE].forEach((slovar) => {
        try {
            if (!mp.game.streaming.hasAnimDictLoaded(slovar)) mp.game.streaming.requestAnimDict(slovar);
        } catch (_e) {}
    });
}
predzagruzitSkateAnim();
setInterval(predzagruzitSkateAnim, 5000);

let povoroteRuki = { x: -57.0, y: -28.0, z: -27.0 };
let smeshRuki    = { x: 0.140, y: -0.045, z: -0.010 };

// ─── Редактор (только для админов) ───────────────────────────────────────────

const VK_SHIFT = 0x10; const VK_CTRL = 0x11;
const VK_W = 0x57; const VK_S = 0x53; const VK_A = 0x41; const VK_D = 0x44;
const VK_Q = 0x51; const VK_E = 0x45; const VK_F2 = 0x71; const VK_RETURN = 0x0D;

const EDITOR_BLOCK_CTRLS = [
    21,22,23,24,25,30,31,32,33,34,35,36,37,44,45,46,47,
    59,60,61,62,63,64,71,72,73,74,75,76,86,140,141,142,143,257,263,264
];

let editorPosledni = 0;
let editorPosZamor = null;

function knopkaZazhata(kod) { try { return global.isGameplayKeyDown(kod); } catch (_e) { return false; } }
function adminRedaktor() { return (mp.players.local.getVariable('adminlvl') || 0) >= 1; }
function chat(msg) { try { mp.gui.chat.push(msg); } catch (_e) {} }

function zablokirovatRedaktor() {
    const igrok = mp.players.local;
    if (!igrok || !igrok.handle) return;
    try { igrok.freezePosition(true); } catch (_e) {}
    try { mp.game.entity.freezeEntityPosition(igrok.handle, true); } catch (_e) {}
    const c = mp.game.controls;
    for (let i = 0; i < EDITOR_BLOCK_CTRLS.length; i++) {
        try { c.disableControlAction(0, EDITOR_BLOCK_CTRLS[i], true); } catch (_e) {}
        try { c.disableControlAction(1, EDITOR_BLOCK_CTRLS[i], true); } catch (_e) {}
        try { c.disableControlAction(2, EDITOR_BLOCK_CTRLS[i], true); } catch (_e) {}
    }
    if (editorPosZamor) {
        const p = igrok.position;
        if (Math.abs(p.x - editorPosZamor.x) > 0.02 || Math.abs(p.y - editorPosZamor.y) > 0.02) {
            try { mp.game.entity.setEntityCoordsNoOffset(igrok.handle, editorPosZamor.x, editorPosZamor.y, editorPosZamor.z, false, false, false); } catch (_e) {}
        }
    }
}

function razblokirovatRedaktor() {
    const igrok = mp.players.local;
    if (!igrok) return;
    try { igrok.freezePosition(false); } catch (_e) {}
    if (igrok.handle) { try { mp.game.entity.freezeEntityPosition(igrok.handle, false); } catch (_e) {} }
    editorPosZamor = null;
}

function vyvestiKonfig() {
    chat(`!{#7CFC00}[редактор] поз: x=${smeshRuki.x.toFixed(3)} y=${smeshRuki.y.toFixed(3)} z=${smeshRuki.z.toFixed(3)} | повор: x=${povoroteRuki.x.toFixed(1)} y=${povoroteRuki.y.toFixed(1)} z=${povoroteRuki.z.toFixed(1)}`);
    chat(`!{#aaaaaa}smeshRuki = { x: ${smeshRuki.x.toFixed(3)}, y: ${smeshRuki.y.toFixed(3)}, z: ${smeshRuki.z.toFixed(3)} };`);
    chat(`!{#aaaaaa}povoroteRuki = { x: ${povoroteRuki.x.toFixed(1)}, y: ${povoroteRuki.y.toFixed(1)}, z: ${povoroteRuki.z.toFixed(1)} };`);
}

function tikEditor() {
    if (!editorRezhim) return;
    if (mp.gui.cursor.visible || mp.game.ui.isPauseMenuActive()) return;
    const shift = knopkaZazhata(VK_SHIFT);
    const ctrl  = knopkaZazhata(VK_CTRL);
    if (!shift && !ctrl) return;
    const t = Date.now();
    if (t - editorPosledni < 60) return;
    const shagP = 0.005; const shagR = 1.0;
    let izm = false;
    if (shift) {
        if (knopkaZazhata(VK_W)) { smeshRuki.y += shagP; izm = true; }
        if (knopkaZazhata(VK_S)) { smeshRuki.y -= shagP; izm = true; }
        if (knopkaZazhata(VK_A)) { smeshRuki.x -= shagP; izm = true; }
        if (knopkaZazhata(VK_D)) { smeshRuki.x += shagP; izm = true; }
        if (knopkaZazhata(VK_Q)) { smeshRuki.z += shagP; izm = true; }
        if (knopkaZazhata(VK_E)) { smeshRuki.z -= shagP; izm = true; }
    }
    if (ctrl) {
        if (knopkaZazhata(VK_W)) { povoroteRuki.x += shagR; izm = true; }
        if (knopkaZazhata(VK_S)) { povoroteRuki.x -= shagR; izm = true; }
        if (knopkaZazhata(VK_A)) { povoroteRuki.y -= shagR; izm = true; }
        if (knopkaZazhata(VK_D)) { povoroteRuki.y += shagR; izm = true; }
        if (knopkaZazhata(VK_Q)) { povoroteRuki.z += shagR; izm = true; }
        if (knopkaZazhata(VK_E)) { povoroteRuki.z -= shagR; izm = true; }
    }
    if (izm) {
        editorPosledni = t;
        if (tehnikaVRuke && mp.vehicles.exists(tehnikaVRuke)) prikrepiTehnikuKRuke(tehnikaVRuke);
        vyvestiKonfig();
    }
}

function risovatPodskazku() {
    if (!editorRezhim) return;
    try {
        mp.game.graphics.drawText('~b~[РЕДАКТОР: РУКА]~s~  Shift+WASD/QE — позиция  Ctrl+WASD/QE — поворот  Enter — в чат  F2 — выход',
            [0.5, 0.04], { font: 4, color: [255,255,255,220], scale: [0.42,0.42], outline: true, centre: true });
    } catch (_e) {}
}

let renderEditor = false;
function nachatRenderEditora() { if (renderEditor) return; renderEditor = true; mp.events.add('render', cikleEditora); }
function ostanovitRenderEditora() { if (!renderEditor) return; renderEditor = false; mp.events.remove('render', cikleEditora); }
function cikleEditora() {
    zablokirovatRedaktor();
    risovatPodskazku();
    tikEditor();
    if (tehnikaVRuke && mp.vehicles.exists(tehnikaVRuke)) prikrepiTehnikuKRuke(tehnikaVRuke);
}

function vklyuchitRedaktor() {
    if (!adminRedaktor()) { uvedomit(2, 'bottom-mid', 'Только админам.', 2000); return; }
    if (sostoyanie !== 'v_ruke') { return; }
    editorPosZamor = mp.players.local.position;
    editorRezhim = 'ruka';
    try { mp.players.local.clearTasks(); } catch (_e) {}
    zablokirovatRedaktor();
    nachatRenderEditora();
    chat('!{#7CFC00}[редактор] Включён. F2 — выйти.');
    vyvestiKonfig();
}

function vyklyuchitRedaktor() {
    if (!editorRezhim) return;
    editorRezhim = null;
    ostanovitRenderEditora();
    razblokirovatRedaktor();
    chat('!{#7CFC00}[редактор] Выключен.');
}

mp.events.add('skateboard:editor:open', () => { if (editorRezhim) { vyklyuchitRedaktor(); return; } vklyuchitRedaktor(); });
global.bindGameplayKey(VK_F2, false, () => { if (editorRezhim) vyklyuchitRedaktor(); });
global.bindGameplayKey(VK_RETURN, false, () => { if (editorRezhim) vyvestiKonfig(); });

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function uvedomit(t, p, m, d) { try { mp.events.call('notify:client', t, p, m, d); } catch (_e) {} }

function interfeysZablokirovan() {
    const p = mp.players.local;
    return p.getVariable('dead') || p.getVariable('famcreate') || p.getVariable('familymenu')
        || p.getVariable('casmenu') || p.getVariable('amenu') || p.getVariable('blackmenu')
        || p.getVariable('shopc') || p.getVariable('f3key');
}

function zhdiSlovar(slovar) {
    return new Promise(reshit => {
        if (mp.game.streaming.hasAnimDictLoaded(slovar)) return reshit(true);
        mp.game.streaming.requestAnimDict(slovar);
        let n = 0;
        const id = setInterval(() => {
            if (mp.game.streaming.hasAnimDictLoaded(slovar) || n++ > 300) { clearInterval(id); reshit(mp.game.streaming.hasAnimDictLoaded(slovar)); }
        }, 50);
    });
}

function najtiTehniku(id) {
    const n = Number(id);
    let v = null;
    try { v = mp.vehicles.atRemoteId(n); } catch (_e) {}
    if (!v) mp.vehicles.forEach(x => { if (x && (x.id === n || x.remoteId === n)) v = x; });
    return v;
}

// ─── Скейт в руке ────────────────────────────────────────────────────────────

function prikrepiTehnikuKRuke(tehnika) {
    if (!tehnika) return;
    const igrok = mp.players.local;
    try {
        const bone = mp.game.ped.getBoneIndex(igrok.handle, SKATE_BONE_HAND);
        tehnika.attachTo(igrok.handle, bone,
            smeshRuki.x, smeshRuki.y, smeshRuki.z,
            povoroteRuki.x, povoroteRuki.y, povoroteRuki.z,
            false, false, false, false, 2, true);
    } catch (_e) {}
}

function nachatRenderRuki() { if (renderRuki) return; renderRuki = true; mp.events.add('render', obrabotkaRuki); }
function ostanovitRenderRuki() { if (!renderRuki) return; renderRuki = false; mp.events.remove('render', obrabotkaRuki); }
function obrabotkaRuki() {
    if (sostoyanie !== 'v_ruke') return;
    if (tehnikaVRuke && mp.vehicles.exists(tehnikaVRuke)) prikrepiTehnikuKRuke(tehnikaVRuke);
}

mp.events.add('skateboard:takeInHand', () => {
    if (typeof global.isCaptOrBizwarInArena === 'function' && global.isCaptOrBizwarInArena()) return;
    if (interfeysZablokirovan()) return;
    if (sostoyanie) { return; }
    if (mp.players.local.vehicle) { return; }
    sostoyanie = 'ozhidanie_ruki';
    mp.events.callRemote('skateboard:spawnHand:s');
});

mp.events.add('skateboard:handSpawned:c', (idTehniki) => {
    if (sostoyanie !== 'ozhidanie_ruki') return;
    let popytki = 0;
    const opros = setInterval(() => {
        popytki++;
        const tehnika = najtiTehniku(idTehniki);
        if (tehnika) {
            clearInterval(opros);
            tehnikaVRuke = tehnika;
            sostoyanie   = 'v_ruke';
            const prikrepit = () => prikrepiTehnikuKRuke(tehnika);
            prikrepit(); setTimeout(prikrepit, 150); setTimeout(prikrepit, 500);
            nachatRenderRuki();
        }
        if (popytki > 60) { clearInterval(opros); if (sostoyanie === 'ozhidanie_ruki') sostoyanie = null; }
    }, 50);
});

mp.events.add('skateboard:hotkeyToggle:c', () => {
    if (typeof global.isCaptOrBizwarInArena === 'function' && global.isCaptOrBizwarInArena()) return;
    if (editorRezhim) { vyklyuchitRedaktor(); return; }
    if (sostoyanie === null) {
        mp.events.call('skateboard:takeInHand');
    } else if (sostoyanie === 'v_ruke') {
        tehnikaVRuke = null; sostoyanie = null;
        ostanovitRenderRuki();
        mp.events.callRemote('skateboard:despawnHand:s');
    } else if (sostoyanie === 'edet') {
        ostanovitEzdu();
    }
});

global.bindGameplayKey(0x46, true, () => {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.gui.cursor.visible) return;
    if (editorRezhim) return;
    if (interfeysZablokirovan()) return;
    if (sostoyanie === 'v_ruke') nachatEzdu();
    else if (sostoyanie === 'edet') ostanovitEzdu();
});

// ─── Езда ────────────────────────────────────────────────────────────────────

function sbrositOzhidaniePosadki() {
    if (ozhidanieTimer) {
        clearTimeout(ozhidanieTimer);
        ozhidanieTimer = null;
    }
}

function nachatRezhimEzdy() {
    sostoyanie = 'edet';
    probelZazhat = false;
    sbrositOzhidaniePosadki();
    const tehnika = mp.players.local.vehicle;
    if (tehnika) vklyuchitSkateMotor(tehnika);
    if (!renderVklyuch) {
        renderVklyuch = true;
        mp.events.add('render', obrabotkaRendera);
    }
}

function nachatEzdu() {
    if (sostoyanie !== 'v_ruke') return;
    if (interfeysZablokirovan()) return;
    sostoyanie = 'ozhidanie';
    ostanovitRenderRuki();
    tehnikaVRuke = null;
    predzagruzitSkateAnim();
    sbrositOzhidaniePosadki();
    ozhidanieTimer = setTimeout(() => {
        ozhidanieTimer = null;
        if (sostoyanie !== 'ozhidanie') return;
        if (mp.players.local.vehicle && etoSkateTehnika(mp.players.local.vehicle)) {
            nachatRezhimEzdy();
            return;
        }
        sostoyanie = null;
        uvedomit(2, 'bottom-mid', 'Не удалось сесть на скейт.', 2500);
    }, 3500);
    mp.events.callRemote('skateboard:ride:s');
}

mp.events.add('skateboard:seated:c', () => {
    if (sostoyanie !== 'ozhidanie' && sostoyanie !== 'v_ruke') return;
    const posadit = () => {
        const igrok = mp.players.local;
        if (!igrok.vehicle || !etoSkateTehnika(igrok.vehicle)) return false;
        nachatRezhimEzdy();
        return true;
    };
    if (posadit()) return;
    let popytki = 0;
    const opros = setInterval(() => {
        popytki++;
        if (posadit() || popytki > 50) clearInterval(opros);
    }, 40);
});

function ostanovitEzdu() {
    if (sostoyanie !== 'edet') return;
    sostoyanie = null;
    sbrositOzhidaniePosadki();
    try { mp.players.local.clearTasks(); } catch (_e) {}
    if (renderVklyuch) { renderVklyuch = false; mp.events.remove('render', obrabotkaRendera); }
    mp.events.callRemote('skateboard:despawn:s');
    setTimeout(() => {
        if (sostoyanie === null && !mp.players.local.vehicle) mp.events.call('skateboard:takeInHand');
    }, 400);
}

// ─── Render езды: только ввод → сервер ───────────────────────────────────────

let _lastInputSend = 0;

function obrabotkaRendera() {
    if (sostoyanie !== 'edet') return;
    if (editorRezhim) return;

    const igrok = mp.players.local;
    if (!igrok) return;
    const tehnika = igrok.vehicle;
    if (!tehnika || !etoSkateTehnika(tehnika)) { sostoyanie = null; mp.events.callRemote('skateboard:despawn:s'); return; }
    vklyuchitSkateMotor(tehnika);
    if (igrok.getVariable('dead')) { ostanovitEzdu(); return; }

    const now = Date.now();
    if (now - _lastInputSend < 50) return; // шлём не чаще 20 раз/сек
    _lastInputSend = now;

    const u = mp.game.controls;
    const w = u.isControlPressed(2, 71) ? 1 : 0;
    const s = u.isControlPressed(2, 72) ? 1 : 0;
    /* В транспорте A/D — это VehicleMoveLeft(63)/VehicleMoveRight(64) + пешие MoveLeft(34)/MoveRight(35). */
    const a = (u.isControlPressed(2, 34) || u.isControlPressed(2, 63)) ? 1 : 0;
    const d = (u.isControlPressed(2, 35) || u.isControlPressed(2, 64)) ? 1 : 0;

    const probelSeychas = u.isControlPressed(2, 22);
    const probelNazhat  = probelSeychas && !probelZazhat ? 1 : 0;
    probelZazhat = probelSeychas;

    let skorost = 0;
    try { skorost = tehnika.getSpeed(); } catch (_e) {}

    mp.events.callRemote('skateboard:input:s', w, s, a, d, probelNazhat, skorost);
}

// ─── Применение анимации на педе (локальный + чужие) ─────────────────────────

function igratTryukNaSkejte(vehHandle) {
    if (!vehHandle) return;
    try {
        if (!mp.game.streaming.hasAnimDictLoaded(SKATE_DICT_RIDE)) mp.game.streaming.requestAnimDict(SKATE_DICT_RIDE);
        mp.game.entity.playEntityAnim(vehHandle, '5rp_skate_jump', SKATE_DICT_RIDE, 8.0, false, true, false, 0, 0);
    } catch (_e) {}
}

function igratAnimatsiyuNaPede(ped, slovar, nazvanie, tsikl) {
    if (!ped || !ped.handle) return;
    if (!mp.game.streaming.hasAnimDictLoaded(slovar)) {
        mp.game.streaming.requestAnimDict(slovar);
        setTimeout(() => {
            try {
                const flag = tsikl ? (1 | 32) : (2 | 32);
                ped.taskPlayAnim(slovar, nazvanie, 3.0, -3.0, tsikl ? -1 : 2200, flag, 0, false, false, false);
            } catch (_e) {}
        }, 300);
        return;
    }
    try {
        const flag = tsikl ? (1 | 32) : (2 | 32);
        ped.taskPlayAnim(slovar, nazvanie, 3.0, -3.0, tsikl ? -1 : 2200, flag, 0, false, false, false);
    } catch (_e) {}
}

/**
 * skateAnim = "slovar|nazvanie|1" (loop) или "slovar|nazvanie|0" (one-shot) или null.
 * Сервер пишет это значение при каждой смене анимации.
 * addDataHandler срабатывает у ВСЕХ клиентов при изменении, и сразу при стриминге игрока.
 */
mp.events.addDataHandler('skateAnim', (entity, value) => {
    try {
        if (!entity || entity.type !== 'player') return;
        if (!value) {
            try { entity.clearTasks(); } catch (_e) {}
            return;
        }
        const parts = String(value).split('|');
        if (parts.length < 3) return;

        entity._tekuschiiAnim = parts[1];
        igratAnimatsiyuNaPede(entity, parts[0], parts[1], parts[2] === '1');

        /* При прыжке — дополнительно играем трюк на самом скейте (ТС). */
        if (parts[1] === 'jump') {
            let vehHandle = null;
            /* Если это наш игрок — берём своё ТС. */
            if (entity === mp.players.local) {
                const veh = mp.players.local.vehicle;
                if (veh) vehHandle = veh.handle;
            } else {
                /* Для других — ищем их ТС по переменной skateVehId или просто vehicle. */
                try {
                    const veh = entity.vehicle;
                    if (veh) vehHandle = veh.handle;
                } catch (_e) {}
            }
            if (vehHandle) igratTryukNaSkejte(vehHandle);
        }
    } catch (_e) {}
});

// ─── Синхронизация скейта в руке для других игроков ──────────────────────────

const SYNC_POS_HAND = { x: 0.140, y: -0.045, z: -0.010 };
const SYNC_ROT_HAND = { x: -57.0, y: -28.0,  z: -27.0  };

const skateRemoteMap = new Map(); // remoteId → { veh, renderOn, tickFn }

function prikrepiKRukeIgroka(ped, veh) {
    if (!ped || !ped.handle || !veh || !veh.handle) return;
    try { mp.game.entity.detachEntity(veh.handle, true, true); } catch (_e) {}
    try {
        const bone = mp.game.ped.getBoneIndex(ped.handle, SKATE_BONE_HAND);
        veh.attachTo(ped.handle, bone,
            SYNC_POS_HAND.x, SYNC_POS_HAND.y, SYNC_POS_HAND.z,
            SYNC_ROT_HAND.x, SYNC_ROT_HAND.y, SYNC_ROT_HAND.z,
            false, false, false, false, 2, true);
        mp.game.entity.freezeEntityPosition(veh.handle, true);
        mp.game.entity.setEntityCollision(veh.handle, false, false);
    } catch (_e) {}
}

function startRemoteSkateRender(rid) {
    const e = skateRemoteMap.get(rid);
    if (!e || e.renderOn) return;
    e.renderOn = true;
    const tick = () => {
        const entry = skateRemoteMap.get(rid);
        if (!entry || !entry.renderOn) return;
        try {
            const ped = mp.players.atRemoteId(rid);
            if (!ped || !mp.players.exists(ped)) return;
            if (!entry.veh || !mp.vehicles.exists(entry.veh)) return;
            let att = false;
            try { att = mp.game.entity.isEntityAttached(entry.veh.handle); } catch (_e) {}
            if (!att) prikrepiKRukeIgroka(ped, entry.veh);
            mp.game.entity.freezeEntityPosition(entry.veh.handle, true);
            mp.game.entity.setEntityCollision(entry.veh.handle, false, false);
        } catch (_e) {}
    };
    e.tickFn = tick;
    mp.events.add('render', tick);
}

function stopRemoteSkateRender(rid) {
    const e = skateRemoteMap.get(rid);
    if (!e) return;
    e.renderOn = false;
    if (e.tickFn) { mp.events.remove('render', e.tickFn); e.tickFn = null; }
    if (e.veh) {
        try {
            mp.game.entity.detachEntity(e.veh.handle, true, true);
            mp.game.entity.freezeEntityPosition(e.veh.handle, false);
            mp.game.entity.setEntityCollision(e.veh.handle, true, true);
        } catch (_e) {}
    }
    skateRemoteMap.delete(rid);
}

mp.events.addDataHandler('skateOnBack', (entity, value) => {
    try {
        if (!entity || entity.type !== 'player') return;
        if (entity === mp.players.local) return;
        const rid = entity.remoteId;
        if (value == null) { stopRemoteSkateRender(rid); return; }
        let tries = 0;
        const poll = setInterval(() => {
            tries++;
            const id = Number(value);
            let veh = null;
            try { veh = mp.vehicles.atRemoteId(id); } catch (_e) {}
            if (!veh) mp.vehicles.forEach(v => { if (v && (v.id === id || v.remoteId === id)) veh = v; });
            if (veh && veh.handle) {
                clearInterval(poll);
                stopRemoteSkateRender(rid);
                skateRemoteMap.set(rid, { veh, renderOn: false, tickFn: null });
                prikrepiKRukeIgroka(entity, veh);
                setTimeout(() => prikrepiKRukeIgroka(entity, veh), 150);
                setTimeout(() => prikrepiKRukeIgroka(entity, veh), 500);
                startRemoteSkateRender(rid);
                return;
            }
            if (tries > 80) clearInterval(poll);
        }, 50);
    } catch (_e) {}
});

mp.events.add('entityStreamOut', (entity) => {
    try {
        if (!entity || entity.type !== 'player') return;
        if (entity === mp.players.local) return;
        stopRemoteSkateRender(entity.remoteId);
    } catch (_e) {}
});

// ─── Прочее ──────────────────────────────────────────────────────────────────

mp.events.add('playerEnterVehicle', (vehicle, seat) => {
    if (seat !== 0 && seat !== -1) return;
    if (!etoSkateTehnika(vehicle)) return;
    vklyuchitSkateMotor(vehicle);
    if (sostoyanie === 'ozhidanie') nachatRezhimEzdy();
});

mp.events.add('playerDeath', () => {
    if (editorRezhim) vyklyuchitRedaktor();
    if (sostoyanie === 'edet') ostanovitEzdu();
    else if (sostoyanie) {
        sostoyanie = null; tehnikaVRuke = null;
        ostanovitRenderRuki();
        mp.events.callRemote('skateboard:despawnHand:s');
    }
});

mp.events.add('skateboard:forceStop', () => {
    if (editorRezhim) vyklyuchitRedaktor();
    if (sostoyanie === 'edet') ostanovitEzdu();
    else {
        sostoyanie = null; tehnikaVRuke = null;
        ostanovitRenderRuki();
        mp.events.callRemote('skateboard:despawnHand:s');
    }
});

mp.events.add('skateboard:applyMods:c', (idTehniki, jsonRaw) => {
    try {
        const tehnika = najtiTehniku(idTehniki);
        if (!tehnika || !tehnika.handle) return;
        const mods = typeof jsonRaw === 'string' ? JSON.parse(jsonRaw) : jsonRaw;
        if (!mods) return;
        const h = tehnika.handle;
        try { mp.game.invoke('0x1F2AA07F00B3217A', h, 0); } catch (_e) {}
        Object.keys(mods).forEach(k => {
            const slot = parseInt(k, 10); const idx = parseInt(mods[k], 10);
            if (Number.isNaN(slot) || Number.isNaN(idx)) return;
            try { if (idx < 0) tehnika.setMod(slot, -1); else tehnika.setMod(slot, idx); } catch (_e) {}
        });
    } catch (_e) {}
});

mp.events.add('skateboard:modsScan:c', (idTehniki) => {
    try {
        const tehnika = najtiTehniku(idTehniki);
        if (!tehnika || !tehnika.handle) return;
        const result = {};
        try { mp.game.invoke('0x1F2AA07F00B3217A', tehnika.handle, 0); } catch (_e) {}
        for (let slot = 0; slot <= 48; slot++) {
            try {
                const n = mp.game.vehicle.getNumVehicleMods(tehnika.handle, slot);
                if (typeof n === 'number' && n > 0) result[slot] = n;
            } catch (_e) {}
        }
        mp.events.callRemote('skateboard:modsResult:s', JSON.stringify(result));
    } catch (_e) {}
});
