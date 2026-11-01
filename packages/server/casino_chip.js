'use strict';

if (!global.rpc) {
    try { global.rpc = require('./lib/rage-rpc.min.js'); } catch (_e) {}
}
const rpc = global.rpc;

// ~PayDay 50k: 5 фишек на мин. ставку рулетки ≈ 25k; при продаже −20% (дом).
const CHIP_BUY_PRICE = 5000;
const CHIP_SELL_PRICE = 4000;
const MAX_CHIP_CONVERT = 9999999;
const MAX_PLAYER_CHIPS = 999999999;

const SLOT_BETS = [
    [5, 10, 20, 25, 55], [25, 50, 75, 100, 200], [5, 10, 15, 20, 25], [5, 10, 15, 20, 25],
    [5, 10, 20, 25, 55], [25, 50, 75, 100, 200], [5, 10, 15, 20, 25], [5, 10, 15, 20, 25],
    [5, 10, 15, 20, 25], [55, 150, 155, 255, 550], [5, 10, 15, 20, 25], [5, 10, 15, 20, 25],
    [5, 10, 15, 20, 25], [55, 150, 155, 255, 550], [5, 10, 15, 20, 25], [5, 10, 20, 25, 55],
    [55, 150, 155, 255, 550], [5, 10, 15, 20, 25], [5, 10, 20, 25, 55],
    [55, 150, 155, 255, 550], [55, 150, 155, 255, 550], [25, 50, 75, 100, 200], [5, 10, 15, 20, 25]
];

const DICE_TABLES = [
    { bet: 10, maxPlayer: 10 },
    { bet: 25, maxPlayer: 10 },
    { bet: 35, maxPlayer: 10 },
    { bet: 10, maxPlayer: 10 }
];

const ROULETTE_TABLES = [
    { minBet: 5, maxBet: 1000 },
    { minBet: 100, maxBet: 5000 },
    { minBet: 5, maxBet: 1000 },
    { minBet: 250, maxBet: 15000 }
];

const POKER_TABLES = [
    { minBet: 1, maxBet: 200, chipType: 'DEFAULT' },
    { minBet: 1, maxBet: 200, chipType: 'DEFAULT' },
    { minBet: 2, maxBet: 400, chipType: 'DEFAULT' },
    { minBet: 2, maxBet: 400, chipType: 'DEFAULT' },
    { minBet: 10, maxBet: 2000, chipType: 'DEFAULT' },
    { minBet: 10, maxBet: 2000, chipType: 'DEFAULT' },
    { minBet: 20, maxBet: 4000, chipType: 'TEST' }
];

const ROULETTE_OUTSIDE_BETS = [
    { hoverNumbers: [0, 2, 4, 6, 8, 11, 13, 15, 17, 18, 20, 22, 24, 26, 29, 31, 33, 35] },
    { hoverNumbers: [1, 3, 5, 7, 9, 10, 12, 14, 16, 19, 21, 23, 25, 27, 28, 30, 32, 34] },
    { hoverNumbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35] },
    { hoverNumbers: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34] },
    { hoverNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
    { hoverNumbers: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
    { hoverNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    { hoverNumbers: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] },
    { hoverNumbers: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
    { hoverNumbers: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33] },
    { hoverNumbers: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34] },
    { hoverNumbers: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35] }
];

const slotJackpots = SLOT_BETS.map(() => 5000 + Math.floor(Math.random() * 15000));
const diceTables = DICE_TABLES.map((cfg, index) => ({
    index,
    cfg,
    players: new Map(),
    status: 0,
    roundPot: 0
}));
const rouletteTables = ROULETTE_TABLES.map((cfg, index) => ({
    index,
    cfg,
    players: new Map(),
    status: 0,
    beforeStart: 0,
    bets: new Map(),
    timer: null,
    spinning: false,
    roundTimer: null
}));

const pokerTables = POKER_TABLES.map((cfg, index) => ({
    index,
    cfg,
    players: new Map()
}));

const playerSession = new Map();

function rpcOk(data) {
    return { error: 0, data };
}

function rpcErr(text) {
    return { error: 1, errorText: String(text || 'Ошибка') };
}

function playerOk(player) {
    return player && mp.players.exists(player) && player.getVariable('auth');
}

function parseMoney(v) {
    const n = parseInt(String(v == null ? 0 : v).replace(/\s/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
}

function parseChipAmount(raw) {
    const s = String(raw == null ? '' : raw).trim().replace(/\s/g, '');
    if (!/^\d{1,7}$/.test(s)) return null;
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_CHIP_CONVERT) return null;
    return n;
}

function clampChips(n) {
    const v = Math.floor(Number(n));
    if (!Number.isFinite(v) || v < 0) return 0;
    return Math.min(v, MAX_PLAYER_CHIPS);
}

function safeChipMoneyMultiply(amount, pricePerChip) {
    const a = parseInt(amount, 10);
    const p = parseInt(pricePerChip, 10);
    if (!Number.isFinite(a) || !Number.isFinite(p) || a <= 0 || p <= 0) return null;
    if (a > Math.floor(Number.MAX_SAFE_INTEGER / p)) return null;
    const total = a * p;
    if (!Number.isFinite(total) || total <= 0) return null;
    return total;
}

function notify(player, type, text) {
    if (!playerOk(player)) return;
    if (typeof isNotify === 'function') isNotify(player, type, 'top-mid', String(text), 3000);
    else player.outputChatBox(String(text));
}

function formatRouletteWinNumber(n) {
    const id = parseInt(n, 10);
    if (id === 36) return '0';
    if (id === 37) return '00';
    if (id >= 0 && id <= 35) return String(id + 1);
    return String(id);
}

function ensureChipsColumn() {
    if (!global.DB) {
        setTimeout(ensureChipsColumn, 1500);
        return;
    }
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN chips BIGINT NOT NULL DEFAULT 0',
        [],
        (err) => {
            if (!err) {
                console.log('[casino_chip] колонка accounts.chips создана.');
                return;
            }
            const msg = String(err.message || '').toLowerCase();
            if (msg.includes('duplicate') && msg.includes('column')) return;
            console.log('[casino_chip] ALTER chips:', err.code || err.message);
        }
    );
}

function hydrateCasinoChips(player, cb) {
    if (!playerOk(player) || !player.static) {
        if (typeof cb === 'function') cb();
        return;
    }
    if (player._chipsLoaded) {
        if (typeof cb === 'function') cb();
        return;
    }
    if (player._chipsLoading) {
        if (typeof cb === 'function') player._chipsLoadQueue = (player._chipsLoadQueue || []).concat(cb);
        return;
    }
    player._chipsLoading = true;
    try {
        global.DB.query('SELECT chips FROM accounts WHERE static = ? LIMIT 1', [player.static], (err, rows) => {
            player._chipsLoading = false;
            if (!playerOk(player)) return;
            if (!err && rows && rows[0]) {
                player.chips = parseInt(rows[0].chips, 10) || 0;
            } else {
                player.chips = 0;
            }
            player._chipsLoaded = true;
            const queue = player._chipsLoadQueue || [];
            player._chipsLoadQueue = null;
            if (typeof cb === 'function') cb();
            queue.forEach((fn) => { try { fn(); } catch (_e) {} });
        });
    } catch (_e) {
        player._chipsLoading = false;
        player.chips = 0;
        player._chipsLoaded = true;
        if (typeof cb === 'function') cb();
    }
}

global.hydrateCasinoChips = hydrateCasinoChips;

function ensureChipsReady(player, cb) {
    if (!playerOk(player)) return;
    hydrateCasinoChips(player, cb);
}

function getChips(player) {
    if (!playerOk(player)) return 0;
    return clampChips(player.chips || 0);
}

function setChips(player, amount) {
    if (!playerOk(player)) return;
    player.chips = clampChips(amount);
    player._chipsLoaded = true;
    if (!player.static) return;
    try {
        if (global.DB) {
            global.DB.query('UPDATE accounts SET chips = ? WHERE static = ?', [player.chips, player.static], () => {});
        }
    } catch (_e) {}
}

function addChips(player, delta, opts) {
    const add = clampChips(delta);
    if (add <= 0) return;
    const cur = getChips(player);
    if (cur >= MAX_PLAYER_CHIPS) return;
    setChips(player, Math.min(MAX_PLAYER_CHIPS, cur + add));
    if (!opts || !opts.silent) {
        notify(player, 1, `+${add} фишек (баланс: ${getChips(player)})`);
    }
}

function takeChips(player, amount, opts) {
    const need = clampChips(amount);
    if (need <= 0) return true;
    if (getChips(player) < need) {
        notify(player, 2, 'Недостаточно фишек.');
        return false;
    }
    setChips(player, getChips(player) - need);
    if (!opts || !opts.silent) {
        notify(player, 2, `Ставка: -${need} фишек (остаток: ${getChips(player)})`);
    }
    return true;
}

function takeCash(player, amount) {
    const need = parseInt(amount, 10) || 0;
    if (need <= 0) return true;
    const cur = parseMoney(player.money);
    if (cur < need) {
        notify(player, 2, 'Недостаточно наличных.');
        return false;
    }
    const next = cur - need;
    player.money = next;
    try {
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [next, player.static], () => {});
        player.call('updateMoney', [global.formatnum1 ? global.formatnum1(next) : String(next)]);
    } catch (_e) {}
    return true;
}

function giveCash(player, amount) {
    const add = parseInt(amount, 10) || 0;
    if (add <= 0) return;
    const next = parseMoney(player.money) + add;
    player.money = next;
    try {
        global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [next, player.static], () => {});
        player.call('updateMoney', [global.formatnum1 ? global.formatnum1(next) : String(next)]);
    } catch (_e) {}
}

function clearSession(player) {
    const s = playerSession.get(player.id);
    if (!s) return;
    if (s.type === 'dice' && diceTables[s.tableIndex]) diceTables[s.tableIndex].players.delete(player.id);
    if (s.type === 'roulette' && rouletteTables[s.tableIndex]) rouletteTables[s.tableIndex].players.delete(player.id);
    if (s.type === 'poker' && pokerTables[s.tableIndex]) pokerTables[s.tableIndex].players.delete(player.id);
    playerSession.delete(player.id);
}

function setSession(player, type, tableIndex, extra) {
    clearSession(player);
    playerSession.set(player.id, Object.assign({ type, tableIndex }, extra || {}));
}

function broadcastDiceLog(table, code, payload) {
    const data = JSON.stringify(payload || []);
    table.players.forEach((_v, pid) => {
        const p = mp.players.at(pid);
        if (playerOk(p)) p.call('client_casino_dice_log', [code, data]);
    });
}

function stopDiceFor(player) {
    const s = playerSession.get(player.id);
    if (!s || s.type !== 'dice') return;
    const table = diceTables[s.tableIndex];
    if (table) {
        table.players.delete(player.id);
        broadcastDiceLog(table, 2, [player.name]);
    }
    player.call('client_casino_dice_stop', []);
    clearSession(player);
}

function stopSlotFor(player) {
    player.call('client_casino_slot_stop', []);
    clearSession(player);
}

function stopRouletteFor(player) {
    const s = playerSession.get(player.id);
    if (!s || s.type !== 'roulette') return;
    const table = rouletteTables[s.tableIndex];
    if (table) {
        const data = table.players.get(player.id);
        const roundActive = table.spinning || table.status === 1 || table.status === 2;
        // История принадлежит только текущему сеансу за столом.
        // Сама ставка при активном раунде при этом остаётся на сервере.
        if (data) data.history = [];
        if (data && roundActive && data.betIds && data.betIds.length > 0) {
            // Ставки остаются до конца раунда, таймер/крутка не сбрасываются
            data.away = true;
        } else {
            table.players.delete(player.id);
        }
        // Idle-стол чистим только если никто не сидит и раунд не идёт
        if (!roundActive && !rouletteTableHasParticipants(table)) {
            if (table.timer) {
                clearInterval(table.timer);
                table.timer = null;
            }
            if (table.roundTimer) {
                clearTimeout(table.roundTimer);
                table.roundTimer = null;
            }
            table.spinning = false;
            table.status = 0;
            table.beforeStart = 0;
        }
    }
    player.call('client_casino_roulette_stop', []);
    // Не вызываем clearSession: он удаляет игрока из table.players вместе
    // с сохранённой ставкой. Убираем только признак текущего нахождения за столом.
    playerSession.delete(player.id);
}

function rouletteTableHasParticipants(table) {
    if (!table || !table.players) return false;
    let has = false;
    table.players.forEach(() => { has = true; });
    return has;
}

function rouletteTableHasSeatedPlayers(table) {
    if (!table || !table.players) return false;
    let has = false;
    table.players.forEach((data) => {
        if (data && !data.away) has = true;
    });
    return has;
}

function cleanupAwayRoulettePlayers(table) {
    if (!table) return;
    const remove = [];
    table.players.forEach((data, pid) => {
        if (data && data.away) remove.push(pid);
    });
    remove.forEach((pid) => table.players.delete(pid));
}

function stopPokerFor(player) {
    const s = playerSession.get(player.id);
    if (!s || s.type !== 'poker') return;
    const table = pokerTables[s.tableIndex];
    if (table) table.players.delete(player.id);
    player.call('client_casino_poker_stop', []);
    clearSession(player);
}

function rouletteBetMatches(betId, number) {
    betId = parseInt(betId, 10);
    number = parseInt(number, 10);
    if (betId >= 0 && betId <= 35) return betId === number;
    if (betId === 36) return number === 36;
    if (betId === 37) return number === 37;
    if (betId >= 38 && betId <= 49) {
        const bet = ROULETTE_OUTSIDE_BETS[betId - 38];
        return bet ? bet.hoverNumbers.indexOf(number) !== -1 : false;
    }
    return false;
}

function pickAmericanRouletteWinNumber() {
    const n = Math.floor(Math.random() * 38);
    if (n < 36) return n;
    return n === 36 ? 36 : 37;
}

function rouletteBetPayoutMultiplier(betId) {
    betId = parseInt(betId, 10);
    if (betId >= 0 && betId <= 37) return 35;
    if (betId >= 44 && betId <= 49) return 3;
    if (betId >= 38 && betId <= 43) return 2;
    return 2;
}

function canPlaceRouletteBets(table) {
    return table && (table.status === 0 || table.status === 1) && !table.spinning;
}

function broadcastRouletteStatus(table, status, beforeStart) {
    table.status = status;
    if (typeof beforeStart === 'number') table.beforeStart = beforeStart;
    table.players.forEach((data, pid) => {
        if (data && data.away) return;
        const p = mp.players.at(pid);
        if (!playerOk(p)) return;
        p.call('client_casino_roulette_newStatus', [status, table.beforeStart | 0]);
    });
}

function clearRoulettePlayerBets(table) {
    table.players.forEach((data) => {
        data.betIds = [];
        data.betSums = [];
    });
}

function finishRouletteRound(table) {
    if (table.roundTimer) {
        clearTimeout(table.roundTimer);
        table.roundTimer = null;
    }
    table.spinning = false;
    clearRoulettePlayerBets(table);
    cleanupAwayRoulettePlayers(table);
    table.beforeStart = 0;
    broadcastRouletteStatus(table, 0, 0);
}

function startRouletteRound(table) {
    if (table.status !== 1 || table.spinning) return;
    if (table.timer) {
        clearInterval(table.timer);
        table.timer = null;
    }

    table.spinning = true;
    broadcastRouletteStatus(table, 2, 0);

    const winNumber = pickAmericanRouletteWinNumber();
    // Мировая анимация одна для всех игроков в казино, включая тех,
    // кто закрыл интерфейс стола во время текущего раунда.
    const worldPos = [
        { x: 942.325195, y: 55.3995285 },
        { x: 945.523193, y: 53.4012032 },
        { x: 947.521484, y: 56.5991898 },
        { x: 944.318176, y: 58.5890465 }
    ][table.index];
    if (worldPos) {
        mp.players.forEach((p) => {
            if (!playerOk(p) || p.dimension !== 0 || !p.position) return;
            const dx = p.position.x - worldPos.x;
            const dy = p.position.y - worldPos.y;
            if (dx * dx + dy * dy <= 10000) {
                p.call('client_casino_roulette_spin', [table.index, winNumber]);
            }
        });
    }

    table.players.forEach((data, pid) => {
        const p = mp.players.at(pid);
        if (!playerOk(p) || !data) return;
        let winSum = 0;
        (data.betIds || []).forEach((betId, i) => {
            if (rouletteBetMatches(betId, winNumber)) {
                winSum += data.betSums[i] * rouletteBetPayoutMultiplier(betId);
            }
        });
        if (winSum > 0) {
            addChips(p, winSum, { silent: true });
        }
        if (!data.away) {
            p.call('client_casino_roulette_win', [table.index, winNumber, getChips(p)]);
        }
    });

    table.roundTimer = setTimeout(() => {
        finishRouletteRound(table);
    }, 13000);
}

function tableHasAnyRouletteBets(table) {
    let has = false;
    table.players.forEach((data) => {
        if (data && data.betIds && data.betIds.length > 0) has = true;
    });
    return has;
}

function scheduleRouletteCountdown(table) {
    if (table.spinning) return;
    if (!tableHasAnyRouletteBets(table)) return;
    if (table.status === 1 && table.timer) return; // уже идёт общий отсчёт
    if (table.timer) clearInterval(table.timer);
    table.beforeStart = 15;
    broadcastRouletteStatus(table, 1, table.beforeStart);
    table.timer = setInterval(() => {
        table.beforeStart--;
        if (table.beforeStart > 0) {
            broadcastRouletteStatus(table, 1, table.beforeStart);
            return;
        }
        clearInterval(table.timer);
        table.timer = null;
        if (!tableHasAnyRouletteBets(table)) {
            table.beforeStart = 0;
            broadcastRouletteStatus(table, 0, 0);
            return;
        }
        startRouletteRound(table);
    }, 1000);
}

const LUCKY_WHEEL_SLICE_COUNT = 20;
const LUCKY_WHEEL_PLAY_MINUTES = 240;
const LUCKY_WHEEL_VIP_PLAY_MINUTES = 360;
const luckyWheelVipLastSpin = new Map();

const LUCKY_WHEEL_WIN_LIST = {
    0: '25.000$',
    1: '50.000$',
    2: 'Mini SMG',
    3: 'Navy Revolver',
    4: '25.000$',
    5: '25.000$',
    6: '50.000$',
    7: '25.000$',
    8: '25.000$',
    9: '100 DP',
    10: '25.000$',
    11: '50.000$',
    12: 'Navy Revolver',
    13: '50.000$',
    14: '250 DP',
    15: '100 DP',
    16: '2.500 снежинок',
    17: 'ничего, такое бывает :_)',
    18: '500 DP',
    19: '2.500.000$'
};

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function ensureDailyPlay(player) {
    const key = todayKey();
    if (player._dailyPlayKey !== key) {
        player._dailyPlayKey = key;
        player._dailyPlayMinutes = 0;
    }
    if (typeof player._dailyPlayMinutes !== 'number') player._dailyPlayMinutes = 0;
}

function getDailyPlayMinutes(player) {
    ensureDailyPlay(player);
    return player._dailyPlayMinutes;
}

function tickDailyPlayForAll() {
    mp.players.forEach((player) => {
        if (!playerOk(player) || player.getVariable('afklobby')) return;
        ensureDailyPlay(player);
        player._dailyPlayMinutes += 1;
    });
}

function hoursSinceLastCas(lastCas) {
    if (!lastCas) return 999;
    const last = new Date(lastCas);
    if (Number.isNaN(last.getTime())) return 999;
    return (Date.now() - last.getTime()) / 3600000;
}

function canUseLuckyWheelToday(lastCas) {
    return hoursSinceLastCas(lastCas) >= 24;
}

function canUseVipLuckyWheelToday(staticId) {
    const last = luckyWheelVipLastSpin.get(staticId);
    if (!last) return true;
    return hoursSinceLastCas(last) >= 24;
}

function markVipLuckyWheelUsed(player) {
    if (!player || !player.static) return;
    luckyWheelVipLastSpin.set(player.static, new Date().toISOString());
}

function updatePlayerDp(player, amount) {
    const curdp = parseInt(player.dp, 10) || 0;
    const newdp = curdp + amount;
    if (global.DB) {
        global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newdp, player.static], () => {});
    }
    if (typeof global.formatnum1 === 'function') player.call('updatedp', [global.formatnum1(newdp)]);
    player.dp = newdp;
}

function grantLuckyWheelSlice(player, slice, isVip) {
    slice = parseInt(slice, 10) || 0;
    if (slice < 0 || slice >= LUCKY_WHEEL_SLICE_COUNT) slice = 0;
    const label = LUCKY_WHEEL_WIN_LIST[slice] || 'приз';
    notify(player, 1, `Вы выиграли: ${label}`);
    try {
        switch (slice) {
            case 0:
            case 4:
            case 5:
            case 7:
            case 8:
            case 10:
                giveCash(player, 25000);
                break;
            case 1:
            case 6:
            case 11:
            case 13:
                giveCash(player, 50000);
                break;
            case 2:
                player.inventory.push('weapon_minismg');
                global.saveInventory(player);
                player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                break;
            case 3:
            case 12:
                player.inventory.push('weapon_navyrevolver');
                global.saveInventory(player);
                player.call('updateInventory', [JSON.stringify(player.inventory), JSON.stringify(player.fastSlots)]);
                break;
            case 9:
            case 15:
                updatePlayerDp(player, 100);
                break;
            case 14:
                updatePlayerDp(player, 250);
                break;
            case 16:
                if (typeof player.snow === 'number') player.snow += 2500;
                break;
            case 17:
                break;
            case 18:
                updatePlayerDp(player, 500);
                break;
            case 19:
                giveCash(player, 2500000);
                break;
            default:
                break;
        }
    } catch (e) {
        console.log('[casino_chip] lucky wheel grant: ' + e.message);
    }
}

function markLuckyWheelUsed(player, isVip) {
    if (isVip) {
        markVipLuckyWheelUsed(player);
        return;
    }
    if (global.DB) {
        global.DB.query(
            'UPDATE accounts SET lastcas = ? WHERE static = ?',
            [new Date().toISOString().slice(0, 19).replace('T', ' '), player.static],
            () => {}
        );
    }
}

function beginLuckyWheelSpin(player, slice, isVip) {
    player._luckyWheelSpinning = true;
    player._luckyWheelPending = { slice, isVip, granted: false };
    markLuckyWheelUsed(player, isVip);
    const eventName = isVip ? 'client_casino_luckywheel_player_spinVip' : 'client_casino_luckywheel_player_spin';
    mp.players.forEach((p) => {
        if (mp.players.exists(p)) p.call(eventName, [player.id, slice]);
    });
    setTimeout(() => {
        if (!playerOk(player)) return;
        player._luckyWheelSpinning = false;
    }, 6000);
}

function tryStartLuckyWheelSpin(player, isVip) {
    const requiredMinutes = isVip ? LUCKY_WHEEL_VIP_PLAY_MINUTES : LUCKY_WHEEL_PLAY_MINUTES;
    const played = getDailyPlayMinutes(player);
    if (played < requiredMinutes) {
        const left = requiredMinutes - played;
        const hours = Math.floor(requiredMinutes / 60);
        return notify(player, 2, `Отыграйте ещё ${left} мин. (нужно ${hours} ч. в сутки).`);
    }

    if (isVip) {
        if (!canUseVipLuckyWheelToday(player.static)) {
            return notify(player, 2, 'VIP-колесо уже крутили сегодня. Приходите завтра.');
        }
        const slice = Math.floor(Math.random() * LUCKY_WHEEL_SLICE_COUNT);
        return beginLuckyWheelSpin(player, slice, true);
    }

    if (!global.DB) {
        const slice = Math.floor(Math.random() * LUCKY_WHEEL_SLICE_COUNT);
        return beginLuckyWheelSpin(player, slice, false);
    }

    global.DB.query('SELECT lastcas FROM accounts WHERE static = ?', [player.static], (err, rows) => {
        if (!playerOk(player)) return;
        if (err) return notify(player, 2, 'Ошибка проверки колеса.');
        const lastCas = rows && rows[0] ? rows[0].lastcas : null;
        if (!canUseLuckyWheelToday(lastCas)) {
            const remainingMinutes = Math.max(1, Math.ceil((24 - hoursSinceLastCas(lastCas)) * 60));
            return notify(player, 2, `Колесо удачи уже крутили сегодня. Следующая прокрутка через ~${remainingMinutes} мин.`);
        }
        const slice = Math.floor(Math.random() * LUCKY_WHEEL_SLICE_COUNT);
        beginLuckyWheelSpin(player, slice, false);
    });
}

setInterval(tickDailyPlayForAll, 60000);

mp.events.add('playerQuit', (player) => clearSession(player));

mp.events.add('server_casino_taskStartConvert', (player) => {
    if (!playerOk(player)) return;
    ensureChipsReady(player, () => {
        if (!playerOk(player)) return;
        player.call('client_casino_startConvert', [
            parseMoney(player.money),
            getChips(player),
            CHIP_BUY_PRICE,
            CHIP_SELL_PRICE
        ]);
    });
});

/** Кнопка «ВЗЯТЬ 5000 ФИШЕК» — только UI, выдачи нет. */
mp.events.add('server_casino_takePokerTest', () => {});

mp.events.add('server_casino_taskStartSlot', (player, slotIndex) => {
    if (!playerOk(player)) return;
    slotIndex = parseInt(slotIndex, 10);
    const bets = SLOT_BETS[slotIndex];
    if (!bets) return notify(player, 2, 'Автомат недоступен.');
    if (playerSession.has(player.id)) return notify(player, 2, 'Вы уже за столом.');
    setSession(player, 'slot', slotIndex);
    player.call('client_casino_slot_start', [slotIndex, getChips(player), slotJackpots[slotIndex] || 10000]);
});

mp.events.add('server_casino_spinSlot', (player, betIndex) => {
    if (!playerOk(player)) return;
    const s = playerSession.get(player.id);
    if (!s || s.type !== 'slot') return;
    const bets = SLOT_BETS[s.tableIndex];
    betIndex = parseInt(betIndex, 10) || 0;
    const bet = bets && bets[betIndex] ? bets[betIndex] : bets[0];
    if (!takeChips(player, bet, { silent: true })) {
        player.call('client_casino_slot_spitRes', [-1, getChips(player), slotJackpots[s.tableIndex] || 0]);
        return;
    }
    const win = Math.random() < 0.28;
    let winSymbol = -1;
    let winAmount = 0;
    if (win) {
        winSymbol = Math.floor(Math.random() * 6);
        winAmount = bet * (2 + Math.floor(Math.random() * 4));
        addChips(player, winAmount, { silent: true });
        slotJackpots[s.tableIndex] = Math.max(5000, (slotJackpots[s.tableIndex] || 10000) - Math.floor(winAmount * 0.1));
    } else {
        slotJackpots[s.tableIndex] = (slotJackpots[s.tableIndex] || 10000) + Math.floor(bet * 0.15);
    }
    player.call('client_casino_slot_spitRes', [winSymbol, getChips(player), slotJackpots[s.tableIndex] || 0]);
});

mp.events.add('server_casino_exitSlot', (player) => stopSlotFor(player));

mp.events.add('server_casino_taskStartDice', (player, tableIndex) => {
    if (!playerOk(player)) return;
    tableIndex = parseInt(tableIndex, 10);
    const table = diceTables[tableIndex];
    if (!table) return;
    if (playerSession.has(player.id)) return notify(player, 2, 'Вы уже за столом.');
    if (table.players.size >= table.cfg.maxPlayer) return notify(player, 2, 'Стол заполнен.');
    if (!takeChips(player, table.cfg.bet)) return;
    table.players.set(player.id, { bet: table.cfg.bet, rolled: false });
    setSession(player, 'dice', tableIndex);
    player.call('client_casino_dice_start', [tableIndex, getChips(player), table.status]);
    broadcastDiceLog(table, 1, [player.name.replace('_', ' ')]);
    if (table.status === 0 && table.players.size >= 2) {
        table.status = 2;
        broadcastDiceLog(table, 0, []);
        setTimeout(() => {
            table.status = 1;
            broadcastDiceLog(table, 8, []);
            table.players.forEach((_v, pid) => {
                const p = mp.players.at(pid);
                if (playerOk(p)) p.call('client_casino_dice_start', [tableIndex, getChips(p), 1]);
            });
        }, 15000);
    }
});

mp.events.add('server_casino_rollDice', (player) => {
    if (!playerOk(player)) return;
    const s = playerSession.get(player.id);
    if (!s || s.type !== 'dice') return;
    const table = diceTables[s.tableIndex];
    const data = table.players.get(player.id);
    if (!data || data.rolled || table.status !== 1) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    data.rolled = true;
    data.roll = roll;
    broadcastDiceLog(table, 3, [player.id, player.name.replace('_', ' '), roll]);
    const all = Array.from(table.players.values());
    if (all.every((x) => x.rolled)) {
        let best = -1;
        let winners = [];
        table.players.forEach((d, pid) => {
            if (d.roll > best) {
                best = d.roll;
                winners = [pid];
            } else if (d.roll === best) winners.push(pid);
        });
        const pot = table.cfg.bet * table.players.size;
        const share = Math.floor(pot / winners.length);
        const winData = winners.map((pid) => {
            const p = mp.players.at(pid);
            if (playerOk(p)) addChips(p, share, { silent: true });
            return [pid, share];
        });
        const chipBalances = [];
        table.players.forEach((_d, pid) => {
            const p = mp.players.at(pid);
            if (playerOk(p)) chipBalances.push([pid, getChips(p)]);
        });
        broadcastDiceLog(table, 5, [winData, share, chipBalances]);
        table.players.forEach((d) => { d.rolled = false; d.roll = 0; });
        table.status = 0;
        setTimeout(() => broadcastDiceLog(table, 8, []), 5000);
    }
});

mp.events.add('server_casino_exitDice', (player) => stopDiceFor(player));

mp.events.add('server_casino_taskStartRoulette', (player, tableIndex) => {
    if (!playerOk(player)) return;
    ensureChipsReady(player, () => {
        tableIndex = parseInt(tableIndex, 10);
        const table = rouletteTables[tableIndex];
        if (!table) return;
        if (playerSession.has(player.id)) return notify(player, 2, 'Вы уже за столом.');

        let data = table.players.get(player.id);
        if (data && data.away) {
            data.away = false;
            data.history = [];
        } else if (data && !data.away) {
            return notify(player, 2, 'Вы уже за столом.');
        } else {
            let seated = 0;
            table.players.forEach((d) => { if (d && !d.away) seated++; });
            if (seated >= 10) return notify(player, 2, 'Стол заполнен.');
            data = { betIds: [], betSums: [], away: false, history: [] };
            table.players.set(player.id, data);
        }
        setSession(player, 'roulette', tableIndex);
        // На сукне игрок видит только собственные ставки.
        const betIds = Array.isArray(data.betIds) ? data.betIds.slice() : [];
        player.call('client_casino_roulette_start', [
            tableIndex,
            getChips(player),
            table.status,
            table.beforeStart | 0,
            JSON.stringify(betIds),
            JSON.stringify([])
        ]);
        // Подтянуть актуальный статус/таймер сразу после входа
        if (table.status === 1 || table.status === 2) {
            player.call('client_casino_roulette_newStatus', [table.status, table.beforeStart | 0]);
        }
    });
});

mp.events.add('server_casino_taskBetRoulette', (player, betId, betSum) => {
    if (!playerOk(player)) return;
    ensureChipsReady(player, () => {
        const s = playerSession.get(player.id);
        if (!s || s.type !== 'roulette') return;
        const table = rouletteTables[s.tableIndex];
        if (!canPlaceRouletteBets(table)) {
            player.call('client_casino_roulette_taskBetError', ['Сейчас нельзя делать ставки']);
            return;
        }
        betId = parseInt(betId, 10);
        betSum = parseInt(betSum, 10) || 0;
        const data = table.players.get(player.id);
        if (!data) return;
        if (data.betIds.length >= 3) {
            player.call('client_casino_roulette_taskBetError', ['Нельзя сделать больше 3 ставок']);
            return;
        }
        if (betSum < table.cfg.minBet || betSum > table.cfg.maxBet) {
            player.call('client_casino_roulette_taskBetError', [`Ставка от ${table.cfg.minBet} до ${table.cfg.maxBet}`]);
            return;
        }
        if (!takeChips(player, betSum, { silent: true })) {
            player.call('client_casino_roulette_taskBetError', ['Недостаточно фишек']);
            return;
        }
        data.betIds.push(betId);
        data.betSums.push(betSum);
        data.away = false;
        player.call('client_casino_roulette_taskBetSuccess', [betId, getChips(player)]);
        // Общий отсчёт для всех за столом
        if ((table.status === 0 || table.status === 1) && !table.spinning) {
            scheduleRouletteCountdown(table);
        }
    });
});

mp.events.add('server_casino_exitRoulette', (player) => stopRouletteFor(player));

mp.events.add('server_casino_taskStartPoker', (player, tableIndex) => {
    if (!playerOk(player)) return;
    tableIndex = parseInt(tableIndex, 10);
    const table = pokerTables[tableIndex];
    if (!table) return;
    if (playerSession.has(player.id)) return notify(player, 2, 'Вы уже за столом.');
    const minEntry = Math.max(1, Math.floor(table.cfg.maxBet / 2));
    if (getChips(player) < minEntry) return notify(player, 2, `Нужно минимум ${minEntry} фишек.`);
    table.players.set(player.id, { seat: table.players.size });
    setSession(player, 'poker', tableIndex);
    const pokerPlayers = [0, 1, 2, 3, 4].map((seat) => {
        if (seat === table.players.get(player.id).seat) {
            return [player.name, getChips(player), 0, 0, player.socialClub || '', player.id];
        }
        return null;
    });
    const payload = [0, table.cfg.minBet, table.cfg.maxBet, false, 0, 0, [], pokerPlayers];
    player.call('client_casino_poker_start', [tableIndex, getChips(player), JSON.stringify(payload)]);
    player.call('client_casino_poker_log', [12, JSON.stringify([table.players.get(player.id).seat])]);
});

mp.events.add('server_casino_seatPoker', (player) => {
    notify(player, 1, 'Вы уже за столом.');
});

mp.events.add('server_casino_betPoker', (player, amount) => {
    if (!playerOk(player)) return;
    amount = parseInt(amount, 10) || 0;
    if (!takeChips(player, amount)) return;
    const s = playerSession.get(player.id);
    if (!s || s.type !== 'poker') return;
    const table = pokerTables[s.tableIndex];
    const seat = table.players.get(player.id).seat;
    player.call('client_casino_poker_log', [4, JSON.stringify([seat, amount])]);
});

mp.events.add('server_casino_addChipPoker', (player, amount) => {
    if (!playerOk(player)) return;
    amount = parseInt(amount, 10) || 0;
    if (!takeChips(player, amount)) return;
    const s = playerSession.get(player.id);
    if (!s || s.type !== 'poker') return;
    const seat = pokerTables[s.tableIndex].players.get(player.id).seat;
    addChips(player, amount);
    player.call('client_casino_poker_log', [8, JSON.stringify([seat, amount])]);
});

mp.events.add('server_casino_fallPoker', (player) => {
    const s = playerSession.get(player.id);
    if (!s || s.type !== 'poker') return;
    const seat = pokerTables[s.tableIndex].players.get(player.id).seat;
    player.call('client_casino_poker_log', [5, JSON.stringify([seat])]);
});

mp.events.add('server_casino_exitPoker', (player) => stopPokerFor(player));

// Колёса удачи оставлены только как декорации — функционал отключён.
mp.events.add('server_casino_luckywheel_taskSpin', () => {});
mp.events.add('server_casino_luckywheel_taskVipSpin', () => {});
mp.events.add('server_casino_luckywheel_getGift', () => {});

if (rpc && rpc.register) {
    rpc.register('server_casino_convert', async (args, info) => {
        const player = info && info.player;
        if (!playerOk(player)) return rpcErr('Не авторизован');
        if (player._chipConvertBusy) return rpcErr('Подождите, операция уже выполняется.');
        player._chipConvertBusy = true;
        return new Promise((resolve) => {
            ensureChipsReady(player, () => {
                try {
                    const mode = parseInt(Array.isArray(args) ? args[0] : 0, 10);
                    const value = parseChipAmount(Array.isArray(args) ? args[1] : 0);
                    if (value == null) {
                        player._chipConvertBusy = false;
                        return resolve(rpcErr('Неверная сумма'));
                    }
                    if (mode === 0) {
                        const cost = safeChipMoneyMultiply(value, CHIP_BUY_PRICE);
                        if (cost == null) {
                            player._chipConvertBusy = false;
                            return resolve(rpcErr('Слишком большая сумма'));
                        }
                        if (getChips(player) + value > MAX_PLAYER_CHIPS) {
                            player._chipConvertBusy = false;
                            return resolve(rpcErr('Превышен лимит фишек'));
                        }
                        if (parseMoney(player.money) < cost) {
                            player._chipConvertBusy = false;
                            return resolve(rpcErr('Недостаточно денег'));
                        }
                        if (!takeCash(player, cost)) {
                            player._chipConvertBusy = false;
                            return resolve(rpcErr('Недостаточно денег'));
                        }
                        addChips(player, value, { silent: true });
                        notify(player, 1, `Куплено ${value} фишек за ${cost}$`);
                    } else {
                        const gain = safeChipMoneyMultiply(value, CHIP_SELL_PRICE);
                        if (gain == null) {
                            player._chipConvertBusy = false;
                            return resolve(rpcErr('Слишком большая сумма'));
                        }
                        if (!takeChips(player, value, { silent: true })) {
                            player._chipConvertBusy = false;
                            return resolve(rpcErr('Недостаточно фишек'));
                        }
                        giveCash(player, gain);
                        notify(player, 1, `Продано ${value} фишек за ${gain}$`);
                    }
                    player._chipConvertBusy = false;
                    resolve(rpcOk({ chips: getChips(player), cash: parseMoney(player.money) }));
                } catch (e) {
                    player._chipConvertBusy = false;
                    resolve(rpcErr('Ошибка конвертации'));
                }
            });
        });
    });

    rpc.register('server_casino_takePokerTest', async () => rpcOk(false));
}

mp.events.add('accounts:finishCharSelect:done', (player) => {
    hydrateCasinoChips(player);
});

mp.events.add('playerQuit', (player) => {
    if (player && player._chipsLoaded && player.static) {
        try {
            global.DB.query('UPDATE accounts SET chips = ? WHERE static = ?', [player.chips || 0, player.static], () => {});
        } catch (_e) {}
    }
});

mp.events.add('playerJoin', (player) => {
    player.chips = 0;
    player._chipsLoaded = false;
    player._chipsLoading = false;
});

ensureChipsColumn();

console.log('[casino_chip] Diamond Casino server loaded');
