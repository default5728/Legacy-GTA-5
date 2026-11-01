'use strict';

const MAX_BANK_TRANSFER = 100000000;
const MIN_BANK_TRANSFER = 5000;
const EPSILON_GOAL = global.EPSILON_GOAL || 5000000;

function parseBankAmount(amountStr) {
    const raw = String(amountStr == null ? '' : amountStr).replace(/\s/g, '').replace(/[^\d]/g, '');
    const amount = parseInt(raw, 10);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function pushPhoneBankState(player) {
    if (!player || !mp.players.exists(player)) return;
    const donated = parseInt(player.epsilonDonated, 10) || 0;
    const payload = {
        cash: parseInt(Number(player.money), 10) || 0,
        hasFamily: !!(player.family && String(player.family).trim()),
        hasFraction: !!(parseInt(player.getVariable('fraction'), 10) || 0),
        familyName: String(player.family || '').trim(),
        fractionId: parseInt(player.getVariable('fraction'), 10) || 0,
        epsilonDonated: donated,
        epsilonGoal: EPSILON_GOAL,
        epsilonUnlocked: typeof global.isPlayerEpsilonUnlocked === 'function'
            ? global.isPlayerEpsilonUnlocked(player)
            : donated >= EPSILON_GOAL
    };
    player.call('phone:bank:state:c', [JSON.stringify(payload)]);
}

mp.events.add('phone:bank:open:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        pushPhoneBankState(player);
    } catch (e) {
        console.log('[BANK]', e.message || e);
    }
});

/** Перевод игроку по статику (офлайн и онлайн — через БД) */
mp.events.add('phone:bank:transfer:s', (player, targetStaticRaw, amountStr) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const targetStatic = parseInt(String(targetStaticRaw || '').replace(/\D/g, ''), 10);
        const amount = parseBankAmount(amountStr);
        if (!targetStatic) return isNotify(player, 2, 'top-mid', 'Укажите статик получателя.', 3000);
        if (amount < MIN_BANK_TRANSFER) return isNotify(player, 2, 'top-mid', 'Минимальная сумма перевода — 5.000$.', 3000);
        if (amount > MAX_BANK_TRANSFER) return isNotify(player, 2, 'top-mid', 'Максимальная сумма — 100.000.000$.', 3000);
        if (player.getVariable('jail') === true) return isNotify(player, 2, 'top-mid', 'Нельзя переводить в деморгане.', 3000);
        if (targetStatic === Number(player.static)) return isNotify(player, 2, 'top-mid', 'Нельзя перевести себе.', 3000);
        if (amount > Number(player.money)) return isNotify(player, 2, 'top-mid', 'Недостаточно наличных.', 3000);
        if (typeof global.economyTryLock === 'function' && !global.economyTryLock(player, 'bank', 8000)) {
            return isNotify(player, 2, 'top-mid', 'Подождите, операция уже выполняется.', 2500);
        }

        const finishTransfer = (targetLogin, targetOnline) => {
            if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
            isNotify(player, 3, 'top-mid', `Переведено ${global.formatnum1(amount)}$ игроку ${targetLogin}.`, 3500);
            if (targetOnline && mp.players.exists(targetOnline)) {
                isNotify(targetOnline, 3, 'top-mid', `Поступило ${global.formatnum1(amount)}$ от ${player.login}.`, 3500);
            }
            pushPhoneBankState(player);
        };

        const creditTarget = (targetLogin, targetOnline) => {
            if (typeof global.economyAddMoney !== 'function') {
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
                return isNotify(player, 2, 'top-mid', 'Перевод временно недоступен.', 3000);
            }
            global.economyAddMoney(targetStatic, amount, (errAdd) => {
                if (!mp.players.exists(player)) return;
                if (errAdd) {
                    global.economyAddMoney(player, amount, () => {});
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
                    return isNotify(player, 2, 'top-mid', 'Ошибка перевода. Средства возвращены.', 3500);
                }
                finishTransfer(targetLogin, targetOnline);
            });
        };

        const spendSender = (targetLogin, targetOnline) => {
            global.economySpendMoney(player, amount, (errSpend, okSpend) => {
                if (!mp.players.exists(player)) return;
                if (errSpend || !okSpend) {
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
                    return isNotify(player, 2, 'top-mid', 'Недостаточно наличных.', 3000);
                }
                creditTarget(targetLogin, targetOnline);
            });
        };

        const targetOnline = mp.players.toArray().find((p) => Number(p.static) === targetStatic);
        if (targetOnline) {
            return spendSender(targetOnline.login, targetOnline);
        }

        global.DB.query(
            'SELECT static, login FROM accounts WHERE static = ? LIMIT 1',
            [targetStatic],
            (err, rows) => {
                if (!mp.players.exists(player)) return;
                if (err || !rows || !rows.length) {
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
                    return isNotify(player, 2, 'top-mid', 'Игрок с таким статиком не найден.', 3000);
                }
                spendSender(String(rows[0].login || `Static ${targetStatic}`), null);
            }
        );
    } catch (e) {
        if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
        console.log('[BANK] transfer:', e.message || e);
    }
});

mp.events.add('phone:bank:family:deposit:s', (player, amountStr) => {
    mp.events.call('family:balance:deposit:s', player, amountStr);
    setTimeout(() => { if (mp.players.exists(player)) pushPhoneBankState(player); }, 400);
});

mp.events.add('phone:bank:fraction:deposit:s', (player, amountStr) => {
    mp.events.call('fraction:balance:deposit:s', player, amountStr);
    setTimeout(() => { if (mp.players.exists(player)) pushPhoneBankState(player); }, 400);
});

/** Пополнение счёта Epsilon (накопительно, разблокировка рукопожатия). */
mp.events.add('phone:bank:epsilon:deposit:s', (player, amountStr) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const amount = parseBankAmount(amountStr);
        if (amount < MIN_BANK_TRANSFER) {
            return isNotify(player, 2, 'top-mid', 'Минимальная сумма — 5.000$.', 3000);
        }
        if (amount > MAX_BANK_TRANSFER) {
            return isNotify(player, 2, 'top-mid', 'Максимальная сумма — 100.000.000$.', 3000);
        }
        if (player.getVariable('jail') === true) {
            return isNotify(player, 2, 'top-mid', 'Нельзя переводить в деморгане.', 3000);
        }
        if (amount > Number(player.money)) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно наличных.', 3000);
        }
        if (typeof global.economyTryLock === 'function' && !global.economyTryLock(player, 'bank', 8000)) {
            return isNotify(player, 2, 'top-mid', 'Подождите, операция уже выполняется.', 2500);
        }

        const wasUnlocked = typeof global.isPlayerEpsilonUnlocked === 'function'
            ? global.isPlayerEpsilonUnlocked(player)
            : false;
        const prevDonated = parseInt(player.epsilonDonated, 10) || 0;
        const newDonated = prevDonated + amount;
        const nowUnlocked = newDonated >= EPSILON_GOAL;
        const senderStatic = Number(player.static);

        global.economySpendMoney(player, amount, (errSpend, okSpend) => {
            if (!mp.players.exists(player)) return;
            if (errSpend || !okSpend) {
                if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
                return isNotify(player, 2, 'top-mid', 'Недостаточно наличных.', 3000);
            }

            global.DB.query(
                'UPDATE accounts SET epsilon_donated = ?, epsilon_unlocked = ? WHERE static = ?',
                [newDonated, nowUnlocked ? 1 : 0, senderStatic],
                (err) => {
                    if (!mp.players.exists(player)) return;
                    if (err) {
                        console.log('[BANK] epsilon deposit:', err.message || err);
                        global.economyAddMoney(player, amount, () => {});
                        if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
                        return isNotify(player, 2, 'top-mid', 'Ошибка перевода на Epsilon.', 3000);
                    }
                    player.epsilonDonated = newDonated;
                    player.epsilonUnlocked = nowUnlocked;
                    player.setVariable('epsilonUnlocked', nowUnlocked ? true : null);
                    if (typeof global.economyUnlock === 'function') global.economyUnlock(player, 'bank');
                    isNotify(
                        player,
                        3,
                        'top-mid',
                        `На счёт Epsilon переведено ${global.formatnum1(amount)}$. Всего: ${global.formatnum1(newDonated)} / ${global.formatnum1(EPSILON_GOAL)}$.`,
                        4500
                    );
                    if (!wasUnlocked && nowUnlocked) {
                        isNotify(
                            player,
                            1,
                            'top-mid',
                            'Доступна новая анимация рукопожатия Epsilon!',
                            6500
                        );
                        if (typeof global.tryCompleteNewbieQuest === 'function') {
                            global.tryCompleteNewbieQuest(player, 'buy_epsilon');
                        }
                    }
                    pushPhoneBankState(player);
                }
            );
        });
    } catch (e) {
        console.log('[BANK] epsilon:deposit:', e.message || e);
    }
});

console.log('[BANK] bank_phone.js loaded');
