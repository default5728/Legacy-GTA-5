let isRadarVisible = true;
let isHudVisible = true;
let isHelpVisible = true;
let isChatVisible = true;
let isHudKeyHintsVisible = true;

/** До первого выхода в режим (гангвар / AFK / DM) — не показывать HUD, чат и миникарту (только F2 и экраны выбора). */
let worldUiUnlocked = false;
/** Игрок уже вышел в мир (спавн / hideselect) — HUD не ждём gangwar/fraction. */
let worldSpawnComplete = false;

function publishWorldUiUnlockedMirror() {
   try {
      if (typeof global !== 'undefined') {
         global.__worldUiUnlockedForHud = worldUiUnlocked;
         global.__worldUiUnlocked = worldUiUnlocked;
         global.__worldSpawnComplete = worldSpawnComplete;
      }
   } catch (_e) {}
}

function setWorldUiUnlocked(next) {
   worldUiUnlocked = !!next;
   publishWorldUiUnlockedMirror();
}

if (typeof global !== 'undefined') {
   global.setWorldUiUnlocked = setWorldUiUnlocked;
   global.tryPromoteWorldUiIfInMode = tryPromoteWorldUiIfInMode;
}

/** Серверные shared-переменные: true | 1 | "true". */
function clientVarTruthy(value) {
   return value === true || value === 1 || value === '1' || value === 'true';
}

function clientPlayerVarTruthy(name) {
   try {
      const v = mp.players.local.getVariable(name);
      if (name === 'auth') {
         return v === true || v === 1 || v === '1' || v === 'true' || (v != null && v !== false && v !== 0 && v !== '0' && v !== 'false');
      }
      return clientVarTruthy(v);
   } catch (_e) {
      return false;
   }
}

let lastMenuSettingsSnapshot = null;
if (typeof global !== 'undefined') {
   global.__embeddedMinigameTab = false;
}
publishWorldUiUnlockedMirror();

/** Кэш: не дёргать displayRadar/minimap каждый кадр — убирает мигание. */
let worldChromeRasterCache = {
    appliedAllowed: null,
    radar: null,
    minimapEvt: null,
    hud: null,
    /** Нативный GTA HUD (звёзды, подсказки над картой и т.д.) */
    gameHud: null,
    help: null,
    chat: null,
    hints: null
};

/** Модалка (NPC-диалог, инвентарь…): один раз прячем CEF, не каждый кадр. */
let worldChromeOverlaySuppressed = false;

/** Фракция выбрана (1–6): гетто / FIB и т.д. */
function clientHasJoinedFaction() {
   try {
      const p = mp.players.local;
      const f = p.getVariable('fraction');
      if (f === null || f === undefined || f === '') return false;
      const n = typeof f === 'number' ? f : parseInt(String(f), 10);
      return !isNaN(n) && n >= 1 && n <= 6;
   } catch (_e) {
      return false;
   }
}

/**
 * Режимы, где fraction на сервере обнуляют, но игровой HUD нужен (AFK, DM).
 */
function clientAllowsWorldUiWithoutFraction() {
   try {
      const p = mp.players.local;
      if (p.getVariable('gangwar') === true) return true;
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

function clientMayShowWorldChrome() {
   try {
      if (typeof global.isCharCreatorActive === 'function' && global.isCharCreatorActive()) return false;
   } catch (_eCc) {}
   try {
      if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return false;
   } catch (_eSs) {}
   try {
      if (worldSpawnComplete && clientPlayerVarTruthy('auth')) return true;
      const p = mp.players.local;
      if (p.getVariable('gangwar') === true) return true;
   } catch (_eGw) {}
   return clientHasJoinedFaction() || clientAllowsWorldUiWithoutFraction();
}

/** Авто-разблокировка HUD в мире, если lobbySpawnComplete не доехал (реконнект и т.п.). */
function ensureWorldUiUnlockedIfReady() {
   if (worldUiUnlocked) return true;
   if (worldSpawnComplete) {
      setWorldUiUnlocked(true);
      syncWorldChromeFromStoredSettings();
      try { mp.events.call('worldHudRefresh'); } catch (_eHud) {}
      return true;
   }
   try {
      if (!clientPlayerVarTruthy('auth')) return false;
      if (!clientMayShowWorldChrome()) return false;
      if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return false;
      if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) return false;
      if (typeof global.isTopBrowserActive === 'function' && global.isTopBrowserActive()) return false;
      setWorldUiUnlocked(true);
      syncWorldChromeFromStoredSettings();
      try { mp.events.call('worldHudRefresh'); } catch (_eHud2) {}
      return true;
   } catch (_e) {
      return false;
   }
}

function primeNativeMinimap() {
   try {
      if (!clientMayShowWorldChrome()) return;
      if (typeof isMinimapUiBlocked === 'function' && isMinimapUiBlocked()) return;
      const settings = getMenuSettingsForWorldUi();
      if (settings && settings.map === false) return;
      mp.game.ui.setRadarBigmapEnabled(false, false);
      mp.game.ui.setRadarZoom(1.0);
      mp.game.ui.displayRadar(true);
      isRadarVisible = true;
      worldChromeRasterCache.radar = true;
      worldChromeRasterCache.minimapEvt = true;
      mp.events.call('minimap', true);
   } catch (_e) {}
}

function scheduleMinimapWarmup() {
   primeNativeMinimap();
   [120, 400, 900, 1800, 3200].forEach((ms) => {
      setTimeout(() => {
         try { primeNativeMinimap(); } catch (_e) {}
      }, ms);
   });
}

function scheduleWorldHudWarmup() {
   const tick = () => {
      try { mp.events.call('worldHudRefresh'); } catch (_e) {}
      try { mp.events.callRemote('showHud:SERVER'); } catch (_e2) {}
   };
   tick();
   [50, 150, 350, 700, 1200, 2000, 3500].forEach((ms) => setTimeout(tick, ms));
}

if (typeof global !== 'undefined') {
   global.clientMayShowWorldChrome = clientMayShowWorldChrome;
   global.__ensureWorldUiUnlockedIfReady = ensureWorldUiUnlockedIfReady;
}

/** Показ радара/CEF HUD из настроек F2 — только после спавна в режиме (как в рабочей сборке). */
function clientWorldChromeMayApplySettings() {
   try {
      return clientPlayerVarTruthy('auth') && worldUiUnlocked && clientMayShowWorldChrome();
   } catch (_e) {
      return false;
   }
}

/**
 * settings.hud = показывать игровой HUD.
 * hud_user_hidden = игрок сам выключил через «Скрыть HUD» в F2.
 * Откатываем массовый hud:false после путаницы старого тумблера «Худ».
 */
function normalizeHudVisibilityInSettings(settings, persist) {
   if (!settings || typeof settings !== 'object') return;
   if (!settings._hudUiFixV3) {
      settings.hud = true;
      settings.hud_user_hidden = false;
      settings._hudUiFixV2 = true;
      settings._hudUiFixV3 = true;
      isHudVisible = true;
   }
   if (!settings._hudUiFixV2) {
      settings.hud = true;
      settings.hud_user_hidden = false;
      settings._hudUiFixV2 = true;
   }
   if (settings.hud === false && settings.hud_user_hidden !== true) {
      settings.hud = true;
   }
   if (settings.hud === undefined || settings.hud === null) {
      settings.hud = true;
   }
   if (persist) {
      try {
         if (!mp.storage.data.settings) mp.storage.data.settings = settings;
         else Object.assign(mp.storage.data.settings, settings);
         mp.storage.flush();
      } catch (_e) {}
   }
}

function getDefaultWorldUiSettings() {
   return {
      hud: true,
      chat: true,
      hitmarker: true,
      map: true,
      help: true,
      snow: false,
      alertsound: true,
      ammo: true,
      voice: true,
      names: true,
      hud_hints: true,
      quests: true,
      target_hint: true,
      disconnect_marker: false
   };
}

function isF3MainMenuOpen() {
   try {
      if (typeof global.isMainMenuBrowserActive === 'function' && global.isMainMenuBrowserActive()) return true;
      const p = mp.players.local;
      return !!(p && p.getVariable('f3key') === true);
   } catch (_e) {
      return false;
   }
}

function clientWorldChromeBlocked() {
   try {
      if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return true;
      if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) return true;
      if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) return true;
      if (typeof global.isTopBrowserActive === 'function' && global.isTopBrowserActive()) return true;

      const p = mp.players.local;
      if (!p) return false;

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
      if (typeof global.isTabletOverlayOpen === 'function' && global.isTabletOverlayOpen()) return true;
      if (p.getVariable('tabletTryOn') === true) return true;
   } catch (_e) {}
   return false;
}

const _worldUiOverlayChecks = [];
global.__pendingWorldUiOverlayChecks = global.__pendingWorldUiOverlayChecks || [];

global.registerWorldUiOverlayCheck = function registerWorldUiOverlayCheck(fn) {
   if (typeof fn !== 'function') return;
   _worldUiOverlayChecks.push(fn);
};

global.runWorldUiOverlayChecks = function runWorldUiOverlayChecks() {
   for (let i = 0; i < _worldUiOverlayChecks.length; i++) {
      try {
         if (_worldUiOverlayChecks[i]()) return true;
      } catch (_e) {}
   }
   return false;
};

(global.__pendingWorldUiOverlayChecks || []).forEach((fn) => global.registerWorldUiOverlayCheck(fn));
global.__pendingWorldUiOverlayChecks = [];

if (typeof global !== 'undefined') {
   global.clientWorldChromeBlocked = clientWorldChromeBlocked;
   global.isF3MainMenuOpen = isF3MainMenuOpen;
   global.__chromeAllowedInWorld = clientWorldChromeMayApplySettings;
}

function getMenuSettingBool(key, fallback) {
   const settings = getMenuSettingsForWorldUi();
   if (!settings || settings[key] === undefined || settings[key] === null) return !!fallback;
   return !!settings[key];
}

function isPlayerMenuOpenForChat() {
   try {
      if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return true;
      if (global.__playermenuOpen === true) return true;
   } catch (_e) {}
   return false;
}

function isFactionTabletOpenForChat() {
   try {
      return typeof global.isFactionTabletOpen === 'function' && global.isFactionTabletOpen();
   } catch (_e) {
      return false;
   }
}

function isHudKeepChatHiddenMenuOpen() {
   return isPlayerMenuOpenForChat() || isFactionTabletOpenForChat();
}

/** Инвентарь / модалки: миникарта выключена. F10 её не прячет. */
function isMinimapUiBlocked() {
   try {
      if (typeof global.isWorldChromeSuppressedByOverlay === 'function' && global.isWorldChromeSuppressedByOverlay()) return true;
      if (clientWorldChromeBlocked()) return true;
   } catch (_e) {}
   return false;
}

function shouldForceHideMinimap() {
   if (isMinimapUiBlocked()) return true;
   try {
      const settings = getMenuSettingsForWorldUi();
      if (settings && settings.map === false) return true;
   } catch (_e) {}
   return false;
}

if (typeof global !== 'undefined') {
   global.isMinimapUiBlocked = isMinimapUiBlocked;
   global.shouldForceHideMinimap = shouldForceHideMinimap;
}

function suppressMinimapVisualThisFrame() {
   try {
      mp.game.ui.displayRadar(false);
      hideNativeHudRadarThisFrame();
      if (worldChromeRasterCache.radar !== false) worldChromeRasterCache.radar = false;
      if (worldChromeRasterCache.minimapEvt !== false) {
         worldChromeRasterCache.minimapEvt = false;
         mp.events.call('minimap', false);
      }
   } catch (_e) {}
}

function applyCustomChatVisibility(visible) {
   try {
      // F10 / меню фракции: чат на экране выкл, HUD не трогаем
      if (visible && isHudKeepChatHiddenMenuOpen()) {
         mp.events.call('hideChatServer');
         if (typeof global.enforceChatHiddenForOverlay === 'function') {
            global.enforceChatHiddenForOverlay();
         }
         return;
      }
      if (!visible) {
         if (typeof global.isChatComposeOpen === 'function' && global.isChatComposeOpen()) return;
      }
      mp.events.call(visible ? 'showChatServer' : 'hideChatServer');
   } catch (_e) {}
}

if (typeof global !== 'undefined') {
   global.applyCustomChatVisibility = applyCustomChatVisibility;
}

/** Нативный RAGE-чат скрыт; markAsChat доставляет outputChatBox в CEF. activate(false) только без открытого ввода. */
function suppressNativeRageChatGui() {
   try {
      if (typeof global !== 'undefined' && global.__chatInputOpen === true) return;
      mp.gui.chat.show(false);
   } catch (_e) {}
}

if (typeof global !== 'undefined') {
   global.suppressNativeRageChatGui = suppressNativeRageChatGui;
}

function syncWorldUiFlagsFromSettings(settings) {
   if (!settings) return;
   normalizeHudVisibilityInSettings(settings, false);
   isRadarVisible = !!settings.map;
   isHudVisible = !!settings.hud;
   isHelpVisible = !!settings.help;
   isChatVisible = settings.chat === undefined || settings.chat === null ? true : !!settings.chat;
   isHudKeyHintsVisible = !!settings.hud_hints;
}

if (typeof global !== 'undefined') {
   global.__getMenuSettingBool = getMenuSettingBool;
   global.syncWorldChromeFromStoredSettings = syncWorldChromeFromStoredSettings;
   global.normalizeHudVisibilityInSettings = normalizeHudVisibilityInSettings;
}

function hideNativeHudRadarThisFrame() {
   try {
      if (typeof mp.game.ui.hideHudAndRadarThisFrame === 'function') {
         mp.game.ui.hideHudAndRadarThisFrame();
      }
   } catch (_e) {}
}

if (typeof global !== 'undefined') {
   global.__applyPreworldChromeNativeSuppress = function applyPreworldChromeNativeSuppress() {
      try {
         const auth = clientPlayerVarTruthy('auth');
         const allowed = auth && worldUiUnlocked && clientMayShowWorldChrome();
         if (!auth || !allowed) {
            hideNativeHudRadarThisFrame();
         }
      } catch (_e) {}
   };
}

function applyModalWorldUiVisualSuppress() {
   mp.game.ui.displayHud(false);
   mp.game.ui.displayRadar(false);
   mp.events.call('minimap', false);
   mp.events.call('hud', false);
   mp.events.call('help', false);
   mp.events.call('hudKeyHints', false);
   suppressNativeRageChatGui();
   try {
      const typing = (typeof global.isChatComposeOpen === 'function' && global.isChatComposeOpen())
         || (typeof global !== 'undefined' && global.__chatInputOpen === true);
      if (!typing) mp.events.call('hideChatServer');
   } catch (_eChat) {}
   hideNativeHudRadarThisFrame();
}

mp.events.add('preworldChromeEnforceHidden', () => {
   try {
      if (worldSpawnComplete && clientPlayerVarTruthy('auth')) return;
      if (clientIsInActiveWorldMode()) {
         tryPromoteWorldUiIfInMode();
         return;
      }
      if (!clientWorldChromeMayApplySettings()) {
         applyPreLobbyWorldUiHidden();
         hideNativeHudRadarThisFrame();
         return;
      }
      applyModalWorldUiVisualSuppress();
   } catch (_e) {}
});

const CROSSHAIR_JSON_REMOTE_MAX = 12000;

/** Подтягивает сохранённый прицел в Vue-HUD (после входа, когда браузер уже поднят). */
function applyCrosshairFromStorageToHud() {
   try {
      const s = mp.storage.data && mp.storage.data.settings;
      if (!s || s.crosshairEnabled === false) return;
      if (s && typeof s.crosshair === 'string' && s.crosshair.length) {
         mp.events.call('hudCrosshairApply', s.crosshair);
      }
   } catch (_e) {}
}

function markCustomCrosshairEnabledAndSave() {
   if (!mp.storage.data.settings) mp.storage.data.settings = {};
   mp.storage.data.settings.crosshairEnabled = true;
   mp.storage.flush();
   if (lastMenuSettingsSnapshot && typeof lastMenuSettingsSnapshot === 'object') {
      lastMenuSettingsSnapshot.crosshairEnabled = true;
   }
   try {
      if (mp.players.local.getVariable('auth') === true) {
         mp.events.callRemote('crosshairEnabledSave:s', 1);
      }
   } catch (_eSave) {}
}

function pushCrosshairJsonToServer(_jsonStr) {
   try {
      if (mp.players.local.getVariable('auth') !== true) return;
      if (typeof global.__f10Reticle !== 'undefined' && typeof global.__f10Reticle.saveCrosshairFullToServer === 'function') {
         global.__f10Reticle.saveCrosshairFullToServer();
         return;
      }
      const jsonStr = _jsonStr;
      if (typeof jsonStr !== 'string' || !jsonStr.length || jsonStr.length > CROSSHAIR_JSON_REMOTE_MAX) return;
      JSON.parse(jsonStr);
      mp.events.callRemote('crosshairSettingsSave:s', jsonStr);
   } catch (_e) {}
}

/** После входа: прицел из accounts.crosshair_json (перебивает локальный mp.storage). */
mp.events.add('crosshairSettingsHydrate', (jsonStr) => {
   if (typeof jsonStr !== 'string' || !jsonStr.length || jsonStr.length > CROSSHAIR_JSON_REMOTE_MAX) return;
   try {
      JSON.parse(jsonStr);
   } catch (_e) {
      return;
   }
   if (typeof global !== 'undefined') global.__crosshairServerHydrated = true;
   if (!mp.storage.data.settings) mp.storage.data.settings = {};
   try {
      if (typeof global.__f10Reticle !== 'undefined' && typeof global.__f10Reticle.applyCrosshairDbPayload === 'function') {
         global.__f10Reticle.applyCrosshairDbPayload(jsonStr);
      } else if (typeof global.__f10Reticle !== 'undefined' && typeof global.__f10Reticle.syncReticleFromPhantomJson === 'function') {
         global.__f10Reticle.syncReticleFromPhantomJson(jsonStr);
      } else {
         mp.storage.data.settings.crosshair = jsonStr;
         mp.storage.flush();
         mp.events.call('hudCrosshairApply', jsonStr);
      }
   } catch (_eSync) {}
   const s = mp.storage.data.settings;
   if (lastMenuSettingsSnapshot && typeof lastMenuSettingsSnapshot === 'object') {
      if (typeof s.crosshair === 'string') lastMenuSettingsSnapshot.crosshair = s.crosshair;
      if (s.crosshairEnabled !== undefined) lastMenuSettingsSnapshot.crosshairEnabled = s.crosshairEnabled;
   }
   if (s.crosshairEnabled !== false && typeof s.crosshair === 'string' && s.crosshair.length) {
      mp.events.call('hudCrosshairApply', s.crosshair);
   }
});

/** После входа: вкл/выкл кастомного прицела из accounts.crosshair_enabled. */
mp.events.add('crosshairEnabledHydrate', (flag) => {
   const enabled = flag === true || flag === '1' || flag === 1 || flag === 'true';
   if (!mp.storage.data.settings) mp.storage.data.settings = {};
   mp.storage.data.settings.crosshairEnabled = enabled;
   mp.storage.flush();
   if (lastMenuSettingsSnapshot && typeof lastMenuSettingsSnapshot === 'object') {
      lastMenuSettingsSnapshot.crosshairEnabled = enabled;
   }
   if (!enabled) {
      try { mp.events.call('hudCrosshairShow', false); } catch (_e2) {}
   } else {
      applyCrosshairFromStorageToHud();
   }
});

function syncWorldChromeFromStoredSettings() {
   let settings = getMenuSettingsForWorldUi();
   if (!settings) {
      settings = getDefaultWorldUiSettings();
      try {
         mp.storage.data.settings = settings;
         mp.storage.flush();
      } catch (_eSt) {}
   }
   if (!worldUiUnlocked && !worldSpawnComplete) {
      applyPreLobbyWorldUiHidden();
      return;
   }
   if (!worldUiUnlocked) setWorldUiUnlocked(true);
   const playerMenuOpenNow = isHudKeepChatHiddenMenuOpen();
   if (playerMenuOpenNow) {
      if (!clientMayShowWorldChrome()) {
         applyPreLobbyWorldUiHidden();
         return;
      }
      normalizeHudVisibilityInSettings(settings, true);
      syncWorldUiFlagsFromSettings(settings);
      applyMenuSettingsWorldVisibility(settings);
      // Preference (isChatVisible) уже из settings; на экране чат гасим
      applyCustomChatVisibility(false);
      worldChromeRasterCache.chat = false;
      return;
   }
   if (clientWorldChromeBlocked()) {
      applyCustomChatVisibility(false);
      worldChromeRasterCache.chat = false;
      suppressMinimapVisualThisFrame();
      return;
   }
   if (isF3MainMenuOpen()) {
      normalizeHudVisibilityInSettings(settings, true);
      syncWorldUiFlagsFromSettings(settings);
      applyMenuSettingsWorldVisibility(settings);
      applyCustomChatVisibility(false);
      worldChromeRasterCache.chat = false;
      return;
   }
   if (!clientMayShowWorldChrome()) {
      applyPreLobbyWorldUiHidden();
      return;
   }
   normalizeHudVisibilityInSettings(settings, true);
   syncWorldUiFlagsFromSettings(settings);
   applyMenuSettingsWorldVisibility(settings);
}

function forceClosePreLobbyChromeBrowsers() {
   try {
      if (typeof topr !== 'undefined' && topr && mp.browsers.exists(topr)) topr.active = false;
   } catch (_eTop) {}
}

function clientIsInActiveWorldMode() {
   try {
      if (!clientPlayerVarTruthy('auth')) return false;
      if (clientHasJoinedFaction()) return true;
      const p = mp.players.local;
      if (p.getVariable('gangwar') === true) return true;
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

/** После закрытия модалки (инвентарь, магазин…) серверный invkey/shopc может запаздывать — несколько попыток восстановить HUD/чат. */
function invalidateWorldChromeRasterCache() {
   worldChromeRasterCache.radar = null;
   worldChromeRasterCache.minimapEvt = null;
   worldChromeRasterCache.hud = null;
   worldChromeRasterCache.gameHud = null;
   worldChromeRasterCache.help = null;
   worldChromeRasterCache.chat = null;
   worldChromeRasterCache.hints = null;
}

function scheduleWorldChromeRestoreAfterModal() {
   [0, 50, 120, 250, 500, 1000].forEach((ms) => {
      setTimeout(() => {
         try {
            if (clientWorldChromeBlocked()) return;
            invalidateWorldChromeRasterCache();
            syncWorldChromeFromStoredSettings();
         } catch (_e) {}
      }, ms);
   });
}

if (typeof global !== 'undefined') {
   global.scheduleWorldChromeRestoreAfterModal = scheduleWorldChromeRestoreAfterModal;
   global.invalidateWorldChromeRasterCache = invalidateWorldChromeRasterCache;
}

/** После входа / реконнекта переменные режима могут прийти позже playerReady — несколько попыток разблокировать HUD. */
function scheduleWorldUiUnlockRetries() {
   [0, 200, 500, 1000, 2000, 4000, 8000, 12000].forEach((ms) => {
      setTimeout(() => {
         try { tryPromoteWorldUiIfInMode(); } catch (_e) {}
      }, ms);
   });
}

function applyMenuSettingsWorldVisibility(settings) {
   if (!settings) return;
   const mapWanted = !!settings.map;
   const mapOn = mapWanted && !isMinimapUiBlocked();
   const helpOn = !!settings.help;
   const hudOn = !!settings.hud;
   const chatOn = settings.chat === undefined || settings.chat === null ? true : !!settings.chat;
   const hintsOn = !!settings.hud_hints;

   mp.game.ui.displayHud(true);
   mp.game.ui.displayRadar(mapOn);
   mp.events.call('minimap', mapOn);
   isRadarVisible = mapWanted;
   if (!mapOn) hideNativeHudRadarThisFrame();

   mp.events.call('help', helpOn);
   isHelpVisible = helpOn;

   mp.events.call('hud', hudOn);
   isHudVisible = hudOn;

   mp.events.call('hudKeyHints', hintsOn);
   isHudKeyHintsVisible = hintsOn;

   mp.gui.chat.activate(false);
   mp.gui.chat.show(false);
   isChatVisible = chatOn;
   // F10 открыт — не поднимаем чат, только preference
   applyCustomChatVisibility(isPlayerMenuOpenForChat() ? false : chatOn);

   worldChromeRasterCache.appliedAllowed = true;
   worldChromeRasterCache.radar = mapOn;
   worldChromeRasterCache.minimapEvt = mapOn;
   worldChromeRasterCache.hud = hudOn;
   worldChromeRasterCache.gameHud = true;
   worldChromeRasterCache.help = helpOn;
   worldChromeRasterCache.chat = chatOn;
   worldChromeRasterCache.hints = hintsOn;

   mp.events.call('targetHintSetting', settings.target_hint !== false);
   mp.events.call('newbieQuestsSetting', settings.quests !== false);

   applyCrosshairFromStorageToHud();
}

function applyPreLobbyWorldUiHidden() {
   mp.game.ui.displayHud(false);
   mp.game.ui.displayRadar(false);
   mp.events.call('minimap', false);
   isRadarVisible = false;

   mp.events.call('help', false);
   isHelpVisible = false;

   mp.events.call('hud', false);
   isHudVisible = false;

   mp.events.call('hudKeyHints', false);

   mp.gui.chat.show(false);
   mp.gui.chat.activate(false);
   isChatVisible = false;
   applyCustomChatVisibility(false);

   isHudKeyHintsVisible = false;

   worldChromeRasterCache.appliedAllowed = false;
   worldChromeRasterCache.radar = false;
   worldChromeRasterCache.minimapEvt = false;
   worldChromeRasterCache.hud = false;
   worldChromeRasterCache.gameHud = false;
   worldChromeRasterCache.help = false;
   worldChromeRasterCache.chat = false;
   worldChromeRasterCache.hints = false;
}

function getMenuSettingsForWorldUi() {
   if (lastMenuSettingsSnapshot) return lastMenuSettingsSnapshot;
   try {
      return mp.storage.data && mp.storage.data.settings;
   } catch (_e) {
      return null;
   }
}

function tryPromoteWorldUiIfInMode() {
   try {
      if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return;
      if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) return;
      if (typeof global.isTopBrowserActive === 'function' && global.isTopBrowserActive()) return;
   } catch (_e) {}
   if (!clientPlayerVarTruthy('auth')) return;
   if (!clientIsInActiveWorldMode()) return;
   setWorldUiUnlocked(true);
   forceClosePreLobbyChromeBrowsers();
   syncWorldChromeFromStoredSettings();
}

let menubr = null;
let minigamebr = null;
let lastGangwarFraction = 0;

if (typeof global !== 'undefined') {
   global.isMainMenuBrowserActive = function isMainMenuBrowserActive() {
      try {
         return !!(menubr && mp.browsers.exists(menubr) && menubr.active);
      } catch (_e) {
         return false;
      }
   };
}

function clampGangwarFractionId(value) {
   const n = parseInt(value, 10);
   if (isNaN(n) || n < 0) return 0;
   if (n > 6) return 6;
   return n;
}

function menuCefShowTab(href) {
   if (!menubr || !mp.browsers.exists(menubr)) return;
   const h = JSON.stringify(String(href || '#shop'));
   try {
      menubr.execute(
         `(function(){try{var t=${h};if(typeof jQuery!=='undefined'&&jQuery.fn.tab){jQuery('#main-nav a[href="'+t+'"]').tab('show');}else{var a=document.querySelector('#main-nav a[href="'+t+'"]');if(a)a.click();}}catch(_e){}})();`
      );
   } catch (_e) {}
}

function applyGangwarFractionToMenuCef() {
   if (!menubr || !mp.browsers.exists(menubr)) return;
   const f = clampGangwarFractionId(lastGangwarFraction);
   try {
      menubr.execute(
         'try{if(typeof flowF2SetFraction==="function")flowF2SetFraction(' +
            f +
            ');else if(typeof MenuTabSetFraction==="function")MenuTabSetFraction(' +
            f +
            ');}catch(_e){}'
      );
   } catch (_err) {}
}

/** Любое истинное значение auth от сервера (как раньше через !getVariable). */
function localPlayerAuthed() {
   try {
      return !!mp.players.local.getVariable('auth');
   } catch (_e) {
      return false;
   }
}

function canOpenAnyMenuNow() {
   if (mp.game.ui.isPauseMenuActive()) return false;
   if (!localPlayerAuthed()) return false;
   if (mp.players.local.getVariable('famcreate') === true) return false;
   if (mp.players.local.getVariable('familymenu')) return false;
   if (mp.players.local.getVariable('casmenu') === true) return false;
   if (mp.players.local.getVariable('amenu') === true) return false;
   if (mp.players.local.getVariable('blackmenu') === true) return false;
   if (mp.players.local.getVariable('animsmenu') === true) return false;
   if (mp.players.local.getVariable('shopc') === true) return false;
   if (mp.players.local.getVariable('tabletTryOn') === true) return false;
   if (mp.players.local.getVariable('jail') === true) return false;
   if (mp.players.local.getVariable('nof3') === true) return false;
   if (mp.players.local.getVariable('dead') === true) return false;
   if (mp.players.local.getVariable('invkey') === true) return false;
   if (mp.players.local.getVariable('phone') === true) return false;
   if (typeof global.isPhoneMarketOverlayOpen === 'function' && global.isPhoneMarketOverlayOpen()) return false;
   if (typeof global.isPlayerMenuOpen === 'function' && global.isPlayerMenuOpen()) return false;
   if (typeof global.isWarMapOpen === 'function' && global.isWarMapOpen()) return false;
   if (typeof global.isFracInteractOpen === 'function' && global.isFracInteractOpen()) return false;
   return true;
}

if (typeof global !== 'undefined') {
   global.canOpenAnyMenuNow = canOpenAnyMenuNow;
}

function closeMiniGameBrowser(options) {
   const skipHudRestore = options && options.skipHudRestore;
   global.__embeddedMinigameTab = false;
   if (minigamebr && mp.browsers.exists(minigamebr)) {
      const wasActive = minigamebr.active;
      minigamebr.active = false;
      if (wasActive && !skipHudRestore) {
         syncWorldChromeFromStoredSettings();
      }
   }
}

function openMiniGameBrowser() {
    mp.events.call('notify:client', 2, 'top-mid', 'Мини-игры временно недоступны.', 2500);
}

function toggleMiniGameBrowser() {
   if (!menubr || !mp.browsers.exists(menubr)) return;
   if (global.__embeddedMinigameTab && menubr.active) {
      global.__embeddedMinigameTab = false;
      menuCefShowTab('#shop');
      menubr.active = false;
      mp.events.callRemote('servarablef3', false);
      mp.gui.cursor.show(false, false);
      syncWorldChromeFromStoredSettings();
      return;
   }
   if (minigamebr && mp.browsers.exists(minigamebr) && minigamebr.active === true) {
      closeMiniGameBrowser();
      mp.events.callRemote('servarablef3', false);
      mp.gui.cursor.show(false, false);
   } else {
      if (!canOpenAnyMenuNow()) return;
      openMiniGameBrowser();
   }
}

mp.events.add('setfraction', (fraction) => {
   lastGangwarFraction = clampGangwarFractionId(fraction);
   applyGangwarFractionToMenuCef();
   if (typeof global.updateFractionMenuUi === 'function') global.updateFractionMenuUi(lastGangwarFraction);
});

/** Регистрация / ранний вход: данные для CEF до готовности меню — не терять setcount:setlogin */
const pendingMenuUi = {
   lobbyCounts: {},
   login: null,
   dpDisplay: null,
   freecaseAmount: null,
   freearmorcaseAmount: null,
   kills: null,
   deaths: null,
   bankDisplay: null,
   serverHours: null,
   accountProfileJson: null,
   casesCatalogJson: null
};

/** Безопасная передача JSON-строки в CEF (base64 — без поломки execute на кавычках/URL). */
function coerceMenuJsonRaw(jsonRaw) {
   if (jsonRaw == null || jsonRaw === '') return '{}';
   if (typeof jsonRaw === 'object') {
      try {
         return JSON.stringify(jsonRaw);
      } catch (_e) {
         return '{}';
      }
   }
   const s = String(jsonRaw).trim();
   if (!s || s === '[object Object]') return '{}';
   return s;
}

function applyCasesCatalogToCef(jsonRaw) {
   let payload;
   try {
      const raw = coerceMenuJsonRaw(jsonRaw);
      payload = JSON.parse(raw);
   } catch (_e) {
      return false;
   }
   if (!payload || typeof payload !== 'object') return false;
   pendingMenuUi.casesCatalogJson = JSON.stringify(payload);
   if (!menubr || !mp.browsers.exists(menubr)) return false;
   return f2ExecuteWithJson('syncCaseCatalogFromServer', payload);
}

function executeJsonFnOnBrowser(br, fnName, jsonRaw) {
   if (!br || !mp.browsers.exists(br)) return false;
   try {
      const raw = coerceMenuJsonRaw(jsonRaw);
      const b64 = Buffer.from(raw, 'utf8').toString('base64');
      br.execute(
         `(function(){try{var b=atob(${JSON.stringify(b64)});var r;if(typeof TextDecoder!=='undefined'){var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);r=new TextDecoder('utf-8').decode(u);}else{r=decodeURIComponent(escape(b));}var d;try{d=JSON.parse(r);}catch(_p1){d=r;}var fn=window[${JSON.stringify(fnName)}];if(typeof fn==='function')fn(d);else if(typeof ${fnName}==='function')${fnName}(d);}catch(_e){}})();`
      );
      return true;
   } catch (_e) {
      return false;
   }
}

function f2ExecuteWithJson(fnName, jsonRaw) {
   return executeJsonFnOnBrowser(menubr, fnName, jsonRaw);
}

function f10ExecuteWithJson(fnName, jsonRaw) {
   return executeJsonFnOnBrowser(global.__playermenuBr, fnName, jsonRaw);
}

function flushPendingMenuUi() {
   if (!menubr || !mp.browsers.exists(menubr)) return;
   try {
      Object.keys(pendingMenuUi.lobbyCounts).forEach((lobby) => {
         const c = pendingMenuUi.lobbyCounts[lobby];
         menubr.execute(`document.getElementById('${lobby}').innerText = '${c}';`);
      });
   } catch (_e) {}
   if (pendingMenuUi.login != null) {
      try {
         const s = JSON.stringify(String(pendingMenuUi.login));
         menubr.execute(
            '(function(){var t=' +
               s +
               ';if(typeof PLAYER!=="undefined")PLAYER.login=t;var e=document.getElementById("user-name");if(e)e.innerText=t;var s2=document.getElementById("sidebarLogin");if(s2)s2.textContent=t;try{if(typeof flowF2SyncHeader==="function")flowF2SyncHeader();}catch(_e){}})();'
         );
      } catch (_e) {}
   }
   if (pendingMenuUi.bankDisplay != null) {
      try {
         const v = JSON.stringify(String(pendingMenuUi.bankDisplay));
         const n = parseInt(String(pendingMenuUi.bankDisplay).replace(/[.\s]/g, ''), 10) || 0;
         menubr.execute(
            '(function(){var t=' +
               v +
               ';if(typeof PLAYER!=="undefined")PLAYER.bank=' +
               n +
               ';try{if(typeof currentView!=="undefined"&&currentView==="Osnovnoe"&&typeof renderContent==="function")renderContent("Osnovnoe");}catch(_e2){}})();'
         );
      } catch (_e) {}
   }
   if (pendingMenuUi.dpDisplay != null) {
      try {
         const v = JSON.stringify(String(pendingMenuUi.dpDisplay));
         const n = parseInt(String(pendingMenuUi.dpDisplay).replace(/[.\s]/g, ''), 10) || 0;
         menubr.execute(
            '(function(){var t=' +
               v +
               ';if(typeof PLAYER!=="undefined")PLAYER.dp=' +
               n +
               ';document.querySelectorAll(".dp-balance,#dpBalance").forEach(function(el){el.textContent=t;});try{if(typeof updateDp==="function")updateDp();}catch(_e){}})();'
         );
      } catch (_e) {}
   }
   if (pendingMenuUi.freecaseAmount != null) {
      try {
         menubr.execute(
            `(function(){try{var el=document.getElementById('amountfreecases');if(el)el.innerText='${pendingMenuUi.freecaseAmount}';if(typeof flowF2UpdateFreeCases==='function')flowF2UpdateFreeCases(${pendingMenuUi.freecaseAmount},null);}catch(_e){}})();`
         );
      } catch (_e) {}
   }
   if (pendingMenuUi.freearmorcaseAmount != null) {
      try {
         menubr.execute(
            `(function(){try{var el=document.getElementById('amountfreearmorcases');if(el)el.innerText='${pendingMenuUi.freearmorcaseAmount}';if(typeof flowF2UpdateFreeCases==='function')flowF2UpdateFreeCases(null,${pendingMenuUi.freearmorcaseAmount});}catch(_e){}})();`
         );
      } catch (_e) {}
   }
   if (pendingMenuUi.kills != null && pendingMenuUi.deaths != null) {
      try {
         const h =
            pendingMenuUi.serverHours == null ? 'null' : Number(pendingMenuUi.serverHours);
         menubr.execute(`setKillsStats(${pendingMenuUi.kills}, ${pendingMenuUi.deaths}, ${h})`);
      } catch (_e) {}
   }
   if (pendingMenuUi.accountProfileJson != null) {
      f2ExecuteWithJson('setMenuAccountProfile', pendingMenuUi.accountProfileJson);
   }
   if (pendingMenuUi.casesCatalogJson != null) {
      applyCasesCatalogToCef(pendingMenuUi.casesCatalogJson);
   }
   applyGangwarFractionToMenuCef();
   try {
      menubr.execute('try{if(typeof flowF2SyncHeader==="function")flowF2SyncHeader();}catch(_e){}');
   } catch (_e2) {}
}

mp.events.add('setcount:l', (lobby, count) => {
   pendingMenuUi.lobbyCounts[lobby] = count;
   if (menubr && mp.browsers.exists(menubr)) {
      try {
         menubr.execute(`document.getElementById('${lobby}').innerText = '${count}';`);
      } catch (_e) {}
   }
});

mp.events.add('setlogin', (login) => {
   pendingMenuUi.login = login;
   if (menubr && mp.browsers.exists(menubr)) {
      try {
         const s = JSON.stringify(String(login));
         menubr.execute(
            '(function(){var t=' +
               s +
               ';if(typeof PLAYER!=="undefined")PLAYER.login=t;var e=document.getElementById("user-name");if(e)e.innerText=t;var s2=document.getElementById("sidebarLogin");if(s2)s2.textContent=t;try{if(typeof flowF2SyncHeader==="function")flowF2SyncHeader();}catch(_e){}})();'
         );
      } catch (_e) {}
   }
   try {
      const raw = login == null ? '' : login;
      const l = String(Array.isArray(raw) ? raw[0] : raw).trim();
      if (!l) return;
      if (!mp.storage.data) mp.storage.data = {};
      mp.storage.data.auth = { login: l };
      mp.storage.flush();
   } catch (_e) {}
});

mp.events.add('updatedp', (dp) => {
   pendingMenuUi.dpDisplay = dp;
   const v = JSON.stringify(String(dp));
   const n = parseInt(String(dp).replace(/[.\s]/g, ''), 10) || 0;
   if (menubr && mp.browsers.exists(menubr)) {
      try {
         menubr.execute(
            '(function(){var t=' +
               v +
               ';if(typeof PLAYER!=="undefined")PLAYER.dp=' +
               n +
               ';document.querySelectorAll(".dp-balance,#dpBalance").forEach(function(el){el.textContent=t;});try{if(typeof updateDp==="function")updateDp();}catch(_e){}})();'
         );
      } catch (_err) {}
   }
   const pmBr = global.__playermenuBr;
   if (pmBr && mp.browsers.exists(pmBr)) {
      try {
         pmBr.execute(
            '(function(){try{if(typeof bloodApplyDonatePoints==="function")bloodApplyDonatePoints(' +
               n +
               ');}catch(_e){}})();'
         );
      } catch (_ePmDp) {}
   }
});

mp.events.add('updateMoney', (money) => {
   pendingMenuUi.bankDisplay = money;
   if (!menubr || !mp.browsers.exists(menubr)) return;
   const v = JSON.stringify(String(money));
   const n = parseInt(String(money).replace(/[.\s]/g, ''), 10) || 0;
   try {
      menubr.execute(
         '(function(){var t=' +
            v +
            ';if(typeof PLAYER!=="undefined")PLAYER.bank=' +
            n +
            ';try{if(typeof currentView!=="undefined"&&currentView==="Osnovnoe"&&typeof renderContent==="function")renderContent("Osnovnoe");}catch(_e){}})();'
      );
   } catch (_err) {}
});

mp.events.add('updatefreecase1', (amount) => {
   pendingMenuUi.freecaseAmount = amount;
   if (menubr && mp.browsers.exists(menubr)) {
      try {
         menubr.execute(
            `(function(){try{var el=document.getElementById('amountfreecases');if(el)el.innerText='${amount}';if(typeof flowF2UpdateFreeCases==='function')flowF2UpdateFreeCases(${amount},null);}catch(_e){}})();`
         );
      } catch (_e) {}
   }
});

mp.events.add('updatefreegoldcase1', (amount) => {
   pendingMenuUi.freegoldcaseAmount = amount;
   if (menubr && mp.browsers.exists(menubr)) {
      try {
         menubr.execute(
            `(function(){try{var el=document.getElementById('amountfreegoldcases');if(el)el.innerText='${amount}';}catch(_e){}})();`
         );
      } catch (_e) {}
   }
});

mp.events.add('updatefreearmorcase1', (amount) => {
   pendingMenuUi.freearmorcaseAmount = amount;
   if (menubr && mp.browsers.exists(menubr)) {
      try {
         menubr.execute(
            `(function(){try{var el=document.getElementById('amountfreearmorcases');if(el)el.innerText='${amount}';if(typeof flowF2UpdateFreeCases==='function')flowF2UpdateFreeCases(null,${amount});}catch(_e){}})();`
         );
      } catch (_e) {}
   }
});

mp.events.add('setKillsStats', (kills, deaths, hoursOnline) => {
   pendingMenuUi.kills = kills;
   pendingMenuUi.deaths = deaths;
   if (hoursOnline !== undefined && hoursOnline !== null) {
      const n = Number(hoursOnline);
      pendingMenuUi.serverHours = Number.isFinite(n) ? n : 0;
   }
   if (menubr && mp.browsers.exists(menubr)) {
      try {
         const h =
            pendingMenuUi.serverHours == null ? 'null' : Number(pendingMenuUi.serverHours);
         menubr.execute(`setKillsStats(${kills}, ${deaths}, ${h})`);
      } catch (_e) {}
   }
});

mp.events.add('setMenuAccountProfile', (jsonStr) => {
   let incoming = jsonStr;
   if (Array.isArray(incoming) && incoming.length === 1) incoming = incoming[0];
   const raw = incoming == null ? '' : String(incoming);
   pendingMenuUi.accountProfileJson = raw;
   try {
      const d = JSON.parse(raw);
      if (d && d.dp != null) {
         const n = parseInt(String(d.dp).replace(/[\s.]/g, ''), 10) || 0;
         pendingMenuUi.dpDisplay = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
   } catch (_e) {}
   f2ExecuteWithJson('setMenuAccountProfile', raw);
   f10ExecuteWithJson('setMenuAccountProfile', raw);
});

mp.events.add('animSlotsRequestF2', () => {
   try {
      if (typeof global.animSlotsPushToF2 === 'function') {
         global.animSlotsPushToF2();
      }
   } catch (_e) {}
});

mp.events.add('armorCosmeticShopPull', () => {
   mp.events.callRemote('armorCosmeticShopPull:s');
});

mp.events.add('armorCosmeticEquip', (d, t) => {
   mp.events.callRemote('armorCosmeticEquip:s', d, t);
});

mp.events.add('armorCosmeticGiftWrap', (d, t) => {
   mp.events.callRemote('armorCosmeticGiftWrap:s', d, t);
});

mp.events.add('armorCosmeticShopPush', (jsonStr) => {
   try {
      let js = jsonStr;
      if (Array.isArray(js) && js.length === 1) js = js[0];
      js = js == null ? '{}' : String(js);
      const code = 'try{if(typeof armorCosmeticShopApply===\'function\')armorCosmeticShopApply(' + js + ');}catch(_e){}';
      if (menubr && mp.browsers.exists(menubr)) {
         try { menubr.execute(code); } catch (_eF2) {}
      }
      const pmBr = global.__playermenuBr;
      if (pmBr && mp.browsers.exists(pmBr)) {
         try { pmBr.execute(code); } catch (_eF10) {}
      }
   } catch (_e) {}
});

mp.events.add('casesCatalogPush', (...args) => {
   let incoming = args[0];
   if (Array.isArray(incoming) && incoming.length === 1) incoming = incoming[0];
   applyCasesCatalogToCef(incoming);
});

mp.events.add('casesCatalogPull', () => {
   mp.events.callRemote('casesCatalogPull:s');
});

mp.events.add('donateCaseStockPull', () => {
   /* F10 roulette stock; Flow opens cases for DP, owned-count is unused */
});

mp.events.add('DonateCaseDoOpen', (casename, fast, type) => {
   const now = Date.now();
   const last = mp.players.local.__lastCaseUiOpenTs || 0;
   if (now - last < 1200) {
      mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      return;
   }
   if (String(type || 'dp').toLowerCase() === 'free') {
      mp.events.call('notify:client', 2, "top-mid", "Кейсы открываются только за DP.", 3000);
      return;
   }
   mp.players.local.__lastCaseUiOpenTs = now;
   mp.events.callRemote('opencase', casename, fast, type);
});

mp.events.add('startanimcase', (casename, fast, item, prizeName) => {
   const pack = JSON.stringify([
      String(casename || ''),
      !!(fast === true || fast === 'true' || fast === 1),
      parseInt(item, 10) || 0,
      prizeName == null ? '' : String(prizeName)
   ]);
   const js = "(function(){try{var __cr=" + pack + ";if(typeof window.casesDoRoll==='function')window.casesDoRoll(__cr[0],__cr[1],__cr[2],__cr[3]);else if(typeof window.flowF2CasesDoRoll==='function')window.flowF2CasesDoRoll(__cr[0],__cr[1],__cr[2],__cr[3]);}catch(_e){}try{if(typeof mp!=='undefined'&&mp.trigger)mp.trigger('opencaseUiReady');}catch(_e2){}})();";
   const pmBr = global.__playermenuBr;
   if (global.__playermenuOpen && pmBr && mp.browsers.exists(pmBr)) {
      try {
         pmBr.execute(js);
         return;
      } catch (_ePm) {}
   }
   if (!menubr || !mp.browsers.exists(menubr)) {
      try { mp.events.callRemote('opencase:cancel'); } catch (_e) {}
      mp.events.call('notify:client', 2, 'top-mid', 'Меню не готово. Откройте F2 и снова нажмите «Открыть».', 4500);
      return;
   }
   if (pendingMenuUi.casesCatalogJson != null) {
      applyCasesCatalogToCef(pendingMenuUi.casesCatalogJson);
   }
   try {
      menubr.execute(js);
   } catch (_e) {
      try { mp.events.callRemote('opencase:cancel'); } catch (_e2) {}
      mp.events.call('notify:client', 2, 'top-mid', 'Ошибка интерфейса кейса.', 4500);
   }
});

mp.events.add('menuAccountProfileRequest', () => {
   try {
      mp.events.callRemote('menuAccountProfile:s');
   } catch (_e) {}
});

mp.events.add('updateviplvl', (lvlRaw) => {
   let lvl = lvlRaw;
   if (Array.isArray(lvl) && lvl.length === 1) lvl = lvl[0];
   lvl = parseInt(String(lvl), 10);
   const pmBr = global.__playermenuBr;
   if (Number.isFinite(lvl) && pmBr && mp.browsers.exists(pmBr)) {
      try {
         pmBr.execute(
            'try{if(typeof bloodPatchVipFromClient==="function")bloodPatchVipFromClient(' +
               lvl +
               ');}catch(_e){}'
         );
      } catch (_ePmVip) {}
   }
   try {
      mp.events.callRemote('menuAccountProfile:s');
   } catch (_e) {}
});

mp.events.add('updatevipdate', (textRaw) => {
   let t = textRaw;
   if (Array.isArray(t) && t.length === 1) t = t[0];
   t = t == null ? '' : String(t);
   const pmBr = global.__playermenuBr;
   if (pmBr && mp.browsers.exists(pmBr)) {
      try {
         pmBr.execute(
            'try{if(typeof bloodPatchVipTimeFromClient==="function")bloodPatchVipTimeFromClient(' +
               JSON.stringify(t) +
               ');}catch(_e){}'
         );
      } catch (_ePmVipT) {}
   }
});

const MAIN_MENU_VK = 0x72;

/** После кнопки «Играть» на топе menubr может ещё не быть — открываем, когда браузер создан. */
let pendingMainMenuOpenFromTop = false;

const MAIN_MENU_SCROLL_RESET_JS =
   "(function(){function r(){var c=document.querySelector('.menu');if(c){c.scrollTop=0;try{c.scrollTo(0,0);}catch(e){}}try{document.documentElement.scrollTop=0;}catch(e2){}try{document.body.scrollTop=0;}catch(e3){}try{window.scrollTo(0,0);}catch(x){}}[0,30,120,260,420].forEach(function(t){setTimeout(r,t);});})();";

const MINIGAME_EMBED_BOOT_JS =
   "(function(){try{var fr=document.getElementById('bm-embed-minigame');if(!fr)return;function boot(){try{if(!fr.contentWindow)return;fr.contentWindow.postMessage({t:'dprou',k:'openGame'},'*');fr.contentWindow.postMessage({t:'dprou',k:'pull'},'*');}catch(_e){}}if(!fr.getAttribute('data-loaded')){var src=fr.getAttribute('data-src');if(!src)return;fr.onload=function(){fr.setAttribute('data-loaded','1');boot();};fr.src=src;}else{boot();}}catch(_e2){}})();";

function syncMinigameEmbedCef() {
   if (!menubr || !mp.browsers.exists(menubr)) return;
   try {
      menubr.execute(MINIGAME_EMBED_BOOT_JS);
   } catch (_e) {}
   [180, 500, 1000, 1800].forEach((ms) => {
      setTimeout(() => {
         try {
            if (menubr && mp.browsers.exists(menubr)) menubr.execute(MINIGAME_EMBED_BOOT_JS);
         } catch (_e2) {}
      }, ms);
   });
}

function openMainMenuBrowser() {
   if (!menubr || !mp.browsers.exists(menubr)) return false;
   if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
   closeMiniGameBrowser({ skipHudRestore: true });
   mp.events.callRemote('servarablef3', true);
   if (!clientWorldChromeMayApplySettings()) {
      mp.events.call('preworldChromeEnforceHidden');
   }
   menubr.active = true;
   mp.gui.chat.activate(false);
   mp.gui.cursor.show(true, true);
   flushPendingMenuUi();
   if (clientWorldChromeMayApplySettings()) {
      syncWorldChromeFromStoredSettings();
   }
   try {
      mp.events.callRemote('menuAccountProfile:s');
   } catch (_eProfDirect) {}
   try {
      mp.events.callRemote('armorCosmeticShopPull:s');
   } catch (_eArmor) {}
   try {
      mp.events.callRemote('casesCatalogPull:s');
   } catch (_eCasesCat) {}
   applyGangwarFractionToMenuCef();
   try {
      menubr.execute(
         `(function(){try{var t='#shop';if(typeof jQuery!=='undefined'&&jQuery.fn.tab){jQuery('#main-nav a[href="'+t+'"]').tab('show');}else{var a=document.querySelector('#main-nav a[href="'+t+'"]');if(a)a.click();}if(typeof hideBG==='function')hideBG();if(typeof syncPlayTabScrollClass==='function')syncPlayTabScrollClass();}catch(_e){}})();`
      );
   } catch (_eTab) {}
   try {
      menubr.execute(MAIN_MENU_SCROLL_RESET_JS);
   } catch (_e) {}
   return true;
}

mp.events.add('menuMainTabChange', (hrefRaw) => {
   const href = hrefRaw == null ? '' : String(hrefRaw);
   global.__embeddedMinigameTab = href === '#menu-minigame';
   if (href === '#menu-minigame') {
      syncMinigameEmbedCef();
   }
   if (href === '#account') {
      // F3 настройки вырезаны — настройки только в F10
      return;
   }
   if (href === '#shop') {
      try { mp.events.callRemote('armorCosmeticShopPull:s'); } catch (_eArmShop) {}
   }
   if (href === '#shop-armor') {
      try { mp.events.callRemote('armorCosmeticShopPull:s'); } catch (_eArmTab) {}
   }
});

mp.events.add('f2EmbedMinigameActive', () => {
   global.__embeddedMinigameTab = true;
});

mp.events.add('f2EmbedMinigameInactive', () => {
   global.__embeddedMinigameTab = false;
});

/**
 * Legacy: раньше открывала вкладку «Фракция» в F2 — теперь «Магазин».
 */
mp.events.add('menu:openFractionTab', () => {
   if (!menubr || !mp.browsers.exists(menubr)) return;
   openMainMenuBrowser();
   setTimeout(() => {
      menuCefShowTab('#shop');
   }, 50);
});

function tryFlushPendingMainMenuFromTop() {
   if (!pendingMainMenuOpenFromTop) return false;
   if (!menubr || !mp.browsers.exists(menubr)) return false;
   pendingMainMenuOpenFromTop = false;
   openMainMenuBrowser();
   return true;
}

mp.events.add('mainmenu:openFromTop', () => {
    pendingMainMenuOpenFromTop = true;
    tryFlushPendingMainMenuFromTop();
});

mp.events.add('openF3MenuFromF10', () => {
    if (!menubr || !mp.browsers.exists(menubr)) return;
    /* Два CEF сразу конфликтуют по курсору и ESC, поэтому F10 закрываем.
       closePlayerMenu синхронно гасит курсор — openMainMenuBrowser включит его обратно. */
    if (typeof global.closePlayerMenu === 'function') {
        try { global.closePlayerMenu({ force: true }); } catch (_ePm) {}
    }
    /* Проверка только после закрытия: пока F10 открыт, canOpenAnyMenuNow всегда false.
       Так сохраняются запреты вроде nof3, jail и dead, которые были у бинда F3. */
    if (!canOpenAnyMenuNow()) return;
    openMainMenuBrowser();
    /* Отложенное эхо закрытия F10 может успеть погасить курсор — возвращаем, пока F3 открыт. */
    [80, 250, 600].forEach((ms) => {
        setTimeout(() => {
            if (!menubr || !mp.browsers.exists(menubr) || !menubr.active) return;
            try { mp.gui.cursor.show(true, true); } catch (_eCur) {}
        }, ms);
    });
});

/** Первый вход после регистрации: открыть F2 на вкладке «Магазин». */
mp.events.add('playbutton:openMenu:c', () => {
   if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) {
      mp.events.call('spawnselect:cancel');
   }
   pendingMainMenuOpenFromTop = true;
   if (!tryFlushPendingMainMenuFromTop()) {
      const t0 = Date.now();
      const waitMenu = setInterval(() => {
         if (tryFlushPendingMainMenuFromTop() || Date.now() - t0 > 8000) {
            clearInterval(waitMenu);
         }
      }, 80);
   }
   setTimeout(() => {
      menuCefShowTab('#shop');
   }, 120);
});

function runMainMenuCleanup() {
   if (!menubr || !mp.browsers.exists(menubr)) return;
   try {
      menubr.execute('try{if(typeof flowF2Cleanup==="function")flowF2Cleanup();}catch(_e){}');
   } catch (_e) {}
}

/**
 * Меню открывается только кнопкой «Магазин» в F10, поэтому F3 снимаем полностью.
 * Повторяем после keybindsReload: bindAll() может навесить клавишу заново.
 * Закрытие меню не страдает — им занимаются tryCloseF3Esc и closemenu.
 */
function unbindMainMenuKey() {
   try {
      global.unbindGameplayKey(MAIN_MENU_VK, true);
   } catch (_e) {}
}

mp.events.add('keybindsReload', () => {
   setTimeout(() => unbindMainMenuKey(), 50);
});

setTimeout(() => {

   menubr = mp.browsers.new('package://browsers/menunew/index.html?v=48');
   global.__menubr = menubr;
   menubr.active = false;
   try { menubr.orderId = 130; } catch (_eOrd) {}
   if (typeof global.registerActiveBrowserOverlay === 'function') {
      global.registerActiveBrowserOverlay(() => menubr);
   }
   global.__embeddedMinigameTab = false;
   minigamebr = mp.browsers.new('package://browsers/minigames/index.html');
   global.__minigamebr = minigamebr;
   minigamebr.active = false;
   try { minigamebr.orderId = 130; } catch (_eOrd2) {}
   flushPendingMenuUi();
   tryFlushPendingMainMenuFromTop();

   unbindMainMenuKey();

   if (typeof global !== 'undefined') {
      global.tryCloseF3Esc = () => {
         if (!menubr || !mp.browsers.exists(menubr)) return false;
         if (global.__keybindCaptureSuppressMenuEscUntil && Date.now() < global.__keybindCaptureSuppressMenuEscUntil) {
            return true;
         }
         if (typeof global !== 'undefined' && global.__keybindCaptureActive) return true;
         if (menubr.active) {
            runMainMenuCleanup();
            global.__embeddedMinigameTab = false;
            menubr.active = false;
            mp.events.callRemote('servarablef3', false);
            mp.gui.cursor.show(false, false);
            syncWorldChromeFromStoredSettings();
            return true;
         }
         if (minigamebr && mp.browsers.exists(minigamebr) && minigamebr.active) {
            closeMiniGameBrowser();
            mp.events.callRemote('servarablef3', false);
            mp.gui.cursor.show(false, false);
            return true;
         }
         return false;
      };
   }

   mp.events.add('closemenu', () => {
      global.__embeddedMinigameTab = false;
      try { mp.events.callRemote('opencase:cancel'); } catch (_e) {}
      runMainMenuCleanup();
      menubr.active = false;
      closeMiniGameBrowser();
      mp.events.callRemote('fixHud');
      mp.events.callRemote('servarablef3', false);
      let spawnUiBlocking = false;
      try {
         spawnUiBlocking =
            (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) ||
            (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect());
      } catch (_eSp) {}
      if (spawnUiBlocking) return;
      mp.gui.cursor.show(false, false);
      syncWorldChromeFromStoredSettings();
      try {
         if (typeof global.restoreChatAfterWorldEnter === 'function') {
            setTimeout(() => global.restoreChatAfterWorldEnter(), 50);
         }
      } catch (_eChat) {}
   });

mp.events.add('toggleDpRouletteMenu', () => {
       mp.events.call('notify:client', 2, 'top-mid', 'Мини-игры временно недоступны.', 2500);
    });
   
   mp.events.add('popolnenie', () => {
      mp.events.call('chat:pushLine', '!{#ffffff}Пополнение DP: !{#30A8FF}flowdm.fun/donate');
      mp.events.call('notify:client', 1, "top-mid", "Пополнение DP — flowdm.fun/donate", 5000);
   });
   
   mp.events.add('obmendpm', (dp) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('obmendpm:server', dp);
   });
   
   mp.events.add('collectPrize', () => {
      mp.events.callRemote('collectPrize:server');
      setTimeout(() => {
         try { mp.events.callRemote('armorCosmeticShopPull:s'); } catch (_e) {}
         try { mp.events.callRemote('menuAccountProfile:s'); } catch (_e2) {}
      }, 350);
   });
   
   mp.events.add('sellPrize', () => {
      mp.events.callRemote('sellPrize:server');
   });

   mp.events.add('cancelCasePrize', () => {
      mp.events.callRemote('cancelCasePrize:server');
   });
   
   mp.events.add('opovesheniewin', (winItem) => {
      mp.events.callRemote('opovesheniewin:server', winItem);
   });
   
   mp.events.add('buyvip', (lvl) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('buyvip:server', lvl);
   });
   
   mp.events.add('saveSettings', (settingName, value) => {      
      if (!mp.storage.data.settings) {
         mp.storage.data.settings = {};
      }

      const keySettings = [
         'player_menu_key','cursor_key',
         'engine_key',
         'seatbelt_key',
         'vehicle_lock_key',
         'voice_key',
         'voice_reload_key',
         'whistle_key',
         'lie_key',
         'crouch_key',
         'inventory_key',
         'fast_slot_1_key',
         'fast_slot_2_key',
         'fast_slot_3_key',
         'anim_slot_1_key',
         'anim_slot_2_key',
         'anim_slot_3_key',
         'anim_slot_4_key',
         'anim_slot_5_key',
         'roulette_key',
         'report_key',
         'brawl_voice_key',
         'brawl_marker_key',
         'phone_key',
         'admin_drag_key',
         'admin_cuff_key'
      ];
      if (keySettings.includes(settingName)) {
         const k = parseInt(value, 10);
         if (isNaN(k) || k < 0 || k > 255) return;
         if (k >= 1 && typeof global.keybindConflictForSetting === 'function' && global.keybindConflictForSetting(k, settingName)) {
            mp.events.call('notify:client', 2, 'top-mid', 'Эта клавиша уже занята другим действием.', 3000);
            return;
         }
         mp.storage.data.settings[settingName] = k;
         mp.storage.flush();
         if (settingName === 'player_menu_key') mp.events.call('updateKeybind','player_menu',k);
         else if (settingName === 'cursor_key') mp.events.call('updateKeybind','cursor',k);
         else if (settingName === 'engine_key') mp.events.call('updateKeybind', 'engine', k);
         else if (settingName === 'seatbelt_key') mp.events.call('updateKeybind', 'seatbelt', k);
         else if (settingName === 'vehicle_lock_key') mp.events.call('updateKeybind', 'vehicle_lock', k);
         else if (settingName === 'voice_key') mp.events.call('updateKeybind', 'voice', k);
         else if (settingName === 'voice_reload_key') mp.events.call('updateKeybind', 'voice_reload', k);
         else if (settingName === 'whistle_key') mp.events.call('updateKeybind', 'whistle', k);
         else if (settingName === 'lie_key') mp.events.call('updateKeybind', 'lie', k);
         else if (settingName === 'crouch_key') mp.events.call('updateKeybind', 'crouch', k);
         else if (settingName === 'inventory_key') mp.events.call('updateKeybind', 'inventory', k);
         else if (settingName === 'fast_slot_1_key') mp.events.call('updateKeybind', 'fast_slot_1', k);
         else if (settingName === 'fast_slot_2_key') mp.events.call('updateKeybind', 'fast_slot_2', k);
         else if (settingName === 'fast_slot_3_key') mp.events.call('updateKeybind', 'fast_slot_3', k);
         else if (settingName === 'anim_slot_1_key') mp.events.call('updateKeybind', 'anim_slot_1', k);
         else if (settingName === 'anim_slot_2_key') mp.events.call('updateKeybind', 'anim_slot_2', k);
         else if (settingName === 'anim_slot_3_key') mp.events.call('updateKeybind', 'anim_slot_3', k);
         else if (settingName === 'anim_slot_4_key') mp.events.call('updateKeybind', 'anim_slot_4', k);
         else if (settingName === 'anim_slot_5_key') mp.events.call('updateKeybind', 'anim_slot_5', k);
        else if (settingName === 'roulette_key') mp.events.call('updateKeybind', 'roulette', k);
         else if (settingName === 'report_key') {
            mp.storage.data.settings.report_key = 0;
            mp.storage.flush();
            mp.events.call('updateKeybind', 'report', 0);
         }
         else if (settingName === 'brawl_voice_key') mp.events.call('updateKeybind', 'brawl_ptt', k);
         else if (settingName === 'brawl_marker_key') mp.events.call('updateKeybind', 'brawl_marker', k);
         else if (settingName === 'phone_key') mp.events.call('updateKeybind', 'phone', k);
         else if (settingName === 'admin_drag_key') mp.events.call('updateKeybind', 'admin_drag', k);
         else if (settingName === 'admin_cuff_key') mp.events.call('updateKeybind', 'admin_cuff', k);
         return;
      }
   
      mp.storage.data.settings[settingName] = value;
      if (lastMenuSettingsSnapshot && typeof lastMenuSettingsSnapshot === 'object') {
         lastMenuSettingsSnapshot[settingName] = value;
      }
      mp.storage.flush();
   
      if (settingName === 'map') {
         isRadarVisible = value;
         if (clientWorldChromeMayApplySettings() && !isMinimapUiBlocked() && value) {
            mp.game.ui.displayRadar(true);
            mp.events.call('minimap', true);
            worldChromeRasterCache.radar = true;
            worldChromeRasterCache.minimapEvt = true;
         } else {
            mp.game.ui.displayRadar(false);
            mp.events.call('minimap', false);
            worldChromeRasterCache.radar = false;
            worldChromeRasterCache.minimapEvt = false;
            hideNativeHudRadarThisFrame();
         }
      } else if (settingName === 'help') {
         isHelpVisible = value;
         if (clientWorldChromeMayApplySettings()) {
            mp.events.call('help', value);
            worldChromeRasterCache.help = value;
         } else {
            mp.events.call('help', false);
            worldChromeRasterCache.help = false;
         }
      } else if (settingName === 'hud') {
         const showHud = value === true || value === 1 || value === '1' || value === 'true';
         mp.storage.data.settings.hud = showHud;
         mp.storage.data.settings.hud_user_hidden = !showHud;
         if (lastMenuSettingsSnapshot && typeof lastMenuSettingsSnapshot === 'object') {
            lastMenuSettingsSnapshot.hud = showHud;
            lastMenuSettingsSnapshot.hud_user_hidden = !showHud;
         }
         isHudVisible = showHud;
         if (clientWorldChromeMayApplySettings()) {
            mp.events.call('hud', showHud);
            worldChromeRasterCache.hud = showHud;
         } else {
            mp.events.call('hud', false);
            worldChromeRasterCache.hud = false;
         }
         mp.storage.flush();
      } else if (settingName === 'chat') {
         isChatVisible = !!value;
         try { mp.storage.data.toggleChat = !!isChatVisible; } catch (_eTc) {}
         mp.gui.chat.activate(false);
         mp.gui.chat.show(false);
         // В F10 тумблер только пишет preference — чат на экране не показываем
         if (isPlayerMenuOpenForChat()) {
            applyCustomChatVisibility(false);
            worldChromeRasterCache.chat = false;
            if (typeof global.enforceChatHiddenForOverlay === 'function') {
               global.enforceChatHiddenForOverlay();
            }
         } else if (clientWorldChromeMayApplySettings()) {
            applyCustomChatVisibility(isChatVisible);
            worldChromeRasterCache.chat = isChatVisible;
         } else {
            applyCustomChatVisibility(false);
            worldChromeRasterCache.chat = false;
         }
      } else if (settingName === 'hitmarker') {
         mp.events.callRemote('hitmarker', value);
      } else if (settingName === 'snow') {
         mp.events.call('snow', value);
      } else if (settingName === 'alertsound') {
         mp.events.call('alertsound', value);
      } else if (settingName === 'ammo') {
         mp.events.callRemote('ammo', value);
      } else if (settingName === 'voice') {
         mp.events.callRemote('voice', value);
      } else if (settingName === 'names') {
         mp.events.callRemote('names', value);
      } else if (settingName === 'hud_hints') {
         isHudKeyHintsVisible = !!value;
         if (clientWorldChromeMayApplySettings()) {
            mp.events.call('hudKeyHints', isHudKeyHintsVisible);
            worldChromeRasterCache.hints = isHudKeyHintsVisible;
         } else {
            mp.events.call('hudKeyHints', false);
            worldChromeRasterCache.hints = false;
         }
      } else if (settingName === 'disconnect_marker') {
         try { mp.events.call('disconnectMarker:settingChanged', !!value); } catch (_eDm) {}
      } else if (settingName === 'quests') {
         mp.events.call('newbieQuestsSetting', !!value);
      } else if (settingName === 'target_hint') {
         mp.events.call('targetHintSetting', !!value);
      }
   });

   mp.events.add('crosshairSave', (jsonStr) => {
      if (typeof jsonStr !== 'string' || !jsonStr.length) return;
      if (!mp.storage.data.settings) mp.storage.data.settings = {};
      mp.storage.data.settings.crosshair = jsonStr;
      mp.storage.flush();
      mp.events.call('hudCrosshairApply', jsonStr);
      markCustomCrosshairEnabledAndSave();
      pushCrosshairJsonToServer(jsonStr);
   });

   /** Автосохранение прицела без повторного прогона HUD (превью уже через crosshairLiveHud). */
   mp.events.add('crosshairPersistStorage', (jsonStr) => {
      if (typeof jsonStr !== 'string' || !jsonStr.length) return;
      if (!mp.storage.data.settings) mp.storage.data.settings = {};
      mp.storage.data.settings.crosshair = jsonStr;
      mp.storage.flush();
      if (typeof global.__f10Reticle !== 'undefined' && typeof global.__f10Reticle.syncReticleFromPhantomJson === 'function') {
         global.__f10Reticle.syncReticleFromPhantomJson(jsonStr);
      }
      markCustomCrosshairEnabledAndSave();
      applyCrosshairFromStorageToHud();
      pushCrosshairJsonToServer(jsonStr);
   });

   mp.events.add('crosshairLiveHud', (jsonStr) => {
      if (typeof jsonStr !== 'string' || !jsonStr.length) return;
      mp.events.call('hudCrosshairApply', jsonStr);
   });

   mp.events.add('initCustomCrosshair', () => {});

   mp.events.add('crosshairCustomEnabled', (flag) => {
      const enabled = flag === true || flag === '1' || flag === 1 || flag === 'true';
      if (!mp.storage.data.settings) mp.storage.data.settings = {};
      mp.storage.data.settings.crosshairEnabled = enabled;
      mp.storage.flush();
      if (lastMenuSettingsSnapshot && typeof lastMenuSettingsSnapshot === 'object') {
         lastMenuSettingsSnapshot.crosshairEnabled = enabled;
      }
      try {
         if (mp.players.local.getVariable('auth') === true) {
            mp.events.callRemote('crosshairEnabledSave:s', enabled ? 1 : 0);
         }
      } catch (_eSave) {}
      if (!enabled) {
         try { mp.events.call('hudCrosshairShow', false); } catch (_e) {}
      } else {
         try {
            const s = mp.storage.data.settings;
            if (!s.crosshair || !String(s.crosshair).length) {
               const defCrosshair = JSON.stringify([{
                  Type: 'Crosshair',
                  Width: 2,
                  Height: 10,
                  CenterDistance: 2,
                  ChossHairOpacity: 1,
                  CenterPointVisible: true,
                  CenterPointSize: 1,
                  CenterPointRadius: 1,
                  CrosshairRadius: 1,
                  DefaultColor: '#000000',
                  TargetColor: '#ffffff'
               }]);
               s.crosshair = defCrosshair;
               mp.storage.flush();
               pushCrosshairJsonToServer(defCrosshair);
            } else {
               const cfg = JSON.parse(s.crosshair);
               if (cfg && cfg[0] && cfg[0].Type !== 'Crosshair') {
                  cfg[0].Type = 'Crosshair';
                  s.crosshair = JSON.stringify(cfg);
                  mp.storage.flush();
                  pushCrosshairJsonToServer(s.crosshair);
               }
            }
         } catch (_eNorm) {}
         applyCrosshairFromStorageToHud();
      }
   });
   
   mp.events.add('settime:c', (toogle) => {
      mp.game.clock.setTime(parseInt(toogle), 0, 0);
      mp.events.callRemote('settime:s', toogle);
   });

   mp.events.add('lobby', (select) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('lobby', select);
   });

   mp.events.add('PlayGangwar', (select) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('PlayGangwar', select);
   });

   mp.events.add('selectfraction', (fraction) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('selectfraction', fraction);
   });

   mp.events.add('rublesShopDiscordCopied', (trigger) => {
      const t = String(trigger || '');
      const labels = {};
      const label = labels[t] || 'покупки';
      mp.events.call('notify:client', 3, 'top-mid', `flowdm.fun/donate скопирован — оформите ${label}`, 4000);
   });

   mp.events.add('thermoCupDiscordCopied', () => {
      mp.events.call('rublesShopDiscordCopied', 'ThermosMug');
   });

   mp.events.add('DonateBuyItem', (category, name, trigger) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('s:buymenu', category, name, trigger);
   });

   mp.events.add('bloodMenuDonateBuy', (category, item, trigger) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('s:buymenu', category, item, trigger);
   });

   mp.events.add('DonateCaseBuy', () => {
      mp.events.call('notify:client', 3, 'top-mid', 'Кейс открывается сразу за DP — нажмите «Открыть».', 3500);
   });

   mp.events.add('buyresfraction', () => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('buyresfraction');
   });
   
   mp.events.add('PlayerChangeLoginDonate', (login) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('changeLogin:server', login);
   });

   mp.events.add('opencaseUiReady', () => {
      try {
         mp.events.callRemote('opencase:commit');
      } catch (_e) {}
   });

   mp.events.add('PlayerPromocodeEnter', (promo) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('activatepromo', promo);
   });

   mp.events.add('updatedpbalance', () => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('updatedpbalance');
   });

   mp.events.add('minigameDpRoulettePull', () => {
      mp.events.callRemote('minigame:dpRoulette:pull:s');
   });
   mp.events.add('minigameDpRouletteBet', (colorId, amountRaw) => {
      mp.events.call('notify:client', 2, 'top-mid', 'Мини-игра на тех. работах.', 4000);
      return;
      mp.events.callRemote('minigame:dpRoulette:bet:s', colorId == null ? '' : String(colorId), amountRaw == null ? '' : String(amountRaw));
   });
   mp.events.add('minigameDpRouletteAnimationDone', () => {
      mp.events.callRemote('minigame:dpRoulette:animationDone:s');
   });
   mp.events.add('minigame:dpRoulette:sync', (jsonStr) => {
      const s = jsonStr == null ? '{}' : String(jsonStr);
      if (menubr && mp.browsers.exists(menubr)) {
         try {
            menubr.execute(
               `(function(){try{var fr=document.getElementById('bm-embed-minigame');if(!fr||!fr.contentWindow)return;fr.contentWindow.postMessage({t:'dprou',k:'applyState',p:JSON.parse(${JSON.stringify(s)})},'*');}catch(_e){}})();`
            );
         } catch (_e) {}
      }
      if (minigamebr && mp.browsers.exists(minigamebr)) {
         try {
            minigamebr.execute(`try{DpRouletteGame.applyState(${JSON.stringify(s)});}catch(_e){}`);
         } catch (_e) {}
      }
   });
   mp.events.add('minigame:dpRoulette:spin', (jsonStr) => {
      const s = jsonStr == null ? '{}' : String(jsonStr);
      if (menubr && mp.browsers.exists(menubr)) {
         try {
            menubr.execute(
               `(function(){try{var fr=document.getElementById('bm-embed-minigame');if(!fr||!fr.contentWindow)return;fr.contentWindow.postMessage({t:'dprou',k:'onSpin',p:JSON.parse(${JSON.stringify(s)})},'*');}catch(_e){}})();`
            );
         } catch (_e) {}
      }
      if (minigamebr && mp.browsers.exists(minigamebr)) {
         try {
            minigamebr.execute(`try{DpRouletteGame.onSpin(${JSON.stringify(s)});}catch(_e){}`);
         } catch (_e) {}
      }
   });

   mp.events.add('DonateVehicleTestDrive', (veh) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('DonateVehicleTestDrive', veh);
   });

   mp.events.add('DonateClothes', (cloth) => {
      if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
      mp.players.local.clicked = new Date().getTime();
      mp.events.callRemote('DonateClothes', cloth);
   });

   mp.events.add('GetCoburaStatus', (coburaId) => {
      mp.events.callRemote('GetCoburaStatus', coburaId);
   });

   mp.events.add('SellCoburaToPlayer', (coburaId) => {
      mp.events.callRemote('SellCoburaToPlayer', coburaId);
   });

   mp.events.add('SetCoburaStatus', (coburaId, totalCount, hasThisType) => {
      if (!menubr || !mp.browsers.exists(menubr)) return;
      const total = (totalCount === undefined || totalCount === null || isNaN(totalCount)) ? 0 : Math.min(3, Math.max(0, Number(totalCount)));
      const hasIt = (hasThisType === undefined || hasThisType === null || isNaN(hasThisType)) ? 0 : Number(hasThisType);
      menubr.execute("(function(){var el=document.getElementById('coburaCount');var btn=document.getElementById('coburaSellBtn');if(el){el.innerText='У вас: "+total+" из 3 шт';}if(btn){btn.style.display=" + (hasIt > 0 ? "'block'" : "'none'") + ";}})();");
   });

   mp.events.add('aimgames', (status) => {
      mp.events.callRemote('aimgames', status);
   });

   setTimeout(() => applyGangwarFractionToMenuCef(), 400);
   setTimeout(() => applyGangwarFractionToMenuCef(), 1200);
}, 0);

mp.events.add('playerReady', (player) => {
   setTimeout(() => {
      let settings = mp.storage.data.settings;
      
      if (!settings) {
         settings = {
            hud: true,
            chat: true,
            hitmarker: true,
            map: true,
            help: true,
            snow: false,
            alertsound: true,
            ammo: true,
            voice: true,
            names: true,
            hud_hints: true
         };
         mp.storage.data.settings = settings;
         mp.storage.flush();
      }

      normalizeHudVisibilityInSettings(settings, true);
      if (typeof settings.hud === 'undefined') {
         settings.hud = true;
      }
      if (typeof settings.chat === 'undefined') {
         settings.chat = true;
      }
      if (!settings._chatVisibilityFixV1) {
         if (settings.chat === false) settings.chat = true;
         settings._chatVisibilityFixV1 = true;
      }
      if (typeof settings.hitmarker === 'undefined') {
         settings.hitmarker = true;
      }
      if (typeof settings.map === 'undefined') {
         settings.map = true;
      }
      if (typeof settings.help === 'undefined') {
         settings.help = true;
      }
      if (typeof settings.snow === 'undefined') {
         settings.snow = false;
      }
      if (typeof settings.ammo === 'undefined') {
         settings.ammo = true;
      }
      if (typeof settings.voice === 'undefined') {
         settings.voice = true;
      }
      if (typeof settings.names === 'undefined') {
         settings.names = true;
      }
      if (typeof settings.hud_hints === 'undefined') {
         settings.hud_hints = true;
      }
      if (typeof settings.engine_key === 'undefined') {
         settings.engine_key = 0x32;
      }
      if (typeof settings.fast_slot_2_key === 'undefined') {
         settings.fast_slot_2_key = 0x32;
      }
      /** Однократно: быстрый слот 2 с N (0x4e) → на 2, как слот 1 на 1. */
      if (typeof settings.fast_slot_2_migrated_2 === 'undefined') {
         if (settings.fast_slot_2_key === 0x4e) {
            settings.fast_slot_2_key = 0x32;
         }
         settings.fast_slot_2_migrated_2 = true;
      }
      if (typeof settings.voice_key === 'undefined') {
         settings.voice_key = 0x42;
      }
      if (typeof settings.lie_key === 'undefined') {
         settings.lie_key = 0x09;
      }
      if (typeof settings.whistle_key === 'undefined') {
         settings.whistle_key = 0x58;
      }
      /** Однократно: свист возвращаем на X (0x58). Старый дефолт Z (0x5a) переносим на X. */
      if (typeof settings.whistle_migrated_x === 'undefined') {
         if (settings.whistle_key === 0x5a) {
            settings.whistle_key = 0x58;
         }
         settings.whistle_migrated_x = true;
      }
      if (typeof settings.phone_key === 'undefined') settings.phone_key = 0x26;
      if (typeof settings.anim_slot_1_key === 'undefined') settings.anim_slot_1_key = 0;
      if (typeof settings.anim_slot_2_key === 'undefined') settings.anim_slot_2_key = 0;
      if (typeof settings.anim_slot_3_key === 'undefined') settings.anim_slot_3_key = 0;
      if (typeof settings.anim_slot_4_key === 'undefined') settings.anim_slot_4_key = 0;
      if (typeof settings.anim_slot_5_key === 'undefined') settings.anim_slot_5_key = 0;
      if (typeof settings.crouch_key === 'undefined') {
         settings.crouch_key = 0x11;
      }
      if (typeof settings.inventory_key === 'undefined') {
         settings.inventory_key = 0x49;
      }
      if (typeof settings.roulette_key === 'undefined') {
         settings.roulette_key = 0;
      }
      if (typeof settings.seatbelt_key === 'undefined') {
         settings.seatbelt_key = 0x4a;
      }
      if (typeof settings.vehicle_lock_key === 'undefined') {
         settings.vehicle_lock_key = 0x4c;
      }

      syncWorldUiFlagsFromSettings(settings);

      mp.storage.data.settings = settings;
      mp.storage.flush();
      mp.events.call('keybindsReload');

      if (menubr && mp.browsers.exists(menubr)) {
         menubr.execute(`setSettings(${JSON.stringify(settings)})`);
      }

      if (settings.crosshair && typeof settings.crosshair === 'string') {
         mp.events.call('hudCrosshairApply', settings.crosshair);
      }

      lastMenuSettingsSnapshot = settings;

      if (clientIsInActiveWorldMode()) {
         if (!worldSpawnComplete) {
            worldSpawnComplete = true;
            publishWorldUiUnlockedMirror();
         }
         setWorldUiUnlocked(true);
         forceClosePreLobbyChromeBrowsers();
         syncWorldChromeFromStoredSettings();
         scheduleWorldHudWarmup();
      } else if (!worldUiUnlocked && !worldSpawnComplete) {
         setWorldUiUnlocked(false);
         applyPreLobbyWorldUiHidden();
      }

      mp.events.callRemote('hitmarker', settings.hitmarker);

      mp.events.call('snow', settings.snow);

      mp.events.call('alertsound', settings.alertsound);

      mp.events.callRemote('ammo', settings.ammo);

      mp.events.callRemote('voice', settings.voice);

      mp.events.callRemote('names', settings.names);
   }, 1300);
});

mp.events.add('lobbySpawnComplete', () => {
   worldSpawnComplete = true;
   try {
      if (typeof global.releaseGameplayInputAfterWorldEnter === 'function') {
         global.releaseGameplayInputAfterWorldEnter();
      }
   } catch (_eRel) {}
   publishWorldUiUnlockedMirror();
   forceClosePreLobbyChromeBrowsers();
   setWorldUiUnlocked(true);
   invalidateWorldChromeRasterCache();
   syncWorldChromeFromStoredSettings();
   scheduleMinimapWarmup();
   scheduleWorldHudWarmup();
   scheduleWorldUiUnlockRetries();
   applyCrosshairFromStorageToHud();
   try { mp.events.call('worldHudRefresh'); } catch (_eHudRefresh) {}
   try {
      if (typeof global.applyChatPresentation === 'function') {
         setTimeout(() => global.applyChatPresentation(), 0);
         setTimeout(() => global.applyChatPresentation(), 250);
      }
   } catch (_eChat) {}
});

mp.events.addDataHandler('auth', (entity, value) => {
   try {
      if (entity !== mp.players.local) return;
      if (value === true || value === 1 || value === '1') {
         applyCrosshairFromStorageToHud();
         if (!worldSpawnComplete && clientIsInActiveWorldMode()) {
            worldSpawnComplete = true;
            publishWorldUiUnlockedMirror();
            setWorldUiUnlocked(true);
            invalidateWorldChromeRasterCache();
            syncWorldChromeFromStoredSettings();
            scheduleWorldHudWarmup();
         }
         ensureWorldUiUnlockedIfReady();
         try { mp.events.call('worldHudRefresh'); } catch (_eHud) {}
         try {
            if (typeof global.applyChatPresentation === 'function') {
               setTimeout(() => global.applyChatPresentation(), 100);
            }
         } catch (_eChat) {}
      }
   } catch (_e) {}
});

mp.events.add('worldUiLockReset', () => {
   worldSpawnComplete = false;
   publishWorldUiUnlockedMirror();
   setWorldUiUnlocked(false);
});

['gangwar', 'factionlessHub', 'afklobby', 'revolverdm', 'carabinedm', 'heavydm', 'fraction'].forEach((key) => {
   mp.events.addDataHandler(key, () => {
      try {
         tryPromoteWorldUiIfInMode();
         syncWorldChromeFromStoredSettings();
         try { mp.events.call('worldHudRefresh'); } catch (_eHud) {}
         if (key === 'gangwar') {
            try {
               const p = mp.players.local;
               if (p.getVariable('gangwar') === true) {
                  scheduleMinimapWarmup();
                  setTimeout(() => {
                     try { mp.events.call('worldHudRefresh'); } catch (_eHud2) {}
                     try { mp.events.callRemote('showHud:SERVER'); } catch (_eSh) {}
                  }, 400);
               }
            } catch (_eGw) {}
         }
      } catch (_e) {}
   });
});

mp.events.addDataHandler('invkey', (entity, value) => {
   try {
      if (entity !== mp.players.local) return;
      if (value !== true) scheduleWorldChromeRestoreAfterModal();
   } catch (_e) {}
});

mp.events.addDataHandler('shopc', (entity, value) => {
   try {
      if (entity !== mp.players.local) return;
      if (value !== true) scheduleWorldChromeRestoreAfterModal();
   } catch (_e) {}
});

mp.events.add('render', () => {
   try {
      if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) return;
      const auth = clientPlayerVarTruthy('auth');
      if (auth) ensureWorldUiUnlockedIfReady();
      const allowed = auth && worldUiUnlocked && clientMayShowWorldChrome();
      let spawnUi = false;
      try {
         spawnUi = typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive();
      } catch (_eSp) {}
      if (!auth || !allowed || spawnUi) {
         if (worldChromeRasterCache.appliedAllowed !== false) {
            worldChromeRasterCache.appliedAllowed = false;
            worldChromeRasterCache.radar = false;
            worldChromeRasterCache.minimapEvt = false;
            worldChromeRasterCache.hud = false;
            worldChromeRasterCache.gameHud = false;
            worldChromeRasterCache.help = false;
            worldChromeRasterCache.chat = false;
            worldChromeRasterCache.hints = false;
         }
         /** Каждый кадр: иначе CEF (setSettings при открытии F3) снова включает HUD до спавна. */
         mp.game.ui.displayHud(false);
         mp.game.ui.displayRadar(false);
         mp.events.call('minimap', false);
         mp.events.call('hud', false);
         mp.events.call('help', false);
         mp.events.call('hudKeyHints', false);
         suppressNativeRageChatGui();
         hideNativeHudRadarThisFrame();
         return;
      }

      if (typeof global.isWorldChromeSuppressedByOverlay === 'function' && global.isWorldChromeSuppressedByOverlay()) {
         mp.game.ui.displayHud(false);
         mp.game.ui.displayRadar(false);
         hideNativeHudRadarThisFrame();
         suppressNativeRageChatGui();
         if (worldChromeRasterCache.minimapEvt !== false) {
            worldChromeRasterCache.minimapEvt = false;
            mp.events.call('minimap', false);
         }
         if (!worldChromeOverlaySuppressed) {
            worldChromeOverlaySuppressed = true;
            worldChromeRasterCache.radar = false;
            worldChromeRasterCache.minimapEvt = false;
            worldChromeRasterCache.hud = false;
            worldChromeRasterCache.help = false;
            worldChromeRasterCache.hints = false;
            worldChromeRasterCache.chat = false;
            mp.events.call('minimap', false);
            mp.events.call('hud', false);
            mp.events.call('help', false);
            mp.events.call('hudKeyHints', false);
         }
         try {
            const typing = (typeof global.isChatComposeOpen === 'function' && global.isChatComposeOpen())
               || (typeof global !== 'undefined' && global.__chatInputOpen === true);
            if (!typing) {
               if (typeof global.enforceChatHiddenForOverlay === 'function') {
                  global.enforceChatHiddenForOverlay();
               } else {
                  mp.events.call('hideChatServer');
               }
            }
         } catch (_eChatHide) {}
         return;
      }

      if (worldChromeOverlaySuppressed) {
         worldChromeOverlaySuppressed = false;
         invalidateWorldChromeRasterCache();
      }

      if (worldChromeRasterCache.appliedAllowed !== true) {
         worldChromeRasterCache.appliedAllowed = true;
         worldChromeRasterCache.radar = null;
         worldChromeRasterCache.minimapEvt = null;
         worldChromeRasterCache.hud = null;
         worldChromeRasterCache.gameHud = null;
         worldChromeRasterCache.help = null;
         worldChromeRasterCache.chat = null;
         worldChromeRasterCache.hints = null;
      }

      if (worldChromeRasterCache.gameHud !== true) {
         worldChromeRasterCache.gameHud = true;
         mp.game.ui.displayHud(true);
      }

      if (isMinimapUiBlocked() || !isRadarVisible) {
         suppressMinimapVisualThisFrame();
      } else {
         if (worldChromeRasterCache.radar !== true) {
            worldChromeRasterCache.radar = true;
            mp.game.ui.displayRadar(true);
         }
         if (worldChromeRasterCache.minimapEvt !== true) {
            worldChromeRasterCache.minimapEvt = true;
            mp.events.call('minimap', true);
         }
      }
      if (worldChromeRasterCache.hud !== isHudVisible) {
         worldChromeRasterCache.hud = isHudVisible;
         mp.events.call('hud', isHudVisible);
      }
      if (worldChromeRasterCache.help !== isHelpVisible) {
         worldChromeRasterCache.help = isHelpVisible;
         mp.events.call('help', isHelpVisible);
      }
      if (worldChromeRasterCache.hints !== isHudKeyHintsVisible) {
         worldChromeRasterCache.hints = isHudKeyHintsVisible;
         mp.events.call('hudKeyHints', isHudKeyHintsVisible);
      }
      const f3MenuOpen = isF3MainMenuOpen();
      const playerMenuOpen = isHudKeepChatHiddenMenuOpen();
      const wantChatVisible = (f3MenuOpen || playerMenuOpen) ? false : isChatVisible;
      if (worldChromeRasterCache.chat !== wantChatVisible) {
         worldChromeRasterCache.chat = wantChatVisible;
         mp.gui.chat.activate(false);
         mp.gui.chat.show(false);
         applyCustomChatVisibility(wantChatVisible);
      }
   } catch (_e) {}
});

// Автоматический AFK отключён: игрок остаётся в текущем режиме при бездействии.
