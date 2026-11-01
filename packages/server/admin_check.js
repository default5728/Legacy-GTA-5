const moment = require('moment-timezone');

const CHECK_DIM_MIN = 800000;
const CHECK_DIM_RANGE = 90000;

const checkByTarget = new Map();
const checkByAdmin = new Map();

function pickCheckDimension() {
    return CHECK_DIM_MIN + Math.floor(Math.random() * CHECK_DIM_RANGE);
}

function clearMaps(session) {
    checkByTarget.delete(String(session.targetStatic));
    checkByAdmin.delete(String(session.adminStatic));
}

function getTargetPlayer(staticId) {
    return mp.players.toArray().find((p) => p.static == staticId);
}

function getAdminPlayer(staticId) {
    return mp.players.toArray().find((p) => p.static == staticId);
}

function endCheckSession(session, options) {
    const skipTargetUi = options && options.skipTargetUi;

    const admin = getAdminPlayer(session.adminStatic);
    const target = getTargetPlayer(session.targetStatic);

    if (admin && mp.players.exists(admin)) {
        admin.dimension = session.prevAdminDim;
    }
    if (target && mp.players.exists(target)) {
        target.dimension = session.prevTargetDim;
        target.setVariable('adminCheckActive', false);
        if (!skipTargetUi) {
            target.call('adminCheck:hide');
        }
    }

    clearMaps(session);
}

function insertCheckRefusalBan(staticId, callback) {
    const ban_days = 9999;
    const reason = 'Отказ от проверки';
    const ban_date = moment().tz('Europe/Moscow').format('YYYY-MM-DD HH:mm:ss');
    const unban_date = moment().tz('Europe/Moscow').add(ban_days, 'days').format('YYYY-MM-DD HH:mm:ss');
    const admin_id = 'Система';

    global.DB.query('SELECT * FROM ban WHERE static = ? AND unban > NOW() LIMIT 1', [staticId], (err, results) => {
        if (err) {
            console.log(err);
            return typeof callback === 'function' && callback();
        }
        if (results.length) {
            return typeof callback === 'function' && callback();
        }
        global.DB.query('SELECT * FROM accounts WHERE static = ?', [staticId], (e2, acc) => {
            if (e2) {
                console.log(e2);
                return typeof callback === 'function' && callback();
            }
            if (!acc || !acc.length) {
                return typeof callback === 'function' && callback();
            }
            const login1 = acc[0].login;
            const adminlvldb = acc[0].adminlvl;
            if (adminlvldb >= 1) {
                return typeof callback === 'function' && callback();
            }
            global.DB.query(
                'INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                [staticId, ban_date, unban_date, admin_id, login1, reason],
                (e3) => {
                    if (e3) console.log(e3);
                    else {
                        global.sendDiscordLog(
                            `Выход во время проверки (автобан 9999 дн.)\n\nСтатик: ${staticId}\nЛогин: ${login1}\nПричина: ${reason}`,
                            '1266445805355532368'
                        );
                        try {
                            const targetPlayer = global.findOnlinePlayerByStatic
                                ? global.findOnlinePlayerByStatic(staticId)
                                : null;
                            if (global.banGuard && typeof global.banGuard.attachFingerprintsToBan === 'function') {
                                global.banGuard.attachFingerprintsToBan({
                                    staticId,
                                    login: login1,
                                    reason,
                                    admin: admin_id,
                                    banset: ban_date,
                                    unban: unban_date,
                                    onlinePlayer:
                                        targetPlayer && mp.players.exists(targetPlayer) ? targetPlayer : null
                                });
                            }
                        } catch (_fp) {}
                    }
                    typeof callback === 'function' && callback();
                }
            );
        });
    });
}

mp.events.addCommand('check', (player, _full, static_id, ...discordParts) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl < 5) {
            return player.outputChatBox('!{#888888}Недостаточно прав. Команда /check доступна с 5 уровня админки.');
        }

        const discordTag = (discordParts || []).join(' ').trim();
        if (!static_id || !discordTag) {
            return player.outputChatBox('Использование: /check [static] [Discord] — пример: /check 12 nickname');
        }

        const targetPlayer = getTargetPlayer(static_id);
        if (!targetPlayer || !mp.players.exists(targetPlayer)) {
            return player.outputChatBox('Игрок с таким статиком не найден на сервере.');
        }
        if (player === targetPlayer) {
            return player.outputChatBox('Нельзя вызвать на проверку самого себя.');
        }
        if (targetPlayer.getVariable('jail') === true) {
            return player.outputChatBox('Игрок в деморгане.');
        }
        if (targetPlayer.getVariable('testdriveone') || targetPlayer.getVariable('testdrivetwo')) {
            return player.outputChatBox('Игрок в режиме тестдрайва.');
        }
        if ((targetPlayer.adminlvl || 0) >= 1) {
            return player.outputChatBox('Нельзя вызывать на проверку администратора.');
        }
        if (checkByAdmin.has(String(player.static))) {
            return player.outputChatBox('Сначала завершите текущую проверку командой /stopcheck [static].');
        }
        if (checkByTarget.has(String(targetPlayer.static))) {
            return player.outputChatBox('Этот игрок уже находится на проверке.');
        }

        const prevAdminDim = player.dimension;
        const prevTargetDim = targetPlayer.dimension;

        const adminlogin = player.login;
        const login = targetPlayer.login;
        const dim = pickCheckDimension();

        global.sendDiscordLog(
            `Проверка игрока\n\nАдминистратор: [#${player.static}] ${adminlogin}\nИгрок: [#${targetPlayer.static}] ${login}\nDiscord для игрока: ${discordTag}\nИзмерение: ${dim}`,
            '1266445805355532368'
        );

        targetPlayer.position = player.position;
        targetPlayer.dimension = dim;
        player.dimension = dim;

        const session = {
            adminStatic: player.static,
            adminLogin: adminlogin,
            targetStatic: targetPlayer.static,
            targetLogin: login,
            discordTag,
            prevAdminDim,
            prevTargetDim,
            dimension: dim
        };

        checkByTarget.set(String(targetPlayer.static), session);
        checkByAdmin.set(String(player.static), session);

        targetPlayer.setVariable('adminCheckActive', true);
        targetPlayer.call('adminCheck:show', [
            JSON.stringify({
                adminLogin: adminlogin,
                adminStatic: String(player.static),
                discordTag
            })
        ]);

        player.outputChatBox(`Проверка начата: игрок ${login} [#${targetPlayer.static}]. Завершите: /stopcheck ${targetPlayer.static}`);
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('stopcheck', (player, _full, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl < 5) {
            return player.outputChatBox('!{#888888}Недостаточно прав. Команда /stopcheck доступна с 5 уровня админки.');
        }

        if (!static_id) {
            return player.outputChatBox('Использование: /stopcheck [static игрока]');
        }

        const session = checkByTarget.get(String(static_id));
        if (!session) {
            return player.outputChatBox('Активная проверка для этого статика не найдена.');
        }
        if (String(session.adminStatic) !== String(player.static)) {
            return player.outputChatBox('Эту проверку начал другой администратор.');
        }

        endCheckSession(session);

        player.outputChatBox(`Проверка игрока [#${static_id}] завершена.`);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player.getVariable('auth')) return;

        const st = String(player.static);
        const asTarget = checkByTarget.get(st);
        if (asTarget) {
            clearMaps(asTarget);
            const admin = getAdminPlayer(asTarget.adminStatic);
            if (admin && mp.players.exists(admin)) {
                admin.dimension = asTarget.prevAdminDim;
                admin.outputChatBox(
                    `!{#ff4444} Игрок [#${asTarget.targetStatic}] покинул сервер во время проверки — выдан автобан (9999 дн.).`
                );
                isNotify(admin, 2, 'top-mid', 'Игрок вышел во время проверки. Автобан за отказ.', 6000);
            }
            insertCheckRefusalBan(player.static, () => {});
            return;
        }

        const asAdmin = checkByAdmin.get(st);
        if (asAdmin) {
            const target = getTargetPlayer(asAdmin.targetStatic);
            if (target && mp.players.exists(target)) {
                target.dimension = asAdmin.prevTargetDim;
                target.setVariable('adminCheckActive', false);
                target.call('adminCheck:hide');
                isNotify(target, 2, 'top-mid', 'Проверка прервана (администратор вышел). Обратитесь в Discord проекта.', 8000);
            }
            clearMaps(asAdmin);
        }
    } catch (error) {
        console.log(error);
    }
});
