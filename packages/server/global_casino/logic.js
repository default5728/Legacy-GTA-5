'use strict';

function calcChance(playerBet, totalPot) {
    const bet = parseInt(playerBet, 10) || 0;
    const pot = parseInt(totalPot, 10) || 0;
    if (pot <= 0 || bet <= 0) return 0;
    return bet / pot;
}

function aggregateBets(bets) {
    const map = new Map();
    (bets || []).forEach((row) => {
        const key = String(row.player_static || row.playerId);
        const prev = map.get(key) || {
            playerId: key,
            playerStatic: parseInt(row.player_static, 10) || parseInt(row.playerId, 10),
            displayName: row.player_name || row.displayName || 'Player',
            totalBet: 0
        };
        prev.totalBet += parseInt(row.amount, 10) || 0;
        if (row.player_name) prev.displayName = row.player_name;
        map.set(key, prev);
    });
    return Array.from(map.values()).filter((p) => p.totalBet > 0);
}

function pickWeightedWinner(participants, randomIntFn) {
    const list = (participants || []).filter((p) => (parseInt(p.totalBet, 10) || 0) > 0);
    const totalPot = list.reduce((sum, p) => sum + (parseInt(p.totalBet, 10) || 0), 0);
    if (totalPot <= 0 || list.length === 0) return null;

    const ticket = randomIntFn(totalPot);
    let acc = 0;
    for (let i = 0; i < list.length; i++) {
        acc += parseInt(list[i].totalBet, 10) || 0;
        if (ticket < acc) {
            return {
                winner: list[i],
                winningTicket: ticket,
                totalPot,
                chance: calcChance(list[i].totalBet, totalPot)
            };
        }
    }
    const last = list[list.length - 1];
    return {
        winner: last,
        winningTicket: ticket,
        totalPot,
        chance: calcChance(last.totalBet, totalPot)
    };
}

function validateBetAmount(amount, balance) {
    const n = typeof amount === 'string' ? amount.trim() : amount;
    if (n === '' || n == null) return { ok: false, error: 'Укажите сумму ставки' };
    if (!/^-?\d+$/.test(String(n))) return { ok: false, error: 'Ставка должна быть целым числом' };
    const value = parseInt(n, 10);
    if (!Number.isFinite(value) || value <= 0) return { ok: false, error: 'Ставка должна быть больше нуля' };
    if (value > (parseInt(balance, 10) || 0)) return { ok: false, error: 'Недостаточно фишек' };
    return { ok: true, value };
}

function buildSnapshot(round, participants, serverTime, topLimit) {
    const totalPot = parseInt(round.total_pot, 10) || 0;
    const sorted = [...participants].sort((a, b) => b.totalBet - a.totalBet);
    const top = sorted.slice(0, topLimit || 12);
    const othersBet = sorted.slice(topLimit || 12).reduce((s, p) => s + p.totalBet, 0);
    const list = top.map((p) => ({
        playerId: String(p.playerStatic || p.playerId),
        displayName: p.displayName,
        totalBet: p.totalBet,
        chance: calcChance(p.totalBet, totalPot)
    }));
    if (othersBet > 0) {
        list.push({
            playerId: 'others',
            displayName: 'Другие',
            totalBet: othersBet,
            chance: calcChance(othersBet, totalPot),
            isOthers: true
        });
    }
    return {
        roundId: String(round.id),
        status: round.status,
        version: parseInt(round.version, 10) || 0,
        serverTime: serverTime || new Date().toISOString(),
        endsAt: round.betting_ends_at ? new Date(round.betting_ends_at).toISOString() : null,
        totalPot,
        participantsCount: participants.length,
        participants: list,
        winner: round.winner_static ? {
            playerId: String(round.winner_static),
            displayName: round.winner_name || '',
            payoutAmount: parseInt(round.payout_amount, 10) || 0
        } : null
    };
}

module.exports = {
    calcChance,
    aggregateBets,
    pickWeightedWinner,
    validateBetAmount,
    buildSnapshot
};
