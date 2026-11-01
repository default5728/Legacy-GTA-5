loginBrowserr = mp.browsers.new('package://kepler-compat/auth/index.html');
loginBrowserr.active = false;
try { loginBrowserr.orderId = 900; } catch (_ord) {}


let loginBrowserDomReady = false;
let pendingAuthUiCmd = [];
let authBootstrapTick = 0;
const AUTH_BOOTSTRAP_MAX = 24;
let authScreenActive = false;
let authLoginPrefilled = false;
/** Полный boot CEF уже был — повторный boot() сбрасывал пароль при watchdog/retry. */
let authUiBooted = false;

function ensureLoginBrowser() {
    if (!loginBrowserr || !mp.browsers.exists(loginBrowserr)) {
        loginBrowserr = mp.browsers.new('package://kepler-compat/auth/index.html');
        loginBrowserr.active = false;
        loginBrowserDomReady = false;
        authUiBooted = false;
        authLoginPrefilled = false;
        pendingAuthUiCmd = [];
        try { loginBrowserr.orderId = 900; } catch (_ord2) {}
    }
    return loginBrowserr;
}

global.__authUseVeprais = true;
global.__authMenuOpen = false;

function isAuthenticatedClient() {
    try {
        return mp.players.local.getVariable('auth') === true;
    } catch (_e) {
        return false;
    }
}

function isSpawnSelectUiBlocking() {
    try {
        if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) return true;
        if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) return true;
    } catch (_e) {}
    return false;
}

function canStartAuthFlow() {
    if (isAuthenticatedClient() || isSpawnSelectUiBlocking()) return false;
    try {
        if (typeof global.isCharCreatorActive === 'function' && global.isCharCreatorActive()) return false;
    } catch (_e) {}
    return true;
}

function flushPendingAuthUi() {
    if (!loginBrowserDomReady || !pendingAuthUiCmd.length) return;
    const browser = ensureLoginBrowser();
    if (!browser || !mp.browsers.exists(browser)) return;
    const queue = pendingAuthUiCmd.slice();
    pendingAuthUiCmd = [];
    queue.forEach((cmd) => {
        try { browser.execute(cmd); } catch (_e) {}
    });
}

function queueAuthUi(cmd) {
    pendingAuthUiCmd.push(cmd);
    flushPendingAuthUi();
}

function runAuthUi(cmd) {
    queueAuthUi(cmd);
}

function keepAuthScreenFocus() {
    if (!authScreenActive || !global.__authMenuOpen) return;
    if (isAuthenticatedClient()) return;
    try { mp.gui.cursor.show(true, true); } catch (_e) {}
    try { mp.gui.cursor.visible = true; } catch (_e2) {}
}

function suppressWorldBrowsersForAuth() {
    try {
        if (typeof hudr !== 'undefined' && hudr && mp.browsers.exists(hudr)) hudr.active = false;
    } catch (_e) {}
    try {
        if (typeof topr !== 'undefined' && topr && mp.browsers.exists(topr)) topr.active = false;
    } catch (_e2) {}
    try { mp.events.call('preworldChromeEnforceHidden'); } catch (_e3) {}
    try { mp.events.call('hud', false); } catch (_e4) {}
}

global.destroyAuthChromeFully = function destroyAuthChromeFully() {
    global.__authMenuOpen = false;
    authScreenActive = false;
    authLoginPrefilled = false;
    authUiBooted = false;
    global.__preAuthWelcomeOpen = false;
    pendingAuthUiCmd = [];
    try {
        if (typeof global.destroyPreAuthWelcomeChrome === 'function') {
            global.destroyPreAuthWelcomeChrome();
        }
    } catch (_e0) {}
    try {
        if (loginBrowserr && mp.browsers.exists(loginBrowserr)) {
            runAuthUi('authMain.isActive = false;');
            loginBrowserr.active = false;
            loginBrowserr.destroy();
        }
    } catch (_e2) {}
    loginBrowserr = null;
    loginBrowserDomReady = false;
};

global.isPreAuthUiBlockingGameplay = function isPreAuthUiBlockingGameplay() {
    try {
        if (mp.players.local.getVariable('auth') === true) return false;
        if (global.__preAuthWelcomeOpen === true) return true;
        if (global.__authMenuOpen === true) return true;
    } catch (_e) {}
    return false;
};

function refocusAuthBrowser() {
    try {
        if (!loginBrowserr || !mp.browsers.exists(loginBrowserr) || !loginBrowserr.active) return;
        loginBrowserr.execute("try{if(typeof mp!=='undefined'&&mp.invoke)mp.invoke('focus',true);}catch(_e){}");
        mp.gui.cursor.show(true, true);
    } catch (_e) {}
}

require('./shared/auth_lobby.js');

/** Новости справа от формы входа. Картинки лежат в browsers/accounts/img/news. */
const AUTH_NEWS = [
    { id: 1, img: 'package://browsers/accounts/img/news/news1.jpg', date: '13.09.2026' },
    { id: 2, img: 'package://browsers/accounts/img/news/news2.jpg', date: '01.09.2026' },
    { id: 3, img: 'package://browsers/accounts/img/news/news3.jpg', date: '20.08.2026' }
];

const AUTH_UI_BOOT = {
    serverId: 23,
    serverName: 'La Puerta',
    news: AUTH_NEWS
};

/** Камера veprais RP — auth.js setStartCam */
const AUTH_CAM_VEPRAIS_POS = { x: 809.11414, y: -19.974813, z: 97.08313, heading: -97.68315 };

function applyAuthWorldScene() {
    try {
        mp.game.graphics.transitionFromBlurred(0);
    } catch (_e) {}

    suppressWorldBrowsersForAuth();
    mp.events.call('worldUiLockReset');
    try { mp.events.call('phoneHide:CLIENT'); } catch (_ePh) {}
    try { mp.events.call('phonehud', false); } catch (_ePh2) {}

    const spawn = typeof global.getAuthLobbySpawn === 'function' ? global.getAuthLobbySpawn() : AUTH_CAM_VEPRAIS_POS;
    const pos = new mp.Vector3(spawn.x, spawn.y, spawn.z);
    const heading = Number.isFinite(Number(spawn.heading)) ? Number(spawn.heading) : AUTH_CAM_VEPRAIS_POS.heading;

    try { mp.players.local.setAlpha(0); } catch (_a) {}
    try { mp.players.local.setVisible(false, false); } catch (_vis) {}

    mp.players.local.position = pos;
    try { mp.players.local.setHeading(heading); } catch (_h) {}
    mp.players.local.freezePosition(true);

    mp.gui.cursor.show(true, true);
    mp.events.call('createAuthCameraVeprais');
    mp.events.call('c:minimap', false);
}

function openAuthScreenUi() {
    global.__authMenuOpen = true;
    authScreenActive = true;

    if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();

    const browser = ensureLoginBrowser();
    browser.active = true;
    try { browser.orderId = 900; } catch (_ord) {}

    if (!authUiBooted) {
        // Первый показ — полный boot (очищает поля один раз)
        runAuthUi(`authMain.boot(${JSON.stringify(AUTH_UI_BOOT)}); authMain.isActive = true; authMain.sessionPending = false; authMain.authBlock = false; authMain.clearStatusLabel(); authMain.focusAuthPrimaryInput();`);
        authUiBooted = true;
    } else {
        // Повторный AuthShow/watchdog — НЕ трогаем пароль и логин
        runAuthUi(`if(window.authMain){authMain.isActive=true;authMain.sessionPending=false;authMain.authBlock=false;}`);
    }
    refocusAuthBrowser();
    keepAuthScreenFocus();

    try { mp.events.call('spawnselect:prefetch'); } catch (_pref) {}

    const authData = mp.storage.data.auth;
    if (authData && authData.login && !authLoginPrefilled) {
        if (authData.password) {
            delete authData.password;
            mp.storage.flush();
        }
        authLoginPrefilled = true;
        const safeLogin = String(authData.login).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        runAuthUi(`authMain.setAuthLogin('${safeLogin}')`);
    }
}

function beginAuthFlow() {
    if (!canStartAuthFlow()) return;
    applyAuthWorldScene();
    openAuthScreenUi();
}

function isAuthUiHealthy() {
    const browser = loginBrowserr;
    return !!(
        global.__authMenuOpen &&
        authScreenActive &&
        authUiBooted &&
        browser &&
        mp.browsers.exists(browser) &&
        browser.active &&
        loginBrowserDomReady
    );
}

function ensureAuthFlow(_reason) {
    if (!canStartAuthFlow()) return;

    // Уже открыто и живо — не переоткрываем (иначе boot сбрасывал пароль)
    if (isAuthUiHealthy()) {
        keepAuthScreenFocus();
        return;
    }

    beginAuthFlow();
    authBootstrapTick += 1;
    if (authBootstrapTick > AUTH_BOOTSTRAP_MAX) return;

    const needsRetry = !isAuthUiHealthy();
    if (needsRetry) {
        setTimeout(() => ensureAuthFlow('retry'), 1200);
    }
}

mp.events.add('WelcomeIntroHide', () => {
    global.__preAuthWelcomeOpen = false;
    try {
        if (typeof global.destroyWelcomeLobbyPeds === 'function') global.destroyWelcomeLobbyPeds();
    } catch (_e0) {}
    try {
        mp.game.cam.renderScriptCams(false, false, 0, true, false);
    } catch (_e1) {}
});

mp.events.add('WelcomeIntroShow', () => {
    if (!canStartAuthFlow()) return;
    authBootstrapTick = 0;
    ensureAuthFlow('WelcomeIntroShow');
});

mp.events.add('AuthShow', () => {
    if (!canStartAuthFlow()) return;
    if (!authScreenActive) applyAuthWorldScene();
    openAuthScreenUi();
});

mp.events.add('auth:browser:ready', () => {
    loginBrowserDomReady = true;
    flushPendingAuthUi();
});

mp.events.add('browserDomReady', (browser) => {
    if (browser !== loginBrowserr) return;
    loginBrowserDomReady = true;
    flushPendingAuthUi();
});

mp.events.add('playerReady', () => {
    authBootstrapTick = 0;
    setTimeout(() => ensureAuthFlow('playerReady'), 0);
    setTimeout(() => ensureAuthFlow('playerReady-delay'), 800);
    try { mp.events.callRemote('server_auth_clientReady'); } catch (_e) {}
});

mp.events.add('guiReady', () => {
    authBootstrapTick = 0;
    setTimeout(() => ensureAuthFlow('guiReady'), 0);
});

let authWatchdogFrames = 0;
mp.events.add('render', () => {
    if (authScreenActive && !isAuthenticatedClient()) keepAuthScreenFocus();

    authWatchdogFrames += 1;
    if (authWatchdogFrames % 180 !== 0) return;
    if (!canStartAuthFlow()) return;
    if (isAuthUiHealthy()) return;
    ensureAuthFlow('renderWatchdog');
});

mp.events.add('authstorage', (login) => {
    try {
        if (!login) return;
        mp.storage.data.auth = { login: String(login) };
        mp.storage.flush();
    } catch (_error) {}
});

mp.events.add('hideLogin', () => {
    global.__authMenuOpen = false;
    authScreenActive = false;
    authLoginPrefilled = false;
    authUiBooted = false;
    pendingAuthUiCmd = [];
    try {
        mp.players.local.setVisible(false, false);
    } catch (_vis) {
        try { mp.players.local.setAlpha(0); } catch (_a) {}
    }
    try {
        if (loginBrowserr && mp.browsers.exists(loginBrowserr)) {
            runAuthUi('authMain.isActive = false;');
            loginBrowserr.active = false;
        }
    } catch (_eAuth) {}
    try {
        if (typeof global.setWorldUiUnlocked === 'function') global.setWorldUiUnlocked(false);
    } catch (_eUi) {}
    mp.events.call('preworldChromeEnforceHidden');
    mp.events.call('hud', false);
    try {
        mp.game.graphics.transitionFromBlurred(400);
    } catch (_eBlur) {}
    try {
        if (typeof topr !== 'undefined' && topr && mp.browsers.exists(topr)) topr.active = false;
    } catch (_eTop) {}
    mp.events.call('spawnselect:await');
});

let lastAuthClick = 0;

mp.events.add('loginAttempt', (data) => {
    const now = Date.now();
    if (now - lastAuthClick < 500) return;
    lastAuthClick = now;
    try { mp.events.call('spawnselect:prefetch'); } catch (_pref) {}
    mp.events.callRemote('onLoginAttempt', data);
});

mp.events.add('registerAttempt', (data) => {
    const now = Date.now();
    if (now - lastAuthClick < 500) return;
    lastAuthClick = now;
    mp.events.callRemote('onRegisterAttempt', data);
});

function pushAuthStatusLabel(message) {
    const msg = String(message || '').trim();
    if (!msg) return;
    runAuthUi(`authMain.setStatusLabel(${JSON.stringify(msg)}); authMain.sessionPending = false; authMain.authBlock = false;`);
}

mp.events.add('registerSuccess', (login) => {
    const safeLogin = String(login || '').trim();
    authScreenActive = true;
    global.__authMenuOpen = true;
    const browser = ensureLoginBrowser();
    browser.active = true;
    runAuthUi(`authMain.onRegisterSuccess(${JSON.stringify(safeLogin)});`);
    try {
        if (safeLogin) {
            mp.storage.data.auth = { login: safeLogin };
            mp.storage.flush();
        }
    } catch (_e) {}
    refocusAuthBrowser();
});

mp.events.add('auth:sessionStarted', () => {
    authScreenActive = false;
    global.__authMenuOpen = false;
    runAuthUi('if(window.authMain){authMain.hideForSession();}');
    try {
        if (loginBrowserr && mp.browsers.exists(loginBrowserr)) loginBrowserr.active = false;
    } catch (_e) {}
});

mp.events.add('showAuthError', (errorMessage) => {
    pushAuthStatusLabel(errorMessage);
});

mp.events.add('banScreen:stopAuthChrome', () => {
    global.__authMenuOpen = false;
    authScreenActive = false;
    try {
        if (loginBrowserr && mp.browsers.exists(loginBrowserr)) {
            loginBrowserr.active = false;
        }
    } catch (_e) {}
});

mp.events.add('hideselect', () => {
    global.__authMenuOpen = false;
    authScreenActive = false;
    global.__preAuthWelcomeOpen = false;
    if (typeof global.isSpawnSelectActive === 'function' && global.isSpawnSelectActive()) {
        return;
    }
    if (typeof global.isAwaitingSpawnSelect === 'function' && global.isAwaitingSpawnSelect()) {
        return;
    }
    try {
        if (typeof topr !== 'undefined' && topr && mp.browsers.exists(topr)) topr.active = false;
    } catch (_eTop) {}
    mp.game.graphics.transitionFromBlurred(100);
    mp.events.call('removeCamera');
    mp.gui.cursor.show(false, false);
    try {
        mp.players.local.setVisible(true, false);
        mp.players.local.setAlpha(255);
    } catch (_e) {}
    mp.players.local.freezePosition(false);
    mp.events.call('lobbySpawnComplete');
});

mp.events.add('recoverypassword:cef', (email) => {
    mp.events.callRemote('recoverypassword:s', email);
});

mp.events.add('vercode::c', (status) => {
    if (loginBrowserr && mp.browsers.exists(loginBrowserr)) {
        runAuthUi(`authMain.setVerificationEmail(${status});`);
    }
});

mp.events.add('recoverypassword2:cef', (email, code, password) => {
    mp.events.callRemote('recoverypassword2:s', email, code, password);
});

mp.events.add('recoverySuccess', (login) => {
    try {
        if (login) {
            mp.storage.data.auth = { login: String(login) };
            mp.storage.flush();
        }
    } catch (_error) {}
    if (loginBrowserr && mp.browsers.exists(loginBrowserr)) {
        runAuthUi(`authMain.onRecoverySuccess(${JSON.stringify(String(login || ''))});`);
    }
});

try {
    ensureLoginBrowser();
} catch (_prefAuth) {}
