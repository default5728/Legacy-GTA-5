/**
 * Discord REST: серверные логи + инициализация capt/bizwar (без discord.js).
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_HOST = 'discord.com';
const API_PREFIX = '/api/v10';
const DISCORD_ENV_PATH = path.join(__dirname, 'discord_env.json');
const DEFAULT_LOGS_CHANNEL_ID = '1534361745244557363';

let discordEnvFile = {};
try {
    if (fs.existsSync(DISCORD_ENV_PATH)) {
        discordEnvFile = JSON.parse(fs.readFileSync(DISCORD_ENV_PATH, 'utf8')) || {};
    }
} catch (_e) {
    discordEnvFile = {};
}

function getToken() {
    return (
        process.env.DISCORD_BOT_TOKEN ||
        (discordEnvFile.DISCORD_BOT_TOKEN != null ? String(discordEnvFile.DISCORD_BOT_TOKEN) : '')
    ).trim();
}

// ID каналов для разных типов логов (заполняются из discord_env.json)
let _chatLogsChannelId = '';
let _familyLogsChannelId = '';
let _economyLogsChannelId = '';
let _adminLogsChannelId = '';

function reloadLogChannelIds() {
    try {
        if (fs.existsSync(DISCORD_ENV_PATH)) {
            const env = JSON.parse(fs.readFileSync(DISCORD_ENV_PATH, 'utf8')) || {};
            _chatLogsChannelId = String(env.DISCORD_CHAT_LOGS_CHANNEL_ID || '').trim();
            _familyLogsChannelId = String(env.DISCORD_FAMILY_LOGS_CHANNEL_ID || '').trim();
            _economyLogsChannelId = String(env.DISCORD_ECONOMY_LOGS_CHANNEL_ID || '').trim();
            _adminLogsChannelId = String(env.DISCORD_ADMIN_LOGS_CHANNEL_ID || '').trim();
        }
    } catch (_e) {}
}

function getChatLogsChannelId() { return _chatLogsChannelId || getLogsChannelId(); }
function getFamilyLogsChannelId() { return _familyLogsChannelId || getLogsChannelId(); }
function getEconomyLogsChannelId() { return _economyLogsChannelId || getLogsChannelId(); }
function getAdminLogsChannelId() { return _adminLogsChannelId || getLogsChannelId(); }

reloadLogChannelIds();

global.sendDiscordChatLog = function sendDiscordChatLog(message) {
    return global.sendDiscordLog(message, getChatLogsChannelId());
};
global.sendDiscordFamilyLog = function sendDiscordFamilyLog(message) {
    return global.sendDiscordLog(message, getFamilyLogsChannelId());
};
global.sendDiscordEconomyLog = function sendDiscordEconomyLog(message) {
    return global.sendDiscordLog(message, getEconomyLogsChannelId());
};
global.sendDiscordAdminLog = function sendDiscordAdminLog(message) {
    return global.sendDiscordLog(message, getAdminLogsChannelId());
};

function getLogsChannelId() {
    return (
        process.env.DISCORD_SERVER_LOGS_CHANNEL_ID ||
        (discordEnvFile.DISCORD_SERVER_LOGS_CHANNEL_ID != null
            ? String(discordEnvFile.DISCORD_SERVER_LOGS_CHANNEL_ID)
            : DEFAULT_LOGS_CHANNEL_ID)
    ).trim();
}

function discordRest(method, pathUrl, bodyObj) {
    const token = getToken();
    const body = bodyObj ? JSON.stringify(bodyObj) : null;
    const opts = {
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
        const req = https.request(opts, function (res) {
            let chunks = '';
            res.on('data', function (c) {
                chunks += c;
            });
            res.on('end', function () {
                let parsed = {};
                if (chunks) {
                    try {
                        parsed = JSON.parse(chunks);
                    } catch (e) {
                        return reject(new Error('Discord JSON: ' + chunks.slice(0, 200)));
                    }
                }
                if (res.statusCode >= 400) {
                    return reject(
                        new Error(
                            'Discord HTTP ' +
                                res.statusCode +
                                ': ' +
                                (parsed.message || chunks).toString().slice(0, 300)
                        )
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

function truncateDiscordContent(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    if (s.length <= 2000) return s;
    return s.slice(0, 1997) + '...';
}

global.sendDiscordLog = function sendDiscordLog(message, channelIdOverride) {
    const token = getToken();
    const channelId = String(channelIdOverride || '').trim() || getLogsChannelId();
    const content = truncateDiscordContent(message);

    if (!token) {
        return Promise.resolve();
    }
    if (!channelId) {
        return Promise.resolve();
    }
    if (!content) {
        return Promise.resolve();
    }

    return discordRest('POST', '/channels/' + channelId + '/messages', { content }).catch(function (err) {
        const msg = String((err && err.message) || err || '');
        const isNet =
            /ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|429|rate limit/i.test(msg);
        const now = Date.now();
        if (isNet) {
            if (!global.__discordLogQuietUntil || now >= global.__discordLogQuietUntil) {
                global.__discordLogQuietUntil = now + 60000;
                console.log('[discordlog] сеть/лимит Discord (далее 60с без спама):', msg.slice(0, 120));
            }
            return;
        }
        if (/403|Missing Access|Missing Permission/i.test(msg) && channelId !== getLogsChannelId()) {
            return global.sendDiscordLog(message, getLogsChannelId());
        }
        console.log('[discordlog]', msg.slice(0, 200));
    });
};

function getGuildId() {
    return (
        process.env.DISCORD_GUILD_ID ||
        (discordEnvFile.DISCORD_GUILD_ID != null ? String(discordEnvFile.DISCORD_GUILD_ID) : '')
    ).trim();
}

function getCaptChannelId() {
    return (
        process.env.DISCORD_CAPT_CHANNEL_ID ||
        (discordEnvFile.DISCORD_CAPT_CHANNEL_ID != null ? String(discordEnvFile.DISCORD_CAPT_CHANNEL_ID) : '')
    ).trim();
}

function getBizwarChannelId() {
    return (
        process.env.DISCORD_BIZWAR_CHANNEL_ID ||
        (discordEnvFile.DISCORD_BIZWAR_CHANNEL_ID != null ? String(discordEnvFile.DISCORD_BIZWAR_CHANNEL_ID) : '')
    ).trim();
}

function getServerOnline() {
    try {
        var authCount = 0;
        if (typeof mp !== 'undefined' && mp.players && mp.players.forEach) {
            mp.players.forEach(function (p) {
                if (!p || !mp.players.exists(p)) return;
                if (p.getVariable && p.getVariable('auth')) authCount++;
            });
            if (authCount > 0) return authCount;
            return mp.players.length || 0;
        }
    } catch (_e) {}
    return 0;
}

function hookDiscordPresenceRefresh() {
    var refresh = null;
    try {
        refresh = require('./discord_gateway_keepalive.js').refreshDiscordGatewayPresence;
    } catch (_e) {}
    if (typeof refresh !== 'function') return;

    mp.events.add('playerJoin', function () {
        refresh();
        setTimeout(refresh, 3000);
        setTimeout(refresh, 10000);
    });
    mp.events.add('playerQuit', function () {
        refresh();
    });
    mp.events.add('playerReady', function () {
        refresh();
    });
}

try {
    require('./donate_credit.js');
} catch (e) {
    console.log('[donate_credit] init:', e.message || e);
}

try {
    require('./discord_donate.js');
} catch (e) {
    console.log('[discord_donate] init:', e.message || e);
}

try {
    require('./discord_recovery.js');
} catch (e) {
    console.log('[discord_recovery] init:', e.message || e);
}

try {
    require('./discord_capt.js')();
} catch (e) {
    console.log('[discord_capt] init:', e.message || e);
}

try {
    require('./discord_bizwar.js')();
} catch (e) {
    console.log('[discord_bizwar] init:', e.message || e);
}

try {
    require('./discord_admin_bot.js');
} catch (e) {
    console.log('[discord_admin] init:', e.message || e);
}

try {
    var startDiscordGatewayPresence = require('./discord_gateway_keepalive.js');
    if (getToken()) {
        startDiscordGatewayPresence({
            getToken: getToken,
            getServerOnline: getServerOnline,
            guildId: getGuildId(),
            channelIdsForGuild: [getCaptChannelId(), getLogsChannelId(), getBizwarChannelId()]
        });
        hookDiscordPresenceRefresh();
        global.refreshDiscordPresence = function refreshDiscordPresence() {
            try {
                require('./discord_gateway_keepalive.js').refreshDiscordGatewayPresence();
            } catch (_e) {}
        };
    }
} catch (e) {
    console.log('[discord] gateway init:', e.message || e);
}
