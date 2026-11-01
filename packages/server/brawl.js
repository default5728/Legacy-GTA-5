/**
 * Brawl — голосовые каналы (телефон), настройки, роли, метки, /g.
 * Канал идентифицируется по нормализованному имени (одно имя = один канал).
 */

const BRWL_MAX_NAME = 28;
const BRWL_MARKER_MS = 15000;
const BRWL_MARKER_RANGE = 300;

const channels = new Map();

function nameKeyFrom(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sanitizeName(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let s = raw.trim().replace(/\s+/g, ' ');
    if (s.length > BRWL_MAX_NAME) s = s.slice(0, BRWL_MAX_NAME);
    return s;
}

/** Единый числовой static (RageMP может отдавать number/string). */
function playerStaticId(player) {
    if (!player || !mp.players.exists(player)) return null;
    const s = player.static != null ? player.static : player.getVariable('static');
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
}

function findPlayerByStatic(st) {
    const n = parseInt(st, 10);
    if (Number.isNaN(n)) return null;
    const arr = mp.players.toArray();
    for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if (!p || !mp.players.exists(p)) continue;
        const pid = playerStaticId(p);
        if (pid !== null && pid === n) return p;
    }
    return null;
}

function disablePairVoice(a, b) {
    try {
        if (a && b && mp.players.exists(a) && mp.players.exists(b)) {
            a.disableVoiceTo(b);
            b.disableVoiceTo(a);
        }
    } catch (_e) {}
}

function enablePairVoice(a, b) {
    try {
        if (a && b && mp.players.exists(a) && mp.players.exists(b)) {
            a.enableVoiceTo(b);
            b.enableVoiceTo(a);
        }
    } catch (_e) {}
}

function getChannelPlayers(ch) {
    const out = [];
    mp.players.forEach((p) => {
        try {
            if (!p || !mp.players.exists(p)) return;
            if (p.getVariable('brawlCh') !== ch.nameKey) return;
            out.push(p);
        } catch (_e) {}
    });
    return out;
}

function rebuildChannelVoice(ch) {
    const players = getChannelPlayers(ch);
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            enablePairVoice(players[i], players[j]);
        }
    }
}

function stripVoiceForPlayer(leaver, ch) {
    const players = getChannelPlayers(ch);
    players.forEach((p) => {
        if (p !== leaver) disablePairVoice(leaver, p);
    });
}

/** Второй аргумент — массив аргументов для клиента (как player.call('ev', [a, b]) в остальном сервере). */
function broadcastChannel(ch, event, callArgs) {
    const players = getChannelPlayers(ch);
    const arr = Array.isArray(callArgs) ? callArgs : [callArgs];
    players.forEach((p) => {
        try {
            p.call(event, arr);
        } catch (_e) {}
    });
}

function syncPlayerChannelVars(p, ch, meta) {
    if (!mp.players.exists(p)) return;
    if (!ch) {
        p.setVariable('brawlCh', null);
        p.setVariable('brawlMeta', null);
        return;
    }
    p.setVariable('brawlCh', ch.nameKey);
    p.setVariable('brawlMeta', JSON.stringify({
        name: ch.name,
        ownerStatic: ch.ownerStatic,
        isOwner: Number(ch.ownerStatic) === Number(playerStaticId(p)),
        assistant: !!meta.assistant,
        muted: !!meta.muted,
        ownersOnly: !!ch.ownersOnly,
        mapVisible: !!ch.mapVisible,
        marksAll: !!ch.marksAll,
        allowMarkers: !!meta.allowMarkers,
        markersBanned: !!meta.markersBanned,
        replaceMarks: !!ch.replaceMarks,
        volume: meta.volume != null ? meta.volume : 100,
        globalVol: ch.globalVol != null ? ch.globalVol : 100
    }));
}

function syncAllMembers(ch) {
    ch.members.forEach((meta, staticId) => {
        const p = findPlayerByStatic(staticId);
        if (p && mp.players.exists(p)) syncPlayerChannelVars(p, ch, meta);
    });
    const list = [];
    ch.members.forEach((meta, staticId) => {
        list.push({
            static: staticId,
            login: meta.login || '?',
            isOwner: Number(staticId) === Number(ch.ownerStatic),
            assistant: !!meta.assistant,
            muted: !!meta.muted,
            volume: meta.volume != null ? meta.volume : 100,
            allowMarkers: !!meta.allowMarkers,
            markersBanned: !!meta.markersBanned
        });
    });
    const payload = JSON.stringify({
        name: ch.name,
        nameKey: ch.nameKey,
        ownerStatic: ch.ownerStatic,
        invite: `brawl:${ch.name}:`,
        encrypted: !!ch.encrypted,
        mapVisible: !!ch.mapVisible,
        ownersOnly: !!ch.ownersOnly,
        noNewJoins: !!ch.noNewJoins,
        maxMembers: ch.maxMembers || 0,
        marksAll: !!ch.marksAll,
        replaceMarks: !!ch.replaceMarks,
        globalVol: ch.globalVol != null ? ch.globalVol : 100,
        members: list
    });
    broadcastChannel(ch, 'brawl:sync', payload);
}

function leaveChannel(player, quiet) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    const st = playerStaticId(player);
    if (st === null) return;
    const nk = player.getVariable('brawlCh');
    if (!nk) return;
    const ch = channels.get(nk);
    if (!ch) {
        player.setVariable('brawlCh', null);
        player.setVariable('brawlMeta', null);
        return;
    }
    if (!ch.members.has(st)) {
        player.setVariable('brawlCh', null);
        player.setVariable('brawlMeta', null);
        return;
    }

    stripVoiceForPlayer(player, ch);
    ch.members.delete(st);

    const others = ch.members.size;
    if (others === 0) {
        channels.delete(ch.nameKey);
        if (!quiet) {
            try {
                player.call('brawl:left', []);
            } catch (_e) {}
        }
        player.setVariable('brawlCh', null);
        player.setVariable('brawlMeta', null);
        return;
    }

    player.setVariable('brawlCh', null);
    player.setVariable('brawlMeta', null);
    rebuildChannelVoice(ch);
    syncAllMembers(ch);
    if (!quiet) {
        try {
            player.call('brawl:left', []);
        } catch (_e) {}
    }
}

function joinChannel(player, ch, password, isCreate) {
    const st = playerStaticId(player);
    if (st === null) {
        return isNotify(player, 2, 'top-mid', 'Не удалось выполнить вход. Перезайдите на сервер или попробуйте через минуту.', 3200);
    }
    const login = player.login || '?';

    if (ch.encrypted && ch.password && String(ch.password) !== String(password || '')) {
        return isNotify(player, 2, 'top-mid', 'Неверный пароль канала.', 2500);
    }
    if (ch.noNewJoins && !isCreate) {
        return isNotify(player, 2, 'top-mid', 'Вход в канал закрыт.', 2500);
    }
    const maxM = parseInt(ch.maxMembers, 10) || 0;
    if (maxM > 0 && ch.members.size >= maxM) {
        return isNotify(player, 2, 'top-mid', 'Канал заполнен.', 2500);
    }

    const prevNk = player.getVariable('brawlCh');
    if (prevNk && prevNk !== ch.nameKey) {
        leaveChannel(player, true);
    }

    if (ch.members.has(st)) {
        return isNotify(player, 2, 'top-mid', 'Вы уже в этом канале.', 2000);
    }

    ch.members.set(st, {
        login,
        assistant: false,
        muted: false,
        volume: 100,
        allowMarkers: false,
        markersBanned: false
    });

    rebuildChannelVoice(ch);
    syncPlayerChannelVars(player, ch, ch.members.get(st));
    syncAllMembers(ch);
    isNotify(player, 2, 'top-mid', `Вы в канале «${ch.name}».`, 2000);
}

mp.events.add('brawl:create', (player, rawName, password) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const name = sanitizeName(rawName);
        const nk = nameKeyFrom(name);
        if (nk.length < 2) return isNotify(player, 2, 'top-mid', 'Слишком короткое название.', 2000);
        if (channels.has(nk)) return isNotify(player, 2, 'top-mid', 'Канал с таким именем уже существует.', 3000);

        const pwd = password && String(password).trim() ? String(password).trim() : null;
        const ost = playerStaticId(player);
        if (ost === null) {
            return isNotify(player, 2, 'top-mid', 'Канал не создан: сессия устарела. Закройте телефон и создайте снова.', 3500);
        }
        const ch = {
            name,
            nameKey: nk,
            ownerStatic: ost,
            password: pwd,
            encrypted: !!pwd,
            mapVisible: false,
            ownersOnly: false,
            noNewJoins: false,
            maxMembers: 0,
            marksAll: true,
            replaceMarks: false,
            globalVol: 100,
            members: new Map()
        };
        channels.set(nk, ch);
        joinChannel(player, ch, pwd, true);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('brawl:join', (player, rawName, password) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const name = sanitizeName(rawName);
        const nk = nameKeyFrom(name);
        const ch = channels.get(nk);
        if (!ch) return isNotify(player, 2, 'top-mid', 'Канал не найден.', 2500);
        joinChannel(player, ch, password, false);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('brawl:leave', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        leaveChannel(player, false);
    } catch (e) {
        console.log(e);
    }
});

function assertOwnerOrAssistant(ch, player) {
    const st = playerStaticId(player);
    if (st === null) return false;
    if (Number(ch.ownerStatic) === st) return true;
    const m = ch.members.get(st);
    return m && m.assistant;
}

function assertOwner(ch, player) {
    const st = playerStaticId(player);
    if (st === null) return false;
    return Number(ch.ownerStatic) === st;
}

mp.events.add('brawl:setSetting', (player, key, val) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const nk = player.getVariable('brawlCh');
        const ch = nk ? channels.get(nk) : null;
        const pst = playerStaticId(player);
        if (!ch || pst === null || !ch.members.has(pst)) return;
        if (!assertOwner(ch, player)) return isNotify(player, 2, 'top-mid', 'Только создатель канала.', 2500);

        if (key === 'encrypted') {
            ch.encrypted = !!val;
            if (!ch.encrypted) ch.password = null;
        } else if (key === 'password') {
            ch.password = val && String(val).trim() ? String(val).trim() : null;
            ch.encrypted = !!ch.password;
        } else if (key === 'mapVisible') ch.mapVisible = !!val;
        else if (key === 'ownersOnly') ch.ownersOnly = !!val;
        else if (key === 'noNewJoins') ch.noNewJoins = !!val;
        else if (key === 'maxMembers') ch.maxMembers = Math.max(0, parseInt(val, 10) || 0);
        else if (key === 'marksAll') ch.marksAll = !!val;
        else if (key === 'replaceMarks') ch.replaceMarks = !!val;
        else if (key === 'globalVol') ch.globalVol = Math.max(0, Math.min(100, parseInt(val, 10) || 0));

        syncAllMembers(ch);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('brawl:memberAction', (player, targetStatic, action, value) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const nk = player.getVariable('brawlCh');
        const ch = nk ? channels.get(nk) : null;
        const pst = playerStaticId(player);
        if (!ch || pst === null || !ch.members.has(pst)) return;
        const ts = parseInt(targetStatic, 10);
        if (Number.isNaN(ts) || !ch.members.has(ts)) return;

        const actor = ch.members.get(pst);
        const isOwner = Number(ch.ownerStatic) === pst;
        const isAssist = actor && actor.assistant;

        if (action === 'volume') {
            const v = Math.max(0, Math.min(125, parseInt(value, 10) || 0));
            ch.members.get(ts).volume = v;
            syncAllMembers(ch);
            return;
        }
        if (action === 'kick') {
            if (!isOwner && !isAssist) return isNotify(player, 2, 'top-mid', 'Недостаточно прав.', 2000);
            if (ts === Number(ch.ownerStatic)) return;
            const target = findPlayerByStatic(ts);
            if (target && mp.players.exists(target)) leaveChannel(target, false);
            else ch.members.delete(ts);
            rebuildChannelVoice(ch);
            syncAllMembers(ch);
            return;
        }
        if (action === 'mute') {
            if (!isOwner && !isAssist) return isNotify(player, 2, 'top-mid', 'Недостаточно прав.', 2000);
            if (ts === Number(ch.ownerStatic)) return;
            ch.members.get(ts).muted = !!value;
            syncAllMembers(ch);
            return;
        }
        if (action === 'assistant') {
            if (!isOwner) return isNotify(player, 2, 'top-mid', 'Только создатель.', 2500);
            if (ts === Number(ch.ownerStatic)) return;
            ch.members.get(ts).assistant = !!value;
            syncAllMembers(ch);
            return;
        }
        if (action === 'allowMarkers') {
            if (!isOwner && !isAssist) return isNotify(player, 2, 'top-mid', 'Недостаточно прав.', 2000);
            ch.members.get(ts).allowMarkers = !!value;
            syncAllMembers(ch);
            return;
        }
        if (action === 'markersBanned') {
            if (!isOwner && !isAssist) return isNotify(player, 2, 'top-mid', 'Недостаточно прав.', 2000);
            if (ts === Number(ch.ownerStatic)) return;
            ch.members.get(ts).markersBanned = !!value;
            syncAllMembers(ch);
        }
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('brawl:marker', (player, x, y, z, type) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const nk = player.getVariable('brawlCh');
        const ch = nk ? channels.get(nk) : null;
        const pst = playerStaticId(player);
        if (!ch || pst === null || !ch.members.has(pst)) return;

        const meta = ch.members.get(pst);
        if (meta.markersBanned && Number(ch.ownerStatic) !== pst) {
            return isNotify(player, 2, 'top-mid', 'Вам отключили метки в этом канале.', 2800);
        }
        const can =
            ch.marksAll ||
            meta.assistant ||
            Number(ch.ownerStatic) === pst ||
            meta.allowMarkers;
        if (!can) return isNotify(player, 2, 'top-mid', 'Нет права ставить метки.', 2000);

        const pos = player.position;
        const dx = pos.x - x;
        const dy = pos.y - y;
        const dz = pos.z - z;
        if (dx * dx + dy * dy + dz * dz > BRWL_MARKER_RANGE * BRWL_MARKER_RANGE) {
            return isNotify(player, 2, 'top-mid', 'Слишком далеко для метки.', 2000);
        }

        const t = ['here', 'enemy', 'item', 'attention'].indexOf(String(type)) >= 0 ? String(type) : 'here';
        broadcastChannel(ch, 'brawl:markerShow', [x, y, z, t, pst, BRWL_MARKER_MS]);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('brawl:markerPlayer', (player, targetId) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const nk = player.getVariable('brawlCh');
        const ch = nk ? channels.get(nk) : null;
        const pst = playerStaticId(player);
        if (!ch || pst === null || !ch.members.has(pst)) return;

        const meta = ch.members.get(pst);
        if (meta.markersBanned && Number(ch.ownerStatic) !== pst) {
            return isNotify(player, 2, 'top-mid', 'Вам отключили метки в этом канале.', 2800);
        }
        const can =
            ch.marksAll ||
            meta.assistant ||
            Number(ch.ownerStatic) === pst ||
            meta.allowMarkers;
        if (!can) return;

        let target = typeof global.findOnlinePlayerByStatic === 'function'
            ? global.findOnlinePlayerByStatic(targetId, { fallbackSessionId: true })
            : null;
        if (!target || !mp.players.exists(target)) return;
        if (target === player) return;

        const myFam = player.getVariable('family');
        const tf = target.getVariable('family');
        if (myFam != null && tf != null && myFam === tf) {
            return isNotify(player, 2, 'top-mid', 'Своих нельзя отмечать.', 2000);
        }

        const pos = target.position;
        broadcastChannel(ch, 'brawl:markerShow', [pos.x, pos.y, pos.z, 'enemy', pst, BRWL_MARKER_MS]);
    } catch (e) {
        console.log(e);
    }
});

mp.events.addCommand('brawljoin', (player, fullText) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const rest = String(fullText || '')
            .replace(/^\/brawljoin\s*/i, '')
            .trim();
        if (!rest) return player.outputChatBox('/brawljoin [канал] [пароль]');
        const parts = rest.split(/\s+/);
        const name = parts[0];
        const password = parts.slice(1).join(' ') || '';
        const nk = nameKeyFrom(name);
        const ch = channels.get(nk);
        if (!ch) return isNotify(player, 2, 'top-mid', 'Канал не найден.', 2500);
        joinChannel(player, ch, password, false);
    } catch (e) {
        console.log(e);
    }
});

/** Текстовый чат канала — вызывается из /g */
global.brawlSendGroupChat = function (player, text) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
        const nk = player.getVariable('brawlCh');
        const ch = nk ? channels.get(nk) : null;
        const pst = playerStaticId(player);
        if (!ch || pst === null || !ch.members.has(pst)) return false;
        const msg = String(text || '').trim();
        if (!msg.length) return true;
        const msgOut =
            typeof global.brawlChatEmbedForBroadcast === 'function'
                ? global.brawlChatEmbedForBroadcast(msg)
                : msg;
        const line = `!{#FF8C00}[G] ${player.login}: ${msgOut}`;
        const players = getChannelPlayers(ch);
        players.forEach((p) => {
            try {
                p.call('chat:pushLine', [line]);
            } catch (_e) {}
        });
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
};

/** Клиент перезагрузил голосовой движок (смена наушников) — восстановить связи в Brawl-канале. */
mp.events.add('voice:clientReloaded:s', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const nk = player.getVariable('brawlCh');
        if (!nk) return;
        const ch = channels.get(nk);
        if (!ch) return;
        rebuildChannelVoice(ch);
    } catch (e) {
        console.log('[BRAWL] voice:clientReloaded:', e);
    }
});

mp.events.add('playerQuit', (player) => {
    try {
        if (player && player.getVariable && player.getVariable('brawlCh')) {
            leaveChannel(player, true);
        }
    } catch (_e) {}
});
