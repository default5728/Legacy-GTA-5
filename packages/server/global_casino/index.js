'use strict';

const crypto = require('crypto');
const moment = require('moment-timezone');
const CONFIG = require('./config');
const logic = require('./logic');

let dbReady = false;
let cachedSnapshot = null;
let cachedVersion = -1;
let lastBroadcastSnapshotSignature = '';
let tickTimer = null;
let snapshotTimer = null;
let tickInFlight = false;
let snapshotInFlight = false;
const betCooldown = new Map();
let cachedActiveRound = null;
let cachedActiveRoundAt = 0;
const ACTIVE_ROUND_CACHE_MS = 8000;
let cachedRoundBets = null;
let cachedRoundBetsRoundId = 0;
let cachedRoundBetsAt = 0;
const ROUND_BETS_CACHE_MS = 4000;
let cachedHistory = null;
let cachedHistoryAt = 0;
const HISTORY_CACHE_MS = 90000;


function invalidateActiveRoundCache() {
    cachedActiveRound = null;
    cachedActiveRoundAt = 0;
}

function invalidateRoundBetsCache() {
    cachedRoundBets = null;
    cachedRoundBetsRoundId = 0;
    cachedRoundBetsAt = 0;
}

function query(sql, params) {
    return new Promise((resolve, reject) => {
        if (!global.DB) return reject(new Error('DB unavailable'));
        global.DB.query(sql, params || [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function queryOne(sql, params) {
    return query(sql, params).then((rows) => (rows && rows[0]) || null);
}

function acquireLock(name, timeoutSec) {
    if (typeof global.getDbConnection !== 'function') return Promise.resolve(null);
    return global.getDbConnection().then((conn) => new Promise((resolve, reject) => {
        conn.query('SELECT GET_LOCK(?, ?) AS l', [name, timeoutSec], (err, rows) => {
            if (err) {
                conn.release();
                reject(err);
                return;
            }
            if (!rows || !rows[0] || rows[0].l !== 1) {
                conn.release();
                resolve(null);
                return;
            }
            resolve(conn);
        });
    }));
}

function releaseLock(conn, name) {
    if (!conn) return Promise.resolve();
    return new Promise((resolve) => {
        conn.query('SELECT RELEASE_LOCK(?)', [name], () => {
            conn.release();
            resolve();
        });
    });
}

function ensureSchema() {
    const sqls = [
        `CREATE TABLE IF NOT EXISTS global_casino_rounds (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            status ENUM('WAITING','BETTING','DRAWING','FINISHED') NOT NULL DEFAULT 'WAITING',
            version INT NOT NULL DEFAULT 1,
            total_pot BIGINT NOT NULL DEFAULT 0,
            started_at DATETIME NULL,
            betting_ends_at DATETIME NULL,
            finished_at DATETIME NULL,
            winner_static INT NULL,
            winner_name VARCHAR(64) NULL,
            winning_ticket BIGINT NULL,
            payout_amount BIGINT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS global_casino_bets (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            round_id BIGINT NOT NULL,
            player_static INT NOT NULL,
            player_name VARCHAR(64) NOT NULL,
            amount BIGINT NOT NULL,
            server_id VARCHAR(64) NOT NULL,
            idempotency_key VARCHAR(128) NULL,
            txn_id VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_idempotency (round_id, player_static, idempotency_key),
            UNIQUE KEY uq_txn (txn_id),
            INDEX idx_round (round_id),
            INDEX idx_player (player_static)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS global_casino_round_results (
            round_id BIGINT PRIMARY KEY,
            winner_static INT NULL,
            winner_name VARCHAR(64) NULL,
            winner_bet BIGINT NULL,
            total_pot BIGINT NOT NULL DEFAULT 0,
            winning_ticket BIGINT NULL,
            payout_amount BIGINT NULL,
            participants_json MEDIUMTEXT NULL,
            finished_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `ALTER TABLE accounts ADD COLUMN casino_daily_bet BIGINT NOT NULL DEFAULT 0`,
        `ALTER TABLE accounts ADD COLUMN casino_daily_bet_day DATE NULL`
    ];
    return sqls.reduce((p, sql) => p.then(() => query(sql).catch((err) => {
        const msg = String(err && err.message || '').toLowerCase();
        if (msg.includes('duplicate') && msg.includes('column')) return;
        if (msg.includes('already exists')) return;
        throw err;
    })), Promise.resolve());
}

function playerOk(player) {
    return player && mp.players.exists(player) && player.getVariable('auth');
}

function getMskDayKey() {
    const m = moment().tz('Europe/Moscow');
    const hour = m.hour();
    const day = m.clone();
    if (hour < CONFIG.DAILY_RESET_HOUR_MSK) day.subtract(1, 'day');
    return day.format('YYYY-MM-DD');
}

function getDailyBetUsed(player) {
    if (!playerOk(player)) return 0;
    if (player._casinoDailyBetDay !== getMskDayKey()) {
        player._casinoDailyBetDay = getMskDayKey();
        player._casinoDailyBetUsed = parseInt(player._casinoDailyBetUsed, 10) || 0;
    }
    return parseInt(player._casinoDailyBetUsed, 10) || 0;
}

function addDailyBetUsed(player, amount) {
    if (!playerOk(player)) return;
    const day = getMskDayKey();
    if (player._casinoDailyBetDay !== day) {
        player._casinoDailyBetDay = day;
        player._casinoDailyBetUsed = 0;
    }
    player._casinoDailyBetUsed = getDailyBetUsed(player) + (parseInt(amount, 10) || 0);
    if (player.static) {
        query('UPDATE accounts SET casino_daily_bet = ?, casino_daily_bet_day = ? WHERE static = ?', [
            player._casinoDailyBetUsed,
            day,
            player.static
        ]).catch(() => {});
    }
}

function canUseDailyBet(player, amount, opts) {
    if (opts && opts.skipDailyLimit) return true;
    return getDailyBetUsed(player) + (parseInt(amount, 10) || 0) <= CONFIG.DAILY_BET_LIMIT;
}

function hydrateDailyBet(player) {
    if (!playerOk(player) || !player.static) return Promise.resolve();
    return queryOne('SELECT casino_daily_bet, casino_daily_bet_day FROM accounts WHERE static = ? LIMIT 1', [player.static])
        .then((row) => {
            const day = getMskDayKey();
            if (row && row.casino_daily_bet_day === day) {
                player._casinoDailyBetDay = day;
                player._casinoDailyBetUsed = parseInt(row.casino_daily_bet, 10) || 0;
            } else {
                player._casinoDailyBetDay = day;
                player._casinoDailyBetUsed = 0;
            }
        })
        .catch(() => {});
}

function getChips(player) {
    if (!playerOk(player)) return 0;
    return parseInt(player.chips, 10) || 0;
}

function takeChipsGlobal(player, amount) {
    if (!playerOk(player)) return false;
    const need = parseInt(amount, 10) || 0;
    if (need <= 0 || getChips(player) < need) return false;
    player.chips = getChips(player) - need;
    if (typeof global.saveCasinoChips === 'function') global.saveCasinoChips(player);
    else if (global.DB && player.static) {
        global.DB.query('UPDATE accounts SET chips = ? WHERE static = ?', [player.chips, player.static]);
    }
    return true;
}

function addChipsGlobal(player, amount) {
    if (!playerOk(player)) return;
    const add = parseInt(amount, 10) || 0;
    if (add <= 0) return;
    player.chips = getChips(player) + add;
    if (typeof global.saveCasinoChips === 'function') global.saveCasinoChips(player);
    else if (global.DB && player.static) {
        global.DB.query('UPDATE accounts SET chips = ? WHERE static = ?', [player.chips, player.static]);
    }
}

async function loadRoundBets(roundId) {
    const rid = parseInt(roundId, 10) || 0;
    if (!rid) return [];
    const now = Date.now();
    if (
        cachedRoundBetsRoundId === rid &&
        cachedRoundBets &&
        now - cachedRoundBetsAt < ROUND_BETS_CACHE_MS
    ) {
        return cachedRoundBets;
    }
    const pressure = typeof global.getDbPressure === 'function' ? global.getDbPressure() : null;
    if (pressure && pressure.overloaded && cachedRoundBetsRoundId === rid && cachedRoundBets) {
        return cachedRoundBets;
    }
    const rows = await query(
        'SELECT player_static, player_name, SUM(amount) AS amount FROM global_casino_bets WHERE round_id = ? GROUP BY player_static, player_name',
        [rid]
    );
    const participants = logic.aggregateBets(rows.map((r) => ({
        player_static: r.player_static,
        player_name: r.player_name,
        amount: r.amount
    })));
    cachedRoundBetsRoundId = rid;
    cachedRoundBets = participants;
    cachedRoundBetsAt = now;
    return participants;
}

async function refreshRoundPot(roundId) {
    const row = await queryOne('SELECT COALESCE(SUM(amount),0) AS pot FROM global_casino_bets WHERE round_id = ?', [roundId]);
    const pot = parseInt(row && row.pot, 10) || 0;
    await query('UPDATE global_casino_rounds SET total_pot = ?, version = version + 1 WHERE id = ?', [pot, roundId]);
    invalidateActiveRoundCache();
    invalidateRoundBetsCache();
    return pot;
}

async function getActiveRound(forceRefresh) {
    if (
        !forceRefresh &&
        cachedActiveRound &&
        Date.now() - cachedActiveRoundAt < ACTIVE_ROUND_CACHE_MS
    ) {
        return cachedActiveRound;
    }

    let round = await queryOne(
        "SELECT * FROM global_casino_rounds WHERE status IN ('WAITING','BETTING','DRAWING') ORDER BY id DESC LIMIT 1"
    );
    if (round) {
        cachedActiveRound = round;
        cachedActiveRoundAt = Date.now();
        return round;
    }

    const finished = await queryOne(
        "SELECT * FROM global_casino_rounds WHERE status = 'FINISHED' ORDER BY id DESC LIMIT 1"
    );
    if (finished) {
        const finishedAt = finished.finished_at ? new Date(finished.finished_at).getTime() : 0;
        if (finishedAt > 0 && Date.now() - finishedAt < CONFIG.FINISHED_MS) {
            cachedActiveRound = finished;
            cachedActiveRoundAt = Date.now();
            return finished;
        }
    }

    const now = new Date();
    const ends = new Date(now.getTime() + CONFIG.BETTING_MS);
    invalidateActiveRoundCache();
    await query(
        "INSERT INTO global_casino_rounds (status, version, started_at, betting_ends_at) VALUES ('BETTING', 1, ?, ?)",
        [now, ends]
    );
    round = await queryOne('SELECT * FROM global_casino_rounds ORDER BY id DESC LIMIT 1');
    cachedActiveRound = round;
    cachedActiveRoundAt = Date.now();
    return round;
}

async function buildCurrentSnapshot() {
    const pressure = typeof global.getDbPressure === 'function' ? global.getDbPressure() : null;
    if (pressure && pressure.overloaded && cachedSnapshot) {
        return cachedSnapshot;
    }
    const round = await getActiveRound();
    if (!round) return cachedSnapshot || null;
    const participants = await loadRoundBets(round.id);
    return logic.buildSnapshot(round, participants, new Date().toISOString(), CONFIG.TOP_PARTICIPANTS_UI);
}

function broadcastEvent(eventName, payload) {
    const json = JSON.stringify(payload);
    mp.players.forEach((p) => {
        if (!playerOk(p)) return;
        try { p.call('client_global_casino_event', [eventName, json]); } catch (_e) {}
    });
}

function broadcastSnapshot(snapshot, eventName) {
    if (!snapshot) return;
    cachedSnapshot = snapshot;
    cachedVersion = snapshot.version;
    const signature = JSON.stringify([
        snapshot.roundId,
        snapshot.status,
        snapshot.version,
        snapshot.endsAt,
        snapshot.totalPot,
        snapshot.participantsCount,
        snapshot.participants,
        snapshot.winner
    ]);
    if (!eventName && signature === lastBroadcastSnapshotSignature) return;
    lastBroadcastSnapshotSignature = signature;
    broadcastEvent(eventName || 'globalCasino.snapshot', snapshot);
}

async function createNextBettingRound() {
    const now = new Date();
    const ends = new Date(now.getTime() + CONFIG.BETTING_MS);
    await query(
        "INSERT INTO global_casino_rounds (status, version, started_at, betting_ends_at) VALUES ('BETTING', 1, ?, ?)",
        [now, ends]
    );
    const round = await queryOne('SELECT * FROM global_casino_rounds ORDER BY id DESC LIMIT 1');
    cachedActiveRound = round;
    cachedActiveRoundAt = Date.now();
    const snapshot = logic.buildSnapshot(round, [], new Date().toISOString(), CONFIG.TOP_PARTICIPANTS_UI);
    broadcastEvent('globalCasino.roundStarted', snapshot);
    broadcastSnapshot(snapshot);
    return round;
}

async function finishRoundDrawing(round) {
    const lockConnection = await acquireLock(CONFIG.LOCK_NAME_FINISH, 1);
    if (!lockConnection) return false;

    try {
        const fresh = await queryOne('SELECT * FROM global_casino_rounds WHERE id = ? LIMIT 1', [round.id]);
        if (!fresh || fresh.status !== 'DRAWING') return false;

        const participants = await loadRoundBets(fresh.id);
        const totalPot = parseInt(fresh.total_pot, 10) || 0;

        if (participants.length < CONFIG.MIN_PARTICIPANTS_TO_DRAW || totalPot <= 0) {
            await query(
                "UPDATE global_casino_rounds SET status = 'FINISHED', finished_at = NOW(), version = version + 1 WHERE id = ?",
                [fresh.id]
            );
            invalidateActiveRoundCache();
            broadcastEvent('globalCasino.roundFinished', { roundId: String(fresh.id), cancelled: true });
            return true;
        }

        const result = logic.pickWeightedWinner(participants, (max) => crypto.randomInt(0, max));
        if (!result) return false;

        const winnerStatic = parseInt(result.winner.playerStatic, 10);
        const payout = totalPot;
        let paid = false;

        const winnerOnline = mp.players.toArray().find((p) => playerOk(p) && parseInt(p.static, 10) === winnerStatic);
        if (winnerOnline) {
            addChipsGlobal(winnerOnline, payout);
            paid = true;
        } else if (global.DB) {
            await query('UPDATE accounts SET chips = chips + ? WHERE static = ?', [payout, winnerStatic]);
            paid = true;
        }

        if (!paid) return false;

        await query(
            `UPDATE global_casino_rounds SET status = 'FINISHED', finished_at = NOW(), winner_static = ?, winner_name = ?,
             winning_ticket = ?, payout_amount = ?, version = version + 1 WHERE id = ? AND status = 'DRAWING'`,
            [winnerStatic, result.winner.displayName, result.winningTicket, payout, fresh.id]
        );
        invalidateActiveRoundCache();

        await query(
            `INSERT INTO global_casino_round_results (round_id, winner_static, winner_name, winner_bet, total_pot, winning_ticket, payout_amount, participants_json, finished_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE winner_static = VALUES(winner_static), payout_amount = VALUES(payout_amount)`,
            [
                fresh.id,
                winnerStatic,
                result.winner.displayName,
                result.winner.totalBet,
                totalPot,
                result.winningTicket,
                payout,
                JSON.stringify(participants)
            ]
        );

        const finishedSnap = {
            roundId: String(fresh.id),
            status: 'FINISHED',
            winner: {
                playerId: String(winnerStatic),
                displayName: result.winner.displayName,
                totalBet: result.winner.totalBet,
                chance: result.chance,
                payoutAmount: payout,
                winningTicket: result.winningTicket
            },
            totalPot
        };
        broadcastEvent('globalCasino.winnerSelected', finishedSnap);
        broadcastEvent('globalCasino.roundFinished', finishedSnap);
        return true;
    } finally {
        await releaseLock(lockConnection, CONFIG.LOCK_NAME_FINISH);
    }
}

async function tickRoundLifecycle() {
    if (!dbReady) return;
    const lockConnection = await acquireLock(CONFIG.LOCK_NAME_ROUND, 0);
    if (!lockConnection) return;

    try {
        let round = await getActiveRound();
        if (!round) return;
        const now = Date.now();

        if (round.status === 'WAITING') {
            const started = round.started_at ? new Date(round.started_at).getTime() : 0;
            if (now - started >= CONFIG.WAITING_MS) {
                const ends = new Date(now + CONFIG.BETTING_MS);
                await query(
                    "UPDATE global_casino_rounds SET status = 'BETTING', betting_ends_at = ?, version = version + 1 WHERE id = ? AND status = 'WAITING'",
                    [ends, round.id]
                );
                invalidateActiveRoundCache();
            }
        } else if (round.status === 'BETTING') {
            const ends = round.betting_ends_at ? new Date(round.betting_ends_at).getTime() : 0;
            if (ends > 0 && now >= ends) {
                const participants = await loadRoundBets(round.id);
                if (participants.length < CONFIG.MIN_PARTICIPANTS_TO_DRAW) {
                    const newEnds = new Date(now + CONFIG.BETTING_MS);
                    await query(
                        'UPDATE global_casino_rounds SET betting_ends_at = ?, version = version + 1 WHERE id = ? AND status = ?',
                        [newEnds, round.id, 'BETTING']
                    );
                    invalidateActiveRoundCache();
                } else {
                    await query(
                        "UPDATE global_casino_rounds SET status = 'DRAWING', version = version + 1 WHERE id = ? AND status = 'BETTING'",
                        [round.id]
                    );
                    invalidateActiveRoundCache();
                    broadcastEvent('globalCasino.roundLocked', { roundId: String(round.id) });
                    setTimeout(() => { finishRoundDrawing(round).catch(() => {}); }, CONFIG.DRAWING_MS);
                }
            }
        } else if (round.status === 'FINISHED') {
            const finished = round.finished_at ? new Date(round.finished_at).getTime() : 0;
            if (finished > 0 && now - finished >= CONFIG.FINISHED_MS) {
                await createNextBettingRound();
            }
        }

    } catch (err) {
        console.log('[global_casino] tick error:', err.message || err);
    } finally {
        await releaseLock(lockConnection, CONFIG.LOCK_NAME_ROUND);
    }
}

async function placeBet(player, payload) {
    if (!playerOk(player)) return { error: 1, errorText: 'Не авторизован' };
    if (!dbReady) return { error: 1, errorText: 'Сервис недоступен' };

    const roundId = parseInt(payload && payload.roundId, 10);
    const idempotencyKey = String((payload && payload.idempotencyKey) || '').slice(0, 128);
    const amountCheck = logic.validateBetAmount(payload && payload.amount, getChips(player));
    if (!amountCheck.ok) return { error: 1, errorText: amountCheck.error };

    const last = betCooldown.get(player.id) || 0;
    if (Date.now() - last < CONFIG.BET_RATE_LIMIT_MS) {
        return { error: 1, errorText: 'Подождите перед следующей ставкой' };
    }

    const round = await queryOne('SELECT * FROM global_casino_rounds WHERE id = ? LIMIT 1', [roundId]);
    if (!round) return { error: 1, errorText: 'Раунд не найден' };
    if (round.status !== 'BETTING') return { error: 1, errorText: 'Ставки закрыты' };
    if (round.betting_ends_at && Date.now() >= new Date(round.betting_ends_at).getTime()) {
        return { error: 1, errorText: 'Время ставок истекло' };
    }

    if (idempotencyKey) {
        const dup = await queryOne(
            'SELECT id FROM global_casino_bets WHERE round_id = ? AND player_static = ? AND idempotency_key = ? LIMIT 1',
            [roundId, player.static, idempotencyKey]
        );
        if (dup) {
            const snapshot = await buildCurrentSnapshot();
            return { error: 0, data: { duplicate: true, snapshot, chips: getChips(player) } };
        }
    }

    if (!takeChipsGlobal(player, amountCheck.value)) {
        return { error: 1, errorText: 'Недостаточно фишек' };
    }

    const txnId = crypto.randomBytes(16).toString('hex');
    try {
        await query(
            `INSERT INTO global_casino_bets (round_id, player_static, player_name, amount, server_id, idempotency_key, txn_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [roundId, player.static, player.name, amountCheck.value, CONFIG.SERVER_ID, idempotencyKey || null, txnId]
        );
    } catch (err) {
        addChipsGlobal(player, amountCheck.value);
        return { error: 1, errorText: 'Ставка не принята' };
    }

    await refreshRoundPot(roundId);
    betCooldown.set(player.id, Date.now());

    const snapshot = await buildCurrentSnapshot();
    broadcastEvent('globalCasino.betPlaced', {
        roundId: String(roundId),
        playerId: String(player.static),
        displayName: player.name,
        amount: amountCheck.value,
        version: snapshot.version
    });
    broadcastSnapshot(snapshot);

    return { error: 0, data: { chips: getChips(player), snapshot } };
}

async function getHistory(limit) {
    const lim = Math.max(1, parseInt(limit, 10) || 10);
    if (cachedHistory && Date.now() - cachedHistoryAt < HISTORY_CACHE_MS) {
        return cachedHistory.slice(0, lim);
    }
    const pressure = typeof global.getDbPressure === 'function' ? global.getDbPressure() : null;
    if (pressure && pressure.overloaded && cachedHistory) {
        return cachedHistory.slice(0, lim);
    }
    const rows = await query(
        `SELECT r.round_id, r.winner_static, r.winner_name, r.winner_bet, r.total_pot, r.payout_amount, r.finished_at
         FROM global_casino_round_results r ORDER BY r.finished_at DESC LIMIT ?`,
        [lim]
    );
    cachedHistory = rows || [];
    cachedHistoryAt = Date.now();
    return cachedHistory;
}

function init() {
    if (!global.DB) {
        setTimeout(init, 2000);
        return;
    }
    ensureSchema()
        .then(() => {
            dbReady = true;
            console.log('[global_casino] loaded (MySQL coordinator)');
            return getActiveRound();
        })
        .then(() => buildCurrentSnapshot())
        .then((snap) => { if (snap) broadcastSnapshot(snap); })
        .catch((err) => console.log('[global_casino] init error:', err.message || err));

    tickTimer = setInterval(() => {
        if (tickInFlight) return;
        const pressure = typeof global.getDbPressure === 'function' ? global.getDbPressure() : null;
        if (pressure && pressure.overloaded) return;
        tickInFlight = true;
        tickRoundLifecycle()
            .catch(() => {})
            .finally(() => {
                tickInFlight = false;
            });
    }, 2000);
    snapshotTimer = setInterval(() => {
        if (snapshotInFlight) return;
        const pressure = typeof global.getDbPressure === 'function' ? global.getDbPressure() : null;
        if (pressure && pressure.overloaded) return;
        snapshotInFlight = true;
        buildCurrentSnapshot()
            .then((snap) => {
                if (snap) broadcastSnapshot(snap);
            })
            .catch(() => {})
            .finally(() => {
                snapshotInFlight = false;
            });
    }, CONFIG.SNAPSHOT_INTERVAL_MS);
}

if (global.rpc) {
    global.rpc.register('server_global_casino_getState', async (player) => {
        if (!playerOk(player)) return { error: 1, errorText: 'Не авторизован' };
        await hydrateDailyBet(player);
        const snapshot = cachedSnapshot || await buildCurrentSnapshot();
        return { error: 0, data: { snapshot, chips: getChips(player), dailyBetUsed: getDailyBetUsed(player) } };
    });

    global.rpc.register('server_global_casino_placeBet', async (player, payload) => {
        return placeBet(player, payload || {});
    });

    global.rpc.register('server_global_casino_getHistory', async () => {
        const pressure = typeof global.getDbPressure === 'function' ? global.getDbPressure() : null;
        if (pressure && pressure.overloaded && cachedHistory) {
            return { error: 0, data: cachedHistory.slice(0, 10) };
        }
        const history = await getHistory(10);
        return { error: 0, data: history };
    });
}

mp.events.add('server_global_casino_requestSnapshot', (player) => {
    if (!playerOk(player)) return;
    hydrateDailyBet(player).then(() => cachedSnapshot || buildCurrentSnapshot()).then((snap) => {
        if (!snap) return;
        try {
            player.call('client_global_casino_event', ['globalCasino.snapshot', JSON.stringify({
                ...snap,
                chips: getChips(player),
                dailyBetUsed: getDailyBetUsed(player),
                myStatic: String(player.static || '')
            })]);
        } catch (_e) {}
    }).catch(() => {});
});

global.globalCasino = {
    CONFIG,
    logic,
    canUseDailyBet,
    addDailyBetUsed,
    getDailyBetUsed,
    hydrateDailyBet,
    getMskDayKey,
    placeBet,
    buildCurrentSnapshot
};

init();

module.exports = global.globalCasino;
