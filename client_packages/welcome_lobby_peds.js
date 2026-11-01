'use strict';

/**
 * Welcome / auth lobby NPCs (neverDM other.js → client-only, анимации + позиции).
 * Спавн в dimension игрока 5000–5999 (изолированное лобби).
 */

const LOBBY_DIM_MIN = 5000;
const LOBBY_DIM_MAX = 5999;

const WELCOME_LOBBY_PEDS = [
    { model: 'a_f_m_beach_01', position: new mp.Vector3(-47.83, 782.67, 227.23), heading: -66.3767, animDict: 'anim@amb@nightclub@mini@dance@dance_solo@female@var_a@', animName: 'high_center' },
    { model: 'a_f_y_beach_02', position: new mp.Vector3(-45.43, 781.68, 227.23), heading: 69.3971, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_15_v1_female^3' },
    { model: 'a_f_y_beach_01', position: new mp.Vector3(-45.12, 783.11, 227.23), heading: 84.6549, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_17_v1_female^5' },
    { model: 's_f_y_baywatch_01', position: new mp.Vector3(-46.71, 781.04, 227.23), heading: -10.2670, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_17_v1_female^6' },
    { model: 's_f_y_bartender_01', position: new mp.Vector3(-42.39, 790.23, 227.11), heading: 9.0245, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_09_v1_female^1' },
    { model: 'csb_sss', position: new mp.Vector3(-42.76, 792.43, 227.11), heading: -171.8812, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_13_v1_male^1' },
    { model: 'ig_kaylee', position: new mp.Vector3(-43.12, 787.08, 227.23), heading: -96.7779, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_13_v2_male^3' },
    { model: 'a_m_y_beach_02', position: new mp.Vector3(-40.28, 787.51, 227.23), heading: 140.3636, animDict: 'anim@amb@nightclub@dancers@black_madonna_entourage@', animName: 'hi_dance_facedj_09_v2_male^5' },
    { model: 'a_m_y_beachvesp_02', position: new mp.Vector3(-41.46, 785.38, 227.23), heading: -39.1097, animDict: 'anim@amb@nightclub@dancers@black_madonna_entourage@', animName: 'li_dance_facedj_11_v1_male^1' },
    { model: 'a_m_m_beach_01', position: new mp.Vector3(-38.66, 794.01, 227.23), heading: -82.3795, animDict: 'abigail_mcs_1_concat-5', animName: 'player_zero_dual-5' },
    { model: 's_f_y_baywatch_01', position: new mp.Vector3(-47.85, 806.72, 227.11), heading: -179.0775, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_17_v1_female^5' },
    { model: 'a_m_y_beach_02', position: new mp.Vector3(-47.17, 805.12, 227.11), heading: 26.8378, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_11_v1_male^4' },
    { model: 'a_m_o_beach_02', position: new mp.Vector3(-48.76, 805.53, 226.98), heading: -82.9123, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@low_intesnsity', animName: 'li_dance_facedj_13_v2_male^1' },
    { model: 'a_f_y_beach_02', position: new mp.Vector3(-60.73, 803.86, 226.98), heading: -25.1811, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_13_v1_female^3' },
    { model: 'a_f_m_beach_01', position: new mp.Vector3(-61.57, 806.26, 226.98), heading: -151.8964, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_15_v1_female^2' },
    { model: 'a_f_y_bevhills_02', position: new mp.Vector3(-45.34, 810.62, 231.33), heading: -170.5978, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity', animName: 'hi_dance_facedj_17_v1_female^1' },
    { model: 'a_m_y_beach_01', position: new mp.Vector3(-53.62, 781.14, 227.23), heading: -98.1129, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_13_v1_male^1' },
    { model: 'a_m_y_beach_03', position: new mp.Vector3(-52.19, 779.00, 227.23), heading: -11.7911, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_13_v2_male^3' },
    { model: 'u_m_y_abner', position: new mp.Vector3(-50.93, 778.82, 227.23), heading: 15.5677, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_13_v2_male^6' },
    { model: 's_m_y_baywatch_01', position: new mp.Vector3(-49.84, 779.67, 227.23), heading: 46.8569, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_17_v1_male^6' },
    { model: 'a_m_y_beach_01', position: new mp.Vector3(-57.59, 807.25, 226.98), heading: -19.5031, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_13_v2_male^2' },
    { model: 'u_f_y_spyactress', position: new mp.Vector3(-57.45, 809.56, 226.98), heading: -150.7448, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_15_v1_female^6' },
    { model: 'ig_tracydisanto', position: new mp.Vector3(-56.16, 809.39, 226.98), heading: 153.0775, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_13_v2_female^1' },
    { model: 'a_f_y_topless_01', position: new mp.Vector3(-44.64, 798.79, 227.23), heading: 157.7873, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_09_v1_female^6' },
    { model: 'u_m_y_staggrm_01', position: new mp.Vector3(-45.35, 796.85, 227.11), heading: 11.6028, animDict: 'anim@amb@nightclub@dancers@crowddance_facedj@med_intensity', animName: 'mi_dance_facedj_09_v2_male^4' },
    { model: 'g_m_y_armgoon_02', position: new mp.Vector3(-58.79, 784.78, 227.23), heading: -170.8327, animDict: 'abigail_mcs_1_concat-5', animName: 'player_zero_dual-5' },
    { model: 'u_m_y_zombie_01', position: new mp.Vector3(-53.93, 820.83, 240.16), heading: -173.4797, animDict: 'special_ped@zombie@base', animName: 'base' }
];

let welcomeLobbyPedList = [];
let welcomeLobbyAnimTimers = [];
let welcomeLobbySpawnedDim = NaN;
let welcomeLobbySpawnToken = 0;

function welcomeIsLobbyDimension(dim) {
    return typeof dim === 'number' && dim >= LOBBY_DIM_MIN && dim <= LOBBY_DIM_MAX;
}

function welcomePedAlive(ped) {
    if (!ped) return false;
    try {
        return mp.peds.exists(ped);
    } catch (_e) {
        return false;
    }
}

function destroyWelcomeLobbyPeds() {
    welcomeLobbyAnimTimers.forEach((id) => {
        try { clearInterval(id); } catch (_e) {}
    });
    welcomeLobbyAnimTimers = [];
    welcomeLobbyPedList.forEach((ped) => {
        try {
            if (welcomePedAlive(ped)) ped.destroy();
        } catch (_e2) {}
    });
    welcomeLobbyPedList = [];
    welcomeLobbySpawnedDim = NaN;
}

function playWelcomeLobbyAnim(ped, animDict, animName) {
    if (!welcomePedAlive(ped)) return;
    try {
        ped.taskPlayAnim(animDict, animName, 8.0, 1.0, -1, 1, 1.0, false, false, false);
    } catch (_e) {}
}

function createWelcomeLobbyPed(pedData, dimension) {
    let bot = null;
    try {
        bot = mp.peds.new(
            mp.game.joaat(pedData.model),
            pedData.position,
            pedData.heading,
            dimension
        );
    } catch (_e) {
        return;
    }
    if (!welcomePedAlive(bot)) return;

    try {
        bot.setInvincible(true);
        bot.setBlockingOfNonTemporaryEvents(true);
        bot.freezePosition(true);
    } catch (_e2) {}

    welcomeLobbyPedList.push(bot);

    mp.game.streaming.requestAnimDict(pedData.animDict);
    const loadTimer = setInterval(() => {
        if (!welcomePedAlive(bot)) {
            clearInterval(loadTimer);
            return;
        }
        if (!mp.game.streaming.hasAnimDictLoaded(pedData.animDict)) {
            mp.game.streaming.requestAnimDict(pedData.animDict);
            return;
        }
        clearInterval(loadTimer);
        playWelcomeLobbyAnim(bot, pedData.animDict, pedData.animName);

        const loopTimer = setInterval(() => {
            if (!welcomePedAlive(bot)) {
                clearInterval(loopTimer);
                return;
            }
            try {
                if (!bot.isPlayingAnim(pedData.animDict, pedData.animName, 3)) {
                    playWelcomeLobbyAnim(bot, pedData.animDict, pedData.animName);
                }
            } catch (_e3) {
                playWelcomeLobbyAnim(bot, pedData.animDict, pedData.animName);
            }
        }, 1000);
        welcomeLobbyAnimTimers.push(loopTimer);
    }, 200);
    welcomeLobbyAnimTimers.push(loadTimer);
}

function welcomeLobbyAliveCount() {
    let n = 0;
    for (let i = 0; i < welcomeLobbyPedList.length; i++) {
        if (welcomePedAlive(welcomeLobbyPedList[i])) n++;
    }
    return n;
}

function spawnWelcomeLobbyPeds() {
    if (global.__authUseVeprais === true) return;
    const lp = mp.players.local;
    if (!lp) return;
    const dimRaw = lp.dimension;
    const dim = typeof dimRaw === 'number' ? Math.floor(dimRaw) : NaN;

    if (!welcomeIsLobbyDimension(dim)) {
        destroyWelcomeLobbyPeds();
        return;
    }

    if (
        welcomeLobbySpawnedDim === dim &&
        welcomeLobbyAliveCount() === WELCOME_LOBBY_PEDS.length
    ) {
        return;
    }

    const token = ++welcomeLobbySpawnToken;
    destroyWelcomeLobbyPeds();
    welcomeLobbySpawnedDim = dim;

    WELCOME_LOBBY_PEDS.forEach((row) => {
        if (token !== welcomeLobbySpawnToken) return;
        createWelcomeLobbyPed(row, dim);
    });
}

function scheduleWelcomeLobbyPedSpawn() {
    if (global.__authUseVeprais === true) return;
    spawnWelcomeLobbyPeds();
    setTimeout(spawnWelcomeLobbyPeds, 400);
    setTimeout(spawnWelcomeLobbyPeds, 1200);
    setTimeout(spawnWelcomeLobbyPeds, 2500);
}

global.destroyWelcomeLobbyPeds = destroyWelcomeLobbyPeds;
global.spawnWelcomeLobbyPeds = spawnWelcomeLobbyPeds;

mp.events.add('WelcomeIntroShow', scheduleWelcomeLobbyPedSpawn);
mp.events.add('AuthShow', spawnWelcomeLobbyPeds);
mp.events.add('charCreator:finish', () => {
    setTimeout(spawnWelcomeLobbyPeds, 150);
});
mp.events.add('hideselect', destroyWelcomeLobbyPeds);

let welcomeLobbyDimSeen = NaN;
setInterval(() => {
    try {
        const lp = mp.players.local;
        if (!lp) return;
        const dRaw = lp.dimension;
        const d = typeof dRaw === 'number' ? Math.floor(dRaw) : NaN;
        if (d === welcomeLobbyDimSeen) return;
        welcomeLobbyDimSeen = d;
        if (!welcomeIsLobbyDimension(d)) {
            destroyWelcomeLobbyPeds();
            return;
        }
        scheduleWelcomeLobbyPedSpawn();
    } catch (_e) {}
}, 800);
