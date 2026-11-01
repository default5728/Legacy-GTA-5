let topr = null;

function ensureTopBrowser() {
    if (topr && mp.browsers.exists(topr)) return topr;
    topr = mp.browsers.new('package://browsers/top/index.html');
    topr.active = false;
    return topr;
}

ensureTopBrowser();

if (typeof global !== 'undefined') {
    global.isTopBrowserActive = function isTopBrowserActive() {
        try {
            return !!(topr && mp.browsers.exists(topr) && topr.active);
        } catch (_e) {
            return false;
        }
    };
}

if (typeof global.registerActiveBrowserOverlay === 'function') {
    global.registerActiveBrowserOverlay(() => topr);
}

mp.events.add('top', (toggle) => {
    const browser = ensureTopBrowser();
    if (browser) browser.active = toggle;
    if (toggle) {
        try {
            if (typeof global.setWorldUiUnlocked === 'function') global.setWorldUiUnlocked(false);
        } catch (_e) {}
        mp.events.call('preworldChromeEnforceHidden');
        mp.events.call('hud', false);
    }
});

mp.events.add('loadtop:c', (data) => {
    try {
        if (typeof global.setWorldUiUnlocked === 'function') global.setWorldUiUnlocked(false);
    } catch (_e) {}
    mp.events.call('preworldChromeEnforceHidden');
    mp.events.call('hud', false);
    const browser = ensureTopBrowser();
    if (browser) browser.execute(`topMenu.loadData(${JSON.stringify(data)})`);
});

mp.events.add('playbutton:top:c', () => {
    if (topr && mp.browsers.exists(topr)) {
        topr.active = false;
    }

    try {
        mp.game.graphics.transitionFromBlurred(400);
    } catch (_e) {}

    mp.events.call('spawnselect:await');
    mp.events.call('preworldChromeEnforceHidden');
    mp.events.callRemote('playbutton:top:s');
});
