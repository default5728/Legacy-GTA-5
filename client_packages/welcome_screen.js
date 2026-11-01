'use strict';

/** Интро до логина: CEF → welcomeIntro_cameraFly → welcomeIntro_auth → AuthShow. */
let welcomeBrowser = null;

global.__preAuthWelcomeOpen = false;

function destroyWelcomeBrowser() {
    try {
        if (welcomeBrowser && mp.browsers.exists(welcomeBrowser)) {
            welcomeBrowser.destroy();
        }
    } catch (_e) {}
    welcomeBrowser = null;
    global.__preAuthWelcomeOpen = false;
}

global.destroyPreAuthWelcomeChrome = destroyWelcomeBrowser;

global.openPreAuthWelcomeSplash = function openPreAuthWelcomeSplash() {
    welcomeBrowser = mp.browsers.new('package://browsers/welcome/index.html');
    if (!welcomeBrowser || !mp.browsers.exists(welcomeBrowser)) {
        welcomeBrowser = null;
        return false;
    }
    welcomeBrowser.active = true;
    global.__preAuthWelcomeOpen = true;
    try { mp.events.call('worldUiLockReset'); } catch (_e0) {}
    try { mp.events.call('preworldChromeEnforceHidden'); } catch (_e1) {}
    try { mp.events.call('hud', false); } catch (_e2) {}
    try { mp.events.call('phoneHide:CLIENT'); } catch (_ePh) {}
    try { mp.events.call('phonehud', false); } catch (_ePh2) {}
    if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
    mp.gui.cursor.show(true, true);
    try {
        welcomeBrowser.execute("mp.invoke('focus', true)");
    } catch (_e) {}
    return true;
};

mp.events.add('welcomeIntro_auth', () => {
    try {
        if (mp.players.local.getVariable('auth') === true) return;
    } catch (_e) {}
    destroyWelcomeBrowser();
    try {
        mp.gui.cursor.show(true, true);
    } catch (_e) {}
    try {
        mp.game.graphics.transitionFromBlurred(600);
    } catch (_e2) {}
    try { mp.events.call('worldUiLockReset'); } catch (_e3) {}
    try { mp.events.call('preworldChromeEnforceHidden'); } catch (_e4) {}
    mp.events.call('AuthShow');
});
