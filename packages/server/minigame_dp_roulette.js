/**
 * F3 → Мини-игры → Рулетка DP: ставки в донат-валюте, спин через 60 с после первой ставки в раунде.
 */
const MINIGAME_MAINTENANCE = true;
const MINIGAME_MAINTENANCE_MSG = 'Мини-игра на тех. работах.';

const SPIN_MS = 60000;
const MIN_BET = 10;
const MAX_BET = 500000;
const LOCK_BEFORE_SPIN_MS = 3500;
const HISTORY_LEN = 5;

const COLORS = [
    { id: 'c2', mult: 2, label: 'Серый' },
    { id: 'c3', mult: 3, label: 'Красный' },
    { id: 'c5', mult: 5, label: 'Зелёный' },
    { id: 'c10', mult: 10, label: 'Золотой' }
];

/** DP на игроке может быть числом или строкой с разделителями — иначе выплаты ломаются. */
function parsePlayerDp(player) {
    return parseInt(String(player.dp != null ? player.dp : 0).replace(/\D/g, ''), 10) || 0;
}

/** Таймер до спина только после хотя бы одной ставки в раунде. */
let nextSpinAt = null;
let roundId = 1;
/** static -> { colorId, amount, roundId, login } */
const bets = new Map();
let lastResult = null;
/** новые в начале, макс. HISTORY_LEN */
const lastFive = [];

/** Ожидает подтверждения анимации клиентом: static -> { myResult, winnerMeta } */
const pendingSpinResults = new Map();

function colorById(id) {
    return COLORS.find((c) => c.id === id) || COLORS[0];
}

/** x2 чаще, x3 реже, x5 ещё реже, x10 очень редко */
function pickWinnerId() {
    const r = Math.random();
    if (r < 0.55) return 'c2';
    if (r < 0.82) return 'c3';
    if (r < 0.94) return 'c5';
    return 'c10';
}

function buildStrip(winnerId) {
    const len = 72;
    const targetIndex = 46 + Math.floor(Math.random() * 11);
    const ids = COLORS.map((c) => c.id);
    const seq = [];
    for (let i = 0; i < len; i++) {
        if (i === targetIndex) seq.push(winnerId);
        else seq.push(ids[Math.floor(Math.random() * ids.length)]);
    }
    seq[targetIndex] = winnerId;
    return { seq, targetIndex };
}

function buildRoundBetsPayload() {
    const rows = [];
    bets.forEach((b) => {
        if (b.roundId !== roundId) return;
        rows.push({
            login: b.login,
            colorId: b.colorId,
            amount: b.amount,
            amountFmt: global.formatnum1(b.amount)
        });
    });
    return rows;
}

function pushSyncToPlayer(player, secOverride) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    const now = Date.now();
    const waitingBets = nextSpinAt == null;
    let sec = null;
    if (!waitingBets) {
        sec = secOverride != null ? secOverride : Math.max(0, Math.ceil((nextSpinAt - now) / 1000));
    }
    const bet = bets.get(player.static);
    const payload = {
        dp: global.formatnum1(parsePlayerDp(player)),
        last: lastResult,
        lastFive: lastFive.slice(),
        sec,
        waitingBets,
        round: roundId,
        myBet: bet && bet.roundId === roundId ? { colorId: bet.colorId, amount: bet.amount } : null,
        myLogin: String(player.login || player.name || ''),
        roundBets: buildRoundBetsPayload()
    };
    player.call('minigame:dpRoulette:sync', [JSON.stringify(payload)]);
}

function broadcastSync() {
    mp.players.forEach((p) => {
        if (p.getVariable('auth')) pushSyncToPlayer(p);
    });
}

function resolveRound() {
    const winnerId = pickWinnerId();
    const meta = colorById(winnerId);
    const { seq, targetIndex } = buildStrip(winnerId);
    const currentRound = roundId;

    lastResult = {
        colorId: winnerId,
        mult: meta.mult,
        label: meta.label,
        roundId: currentRound
    };
    lastFive.unshift({
        colorId: winnerId,
        mult: meta.mult,
        label: meta.label
    });
    while (lastFive.length > HISTORY_LEN) lastFive.pop();

    /** Персональный результат для каждого игрока: { won, payout, betAmount, betColorId } */
    const playerResults = new Map();

    mp.players.forEach((p) => {
        if (!p.getVariable('auth')) return;
        const b = bets.get(p.static);
        if (!b || b.roundId !== currentRound) return;
        if (b.colorId === winnerId) {
            const payout = Math.floor(b.amount * meta.mult);
            playerResults.set(p.static, {
                won: true,
                payout,
                betAmount: b.amount,
                betColorId: b.colorId
            });
        } else {
            playerResults.set(p.static, {
                won: false,
                payout: 0,
                betAmount: b.amount,
                betColorId: b.colorId
            });
        }
    });

    bets.clear();
    roundId += 1;
    nextSpinAt = null;

    const baseSpinPayload = {
        seq,
        targetIndex,
        colorId: winnerId,
        mult: meta.mult,
        label: meta.label,
        roundId: currentRound
    };
    mp.players.forEach((p) => {
        if (!p.getVariable('auth')) return;
        const myRes = playerResults.get(p.static) || null;
        if (myRes) {
            pendingSpinResults.set(p.static, { myResult: myRes, winnerMeta: meta, roundId: currentRound });
        }
        const payload = JSON.stringify({
            ...baseSpinPayload,
            myResult: myRes
        });
        p.call('minigame:dpRoulette:spin', [payload]);
    });

    broadcastSync();
}

function applyPendingSpinResult(player) {
    const pending = pendingSpinResults.get(player.static);
    if (!pending) return false;
    pendingSpinResults.delete(player.static);
    const { myResult, winnerMeta } = pending;
    if (!myResult) return true;
    if (myResult.won) {
        const payout = Math.floor(myResult.payout || 0);
        if (payout > 0) {
            const cur = parsePlayerDp(player);
            const newDp = cur + payout;
            player.dp = newDp;
            global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newDp, player.static], () => {});
            player.call('updatedp', [global.formatnum1(newDp)]);
        }
        isNotify(
            player,
            3,
            'top-mid',
            `Поздравляем! Вы выиграли ${global.formatnum1(payout)} DP.`,
            5000
        );
    } else {
        const meta = winnerMeta || colorById('c2');
        isNotify(
            player,
            1,
            'top-mid',
            `Увы... Вы проиграли. Выпало ${meta.label} — ${meta.mult}x`,
            4500
        );
    }
    return true;
}

mp.events.add('minigame:dpRoulette:animationDone:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        applyPendingSpinResult(player);
        pushSyncToPlayer(player);
    } catch (e) {
        console.log(e);
    }
});

setInterval(() => {
    try {
        if (nextSpinAt != null && Date.now() >= nextSpinAt) resolveRound();
    } catch (e) {
        console.log('[dpRoulette]', e);
    }
}, 400);

mp.events.add('minigame:dpRoulette:pull:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        pushSyncToPlayer(player);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('minigame:dpRoulette:bet:s', (player, colorId, amountRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (MINIGAME_MAINTENANCE) {
            return isNotify(player, 2, 'top-mid', MINIGAME_MAINTENANCE_MSG, 4000);
        }
        if (new Date().getTime() - (player.clicked || 0) < 600) {
            return isNotify(player, 2, 'top-mid', 'Не так часто.', 1500);
        }
        player.clicked = new Date().getTime();

        const cid = String(colorId || '');
        if (!COLORS.some((c) => c.id === cid)) {
            return isNotify(player, 2, 'top-mid', 'Неверный множитель.', 2000);
        }

        const amount = parseInt(String(amountRaw).replace(/\D/g, ''), 10);
        if (!Number.isFinite(amount) || amount < MIN_BET) {
            return isNotify(player, 2, 'top-mid', `Минимум ${MIN_BET} DP`, 2500);
        }
        if (amount > MAX_BET) {
            return isNotify(player, 2, 'top-mid', `Максимум ${global.formatnum1(MAX_BET)} DP`, 2500);
        }

        if (nextSpinAt != null) {
            const left = nextSpinAt - Date.now();
            if (left < LOCK_BEFORE_SPIN_MS) {
                return isNotify(player, 2, 'top-mid', 'Ставки закрыты, дождитесь спина.', 2800);
            }
        }

        const ex = bets.get(player.static);
        if (ex && ex.roundId === roundId) {
            return isNotify(player, 2, 'top-mid', 'В этом раунде ставка уже сделана.', 3000);
        }

        const cur = parsePlayerDp(player);
        if (cur < amount) {
            return isNotify(player, 2, 'top-mid', 'Недостаточно DP', 3000);
        }

        const newDp = cur - amount;
        player.dp = newDp;
        global.DB.query('UPDATE accounts SET dp = ? WHERE static = ?', [newDp, player.static], () => {});
        player.call('updatedp', [global.formatnum1(newDp)]);

        const firstBetThisRound = bets.size === 0;
        const login = String(player.login || player.name || 'Игрок');
        bets.set(player.static, { colorId: cid, amount, roundId, login });

        if (firstBetThisRound) {
            nextSpinAt = Date.now() + SPIN_MS;
        }

        isNotify(player, 3, 'top-mid', `Ставка ${global.formatnum1(amount)} DP`, 2200);
        broadcastSync();
    } catch (e) {
        console.log(e);
    }
});
