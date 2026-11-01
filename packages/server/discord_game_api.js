/**
 * HTTP API для Discord admin-бота: мгновенные игровые команды на RAGE.
 * POST http://127.0.0.1:8790/api/game/command
 * Header: Authorization: Bearer <secret>  или  X-Api-Key: <secret>
 * Body JSON: { action, static?, time?, amount?, fraction?, reason?, admin? }
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { runServerCommand } = require('./discord_console.js');

const CONFIG_PATH = path.join(__dirname, 'discord_admin', 'config.json');
const DEFAULT_PORT = 8790;

function loadGameApiConfig() {
    try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        const ga = cfg.gameApi || {};
        return {
            port: Number(ga.port) || DEFAULT_PORT,
            secret: String(ga.secret || ''),
            bind: String(ga.bind || '127.0.0.1')
        };
    } catch (_e) {
        return { port: DEFAULT_PORT, secret: '', bind: '127.0.0.1' };
    }
}

function parseTimeToSeconds(timeStr) {
    let total = 0;
    let current = '';
    const s = String(timeStr || '')
        .toLowerCase()
        .replace(/д/g, 'd')
        .replace(/ч/g, 'h')
        .replace(/м/g, 'm')
        .replace(/\s+/g, '');
    if (/^\d+$/.test(s)) {
        return Math.max(1, parseInt(s, 10) * 60);
    }
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if ((ch >= '0' && ch <= '9') || ch === '.') {
            current += ch;
        } else if (ch === 'd' && current) {
            total += Math.floor(parseFloat(current) * 86400);
            current = '';
        } else if (ch === 'h' && current) {
            total += Math.floor(parseFloat(current) * 3600);
            current = '';
        } else if (ch === 'm' && current) {
            total += Math.floor(parseFloat(current) * 60);
            current = '';
        }
    }
    if (current) total += Math.floor(parseFloat(current) * 60);
    return Math.max(1, total);
}

function fmtSqlDate(d) {
    return (
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0') +
        ' ' +
        String(d.getHours()).padStart(2, '0') +
        ':' +
        String(d.getMinutes()).padStart(2, '0') +
        ':' +
        String(d.getSeconds()).padStart(2, '0')
    );
}

function dbQuery(sql, params) {
    return new Promise((resolve, reject) => {
        if (!global.DB || !global.DB_READY) {
            // Retry 5 times with 1s delay
            let retries = 0;
            const tryQuery = () => {
                retries++;
                if (global.DB && global.DB_READY) {
                    global.DB.query(sql, params || [], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    });
                } else if (retries <= 5) {
                    setTimeout(tryQuery, 1000);
                } else {
                    reject(new Error('DB not ready after 5 retries'));
                }
            };
            tryQuery();
        } else {
            global.DB.query(sql, params || [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        }
    });
}

function findOnline(staticId) {
    if (typeof global.findOnlinePlayerByStatic === 'function') {
        return global.findOnlinePlayerByStatic(staticId);
    }
    return null;
}

function adminName(body) {
    return String(body.admin || 'Discord').slice(0, 64);
}

function fmtValue(n) {
    return typeof global.formatnum1 === 'function' ? global.formatnum1(n) : String(n);
}

/**
 * Мгновенно синхронизирует онлайн-игрока после записи в БД:
 * память + переменные + клиентские события (updateMoney/updatedp).
 * Повторный пинг через 250 мс страхует момент инициализации HUD.
 */
function syncOnlinePlayerState(online, fields) {
    if (!online || !mp.players.exists(online)) return;
    fields = fields || {};

    if (fields.money != null) {
        try { online.money = fields.money; } catch (_e) {}
    }
    if (fields.dp != null) {
        try { online.dp = fields.dp; } catch (_e) {}
    }
    if (fields.adminlvl != null) {
        try {
            online.adminlvl = fields.adminlvl;
            online.setVariable('adminlvl', fields.adminlvl);
        } catch (_e) {}
    }

    const fire = () => {
        if (fields.money != null) {
            try { online.call('updateMoney', [fmtValue(fields.money)]); } catch (_e) {}
        }
        if (fields.dp != null) {
            try { online.call('updatedp', [fmtValue(fields.dp)]); } catch (_e) {}
        }
    };
    fire();
    setTimeout(fire, 250);
}

function notifyOnline(online, msg) {
    if (!online || !mp.players.exists(online)) return;
    try { online.outputChatBox(msg); } catch (_e) {}
}

/** Зелёный notify успеха игроку (fallback — сообщение в чат). */
function discordNotifySuccess(online, msg) {
    if (!online || !mp.players.exists(online)) return;
    if (typeof global.isNotify === 'function') {
        try { global.isNotify(online, 3, 'top-mid', msg, 4000); } catch (_e) {}
        return;
    }
    notifyOnline(online, msg);
}

async function getAccount(staticId) {
    const rows = await dbQuery('SELECT login, adminlvl, money, dp FROM accounts WHERE static = ? LIMIT 1', [staticId]);
    return rows[0] || null;
}

async function actionBan(body) {
    const staticId = String(body.static || '').trim();
    const reason = String(body.reason || 'Discord').slice(0, 200);
    const admin = adminName(body);
    if (!staticId) throw new Error('static required');

    const seconds = parseTimeToSeconds(body.time);
    // Calculate days from seconds — minimum 1 day
    const days = Math.max(1, Math.ceil(seconds / 86400));
    // Cap ban at 365 days max
    const cappedDays = Math.min(days, 365);
    const now = new Date();
    const unban = new Date(now.getTime() + cappedDays * 86400 * 1000);

    const acc = await getAccount(staticId);
    if (!acc) throw new Error('player not found');
    if (Number(acc.adminlvl) >= 1) throw new Error('cannot ban admin');

    const active = await dbQuery('SELECT id FROM ban WHERE static = ? AND unban > NOW() LIMIT 1', [staticId]);
    if (active.length) throw new Error('already banned');

    const online = findOnline(staticId);

    await dbQuery(
        'INSERT INTO ban (static, banset, unban, admin, login, reason) VALUES (?, ?, ?, ?, ?, ?)',
        [staticId, fmtSqlDate(now), fmtSqlDate(unban), admin, acc.login, reason]
    );

    try {
        if (global.banGuard && typeof global.banGuard.attachFingerprintsToBan === 'function') {
            global.banGuard.attachFingerprintsToBan({
                staticId,
                login: acc.login,
                reason,
                admin,
                banset: fmtSqlDate(now),
                unban: fmtSqlDate(unban),
                onlinePlayer: online && mp.players.exists(online) ? online : null
            });
        }
    } catch (_fp) {}

    if (online && mp.players.exists(online)) {
        try {
            online.outputChatBox('!{#ff0000}Вы заблокированы администратором. Причина: ' + reason);
        } catch (_e) {}
        try {
            if (typeof global.kickPlayerSafe === 'function') global.kickPlayerSafe(online, 'Ban');
            else online.kick('Ban');
        } catch (_e2) {}
    }

    if (typeof global.sendDiscordLog === 'function') {
        global.sendDiscordLog(
            `Выдача Блокировки (Discord API)!\n\nАдмин — ${admin}\nИгрок — [${staticId}] ${acc.login}\nДней — ${cappedDays}\nПричина — ${reason}`,
            '1266445805355532368'
        );
    }
    return { ok: true, message: 'banned ' + staticId + ' for ' + cappedDays + 'd' };
}

async function actionUnban(body) {
    const staticId = String(body.static || '').trim();
    const admin = adminName(body);
    if (!staticId) throw new Error('static required');
    const rows = await dbQuery('SELECT login FROM ban WHERE static = ? LIMIT 1', [staticId]);
    if (!rows.length) throw new Error('not banned');
    await dbQuery('DELETE FROM ban WHERE static = ?', [staticId]);
    try {
        if (global.banGuard && typeof global.banGuard.clearBanFingerprintsByStatic === 'function') {
            global.banGuard.clearBanFingerprintsByStatic(staticId);
        }
    } catch (_ub) {}
    if (typeof global.sendDiscordLog === 'function') {
        global.sendDiscordLog(
            `Разблокировка (Discord API)!\n\nАдмин — ${admin}\nИгрок — [${staticId}] ${rows[0].login}`,
            '1266445805355532368'
        );
    }
    return { ok: true, message: 'unbanned ' + staticId };
}

async function actionJail(body) {
    const staticId = String(body.static || '').trim();
    const reason = String(body.reason || 'Discord').slice(0, 200);
    const admin = adminName(body);
    if (!staticId) throw new Error('static required');

    const seconds = parseTimeToSeconds(body.time);
    const online = findOnline(staticId);
    if (!online || !mp.players.exists(online)) throw new Error('player offline');

    const acc = await getAccount(staticId);
    if (!acc) throw new Error('player not found');
    if (Number(acc.adminlvl) >= 1) throw new Error('cannot jail admin');

    const existing = await dbQuery('SELECT id FROM jail WHERE static = ? LIMIT 1', [staticId]);
    if (existing.length) throw new Error('already in jail');

    const returnPos =
        typeof global.captureDemorganReturnPos === 'function'
            ? global.captureDemorganReturnPos(online)
            : null;
    if (typeof global.setDemorganReturnPos === 'function') {
        global.setDemorganReturnPos(online, returnPos);
    }

    await new Promise((resolve, reject) => {
        if (typeof global.insertJailRow !== 'function') {
            return reject(new Error('insertJailRow missing'));
        }
        global.insertJailRow(staticId, seconds, admin, acc.login, reason, returnPos, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    const dimension = Math.floor(Math.random() * 1000) + 1;
    online.setVariable('mp', false);
    online.setVariable('mpp', false);
    online.dimension = dimension;
    if (global.jailCoords) {
        online.position = new mp.Vector3(global.jailCoords.x, global.jailCoords.y, global.jailCoords.z);
    }
    try {
        online.outputChatBox('!{#ff0000}Вас посадили в деморган администратором. Причина: ' + reason);
    } catch (_e) {}

    return { ok: true, message: 'jailed ' + staticId + ' for ' + seconds + 's' };
}

async function actionUnjail(body) {
    const staticId = String(body.static || '').trim();
    const admin = adminName(body);
    if (!staticId) throw new Error('static required');

    const jailRows = await dbQuery('SELECT * FROM jail WHERE static = ? LIMIT 1', [staticId]);
    if (!jailRows.length) throw new Error('not in jail');
    await dbQuery('DELETE FROM jail WHERE static = ?', [staticId]);

    const online = findOnline(staticId);
    if (online && mp.players.exists(online) && typeof global.releasePlayerFromDemorgan === 'function') {
        if (typeof global.setDemorganReturnPos === 'function' && typeof global.parseDemorganReturnFromJailRow === 'function') {
            global.setDemorganReturnPos(online, global.parseDemorganReturnFromJailRow(jailRows[0]));
        }
        global.releasePlayerFromDemorgan(online, {
            message: '!{#00FF00}Вас выпустили из деморгана администратором.',
            notify: 'Вы возвращены.',
            jailRow: jailRows[0]
        });
    }

    if (typeof global.sendDiscordLog === 'function') {
        global.sendDiscordLog(
            `Выпуск из деморгана (Discord API)!\n\nАдмин — ${admin}\nИгрок — #${staticId}`,
            '1266445805355532368'
        );
    }
    return { ok: true, message: 'unjailed ' + staticId };
}

async function actionMute(body) {
    const staticId = String(body.static || '').trim();
    const reason = String(body.reason || 'Discord').slice(0, 200);
    const admin = adminName(body);
    if (!staticId) throw new Error('static required');

    const seconds = parseTimeToSeconds(body.time);
    const acc = await getAccount(staticId);
    if (!acc) throw new Error('player not found');

    const existing = await dbQuery('SELECT id FROM mute WHERE static = ? LIMIT 1', [staticId]);
    if (existing.length) throw new Error('already muted');

    await dbQuery('INSERT INTO mute (static, login, seconds, admin, reason) VALUES (?, ?, ?, ?, ?)', [
        staticId,
        acc.login,
        String(seconds),
        admin,
        reason
    ]);

    const online = findOnline(staticId);
    if (online && mp.players.exists(online)) {
        online.setVariable('mute', true);
        try {
            online.outputChatBox('!{#ff0000}Вам выдан мут администратором. Причина: ' + reason);
        } catch (_e) {}
    }
    return { ok: true, message: 'muted ' + staticId + ' for ' + seconds + 's' };
}

async function actionUnmute(body) {
    const staticId = String(body.static || '').trim();
    if (!staticId) throw new Error('static required');
    const rows = await dbQuery('SELECT id FROM mute WHERE static = ? LIMIT 1', [staticId]);
    if (!rows.length) throw new Error('not muted');
    await dbQuery('DELETE FROM mute WHERE static = ?', [staticId]);
    const online = findOnline(staticId);
    if (online && mp.players.exists(online)) {
        online.setVariable('mute', false);
        discordNotifySuccess(online, 'Мут с вас снят администратором.');
    }
    return { ok: true, message: 'unmuted ' + staticId };
}

async function actionGiveDp(body) {
    const staticId = String(body.static || '').trim();
    const amount = Math.floor(Number(body.amount));
    const admin = adminName(body);
    if (!staticId) throw new Error('static required');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be positive');
    // Cap DP at 100000 per operation
    const cappedAmount = Math.min(amount, 100000);

    const acc = await getAccount(staticId);
    if (!acc) throw new Error('player not found');
    const newDp = (parseInt(acc.dp, 10) || 0) + cappedAmount;
    await dbQuery('UPDATE accounts SET dp = ? WHERE static = ?', [String(newDp), staticId]);

    const online = findOnline(staticId);
    syncOnlinePlayerState(online, { dp: newDp });
    discordNotifySuccess(online, 'Вы получили ' + fmtValue(cappedAmount) + ' DP.');
    return { ok: true, message: 'dp ' + staticId + ' += ' + cappedAmount };
}

async function actionGiveMoney(body) {
    const staticId = String(body.static || '').trim();
    const amount = Math.floor(Number(body.amount));
    const admin = adminName(body);
    if (!staticId) throw new Error('static required');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be positive');
    // Cap money at 10000000 per operation
    const cappedAmount = Math.min(amount, 10000000);

    const acc = await getAccount(staticId);
    if (!acc) throw new Error('player not found');
    const newMoney = (parseInt(acc.money, 10) || 0) + cappedAmount;
    await dbQuery('UPDATE accounts SET money = ? WHERE static = ?', [String(newMoney), staticId]);

    const online = findOnline(staticId);
    syncOnlinePlayerState(online, { money: newMoney });
    discordNotifySuccess(online, 'Вы получили ' + fmtValue(cappedAmount) + '$.');
    return { ok: true, message: 'money ' + staticId + ' += ' + cappedAmount };
}

async function actionGiveMats(body) {
    const fid = parseInt(body.fraction, 10);
    const amount = Math.floor(Number(body.amount));
    if (!fid || fid < 1 || fid > 6) throw new Error('fraction 1-6 required');
    if (!Number.isFinite(amount) || amount < 1) throw new Error('amount required');

    if (typeof global.addFactionMaterials !== 'function') throw new Error('materials api missing');
    const total = await new Promise((resolve, reject) => {
        global.addFactionMaterials(fid, amount, (err, t) => (err ? reject(err) : resolve(t)));
    });
    return { ok: true, message: 'frac ' + fid + ' mats += ' + amount + ' total=' + total };
}

async function actionTakeMats(body) {
    const fid = parseInt(body.fraction, 10);
    const amount = Math.floor(Number(body.amount));
    if (!fid || fid < 1 || fid > 6) throw new Error('fraction 1-6 required');
    if (!Number.isFinite(amount) || amount < 1) throw new Error('amount required');
    if (typeof global.removeFactionMaterials !== 'function') throw new Error('materials api missing');
    if (!global.removeFactionMaterials(fid, amount)) throw new Error('not enough materials');
    return { ok: true, message: 'frac ' + fid + ' mats -= ' + amount };
}

async function actionMakeAdmin(body) {
    const staticId = String(body.static || '').trim();
    const level = Math.max(0, Math.min(10, Math.floor(Number(body.level) || 0))); // Cap at 10
    const admin = adminName(body);
    if (!staticId) throw new Error('static required');

    const acc = await getAccount(staticId);
    if (!acc) throw new Error('player not found');

    await dbQuery('UPDATE accounts SET adminlvl = ? WHERE static = ?', [String(level), staticId]);

    const online = findOnline(staticId);
    syncOnlinePlayerState(online, { adminlvl: level });
    discordNotifySuccess(online, 'Вам выдан уровень администратора ' + level + '.');

    if (typeof global.sendDiscordLog === 'function') {
        global.sendDiscordLog(
            `Выдача админки (Discord API)!\n\nАдмин — ${admin}\nИгрок — [${staticId}] ${acc.login}\nLVL — ${level}`,
            '1266445805355532368'
        );
    }
    return { ok: true, message: 'makeadmin ' + staticId + ' lvl ' + level };
}

/**
 * Универсальная консоль: выполняет любую зарегистрированную команду сервера.
 * body.command — полная строка команды (например "kick 123 читы").
 */
async function actionConsole(body) {
    const line = String(body.command || body.console || '').trim();
    if (!line) throw new Error('command required');
    const result = await runServerCommand(line, {
        admin: adminName(body),
        adminStatic: String(body.adminStatic || '').trim()
    });
    if (!result.ok) throw new Error(result.error || 'command failed');
    return {
        ok: true,
        message: 'executed',
        command: line,
        output: result.output || []
    };
}

const ACTIONS = {
    ban: actionBan,
    unban: actionUnban,
    jail: actionJail,
    unjail: actionUnjail,
    mute: actionMute,
    unmute: actionUnmute,
    givedp: actionGiveDp,
    givemoney: actionGiveMoney,
    givefracmats: actionGiveMats,
    takefracmats: actionTakeMats,
    makeadmin: actionMakeAdmin,
    console: actionConsole
};

/** Парс строки вида "/ban 12 1д читы" → { action, ... } */
function parseCommandLine(cmdLine) {
    const raw = String(cmdLine || '').trim();
    if (!raw) return null;
    const parts = raw.replace(/^\//, '').split(/\s+/);
    const name = String(parts[0] || '').toLowerCase();

    if (name === 'ban' || name === 'jail' || name === 'mute') {
        return {
            action: name,
            static: parts[1],
            time: parts[2],
            reason: parts.slice(3).join(' ') || 'Discord'
        };
    }
    if (name === 'unban' || name === 'unjail' || name === 'unmute') {
        return { action: name, static: parts[1] };
    }
    if (name === 'givedp' || name === 'givemoney') {
        return { action: name, static: parts[1], amount: parts[2] };
    }
    if (name === 'givefracmats' || name === 'takefracmats') {
        return { action: name, fraction: parts[1], amount: parts[2] };
    }
    if (name === 'makeadmin') {
        return { action: 'makeadmin', static: parts[1], level: parts[2] };
    }
    return null;
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (c) => {
            size += c.length;
            if (size > 64 * 1024) {
                reject(new Error('body too large'));
                req.destroy();
                return;
            }
            chunks.push(c);
        });
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8') || '{}';
                resolve(JSON.parse(raw));
            } catch (e) {
                reject(new Error('invalid json'));
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, code, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    res.end(body);
}

function authOk(req, secret, bodySecret) {
    if (!secret) return false;
    const hdr = String(req.headers.authorization || '');
    if (hdr.toLowerCase().startsWith('bearer ') && hdr.slice(7).trim() === secret) return true;
    if (String(req.headers['x-api-key'] || '') === secret) return true;
    if (bodySecret && String(bodySecret) === secret) return true;
    return false;
}

function startGameApi() {
    const cfg = loadGameApiConfig();
    if (!cfg.secret) {
        console.log('[discord_game_api] secret missing in discord_admin/config.json → gameApi.secret');
        return null;
    }

    // ==================== RATE LIMITING ====================
    const rateLimitWindow = 1000; // 1 second window
    const maxRequestsPerWindow = 10; // max 10 requests per second
    const requestCounts = new Map(); // IP → { count, windowStart }

    function checkRateLimit(ip) {
        const now = Date.now();
        let entry = requestCounts.get(ip);
        if (!entry || now - entry.windowStart > rateLimitWindow) {
            entry = { count: 0, windowStart: now };
            requestCounts.set(ip, entry);
        }
        entry.count++;
        if (entry.count > maxRequestsPerWindow) {
            return false;
        }
        return true;
    }

    // Cleanup old entries periodically
    setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of requestCounts) {
            if (now - entry.windowStart > rateLimitWindow * 2) {
                requestCounts.delete(ip);
            }
        }
    }, 60000);

    const server = http.createServer(async (req, res) => {
        try {
            const clientIp = req.socket.remoteAddress || 'unknown';

            if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/game/health')) {
                return sendJson(res, 200, { ok: true, service: 'discord_game_api' });
            }
            if (req.method !== 'POST' || req.url !== '/api/game/command') {
                return sendJson(res, 404, { ok: false, error: 'not found' });
            }

            // Rate limit check
            if (!checkRateLimit(clientIp)) {
                console.log(`[discord_game_api] Rate limited: ${clientIp}`);
                return sendJson(res, 429, { ok: false, error: 'rate limited' });
            }

            const body = await readBody(req);
            if (!authOk(req, cfg.secret, body && body.secret)) {
                console.log(`[discord_game_api] Unauthorized from: ${clientIp}`);
                return sendJson(res, 401, { ok: false, error: 'unauthorized' });
            }

            let payload = body;
            if (body.command && !body.action) {
                const parsed = parseCommandLine(body.command);
                if (parsed) {
                    payload = Object.assign({}, parsed, { admin: body.admin || 'Discord' });
                } else {
                    // Любая команда сервера через универсальную консоль
                    payload = {
                        action: 'console',
                        command: body.command,
                        admin: body.admin || 'Discord',
                        adminStatic: body.adminStatic
                    };
                }
            }

            const action = String(payload.action || '').toLowerCase().trim();
            const fn = ACTIONS[action];
            if (!fn) {
                return sendJson(res, 400, { ok: false, error: 'unknown action', actions: Object.keys(ACTIONS) });
            }

            const result = await fn(payload);
            return sendJson(res, 200, result);
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            console.log('[discord_game_api]', msg);
            return sendJson(res, 400, { ok: false, error: msg });
        }
    });

    server.listen(cfg.port, cfg.bind, () => {
        console.log('[discord_game_api] http://' + cfg.bind + ':' + cfg.port + '/api/game/command');
    });
    server.on('error', (e) => {
        console.log('[discord_game_api] listen error:', e.message || e);
    });
    return server;
}

/** Генерация секрета при первом запуске, если пусто. */
function ensureSecretInConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        const cfg = JSON.parse(raw);
        if (!cfg.gameApi) cfg.gameApi = {};
        if (!cfg.gameApi.secret) {
            cfg.gameApi.secret = crypto.randomBytes(24).toString('hex');
            cfg.gameApi.port = cfg.gameApi.port || DEFAULT_PORT;
            cfg.gameApi.bind = cfg.gameApi.bind || '127.0.0.1';
            cfg.gameApi.url = cfg.gameApi.url || 'http://127.0.0.1:' + (cfg.gameApi.port || DEFAULT_PORT);
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
            console.log('[discord_game_api] generated gameApi.secret in config.json');
        } else {
            if (!cfg.gameApi.url) {
                cfg.gameApi.url = 'http://127.0.0.1:' + (cfg.gameApi.port || DEFAULT_PORT);
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
            }
        }
    } catch (e) {
        console.log('[discord_game_api] ensureSecret:', e.message || e);
    }
}

ensureSecretInConfig();
startGameApi();

module.exports = { startGameApi, parseTimeToSeconds };
