let inCallShape = false; 
let customCamera = null; 
let tattooBrowserReady = false;
let tattooOpenPending = false;

function executeTattooOpen() {
    if (!tatto || !mp.browsers.exists(tatto) || !tatto.active) return;
    try {
        const isFemale = mp.players.local.model === mp.game.joaat('mp_f_freemode_01');
        tatto.execute(
            'if (typeof tattooSetGender === "function") tattooSetGender(' + isFemale + ');' +
            'if (typeof changeTattooShopDisplay === "function") changeTattooShopDisplay("open");'
        );
    } catch (_e) {}
}

function setCustomCamera(mode = 3) {
    if (customCamera) {
        customCamera.setActive(false);
        customCamera.destroy();
    }

    const cameraHeights = [53.15, 53.05, 52.55, 52.65];
    const targetHeights = [52.90, 53.05, 52.55, 52.45];
    const cameraMode = Math.max(0, Math.min(3, parseInt(mode, 10) || 0));
    const cameraY = -1651.9871826171875;
    const cameraFov = 55;
    customCamera = mp.cameras.new(
        'default',
        new mp.Vector3(1321.9349365234375, cameraY, cameraHeights[cameraMode]),
        new mp.Vector3(0, 0, 0),
        cameraFov
    );
    customCamera.pointAtCoord(1321.7938232421875, -1654.1748046875, targetHeights[cameraMode]);
    customCamera.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
}

var _0x54f30c = mp.game.graphics.getScreenActiveResolution(0, 0);
let _0x3ee283 = 800, _0x4c37e8, _0x258f5a = [0, 0];
mp.events.add('render', () => {
    if (customCamera !== null && customCamera.isActive()) {
        mp.game.controls.disableAllControlActions(0);
        mp.game.controls.disableAllControlActions(1);
        mp.game.controls.disableAllControlActions(2);
        ;
        let _0x5e1fdb = mp.gui.cursor.position, _0x3fedc0 = {
                'x': _0x5e1fdb[0] - _0x258f5a[0],
                'y': _0x5e1fdb[1] - _0x258f5a[1]
            };
        _0x3fedc0.x /= _0x54f30c.x;
        _0x3fedc0.y /= _0x54f30c.y;
        ;
        let _0x266d3c = mp.players.local.getRotation(2);
        if (_0x4c37e8 == 'z') {
            let _0x41aee0 = mp.game.graphics.world3dToScreen2d(mp.players.local.position.x, mp.players.local.position.y, mp.players.local.position.z), _0x51db7d = mp.game.graphics.world3dToScreen2d(mp.players.local.position.x, mp.players.local.position.y, mp.players.local.position.z + 1);
            if (_0x41aee0 == undefined || _0x51db7d == undefined) {
                return;
            }
            var _0x12489f = {
                    'x': _0x51db7d.x - _0x41aee0.x,
                    'y': _0x51db7d.y - _0x41aee0.y
                }, _0x59b591 = _0x3fedc0.x * _0x12489f.x + _0x3fedc0.y * _0x12489f.y;
            mp.players.local.setRotation(_0x266d3c.x, _0x266d3c.y, _0x266d3c.z + _0x3fedc0.x * _0x3ee283 * 0.6, 1, true);
            let _0x363bf6 = mp.players.local.getHeading();
            mp.players.local.setHeading(_0x363bf6);
        }
        _0x258f5a = _0x5e1fdb;
    }
});
mp.events.add('click', (_0x1d9ec3, _0x4bd4b5, _0x1f3b7d, _0x223268, _0x16e63f, _0x127f15, _0x43eb5b, _0x2aaf0a) => {
    if (_0x1f3b7d == 'up') {
        _0x4c37e8 = '';
    } else {
        if (_0x1f3b7d == 'down') {
            if (customCamera !== null && customCamera.isActive()) {
                _0x4c37e8 = 'z';
            }
        }
    }
});

tatto = mp.browsers.new('package://browsers/tatto/index.html');
tatto.active = false;

if (typeof global.registerActiveBrowserOverlay === 'function') {
    global.registerActiveBrowserOverlay(() => tatto);
}

global.isTattooShopOpen = function isTattooShopOpen() {
    try {
        return !!(tatto && mp.browsers.exists(tatto) && tatto.active);
    } catch (_e) {
        return false;
    }
};

mp.events.add('tatto:ready:c', () => {
    tattooBrowserReady = true;
    if (tattooOpenPending && tatto && tatto.active) {
        tattooOpenPending = false;
        executeTattooOpen();
    }
});

mp.events.add('updateColshapeStatus3', (status) => {
    inCallShape = status; 
});

function openWorldTattoo(approved = false) {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (!approved && !mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;

    if (inCallShape || approved) {
        if (tatto.active) return;
        tatto.active = true;
        tattooOpenPending = !tattooBrowserReady;
        executeTattooOpen();
        setTimeout(executeTattooOpen, 100);
        setTimeout(executeTattooOpen, 350);
        setTimeout(executeTattooOpen, 800);
        mp.events.callRemote('teleportToLocation3', 'teleportCoords');
        mp.gui.cursor.show(true, true);
        mp.events.call('c:minimap', false);
        mp.gui.chat.show(false);
        if (typeof global.forceCloseChatInput === 'function') global.forceCloseChatInput();
        if (typeof global.enforceChatHiddenForOverlay === 'function') global.enforceChatHiddenForOverlay();
        mp.events.call('hud', false);
        mp.events.callRemote('s:setvarshopc', true);
        setCustomCamera(3);
    }
}
global.bindGameplayKey(0x45,true,()=>{if(typeof global.isWorldNpcNearby==='function'&&global.isWorldNpcNearby())return;openWorldTattoo();});
mp.events.add('legacy:world:tattoo',()=>openWorldTattoo(true));

mp.events.add('tatto:setcamera:c', (mode) => {
    if (!tatto || !tatto.active) return;
    setCustomCamera(mode);
});

mp.events.add('tatto:close:c', () => {
    if (!tatto || !tatto.active) return;
    tatto.active = false;
    tattooOpenPending = false;
    try {
        tatto.execute('if (typeof changeTattooShopDisplay === "function") changeTattooShopDisplay("close");');
    } catch (_e) {}
    mp.events.callRemote('teleportToLocation3', 'exitCoords');
    if (customCamera) {
        customCamera.setActive(false);
        customCamera.destroy();
        customCamera = null;
        mp.game.cam.renderScriptCams(false, false, 0, true, false);
    }
    mp.events.call('c:minimap', true);
    mp.gui.cursor.show(false, false);
    mp.events.callRemote('showHud:SERVER');
    if (typeof global.applyChatPresentation === 'function') global.applyChatPresentation();
    mp.gui.chat.show(false);
    mp.events.callRemote('s:setvarshopc', false);
});

mp.events.add('tatto:buy:c', (col, overlay, price, payType) => {
    if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, "top-mid", "Не так часто.", 1500);
    mp.players.local.clicked = new Date().getTime();
    mp.events.callRemote('tatto:buy:s', col, overlay, price, payType);
});

mp.events.add("tatto:setdemo:c", (col, overlay) => {
    mp.events.callRemote('tatto:setdemo:s', col, overlay);
});

global.tryCloseTattoEsc = function() {
    if (!tatto || !tatto.active) return false;
    mp.events.call('tatto:close:c');
    return true;
};

/** Стрелки вверх/вниз — переключение тату в активной зоне. */
function tattoTryArrow(delta) {
    if (!tatto || !mp.browsers.exists(tatto) || !tatto.active) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    try {
        tatto.execute('if (typeof tattooShopOnArrow === "function") tattooShopOnArrow(' + delta + ');');
    } catch (_e) {}
}

global.bindGameplayKey(0x26, true, () => tattoTryArrow(-1));
global.bindGameplayKey(0x28, true, () => tattoTryArrow(1));
