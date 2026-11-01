inventoryBrowserr = null;

const inventoryData = [
                { name: 'item_spank', img: 'item_spank.png' },
                { name: 'item_alco', img: 'package://browsers/hud/images/med.png' },

    { name: 'weapon_revolver', img: 'weapon_revolver.png' },
    { name: 'weapon_revolver_mk2', img: 'weapon_revolver_mk2.png' },
    { name: 'weapon_assaultrifle', img: 'weapon_assaultrifle.png' },
    { name: 'weapon_heavyshotgun', img: 'weapon_heavyshotgun.png' },
    { name: 'weapon_assaultshotgun', img: 'weapon_assaultshotgun.png' },
    { name: 'weapon_carbinerifle', img: 'weapon_carbinerifle.png' },
    { name: 'weapon_sniperrifle', img: 'weapon_sniperrifle.png' },
    { name: 'weapon_heavysniper', img: 'svc.png' },
    { name: 'weapon_heavysniper_mk2', img: 'weapon_heavysniper_mk2.png' },
    { name: 'weapon_marksmanrifle', img: 'weapon_marksmanrifle.png' },
    { name: 'weapon_precisionrifle', img: 'weapon_precisionrifle.png' },
    { name: 'weapon_combatmg', img: 'weapon_combatmg.png' },
    { name: 'weapon_navyrevolver', img: 'weapon_navyrevolver.png' },
    { name: 'weapon_combatmg_mk2', img: 'weapon_combatmg_mk2.png' },
    { name: 'weapon_minismg', img: 'weapon_minismg.png' },
    { name: 'weapon_musket', img: 'weapon_musket.png' },
                { name: 'weapon_militaryrifle', img: 'weapon_militaryrifle.png', realName: 'Military Rifle' },
                { name: 'weapon_minismg', img: 'weapon_minismg.png', realName: 'Mini SMG' }
];

function getImageForItem(itemName) {
    const base = (typeof itemName === 'string' ? itemName : '').split('(')[0].trim();
    const item = inventoryData.find(data => data.name === base);
    return item ? item.img : 'default.png';
}

function invReadCenterInventorySetting() {
    try {
        const s = mp.storage.data && mp.storage.data.settings;
        if (s && s.enableCenterInventory != null) return !!s.enableCenterInventory;
    } catch (_e) {}
    return false;
}

function invSyncCenterInventorySetting() {
    if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
    const on = invReadCenterInventorySetting();
    inventoryBrowserr.execute(
        'try{if(typeof window.applyInventoryCenterSetting==="function")window.applyInventoryCenterSetting(' +
        (on ? 'true' : 'false') + ');}catch(_e){}'
    );
}

inventoryBrowserr = mp.browsers.new('package://kepler-compat/inventory/index.html');
global.keplerHideInventoryBrowser();
invop = false;

let _invCefFlushPending = false;
let _invSpawnOverlayLatch = false;

function invIsSpawnUiBlocking() {
    try {
        if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return true;
        if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) return true;
    } catch (_e) {}
    return false;
}

function invForceHiddenForSpawnOverlay() {
    try {
        if (inventoryBrowserr && mp.browsers.exists(inventoryBrowserr)) global.keplerHideInventoryBrowser();
        if (warehouseBrowserr && mp.browsers.exists(warehouseBrowserr)) warehouseBrowserr.active = false;
    } catch (_e) {}
    invop = false;
    warehouseOpen = false;
    if (typeof global !== 'undefined') global.__groundPickupModalOnly = false;
    if (!_invSpawnOverlayLatch) {
        _invSpawnOverlayLatch = true;
        try { mp.events.callRemote('setinvkey', false); } catch (_e2) {}
    }
}

function invReleaseSpawnOverlayLatch() {
    _invSpawnOverlayLatch = false;
}

function invMarkCefFlushPending() {
    _invCefFlushPending = true;
}

function invFlushDeferredCefAfterSpawn() {
    invReleaseSpawnOverlayLatch();
    if (!_invCefFlushPending) return;
    _invCefFlushPending = false;
    if (invIsSpawnUiBlocking()) return;
    invRefreshInventoryUIFromCache();
}

if (typeof global !== 'undefined') {
    global.__invSuppressDuringSpawn = invForceHiddenForSpawnOverlay;
}

mp.events.add('lobbySpawnComplete', () => {
    invFlushDeferredCefAfterSpawn();
});

mp.events.add('menuSettingsChanged', () => {
    invSyncCenterInventorySetting();
});

setTimeout(() => {
    try { invSyncCenterInventorySetting(); } catch (_e) {}
}, 1200);
let warehouseBrowserr = mp.browsers.new('package://browsers/warehouse/index.html?v=3');
warehouseBrowserr.active = false;
let warehouseOpen = false;
/** 'family' | 'fraction' | 'trunk' */
let warehouseUiKind = 'family';
let localInventoryModalOpen = false;

global.isLocalInventoryModalOpen = function isLocalInventoryModalOpen() {
    return localInventoryModalOpen === true || invop === true || warehouseOpen === true;
};

function hideWorldUiForInventoryModal() {
    localInventoryModalOpen = true;
    if (typeof global.hideWorldUiForModal === 'function') {
        global.hideWorldUiForModal();
    } else {
        mp.events.call('hud', false);
    }
}

function restoreWorldUiAfterInventoryModal() {
    localInventoryModalOpen = false;
    if (typeof global.showWorldUiAfterModal === 'function') {
        global.showWorldUiAfterModal();
    } else {
        mp.events.call('hud', true);
        if (typeof global.scheduleWorldChromeRestoreAfterModal === 'function') {
            global.scheduleWorldChromeRestoreAfterModal();
        }
    }
}

global.__lastHudInvRef = [];
global.__lastHudFastRef = [];

function invRefreshInventoryUIFromCache() {
    if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
    const inv = global.__lastHudInvRef;
    const fast = global.__lastHudFastRef;
    if (!Array.isArray(inv) || !inv.length || !Array.isArray(fast)) return;
    const eqStr = global.__lastEquipSnapRef || '';
    const masked = invFilterInventoryForCurrentFaction(inv, fast);
    invExecInventoryUILoad(
        `if(typeof exitWarehouseUiMode==='function')exitWarehouseUiMode();updateInventoryUI(${invEmbedForUpdateUI(masked.inv)}, ${invEmbedForUpdateUI(masked.fast)}, ${JSON.stringify(eqStr)})`
    );
}

function invParseStoredVk(v, fallback) {
    if (v === undefined || v === null) return fallback;
    if (typeof v === 'string') {
        const t = v.trim();
        if (t.toLowerCase().startsWith('0x')) {
            const h = parseInt(t, 16);
            if (!isNaN(h) && h >= 1 && h <= 0xff) return h;
            return fallback;
        }
    }
    const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
    if (isNaN(n) || n < 1 || n > 0xff) return fallback;
    return n;
}

function invVkToHudLabel(vk) {
    const n = Number(vk);
    if (!Number.isFinite(n)) return '—';
    if (n === 0x01) return 'ЛКМ';
    if (n === 0x02) return 'ПКМ';
    if (n === 0x04) return 'СКМ';
    if (n === 0x05) return 'M4';
    if (n === 0x06) return 'M5';
    if (n === 0x10) return 'Shift';
    if (n === 0x11) return 'Ctrl';
    if (n === 0x12) return 'Alt';
    if (n === 0x20) return 'Пробел';
    if (n === 0x1b) return 'Esc';
    if (n === 0x09) return 'Tab';
    if (n === 0x0d) return 'Enter';
    if (n >= 0x30 && n <= 0x39) return String.fromCharCode(n);
    if (n >= 0x41 && n <= 0x5a) return String.fromCharCode(n);
    if (n >= 0x70 && n <= 0x87) return 'F' + (n - 0x6f);
    return 'VK ' + n;
}

function invCountStackInGrid(invArr, exactBase) {
    if (!Array.isArray(invArr)) return 0;
    let n = 0;
    for (let i = 0; i < invArr.length; i++) {
        const cell = invArr[i];
        if (cell == null || cell === '') continue;
        const s = String(cell);
        if (s !== exactBase && !s.startsWith(exactBase + ' (')) continue;
        const m = s.match(/\((\d+)\)/);
        n += m ? parseInt(m[1], 10) : 1;
    }
    return n;
}

global.__invCountStack = function invCountStackGlobal(exactBase) {
    return invCountStackInGrid(global.__lastHudInvRef, exactBase);
};

function invGridSlotItemBase(slotStr) {
    const idx = parseInt(slotStr, 10);
    if (!Number.isInteger(idx) || idx < 0) return '';
    const inv = global.__lastHudInvRef || [];
    const cell = inv[idx];
    if (cell == null || cell === '') return '';
    return String(cell).split('(')[0].trim().split('#')[0].trim();
}

/** false = нельзя использовать бронежилет (уведомление уже показано). */
function invClientArmorUseGuardsPass() {
    const pl = mp.players.local;
    if (isInventoryTextInputOpen()) return false;
    if (typeof global !== 'undefined' && global.isLocalConsumableUseCooldownActive && global.isLocalConsumableUseCooldownActive('armor')) {
        mp.events.call('notify:client', 2, 'top-mid', 'Подождите 2 сек.', 2000);
        return false;
    }
    if (pl.getVariable('inCapt') === true && pl.getVariable('captAllowArmor') !== true) {
        mp.events.call('notify:client', 2, 'top-mid', 'На этой войне семей бронежилет запрещён.', 3000);
        return false;
    }
    if (pl.getVariable('inBizwar') === true && pl.getVariable('bizwarAllowArmor') !== true) {
        mp.events.call('notify:client', 2, 'top-mid', 'На этой войне семей бронежилет запрещён.', 3000);
        return false;
    }
    if (pl.getVariable('adminDutyGround') === true) {
        mp.events.call('notify:client', 2, 'top-mid', 'После /offnc бронежилет недоступен.', 4000);
        return false;
    }
    if (typeof global !== 'undefined' && global.isLocalArmorEquipCooldownActive && global.isLocalArmorEquipCooldownActive()) {
        if (global.notifyArmorEquipCooldownClient) global.notifyArmorEquipCooldownClient();
        else mp.events.call('notify:client', 2, 'top-mid', 'Бронежилет: перезарядка 3 сек.', 2500);
        return false;
    }
    if (pl.getVariable('inCapt') === true && pl.getVariable('captAllowArmor') === true) {
        const u = parseInt(pl.getVariable('captArmorUses'), 10) || 0;
        if (u >= 5) {
            mp.events.call('notify:client', 2, 'top-mid', 'На войне семей можно надеть не более 5 бронежилетов.', 3500);
            return false;
        }
    }
    return true;
}

function invClientMedkitUseGuardsPass() {
    if (isInventoryTextInputOpen()) return false;
    if (typeof global !== 'undefined' && global.isLocalConsumableUseCooldownActive && global.isLocalConsumableUseCooldownActive('med')) {
        mp.events.call('notify:client', 2, 'top-mid', 'Подождите 2 сек.', 2000);
        return false;
    }
    if (
        typeof global !== 'undefined' &&
        global.isPostDamageMedkitLockActive &&
        global.isPostDamageMedkitLockActive()
    ) {
        if (global.notifyMedkitPostDamageClient) global.notifyMedkitPostDamageClient();
        else mp.events.call('notify:client', 2, 'top-mid', 'Вы недавно получили урон.', 2500);
        return false;
    }
    return true;
}

function invClientSpankUseGuardsPass() {
    if (isInventoryTextInputOpen()) return false;
    if (
        typeof global !== 'undefined' &&
        global.isLocalConsumableUseCooldownActive &&
        global.isLocalConsumableUseCooldownActive('spank')
    ) {
        mp.events.call('notify:client', 2, 'top-mid', 'Подождите 2 сек.', 2000);
        return false;
    }
    if (
        typeof global !== 'undefined' &&
        global.isPostDamageSpankLockActive &&
        global.isPostDamageSpankLockActive()
    ) {
        if (global.notifyMedkitPostDamageClient) global.notifyMedkitPostDamageClient();
        else mp.events.call('notify:client', 2, 'top-mid', 'Вы недавно получили урон.', 2500);
        return false;
    }
    return true;
}

function invClientAlcoUseGuardsPass() {
    if (isInventoryTextInputOpen()) return false;
    if (
        typeof global !== 'undefined' &&
        global.isLocalConsumableUseCooldownActive &&
        global.isLocalConsumableUseCooldownActive('alco')
    ) {
        mp.events.call('notify:client', 2, 'top-mid', 'Подождите 2 сек.', 2000);
        return false;
    }
    if (
        typeof global !== 'undefined' &&
        global.isPostDamageSpankLockActive &&
        global.isPostDamageSpankLockActive()
    ) {
        if (global.notifyMedkitPostDamageClient) global.notifyMedkitPostDamageClient();
        else mp.events.call('notify:client', 2, 'top-mid', 'Вы недавно получили урон.', 2500);
        return false;
    }
    return true;
}

function isInventoryTextInputOpen() {
    try {
        if (typeof global !== 'undefined' && global.__chatInputOpen === true) return true;
        if (mp.players.local && mp.players.local.isTypingInTextChat) return true;
    } catch (_e) {}
    return false;
}

function invPushHudQuickSlotsMeta() {
    /* Быстрые слоты на HUD отключены */
}

global.__invHudRefreshQuickMeta = invPushHudQuickSlotsMeta;

/** Пол превью одежды (Calamity: male|female). В CEF через window.__invClothMale. */
function invBrowserGenderPrefix() {
    try {
        const fem = mp.game.joaat('mp_f_freemode_01');
        return mp.players.local.model === fem ? 'window.__invClothMale=false;' : 'window.__invClothMale=true;';
    } catch (_) {
        return 'window.__invClothMale=true;';
    }
}

/** Склеивает подряд вызовы updateInventory в один execute на следующий тик — меньше лагов CEF. */
let _invUiPending = '';
let _invUiScheduled = false;
function invFlushPendingInventoryUI() {
    _invUiScheduled = false;
    const js = _invUiPending;
    _invUiPending = '';
    if (!js || !inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
    inventoryBrowserr.execute(invBrowserGenderPrefix() + js);
}

/** Полная загрузка инвентаря при входе / первом открытии — без debounce, иначе последний тик может затереть данные equipSnap. */
function invExecInventoryUILoad(js) {
    if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
    if (invIsSpawnUiBlocking()) {
        invMarkCefFlushPending();
        invForceHiddenForSpawnOverlay();
        return;
    }
    _invUiPending = '';
    _invUiScheduled = false;
    inventoryBrowserr.execute(invBrowserGenderPrefix() + js);
}

function invExecInventoryUI(js) {
    if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
    if (invIsSpawnUiBlocking()) {
        invMarkCefFlushPending();
        invForceHiddenForSpawnOverlay();
        return;
    }
    _invUiPending = js;
    if (_invUiScheduled) return;
    _invUiScheduled = true;
    setTimeout(invFlushPendingInventoryUI, 0);
}

let _invAttachSyncTimer = null;
function scheduleInventoryAttachSync() {
    if (_invAttachSyncTimer) clearTimeout(_invAttachSyncTimer);
    _invAttachSyncTimer = setTimeout(() => {
        _invAttachSyncTimer = null;
        mp.events.callRemote('attachment:syncWeaponBody');
    }, 100);
}

function invSetBrowserInventoryUiOpen(open) {
    if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
    inventoryBrowserr.execute(
        'try{document.body.classList.toggle("inventory-ui-open",' + (open ? 'true' : 'false') + ');}catch(_e){}'
    );
}

function invPrepareGroundPickupBrowserShell() {
    if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
    inventoryBrowserr.execute(
        'try{' +
        'document.body.classList.remove("inventory-ui-open");' +
        'document.body.classList.add("ground-pickup-only");' +
        '}catch(_e){}'
    );
}

function invClearGroundPickupBrowserShell() {
    if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
    inventoryBrowserr.execute('try{document.body.classList.remove("ground-pickup-only");}catch(_e){}');
}

let lastWeaponPickupClientMs = 0;
/** Антиспам без «мёртвой» секунды — иначе сложно поймать момент у зоны подбора. */
const WEAPON_PICKUP_CLIENT_MS = 320;

function closeWarehouseUi() {
    if (!warehouseOpen) return false;
    const closedKind = warehouseUiKind;
    if (warehouseBrowserr && mp.browsers.exists(warehouseBrowserr)) warehouseBrowserr.active = false;
    warehouseOpen = false;
    warehouseUiKind = 'family';
    invop = false;
    mp.gui.cursor.show(false, false);
    mp.events.callRemote('setinvkey', false);
    restoreWorldUiAfterInventoryModal();
    if (closedKind === 'trunk') {
        try { mp.events.callRemote('vehicle:trunk:close:s'); } catch (_e) {}
    }
    return true;
}

/** Вызывается из keybinds.js (клавиша настраивается в F10 → Управление, по умолчанию I). */
global.__inventoryKeyToggle = function () {
    if (typeof global.isInventoryKeybindBlocked === 'function' && global.isInventoryKeybindBlocked()) return;
    if (mp.players.local.getVariable('dead') || mp.players.local.getVariable('nof3') || !mp.players.local.getVariable('auth') || mp.players.local.getVariable('targetmenu') || mp.players.local.getVariable('jail')) return;
    if (closeWarehouseUi()) return;
    if (invop === false) {
        invSyncCenterInventorySetting();
        if (Array.isArray(global.__lastHudInvRef) && global.__lastHudInvRef.length && Array.isArray(global.__lastHudFastRef)) {
            invRefreshInventoryUIFromCache();
        }
        inventoryBrowserr.active = true;
        invop = true;
        invSetBrowserInventoryUiOpen(true);
        inventoryBrowserr.execute('try{document.body.classList.remove("ground-pickup-only");}catch(_e){}');
        mp.gui.cursor.show(true, true);
        try { mp.gui.cursor.visible = true; } catch (_eCur) {}
        hideWorldUiForInventoryModal();
        mp.events.callRemote('setinvkey', true);
        mp.events.callRemote('requestInventory');
        // Tab (и похожие) в том же кадре могут сбить CEF-фокус — возвращаем курсор
        const reopenVk = typeof global.getGameplayInventoryKeyVk === 'function' ? global.getGameplayInventoryKeyVk() : 0;
        if (reopenVk === 0x09) {
            [0, 16, 48, 100].forEach((ms) => {
                setTimeout(() => {
                    try {
                        if (!invop) return;
                        mp.gui.cursor.show(true, true);
                        mp.gui.cursor.visible = true;
                    } catch (_e2) {}
                }, ms);
            });
        }
    } else {
        inventoryBrowserr.execute(`if(typeof exitWarehouseUiMode==='function')exitWarehouseUiMode();else if(typeof scheduleInventorySlotScaleResync==='function')scheduleInventorySlotScaleResync();`);
        inventoryBrowserr.execute(`if (typeof resetInventoryEscState === 'function') resetInventoryEscState();`);
        invSetBrowserInventoryUiOpen(false);
        global.keplerHideInventoryBrowser();
        invop = false;
        mp.gui.cursor.show(false, false);
        mp.events.callRemote('setinvkey', false);
        restoreWorldUiAfterInventoryModal();
    }
};

if (typeof global !== 'undefined') {
    global.__groundPickupModalOnly = false;

    global.closeGroundPickupQtyModalShell = function closeGroundPickupQtyModalShell() {
        if (!global.__groundPickupModalOnly) return;
        global.__groundPickupModalOnly = false;
        invClearGroundPickupBrowserShell();
        if (inventoryBrowserr && mp.browsers.exists(inventoryBrowserr) && !invop) {
            global.keplerHideInventoryBrowser();
        }
        try {
            mp.gui.cursor.show(false, false);
        } catch (_e) {}
    };

    global.openGroundPickupQtyModal = function openGroundPickupQtyModal(meta) {
        if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr) || !meta || !meta.needsQty) return false;
        const wasInvOpen = invop === true;
        if (!wasInvOpen) {
            global.__groundPickupModalOnly = true;
            invPrepareGroundPickupBrowserShell();
        }
        inventoryBrowserr.active = true;
        if (!wasInvOpen) {
            mp.gui.cursor.show(true, true);
        }
        const hintJson = JSON.stringify(meta);
        inventoryBrowserr.execute(
            'try{if(typeof openGroundPickupModal==="function")openGroundPickupModal(' +
            hintJson + ',' + (wasInvOpen ? 'true' : 'false') + ');}catch(_e){}'
        );
        return true;
    };

    global.tryCloseInventoryEsc = () => {
        if (closeWarehouseUi()) return true;
        if (global.__groundPickupModalOnly && inventoryBrowserr && mp.browsers.exists(inventoryBrowserr)) {
            inventoryBrowserr.execute('try{if(typeof closeGroundPickupModal==="function")closeGroundPickupModal();}catch(_e){}');
            return true;
        }
        if (!invop || !inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return false;
        inventoryBrowserr.execute(`if(typeof exitWarehouseUiMode==='function')exitWarehouseUiMode();else if(typeof scheduleInventorySlotScaleResync==='function')scheduleInventorySlotScaleResync();`);
        inventoryBrowserr.execute(`if (typeof resetInventoryEscState === 'function') resetInventoryEscState();`);
        invSetBrowserInventoryUiOpen(false);
        global.keplerHideInventoryBrowser();
        invop = false;
        mp.gui.cursor.show(false, false);
        mp.events.callRemote('setinvkey', false);
        restoreWorldUiAfterInventoryModal();
        return true;
    };
}

function syncGroundPickupHudFromLocal() {
    if (typeof hudr === 'undefined' || !hudr || !mp.browsers.exists(hudr)) return;
    const raw = mp.players.local.getVariable('groundPickupHint');
    if (!raw) {
        hudr.execute('try{hudMain.clearGroundPickupHint();}catch(_e){}');
        return;
    }
    const esc = JSON.stringify(String(raw));
    hudr.execute(`try{hudMain.setGroundPickupHint(JSON.parse(${esc}));}catch(_e){}`);
}

const GROUND_PICKUP_HINT_MAX_DIST = 2.35;

function getDistanceToGroundPickup(meta) {
    if (!meta || !meta.pos) return Infinity;
    const lp = mp.players.local.position;
    const px = Number(meta.pos.x);
    const py = Number(meta.pos.y);
    const pz = Number(meta.pos.z);
    if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return Infinity;
    const dx = px - lp.x;
    const dy = py - lp.y;
    const dz = pz - lp.z;
    return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}

function isLocalPlayerNearGroundPickup(meta, maxDist) {
    if (maxDist == null) maxDist = GROUND_PICKUP_HINT_MAX_DIST;
    return getDistanceToGroundPickup(meta) <= maxDist;
}

function getLocalGroundPickupMeta() {
    try {
        const raw = mp.players.local.getVariable('groundPickupHint');
        if (!raw) return null;
        return JSON.parse(String(raw));
    } catch (_e) {
        return null;
    }
}

function syncGroundPickupInventoryFromLocal() {
    try {
        if (!inventoryBrowserr || !mp.browsers.exists(inventoryBrowserr)) return;
        let meta = getLocalGroundPickupMeta();
        if (!meta || !meta.label || !isLocalPlayerNearGroundPickup(meta)) meta = null;
        inventoryBrowserr.execute('try{window.INVENTORY_UI&&window.INVENTORY_UI.setEnvironment(' + JSON.stringify(meta) + ');}catch(_e){}');
    } catch (_e) {}
}
mp.events.add('client:inventory:ready', syncGroundPickupInventoryFromLocal);
function drawGroundPickupWorldHint() {
    if (global.__groundPickupModalOnly) return;
    const meta = getLocalGroundPickupMeta();
    if (!meta || !meta.label) return;
    if (!isLocalPlayerNearGroundPickup(meta)) return;
    const pos = meta.pos;
    if (!pos) return;
    const x = Number(pos.x);
    const y = Number(pos.y);
    const z = Number(pos.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;

    let title = String(meta.label).trim();
    const qty = Math.max(1, parseInt(meta.qty, 10) || 1);
    const itemBase = String(meta.item || '').split('(')[0].trim();
    if (qty > 1 && !meta.needsQty && itemBase !== 'item_bong' && itemBase !== 'item_thermos' && itemBase !== 'item_drone') {
        title += ` (${qty})`;
    }

    const baseZ = z + 0.34;
    try {
        mp.game.graphics.drawText(title, [x, y, baseZ + 0.07], {
            font: 4,
            color: [255, 255, 255, 235],
            scale: [0.38, 0.38],
            outline: true,
            centre: true
        });
        mp.game.graphics.drawText('E', [x, y, baseZ - 0.05], {
            font: 4,
            color: [123, 202, 86, 255],
            scale: [0.44, 0.44],
            outline: true,
            centre: true
        });
    } catch (_e) {}
}

mp.events.add('render', () => {
    try {
        if (!mp.players.local.getVariable('auth')) return;
        drawGroundPickupWorldHint();
    } catch (_e) {}
});

let lastGroundPickupHintRaw = null;
setInterval(() => {
    try {
        if (!mp.players.local.getVariable('auth')) return;
        const raw = mp.players.local.getVariable('groundPickupHint');
        const key = raw == null ? '' : String(raw);
        if (key === lastGroundPickupHintRaw) return;
        lastGroundPickupHintRaw = key;
        if (!raw && global.__groundPickupModalOnly) {
            if (inventoryBrowserr && mp.browsers.exists(inventoryBrowserr)) {
                inventoryBrowserr.execute('try{if(typeof closeGroundPickupModal==="function")closeGroundPickupModal();}catch(_e){}');
            }
            if (typeof global.closeGroundPickupQtyModalShell === 'function') {
                global.closeGroundPickupQtyModalShell();
            }
        }
        syncGroundPickupHudFromLocal();
        syncGroundPickupInventoryFromLocal();
    } catch (_e) {}
}, 200);

try {
    mp.events.addDataHandler('groundPickupHint', (entity, value) => {
        try {
            if (!entity || entity !== mp.players.local) return;
            lastGroundPickupHintRaw = value == null ? '' : String(value);
            syncGroundPickupHudFromLocal();
        syncGroundPickupInventoryFromLocal();
        } catch (_e) {}
    });
} catch (_eHandler) {}

mp.events.add('pickupQty:cursor', (show) => {
    try {
        if (show) {
            mp.gui.cursor.show(true, true);
            return;
        }
        if (global.__groundPickupModalOnly) {
            global.closeGroundPickupQtyModalShell();
            return;
        }
        mp.gui.cursor.show(false, false);
    } catch (_e) {}
});

mp.events.add('pickupQty:cancel', () => {
    if (typeof global.closeGroundPickupQtyModalShell === 'function') {
        global.closeGroundPickupQtyModalShell();
    }
});

mp.events.add('pickupQty:confirm', (qty) => {
    const now = Date.now();
    if (now - lastWeaponPickupClientMs < WEAPON_PICKUP_CLIENT_MS) return;
    lastWeaponPickupClientMs = now;
    const n = Math.max(1, parseInt(qty, 10) || 1);
    if (typeof global.closeGroundPickupQtyModalShell === 'function') {
        global.closeGroundPickupQtyModalShell();
    }
    mp.events.callRemote('pickupWeapon', n);
});

function tryGroundPickupInteract() {
    if (mp.game.ui.isPauseMenuActive() || mp.players.local.isTypingInTextChat || mp.players.local.getVariable('f3key') === true || mp.players.local.vehicle || mp.players.local.getVariable('dead') === true || !mp.players.local.getVariable('gangwar') || mp.players.local.getVariable('targetmenu') || mp.players.local.getVariable('familymenu') || mp.players.local.getVariable('casmenu') || mp.players.local.getVariable('blackmenu') || mp.players.local.getVariable('animsmenu') || mp.players.local.getVariable('shopc')) return false;
    let meta = null;
    try {
        const raw = mp.players.local.getVariable('groundPickupHint');
        if (raw) meta = JSON.parse(String(raw));
    } catch (_e) {}
    if (meta && !isLocalPlayerNearGroundPickup(meta)) return false;
    if (!mp.players.local.getVariable('currentWeaponColshape') && !meta) return false;
    const now = Date.now();
    if (now - lastWeaponPickupClientMs < WEAPON_PICKUP_CLIENT_MS) return true;
    if (meta && meta.needsQty) {
        const base = String(meta.item || '').split('(')[0].trim();
        const qty = Math.max(1, parseInt(meta.qty, 10) || 1);
        const needsModal = meta.stackable === true && qty > 1 && base.indexOf('weapon_') !== 0;
        if (needsModal) {
            if (typeof global.openGroundPickupQtyModal === 'function' && global.openGroundPickupQtyModal(meta)) {
                return true;
            }
        }
    }
    lastWeaponPickupClientMs = now;
    mp.events.callRemote('pickupWeapon', 0);
    return true;
}

global.bindGameplayKey(0x45, true, function() {
    tryGroundPickupInteract();
});
mp.events.add('inventoryGroundPickup', () => { if (invop) tryGroundPickupInteract(); });

/**
 * Аргументы loadInventory/updateInventory в RAGE могут быть уже массивом (клиент распарсил строку).
 * Тогда нужно встроить JSON.stringify(массив); если строка — JSON.parse("...") без двойного кодирования.
 */
function invEmbedForUpdateUI(val) {
    if (val === undefined || val === null) return '[]';
    if (Array.isArray(val)) return JSON.stringify(val);
    if (typeof val === 'object') {
        try {
            return JSON.stringify(val);
        } catch (_e) {
            return '[]';
        }
    }
    if (typeof val === 'string') {
        const t = val.trim();
        if (t === '' || t === 'undefined') return '[]';
        return `JSON.parse(${JSON.stringify(t)})`;
    }
    return '[]';
}

/** Декод ic1.* (как в CEF inventory): base64 JSON после префикса ic1. */
function invDecodeIc1Payload(baseTok) {
    if (typeof baseTok !== 'string' || !baseTok.startsWith('ic1.')) return null;
    const b64 = baseTok.slice(4);
    let json;
    try {
        if (typeof atob === 'function') json = decodeURIComponent(escape(atob(b64)));
        else return null;
    } catch (_e) {
        try {
            if (typeof atob === 'function') json = atob(b64);
            else return null;
        } catch (_e2) {
            return null;
        }
    }
    try {
        return JSON.parse(json);
    } catch (_e3) {
        return null;
    }
}

function invParseGridForUi(val) {
    if (val == null) return [];
    if (Array.isArray(val)) return val.slice();
    if (typeof val === 'object') {
        try {
            return Array.isArray(val) ? val.slice() : [];
        } catch (_e) {
            return [];
        }
    }
    if (typeof val === 'string') {
        try {
            const a = JSON.parse(val);
            return Array.isArray(a) ? a.slice() : [];
        } catch (_e) {
            return [];
        }
    }
    return [];
}

/** Инвентарь больше не маскируется по фракции (одинаковые вещи/сумки на аккаунте). */
function invFilterInventoryForCurrentFaction(inventory, fastSlots) {
    return { inv: invParseGridForUi(inventory), fast: invParseGridForUi(fastSlots) };
}

/** RAGE может отдать equipSnap уже объектом — нельзя делать String(obj) → "[object Object]". */
function invEquipSnapToEmbedString(equipSnap) {
    if (equipSnap == null || equipSnap === undefined || equipSnap === '') return '';
    if (typeof equipSnap === 'string') {
        const t = equipSnap.trim();
        return t === '' || t === 'undefined' ? '' : equipSnap;
    }
    if (typeof equipSnap === 'object') {
        try {
            return JSON.stringify(equipSnap);
        } catch (_e) {
            return '';
        }
    }
    return '';
}

/** Предыдущий кадр: клавиша хоткея слота была зажата — нужен фронт (нажали сейчас), иначе при синке инвентаря сброс «held» давал спам при удержании. */
const _invHotkeyPrevDown = {};

function invParseSlotBindsFromSnap(equipSnap) {
    /** Многие вызовы updateInventory идут только с (inv, fast) без equipSnap — нельзя обнулять хоткеи. */
    if (equipSnap == null || equipSnap === undefined || equipSnap === '') return;
    global.__invSlotHotkeys = {};
    try {
        const o = typeof equipSnap === 'string' ? JSON.parse(equipSnap) : equipSnap;
        const sb = o && o.slotBinds;
        if (!sb || typeof sb !== 'object') return;
        Object.keys(sb).forEach((k) => {
            const ent = sb[k];
            if (!ent) return;
            let code = Number(ent.code);
            if (!Number.isFinite(code) && ent.type === 'mouse') {
                const btn = Number(ent.button);
                if (btn === 3) code = 0x05;
                else if (btn === 4) code = 0x06;
            }
            if (!Number.isFinite(code) || code < 1) return;
            global.__invSlotHotkeys[k] = code;
        });
    } catch (_e) {}
}

mp.events.add('loadInventory', (inventory, fastSlots, equipSnap) => {
    invParseSlotBindsFromSnap(equipSnap);
    const eqStr = invEquipSnapToEmbedString(equipSnap);
    global.__lastEquipSnapRef = eqStr;
    const masked = invFilterInventoryForCurrentFaction(inventory, fastSlots);
    global.__lastHudInvRef = masked.inv;
    global.__lastHudFastRef = masked.fast.slice();
    invPushHudQuickSlotsMeta();
    invExecInventoryUILoad(
        `if(typeof exitWarehouseUiMode==='function')exitWarehouseUiMode();updateInventoryUI(${invEmbedForUpdateUI(masked.inv)}, ${invEmbedForUpdateUI(masked.fast)}, ${JSON.stringify(eqStr)})`
    );
    scheduleInventoryAttachSync();
});

mp.events.add('updateInventory', (inventory, fastSlots, equipSnap) => {
    invParseSlotBindsFromSnap(equipSnap);
    const eqStr = invEquipSnapToEmbedString(equipSnap);
    if (eqStr) global.__lastEquipSnapRef = eqStr;
    const masked = invFilterInventoryForCurrentFaction(inventory, fastSlots);
    global.__lastHudInvRef = masked.inv;
    global.__lastHudFastRef = masked.fast.slice();
    invPushHudQuickSlotsMeta();
    invExecInventoryUI(
        `if(typeof exitWarehouseUiMode==='function')exitWarehouseUiMode();updateInventoryUI(${invEmbedForUpdateUI(masked.inv)}, ${invEmbedForUpdateUI(masked.fast)}, ${JSON.stringify(eqStr)})`
    );
    scheduleInventoryAttachSync();
});

function invWarehouseEquipSnapArg() {
    const ref = global.__lastEquipSnapRef;
    return ref ? `, ${JSON.stringify(ref)}` : '';
}

let warehouseCefForceRebuild = true;

function ensureWarehouseBrowser() {
    if (warehouseCefForceRebuild) {
        try {
            if (warehouseBrowserr && mp.browsers.exists(warehouseBrowserr)) warehouseBrowserr.destroy();
        } catch (_e) {}
        warehouseBrowserr = null;
        warehouseCefForceRebuild = false;
    }
    if (!warehouseBrowserr || !mp.browsers.exists(warehouseBrowserr)) {
        warehouseBrowserr = mp.browsers.new('package://browsers/warehouse/index.html?v=3');
        warehouseBrowserr.active = false;
    }
    return warehouseBrowserr;
}

function warehouseEmbed(val) {
    return invEmbedForUpdateUI(val);
}

function pushWarehouseUiToCef(kind, inventory, fastSlots, warehouse) {
    if (!warehouseBrowserr || !mp.browsers.exists(warehouseBrowserr)) return;
    const js = `try{if(typeof updateWarehouseUI==='function')updateWarehouseUI(${JSON.stringify(kind)}, ${warehouseEmbed(inventory)}, ${warehouseEmbed(fastSlots)}, ${warehouseEmbed(warehouse)})}catch(_e){}`;
    try { warehouseBrowserr.execute(js); } catch (_e) {}
}

function openWarehouseUi(kind, inventory, fastSlots, warehouse) {
    const br = ensureWarehouseBrowser();
    if (!br) return;
    br.active = true;
    warehouseOpen = true;
    warehouseUiKind = kind === 'trunk' ? 'trunk' : (kind === 'fraction' ? 'fraction' : 'family');
    invop = true;
    if (inventoryBrowserr && mp.browsers.exists(inventoryBrowserr)) global.keplerHideInventoryBrowser();
    mp.gui.cursor.show(true, true);
    hideWorldUiForInventoryModal();
    mp.events.callRemote('setinvkey', true);
    const masked = invFilterInventoryForCurrentFaction(inventory, fastSlots);
    global.__lastHudInvRef = masked.inv;
    global.__lastHudFastRef = masked.fast.slice();
    invPushHudQuickSlotsMeta();
    pushWarehouseUiToCef(kind, masked.inv, masked.fast, warehouse);
    setTimeout(() => {
        if (warehouseOpen) pushWarehouseUiToCef(kind, masked.inv, masked.fast, warehouse);
    }, 80);
    setTimeout(() => {
        if (warehouseOpen) pushWarehouseUiToCef(kind, masked.inv, masked.fast, warehouse);
    }, 250);
    scheduleInventoryAttachSync();
}

function updateWarehouseUi(kind, inventory, fastSlots, warehouse) {
    if (!warehouseOpen || !warehouseBrowserr || !mp.browsers.exists(warehouseBrowserr)) {
        openWarehouseUi(kind, inventory, fastSlots, warehouse);
        return;
    }
    warehouseUiKind = kind === 'trunk' ? 'trunk' : (kind === 'fraction' ? 'fraction' : 'family');
    const masked = invFilterInventoryForCurrentFaction(inventory, fastSlots);
    global.__lastHudInvRef = masked.inv;
    global.__lastHudFastRef = masked.fast.slice();
    invPushHudQuickSlotsMeta();
    warehouseBrowserr.execute(`updateWarehouseUI(${JSON.stringify(kind)}, ${warehouseEmbed(masked.inv)}, ${warehouseEmbed(masked.fast)}, ${warehouseEmbed(warehouse)})`);
    scheduleInventoryAttachSync();
}

mp.events.add('familyWarehouse:open:c', (inventory, fastSlots, warehouse) => {
    openWarehouseUi('family', inventory, fastSlots, warehouse);
});

mp.events.add('familyWarehouse:update:c', (inventory, fastSlots, warehouse) => {
    updateWarehouseUi('family', inventory, fastSlots, warehouse);
});

mp.events.add('fractionWarehouse:open:c', (inventory, fastSlots, warehouse) => {
    openWarehouseUi('fraction', inventory, fastSlots, warehouse);
});

mp.events.add('fractionWarehouse:update:c', (inventory, fastSlots, warehouse) => {
    updateWarehouseUi('fraction', inventory, fastSlots, warehouse);
});

mp.events.add('vehicleTrunk:open:c', (inventory, fastSlots, trunk) => {
    openWarehouseUi('trunk', inventory, fastSlots, trunk);
});

mp.events.add('vehicleTrunk:update:c', (inventory, fastSlots, trunk) => {
    updateWarehouseUi('trunk', inventory, fastSlots, trunk);
});

let localEquippedWeaponHash = 0;
let localEquippedClipFallback = 0;
let localEquippedMaxFallback = 0;
let localWeaponEquipAt = 0;
const LOCAL_AMMO_IGNORED_WEAPONS = new Set([
    mp.game.joaat('gadget_parachute') >>> 0
]);

function pushLocalAmmoSnapshot(hash) {
    const h = (parseInt(hash, 10) >>> 0);
    if (!h) return;
    if (LOCAL_AMMO_IGNORED_WEAPONS.has(h)) {
        localEquippedWeaponHash = 0;
        localEquippedClipFallback = 0;
        localEquippedMaxFallback = 0;
        localWeaponEquipAt = 0;
        mp.events.call('hideAmmo');
        return;
    }
    const ped = mp.players.local;
    let clipSize = mp.game.weapon.getWeaponClipSize(h);
    if (clipSize === undefined || clipSize === null || Number.isNaN(Number(clipSize)) || clipSize <= 0) {
        clipSize = 30;
    }
    let clip = ped.getAmmoInClip(h);
    if (clip === undefined || clip === null || Number.isNaN(Number(clip)) || clip <= 0) {
        try {
            ped.setAmmoInClip(h, clipSize);
        } catch (_e) {}
        clip = clipSize;
    }
    localEquippedWeaponHash = h;
    localEquippedClipFallback = clip;
    localEquippedMaxFallback = clipSize;
    localWeaponEquipAt = Date.now();
    mp.events.call('local:ammoSnapshot', clip, clipSize);
    try {
        const slot = ped.getVariable('activeWeaponSlot');
        if (slot !== null && slot !== undefined && slot >= 0 && slot <= 2) {
            mp.events.callRemote('player:fastClip:s', slot, clip);
        }
    } catch (_e2) {}
}

global.getLocalWeaponAmmoFallback = function () {
    if (Date.now() - localWeaponEquipAt > 900) return null;
    return {
        clip: localEquippedClipFallback,
        max: localEquippedMaxFallback,
        hash: localEquippedWeaponHash
    };
};

mp.events.add('givegun', (item, savedClip) => {
    const hash = (parseInt(item, 10) >>> 0);
    if (!Number.isFinite(hash) || hash === 0) return;
    mp.players.local.giveWeapon(hash, 99999, true);
    const sc = Number(savedClip);
    if (Number.isFinite(sc) && sc > 0) {
        try { mp.players.local.setAmmoInClip(hash, sc); } catch (_e) {}
    }
    pushLocalAmmoSnapshot(hash);
    setTimeout(() => pushLocalAmmoSnapshot(hash), 0);
    setTimeout(() => pushLocalAmmoSnapshot(hash), 32);
});

function invCanDropOnGroundClient() {
    const lp = mp.players.local;
    if (!lp || !mp.players.exists(lp)) return false;
    if ((lp.dimension || 0) !== 0) {
        mp.events.call('notify:client', 2, 'top-mid', 'Выкинуть предметы можно только в основном измерении.', 3000);
        return false;
    }
    return true;
}

mp.events.add('dropItem', (item) => {
    if (!invCanDropOnGroundClient()) return;
    mp.events.callRemote('dropItem', item);
});

mp.events.add('dropItemQty', (payloadJson) => {
    if (!invCanDropOnGroundClient()) return;
    mp.events.callRemote('dropItemQty', payloadJson);
});

mp.events.add('inventoryEquipItem', (item) => {
    mp.events.callRemote('inventory:equipItem:s', item);
});

mp.events.add('inventoryUnequipSlot', (slotKey) => {
    mp.events.callRemote('inventory:unequipSlot:s', slotKey);
});

mp.events.add('inventoryToggleDonateTopVariant', () => {
    setTimeout(() => {
        mp.events.callRemote('inventory:toggleDonateTopVariant:s');
    }, 1000);
});

mp.events.add('inventoryToggleDonateBagVariant', () => {
    setTimeout(() => {
        mp.events.callRemote('inventory:toggleDonateBagVariant:s');
    }, 400);
});

mp.events.add('inventoryToggleSpectrumCloth', (kind) => {
    setTimeout(() => {
        mp.events.callRemote('inventory:toggleSpectrumCloth:s', String(kind || ''));
    }, 200);
});

mp.events.add('setFastSlot', (item) => {
    mp.events.callRemote('setFastSlot', item);
});

mp.events.add('setFastSlotAt', (item, slotIndex) => {
    mp.events.callRemote('setFastSlotAt', item, slotIndex);
});

mp.events.add('removeFastSlot1', (item) => {
    mp.events.callRemote('removeFastSlot1', item);
});

mp.events.add('removeFastSlot2', (item) => {
    mp.events.callRemote('removeFastSlot2', item);
});

mp.events.add('removeFastSlot3', (item) => {
    mp.events.callRemote('removeFastSlot3', item);
});

/** Инвентарь: захват M4/M5 при назначении хоткея (CEF часто не ловит боковые кнопки). */
let __invBindCaptureSlot = null;
let __invBindCaptureSince = 0;
const __invBindCapturePrevDown = {};

function invEndBindCapture() {
    __invBindCaptureSlot = null;
    __invBindCaptureSince = 0;
    Object.keys(__invBindCapturePrevDown).forEach((k) => { delete __invBindCapturePrevDown[k]; });
}

mp.events.add('invBindCaptureStart', (slotStr) => {
    __invBindCaptureSlot = slotStr != null ? String(slotStr) : null;
    __invBindCaptureSince = Date.now();
    Object.keys(__invBindCapturePrevDown).forEach((k) => { delete __invBindCapturePrevDown[k]; });
    for (let vk = 1; vk <= 0xff; vk++) {
        try { if (global.isGameplayKeyDown(vk)) __invBindCapturePrevDown[vk] = true; } catch (_e) {}
    }
});

mp.events.add('invBindCaptureEnd', () => {
    invEndBindCapture();
});

mp.events.add('render', () => {
    if (!__invBindCaptureSlot || !__invBindCaptureSince) return;
    if (!invop) {
        invEndBindCapture();
        return;
    }
    if (Date.now() - __invBindCaptureSince < 350) return;
    if (Date.now() - __invBindCaptureSince > 15000) {
        invEndBindCapture();
        return;
    }
    const sideButtons = [0x05, 0x06];
    for (let i = 0; i < sideButtons.length; i++) {
        const vk = sideButtons[i];
        let down = false;
        try { down = global.isGameplayKeyDown(vk); } catch (_e) { down = false; }
        if (!down) {
            delete __invBindCapturePrevDown[vk];
            continue;
        }
        if (__invBindCapturePrevDown[vk]) continue;
        const label = (typeof global.formatVkLabel === 'function')
            ? global.formatVkLabel(vk)
            : (vk === 0x05 ? 'M4' : 'M5');
        invExecInventoryUI(
            `(function(){try{if(typeof window.invApplySlotBindCapture==='function')window.invApplySlotBindCapture(${JSON.stringify(__invBindCaptureSlot)},${vk},${JSON.stringify(label)});}catch(_e){}})();`
        );
        invEndBindCapture();
        return;
    }
});

mp.events.add('render', () => {
    if (invop) return;
    if (!mp.players.local.getVariable('auth')) return;
    if (mp.players.local.getVariable('dead')) return;
    if (mp.players.local.isTypingInTextChat || mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.getVariable('f3key') === true) return;
    if (typeof global.isTextOrMenuBlockingGameplayKeys === 'function' && global.isTextOrMenuBlockingGameplayKeys()) return;
    const binds = global.__invSlotHotkeys || {};
    Object.keys(binds).forEach((slot) => {
        const vk = binds[slot];
        if (vk == null) return;
        const down = global.isGameplayKeyDown(vk);
        if (!down) {
            _invHotkeyPrevDown[slot] = false;
            return;
        }
        if (_invHotkeyPrevDown[slot]) return;
        _invHotkeyPrevDown[slot] = true;
        const hotBase = invGridSlotItemBase(slot);
        if (hotBase === 'Бронежилет' && !invClientArmorUseGuardsPass()) return;
        if ((hotBase === 'Аптечка' || hotBase === 'Аптека') && !invClientMedkitUseGuardsPass()) return;
        if (hotBase === 'item_spank' && !invClientSpankUseGuardsPass()) return;
        if (hotBase === 'item_bong' && !invClientSpankUseGuardsPass()) return;
        if (hotBase === 'item_admin_raskur' && !invClientSpankUseGuardsPass()) return;
        if (hotBase === 'item_thermos' || hotBase === 'item_thermocup') {
            if (!invClientAlcoUseGuardsPass()) return;
            if (!global.spankAlcoClientCd || !global.spankAlcoClientCd.beginRequest()) return;
        }
        if (hotBase === 'item_alco' && !invClientAlcoUseGuardsPass()) return;
        mp.events.callRemote('inventory:hotkeyUse', slot);
    });
});

mp.events.add('inventoryGridSwap', (a, b) => {
    mp.events.callRemote('inventory:swapGrid', a, b);
});
mp.events.add('inventory:fastSlotToGrid', (fastIdx, gridIdx) => {
    mp.events.callRemote('inventory:fastSlotToGrid', fastIdx, gridIdx);
});
mp.events.add('inventory:fastSlotGridSwap', (fastIdx, gridIdx) => {
    mp.events.callRemote('inventory:fastSlotGridSwap', fastIdx, gridIdx);
});
mp.events.add('inventory:swapGrid', (a, b) => {
    mp.events.callRemote('inventory:swapGrid', a, b);
});
mp.events.add('inventoryGridSplitMove', (fromSlot, toSlot, qty) => {
    const q = qty === undefined || qty === null ? 1 : qty;
    mp.events.callRemote('inventory:gridSplitMove', fromSlot, toSlot, q);
});
mp.events.add('inventory:gridSplitMove', (fromSlot, toSlot, qty) => {
    const q = qty === undefined || qty === null ? 1 : qty;
    mp.events.callRemote('inventory:gridSplitMove', fromSlot, toSlot, q);
});
mp.events.add('inventory:mergeGridStack', (fromSlot, toSlot) => {
    mp.events.callRemote('inventory:mergeGridStack', fromSlot, toSlot);
});
mp.events.add('inventoryMoveToBag', (invSlot, bagSlot, qty) => {
    const q = qty === undefined || qty === null ? -1 : qty;
    mp.events.callRemote('inventory:moveToBag', invSlot, bagSlot, q);
});
mp.events.add('inventory:moveToBag', (invSlot, bagSlot, qty) => {
    const q = qty === undefined || qty === null ? -1 : qty;
    mp.events.callRemote('inventory:moveToBag', invSlot, bagSlot, q);
});
mp.events.add('inventoryMoveFromBag', (bagSlot, invSlot, qty) => {
    const q = qty === undefined || qty === null ? -1 : qty;
    mp.events.callRemote('inventory:moveFromBag', bagSlot, invSlot, q);
});
mp.events.add('inventory:moveFromBag', (bagSlot, invSlot, qty) => {
    const q = qty === undefined || qty === null ? -1 : qty;
    mp.events.callRemote('inventory:moveFromBag', bagSlot, invSlot, q);
});
mp.events.add('inventorySwapBagSlots', (a, b) => {
    mp.events.callRemote('inventory:swapBagSlots', a, b);
});
mp.events.add('inventory:swapBagSlots', (a, b) => {
    mp.events.callRemote('inventory:swapBagSlots', a, b);
});
mp.events.add('inventorySetSlotBind', (slotStr, json) => {
    mp.events.callRemote('inventory:setSlotBind', slotStr, json);
});
mp.events.add('inventory:setSlotBind', (slotStr, json) => {
    mp.events.callRemote('inventory:setSlotBind', slotStr, json);
});
mp.events.add('inventory:dropSlot', (slotType, index) => {
    if (!invCanDropOnGroundClient()) return;
    mp.events.callRemote('inventory:dropSlot', slotType, index);
});
mp.events.add('inventory:dropSlotQty', (slotType, index, qty) => {
    if (!invCanDropOnGroundClient()) return;
    mp.events.callRemote('inventory:dropSlotQty', slotType, index, qty);
});

mp.events.add('closeInventory', () => {
    invEndBindCapture();
    if (closeWarehouseUi()) return;
    if (inventoryBrowserr !== null) {
        inventoryBrowserr.execute(`if(typeof exitWarehouseUiMode==='function')exitWarehouseUiMode();else if(typeof scheduleInventorySlotScaleResync==='function')scheduleInventorySlotScaleResync();`);
        inventoryBrowserr.execute(`if (typeof resetInventoryEscState === 'function') resetInventoryEscState();`);
        invSetBrowserInventoryUiOpen(false);
        global.keplerHideInventoryBrowser();
        invop = false;
        mp.gui.cursor.show(false, false);
        mp.events.callRemote('setinvkey', false);
        restoreWorldUiAfterInventoryModal();
    }
});

mp.events.add('closeWarehouse', () => {
    closeWarehouseUi();
});

function parseFamilyWarehouseClientPayload(arg1, arg2) {
    let item;
    let qty = 1;
    let slot = -1;
    let toSlot = -1;
    if (typeof arg1 === 'string' && arg1.charAt(0) === '{') {
        try {
            const o = JSON.parse(arg1);
            item = o.item;
            if (o.q != null && o.q !== '') {
                /* -1 = весь стак (сервер возьмёт max из слота) */
                if (Number(o.q) === -1) {
                    qty = -1;
                } else {
                    const n = parseInt(String(o.q).replace(/\D/g, ''), 10);
                    if (Number.isFinite(n) && n > 0) qty = n;
                }
            }
            if (o.slot != null && o.slot !== '') {
                const si = parseInt(String(o.slot).replace(/[^\d-]/g, ''), 10);
                if (Number.isInteger(si) && si >= 0) slot = si;
            }
            if (o.toSlot != null && o.toSlot !== '') {
                const ti = parseInt(String(o.toSlot).replace(/[^\d-]/g, ''), 10);
                if (Number.isInteger(ti) && ti >= 0) toSlot = ti;
            }
        } catch (e) {
            item = arg1;
        }
    } else {
        item = arg1;
        if (arg2 != null && arg2 !== '') {
            if (Number(arg2) === -1) {
                qty = -1;
            } else {
                const n = parseInt(String(arg2).replace(/\D/g, ''), 10);
                if (Number.isFinite(n) && n > 0) qty = n;
            }
        }
    }
    return { item, qty, slot, toSlot };
}

mp.events.add('fractionMaterialsWithdraw', (qty) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    const n = parseInt(String(qty).replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < 1) return;
    mp.events.callRemote('fraction:materials:withdraw:s', n);
});

mp.events.add('fraction:cef:setmaterials', (mats) => {
    const n = parseInt(mats, 10) || 0;
    if (warehouseOpen && warehouseBrowserr && mp.browsers.exists(warehouseBrowserr)) {
        warehouseBrowserr.execute(
            `window.updateWarehouseMaterialsDisplay && window.updateWarehouseMaterialsDisplay(${n})`
        );
    }
    if (inventoryBrowserr && mp.browsers.exists(inventoryBrowserr)) {
        invExecInventoryUI(`window.updateWarehouseMaterialsDisplay && window.updateWarehouseMaterialsDisplay(${n})`);
    }
});

mp.events.add('fractionMaterialsDeposit', (qty) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    const n = parseInt(String(qty).replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < 1) return;
    mp.events.callRemote('fraction:materials:deposit:s', n);
});

mp.events.add('fractionWarehouseDeposit', (arg1, arg2) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    const { item, qty, slot, toSlot } = parseFamilyWarehouseClientPayload(arg1, arg2);
    if (!item) return;
    mp.events.callRemote('fraction:warehouse:deposit:s', item, qty, slot, toSlot);
});

mp.events.add('fractionWarehouseWithdraw', (arg1, arg2) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    const { item, qty, slot, toSlot } = parseFamilyWarehouseClientPayload(arg1, arg2);
    if (!item) return;
    mp.events.callRemote('fraction:warehouse:withdraw:s', item, qty, slot, toSlot);
});

mp.events.add('familyWarehouseDeposit', (arg1, arg2) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    const { item, qty, slot, toSlot } = parseFamilyWarehouseClientPayload(arg1, arg2);
    if (!item) return;
    mp.events.callRemote('family:warehouse:deposit:s', item, qty, slot, toSlot);
});

mp.events.add('familyWarehouseWithdraw', (arg1, arg2) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    const { item, qty, slot, toSlot } = parseFamilyWarehouseClientPayload(arg1, arg2);
    if (!item) return;
    mp.events.callRemote('family:warehouse:withdraw:s', item, qty, slot, toSlot);
});

mp.events.add('familyWarehouseSwap', (fromIdx, toIdx) => {
    if (new Date().getTime() - mp.players.local.clicked < 200) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('family:warehouse:swap:s', fromIdx, toIdx);
});

mp.events.add('fractionWarehouseSwap', (fromIdx, toIdx) => {
    if (new Date().getTime() - mp.players.local.clicked < 200) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('fraction:warehouse:swap:s', fromIdx, toIdx);
});

mp.events.add('vehicleTrunkDeposit', (arg1, arg2) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    const { item, qty, slot, toSlot } = parseFamilyWarehouseClientPayload(arg1, arg2);
    if (!item) return;
    mp.events.callRemote('vehicle:trunk:deposit:s', item, qty, slot, toSlot);
});

mp.events.add('vehicleTrunkWithdraw', (arg1, arg2) => {
    if (new Date().getTime() - mp.players.local.clicked < 400) return;
    mp.players.local.clicked = new Date().getTime();
    const { item, qty, slot, toSlot } = parseFamilyWarehouseClientPayload(arg1, arg2);
    if (!item) return;
    mp.events.callRemote('vehicle:trunk:withdraw:s', item, qty, slot, toSlot);
});

mp.events.add('vehicleTrunkSwap', (fromIdx, toIdx) => {
    if (new Date().getTime() - mp.players.local.clicked < 200) return;
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('vehicle:trunk:swap:s', fromIdx, toIdx);
});

/** Единый кулдаун спанк/бонг/алко (инвентарь), синхрон с сервером; pending снимается по ответу сервера */
const SPANK_ALCO_CLIENT_CD_MS = 0;
global.__spankConsumeBlockedUntilMs = 0;
global.spankAlcoClientCd = {
    lastMs: 0,
    pending: false,
    _t: null,
    canFireNow() {
        if (this.pending) return false;
        if (
            typeof global.isConsumableUseAnimBusy === 'function' &&
            global.isConsumableUseAnimBusy()
        ) {
            return false;
        }
        return Date.now() - this.lastMs >= SPANK_ALCO_CLIENT_CD_MS;
    },
    beginRequest() {
        if (!this.canFireNow()) return false;
        this.pending = true;
        if (this._t) clearTimeout(this._t);
        this._t = setTimeout(() => this.onReject(), 5000);
        return true;
    },
    onUsed() {
        if (this._t) clearTimeout(this._t);
        this._t = null;
        this.pending = false;
        this.lastMs = Date.now();
    },
    onReject() {
        if (this._t) clearTimeout(this._t);
        this._t = null;
        this.pending = false;
    }
};
mp.events.add('spankAlco:used', () => {
    if (global.spankAlcoClientCd) global.spankAlcoClientCd.onUsed();
});
mp.events.add('spankAlco:reject', () => {
    if (global.spankAlcoClientCd) global.spankAlcoClientCd.onReject();
});
mp.events.add('spankConsumableCdSync', (_secRaw) => {
    /* КД «пока действует нельзя» отключён — только блок после урона (2 сек). */
});

mp.events.add('useConsumable', (itemName) => {
    const base = String(itemName || '').split('(')[0].trim().split('#')[0].trim();
    if (base === 'item_skateboard') {
        mp.events.call('skateboard:hotkeyToggle:c');
        return;
    }
    if (base === 'item_drone') {
        if (typeof global.isDroneActiveClient === 'function' && global.isDroneActiveClient()) {
            mp.events.call('drone:forceStop');
            return;
        }
        mp.events.call('closeInventory');
        setTimeout(() => {
            mp.events.call('drone:toggle:c');
        }, 200);
        return;
    }
    if (itemName === 'item_bong') {
        if (!invClientSpankUseGuardsPass()) return;
        if (!global.spankAlcoClientCd || !global.spankAlcoClientCd.beginRequest()) return;
        mp.events.callRemote('useBong:SERVER');
        return;
    }
    if (base === 'item_admin_raskur') {
        if (!invClientSpankUseGuardsPass()) return;
        if (!global.spankAlcoClientCd || !global.spankAlcoClientCd.beginRequest()) return;
        mp.events.callRemote('useAdminRaskur:SERVER');
        return;
    }
    if (itemName === 'item_thermos' || itemName === 'item_thermocup') {
        if (!invClientAlcoUseGuardsPass()) return;
        if (!global.spankAlcoClientCd || !global.spankAlcoClientCd.beginRequest()) return;
        mp.events.callRemote('useThermos:SERVER');
        return;
    }
    if (base === 'Бронежилет' && !invClientArmorUseGuardsPass()) return;
    if ((itemName === 'Аптечка' || itemName === 'Аптека') && !invClientMedkitUseGuardsPass()) return;
    if (itemName === 'item_spank' && !invClientSpankUseGuardsPass()) return;
    if (itemName === 'item_alco' && !invClientAlcoUseGuardsPass()) return;
    if (itemName === 'item_spank' || itemName === 'item_alco') {
        if (!global.spankAlcoClientCd || !global.spankAlcoClientCd.beginRequest()) return;
    }
    mp.events.callRemote('useConsumable:SERVER', itemName);
});

mp.events.add('activateSpankBuff', (seconds) => {
    const sec = Number(seconds) || 60;
    if (typeof hudr !== 'undefined' && hudr) {
        hudr.execute(`hudMain.activateSpank(${sec})`);
    }
});

mp.events.add('activateAlcoBuff', (seconds) => {
    const sec = Number(seconds) || 120;
    if (typeof hudr !== 'undefined' && hudr) {
        hudr.execute(`hudMain.activateAlco(${sec})`);
    }
});

mp.events.add('clearConsumableResists:c', () => {
    if (typeof hudr !== 'undefined' && hudr) {
        hudr.execute('hudMain.clearConsumableResists()');
    }
});

mp.events.add('activateBongBuff', () => {
    if (typeof hudr !== 'undefined' && hudr) {
        hudr.execute('hudMain.activateSpank(240)');
    }
});

mp.events.add('activateAdminRaskurBuff', (seconds) => {
    const sec = Math.max(0, Math.floor(Number(seconds) || 0));
    if (typeof hudr !== 'undefined' && hudr) {
        hudr.execute(`hudMain.activateAdminRaskur(${sec})`);
    }
});

/** Z пола под игроком: луч только вниз от ног — не попадаем в потолок/объект над головой. */
function invDropFloorZAt(px, py, pz) {
    const feetZ = Number(pz);
    const maxHitZ = feetZ + 0.35;
    let gz = null;
    try {
        const hint = mp.game.gameplay.getGroundZFor3dCoord(px, py, feetZ + 2.0, 0, false);
        if (typeof hint === 'number' && isFinite(hint) && hint > 0 && hint <= maxHitZ + 0.25) {
            gz = hint;
        }
    } catch (_e0) {}
    try {
        const flags = 1 | 2 | 4 | 8 | 16 | 32;
        const hit = mp.raycasting.testPointToPoint(
            new mp.Vector3(px, py, feetZ + 0.5),
            new mp.Vector3(px, py, feetZ - 25.0),
            mp.players.local,
            flags
        );
        if (hit && hit.position && isFinite(hit.position.z) && hit.position.z <= maxHitZ) {
            gz = hit.position.z;
        }
    } catch (_e1) {}
    if (typeof gz !== 'number' || !isFinite(gz) || gz <= 0) {
        gz = feetZ - 1.0;
    }
    return gz;
}

/** Высота земли для дропа оружия (сервер не имеет нативов GTA). */
mp.events.add('invDropRequestGround', (token, x, y, z, dim, _itemKey) => {
    try {
        if (token == null || x == null || y == null || z == null) return;
        const px = Number(x);
        const py = Number(y);
        const pz = Number(z);
        if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) return;
        mp.events.callRemote('invDropGroundReady', token, invDropFloorZAt(px, py, pz));
    } catch (_e) {
        mp.events.callRemote('invDropGroundReady', token, Number(z) - 1.0);
    }
});

mp.events.add('weaponDropRequestGround', (token, x, y, z, dim, _itemKey) => {
    try {
        if (token == null || x == null || y == null || z == null) return;
        const px = Number(x);
        const py = Number(y);
        const pz = Number(z);
        if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) return;
        mp.events.callRemote('weaponDropGroundReady', token, invDropFloorZAt(px, py, pz));
    } catch (_e) {
        mp.events.callRemote('weaponDropGroundReady', token, Number(z) - 1.0);
    }
});

setInterval(()=>{if(!inventoryBrowserr||!inventoryBrowserr.active||!mp.browsers.exists(inventoryBrowserr))return;const p=mp.players.local,values={};for(const key of ['satiety','thirst','mood']){const value=p.getVariable(key);if(typeof value==='number')values[key]=value;}inventoryBrowserr.execute('window.INVENTORY_UI&&INVENTORY_UI.updateVitals('+JSON.stringify(values)+');');},1000);

mp.events.add('legacy:bandolier:move',(mode,from,to,expected)=>{if(typeof expected==='string'&&expected.length<=32768)mp.events.callRemote('legacy:bandolier:move',mode,Number(from),Number(to),expected);});
