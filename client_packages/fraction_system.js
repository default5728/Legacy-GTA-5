/**
 * fraction_system.js (client)
 * Клиентская сторона системы фракций
 * Планшет: GTA5RP menu_faction (browsers/menu_faction)
 * Bizwar overlay: старый browsers/fraction (только overlay)
 */

'use strict';

if (!global.rpc) {
    try { global.rpc = require('./rage-rpc.min.js'); } catch (_e) {}
}
const rpc = global.rpc;

const FACTION_MENU_URL = 'package://browsers/menu_faction/index.html?v=20';
const FACTION_MENU_ORDER_ID = 200;

// ─── Старый браузер (bizwar overlay) ──────────────────────────────────────────
let fracBrowser = null;
let fracBrowserReady = false;
let fracPendingQueue = [];

function getFracBrowser() {
    if (fracBrowser && mp.browsers.exists(fracBrowser)) return fracBrowser;
    fracBrowserReady = false;
    fracPendingQueue = [];
    fracBrowser = mp.browsers.new('package://browsers/fraction/index.html?v=16');
    global.fracBrowser = fracBrowser;
    try { fracBrowser.active = false; } catch (_e) {}
    if (typeof global.registerActiveBrowserOverlay === 'function') {
        global.registerActiveBrowserOverlay(() => (bizMenuOpen ? fracBrowser : null));
    }
    return fracBrowser;
}

function fracExec(code) {
    const b = getFracBrowser();
    if (!mp.browsers.exists(b)) return;
    if (fracBrowserReady) {
        try { b.execute(code); } catch (_e) {}
    } else {
        fracPendingQueue.push(code);
    }
}

// ─── Новый браузер меню фракции (GTA5RP) ──────────────────────────────────────
let factionMenuBrowser = null;
let factionMenuReady = false;
let factionMenuPending = null;
let lastFactionFlowPayload = null;

function getFactionMenuBrowser() {
    if (factionMenuBrowser && mp.browsers.exists(factionMenuBrowser)) {
        global.__factionMenuBrowser = factionMenuBrowser;
        return factionMenuBrowser;
    }
    factionMenuReady = false;
    factionMenuPending = null;
    factionMenuBrowser = mp.browsers.new(FACTION_MENU_URL);
    factionMenuBrowser.active = false;
    try { factionMenuBrowser.orderId = FACTION_MENU_ORDER_ID; } catch (_eOrd) {}
    global.__factionMenuBrowser = factionMenuBrowser;
    return factionMenuBrowser;
}

function applyFactionMenuLayer() {
    try {
        if (factionMenuBrowser && mp.browsers.exists(factionMenuBrowser)) {
            factionMenuBrowser.active = true;
            factionMenuBrowser.orderId = FACTION_MENU_ORDER_ID;
        }
    } catch (_e) {}
}

function hideChatForFactionMenu() {
    try {
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    } catch (_e0) {}
    try { mp.events.call('hideChatServer'); } catch (_e1) {}
    try {
        mp.gui.chat.show(false);
        mp.gui.chat.activate(false);
    } catch (_e2) {}
    try {
        if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
        }
    } catch (_e3) {}
    try {
        if (typeof global.applyCustomChatVisibility === 'function') {
            global.applyCustomChatVisibility(false);
        }
    } catch (_e4) {}
}

function mapFlowPayloadToGta5rp(flow) {
    const ranks = Array.isArray(flow.ranks) ? flow.ranks.slice().sort((a, b) => (a.rank || 0) - (b.rank || 0)) : [];
    const PERMS = [
        { code: 'changeRank', name: 'Изменять ранги' },
        { code: 'warehouseAccess', name: 'Доступ к складу' },
        { code: 'warehouseClosedAccess', name: 'Склад (закрытый)' },
        { code: 'warehouseToggle', name: 'Управление складом' },
        { code: 'bizwar', name: 'Бизвары' },
        { code: 'withdrawMoney', name: 'Снимать деньги' },
        { code: 'craftAccess', name: 'Крафт оружия' },
        { code: 'canInvite', name: 'Приглашать' },
        { code: 'canDismiss', name: 'Увольнять' },
        { code: 'canLogs', name: 'Логи' }
    ];
    const rankNameList = [];
    for (let i = 1; i <= 10; i++) {
        if (i === 10) {
            rankNameList.push('Лидер');
            continue;
        }
        const r = ranks.find((x) => parseInt(x.rank, 10) === i);
        rankNameList.push(r && r.name ? String(r.name) : ('Ранг ' + i));
    }
    const rankPermissions = rankNameList.map((_, idx) => {
        const rankNum = idx + 1;
        if (rankNum === 10) return PERMS.map((p) => p.code);
        const r = ranks.find((x) => parseInt(x.rank, 10) === rankNum);
        if (!r) return [];
        return PERMS.filter((p) => !!r[p.code]).map((p) => p.code);
    });
    const members = (flow.members || []).map((m) => {
        const login = String(m.name || ('Player_' + (m.static || 0))).replace(/_/g, ' ');
        const sid = parseInt(m.static, 10) || 0;
        return [
            login,
            !!m.online,
            parseInt(m.rank, 10) || 1,
            parseInt(m.lastLogin, 10) || 0,
            sid
        ];
    });
    let leaderName = '';
    try {
        const leader = (flow.members || []).find((m) => parseInt(m.rank, 10) === 10);
        if (leader && leader.name) leaderName = String(leader.name).replace(/_/g, ' ');
    } catch (_e) {}
    const news = Array.isArray(flow.news)
        ? flow.news.map((n) => ({
            title: String((n && n.title) || ''),
            text: String((n && n.text) || ''),
            date: String((n && n.date) || '')
        }))
        : [];
    return {
        permissions: {
            isLeader: !!flow.isLeader,
            changeRank: !!flow.canManageRanks || !!flow.isLeader,
            unInvite: !!flow.canDismiss || !!flow.isLeader,
            warehouseAccess: !!flow.canWarehouse || !!flow.isLeader,
            warehouseToggle: !!flow.canWarehouseToggle || !!flow.isLeader,
            canLogs: !!flow.canLogs || !!flow.isLeader
        },
        canViewLogs: !!flow.canLogs || !!flow.isLeader,
        news,
        notify: { text: String(flow.advert || ''), leader: leaderName },
        members,
        vehList: [],
        warehouseCloseStatus: flow.warehouseOpen === false,
        bank: parseInt(flow.balance, 10) || 0,
        rankPermissions,
        rankAllPermissions: PERMS,
        rankNameList,
        acrList: [],
        weaponSetList: [],
        weaponForSetList: [],
        weaponSetEnable: false
    };
}

function flushFactionMenuOpen(gtaPayload) {
    const b = getFactionMenuBrowser();
    if (!mp.browsers.exists(b)) return;
    applyFactionMenuLayer();
    const json = JSON.stringify(gtaPayload);
    // Только factionMenuOpen — внутри уже menuManager_menu_open.
    // Двойной вызов сбрасывал поиск/вкладку (load → membersSearch="").
    try {
        b.execute('try{factionMenuOpen(' + json + ');}catch(_e){}');
    } catch (_e) {}
}

/** Обновить список участников без полного reload (сохраняет поиск и вкладку). */
function flushFactionMenuMembersSoft(gtaPayload) {
    const b = getFactionMenuBrowser();
    if (!mp.browsers.exists(b) || !fracTabletOpen) return;
    const members = (gtaPayload && gtaPayload.members) || [];
    let leader = '';
    try {
        leader = (gtaPayload && gtaPayload.notify && gtaPayload.notify.leader) || '';
    } catch (_e) {}
    try {
        b.execute(
            'try{factionMenuUpdateMembers(' +
                JSON.stringify(members) +
                ',' +
                JSON.stringify({ notifyLeader: leader }) +
                ');}catch(_e){}'
        );
    } catch (_e2) {}
}

/* Безопасное переключение курсора — обёртка для предотвращения двойных вызовов в одном тике. */
let _cursorState = false;
function setCursor(visible, force) {
    const want = !!visible;
    if (!force && _cursorState === want) return;
    _cursorState = want;
    try { mp.gui.cursor.show(want, want); } catch (_e) {}
    try { mp.gui.cursor.visible = want; } catch (_e2) {}
    try { mp.gui.chat.activate(!want); } catch (_e3) {}
}

// ─── Статус планшета ──────────────────────────────────────────────────────────
let fracTabletOpen = false;
let bizMenuOpen    = false;
let pendingBizwarPayload = null;

function openBizwarMenuOverlay(payloadJson) {
    if (typeof global.queueWarMapAttack === 'function') {
        global.queueWarMapAttack(payloadJson, 'faction');
        return;
    }
    if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    bizMenuOpen = true;
    setCursor(true);
    const parsedCmd = `JSON.parse(${JSON.stringify(payloadJson)})`;
    getFracBrowser();
    if (fracBrowser && mp.browsers.exists(fracBrowser)) fracBrowser.active = true;
    fracExec(`try{var root=document.getElementById('root');if(root&&!root.classList.contains('open'))root.classList.add('open');if(window.FracApp&&FracApp.openBizwar){FracApp.openBizwar(${parsedCmd});FracApp.tab('zones');}}catch(_e){}`);
    if (!fracTabletOpen) {
        fracTabletOpen = true;
        try { mp.events.callRemote('fraction:v', true); } catch (_) {}
    }
}

function openFracTablet(payloadJson) {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (mp.players.local.getVariable('inCapt') === true) return;
    if (mp.players.local.getVariable('jail')) return;

    if (!payloadJson || (typeof payloadJson === 'string' && !String(payloadJson).trim())) {
        mp.events.call('notify:client', 2, 'top-mid', 'Меню фракции недоступно.', 3500);
        return;
    }

    if (bizMenuOpen) {
        bizMenuOpen = false;
        fracExec('try{var o=document.getElementById("bizwarOverlay");if(o)o.classList.remove("open");}catch(_e){}');
        if (fracBrowser && mp.browsers.exists(fracBrowser)) fracBrowser.active = false;
    }

    let flow;
    try {
        flow = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
    } catch (_e) {
        mp.events.call('notify:client', 2, 'top-mid', 'Меню фракции недоступно.', 3500);
        return;
    }
    lastFactionFlowPayload = flow;
    const gtaPayload = mapFlowPayloadToGta5rp(flow);

    if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    fracTabletOpen = true;
    setCursor(true);
    mp.events.callRemote('fraction:v', true);
    hideChatForFactionMenu();
    try {
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        }
    } catch (_eHud) {}
    hideChatForFactionMenu();
    setTimeout(hideChatForFactionMenu, 0);
    setTimeout(hideChatForFactionMenu, 50);

    getFactionMenuBrowser();
    applyFactionMenuLayer();
    if (factionMenuReady) flushFactionMenuOpen(gtaPayload);
    else factionMenuPending = gtaPayload;
}

function closeFracTablet() {
    if (!fracTabletOpen && !bizMenuOpen) return;
    fracTabletOpen = false;
    factionMenuPending = null;
    if (typeof global.closeFracInteractMenu === 'function') global.closeFracInteractMenu(true);
    if (bizMenuOpen) {
        bizMenuOpen = false;
        const _mb = global.menuBrowser;
        if (_mb && mp.browsers.exists(_mb)) {
            try {
                rpc.triggerBrowser(_mb, 'menuManager_menu_close', 'faction_gang_capture');
                rpc.triggerBrowser(_mb, 'menuManager_menu_close', 'faction_mafia_war');
                _mb.active = false;
            } catch (_e) {}
        }
        fracExec('try{var o=document.getElementById("bizwarOverlay");if(o)o.classList.remove("open");}catch(_e){}');
    }
    if (!bizMenuOpen) setCursor(false, true);
    try { mp.events.callRemote('fraction:v', false); } catch (_) {}
    try {
        if (factionMenuBrowser && mp.browsers.exists(factionMenuBrowser)) {
            factionMenuBrowser.execute('try{factionMenuHide();}catch(_e){}');
            factionMenuBrowser.active = false;
        }
    } catch (_e) {}
    if (fracBrowser && mp.browsers.exists(fracBrowser)) fracBrowser.active = false;
    if (typeof global.setWorldUiUnlocked === 'function') global.setWorldUiUnlocked(true);
    if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal('fractionTablet');
    else {
        try { mp.events.callRemote('showHud:SERVER'); } catch (_e) {}
        if (typeof global.syncWorldChromeFromStoredSettings === 'function') {
            global.syncWorldChromeFromStoredSettings();
        }
    }
}

// ─── Сервер → клиент ──────────────────────────────────────────────────────────
mp.events.add('fraction:tablet:open:c', (payloadJson) => {
    openFracTablet(payloadJson);
    if (pendingBizwarPayload) {
        const pending = pendingBizwarPayload;
        pendingBizwarPayload = null;
        setTimeout(() => {
            // После открытия планшета открываем капт UI в главном меню
            const mb = global.menuBrowser;
            if (mb && mp.browsers.exists(mb)) {
                bizMenuOpen = true;
                setCursor(true);
                try { mb.active = true; } catch (_e) {}
                try { mb.orderId = 220; } catch (_e2) {}
                const payload = typeof pending === 'string' ? JSON.parse(pending) : (pending || {});
                const zoneId = parseInt(payload.zoneId, 10) || 0;
                const history = Array.isArray(payload.history) ? payload.history : [];
                rpc.triggerBrowser(mb, 'menuManager_menu_open', {
                    menu: 'faction_gang_capture',
                    data: { zoneId: String(zoneId), bizId: String(zoneId), history }
                });
            } else if (typeof global.queueWarMapAttack === 'function') {
                global.queueWarMapAttack(pending, 'faction');
            }
        }, 80);
    }
});

mp.events.add('fraction:tablet:close', () => {
    closeFracTablet();
});

mp.events.add('frac:gta5rp:ready', () => {
    factionMenuReady = true;
    if (factionMenuPending && fracTabletOpen) {
        const p = factionMenuPending;
        factionMenuPending = null;
        flushFactionMenuOpen(p);
    }
});

mp.events.add('client_menuManager_taskClose', (page) => {
    if (page === 'faction' && fracTabletOpen) closeFracTablet();
    if ((page === 'faction_gang_capture' || page === 'faction_mafia_war') && bizMenuOpen) {
        bizMenuOpen = false;
        const mb = global.menuBrowser;
        if (mb && mp.browsers.exists(mb)) {
            try { mb.active = false; } catch (_e) {}
        }
        if (!fracTabletOpen) setCursor(false);
    }
});

mp.events.add('clientFunc_setWaypoint', (x, y) => {
    try {
        mp.game.ui.setNewWaypoint(Number(x) || 0, Number(y) || 0);
    } catch (_e) {}
});

/** CEF faction menu → client → server (надёжный мост вместо rpc.callServer из CEF). */
mp.events.add('factionMenu:rpc', (name, argsJson, reqId) => {
    try {
        if (!name || !reqId) throw new Error('Некорректный запрос меню фракции');
        mp.events.callRemote('factionMenu:rpc:s', String(name || ''), String(argsJson || 'null'), String(reqId || ''));
    } catch (_e) {
        const b = factionMenuBrowser;
        if (b && mp.browsers.exists(b)) {
            try {
                b.execute(
                    'try{window.__factionRpcResult(' +
                        JSON.stringify(String(reqId || '')) +
                        ',false,' +
                        JSON.stringify('Ошибка клиента') +
                        ');}catch(_e){}'
                );
            } catch (_e2) {}
        }
    }
});

mp.events.add('factionMenu:rpc:result:c', (reqId, okRaw, payloadJson) => {
    const b = factionMenuBrowser;
    if (!b || !mp.browsers.exists(b)) return;
    const ok = okRaw === true || okRaw === 1 || okRaw === '1' || okRaw === 'true';
    let payload = payloadJson;
    try {
        if (typeof payloadJson === 'string') payload = JSON.parse(payloadJson);
    } catch (_e) {
        payload = payloadJson;
    }
    const code =
        'try{window.__factionRpcResult(' +
        JSON.stringify(String(reqId || '')) +
        ',' +
        (ok ? 'true' : 'false') +
        ',' +
        JSON.stringify(payload) +
        ');}catch(_e){}';
    try { b.execute(code); } catch (_e2) {}
});

mp.events.add('fraction:members:list:c', (json) => {
    try {
        const list = typeof json === 'string' ? JSON.parse(json) : json;
        if (!lastFactionFlowPayload) return;
        lastFactionFlowPayload.members = list;
        if (fracTabletOpen) {
            // Soft update: не вызывать load() — иначе сбрасывается membersSearch и tab.
            flushFactionMenuMembersSoft(mapFlowPayloadToGta5rp(lastFactionFlowPayload));
        }
    } catch (_e) {}
});

mp.events.add('fraction:menu:news:c', (json) => {
    try {
        const news = typeof json === 'string' ? JSON.parse(json) : json;
        if (lastFactionFlowPayload) lastFactionFlowPayload.news = news;
        if (fracTabletOpen && factionMenuBrowser && mp.browsers.exists(factionMenuBrowser)) {
            factionMenuBrowser.execute(
                'try{if(window.factionMenu&&factionMenu.vue)factionMenu.vue.news=' +
                    JSON.stringify(news || []) +
                    ';}catch(_e){}'
            );
        }
    } catch (_e) {}
});

mp.events.add('fraction:rank:updated', (rank, rankName) => {
    mp.players.local.setVariable && mp.players.local.setVariable('fraction_rank', rank);
});

mp.events.add('fraction:rating:data:c', (_json) => {
    /* рейтинг в новом меню не используется */
});

// ─── Зоны гетто (квадраты на карте) ──────────────────────────────────────────
//
// Позиции квадратов гетто: база с RedAge v3 + расширение Davis/El Burro (будущий HQ).
// Sprite 5 + radius:50 даёт реальный «квадрат» на миникарте и большой карте,
// заполненный полупрозрачным цветом.
//
const ZONE_POSITIONS = [
    { x: -200.8397, y: -1431.556, z: 30.18104 },
    { x: -100.8397, y: -1431.556, z: 30.18104 },
    { x:   -0.8397, y: -1431.556, z: 30.18104 },
    { x:   99.1603, y: -1431.556, z: 30.18104 },
    { x: -200.8397, y: -1531.556, z: 30.18104 },
    { x: -100.8397, y: -1531.556, z: 30.18104 },
    { x:   -0.8397, y: -1531.556, z: 30.18104 },
    { x:   99.1603, y: -1531.556, z: 30.18104 },
    { x:  199.1603, y: -1531.556, z: 30.18104 },
    { x:  299.1603, y: -1531.556, z: 30.18104 },
    { x:  399.1603, y: -1531.556, z: 30.18104 },
    { x:  499.1603, y: -1531.556, z: 30.18104 },
    { x: -200.8397, y: -1631.556, z: 30.18104 },
    { x: -100.8397, y: -1631.556, z: 30.18104 },
    { x:   -0.8397, y: -1631.556, z: 30.18104 },
    { x:   99.1603, y: -1631.556, z: 30.18104 },
    { x:  199.1603, y: -1631.556, z: 30.18104 },
    { x:  299.1603, y: -1631.556, z: 30.18104 },
    { x:  399.1603, y: -1631.556, z: 30.18104 },
    { x:  499.1603, y: -1631.556, z: 30.18104 },
    { x:  599.1603, y: -1631.556, z: 30.18104 },
    { x: -100.8397, y: -1731.556, z: 30.18104 },
    { x:   -0.8397, y: -1731.556, z: 30.18104 },
    { x:   99.1603, y: -1731.556, z: 30.18104 },
    { x:  199.1603, y: -1731.556, z: 30.18104 },
    { x:  299.1603, y: -1731.556, z: 30.18104 },
    { x:  399.1603, y: -1731.556, z: 30.18104 },
    { x:  499.1603, y: -1731.556, z: 30.18104 },
    { x:  599.1603, y: -1731.556, z: 30.18104 },
    { x:   -0.8397, y: -1831.556, z: 30.18104 },
    { x:   99.1603, y: -1831.556, z: 30.18104 },
    { x:  199.1603, y: -1831.556, z: 30.18104 },
    { x:  299.1603, y: -1831.556, z: 30.18104 },
    { x:  399.1603, y: -1831.556, z: 30.18104 },
    { x:  499.1603, y: -1831.556, z: 30.18104 },
    { x:  599.1603, y: -1831.556, z: 30.18104 },
    { x:   99.1603, y: -1931.556, z: 30.18104 },
    { x:  199.1603, y: -1931.556, z: 30.18104 },
    { x:  299.1603, y: -1931.556, z: 30.18104 },
    { x:  399.1603, y: -1931.556, z: 30.18104 },
    { x:  499.1603, y: -1931.556, z: 30.18104 },
    { x:  599.1603, y: -1931.556, z: 30.18104 },
    { x:  199.1603, y: -2031.556, z: 30.18104 },
    { x:  299.1603, y: -2031.556, z: 30.18104 },
    { x:  399.1603, y: -2031.556, z: 30.18104 },
    { x:  499.1603, y: -2031.556, z: 30.18104 },
    { x:  299.1603, y: -2131.556, z: 30.18104 },
    { x:  399.1603, y: -2131.556, z: 30.18104 },
    { x:  768.8984, y: -2401.556, z: 28.17772 },
    { x:  868.8984, y: -2401.556, z: 28.17772 },
    { x:  968.8984, y: -2401.556, z: 28.17772 },
    { x: 1068.898,  y: -2401.556, z: 28.17772 },
    { x:  768.8984, y: -2301.556, z: 28.17772 },
    { x:  868.8984, y: -2301.556, z: 28.17772 },
    { x:  968.8984, y: -2301.556, z: 28.17772 },
    { x: 1068.898,  y: -2301.556, z: 28.17772 },
    { x:  768.8984, y: -2201.556, z: 28.17772 },
    { x:  868.8984, y: -2201.556, z: 28.17772 },
    { x:  968.8984, y: -2201.556, z: 28.17772 },
    { x: 1068.898,  y: -2201.556, z: 28.17772 },
    { x:  768.8984, y: -2101.556, z: 28.17772 },
    { x:  868.8984, y: -2101.556, z: 28.17772 },
    { x:  968.8984, y: -2101.556, z: 28.17772 },
    { x: 1068.898,  y: -2101.556, z: 28.17772 },
    { x:  768.8984, y: -2001.556, z: 28.17772 },
    { x:  868.8984, y: -2001.556, z: 28.17772 },
    { x:  968.8984, y: -2001.556, z: 28.17772 },
    { x: 1068.898,  y: -2001.556, z: 28.17772 },
    { x:  768.8984, y: -1901.556, z: 28.17772 },
    { x:  868.8984, y: -1901.556, z: 28.17772 },
    { x:  968.8984, y: -1901.556, z: 28.17772 },
    { x: 1068.898,  y: -1901.556, z: 28.17772 },
    { x:  768.8984, y: -1801.556, z: 28.17772 },
    { x:  868.8984, y: -1801.556, z: 28.17772 },
    { x:  968.8984, y: -1801.556, z: 28.17772 },
    { x: 1168.898,  y: -1801.556, z: 28.17772 },
    { x: 1268.898,  y: -1801.556, z: 28.17772 },
    { x:  768.8984, y: -1701.556, z: 28.17772 },
    { x:  868.8984, y: -1701.556, z: 28.17772 },
    { x:  968.8984, y: -1701.556, z: 28.17772 },
    { x: 1168.898,  y: -1701.556, z: 28.17772 },
    { x: 1268.898,  y: -1701.556, z: 28.17772 },
    { x: 1368.898,  y: -1701.556, z: 28.17772 },
    { x:  768.8984, y: -1601.556, z: 28.17772 },
    { x:  868.8984, y: -1601.556, z: 28.17772 },
    { x: 1168.898,  y: -1601.556, z: 28.17772 },
    { x: 1268.898,  y: -1601.556, z: 28.17772 },
    { x: 1368.898,  y: -1601.556, z: 28.17772 },
    { x: 1268.898,  y: -1501.556, z: 28.17772 },
    { x: 1368.898,  y: -1501.556, z: 28.17772 },

    // ── 91–128: сетка 100×100 — замыкание 1168–1468, средняя ячейка -1501 (центр ~853,-1499), короткий хвост -2501 (3 кв.)
    { x: 1168.898, y: -2401.556, z: 28.17772 },
    { x: 1268.898, y: -2401.556, z: 28.17772 },
    { x: 1368.898, y: -2401.556, z: 28.17772 },
    { x: 1468.898, y: -2401.556, z: 28.17772 },
    { x: 1168.898, y: -2301.556, z: 28.17772 },
    { x: 1268.898, y: -2301.556, z: 28.17772 },
    { x: 1368.898, y: -2301.556, z: 28.17772 },
    { x: 1468.898, y: -2301.556, z: 28.17772 },
    { x: 1168.898, y: -2201.556, z: 28.17772 },
    { x: 1268.898, y: -2201.556, z: 28.17772 },
    { x: 1368.898, y: -2201.556, z: 28.17772 },
    { x: 1468.898, y: -2201.556, z: 28.17772 },
    { x: 1168.898, y: -2101.556, z: 28.17772 },
    { x: 1268.898, y: -2101.556, z: 28.17772 },
    { x: 1368.898, y: -2101.556, z: 28.17772 },
    { x: 1468.898, y: -2101.556, z: 28.17772 },
    { x: 1168.898, y: -2001.556, z: 28.17772 },
    { x: 1268.898, y: -2001.556, z: 28.17772 },
    { x: 1368.898, y: -2001.556, z: 28.17772 },
    { x: 1468.898, y: -2001.556, z: 28.17772 },
    { x: 1168.898, y: -1901.556, z: 28.17772 },
    { x: 1268.898, y: -1901.556, z: 28.17772 },
    { x: 1368.898, y: -1901.556, z: 28.17772 },
    { x: 1468.898, y: -1901.556, z: 28.17772 },
    // «Дырки» в рядах -1801 … -1501 + коридор к ~980,-1605
    { x: 1068.898, y: -1801.556, z: 28.17772 },
    { x: 1368.898, y: -1801.556, z: 28.17772 },
    { x: 1468.898, y: -1801.556, z: 28.17772 },
    { x: 1068.898, y: -1701.556, z: 28.17772 },
    { x: 1468.898, y: -1701.556, z: 28.17772 },
    { x: 968.8984, y: -1601.556, z: 28.17772 },
    { x: 1068.898, y: -1601.556, z: 28.17772 },
    { x: 1468.898, y: -1601.556, z: 28.17772 },
    { x: 768.8984, y: -1501.556, z: 28.17772 },
    { x: 868.8984, y: -1501.556, z: 28.17772 }, // зона #124 — Grove (~853,-1499), шаг сетки 100
    { x: 968.8984, y: -1501.556, z: 28.17772 },

    { x: 1268.898, y: -2501.556, z: 28.17772 },
    { x: 1368.898, y: -2501.556, z: 28.17772 },
    { x: 1468.898, y: -2501.556, z: 28.17772 },
];
const ZONE_COUNT = ZONE_POSITIONS.length; // 128 — синхронно с DEFAULT_ZONE_COUNT на сервере
global.fractionZonePositions = ZONE_POSITIONS.map((p) => ({ x: p.x, y: p.y }));

/** Ближайшая зона капта (1-based id) в радиусе maxDist (по XY). */
function findNearestGangZoneId(maxDist) {
    const limit = Number.isFinite(Number(maxDist)) ? Number(maxDist) : 90;
    const limitSq = limit * limit;
    const p = mp.players.local.position;
    let bestId = 0;
    let bestD = limitSq;
    for (let i = 0; i < ZONE_POSITIONS.length; i++) {
        const z = ZONE_POSITIONS[i];
        const dx = p.x - z.x;
        const dy = p.y - z.y;
        const d = dx * dx + dy * dy;
        if (d <= bestD) {
            bestD = d;
            bestId = i + 1;
        }
    }
    return bestId;
}

if (typeof global !== 'undefined') {
    global.findNearestGangZoneId = findNearestGangZoneId;
}
const BIZWAR_PREP_FALL_EXTRA_Z = 1.15;

/**
 * Цвет blip (RAGE MP color index) для фракции.
 * 0 = нейтрально (тёмно-серый).
 * 58 = фиолетовый Ballas, 52 = зелёный Families, 59 = красный Bloods,
 * 70 = жёлтый Vagos, 77 = голубой Marabunta.
 */
const ZONE_BLIP_COLOR = {
    0: 40,  // нейтрально
    1: 58,  // Ballas
    2: 52,  // Families
    3: 59,  // Bloods
    4: 70,  // Vagos
    5: 77,  // Marabunta
    6: 0    // FIB (не участвует, но на всякий)
};

/** Массив blips, индекс = zoneId-1 */
let zoneBlips = [];

function destroyAllZoneBlips() {
    for (const b of zoneBlips) {
        try { if (b && typeof b.destroy === 'function') b.destroy(); } catch (_) {}
    }
    zoneBlips = [];
}

function buildZoneBlips(zonesObj) {
    destroyAllZoneBlips();
    for (let i = 0; i < ZONE_POSITIONS.length; i++) {
        const pos = ZONE_POSITIONS[i];
        const zid = i + 1; // id = индекс + 1
        const owner = parseInt(zonesObj[zid], 10) || 0;
        const colorIdx = ZONE_BLIP_COLOR[owner] != null ? ZONE_BLIP_COLOR[owner] : ZONE_BLIP_COLOR[0];
        try {
            const blip = mp.blips.new(5, new mp.Vector3(pos.x, pos.y, pos.z), {
                name: '',
                radius: 50,
                color: colorIdx,
                alpha: 100,
                drawDistance: 99999,
                shortRange: false,
                rotation: 0,
                dimension: -1
            });
            zoneBlips.push(blip);
        } catch (e) {
            zoneBlips.push(null);
        }
    }
}

mp.events.add('fraction:zones:update', (json) => {
    try {
        const zonesObj = JSON.parse(json);
        buildZoneBlips(zonesObj);
        fracExec(`FracApp && FracApp.setZones(${json})`);
    } catch (e) {}
});

/** Точечное обновление цвета зоны (после захвата) */
mp.events.add('fraction:zone:setColor', (zoneId, fractionId) => {
    const idx = parseInt(zoneId, 10) - 1;
    if (idx < 0 || idx >= zoneBlips.length) return;
    const blip = zoneBlips[idx];
    if (!blip) return;
    const colorIdx = ZONE_BLIP_COLOR[parseInt(fractionId, 10)] != null
        ? ZONE_BLIP_COLOR[parseInt(fractionId, 10)]
        : ZONE_BLIP_COLOR[0];
    try {
        blip.setColor(colorIdx);
    } catch (_) {
        try { mp.game.invoke('0x03D7FB09E75D6B7E', blip.handle, colorIdx); } catch (__) {}
    }
});

/** Мигание зоны (например, в момент бизвара) */
mp.events.add('fraction:zone:setFlash', (zoneId, state) => {
    const idx = parseInt(zoneId, 10) - 1;
    if (idx < 0 || idx >= zoneBlips.length) return;
    const blip = zoneBlips[idx];
    if (!blip) return;
    try {
        if (typeof blip.setFlashes === 'function') {
            blip.setFlashes(!!state);
            if (state && typeof blip.setFlashTimer === 'function') {
                blip.setFlashTimer(1000);
            }
        }
    } catch (_) {}
});

// Поддерживать ротацию = 0 для квадратных зон
mp.events.add('render', () => {
    if (zoneBlips.length === 0) return;
    for (const b of zoneBlips) {
        if (!b) continue;
        try { mp.game.invoke('0xF87683CDF73C3F6E', b.handle, 0); } catch (_) {}
    }
});

// ─── CEF-триггеры (планшет → клиент → сервер) ─────────────────────────────────
mp.events.add('frac:close',          () => closeFracTablet());
mp.events.add('frac:members:refresh',() => mp.events.callRemote('fraction:members:refresh:s'));
mp.events.add('frac:rank:set',       (tid, r, reason) => mp.events.callRemote('fraction:rank:set:s', String(tid), String(r), String(reason || '')));
mp.events.add('frac:rankconfig:save',(json) => mp.events.callRemote('fraction:rankconfig:save:s', json));
mp.events.add('frac:warehouse:toggle', (open) => mp.events.callRemote('fraction:warehouse:toggle:s', open ? 1 : 0));
mp.events.add('frac:advert:save',    (text) => mp.events.callRemote('fraction:advert:save:s', text));
mp.events.add('frac:advert:broadcast',(variant) => mp.events.callRemote('fraction:advert:broadcast:s', String(variant)));
mp.events.add('frac:prefix:set',     (staticId, prefix) => mp.events.callRemote('fraction:prefix:set:s', String(staticId), String(prefix || '')));
mp.events.add('frac:zones:request',  () => mp.events.callRemote('fraction:zones:request:s'));
mp.events.add('frac:rating:request', () => mp.events.callRemote('fraction:rating:request:s'));
mp.events.add('frac:logs:request',   (search) => mp.events.callRemote('fraction:logs:request:s', String(search || '')));
mp.events.add('frac:balance:deposit', (amount) => mp.events.callRemote('fraction:balance:deposit:s', String(amount || '')));
mp.events.add('frac:balance:withdraw', (amount) => mp.events.callRemote('fraction:balance:withdraw:s', String(amount || '')));
mp.events.add('frac:kick', (staticId) => mp.events.callRemote('fraction:kick:s', String(staticId || '')));
mp.events.add('frac:self:leave', (reason) => mp.events.callRemote('fraction:self:leave:s', String(reason || '')));

mp.events.add('fraction:cef:setbalance', (bal) => {
    const v = parseInt(bal, 10) || 0;
    if (lastFactionFlowPayload) lastFactionFlowPayload.balance = v;
    if (fracTabletOpen && factionMenuBrowser && mp.browsers.exists(factionMenuBrowser)) {
        try {
            factionMenuBrowser.execute(
                'try{if(window.factionMenu&&factionMenu.vue)factionMenu.vue.bank=' + v + ';}catch(_e){}'
            );
        } catch (_e) {}
    }
});

mp.events.add('fraction:cef:setmaterials', (_mats) => {
    /* материалы в новом меню не отображаются отдельным виджетом */
});

mp.events.add('fraction:logs:data:c', (json) => {
    try {
        if (fracTabletOpen && factionMenuBrowser && mp.browsers.exists(factionMenuBrowser)) {
            factionMenuBrowser.execute(
                'try{if(window.factionMenuSetLogs)factionMenuSetLogs(' +
                    JSON.stringify(String(json || '[]')) +
                    ');}catch(_e){}'
            );
        }
        fracExec('try{FracApp&&FracApp.setLogs&&FracApp.setLogs(' + JSON.stringify(String(json || '[]')) + ');}catch(_e2){}');
    } catch (_e) {}
});

mp.events.add('fraction:warehouse:toggle:c', (open) => {
    const isOpen = Number(open) === 1;
    if (lastFactionFlowPayload) lastFactionFlowPayload.warehouseOpen = isOpen;
    if (fracTabletOpen && factionMenuBrowser && mp.browsers.exists(factionMenuBrowser)) {
        try {
            factionMenuBrowser.execute(
                'try{if(window.factionMenu&&factionMenu.vue)factionMenu.vue.warehouseCloseStatus=' +
                    (isOpen ? 'false' : 'true') +
                    ';}catch(_e){}'
            );
        } catch (_e) {}
    }
});

global.fracPushCaptCombatStats = function (jsonStr, myStatic) {
    const sid = Number(myStatic) || 0;
    if (!jsonStr || !String(jsonStr).trim()) {
        fracExec(`FracApp && FracApp.setCaptCombatStats(null, ${sid})`);
        return;
    }
    fracExec(`FracApp && FracApp.setCaptCombatStats(JSON.parse(${JSON.stringify(String(jsonStr))}), ${sid})`);
};

// ─── Открытие с иконки планшета ───────────────────────────────────────────────
mp.events.add('fraction:tablet:openFromHome', () => {
    mp.events.callRemote('fraction:tablet:open:s');
});

// Запросить зоны при готовности (надёжный путь — на случай рассинхрона)
let _fracZonesRequested = false;
function requestZonesFromServer() {
    try {
        if (_fracZonesRequested) return;
        _fracZonesRequested = true;
        mp.events.callRemote('fraction:zones:ready:s');
    } catch (_) {}
}
mp.events.add('setfraction', () => setTimeout(requestZonesFromServer, 1500));
mp.events.add('fraction:rank:updated', () => setTimeout(requestZonesFromServer, 1500));

    if (typeof global !== 'undefined') {
    global.isFactionTabletOpen = function () {
        return fracTabletOpen === true;
    };
    global.tryCloseFractionEsc = function() {
        if (typeof global.tryCloseWarMapEsc === 'function' && global.tryCloseWarMapEsc()) return true;
        if (typeof global.tryCloseFracInteractEsc === 'function' && global.tryCloseFracInteractEsc()) return true;
        if (!fracTabletOpen) return false;
        closeFracTablet();
        return true;
    };
    global.isBizwarMenuOpen = function () {
        if (typeof global.isWarMapOpen === 'function' && global.isWarMapOpen()) return true;
        return bizMenuOpen === true;
    };
}

/* Защита: при смерти / спавне принудительно сбрасываем состояние и курсор. */
mp.events.add('playerDeath', () => {
    try { if (typeof global.tryCloseFracInteractEsc === 'function') global.tryCloseFracInteractEsc(); } catch (_e) {}
    if (fracTabletOpen || bizMenuOpen) {
        closeFracTablet();
        try { closeBizwarAttackUi(); } catch (_e2) {}
    }
});

mp.events.add('playerSpawn', () => {
    try { if (typeof global.tryCloseFracInteractEsc === 'function') global.tryCloseFracInteractEsc(); } catch (_e) {}
    if (fracTabletOpen || bizMenuOpen) {
        closeFracTablet();
        try { closeBizwarAttackUi(); } catch (_e2) {}
    }
});

// ─── Браузер готов ────────────────────────────────────────────────────────────
mp.events.add('frac:browser:ready', () => {
    fracBrowserReady = true;
    fracPendingQueue.forEach(code => {
        try {
            if (fracBrowser && mp.browsers.exists(fracBrowser)) fracBrowser.execute(code);
        } catch (_) {}
    });
    fracPendingQueue = [];
});

// ─── Бизвар-браузер ───────────────────────────────────────────────────────────
let bizBrowser = null;
let bizBrowserReady = false;
let bizPendingQueue = [];

function getBizBrowser(forceNew) {
    if (!forceNew && bizBrowser && mp.browsers.exists(bizBrowser)) return bizBrowser;
    try {
        if (bizBrowser && mp.browsers.exists(bizBrowser)) bizBrowser.destroy();
    } catch (_d) {}
    bizBrowser = null;
    bizBrowserReady = false;
    bizPendingQueue = [];
    bizBrowser = mp.browsers.new('package://browsers/bizwar/index.html?v=12');
    global.bizBrowser = bizBrowser;
    try { bizBrowser.active = true; } catch (_a) {}
    try { bizBrowser.orderId = 205; } catch (_o) {}
    return bizBrowser;
}

function flushBizPending() {
    if (!bizBrowser || !mp.browsers.exists(bizBrowser)) return;
    const q = bizPendingQueue.slice();
    bizPendingQueue = [];
    q.forEach((code) => {
        try { bizBrowser.execute(code); } catch (_e) {}
    });
}

function openBizwarAttackUi(payloadJson) {
    bizMenuOpen = true;
    try { mp.gui.cursor.visible = true; } catch (_c) {}
    setCursor(true);
    const b = getBizBrowser(true);
    if (!mp.browsers.exists(b)) return;
    try { b.active = true; } catch (_e) {}
    try { b.orderId = 220; } catch (_e2) {}
    const json = typeof payloadJson === 'string' ? payloadJson : JSON.stringify(payloadJson || {});
    const code =
        'try{if(window.BizwarMenu)BizwarMenu.open(' +
        JSON.stringify(json) +
        ');}catch(_e){}';
    if (bizBrowserReady) {
        try { b.execute(code); } catch (_e3) {}
    } else {
        bizPendingQueue.push(code);
        // Если ready не пришёл — всё равно пробуем открыть
        setTimeout(() => {
            if (!bizMenuOpen) return;
            bizBrowserReady = true;
            flushBizPending();
            try {
                if (bizBrowser && mp.browsers.exists(bizBrowser)) bizBrowser.execute(code);
            } catch (_e4) {}
        }, 400);
        setTimeout(() => {
            if (!bizMenuOpen) return;
            flushBizPending();
            try {
                if (bizBrowser && mp.browsers.exists(bizBrowser)) bizBrowser.execute(code);
            } catch (_e5) {}
        }, 1200);
    }
}

function closeBizwarAttackUi() {
    if (!bizMenuOpen && !(bizBrowser && mp.browsers.exists(bizBrowser))) return false;
    bizMenuOpen = false;
    try {
        if (bizBrowser && mp.browsers.exists(bizBrowser)) {
            bizBrowser.execute('try{if(window.BizwarMenu){document.getElementById("root")&&document.getElementById("root").classList.remove("open");}}catch(_e){}');
            bizBrowser.active = true;
        }
    } catch (_e) {}
    if (!fracTabletOpen) setCursor(false);
    else setCursor(true);
    return true;
}

mp.events.add('bizwar:browser:ready', () => {
    bizBrowserReady = true;
    flushBizPending();
});

mp.events.add('bizwar:ui:error', (msg) => {
    try { mp.events.call('notify:client', 2, 'top-mid', 'Ошибка меню капта: ' + String(msg || ''), 4000); } catch (_e) {}
});

mp.events.add('bizwar:menu:open:c', (payloadJson) => {
    if (typeof global.queueWarMapAttack === 'function') {
        global.queueWarMapAttack(payloadJson, 'faction');
        return;
    }
    if (
        typeof global.openWarMapAttack === 'function' &&
        typeof global.isWarMapOpen === 'function' &&
        global.isWarMapOpen()
    ) {
        global.openWarMapAttack(payloadJson);
    }
});

mp.events.add('bizwar:close', () => {
    bizMenuOpen = false;
    if (typeof global.tryCloseWarMapEsc === 'function') global.tryCloseWarMapEsc();
    const mb = global.menuBrowser;
    if (mb && mp.browsers.exists(mb)) {
        try {
            rpc.triggerBrowser(mb, 'menuManager_menu_close', 'faction_gang_capture');
            rpc.triggerBrowser(mb, 'menuManager_menu_close', 'faction_mafia_war');
            mb.active = false;
        } catch (_e) {}
    }
    closeBizwarAttackUi();
    fracExec('try{var o=document.getElementById("bizwarOverlay");if(o)o.classList.remove("open");}catch(_e){}');
});
mp.events.add('bizwar:attack:confirm', (zid, count, cals, armor, spunk, alco) =>
    mp.events.callRemote('bizwar:attack:confirm:s', String(zid), String(count), String(cals), String(armor), String(spunk), String(alco)));
mp.events.add('bizwar:teleport',       (zid) => mp.events.callRemote('bizwar:teleport:s', String(zid)));

// Телепорт на позицию зоны после команды сервера
mp.events.add('bizwar:teleport:c', (zoneId, side, isPrepRaw, sx, sy, sz) => {
    try {
        const isPrep = isPrepRaw === true || isPrepRaw === 'true' || isPrepRaw === 1 || isPrepRaw === '1';
        let target;
        const px = parseFloat(sx);
        const py = parseFloat(sy);
        const pz = parseFloat(sz);
        if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz)) {
            target = new mp.Vector3(px, py, pz);
        } else {
            const idx = parseInt(zoneId, 10) - 1;
            if (idx < 0 || idx >= ZONE_POSITIONS.length) return;
            const pos = ZONE_POSITIONS[idx];
            const zOff = isPrep ? BIZWAR_PREP_FALL_EXTRA_Z : 1;
            target = new mp.Vector3(pos.x, pos.y, pos.z + zOff);
        }
        const pl = mp.players.local;
        pl.position = target;
        if (typeof pl.setCoordsNoOffset === 'function') {
            pl.setCoordsNoOffset(target.x, target.y, target.z, false, false, false);
        }
    } catch (_) {}
    try {
        const zone = parseInt(zoneId, 10);
        const placeLabel = zone >= 1 && zone <= 50 ? 'Офис' : 'Особняк';
        const timeSec = isPrep ? 8 * 60 : 0;
        if (typeof mp !== 'undefined' && mp.events && typeof mp.events.call === 'function') {
            mp.events.call(
                'captBattle:update',
                placeLabel,
                side === 'attack' ? '—' : placeLabel,
                0,
                0,
                timeSec,
                '00:00',
                true,
                '00:00',
                timeSec
            );
        }
    } catch (_e) {}
    bizMenuOpen = false;
    const _mb = global.menuBrowser;
    if (_mb && mp.browsers.exists(_mb)) {
        try {
            rpc.triggerBrowser(_mb, 'menuManager_menu_close', 'faction_gang_capture');
            rpc.triggerBrowser(_mb, 'menuManager_menu_close', 'faction_mafia_war');
            _mb.active = false;
        } catch (_e) {}
    }
    fracExec('try{var o=document.getElementById("bizwarOverlay");if(o)o.classList.remove("open");}catch(_e){}');
    try { closeBizwarAttackUi(); } catch (_e) {}
    setCursor(false);
});

// Клик по blip зоны → открыть меню бизвара
/** Триггер при нажатии E рядом с зоной (или из CEF) */
mp.events.add('bizwar:zone:click', (zoneId) => {
    mp.events.callRemote('bizwar:zone:click:s', String(zoneId));
});

// ─── HQ: склад (цилиндр) + телепорт на бизвар ───────────────────────────────
const FACTION_HQ_DRAW_DIST = 72;
const FACTION_HQ_USE_DIST = 2.6;
let _bizwarHqZones = [];
let _fracHqLastE = 0;

mp.events.add('bizwar:hq:sync', (zonesJson) => {
    try {
        const parsed = JSON.parse(String(zonesJson || '[]'));
        _bizwarHqZones = Array.isArray(parsed) ? parsed.map(z => parseInt(z, 10)).filter(z => Number.isFinite(z)) : [];
    } catch (_) {
        _bizwarHqZones = [];
    }
});

function fracHqCanUseE() {
    const now = Date.now();
    if (now - _fracHqLastE < 900) return false;
    _fracHqLastE = now;
    return true;
}

function fracHqDist(px, py, pz, x, y, z) {
    const dx = px - x;
    const dy = py - y;
    const dz = pz - z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Цилиндр на полу — как у семейного склада. */
function drawFracHqCylinder(x, y, z, scaleXY, height, r, g, b, a) {
    try {
        mp.game.graphics.drawMarker(
            1,
            x,
            y,
            z - 0.98,
            0, 0, 0,
            0, 0, 0,
            scaleXY,
            scaleXY,
            height,
            r, g, b, a,
            false, false, 2, false, null, null, false
        );
    } catch (_) {}
}

function drawFracHqLabel(x, y, z, text) {
    try {
        mp.game.graphics.drawText(
            text,
            [x, y, z],
            {
                font: 4,
                color: [232, 232, 232, 230],
                scale: [0.34, 0.34],
                outline: true,
                centre: true
            }
        );
    } catch (_) {}
}

function fracHqCanInteract() {
    const pl = mp.players.local;
    if (!pl || !pl.getVariable('auth')) return false;
    if (pl.dimension !== 0) return false;
    if (pl.getVariable('dead') === true) return false;
    if (pl.vehicle) return false;
    if (pl.isTypingInTextChat) return false;
    if (mp.game.ui.isPauseMenuActive()) return false;
    if (fracTabletOpen || bizMenuOpen) return false;
    return true;
}

mp.events.add('render', () => {
    try {
        const pl = mp.players.local;
        if (!pl || !pl.getVariable('auth')) return;
        if (pl.dimension !== 0) return;

        const px = pl.position.x;
        const py = pl.position.y;
        const pz = pl.position.z;
        const myFrac = parseInt(pl.getVariable('fraction'), 10) || 0;
        const warehouses = global.FACTION_WAREHOUSE || {};
        const canAct = fracHqCanInteract();
        let hqEHandled = false;

        for (const [fidStr, wh] of Object.entries(warehouses)) {
            if (!wh) continue;
            const d = fracHqDist(px, py, pz, wh.x, wh.y, wh.z);
            if (d > FACTION_HQ_DRAW_DIST) continue;

            drawFracHqCylinder(wh.x, wh.y, wh.z, 0.95, 0.36, 232, 232, 238, 198);

            if (canAct && !hqEHandled && parseInt(fidStr, 10) === myFrac && d < FACTION_HQ_USE_DIST) {
                drawFracHqLabel(wh.x, wh.y, wh.z + 0.5, 'Склад фракции');
                if (mp.game.controls.isControlJustPressed(0, 38) && fracHqCanUseE()) {
                    hqEHandled = true;
                    mp.events.callRemote('fraction:warehouse:use:s');
                }
            }
        }

        if (_bizwarHqZones.length === 0 || !canAct) return;

        const tp = global.FACTION_BIZWAR_TP && global.FACTION_BIZWAR_TP[myFrac];
        if (!tp) return;

        const tpDist = fracHqDist(px, py, pz, tp.x, tp.y, tp.z);
        if (tpDist > FACTION_HQ_DRAW_DIST) return;

        drawFracHqCylinder(tp.x, tp.y, tp.z, 1.0, 0.42, 220, 38, 38, 228);

        if (tpDist < FACTION_HQ_USE_DIST) {
            drawFracHqLabel(tp.x, tp.y, tp.z + 0.55, 'Телепорт на капт');
            if (!hqEHandled && mp.game.controls.isControlJustPressed(0, 38) && fracHqCanUseE()) {
                mp.events.callRemote('bizwar:hq:use:s');
            }
        }
    } catch (_) {}
});

// Браузер создаётся лениво — только когда игрок открывает приложение «Фракция».
