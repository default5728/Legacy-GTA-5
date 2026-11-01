'use strict';

/**
 * Работа «Стройка» — перенос из Blood: красные зоны, клавиша на экране, оплата за участок.
 */

const CONSTRUCTION_NPC_POS = new mp.Vector3(142.4187774658203, -377.2091369628906, 43.25703811645508);
const CONSTRUCTION_NPC_HEADING = 75.39500427246094;
const CONSTRUCTION_TASK_REWARD = 20000;
const CONSTRUCTION_PAY_PER_LEVEL = 2000;
const CONSTRUCTION_SKILL_MAX = 10;
const CONSTRUCTION_SKILL_PER_LEVEL = 100;
const CONSTRUCTION_HITS_REQUIRED = 22;
const CONSTRUCTION_HIT_COOLDOWN_MS = 140;
const CONSTRUCTION_DECAY_IDLE_MS = 520;
const CONSTRUCTION_DECAY_STEP_MS = 280;
const CONSTRUCTION_KEYS = ['F', 'E', 'G', 'H'];

const CONSTRUCTION_WORK_SPOTS = [
    new mp.Vector3(34.442955017089844, -446.6726989746094, 45.5577392578125),
    new mp.Vector3(10.254961013793945, -443.5033874511719, 45.55780792236328),
    new mp.Vector3(14.67369270324707, -422.80987548828125, 45.558921813964844),
    new mp.Vector3(31.363645553588867, -383.09039306640625, 45.55739212036133),
    new mp.Vector3(57.404964447021484, -379.2677001953125, 45.55921173095703)
];

const constructionNpcCol = global.creatorShapeSphere(
    CONSTRUCTION_NPC_POS.x,
    CONSTRUCTION_NPC_POS.y,
    CONSTRUCTION_NPC_POS.z,
    2.0
);

/** @type {Map<number, object>} */
const activeByStatic = new Map();

function dist2d(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function taskPayForLevel(level) {
    const lv = Math.max(1, Math.min(CONSTRUCTION_SKILL_MAX, parseInt(level, 10) || 1));
    return CONSTRUCTION_TASK_REWARD + (lv - 1) * CONSTRUCTION_PAY_PER_LEVEL;
}

function buildConstructionSkillFromXp(xp) {
    const k = Math.max(0, parseInt(xp, 10) || 0);
    const level = Math.min(CONSTRUCTION_SKILL_MAX, Math.floor(k / CONSTRUCTION_SKILL_PER_LEVEL) + 1);
    const progress = k % CONSTRUCTION_SKILL_PER_LEVEL;
    return [level, progress, CONSTRUCTION_SKILL_PER_LEVEL, CONSTRUCTION_SKILL_MAX];
}

function getConstructionSkillXp(player) {
    return Math.max(0, parseInt(player && player.constructionSkillXp, 10) || 0);
}

function getConstructionTaskPay(player) {
    return taskPayForLevel(buildConstructionSkillFromXp(getConstructionSkillXp(player))[0]);
}

function saveConstructionSkillXp(player) {
    if (!player || !player.static || !global.DB) return;
    const xp = getConstructionSkillXp(player);
    global.DB.query('UPDATE accounts SET construction_skill_xp = ? WHERE static = ? LIMIT 1', [xp, player.static], () => {});
}

function addConstructionSkillXp(player, amount) {
    if (!player || !mp.players.exists(player)) return;
    const add = Math.max(1, parseInt(amount, 10) || 1);
    const prev = getConstructionSkillXp(player);
    const next = prev + add;
    player.constructionSkillXp = next;
    saveConstructionSkillXp(player);
    const prevSkill = buildConstructionSkillFromXp(prev);
    const nextSkill = buildConstructionSkillFromXp(next);
    if (nextSkill[0] > prevSkill[0]) {
        notify(player, 3, `Навык Стройка: уровень ${nextSkill[0]}. Теперь ${taskPayForLevel(nextSkill[0])}$ за участок.`, 4000);
    }
    try {
        if (typeof global.pmRefreshMenuData === 'function') global.pmRefreshMenuData(player);
    } catch (_ePm) {}
}

function ensureConstructionSkillColumn() {
    const run = () => {
        if (!global.DB) return;
        global.DB.query(
            'ALTER TABLE accounts ADD COLUMN construction_skill_xp INT NOT NULL DEFAULT 0',
            (err) => {
                if (err && err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_COLUMNNAME') {
                    console.log('[construction] ALTER construction_skill_xp:', err.code || err.message);
                }
            }
        );
    };
    if (typeof global.whenDbReady === 'function') global.whenDbReady(run);
    else setTimeout(run, 4000);
}

ensureConstructionSkillColumn();

global.buildConstructionSkillForMenu = function (player) {
    return buildConstructionSkillFromXp(getConstructionSkillXp(player));
};
global.getConstructionTaskPay = getConstructionTaskPay;
global.hydrateConstructionSkill = function (player, row) {
    if (!player) return;
    player.constructionSkillXp = Math.max(0, parseInt(row && row.construction_skill_xp, 10) || 0);
};

function notify(player, type, msg, ms) {
    if (typeof global.isNotify === 'function') global.isNotify(player, type, 'top-mid', msg, ms || 3000);
}

function formatMoney(n) {
    return typeof global.formatnum1 === 'function' ? global.formatnum1(n) : String(n);
}

function pickRandomSpotIndex(exclude) {
    if (CONSTRUCTION_WORK_SPOTS.length <= 1) return 0;
    let idx = Math.floor(Math.random() * CONSTRUCTION_WORK_SPOTS.length);
    let guard = 0;
    while (idx === exclude && guard++ < 20) {
        idx = Math.floor(Math.random() * CONSTRUCTION_WORK_SPOTS.length);
    }
    return idx;
}

function pickRandomKey() {
    return CONSTRUCTION_KEYS[Math.floor(Math.random() * CONSTRUCTION_KEYS.length)];
}

function pushConstructionSync(player, job) {
    if (!player || !mp.players.exists(player)) return;
    if (!job) {
        player.call('construction:sync', [JSON.stringify({ active: false })]);
        return;
    }
    const spot = CONSTRUCTION_WORK_SPOTS[job.spotIndex];
    player.call('construction:sync', [JSON.stringify({
        active: true,
        x: spot.x,
        y: spot.y,
        z: spot.z,
        key: job.key,
        hits: job.hits,
        hitsRequired: CONSTRUCTION_HITS_REQUIRED
    })]);
}

function assignNewTask(job, prevSpotIndex) {
    job.spotIndex = pickRandomSpotIndex(prevSpotIndex);
    job.key = pickRandomKey();
    job.hits = 0;
    job.lastHitAt = 0;
    job.lastDecayAt = 0;
}

function isReady(player) {
    return !!(player && mp.players.exists(player) && player.getVariable('auth'));
}

function isConstructionPlayerActive(player) {
    if (!isReady(player)) return false;
    if (player.dimension !== 0) return false;
    if (player.getVariable('dead') === true) return false;
    return true;
}

function ensureNearConstructionNpc(player) {
    if (player && mp.players.exists(player) && player.dimension === 0 && dist2d(player.position, CONSTRUCTION_NPC_POS) <= 4.5) {
        return true;
    }
    notify(player, 2, 'Подойдите к прорабу.', 3000);
    return false;
}

function isNearTaskSpot(player, job) {
    const spot = CONSTRUCTION_WORK_SPOTS[job.spotIndex];
    if (!spot || !player || !mp.players.exists(player)) return false;
    return dist2d(player.position, spot) <= 3.2;
}

function ensureNearTaskSpot(player, job) {
    if (isNearTaskSpot(player, job)) return true;
    notify(player, 2, 'Подойдите к красной зоне на стройке.', 3000);
    return false;
}

function stopJob(player, opts) {
    const o = opts || {};
    if (!player) return;
    const st = Number(player.static);
    if (!activeByStatic.has(st) && !player._constructionJob) return;
    activeByStatic.delete(st);
    player._constructionJob = null;
    try { player.setVariable('constructionJob', false); } catch (_e) {}
    pushConstructionSync(player, null);
    if (!o.silent) notify(player, 1, 'Смена на стройке завершена.', 3500);
}

try {
    if (typeof global.spawnFrozenPed === 'function') {
        global.spawnFrozenPed('csb_g', [CONSTRUCTION_NPC_POS.x, CONSTRUCTION_NPC_POS.y, CONSTRUCTION_NPC_POS.z], CONSTRUCTION_NPC_HEADING);
    } else {
        global.creatorPedsNew(mp.joaat('csb_g'), CONSTRUCTION_NPC_POS, {
            dynamic: false,
            invincible: true,
            frozen: true,
            heading: CONSTRUCTION_NPC_HEADING
        });
    }
} catch (_ePed) {}

try {
    global.creatorLabelsNew('Прораб (E)', new mp.Vector3(CONSTRUCTION_NPC_POS.x, CONSTRUCTION_NPC_POS.y, CONSTRUCTION_NPC_POS.z + 1.15), {
        font: 4,
        color: [255, 255, 255, 255],
        drawDistance: 14,
        scale: [1.15, 1.15],
        outline: true,
        outlineColor: [0, 0, 0, 255]
    });
    global.creatorMarkersNew(1, new mp.Vector3(CONSTRUCTION_NPC_POS.x, CONSTRUCTION_NPC_POS.y, CONSTRUCTION_NPC_POS.z - 1.0), 1.0, {
        color: global.INTERACT_CYLINDER_COLOR || [255, 255, 0, 180],
        visible: true,
        dimension: 0
    });
} catch (_eMark) {}

mp.events.add('playerEnterColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player) || colshape !== constructionNpcCol) return;
        if (player.dimension !== 0 || !player.getVariable('auth')) return;
        player.setVariable('constructionNpc', true);
        player.call('construction:nearNpc', [true]);
        if (typeof global.showInteractHint === 'function') global.showInteractHint(player, true);
    } catch (e) {
        console.log('[construction] enter', e);
    }
});

mp.events.add('playerExitColshape', (player, colshape) => {
    try {
        if (!mp.players.exists(player) || colshape !== constructionNpcCol) return;
        player.setVariable('constructionNpc', false);
        player.call('construction:nearNpc', [false]);
        if (typeof global.showInteractHint === 'function') global.showInteractHint(player, false);
    } catch (e) {
        console.log('[construction] exit', e);
    }
});

mp.events.add('construction:start:server', (player) => {
    try {
        if (!isConstructionPlayerActive(player)) return;
        if (player.vehicle) return notify(player, 2, 'Выйдите из транспорта.', 2500);
        if (!ensureNearConstructionNpc(player)) return;

        const st = Number(player.static);
        if (activeByStatic.has(st)) {
            return notify(player, 2, 'Вы уже на смене. Идите к красной метке.', 3500);
        }

        const job = { spotIndex: pickRandomSpotIndex(-1), key: pickRandomKey(), hits: 0, lastHitAt: 0, lastDecayAt: 0 };
        activeByStatic.set(st, job);
        player._constructionJob = job;
        player.setVariable('constructionJob', true);

        pushConstructionSync(player, job);
        notify(player, 3, 'Смена начата. Идите к красной зоне на карте.', 4500);
        try { player.call('sound:client', [3]); } catch (_s) {}
    } catch (e) {
        console.log('[construction:start:server]', e);
    }
});

mp.events.add('construction:stop:server', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (!ensureNearConstructionNpc(player)) return;
        if (!activeByStatic.has(Number(player.static)) && !player._constructionJob) {
            return notify(player, 2, 'Вы не работаете на стройке.', 2500);
        }
        stopJob(player);
    } catch (e) {
        console.log('[construction:stop:server]', e);
    }
});

mp.events.add('construction:hit:server', (player, keyRaw) => {
    try {
        if (!isConstructionPlayerActive(player)) return;
        if (player.vehicle) return;

        const st = Number(player.static);
        const job = activeByStatic.get(st) || player._constructionJob;
        if (!job) return;

        const key = String(keyRaw || '').trim().toUpperCase();
        if (!CONSTRUCTION_KEYS.includes(key)) return;
        if (key !== job.key) return;

        if (!ensureNearTaskSpot(player, job)) return;

        const now = Date.now();
        if (job.lastHitAt && now - job.lastHitAt < CONSTRUCTION_HIT_COOLDOWN_MS) return;
        job.lastHitAt = now;
        job.lastDecayAt = 0;
        job.hits += 1;

        if (job.hits < CONSTRUCTION_HITS_REQUIRED) {
            pushConstructionSync(player, job);
            return;
        }

        let reward = getConstructionTaskPay(player);
        if (typeof global.applyServerX2Amount === 'function') {
            reward = global.applyServerX2Amount(reward);
        }
        if (typeof global.givemoney === 'function') global.givemoney(player, reward);
        addConstructionSkillXp(player, 1);

        notify(player, 3, `+${formatMoney(reward)}$`, 2500);
        try { player.call('sound:client', [3]); } catch (_s) {}

        const prevSpot = job.spotIndex;
        assignNewTask(job, prevSpot);
        pushConstructionSync(player, job);
    } catch (e) {
        console.log('[construction:hit:server]', e);
    }
});

mp.events.add('playerDeath', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        stopJob(player, { silent: true });
    } catch (_e) {}
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        const st = Number(player.static);
        activeByStatic.delete(st);
        player._constructionJob = null;
    } catch (_e) {}
});

setInterval(() => {
    try {
        const now = Date.now();
        mp.players.forEach((player) => {
            if (!player || !mp.players.exists(player)) return;
            const job = player._constructionJob || activeByStatic.get(Number(player.static));
            if (!job || job.hits <= 0) return;
            if (!job.lastHitAt || now - job.lastHitAt < CONSTRUCTION_DECAY_IDLE_MS) return;
            if (!isConstructionPlayerActive(player)) return;
            if (!isNearTaskSpot(player, job)) return;

            const lastDecay = job.lastDecayAt || job.lastHitAt;
            if (now - lastDecay < CONSTRUCTION_DECAY_STEP_MS) return;

            job.lastDecayAt = now;
            job.hits = Math.max(0, job.hits - 1);
            pushConstructionSync(player, job);
        });
    } catch (e) {
        console.log('[construction] decay', e);
    }
}, 180);
