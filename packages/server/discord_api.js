'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const DISCORD_ENV_PATH = path.join(__dirname, 'discord_env.json');
const API_HOST = 'discord.com';
const API_PREFIX = '/api/v10';

function readDiscordEnv() {
    try {
        if (fs.existsSync(DISCORD_ENV_PATH)) {
            return JSON.parse(fs.readFileSync(DISCORD_ENV_PATH, 'utf8')) || {};
        }
    } catch (_e) {}
    return {};
}

function getDiscordToken() {
    const file = readDiscordEnv();
    return (
        process.env.DISCORD_BOT_TOKEN ||
        (file.DISCORD_BOT_TOKEN != null ? String(file.DISCORD_BOT_TOKEN) : '')
    ).trim();
}

function getDiscordEnvValue(key, fallback) {
    const file = readDiscordEnv();
    const fromProcess = process.env[key];
    if (fromProcess != null && String(fromProcess).trim() !== '') {
        return String(fromProcess).trim();
    }
    if (file[key] != null && String(file[key]).trim() !== '') {
        return String(file[key]).trim();
    }
    return fallback != null ? String(fallback).trim() : '';
}

function discordRequestRaw(method, pathUrl, headers, bodyBuf) {
    const token = getDiscordToken();
    if (!token) {
        return Promise.reject(new Error('DISCORD_BOT_TOKEN не задан'));
    }

    const opts = {
        hostname: API_HOST,
        path: API_PREFIX + pathUrl,
        method: method,
        headers: Object.assign(
            {
                Authorization: 'Bot ' + token,
                'User-Agent': 'DiscordBot (FlowDM)'
            },
            headers || {}
        )
    };
    if (bodyBuf && bodyBuf.length) {
        opts.headers['Content-Length'] = bodyBuf.length;
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
                    } catch (_e) {
                        if (res.statusCode >= 400) {
                            return reject(new Error('Discord HTTP ' + res.statusCode + ': ' + chunks.slice(0, 300)));
                        }
                    }
                }
                if (res.statusCode >= 400) {
                    const msg = (parsed && parsed.message) || chunks.slice(0, 300) || 'unknown';
                    return reject(new Error('Discord HTTP ' + res.statusCode + ': ' + msg));
                }
                resolve(parsed);
            });
        });
        req.on('error', reject);
        if (bodyBuf && bodyBuf.length) req.write(bodyBuf);
        req.end();
    });
}

function discordRequest(method, pathUrl, bodyObj) {
    const body = bodyObj ? JSON.stringify(bodyObj) : null;
    const headers = body ? { 'Content-Type': 'application/json' } : {};
    const buf = body ? Buffer.from(body, 'utf8') : null;
    return discordRequestRaw(method, pathUrl, headers, buf);
}

function buildMultipartBody(payloadJson, files) {
    const boundary = '----FlowDM' + Date.now().toString(16);
    const chunks = [];
    const payloadStr = JSON.stringify(payloadJson);

    chunks.push(Buffer.from('--' + boundary + '\r\n'));
    chunks.push(
        Buffer.from(
            'Content-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n' +
                payloadStr +
                '\r\n'
        )
    );

    (files || []).forEach(function (file, index) {
        chunks.push(Buffer.from('--' + boundary + '\r\n'));
        chunks.push(
            Buffer.from(
                'Content-Disposition: form-data; name="files[' +
                    index +
                    ']"; filename="' +
                    String(file.name || 'file') +
                    '"\r\nContent-Type: ' +
                    String(file.contentType || 'application/octet-stream') +
                    '\r\n\r\n'
            )
        );
        chunks.push(file.data);
        chunks.push(Buffer.from('\r\n'));
    });

    chunks.push(Buffer.from('--' + boundary + '--\r\n'));
    return {
        boundary: boundary,
        body: Buffer.concat(chunks)
    };
}

function postChannelMessage(channelId, payload) {
    const ch = String(channelId || '').trim();
    if (!ch) return Promise.reject(new Error('channel id пустой'));
    return discordRequest('POST', '/channels/' + ch + '/messages', payload);
}

function postChannelMessageWithFiles(channelId, payloadJson, files) {
    const ch = String(channelId || '').trim();
    if (!ch) return Promise.reject(new Error('channel id пустой'));
    const multipart = buildMultipartBody(payloadJson, files);
    return discordRequestRaw('POST', '/channels/' + ch + '/messages', {
        'Content-Type': 'multipart/form-data; boundary=' + multipart.boundary
    }, multipart.body);
}

function patchChannelMessage(channelId, messageId, payload) {
    const ch = String(channelId || '').trim();
    const mid = String(messageId || '').trim();
    if (!ch || !mid) return Promise.reject(new Error('channel/message id пустой'));
    return discordRequest('PATCH', '/channels/' + ch + '/messages/' + mid, payload);
}

function isBenignInteractionAckError(err) {
    const m = String((err && err.message) || err || '');
    return /already been acknowledged|unknown interaction/i.test(m);
}

function interactionCallback(interactionId, interactionToken, payload) {
    const iid = String(interactionId || '').trim();
    const token = String(interactionToken || '').trim();
    if (!iid || !token) return Promise.reject(new Error('interaction id/token пустой'));
    return discordRequest('POST', '/interactions/' + iid + '/' + token + '/callback', payload).catch(function (err) {
        // Второй процесс (discord.js admin bot) уже ответил на ту же кнопку/модалку.
        if (isBenignInteractionAckError(err)) return {};
        throw err;
    });
}

function probeChannel(channelId) {
    const ch = String(channelId || '').trim();
    if (!ch) return Promise.reject(new Error('channel id пустой'));
    return discordRequest('GET', '/channels/' + ch, null);
}

function findGuildChannelByName(guildId, channelName) {
    const gid = String(guildId || '').trim();
    const name = String(channelName || '').trim().toLowerCase();
    if (!gid || !name) return Promise.resolve('');
    return discordRequest('GET', '/guilds/' + gid + '/channels', null).then(function (channels) {
        if (!Array.isArray(channels)) return '';
        for (let i = 0; i < channels.length; i++) {
            const ch = channels[i];
            if (!ch || ch.type !== 0) continue;
            if (String(ch.name || '').trim().toLowerCase() === name) {
                return String(ch.id);
            }
        }
        return '';
    });
}

function getChannelMessages(channelId, limit) {
    const ch = String(channelId || '').trim();
    if (!ch) return Promise.reject(new Error('channel id пустой'));
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    return discordRequest('GET', '/channels/' + ch + '/messages?limit=' + lim, null);
}

/** Ищет сообщение бота с кнопкой custom_id (и опционально title эмбеда). */
function findBotPanelMessage(channelId, customId, embedTitle) {
    const wantId = String(customId || '');
    const wantTitle = embedTitle != null ? String(embedTitle) : '';
    return getChannelMessages(channelId, 50).then(function (messages) {
        if (!Array.isArray(messages)) return null;
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (!msg) continue;
            const rows = msg.components || [];
            let hasBtn = false;
            for (let r = 0; r < rows.length; r++) {
                const comps = (rows[r] && rows[r].components) || [];
                for (let c = 0; c < comps.length; c++) {
                    if (String(comps[c].custom_id || '') === wantId) {
                        hasBtn = true;
                        break;
                    }
                }
                if (hasBtn) break;
            }
            if (hasBtn) return msg;
            if (wantTitle && Array.isArray(msg.embeds) && msg.embeds[0]) {
                if (String(msg.embeds[0].title || '') === wantTitle) return msg;
            }
        }
        return null;
    });
}

module.exports = {
    getDiscordToken,
    getDiscordEnvValue,
    postChannelMessage,
    postChannelMessageWithFiles,
    patchChannelMessage,
    getChannelMessages,
    findBotPanelMessage,
    interactionCallback,
    probeChannel,
    findGuildChannelByName,
    discordRequest
};
