let lastPress = 0;
let rentCarCef = null;
let rentCarReady = false;
let rentCarOpen = false;
let rentCarPendingOpen = false;
const rentCarQueue = [];

let rentConfirmBr = null;
let rentConfirmOpen = false;
let rentConfirmReady = false;
let rentConfirmPendingShow = false;
let rentConfirmStep = 'greet'; // greet | offer
let rentConfirmAdvanceTimer = null;
const RENT_GREET_DELAY_MS = 2500;
/** Каталог аренды без openNpcDialogModal — блокируем паузу GTA как в магазине одежды. */
const RENT_PAUSE_SUPPRESS_FRAMES = 24;
let rentPauseSuppressFrames = 0;

function blockRentPauseControls() {
    for (let g = 0; g <= 2; g++) {
        mp.game.controls.disableControlAction(g, 156, true);
        mp.game.controls.disableControlAction(g, 199, true);
        mp.game.controls.disableControlAction(g, 200, true);
    }
}

function suppressPauseAfterRentClose() {
    rentPauseSuppressFrames = RENT_PAUSE_SUPPRESS_FRAMES;
    if (typeof global.suppressPauseMenuAfterEsc === 'function') {
        global.suppressPauseMenuAfterEsc();
    }
}

function clearRentConfirmAdvanceTimer() {
    if (rentConfirmAdvanceTimer != null) {
        try { clearTimeout(rentConfirmAdvanceTimer); } catch (_e) {}
        rentConfirmAdvanceTimer = null;
    }
}

function scheduleRentConfirmOffer() {
    clearRentConfirmAdvanceTimer();
    rentConfirmAdvanceTimer = setTimeout(() => {
        rentConfirmAdvanceTimer = null;
        if (!rentConfirmOpen || rentConfirmStep !== 'greet') return;
        rentConfirmStep = 'offer';
        showRentConfirmContent();
    }, RENT_GREET_DELAY_MS);
}

function skipRentConfirmGreet() {
    if (!rentConfirmOpen || rentConfirmStep !== 'greet') return false;
    clearRentConfirmAdvanceTimer();
    rentConfirmStep = 'offer';
    showRentConfirmContent();
    return true;
}
/** Те же точки что colshape на сервере. Спавн новичков — только у NPC аренды (~2.5 м). */
const RENT_ZONE_RADIUS = 2.6;
const FACTIONLESS_HUB_RENT_RADIUS = 2.5;
const RENT_ZONES = [
    { x: -4.780910968780518, y: -1415.6131591796875 },
    { x: 159.190185546875, y: -1726.7152099609375 },
    { x: 924.3528442382812, y: -1567.64501953125 },
    { x: 846.9677124023438, y: -2332.51416015625 },
    { x: 1386.5477294921875, y: -2072.5537109375 },
    { x: 423.1767272949219, y: -976.6810302734375 },
    { x: 331.0845642089844, y: -1399.398193359375 },
    { x: -193.80992126464844, y: -804.4339599609375, r: FACTIONLESS_HUB_RENT_RADIUS },
    { x: -250.7865, y: -2037.3282, r: 2.6 },
    { x: 886.9106, y: -0.4352, r: 2.6 },
    { x: -419.6007, y: -2740.6179, r: 2.6 },
    { x: 155.8669, y: -347.4565, r: 2.6 },
];

function isInRentColshapeSync() {
    try {
        const me = mp.players.local;
        if (!me || me.dimension !== 0) return false;
        if (me.getVariable('inColshapeRentCar') === true) return true;
        if (me.getVariable('inColshapeFactionlessRent') === true) return true;
    } catch (_e) {}
    return false;
}

function isNearFactionlessHubRentZone() {
    try {
        const me = mp.players.local;
        if (!me || me.dimension !== 0) return false;
        const p = me.position;
        const z = { x: -193.80992126464844, y: -804.4339599609375, r: FACTIONLESS_HUB_RENT_RADIUS };
        const dx = p.x - z.x;
        const dy = p.y - z.y;
        if (dx * dx + dy * dy <= z.r * z.r) return true;
    } catch (_e) {}
    return false;
}

function canUseRentCar() {
    if (isInRentColshapeSync()) return true;
    return isNearRentZone();
}

function isNearRentZone() {
    if (isInRentColshapeSync()) return true;
    try {
        const me = mp.players.local;
        if (!me || me.dimension !== 0) return false;
        const p = me.position;
        for (let i = 0; i < RENT_ZONES.length; i++) {
            const z = RENT_ZONES[i];
            const r = z.r != null ? Number(z.r) : RENT_ZONE_RADIUS;
            const dx = p.x - z.x;
            const dy = p.y - z.y;
            if (dx * dx + dy * dy <= r * r) return true;
        }
    } catch (_e) {}
    return false;
}

function setRentCarOpenFlag(open) {
    rentCarOpen = !!open;
    try {
        if (typeof global !== 'undefined') global.__rentCarUiOpen = rentCarOpen;
    } catch (_e) {}
}

function ensureRentConfirmBrowser() {
    if (rentConfirmBr && mp.browsers.exists(rentConfirmBr)) return rentConfirmBr;
    rentConfirmReady = false;
    rentConfirmBr = mp.browsers.new('package://browsers/rentcar/dialog/index.html');
    if (rentConfirmBr) {
        rentConfirmBr.active = false;
        try { rentConfirmBr.orderId = 160; } catch (_e) {}
    }
    return rentConfirmBr;
}

function rentConfirmExec(cmd) {
    try {
        ensureRentConfirmBrowser();
        if (rentConfirmBr && mp.browsers.exists(rentConfirmBr)) rentConfirmBr.execute(cmd);
    } catch (_e) {}
}

function showRentConfirmContent() {
    if (rentConfirmStep === 'offer') {
        clearRentConfirmAdvanceTimer();
        rentConfirmExec('window.rentConfirmDialog && window.rentConfirmDialog.show(' + JSON.stringify({
            actor: 'Арендатор:',
            text: 'Отлично. Могу выдать тебе машину из каталога — оплата наличными, сразу на месте.',
            buttons: [
                { id: 'take', label: 'Взять в аренду' },
                { id: 'leave', label: 'Уйти' }
            ]
        }) + ')');
        return;
    }

    rentConfirmStep = 'greet';
    rentConfirmExec('window.rentConfirmDialog && window.rentConfirmDialog.show(' + JSON.stringify({
        actor: 'Арендатор:',
        text: 'Привет! Нужна тачка на время? Я тут как раз этим и занимаюсь.',
        buttons: []
    }) + ')');
    scheduleRentConfirmOffer();
}

function openRentConfirmDialog() {
    if (rentConfirmOpen) return;
    if (rentCarOpen) closeRentUi();

    ensureRentConfirmBrowser();
    rentConfirmOpen = true;
    rentConfirmStep = 'greet';
    clearRentConfirmAdvanceTimer();
    rentConfirmBr.active = true;

    if (typeof global.openNpcDialogModal === 'function') global.openNpcDialogModal({ freeze: true });
    else if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();

    if (!rentConfirmReady) {
        rentConfirmPendingShow = true;
        return;
    }
    showRentConfirmContent();
}

function closeRentConfirmDialog() {
    if (!rentConfirmOpen && !rentConfirmPendingShow) return;
    rentConfirmOpen = false;
    rentConfirmPendingShow = false;
    rentConfirmStep = 'greet';
    clearRentConfirmAdvanceTimer();
    rentConfirmExec('window.rentConfirmDialog && window.rentConfirmDialog.hide()');
    if (rentConfirmBr && mp.browsers.exists(rentConfirmBr)) rentConfirmBr.active = false;
    if (typeof global.closeNpcDialogModal === 'function') global.closeNpcDialogModal({ unfreeze: true });
    else if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
}

function showRentCursor() {
    try { mp.gui.cursor.show(true, true); } catch (_e) {}
    try { mp.gui.cursor.visible = true; } catch (_e2) {}
}

function hideRentCursor() {
    try { mp.gui.cursor.show(false, false); } catch (_e) {}
    try { mp.gui.cursor.visible = false; } catch (_e2) {}
}

function rentExec(js) {
    const br = getRentBrowser();
    if (!br) return;
    if (!rentCarReady) {
        rentCarQueue.push(js);
        return;
    }
    try { br.execute(js); } catch (_e) {}
}

function flushRentQueue() {
    const br = rentCarCef;
    if (!br || !rentCarReady) return;
    while (rentCarQueue.length) {
        const js = rentCarQueue.shift();
        try { br.execute(js); } catch (_e) {}
    }
}

function getRentBrowser() {
    if (rentCarCef && mp.browsers.exists(rentCarCef)) return rentCarCef;
    rentCarReady = false;
    rentCarCef = mp.browsers.new('package://browsers/rentcar/index.html');
    rentCarCef.active = false;
    rentCarCef.orderId = 150;
    return rentCarCef;
}

function openRentUi() {
    closeRentConfirmDialog();
    const br = getRentBrowser();
    if (!br) return;
    setRentCarOpenFlag(true);
    br.active = true;
    rentExec('try{show();}catch(_e){}');
    const fraction = Number(mp.players.local.getVariable('fraction')) || 0;
    rentExec(`try{autoRent.setFractionContext(${fraction});}catch(_e){}`);
    try { br.execute("try{mp.invoke('focus',true);}catch(_e){}"); } catch (_eFocus) {}
    showRentCursor();
}

function closeRentUi() {
    const br = rentCarCef;
    rentCarPendingOpen = false;
    setRentCarOpenFlag(false);
    if (br && mp.browsers.exists(br)) {
        br.active = false;
        rentExec('try{autoRent.CloseRentModal&&autoRent.CloseRentModal();hideRentCar&&hideRentCar();}catch(_e){}');
    }
    hideRentCursor();
    try { mp.events.call('worldHudRefresh'); } catch (_eHr) {}
    suppressPauseAfterRentClose();
}

mp.events.add('playerReady', () => {
    try { getRentBrowser(); } catch (_e) {}
    try { ensureRentConfirmBrowser(); } catch (_e2) {}
});

mp.events.add('browserDomReady', (browser) => {
    if (browser === rentConfirmBr) {
        rentConfirmReady = true;
        if (rentConfirmPendingShow && rentConfirmOpen) {
            rentConfirmPendingShow = false;
            showRentConfirmContent();
        }
        return;
    }
    if (browser !== rentCarCef) return;
    rentCarReady = true;
    flushRentQueue();
    if (rentCarPendingOpen) {
        rentCarPendingOpen = false;
        if (isNearRentZone()) openRentUi();
    }
});

global.bindGameplayKey(0x20, true, () => {
    if (!rentConfirmOpen || rentConfirmStep !== 'greet') return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    skipRentConfirmGreet();
});

global.bindGameplayKey(0x45, true, () => {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (!canUseRentCar()) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (typeof global.isNpcDialogModalOpen === 'function' && global.isNpcDialogModalOpen() && !rentConfirmOpen) return;
    if (!isNearRentZone()) return;
    const currentTime = Date.now();
    if (currentTime - lastPress < 1000) return;
    lastPress = currentTime;

    if (rentConfirmOpen) {
        closeRentConfirmDialog();
        return;
    }
    if (rentCarOpen) {
        closeRentUi();
        return;
    }
    mp.events.callRemote('s:checkDistanceRentCar');
});

mp.events.add('render', () => {
    if (rentPauseSuppressFrames > 0) {
        rentPauseSuppressFrames--;
        blockRentPauseControls();
    }
    if (rentConfirmOpen || rentCarOpen) {
        blockRentPauseControls();
    }
});

mp.events.add('c:openCefRentCar', () => {
    if (!isNearRentZone()) {
        closeRentConfirmDialog();
        closeRentUi();
        return;
    }
    if (rentCarOpen) {
        closeRentUi();
        return;
    }
    if (rentConfirmOpen) {
        closeRentConfirmDialog();
        return;
    }
    openRentConfirmDialog();
});

mp.events.add('rent:confirm:btn', (actionRaw) => {
    if (!rentConfirmOpen) return;
    const action = String(actionRaw || '');

    if (action === 'skip' || action === 'space') {
        skipRentConfirmGreet();
        return;
    }

    if (action === 'esc') {
        closeRentConfirmDialog();
        return;
    }

    if (action === 'leave') {
        closeRentConfirmDialog();
        return;
    }

    if (action === 'take') {
        if (!isNearRentZone()) {
            closeRentConfirmDialog();
            return;
        }
        if (!rentCarReady) {
            closeRentConfirmDialog();
            rentCarPendingOpen = true;
            getRentBrowser();
            return;
        }
        openRentUi();
    }
});

mp.events.add('rent:close', () => {
    closeRentConfirmDialog();
    closeRentUi();
});

mp.events.add('rent:syncSpawn:c', (vx, vy, vz, vh, skipTeleport) => {
    if (Number(skipTeleport) === 1) return;
    try {
        const lp = mp.players.local;
        if (!lp) return;
        const pos = new mp.Vector3(Number(vx), Number(vy), Number(vz));
        const heading = Number(vh) || 0;
        lp.position = pos;
        if (typeof lp.setHeading === 'function') lp.setHeading(heading);
        else lp.heading = heading;
    } catch (_e) {}
});

mp.events.add('c:rentcarAuto', (veh) => {
    mp.events.callRemote('s:rentCar', veh);
    closeRentUi();
});

if (typeof global !== 'undefined') {
    global.__rentCarUiOpen = false;
    global.isNearRentCarZone = isNearRentZone;
    global.getRentCarBrowser = function () {
        if (rentConfirmOpen) {
            const cbr = rentConfirmBr;
            if (cbr && mp.browsers.exists(cbr) && cbr.active) return cbr;
        }
        if (!rentCarOpen) return null;
        const br = rentCarCef;
        if (!br || !mp.browsers.exists(br) || !br.active) return null;
        return br;
    };
    global.isRentCarUiOpen = function isRentCarUiOpen() {
        return rentCarOpen || rentConfirmOpen;
    };
    global.tryCloseRentEsc = function () {
        if (rentConfirmOpen) {
            closeRentConfirmDialog();
            return true;
        }
        if (!rentCarOpen && !rentCarPendingOpen) return false;
        closeRentUi();
        return true;
    };
}

try { getRentBrowser(); } catch (_prefRent) {}
try { ensureRentConfirmBrowser(); } catch (_prefConfirm) {}
