const MSK_OFFSET = 3;
/** PayDay в час (день 09:55–23:55 МСК). Ночь — x2 к дневной сумме. */
const PAYDAY_BY_VIP = { 0: 20000, 1: 25000, 2: 30000, 3: 36000 };
/** Ночной режим PayDay: 23:55 — 09:55 МСК (день с 09:55). */
const PAYDAY_NIGHT_START_MIN = 23 * 60 + 55;
const PAYDAY_NIGHT_END_MIN = 9 * 60 + 55;
let startScript = (new Date().getUTCHours() + MSK_OFFSET + 1) % 24;
/** Доход семьи за каждую захваченную точку войны семей (в час, МСК). */
const FAMILY_TERRITORY_MONEY_PER_HOUR = 5000;
const FAMILY_TERRITORY_FRP_PER_HOUR = 10;
/** Dedup: одно начисление за территории за московский час */
let lastTerritoryFrpMskHour = null;

global.getFamilyTerritoryHourlyIncome = function getFamilyTerritoryHourlyIncome(territoriesRaw) {
    const territories = Math.max(0, parseInt(territoriesRaw, 10) || 0);
    return {
        territories,
        moneyPerHour: territories * FAMILY_TERRITORY_MONEY_PER_HOUR,
        reputationPerHour: territories * FAMILY_TERRITORY_FRP_PER_HOUR
    };
};
setInterval(timer30sec, 30000);

function timer30sec() {
    let date = new Date();
    let currentHour = (date.getUTCHours() + MSK_OFFSET) % 24;
    let currentMinute = date.getMinutes();

    const utcMs = date.getTime();
    const totalMinUtc = date.getUTCHours() * 60 + date.getUTCMinutes();
    const mskMinOfDay = ((totalMinUtc + MSK_OFFSET * 60) % 1440 + 1440) % 1440;
    const mskMinute = mskMinOfDay % 60;
    if (mskMinute === 0) {
        const mskHourBucket = Math.floor((utcMs + MSK_OFFSET * 3600000) / 3600000);
        if (lastTerritoryFrpMskHour !== mskHourBucket) {
            lastTerritoryFrpMskHour = mskHourBucket;
            grantFamilyTerritoryIncome();
        }
    }

    if (currentMinute === 0 && currentHour === startScript) {
        startScript = (startScript + 1) % 24;
        runPayDay(isPaydayNightMode(mskMinOfDay));
    }
}

function grantFamilyTerritoryIncome() {
    try {
        if (!global.DB_READY || !global.DB) return;
        global.DB.query(
            'UPDATE families SET balance = balance + (territories * ?), rating_points = rating_points + (territories * ?) WHERE territories > 0',
            [FAMILY_TERRITORY_MONEY_PER_HOUR, FAMILY_TERRITORY_FRP_PER_HOUR],
            (err) => {
                if (err) {
                    console.log('[PayDay] family territory income:', err);
                    return;
                }
                global.DB.query(
                    'SELECT name, balance FROM families WHERE territories > 0',
                    [],
                    (err2, rows) => {
                        if (err2) {
                            console.log('[PayDay] family territory income select:', err2);
                            return;
                        }
                        (rows || []).forEach((row) => {
                            if (typeof global.broadcastFamilyBalance === 'function') {
                                global.broadcastFamilyBalance(row.name, row.balance);
                            }
                        });
                    }
                );
            }
        );
    } catch (e) {
        console.log(e);
    }
}

function isPaydayNightMode(mskMinOfDay) {
    return mskMinOfDay >= PAYDAY_NIGHT_START_MIN || mskMinOfDay < PAYDAY_NIGHT_END_MIN;
}

function getPaydayAmount(viplvl, nightMode) {
    const vip = Math.min(3, Math.max(0, Number(viplvl) || 0));
    let amount = PAYDAY_BY_VIP[vip] || PAYDAY_BY_VIP[0];
    if (nightMode) amount *= 2;
    if (typeof global.applyServerX2Amount === 'function') {
        amount = global.applyServerX2Amount(amount);
    }
    return amount;
}

function runPayDay(nightMode) {
    mp.players.forEach(player => {
        if (!player.getVariable('auth')) {
            return;
        }
        const bonuspayday = getPaydayAmount(player.viplvl, nightMode);
        player.outputChatBox(`!{#ffa600}[PayDay] !{#00a2ff}Вы получили ${global.formatnum1(bonuspayday)}$`);
        let money = player.money;
        let newMoney = parseInt(money) + bonuspayday;
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], function (err, resluts) {
            if (err) return console.log(err);
        })
        player.call('updateMoney', [global.formatnum1(newMoney)]);
        player.money = newMoney;
        if (typeof global.pmAddPaydayCharExp === 'function') {
            global.pmAddPaydayCharExp(player);
        }
    });
}

/** Онлайн (минуты) пишется в accounts.js вместе с локацией и fast — flushPlayerPeriodicState каждые 5 с. */
