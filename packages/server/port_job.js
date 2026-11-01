'use strict';

/**
 * Работа «Порт»: взять ящик без мини-игры → отнести → пройти мини-игру при сдаче.
 * Координаты и основная логика перенесены из FLOWRP (Jobs/Port.cs).
 */

const NPC_POS = new mp.Vector3(-456.76166, -2753.099, 6.0002184);
const NPC_HEADING = -41.739555;
const PICKUP_POS = new mp.Vector3(-430.29153, -2741.2053, 6.0002127);
const SELL_POS = new mp.Vector3(-461.50662, -2719.19, 6.0002127);

const CRATE_PAY = 2500;
const CRATE_PAY_PER_LEVEL = 250;
const PORT_SKILL_MAX = 10;
const PORT_SKILL_PER_LEVEL = 100;
const ATTACH_NAME = 'portCrate';
const MALE_HASH = mp.joaat('mp_m_freemode_01');
const FEMALE_HASH = mp.joaat('mp_f_freemode_01');
const PICKUP_RADIUS = 2.0;
const SELL_RADIUS = 2.1;
const NPC_RADIUS = 2.2;
const MINIGAME_TIMEOUT_MS = 25000;

try {
    global.creatorPedsNew(mp.joaat('s_m_y_airworker'), NPC_POS, {
        dynamic: false,
        invincible: true,
        frozen: true,
        heading: NPC_HEADING
    });
} catch (_ePed) {}

try {
    global.creatorLabelsNew('Прораб (E)', new mp.Vector3(NPC_POS.x, NPC_POS.y, NPC_POS.z + 1.05), {
        font: 4,
        color: [255, 255, 255, 255],
        drawDistance: 14,
        scale: [1.15, 1.15],
        outline: true,
        outlineColor: [0, 0, 0, 255]
    });
} catch (_eLab) {}

try {
    global.creatorMarkersNew(1, new mp.Vector3(PICKUP_POS.x, PICKUP_POS.y, PICKUP_POS.z - 1.0), 1.45, {
        color: [220, 38, 38, 210],
        visible: true,
        dimension: 0
    });
    global.creatorMarkersNew(1, new mp.Vector3(SELL_POS.x, SELL_POS.y, SELL_POS.z - 1.0), 1.45, {
        color: [220, 38, 38, 210],
        visible: true,
        dimension: 0
    });
    global.creatorLabelsNew('Взять ящик', new mp.Vector3(PICKUP_POS.x, PICKUP_POS.y, PICKUP_POS.z + 0.55), {
        font: 4,
        color: [255, 255, 255, 230],
        drawDistance: 12,
        scale: [0.9, 0.9],
        outline: true
    });
    global.creatorLabelsNew('Сдать ящик', new mp.Vector3(SELL_POS.x, SELL_POS.y, SELL_POS.z + 0.55), {
        font: 4,
        color: [255, 255, 255, 230],
        drawDistance: 12,
        scale: [0.9, 0.9],
        outline: true
    });
} catch (_eMark) {}

const npcCol = global.creatorShapeSphere(NPC_POS.x, NPC_POS.y, NPC_POS.z, NPC_RADIUS);
const pickupCol = global.creatorShapeSphere(PICKUP_POS.x, PICKUP_POS.y, PICKUP_POS.z, PICKUP_RADIUS);
const sellCol = global.creatorShapeSphere(SELL_POS.x, SELL_POS.y, SELL_POS.z, SELL_RADIUS);

function dist2d(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function cratePayForLevel(level) {
    const lv = Math.max(1, Math.min(PORT_SKILL_MAX, parseInt(level, 10) || 1));
    return CRATE_PAY + (lv - 1) * CRATE_PAY_PER_LEVEL;
}

function buildPortSkillFromXp(xp) {
    const k = Math.max(0, parseInt(xp, 10) || 0);
    const level = Math.min(PORT_SKILL_MAX, Math.floor(k / PORT_SKILL_PER_LEVEL) + 1);
    const progress = k % PORT_SKILL_PER_LEVEL;
    return [level, progress, PORT_SKILL_PER_LEVEL, PORT_SKILL_MAX];
}

function getPortSkillXp(player) {
    return Math.max(0, parseInt(player && player.portSkillXp, 10) || 0);
}

function getPortCratePay(player) {
    return cratePayForLevel(buildPortSkillFromXp(getPortSkillXp(player))[0]);
}

function savePortSkillXp(player) {
    if (!player || !player.static || !global.DB) return;
    const xp = getPortSkillXp(player);
    global.DB.query('UPDATE accounts SET port_skill_xp = ? WHERE static = ? LIMIT 1', [xp, player.static], () => {});
}

function addPortSkillXp(player, amount) {
    if (!player || !mp.players.exists(player)) return;
    const add = Math.max(1, parseInt(amount, 10) || 1);
    const prev = getPortSkillXp(player);
    const next = prev + add;
    player.portSkillXp = next;
    savePortSkillXp(player);
    const prevSkill = buildPortSkillFromXp(prev);
    const nextSkill = buildPortSkillFromXp(next);
    if (nextSkill[0] > prevSkill[0]) {
        notify(player, 3, `Навык Порт: уровень ${nextSkill[0]}. Теперь ${cratePayForLevel(nextSkill[0])}$ за ящик.`, 4000);
    }
    try {
        if (typeof global.pmRefreshMenuData === 'function') global.pmRefreshMenuData(player);
    } catch (_ePm) {}
}

function ensurePortSkillColumn() {
    const run = () => {
        if (!global.DB) return;
        global.DB.query(
            'ALTER TABLE accounts ADD COLUMN port_skill_xp INT NOT NULL DEFAULT 0',
            (err) => {
                if (err && err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_COLUMNNAME') {
                    console.log('[port] ALTER port_skill_xp:', err.code || err.message);
                }
            }
        );
    };
    if (typeof global.whenDbReady === 'function') global.whenDbReady(run);
    else setTimeout(run, 4000);
}

ensurePortSkillColumn();

global.buildPortSkillForMenu = function (player) {
    return buildPortSkillFromXp(getPortSkillXp(player));
};
global.getPortCratePay = getPortCratePay;
global.hydratePortSkill = function (player, row) {
    if (!player) return;
    player.portSkillXp = Math.max(0, parseInt(row && row.port_skill_xp, 10) || 0);
};

function notify(player, type, msg, ms) {
    if (typeof global.isNotify === 'function') global.isNotify(player, type, 'top-mid', msg, ms || 3000);
}

function isReady(player) {
    return !!(player && mp.players.exists(player) && player.getVariable('auth'));
}

function isWorking(player) {
    return !!(player && player._portOnWork);
}

function hasCrate(player) {
    return Number(player && player._portPackages) > 0;
}

function sendHud(player) {
    if (!isReady(player)) return;
    player.call('port:hud', [
        !!player._portOnWork,
        parseInt(player._portPayment, 10) || 0,
        hasCrate(player),
        getPortCratePay(player)
    ]);
}

function clearWaypoint(player) {
    try {
        player.call('port:waypoint', [0, 0, 0, '']);
    } catch (_e) {}
}

function attachCrate(player, on) {
    try {
        if (!player.addAttachment) return;
        if (on) {
            if (!player.hasAttachment || !player.hasAttachment(ATTACH_NAME)) {
                player.addAttachment(ATTACH_NAME, false);
            }
        } else if (player.hasAttachment && player.hasAttachment(ATTACH_NAME)) {
            player.addAttachment(ATTACH_NAME, true);
        }
    } catch (_e) {}
}

function playCarry(player) {
    try {
        player.playAnimation('anim@heists@box_carry@', 'idle', 1, 49);
    } catch (_e) {}
}

function stopAnim(player) {
    try {
        player.stopAnimation();
    } catch (_e) {}
}

function snapshotWorkClothes(player) {
    try {
        const c8 = player.getClothes(8);
        const c4 = player.getClothes(4);
        const c6 = player.getClothes(6);
        player._portClothesBackup = {
            undershirt: c8 && c8.drawable !== undefined ? { d: c8.drawable, t: c8.texture || 0 } : null,
            pants: c4 && c4.drawable !== undefined ? { d: c4.drawable, t: c4.texture || 0 } : null,
            shoes: c6 && c6.drawable !== undefined ? { d: c6.drawable, t: c6.texture || 0 } : null
        };
    } catch (_e) {
        player._portClothesBackup = null;
    }
}

function applyClothesBackup(player) {
    const b = player._portClothesBackup;
    player._portClothesBackup = null;
    if (!b) return false;
    try {
        if (b.undershirt) player.setClothes(8, b.undershirt.d, b.undershirt.t, 0);
        if (b.pants) player.setClothes(4, b.pants.d, b.pants.t, 0);
        if (b.shoes) player.setClothes(6, b.shoes.d, b.shoes.t, 0);
        return true;
    } catch (_e) {
        return false;
    }
}

function applyWorkClothes(player) {
    snapshotWorkClothes(player);
    try {
        const model = player.model;
        if (model === MALE_HASH) {
            player.setClothes(8, 59, 0, 0);
            player.setClothes(4, 0, 5, 0);
            player.setClothes(6, 48, 0, 0);
        } else if (model === FEMALE_HASH) {
            player.setClothes(8, 36, 0, 0);
            player.setClothes(4, 1, 5, 0);
            player.setClothes(6, 49, 0, 0);
        }
    } catch (_e) {}
}

function restoreClothes(player) {
    if (applyClothesBackup(player)) return;
    try {
        if (typeof global.reapplyPlayerClothesAfterShopClose === 'function') {
            global.reapplyPlayerClothesAfterShopClose(player);
        }
    } catch (_e) {}
}

global.restorePortWorkClothesIfNeeded = function (player) {
    try {
        if (!player || !player._portOnWork) return false;
        return applyClothesBackup(player);
    } catch (_e) {
        return false;
    }
};

function portStaticId(player) {
    if (!player) return 0;
    let sid = player.static;
    if (sid == null && typeof player.getVariable === 'function') {
        try { sid = player.getVariable('static'); } catch (_e) {}
    }
    return parseInt(sid, 10) || 0;
}

function creditPortMoney(player, amount) {
    const add = parseInt(amount, 10) || 0;
    if (add <= 0) return;
    const staticId = portStaticId(player);
    if (staticId && typeof global.economyAddMoney === 'function') {
        global.economyAddMoney(staticId, add);
        return;
    }
    if (player && mp.players.exists(player) && typeof global.givemoney === 'function') {
        global.givemoney(player, add);
        return;
    }
    if (staticId && global.DB) {
        global.DB.query(
            'UPDATE accounts SET money = GREATEST(0, CAST(money AS SIGNED) + ?) WHERE static = ?',
            [add, staticId],
            (err) => { if (err) console.log('[port] credit', err); }
        );
    }
}

function addShiftEarning(player, amount) {
    const add = parseInt(amount, 10) || 0;
    if (add <= 0 || !player) return;
    player._portPayment = (parseInt(player._portPayment, 10) || 0) + add;
    creditPortMoney(player, add);
    player._portCredited = (parseInt(player._portCredited, 10) || 0) + add;
}

function settlePortShiftPay(player) {
    if (!player) return 0;
    const earned = parseInt(player._portPayment, 10) || 0;
    const credited = parseInt(player._portCredited, 10) || 0;
    const due = Math.max(0, earned - credited);
    player._portPayment = 0;
    player._portCredited = 0;
    if (due > 0) creditPortMoney(player, due);
    return due;
}

function payOut(player, reasonNotify) {
    const amount = parseInt(player && player._portPayment, 10) || 0;
    settlePortShiftPay(player);
    if (reasonNotify && amount > 0) notify(player, 3, `+ ${amount}$`, 3500);
}

function clearMinigameTimer(player) {
    if (player._portMiniTimer) {
        try { clearTimeout(player._portMiniTimer); } catch (_e) {}
        player._portMiniTimer = null;
    }
}

function dropCrate(player) {
    player._portPackages = 0;
    player._portMinigame = false;
    try { player.setVariable('portCarrying', false); } catch (_eVar) {}
    clearMinigameTimer(player);
    attachCrate(player, false);
    stopAnim(player);
    try { player.call('port:freeze', [false]); } catch (_e) {}
}

function leaveWork(player, opts) {
    const o = opts || {};
    if (!isWorking(player)) return;
    if (hasCrate(player) && !o.force) {
        notify(player, 2, 'Сначала отнесите ящик.', 3500);
        return false;
    }
    dropCrate(player);
    player._portOnWork = false;
    player._portInPickup = false;
    restoreClothes(player);
    clearWaypoint(player);
    sendHud(player);
    if (!o.skipPay) payOut(player, false);
    else {
        player._portPayment = 0;
        player._portCredited = 0;
    }
    if (!o.silent) notify(player, 3, 'Вы закончили смену.', 3000);
    return true;
}

function joinWork(player) {
    player._portOnWork = true;
    player._portPackages = 0;
    player._portPayment = parseInt(player._portPayment, 10) || 0;
    player._portMinigame = false;
    applyWorkClothes(player);
    sendHud(player);
    notify(player, 3, 'Вы начали смену.', 3000);
}

function takeCrate(player) {
    if (!isReady(player) || !isWorking(player)) return;
    if (player.vehicle) return;
    if (player.getVariable('dead') === true) return;
    if (player.dimension !== 0) return;
    if (hasCrate(player) || player._portMinigame) return;
    const now = Date.now();
    if (player._portPickupAt && now - player._portPickupAt < 1200) return;
    player._portPickupAt = now;

    player._portPackages = 1;
    try { player.setVariable('portCarrying', true); } catch (_eVar) {}
    attachCrate(player, true);
    try {
        player.playAnimation('anim@mp_snowball', 'pickup_snowball', 1, 47);
    } catch (_e) {}
    setTimeout(() => {
        try {
            if (mp.players.exists(player) && hasCrate(player)) playCarry(player);
        } catch (_e2) {}
    }, 500);
    sendHud(player);
    notify(player, 3, 'Отнесите ящик на точку сдачи.', 3500);
}

function startSellMinigame(player) {
    if (!isReady(player) || !isWorking(player)) return;
    if (player.vehicle) return;
    if (player.getVariable('dead') === true || player.dimension !== 0) return;
    if (!hasCrate(player) || player._portMinigame) return;
    if (dist2d(player.position, SELL_POS) > 4.5) return;
    const now = Date.now();
    if (player._portSellAt && now - player._portSellAt < 1200) return;
    player._portSellAt = now;
    player._portMinigame = true;
    player.call('port:freeze', [true]);
    player.call('port:startMinigame');
    clearMinigameTimer(player);
    player._portMiniTimer = setTimeout(() => {
        if (!mp.players.exists(player)) return;
        if (!player._portMinigame) return;
        finishMinigame(player, false);
    }, MINIGAME_TIMEOUT_MS);
}

function finishMinigame(player, success) {
    if (!isReady(player) || !isWorking(player)) {
        if (player) {
            player._portMinigame = false;
            clearMinigameTimer(player);
        }
        try { player.call('port:freeze', [false]); } catch (_e) {}
        try { player.call('port:closeMinigame'); } catch (_e2) {}
        return;
    }
    if (!player._portMinigame) return;
    player._portMinigame = false;
    clearMinigameTimer(player);
    player.call('port:freeze', [false]);
    player.call('port:closeMinigame');

    if (!success) {
        dropCrate(player);
        notify(player, 2, 'Вы уронили ящик', 3000);
        sendHud(player);
        return;
    }

    completeDelivery(player);
}

function completeDelivery(player) {
    if (!isReady(player)) return;
    if (!isWorking(player)) {
        notify(player, 2, 'Сначала устройтесь на работу в порту.', 3000);
        return;
    }
    if (!hasCrate(player)) {
        notify(player, 2, 'У вас нет ящика.', 3000);
        return;
    }
    if (dist2d(player.position, SELL_POS) > 4.5) {
        notify(player, 2, 'Подойдите ближе к точке сдачи.', 2500);
        return;
    }
    const pay = getPortCratePay(player);
    addShiftEarning(player, pay);
    dropCrate(player);
    addPortSkillXp(player, 1);
    sendHud(player);
    notify(player, 3, 'Ящик сдан.', 3000);
}

mp.events.add('playerEnterColshape', (player, shape) => {
    try {
        if (!isReady(player) || player.dimension !== 0) return;
        if (shape === npcCol) {
            player._portNearNpc = true;
            player.call('port:nearNpc', [true]);
            sendHud(player);
        } else if (shape === pickupCol) {
            player._portInPickup = true;
            if (isWorking(player)) takeCrate(player);
        } else if (shape === sellCol) {
            player._portInSell = true;
            if (isWorking(player) && hasCrate(player)) startSellMinigame(player);
        }
    } catch (_e) {}
});

mp.events.add('playerExitColshape', (player, shape) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (shape === npcCol) {
            player._portNearNpc = false;
            player.call('port:nearNpc', [false]);
        } else if (shape === pickupCol) {
            player._portInPickup = false;
        } else if (shape === sellCol) {
            player._portInSell = false;
        }
    } catch (_e) {}
});

mp.events.add('port:joinWork', (player) => {
    try {
        if (!isReady(player)) return;
        if (player.dimension !== 0) return;
        if (player.vehicle) return notify(player, 2, 'Выйдите из транспорта.', 2500);
        if (player.getVariable('dead') === true) return;
        if (!player._portNearNpc && dist2d(player.position, NPC_POS) > 4.5) {
            notify(player, 2, 'Подойдите к прорабу.', 2500);
            return;
        }
        if (isWorking(player)) {
            notify(player, 2, 'Вы уже на смене.', 2500);
            return;
        }
        joinWork(player);
    } catch (e) {
        console.log('[port] joinWork', e);
    }
});

mp.events.add('port:leaveWork', (player) => {
    try {
        if (!isReady(player)) return;
        if (player.dimension !== 0) return;
        if (player.vehicle) return notify(player, 2, 'Выйдите из транспорта.', 2500);
        if (player.getVariable('dead') === true) return;
        if (!player._portNearNpc && dist2d(player.position, NPC_POS) > 4.5) {
            notify(player, 2, 'Подойдите к прорабу.', 2500);
            return;
        }
        if (!isWorking(player)) {
            notify(player, 2, 'Вы не работаете в порту.', 2500);
            return;
        }
        leaveWork(player);
    } catch (e) {
        console.log('[port] leaveWork', e);
    }
});

mp.events.add('port:minigameYes', (player) => {
    try {
        finishMinigame(player, true);
    } catch (e) {
        console.log('[port] minigameYes', e);
    }
});

mp.events.add('port:minigameNo', (player) => {
    try {
        finishMinigame(player, false);
    } catch (e) {
        console.log('[port] minigameNo', e);
    }
});

mp.events.add('playerDeath', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (!isWorking(player)) return;
        leaveWork(player, { force: true, silent: true });
    } catch (_e) {}
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        savePortSkillXp(player);
        settlePortShiftPay(player);
        if (player._portOnWork) dropCrate(player);
        player._portOnWork = false;
        player._portInPickup = false;
    } catch (_e) {}
});

console.log('[Port] job loaded');
