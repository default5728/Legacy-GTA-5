'use strict';

/** Статистика боя каптов / войны семей (GTA5RP-style): урон, % попаданий, % в голову. */

const lastResultByStatic = new Map();

function normFamilyKey(name) {
    return String(name || '').trim().toLowerCase();
}

function playerFractionId(player) {
    return Number(player.getVariable('fraction')) || 0;
}

function emptyRow(staticId) {
    return {
        static: Number(staticId) || 0,
        name: '',
        team: '',
        shots: 0,
        hits: 0,
        headshots: 0,
        damage: 0,
        kills: 0,
        deaths: 0
    };
}

function ensureRow(battle, player) {
    if (!battle) return null;
    if (!battle.combatStats) battle.combatStats = {};
    const sid = String(player.static);
    if (!battle.combatStats[sid]) {
        battle.combatStats[sid] = emptyRow(player.static);
    }
    const row = battle.combatStats[sid];
    if (!row.name) row.name = String(player.name || player.login || `#${player.static}`);
    return row;
}

function resolveBattleForPlayer(player) {
    if (!player || !mp.players.exists(player)) return null;
    const dim = Number(player.dimension);
    if (player.getVariable('captRegDamage') === true && dim >= 2000 && dim <= 2050) {
        const id = dim - 2000;
        const battle = global.activeBattles && global.activeBattles[id];
        if (battle && battle.isStarted) return { kind: 'capt', id, battle };
    }
    if (player.getVariable('bizwarRegDamage') === true && dim >= 3000 && dim <= 3128) {
        const id = dim - 3000;
        const battle = global.activeBizwars && global.activeBizwars[id];
        if (battle && battle.isStarted) return { kind: 'bizwar', id, battle };
    }
    return null;
}

function captTeamsEnemies(shooter, victim, battle) {
    const sf = normFamilyKey(shooter.family || shooter.getVariable('family'));
    const vf = normFamilyKey(victim.family || victim.getVariable('family'));
    if (!sf || !vf || sf === vf) return false;
    const atk = normFamilyKey(battle.attackerFamily);
    const def = normFamilyKey(battle.defenderFamily);
    if (def === 'свободна' || def === 'free' || !def) {
        return sf === atk ? vf !== atk : vf === atk;
    }
    return (sf === atk && vf === def) || (sf === def && vf === atk);
}

function bizwarTeamsEnemies(shooter, victim, battle) {
    const sf = playerFractionId(shooter);
    const vf = playerFractionId(victim);
    if (!sf || !vf || sf === vf) return false;
    const atk = Number(battle.attackerFrac) || 0;
    const def = Number(battle.defenderFrac) || 0;
    if (!def) return sf === atk ? vf !== atk : vf === atk;
    return (sf === atk && vf === def) || (sf === def && vf === atk);
}

function areEnemiesInBattle(shooter, victim, ctx) {
    if (!shooter || !victim || shooter === victim) return false;
    if (shooter.dimension !== victim.dimension) return false;
    if (ctx.kind === 'capt') return captTeamsEnemies(shooter, victim, ctx.battle);
    return bizwarTeamsEnemies(shooter, victim, ctx.battle);
}

/** Однокомандники в капте/бизваре (защита от фрэндли-файра). */
global.isSameBattleTeam = function (shooter, victim) {
    try {
        if (!shooter || !victim || !mp.players.exists(shooter) || !mp.players.exists(victim)) return false;
        if (shooter === victim) return false;
        const ctx = resolveBattleForPlayer(shooter);
        if (!ctx || resolveBattleForPlayer(victim)?.id !== ctx.id || resolveBattleForPlayer(victim)?.kind !== ctx.kind) return false;
        return !areEnemiesInBattle(shooter, victim, ctx);
    } catch (_e) {
        return false;
    }
};

function pct(part, total) {
    const p = Number(part) || 0;
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    return Math.min(100, Math.round((p / t) * 100));
}

function buildPlayerPayload(row) {
    const shots = Number(row.shots) || 0;
    const hits = Number(row.hits) || 0;
    const headshots = Number(row.headshots) || 0;
    return {
        static: row.static,
        name: row.name || `#${row.static}`,
        team: row.team || '',
        shots,
        hits,
        headshots,
        damage: Math.round(Number(row.damage) || 0),
        kills: Number(row.kills) || 0,
        deaths: Number(row.deaths) || 0,
        hitPct: pct(hits, shots),
        headPct: pct(headshots, hits)
    };
}

function buildResultPayload(meta, battle) {
    const rows = [];
    const cs = battle && battle.combatStats ? battle.combatStats : {};
    Object.keys(cs).forEach((sid) => {
        rows.push(buildPlayerPayload(cs[sid]));
    });
    rows.sort((a, b) => b.damage - a.damage || b.hits - a.hits);
    return {
        kind: meta.kind || 'capt',
        battleId: meta.battleId,
        zoneLabel: meta.zoneLabel || '',
        attackerLabel: meta.attackerLabel || '',
        defenderLabel: meta.defenderLabel || '',
        winnerLabel: meta.winnerLabel || '',
        endedAt: Date.now(),
        players: rows
    };
}

function broadcastResult(payload, staticIds) {
    const json = JSON.stringify(payload);
    const seen = new Set();
    staticIds.forEach((sid) => {
        const n = Number(sid);
        if (!Number.isFinite(n) || seen.has(n)) return;
        seen.add(n);
        lastResultByStatic.set(n, payload);
    });
    mp.players.forEach((p) => {
        try {
            if (!mp.players.exists(p) || !p.getVariable('auth')) return;
            if (!seen.has(Number(p.static))) return;
            p.call('capt:combat:result:c', [json]);
        } catch (_e) {}
    });
}

global.captCombatStatsRegisterPlayer = function (player, battle, teamSide) {
    try {
        if (!player || !battle) return;
        const row = ensureRow(battle, player);
        if (!row) return;
        if (teamSide) row.team = String(teamSide);
    } catch (_e) {}
};

global.captCombatStatsRecordShot = function (player) {
    try {
        if (!player || !mp.players.exists(player)) return;
        const ctx = resolveBattleForPlayer(player);
        if (!ctx) return;
        const row = ensureRow(ctx.battle, player);
        if (!row) return;
        row.shots += 1;
    } catch (_e) {}
};

global.captCombatStatsRecordHit = function (shooter, victim, damage, isHead) {
    try {
        if (!shooter || !victim || !mp.players.exists(shooter) || !mp.players.exists(victim)) return;
        const ctx = resolveBattleForPlayer(shooter);
        if (!ctx || resolveBattleForPlayer(victim)?.id !== ctx.id || resolveBattleForPlayer(victim)?.kind !== ctx.kind) return;
        if (!areEnemiesInBattle(shooter, victim, ctx)) return;
        const row = ensureRow(ctx.battle, shooter);
        if (!row) return;
        const dmg = Math.max(0, Math.round(Number(damage) || 0));
        row.hits += 1;
        row.damage += dmg;
        if (isHead) row.headshots += 1;
    } catch (_e) {}
};

global.captCombatStatsRecordDeath = function (victim, killer) {
    try {
        if (!victim || !mp.players.exists(victim)) return;
        const ctx = resolveBattleForPlayer(victim) || (() => {
            const dim = Number(victim.dimension);
            if (dim >= 2000 && dim <= 2050) {
                const id = dim - 2000;
                const battle = global.activeBattles && global.activeBattles[id];
                if (battle) return { kind: 'capt', id, battle };
            }
            if (dim >= 3000 && dim <= 3128) {
                const id = dim - 3000;
                const battle = global.activeBizwars && global.activeBizwars[id];
                if (battle) return { kind: 'bizwar', id, battle };
            }
            return null;
        })();
        if (!ctx) return;
        const vRow = ensureRow(ctx.battle, victim);
        if (vRow) vRow.deaths += 1;
        if (killer && mp.players.exists(killer) && killer !== victim) {
            const kCtx = resolveBattleForPlayer(killer);
            if (kCtx && kCtx.id === ctx.id && kCtx.kind === ctx.kind && areEnemiesInBattle(killer, victim, ctx)) {
                const kRow = ensureRow(ctx.battle, killer);
                if (kRow) kRow.kills += 1;
            }
        }
    } catch (_e) {}
};

global.finalizeCaptCombatStats = function (meta) {
    try {
        const battle = meta && meta.battle;
        if (!battle) return;
        const payload = buildResultPayload(meta, battle);
        const staticIds = [];
        if (battle.players) Object.keys(battle.players).forEach((sid) => staticIds.push(Number(sid)));
        if (battle.combatStats) Object.keys(battle.combatStats).forEach((sid) => staticIds.push(Number(sid)));
        broadcastResult(payload, staticIds);
    } catch (e) {
        console.log('[capt_combat_stats] finalize', e);
    }
};

global.getCaptCombatLastResultForPlayer = function (player) {
    if (!player || !Number.isFinite(Number(player.static))) return null;
    return lastResultByStatic.get(Number(player.static)) || null;
};

mp.events.add('capt:combat:shot:s', (player) => {
    if (typeof global.captCombatStatsRecordShot === 'function') global.captCombatStatsRecordShot(player);
});

mp.events.add('capt:combat:stats:request:s', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        const payload = global.getCaptCombatLastResultForPlayer(player);
        player.call('capt:combat:stats:load:c', [payload ? JSON.stringify(payload) : '']);
    } catch (_e) {}
});
