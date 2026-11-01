/** Не трогать native (position/call/weapon) если сущность уже снята — иначе ACCESS_VIOLATION. */
global.isPlayerEntityValid = function (player) {
    try {
        return !!(player && typeof player === 'object' && mp.players.exists(player));
    } catch (_e) {
        return false;
    }
};

global.getFracName = function(query) {
    const fracnames = {
        1: "Ballas",
        2: "Families",
        3: "Bloods",
        4: "Vagos",
        5: "Marabunta",
        6: "FIB"
    };
    return fracnames[query];
};

/** Некоторые сборки/обёртки шлют (player, killer, reason) вместо (player, reason, killer). */
global.normalizePlayerDeathArgs = function(reason, killer) {
    let r = reason;
    let k = killer;
    try {
        if (k != null && typeof k === 'object' && mp.players.exists(k)) {
            return { reason: r, killer: k };
        }
    } catch (_e) {}
    try {
        if (r != null && typeof r === 'object' && mp.players.exists(r)) {
            return { reason: k, killer: r };
        }
    } catch (_e2) {}
    return { reason: r, killer: k };
};

/**
 * Итоговый убийца для логов/киллфида.
 * При кастомном уроне (applyDamageTo) RageMP часто не даёт killer — берём из pending hit / хитмаркера.
 * Вызов: resolveDeathKiller(victim, killer) или для совместимости resolveDeathKiller(killer).
 */
global.resolveDeathKiller = function(victim, killer) {
    if (arguments.length === 1) {
        killer = victim;
        victim = null;
    }
    if (killer != null) {
        try {
            if (typeof killer === 'object' && mp.players.exists(killer)) return killer;
        } catch (_e) {}
        const id = typeof killer === 'number' ? killer : killer && killer.id != null ? killer.id : null;
        if (id != null && id >= 0) {
            try {
                const p = mp.players.at(id);
                if (p && mp.players.exists(p)) return p;
            } catch (_e2) {}
        }
    }
    if (victim && mp.players.exists(victim)) {
        if (typeof global.peekPendingAttackerForVictim === 'function') {
            try {
                const p = global.peekPendingAttackerForVictim(victim);
                if (p && p !== victim) return p;
            } catch (_e) {}
        }
        const hid = victim._lastHitAttackerFromHitmarkerId;
        const ht = victim._lastHitAttackerFromHitmarkerAt;
        if (hid != null && typeof ht === 'number' && Date.now() - ht < 45000) {
            try {
                const p = mp.players.at(hid);
                if (p && mp.players.exists(p) && p !== victim) return p;
            } catch (_e2) {}
        }
    }
    return null;
};

/**
 * RageMP часто вызывает playerDeath дважды за одно убийство (applyDamageTo).
 * Несколько обработчиков (logs, killlist) вызываются подряд за ОДНО событие — все должны отработать.
 * Повторное событие в течение окна — отсекаем (деньги, киллфид, очки).
 */
(function initPvpDeathDedupe() {
    const PVP_DEATH_DEDUP_MS = 4500;
    const pvpDeathLastWave = new Map();
    let pvpDeathSameEventLock = null;

    global.pvpDeathShouldProcessRewards = function (victim, killer) {
        try {
            if (!victim || !killer || !mp.players.exists(victim) || !mp.players.exists(killer)) return true;
            if (victim === killer) return true;
            const vs = victim.static;
            const ks = killer.static;
            if (vs == null || ks == null) return true;
            const key = `${vs}:${ks}`;
            const now = Date.now();

            if (pvpDeathSameEventLock && pvpDeathSameEventLock.key === key) {
                return true;
            }

            const prev = pvpDeathLastWave.get(key);
            if (prev != null && now - prev < PVP_DEATH_DEDUP_MS) {
                return false;
            }

            pvpDeathLastWave.set(key, now);
            pvpDeathSameEventLock = { key };
            const clear = typeof setImmediate !== 'undefined' ? setImmediate : function (fn) { setTimeout(fn, 0); };
            clear(function () {
                if (pvpDeathSameEventLock && pvpDeathSameEventLock.key === key) {
                    pvpDeathSameEventLock = null;
                }
            });

            if (pvpDeathLastWave.size > 3000) {
                const cut = now - PVP_DEATH_DEDUP_MS;
                for (const [k, t] of pvpDeathLastWave) {
                    if (t < cut) pvpDeathLastWave.delete(k);
                }
            }
        } catch (_e) {
            return true;
        }
        return true;
    };
})();

global.isAdminRestrictedOnCapt = function(player) {
    if (!mp.players.exists(player)) return false;
    if (typeof global.isPlayerInCaptOrBizwarPrep === 'function' && global.isPlayerInCaptOrBizwarPrep(player)) {
        return true;
    }
    if (player.getVariable('inCapt') !== true && player.getVariable('inBizwar') !== true) return false;
    const fromVar = Number(player.getVariable('adminTrueLvl'));
    const legacy = Number(player.adminlvl) || 0;
    const trueLv = Number.isFinite(fromVar) && fromVar > 0 ? fromVar : legacy;
    return trueLv >= 1 && trueLv < 8;
};

/** Игрок на арене капта или бизвара (телепортирован в бой). */
global.isPlayerInCaptOrBizwarArena = function(player) {
    if (!mp.players.exists(player)) return false;
    const dim = player.dimension;
    if (player.getVariable('inCapt') === true && dim >= 2000 && dim <= 2050) return true;
    if (player.getVariable('inBizwar') === true && dim >= 3000 && dim <= 3128) return true;
    return false;
};

/** Фаза подготовки (8 мин) на арене капта/бизвара. */
global.isPlayerInCaptOrBizwarPrep = function(player) {
    if (!global.isPlayerInCaptOrBizwarArena(player)) return false;
    return player.getVariable('captFrozen') === true || player.getVariable('bizwarFrozen') === true;
};

const CAPT_BIZWAR_DEF_COOLDOWN_MS = 10 * 60 * 1000;
global.CAPT_BIZWAR_DEF_COOLDOWN_MS = CAPT_BIZWAR_DEF_COOLDOWN_MS;
global.gangZoneDefCooldowns = global.gangZoneDefCooldowns || {};

/** Парсинг static из аргумента команды. */
global.parseStaticArg = function parseStaticArg(raw) {
    if (raw == null || raw === '') return null;
    const n = parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

/**
 * Найти онлайн-игрока по static (аккаунт # из чата).
 * opts.fallbackSessionId — если не найден по static, попробовать mp.players.at (старый session id).
 */
global.findOnlinePlayerByStatic = function findOnlinePlayerByStatic(staticOrRaw, opts) {
    opts = opts && typeof opts === 'object' ? opts : {};
    const n = global.parseStaticArg(staticOrRaw);
    if (n == null) return null;

    let found = null;
    mp.players.forEach((p) => {
        if (!mp.players.exists(p) || !p.getVariable('auth')) return;
        if (Number(p.static) === n) found = p;
    });
    if (found) return found;

    if (opts.fallbackSessionId) {
        try {
            const p = mp.players.at(n);
            if (p && mp.players.exists(p) && p.getVariable('auth')) return p;
        } catch (_e) {}
    }
    return null;
};

/** Синхронизация RageMP player.id на клиент (в чате — серверный id, на клиенте player.id другой). */
global.syncPlayerMpIdVar = function syncPlayerMpIdVar(player) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.setVariable('mpId', player.id);
    } catch (_e) {}
};

/** @deprecated Спанк и запив доступны всем фракциям, включая FIB. */
global.isFactionSpankAlcoForbidden = function () {
    return false;
};

/** Игрок во фракции FIB (6). */
global.isPlayerFibFaction = function (player) {
    if (!player || !mp.players.exists(player)) return false;
    const fr = parseInt(player.getVariable('fraction'), 10);
    return fr === 6;
};

(function patchAddCommandCaptAdminLock() {
    const allowedWhileCaptAdmin = new Set(['fam', 'gfam', 'glfam', 'lfamily', 'c']);
    const orig = mp.events.addCommand.bind(mp.events);
    global._registeredChatCommands = global._registeredChatCommands || new Map();
    mp.events.addCommand = function captAwareAddCommand(name, handler) {
        if (typeof handler !== 'function') return orig(name, handler);
        const wrapped = function captCommandWrapper(player) {
            if (!allowedWhileCaptAdmin.has(String(name)) && global.isAdminRestrictedOnCapt(player)) {
                player.outputChatBox('!{#CC5500}[ВОЙНА СЕМЕЙ] В войне семей админ-команды недоступны.');
                return;
            }
            return handler.apply(this, arguments);
        };
        global._registeredChatCommands.set(String(name).toLowerCase(), wrapped);
        return orig(name, wrapped);
    };
})();