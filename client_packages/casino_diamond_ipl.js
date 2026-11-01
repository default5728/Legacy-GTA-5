'use strict';

const CASINO_IPLS = [
    'vw_casino_main',
    'vw_casino_carpark',
    'vw_casino_garage',
    'hei_dlc_windows_casino',
    'hei_dlc_casino_door',
    'hei_dlc_casino_aircon'
];

const CASINO_INTERIOR_ANCHORS = [
    { x: 924.77, y: 46.83, z: 75.0 },
    { x: 948.62, y: 63.41, z: 75.0 },
    { x: 960.0, y: 30.0, z: 76.0 }
];

const pinnedCasinoInteriors = new Set();

function requestCasinoIpls() {
    CASINO_IPLS.forEach((ipl) => {
        try { mp.game.streaming.requestIpl(ipl); } catch (_e) {}
    });
}

function refreshCasinoInteriors() {
    CASINO_INTERIOR_ANCHORS.forEach((point) => {
        try {
            const interiorId = mp.game.interior.getInteriorAtCoords(point.x, point.y, point.z);
            if (!interiorId) return;
            if (!pinnedCasinoInteriors.has(interiorId)) {
                try { mp.game.interior.pinInterior(interiorId); } catch (_e) {}
                pinnedCasinoInteriors.add(interiorId);
            }
            try { mp.game.interior.refreshInterior(interiorId); } catch (_e2) {}
        } catch (_e3) {}
    });
}

requestCasinoIpls();
setTimeout(refreshCasinoInteriors, 1500);
setTimeout(refreshCasinoInteriors, 6000);
mp.events.add('playerReady', () => {
    requestCasinoIpls();
    setTimeout(refreshCasinoInteriors, 2000);
});

const SCREEN_DIAMONDS = 'CASINO_DIA_PL';
const targetName = 'casinoscreen_01';
const targetModel = mp.game.joaat('vw_vwint01_video_overlay');
const textureDict = 'Prop_Screen_Vinewood';
const textureName = 'BG_Wall_Colour_4x4';
const casinoInteriorId = 275201;

let videoWallEnabled = false;
let renderTarget = 0;

mp.events.add('casino:loadVideoWall', async () => {
    mp.events.call('casino:unloadVideoWall');
    await mp.game.waitAsync(100);

    mp.game.graphics.requestStreamedTextureDict(textureDict, false);
    while (!mp.game.graphics.hasStreamedTextureDictLoaded(textureDict)) {
        await mp.game.waitAsync(100);
    }

    mp.game.ui.registerNamedRendertarget(targetName, false);
    mp.game.ui.linkNamedRendertarget(targetModel);
    mp.game.invoke('0xF7B38B8305F1FE8B', 0, SCREEN_DIAMONDS, true);
    mp.game.graphics.setTvAudioFrontend(true);
    mp.game.graphics.setTvVolume(-100);
    mp.game.graphics.setTvChannel(0);

    renderTarget = mp.game.ui.getNamedRendertargetRenderId(targetName);
    videoWallEnabled = true;
});

mp.events.add('casino:unloadVideoWall', () => {
    videoWallEnabled = false;
    try { mp.game.graphics.setTvChannel(-1); } catch (_e) {}
});

mp.events.add('render', () => {
    if (!videoWallEnabled || !renderTarget) return;
    mp.game.ui.setTextRenderId(renderTarget);
    mp.game.invoke('0x61BB1D9B3A95D802', 4);
    mp.game.invoke('0xC6372ECD45D73BCD', true);
    mp.game.invoke('0x2BC54A8188768488', textureDict, textureName, 0.25, 0.5, 0.5, 1.0, 0.0, 255, 255, 255, 255);
    mp.game.graphics.drawTvChannel(0.5, 0.5, 1.0, 1.0, 0.0, 255, 255, 255, 255);
    mp.game.ui.setTextRenderId(1);
});

function startVideoWallWatcher() {
    const timer = setInterval(() => {
        const pos = mp.players.local.position;
        const interior = mp.game.interior.getInteriorAtCoords(pos.x, pos.y, pos.z);
        if (!videoWallEnabled && interior === casinoInteriorId) {
            mp.events.call('casino:loadVideoWall');
            clearInterval(timer);
        }
    }, 1000);
}

mp.events.add('guiReady', startVideoWallWatcher);
mp.events.add('playerReady', startVideoWallWatcher);
setTimeout(startVideoWallWatcher, 3000);
