/** Клавиатурные бинды заменяют F6; для боковых кнопок мыши F6 остаётся резервным. */
let esptoggle = 0;
const DEFAULT_MENU_KEY = 0x75;
const DEFAULT_ESP_KEY = 0x7b;
const boundAdminMenuKeys = new Set();
let boundAdminEspKey = 0;
let previousAdminMouseDown = false;

let adminBindCapture = null;
let adminCaptureSince = 0;
let adminCapturePrevDown = new Set();

function loadAdminBindsFromStorage() {
    try {
        const raw = mp.storage.data && mp.storage.data.bloodyAdminBinds;
        if (!raw || typeof raw !== 'object') {
            return { menuKey: 0, espKey: DEFAULT_ESP_KEY };
        }
        const menuKey = parseInt(raw.menuKey, 10);
        const espKey = parseInt(raw.espKey, 10);
        return {
            menuKey: Number.isFinite(menuKey) && menuKey > 0 ? menuKey : 0,
            espKey: Number.isFinite(espKey) && espKey > 0 ? espKey : DEFAULT_ESP_KEY
        };
    } catch (_e) {
        return { menuKey: 0, espKey: DEFAULT_ESP_KEY };
    }
}

function saveAdminBindsToStorage(menuKey, espKey) {
    try {
        const mk = Number(menuKey);
        const ek = Number(espKey);
        mp.storage.data.bloodyAdminBinds = {
            menuKey: Number.isFinite(mk) && mk > 0 ? mk : 0,
            espKey: Number.isFinite(ek) && ek > 0 ? ek : DEFAULT_ESP_KEY
        };
        mp.storage.flush();
    } catch (_e) {}
}

function adminPanelExec(js) {
    try {
        if (typeof global !== 'undefined' && typeof global.adminPanelExec === 'function') {
            global.adminPanelExec(js);
        }
    } catch (_e) {}
}

function pushAdminBindLabel(bindId, vk) {
    const label =
        typeof global.formatVkLabel === 'function'
            ? global.formatVkLabel(vk)
            : (vk ? String(vk) : 'F6');
    adminPanelExec(
        'window.setAdminKeybindLabel && window.setAdminKeybindLabel(' +
            JSON.stringify(bindId) + ', ' + JSON.stringify(label) + ')'
    );
}

function adminBindField(bindId) {
    return bindId === 'admin_menu' ? 'menuKey' : bindId === 'admin_esp' ? 'espKey' : null;
}

function adminMenuLabelForStorage(menuKey) {
    const mk = Number(menuKey);
    if (!mk || mk === DEFAULT_MENU_KEY) return DEFAULT_MENU_KEY;
    return mk;
}

function adminBindConflicts(vk, exceptBindId) {
    const v = Number(vk);
    if (!v) return false;
    if (exceptBindId === 'admin_menu' && v === DEFAULT_MENU_KEY) return false;
    if (v === DEFAULT_MENU_KEY) return false;
    const b = loadAdminBindsFromStorage();
    if (exceptBindId !== 'admin_menu' && Number(b.menuKey) === v) return true;
    if (exceptBindId !== 'admin_esp' && Number(b.espKey) === v) return true;
    if (typeof global.isVkUsedByAnyGameplayKeybind === 'function' && global.isVkUsedByAnyGameplayKeybind(v)) {
        return true;
    }
    return false;
}

function applyAdminBindValue(bindId, vk) {
    const field = adminBindField(bindId);
    if (!field) return;
    const b = loadAdminBindsFromStorage();
    if (field === 'menuKey') {
        const mk = Number(vk);
        const extra = Number.isFinite(mk) && mk > 0 && mk !== DEFAULT_MENU_KEY ? mk : 0;
        saveAdminBindsToStorage(extra, b.espKey);
        applyAdminBinds(extra, b.espKey);
        pushAdminBindLabel('admin_menu', adminMenuLabelForStorage(extra));
    } else {
        const ek = Number(vk) || DEFAULT_ESP_KEY;
        saveAdminBindsToStorage(b.menuKey, ek);
        applyAdminBinds(b.menuKey, ek);
        pushAdminBindLabel('admin_esp', ek);
    }
}

function toggleAdminEsp() {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (typeof global.captBlocksAdminTools === 'function' && global.captBlocksAdminTools()) return;
    if (mp.players.local.getVariable('tabletTryOn') === true) return;
    const adminLevel = Number(mp.players.local.getVariable('adminlvl')) || 0;
    if (adminLevel < 1) return;

    if (esptoggle === 3) esptoggle = 0;
    else esptoggle++;

    switch (esptoggle) {
        case 0:
            mp.game.graphics.notify('[ADMIN-ESP]: ~r~Выключено');
            break;
        case 1:
            mp.game.graphics.notify('[ADMIN-ESP]: ~g~Игроки');
            break;
        case 2:
            mp.game.graphics.notify('[ADMIN-ESP]: ~g~Машины');
            break;
        case 3:
            mp.game.graphics.notify('[ADMIN-ESP]: ~g~Игроки и Машины');
            break;
    }
}

let lastAdminMenuPress = 0;
function adminMenuKeyHandler() {
    if (adminBindCapture || global.__adminBindCaptureActive) return;
    if (typeof global.isTypingInAnyTextField === 'function' && global.isTypingInAnyTextField()) return;
    if (Date.now() - lastAdminMenuPress < 180) return;
    lastAdminMenuPress = Date.now();
    if (typeof global.blockChatForAdminMenuKey === 'function') global.blockChatForAdminMenuKey();
    if (typeof global.toggleAdminPanel === 'function') global.toggleAdminPanel();
}

function bindAdminMenuKey(keyCode) {
    const vk = Number(keyCode);
    if (!vk || boundAdminMenuKeys.has(vk)) return;
    try {
        global.bindGameplayKey(vk, true, adminMenuKeyHandler);
        boundAdminMenuKeys.add(vk);
    } catch (_e) {}
}

function bindAdminEspKey(keyCode) {
    const vk = Number(keyCode) || DEFAULT_ESP_KEY;
    try {
        if (boundAdminEspKey) global.unbindGameplayKey(boundAdminEspKey, false, toggleAdminEsp);
        global.bindGameplayKey(vk, false, toggleAdminEsp);
        boundAdminEspKey = vk;
    } catch (_e) {}
}

function applyAdminBinds(menuKey, espKey) {
    const extra = Number(menuKey);
    const hasCustom = Number.isFinite(extra) && extra > 0 && extra !== DEFAULT_MENU_KEY;
    try {
        boundAdminMenuKeys.forEach((vk) => global.unbindGameplayKey(vk, true, adminMenuKeyHandler));
    } catch (_e) {}
    boundAdminMenuKeys.clear();

    bindAdminMenuKey(hasCustom ? extra : DEFAULT_MENU_KEY);
    if (extra === 5 || extra === 6) bindAdminMenuKey(DEFAULT_MENU_KEY);
    previousAdminMouseDown = (extra === 5 || extra === 6) && mp.keys.isDown(extra);
    bindAdminEspKey(espKey || DEFAULT_ESP_KEY);
}

global.applyAdminBindsFromJson = function (jsonStr) {
    try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        const menuKey = parseInt(data.menuKey, 10);
        const espKey = parseInt(data.espKey, 10) || DEFAULT_ESP_KEY;
        const extra = Number.isFinite(menuKey) && menuKey > 0 && menuKey !== DEFAULT_MENU_KEY ? menuKey : 0;
        saveAdminBindsToStorage(extra, espKey);
        applyAdminBinds(extra, espKey);
        pushAdminBindLabel('admin_menu', adminMenuLabelForStorage(extra));
        pushAdminBindLabel('admin_esp', espKey);
        mp.events.call('notify:client', 3, 'top-mid', 'Бинды сохранены.', 2500);
    } catch (_e) {}
};

global.getAdminBindsForPanel = function () {
    const b = loadAdminBindsFromStorage();
    return {
        menuKey: b.menuKey || DEFAULT_MENU_KEY,
        menuKeyExtra: b.menuKey,
        espKey: b.espKey
    };
};

mp.events.add('adminBindCaptureStart', (bindId) => {
    if (bindId !== 'admin_menu' && bindId !== 'admin_esp') return;
    if (typeof global !== 'undefined') global.__adminBindCaptureActive = true;
    adminBindCapture = bindId;
    adminCaptureSince = Date.now();
    adminCapturePrevDown = new Set();
    for (let vk = 1; vk <= 0xff; vk++) {
        if (mp.keys.isDown(vk)) adminCapturePrevDown.add(vk);
    }
    mp.events.call('notify:client', 3, 'top-mid', 'Нажмите клавишу или кнопку мыши. Esc — сброс бинда.', 4500);
});

(function initAdminBinds() {
    const b = loadAdminBindsFromStorage();
    applyAdminBinds(b.menuKey, b.espKey);
})();

mp.events.add('render', () => {
    if (adminBindCapture) {
        if (Date.now() - adminCaptureSince > 10000) {
            const b = loadAdminBindsFromStorage();
            if (adminBindCapture === 'admin_menu') {
                pushAdminBindLabel('admin_menu', adminMenuLabelForStorage(b.menuKey));
            } else {
                pushAdminBindLabel('admin_esp', b.espKey);
            }
            adminBindCapture = null;
            if (typeof global !== 'undefined') global.__adminBindCaptureActive = false;
        } else if (Date.now() - adminCaptureSince >= 220) {
            const downNow = new Set();
            for (let vk = 1; vk <= 0xff; vk++) {
                if (mp.keys.isDown(vk)) downNow.add(vk);
            }
            for (const vk of downNow) {
                if (!adminCapturePrevDown.has(vk)) {
                    const bindId = adminBindCapture;
                    if (vk === 0x1b) {
                        if (bindId === 'admin_menu') {
                            applyAdminBindValue(bindId, 0);
                            mp.events.call('notify:client', 3, 'top-mid', 'Клавиша сброшена: админ-меню на F6.', 2500);
                        } else {
                            applyAdminBindValue(bindId, DEFAULT_ESP_KEY);
                            mp.events.call('notify:client', 3, 'top-mid', 'Бинд сброшен на F12.', 2000);
                        }
                    } else if (vk === 0x71 || vk === 0x72) {
                        adminCapturePrevDown = downNow;
                        continue;
                    } else if (bindId === 'admin_menu' && vk === DEFAULT_MENU_KEY) {
                        applyAdminBindValue(bindId, 0);
                        mp.events.call('notify:client', 3, 'top-mid', 'Админ-меню: F6.', 2000);
                    } else if (adminBindConflicts(vk, bindId)) {
                        mp.events.call('notify:client', 2, 'top-mid', 'Эта клавиша уже занята.', 3000);
                    } else {
                        applyAdminBindValue(bindId, vk);
                        const label =
                            typeof global.formatVkLabel === 'function' ? global.formatVkLabel(vk) : String(vk);
                        mp.events.call('notify:client', 3, 'top-mid', 'Клавиша сохранена: ' + label, 2000);
                    }
                    adminBindCapture = null;
                    if (typeof global !== 'undefined') global.__adminBindCaptureActive = false;
                    adminCapturePrevDown = downNow;
                    break;
                }
            }
            if (adminBindCapture) adminCapturePrevDown = downNow;
        }
        return;
    }

    const adminLevel = Number(mp.players.local.getVariable('adminlvl')) || 0;
    if (typeof global.captBlocksAdminTools === 'function' && global.captBlocksAdminTools()) return;
    if (adminLevel < 1 || esptoggle < 1) return;
    try {
        if (esptoggle === 1 || esptoggle === 3) {
            mp.players.forEachInStreamRange((player) => {
                if (player.handle !== 0 && player !== mp.players.local) {
                    const position = player.position;
                    const color = player.getVariable('adminlvl') > 0 ? [255, 0, 0, 255] : [255, 255, 255, 255];
                    const armor = player.getArmour();
                    const currentHealth = player.getVariable('currentHealth') || player.getHealth();
                    const fraction = player.getVariable('fraction');
                    const cid = player.getVariable('static');
                    const login = player.getVariable('login');
                    const family = player.getVariable('family');
                    const mpId = typeof global.resolvePlayerMpId === 'function'
                        ? global.resolvePlayerMpId(player)
                        : (typeof player.remoteId === 'number' ? player.remoteId : player.id);
                    mp.game.graphics.drawText(
                        `#${cid} ${login} (${mpId}) \nFAM - ${family} \nHP: ${currentHealth} | ARMOR: ${armor} \n${fraction}`,
                        [position.x, position.y, position.z],
                        { scale: [0.4, 0.4], outline: true, color: color, font: 4 }
                    );
                }
            });
        }
        if (esptoggle === 2 || esptoggle === 3) {
            mp.vehicles.forEachInStreamRange((vehicle) => {
                if (vehicle.handle !== 0) {
                    const position = vehicle.position;
                    let speed = vehicle.getSpeed();
                    speed = speed * 3.6;
                    const driver = vehicle.getVariable('driver');
                    const lastStatic = vehicle.getVariable('lastStatic');
                    const vehicleText =
                        `ID: ${vehicle.remoteId} D: ${driver != null ? driver : '—'}\n` +
                        `Last: ${lastStatic != null ? lastStatic : '—'}\n` +
                        `Speed: ${parseInt(speed, 10).toString()}`;
                    mp.game.graphics.drawText(vehicleText, [position.x, position.y, position.z], {
                        scale: [0.35, 0.35],
                        outline: true,
                        color: [255, 255, 255, 255],
                        font: 4
                    });
                }
            });
        }
    } catch (_e) {}
});

// Some client builds do not dispatch side-mouse key bindings reliably.
// Edge detection complements the binding; the shared debounce prevents double toggles.
mp.events.add('render', () => {
    const key = loadAdminBindsFromStorage().menuKey;
    const down = (key === 5 || key === 6) && mp.keys.isDown(key);
    if (down && !previousAdminMouseDown) adminMenuKeyHandler();
    previousAdminMouseDown = down;
});
