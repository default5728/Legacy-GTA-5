const bcrypt = require('bcryptjs');

/** Логин: латиница, кириллица (ё/Ё), цифры и _; без пробелов и спецсимволов. */
function isValidAccountLogin(login) {
    return typeof login === 'string' && /^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(login);
}
global.isValidAccountLogin = isValidAccountLogin;

const LOGIN_FORMAT_HINT = 'Логин: только буквы (русские или английские), цифры и символ _';
const AUTH_SERVER_ERROR = 'Ошибка сервера. Попробуйте позже';
const AUTH_WRONG_LOGIN = 'Неверный логин';
const AUTH_WRONG_PASSWORD = 'Неверный пароль';
const moment = require('moment-timezone');
const EmailRestore = require('./email.js');
const armorCosmeticAccount = require('./config/armor_cosmetic');

function logAuthDbErr(tag, err) {
    if (!err) return;
    console.log('[auth] DB', tag + ':', err.message || err);
}

function authStatusLabel(player, message) {
    if (!player || !mp.players.exists(player)) return;
    if (player.getVariable('auth') === true) return;
    const msg = String(message || '').trim();
    if (!msg) return;
    player.call('showAuthError', [msg]);
}

function accountNeedsCharCreator(row) {
    if (!row || typeof row !== 'object') return false;
    const cc = row.char_created;
    return cc == null || cc === '' || Number(cc) === 0;
}

function finishAuthAfterLogin(player, row) {
    if (!mp.players.exists(player)) return;
    try { player.call('auth:sessionStarted'); } catch (_as) {}
    if (accountNeedsCharCreator(row) && typeof global.openCharCreatorForPlayer === 'function') {
        setTimeout(() => {
            if (mp.players.exists(player)) global.openCharCreatorForPlayer(player);
        }, 400);
        return;
    }
    if (typeof global.enterPlayAfterLogin === 'function') {
        global.enterPlayAfterLogin(player, row);
        return;
    }
    player.call('hideLogin');
}

function abortAuthDb(player, tag, err) {
    if (!err) return false;
    logAuthDbErr(tag, err);
    if (player && mp.players.exists(player)) {
        authStatusLabel(player, 'Ошибка базы данных. Попробуйте позже.');
    }
    return true;
}

/** IP из bansocial не блокирует «чужих» игроков (WARP/VPN/общий NAT) — только совпадение SC или HWID. */
function checkBansocialIpForPlayer(player, cb) {
    const ip = String(player && player.ip || '').trim();
    if (!ip || ip === '127.0.0.1') return cb(null);

    const social = String(player.rgscId || '').trim();
    const hwid = String(player.serial || '').trim();

    global.DB.query(
        `SELECT reason FROM bansocial
         WHERE ipadr = ? AND ipadr IS NOT NULL AND ipadr <> ''
           AND (socialid = ? OR (hwid IS NOT NULL AND hwid <> '' AND hwid = ?))
         LIMIT 1`,
        [ip, social, hwid],
        function (err, rows) {
            if (abortAuthDb(player, 'bansocial_ip', err)) return cb(null);
            if (rows && rows.length > 0) return cb(rows[0].reason);
            cb(null);
        }
    );
}

function checkBansocialHwidForPlayer(player, cb) {
    const hwid = String(player && player.serial || '').trim();
    if (!hwid) return cb(null);

    global.DB.query(
        `SELECT reason FROM bansocial
         WHERE hwid = ? AND hwid IS NOT NULL AND hwid <> ''
         LIMIT 1`,
        [hwid],
        function (err, rows) {
            if (abortAuthDb(player, 'bansocial_hwid', err)) return cb(null);
            if (rows && rows.length > 0) return cb(rows[0].reason);
            cb(null);
        }
    );
}

const AUTH_LOBBY_BASE = {
    x: 809.11414,
    y: -19.974813,
    z: 97.08313
};
const AUTH_LOBBY_HEADING = -97.68315;
const AUTH_LOBBY_OFFSET_STEP = 1.15;
const AUTH_LOBBY_OCCUPY_RADIUS = 1.1;

function authLobbyPosNear(base, otherPos) {
    if (!otherPos) return false;
    const dx = Number(otherPos.x) - Number(base.x);
    const dy = Number(otherPos.y) - Number(base.y);
    const dz = Number(otherPos.z) - Number(base.z);
    const r = AUTH_LOBBY_OCCUPY_RADIUS;
    return dx * dx + dy * dy + dz * dz < r * r;
}

function resolveAuthLobbySpawnForPlayer(player) {
    const heading = AUTH_LOBBY_HEADING;
    const rad = (heading * Math.PI) / 180;
    const perpX = Math.cos(rad + Math.PI / 2);
    const perpY = Math.sin(rad + Math.PI / 2);
    const slots = [0, -1, 1, -2, 2, -3, 3, -4, 4];
    const dim = player.dimension;

    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const pos = new mp.Vector3(
            AUTH_LOBBY_BASE.x + perpX * AUTH_LOBBY_OFFSET_STEP * slot,
            AUTH_LOBBY_BASE.y + perpY * AUTH_LOBBY_OFFSET_STEP * slot,
            AUTH_LOBBY_BASE.z
        );
        let free = true;
        mp.players.forEach((other) => {
            if (!other || other === player || !mp.players.exists(other)) return;
            if (other.dimension !== dim) return;
            if (other.getVariable('auth') === true) return;
            if (authLobbyPosNear(pos, other.position)) free = false;
        });
        if (free) return { pos, heading };
    }

    return {
        pos: new mp.Vector3(AUTH_LOBBY_BASE.x, AUTH_LOBBY_BASE.y, AUTH_LOBBY_BASE.z),
        heading
    };
}

function applyAuthLobbySpawn(player) {
    const spawn = resolveAuthLobbySpawnForPlayer(player);
    player.position = spawn.pos;
    player.heading = spawn.heading;
    player.call('authLobbySpawnApply', [spawn.pos.x, spawn.pos.y, spawn.pos.z, spawn.heading]);
}

function hydrateArmorCosmeticUnlocks(player, row) {
    try {
        if (!player || !mp.players.exists(player)) return;
        const raw =
            row && Object.prototype.hasOwnProperty.call(row, 'armor_cosmetic_unlocks')
                ? row.armor_cosmetic_unlocks
                : null;
        player.armorCosmeticUnlocks = armorCosmeticAccount.normalizeUnlockArray(raw);
    } catch (_e) {
        player.armorCosmeticUnlocks = [];
    }
}

function ensureArmorCosmeticUnlocksColumn() {
    if (!global.DB) {
        setTimeout(ensureArmorCosmeticUnlocksColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN armor_cosmetic_unlocks MEDIUMTEXT NULL DEFAULT NULL',
        [],
        (err) => {
            if (!err) {
                console.log('[armor_cosmetic_unlocks] колонка accounts.armor_cosmetic_unlocks создана автоматически.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[armor_cosmetic_unlocks] ALTER:', err.code || err.message);
        }
    );
}

mp.events.add('playerReady', player => {
    try {
        if (!mp.players.exists(player)) return;

        if (!player.clicked) player.clicked = 0;
        player.dimension = Math.floor(Math.random() * 1000) + 5000;
        applyAuthLobbySpawn(player);

        if (player && mp.players.exists(player)) {
            player.call('chatoff');
            scheduleWelcomeIntro(player);
        }
    } catch (error) {
        console.log(error);
    }
});

function pushWelcomeIntro(player) {
    if (!mp.players.exists(player)) return;
    if (player.getVariable('auth') === true) return;
    player.call('hud', [false]);
    player.call('chatoff');
    player.call('WelcomeIntroShow');
}

function scheduleWelcomeIntro(player) {
    if (!mp.players.exists(player)) return;
    pushWelcomeIntro(player);
    [400, 1200, 3000, 6000, 10000, 15000].forEach((ms) => {
        setTimeout(() => {
            if (mp.players.exists(player) && player.getVariable('auth') !== true) {
                pushWelcomeIntro(player);
            }
        }, ms);
    });
}

mp.events.add('playerJoin', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        setTimeout(() => scheduleWelcomeIntro(player), 1200);
    } catch (error) {
        console.log('[auth] playerJoin welcome:', error);
    }
});

mp.events.add('server_auth_clientReady', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        scheduleWelcomeIntro(player);
    } catch (error) {
        console.log('[auth] server_auth_clientReady:', error);
    }
});

mp.events.add('onLoginAttempt', async (player, data) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('auth') === true) return;

        data = JSON.parse(data);
        try { data = await global.prepareKeplerLogin(player, data); } catch (e) { return authStatusLabel(player, e.message || 'Ошибка авторизации'); }

        // The migration bridge returns the verified canonical login; legacy logins may contain spaces.
        if (typeof data.login !== 'string' || !/^[a-zA-Zа-яА-ЯёЁ0-9_ ]+$/.test(data.login)) return authStatusLabel(player, LOGIN_FORMAT_HINT);
        if (data.login.length < 3) return authStatusLabel(player, 'Логин должен содержать минимум 3 символа');
        if (data.login.length > 64) return authStatusLabel(player, 'Логин должен содержать максимум 64 символа');

        global.DB.query('SELECT * FROM accounts WHERE login = ? LIMIT 1', [data.login], function (err, results) {
            if (!mp.players.exists(player)) return;
            if (err) {
                console.log('[auth] login select:', err.message || err);
                return authStatusLabel(player, 'Ошибка базы данных. Попробуйте позже.');
            }
            if (!results || results.length == 0) return authStatusLabel(player, AUTH_WRONG_LOGIN);

            const dbPassword = results[0].password;
            bcrypt.compare(data.password, dbPassword).then(function (isMatched) {
                if (!mp.players.exists(player)) return;
                if (isMatched) {
                    const afterBanGuard = () => {
                    if (String(results[0].socialid).trim() === String(player.rgscId).trim()) {
                        global.DB.query('SELECT * FROM bansocial WHERE socialid = ?', [String(player.rgscId).trim()], function (err, bansocial) {
                            if (!mp.players.exists(player)) return;
                            if (abortAuthDb(player, 'bansocial', err)) return;

                            if (bansocial.length > 0) {
                                const reason = bansocial[0].reason;
                                authStatusLabel(player, `Social Club заблокирован. Причина: ${reason}`);
                                return;
                            }

                            checkBansocialIpForPlayer(player, function (ipReason) {
                                if (!mp.players.exists(player)) return;
                                if (ipReason) {
                                    authStatusLabel(player, `Аккаунт заблокирован. Причина: ${ipReason}`);
                                    return;
                                }

                                checkBansocialHwidForPlayer(player, function (hwidReason) {
                                    if (!mp.players.exists(player)) return;
                                    if (hwidReason) {
                                        authStatusLabel(player, `Аккаунт заблокирован. Причина: ${hwidReason}`);
                                        return;
                                    }

                                    const timedFp =
                                        global.banGuard &&
                                        typeof global.banGuard.checkTimedFingerprintsForPlayer === 'function'
                                            ? global.banGuard.checkTimedFingerprintsForPlayer.bind(global.banGuard)
                                            : null;
                                    const afterTimedFp = (timedReason) => {
                                        if (!mp.players.exists(player)) return;
                                        if (timedReason) {
                                            authStatusLabel(player, `Аккаунт заблокирован. Причина: ${timedReason}`);
                                            return;
                                        }

                                    player.static = results[0].static;
                                    global.DB.query('SELECT * FROM ban WHERE static = ? AND unban > NOW() LIMIT 1', [player.static], function (err, banResults) {
                                                    if (!mp.players.exists(player)) return;
                                                    if (abortAuthDb(player, 'ban', err)) return;

                                                    if (banResults.length > 0) {
                                                        const row = banResults[0];
                                                        const unbanDate = moment(row.unban).tz('Europe/Moscow').format('DD.MM.YYYY HH:mm:ss');
                                                        const login = row.login;
                                                        const reason = row.reason;
                                                        authStatusLabel(
                                                            player,
                                                            `Аккаунт ${login} заблокирован до ${unbanDate}. Причина: ${reason}`
                                                        );
                                                        setTimeout(() => {
                                                            if (player && mp.players.exists(player) && reason == 'executor') {
                                                                player.ban();
                                                            }
                                                        }, 500);
                                                        return;
                                                    } else {
                                                        if (player && mp.players.exists(player)) {
                                                            if (player.getVariable('auth') === true) return;

                                                            player.call('dstatus', ['На сервере FLOW DM', 'discord.gg/flowdm']);

                                                            player.call('authstorage', [results[0].login]);
                                                            player.setVariable('auth', true);
                                                            global.DB.query('UPDATE accounts SET last_login = NOW() WHERE static = ?', [player.static]);
                                                            if (typeof global.refreshDiscordPresence === 'function') {
                                                                global.refreshDiscordPresence();
                                                            }
                                                            if (typeof global.clearPendingCasePrize === 'function') {
                                                                global.clearPendingCasePrize(player);
                                                            } else {
                                                                player.setVariable('randomitem', '');
                                                                player._casePrizePendingAt = 0;
                                                            }
                                                            const currentDate = new Date();
                                                            
                                                            player.login = results[0].login;
                                                            player.email = String(results[0].email || '');
                                                            player.name = results[0].login;
                                                            player.money = results[0].money;
                                                            player.dp = results[0].dp;
                                                            player.fib_armor_v4 = Number(results[0].fib_armor_v4) === 1;
                                                            player.media = Number(results[0].media) === 1;
                                                            hydrateArmorCosmeticUnlocks(player, results[0]);
                                                            if (typeof global.pushCasesCatalogToClient === 'function') {
                                                                global.pushCasesCatalogToClient(player);
                                                            }
                                                            player.glvl = results[0].glvl;
                                                            player.adminlvl = results[0].adminlvl;
                                                            player.case = results[0].cases;
                                                            player.armorCase = parseInt(results[0].armor_cases, 10) || 0;
                                                            player.goldCase = parseInt(results[0].gold_cases, 10) || 0;
                                                            player.kills = results[0].kills;
                                                            player.deaths = results[0].deaths;
                                                            if (typeof global.pmHydrateCharLevel === 'function') {
                                                                global.pmHydrateCharLevel(player, results[0]);
                                                            } else {
                                                                player.charlevel = 1;
                                                                player.charexp = 0;
                                                            }
                                                            if (typeof global.hydratePortSkill === 'function') {
                                                                global.hydratePortSkill(player, results[0]);
                                                            } else {
                                                                player.portSkillXp = parseInt(results[0].port_skill_xp, 10) || 0;
                                                            }
                                                            if (typeof global.hydrateConstructionSkill === 'function') {
                                                                global.hydrateConstructionSkill(player, results[0]);
                                                            } else {
                                                                player.constructionSkillXp = parseInt(results[0].construction_skill_xp, 10) || 0;
                                                            }
                                                            player.onlineHours = parseInt(results[0].online, 10) || 0;
                                                            player.viplvl = results[0].viplvl;
                                                            player.vipdate = new Date(results[0].vipdate);
                                                            player.casetime = parseInt(results[0].casetime, 10) || 0;
                                                            player._onlineAccumMs = 0;
                                                            player.prefix = results[0].prefix;
                                                            player.fraction_prefix = results[0].fraction_prefix || null;
                                                            global.DB.query(
                                                                `INSERT INTO logsauth (static, social, ipadr, time, type) VALUES (?, ?, ?, NOW(), ?)`,
                                                                [player.static, player.rgscId, player.ip, 'авторизация'],
                                                                (err, result) => {
                                                                    if (err) {
                                                                        return;
                                                                    }
                                                                }
                                                            );
                                                            player.family = results[0].family;
                                                            if (player.family !== null) {
                                                                mp.events.call('family:loadplayers:s', player);
                                                            }
                                                            player.famRank =
                                                                player.family != null && String(player.family).trim() !== ''
                                                                    ? Number(results[0].famRank)
                                                                    : null;
                                                            if (player.famRank != null) player.call('family:cef:setrank', [player.famRank]);
                                                            player.setVariable('family', results[0].family);
                                                            player.setVariable(
                                                                'famRank',
                                                                player.family != null && String(player.family).trim() !== ''
                                                                    ? (Number.isFinite(player.famRank) ? player.famRank : 0)
                                                                    : null
                                                            );
                                                            let famExtra = null;
                                                            if (player.family != null && String(player.family).trim() !== '' && results[0].fam_rank_extra != null) {
                                                                famExtra = String(results[0].fam_rank_extra);
                                                            }
                                                            player.famRankExtra = famExtra;
                                                            player.setVariable('famRankExtra', famExtra || '');
                                                            if (player.family != null && String(player.family).trim() !== '') {
                                                                global.DB.query(
                                                                    'SELECT id, name, regdate FROM families WHERE name = ?',
                                                                    [player.getVariable('family')],
                                                                    function (err, famResults) {
                                                                        if (err || !famResults || !famResults[0]) return;
                                                                        player.familyID = famResults[0].id;
                                                                        player.setVariable('familyID', Number(famResults[0].id));
                                                                        if (typeof global.rememberFamilyIdentity === 'function') {
                                                                            global.rememberFamilyIdentity(famResults[0].name || player.family, famResults[0].id);
                                                                        }
                                                                        if (typeof global.getFamilyMansionInteriorDim === 'function') {
                                                                            player.setVariable(
                                                                                'familyInteriorDim',
                                                                                global.getFamilyMansionInteriorDim(Number(famResults[0].id))
                                                                            );
                                                                        }
                                                                        if (parseInt(player.famRank, 10) === 10) {
                                                                            mp.events.call('family:rank:load:s', player);
                                                                            player.famLeader = true;
                                                                        } else {
                                                                            player.famLeader = false;
                                                                        }

                                                                        const regDate = new Date(famResults[0].regdate);
                                                                        const formattedDate = `${regDate.getDate().toString().padStart(2, '0')}.${(regDate.getMonth() + 1).toString().padStart(2, '0')}.${regDate.getFullYear()} ${regDate.getHours().toString().padStart(2, '0')}:${regDate.getMinutes().toString().padStart(2, '0')}:${regDate.getSeconds().toString().padStart(2, '0')}`;
                                                                        const familyName = famResults[0].name;
                                                                        player.call('family:cef:loadinfo', [familyName, formattedDate]);
                                                                    }
                                                                );
                                                            } else {
                                                                player.familyID = null;
                                                                player.setVariable('familyID', 0);
                                                                player.famLeader = false;
                                                                player.famRankExtra = null;
                                                                player.setVariable('famRankExtra', '');
                                                                player.setVariable('familyInteriorDim', 0);
                                                            }

                                                            if (typeof global.pushLuckyWheelHud === 'function') {
                                                                global.pushLuckyWheelHud(player, player.casetime);
                                                                const rem = typeof global.getLuckyWheelRemainingMinutes === 'function'
                                                                    ? global.getLuckyWheelRemainingMinutes(player.casetime)
                                                                    : 0;
                                                                if (rem <= 0) {
                                                                    player.outputChatBox(`!{yellow}Доступна прокрутка колеса удачи в казино!`);
                                                                }
                                                            }

                                                            player.setVariable('gm', false);
                                                            player.setVariable('invisible', 255);
                                                            player.setVariable('mute', false);
                                                            player.setVariable('jail', false);
                                                            player.setVariable('nof3', false);
                                                            player.setVariable('ac', true);
                                                            player.setVariable('kost', null);
                                                            player.setVariable('report', null);
                                                            player.setVariable('viplvl', player.viplvl);
                                                            player.setVariable('media', player.media === true);
                                                            if (typeof global.applyAdminSessionOnAuth === 'function') global.applyAdminSessionOnAuth(player);
                                                            else player.setVariable('adminlvl', player.adminlvl);
                                                            applyRednameFromAccount(player, results[0]);
                                                            player.setVariable('static', player.static);
                                                            if (typeof global.syncPlayerMpIdVar === 'function') global.syncPlayerMpIdVar(player);
                                                            player.setVariable('login', player.login);
                                                            try {
                                                                if (global.banGuard && typeof global.banGuard.saveAccountFingerprints === 'function') {
                                                                    global.banGuard.saveAccountFingerprints(player, player.static);
                                                                }
                                                            } catch (_fp) {}
                                                            player.setVariable('dead', false);
                                                            player.setVariable('mp', false)
                                                            player.setVariable('mpp', false)
                                                            player.setVariable('office_fam', false);

                                                            if (player.vipdate >= currentDate) {
                                                                player.viplvl = player.viplvl
                                                                player.setVariable('viplvl', player.viplvl);
                                                                const now = new Date();
                                                                const timeDiff = player.vipdate - now;
                                                                const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                                                            } else {
                                                                player.viplvl = 0
                                                                player.setVariable('viplvl', 0);
                                                            }

                                                            (function syncGangwarFractionLogin() {
                                                                let f = results[0].fraction;
                                                                let n = f != null && f !== '' ? parseInt(f, 10) : 0;
                                                                if (isNaN(n) || n < 0) n = 0;
                                                                if (n > 6) n = 6;
                                                                player.setVariable('fraction', n);
                                                                player.call('setfraction', [n]);
                                                                // Синхронизировать fraction_rank (без вызова playerReady — это re-trigger welcome screen)
                                                                (function syncFractionRank() {
                                                                    try {
                                                                        const fr = results[0].fraction_rank;
                                                                        const rn = fr != null ? parseInt(fr, 10) || 0 : 0;
                                                                        player.fraction_rank = rn;
                                                                        if (typeof mp !== 'undefined') {
                                                                            setTimeout(() => {
                                                                                try {
                                                                                    if (mp.players.exists(player)) {
                                                                                        player.call('fraction:rank:updated', [rn]);
                                                                                        // Синхронизация зон — не через playerReady!
                                                                                        if (typeof global.fractionSyncZonesToPlayer === 'function') {
                                                                                            global.fractionSyncZonesToPlayer(player);
                                                                                        }
                                                                                    }
                                                                                } catch (_) {}
                                                                            }, 2000);
                                                                        }
                                                                    } catch (_e) {}
                                                                })();
                                                            })();

                                                            setCount();

                                                            player.call('setKillsStats', [player.kills, player.deaths, player.onlineHours]);
                                                            pushMenuAccountProfile(player);
                                                            if (typeof global.syncNewbieQuests === 'function') global.syncNewbieQuests(player);
                                                            setTimeout(() => {
                                                                try {
                                                                    if (mp.players.exists(player) && typeof global.restoreShootLoggerForPlayer === 'function') {
                                                                        global.restoreShootLoggerForPlayer(player);
                                                                    }
                                                                } catch (_e) {}
                                                            }, 2000);
                                                            player.call('setlogin', [player.login]);
                                                            player.call('updateMoney', [global.formatnum1(player.money)]);
                                                            player.call('updatedp', [global.formatnum1(player.dp)]);
                                                            player.call('updatefreecase1', [global.formatnum1(player.case)]);
                                                            player.call('updatefreearmorcase1', [global.formatnum1(player.armorCase || 0)]);
                                                            player.call('updatefreegoldcase1', [global.formatnum1(player.goldCase || 0)]);

                                                            if (player.getVariable('ammo') == true) player.call('hideAmmo');
                                                            
                                                            global.loadcar(player);
                                                            global.loadInventory(player, results[0], { deferBagInstances: true });

                                                            try {
                                                                const _af = results[0].anim_favorites;
                                                                const _afNorm =
                                                                    typeof _af === 'string' && _af.trim().length > 0
                                                                        ? _af
                                                                        : '[]';
                                                                player.anim_favorites = _afNorm;
                                                                player._animFavDirty = false;
                                                                player.call('anim:favorites:hydrate', [_afNorm]);
                                                            } catch (_e) {}

                                                            try {
                                                                if (typeof global.hydrateAnimSlotsForPlayer === 'function') {
                                                                    global.hydrateAnimSlotsForPlayer(player, results[0].anim_slots_json);
                                                                }
                                                            } catch (_e) {}

                                                            hydrateCrosshairSettingsFromAccount(player, results[0]);

                                                            setTimeout(() => {
                                                                if (!mp.players.exists(player)) return;
                                                                if (player.getVariable('charCreating') === true) return;
                                                                if (typeof global.hydratePlayerClothesFromDb === 'function') {
                                                                    global.hydratePlayerClothesFromDb(player);
                                                                }
                                                            }, 450);
                                                            
                                                            if (player.ip !== "127.0.0.1") {
                                                                global.sendDiscordLog(`Новый Вход!\n\nLOGIN: ${data.login}\nIP: ${player.ip}\nSocialClub ID: ${player.rgscId}`, '1249405565562519812');
                                                            }
                                                            
                                                            player.call('server:clearChat');
                                                            player._loginWelcomeChatDone = false;
                                                            player._loginWelcomeChatPending = true;
                                                            const needsCharCreator = accountNeedsCharCreator(results[0]);
                                                            setTimeout(() => {
                                                                if (!player || !mp.players.exists(player)) return;
                                                                if (needsCharCreator) return;
                                                                if (player.getVariable('charCreating') === true) return;
                                                                if (typeof global.pushLoginWelcomeChat === 'function') {
                                                                    global.pushLoginWelcomeChat(player);
                                                                }
                                                            }, 250);

                                                            global.torgupdplayer(player);

                                                            finishAuthAfterLogin(player, results[0]);
                                                            setTimeout(() => {
                                                                if (typeof global.safeLoadCitizenIdentity === 'function') {
                                                                    global.safeLoadCitizenIdentity(player, results[0]);
                                                                }
                                                            }, 100);
                                                            setTimeout(() => {
                                                                try {
                                                                    if (typeof global.sendFamilyMansionSyncToPlayer === 'function') {
                                                                        global.sendFamilyMansionSyncToPlayer(player);
                                                                    }
                                                                } catch (_e) {}
                                                            }, 900);
                                                            mp.events.call('s:report:load', player);

                                                            global.DB.query('SELECT * FROM mute WHERE static = ?', [player.static], (err, muteResults) => {
                                                                if (err) {
                                                                    logAuthDbErr('mute_select', err);
                                                                    return;
                                                                }

                                                                if (muteResults.length > 0) {

                                                                    const admlogin = muteResults[0].admin
                                                                    const reason = muteResults[0].reason

                                                                    if (typeof global.pushChatBox === 'function') {
                                                                        global.pushChatBox(player, `!{red}У вас присуствует активный мут! Администратор: ${admlogin}. Причина: ${reason}.`);
                                                                    } else {
                                                                        player.outputChatBox(`!{red}У вас присуствует активный мут! Администратор: ${admlogin}. Причина: ${reason}.`);
                                                                    }

                                                                    let muteTime = muteResults[0].seconds;
                                                                    player.setVariable('mute', true)
                                                                    if (muteTime > 0) {
                                                                        const interval = setInterval(() => {
                                                                            
                                                                            if (!mp.players.exists(player)) {
                                                                                clearInterval(interval);
                                                                                return;
                                                                            }

                                                                            muteTime -= 1;
                                                                            global.DB.query('UPDATE mute SET seconds = ? WHERE static = ?', [muteTime, player.static], (err, updateMuteResults) => {
                                                                                if (err) logAuthDbErr('mute_update', err);
                                                                            });
                                                                            if (muteTime <= 0) {
                                                                                clearInterval(interval);
                                                                                global.DB.query('DELETE FROM mute WHERE static = ?', [player.static], (err, deleteMuteResults) => {
                                                                                    if (err) logAuthDbErr('mute_delete', err);

                                                                                    player.setVariable('mute', false)
                                                                                    if (typeof global.pushChatBox === 'function') {
                                                                                        global.pushChatBox(player, '!{#00FF00}Время мута истекло.');
                                                                                    } else {
                                                                                        player.outputChatBox(`!{#00FF00}Время мута истекло.`);
                                                                                    }
                                                                                });
                                                                            }
                                                                        }, 1000);
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }
                                                });
                                    }; // afterTimedFp
                                    if (timedFp) timedFp(player, afterTimedFp);
                                    else afterTimedFp(null);
                                });
                            });
                        });
                    } else {
                        authStatusLabel(player, 'Аккаунт привязан к другому Social Club');
                    }
                    }; // afterBanGuard
                    if (global.banGuard && typeof global.banGuard.findAnyBan === 'function') {
                        global.banGuard.findAnyBan(player, (banRow) => {
                            if (!mp.players.exists(player)) return;
                            if (banRow) {
                                authStatusLabel(player, `Доступ запрещён (бан). Причина: ${banRow.reason || 'нарушение'}`);
                                try { global.banGuard.kickBanned(player, banRow.reason); } catch (_k) {}
                                return;
                            }
                            afterBanGuard();
                        });
                    } else {
                        afterBanGuard();
                    }
                } else {
                    authStatusLabel(player, AUTH_WRONG_PASSWORD);
                }
            }).catch(function (err) {
                if (!mp.players.exists(player)) return;
                logAuthDbErr('bcrypt_compare', err);
                authStatusLabel(player, AUTH_SERVER_ERROR);
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('onRegisterAttempt', (player, data) => {
    try {
        if (!mp.players.exists(player)) return;
        if (player.getVariable('auth') == true) return;

        data = JSON.parse(data);

        if (!isValidAccountLogin(data.login)) return authStatusLabel(player, LOGIN_FORMAT_HINT);
        if (data.login.length < 3) return authStatusLabel(player, 'Логин должен содержать минимум 3 символа');
        if (data.login.length > 64) return authStatusLabel(player, 'Логин должен содержать максимум 64 символа');
        if (!data.email) return authStatusLabel(player, 'Введите корректную почту');
        if (!player.socialClub) return authStatusLabel(player, AUTH_SERVER_ERROR);
        if (global.whitelistEnabled === true) return authStatusLabel(player, 'Регистрация временно не доступна, Ожидайте.');

        const startRegister = () => {
        global.DB.query('SELECT static FROM accounts WHERE login = ?', [data.login], function(err, results){
            if (err) {
                return authStatusLabel(player, AUTH_SERVER_ERROR);
            }

            if (results.length > 0) return authStatusLabel(player, 'Такой логин уже занят');

            global.DB.query('SELECT static FROM accounts WHERE email = ?', [data.email], function(err, results) {
                if (err) {
                    return authStatusLabel(player, AUTH_SERVER_ERROR);
                }
                
                if (results.length > 0) return authStatusLabel(player, 'Эта почта уже используется');

                global.DB.query('SELECT static FROM accounts WHERE socialid = ?', [player.rgscId], function(err, results){
                    if (err) {
                        return authStatusLabel(player, AUTH_SERVER_ERROR);
                    }

                    if (results.length > 0) return authStatusLabel(player, 'На ваш Social Club уже зарегистрирован аккаунт. Войдите через авторизацию');

                    bcrypt.hash(data.password, 10, function(err, passwordHash) {
                        if (err) {
                            return authStatusLabel(player, AUTH_SERVER_ERROR);
                        }

                        global.DB.query(
                        'INSERT INTO accounts (login, password, socialid, email, prefix, money, dp) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [data.login, passwordHash, player.rgscId, data.email, '', '500000', '0'],
                        function(err, results) {    
                            if (err) {
                                console.log('INSERT ERROR:', err);
                                return authStatusLabel(player, AUTH_SERVER_ERROR);
                            }

                            global.DB.query('SELECT * FROM accounts WHERE login = ? LIMIT 1', [data.login], function (err, results) {
                                if (err) {
                                    return authStatusLabel(player, AUTH_SERVER_ERROR);
                                }

                                if (!player || !mp.players.exists(player)) return;
                                if (player.getVariable('auth') === true) return;

                                global.sendDiscordLog(
                                    `Новая Регистрация!\n\nLOGIN: ${data.login}\nIP: ${player.ip}\nSocialClub ID: ${player.rgscId}`,
                                    '1249405565562519812'
                                );
                                try { player.call('registerSuccess', [data.login]); } catch (_rs) {}
                                try {
                                    if (results && results[0] && global.banGuard && typeof global.banGuard.saveAccountFingerprints === 'function') {
                                        global.banGuard.saveAccountFingerprints(player, results[0].static);
                                    }
                                } catch (_fp) {}
                            });
                        });
                    });
                });
            });
        });
        }; // startRegister
        if (global.banGuard && typeof global.banGuard.findAnyBan === 'function') {
            global.banGuard.findAnyBan(player, (banRow) => {
                if (!mp.players.exists(player)) return;
                if (banRow) {
                    authStatusLabel(player, `Регистрация запрещена (бан). Причина: ${banRow.reason || 'нарушение'}`);
                    try { global.banGuard.kickBanned(player, banRow.reason); } catch (_k) {}
                    return;
                }
                startRegister();
            });
        } else {
            startRegister();
        }
    } catch (error) {
        console.log(error);
    }
});
//RESTORE//
mp.events.add('recoverypassword:s', (player, email) => {
    try {
        if (!mp.players.exists(player)) return;

        const normalizedEmail = EmailRestore.normalizeEmail(email);
        if (!normalizedEmail) {
            return authStatusLabel(player, 'Введите корректную почту');
        }

        global.DB.query('SELECT * FROM accounts WHERE LOWER(email) = ? LIMIT 1', [normalizedEmail], async function (err, results) {
            if (err) return console.log(err);
            if (results.length == 0) {
                player.call('vercode::c', [false]);
                return authStatusLabel(player, 'Аккаунт с такой почтой не найден');
            }

            EmailRestore.clearRecoveryCode(player);
            const sendResult = await EmailRestore.sendVerificationCode(player, normalizedEmail, results[0].login);
            if (!sendResult.success) {
                player.call('vercode::c', [false]);
                return authStatusLabel(player, 'Не удалось отправить код на почту. Попробуйте позже');
            }

            player.call('vercode::c', [true]);
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('recoverypassword2:s', (player, email, code, password) => {
    try {
        if (!mp.players.exists(player)) return;

        const normalizedEmail = EmailRestore.normalizeEmail(email);
        const normalizedCode = String(code || '').trim();
        if (!password || !normalizedEmail || !normalizedCode) return;
        if (password.length < 6) {
            return authStatusLabel(player, 'Минимальная длина пароля 6 символов');
        }

        const verification = EmailRestore.verifyRecoveryCode(player, normalizedEmail, normalizedCode);
        if (!verification.ok) {
            return authStatusLabel(player, verification.reason);
        }

        global.DB.query('SELECT * FROM accounts WHERE LOWER(email) = ? LIMIT 1', [normalizedEmail], function (err, results) {
            if (err) {
                logAuthDbErr('recovery_select', err);
                return authStatusLabel(player, AUTH_SERVER_ERROR);
            }
            if (results.length == 0) {
                return authStatusLabel(player, 'Аккаунт с такой почтой не найден');
            }

            const accountLogin = player._recoveryVerification && player._recoveryVerification.login
                ? player._recoveryVerification.login
                : results[0].login;

            bcrypt.hash(password, 10, function(hashErr, passwordHash) {
                if (hashErr) {
                    logAuthDbErr('recovery_hash', hashErr);
                    return authStatusLabel(player, AUTH_SERVER_ERROR);
                }

                global.DB.query('UPDATE accounts SET password = ? WHERE login = ? LIMIT 1', [passwordHash, accountLogin], function(updateErr) {
                    if (updateErr) {
                        logAuthDbErr('recovery_update', updateErr);
                        return authStatusLabel(player, AUTH_SERVER_ERROR);
                    }

                    EmailRestore.clearRecoveryCode(player);
                    player.call('recoverySuccess', [accountLogin]);
                });
            });
        });
    } catch (error) {
        console.log(error);
    }
});

/* =====================================================================
 *  Сохранение избранных анимаций.
 *  Источник истины — accounts.anim_favorites в БД.
 *  В памяти на player хранится последний валидный JSON, чтобы:
 *   - быстро отдавать клиенту по запросу,
 *   - не терять данные при флапе DB (один retry),
 *   - сделать финальный flush на playerQuit, если последний save упал.
 * ===================================================================== */

const ANIM_FAV_MAX_LEN = 200000;
const ANIM_FAV_RETRY_DELAY_MS = 1500;

/** Создать колонку anim_favorites, если её нет (для старых БД). */
function ensureAnimFavoritesColumn() {
    if (!global.DB) {
        setTimeout(ensureAnimFavoritesColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN anim_favorites mediumtext DEFAULT NULL',
        [],
        (err) => {
            if (!err) {
                console.log('[anim_favorites] колонка accounts.anim_favorites создана автоматически.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[anim_favorites] ALTER accounts ADD anim_favorites:', err.code || err.message);
        }
    );
}

function ensureCrosshairJsonColumn() {
    if (!global.DB) {
        setTimeout(ensureCrosshairJsonColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN crosshair_json MEDIUMTEXT NULL DEFAULT NULL',
        [],
        (err) => {
            if (!err) {
                console.log('[crosshair_json] колонка accounts.crosshair_json создана автоматически.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[crosshair_json] ALTER accounts ADD crosshair_json:', err.code || err.message);
        }
    );
}

function ensureCrosshairEnabledColumn() {
    if (!global.DB) {
        setTimeout(ensureCrosshairEnabledColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN crosshair_enabled TINYINT(1) NULL DEFAULT NULL',
        [],
        (err) => {
            if (!err) {
                console.log('[crosshair_enabled] колонка accounts.crosshair_enabled создана автоматически.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[crosshair_enabled] ALTER accounts ADD crosshair_enabled:', err.code || err.message);
        }
    );
}

function hydrateCrosshairSettingsFromAccount(player, row) {
    try {
        if (!mp.players.exists(player) || !row) return;
        const ch = row.crosshair_json;
        if (typeof ch === 'string' && ch.trim().length) {
            player.call('crosshairSettingsHydrate', [ch.trim()]);
        }
        hydrateCrosshairEnabledFromAccount(player, row);
    } catch (_e) {}
}

function hydrateCrosshairEnabledFromAccount(player, row) {
    try {
        if (!mp.players.exists(player) || !row) return;
        let enabled = null;
        if (Object.prototype.hasOwnProperty.call(row, 'crosshair_enabled')) {
            const raw = row.crosshair_enabled;
            if (raw !== null && raw !== undefined && raw !== '') {
                enabled = raw === true || raw === 1 || raw === '1';
            }
        }
        if (enabled === null) {
            const ch = row.crosshair_json;
            if (typeof ch === 'string' && ch.trim().length) enabled = true;
        }
        if (enabled === null) return;
        player.call('crosshairEnabledHydrate', [enabled ? '1' : '0']);
    } catch (_e) {}
}

/* crosshairSettingsSave:s / flush / playerQuit — только в menu.js (дубль ломал pending). */

function ensureRednameColumn() {
    if (!global.DB) {
        setTimeout(ensureRednameColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN redname TINYINT(1) NOT NULL DEFAULT 1',
        [],
        (err) => {
            if (!err) {
                console.log('[redname] колонка accounts.redname создана автоматически.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[redname] ALTER:', err.code || err.message);
        }
    );
}

/** Восстановить /redname из БД после auth (для админов). */
function applyRednameFromAccount(player, row) {
    try {
        if (!player || !mp.players.exists(player)) return;
        const adminLvl = Number(player.getVariable('adminlvl')) || Number(player.adminlvl) || 0;
        if (adminLvl < 1) {
            player.redname = false;
            player.setVariable('redname', false);
            return;
        }
        let on = true;
        if (row && Object.prototype.hasOwnProperty.call(row, 'redname') && row.redname != null) {
            on = Number(row.redname) !== 0;
        } else if (player.redname === false || player.redname === 0) {
            on = false;
        }
        player.redname = on;
        player.setVariable('redname', on);
    } catch (_e) {
        try {
            player.setVariable('redname', true);
            player.redname = true;
        } catch (_e2) {}
    }
}

function saveRednameToAccount(player, enabled) {
    try {
        if (!player || !mp.players.exists(player) || !player.login || !global.DB) return;
        const on = enabled === true || enabled === 1 || enabled === '1';
        player.redname = on;
        player.setVariable('redname', on);
        global.DB.query(
            'UPDATE accounts SET redname = ? WHERE login = ? LIMIT 1',
            [on ? 1 : 0, String(player.login)],
            (err) => {
                if (err) console.log('[redname] UPDATE:', err.code || err.message);
            }
        );
    } catch (_e) {}
}

global.applyRednameFromAccount = applyRednameFromAccount;
global.saveRednameToAccount = saveRednameToAccount;

mp.events.add('packagesLoaded', () => {
    setTimeout(ensureAnimFavoritesColumn, 4000);
    setTimeout(ensureCrosshairJsonColumn, 4200);
    setTimeout(ensureCrosshairEnabledColumn, 4250);
    setTimeout(ensureArmorCosmeticUnlocksColumn, 500);
    setTimeout(ensureRednameColumn, 4800);
});

/** Нормализуем входной JSON: должен быть массивом валидных объектов анимаций. */
function normalizeAnimFavoritesJson(jsonStr) {
    let s =
        typeof jsonStr === 'string'
            ? jsonStr
            : jsonStr != null
              ? JSON.stringify(jsonStr)
              : '[]';
    if (s.length === 0) s = '[]';
    if (s.length > ANIM_FAV_MAX_LEN) return null;
    let parsed;
    try {
        parsed = JSON.parse(s);
    } catch (_e) {
        return null;
    }
    if (!Array.isArray(parsed)) return null;
    /* Чистим мусор, оставляем только реальные анимации */
    const clean = [];
    for (let i = 0; i < parsed.length; i++) {
        const a = parsed[i];
        if (!a || typeof a !== 'object') continue;
        const dict = typeof a.animDictionary === 'string' ? a.animDictionary.trim() : '';
        const name = typeof a.animationName === 'string' ? a.animationName.trim() : '';
        if (!dict || !name) continue;
        const flag = Number.isFinite(Number(a.flag)) ? Number(a.flag) : 49;
        const animName = typeof a.animName === 'string' && a.animName.length ? a.animName : name;
        clean.push({ animName, animDictionary: dict, animationName: name, flag });
    }
    /* Дедупликация (на всякий случай) */
    const seen = Object.create(null);
    const dedup = [];
    for (let i = 0; i < clean.length; i++) {
        const a = clean[i];
        const key = a.animDictionary + '\x00' + a.animationName + '\x00' + a.flag;
        if (seen[key]) continue;
        seen[key] = true;
        dedup.push(a);
    }
    const out = JSON.stringify(dedup);
    if (out.length > ANIM_FAV_MAX_LEN) return null;
    return out;
}

function getAnimFavStaticId(player) {
    let staticId = player.static;
    if (staticId == null || staticId === undefined) staticId = player.getVariable('static');
    if (staticId == null || staticId === undefined) return null;
    staticId = Number(staticId);
    if (!Number.isFinite(staticId)) return null;
    return staticId;
}

function coerceAnimFavJsonInput(raw) {
    if (raw == null) return '[]';
    let s = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (!s.length) return '[]';
    try {
        if (/%[0-9A-Fa-f]{2}/.test(s) && (s.charAt(0) === '%' || s.indexOf('%22') >= 0)) {
            s = decodeURIComponent(s);
        }
    } catch (_e) {}
    return s;
}

function writeAnimFavoritesToDb(staticId, payload, attempt, onDone) {
    if (!global.DB) {
        console.log('[anim_favorites] DB недоступна; save отложен');
        if (typeof onDone === 'function') onDone(new Error('no-db'));
        return;
    }
    global.DB.query(
        'UPDATE accounts SET anim_favorites = ? WHERE static = ? LIMIT 1',
        [payload, staticId],
        (err, result) => {
            if (err) {
                const code = err.code || '';
                const transient = code === 'PROTOCOL_CONNECTION_LOST' || code === 'ECONNRESET' || code === 'ETIMEDOUT';
                if (transient && attempt < 2) {
                    console.log('[anim_favorites] transient DB error, retry:', code);
                    return setTimeout(
                        () => writeAnimFavoritesToDb(staticId, payload, attempt + 1, onDone),
                        ANIM_FAV_RETRY_DELAY_MS
                    );
                }
                console.log('[anim_favorites] UPDATE failed (static=' + staticId + '):', code || err.message || err);
                if (typeof onDone === 'function') onDone(err);
                return;
            }
            const aff = result && Number(result.affectedRows);
            if (!aff) {
                console.log('[anim_favorites] UPDATE: 0 affected rows для static=' + staticId);
            } else {
                console.log('[anim_favorites] UPDATE OK static=' + staticId + ' affected=' + aff);
            }
            if (typeof onDone === 'function') onDone(null);
        }
    );
}

function saveAnimFavoritesToDb(player, jsonStr) {
    try {
        if (!mp.players.exists(player)) return;
        if (!player.getVariable('auth')) {
            console.log('[anim_favorites] save skipped: not auth');
            return;
        }

        const staticId = getAnimFavStaticId(player);
        if (staticId === null) {
            console.log('[anim_favorites] save skipped: no static');
            return;
        }

        const normalized = normalizeAnimFavoritesJson(coerceAnimFavJsonInput(jsonStr));
        if (normalized === null) {
            console.log('[anim_favorites] save skipped: invalid json static=' + staticId + ' raw=' + String(jsonStr).slice(0, 120));
            return;
        }

        console.log('[anim_favorites] save static=' + staticId + ' len=' + normalized.length + ' items=' + (JSON.parse(normalized).length || 0));

        try {
            player.anim_favorites = normalized;
            player._animFavDirty = true;
        } catch (_e) {}

        writeAnimFavoritesToDb(staticId, normalized, 0, (err) => {
            if (!mp.players.exists(player)) return;
            if (!err) {
                try {
                    player._animFavDirty = false;
                    player.anim_favorites = normalized;
                } catch (_e) {}
                console.log('[anim_favorites] saved OK static=' + staticId);
                player.call('anim:favorites:hydrate', [normalized]);
                return;
            }
            console.log('[anim_favorites] save failed for static=' + staticId);
        });
    } catch (e) {
        console.log('[anim_favorites] save exception:', e);
    }
}

mp.events.add('animFavoritesSave', saveAnimFavoritesToDb);
mp.events.add('anim:favorites:save:s', saveAnimFavoritesToDb);

/** Клиент просит свежие данные (открыл меню или гидрация ушла раньше браузера). */
mp.events.add('anim:favorites:request:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        const pushHydrate = (payload) => {
            if (!mp.players.exists(player)) return;
            try {
                player.anim_favorites = payload;
            } catch (_e) {}
            player.call('anim:favorites:hydrate', [payload]);
        };

        const cached = typeof player.anim_favorites === 'string' ? player.anim_favorites : null;
        if (cached !== null) {
            pushHydrate(cached);
            return;
        }
        if (!global.DB) {
            pushHydrate('[]');
            return;
        }
        const staticId = getAnimFavStaticId(player);
        if (staticId === null) {
            pushHydrate('[]');
            return;
        }
        global.DB.query(
            'SELECT anim_favorites FROM accounts WHERE static = ? LIMIT 1',
            [staticId],
            (err, rows) => {
                if (!mp.players.exists(player)) return;
                if (err || !rows || !rows.length) {
                    pushHydrate('[]');
                    return;
                }
                const af = rows[0].anim_favorites;
                const payload =
                    typeof af === 'string' && af.trim().length > 0 ? af : '[]';
                pushHydrate(payload);
            }
        );
    } catch (_e) {}
});

/** Координаты welcome/лобби авторизации — не подходят для «Выход». */
global.isAuthLobbySpawnCoords = function isAuthLobbySpawnCoords(x, y, z) {
    const nx = Number(x);
    const ny = Number(y);
    const nz = Number(z);
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) return false;
    const dx = nx - AUTH_LOBBY_BASE.x;
    const dy = ny - AUTH_LOBBY_BASE.y;
    const dz = nz - AUTH_LOBBY_BASE.z;
    return Math.hypot(dx, dy) < 55 && Math.abs(dz) < 25;
};

const PERIODIC_PLAYER_FLUSH_MS = 5000;
const ONLINE_MINUTE_MS = 60000;

function playerEligibleForPeriodicFlush(player) {
    return !!(player && mp.players.exists(player) && player.getVariable('auth') && player.static);
}

function playerLastPositionForFlush(player) {
    if (!playerEligibleForPeriodicFlush(player)) return null;
    if (player.getVariable('jail') === true) return null;
    if (player.getVariable('inCapt') === true || player.getVariable('inBizwar') === true) return null;
    if (player.getVariable('gangwar') !== true) return null;
    if (player._spawnSelectActive === true) return null;
    if ((player.dimension || 0) !== 0) return null;
    const pos = player.position;
    if (!pos) return null;
    if (typeof global.isAuthLobbySpawnCoords === 'function' && global.isAuthLobbySpawnCoords(pos.x, pos.y, pos.z)) {
        return null;
    }
    player._lastSafePos = { x: pos.x, y: pos.y, z: pos.z };
    return player._lastSafePos;
}

function serializeFastSlotsForPeriodicDb(player) {
    if (!Array.isArray(player.fastSlots)) return '["", "", ""]';
    return JSON.stringify(player.fastSlots);
}

function consumeOnlineMinuteCredit(player) {
    if (!player.getVariable('authtwo')) return 0;
    player._onlineAccumMs = (player._onlineAccumMs || 0) + PERIODIC_PLAYER_FLUSH_MS;
    let add = 0;
    while (player._onlineAccumMs >= ONLINE_MINUTE_MS) {
        player._onlineAccumMs -= ONLINE_MINUTE_MS;
        add += 1;
    }
    if (add > 0) {
        player.onlineHours = (parseInt(player.onlineHours, 10) || 0) + add;
        const cdMax = global.LUCKY_WHEEL_CD_MINUTES || 300;
        const curCas = parseInt(player.casetime, 10) || 0;
        if (curCas < cdMax) {
            player.casetime = Math.min(cdMax, curCas + add);
            if (typeof global.pushLuckyWheelHud === 'function') {
                global.pushLuckyWheelHud(player, player.casetime);
            }
        }
    }
    return add;
}

/** Один UPDATE: локация + быстрые слоты (патроны/оружие) + онлайн. */
global.flushPlayerPeriodicState = function (player) {
    try {
        if (!playerEligibleForPeriodicFlush(player)) return;
        const pos = playerLastPositionForFlush(player);
        const fastJson = serializeFastSlotsForPeriodicDb(player);
        const onlineAdd = consumeOnlineMinuteCredit(player);

        const casetime = parseInt(player.casetime, 10) || 0;

        if (pos) {
            global.DB.query(
                'UPDATE accounts SET last_x=?, last_y=?, last_z=?, last_pos_dim=0, fast=?, online=online+?, casetime=? WHERE static=?',
                [pos.x, pos.y, pos.z, fastJson, onlineAdd, casetime, player.static],
                (err) => { if (err) console.log('[ACCOUNTS] periodic flush:', err.message || err); }
            );
            return;
        }

        global.DB.query(
            'UPDATE accounts SET fast=?, online=online+?, casetime=? WHERE static=?',
            [fastJson, onlineAdd, casetime, player.static],
            (err) => { if (err) console.log('[ACCOUNTS] periodic flush:', err.message || err); }
        );
    } catch (_e) {}
};

global.savePlayerLastPosition = function (player, forceQuit) {
    try {
        let pos = null;
        if (forceQuit === true) {
            pos = player && player._lastSafePos ? player._lastSafePos : null;
        } else {
            pos = playerLastPositionForFlush(player);
        }
        if (!pos || !player || !player.static) return;
        global.DB.query(
            'UPDATE accounts SET last_x=?, last_y=?, last_z=?, last_pos_dim=0 WHERE static=?',
            [pos.x, pos.y, pos.z, player.static],
            (err) => { if (err) console.log('[ACCOUNTS] save lastpos:', err.message || err); }
        );
    } catch (_e) {}
};

mp.events.add('player:fastClip:s', (player, slotRaw, clipRaw) => {
    try {
        if (!playerEligibleForPeriodicFlush(player)) return;
        if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
        const slot = parseInt(slotRaw, 10);
        if (slot < 0 || slot > 2) return;
        const item = player.fastSlots[slot];
        if (!item) return;
        const base = String(item).split('(')[0].trim();
        if (!base.toLowerCase().startsWith('weapon_')) return;
        const clip = Math.max(0, parseInt(clipRaw, 10) || 0);
        if (clip === 0 && player._weaponEquipGraceUntil && Date.now() < player._weaponEquipGraceUntil) return;
        const next = clip > 0 ? `${base} (${clip})` : base;
        if (player.fastSlots[slot] !== next) player.fastSlots[slot] = next;
    } catch (_e) {}
});

/** Перед системным рестартом — синхронный flush позиций всех игроков в dim 0. */
global.flushAllPlayerLastPositions = function (done) {
    try {
        const players = mp.players.toArray().filter((p) => {
            if (!p || !mp.players.exists(p)) return false;
            if (!p.getVariable('auth') || !p.static) return false;
            if (p.getVariable('jail') === true) return false;
            if (p.getVariable('inCapt') === true || p.getVariable('inBizwar') === true) return false;
            return (p.dimension || 0) === 0;
        });
        if (!players.length) {
            if (typeof done === 'function') done();
            return;
        }
        let left = players.length;
        const finish = () => {
            left -= 1;
            if (left <= 0 && typeof done === 'function') done();
        };
        players.forEach((player) => {
            const pos = player.position;
            if (!pos) {
                finish();
                return;
            }
            global.DB.query(
                'UPDATE accounts SET last_x=?, last_y=?, last_z=?, last_pos_dim=0 WHERE static=?',
                [pos.x, pos.y, pos.z, player.static],
                (err) => {
                    if (err) console.log('[ACCOUNTS] flush lastpos:', err.message || err);
                    finish();
                }
            );
        });
    } catch (_e) {
        if (typeof done === 'function') done();
    }
};

setInterval(() => {
    try {
        mp.players.forEach((player) => {
            if (typeof global.flushPlayerPeriodicState === 'function') global.flushPlayerPeriodicState(player);
        });
    } catch (_e) {}
}, PERIODIC_PLAYER_FLUSH_MS);

/** Перед киком (бан и т.д.) — сохранить инвентарь/одежду, чтобы playerQuit не затёр пустым состоянием. */
global.flushPlayerStateBeforeKick = function (player) {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (typeof global.persistPlayerClothesRow === 'function') {
            global.persistPlayerClothesRow(player, () => {});
        }
        if (typeof global.flushPlayerPeriodicState === 'function') {
            global.flushPlayerPeriodicState(player);
        }
        if (typeof global.saveInventory === 'function') {
            global.saveInventory(player, { force: true });
        }
    } catch (_e) {}
};

global.kickPlayerSafe = function (player, reason) {
    try {
        if (!player || !mp.players.exists(player)) return;
        global.flushPlayerStateBeforeKick(player);
        player.kick(reason);
    } catch (_e) {}
};

/** На выходе игрока — финальный flush, если последний save не успел/упал. */
mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        if (typeof global.savePlayerLastPosition === 'function') global.savePlayerLastPosition(player, true);
        if (typeof global.saveInventory === 'function') {
            global.saveInventory(player, { force: true });
        }
        // Финальный flush избранных анимаций.
        // Сохраняем не только при _animFavDirty=true, но и просто если в памяти
        // есть валидный JSON — это страхует от случаев, когда DB.query на save
        // улетел в callback, но сервер уже "забыл" про игрока.
        const staticId = getAnimFavStaticId(player);
        if (staticId === null) return;
        const payload = typeof player.anim_favorites === 'string' ? player.anim_favorites : null;
        if (!payload) return;
        if (!player._animFavDirty) {
            // Дополнительно дерним flush: cheap insurance.
            writeAnimFavoritesToDb(staticId, payload, 0, null);
            return;
        }
        writeAnimFavoritesToDb(staticId, payload, 0, null);
    } catch (_e) {}
});

global.saveAnimFavoritesToDb = saveAnimFavoritesToDb;

function menuAccountFractionLabel(player) {
    let fr = player.getVariable('fraction');
    if (fr == null || fr === '') {
        fr = player.fraction != null ? player.fraction : 0;
    }
    let n = parseInt(fr, 10);
    if (isNaN(n) || n < 0) n = 0;
    if (n > 6) n = 6;
    if (n === 6) return 'FIB';
    const names = [
        'Нет фракции',
        'Ballas Gang',
        'The Families',
        'Bloods Gang',
        'LS Vagos',
        'Marabunta'
    ];
    return names[n] || '—';
}

function parseVipDate(raw) {
    if (!raw) return null;
    if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
}

function buildVipFieldsFromLevel(viplvl, vipdateRaw) {
    const lvl = parseInt(String(viplvl || '0'), 10) || 0;
    let vipLine = 'Нет VIP';
    let vipName = 'Нет VIP';
    let vipUntil = '—';
    if (lvl > 0) {
        let tierName = 'VIP';
        if (lvl === 1) tierName = 'STANDARD VIP';
        else if (lvl === 2) tierName = 'GOLD VIP';
        else if (lvl === 3) tierName = 'PLATINUM VIP';
        else tierName = 'VIP (ур. ' + lvl + ')';
        vipName = tierName;
        const vd = parseVipDate(vipdateRaw);
        if (vd) {
            const now = Date.now();
            const end = vd.getTime();
            if (end > now) {
                const ms = end - now;
                const days = Math.floor(ms / 86400000);
                if (days >= 1) {
                    vipLine = tierName + ' · Действует ' + days + ' ' + (function (n) {
                        var w = n % 10, w2 = n % 100, word = 'дней';
                        if (w2 < 11 || w2 > 14) {
                            if (w === 1) word = 'день';
                            else if (w >= 2 && w <= 4) word = 'дня';
                        }
                        return word;
                    })(days);
                } else {
                    const hrs = Math.max(1, Math.ceil(ms / 3600000));
                    vipLine = tierName + ' · Действует ' + hrs + ' ' + (function (n) {
                        var w = n % 10, w2 = n % 100, word = 'часов';
                        if (w2 < 11 || w2 > 14) {
                            if (w === 1) word = 'час';
                            else if (w >= 2 && w <= 4) word = 'часа';
                        }
                        return word;
                    })(hrs);
                }
                vipUntil = vd.toLocaleDateString('ru-RU');
            } else {
                vipLine = tierName + ' · истёк';
                vipUntil = vd.toLocaleDateString('ru-RU');
            }
        } else {
            vipLine = tierName;
        }
    }
    return { vipLine, vip: { name: vipName, until: vipUntil, tier: lvl } };
}

function buildMenuAccountProfilePayload(player) {
    const login = String(player.login || '');
    const staticVar = player.getVariable('static');
    let staticId = player.static != null ? Number(player.static) : 0;
    if (!staticId && staticVar != null) staticId = Number(staticVar) || 0;
    const vipFields = buildVipFieldsFromLevel(player.viplvl, player.vipdate);
    let vipLine = vipFields.vipLine;
    let vipName = vipFields.vip.name;
    let vipUntil = vipFields.vip.until;
    const viplvl = vipFields.vip.tier;
    let family = player.family;
    let familyRank = player.famRank != null ? String(player.famRank) : '—';
    if (family == null || String(family).trim() === '') {
        family = null;
    } else {
        family = String(family);
    }
    const fractionName = menuAccountFractionLabel(player);
    const fractionRank = player.fraction_rank != null && String(player.fraction_rank).trim() !== ''
        ? String(player.fraction_rank)
        : '—';
    const bank = parseInt(String(player.money || '0').replace(/\s/g, ''), 10) || 0;
    const dp = parseInt(String(player.dp || '0').replace(/\s/g, ''), 10) || 0;
    const adminlvl = parseInt(String(player.adminlvl || '0'), 10) || 0;
    const _adminTrueLvlVar = player.getVariable('adminTrueLvl');
    const adminTrueLvl = (_adminTrueLvlVar != null ? parseInt(String(_adminTrueLvlVar), 10) : null) || adminlvl;
    const kills = parseInt(String(player.kills || '0'), 10) || 0;
    const deaths = parseInt(String(player.deaths || '0'), 10) || 0;
    const onlineMinutes = parseInt(String(player.onlineHours != null ? player.onlineHours : player.online || '0'), 10) || 0;
    const hours = Math.floor(onlineMinutes / 60);
    let charLevel = 1;
    let charExp = 0;
    let charExpMax = 4;
    try {
        if (typeof global.pmNormalizeCharProgress === 'function') {
            const char = global.pmNormalizeCharProgress(player.charlevel, player.charexp);
            charLevel = char.level;
            charExp = char.exp;
        } else {
            charLevel = Math.max(1, parseInt(player.charlevel, 10) || 1);
            charExp = Math.max(0, parseInt(player.charexp, 10) || 0);
        }
        charExpMax = typeof global.pmExpNeededForLevel === 'function'
            ? global.pmExpNeededForLevel(charLevel)
            : charLevel * 4;
    } catch (_eChar) {}
    let skills = null;
    try {
        if (typeof global.pmBuildShootingSkillFromKills === 'function') {
            const shoot = global.pmBuildShootingSkillFromKills(kills);
            let port = [1, 0, 100, 10];
            try {
                if (typeof global.buildPortSkillForMenu === 'function') {
                    port = global.buildPortSkillForMenu(player);
                }
            } catch (_ePort) {}
            skills = [[0, 0, 100, 10], shoot, port, [0, 0, 100, 10], [0, 0, 100, 10]];
        }
    } catch (_eSk) {}
    return {
        login,
        static: staticId,
        avatar: '',
        bank,
        dp,
        adminlvl,
        adminTrueLvl,
        vipLine,
        vip: { name: vipName, until: vipUntil, tier: viplvl },
        fraction: { name: fractionName, rank: fractionRank },
        family: family ? { name: family, rank: familyRank } : null,
        stats: { kills, deaths, hours, minutes: onlineMinutes },
        level: charLevel,
        exp: charExp,
        expMax: charExpMax,
        charlevel: charLevel,
        charexp: charExp,
        skills,
        skill_level: skills && skills[1] ? skills[1][0] : 1,
        skill_points: skills && skills[1] ? skills[1][1] : 0,
        skill_per_level: 100,
        skill_max_level: 10
    };
}

function pushMenuAccountProfile(player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const base = buildMenuAccountProfilePayload(player);
        const finish = (p) => {
            try {
                player.call('setMenuAccountProfile', [JSON.stringify(p)]);
            } catch (_e2) {}
        };
        finish(base);
        if (!global.DB) {
            return;
        }
        const useStatic = base.static > 0;
        const sql = useStatic
            ? 'SELECT static, login, adminlvl, viplvl, vipdate, kills, deaths, online, family, famRank, fraction, fraction_rank, dp, money FROM accounts WHERE static = ? LIMIT 1'
            : 'SELECT static, login, adminlvl, viplvl, vipdate, kills, deaths, online, family, famRank, fraction, fraction_rank, dp, money FROM accounts WHERE login = ? LIMIT 1';
        const param = useStatic ? base.static : base.login;
        if (!param) {
            finish(base);
            return;
        }
        global.DB.query(sql, [param], (err, rows) => {
            const p = Object.assign({}, base);
            if (!err && rows && rows.length) {
                const row = rows[0];
                const dbStatic = parseInt(String(row.static || '0'), 10) || 0;
                if (dbStatic > 0) {
                    p.static = dbStatic;
                    player.static = dbStatic;
                    try { player.setVariable('static', dbStatic); } catch (_eSt) {}
                    if (typeof global.syncPlayerMpIdVar === 'function') global.syncPlayerMpIdVar(player);
                }
                const dbAdmin = parseInt(String(row.adminlvl || '0'), 10) || 0;
                p.adminTrueLvl = dbAdmin;
                p.adminlvl = dbAdmin;
                player.adminlvl = dbAdmin;
                player.adminTrueLvl = dbAdmin;
                try { player.setVariable('adminTrueLvl', dbAdmin); } catch (_eAd) {}
                if (typeof global.syncAdminSessionClient === 'function') {
                    try { global.syncAdminSessionClient(player); } catch (_eSyncAd) {}
                }
                const dbVip = parseInt(String(row.viplvl || '0'), 10) || 0;
                const vipFromDb = buildVipFieldsFromLevel(dbVip, row.vipdate);
                p.vipLine = vipFromDb.vipLine;
                p.vip = vipFromDb.vip;
                player.viplvl = dbVip;
                player.vipdate = parseVipDate(row.vipdate);
                try { player.setVariable('viplvl', dbVip); } catch (_eVip) {}
                if (row.login) {
                    p.login = String(row.login);
                    player.login = p.login;
                }
                const dbKills = parseInt(String(row.kills || '0'), 10) || 0;
                const dbDeaths = parseInt(String(row.deaths || '0'), 10) || 0;
                const dbOnline = parseInt(String(row.online || '0'), 10) || 0;
                p.stats = { kills: dbKills, deaths: dbDeaths, hours: Math.floor(dbOnline / 60), minutes: dbOnline };
                player.kills = dbKills;
                player.deaths = dbDeaths;
                player.onlineHours = dbOnline;
                const dbDp = parseInt(String(row.dp || '0').replace(/\D/g, ''), 10) || 0;
                const dbMoney = parseInt(String(row.money || '0').replace(/\D/g, ''), 10) || 0;
                p.dp = dbDp;
                p.bank = dbMoney;
                player.dp = dbDp;
                player.money = dbMoney;
                const dbFraction = parseInt(String(row.fraction != null ? row.fraction : 0), 10) || 0;
                player.fraction = dbFraction;
                try { player.setVariable('fraction', dbFraction); } catch (_eFr) {}
                const fractionRank = row.fraction_rank != null && String(row.fraction_rank).trim() !== ''
                    ? String(row.fraction_rank)
                    : '—';
                player.fraction_rank = fractionRank;
                p.fraction = {
                    name: menuAccountFractionLabel(player),
                    rank: fractionRank
                };
                const dbFamily = row.family != null && String(row.family).trim() !== '' ? String(row.family) : null;
                player.family = dbFamily;
                const dbFamRank = dbFamily && row.famRank != null ? String(row.famRank) : '—';
                player.famRank = dbFamily ? row.famRank : null;
                p.family = dbFamily ? { name: dbFamily, rank: dbFamRank } : null;
            }
            finish(p);
        });
    } catch (_e) {}
}

mp.events.add('menuAccountProfile:s', (player) => {
    pushMenuAccountProfile(player);
    setTimeout(() => {
        try {
            if (mp.players.exists(player) && player.getVariable && player.getVariable('auth')) {
                pushMenuAccountProfile(player);
            }
        } catch (_eRet) {}
    }, 1200);
});

global.pushMenuAccountProfile = pushMenuAccountProfile;
