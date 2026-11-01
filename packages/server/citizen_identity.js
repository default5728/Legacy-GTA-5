'use strict';

const EPSILON_GOAL = 5000000;
const CITIZEN_LABEL = 'Гражданин';

function normalizeFamilyKey(name) {
    if (name == null) return '';
    return String(name).trim();
}

function playerFractionId(p) {
    if (!p) return 0;
    return parseInt(p.getVariable && p.getVariable('fraction'), 10) || parseInt(p.fraction, 10) || 0;
}

function acquaintancePairKey(a, b) {
    const x = Number(a);
    const y = Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x === y) return null;
    return x < y ? [x, y] : [y, x];
}

function ensureCitizenSchema() {
    if (!global.DB) return;
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN epsilon_donated BIGINT(20) NOT NULL DEFAULT 0',
        () => {}
    );
    global.DB.query(
        'ALTER TABLE accounts ADD COLUMN epsilon_unlocked TINYINT(1) NOT NULL DEFAULT 0',
        () => {}
    );
    global.DB.query(
        `CREATE TABLE IF NOT EXISTS player_acquaintances (
            id INT AUTO_INCREMENT PRIMARY KEY,
            static_low INT NOT NULL,
            static_high INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_pair (static_low, static_high),
            KEY idx_low (static_low),
            KEY idx_high (static_high)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        () => {}
    );
}

function safeLoadCitizenIdentity(player, row) {
    if (!player || !mp.players.exists(player)) return;
    try {
        if (typeof global.loadCitizenIdentityForPlayer === 'function') {
            global.loadCitizenIdentityForPlayer(player, row);
        }
    } catch (e) {
        console.log('[citizen] load error:', e && (e.message || e));
    }
}

global.safeLoadCitizenIdentity = safeLoadCitizenIdentity;

if (typeof global.whenDbReady === 'function') {
    global.whenDbReady(ensureCitizenSchema);
} else {
    setTimeout(ensureCitizenSchema, 2500);
}

function applyAcquaintanceSetToPlayer(player, staticList) {
    const set = new Set();
    (staticList || []).forEach((n) => {
        const v = parseInt(n, 10);
        if (Number.isFinite(v) && v > 0) set.add(v);
    });
    player._acquaintanceSet = set;
    try {
        player.call('citizen:sync:c', [JSON.stringify({
            selfStatic: Number(player.static) || 0,
            acquaintances: Array.from(set)
        })]);
    } catch (_e) {}
}

global.loadCitizenIdentityForPlayer = function loadCitizenIdentityForPlayer(player, row) {
    if (!player || !mp.players.exists(player)) return;

    try {
        const donated = row && row.epsilon_donated != null ? parseInt(row.epsilon_donated, 10) : 0;
        const unlocked = !!(row && (Number(row.epsilon_unlocked) === 1 || donated >= EPSILON_GOAL));
        player.epsilonDonated = Number.isFinite(donated) && donated > 0 ? donated : 0;
        player.epsilonUnlocked = unlocked;
        player.setVariable('epsilonUnlocked', unlocked ? true : null);
    } catch (e) {
        console.log('[citizen] epsilon hydrate:', e && (e.message || e));
    }

    const st = Number(player.static);
    if (!st) {
        applyAcquaintanceSetToPlayer(player, []);
        return;
    }

    if (!global.DB || typeof global.DB.query !== 'function') {
        applyAcquaintanceSetToPlayer(player, []);
        return;
    }

    global.DB.query(
        'SELECT static_low, static_high FROM player_acquaintances WHERE static_low = ? OR static_high = ?',
        [st, st],
        (err, rows) => {
            if (!mp.players.exists(player)) return;
            const list = [];
            if (!err && rows) {
                rows.forEach((r) => {
                    const lo = parseInt(r.static_low, 10);
                    const hi = parseInt(r.static_high, 10);
                    if (lo === st && hi !== st) list.push(hi);
                    else if (hi === st && lo !== st) list.push(lo);
                });
            } else if (err) {
                console.log('[citizen] acquaintances load:', err.message || err);
            }
            applyAcquaintanceSetToPlayer(player, list);
        }
    );
};

global.isPlayerEpsilonUnlocked = function isPlayerEpsilonUnlocked(player) {
    if (!player) return false;
    if (player.epsilonUnlocked === true) return true;
    const d = parseInt(player.epsilonDonated, 10) || 0;
    return d >= EPSILON_GOAL;
};

global.citizenViewerSeesLogin = function citizenViewerSeesLogin(viewer, subject) {
    if (!viewer || !subject) return false;
    // Свой логин игрок всегда «видит» сам — маска только для чужих.
    if (Number(viewer.static) === Number(subject.static)) return true;

    const vf = normalizeFamilyKey(viewer.family || viewer.getVariable('family'));
    const sf = normalizeFamilyKey(subject.family || subject.getVariable('family'));
    if (vf && sf && vf === sf) return true;

    const vfr = playerFractionId(viewer);
    const sfr = playerFractionId(subject);
    if (vfr > 0 && vfr === sfr) return true;

    const set = viewer._acquaintanceSet;
    const ss = Number(subject.static);
    return !!(set && set.has(ss));
};

/** Реальный логин из данных игрока (никогда не подменяется на «Гражданин»). */
global.citizenRealLogin = function citizenRealLogin(subject) {
    if (!subject) return '';
    const fromVar = subject.getVariable && typeof subject.getVariable === 'function'
        ? subject.getVariable('login')
        : null;
    return String(subject.login || subject.name || fromVar || '').trim();
};

/** Визуальное имя для viewer: маска «Гражданин» до рукопожатия; login в БД не меняется. */
/** Для квестов: viewer ещё видит subject как «Гражданин» (не знаком). */
global.citizenSubjectIsStrangerToViewer = function citizenSubjectIsStrangerToViewer(viewer, subject) {
    if (!viewer || !subject || !mp.players.exists(viewer) || !mp.players.exists(subject)) return false;
    return !global.citizenViewerSeesLogin(viewer, subject);
};

global.citizenDisplayLogin = function citizenDisplayLogin(viewer, subject, fallbackLogin) {
    if (!subject) return CITIZEN_LABEL;
    const realLogin = String(fallbackLogin || global.citizenRealLogin(subject) || '').trim();
    if (!realLogin) return CITIZEN_LABEL;
    if (global.citizenViewerSeesLogin(viewer, subject)) return realLogin;
    return CITIZEN_LABEL;
};

global.addPlayerAcquaintancePair = function addPlayerAcquaintancePair(a, b, cb) {
    const pair = acquaintancePairKey(a && a.static, b && b.static);
    if (!pair) {
        if (typeof cb === 'function') cb();
        return;
    }
    const lo = pair[0];
    const hi = pair[1];
    global.DB.query(
        'INSERT IGNORE INTO player_acquaintances (static_low, static_high) VALUES (?, ?)',
        [lo, hi],
        () => {
            [a, b].forEach((p) => {
                if (!p || !mp.players.exists(p)) return;
                if (!p._acquaintanceSet) p._acquaintanceSet = new Set();
                p._acquaintanceSet.add(Number(p.static) === lo ? hi : lo);
                applyAcquaintanceSetToPlayer(p, Array.from(p._acquaintanceSet));
            });
            if (a && b && mp.players.exists(a) && mp.players.exists(b)) {
                const nameForA = global.citizenDisplayLogin(a, b);
                const nameForB = global.citizenDisplayLogin(b, a);
                isNotify(a, 3, 'top-mid', `Вы познакомились с ${nameForA}.`, 4000);
                isNotify(b, 3, 'top-mid', `Вы познакомились с ${nameForB}.`, 4000);
            }
            if (typeof cb === 'function') cb();
        }
    );
};

global.citizenPushChatToAll = function citizenPushChatToAll(speaker, lineBuilder) {
    mp.players.forEach((viewer) => {
        if (!viewer || !mp.players.exists(viewer) || !viewer.getVariable('auth')) return;
        try {
            const line = lineBuilder(viewer, speaker);
            if (line) viewer.call('chat:pushLine', [line]);
        } catch (_e) {}
    });
};

global.EPSILON_GOAL = EPSILON_GOAL;
global.CITIZEN_LABEL = CITIZEN_LABEL;
