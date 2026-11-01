const ARMOR_COSMETIC = require('./config/armor_cosmetic');
const DONATE_CASES = require('./config/donate_cases');
const DONATE_PRIVILEGE_DP_PRICES = require('./config/donate_privileges');
const ARMOR_CASE_SELL_USD = {};
for (let ai = 0; ai < ARMOR_COSMETIC.VARIANTS.length; ai++) {
    ARMOR_CASE_SELL_USD[ARMOR_COSMETIC.VARIANTS[ai].name] = 25000;
}

/** Кейсы в F2 */
const CASES_MAINTENANCE = false;
const CASES_MAINTENANCE_MSG = 'Кейсы на тех. работах.';

function casesMaintenanceBlock(player) {
    if (!CASES_MAINTENANCE) return false;
    if (player && mp.players.exists(player)) {
        isNotify(player, 2, 'top-mid', CASES_MAINTENANCE_MSG, 4000);
    }
    return true;
}

/** Незабранный приз: авто-сброс, если клиент не забрал (секунды), плюс защита от битого состояния */
const CASE_PRIZE_PENDING_MS = 300000;

function normalizePendingCasePrize(raw) {
    if (raw == null || raw === undefined || raw === false) return null;
    const s = String(raw).trim();
    if (!s || s === 'null' || s === 'undefined') return null;
    return s;
}

function clearPendingCasePrize(player) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.setVariable('randomitem', '');
        player._casePrizePendingAt = 0;
    } catch (_e) {}
}

global.clearPendingCasePrize = clearPendingCasePrize;

function expireStaleCasePrize(player) {
    const prize = normalizePendingCasePrize(player.getVariable('randomitem'));
    if (!prize) {
        clearPendingCasePrize(player);
        return false;
    }
    const t = Number(player._casePrizePendingAt);
    /** Сломанное состояние: приз есть, метки времени нет — иначе игрок заблокирован навсегда */
    if (!Number.isFinite(t) || t <= 0) {
        clearPendingCasePrize(player);
        return true;
    }
    if (Date.now() - t > CASE_PRIZE_PENDING_MS) {
        clearPendingCasePrize(player);
        return true;
    }
    return false;
}

function hasPendingCasePrize(player) {
    expireStaleCasePrize(player);
    return normalizePendingCasePrize(player.getVariable('randomitem')) != null;
}

function markPendingCasePrize(player, prizeName) {
    player._casePrizePendingAt = Date.now();
    player.setVariable('randomitem', prizeName);
}

function caseCollectSucceeded(player, winItem) {
    if (!player || !mp.players.exists(player)) return;
    clearPendingCasePrize(player);
    try {
        global.sendDiscordLog(
            `Забирание приза!\n\nИгрок - [#${player.static}] ${player.login}\nПриз - ${winItem}`,
            '1347379287900160060'
        );
    } catch (_eLog) {}
}

function caseCollectInventoryFull(player) {
    if (!player || !mp.players.exists(player)) return;
    isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 4000);
}

function caseGrantInventoryToken(player, token) {
    if (!player || !mp.players.exists(player)) return false;
    if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
        caseCollectInventoryFull(player);
        return false;
    }
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
    if (global.tryPushInventoryItem) {
        if (!global.tryPushInventoryItem(player, token)) {
            caseCollectInventoryFull(player);
            return false;
        }
    } else {
        player.inventory.push(token);
    }
    global.saveInventory(player);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    return true;
}

/** Несколько предметов атомарно: при ошибке откат инвентаря (анти-дюп частичной выдачи). */
function caseGrantInventoryTokens(player, token, count) {
    if (!player || !mp.players.exists(player)) return false;
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (n < 1) return false;
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!Array.isArray(player.fastSlots)) player.fastSlots = ['', '', ''];
    const snapInv = player.inventory.slice();
    const snapFast = player.fastSlots.slice();
    for (let i = 0; i < n; i++) {
        if (!caseGrantInventoryToken(player, token)) {
            player.inventory = snapInv;
            player.fastSlots = snapFast;
            try {
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
            } catch (_e) {}
            return false;
        }
    }
    return true;
}

function freeCaseCountSafe(raw) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function spendFreeSilverCase(player, cb) {
    if (!player || !mp.players.exists(player) || !player.static) {
        if (cb) cb(new Error('bad player'), false);
        return;
    }
    global.DB.query(
        'UPDATE accounts SET cases = CAST(cases AS SIGNED) - 1 WHERE static = ? AND CAST(cases AS SIGNED) >= 1',
        [player.static],
        (err, result) => {
            if (err || !result || result.affectedRows < 1) {
                if (cb) cb(err || null, false);
                return;
            }
            global.DB.query('SELECT cases FROM accounts WHERE static = ? LIMIT 1', [player.static], (e2, rows) => {
                const n = !e2 && rows && rows[0] ? freeCaseCountSafe(rows[0].cases) : 0;
                if (mp.players.exists(player)) {
                    player.case = n;
                    try {
                        player.call('updatefreecase1', [global.formatnum1(n)]);
                    } catch (_e) {}
                }
                if (cb) cb(null, true);
            });
        }
    );
}

function spendFreeGoldCase(player, cb) {
    if (!player || !mp.players.exists(player) || !player.static) {
        if (cb) cb(new Error('bad player'), false);
        return;
    }
    global.DB.query(
        'UPDATE accounts SET gold_cases = CAST(gold_cases AS SIGNED) - 1 WHERE static = ? AND CAST(gold_cases AS SIGNED) >= 1',
        [player.static],
        (err, result) => {
            if (err || !result || result.affectedRows < 1) {
                if (cb) cb(err || null, false);
                return;
            }
            global.DB.query('SELECT gold_cases FROM accounts WHERE static = ? LIMIT 1', [player.static], (e2, rows) => {
                const n = !e2 && rows && rows[0] ? freeCaseCountSafe(rows[0].gold_cases) : 0;
                if (mp.players.exists(player)) {
                    player.goldCase = n;
                    try {
                        player.call('updatefreegoldcase1', [global.formatnum1(n)]);
                    } catch (_e) {}
                }
                if (cb) cb(null, true);
            });
        }
    );
}

function spendFreeArmorCase(player, cb) {
    if (!player || !mp.players.exists(player) || !player.static) {
        if (cb) cb(new Error('bad player'), false);
        return;
    }
    global.DB.query(
        'UPDATE accounts SET armor_cases = CAST(armor_cases AS SIGNED) - 1 WHERE static = ? AND CAST(armor_cases AS SIGNED) >= 1',
        [player.static],
        (err, result) => {
            if (err || !result || result.affectedRows < 1) {
                if (cb) cb(err || null, false);
                return;
            }
            global.DB.query('SELECT armor_cases FROM accounts WHERE static = ? LIMIT 1', [player.static], (e2, rows) => {
                const n = !e2 && rows && rows[0] ? freeCaseCountSafe(rows[0].armor_cases) : 0;
                if (mp.players.exists(player)) {
                    player.armorCase = n;
                    try {
                        player.call('updatefreearmorcase1', [global.formatnum1(n)]);
                    } catch (_e) {}
                }
                if (cb) cb(null, true);
            });
        }
    );
}

function caseVipIso(d) {
    return d.toISOString().slice(0, 16).replace('T', ' ');
}

/** Награда VIP из кейса: апгрейд, продление +31 дн. или компенсация $ при низком призе */
function grantCaseVipReward(player, staticId, targetLvl) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const cur = Number(player.viplvl) || 0;
        const now = new Date();
        let expiry =
            player.vipdate instanceof Date && !isNaN(player.vipdate.getTime())
                ? new Date(player.vipdate.getTime())
                : null;

        if (cur > targetLvl) {
            const comp = targetLvl === 2 ? 400000 : 250000;
            const curMoney = parseInt(player.money, 10) || 0;
            const newMoney = curMoney + comp;
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, staticId], function (e) {
                if (e) return console.log(e);
            });
            player.money = newMoney;
            player.call('updateMoney', [global.formatnum1(newMoney)]);
            isNotify(
                player,
                2,
                'top-mid',
                `У вас VIP выше приза из кейса. ${global.formatnum1(comp)}$ начислены на баланс.`,
                4500
            );
            player.call('sound:client', [2]);
            return;
        }

        let newExpiry;
        if (cur === targetLvl && cur > 0) {
            const base = expiry && expiry > now ? expiry : now;
            newExpiry = new Date(base.getTime());
            newExpiry.setDate(newExpiry.getDate() + 31);
        } else {
            newExpiry = new Date(now.getTime());
            newExpiry.setDate(newExpiry.getDate() + 31);
        }

        const iso = caseVipIso(newExpiry);
        global.DB.query(
            'UPDATE accounts SET viplvl = ?, vipdate = ? WHERE static = ?',
            [targetLvl, iso, staticId],
            function (err) {
                if (err) return console.log(err);
            }
        );

        player.viplvl = targetLvl;
        player.vipdate = newExpiry;
        player.setVariable('viplvl', targetLvl);
        player.call('updateviplvl', [targetLvl]);
        const daysLeft = Math.max(0, Math.floor((newExpiry - now) / 86400000));
        player.call('updatevipdate', [`${daysLeft}д.`]);

        const msg =
            cur === targetLvl && cur > 0 ? 'VIP продлён на 31 день.' : `Получен VIP ${targetLvl} уровня на 31 день.`;
        isNotify(player, 3, 'top-mid', msg, 3500);
        player.call('sound:client', [3]);
        if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
    } catch (e) {
        console.log(e);
    }
}

/** Ждём подтверждения CEF: списание и приз только после mp.trigger('opencaseUiReady') */
function clearCaseOpenIntent(player) {
    if (!player) return;
    try {
        if (player._caseOpenIntentTimer) {
            clearTimeout(player._caseOpenIntentTimer);
            player._caseOpenIntentTimer = null;
        }
    } catch (_e) {}
    delete player._caseOpenIntent;
}

function applyPostLoginUiPrep(player) {
    if (!mp.players.exists(player)) return;
    player.setVariable('authtwo', true);
    try {
        player.alpha = 255;
    } catch (_eA) {}
    try {
        player.call('WelcomeIntroHide');
        player.call('hideselect');
        player.call('closemenu');
    } catch (_eUi) {}
}

function resolveFactionlessSpawnAfterLogin(player, row) {
    const hasLast = typeof global.rowHasDbLastSpawn === 'function'
        ? global.rowHasDbLastSpawn(row)
        : typeof global.hasValidLastSpawn === 'function'
        && global.hasValidLastSpawn(row.last_x, row.last_y, row.last_z);
    if (hasLast && typeof global.showFactionlessSpawnSelect === 'function') {
        player._forceSpawnSelectOnPlay = true;
        global.showFactionlessSpawnSelect(player, row);
        return;
    }
    if (typeof global.enterFactionlessHub === 'function') global.enterFactionlessHub(player);
}

function beginGangwarSpawnAfterLogin(player, row) {
    if (!mp.players.exists(player) || !row) return;
    const fraction = parseInt(row.fraction, 10) || 0;
    if (!fraction) {
        resolveFactionlessSpawnAfterLogin(player, row);
        return;
    }

    global.DB.query('SELECT * FROM jail WHERE static = ?', [player.static], (err, jailResults) => {
        if (!mp.players.exists(player)) return;
        if (err) {
            return isNotify(player, 2, 'top-mid', 'Ошибка базы данных. Попробуйте позже.', 4000);
        }
        if (jailResults && jailResults.length > 0) {
            const select = fraction === 6 ? 'fib' : 'crime';
            mp.events.call('PlayGangwar', player, select);
            return;
        }
        if (player.getVariable('jail') === true) {
            player.call('spawnselect:cancel');
            return isNotify(player, 2, 'top-mid', 'Вы не можете менять режимы во время деморгана.', 3000);
        }

        player.setVariable('afklobby', null);
        player.setVariable('revolverdm', null);
        player.setVariable('carabinedm', null);
        player.setVariable('heavydm', null);
        player.setVariable('gangwar', true);
        player.setVariable('mp', false);
        player.setVariable('mpp', false);
        player._forceSpawnSelectOnPlay = true;

        if (typeof global.showGangwarSpawnSelect === 'function') {
            global.showGangwarSpawnSelect(player, fraction, row);
        }
    });
}

/** Сразу после логина: без повторного запроса accounts — мгновенный спавн-экран. */
global.enterPlayAfterLogin = function enterPlayAfterLogin(player, row) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        applyPostLoginUiPrep(player);
        player.call('hideLogin');

        const proceedAfterHideLogin = () => {
            if (!mp.players.exists(player) || !player.getVariable('auth')) return;

            if (!row) {
                if (typeof global.enterFactionlessHub === 'function') global.enterFactionlessHub(player);
                return;
            }

            const fraction = parseInt(row.fraction, 10) || 0;
            if (!fraction) {
                resolveFactionlessSpawnAfterLogin(player, row);
                return;
            }
            beginGangwarSpawnAfterLogin(player, row);
        };

        // hideLogin на клиенте ставит spawnselect:await — даём ему отработать до hub/spawn.
        setTimeout(proceedAfterHideLogin, 150);
    } catch (error) {
        console.log('[enterPlayAfterLogin]', error);
    }
};

mp.events.add('playbutton:top:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        global.DB.query(
            'SELECT fraction, last_x, last_y, last_z, last_pos_dim FROM accounts WHERE static = ? LIMIT 1',
            [player.static],
            (err, rows) => {
                if (!mp.players.exists(player)) return;
                if (err || !rows || !rows.length) {
                    console.log('[playbutton] fraction load:', err && (err.message || err));
                    applyPostLoginUiPrep(player);
                    player.call('hideLogin');
                    if (typeof global.enterFactionlessHub === 'function') {
                        global.enterFactionlessHub(player);
                        return;
                    }
                    player.call('playbutton:openMenu:c');
                    return;
                }
                global.enterPlayAfterLogin(player, rows[0]);
            }
        );
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('obmendpm:server', (player, dp) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (isNaN(dp)) {
            isNotify(player, 2, "top-mid", `Введите корректное число.`, 3000);
            return
        }

        const amount = parseInt(dp, 10);
        if (amount < 1) {
            isNotify(player, 2, "top-mid", `Сумма DP для обмена не может быть меньше одного.`, 3000);
            return
        }

        if (!global.economyTryLock(player, 'obmendpm', 3000)) {
            return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        }

        const moneyGain = amount * 1000;
        global.DB.query(
            'UPDATE accounts SET dp = CAST(dp AS SIGNED) - ?, money = CAST(money AS SIGNED) + ? WHERE static = ? AND CAST(dp AS SIGNED) >= ?',
            [amount, moneyGain, player.static, amount],
            (err, result) => {
                if (err) {
                    global.economyUnlock(player, 'obmendpm');
                    return console.log(err);
                }
                if (!result || result.affectedRows < 1) {
                    global.economyUnlock(player, 'obmendpm');
                    return isNotify(player, 2, "top-mid", `Недостаточно DP для обмена.`, 3000);
                }
                global.DB.query('SELECT dp, money FROM accounts WHERE static = ? LIMIT 1', [player.static], (e2, rows) => {
                    global.economyUnlock(player, 'obmendpm');
                    if (e2 || !rows || !rows.length) return;
                    const newdp = parseInt(rows[0].dp, 10) || 0;
                    const newmoney = parseInt(rows[0].money, 10) || 0;
                    player.dp = newdp;
                    player.money = newmoney;
                    player.call('updatedp', [global.formatnum1(newdp)]);
                    player.call('updateMoney', [global.formatnum1(newmoney)]);
                    global.sendDiscordLog(`Обмен DP на $!\n\nИгрок - ${player.login} (#${player.static})\n${global.formatnum1(amount)} DP на ${global.formatnum1(moneyGain)}$`, '1330425055926161418');
                    isNotify(player, 3, "top-mid", `${global.formatnum1(amount)} DP перечислены в ${global.formatnum1(moneyGain)}$`, 3000);
                    player.call('sound:client', [3]);
                });
            }
        );
    } catch (error) {
        console.log(error);
    }
});

function getRandomItem(caseItems) {
    if (!caseItems || caseItems.length === 0) {
        console.log("Ошибка: Пустой список предметов в кейсе.");
        return null;
    }

    const totalChance = caseItems.reduce((sum, item) => sum + item.chance, 0);
    if (totalChance <= 0) {
        console.log("Ошибка: Общий шанс равен нулю.");
        return null;
    }

    const rand = Math.random() * totalChance;
    let cumulativeChance = 0;

    for (const item of caseItems) {
        cumulativeChance += item.chance;
        if (rand <= cumulativeChance) {
            return item;
        }
    }

    return caseItems[caseItems.length - 1];
}

mp.events.add('opencase', (player, casename, fast, type) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (casesMaintenanceBlock(player)) return;

        if (!player.clicked) player.clicked = 0;
        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", "Не так часто.", 1500);
        player.clicked = new Date().getTime();

        if (player._caseOpenIntent) {
            return isNotify(player, 2, 'top-mid', 'Открытие кейса уже запущено. Дождитесь рулетки.', 3500);
        }

        if (hasPendingCasePrize(player)) {
            return isNotify(player, 2, 'top-mid', 'Сначала заберите или продайте приз прошлого кейса.', 3500);
        }

        const casePrices = {
            SilverCase: 149,
            GoldCase: 249,
            ArmorCase: 199,
            GunCase: 249
        };

        const cases = {
            'SilverCase': [
                { id: 2, prize: '20.000$', chance: 30 },
                { id: 3, prize: 'SilverVIP', chance: 20 },
                { id: 4, prize: 'Lada 2107', chance: 20 },
                { id: 5, prize: 'Audi', chance: 15 },
                { id: 6, prize: '2022 C63', chance: 5 },
                { id: 7, prize: 'Audi RS 7', chance: 5 },
                { id: 8, prize: 'Audi Q8', chance: 5 }
            ],
            'GoldCase': [
                { id: 2, prize: '20 DP', chance: 35 },
                { id: 3, prize: '35.000$', chance: 30 },
                { id: 4, prize: 'PlatinumVIP', chance: 20 },
                { id: 5, prize: 'Chiron 17', chance: 5 },
                { id: 6, prize: 'Lamborghini Sian', chance: 5 },
                { id: 7, prize: 'Lada Raven', chance: 4 },
                { id: 8, prize: 'BMW M5', chance: 0.9 },
                { id: 9, prize: 'Skateboard', chance: 0.1 }
            ],
            ArmorCase: ARMOR_COSMETIC.buildArmorCaseItems(),
            GunCase: DONATE_CASES.getGunCaseItems().map((row, idx) => ({
                id: idx + 2,
                prize: row.prize,
                chance: row.chance
            }))
        };

        const caseItems = cases[casename];
        if (!caseItems || caseItems.length === 0) {
            return isNotify(player, 2, "top-mid", "ERROR (CASE-1)", 1500);
        }

        const payType = String(type || 'dp');

        if (payType === 'free') {
            return isNotify(player, 2, 'top-mid', 'Кейсы открываются только за DP.', 3000);
        }

        if (
            casename === 'SilverCase' ||
            casename === 'GoldCase' ||
            casename === 'ArmorCase' ||
            casename === 'GunCase'
        ) {
            const price = casePrices[casename];
            const hasFree =
                (casename === 'SilverCase' && freeCaseCountSafe(player.case) > 0) ||
                (casename === 'GoldCase' && freeCaseCountSafe(player.goldCase) > 0);
            if (!hasFree && freeCaseCountSafe(player.dp) < price) return isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
        } else {
            return isNotify(player, 2, "top-mid", "ERROR (CASE-0)", 1500);
        }

        const randomItem = getRandomItem(caseItems);
        if (!randomItem) {
            return isNotify(player, 2, "top-mid", "ERROR (CASE-2)", 1500);
        }

        const caseSlotIndex = caseItems.indexOf(randomItem);
        const slot = caseSlotIndex < 0 ? 0 : caseSlotIndex;
        const fastFlag = fast === true || fast === 'true' || fast === 1;

        let priceDp = casePrices[casename] || 0;

        player._caseOpenIntent = {
            casename,
            payType,
            prize: randomItem.prize,
            slot,
            fast: fastFlag,
            priceDp,
            ts: Date.now()
        };

        player._caseOpenIntentTimer = setTimeout(() => {
            try {
                if (!mp.players.exists(player)) return;
                if (!player._caseOpenIntent) return;
                clearCaseOpenIntent(player);
                isNotify(player, 2, 'top-mid', 'Окно кейса не ответило. Нажмите «Открыть» снова — DP не списывались.', 5000);
            } catch (_e) {}
        }, 20000);

        player.call('startanimcase', [casename, fastFlag, slot, randomItem.prize]);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('opencase:commit', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (casesMaintenanceBlock(player)) return;
        if (player._caseCommitting) return;

        const intent = player._caseOpenIntent;
        if (!intent) return;

        if (Date.now() - intent.ts > 25000) {
            clearCaseOpenIntent(player);
            return;
        }

        if (hasPendingCasePrize(player)) {
            clearCaseOpenIntent(player);
            return isNotify(player, 2, 'top-mid', 'Сначала заберите или продайте приз прошлого кейса.', 3500);
        }

        const casename = intent.casename;
        const payType = intent.payType;
        const prize = intent.prize;
        const priceDp = Number(intent.priceDp) || 0;
        const fast = intent.fast;

        const finishPaidOpen = () => {
            if (!mp.players.exists(player)) return;
            player._caseCommitting = false;
            markPendingCasePrize(player, prize);

            global.sendDiscordLog(`Открытие кейса!\n\nИгрок - [#${player.static}] ${player.login}\nКейс - ${casename}\nВыпало - ${prize}`, '1347379287900160060');

            const broadcastPrizes = ['Chiron 17', 'Lamborghini Sian'];
            const caseSource = casename === 'GoldCase' ? 'Gold Case' : casename === 'SilverCase' ? 'Silver Case' : '(Главное меню > Рулетка)';
            const broadcastMsg = broadcastPrizes.includes(prize)
                ? `!{#0084ff}[Счастливчик] !{#dcfc08}[#${player.static}] открыл кейс и получил !{#f70000}${prize}! !{#dcfc08}(${caseSource})`
                : `!{#0084ff}[Счастливчик] !{#dcfc08}[#${player.static}] открыл кейс и получил !{#f70000}${prize}! !{#dcfc08}(Главное меню > Рулетка)`;

            if (!fast) {
                setTimeout(() => {
                    if (player && mp.players.exists(player) && broadcastPrizes.includes(prize)) {
                        mp.players.broadcast(broadcastMsg);
                    }
                }, 7000);
            } else if (broadcastPrizes.includes(prize)) {
                mp.players.broadcast(broadcastMsg);
            }
        };

        const failSpend = (msg) => {
            if (!mp.players.exists(player)) return;
            player._caseCommitting = false;
            clearCaseOpenIntent(player);
            isNotify(player, 2, 'top-mid', msg || 'Недостаточно средств.', 3000);
        };

        if (payType === 'free') {
            clearCaseOpenIntent(player);
            return isNotify(player, 2, 'top-mid', 'Кейсы открываются только за DP.', 3000);
        }

        if (
            casename === 'SilverCase' ||
            casename === 'GoldCase' ||
            casename === 'ArmorCase' ||
            casename === 'GunCase'
        ) {
            const useFreeSilver = casename === 'SilverCase' && freeCaseCountSafe(player.case) > 0;
            const useFreeGold = casename === 'GoldCase' && freeCaseCountSafe(player.goldCase) > 0;
            if (!useFreeSilver && !useFreeGold && (priceDp < 1 || freeCaseCountSafe(player.dp) < priceDp)) {
                clearCaseOpenIntent(player);
                return isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
            }
            player._caseCommitting = true;
            clearCaseOpenIntent(player);
            if (useFreeSilver) {
                return spendFreeSilverCase(player, (eFree, okFree) => {
                    if (eFree || !okFree) return failSpend('Нет бесплатного Silver Case.');
                    finishPaidOpen();
                });
            }
            if (useFreeGold) {
                return spendFreeGoldCase(player, (eFree, okFree) => {
                    if (eFree || !okFree) return failSpend('Нет бесплатного Gold Case.');
                    finishPaidOpen();
                });
            }
            if (typeof global.economySpendDp === 'function') {
                global.economySpendDp(player, priceDp, (err, ok) => {
                    if (err || !ok) return failSpend('Недостаточно DP для покупки.');
                    finishPaidOpen();
                });
            } else {
                const newdp = freeCaseCountSafe(player.dp) - priceDp;
                if (newdp < 0) return failSpend('Недостаточно DP для покупки.');
                global.DB.query(
                    'UPDATE accounts SET dp = CAST(dp AS SIGNED) - ? WHERE static = ? AND CAST(dp AS SIGNED) >= ?',
                    [priceDp, player.static, priceDp],
                    (err, result) => {
                        if (err || !result || result.affectedRows < 1) return failSpend('Недостаточно DP для покупки.');
                        player.dp = newdp;
                        try {
                            player.call('updatedp', [global.formatnum1(newdp)]);
                        } catch (_e) {}
                        finishPaidOpen();
                    }
                );
            }
            return;
        }

        clearCaseOpenIntent(player);
        return isNotify(player, 2, "top-mid", "ERROR (CASE-3)", 1500);
    } catch (error) {
        console.log(error);
        try {
            if (player && mp.players.exists(player)) player._caseCommitting = false;
        } catch (_e) {}
    }
});

mp.events.add('opencase:cancel', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        if (!player._caseOpenIntent) return;
        clearCaseOpenIntent(player);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('cancelCasePrize:server', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        clearCaseOpenIntent(player);
        // Нельзя сжигать уже оплаченный приз закрытием UI — только подсказка забрать/продать
        if (hasPendingCasePrize(player)) {
            isNotify(player, 2, 'top-mid', 'Сначала заберите или продайте приз кейса.', 3500);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('collectPrize:server', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (player._caseCollecting) return;
        const winItem = normalizePendingCasePrize(player.getVariable('randomitem'));
        if (!winItem) return;

        // Claim сразу — второй collect не получит тот же приз
        player._caseCollecting = true;
        clearPendingCasePrize(player);

        const restorePrize = () => {
            if (mp.players.exists(player)) markPendingCasePrize(player, winItem);
        };
        const finishCollect = () => {
            if (mp.players.exists(player)) player._caseCollecting = false;
        };

        const static = player.static;

        const armorVariant = ARMOR_COSMETIC.getVariantByPrizeName(winItem);
        if (armorVariant) {
            const av = armorVariant;
            const key = ARMOR_COSMETIC.unlockKey(av.d, av.t);
            const unlocks = ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks);
            if (unlocks.includes(key)) {
                const amount = 12500;
                if (typeof global.economyAddMoney === 'function') {
                    global.economyAddMoney(player, amount);
                } else {
                    let curMoney = player.money;
                    let newMoney = parseInt(curMoney, 10) + amount;
                    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, static], function (err) {
                        if (err) return console.log(err);
                    });
                    player.call('updateMoney', [global.formatnum1(newMoney)]);
                    player.money = newMoney;
                }
                isNotify(
                    player,
                    2,
                    'top-mid',
                    `У вас уже есть этот скин бронежилета. ${global.formatnum1(amount)}$ начислены на баланс.`,
                    3500
                );
                player.call('sound:client', [2]);
            } else {
                unlocks.push(key);
                player.armorCosmeticUnlocks = unlocks;
                const equippedRaw =
                    player._clothesRowCache && player._clothesRowCache.armor != null
                        ? String(player._clothesRowCache.armor).trim()
                        : '';
                global.DB.query(
                    'UPDATE accounts SET armor_cosmetic_unlocks = ? WHERE static = ?',
                    [JSON.stringify(unlocks), static],
                    function (err) {
                        if (err) console.log('[armor-collect] UPDATE accounts:', err.message || err);
                        try {
                            if (mp.players.exists(player)) {
                                player.call('armorCosmeticShopPush', [
                                    JSON.stringify({ unlocks, equipped: equippedRaw })
                                ]);
                                if (typeof pushArmorCosmeticShop === 'function') {
                                    pushArmorCosmeticShop(player);
                                }
                            }
                        } catch (_ePush) {}
                    }
                );
                player.call('armorCosmeticShopPush', [
                    JSON.stringify({ unlocks, equipped: equippedRaw })
                ]);
                isNotify(
                    player,
                    3,
                    'top-mid',
                    `Скин бронежилета «${av.name}» добавлен. Надеть: F3 → Магазин → Бронежилет.`,
                    4500
                );
                player.call('sound:client', [3]);
            }
            caseCollectSucceeded(player, winItem);
            finishCollect();
            return;
        }

        if (typeof winItem === 'string' && winItem.startsWith('CaseCloth|')) {
            if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
                caseCollectInventoryFull(player);
                restorePrize();
                finishCollect();
                return;
            }
            if (typeof global.grantDonateClothesPrizeFromCase === 'function') {
                const parsedCloth = DONATE_CASES.parseCaseClothPrize(winItem);
                const isBagPrize = parsedCloth && Number(parsedCloth.clothid) === 8;
                if (isBagPrize) {
                    global.grantDonateClothesPrizeFromCase(player, winItem, {
                        onDone: (ok) => {
                            if (ok) caseCollectSucceeded(player, winItem);
                            else restorePrize();
                            finishCollect();
                        }
                    });
                } else {
                    const granted = global.grantDonateClothesPrizeFromCase(player, winItem);
                    if (granted !== false) caseCollectSucceeded(player, winItem);
                    else restorePrize();
                    finishCollect();
                }
            } else {
                restorePrize();
                finishCollect();
            }
            return;
        }

        const gunCaseInventoryMap = {
            'Heavy Sniper MK1': 'weapon_heavysniper',
            'Heavy Sniper MK2': 'weapon_heavysniper_mk2',
            SniperRifle: 'weapon_sniperrifle',
            'Marksman Rifle': 'weapon_marksmanrifle',
            'Precision Rifle': 'weapon_precisionrifle'
        };

        if (winItem === 'Skateboard') {
            if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
                caseCollectInventoryFull(player);
                restorePrize();
                finishCollect();
                return;
            }
            if (!Array.isArray(player.inventory)) player.inventory = [];
            const alreadyHasSkate = player.inventory.some(
                (s) => typeof s === 'string' && s.toLowerCase().startsWith('item_skateboard')
            );
            if (alreadyHasSkate) {
                const amount = Math.floor((global.SKATEBOARD_PRICE_DP || 400) / 2);
                if (typeof global.economyAddMoney === 'function') global.economyAddMoney(player, amount);
                else {
                    let curMoney = player.money;
                    let newMoney = parseInt(curMoney, 10) + amount;
                    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, static], function (err) {
                        if (err) return console.log(err);
                    });
                    player.call('updateMoney', [global.formatnum1(newMoney)]);
                    player.money = newMoney;
                }
                isNotify(
                    player,
                    2,
                    'top-mid',
                    `Скейтборд уже есть. ${global.formatnum1(amount)}$ начислены на баланс.`,
                    3500
                );
                player.call('sound:client', [2]);
                caseCollectSucceeded(player, winItem);
                finishCollect();
                return;
            }
            global.grantSkateboardToPlayer(player, (err, token, livery) => {
                if (!mp.players.exists(player) || !player.getVariable('auth')) {
                    if (token && typeof global.deleteSkateboardInstanceForItem === 'function') {
                        global.deleteSkateboardInstanceForItem(token);
                    }
                    finishCollect();
                    return;
                }
                if (err || !token) {
                    restorePrize();
                    finishCollect();
                    return isNotify(player, 2, 'top-mid', 'Не удалось создать скейтборд.', 3000);
                }
                const skatePushed = typeof global.invGridTryPush === 'function'
                    ? global.invGridTryPush(player, token)
                    : (player.inventory.push(token), true);
                if (!skatePushed) {
                    global.deleteSkateboardInstanceForItem(token);
                    caseCollectInventoryFull(player);
                    restorePrize();
                    finishCollect();
                    return;
                }
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                isNotify(player, 3, 'top-mid', `Вы забрали скейтборд (раскраска ${livery}).`, 5000);
                player.call('sound:client', [3]);
                caseCollectSucceeded(player, winItem);
                finishCollect();
            });
            return;
        }

        if (gunCaseInventoryMap[winItem]) {
            if (!caseGrantInventoryToken(player, gunCaseInventoryMap[winItem])) {
                restorePrize();
                finishCollect();
                return;
            }
            player.call('sound:client', [3]);
            isNotify(player, 3, 'top-mid', `Вы забрали ${winItem}.`, 3000);
            caseCollectSucceeded(player, winItem);
            finishCollect();
            return;
        }

            global.DB.query('SELECT * FROM accounts WHERE static = ?', [static], function (err, results) {
                if (err) {
                    restorePrize();
                    finishCollect();
                    return console.log(err);
                }
    
                if (results.length === 0) {
                    restorePrize();
                    finishCollect();
                    return;
                }
    
                const carPrizesMap = {
                    "Oppressor": "oppressor2", "Avtr": "avtr", "Lada 2107": "lada2107", "Audi": "audisport",
                    "2022 C63": "2022c63", "Lada Raven": "2021ladaraven",
                    "Бусик ТЦК": "alphard", "Lamborghini Sian": "rmodsian", "Chiron 17": "chiron17", "Audi RS 7": "2020rs7",
                    "Audi Q8": "audiq8", "BMW M5": "2019m5"
                };
                const carToBuy = carPrizesMap[winItem];

                if (winItem === 'SilverVIP' || winItem === 'PlatinumVIP') {
                    const lvl = winItem === 'PlatinumVIP' ? 3 : 2;
                    grantCaseVipReward(player, static, lvl);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (carToBuy) {
                    global.addcar(player, carToBuy, 'case');
                    if (typeof global.loadcar === 'function') global.loadcar(player);
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали ${winItem}.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "10 DP") {
                    if (typeof global.economyAddDp === 'function') global.economyAddDp(player, 10);
                    else {
                        const newdp = parseInt(player.dp) + 10;
                        global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, static], () => {});
                        player.call('updatedp', [global.formatnum1(newdp)]);
                        player.dp = newdp;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали 10 DP.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "50 DP") {
                    if (typeof global.economyAddDp === 'function') global.economyAddDp(player, 50);
                    else {
                        const newdp = parseInt(player.dp) + 50;
                        global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, static], () => {});
                        player.call('updatedp', [global.formatnum1(newdp)]);
                        player.dp = newdp;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали 50 DP.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "20 DP") {
                    if (typeof global.economyAddDp === 'function') global.economyAddDp(player, 20);
                    else {
                        const newdp = parseInt(player.dp) + 20;
                        global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, static], () => {});
                        player.call('updatedp', [global.formatnum1(newdp)]);
                        player.dp = newdp;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали 20 DP.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "200 DP") {
                    if (typeof global.economyAddDp === 'function') global.economyAddDp(player, 200);
                    else {
                        const newdp = parseInt(player.dp) + 200;
                        global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, static], () => {});
                        player.call('updatedp', [global.formatnum1(newdp)]);
                        player.dp = newdp;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали 200 DP.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "25.000$" || winItem === "50.000$") {
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали ${winItem}.`, 3000);
                    let amount = winItem === "25.000$" ? 25000 : 50000;
                    if (typeof global.economyAddMoney === 'function') global.economyAddMoney(player, amount);
                    else {
                        const newMoney = parseInt(player.money) + amount;
                        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], () => {});
                        player.call('updateMoney', [global.formatnum1(newMoney)]);
                        player.money = newMoney;
                    }
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "10.000$" || winItem === "15.000$" || winItem === "20.000$" || winItem === "30.000$" || winItem === "35.000$" || winItem === "45.000$" || winItem === "100.000$") {
                    let amount = parseInt(winItem.replace(/\./g, '').replace(/\$/g, '').replace(/\s/g, '')) || 0;
                    if (typeof global.economyAddMoney === 'function') global.economyAddMoney(player, amount);
                    else {
                        const newMoney = parseInt(player.money) + amount;
                        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], () => {});
                        player.call('updateMoney', [global.formatnum1(newMoney)]);
                        player.money = newMoney;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали ${winItem}.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Mini SMG (3 шт)") {
                    if (!caseGrantInventoryTokens(player, "weapon_minismg", 3)) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Mini SMG (3 шт).`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Heavy Shotgun (3 шт)") {
                    if (!caseGrantInventoryTokens(player, "weapon_heavyshotgun", 3)) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Heavy Shotgun (3 шт).`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Combat MG MK2") {
                    if (!caseGrantInventoryToken(player, "weapon_combatmg_mk2")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Combat MG MK2.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Combat MG") {
                    if (!caseGrantInventoryToken(player, "weapon_combatmg")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Combat MG.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Military Rifle") {
                    if (!caseGrantInventoryToken(player, "weapon_militaryrifle")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Military Rifle.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Marksman Rifle") {
                    if (!caseGrantInventoryToken(player, "weapon_marksmanrifle")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Marksman Rifle.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Heavy Sniper MK1") {
                    if (!caseGrantInventoryToken(player, "weapon_heavysniper")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Heavy Sniper MK1.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "SniperRifle") {
                    if (!caseGrantInventoryToken(player, "weapon_sniperrifle")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Sniper Rifle.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Heavy Sniper MK2") {
                    if (!caseGrantInventoryToken(player, "weapon_heavysniper_mk2")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Heavy Sniper MK2.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Precision Rifle") {
                    if (!caseGrantInventoryToken(player, "weapon_precisionrifle")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали Precision Rifle.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Mini SMG") {
                    if (!caseGrantInventoryToken(player, "weapon_gadgetpistol")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали ${winItem}.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Navy Revolver") {
                    if (!caseGrantInventoryToken(player, "weapon_navyrevolver")) {
                        restorePrize();
                        finishCollect();
                        return;
                    }
                    player.call('sound:client', [3]);
                    isNotify(player, 3, "top-mid", `Вы забрали ${winItem}.`, 3000);
                    caseCollectSucceeded(player, winItem);
                    finishCollect();
                } else if (winItem === "Чёрная Кобура") {
                    global.DB.query('SELECT cobura, coburaw FROM accounts WHERE static = ?', [static], function (err, results) {
                        if (err || results.length === 0) {
                            restorePrize();
                            finishCollect();
                            return;
                        }
                        const toCount = (v) => (v === true || v === 'true') ? 1 : (parseInt(v, 10) > 0 ? 1 : 0);
                        const r = results[0];
                        if (toCount(r.cobura) >= 1) {
                            const amount = 1250000;
                            if (typeof global.economyAddMoney === 'function') global.economyAddMoney(player, amount);
                            else {
                                let newMoney = parseInt(player.money) + amount;
                                global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, static], () => {});
                                player.call('updateMoney', [global.formatnum1(newMoney)]);
                                player.money = newMoney;
                            }
                            isNotify(player, 2, "top-mid", `У вас уже есть чёрная кабура. 50% от стоимости: ${global.formatnum1(amount)}$ на баланс.`, 3000);
                            player.call('sound:client', [3]);
                            caseCollectSucceeded(player, winItem);
                            finishCollect();
                            return;
                        }

                        global.DB.query('UPDATE accounts SET cobura = ? WHERE static = ?', ['true', static]);
                        isNotify(player, 3, "top-mid", `Вы забрали Чёрную Кобуру.`, 3000);
                        player.call('sound:client', [3]);
                        caseCollectSucceeded(player, winItem);
                        finishCollect();
                    });
                } else {
                    // неизвестный приз — не теряем
                    restorePrize();
                    finishCollect();
                }
            });
    } catch (error) {
        console.log(error);
        try {
            if (player && mp.players.exists(player)) player._caseCollecting = false;
        } catch (_e) {}
    }
});

mp.events.add('sellPrize:server', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (player._caseSelling) return;
        const winItem = normalizePendingCasePrize(player.getVariable('randomitem'));
        if (!winItem) return;

        if (winItem === 'SilverVIP' || winItem === 'PlatinumVIP') {
            isNotify(player, 2, 'top-mid', 'VIP из кейса можно только забрать.', 3500);
            return;
        }

        player._caseSelling = true;
        clearPendingCasePrize(player);
        const static = player.static;

                let pricedp = {
                    "Navy Revolver": 100000,
                    "Mini SMG": 50000,
                    "Avtr": 1250000,
                    "Чёрная Кобура": 2500000,
                    "10 DP": 1000,
                    "20 DP": 12000,
                    "50 DP": 1000,
                    "200 DP": 12000,
                    "SilverVIP": 250000,
                    "PlatinumVIP": 500000,
                    "25.000$": 25000,
                    "50.000$": 50000,
                    "10.000$": 10000,
                    "15.000$": 15000,
                    "20.000$": 20000,
                    "35.000$": 35000,
                    "30.000$": 30000,
                    "45.000$": 45000,
                    "100.000$": 100000,
                    "Mini SMG (3 шт)": 9000,
                    "Heavy Shotgun (3 шт)": 4500,
                    "Combat MG MK2": 300000,
                    "Combat MG": 120000,
                    "Military Rifle": 1500,
                    "Marksman Rifle": 120000,
                    "Heavy Sniper MK1": 3000000,
                    "SniperRifle": 250000,
                    "Heavy Sniper MK2": 75000,
                    "Precision Rifle": 300000,
                    "Lada 2107": 35000,
                    "Audi": 85000,
                    "2022 C63": 150000,
                    "Lada Raven": 45000,
                    "Бусик ТЦК": 65000,
                    "Lamborghini Sian": 425000,
                    "Chiron 17": 550000,
                    "Audi RS 7": 300000,
                    "Audi Q8": 220000,
                    "BMW M5": 45000,
                    "Skateboard": 800000,
                    "Revolter": 55000,
                    "Nissan GT-R": 140000,
                    "Porsche Taycan": 200000,
                    "Toros": 80000,
                    "Mercedes G63 AMG": 350000,
                    "Lamborghini Huracan": 1000000,
                    "Panamera Turbo S": 500000,
                    "Pfister 811": 105000,
                    "Mercedes GT63S": 350000,
                    "GP-1": 102000
                };

                let sumMoney = pricedp[winItem] || ARMOR_CASE_SELL_USD[winItem] || 0;
                if (!sumMoney && typeof winItem === 'string' && winItem.startsWith('CaseCloth|')) {
                    sumMoney = DONATE_CASES.caseClothSellMoney(winItem);
                }
                sumMoney = Math.floor(Number(sumMoney) / 2);
                global.sendDiscordLog(`Продажа приза!\n\nИгрок - [#${player.static}] ${player.login}\nПриз - ${winItem}\nЗа - ${global.formatnum1(sumMoney)}$ (50%)`, '1347379287900160060');

                if (typeof global.economyAddMoney === 'function') {
                    global.economyAddMoney(player, sumMoney, () => {
                        if (mp.players.exists(player)) player._caseSelling = false;
                    });
                } else {
                    let newMoney = parseInt(player.money) + parseInt(sumMoney);
                    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, static], function (err) {
                        if (err) return console.log(err);
                    });
                    player.call('updateMoney', [global.formatnum1(newMoney)]);
                    player.money = newMoney;
                    player._caseSelling = false;
                }

                isNotify(player, 3, "top-mid", `Вы успешно продали ${winItem}. +${global.formatnum1(sumMoney)}$`, 3000);
                player.call('sound:client', [3]);
    } catch (error) {
        console.log(error);
        try {
            if (player && mp.players.exists(player)) player._caseSelling = false;
        } catch (_e) {}
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        clearPendingCasePrize(player);
    } catch (_e) {}
});

/** F3 → Транспорт (DP): модель в гараж = ключ объекта. */
function getDonateShopVehicleCfg(modelKey) {
    const prices = global.DONATE_VEHICLE_DP_PRICES || {};
    const price = prices[modelKey];
    if (price == null) return null;
    return { price };
}

const DONATE_SHOP_ITEM_DP_PRICES = Object.freeze({
    weapon_heavysniper_mk2: 2000,
    ThermosMug: 300,
    BongPipe: 200,
    DroneSystem: 500,
    skateboard: 400
});

function canAffordDonateShopItem(player, price) {
    if (Number(player.dp) >= price) return true;
    isNotify(player, 2, 'top-mid', 'Недостаточно DP для покупки.', 3000);
    return false;
}

function finishDonateShopDpPurchase(player, price, label) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
    const cost = parseInt(price, 10) || 0;
    if (cost <= 0) return true;
    if (Number(player.dp) < cost) {
        isNotify(player, 2, 'top-mid', 'Недостаточно DP для покупки.', 3000);
        return false;
    }
    // Оптимистично списываем в памяти + атомарно в БД (не уйти в минус)
    const prev = parseInt(player.dp, 10) || 0;
    player.dp = prev - cost;
    player.call('updatedp', [global.formatnum1(player.dp)]);
    global.DB.query(
        'UPDATE accounts SET dp = CAST(dp AS SIGNED) - ? WHERE static = ? AND CAST(dp AS SIGNED) >= ?',
        [cost, player.static, cost],
        (err, result) => {
            if (err || !result || result.affectedRows < 1) {
                global.DB.query('SELECT dp FROM accounts WHERE static = ? LIMIT 1', [player.static], (e2, rows) => {
                    if (!mp.players.exists(player)) return;
                    const dbDp = !e2 && rows && rows[0] ? parseInt(rows[0].dp, 10) || 0 : prev;
                    player.dp = dbDp;
                    player.call('updatedp', [global.formatnum1(dbDp)]);
                });
                return;
            }
            global.DB.query('SELECT dp FROM accounts WHERE static = ? LIMIT 1', [player.static], (e2, rows) => {
                if (!mp.players.exists(player) || e2 || !rows || !rows[0]) return;
                const dbDp = parseInt(rows[0].dp, 10) || 0;
                player.dp = dbDp;
                player.call('updatedp', [global.formatnum1(dbDp)]);
            });
        }
    );
    isNotify(player, 3, 'top-mid', `${label}: -${global.formatnum1(cost)} DP`, 3500);
    player.call('sound:client', [3]);
    return true;
}

function pushDonateShopInventoryItem(player, token) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    const pushed = typeof global.tryPushInventoryItem === 'function'
        ? global.tryPushInventoryItem(player, token)
        : (typeof global.invGridTryPush === 'function'
            ? global.invGridTryPush(player, token)
            : (player.inventory.push(token), true));
    if (!pushed) return false;
    global.saveInventory(player);
    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
    return true;
}

mp.events.add('s:buymenu', (player, category, item, trigger) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (category == 'Vehicles') {
            const cfg = getDonateShopVehicleCfg(item);
            if (!cfg) return;
            const price = cfg.price;
            const static = player.static;
            const modelKey = item;

            if (String(trigger) === 'family') {
                if (typeof global.tryPurchaseDonateVehicleForFamilyGarage !== 'function') {
                    return isNotify(player, 2, 'top-mid', 'Покупка в гараж семьи временно недоступна.', 3000);
                }
                global.tryPurchaseDonateVehicleForFamilyGarage(player, modelKey, price, (err) => {
                    if (!mp.players.exists(player)) return;
                    if (err) return isNotify(player, 2, 'top-mid', String(err), 4000);
                    player.call('sound:client', [3]);
                });
                return;
            }

            global.DB.query('SELECT cars FROM accounts WHERE static = ?', [static], function (err, results) {
                if (err) return console.log(err);
                if (!results || !results[0]) return;

                let carArray;
                try {
                    carArray = global.normalizeCarsArray(JSON.parse(results[0].cars || '[]'));
                } catch (_e) {
                    carArray = [];
                }

                if (global.carsListHasModel(carArray, modelKey)) {
                    return isNotify(player, 2, 'top-mid', 'У вас уже есть этот транспорт.', 3000);
                }

                if (!global.economyTryLock(player, 'donateVeh', 4000)) {
                    return isNotify(player, 2, 'top-mid', 'Покупка уже обрабатывается.', 2000);
                }

                global.economySpendDp(player, price, (eSpend, ok) => {
                    if (!mp.players.exists(player)) return;
                    if (eSpend || !ok) {
                        global.economyUnlock(player, 'donateVeh');
                        return isNotify(player, 2, 'top-mid', `Недостаточно DP для покупки.`, 3000);
                    }
                    global.addcar(player, modelKey, 'donate');
                    isNotify(player, 3, 'top-mid', `-${global.formatnum1(price)} DP`, 3000);
                    player.call('sound:client', [3]);
                    global.economyUnlock(player, 'donateVeh');
                });
            });
            return;
        } else if (category == 'GangwarOthers') {
            if (item == 'BongPipe') {
                const BONG_PRICE = DONATE_SHOP_ITEM_DP_PRICES.BongPipe;
                const curdp = Number(player.dp);
                if (curdp < BONG_PRICE) return isNotify(player, 2, 'top-mid', 'Недостаточно DP для покупки.', 3000);
                const newdp = curdp - BONG_PRICE;
                global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, player.static], function (err) {
                    if (err) return console.log(err);
                });
                player.call('updatedp', [global.formatnum1(newdp)]);
                player.dp = newdp;
                if (!Array.isArray(player.inventory)) player.inventory = [];
                const bongPushed = typeof global.invGridTryPush === 'function'
                    ? global.invGridTryPush(player, 'item_bong')
                    : (player.inventory.push('item_bong'), true);
                if (!bongPushed) return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
                if (typeof global.normalizeBongInPlayerGrid === 'function') global.normalizeBongInPlayerGrid(player);
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                isNotify(player, 3, 'top-mid', `-${global.formatnum1(BONG_PRICE)} DP | Трубка Bong добавлена в инвентарь.`, 4000);
                player.call('sound:client', [3]);
                return;
            } else if (item == 'ThermosMug') {
                const price = DONATE_SHOP_ITEM_DP_PRICES.ThermosMug;
                if (!canAffordDonateShopItem(player, price)) return;
                if (!Array.isArray(player.inventory)) player.inventory = [];
                const alreadyHasThermos = player.inventory.some((x) => {
                    if (!x) return false;
                    const xs = String(x);
                    return xs === 'item_thermos' || xs.startsWith('item_thermos (') || xs.startsWith('item_thermocup');
                });
                if (alreadyHasThermos) {
                    return isNotify(player, 2, 'top-mid', 'У вас уже есть термокружка.', 3000);
                }
                const thermosPushed = typeof global.invGridTryPush === 'function'
                    ? global.invGridTryPush(player, 'item_thermos')
                    : (player.inventory.push('item_thermos'), true);
                if (!thermosPushed) {
                    return isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
                }
                if (typeof global.normalizeThermosInPlayerGrid === 'function') global.normalizeThermosInPlayerGrid(player);
                finishDonateShopDpPurchase(player, price, 'Термокружка приобретена');
                return;
            } else if (item == 'DroneSystem') {
                const DRONE_PRICE = DONATE_SHOP_ITEM_DP_PRICES.DroneSystem;
                const curdp = Number(player.dp);
                if (curdp < DRONE_PRICE) return isNotify(player, 2, 'top-mid', 'Недостаточно DP для покупки.', 3000);
                const newdp = curdp - DRONE_PRICE;
                global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, player.static], function (err) {
                    if (err) return console.log(err);
                });
                player.call('updatedp', [global.formatnum1(newdp)]);
                player.dp = newdp;
                if (!Array.isArray(player.inventory)) player.inventory = [];
                const dronePushed = typeof global.invGridTryPush === 'function'
                    ? global.invGridTryPush(player, 'item_drone')
                    : (player.inventory.push('item_drone'), true);
                if (!dronePushed) return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
                if (typeof global.normalizeDroneInPlayerGrid === 'function') global.normalizeDroneInPlayerGrid(player);
                global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                isNotify(player, 3, 'top-mid', `-${global.formatnum1(DRONE_PRICE)} DP | Дрон добавлен в инвентарь.`, 4000);
                player.call('sound:client', [3]);
                return;
            } else if (item == 'skateboard') {
                const SKATE_PRICE = Number(global.SKATEBOARD_PRICE_DP || 400);
                const curdp = Number(player.dp);
                if (curdp < SKATE_PRICE) return isNotify(player, 2, 'top-mid', 'Недостаточно DP для покупки.', 3000);
                if (!Array.isArray(player.inventory)) player.inventory = [];
                const alreadyHas = player.inventory.some((s) => typeof s === 'string' && s.toLowerCase().startsWith('item_skateboard'));
                if (alreadyHas) return isNotify(player, 2, 'top-mid', 'Скейтборд уже есть в инвентаре.', 3000);

                global.grantSkateboardToPlayer(player, (err, token, livery) => {
                    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                    if (err || !token) {
                        return isNotify(player, 2, 'top-mid', 'Не удалось создать скейтборд.', 3000);
                    }
                    const newdp = curdp - SKATE_PRICE;
                    global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, player.static], function (dbErr) {
                        if (dbErr) return console.log(dbErr);
                    });
                    player.call('updatedp', [global.formatnum1(newdp)]);
                    player.dp = newdp;

                    const skatePushed = typeof global.invGridTryPush === 'function'
                        ? global.invGridTryPush(player, token)
                        : (player.inventory.push(token), true);
                    if (!skatePushed) {
                        global.deleteSkateboardInstanceForItem(token);
                        return isNotify(player, 2, 'top-mid', 'Нет места в инвентаре.', 3000);
                    }
                    global.saveInventory(player);
                    if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                    else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                    isNotify(player, 3, 'top-mid', `Скейтборд куплен (раскраска ${livery}). −${global.formatnum1(SKATE_PRICE)} DP`, 5000);
                    player.call('sound:client', [3]);
                });
                return;
            } else if (item == 'GangwarChangeAppearance') {
                const APPEAR_PRICE = 150;
                if (player.vehicle) return isNotify(player, 2, 'top-mid', 'Выйдите из транспорта.', 3000);
                if (player.getVariable('dead')) return isNotify(player, 2, 'top-mid', 'Нельзя сменить внешность сейчас.', 3000);
                if (player.getVariable('charCreating') === true || player._appearanceEdit === true) {
                    return isNotify(player, 2, 'top-mid', 'Редактор внешности уже открыт.', 3000);
                }
                if (Number(player.dp) < APPEAR_PRICE) {
                    return isNotify(player, 2, 'top-mid', 'Недостаточно DP для покупки.', 3000);
                }
                player._appearanceEditPay = { method: 'dp', cost: APPEAR_PRICE };
                try { player.call('client.playermenu.close'); } catch (_eClose) {}
                if (typeof global.openAppearanceEditorForPlayer === 'function') {
                    setTimeout(function () {
                        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
                        global.openAppearanceEditorForPlayer(player);
                    }, 250);
                }
                return;
            }
        } else if (category == 'Privilege') {
            if (item == 'PlatinumVIP' || item == 'SilverVIP' || item == 'BronzeVIP') {
                let lvl;
                let sumvip;
                if (item == 'PlatinumVIP') {
                    lvl = 3;
                    sumvip = DONATE_PRIVILEGE_DP_PRICES.PlatinumVIP;
                } else if (item == 'SilverVIP') {
                    lvl = 2;
                    sumvip = DONATE_PRIVILEGE_DP_PRICES.SilverVIP;
                } else if (item == 'BronzeVIP') {
                    lvl = 1;
                    sumvip = DONATE_PRIVILEGE_DP_PRICES.BronzeVIP;
                }
                    
                global.DB.query('SELECT * FROM accounts WHERE static = ?', [player.static], function (err, results) {
                    if (err || results.length === 0) return;
            
                    if (Number(player.dp) < sumvip) 
                        return isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
                    if (player.viplvl == lvl) 
                        return isNotify(player, 2, "top-mid", `У вас уже имеется этот VIP статус.`, 3000);
                    if (player.viplvl > lvl) 
                        return isNotify(player, 2, "top-mid", `Лвл который вы пытаетесь купить меньше чем у вас.`, 3000);

                    if (!global.economyTryLock(player, 'buyVip', 5000)) {
                        return isNotify(player, 2, "top-mid", `Покупка уже обрабатывается.`, 2000);
                    }

                    global.economySpendDp(player, sumvip, (eSpend, ok) => {
                        if (!mp.players.exists(player)) return;
                        if (eSpend || !ok) {
                            global.economyUnlock(player, 'buyVip');
                            return isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
                        }
            
                        const vipExpireDate = new Date();
                        vipExpireDate.setDate(vipExpireDate.getDate() + 31);
                        const vipExpireDateString = vipExpireDate.toISOString().slice(0, 16).replace('T', ' ');
            
                        global.DB.query('UPDATE accounts SET viplvl = ?, vipdate = ? WHERE static = ?', [lvl, vipExpireDateString, player.static], function (err) {
                            global.economyUnlock(player, 'buyVip');
                            if (err) return console.log(err);
            
                            player.viplvl = lvl;
                            player.vipdate = vipExpireDate;
                            player.setVariable('viplvl', player.viplvl);
                            player.call('updateviplvl', [lvl]);

                            const daysLeft = Math.floor((vipExpireDate - new Date()) / (1000 * 60 * 60 * 24));
                            player.call('updatevipdate', [`${daysLeft}д.`]);
                            isNotify(player, 3, "top-mid", `Вы приобрели VIP статус ${lvl} уровня.`, 3000);
                            player.call('sound:client', [3]);
                            if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
                        });
                    });
                });
            } else if (item == 'OwnPrefix') {
                if (!trigger || typeof trigger !== 'string') {
                    isNotify(player, 2, "top-mid", `Введите префикс.`, 3000);
                    return;
                }
                if (trigger.length < 3) {
                    isNotify(player, 2, "top-mid", `Префикс слишком короткий. Минимум 3 символа.`, 3000);
                    return;
                }
                if (trigger.length > 10) {
                    isNotify(player, 2, "top-mid", `Префикс слишком длинный. Максимум 10 символов.`, 3000);
                    return;
                }
                const prefixPrice = DONATE_PRIVILEGE_DP_PRICES.OwnPrefix;
                if (Number(player.dp) < prefixPrice) {
                    isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
                    return
                }
                if (!global.economyTryLock(player, 'ownPrefix', 4000)) {
                    return isNotify(player, 2, "top-mid", `Покупка уже обрабатывается.`, 2000);
                }
                global.economySpendDp(player, prefixPrice, (eSpend, ok) => {
                    if (!mp.players.exists(player)) return;
                    if (eSpend || !ok) {
                        global.economyUnlock(player, 'ownPrefix');
                        return isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
                    }
                    global.DB.query('UPDATE accounts SET prefix = ? WHERE static = ?', [trigger, player.static], function (err) {
                        global.economyUnlock(player, 'ownPrefix');
                        if (err) return console.log(err);
                    });
                    player.prefix = trigger;
                    isNotify(player, 3, "top-mid", `-${global.formatnum1(prefixPrice)} DP`, 3000);
                    player.call('sound:client', [3]);
                });
            }
        } else if (category == 'Clothes') {
            if (['cobura', 'coburaw'].includes(item)) {
                let static = player.static;
        
                global.DB.query('SELECT cobura, coburaw FROM accounts WHERE static = ?', [static], function (err, results) {
                    if (err || results.length === 0) {
                        return;
                    }
        
                    const toCount = (v) => (v === true || v === 'true') ? 1 : (parseInt(v, 10) > 0 ? 1 : 0);
                    const r = results[0];
                    if (toCount(r[item]) >= 1) {
                        isNotify(player, 2, "top-mid", `У вас уже есть эта кабура.`, 3000);
                        return;
                    }
        
                    let price;
                    switch (item) {
                        case 'cobura':
                            price = 2500;
                            break;
                        case 'coburaw':
                            price = 2500;
                            break;
                        default:
                            return;
                    }
        
                    let curdp = player.dp;
                    if (Number(curdp) < price) {
                        isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
                        return;
                    }
                    if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
                        isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
                        return;
                    }

                    if (!global.economyTryLock(player, 'buyCobura', 4000)) {
                        return isNotify(player, 2, "top-mid", `Покупка уже обрабатывается.`, 2000);
                    }
                    global.economySpendDp(player, price, (eSpend, ok) => {
                        if (!mp.players.exists(player)) return;
                        if (eSpend || !ok) {
                            global.economyUnlock(player, 'buyCobura');
                            return isNotify(player, 2, "top-mid", `Недостаточно DP для покупки.`, 3000);
                        }
                        global.DB.query('UPDATE accounts SET ' + item + " = 'true' WHERE static = ?", [static], function (err) {
                            global.economyUnlock(player, 'buyCobura');
                            if (err) return console.log(err);
                        });
                        player.call('SetCoburaStatus', [item, 1, 1]);
                        isNotify(player, 3, "top-mid", `-${global.formatnum1(price)} DP`, 3000);
                        player.call('sound:client', [3]);
                        const holTok = `ivhol:${item}`;
                        if (global.tryPushInventoryItem && global.tryPushInventoryItem(player, holTok)) {
                            global.saveInventory(player);
                            if (global.emitPlayerInventory) global.emitPlayerInventory(player);
                        }
                    });
                });
            }
        } else if (category == 'Weapon') {
            if (item == 'weapon_precisionrifle' || item == 'weapon_sniperrifle' || item == 'weapon_svc' || item == 'weapon_marksmanrifle') {
                return isNotify(player, 2, 'top-mid', 'Эта снайперка снята с продажи.', 3500);
            }
            if (item == 'weapon_heavysniper_mk2') {
                const price = DONATE_SHOP_ITEM_DP_PRICES.weapon_heavysniper_mk2;
                if (!canAffordDonateShopItem(player, price)) return;
                if (!pushDonateShopInventoryItem(player, 'weapon_heavysniper_mk2')) {
                    return isNotify(player, 2, 'top-mid', 'Инвентарь полон, покупка невозможна.', 3500);
                }
                finishDonateShopDpPurchase(player, price, 'Heavy Sniper MKII приобретена');
                return;
            }
        } 
    } catch (error) {
        return;
    }
});

mp.events.add('changeLogin:server', (player, login) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        if (!login) return;
        
        const loginOk =
            typeof global.isValidAccountLogin === 'function'
                ? global.isValidAccountLogin(login)
                : /^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(login);
        if (!loginOk) {
            return isNotify(player, 2, "top-mid", "Логин: только буквы (RU/EN), цифры и символ _", 3500);
        }

        if (login.length < 3) {
            return isNotify(player, 2, "top-mid", "Логин должен содержать минимум 3 символа", 3000);
        }

        if (login.length > 15) {
            return isNotify(player, 2, "top-mid", "Логин должен содержать максимум 15 символов", 3000);
        }

        let price = DONATE_PRIVILEGE_DP_PRICES.ChangeLogin;
        let static = player.static;

        if (Number(player.dp) < price) {
            return isNotify(player, 2, "top-mid", "Недостаточно DP для смены логина.", 3000);
        }

        global.DB.query('SELECT * FROM accounts WHERE login = ?', [login], function (err, results) {
            if (err) return console.log(err);

            if (results.length > 0) {
                return isNotify(player, 2, "top-mid", "Этот логин уже занят.", 3000);
            }

            if (!global.economyTryLock(player, 'changeLogin', 5000)) {
                return isNotify(player, 2, "top-mid", "Подождите…", 2000);
            }

            global.economySpendDp(player, price, (eSpend, ok) => {
                if (!mp.players.exists(player)) return;
                if (eSpend || !ok) {
                    global.economyUnlock(player, 'changeLogin');
                    return isNotify(player, 2, "top-mid", "Недостаточно DP для смены логина.", 3000);
                }
                global.DB.query('UPDATE accounts SET login = ? WHERE static = ?', [login, static], (e2) => {
                    global.economyUnlock(player, 'changeLogin');
                    if (e2) {
                        if (typeof global.economyAddDp === 'function') global.economyAddDp(player, price);
                        return console.log(e2);
                    }
                    player.login = login;
                    try {
                        player.name = login;
                    } catch (_e) {}
                    try {
                        player.call('setlogin', [login]);
                    } catch (_e2) {}
                    isNotify(player, 3, "top-mid", `Логин изменён на ${login}. -${global.formatnum1(price)} DP`, 4000);
                    player.call('sound:client', [3]);
                    if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
                });
            });
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('updatedpbalance', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        global.DB.query('SELECT dp, money FROM accounts WHERE static = ?', [player.static], function (err, results) {
            if (err) return console.log(err);
            if (!results || results.length === 0) return;

            let dbDp = parseInt(results[0].dp, 10) || 0;
            let dbMoney = parseInt(results[0].money, 10) || 0;
            let changed = false;

            if (Number(player.dp) !== Number(dbDp)) {
                player.dp = dbDp;
                player.call('updatedp', [global.formatnum1(dbDp)]);
                changed = true;
            }

            if (Number(player.money) !== Number(dbMoney)) {
                player.money = dbMoney;
                player.call('updateMoney', [global.formatnum1(dbMoney)]);
                changed = true;
            }

            if (!changed) {
                // Balance already up to date — push profile silently so F2 displays correct data
                if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);
                return;
            }

            if (typeof global.pushMenuAccountProfile === 'function') global.pushMenuAccountProfile(player);

            isNotify(player, 3, "top-mid", `Баланс обновлён.`, 3000);
            player.call('sound:client', [3]);
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('activatepromo', (player, promo) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();

        const promoCode = promo.toLowerCase();

        global.DB.query('SELECT referred FROM accounts WHERE static = ?', [player.static], function (err, referredResults) {
            if (err) return console.log(err);
            if (referredResults.length === 0) return;

            if (referredResults[0].referred) {
                return isNotify(player, 2, "top-mid", `Вы уже активировали промокод.`, 2000);
            }

            global.activateStandardPromocode(player, promoCode);
        });
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('DonateVehicleTestDrive', (player, model) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, "top-mid", `Не так часто.`, 1500);
        player.clicked = new Date().getTime();
        
        if (player.dimension !== 0) return isNotify(player, 2, "top-mid", `Тест драйв доступен только в GHETTO GANGWAR.`, 3000);
        if (player.vehicle) return isNotify(player, 2, "top-mid", `Выйдите из машины.`, 3000);
        if (player.getVariable('ygon')) return isNotify(player, 2, "top-mid", "Вы не можете запустить тест-драйв, пока у вас активный квест.", 3000);
        if (player.carActive !== null) return isNotify(player, 2, "top-mid", `Эвакуируйте свою машину.`, 3000);
        if (player.getVariable('testdriveone') || player.getVariable('testdrivetwo')) return isNotify(player, 2, "top-mid", `Вы уже в тест драйве.`, 3000);

        isNotify(player, 3, "top-mid", `Вы начали тест-драйв.`, 1500);

        player.call('closemenu');

        const veh = mp.vehicles.new(mp.joaat(model), player.position, {
            heading: player.heading,
            numberPlate: global.flowVehiclePlate(),
            alpha: 255,
            locked: false,
            engine: false,
            dimension: 183
        });

        if (veh && mp.vehicles.exists(veh)) {
            const fr = Number(player.getVariable('fraction')) || 1;
            const colorveh = global.color[fr] || global.color[1];
            veh.setColor(colorveh[0], 0);
            veh.setVariable('owner', player.static);
            veh.setVariable('testdriveone', true);
            player.setVariable('testdriveone', true);
            player.carActive = veh;
            player.testdrivePosition = player.position;
            player.dimension = 183;
        }

        setTimeout(() => {
            if (!mp.players.exists(player)) return;
            if (!veh || !mp.vehicles.exists(veh)) return;

            player.putIntoVehicle(veh, 0);
        }, 200);

    } catch (error) {
        console.log(error);
    }
});

mp.events.add('EndTestDriveVehicle', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!player.getVariable('testdriveone')) return;

        isNotify(player, 3, "top-mid", `Вы завершили тест-драйв.`, 3000);

        const activeCar = player.carActive;
        if (activeCar && mp.vehicles.exists(activeCar) && activeCar.getVariable('testdriveone')) {
            player.setVariable('testdriveone', null);
            activeCar.setVariable('testdriveone', null);
            global.deleteVehTwo(activeCar);
            player.carActive = null;
            player.spawn(player.testdrivePosition);
            player.position = player.testdrivePosition;
            player.dimension = 0;
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('playerDeath', (player, reason, killer) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (player.getVariable('testdriveone')) {
            mp.events.call('EndTestDriveVehicle', player);
        }
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('vehicleDeath', (vehicle) => {
    try {
        if (!vehicle || !mp.vehicles.exists(vehicle) || vehicle.getVariable('deleted')) return;

        if (vehicle.getVariable('testdrivetwo') || vehicle.getVariable('fractioncar') === true) return;

        const player = mp.players.toArray().find(p => p.static == vehicle.getVariable('owner'));
        if (vehicle.getVariable('testdriveone')) {
            if (!player || !mp.players.exists(player)) return;
            mp.events.call('EndTestDriveVehicle', player);
        }
    } catch (error) {
        console.log(error);
    }
});

global.updateOrInsertClothes = function(staticId, fraction, column, valueToSave, callback) {
    try {
        const clothesFr =
            typeof global.getClothesFractionForPlayer === 'function'
                ? global.getClothesFractionForPlayer()
                : (fraction != null ? fraction : 0);
        const syncClothesRowCache = () => {
            try {
                mp.players.forEach((p) => {
                    if (!mp.players.exists(p) || p.static !== staticId) return;
                    if (!p._clothesRowCache) p._clothesRowCache = {};
                    p._clothesRowCache[column] = valueToSave;
                });
            } catch (_e) {}
        };
        global.DB.query(
            `SELECT * FROM clothes WHERE static = ? AND fraction = ?`,
            [staticId, clothesFr],
            (err, results) => {
                if (err) {
                    callback(err);
                    return;
                }
                if (results.length > 0) {
                    global.DB.query(
                        `UPDATE clothes SET ${column} = ? WHERE static = ? AND fraction = ?`,
                        [valueToSave, staticId, clothesFr],
                        (e2, res2) => {
                            if (!e2) syncClothesRowCache();
                            if (callback) callback(e2, res2);
                        }
                    );
                } else {
                    global.DB.query(
                        `INSERT INTO clothes (static, fraction, ${column}) VALUES (?, ?, ?)`,
                        [staticId, clothesFr, valueToSave],
                        (e2, res2) => {
                            if (!e2) syncClothesRowCache();
                            if (callback) callback(e2, res2);
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.log(error);
    }
}

const holsters = {
    "cobura": { slot: 7, drawable: 206, texture: 0, name: "Чёрную Кобуру" },
    "coburaw": { slot: 7, drawable: 206, texture: 1, name: "Белую Кобуру" }
};

/** og_frog_clothes / муж. freemode: слот 5 — полный реестр сумок в global.DONATE_BAGS_REGISTRY (inventory_equipment.js). */
mp.events.add('GetCoburaStatus', (player, coburaId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const id = String(coburaId || '').toLowerCase();
        if (!['cobura', 'coburaw'].includes(id)) return;
        player.call('SetCoburaStatus', [id, 0, 0]);
    } catch (error) {
        console.log(error);
    }
});

mp.events.add('SellCoburaToPlayer', (player, coburaId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        isNotify(player, 2, "top-mid", "Продажа кабуры через F3 отключена. Обмен — через инвентарь / торговлю.", 4500);
    } catch (error) {
        console.log(error);
    }
});

/** Надевание сумок/кабур только через инвентарь (ivhol/ivbag), не через F3. */
mp.events.add("DonateClothes", (player, coburaid) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const id = String(coburaid || '');
        const isBag = global.DONATE_BAGS_REGISTRY && global.DONATE_BAGS_REGISTRY[id];
        if (isBag || holsters[id]) {
            isNotify(player, 2, "top-mid", "Сумки и кабуры надеваются только через инвентарь (I).", 4000);
        }
    } catch (error) {
        console.log(error);
    }
});

const CROSSHAIR_JSON_DB_MAX = 12000;
const CROSSHAIR_DB_FLUSH_MS = 900;

function flushCrosshairJsonPending(player) {
    if (!player || !mp.players.exists(player)) return;
    player._crosshairDbFlushTimer = null;
    let payload = player._crosshairJsonPending;
    player._crosshairJsonPending = null;
    if (!payload || !global.DB) return;
    const sid = player.static;
    if (sid == null || sid === '') return;

    // Совместимость: строка JSON или { json, enabled }
    let jsonStr = null;
    let enabledHint = null;
    if (typeof payload === 'string') {
        jsonStr = payload;
    } else if (payload && typeof payload === 'object' && typeof payload.json === 'string') {
        jsonStr = payload.json;
        if (payload.enabled !== undefined) enabledHint = payload.enabled ? 1 : 0;
    }
    if (!jsonStr || !jsonStr.length) return;

    let enabled = enabledHint;
    try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object' && Number(parsed.v) === 2) {
            if (typeof parsed.enabled === 'boolean') enabled = parsed.enabled ? 1 : 0;
            else if (enabled == null) enabled = 1;
        }
    } catch (_e) {}

    if (enabled != null) {
        global.DB.query(
            'UPDATE accounts SET crosshair_json = ?, crosshair_enabled = ? WHERE static = ? LIMIT 1',
            [jsonStr, enabled, sid],
            (err) => {
                if (err) console.log('[crosshair] save:', err.code || err.message);
            }
        );
        return;
    }
    global.DB.query(
        'UPDATE accounts SET crosshair_json = ? WHERE static = ? LIMIT 1',
        [jsonStr, sid],
        (err) => {
            if (err) console.log('[crosshair] save:', err.code || err.message);
        }
    );
}

function isValidCrosshairSavePayload(parsed) {
    if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object') return true;
    if (!parsed || typeof parsed !== 'object' || Number(parsed.v) !== 2) return false;
    // v2 с пустым type = «Стандартный» (сброс) — валидный сейв
    if (parsed.reticle && typeof parsed.reticle.type === 'string') return true;
    if (Array.isArray(parsed.phantom) && parsed.phantom[0] && typeof parsed.phantom[0] === 'object') return true;
    return false;
}

function flushCrosshairEnabledPending(player) {
    if (!player || !mp.players.exists(player)) return;
    player._crosshairEnabledDbFlushTimer = null;
    if (player._crosshairEnabledPending == null || !global.DB) return;
    const sid = player.static;
    if (sid == null || sid === '') return;
    const val = player._crosshairEnabledPending ? 1 : 0;
    player._crosshairEnabledPending = null;
    global.DB.query(
        'UPDATE accounts SET crosshair_enabled = ? WHERE static = ? LIMIT 1',
        [val, sid],
        () => {}
    );
}

/** Клиент: mp.events.callRemote — полный JSON прицела (тип, размеры, DefaultColor, TargetColor, …). */
mp.events.add('crosshairSettingsSave:s', (player, jsonStr) => {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return;
        const sid = player.static;
        if (sid == null || sid === '') return;
        const raw = jsonStr == null ? '' : String(jsonStr);
        if (!raw.length || raw.length > CROSSHAIR_JSON_DB_MAX) return;
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (_e) {
            return;
        }
        if (!isValidCrosshairSavePayload(parsed)) return;
        player._crosshairJsonPending = raw;
        if (player._crosshairDbFlushTimer) return;
        player._crosshairDbFlushTimer = setTimeout(() => flushCrosshairJsonPending(player), CROSSHAIR_DB_FLUSH_MS);
    } catch (_e) {}
});

/** Клиент: вкл/выкл кастомного прицела (мастер-тумблер). */
mp.events.add('crosshairEnabledSave:s', (player, flagRaw) => {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return;
        const sid = player.static;
        if (sid == null || sid === '') return;
        const enabled = flagRaw === true || flagRaw === 1 || flagRaw === '1' || flagRaw === 'true';
        player._crosshairEnabledPending = enabled;
        if (player._crosshairEnabledDbFlushTimer) return;
        player._crosshairEnabledDbFlushTimer = setTimeout(() => flushCrosshairEnabledPending(player), CROSSHAIR_DB_FLUSH_MS);
    } catch (_e) {}
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        if (player._crosshairJsonPending) {
            if (player._crosshairDbFlushTimer) {
                clearTimeout(player._crosshairDbFlushTimer);
                player._crosshairDbFlushTimer = null;
            }
            flushCrosshairJsonPending(player);
        }
        if (player._crosshairEnabledPending != null) {
            if (player._crosshairEnabledDbFlushTimer) {
                clearTimeout(player._crosshairEnabledDbFlushTimer);
                player._crosshairEnabledDbFlushTimer = null;
            }
            flushCrosshairEnabledPending(player);
        }
    } catch (_e) {}
});

function armorCosmeticEquippedPayload(player) {
    let eq =
        (player._cosmeticArmorPersist != null && String(player._cosmeticArmorPersist).trim()) ||
        (player._clothesRowCache && player._clothesRowCache.armor != null
            ? String(player._clothesRowCache.armor).trim()
            : '');
    if (!eq) return '';
    const parts = eq.split(':');
    const d = Number(parts[0]);
    const t = Number.isFinite(Number(parts[1])) ? Number(parts[1]) : 0;
    if (!ARMOR_COSMETIC.isAllowedDonationArmorPair(d, t)) return eq;
    const migrated = ARMOR_COSMETIC.migrateDonationArmorPair(d, t);
    return `${migrated.d}:${migrated.t}`;
}

function collectPlayerArmorUnlocks(player, cb) {
    if (!mp.players.exists(player)) return cb([]);
    const staticId = player.static;
    if (!staticId) return cb(ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks));

    const mergeArmorValues = (baseUnlocks, armorValues) => {
        const unlocks = ARMOR_COSMETIC.normalizeUnlockArray(baseUnlocks);
        const seen = new Set(unlocks);
        if (!armorValues || !armorValues.length) return unlocks;
        for (let i = 0; i < armorValues.length; i++) {
            const raw = String(armorValues[i] || '').trim();
            if (!raw || raw === '0:0' || raw === '0') continue;
            const parts = raw.split(':');
            if (parts.length < 2) continue;
            const migrated = ARMOR_COSMETIC.migrateDonationArmorPair(parts[0], parts[1]);
            if (!ARMOR_COSMETIC.isAllowedDonationArmorPair(migrated.d, migrated.t)) continue;
            const key = ARMOR_COSMETIC.unlockKey(migrated.d, migrated.t);
            if (!seen.has(key)) {
                seen.add(key);
                unlocks.push(key);
            }
        }
        return unlocks;
    };

    global.DB.query(
        'SELECT armor_cosmetic_unlocks FROM accounts WHERE static = ? LIMIT 1',
        [staticId],
        (errAcc, accRows) => {
            if (errAcc) {
                console.log('[armor] accounts unlocks query:', errAcc.message || errAcc);
                const fallback = ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks);
                return cb(fallback, { dbAccError: true });
            }
            const fromAcc =
                accRows && accRows[0]
                    ? accRows[0].armor_cosmetic_unlocks
                    : player.armorCosmeticUnlocks;

            global.DB.query(
                'SELECT armor FROM clothes WHERE static = ? AND armor IS NOT NULL AND armor != ? AND armor != ?',
                [staticId, '', '0:0'],
                (err, rows) => {
                    if (err) console.log('[armor] clothes query:', err.message || err);
                    const armorVals = (rows || []).map((r) => r.armor);
                    const fromDb = ARMOR_COSMETIC.normalizeUnlockArray(fromAcc);
                    const fromPlayer = ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks);
                    let baseList = fromDb.slice();
                    if (!baseList.length) baseList = fromPlayer.slice();
                    else {
                        for (let pi = 0; pi < fromPlayer.length; pi++) {
                            if (!baseList.includes(fromPlayer[pi])) baseList.push(fromPlayer[pi]);
                        }
                    }
                    cb(mergeArmorValues(baseList, armorVals), { dbAccError: false });
                }
            );
        }
    );
}

function persistPlayerArmorUnlocks(player, unlocks, cb) {
    if (!player || !player.static || !global.DB) {
        if (typeof cb === 'function') cb();
        return;
    }
    const normalized = ARMOR_COSMETIC.normalizeUnlockArray(unlocks);
    player.armorCosmeticUnlocks = normalized;
    global.DB.query(
        'UPDATE accounts SET armor_cosmetic_unlocks = ? WHERE static = ?',
        [JSON.stringify(normalized), player.static],
        (err) => {
            if (err) console.log('[armor] persist unlocks:', err.message || err);
            if (typeof cb === 'function') cb(normalized);
        }
    );
}

global.syncPlayerArmorCosmeticUnlocks = function (player, cb) {
    collectPlayerArmorUnlocks(player, (unlocks, meta) => {
        if (!mp.players.exists(player)) return;
        const prev = JSON.stringify(ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks));
        const next = JSON.stringify(unlocks);
        player.armorCosmeticUnlocks = unlocks;
        const finish = () => {
            try {
                pushArmorCosmeticShop(player);
            } catch (_pushErr) {}
            if (typeof cb === 'function') cb(unlocks);
        };
        if (prev !== next && !(meta && meta.dbAccError)) {
            persistPlayerArmorUnlocks(player, unlocks, finish);
        } else {
            finish();
        }
    });
};

function pushArmorCosmeticShop(player) {
    if (!mp.players.exists(player)) return;
    const unlocks = ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks);
    player.call('armorCosmeticShopPush', [
        JSON.stringify({ unlocks, equipped: armorCosmeticEquippedPayload(player) })
    ]);
}

mp.events.add('armorCosmeticShopPull:s', (player) => {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return;
        pushArmorCosmeticShop(player);
    } catch (_e) {}
});

function pushCasesCatalogToClient(player) {
    if (!mp.players.exists(player)) return;
    try {
        const payload = DONATE_CASES.getClientCasesCatalogPayload();
        player.call('casesCatalogPush', [JSON.stringify(payload)]);
    } catch (_e) {}
}
global.pushCasesCatalogToClient = pushCasesCatalogToClient;

mp.events.add('casesCatalogPull:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        pushCasesCatalogToClient(player);
    } catch (_e) {}
});

function resolvePlayerClothesFraction(player) {
    const fr = parseInt(player.getVariable('fraction'), 10) || 0;
    return (fr >= 1 && fr <= 6) ? fr : 1;
}

mp.events.add('armorCosmeticEquip:s', (player, dRaw, tRaw) => {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return;
        const d = parseInt(String(dRaw), 10);
        const t = parseInt(String(tRaw), 10);
        if (!ARMOR_COSMETIC.isAllowedDonationArmorPair(d, t)) {
            return isNotify(player, 2, 'top-mid', 'Некорректный скин бронежилета.', 2500);
        }
        const key = ARMOR_COSMETIC.unlockKey(d, t);
        const unlocks = ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks);
        if (!unlocks.includes(key)) {
            return isNotify(player, 2, 'top-mid', 'Сначала получите этот скин из кейса Armor.', 3500);
        }
        const staticId = player.static;
        if (!staticId) {
            return isNotify(player, 2, 'top-mid', 'Не удалось сохранить скин.', 3000);
        }
        const fr = resolvePlayerClothesFraction(player);
        const val = `${d}:${t}`;
        if (!player._clothesRowCache) player._clothesRowCache = {};
        player._clothesRowCache.armor = val;
        player._cosmeticArmorPersist = val;
        global.updateOrInsertClothes(staticId, fr, 'armor', val, () => {});
        if (player.getVariable('armor') === true && typeof global.applyGameplayArmorVestVisual === 'function') {
            global.applyGameplayArmorVestVisual(player);
        } else {
            player.setClothes(9, 0, 0, 0);
        }
        pushArmorCosmeticShop(player);
        if (player.getVariable('armor') === true && typeof global.scheduleGameplayArmorVestVisual === 'function') {
            global.scheduleGameplayArmorVestVisual(player, [0, 200, 600]);
        } else if (player.getVariable('armor') === true && typeof global.applyGameplayArmorVestVisual === 'function') {
            global.applyGameplayArmorVestVisual(player);
        }
        isNotify(player, 3, 'top-mid', 'Скин бронежилета сохранён.', 3200);
    } catch (_e) {}
});

function clearEquippedArmorCosmeticIfKey(player, key) {
    if (!mp.players.exists(player) || !key) return;
    const eq = armorCosmeticEquippedPayload(player);
    const migratedEq = (() => {
        if (!eq || !String(eq).includes(':')) return eq;
        const parts = String(eq).split(':');
        const m = ARMOR_COSMETIC.migrateDonationArmorPair(parts[0], parts[1]);
        return ARMOR_COSMETIC.unlockKey(m.d, m.t);
    })();
    if (migratedEq !== key && eq !== key) return;

    const staticId = player.static;
    if (!staticId) return;
    const fr = resolvePlayerClothesFraction(player);
    if (!player._clothesRowCache) player._clothesRowCache = {};
    player._clothesRowCache.armor = '';
    player._cosmeticArmorPersist = '';
    try {
        global.updateOrInsertClothes(staticId, fr, 'armor', '', () => {});
    } catch (_e) {}
    try {
        if (player.getVariable('armor') === true && typeof global.applyGameplayArmorVestVisual === 'function') {
            global.applyGameplayArmorVestVisual(player);
        } else {
            player.setClothes(9, 0, 0, 0);
        }
    } catch (_e2) {}
}

global.armorCosmeticGiftUnwrap = function (player, itemName, slotTypeRaw, slotIndexRaw) {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return;
        const parsed = ARMOR_COSMETIC.parseGiftToken(itemName);
        if (!parsed) {
            return isNotify(player, 2, 'top-mid', 'Некорректный подарок скина.', 2500);
        }

        const si = parseInt(slotIndexRaw, 10);
        const st = String(slotTypeRaw || '').trim();
        if (Number.isInteger(si) && si >= 0 && (st === 'bagItem' || st === 'bag')) {
            return isNotify(player, 2, 'top-mid', 'Сначала перенесите предмет в инвентарь.', 3500);
        }
        const opts = {};
        if (Number.isInteger(si) && si >= 0) {
            opts.slotIndex = si;
            if (st === 'bagItem' || st === 'bag') opts.source = 'bag';
            else if (st === 'weapon') opts.source = 'fast';
            else opts.source = 'grid';
        }

        if (typeof global.consumeArmorGiftTokenForPlayer !== 'function') return;
        if (!global.consumeArmorGiftTokenForPlayer(player, String(itemName).split('(')[0].trim(), opts)) {
            return isNotify(player, 2, 'top-mid', 'Подарок не найден в инвентаре.', 3000);
        }

        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

        const unlocks = ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks);
        const skinName =
            (parsed.variant && parsed.variant.name) || `Скин ${parsed.key}`;

        if (unlocks.includes(parsed.key)) {
            const amount = 12500;
            let newMoney = parseInt(player.money, 10) + amount;
            if (!Number.isFinite(newMoney)) newMoney = amount;
            player.money = newMoney;
            global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err) {
                if (err) console.log('[armor-gift-dup]', err.message || err);
            });
            player.call('updateMoney', [global.formatnum1(newMoney)]);
            isNotify(
                player,
                2,
                'top-mid',
                `У вас уже есть «${skinName}». ${global.formatnum1(amount)}$ начислены на баланс.`,
                4000
            );
            player.call('sound:client', [2]);
            pushArmorCosmeticShop(player);
            return;
        }

        unlocks.push(parsed.key);
        persistPlayerArmorUnlocks(player, unlocks, () => {
            try {
                if (mp.players.exists(player)) pushArmorCosmeticShop(player);
            } catch (_e) {}
        });
        pushArmorCosmeticShop(player);
        isNotify(
            player,
            3,
            'top-mid',
            `«${skinName}» доступен в F3 → Магазин → Бронежилет.`,
            4000
        );
        player.call('sound:client', [3]);
    } catch (err) {
        console.log('[armorCosmeticGiftUnwrap]', err);
    }
};

mp.events.add('armorCosmeticGiftWrap:s', (player, dRaw, tRaw) => {
    try {
        if (!mp.players.exists(player) || player.getVariable('auth') !== true) return;
        if (new Date().getTime() - (player.clicked || 0) < 800) {
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        }
        player.clicked = new Date().getTime();

        const d = parseInt(String(dRaw), 10);
        const t = parseInt(String(tRaw), 10);
        if (!ARMOR_COSMETIC.isAllowedDonationArmorPair(d, t)) {
            return isNotify(player, 2, 'top-mid', 'Некорректный скин бронежилета.', 2500);
        }
        const migrated = ARMOR_COSMETIC.migrateDonationArmorPair(d, t);
        const key = ARMOR_COSMETIC.unlockKey(migrated.d, migrated.t);
        const unlocks = ARMOR_COSMETIC.normalizeUnlockArray(player.armorCosmeticUnlocks);
        if (!unlocks.includes(key)) {
            return isNotify(player, 2, 'top-mid', 'Этот скин у вас не открыт.', 3000);
        }

        const giftTok = ARMOR_COSMETIC.giftTokenFromUnlockKey(key);
        if (!giftTok) {
            return isNotify(player, 2, 'top-mid', 'Не удалось создать подарок.', 3000);
        }

        if (global.isPlayerInventoryFull && global.isPlayerInventoryFull(player)) {
            return isNotify(player, 2, 'top-mid', 'Инвентарь полон.', 3000);
        }
        if (typeof global.invGridTryPush !== 'function' || !global.invGridTryPush(player, giftTok)) {
            return isNotify(player, 2, 'top-mid', 'Инвентарь полон.', 3000);
        }

        const nextUnlocks = unlocks.filter((k) => k !== key);
        clearEquippedArmorCosmeticIfKey(player, key);
        persistPlayerArmorUnlocks(player, nextUnlocks, () => {
            try {
                if (mp.players.exists(player)) pushArmorCosmeticShop(player);
            } catch (_e) {}
        });
        pushArmorCosmeticShop(player);

        global.saveInventory(player);
        if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
        else player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);

        const skinName =
            (ARMOR_COSMETIC.getVariantByUnlockKey(key) &&
                ARMOR_COSMETIC.getVariantByUnlockKey(key).name) ||
            key;
        isNotify(
            player,
            3,
            'top-mid',
            `«${skinName}» упакован в подарок.`,
            3000
        );
        player.call('sound:client', [3]);
    } catch (err) {
        console.log('[armorCosmeticGiftWrap:s]', err);
    }
});

function playerHasChangeNameItem(player) {
    if (!player || !Array.isArray(player.inventory)) return false;
    return player.inventory.some((s) => typeof s === 'string' && s.split('(')[0].trim() === 'item_change_name');
}

function consumeChangeNameItem(player) {
    if (!player || !Array.isArray(player.inventory)) return false;
    const idx = player.inventory.findIndex((s) => typeof s === 'string' && s.split('(')[0].trim() === 'item_change_name');
    if (idx < 0) return false;
    player.inventory[idx] = null;
    if (typeof global.ensureInventoryGrid50 === 'function') global.ensureInventoryGrid50(player);
    return true;
}

mp.events.add('changeLoginFromItem:server', (player, login) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;

        if (new Date().getTime() - player.clicked < 1000) return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        player.clicked = new Date().getTime();

        if (!playerHasChangeNameItem(player)) {
            return isNotify(player, 2, 'top-mid', 'У вас нет предмета «Смена ника».', 3000);
        }

        if (!login) return;

        const loginOk =
            typeof global.isValidAccountLogin === 'function'
                ? global.isValidAccountLogin(login)
                : /^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(login);
        if (!loginOk) {
            return isNotify(player, 2, 'top-mid', 'Логин: только буквы (RU/EN), цифры и символ _', 3500);
        }

        if (login.length < 3) {
            return isNotify(player, 2, 'top-mid', 'Логин должен содержать минимум 3 символа', 3000);
        }

        if (login.length > 15) {
            return isNotify(player, 2, 'top-mid', 'Логин должен содержать максимум 15 символов', 3000);
        }

        const static = player.static;

        global.DB.query('SELECT * FROM accounts WHERE login = ?', [login], function (err, results) {
            if (err) return console.log(err);

            if (results.length > 0) {
                return isNotify(player, 2, 'top-mid', 'Этот логин уже занят.', 3000);
            }

            if (!consumeChangeNameItem(player)) {
                return isNotify(player, 2, 'top-mid', 'У вас нет предмета «Смена ника».', 3000);
            }

            global.DB.query('UPDATE accounts SET login = ? WHERE static = ?', [login, static], (err2) => {
                if (err2) return console.log(err2);
                if (typeof global.saveInventory === 'function') global.saveInventory(player);
                if (typeof global.emitPlayerInventory === 'function') global.emitPlayerInventory(player);
                player.login = login;
                player.call('setlogin', [player.login]);
                isNotify(player, 3, 'top-mid', `Логин изменён на ${login}`, 3000);
                player.call('sound:client', [3]);
            });
        });
    } catch (error) {
        console.log(error);
    }
});

