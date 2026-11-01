'use strict';

const COMBAT_SPAWN_SLOTS = 10;
const COMBAT_SPAWN_SPACING_M = 1.0;
const CAPT_ARENA_RADIUS_PAD_BONUS = 20;

function normalizeHeadingDeg(h) {
    let d = Number(h) || 0;
    while (d < 0) d += 360;
    while (d >= 360) d -= 360;
    return d;
}

/** 10 слотов по 1 м друг от друга, линия перпендикулярна направлению взгляда. */
function buildSpreadSpawns(x, y, z, headingDeg, count = COMBAT_SPAWN_SLOTS, spacing = COMBAT_SPAWN_SPACING_M) {
    const h = normalizeHeadingDeg(headingDeg) * Math.PI / 180;
    const rx = Math.cos(h);
    const ry = Math.sin(h);
    const out = [];
    const center = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
        const off = (i - center) * spacing;
        out.push([x + rx * off, y + ry * off, z]);
    }
    return out;
}

function buildCombatArena(name, attackerBase, defenderBase, extraRadius = 0) {
    return {
        name,
        attacker: buildSpreadSpawns(attackerBase.x, attackerBase.y, attackerBase.z, attackerBase.h),
        defender: buildSpreadSpawns(defenderBase.x, defenderBase.y, defenderBase.z, defenderBase.h),
        extraRadius
    };
}

const COMBAT_ARENAS = [
    {
        name: 'Деревня лесорубов',
        attacker: [
            [-688.1844482421875,  5747.34912109375,  17.753015518188477],
            [-688.1913452148438,  5747.34912109375,  17.754459381103516],
            [-688.8674926757812,  5747.8671875,      17.69041633605957 ],
            [-688.2490844726562,  5746.8330078125,   17.83159065246582 ],
            [-687.17236328125,    5746.791015625,    17.8077449798584  ],
            [-686.1986083984375,  5746.51806640625,  17.82448959350586 ],
            [-686.2874755859375,  5748.37646484375,  17.41114616394043 ],
            [-690.456787109375,   5749.52294921875,  17.4403018951416  ],
            [-692.6974487304688,  5750.80908203125,  17.33509635925293 ],
            [-693.0243530273438,  5749.1279296875,   17.668352127075195]
        ],
        defender: [
            [-671.7692260742188,  5840.49658203125,  17.331314086914062],
            [-672.5294189453125,  5841.3203125,      17.331314086914062],
            [-673.5647583007812,  5842.2763671875,   17.331314086914062],
            [-674.7098388671875,  5843.296875,       17.33131217956543 ],
            [-673.0720825195312,  5844.1240234375,   17.33131217956543 ],
            [-672.3511962890625,  5843.4287109375,   17.331308364868164],
            [-671.141845703125,   5842.1201171875,   17.331308364868164],
            [-670.2040405273438,  5840.90478515625,  17.331308364868164],
            [-670.1214599609375,  5838.57958984375,  17.331308364868164],
            [-669.0178833007812,  5839.40869140625,  17.331308364868164]
        ]
    },
    {
        name: 'Лнс',
        attacker: [
            [186.4800262451172,   2813.5458984375,   44.84757614135742 ],
            [187.93572998046875,  2813.45263671875,  44.79884719848633 ],
            [189.33204650878906,  2813.54638671875,  44.79108810424805 ],
            [187.0255126953125,   2813.344970703125, 44.851966857910156],
            [184.6244659423828,   2813.1376953125,   44.93478012084961 ],
            [184.45677185058594,  2814.572265625,    44.73687744140625 ],
            [185.8026123046875,   2814.61279296875,  44.68280029296875 ],
            [187.33554077148438,  2815.21435546875,  44.64056396484375 ],
            [188.85780334472656,  2815.50537109375,  44.622962951660156],
            [189.88087463378906,  2816.046875,       44.577049255371094]
        ],
        defender: [
            [200.68353271484375,  2727.632080078125, 42.81173324584961 ],
            [199.5076446533203,   2727.348388671875, 42.743804931640625],
            [198.06532287597656,  2727.2763671875,   42.74012374877930 ],
            [198.0410614013672,   2728.76318359375,  42.82088088989258 ],
            [199.18243408203125,  2729.037353515625, 42.88188552856445 ],
            [200.44757080078125,  2729.226806640625, 42.88290786743164 ],
            [196.02862548828125,  2728.972412109375, 42.85011291503906 ],
            [194.90374755859375,  2728.997314453125, 42.85213088989258 ],
            [194.8788299560547,   2727.28076171875,  42.68934631347656 ],
            [196.6183319091797,   2726.60107421875,  42.713924407958984]
        ]
    },
    {
        name: 'Конты',
        attacker: [
            [864.0641479492188,  -3069.821044921875, 5.900933265686035 ],
            [863.9254760742188,  -3069.182373046875, 5.900935649871826 ],
            [863.8502807617188,  -3068.2255859375,   5.9010186195373535],
            [865.23388671875,    -3067.8740234375,   5.901050090789795 ],
            [865.3197021484375,  -3069.04345703125,  5.900936603546143 ],
            [865.3577270507812,  -3068.311279296875, 5.901010036468506 ],
            [866.833740234375,   -3067.905517578125, 5.901040077209473 ],
            [866.1513671875,     -3066.995849609375, 5.9010844230651855],
            [867.5050659179688,  -3068.734619140625, 5.900964736938477 ],
            [869.440673828125,   -3067.677978515625, 5.900991439819336 ]
        ],
        defender: [
            [820.863037109375,   -3107.629638671875, 5.900818824768066 ],
            [822.2203369140625,  -3106.9736328125,   5.900813579559326 ],
            [822.4505615234375,  -3108.123779296875, 5.900815963745117 ],
            [822.6741943359375,  -3107.531005859375, 5.900815963745117 ],
            [821.9658203125,     -3108.837646484375, 5.900818824768066 ],
            [821.955810546875,   -3108.30322265625,  5.900818824768066 ],
            [822.41064453125,    -3109.745849609375, 5.900818347930908 ],
            [824.7261352539062,  -3109.220947265625, 5.900814056396484 ],
            [825.326416015625,   -3106.896728515625, 5.900816440582275 ]
        ]
    },
    {
        name: 'Домики',
        attacker: [
            [2389.29345703125,   3305.24365234375,  47.548973083496094],
            [2389.748046875,     3305.825927734375, 47.641544342041016],
            [2389.90966796875,   3304.918212890625, 47.521324157714844],
            [2390.73095703125,   3305.348388671875, 47.58726501464844 ],
            [2390.79931640625,   3306.348876953125, 47.6387825012207  ],
            [2389.218505859375,  3306.80078125,     47.64241027832031 ],
            [2390.887451171875,  3305.20068359375,  47.56779479980469 ],
            [2391.145263671875,  3303.82373046875,  47.52415466308594 ],
            [2391.760009765625,  3305.10302734375,  47.569820404052734],
            [2392.213134765625,  3304.160888671875, 47.601497650146484]
        ],
        defender: [
            [2375.070556640625,  3354.17822265625,  47.18498992919922 ],
            [2375.947021484375,  3353.755859375,    47.0748405456543  ],
            [2376.96337890625,   3353.913818359375, 47.17866134643555 ],
            [2376.602294921875,  3354.951904296875, 47.10789489746094 ],
            [2376.11083984375,   3355.371826171875, 47.19646453857422 ],
            [2374.972900390625,  3355.162841796875, 47.193058013916016],
            [2373.870849609375,  3353.98486328125,  47.20475387573242 ],
            [2377.09033203125,   3355.642822265625, 47.13066101074219 ],
            [2376.986328125,     3357.19775390625,  47.20209884643555 ],
            [2379.2021484375,    3356.94287109375,  47.074771881103516]
        ]
    },
    buildCombatArena(
        'Мусорка',
        { x: -429.6987609863281, y: -1707.5933837890625, z: 19.087711334228516, h: 68.77706146240234 },
        { x: -493.87078857421875, y: -1682.2598876953125, z: 19.269981384277344, h: -160.61058044433594 },
        10
    ),
    buildCombatArena(
        'Самолеты',
        { x: 2407.89892578125, y: 3139.9853515625, z: 48.18290328979492, h: 69.58899688720703 },
        { x: 2349.097412109375, y: 3042.478271484375, z: 48.17721176147461, h: -2.987902879714966 },
        10
    ),
    buildCombatArena(
        'Мексы',
        { x: 1197.5557861328125, y: 1837.638671875, z: 78.7203369140625, h: -45.60786056518555 },
        { x: 1265.1331787109375, y: 1908.59326171875, z: 78.68689727783203, h: 116.61864471435547 },
        10
    ),
    buildCombatArena(
        'Миррор Парк',
        { x: 1280.563232421875, y: -583.095703125, z: 70.46263885498047, h: -41.827857971191406 },
        { x: 1396.3304443359375, y: -546.8624877929688, z: 74.4201889038086, h: 117.52979278564453 },
        10
    ),
    buildCombatArena(
        'АЗС',
        { x: 1192.4122314453125, y: -1288.9864501953125, z: 35.0177001953125, h: -152.09674072265625 },
        { x: 1210.5284423828125, y: -1371.694580078125, z: 35.275901794433594, h: 9.958169937133789 },
        10
    )
];

function getCombatArenaMetaFromLocation(loc) {
    if (!loc) return null;
    const all = loc.attacker.concat(loc.defender);
    let sumX = 0, sumY = 0, sumZ = 0;
    for (let i = 0; i < all.length; i++) {
        sumX += all[i][0]; sumY += all[i][1]; sumZ += all[i][2];
    }
    const cx = sumX / all.length, cy = sumY / all.length, cz = sumZ / all.length;
    /** Радиус круга по всем точкам атаки/защиты (центр — среднее, r — до самой дальней точки). */
    let maxDist = 0;
    for (let i = 0; i < all.length; i++) {
        const d = Math.hypot(all[i][0] - cx, all[i][1] - cy);
        if (d > maxDist) maxDist = d;
    }
    let radiusPadding = 5;
    if (loc.extraRadius != null && Number(loc.extraRadius) > 0) {
        /** Новые арены: круг по точкам + ровно N метров (без базовых +5). */
        radiusPadding = Number(loc.extraRadius);
    } else if (loc.name === 'Лнс') radiusPadding += 5;
    else if (loc.name === 'Конты') radiusPadding += 3;
    /** Глобальный бонус: зоны каптов/бизваров крупнее, чтобы бой не упирался в границу. */
    radiusPadding += CAPT_ARENA_RADIUS_PAD_BONUS;
    return { cx, cy, cz, radius: maxDist + radiusPadding, name: loc.name || '' };
}

const COMBAT_SPAWN_Z_LIFT = 0.35;
const COMBAT_PREP_FALL_EXTRA_Z = 1.15;

function getCombatSpawnFromLocation(loc, isAttacker, slotIndex, isPrep) {
    const arr = isAttacker ? loc.attacker : loc.defender;
    const idx = (Number.isFinite(slotIndex) && slotIndex >= 0) ? Math.min(slotIndex, arr.length - 1) : 0;
    const pos = arr[idx];
    let z = pos[2] + COMBAT_SPAWN_Z_LIFT;
    if (isPrep) z += COMBAT_PREP_FALL_EXTRA_Z;
    return new mp.Vector3(pos[0], pos[1], z);
}

function getCaptLocationForPoint(pointId, arenaIndex) {
    const randomIndex = parseInt(arenaIndex, 10);
    if (Number.isInteger(randomIndex) && randomIndex >= 0 && randomIndex < COMBAT_ARENAS.length) {
        return COMBAT_ARENAS[randomIndex];
    }
    const id = Number(pointId);
    if ((id >= 1 && id <= 5) || (id >= 25 && id <= 30)) return COMBAT_ARENAS[0];
    if ((id >= 6 && id <= 10) || (id >= 31 && id <= 35)) return COMBAT_ARENAS[1];
    if ((id >= 11 && id <= 15) || (id >= 36 && id <= 40)) return COMBAT_ARENAS[2];
    if ((id >= 16 && id <= 24) || (id >= 41 && id <= 50)) return COMBAT_ARENAS[3];
    return COMBAT_ARENAS[id % COMBAT_ARENAS.length];
}

function getBizwarLocationForZone(zoneId, arenaIndex) {
    const randomIndex = parseInt(arenaIndex, 10);
    if (Number.isInteger(randomIndex) && randomIndex >= 0 && randomIndex < COMBAT_ARENAS.length) {
        return COMBAT_ARENAS[randomIndex];
    }
    const z = parseInt(zoneId, 10);
    if (!Number.isFinite(z) || z < 1) return COMBAT_ARENAS[0];
    if (z >= 51) {
        /** 51–60/91–100 → 1, 61–70/101–110 → 2, 71–80/111–120 → 3, 81–90/121–128 → 4 */
        return COMBAT_ARENAS[Math.floor((z - 51) / 10) % 4];
    }
    /** Зоны 1–50: распределение как у family capt points. */
    return getCaptLocationForPoint(((z - 1) % 50) + 1);
}

function getBizwarArenaForZone(zoneId, arenaIndex) {
    return getBizwarLocationForZone(zoneId, arenaIndex);
}

function getCaptArenaMeta(pointId, arenaIndex) {
    return getCombatArenaMetaFromLocation(getCaptLocationForPoint(pointId, arenaIndex));
}

function getCaptSpawnPosition(pointId, isAttacker, slotIndex, isPrep, arenaIndex) {
    return getCombatSpawnFromLocation(getCaptLocationForPoint(pointId, arenaIndex), isAttacker, slotIndex, isPrep);
}

function getBizwarArenaMeta(zoneId, arenaIndex) {
    return getCombatArenaMetaFromLocation(getBizwarArenaForZone(zoneId, arenaIndex));
}

function getBizwarSpawnPosition(zoneId, isAttacker, slotIndex, isPrep, arenaIndex) {
    return getCombatSpawnFromLocation(getBizwarArenaForZone(zoneId, arenaIndex), isAttacker, slotIndex, isPrep);
}

function getRandomCombatArena(excludeName) {
    const exclude = String(excludeName || '').trim();
    let pool = COMBAT_ARENAS;
    if (exclude && COMBAT_ARENAS.length > 1) {
        pool = COMBAT_ARENAS.filter((a) => String(a && a.name || '').trim() !== exclude);
        if (!pool.length) pool = COMBAT_ARENAS;
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

const ARENA_OUT_OF_BOUNDS_DAMAGE = 10;

function isPlayerOutsideArena(player, cx, cy, radius) {
    if (!player || typeof cx !== 'number' || typeof cy !== 'number' || typeof radius !== 'number') return false;
    const dx = player.position.x - cx;
    const dy = player.position.y - cy;
    return Math.hypot(dx, dy) > radius;
}

function applyArenaOutOfBoundsDamage(player, damage = ARENA_OUT_OF_BOUNDS_DAMAGE) {
    if (!player || !mp.players.exists(player)) return false;
    if (player.getVariable('dead') === true) return false;
    const cur = typeof player.health === 'number' ? player.health : 100;
    const nh = Math.max(0, cur - Math.max(1, Number(damage) || ARENA_OUT_OF_BOUNDS_DAMAGE));
    if (nh === cur) return false;
    if (typeof global.applyAuthorizedHealth === 'function') {
        global.applyAuthorizedHealth(player, nh, 'arena-out-of-bounds');
    } else if (global.healthService && typeof global.healthService.setHealth === 'function') {
        global.healthService.setHealth(player, nh, 'arena-out-of-bounds');
    } else {
        player.health = nh;
        player._acAllowedHealth = nh;
    }
    player._arenaBoundaryDmgAt = Date.now();
    return true;
}

function tickArenaOutOfBoundsDamage(players, cx, cy, radius, shouldDamageFn) {
    if (typeof cx !== 'number' || typeof cy !== 'number' || typeof radius !== 'number') return;
    const list = Array.isArray(players) ? players : [];
    for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (!p || !mp.players.exists(p) || !p.getVariable('auth')) continue;
        if (p.getVariable('dead') === true) continue;
        if (typeof shouldDamageFn === 'function' && !shouldDamageFn(p)) continue;
        if (isPlayerOutsideArena(p, cx, cy, radius)) {
            applyArenaOutOfBoundsDamage(p, ARENA_OUT_OF_BOUNDS_DAMAGE);
        }
    }
}

function tryArenaBoundaryDamageForPlayer(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return false;
    if (player.getVariable('dead') === true) return false;
    const now = Date.now();
    if (player._arenaBoundaryDmgAt && (now - player._arenaBoundaryDmgAt) < 900) return false;

    if (player.getVariable('inBizwar') === true) {
        const zoneId = parseInt(player.getVariable('bizwarZone'), 10);
        const bw = global.activeBizwars && global.activeBizwars[zoneId];
        if (!bw || !bw.isStarted) return false;
        if (player.dimension !== (3000 + zoneId)) return false;
        if (!bw.players || !bw.players[player.static]) return false;
        if (!isPlayerOutsideArena(player, bw.arenaCx, bw.arenaCy, bw.arenaRadius)) return false;
        player._arenaBoundaryDmgAt = now;
        return applyArenaOutOfBoundsDamage(player, ARENA_OUT_OF_BOUNDS_DAMAGE);
    }

    if (player.getVariable('inCapt') === true) {
        const pointId = parseInt(player.captPointId, 10);
        const battle = global.activeBattles && global.activeBattles[pointId];
        if (!battle || !battle.isStarted) return false;
        if (player.dimension !== (2000 + pointId)) return false;
        if (battle.players && battle.players[player.static] == null) return false;
        if (!isPlayerOutsideArena(player, battle.arenaCx, battle.arenaCy, battle.arenaRadius)) return false;
        player._arenaBoundaryDmgAt = now;
        return applyArenaOutOfBoundsDamage(player, ARENA_OUT_OF_BOUNDS_DAMAGE);
    }

    if (player.getVariable('inMbaArena') === true) {
        const dim = player.dimension || 0;
        if (dim < 5000 || dim >= 6000) return false;
        const cx = Number(player.getVariable('mbaArenaCx'));
        const cy = Number(player.getVariable('mbaArenaCy'));
        const r = Number(player.getVariable('mbaArenaR'));
        if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) return false;
        if (!isPlayerOutsideArena(player, cx, cy, r)) return false;
        player._arenaBoundaryDmgAt = now;
        return applyArenaOutOfBoundsDamage(player, ARENA_OUT_OF_BOUNDS_DAMAGE);
    }

    return false;
}

mp.events.add('arena:boundaryDamage:s', (player) => {
    try {
        tryArenaBoundaryDamageForPlayer(player);
    } catch (e) {
        console.log('[combat_arenas] boundaryDamage:', e.message || e);
    }
});

module.exports = {
    COMBAT_ARENAS,
    COMBAT_SPAWN_SLOTS,
    COMBAT_SPAWN_SPACING_M,
    buildSpreadSpawns,
    buildCombatArena,
    COMBAT_SPAWN_Z_LIFT,
    COMBAT_PREP_FALL_EXTRA_Z,
    getCombatArenaMetaFromLocation,
    getCombatSpawnFromLocation,
    getRandomCombatArena,
    getCaptLocationForPoint,
    getCaptArenaMeta,
    getCaptSpawnPosition,
    getBizwarLocationForZone,
    getBizwarArenaForZone,
    getBizwarArenaMeta,
    ARENA_OUT_OF_BOUNDS_DAMAGE,
    isPlayerOutsideArena,
    applyArenaOutOfBoundsDamage,
    tickArenaOutOfBoundsDamage,
    tryArenaBoundaryDamageForPlayer,
    getBizwarSpawnPosition
};
