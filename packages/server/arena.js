'use strict';

const { MBA_ARENA_MAPS } = require('./config/mba_arena_maps.js');
const { COMBAT_ARENAS } = require('./config/combat_arenas.js');

/** Доп. запас к радиусу боя на арене (к спавнам + extraRadius карты). */
const ARENA_BOUNDARY_PAD_EXTRA = 10;

function buildArenaMapCatalog() {
    const catalog = [];
    for (let i = 0; i < MBA_ARENA_MAPS.length; i++) {
        catalog.push({
            id: catalog.length,
            category: 'dm',
            name: MBA_ARENA_MAPS[i].name,
            loc: MBA_ARENA_MAPS[i],
            membersMax: 20
        });
    }
    for (let j = 0; j < COMBAT_ARENAS.length; j++) {
        catalog.push({
            id: catalog.length,
            category: 'family',
            name: COMBAT_ARENAS[j].name,
            loc: COMBAT_ARENAS[j],
            membersMax: 20
        });
    }
    return catalog;
}

/** @type {Array<{id:number,category:string,name:string,loc:object,membersMax:number}>} */
let ARENA_MAP_CATALOG = [];

function getArenaMapLoc(mapId) {
    const id = Number(mapId) | 0;
    if (ARENA_MAP_CATALOG[id]) return ARENA_MAP_CATALOG[id].loc;
    return MBA_ARENA_MAPS[0];
}

function getCombatArenaMetaFromLocation(loc) {
    if (!loc) return null;
    const pts = [].concat(loc.attacker || [], loc.defender || []);
    if (!pts.length) return null;
    let sx = 0, sy = 0, sz = 0;
    for (let i = 0; i < pts.length; i++) {
        sx += pts[i][0]; sy += pts[i][1]; sz += pts[i][2];
    }
    const n = pts.length;
    const cx = sx / n, cy = sy / n, cz = sz / n;
    let maxR = 0;
    for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i][0] - cx, pts[i][1] - cy);
        if (d > maxR) maxR = d;
    }
    const pad = (Number(loc.extraRadius) || 5) + ARENA_BOUNDARY_PAD_EXTRA;
    return { cx, cy, cz, radius: maxR + pad, name: loc.name || 'Arena' };
}

function getCombatSpawnFromLocation(loc, isAttacker, slotIndex, isPrep) {
    const arr = isAttacker ? loc.attacker : loc.defender;
    const idx = Math.min(Math.max(0, slotIndex | 0), Math.max(0, arr.length - 1));
    const pos = arr[idx];
    let z = pos[2] + 0.35;
    if (isPrep) z += 1.15;
    return new mp.Vector3(pos[0], pos[1], z);
}

const ARENA_BLIP_POS = new mp.Vector3(-257.8638610839844, -2024.740478515625, 30.14549446105957);
const ARENA_RETURN_POS = ARENA_BLIP_POS;
const ARENA_DIM_BASE = 5000;
const ARENA_ROUNDS = 8;
const ARENA_FREEZE_MS = 5000;
const ARENA_START_DELAY_MS = 2000;
const ARENA_MAX_PLAYERS = 20;
const ARENA_MIN_PLAYERS = 2;

ARENA_MAP_CATALOG = buildArenaMapCatalog();

const WEAPON_OPTIONS = [
    { id: 'specialcarbine', label: 'Special Rifle', hash: 'WEAPON_SPECIALCARBINE' },
    { id: 'revolver', label: 'Револьвер', hash: 'WEAPON_REVOLVER_MK2' },
    { id: 'carbine', label: 'Carbine Rifle', hash: 'WEAPON_CARBINERIFLE' }
];

/** Блип создаётся на клиенте (sprite 647 + natives), чтобы не уезжал на миникарте. */
/** @type {Map<number, object>} */
const lobbies = new Map();
let nextLobbyId = 1;
let nextDimOffset = 1;

function formatArenaMoney(n) {
    return typeof global.formatnum1 === 'function' ? global.formatnum1(n) : String(n);
}

async function takeArenaCash(player, amount, reason) {
    const sum = Math.max(0, Math.floor(Number(amount) || 0));
    if (sum <= 0) return { ok: true };
    const key = `arena:${reason}:${player.static}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    if (global.moneyService && typeof global.moneyService.remove === 'function') {
        const rem = await global.moneyService.remove({
            accountId: player.static,
            wallet: 'cash',
            amount: sum,
            reason: 'arena:' + reason,
            idempotencyKey: key
        });
        if (!rem || !rem.ok) {
            return { ok: false, msg: `Недостаточно средств. Нужно ${formatArenaMoney(sum)}$.` };
        }
        return { ok: true };
    }
    const cash = parseInt(Number(player.money), 10) || 0;
    if (cash < sum) return { ok: false, msg: `Недостаточно средств. Нужно ${formatArenaMoney(sum)}$.` };
    const newMoney = cash - sum;
    player.money = newMoney;
    try { player.call('updateMoney', [formatArenaMoney(newMoney)]); } catch (_e) {}
    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], () => {});
    return { ok: true };
}

function payArenaCash(player, amount, reason) {
    const sum = Math.max(0, Math.floor(Number(amount) || 0));
    if (sum <= 0 || !player || !mp.players.exists(player)) return;
    const key = `arena:prize:${player.static}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    if (typeof global.givemoney === 'function') {
        global.givemoney(player, sum, 'arena_' + reason, key);
        return;
    }
    const cash = parseInt(Number(player.money), 10) || 0;
    const newMoney = cash + sum;
    player.money = newMoney;
    try { player.call('updateMoney', [formatArenaMoney(newMoney)]); } catch (_e) {}
    global.DB.query('UPDATE accounts SET money = ? WHERE static = ?', [newMoney, player.static], () => {});
}

function isNearArena(player) {
    if (typeof global.isPlayerInArenaZone === 'function') return global.isPlayerInArenaZone(player);
    if (!player || !mp.players.exists(player) || (player.dimension || 0) !== 0) return false;
    const dx = player.position.x - ARENA_BLIP_POS.x;
    const dy = player.position.y - ARENA_BLIP_POS.y;
    return Math.hypot(dx, dy) <= 45;
}

function findPlayerByStatic(st) {
    const id = Number(st);
    if (!Number.isFinite(id)) return null;
    return mp.players.toArray().find((p) => mp.players.exists(p) && Number(p.static) === id) || null;
}

function getMapsList() {
    return ARENA_MAP_CATALOG.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        teams: 2,
        membersMin: 2,
        membersMax: e.membersMax
    }));
}

function getArenaMapName(mapId) {
    const e = ARENA_MAP_CATALOG[Number(mapId) | 0];
    return e ? e.name : 'Карта';
}

function weaponById(id) {
    return WEAPON_OPTIONS.find((w) => w.id === id) || WEAPON_OPTIONS[0];
}

function lobbyPublic(lobby) {
    return {
        id: lobby.id,
        name: lobby.name,
        mapId: lobby.mapId,
        mapName: getArenaMapName(lobby.mapId),
        hostName: lobby.hostName,
        hostStatic: lobby.hostStatic,
        membersCount: lobby.members.length,
        membersMax: lobby.membersMax,
        hasPassword: !!lobby.password,
        weaponId: lobby.weaponId,
        weaponLabel: weaponById(lobby.weaponId).label,
        fee: Number(lobby.fee) || 0,
        prizePool: Number(lobby.prizePool) || 0,
        status: lobby.status,
        canStart: canStartLobby(lobby),
        startInMs: Math.max(0, (lobby.lastJoinAt + ARENA_START_DELAY_MS) - Date.now())
    };
}

function canStartLobby(lobby) {
    if (!lobby || lobby.status !== 'lobby') return false;
    if (lobby.members.length < ARENA_MIN_PLAYERS) return false;
    return Date.now() - (lobby.lastJoinAt || 0) >= ARENA_START_DELAY_MS;
}

function playerLobbyId(player) {
    return Number(player.getVariable('mbaLobbyId')) || 0;
}

function findLobbyOfPlayer(player) {
    const id = playerLobbyId(player);
    return id ? lobbies.get(id) || null : null;
}

function pushUi(player, payload) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.call('arena:ui:sync', [JSON.stringify(payload)]);
    } catch (_e) {}
}

function pushLobbyList(player) {
    const list = [];
    lobbies.forEach((l) => {
        if (l.status === 'lobby') list.push(lobbyPublic(l));
    });
    pushUi(player, {
        view: 'list',
        lobbies: list,
        maps: getMapsList(),
        weapons: WEAPON_OPTIONS.map((w) => ({ id: w.id, label: w.label })),
        myLobby: null
    });
}

function pushLobbyRoom(player, lobby) {
    const members = lobby.members.map((st) => {
        const p = findPlayerByStatic(st);
        ensureMemberTeam(lobby, st);
        return {
            static: st,
            name: p && p.login ? p.login : ('#' + st),
            team: lobby.teams[st] || 1
        };
    });
    pushUi(player, {
        view: 'room',
        lobbies: [],
        maps: getMapsList(),
        weapons: WEAPON_OPTIONS.map((w) => ({ id: w.id, label: w.label })),
        myLobby: Object.assign({}, lobbyPublic(lobby), {
            members,
            isHost: Number(lobby.hostStatic) === Number(player.static),
            myStatic: Number(player.static),
            myTeam: lobby.teams[Number(player.static)] || 1
        })
    });
}

function broadcastLobby(lobby) {
    lobby.members.forEach((st) => {
        const p = findPlayerByStatic(st);
        if (p) pushLobbyRoom(p, lobby);
    });
}

function leaveLobby(player, silent) {
    const lobby = findLobbyOfPlayer(player);
    if (!lobby) {
        try {
            player.setVariable('mbaLobbyId', null);
        } catch (_e) {}
        return;
    }
    lobby.members = lobby.members.filter((st) => Number(st) !== Number(player.static));
    delete lobby.teams[player.static];
    try {
        player.setVariable('mbaLobbyId', null);
    } catch (_e) {}

    if (lobby.status === 'match') {
        endMatchForPlayer(player, lobby, silent);
        return;
    }

    if (!lobby.members.length) {
        lobbies.delete(lobby.id);
        return;
    }
    if (Number(lobby.hostStatic) === Number(player.static)) {
        lobby.hostStatic = lobby.members[0];
        const hp = findPlayerByStatic(lobby.hostStatic);
        lobby.hostName = hp && hp.login ? hp.login : ('#' + lobby.hostStatic);
    }
    lobby.lastJoinAt = Date.now();
    broadcastLobby(lobby);
}

function arenaWeaponItemName(weaponId) {
    const id = weaponById(weaponId).id;
    if (id === 'revolver') return 'weapon_revolver_mk2';
    if (id === 'specialcarbine') return 'weapon_specialcarbine';
    return 'weapon_carbinerifle';
}

function stashPlayerLoadoutForArena(player) {
    if (!player || !mp.players.exists(player)) return;
    if (player._mbaSavedFastSlots) return;
    const slots = Array.isArray(player.fastSlots) ? player.fastSlots.slice(0, 3) : ['', '', ''];
    while (slots.length < 3) slots.push('');
    player._mbaSavedFastSlots = slots.map((s) => (s == null ? '' : String(s)));
    player._mbaSavedActiveSlot = player.getVariable('activeWeaponSlot');
}

function applyArenaMatchLoadout(player, weaponId) {
    if (!player || !mp.players.exists(player)) return;
    stashPlayerLoadoutForArena(player);
    const w = weaponById(weaponId);
    const item = arenaWeaponItemName(weaponId);
    const hash = mp.joaat(w.hash);
    try {
        player.removeAllWeapons();
    } catch (_e) {}
    player.fastSlots = [item, '', ''];
    try {
        if (typeof global.metaAcGiveWeapon === 'function') global.metaAcGiveWeapon(player, hash, 9999, true, 'mba-arena');
        else player.giveWeapon(hash, 9999, true);
    } catch (_e2) {}
    try {
        player.setVariable('mbaWeaponHash', hash);
        player.setVariable('mbaWeaponItem', item);
        player.setVariable('captWeaponHash', hash);
        player.setVariable('activeWeaponSlot', 0);
    } catch (_e3) {}
    try {
        player.call('givegun', [hash]);
        player.call('updateInventory', [JSON.stringify(player.inventory || []), JSON.stringify(player.fastSlots)]);
    } catch (_e4) {}
}

function restorePlayerLoadoutAfterArena(player) {
    if (!player || !mp.players.exists(player)) return;
    try {
        player.removeAllWeapons();
    } catch (_e) {}
    const saved = player._mbaSavedFastSlots;
    if (Array.isArray(saved)) {
        player.fastSlots = saved.map((s) => (s == null ? '' : String(s)));
        while (player.fastSlots.length < 3) player.fastSlots.push('');
        player.fastSlots = player.fastSlots.slice(0, 3);
    }
    delete player._mbaSavedFastSlots;
    delete player._mbaSavedActiveSlot;
    try {
        player.setVariable('mbaWeaponHash', 0);
        player.setVariable('mbaWeaponItem', null);
        player.setVariable('captWeaponHash', 0);
        player.setVariable('activeWeaponSlot', null);
    } catch (_e2) {}
    try {
        if (typeof global.saveInventory === 'function') global.saveInventory(player);
        player.call('updateInventory', [JSON.stringify(player.inventory || []), JSON.stringify(player.fastSlots || ['', '', ''])]);
        if (player.getVariable('ammo') == true) player.call('hideAmmo');
    } catch (_e3) {}
}

/** Совместимость со старыми вызовами */
function giveArenaWeapon(player, weaponId) {
    applyArenaMatchLoadout(player, weaponId);
}

function clearArenaWeapon(player) {
    restorePlayerLoadoutAfterArena(player);
}

function setFrozen(player, on) {
    try {
        player.setVariable('mbaFrozen', !!on);
    } catch (_e) {}
    try {
        player.call('arena:freeze', [!!on]);
    } catch (_e2) {}
}

function syncScoreboard(lobby) {
    if (!lobby || !lobby.match) return;
    const rows = lobby.members.map((st) => {
        const p = findPlayerByStatic(st);
        const stats = lobby.match.stats[st] || { kills: 0, damage: 0, name: '#' + st };
        return {
            static: st,
            name: (p && p.login) || stats.name || ('#' + st),
            kills: stats.kills || 0,
            damage: Math.floor(stats.damage || 0),
            team: lobby.teams[st] || 0,
            alive: !!(lobby.match.alive[st])
        };
    }).sort((a, b) => b.kills - a.kills || b.damage - a.damage);
    rows.forEach((r, i) => { r.place = i + 1; });
    const top5 = rows.slice(0, 5);
    const payload = JSON.stringify({
        round: lobby.match.round,
        rounds: ARENA_ROUNDS,
        top: top5,
        teamAlive: {
            1: rows.filter((r) => r.team === 1 && r.alive).length,
            2: rows.filter((r) => r.team === 2 && r.alive).length
        }
    });
    lobby.members.forEach((st) => {
        const p = findPlayerByStatic(st);
        if (p) {
            try { p.call('arena:scoreboard', [payload]); } catch (_e) {}
        }
    });
}

function assignTeams(lobby) {
    lobby.members.forEach((st) => {
        if (!lobby.teams[st]) {
            lobby.teams[st] = pickTeamForNewMember(lobby);
        }
    });
}

function countTeamMembers(lobby, team) {
    let n = 0;
    for (let i = 0; i < lobby.members.length; i++) {
        if (lobby.teams[lobby.members[i]] === team) n++;
    }
    return n;
}

function pickTeamForNewMember(lobby) {
    const t1 = countTeamMembers(lobby, 1);
    const t2 = countTeamMembers(lobby, 2);
    return t1 <= t2 ? 1 : 2;
}

function ensureMemberTeam(lobby, staticId) {
    const st = Number(staticId);
    if (!lobby.teams[st]) lobby.teams[st] = pickTeamForNewMember(lobby);
}

function pickDimension() {
    const dim = ARENA_DIM_BASE + (nextDimOffset++ % 900);
    return dim;
}

function teleportToRoundSpawn(player, lobby, isPrep) {
    const loc = getArenaMapLoc(lobby.mapId);
    const team = lobby.teams[player.static] || 1;
    const isAtk = team === 1;
    const teammates = lobby.members.filter((st) => lobby.teams[st] === team);
    const slot = Math.min(teammates.indexOf(Number(player.static)), 9);
    const pos = getCombatSpawnFromLocation(loc, isAtk, slot < 0 ? 0 : slot, isPrep);
    if (typeof global.acAllowMovement === 'function') global.acAllowMovement(player, 7000, 'mba-arena-tp');
    player.dimension = lobby.dimension;
    player.position = pos;
    if (typeof global.forceClearGreenZone === 'function') global.forceClearGreenZone(player);
}

function reviveForArena(player) {
    if (!player || !mp.players.exists(player)) return;
    if (typeof global.revivePlayerAlive === 'function') {
        global.revivePlayerAlive(player);
    } else {
        try {
            player.setVariable('dead', false);
            player.health = 100;
            player.armour = 0;
        } catch (_e) {}
    }
    try {
        player.setVariable('mbaDead', false);
    } catch (_e2) {}
}

function startRound(lobby) {
    if (!lobby || lobby.status !== 'match') return;
    const loc = getArenaMapLoc(lobby.mapId);
    const meta = getCombatArenaMetaFromLocation(loc);
    lobby.match.alive = {};
    lobby.members.forEach((st) => {
        lobby.match.alive[st] = true;
        const p = findPlayerByStatic(st);
        if (!p) return;
        reviveForArena(p);
        teleportToRoundSpawn(p, lobby, true);
        giveArenaWeapon(p, lobby.weaponId);
        setFrozen(p, true);
        try {
            p.setVariable('inMbaArena', true);
            p.setVariable('mbaLobbyId', lobby.id);
            p.call('arena:closeInventory');
        } catch (_e) {}
        if (meta) {
            try {
                p.setVariable('mbaArenaCx', meta.cx);
                p.setVariable('mbaArenaCy', meta.cy);
                p.setVariable('mbaArenaR', meta.radius);
                p.call('captArena:set', [JSON.stringify({
                    cx: meta.cx, cy: meta.cy, cz: meta.cz, r: meta.radius, dimension: lobby.dimension
                })]);
            } catch (_e2) {}
        }
        try {
            p.call('arena:round:start', [lobby.match.round, ARENA_ROUNDS, ARENA_FREEZE_MS]);
        } catch (_e3) {}
    });
    syncScoreboard(lobby);

    if (lobby.match.freezeTimer) clearTimeout(lobby.match.freezeTimer);
    lobby.match.freezeUntil = Date.now() + ARENA_FREEZE_MS;
    lobby.match.freezeTimer = setTimeout(() => {
        if (!lobbies.has(lobby.id) || lobby.status !== 'match') return;
        lobby.members.forEach((st) => {
            const p = findPlayerByStatic(st);
            if (p) setFrozen(p, false);
        });
    }, ARENA_FREEZE_MS);
}

function countAliveTeams(lobby) {
    let t1 = 0, t2 = 0;
    lobby.members.forEach((st) => {
        if (!lobby.match.alive[st]) return;
        if (lobby.teams[st] === 1) t1++;
        else if (lobby.teams[st] === 2) t2++;
    });
    return { t1, t2 };
}

function countTeamSizes(lobby) {
    let t1 = 0, t2 = 0;
    lobby.members.forEach((st) => {
        if (lobby.teams[st] === 1) t1++;
        else if (lobby.teams[st] === 2) t2++;
    });
    return { t1, t2 };
}

function distributeArenaPrizes(lobby, rows) {
    const pool = Math.floor(Number(lobby.prizePool) || 0);
    if (pool <= 0 || !rows.length) return rows;
    const { t1, t2 } = countTeamSizes(lobby);
    const top3Mode = t1 >= 3 && t2 >= 3;
    const payouts = top3Mode
        ? [
            Math.floor(pool * 0.5),
            Math.floor(pool * 0.3),
            Math.floor(pool * 0.2)
        ]
        : [pool];
    // остаток на 1 место
    const paid = payouts.reduce((a, b) => a + b, 0);
    if (payouts[0] != null) payouts[0] += (pool - paid);

    for (let i = 0; i < payouts.length && i < rows.length; i++) {
        const amount = payouts[i];
        if (amount <= 0) continue;
        rows[i].prize = amount;
        const p = findPlayerByStatic(rows[i].static);
        if (p) {
            payArenaCash(p, amount, 'prize');
            isNotify(p, 3, 'top-mid', `${i + 1} место: +${formatArenaMoney(amount)}$`, 5000);
        }
    }
    lobby.prizePool = 0;
    return rows;
}

function finishMatch(lobby) {
    if (!lobby || lobby.status !== 'match') return;
    if (lobby.match.freezeTimer) clearTimeout(lobby.match.freezeTimer);
    let rows = lobby.members.map((st) => {
        const p = findPlayerByStatic(st);
        const stats = lobby.match.stats[st] || { kills: 0, damage: 0, name: '#' + st };
        return {
            static: st,
            name: (p && p.login) || stats.name || ('#' + st),
            kills: stats.kills || 0,
            damage: Math.floor(stats.damage || 0),
            team: lobby.teams[st] || 0,
            prize: 0
        };
    }).sort((a, b) => b.kills - a.kills || b.damage - a.damage);

    rows = distributeArenaPrizes(lobby, rows);

    const resultsJson = JSON.stringify({ rows, rounds: ARENA_ROUNDS, prizePool: Number(lobby.fee || 0) * rows.length });
    lobby.members.slice().forEach((st) => {
        const p = findPlayerByStatic(st);
        if (!p) return;
        try { p.call('arena:results', [resultsJson]); } catch (_e) {}
        endMatchForPlayer(p, lobby, true);
    });
    lobbies.delete(lobby.id);
}

function nextRoundOrFinish(lobby) {
    if (!lobby || lobby.status !== 'match') return;
    if (lobby.match.round >= ARENA_ROUNDS) {
        finishMatch(lobby);
        return;
    }
    lobby.match.round += 1;
    startRound(lobby);
}

function onArenaDeath(player, killer) {
    const lobby = findLobbyOfPlayer(player);
    if (!lobby || lobby.status !== 'match' || !lobby.match) return;
    const st = Number(player.static);
    if (!lobby.match.alive[st]) return;
    lobby.match.alive[st] = false;

    const deathPos = player.position;
    try {
        player.spawn(deathPos);
        player.health = 100;
        player.armour = 0;
        player.setVariable('dead', false);
        player.setVariable('mbaDead', true);
        player.removeAllWeapons();
    } catch (_e) {}
    setFrozen(player, true);

    if (killer && mp.players.exists(killer) && Number(killer.static) !== st) {
        const ks = Number(killer.static);
        if (lobby.match.stats[ks]) lobby.match.stats[ks].kills += 1;
    }
    syncScoreboard(lobby);

    const { t1, t2 } = countAliveTeams(lobby);
    if (t1 === 0 || t2 === 0) {
        if (lobby.match.roundEndLock) return;
        lobby.match.roundEndLock = true;
        setTimeout(() => {
            lobby.match.roundEndLock = false;
            if (!lobbies.has(lobby.id)) return;
            nextRoundOrFinish(lobby);
        }, 2500);
    }
}

function endMatchForPlayer(player, lobby, silent) {
    if (!player || !mp.players.exists(player)) return;
    setFrozen(player, false);
    reviveForArena(player);
    try {
        player.setVariable('inMbaArena', false);
        player.setVariable('mbaDead', false);
        player.setVariable('mbaLobbyId', null);
        player.setVariable('mbaFrozen', false);
        player.setVariable('mbaArenaCx', null);
        player.setVariable('mbaArenaCy', null);
        player.setVariable('mbaArenaR', null);
    } catch (_e) {}
    // После снятия inMbaArena — восстановить слоты и сохранить в БД.
    clearArenaWeapon(player);
    try { player.call('captArena:clear'); } catch (_e2) {}
    try { player.call('arena:scoreboard', ['null']); } catch (_e3) {}
    try { player.call('arena:match:end'); } catch (_e4) {}
    try { player.call('arena:closeInventory'); } catch (_e5) {}

    if (typeof global.acAllowMovement === 'function') global.acAllowMovement(player, 7000, 'mba-arena-exit');
    player.dimension = 0;
    player.position = ARENA_RETURN_POS;

    if (!silent) {
        isNotify(player, 1, 'top-mid', 'Вы вышли с арены.', 3000);
    }
    if (lobby && lobby.status === 'match') {
        lobby.members = lobby.members.filter((s) => Number(s) !== Number(player.static));
        delete lobby.teams[player.static];
        delete lobby.match.alive[player.static];
        if (lobby.members.length < ARENA_MIN_PLAYERS) {
            finishMatch(lobby);
        } else {
            syncScoreboard(lobby);
            const { t1, t2 } = countAliveTeams(lobby);
            if (t1 === 0 || t2 === 0) nextRoundOrFinish(lobby);
        }
    }
}

// ─── Events ─────────────────────────────────────────────────────────────────

function openArenaUiForPlayer(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    const lobby = findLobbyOfPlayer(player);
    if (lobby && lobby.status === 'lobby') {
        pushLobbyRoom(player, lobby);
    } else if (lobby && lobby.status === 'match') {
        pushUi(player, { view: 'ingame', myLobby: lobbyPublic(lobby) });
    } else {
        pushLobbyList(player);
    }
    player.call('arena:ui:open');
}

mp.events.add('arena:open:phone:s', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!isNearArena(player) && player.getVariable('inMbaArena') !== true) {
            return isNotify(player, 2, 'top-mid', 'Вы не возле арены', 3500);
        }
        openArenaUiForPlayer(player);
    } catch (e) {
        console.log('[arena:open:phone:s]', e);
    }
});

mp.events.add('arena:open:s', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        isNotify(player, 2, 'top-mid', 'Арена доступна только через телефон.', 3500);
    } catch (e) {
        console.log('[arena:open:s]', e);
    }
});

mp.events.add('arena:list:s', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (!isNearArena(player) && player.getVariable('inMbaArena') !== true) {
            return isNotify(player, 2, 'top-mid', 'Вы не возле арены', 3500);
        }
        if (findLobbyOfPlayer(player)) {
            const lobby = findLobbyOfPlayer(player);
            if (lobby.status === 'lobby') return pushLobbyRoom(player, lobby);
        }
        pushLobbyList(player);
    } catch (e) {
        console.log('[arena:list:s]', e);
    }
});

mp.events.add('arena:create:s', (player, raw) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!isNearArena(player)) return isNotify(player, 2, 'top-mid', 'Вы не возле арены', 3500);
        if (findLobbyOfPlayer(player)) return isNotify(player, 2, 'top-mid', 'Вы уже в лобби.', 3000);

        let data = {};
        try { data = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch (_e) {}
        const name = String(data.name || '').trim().slice(0, 32) || (player.login + ' lobby');
        const password = String(data.password || '').trim().slice(0, 24);
        const mapId = Math.max(0, Math.min(ARENA_MAP_CATALOG.length - 1, parseInt(data.mapId, 10) || 0));
        const weaponId = weaponById(data.weaponId).id;
        const membersMax = Math.max(2, Math.min(ARENA_MAX_PLAYERS, parseInt(data.membersMax, 10) || ARENA_MAX_PLAYERS));
        const fee = Math.max(0, Math.min(5000000, Math.floor(Number(data.fee) || 0)));

        const id = nextLobbyId++;
        const lobby = {
            id,
            name,
            password,
            mapId,
            weaponId,
            fee,
            prizePool: 0,
            membersMax,
            hostStatic: Number(player.static),
            hostName: player.login || ('#' + player.static),
            members: [Number(player.static)],
            teams: {},
            status: 'lobby',
            lastJoinAt: Date.now(),
            createdAt: Date.now(),
            dimension: 0,
            match: null
        };
        lobbies.set(id, lobby);
        player.setVariable('mbaLobbyId', id);
        ensureMemberTeam(lobby, player.static);
        pushLobbyRoom(player, lobby);
    } catch (e) {
        console.log('[arena:create:s]', e);
    }
});

mp.events.add('arena:join:s', (player, lobbyIdRaw, passwordRaw) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!isNearArena(player)) return isNotify(player, 2, 'top-mid', 'Вы не возле арены', 3500);
        if (findLobbyOfPlayer(player)) return isNotify(player, 2, 'top-mid', 'Вы уже в лобби.', 3000);

        const lobby = lobbies.get(parseInt(lobbyIdRaw, 10));
        if (!lobby || lobby.status !== 'lobby') return isNotify(player, 2, 'top-mid', 'Лобби не найдено.', 3000);
        if (lobby.members.length >= lobby.membersMax) return isNotify(player, 2, 'top-mid', 'Лобби заполнено.', 3000);
        if (lobby.password) {
            if (String(passwordRaw || '') !== lobby.password) {
                return isNotify(player, 2, 'top-mid', 'Неверный пароль.', 3000);
            }
        }
        lobby.members.push(Number(player.static));
        lobby.lastJoinAt = Date.now();
        ensureMemberTeam(lobby, player.static);
        player.setVariable('mbaLobbyId', lobby.id);
        broadcastLobby(lobby);
    } catch (e) {
        console.log('[arena:join:s]', e);
    }
});

mp.events.add('arena:team:s', (player, teamRaw) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const lobby = findLobbyOfPlayer(player);
        if (!lobby || lobby.status !== 'lobby') return;
        const st = Number(player.static);
        if (!lobby.members.some((m) => Number(m) === st)) return;
        const team = parseInt(teamRaw, 10) === 2 ? 2 : 1;
        lobby.teams[st] = team;
        broadcastLobby(lobby);
    } catch (e) {
        console.log('[arena:team:s]', e);
    }
});

mp.events.add('arena:leave:s', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const lobby = findLobbyOfPlayer(player);
        leaveLobby(player, false);
        if (lobby && lobby.status === 'lobby') pushLobbyList(player);
        else if (!lobby || lobby.status !== 'match') pushLobbyList(player);
    } catch (e) {
        console.log('[arena:leave:s]', e);
    }
});

mp.events.add('arena:start:s', async (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        const lobby = findLobbyOfPlayer(player);
        if (!lobby || lobby.status !== 'lobby') return;
        if (Number(lobby.hostStatic) !== Number(player.static)) {
            return isNotify(player, 2, 'top-mid', 'Только хост может начать игру.', 3000);
        }
        if (lobby.members.length < ARENA_MIN_PLAYERS) {
            return isNotify(player, 2, 'top-mid', `Нужно минимум ${ARENA_MIN_PLAYERS} игрока.`, 3000);
        }
        const wait = (lobby.lastJoinAt + ARENA_START_DELAY_MS) - Date.now();
        if (wait > 0) {
            return isNotify(player, 2, 'top-mid', `Подождите ещё ${Math.ceil(wait / 1000)} сек. после входа последнего игрока.`, 3500);
        }
        if (lobby._starting) return;
        lobby._starting = true;

        const fee = Math.max(0, Math.floor(Number(lobby.fee) || 0));
        if (fee > 0) {
            for (let i = 0; i < lobby.members.length; i++) {
                const p = findPlayerByStatic(lobby.members[i]);
                if (!p) {
                    lobby._starting = false;
                    return isNotify(player, 2, 'top-mid', 'Не все игроки в сети.', 3000);
                }
                const cash = parseInt(Number(p.money), 10) || 0;
                if (cash < fee) {
                    lobby._starting = false;
                    return isNotify(player, 2, 'top-mid', `${p.login} не хватает денег на взнос (${formatArenaMoney(fee)}$).`, 4500);
                }
            }
            let pool = 0;
            for (let i = 0; i < lobby.members.length; i++) {
                const p = findPlayerByStatic(lobby.members[i]);
                const rem = await takeArenaCash(p, fee, 'fee');
                if (!rem.ok) {
                    lobby._starting = false;
                    return isNotify(player, 2, 'top-mid', rem.msg || 'Ошибка списания взноса.', 4000);
                }
                pool += fee;
            }
            lobby.prizePool = pool;
        } else {
            lobby.prizePool = 0;
        }

        lobby.status = 'match';
        lobby.dimension = pickDimension();
        assignTeams(lobby);
        lobby.match = {
            round: 1,
            alive: {},
            stats: {},
            freezeTimer: null,
            freezeUntil: 0,
            roundEndLock: false
        };
        lobby.members.forEach((st) => {
            const p = findPlayerByStatic(st);
            lobby.match.stats[st] = {
                kills: 0,
                damage: 0,
                name: p && p.login ? p.login : ('#' + st)
            };
            if (p) {
                try {
                    p.call('arena:ui:close');
                    p.outputChatBox('!{#057aff}Чтобы выйти напишите /exit');
                    if (fee > 0) {
                        isNotify(p, 1, 'top-mid', `Взнос ${formatArenaMoney(fee)}$ · банк ${formatArenaMoney(lobby.prizePool)}$`, 4000);
                    }
                } catch (_e) {}
            }
        });
        lobby._starting = false;
        startRound(lobby);
    } catch (e) {
        console.log('[arena:start:s]', e);
        try {
            const lobby = findLobbyOfPlayer(player);
            if (lobby) lobby._starting = false;
        } catch (_e2) {}
    }
});

mp.events.add('arena:closeUi:s', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        player.call('arena:ui:close');
    } catch (_e) {}
});

mp.events.addCommand('exit', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        if (player.getVariable('inMbaArena') !== true && !findLobbyOfPlayer(player)) {
            return;
        }
        const lobby = findLobbyOfPlayer(player);
        if (lobby && lobby.status === 'match') {
            endMatchForPlayer(player, lobby, false);
        } else {
            leaveLobby(player, false);
            try { player.call('arena:ui:close'); } catch (_e) {}
        }
    } catch (e) {
        console.log('[arena /exit]', e);
    }
});

mp.events.add('playerDeath', (player, reason, killer) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        if (player.getVariable('inMbaArena') !== true) return;
        onArenaDeath(player, killer);
    } catch (e) {
        console.log('[arena death]', e);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player) return;
        leaveLobby(player, true);
    } catch (_e) {}
});

/** Урон для таблицы после матча */
global.arenaTrackDamage = function arenaTrackDamage(attacker, target, amount) {
    try {
        if (!attacker || !target || !mp.players.exists(attacker) || !mp.players.exists(target)) return;
        if (attacker.getVariable('inMbaArena') !== true) return;
        if (target.getVariable('inMbaArena') !== true) return;
        const lobby = findLobbyOfPlayer(attacker);
        if (!lobby || lobby.status !== 'match' || !lobby.match) return;
        const st = Number(attacker.static);
        if (!lobby.match.stats[st]) return;
        lobby.match.stats[st].damage += Math.max(0, Number(amount) || 0);
    } catch (_e) {}
};

global.isPlayerInMbaArena = function isPlayerInMbaArena(player) {
    return !!(player && mp.players.exists(player) && player.getVariable('inMbaArena') === true);
};

// ─── Брошенный транспорт в ЗЗ арены и казино ────────────────────────────────

const GZ_ABANDON_VEHICLE_MS = 5 * 60 * 1000;
/** @type {Map<number, { timer: *, ownerStatic: number, zoneKind: string }>} */
const gzAbandonVehicleTimers = new Map();

function clearGzAbandonVehicleTimer(vehicle) {
    if (!vehicle) return;
    const id = typeof vehicle === 'number' ? vehicle : vehicle.id;
    const entry = gzAbandonVehicleTimers.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    gzAbandonVehicleTimers.delete(id);
}

function findGzAbandonVehicleOwner(vehicle) {
    const ownerStatic = Number(vehicle.getVariable('owner'));
    if (!ownerStatic) return null;
    return mp.players.toArray().find((p) => Number(p.static) === ownerStatic) || null;
}

function isGzAbandonableVehicle(vehicle) {
    if (!vehicle || !mp.vehicles.exists(vehicle)) return false;
    if (vehicle.getVariable('deleted')) return false;

    const ownerStatic = Number(vehicle.getVariable('owner'));
    if (!ownerStatic) return false;

    if (vehicle.getVariable('rent') === true) return true;

    const owner = findGzAbandonVehicleOwner(vehicle);
    if (owner && owner.carActive === vehicle) return true;

    return false;
}

function getGzAbandonZoneKind(pos, dimension) {
    if (typeof global.getVehicleAbandonZoneKind === 'function') {
        return global.getVehicleAbandonZoneKind(pos, dimension);
    }
    if (typeof global.isPointInArenaZone === 'function' && global.isPointInArenaZone(pos, dimension)) {
        return 'arena';
    }
    return null;
}

function notifyGzAbandonWarning(player) {
    if (!player || !mp.players.exists(player)) return;
    isNotify(
        player,
        1,
        'top-mid',
        'Через 5 мин авто исчезнет. Садитесь обратно.',
        5000
    );
}

function gzAbandonRemovedMessage(zoneKind) {
    return zoneKind === 'casino' ? 'Авто убрано с казино.' : 'Авто убрано с арены.';
}

function scheduleGzAbandonVehicleDespawn(vehicle, notifyPlayer) {
    if (!isGzAbandonableVehicle(vehicle)) return;
    const zoneKind = getGzAbandonZoneKind(vehicle.position, vehicle.dimension);
    if (!zoneKind) return;

    const occupants = vehicle.getOccupants();
    if (occupants && occupants.length > 0) return;

    clearGzAbandonVehicleTimer(vehicle);

    const vehicleId = vehicle.id;
    const ownerStatic = Number(vehicle.getVariable('owner'));

    if (notifyPlayer && mp.players.exists(notifyPlayer)) {
        notifyGzAbandonWarning(notifyPlayer);
    } else {
        const owner = findGzAbandonVehicleOwner(vehicle);
        if (owner) notifyGzAbandonWarning(owner);
    }

    const timer = setTimeout(() => {
        gzAbandonVehicleTimers.delete(vehicleId);
        try {
            const veh = mp.vehicles.at(vehicleId);
            if (!veh || !mp.vehicles.exists(veh) || veh.getVariable('deleted')) return;
            const vehZoneKind = getGzAbandonZoneKind(veh.position, veh.dimension);
            if (!vehZoneKind) return;

            const occ = veh.getOccupants();
            if (occ && occ.length > 0) return;

            if (typeof global.deleteVehTwo === 'function') global.deleteVehTwo(veh);
            else if (typeof global.deleteVeh === 'function') global.deleteVeh(veh);

            const owner = mp.players.toArray().find((p) => Number(p.static) === ownerStatic);
            if (owner && mp.players.exists(owner)) {
                isNotify(owner, 1, 'top-mid', gzAbandonRemovedMessage(vehZoneKind), 4000);
            }
        } catch (_e) {}
    }, GZ_ABANDON_VEHICLE_MS);

    gzAbandonVehicleTimers.set(vehicleId, { timer, ownerStatic, zoneKind });
}

function tryScheduleGzAbandonAfterExit(player, vehicle) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    if (!vehicle || !mp.vehicles.exists(vehicle)) return;
    if ((player.dimension || 0) !== 0) return;
    if (player.getVariable('inMbaArena') === true) return;
    if (!getGzAbandonZoneKind(vehicle.position, vehicle.dimension)) return;

    setTimeout(() => {
        try {
            if (!mp.vehicles.exists(vehicle)) return;
            if (!isGzAbandonableVehicle(vehicle)) return;
            if (!getGzAbandonZoneKind(vehicle.position, vehicle.dimension)) return;

            const occupants = vehicle.getOccupants();
            if (occupants && occupants.length > 0) return;

            const ownerStatic = Number(vehicle.getVariable('owner'));
            const notifyPlayer =
                Number(player.static) === ownerStatic ||
                player.carActive === vehicle
                    ? player
                    : findGzAbandonVehicleOwner(vehicle);

            scheduleGzAbandonVehicleDespawn(vehicle, notifyPlayer);
        } catch (_e) {}
    }, 200);
}

mp.events.add('playerExitVehicle', (player, vehicle) => {
    try {
        tryScheduleGzAbandonAfterExit(player, vehicle);
    } catch (e) {
        console.log('[gz abandon vehicle exit]', e);
    }
});

mp.events.add('playerEnterVehicle', (player, vehicle) => {
    try {
        if (!vehicle || !mp.vehicles.exists(vehicle)) return;
        clearGzAbandonVehicleTimer(vehicle);
    } catch (_e) {}
});

mp.events.add('playerQuit', (player) => {
    try {
        if (!player || !player.carActive) return;
        const veh = player.carActive;
        if (!mp.vehicles.exists(veh)) return;
        if (gzAbandonVehicleTimers.has(veh.id)) return;
        scheduleGzAbandonVehicleDespawn(veh, null);
    } catch (_e) {}
});
