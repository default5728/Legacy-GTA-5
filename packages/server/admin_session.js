'use strict';

const crypto = require('crypto');

const GATED_MIN = 1;
const GATED_MAX = 7;

/** Команды, доступные без активной сессии (1–7 lvl). Дублирует allowlist капта + служебные. */
const ALLOWED_WITHOUT_ADMIN_SESSION = new Set([
    'ahelp', 'arank', 'aranks',
    'logadmin',
    'exitadmin',
    'fam',
    'gfam',
    'glfam',
    'lfamily',
    'c',
    'w',
    'try',
]);

global.hashAdminSessionPassword = function (plain) {
    return crypto.createHash('sha256').update(String(plain), 'utf8').digest('hex');
};

/** Сообщение в чат, если не хватает уровня админки (вместо тихого return). */
global.requireAdminLvl = function requireAdminLvl(player, minLvl, cmdName) {
    if (!player || !mp.players.exists(player)) return false;
    const lvl = Number(player.adminlvl) || 0;
    if (lvl >= Number(minLvl)) return true;
    const cmd = String(cmdName || 'команда').replace(/^\/+/, '');
    const msg = `!{#888888}Недостаточно прав. /${cmd} доступна с ${minLvl} уровня админки.`;
    if (typeof global.pushChatLineToPlayer === 'function') global.pushChatLineToPlayer(player, msg);
    else player.outputChatBox(msg);
    return false;
};

/** Статики владельцев проекта: полный обход защиты — могут применять команды к любому уровню админки. */
global.isAdminProtectionExempt = function (player) {
    if (!player) return false;
    const st = Number(player.static);
    if (st === 1 || st === 2 || st === 99 || st === 100) return true;
    // Максимальный (10) уровень админки = полные права владельца, не зависят от статика.
    return (Number(player.adminlvl) || 0) >= 10;
};

/** /givedp /givedpall /givemoney /givemoneyall — владельцы (static 1/2/99/100/105/425) или максимальный уровень админки. */
const GIVE_CURRENCY_CMD_STATICS = [1, 2, 99, 100, 105, 425];

global.canUseGiveCurrencyAdminCommands = function (player) {
    if (!player || !mp.players.exists(player)) return false;
    if ((Number(player.adminlvl) || 0) < 1) return false;
    if ((Number(player.adminlvl) || 0) >= 10) return true;
    return GIVE_CURRENCY_CMD_STATICS.indexOf(Number(player.static)) !== -1;
};

/** Защита цели: нельзя применять админ-команду к админу с уровнем >= твоего (онлайн цель). */
global.canAdminTargetPlayer = function (actor, target, cmdName) {
    if (!actor || !mp.players.exists(actor)) return false;
    if (!target || !mp.players.exists(target)) return false;
    if (global.isAdminProtectionExempt(actor)) return true;
    if (actor === target && (Number(actor.adminlvl) || 0) >= 10) return true;
    return global.canAdminActOnLevel(actor, Number(target.adminlvl) || 0, cmdName, Number(target.static) || 0);
};

/** Защита цели по уровню из БД (оффлайн / /makeadmin). targetStatic — статик цели для разрешения «сам себе». */
global.canAdminActOnLevel = function (actor, targetLvl, cmdName, targetStatic) {
    if (!actor || !mp.players.exists(actor)) return false;
    if (global.isAdminProtectionExempt(actor)) return true;
    const actorLvl = Number(actor.adminlvl) || 0;
    const tLvl = Number(targetLvl) || 0;
    if (tLvl >= 1 && tLvl >= actorLvl) {
        if (actorLvl >= 10 && targetStatic != null && Number(targetStatic) === Number(actor.static)) return true;
        const cmd = String(cmdName || 'команда').replace(/^\/+/, '');
        const msg = `!{#ef4444}Вы не можете использовать /${cmd} на администратора уровня ${tLvl} (ваш уровень ${actorLvl}).`;
        if (typeof global.pushChatLineToPlayer === 'function') global.pushChatLineToPlayer(actor, msg);
        else actor.outputChatBox(msg);
        return false;
    }
    return true;
};

global.adminSessionIsGated = function (player) {
    if (!player || !mp.players.exists(player)) return false;
    const al = Number(player.adminlvl) || 0;
    return al >= GATED_MIN && al <= GATED_MAX;
};

/** Права на публичный админ-тег в чате, админ-канал и команды (клиентский adminlvl > 0). */
global.hasAdminSessionPrivileges = function (player) {
    if (!player || !mp.players.exists(player)) return false;
    const al = Number(player.adminlvl) || 0;
    if (al < 1) return false;
    if (al > GATED_MAX) return true;
    return player._adminSession === true;
};

/** Админ-события с клиента: нужен реальный лвл + активная сессия у 1–7. */
global.requireAdminDuty = function (player, minLvl) {
    if (!player || !mp.players.exists(player)) return false;
    if (!player.getVariable('auth')) return false;
    const need = Math.max(1, Number(minLvl) || 1);
    if ((Number(player.adminlvl) || 0) < need) return false;
    return global.hasAdminSessionPrivileges(player);
};

/** Макс. уровень, который актор может ВЫДАТЬ (не себе). Владельцы 1/2 — до 10. Остальные строго ниже своего лвла. */
global.maxGrantableAdminLevel = function (actor) {
    if (global.isAdminProtectionExempt(actor)) return 10;
    const al = Number(actor && actor.adminlvl) || 0;
    return Math.max(0, Math.min(10, al - 1));
};

global.canGrantAdminLevel = function (actor, newLvl, silent) {
    if (!actor || !mp.players.exists(actor)) return false;
    const n = Math.floor(Number(newLvl));
    if (!Number.isFinite(n) || n < 0 || n > 10) {
        if (!silent) {
            const msg = '!{#ef4444}Некорректный уровень админки (0–10).';
            if (typeof global.pushChatLineToPlayer === 'function') global.pushChatLineToPlayer(actor, msg);
            else actor.outputChatBox(msg);
        }
        return false;
    }
    const maxLvl = global.maxGrantableAdminLevel(actor);
    if (n > maxLvl) {
        if (!silent) {
            const msg = `!{#ef4444}Вы не можете выдать уровень админки выше ${maxLvl} (ваш уровень ${Number(actor.adminlvl) || 0}).`;
            if (typeof global.pushChatLineToPlayer === 'function') global.pushChatLineToPlayer(actor, msg);
            else actor.outputChatBox(msg);
        }
        return false;
    }
    return true;
};

/** После выхода из полёта (F5): ГМ + запрет оружия в руках (только 1–7 в сессии). */
global.applyAdminDutyGroundMode = function (player, enable) {
    if (!player || !mp.players.exists(player)) return;
    const al = Number(player.adminlvl) || 0;
    if (al < GATED_MIN || al > GATED_MAX || player._adminSession !== true) {
        player.setVariable('adminDutyGround', false);
        player.setVariable('adminDutyNoWeapon', false);
        return;
    }
    if (enable) {
        player.setVariable('adminDutyGround', true);
        player.setVariable('adminDutyNoWeapon', true);
        player.setVariable('gm', true);
        if (typeof global.clearGameplayArmorEquippedState === 'function') {
            global.clearGameplayArmorEquippedState(player);
        }
        try {
            player.armour = 0;
        } catch (_ar) {}
    } else {
        player.setVariable('adminDutyGround', false);
        player.setVariable('adminDutyNoWeapon', false);
        player.setVariable('gm', false);
    }
};

/** Отложенный вход в NoClip по /onc */
function clearAdminOncTimer(player) {
    try {
        if (!player) return;
        if (player._oncTimer) {
            clearTimeout(player._oncTimer);
            player._oncTimer = null;
        }
        player._oncPending = false;
    } catch (_e) {}
}

global.syncAdminSessionClient = function (player) {
    if (!player || !mp.players.exists(player)) return;
    const trueLv = Number(player.adminlvl) || 0;
    player.setVariable('adminTrueLvl', trueLv);
    const gated = global.adminSessionIsGated(player);
    const sessionActive = !gated || player._adminSession === true;
    player.setVariable('adminSession', sessionActive);
    const effectiveLvl = gated && !player._adminSession ? 0 : trueLv;
    player.setVariable('adminlvl', effectiveLvl);
    const capability=permission=>{const base=require('./legacy/staff-policy').has(effectiveLvl,permission);return effectiveLvl>0&&(typeof global.legacyStaffPermission==='function'?global.legacyStaffPermission(player,permission,base):base);};
    const flowAllowed=capability('flow.panel');
    player.setVariable('flowPanelAccess',flowAllowed);
    player.call('adminPanel:accessChanged',[flowAllowed]);
    player.call('adminPanel:setAdminLevel',[trueLv]);
    player.call('adminPanel:setCapabilities',[{money:effectiveLvl>=8&&capability('money.manage'),dp:effectiveLvl>=10}]);
    if(typeof global.refreshLegacyPanelState==='function')global.refreshLegacyPanelState(player);
    if (gated && !player._adminSession) {
        clearAdminOncTimer(player);
        player.setVariable('adminDutyGround', false);
        player.setVariable('adminDutyNoWeapon', false);
        player.setVariable('gm', false);
        if (player.getVariable('fly') === true) {
            try {
                player.call('adminSession:setFly', [false]);
            } catch (_flyOff) {}
            player.setVariable('fly', false);
        }
    }
    try {
        player.call('chat:syncChannels');
    } catch (_e) {}
    if (typeof global.syncChatCmdHintsForPlayer === 'function') global.syncChatCmdHintsForPlayer(player);
    else {
        try {
            player.call('cef:setAdminCmdHints', [global.buildChatCmdHintsJson(player) || '[]']);
        } catch (_e2) {}
    }
};

/**
 * Телепорт на капт / войну семей: полный выход из админки (сессия, полёт, ГМ, панель)
 * и снятие redname, если он был включён.
 */
global.forceExitAdminForCombat = function forceExitAdminForCombat(player) {
    if (!player || !mp.players.exists(player)) return false;
    const trueLv = Number(player.getVariable('adminTrueLvl')) || Number(player.adminlvl) || 0;
    if (trueLv < 1) return false;

    let changed = false;

    if (player.spSpectateActive) {
        player.spSpectateActive = false;
        player.spSpectateTargetStatic = null;
        player.spSpectateSavedPos = null;
        try { player.call('admin:spmode', [null, false]); } catch (_eSpec) {}
        changed = true;
    }

    if (player.getVariable('fly') === true) {
        try { player.call('adminSession:setFly', [false]); } catch (_eFly) {}
        player.setVariable('fly', false);
        changed = true;
    }

    if (player.getVariable('amenu') === true) {
        player.setVariable('amenu', false);
        changed = true;
    }

    try {
        player.alpha = 255;
        player.setVariable('invisible', 255);
    } catch (_eVis) {}

    player._adminPassPrompt = null;
    if (global.adminSessionIsGated(player) && player._adminSession === true) {
        player._adminSession = false;
        changed = true;
    }

    if (typeof global.syncAdminSessionClient === 'function') {
        global.syncAdminSessionClient(player);
    }

    if (player.getVariable('adminDutyGround') === true || player.getVariable('adminDutyNoWeapon') === true || player.getVariable('gm') === true) {
        changed = true;
    }
    player.setVariable('adminDutyGround', false);
    player.setVariable('adminDutyNoWeapon', false);
    player.setVariable('gm', false);

    if (player.getVariable('redname') === true) {
        if (typeof global.saveRednameToAccount === 'function') {
            global.saveRednameToAccount(player, false);
        } else {
            player.redname = false;
            player.setVariable('redname', false);
        }
        changed = true;
    }

    try { player.call('capt:forceAdminLock'); } catch (_eLock) {}

    if (changed && typeof global.isNotify === 'function') {
        global.isNotify(player, 1, 'top-mid', 'Админ-режим сброшен: вы на территории боя.', 4000);
    }
    return true;
};

global.applyAdminSessionOnAuth = function (player) {
    if (!player || !mp.players.exists(player)) return;
    player._adminSession = false;
    player._adminPassPrompt = null;
    global.syncAdminSessionClient(player);
};

(function patchAddCommandAdminSessionLock() {
    const orig = mp.events.addCommand.bind(mp.events);
    global._registeredChatCommands = global._registeredChatCommands || new Map();
    mp.events.addCommand = function adminSessionAwareAddCommand(name, handler) {
        if (typeof handler !== 'function') return orig(name, handler);
        const wrapped = function adminSessionCommandWrapper(player) {
            if (!mp.players.exists(player)) return;
            if (player.getVariable('jail') === true) return;
            const commandName=String(name).toLowerCase();
            const permission=typeof global.legacyCommandPermission==='function'&&global.legacyCommandPermission(commandName);
            if(permission&&!require('./legacy/access').hasPermission(player,permission))return;
            const al = Number(player.adminlvl) || 0;
            if (al >= GATED_MIN && al <= GATED_MAX && player._adminSession !== true) {
                if (!ALLOWED_WITHOUT_ADMIN_SESSION.has(String(name))) {
                    const msg = '!{#888888}Сначала введите пароль: /logadmin, затем в общий чат — пароль от админки.';
                    if (typeof global.pushChatLineToPlayer === 'function') global.pushChatLineToPlayer(player, msg);
                    else player.outputChatBox(msg);
                    return;
                }
            }
            return handler.apply(this, arguments);
        };
        global._registeredChatCommands.set(String(name).toLowerCase(), wrapped);
        return orig(name, wrapped);
    };
})();

mp.events.add('chat:execSlashCommand', (player, cmdLine) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (!player.getVariable('auth')) return;
        if (player.getVariable('jail') === true) return;
        const line = String(cmdLine || '').trim();
        if (!line) return;
        const parts = line.split(/\s+/);
        const name = parts[0].toLowerCase().replace(/^\/+/, '');
        if (!name) return;
        const handler = global._registeredChatCommands && global._registeredChatCommands.get(name);
        if (!handler) {
            const msg = '!{#888888}Неизвестная команда: /' + name;
            if (typeof global.pushChatLineToPlayer === 'function') global.pushChatLineToPlayer(player, msg);
            else player.outputChatBox(msg);
            return;
        }
        const args = parts.slice(1);
        const fullText = args.join(' ');
        handler(player, fullText, ...args);
    } catch (e) {
        console.log('[chat:execSlashCommand]', e);
    }
});

/**
 * Список для автодополнения в чате: { cmd, desc, minLvl }
 * minLvl — минимальный уровень админки из аккаунта (видно только при активной сессии).
 */
global.ADMIN_CMD_HINTS_LIST = [
    // 1 lvl
    { cmd: '/a', desc: 'Админ-чат: /a [текст]', minLvl: 1 },
    { cmd: '/ac', desc: 'Уведомления античита вкл/выкл', minLvl: 1 },
    { cmd: '/admins', desc: 'Список админов онлайн', minLvl: 1 },
    { cmd: '/arep', desc: 'Ответ на репорт: /arep [static] [текст]', minLvl: 1 },
    { cmd: '/exitadmin', desc: 'Выйти из админ-сессии', minLvl: 1 },
    { cmd: '/gethereveh', desc: 'ТС к себе: /gethereveh [id]', minLvl: 1 },
    { cmd: '/getstatic', desc: 'Инфо по статику: /getstatic [static]', minLvl: 1 },
    { cmd: '/gh', desc: 'Игрока к себе: /gh [static]', minLvl: 1 },
    { cmd: '/gotoveh', desc: 'ТП к ТС: /gotoveh [id]', minLvl: 1 },
    { cmd: '/gt', desc: 'ТП к игроку: /gt [static]', minLvl: 1 },
    { cmd: '/logadmin', desc: 'Войти в админ-сессию (пароль в чат)', minLvl: 1 },
    { cmd: '/pm', desc: 'ЛС игроку: /pm [static] [текст]', minLvl: 1 },
    { cmd: '/redname', desc: 'Метка [ADMIN] вкл/выкл', minLvl: 1 },
    { cmd: '/slap', desc: 'Подбросить игрока: /slap [static]', minLvl: 1 },
    { cmd: '/spec', desc: 'Наблюдение: /spec [static]', minLvl: 1 },
    { cmd: '/sync', desc: 'Синхронизация данных с БД', minLvl: 1 },
    { cmd: '/tpc', desc: 'ТП по координатам: /tpc [x] [y] [z] [dim]', minLvl: 1 },
    { cmd: '/unspec', desc: 'Выйти из наблюдения', minLvl: 1 },
    // 2 lvl
    { cmd: '/delveh', desc: 'Удалить ТС по ID: /delveh [id]', minLvl: 2 },
    { cmd: '/revive', desc: 'Воскресить игрока: /revive [CID]', minLvl: 4 },
    { cmd: '/res', desc: 'Воскресить игрока: /res [CID]', minLvl: 4 },
    { cmd: '/killaccess', desc: 'Доступ к /kill: /killaccess [CID] on|off (владелец)', minLvl: 10 },
    { cmd: '/heal', desc: 'Воскресить игрока: /heal [static]', minLvl: 2 },
    { cmd: '/kick', desc: 'Кикнуть игрока: /kick [static] [причина]', minLvl: 2 },
    { cmd: '/mute', desc: 'Выдать мут: /mute [static] [мин] [причина]', minLvl: 2 },
    { cmd: '/remveh', desc: 'Починить ТС: /remveh [id]', minLvl: 2 },
    { cmd: '/respawn', desc: 'Респавн в гангваре: /respawn [static]', minLvl: 2 },
    { cmd: '/respawnveh', desc: 'Респавн фракц. ТС: /respawnveh [id]', minLvl: 2 },
    { cmd: '/unmute', desc: 'Снять мут: /unmute [static]', minLvl: 2 },
    // 3 lvl
    { cmd: '/jail', desc: 'Деморган: /jail [static] [мин] [причина]', minLvl: 3 },
    { cmd: '/stopmp', desc: 'Закрыть ТП на мероприятие', minLvl: 3 },
    { cmd: '/unjail', desc: 'Выпустить из деморгана: /unjail [static]', minLvl: 3 },
    // 4 lvl
    { cmd: '/cc', desc: 'Очистить чат', minLvl: 4 },
    { cmd: '/checkfamily', desc: 'Инфо по семье: /checkfamily [имя]', minLvl: 4 },
    { cmd: '/checklogin', desc: 'Проверка по логину: /checklogin [login]', minLvl: 4 },
    { cmd: '/checksocial', desc: 'Проверка по Social ID: /checksocial [id]', minLvl: 4 },
    { cmd: '/checkstatic', desc: 'Инфо по статику: /checkstatic [static]', minLvl: 4 },
    { cmd: '/delallveh', desc: 'Удалить весь транспорт', minLvl: 6 },
    { cmd: '/dm', desc: 'Смена dimension: /dm [static] [dim]', minLvl: 4 },
    { cmd: '/engveh', desc: 'Двигатель ТС: /engveh [id] [on/off]', minLvl: 4 },
    { cmd: '/excar', desc: 'Взорвать ТС: /excar [id]', minLvl: 4 },
    { cmd: '/famlist', desc: 'Список семей', minLvl: 4 },
    { cmd: '/kill', desc: 'Убить игрока: /kill [ID] (личный доступ)', minLvl: 10 },
    { cmd: '/lockveh', desc: 'Замок ТС: /lockveh [id] [open/close]', minLvl: 4 },
    { cmd: '/offjail', desc: 'Оффлайн деморган: /offjail [static] [мин] [причина]', minLvl: 4 },
    { cmd: '/offmute', desc: 'Оффлайн мут: /offmute [static] [мин] [причина]', minLvl: 4 },
    { cmd: '/respawnallveh', desc: 'Респавн всех фракц. ТС', minLvl: 4 },
    { cmd: '/startmp', desc: 'Открыть мероприятие: /startmp [название]', minLvl: 4 },
    // 5 lvl
    { cmd: '/addfamterr', desc: 'Добавить территории семье', minLvl: 10 },
    { cmd: '/ban', desc: 'Бан: /ban [static] [дней] [причина]', minLvl: 5 },
    { cmd: '/check', desc: 'Проверка игрока (Discord)', minLvl: 5 },
    { cmd: '/amnesty', desc: 'Глобальная амнистия: снять все баны/хардбаны/муты/деморганы (только static 1–2)', minLvl: 10 },
    { cmd: '/clearallpoints', desc: 'Очистить все точки войны семей (только static 1–2)', minLvl: 10 },
    { cmd: '/clearallzones', desc: 'Обнулить все зоны каптов (только static 1–2)', minLvl: 10 },
    { cmd: '/clearallwars', desc: 'Обнулить точки семей + зоны каптов (только static 1–2)', minLvl: 10 },
    { cmd: '/cpromo', desc: 'Выдать промокод: /cpromo [static] [код]', minLvl: 5 },
    { cmd: '/discord', desc: 'Реклама Discord в чат', minLvl: 5 },
    { cmd: '/dpromo', desc: 'Удалить промокод: /dpromo [static]', minLvl: 5 },
    { cmd: '/drop', desc: 'Запустить дроп', minLvl: 5 },
    { cmd: '/freeze', desc: 'Заморозить игрока: /freeze [static]', minLvl: 5 },
    { cmd: '/gchat', desc: 'Глобальный мут чата: /gchat [true/false]', minLvl: 5 },
    { cmd: '/pmall', desc: 'Сообщение всем в чат: /pmall [текст]', minLvl: 5 },
    { cmd: '/resetpoint', desc: 'Сброс точки войны: /resetpoint [id] (влад./10 ур.)', minLvl: 10 },
    { cmd: '/sban', desc: 'Тихий бан: /sban [static] [дней] [причина]', minLvl: 5 },
    { cmd: '/setfamterr', desc: 'Территории семьи: /setfamterr [имя] [число]', minLvl: 10 },
    { cmd: '/setpoints', desc: 'Очки войны семей: /setpoints [число] (только static 1–2)', minLvl: 10 },
    { cmd: '/stopcheck', desc: 'Остановить проверку', minLvl: 5 },
    { cmd: '/sunban', desc: 'Тихий разбан: /sunban [static]', minLvl: 5 },
    { cmd: '/unban', desc: 'Снять бан: /unban [static]', minLvl: 5 },
    { cmd: '/unfreeze', desc: 'Разморозить: /unfreeze [static]', minLvl: 5 },
    // 6 lvl
    { cmd: '/checkpromo', desc: 'Проверить промокод: /checkpromo [код]', minLvl: 6 },
    { cmd: '/fakeban', desc: 'Фейковый бан в чат: /fakeban [static] [дней] [причина]', minLvl: 10 },
    { cmd: '/fakehardban', desc: 'Фейковый хардбан: /fakehardban [static] [причина]', minLvl: 10 },
    { cmd: '/givefracmats', desc: 'Выдать мат. фракции: /givefracmats [1–6] [кол-во]', minLvl: 10 },
    { cmd: '/givemedia', desc: 'Выдать медиа-статус: /givemedia [static]', minLvl: 6 },
    { cmd: '/newpromo', desc: 'Создать промокод: /newpromo [static] [код]', minLvl: 6 },
    { cmd: '/pos', desc: 'Показать координаты', minLvl: 6 },
    { cmd: '/setfrac', desc: 'Назначить фракцию: /setfrac [static] [0–6]', minLvl: 10 },
    { cmd: '/setleader', desc: 'Назначить лидера: /setleader [1–6] [static]', minLvl: 10 },
    { cmd: '/takefracmats', desc: 'Забрать мат. фракции: /takefracmats [1–6] [кол-во]', minLvl: 10 },
    // 7 lvl
    { cmd: '/delfamily', desc: 'Удалить семью: /delfamily [имя]', minLvl: 7 },
    { cmd: '/makeadmin', desc: 'Выдать/изменить админку: /makeadmin [static] [lvl]', minLvl: 7 },
    { cmd: '/sc', desc: 'Примерка одежды на себе', minLvl: 7 },
    { cmd: '/scprop', desc: 'Примерка prop: /scprop [0–7] dr tx', minLvl: 7 },
    { cmd: '/scproptx', desc: 'Число текстур prop: /scproptx [0–7] [drawable]', minLvl: 7 },
    { cmd: '/scprovar', desc: 'Число drawable для prop: /scprovar [0–7]', minLvl: 7 },
    { cmd: '/sctx', desc: 'Число текстур: /sctx [слот] [drawable]', minLvl: 7 },
    { cmd: '/scvar', desc: 'Варианты drawable слота: /scvar [0–11]', minLvl: 7 },
    { cmd: '/setgz', desc: 'Зелёные зоны on/off (кроме EMS)', minLvl: 7 },
    { cmd: '/setx2', desc: 'X2 PayDay, убийства, AirDrop on/off', minLvl: 7 },
    { cmd: '/von', desc: 'Включить голос: /von [static]', minLvl: 7 },
    { cmd: '/voff', desc: 'Выключить голос: /voff [static]', minLvl: 7 },
    // 8 lvl
    { cmd: '/makeup', desc: 'Макияж: /makeup [0–255]', minLvl: 8 },
    { cmd: '/removeleader', desc: 'Снять лидера: /removeleader [1–6]', minLvl: 8 },
    { cmd: '/setzone', desc: 'Цвет зоны гетто: /setzone [id] [фракция 0–6]', minLvl: 8 },
    { cmd: '/setcolour', desc: 'То же что /setzone', minLvl: 8 },
    { cmd: '/setcolor', desc: 'То же что /setzone', minLvl: 8 },
    { cmd: '/takemedia', desc: 'Снять медиа-статус: /takemedia [static]', minLvl: 8 },
    { cmd: '/removemedia', desc: 'Снять медиа-статус: /removemedia [static]', minLvl: 8 },
    { cmd: '/tpm', desc: 'ТП к метке на карте', minLvl: 8 },
    // 9 lvl
    { cmd: '/hardban', desc: 'Хардбан: /hardban [static] [причина]', minLvl: 9 },
    { cmd: '/hardunban', desc: 'Снять хардбан: /hardunban [static]', minLvl: 9 },
    { cmd: '/restart', desc: 'Рестарт сервера', minLvl: 9 },
    { cmd: '/shardban', desc: 'Тихий хардбан: /shardban [static] [причина]', minLvl: 9 },
    { cmd: '/shardunban', desc: 'Тихий разбан хардбана: /shardunban [static]', minLvl: 9 },
    // 10 lvl
    { cmd: '/gethereall', desc: 'Всех игроков к себе', minLvl: 10 },
    { cmd: '/givecar', desc: 'Выдать донатную машину: /givecar [static] [name]', minLvl: 10 },
    { cmd: '/givedp', desc: 'Выдать DP: /givedp [static] [кол-во] (владельцы)', minLvl: 10 },
    { cmd: '/givedpall', desc: 'DP всем: /givedpall [кол-во] (владельцы)', minLvl: 10 },
    { cmd: '/givemoney', desc: 'Выдать деньги: /givemoney [CID] [кол-во]', minLvl: 8 },
    { cmd: '/takemoney', desc: 'Снять деньги: /takemoney [CID] [кол-во]', minLvl: 8 },
    { cmd: '/givemoneyall', desc: 'Деньги всем: /givemoneyall [кол-во] (владельцы)', minLvl: 10 },
    { cmd: '/giveweapon', desc: 'Выдать оружие: /giveweapon [static] [weapon]', minLvl: 10 },
    { cmd: '/gm', desc: 'God Mode вкл/выкл', minLvl: 10 },
    { cmd: '/hideme', desc: 'Скрыть админ-статус', minLvl: 10 },
    { cmd: '/obnyl', desc: 'Обнулить аккаунт: /obnyl [static]', minLvl: 10 },
    { cmd: '/setcloth', desc: 'Одежда игроку: /setcloth [static] [comp] [dr] [tx]', minLvl: 10 },
    { cmd: '/setskin', desc: 'Скин игроку: /setskin [static] [model]', minLvl: 10 },
    { cmd: '/takecar', desc: 'Забрать машину: /takecar [static] [name]', minLvl: 10 },
    { cmd: '/takedp', desc: 'Забрать DP: /takedp [static] [кол-во]', minLvl: 10 },
    { cmd: '/takevip', desc: 'Снять VIP: /takevip [static]', minLvl: 10 },
    { cmd: '/takeweapon', desc: 'Забрать оружие: /takeweapon [static] [weapon]', minLvl: 10 },
    { cmd: '/tsc', desc: 'Редактор одежды (UI)', minLvl: 10 },
    { cmd: '/veh', desc: 'Создать транспорт: /veh [name] [color1] [color2] [номер]', minLvl: 10 },
    { cmd: '/whitelist', desc: 'Вайтлист вкл/выкл: /whitelist [on/off]', minLvl: 10 },
    { cmd: '/antiaim', desc: 'Антиаим игроку: /antiaim [static] [on/off] или /antiaim (список)', minLvl: 10 },
    { cmd: '/logger', desc: 'Логирование стрельбы: /logger [static] on|off | label 0|1', minLvl: 10 },
];

/** Команды подсказки для игроков (не в активной админ-сессии с полным списком). */
global.PLAYER_CHAT_CMD_HINTS_BASE = [
    { cmd: '/report', desc: 'Жалоба админам: /report [сообщение]' },
    { cmd: '/q', desc: 'Выход с сервера' },
    { cmd: '/c', desc: 'Очистить чат и показать подсказки сервера' },
    { cmd: '/g', desc: 'Чат голосового канала Brawl: /g [текст]' },
    { cmd: '/brawljoin', desc: 'Войти в канал Brawl: /brawljoin [канал] [пароль]' },
    { cmd: '/mp', desc: 'Телепорт на мероприятие (если открыто)' },
    { cmd: '/mypromo', desc: 'Свои промокоды и число активаций (ввод кода — F3 → Аккаунт)' },
    { cmd: '/delvip', desc: 'Снять свой VIP-статус' },
    { cmd: '/fam', desc: 'Чат семьи: /fam [сообщение]' },
    { cmd: '/glfam', desc: 'Глобальный чат семьи (лидер): /glfam [текст]' },
    { cmd: '/gfam', desc: 'Глобальный чат семьи (зам): /gfam [текст]' },
    { cmd: '/lfamily', desc: 'Список игроков вашей семьи онлайн' },
];

function normalizeChatHintCmd(cmd) {
    return String(cmd == null ? '' : cmd)
        .trim()
        .replace(/^\/+/, '')
        .trim();
}

function hintRowForJson(h) {
    const cmd = normalizeChatHintCmd(h.cmd);
    if (!cmd) return null;
    const row = { cmd, desc: String(h.desc || '') };
    if (h.minLvl !== undefined && h.minLvl !== null && !isNaN(Number(h.minLvl))) row.minLvl = Number(h.minLvl);
    return row;
}

global.buildChatCmdHintsJson = function (player) {
    if (!player || !mp.players.exists(player)) return '[]';
    const rows=new Map(global.PLAYER_CHAT_CMD_HINTS_BASE.map(hintRowForJson).filter(Boolean).map(row=>[row.cmd,row]));
    const add=row=>{const hint=hintRowForJson(row);if(hint)rows.set(hint.cmd,hint);};
    if(global.hasAdminSessionPrivileges(player)){
        for(const row of global.ADMIN_CMD_HINTS_LIST){
            const name=String(row.cmd).replace(/^\//,'');
            if(Number(row.minLvl)>Number(player.adminlvl))continue;
            if(row.allowedStatics?.length&&!row.allowedStatics.includes(Number(player.static)))continue;
            if(name==='killaccess'&&player._legacyAccountId!==3)continue;
            const permission=typeof global.legacyCommandPermission==='function'&&global.legacyCommandPermission(name);
            if(permission&&!require('./legacy/access').hasPermission(player,permission))continue;
            add(row);
        }
        for(const row of global.legacyAdministration?.catalogue?.(player)||[])add({cmd:'/'+row.name,desc:row.description});
        if(require('./legacy/access').hasPermission(player,'waypoint')){
            add({cmd:'/tpwp',desc:'Телепорт на метку на карте'});
            add({cmd:'/gotowp',desc:'Телепорт на метку на карте'});
        }
    }else if(global.adminSessionIsGated(player))add({cmd:'/logadmin',desc:'Вход в админ-сессию; также доступен через F6'});
    return JSON.stringify([...rows.values()]);
};

/** Обновить подсказки команд в чате и справке F6. */
global.syncChatCmdHintsForPlayer = function (player) {
    if (!player || !mp.players.exists(player)) return;
    const json = global.buildChatCmdHintsJson(player) || '[]';
    try {
        player.call('cef:setAdminCmdHints', [json]);
    } catch (_e) {}
    try {
        if (Number(player.adminlvl) >= 1 && player.getVariable('amenu') === true) {
            player.call('adminPanel:setCmdHints', [json]);
        }
    } catch (_e2) {}
};

/** @deprecated используйте buildChatCmdHintsJson */
global.buildAdminCmdHintsJson = global.buildChatCmdHintsJson;

mp.events.add('chat:requestCmdHints', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        global.syncChatCmdHintsForPlayer(player);
    } catch (_e) {}
});

function finishLoginSuccess(player, isNewPass) {
    clearAdminOncTimer(player);
    player._adminSession = true;
    player._adminPassPrompt = null;
    global.syncAdminSessionClient(player);
    if (isNewPass) {
        player.outputChatBox('!{#22c55e}Пароль админ-сессии установлен. Сохранён в БД (при необходимости смените вручную в БД).');
    }
    player.outputChatBox('!{#e8e8e8}Сессия активна. Полёт — F5, админ-панель — F6. Выйти из сессии — /exitadmin.');
}

const passwordAttempts=new WeakMap(),passwordBusy=new WeakSet();
function tryPasswordLogin(player,plain){
 if(!player||!mp.players.exists(player)||!player.getVariable('auth')||!global.adminSessionIsGated(player))return;
 const now=Date.now(),last=passwordAttempts.get(player)||0;if(passwordBusy.has(player)||now-last<2000)return;passwordAttempts.set(player,now);passwordBusy.add(player);
 const staticId=player.static,account=player._legacyAccountId,character=player._legacyCharacterId;
 const same=()=>mp.players.exists(player)&&player.static===staticId&&player._legacyAccountId===account&&player._legacyCharacterId===character&&global.adminSessionIsGated(player);
 const fail=text=>{if(mp.players.exists(player))player.call('legacy:panel:state',[JSON.stringify({type:'error',text})]);};
 if(typeof plain!=='string'||plain.length<6||plain.length>128){passwordBusy.delete(player);fail('Пароль: 6–128 символов.');return;}
 const hash=global.hashAdminSessionPassword(plain);
 global.DB.query('SELECT admin_session_pass FROM accounts WHERE static=? LIMIT 1',[staticId],(err,rows)=>{
  if(err||!same()||!rows?.[0]){passwordBusy.delete(player);if(err)fail('Не удалось проверить пароль. Повторите попытку.');return;}
  const stored=String(rows[0].admin_session_pass||'').trim();
  if(!stored){global.DB.query('UPDATE accounts SET admin_session_pass=? WHERE static=? AND (admin_session_pass IS NULL OR admin_session_pass=\'\')',[hash,staticId],(error,result)=>{passwordBusy.delete(player);if(!same())return;if(error||!result?.affectedRows){fail('Пароль не сохранён. Повторите вход.');return;}finishLoginSuccess(player,true);});return;}
  passwordBusy.delete(player);if(!/^[a-f0-9]{64}$/i.test(stored)||!crypto.timingSafeEqual(Buffer.from(stored.toLowerCase(),'hex'),Buffer.from(hash,'hex'))){fail('Неверный пароль.');return;}finishLoginSuccess(player,false);
 });
}

global.legacyPanelPasswordLogin=tryPasswordLogin;

function tryPasswordExit(player, plain) {
    const hashIn = global.hashAdminSessionPassword(plain);
    global.DB.query(
        'SELECT admin_session_pass FROM accounts WHERE static = ? LIMIT 1',
        [player.static],
        (err, rows) => {
            if (err || !player || !mp.players.exists(player)) return;
            const stored = rows && rows[0] && rows[0].admin_session_pass != null ? String(rows[0].admin_session_pass).trim() : '';
            if (!stored || stored !== hashIn) {
                player.outputChatBox('!{#ef4444}Неверный пароль. Сессия не сброшена.');
                return;
            }
            if (player.getVariable('fly') === true) {
                try {
                    player.call('adminSession:setFly', [false]);
                } catch (_e) {}
            }
            player._adminSession = false;
            player._adminPassPrompt = null;
            global.syncAdminSessionClient(player);
            player.outputChatBox('!{#888888}Вы вышли из админ-сессии. Админ-команды снова /logadmin.');
        }
    );
}

/** Вызывается из chat.js в начале playerChat. true — сообщение поглощено (пароль). */
global.tryAdminSessionPasswordChat = function (player, text) {
    try {
        if (!player || !mp.players.exists(player)) return false;
        const mode = player._adminPassPrompt;
        if (mode !== 'login' && mode !== 'exit') return false;
        if (!global.adminSessionIsGated(player)) {
            player._adminPassPrompt = null;
            return false;
        }
        const trimmed = String(text || '').trim();
        if (!trimmed) return true;
        player._adminPassPrompt = null;
        if (mode === 'login') tryPasswordLogin(player, trimmed);
        else tryPasswordExit(player, trimmed);
        return true;
    } catch (_e) {
        return false;
    }
};

mp.events.addCommand('logadmin', (player) => {
    if (!mp.players.exists(player)) return;
    const al = Number(player.adminlvl) || 0;
    if (al < 1) return;
    if (al > GATED_MAX) {
        return player.outputChatBox('!{#888888}Уровень 8: вход по паролю не требуется.');
    }
    if (player._adminSession === true) {
        return player.outputChatBox('!{#888888}Сессия уже активна. Выйти полностью: /exitadmin');
    }
    player._adminPassPrompt = 'login';
    player.outputChatBox('!{#cccccc}Введите пароль в чат.');
    player.outputChatBox('!{#aaaaaa}Просто напишите пароль от админки следующим сообщением в общий чат (без /).');
});

mp.events.addCommand('exitadmin', (player) => {
    if (!mp.players.exists(player)) return;
    const al = Number(player.adminlvl) || 0;
    if (al < 1 || al > GATED_MAX) {
        return player.outputChatBox('!{#888888}Команда только для администраторов 1–7 уровня (с сессией).');
    }
    if (player._adminSession !== true) {
        return player.outputChatBox('!{#888888}Сессия не активна.');
    }
    player._adminPassPrompt = 'exit';
    player.outputChatBox('!{#cccccc}Введите пароль в чат.');
    player.outputChatBox('!{#aaaaaa}Просто напишите пароль от админки следующим сообщением в общий чат (без /).');
});

mp.events.addCommand('offnc', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        const al = Number(player.adminlvl) || 0;
        if (al < 1) return;
        player.outputChatBox('!{#888888}Полёт переключается клавишей F5.');
    } catch (_e) {}
});

mp.events.addCommand('onc', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        const al = Number(player.adminlvl) || 0;
        if (al < 1) return;
        player.outputChatBox('!{#888888}Полёт переключается клавишей F5.');
    } catch (_e) {}
});

mp.events.addCommand('sync', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const al = Number(player.adminlvl) || 0;
        if (al < 1) return;
        player.outputChatBox('!{#888888}Синхронизация с базой данных…');
        global.DB.query(
            'SELECT money, dp, cases, armor_cases, gold_cases, kills, deaths, online, casetime FROM accounts WHERE static = ? LIMIT 1',
            [player.static],
            (err, rows) => {
                if (!mp.players.exists(player)) return;
                if (err || !rows || !rows[0]) {
                    player.outputChatBox('!{#ef4444}Не удалось загрузить данные аккаунта.');
                    return;
                }
                const r = rows[0];
                player.money = r.money;
                player.dp = r.dp;
                player.case = r.cases;
                player.armorCase = parseInt(r.armor_cases, 10) || 0;
                player.goldCase = parseInt(r.gold_cases, 10) || 0;
                player.kills = r.kills;
                player.deaths = r.deaths;
                player.onlineHours = parseInt(r.online, 10) || 0;
                player.casetime = parseInt(r.casetime, 10) || 0;
                try {
                    player.call('updateMoney', [global.formatnum1(player.money)]);
                    player.call('updatedp', [global.formatnum1(player.dp)]);
                    player.call('updatefreecase1', [global.formatnum1(player.case)]);
                    player.call('updatefreearmorcase1', [global.formatnum1(player.armorCase || 0)]);
                    player.call('setKillsStats', [player.kills, player.deaths, player.onlineHours]);
                    if (typeof global.pushLuckyWheelHud === 'function') global.pushLuckyWheelHud(player);
                } catch (_c) {}
                if (typeof global.loadInventory === 'function') global.loadInventory(player);
                setTimeout(() => {
                    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                    if (typeof global.hydratePlayerClothesFromDb === 'function') global.hydratePlayerClothesFromDb(player);
                }, 500);
                player.outputChatBox('!{#22c55e}Готово: профиль и инвентарь обновлены из БД.');
            }
        );
    } catch (_e) {}
});

mp.events.add('playerQuit', (player) => {
    clearAdminOncTimer(player);
});

let adminPassResetColumnReady = false;

function ensureAdminPassResetColumn(cb) {
    if (adminPassResetColumnReady) {
        if (typeof cb === 'function') cb();
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN admin_pass_reset_used TINYINT(1) NOT NULL DEFAULT 0',
        [],
        () => {
            adminPassResetColumnReady = true;
            if (typeof cb === 'function') cb();
        }
    );
}

function pushAdminPanelSettingsInfo(player, extra) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.call('adminPanel:settingsInfo', [JSON.stringify(extra || {})]);
    } catch (_e) {}
}

function buildAdminSettingsPayload(row, al) {
    if (al > GATED_MAX) {
        return {
            passResetAvailable: false,
            accountNote: 'Уровень 8+: пароль админ-сессии не используется. Сброс не требуется.',
        };
    }
    const used = row && Number(row.admin_pass_reset_used) === 1;
    const stored = row && row.admin_session_pass != null ? String(row.admin_session_pass).trim() : '';
    if (used) {
        return {
            passResetAvailable: false,
            accountNote: 'Одноразовый сброс пароля уже использован. Обратитесь к главному администратору для смены пароля в БД.',
        };
    }
    if (!stored) {
        return {
            passResetAvailable: false,
            accountNote: 'Пароль сессии ещё не задан. Введите /logadmin — следующим сообщением в чат задайте пароль.',
        };
    }
    return {
        passResetAvailable: true,
        accountNote: 'Одноразовый сброс пароля /logadmin. После сброса войдите снова — следующим сообщением задайте новый пароль. Повторный сброс недоступен.',
    };
}

mp.events.add('admin:settings:load:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const al = Number(player.adminlvl) || 0;
        if (al < 1) return;
        ensureAdminPassResetColumn(() => {
            if (al > GATED_MAX) {
                pushAdminPanelSettingsInfo(player, buildAdminSettingsPayload(null, al));
                return;
            }
            global.DB.query(
                'SELECT admin_session_pass, admin_pass_reset_used FROM accounts WHERE static = ? LIMIT 1',
                [player.static],
                (err, rows) => {
                    if (!mp.players.exists(player)) return;
                    const row = !err && rows && rows[0] ? rows[0] : null;
                    pushAdminPanelSettingsInfo(player, buildAdminSettingsPayload(row, al));
                }
            );
        });
    } catch (_e) {}
});

mp.events.add('admin:resetSessionPass:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const al = Number(player.adminlvl) || 0;
        if (al < 1) return;
        if (al > GATED_MAX) {
            return player.outputChatBox('!{#888888}Уровень 8+: пароль сессии не используется.');
        }
        if (!global.adminSessionIsGated(player)) {
            return player.outputChatBox('!{#888888}Сброс пароля недоступен.');
        }
        ensureAdminPassResetColumn(() => {
            global.DB.query(
                'SELECT admin_session_pass, admin_pass_reset_used FROM accounts WHERE static = ? LIMIT 1',
                [player.static],
                (err, rows) => {
                    if (err || !mp.players.exists(player)) {
                        return player.outputChatBox('!{#ef4444}Ошибка БД.');
                    }
                    const row = rows && rows[0];
                    const used = row && Number(row.admin_pass_reset_used) === 1;
                    const stored = row && row.admin_session_pass != null ? String(row.admin_session_pass).trim() : '';
                    if (used) {
                        pushAdminPanelSettingsInfo(player, buildAdminSettingsPayload(row, al));
                        return player.outputChatBox('!{#ef4444}Одноразовый сброс уже был использован.');
                    }
                    if (!stored) {
                        pushAdminPanelSettingsInfo(player, buildAdminSettingsPayload(row, al));
                        return player.outputChatBox('!{#888888}Пароль ещё не задан — задайте через /logadmin.');
                    }
                    global.DB.query(
                        'UPDATE accounts SET admin_session_pass = NULL, admin_pass_reset_used = 1 WHERE static = ?',
                        [player.static],
                        (e2) => {
                            if (e2 || !mp.players.exists(player)) {
                                return player.outputChatBox('!{#ef4444}Не удалось сбросить пароль.');
                            }
                            if (player._adminSession === true) {
                                if (player.getVariable('fly') === true) {
                                    try { player.call('adminSession:setFly', [false]); } catch (_f) {}
                                }
                                player._adminSession = false;
                                global.syncAdminSessionClient(player);
                            }
                            player._adminPassPrompt = null;
                            player.outputChatBox('!{#22c55e}Пароль сброшен. Введите /logadmin — следующим сообщением задайте новый пароль.');
                            isNotify(player, 3, 'top-mid', 'Пароль сессии сброшен (одноразово).', 4000);
                            pushAdminPanelSettingsInfo(player, buildAdminSettingsPayload(
                                { admin_session_pass: null, admin_pass_reset_used: 1 },
                                al
                            ));
                        }
                    );
                }
            );
        });
    } catch (_e) {}
});
