/**
 * Особняки семей: покупка (лидер, личные $), интерьер/гараж (dimension), семейные авто,
 * телепорт на войны (Аркадиус), синхронизация для клиента.
 */
const MANSION_PRICE = 12500000;
global.FAMILY_MANSION_PRICE = MANSION_PRICE;
/** Интерьер особняка: отдельный dimension на каждую семью (family_id). */
const DIM_INTERIOR_FAMILY_BASE = 952000;
const DIM_GARAGE_BASE = 8610;

/** Запасной спавн у Arcadius (улица). */
const ARCADIUS_FALLBACK_POS = new mp.Vector3(-119.90831756591797, -612.6090698242188, 35.280757904052734);

const MANSIONS = [
    {
        id: 1,
        name: 'Особняк 1',
        info: { x: -582.30859375, y: 501.9804382324219, z: 105.70633697509766, h: 19.288501739501953 },
        entry: { x: -580.4091186523438, y: 492.4953918457031, z: 108.90758514404297, h: -168.30410766601562 },
        garageExitWorld: { x: -575.8512573242188, y: 498.0325012207031, z: 106.28390502929688, h: 16.11962127685547 }
    },
    {
        id: 2,
        name: 'Особняк 2',
        info: { x: -358.838134765625, y: 512.0712280273438, z: 119.59171295166016, h: 128.03170776367188 },
        entry: { x: -349.6734313964844, y: 514.48876953125, z: 120.64421844482422, h: -46.63935852050781 },
        garageExitWorld: { x: -362.6584167480469, y: 514.3792114257812, z: 119.49205017089844, h: 133.3455047607422 }
    },
    {
        id: 3,
        name: 'Особняк 3',
        info: { x: -304.0026550292969, y: 385.0133361816406, z: 110.30699157714844, h: 29.675514221191406 },
        entry: { x: -298.14111328125, y: 380.59539794921875, z: 112.08951568603516, h: -158.30589294433594 },
        garageExitWorld: { x: -305.98760986328125, y: 381.8599548339844, z: 110.32056427001953, h: 13.839682579040527 }
    },
    {
        id: 4,
        name: 'Особняк 4',
        info: { x: -1067.10009765625, y: 434.9850769042969, z: 73.86373138427734, h: 80.48563385009766 },
        entry: { x: -1052.1641845703125, y: 431.77008056640625, z: 77.06375885009766, h: 4.8257269859313965 },
        garageExitWorld: { x: -1066.9464111328125, y: 438.5792236328125, z: 73.86311340332031, h: 99.12278747558594 }
    },
    {
        id: 5,
        name: 'Особняк 5',
        info: { x: -1123.2196044921875, y: 474.9895935058594, z: 82.16499328613281, h: -116.4195327758789 },
        entry: { x: -1122.8006591796875, y: 485.7011413574219, z: 82.16085052490234, h: -12.150529861450195 },
        garageExitWorld: { x: -1113.2137451171875, y: 479.2892150878906, z: 82.16081237792969, h: 170.57643127441406 }
    },
    {
        id: 6,
        name: 'Особняк 6',
        info: { x: -608.0416259765625, y: 519.77294921875, z: 107.27452850341797, h: 122.76521301269531 },
        entry: { x: -595.9595336914062, y: 529.4129028320312, z: 107.75602722167969, h: -46.91120910644531 },
        garageExitWorld: { x: -586.5869750976562, y: 528.693603515625, z: 107.81041717529297, h: -143.62814331054688 }
    },
    {
        id: 7,
        name: 'Особняк 7',
        info: { x: -621.4627685546875, y: 496.3157653808594, z: 107.57801818847656, h: 54.163963317871094 },
        entry: { x: -622.6990356445312, y: 489.4276123046875, z: 108.83218383789062, h: 179.4967803955078 },
        garageExitWorld: { x: -614.2653198242188, y: 493.852783203125, z: 108.09707641601562, h: 12.553389549255371 }
    },
    {
        id: 8,
        name: 'Особняк 8',
        info: { x: -1082.7020263671875, y: 433.4906921386719, z: 73.6487808227539, h: -95.53361511230469 },
        entry: { x: -1092.57568359375, y: 427.01910400390625, z: 75.6807632446289, h: 48.325286865234375 },
        garageExitWorld: { x: -1094.193115234375, y: 440.0242919921875, z: 75.28623962402344, h: -94.89281463623047 }
    },
    {
        id: 9,
        name: 'Особняк 9',
        info: { x: -1025.3714599609375, y: 498.7810363769531, z: 79.21095275878906, h: -65.4825439453125 },
        entry: { x: -1028.3265380859375, y: 516.5233764648438, z: 84.3809585571289, h: 105.69652557373047 },
        garageExitWorld: { x: -1044.0953369140625, y: 499.8235778808594, z: 84.07572937011719, h: -138.625 }
    },
    {
        id: 10,
        name: 'Особняк 10',
        info: { x: -979.107177734375, y: 507.7668151855469, z: 79.82669067382812, h: 153.07440185546875 },
        entry: { x: -968.25634765625, y: 509.2956237792969, z: 81.67138671875, h: -33.2565803527832 },
        garageExitWorld: { x: -979.6417846679688, y: 515.948974609375, z: 81.47136688232422, h: 144.11065673828125 }
    },
    {
        id: 11,
        name: 'Особняк 11',
        info: { x: -345.731689453125, y: 373.2847900390625, z: 109.97480010986328, h: 62.90401077270508 },
        entry: { x: -329.1776123046875, y: 370.3535461425781, z: 110.01727294921875, h: -117.63123321533203 },
        garageExitWorld: { x: -349.0720520019531, y: 368.13885498046875, z: 109.99837493896484, h: 27.187068939208984 }
    },
    {
        id: 12,
        name: 'Особняк 12',
        info: { x: -362.9975280761719, y: 362.08953857421875, z: 109.59324645996094, h: 158.8162841796875 },
        entry: { x: -371.3292541503906, y: 345.0207214355469, z: 110.04022979736328, h: 166.82778930664062 },
        garageExitWorld: { x: -380.3251953125, y: 348.0290832519531, z: 109.16461944580078, h: 3.674661636352539 }
    },
    {
        id: 13,
        name: 'Особняк 13',
        info: { x: -404.13128662109375, y: 348.9764404296875, z: 108.21487426757812, h: 129.23379516601562 },
        entry: { x: -408.60797119140625, y: 341.8921203613281, z: 108.9074478149414, h: 111.90351104736328 },
        garageExitWorld: { x: -400.38238525390625, y: 344.9871520996094, z: 108.7221450805664, h: -6.998290538787842 }
    },
    {
        id: 14,
        name: 'Особняк 14',
        info: { x: -323.5626220703125, y: 468.6138610839844, z: 109.18079376220703, h: 80.31552124023438 },
        entry: { x: -312.3284606933594, y: 474.61065673828125, z: 111.8178482055664, h: -52.68975830078125 },
        garageExitWorld: { x: -318.845947265625, y: 480.2877197265625, z: 112.46162414550781, h: 127.40509796142578 }
    },
    {
        id: 15,
        name: 'Особняк 15',
        info: { x: -317.7733154296875, y: 436.1032409667969, z: 108.91425323486328, h: 22.07636260986328 },
        entry: { x: -305.2979431152344, y: 432.4039306640625, z: 110.30926513671875, h: -169.27841186523438 },
        garageExitWorld: { x: -322.12603759765625, y: 433.880859375, z: 109.3934326171875, h: 25.54998779296875 }
    },
    {
        id: 16,
        name: 'Особняк 16',
        info: { x: -528.482421875, y: 438.21435546875, z: 97.51220703125, h: 118.42138671875 },
        entry: { x: -516.80810546875, y: 433.21533203125, z: 97.807861328125, h: -61.583984375 },
        garageExitWorld: { x: -511.1923828125, y: 439.8017578125, z: 97.90185546875, h: 134.267578125 }
    },
    {
        id: 17,
        name: 'Особняк 17',
        info: { x: -512.8134765625, y: 556.482421875, z: 120.1982421875, h: 102.3046875 },
        entry: { x: -497.5126953125, y: 550.81298828125, z: 120.89794921875, h: -78.92578125 },
        garageExitWorld: { x: -505.21875, y: 559.1259765625, z: 120.6845703125, h: 162.890625 }
    },
    {
        id: 18,
        name: 'Особняк 18',
        info: { x: -390.521484375, y: 552.791015625, z: 123.4013671875, h: 108.984375 },
        entry: { x: -375.81298828125, y: 546.521484375, z: 124.1484375, h: -72.421875 },
        garageExitWorld: { x: -382.43798828125, y: 555.18798828125, z: 123.9169921875, h: 152.34375 }
    },
    {
        id: 19,
        name: 'Особняк 19',
        info: { x: -532.541015625, y: 598.81298828125, z: 120.4013671875, h: 96.328125 },
        entry: { x: -517.81298828125, y: 592.521484375, z: 121.1259765625, h: -84.375 },
        garageExitWorld: { x: -524.6259765625, y: 600.18798828125, z: 120.9169921875, h: 156.09375 }
    },
    {
        id: 20,
        name: 'Особняк 20',
        info: { x: -1099.521484375, y: 483.18798828125, z: 77.1982421875, h: 88.59375 },
        entry: { x: -1085.18798828125, y: 477.81298828125, z: 77.81298828125, h: -91.40625 },
        garageExitWorld: { x: -1092.81298828125, y: 486.521484375, z: 77.5419921875, h: 171.5625 }
    }
];

const MAX_MANSION_ID = MANSIONS.reduce((max, m) => Math.max(max, m.id), 0);

const INTERIOR_SPAWN = { x: 556.7576293945312, y: 10.40213680267334, z: -48.99991989135742, h: -5.60581111907959 };
/** Меню выхода / гараж (интерьер особняка) — центр цилиндра «выход». */
const INTERIOR_HUB_MENU = {
    x: 556.7576293945312,
    y: 10.40213680267334,
    z: -48.99991989135742,
    h: -5.60581111907959
};
const INTERIOR_WAREHOUSE = { x: 543.9423217773438, y: 2.154895305633545, z: -48.99991989135742, h: -70.60841369628906 };
const INTERIOR_CAPT_TP = { x: 561.5744018554688, y: -2.2084014415740967, z: -48.999881744384766, h: 72.55606079101562 };

/** Склад семьи в офисе Arcadius (dim family_id+5). */
const OFFICE_WAREHOUSE = { x: -147.208251953125, y: -637.8573608398438, z: 168.82046508789062, h: 35.854312896728516 };
/** Телепорт на капт из офиса. */
const OFFICE_CAPT_TP = { x: -145.54095458984375, y: -643.2066040039062, z: 168.82046508789062, h: 100.50641632080078 };

const GARAGE_SLOTS = [
    { x: -82.36148834228516, y: -1986.9718017578125, z: 18.0169677734375, h: 171.79132080078125 },
    { x: -78.69720458984375, y: -1987.7354736328125, z: 18.0169677734375, h: 174.47311401367188 },
    { x: -75.20332336425781, y: -1988.2813720703125, z: 18.016963958740234, h: 175.76039123535156 },
    { x: -71.34452056884766, y: -1988.84326171875, z: 18.016963958740234, h: 166.47232055664062 },
    { x: -67.67578887939453, y: -1989.4227294921875, z: 18.016963958740234, h: 176.57339477539062 },
    { x: -63.666542053222656, y: -1989.5819091796875, z: 18.016963958740234, h: 167.03802490234375 },
    { x: -59.507598876953125, y: -1990.81982421875, z: 18.016963958740234, h: 158.779052734375 },
    { x: -85.91165924072266, y: -1986.323486328125, z: 18.01694107055664, h: 174.95530700683594 },
    { x: -89.62562561035156, y: -1985.614013671875, z: 18.01694107055664, h: 170.03866577148438 },
    { x: -93.14276123046875, y: -1984.8099365234375, z: 18.01694107055664, h: 170.17626953125 },
    { x: -97.07604217529297, y: -1984.3753662109375, z: 18.016948699951172, h: 169.87925720214844 },
    { x: -100.62242889404297, y: -1984.1409912109375, z: 18.016948699951172, h: 168.0440216064453 },
    { x: -104.3121566772461, y: -1984.137451171875, z: 18.016948699951172, h: 174.43829345703125 },
    { x: -108.05947875976562, y: -1983.262451171875, z: 18.016948699951172, h: 167.5937957763672 },
    { x: -111.6424560546875, y: -1982.4453125, z: 18.016948699951172, h: 166.4775848388672 },
    { x: -99.86609649658203, y: -2001.2652587890625, z: 18.016948699951172, h: 169.5352783203125 },
    { x: -96.12173461914062, y: -2001.569580078125, z: 18.016948699951172, h: 173.11776733398438 },
    { x: -92.64703369140625, y: -2002.394775390625, z: 18.016958236694336, h: 171.67013549804688 },
    { x: -88.66519927978516, y: -2002.5299072265625, z: 18.016958236694336, h: 171.40750122070312 },
    { x: -85.0936508178711, y: -2003.712890625, z: 18.016958236694336, h: 169.8180389404297 },
    { x: -81.32889556884766, y: -2004.0926513671875, z: 18.016958236694336, h: 172.22572326660156 },
    { x: -77.29135131835938, y: -2004.4063720703125, z: 18.016958236694336, h: 165.25369262695312 }
];

/** 10 пресетов [primary, secondary] — визуально как на машине (GTA color ID). */
const FLEET_COLOR_PRESETS = [
    [111, 111], // белый
    [12, 12], // чёрный
    [27, 27], // красный
    [64, 64], // синий
    [88, 88], // жёлтый
    [92, 92], // зелёный
    [38, 38], // оранжевый
    [4, 4], // серебро
    [13, 13], // серый
    [96, 96] // коричневый
];

function normalizeFleetColorPresetIdx(raw) {
    let n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > FLEET_COLOR_PRESETS.length - 1) n = n % FLEET_COLOR_PRESETS.length;
    return Math.max(0, Math.min(FLEET_COLOR_PRESETS.length - 1, n));
}

/** Максимум слотов семейного гаража (0-based индекс в GARAGE_SLOTS = slot - 1). */
const FAMILY_FLEET_MAX_SLOTS = 22;

/** Основной цвет — пресет слота (или общий, если слот не задан); доп. цвет — всегда из общего семейного пресета. */
function resolveFamilyFleetPaint(slotColorRaw, fleetDefaultCidx) {
    const g = normalizeFleetColorPresetIdx(fleetDefaultCidx);
    const globalPair = FLEET_COLOR_PRESETS[g] || [0, 0];
    let sc = slotColorRaw;
    if (sc == null || sc === '') sc = g;
    sc = normalizeFleetColorPresetIdx(sc);
    const slotPair = FLEET_COLOR_PRESETS[sc] || [0, 0];
    return [slotPair[0], globalPair[1]];
}

global._familyGarageSpawned = global._familyGarageSpawned || {};

function getMansionById(id) {
    return MANSIONS.find((m) => m.id === id) || null;
}

global.getMansionSpawnCoords = function getMansionSpawnCoords(mansionId) {
    const m = getMansionById(Number(mansionId));
    if (!m || !m.info) return null;
    return { x: m.info.x, y: m.info.y, z: m.info.z, h: m.info.h || 0 };
};

function getInteriorDimByFamilyId(familyId) {
    return DIM_INTERIOR_FAMILY_BASE + Math.max(0, Math.floor(Number(familyId) || 0));
}

global.getFamilyMansionInteriorDim = getInteriorDimByFamilyId;
global.FAMILY_MANSION_INTERIOR_WAREHOUSE = INTERIOR_WAREHOUSE;
global.FAMILY_OFFICE_INTERIOR_WAREHOUSE = OFFICE_WAREHOUSE;
global.FAMILY_OFFICE_INTERIOR_CAPT_TP = OFFICE_CAPT_TP;
global.FAMILY_MANSION_INTERIOR_CAPT_TP = INTERIOR_CAPT_TP;

function findActiveCaptBattlePointIdForPlayerFamily(player) {
    const pf = String((player && player.family) || '').trim();
    if (!pf || !global.activeBattles) return null;
    for (const [bid, battle] of Object.entries(global.activeBattles)) {
        if (!battle) continue;
        const atk = String(battle.attackerFamily || '').trim();
        const def = String(battle.defenderFamily || '').trim();
        if (atk === pf || def === pf) {
            const n = parseInt(String(bid), 10);
            return Number.isFinite(n) ? n : null;
        }
    }
    return null;
}

function playerNearInteriorCaptTp(player) {
    if (!mp.players.exists(player)) return false;
    const fid = Number(player.familyID);
    if (!fid) return false;
    const p = player.position;
    const intDim = getInteriorDimByFamilyId(fid);
    if (player.dimension === intDim) {
        const t = INTERIOR_CAPT_TP;
        return Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) <= 4.6;
    }
    if (player.dimension === fid + 5) {
        const t = OFFICE_CAPT_TP;
        return Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) <= 4.6;
    }
    return false;
}
global.playerNearInteriorCaptTp = playerNearInteriorCaptTp;

function getGarageDim(mansionId) {
    return DIM_GARAGE_BASE + mansionId;
}

const FAMILY_NO_MANSION_GARAGE_MSG = 'У семьи нет особняка — семейный гараж недоступен.';

function queryFamilyMansionId(familyId, cb) {
    const fid = Math.floor(Number(familyId) || 0);
    if (!fid || typeof cb !== 'function') return cb ? cb(null) : null;
    global.DB.query(
        'SELECT mansion_id FROM family_mansion_ownership WHERE family_id = ? LIMIT 1',
        [fid],
        (err, rows) => {
            if (err || !rows || !rows.length) return cb(null);
            const mid = Number(rows[0].mansion_id);
            cb(Number.isFinite(mid) && mid > 0 ? mid : null);
        }
    );
}

/** Колбэк с mansion_id или null; при null — уведомление игроку. */
function withFamilyMansion(familyId, player, cb) {
    queryFamilyMansionId(familyId, (mid) => {
        if (!mid) {
            if (player && mp.players.exists(player)) {
                notify(player, 2, 'top-mid', FAMILY_NO_MANSION_GARAGE_MSG, 3500);
            }
            return cb(null);
        }
        cb(mid);
    });
}

function isLeader(player) {
    try {
        return mp.players.exists(player) && Number(player.famRank) === 10;
    } catch (_e) {
        return false;
    }
}

function notify(player, type, place, msg, ms) {
    try {
        if (typeof isNotify === 'function') isNotify(player, type, place, msg, ms);
    } catch (_e) {}
}

/** door_open: 1 = открыт (зайти может любой), 0 = закрыт (только семья-владелец). */
let mansionDoorSchemaReady = false;
let mansionDoorSchemaRunning = false;
let mansionDoorSchemaWaiters = [];

function ensureMansionDoorOpenColumn(cb) {
    if (mansionDoorSchemaReady) {
        if (cb) setImmediate(cb);
        return;
    }
    if (cb) mansionDoorSchemaWaiters.push(cb);
    if (mansionDoorSchemaRunning) return;
    mansionDoorSchemaRunning = true;
    const finish = (ready) => {
        mansionDoorSchemaReady = ready;
        mansionDoorSchemaRunning = false;
        const waiters = mansionDoorSchemaWaiters.splice(0);
        waiters.forEach((fn) => {
            try { fn(); } catch (_e) {}
        });
    };
    if (!global.DB) {
        finish(false);
        return;
    }
    global.DB.query(
        `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'family_mansion_ownership' AND COLUMN_NAME = 'door_open'`,
        [],
        (err, rows) => {
            if (err || !rows || !rows[0]) {
                finish(false);
                return;
            }
            if (Number(rows[0].c) > 0) {
                finish(true);
                return;
            }
            global.DB.query(
                'ALTER TABLE family_mansion_ownership ADD COLUMN door_open TINYINT(1) NOT NULL DEFAULT 0',
                [],
                (e2) => {
                    if (e2) console.log('[family_mansion] ensure door_open:', e2.message || e2);
                    finish(!e2 || Number(e2.errno) === 1060);
                }
            );
        }
    );
}

function sendDiscordMansion(body) {
    try {
        if (typeof global.sendDiscordLog === 'function') {
            global.sendDiscordLog(body, '1266445805355532368');
        }
    } catch (_e) {}
}

/** Записи владения без живой семьи в `families` — для клиента «гос», но INSERT покупки падал по PK; чистим перед выборками. */
function pruneOrphanMansionOwnership(callback) {
    try {
        if (!global.DB || !global.DB_READY) {
            if (typeof callback === 'function') callback();
            return;
        }
        global.DB.query(
            'DELETE mo FROM family_mansion_ownership mo LEFT JOIN families f ON f.id = mo.family_id WHERE f.id IS NULL',
            [],
            () => {
                if (typeof callback === 'function') callback();
            }
        );
    } catch (_e) {
        if (typeof callback === 'function') callback();
    }
}

function loadMansionState(callback) {
    if (!global.DB || !global.DB_READY) {
        return callback(null, []);
    }
    ensureMansionDoorOpenColumn(() => {
        pruneOrphanMansionOwnership(() => {
            global.DB.query(
                `SELECT mo.mansion_id, mo.family_id, mo.door_open, f.name AS family_name
                 FROM family_mansion_ownership mo
                 INNER JOIN families f ON f.id = mo.family_id`,
                [],
                (err, rows) => {
                    if (err) {
                        return global.DB.query(
                            `SELECT mo.mansion_id, mo.family_id, f.name AS family_name
                             FROM family_mansion_ownership mo
                             INNER JOIN families f ON f.id = mo.family_id`,
                            [],
                            (err2, rows2) => {
                                if (err2) {
                                    console.log('[family_mansion] load:', err2.message || err2);
                                    return callback(null, []);
                                }
                                const mapped = (rows2 || []).map((r) => Object.assign({}, r, { door_open: 0 }));
                                callback(null, mapped);
                            }
                        );
                    }
                    callback(null, rows || []);
                }
            );
        });
    });
}

function fetchMansionTabletListingIds(cb) {
    cb(new Set());
}

function buildMansionClientSyncList(owners, listingIds) {
    const ids = listingIds instanceof Set ? listingIds : new Set();
    return MANSIONS.map((m) => {
        const row = (owners || []).find((r) => Number(r.mansion_id) === m.id);
        return {
            id: m.id,
            name: m.name,
            price: MANSION_PRICE,
            ownerFamilyName: row && row.family_name ? String(row.family_name) : null,
            doorOpen: !!(row && Number(row.door_open) === 1),
            listedOnMarket: ids.has(m.id)
        };
    });
}

function broadcastMansionSync() {
    loadMansionState((e, owners) => {
        fetchMansionTabletListingIds((listingIds) => {
            const list = buildMansionClientSyncList(owners, listingIds);
            mp.players.forEach((p) => {
                if (mp.players.exists(p) && p.getVariable('auth')) {
                    p.call('familyMansion:sync:c', [JSON.stringify(list)]);
                }
            });
        });
    });
}

global.broadcastMansionSyncAllPlayers = broadcastMansionSync;

function getFamilyIdByName(familyName, cb) {
    const n = String(familyName || '').trim();
    if (!n) return cb(new Error('no family'));
    global.DB.query('SELECT id FROM families WHERE name = ? LIMIT 1', [n], (err, rows) => {
        if (err || !rows || !rows[0]) return cb(err || new Error('not found'));
        cb(null, Number(rows[0].id));
    });
}

function ensureFleetColumns(cb) {
    const alters = [
        "ALTER TABLE families ADD COLUMN fleet_plate VARCHAR(12) NOT NULL DEFAULT 'FAMILY'",
        'ALTER TABLE families ADD COLUMN fleet_color_idx SMALLINT UNSIGNED NOT NULL DEFAULT 0'
    ];
    let i = 0;
    function next() {
        if (i >= alters.length) return ensureFamilyVehicleSlotColumns(cb);
        global.DB.query(alters[i], [], () => {
            i++;
            next();
        });
    }
    next();
}

function ensureFamilyVehicleSlotColumns(cb) {
    const alters = [
        'ALTER TABLE family_vehicles ADD COLUMN slot_color_idx SMALLINT UNSIGNED NULL',
        "ALTER TABLE family_vehicles ADD COLUMN drive_ranks VARCHAR(128) NOT NULL DEFAULT '[1,2,3,4,5,6,7,8,9,10]'",
        "ALTER TABLE family_vehicles ADD COLUMN evac_ranks VARCHAR(128) NOT NULL DEFAULT '[1,2,3,4,5,6,7,8,9,10]'",
        "ALTER TABLE family_vehicles ADD COLUMN summon_ranks VARCHAR(128) NOT NULL DEFAULT '[1,2,3,4,5,6,7,8,9,10]'"
    ];
    let j = 0;
    function nextV() {
        if (j >= alters.length) return cb();
        global.DB.query(alters[j], [], () => {
            j++;
            nextV();
        });
    }
    nextV();
}

function parseDriveRanksJson(raw) {
    if (raw == null || raw === '') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    try {
        const a = JSON.parse(String(raw));
        if (Array.isArray(a) && a.length) return a.map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= 10);
    } catch (_e) {}
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

function playerCanDriveFamilyVehicle(player, driveRanksRaw) {
    const allowed = parseDriveRanksJson(driveRanksRaw);
    let ids =
        typeof global.getPlayerFamilyRankIds === 'function' ? global.getPlayerFamilyRankIds(player) : [Number(player.famRank)];
    if (!Array.isArray(ids) || ids.length === 0) {
        const fr = Number(player.famRank);
        if (Number.isFinite(fr) && fr >= 1 && fr <= 10) ids = [fr];
        else ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
    return allowed.some((r) => ids.indexOf(r) !== -1);
}

/** На клиенте entity.remoteId совпадает с сетевым id на сервере — это в первую очередь veh.id, не remoteId. */
function vehicleNetworkIdForClient(veh) {
    if (!veh || !mp.vehicles.exists(veh)) return -1;
    if (typeof veh.id === 'number') return veh.id;
    if (typeof veh.remoteId === 'number') return veh.remoteId;
    return -1;
}

function vehicleMatchesClientNetId(veh, clientRid) {
    if (!veh || !mp.vehicles.exists(veh)) return false;
    const rid = parseInt(String(clientRid), 10);
    if (!Number.isFinite(rid) || rid < 0) return false;
    if (typeof veh.id === 'number' && veh.id === rid) return true;
    if (typeof veh.remoteId === 'number' && veh.remoteId === rid) return true;
    return false;
}

function vehicleMatchesAnyClientNetId(veh, rawA, rawB) {
    if (vehicleMatchesClientNetId(veh, rawA)) return true;
    if (rawB !== undefined && rawB !== null && String(rawB) !== String(rawA)) {
        if (vehicleMatchesClientNetId(veh, rawB)) return true;
    }
    return false;
}

/** Водитель: место водителя 0 или -1 в разных сборках RAGE. */
function vehicleHasDriverPlayer(veh, player) {
    if (!veh || !mp.vehicles.exists(veh) || !mp.players.exists(player)) return false;
    try {
        if (veh.getOccupant(0) === player || veh.getOccupant(-1) === player) return true;
    } catch (_e) {}
    try {
        if (player.vehicle === veh && (player.seat === 0 || player.seat === -1)) return true;
    } catch (_e4) {}
    return false;
}

/** В момент callRemote сервер часто ещё не видит player.vehicle — подбираем по id с клиента (remoteId + запасной id) или по семейному ТС в том же измерении. */
function resolveGarageExitVehicle(player, clientRemoteIdRaw, clientAltIdRaw) {
    if (!mp.players.exists(player)) return null;
    let veh = player.vehicle;
    if (veh && mp.vehicles.exists(veh)) return veh;
    const tryIds = [];
    const a = parseInt(String(clientRemoteIdRaw), 10);
    const b = parseInt(String(clientAltIdRaw), 10);
    if (Number.isFinite(a) && a >= 0) tryIds.push(a);
    if (Number.isFinite(b) && b >= 0 && tryIds.indexOf(b) === -1) tryIds.push(b);
    for (let i = 0; i < tryIds.length; i++) {
        const rid = tryIds[i];
        try {
            const at = mp.vehicles.at(rid);
            if (at && mp.vehicles.exists(at) && Number(at.dimension) === Number(player.dimension)) return at;
        } catch (_eAt) {}
    }
    let byRid = null;
    try {
        mp.vehicles.forEach((v) => {
            if (byRid || !v || !mp.vehicles.exists(v)) return;
            if (Number(v.dimension) !== Number(player.dimension)) return;
            if (vehicleMatchesAnyClientNetId(v, clientRemoteIdRaw, clientAltIdRaw)) byRid = v;
        });
    } catch (_e) {}
    if (byRid && mp.vehicles.exists(byRid)) return byRid;
    let famDrv = null;
    try {
        mp.vehicles.forEach((v) => {
            if (famDrv || !v || !mp.vehicles.exists(v)) return;
            if (Number(v.dimension) !== Number(player.dimension)) return;
            try {
                if (v.getVariable('familyGarage') !== true && v.getVariable('familyGarage') !== 1) return;
                if (vehicleHasDriverPlayer(v, player)) famDrv = v;
            } catch (_e2) {}
        });
    } catch (_e3) {}
    return famDrv && mp.vehicles.exists(famDrv) ? famDrv : null;
}

function isPlayerGarageVehicleDriver(player, veh, clientRemoteIdRaw, clientAltIdRaw) {
    if (!mp.players.exists(player) || !veh || !mp.vehicles.exists(veh)) return false;
    if (vehicleHasDriverPlayer(veh, player)) return true;
    if (vehicleMatchesAnyClientNetId(veh, clientRemoteIdRaw, clientAltIdRaw)) return true;
    return false;
}

global.playerCanDriveFamilyVehicle = playerCanDriveFamilyVehicle;

function hasFamilyFleetEvacPermission(rankSystem, player) {
    if (!rankSystem || !player) return false;
    const ids = typeof global.getPlayerFamilyRankIds === 'function' ? global.getPlayerFamilyRankIds(player) : [];
    if (!Array.isArray(ids) || ids.length === 0) {
        const fr = Number(player.famRank);
        if (Number.isFinite(fr) && fr >= 1 && fr <= 10) {
            if (fr === 10) return true;
            const row = rankSystem[fr];
            return !!(row && Number(row.fleetEvac) === 1);
        }
        return false;
    }
    if (ids.indexOf(10) !== -1) return true;
    for (let i = 0; i < ids.length; i++) {
        const row = rankSystem[ids[i]];
        if (row && Number(row.fleetEvac) === 1) return true;
    }
    return false;
}

function hasFamilyFleetSummonPermission(rankSystem, player) {
    if (!rankSystem || !player) return false;
    const ids = typeof global.getPlayerFamilyRankIds === 'function' ? global.getPlayerFamilyRankIds(player) : [];
    if (!Array.isArray(ids) || ids.length === 0) {
        const fr = Number(player.famRank);
        if (Number.isFinite(fr) && fr >= 1 && fr <= 10) {
            if (fr === 10) return true;
            const row = rankSystem[fr];
            return !!(row && Number(row.fleetSummon) === 1);
        }
        return false;
    }
    if (ids.indexOf(10) !== -1) return true;
    for (let i = 0; i < ids.length; i++) {
        const row = rankSystem[ids[i]];
        if (row && Number(row.fleetSummon) === 1) return true;
    }
    return false;
}

/** Живая семейная ТС этого слота в мире (dim 0). */
function findWorldFamilyFleetVehicle(familyId, slotNum) {
    const fid = Math.max(0, Math.floor(Number(familyId) || 0));
    const slot = Math.max(1, Math.min(FAMILY_FLEET_MAX_SLOTS, Math.floor(Number(slotNum) || 0)));
    if (!fid || !slot) return null;
    let found = null;
    try {
        mp.vehicles.forEach((v) => {
            if (found || !v || !mp.vehicles.exists(v)) return;
            if (Number(v.dimension) !== 0) return;
            if (v.getVariable('familyGarage') !== true && v.getVariable('familyGarage') !== 1) return;
            if (Number(v.getVariable('familyId')) !== fid) return;
            if (Number(v.getVariable('familyVehSlot')) !== slot) return;
            found = v;
        });
    } catch (_e) {}
    return found && mp.vehicles.exists(found) ? found : null;
}

/** Семейная ТС слота в семейном гараже (dimension гаража особняка). */
function findGarageFamilyFleetVehicle(familyId, mansionId, slotNum) {
    const mid = Math.max(1, Math.min(MAX_MANSION_ID, Math.floor(Number(mansionId) || 0)));
    const fid = Math.max(0, Math.floor(Number(familyId) || 0));
    const slot = Math.max(1, Math.min(FAMILY_FLEET_MAX_SLOTS, Math.floor(Number(slotNum) || 0)));
    if (!fid || !slot || !mid) return null;
    const gdim = getGarageDim(mid);
    let found = null;
    try {
        mp.vehicles.forEach((v) => {
            if (found || !v || !mp.vehicles.exists(v)) return;
            if (Number(v.dimension) !== gdim) return;
            if (v.getVariable('familyGarage') !== true && v.getVariable('familyGarage') !== 1) return;
            if (Number(v.getVariable('familyId')) !== fid) return;
            if (Number(v.getVariable('familyVehSlot')) !== slot) return;
            found = v;
        });
    } catch (_e) {}
    return found && mp.vehicles.exists(found) ? found : null;
}

function applySummonVehicleBesidePlayer(player, veh) {
    if (!mp.players.exists(player) || !veh || !mp.vehicles.exists(veh)) return;
    const p = player.position;
    const rad = (Number(player.heading) * Math.PI) / 180;
    const ox = -Math.sin(rad) * 4.2;
    const oy = Math.cos(rad) * 4.2;
    try {
        veh.dimension = player.dimension;
        veh.position = new mp.Vector3(p.x + ox, p.y + oy, p.z + 0.35);
        veh.heading = player.heading;
    } catch (_e) {}
}

function createFamilyFleetVehicleAtPlayer(player, familyId, slotNum, row, plate, fleetDefaultCidx) {
    const model = String(row.model || '').trim();
    if (!model || !mp.players.exists(player)) return null;
    const colors = resolveFamilyFleetPaint(row.slot_color_idx, fleetDefaultCidx);
    const dr = row.drive_ranks != null ? String(row.drive_ranks) : '';
    const p = player.position;
    const rad = (Number(player.heading) * Math.PI) / 180;
    const ox = -Math.sin(rad) * 4.2;
    const oy = Math.cos(rad) * 4.2;
    const pos = new mp.Vector3(p.x + ox, p.y + oy, p.z + 0.35);
    let veh = null;
    try {
        veh = mp.vehicles.new(mp.joaat(model), pos, {
            heading: player.heading,
            numberPlate: String(global.flowVehiclePlate()).slice(0, 8),
            locked: false,
            engine: false,
            dimension: player.dimension
        });
    } catch (_eN) {}
    if (!veh || !mp.vehicles.exists(veh)) return null;
    try {
        veh.setColor(colors[0], colors[1]);
    } catch (_eC) {}
    try {
        veh.setVariable('familyGarage', true);
        veh.setVariable('familyId', familyId);
        veh.setVariable('familyVehSlot', slotNum);
        veh.setVariable('familyDriveRanks', dr);
    } catch (_eV) {}
    return veh;
}

mp.events.add('familyMansion:sync:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        loadMansionState((e, owners) => {
            if (!mp.players.exists(player) || !player.getVariable('auth')) return;
            fetchMansionTabletListingIds((listingIds) => {
                if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                const list = buildMansionClientSyncList(owners, listingIds);
                player.call('familyMansion:sync:c', [JSON.stringify(list)]);
            });
        });
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('familyMansion:purchase:s', (player, mansionIdRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        if (!isLeader(player)) return notify(player, 2, 'top-mid', 'Только лидер семьи может купить особняк.', 4000);

        const mansionId = parseInt(String(mansionIdRaw), 10);
        const m = getMansionById(mansionId);
        if (!m) return notify(player, 2, 'top-mid', 'Некорректный особняк.', 3000);

        if (new Date().getTime() - (player.clicked || 0) < 1500) return notify(player, 2, 'top-mid', 'Не так часто.', 1500);
        player.clicked = new Date().getTime();

        pruneOrphanMansionOwnership(() => {
                getFamilyIdByName(player.family, (e1, familyId) => {
                if (e1 || !familyId) return notify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);

                global.DB.query('SELECT mansion_id FROM family_mansion_ownership WHERE family_id = ?', [familyId], (e2, famOwn) => {
                    if (e2) return notify(player, 2, 'top-mid', 'Ошибка БД.', 3000);
                    if (famOwn && famOwn.length) return notify(player, 2, 'top-mid', 'У вашей семьи уже есть особняк.', 4000);

                    global.DB.query(
                        `SELECT mo.family_id FROM family_mansion_ownership mo
                         INNER JOIN families f ON f.id = mo.family_id
                         WHERE mo.mansion_id = ?`,
                        [mansionId],
                        (e3, occ) => {
                            if (e3) return notify(player, 2, 'top-mid', 'Ошибка БД.', 3000);
                            if (occ && occ.length) return notify(player, 2, 'top-mid', 'Этот особняк уже куплен.', 4000);

                            const money = Number(player.money);
                            if (!Number.isFinite(money) || money < MANSION_PRICE) {
                                return notify(player, 2, 'top-mid', 'Недостаточно средств на личном счёте лидера.', 4000);
                            }

                            const newMoney = money - MANSION_PRICE;
                            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], (e4) => {
                                if (e4) return notify(player, 2, 'top-mid', 'Ошибка списания.', 3000);
                                player.money = newMoney;
                                player.call('updateMoney', [global.formatnum1(newMoney)]);

                                global.DB.query(
                                    'INSERT INTO family_mansion_ownership (mansion_id, family_id) VALUES (?, ?)',
                                    [mansionId, familyId],
                                    (e5) => {
                                        if (e5) {
                                            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [money, player.static]);
                                            player.money = money;
                                            player.call('updateMoney', [global.formatnum1(money)]);
                                            return notify(player, 2, 'top-mid', 'Не удалось оформить покупку.', 4000);
                                        }
                                        notify(player, 3, 'top-mid', `Семья купила «${m.name}».`, 5000);
                                        if (typeof global.tryCompleteNewbieQuest === 'function') {
                                            global.tryCompleteNewbieQuest(player, 'buy_mansion');
                                        }
                                        sendDiscordMansion(
                                            `Покупка особняка\n\nЛидер: ${player.login} (#${player.static})\nСемья: ${player.family}\nОсобняк #${mansionId} (${m.name})\nЦена: ${MANSION_PRICE}`
                                        );
                                        broadcastMansionSync();
                                    }
                                );
                            });
                        });
                });
            });
        });
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('familyMansion:enterInterior:s', (player, mansionIdRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const mansionId = parseInt(String(mansionIdRaw), 10);
        const m = getMansionById(mansionId);
        if (!m) return;

        const tryEnter = () => {
            global.DB.query(
                `SELECT mo.family_id, mo.door_open, f.name AS family_name
                 FROM family_mansion_ownership mo
                 INNER JOIN families f ON f.id = mo.family_id
                 WHERE mo.mansion_id = ?
                 LIMIT 1`,
                [mansionId],
                (e2, rows) => {
                    if (e2 || !rows || !rows.length) {
                        return notify(player, 2, 'top-mid', 'Этот особняк никому не принадлежит.', 4000);
                    }
                    const ownerFid = parseInt(rows[0].family_id, 10);
                    const doorOpen = Number(rows[0].door_open) === 1;
                    const ownerName = String(rows[0].family_name || '').trim();
                    const myFam = player.family != null ? String(player.family).trim() : '';
                    const isMember = !!(myFam && ownerName && myFam === ownerName);

                    if (!isMember && !doorOpen) {
                        return notify(player, 2, 'top-mid', 'Особняк закрыт. Войти могут только участники семьи.', 4000);
                    }
                    if (!ownerFid) {
                        return notify(player, 2, 'top-mid', 'Ошибка семьи-владельца.', 3000);
                    }

                    const dim = getInteriorDimByFamilyId(ownerFid);
                    player.dimension = dim;
                    player.position = new mp.Vector3(INTERIOR_SPAWN.x, INTERIOR_SPAWN.y, INTERIOR_SPAWN.z);
                    player.heading = INTERIOR_SPAWN.h;
                    player._familyMansionId = mansionId;
                    notify(player, 3, 'top-mid', 'Добро пожаловать в особняк.', 2500);
                }
            );
        };
        ensureMansionDoorOpenColumn(tryEnter);
    } catch (err) {
        console.log(err);
    }
});

/** Лидер: открыть/закрыть дверь особняка (открыт — зайти может любой). */
mp.events.add('familyMansion:door:toggle:s', (player, openRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!isLeader(player)) {
            return notify(player, 2, 'top-mid', 'Только лидер может открывать и закрывать особняк.', 3500);
        }
        const fam = player.family != null ? String(player.family).trim() : '';
        if (!fam) return;
        const open = openRaw === true || openRaw === 1 || openRaw === '1' || String(openRaw).toLowerCase() === 'true';

        getFamilyIdByName(fam, (e1, familyId) => {
            if (e1 || !familyId) return notify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
            ensureMansionDoorOpenColumn(() => {
                global.DB.query(
                    'UPDATE family_mansion_ownership SET door_open = ? WHERE family_id = ?',
                    [open ? 1 : 0, familyId],
                    (e2, res) => {
                        if (e2) {
                            console.log('[family_mansion] door:toggle:', e2.message || e2);
                            return notify(player, 2, 'top-mid', 'Ошибка базы данных.', 3000);
                        }
                        if (!res || res.affectedRows === 0) {
                            return notify(player, 2, 'top-mid', 'У семьи нет особняка.', 3500);
                        }
                        if (typeof global.logFamilyAction === 'function') {
                            global.logFamilyAction(fam, player, 'mansion_door', open ? 'Особняк открыт' : 'Особняк закрыт');
                        }
                        notify(player, 3, 'top-mid', open ? 'Особняк открыт — войти может любой.' : 'Особняк закрыт — только участники семьи.', 3500);
                        try {
                            player.call('familyMansion:door:toggle:c', [open ? 1 : 0]);
                        } catch (_e) {}
                        broadcastMansionSync();
                    }
                );
            });
        });
    } catch (err) {
        console.log('[family_mansion] door:toggle:', err);
    }
});

mp.events.add('familyMansion:exitInterior:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const mid = player._familyMansionId;
        if (!mid) return;
        const m = getMansionById(mid);
        if (!m) return;
        player.dimension = 0;
        player.position = new mp.Vector3(m.entry.x, m.entry.y, m.entry.z);
        player.heading = m.entry.h;
        delete player._familyMansionId;
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('familyMansion:enterGarage:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;

        const fidEarly = Number(player.familyID);
        if (fidEarly && player.dimension === fidEarly + 5) {
            return notify(player, 2, 'top-mid', 'Семейный гараж доступен только при особняке.', 3500);
        }

        getFamilyIdByName(player.family, (e1, familyId) => {
            if (e1 || !familyId) return;
            const spawn = (mid) => {
                global.DB.query(
                    'SELECT mansion_id FROM family_mansion_ownership WHERE mansion_id = ? AND family_id = ?',
                    [mid, familyId],
                    (e2, rows) => {
                        if (e2 || !rows || !rows.length) return notify(player, 2, 'top-mid', 'Нет доступа.', 3000);
                        const gdim = getGarageDim(mid);
                        const fid = Number(player.familyID);
                        let retHub = 'world';
                        if (fid && player.dimension === getInteriorDimByFamilyId(familyId)) retHub = 'mansion';
                        player._familyGarageReturnHub = retHub;
                        player._familyMansionId = mid;
                        player.dimension = gdim;
                        player.position = new mp.Vector3(GARAGE_SLOTS[0].x, GARAGE_SLOTS[0].y, GARAGE_SLOTS[0].z);
                        player.heading = GARAGE_SLOTS[0].h;
                        spawnFamilyGarageVehicles(player, mid, familyId, gdim);
                    }
                );
            };

            const cachedMid = player._familyMansionId;
            if (cachedMid) return spawn(cachedMid);

            withFamilyMansion(familyId, player, (mid) => {
                if (!mid) return;
                spawn(mid);
            });
        });
    } catch (err) {
        console.log(err);
    }
});

function destroyGarageVehicles(dimKey, excludeVeh) {
    const arr = global._familyGarageSpawned[dimKey];
    if (!Array.isArray(arr)) return;
    arr.forEach((veh) => {
        if (excludeVeh && veh === excludeVeh) return;
        try {
            if (veh && mp.vehicles.exists(veh)) veh.destroy();
        } catch (_e) {}
    });
    delete global._familyGarageSpawned[dimKey];
}

function spawnFamilyGarageVehicles(player, mansionId, familyId, gdim) {
    const dimKey = `${gdim}_${familyId}`;
    destroyGarageVehicles(dimKey);

    global.DB.query(
        'SELECT fleet_plate, fleet_color_idx FROM families WHERE id = ? LIMIT 1',
        [familyId],
        (e0, famRow) => {
            let plate = global.flowVehiclePlate();
            let cidx = 0;
            if (!e0 && famRow && famRow[0]) {
                plate = String(famRow[0].fleet_plate || global.flowVehiclePlate()).slice(0, 8);
                cidx = normalizeFleetColorPresetIdx(famRow[0].fleet_color_idx);
            }
            ensureFamilyVehicleSlotColumns(() => {
            global.DB.query(
                'SELECT slot, model, slot_color_idx, drive_ranks FROM family_vehicles WHERE family_id = ? ORDER BY slot ASC',
                [familyId],
                (err, rows) => {
                    if (err || !rows) rows = [];
                    const spawned = [];
                    rows.forEach((row) => {
                        const slotNum = Math.max(1, Math.min(FAMILY_FLEET_MAX_SLOTS, Number(row.slot)));
                        if (findWorldFamilyFleetVehicle(familyId, slotNum)) return;
                        const slot = slotNum - 1;
                        const pos = GARAGE_SLOTS[slot] || GARAGE_SLOTS[0];
                        const model = String(row.model || '').trim();
                        if (!model) return;
                        const colors = resolveFamilyFleetPaint(row.slot_color_idx, cidx);
                        const dr = row.drive_ranks != null ? String(row.drive_ranks) : '';
                        try {
                            const veh = mp.vehicles.new(mp.joaat(model), new mp.Vector3(pos.x, pos.y, pos.z), {
                                heading: pos.h,
                                numberPlate: global.flowVehiclePlate(),
                                locked: false,
                                engine: false,
                                dimension: gdim
                            });
                            if (veh && mp.vehicles.exists(veh)) {
                                veh.setColor(colors[0], colors[1]);
                                veh.setVariable('familyGarage', true);
                                veh.setVariable('familyId', familyId);
                                veh.setVariable('familyVehSlot', slotNum);
                                veh.setVariable('familyDriveRanks', dr);
                                spawned.push(veh);
                            }
                        } catch (_e2) {}
                    });
                    global._familyGarageSpawned[dimKey] = spawned;
                }
            );
            });
        }
    );
}

mp.events.add('familyMansion:garageExitWorld:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const gdim = Number(player.dimension);
        if (!Number.isFinite(gdim) || gdim < DIM_GARAGE_BASE + 1 || gdim > DIM_GARAGE_BASE + MAX_MANSION_ID) return;
        const mid = Math.floor(gdim) - DIM_GARAGE_BASE;
        const m = getMansionById(mid);
        const fid = Number(player.familyID);
        const retHub = player._familyGarageReturnHub || 'world';
        delete player._familyGarageReturnHub;
        const fidNum = Number(player.familyID);
        if (Number.isFinite(fidNum) && fidNum > 0) {
            destroyGarageVehicles(`${gdim}_${fidNum}`);
        } else {
            getFamilyIdByName(player.family, (e1, familyId) => {
                if (familyId) destroyGarageVehicles(`${gdim}_${familyId}`);
            });
        }
        try {
            player.removeFromVehicle();
        } catch (_e) {}
        if (retHub === 'mansion' && fid) {
            const intDim = getInteriorDimByFamilyId(fid);
            player.dimension = intDim;
            player.position = new mp.Vector3(INTERIOR_HUB_MENU.x, INTERIOR_HUB_MENU.y, INTERIOR_HUB_MENU.z);
            player.heading = INTERIOR_HUB_MENU.h;
        } else {
            player.dimension = 0;
            if (m) {
                player.position = new mp.Vector3(m.entry.x, m.entry.y, m.entry.z);
                player.heading = m.entry.h;
            }
            delete player._familyMansionId;
            try {
                player.setVariable('office_fam', false);
            } catch (_e2) {}
        }
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('familyMansion:garageEngineExit:s', (player, clientVehRemoteIdRaw, clientVehAltIdRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const dim = Number(player.dimension);
        if (!Number.isFinite(dim) || dim < DIM_GARAGE_BASE + 1 || dim > DIM_GARAGE_BASE + MAX_MANSION_ID) return;
        const veh = resolveGarageExitVehicle(player, clientVehRemoteIdRaw, clientVehAltIdRaw);
        if (!veh || !mp.vehicles.exists(veh)) {
            return notify(player, 2, 'top-mid', 'Не удалось определить машину для выезда (встань в водителя и повтори).', 4000);
        }
        if (!isPlayerGarageVehicleDriver(player, veh, clientVehRemoteIdRaw, clientVehAltIdRaw)) {
            return notify(player, 2, 'top-mid', 'Выезд только с места водителя.', 3500);
        }

        const mid = Math.floor(dim) - DIM_GARAGE_BASE;
        const m = getMansionById(mid);
        if (!m) {
            return notify(player, 2, 'top-mid', 'Ошибка настроек гаража (особняк). Сообщи администрации.', 4000);
        }

        const dr = veh.getVariable('familyDriveRanks');
        if (!playerCanDriveFamilyVehicle(player, dr)) {
            try {
                veh.setEngineOn(false, true, true);
            } catch (_e0) {}
            return notify(player, 2, 'top-mid', 'Ваш ранг не позволяет заводить эту машину.', 4000);
        }

        if (player._famGarEngineExitBusy) {
            return notify(player, 2, 'top-mid', 'Подожди секунду и снова нажми E (выезд из гаража).', 2200);
        }
        player._famGarEngineExitBusy = true;
        setTimeout(() => {
            try {
                delete player._famGarEngineExitBusy;
            } catch (_eB) {}
        }, 2500);

        const fid = Number(player.familyID);
        /** Точка выезда на улицу по настройке особняка. */
        const ge = m.garageExitWorld && m.garageExitWorld.x != null ? m.garageExitWorld : m.entry;
        const pos = new mp.Vector3(ge.x, ge.y, ge.z);
        let h = Number(ge.h) || 0;
        h = ((h + 180) % 360 + 360) % 360;
        const remoteId = vehicleNetworkIdForClient(veh);

        try {
            if (!mp.players.exists(player) || !mp.vehicles.exists(veh)) return;
            player.dimension = 0;
            veh.dimension = 0;
            veh.position = pos;
            veh.heading = h;
            veh.freezePosition(true);
            player.putIntoVehicle(veh, 0);
        } catch (_eA) {}

        try {
            player.call('familyMansion:garageEngineExit:c', [remoteId, pos.x, pos.y, pos.z, h]);
        } catch (_eC) {}

        setTimeout(() => {
            try {
                if (mp.vehicles.exists(veh)) veh.freezePosition(false);
            } catch (_eUn) {}
        }, 600);

        setTimeout(() => {
            try {
                if (Number.isFinite(fid) && fid > 0) {
                    destroyGarageVehicles(`${dim}_${fid}`, veh);
                }
            } catch (_eD) {}
        }, 700);
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('familyMansion:warTeleport:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        const fid = Number(player.familyID);
        if (!fid) return;
        if (!playerNearInteriorCaptTp(player)) return;

        const pid = findActiveCaptBattlePointIdForPlayerFamily(player);
        if (pid == null) return;

        mp.events.call('family:teleport:s', player, pid);
    } catch (err) {
        console.log(err);
    }
});

/** Устарело: телепорт с крыши мира отключён — капт только из офиса/особняка. */
mp.events.add('familyMansion:captWorldLobbyTp:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    } catch (_e) {}
});

mp.events.add('family:fleet:pull:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        getFamilyIdByName(player.family, (e1, familyId) => {
            if (e1 || !familyId) return;
            withFamilyMansion(familyId, player, (mid) => {
                if (!mid) {
                    try {
                        player.call('family:fleet:sync:c', ['FAMILY', 0, isLeader(player) ? 1 : 0, '[]']);
                    } catch (_eEmpty) {}
                    return;
                }
            ensureFleetColumns(() => {
                ensureFamilyVehicleSlotColumns(() => {
                    global.DB.query(
                        'SELECT fleet_plate, fleet_color_idx, `rank` FROM families WHERE id = ? LIMIT 1',
                        [familyId],
                        (e2, rows) => {
                            if (e2 || !rows || !rows[0]) return;
                            let rankSystem = [];
                            try {
                                rankSystem = JSON.parse(rows[0].rank || '[]');
                            } catch (_eR) {
                                rankSystem = [];
                            }
                            if (!Array.isArray(rankSystem)) rankSystem = [];
                            const plate = global.flowVehiclePlate();
                            const cidx = normalizeFleetColorPresetIdx(rows[0].fleet_color_idx);
                            global.DB.query(
                                'SELECT slot, model, slot_color_idx, drive_ranks, evac_ranks, summon_ranks FROM family_vehicles WHERE family_id = ? ORDER BY slot ASC',
                                [familyId],
                                (e3, vrows) => {
                                    if (!mp.players.exists(player)) return;
                                    const list = (vrows || []).map((r) => {
                                        const dr = r.drive_ranks != null ? String(r.drive_ranks) : '';
                                        const er = r.evac_ranks != null ? String(r.evac_ranks) : '';
                                        const sr = r.summon_ranks != null ? String(r.summon_ranks) : '';
                                        return {
                                            slot: Number(r.slot),
                                            model: String(r.model || ''),
                                            colorIdx:
                                                r.slot_color_idx == null || r.slot_color_idx === ''
                                                    ? null
                                                    : normalizeFleetColorPresetIdx(r.slot_color_idx),
                                            driveRanks: dr,
                                            evacRanks: er,
                                            summonRanks: sr,
                                            evacAllowed:
                                                hasFamilyFleetEvacPermission(rankSystem, player) &&
                                                playerCanDriveFamilyVehicle(player, er),
                                            summonAllowed:
                                                hasFamilyFleetSummonPermission(rankSystem, player) &&
                                                playerCanDriveFamilyVehicle(player, sr)
                                        };
                                    });
                                    player.call('family:fleet:sync:c', [
                                        plate,
                                        cidx,
                                        isLeader(player) ? 1 : 0,
                                        JSON.stringify(list)
                                    ]);
                                }
                            );
                        }
                    );
                });
            });
            });
        });
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('family:fleet:save:s', (player, plateRaw, colorIdxRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        if (!isLeader(player)) return notify(player, 2, 'top-mid', 'Только лидер может менять настройки гаража.', 4000);

        let plate = String(plateRaw == null ? '' : plateRaw)
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .slice(0, 6);
        if (!plate) plate = global.flowVehiclePlate();
        let cidx = parseInt(String(colorIdxRaw), 10);
        if (!Number.isFinite(cidx)) cidx = 0;
        cidx = normalizeFleetColorPresetIdx(cidx);

        getFamilyIdByName(player.family, (e1, familyId) => {
            if (e1 || !familyId) return;
            withFamilyMansion(familyId, player, (mid) => {
                if (!mid) return;
            ensureFleetColumns(() => {
                global.DB.query(
                    'UPDATE families SET fleet_plate = ?, fleet_color_idx = ? WHERE id = ?',
                    [plate, cidx, familyId],
                    (e2) => {
                        if (e2) return notify(player, 2, 'top-mid', 'Не сохранено.', 3000);
                        global.DB.query(
                            'UPDATE family_vehicles SET slot_color_idx = NULL WHERE family_id = ?',
                            [familyId],
                            () => {
                                notify(player, 3, 'top-mid', 'Настройки гаража семьи сохранены.', 3000);
                                try {
                                    mp.events.call('family:fleet:pull:s', player);
                                } catch (_ePull) {}
                            }
                        );
                    }
                );
            });
            });
        });
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('s:autoSalonBuyFamily', (player, item) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.dimension !== 124) return;
        try {
            const showPos = new mp.Vector3(-43.70743179321289, -1098.13330078125, 26.42234230041504);
            const p = player.position;
            const dx = p.x - showPos.x;
            const dy = p.y - showPos.y;
            const dz = p.z - showPos.z;
            if (Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)) > 80) {
                return notify(player, 2, 'top-mid', 'Вернитесь в автосалон.', 3000);
            }
        } catch (_eShow) {}
        if (!player.family || !isLeader(player)) {
            return notify(player, 2, 'top-mid', 'Покупка в гараж семьи доступна только лидеру с семьёй.', 4000);
        }

        if (new Date().getTime() - (player.clicked || 0) < 1000) return notify(player, 2, 'top-mid', 'Не так часто.', 1500);
        player.clicked = new Date().getTime();

        const model = item != null && String(item).trim();
        if (!model) return notify(player, 2, 'top-mid', 'Выберите автомобиль.', 3000);

        const AUTOSALON_CATALOG = global.AUTOSALON_CATALOG || {};
        const price = AUTOSALON_CATALOG[model];
        if (price == null) return notify(player, 2, 'top-mid', 'Этой модели нет в продаже.', 3000);
        if (model === 'tourbillon' || model === '812superfast' || model === 'battista' || model === 'amgone1' || model === 'gemera' || model === 'agerars' || model === 'oppressor2' || model === 'valkyriespider' || model === 'divo' || model === 'exp100') {
            return notify(player, 2, 'top-mid', 'Этот эксклюзивный транспорт доступен только для личной покупки за DP.', 3500);
        }

        getFamilyIdByName(player.family, (e1, familyId) => {
            if (e1 || !familyId) return notify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);

            withFamilyMansion(familyId, player, (mid) => {
                if (!mid) return;

            global.DB.query(
                'SELECT COUNT(*) AS c FROM family_vehicles WHERE family_id = ?',
                [familyId],
                (e2, cntRows) => {
                    if (e2 || !cntRows || !cntRows[0]) return;
                    if (Number(cntRows[0].c) >= FAMILY_FLEET_MAX_SLOTS) {
                        return notify(player, 2, 'top-mid', `Гараж семьи полон (${FAMILY_FLEET_MAX_SLOTS} слотов).`, 4000);
                    }

                    global.DB.query(
                        'SELECT slot, model FROM family_vehicles WHERE family_id = ? ORDER BY slot ASC',
                        [familyId],
                        (e3, slots) => {
                            if (global.familyFleetListHasModel(slots, model)) {
                                return notify(player, 2, 'top-mid', 'В гараже семьи уже есть этот транспорт.', 4000);
                            }
                            const used = new Set((slots || []).map((r) => Number(r.slot)));
                            let freeSlot = 0;
                            for (let s = 1; s <= FAMILY_FLEET_MAX_SLOTS; s++) {
                                if (!used.has(s)) {
                                    freeSlot = s;
                                    break;
                                }
                            }
                            if (!freeSlot) return notify(player, 2, 'top-mid', 'Нет свободного слота.', 4000);

                            const static = player.static;
                            global.DB.query('SELECT money FROM accounts WHERE static = ?', [static], (e4, results) => {
                                if (e4 || !results || !results[0]) return;
                                const curMoney = parseInt(String(player.money != null ? player.money : results[0].money || 0), 10);
                                if (!Number.isFinite(curMoney) || curMoney < price) {
                                    return notify(player, 2, 'top-mid', 'Недостаточно средств.', 3000);
                                }
                                const newMoney = curMoney - price;
                                global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, static], (e5) => {
                                    if (e5) return;
                                    global.DB.query(
                                        'INSERT INTO family_vehicles (family_id, slot, model) VALUES (?, ?, ?)',
                                        [familyId, freeSlot, model],
                                        (e6) => {
                                            if (e6) {
                                                global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [curMoney, static]);
                                                return notify(player, 2, 'top-mid', 'Ошибка записи в гараж семьи.', 4000);
                                            }
                                            player.money = newMoney;
                                            player.call('updateMoney', [global.formatnum1(newMoney)]);
                                            notify(player, 3, 'top-mid', `Авто добавлено в гараж семьи (слот ${freeSlot}).`, 5000);
                                            sendDiscordMansion(
                                                `Покупка авто в гараж семьи\n\n${player.login} (#${player.static})\nСемья: ${player.family}\n${model} — ${price}$\nСлот: ${freeSlot}`
                                            );
                                        }
                                    );
                                });
                            });
                        }
                    );
                }
            );
            });
        });
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('family:fleet:saveSlot:s', (player, slotRaw, colorIdxRaw, ranksJsonRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        if (!isLeader(player)) return notify(player, 2, 'top-mid', 'Только лидер может настраивать машины.', 4000);

        const slot = parseInt(String(slotRaw), 10);
        if (!Number.isFinite(slot) || slot < 1 || slot > FAMILY_FLEET_MAX_SLOTS) {
            return notify(player, 2, 'top-mid', 'Некорректный слот.', 3000);
        }

        let cidx = parseInt(String(colorIdxRaw), 10);
        if (!Number.isFinite(cidx)) cidx = 0;
        cidx = normalizeFleetColorPresetIdx(cidx);

        function normalizeFleetRankArr(a) {
            let arr = Array.isArray(a) ? a : [];
            arr = [...new Set(arr.map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= 10))];
            if (!arr.length) arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            return arr;
        }

        let driveArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let evacArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let summonArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        try {
            const parsed = JSON.parse(String(ranksJsonRaw || '[]'));
            if (Array.isArray(parsed)) {
                driveArr = normalizeFleetRankArr(parsed);
            } else if (parsed && typeof parsed === 'object') {
                driveArr = normalizeFleetRankArr(parsed.drive || parsed.d);
                evacArr = normalizeFleetRankArr(parsed.evac || parsed.e);
                summonArr = normalizeFleetRankArr(parsed.summon || parsed.s);
            }
        } catch (_e) {
            driveArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        }

        const driveJson = JSON.stringify(driveArr);
        const evacJson = JSON.stringify(evacArr);
        const summonJson = JSON.stringify(summonArr);

        getFamilyIdByName(player.family, (e1, familyId) => {
            if (e1 || !familyId) return;
            withFamilyMansion(familyId, player, (mid) => {
                if (!mid) return;
            ensureFamilyVehicleSlotColumns(() => {
                global.DB.query(
                    'UPDATE family_vehicles SET slot_color_idx = ?, drive_ranks = ?, evac_ranks = ?, summon_ranks = ? WHERE family_id = ? AND slot = ?',
                    [cidx, driveJson, evacJson, summonJson, familyId, slot],
                    (e2, res) => {
                        if (e2) return notify(player, 2, 'top-mid', 'Не сохранено.', 3000);
                        if (!res || res.affectedRows === 0) return notify(player, 2, 'top-mid', 'Слот не найден.', 3000);
                        notify(player, 3, 'top-mid', 'Настройки машины сохранены.', 2500);
                        mp.events.call('family:fleet:pull:s', player);
                    }
                );
            });
            });
        });
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('family:fleet:evac:s', (player, slotRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        if (new Date().getTime() - (player.clicked || 0) < 800) return;
        player.clicked = new Date().getTime();

        const slot = parseInt(String(slotRaw), 10);
        if (!Number.isFinite(slot) || slot < 1 || slot > FAMILY_FLEET_MAX_SLOTS) {
            return notify(player, 2, 'top-mid', 'Некорректный слот.', 3000);
        }

        const fam = String(player.family || '').trim();
        if (!fam) return;

        getFamilyIdByName(fam, (e1, familyId) => {
            if (e1 || !familyId) return notify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
            withFamilyMansion(familyId, player, (mid) => {
                if (!mid) return;
            global.DB.query('SELECT `rank` FROM families WHERE id = ? LIMIT 1', [familyId], (e2, rrows) => {
                if (e2 || !rrows || !rrows[0]) return notify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
                let rankSystem = [];
                try {
                    rankSystem = JSON.parse(rrows[0].rank || '[]');
                } catch (_e) {
                    rankSystem = [];
                }
                if (!hasFamilyFleetEvacPermission(rankSystem, player)) {
                    return notify(player, 2, 'top-mid', 'Нет права эвакуировать семейное авто.', 4000);
                }
                ensureFamilyVehicleSlotColumns(() => {
                    global.DB.query(
                        'SELECT evac_ranks FROM family_vehicles WHERE family_id = ? AND slot = ? LIMIT 1',
                        [familyId, slot],
                        (e3, vrows) => {
                            if (e3 || !vrows || !vrows[0]) return notify(player, 2, 'top-mid', 'Слот не найден.', 3000);
                            const er = vrows[0].evac_ranks != null ? String(vrows[0].evac_ranks) : '';
                            if (!playerCanDriveFamilyVehicle(player, er)) {
                                return notify(player, 2, 'top-mid', 'Ваш ранг нельзя использовать для эвакуации этой машины.', 4000);
                            }
                            let veh = findWorldFamilyFleetVehicle(familyId, slot);
                            if (!veh) veh = findGarageFamilyFleetVehicle(familyId, mid, slot);
                            if (!veh) {
                                return notify(player, 2, 'top-mid', 'Транспорт этого слота сейчас не найден.', 4000);
                            }
                            try {
                                veh.destroy();
                            } catch (_eD) {}
                            notify(player, 3, 'top-mid', 'Транспорт эвакуирован в гараж.', 3500);
                            if (typeof global.logFamilyAction === 'function') {
                                global.logFamilyAction(fam, player, 'fleet_evac', `Эвакуировал семейное авто (слот ${slot})`);
                            }
                            try {
                                mp.events.call('family:fleet:pull:s', player);
                            } catch (_eP) {}
                        }
                    );
                });
            });
            });
        });
    } catch (err) {
        console.log(err);
    }
});

mp.events.add('family:fleet:summon:s', (player, slotRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !player.family) return;
        if (new Date().getTime() - (player.clicked || 0) < 800) return;
        player.clicked = new Date().getTime();

        const slot = parseInt(String(slotRaw), 10);
        if (!Number.isFinite(slot) || slot < 1 || slot > FAMILY_FLEET_MAX_SLOTS) {
            return notify(player, 2, 'top-mid', 'Некорректный слот.', 3000);
        }

        const until = Number(player._famFleetSummonUntil) || 0;
        if (Date.now() < until) {
            const left = Math.max(1, Math.ceil((until - Date.now()) / 60000));
            return notify(player, 2, 'top-mid', `Призыв семейного авто снова через ${left} мин.`, 4000);
        }

        const fam = String(player.family || '').trim();
        if (!fam) return;

        getFamilyIdByName(fam, (e1, familyId) => {
            if (e1 || !familyId) return notify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
            withFamilyMansion(familyId, player, (mid) => {
                if (!mid) return;
            global.DB.query('SELECT `rank` FROM families WHERE id = ? LIMIT 1', [familyId], (e2, rrows) => {
                if (e2 || !rrows || !rrows[0]) return notify(player, 2, 'top-mid', 'Ошибка семьи.', 3000);
                let rankSystem = [];
                try {
                    rankSystem = JSON.parse(rrows[0].rank || '[]');
                } catch (_e) {
                    rankSystem = [];
                }
                if (!hasFamilyFleetSummonPermission(rankSystem, player)) {
                    return notify(player, 2, 'top-mid', 'Нет права призывать семейное авто.', 4000);
                }
                ensureFamilyVehicleSlotColumns(() => {
                    global.DB.query(
                        'SELECT slot, model, slot_color_idx, drive_ranks, summon_ranks FROM family_vehicles WHERE family_id = ? AND slot = ? LIMIT 1',
                        [familyId, slot],
                        (e3, vrows) => {
                            if (e3 || !vrows || !vrows[0]) return notify(player, 2, 'top-mid', 'Слот не найден.', 3000);
                            const rowV = vrows[0];
                            const sr = rowV.summon_ranks != null ? String(rowV.summon_ranks) : '';
                            if (!playerCanDriveFamilyVehicle(player, sr)) {
                                return notify(player, 2, 'top-mid', 'Ваш ранг нельзя использовать для призыва этой машины.', 4000);
                            }
                            global.DB.query(
                                'SELECT fleet_plate, fleet_color_idx FROM families WHERE id = ? LIMIT 1',
                                        [familyId],
                                        (eF, frows) => {
                                            if (!mp.players.exists(player)) return;
                                            const plate = global.flowVehiclePlate();
                                            const fcidx = normalizeFleetColorPresetIdx(
                                                !eF && frows && frows[0] ? frows[0].fleet_color_idx : 0
                                            );
                                            let veh = findWorldFamilyFleetVehicle(familyId, slot);
                                            if (!veh && mid) veh = findGarageFamilyFleetVehicle(familyId, mid, slot);
                                            if (!veh) {
                                                veh = createFamilyFleetVehicleAtPlayer(player, familyId, slot, rowV, plate, fcidx);
                                            } else {
                                                applySummonVehicleBesidePlayer(player, veh);
                                            }
                                            if (!veh || !mp.vehicles.exists(veh)) {
                                                return notify(player, 2, 'top-mid', 'Не удалось призвать транспорт.', 4000);
                                            }
                                            player._famFleetSummonUntil = Date.now() + 10 * 60 * 1000;
                                            notify(player, 3, 'top-mid', 'Семейный транспорт вызван к вам (КД 10 мин).', 4000);
                                            if (typeof global.logFamilyAction === 'function') {
                                                global.logFamilyAction(fam, player, 'fleet_summon', `Призвал семейное авто (слот ${slot})`);
                                            }
                                        }
                                    );
                        }
                    );
                });
            });
            });
        });
    } catch (err) {
        console.log(err);
    }
});

/** После капта: у особняка (инфо) или у Arcadius. */
global.teleportPlayerToMansionOrArcadius = function (player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const fam = String(player.family || '').trim();
        if (!fam) {
            player.dimension = 0;
            try {
                player.spawn(ARCADIUS_FALLBACK_POS);
            } catch (_e) {
                player.position = ARCADIUS_FALLBACK_POS;
            }
            return;
        }
        player.dimension = 0;
        global.DB.query(
            'SELECT mo.mansion_id AS mid FROM family_mansion_ownership mo INNER JOIN families f ON f.id = mo.family_id WHERE f.name = ? LIMIT 1',
            [fam],
            (e, rows) => {
                if (!mp.players.exists(player)) return;
                const mid = rows && rows[0] ? Number(rows[0].mid) : 0;
                const m = getMansionById(mid);
                if (m) {
                    player.position = new mp.Vector3(m.info.x, m.info.y, m.info.z);
                    player.heading = m.info.h;
                } else {
                    try {
                        player.spawn(ARCADIUS_FALLBACK_POS);
                    } catch (_e2) {
                        player.position = ARCADIUS_FALLBACK_POS;
                    }
                }
            }
        );
    } catch (_e) {}
};

/**
 * Донат-авто (F3 → магазин) в семейный гараж: DP с лидера, цена как у личной покупки.
 */
global.tryPurchaseDonateVehicleForFamilyGarage = function (player, modelKey, price, done) {
    try {
        if (typeof done !== 'function') return;
        if (!mp.players.exists(player) || !player.getVariable('auth')) return done('Ошибка авторизации.');
        if (!player.family) return done('Нужна семья.');
        if (!isLeader(player)) return done('В гараж семьи может купить только лидер.');
        const model = String(modelKey || '').trim();
        if (!model) return done('Неверная модель.');
        if (Number(player.dp) < price) return done('Недостаточно DP для покупки.');

        const static = player.static;
        getFamilyIdByName(player.family, (e1, familyId) => {
            if (!mp.players.exists(player)) return;
            if (e1 || !familyId) return done('Ошибка семьи.');
            withFamilyMansion(familyId, player, (mid) => {
                if (!mid) return done(FAMILY_NO_MANSION_GARAGE_MSG);
            ensureFamilyVehicleSlotColumns(() => {
                global.DB.query(
                    'SELECT COUNT(*) AS c FROM family_vehicles WHERE family_id = ?',
                    [familyId],
                    (e2, cntRows) => {
                                if (!mp.players.exists(player)) return;
                                if (e2 || !cntRows || !cntRows[0]) return done('Ошибка гаража.');
                                if (Number(cntRows[0].c) >= FAMILY_FLEET_MAX_SLOTS) {
                                    return done(`Гараж семьи полон (${FAMILY_FLEET_MAX_SLOTS} слотов).`);
                                }

                                global.DB.query(
                                    'SELECT slot, model FROM family_vehicles WHERE family_id = ? ORDER BY slot ASC',
                                    [familyId],
                                    (e3, slots) => {
                                        if (!mp.players.exists(player)) return;
                                        if (global.familyFleetListHasModel(slots, model)) {
                                            return done('В гараже семьи уже есть этот транспорт.');
                                        }
                                        const used = new Set((slots || []).map((r) => Number(r.slot)));
                                        let freeSlot = 0;
                                        for (let s = 1; s <= FAMILY_FLEET_MAX_SLOTS; s++) {
                                            if (!used.has(s)) {
                                                freeSlot = s;
                                                break;
                                            }
                                        }
                                        if (!freeSlot) return done('Нет свободного слота.');

                                        if (!global.economyTryLock(player, 'famDonateVeh', 5000)) {
                                            return done('Покупка уже обрабатывается.');
                                        }
                                        global.economySpendDp(player, price, (eSpend, ok, newDp) => {
                                            if (!mp.players.exists(player)) return;
                                            if (eSpend || !ok) {
                                                global.economyUnlock(player, 'famDonateVeh');
                                                return done('Недостаточно DP для покупки.');
                                            }
                                            global.DB.query(
                                                'INSERT INTO family_vehicles (family_id, slot, model) VALUES (?, ?, ?)',
                                                [familyId, freeSlot, model],
                                                (e6) => {
                                                    if (!mp.players.exists(player)) return;
                                                    if (e6) {
                                                        // возврат DP при ошибке INSERT
                                                        if (typeof global.economyAddDp === 'function') {
                                                            global.economyAddDp(player, price);
                                                        } else {
                                                            global.DB.query(
                                                                'UPDATE accounts SET dp = CAST(dp AS SIGNED) + ? WHERE static = ?',
                                                                [price, static]
                                                            );
                                                        }
                                                        global.economyUnlock(player, 'famDonateVeh');
                                                        return done('Ошибка записи в гараж семьи.');
                                                    }
                                                    global.economyUnlock(player, 'famDonateVeh');
                                                    isNotify(
                                                        player,
                                                        3,
                                                        'top-mid',
                                                        `Авто в гараж семьи (слот ${freeSlot}). −${global.formatnum1(price)} DP`,
                                                        5000
                                                    );
                                                    sendDiscordMansion(
                                                        `Донат-авто в гараж семьи\n\n${player.login} (#${player.static})\nСемья: ${player.family}\n${model} — ${price} DP\nСлот: ${freeSlot}`
                                                    );
                                                    try {
                                                        mp.events.call('family:fleet:pull:s', player);
                                                    } catch (_eP) {}
                                                    done(null);
                                                }
                                            );
                                        });
                                    });
                                });
                    });
                });
            });
    } catch (err) {
        console.log(err);
        try {
            done('Ошибка.');
        } catch (_e2) {}
    }
};

if (typeof global.whenDbReady === 'function') {
    global.whenDbReady(() => ensureMansionDoorOpenColumn(() => broadcastMansionSync()));
} else {
    setTimeout(() => ensureMansionDoorOpenColumn(() => broadcastMansionSync()), 5000);
}

/** Сразу после логина — клиент получает список особняков (круги в мире). */
global.sendFamilyMansionSyncToPlayer = function (player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        loadMansionState((e, owners) => {
            if (!mp.players.exists(player) || !player.getVariable('auth')) return;
            fetchMansionTabletListingIds((listingIds) => {
                if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                const list = buildMansionClientSyncList(owners, listingIds);
                player.call('familyMansion:sync:c', [JSON.stringify(list)]);
            });
        });
    } catch (_e) {}
};

/**
 * Полное удаление семьи (например /delfamily): особняк снова у государства,
 * записи семейного гаража в БД удаляются, клиентам — обновление меток/блипов.
 */
global.releaseFamilyMansionOnFamilyDelete = function (familyId, done) {
    try {
        const fid = parseInt(String(familyId), 10);
        if (!Number.isFinite(fid) || fid <= 0) {
            if (typeof done === 'function') done();
            return;
        }
        global.DB.query('DELETE FROM family_mansion_ownership WHERE family_id = ?', [fid], () => {
            global.DB.query('DELETE FROM family_vehicles WHERE family_id = ?', [fid], () => {
                try {
                    broadcastMansionSync();
                } catch (_e2) {}
                if (typeof done === 'function') done();
            });
        });
    } catch (_e) {
        if (typeof done === 'function') done();
    }
};
