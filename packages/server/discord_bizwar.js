/**
 * Бизвары в Discord: embed + REST API (как discord_capt.js).
 * Счётчик: packages/server/bizwar_counter.json
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const TZ = 'Europe/Moscow';
const API_HOST = 'discord.com';
const API_PREFIX = '/api/v10';
const EMBED_COLOR = 0x7cfc00;
const COUNTER_PATH = path.join(__dirname, 'bizwar_counter.json');
const DISCORD_ENV_PATH = path.join(__dirname, 'discord_env.json');
const DEFAULT_BIZWAR_ROLE_IDS = ['1532464960444043315'];

var discordEnvFile = {};
try {
    if (fs.existsSync(DISCORD_ENV_PATH)) {
        discordEnvFile = JSON.parse(fs.readFileSync(DISCORD_ENV_PATH, 'utf8')) || {};
    }
} catch (e) {
    discordEnvFile = {};
}

function getToken() {
    return (
        process.env.DISCORD_BOT_TOKEN ||
        (discordEnvFile.DISCORD_BOT_TOKEN != null ? String(discordEnvFile.DISCORD_BOT_TOKEN) : '')
    ).trim();
}

function getChannelId() {
    return (
        process.env.DISCORD_BIZWAR_CHANNEL_ID ||
        (discordEnvFile.DISCORD_BIZWAR_CHANNEL_ID != null ? String(discordEnvFile.DISCORD_BIZWAR_CHANNEL_ID) : '')
    ).trim();
}

function getFractionLeaderRoles() {
    var raw =
        discordEnvFile.DISCORD_FRACTION_LEADER_ROLES ||
        discordEnvFile.DISCORD_CAPT_FRACTION_LEADER_ROLES ||
        {};
    if (typeof raw !== 'object' || raw == null) return {};
    return raw;
}

function normalizeRoleIds(raw) {
    var out = [];
    var seen = {};
    function add(v) {
        var id = String(v == null ? '' : v).trim();
        if (!/^\d{10,25}$/.test(id) || seen[id]) return;
        seen[id] = true;
        out.push(id);
    }
    if (Array.isArray(raw)) {
        raw.forEach(add);
    } else if (raw && typeof raw === 'object') {
        Object.keys(raw)
            .sort(function (a, b) {
                return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
            })
            .forEach(function (key) { add(raw[key]); });
    } else if (typeof raw === 'string') {
        raw.split(/[,\s]+/).forEach(add);
    }
    return out;
}

function getBizwarMentionRoleIds() {
    var explicit =
        process.env.DISCORD_BIZWAR_ROLE_IDS ||
        process.env.DISCORD_BIZWAR_MENTION_ROLE_IDS ||
        discordEnvFile.DISCORD_BIZWAR_ROLE_IDS ||
        discordEnvFile.DISCORD_BIZWAR_MENTION_ROLE_IDS ||
        null;
    var ids = normalizeRoleIds(explicit);
    if (!ids.length) ids = DEFAULT_BIZWAR_ROLE_IDS.slice();
    return ids;
}

const DEFAULT_BIZWAR_EMBED_TITLE = 'Capture 🔫';

function resolveEmbedTitle(raw, fallback) {
    var title = String(raw == null ? '' : raw).trim();
    if (!title) return fallback;
    var lower = title.toLowerCase();
    if (lower === 'gta5dm' || lower === 'gta 5 dm' || lower === 'gta5 dm') return fallback;
    return title;
}

function getEmbedAuthorName() {
    var fromEnv = resolveEmbedTitle(process.env.DISCORD_BIZWAR_EMBED_TITLE, '');
    if (fromEnv) return fromEnv;
    var fromFile = resolveEmbedTitle(discordEnvFile.DISCORD_BIZWAR_EMBED_TITLE, '');
    if (fromFile) return fromFile;
    return DEFAULT_BIZWAR_EMBED_TITLE;
}

function touchGatewayActivity() {
    try {
        require('./discord_gateway_keepalive.js').refreshDiscordGatewayPresence();
    } catch (_e) {}
}

function allocateBizwarNumber() {
    var current = 1;
    try {
        if (fs.existsSync(COUNTER_PATH)) {
            var raw = fs.readFileSync(COUNTER_PATH, 'utf8');
            var j = JSON.parse(raw);
            current = parseInt(j.next, 10);
            if (isNaN(current) || current < 1) current = 1;
        }
    } catch (e) {
        current = 1;
    }
    var nextVal = current + 1;
    try {
        fs.writeFileSync(COUNTER_PATH, JSON.stringify({ next: nextVal }, null, 0), 'utf8');
    } catch (e) {
        console.log('[discord_bizwar] bizwar_counter.json:', e.message || e);
    }
    return current;
}

function discordRest(method, pathUrl, bodyObj) {
    var token = getToken();
    var body = bodyObj ? JSON.stringify(bodyObj) : null;
    var opts = {
        hostname: API_HOST,
        path: API_PREFIX + pathUrl,
        method: method,
        headers: {
            Authorization: 'Bot ' + token,
            'Content-Type': 'application/json',
            'User-Agent': 'DiscordBot (https://github.com/discord, FlowDM)'
        }
    };
    if (body) {
        opts.headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
    }
    return new Promise(function (resolve, reject) {
        var req = https.request(opts, function (res) {
            var chunks = '';
            res.on('data', function (c) {
                chunks += c;
            });
            res.on('end', function () {
                var parsed = {};
                if (chunks) {
                    try {
                        parsed = JSON.parse(chunks);
                    } catch (e) {
                        return reject(new Error('Discord JSON: ' + chunks.slice(0, 200)));
                    }
                }
                if (res.statusCode >= 400) {
                    return reject(
                        new Error('Discord HTTP ' + res.statusCode + ': ' + (parsed.message || chunks).toString().slice(0, 300))
                    );
                }
                resolve(parsed);
            });
        });
        req.on('error', reject);
        if (body) req.write(body, 'utf8');
        req.end();
    });
}

function extrasLine(allowAlco, allowSpunk, allowArmor) {
    var parts = [];
    if (allowAlco) parts.push('Медовуха');
    if (allowSpunk) parts.push('спанк');
    if (allowArmor) parts.push('броня');
    return parts.length ? parts.join(', ') : '—';
}

function caliberLine(calibers) {
    if (!Array.isArray(calibers)) return '—';
    var arr = calibers.filter(function (x) {
        return x != null && String(x).trim() !== '';
    });
    return arr.length ? arr.join(' / ') : '—';
}

function escBacktick(s) {
    var t = String(s == null ? '' : s);
    return t.replace(/`/g, "'").replace(/\\/g, '/');
}

function buildAllLeaderRoleMentions() {
    return getBizwarMentionRoleIds().map(function (roleId) {
        return '<@&' + roleId + '>';
    }).join(' ');
}

function buildBizwarEmbed(snap, winnerName, includeMentions) {
    var dt = moment(snap.createdMs).tz(TZ).format('DD.MM.YYYY, HH:mm:ss');
    var startFight = moment(snap.fightStartMs || snap.createdMs).tz(TZ).format('HH:mm');
    var bizNo = snap.bizwarNumber != null ? String(snap.bizwarNumber) : '—';
    var atk = escBacktick(snap.attackerName);
    var def = escBacktick(snap.defenderName);
    var resultVal;
    if (winnerName == null || winnerName === undefined || winnerName === '') {
        resultVal = '—';
    } else {
        resultVal = 'Победа **' + escBacktick(winnerName) + '**';
    }

    var fields = [
        { name: 'Дата и время', value: dt, inline: true },
        { name: 'Номер забива', value: bizNo, inline: true },
        { name: 'Квадрат', value: String(snap.zoneId), inline: true },
        { name: 'Стороны', value: String(snap.format), inline: true },
        { name: 'Время начала', value: startFight, inline: true },
        { name: 'Калибры', value: caliberLine(snap.calibers), inline: false },
        {
            name: 'Дополнительно',
            value: extrasLine(snap.allowAlco, snap.allowSpunk, snap.allowArmor),
            inline: false
        },
        { name: '⚔️ Атака', value: '`' + atk + '`', inline: true },
        { name: '🛡️ Защита', value: '`' + def + '`', inline: true },
        { name: 'Результат', value: resultVal, inline: false }
    ];

    var embedTitle = getEmbedAuthorName();
    var embed = {
        title: embedTitle,
        color: EMBED_COLOR,
        fields: fields
    };

    var payload = { embeds: [embed] };
    if (includeMentions !== false) {
        var roleIds = getBizwarMentionRoleIds();
        var mentions = buildAllLeaderRoleMentions();
        if (mentions) payload.content = mentions;
        if (roleIds.length) {
            payload.allowed_mentions = {
                parse: [],
                roles: roleIds
            };
        }
    }
    return payload;
}

module.exports = function registerBizwarDiscord() {
    global.postDiscordBizwarAnnouncement = async function (snap) {
        if (!getToken()) {
            console.log('[discord_bizwar] задайте DISCORD_BOT_TOKEN');
            return null;
        }
        var channelId = getChannelId();
        if (!channelId) return null;
        try {
            snap.bizwarNumber = allocateBizwarNumber();
            var payload = buildBizwarEmbed(snap, null, true);
            touchGatewayActivity();
            var data = await discordRest('POST', '/channels/' + channelId + '/messages', payload);
            return { channelId: channelId, messageId: data.id };
        } catch (e) {
            console.log('[discord_bizwar] отправка:', e.message || e);
            return null;
        }
    };

    global.updateDiscordBizwarResult = async function (meta, winnerName) {
        if (!meta || !meta.channelId || !meta.messageId || !meta.snapshot) return;
        try {
            var payload = buildBizwarEmbed(meta.snapshot, winnerName, false);
            await discordRest(
                'PATCH',
                '/channels/' + meta.channelId + '/messages/' + meta.messageId,
                payload
            );
        } catch (e) {
            console.log('[discord_bizwar] правка сообщения:', e.message || e);
        }
    };

    if (getToken()) {
        discordRest('GET', '/users/@me', null)
            .then(function (me) {
                console.log('[discord] бизвары: REST OK, бот ' + (me.username || '?'));
            })
            .catch(function (e) {
                console.log('[discord] бизвары: токен / сеть —', e.message || e);
            });
    } else {
        console.log('[discord_bizwar] DISCORD_BOT_TOKEN не задан — бизвары в Discord отключены');
    }
};
