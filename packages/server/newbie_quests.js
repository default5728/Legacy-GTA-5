'use strict';

/** Путь новичка — только $. Сумма цепочки: 810 000$. */
const NEWBIE_QUESTS = [
    { id: 'rent_car', title: 'Арендовать машину', desc: 'Арендуй любой автомобиль у NPC на спавне.', reward: '3 000$', amount: 3000 },
    { id: 'join_fraction', title: 'Вступить во фракцию', desc: 'Попроси приглашение во фракцию у игрока и прими его.', reward: '5 000$', amount: 5000 },
    { id: 'handshake_5', title: 'Пожать руку 5 людям', desc: 'Пожми руку пяти разным игрокам.', reward: '7 000$', amount: 7000, counter: 'handshakes', target: 5 },
    { id: 'buy_weapon', title: 'Купить оружие', desc: 'Купи оружие в любом магазине оружия.', reward: '10 000$', amount: 10000 },
    { id: 'kill_player', title: 'Убить игрока', desc: 'Убей одного игрока.', reward: '15 000$', amount: 15000 },
    { id: 'kill_10', title: 'Убить 10 игроков', desc: 'Убей 10 игроков.', reward: '25 000$', amount: 25000, counter: 'kills', target: 10 },
    { id: 'kill_50', title: 'Убить 50 игроков', desc: 'Убей 50 игроков.', reward: '60 000$', amount: 60000, counter: 'kills', target: 50 },
    { id: 'deliver_ygon', title: 'Отвезти угонку', desc: 'Сдай угнанную машину у NPC «Чёрный заработок».', reward: '15 000$', amount: 15000, counter: 'ygons', target: 1 },
    { id: 'deliver_ygon_10', title: 'Отвезти 10 угонок', desc: 'Сдай 10 угнанных машин.', reward: '40 000$', amount: 40000, counter: 'ygons', target: 10 },
    { id: 'create_family', title: 'Создать организацию', desc: 'Создай свою организацию.', reward: '80 000$', amount: 80000 },
    { id: 'buy_mansion', title: 'Купить особняк', desc: 'Купи особняк для своей организации.', reward: '150 000$', amount: 150000 },
    { id: 'buy_epsilon', title: 'Рукопожатие Epsilon', desc: 'Пополни счёт Epsilon для разблокировки анимации.', reward: '250 000$', amount: 250000 }
];

const QUEST_BY_ID = {};
NEWBIE_QUESTS.forEach((q) => { QUEST_BY_ID[q.id] = q; });

function defaultProgress() {
    return { done: {}, kills: 0, handshakes: 0, handshakeWith: [], ygons: 0 };
}

function parseProgress(raw) {
    try {
        const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!p || typeof p !== 'object') return defaultProgress();
        if (Array.isArray(p.completed) || p.step != null) return defaultProgress();
        if (!p.done || typeof p.done !== 'object') p.done = {};
        p.kills = parseInt(p.kills, 10) || 0;
        if (!Array.isArray(p.handshakeWith)) p.handshakeWith = [];
        p.handshakeWith = p.handshakeWith
            .map((x) => parseInt(x, 10))
            .filter((x) => Number.isFinite(x) && x > 0);
        p.handshakes = p.handshakeWith.length;
        p.ygons = parseInt(p.ygons, 10) || 0;
        return p;
    } catch (_e) {
        return defaultProgress();
    }
}

function ensureNewbieQuestsColumn(cb) {
    if (!global.DB) return cb && cb();
    global.DB.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'newbie_quests'`,
        [],
        (err, rows) => {
            if (err || !rows || !rows[0] || Number(rows[0].c) > 0) return cb && cb();
            global.DB.query('ALTER TABLE accounts ADD COLUMN newbie_quests TEXT NULL', () => cb && cb());
        }
    );
}

mp.events.add('packagesLoaded', () => {
    ensureNewbieQuestsColumn();
});

function loadNewbieQuests(player, cb) {
    if (!global.DB || !player.static) {
        player._newbieQuests = defaultProgress();
        return cb && cb(player._newbieQuests);
    }
    global.DB.query('SELECT newbie_quests FROM accounts WHERE static = ? LIMIT 1', [player.static], (err, rows) => {
        player._newbieQuests = (!err && rows && rows[0]) ? parseProgress(rows[0].newbie_quests) : defaultProgress();
        cb && cb(player._newbieQuests);
    });
}

function saveNewbieQuests(player) {
    if (!global.DB || !player.static || !player._newbieQuests) return;
    const json = JSON.stringify(player._newbieQuests);
    global.DB.query('UPDATE accounts SET newbie_quests = ? WHERE static = ?', [json, player.static], () => {});
}

function isQuestDone(prog, quest) {
    if (!prog || !quest) return false;
    if (prog.done[quest.id]) return true;
    if (prog.skipped && prog.skipped[quest.id]) return true;
    if (quest.counter && quest.target != null) {
        const val = parseInt(prog[quest.counter], 10) || 0;
        return val >= Number(quest.target);
    }
    return false;
}

function getCurrentQuest(prog) {
    for (let i = 0; i < NEWBIE_QUESTS.length; i++) {
        const q = NEWBIE_QUESTS[i];
        if (!isQuestDone(prog, q)) {
            return { quest: q, index: i };
        }
    }
    return null;
}

function getCounterProgress(prog, quest) {
    if (!quest || !quest.counter || quest.target == null) return null;
    const val = parseInt(prog[quest.counter], 10) || 0;
    return {
        progress: Math.min(val, Number(quest.target)),
        target: Number(quest.target)
    };
}

function buildQuestPayload(player) {
    const prog = player._newbieQuests || defaultProgress();
    let completed = 0;
    NEWBIE_QUESTS.forEach((q) => {
        if (isQuestDone(prog, q)) completed++;
    });

    const curEntry = getCurrentQuest(prog);
    let current = null;
    if (curEntry) {
        const q = curEntry.quest;
        const counter = getCounterProgress(prog, q);
        current = {
            id: q.id,
            title: q.title,
            desc: String(q.desc || ''),
            reward: q.reward,
            step: curEntry.index + 1,
            progress: counter ? counter.progress : null,
            target: counter ? counter.target : null
        };
    }

    return {
        title: 'Задания',
        subtitle: 'Выполняйте по порядку',
        current,
        completed,
        total: NEWBIE_QUESTS.length
    };
}

function grantQuestReward(player, quest) {
    if (!quest || !mp.players.exists(player)) return;
    const fmt2 = typeof global.formatnum2 === 'function' ? global.formatnum2 : String;
    const add = parseInt(quest.amount, 10) || 0;
    if (add > 0 && typeof global.givemoney === 'function') global.givemoney(player, add);
    if (typeof isNotify === 'function') {
        isNotify(player, 3, 'top-mid', `Задание «${quest.title}» - +${fmt2(add)}$`, 4500);
    }
    try { player.call('sound:client', [3]); } catch (_s) {}
}

function isPaidWeaponInventoryKey(itemKey) {
    const base = String(itemKey || '').split('(')[0].trim().toLowerCase();
    return base.startsWith('weapon_');
}

function onNewbieWeaponPurchased(player, itemKey) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    if (!isPaidWeaponInventoryKey(itemKey)) return;
    tryCompleteNewbieQuest(player, 'buy_weapon');
}

function tryCompleteNewbieQuest(player, questId) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return false;
    const quest = QUEST_BY_ID[questId];
    if (!quest) return false;
    if (!player._newbieQuests) player._newbieQuests = defaultProgress();
    const prog = player._newbieQuests;
    if (prog.done[questId]) return false;

    const curEntry = getCurrentQuest(prog);
    if (!curEntry || curEntry.quest.id !== questId) return false;

    if (quest.counter && quest.target != null) {
        const val = parseInt(prog[quest.counter], 10) || 0;
        if (val < Number(quest.target)) return false;
    }

    prog.done[questId] = true;
    saveNewbieQuests(player);
    grantQuestReward(player, quest);
    syncNewbieQuests(player);
    if (typeof global.pushMenuAccountProfile === 'function') {
        try { global.pushMenuAccountProfile(player); } catch (_e) {}
    }
    return true;
}

function onPlayerKillForQuests(killer) {
    if (!killer || !mp.players.exists(killer)) return;
    if (!killer._newbieQuests) killer._newbieQuests = defaultProgress();
    killer._newbieQuests.kills = (parseInt(killer._newbieQuests.kills, 10) || 0) + 1;
    saveNewbieQuests(killer);

    const cur = getCurrentQuest(killer._newbieQuests);
    if (cur) {
        const id = cur.quest.id;
        if (id === 'kill_player' && killer._newbieQuests.kills >= 1) {
            tryCompleteNewbieQuest(killer, 'kill_player');
        } else if (id === 'kill_10' && killer._newbieQuests.kills >= 10) {
            tryCompleteNewbieQuest(killer, 'kill_10');
        } else if (id === 'kill_50' && killer._newbieQuests.kills >= 50) {
            tryCompleteNewbieQuest(killer, 'kill_50');
        }
    }
    syncNewbieQuests(killer);
}

function applyHandshakeQuestProgress(player, partnerStatic) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    if (!player._newbieQuests) player._newbieQuests = defaultProgress();
    const prog = player._newbieQuests;
    const cur = getCurrentQuest(prog);
    if (!cur || cur.quest.id !== 'handshake_5') {
        syncNewbieQuests(player);
        return;
    }
    const ps = parseInt(partnerStatic, 10);
    if (!Number.isFinite(ps) || ps < 1 || ps === parseInt(player.static, 10)) {
        syncNewbieQuests(player);
        return;
    }
    if (!Array.isArray(prog.handshakeWith)) prog.handshakeWith = [];
    if (prog.handshakeWith.includes(ps)) {
        syncNewbieQuests(player);
        return;
    }
    prog.handshakeWith.push(ps);
    prog.handshakes = prog.handshakeWith.length;
    saveNewbieQuests(player);
    if (prog.handshakes >= 5) tryCompleteNewbieQuest(player, 'handshake_5');
    else syncNewbieQuests(player);
}

function onNewbieHandshakeComplete(player, partnerStatic) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    const run = () => applyHandshakeQuestProgress(player, partnerStatic);
    if (!player._newbieQuests) {
        loadNewbieQuests(player, run);
        return;
    }
    run();
}

function onNewbieYgonDelivered(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    if (!player._newbieQuests) player._newbieQuests = defaultProgress();
    const prog = player._newbieQuests;
    prog.ygons = (parseInt(prog.ygons, 10) || 0) + 1;
    saveNewbieQuests(player);

    const cur = getCurrentQuest(prog);
    if (cur) {
        const id = cur.quest.id;
        if (id === 'deliver_ygon' && prog.ygons >= 1) {
            tryCompleteNewbieQuest(player, 'deliver_ygon');
        } else if (id === 'deliver_ygon_10' && prog.ygons >= 10) {
            tryCompleteNewbieQuest(player, 'deliver_ygon_10');
        } else {
            syncNewbieQuests(player);
        }
    } else {
        syncNewbieQuests(player);
    }
}

function tryAutoCompleteCurrentQuest(player) {
    if (!player || !mp.players.exists(player) || !player._newbieQuests) return;
    const curEntry = getCurrentQuest(player._newbieQuests);
    if (!curEntry) return;
    const q = curEntry.quest;
    if (!q.counter || q.target == null) return;
    const val = parseInt(player._newbieQuests[q.counter], 10) || 0;
    if (val >= Number(q.target)) {
        tryCompleteNewbieQuest(player, q.id);
    }
}

function syncNewbieQuests(player) {
    if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
    const push = () => {
        tryAutoCompleteCurrentQuest(player);
        try { player.call('newbieQuests:sync', [JSON.stringify(buildQuestPayload(player))]); } catch (_e) {}
    };
    if (!player._newbieQuests) {
        return loadNewbieQuests(player, push);
    }
    push();
}

global.buildNewbieQuestListForMenu = function buildNewbieQuestListForMenu(player) {
    const payload = buildQuestPayload(player);
    const cur = payload.current;
    if (!cur) return [];
    return [{
        uid: cur.id,
        name: cur.title,
        desc: cur.desc || payload.subtitle || 'Выполняйте по порядку',
        cancel: false,
        part: {
            name: cur.title,
            desc: `Награда: ${cur.reward}`,
            progress: cur.progress != null ? cur.progress : 0,
            needProgress: cur.target != null ? cur.target : 1
        }
    }];
};

global.cancelNewbieQuest = function cancelNewbieQuest(_player, _uid) {
    throw 'Стартовые задания нельзя пропустить.';
};

global.tryCompleteNewbieQuest = tryCompleteNewbieQuest;
global.onNewbieWeaponPurchased = onNewbieWeaponPurchased;
global.isPaidWeaponInventoryKey = isPaidWeaponInventoryKey;
global.syncNewbieQuests = syncNewbieQuests;
global.onPlayerKillForQuests = onPlayerKillForQuests;
global.onNewbieHandshakeComplete = onNewbieHandshakeComplete;
global.onNewbieYgonDelivered = onNewbieYgonDelivered;
global.loadNewbieQuests = loadNewbieQuests;

mp.events.add('newbieQuests:request', (player) => {
    loadNewbieQuests(player, () => syncNewbieQuests(player));
});
