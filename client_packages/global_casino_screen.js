'use strict';

const SCREEN_POS = new mp.Vector3(959.4509887695312, 85.90776062011719, 74.99137115478516);
const SCREEN_INTERACT_DIST = 3.5;
let gcBrowser = null;
let gcOpen = false;

function ensureBrowser() {
    if (gcBrowser && mp.browsers.exists(gcBrowser)) return gcBrowser;
    gcBrowser = mp.browsers.new('package://browsers/globalcasino/index.html');
    gcBrowser.active = false;
    return gcBrowser;
}

function openGlobalCasino() {
    if (gcOpen) return;
    const br = ensureBrowser();
    br.active = true;
    gcOpen = true;
    global.showCursor(true);
    try {
        br.execute('if(window.globalCasinoApp){window.globalCasinoApp.betAmount=100;}');
    } catch (_e) {}
    mp.events.callRemote('server_global_casino_requestSnapshot');
}

function closeGlobalCasino() {
    if (!gcOpen) return;
    gcOpen = false;
    if (gcBrowser && mp.browsers.exists(gcBrowser)) gcBrowser.active = false;
    global.showCursor(false);
}

new global.ActionColshape(SCREEN_POS, 0, SCREEN_INTERACT_DIST, 'Общий банк', () => {
    if (global.actionAntiFlood && !global.actionAntiFlood('globalCasinoOpen', 1500)) return;
    openGlobalCasino();
});

mp.events.add('client_global_casino_event', (eventName, json) => {
    const br = ensureBrowser();
    if (!br || !mp.browsers.exists(br)) return;
    const safe = String(json || '{}').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    br.execute(`window.globalCasinoApp && window.globalCasinoApp.onEvent('${eventName}', JSON.parse('${safe}'))`);
});

mp.events.add('client_global_casino_close', () => closeGlobalCasino());

if (global.rpc) {
    mp.events.add('__gc_rpc', async (method, payloadJson, reqId) => {
        try {
            const payload = payloadJson ? JSON.parse(payloadJson) : {};
            const result = await global.rpc.callServer(String(method), payload);
            const br = ensureBrowser();
            if (!br || !mp.browsers.exists(br)) return;
            const safe = JSON.stringify(result || { error: 1 }).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            br.execute(`window.__gcRpcResolve && window.__gcRpcResolve('${reqId}', '${safe}')`);
        } catch (err) {
            const br = ensureBrowser();
            if (br && mp.browsers.exists(br)) {
                const safe = JSON.stringify({ error: 1, errorText: String(err.message || 'error') }).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                br.execute(`window.__gcRpcResolve && window.__gcRpcResolve('${reqId}', '${safe}')`);
            }
        }
    });
}

global.closeGlobalCasino = closeGlobalCasino;

global.tryCloseGlobalCasinoEsc = function tryCloseGlobalCasinoEsc() {
    if (!gcOpen) return false;
    closeGlobalCasino();
    return true;
};

mp.console.logInfo('[global_casino] screen client loaded');
