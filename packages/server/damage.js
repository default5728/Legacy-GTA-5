if (!global.lastSpankDamageTime) global.lastSpankDamageTime = new Map();

const SPANK_BUFF_DURATION = 60000; // 60 сек
const spankBuffExpiry = new Map(); // playerId -> expiryTimestamp

// --- Alcohol/Спанк damage reduction buffs ---
const alcoholBuffExpiry = new Map();  // playerId -> expiryTimestamp
const ALCOHOL_BUFF_DURATION = 120000; // 120 сек

function hasAlcoholBuff(player) {
    const expiry = alcoholBuffExpiry.get(player.id);
    return expiry && Date.now() < expiry;
}

function hasSpankBuff(player) {
    const expiry = spankBuffExpiry.get(player.id);
    return expiry && Date.now() < expiry;
}

const alcoholBuffClearTimers = new Map();
const spankBuffClearTimers = new Map();

function setAlcoholResistSynced(player, active) {
    if (!player || !mp.players.exists(player)) return;
    try { player.setVariable('alcoResist', !!active); } catch (_e) {}
    try { player.call('setAlcoholResistStatus', [!!active]); } catch (_e) {}
}

function setSpankResistSynced(player, active) {
    if (!player || !mp.players.exists(player)) return;
    try { player.setVariable('spankResist', !!active); } catch (_e) {}
    try { player.call('setSpankResistStatus', [!!active]); } catch (_e) {}
}

function clearAlcoholBuffTimer(playerId) {
    const prev = alcoholBuffClearTimers.get(playerId);
    if (prev) clearTimeout(prev);
    alcoholBuffClearTimers.delete(playerId);
}

function clearSpankBuffTimer(playerId) {
    const prev = spankBuffClearTimers.get(playerId);
    if (prev) clearTimeout(prev);
    spankBuffClearTimers.delete(playerId);
}

function scheduleAlcoholBuffClear(player, ms) {
    clearAlcoholBuffTimer(player.id);
    const timer = setTimeout(() => {
        alcoholBuffClearTimers.delete(player.id);
        alcoholBuffExpiry.delete(player.id);
        setAlcoholResistSynced(player, false);
    }, ms);
    alcoholBuffClearTimers.set(player.id, timer);
}

function scheduleSpankBuffClear(player, ms) {
    clearSpankBuffTimer(player.id);
    const timer = setTimeout(() => {
        spankBuffClearTimers.delete(player.id);
        spankBuffExpiry.delete(player.id);
        setSpankResistSynced(player, false);
    }, ms);
    spankBuffClearTimers.set(player.id, timer);
}

global.breakSpankBuffOnHit = function (player) {
    if (!player || !mp.players.exists(player)) return false;
    if (!hasSpankBuff(player)) return false;
    clearSpankBuffTimer(player.id);
    spankBuffExpiry.delete(player.id);
    setSpankResistSynced(player, false);
    try { player.setVariable('spankResist', false); } catch (_e) {}
    try { player.call('activateSpankBuff', [0]); } catch (_e) {}
    try { isNotify(player, 2, 'top-mid', 'Спанк сбит ударом/пулей.', 2500); } catch (_e) {}
    return true;
};

/** Сброс алко/spank резистов (смерть, возрождение, больница, самореан, фракция). */
global.clearConsumableResists = function clearConsumableResists(player, opts) {
    if (!player || !mp.players.exists(player)) return;
    opts = opts && typeof opts === 'object' ? opts : {};

    if (opts.cancelSpankUse !== false && typeof global.cancelSpankConsumableUse === 'function') {
        global.cancelSpankConsumableUse(player, false);
    }

    const alc = alcoholTimers.get(player.id);
    if (alc) {
        clearInterval(alc);
        alcoholTimers.delete(player.id);
    }
    clearAlcoholBuffTimer(player.id);
    clearSpankBuffTimer(player.id);
    spankBuffExpiry.delete(player.id);
    alcoholBuffExpiry.delete(player.id);
    setSpankResistSynced(player, false);
    setAlcoholResistSynced(player, false);

    try {
        player.call('clearConsumableResists:c');
    } catch (_e) {}
};

/** GTA5RP: алкоголь 40%, spank 20%, вместе 52%.
 *  Алко/spank-резист не действует, пока надет бронежилет — только после его снятия/выбивания. */
function getConsumableResistFraction(player) {
    const hasAlco = hasAlcoholBuff(player);
    const hasSpank = hasSpankBuff(player);
    let frac = 0;
    let armorOn = false;
    try {
        if (player && ((Number(player.armour) || 0) > 0 || player.getVariable('armor') === true)) {
            armorOn = true;
        }
    } catch (_e) {
        armorOn = false;
    }
    if (!armorOn) {
        if (hasAlco && hasSpank) frac = 0.52;
        else if (hasAlco) frac = 0.4;
        else if (hasSpank) frac = 0.2;
    }
    return frac;
}

/** ГМ (/gm), noclip (fly), зелёная зона, щит после возрождения — входящий урон не применяется. */
const REVIVE_SHIELD_MS = 3000;
const reviveShieldTimers = new Map();

function isPlayerReviveShieldActive(player) {
    if (!player || !mp.players.exists(player)) return false;
    return player.getVariable('reviveShield') === true;
}

global.applyReviveSpawnShield = function applyReviveSpawnShield(player, durationMs) {
    if (!player || !mp.players.exists(player)) return;
    const ms = Math.max(0, Number(durationMs) || REVIVE_SHIELD_MS);
    const prev = reviveShieldTimers.get(player.id);
    if (prev) clearTimeout(prev);
    player.setVariable('reviveShield', true);
    const timer = setTimeout(() => {
        reviveShieldTimers.delete(player.id);
        try {
            if (mp.players.exists(player)) player.setVariable('reviveShield', false);
        } catch (_e) {}
    }, ms);
    reviveShieldTimers.set(player.id, timer);
};

global.clearReviveSpawnShield = function clearReviveSpawnShield(player) {
    if (!player) return;
    const prev = reviveShieldTimers.get(player.id);
    if (prev) {
        clearTimeout(prev);
        reviveShieldTimers.delete(player.id);
    }
    try {
        if (mp.players.exists(player)) player.setVariable('reviveShield', false);
    } catch (_e) {}
};

function isPlayerGreenZoneProtected(player) {
    if (typeof global.isPlayerGreenZoneDamageProtected === 'function') {
        return global.isPlayerGreenZoneDamageProtected(player);
    }
    return player.getVariable('greenzones') === true && player.getVariable('gzAntiGrace') !== true;
}

function isPlayerDamageImmune(player) {
    if (!player || !mp.players.exists(player)) return false;
    if (player.getVariable('gm') === true) return true;
    if (player.getVariable('fly') === true) return true;
    if (isPlayerGreenZoneProtected(player)) return true;
    if (isPlayerReviveShieldActive(player)) return true;
    return false;
}

// --- Alcohol countdown timer ---
const alcoholTimers = new Map(); // playerId -> interval

function startAlcoholCountdown(player, totalSec) {
    const existing = alcoholTimers.get(player.id);
    if (existing) clearInterval(existing);
    const secTotal = Math.max(1, Math.floor(Number(totalSec) || Math.floor(ALCOHOL_BUFF_DURATION / 1000)));
    let sec = secTotal;
    const interval = setInterval(() => {
        if (!player || !mp.players.exists(player)) {
            clearInterval(interval);
            alcoholTimers.delete(player && player.id);
            return;
        }
        sec--;
        try { player.call('hudSetAlcoholTimer', [sec]); } catch (_e) {}
        if (sec <= 0) {
            clearInterval(interval);
            alcoholTimers.delete(player.id);
        }
    }, 1000);
    alcoholTimers.set(player.id, interval);
}

// --- playerDamage handler для обоих эффектов ---
/** Макс. урон за удар холодным оружием. Кулаки проходят общие проверки урона. */
const MAX_MELEE_HIT_DAMAGE = 25;
const WEAPON_UNARMED_HASH = mp.joaat('weapon_unarmed');
const MAX_CLOSE_BUTTSTOCK_DAMAGE = 35;
const MELEE_WEAPON_HASHES = new Set([
    mp.joaat('weapon_unarmed'),
    mp.joaat('weapon_nightstick'),
    mp.joaat('weapon_bat'),
    mp.joaat('weapon_hammer'),
    mp.joaat('weapon_crowbar'),
    mp.joaat('weapon_golfclub'),
    mp.joaat('weapon_bottle'),
    mp.joaat('weapon_dagger'),
    mp.joaat('weapon_hatchet'),
    mp.joaat('weapon_knuckle'),
    mp.joaat('weapon_machete'),
    mp.joaat('weapon_flashlight'),
    mp.joaat('weapon_switchblade'),
    mp.joaat('weapon_poolcue'),
    mp.joaat('weapon_wrench'),
    mp.joaat('weapon_battleaxe'),
    mp.joaat('weapon_stone_hatchet')
]);
const pendingHitAttacker = new Map(); // victimServerId -> { attackerServerId, at }

const PENDING_ATTACKER_MAX_AGE_MS = 45000;

global.peekPendingAttackerForVictim = function(victim) {
    try {
        if (!victim || !mp.players.exists(victim)) return null;
        const pending = pendingHitAttacker.get(victim.id);
        if (!pending || Date.now() - pending.at > PENDING_ATTACKER_MAX_AGE_MS) return null;
        const att = mp.players.at(pending.attackerServerId);
        if (!att || !mp.players.exists(att) || att === victim) return null;
        return att;
    } catch (_e) {
        return null;
    }
};

mp.events.add('damage:registerHit', (player, targetRemoteId) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const targetId = parseInt(targetRemoteId, 10);
        if (!Number.isInteger(targetId) || targetId < 0) return;
        const target = mp.players.at(targetId);
        if (!target || !mp.players.exists(target) || target === player) return;
        pendingHitAttacker.set(target.id, { attackerServerId: player.id, at: Date.now() });
    } catch (e) {}
});

mp.events.add('damage:customRegIncoming', (player) => {
    if (!player || !mp.players.exists(player)) return;
    player._customRegIncomingAt = Date.now();
});

// Жертва сообщает урон → сервер пересылает стрелку для хитмаркера (урон уже с резистом на клиенте)
mp.events.add('hitmarker:notify', (victim, shooterRemoteId, damage, isHead) => {
    try {
        if (!victim || !mp.players.exists(victim)) return;
        if (isPlayerDamageImmune(victim)) return;
        const shooterId = parseInt(shooterRemoteId, 10);
        if (!Number.isFinite(shooterId) || shooterId < 0) return;
        const shooter = mp.players.at(shooterId);
        if (!shooter || !mp.players.exists(shooter) || shooter === victim) return;
        if (typeof global.isPlayerAnimCombatLocked === 'function' && global.isPlayerAnimCombatLocked(shooter)) return;
        if (isPlayerReviveShieldActive(shooter)) return;
        const dmg = Math.max(1, Math.round(Number(damage) || 0));
        if (typeof global.markPlayerRecentCombatDamage === 'function') {
            try {
                global.markPlayerRecentCombatDamage(victim);
            } catch (_e) {}
        }
        victim._lastHitAttackerFromHitmarkerId = shooter.id;
        victim._lastHitAttackerFromHitmarkerAt = Date.now();
        pendingHitAttacker.set(victim.id, { attackerServerId: shooter.id, at: Date.now() });
        // Отправляем стрелку хитмаркер с координатами жертвы — гарантия отрисовки,
        // если локальный outgoingDamage на клиенте стрелка не сработал (капт/бизвар).
        // 7-й аргумент isForward=1 — клиент дедуплицирует этот форвард с локальным
        // outgoingDamage (тот же хит), чтобы хитмаркер не двоился на большом пинге.
        try {
            const vp = victim.position;
            const victimRemoteId = typeof victim.remoteId === 'number' ? victim.remoteId : victim.id;
            shooter.call('showHitmarker', [dmg, !!isHead, victimRemoteId, vp.x, vp.y, vp.z, 1]);
        } catch (_e) {}
        if (typeof global.captCombatStatsRecordHit === 'function') {
            try { global.captCombatStatsRecordHit(shooter, victim, dmg, !!isHead); } catch (_e) {}
        }
    } catch (e) {}
});

mp.events.add('playerDamage', (player, healthLoss, armorLoss, attacker, weaponHash) => {
    if (!player || player.health <= 0) return;

    const whNumEarly = Number(weaponHash) >>> 0;
    if (whNumEarly === (WEAPON_UNARMED_HASH >>> 0)) {
        if (
            attacker &&
            mp.players.exists(attacker) &&
            attacker !== player &&
            typeof global.isSpankConsumableUsePending === 'function' &&
            global.isSpankConsumableUsePending(player) &&
            typeof global.cancelSpankConsumableUse === 'function'
        ) {
            try { global.cancelSpankConsumableUse(player, true); } catch (_eUnarmedCancel) {}
        }
        if (
            attacker &&
            mp.players.exists(attacker) &&
            attacker !== player &&
            typeof global.breakSpankBuffOnHit === 'function'
        ) {
            try { global.breakSpankBuffOnHit(player); } catch (_eUnarmedSpank) {}
        }
    }

    if (
        typeof global.shouldBlockFibMatsSupplyDamage === 'function' &&
        global.shouldBlockFibMatsSupplyDamage(player, attacker, weaponHash)
    ) {
        const hl = Number(healthLoss) || 0;
        const al = Number(armorLoss) || 0;
        if (hl > 0 || al > 0) {
            try {
                if (hl > 0) player.health = Math.min(100, (Number(player.health) || 0) + hl);
                if (al > 0) player.armour = Math.min(100, (Number(player.armour) || 0) + al);
            } catch (_eImm) {}
            setTimeout(() => {
                try {
                    if (!player || !mp.players.exists(player)) return;
                    if (
                        typeof global.shouldBlockFibMatsSupplyDamage === 'function' &&
                        !global.shouldBlockFibMatsSupplyDamage(player, attacker, weaponHash)
                    ) {
                        return;
                    }
                    if (player.health <= 0) player.health = 100;
                    else if (hl > 0) player.health = Math.min(100, player.health + hl);
                    if (al > 0) player.armour = Math.min(100, (Number(player.armour) || 0) + al);
                } catch (_e) {}
            }, 0);
        }
        return;
    }

    if (attacker && mp.players.exists(attacker) && isPlayerReviveShieldActive(attacker)) {
        return;
    }

    if (
        attacker &&
        mp.players.exists(attacker) &&
        attacker !== player &&
        typeof global.isSameBattleTeam === 'function' &&
        global.isSameBattleTeam(attacker, player)
    ) {
        const hl = Number(healthLoss) || 0;
        const al = Number(armorLoss) || 0;
        if (hl > 0 || al > 0) {
            setTimeout(() => {
                try {
                    if (!player || !mp.players.exists(player) || player.health <= 0) return;
                    if (hl > 0) player.health = Math.min(100, player.health + hl);
                    if (al > 0) player.armour = Math.min(100, (Number(player.armour) || 0) + al);
                } catch (_e) {}
            }, 0);
        }
        return;
    }

    if (attacker && mp.players.exists(attacker)) {
        const alAtt = Number(attacker.adminlvl) || 0;
        if (
            alAtt >= 1 &&
            alAtt <= 7 &&
            attacker.getVariable('adminSession') === true &&
            attacker.getVariable('fly') !== true
        ) {
            const hl = Number(healthLoss) || 0;
            const al = Number(armorLoss) || 0;
            if (hl > 0 || al > 0) {
                setTimeout(() => {
                    try {
                        if (!player || !mp.players.exists(player) || player.health <= 0) return;
                        if (hl > 0) player.health = Math.min(100, player.health + hl);
                        if (al > 0) player.armour = Math.min(100, (Number(player.armour) || 0) + al);
                    } catch (_e) {}
                }, 0);
            }
            return;
        }
    }

    // Нельзя наносить урон в анимациях сдачи (руки вверх / за спину и т.п.)
    if (attacker && mp.players.exists(attacker) && typeof global.isPlayerAnimCombatLocked === 'function' && global.isPlayerAnimCombatLocked(attacker)) {
        const hl = Number(healthLoss) || 0;
        const al = Number(armorLoss) || 0;
        if (hl > 0 || al > 0) {
            setTimeout(() => {
                try {
                    if (!player || !mp.players.exists(player) || player.health <= 0) return;
                    if (hl > 0) player.health = Math.min(100, player.health + hl);
                    if (al > 0) player.armour = Math.min(100, (Number(player.armour) || 0) + al);
                } catch (_e) {}
            }, 0);
        }
        try {
            attacker.removeAllWeapons();
        } catch (_e2) {}
        return;
    }

    if (isPlayerDamageImmune(player)) {
        const hl = Number(healthLoss) || 0;
        const al = Number(armorLoss) || 0;
        if (hl > 0 || al > 0) {
            setTimeout(() => {
                try {
                    if (!player || !mp.players.exists(player) || player.health <= 0) return;
                    if (!isPlayerDamageImmune(player)) return;
                    if (hl > 0) player.health = Math.min(100, player.health + hl);
                    if (al > 0) player.armour = Math.min(100, (Number(player.armour) || 0) + al);
                } catch (_e) {}
            }, 0);
        }
        return;
    }

    const hlIncoming = Number(healthLoss) || 0;
    const alIncoming = Number(armorLoss) || 0;
    if (
        (hlIncoming > 0 || alIncoming > 0) &&
        typeof global.isSpankConsumableUsePending === 'function' &&
        global.isSpankConsumableUsePending(player) &&
        !MELEE_WEAPON_HASHES.has(Number(weaponHash))
    ) {
        if (typeof global.cancelSpankConsumableUse === 'function') {
            global.cancelSpankConsumableUse(player, true);
        }
    }

    // Спанк-буфф (активный, после приёма таблетки) сбивается при получении урона от
    // реального атакующего: убираем резист и останавливаем хил от спанка.
    if (
        attacker &&
        mp.players.exists(attacker) &&
        attacker !== player &&
        (hlIncoming > 0 || alIncoming > 0) &&
        typeof global.breakSpankBuffOnHit === 'function'
    ) {
        try { global.breakSpankBuffOnHit(player); } catch (_eSb) {}
    }

    let displayDamage = Math.max(0, hlIncoming + alIncoming);

    // Ограничиваем урон ближнего боя (не кулаки — они заблокированы выше).
    const whNum = Number(weaponHash) >>> 0;
    const isMelee =
        MELEE_WEAPON_HASHES.has(Number(weaponHash)) ||
        MELEE_WEAPON_HASHES.has(whNum) ||
        MELEE_WEAPON_HASHES.has(whNum | 0);
    if (healthLoss > MAX_MELEE_HIT_DAMAGE && isMelee) {
        const restoreHp = healthLoss - MAX_MELEE_HIT_DAMAGE;
        displayDamage = Math.max(0, displayDamage - restoreHp);
        setTimeout(() => {
            if (player && player.health > 0) {
                player.health = Math.min(100, player.health + restoreHp);
            }
        }, 25);
    }

    // Удары прикладом/тычки в упор иногда приходят как высокий урон от огнестрела.
    // Ограничиваем только аномально высокий "контактный" урон вблизи.
    if (
        attacker &&
        mp.players.exists(attacker) &&
        Number(healthLoss) > MAX_CLOSE_BUTTSTOCK_DAMAGE &&
        Number(healthLoss) >= 50 &&
        !MELEE_WEAPON_HASHES.has(Number(weaponHash))
    ) {
        const dist = attacker.dist(player.position);
        if (dist <= 2.8) {
            const restoreHp = healthLoss - MAX_CLOSE_BUTTSTOCK_DAMAGE;
            displayDamage = Math.max(0, displayDamage - restoreHp);
            setTimeout(() => {
                if (player && player.health > 0) {
                    player.health = Math.min(100, player.health + restoreHp);
                }
            }, 25);
        }
    }

    const customRegHandled =
        player._customRegIncomingAt &&
        Date.now() - player._customRegIncomingAt < 350;
    const resistFrac = getConsumableResistFraction(player);
    if (resistFrac > 0 && healthLoss > 0 && !customRegHandled) {
        const restored = Math.max(1, Math.round(healthLoss * resistFrac));
        displayDamage = Math.max(0, displayDamage - restored);
        setTimeout(() => {
            if (player && player.health > 0) {
                player.health = Math.min(100, player.health + restored);
            }
        }, 50);
    }

    global.lastSpankDamageTime.set(player.id, Date.now());

    const hitHl = Number(healthLoss) || 0;
    const hitAl = Number(armorLoss) || 0;
    if ((hitHl > 0 || hitAl > 0) && typeof global.markPlayerRecentCombatDamage === 'function') {
        try {
            global.markPlayerRecentCombatDamage(player);
        } catch (_e) {}
    }

    if (attacker && mp.players.exists(attacker) && (hitHl > 0 || hitAl > 0) && typeof global.arenaTrackDamage === 'function') {
        try {
            global.arenaTrackDamage(attacker, player, hitHl + hitAl);
        } catch (_eArenaDmg) {}
    }

    if (player.health <= 0 && !player.getVariable('dead') && !isPlayerDamageImmune(player)) {
        setTimeout(() => {
            try {
                if (!player || !mp.players.exists(player)) return;
                if (player.getVariable('dead')) return;
                if (isPlayerDamageImmune(player)) return;
                if (player.health > 0) return;
                player.health = 0;
                player.armour = 0;
            } catch (_e) {}
        }, 0);
    }
});

mp.events.add('playerDeath', (player) => {
    // Резист (алкоголь/spank) не сбрасываем — таймер баффа идёт до конца.
    try { player.setVariable('armorComp', null); } catch(e) {}
});

mp.events.add('playerQuit', (player) => {
    const alc = alcoholTimers.get(player.id);
    if (alc) {
        clearInterval(alc);
        alcoholTimers.delete(player.id);
    }
    clearAlcoholBuffTimer(player.id);
    clearSpankBuffTimer(player.id);
    spankBuffExpiry.delete(player.id);
    alcoholBuffExpiry.delete(player.id);
    pendingHitAttacker.delete(player.id);
    if (typeof global.clearReviveSpawnShield === 'function') {
        global.clearReviveSpawnShield(player);
    }
});

/* Экспортируем буфф‑контроллеры наружу — чтобы хендлеры useDrink/useSpank
 * (в inventory_equipment.js / других файлах) могли активировать резисты. */
global.applyAlcoholBuff = function (player, durationSec) {
    if (!player || !mp.players.exists(player)) return;
    const sec = Math.max(1, Math.floor(Number(durationSec) || Math.floor(ALCOHOL_BUFF_DURATION / 1000)));
    const ms = sec * 1000;
    alcoholBuffExpiry.set(player.id, Date.now() + ms);
    setAlcoholResistSynced(player, true);
    try { player.call('activateAlcoBuff', [sec]); } catch(e) {}
    scheduleAlcoholBuffClear(player, ms);
};

global.applyAlcoholBuffMs = function (player, durationMs) {
    if (!player || !mp.players.exists(player)) return;
    const ms = Math.max(1000, Number(durationMs) || ALCOHOL_BUFF_DURATION);
    const sec = Math.max(1, Math.floor(ms / 1000));
    alcoholBuffExpiry.set(player.id, Date.now() + ms);
    setAlcoholResistSynced(player, true);
    try { player.call('activateAlcoBuff', [sec]); } catch (_e) {}
    scheduleAlcoholBuffClear(player, ms);
};

global.applySpankBuff = function (player, durationSec) {
    if (!player || !mp.players.exists(player)) return;
    const sec = Math.max(1, Math.floor(Number(durationSec) || Math.floor(SPANK_BUFF_DURATION / 1000)));
    const ms = sec * 1000;
    spankBuffExpiry.set(player.id, Date.now() + ms);
    setSpankResistSynced(player, true);
    try { player.call('activateSpankBuff', [sec]); } catch(e) {}
    scheduleSpankBuffClear(player, ms);
};

const BONG_BUFF_DURATION = 240000;
global.applyBongBuff = function (player) {
    if (!player || !mp.players.exists(player)) return;
    spankBuffExpiry.set(player.id, Date.now() + BONG_BUFF_DURATION);
    setSpankResistSynced(player, true);
    try { player.call('activateBongBuff'); } catch(e) {}
    scheduleSpankBuffClear(player, BONG_BUFF_DURATION);
};

global.hasSpankBuffActive = hasSpankBuff;
global.getSpankBuffRemainingMs = function (player) {
    if (!player || !mp.players.exists(player)) return 0;
    const expiry = spankBuffExpiry.get(player.id);
    if (!expiry) return 0;
    return Math.max(0, expiry - Date.now());
};
global.getSpankBuffRemainingSec = function (player) {
    const ms = global.getSpankBuffRemainingMs(player);
    if (ms <= 0) return 0;
    return Math.max(1, Math.ceil(ms / 1000));
};
global.getAlcoholBuffRemainingMs = function (player) {
    if (!player || !mp.players.exists(player)) return 0;
    const expiry = alcoholBuffExpiry.get(player.id);
    if (!expiry) return 0;
    return Math.max(0, expiry - Date.now());
};
global.getAlcoholBuffRemainingSec = function (player) {
    const ms = global.getAlcoholBuffRemainingMs(player);
    if (ms <= 0) return 0;
    return Math.max(1, Math.ceil(ms / 1000));
};
global.syncConsumableResistsToClient = function syncConsumableResistsToClient(player) {
    if (!player || !mp.players.exists(player)) return;
    const spankSec = global.getSpankBuffRemainingSec(player);
    const alcoSec = global.getAlcoholBuffRemainingSec(player);
    if (spankSec > 0) {
        setSpankResistSynced(player, true);
        try { player.call('activateSpankBuff', [spankSec]); } catch (_e) {}
    }
    if (alcoSec > 0) {
        setAlcoholResistSynced(player, true);
        try { player.call('activateAlcoBuff', [alcoSec]); } catch (_e) {}
    }
};
global.markSpankBuffExpiry = function (player, durationMs) {
    if (!player || !mp.players.exists(player)) return;
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms <= 0) return;
    spankBuffExpiry.set(player.id, Date.now() + ms);
};
