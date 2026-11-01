let buyGunsr = mp.browsers.new("package://browsers/amunation/index.html");
buyGunsr.active = false;
// Ганшоп поверх HUD: HUD имеет orderId 100, bizwar 115 — делаем 110.
try { buyGunsr.orderId = 110; } catch (_eOrd) {}

const positions = [
    new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875),
    new mp.Vector3(-10.661846160888672, -1419.117919921875, 29.32600212097168),
    new mp.Vector3(924.4903564453125, -1565.514404296875, 30.686203002929688),
    new mp.Vector3(844.349609375, -2332.449951171875, 30.334299087524414),
    new mp.Vector3(1384.0255126953125, -2074.406494140625, 51.998512268066406),
    new mp.Vector3(435.4013977050781, -984.6724853515625, 30.689603805541992),
    new mp.Vector3(-113.97920227050781, -596.5939331054688, 36.28443908691406 - 1.12),
    new mp.Vector3(21.153650283813477, -1107.2838134765625, 29.797000885009766 - 1.12),
    new mp.Vector3(811.0198364257812, -2156.6611328125, 29.618988037109375 - 1.12),
];

const colshapes = positions.map((p, idx) => {
    let labelText = 'Магазин оружия (E)';
    if (idx < 6) {
        labelText = 'Магазин оружия (E)';
    } else if (idx === 7 || idx === 8) {
        labelText = 'Магазин оружия (E)';
    }

    const lowerGangShop = idx >= 0 && idx <= 4;
    const pUse = lowerGangShop ? new mp.Vector3(p.x, p.y, p.z - 0.95) : p;
    const labelLift = lowerGangShop ? 0.35 : 1.12;

    let colshape = mp.colshapes.newSphere(pUse.x, pUse.y, pUse.z, 1.5);
    colshape.idx = idx;

    if (!lowerGangShop && idx !== 5) {
        mp.labels.new(labelText, new mp.Vector3(pUse.x, pUse.y, pUse.z + labelLift), {
            font: 4,
            color: [255, 255, 255, 255],
            drawDistance: 20
        });
    }

    if (idx !== 5) {
        mp.markers.new(1, pUse, 1, {
            color: [255, 255, 255, 255],
            visible: true,
            dimension: 0
        });
    }

    return colshape;
});

let currentColshape = null, isMenuActive = false, lastPress = 0;
let pendingFraction;

function restoreAmunationWorldUi() {
    try {
        if (typeof global.forceCloseNpcDialogModal === 'function') {
            global.forceCloseNpcDialogModal({ unfreeze: false });
        }
        if (typeof global.invalidateWorldChromeRasterCache === 'function') {
            global.invalidateWorldChromeRasterCache();
        }
        if (typeof global.showWorldUiAfterModal === 'function') {
            global.showWorldUiAfterModal();
            return;
        }
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        }
    } catch (_e) {}
}

function setAmunationUiOpen(on) {
    isMenuActive = !!on;
    if (typeof global !== 'undefined') global.__amunationUiOpen = isMenuActive;
    if (on) {
        if (typeof global.enforceChatHiddenForOverlay === 'function') global.enforceChatHiddenForOverlay();
        try { mp.gui.cursor.show(true, true); } catch (_e) {}
    } else {
        try { mp.gui.cursor.show(false, false); } catch (_e) {}
        restoreAmunationWorldUi();
    }
}

function executeAmunationShow() {
    if (!isMenuActive) return;
    const fractionArg = pendingFraction == null ? 'undefined' : JSON.stringify(pendingFraction);
    try {
        buyGunsr.execute(`if (typeof window.show === 'function') window.show(${fractionArg});`);
    } catch (_e) {}
}

function openAmunationMenu(fraction) {
    pendingFraction = fraction;
    // Activate CEF before executing show: an inactive browser can still be loading.
    buyGunsr.active = true;
    setAmunationUiOpen(true);
    executeAmunationShow();

    // Одного повтора достаточно, если CEF ещё догружался.
    setTimeout(() => {
        if (isMenuActive) executeAmunationShow();
    }, 200);
}

function closeAmunationMenu() {
    if (!isMenuActive && !buyGunsr.active) return;
    isMenuActive = false;
    pendingFraction = undefined;
    try {
        // silent=true prevents CEF -> client -> CEF close recursion.
        buyGunsr.execute(`if (typeof window.hide === 'function') window.hide(true);`);
    } catch (_e) {}
    buyGunsr.active = false;
    setAmunationUiOpen(false);
}

global.bindGameplayKey(0x45, true, () => {
    if (mp.game.ui.isPauseMenuActive() || mp.players.local.isTypingInTextChat || mp.players.local.getVariable('dead') || mp.players.local.vehicle || mp.players.local.getVariable('afklobby')) return;

    const currentTime = Date.now();
    if (currentTime - lastPress < 1000) return;
    lastPress = currentTime;

    if (isMenuActive) {
        closeAmunationMenu();
    } else if (currentColshape && colshapes.includes(currentColshape)) {
        if (currentColshape.idx === 6 || currentColshape.idx === 7 || currentColshape.idx === 8) {
            openAmunationMenu(undefined);
        } else {
            if (currentColshape.idx === 0 || currentColshape.idx === 1 || currentColshape.idx === 2 || currentColshape.idx === 3 || currentColshape.idx === 4 || currentColshape.idx === 5) {
                const playerFraction = mp.players.local.getVariable('fraction');
                if (colshapes.indexOf(currentColshape) === playerFraction - 1 || playerFraction === undefined) {
                    openAmunationMenu(playerFraction);
                } else {
                    mp.events.call('notify:client', 2, "top-mid", "Этот магазин не для вас.", 2000);
                }
            }
        }
    }
});

mp.events.add("playerEnterColshape", (colshape) => {
    if (colshapes.includes(colshape)) currentColshape = colshape;
});

mp.events.add("playerExitColshape", (colshape) => {
    if (currentColshape === colshape) {
        currentColshape = null;
        if (isMenuActive) closeAmunationMenu();
    }
});

// The migrated browser emits closemenutwo, while some server/client builds use
// the obfuscated event. Supporting both keeps the menu and cursor in sync.
mp.events.add('closemenutwo', closeAmunationMenu);
mp.events.add('pdm.49e454f26c', closeAmunationMenu);
mp.events.add('amunation:ready', () => {
    if (isMenuActive) executeAmunationShow();
});

mp.events.add('render', () => {
    if (!isMenuActive) return;
    try {
        if (!mp.gui.cursor.visible) mp.gui.cursor.show(true, true);
    } catch (_e) {}
});

if (typeof global !== 'undefined') {
    global.tryCloseAmmuEsc = () => {
        if (!isMenuActive) return false;
        closeAmunationMenu();
        return true;
    };
}
