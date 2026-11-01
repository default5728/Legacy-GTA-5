require('./lsc_globals.js');

const rpc = global.rpc;
if (!rpc) {
    mp.console.logWarning('[lscustom] global.rpc missing — module skipped');
} else {
function getMenuBrowser() {
    return global.menuBrowser;
}

const localPlayer = mp.players.local;
const menuMap = new Map();
let menuCursorCounter = 0;

function pushMenuManagerOpen(page, data) {
    const menuBrowser = getMenuBrowser();
    if (!menuBrowser || !mp.browsers.exists(menuBrowser)) return;
    menuBrowser.active = true;
    const payload = { menu: page, data };
    rpc.triggerBrowser(menuBrowser, 'menuManager_menu_open', payload);
    const dataJson = JSON.stringify(data).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    setTimeout(() => {
        if (!mp.browsers.exists(menuBrowser)) return;
        try {
            menuBrowser.execute(
                `try{var m=typeof menuManagerMap!=='undefined'&&menuManagerMap.get('${page}');` +
                `if(m&&!m.vue.loaded)m.load(JSON.parse('${dataJson}'));}catch(e){}`
            );
        } catch (_e) {}
    }, 350);
}

function openMenu(menu, data) {
    menu.params = data;
    menu.beforeOpen(data);
    pushMenuManagerOpen(menu.page, data);
    if (menu.enableCursor && !menu.isOpen) {
        if (menuCursorCounter === 0) {
            if (typeof global.__lscSetCursor === 'function') global.__lscSetCursor(true);
            else {
                try { mp.gui.cursor.show(true, true); } catch (_e) {}
            }
            mp.events.add('render', blockMapKey);
        }
        menuCursorCounter++;
    }
    menu.isOpen = true;
    menu.afterOpen(data);
}

function closeMenu(menu) {
    if (!menu.isOpen) return;
    const menuBrowser = getMenuBrowser();
    if (menuBrowser && mp.browsers.exists(menuBrowser)) {
        rpc.triggerBrowser(menuBrowser, 'menuManager_menu_close', menu.page);
    }
    menu.onClose();
    menu.isOpen = false;
    if (menu.enableCursor) {
        menuCursorCounter--;
        if (menuCursorCounter === 0) {
            if (typeof global.__lscSetCursor === 'function') global.__lscSetCursor(false);
            else {
                try { mp.gui.cursor.show(false, false); } catch (_e) {}
            }
            mp.events.remove('render', blockMapKey);
        }
    }
}

const blockMapKey = () => {
    mp.game.controls.disableControlAction(0, 156, true);
    mp.game.controls.disableControlAction(0, 199, true);
    mp.game.controls.disableControlAction(0, 200, true);
};

mp.events.add('client_menuManager_taskClose', (page) => {
    const menu = menuMap.get(page);
    if (menu && menu.isOpen) closeMenu(menu);
});

class Menu {
    constructor(page) {
        this.page = page;
        this.params = null;
        this.isOpen = false;
        this.enableCursor = true;
        menuMap.set(page, this);
    }
    beforeOpen() {}
    afterOpen() {}
    onClose() {}
}

const LSC_INTERNAL_MOD_SLOTS = [11, 12, 13, 15, 18];
const LSC_INTERNAL_MOD_LABELS = {
    11: 'Двигатель',
    12: 'Тормоза',
    13: 'Трансмиссия',
    15: 'Подвеска',
    18: 'Турбо'
};

function buildUniversalModsList(veh, modPrice) {
    const out = [];
    if (!veh || !veh.handle) return out;
    try { mp.game.invoke('0x1F2AA07F00B3217A', veh.handle, 0); } catch (_e0) {}
    LSC_INTERNAL_MOD_SLOTS.forEach((slot) => {
        let count = 0;
        try { count = veh.getNumMods(slot); } catch (_e) {}
        for (let i = 0; i < count; i++) {
            out.push({
                type: slot,
                modIndex: i,
                name: `${LSC_INTERNAL_MOD_LABELS[slot] || 'Мод'} — уровень ${i + 1}`,
                price: (modPrice && (modPrice[slot] || modPrice[String(slot)])) || 10000
            });
        }
    });
    try {
        const vehClass = veh.getClass();
        if (vehClass !== 8 && vehClass !== 13 && !out.some((m) => m.type === 18)) {
            let turboOn = false;
            try { turboOn = veh.isToggleModOn(18); } catch (_e2) {}
            const turboPrice = (modPrice && (modPrice[18] || modPrice['18'])) || 15000;
            out.push({
                type: 18,
                modIndex: 0,
                name: turboOn ? 'Турбо (установлено)' : 'Турбо — установить',
                price: turboPrice
            });
        }
    } catch (_e3) {}
    return out;
}

function findVehicleByClientId(clientId) {
    const id = Number(clientId);
    if (!Number.isFinite(id)) return null;
    let veh = mp.vehicles.atRemoteId(id);
    if (veh && mp.vehicles.exists(veh)) return veh;
    mp.vehicles.forEach((v) => {
        if (!veh && mp.vehicles.exists(v) && (v.remoteId === id || v.id === id)) veh = v;
    });
    return veh && mp.vehicles.exists(veh) ? veh : null;
}

function captureTuningFromVehicleClient(veh) {
    const tuning = { mods: {}, primary: null, secondary: null, colorType: [0, 0], pearlescent: 0, wheelColor: 0, neon: null, windowTint: 0 };
    if (!veh || !veh.handle) return tuning;
    try { mp.game.invoke('0x1F2AA07F00B3217A', veh.handle, 0); } catch (_e) {}
    for (let slot = 0; slot < 50; slot++) {
        try {
            const v = veh.getMod(slot);
            if (v != null && v !== -1) tuning.mods[String(slot)] = v;
        } catch (_e2) {}
    }
    try {
        const p = veh.getCustomPrimaryColour(0, 0, 0);
        tuning.primary = [p.r, p.g, p.b];
    } catch (_e3) {}
    try {
        const s = veh.getCustomSecondaryColour(0, 0, 0);
        tuning.secondary = [s.r, s.g, s.b];
    } catch (_e4) {}
    try {
        const extra = veh.getExtraColours(1, 1);
        tuning.pearlescent = extra.pearlescentColor;
        tuning.wheelColor = extra.wheelColor;
    } catch (_e5) {}
    try { tuning.windowTint = veh.getWindowTint(); } catch (_e6) {}
    try {
        if (veh.isNeonLightEnabled(0)) {
            const nc = veh.getNeonLightsColour(0, 0, 0);
            tuning.neon = { r: nc.r, g: nc.g, b: nc.b };
        }
    } catch (_e7) {}
    try {
        const c1 = veh.getModColor1();
        if (c1 && typeof c1 === 'object') {
            tuning.colorType[0] = Number(c1.paintType != null ? c1.paintType : c1[0]) || 0;
        }
    } catch (_e8) {}
    try {
        const c2 = veh.getModColor2();
        if (c2 && typeof c2 === 'object') {
            tuning.colorType[1] = Number(c2.paintType != null ? c2.paintType : c2[0]) || 0;
        }
    } catch (_e9) {}
    return tuning;
}

function applyVehicleTuningClient(veh, tuning) {
    if (!veh || !veh.handle || !tuning) return;
    try { mp.game.invoke('0x1F2AA07F00B3217A', veh.handle, 0); } catch (_e) {}
    const mods = tuning.mods || {};
    Object.keys(mods).forEach((k) => {
        const slot = parseInt(k, 10);
        const val = parseInt(mods[k], 10);
        if (Number.isNaN(slot) || Number.isNaN(val)) return;
        if (slot === 22) {
            veh.setLights(2);
            if (val < 0) {
                veh.toggleMod(22, false);
                mp.game.invoke('0xE41033B25D003A07', veh.handle, 255);
            } else {
                veh.toggleMod(22, true);
                mp.game.invoke('0xE41033B25D003A07', veh.handle, val);
            }
        } else if (slot === 18) {
            if (val < 0) veh.toggleMod(18, false);
            else {
                veh.toggleMod(18, true);
                veh.setMod(18, Math.max(0, val));
            }
        } else {
            veh.setMod(slot, val);
        }
    });
    if (Array.isArray(tuning.primary) && tuning.primary.length >= 3) {
        veh.setCustomPrimaryColour(tuning.primary[0], tuning.primary[1], tuning.primary[2]);
    }
    if (Array.isArray(tuning.secondary) && tuning.secondary.length >= 3) {
        veh.setCustomSecondaryColour(tuning.secondary[0], tuning.secondary[1], tuning.secondary[2]);
    }
    if (Array.isArray(tuning.colorType)) {
        if (tuning.colorType[0] != null) veh.setModColor1(Number(tuning.colorType[0]), 0, 0);
        if (tuning.colorType[1] != null) veh.setModColor2(Number(tuning.colorType[1]), 0, 0);
    }
    veh.setExtraColours(Number(tuning.pearlescent) || 0, Number(tuning.wheelColor) || 0);
    if (tuning.neon && typeof tuning.neon === 'object') {
        for (let i = 0; i < 4; i++) veh.setNeonLightEnabled(i, true);
        veh.setNeonLightsColour(tuning.neon.r || 0, tuning.neon.g || 0, tuning.neon.b || 0);
    } else {
        for (let i = 0; i < 4; i++) veh.setNeonLightEnabled(i, false);
    }
    if (tuning.windowTint != null) {
        try { veh.setWindowTint(Number(tuning.windowTint)); } catch (_e2) {}
    }
}

mp.events.add('lsc:applyTuning:c', (clientId, jsonRaw) => {
    try {
        const veh = findVehicleByClientId(clientId);
        if (!veh || !veh.handle) return;
        const tuning = typeof jsonRaw === 'string' ? JSON.parse(jsonRaw) : jsonRaw;
        applyVehicleTuningClient(veh, tuning);
        const menu = menuMap.get('shop_lsCustom');
        if (menu && menu.isOpen && menu.currentVehicle === veh) {
            menu.savedTuning = JSON.parse(JSON.stringify(tuning));
        }
    } catch (_e) {}
});

mp.events.add('entityStreamIn', (entity) => {
    if (entity.type !== 'vehicle') return;
    const raw = entity.getVariable('vehTuning');
    if (!raw) return;
    try {
        const tuning = typeof raw === 'string' ? JSON.parse(raw) : raw;
        applyVehicleTuningClient(entity, tuning);
    } catch (_e) {}
});

mp.events.addDataHandler('vehTuning', (entity, value) => {
    if (entity.type !== 'vehicle' || !value) return;
    try {
        const tuning = typeof value === 'string' ? JSON.parse(value) : value;
        applyVehicleTuningClient(entity, tuning);
    } catch (_e) {}
});

const LSC_SHOPS = [{
    id: 'LS_CUSTOM_STRAWBERRY',
    position: new mp.Vector3(-21.0142, -1309.3163, 29.2575),
    vehPosition: new mp.Vector3(-14.5, -1304.8, 28.35),
    vehRot: 88,
    cameraPosition: new mp.Vector3(-18.5, -1301.2, 30.8),
    playerExitPosition: new mp.Vector3(-20.5, -1311.5, 29.25),
    vehicleExitPosition: new mp.Vector3(-19.0, -1308.5, 29.0),
    vehicleExitRot: 268
}];

class LSCustomMenu extends Menu {
    constructor() {
        super('shop_lsCustom');
        this.currentVehicle = null;
        this.isInPickup = false;
        this.lastUniversalMods = [];
        this.savedTuning = null;
        this.currentCustom = null;
        this.vehColor = [];
        this.vehData = [];
        this.vehColorWheel = 255;
        this.vehColorP = 255;
        this.camera = null;
        this.cameraData = null;
        this.cameraMode = -1;
        this.cameraEnableMouse = true;

        const cos = Math.cos;
        const sin = Math.sin;

        mp.events.add('lsc:zone', (active, shopId) => {
            const shop = LSC_SHOPS.find((s) => s.id === shopId) || LSC_SHOPS[0];
            if (active) {
                if (!localPlayer.vehicle) return;
                if (localPlayer.vehicle.getClass() === 13) return;
                if (Math.abs(localPlayer.position.z - shop.position.z) > 3) return;
                this.isInPickup = true;
                this.currentCustom = shop;
                global.notifyKeyHelpShow('E', 'войти в LSCustom');
            } else {
                this.isInPickup = false;
                global.notifyKeyHelpHide();
            }
        });

        global.bindGameplayKey(0x45, true, () => {
            if (!this.isInPickup || !this.currentCustom) return;
            if (lsCustomMenuInstance.isOpen) return;
            if (global.disableAllAction) return;
            if (mp.players.local.isTypingInTextChat) return;
            if (mp.game.ui.isPauseMenuActive()) return;
            const now = Date.now();
            if (this._lscStartLock && now - this._lscStartLock < 1500) return;
            this._lscStartLock = now;
            mp.events.callRemote('server_lsCustom_start', this.currentCustom.id);
        });

        mp.events.add('__lsCustom_resetVeh', () => this.resetVehData());

        mp.events.add('__lsCustom_setMod', (slot, idx) => {
            if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
            if (slot === 14) {
                this.currentVehicle.setMod(slot, idx);
                this.currentVehicle.startHorn(2500, mp.game.joaat('HELDDOWN'), false);
            } else if (slot === 55) {
                this.currentVehicle.setWindowTint(idx + 1);
            } else if (slot === 22) {
                this.currentVehicle.setLights(2);
                if (idx < 0) {
                    this.currentVehicle.toggleMod(22, false);
                    mp.game.invoke('0xE41033B25D003A07', this.currentVehicle.handle, 255);
                } else {
                    this.currentVehicle.toggleMod(22, true);
                    mp.game.invoke('0xE41033B25D003A07', this.currentVehicle.handle, idx);
                }
            } else if (slot === 18) {
                if (idx < 0) this.currentVehicle.toggleMod(18, false);
                else {
                    this.currentVehicle.toggleMod(18, true);
                    this.currentVehicle.setMod(18, Math.max(0, idx));
                }
                return;
            }
            this.currentVehicle.setMod(slot, idx);
        });

        mp.events.add('__lsCustom_selectColorType', (which, type) => {
            if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
            if (which === 0) this.currentVehicle.setModColor1(type, 0, 0);
            else this.currentVehicle.setModColor2(type, 0);
        });

        mp.events.add('__lsCustom_setColorWheel', (color) => {
            if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
            this.vehColorWheel = color;
            this.currentVehicle.setExtraColours(this.vehColorP, this.vehColorWheel);
        });

        mp.events.add('__lsCustom_setColorP', (color) => {
            if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
            this.vehColorP = color;
            this.currentVehicle.setExtraColours(this.vehColorP, this.vehColorWheel);
        });

        global.rpc.on('__lsCustom_selectColor', (colors) => {
            if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
            this.currentVehicle.setCustomPrimaryColour(colors[0][0], colors[0][1], colors[0][2]);
            this.currentVehicle.setCustomSecondaryColour(colors[1][0], colors[1][1], colors[1][2]);
        });

        global.rpc.on('__lsCustom_buyColor', async (payload) => {
            const res = await global.rpc.callServer('server_lsCustom_buyColor', payload);
            if (res && (!res.error || res.error === 0)) {
                mp.events.call('clientFunc_notifySuccess', 'Готово');
                if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
                this.commitSavedTuningFromVehicle();
            } else {
                this.resetVehData();
            }
        });

        global.rpc.on('__lsCustom_buyColorType', async (payload) => {
            const res = await global.rpc.callServer('server_lsCustom_buyColorType', payload);
            if (res && (!res.error || res.error === 0)) {
                mp.events.call('clientFunc_notifySuccess', 'Готово');
                this.commitSavedTuningFromVehicle();
            } else {
                this.resetVehData();
            }
        });

        global.rpc.on('__lsCustom_buyColorWheel', async (payload) => {
            const res = await global.rpc.callServer('server_lsCustom_buyColorWheel', payload);
            if (res && (!res.error || res.error === 0)) {
                mp.events.call('clientFunc_notifySuccess', 'Готово');
                this.commitSavedTuningFromVehicle();
            } else {
                this.resetVehData();
            }
        });

        global.rpc.on('__lsCustom_buyColorP', async (payload) => {
            const res = await global.rpc.callServer('server_lsCustom_buyColorP', payload);
            if (res && (!res.error || res.error === 0)) {
                mp.events.call('clientFunc_notifySuccess', 'Готово');
                this.commitSavedTuningFromVehicle();
            } else {
                this.resetVehData();
            }
        });

        global.rpc.on('__lsCustom_buyMod', async (payload) => {
            const res = await global.rpc.callServer('server_lsCustom_buyMod', payload);
            if (res && (!res.error || res.error === 0)) {
                mp.events.call('clientFunc_notifySuccess', 'Готово');
                this.commitSavedTuningFromVehicle();
            } else {
                this.resetVehData();
            }
        });

        global.rpc.on('__lsCustom_buyUniMod', async (payload) => {
            const idx = payload && payload[2];
            const mod = lsCustomMenuInstance.lastUniversalMods && lsCustomMenuInstance.lastUniversalMods[idx];
            if (!mod) return;
            const serverPayload = [payload[0], payload[1], mod.type, mod.modIndex, mod.price];
            const res = await global.rpc.callServer('server_lsCustom_buyUniMod', serverPayload);
            if (res && (!res.error || res.error === 0)) {
                mp.events.call('clientFunc_notifySuccess', 'Готово');
                this.commitSavedTuningFromVehicle();
            } else {
                this.resetVehData();
            }
        });

        global.rpc.on('__lsCustom_selectNeonColor', (rgb) => {
            if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
            for (let i = 0; i < 4; i++) this.currentVehicle.setNeonLightEnabled(i, true);
            this.currentVehicle.setNeonLightsColour(rgb[0], rgb[1], rgb[2]);
        });

        const openHandler = (payload) => {
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch (_e) { return; }
            }
            if (!this.currentCustom) this.currentCustom = LSC_SHOPS[0];
            global.disableAllAction = true;
            global.hideUI(true);
            if (this.currentCustom) {
                localPlayer.setCoordsNoOffset(
                    this.currentCustom.position.x,
                    this.currentCustom.position.y,
                    this.currentCustom.position.z + 1,
                    false, false, false
                );
            }
            localPlayer.setAlpha(0);
            const vehId = payload.vehId;
            let attempts = 70;
            mp.game.cam.doScreenFadeOut(500);
            const waitVeh = setInterval(() => {
                const veh = mp.vehicles.atRemoteId(vehId);
                if (!veh || !veh.handle) {
                    if (--attempts <= 0) {
                        clearInterval(waitVeh);
                        global.disableAllAction = false;
                        global.hideUI(false);
                        localPlayer.setAlpha(255);
                        if (this.camera && mp.cameras.exists(this.camera)) this.camera.destroy();
                        mp.game.cam.renderScriptCams(false, true, 1000, false, false);
                        mp.game.cam.doScreenFadeIn(500);
                    }
                    return;
                }
                clearInterval(waitVeh);
                veh.setCoordsNoOffset(
                    this.currentCustom.vehPosition.x,
                    this.currentCustom.vehPosition.y,
                    this.currentCustom.vehPosition.z + 0.1,
                    false, false, false
                );
                veh.setHeading(this.currentCustom.vehRot);
                this.currentVehicle = veh;
                this.saveVehData();
                const extra = veh.getExtraColours(1, 1);
                this.vehColorWheel = extra.wheelColor;
                this.vehColorP = extra.pearlescentColor;
                payload.isMoto = veh.getClass() === 8 || veh.getClass() === 13;
                try { mp.game.invoke('0x1F2AA07F00B3217A', veh.handle, 0); } catch (_eKit) {}
                payload.modsCount = {};
                [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 18, 22, 23, 24, 48, 55].forEach((modType) => {
                    const list = [-1];
                    for (let i = 0; i < veh.getNumMods(modType); i++) list.push(i);
                    payload.modsCount[String(modType)] = list;
                });
                const prim = veh.getCustomPrimaryColour(0, 0, 0);
                payload.firstColor = [prim.r, prim.g, prim.b];
                const sec = veh.getCustomSecondaryColour(0, 0, 0);
                payload.secondColor = [sec.r, sec.g, sec.b];
                const noRoof = [mp.game.joaat('comet3'), mp.game.joaat('comet4'), mp.game.joaat('comet5'),
                    mp.game.joaat('revolter'), mp.game.joaat('jb7002'), mp.game.joaat('savestra')];
                if (noRoof.indexOf(veh.getModel()) !== -1) payload.modsCount['10'] = [-1];
                payload.universalMods = buildUniversalModsList(veh, payload.modPrice || {});
                lsCustomMenuInstance.lastUniversalMods = payload.universalMods;
                mp.game.cam.doScreenFadeIn(500);
                global.notifyKeyHelpHide();
                this.isInPickup = false;
                openMenu(this, payload);
            }, 550);
        };

        global.rpc.on('client_lsCustom_open', openHandler);
        mp.events.add('client.lsc.open', openHandler);

        this.renderEvent = () => {
            if (!this.cameraEnableMouse || !this.cameraData || !this.camera) return;
            if (mp.game.controls.isDisabledControlPressed(0, 241)) {
                this.cameraData.dist = Math.max(this.cameraData.dist - 0.1, this.cameraData.minDist);
            } else if (mp.game.controls.isDisabledControlPressed(0, 242)) {
                this.cameraData.dist = Math.min(this.cameraData.dist + 0.1, this.cameraData.maxDist);
            }
            this.camera.setCoord(
                this.cameraData.toPoint.x + this.cameraData.dist * cos(0.0174533 * this.cameraData.angleX),
                this.cameraData.toPoint.y + this.cameraData.dist * sin(0.0174533 * this.cameraData.angleX),
                this.cameraData.toPoint.z + (this.cameraData.dist / 2) * sin(0.0174533 * this.cameraData.angleY)
            );
            if (!mp.game.controls.isDisabledControlPressed(0, 106)) return;
            const dx = mp.game.controls.getDisabledControlNormal(0, 220);
            const dy = mp.game.controls.getDisabledControlNormal(0, 221);
            if (dx !== 0 || dy !== 0) {
                this.cameraData.angleX += 2.5 * dx;
                this.cameraData.angleY += 2.5 * dy;
                this.camera.setCoord(
                    this.cameraData.toPoint.x + this.cameraData.dist * cos(0.0174533 * this.cameraData.angleX),
                    this.cameraData.toPoint.y + this.cameraData.dist * sin(0.0174533 * this.cameraData.angleX),
                    this.cameraData.toPoint.z + (this.cameraData.dist / 2) * sin(0.0174533 * this.cameraData.angleY)
                );
            }
        };

        mp.events.add('__lsCustom_selectTab', (tab) => {
            if (!mp.vehicles.exists(this.currentVehicle)) return;
            this.resetVehData();
            if ([-1, 14, 22, 48, 55, -20].includes(tab)) tab = -1;
            if ([5, 6, 10].includes(tab)) tab = 5;
            if (tab === 11 || tab === 18) tab = 11;
            else if (tab === 12 || tab === 13 || tab === 15) tab = tab;
            else if (tab === 23 || tab === 24) tab = tab;
            if (tab === 11) this.currentVehicle.setDoorOpen(4, false, false);
            else this.currentVehicle.setDoorShut(4, false);
            if (tab === this.cameraMode) return;
            this.cameraMode = tab;
            this.cameraData = this.cameraGetDefaultData();
            const prev = this.camera;
            this.camera = mp.cameras.new('GAMEPLAY', this.cameraData.position, this.cameraData.rot, 60);
            this.camera.pointAtCoord(this.cameraData.toPoint.x, this.cameraData.toPoint.y, this.cameraData.toPoint.z);
            if (prev && mp.cameras.exists(prev)) {
                this.camera.setActiveWithInterp(prev.handle, 500, 0, 0);
                setTimeout(() => { if (mp.cameras.exists(prev)) prev.destroy(); }, 2000);
            } else {
                this.camera.setActive(true);
            }
        });

        mp.events.add('__lsCustom_enableMouse', (enabled) => {
            this.cameraEnableMouse = enabled;
        });
    }

    saveVehData() {
        if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
        this.savedTuning = captureTuningFromVehicleClient(this.currentVehicle);
        this.vehData = [];
        for (let i = 0; i < 50; i++) this.vehData[i] = this.currentVehicle.getMod(i);
        const p = this.currentVehicle.getCustomPrimaryColour(0, 0, 0);
        const s = this.currentVehicle.getCustomSecondaryColour(0, 0, 0);
        this.vehColor = [[p.r, p.g, p.b], [s.r, s.g, s.b]];
        const extra = this.currentVehicle.getExtraColours(1, 1);
        this.vehColorWheel = extra.wheelColor;
        this.vehColorP = extra.pearlescentColor;
    }

    commitSavedTuningFromVehicle() {
        if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
        this.savedTuning = captureTuningFromVehicleClient(this.currentVehicle);
        this.vehData = [];
        for (let i = 0; i < 50; i++) this.vehData[i] = this.currentVehicle.getMod(i);
    }

    resetVehData() {
        if (!mp.vehicles.exists(this.currentVehicle) || !this.currentVehicle.handle) return;
        if (this.savedTuning) applyVehicleTuningClient(this.currentVehicle, this.savedTuning);
        else {
            for (let i = 0; i < this.vehData.length; i++) this.currentVehicle.setMod(i, this.vehData[i]);
            if (this.vehColor.length >= 2) {
                this.currentVehicle.setCustomPrimaryColour(this.vehColor[0][0], this.vehColor[0][1], this.vehColor[0][2]);
                this.currentVehicle.setCustomSecondaryColour(this.vehColor[1][0], this.vehColor[1][1], this.vehColor[1][2]);
            }
            this.currentVehicle.setExtraColours(this.vehColorP, this.vehColorWheel);
        }
        this.currentVehicle.setDoorShut(4, true);
    }

    afterOpen() {
        global.discordUpdate('Тюнингует транспорт');
        if (this.camera && mp.cameras.exists(this.camera)) this.camera.destroy();
        this.cameraMode = -1;
        this.cameraEnableMouse = true;
        this.cameraData = this.cameraGetDefaultData();
        this.camera = mp.cameras.new('GAMEPLAY', this.cameraData.position, this.cameraData.rot, 60);
        this.camera.pointAtCoord(this.cameraData.toPoint.x, this.cameraData.toPoint.y, this.cameraData.toPoint.z);
        this.camera.setActive(true);
        mp.game.cam.renderScriptCams(true, true, 1000, false, false);
        global.disableAllAction = true;
        mp.events.add('render', this.renderEvent);
    }

    cameraGetDefaultData() {
        let bone = 'chassis_dummy';
        let offset = [-4, 4, 2];
        let maxMul = 1.5;
        if (this.cameraMode === 0) offset = [1.5, -4, 1];
        else if (this.cameraMode === 1 || this.cameraMode === 2) offset = [0, this.cameraMode === 1 ? 3 : -3, 0.5];
        else if (this.cameraMode === 4) { bone = 'exhaust'; offset = [0, -1, 0]; }
        else if (this.cameraMode === 5) offset = [-1, 1, 2.5];
        else if (this.cameraMode === 7 || this.cameraMode === 11 || this.cameraMode === 18) { bone = 'bonnet'; offset = [-1, 2, 1]; }
        else if (this.cameraMode === 12) { offset = [-2.5, 0, 0.3]; maxMul = 2.2; }
        else if (this.cameraMode === 13) { bone = 'bonnet'; offset = [-1.5, 1.5, 1]; }
        else if (this.cameraMode === 15) { offset = [-2.2, 0, 0]; maxMul = 2.5; }
        else if (this.cameraMode === 23 || this.cameraMode === 24) {
            bone = this.cameraMode === 23 ? 'wheel_lf' : 'wheel_lr';
            offset = [-1, 0, 0];
        } else if (this.cameraMode === -30) { bone = 'neon_l'; offset = [-1, 0, 0]; }

        let point = this.currentVehicle.getWorldPositionOfBone(this.currentVehicle.getBoneIndexByName(bone));
        if (point.x === 0 && point.y === 0 && point.z === 0) point = this.currentVehicle.position;
        const pos = mp.game.object.getObjectOffsetFromCoords(
            point.x, point.y, point.z, this.currentVehicle.getHeading(), offset[0], offset[1], offset[2]
        );
        const dist = Math.sqrt((point.x - pos.x) ** 2 + (point.y - pos.y) ** 2);
        return {
            position: pos,
            rot: new mp.Vector3(0, 0, 90),
            toPoint: point,
            dist,
            minDist: dist * 0.5,
            maxDist: dist * maxMul,
            angleX: 180 * Math.atan2(pos.y - point.y, pos.x - point.x) / Math.PI,
            angleY: 180 * Math.atan2(pos.z - point.z, pos.x - point.x) / Math.PI
        };
    }

    onClose() {
        global.discordUpdate();
        this.resetVehData();
        if (this.currentCustom) {
            mp.events.callRemote(
                'server_lsCustom_end',
                this.currentCustom.id,
                this.currentCustom.vehicleExitPosition.x,
                this.currentCustom.vehicleExitPosition.y,
                this.currentCustom.vehicleExitPosition.z,
                this.currentCustom.vehicleExitRot
            );
            localPlayer.setCoordsNoOffset(
                this.currentCustom.playerExitPosition.x,
                this.currentCustom.playerExitPosition.y,
                this.currentCustom.playerExitPosition.z,
                false, false, false
            );
        }
        mp.events.remove('render', this.renderEvent);
        mp.game.cam.doScreenFadeOut(900);
        setTimeout(() => {
            mp.game.cam.doScreenFadeIn(900);
            global.disableAllAction = false;
            localPlayer.setAlpha(255);
            if (this.camera && mp.cameras.exists(this.camera)) this.camera.destroy();
            mp.game.cam.renderScriptCams(false, false, 0, false, false);
            setTimeout(() => global.hideUI(false), 800);
        }, 900);
    }
}

const lsCustomMenuInstance = new LSCustomMenu();
global.isLsCustomOpen = () => !!(lsCustomMenuInstance && lsCustomMenuInstance.isOpen);
global.tryCloseLsCustomEsc = () => {
    if (lsCustomMenuInstance.isOpen) {
        closeMenu(lsCustomMenuInstance);
        return true;
    }
    return false;
};

(function registerLscBrowserOverlay() {
    const tryReg = () => {
        if (typeof global.registerActiveBrowserOverlay !== 'function') return false;
        global.registerActiveBrowserOverlay(() => {
            try {
                if (typeof global.isLsCustomOpen === 'function' && global.isLsCustomOpen()) {
                    return global.menuBrowser || null;
                }
            } catch (_e) {}
            return null;
        });
        return true;
    };
    if (!tryReg()) setTimeout(tryReg, 800);
})();
}
