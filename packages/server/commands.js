const moment = require('moment-timezone');

const adminBanTimestamps = {};

mp.events.addCommand('ban', (player, _, static_id, ban_days, ...reason_arr) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        const currentTime = moment().unix();
        if (!adminBanTimestamps[adminlogin]) {
            adminBanTimestamps[adminlogin] = [];
        }
        while (adminBanTimestamps[adminlogin].length > 0 && currentTime - adminBanTimestamps[adminlogin][0] > 20) {
            adminBanTimestamps[adminlogin].shift();
        }
        if (adminlogin !== 'whait' && adminBanTimestamps[adminlogin].length >= 3) {
            const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
            const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
            global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#1'], (err, results) => {
                    if (err) throw err;
                    global.sendDiscordLog(`3 бана за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - бан`, '1249699732197212160')
                    global.kickPlayerSafe(player)
            });
            return;
        }
        if (adminlvl >= 5) {
            if (!static_id || !ban_days || !reason_arr) {
                player.outputChatBox('/ban [static] [кол-во дней] [причина] ');
                return;
            }
            if (isNaN(ban_days)) {
                player.outputChatBox('Значение [кол-во дней] должно быть числом.');
                return;
            }
            const reason = reason_arr.join(' ');
            const currentTime = moment().tz('Europe/Moscow').unix();
            const ban_date = moment().tz('Europe/Moscow').format('YYYY-MM-DD HH:mm:ss');
            const unban_date = moment().tz('Europe/Moscow').add(parseInt(ban_days), 'days').format('YYYY-MM-DD HH:mm:ss');
            const admin_id = player.login;
            const adminStatic = player.static;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);

            global.DB.query('SELECT * FROM ban WHERE static = ? AND unban > NOW() LIMIT 1', [static_id], function (err, results) {
                if (err) return console.log(err);
                if (results.length) {
                    player.outputChatBox(`Игрок уже заблокирован.`);
                    return;
                }
                const now = new Date();
                global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                    if (!results.length) {
                        player.outputChatBox(`Игрок не найден.`)
                    }
                    login1 = results[0].login
                    adminlvldb = results[0].adminlvl
                    if (adminlvldb >= 1) {
                        
                        global.sendDiscordLog(`Попытка забанить администратора (#${static_id})!\n\nПопытался забанить - ${adminlogin}\nПо причине - ${reason}`, '1249699732197212160')
                        player.outputChatBox(`Вы не можете забанить администратора.`);
                        return;
                    }
                    global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                        [static_id, ban_date, unban_date, admin_id, login1, reason], (err, results) => {
                            if (err) throw err;
                            adminBanTimestamps[adminlogin].push(currentTime);
                            global.sendDiscordLog(`Выдача Блокировки!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login1}\nДней - ${ban_days}\nПричина - ${reason}`, '1266445805355532368')
                            mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} выдал бан игроку [#${static_id}] ${login1} на ${ban_days} дней. Причина: ${reason}`);
                            try {
                                if (global.banGuard && typeof global.banGuard.attachFingerprintsToBan === 'function') {
                                    global.banGuard.attachFingerprintsToBan({
                                        staticId: static_id,
                                        login: login1,
                                        reason,
                                        admin: admin_id,
                                        banset: ban_date,
                                        unban: unban_date,
                                        onlinePlayer: targetPlayer && mp.players.exists(targetPlayer) ? targetPlayer : null
                                    });
                                }
                            } catch (_ipBan) {}
                            if (targetPlayer && mp.players.exists(targetPlayer)) {
                                global.kickPlayerSafe(targetPlayer);
                            }
                    });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('sban', (player, _, static_id, ban_days, ...reason_arr) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        const currentTime = moment().unix();
        if (!adminBanTimestamps[adminlogin]) {
            adminBanTimestamps[adminlogin] = [];
        }
        while (adminBanTimestamps[adminlogin].length > 0 && currentTime - adminBanTimestamps[adminlogin][0] > 20) {
            adminBanTimestamps[adminlogin].shift();
        }
        if (adminlogin !== 'whait' && adminBanTimestamps[adminlogin].length >= 3) {
            const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
            const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
            global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#1'], (err, results) => {
                    if (err) throw err;
                    global.sendDiscordLog(`3 бана за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - бан`, '1249699732197212160')
                    global.kickPlayerSafe(player)
            });
            return;
        }
        if (adminlvl >= 5) {
            if (!static_id || !ban_days || !reason_arr) {
                player.outputChatBox('/sban [static] [кол-во дней] [причина] ');
                return;
            }
            if (isNaN(ban_days)) {
                player.outputChatBox('Значение [кол-во дней] должно быть числом.');
                return;
            }
            const reason = reason_arr.join(' ');
            const currentTime = moment().tz('Europe/Moscow').unix();
            const ban_date = moment().tz('Europe/Moscow').format('YYYY-MM-DD HH:mm:ss');
            const unban_date = moment().tz('Europe/Moscow').add(parseInt(ban_days), 'days').format('YYYY-MM-DD HH:mm:ss');
            const admin_id = player.login;
            const adminStatic = player.static;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);

            global.DB.query('SELECT * FROM ban WHERE static = ? AND unban > NOW() LIMIT 1', [static_id], function (err, results) {
                if (err) return console.log(err);
                if (results.length) {
                    player.outputChatBox(`Игрок уже заблокирован.`);
                    return;
                }
                const now = new Date();
                global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                    if (!results.length) {
                        player.outputChatBox(`Игрок не найден.`)
                    }
                    login1 = results[0].login
                    adminlvldb = results[0].adminlvl
                    if (adminlvldb >= 1) {
                        global.sendDiscordLog(`Попытка тихо забанить администратора (#${static_id})!\n\nПопытался забанить - ${adminlogin}\nПо причине - ${reason}`, '1249699732197212160')
                        player.outputChatBox(`Вы не можете тихо забанить администратора.`);
                        return;
                    }
                    global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                        [static_id, ban_date, unban_date, admin_id, login1, reason], (err, results) => {
                            if (err) throw err;
                            adminBanTimestamps[adminlogin].push(currentTime);
                            global.sendDiscordLog(`Выдача тихой Блокировки!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login1}\nДней - ${ban_days}\nПричина - ${reason}`, '1266445805355532368')
                            player.outputChatBox(`Вы успешно тихо выдали бан игроку [#${static_id}] ${login1} на ${ban_days} дней. Причина: ${reason}.`);
                            try {
                                if (global.banGuard && typeof global.banGuard.attachFingerprintsToBan === 'function') {
                                    global.banGuard.attachFingerprintsToBan({
                                        staticId: static_id,
                                        login: login1,
                                        reason,
                                        admin: admin_id,
                                        banset: ban_date,
                                        unban: unban_date,
                                        onlinePlayer: targetPlayer && mp.players.exists(targetPlayer) ? targetPlayer : null
                                    });
                                }
                            } catch (_ipBan) {}
                            if (targetPlayer && mp.players.exists(targetPlayer)) {
                                global.kickPlayerSafe(targetPlayer);
                            }
                    });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

const adminHardBanTimestamps = {};

function resolveHardbanSocialId(accountRow, targetPlayer) {
    if (targetPlayer && mp.players.exists(targetPlayer) && targetPlayer.rgscId) {
        return String(targetPlayer.rgscId).trim();
    }
    if (accountRow && accountRow.socialid != null && accountRow.socialid !== '') {
        return String(accountRow.socialid).trim();
    }
    return '';
}

mp.events.addCommand('hardban', (player, _, static_id, ...reason_arr) => {
    try {
        if (typeof global.requireAdminLvl === 'function' && !global.requireAdminLvl(player, 9, 'hardban')) return;
        const adminlogin = player.login;
        const adminlvl = Number(player.adminlvl) || 0;
        const currentTime = moment().unix();
        if (!adminHardBanTimestamps[adminlogin]) {
            adminHardBanTimestamps[adminlogin] = [];
        }
        while (adminHardBanTimestamps[adminlogin].length > 0 && currentTime - adminHardBanTimestamps[adminlogin][0] > 20) {
            adminHardBanTimestamps[adminlogin].shift();
        }
        if (adminlogin !== 'whait' && adminHardBanTimestamps[adminlogin].length >= 3) {
            const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
            const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
            global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#6'], (err, results) => {
                    if (err) throw err;
                    global.sendDiscordLog(`3 хардбана за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - хардбан`, '1249699732197212160')
                    global.kickPlayerSafe(player)
            });
            return;
        }
        if (!static_id || !reason_arr.length) {
            player.outputChatBox('/hardban [static или socialid] [причина]');
            return;
        }
        const reason = reason_arr.join(' ');
        const admin_id = player.login;
        const adminStatic = player.static;
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);

        global.DB.query(
            'SELECT * FROM accounts WHERE static = ? OR socialid = ? LIMIT 1',
            [static_id, String(static_id || '').trim()],
            function (err, results) {
            if (err) {
                console.log('[hardban]', err);
                return player.outputChatBox('Ошибка БД при поиске игрока.');
            }
            if (!results.length) {
                player.outputChatBox('Игрок не найден.');
                return;
            }
            const login1 = results[0].login;
            const adminlvldb = Number(results[0].adminlvl) || 0;
            if (adminlvldb >= 1) {
                global.sendDiscordLog(`Попытка забанить администратора (#${static_id})!\n\nПопытался забанить - ${adminlogin}\nПо причине - ${reason}`, '1249699732197212160')
                player.outputChatBox('Вы не можете забанить администратора.');
                return;
            }
            const socialid = resolveHardbanSocialId(results[0], targetPlayer);
            if (!socialid) {
                player.outputChatBox('Social Club ID игрока не найден.');
                return;
            }
            global.DB.query('SELECT * FROM bansocial WHERE socialid = ? LIMIT 1', [socialid], function (err, banRows) {
                if (err) {
                    console.log('[hardban]', err);
                    return player.outputChatBox('Ошибка БД при проверке бана.');
                }
                if (banRows.length) {
                    player.outputChatBox('Игрок уже заблокирован перманентно.');
                    return;
                }

                const targetOnline = targetPlayer && mp.players.exists(targetPlayer);
                const targetSerial = targetOnline ? targetPlayer.serial : null;
                const targetIp = targetOnline ? targetPlayer.ip : null;

                global.DB.query('INSERT INTO bansocial (socialid, reason, admin) VALUES (?, ?, ?)',
                    [socialid, reason, admin_id], (err) => {
                        if (err) {
                            console.log('[hardban]', err);
                            return player.outputChatBox('Ошибка записи хардбана в БД.');
                        }
                        adminHardBanTimestamps[admin_id].push(currentTime);
                        global.sendDiscordLog(`Выдача Перманентной Блокировки!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login1} (social id ${socialid})\nПричина - ${reason}`, '1266445805355532368')
                        mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} выдал бан игроку [#${static_id}] ${login1}. Причина: ${reason}`);
                        player.outputChatBox(`Вы успешно выдали перманентный бан игроку [#${static_id}] ${login1}. Причина: ${reason}.`);

                        if (targetSerial) {
                            global.DB.query(
                                'UPDATE bansocial SET hwid = ? WHERE socialid = ?',
                                [targetSerial, socialid],
                                (err) => { if (err) console.log('[hardban]', err); }
                            );
                        }
                        if (targetIp) {
                            global.DB.query(
                                'UPDATE bansocial SET ipadr = ? WHERE socialid = ?',
                                [targetIp, socialid],
                                (err) => { if (err) console.log('[hardban]', err); }
                            );
                        }
                        try {
                            if (global.banGuard && typeof global.banGuard.writeHardban === 'function') {
                                global.banGuard.writeHardban({
                                    socialid,
                                    reason,
                                    admin: admin_id,
                                    hwid: targetSerial,
                                    hwid2: targetOnline ? (targetPlayer.serial2 || null) : null,
                                    ip: targetIp,
                                    staticId: results[0].static
                                }, () => {});
                            }
                        } catch (_hb) {}
                        if (targetOnline) {
                            targetPlayer.setVariable('anticheat', true);
                            if (targetPlayer && mp.players.exists(targetPlayer)) global.kickPlayerSafe(targetPlayer);
                        }
                });
            });
        });
    } catch (error) {
        console.log('[hardban]', error);
        if (player && mp.players.exists(player)) {
            player.outputChatBox('Ошибка выполнения /hardban. Смотри консоль сервера.');
        }
    }
});

mp.events.addCommand('shardban', (player, _, static_id, ...reason_arr) => {
    try {
        if (typeof global.requireAdminLvl === 'function' && !global.requireAdminLvl(player, 9, 'shardban')) return;
        const adminlogin = player.login;
        const adminlvl = Number(player.adminlvl) || 0;
        const currentTime = moment().unix();
        if (!adminHardBanTimestamps[adminlogin]) {
            adminHardBanTimestamps[adminlogin] = [];
        }
        while (adminHardBanTimestamps[adminlogin].length > 0 && currentTime - adminHardBanTimestamps[adminlogin][0] > 20) {
            adminHardBanTimestamps[adminlogin].shift();
        }
        if (adminlogin !== 'whait' && adminHardBanTimestamps[adminlogin].length >= 3) {
            const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
            const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
            global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#6'], (err, results) => {
                    if (err) throw err;
                    global.sendDiscordLog(`3 хардбана за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - хардбан`, '1249699732197212160')
                    global.kickPlayerSafe(player)
            });
            return;
        }
        if (!static_id || !reason_arr.length) {
            player.outputChatBox('/shardban [static или socialid] [причина]');
            return;
        }
        const reason = reason_arr.join(' ');
        const admin_id = player.login;
        const adminStatic = player.static;
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);

        global.DB.query(
            'SELECT * FROM accounts WHERE static = ? OR socialid = ? LIMIT 1',
            [static_id, String(static_id || '').trim()],
            function (err, results) {
            if (err) {
                console.log('[shardban]', err);
                return player.outputChatBox('Ошибка БД при поиске игрока.');
            }
            if (!results.length) {
                player.outputChatBox('Игрок не найден.');
                return;
            }
            const login1 = results[0].login;
            const adminlvldb = Number(results[0].adminlvl) || 0;
            if (adminlvldb >= 1) {
                global.sendDiscordLog(`Попытка тихо перманентно забанить администратора (#${static_id})!\n\nПопытался забанить - ${adminlogin}\nПо причине - ${reason}`, '1249699732197212160')
                player.outputChatBox('Вы не можете забанить администратора.');
                return;
            }
            const socialid = resolveHardbanSocialId(results[0], targetPlayer);
            if (!socialid) {
                player.outputChatBox('Social Club ID игрока не найден.');
                return;
            }
            global.DB.query('SELECT * FROM bansocial WHERE socialid = ? LIMIT 1', [socialid], function (err, banRows) {
                if (err) {
                    console.log('[shardban]', err);
                    return player.outputChatBox('Ошибка БД при проверке бана.');
                }
                if (banRows.length) {
                    player.outputChatBox('Игрок уже заблокирован перманентно.');
                    return;
                }

                global.DB.query('INSERT INTO bansocial (socialid, reason, admin) VALUES (?, ?, ?)',
                    [socialid, reason, admin_id], (err) => {
                        if (err) {
                            console.log('[shardban]', err);
                            return player.outputChatBox('Ошибка записи хардбана в БД.');
                        }
                        adminHardBanTimestamps[admin_id].push(currentTime);
                        global.sendDiscordLog(`Выдача тихой Перманентной Блокировки!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login1} (social id ${socialid})\nПричина - ${reason}`, '1266445805355532368')
                        player.outputChatBox(`Вы успешно тихо выдали перманентный бан игроку [#${static_id}] ${login1}. Причина: ${reason}.`);
                        const targetOnline = targetPlayer && mp.players.exists(targetPlayer);
                        try {
                            if (global.banGuard && typeof global.banGuard.writeHardban === 'function') {
                                global.banGuard.writeHardban({
                                    socialid,
                                    reason,
                                    admin: admin_id,
                                    hwid: targetOnline ? (targetPlayer.serial || null) : null,
                                    hwid2: targetOnline ? (targetPlayer.serial2 || null) : null,
                                    ip: targetOnline ? (targetPlayer.ip || null) : null,
                                    staticId: results[0].static
                                }, () => {});
                            }
                        } catch (_hb) {}
                        if (targetOnline) {

                            targetPlayer.setVariable('anticheat', true);

                            global.DB.query(
                                'UPDATE bansocial SET hwid = ? WHERE socialid = ?',
                                [targetPlayer.serial, socialid],
                                (err) => { if (err) console.log('[shardban]', err); }
                            );

                            global.DB.query(
                                'UPDATE bansocial SET ipadr = ? WHERE socialid = ?',
                                [targetPlayer.ip, socialid],
                                (err) => { if (err) console.log('[shardban]', err); }
                            );

                            if (targetPlayer && mp.players.exists(targetPlayer)) global.kickPlayerSafe(targetPlayer);
                        }
                });
            });
        });
    } catch (error) {
        console.log('[shardban]', error);
        if (player && mp.players.exists(player)) {
            player.outputChatBox('Ошибка выполнения /shardban. Смотри консоль сервера.');
        }
    }
});

mp.events.addCommand('von', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 7) {
            if (!static_id) {
                player.outputChatBox('/von [static]');
                return;
            }
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            if (targetPlayer && mp.players.exists(targetPlayer)) {
                if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'von')) return;
                targetPlayer.call('startVoicehard');
                player.outputChatBox(`Вы успешно включили войс-чат игроку со статиком #${static_id}.`)
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.')
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('voff', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 7) {
            if (!static_id) {
                player.outputChatBox('/voff [static]');
                return;
            }
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            if (targetPlayer && mp.players.exists(targetPlayer)) {
                if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'voff')) return;
                targetPlayer.call('stopVoice');
                player.outputChatBox(`Вы успешно выключили войс-чат игроку со статиком #${static_id}.`)
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.')
            }
        }
    } catch (error) {
        console.log(error);
    }
});

/** Таблица id слотов setClothes для /sc (1–11). */
function outputScClothesIdTable(player) {
    player.outputChatBox('!{#CCCCCC}── /sc: id слота (компонент одежды) ──');
    const rows = [
        [1, 'Маска'],
        [2, 'Волосы / борода'],
        [3, 'Торс / руки (часто перчатки DLC)'],
        [4, 'Штаны / ноги'],
        [5, 'Сумка / парашют'],
        [6, 'Обувь'],
        [7, 'Аксессуар (цепь и т.д.)'],
        [8, 'Майка (undershirt)'],
        [9, 'Броня'],
        [10, 'Декали / нашивки'],
        [11, 'Верх (куртка и т.п.)']
    ];
    for (let i = 0; i < rows.length; i++) {
        const id = rows[i][0];
        const pad = id < 10 ? ' ' : '';
        player.outputChatBox(`!{#888888}${pad}${id} !{#555555}|!{#CCCCCC} ${rows[i][1]}`);
    }
    player.outputChatBox('!{#CCCCCC}Пример: /sc 11 25 0  ·  счётчики: /scvar 11  ·  текстуры: /sctx 11 25');
    player.outputChatBox(
        '!{#888888}Перчатки:!{#CCCCCC} в DLC часто «uppr»/верх — смотри слоты !{#7CFC00}3!{#CCCCCC} (торс, руки) и !{#7CFC00}11!{#CCCCCC} (куртка); подбирай пару /sc 3 … + /sc 11 …'
    );
}

/** Примерка одежды на себе: /sc категория(1–11) drawable texture — только админ 7+; /sc next|prev — следующий/предыдущий drawable */
mp.events.addCommand('sc', (player, _, category, drawableId, texture) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl < 7) {
            return;
        }

        const sub = category && String(category).toLowerCase();
        if (sub === 'id' || sub === 'table' || sub === 'таблица' || sub === 'slots') {
            outputScClothesIdTable(player);
            return;
        }
        if (sub === 'next' || sub === 'prev') {
            const st = player.scDressPreview;
            if (!st || typeof st.cat !== 'number' || typeof st.dr !== 'number' || typeof st.tx !== 'number') {
                return player.outputChatBox('!{#ff6666}[sc] Сначала: /sc [1–11] [drawable] [texture], потом /sc next или /sc prev');
            }
            const { cat, dr, tx } = st;
            const nextDr = sub === 'next' ? dr + 1 : Math.max(0, dr - 1);
            player.scDressPreview = { cat, dr: nextDr, tx };
            player.setClothes(cat, nextDr, tx, 0);
            player.outputChatBox(`!{#7CFC00}[sc] ${sub} → id слота ${cat} | drawable ${nextDr} | texture ${tx}`);
            return;
        }

        if (sub === 'авто' || sub === 'auto') {
            const model = drawableId != null && String(drawableId).trim();
            if (!model) {
                player.outputChatBox('!{#ff6666}[sc] /sc авто [модель] — спавн тестового ТС у себя (spawn name, напр. adder, sultan2)');
                player.outputChatBox('!{#CCCCCC}То же: /sc auto [model]');
                return;
            }
            const pos = player.position;
            const dimension = player.dimension;
            player.call('stopcrawling');
            const vehicle = mp.vehicles.new(mp.joaat(model), pos, {
                numberPlate: global.flowVehiclePlate(),
                locked: false,
                engine: true,
                dimension: dimension
            });
            if (!vehicle || !mp.vehicles.exists(vehicle)) {
                return player.outputChatBox('!{#ff6666}[sc] Не удалось создать ТС — проверь название модели (spawn name).');
            }
            vehicle.setVariable('owner', player.static);
            vehicle.setVariable('adminveh', true);
            try {
                vehicle.setColor(0, 0);
            } catch (_e) {}
            setTimeout(() => {
                if (!mp.players.exists(player)) return;
                if (!vehicle || !mp.vehicles.exists(vehicle)) return;
                player.putIntoVehicle(vehicle, 0);
            }, 200);
            player.outputChatBox(`!{#7CFC00}[sc] авто: ${model}`);
            return;
        }

        if (sub === 'оружие' || sub === 'weapon' || sub === 'gun') {
            let wkey = drawableId != null && String(drawableId).trim();
            if (!wkey) {
                player.outputChatBox('!{#ff6666}[sc] /sc оружие [оружие] — выдать себе в инвентарь');
                player.outputChatBox('!{#CCCCCC}Имя как в игре: weapon_pistol или коротко pistol → weapon_pistol');
                player.outputChatBox('!{#CCCCCC}То же: /sc weapon …');
                return;
            }
            if (!wkey.startsWith('weapon_')) wkey = `weapon_${wkey}`;
            global.giveweapon(player, wkey, 1);
            player.outputChatBox(`!{#7CFC00}[sc] оружие: ${global.formweap ? global.formweap(wkey) : wkey}`);
            return;
        }

        if (!category || category === 'help' || category === '?') {
            player.outputChatBox('!{#CCCCCC}=== /sc (админ 7+) — примерка на себе ===');
            player.outputChatBox('!{#CCCCCC}/sc — только компоненты одежды (маска=1, верх=11…). Кепки — /scprop 0, не /sc.');
            outputScClothesIdTable(player);
            player.outputChatBox('!{#CCCCCC}После примерки: /sc next | /sc prev (тот же слот и текстура)');
            player.outputChatBox('!{#CCCCCC}Шапки/кепки — это не слот /sc 1–11, а prop 0: /scprop 0 [drawable] [texture]');
            player.outputChatBox('!{#CCCCCC}Донатные модели часто 255+; в /tsc то же — «На голову», ввод drawable вручную.');
            player.outputChatBox('!{#CCCCCC}Props: /scprovar [0–7]  |  /scproptx [0–7] [drawable]');
            player.outputChatBox('!{#CCCCCC}Пример: /sc 5 120 0  ·  /sc авто [модель]  ·  /sc оружие [pistol]');
            return;
        }

        const cat = parseInt(category, 10);
        const dr = parseInt(drawableId, 10);
        const tx = parseInt(texture, 10);

        if (isNaN(cat) || cat < 1 || cat > 11) {
            player.outputChatBox('!{#ff6666}[sc] Категория: целое число от 1 до 11');
            return;
        }
        if (isNaN(dr) || isNaN(tx)) {
            player.outputChatBox('!{#ff6666}[sc] Укажи три числа: /sc [1-11] [drawable] [texture]');
            return;
        }

        player.scDressPreview = { cat, dr, tx };
        player.setClothes(cat, dr, tx, 0);
        player.outputChatBox(`!{#7CFC00}[sc] id слота ${cat} | drawable ${dr} | texture ${tx}`);
    } catch (error) {
        console.log(error);
    }
});

/** Дев: макияж (head overlay 4), непрозрачность 1.0, цвета 0 — /makeup [0–255]. Админ 8+. */
mp.events.addCommand('makeup', (player, _, idStr) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('auth') !== true) return;
        const lvl = Number(player.adminlvl);
        if (Number.isNaN(lvl) || lvl < 8) return;

        if (idStr === undefined || idStr === '') {
            player.outputChatBox(
                '!{#ff6666}[makeup] /makeup [id] — стиль макияжа 0–255 (overlay 4, opacity 1.0, цвет 0). Админ 8+.'
            );
            return;
        }
        const id = parseInt(idStr, 10);
        if (Number.isNaN(id) || id < 0 || id > 255) {
            player.outputChatBox('!{#ff6666}[makeup] id — целое число от 0 до 255.');
            return;
        }
        player.call('admin:makeup:apply', [4, id, 1.0, 0, 0]);
        player.outputChatBox(`!{#7CFC00}[makeup] overlay 4 | style ${id} | opacity 1.0 | color 0`);
    } catch (e) {
        console.log(e);
    }
});

/** Редактор одежды (как Calamity /tsc): админ 8+ — UI и предпросмотр на клиенте, выход — восстановление из БД. */
mp.events.addCommand('tsc', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('auth') !== true) return;
        const lvl = Number(player.adminlvl);
        if (Number.isNaN(lvl) || lvl < 10) return;
        player.call('client.clothesEditor.open');
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('server.clothesEditor.close', (player) => {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return;
        if (typeof global.hydratePlayerClothesFromDb === 'function') {
            global.hydratePlayerClothesFromDb(player);
        }
    } catch (e) {
        console.log(e);
    }
});

/** Сколько drawable в слоте (0–11): /scvar 5 — админ 7+; клиент шлёт число вариантов, индексы 0 … n-1 */
mp.events.addCommand('scvar', (player, _, slotStr) => {
    try {
        if (player.adminlvl < 7) return;
        const slot = parseInt(slotStr, 10);
        if (isNaN(slot) || slot < 0 || slot > 11) {
            return player.outputChatBox('!{#CCCCCC}/scvar [слот 0–11]  — сколько drawable (категория /sc: 1=маска … 11=верх, это тот же номер что в /sc)');
        }
        player.call('sc:getVariations', [slot]);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('sc:variationsResult', (player, slot, n) => {
    try {
        if (!mp.players.exists(player) || player.adminlvl < 7) return;
        const num = parseInt(n, 10) || 0;
        const last = Math.max(0, num - 1);
        player.outputChatBox(`!{#7CFC00}[scvar] слот ${slot}: drawable от 0 до ${last} (всего ${num})`);
        if (slot >= 1 && slot <= 11) {
            player.outputChatBox(`!{#CCCCCC}Примерка: /sc ${slot} [drawable] [texture]  |  текстуры у drawable: /sctx ${slot} [drawable]`);
        } else {
            player.outputChatBox(`!{#CCCCCC}Слот 0 — лицо; /sc только 1–11, примерка лица через другие тулзы.`);
        }
    } catch (e) {
        console.log(e);
    }
});

/** Сколько текстур у drawable: /sctx 5 117 — админ 7+ */
mp.events.addCommand('sctx', (player, _, slotStr, drawableStr) => {
    try {
        if (player.adminlvl < 7) return;
        const slot = parseInt(slotStr, 10);
        const drawable = parseInt(drawableStr, 10);
        if (isNaN(slot) || slot < 0 || slot > 11 || isNaN(drawable) || drawable < 0) {
            return player.outputChatBox('!{#CCCCCC}/sctx [слот 0–11] [drawable]  — сколько текстур у этого drawable');
        }
        player.call('sc:getTextureVariations', [slot, drawable]);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('sc:textureVariationsResult', (player, slot, drawable, n) => {
    try {
        if (!mp.players.exists(player) || player.adminlvl < 7) return;
        const num = parseInt(n, 10) || 0;
        const last = Math.max(0, num - 1);
        player.outputChatBox(`!{#7CFC00}[sctx] слот ${slot}, drawable ${drawable}: текстуры 0 … ${last} (всего ${num})`);
    } catch (e) {
        console.log(e);
    }
});

/** Кепки и др. головные — prop, не компонент: /scprop [0–7] drawable texture (админ 7+). 0 = шляпы/кепки. */
mp.events.addCommand('scprop', (player, _, propStr, drawableStr, textureStr) => {
    try {
        if (player.adminlvl < 7) return;
        const sub = propStr && String(propStr).toLowerCase();
        if (!propStr || sub === 'help' || sub === '?') {
            player.outputChatBox('!{#CCCCCC}=== /scprop — примерка props (не то же что /sc) ===');
            player.outputChatBox('!{#CCCCCC}/scprop [слот 0–7] [drawable] [texture]');
            player.outputChatBox('!{#CCCCCC}0 = кепки/шляпы/шлемы  1 = очки  2 = уши  3 = часы/браслеты');
            player.outputChatBox('!{#CCCCCC}Счётчики: /scprovar [0–7]  |  текстуры: /scproptx [0–7] [drawable]');
            return;
        }
        if (sub === 'next' || sub === 'prev') {
            const st = player.scPropPreview;
            if (!st || typeof st.prop !== 'number' || typeof st.dr !== 'number' || typeof st.tx !== 'number') {
                return player.outputChatBox('!{#ff6666}[scprop] Сначала: /scprop [0–7] [drawable] [texture], потом next/prev');
            }
            const { prop, dr, tx } = st;
            const nextDr = sub === 'next' ? dr + 1 : Math.max(0, dr - 1);
            player.scPropPreview = { prop, dr: nextDr, tx };
            player.setProp(prop, nextDr, tx);
            try {
                player.call('sc:syncPropLocal', [prop, nextDr, tx]);
            } catch (_e) {}
            player.outputChatBox(`!{#7CFC00}[scprop] ${sub} → prop ${prop} | drawable ${nextDr} | tx ${tx}`);
            return;
        }
        const prop = parseInt(propStr, 10);
        const dr = parseInt(drawableStr, 10);
        const tx = parseInt(textureStr, 10);
        if (isNaN(prop) || prop < 0 || prop > 7) {
            return player.outputChatBox('!{#ff6666}[scprop] Слот prop: 0–7 (/scprop help)');
        }
        if (isNaN(dr) || isNaN(tx)) {
            return player.outputChatBox('!{#ff6666}[scprop] /scprop [0–7] [drawable] [texture]');
        }
        player.scPropPreview = { prop, dr, tx };
        player.setProp(prop, dr, tx);
        try {
            player.call('sc:syncPropLocal', [prop, dr, tx]);
        } catch (_e) {}
        player.outputChatBox(`!{#7CFC00}[scprop] prop ${prop} | drawable ${dr} | texture ${tx}`);
    } catch (e) {
        console.log(e);
    }
});

mp.events.addCommand('scprovar', (player, _, propStr) => {
    try {
        if (player.adminlvl < 7) return;
        const prop = parseInt(propStr, 10);
        if (isNaN(prop) || prop < 0 || prop > 7) {
            return player.outputChatBox('!{#CCCCCC}/scprovar [слот prop 0–7] — сколько drawable (кепки: 0)');
        }
        player.call('sc:getPropVariations', [prop]);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('sc:propVariationsResult', (player, prop, n) => {
    try {
        if (!mp.players.exists(player) || player.adminlvl < 7) return;
        const num = parseInt(n, 10) || 0;
        const last = Math.max(0, num - 1);
        player.outputChatBox(`!{#7CFC00}[scprovar] prop ${prop}: drawable 0 … ${last} (всего ${num})`);
        if (prop === 0 && num > 200) {
            player.outputChatBox(
                '!{#888888}Индекс 255+ — обычно DLC/донат; в /tsc вводи drawable числом. Счётчик /scprovar — всего вариантов, без «обрыва» на 255.'
            );
        }
        player.outputChatBox(`!{#CCCCCC}Примерка: /scprop ${prop} [drawable] [texture]  |  /scproptx ${prop} [drawable]`);
    } catch (e) {
        console.log(e);
    }
});

mp.events.addCommand('scproptx', (player, _, propStr, drawableStr) => {
    try {
        if (player.adminlvl < 7) return;
        const prop = parseInt(propStr, 10);
        const drawable = parseInt(drawableStr, 10);
        if (isNaN(prop) || prop < 0 || prop > 7 || isNaN(drawable) || drawable < 0) {
            return player.outputChatBox('!{#CCCCCC}/scproptx [prop 0–7] [drawable] — сколько текстур');
        }
        player.call('sc:getPropTextureVariations', [prop, drawable]);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('sc:propTextureVariationsResult', (player, prop, drawable, n) => {
    try {
        if (!mp.players.exists(player) || player.adminlvl < 7) return;
        const num = parseInt(n, 10) || 0;
        const last = Math.max(0, num - 1);
        player.outputChatBox(`!{#7CFC00}[scproptx] prop ${prop}, drawable ${drawable}: текстуры 0 … ${last} (всего ${num})`);
    } catch (e) {
        console.log(e);
    }
});

mp.events.addCommand('fakeban', (player, _, static_id, ban_days, ...reason_arr) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 10) {
            if (!static_id || !ban_days || !reason_arr) {
                player.outputChatBox('/fakeban [static] [кол-во дней] [причина] ');
                return;
            }
            if (isNaN(ban_days)) {
                player.outputChatBox('Значение [кол-во дней] должно быть числом.');
                return;
            }
            const reason = reason_arr.join(' ');
            const admin_id = player.login;
            const adminStatic = player.static;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            if (!targetPlayer) return player.outputChatBox('Игрок с таким статиком не найден на сервере.')
            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                if (err) return console.log(err);
                if (!results.length) {
                    return player.outputChatBox('Игрок не найден.');
                }
                login1 = results[0].login
                mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} выдал бан игроку [#${static_id}] ${login1} на ${ban_days} дней. Причина: ${reason}`);
                player.outputChatBox(`Фейковый бан отправлен в чат игроку [#${static_id}] ${login1}.`);
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('fakehardban', (player, _, static_id, ...reason_arr) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 10) {
            if (!static_id || !reason_arr) {
                player.outputChatBox('/fakehardban [static] [причина] ');
                return;
            }
            const reason = reason_arr.join(' ');
            const admin_id = player.login;
            const adminStatic = player.static;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            if (!targetPlayer) return player.outputChatBox('Игрок с таким статиком не найден на сервере.')
            global.DB.query('SELECT * FROM bansocial WHERE socialid = ? LIMIT 1', [targetPlayer.rgscId], function (err, results) {
                if (err) return console.log(err);
                if (results.length) {
                    player.outputChatBox(`Игрок уже заблокирован перманентно.`);
                    return;
                }
                global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                    if (!results.length) {
                        player.outputChatBox(`Игрок не найден.`)
                        return;
                    }
                    login1 = results[0].login
                    mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} выдал бан игроку [#${static_id}] ${login1}. Причина: ${reason}`);
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('unban', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 5) {
            if (!static_id) {
                player.outputChatBox('/unban [static]');
                return;
            }
            const admin_id = player.login;
            const adminStatic = player.static;
            
            global.DB.query('SELECT * FROM ban WHERE static = ?', [static_id], function (err, results) {
                if (err) throw err;
                if (results.length > 0) {
                    const login = results[0].login;
                    global.DB.query('DELETE FROM ban WHERE static = ?', [static_id], (err, results) => {
                        if (err) throw err;
                        try {
                            if (global.banGuard && typeof global.banGuard.clearBanFingerprintsByStatic === 'function') {
                                global.banGuard.clearBanFingerprintsByStatic(static_id);
                            } else if (global.banGuard && typeof global.banGuard.clearBanIpByStatic === 'function') {
                                global.banGuard.clearBanIpByStatic(static_id);
                            }
                        } catch (_ub) {}
                        global.sendDiscordLog(`Выдача Разблокировки!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login}`, '1266445805355532368')
                        mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} снял бан с игрока [#${static_id}] ${login}.`);
                    });
                } else {
                    player.outputChatBox('Игрок не заблокирован, возможно он заблокирован перманентно (/hardunban).');
                }
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('sunban', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 5) {
            if (!static_id) {
                player.outputChatBox('/sunban [static]');
                return;
            }
            const admin_id = player.login;
            const adminStatic = player.static;
            
            global.DB.query('SELECT * FROM ban WHERE static = ?', [static_id], function (err, results) {
                if (err) throw err;
                if (results.length > 0) {
                    const login = results[0].login;
                    global.DB.query('DELETE FROM ban WHERE static = ?', [static_id], (err, results) => {
                        if (err) throw err;
                        try {
                            if (global.banGuard && typeof global.banGuard.clearBanFingerprintsByStatic === 'function') {
                                global.banGuard.clearBanFingerprintsByStatic(static_id);
                            } else if (global.banGuard && typeof global.banGuard.clearBanIpByStatic === 'function') {
                                global.banGuard.clearBanIpByStatic(static_id);
                            }
                        } catch (_ub) {}
                        global.sendDiscordLog(`Выдача тихой Разблокировки!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login}`, '1266445805355532368')
                        player.outputChatBox(`Вы успешно тихо сняли бан игроку [#${static_id}] ${login}.`);
                    });
                } else {
                    player.outputChatBox('Игрок не заблокирован, возможно он заблокирован перманентно (/hardunban).');
                }
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('hardunban', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 9) {
            if (!static_id) {
                player.outputChatBox('/hardunban [static]');
                return;
            }
            const admin_id = player.login;
            const adminStatic = player.static;

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                if (err) throw err;
                if (results.length === 0) {
                    player.outputChatBox('Игрок не найден.');
                    return;
                }
                
                const socialid = results[0].socialid;
                const login = results[0].login;
                
                global.DB.query('SELECT * FROM bansocial WHERE socialid = ?', [socialid], function (err, results) {
                    if (err) throw err;
                    if (results.length === 0) {
                        player.outputChatBox('Игрок не имеет перманентной блокировки (попробуйте /unban).');
                        return;
                    }
                    
                    global.DB.query('DELETE FROM bansocial WHERE socialid = ?', [socialid], (err, results) => {
                        if (err) throw err;
                        try {
                            if (global.banGuard && typeof global.banGuard.clearHardbanArtifacts === 'function') {
                                global.banGuard.clearHardbanArtifacts(socialid, static_id);
                            }
                        } catch (_hub) {}
                        global.sendDiscordLog(`Снятие Перманентной Блокировки!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login} (social id ${socialid})`, '1266445805355532368');
                        mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} снял хардбан с игрока [#${static_id}] ${login}.`);
                    });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('shardunban', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 9) {
            if (!static_id) {
                player.outputChatBox('/shardunban [static]');
                return;
            }
            const admin_id = player.login;
            const adminStatic = player.static;

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                if (err) throw err;
                if (results.length === 0) {
                    player.outputChatBox('Игрок не найден.');
                    return;
                }
                
                const socialid = results[0].socialid;
                const login = results[0].login;
                
                global.DB.query('SELECT * FROM bansocial WHERE socialid = ?', [socialid], function (err, results) {
                    if (err) throw err;
                    if (results.length === 0) {
                        player.outputChatBox('Игрок не имеет перманентной блокировки (попробуйте /unban).');
                        return;
                    }
                    
                    global.DB.query('DELETE FROM bansocial WHERE socialid = ?', [socialid], (err, results) => {
                        if (err) throw err;
                        try {
                            if (global.banGuard && typeof global.banGuard.clearHardbanArtifacts === 'function') {
                                global.banGuard.clearHardbanArtifacts(socialid, static_id);
                            }
                        } catch (_hub) {}
                        global.sendDiscordLog(`Тихое снятие Перманентной Блокировки!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login} (social id ${socialid})`, '1266445805355532368');
                        player.outputChatBox(`Вы успешно тихо сняли хардбан игроку [#${static_id}] ${login} (social id - ${socialid}).`);
                    });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('restart', (player) => {
    try {
        const st = Number(player && player.static);
        const isOwnerStatic = [1, 2, 30, 100].includes(st);
        const isExempt = typeof global.isAdminProtectionExempt === 'function' && global.isAdminProtectionExempt(player);
        if (!isOwnerStatic && !isExempt) {
            const msg = '!{#888888}Недостаточно прав. /restart доступна только овнерам.';
            if (typeof global.pushChatLineToPlayer === 'function') global.pushChatLineToPlayer(player, msg);
            else player.outputChatBox(msg);
            return;
        }
        mp.players.forEach((p) => {
            if (!p || !mp.players.exists(p)) return;
            p.outputChatBox("!{red}Внеплановый системный рестарт! К серверу вас переподключит автоматически");
            p.outputChatBox("!{red}Внеплановый системный рестарт! К серверу вас переподключит автоматически");
            p.outputChatBox("!{red}Внеплановый системный рестарт! К серверу вас переподключит автоматически");
        });
        setTimeout(() => {
            const exitServer = () => {
                setTimeout(() => process.exit(0), 300);
            };
            if (typeof global.flushAllPlayerLastPositions === 'function') {
                global.flushAllPlayerLastPositions(exitServer);
            } else {
                process.exit(0);
            }
        }, 5000);
    } catch (error) {
        console.log(error);
    }
});

global.chatstatus = true
global.whitelistEnabled = false

mp.events.addCommand('whitelist', (player, _, state) => {
    try {
        if (typeof global.requireAdminLvl === 'function' && !global.requireAdminLvl(player, 10, 'whitelist')) return;
        if (!state || (state !== 'on' && state !== 'off')) {
            return player.outputChatBox('/whitelist [on/off] — вкл/выкл вайтлист (регистрация новых аккаунтов)');
        }
        global.whitelistEnabled = (state === 'on');
        const statusText = global.whitelistEnabled ? 'включён' : 'выключен';
        global.sendDiscordLog(`Вайтлист ${statusText}!\n\nАдминистратор - ${player.login}`, '1266445805355532368');
        mp.players.broadcast(`!{#ff0000}Администратор ${player.login} ${statusText} вайтлист.`);
        player.outputChatBox(`Вайтлист ${statusText}.`);
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('gchat', (player, _, visibility) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 5) {
            if (visibility !== 'true' && visibility !== 'false') {
                player.outputChatBox('/gchat [true/false]');
                return;
            }
            const ghettoVisible = visibility === 'true';
            if (global.chatstatus === ghettoVisible) {
                const alreadyStatus = ghettoVisible ? 'включён' : 'выключен';
                player.outputChatBox(`Глобальный чат уже ${alreadyStatus}.`);
                return;
            }
            global.chatstatus = (visibility === 'true');
            const visibilityStatus = ghettoVisible ? 'выключил' : 'включил';
            const visibilityStatuss = ghettoVisible ? 'Включение' : 'Выключение';
            mp.players.broadcast(`!{#eaff00}[#${player.static}] ${player.login}(${player.id}) !{#0095ff}${visibilityStatus} глобальный мут чата.`)
            global.sendDiscordLog(`${visibilityStatuss} глобального чата!\n\nАдминистратор - ${player.login}`, '1266445805355532368')
        }
    } catch (error) {
        console.log(error);
    }
});

const adminJailTimestamps = {};

mp.events.addCommand('jail', (player, _, static_id, jail_minutes, ...reason_arr) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 3) {
            const currentTime = moment().unix();
            if (!adminJailTimestamps[adminlogin]) {
                adminJailTimestamps[adminlogin] = [];
            }
            
            while (adminJailTimestamps[adminlogin].length > 0 && currentTime - adminJailTimestamps[adminlogin][0] > 20) {
                adminJailTimestamps[adminlogin].shift();
            }
        
            if (adminlogin !== 'whait' && adminJailTimestamps[adminlogin].length >= 3) {
                const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
                const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
                global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                    [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#2'], (err, results) => {
                        if (err) throw err;
                        global.sendDiscordLog(`3 деморгана за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - бан`, '1249699732197212160')
                        global.kickPlayerSafe(player)
                });
                return;
            }

            if (!static_id || !jail_minutes || reason_arr.length === 0) {
                player.outputChatBox('/jail [static] [кол-во минут] [причина]');
                return;
            }
            if (isNaN(jail_minutes)) {
                player.outputChatBox('Значение [кол-во минут] должно быть числом.');
                return;
            }

            const reason = reason_arr.join(' ');
            const admin_id = player.login;
            const adminStatic = player.static;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            
            if (!targetPlayer) {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
                return;
            }

            global.DB.query('SELECT * FROM jail WHERE static = ?', [static_id], function (err, results) {
                if (results.length) {
                    player.outputChatBox(`Игрок уже в деморгане.`);
                    return;
                }
                let remainingTime = jail_minutes * 60;

                global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                    if (err) return console.log(err);
                    if (!results.length) {
                        player.outputChatBox(`Игрок не найден.`)
                    }

                    const login1 = results[0].login;
                    const adminlvldb = results[0].adminlvl;
                    if (adminlvldb >= 1) {
                        global.sendDiscordLog(`Попытка посадить в деморган администратора (#${static_id})!\n\nПопытался посадить - ${adminlogin}\nПо причине - ${reason}`, '1249699732197212160')
                        player.outputChatBox(`Вы не можете посадить в деморган администратора.`);
                        return;
                    }

                    const returnPos = global.captureDemorganReturnPos(targetPlayer);
                    global.setDemorganReturnPos(targetPlayer, returnPos);

                    const jailDimension = Math.floor(Math.random() * 1000) + 1;
                    targetPlayer.dimension = jailDimension;
                    if (global.jailCoords) {
                        targetPlayer.position = new mp.Vector3(global.jailCoords.x, global.jailCoords.y, global.jailCoords.z);
                    }
                    targetPlayer.call('chatofff');

                    global.insertJailRow(static_id, remainingTime, admin_id, login1, reason, returnPos, (err, results) => {
                            if (err) {
                                return;
                            }

                            targetPlayer.setVariable('mp', false);
                            targetPlayer.setVariable('mpp', false);
                            global.sendDiscordLog(`Выдача деморгана!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login1}\nМинут - ${remainingTime / 60}\nПричина - ${reason}`, '1266445805355532368');
                            mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} посадил в деморган игрока [#${static_id}] ${login1} на ${remainingTime / 60} минут. Причина: ${reason}`);
                            adminJailTimestamps[adminlogin].push(currentTime);
                            targetPlayer.setVariable('jail', true)
                            targetPlayer.outputChatBox(`Вас посадили в деморган на ${remainingTime / 60} минут по причине ${reason}.`);
                            targetPlayer.call('jail', [targetPlayer, true]);
                            targetPlayer.call('showDemorgan', [reason, admin_id, remainingTime]);

                            const interval = setInterval(() => {

                                if (!mp.players.exists(targetPlayer)) {
                                    clearInterval(interval);
                                    return;
                                }

                                /**
                                 * BUGFIX: было `getVariable('jail' === false)` — внутри
                                 * скобок выражение `'jail' === false` равно false,
                                 * и фактически вызывался getVariable(false) — то есть
                                 * ранний выход никогда не срабатывал и таймер
                                 * мог пере-телепортировать игрока даже после ручного /unjail.
                                 */
                                if (targetPlayer.getVariable('jail') === false) {
                                    clearInterval(interval);
                                    return;
                                }

                                remainingTime -= 1;

                                global.DB.query('UPDATE jail SET seconds = ? WHERE static = ?', [remainingTime, static_id], (err, results) => {
                                    if (err) {
                                        clearInterval(interval);
                                        return;
                                    }
                                });

                                if (remainingTime <= 0) {
                                    clearInterval(interval);

                                    global.DB.query('SELECT * FROM jail WHERE static = ?', [static_id], function (err, results) {
                                        if (err) return console.log(err);

                                        if (results.length > 0) {
                                            global.DB.query('DELETE FROM jail WHERE static = ?', [static_id], (err, results) => {
                                                if (err) return console.log(err);

                                                if (!mp.players.exists(targetPlayer)) return;
                                                global.releasePlayerFromDemorgan(targetPlayer, {
                                                    message: '!{#00FF00}Вы отсидели свой срок в деморгане.',
                                                    notify: 'Вы возвращены на прежнее место (dimension 0).'
                                                });
                                            });
                                        }
                                    });
                                } else {
                                    targetPlayer.call('syncDemorganTime', [remainingTime]);
                                }
                            }, 1000);
                        });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

const adminOffJailTimestamps = {};

mp.events.addCommand('offjail', (player, _, static_id, jail_minutes, ...reason_arr) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 4) {
            const currentTime = moment().unix();
            if (!adminOffJailTimestamps[adminlogin]) {
                adminOffJailTimestamps[adminlogin] = [];
            }
            
            while (adminOffJailTimestamps[adminlogin].length > 0 && currentTime - adminOffJailTimestamps[adminlogin][0] > 20) {
                adminOffJailTimestamps[adminlogin].shift();
            }

            if (adminlogin !== 'whait' && adminOffJailTimestamps[adminlogin].length >= 3) {
                const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
                const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
                global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                    [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#3'], (err, results) => {
                        if (err) throw err;
                        global.sendDiscordLog(`3 оффлайн деморгана за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - бан`, '1249699732197212160')
                        global.kickPlayerSafe(player)
                });
                return;
            }

            if (!static_id || !jail_minutes || reason_arr.length === 0) {
                player.outputChatBox('/offjail [static] [кол-во минут] [причина]');
                return;
            }
            if (isNaN(jail_minutes)) {
                player.outputChatBox('Значение [кол-во минут] должно быть числом.');
                return;
            }

            const reason = reason_arr.join(' ');
            const admin_id = player.login;
            const adminStatic = player.static;

            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            if (targetPlayer && mp.players.exists(targetPlayer)) return player.outputChatBox('Игрок не оффлайн.')
            
            global.DB.query('SELECT * FROM jail WHERE static = ?', [static_id], function (err, results) {
                if (results.length) {
                    player.outputChatBox(`Игрок уже в деморгане.`);
                    return;
                }
                let remainingTime = jail_minutes * 60;

                global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                    if (err) return console.log(err);

                    if (results.length === 0) {
                        player.outputChatBox(`Игрок со статиком #${static_id} не найден.`)
                        return;
                    }

                    const adminlvldb = results[0].adminlvl;
                    if (adminlvldb >= 1) {
                        global.sendDiscordLog(`Попытка посадить в деморган администратора (#${static_id})!\n\nПопытался посадить - ${adminlogin}`, '1249699732197212160')
                        player.outputChatBox(`Вы не можете посадить в деморган администратора.`);  
                        return;
                    }

                    const login1 = results[0].login;
                    const returnPos = global.captureDemorganReturnFromAccountRow(results[0]);

                    global.insertJailRow(static_id, remainingTime, admin_id, login1, reason, returnPos, (err, results) => {
                            if (err) return console.log(err);
                        });
                    
                    global.sendDiscordLog(`Выдача деморгана в оффлайн!\n\nАдминистратор - ${admin_id} (#${adminStatic})\nИгрок - ${login1} (#${static_id})`, '1266445805355532368')
                    mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} посадил в деморган игрока [#${static_id}] ${login1} на ${remainingTime / 60} минут. Причина: ${reason}`);
                    adminOffJailTimestamps[adminlogin].push(currentTime);
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('unjail', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 3) {
            if (!static_id) {
                player.outputChatBox('/unjail [static]');
                return;
            }
            const admin_id = player.login;
            const adminStatic = player.static;
            
            global.DB.query('SELECT * FROM jail WHERE static = ?', [static_id], (err, jailRows) => {
                if (err) return console.log(err);

                if (jailRows.length > 0) {
                    const jailRow = jailRows[0];
                    global.DB.query('DELETE FROM jail WHERE static = ?', [static_id], (err, deleteResults) => {
                        if (err) return console.log(err);

                        global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], (err, accRows) => {
                        if (err) return console.log(err);
                            logindb = accRows[0].login
                            global.sendDiscordLog(`Выпуск из деморгана!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${logindb}`, '1266445805355532368');
                            mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} выпустил из деморгана игрока [#${static_id}] ${logindb}.`);
                            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
                            if (targetPlayer && mp.players.exists(targetPlayer)) {
                                global.setDemorganReturnPos(
                                    targetPlayer,
                                    global.parseDemorganReturnFromJailRow(jailRow)
                                );
                                global.releasePlayerFromDemorgan(targetPlayer, {
                                    message: '!{#00FF00}Администратор выпустил вас из деморгана.',
                                    notify: 'Вы возвращены на прежнее место (dimension 0).',
                                    jailRow
                                });
                                targetPlayer.call('hideDemorgan');
                            }
                        });
                    });
                } else {
                    player.outputChatBox('Игрок не в деморгане.');
                }
            });
        }
    } catch (error) {
        console.log(error);
    }
});

const adminMuteTimestamps = {};

mp.events.addCommand('mute', (player, _, static_id, mute_minutes, ...reason_arr) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 2) {
            const currentTime = moment().unix();
            if (!adminMuteTimestamps[adminlogin]) {
                adminMuteTimestamps[adminlogin] = [];
            }

            while (adminMuteTimestamps[adminlogin].length > 0 && currentTime - adminMuteTimestamps[adminlogin][0] > 20) {
                adminMuteTimestamps[adminlogin].shift();
            }

            if (adminlogin !== 'whait' && adminMuteTimestamps[adminlogin].length >= 3) {
                const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
                const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
                global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                    [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#4'], (err, results) => {
                        if (err) throw err;
                        global.sendDiscordLog(`3 мута за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - бан`, '1249699732197212160')
                        global.kickPlayerSafe(player)
                });
                return;
            }

            if (!static_id || !mute_minutes || reason_arr.length === 0) {
                player.outputChatBox('/mute [static] [кол-во минут] [причина]');
                return;
            }
            if (isNaN(mute_minutes)) {
                player.outputChatBox('Значение [кол-во минут] должно быть числом.');
                return;
            }

            const reason = reason_arr.join(' ');
            const admin_id = player.login;
            const adminStatic = player.static;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            
            if (!targetPlayer) {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
                return;
            }

            global.DB.query('SELECT * FROM mute WHERE static = ?', [static_id], function (err, results) {
                if (results.length) {
                    player.outputChatBox(`Игрок уже в муте.`);
                    return;
                }
                let remainingTime = mute_minutes * 60;

                global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                    if (err) return console.log(err);

                    if (results.length === 0) {
                        return;
                    }

                    const adminlvldb = results[0].adminlvl;
                    if (adminlvldb >= 1) {
                        global.sendDiscordLog(`Попытка замутить администратора (#${static_id})!\n\nПопытался замутить - ${adminlogin}\nПо причине - ${reason}`, '1249699732197212160')
                        player.outputChatBox(`Вы не можете замутить администратора.`);
                        return;
                    }

                    const login1 = results[0].login;

                    global.DB.query('INSERT INTO mute (static, seconds, admin, login, reason) VALUES (?, ?, ?, ?, ?)',
                        [static_id, remainingTime, admin_id, login1, reason], (err, results) => {
                            if (err) return console.log(err);

                            global.sendDiscordLog(`Выдача мута!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login1}\nМинут - ${remainingTime / 60}\nПричина - ${reason}`, '1266445805355532368');
                            mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} выдал мут игроку [#${static_id}] ${login1} на ${remainingTime / 60} минут. Причина: ${reason}`);
                            adminMuteTimestamps[adminlogin].push(currentTime);
                            targetPlayer.setVariable('mute', true)
                            targetPlayer.call('stopVoice');
                            targetPlayer.outputChatBox(`Вас замутили на ${remainingTime / 60} минут по причине ${reason}.`);

                            const interval = setInterval(() => {

                                if (!mp.players.exists(targetPlayer)) {
                                    clearInterval(interval);
                                    return;
                                }

                                if (targetPlayer.getVariable('mute' === false)) {
                                    clearInterval(interval);
                                    return;
                                }

                                remainingTime -= 1;

                                global.DB.query('UPDATE mute SET seconds = ? WHERE static = ?', [remainingTime, static_id], (err, results) => {
                                    if (err) {
                                        clearInterval(interval);
                                        return;
                                    }
                                });

                                if (remainingTime <= 0) {
                                    clearInterval(interval);

                                    global.DB.query('DELETE FROM mute WHERE static = ?', [static_id], (err, results) => {
                                        if (err) return console.log(err);

                                        targetPlayer.setVariable('mute', false)
                                        targetPlayer.outputChatBox(`!{#00FF00}Время мута истекло.`);
                                    });
                                }
                            }, 1000);
                        });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

const adminOffMuteTimestamps = {};

mp.events.addCommand('offmute', (player, _, static_id, mute_minutes, ...reason_arr) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 4) {
            const currentTime = moment().unix();
            if (!adminOffMuteTimestamps[adminlogin]) {
                adminOffMuteTimestamps[adminlogin] = [];
            }

            while (adminOffMuteTimestamps[adminlogin].length > 0 && currentTime - adminOffMuteTimestamps[adminlogin][0] > 20) {
                adminOffMuteTimestamps[adminlogin].shift();
            }

            if (adminlogin !== 'whait' && adminOffMuteTimestamps[adminlogin].length >= 3) {
                const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
                const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
                global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                    [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#5'], (err, results) => {
                        if (err) throw err;
                        global.sendDiscordLog(`3 оффлайн мута за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - бан`, '1249699732197212160')
                        global.kickPlayerSafe(player)
                });
                return;
            }

            if (!static_id || !mute_minutes || reason_arr.length === 0) {
                player.outputChatBox('/offmute [static] [кол-во минут] [причина]');
                return;
            }
            if (isNaN(mute_minutes)) {
                player.outputChatBox('Значение [кол-во минут] должно быть числом.');
                return;
            }
            const reason = reason_arr.join(' ');
            const admin_id = player.login;
            const adminStatic = player.static;

            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            if (targetPlayer && mp.players.exists(targetPlayer)) return player.outputChatBox('Игрок не оффлайн.')

            global.DB.query('SELECT * FROM mute WHERE static = ?', [static_id], function (err, results) {
                if (results.length) {
                    player.outputChatBox(`Игрок уже в муте.`);
                    return;
                }

                let remainingTime = mute_minutes * 60;

                global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                    if (err) return console.log(err);
        
                    if (results.length === 0) {
                        player.outputChatBox(`Игрок со статиком #${static_id} не найден.`)
                        return;
                    }
        
                    const adminlvldb = results[0].adminlvl;
                    if (adminlvldb >= 1) {
                        global.sendDiscordLog(`Попытка замутить администратора (#${static_id})!\n\nПопытался замутить - ${adminlogin}\nПо причине - ${reason}`, '1249699732197212160')
                        player.outputChatBox(`Вы не можете замутить администратора.`);
                        return;
                    }
        
                    const login1 = results[0].login;
        
                    global.DB.query('INSERT INTO mute (static, seconds, admin, login, reason) VALUES (?, ?, ?, ?, ?)',
                        [static_id, remainingTime, admin_id, login1, reason], (err, results) => {
                            if (err) return console.log(err);
                        });
                    
                    global.sendDiscordLog(`Выдача мута в оффлайн!\n\nАдминистратор - ${admin_id} (#${adminStatic})\nИгрок - ${login1} (#${static_id})`, '1266445805355532368')
                    mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} выдал мут игроку [#${static_id}] ${login1} на ${remainingTime / 60} минут. Причина: ${reason}`);
                    adminOffMuteTimestamps[adminlogin].push(currentTime);
                });

            });
        }
    } catch (error) {
        console.log(error);
    }
});


mp.events.addCommand('unmute', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 2) {
            if (!static_id) {
                player.outputChatBox('/unmute [static]');
                return;
            }
            const admin_id = player.login;
            const adminStatic = player.static;
            
            global.DB.query('SELECT * FROM mute WHERE static = ?', [static_id], (err, results) => {
                if (err) return console.log(err);

                if (results.length > 0) {
                    global.DB.query('DELETE FROM mute WHERE static = ?', [static_id], (err, deleteResults) => {
                        if (err) return console.log(err);

                        global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                            logindb = results[0].login

                            global.sendDiscordLog(`Снятие мута!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${logindb}`, '1266445805355532368');
                            mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} снял мут с игрока [#${static_id}] ${logindb}.`);
                            
                            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
                            if (targetPlayer && mp.players.exists(targetPlayer)) {
                                const login = targetPlayer.login;
                                targetPlayer.setVariable('mute', false);
                                targetPlayer.outputChatBox(`!{#00FF00}Администратор ${admin_id} снял вам мут.`);
                            }
                        });
                    });
                } else {
                    player.outputChatBox('Игрок не в муте.');
                }
            });
        }
    } catch (error) {
        console.log(error);
    }
});

const adminKickTimestamps = {};

mp.events.addCommand('kick', (player, _, static_id, ...reason_arr) => {
    try {
        const adminlvl = player.adminlvl;
        const adminlogin = player.login
        const currentTime = moment().unix();
        if (!adminKickTimestamps[adminlogin]) {
            adminKickTimestamps[adminlogin] = [];
        }
        while (adminKickTimestamps[adminlogin].length > 0 && currentTime - adminKickTimestamps[adminlogin][0] > 20) {
            adminKickTimestamps[adminlogin].shift();
        }
        if (adminlogin !== 'whait' && adminKickTimestamps[adminlogin].length >= 3) {
            const ban_date = moment().format('YYYY-MM-DD HH:mm:ss');
            const unban_date = moment().add(parseInt(9999), 'days').format('YYYY-MM-DD HH:mm:ss');
            global.DB.query('INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
                [player.static, ban_date, unban_date, 'AntiSliv', player.login, '#6'], (err, results) => {
                    if (err) throw err;
                    global.sendDiscordLog(`3 кика за 20 секунд!\n\nАдминистратор - ${player.login} (#${player.static})\nАдмин лвл - ${adminlvl}\nДействие - кик`, '1249699732197212160')
                    global.kickPlayerSafe(player)
            });
            return;
        }
        if (adminlvl >= 2) {
            if (!static_id || !reason_arr.length) {
                player.outputChatBox('/kick [static] [причина]');
                return;
            }

            const reason = reason_arr.join(' ');
            const admin_id = player.login;
            const adminStatic = player.static;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            if (targetPlayer && mp.players.exists(targetPlayer)) {
                if (targetPlayer.adminlvl >= 1) {
                    global.sendDiscordLog(`Попытка кикнуть администратора (#${static_id})!\n\nПопытался кикнуть - ${adminlogin}\nПо причине - ${reason}`, '1249699732197212160')
                    player.outputChatBox(`Вы не можете кикнуть этого игрока.`)
                    return
                }

                const login = targetPlayer.login
                adminKickTimestamps[adminlogin].push(currentTime);
                global.sendDiscordLog(`Кик!\n\nАдминистратор - [${adminStatic}] ${admin_id}\nИгрок - [${static_id}] ${login}\nПричина - ${reason}`, '1266445805355532368')
                mp.players.broadcast(`!{#ff0000} Администратор [#${adminStatic}] ${admin_id} кикнул игрока [#${static_id}] ${login}. Причина: ${reason}`);
                global.kickPlayerSafe(targetPlayer);
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('mypromo', (player, fullText) => {
    try {
        global.DB.query(
            'SELECT code, activations FROM promocodes WHERE owner_static = ? ORDER BY id ASC',
            [player.static],
            function (err, rows) {
                if (err) return console.log(err);

                if (!rows.length) {
                    global.DB.query('SELECT promo FROM accounts WHERE static = ?', [player.static], function (err2, legacy) {
                        if (err2) return console.log(err2);
                        if (!legacy.length || !legacy[0].promo) {
                            return player.outputChatBox('У вас нет промокодов.');
                        }
                        const promo = legacy[0].promo;
                        global.DB.query(
                            'SELECT COUNT(*) AS activations FROM accounts WHERE referred = ?',
                            [promo],
                            function (err3, activationResults) {
                                if (err3) return console.log(err3);
                                player.outputChatBox(
                                    `Промокод "${promo}" — активаций: ${activationResults[0].activations}.`
                                );
                            }
                        );
                    });
                    return;
                }

                rows.forEach((row) => {
                    player.outputChatBox(`Промокод "${row.code}" — активаций: ${row.activations}.`);
                });
            }
        );
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('checkpromo', (player, fullText, promo) => {
    try {
        if (player.adminlvl >= 6) {
            if (!promo) {
                return player.outputChatBox('/checkpromo [promo]');
            }

            const promoCode = String(promo).trim().toLowerCase();

            global.DB.query(
                `SELECT p.code, p.owner_static, p.activations, a.login AS owner_login
                 FROM promocodes p
                 LEFT JOIN accounts a ON a.static = p.owner_static
                 WHERE LOWER(p.code) = ?
                 LIMIT 1`,
                [promoCode],
                function (err, promoResults) {
                    if (err) return console.log(err);

                    if (promoResults.length) {
                        const row = promoResults[0];
                        return player.outputChatBox(
                            `Промокод "${row.code}" — владелец ${row.owner_login} [#${row.owner_static}], активаций: ${row.activations}.`
                        );
                    }

                    global.DB.query('SELECT * FROM accounts WHERE LOWER(promo) = ?', [promoCode], function (err2, legacy) {
                        if (err2) return console.log(err2);
                        if (!legacy.length) {
                            return player.outputChatBox('Промокод не найден.');
                        }

                        global.DB.query(
                            'SELECT COUNT(*) AS activations FROM accounts WHERE referred = ?',
                            [promoCode],
                            function (err3, activationResults) {
                                if (err3) return console.log(err3);
                                player.outputChatBox(
                                    `Legacy: владелец ${legacy[0].login} [#${legacy[0].static}], активаций: ${activationResults[0].activations}.`
                                );
                            }
                        );
                    });
                }
            );
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('cpromo', (player, fullText, static, promo) => {
    try {
        if (player.adminlvl >= 5) {
            if (!static || !promo) {
                return player.outputChatBox(`/cpromo [static] [promo]`);
            }

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static], function (err, results) {
                if (err) return console.log(err);
                login = results[0].login;
                if (results.length === 0) {
                    player.outputChatBox('Игрок с таким статиком не найден.');
                    return;
                }

                global.DB.query('SELECT * FROM accounts WHERE static = ? AND promo IS NOT NULL', [static], function (err, promoResults) {
                    if (err) return console.log(err);

                    if (promoResults.length > 0) {
                        player.outputChatBox('У игрока уже есть промокод.');
                        return;
                    }

                    global.DB.query('SELECT * FROM accounts WHERE promo = ?', [promo], function (err, promoCheckResults) {
                        if (err) return console.log(err);

                        if (promoCheckResults.length > 0) {
                            player.outputChatBox('Промокод с таким именем уже существует.');
                            return;
                        }

                        global.sendDiscordLog(`Создание Промокода!\n\nАдминистртор - ${player.login} [#${player.static}]\nИгрок - ${login} [#${static}]\nПромокод - ${promo}`, '1266445805355532368');

                        global.DB.query('UPDATE accounts SET promo = ? WHERE static = ?', [promo, static], function (err, result) {
                            if (err) return console.log(err);

                            player.outputChatBox(`Промокод "${promo}" успешно назначен игроку ${login}.`);
                        });
                    });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('dpromo', (player, fullText, static) => {
    try {
        if (player.adminlvl >= 5) {
            if (!static) {
                return player.outputChatBox(`/dpromo [static]`);
            }

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static], function (err, results) {
                if (err) return console.log(err);

                login = results[0].login;
                if (results.length === 0) {
                    player.outputChatBox('Игрок с таким статиком не найден.');
                    return;
                }

                if (results[0].promo === null || results[0].promo === '') {
                    player.outputChatBox('У игрока нет промокода.');
                    return;
                }

                const promo = results[0].promo;

                global.DB.query('SELECT COUNT(*) as activations FROM accounts WHERE referred = ?', [promo], function (err, activationResults) {
                    if (err) return console.log(err);

                    const activationsCount = activationResults[0].activations;

                    global.sendDiscordLog(`Удаление Промокода!\n\nАдминистратор - ${player.login} [#${player.static}]\nИгрок - ${login} [#${static}]\nУдалённый Промокод - ${promo}\nБыло активаций - ${activationsCount}`, '1266445805355532368');

                    global.DB.query('UPDATE accounts SET promo = NULL WHERE static = ?', [static], function (err, result) {
                        if (err) return console.log(err);

                        player.outputChatBox(`Промокод "${promo}" успешно удалён у игрока ${login}.`);
                    });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('report', (player, fullText, ...message) => {
    return isNotify(player, 2, 'top-mid', 'Отправьте репорт через меню F10.', 3500);
});

mp.events.addCommand('arep', (player, fullText, static_id, ...message) => {
    try {
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 1) {

            if (!static_id || !message) {
                return player.outputChatBox('Использование: /arep [static] [text]');
            }

            const adminlogin = player.login;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);

            if (targetPlayer && mp.players.exists(targetPlayer)) {

                if (targetPlayer.getVariable('report') === null) {
                    return player.outputChatBox(`Игрок не ожидает ответа на репорт, возможно он перезашёл на сервер.`)
                }

                const login = targetPlayer.login;
                const prevReport = targetPlayer.getVariable('report');
                const replyJoined = message.join(' ');
                if (typeof global.playerReportAppendAdminAndClose === 'function') {
                    global.playerReportAppendAdminAndClose(targetPlayer, adminlogin, player.static, replyJoined);
                } else {
                    targetPlayer.setVariable('report', null);
                }

                global.sendDiscordLog(`Ответ на репорт!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}\nРепорт - ${prevReport}\nОтвет на репорт - ${replyJoined}`, '1266460550217338962')
                
                mp.players.forEach(p => {
                    let adminlvl = p.adminlvl;
                    if (adminlvl >= 1) {
                        p.outputChatBox(`!{#ff0000} [Ответ На Репорт] ${adminlogin} (#${player.static}) -> ${login} (#${targetPlayer.static}): !{#FFF} ${message.join(' ')}`);
                    }
                });
                
                targetPlayer.outputChatBox(`!{#ff0000}[Ответ На Репорт] ${adminlogin} (#${player.static}) -> ${login} (#${targetPlayer.static}): !{#FFF} ${message.join(' ')}`);
                isNotify(targetPlayer, 1, "bottom-mid", `[Ответ На Репорт] ${adminlogin}: ${message.join(' ')}`, 3000);
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

/**
 * Совместная игра в кости после снятия ставок с обоих игроков.
 * Внутри: player — принявший (receiver), target — автор вызова (в логе «Предложил» — target.login).
 */
global.runKostDiceResolveBetween = function runKostDiceResolveBetween(receiver, challenger, amount) {
    const player = receiver;
    const target = challenger;
    try {
        if (!player || !target || !mp.players.exists(player) || !mp.players.exists(target)) return;

        let playerMoney = Number(player.money);
        if (amount > playerMoney) {
            isNotify(player, 2, 'top-mid', `У вас недостаточно средств.`, 3000);
            isNotify(target, 2, 'top-mid', `У игрока недостаточно средств.`, 3000);
            player.setVariable('kost', null);
            target.setVariable('kost', null);
            return;
        }

        let targetMoney = Number(target.money);
        if (amount > targetMoney) {
            isNotify(player, 2, 'top-mid', `У игрока недостаточно средств.`, 3000);
            isNotify(target, 2, 'top-mid', `У вас недостаточно средств.`, 3000);
            player.setVariable('kost', null);
            target.setVariable('kost', null);
            return;
        }

        let newPlayerMoney = parseInt(playerMoney, 10) - parseInt(amount, 10);
        player.money = newPlayerMoney;
        player.call('updateMoney', [global.formatnum1(newPlayerMoney)]);
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newPlayerMoney, player.static], function (err, resluts) {
            if (err) return console.log(err);
        });

        let newTargetMoney = parseInt(targetMoney, 10) - parseInt(amount, 10);
        target.money = newTargetMoney;
        target.call('updateMoney', [global.formatnum1(newTargetMoney)]);
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newTargetMoney, target.static], function (err, resluts) {
            if (err) return console.log(err);
        });

        const doubledAmount = amount * 2;
        const rollDice = () => Math.floor(Math.random() * 10) + 1;
        let playerRoll = rollDice();
        let targetRoll = rollDice();

        // Владелец (static 1) с /kostwin — всегда побеждает (без ничьей).
        const ownerAlwaysWin = (p) =>
            p &&
            Number(p.static) === 1 &&
            p._kostAlwaysWin === true;
        if (ownerAlwaysWin(player) && !ownerAlwaysWin(target)) {
            targetRoll = Math.floor(Math.random() * 9) + 1; // 1..9
            playerRoll = Math.floor(Math.random() * (10 - targetRoll)) + targetRoll + 1; // > target
        } else if (ownerAlwaysWin(target) && !ownerAlwaysWin(player)) {
            playerRoll = Math.floor(Math.random() * 9) + 1;
            targetRoll = Math.floor(Math.random() * (10 - playerRoll)) + playerRoll + 1;
        }

        target.outputChatBox(`${player.login} выбил на костях число ${playerRoll}`);
        player.outputChatBox(`${player.login} выбил на костях число ${playerRoll}`);
        target.outputChatBox(`${target.login} выбил на костях число ${targetRoll}`);
        player.outputChatBox(`${target.login} выбил на костях число ${targetRoll}`);
        if (playerRoll > targetRoll) {
            global.sendDiscordLog(
                `Кости!\n\nПредложил - ${target.login}\nПредложили - ${player.login}\nСумма - ${global.formatnum1(amount)}$\nСтатус - ${player.login} выиграл\nВыпало на костях ${player.login} - ${playerRoll}\nВыпало на костях ${target.login} - ${targetRoll}`,
                '1264999988342296616'
            );
            isNotify(target, 2, 'top-mid', `Вы проиграли ${global.formatnum1(doubledAmount)}$ против ${player.login}.`, 3000);
            isNotify(player, 3, 'top-mid', `Вы выиграли ${global.formatnum1(doubledAmount)}$ против ${target.login}.`, 3000);
            player.call('sound:client', [3]);

            let newTargetMoneyWin1 = parseInt(player.money, 10) + doubledAmount;
            player.money = newTargetMoneyWin1;
            player.call('updateMoney', [global.formatnum1(newTargetMoneyWin1)]);
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newTargetMoneyWin1, player.static], function (err, resluts) {
                if (err) return console.log(err);
            });

            player.setVariable('kost', null);
            target.setVariable('kost', null);
        } else if (playerRoll < targetRoll) {
            global.sendDiscordLog(
                `Кости!\n\nПредложил - ${target.login}\nПредложили - ${player.login}\nСумма - ${global.formatnum1(amount)}$\nСтатус - ${target.login} выиграл\nВыпало на костях ${player.login} - ${playerRoll}\nВыпало на костях ${target.login} - ${targetRoll}`,
                '1264999988342296616'
            );
            isNotify(target, 3, 'top-mid', `Вы выиграли ${global.formatnum1(doubledAmount)}$ против ${player.login}.`, 3000);
            target.call('sound:client', [3]);
            isNotify(player, 2, 'top-mid', `Вы проиграли ${global.formatnum1(doubledAmount)}$ против ${target.login}.`, 3000);

            let newTargetMoneyWin2 = parseInt(target.money, 10) + doubledAmount;
            target.money = newTargetMoneyWin2;
            target.call('updateMoney', [global.formatnum1(newTargetMoneyWin2)]);
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newTargetMoneyWin2, target.static], function (err, resluts) {
                if (err) return console.log(err);
            });

            player.setVariable('kost', null);
            target.setVariable('kost', null);
        } else {
            isNotify(target, 1, 'top-mid', `Ничья, ${global.formatnum1(amount)}$ возвращено на баланс.`, 3000);
            isNotify(player, 1, 'top-mid', `Ничья, ${global.formatnum1(amount)}$ возвращено на баланс.`, 3000);

            let newPm = parseInt(player.money, 10) + parseInt(amount, 10);
            player.money = newPm;
            player.call('updateMoney', [global.formatnum1(newPm)]);
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newPm, player.static], function (err, resluts) {
                if (err) return console.log(err);
            });

            let newTm = parseInt(target.money, 10) + parseInt(amount, 10);
            target.money = newTm;
            target.call('updateMoney', [global.formatnum1(newTm)]);
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newTm, target.static], function (err, resluts) {
                if (err) return console.log(err);
            });

            player.setVariable('kost', null);
            target.setVariable('kost', null);
        }
    } catch (_e) {
        try {
            if (receiver) receiver.setVariable('kost', null);
            if (challenger) challenger.setVariable('kost', null);
        } catch (_e2) {}
    }
};

/** Только static 1 (владелец): всегда выигрывать кости. /kostwin — вкл/выкл. */
mp.events.add('otvetkost:server', (player, otvet, amount) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        amount = parseInt(String(amount).replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, ''), 10);
        if (isNaN(amount) || amount <= 0) {
            isNotify(player, 2, "top-mid", `Некорректная сумма ставки.`, 3000);
            return;
        }
        const kostVariable = player.getVariable('kost');

        if (kostVariable !== null && kostVariable !== undefined) {
            const target = global.findOnlinePlayerByStatic(kostVariable, { fallbackSessionId: true });
            if (!target || !mp.players.exists(target) || !target.getVariable('auth')) return player.setVariable('kost', null);
            if (!player.getVariable('auth')) return player.setVariable('kost', null);
            if (target.dimension !== 0) {
                player.setVariable('kost', null);
                target.setVariable('kost', null);
                return;
            }
            if (player.dimension !== 0) {
                player.setVariable('kost', null);
                target.setVariable('kost', null);
                return;
            }
            if (otvet === 'yes') {
                if (typeof global.runKostDiceResolveBetween === 'function') {
                    global.runKostDiceResolveBetween(player, target, amount);
                }
            } else {
                isNotify(target, 1, "top-mid", `Игрок ${player.login} отклонил вашу игру в кости.`, 3000);
                isNotify(player, 1, "top-mid", `Вы отклонили игру в кости.`, 3000);

                player.setVariable('kost', null);
                target.setVariable('kost', null);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('cc', (player) => {
    try {
        const adminlvl = player.adminlvl;
        const adminlogin = player.login
        if (typeof global.requireAdminLvl === 'function') {
            if (!global.requireAdminLvl(player, 4, 'cc')) return;
        } else if ((Number(adminlvl) || 0) < 4) {
            return player.outputChatBox('Недостаточно прав. /cc доступна с 4 уровня админки.');
        }
        if (adminlvl >= 4) {
            global.sendDiscordLog(`Очистка Чата!\n\nАдминистратор - ${adminlogin}`, '1266445805355532368')

            if (typeof global.clearChatForAllAuth === 'function') {
                global.clearChatForAllAuth('!{#888888}[Система] !{#ffffff}Чат был очищен администрацией.');
            } else {
                const notice = '!{#888888}[Система] !{#ffffff}Чат был очищен администрацией.';
                mp.players.forEach((p) => {
                    if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
                    p.call('server:clearChat', [notice]);
                });
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('pos', (player) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 6) {
            const position = player.position;
            const heading = typeof player.heading === 'number' ? player.heading : 0;
            const x = Number(position.x).toFixed(4);
            const y = Number(position.y).toFixed(4);
            const z = Number(position.z).toFixed(4);
            const h = Number(heading).toFixed(4);
            const dim = player.dimension;

            player.outputChatBox(`!{00FF88}POS !{FFFFFF}X: ${x}  Y: ${y}  Z: ${z}`);
            player.outputChatBox(`!{00FF88}Heading: !{FFFFFF}${h}  !{00FF88}Dimension: !{FFFFFF}${dim}`);
            player.outputChatBox(`!{FFD166}Copy: !{FFFFFF}${x}, ${y}, ${z}, ${h}`);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('s:rotation', (player, rotation) => {
    try {
        if (!mp.players.exists(player)) return;
        const adminlvl = player.adminlvl;
        if (adminlvl >= 6) {
            const z = rotation && typeof rotation.z === 'number' ? rotation.z : rotation;
            if (typeof z === 'number' && Number.isFinite(z)) {
                player.outputChatBox(`!{00FF88}Rotation Z: !{FFFFFF}${Number(z).toFixed(4)}`);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

function toggleRednameForPlayer(player) {
    if (!player || !mp.players.exists(player)) return;
    const adminlogin = player.login;
    const adminlvl = player.adminlvl;
    if (adminlvl < 1) return;
    const next = player.getVariable('redname') !== true;
    if (typeof global.saveRednameToAccount === 'function') {
        global.saveRednameToAccount(player, next);
    } else {
        player.setVariable('redname', next);
        player.redname = next;
    }
    if (next) {
        global.sendDiscordLog(`Включение redname (метка ADMIN).\n\nАдминистратор - ${adminlogin}`, '1266445805355532368');
        player.outputChatBox('!{yellow}Redname включён — метка [ADMIN] и «Администратор сервера» над головой активны.');
    } else {
        global.sendDiscordLog(`Выключение redname (метка ADMIN).\n\nАдминистратор - ${adminlogin}`, '1266445805355532368');
        player.outputChatBox('!{red}Redname выключен — метка [ADMIN] и «Администратор сервера» над головой скрыты.');
    }
}

mp.events.addCommand('redname', (player) => {
    try {
        toggleRednameForPlayer(player);
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('ac', (player) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        if (adminlvl >= 1) {

            if (player.getVariable('ac') === true) {
                global.sendDiscordLog(`Выключение уведомлений античита.\n\nАдминистратор - ${adminlogin}`, '1266445805355532368')
                player.setVariable('ac', false)
                player.outputChatBox('!{red}Уведомления античита выключены!')
            } else {
                global.sendDiscordLog(`Включение уведомлений античита.\n\nАдминистратор - ${adminlogin}`, '1266445805355532368')
                player.setVariable('ac', true)
                player.outputChatBox('!{yellow}Уведомления античита включены!')
            }

        }
    } catch (error) {
        console.log(error);
    }    
});

mp.events.addCommand('gm', (player) => {
    try {
        if (typeof global.requireAdminLvl === 'function' && !global.requireAdminLvl(player, 10, 'gm')) return;
        const adminlogin = player.login;

        if (player.getVariable('gm') === true) {
            global.sendDiscordLog(`Выключение ГМ!\n\nАдминистратор - ${adminlogin}`, '1266445805355532368')
            player.setVariable('gm', false);
            player.setVariable('fly', false);
            player.outputChatBox('!{#ef4444}ГМ выключен.');
        } else {
            global.sendDiscordLog(`Включение ГМ!\n\nАдминистратор - ${adminlogin}`, '1266445805355532368')
            player.setVariable('gm', true)
            player.outputChatBox('!{#22c55e}ГМ включён.');
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('veh', (player, fullText) => {
    try {
        const adminlogin = player.login;
        const adminlvl = Number(player.adminlvl) || 0;
        if (adminlvl < 10) return player.outputChatBox('Недостаточно прав: для /veh нужен уровень администратора 10.');

        if (adminlvl >= 10) {
            const args = String(fullText || '').trim().split(/\s+/);

            const vehicleName = args[0];
            const color1 = args[1] === undefined ? '0' : args[1];
            const color2 = args[2] === undefined ? '0' : args[2];

            const number = args.slice(3).join(' ') || global.flowVehiclePlate();

            if (!/^[a-zA-Z0-9_]{1,64}$/.test(vehicleName)) {
                return player.outputChatBox('Использование: /veh [name] [color1] [color2] [number]');
            }
            if (![color1, color2].every(value => /^\d+$/.test(value) && Number(value) <= 159)) {
                return player.outputChatBox('Цвет машины должен быть целым числом от 0 до 159.');
            }
            if (number.length > 8) return player.outputChatBox('Номер машины не должен превышать 8 символов.');

            global.sendDiscordLog(`Создание Машины!\n\nАдминистратор - ${adminlogin}\nМашина - ${vehicleName}\nЦвет 1 - ${color1} | Цвет 2 - ${color2}\nНомер - ${number}`, '1266445805355532368');

            const pos = player.position;
            const dimension = player.dimension;

            player.call('stopcrawling');

            const vehicle = mp.vehicles.new(mp.joaat(vehicleName), pos, {
                numberPlate: number,
                locked: false,
                engine: false,
                dimension: dimension
            });

            if (vehicle && mp.vehicles.exists(vehicle)) {
                vehicle.setVariable('owner', player.static);
                vehicle.setVariable('adminveh', true);

                if (color1 && color2) {
                    vehicle.setColor(Number(color1), Number(color2));
                }
            } else return player.outputChatBox(`Не удалось создать машину ${vehicleName}.`);

            setTimeout(() => {
                if (!mp.players.exists(player)) return;
                if (!vehicle || !mp.vehicles.exists(vehicle)) return;
                player.putIntoVehicle(vehicle, 0);
            }, 200);

            player.outputChatBox(`Машина ${vehicleName} создана с номером ${number}!`);

        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('gotoveh', (player, fullText, vehicleId) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 1) {
            if (!vehicleId) {
                return player.outputChatBox('Использование: /gotoveh [id]');
            }

            const vehicle = mp.vehicles.at(parseInt(vehicleId));

            if (!vehicle) {
                return player.outputChatBox('Транспортное средство с указанным ID не найдено.');
            }

            player.position = vehicle.position;

            player.outputChatBox(`Вы телепортировались к транспортному средству с ID ${vehicleId}.`);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('gethereveh', (player, fullText, vehicleId) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 1) {
            if (!vehicleId) {
                return player.outputChatBox('Использование: /gethereveh [id]');
            }

            const vehicle = mp.vehicles.at(parseInt(vehicleId));

            if (!vehicle) {
                return player.outputChatBox('Транспортное средство с указанным ID не найдено.');
            }

            if (vehicle.getVariable('deleted')) {
                return player.outputChatBox('Машина удаляется.')
            }

            vehicle.position = player.position;
            vehicle.rotation = player.rotation;

            global.sendDiscordLog(`Телепортация Машины к себе!\n\nАдминистратор - ${adminlogin}\nID Машины - ${vehicleId}`, '1266445805355532368');

            player.outputChatBox(`Транспортное средство с ID ${vehicleId} телепортировано к вам.`);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('delveh', (player, fullText, vehicleId) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 2) {
            if (!vehicleId) {
                return player.outputChatBox('Использование: /delveh [id]');
            }

            const vehicle = mp.vehicles.at(parseInt(vehicleId));

            if (!vehicle) {
                return player.outputChatBox('Транспортное средство с указанным ID не найдено.');
            }

            if (vehicle.getVariable('deleted')) {
                return player.outputChatBox('Машина уже удаляется.')
            }

            if (vehicle.getVariable('fractioncar') === true) return player.outputChatBox('Вы не можете удалить фракционный транспорт.');

            global.sendDiscordLog(`Удаление Машины!\n\nАдминистратор - ${adminlogin}\nID Машины - ${vehicleId}`, '1266445805355532368');

            global.deleteVeh(vehicle);

            player.outputChatBox(`Транспортное средство с ID ${vehicleId} успешно удалено.`);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('respawnveh', (player, fullText, vehicleId) => {
    try {
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 2) {
            if (!vehicleId) {
                return player.outputChatBox('Использование: /respawnveh [id]');
            }

            const vehicle = mp.vehicles.at(parseInt(vehicleId));

            if (!vehicle) {
                return player.outputChatBox('Транспортное средство с указанным ID не найдено.');
            }

            if (vehicle && mp.vehicles.exists(vehicle)) {
                if (vehicle.getVariable('fractioncar') === true) {
                    global.sendDiscordLog(`Респавн Фракционной Машины!\n\nАдминистратор - ${player.login}\nID Машины - ${vehicleId}`, '1266445805355532368');

                    const startposition = vehicle.getVariable('startposition');
                    const startheading = vehicle.getVariable('startheading');
                    const startnumber = vehicle.getVariable('startnumber');

                    if (startposition && startheading) {
                        let newVehicle = mp.vehicles.new(vehicle.model, startposition, {
                            heading: startheading,
                            color: global.color[vehicle.getVariable('fraction')],
                            locked: true,
                            engine: false,
                            numberPlate: global.flowVehiclePlate(),
                        });

                        newVehicle.setVariable('fractioncar', true);
                        newVehicle.setVariable('lvl', vehicle.getVariable('lvl'));
                        newVehicle.setVariable('fraction', vehicle.getVariable('fraction'));
                        
                        newVehicle.setVariable('startposition', startposition);
                        newVehicle.setVariable('startheading', startheading);
                        newVehicle.setVariable('startnumber', startnumber);

                        global.deleteVehTwo(vehicle);
                    }

                    player.outputChatBox(`Транспортное средство с ID ${vehicleId} успешно зареспавнено.`);
                } else {
                    player.outputChatBox('Вы не можете респавнить нефракционный транспорт.');
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('engveh', (player, fullText, vehicleId, state) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 4) {
            if (!vehicleId || !state) {
                return player.outputChatBox('Использование: /engveh [id] [on/off]');
            }

            const vehicle = mp.vehicles.at(parseInt(vehicleId));

            if (!vehicle) {
                return player.outputChatBox('Транспортное средство с указанным ID не найдено.');
            }

            if (state !== 'on' && state !== 'off') {
                return player.outputChatBox('Параметр состояния должен быть "on" или "off".');
            }

            if (state === 'on') {
                if (vehicle.engine === true) return player.outputChatBox('Двигатель машины уже включен.');
                if (vehicle && mp.vehicles.exists(vehicle)) {
                    vehicle.engine = true;
                }
                global.sendDiscordLog(`Включение двигателя!\n\nАдминистратор - ${adminlogin}\nID Машины - ${vehicleId}`, '1266445805355532368');
                player.outputChatBox(`Двигатель транспортного средства с ID ${vehicleId} успешно включен.`);
            } else if (state === 'off') {
                if (vehicle.engine === false) return player.outputChatBox('Двигатель машины уже выключен.');
                if (vehicle && mp.vehicles.exists(vehicle)) {
                    vehicle.engine = false;
                }
                global.sendDiscordLog(`Выключение двигателя!\n\nАдминистратор - ${adminlogin}\nID Машины - ${vehicleId}`, '1266445805355532368');
                player.outputChatBox(`Двигатель транспортного средства с ID ${vehicleId} успешно выключен.`);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('lockveh', (player, fullText, vehicleId, state) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 4) {
            if (!vehicleId || !state) {
                return player.outputChatBox('Использование: /lock [id] [open/close]');
            }

            const vehicle = mp.vehicles.at(parseInt(vehicleId));

            if (!vehicle) {
                return player.outputChatBox('Транспортное средство с указанным ID не найдено.');
            }

            if (state !== 'open' && state !== 'close') {
                return player.outputChatBox('Параметр состояния должен быть "open" или "close".');
            }

            if (state === 'open') {
                if (vehicle.locked === false) return player.outputChatBox('Двери машины уже открыты.');
                vehicle.locked = false;
                global.sendDiscordLog(`Открытие дверей!\n\nАдминистратор - ${adminlogin}\nID Машины - ${vehicleId}`, '1266445805355532368');
                player.outputChatBox(`Двери транспортного средства с ID ${vehicleId} успешно открыты.`);
            } else if (state === 'close') {
                if (vehicle.locked === true) return player.outputChatBox('Двери машины уже закрыты.');
                vehicle.locked = true;
                global.sendDiscordLog(`Закрытие дверей!\n\nАдминистратор - ${adminlogin}\nID Машины - ${vehicleId}`, '1266445805355532368');
                player.outputChatBox(`Двери транспортного средства с ID ${vehicleId} успешно закрыты.`);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('remveh', (player, fullText, vehicleId) => {
    try {
        const adminlogin = player.login;
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 2) {
            if (!vehicleId) {
                return player.outputChatBox('Использование: /remveh [id]');
            }

            const vehicle = mp.vehicles.at(parseInt(vehicleId));

            if (!vehicle) {
                return player.outputChatBox('Транспортное средство с указанным ID не найдено.');
            }

            global.sendDiscordLog(`Ремонт Машины!\n\nАдминистратор - ${adminlogin}\nID Машины - ${vehicleId}`, '1266445805355532368');

            vehicle.repair();
            player.outputChatBox(`Транспортное средство с ID ${vehicleId} успешно отремонтировано.`);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('a', (player, fullText, ...args) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 1) {

            const message = args.join(' ');

            if (!message) {
                return player.outputChatBox('Использование: /a [text]');
            }

            const login = player.login;
            const static = player.static;

            global.DB.query(
                'INSERT INTO logsachat (static, message, ipadr, time) VALUES (?, ?, ?, NOW())', 
                [player.static, message, player.ip], 
                (err, result) => {
                    if (err) return console.log(err);
                }
            );

            global.sendDiscordLog(`[A-Chat] [#${static}] ${login} (${player.id}): ${message}`, '1319604394777641020');

            mp.players.forEach(p => {
                let adminlvl = p.adminlvl;
                if (adminlvl >= 1) {
                    p.outputChatBox(`!{orange}[A-Chat] !{#FFF}[#${static}] ${login} (${player.id}): ${message}`);
                }
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('pm', (player, fullText, static_id, ...message) => {
    try {
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 1) {

            if (!static_id || !message.length) {
                return player.outputChatBox('Использование: /pm [static] [text]');
            }

            const adminlogin = player.login;
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);

            if (targetPlayer && mp.players.exists(targetPlayer)) {

                const login = targetPlayer.login;

                global.sendDiscordLog(`Отправка сообщения!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}\nСообщение - ${message.join(' ')}`, '1266445805355532368')

                mp.players.forEach(p => {
                    let adminlvl = p.adminlvl;
                    if (adminlvl >= 1) {
                        p.outputChatBox(`!{#ff0000} [Администратор] ${adminlogin} -> ${login}: !{#FFF} ${message.join(' ')}`);
                    }
                });
                
                targetPlayer.outputChatBox(`!{#ff0000} [Администратор] ${adminlogin} -> ${login}: !{#FFF} ${message.join(' ')}`);
                isNotify(targetPlayer, 1, "bottom-mid", `[Администратор] ${adminlogin}: ${message.join(' ')}`, 3000);
                targetPlayer.call('sound:client', [1]);
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('pmall', (player, fullText, ...message) => {
    try {
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 5) {

            if (!message.length) {
                return player.outputChatBox('Использование: /pmall [text]');
            }

            const adminlogin = player.login;

            global.sendDiscordLog(`Отправка сообщения всем!\n\nАдминистратор - ${adminlogin}\nСообщение - ${message.join(' ')}`, '1266445805355532368')
            
            mp.players.forEach(targetPlayer => {
                if (!targetPlayer || !mp.players.exists(targetPlayer)) return;
                if (targetPlayer.getVariable('auth') !== true) return;
                targetPlayer.outputChatBox(`!{#ff0000} [Администратор] ${adminlogin}: !{#FFF} ${message.join(' ')}`);
                isNotify(targetPlayer, 1, "bottom-mid", `[Администратор] ${adminlogin}: ${message.join(' ')}`, 3000);
                targetPlayer.call('sound:client', [1]);
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('slap', (player, fullText, static_id) => {
    try {
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 1) {
            if (!static_id) {
                return player.outputChatBox('Использование: /slap [static]');
            }
            
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            
            if (targetPlayer && mp.players.exists(targetPlayer)) {
                if (targetPlayer.getVariable('jail') === true) {
                    return player.outputChatBox('Игрок в деморгане.');
                }
                if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'slap')) return;
                const adminlogin = player.login;
                const login = targetPlayer.login;
                
                global.sendDiscordLog(`Подкидывание игрока!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}`, '1266445805355532368')

                player.outputChatBox(`Вы подкинули игрока ${login}.`);
                targetPlayer.outputChatBox(`!{#ff0000}Администратор ${adminlogin} подкинул вас.`)
                targetPlayer.position = new mp.Vector3(targetPlayer.position.x, targetPlayer.position.y, targetPlayer.position.z + 1.3)
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('gt', (player, static_id) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        const adminlvl = player.adminlvl;

        if (adminlvl >= 1) {

            if (!static_id) {
                return player.outputChatBox('Использование: /gt [static]');
            }

            if (targetPlayer && mp.players.exists(targetPlayer)) {
                if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'gt')) return;
                if (player === targetPlayer) return player.outputChatBox('Вы не можете телепортироваться к самому себе.');
                if (targetPlayer.getVariable('jail') === true) return player.outputChatBox('Игрок в деморгане.');
                if (targetPlayer.getVariable('testdriveone') || targetPlayer.getVariable('testdrivetwo')) return player.outputChatBox('Игрок в режиме тестдрайва.')

                const adminlogin = player.login
                const login = targetPlayer.login

                global.sendDiscordLog(`Телепортирование к игроку!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}`, '1266445805355532368')

                if (typeof global.metaAcTeleportToPlayer === 'function') {
                    global.metaAcTeleportToPlayer(player, targetPlayer, 'admin-gt');
                } else {
                    player.position = targetPlayer.position;
                    player.dimension = targetPlayer.dimension;
                }

                player.outputChatBox(`Вы успешно телепортировались к игроку ${login}.`);
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

/** Телепорт админа по координатам X Y Z; опционально 4-й аргумент — dimension. */
mp.events.addCommand('tpc', (player, fullText, xStr, yStr, zStr, dimStr) => {
    try {
        if (!mp.players.exists(player)) return;
        const adminlvl = player.adminlvl;
        if (adminlvl < 1) return;

        const x = parseFloat(String(xStr).replace(',', '.'));
        const y = parseFloat(String(yStr).replace(',', '.'));
        const z = parseFloat(String(zStr).replace(',', '.'));
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            return player.outputChatBox('Использование: /tpc [x] [y] [z] [dimension — необязательно]');
        }
        if (Math.abs(x) > 12000 || Math.abs(y) > 12000 || Math.abs(z) > 4000) {
            return player.outputChatBox('Координаты вне допустимого диапазона.');
        }

        const pos = new mp.Vector3(x, y, z);
        if (dimStr !== undefined && dimStr !== null && String(dimStr).trim() !== '') {
            const d = parseInt(String(dimStr), 10);
            if (Number.isFinite(d) && d >= 0 && d <= 2147483647) {
                player.dimension = d;
            }
        }

        try {
            const veh = player.vehicle;
            if (veh && mp.vehicles.exists(veh)) {
                veh.position = pos;
            }
        } catch (_ve) {}

        if (typeof global.metaAcTeleport === 'function') {
            global.metaAcTeleport(player, x, y, z, {
                reason: 'admin-tpc',
                dimension: player.dimension,
                withVehicle: true
            });
        } else {
            player.position = pos;
        }

        const adminlogin = player.login;
        global.sendDiscordLog(
            `Телепорт по координатам\n\nАдминистратор - ${adminlogin}\nx=${x} y=${y} z=${z} dim=${player.dimension}`,
            '1266445805355532368'
        );
        player.outputChatBox(`Телепорт: ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)} (dim ${player.dimension}).`);
    } catch (error) {
        console.log(error);
    }
});

/** /tpm: запросить координаты пользовательской метки у клиента и телепортировать админа 8+. */
mp.events.addCommand('tpm', (player) => {
    try {
        if (!mp.players.exists(player) || Number(player.adminlvl) < 8) return;
        player.call('admin:tpm:request');
    } catch (error) {
        console.log('[TPM] request:', error);
    }
});

mp.events.add('admin:tpm:position', (player, xRaw, yRaw, zRaw) => {
    try {
        if (!mp.players.exists(player) || Number(player.adminlvl) < 8) return;
        const x = Number(xRaw);
        const y = Number(yRaw);
        const z = Number(zRaw);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            return isNotify(player, 2, 'top-mid', 'Сначала поставьте метку на карте.', 3000);
        }
        if (Math.abs(x) > 12000 || Math.abs(y) > 12000 || z < -200 || z > 4000) {
            return isNotify(player, 2, 'top-mid', 'Координаты метки вне допустимого диапазона.', 3000);
        }
        const pos = new mp.Vector3(x, y, z + 1.0);
        if (typeof global.metaAcTeleport === 'function') {
            global.metaAcTeleport(player, pos.x, pos.y, pos.z, {
                reason: 'admin-tpm',
                dimension: player.dimension,
                withVehicle: true
            });
        } else {
            const vehicle = player.vehicle;
            if (vehicle && mp.vehicles.exists(vehicle)) vehicle.position = pos;
            player.position = pos;
        }
        global.sendDiscordLog(
            `Телепорт по метке\n\nАдминистратор - ${player.login}\nx=${x.toFixed(2)} y=${y.toFixed(2)} z=${z.toFixed(2)} dim=${player.dimension}`,
            '1266445805355532368'
        );
        isNotify(player, 3, 'top-mid', 'Вы телепортировались к метке.', 3000);
    } catch (error) {
        console.log('[TPM] teleport:', error);
    }
});

mp.events.addCommand('gh', (player, static_id) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        const adminlvl = player.adminlvl;

        if (adminlvl >= 1) {

            if (!static_id) {
                return player.outputChatBox('Использование: /gh [static]');
            }

            if (targetPlayer && mp.players.exists(targetPlayer)) {
                if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'gh')) return;
                if (player === targetPlayer) return player.outputChatBox('Вы не можете телепортировать себе к самому себе.');
                if (targetPlayer.getVariable('jail') === true) return player.outputChatBox('Игрок в деморгане.');
                if (targetPlayer.getVariable('testdriveone') || targetPlayer.getVariable('testdrivetwo')) return player.outputChatBox('Игрок в режиме тестдрайва.');

                const adminlogin = player.login
                const login = targetPlayer.login

                global.sendDiscordLog(`Телепортирование игрока к себе!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}`, '1266445805355532368')

                targetPlayer.outputChatBox(`!{#ff0000} Администратор ${adminlogin} телепортировал вас к себе.`)
                isNotify(targetPlayer, 1, "bottom-mid", `Администратор ${adminlogin} телепортировал вас к себе.`, 5000);

                if (typeof global.metaAcTeleportToPlayer === 'function') {
                    global.metaAcTeleportToPlayer(targetPlayer, player, 'admin-gh');
                } else {
                    targetPlayer.position = player.position;
                    targetPlayer.dimension = player.dimension;
                }
                
                player.outputChatBox(`Вы успешно телепортировали игрока ${login} к себе.`);
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('gethereall', (player) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 10) {
            const adminlogin = player.login;

            global.sendDiscordLog(`Телепортирование всех игроков к себе!\n\nАдминистратор - ${adminlogin}`, '1266445805355532368');

            mp.players.forEach(targetPlayer => {
                if (!targetPlayer.getVariable('auth')) {
                    return
                }
                if ((Number(targetPlayer.adminlvl) || 0) >= adminlvl) {
                    return
                }
                const login = targetPlayer.login;

                if (typeof global.metaAcTeleportToPlayer === 'function') {
                    global.metaAcTeleportToPlayer(targetPlayer, player, 'admin-gethereall');
                } else {
                    targetPlayer.position = player.position;
                    targetPlayer.dimension = player.dimension;
                }

                isNotify(targetPlayer, 1, "top-mid", `Администратор ${adminlogin} телепортировал всех игроков к себе.`, 5000);
            });

            player.outputChatBox('Вы успешно телепортировали всех игроков к себе.');
            mp.players.broadcast(`!{#FF211A}Администратор ${adminlogin} телепортировал всех игроков к себе.`)
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('givemoneyall', (player, _, money) => {
    try {
        if (typeof global.canUseGiveCurrencyAdminCommands !== 'function' || !global.canUseGiveCurrencyAdminCommands(player)) {
            return player.outputChatBox('Нет доступа.');
        }

        const adminlvl = player.adminlvl;

            if (!money) {
                return player.outputChatBox('Использование: /givemoneyall [кол-во]');
            }

            const amount = parseInt(String(money).replace(/\s+/g, ''), 10);
            if (!Number.isFinite(amount) || amount <= 0) {
                return isNotify(player, 2, 'top-mid', 'Некорректное количество.', 3000);
            }

            const adminlogin = player.login;

            global.sendDiscordLog(`Выдача денег всем!\n\nАдминистратор - ${adminlogin}\nКоличество - ${global.formatnum1(amount)}$`, '1266445805355532368');

            let given = 0;
            mp.players.forEach(targetPlayer => {
                if (!mp.players.exists(targetPlayer)) return;
                if (!targetPlayer.getVariable('auth')) return;
                if (targetPlayer.static == null || targetPlayer.static === '') return;
                if ((Number(targetPlayer.adminlvl) || 0) >= adminlvl) return;

                const curmoney = Number(targetPlayer.money);
                const safeCur = Number.isFinite(curmoney) ? Math.floor(curmoney) : 0;
                const newmoney = safeCur + amount;
                if (!Number.isFinite(newmoney)) return;

                global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newmoney, targetPlayer.static], function (err) {
                    if (err) return console.log(err);
                });

                isNotify(targetPlayer, 1, 'bottom-mid', `Администратор ${player.login} выдал всем игрокам сервера ${global.formatnum1(amount)}$`, 5000);
                targetPlayer.call('sound:client', [1]);
                targetPlayer.call('updateMoney', [global.formatnum1(newmoney)]);
                targetPlayer.money = newmoney;
                given++;
            });

            player.outputChatBox(`Вы успешно выдали всем ${global.formatnum1(amount)}$ (игроков: ${given})`);
            mp.players.broadcast(`!{#0084ff}[Подарки] !{red}Администратор !{white}${player.login} !{yellow}выдал всем игрокам сервера ${global.formatnum1(amount)}$`)
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('givedpall', (player, _, dp) => {
    try {
        if (typeof global.canUseGiveCurrencyAdminCommands !== 'function' || !global.canUseGiveCurrencyAdminCommands(player)) {
            return player.outputChatBox('Нет доступа.');
        }

        const adminlvl = player.adminlvl;

            if (!dp) {
                return player.outputChatBox('Использование: /givedpall [кол-во]');
            }

            const amount = parseInt(String(dp).replace(/\s+/g, ''), 10);
            if (!Number.isFinite(amount) || amount <= 0) {
                return isNotify(player, 2, 'top-mid', 'Некорректное количество.', 3000);
            }

            const adminlogin = player.login;

            global.sendDiscordLog(`Выдача DP всем!\n\nАдминистратор - ${adminlogin}\nКоличество - ${global.formatnum1(amount)} DP`, '1266445805355532368');

            let given = 0;
            mp.players.forEach(targetPlayer => {
                if (!mp.players.exists(targetPlayer)) return;
                if (!targetPlayer.getVariable('auth')) return;
                if (targetPlayer.static == null || targetPlayer.static === '') return;
                if ((Number(targetPlayer.adminlvl) || 0) >= adminlvl) return;

                const curdp = Number(targetPlayer.dp);
                const safeCur = Number.isFinite(curdp) ? Math.floor(curdp) : 0;
                const newdp = safeCur + amount;
                if (!Number.isFinite(newdp)) return;

                global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, targetPlayer.static], function (err) {
                    if (err) return console.log(err);
                });

                isNotify(targetPlayer, 1, 'bottom-mid', `Администратор ${player.login} выдал всем игрокам сервера ${global.formatnum1(amount)} DP.`, 5000);
                targetPlayer.call('sound:client', [1]);
                targetPlayer.call('updatedp', [global.formatnum1(newdp)]);
                targetPlayer.dp = newdp;
                given++;
            });

            player.outputChatBox(`Вы успешно выдали всем ${global.formatnum1(amount)} DP. (игроков: ${given})`);
            mp.players.broadcast(`!{#0084ff}[Подарки] !{red}Администратор !{white}${player.login} !{yellow}выдал всем игрокам сервера ${global.formatnum1(amount)} DP.`)
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('freeze', (player, static_id) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 5) {
            
            if (!static_id) {
                return player.outputChatBox('Использование: /freeze [static]');
            }

            const adminlogin = player.login
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);

            if (targetPlayer && mp.players.exists(targetPlayer)) {
                if (targetPlayer.getVariable('jail') === true) {
                    return player.outputChatBox('Игрок в деморгане.');
                }

                const login =  targetPlayer.login

                if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'freeze')) return;
                global.sendDiscordLog(`Заморозка Игрока!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}`, '1266445805355532368')

                targetPlayer.call('freezePlayer');
                targetPlayer.setVariable('nof3', true);

                player.outputChatBox(`Вы успешно заморозили игрока ${login}.`);
                targetPlayer.outputChatBox(`!{#ff0000} Администратор ${adminlogin} заморозил вас!`);
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('unfreeze', (player, static_id) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 5) {

            if (!static_id) {
                return player.outputChatBox('Использование: /unfreeze [static]');
            }

            const adminlogin = player.login
            const targetPlayer = global.findOnlinePlayerByStatic(static_id);

            if (targetPlayer && mp.players.exists(targetPlayer)) {
                if (targetPlayer.getVariable('jail') === true) {
                    return player.outputChatBox('Игрок в деморгане.');
                }

                const login =  targetPlayer.login

                if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'unfreeze')) return;
                global.sendDiscordLog(`Разморозка Игрока!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}`, '1266445805355532368')

                targetPlayer.call('unfreezePlayer');
                targetPlayer.setVariable('nof3', false);

                player.outputChatBox(`Вы успешно разморозили игрока ${login}.`);
                targetPlayer.outputChatBox(`!{#ff0000} Администратор ${adminlogin} разморозил вас!`);
            } else {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.');
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('makeadmin', (player, fullText, static_id, newAdminLevel) => {
    try {
        if (!global.requireAdminLvl(player, 7, 'makeadmin')) return;

        if (!static_id || newAdminLevel === undefined || newAdminLevel === '') {
            return player.outputChatBox('Использование: /makeadmin [static] [lvl]');
        }

        const newLvl = parseInt(String(newAdminLevel), 10);
        if (isNaN(newLvl) || newLvl < 0 || newLvl > 10) {
            return player.outputChatBox('Некорректный уровень админки.');
        }

        const targetStatic = typeof global.parseStaticArg === 'function'
            ? global.parseStaticArg(static_id)
            : parseInt(String(static_id), 10);
        if (!Number.isFinite(targetStatic) || targetStatic <= 0) {
            return player.outputChatBox('Некорректный статик.');
        }

        const adminlogin = player.login;
        const adminstatic = Number(player.static) || 0;

        if (targetStatic === adminstatic) {
            return player.outputChatBox('Вы не можете изменить админ уровень самому себе.');
        }

        if (targetStatic === 1 && adminstatic !== 1) {
            global.sendDiscordLog(
                `Попытка изменить уровень админки администратору в WhiteList (#${targetStatic})!\n\nПопытался изменить - ${adminlogin}\nУровень который попытался выдать - ${newLvl}`,
                '1249699732197212160'
            );
            player.outputChatBox('Вы не можете изменять уровень админки этого игрока.');
            return;
        }
        if (targetStatic === 2 && adminstatic !== 1 && adminstatic !== 2) {
            global.sendDiscordLog(
                `Попытка изменить уровень админки администратору в WhiteList (#${targetStatic})!\n\nПопытался изменить - ${adminlogin}\nУровень который попытался выдать - ${newLvl}`,
                '1249699732197212160'
            );
            player.outputChatBox('Вы не можете изменять уровень админки этого игрока.');
            return;
        }

        if (typeof global.canGrantAdminLevel === 'function' && !global.canGrantAdminLevel(player, newLvl)) {
            return;
        }

        const targetPlayer = global.findOnlinePlayerByStatic(targetStatic);

        global.DB.query('SELECT adminlvl FROM accounts WHERE static = ? LIMIT 1', [targetStatic], (err, rows) => {
            if (err) return console.log(err);
            if (!rows || rows.length === 0) {
                return player.outputChatBox(`Игрок со статиком #${targetStatic} не найден в базе.`);
            }

            const targetCurLvl = Number(rows[0].adminlvl) || 0;
            if (!global.canAdminActOnLevel(player, targetCurLvl, 'makeadmin', targetStatic)) {
                global.sendDiscordLog(
                    `Попытка изменить админку администратору с равным/большим уровнем!\n\nПопытался - ${adminlogin}\nЦель - #${targetStatic}\nТекущий лвл цели - ${targetCurLvl}\nХотел выдать - ${newLvl}`,
                    '1249699732197212160'
                );
                return player.outputChatBox(`Вы не можете изменять уровень админки игрока со статиком #${targetStatic}: у него ${targetCurLvl} уровень (ваш ${Number(player.adminlvl) || 0}).`);
            }

            global.DB.query('UPDATE accounts SET adminlvl = ? WHERE static = ?', [newLvl, targetStatic], (err2) => {
                if (err2) return console.log(err2);
                if (targetPlayer && mp.players.exists(targetPlayer)) {
                    targetPlayer.adminlvl = newLvl;
                    if (global.adminSessionIsGated && global.adminSessionIsGated(targetPlayer)) {
                        targetPlayer._adminSession = false;
                        targetPlayer._adminPassPrompt = null;
                    }
                    if (typeof global.syncAdminSessionClient === 'function') global.syncAdminSessionClient(targetPlayer);
                    else targetPlayer.setVariable('adminlvl', newLvl);
                    targetPlayer.outputChatBox(`Ваш уровень админки изменён на ${newLvl}.`);
                }
                player.outputChatBox(`Вы изменили уровень администратора игрока со статиком #${targetStatic} на ${newLvl}.`);
                global.sendDiscordLog(
                    `Выдача Админки!\n\nВыдал админку - ${adminlogin}\nНазначен - #${targetStatic}\nВыданный лвл админки - ${newLvl}`,
                    '1266445805355532368'
                );
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('giveweapon', (player, _, static_id, weaponName) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        const adminlvl = player.adminlvl;

        if (adminlvl >= 10) {

            if (!static_id || !weaponName) {
                return player.outputChatBox('Использование: /giveweapon [static] [weapon]');
            }

            if (!targetPlayer) {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.')
                return
            }

            admlogin = player.login
            login = targetPlayer.login

            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'giveweapon')) return;

            global.sendDiscordLog(`Выдача оружия!\n\nАдминистратор - ${admlogin}\nИгрок - ${login}\nОружие - ${weaponName}`, '1266445805355532368')
            
            targetPlayer.inventory.push(weaponName);
            global.saveInventory(targetPlayer);
            targetPlayer.call('updateInventory', [JSON.stringify(targetPlayer.inventory), JSON.stringify(targetPlayer.fastSlots)]);
            
            player.outputChatBox(`Оружие ${global.formweap(weaponName)} выдано игроку ${login}.`);
            targetPlayer.outputChatBox(`Администратор ${admlogin} выдал вам оружие ${global.formweap(weaponName)}.`)
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('takeweapon', (player, _, static_id, weaponName) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        const adminlvl = player.adminlvl;

        if (adminlvl >= 10) {

            if (!static_id || !weaponName) {
                return player.outputChatBox('Использование: /takeweapon [static] [weapon]');
            }

            if (!targetPlayer) {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.')
                return
            }

            admlogin = player.login
            login = targetPlayer.login

            const weaponIndex = targetPlayer.inventory.indexOf(weaponName);
            if (weaponIndex === -1) {
                return player.outputChatBox(`У игрока ${login} нет оружия ${weaponName}.`);
            }

            targetPlayer.inventory.splice(weaponIndex, 1);
            global.saveInventory(targetPlayer);
            targetPlayer.call('updateInventory', [JSON.stringify(targetPlayer.inventory), JSON.stringify(targetPlayer.fastSlots)]);
            
            player.outputChatBox(`Оружие ${weaponName} забрано у игрока ${login}.`);
            targetPlayer.outputChatBox(`Администратор ${admlogin} забрал у вас оружие ${weaponName}.`);

            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'takeweapon')) return;

            global.sendDiscordLog(`Изъятие оружия!\n\nАдминистратор - ${admlogin}\nИгрок - ${login}\nОружие - ${weaponName}`, '1266445805355532368');
        }
    } catch (error) {
        return;
    }
});

mp.events.addCommand('givemoney', (player, _, static_id, money) => require('./legacy/panel-money').run(player,static_id,money,false));

mp.events.addCommand('takemoney', (player, _, static_id, money) => require('./legacy/panel-money').run(player,static_id,money,true));

mp.events.addCommand('givedp', (player, _, static_id, dp) => {
    try {
        if (typeof global.canUseGiveCurrencyAdminCommands !== 'function' || !global.canUseGiveCurrencyAdminCommands(player)) {
            return player.outputChatBox('Нет доступа.');
        }

            if (!static_id || !dp) {
                return player.outputChatBox('Использование: /givedp [static] [кол-во]');
            }

            dp = parseInt(String(dp)
                .replace(/\s+/g, '')
                .replace(/–/g, '-')    // en dash to minus
                .replace(/-\s+/g, '-'), // allow space after minus
            10);
            if (isNaN(dp) || dp <= 0) {
                return isNotify(player, 2, "top-mid", "Некорректное количество.", 3000);
            }

            admlogin = player.login

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {

                if (!results.length) {
                    player.outputChatBox('Игрок не найден.')
                    return;
                }
                
            if (typeof global.canAdminActOnLevel === 'function' && !global.canAdminActOnLevel(player, Number(results[0].adminlvl) || 0, 'givedp', static_id)) return;

                global.sendDiscordLog(`Выдача DP!\n\nАдминистратор - ${admlogin}\nИгрок - ${results[0].login}\nКоличество - ${global.formatnum1(dp)} DP`, '1466115358716072179')

                const targetPlayer = global.findOnlinePlayerByStatic(static_id);

                let curdp = parseInt(results[0].dp);
                let newdp = parseInt(curdp) + parseInt(dp);

                global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, static_id], function (err, results) {
                    if (err) return console.log(err);
                });

                if (targetPlayer && mp.players.exists(targetPlayer)) {
                    login = targetPlayer.login
                    targetPlayer.outputChatBox(`Администратор ${admlogin} выдал вам ${global.formatnum1(dp)} DP.`)
                    targetPlayer.dp = newdp;
                    targetPlayer.call('updatedp', [global.formatnum1(newdp)]);
                }

                player.outputChatBox(`${global.formatnum1(dp)} DP выдано игроку ${results[0].login}.`);
            });
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('takedp', (player, _, static_id, dp) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 10) {

            if (!static_id || !dp) {
                return player.outputChatBox('Использование: /takedp [static] [кол-во]');
            }

            dp = parseInt(String(dp)
                .replace(/\s+/g, '')
                .replace(/–/g, '-')    // en dash to minus
                .replace(/-\s+/g, '-'), // allow space after minus
            10);
            if (isNaN(dp) || dp <= 0) {
                return isNotify(player, 2, "top-mid", "Некорректное количество.", 3000);
            }

            admlogin = player.login

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {

                if (!results.length) {
                    player.outputChatBox('Игрок не найден.')
                    return;
                }

                const targetPlayer = global.findOnlinePlayerByStatic(static_id);
                
                let curdp = parseInt(results[0].dp);
                let newdp = parseInt(curdp) - parseInt(dp);

                if (curdp < dp) {
                    player.outputChatBox(`У игрока DP меньше чем вы пытаетесь у него забрать.`)
                    return
                }

                if (typeof global.canAdminActOnLevel === 'function' && !global.canAdminActOnLevel(player, Number(results[0].adminlvl) || 0, 'takedp', static_id)) return;

                global.sendDiscordLog(`Изъятие DP!\n\nАдминистратор - ${admlogin}\nИгрок - ${results[0].login}\nКоличество - ${dp}`, '1466115358716072179')

                global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, static_id], function (err, results) {
                    if (err) return console.log(err);
                });

                if (targetPlayer && mp.players.exists(targetPlayer)) {
                    login = targetPlayer.login
                    targetPlayer.outputChatBox(`Администратор ${admlogin} забрал у вас ${global.formatnum1(dp)} DP.`)
                    targetPlayer.dp = newdp;
                    targetPlayer.call('updatedp', [global.formatnum1(newdp)]);
                }

                player.outputChatBox(`${global.formatnum1(dp)} DP снято игроку ${results[0].login}.`);
            });
        }
    } catch (error) {
        console.log(error);
    }
});
mp.events.addCommand('givecar', (player, _, static_id, carName) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 10) {
            if (!static_id || !carName) {
                return player.outputChatBox('Использование: /givecar [static] [name]');
            }

            admlogin = player.login;

            const carNames = [
                { "deluxo": "Deluxo" },
                { "oppressor": "Oppressor Mk1" },
                { "avtr": "Aztr" },
                { "vclass": "Sclass" },
                { "asvjneon": "AsvjNeon" },
                { "terzo": "Pegassi Zero (Neon)" },
                { "cullinan": "Folls Foyce Cainan" },
                { "gemera": "Genera" },
                { "g63": "Mercedes G63 " },
                { "banana": "Banana" },
                { "scarab3": "Scarab" },
                { "bmwm5f90": "BMW F5 F90" },
                { "bentayga": "Bentadsga" },
                { "insurgent2": "Insurgent" },
                { "shotaro": "Shotaro" },
                { "wastelander": "Wastelander" },
                { "frogger2": "FIB Helicopter" },
                { "frogger": "Frogger" },
                { "havok": "Havok" },
                { "elicottero": "Elicottero Neon" },
                { "bbolide": "Bolide" },
                { "buzzard2": "Buzzard" },
                { "monster": "Monster Track" },
                { "zr3802": "Future Shock (ZR380)" },
                { "revolter": "Revolter" },
                { "r35": "Nissan GT-R" },
                { "taycan": "Porsche Taycan" },
                { "toros": "Toros" },
                { "huracan": "Lamborghini Huracan" },
                { "panamera18": "Panamera Turbo S" },
                { "811": "Pfister 811" },
                { "gt63s": "Mercedes GT63S" },
                { "gp1": "GP-1" },
                { "oppressor2": "Oppressor Mk2" },
                { "2021ladaraven": "Lada Raven" },
                { "valkyriespider": "Aston Martin Valkyrie Spider" },
                { "divo": "Bugatti Divo" },
                { "exp100": "Lotus EXP 100" }
            ];

            const car = carNames.find(c => Object.keys(c)[0] === carName);
            if (!car) {
                return player.outputChatBox('Такого транспорта не существует.');
            }

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                if (!results.length) {
                    player.outputChatBox('Игрок не найден.');
                    return;
                }

                if (typeof global.canAdminActOnLevel === 'function' && !global.canAdminActOnLevel(player, Number(results[0].adminlvl) || 0, 'givecar', static_id)) return;

                const targetPlayer = global.findOnlinePlayerByStatic(static_id);

                let cars = results[0].cars;
                let carArray = global.normalizeCarsArray(JSON.parse(cars || '[]'));

                carArray.push({ m: carName, s: 'admin' });
                let updatedCars = global.serializeCarsForDb(carArray);

                global.DB.query('UPDATE accounts SET cars = ? WHERE static = ?', [updatedCars, static_id], function (err, results) {
                    if (err) return console.log(err);
                });

                global.sendDiscordLog(`Выдача транспорта!\n\nАдминистратор - ${admlogin}\nИгрок - ${results[0].login}\nТранспорт - ${car[carName]}`, '1266445805355532368');

                if (targetPlayer && mp.players.exists(targetPlayer)) {
                    targetPlayer.outputChatBox(`Администратор ${admlogin} выдал вам транспорт - ${car[carName]}.`);
                    targetPlayer.call('carsLoad:CLIENT', [global.carsPayloadForClient(updatedCars)]);
                }

                player.outputChatBox(`Транспорт ${car[carName]} выдан игроку ${results[0].login}.`);
            });
        }
    } catch (error) {
        return;
    }
});

mp.events.addCommand('takecar', (player, _, static_id, carName) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 10) {
            if (!static_id || !carName) {
                return player.outputChatBox('Использование: /takecar [static] [name]');
            }

            admlogin = player.login;

            const carNames = [
                { "deluxo": "Deluxo" },
                { "oppressor": "Oppressor Mk1" },
                { "avtr": "Avtr" },
                { "vclass": "Vclass" },
                { "asvjneon": "AsvjNeon" },
                { "terzo": "Pegassi Zero (Neon)" },
                { "cullinan": "Rolls Royce Cullinan" },
                { "gemera": "Gemera" },
                { "g63": "Mercedes G63 " },
                { "banana": "Banana" },
                { "scarab3": "Scarab" },
                { "bmwm5f90": "BMW F5 F90" },
                { "bentayga": "Bentayga" },
                { "insurgent2": "Insurgent" },
                { "shotaro": "Shotaro" },
                { "wastelander": "Wastelander" },
                { "frogger2": "FIB Helicopter" },
                { "frogger": "Frogger" },
                { "havok": "Havok" },
                { "elicottero": "Elicottero Neon" },
                { "bbolide": "Bolide" },
                { "buzzard2": "Buzzard" },
                { "monster": "Monster Track" },
                { "zr3802": "Future Shock (ZR380)" },
                { "revolter": "Revolter" },
                { "r35": "Nissan GT-R" },
                { "taycan": "Porsche Taycan" },
                { "toros": "Toros" },
                { "huracan": "Lamborghini Huracan" },
                { "panamera18": "Panamera Turbo S" },
                { "811": "Pfister 811" },
                { "gt63s": "Mercedes GT63S" },
                { "gp1": "GP-1" },
                { "oppressor2": "Oppressor Mk2" },
                { "2021ladaraven": "Lada Raven" },
                { "valkyriespider": "Aston Martin Valkyrie Spider" },
                { "divo": "Bugatti Divo" },
                { "exp100": "Lotus EXP 100" }
            ];

            const car = carNames.find(c => Object.keys(c)[0] === carName);
            if (!car) {
                return player.outputChatBox('Такого транспорта не существует.');
            }

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {
                if (!results.length) {
                    player.outputChatBox('Игрок не найден.');
                    return;
                }

                if (typeof global.canAdminActOnLevel === 'function' && !global.canAdminActOnLevel(player, Number(results[0].adminlvl) || 0, 'takecar', static_id)) return;

                global.sendDiscordLog(`Изъятие транспорта!\n\nАдминистратор - ${admlogin}\nИгрок - ${results[0].login}\nТранспорт - ${car[carName]}`, '1266445805355532368');

                const targetPlayer = global.findOnlinePlayerByStatic(static_id);

                let cars = results[0].cars;
                let carArray = global.normalizeCarsArray(JSON.parse(cars || '[]'));

                const index = carArray.findIndex((e) => e.m === carName);
                if (index > -1) {
                    carArray.splice(index, 1);
                    let updatedCars = global.serializeCarsForDb(carArray);

                    global.DB.query('UPDATE accounts SET cars = ? WHERE static = ?', [updatedCars, static_id], function (err, results) {
                        if (err) return console.log(err);
                    });

                    if (targetPlayer && mp.players.exists(targetPlayer)) {
                        targetPlayer.outputChatBox(`Администратор ${admlogin} забрал у вас транспорт - ${car[carName]}.`);
                        targetPlayer.call('carsLoad:CLIENT', [global.carsPayloadForClient(updatedCars)]);
                    }

                    player.outputChatBox(`Транспорт ${car[carName]} забран у игрока ${results[0].login}.`);
                } else {
                    player.outputChatBox('У игрока нет этого транспорта.');
                }
            });
        }
    } catch (error) {
        return;
    }
});

mp.events.addCommand('takevip', (player, _, static_id) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 10) {

            if (!static_id) {
                return player.outputChatBox('Использование: /takevip [static]');
            }

            admlogin = player.login;

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], function (err, results) {

                if (err || !results.length) {
                    player.outputChatBox('Игрок не найден.');
                    return;
                }

                if (typeof global.canAdminActOnLevel === 'function' && !global.canAdminActOnLevel(player, Number(results[0].adminlvl) || 0, 'takevip', static_id)) return;

                const currentVipLevel = results[0].viplvl;
                const vipExpireDate = results[0].vipdate;

                if (currentVipLevel === 0) {
                    player.outputChatBox('У игрока нет VIP-статуса.');
                    return;
                }

                const now = new Date();
                const vipEndDate = new Date(vipExpireDate);

                if (vipEndDate < now) {
                    player.outputChatBox('У игрока истек срок VIP-статуса.');
                    return;
                }

                const timeDiff = vipExpireDate - now;
                const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

                global.sendDiscordLog(`Снятие VIP!\n\nАдминистратор - ${admlogin}\nИгрок - ${results[0].login}\nVIP Лвл - ${currentVipLevel}\nОставалось дней - ${daysLeft}`, '1266445805355532368');

                global.DB.query('UPDATE accounts SET viplvl = ?, vipdate = ? WHERE static = ?', [0, null, static_id], function (err) {
                    if (err) return console.log(err);

                    const targetPlayer = global.findOnlinePlayerByStatic(static_id);
                    if (targetPlayer && mp.players.exists(targetPlayer)) {
                        targetPlayer.viplvl = 0;
                        targetPlayer.setVariable('viplvl', 0);
                        targetPlayer.call('updateviplvl', [0]);
                        targetPlayer.call('updatevipdate', ['0д.']);
                        isNotify(targetPlayer, 2, "bottom-mid", `Ваш VIP-статус был снят администратором ${admlogin}.`, 5000);
                    }

                    player.outputChatBox(`VIP-статус снят с игрока ${results[0].login}.`);
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('delvip', (player) => {
    try {
        const currentVipLevel = player.viplvl;
        const vipExpireDate = player.vipdate;

        if (currentVipLevel === 0) {
            return isNotify(player, 2, "top-mid", `У вас нет VIP-статуса, чтобы его удалить.`, 3000);
        }

        const now = new Date();
        const vipEndDate = new Date(vipExpireDate);
        const timeDiff = vipEndDate - now;
        const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        global.sendDiscordLog(`Удаление VIP!\n\nИгрок - ${player.login}\nVIP Лвл - ${currentVipLevel}\nОставалось дней - ${daysLeft}`, '1330425055926161418');

        global.DB.query('UPDATE accounts SET viplvl = ?, vipdate = ? WHERE static = ?', [0, null, player.static], function (err) {
            if (err) return console.log(err);

            player.viplvl = 0;
            player.setVariable('viplvl', 0);
            player.call('updateviplvl', [0]);
            player.call('updatevipdate', ['0д.']);

            isNotify(player, 3, "top-mid", `Ваш VIP-статус был удален.`, 5000);
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('discord', (player) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 5) {
            mp.players.broadcast(`!{#74BE79}Не забудьте вступить на дискорд сервер проекта discord.gg/flowdm`)
            mp.players.broadcast(`!{#74BE79}Спойлеры, обновления, новости только там!`)
        }
    } catch (error) {
        console.log(error);
    }
});

setInterval(() => {
    try {
        mp.players.broadcast(`!{#74BE79}Не забудьте вступить на дискорд сервер проекта discord.gg/flowdm`);
        mp.players.broadcast(`!{#74BE79}Спойлеры, обновления, новости только там!`);
    } catch (error) {
        console.log(error);
    }
}, 30 * 60 * 1000);

let mpname
let mpmembers = 0
let statusEvent = false 
let statusTeleportEvent = false 
let mpstatus = false
let teleport = false
let eventCords
let adminDimenshion
let eventKD

mp.events.addCommand('startmp', (player, name) => {
    try {
        const adminlvl = player.adminlvl;

        if(adminlvl >= 4) {

            if (!name) {
                return player.outputChatBox('Использование: /startmp [название]');
            }

            if(statusEvent === true) {
                player.outputChatBox('Мероприятие уже запущено.')
                return;
            } 

            global.sendDiscordLog(`Запуск мероприятия!\n\nАдминистратор - ${player.login}\nМероприятие - ${name}`, '1266445805355532368')

            mpname = name
            eventCords = new mp.Vector3(player.position.x, player.position.y, player.position.z) 
            statusEvent = true
            statusTeleportEvent = true 
            eventKD = true
            mpstatus = true
            teleport = true
            adminDimenshion = player.dimension

            mp.players.broadcast(`!{#0066ff}Администратор !{#ff0000}${player.login} !{#0066ff}запустил мероприятие - !{#00ff00}${name}!{#0066ff}.\n\n\n!{#0066ff}Для телепортации пропишите /mp`)
            mp.players.forEach(p => { isNotify(p, 1, "top-mid", `Мероприятие! Посмотрите в чат.`, 5000); });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('stopmp', (player) => {
    try {
        const adminlvl = player.adminlvl;

        if(adminlvl >= 3) {
            if(mpstatus === false) {
                player.outputChatBox('Мероприятие не запущено.')
                return;
            } else { 
                global.sendDiscordLog(`Закрытие телепорта на мероприятие!\n\nАдминистратор - ${player.login}\nМероприятие - ${mpname}`, '1266445805355532368');

                mp.players.broadcast(`!{#0066ff}Администратор !{#ff0000}${player.login} !{#0066ff}закрыл телепорт на мероприятие - !{#05fc47}${mpname}!{#0066ff}.`)
                mp.players.broadcast(`!{red} В мероприятии участвует: ${mpmembers} человек(а).`);

                mpname = null
                statusEvent = false 
                eventCords = null
                adminDimenshion = null
                mpstatus = false
                teleport = false
                mpmembers = 0
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('mp', (player) => {
    try {
        if (!player.getVariable('auth')) return;
        if(mpstatus === false) {
            return
        } else {
            player.removeAllWeapons();
            player.setVariable('activeWeaponSlot', null);
            if (player.getVariable('ammo') == true) player.call('hideAmmo');
            isNotify(player, 3, "bottom-mid", `Вы телепортировались на мероприятие, следуйте указаниям администрации.`, 5000);
            if (typeof global.metaAcMarkTeleport === 'function') {
                try { global.metaAcMarkTeleport(player, 'admin-mp', 8000); } catch (_mt) {}
            }
            player.spawn(eventCords)
            player.dimension = adminDimenshion
            player.setVariable('mp', true);
            mpmembers++;
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('drop', (player) => {
    try {
        adminlvl = player.adminlvl;

        if (adminlvl >= 5) {
            if (global.dropActive) {
                player.outputChatBox('Дроп уже запущен.');
                return;
            }

            admlogin = player.login;

            global.sendDiscordLog(`Запуск дропа!\n\nАдминистратор - ${admlogin}`, '1266445805355532368');
            global.startDrop(false);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerEnterVehicle', (player, vehicle, seat) => {
    try {
        if (vehicle && mp.vehicles.exists(vehicle) && mp.players.exists(player) && !vehicle.getVariable('deleted')) {
            player.removeAllWeapons();
            player.setVariable('activeWeaponSlot', null);
            if (player.getVariable('ammo') == true) player.call('hideAmmo');
            if (seat === 0) {
                let doorState = vehicle.getVariable('doorState') || false;
                player.call('setdoor', [doorState]);
                let engineState = vehicle.getVariable('engineState') === true;
                vehicle.setVariable('engineState', engineState);
                let static = player.static
                if (vehicle && mp.vehicles.exists(vehicle)) {
                    vehicle.engine = engineState;
                    vehicle.setVariable('driver', `#${static}`);
                }
            }
            if (player.static != null) {
                vehicle.setVariable('lastStatic', `#${player.static}`);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerExitVehicle', (player, vehicle) => {
    try {
        if (vehicle && mp.vehicles.exists(vehicle) && mp.players.exists(player) && !vehicle.getVariable('deleted')) {
            global.seatbeltStatus = false;
            if (typeof global.metaAcGiveWeapon === 'function') {
                global.metaAcGiveWeapon(player, mp.joaat('gadget_parachute'), 1000, true, 'parachute');
            } else {
                player.giveWeapon(mp.joaat('gadget_parachute'), 1000);
            }

            if (vehicle.getVariable('driver') != null) {
                vehicle.setVariable('driver', null)
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerDeath', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth') || player.getVariable('testdriveone') || player.getVariable('testdrivetwo')) return;

        global.deleteVehTwo(player.carActive);
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('setskin', (player, _, static_id, name) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        adminlvl = player.adminlvl

        if (adminlvl >= 10) {
            if (!static_id || !name) {
                player.outputChatBox('Использование: /setskin [static] [name]');
                return;
            }

            if (!targetPlayer) {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.')
                return
            }

            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'setskin')) return;

            const nameTrim = String(name).trim();
            let skinHash = mp.joaat(nameTrim);

            if (skinHash === 0) {
                player.outputChatBox('Указанный скин не найден.');
                return;
            }

            admlogin = player.login
            login = targetPlayer.login

            global.sendDiscordLog(`Установка скина!\n\nАдминистратор - ${admlogin}\nИгрок - ${login}\nСкин - ${nameTrim}`, '1266445805355532368')

            const MP_M = mp.joaat('mp_m_freemode_01');
            const MP_F = mp.joaat('mp_f_freemode_01');
            const isFm = skinHash === MP_M || skinHash === MP_F;
            const wasFm =
                typeof global.isFreemodePedHash === 'function' && global.isFreemodePedHash(targetPlayer.model);

            const finishSkinChange = () => {
                targetPlayer.model = skinHash;

                if (!isFm) {
                    try {
                        targetPlayer._headwearEquipIc1 = null;
                    } catch (_hw) {}
                }

                /** Смена педа: кости/скелет другие — пересобрать оружие на теле. */
                if (typeof global.syncWeaponBodyPlayer === 'function') {
                    const tp = targetPlayer;
                    const resync = () => {
                        if (mp.players.exists(tp) && tp.getVariable('auth')) {
                            try {
                                global.syncWeaponBodyPlayer(tp);
                            } catch (_e) {}
                        }
                    };
                    resync();
                    setTimeout(resync, 120);
                    setTimeout(resync, 350);
                    setTimeout(resync, 700);
                }

                if (isFm && typeof global.hydratePlayerClothesFromDb === 'function') {
                    const tp = targetPlayer;
                    const reapplyClothes = () => {
                        if (!mp.players.exists(tp) || !tp.getVariable('auth')) return;
                        global.hydratePlayerClothesFromDb(tp, { restoreShopSnapshot: true });
                    };
                    reapplyClothes();
                    setTimeout(reapplyClothes, 200);
                    setTimeout(reapplyClothes, 550);
                    setTimeout(reapplyClothes, 1100);
                }
            };

            if (wasFm && typeof global.persistPlayerClothesRow === 'function') {
                global.persistPlayerClothesRow(targetPlayer, () => finishSkinChange());
            } else {
                finishSkinChange();
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('setcloth', (player, _, id, component, drawable, texture, pallete) => {
    try {
        if(player.adminlvl >= 10) {
            if (id == undefined || component == undefined || drawable == undefined) 
                return player.outputChatBox('/setcloth [static] [component] [drawable] [texture? [pallete?]]');
            
            const target = global.findOnlinePlayerByStatic(id, { fallbackSessionId: true });
            if (!target) return player.notify('~r~Игрок не найден (укажите static)!');
            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, target, 'setcloth')) return;

            const row=[Number(component),Number(drawable),Number(texture||0),Number(pallete||0)];
            const gender=target.model===mp.joaat('mp_f_freemode_01')?1:0;
            require('./legacy/clothing-validation').current().request(target,'components',require('../../client_packages/clothing/profiles').normalize(gender,[row])).then(ok=>{if(ok&&mp.players.exists(player))player.notify(`~g~Одежда сохранена игроку [#${target.static}]`);});
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('excar', (player, fullText, vehicleId) => {
    try {
        adminlvl = player.adminlvl

        if (adminlvl >= 4) {
            if (!vehicleId) {
                player.outputChatBox('Использование: /excar [id]');
                return;
            }

            let vehicle = mp.vehicles.at(parseInt(vehicleId));

            if (!vehicle) {
                player.outputChatBox('Транспортное средство с указанным ID не найдено.');
                return;
            }

            admlogin = player.login

            global.sendDiscordLog(`Взрыв машины!\n\nАдминистратор - ${admlogin}\nМашина - ${vehicleId}`, '1266445805355532368')
            
            vehicle.explode();
            player.outputChatBox(`Транспортное средство с ID ${vehicleId} взорвано.`)

        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('kill', (player, _, static_id) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        adminlvl = player.adminlvl

        if (adminlvl >= 4) {
            if (!static_id) {
                player.outputChatBox('Использование: /kill [static]');
                return;
            }

            if (!targetPlayer) {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.')
                return
            }

            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'kill')) return;

            if (targetPlayer.getVariable('dead')) {
                player.outputChatBox(`Игрок ${login} уже мёртв.`)
                return;
            }

            admlogin = player.login
            login = targetPlayer.login


            global.sendDiscordLog(`Убийство игрока!\n\nАдминистратор - ${admlogin}\nИгрок - ${login}`, '1266445805355532368')
            
            targetPlayer.health = 0;
            targetPlayer.armour = 0;

            if(targetPlayer.getVariable('mp')===true){
                targetPlayer.dimension=0;
            }
            targetPlayer.setVariable('mp', false);
            targetPlayer.setVariable('mpp', false);

            player.outputChatBox(`Вы убили игрока ${login}.`)
            targetPlayer.outputChatBox(`!{#ff0000}Администратор ${admlogin} убил вас.`)
        }
    } catch (error) {
        console.log(error);
    }
});

const spawnslist = {
    1: new mp.Vector3(172.58367919921875, -1726.4952392578125, 29.29168701171875),
    2: new mp.Vector3(-10.661846160888672, -1419.117919921875, 29.32600212097168),
    3: new mp.Vector3(924.6547241210938, -1559.1331787109375, 30.755172729492188),
    4: new mp.Vector3(840.6149291992188, -2335.831298828125, 30.334321975708008),
    5: new mp.Vector3(1379.235107421875, -2079.55322265625, 51.998565673828125),
    6: new mp.Vector3(442.406982421875, -982.6343994140625, 30.689603805541992)
};

mp.events.addCommand('respawn', (player, _, static_id) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        adminlvl = player.adminlvl

        if (adminlvl >= 2) {
            if (!static_id) {
                player.outputChatBox('Использование: /respawn [static]');
                return;
            }

            if (!targetPlayer) {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.')
                return
            }

            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'respawn')) return;

            if (!targetPlayer.getVariable('gangwar')) return player.outputChatBox('Игрок не в гангваре.');
            if (targetPlayer.getVariable('dead')) return player.outputChatBox(`Игрок мёртв.`);
            
            admlogin = player.login
            login = targetPlayer.login

            global.sendDiscordLog(`Респавн игрока!\n\nАдминистратор - ${admlogin}\nИгрок - ${login}`, '1266445805355532368')
            
            player.removeAllWeapons();
            player.setVariable('activeWeaponSlot', null);
            if (player.getVariable('ammo') == true) player.call('hideAmmo');

            player.outputChatBox(`Вы зареспавнили игрока ${login}.`)
            targetPlayer.outputChatBox(`!{lime}Администратор ${admlogin} зареспавнил вас.`)
            
            const spawns = global.spawnslist && global.spawnslist[targetPlayer.getVariable('fraction')];
            if (!spawns || !spawns.pos) return player.outputChatBox('Точка респавна фракции не найдена.');
            targetPlayer.spawn(spawns.pos);
            targetPlayer.heading = spawns.heading;
            if(targetPlayer.getVariable('mp')===true){
                targetPlayer.dimension=0;
            }
            targetPlayer.setVariable('mp', false);
            targetPlayer.setVariable('mpp', false);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('heal', (player, _, static_id) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(static_id);
        adminlvl = player.adminlvl

        if (adminlvl >= 2) {
            if (!static_id) {
                player.outputChatBox('Использование: /heal [static]');
                return;
            }

            if (!targetPlayer) {
                player.outputChatBox('Игрок с таким статиком не найден на сервере.')
                return
            }

            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'heal')) return;

            if (targetPlayer.getVariable('dead') === false) {
                player.outputChatBox(`Игрок не мёртв.`)
                return;
            }

            admlogin = player.login
            login = targetPlayer.login

            global.sendDiscordLog(`Воскрешение игрока!\n\nАдминистратор - ${admlogin}\nИгрок - ${login}`, '1266445805355532368')
            
            player.outputChatBox(`Вы возродили игрока ${login}.`);
            targetPlayer.outputChatBox(`!{lime}Администратор ${admlogin} возродил вас.`);

            if (typeof global.clearConsumableResists === 'function') {
                global.clearConsumableResists(targetPlayer);
            }
            targetPlayer.call('reviveCancel');
            targetPlayer.health = 100;
            targetPlayer.armour = 0;
            const reviveDim = Number(targetPlayer.dimension);
            const revivePos = targetPlayer.position
                ? new mp.Vector3(targetPlayer.position.x, targetPlayer.position.y, targetPlayer.position.z)
                : targetPlayer.position;
            targetPlayer.spawn(revivePos);
            if (Number.isFinite(reviveDim)) {
                targetPlayer.dimension = reviveDim;
                setTimeout(function () {
                    try {
                        if (mp.players.exists(targetPlayer)) targetPlayer.dimension = reviveDim;
                    } catch (_e) {}
                }, 50);
            }
            targetPlayer.setVariable('dead', false);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('admins', (player) => {
    try {
        let adminlvl = player.adminlvl;

        if (adminlvl >= 1) {
            let adminsList = [];

            mp.players.forEach(p => {
                if (p.adminlvl >= 1) {
                    adminsList.push({ login: p.login, adminlvl: p.adminlvl, static: p.static });
                }
            });

            if (adminsList.length > 0) {
                adminsList.sort((a, b) => b.adminlvl - a.adminlvl);
                let adminsMessage = adminsList.map(admin => `${admin.login} [#${admin.static}] - ${admin.adminlvl} LVL`).join(', ');
                player.outputChatBox(`${adminsMessage}`);
            } else {
                player.outputChatBox(`Нет администраторов онлайн.`);
            }
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('obnyl', (player, fullText, staticValue) => {
    try {
        const targetPlayer = global.findOnlinePlayerByStatic(staticValue);
        const adminlvl = player.adminlvl;
        const adminlogin = player.login;

        if (adminlvl >= 10) {
            if (!staticValue) {
                player.outputChatBox('Использование: /obnyl [static]');
                return;
            }

            if (staticValue == 1) {
                global.sendDiscordLog(`Попытка обнулить администратора в WhiteList (#${static_id})!\n\nПопытался обнулить - ${adminlogin}`, '1249699732197212160')
                player.outputChatBox(`Вы не можете обнулить этого игрока.`)
                return;
            }
            
            global.DB.query('SELECT * FROM accounts WHERE static = ?', [staticValue], (err, rows) => {
                if (err) return console.log(err);

                if (rows.length === 0) {
                    player.outputChatBox(`Аккаунт со статиком ${staticValue} не найден.`);
                    return;
                }

                if (typeof global.canAdminActOnLevel === 'function' && !global.canAdminActOnLevel(player, Number(rows[0].adminlvl) || 0, 'obnyl', staticValue)) return;

                global.DB.query(`
                    UPDATE accounts 
                    SET inventory = '["weapon_revolver"]', fast = '["", "", ""]', money = 50000, dp = 0, cases = 0, cars = '[]', viplvl = 0, vipdate = NULL, cobura = 'false', coburaw = 'false', coburas = 'false', family = NULL, famRank = NULL
                    WHERE static = ?
                `, [staticValue], (err, result) => {
                    if (err) return console.log(err);

                    const admlogin = player.login;

                    if (targetPlayer && mp.players.exists(targetPlayer)) {
                        const login = targetPlayer.login;
                        global.sendDiscordLog(`Обнуление!\n\nАдминистратор - ${admlogin}\nИгрок - ${login}`, '1266445805355532368');
                        player.outputChatBox(`Игрок ${login} обнулён.`);
                        targetPlayer.outputChatBox(`!{#FF211A}Администратор ${admlogin} поставил вас на обнуление. Система автоматически исключила вас из игры.`);
                        setTimeout(() => {
                            if (targetPlayer && mp.players.exists(targetPlayer)) {
                                global.kickPlayerSafe(targetPlayer);
                            }
                        }, 1000);
                    } else {
                        global.sendDiscordLog(`Обнуление!\n\nАдминистратор - ${admlogin}\nИгрок - ${staticValue}`, '1266445805355532368');
                        player.outputChatBox(`Игрок со статиком ${staticValue} обнулён.`);
                    }
                });
            });   
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('q', (player) => {
    try {
                        global.kickPlayerSafe(player);
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('dm', (player, fullText, static_id, dimension) => {
    try {
        const adminlvl = player.adminlvl;
        const adminlogin = player.login;

        if (adminlvl >= 4) {
            if (!dimension || !static_id) {
                player.outputChatBox('Использование: /dm [static] [dimension]');
                return;
            }

            const targetPlayer = global.findOnlinePlayerByStatic(static_id);
            
            if (!targetPlayer) {
                return player.outputChatBox(`Игрок с таким статиком не найден на сервере.`)
            }

            if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, targetPlayer, 'dm')) return;

            if (targetPlayer.getVariable('jail') === true) {
                return player.outputChatBox(`Игрок в деморгане.`);
            }

            const login = targetPlayer.login;
            const dimensionNumber = parseInt(dimension, 10);

            if (isNaN(dimensionNumber)) {
                player.outputChatBox('Dimension должен быть числом.');
                return;
            }

            global.sendDiscordLog(`Смена деменшиона!\n\nАдминистратор - ${adminlogin}\nИгрок - ${login}\nДименшион - ${dimensionNumber}`, '1266445805355532368');

            targetPlayer.dimension = dimensionNumber;
            player.outputChatBox(`Вы успешно изменили деменшион ${login} на ${dimensionNumber}.`);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('checksocial', (player, fullText, socialid) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 4) {
            if (!socialid) {
                player.outputChatBox('Использование: /checksocial [socialid]');
                return;
            }

            global.DB.query('SELECT * FROM accounts WHERE socialid = ?', [socialid], (err, rows) => {
                if (err) return console.log(err);

                if (rows.length === 0) {
                    player.outputChatBox(`SocialID ${socialid} не найден.`);
                    return;
                }

                const coburs = [];
                if (rows[0].cobura == 'true') coburs.push('"Чёрная Кобура"');
                if (rows[0].coburaw == 'true') coburs.push('"Белая Кобура"');

                player.outputChatBox(`!{lime}ИНФОРМАЦИЯ:`)
                player.outputChatBox(`!{pink}Static - #${rows[0].static}`)
                player.outputChatBox(`!{pink}Login - ${rows[0].login}`)
                player.outputChatBox(`!{pink}SocialID - ${rows[0].socialid}`)
                player.outputChatBox(`!{pink}Family - ${rows[0].family} (rang - ${Number(rows[0].famRank)})`)
                player.outputChatBox(`!{pink}Promo - ${rows[0].promo}`)
                player.outputChatBox(`!{pink}Prefix - ${rows[0].prefix}`)
                player.outputChatBox(`!{pink}Money - ${global.formatnum1(rows[0].money)}$`)
                player.outputChatBox(`!{pink}Kills - ${rows[0].kills}`)
                player.outputChatBox(`!{pink}Deaths - ${rows[0].deaths}`)
                player.outputChatBox(`!{pink}DP - ${rows[0].dp}`)
                player.outputChatBox(`!{pink}Snow - ${rows[0].snow}`)
                player.outputChatBox(`!{pink}Case - ${rows[0].cases}`)
                player.outputChatBox(`!{pink}Coburs - [${coburs.join(',')}]`);
                player.outputChatBox(`!{pink}Vip LVL - ${rows[0].viplvl}`)
                player.outputChatBox(`!{pink}Vip Date - ${rows[0].vipdate}`)
                player.outputChatBox(`!{pink}Cars - ${rows[0].cars}`)
                player.outputChatBox(`!{pink}AdminLVL - ${rows[0].adminlvl}`)   });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('checklogin', (player, fullText, login) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 4) {
            if (!login) {
                player.outputChatBox('Использование: /checklogin [login]');
                return;
            }

            global.DB.query('SELECT * FROM accounts WHERE login = ?', [login], (err, rows) => {
                if (err) return console.log(err);

                if (rows.length === 0) {
                    player.outputChatBox(`Логин ${login} не найден.`);
                    return;
                }

                const coburs = [];
                if (rows[0].cobura == 'true') coburs.push('"Чёрная Кобура"');
                if (rows[0].coburaw == 'true') coburs.push('"Белая Кобура"');

                player.outputChatBox(`!{lime}ИНФОРМАЦИЯ:`)
                player.outputChatBox(`!{pink}Static - #${rows[0].static}`)
                player.outputChatBox(`!{pink}Login - ${rows[0].login}`)
                player.outputChatBox(`!{pink}SocialID - ${rows[0].socialid}`)
                player.outputChatBox(`!{pink}Family - ${rows[0].family} (rang - ${Number(rows[0].famRank)})`)
                player.outputChatBox(`!{pink}Promo - ${rows[0].promo}`)
                player.outputChatBox(`!{pink}Prefix - ${rows[0].prefix}`)
                player.outputChatBox(`!{pink}Money - ${global.formatnum1(rows[0].money)}$`)
                player.outputChatBox(`!{pink}Kills - ${rows[0].kills}`)
                player.outputChatBox(`!{pink}Deaths - ${rows[0].deaths}`)
                player.outputChatBox(`!{pink}DP - ${rows[0].dp}`)
                player.outputChatBox(`!{pink}Snow - ${rows[0].snow}`)
                player.outputChatBox(`!{pink}Case - ${rows[0].cases}`)
                player.outputChatBox(`!{pink}Coburs - [${coburs.join(',')}]`);
                player.outputChatBox(`!{pink}Vip LVL - ${rows[0].viplvl}`)
                player.outputChatBox(`!{pink}Vip Date - ${rows[0].vipdate}`)
                player.outputChatBox(`!{pink}Cars - ${rows[0].cars}`)
                player.outputChatBox(`!{pink}AdminLVL - ${rows[0].adminlvl}`)   });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('checkstatic', (player, fullText, static_id) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 4) {
            if (!static_id) {
                player.outputChatBox('Использование: /checkstatic [static]');
                return;
            }

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static_id], (err, rows) => {
                if (err) return console.log(err);

                if (rows.length === 0) {
                    player.outputChatBox(`Статик #${static_id} не найден.`);
                    return;
                }

                const coburs = [];
                if (rows[0].cobura == 'true') coburs.push('"Чёрная Кобура"');
                if (rows[0].coburaw == 'true') coburs.push('"Белая Кобура"');

                player.outputChatBox(`!{lime}ИНФОРМАЦИЯ:`)
                player.outputChatBox(`!{pink}Static - #${rows[0].static}`)
                player.outputChatBox(`!{pink}Login - ${rows[0].login}`)
                player.outputChatBox(`!{pink}SocialID - ${rows[0].socialid}`)
                player.outputChatBox(`!{pink}Family - ${rows[0].family} (rang - ${Number(rows[0].famRank)})`)
                player.outputChatBox(`!{pink}Promo - ${rows[0].promo}`)
                player.outputChatBox(`!{pink}Prefix - ${rows[0].prefix}`)
                player.outputChatBox(`!{pink}Money - ${global.formatnum1(rows[0].money)}$`)
                player.outputChatBox(`!{pink}Kills - ${rows[0].kills}`)
                player.outputChatBox(`!{pink}Deaths - ${rows[0].deaths}`)
                player.outputChatBox(`!{pink}DP - ${rows[0].dp}`)
                player.outputChatBox(`!{pink}Snow - ${rows[0].snow}`)
                player.outputChatBox(`!{pink}Case - ${rows[0].cases}`)
                player.outputChatBox(`!{pink}Coburs - [${coburs.join(',')}]`);
                player.outputChatBox(`!{pink}Vip LVL - ${rows[0].viplvl}`)
                player.outputChatBox(`!{pink}Vip Date - ${rows[0].vipdate}`)
                player.outputChatBox(`!{pink}Cars - ${rows[0].cars}`)
                player.outputChatBox(`!{pink}AdminLVL - ${rows[0].adminlvl}`)   });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('checkfamily', (player, fullText, ...name) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 4) {
            if (!name.length) {
                player.outputChatBox('Использование: /checkfamily [name]');
                return;
            }

            const familyName = name.join(' ');
            
            global.DB.query('SELECT * FROM families WHERE name = ?', [familyName], (err, rows) => {
                if (err) return console.log(err);

                if (rows.length === 0) {
                    player.outputChatBox(`Семья ${familyName} не найдена.`);
                    return;
                }

                const family = rows[0];
                
                global.DB.query('SELECT login, static FROM accounts WHERE family = ? AND rank = 10 LIMIT 1', [familyName], (err, leaderRows) => {
                    if (err) return console.log(err);

                    if (leaderRows.length === 0) {
                        player.outputChatBox(`!{red}Ошибка: Не найден лидер в семье ${familyName}.`);
                        return;
                    }
                    
                    const leader = leaderRows[0];
                    
                    global.DB.query('SELECT COUNT(*) AS memberCount FROM accounts WHERE family = ?', [familyName], (err, result) => {
                        if (err) return console.log(err);
                        
                        const memberCount = result[0].memberCount;
                        
                        player.outputChatBox(`!{lime}ИНФОРМАЦИЯ:`);
                        player.outputChatBox(`!{pink}Name - ${family.name}`);
                        player.outputChatBox(`!{pink}Leader - ${leader.login} (#${leader.static || 'N/A'})`);
                        player.outputChatBox(`!{pink}Members - ${memberCount}`);
                    });
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('famlist', (player) => {
    try {
        const adminlvl = player.adminlvl;

        if (adminlvl >= 4) {
            global.DB.query('SELECT * FROM families', (err, families) => {
                if (err) return console.log(err);

                if (families.length === 0) {
                    player.outputChatBox('На сервере нет семей.');
                    return;
                }

                let familyList = [];
                let pendingQueries = families.length;

                families.forEach(family => {
                    global.DB.query('SELECT COUNT(*) AS memberCount FROM accounts WHERE family = ?', [family.name], (err, result) => {
                        if (err) return console.log(err);

                        const memberCount = result[0].memberCount;
                        familyList.push({
                            name: family.name,
                            memberCount: memberCount,
                            id: family.id
                        });

                        pendingQueries--;
                        if (pendingQueries === 0) {
                            familyList.sort((a, b) => {
                                if (b.memberCount === a.memberCount) {
                                    return a.id - b.id;
                                }
                                return b.memberCount - a.memberCount;
                            });

                            let sortedFamilyList = familyList.map(family => `${family.name} (members - ${family.memberCount})`);
                            player.outputChatBox(sortedFamilyList.join(', '));
                        }
                    });
                });
            });
        }
    } catch (error) {
        return;
    }
});

mp.events.addCommand('delfamily', async (player, fullText, ...famname) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl < 7) return;

        if (famname.length === 0) {
            player.outputChatBox('Использование: /delfamily [name]');
            return;
        }
        
        const familyName = famname.join(' ');
        
        global.DB.query('SELECT * FROM families WHERE name = ?', [familyName], async (err, results) => {
            if (err || results.length === 0) {
                player.outputChatBox('Семья с таким именем не существует.');
                return;
            }

            const deletedFamilyId = parseInt(String(results[0].id), 10);
            const deletedFamilyName = String(results[0].name || familyName);

            player.outputChatBox(`Семья ${deletedFamilyName} была удалена.`);
            
            global.DB.query('SELECT login FROM accounts WHERE family = ?', [familyName], (err, accounts) => {
                if (err) return console.log(err);
                
                accounts.forEach(acc => {
                    const playerl = mp.players.toArray().find(p => p.login === acc.login);
                    if (playerl) {
                        playerl.family = null;
                        playerl.familyID = null;
                        playerl.famLeader = null;
                        playerl.famRank = null;
                        playerl.famRankExtra = null;
                        playerl.setVariable('family', null);
                        playerl.setVariable('famRank', null);
                        playerl.setVariable('famRankExtra', '');
                        playerl.setVariable('familyID', 0);
                        playerl.setVariable('familyInteriorDim', 0);
                        playerl.call('family:close');
                        playerl.call('family:cef:clear');
                        isNotify(playerl, 1, "bottom-mid", `Семью ${familyName} удалил администратор ${player.login}.`, 5000);
                    }
                });

                const afterMansionRelease = () => {
                    global.DB.query('DELETE FROM families WHERE name = ?', [deletedFamilyName], (err2) => {
                        if (err2) return console.log(err2);
                        
                        global.DB.query(
                            'UPDATE accounts SET family = NULL, famRank = NULL, fam_rank_extra = NULL WHERE family = ?',
                            [deletedFamilyName],
                            (err3) => {
                                if (err3) return console.log(err3);
                                
                                global.sendDiscordLog(`Удаление семьи!\n\nАдминистратор - ${player.login}\nСемья - ${deletedFamilyName}`, '1266445805355532368');
                            }
                        );
                    });
                };

                const afterWarPoints = (freedCount) => {
                    const n = parseInt(freedCount, 10) || 0;
                    if (n > 0 && mp.players.exists(player)) {
                        player.outputChatBox(`Точки войны семей (${n}) сброшены и стали свободными.`);
                    }
                    if (typeof global.releaseFamilyMansionOnFamilyDelete === 'function') {
                        global.releaseFamilyMansionOnFamilyDelete(deletedFamilyId, afterMansionRelease);
                    } else {
                        afterMansionRelease();
                    }
                };

                if (typeof global.releaseFamilyWarPointsOnFamilyDelete === 'function') {
                    global.releaseFamilyWarPointsOnFamilyDelete(deletedFamilyName, afterWarPoints);
                } else {
                    afterWarPoints(0);
                }
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('delallveh', (player) => {
    try {
        adminlvl = player.adminlvl

        if (adminlvl >= 6) {

            admlogin = player.login

            let allVehicles = mp.vehicles.toArray();

            allVehicles.forEach(vehicle => {
                if (vehicle && mp.vehicles.exists(vehicle)) {
                    if (vehicle.getVariable('fractioncar') === true || vehicle.getVariable('deleted')) return;
                    global.deleteVehTwo(vehicle);
                }
            });

            global.sendDiscordLog(`Удаление всех машин!\n\nАдминистратор - ${admlogin}`, '1266445805355532368')
            player.outputChatBox('Все машины были удалены.');
            mp.players.broadcast(`!{#ff0000}Администратор ${admlogin} удалил все машины на сервере.`)
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('respawnallveh', (player) => {
    try {
        const adminlvl = player.adminlvl;
        
        if (adminlvl >= 4) {
            mp.vehicles.forEach(vehicle => {
                if (vehicle.getVariable('fractioncar') === true) {
                    if (vehicle.getOccupant(0)) return;

                    let startposition = vehicle.getVariable('startposition');
                    let startheading = vehicle.getVariable('startheading');

                    if (startposition && startheading) {
                        if (vehicle.position === startposition) return;
                        
                        vehicle.repair();
                        vehicle.position = startposition;
                        vehicle.heading = startheading;
                    }
                }
            });

            global.sendDiscordLog(`Респавн всех фракционных машин!\n\nАдминистратор - ${player.login}`, '1266445805355532368')
            player.outputChatBox(`Фракционные транспортные средства успешно зареспавнены.`);
            mp.players.broadcast(`!{#ff0000}Администратор ${player.login} зареспавнил все фракционные машины.`)
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.addCommand('getstatic', (player, fullText, staticRaw) => {
    try {
        const adminlvl = player.adminlvl;
        if (adminlvl >= 1) {
            if (!staticRaw) {
                player.outputChatBox('Использование: /getstatic [static]');
                return;
            }
            const targetPlayer = global.findOnlinePlayerByStatic(staticRaw, { fallbackSessionId: true });
            if (!targetPlayer) return player.outputChatBox('Игрок с таким static не найден на сервере.');
            if (!targetPlayer.getVariable('auth')) return player.outputChatBox('Игрок не авторизован.');
            player.outputChatBox(`Игрок ${targetPlayer.login}: static #${targetPlayer.static}, session id ${targetPlayer.id}`);
        }
    } catch (error) {
        console.log(error);
    }
});

/** Глобальная амнистия: ban + bansocial + mute + jail. Только static 1–2. */
function applyOnlineAmnestyRelease() {
    let unmuted = 0;
    let unjailed = 0;
    mp.players.forEach((p) => {
        try {
            if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
            if (p.getVariable('mute') === true) {
                p.setVariable('mute', false);
                p.outputChatBox('!{#00FF00}Глобальная амнистия: мут снят.');
                unmuted++;
            }
            if (p.getVariable('jail') === true) {
                if (typeof global.releasePlayerFromDemorgan === 'function') {
                    global.releasePlayerFromDemorgan(p, {
                        message: '!{#00FF00}Глобальная амнистия: вы выпущены из деморгана.',
                        notify: 'Амнистия: деморган снят.'
                    });
                } else {
                    p.setVariable('jail', false);
                    p.call('hideDemorgan');
                    p.outputChatBox('!{#00FF00}Глобальная амнистия: вы выпущены из деморгана.');
                }
                unjailed++;
            }
        } catch (_e) {}
    });
    return { unmuted, unjailed };
}

global.runGlobalAmnesty = function runGlobalAmnesty(reason, cb) {
    const done = typeof cb === 'function' ? cb : function () {};
    const counts = { ban: 0, bansocial: 0, mute: 0, jail: 0 };
    let pending = 4;
    let failed = false;

    function finishCounts() {
        if (failed) return done(new Error('count_failed'), null);
        global.DB.query('DELETE FROM ban', [], (e1) => {
            if (e1) console.log('[amnesty] DELETE ban:', e1);
            global.DB.query('DELETE FROM bansocial', [], (e2) => {
                if (e2) console.log('[amnesty] DELETE bansocial:', e2);
                global.DB.query('DELETE FROM mute', [], (e3) => {
                    if (e3) console.log('[amnesty] DELETE mute:', e3);
                    global.DB.query('DELETE FROM jail', [], (e4) => {
                        if (e4) console.log('[amnesty] DELETE jail:', e4);
                        try { global.chatstatus = true; } catch (_e) {}
                        const online = applyOnlineAmnestyRelease();
                        console.log('[amnesty]', reason || '', counts, online);
                        done(null, { counts, online });
                    });
                });
            });
        });
    }

    ['ban', 'bansocial', 'mute', 'jail'].forEach((table) => {
        global.DB.query(`SELECT COUNT(*) AS c FROM ${table}`, [], (err, rows) => {
            if (err) {
                console.log(`[amnesty] COUNT ${table}:`, err);
                failed = true;
            } else {
                counts[table] = Number(rows && rows[0] && rows[0].c) || 0;
            }
            pending -= 1;
            if (pending <= 0) finishCounts();
        });
    });
};

mp.events.addCommand('amnesty', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.isCreatorPlayer === 'function' ? !global.isCreatorPlayer(player) : ![1, 2].includes(Number(player.static))) {
            return player.outputChatBox('Только создателям (static 1–2).');
        }
        global.runGlobalAmnesty(`cmd by #${player.static} ${player.login}`, (err, result) => {
            if (err || !result) {
                player.outputChatBox('Амнистия: ошибка БД, смотри консоль.');
                return;
            }
            const { counts, online } = result;
            const msg =
                `Глобальная амнистия: ban ${counts.ban}, hardban ${counts.bansocial}, mute ${counts.mute}, jail ${counts.jail}. ` +
                `Онлайн: unmute ${online.unmuted}, unjail ${online.unjailed}.`;
            player.outputChatBox(msg);
            mp.players.broadcast(`!{#00FF00}[#${player.static}] ${player.login} объявил глобальную амнистию: сняты все баны, хардбаны, муты и деморганы.`);
            try {
                if (typeof global.sendDiscordLog === 'function') {
                    global.sendDiscordLog(
                        `Глобальная амнистия!\n\nАдминистратор - [#${player.static}] ${player.login}\n` +
                        `ban: ${counts.ban}\nbansocial: ${counts.bansocial}\nmute: ${counts.mute}\njail: ${counts.jail}\n` +
                        `online unmute: ${online.unmuted}\nonline unjail: ${online.unjailed}`,
                        '1266445805355532368'
                    );
                }
            } catch (_e) {}
        });
    } catch (error) {
        console.log(error);
    }
});

// mp.events.addCommand('drink', (player) => {
//     if (player.vehicle) {
//         player.outputChatBox('Вы не можете пить в транспорте!');
//         return;
//     }

//     player.playAnimation('amb@code_human_wander_drinking@beer@male@idle_a', 'idle_a', 1, 49);
//     player.outputChatBox('Вы начали пить пиво.');

//     setTimeout(() => {
//         player.stopAnimation();
//         player.outputChatBox('Вы закончили пить.');
//     }, 5000); // Длительность анимации в миллисекундах (5 секунд)
// });
