'use strict';

/** Один CEF pedTalk для EMS / аренды / угонки — без дублей и гонок загрузки. */
let pedDialogBrowser = null;
let pedDialogDomReady = false;
let pedDialogPendingCfg = null;

function ensurePedDialogBrowser() {
    if (pedDialogBrowser && mp.browsers.exists(pedDialogBrowser)) return pedDialogBrowser;
    pedDialogBrowser = mp.browsers.new('package://browsers/peddialog/index.html');
    if (pedDialogBrowser) {
        pedDialogBrowser.active = true;
        try { pedDialogBrowser.orderId = 120; } catch (_e) {}
    }
    return pedDialogBrowser;
}

function pedDialogExec(cmd) {
    try {
        if (pedDialogBrowser && mp.browsers.exists(pedDialogBrowser)) pedDialogBrowser.execute(cmd);
    } catch (_e) {}
}

function flushPedDialogPending() {
    if (!pedDialogPendingCfg || !pedDialogDomReady) return false;
    const cfg = pedDialogPendingCfg;
    pedDialogPendingCfg = null;
    pedDialogExec('window.showPedDialogFromCfg && window.showPedDialogFromCfg(' + JSON.stringify(cfg) + ')');
    return true;
}

function schedulePedDialogFlush() {
    [0, 50, 150, 400, 800].forEach(function (ms) {
        setTimeout(flushPedDialogPending, ms);
    });
}

function showSharedPedDialog(cfg) {
    ensurePedDialogBrowser();
    pedDialogPendingCfg = cfg || {};
    if (!flushPedDialogPending()) schedulePedDialogFlush();
}

function hideSharedPedDialog() {
    pedDialogPendingCfg = null;
    pedDialogExec('window.hidePedDialog && window.hidePedDialog()');
}

mp.events.add('browserDomReady', function (browser) {
    if (pedDialogBrowser && browser === pedDialogBrowser) {
        pedDialogDomReady = true;
        flushPedDialogPending();
    }
});

setTimeout(ensurePedDialogBrowser, 0);

global.showSharedPedDialog = showSharedPedDialog;
global.hideSharedPedDialog = hideSharedPedDialog;
global.getSharedPedDialogBrowser = function () {
    if (!pedDialogBrowser || !mp.browsers.exists(pedDialogBrowser)) return null;
    return pedDialogBrowser;
};
