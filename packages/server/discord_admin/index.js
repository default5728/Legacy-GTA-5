const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonStyle, SlashCommandBuilder, Routes, REST } = require('discord.js');

const { config } = require('./config');

const { GoogleSheetsClient } = require('./google_sheets');

const axios = require('axios');

const mariadb = require('mariadb');

const fs = require('fs');

const path = require('path');

const crypto = require('crypto');



// ==================== STATE ====================

const settingsFile = path.join(__dirname, 'bot_settings.json');

const statsFile = path.join(__dirname, 'admin_stats.json');

const idMappingFile = path.join(__dirname, 'id_mapping.json');

const BACKUP_DIR = path.join(__dirname, 'data', 'backups');



function ensureBackupDir() {

    if (!fs.existsSync(BACKUP_DIR)) {

        fs.mkdirSync(BACKUP_DIR, { recursive: true });

    }

}



function backupFilePath(guildId) {

    ensureBackupDir();

    return path.join(BACKUP_DIR, `backup_${guildId}.json`);

}



function listBackups() {

    ensureBackupDir();

    return fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup_') && f.endsWith('.json'));

}



let settings = loadSettings();

let warningsTracker = {};

let spamTracker = {};

let floodTracker = {};

let commandSpamTracker = {};

let dbPool = null;

let presenceTask = null;

let scheduleTask = null;

let scheduleSent = { daily: '', weekly: '' };



// ==================== HELPERS ====================

function loadSettings() {

    try {

        if (fs.existsSync(settingsFile)) {

            return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));

        }

    } catch (e) { /* ignore */ }

    return { auto_role_id: '1532464933361684702', request_counter: 0, helper_counter: 0, media_counter: 0, leader_counter: 0, spam_protection: false, spam_limit: 5, spam_timeframe: 10 };

}



function saveSettings(data) {

    fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2), 'utf-8');

}



function loadStats() {

    try {

        if (fs.existsSync(statsFile)) {

            return JSON.parse(fs.readFileSync(statsFile, 'utf-8'));

        }

    } catch (e) { /* ignore */ }

    return {};

}



function saveStats(data) {

    fs.writeFileSync(statsFile, JSON.stringify(data, null, 2), 'utf-8');

}



function incrementStat(userId, field) {

    const stats = loadStats();

    const uid = String(userId);

    if (!stats[uid]) stats[uid] = { bans: 0, mutes: 0, reports_closed: 0 };

    stats[uid][field] = (stats[uid][field] || 0) + 1;

    saveStats(stats);

}



function parseTime(timeStr) {

    let total = 0;

    let current = '';

    for (const char of String(timeStr).toLowerCase()) {

        if ((char >= '0' && char <= '9') || char === '.' || char === ',') {

            current += char === ',' ? '.' : char;

        } else if (current && (char === 'd' || char === 'д')) {

            total += parseInt(parseFloat(current) * 86400);

            current = '';

        } else if (current && (char === 'h' || char === 'ч')) {

            total += parseInt(parseFloat(current) * 3600);

            current = '';

        } else if (current && (char === 'm' || char === 'м')) {

            total += parseInt(parseFloat(current) * 60);

            current = '';

        } else if (current && (char === 's' || char === 'с')) {

            total += parseInt(parseFloat(current));

            current = '';

        }

    }

    if (current) total += parseInt(parseFloat(current) * 60);

    return total;

}



function formatTime(seconds) {

    const days = Math.floor(seconds / 86400);

    const hours = Math.floor((seconds % 86400) / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];

    if (days > 0) parts.push(`${days}д`);

    if (hours > 0) parts.push(`${hours}ч`);

    if (minutes > 0) parts.push(`${minutes}м`);

    return parts.join(' ') || '0м';

}



function makeEmbed(data) {

    const embed = new EmbedBuilder(data);

    return embed;

}



function extractUserIdFromEmbed(embed) {

    if (!embed) return null;

    const sources = [];

    if (embed.description) sources.push(embed.description);

    for (const field of embed.fields || []) {

        sources.push(field.value || '');

        sources.push(field.name || '');

    }

    const text = sources.join('\n');

    const match = text.match(/<@!?(\d{15,20})>/);

    if (match) return match[1];

    const plain = text.match(/\b(\d{15,20})\b/);

    return plain ? plain[1] : null;

}



function log(msg) {

    const now = new Date();

    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    console.log(`[${time}] ${msg}`);

}



function isCreator(member) {

    if (!config.creatorRoleIds || config.creatorRoleIds.length === 0) return false;

    return member.roles.cache.some(r => config.creatorRoleIds.includes(r.id));

}



function hasModRole(member) {

    if (isCreator(member)) return true;

    return member.roles.cache.some(r =>

        [config.headModRoleId, config.modRoleId, config.backupAllowedRoleId].includes(r.id)

    );

}



function hasHeadModRole(member) {

    if (isCreator(member)) return true;

    return member.roles.cache.some(r => r.id === config.headModRoleId);

}



function hasSeniorAdmin(member) {

    if (isCreator(member)) return true;

    return member.roles.cache.some(r => r.id === config.seniorAdminRoleId);

}



function canLoadBackup(member) {

    return hasModRole(member);

}



// Роль «Создатель проекта» — единственная, кому доступны /console и /game

const PROJECT_CREATOR_ROLE_ID = '1532465024868679800';

function isProjectCreator(member) {

    return !!member && member.roles.cache.some(r => r.id === PROJECT_CREATOR_ROLE_ID);

}

function hasConsoleAccess(member) {

    return isProjectCreator(member);

}



// ==================== DB HELPERS ====================

async function getDbConnection() {

    if (!config.dbHost) return null;

    try {

        if (!dbPool) {

            dbPool = mariadb.createPool({

                host: config.dbHost,

                port: config.dbPort,

                user: config.dbUser,

                password: config.dbPassword,

                database: config.dbName,

                connectionLimit: 5,

            });

            log(`DB: pool created (${config.dbHost}:${config.dbPort}/${config.dbName})`);

        }

        return await dbPool.getConnection();

    } catch (e) {

        log(`DB error: ${e.message}`);

        return null;

    }

}



async function dbQuery(sql, args) {

    let conn;

    try {

        conn = await getDbConnection();

        if (!conn) return [];

        const rows = await conn.query(sql, args || []);

        return rows;

    } catch (e) {

        log(`DB query error: ${e.message}`);

        return [];

    } finally {

        if (conn) try { conn.end(); } catch (e) { /* ignore */ }

    }

}



// ==================== GAME API ====================

async function sendGameCommand(command, opts) {

    if (!config.gameApiUrl) {

        log('GameAPI: not configured');

        return { ok: false, error: 'GameAPI не настроен' };

    }

    try {

        log(`GameAPI command: ${command} → ${config.gameApiUrl}`);

        const controller = new AbortController();

        const timeout = setTimeout(() => controller.abort(), 15000);

        const resp = await axios.post(config.gameApiUrl, {

            command,

            secret: config.gameApiSecret,

            admin: (opts && opts.admin) || 'Discord',

            adminStatic: (opts && opts.adminStatic) || '',

        }, {

            timeout: 15000,

            signal: controller.signal,

            headers: {

                'Authorization': `Bearer ${config.gameApiSecret}`,

                'X-Api-Key': config.gameApiSecret,

            },

        });

        clearTimeout(timeout);

        const data = resp.data || {};

        log(`GameAPI response: ${JSON.stringify(data).slice(0, 500)}`);

        const ok = resp.status >= 200 && resp.status < 300 && !!data.ok;

        return {

            ok,

            status: resp.status,

            error: ok ? null : String(data.error || 'unknown error'),

            output: Array.isArray(data.output) ? data.output : [],

            message: data.message,

        };

    } catch (e) {

        log(`GameAPI error: ${e.message} (url=${config.gameApiUrl})`);

        return { ok: false, error: e.message };

    }

}



async function sendGameAction(action, data) {

    if (!config.gameApiUrl) {

        log('GameAPI: not configured');

        return { ok: false, error: 'GameAPI не настроен' };

    }

    const errText = (err) => {

        if (err && err.response && err.response.data && err.response.data.error) {

            return String(err.response.data.error);

        }

        return err && err.message ? err.message : String(err);

    };

    try {

        const payload = { action, admin: 'Discord', ...data };

        log(`GameAPI action: ${action} ${JSON.stringify(payload).slice(0, 500)}`);

        const controller = new AbortController();

        const timeout = setTimeout(() => controller.abort(), 15000);

        const resp = await axios.post(config.gameApiUrl, payload, {

            timeout: 15000,

            signal: controller.signal,

            headers: {

                'Authorization': `Bearer ${config.gameApiSecret}`,

                'X-Api-Key': config.gameApiSecret,

            },

        });

        clearTimeout(timeout);

        log(`GameAPI action response: status=${resp.status} data=${JSON.stringify(resp.data).slice(0, 300)}`);

        if (!resp.data || !resp.data.ok) {

            const msg = String((resp.data && resp.data.error) || 'unknown error');

            log(`GameAPI action FAILED: ${JSON.stringify(resp.data).slice(0, 300)}`);

            return { ok: false, error: msg };

        }

        return { ok: true, error: null };

    } catch (e) {

        log(`GameAPI action error: ${errText(e)} (action=${action}, url=${config.gameApiUrl})`);

        // Single retry only for connection errors

        if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND' || e.code === 'ECONNRESET') {

            log(`GameAPI retrying ${action} in 2s...`);

            await new Promise(r => setTimeout(r, 2000));

            try {

                const payload = { action, admin: 'Discord', ...data };

                const resp2 = await axios.post(config.gameApiUrl, payload, {

                    timeout: 15000,

                    headers: {

                        'Authorization': `Bearer ${config.gameApiSecret}`,

                        'X-Api-Key': config.gameApiSecret,

                    },

                });

                log(`GameAPI retry response: ${JSON.stringify(resp2.data).slice(0, 300)}`);

                const ok2 = !!(resp2.data && resp2.data.ok);

                return { ok: ok2, error: ok2 ? null : String((resp2.data && resp2.data.error) || 'unknown error') };

            } catch (e2) {

                log(`GameAPI retry error: ${errText(e2)}`);

            }

        }

        return { ok: false, error: errText(e) };

    }

}



// ==================== ID REPLACEMENT ====================

function applyIdReplacement(idMapUpdate) {

    let existing = {};

    if (fs.existsSync(idMappingFile)) {

        try { existing = JSON.parse(fs.readFileSync(idMappingFile, 'utf-8')); } catch (e) { /* ignore */ }

    }

    const translation = {};

    for (const [oldId, newId] of Object.entries(idMapUpdate)) {

        const oldS = String(oldId);

        const newS = String(newId);

        const currentS = existing[oldS] || oldS;

        if (currentS !== newS) translation[currentS] = newS;

        existing[oldS] = newS;

    }

    if (Object.keys(translation).length === 0) {

        log('ID replacement: no changes');

        return;

    }

    const targetFiles = [

        path.join(__dirname, 'bot_settings.json'),

        path.join(__dirname, 'config.json'),

    ];

    for (const filepath of targetFiles) {

        if (!fs.existsSync(filepath)) continue;

        try {

            let content = fs.readFileSync(filepath, 'utf-8');

            for (const [cur, newId] of Object.entries(translation)) {

                const escaped = cur.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

                content = content.replace(new RegExp(`(?<!\\d)${escaped}(?!\\d)`, 'g'), newId);

            }

            fs.writeFileSync(filepath, content, 'utf-8');

            log(`ID replaced in ${path.basename(filepath)}`);

        } catch (e) {

            log(`Error replacing in ${path.basename(filepath)}: ${e.message}`);

        }

    }

    fs.writeFileSync(idMappingFile, JSON.stringify(existing, null, 2), 'utf-8');

    log(`id_mapping.json saved (${Object.keys(existing).length} entries)`);

}



// ==================== FORBIDDEN WORDS & PATTERNS ====================

// Все проверки ниже идут ПО ГРАНИЦАМ СЛОВ (не подстрока), чтобы обычные

// слова («ожидать», «плохо», «геймер», «неграмотный», «мурад») не считались матом.

const FORBIDDEN_WORDS = [

    'пидорас', 'пидр', 'пидор', 'пидоры', 'пидоров',

    'ебал', 'ёбан', 'ёбнут', 'ебнут',

    'шлюха', 'шлюхи', 'шлюх', 'шлех', 'шлюшки',

    'сука', 'суки', 'блять', 'блядь', 'бляд',

    'хуй', 'хуи', 'хуев', 'хули',

    'кнч', 'петух', 'петухи', 'петухов', 'педик', 'педрил',

    'говно', 'говна', 'говн', 'жопа', 'жоп',

    'тварь', 'твари', 'тварин', 'урод', 'урода', 'уродов', 'уродина',

    'дебил', 'дебилы', 'дебилов', 'идиот', 'идиоты', 'идиотов',

    'кретин', 'кретины', 'кретинов', 'хам', 'хамов',

    'нахуй', 'нахер', 'похер', 'похуй',

    'запизд', 'выпизд', 'припизд', 'задолбал',

    'заебал', 'заеби', 'наебн', 'уеби',

    'тупой', 'тупизн', 'дурень', 'дурак',

    'чмо', 'чмовь', 'говнюк', 'говнор', 'дерьмо',

    'bloodydm',

];



// Проверка слова как отдельного токена (границы слова, работает с кириллицей и латиницей).

function matchesWordBoundary(pattern, text) {

    try {

        const flags = pattern.flags.replace('g', '');

        return new RegExp(`(?<![а-яёa-z0-9])${pattern.source}(?![а-яёa-z0-9])`, flags).test(text);

    } catch (e) { return false; }

}



// Проверка, что слово встречается отдельным токеном (а не внутри другого слова).

function containsWordToken(word, textLower) {

    const w = String(word).toLowerCase();

    if (!w) return false;

    return matchesWordBoundary(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), textLower);

}



const BAD_NICK_PATTERNS = [

    /у[её]б[оае]/i, /п[ие]д[оаеу]р/i, /х[ууй]л?и/i, /бл[яа]дь/i,

    /с[уу]к[ау]/i, /ж[оа]п[ауе]/i, /г[оа]вн[оае]/i, /д[её]рьм[оае]/i,

    /тв[аа]р[ьи]/i, /ур[оа]д/i, /д[её]б[иі]л/i, /ид[иі]от/i,

    /кр[еэ]т[иі]н/i, /лох[уаие]/i, /чм[оае]/i, /конч[еау]й/i,

    /петух[оаие]/i, /педик/i, /шлюх[ауео]/i, /наху[йея]/i,

    /заеб[ауе]л/i, /уеби/i, /туп[оаие]/i, /дурак/i, /говнюк/i,

];



const NATIONAL_PATTERNS = [

    /н[еэ]гр/i, /жид[оаеу]/i, /хохл[оаеу]/i, /кацап/i,

    /чурк[аеу]/i, /хач[оаеу]/i, /тазик/i, /чучмек/i,

    /бандер[оаеу]/i, /свастика/i,

];



const INSULT_PATTERNS = [

    /у[её]б[оае]/i, /п[ие]д[оаеу]р/i, /х[ууй]л?и/i, /бл[яа]дь/i,

    /с[уу]к[ау]/i, /ж[оа]п[ауе]/i, /г[оа]вн[оае]/i, /д[её]рьм[оае]/i,

    /тв[аа]р[ьи]/i, /ур[оа]д/i, /д[её]б[иі]л/i, /ид[иі]от/i,

    /кр[еэ]т[иі]н/i, /х[аа]м/i, /лох[уаеыи]?/i, /чм[оае]/i,

    /конч[еау]й/i, /петух[оаие]/i, /педик/i,

    /шлюх[ауео]/i, /наху[йея]/i, /нахе[рт]/i, /поху[йя]/i,

    /заеб[ауе]л/i, /заеби/i, /уеби/i, /наебн/i,

    /запизд/i, /выпизд/i, /припизд/i, /задолбал/i,

    /туп[оаие]/i, /тупизн/i, /дурень/i, /дурак/i,

    /говнюк/i, /говнор/i, /чмовь/i,

];



const HATE_PATTERNS = [

    /н[еэ]гр/i, /жид[оаеуыи]?/i, /хохл[оаеу]/i, /кацап/i,

    /чурк[аеу]/i, /хач[оаеу]/i, /тазик/i, /чучмек/i, /бандер[оаеу]/i,

];



const FAMILY_INSULTS = [

    /твоя?\s*мам[ауео]/i, /твой?\s*пап[ауео]/i,

    /мамк[ауе]/i, /мамочк[ауе]/i, /мамаш[ауе]/i, /папаш[ауе]/i,

    /батя/i, /батеньк/i, /мать/i, /мамонт/i, /сын[ауе]/i,

];



const URL_PATTERN = /https?:\/\/\S+|www\.\S+|discord\.gg\/\S+|t\.me\/\S+/gi;



// ==================== CLIENT SETUP ====================

const client = new Client({

    intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers,

        GatewayIntentBits.GuildMessages,

        GatewayIntentBits.MessageContent,

        GatewayIntentBits.GuildModeration,

        GatewayIntentBits.GuildVoiceStates,

        GatewayIntentBits.GuildPresences,

    ],

    partials: [Partials.Channel],

});



let gsDaily, gsWeekly, gsCalls, gsStaff;



try {

    gsDaily = new GoogleSheetsClient('credentials.json', config.googleSheetId, config.sheetDaily);

} catch (e) { log(`GoogleSheets daily: ${e.message}`); }



try {

    gsWeekly = new GoogleSheetsClient('credentials.json', config.googleSheetId, config.sheetWeekly);

} catch (e) { log(`GoogleSheets weekly: ${e.message}`); }



try {

    gsCalls = new GoogleSheetsClient('credentials.json', config.googleSheetId, config.sheetCalls);

} catch (e) { log(`GoogleSheets calls: ${e.message}`); }



try {

    gsStaff = new GoogleSheetsClient('credentials.json', config.googleSheetId, config.sheetStaff);

} catch (e) { log(`GoogleSheets staff: ${e.message}`); }



// ==================== SEND LOG HELPERS ====================

async function sendLog(embed) {

    const channel = client.channels.cache.get(config.logChannelId);

    if (!channel) return Promise.reject(new Error('log channel not found'));

    try { await channel.send({ embeds: [embed] }); } catch (e) { log(`sendLog error: ${e.message}`); }

}



async function sendGameLog(embed) {

    const channel = client.channels.cache.get(config.gameLogChannelId || config.logChannelId);

    if (!channel) return Promise.reject(new Error('game log channel not found'));

    try { await channel.send({ embeds: [embed] }); } catch (e) { log(`sendGameLog error: ${e.message}`); }

}



// ==================== AUTO MOD HELPERS ====================

async function warnAndTimeout(message, userMsg, logReason, tag) {

    try { await message.delete(); } catch (e) { /* ignore */ }

    const userId = message.author.id;

    warningsTracker[userId] = (warningsTracker[userId] || 0) + 1;

    const count = warningsTracker[userId];

    try {

        await message.channel.send({

            embeds: [makeEmbed({

                title: 'Предупреждение',

                description: `${message.author}, ${userMsg}\nПредупреждение: **${count}/2**`,

                color: 0xffa500,

            })],

        });

    } catch (e) { /* ignore */ }

    log(`${tag}: ${message.author.tag} warning ${count}/2`);

    if (count >= 2) {

        try {

            await message.member.timeout(10 * 60 * 1000, logReason);

            await message.channel.send({

                embeds: [makeEmbed({

                    title: 'Тайм-аут выдан',

                    description: `${message.author} замьючен на 10 минут\nПричина: ${logReason}`,

                    color: 0xff0000,

                })],

            });

            await sendLog(new EmbedBuilder()

                .setTitle('AUTO TIMEOUT').setColor(0xff0000).setTimestamp()

                .addFields({ name: 'Пользователь', value: `${message.author.tag} (${message.author.id})` })

                .addFields({ name: 'Причина', value: logReason })

            );

            warningsTracker[userId] = 0;

            // Сброс всех трекеров чтобы не спамил предупреждениями после размена

            floodTracker[userId] = [];

            spamTracker[userId] = [];

            commandSpamTracker[userId] = [];

        } catch (e) { log(`Timeout error: ${e.message}`); }

    }

}



async function checkNickname(member) {

    if (!member) return;

    const nick = (member.nickname || member.user.username || '').toLowerCase();

    if (!nick) return;

    for (const pattern of BAD_NICK_PATTERNS) {

        if (pattern.test(nick)) {

            try {

                await member.setNickname('Участник', 'Оскорбительный ник-нейм (правило 4.1)');

                await sendLog(new EmbedBuilder()

                    .setTitle('NICKNAME RESET').setColor(0xffa500).setTimestamp()

                    .addFields({ name: 'Пользователь', value: `${member.user.tag} (${member.id})` })

                    .addFields({ name: 'Причина', value: 'Оскорбительный ник-нейм (правило 4.1)' })

                );

                log(`Nickname reset ${member.user.tag} - rule 4.1`);

            } catch (e) { log(`Nickname reset error: ${e.message}`); }

            return;

        }

    }

    for (const pattern of NATIONAL_PATTERNS) {

        if (pattern.test(nick)) {

            try {

                await member.setNickname('Участник', 'Националистический ник-нейм (правило 4.2)');

                await sendLog(new EmbedBuilder()

                    .setTitle('NICKNAME RESET').setColor(0xffa500).setTimestamp()

                    .addFields({ name: 'Пользователь', value: `${member.user.tag} (${member.id})` })

                    .addFields({ name: 'Причина', value: 'Националистический ник-нейм (правило 4.2)' })

                );

                log(`Nickname reset ${member.user.tag} - rule 4.2`);

            } catch (e) { log(`Nickname reset error: ${e.message}`); }

            return;

        }

    }

}



// ==================== SERIALIZE OVERWRITES ====================

function serializeOverwrites(channel) {

    const result = [];

    try {

        for (const [target, overwrite] of channel.permissionOverwrites.cache) {

            result.push({

                id: target,

                type: 'role',

                allow: BigInt(overwrite.allow?.bitfield ?? 0).toString(),

                deny: BigInt(overwrite.deny?.bitfield ?? 0).toString(),

            });

        }

    } catch (e) { log(`serializeOverwrites error: ${e.message}`); }

    return result;

}



async function applyChannelOverwrites(channel, overwritesData, guild, roleMap) {

    if (!overwritesData || overwritesData.length === 0) return;

    for (const ow of overwritesData) {

        const oldId = ow.id;

        let allow, deny;

        try {

            allow = BigInt(ow.allow || 0);

            deny = BigInt(ow.deny || 0);

        } catch (e) {

            log(`applyChannelOverwrites BigInt error for ${oldId}: ${e.message}`);

            continue;

        }

        try {

            const newId = roleMap[oldId] || oldId;

            const target = guild.roles.cache.get(newId);

            if (target) {

                await channel.permissionOverwrites.create(target, { allow, deny }, { reason: 'Backup load' });

            } else {

                const everyone = guild.roles.everyone;

                if (oldId === everyone.id || newId === everyone.id) {

                    await channel.permissionOverwrites.create(everyone, { allow, deny }, { reason: 'Backup load' });

                }

            }

        } catch (e) {

            log(`Error setting permissions for ${channel.name} (target ${oldId}): ${e.message}`);

        }

    }

}



async function performBackupLoad(guild, backup) {

    // Safety check: verify guild still exists

    if (!guild || !guild.available) {

        log('performBackupLoad: guild not available');

        return { roles_created: 0, channels_created: 0, role_map: {}, channel_map: {} };

    }



    const roleMap = {};

    const channelMap = {};



    // Delete non-category channels

    for (const ch of guild.channels.cache.values()) {

        if (ch.type === 4) continue; // category

        try { await ch.delete('Backup load'); log(`Deleted channel: ${ch.name}`); await sleep(300); } catch (e) { log(`Delete error: ${e.message}`); }

    }

    // Delete categories

    for (const cat of guild.channels.cache.filter(c => c.type === 4).values()) {

        try { await cat.delete('Backup load'); log(`Deleted category: ${cat.name}`); await sleep(300); } catch (e) { log(`Delete error: ${e.message}`); }

    }

    // Delete roles (skip system roles)

    for (const role of guild.roles.cache.sort((a, b) => b.position - a.position).values()) {

        if (role.id === guild.id) continue;

        if (role.managed) continue;

        if (role.name === '@everyone') continue;

        try { await role.delete('Backup load'); log(`Deleted role: ${role.name}`); await sleep(300); } catch (e) { log(`Delete role error: ${e.message}`); }

    }

    // Create roles

    const rolesData = (backup.roles || []).sort((a, b) => (a.position || 0) - (b.position || 0));

    for (const rd of rolesData) {

        try {

            const role = await guild.roles.create({

                name: rd.name,

                color: rd.color || 0,

                hoist: rd.hoist || false,

                mentionable: rd.mentionable || false,

                permissions: BigInt(rd.permissions || 0),

                reason: 'Backup load',

            });

            roleMap[rd.id] = role.id;

            log(`Created role: ${role.name} (${rd.id} -> ${role.id})`);

            await sleep(500);

        } catch (e) { log(`Create role error: ${e.message}`); }

    }

    // Create categories and channels

    for (const cd of backup.categories || []) {

        try {

            const cat = await guild.channels.create({

                name: cd.name,

                type: 4, // category

                reason: 'Backup load',

            });

            channelMap[cd.id] = cat.id;

            log(`Created category: ${cat.name} (${cd.id} -> ${cat.id})`);

            await sleep(500);

            for (const chd of cd.channels || []) {

                try {

                    const chType = chd.type || 'text';

                    let newCh;

                    if (chType.includes('voice')) {

                        newCh = await guild.channels.create({

                            name: chd.name,

                            type: 2, // voice

                            parent: cat.id,

                            userLimit: chd.user_limit || 0,

                            bitrate: chd.bitrate || 64000,

                            reason: 'Backup load',

                        });

                    } else {

                        newCh = await guild.channels.create({

                            name: chd.name,

                            type: 0, // text

                            parent: cat.id,

                            topic: chd.topic || null,

                            nsfw: chd.nsfw || false,

                            rateLimitPerUser: chd.slowmode_delay || 0,

                            reason: 'Backup load',

                        });

                    }

                    channelMap[chd.id] = newCh.id;

                    log(`Created channel: ${newCh.name} (${chd.id} -> ${newCh.id})`);

                    await sleep(500);

                } catch (e) { log(`Create channel error: ${e.message}`); }

            }

        } catch (e) { log(`Create category error: ${e.message}`); }

    }

    // Create standalone text channels

    for (const chd of backup.text_channels || []) {

        try {

            const newCh = await guild.channels.create({

                name: chd.name,

                type: 0,

                topic: chd.topic || null,

                nsfw: chd.nsfw || false,

                rateLimitPerUser: chd.slowmode_delay || 0,

                reason: 'Backup load',

            });

            channelMap[chd.id] = newCh.id;

            log(`Created text channel: ${newCh.name} (${chd.id} -> ${newCh.id})`);

            await sleep(500);

        } catch (e) { log(`Create text channel error: ${e.message}`); }

    }

    // Create standalone voice channels

    for (const chd of backup.voice_channels || []) {

        try {

            const newCh = await guild.channels.create({

                name: chd.name,

                type: 2,

                userLimit: chd.user_limit || 0,

                bitrate: chd.bitrate || 64000,

                reason: 'Backup load',

            });

            channelMap[chd.id] = newCh.id;

            log(`Created voice channel: ${newCh.name} (${chd.id} -> ${newCh.id})`);

            await sleep(500);

        } catch (e) { log(`Create voice channel error: ${e.message}`); }

    }

    // Apply overwrites

    for (const cd of backup.categories || []) {

        const newCatId = channelMap[cd.id];

        if (!newCatId) continue;

        const catObj = guild.channels.cache.get(newCatId);

        if (catObj) await applyChannelOverwrites(catObj, cd.overwrites || [], guild, roleMap);

    }

    for (const cd of backup.categories || []) {

        for (const chd of cd.channels || []) {

            const newChId = channelMap[chd.id];

            if (!newChId) continue;

            const chObj = guild.channels.cache.get(newChId);

            if (chObj) await applyChannelOverwrites(chObj, chd.overwrites || [], guild, roleMap);

        }

    }

    for (const chd of backup.text_channels || []) {

        const newChId = channelMap[chd.id];

        if (!newChId) continue;

        const chObj = guild.channels.cache.get(newChId);

        if (chObj) await applyChannelOverwrites(chObj, chd.overwrites || [], guild, roleMap);

    }

    for (const chd of backup.voice_channels || []) {

        const newChId = channelMap[chd.id];

        if (!newChId) continue;

        const chObj = guild.channels.cache.get(newChId);

        if (chObj) await applyChannelOverwrites(chObj, chd.overwrites || [], guild, roleMap);

    }

    // Remap IDs

    const combinedMap = {};

    for (const [k, v] of Object.entries(roleMap)) combinedMap[k] = v;

    for (const [k, v] of Object.entries(channelMap)) combinedMap[k] = v;

    applyIdReplacement(combinedMap);



    return { roles_created: Object.keys(roleMap).length, channels_created: Object.keys(channelMap).length, role_map: roleMap, channel_map: channelMap };

}



function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}



// ==================== ACHIEVEMENTS TEXT ====================

const ACHIEVEMENTS_TEXT = `

**ЕЖЕДНЕВНЫЕ ДОСТИЖЕНИЯ:**



**Общие:**

• Принять 5 человек во фракцию — +5 баллов

• Провести стрелу — +5 баллов



**Крайм:**

• Перехватить 3 поставки — +5 баллов



**FIB:**

• Довести 3 поставки — +5 баллов



---



**ЕЖЕНЕДЕЛЬНЫЕ ДОСТИЖЕНИЯ:**



**Общие:**

• Провести 3 МП между фракциями — +10 баллов

• Активность фракции 7 дней подряд — +10 баллов

• Набрать 20+ новых игроков в фракцию — +10 баллов

• Выиграть 3 МП между фракциями — +10 баллов



**Крайм:**

• Перехватить 10 поставок — +10 баллов



**FIB:**

• Довести 10 поставок — +10 баллов

`;



// ==================== COMMAND DEFINITIONS ====================

const commands = [

    new SlashCommandBuilder().setName('menu').setDescription('Меню отчётов с кнопками'),

    new SlashCommandBuilder().setName('mod_menu').setDescription('Меню модерации с кнопками'),

    new SlashCommandBuilder().setName('settings').setDescription('Настройки бота'),

    new SlashCommandBuilder().setName('help').setDescription('Список всех команд и гайд'),

    new SlashCommandBuilder().setName('request_to_department').setDescription('Заявка в отдел'),

    new SlashCommandBuilder().setName('unban_all').setDescription('Разбанить всех пользователей'),

    new SlashCommandBuilder().setName('game').setDescription('Меню игровых действий'),

    new SlashCommandBuilder().setName('check_stats').setDescription('Статистика администраторов (всё время)'),

    new SlashCommandBuilder().setName('check_stats_day').setDescription('Статистика за сегодня'),

    new SlashCommandBuilder().setName('check_stats_weekly').setDescription('Статистика за неделю'),

    new SlashCommandBuilder().setName('top_stats').setDescription('Топ администраторов по наказаниям'),

    new SlashCommandBuilder().setName('online').setDescription('Сколько игроков онлайн'),

    new SlashCommandBuilder().setName('check_static').setDescription('Проверка игрока по Static ID').addStringOption(o => o.setName('static').setDescription('Static ID').setRequired(true)),

    new SlashCommandBuilder().setName('server_stats').setDescription('Общая статистика сервера'),

    new SlashCommandBuilder().setName('admin_log').setDescription('Последние действия админов'),

    new SlashCommandBuilder().setName('ban').setDescription('Забанить пользователя').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Причина').setRequired(true)),

    new SlashCommandBuilder().setName('temp_ban').setDescription('Забанить на время').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('time').setDescription('Время (d/h/m)').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Причина').setRequired(true)),

    new SlashCommandBuilder().setName('unban').setDescription('Разбанить пользователя').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Причина').setRequired(true)),

    new SlashCommandBuilder().setName('timeout').setDescription('Тайм-аут пользователя').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('time').setDescription('Время (d/h/m)').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Причина').setRequired(true)),

    new SlashCommandBuilder().setName('untimeout').setDescription('Снять тайм-аут').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Причина').setRequired(true)),

    new SlashCommandBuilder().setName('untimeout_all').setDescription('Снять тайм-аут со всех'),

    new SlashCommandBuilder().setName('mute').setDescription('Выдать мьют роль').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('time').setDescription('Время (d/h/m)').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Причина').setRequired(true)),

    new SlashCommandBuilder().setName('unmute').setDescription('Снять мьют роль').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Причина').setRequired(true)),

    new SlashCommandBuilder().setName('move').setDescription('Переместить пользователя').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('channel').setDescription('ID канала').setRequired(true)),

    new SlashCommandBuilder().setName('move_all').setDescription('Переместить всех в свой войс'),

    new SlashCommandBuilder().setName('clear').setDescription('Очистить сообщения').addIntegerOption(o => o.setName('how').setDescription('Сколько удалить').setRequired(true).setMinValue(1).setMaxValue(200)),

    new SlashCommandBuilder().setName('role').setDescription('Выдать роль').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('role').setDescription('Название роли').setRequired(true)),

    new SlashCommandBuilder().setName('unrole').setDescription('Снять роль').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('role').setDescription('Название роли').setRequired(true)),

    new SlashCommandBuilder().setName('temp_role').setDescription('Роль на время').addStringOption(o => o.setName('member').setDescription('ID пользователя').setRequired(true)).addStringOption(o => o.setName('role').setDescription('Название роли').setRequired(true)).addStringOption(o => o.setName('time').setDescription('Время (d/h/m)').setRequired(true)),

    new SlashCommandBuilder().setName('role_all').setDescription('Выдать роль всем').addStringOption(o => o.setName('role').setDescription('Название роли').setRequired(true)),

    new SlashCommandBuilder().setName('timeouts_list').setDescription('Список тайм-аутов'),

    new SlashCommandBuilder().setName('ban_list').setDescription('Список банов'),

    new SlashCommandBuilder().setName('mute_list').setDescription('Список мьютов'),

    new SlashCommandBuilder().setName('member_info').setDescription('Информация об участнике').addStringOption(o => o.setName('member').setDescription('ID участника').setRequired(true)),

    new SlashCommandBuilder().setName('serverinfo').setDescription('Информация о сервере'),

    new SlashCommandBuilder().setName('role_members').setDescription('Участники с ролью').addStringOption(o => o.setName('role').setDescription('Название роли').setRequired(true)),

    new SlashCommandBuilder().setName('role_info').setDescription('Информация о роли').addStringOption(o => o.setName('role').setDescription('Название роли').setRequired(true)),

    new SlashCommandBuilder().setName('channel_info').setDescription('Информация о канале').addStringOption(o => o.setName('channel').setDescription('ID канала').setRequired(true)),

    new SlashCommandBuilder().setName('send_dm').setDescription('Отправить ЛС').addStringOption(o => o.setName('member').setDescription('ID участника').setRequired(true)).addStringOption(o => o.setName('text').setDescription('Текст').setRequired(true)),

    new SlashCommandBuilder().setName('slowmode').setDescription('Медленный режим').addStringOption(o => o.setName('channel').setDescription('ID канала').setRequired(true)).addIntegerOption(o => o.setName('second').setDescription('Секунды (0-120)').setRequired(true)),

    new SlashCommandBuilder().setName('backup_save').setDescription('Сохранить бэкап сервера'),

    new SlashCommandBuilder().setName('backup_load').setDescription('Загрузить бэкап').addStringOption(o => o.setName('filename').setDescription('Имя файла').setRequired(true)),

    new SlashCommandBuilder().setName('backup_info').setDescription('Список бэкапов'),

    new SlashCommandBuilder().setName('teh').setDescription('Сообщение о техработах'),

    new SlashCommandBuilder().setName('vkl').setDescription('Сообщение о включении бота'),

    new SlashCommandBuilder().setName('give_points').setDescription('Выдать баллы фракции').addStringOption(o => o.setName('fraction').setDescription('Название фракции').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Причина').setRequired(true)).addIntegerOption(o => o.setName('points').setDescription('Количество баллов').setRequired(true)),

    new SlashCommandBuilder().setName('console').setDescription('Мини-консоль для игровых команд'),

].map(c => c.toJSON());



// ==================== REGISTER COMMANDS (after ready) ====================

const rest = new REST({ version: '10' }).setToken(config.token);



// ==================== EVENT: READY ====================

client.once('clientReady', async () => {

    log(`Bot ${client.user.tag} started!`);

    const guild = client.guilds.cache.get(config.guildId);

    if (!guild) return;



    // Register slash commands

    try {

        log('Registering slash commands...');

        await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), { body: commands });

        log('Slash commands registered!');

    } catch (e) {

        log(`Error registering commands: ${e.message}`);

    }



    // Send changelog

    try {

        const updateChannel = client.channels.cache.get(config.updateChannelId);

        if (updateChannel) {

            const changelogPath = path.join(__dirname, 'CHANGELOG.txt');

            if (fs.existsSync(changelogPath)) {

                const content = fs.readFileSync(changelogPath, 'utf-8').trim();

                if (content) {

                    await updateChannel.send({

                        embeds: [makeEmbed({ title: 'Обновление бота', description: content, color: 0x00ff00 })]

                    });

                    fs.writeFileSync(changelogPath, '', 'utf-8');

                }

            }

        }

    } catch (e) { log(`Changelog error: ${e.message}`); }



    // Send helper button

    try {

        const helperChannel = client.channels.cache.get(config.helperChannelId);

        if (helperChannel) {

            let hasButton = false;

            const msgs = await helperChannel.messages.fetch({ limit: 10 });

            for (const msg of msgs.values()) {

                if (msg.author.id === client.user.id && msg.components.length > 0) { hasButton = true; break; }

            }

            if (!hasButton) {

                await helperChannel.send({

                    embeds: [makeEmbed({ title: 'Заявки на пост хелпера', description: 'Оставь заявку и стань частью нашей команды', color: 0xffa500 })],

                    files: [{ attachment: path.join(__dirname, 'assets', 'helper.png'), name: 'helper.png' }],

                    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('helper_apply').setLabel('Подать заявку на Helper').setStyle(ButtonStyle.Success))],

                });

            }

        }

    } catch (e) { log(`Helper button error: ${e.message}`); }



    // Send media button

    try {

        const mediaChannel = client.channels.cache.get(config.mediaChannelId);

        if (mediaChannel) {

            let hasButton = false;

            const msgs = await mediaChannel.messages.fetch({ limit: 10 });

            for (const msg of msgs.values()) {

                if (msg.author.id === client.user.id && msg.components.length > 0) { hasButton = true; break; }

            }

            if (!hasButton) {

                await mediaChannel.send({

                    embeds: [makeEmbed({ title: 'Заявки на пост медиа партнёра', description: 'Оставь заявку и стань частью нашей команды', color: 0x800080 })],

                    files: [{ attachment: path.join(__dirname, 'assets', 'media.png'), name: 'media.png' }],

                    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('media_apply').setLabel('Media запрос').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('media_report').setLabel('Media отчет').setStyle(ButtonStyle.Danger))],

                });

            }

        }

    } catch (e) { log(`Media button error: ${e.message}`); }



    // Send media requests button

    try {

        const mediaReqChannel = client.channels.cache.get(config.mediaRequestsChannelId);

        if (mediaReqChannel) {

            let hasButton = false;

            const msgs = await mediaReqChannel.messages.fetch({ limit: 10 });

            for (const msg of msgs.values()) {

                if (msg.author.id === client.user.id && msg.components.length > 0) { hasButton = true; break; }

            }

            if (!hasButton) {

                await mediaReqChannel.send({

                    embeds: [makeEmbed({ title: 'Media запросы и отчеты', description: 'Выберите действие:', color: 0x0000ff })],

                    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('media_request_form').setLabel('Media запрос').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('media_report_form').setLabel('Media отчет').setStyle(ButtonStyle.Danger))],

                });

            }

        }

    } catch (e) { log(`Media requests button error: ${e.message}`); }



    // Send leader button

    try {

        const leaderChannel = client.channels.cache.get(config.leaderChannelId);

        if (leaderChannel) {

            let hasButton = false;

            const msgs = await leaderChannel.messages.fetch({ limit: 10 });

            for (const msg of msgs.values()) {

                if (msg.author.id === client.user.id && msg.components.length > 0) { hasButton = true; break; }

            }

            if (!hasButton) {

                await leaderChannel.send({

                    embeds: [makeEmbed({ title: 'Заявки на пост лидера фракций', description: 'Оставь заявку и стань частью нашей команды', color: 0x0000ff })],

                    files: [{ attachment: path.join(__dirname, 'assets', 'leader.png'), name: 'leader.png' }],

                    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('leader_apply').setLabel('Подать заявку на Лидерку').setStyle(ButtonStyle.Primary))],

                });

            }

        }

    } catch (e) { log(`Leader button error: ${e.message}`); }



    // Send achievements

    try {

        const achChannel = client.channels.cache.get(config.achievementChannelId);

        if (achChannel) {

            let hasAchievements = false;

            const msgs = await achChannel.messages.fetch({ limit: 20 });

            for (const msg of msgs.values()) {

                if (msg.author.id === client.user.id && msg.embeds.length > 0) {

                    for (const embed of msg.embeds) {

                        if (embed.title && embed.title.includes('СПИСОК ДОСТИЖЕНИЙ')) { hasAchievements = true; break; }

                    }

                }

                if (hasAchievements) break;

            }

            if (!hasAchievements) {

                await achChannel.send({

                    embeds: [makeEmbed({ title: 'СПИСОК ДОСТИЖЕНИЙ ДЛЯ ЛИДЕРОВ ФРАКЦИЙ', description: ACHIEVEMENTS_TEXT, color: 0xffd700 })]

                });

            }

            let hasButton = false;

            const msgs2 = await achChannel.messages.fetch({ limit: 10 });

            for (const msg of msgs2.values()) {

                if (msg.author.id === client.user.id && msg.components.length > 0) { hasButton = true; break; }

            }

            if (!hasButton) {

                await achChannel.send({

                    embeds: [makeEmbed({ title: 'Достижения фракций', description: 'Нажмите кнопку чтобы подать достижение', color: 0xffd700 })],

                    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('achievement_apply').setLabel('Подать достижение').setStyle(ButtonStyle.Primary))],

                });

            }

        }

    } catch (e) { log(`Achievement button error: ${e.message}`); }



    // Send vacation button

    try {

        const vacChannel = client.channels.cache.get(config.vacationChannelId);

        if (vacChannel) {

            let hasButton = false;

            const msgs = await vacChannel.messages.fetch({ limit: 10 });

            for (const msg of msgs.values()) {

                if (msg.author.id === client.user.id && msg.components.length > 0) { hasButton = true; break; }

            }

            if (!hasButton) {

                await vacChannel.send({

                    embeds: [makeEmbed({ title: 'Отпуск', description: 'Нажмите кнопку чтобы подать заявку на отпуск', color: 0x0000ff })],

                    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('vacation_apply').setLabel('Подать заявку на отпуск').setStyle(ButtonStyle.Primary))],

                });

            }

        }

    } catch (e) { log(`Vacation button error: ${e.message}`); }



    // Start presence updater

    if (!presenceTask) presenceTask = updatePresence();

    // Start scheduler

    if (!scheduleTask) scheduleTask = scheduleLoop();

    log('Bot ready!');

});



// ==================== GLOBAL ERROR HANDLER ====================

// 'error' события клиента (сеть, WebSocket, REST) не должны ронять процесс.

client.on('error', (err) => {

    log(`Discord client error: ${err?.message || err}`);

});



process.on('unhandledRejection', (reason, promise) => {

    if (reason && typeof reason === 'object' && (reason.code === 10062 || reason.rawError?.code === 10062)) {

        log('Ignored expired interaction (10062)');

    } else if (reason && typeof reason === 'object' && reason.code === 50035) {

        log('Ignored unknown interaction (50035)');

    } else {

        log(`Unhandled rejection: ${reason?.message || reason}`);

    }

});



// ==================== DISCORD RATE LIMIT HANDLER ====================

let lastApiCall = 0;

const API_CALL_MIN_INTERVAL = 100; // 100ms minimum between API calls

async function safeApiCall(fn) {

    const now = Date.now();

    const wait = Math.max(0, API_CALL_MIN_INTERVAL - (now - lastApiCall));

    if (wait > 0) await sleep(wait);

    lastApiCall = Date.now();

    try { return await fn(); } catch (e) {

        if (e.code === 429 || e.rateLimit) {

            const retryAfter = Math.min((e.retryAfter || 1000), 10000);

            log(`Discord rate limited. Waiting ${retryAfter}ms...`);

            await sleep(retryAfter);

            return await fn();

        }

        throw e;

    }

}



// ==================== PRESENCE UPDATER ====================

async function updatePresence() {

    while (true) {

        try {

            if (!client || !client.user || !client.user.id) {

                await sleep(10000);

                continue;

            }

            const guild = client.guilds.cache.get(config.guildId);

            if (guild) {

                const online = guild.members.cache.filter(m => !m.user.bot && m.presence && m.presence.status !== 'offline').size;

                client.user.setPresence({

                    activities: [{ name: `Онлайн: ${online} в Discord`, type: 3 }],

                    status: 'online',

                });

            }

            await sleep(60000);

        } catch (e) {

            if (e.message.includes('connection')) break;

            log(`Presence error: ${e.message}`);

            await sleep(60000);

        }

    }

}



// ==================== SCHEDULER ====================

async function scheduleLoop() {

    let lastDailyKey = '';

    let lastWeeklyKey = '';

    while (true) {

        try {

            const now = new Date();

            const msk = new Date(now.getTime() + 3 * 60 * 60 * 1000); // UTC+3

            const timeKey = `${String(msk.getHours()).padStart(2, '0')}:${String(msk.getMinutes()).padStart(2, '0')}`;

            const dateStr = msk.toISOString().slice(0, 10);

            const weekKey = `${dateStr}_w${msk.getDay()}`;

            

            // Post daily stats at 23:58 MSK

            if (timeKey === '23:58' && lastDailyKey !== dateStr) {

                lastDailyKey = dateStr;

                await postDailyStats();

            }

            // Post weekly stats at 23:58 MSK on Sunday (day 0)

            if (timeKey === '23:58' && msk.getDay() === 0 && lastWeeklyKey !== weekKey) {

                lastWeeklyKey = weekKey;

                await postWeeklyStats();

            }

        } catch (e) { log(`Scheduler error: ${e.message}`); }

        await sleep(30000); // Check every 30 seconds

    }

}



async function postDailyStats() {

    const ch = client.channels.cache.get(config.channelId);

    if (!ch) return;

    const stats = loadStats();

    if (Object.keys(stats).length === 0) {

        await ch.send({ embeds: [makeEmbed({ title: 'Статистика администраторов за сегодня', description: 'Нет данных', color: 0x00ff00 })] });

        return;

    }

    let totalBans = 0, totalMutes = 0, totalReports = 0;

    for (const s of Object.values(stats)) {

        totalBans += s.bans || 0;

        totalMutes += s.mutes || 0;

        totalReports += s.reports_closed || 0;

    }

    await ch.send({

        embeds: [new EmbedBuilder()

            .setTitle('Статистика за сегодня').setColor(0x00ff00).setTimestamp()

            .addFields({ name: 'Статистика', value: `Баны: ${totalBans} | Муты: ${totalMutes} | Репорты: ${totalReports}` })

        ]

    });

    log('Auto-post daily stats');

}



async function postWeeklyStats() {

    const ch = client.channels.cache.get(config.channelId);

    if (!ch) return;

    const stats = loadStats();

    if (Object.keys(stats).length === 0) {

        await ch.send({ embeds: [makeEmbed({ title: 'Статистика администраторов за неделю', description: 'Нет данных', color: 0x0000ff })] });

        return;

    }

    let totalBans = 0, totalMutes = 0, totalReports = 0;

    for (const s of Object.values(stats)) {

        totalBans += s.bans || 0;

        totalMutes += s.mutes || 0;

        totalReports += s.reports_closed || 0;

    }

    await ch.send({

        embeds: [new EmbedBuilder()

            .setTitle('Статистика за неделю').setColor(0x0000ff).setTimestamp()

            .addFields({ name: 'Статистика', value: `Баны: ${totalBans} | Муты: ${totalMutes} | Репорты: ${totalReports}` })

        ]

    });

    log('Auto-post weekly stats');

}



// ==================== EVENT: GUILD_MEMBER_ADD ====================

client.on('guildMemberAdd', async (member) => {

    // Forbidden bot detection

    if (member.user.bot) {

        const botName = (member.user.username || '').toLowerCase();

        const botGlobal = (member.user.globalName || '').toLowerCase();

        const botDisc = member.user.discriminator || '0';

        const forbiddenName = 'κεραυνός';

        const forbiddenDisc = '8883';

        const isForbidden = (botName.includes(forbiddenName) || botGlobal.includes(forbiddenName)) && (botDisc === forbiddenDisc || String(member.user).includes(forbiddenDisc));

        if (isForbidden) {

            log(`Forbidden bot detected: ${member.user.tag} (${member.id})`);

            let adder = null;

            try {

                const entries = await member.guild.fetchAuditLogs({ type: 28, limit: 10 }); // BOT_ADD

                const entry = entries.entries.find(e => e.target.id === member.id);

                if (entry) adder = entry.executor;

            } catch (e) { log(`Audit log error: ${e.message}`); }

            if (adder && adder.id !== member.guild.ownerId) {

                try { await member.guild.members.ban(adder, { reason: 'Добавление запрещённого бота (Κεραυνός #8883)', deleteMessageSeconds: 86400 }); log(`Banned ${adder.tag} for adding forbidden bot`); } catch (e) { log(`Ban error: ${e.message}`); }

            }

            try { await member.kick('Запрещённый бот (Κεραυνός #8883)'); log(`Kicked forbidden bot: ${member.user.tag}`); } catch (e) { log(`Kick error: ${e.message}`); }

            const embed = new EmbedBuilder().setTitle('FORBIDDEN BOT BLOCKED').setColor(0xff0000).setTimestamp().addFields({ name: 'Бот', value: `${member.user.tag} (${member.id})` });

            embed.addFields({ name: 'Кто добавил', value: adder ? `${adder.tag} (${adder.id})` : 'Не определено' });

            embed.addFields({ name: 'Действие', value: adder ? 'Пользователь забанен, бот удалён' : 'Бот удалён' });

            await sendLog(embed);

            return;

        }

    }

    // Auto role

    const role = member.guild.roles.cache.get(settings.auto_role_id || '1532464933361684702');

    if (role) {

        try { await member.roles.add(role, 'Auto role on join'); log(`Auto role ${role.name} for ${member.user.tag}`); } catch (e) { log(`Auto role error: ${e.message}`); }

    }

    // Nickname check

    await checkNickname(member);

    // Log

    await sendLog(new EmbedBuilder()

        .setTitle('MEMBER JOIN').setColor(0x00ff00).setTimestamp()

        .addFields({ name: 'Пользователь', value: `${member.user.tag} (${member.id})` })

        .addFields({ name: 'Аккаунт создан', value: member.user.createdAt.toLocaleString('ru-RU') })

    );

});



// ==================== EVENT: GUILD_MEMBER_REMOVE ====================

client.on('guildMemberRemove', async (member) => {

    const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ');

    await sendLog(new EmbedBuilder()

        .setTitle('MEMBER LEAVE').setColor(0xff0000).setTimestamp()

        .addFields({ name: 'Пользователь', value: `${member.user.tag} (${member.id})` })

        .addFields({ name: 'Роли', value: roles || 'Нет', inline: false })

    );

});



// ==================== EVENT: MESSAGE DELETE ====================

client.on('messageDelete', async (message) => {

    if (message.author?.bot) return;

    const embed = new EmbedBuilder().setTitle('MESSAGE DELETE').setColor(0xffa500).setTimestamp()

        .addFields({ name: 'Автор', value: `${message.author?.tag || 'N/A'} (${message.author?.id || 'N/A'})`, inline: true })

        .addFields({ name: 'Канал', value: `<#${message.channelId}>`, inline: true });

    if (message.content) embed.addFields({ name: 'Сообщение', value: message.content.slice(0, 2000), inline: false });

    if (message.attachments?.size > 0) {

        const files = message.attachments.map(a => a.url).join('\n');

        embed.addFields({ name: 'Вложения', value: files.slice(0, 1000), inline: false });

    }

    await sendLog(embed);

});



// ==================== EVENT: MESSAGE UPDATE ====================

client.on('messageUpdate', async (before, after) => {

    if (before.author?.bot) return;

    if (before.content === after.content) return;

    const embed = new EmbedBuilder().setTitle('MESSAGE EDIT').setColor(0x0000ff).setTimestamp()

        .addFields({ name: 'Автор', value: `${before.author?.tag || 'N/A'} (${before.author?.id || 'N/A'})`, inline: true })

        .addFields({ name: 'Канал', value: `<#${before.channelId}>`, inline: true });

    if (before.content) embed.addFields({ name: 'Было', value: before.content.slice(0, 500), inline: false });

    if (after.content) embed.addFields({ name: 'Стало', value: after.content.slice(0, 500), inline: false });

    await sendLog(embed);

});



// ==================== EVENT: GUILD_MEMBER_UPDATE ====================

client.on('guildMemberUpdate', async (before, after) => {

    if (before.nickname !== after.nickname) await checkNickname(after);

    if (before.roles.cache.size === after.roles.cache.size && before.roles.cache.every((r, k) => after.roles.cache.has(k))) return;

    const added = after.roles.cache.filter(r => !before.roles.cache.has(r.id));

    const removed = before.roles.cache.filter(r => !after.roles.cache.has(r.id));

    const embed = new EmbedBuilder().setTitle('MEMBER UPDATE').setColor(0xffd700).setTimestamp()

        .addFields({ name: 'Пользователь', value: `${before.user?.tag || 'N/A'} (${before.id})`, inline: true });

    if (added.size > 0) embed.addFields({ name: 'Роли добавлены', value: added.map(r => r.name).join(', '), inline: false });

    if (removed.size > 0) embed.addFields({ name: 'Роли сняты', value: removed.map(r => r.name).join(', '), inline: false });

    await sendLog(embed);

});



// ==================== EVENT: CHANNEL CREATE/DELETE ====================

client.on('channelCreate', async (channel) => {

    await sendLog(new EmbedBuilder().setTitle('CHANNEL CREATE').setColor(0x00ff00).setTimestamp().addFields({ name: 'Канал', value: `${channel.name} (${channel.id})` }));

});



client.on('channelDelete', async (channel) => {

    await sendLog(new EmbedBuilder().setTitle('CHANNEL DELETE').setColor(0xff0000).setTimestamp().addFields({ name: 'Канал', value: `${channel.name} (${channel.id})` }));

});



client.on('roleCreate', async (role) => {

    await sendLog(new EmbedBuilder().setTitle('ROLE CREATE').setColor(0x00ff00).setTimestamp().addFields({ name: 'Роль', value: `${role.name} (${role.id})` }));

});



client.on('roleDelete', async (role) => {

    await sendLog(new EmbedBuilder().setTitle('ROLE DELETE').setColor(0xff0000).setTimestamp().addFields({ name: 'Роль', value: `${role.name} (${role.id})` }));

});



// ==================== EVENT: MESSAGE CREATE (AUTOMOD) ====================

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    if (!message.guild) return;



    const member = message.member;

    if (!member) return;



    // Automod exempt

    if (member.roles.cache.some(r => config.automodExemptRoles.includes(r.id))) return;



    // Media/Content role exempt — разрешить ссылки и контент для медиа-пользователей

    const isMediaUser = member.roles.cache.some(r => {

        const name = (r.name || '').toLowerCase();

        return name.includes('media') || name.includes('контент') || name.includes('stream') || name.includes('yt') || name.includes('tiktok') || name.includes('twitch');

    });

    if (isMediaUser) return;



    // Spam protection

    if (settings.spam_protection) {

        const userId = message.author.id;

        const now = Date.now() / 1000;

        if (!spamTracker[userId]) spamTracker[userId] = [];

        spamTracker[userId].push(now);

        spamTracker[userId] = spamTracker[userId].filter(t => now - t <= (settings.spam_timeframe || 10));

        if (spamTracker[userId].length > (settings.spam_limit || 5)) {

            try { await message.delete(); } catch (e) { /* ignore */ }

            try {

                await member.timeout(5 * 60 * 1000, 'Спам');

                log(`SPAM: ${message.author.tag} muted for spam`);

                await message.channel.send({ embeds: [makeEmbed({ title: 'Тайм-аут за спам', description: `${message.author} замьючен на 5 минут за спам`, color: 0xff0000 })] });

                await sendLog(new EmbedBuilder().setTitle('AUTO TIMEOUT').setColor(0xff0000).setTimestamp().addFields({ name: 'Пользователь', value: `${message.author.tag} (${message.author.id})` }).addFields({ name: 'Причина', value: 'Спам' }));

            } catch (e) { log(`Spam timeout error: ${e.message}`); }

            spamTracker[userId] = [];

            return;

        }

    }



    const content = message.content || '';

    const contentLower = content.toLowerCase();



    // Command spam protection

    if (content.startsWith('/')) {

        const userId = message.author.id;

        const now = Date.now() / 1000;

        if (!commandSpamTracker[userId]) commandSpamTracker[userId] = [];

        commandSpamTracker[userId].push(now);

        commandSpamTracker[userId] = commandSpamTracker[userId].filter(t => now - t <= 90);

        const exemptCmdSpam = [config.backupAllowedRoleId].filter(Boolean);

        const hasExempt = member.roles.cache.some(r => exemptCmdSpam.includes(r.id));

        if (commandSpamTracker[userId].length > 5 && !hasExempt) {

            try { await message.delete(); } catch (e) { /* ignore */ }

            try {

                const exemptRoleId = settings.auto_role_id || '1532464933361684702';

                const rolesToRemove = member.roles.cache.filter(r => r.id !== exemptRoleId && r.id !== message.guild.id);

                for (const r of rolesToRemove.values()) {

                    try { await member.roles.remove(r, 'Анти-слив флуд команд'); } catch (e) { /* ignore */ }

                }

                await member.timeout(15 * 60 * 1000, 'Анти-слив флуд команд');

                log(`ANTI-LEAK: ${message.author.tag} stripped roles and muted`);

                await sendLog(new EmbedBuilder().setTitle('АНТИ-ВТОР').setColor(0xff0000).setTimestamp().addFields({ name: 'Пользователь', value: `${message.author.tag} (${message.author.id})` }).addFields({ name: 'Причина', value: 'Флуд команд' }));

            } catch (e) { log(`Anti-leak error: ${e.message}`); }

            commandSpamTracker[userId] = [];

            return;

        }

    }



    // URL filter

    if (contentLower.match(URL_PATTERN)) {

        try { await message.delete(); } catch (e) { /* ignore */ }

        const userId = message.author.id;

        warningsTracker[userId] = (warningsTracker[userId] || 0) + 1;

        const count = warningsTracker[userId];

        await message.channel.send({ embeds: [makeEmbed({ title: 'Предупреждение', description: `${message.author}, ссылки запрещены в чате!\nПредупреждение: **${count}/2**`, color: 0xffa500 })] });

        log(`URL: ${message.author.tag} warning ${count}/2`);

        if (count >= 2) {

            try {

                await member.timeout(15 * 60 * 1000, '2 предупреждения за ссылки');

                log(`URL: ${message.author.tag} muted 15m`);

                await message.channel.send({ embeds: [makeEmbed({ title: 'Тайм-аут выдан', description: `${message.author} замьючен на 15 минут за повторное использование ссылок`, color: 0xff0000 })] });

                await sendLog(new EmbedBuilder().setTitle('AUTO TIMEOUT').setColor(0xff0000).setTimestamp().addFields({ name: 'Пользователь', value: `${message.author.tag} (${message.author.id})` }).addFields({ name: 'Причина', value: 'Ссылки (2 предупреждения)' }));

                warningsTracker[userId] = 0;

                floodTracker[userId] = [];

                spamTracker[userId] = [];

            } catch (e) { log(`Timeout error: ${e.message}`); }

        }

        return;

    }



    // Caps Lock

    if (content.length > 5 && !content.includes('```')) {

        const letters = content.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '');

        if (letters.length > 5) {

            const upper = (content.match(/[A-ZА-ЯЁ]/g) || []).length;

            if (upper / letters.length > 0.7) {

                await warnAndTimeout(message, 'использование Caps Lock запрещено (правило 2.4)!', 'Caps Lock', 'CAPS');

                return;

            }

        }

    }



    // Flood detection — считаем одинаковые сообщения за последние 10 секунд

    const floodKey = message.author.id;

    const floodNow = Date.now();

    if (!floodTracker[floodKey]) floodTracker[floodKey] = [];

    floodTracker[floodKey] = floodTracker[floodKey].filter(t => floodNow - t.ts < 10000);

    const dupCount = floodTracker[floodKey].filter(t => t.content === content).length;

    if (dupCount >= 3 && content.length > 10) {

        await warnAndTimeout(message, 'спам/флуд однотипными сообщениями (правило 2.7)!', 'Флуд', 'FLOOD');

        return;

    }

    floodTracker[floodKey].push({ content, ts: floodNow });



    // Mass mat (3+ forbidden words)

    let matCount = 0;

    for (const word of FORBIDDEN_WORDS) {

        if (word && containsWordToken(word, contentLower)) matCount++;

    }

    if (matCount >= 3) {

        await warnAndTimeout(message, 'чрезмерное использование мата (правило 2.8)!', 'Мат (3+ слов)', 'MAT');

        return;

    }



    // Insults

    for (const pattern of INSULT_PATTERNS) {

        if (matchesWordBoundary(pattern, contentLower)) {

            await warnAndTimeout(message, 'оскорбления запрещены (правило 2.1)!', 'Оскорбления', 'INSULT');

            return;

        }

    }



    // Hate speech

    for (const pattern of HATE_PATTERNS) {

        if (matchesWordBoundary(pattern, contentLower)) {

            await warnAndTimeout(message, 'разжигание розни запрещено (правило 2.2)!', 'Разжигание розни', 'HATE');

            return;

        }

    }



    // Emoji spam

    const customEmojis = content.match(/<a?:\w+:\d+>/g) || [];

    if (customEmojis.length > 5) {

        await warnAndTimeout(message, 'слишком много смайликов (правило 2.3)!', 'Спам смайликами', 'EMOJI');

        return;

    }



    // Family insults

    const hasFamily = FAMILY_INSULTS.some(p => matchesWordBoundary(p, contentLower));

    if (hasFamily && (contentLower.includes('хуй') || contentLower.includes('бля') || contentLower.includes('уеб'))) {

        await warnAndTimeout(message, 'оскорбление родственников запрещено (правило 2.6)!', 'Оскорбление родственников', 'FAMILY');

        return;

    }



    // Legacy forbidden words

    for (const word of FORBIDDEN_WORDS) {

        if (containsWordToken(word, contentLower)) {

            try { await message.delete(); } catch (e) { /* ignore */ }

            const userId = message.author.id;

            warningsTracker[userId] = (warningsTracker[userId] || 0) + 1;

            const count = warningsTracker[userId];

            await message.channel.send({ embeds: [makeEmbed({ title: 'Предупреждение', description: `${message.author}, запрещённые слова в чате!\nПредупреждение: **${count}/2**`, color: 0xffa500 })] });

            log(`FORBIDDEN WORD: ${message.author.tag} warning ${count}/2`);

            if (count >= 2) {

                try {

                    await member.timeout(15 * 60 * 1000, '2 предупреждения за запрещённые слова');

                    log(`FORBIDDEN WORD: ${message.author.tag} muted 15m`);

                    await message.channel.send({ embeds: [makeEmbed({ title: 'Тайм-аут выдан', description: `${message.author} замьючен на 15 минут за повторное использование запрещённых слов`, color: 0xff0000 })] });

                    await sendLog(new EmbedBuilder().setTitle('AUTO TIMEOUT').setColor(0xff0000).setTimestamp().addFields({ name: 'Пользователь', value: `${message.author.tag} (${message.author.id})` }).addFields({ name: 'Причина', value: 'Запрещённые слова (2 предупреждения)' }));

                    warningsTracker[userId] = 0;

                    floodTracker[userId] = [];

                    spamTracker[userId] = [];

                } catch (e) { log(`Timeout error: ${e.message}`); }

            }

            break;

        }

    }

});



function isRageOwnedCustomId(customId) {

    const id = String(customId || '');

    return (

        id.startsWith('donate:') ||

        id.startsWith('support:') ||

        id.startsWith('recovery:') ||

        id.startsWith('receipt:')

    );

}



// ==================== INTERACTION: SLASH COMMANDS ====================

client.on('interactionCreate', async (interaction) => {

    // Кнопки/модалки доната, восстановления и чеков обрабатывает RAGE gateway.

    // Нельзя reply — иначе Discord 400 «already been acknowledged».

    try {

        if (

            (interaction.isButton() || interaction.isModalSubmit()) &&

            isRageOwnedCustomId(interaction.customId)

        ) {

            return;

        }

    } catch (_eIgnoreRage) {}



    // ---- MODAL SUBMISSIONS ----

    if (interaction.isModalSubmit()) {

        try {

            await handleModalSubmit(interaction);

        } catch (e) {

            log(`Modal submit error: ${e?.message || e}`);

            const msg = `Ошибка: ${(e && e.message) || 'неизвестная ошибка'}`;

            try {

                if (interaction.deferred || interaction.replied) {

                    await interaction.editReply({ content: msg }).catch(() => { /* ignore */ });

                } else {

                    await interaction.reply({ content: msg, flags: 64 }).catch(() => { /* ignore */ });

                }

            } catch (e2) { /* ignore */ }

        }

        return;

    }



    // ---- BUTTON INTERACTIONS ----

    if (interaction.isButton()) {

        try {

            await handleButtonClick(interaction);

        } catch (e) {

            if (e.code === 10062 || e.rawError?.code === 10062) {

                log('Button interaction expired (10062), ignoring');

            } else {

                log(`Button error: ${e.message}`);

            }

        }

        return;

    }



    // ---- SLASH COMMANDS ----

    if (!interaction.isChatInputCommand()) return;



    const { commandName } = interaction;

    const member = interaction.member;

    const guild = interaction.guild;



    // ==================== UTILITY COMMANDS ====================

    if (commandName === 'menu') {

        if (interaction.channelId !== config.channelId) {

            return interaction.reply({ content: `Только в канале <#${config.channelId}>`, flags: 64 });

        }

        const embed = makeEmbed({ title: 'Меню отчётов', description: 'Выберите действие:', color: 0xffd700 });

        embed.addFields({ name: 'Ежедневный отчёт', value: 'Статистика за день', inline: true });

        embed.addFields({ name: 'Недельный отчёт', value: 'Статистика за неделю', inline: true });

        embed.addFields({ name: 'Обзвон кандидата', value: 'Данные об звонке', inline: true });

        await interaction.reply({ embeds: [embed], components: [createMenuRow()] });

    }



    else if (commandName === 'mod_menu') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const embed = makeEmbed({ title: 'Меню модерации', description: 'Выберите действие:', color: 0xff0000 });

        embed.addFields({ name: 'Ban / Unban', value: 'Бан/разбан пользователя', inline: true });

        embed.addFields({ name: 'Temp Ban', value: 'Бан на время', inline: true });

        embed.addFields({ name: 'Timeout / Untimeout', value: 'Тайм-аут', inline: true });

        embed.addFields({ name: 'Mute / Unmute', value: 'Мьют роль', inline: true });

        embed.addFields({ name: 'Clear', value: 'Очистка чата', inline: true });

        embed.addFields({ name: 'Move', value: 'Перемещение в войс', inline: true });

        embed.addFields({ name: 'Role / Unrole', value: 'Выдать/снять роль', inline: true });

        embed.addFields({ name: 'Slowmode', value: 'Медленный режим', inline: true });

        await interaction.reply({ embeds: [embed], components: [createModMenuRow1(), createModMenuRow2(), createModMenuRow3()] });

    }



    else if (commandName === 'settings') {

        if (!hasSeniorAdmin(member)) return interaction.reply({ content: 'Только Senior Administrator.', flags: 64 });

        const autoRole = guild.roles.cache.get(settings.auto_role_id || '1532464933361684702');

        const embed = makeEmbed({ title: 'Настройки бота', color: 0xffd700 });

        embed.addFields({ name: 'Начальная роль', value: autoRole ? autoRole.toString() : 'Не задана', inline: true });

        await interaction.reply({ embeds: [embed], components: [createSettingsRow()] });

    }



    else if (commandName === 'help') {

        const embed = makeEmbed({ title: 'Помощь по боту', color: 0xffd700 });

        embed.addFields({ name: 'Меню отчётов', value: '`/menu` — открыть меню с кнопками\n`/mod_menu` — меню модерации\n`/settings` — настройки бота\n`/request_to_department` — заявка в отдел', inline: false });

        embed.addFields({ name: 'Модерация', value: '`/ban <member> <reason>` — забанить\n`/temp_ban <member> <time> <reason>` — бан на время\n`/unban <member> <reason>` — разбанить\n`/unban_all` — разбанить всех\n`/timeout <member> <time> <reason>` — тайм-аут\n`/untimeout <member> <reason>` — снять тайм-аут\n`/untimeout_all` — снять тайм-аут со всех\n`/mute <member> <time> <reason>` — мьют роль\n`/unmute <member> <reason>` — снять мьют роль\n`/clear <how>` — удалить сообщения\n`/send_dm <member> <text>` — отправить ЛС\n`/slowmode <channel> <second>` — слоумод\n`/timeouts_list` — список тайм-аутов\n`/ban_list` — список банов\n`/mute_list` — список мьютов', inline: false });

        embed.addFields({ name: 'Роли', value: '`/role <member> <role>` — выдать роль\n`/unrole <member> <role>` — снять роль\n`/temp_role <member> <role> <time>` — роль на время\n`/role_all <role>` — выдать роль всем', inline: false });

        embed.addFields({ name: 'Голосовые каналы', value: '`/move <member> <channel>` — переместить\n`/move_all` — переместить всех к себе', inline: false });

        embed.addFields({ name: 'Бэкапы', value: '`/backup_save` — сохранить бэкап\n`/backup_load <filename>` — загрузить бэкап\n`/backup_info` — список бэкапов', inline: false });

        embed.addFields({ name: 'Прочее', value: '`/teh` — техработы\n`/vkl` — включение бота\n`/give_points <fraction> <reason> <points>` — баллы фракции\n`/send_dm <member> <text>` — ЛС', inline: false });

        embed.addFields({ name: 'Игровые команды', value: '`/game` — меню игровых действий\n`/console` — мини-консоль для игровых команд (руководство)', inline: false });

        embed.addFields({ name: 'Статистика (БД)', value: '`/check_stats` — статистика админов\n`/check_stats_day` — за сегодня\n`/check_stats_weekly` — за неделю\n`/top_stats` — топ админов\n`/online` — онлайн сервера\n`/check_static <static>` — проверка игрока\n`/server_stats` — статистика сервера\n`/admin_log` — последние действия', inline: false });

        embed.addFields({ name: 'Информация', value: '`/member_info <member>` — инфо об участнике\n`/serverinfo` — инфо о сервере\n`/role_members <role>` — участники с ролью\n`/role_info <role>` — инфо о роли\n`/channel_info <channel>` — инфо о канале', inline: false });

        embed.addFields({ name: 'Гайд по времени', value: '`1d` — 1 день\n`2h` — 2 часа\n`30m` — 30 минут\n`1d12h` — 1 день 12 часов\n`2h30m` — 2 часа 30 минут', inline: false });

        embed.setFooter({ text: 'Mod: Head Discord Moderator, Discord Moderator | Senior Admin: Обзвон' });

        await interaction.reply({ embeds: [embed] });

    }



    else if (commandName === 'request_to_department') {

        await interaction.showModal(createRequestToDepartmentModal());

    }



    // ==================== GAME COMMAND ====================

    else if (commandName === 'game') {

        if (!isProjectCreator(member)) return interaction.reply({ content: 'Нет прав. Доступ только у роли Создатель проекта.', flags: 64 });

        const embed = makeEmbed({ title: 'Игровые команды', color: 0xffd700, description: '**Ban** — забанить игрока\n**Unban** — разбанить\n**Jail** — посадить в тюрьму\n**Unjail** — выпустить\n**Mute** — замутить\n**Unmute** — снять мут\n**DP** — выдать DP\n**Money** — выдать деньги\n**Givemats** — выдать материалы\n**Takemats** — забрать материалы\n**Makeadmin** — выдать админку' });

        await interaction.reply({ embeds: [embed], components: [createGameRow1(), createGameRow2(), createGameRow3()], flags: 64 });

    }



    // ==================== CONSOLE COMMAND ====================

    else if (commandName === 'console') {

        if (!hasConsoleAccess(member)) return interaction.reply({ content: 'Нет прав. Доступ только для руководства.', flags: 64 });

        const modal = new ModalBuilder()

            .setCustomId('console_modal')

            .setTitle('Мини-консоль');

        const cmdInput = new TextInputBuilder()

            .setCustomId('console_command')

            .setLabel('Команда (без слэша)')

            .setStyle(TextInputStyle.Paragraph)

            .setPlaceholder('ban John_Smith 1d читерство')

            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(cmdInput));

        await interaction.showModal(modal);

    }



    // ==================== DB COMMANDS ====================

    else if (['check_stats', 'check_stats_day', 'check_stats_weekly', 'top_stats', 'online', 'server_stats', 'admin_log'].includes(commandName)) {

        if (!hasModRole(member) && !hasSeniorAdmin(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        await interaction.deferReply({ flags: 64 });

        if (!config.dbHost) return interaction.editReply({ content: 'База данных не подключена.' });



        try {

            if (commandName === 'check_stats') {

                const rows = await dbQuery(

                    "SELECT admin, SUM(type='ban') AS bans, SUM(type='jail') AS jails, SUM(type='mute') AS mutes FROM (SELECT admin, 'ban' AS type FROM ban UNION ALL SELECT admin, 'jail' AS type FROM jail UNION ALL SELECT admin, 'mute' AS type FROM mute) AS all_actions WHERE admin != '' GROUP BY admin ORDER BY COUNT(*) DESC"

                );

                const fields = rows.slice(0, 20).map(r => `**${r.admin}** — Баны: ${r.bans || 0} | Тюрьма: ${r.jails || 0} | Муты: ${r.mutes || 0} | Всего: ${(r.bans || 0) + (r.jails || 0) + (r.mutes || 0)}`);

                await interaction.editReply({ embeds: [makeEmbed({ title: 'Статистика администраторов (из БД)', color: 0xffd700, description: fields.join('\n') || 'Нет данных' })] });

            }

            else if (commandName === 'check_stats_day') {

                const rows = await dbQuery(

                    "SELECT admin, SUM(type='ban') AS bans, SUM(type='jail') AS jails, SUM(type='mute') AS mutes FROM (SELECT admin, 'ban' AS type FROM ban WHERE DATE(banset)=CURDATE() UNION ALL SELECT admin, 'jail' AS type FROM jail WHERE DATE(timeset)=CURDATE() UNION ALL SELECT admin, 'mute' AS type FROM mute WHERE DATE(timeset)=CURDATE()) AS all_actions WHERE admin != '' GROUP BY admin ORDER BY COUNT(*) DESC"

                );

                const fields = rows.slice(0, 20).map(r => `**${r.admin}** — Баны: ${r.bans || 0} | Тюрьма: ${r.jails || 0} | Муты: ${r.mutes || 0} | Всего: ${(r.bans || 0) + (r.jails || 0) + (r.mutes || 0)}`);

                await interaction.editReply({ embeds: [makeEmbed({ title: 'Статистика за сегодня', color: 0x00ff00, description: fields.join('\n') || 'Нет данных за сегодня' })] });

            }

            else if (commandName === 'check_stats_weekly') {

                const rows = await dbQuery(

                    "SELECT admin, SUM(type='ban') AS bans, SUM(type='jail') AS jails, SUM(type='mute') AS mutes FROM (SELECT admin, 'ban' AS type FROM ban WHERE YEARWEEK(banset,1)=YEARWEEK(CURDATE(),1) UNION ALL SELECT admin, 'jail' AS type FROM jail WHERE YEARWEEK(timeset,1)=YEARWEEK(CURDATE(),1) UNION ALL SELECT admin, 'mute' AS type FROM mute WHERE YEARWEEK(timeset,1)=YEARWEEK(CURDATE(),1)) AS all_actions WHERE admin != '' GROUP BY admin ORDER BY COUNT(*) DESC"

                );

                const fields = rows.slice(0, 20).map(r => `**${r.admin}** — Баны: ${r.bans || 0} | Тюрьма: ${r.jails || 0} | Муты: ${r.mutes || 0} | Всего: ${(r.bans || 0) + (r.jails || 0) + (r.mutes || 0)}`);

                await interaction.editReply({ embeds: [makeEmbed({ title: 'Статистика за неделю', color: 0x0000ff, description: fields.join('\n') || 'Нет данных за неделю' })] });

            }

            else if (commandName === 'top_stats') {

                const rows = await dbQuery(

                    "SELECT admin, SUM(cnt) AS total FROM (SELECT admin, COUNT(*) AS cnt FROM ban WHERE admin!='' GROUP BY admin UNION ALL SELECT admin, COUNT(*) AS cnt FROM jail WHERE admin!='' GROUP BY admin UNION ALL SELECT admin, COUNT(*) AS cnt FROM mute WHERE admin!='' GROUP BY admin) AS all_actions GROUP BY admin ORDER BY total DESC LIMIT 10"

                );

                const medals = ['🥇', '🥈', '🥉'];

                const fields = rows.map((r, i) => `${medals[i] || `#${i+1}`} **${r.admin}** — ${r.total} наказаний`);

                await interaction.editReply({ embeds: [makeEmbed({ title: 'Топ администраторов', color: 0xffd700, description: fields.join('\n') || 'Нет данных' })] });

            }

            else if (commandName === 'online') {

                const rows = await dbQuery("SELECT COUNT(*) AS cnt FROM accounts WHERE online != '0'");

                const cnt = rows[0]?.cnt || 0;

                await interaction.editReply({ embeds: [makeEmbed({ title: 'Онлайн сервера', description: `Сейчас онлайн: **${cnt}** игроков`, color: 0x00ff00 })] });

            }

            else if (commandName === 'server_stats') {

                const [players, bans, jails, mutes, fractions, families] = await Promise.all([

                    dbQuery("SELECT COUNT(*) AS cnt FROM accounts"),

                    dbQuery("SELECT COUNT(*) AS cnt FROM ban"),

                    dbQuery("SELECT COUNT(*) AS cnt FROM jail"),

                    dbQuery("SELECT COUNT(*) AS cnt FROM mute"),

                    dbQuery("SELECT COUNT(*) AS cnt FROM fractions"),

                    dbQuery("SELECT COUNT(*) AS cnt FROM families"),

                ]);

                const embed = makeEmbed({ title: 'Статистика сервера', color: 0xffd700 });

                embed.addFields({ name: 'Игроков', value: String(players[0]?.cnt || 0), inline: true });

                embed.addFields({ name: 'Банов', value: String(bans[0]?.cnt || 0), inline: true });

                embed.addFields({ name: 'Тюрем', value: String(jails[0]?.cnt || 0), inline: true });

                embed.addFields({ name: 'Мутов', value: String(mutes[0]?.cnt || 0), inline: true });

                embed.addFields({ name: 'Фракций', value: String(fractions[0]?.cnt || 0), inline: true });

                embed.addFields({ name: 'Семей', value: String(families[0]?.cnt || 0), inline: true });

            await interaction.editReply({ embeds: [embed] }).catch(() => { /* ignore */ });

            }

            else if (commandName === 'admin_log') {

                const [logRows, logRows2, logRows3] = await Promise.all([

                    dbQuery("SELECT admin, login, reason, banset AS time, 'BAN' AS type FROM ban ORDER BY id DESC LIMIT 5"),

                    dbQuery("SELECT admin, login, reason, timeset AS time, 'JAIL' AS type FROM jail ORDER BY id DESC LIMIT 5"),

                    dbQuery("SELECT admin, login, reason, timeset AS time, 'MUTE' AS type FROM mute ORDER BY id DESC LIMIT 5"),

                ]);

                const all = [...logRows, ...logRows2, ...logRows3].sort((a, b) => {

                    const tA = a.time ? new Date(a.time).getTime() : 0;

                    const tB = b.time ? new Date(b.time).getTime() : 0;

                    return tB - tA;

                }).slice(0, 15);

                const fields = all.map(r => `\`${r.type}\` **${r.admin}** → ${r.login || '?'} | ${r.reason || '—'}\n${r.time ? String(r.time).slice(0, 16) : '—'}`);

                await interaction.editReply({ embeds: [makeEmbed({ title: 'Последние действия админов', color: 0xffa500, description: fields.join('\n') || 'Нет действий' })] });

            }

        } catch (e) {

            await interaction.editReply({ content: `Ошибка БД: ${e.message}` });

        }

    }



    // ==================== CHECK_STATIC ====================

    else if (commandName === 'check_static') {

        if (!hasModRole(member) && !hasSeniorAdmin(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const staticId = interaction.options.getString('static').trim();

        if (!/^\d+$/.test(staticId)) return interaction.reply({ content: 'Укажите числовой Static ID.', flags: 64 });

        await interaction.deferReply({ flags: 64 });

        if (!config.dbHost) return interaction.editReply({ content: 'База данных не подключена.' });

        try {

            const rows = await dbQuery("SELECT static, login, adminlvl, fraction, money, dp FROM accounts WHERE static=? LIMIT 1", [staticId]);

            if (!rows || rows.length === 0) return interaction.editReply({ content: `Игрок со Static ID \`${staticId}\` не найден` });

            const p = rows[0];

            const embed = makeEmbed({ title: `Static ID: ${p.static}`, color: 0x0000ff });

            embed.addFields({ name: 'Логин', value: p.login || '—', inline: true });

            embed.addFields({ name: 'Admin LVL', value: String(p.adminlvl || '0'), inline: true });

            embed.addFields({ name: 'Фракция', value: p.fraction || 'нет', inline: true });

            embed.addFields({ name: 'Деньги', value: String(p.money || '0'), inline: true });

            embed.addFields({ name: 'DP', value: String(p.dp || '0'), inline: true });

            await interaction.editReply({ embeds: [embed] });

        } catch (e) { await interaction.editReply({ content: `Ошибка БД: ${e.message}` }); }

    }



    // ==================== UNBAN ALL ====================

    else if (commandName === 'unban_all') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        await interaction.reply({ content: 'Разбаниваю всех...', flags: 64 });

        try {

            const bans = await guild.bans.fetch();

            if (bans.size === 0) return interaction.editReply({ content: 'Нет забаненных пользователей.' });

            let count = 0, dmSent = 0;

            for (const ban of bans.values()) {

                try { await guild.members.unban(ban.user.id, 'unban_all'); count++; } catch (e) { /* ignore */ }

            }

            for (const ban of bans.values()) {

                try { await ban.user.send('Здравствуйте, вас разбанили в Discord сервере FLOW DM! Ссылка: discord.gg/flowdm'); dmSent++; } catch (e) { /* ignore */ }

            }

            await interaction.editReply({ content: `Разбанено **${count}** пользователей. ЛС отправлено: **${dmSent}**.` });

            await sendLog(new EmbedBuilder().setTitle('UNBAN ALL').setColor(0x00ff00).setTimestamp().addFields({ name: 'Разбанено', value: String(count) }).addFields({ name: 'ЛС отправлено', value: String(dmSent) }).addFields({ name: 'Кем', value: interaction.user.tag }));

        } catch (e) { await interaction.editReply({ content: `Ошибка: ${e.message}` }); }

    }



    // ==================== MODERATION COMMANDS ====================

    else if (commandName === 'ban') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const reason = interaction.options.getString('reason');

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            await target.ban({ reason });

            incrementStat(interaction.user.id, 'bans');

            const embed = makeEmbed({ title: 'BAN', description: `${target} забанен`, color: 0xff0000 });

            embed.addFields({ name: 'Причина', value: reason });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('BAN').setColor(0xff0000).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'temp_ban') {

        if (!hasHeadModRole(member)) return interaction.reply({ content: 'Только Head Moderator.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const timeStr = interaction.options.getString('time');

        const reason = interaction.options.getString('reason');

        const seconds = parseTime(timeStr);

        if (seconds <= 0) return interaction.reply({ content: 'Некорректный формат времени.', flags: 64 });

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            // Check if already banned

            const existingBan = await guild.bans.fetch(targetId).catch(() => null);

            if (existingBan) return interaction.reply({ content: `Пользователь ${target} уже забанен.`, flags: 64 });

            await target.ban({ reason });

            incrementStat(interaction.user.id, 'bans');

            const timeDisplay = formatTime(seconds);

            const embed = makeEmbed({ title: 'TEMP BAN', description: `${target} забанен на **${timeDisplay}**`, color: 0xff0000 });

            embed.addFields({ name: 'Причина', value: reason });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('TEMP BAN').setColor(0xff0000).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Время', value: timeDisplay }).addFields({ name: 'Причина', value: reason }));

            setTimeout(async () => {

                try { await guild.members.unban(target.id, 'Истекло время temp_ban'); log(`Temp ban lifted for ${target.user.tag}`); } catch (e) { log(`Auto-unban error: ${e.message}`); }

            }, seconds * 1000);

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'unban') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const reason = interaction.options.getString('reason');

        try {

            // Try fetching from bans cache first

            let bansCache = await guild.bans.fetch().catch(() => null);

            const existingBan = bansCache?.get(targetId);

            if (!existingBan) {

                // Try direct fetch

                const directBan = await guild.bans.fetch(targetId).catch(() => null);

                if (!directBan) return interaction.reply({ content: `Пользователь ${targetId} не забанен.`, flags: 64 });

            }

            await guild.members.unban(targetId, reason);

            const banUser = existingBan?.user || (await guild.members.fetch(targetId).catch(() => null));

            const embed = makeEmbed({ title: 'UNBAN', description: banUser ? `${banUser} разбанен` : `<@${targetId}> разбанен`, color: 0x00ff00 });

            embed.addFields({ name: 'Причина', value: reason });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('UNBAN').setColor(0x00ff00).setTimestamp().addFields({ name: 'Пользователь', value: banUser ? `${banUser.user.tag} (${banUser.user.id})` : `${targetId}` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'timeout') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const timeStr = interaction.options.getString('time');

        const reason = interaction.options.getString('reason');

        const seconds = parseTime(timeStr);

        if (seconds <= 0) return interaction.reply({ content: 'Некорректный формат времени.', flags: 64 });

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            await target.timeout(seconds * 1000, reason);

            incrementStat(interaction.user.id, 'mutes');

            const timeDisplay = formatTime(seconds);

            const embed = makeEmbed({ title: 'TIMEOUT', description: `${target} замьючен на ${timeDisplay}`, color: 0xffa500 });

            embed.addFields({ name: 'Причина', value: reason });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('TIMEOUT').setColor(0xffa500).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Время', value: timeDisplay }).addFields({ name: 'Причина', value: reason }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'untimeout') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const reason = interaction.options.getString('reason');

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            await target.timeout(null, reason);

            const embed = makeEmbed({ title: 'UNTIMEOUT', description: `Тайм-аут снят с ${target}`, color: 0x00ff00 });

            embed.addFields({ name: 'Причина', value: reason });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('UNTIMEOUT').setColor(0x00ff00).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'untimeout_all') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        await interaction.reply({ content: 'Снимаю тайм-ауты...', flags: 64 });

        let count = 0;

        const users = [];

        for (const m of guild.members.cache.values()) {

            if (m.isCommunicationDisabled()) {

                try { await m.timeout(null, 'Mass untimeout'); count++; users.push(m.user.tag); log(`UNTIMEOUT ALL: removed from ${m.user.tag}`); } catch (e) { log(`Untimeout error: ${e.message}`); }

            }

        }

        const embed = makeEmbed({ title: 'UNTIMEOUT ALL', description: `Снят тайм-аут с **${count}** пользователей`, color: 0x00ff00 });

        if (users.length > 0) embed.addFields({ name: 'Пользователи', value: users.slice(0, 20).join('\n'), inline: false });

        embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

        await interaction.followUp({ embeds: [embed] });

        await sendLog(new EmbedBuilder().setTitle('UNTIMEOUT ALL').setColor(0x00ff00).setTimestamp().addFields({ name: 'Количество', value: String(count) }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Пользователи', value: users.slice(0, 20).join('\n'), inline: false }));

    }



    else if (commandName === 'mute') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const timeStr = interaction.options.getString('time');

        const reason = interaction.options.getString('reason');

        const seconds = parseTime(timeStr);

        if (seconds <= 0) return interaction.reply({ content: 'Некорректный формат времени.', flags: 64 });

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            const muteRole = guild.roles.cache.get(config.muteRoleId);

            if (!muteRole) return interaction.reply({ content: 'Роль мьюта не найдена.', flags: 64 });

            if (target.roles.cache.has(config.muteRoleId)) return interaction.reply({ content: `У ${target} уже есть роль мьюта.`, flags: 64 });

            await target.roles.add(muteRole, reason);

            incrementStat(interaction.user.id, 'mutes');

            const timeDisplay = formatTime(seconds);

            const embed = makeEmbed({ title: 'MUTE', description: `${target} замьючен на ${timeDisplay}`, color: 0xffa500 });

            embed.addFields({ name: 'Причина', value: reason });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('MUTE').setColor(0xffa500).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Время', value: timeDisplay }).addFields({ name: 'Причина', value: reason }));

            setTimeout(async () => {

                try {

                    const m = await guild.members.fetch(targetId).catch(() => null);

                    if (m && m.roles.cache.has(config.muteRoleId)) { await m.roles.remove(muteRole, 'Истекло время мьюта'); log(`Mute auto-removed from ${m.user.tag}`); }

                } catch (e) { log(`Auto-unmute error: ${e.message}`); }

            }, seconds * 1000);

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'unmute') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const reason = interaction.options.getString('reason');

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            const muteRole = guild.roles.cache.get(config.muteRoleId);

            if (!muteRole) return interaction.reply({ content: 'Роль мьюта не найдена.', flags: 64 });

            if (!target.roles.cache.has(config.muteRoleId)) return interaction.reply({ content: `У ${target} нет роли мьюта.`, flags: 64 });

            await target.roles.remove(muteRole, reason);

            const embed = makeEmbed({ title: 'UNMUTE', description: `Мьют снят с ${target}`, color: 0x00ff00 });

            embed.addFields({ name: 'Причина', value: reason });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('UNMUTE').setColor(0x00ff00).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'move') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const channelId = interaction.options.getString('channel');

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            if (!target.voice?.channel) return interaction.reply({ content: `${target} не в голосовом канале.`, flags: 64 });

            const dest = guild.channels.cache.get(channelId);

            if (!dest || dest.type !== 2) return interaction.reply({ content: `Канал ${channelId} не найден или не голосовой.`, flags: 64 });

            const old = target.voice.channel;

            await target.voice.setChannel(dest);

            const embed = makeEmbed({ title: 'MOVE', description: `${target} перемещён в ${dest}`, color: 0x0000ff });

            embed.addFields({ name: 'Откуда', value: old.name });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('MOVE').setColor(0x0000ff).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Откуда', value: old.name }).addFields({ name: 'Куда', value: dest.name }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'move_all') {

        if (!hasHeadModRole(member)) return interaction.reply({ content: 'Только Head Moderator.', flags: 64 });

        if (!member.voice?.channel) return interaction.reply({ content: 'Вы не в голосовом канале.', flags: 64 });

        const dest = member.voice.channel;

        await interaction.reply({ content: `Перемещаю всех в ${dest}...`, flags: 64 });

        let count = 0;

        for (const ch of guild.channels.cache.filter(c => c.type === 2).values()) {

            if (ch.id === dest.id) continue;

            for (const m of ch.members.values()) {

                if (m.id === member.id) continue;

                try { await m.voice.setChannel(dest); count++; log(`MOVE ALL: ${m.user.tag} moved to ${dest.name}`); await sleep(500); } catch (e) { log(`Move error: ${e.message}`); }

            }

        }

        const embed = makeEmbed({ title: 'MOVE ALL', description: `Перемещено **${count}** пользователей в ${dest}`, color: 0x0000ff });

        embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

        await interaction.followUp({ embeds: [embed] });

        await sendLog(new EmbedBuilder().setTitle('MOVE ALL').setColor(0x0000ff).setTimestamp().addFields({ name: 'Количество', value: String(count) }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Канал', value: dest.name }));

    }



    else if (commandName === 'clear') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const how = interaction.options.getInteger('how');

        if (how < 1 || how > 200) return interaction.reply({ content: 'Укажите число от 1 до 200.', flags: 64 });

        await interaction.reply({ content: `Удаляю ${how} сообщений...`, flags: 64 });

        try {

            const deleted = await interaction.channel.bulkDelete(how + 1, true);

            const embed = makeEmbed({ title: 'CLEAR', description: `Удалено **${deleted.size - 1}** сообщений`, color: 0xffa500 });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            const msg = await interaction.followUp({ embeds: [embed] });

            setTimeout(async () => { try { await msg.delete(); } catch (e) { /* ignore */ } }, 5000);

            await sendLog(new EmbedBuilder().setTitle('CLEAR').setColor(0xffa500).setTimestamp().addFields({ name: 'Количество', value: String(deleted.size - 1) }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Канал', value: interaction.channel.name }));

        } catch (e) { await interaction.followUp({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'role') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const roleName = interaction.options.getString('role');

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            const targetRole = guild.roles.cache.find(r => r.name === roleName);

            if (!targetRole) return interaction.reply({ content: `Роль \`${roleName}\` не найдена.`, flags: 64 });

            if (target.roles.cache.has(targetRole.id)) return interaction.reply({ content: `У ${target} уже есть роль ${targetRole}.`, flags: 64 });

            await target.roles.add(targetRole, `Выдана через /role by ${interaction.user.tag}`);

            const embed = makeEmbed({ title: 'ROLE', description: `${targetRole} выдана ${target}`, color: 0x00ff00 });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('ROLE ADD').setColor(0x00ff00).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Роль', value: targetRole.name }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'unrole') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const roleName = interaction.options.getString('role');

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            const targetRole = guild.roles.cache.find(r => r.name === roleName);

            if (!targetRole) return interaction.reply({ content: `Роль \`${roleName}\` не найдена.`, flags: 64 });

            if (!target.roles.cache.has(targetRole.id)) return interaction.reply({ content: `У ${target} нет роли ${targetRole}.`, flags: 64 });

            await target.roles.remove(targetRole, `Снята через /unrole by ${interaction.user.tag}`);

            const embed = makeEmbed({ title: 'UNROLE', description: `${targetRole} снята с ${target}`, color: 0xffa500 });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('ROLE REMOVE').setColor(0xffa500).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Роль', value: targetRole.name }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'temp_role') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const roleName = interaction.options.getString('role');

        const timeStr = interaction.options.getString('time');

        const seconds = parseTime(timeStr);

        if (seconds <= 0) return interaction.reply({ content: 'Некорректный формат времени.', flags: 64 });

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            const targetRole = guild.roles.cache.find(r => r.name === roleName);

            if (!targetRole) return interaction.reply({ content: `Роль \`${roleName}\` не найдена.`, flags: 64 });

            if (target.roles.cache.has(targetRole.id)) return interaction.reply({ content: `У ${target} уже есть роль ${targetRole}.`, flags: 64 });

            await target.roles.add(targetRole, `Temp role by ${interaction.user.tag}`);

            const timeDisplay = formatTime(seconds);

            const embed = makeEmbed({ title: 'TEMP ROLE', description: `${targetRole} выдана ${target} на **${timeDisplay}**`, color: 0x0000ff });

            embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('TEMP ROLE').setColor(0x0000ff).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Роль', value: targetRole.name }).addFields({ name: 'Время', value: timeDisplay }));

            setTimeout(async () => {

                try {

                    const m = await guild.members.fetch(targetId).catch(() => null);

                    if (m && m.roles.cache.has(targetRole.id)) { await m.roles.remove(targetRole, 'Истекло время temp_role'); log(`Temp role ${targetRole.name} removed from ${m.user.tag}`); }

                } catch (e) { log(`Auto-role remove error: ${e.message}`); }

            }, seconds * 1000);

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'role_all') {

        if (!hasHeadModRole(member)) return interaction.reply({ content: 'Только Head Moderator.', flags: 64 });

        const roleName = interaction.options.getString('role');

        const targetRole = guild.roles.cache.find(r => r.name === roleName);

        if (!targetRole) return interaction.reply({ content: `Роль \`${roleName}\` не найдена.`, flags: 64 });

        await interaction.reply({ content: `Выдаю роль ${targetRole} всем...`, flags: 64 });

        let count = 0;

        for (const m of guild.members.cache.values()) {

            if (m.user.bot) continue;

            if (m.roles.cache.has(targetRole.id)) continue;

            try { await m.roles.add(targetRole, `Role all by ${interaction.user.tag}`); count++; await sleep(500); } catch (e) { log(`Role all error: ${e.message}`); }

        }

        const embed = makeEmbed({ title: 'ROLE ALL', description: `Роль ${targetRole} выдана **${count}** участникам`, color: 0x00ff00 });

        embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

        await interaction.followUp({ embeds: [embed] });

        await sendLog(new EmbedBuilder().setTitle('ROLE ALL').setColor(0x00ff00).setTimestamp().addFields({ name: 'Роль', value: targetRole.name }).addFields({ name: 'Количество', value: String(count) }).addFields({ name: 'Модератор', value: interaction.user.tag }));

    }



    // ==================== LIST COMMANDS ====================

    else if (commandName === 'timeouts_list') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const users = [];

        for (const m of guild.members.cache.values()) {

            if (m.isCommunicationDisabled()) {

                const until = m.communicationDisabledUntil;

                if (until) {

                    const remaining = until.getTime() - Date.now();

                    const d = Math.floor(remaining / 86400000);

                    const h = Math.floor((remaining % 86400000) / 3600000);

                    const min = Math.floor((remaining % 3600000) / 60000);

                    let timeLeft = '';

                    if (d > 0) timeLeft += `${d}д `;

                    if (h > 0) timeLeft += `${h}ч `;

                    if (min > 0) timeLeft += `${min}м`;

                    users.push(`${m} — осталось ${timeLeft.trim()}`);

                } else {

                    users.push(`${m}`);

                }

            }

        }

        const embed = makeEmbed({ title: 'Список тайм-аутов', color: 0xffa500 });

        embed.setDescription(users.length > 0 ? users.slice(0, 25).join('\n') : 'Нет пользователей с тайм-аутом');

        embed.setFooter({ text: `Всего: ${users.length}` });

        await interaction.reply({ embeds: [embed] });

    }



    else if (commandName === 'ban_list') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const bans = await guild.bans.fetch();

        const embed = makeEmbed({ title: 'Список банов', color: 0xff0000 });

        embed.setDescription(bans.size > 0 ? bans.map(b => `${b.user} — ${b.reason || 'Нет причины'}`).slice(0, 25).join('\n') : 'Нет забаненных пользователей');

        embed.setFooter({ text: `Всего: ${bans.size}` });

        await interaction.reply({ embeds: [embed] });

    }



    else if (commandName === 'mute_list') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const muteRole = guild.roles.cache.get(config.muteRoleId);

        if (!muteRole) return interaction.reply({ content: 'Роль мьюта не найдена.', flags: 64 });

        const embed = makeEmbed({ title: 'Список мьютов', color: 0xffa500 });

        embed.setDescription(muteRole.members.size > 0 ? muteRole.members.map(m => `${m}`).slice(0, 25).join('\n') : 'Нет пользователей с мьют ролью');

        embed.setFooter({ text: `Всего: ${muteRole.members.size}` });

        await interaction.reply({ embeds: [embed] });

    }



    // ==================== INFO COMMANDS ====================

    else if (commandName === 'member_info') {

        const targetId = interaction.options.getString('member');

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            const embed = makeEmbed({ title: `Информация о ${target.displayName}`, color: 0x0000ff });

            embed.setThumbnail(target.user.displayAvatarURL());

            embed.addFields({ name: 'ID', value: target.id, inline: true });

            embed.addFields({ name: 'Ник', value: target.displayName, inline: true });

            embed.addFields({ name: 'Тег', value: target.user.tag, inline: true });

            embed.addFields({ name: 'Создан', value: `<t:${Math.floor(target.user.createdAt.getTime() / 1000)}:R>`, inline: true });

            embed.addFields({ name: 'Вошёл', value: target.joinedAt ? `<t:${Math.floor(target.joinedAt.getTime() / 1000)}:R>` : 'N/A', inline: true });

            embed.addFields({ name: 'Роли', value: target.roles.cache.filter(r => r.id !== guild.id).map(r => r.toString()).join(', ') || 'Нет', inline: false });

            embed.addFields({ name: 'Бот', value: target.user.bot ? 'Да' : 'Нет', inline: true });

            embed.addFields({ name: 'Тайм-аут', value: target.isCommunicationDisabled() ? 'Да' : 'Нет', inline: true });

            await interaction.reply({ embeds: [embed] });

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'serverinfo') {

        const embed = makeEmbed({ title: `Информация о ${guild.name}`, color: 0xffd700 });

        if (guild.icon) embed.setThumbnail(guild.iconURL());

        embed.addFields({ name: 'ID', value: guild.id, inline: true });

        embed.addFields({ name: 'Владелец', value: guild.ownerId ? `<@${guild.ownerId}>` : 'N/A', inline: true });

        embed.addFields({ name: 'Создан', value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>`, inline: true });

        embed.addFields({ name: 'Участники', value: String(guild.memberCount), inline: true });

        embed.addFields({ name: 'Текстовые каналы', value: String(guild.channels.cache.filter(c => c.type === 0).size), inline: true });

        embed.addFields({ name: 'Голосовые каналы', value: String(guild.channels.cache.filter(c => c.type === 2).size), inline: true });

        embed.addFields({ name: 'Роли', value: String(guild.roles.cache.size), inline: true });

        embed.addFields({ name: 'Эмодзи', value: String(guild.emojis.cache.size), inline: true });

        embed.addFields({ name: 'Бусты', value: String(guild.premiumSubscriptionCount || 0), inline: true });

        embed.addFields({ name: 'Уровень буста', value: String(guild.premiumTier), inline: true });

        await interaction.reply({ embeds: [embed] });

    }



    else if (commandName === 'role_members') {

        const roleName = interaction.options.getString('role');

        const targetRole = guild.roles.cache.find(r => r.name === roleName);

        if (!targetRole) return interaction.reply({ content: `Роль \`${roleName}\` не найдена.`, flags: 64 });

        const embed = makeEmbed({ title: `Участники с ролью ${targetRole.name}`, color: targetRole.color });

        const members = targetRole.members.map(m => `${m}`);

        embed.setDescription(members.length > 0 ? members.slice(0, 25).join('\n') : 'Нет участников с этой ролью');

        embed.setFooter({ text: `Всего: ${members.length}` });

        await interaction.reply({ embeds: [embed] });

    }



    else if (commandName === 'role_info') {

        const roleName = interaction.options.getString('role');

        const targetRole = guild.roles.cache.find(r => r.name === roleName);

        if (!targetRole) return interaction.reply({ content: `Роль \`${roleName}\` не найдена.`, flags: 64 });

        const embed = makeEmbed({ title: `Информация о роли ${targetRole.name}`, color: targetRole.color });

        embed.addFields({ name: 'ID', value: targetRole.id, inline: true });

        embed.addFields({ name: 'Цвет', value: `#${targetRole.color.toString(16).padStart(6, '0')}`, inline: true });

        embed.addFields({ name: 'Позиция', value: String(targetRole.position), inline: true });

        embed.addFields({ name: 'Участников', value: String(targetRole.members.size), inline: true });

        embed.addFields({ name: 'Отображается отдельно', value: targetRole.hoist ? 'Да' : 'Нет', inline: true });

        embed.addFields({ name: 'Упоминаемая', value: targetRole.mentionable ? 'Да' : 'Нет', inline: true });

        embed.addFields({ name: 'Бот', value: targetRole.managed ? 'Да' : 'Нет', inline: true });

        embed.addFields({ name: 'Создана', value: `<t:${Math.floor(targetRole.createdAt.getTime() / 1000)}:R>`, inline: true });

        await interaction.reply({ embeds: [embed] });

    }



    else if (commandName === 'channel_info') {

        const channelId = interaction.options.getString('channel');

        try {

            const ch = guild.channels.cache.get(channelId);

            if (!ch) return interaction.reply({ content: `Канал ${channelId} не найден.`, flags: 64 });

            const embed = makeEmbed({ title: `Информация о ${ch.name}`, color: 0x0000ff });

            embed.addFields({ name: 'ID', value: ch.id, inline: true });

            embed.addFields({ name: 'Тип', value: String(ch.type), inline: true });

            embed.addFields({ name: 'Категория', value: ch.parent ? ch.parent.name : 'Нет', inline: true });

            embed.addFields({ name: 'Создан', value: `<t:${Math.floor(ch.createdAt.getTime() / 1000)}:R>`, inline: true });

            if (ch.type === 0 && ch.topic) embed.addFields({ name: 'Топик', value: ch.topic, inline: false });

            if (ch.type === 0) embed.addFields({ name: 'NSFW', value: ch.nsfw ? 'Да' : 'Нет', inline: true });

            if (ch.type === 0 && ch.rateLimitPerUser) embed.addFields({ name: 'Слоумод', value: `${ch.rateLimitPerUser}с`, inline: true });

            if (ch.type === 2 && ch.userLimit) embed.addFields({ name: 'Лимит', value: String(ch.userLimit), inline: true });

            if (ch.type === 2) embed.addFields({ name: 'Битрейт', value: `${ch.bitrate / 1000}kbps`, inline: true });

            await interaction.reply({ embeds: [embed] });

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'send_dm') {

        if (!hasHeadModRole(member)) return interaction.reply({ content: 'Только Head Moderator.', flags: 64 });

        const targetId = interaction.options.getString('member');

        const text = interaction.options.getString('text');

        try {

            const target = await guild.members.fetch(targetId).catch(() => null);

            if (!target) return interaction.reply({ content: `Пользователь ${targetId} не найден.`, flags: 64 });

            await target.send({ embeds: [makeEmbed({ title: 'Сообщение от администрации', description: text, color: 0xffd700 })] });

            await interaction.reply({ content: `Сообщение отправлено ${target}`, flags: 64 });

            await sendLog(new EmbedBuilder().setTitle('SEND DM').setColor(0xffd700).setTimestamp().addFields({ name: 'Получатель', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Отправитель', value: interaction.user.tag }).addFields({ name: 'Текст', value: text.slice(0, 1024) }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'slowmode') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const channelId = interaction.options.getString('channel');

        const second = interaction.options.getInteger('second');

        if (second < 0 || second > 120) return interaction.reply({ content: 'Укажите число от 0 до 120.', flags: 64 });

        try {

            const ch = guild.channels.cache.get(channelId);

            if (!ch) return interaction.reply({ content: `Канал ${channelId} не найден.`, flags: 64 });

            if (ch.type !== 0 && ch.type !== 2) return interaction.reply({ content: `Канал не текстовый/голосовой.`, flags: 64 });

            await ch.setRateLimitPerUser(second);

            const desc = second === 0 ? `Слоумод выключен в ${ch}` : `Слоумод установлен на **${second}** сек в ${ch}`;

            const embed = new EmbedBuilder().setTitle('SLOWMODE').setDescription(desc).setColor(0x0000ff).addFields({ name: 'Модератор', value: interaction.user.toString() });

            await interaction.reply({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('SLOWMODE').setColor(0x0000ff).setTimestamp().addFields({ name: 'Канал', value: ch.name }).addFields({ name: 'Секунды', value: String(second) }).addFields({ name: 'Модератор', value: interaction.user.tag }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    // ==================== BACKUP COMMANDS ====================

    else if (commandName === 'backup_save') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        await interaction.reply({ content: 'Сохраняю бэкап сервера...', flags: 64 });

        try {

            const backup = {

                name: guild.name,

                id: guild.id,

                created_at: guild.createdAt.toISOString(),

                roles: [],

                categories: [],

                text_channels: [],

                voice_channels: [],

                emojis: [],

            };

            for (const role of guild.roles.cache.sort((a, b) => b.position - a.position).values()) {

                if (role.id === guild.id) continue;

                backup.roles.push({ name: role.name, id: role.id, color: role.color, hoist: role.hoist, mentionable: role.mentionable, permissions: role.permissions.bitfield.toString(), position: role.position });

            }

            for (const cat of guild.channels.cache.filter(c => c.type === 4).sort((a, b) => a.position - b.position).values()) {

                const catData = { name: cat.name, id: cat.id, position: cat.position, overwrites: serializeOverwrites(cat), channels: [] };

                for (const ch of cat.children.cache.sort((a, b) => a.position - b.position).values()) {

                    catData.channels.push({ name: ch.name, id: ch.id, type: String(ch.type), position: ch.position, topic: ch.topic || null, nsfw: ch.nsfw || false, slowmode_delay: ch.rateLimitPerUser || 0, overwrites: serializeOverwrites(ch) });

                }

                backup.categories.push(catData);

            }

            for (const ch of guild.channels.cache.filter(c => c.type === 0 && !c.parent).values()) {

                backup.text_channels.push({ name: ch.name, id: ch.id, topic: ch.topic || null, nsfw: ch.nsfw || false, slowmode_delay: ch.rateLimitPerUser || 0, position: ch.position, overwrites: serializeOverwrites(ch) });

            }

            for (const ch of guild.channels.cache.filter(c => c.type === 2 && !c.parent).values()) {

                backup.voice_channels.push({ name: ch.name, id: ch.id, position: ch.position, user_limit: ch.userLimit || 0, bitrate: ch.bitrate || 64000, overwrites: serializeOverwrites(ch) });

            }

            for (const emoji of guild.emojis.cache.values()) {

                backup.emojis.push({ name: emoji.name, id: emoji.id, animated: emoji.animated, url: emoji.url });

            }

            const filename = `backup_${guild.id}.json`;

            const filepath = backupFilePath(guild.id);

            fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

            log(`Backup created: ${filename}`);

            const embed = makeEmbed({ title: 'Бэкап создан', description: `Файл: \`${filename}\``, color: 0x00ff00 });

            embed.addFields({ name: 'Роли', value: String(backup.roles.length) });

            embed.addFields({ name: 'Категории', value: String(backup.categories.length) });

            embed.addFields({ name: 'Эмодзи', value: String(backup.emojis.length) });

            await interaction.followUp({ embeds: [embed] });

            await sendLog(new EmbedBuilder().setTitle('BACKUP SAVE').setColor(0x00ff00).setTimestamp().addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Файл', value: filename }));

        } catch (e) { await interaction.followUp({ content: `Ошибка: ${e.message}` }); }

    }



    else if (commandName === 'backup_load') {

        if (!canLoadBackup(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const filename = path.basename(interaction.options.getString('filename') || '');

        if (!/^backup_[\w-]+\.json$/.test(filename)) return interaction.reply({ content: 'Некорректное имя файла.', flags: 64 });

        const filepath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filepath)) return interaction.reply({ content: `Файл \`${filename}\` не найден.`, flags: 64 });

        await interaction.reply({ content: 'Загружаю бэкап (удаляю старые каналы и роли, создаю новые)...', flags: 64 });

        try {

            let backup;

            try {

                backup = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

            } catch (e) {

                return interaction.editReply({ content: `Ошибка чтения JSON: ${e.message}` });

            }

            // Validate backup structure

            if (!backup || !Array.isArray(backup.roles) || !Array.isArray(backup.categories) && !Array.isArray(backup.text_channels)) {

                return interaction.editReply({ content: `Ошибка: невалидная структура бэкапа` });

            }

            const result = await performBackupLoad(guild, backup);

            const embed = makeEmbed({ title: 'Бэкап загружен', description: `Файл: \`${filename}\``, color: 0x00ff00 });

            embed.addFields({ name: 'Роли создано', value: String(result.roles_created) });

            embed.addFields({ name: 'Каналов создано', value: String(result.channels_created) });

            embed.addFields({ name: 'ID \u0437\u0430\u043c\u0435\u043d\u0435\u043d\u044b', value: 'bot_settings.json, config.json', inline: false });

            try { await interaction.followUp({ embeds: [embed] }); } catch (e) { /* ignore */ }

            await sendLog(new EmbedBuilder().setTitle('BACKUP LOAD').setColor(0x0000ff).setTimestamp().addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Файл', value: filename }));

        } catch (e) {

            log(`Backup load error: ${e.message}`);

            try { await interaction.followUp({ content: `Ошибка: ${e.message}` }); } catch (e2) { /* ignore */ }

        }

    }



    else if (commandName === 'backup_info') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        const files = listBackups();

        const embed = makeEmbed({ title: 'Доступные бэкапы', color: 0xffd700 });

        if (files.length === 0) {

            embed.setDescription('Нет сохранённых бэкапов');

        } else {

            const list = files.sort().reverse().slice(0, 15).map(f => {

                const size = fs.statSync(path.join(BACKUP_DIR, f)).size;

                return `\`${f}\` — ${(size / 1024).toFixed(1)} KB`;

            });

            embed.setDescription(list.join('\n'));

        }

        embed.setFooter({ text: `Всего: ${files.length}` });

        await interaction.reply({ embeds: [embed] });

    }



    // ==================== TEH / VKL ====================

    else if (commandName === 'teh') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        try {

            const channel = guild.channels.cache.get(config.tehChannelId);

            if (!channel) return interaction.reply({ content: 'Канал не найден.', flags: 64 });

            await channel.send('# <@&1532465028228448429>  Бот на тех работах');

            await interaction.reply({ content: 'Сообщение отправлено!', flags: 64 });

            await sendLog(new EmbedBuilder().setTitle('TEH').setColor(0x0000ff).setTimestamp().addFields({ name: 'Отправитель', value: interaction.user.tag }).addFields({ name: 'Канал', value: channel.toString() }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    else if (commandName === 'vkl') {

        if (!hasModRole(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 });

        try {

            const channel = guild.channels.cache.get(config.tehChannelId);

            if (!channel) return interaction.reply({ content: 'Канал не найден.', flags: 64 });

            await channel.send('# <@&1532465028228448429>  Бот включен');

            await interaction.reply({ content: 'Сообщение отправлено!', flags: 64 });

            await sendLog(new EmbedBuilder().setTitle('VKL').setColor(0x00ff00).setTimestamp().addFields({ name: 'Отправитель', value: interaction.user.tag }).addFields({ name: 'Канал', value: channel.toString() }));

        } catch (e) { await interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }); }

    }



    // ==================== GIVE POINTS ====================

    else if (commandName === 'give_points') {

        if (!member.roles.cache.some(r => [config.gaRoleId, config.zgaRoleId, config.curatorRoleId].includes(r.id))) {

            return interaction.reply({ content: 'Нет прав.', flags: 64 });

        }

        const fraction = interaction.options.getString('fraction');

        const reason = interaction.options.getString('reason');

        const points = interaction.options.getInteger('points');

        const channel = guild.channels.cache.get(config.achievementPointsChannelId);

        if (!channel) return interaction.reply({ content: 'Канал не найден!', flags: 64 });

        await interaction.reply({ content: 'Начисляю баллы...', flags: 64 });

        try {

            let lastTotal = 0;

            const msgs = await channel.messages.fetch({ limit: 100 });

            const fracLower = fraction.toLowerCase();

            for (const msg of msgs.values()) {

                if (msg.content.toLowerCase().includes(fracLower) && msg.content.includes('Общее количество баллов')) {

                    const match = msg.content.match(/Общее количество баллов\s*:\s*\*{0,2}(\d+)\*{0,2}/i);

                    if (match) { lastTotal = parseInt(match[1]); break; }

                }

            }

            const newTotal = lastTotal + points;

            await channel.send(`**${fraction}** +${points} баллов за выполнение достижения.\nПричина: ${reason}\nОбщее количество баллов : **${newTotal}**`);

            await interaction.editReply({ content: `Выдано ${points} баллов **${fraction}**. Общее: **${newTotal}**` });

            await sendLog(new EmbedBuilder().setTitle('GIVE POINTS').setColor(0xffd700).setTimestamp().addFields({ name: 'Фракция', value: fraction }).addFields({ name: 'Баллы', value: String(points) }).addFields({ name: 'Причина', value: reason }).addFields({ name: 'Итого', value: String(newTotal) }).addFields({ name: 'Кем', value: interaction.user.tag }));

        } catch (e) { await interaction.editReply({ content: `Ошибка: ${e.message}` }); }

    }



    else {

        await interaction.reply({ content: 'Неизвестная команда.', flags: 64 });

    }

});



// ==================== BUTTON HANDLERS ====================

async function handleButtonClick(interaction) {

    const { customId } = interaction;

    const member = interaction.member;

    const guild = interaction.guild;



    // --- Menu buttons ---

    if (customId === 'menu_daily') {

        await interaction.showModal(createDailyReportModal());

    } else if (customId === 'menu_weekly') {

        await interaction.showModal(createWeeklyReportModal());

    } else if (customId === 'menu_calls') {

        if (!member.roles.cache.has(config.seniorAdminRoleId)) {

            return interaction.reply({ content: 'Только Senior Administrator может заполнять обзвон.', flags: 64 });

        }

        await interaction.showModal(createCallsModal());

    } else if (customId === 'menu_request') {

        await interaction.showModal(createCommandRequestModal());

    } else if (customId === 'menu_personal') {

        await interaction.showModal(createPersonalDataModal());

    }



    // --- Mod menu buttons ---

    else if (customId === 'mod_ban') {

        if (!member.roles.cache.some(r => r.id === config.headModRoleId)) return interaction.reply({ content: 'Только Head Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_ban_modal', 'Ban', [['member', 'ID пользователя', true], ['reason', 'Причина', true]]));

    } else if (customId === 'mod_temp_ban') {

        if (!member.roles.cache.some(r => r.id === config.headModRoleId)) return interaction.reply({ content: 'Только Head Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_temp_ban_modal', 'Temp Ban', [['member', 'ID пользователя', true], ['time', 'Время (d/h/m)', true], ['reason', 'Причина', true]]));

    } else if (customId === 'mod_unban') {

        if (!member.roles.cache.some(r => r.id === config.headModRoleId)) return interaction.reply({ content: 'Только Head Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_unban_modal', 'Unban', [['member', 'ID пользователя', true], ['reason', 'Причина', true]]));

    } else if (customId === 'mod_timeout') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_timeout_modal', 'Timeout', [['member', 'ID пользователя', true], ['time', 'Время (d/h/m)', true], ['reason', 'Причина', true]]));

    } else if (customId === 'mod_mute') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_mute_modal', 'Mute', [['member', 'ID пользователя', true], ['time', 'Время (d/h/m)', true], ['reason', 'Причина', true]]));

    } else if (customId === 'mod_untimeout') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_untimeout_modal', 'Untimeout', [['member', 'ID пользователя', true], ['reason', 'Причина', true]]));

    } else if (customId === 'mod_unmute') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_unmute_modal', 'Unmute', [['member', 'ID пользователя', true], ['reason', 'Причина', true]]));

    } else if (customId === 'mod_clear') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_clear_modal', 'Clear', [['how', 'Сколько удалить (1-200)', true]]));

    } else if (customId === 'mod_move') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_move_modal', 'Move', [['member', 'ID пользователя', true], ['channel', 'ID канала', true]]));

    } else if (customId === 'mod_role') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_role_modal', 'Role', [['member', 'ID пользователя', true], ['role', 'Название роли', true]]));

    } else if (customId === 'mod_unrole') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_unrole_modal', 'Unrole', [['member', 'ID пользователя', true], ['role', 'Название роли', true]]));

    } else if (customId === 'mod_slowmode') {

        if (!member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id))) return interaction.reply({ content: 'Только Moderator.', flags: 64 });

        await interaction.showModal(createSimpleModal('mod_slowmode_modal', 'Slowmode', [['channel', 'ID канала', true], ['second', 'Секунды (0-120)', true]]));

    }



    // --- Settings buttons ---

    else if (customId === 'settings_auto_role') {

        if (!hasSeniorAdmin(member)) return interaction.reply({ content: 'Только Senior Administrator.', flags: 64 }).catch(() => { /* ignore */ });

        await interaction.showModal(createAutoRoleModal());

    } else if (customId === 'settings_spam') {

        if (!hasSeniorAdmin(member)) return interaction.reply({ content: 'Только Senior Administrator.', flags: 64 }).catch(() => { /* ignore */ });

        await interaction.showModal(createSpamSettingsModal());

    } else if (customId === 'settings_backup') {

        if (!hasSeniorAdmin(member)) return interaction.reply({ content: 'Только Senior Administrator.', flags: 64 }).catch(() => { /* ignore */ });

        await interaction.reply({ content: 'Выберите действие:', components: [createBackupRow()], flags: 64 }).catch(() => { /* ignore */ });

    }



    // --- Backup buttons ---

    else if (customId === 'backup_save_btn') {

        try { await interaction.deferReply({ flags: 64 }); } catch(e) { /* already deferred */ }

        await interaction.update({ content: 'Сохраняю бэкап сервера...', components: [] }).catch(() => { /* ignore */ });

        try {

            const backup = {

                name: guild.name, id: guild.id, created_at: guild.createdAt.toISOString(),

                roles: [], categories: [], text_channels: [], voice_channels: [], emojis: [],

            };

            for (const role of guild.roles.cache.sort((a, b) => b.position - a.position).values()) {

                if (role.id === guild.id) continue;

                backup.roles.push({ name: role.name, id: role.id, color: role.color, hoist: role.hoist, mentionable: role.mentionable, permissions: role.permissions.bitfield.toString(), position: role.position });

            }

            for (const cat of guild.channels.cache.filter(c => c.type === 4).sort((a, b) => a.position - b.position).values()) {

                const catData = { name: cat.name, id: cat.id, position: cat.position, overwrites: serializeOverwrites(cat), channels: [] };

                for (const ch of cat.children.cache.sort((a, b) => a.position - b.position).values()) {

                    catData.channels.push({ name: ch.name, id: ch.id, type: String(ch.type), position: ch.position, topic: ch.topic || null, nsfw: ch.nsfw || false, slowmode_delay: ch.rateLimitPerUser || 0, overwrites: serializeOverwrites(ch) });

                }

                backup.categories.push(catData);

            }

            for (const ch of guild.channels.cache.filter(c => c.type === 0 && !c.parent).values()) {

                backup.text_channels.push({ name: ch.name, id: ch.id, topic: ch.topic || null, nsfw: ch.nsfw || false, slowmode_delay: ch.rateLimitPerUser || 0, position: ch.position, overwrites: serializeOverwrites(ch) });

            }

            for (const ch of guild.channels.cache.filter(c => c.type === 2 && !c.parent).values()) {

                backup.voice_channels.push({ name: ch.name, id: ch.id, position: ch.position, user_limit: ch.userLimit || 0, bitrate: ch.bitrate || 64000, overwrites: serializeOverwrites(ch) });

            }

            for (const emoji of guild.emojis.cache.values()) {

                backup.emojis.push({ name: emoji.name, id: emoji.id, animated: emoji.animated, url: emoji.url });

            }

            const filepath = backupFilePath(guild.id);

            fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

            const embed = makeEmbed({ title: 'Бэкап сохранён', color: 0x00ff00 });

            embed.addFields({ name: 'Файл', value: `backup_${guild.id}.json` });

            await interaction.editReply({ content: null, embeds: [embed] }).catch(() => { /* ignore */ });

            await sendLog(new EmbedBuilder().setTitle('BACKUP SAVED').setColor(0x00ff00).setTimestamp().addFields({ name: 'Сервер', value: guild.name }).addFields({ name: 'Кем', value: interaction.user.tag }));

        } catch (e) { await interaction.editReply({ content: `Ошибка: ${e.message}` }).catch(() => { /* ignore */ }); }

    } else if (customId === 'backup_load_btn') {

        if (!canLoadBackup(member)) return interaction.reply({ content: 'Нет прав.', flags: 64 }).catch(() => { /* ignore */ });

        try { await interaction.deferReply({ flags: 64 }); } catch(e) { /* already deferred */ }

        await interaction.update({ content: 'Загружаю бэкап (удаляю старые каналы и роли, создаю новые)...', components: [] }).catch(() => { /* ignore */ });

        try {

            const filepath = backupFilePath(guild.id);

            if (!fs.existsSync(filepath)) return interaction.editReply({ content: 'Бэкап не найден!' }).catch(() => { /* ignore */ });

            const backup = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

            const result = await performBackupLoad(guild, backup);

            const embed = makeEmbed({ title: 'Бэкап загружен', color: 0x00ff00 });

            embed.addFields({ name: 'Сервер', value: backup.name || 'Нет' });

            embed.addFields({ name: 'Роли создано', value: String(result.roles_created) });

            embed.addFields({ name: 'Каналов создано', value: String(result.channels_created) });

            embed.addFields({ name: 'ID \u0437\u0430\u043c\u0435\u043d\u0435\u043d\u044b', value: 'bot_settings.json, config.json', inline: false });

            try { await interaction.editReply({ content: null, embeds: [embed] }); } catch (e) { /* ignore */ }

            await sendLog(new EmbedBuilder().setTitle('BACKUP LOADED').setColor(0x00ff00).setTimestamp().addFields({ name: 'Сервер', value: backup.name || 'Нет' }).addFields({ name: 'Кем', value: interaction.user.tag }));

        } catch (e) {

            log(`Backup load error: ${e.message}`);

            try { await interaction.editReply({ content: `Ошибка: ${e.message}` }); } catch (e2) { /* ignore */ }

        }

    } else if (customId === 'backup_info_btn') {

        try { await interaction.deferReply({ flags: 64 }); } catch(e) { /* already deferred */ }

        await interaction.update({ content: 'Проверяю бэкап...', components: [] }).catch(() => { /* ignore */ });

        try {

            const filepath = backupFilePath(guild.id);

            if (!fs.existsSync(filepath)) return interaction.editReply({ content: 'Бэкап не найден!' });

            const backup = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

            const embed = makeEmbed({ title: 'Информация о бэкапе', color: 0x0000ff });

            embed.addFields({ name: 'Сервер', value: backup.name || 'Нет' });

            embed.addFields({ name: 'ID', value: String(backup.id || 'Нет') });

            embed.addFields({ name: 'Создан', value: String(backup.created_at || 'Нет').slice(0, 10) });

            const roles = backup.roles || [];

            embed.addFields({ name: 'Роли', value: String(roles.length) });

            if (roles.length > 0) embed.addFields({ name: 'Примеры ролей', value: roles.slice(0, 10).map(r => r.name).join(', '), inline: false });

            const cats = backup.categories || [];

            embed.addFields({ name: 'Категории', value: String(cats.length) });

            const totalCh = cats.reduce((s, c) => s + (c.channels || []).length, 0);

            embed.addFields({ name: 'Каналы', value: String(totalCh) });

            embed.addFields({ name: 'Эмодзи', value: String((backup.emojis || []).length) });

            await interaction.editReply({ content: null, embeds: [embed] }).catch(() => { /* ignore */ });

        } catch (e) { await interaction.editReply({ content: `Ошибка: ${e.message}` }).catch(() => { /* ignore */ }); }

    }



    // --- Request approval buttons ---

    else if (customId === 'approve_request' || customId === 'reject_request') {

        const embed = interaction.message.embeds[0];

        const userIdField = embed.footer?.text?.match(/User ID: (\d+)/);

        const userId = userIdField ? userIdField[1] : null;

        const commandName = embed.fields?.find(f => f.name === 'Команда')?.value;

        const isApprove = customId === 'approve_request';

        if (isApprove) {

            if (userId) {

                const user = await guild.members.fetch(userId).catch(() => null);

                if (user) try { await user.send(`Ваш запрос команды \`${commandName}\` принят.`); } catch (e) { /* ignore */ }

            }

            const newEmbed = makeEmbed({ title: 'Запрос одобрен', description: `Команда: \`${commandName}\`\nЗапросил: <@${userId}>\nОдобрил: ${interaction.user}`, color: 0x00ff00 });

            await interaction.update({ embeds: [newEmbed], components: [] });

            log(`Request approved: ${commandName} by ${interaction.user.tag}`);

        } else {

            if (userId) {

                const user = await guild.members.fetch(userId).catch(() => null);

                if (user) try { await user.send(`Ваш запрос команды \`${commandName}\` отклонён.`); } catch (e) { /* ignore */ }

            }

            const newEmbed = makeEmbed({ title: 'Запрос отклонён', description: `Команда: \`${commandName}\`\nЗапросил: <@${userId}>\nОтклонил: ${interaction.user}`, color: 0xff0000 });

            await interaction.update({ embeds: [newEmbed], components: [] });

            log(`Request rejected: ${commandName} by ${interaction.user.tag}`);

        }

    }



    // --- Helper apply ---

    else if (customId === 'helper_apply') {

        await interaction.showModal(createHelperRequestModal());

    }



    // --- Media apply ---

    else if (customId === 'media_apply') {

        await interaction.showModal(createMediaRequestModal());

    } else if (customId === 'media_report') {

        await interaction.showModal(createMediaReportModal());

    }



    // --- Media request form/report form ---

    else if (customId === 'media_request_form') {

        await interaction.showModal(createMediaRequestFormModal());

    } else if (customId === 'media_report_form') {

        await interaction.showModal(createMediaReportFormModal());

    }



    // --- Leader apply ---

    else if (customId === 'leader_apply') {

        await interaction.showModal(createLeaderRequestModal());

    }



    // --- Achievement apply ---

    else if (customId === 'achievement_apply') {

        await interaction.showModal(createAchievementModal());

    }



    // --- Vacation apply ---

    else if (customId === 'vacation_apply') {

        await interaction.showModal(createVacationModal());

    }



    // --- Request / Helper / Media / Leader / Achievement / Vacation approve/reject/take ---

    else if (customId.endsWith('_approve') || customId.endsWith('_decline') || customId.endsWith('_take')) {

        await handleReviewButton(interaction, customId);

    }



    // --- Game modal buttons ---

    else if (customId.startsWith('game_')) {

        await handleGameButton(interaction, customId);

    }



    else {

        await interaction.reply({ content: 'Неизвестная кнопка.', flags: 64 }).catch(() => { /* ignore */ });

    }

}



// ==================== REVIEW BUTTONS ====================

async function handleReviewButton(interaction, customId) {

    // --- ПРОВЕРКА ПРАВ: только модераторы могут управлять заявками ---

    if (!hasModRole(interaction.member) && !hasSeniorAdmin(interaction.member) && !isCreator(interaction.member)) {

        try { await interaction.reply({ content: 'У вас нет прав для управления заявками.', flags: 64 }); } catch(e) { /* ignore */ }

        return;

    }



    const msg = interaction.message;

    const embed = msg.embeds[0];

    if (!embed) {

        try { await interaction.reply({ content: 'Ошибка: нет embed.', flags: 64 }); } catch(e) { /* ignore */ }

        return;

    }



    const applicantId = msg.mentions.users.first()?.id || extractUserIdFromEmbed(embed);

    const applicant = applicantId ? await interaction.guild.members.fetch(applicantId).catch(() => null) : null;

    const isApprove = customId.endsWith('_approve');

    const isDecline = customId.endsWith('_decline');

    const isTake = customId.endsWith('_take');



    const type = customId.includes('helper') ? 'helper' :

                 customId.includes('media_report') ? 'media_report' :

                 customId.includes('media_request') ? 'media_request' :

                 customId.includes('media') ? 'media' :

                 customId.includes('leader') ? 'leader' :

                 customId.includes('achievement') ? 'achievement' :

                 customId.includes('vacation') ? 'vacation' : 'request';



    // Check if already reviewed

    if (msg.components.length === 0 || (msg.components[0]?.components || []).every(c => c.disabled)) {

        try { await interaction.reply({ content: 'Заявка уже рассмотрена.', flags: 64 }); } catch(e) { /* ignore */ }

        return;

    }



    if (isTake) {

        const embed2 = makeEmbed({ title: embed.title || 'Заявка', color: 0x808080 });

        embed2.setDescription(`Заявка взята на **рассмотрение** модератором **${interaction.user}**`);

        await interaction.channel.send({ embeds: [embed2] });

        try { await interaction.reply({ content: 'Вы взяли заявку на рассмотрение.', flags: 64 }); } catch(e) { /* ignore */ }

        return;

    }



    if (isDecline) {

        const modal = new ModalBuilder().setCustomId(`decline_${type}_${msg.id}`).setTitle('Причина отказа');

        const reasonInput = new TextInputBuilder().setCustomId('reason').setLabel('Причина отказа').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

        await interaction.showModal(modal);

        return;

    }



    // Approve

    const newEmbed = makeEmbed({ title: `${embed.title || 'Заявка'} одобрена`, color: 0x00ff00 });

    newEmbed.addFields({ name: 'Кем', value: interaction.user.toString() });

    await interaction.channel.send({ embeds: [newEmbed] });

    if (applicant) {

        try { await applicant.send(`Ваша заявка ${interaction.channel.name} принята - ${interaction.user}`); } catch (e) { /* ignore */ }

    }



    // Disable buttons

    for (const row of msg.components) {

        for (const comp of row.components) {

            comp.disabled = true;

        }

    }

    await interaction.update({ components: msg.components });



    // Auto-delete channel for certain types

    if (['request', 'helper', 'media', 'leader'].includes(type)) {

        setTimeout(async () => {

            try { await interaction.channel.delete(`Заявка одобрена`); } catch (e) { /* ignore */ }

        }, 5000);

    }



    // Handle achievement points

    if (type === 'achievement') {

        const factionField = embed.fields?.find(f => f.name === 'Фракция');

        const pointsField = embed.fields?.find(f => f.name === 'Баллы');

        if (factionField && pointsField) {

            const pointsCh = interaction.guild.channels.cache.get(config.achievementPointsChannelId);

            if (pointsCh) {

                const faction = factionField.value;

                const points = parseInt(pointsField.value) || 5;

                try {

                    let lastPoints = 0;

                    const msgs = await pointsCh.messages.fetch({ limit: 100 });

                    const fracLower = faction.toLowerCase();

                    for (const m of msgs.values()) {

                        if (m.author.id === interaction.client.user.id && m.content.toLowerCase().includes(fracLower) && m.content.includes('Общее количество баллов')) {

                            const match = m.content.match(/Общее количество баллов\s*:\s*\*{0,2}(\d+)\*{0,2}/i);

                            if (match) { lastPoints = parseInt(match[1]); break; }

                        }

                    }

                    const newPoints = lastPoints + points;

                    await pointsCh.send(`**${faction}** +${points} баллов за выполнение достижения.\nПричина: —\nОбщее количество баллов : **${newPoints}**`);

                } catch (e) { log(`Achievement points error: ${e.message}`); }

            }

        }

    }



    // Vacation log

    if (type === 'vacation' && isApprove) {

        const vacCh = interaction.guild.channels.cache.get(config.vacationChannelId);

        if (vacCh) {

            const vacEmbed = makeEmbed({ title: 'Отпуск', color: 0x0000ff });

            vacEmbed.addFields({ name: 'Сотрудник', value: applicant ? applicant.toString() : 'N/A', inline: true });

            vacEmbed.addFields({ name: 'Одобрил', value: interaction.user.toString(), inline: true });

            await vacCh.send({ embeds: [vacEmbed] });

        }

    }



    await interaction.reply({ content: `${isApprove ? 'Одобрено' : 'Отклонено'}.`, flags: 64 }).catch(() => { /* ignore */ });

}



// ==================== REQUEST CHANNEL CREATION ====================

// Discord лимит: максимум 50 каналов в категории.

// Если категория заявок переполнена, удаляем только СТАРЫЕ каналы-заявки,

// чтобы новая заявка не падала с CHANNEL_PARENT_MAX_CHANNELS (50035),

// но при этом не удалять свежие/активные заявки (лидер, медиа, хелпер и т.п.).

const MAX_REQUEST_CATEGORY_CHANNELS = 50;

const MAX_CLEANUP_PER_REQUEST = 5;

const REQUEST_CHANNEL_MAX_AGE_DAYS = 14; // удаляем только каналы старше этого возраста

const REQUEST_CHANNEL_MIN_AGE_MS = REQUEST_CHANNEL_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;



async function createRequestChannel(guild, category, { name, topic, userId, allowedRoleIds = [] }) {

    if (!category) throw new Error('Категория заявок не найдена.');



    try {

        // Лимит Discord считает ВСЕ каналы категории (текст + голос).

        const allChildren = [...category.children.cache.values()];

        const overflow = allChildren.length - (MAX_REQUEST_CATEGORY_CHANNELS - 1);

        if (overflow > 0) {

            // Удаляем только самые старые каналы-заявки, которым уже больше

            // REQUEST_CHANNEL_MAX_AGE_DAYS дней. Свежие и активные заявки

            // (лидер/медиа/хелпер и т.п.) не трогаем.

            const cutoff = Date.now() - REQUEST_CHANNEL_MIN_AGE_MS;

            const oldTextChildren = allChildren

                .filter((c) => c.type === 0 && c.createdAt && c.createdAt.getTime() <= cutoff)

                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

            const toDelete = oldTextChildren.slice(0, Math.min(overflow, MAX_CLEANUP_PER_REQUEST));

            for (const old of toDelete) {

                try {

                    await old.delete(`Категория заявок переполнена — освобождение места для новой заявки`);

                    log(`[request-channel] deleted old channel ${old.name} (created ${old.createdAt.toISOString()})`);

                } catch (e) {

                    log(`[request-channel] failed to delete ${old.name}: ${e.message}`);

                }

            }

            if (oldTextChildren.length === 0) {

                log(`[request-channel] category full (${allChildren.length} channels), but no channels older than ${REQUEST_CHANNEL_MAX_AGE_DAYS} days to delete — trying to create anyway`);

            }

        }

    } catch (e) {

        log(`[request-channel] cleanup check failed: ${e.message}`);

    }



    // Создаём канал сразу закрытым, чтобы заявку не увидел весь сервер.

    // Просто deny @everyone недостаточно: если у ролей есть ViewChannel в

    // категории, их allow на дочернем канале перекроет общий deny.

    const allowedSet = new Set(allowedRoleIds.filter(Boolean).map(String));

    const permissionOverwrites = [];



    // 1) всем — не видно

    permissionOverwrites.push({ id: guild.roles.everyone.id, type: 0, deny: ['ViewChannel'] });



    // 2) автору — видно и можно писать

    if (userId) {

        permissionOverwrites.push({ id: String(userId), type: 1, allow: ['ViewChannel', 'SendMessages'] });

    }



    // 3) допущенным ролям (GA/ZGA/PR и т.п.)

    for (const roleId of allowedSet) {

        permissionOverwrites.push({ id: roleId, type: 0, allow: ['ViewChannel', 'SendMessages'] });

    }



    // 4) ролям, у которых есть ViewChannel в категории, но их нет в списке

    //    допущенных — явный запрет на дочернем канале.

    for (const ow of category.permissionOverwrites.cache.values()) {

        if (ow.type !== 0) continue; // только роли

        const roleId = String(ow.id);

        if (allowedSet.has(roleId)) continue;

        if (ow.allow.has('ViewChannel')) {

            permissionOverwrites.push({ id: roleId, type: 0, deny: ['ViewChannel'] });

        }

    }



    return guild.channels.create({ name, type: 0, parent: category.id, topic, permissionOverwrites });

}



// ==================== MODAL HANDLERS ====================

async function handleModalSubmit(interaction) {

    const { customId } = interaction;

    const guild = interaction.guild;

    const member = interaction.member;



    // --- Daily report ---

    if (customId === 'daily_report_modal') {

        if (!gsDaily) return interaction.reply({ content: 'Ошибка: Google Sheets не подключена.', flags: 64 });

        await interaction.deferReply({ flags: 64 });

        const user = interaction.user.tag;

        const staticId = interaction.fields.getTextInputValue('static_id');

        const reports = interaction.fields.getTextInputValue('reports_closed');

        const punishments = interaction.fields.getTextInputValue('punishments_given');

        const mp = interaction.fields.getTextInputValue('mp_conducted');

        const date = interaction.fields.getTextInputValue('date');

        try { await gsDaily.appendRow([user, staticId, reports, punishments, mp, date]); log(`Daily report from ${user}`); await interaction.editReply({ content: `Ежедневный отчёт принят! ${interaction.user}` }).catch(() => { /* ignore */ }); } catch (e) { await interaction.editReply({ content: `Ошибка: ${e.message}` }).catch(() => { /* ignore */ }); }

        return;

    }



    // --- Weekly report ---

    if (customId === 'weekly_report_modal') {

        if (!gsWeekly) return interaction.reply({ content: 'Ошибка: Google Sheets не подключена.', flags: 64 });

        await interaction.deferReply({ flags: 64 });

        const user = interaction.user.tag;

        const staticId = interaction.fields.getTextInputValue('static_id');

        const reports = interaction.fields.getTextInputValue('reports_closed');

        const punishments = interaction.fields.getTextInputValue('punishments_given');

        const mp = interaction.fields.getTextInputValue('mp_conducted');

        const date = interaction.fields.getTextInputValue('date');

        try { await gsWeekly.appendRow([user, staticId, reports, punishments, mp, date]); log(`Weekly report from ${user}`); await interaction.editReply({ content: `Недельный отчёт принят! ${interaction.user}` }).catch(() => { /* ignore */ }); } catch (e) { await interaction.editReply({ content: `Ошибка: ${e.message}` }).catch(() => { /* ignore */ }); }

        return;

    }



    // --- Calls ---

    if (customId === 'calls_modal') {

        if (!gsCalls) return interaction.reply({ content: 'Ошибка: Google Sheets не подключена.', flags: 64 });

        await interaction.deferReply({ flags: 64 });

        const user = interaction.user.tag;

        const candidate = interaction.fields.getTextInputValue('candidate_discord');

        const info = interaction.fields.getTextInputValue('candidate_info');

        const scores = interaction.fields.getTextInputValue('scores');

        const link = interaction.fields.getTextInputValue('call_link');

        try { await gsCalls.appendRow([user, candidate, info, scores, link]); log(`Call from ${user}`); await interaction.editReply({ content: `Обзвон записан! ${interaction.user}` }).catch(() => { /* ignore */ }); } catch (e) { await interaction.editReply({ content: `Ошибка: ${e.message}` }).catch(() => { /* ignore */ }); }

        return;

    }



    // --- Personal data ---

    if (customId === 'personal_data_modal') {

        if (!gsStaff) return interaction.reply({ content: 'Ошибка: Google Sheets не подключена.', flags: 64 }).catch(() => { /* ignore */ });

        await interaction.deferReply({ flags: 64 });

        const user = interaction.user.tag;

        const nick = interaction.fields.getTextInputValue('nick');

        const adminLevel = interaction.fields.getTextInputValue('admin_level');

        const date = interaction.fields.getTextInputValue('appointment_date');

        const position = interaction.fields.getTextInputValue('position');

        try { await gsStaff.appendRow([user, nick, adminLevel, date, position]); log(`Personal data from ${user}`); await interaction.editReply({ content: `Данные записаны! ${interaction.user}` }).catch(() => { /* ignore */ }); } catch (e) { await interaction.editReply({ content: `Ошибка: ${e.message}` }).catch(() => { /* ignore */ }); }

        return;

    }



    // --- Command request ---

    if (customId === 'command_request_modal') {

        await interaction.deferReply({ flags: 64 });

        const commandName = interaction.fields.getTextInputValue('command_name');

        const staticId = interaction.fields.getTextInputValue('static_id');

        log(`Command request from ${interaction.user.tag}: ${commandName}`);

        const embed = makeEmbed({ title: 'Запрос команды', color: 0xffd700 });

        embed.addFields({ name: 'Команда', value: commandName, inline: false });

        embed.addFields({ name: 'Static ID', value: staticId, inline: false });

        embed.addFields({ name: 'Запросил', value: `${interaction.user} (${interaction.user.id})`, inline: false });

        embed.setFooter({ text: `User ID: ${interaction.user.id}` });

        const channel = guild.channels.cache.get(config.requestChannelId);

        if (channel) {

            await channel.send({

                embeds: [embed],

                components: [new ActionRowBuilder().addComponents(

                    new ButtonBuilder().setCustomId('approve_request').setLabel('Одобрить').setStyle(ButtonStyle.Success),

                    new ButtonBuilder().setCustomId('reject_request').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

                )]

            });

        }

        await interaction.editReply({ content: `Запрос команды \`${commandName}\` отправлен на рассмотрение.` }).catch(() => { /* ignore */ });

        return;

    }



    // --- Request to department ---

    if (customId === 'request_to_department_modal') {

        await interaction.deferReply({ flags: 64 });

        const reqNum = (settings.request_counter || 0) + 1;

        settings.request_counter = reqNum;

        saveSettings(settings);

        const staticId = interaction.fields.getTextInputValue('static_id');

        const department = interaction.fields.getTextInputValue('department');

        const experience = interaction.fields.getTextInputValue('experience');

        const category = guild.channels.cache.get(config.requestCategoryId);

        if (!category) return await interaction.editReply({ content: 'Категория не найдена.' }).catch(() => { /* ignore */ });

        const gaRole = guild.roles.cache.get(config.gaRoleId);

        const zgaRole = guild.roles.cache.get(config.zgaRoleId);

        const headPrRole = guild.roles.cache.get(config.headPrRoleId);

        const rukRole = guild.roles.cache.get(config.rukRoleId);

        const channel = await createRequestChannel(guild, category, { name: `заявка-в-отдел-${reqNum}`, topic: `Заявка #${reqNum} от ${interaction.user}`, userId: interaction.user.id, allowedRoleIds: [gaRole, zgaRole, headPrRole, rukRole].filter(Boolean).map(r => r.id) });

        const embed = makeEmbed({ title: `Заявка в отдел #${reqNum}`, color: 0x0000ff });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Static ID', value: staticId, inline: true });

        embed.addFields({ name: 'Отдел', value: department, inline: true });

        embed.addFields({ name: 'Опыт', value: experience, inline: false });

        const mentions = [gaRole, zgaRole, headPrRole, rukRole].filter(Boolean).map(r => r.toString()).join(' ');

        const view = new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('request_take').setLabel('Взять на рассмотрение').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId('request_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('request_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        );

        await channel.send({ content: mentions, embeds: [embed], components: [view] });

        await interaction.editReply({ content: `Заявка создана: ${channel}` }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('REQUEST TO DEPARTMENT').setColor(0x0000ff).setTimestamp().addFields({ name: 'Заявитель', value: interaction.user.tag }).addFields({ name: 'Static ID', value: staticId }).addFields({ name: 'Отдел', value: department }).addFields({ name: 'Канал', value: channel.name }));

        return;

    }



    // --- Helper request ---

    if (customId === 'helper_request_modal') {

        await interaction.deferReply({ flags: 64 });

        const reqNum = (settings.helper_counter || 0) + 1;

        settings.helper_counter = reqNum;

        saveSettings(settings);

        const staticId = interaction.fields.getTextInputValue('static_id');

        const timeOnServer = interaction.fields.getTextInputValue('time_on_server');

        const whyHelper = interaction.fields.getTextInputValue('why_helper');

        const whatCanHelp = interaction.fields.getTextInputValue('what_can_help');

        const experience = interaction.fields.getTextInputValue('experience');

        const category = guild.channels.cache.get(config.requestCategoryId);

        const gaRole = guild.roles.cache.get(config.gaRoleId);

        const zgaRole = guild.roles.cache.get(config.zgaRoleId);

        const mediaCurator = guild.roles.cache.get(config.mediaCuratorRoleId);

        const channel = await createRequestChannel(guild, category, { name: `заявка-на-хелпера-${reqNum}`, topic: `Заявка на хелпера #${reqNum} от ${interaction.user}`, userId: interaction.user.id, allowedRoleIds: [gaRole, zgaRole, mediaCurator].filter(Boolean).map(r => r.id) });

        for (const role of [gaRole, zgaRole, mediaCurator].filter(Boolean)) {

            await channel.permissionOverwrites.create(role, { ViewChannel: true, SendMessages: true });

        }

        const embed = makeEmbed({ title: `Заявка на хелпера #${reqNum}`, color: 0xffa500 });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Static ID', value: staticId, inline: true });

        embed.addFields({ name: 'На сервере', value: timeOnServer, inline: true });

        embed.addFields({ name: 'Почему хелпер', value: whyHelper, inline: false });

        embed.addFields({ name: 'Чем помочь', value: whatCanHelp, inline: false });

        embed.addFields({ name: 'Опыт', value: experience, inline: false });

        const mentions = [gaRole, zgaRole].filter(Boolean).map(r => r.toString()).join(' ');

        const view = new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('helper_take').setLabel('Взять на рассмотрение').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId('helper_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('helper_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        );

        await channel.send({ content: mentions, embeds: [embed], components: [view] });

        await interaction.editReply({ content: `Заявка создана: ${channel}` }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('HELPER REQUEST').setColor(0xffa500).setTimestamp().addFields({ name: 'Заявитель', value: interaction.user.tag }).addFields({ name: 'Static ID', value: staticId }).addFields({ name: 'Канал', value: channel.name }));

        return;

    }



    // --- Media request (first form) ---

    if (customId === 'media_request_modal') {

        await interaction.deferReply({ flags: 64 });

        const reqNum = (settings.media_counter || 0) + 1;

        settings.media_counter = reqNum;

        saveSettings(settings);

        const staticId = interaction.fields.getTextInputValue('static_id');

        const whyMedia = interaction.fields.getTextInputValue('why_media');

        const experience = interaction.fields.getTextInputValue('experience');

        const whatCanDo = interaction.fields.getTextInputValue('what_can_do');

        const portfolio = interaction.fields.getTextInputValue('portfolio');

        const category = guild.channels.cache.get(config.requestCategoryId);

        const headPrRole = guild.roles.cache.get(config.headPrRoleId);

        const mediaRole = guild.roles.cache.get(config.mediaCuratorRoleId);

        const channel = await createRequestChannel(guild, category, { name: `заявка-на-медиа-${reqNum}`, topic: `Заявка на медиа #${reqNum} от ${interaction.user}`, userId: interaction.user.id, allowedRoleIds: [headPrRole, mediaRole].filter(Boolean).map(r => r.id) });

        for (const role of [headPrRole, mediaRole].filter(Boolean)) {

            await channel.permissionOverwrites.create(role, { ViewChannel: true, SendMessages: true });

        }

        const embed = makeEmbed({ title: `Заявка на медиа #${reqNum}`, color: 0x800080 });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Static ID', value: staticId, inline: true });

        embed.addFields({ name: 'Почему медиа', value: whyMedia, inline: false });

        embed.addFields({ name: 'Опыт', value: experience, inline: false });

        embed.addFields({ name: 'Что умею', value: whatCanDo, inline: false });

        if (portfolio) embed.addFields({ name: 'Портфолио', value: portfolio, inline: false });

        const mentions = [headPrRole, mediaRole].filter(Boolean).map(r => r.toString()).join(' ');

        const view = new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('media_take').setLabel('Взять на рассмотрение').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId('media_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('media_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        );

        await channel.send({ content: mentions, embeds: [embed], components: [view] });

        await interaction.editReply({ content: `Заявка создана: ${channel}` }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('MEDIA REQUEST').setColor(0x800080).setTimestamp().addFields({ name: 'Заявитель', value: interaction.user.tag }).addFields({ name: 'Static ID', value: staticId }).addFields({ name: 'Канал', value: channel.name }));

        return;

    }



    // --- Media request form (simple) ---

    if (customId === 'media_request_form_modal') {

        await interaction.deferReply({ flags: 64 });

        const nick = interaction.fields.getTextInputValue('nick');

        const staticId = interaction.fields.getTextInputValue('static_id');

        const whatWant = interaction.fields.getTextInputValue('what_want');

        const why = interaction.fields.getTextInputValue('why');

        const category = guild.channels.cache.get(config.requestCategoryId);

        if (!category) return await interaction.editReply({ content: 'Категория не найдена.' }).catch(() => { /* ignore */ });

        const reqNum = (settings.media_request_form_counter || 0) + 1;

        settings.media_request_form_counter = reqNum;

        saveSettings(settings);

        const headPrRole = guild.roles.cache.get(config.headPrRoleId);

        const mediaCurator = guild.roles.cache.get(config.mediaCuratorRoleId);

        const prAssistant = guild.roles.cache.get(config.prAssistantRoleId);

        const channel = await createRequestChannel(guild, category, { name: `media-запрос-${reqNum}`, topic: `Media запрос #${reqNum} от ${interaction.user}`, userId: interaction.user.id, allowedRoleIds: [headPrRole, mediaCurator, prAssistant].filter(Boolean).map(r => r.id) });

        for (const role of [headPrRole, mediaCurator, prAssistant].filter(Boolean)) {

            await channel.permissionOverwrites.create(role, { ViewChannel: true, SendMessages: true });

        }

        const embed = makeEmbed({ title: `Media запрос от ${nick}`, color: 0x0000ff });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Static ID', value: staticId, inline: true });

        embed.addFields({ name: 'Ник', value: nick, inline: true });

        embed.addFields({ name: 'Что хотите', value: whatWant, inline: false });

        embed.addFields({ name: 'Зачем', value: why, inline: false });

        const mentions = [headPrRole, mediaCurator, prAssistant].filter(Boolean).map(r => r.toString()).join(' ');

        await channel.send({ content: mentions, embeds: [embed], components: [new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('media_request_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('media_request_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        )] });

        await interaction.editReply({ content: `Запрос отправлен: ${channel}` }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('MEDIA REQUEST').setColor(0x0000ff).setTimestamp().addFields({ name: 'От кого', value: interaction.user.tag }).addFields({ name: 'Ник', value: nick }).addFields({ name: 'Канал', value: channel.name }));

        return;

    }



    // --- Media report form ---

    if (customId === 'media_report_form_modal') {

        await interaction.deferReply({ flags: 64 });

        const nick = interaction.fields.getTextInputValue('nick');

        const staticId = interaction.fields.getTextInputValue('static_id');

        const whatGet = interaction.fields.getTextInputValue('what_get');

        const workDone = interaction.fields.getTextInputValue('work_done');

        const category = guild.channels.cache.get(config.requestCategoryId);

        if (!category) return await interaction.editReply({ content: 'Категория не найдена.' }).catch(() => { /* ignore */ });

        const reqNum = (settings.media_report_form_counter || 0) + 1;

        settings.media_report_form_counter = reqNum;

        saveSettings(settings);

        const headPrRole = guild.roles.cache.get(config.headPrRoleId);

        const mediaCurator = guild.roles.cache.get(config.mediaCuratorRoleId);

        const prAssistant = guild.roles.cache.get(config.prAssistantRoleId);

        const channel = await createRequestChannel(guild, category, { name: `media-отчет-${reqNum}`, topic: `Media отчет #${reqNum} от ${interaction.user}`, userId: interaction.user.id, allowedRoleIds: [headPrRole, mediaCurator, prAssistant].filter(Boolean).map(r => r.id) });

        for (const role of [headPrRole, mediaCurator, prAssistant].filter(Boolean)) {

            await channel.permissionOverwrites.create(role, { ViewChannel: true, SendMessages: true });

        }

        const embed = makeEmbed({ title: `Media отчет от ${nick}`, color: 0xffa500 });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Static ID', value: staticId, inline: true });

        embed.addFields({ name: 'Ник', value: nick, inline: true });

        embed.addFields({ name: 'Что хотите получить', value: whatGet, inline: false });

        embed.addFields({ name: 'Проделанная работа', value: workDone, inline: false });

        const mentions = [headPrRole, mediaCurator, prAssistant].filter(Boolean).map(r => r.toString()).join(' ');

        await channel.send({ content: mentions, embeds: [embed], components: [new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('media_report_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('media_report_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        )] });

        await interaction.editReply({ content: `Отчет отправлен: ${channel}` }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('MEDIA REPORT').setColor(0xffa500).setTimestamp().addFields({ name: 'От кого', value: interaction.user.tag }).addFields({ name: 'Ник', value: nick }).addFields({ name: 'Канал', value: channel.name }));

        return;

    }



    // --- Media report (channel modal) ---

    if (customId === 'media_report_modal') {

        await interaction.deferReply({ flags: 64 });

        const nick = interaction.fields.getTextInputValue('nick');

        const staticId = interaction.fields.getTextInputValue('static_id');

        const whatGet = interaction.fields.getTextInputValue('what_get');

        const workDone = interaction.fields.getTextInputValue('work_done');

        const category = guild.channels.cache.get(config.requestCategoryId);

        if (!category) return await interaction.editReply({ content: 'Категория не найдена.' }).catch(() => { /* ignore */ });

        const reqNum = (settings.media_report_counter || 0) + 1;

        settings.media_report_counter = reqNum;

        saveSettings(settings);

        const headPrRole = guild.roles.cache.get(config.headPrRoleId);

        const mediaCurator = guild.roles.cache.get(config.mediaCuratorRoleId);

        const prAssistant = guild.roles.cache.get(config.prAssistantRoleId);

        const channel = await createRequestChannel(guild, category, { name: `media-отчет-${reqNum}`, topic: `Media отчет #${reqNum} от ${interaction.user}`, userId: interaction.user.id, allowedRoleIds: [headPrRole, mediaCurator, prAssistant].filter(Boolean).map(r => r.id) });

        for (const role of [headPrRole, mediaCurator, prAssistant].filter(Boolean)) {

            await channel.permissionOverwrites.create(role, { ViewChannel: true, SendMessages: true });

        }

        const embed = makeEmbed({ title: `Media отчет от ${nick}`, color: 0xffa500 });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Static ID', value: staticId, inline: true });

        embed.addFields({ name: 'Ник', value: nick, inline: true });

        embed.addFields({ name: 'Что хотите получить', value: whatGet, inline: false });

        embed.addFields({ name: 'Проделанная работа', value: workDone, inline: false });

        const mentions = [headPrRole, mediaCurator, prAssistant].filter(Boolean).map(r => r.toString()).join(' ');

        await channel.send({ content: mentions, embeds: [embed], components: [new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('media_report_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('media_report_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        )] });

        await interaction.editReply({ content: `Отчет отправлен: ${channel}` }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('MEDIA REPORT').setColor(0xffa500).setTimestamp().addFields({ name: 'От кого', value: interaction.user.tag }).addFields({ name: 'Ник', value: nick }).addFields({ name: 'Канал', value: channel.name }));

        return;

    }



    // --- Leader request ---

    if (customId === 'leader_request_modal') {

        await interaction.deferReply({ flags: 64 });

        const reqNum = (settings.leader_counter || 0) + 1;

        settings.leader_counter = reqNum;

        saveSettings(settings);

        const staticId = interaction.fields.getTextInputValue('static_id');

        const faction = interaction.fields.getTextInputValue('faction');

        const whyLeader = interaction.fields.getTextInputValue('why_leader');

        const experience = interaction.fields.getTextInputValue('experience');

        const whatWillDo = interaction.fields.getTextInputValue('what_will_do');

        const category = guild.channels.cache.get(config.requestCategoryId);

        const gaRole = guild.roles.cache.get(config.gaRoleId);

        const zgaRole = guild.roles.cache.get(config.zgaRoleId);

        const channel = await createRequestChannel(guild, category, { name: `заявка-на-лидерку-${reqNum}`, topic: `Заявка на лидерку #${reqNum} от ${interaction.user}`, userId: interaction.user.id, allowedRoleIds: [gaRole, zgaRole].filter(Boolean).map(r => r.id) });

        for (const role of [gaRole, zgaRole].filter(Boolean)) {

            await channel.permissionOverwrites.create(role, { ViewChannel: true, SendMessages: true });

        }

        const embed = makeEmbed({ title: `Заявка на лидерку #${reqNum}`, color: 0x0000ff });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Static ID', value: staticId, inline: true });

        embed.addFields({ name: 'Фракция', value: faction, inline: true });

        embed.addFields({ name: 'Почему лидер', value: whyLeader, inline: false });

        embed.addFields({ name: 'Опыт', value: experience, inline: false });

        embed.addFields({ name: 'Что будете делать', value: whatWillDo, inline: false });

        const mentions = [gaRole, zgaRole].filter(Boolean).map(r => r.toString()).join(' ');

        const view = new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('leader_take').setLabel('Взять на рассмотрение').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId('leader_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('leader_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        );

        await channel.send({ content: mentions, embeds: [embed], components: [view] });

        await interaction.editReply({ content: `Заявка создана: ${channel}` }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('LEADER REQUEST').setColor(0x0000ff).setTimestamp().addFields({ name: 'Заявитель', value: interaction.user.tag }).addFields({ name: 'Static ID', value: staticId }).addFields({ name: 'Канал', value: channel.name }));

        return;

    }



    // --- Achievement ---

    if (customId === 'achievement_modal') {

        await interaction.deferReply({ flags: 64 });

        const faction = interaction.fields.getTextInputValue('faction');

        const achievement = interaction.fields.getTextInputValue('achievement');

        const achievementType = interaction.fields.getTextInputValue('achievement_type');

        const evidence = interaction.fields.getTextInputValue('evidence');

        const channel = guild.channels.cache.get(config.achievementReviewChannelId);

        if (!channel) return await interaction.editReply({ content: 'Канал не найден!' });

        const isWeekly = achievementType.toLowerCase().includes('еженедельн');

        const points = isWeekly ? 10 : 5;

        const embed = makeEmbed({ title: `Достижение от ${interaction.user}`, color: 0xffd700 });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Фракция', value: faction, inline: true });

        embed.addFields({ name: 'Тип', value: isWeekly ? 'Еженедельное' : 'Ежедневное', inline: true });

        embed.addFields({ name: 'Баллы', value: String(points), inline: true });

        embed.addFields({ name: 'Достижение', value: achievement, inline: false });

        embed.addFields({ name: 'Доказательства', value: evidence, inline: false });

        const gaRole = guild.roles.cache.get(config.gaRoleId);

        const zgaRole = guild.roles.cache.get(config.zgaRoleId);

        const curatorRole = guild.roles.cache.get(config.curatorRoleId);

        const mentions = [gaRole, zgaRole, curatorRole].filter(Boolean).map(r => r.toString()).join(' ');

        const view = new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('achievement_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('achievement_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        );

        await channel.send({ content: mentions, embeds: [embed], components: [view] });

        await interaction.editReply({ content: 'Достижение отправлено на рассмотрение!' }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('ACHIEVEMENT').setColor(0xffd700).setTimestamp().addFields({ name: 'От кого', value: interaction.user.tag }).addFields({ name: 'Фракция', value: faction }).addFields({ name: 'Баллы', value: String(points) }));

        return;

    }



    // --- Vacation ---

    if (customId === 'vacation_modal') {

        await interaction.deferReply({ flags: 64 });

        const reason = interaction.fields.getTextInputValue('reason');

        const duration = interaction.fields.getTextInputValue('duration');

        const channel = guild.channels.cache.get(config.vacationReviewChannelId);

        if (!channel) return await interaction.editReply({ content: 'Канал не найден!' });

        const embed = makeEmbed({ title: `Заявка на отпуск от ${interaction.user}`, color: 0x0000ff });

        embed.addFields({ name: 'Discord User', value: interaction.user.toString(), inline: true });

        embed.addFields({ name: 'Причина', value: reason, inline: false });

        embed.addFields({ name: 'Срок', value: `${duration} дн.`, inline: true });

        const gaRole = guild.roles.cache.get(config.gaRoleId);

        const zgaRole = guild.roles.cache.get(config.zgaRoleId);

        const mentions = [gaRole, zgaRole].filter(Boolean).map(r => r.toString()).join(' ');

        const view = new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId('vacation_approve').setLabel('Одобрить').setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId('vacation_decline').setLabel('Отклонить').setStyle(ButtonStyle.Danger)

        );

        await channel.send({ content: mentions, embeds: [embed], components: [view] });

        await interaction.editReply({ content: 'Заявка на отпуск отправлена!' }).catch(() => { /* ignore */ });

        await sendLog(new EmbedBuilder().setTitle('VACATION REQUEST').setColor(0x0000ff).setTimestamp().addFields({ name: 'От кого', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }).addFields({ name: 'Срок', value: `${duration} дн.` }));

        return;

    }



    // --- Decline reason modals ---

    if (customId.startsWith('decline_')) {

        const reason = interaction.fields.getTextInputValue('reason');

        const msg = interaction.message;

        if (!msg) return;

        const embed = msg.embeds[0];

        if (!embed) return;

        for (const row of msg.components) {

            for (const comp of row.components) {

                comp.disabled = true;

            }

        }

        await interaction.update({ components: msg.components });

        const newEmbed = makeEmbed({ title: `${embed.title || 'Заявка'} отклонена`, color: 0xff0000 });

        newEmbed.addFields({ name: 'Кем', value: interaction.user.toString() });

        newEmbed.addFields({ name: 'Причина', value: reason, inline: false });

        await interaction.channel.send({ embeds: [newEmbed] });

        const applicantId = msg.mentions.users.first()?.id || extractUserIdFromEmbed(embed);

        if (applicantId) {

            const applicant = await guild.members.fetch(applicantId).catch(() => null);

            if (applicant) {

                try { await applicant.send(`Ваша заявка ${interaction.channel.name} отклонена - ${interaction.user}\nПричина: ${reason}`); } catch (e) { /* ignore */ }

            }

        }

        // Auto-delete channel

        setTimeout(async () => {

            try { await interaction.channel.delete(`Заявка отклонена`); } catch (e) { /* ignore */ }

        }, 5000);

        await sendLog(new EmbedBuilder().setTitle('REQUEST DECLINED').setColor(0xff0000).setTimestamp().addFields({ name: 'Отклонено кем', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

        return;

    }



    // --- Auto role settings ---

    if (customId === 'auto_role_modal') {

        try {

            const roleId = interaction.fields.getTextInputValue('role_id');

            const role = guild.roles.cache.get(roleId);

            if (!role) return interaction.reply({ content: 'Роль не найдена!', flags: 64 }).catch(() => { /* ignore */ });

            settings.auto_role_id = role.id;

            saveSettings(settings);

            const embed = makeEmbed({ title: 'Настройки обновлены', color: 0x00ff00 });

            embed.addFields({ name: 'Начальная роль', value: role.toString() });

            await interaction.reply({ embeds: [embed], flags: 64 });

            await sendLog(new EmbedBuilder().setTitle('SETTINGS').setColor(0x00ff00).setTimestamp().addFields({ name: 'Изменена начальная роль', value: role.name }).addFields({ name: 'Кем', value: interaction.user.tag }));

        } catch (e) { await interaction.reply({ content: 'Некорректный ID!', flags: 64 }).catch(() => { /* ignore */ }); }

        return;

    }



    // --- Spam settings ---

    if (customId === 'spam_settings_modal') {

        try {

            const enabled = ['да', 'yes', 'on', '1', 'включить'].includes(interaction.fields.getTextInputValue('enabled').toLowerCase().trim());

            const limit = parseInt(interaction.fields.getTextInputValue('limit'));

            const timeframe = parseInt(interaction.fields.getTextInputValue('timeframe'));

            if (limit < 1 || timeframe < 1) return interaction.reply({ content: 'Значения должны быть больше 0!', flags: 64 }).catch(() => { /* ignore */ });

            settings.spam_protection = enabled;

            settings.spam_limit = limit;

            settings.spam_timeframe = timeframe;

            saveSettings(settings);

            const embed = makeEmbed({ title: 'Настройки обновлены', color: 0x00ff00 });

            embed.addFields({ name: 'Защита от спама', value: enabled ? 'Включена' : 'Выключена' });

            embed.addFields({ name: 'Лимит сообщений', value: String(limit) });

            embed.addFields({ name: 'Окно времени', value: `${timeframe} сек` });

            await interaction.reply({ embeds: [embed], flags: 64 });

            await sendLog(new EmbedBuilder().setTitle('SETTINGS').setColor(0x00ff00).setTimestamp().addFields({ name: 'Защита от спама', value: enabled ? 'Включена' : 'Выключена' }).addFields({ name: 'Лимит', value: `${limit} сообщений за ${timeframe} сек` }).addFields({ name: 'Кем', value: interaction.user.tag }));

        } catch (e) { await interaction.reply({ content: 'Некорректные значения!', flags: 64 }).catch(() => { /* ignore */ }); }

        return;

    }



    // --- Console modal ---

    if (customId === 'console_modal') {

        if (!isProjectCreator(interaction.member)) {

            return interaction.reply({ content: 'Нет прав. Доступ только у роли Создатель проекта.', flags: 64 }).catch(() => { /* ignore */ });

        }

        const command = interaction.fields.getTextInputValue('console_command').trim();

        if (!command) {

            return interaction.reply({ content: 'Команда не может быть пустой.', flags: 64 }).catch(() => { /* ignore */ });

        }



        // Security: validate command format — only allow alphanumeric, spaces, dashes, underscores

        const safeCommand = command.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s\-_./#@*+:=%,()"]/g, '');

        if (safeCommand !== command) {

            return interaction.reply({ content: 'Команда содержит недопустимые символы.', flags: 64 }).catch(() => { /* ignore */ });

        }



        await interaction.deferReply({ flags: 64 });



        try {

            // Send command via Game API using the command string format

            const result = await sendGameCommand(command, { admin: interaction.user.tag });

            const success = !!(result && result.ok);



            // Build embed

            const embed = makeEmbed({

                title: success ? '✅ Команда выполнена' : '❌ Ошибка выполнения',

                color: success ? 0x00ff00 : 0xff0000

            });

            embed.addFields({ name: 'Команда', value: `\`${command}\``, inline: false });

            embed.addFields({ name: 'Кем', value: interaction.user.toString(), inline: true });



            const error = result && result.error ? String(result.error) : '';

            if (!success && error) {

                embed.addFields({ name: 'Ошибка', value: `\`${error.slice(0, 1024)}\``, inline: false });

            }



            const outputLines = (result && Array.isArray(result.output) ? result.output : [])

                .map(l => String(l).replace(/!\{#[0-9a-fA-F]{3,6}\}/g, '').trim())

                .filter(l => l && !/^\s*$/.test(l))

                .slice(0, 12);

            if (outputLines.length) {

                embed.addFields({ name: 'Вывод', value: '```\n' + outputLines.join('\n').slice(0, 1024) + '\n```', inline: false });

            }



            await interaction.editReply({ embeds: [embed] });



            // Log to game log channel

            const logEmbed = new EmbedBuilder()

                .setTitle('CONSOLE')

                .setColor(success ? 0x00ff00 : 0xff0000)

                .setTimestamp()

                .addFields({ name: 'Админ', value: `${interaction.user.tag} (${interaction.user.id})` })

                .addFields({ name: 'Команда', value: `\`${command}\``, inline: false })

                .addFields({ name: 'Статус', value: success ? '✅ Успешно' : `❌ ${error}`, inline: false })

                .setFooter({ text: 'Admin Console' });

            await sendGameLog(logEmbed);

        } catch (e) {

            await interaction.editReply({ content: `Ошибка выполнения: ${e.message}` }).catch(() => { /* ignore */ });

            log(`Console command error: ${e.message}`);

        }

        return;

    }



    // --- Mod modals (mod_menu) ---

    if (customId.startsWith('mod_')) {

        await handleModModal(interaction);

        return;

    }



    // --- Game modals ---

    if (customId.startsWith('game_')) {

        await handleGameModal(interaction);

        return;

    }



    await interaction.reply({ content: 'Неизвестная модалка.', flags: 64 });

}



// ==================== GAME MODAL HANDLERS ====================

async function handleGameModal(interaction) {

    if (!isProjectCreator(interaction.member)) {

        await interaction.reply({ content: 'Нет прав. Доступ только у роли Создатель проекта.', flags: 64 }).catch(() => { /* ignore */ });

        return;

    }

    const values = {};

    for (const [key, field] of interaction.fields.fields) {

        values[key] = field.value;

    }

    const modalId = interaction.customId;

    const member = values['member'] || '';

    const time = values['time'] || '';

    const reason = values['reason'] || '';

    const amount = values['amount'] || '';

    const fraction = values['fraction'] || '';

    const level = values['level'] || '';



    const modalMap = {

        'game_ban_modal':      { action: 'ban',      title: 'BAN',      fields: [['Static ID', member], ['Время', time], ['Причина', reason || '—']], data: { static: member, time, reason } },

        'game_unban_modal':    { action: 'unban',    title: 'UNBAN',    fields: [['Static ID', member]], data: { static: member } },

        'game_jail_modal':     { action: 'jail',     title: 'JAIL',     fields: [['Static ID', member], ['Время', time], ['Причина', reason || '—']], data: { static: member, time, reason } },

        'game_unjail_modal':   { action: 'unjail',   title: 'UNJAIL',   fields: [['Static ID', member]], data: { static: member } },

        'game_mute_modal':     { action: 'mute',     title: 'MUTE',     fields: [['Static ID', member], ['Время', time], ['Причина', reason || '—']], data: { static: member, time, reason } },

        'game_unmute_modal':   { action: 'unmute',   title: 'UNMUTE',   fields: [['Static ID', member]], data: { static: member } },

        'game_dp_modal':       { action: 'givedp',   title: 'DP',       fields: [['Static ID', member], ['Количество', amount]], data: { static: member, amount } },

        'game_money_modal':    { action: 'givemoney',title: 'MONEY',    fields: [['Static ID', member], ['Количество', amount]], data: { static: member, amount } },

        'game_givemats_modal': { action: 'givefracmats', title: 'GIVEMATS', fields: [['Fraction ID', fraction], ['Количество', amount]], data: { fraction, amount } },

        'game_takemats_modal': { action: 'takefracmats', title: 'TAKEMATS', fields: [['Fraction ID', fraction], ['Количество', amount]], data: { fraction, amount } },

        'game_makeadmin_modal':{ action: 'makeadmin',title: 'MAKEADMIN',fields: [['Static ID', member], ['Уровень', level]], data: { static: member, level } },

    };



    const handler = modalMap[modalId];

    if (handler) {

        log(`[handleGameModal] action=${handler.action} data=${JSON.stringify(handler.data)}`);

        const res = await sendGameAction(handler.action, handler.data);

        const ok = !!(res && res.ok);

        const errText = ok ? '' : String((res && res.error) || 'Ошибка выполнения');

        log(`[handleGameModal] result=${ok} for ${handler.action}${errText ? ' — ' + errText : ''}`);

        const statusEmoji = ok ? '✅' : '❌';

        const statusText = ok ? 'Команда выполнена' : `Ошибка: ${errText}`;

        await interaction.reply({ embeds: [makeEmbed({ title: `Game ${handler.title} ${statusEmoji}`, description: statusText, color: ok ? 0x00ff00 : 0xff0000 })], flags: 64 }).catch(() => { /* ignore */ });

        const logEmbed = new EmbedBuilder().setTitle(`GAME | ${handler.title}`).setColor(ok ? 0x00ff00 : 0xff0000).setTimestamp().addFields({ name: 'Админ', value: `${interaction.user.tag} (${interaction.user.id})` });

        for (const [n, v] of handler.fields) logEmbed.addFields({ name: n, value: v, inline: true });

        logEmbed.setFooter({ text: 'Game Admin Panel' });

        await sendGameLog(logEmbed);

    } else {

        await interaction.reply({ content: 'Неизвестная команда.', flags: 64 }).catch(() => { /* ignore */ });

    }

}



// ==================== MOD MENU MODAL HANDLERS ====================

async function handleModModal(interaction) {

    const { customId } = interaction;

    const guild = interaction.guild;

    const member = interaction.member;

    const val = (key) => interaction.fields.getTextInputValue(key);



    const modCan = () => member.roles.cache.some(r => [config.modRoleId, config.headModRoleId].includes(r.id));

    const headCan = () => member.roles.cache.some(r => r.id === config.headModRoleId);

    const need = (ok, text) => {

        if (!ok) { interaction.reply({ content: text, flags: 64 }).catch(() => { /* ignore */ }); return false; }

        return true;

    };

    const fetchTarget = async (id) => {

        const t = await guild.members.fetch(id).catch(() => null);

        if (!t) { interaction.reply({ content: `Пользователь ${id} не найден.`, flags: 64 }).catch(() => { /* ignore */ }); return null; }

        return t;

    };

    const fail = (e) => { log(`Mod modal error (${customId}): ${e.message}`); interaction.reply({ content: `Ошибка: ${e.message}`, flags: 64 }).catch(() => { /* ignore */ }); };



    try {

        switch (customId) {

            case 'mod_ban_modal': {

                if (!need(headCan(), 'Только Head Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                const reason = val('reason');

                await target.ban({ reason });

                incrementStat(interaction.user.id, 'bans');

                const embed = makeEmbed({ title: 'BAN', description: `${target} забанен`, color: 0xff0000 });

                embed.addFields({ name: 'Причина', value: reason });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('BAN').setColor(0xff0000).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

                break;

            }

            case 'mod_temp_ban_modal': {

                if (!need(headCan(), 'Только Head Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                const seconds = parseTime(val('time'));

                if (seconds <= 0) { interaction.reply({ content: 'Некорректный формат времени.', flags: 64 }).catch(() => { /* ignore */ }); return; }

                const reason = val('reason');

                const existingBan = await guild.bans.fetch(target.id).catch(() => null);

                if (existingBan) { interaction.reply({ content: `Пользователь ${target} уже забанен.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                await target.ban({ reason });

                incrementStat(interaction.user.id, 'bans');

                const timeDisplay = formatTime(seconds);

                const embed = makeEmbed({ title: 'TEMP BAN', description: `${target} забанен на **${timeDisplay}**`, color: 0xff0000 });

                embed.addFields({ name: 'Причина', value: reason });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('TEMP BAN').setColor(0xff0000).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Время', value: timeDisplay }).addFields({ name: 'Причина', value: reason }));

                setTimeout(async () => {

                    try { await guild.members.unban(target.id, 'Истекло время temp_ban'); log(`Temp ban lifted for ${target.user.tag}`); } catch (e) { log(`Auto-unban error: ${e.message}`); }

                }, seconds * 1000);

                break;

            }

            case 'mod_unban_modal': {

                if (!need(headCan(), 'Только Head Moderator.')) return;

                const targetId = val('member');

                const reason = val('reason');

                const existingBan = await guild.bans.fetch(targetId).catch(() => null);

                if (!existingBan) { interaction.reply({ content: `Пользователь ${targetId} не забанен.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                await guild.members.unban(targetId, reason);

                const embed = makeEmbed({ title: 'UNBAN', description: `<@${targetId}> разбанен`, color: 0x00ff00 });

                embed.addFields({ name: 'Причина', value: reason });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('UNBAN').setColor(0x00ff00).setTimestamp().addFields({ name: 'Пользователь', value: `${targetId}` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

                break;

            }

            case 'mod_timeout_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                const seconds = parseTime(val('time'));

                if (seconds <= 0) { interaction.reply({ content: 'Некорректный формат времени.', flags: 64 }).catch(() => { /* ignore */ }); return; }

                const reason = val('reason');

                await target.timeout(seconds * 1000, reason);

                incrementStat(interaction.user.id, 'mutes');

                const timeDisplay = formatTime(seconds);

                const embed = makeEmbed({ title: 'TIMEOUT', description: `${target} замьючен на ${timeDisplay}`, color: 0xffa500 });

                embed.addFields({ name: 'Причина', value: reason });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('TIMEOUT').setColor(0xffa500).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Время', value: timeDisplay }).addFields({ name: 'Причина', value: reason }));

                break;

            }

            case 'mod_untimeout_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                const reason = val('reason');

                await target.timeout(null, reason);

                const embed = makeEmbed({ title: 'UNTIMEOUT', description: `Тайм-аут снят с ${target}`, color: 0x00ff00 });

                embed.addFields({ name: 'Причина', value: reason });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('UNTIMEOUT').setColor(0x00ff00).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

                break;

            }

            case 'mod_mute_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                const seconds = parseTime(val('time'));

                if (seconds <= 0) { interaction.reply({ content: 'Некорректный формат времени.', flags: 64 }).catch(() => { /* ignore */ }); return; }

                const reason = val('reason');

                const muteRole = guild.roles.cache.get(config.muteRoleId);

                if (!muteRole) { interaction.reply({ content: 'Роль мьюта не найдена.', flags: 64 }).catch(() => { /* ignore */ }); return; }

                if (target.roles.cache.has(config.muteRoleId)) { interaction.reply({ content: `У ${target} уже есть роль мьюта.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                await target.roles.add(muteRole, reason);

                incrementStat(interaction.user.id, 'mutes');

                const timeDisplay = formatTime(seconds);

                const embed = makeEmbed({ title: 'MUTE', description: `${target} замьючен на ${timeDisplay}`, color: 0xffa500 });

                embed.addFields({ name: 'Причина', value: reason });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('MUTE').setColor(0xffa500).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Время', value: timeDisplay }).addFields({ name: 'Причина', value: reason }));

                setTimeout(async () => {

                    try {

                        const m = await guild.members.fetch(target.id).catch(() => null);

                        if (m && m.roles.cache.has(config.muteRoleId)) { await m.roles.remove(muteRole, 'Истекло время мьюта'); log(`Mute auto-removed from ${m.user.tag}`); }

                    } catch (e) { log(`Auto-unmute error: ${e.message}`); }

                }, seconds * 1000);

                break;

            }

            case 'mod_unmute_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                const reason = val('reason');

                const muteRole = guild.roles.cache.get(config.muteRoleId);

                if (!muteRole) { interaction.reply({ content: 'Роль мьюта не найдена.', flags: 64 }).catch(() => { /* ignore */ }); return; }

                if (!target.roles.cache.has(config.muteRoleId)) { interaction.reply({ content: `У ${target} нет роли мьюта.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                await target.roles.remove(muteRole, reason);

                const embed = makeEmbed({ title: 'UNMUTE', description: `Мьют снят с ${target}`, color: 0x00ff00 });

                embed.addFields({ name: 'Причина', value: reason });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('UNMUTE').setColor(0x00ff00).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Причина', value: reason }));

                break;

            }

            case 'mod_clear_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const how = parseInt(val('how'));

                if (!(how >= 1 && how <= 200)) { interaction.reply({ content: 'Укажите число от 1 до 200.', flags: 64 }).catch(() => { /* ignore */ }); return; }

                if (!interaction.channel || !interaction.channel.bulkDelete) { interaction.reply({ content: 'Эта команда недоступна в этом канале.', flags: 64 }).catch(() => { /* ignore */ }); return; }

                const deleted = await interaction.channel.bulkDelete(how + 1, true);

                const embed = makeEmbed({ title: 'CLEAR', description: `Удалено **${deleted.size - 1}** сообщений`, color: 0xffa500 });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('CLEAR').setColor(0xffa500).setTimestamp().addFields({ name: 'Количество', value: String(deleted.size - 1) }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Канал', value: interaction.channel.name || interaction.channelId }));

                break;

            }

            case 'mod_move_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                if (!target.voice?.channel) { interaction.reply({ content: `${target} не в голосовом канале.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                const dest = guild.channels.cache.get(val('channel'));

                if (!dest || dest.type !== 2) { interaction.reply({ content: `Канал ${val('channel')} не найден или не голосовой.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                const old = target.voice.channel;

                await target.voice.setChannel(dest);

                const embed = makeEmbed({ title: 'MOVE', description: `${target} перемещён в ${dest}`, color: 0x0000ff });

                embed.addFields({ name: 'Откуда', value: old.name });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('MOVE').setColor(0x0000ff).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Откуда', value: old.name }).addFields({ name: 'Куда', value: dest.name }));

                break;

            }

            case 'mod_role_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                const roleName = val('role');

                const targetRole = guild.roles.cache.find(r => r.name === roleName);

                if (!targetRole) { interaction.reply({ content: `Роль \`${roleName}\` не найдена.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                if (target.roles.cache.has(targetRole.id)) { interaction.reply({ content: `У ${target} уже есть роль ${targetRole}.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                await target.roles.add(targetRole, `Выдана через /mod_menu by ${interaction.user.tag}`);

                const embed = makeEmbed({ title: 'ROLE', description: `${targetRole} выдана ${target}`, color: 0x00ff00 });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('ROLE ADD').setColor(0x00ff00).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Роль', value: targetRole.name }));

                break;

            }

            case 'mod_unrole_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const target = await fetchTarget(val('member'));

                if (!target) return;

                const roleName = val('role');

                const targetRole = guild.roles.cache.find(r => r.name === roleName);

                if (!targetRole) { interaction.reply({ content: `Роль \`${roleName}\` не найдена.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                if (!target.roles.cache.has(targetRole.id)) { interaction.reply({ content: `У ${target} нет роли ${targetRole}.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                await target.roles.remove(targetRole, `Снята через /mod_menu by ${interaction.user.tag}`);

                const embed = makeEmbed({ title: 'UNROLE', description: `${targetRole} снята с ${target}`, color: 0xffa500 });

                embed.addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('ROLE REMOVE').setColor(0xffa500).setTimestamp().addFields({ name: 'Пользователь', value: `${target.user.tag} (${target.id})` }).addFields({ name: 'Модератор', value: interaction.user.tag }).addFields({ name: 'Роль', value: targetRole.name }));

                break;

            }

            case 'mod_slowmode_modal': {

                if (!need(modCan(), 'Только Moderator.')) return;

                const ch = guild.channels.cache.get(val('channel'));

                if (!ch) { interaction.reply({ content: `Канал ${val('channel')} не найден.`, flags: 64 }).catch(() => { /* ignore */ }); return; }

                const second = parseInt(val('second'));

                if (!(second >= 0 && second <= 120)) { interaction.reply({ content: 'Укажите число от 0 до 120.', flags: 64 }).catch(() => { /* ignore */ }); return; }

                await ch.setRateLimitPerUser(second);

                const desc = second === 0 ? `Слоумод выключен в ${ch}` : `Слоумод установлен на **${second}** сек в ${ch}`;

                const embed = new EmbedBuilder().setTitle('SLOWMODE').setDescription(desc).setColor(0x0000ff).addFields({ name: 'Модератор', value: interaction.user.toString() });

                await interaction.reply({ embeds: [embed] });

                await sendLog(new EmbedBuilder().setTitle('SLOWMODE').setColor(0x0000ff).setTimestamp().addFields({ name: 'Канал', value: ch.name }).addFields({ name: 'Секунды', value: String(second) }).addFields({ name: 'Модератор', value: interaction.user.tag }));

                break;

            }

            default:

                await interaction.reply({ content: 'Неизвестная команда.', flags: 64 }).catch(() => { /* ignore */ });

        }

    } catch (e) {

        fail(e);

    }

}



// ==================== GAME BUTTON ====================

async function handleGameButton(interaction, customId) {

    if (!isProjectCreator(interaction.member)) {

        try { await interaction.reply({ content: 'Нет прав. Доступ только у роли Создатель проекта.', flags: 64 }); } catch (e) { /* ignore */ }

        return;

    }

    const modalMap = {

        'game_ban': { id: 'game_ban_modal', title: 'Ban', fields: [['member', 'Static ID', true], ['time', 'Время (формат: 1д)', true], ['reason', 'Причина', true]] },

        'game_unban': { id: 'game_unban_modal', title: 'Unban', fields: [['member', 'Static ID', true]] },

        'game_jail': { id: 'game_jail_modal', title: 'Jail', fields: [['member', 'Static ID', true], ['time', 'Время (формат: 1д)', true], ['reason', 'Причина', true]] },

        'game_unjail': { id: 'game_unjail_modal', title: 'Unjail', fields: [['member', 'Static ID', true]] },

        'game_mute': { id: 'game_mute_modal', title: 'Mute', fields: [['member', 'Static ID', true], ['time', 'Время (формат: 1д)', true], ['reason', 'Причина', true]] },

        'game_unmute': { id: 'game_unmute_modal', title: 'Unmute', fields: [['member', 'Static ID', true]] },

        'game_dp': { id: 'game_dp_modal', title: 'DP', fields: [['member', 'Static ID', true], ['amount', 'Количество', true]] },

        'game_money': { id: 'game_money_modal', title: 'Money', fields: [['member', 'Static ID', true], ['amount', 'Количество', true]] },

        'game_givemats': { id: 'game_givemats_modal', title: 'Givemats', fields: [['fraction', 'Fraction ID', true], ['amount', 'Количество', true]] },

        'game_takemats': { id: 'game_takemats_modal', title: 'Takemats', fields: [['fraction', 'Fraction ID', true], ['amount', 'Количество', true]] },

        'game_makeadmin': { id: 'game_makeadmin_modal', title: 'Makeadmin', fields: [['member', 'Static ID', true], ['level', 'Уровень админки (число)', true]] },

    };

    const handler = modalMap[customId];

    if (!handler) {

        return interaction.reply({ content: 'Неизвестная команда.', flags: 64 }).catch(() => { /* ignore */ });

    }

    try {

        const modal = new ModalBuilder().setCustomId(handler.id).setTitle(handler.title);

        for (const [fieldId, label, required] of handler.fields) {

            const input = new TextInputBuilder().setCustomId(fieldId).setLabel(label).setStyle(TextInputStyle.Short).setRequired(required);

            modal.addComponents(new ActionRowBuilder().addComponents(input));

        }

        await interaction.showModal(modal);

    } catch (e) {

        log(`handleGameButton error: ${e.message}`);

        try { await interaction.editReply({ content: `Ошибка: ${e.message}` }); } catch (e2) { /* ignore */ }

    }

}



// ==================== COMPONENT BUILDERS ====================

function createMenuRow() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('menu_daily').setLabel('Ежедневный отчёт').setStyle(ButtonStyle.Success),

        new ButtonBuilder().setCustomId('menu_weekly').setLabel('Недельный отчёт').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('menu_calls').setLabel('Обзвон кандидата').setStyle(ButtonStyle.Danger),

        new ButtonBuilder().setCustomId('menu_request').setLabel('Запрос команд').setStyle(ButtonStyle.Secondary),

        new ButtonBuilder().setCustomId('menu_personal').setLabel('Запись данных').setStyle(ButtonStyle.Secondary),

    );

}



function createModMenuRow1() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('mod_ban').setLabel('Ban').setStyle(ButtonStyle.Danger),

        new ButtonBuilder().setCustomId('mod_temp_ban').setLabel('Temp Ban').setStyle(ButtonStyle.Danger),

        new ButtonBuilder().setCustomId('mod_unban').setLabel('Unban').setStyle(ButtonStyle.Danger),

        new ButtonBuilder().setCustomId('mod_timeout').setLabel('Timeout').setStyle(ButtonStyle.Success),

        new ButtonBuilder().setCustomId('mod_untimeout').setLabel('Untimeout').setStyle(ButtonStyle.Success),

    );

}



function createModMenuRow2() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('mod_mute').setLabel('Mute').setStyle(ButtonStyle.Success),

        new ButtonBuilder().setCustomId('mod_unmute').setLabel('Unmute').setStyle(ButtonStyle.Success),

        new ButtonBuilder().setCustomId('mod_clear').setLabel('Clear').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('mod_move').setLabel('Move').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('mod_role').setLabel('Role').setStyle(ButtonStyle.Primary),

    );

}



function createModMenuRow3() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('mod_unrole').setLabel('Unrole').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('mod_slowmode').setLabel('Slowmode').setStyle(ButtonStyle.Primary),

    );

}



function createSettingsRow() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('settings_auto_role').setLabel('Начальная роль').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('settings_spam').setLabel('Защита от спама').setStyle(ButtonStyle.Success),

        new ButtonBuilder().setCustomId('settings_backup').setLabel('Backup').setStyle(ButtonStyle.Secondary),

    );

}



function createBackupRow() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('backup_save_btn').setLabel('Сохранить бэкап').setStyle(ButtonStyle.Success),

        new ButtonBuilder().setCustomId('backup_load_btn').setLabel('Загрузить бэкап').setStyle(ButtonStyle.Danger),

        new ButtonBuilder().setCustomId('backup_info_btn').setLabel('Информация').setStyle(ButtonStyle.Primary),

    );

}



function createGameRow1() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('game_ban').setLabel('Ban').setStyle(ButtonStyle.Danger),

        new ButtonBuilder().setCustomId('game_unban').setLabel('Unban').setStyle(ButtonStyle.Danger),

        new ButtonBuilder().setCustomId('game_jail').setLabel('Jail').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('game_unjail').setLabel('Unjail').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('game_mute').setLabel('Mute').setStyle(ButtonStyle.Primary),

    );

}



function createGameRow2() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('game_unmute').setLabel('Unmute').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('game_dp').setLabel('DP').setStyle(ButtonStyle.Success),

        new ButtonBuilder().setCustomId('game_money').setLabel('Money').setStyle(ButtonStyle.Success),

    );

}



function createGameRow3() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId('game_givemats').setLabel('Givemats').setStyle(ButtonStyle.Secondary),

        new ButtonBuilder().setCustomId('game_takemats').setLabel('Takemats').setStyle(ButtonStyle.Secondary),

        new ButtonBuilder().setCustomId('game_makeadmin').setLabel('Makeadmin').setStyle(ButtonStyle.Success),

    );

}



// ==================== MODAL BUILDERS ====================

function createDailyReportModal() {

    return new ModalBuilder().setCustomId('daily_report_modal').setTitle('Ежедневный отчёт')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Static ID').setStyle(TextInputStyle.Short).setPlaceholder('ваш ник/тег').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reports_closed').setLabel('Сколько репортов закрыли').setStyle(TextInputStyle.Short).setPlaceholder('5').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('punishments_given').setLabel('Сколько наказаний выдали').setStyle(TextInputStyle.Short).setPlaceholder('3').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mp_conducted').setLabel('Сколько МП провели').setStyle(TextInputStyle.Short).setPlaceholder('2').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('date').setLabel('Дата').setStyle(TextInputStyle.Short).setPlaceholder('01.01.2026').setRequired(true)),

        );

}



function createWeeklyReportModal() {

    return new ModalBuilder().setCustomId('weekly_report_modal').setTitle('Недельный отчёт')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Static ID').setStyle(TextInputStyle.Short).setPlaceholder('ваш ник/тег').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reports_closed').setLabel('Сколько репортов закрыли').setStyle(TextInputStyle.Short).setPlaceholder('5').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('punishments_given').setLabel('Сколько наказаний выдали').setStyle(TextInputStyle.Short).setPlaceholder('3').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mp_conducted').setLabel('Сколько МП провели').setStyle(TextInputStyle.Short).setPlaceholder('2').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('date').setLabel('Дата (неделя)').setStyle(TextInputStyle.Short).setPlaceholder('01.01.2026 - 07.01.2026').setRequired(true)),

        );

}



function createCallsModal() {

    return new ModalBuilder().setCustomId('calls_modal').setTitle('Обзвон кандидата')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('candidate_discord').setLabel('Discord User кандидата').setStyle(TextInputStyle.Short).setPlaceholder('user#0000 или ID').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('candidate_info').setLabel('Имя / Возраст / Онлайн / Куда').setStyle(TextInputStyle.Paragraph).setPlaceholder('Иван / 22 / 6+ / LSPD').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scores').setLabel('Баллы / Вопросы 1 балл / Вопросы 2 балла').setStyle(TextInputStyle.Short).setPlaceholder('15 / 5 / 3').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('call_link').setLabel('Ссылка на откат обзвона').setStyle(TextInputStyle.Short).setPlaceholder('https://...').setRequired(true)),

        );

}



function createCommandRequestModal() {

    return new ModalBuilder().setCustomId('command_request_modal').setTitle('Запрос команды')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('command_name').setLabel('Какая команда?').setStyle(TextInputStyle.Short).setPlaceholder('название команды').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Ваш Static ID').setStyle(TextInputStyle.Short).setPlaceholder('ваш ник/тег').setRequired(true)),

        );

}



function createPersonalDataModal() {

    return new ModalBuilder().setCustomId('personal_data_modal').setTitle('Запись персональных данных')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nick').setLabel('Ник').setStyle(TextInputStyle.Short).setPlaceholder('имя пользователя').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('admin_level').setLabel('Лвл адм сейчас').setStyle(TextInputStyle.Short).setPlaceholder('например: 1').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('appointment_date').setLabel('Дата постановки').setStyle(TextInputStyle.Short).setPlaceholder('01.01.2026').setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('position').setLabel('Должность').setStyle(TextInputStyle.Short).setPlaceholder('например: Helper').setRequired(true)),

        );

}



function createRequestToDepartmentModal() {

    return new ModalBuilder().setCustomId('request_to_department_modal').setTitle('Заявка в отдел')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Static ID').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('department').setLabel('В какой отдел?').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('experience').setLabel('Опыт в отделе?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

        );

}



function createHelperRequestModal() {

    return new ModalBuilder().setCustomId('helper_request_modal').setTitle('Заявка на Helper')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Ваш Static ID').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('time_on_server').setLabel('Как давно вы на сервере?').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('why_helper').setLabel('Почему хотите стать хелпером?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('what_can_help').setLabel('Чем можете помочь игрокам?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('experience').setLabel('Был ли опыт хелпера/администрации?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

        );

}



function createMediaRequestModal() {

    return new ModalBuilder().setCustomId('media_request_modal').setTitle('Заявка на Media')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Ваш Static ID').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('why_media').setLabel('Почему хотите стать медиа?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('experience').setLabel('Опыт в медиа?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('what_can_do').setLabel('Что умеете делать?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('portfolio').setLabel('Ссылки на работы (если есть)').setStyle(TextInputStyle.Paragraph).setRequired(false)),

        );

}



function createMediaRequestFormModal() {

    return new ModalBuilder().setCustomId('media_request_form_modal').setTitle('Media запрос')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nick').setLabel('Ник').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Static ID').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('what_want').setLabel('Что хотите?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('why').setLabel('Зачем?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

        );

}



function createMediaReportModal() {

    return new ModalBuilder().setCustomId('media_report_modal').setTitle('Media отчет')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nick').setLabel('Ник').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Static ID').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('what_get').setLabel('Что хотите получить за свою работу?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('work_done').setLabel('Проделанная работа').setStyle(TextInputStyle.Paragraph).setRequired(true)),

        );

}



function createMediaReportFormModal() {

    return new ModalBuilder().setCustomId('media_report_form_modal').setTitle('Media отчет')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nick').setLabel('Ник').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Static ID').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('what_get').setLabel('Что хотите получить за свою работу?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('work_done').setLabel('Проделанная работа').setStyle(TextInputStyle.Paragraph).setRequired(true)),

        );

}



function createLeaderRequestModal() {

    return new ModalBuilder().setCustomId('leader_request_modal').setTitle('Заявка на Лидерку')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('static_id').setLabel('Ваш Static ID').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('faction').setLabel('В какую фракцию?').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('why_leader').setLabel('Почему хотите стать лидером?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('experience').setLabel('Опыт лидера/заместителя?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('what_will_do').setLabel('Что будете делать как лидер?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

        );

}



function createAchievementModal() {

    return new ModalBuilder().setCustomId('achievement_modal').setTitle('Подать достижение')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('faction').setLabel('Фракция').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('achievement').setLabel('Какое достижение?').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('achievement_type').setLabel('Тип: ежедневное или еженедельное?').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('evidence').setLabel('Доказательства (ссылки/описание)').setStyle(TextInputStyle.Paragraph).setRequired(true)),

        );

}



function createVacationModal() {

    return new ModalBuilder().setCustomId('vacation_modal').setTitle('Заявка на отпуск')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Причина отпуска').setStyle(TextInputStyle.Paragraph).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel('Срок отпуска (дни)').setStyle(TextInputStyle.Short).setRequired(true)),

        );

}



function createAutoRoleModal() {

    return new ModalBuilder().setCustomId('auto_role_modal').setTitle('Настройка начальной роли')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role_id').setLabel('ID роли').setStyle(TextInputStyle.Short).setRequired(true)),

        );

}



function createSpamSettingsModal() {

    return new ModalBuilder().setCustomId('spam_settings_modal').setTitle('Настройка защиты от спама')

        .addComponents(

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('enabled').setLabel('Включить? (да/нет)').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('limit').setLabel('Макс. сообщений').setStyle(TextInputStyle.Short).setRequired(true)),

            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('timeframe').setLabel('Секунд на проверку').setStyle(TextInputStyle.Short).setRequired(true)),

        );

}



function createSimpleModal(customId, title, fields) {

    const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

    const fieldList = Array.isArray(fields) ? fields : [];

    for (const [fieldId, label, required] of fieldList) {

        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(fieldId).setLabel(label).setStyle(TextInputStyle.Short).setRequired(required || false)));

    }

    return modal;

}



// ==================== START BOT ====================

if (!config.token) {

    log('ERROR: Discord token not configured!');

    process.exit(1);

}



client.login(config.token).then(() => {

    log('Bot logged in successfully!');

}).catch(e => {

    log(`Login error: ${e.message}`);

    process.exit(1);

});

