function createSphereZone(x, y, z, radius, dimension) {
    const shape = global.creatorShapeSphere(x, y, z, radius, dimension || 0);
    return { shape, x, y, z, r: radius };
}

const greenZoneDefs = [
    [172.58367919921875, -1726.4952392578125, 29.29168701171875, 30],
    [340.1108703613281, -2032.4593505859375, 21.730873107910156, 5],
    [338.7489013671875, -2105.336181640625, 18.029451370239258, 5],
    [266.9580993652344, -2051.45654296875, 17.672344207763672, 5],
    [402.4490051269531, -2007.3289794921875, 23.135215759277344, 5],
    [337.563720703125, -1964.03515625, 24.448762893676758, 5],
    [383.60894775390625, -2063.240478515625, 21.366893768310547, 5],
    [-10.661846160888672, -1419.117919921875, 29.32600212097168, 30],
    [924.6547241210938, -1559.1331787109375, 30.755172729492188, 30],
    [840.6149291992188, -2335.831298828125, 30.334321975708008, 30],
    [1379.235107421875, -2079.55322265625, 51.998565673828125, 30],
    [442.406982421875, -982.6343994140625, 30.689603805541992, 30],
    [21.490087509155273, -1106.705810546875, 28.82, 15],
    [810.494873046875, -2157.57763671875, 28.69, 15],
    [1107.8448486328125, 212.5265655517578, -49.44013977050781, 100],
    [132.85122680664062, -1305.550537109375, 29.173490524291992, 15],
    [77.2723617553711, -1389.311767578125, 29.37615203857422, 15],
    [296.13739013671875, -1714.0819091796875, 29.575132751464844, 15],
    [138.3193817138672, -1707.297607421875, 29.2916316986084, 15],
    [-38.720848083496094, -1109.891845703125, 25.55, 10],
    [-466.9127197265625, -1719.1146240234375, 18.680622100830078, 12.5],
    [2937.588134765625, 4244.85498046875, 51.96036911010742, 5],
    [2907.628173828125, 4343.083984375, 50.30303955078125, 5],
    [2869.53271484375, 4302.9716796875, 49.38978576660156, 5],
    [2862.102294921875, 4409.080078125, 49.28160095214844, 5],
    [2877.565673828125, 4507.93212890625, 47.86573028564453, 5],
    [2817.714111328125, 4571.09130859375, 46.238033294677734, 5],
    [2338.56689453125, 3095.25244140625, 48.099578857421875, 5],
    [2430.159912109375, 3112.39892578125, 48.157249450683594, 5],
    [2418.56689453125, 3147.107666015625, 48.22454071044922, 5],
    [2350.643310546875, 3132.806884765625, 48.208736419677734, 5],
    [2410.8388671875, 3053.60205078125, 48.152565002441406, 5],
    [2350.679931640625, 3038.354248046875, 48.15207290649414, 5],
    [583.4918823242188, -1417.24658203125, 19.214340209960938, 5],
    [934.5982055664062, -1.5606880187988281, 78.76395416259766, 5],
    [637.2902221679688, 255.7347412109375, 103.1522216796875, 5],
    [-704.953125, -1286.42919921875, 5.03801155090332, 5],
    [735.6707763671875, -1192.328369140625, 24.269489288330078, 5],
    [1308.1861572265625, -535.4545288085938, 71.2936019897461, 5],
    [-85.6251220703125, -615.6797485351562, 36.313201904296875, 56.5],
    [1323.6456298828125, -1654.4058837890625, 52.27577209472656, 10],
    [423.36865234375, -809.3922729492188, 29.491119384765625, 14],
    [127.46135711669922, -1285.2288818359375, 29.28139877319336, 10],
    [-169.429931640625, -813.7645874023438, 31.305158615112305, 35],
    // NPC заказов (hitman)
    [313.641357421875, -1573.7042236328125, 29.69432258605957, 15],
    // Чёрный заработок (угон машин)
    [597.3562, -1456.1445, 19.2259, 15],
    // Контрабанда — выдача посылки (странный тип)
    [213.7718505859375, -925.9144287109375, 30.692028045654297, 16],
    // Контрабанда — взять задание (NPC на базах банд)
    [169.98020935058594, -1722.8914794921875, 29.391685485839844, 22],
    [-0.11563602834939957, -1417.3670654296875, 29.302698135375977, 22],
    [933.4087524414062, -1569.872314453125, 30.49901008605957, 22],
    [862.092041015625, -2335.25439453125, 30.343870162963867, 22],
    [1399.2086181640625, -2069.84912109375, 51.998504638671875, 22],
    // Треворка — точка телепорта (TREVORKA_EXIT)
    [1132.2098, 3032.2878, 40.5342, 30],
    // Работа «Порт»
    [-445.0, -2735.0, 6.0, 48]
];

/** Больница EMS — ЗЗ остаётся даже при /setgz off. Полигон по точкам периметра (2D-заливка). */
const emsPolygonPoints = [
    [323.0570373535156, -1505.9381103515625],
    [233.5579071044922, -1430.3629150390625],
    [170.05520629882812, -1391.5697021484375],
    [210.4333038330078, -1334.0589599609375],
    [231.15867614746094, -1318.01708984375],
    [247.6920928955078, -1314.1123046875],
    [301.8330993652344, -1315.1595458984375],
    [324.38714599609375, -1325.765380859375],
    [337.9581298828125, -1329.568359375],
    [386.8088684082031, -1271.1451416015625],
    [477.394775390625, -1347.437255859375],
    [444.149169921875, -1387.3955078125],
    [460.9146423339844, -1403.4427490234375],
    [446.9852294921875, -1428.3240966796875],
    [421.46966552734375, -1448.1854248046875]
];

/** Z-диапазон полигона: широкая «коробка» по высоте (фактически 2D-зона до верхних этажей). */
const EMS_POLY_Z_LOW = 0.0;
const EMS_POLY_Z_HIGH = 320.0;

/** LSC (Los Santos Customs) — квадратная ЗЗ под тюнинг-шоп. Полигон по 4 углам. */
const lscPolygonPoints = [
    [-228.4403076171875, -1342.3172607421875],
    [-188.1163330078125, -1344.3453369140625],
    [-187.5678253173828, -1294.1614990234375],
    [-230.0685577392578, -1299.1865234375]
];
const LSC_POLY_Z_LOW = 0.0;
const LSC_POLY_Z_HIGH = 80.0;

/** Казино-площадь — ЗЗ полигоном (+ южная выступ к NPC аренды транспорта). */
const casinoPlazaPolygonPoints = [
    [959.4012451171875, -25.14297866821289],
    [1015.3558349609375, 66.40721130371094],
    [944.56103515625, 111.79602813720703],
    [870.6554565429688, 28.858964920043945],
    [862.0, -5.0],
    [872.0, -22.0],
    [920.0, -28.0]
];
const CASINO_PLAZA_POLY_Z_LOW = 50.0;
const CASINO_PLAZA_POLY_Z_HIGH = 120.0;

/** Стройка — ЗЗ квадратом по 4 углам + выступ к NPC аренды транспорта. */
const constructionPolygonPoints = [
    [-11.44455337524414, -454.25732421875],
    [118.5438461303711, -461.7024841308594],
    [160.53628540039062, -350.8907470703125],
    [168.5, -350.5],
    [168.5, -333.0],
    [148.0, -333.0],
    [42.255157470703125, -308.1290588378906]
];
const CONSTRUCTION_POLY_Z_LOW = 38.0;
const CONSTRUCTION_POLY_Z_HIGH = 55.0;

/** Spectrumi — безопасная зона вокруг магазина и площадки примерки. */
const spectrumPolygonPoints = [
    [-211.43426513671875, -50.83509063720703],
    [-199.0173797607422, -53.24135208129883],
    [-188.49183654785156, -18.854082107543945],
    [-200.5087432861328, -25.514896392822266]
];
const SPECTRUM_POLY_Z_LOW = 48.0;
const SPECTRUM_POLY_Z_HIGH = 65.0;

function expandPolygonFromCenter(points, meters) {
    if (!points || !points.length || !meters) return points;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < points.length; i++) {
        cx += points[i][0];
        cy += points[i][1];
    }
    cx /= points.length;
    cy /= points.length;
    return points.map((p) => {
        const dx = p[0] - cx;
        const dy = p[1] - cy;
        const len = Math.hypot(dx, dy);
        if (len < 0.001) return [p[0], p[1]];
        const k = (len + meters) / len;
        return [cx + dx * k, cy + dy * k];
    });
}

/**
 * Maze Bank Arena — ЗЗ квадрат (1→2→3→4). Север до входа:
 * -256.84, -1998.62 (остальные углы как у площадки).
 */
const arenaPolygonBase = [
    [-256.8443908691406, -1998.61767578125],
    [-205.33827209472656, -1988.726318359375],
    [-255.1090545654297, -2086.84912109375],
    [-282.89886474609375, -2029.8726806640625]
];
const arenaPolygonPoints = arenaPolygonBase.slice();
const ARENA_POLY_Z_LOW = 0.0;
const ARENA_POLY_Z_HIGH = 80.0;

function pointInPolygon2D(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1];
        const xj = pts[j][0], yj = pts[j][1];
        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function createPolygonZone(points, zLow, zHigh, dimension) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
        const px = points[i][0], py = points[i][1];
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
    }
    const width = maxX - minX;
    const depth = maxY - minY;
    const height = zHigh - zLow;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = zLow + height / 2;
    // x,y,z — центр cuboid (RAGE MP), иначе колшейп уезжает от полигона.
    const shape = global.creatorShapeCuboid(
        cx, cy, cz,
        width, depth, height,
        dimension || 0
    );
    return { shape, type: 'polygon', points, x: cx, y: cy, z: cz, zLow, zHigh };
}

const greenZoneEntries = greenZoneDefs.map((d) => createSphereZone(d[0], d[1], d[2], d[3], 0));
const emsZoneEntries = [createPolygonZone(emsPolygonPoints, EMS_POLY_Z_LOW, EMS_POLY_Z_HIGH, 0)];
const lscZoneEntries = [createPolygonZone(lscPolygonPoints, LSC_POLY_Z_LOW, LSC_POLY_Z_HIGH, 0)];
const casinoPlazaZoneEntries = [createPolygonZone(casinoPlazaPolygonPoints, CASINO_PLAZA_POLY_Z_LOW, CASINO_PLAZA_POLY_Z_HIGH, 0)];
const constructionZoneEntries = [
    createPolygonZone(constructionPolygonPoints, CONSTRUCTION_POLY_Z_LOW, CONSTRUCTION_POLY_Z_HIGH, 0)
];
const spectrumZoneEntries = [
    createPolygonZone(spectrumPolygonPoints, SPECTRUM_POLY_Z_LOW, SPECTRUM_POLY_Z_HIGH, 0)
];
const arenaZoneEntries = [
    createPolygonZone(arenaPolygonPoints, ARENA_POLY_Z_LOW, ARENA_POLY_Z_HIGH, 0)
];
const greenZones = greenZoneEntries.map((z) => z.shape);
const emsGreenZones = emsZoneEntries.map((z) => z.shape);

global.greenZonesGloballyEnabled = true;

const GZ_ANTI_GRACE_MS = 800;
const GZ_SYNC_INTERVAL_MS = 1000;
const gzAntiGraceTimers = new Map();

function clearGzAntiGrace(player) {
    if (!player) return;
    const prev = gzAntiGraceTimers.get(player.id);
    if (prev) {
        clearTimeout(prev);
        gzAntiGraceTimers.delete(player.id);
    }
    try {
        player._gzAntiGraceUntil = 0;
    } catch (_eUntil) {}
    try {
        if (mp.players.exists(player)) {
            player.setVariable('gzAntiGrace', false);
            player.call('gzAntiGrace:CLIENT', [false, 0]);
        }
    } catch (_e) {}
}

function startGzAntiGrace(player) {
    if (!player || !mp.players.exists(player)) return;
    clearGzAntiGrace(player);
    const until = Date.now() + GZ_ANTI_GRACE_MS;
    player._gzAntiGraceUntil = until;
    player.setVariable('gzAntiGrace', true);
    try {
        player.call('gzAntiGrace:CLIENT', [true, GZ_ANTI_GRACE_MS]);
    } catch (_eCall) {}
    const timer = setTimeout(() => {
        gzAntiGraceTimers.delete(player.id);
        try {
            if (!mp.players.exists(player)) return;
            player._gzAntiGraceUntil = 0;
            player.setVariable('gzAntiGrace', false);
            player.call('gzAntiGrace:CLIENT', [false, 0]);
        } catch (_e) {}
    }, GZ_ANTI_GRACE_MS);
    gzAntiGraceTimers.set(player.id, timer);
}

function isCombatDimension(dim) {
    const d = Number(dim) || 0;
    return (d >= 2000 && d <= 2050) || (d >= 3000 && d < 4000) || (d >= 5000 && d < 6000);
}

function isPlayerInCombatInstance(player) {
    if (!player || !mp.players.exists(player)) return false;
    if (player.getVariable('inCapt') === true) return true;
    if (player.getVariable('inBizwar') === true) return true;
    if (player.getVariable('inMbaArena') === true) return true;
    if (isCombatDimension(player.dimension)) return true;
    return false;
}

global.isPlayerInArenaZone = function isPlayerInArenaZone(player) {
    if (!player || !mp.players.exists(player)) return false;
    return global.isPointInArenaZone(player.position, player.dimension);
};

global.isPointInArenaZone = function isPointInArenaZone(pos, dimension) {
    if ((dimension || 0) !== 0) return false;
    if (!pos) return false;
    for (let i = 0; i < arenaZoneEntries.length; i++) {
        if (isPointInsideZone(arenaZoneEntries[i], pos)) return true;
    }
    return false;
};

global.isPointInCasinoPlazaZone = function isPointInCasinoPlazaZone(pos, dimension) {
    if ((dimension || 0) !== 0) return false;
    if (!pos) return false;
    for (let i = 0; i < casinoPlazaZoneEntries.length; i++) {
        if (isPointInsideZone(casinoPlazaZoneEntries[i], pos)) return true;
    }
    return false;
};

/** Арена или площадь казино — автоудаление при выходе из машины. */
global.getVehicleAbandonZoneKind = function getVehicleAbandonZoneKind(pos, dimension) {
    if ((dimension || 0) !== 0) return null;
    if (!pos) return null;
    if (global.isPointInArenaZone(pos, dimension)) return 'arena';
    if (global.isPointInCasinoPlazaZone(pos, dimension)) return 'casino';
    return null;
};

global.isPointInVehicleAbandonZone = function isPointInVehicleAbandonZone(pos, dimension) {
    return global.getVehicleAbandonZoneKind(pos, dimension) != null;
};

function forceClearGreenZone(player) {
    if (!player || !mp.players.exists(player)) return;
    clearGzAntiGrace(player);
    player._gzWasInside = false;
    player.setVariable('greenzones', false);
    try {
        player.call('gzHide:CLIENT');
    } catch (_e) {}
}

global.forceClearGreenZone = forceClearGreenZone;

/** Полная защита ЗЗ от урона (без 3 сек анти-ЗЗ после входа). */
global.isPlayerGreenZoneDamageProtected = function isPlayerGreenZoneDamageProtected(player) {
    if (!player || !mp.players.exists(player)) return false;
    if (isPlayerInCombatInstance(player)) return false;
    if (player.getVariable('greenzones') !== true) return false;
    const until = Number(player._gzAntiGraceUntil) || 0;
    if (until > Date.now()) return false;
    if (player.getVariable('gzAntiGrace') === true) return false;
    return true;
};

function getActiveGreenZoneEntries() {
    if (global.greenZonesGloballyEnabled !== false) {
        return greenZoneEntries
            .concat(emsZoneEntries)
            .concat(lscZoneEntries)
            .concat(casinoPlazaZoneEntries)
            .concat(constructionZoneEntries)
            .concat(spectrumZoneEntries)
            .concat(arenaZoneEntries);
    }
    return emsZoneEntries;
}

function getActiveGreenZones() {
    return getActiveGreenZoneEntries().map((z) => z.shape);
}

function isPointInsideZone(zone, pos) {
    if (!zone || !pos) return false;
    if (zone.type === 'polygon') {
        if (pos.z < zone.zLow || pos.z > zone.zHigh) return false;
        return pointInPolygon2D(pos.x, pos.y, zone.points);
    }
    const dx = pos.x - zone.x;
    const dy = pos.y - zone.y;
    const dz = pos.z - zone.z;
    return (dx * dx + dy * dy + dz * dz) <= (zone.r * zone.r);
}

function isPlayerInActiveGreenZone(player) {
    if (isPlayerInCombatInstance(player)) return false;
    const pos = player.position;
    const zones = getActiveGreenZoneEntries();
    for (let i = 0; i < zones.length; i++) {
        if (isPointInsideZone(zones[i], pos)) return true;
    }
    return false;
}

global.isPlayerInEmsHospitalZone = function isPlayerInEmsHospitalZone(player) {
    if (!player || !mp.players.exists(player)) return false;
    const pos = player.position;
    for (let i = 0; i < emsZoneEntries.length; i++) {
        if (isPointInsideZone(emsZoneEntries[i], pos)) return true;
    }
    return false;
};

function isActiveGreenShape(shape) {
    const zones = getActiveGreenZones();
    for (let i = 0; i < zones.length; i++) {
        if (zones[i] === shape) return true;
    }
    return false;
}

function applyPlayerGreenZoneState(player, inGz) {
    if (!mp.players.exists(player)) return;
    inGz = !!inGz;
    // Первый sync (спавн) — без анти-ЗЗ, только выставляем состояние.
    if (player._gzWasInside === undefined) {
        player._gzWasInside = inGz;
        player.setVariable('greenzones', inGz);
        player.call(inGz ? 'gzShow:CLIENT' : 'gzHide:CLIENT');
        return;
    }
    if (inGz === player._gzWasInside) {
        if ((player.getVariable('greenzones') === true) !== inGz) {
            player.setVariable('greenzones', inGz);
            player.call(inGz ? 'gzShow:CLIENT' : 'gzHide:CLIENT');
        }
        return;
    }
    player.setVariable('greenzones', inGz);
    player.call(inGz ? 'gzShow:CLIENT' : 'gzHide:CLIENT');
    if (inGz) startGzAntiGrace(player);
    else clearGzAntiGrace(player);
    player._gzWasInside = inGz;
    if (inGz && typeof global.hitmanOnTargetGreenZone === 'function') {
        try { global.hitmanOnTargetGreenZone(player); } catch (_eHitmanGz) {}
    } else if (!inGz && typeof global.hitmanOnTargetLeaveGreenZone === 'function') {
        try { global.hitmanOnTargetLeaveGreenZone(player); } catch (_eHitmanGzLeave) {}
    }
}

function resolveGreenZoneEntryByShape(shape) {
    const zones = getActiveGreenZoneEntries();
    for (let i = 0; i < zones.length; i++) {
        if (zones[i].shape === shape) return zones[i];
    }
    return null;
}

function shouldPeriodicGzSync(player) {
    if (!player || !mp.players.exists(player)) return false;
    if (!player.getVariable('auth')) return false;
    if (isPlayerInCombatInstance(player)) return false;
    if ((player.dimension || 0) !== 0) return false;
    return true;
}

function syncPlayerGreenZoneState(player) {
    if (!player || !mp.players.exists(player)) return;
    applyPlayerGreenZoneState(player, isPlayerInActiveGreenZone(player));
}

global.syncPlayerGreenZoneState = syncPlayerGreenZoneState;

global.setGreenZonesGloballyEnabled = function setGreenZonesGloballyEnabled(enabled, actor) {
    global.greenZonesGloballyEnabled = !!enabled;
    const on = global.greenZonesGloballyEnabled;
    mp.players.forEach((p) => {
        try {
            syncPlayerGreenZoneState(p);
        } catch (_e) {}
    });
    mp.players.broadcast(
        on
            ? '!{#ffffff}[Сервер] !{#ef4444}Зелёные зоны включены!{#ffffff} на всём сервере.'
            : '!{#ffffff}[Сервер] !{#ef4444}Зелёные зоны отключены!{#ffffff} Защита только у EMS-больницы.'
    );
    if (actor && mp.players.exists(actor)) {
        actor.outputChatBox(
            on
                ? '!{#22c55e}Зелёные зоны включены (EMS всегда под защитой).'
                : '!{#ef4444}Зелёные зоны отключены, кроме EMS.'
        );
    }
};

function parseGzOnOffArg(arg) {
    const a = String(arg || '').trim().toLowerCase();
    if (!a) return null;
    if (a === '1' || a === 'on' || a === 'true' || a === 'вкл' || a === 'да') return true;
    if (a === '0' || a === 'off' || a === 'false' || a === 'выкл' || a === 'нет') return false;
    return undefined;
}

mp.events.addCommand('setgz', (player, _full, arg) => {
    try {
        const adminlvl = Number(player.adminlvl) || Number(player.getVariable('adminlvl')) || 0;
        if (adminlvl < 7) {
            return player.outputChatBox('!{#ef4444}Команда /setgz доступна с 7 уровня админки.');
        }
        let parsed = parseGzOnOffArg(arg);
        if (parsed === undefined) {
            return player.outputChatBox('!{#888888}Использование: /setgz [on|off] — все ЗЗ кроме EMS.');
        }
        if (parsed === null) {
            parsed = !global.greenZonesGloballyEnabled;
        }
        global.setGreenZonesGloballyEnabled(parsed, player);
    } catch (e) {
        console.log(e);
    }
});

const greenColor = [0, 255, 0, 15]

const positions = [
    [2937.5881, 4244.855, 51.9604, 7],
    [2907.6282, 4343.084, 50.3030, 7],
    [2869.5327, 4302.972, 49.3898, 7],
    [2862.1023, 4409.080, 49.2816, 7],
    [2877.5657, 4507.932, 47.8657, 7],
    [2817.7141, 4571.091, 46.2380, 7],
    [340.1108703613281, -2032.4593505859375, 21.730873107910156, 5],
    [338.7489013671875, -2105.336181640625, 18.029451370239258, 5],
    [266.9580993652344, -2051.45654296875, 17.672344207763672, 5],
    [402.4490051269531, -2007.3289794921875, 23.135215759277344, 5],
    [337.563720703125, -1964.03515625, 24.448762893676758, 5],
    [383.60894775390625, -2063.240478515625, 21.366893768310547, 5],
    [-112.48075866699219, -606.3692016601562, 36.2807731628418, 5],
    // Чёрный заработок (угон машин)
    [597.3562, -1456.1445, 19.2259, 15],
    [2338.56689453125, 3095.25244140625, 48.099578857421875, 5],
    [2430.159912109375, 3112.39892578125, 48.157249450683594, 5],
    [2418.56689453125, 3147.107666015625, 48.22454071044922, 5],
    [2350.643310546875, 3132.806884765625, 48.208736419677734, 5],
    [2410.8388671875, 3053.60205078125, 48.152565002441406, 5],
    [2350.679931640625, 3038.354248046875, 48.15207290649414, 5]
];

positions.forEach((pos) => {
    const [x, y, z, radius] = pos;
    global.creatorShapeSphere(x, y, z, radius);
    const sphereRadius = 15;
    global.creatorMarkersNew(
        4,
        new mp.Vector3(x, y, z - sphereRadius / 2),
        sphereRadius,
        {
            direction: new mp.Vector3(0, 0, 0),
            rotation: new mp.Vector3(0, 0, 0),
            color: greenColor,
            visible: true,
            dimension: 0
        }
    );
});

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!isActiveGreenShape(shape)) return;
        if (!mp.players.exists(player)) return;
        if ((player.dimension || 0) !== 0 || isPlayerInCombatInstance(player)) return;
        const zone = resolveGreenZoneEntryByShape(shape);
        if (zone && isPointInsideZone(zone, player.position)) {
            applyPlayerGreenZoneState(player, true);
            return;
        }
        syncPlayerGreenZoneState(player);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (!isActiveGreenShape(shape)) return;
        if (!mp.players.exists(player)) return;
        if (isPlayerInCombatInstance(player) || (player.dimension || 0) !== 0) {
            forceClearGreenZone(player);
            return;
        }
        syncPlayerGreenZoneState(player);
    } catch (error) {
        console.log(error);
    }
});

setInterval(() => {
    mp.players.forEach((player) => {
        try {
            if (!player || !mp.players.exists(player)) return;
            if (!shouldPeriodicGzSync(player)) {
                if (
                    player._gzWasInside ||
                        player.getVariable('greenzones') === true ||
                        isPlayerInCombatInstance(player)
                ) {
                    forceClearGreenZone(player);
                }
                return;
            }
            syncPlayerGreenZoneState(player);
        } catch (_e) {}
    });
}, GZ_SYNC_INTERVAL_MS);

mp.events.add('playerQuit', (player) => {
    try {
        clearGzAntiGrace(player);
        if (player) player._gzWasInside = undefined;
    } catch (_e) {}
});