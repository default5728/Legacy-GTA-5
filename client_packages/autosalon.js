/** Автосалон — UI GTA5DM (autosalon-yk), каталог и цены синхронизированы с packages/server/autosalon.js */
const AUTOSALON_VEHICLES = [
    { id: 101, brand: 'Mercedes-Benz', title: 'CLK GTR 1998', model: '98clk', class: 'exclusive', price: 450000, maxSpeed: 320, currency: '$' },
    { id: 102, brand: 'Tesla', title: 'Roadster 2020', model: 'tesroad20', class: 'exclusive', price: 650000, maxSpeed: 320, currency: '$' },
    { id: 103, brand: 'Lada', title: 'Samara 2108', model: '2108320', class: 'basic', price: 30000, maxSpeed: 165, currency: '$' },
    { id: 104, brand: 'Lada', title: 'Samara 2109', model: '2109320', class: 'basic', price: 32000, maxSpeed: 165, currency: '$' },
    { id: 105, brand: 'Lada', title: 'Samara 21099', model: '2109920', class: 'basic', price: 34000, maxSpeed: 170, currency: '$' },
    { id: 106, brand: 'Lada', title: 'Samara 2113', model: '21134', class: 'basic', price: 40000, maxSpeed: 175, currency: '$' },
    { id: 107, brand: 'Lada', title: 'Samara 2114', model: '21144', class: 'basic', price: 42000, maxSpeed: 175, currency: '$' },
    { id: 108, brand: 'Lada', title: 'Samara 2115', model: '21154', class: 'basic', price: 44000, maxSpeed: 175, currency: '$' },
    { id: 109, brand: 'Lada', title: 'Samara 2347', model: '2347', class: 'basic', price: 35000, maxSpeed: 160, currency: '$' },
    { id: 110, brand: 'Lada', title: 'Samara 21093', model: '21093099ip', class: 'basic', price: 38000, maxSpeed: 170, currency: '$' },
    { id: 111, brand: 'Lada', title: 'Samara 2114 16V', model: '211415p', class: 'basic', price: 48000, maxSpeed: 190, currency: '$' },

    { id: 1, brand: 'Lada', title: '2107', model: 'lada2107', class: 'basic', price: 35000, maxSpeed: 160, currency: '$' },
    { id: 2, brand: 'Audi', title: 'Sport', model: 'audisport', class: 'basic', price: 85000, maxSpeed: 280, currency: '$' },
    { id: 3, brand: 'Mercedes', title: '2022 C63', model: '2022c63', class: 'premium', price: 150000, maxSpeed: 300, currency: '$' },
    { id: 4, brand: 'Audi', title: 'Q8', model: 'audiq8', class: 'premium', price: 220000, maxSpeed: 250, currency: '$' },
    { id: 5, brand: 'Audi', title: 'RS 7', model: '2020rs7', class: 'premium', price: 300000, maxSpeed: 310, currency: '$' },
    { id: 6, brand: 'Lamborghini', title: 'Sian', model: 'rmodsian', class: 'exclusive', price: 425000, maxSpeed: 325, currency: '$' },
    { id: 7, brand: 'Bugatti', title: 'Chiron 17', model: 'chiron17', class: 'exclusive', price: 550000, maxSpeed: 320, currency: '$' },
    { id: 8, brand: 'Toyota', title: 'Alphard', model: 'alphard', class: 'basic', price: 145000, maxSpeed: 180, currency: '$' },
    { id: 9, brand: 'BMW', title: 'i8', model: 'i8', class: 'premium', price: 275000, maxSpeed: 250, currency: '$' },
    { id: 10, brand: 'BMW', title: 'iX', model: 'bmwix', class: 'premium', price: 250000, maxSpeed: 250, currency: '$' },
    { id: 11, brand: 'BMW', title: 'M5', model: '2019m5', class: 'premium', price: 360000, maxSpeed: 305, currency: '$' },
    { id: 12, brand: 'Aston Martin', title: 'DB11', model: 'astondb11', class: 'exclusive', price: 575000, maxSpeed: 322, currency: '$' },
    { id: 13, brand: 'Ferrari', title: '458', model: 'fera458', class: 'exclusive', price: 650000, maxSpeed: 325, currency: '$' },
    { id: 14, brand: 'Lada', title: 'Raven 2021', model: '2021ladaraven', class: 'exclusive', price: 450000, maxSpeed: 310, currency: '$' },
    { id: 15, brand: 'Bugatti', title: 'Tourbillon', model: 'tourbillon', class: 'exclusive', price: 500, maxSpeed: 340, currency: 'DP' },
    { id: 16, brand: 'Ferrari', title: '812 Superfast', model: '812superfast', class: 'exclusive', price: 700, maxSpeed: 340, currency: 'DP' },
    { id: 17, brand: 'Pininfarina', title: 'Battista', model: 'battista', class: 'exclusive', price: 800, maxSpeed: 350, currency: 'DP' },
    { id: 18, brand: 'Mercedes', title: 'AMG ONE', model: 'amgone1', class: 'exclusive', price: 850, maxSpeed: 352, currency: 'DP' },
    { id: 19, brand: 'Koenigsegg', title: 'Gemera', model: 'gemera', class: 'exclusive', price: 950, maxSpeed: 400, currency: 'DP' },
    { id: 20, brand: 'Koenigsegg', title: 'Agera RS', model: 'agerars', class: 'exclusive', price: 1100, maxSpeed: 447, currency: 'DP' },
    { id: 21, brand: 'Oppressor', title: 'Mk II', model: 'oppressor2', class: 'exclusive', price: 300, maxSpeed: 130, currency: 'DP' },
    { id: 22, brand: 'Aston Martin', title: 'Valkyrie Spider', model: 'valkyriespider', class: 'exclusive', price: 2000, maxSpeed: 350, currency: 'DP' },
    { id: 23, brand: 'Bugatti', title: 'Divo', model: 'divo', class: 'exclusive', price: 1000, maxSpeed: 380, currency: 'DP' },
    { id: 24, brand: 'Lotus', title: 'EXP 100', model: 'exp100', class: 'exclusive', price: 500, maxSpeed: 350, currency: 'DP' }
];
const speedRules = require('./shared/vehicle-dynamics');
for(const row of AUTOSALON_VEHICLES)if(row.model !== 'oppressor2')row.maxSpeed=speedRules.scaleSpeed(row.maxSpeed);

const PREVIEW_POS = new mp.Vector3(-41.574700927734375, -1097.556640625, 26.422353744506836);
const PREVIEW_HEADING_DEFAULT = -140.61891174316406;
/** Педа прячем за камерой, не у машины на витрине */
const PLAYER_HIDE_POS = new mp.Vector3(-33.85, -1106.55, 25.95);

function parseMoneyVar(raw) {
    return Number(String(raw == null ? '0' : raw).replace(/\./g, '').replace(/\s/g, '')) || 0;
}

function buildAutosalonStorePayload(preferredModel) {
    const lp = mp.players.local;
    const cash = parseMoneyVar(lp.getVariable('money'));
    const dp = parseMoneyVar(lp.getVariable('dp'));
    const hasFamily = !!(lp.getVariable('family') || lp.getVariable('familyName'));
    return {
        family: hasFamily,
        wallets: { cash, dp },
        vehicles: AUTOSALON_VEHICLES.slice(),
        preferredModel: preferredModel || lastSelectedModel || null
    };
}

const autosalonBrowser = mp.browsers.new('package://browsers/autosalon-yk/index.html?v=10');
autosalonBrowser.active = false;

let autosalonSceneOpen = false;
let autosalonReopenToken = 0;
let lastSelectedModel = null;
let selectcar = null;
let modelveh = null;
let previewHeading = PREVIEW_HEADING_DEFAULT;
let showroomCamera = null;
let playerHiddenForShowroom = false;

global.isAutosalonOpen = function isAutosalonOpen() {
    return autosalonSceneOpen === true;
};

if (typeof global.registerActiveBrowserOverlay === 'function') {
    global.registerActiveBrowserOverlay(() => (autosalonSceneOpen ? autosalonBrowser : null));
}

function releaseAutosalonCursor() {
    try {
        mp.gui.cursor.show(false, false);
        mp.gui.cursor.visible = false;
    } catch (_e) {}
}

function showAutosalonCursor() {
    try {
        mp.gui.cursor.show(true, true);
        mp.gui.cursor.visible = true;
    } catch (_e) {}
}

function hideLocalPlayerForShowroom() {
    playerHiddenForShowroom = true;
    try {
        const p = mp.players.local;
        p.position = PLAYER_HIDE_POS;
        p.freezePosition(true);
        p.setAlpha(0);
        p.setVisible(false, false);
        try { p.setCollision(false, false); } catch (_c) {}
    } catch (_e) {}
}

function showLocalPlayerAfterShowroom() {
    playerHiddenForShowroom = false;
    try {
        const p = mp.players.local;
        p.setAlpha(255);
        p.setVisible(true, true);
        try { p.setCollision(true, false); } catch (_c) {}
        p.freezePosition(false);
    } catch (_e) {}
}

function destroyShowroomCamera() {
    if (showroomCamera) {
        try {
            showroomCamera.setActive(false);
            showroomCamera.destroy();
        } catch (_e) {}
        showroomCamera = null;
    }
    try {
        mp.game.cam.renderScriptCams(false, false, 0, true, false);
    } catch (_e2) {}
}

function setupShowroomCamera() {
    destroyShowroomCamera();
    const camPos = new mp.Vector3(-35.494720458984375, -1104.6318359375, 27.475976943969727);
    const lookAt = new mp.Vector3(PREVIEW_POS.x, PREVIEW_POS.y, PREVIEW_POS.z + 0.45);
    showroomCamera = mp.cameras.new('default', camPos, new mp.Vector3(0, 0, 0), 50);
    try {
        showroomCamera.pointAtCoord(lookAt.x, lookAt.y, lookAt.z);
    } catch (_e) {
        showroomCamera.setRot(0, 0, 39.27507781982422, 2);
    }
    showroomCamera.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
}

function pushAutosalonStore(preferredModel) {
    if (!autosalonBrowser || !mp.browsers.exists(autosalonBrowser)) return;
    if (!autosalonSceneOpen) return;
    const payload = buildAutosalonStorePayload(preferredModel);
    try {
        autosalonBrowser.execute(
            '(function(){try{if(window.autosalonYk)window.autosalonYk.load(' +
                JSON.stringify(payload) +
                ');}catch(_e){}})();'
        );
    } catch (_e) {}
}

function showAutosalonUi(preferredModel) {
    if (!autosalonBrowser || !mp.browsers.exists(autosalonBrowser)) return;
    if (!autosalonSceneOpen) return;
    autosalonBrowser.active = true;
    pushAutosalonStore(preferredModel);
    const token = autosalonReopenToken;
    setTimeout(() => {
        if (!autosalonSceneOpen || token !== autosalonReopenToken) return;
        try { autosalonBrowser.active = true; } catch (_e) {}
        pushAutosalonStore(preferredModel);
    }, 200);
    setTimeout(() => {
        if (!autosalonSceneOpen || token !== autosalonReopenToken) return;
        try { autosalonBrowser.active = true; } catch (_e) {}
        pushAutosalonStore(preferredModel);
    }, 550);
}

function hideAutosalonUi() {
    if (!autosalonBrowser || !mp.browsers.exists(autosalonBrowser)) return;
    try {
        autosalonBrowser.execute(
            '(function(){try{if(window.autosalonYk)window.autosalonYk.unload();}catch(_e){}})();'
        );
    } catch (_e) {}
    autosalonBrowser.active = false;
}

function destroyPreviewCar(clearModel) {
    if (selectcar) {
        try {
            if (mp.vehicles.exists(selectcar)) selectcar.destroy();
        } catch (_e) {}
        selectcar = null;
    }
    if (clearModel !== false) modelveh = null;
    previewHeading = PREVIEW_HEADING_DEFAULT;
}

function stabilizePreviewCar(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return;
    try { veh.freezePosition(true); } catch (_e) {}
    try { veh.setInvincible(true); } catch (_e2) {}
    try { veh.setProofs(true, true, true, true, true, true, true, true); } catch (_e3) {}
    try { veh.setOnGroundProperly(); } catch (_e4) {}
    try { veh.freezePosition(true); } catch (_e5) {}
    try { veh.setVelocity(new mp.Vector3(0, 0, 0)); } catch (_e6) {}
}

function applyPreviewHeading(heading) {
    if (!selectcar || !mp.vehicles.exists(selectcar)) return;
    previewHeading = heading;
    try {
        // Только heading — НЕ трогаем position (это давало «прыжок» вверх).
        selectcar.setHeading(previewHeading);
        selectcar.freezePosition(true);
    } catch (_e) {
        try {
            selectcar.setRotation(0, 0, previewHeading, 2, true);
            selectcar.freezePosition(true);
        } catch (_e2) {}
    }
}

function spawnPreviewCar(model) {
    if (!autosalonSceneOpen || !model) return;
    if (modelveh === model && selectcar && mp.vehicles.exists(selectcar)) return;

    destroyPreviewCar(false);
    previewHeading = PREVIEW_HEADING_DEFAULT;
    try {
        selectcar = mp.vehicles.new(mp.game.joaat(model), PREVIEW_POS, {
            heading: previewHeading,
            numberPlate: 'flow',
            locked: true,
            engine: false,
            dimension: 124
        });
        modelveh = model;
        lastSelectedModel = model;
        stabilizePreviewCar(selectcar);
        setTimeout(() => stabilizePreviewCar(selectcar), 50);
        setTimeout(() => {
            if (selectcar && mp.vehicles.exists(selectcar)) applyPreviewHeading(previewHeading);
        }, 80);
    } catch (_e) {
        selectcar = null;
        modelveh = null;
    }
}

global.getAutosalonBrowser = function getAutosalonBrowser() {
    return autosalonBrowser;
};

global.tryCloseAutosalonEsc = function tryCloseAutosalonEsc() {
    if (!autosalonSceneOpen) return false;
    if (!autosalonBrowser || !autosalonBrowser.active) return false;
    mp.events.call('closeautosalon');
    return true;
};

function suppressWorldUiForAutosalon() {
    try {
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
        if (typeof global.enforceChatHiddenForOverlay === 'function') global.enforceChatHiddenForOverlay();
        mp.events.call('hud', false);
        mp.events.call('help', false);
        mp.events.call('hudKeyHints', false);
        mp.events.call('c:minimap', false);
        mp.game.ui.displayRadar(false);
        mp.game.ui.displayHud(false);
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
    } catch (_e) {}
}

function restoreWorldUiAfterAutosalon() {
    try {
        mp.events.call('c:minimap', true);
        mp.game.ui.displayRadar(true);
        mp.events.callRemote('showHud:SERVER');
        if (typeof global.applyChatPresentation === 'function') {
            global.applyChatPresentation();
            setTimeout(() => {
                try { global.applyChatPresentation(); } catch (_e2) {}
            }, 120);
        }
        if (typeof global.scheduleWorldChromeRestoreAfterModal === 'function') {
            global.scheduleWorldChromeRestoreAfterModal();
        } else if (typeof global.showWorldUiAfterModal === 'function') {
            global.showWorldUiAfterModal();
        } else if (typeof global.forceRestoreWorldUiChrome === 'function') {
            global.forceRestoreWorldUiChrome();
        } else {
            mp.events.call('hud', true);
            mp.events.call('help', true);
        }
    } catch (_e) {}
}

function softHudForTestDrive() {
    try {
        mp.events.call('c:minimap', true);
        mp.game.ui.displayRadar(true);
        mp.game.ui.displayHud(true);
        mp.events.call('hud', true);
        mp.events.callRemote('showHud:SERVER');
        if (typeof global.applyChatPresentation === 'function') global.applyChatPresentation();
    } catch (_e) {}
}

function isLocalPlayerInVehicle() {
    try {
        const p = mp.players.local;
        if (p.vehicle) return true;
        if (typeof p.isInAnyVehicle === 'function' && p.isInAnyVehicle(false)) return true;
        const h = p.handle;
        if (h && mp.game.ped.isPedInAnyVehicle(h, false)) return true;
    } catch (_e) {}
    return false;
}

function openAutosalonScene(opts) {
    opts = opts || {};
    if (isLocalPlayerInVehicle()) {
        try {
            mp.events.call('notify:client', 2, 'top-mid', 'Выйдите из транспорта, чтобы открыть автосалон.', 2500);
        } catch (_n) {}
        return;
    }
    const preferred = opts.preferredModel || lastSelectedModel || modelveh || null;
    autosalonReopenToken++;
    autosalonSceneOpen = true;
    showAutosalonCursor();
    suppressWorldUiForAutosalon();
    mp.events.callRemote('s:setvarshopc', true);
    hideLocalPlayerForShowroom();
    setupShowroomCamera();
    mp.events.callRemote('autosalon:status', true);
    showAutosalonUi(preferred);

    if (preferred) {
        const token = autosalonReopenToken;
        setTimeout(() => {
            if (!autosalonSceneOpen || token !== autosalonReopenToken) return;
            hideLocalPlayerForShowroom();
            spawnPreviewCar(preferred);
        }, 250);
        setTimeout(() => {
            if (!autosalonSceneOpen || token !== autosalonReopenToken) return;
            hideLocalPlayerForShowroom();
            spawnPreviewCar(preferred);
            setupShowroomCamera();
        }, 600);
    } else {
        setTimeout(() => {
            if (autosalonSceneOpen) hideLocalPlayerForShowroom();
        }, 100);
    }
}

mp.events.add('browserDomReady', (browser) => {
    if (browser === autosalonBrowser && autosalonSceneOpen) {
        showAutosalonUi(lastSelectedModel);
    }
});

function resolveAutosalonModel(item) {
    const model = item != null && String(item).trim();
    if (model) return model;
    if (modelveh) return modelveh;
    if (lastSelectedModel) return lastSelectedModel;
    return null;
}

mp.events.add('c:autoSalonBuyFamily', (item) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    const model = resolveAutosalonModel(item);
    if (!model) return mp.events.call('notify:client', 2, 'top-mid', 'Выберите машину.', 3000);
    mp.events.callRemote('s:autoSalonBuyFamily', model);
});

mp.events.add('c:autoSalonBuy', (item) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();
    const model = resolveAutosalonModel(item);
    if (!model) return mp.events.call('notify:client', 2, 'top-mid', 'Выберите машину.', 3000);
    mp.events.callRemote('s:autoSalonBuy', model);
});

mp.events.add('autosalon:yk:select', (model) => {
    mp.events.call('autosalon:select', model);
});

mp.events.add('autosalon:yk:rotate', (delta) => {
    if (!autosalonSceneOpen) return;
    if (!selectcar || !mp.vehicles.exists(selectcar)) return;
    const d = Number(delta);
    if (!d || Number.isNaN(d)) return;
    let h = previewHeading + d;
    while (h > 180) h -= 360;
    while (h < -180) h += 360;
    applyPreviewHeading(h);
});

global.bindGameplayKey(0x45, true, () => {
    if(typeof global.isWorldNpcNearby==='function'&&global.isWorldNpcNearby())return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (isLocalPlayerInVehicle()) return;
    if (mp.players.local.dimension !== 0) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (mp.players.local.getVariable('testdrivetwo') === true) return;
    if (mp.players.local.getVariable('testdriveone') === true) return;
    if (mp.players.local.getVariable('shopc') === true) return;
    if (autosalonSceneOpen) return;

    if (mp.players.local.getVariable('autosalonc') === true) {
        openAutosalonScene();
    }
});

mp.events.add('closeautosalon', () => {
    if (mp.players.local.getVariable('testdrivetwo') === true) return;
    autosalonReopenToken++;
    autosalonSceneOpen = false;
    hideAutosalonUi();
    releaseAutosalonCursor();
    destroyShowroomCamera();
    destroyPreviewCar(true);
    showLocalPlayerAfterShowroom();
    mp.events.callRemote('autosalon:status', false);
    mp.events.callRemote('s:setvarshopc', false);
    restoreWorldUiAfterAutosalon();
});

mp.events.add('autosalon:select', (model) => {
    if (!autosalonSceneOpen) return;
    if (!model) return;
    if (modelveh === model && selectcar && mp.vehicles.exists(selectcar)) return;
    if (new Date().getTime() - mp.players.local.clicked < 150) return;
    mp.players.local.clicked = new Date().getTime();
    lastSelectedModel = model;
    spawnPreviewCar(model);
});

mp.events.add('autosalon:testdrive:start:c', () => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
    }
    mp.players.local.clicked = new Date().getTime();

    const driveModel = modelveh || lastSelectedModel;
    if (!driveModel) return mp.events.call('notify:client', 2, 'top-mid', 'Выберите машину.', 3000);
    if (mp.players.local.vehicle) return mp.events.call('notify:client', 2, 'top-mid', 'Выйдите из машины.', 3000);
    if (mp.players.local.getVariable('ygon')) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Вы не можете запустить тест-драйв, пока у вас активный квест.', 3000);
    }
    if (mp.players.local.getVariable('testdriveone') || mp.players.local.getVariable('testdrivetwo')) {
        return mp.events.call('notify:client', 2, 'top-mid', 'Вы уже в тест драйве.', 3000);
    }

    lastSelectedModel = driveModel;
    autosalonReopenToken++;
    autosalonSceneOpen = false;
    hideAutosalonUi();
    releaseAutosalonCursor();
    destroyShowroomCamera();
    destroyPreviewCar(true);
    showLocalPlayerAfterShowroom();
    modelveh = driveModel;
    mp.events.callRemote('s:setvarshopc', false);
    softHudForTestDrive();
    mp.events.callRemote('autosalon:testdrive:start:s', driveModel);
});

mp.events.add('autosalon:testdrive:final:c', (savedModel) => {
    if (savedModel) lastSelectedModel = String(savedModel);
    const preferred = lastSelectedModel || modelveh;
    const token = ++autosalonReopenToken;
    // Сразу прячем педа, чтобы не мелькал у машины.
    hideLocalPlayerForShowroom();
    setTimeout(() => {
        if (token !== autosalonReopenToken) return;
        openAutosalonScene({ preferredModel: preferred });
        try {
            if (autosalonBrowser && mp.browsers.exists(autosalonBrowser)) {
                autosalonBrowser.execute(
                    '(function(){try{if(window.autosalonYk)window.autosalonYk.endTestDrive();}catch(_e){}})();'
                );
            }
        } catch (_e) {}
    }, 200);
});

mp.events.add('render', () => {
    if (!autosalonSceneOpen) return;
    try {
        mp.game.ui.displayHud(false);
        mp.game.ui.displayRadar(false);
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
        mp.game.controls.disableAllControlActions(0);
        try {
            if (!mp.gui.cursor.visible) showAutosalonCursor();
        } catch (_c) {}
        if (showroomCamera) {
            try {
                showroomCamera.setActive(true);
                mp.game.cam.renderScriptCams(true, false, 0, true, false);
            } catch (_cam) {}
        }
        if (playerHiddenForShowroom) {
            try {
                const p = mp.players.local;
                p.setAlpha(0);
                p.setVisible(false, false);
                p.freezePosition(true);
            } catch (_hide) {}
        }
        if (selectcar && mp.vehicles.exists(selectcar)) {
            try { selectcar.freezePosition(true); } catch (_fv) {}
        }
    } catch (_e) {}
});

mp.events.add('updateMoney', () => {
    if (!autosalonSceneOpen) return;
    setTimeout(() => {
        if (autosalonSceneOpen) pushAutosalonStore(lastSelectedModel);
    }, 50);
});

mp.events.addDataHandler('money', (entity) => {
    try {
        if (entity !== mp.players.local) return;
        if (!autosalonSceneOpen) return;
        pushAutosalonStore(lastSelectedModel);
    } catch (_e) {}
});

mp.events.addDataHandler('family', (entity) => {
    try {
        if (entity !== mp.players.local) return;
        if (!autosalonSceneOpen) return;
        pushAutosalonStore(lastSelectedModel);
    } catch (_e) {}
});

mp.events.add('legacy:prices:sync',raw=>{try{const data=JSON.parse(raw);for(const car of AUTOSALON_VEHICLES){const price=data.autosalon&&data.autosalon[car.model];if(Number.isSafeInteger(price)&&price>0)car.price=price;}pushAutosalonStore();}catch(_){}});
let legacyPricesRequested=false;
setInterval(()=>{if(!global.isPlayerSpawned){legacyPricesRequested=false;return;}if(!legacyPricesRequested){legacyPricesRequested=true;mp.events.callRemote('legacy:prices:request');}},1500);

mp.events.add('legacy:world:dealership',()=>{if(!mp.players.local.vehicle&&!autosalonSceneOpen)openAutosalonScene();});
