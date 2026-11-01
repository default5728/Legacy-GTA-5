/**
 * Life5rp PlayerMenu — серверные RPC и события для Moon DM.
 */
const rpc = require('./rage-rpc.min.js');
global.rpc = global.rpc || rpc;

const { RUB_TO_DP, DONATE_BONUS } = require('./config/donate_config.js');

const DONATE_PRICE = RUB_TO_DP;

function pmPlayer(player) {
    return mp.players.exists(player) ? player : null;
}

function pmAuth(player) {
    return pmPlayer(player) && player.getVariable('auth') === true && player.getVariable('jail') !== true;
}

function pmNotify(player, type, text, ms) {
    if (typeof isNotify === 'function') isNotify(player, type, 'top-mid', String(text || ''), ms || 3000);
}

function pmVipSecondsLeft(player) {
    try {
        const vd = player.vipdate;
        if (!vd || !player.viplvl) return 0;
        const end = vd instanceof Date ? vd.getTime() : new Date(vd).getTime();
        const diff = Math.floor((end - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
    } catch (_e) {
        return 0;
    }
}

function pmHasActiveVip(player) {
    const viplvl = parseInt(String(player.viplvl || '0'), 10) || 0;
    return viplvl > 0 && pmVipSecondsLeft(player) > 0;
}

function pmGetKillSkillGain(player) {
    return pmHasActiveVip(player) ? 2 : 1;
}

function pmExpNeededForLevel(level) {
    return Math.max(1, parseInt(level, 10) || 1) * 4;
}

function pmNormalizeCharProgress(level, exp) {
    let lv = Math.max(1, parseInt(level, 10) || 1);
    let xp = Math.max(0, parseInt(exp, 10) || 0);
    while (xp >= pmExpNeededForLevel(lv)) {
        xp -= pmExpNeededForLevel(lv);
        lv += 1;
    }
    return { level: lv, exp: xp };
}

function pmGetCharLevel(player) {
    return pmNormalizeCharProgress(player.charlevel, player.charexp);
}

function pmSaveCharLevel(player, level, exp) {
    if (!mp.players.exists(player)) return;
    const norm = pmNormalizeCharProgress(level, exp);
    player.charlevel = norm.level;
    player.charexp = norm.exp;
    if (!global.DB || !player.static) return;
    global.DB.query(
        'UPDATE accounts SET charlevel = ?, charexp = ? WHERE static = ?',
        [norm.level, norm.exp, player.static],
        () => {}
    );
}

function pmHydrateCharLevel(player, row) {
    const norm = pmNormalizeCharProgress(row && row.charlevel, row && row.charexp);
    player.charlevel = norm.level;
    player.charexp = norm.exp;
}

function pmAddCharExp(player, amount, options) {
    const add = Math.max(0, parseInt(amount, 10) || 0);
    if (!add || !mp.players.exists(player) || !player.getVariable('auth')) {
        return { gained: 0, leveled: false, level: 1, exp: 0 };
    }
    const cur = pmGetCharLevel(player);
    const prevLevel = cur.level;
    const next = pmNormalizeCharProgress(cur.level, cur.exp + add);
    pmSaveCharLevel(player, next.level, next.exp);
    const leveled = next.level > prevLevel;
    const silent = !!(options && options.silent);
    if (leveled && !silent) {
        player.outputChatBox(`!{#FF922B}[Уровень] !{#FFFFFF}Новый уровень персонажа: !{#30A8FF}${next.level}!{#FFFFFF}!`);
    }
    try {
        player.call('client.playermenu.setData', [JSON.stringify(buildOpenArray(player, 0))]);
    } catch (_e) {}
    return { gained: add, leveled, level: next.level, exp: next.exp };
}

function pmAddPaydayCharExp(player) {
    const gain = pmHasActiveVip(player) ? 2 : 1;
    const result = pmAddCharExp(player, gain, { silent: true });
    player.outputChatBox(`!{#ffa600}[PayDay] !{#00a2ff}+${gain} EXP !{#FFFFFF}(${result.exp}/${pmExpNeededForLevel(result.level)})`);
    if (result.leveled) {
        player.outputChatBox(`!{#FF922B}[Уровень] !{#FFFFFF}Новый уровень персонажа: !{#30A8FF}${result.level}!{#FFFFFF}!`);
    }
    return result;
}

global.pmSyncCharProgress = function (player) {
    if (mp.players.exists(player)) player.call('client.playermenu.setData', [JSON.stringify(buildOpenArray(player, 0))]);
};
global.pmNormalizeCharProgress = pmNormalizeCharProgress;
global.pmHydrateCharLevel = pmHydrateCharLevel;
global.pmAddCharExp = pmAddCharExp;
global.pmAddPaydayCharExp = pmAddPaydayCharExp;
global.pmHasActiveVip = pmHasActiveVip;
global.pmGetKillSkillGain = pmGetKillSkillGain;
global.pmExpNeededForLevel = pmExpNeededForLevel;
global.pmBuildShootingSkillFromKills = buildShootingSkillFromKills;

function ensureCharLevelColumns() {
    if (!global.DB) return;
    global.DB.query("SHOW COLUMNS FROM accounts LIKE 'charlevel'", (err, rows) => {
        if (err) return;
        if (!rows || !rows.length) {
            global.DB.query('ALTER TABLE accounts ADD COLUMN charlevel INT NOT NULL DEFAULT 1', () => {});
        }
    });
    global.DB.query("SHOW COLUMNS FROM accounts LIKE 'charexp'", (err, rows) => {
        if (err) return;
        if (!rows || !rows.length) {
            global.DB.query('ALTER TABLE accounts ADD COLUMN charexp INT NOT NULL DEFAULT 0', () => {});
        }
    });
}

mp.events.add('packagesLoaded', ensureCharLevelColumns);

function buildShootingSkillFromKills(kills) {
    const k = Math.max(0, parseInt(kills, 10) || 0);
    const maxLevel = 10;
    const progressMax = 100;
    const level = Math.min(maxLevel, Math.floor(k / progressMax) + 1);
    const progress = k % progressMax;
    return [level, progress, progressMax, maxLevel];
}

const SHOOTING_KILL_BONUS_PER_LEVEL = 250;

function getShootingKillMoneyBonus(kills) {
    const level = buildShootingSkillFromKills(kills)[0];
    return Math.max(0, (parseInt(level, 10) || 1) - 1) * SHOOTING_KILL_BONUS_PER_LEVEL;
}

function applyShootingSkillKillBonus(baseAmount, kills) {
    return (parseInt(baseAmount, 10) || 0) + getShootingKillMoneyBonus(kills);
}

global.getShootingKillMoneyBonus = getShootingKillMoneyBonus;
global.applyShootingSkillKillBonus = applyShootingSkillKillBonus;

function notifyShootingSkillOnKill(killer, newKills, gain) {
    if (!killer || !mp.players.exists(killer)) return;
    const add = Math.max(1, parseInt(gain, 10) || 1);
    const k = Math.max(0, parseInt(newKills, 10) || 0);
    const prevK = Math.max(0, k - add);
    const maxLevel = 10;
    const progressMax = 100;
    const newLevel = Math.min(maxLevel, Math.floor(k / progressMax) + 1);
    const prevLevel = Math.min(maxLevel, Math.floor(prevK / progressMax) + 1);
    const progress = k % progressMax;

    if (newLevel > prevLevel) {
        const bonus = Math.max(0, newLevel - 1) * SHOOTING_KILL_BONUS_PER_LEVEL;
        killer.outputChatBox(
            `!{#FF922B}[Навык] !{#FFFFFF}Стрельба: новый уровень !{#30A8FF}${newLevel}!{#FFFFFF}. Теперь !{#30A8FF}+${bonus}$!{#FFFFFF} к убийству.`
        );
    } else {
        killer.outputChatBox(`!{#FF922B}[Навык] !{#FFFFFF}Стрельба !{#30A8FF}+${add} !{#FFFFFF}(${progress}/${progressMax})`);
    }

    try {
        killer.call('client.playermenu.setData', [JSON.stringify(buildOpenArray(killer, 0))]);
    } catch (_e) {}
}

global.notifyShootingSkillOnKill = notifyShootingSkillOnKill;

function buildSkillsForMenu(player) {
    const kills = player && typeof player === 'object'
        ? parseInt(String(player.kills || '0'), 10) || 0
        : parseInt(player, 10) || 0;
    const shoot = buildShootingSkillFromKills(kills);
    let port = [1, 0, 100, 10];
    let construction = [1, 0, 100, 10];
    try {
        if (typeof global.buildPortSkillForMenu === 'function' && player && typeof player === 'object') {
            port = global.buildPortSkillForMenu(player);
        }
    } catch (_ePort) {}
    try {
        if (typeof global.buildConstructionSkillForMenu === 'function' && player && typeof player === 'object') {
            construction = global.buildConstructionSkillForMenu(player);
        }
    } catch (_eCon) {}
    return [
        [0, 0, 100, 10],
        shoot,
        port,
        construction,
        [0, 0, 100, 10]
    ];
}

global.pmRefreshMenuData = function (player) {
    try {
        if (!player || !mp.players.exists(player)) return;
        player.call('client.playermenu.setData', [JSON.stringify(buildOpenArray(player, 0))]);
    } catch (_e) {}
};

const PM_VEH_SRC_LABEL = {
    dp: 'Donate',
    case: 'Кейс',
    cash: 'Автосалон',
    legacy: 'Гараж',
    admin: 'Гараж',
    bonus: 'Бонус'
};

function buildVehListForMenu(carsNorm) {
    if (!Array.isArray(carsNorm)) return [];
    return carsNorm
        .filter((e) => e && (e.m || e.model))
        .map((e) => {
            const model = String(e.m || e.model || 'Транспорт');
            const src = String(e.s || 'legacy');
            return {
                model,
                class: PM_VEH_SRC_LABEL[src] || 'Гараж',
                price: Number(e.p != null ? e.p : e.price) || 0,
                mileage: Number(e.mileage || 0) || 0
            };
        });
}

function getPlayerCarsNormSync(player) {
    try {
        if (Array.isArray(player.cars) && player.cars.length) {
            return typeof global.normalizeCarsArray === 'function'
                ? global.normalizeCarsArray(player.cars)
                : player.cars;
        }
    } catch (_e) {}
    return null;
}

function buildOpenArray(player, openTab, vehListOpt) {
    const money = parseInt(String(player.money || '0').replace(/\D/g, ''), 10) || 0;
    const dp = parseInt(String(player.dp || '0').replace(/\D/g, ''), 10) || 0;
    const viplvl = parseInt(String(player.viplvl || '0'), 10) || 0;
    const vipSec = pmVipSecondsLeft(player);
    const onlineMin = parseInt(String(player.onlineHours != null ? player.onlineHours : player.online || '0'), 10) || 0;
    const kills = parseInt(String(player.kills || '0'), 10) || 0;
    const char = pmGetCharLevel(player);
    let vehList = Array.isArray(vehListOpt) ? vehListOpt : null;
    if (!vehList) {
        const syncCars = getPlayerCarsNormSync(player);
        vehList = syncCars ? buildVehListForMenu(syncCars) : [];
    }

    return [
        openTab != null ? openTab : 0,
        String(player.login || ''),
        dp,
        0,
        DONATE_PRICE,
        DONATE_BONUS,
        viplvl > 0 && vipSec > 0,
        vipSec,
        viplvl,
        money,
        parseInt(String(player.bank || '0').replace(/\D/g, ''), 10) || 0,
        char.level,
        char.exp,
        100,
        100,
        onlineMin,
        buildSkillsForMenu(player),
        0,
        0,
        [],
        vehList,
        typeof global.buildNewbieQuestListForMenu === 'function'
            ? global.buildNewbieQuestListForMenu(player)
            : [],
        false,
        false,
        String(player.email || '')
    ];
}

function loadPlayerVehList(player, cb) {
    const done = (list) => {
        try { cb(Array.isArray(list) ? list : []); } catch (_e) { try { cb([]); } catch (_e2) {} }
    };
    const syncCars = getPlayerCarsNormSync(player);
    if (syncCars && syncCars.length) return done(buildVehListForMenu(syncCars));
    if (!global.DB || !player.static) return done([]);
    global.DB.query('SELECT cars FROM accounts WHERE static = ? LIMIT 1', [player.static], (err, rows) => {
        let list = [];
        try {
            if (!err && rows && rows[0]) {
                const raw = JSON.parse(rows[0].cars || '[]');
                const norm = typeof global.normalizeCarsArray === 'function'
                    ? global.normalizeCarsArray(raw)
                    : (Array.isArray(raw) ? raw : []);
                try { player.cars = norm; } catch (_eCars) {}
                list = buildVehListForMenu(norm);
            }
        } catch (_eParse) {}
        done(list);
    });
}

function pushMenuOpen(player, openTab) {
    try {
        loadPlayerVehList(player, (vehList) => {
            try {
                if (!mp.players.exists(player)) return;
                const arr = buildOpenArray(player, openTab, vehList);
                player.call('client.playermenu.open', [JSON.stringify(arr)]);
            } catch (_eOpen) {}
        });
    } catch (_e) {}
}

function pushMenuData(player) {
    pushMenuOpen(player, 0);
}

function reportMessagesForMenu(player) {
    const st = player.static;
    const th = global.reportThreads && global.reportThreads[st];
    if (!th || !Array.isArray(th.messages)) return [];
    return th.messages.map((m) => ({
        name: m.role === 'admin' ? `[A] ${m.author || 'Admin'}` : (m.author || player.login || 'Вы'),
        text: String(m.text || ''),
        ts: m.ts || 0,
        isAdmin: m.role === 'admin',
        role: m.role === 'admin' ? 'admin' : 'user'
    }));
}

function rpcGuard(player, fn) {
    if (!pmAuth(player)) throw 'Недоступно';
    return fn();
}

rpc.register('server_player_mainMenu_getAchievemnt', (_args, info) => {
    return rpcGuard(info.player, () => [0, []]);
});

rpc.register('server_player_mainMenu_getGifts', (_args, info) => {
    return rpcGuard(info.player, () => []);
});

rpc.register('server_reportSystem_getMessages', (_args, info) => {
    return rpcGuard(info.player, () => reportMessagesForMenu(info.player));
});

rpc.register('server_reportSystem_sendMessage', (args, info) => {
    const player = info.player;
    return rpcGuard(player, () => {
        const text = Array.isArray(args) ? String(args[0] || '') : String(args || '');
        const trimmed = text.trim();
        if (!trimmed) throw 'Пустое сообщение';
        const minLen = Number(global.REPORT_MIN_TEXT_LENGTH) || 6;
        if (trimmed.length < minLen) throw `Слишком короткое сообщение. Минимум ${minLen} символов.`;
        if (player.getVariable('report') === null) {
            if (typeof global.playerReportCreate === 'function') global.playerReportCreate(player, trimmed);
        } else if (typeof global.playerReportAppendUser === 'function') {
            global.playerReportAppendUser(player, trimmed);
        }
        // create/append могут тихо отклонить (КД, админ <8) — без throw в консоль
        return reportMessagesForMenu(player);
    });
});

rpc.register('server_reportSystem_deleteChat', (_args, info) => {
    const player = info.player;
    return rpcGuard(player, () => {
        if (typeof global.playerReportCloseByPlayer === 'function') global.playerReportCloseByPlayer(player);
        return true;
    });
});

rpc.register('server_player_enterPromo', (args, info) => {
    const player = info.player;
    return rpcGuard(player, () => {
        const code = Array.isArray(args) ? String(args[0] || '') : String(args || '');
        if (!code.trim()) throw 'Введите промокод';
        if (typeof global.activateStandardPromocode === 'function') {
            global.activateStandardPromocode(player, code.toLowerCase());
        } else {
            mp.events.call('activatepromo', player, code);
        }
        return true;
    });
});

rpc.register('server_player_buyDonateFunc', (args, info) => {
    const player = info.player;
    return rpcGuard(player, () => {
        const code = Array.isArray(args) ? String(args[0] || '') : String(args || '');
        if (!code) throw 'Неизвестный товар';
        mp.events.call('playermenu:donateBuy', player, code, '');
        return true;
    });
});

rpc.register('server_player_sellDonate', (_args, info) => {
    throw 'Продажа DP недоступна';
});

rpc.register('server_player_donateGetLink', (_args, info) => {
    return rpcGuard(info.player, () => {
        throw 'Пополнение DP: https://flowdm.fun/donate (Static ID на сайте)';
    });
});

rpc.register('server_bonusShop_buy', (_args, info) => {
    throw 'Бонусный магазин недоступен';
});

rpc.register('server_playerGift_got', (_args, info) => {
    throw 'Нет подарков';
});

rpc.register('server_battlePass_spinAward', (_args, info) => {
    throw 'Battle Pass недоступен';
});

rpc.register('server_battlePass_gotAward', (_args, info) => {
    throw 'Battle Pass недоступен';
});

rpc.register('server_battlePass_sellAward', (_args, info) => {
    throw 'Battle Pass недоступен';
});

rpc.register('server_mediaLottery_get', (_args, info) => {
    return rpcGuard(info.player, () => 0);
});

rpc.register('server_mediaLottery_buy', (_args, info) => {
    throw 'Лотерея недоступна';
});

rpc.register('server_quest_cancel', (_args, info) => {
    const player = info.player;
    return rpcGuard(player, () => {
        const uid = Array.isArray(_args) ? _args[0] : _args;
        if (typeof global.cancelNewbieQuest === 'function') {
            global.cancelNewbieQuest(player, uid);
        }
        throw 'Нет активных заданий';
    });
});

rpc.register('server_player_mutedSystem_muteFirstLevel', (_args, info) => {
    return true;
});

rpc.register('server_player_mutedSystem_muteNews', (_args, info) => {
    return true;
});

rpc.register('server_player_voice_status', (_args, info) => {
    return true;
});

mp.events.add('server.playermenu.open', (player) => {
    try {
        if (!pmAuth(player)) return;
        if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
        pushMenuOpen(player, 0);
    } catch (e) {
        console.log('[playermenu] open:', e);
    }
});

mp.events.add('server.playermenu.openReport', (player, draftText) => {
    try {
        if (!pmAuth(player)) return;
        if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
        const draft = String(draftText == null ? '' : draftText).trim();
        const minLen = Number(global.REPORT_MIN_TEXT_LENGTH) || 6;

        // Только открыть F10 + префилл. НЕ создавать тикет автоматически (как в PlayerMenuMain).
        if (draft.length > 0 && draft.length < minLen) {
            pmNotify(player, 2, `Слишком короткое сообщение. Минимум ${minLen} символов.`, 4000);
        }

        pushMenuOpen(player, 7);
        const msgs = reportMessagesForMenu(player);
        const reportPayload = JSON.stringify({
            messages: msgs,
            openTab: 7,
            draftText: draft.length >= minLen ? draft : (draft.length > 0 ? draft : ''),
            focusInput: true,
            submitted: false
        });
        setTimeout(() => {
            try {
                if (!mp.players.exists(player)) return;
                player.call('client.playermenu.setReport', [reportPayload]);
            } catch (_e2) {}
        }, 80);
    } catch (e) {
        console.log('[playermenu] openReport:', e);
    }
});

mp.events.add('server.playermenu.promo.enter', (player, code) => {
    try {
        if (!pmAuth(player)) return;
        mp.events.call('activatepromo', player, String(code || ''));
    } catch (e) {
        console.log('[playermenu] promo:', e);
    }
});

mp.events.add('server.playermenu.report.send', (player, message) => {
    try {
        if (!pmAuth(player)) return;
        const text = String(message || '').trim();
        if (!text) return;
        if (player.getVariable('report') === null) {
            if (typeof global.playerReportCreate === 'function') global.playerReportCreate(player, text);
        } else if (typeof global.playerReportAppendUser === 'function') {
            global.playerReportAppendUser(player, text);
        }
        setTimeout(() => {
            try {
                if (mp.players.exists(player)) {
                    player.call('client.playermenu.setData', [JSON.stringify(buildOpenArray(player, 7))]);
                    pushReportToPlayerMenu(player);
                }
            } catch (_e) {}
        }, 200);
    } catch (e) {
        console.log('[playermenu] report:', e);
    }
});

mp.events.add('server.playermenu.donate.buy', (player, price, code, extra) => {
    try {
        if (!pmAuth(player)) return;
        mp.events.call('playermenu:donateBuy', player, String(code || ''), String(extra || ''));
    } catch (e) {
        console.log('[playermenu] donate:', e);
    }
});

mp.events.add('server.playermenu.bp.buy', (player, idOrIco, subIndex, price) => {
    pmNotify(player, 2, 'Бонусный магазин пока недоступен.', 3000);
});

mp.events.add('server.playermenu.gift.claim', (player, id) => {
    pmNotify(player, 2, 'Нет доступных подарков.', 2500);
});

mp.events.add('server.playermenu.settings.save', (player, json) => {
    pmNotify(player, 3, 'Настройки сохранены.', 2000);
});

/** Покупки из вкладки «Магазин» отключены — донат только через сайт. */
mp.events.add('playermenu:donateBuy', (player, code, extra) => {
    try {
        if (!pmAuth(player)) return;
        pmNotify(player, 2, 'In-game магазин отключён. Пополнение DP: flowdm.fun/donate', 5000);
    } catch (e) {
        console.log('[playermenu] donateBuy:', e);
    }
});

function pushReportToPlayerMenu(player) {
    try {
        if (!mp.players.exists(player)) return;
        const msgs = reportMessagesForMenu(player);
        player.call('client.playermenu.setReport', [JSON.stringify({ messages: msgs, openTab: 7 })]);
    } catch (_e) {}
}

/** Синхронизация репорта в открытое меню F10. */
const _pmOrigSyncReportUi = global.syncReportUi;
global.syncReportUi = function syncReportUiWithPlayerMenu(player) {
    if (typeof _pmOrigSyncReportUi === 'function') _pmOrigSyncReportUi(player);
    try {
        if (mp.players.exists(player)) {
            player.call('client.playermenu.setData', [JSON.stringify(buildOpenArray(player, 7))]);
            pushReportToPlayerMenu(player);
        }
    } catch (_e) {}
};

console.log('[playermenu] server module loaded');
