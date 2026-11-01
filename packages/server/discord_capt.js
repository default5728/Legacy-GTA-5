/**
 * Капты в Discord: embed + REST API (без discord.js), старая Node в RageMP.
 * Счётчик каптов: packages/server/capt_counter.json (с 1, после каждого капта +1).
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const TZ = 'Europe/Moscow';
const API_HOST = 'discord.com';
const API_PREFIX = '/api/v10';
/** Лайм, как на референсе */
const EMBED_COLOR = 0x7cfc00;
const COUNTER_PATH = path.join(__dirname, 'capt_counter.json');
const DISCORD_ENV_PATH = path.join(__dirname, 'discord_env.json');

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
        process.env.DISCORD_CAPT_CHANNEL_ID ||
        (discordEnvFile.DISCORD_CAPT_CHANNEL_ID != null
            ? String(discordEnvFile.DISCORD_CAPT_CHANNEL_ID)
            : '1494047452641362161')
    ).trim();
}

/** Опционально: упоминание в начале embed (ID пользователя Discord). */
function getPingUserId() {
    return (process.env.DISCORD_CAPT_PING_USER_ID || '').trim();
}

function getEmbedAuthorName() {
    var fromEnv = String(process.env.DISCORD_CAPT_EMBED_TITLE || '').trim();
    if (fromEnv) return fromEnv;
    var fromFile =
        discordEnvFile.DISCORD_CAPT_EMBED_TITLE != null
            ? String(discordEnvFile.DISCORD_CAPT_EMBED_TITLE).trim()
            : '';
    if (fromFile) return fromFile;
    return 'Война семей ⚔️';
}

function touchGatewayActivity() {
    try {
        require('./discord_gateway_keepalive.js').refreshDiscordGatewayPresence();
    } catch (_e) {}
}

function allocateCaptNumber() {
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
        console.log('[discord_capt] capt_counter.json:', e.message || e);
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

function extrasLine(allowAlco, allowSpank, allowArmor) {
    var parts = [];
    if (allowAlco) parts.push('Медовуха');
    if (allowSpank) parts.push('спанк');
    if (allowArmor) parts.push('броня');
    return parts.length ? parts.join(', ') : '—';
}

function weaponLine(w1, w2, w3) {
    var arr = [w1, w2, w3].filter(function (x) {
        return x != null && String(x).trim() !== '';
    });
    return arr.length ? arr.join(' / ') : '—';
}

function caliberLine(calibers) {
    if (!Array.isArray(calibers)) return '';
    var arr = calibers.filter(function (x) {
        return x != null && String(x).trim() !== '';
    });
    return arr.length ? arr.join(' / ') : '';
}

function loadoutLine(snap) {
    var cal = caliberLine(snap.calibers);
    if (cal) return cal;
    return weaponLine(snap.w1, snap.w2, snap.w3);
}

function escBacktick(s) {
    var t = String(s == null ? '' : s);
    return t.replace(/`/g, "'").replace(/\\/g, '/');
}

function buildCaptEmbed(snap, winnerFamily) {
    var dt = moment(snap.createdMs).tz(TZ).format('DD.MM.YYYY, HH:mm:ss');
    var startFight = moment(snap.fightStartMs).tz(TZ).format('HH:mm');
    var captNo = snap.captNumber != null ? String(snap.captNumber) : '—';
    var atk = escBacktick(snap.attackerFamily);
    var def = escBacktick(snap.defenderFamily);
    var resultVal;
    if (winnerFamily == null || winnerFamily === undefined || winnerFamily === '') {
        resultVal = '—';
    } else {
        resultVal = 'Победа **' + escBacktick(winnerFamily) + '**';
    }

    var desc = '';
    var ping = getPingUserId();
    if (ping) {
        desc = '<@' + ping + '>';
    }

    var fields = [
        { name: 'Дата и время', value: dt, inline: true },
        { name: 'Номер забива', value: captNo, inline: true },
        { name: 'Точка', value: String(snap.pointId), inline: true },
        { name: 'Стороны', value: String(snap.format), inline: true },
        { name: 'Время начала', value: startFight, inline: true },
        { name: 'Калибры', value: loadoutLine(snap), inline: false },
        {
            name: 'Дополнительно',
            value: extrasLine(snap.allowAlco, snap.allowSpank, snap.allowArmor),
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
    if (desc) {
        embed.description = desc;
    }
    return { embeds: [embed] };
}

module.exports = function registerCaptDiscord() {
    global.postDiscordCaptAnnouncement = async function (snap) {
        if (!getToken()) {
            console.log('[discord_capt] задайте переменную окружения DISCORD_BOT_TOKEN');
            return null;
        }
        var channelId = getChannelId();
        if (!channelId) return null;
        try {
            snap.captNumber = allocateCaptNumber();
            var payload = buildCaptEmbed(snap, null);
            touchGatewayActivity();
            var data = await discordRest('POST', '/channels/' + channelId + '/messages', payload);
            return { channelId: channelId, messageId: data.id };
        } catch (e) {
            console.log('[discord_capt] отправка:', e.message || e);
            return null;
        }
    };

    global.updateDiscordCaptResult = async function (meta, winnerFamily) {
        if (!meta || !meta.channelId || !meta.messageId || !meta.snapshot) return;
        try {
            var payload = buildCaptEmbed(meta.snapshot, winnerFamily);
            await discordRest(
                'PATCH',
                '/channels/' + meta.channelId + '/messages/' + meta.messageId,
                payload
            );
        } catch (e) {
            console.log('[discord_capt] правка сообщения:', e.message || e);
        }
    };

    if (getToken()) {
        discordRest('GET', '/users/@me', null)
            .then(function (me) {
                console.log('[discord] капты: REST OK, бот ' + (me.username || '?'));
            })
            .catch(function (e) {
                console.log('[discord] капты: токен / сеть —', e.message || e);
            });
    } else {
        console.log('[discord_capt] DISCORD_BOT_TOKEN не задан — капты в Discord отключены');
    }
};
