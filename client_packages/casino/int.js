let enabled = false;
let renderTarget;

const SCREEN_DIAMONDS = "CASINO_DIA_PL";
const SCREEN_SKULLS = "CASINO_HLW_PL";
const SCREEN_SNOW = "CASINO_SNWFLK_PL";
const SCREEN_WIN = "CASINO_WIN_PL";

const targetName = "casinoscreen_01";
const targetModel = mp.game.joaat('vw_vwint01_video_overlay');
const textureDict = "Prop_Screen_Vinewood";
const textureName = "BG_Wall_Colour_4x4";

const casinoInteriorId = 275201;

let podiumInited = false;
let podium = null;
let carcasin = null;
let rot = 0;
let rotateBound = false;
const podiumHash = 2733879850;

function isAuthedForCasinoWorld() {
    try {
        return mp.players.local.getVariable('auth') === true;
    } catch (_e) {
        return false;
    }
}

function ensureCasinoPodiumBase() {
    if (podiumInited) return;
    podiumInited = true;
    mp.game.entity.createModelHideExcludingScriptObjects(1100.077, 219.9723, -50.04865, 10.0, podiumHash, true);
    podium = mp.objects.new(podiumHash, new mp.Vector3(1100.077, 219.9723, -50.084865));
}

async function rotate() {
    if (!carcasin || !mp.vehicles.exists(carcasin)) return;
    rot += 0.05;
    if (rot >= 360) rot = 0;
    if (podium) await podium.setRotation(0, 0, rot, 2, true);
    await carcasin.setHeading(rot);
}

function bindPodiumRotate() {
    if (rotateBound) return;
    rotateBound = true;
    mp.events.add('render', rotate);
}

mp.events.add("casino:loadVideoWall", async () => {
    if (!isAuthedForCasinoWorld()) return;
    mp.events.call('casino:unloadVideoWall');
    await mp.game.waitAsync(100);

    mp.game.graphics.requestStreamedTextureDict(textureDict, false);

    while (!mp.game.graphics.hasStreamedTextureDictLoaded(textureDict)) {
        await mp.game.waitAsync(100);
    }

    mp.game.ui.registerNamedRendertarget(targetName, false);
    mp.game.ui.linkNamedRendertarget(targetModel);

    mp.game.invoke("0xF7B38B8305F1FE8B", 0, SCREEN_DIAMONDS, true);

    mp.game.graphics.setTvAudioFrontend(true);
    mp.game.graphics.setTvVolume(-100);
    mp.game.graphics.setTvChannel(0);

    renderTarget = mp.game.ui.getNamedRendertargetRenderId(targetName);

    enabled = true;
});

mp.events.add("casino:unloadVideoWall", () => {
    mp.game.graphics.setTvChannel(-1);
    enabled = false;
});

mp.events.add('render', function () {
    if (!enabled || !isAuthedForCasinoWorld()) return;
    mp.game.ui.setTextRenderId(renderTarget);

    mp.game.invoke("0x61BB1D9B3A95D802", 4);
    mp.game.invoke("0xC6372ECD45D73BCD", true);
    mp.game.invoke('0x2BC54A8188768488', textureDict, textureName, 0.25, 0.5, 0.5, 1.0, 0.0, 255, 255, 255, 255);
    mp.game.graphics.drawTvChannel(0.5, 0.5, 1.0, 1.0, 0.0, 255, 255, 255, 255);
    mp.game.ui.setTextRenderId(1);
});

mp.events.add("guiReady", () => {
    const timer = setInterval(() => {
        if (!isAuthedForCasinoWorld()) return;
        const position = mp.players.local.position;
        const interior = mp.game.interior.getInteriorAtCoords(position.x, position.y, position.z);

        if (!enabled && interior === casinoInteriorId) {
            mp.events.call('casino:loadVideoWall');
            clearInterval(timer);
        }
    }, 1000);
});

mp.events.add("CAR_LOTTERY::PODIUM_LOAD_CAR_MODEL", (vModel) => {
    if (!isAuthedForCasinoWorld()) return;
    ensureCasinoPodiumBase();

    if (carcasin) {
        carcasin.destroy();
        carcasin = null;
    }
    carcasin = mp.vehicles.new(mp.game.joaat(vModel), new mp.Vector3(1100.077, 219.9723, -50.07865), {
        color: [[0, 0, 0], [0, 0, 0]],
        locked: true
    });
    carcasin.doNotChangeAlpha = true;
    carcasin.setAllowNoPassengersLockon(true);
    carcasin.setCanBeVisiblyDamaged(false);
    carcasin.setCanBreak(false);
    carcasin.setDeformationFixed();
    carcasin.setDirtLevel(0);
    carcasin.setDisablePetrolTankDamage(true);
    carcasin.setDisablePetrolTankFires(true);
    carcasin.setDoorsLockedForAllPlayers(true);
    carcasin.freezePosition(true);
    carcasin.setInvincible(true);
    carcasin.setDoorsLocked(2);
    bindPodiumRotate();
});

mp.events.add('lobbySpawnComplete', () => {
    try {
        if (mp.players.local.getVariable('auth') === true) {
            mp.events.call('CAR_LOTTERY::PODIUM_LOAD_CAR_MODEL', 'banana');
        }
    } catch (_e) {}
});
