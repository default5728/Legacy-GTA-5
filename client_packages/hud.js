/** Как в чате: серверный player.id (mpId), не локальный player.id. */
function resolvePlayerMpId(player) {
    if (!player || !mp.players.exists(player)) return 0;
    const synced = player.getVariable('mpId');
    if (synced !== undefined && synced !== null && synced !== '') {
        const n = parseInt(synced, 10);
        if (!Number.isNaN(n)) return n;
    }
    if (typeof player.remoteId === 'number' && player.remoteId >= 0) return player.remoteId;
    return player.id;
}

global.resolvePlayerMpId = resolvePlayerMpId;

mp.events.add('worldHudRefresh', () => {
    try {
        if (typeof global.__hudWorldRefresh === 'function') global.__hudWorldRefresh();
    } catch (_e) {}
});

['invkey', 'shopc', 'f3key', 'table', 'phone'].forEach((overlayKey) => {
    mp.events.addDataHandler(overlayKey, (entity, value) => {
        try {
            if (entity !== mp.players.local) return;
            if (value === true) return;
            setTimeout(() => {
                try { mp.events.call('worldHudRefresh'); } catch (_e) {}
            }, 0);
        } catch (_eDh) {}
    });
});

function hudEscStr(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function localPlayerOnCaptArena() {
    try {
        const pl = mp.players.local;
        return pl.getVariable('inCapt') === true || pl.getVariable('inBizwar') === true;
    } catch (_e) {
        return false;
    }
}

/** Версия HUD выбирается игроком в F10 → Настройки → ХУД и хранится в mp.storage. */
const HUD_VARIANT_URL = {
    old: 'package://kepler-compat/hud/index.html',
    new: 'package://kepler-compat/hud/index.html'
};

function hudNormalizeVariant(raw) {
    return 'old';
}

function hudStoredVariant() {
    try {
        const s = mp.storage.data && mp.storage.data.settings;
        return hudNormalizeVariant(s && s.hudVariant);
    } catch (_e) {
        return 'old';
    }
}

let hudActiveVariant = hudStoredVariant();

setTimeout(() => {
    hudr = global.chatr || mp.browsers.new(HUD_VARIANT_URL[hudActiveVariant]);
    hudr.active = true;
    hudr.orderId = 100;
    try {
        if (mp.players.local.getVariable('auth') !== true) {
            hudr.execute(`hudMain.isActiveHud(false); hudMain.isActiveHelp(false);`);
        }
    } catch (_eHud0) {}

    setTimeout(() => {
        try {
            const st = mp.storage.data && mp.storage.data.settings;
            if (st && typeof st.crosshair === 'string' && st.crosshair.length) {
                mp.events.call('hudCrosshairApply', st.crosshair);
            }
        } catch (_eCh) {}
        try { replayHudPersistentOverlays(); } catch (_eQ0) {}
        try {
            const layout = mp.storage.data && mp.storage.data.settings && mp.storage.data.settings.hudLayout || {};
            hudr.execute('window.HUD_LAYOUT_EDITOR && window.HUD_LAYOUT_EDITOR.apply(' + JSON.stringify(layout) + ')');
        } catch (_eLayout) {}
    }, 400);

    let hudStatus =
    {
        engine: false,
        doors: true,
    };
    /** После /offnc: скрыть патроны */
    let lastAdminDutyNoWeapon = false;
    const WEAPON_UNARMED = mp.game.joaat('weapon_unarmed');
    const WEAPON_PARACHUTE = mp.game.joaat('gadget_parachute');
    let lastHudAmmoVisible = null;

    function isIgnoredHudAmmoWeapon(hash) {
        const h = (hash >>> 0);
        return h === (WEAPON_PARACHUTE >>> 0);
    }

    function playerHasWeaponInHands(player) {
        try {
            const w = player.weapon;
            const wu = (w >>> 0);
            if (isIgnoredHudAmmoWeapon(wu)) return false;
            if (wu && wu !== 0 && wu !== (WEAPON_UNARMED >>> 0)) return true;
            const slot = player.getVariable('activeWeaponSlot');
            if (slot !== null && slot !== undefined) {
                const si = Number(slot);
                if (Number.isFinite(si) && si >= 0 && si <= 2) return true;
            }
            const fb =
                typeof global.getLocalWeaponAmmoFallback === 'function'
                    ? global.getLocalWeaponAmmoFallback()
                    : null;
            if (fb && fb.hash && !isIgnoredHudAmmoWeapon(fb.hash)) return true;
            return false;
        } catch (_e) {
            return false;
        }
    }

    function hudAmmoDisplayEnabled() {
        if (mp.players.local.getVariable('ammo') === false) return false;
        return resolveHudSettingBool('ammo', true);
    }

    function shouldShowHudAmmo(player) {
        if (player.getVariable('adminDutyNoWeapon') === true) return false;
        if (!hudAmmoDisplayEnabled()) return false;
        return playerHasWeaponInHands(player);
    }

    function syncHudAmmoVisibility(show) {
        if (show === lastHudAmmoVisible) return;
        lastHudAmmoVisible = show;
        hudr.execute(`hudMain.isActiveAmmo(${show});`);
    }

    /** Состояние замка дверей для панели авто (сервер setdoor) */
    let vehicleDoorLocked = true;
    let lastVehicleHudExtras = '';
    let lastHudGreenZone = null;

    function hudEstimateFuelLiters(veh) {
        try {
            const h = veh.getPetrolTankHealth();
            if (typeof h !== 'number' || Number.isNaN(h)) return 0;
            return Math.max(0, Math.min(99, Math.round((Math.min(Math.max(h, 0), 1000) / 1000) * 65)));
        } catch (_e) {
            return 0;
        }
    }

    mp.events.add('setdoor', (toogle) => {
        vehicleDoorLocked = !!toogle;
        hudr.execute(`hudMain.updateVehicleLock(${toogle});`);
    });
    
    function clientMayShowHudAfterAuth() {
        try {
            if (typeof global !== 'undefined' && global.__worldSpawnComplete === true) {
                const p = mp.players.local;
                if (p && (p.getVariable('auth') === true || p.getVariable('auth') === 1 || p.getVariable('auth') === '1')) {
                    return true;
                }
            }
            if (typeof global.__ensureWorldUiUnlockedIfReady === 'function') {
                global.__ensureWorldUiUnlockedIfReady();
            }
            if (typeof global.clientMayShowWorldChrome === 'function') {
                return global.clientMayShowWorldChrome();
            }
            if (typeof global.__chromeAllowedInWorld === 'function') {
                return global.__chromeAllowedInWorld();
            }
            const p = mp.players.local;
            const f = p.getVariable('fraction');
            if (f !== null && f !== undefined && f !== '') {
                const n = typeof f === 'number' ? f : parseInt(String(f), 10);
                if (!isNaN(n) && n >= 1 && n <= 6) return true;
            }
            if (p.getVariable('factionlessHub') === true) return true;
            if (p.getVariable('afklobby') === true) return true;
            if (p.getVariable('revolverdm') === true) return true;
            if (p.getVariable('carabinedm') === true) return true;
            if (p.getVariable('heavydm') === true) return true;
            return false;
        } catch (_e) {
            return false;
        }
    }

    /** Текст загрузки сессии GTA («Starting the game» / аналоги) не показывать в карточке у миникарты. */
    function sanitizeGtaLocationCaption(value) {
        if (value == null) return '';
        const t = String(value).trim();
        if (!t) return '';
        const lower = t.toLowerCase();
        if (lower.includes('starting') && lower.includes('game')) return '';
        if (lower.includes('loading') && (lower.includes('session') || lower.includes('online'))) return '';
        if (lower.includes('начало') && lower.includes('игр')) return '';
        return t;
    }

    function ensureWorldUiReadyForHud() {
        if (typeof global !== 'undefined' && global.__worldUiUnlockedForHud === true) return true;
        if (typeof global !== 'undefined' && global.__worldSpawnComplete === true) {
            try {
                if (typeof global.__ensureWorldUiUnlockedIfReady === 'function') global.__ensureWorldUiUnlockedIfReady();
            } catch (_eSp) {}
            if (global.__worldUiUnlockedForHud === true) return true;
        }
        try {
            if (typeof global.tryPromoteWorldUiIfInMode === 'function') global.tryPromoteWorldUiIfInMode();
            if (typeof global.setWorldUiUnlocked === 'function' && typeof global.clientMayShowWorldChrome === 'function') {
                const p = mp.players.local;
                const authed = p && (p.getVariable('auth') === true || p.getVariable('auth') === 1 || p.getVariable('auth') === '1');
                const spawnUi = typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive();
                const preAuth = typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay();
                if (authed && !spawnUi && !preAuth && global.clientMayShowWorldChrome()) {
                    global.setWorldUiUnlocked(true);
                }
            }
        } catch (_e) {}
        return typeof global !== 'undefined' && global.__worldUiUnlockedForHud === true;
    }

    let lastHudWorldRefreshAt = 0;
    let lastHudWorldRefreshClockAt = 0;
    let lastHudWorldRefreshState = '';

    function refreshWorldHudChrome(force) {
        if (!hudr || !mp.browsers.exists(hudr)) return;
        const now = Date.now();
        if (!force && now - lastHudWorldRefreshAt < 300) return;
        lastHudWorldRefreshAt = now;
        try { hudr.active = true; } catch (_eAct) {}
        if (hudOverlayBlocksWorldChrome()) {
            const blockedState = 'blocked';
            if (lastHudWorldRefreshState !== blockedState) {
                lastHudWorldRefreshState = blockedState;
                hudr.execute(`hudMain.isActiveHud(false); hudMain.isActiveHelp(false);`);
            }
            return;
        }
        if (!ensureWorldUiReadyForHud() || !clientMayShowHudAfterAuth()) {
            const hiddenState = 'hidden';
            if (lastHudWorldRefreshState !== hiddenState) {
                lastHudWorldRefreshState = hiddenState;
                hudr.execute(`hudMain.isActiveHud(false); hudMain.isActiveHelp(false);`);
            }
            return;
        }
        const hudOn = resolveHudSettingBool('hud', true);
        const helpOn = resolveHudSettingBool('help', true);
        const hintsOn = resolveHudSettingBool('hud_hints', true);
        const nextState = `${hudOn}|${helpOn}|${hintsOn}`;
        if (force || lastHudWorldRefreshState !== nextState) {
            lastHudWorldRefreshState = nextState;
            hudr.execute(`hudMain.isActiveHud(${hudOn});`);
            execHudCmd(`hudMain.isActiveHelp(${helpOn});`);
            execHudCmd(`hudMain.setKeyHintsVisible(${hintsOn});`);
            if (hintsOn) {
                try { syncHudKeyHintsPayload(); } catch (_eHints) {}
            }
        }
        try {
            const minimap = global.getMinimapAnchor();
            hudr.execute(
                `hudMain.setMinimapLayout(${minimap.rightX * 100}, ${minimap.bottomY}, ${minimap.hudTopY}, ${minimap.leftX * 100})`
            );
        } catch (_eMm) {}
        try {
            const local = mp.players.local;
            const staticNum = local.getVariable('static') != null ? local.getVariable('static') : '';
            const loginRaw = local.getVariable('login');
            const login = loginRaw != null ? String(loginRaw).replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
            hudr.execute(`hudMain.updatePlayerId('', '${staticNum}', '${login}');`);
            syncHudWorldClock();
            if (force || now - lastHudWorldRefreshClockAt >= 30000) {
                lastHudWorldRefreshClockAt = now;
                try { mp.events.callRemote('hud:clock:request:s'); } catch (_eClk) {}
            }
        } catch (_eId) {}
    }

    if (typeof global !== 'undefined') {
        global.__hudWorldRefresh = refreshWorldHudChrome;
    }

    /**
     * Пересоздаёт страницу HUD под выбранную игроком версию.
     * Кэши «последнего отправленного значения» обнуляются, иначе render-цикл
     * посчитает состояние неизменным и свежая страница останется пустой.
     */
    function hudRebuildForVariant(variant) {
        const next = hudNormalizeVariant(variant);
        if (next === hudActiveVariant && hudr && mp.browsers.exists(hudr)) return;
        hudActiveVariant = next;

        try {
            if (hudr && mp.browsers.exists(hudr)) hudr.destroy();
        } catch (_eDestroy) {}

        hudr = mp.browsers.new(HUD_VARIANT_URL[next]);
        hudr.active = true;
        hudr.orderId = 100;

        hudLayoutSig = '';
        lastHudOnline = null;
        lastHudSampleAt = 0;
        lastHudLocationAt = 0;
        lastHudAmmoVisible = null;
        lastVehicleHudExtras = '';
        lastHudGreenZone = null;
        lastHudWorldRefreshState = '';
        lastHudWorldRefreshAt = 0;
        hudStatus.engine = false;

        setTimeout(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            try { refreshWorldHudChrome(true); } catch (_eRef) {}
            try { syncHudWorldClock(); } catch (_eClk) {}
            try {
                const money = mp.players.local.money;
                if (money != null && money !== '') execHudCmd(`hudMain.updateMoney('${hudEscStr(money)}');`);
            } catch (_eMoney) {}
            try {
                const st = mp.storage.data && mp.storage.data.settings;
                if (st && typeof st.crosshair === 'string' && st.crosshair.length) {
                    mp.events.call('hudCrosshairApply', st.crosshair);
                }
            } catch (_eCh) {}
            try { replayHudPersistentOverlays(); } catch (_eQ) {}
            try {
                const layout = mp.storage.data && mp.storage.data.settings && mp.storage.data.settings.hudLayout || {};
                hudr.execute('window.HUD_LAYOUT_EDITOR && window.HUD_LAYOUT_EDITOR.apply(' + JSON.stringify(layout) + ')');
            } catch (_eLayout) {}
        }, 500);
    }

    mp.events.add('hudVariantApply', (variant) => {
        try { hudRebuildForVariant(variant); } catch (_e) {}
    });

    mp.events.add('showHud:CLIENT', (dinId, static) => {
        if (!ensureWorldUiReadyForHud()) {
            hudr.execute(`hudMain.isActiveHud(false); hudMain.isActiveHelp(false);`);
            return;
        }
        try {
            if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) {
                hudr.execute(`hudMain.isActiveHud(false); hudMain.isActiveHelp(false);`);
                return;
            }
            if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) {
                hudr.execute(`hudMain.isActiveHud(false); hudMain.isActiveHelp(false);`);
                return;
            }
            if (typeof global.isTopBrowserActive === 'function' && global.isTopBrowserActive()) {
                hudr.execute(`hudMain.isActiveHud(false); hudMain.isActiveHelp(false);`);
                return;
            }
        } catch (_eGate) {}
        if (!clientMayShowHudAfterAuth()) {
            hudr.execute(`hudMain.isActiveHud(false); hudMain.isActiveHelp(false);`);
            return;
        }
        refreshWorldHudChrome(true);
    });

    /**
     * Любой вызов «показать HUD» подавляется, пока открыт инвентарь / магазин одежды / тату / прочие модалки.
     * Иначе фоновые синки настроек (applyMenuSettingsWorldVisibility, render-tick из menu.js, autosalon/casino/...)
     * перезатирают локальное скрытие HUD, и он мигает в открытом окне.
     */
    function hudOverlayBlocksWorldChrome() {
        try {
            try {
                if (typeof global.isGtaPauseMenuOpen === 'function') {
                    if (global.isGtaPauseMenuOpen()) return true;
                } else if (mp.game.ui.isPauseMenuActive()) {
                    return true;
                }
            } catch (_ePause) {}
            if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return false;
            const p = mp.players.local;
            if (!p) return false;
            if (typeof global.isNpcDialogModalOpen === 'function' && global.isNpcDialogModalOpen()) return true;
            if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return true;
            if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) return true;
            if (typeof global.isTopBrowserActive === 'function' && global.isTopBrowserActive()) return true;
            if (typeof global.isLocalInventoryModalOpen === 'function') {
                if (global.isLocalInventoryModalOpen()) return true;
            } else if (p.getVariable('invkey') === true) {
                return true;
            }
            if (p.getVariable('shopc') === true) return true;
            if (p.getVariable('blackmenu') === true) return true;
            if (p.getVariable('targetmenu') === true) return true;
            if (p.getVariable('casmenu') === true) return true;
            if (p.getVariable('famcreate') === true) return true;
            if (typeof global.isCharCreatorActive === 'function' && global.isCharCreatorActive()) return true;
            if (typeof global.isAutosalonOpen === 'function' && global.isAutosalonOpen()) return true;
            if (typeof global.isLsCustomOpen === 'function' && global.isLsCustomOpen()) return true;
            if (global.__clothesShopOpen === true) return true;
            if (p.getVariable('lscmenu') === true) return true;
            return false;
        } catch (_e) {
            return false;
        }
    }

    if (typeof global !== 'undefined') {
        global.__hudOverlayBlocksWorldChrome = hudOverlayBlocksWorldChrome;
    }

    /**
     * Когда модалка (инвентарь, магазин и т.п.) только-только закрылась, серверная
     * переменная (invkey/shopc/...) ещё не успела долететь до клиента, и `hud(true)`
     * вызванный синхронно в момент закрытия снова блокируется gate-ом.
     * Чтобы интерфейс не висел «потерянным» 1–3 секунды, держим намерение пользователя
     * (`pendingShow*`) и автоматически пере-эмитим показ, как только gate откроется.
     */
    let pendingShowHud = false;
    let pendingShowHelp = false;

    function resolveHudSettingBool(key, fallback) {
        try {
            if (key === 'hud' && typeof global !== 'undefined' && typeof global.normalizeHudVisibilityInSettings === 'function') {
                const st = mp.storage.data && mp.storage.data.settings;
                if (st) global.normalizeHudVisibilityInSettings(st, true);
            }
            if (typeof global !== 'undefined' && typeof global.__getMenuSettingBool === 'function') {
                return global.__getMenuSettingBool(key, fallback);
            }
        } catch (_e) {}
        return !!fallback;
    }

    function execHudCmd(cmd) {
        try { hudr.execute(cmd); } catch (_e) {}
    }

    mp.events.add('hud', (toogle) => {
        let v = !!toogle;
        let chromeGated = false;
        try {
            if (v && typeof global !== 'undefined' && typeof global.__chromeAllowedInWorld === 'function' && !global.__chromeAllowedInWorld()) {
                if (typeof global.tryPromoteWorldUiIfInMode === 'function') global.tryPromoteWorldUiIfInMode();
                if (typeof global.__chromeAllowedInWorld === 'function' && global.__chromeAllowedInWorld()) {
                    v = true;
                } else {
                    v = false;
                    chromeGated = true;
                }
            }
        } catch (_gate) {}
        let overlayBlocked = false;
        if (v && hudOverlayBlocksWorldChrome()) {
            v = false;
            overlayBlocked = true;
        }
        pendingShowHud = overlayBlocked && !chromeGated;
        execHudCmd(`hudMain.isActiveHud(${v});`);
    });

    let lastOverlayBlocked = hudOverlayBlocksWorldChrome();
    setInterval(() => {
        try {
            const blockedNow = hudOverlayBlocksWorldChrome();
            if (lastOverlayBlocked && !blockedNow) {
                if (pendingShowHud) {
                    pendingShowHud = false;
                    execHudCmd(`hudMain.isActiveHud(${resolveHudSettingBool('hud', true)});`);
                }
                if (pendingShowHelp) {
                    pendingShowHelp = false;
                    execHudCmd(`hudMain.isActiveHelp(${resolveHudSettingBool('help', true)});`);
                }
                if (typeof global.scheduleWorldChromeRestoreAfterModal === 'function') {
                    global.scheduleWorldChromeRestoreAfterModal();
                }
            }
            lastOverlayBlocked = blockedNow;
        } catch (_e) {}
    }, 110);

    mp.events.add('phonehud', (toogle) => {
        hudr.execute(`hudMain.isActivePhone(${toogle})`);
        try { refreshWorldHudChrome(true); } catch (_ePhHud) {}
    });
    
    let hudWorldTime = '00:00';
    let hudWorldDate = '';

    function syncHudWorldClock() {
        if (typeof hudr === 'undefined' || !hudr || !mp.browsers.exists(hudr)) return;
        try {
            hudr.execute(`hudMain.updateWorldTime(${JSON.stringify(hudWorldTime)});`);
            hudr.execute(`hudMain.updateWorldDate(${JSON.stringify(hudWorldDate)});`);
        } catch (_eClock) {}
    }

    mp.events.add('setDateHud', (date) => {
        const worldDate = date == null ? '' : String(date).trim();
        if (worldDate === hudWorldDate) return;
        hudWorldDate = worldDate;
        syncHudWorldClock();
    });

    mp.events.add('setTimeHud', (time) => {
        const worldTime = time == null ? '' : String(time).trim();
        if (worldTime === hudWorldTime) return;
        hudWorldTime = worldTime;
        syncHudWorldClock();
    });

    setTimeout(() => {
        syncHudWorldClock();
        try { mp.events.callRemote('hud:clock:request:s'); } catch (_eClkInit) {}
    }, 600);
    
    mp.events.add('showAmmo', () => {
        if (mp.players.local.getVariable('adminDutyNoWeapon') === true) return;
        if (!hudAmmoDisplayEnabled()) return;
        if (!playerHasWeaponInHands(mp.players.local)) return;
        syncHudAmmoVisibility(true);
    });

    mp.events.add('local:ammoSnapshot', (clip, max) => {
        try {
            if (typeof hudr === 'undefined' || !hudr || !mp.browsers.exists(hudr)) return;
            const c = (clip === undefined || clip === null || Number.isNaN(Number(clip))) ? 0 : clip;
            const m = (max === undefined || max === null || Number.isNaN(Number(max))) ? 0 : max;
            hudr.execute(`hudMain.updateAmmo("${c}", "${m}")`);
            if (
                Number(c) > 0 &&
                mp.players.local.getVariable('adminDutyNoWeapon') !== true &&
                hudAmmoDisplayEnabled() &&
                playerHasWeaponInHands(mp.players.local)
            ) {
                syncHudAmmoVisibility(true);
            }
        } catch (_e) {}
    });
    
    mp.events.add('hideAmmo', () => {
        syncHudAmmoVisibility(false);
    });
    
    mp.events.add('showGun', () => {
        hudr.execute(`hudMain.showgun(true);`);
    });
    
    let luckyWheelMinutesLeft = null;
    let luckyWheelTickInterval = null;

    mp.events.add('FreeCase', (time) => {
        luckyWheelMinutesLeft = Math.max(0, parseInt(time, 10) || 0);
        try {
            hudr.execute(`hudMain.FreeTimeCase(${luckyWheelMinutesLeft});`);
        } catch (_e) {}
        if (luckyWheelTickInterval) {
            clearInterval(luckyWheelTickInterval);
            luckyWheelTickInterval = null;
        }
        if (luckyWheelMinutesLeft > 0) {
            luckyWheelTickInterval = setInterval(() => {
                if (luckyWheelMinutesLeft == null) return;
                if (luckyWheelMinutesLeft > 0) {
                    luckyWheelMinutesLeft -= 1;
                }
                try {
                    hudr.execute(`hudMain.FreeTimeCase(${luckyWheelMinutesLeft});`);
                } catch (_e2) {}
                if (luckyWheelMinutesLeft <= 0 && luckyWheelTickInterval) {
                    clearInterval(luckyWheelTickInterval);
                    luckyWheelTickInterval = null;
                }
            }, 60000);
        }
    });

    mp.events.add('FreeSnow', (time) => {
        hudr.execute(`hudMain.FreeTimeSnow(${time});`);
    });
    
    mp.events.add('gzShow:CLIENT', () => {
        hudr.execute(`hudMain.isActiveGreenZone(true);`);
    });
    
    mp.events.add('gzHide:CLIENT', () => {
        hudr.execute(`hudMain.isActiveGreenZone(false);`);
    });
    
    mp.events.add('updateMoney', (moneyRes) => {
        mp.players.local.money = moneyRes;
        brrs.execute(`barberShop.changeBalance('${moneyRes}');`);
        targetMenu.execute(`targetMenu.changeBalance('${moneyRes}');`);
        hudr.execute(`hudMain.updateMoney('${moneyRes}');`);
    });
    
    let hudLayoutSig = '';
    setInterval(() => {
        try {
            if (typeof hudr === 'undefined' || !hudr || !mp.browsers.exists(hudr)) return;
            const m = global.getMinimapAnchor();
            const sig = `${m.rightX.toFixed(4)}_${m.bottomY.toFixed(4)}_${m.hudTopY.toFixed(4)}_${m.leftX.toFixed(4)}`;
            if (sig === hudLayoutSig) return;
            hudLayoutSig = sig;
            hudr.execute(`hudMain.setMinimapLayout(${m.rightX * 100}, ${m.bottomY}, ${m.hudTopY}, ${m.leftX * 100})`);
        } catch (_e) {}
    }, 350);

    let lastHudSampleAt = 0, lastHudOnline = null, lastHudLocationAt = 0;
    mp.events.add('render', () => {
        const now = Date.now();
        if (now - lastHudSampleAt < 50) return;
        lastHudSampleAt = now;
        if (!ensureWorldUiReadyForHud()) {
            return;
        }

        const online = mp.players.length;
        if (online !== lastHudOnline) {
            lastHudOnline = online;
            hudr.execute(`hudMain.updateOnline(${online});`);
        }

        if (mp.players.local.getVariable('auth')) {
            const dutyNoWeapon = mp.players.local.getVariable('adminDutyNoWeapon') === true;
            if (dutyNoWeapon !== lastAdminDutyNoWeapon) {
                lastAdminDutyNoWeapon = dutyNoWeapon;
                lastHudAmmoVisible = null;
            }
            const gz = mp.players.local.getVariable('greenzones') === true;
            if (gz !== lastHudGreenZone) {
                lastHudGreenZone = gz;
                hudr.execute(`hudMain.isActiveGreenZone(${gz});`);
            }
        }
    
        let player = mp.players.local;
        var weapon = player.weapon;
        var weaponAmmo = player.getAmmoInClip(weapon);
        let weaponMaxAmmo = mp.game.weapon.getWeaponClipSize(weapon);
        const showAmmoHud = shouldShowHudAmmo(player);
        syncHudAmmoVisibility(showAmmoHud);
        if (showAmmoHud) {
            const fb =
                typeof global.getLocalWeaponAmmoFallback === 'function'
                    ? global.getLocalWeaponAmmoFallback()
                    : null;
            if (fb && (weapon >>> 0) === (fb.hash >>> 0)) {
                if (
                    weaponAmmo === undefined ||
                    weaponAmmo === null ||
                    Number.isNaN(Number(weaponAmmo)) ||
                    Number(weaponAmmo) <= 0
                ) {
                    weaponAmmo = fb.clip;
                    weaponMaxAmmo = fb.max;
                }
            }
            const _wa = (weaponAmmo === undefined || weaponAmmo === null || Number.isNaN(Number(weaponAmmo))) ? 0 : weaponAmmo;
            const _wm = (weaponMaxAmmo === undefined || weaponMaxAmmo === null || Number.isNaN(Number(weaponMaxAmmo))) ? 0 : weaponMaxAmmo;
            hudr.execute(`hudMain.updateAmmo("${_wa}", "${_wm}")`);
        }
    
        if (now - lastHudLocationAt >= 250) {
            lastHudLocationAt = now;
            let getStreet = mp.game.pathfind.getStreetNameAtCoord(mp.players.local.position.x, mp.players.local.position.y, mp.players.local.position.z, 0, 0);
        
        let streetName = mp.game.ui.getStreetNameFromHashKey(getStreet.streetName);
        const zoneHash = mp.game.zone.getNameOfZone(mp.players.local.position.x, mp.players.local.position.y, mp.players.local.position.z);
        let zoneName = mp.game.ui.getLabelText(zoneHash);
        try {
            const fid = parseInt(String(mp.players.local.getVariable('familyID') || '0'), 10);
            const inArcadiusOffice = fid > 0 && mp.players.local.dimension === fid + 5;
            const inCaptOnly = mp.players.local.getVariable('inCapt') === true && mp.players.local.getVariable('inBizwar') !== true;
            if (inArcadiusOffice) {
                const fam = mp.players.local.getVariable('family');
                zoneName = 'Офис';
                streetName = fam != null ? String(fam).trim() : '';
            } else if (inCaptOnly) {
                if (typeof global.bizwarCaptFamily === 'string' && global.bizwarCaptFamily.trim() !== '') {
                    streetName = global.bizwarCaptFamily;
                }
                zoneName = 'Офис';
            }
        } catch (_e) {}
        streetName = sanitizeGtaLocationCaption(streetName == null ? '' : streetName);
        zoneName = sanitizeGtaLocationCaption(zoneName == null ? '' : zoneName);
        const sn = JSON.stringify(streetName);
        const zn = JSON.stringify(zoneName);
        // Компасу нового HUD нужен азимут по часовой стрелке, а heading в GTA растёт против неё.
        let hudHeading = 0;
        try {
            const h = mp.players.local.getHeading();
            if (typeof h === 'number' && !Number.isNaN(h)) hudHeading = (360 - (h % 360) + 360) % 360;
        } catch (_eHd) {}
        hudr.execute(`hudMain.updateLocation(${sn}, ${zn}, ${hudHeading.toFixed(1)})`);
        }
    
        if (mp.players.local.isInAnyVehicle(false)) {
            if(mp.players.local.vehicle.getPedInSeat(-1) == mp.players.local.handle) {
                if (!mp.players.local.isTypingInTextChat) {
                    let veh = mp.players.local.vehicle;

                    if (typeof global.isSkateVehicle === 'function' && global.isSkateVehicle(veh)) {
                        lastVehicleHudExtras = '';
                        hudr.execute(`hudMain.isActiveVehicle(false);`);
                    } else {
                    let vehicleSpeed = (veh.getSpeed() * 3.6).toFixed();
                    let engine = veh.getIsEngineRunning();

                    // Обороты и передача нужны спидометру нового HUD.
                    // Старый HUD берёт только первые два аргумента, лишние игнорирует.
                    let vehRpm = 0;
                    let vehGear = 0;
                    try {
                        if (typeof veh.rpm === 'number' && !Number.isNaN(veh.rpm)) vehRpm = veh.rpm;
                        if (typeof veh.gear === 'number' && !Number.isNaN(veh.gear)) vehGear = veh.gear;
                    } catch (_eRg) {}

                    hudr.execute(`hudMain.isActiveVehicle(true, "${vehicleSpeed}", ${vehRpm.toFixed(3)}, ${vehGear});`);
                    if (engine != null && engine !== hudStatus.engine) {
                        if (engine == true) hudr.execute(`hudMain.updateVehicleEngine(true);`);
                        else hudr.execute(`hudMain.updateVehicleEngine(false);`);
        
                        hudStatus.engine = engine;
                    }

                    const fuelL = hudEstimateFuelLiters(veh);
                    const beltOn = typeof global.seatbeltStatus !== 'undefined' && global.seatbeltStatus === true;
                    const extrasSig = `${fuelL}|${beltOn ? 1 : 0}|${vehicleDoorLocked ? 1 : 0}`;
                    if (extrasSig !== lastVehicleHudExtras) {
                        lastVehicleHudExtras = extrasSig;
                        hudr.execute(
                            `hudMain.syncVehicleHudState(${fuelL}, ${beltOn ? 'true' : 'false'}, ${vehicleDoorLocked ? 'true' : 'false'})`
                        );
                    }
                    }
                }
            }
        } else {
            lastVehicleHudExtras = '';
            hudr.execute(`hudMain.isActiveVehicle(false);`);
        }
    });
    
    mp.events.add('help', (toogle) => {
        let v = !!toogle;
        let chromeGated = false;
        try {
            if (v && typeof global !== 'undefined' && typeof global.__chromeAllowedInWorld === 'function' && !global.__chromeAllowedInWorld()) {
                v = false;
                chromeGated = true;
            }
        } catch (_gate) {}
        let overlayBlocked = false;
        if (v && hudOverlayBlocksWorldChrome()) {
            v = false;
            overlayBlocked = true;
        }
        if (overlayBlocked && !chromeGated) pendingShowHelp = true;
        hudr.execute(`hudMain.isActiveHelp(${v});`);
        if (!v) execHudCmd(`hudMain.updateE(false, '');`);
    });
    
    mp.events.add('hudr', (toogle) => {
        let v = !!toogle;
        let overlayBlocked = false;
        if (v && hudOverlayBlocksWorldChrome()) {
            v = false;
            overlayBlocked = true;
        }
        if (overlayBlocked) pendingShowHud = true;
        hudr.execute(`hudMain.isActiveHud(${v});`);
    });

    mp.events.add('ammo', (toogle) => {
        const v = !!toogle;
        if (v && mp.players.local.getVariable('adminDutyNoWeapon') === true) return;
        if (!v) {
            syncHudAmmoVisibility(false);
            return;
        }
        lastHudAmmoVisible = null;
        if (shouldShowHudAmmo(mp.players.local)) syncHudAmmoVisibility(true);
    });

    mp.events.add('minimap', (toogle) => {
        let v = !!toogle;
        try {
            if (v && typeof global !== 'undefined' && typeof global.__chromeAllowedInWorld === 'function' && !global.__chromeAllowedInWorld()) {
                v = false;
            }
        } catch (_gate) {}
        try {
            if (v && typeof global !== 'undefined' && typeof global.shouldForceHideMinimap === 'function' && global.shouldForceHideMinimap()) {
                v = false;
            }
        } catch (_hide) {}
        try {
            if (v && hudOverlayBlocksWorldChrome()) v = false;
        } catch (_ov) {}
        hudr.execute(`hudMain.isActiveMinimap(${v});`);
    });

    mp.events.add('updateE', (_toogle, _text) => {
        if (!hudr || !mp.browsers.exists(hudr)) return;
        hudr.execute(`hudMain.updateE(false, '');`);
    });

    function hideMainHudCaptPanelIfOnArena() {
        if (!localPlayerOnCaptArena()) return;
        try {
            hudr.execute('hudMain.hideCaptBattle()');
        } catch (_e) {}
    }

    let captPrepCounterServerValue = -1;

    mp.events.add('captBattle:update', (attacker, defender, attackerCount, defenderCount, prepLeft, totalLeft, canTeleport, teleportLeft, totalLeftSec) => {
        hudrWhenReady(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            hideMainHudCaptPanelIfOnArena();
            try {
                if (!localPlayerOnCaptArena()) return;
                const prep = Math.max(0, Math.floor(Number(prepLeft) || 0));
                // The server updates once per second. Start the GTA5RP-style counter
                // once, then only resync after an actual timing gap to avoid flicker.
                if (prep > 0) {
                    if (captPrepCounterServerValue < 0 || Math.abs(captPrepCounterServerValue - prep) > 2) {
                        // Во время отсчёта поднимаем HUD-браузер выше панели капта/bizwar
                        // (orderId 115), чтобы центральные секунды были поверх всего.
                        // F10 preview прицела (220) не роняем.
                        try {
                            if (mp.browsers.exists(hudr) && !global.__hudReticlePreviewActive) {
                                hudr.orderId = 116;
                            }
                        } catch (_eO) {}
                        hudr.execute(`hudMain.startGameCounterSec(${prep})`);
                    }
                    captPrepCounterServerValue = prep;
                } else {
                    captPrepCounterServerValue = -1;
                    hudr.execute('hudMain.stopGameCounter()');
                    try {
                        if (mp.browsers.exists(hudr)) {
                            hudr.orderId = global.__hudReticlePreviewActive ? 220 : 100;
                        }
                    } catch (_eR) {}
                }
                // The names, counters and timer bar belong to Events/BizWar/ui.html.
                // Do not revive the legacy rounded capt-war HUD panel underneath it.
                hudr.execute('hudMain.hideCaptBattle()');
            } catch (_e) {}
        });
    });

    mp.events.add('captBattle:hud:show', () => {
        hudrWhenReady(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            hideMainHudCaptPanelIfOnArena();
        });
    });

    mp.events.add('hud:warAlert:c', (payloadJson) => {
        hudrWhenReady(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            const raw = typeof payloadJson === 'string' ? payloadJson : JSON.stringify(payloadJson);
            hudr.execute(`hudMain.setWarAlert(${raw})`);
        });
    });

    mp.events.add('hud:warAlert:clear:c', (kind) => {
        hudrWhenReady(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            const k = kind != null && String(kind).trim() !== '' ? JSON.stringify(String(kind)) : '""';
            hudr.execute(`hudMain.clearWarAlert(${k})`);
        });
    });

    let lastNewbieQuestsJson = null;
    let lastYgonQuestRaw = null;

    function pushNewbieQuestsToHud() {
        hudrWhenReady(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            if (lastNewbieQuestsJson == null) return;
            try {
                const esc = JSON.stringify(String(lastNewbieQuestsJson || '{}'));
                hudr.execute(`hudMain.syncNewbieQuests(JSON.parse(${esc}))`);
            } catch (_e) {}
            applyNewbieQuestsUserSetting();
        });
    }

    function pushYgonQuestToHud() {
        hudrWhenReady(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            try {
                if (lastYgonQuestRaw) {
                    hudr.execute(`hudMain.setYgonQuest(${JSON.stringify(lastYgonQuestRaw)})`);
                } else {
                    hudr.execute('hudMain.clearYgonQuest()');
                }
            } catch (_e) {}
        });
    }

    function replayHudPersistentOverlays() {
        pushNewbieQuestsToHud();
        if (lastYgonQuestRaw) pushYgonQuestToHud();
        try {
            if (luckyWheelMinutesLeft != null) {
                hudr.execute(`hudMain.FreeTimeCase(${luckyWheelMinutesLeft});`);
            }
        } catch (_eCase) {}
        try { mp.events.callRemote('newbieQuests:request'); } catch (_eReq) {}
    }

    mp.events.add('hud_new:cef:ready', () => {
        try { replayHudPersistentOverlays(); } catch (_e) {}
    });

    mp.events.add('hud:ygonQuest:c', (payloadJson) => {
        lastYgonQuestRaw = typeof payloadJson === 'string' ? payloadJson : JSON.stringify(payloadJson);
        pushYgonQuestToHud();
    });

    mp.events.add('hud:ygonQuest:clear:c', () => {
        lastYgonQuestRaw = null;
        pushYgonQuestToHud();
    });

    mp.events.add('newbieQuests:sync', (jsonRaw) => {
        lastNewbieQuestsJson = jsonRaw == null ? '{}' : String(jsonRaw);
        pushNewbieQuestsToHud();
    });

    let newbieQuestsUserEnabled = true;

    function applyNewbieQuestsUserSetting() {
        try {
            const s = mp.storage.data && mp.storage.data.settings;
            if (s && s.quests === false) newbieQuestsUserEnabled = false;
            else newbieQuestsUserEnabled = true;
        } catch (_eSt) {}
        hudrWhenReady(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            try {
                hudr.execute('hudMain.setNewbieQuestsUserEnabled(' + (!!newbieQuestsUserEnabled) + ')');
            } catch (_e2) {}
        });
    }

    mp.events.add('newbieQuestsSetting', (enabled) => {
        newbieQuestsUserEnabled = enabled !== false;
        applyNewbieQuestsUserSetting();
    });

    applyNewbieQuestsUserSetting();

    let hudLastFastClipWeapon = 0;
    let hudLastFastClipWeaponAt = 0;

    /** Патроны в обойме → сервер в память сразу; в БД уходит с periodic flush (5 с). */
    setInterval(() => {
        try {
            const p = mp.players.local;
            if (!p || !p.getVariable('auth')) return;
            const slot = p.getVariable('activeWeaponSlot');
            if (slot === null || slot === undefined || slot < 0 || slot > 2) return;
            const weapon = p.weapon;
            if (!weapon) return;
            const wu = weapon >>> 0;
            if (wu !== hudLastFastClipWeapon) {
                hudLastFastClipWeapon = wu;
                hudLastFastClipWeaponAt = Date.now();
            }
            let clip = p.getAmmoInClip(weapon);
            if (clip === undefined || clip === null || Number.isNaN(Number(clip))) clip = 0;
            if (clip <= 0 && Date.now() - hudLastFastClipWeaponAt < 1200) return;
            mp.events.callRemote('player:fastClip:s', slot, clip);
        } catch (_e) {}
    }, 5000);

}, 1000);

mp.events.add('hudCrosshairApply', (jsonStr) => {
    hudrWhenReady(() => {
        try {
            const safe = JSON.stringify(jsonStr == null ? '' : String(jsonStr));
            hudr.execute(`hudMain.applyCrosshairJson(${safe})`);
        } catch (_e) {}
    });
});

mp.events.add('hudCrosshairShow', (show) => {
    hudrWhenReady(() => {
        try {
            hudr.execute(`hudMain.setCrosshairVisible(${!!show})`);
        } catch (_e) {}
    });
});

/** F10 превью прицела: HUD поверх PlayerMenu (order 130). */
mp.events.add('hudReticlePreviewLayer', (on) => {
    hudrWhenReady(() => {
        try {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            const active = !!on;
            if (typeof global !== 'undefined') global.__hudReticlePreviewActive = active;
            hudr.orderId = active ? 220 : 100;
        } catch (_e) {}
    });
});

mp.events.add('hudCrosshairTarget', (hasTarget) => {
    hudrWhenReady(() => {
        try {
            hudr.execute(`hudMain.setCrosshairTargetNear(${!!hasTarget})`);
        } catch (_e) {}
    });
});

function hudrWhenReady(run) {
    if (typeof hudr !== 'undefined' && hudr != null) {
        run();
        return;
    }
    let tries = 0;
    const id = setInterval(() => {
        tries++;
        if (typeof hudr !== 'undefined' && hudr != null) {
            run();
            clearInterval(id);
        } else if (tries > 100) clearInterval(id);
    }, 50);
}

/** Подсказки клавиш HUD — те же VK, что в keybinds.js */
function buildHudKeyHintsRows() {
    if (typeof global.buildHudKeyHintsRows === 'function') {
        return global.buildHudKeyHintsRows();
    }
    const phoneOpen = global.__phoneOpenForHints === true;
    return [
        { k: phoneOpen ? 'BACK' : '↑', t: phoneOpen ? ' Закрыть телефон' : ' Телефон' },
        { k: 'I', t: ' Инвентарь' },
        { k: 'B', t: ' Микрофон' },
        { k: 'T', t: ' Чат' },
        { k: 'M', t: ' Меню' },
        { k: 'U', t: ' Анимации' },
        { k: 'F2', t: ' Курсор' },
        { k: 'F10', t: ' Помощь' }
    ];
}

function syncHudKeyHintsPayload() {
    hudrWhenReady(() => {
        if (!hudr || !mp.browsers.exists(hudr)) return;
        try {
            const rows = buildHudKeyHintsRows();
            hudr.execute('hudMain.setKeyHints(' + JSON.stringify(rows) + ')');
        } catch (_e) {}
    });
}

mp.events.add('hudKeyHints', (enabled) => {
    let on = enabled !== false;
    try {
        if (on && typeof global !== 'undefined' && typeof global.__chromeAllowedInWorld === 'function' && !global.__chromeAllowedInWorld()) {
            on = false;
        }
    } catch (_gate) {}
    hudrWhenReady(() => {
        if (!hudr || !mp.browsers.exists(hudr)) return;
        try {
            hudr.execute('hudMain.setKeyHintsVisible(' + !!on + ')');
            if (on) syncHudKeyHintsPayload();
        } catch (_e) {}
    });
});

mp.events.add('hudKeyHintsRefresh', () => {
    const s = mp.storage.data.settings || {};
    if (s.hud_hints === false) return;
    syncHudKeyHintsPayload();
});

    mp.events.add('captBattle:joined', () => {
        hudrWhenReady(() => {
            if (!hudr || !mp.browsers.exists(hudr)) return;
            if (localPlayerOnCaptArena()) {
                hudr.execute('hudMain.hideCaptBattle()');
            }
        });
});

mp.events.add('captBattle:hide', () => {
    hudrWhenReady(() => {
        if (!hudr || !mp.browsers.exists(hudr)) return;
        hudr.execute('hudMain.hideCaptBattle()');
        try { hudr.execute('hudMain.stopGameCounter()'); } catch (_e) {}
        captPrepCounterServerValue = -1;
    });
});


let hudLayoutEditing = false;
mp.events.add('client:hud:layoutSave', (json) => {
    try {
        const layout = typeof json === 'string' ? JSON.parse(json) : json;
        if (!layout || typeof layout !== 'object') return;
        if (!mp.storage.data.settings) mp.storage.data.settings = {};
        mp.storage.data.settings.hudLayout = layout;
        mp.storage.flush();
    } catch (_e) {}
});
mp.events.add('client:hud:layoutClosed', () => {
    hudLayoutEditing = false;
    try { mp.gui.cursor.visible = false; } catch (_e) {}
});
mp.keys.bind(0x76, false, () => {
    try {
        if (mp.gui.chat.isChatOpen()) return;
        if (typeof global.isLocalInventoryModalOpen === 'function' && global.isLocalInventoryModalOpen()) return;
        if (typeof global.isTopBrowserActive === 'function' && global.isTopBrowserActive()) return;
    } catch (_e) { return; }
    hudLayoutEditing = !hudLayoutEditing;
    try { mp.gui.cursor.visible = hudLayoutEditing; } catch (_e) {}
    hudrWhenReady(() => {
        try { hudr.execute('window.HUD_LAYOUT_EDITOR && window.HUD_LAYOUT_EDITOR.toggle()'); } catch (_e) {}
    });
});
