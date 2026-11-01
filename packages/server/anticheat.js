// ============================================================
// АНТИЧИТ v4.1 — GTA 5 RP (RAGE:MP)
// Защита: оружие, флай (непрерывность + анти-обход редкими ТП),
//         спидхак, ноклип, телепорт, годмод, взрывы,
//         VANISH (авто-детект по alpha/invincible/nocollision)
// Отправка через Discord-бота (с ретраями) | Меньше ложных срабатываний
// ============================================================
//
// ИЗМЕНЕНИЯ ОТНОСИТЕЛЬНО v3.2:
//
//  1) AIMBOT-ДЕТЕКТ ПОЛНОСТЬЮ УДАЛЁН (magic bullet + магнит-снап,
//     а также клиентский синк камеры ac:camHeading, который был
//     нужен только под него). За всё время — ноль реальных детектов,
//     при этом лишний remote-эвент раз в 200мс от каждого игрока и
//     проверка на каждый выстрел зря грузили сервер. Если понадобится
//     позже — переделывать заново, а не включать это же обратно.
//
//  2) ФЛАЙ/ТП — единая система очков (v4.1, AC_FLY_KICK_SCORE_*,
//     AC_TP_SCORE_*, AC_FLY_SCORE_PER_TICK):
//     - Одиночный ТП-рывок (резкий скачок дистанции 50м+ за <2 сек,
//       который затем ОСТАНАВЛИВАЕТСЯ) добавляет НЕБОЛЬШОЙ вклад в
//       общий счёт — откалибровано так, чтобы ~4 таких ТП за 10 сек
//       не добивали до кика. Счёт тает экспоненциально во времени
//       (период полураспада ~12 сек), общий для ТП и полёта.
//     - Непрерывный "полётный" сигнал (реальный флай-хак) добавляет
//       очки на КАЖДОМ тике, пока держится непрерывно (после
//       AC_FLY_MIN_DURATION_MS = 350 мс сустейна, разрывы до
//       AC_FLY_GAP_TOLERANCE_MS = 250 мс не сбрасывают счётчик) — это
//       быстро (~1.5-2 сек) добивает до порога кика.
//     - Кик происходит автоматически при достижении порога (100 очков),
//       без ожидания повторного срабатывания через отдельное окно.
//     - Дискорд по этой системе шлётся с троттлингом — не чаще раза в
//       3 сек (AC_FLY_SCORE_DISCORD_THROTTLE_MS), момент кика шлётся
//       всегда вне очереди.
//     - ОТДЕЛЬНО — защита от снапов при входе на сервер (AC_SNAP_GRACE_MS):
//       фиксированное окно 45 сек от playerAuth, БЕЗ продления — снапы
//       внутри окна не считаются в очки вообще, но защита снимается
//       ровно через 45 сек после логина, сколько бы снапов внутри неё
//       ни было.
//     Вся логика исключений (телепорт/спавн/смена дименшена/буст-грейс
//     после коннекта) сохранена без изменений.
//
//  3) DISCORD — добавлен ретрай с задержкой (до AC_DISCORD_MAX_RETRIES
//     попыток) на отправку эмбеда. Раньше при разовом сетевом сбое
//     или рейт-лимите Discord детект просто пропадал из Discord-канала,
//     хотя в игровой чат (notifyAcWatchers) он уже успевал уйти —
//     отсюда и было расхождение "в чат прилетело, в Дискорд нет".
// ============================================================

let playerClicks = {};
const acState = new Map();

// ============================================================
//  DISCORD — REST API бота (discord_env.json), канал ac-flags
// ============================================================

const discordApi = require('./discord_api.js');
const DEFAULT_AC_CHANNEL_ID = '1534361751158657185';

function getDiscordToken() {
    return discordApi.getDiscordToken();
}

function getAcChannelId() {
    return discordApi.getDiscordEnvValue('DISCORD_AC_CHANNEL_ID', DEFAULT_AC_CHANNEL_ID);
}

// --- Ретрай отправки в Discord ---
// Раньше разовый сбой (сетевой блип / рейт-лимит 429 / временная
// недоступность API) просто ронял детект — в чат он уже ушёл
// (notifyAcWatchers вызывается отдельно и не зависит от Discord),
// а в Discord — нет. Теперь несколько попыток с нарастающей паузой.
const AC_DISCORD_MAX_RETRIES  = 2;    // доп. попытки после первой неудачной
const AC_DISCORD_RETRY_BASE_MS = 800; // 800мс, 1600мс...

function discordAcRestPost(bodyObj, attempt = 0) {
    const channelId = getAcChannelId();
    if (!getDiscordToken()) {
        return Promise.reject(new Error('DISCORD_BOT_TOKEN не задан в discord_env.json'));
    }
    return discordApi.postChannelMessage(channelId, bodyObj).catch((err) => {
        if (attempt < AC_DISCORD_MAX_RETRIES) {
            const delay = AC_DISCORD_RETRY_BASE_MS * (attempt + 1);
            return new Promise((resolve) => setTimeout(resolve, delay))
                .then(() => discordAcRestPost(bodyObj, attempt + 1));
        }
        throw err;
    });
}

function sendDiscordEmbedToChannelAsync(embedData) {
    const discordEmbed = {
        title: embedData.title || 'AC Alert',
        description: embedData.description || undefined,
        color: embedData.color != null ? embedData.color : 0xff0000,
        fields: embedData.fields || [],
        timestamp: embedData.timestamp || new Date().toISOString(),
        footer: embedData.footer || { text: 'AC v3.2 · FLOW DM' }
    };
    if (!discordEmbed.description) delete discordEmbed.description;
    return discordAcRestPost({ embeds: [discordEmbed] });
}

function sendDiscordEmbedToChannel(embedData) {
    sendDiscordEmbedToChannelAsync(embedData).catch(function (err) {
        const msg = String((err && err.message) || err || '');
        const isNet = /ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|429|rate limit/i.test(msg);
        const now = Date.now();
        if (isNet) {
            if (!global.__acDiscordQuietUntil || now >= global.__acDiscordQuietUntil) {
                global.__acDiscordQuietUntil = now + 60000;
                console.log('[anticheat/discord] сеть/лимит (далее 60с без спама):', msg.slice(0, 120));
            }
            return;
        }
        console.log('[anticheat/discord] не удалось отправить эмбед после ретраев:', msg.slice(0, 200));
    });
}

global.sendAcDiscordEmbed = sendDiscordEmbedToChannel;

// ===== Embed-билдер =====

const EMBED_COLORS = {
    weapon:     0xFF4500,
    movement:   0xFF6347,
    fly:        0xDC143C,
    kick:       0x8B0000,
    key:        0xFFD700,
    keywarn:    0xFFA500,
    info:       0x4169E1,
    correction: 0x1E90FF,
    kill:       0x800080,
    godmode:    0x9400D3,
    explosion:  0xFF8C00,
    vanish:     0xFF0000,
};

function buildAcEmbed(type, title, player, fields, extraDesc) {
    const login  = player?.login || player?.name || '?';
    const sid    = player?.static != null ? player.static : '?';
    const pos    = player?.position ? `${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}` : 'n/a';
    const dim    = player?.dimension != null ? player.dimension : 0;
    const color  = EMBED_COLORS[type] || 0xFF0000;

    const base = [
        { name: '👤 Игрок',   value: `\`${login}\` (#${sid})`, inline: true },
        { name: '📍 Позиция', value: `\`${pos}\``,             inline: true },
        { name: '🌐 Мир',     value: `\`${dim}\``,             inline: true },
    ];
    if (fields) for (const f of fields) base.push(f);

    return {
        title,
        description: extraDesc || undefined,
        color,
        fields: base.slice(0, 25),
        timestamp: new Date().toISOString(),
        footer: { text: `AC v3.2` },
    };
}

// ============================================================
//  НАСТРОЙКИ
// ============================================================

let AC_RESTRICTED_WEAPONS = new Set();
function initRestrictedWeapons() {
    try {
        AC_RESTRICTED_WEAPONS = new Set([
            mp.joaat('weapon_grenade'),
            mp.joaat('weapon_stickybomb'),
            mp.joaat('weapon_proxmine'),
            mp.joaat('weapon_pipebomb'),
            mp.joaat('weapon_molotov'),
            mp.joaat('weapon_bzgas'),
            mp.joaat('weapon_smokegrenade'),
            mp.joaat('weapon_rpg'),
            mp.joaat('weapon_grenadelauncher'),
            mp.joaat('weapon_grenadelauncher_smoke'),
            mp.joaat('weapon_hominglauncher'),
            mp.joaat('weapon_compactlauncher'),
            mp.joaat('weapon_railgun'),
            mp.joaat('weapon_firework'),
            mp.joaat('weapon_minigun'),
            mp.joaat('weapon_musket'),
            mp.joaat('weapon_raypistol'),
            mp.joaat('weapon_rayminigun'),
            1198252421,
            1752584910,
            0x12E82D3D,
            0x497FACC3,
            0x34A67B97,
            0x060EC506,
            0x23C9F95C,
            0x57A4368C,
            0x45CD9CF3,
            0x6E7DDDEC,
            0x787F0BB,
            0x624FE830,
            0x78A97CD0,
            0x0A3D4D34,
            0x1B06D571,
            0x5A96BA4,
            0x05FC3C11,
            0x47757124,
            0x22D8FE39,
            0x2B5EF5EC,
        ]);
    } catch (e) {
        AC_RESTRICTED_WEAPONS = new Set([2982836145, 1752584910]);
    }
}
initRestrictedWeapons();

const AC_BLACKLISTED_WEAPON_NAMES = {
    'weapon_grenade': 'Граната',
    'weapon_stickybomb': 'Стики-бомба',
    'weapon_proxmine': 'Проксимайна',
    'weapon_pipebomb': 'Пайп-бомба',
    'weapon_molotov': 'Коктейль Молотова',
    'weapon_bzgas': 'BZ Газ',
    'weapon_smokegrenade': 'Дымовая граната',
    'weapon_rpg': 'РПГ',
    'weapon_grenadelauncher': 'Гранатомёт',
    'weapon_grenadelauncher_smoke': 'Дымовой гранатомёт',
    'weapon_hominglauncher': 'Хоминг-ланчер',
    'weapon_compactlauncher': 'Компактный гранатомёт',
    'weapon_railgun': 'Рельсотрон',
    'weapon_firework': 'Фейерверк-ланчер',
    'weapon_minigun': 'Миниган',
    'weapon_musket': 'Мушкет',
};

function isBlacklistedWeapon(hash) {
    return AC_RESTRICTED_WEAPONS.has(hash);
}

function getBlacklistedWeaponName(hash) {
    for (const [name, label] of Object.entries(AC_BLACKLISTED_WEAPON_NAMES)) {
        try { if (mp.joaat(name) === hash) return label; } catch(_) {}
    }
    return null;
}

function playerAlive(player) {
    try {
        return !!(player && mp.players.exists(player));
    } catch (_e) {
        return false;
    }
}

function safePosition(player) {
    try {
        if (!playerAlive(player)) return null;
        const pos = player.position;
        if (!pos || typeof pos.x !== 'number' || !isFinite(pos.x)) return null;
        return pos;
    } catch (_e) {
        return null;
    }
}

function getPlayerAllWeapons(player) {
    const weapons = [];
    if (!playerAlive(player)) return weapons;
    try {
        const allWeapons = player.getAllWeapons();
        if (allWeapons && Array.isArray(allWeapons)) {
            for (const w of allWeapons) {
                if (w && w.hash != null && w.hash !== 0) weapons.push(w.hash);
            }
        }
    } catch (_) {}
    if (!playerAlive(player)) return weapons;
    try {
        const current = player.weapon;
        if (current != null && current !== 0 && !weapons.includes(current)) weapons.push(current);
    } catch (_) {}
    return weapons;
}

const AC_WEAPON_GIVE_COOLDOWN_MS    = 800;
const AC_WEAPON_REPORT_COOLDOWN_MS  = 5000;
const AC_WEAPON_CHECK_INTERVAL_MS   = 250;
const AC_WEAPON_GRACE_SPAWN_MS      = 0;
const AC_WEAPON_GRACE_AUTH_MS       = 0;

const AC_FLY_CORRECTION_VIOLATIONS  = 2;
const AC_ENABLE_POSITION_CORRECTION = true;
const AC_MIN_AIR_STREAK_FOR_CORRECTION = 3;

const AC_MOVE_TICK_MS               = 500;
// --- Грейс-периоды слегка расширены (было 8000/4000) — компенсация
//     под ускоренный кик, чтобы не задеть игрока сразу после
//     коннекта / смены дименшена (см. пункт 3 шапки файла) ---
const AC_MOVE_BOOT_GRACE_MS         = 8000;
const AC_MOVE_DIM_GRACE_MS          = 5000;
const AC_MOVE_SNAP_DIST_M           = 70;
const AC_MOVE_MAX_SPEED_MPS         = 22;
const AC_MOVE_MAX_UP_DELTA_M        = 10;
const AC_MOVE_HORIZ_FOR_UP_CHECK    = 8;
const AC_MOVE_FLY_DIAG_DZ_MIN      = 6;
const AC_MOVE_FLY_DIAG_RATIO        = 0.35;
const AC_MOVE_FLY_DIAG_SPEED_MIN   = 11;
const AC_MOVE_FLY_STREAK_DZ_MIN   = 4;
const AC_MOVE_FLY_STREAK_SPEED_MIN = 9;
const AC_MOVE_REPORT_COOLDOWN_MS   = 4000; // было 8000 — репортим чаще, раз кик теперь быстрее
const AC_SUSPECT_FLY_WINDOW_MS     = 60000;
const AC_MAX_VERTICAL_SPEED        = 10;

// --- Непрерывность флая (анти-обход короткими паузами) ---
// ⏩ УСКОРЕНО ДЛЯ НАСТОЯЩЕГО ФЛАЯ: было 1500/600, стало 350/250 —
//    читер ловитсяalmost сразу после начала непрерывного полёта.
const AC_FLY_MIN_DURATION_MS       = 350;  // сколько нужно "лететь" подряд, чтобы триггернуть
const AC_FLY_GAP_TOLERANCE_MS      = 250;  // допустимый разрыв сигнала полёта без сброса (уменьшен — пауза = не полёт)

// --- Анти-пульс: короткие вспышки fly + пауза > GAP, чтобы сбросить streak ---
// Считаем долю «воздушного» времени в скользящем окне. Pulse-fly набирает
// очки даже если непрерывный streak каждый раз обрывается.
const AC_FLY_PULSE_WINDOW_MS       = 8000;  // окно накопления
const AC_FLY_PULSE_MIN_AIR_MS      = 2200;  // минимум суммарного air-сигнала в окне
const AC_FLY_PULSE_MIN_RATIO       = 0.30;  // >= 30% окна в air-signal
const AC_FLY_PULSE_SCORE           = 38;    // вклад за срабатывание (с кулдауном)
const AC_FLY_PULSE_SCORE_CD_MS     = 1200;  // не чаще раза в N мс

// --- Стрельба в воздухе (хит по игроку, пока shooter в air/fly-suspect) ---
const AC_FLY_AIRSHOT_RECENT_MS     = 900;   // последний fly-signal не старше
const AC_FLY_AIRSHOT_MIN_AIR_MS    = 250;   // минимум текущего/недавнего air
const AC_FLY_AIRSHOT_SCORE         = 48;    // сильный вклад: fly+бой
const AC_FLY_AIRSHOT_SCORE_CD_MS   = 700;   // антиспам по хитам

// ⏩ УСКОРЕНО: было 6 — теперь кик уже после 2-х аномалий за окно.
const AC_KICK_THRESHOLD_MOVEMENT   = 2;
const AC_KICK_THRESHOLD_WEAPON     = 4;
const AC_KICK_WINDOW_MS            = 90000;

const AC_NOCLIP_MAX_AIR_TIME_MS    = 12000;

const AC_VANISH_CHECK_INTERVAL_MS  = 1000;

// Wallbang удалён по запросу

// --- Единая система очков ФЛАЙ/ТП-обход (v4.1) ---
// Раньше ТП-рывки и непрерывный флай жили в двух разных системах
// (счёт с затуханием -> обычный репорт -> отдельный счётчик кика
// на 2/90с). Теперь один общий счёт от 0 до порога кика:
//  - ТП-рывок (резкий скачок дистанции, который потом ОСТАНАВЛИВАЕТСЯ,
//    т.е. не сустейн-полёт) добавляет НЕБОЛЬШОЕ количество очков —
//    откалибровано так, чтобы ~4 ТП за 10 сек (например, админ-телепорты
//    или частая быстрая перемещалка в геймоде) НЕ добивали до кика.
//  - Непрерывный полёт (настоящий флай-хак, сигнал держится тик за
//    тиком) добавляет очки быстро — за 1.5-2 сек сустейн-полёта счёт
//    уже добивает до кика.
//  - Счёт тает во времени экспоненциально, общий для обоих источников —
//    если читер чередует ТП и короткие зависания, очки всё равно
//    складываются в одну шкалу.
//  - Кик происходит автоматически при достижении порога — не нужно
//    дожидаться второго срабатывания через отдельное окно.
const AC_FLY_KICK_SCORE_THRESHOLD   = 130;   // порог -> кик (ослаблено — меньше ложных)
const AC_FLY_KICK_SCORE_HALFLIFE_MS = 32000; // за это время очки тают вдвое

// ТП-рывок (одиночный скачок дистанции, затем остановка) — вклад мал.
// REF_GAP подобран так, чтобы разрыв ~2.5-3.3с (характерный для 4 ТП
// за 10 сек) давал вклад около BASE, а не потолок MAX_ADD.
const AC_TP_SCORE_REF_GAP_MS = 3000; // "опорный" разрыв между ТП
const AC_TP_SCORE_BASE       = 10;   // базовый вклад одного ТП при разрыве = REF_GAP (снижен для меньше ложных)
const AC_TP_SCORE_MAX_ADD    = 18;   // потолок вклада одного ТП (снижен — одиночные ТП几乎不 добирают)

// Непрерывный полёт — вклад за каждый тик (AC_MOVE_TICK_MS = 500мс),
// пока сигнал полёта держится непрерывно (после AC_FLY_MIN_DURATION_MS
// подряд). УСИЛЕН: было 40 — стало 65, реальный флай-хак кикается
// за ~1 тик после минимального сустейна (~0.8-1 сек).
const AC_FLY_SCORE_PER_TICK = 45;

// Дискорд по этой системе шлём не на каждое начисление очков, а не
// чаще раза в это окно — момент самого кика шлём всегда, вне очереди.
// Также не шлём, пока очки не набрали AC_FLY_SCORE_DISCORD_MIN —
// чтобы мелкие вспышки (редкие ТП) не засоряли канал.
const AC_FLY_SCORE_DISCORD_THROTTLE_MS = 3000;
const AC_FLY_SCORE_DISCORD_MIN         = 15;   // минимум очков для отправки в Дискорд (кроме кика)

// --- Защита от ложных снапов сразу после входа на сервер ---
// При логине/создании персонажа сервер сам телепортит игрока несколько
// раз подряд (превью, смена точки, финальный спавн и т.д.) — без этой
// защиты это выглядело бы для детектора как читерский ТП-спам.
// БЕЗ САМОПРОДЛЕНИЯ: фиксированное окно 45 сек от момента входа на
// сервер (playerAuth), дальше защита снимается в любом случае, сколько
// бы снапов внутри неё ни было.
const AC_SNAP_GRACE_MS = 45000; // фиксированное окно защиты от входа на сервер, без продления

// ============================================================
//  УТИЛИТЫ
// ============================================================

function getPlayerAdminLevel(player) {
    if (!player) return 0;
    const a = Number(player.adminlvl);
    if (!Number.isNaN(a) && a > 0) return a;
    try {
        const v = Number(player.getVariable('adminlvl'));
        return Number.isNaN(v) ? 0 : v;
    } catch (_e) { return 0; }
}

function getAcState(player) {
    if (!player || player.static == null) return null;
    const sid = player.static;
    if (!acState.has(sid)) {
        acState.set(sid, {
            allowedWeapons: new Set(),
            lastWeaponGive: 0,
            weaponReportAt: 0,
            weaponGraceUntil: 0,
            weaponViolations: [],
            lastGoodPos: null,
            flySuspectUntil: 0,
            lastReportAt: 0,
            flyViolations: 0,
            airStreak: 0,
            lastGroundedAt: Date.now(),
            moveViolations: [],
            airStartTime: 0,
            consecutiveAirTicks: 0,
            recentKills: 0,
            lastKillAt: 0,
            vanishPressCount: 0,
            lastVanishPressAt: 0,
            vanishSuspicionLevel: 0,
            // единая система очков флай/ТП-обход (v4.1) — счёт с затуханием
            flyScore: 0,
            flyScoreAt: 0,
            flyScoreLastDiscordAt: 0,
            // фиксированная (без продления) защита от снапов при входе на сервер
            snapGraceUntil: 0,
            // wallbang удалён
        });
    }
    return acState.get(sid);
}

function clearAcState(staticId) { acState.delete(staticId); }

function notifyAcWatchers(message) {
    mp.players.forEach((p) => {
        if (!mp.players.exists(p)) return;
        if (getPlayerAdminLevel(p) < 1) return;
        if (p.getVariable('ac') !== true) return;
        try { p.outputChatBox(message); } catch (_e) {}
    });
}

// ============================================================
//  АВТОКИК
// ============================================================

function addViolation(player, type) {
    try {
        if (!localAcDetectionsEnabled()) return false;
        if (!mp.players.exists(player)) return false;
        const state = getAcState(player);
        if (!state) return false;
        const now = Date.now();
        const cutoff = now - AC_KICK_WINDOW_MS;

        if (type === 'movement') {
            state.moveViolations.push(now);
            state.moveViolations = state.moveViolations.filter(t => t > cutoff);
            if (state.moveViolations.length >= AC_KICK_THRESHOLD_MOVEMENT) {
                kickPlayer(player, 'Флай/Спидхак/Ноклип', state.moveViolations.length);
                return true;
            }
        } else if (type === 'weapon') {
            state.weaponViolations.push(now);
            state.weaponViolations = state.weaponViolations.filter(t => t > cutoff);
            if (state.weaponViolations.length >= AC_KICK_THRESHOLD_WEAPON) {
                kickPlayer(player, 'Читерское оружие', state.weaponViolations.length);
                return true;
            }
        } else if (type === 'vanish') {
            // Автоматически задетекченный vanish по состоянию (alpha/invincible/
            // nocollision вне спавна/смерти) — это поведенческая улика,
            // а не единичное нажатие клавиши, поэтому кикаем сразу.
            kickPlayer(player, 'Обнаружен чит Vanish (F4)', 1);
            return true;
        }
        return false;
    } catch (e) { return false; }
}

function localAcDetectionsEnabled() {
    try {
        if (typeof global.metaAcHostActive === 'function' && global.metaAcHostActive()) return false;
    } catch (_e) {}
    return true;
}

function localAcShouldKick() {
    return localAcDetectionsEnabled();
}

global.localAcDetectionsEnabled = localAcDetectionsEnabled;

function kickPlayer(player, reason, count, instant = false) {
    try {
        if (!mp.players.exists(player)) return;
        const login = player.login || '?';
        const sid = player.static != null ? player.static : '?';

        if (!localAcShouldKick()) {
            let testMode = false;
            try {
                const mac = require('./metaac/config');
                testMode = !!(mac && mac.testMode);
            } catch (_e) {
                // metaac disabled
            }
            if (testMode) {
                notifyAcWatchers(`!{yellow}[AC] WOULD KICK !{red}[#${sid}] ${login} !{white}${reason} (${count}) · testMode`);
                try { player.outputChatBox(`!{yellow}[AC] WOULD KICK: ${reason}`); } catch (_e2) {}
                console.log(`[anticheat] WOULD KICK #${sid} ${login}: ${reason}`);
            }
            return;
        }

        notifyAcWatchers(`!{red}[AC-KICK] !{yellow}[#${sid}] ${login} !{white}кикнут: ${reason} (${count} наруш.)`);

        sendDiscordEmbedToChannel(buildAcEmbed('kick', '🚫 АВТОКИК', player, [
            { name: '⚠️ Причина',   value: `\`${reason}\``,          inline: true },
            { name: '📊 Нарушений', value: `\`${count}\``,           inline: true },
        ]));

        try { player.outputChatBox(`!{red}Вы кикнуты: ${reason}`); } catch(_) {}
        if (instant) {
            try { if (mp.players.exists(player)) player.kick(reason); } catch(_) {}
        } else {
            setTimeout(() => {
                try { if (mp.players.exists(player)) player.kick(reason); } catch(_) {}
            }, 300);
        }
    } catch (e) {}
}

// ============================================================
//  ОРУЖИЕ
// ============================================================

function acGiveWeapon(player, weaponHash, ammo = 0, equipNow = true) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    try { player.giveWeapon(weaponHash, ammo, equipNow); } catch (e) {}
}

function acClearWeapons(player) {
    if (!mp.players.exists(player)) return;
    try { player.removeAllWeapons(); } catch (_) {}
}

function isWeaponAllowed(player, weaponHash) {
    if (!player || weaponHash == null) return false;
    const state = getAcState(player);
    return state ? state.allowedWeapons.has(weaponHash) : false;
}

function stripIllegalWeapons(player) {
    try {
        if (!mp.players.exists(player)) return;
        player.removeAllWeapons();
    } catch (e) {}
}

// ============================================================
//  VANISH (F4) — АВТО-ДЕТЕКТ ПО СОСТОЯНИЮ (остаётся мгновенным)
// ============================================================

function handleVanishAutoDetection(player, detectionMethod) {
    try {
        if (!localAcDetectionsEnabled()) return;
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;

        const login = player.login;
        const sid = player.static;
        const adminlvl = getPlayerAdminLevel(player);

        if (adminlvl >= 1 && global.metaAcDetectAdmins !== true) return;
        if (player.getVariable('fly') === true) return;
        if (player.spSpectateActive === true) return;

        const state = getAcState(player);
        const now = Date.now();

        if (state) {
            state.vanishPressCount = (state.vanishPressCount || 0) + 1;
            state.lastVanishPressAt = now;
            state.vanishSuspicionLevel = Math.min(100, (state.vanishSuspicionLevel || 0) + 50);
        }

        const totalPresses = state ? state.vanishPressCount : 1;
        const suspicionLevel = state ? state.vanishSuspicionLevel : 100;

        notifyAcWatchers(`!{red}[AC-VANISH] !{yellow}[#${sid}] ${login} !{white}обнаружен чит Vanish (авто-детект)! Всего: ${totalPresses}`);

        sendDiscordEmbedToChannel(buildAcEmbed('vanish', '👻 VANISH — ОБНАРУЖЕН ЧИТ (авто-детект по состоянию)', player, [
            { name: '📊 Всего срабатываний', value: `\`${totalPresses}\``,                       inline: true },
            { name: '⚠️ Уровень угрозы',     value: `\`${suspicionLevel}%\``,                     inline: true },
            { name: '🔍 Метод',              value: `\`${detectionMethod}\``,                     inline: true },
            { name: '📝 Действие',           value: '🚫 МГНОВЕННЫЙ КИК',                          inline: true },
        ], `⚠️ Чит Vanish обнаружен по фактическому состоянию игрока (не по нажатию клавиши).\nИгрок: ${login} (#${sid})\nМетод: ${detectionMethod}`));

        addViolation(player, 'vanish');
    } catch (e) {}
}

function checkVanishIndicators(player) {
    try {
        if (!localAcDetectionsEnabled()) return;
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (getPlayerAdminLevel(player) >= 1 && global.metaAcDetectAdmins !== true) return;
        // F5 noclip / admin fly: alpha=0 is legitimate — not Vanish cheat
        if (player.getVariable('fly') === true) return;
        if (player.spSpectateActive === true) return;

        try {
            const alpha = player.getAlpha ? player.getAlpha() : 255;
            // setInvisible(0) stores invisible=0 (falsy) — still duty invis
            const inv = player.getVariable('invisible');
            const dutyInvis = inv === 0 || inv === true || inv === 1;
            if (alpha === 0 && !player.getVariable('dead') && !dutyInvis) {
                handleVanishAutoDetection(player, 'auto-invisible');
                return;
            }
        } catch (_) {}

        try {
            if (player.getVariable && player.getVariable('invincible') === true) {
                handleVanishAutoDetection(player, 'auto-invincible');
                return;
            }
        } catch (_) {}

        try {
            if (player.getVariable && player.getVariable('noCollision') === true) {
                handleVanishAutoDetection(player, 'auto-nocollision');
                return;
            }
        } catch (_) {}
    } catch (e) {}
}

setInterval(() => {
    try {
        mp.players.forEach(player => {
            if (!mp.players.exists(player)) return;
            if (!player.getVariable('auth')) return;
            checkVanishIndicators(player);
        });
    } catch (e) {}
}, AC_VANISH_CHECK_INTERVAL_MS);

// ============================================================
//  ДВИЖЕНИЕ / ФЛАЙ (непрерывность + допуск на разрыв, ускоренный кик)
// ============================================================

function reportMovementAnomaly(player, code, detail) {
    try {
        if (!localAcDetectionsEnabled()) return;
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const state = getAcState(player);
        const now = Date.now();
        if (state && state.lastReportAt && now < state.lastReportAt + AC_MOVE_REPORT_COOLDOWN_MS) return;
        if (state) state.lastReportAt = now;

        markFlyingSuspect(player);

        const isVertical = code.includes('fly') || code.includes('vertical') || code.includes('noclip');
        let violations = 0;
        if (isVertical) violations = incrementFlyViolation(player);

        const login = player.login || '?';
        const sid = player.static != null ? player.static : '?';

        const dist  = detail.dist  != null ? Number(detail.dist).toFixed(1)  : '?';
        const speed = detail.speed != null ? Number(detail.speed).toFixed(1) : '?';
        const vSpd  = detail.vSpeed!= null ? Number(detail.vSpeed).toFixed(1): '?';
        const dz    = detail.dz    != null ? Number(detail.dz).toFixed(2)    : '?';
        const dt    = detail.dt    != null ? Number(detail.dt).toFixed(2)    : '?';
        const durMs = detail.durationMs != null ? Math.round(detail.durationMs) : null;
        const score = detail.score != null ? detail.score : null;
        const gapMs = detail.gapMs != null ? detail.gapMs : null;

        notifyAcWatchers(`!{yellow}[AC-MOVE] !{red}[#${sid}] ${login} !{white}${code} !{DodgerBlue}d=${dist}м spd=${speed}${durMs != null ? ` dur=${durMs}мс` : ''}`);

        const emoji = code.includes('fly') ? '🪂' : code.includes('speed') ? '💨' : code.includes('teleport') ? '⚡' : code.includes('noclip') ? '👻' : '🏃';

        const fields = [
            { name: '📏 Дистанция',      value: `\`${dist}\` м`,   inline: true },
            { name: '💨 Скорость',        value: `\`${speed}\` м/с`, inline: true },
            { name: '⬆️ Верт. скорость', value: `\`${vSpd}\` м/с`,  inline: true },
            { name: '📐 dZ',              value: `\`${dz}\` м`,     inline: true },
            { name: '⏱️ dt',              value: `\`${dt}\` сек`,   inline: true },
            { name: '🔢 Наруш.',          value: `\`${violations || 0}\``, inline: true },
        ];
        if (durMs != null) fields.push({ name: '🪂 Непрерывный полёт', value: `\`${durMs}\` мс`, inline: true });

        sendDiscordEmbedToChannel(buildAcEmbed('movement', `${emoji} ${code.toUpperCase()}`, player, fields));

        if (state && (state.flyViolations || 0) >= AC_FLY_CORRECTION_VIOLATIONS) {
            correctPlayerPosition(player);
        }

        addViolation(player, 'movement');
    } catch (e) {}
}

function shouldSkipMovementSample(player) {
    try {
    if (!playerAlive(player)) return true;
    if (!player.getVariable('auth')) return true;
    // Legit admin duty (F5 noclip / spectate) — NEVER treat as cheat fly, even with detectAdmins
    if (player.getVariable('fly') === true && getPlayerAdminLevel(player) >= 1) return true;
    if (player.spSpectateActive === true) return true;
    if (getPlayerAdminLevel(player) >= 1 && global.metaAcDetectAdmins !== true) return true;
    if (player.getVariable('dead') === true) return true;
    try {
        if (player.vehicle) return true;
    } catch (_veh) {
        return true;
    }
    try {
        const dragVar = player.getVariable('im.followed');
        if (dragVar != null && dragVar !== -1 && Number(dragVar) > 0) return true;
        const cuffVar = player.getVariable('adminCuffed');
        if (cuffVar != null && cuffVar !== -1 && Number(cuffVar) > 0) return true;
    } catch (_) {}
    try {
        if (typeof global.metaAcInVerticalGrace === 'function' && global.metaAcInVerticalGrace(player)) return true;
        if (player._metaAcVertUntil && Date.now() < player._metaAcVertUntil) return true;
        if (player.getVariable('acVertical') === true) return true;
        if (player.getVariable('parachute') === true) return true;
        if (player.getVariable('falling') === true) return true;
        if (player.getVariable('ragdoll') === true) return true;
        if (player.getVariable('teleporting') === true) return true;
        if (player.getVariable('freeze') === true) return true;
        if (player.getVariable('frozen') === true) return true;
        if (player.getVariable('swimming') === true) return true;
        if (player.getVariable('interior') === true) return true;
        if (player.getVariable('loading') === true) return true;
        if (player.getVariable('inAnimation') === true) return true;
        // ⚠️ ВАЖНО: не трогать — это те самые исключения для ТП
        // (админский телепорт игрока), спавна и смены дименшена,
        // которые обязательно должны остаться при ускоренном кике.
        if (player._acJustExitedVehicleUntil && Date.now() < player._acJustExitedVehicleUntil) return true;
        if (player._acJustSpawnedUntil && Date.now() < player._acJustSpawnedUntil) return true;
        if (player._acJustTeleportedUntil && Date.now() < player._acJustTeleportedUntil) return true;
    } catch (_) {}

    return false;
    } catch (_skip) {
        return true;
    }
}

function incrementFlyViolation(player) {
    const state = getAcState(player);
    if (!state) return 0;
    state.flyViolations = (state.flyViolations || 0) + 1;
    return state.flyViolations;
}

function decayFlyViolations(player) {
    const state = getAcState(player);
    if (!state || !state.flyViolations) return;
    if (!state.lastViolationDecay || Date.now() - state.lastViolationDecay > 30000) {
        state.flyViolations = Math.max(0, state.flyViolations - 1);
        state.lastViolationDecay = Date.now();
    }
}

function updateGroundedState(player, dz, speed) {
    const state = getAcState(player);
    if (!state) return;

    if (Math.abs(dz) < 1.5 && speed < 18) {
        state.lastGroundedAt = Date.now();
        state.airStreak = 0;
        state.consecutiveAirTicks = 0;
        state.airStartTime = 0;
    } else {
        state.airStreak = (state.airStreak || 0) + 1;
        state.consecutiveAirTicks = (state.consecutiveAirTicks || 0) + 1;
        if (!state.airStartTime) state.airStartTime = Date.now();
    }
}

function correctPlayerPosition(player) {
    try {
        if (!mp.players.exists(player) || !AC_ENABLE_POSITION_CORRECTION) return;
        try {
            const mac = require('./metaac/config');
            if (mac && mac.testMode) return;
        } catch (_e) {
            // metaac disabled
        }
        const state = getAcState(player);
        if (!state || !state.lastGoodPos) return;
        try {
            if (player.vehicle || player.getVariable('dead')) return;
        } catch (_veh) { return; }
        if ((state.airStreak || 0) < AC_MIN_AIR_STREAK_FOR_CORRECTION) return;
        if (!playerAlive(player)) return;

        try { player.position = state.lastGoodPos; } catch (_set) { return; }
        player._acLastMoveSample = null;

        notifyAcWatchers(`!{yellow}[AC] !{red}[#${player.static || '?'}] ${player.login || '?'} !{white}позиция скорректирована`);

        sendDiscordEmbedToChannel(buildAcEmbed('correction', '📌 КОРРЕКЦИЯ ПОЗИЦИИ', player, [
            { name: '🔢 Наруш.', value: `\`${state.flyViolations}\``, inline: true },
            { name: '🪂 Air',    value: `\`${state.airStreak || 0}\``, inline: true },
        ]));
    } catch (e) {}
}

function markFlyingSuspect(player) {
    if (!mp.players.exists(player)) return;
    const state = getAcState(player);
    if (state) state.flySuspectUntil = Date.now() + AC_SUSPECT_FLY_WINDOW_MS;
    player._acFlyingSuspectUntil = Date.now() + AC_SUSPECT_FLY_WINDOW_MS;
}

function isFlyingSuspect(player) {
    if (!mp.players.exists(player)) return false;
    const state = getAcState(player);
    if (state && state.flySuspectUntil && Date.now() < state.flySuspectUntil) return true;
    return !!(player._acFlyingSuspectUntil && Date.now() < player._acFlyingSuspectUntil);
}

// Полный сброс "непрерывности" полёта (вызывается на телепорт/спавн/смену дименшена/скип тика)
function resetFlyContinuity(player, opts) {
    // Перед обрывом streak — складируем в pulse-банк (анти-пульс)
    if (!opts || opts.bankPulse !== false) {
        bankFlyStreakIntoPulse(player);
    }
    player._acFlyStreakStartAt = null;
    player._acFlyLastSignalAt = null;
}

function resetFlyPulse(player) {
    player._acPulseSegs = null;
    player._acPulseLastScoreAt = 0;
    player._acAirShotLastAt = 0;
}

function prunePulseSegs(player, now) {
    const segs = player._acPulseSegs;
    if (!segs || !segs.length) return;
    const cutoff = now - AC_FLY_PULSE_WINDOW_MS;
    player._acPulseSegs = segs.filter((s) => s && s.t >= cutoff && s.ms > 0);
}

function bankFlyStreakIntoPulse(player) {
    try {
        if (!player || !player._acFlyStreakStartAt || !player._acFlyLastSignalAt) return;
        const airMs = player._acFlyLastSignalAt - player._acFlyStreakStartAt;
        if (airMs < 80) return;
        const now = Date.now();
        if (!player._acPulseSegs) player._acPulseSegs = [];
        player._acPulseSegs.push({ t: now, ms: Math.min(airMs, AC_FLY_PULSE_WINDOW_MS) });
        prunePulseSegs(player, now);
    } catch (_e) {}
}

function getPulseAirMs(player, now) {
    prunePulseSegs(player, now);
    let sum = 0;
    const segs = player._acPulseSegs;
    if (segs) {
        for (let i = 0; i < segs.length; i++) sum += segs[i].ms || 0;
    }
    // открытый streak тоже в доле окна
    if (player._acFlyStreakStartAt) {
        sum += Math.max(0, now - player._acFlyStreakStartAt);
    }
    return sum;
}

/** Анти-пульс: если в окне много air-сигнала кусками — копим очки. */
function maybeScoreFlyPulse(player, detail) {
    try {
        if (!mp.players.exists(player)) return;
        const now = Date.now();
        const airMs = getPulseAirMs(player, now);
        if (airMs < AC_FLY_PULSE_MIN_AIR_MS) return;
        const ratio = airMs / AC_FLY_PULSE_WINDOW_MS;
        if (ratio < AC_FLY_PULSE_MIN_RATIO) return;
        if (player._acPulseLastScoreAt && (now - player._acPulseLastScoreAt) < AC_FLY_PULSE_SCORE_CD_MS) return;

        player._acPulseLastScoreAt = now;
        const score = addFlyScore(player, AC_FLY_PULSE_SCORE);
        maybeReportFlyScore(player, 'pulse-fly', {
            ...(detail || {}),
            durationMs: airMs,
            pulseRatio: ratio,
        }, score);
    } catch (_e) {}
}

/** Shooter в воздухе / недавний fly-signal — для air-shoot. */
function isAirShootSuspect(player) {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return false;
        if (player.getVariable('fly') === true && getPlayerAdminLevel(player) >= 1) return false;
        if (player.spSpectateActive === true) return false;
        if (getPlayerAdminLevel(player) >= 1 && global.metaAcDetectAdmins !== true) return false;
        try {
            if (player.vehicle || player.getVariable('dead') === true) return false;
        } catch (_veh) { return false; }
        if (player.getVariable('parachute') === true) return false;
        if (player._acJustTeleportedUntil && Date.now() < player._acJustTeleportedUntil) return false;
        if (player._acJustSpawnedUntil && Date.now() < player._acJustSpawnedUntil) return false;
        if (player._acJustExitedVehicleUntil && Date.now() < player._acJustExitedVehicleUntil) return false;

        const now = Date.now();
        if (player._acFlyStreakStartAt) {
            const airMs = now - player._acFlyStreakStartAt;
            if (airMs >= AC_FLY_AIRSHOT_MIN_AIR_MS) return true;
        }
        if (player._acFlyLastSignalAt && (now - player._acFlyLastSignalAt) <= AC_FLY_AIRSHOT_RECENT_MS) {
            return true;
        }
        // pulse bank: недавно много воздуха
        const pulseAir = getPulseAirMs(player, now);
        if (pulseAir >= AC_FLY_PULSE_MIN_AIR_MS * 0.55) return true;

        const state = getAcState(player);
        if (state && state.airStartTime && (now - state.airStartTime) >= 600 && (state.airStreak || 0) >= 2) {
            return true;
        }
        return false;
    } catch (_e) {
        return false;
    }
}

function noteAirShoot(attacker, meta) {
    try {
        if (!attacker || !mp.players.exists(attacker)) return;
        if (!isAirShootSuspect(attacker)) return;
        const now = Date.now();
        if (attacker._acAirShotLastAt && (now - attacker._acAirShotLastAt) < AC_FLY_AIRSHOT_SCORE_CD_MS) return;
        attacker._acAirShotLastAt = now;

        const score = addFlyScore(attacker, AC_FLY_AIRSHOT_SCORE);
        maybeReportFlyScore(attacker, 'air-shoot', {
            dist: meta && meta.dist,
            durationMs: attacker._acFlyStreakStartAt ? (now - attacker._acFlyStreakStartAt) : null,
        }, score);
    } catch (_e) {}
}

// ============================================================
//  ЕДИНАЯ СИСТЕМА ОЧКОВ ФЛАЙ/ТП-ОБХОД (v4.1)
//  См. константы AC_FLY_KICK_SCORE_*, AC_TP_SCORE_*, AC_FLY_SCORE_*
//  в блоке НАСТРОЙКИ выше.
// ============================================================

// Добавляет очки в общий счёт с экспоненциальным затуханием во времени
// (полураспад AC_FLY_KICK_SCORE_HALFLIFE_MS) и возвращает итоговый счёт.
function addFlyScore(player, rawPoints) {
    const state = getAcState(player);
    if (!state) return 0;
    state.flyScore = (state.flyScore || 0) + rawPoints;
    state.flyScoreAt = Date.now();
    return state.flyScore;
}

// Уведомляет о начислении очков (с троттлингом Дискорда — не чаще раза
// в AC_FLY_SCORE_DISCORD_THROTTLE_MS) и кикает при достижении порога.
// Момент кика отправляется в Дискорд/чат всегда, даже если троттлинг
// ещё не истёк — чтобы факт кика никогда не потерялся.
function maybeReportFlyScore(player, code, detail, score) {
    try {
        if (!localAcDetectionsEnabled()) return;
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        const state = getAcState(player);
        if (!state) return;
        const now = Date.now();

        markFlyingSuspect(player);

        const kicked = score >= AC_FLY_KICK_SCORE_THRESHOLD;

        const login = player.login || '?';
        const sid = player.static != null ? player.static : '?';
        const dist  = detail.dist  != null ? Number(detail.dist).toFixed(1)  : '?';
        const speed = detail.speed != null ? Number(detail.speed).toFixed(1) : '?';
        const durMs = detail.durationMs != null ? Math.round(detail.durationMs) : null;

        if (kicked) {
            if (!localAcShouldKick()) return;
            state.flyScoreLastDiscordAt = now;

            notifyAcWatchers(`!{yellow}[AC-FLY-SCORE] !{red}[#${sid}] ${login} !{white}${code} !{DodgerBlue}score=${Math.round(score)}/${AC_FLY_KICK_SCORE_THRESHOLD} — КИК`);

            const fields = [
                { name: '🔍 Тип',      value: `\`${code}\``, inline: true },
                { name: '📊 Очки',     value: `\`${Math.round(score)} / ${AC_FLY_KICK_SCORE_THRESHOLD}\``, inline: true },
                { name: '📏 Дистанция', value: `\`${dist}\` м`, inline: true },
                { name: '💨 Скорость',  value: `\`${speed}\` м/с`, inline: true },
            ];
            if (durMs != null) fields.push({ name: '🪂 Непрерывный полёт', value: `\`${durMs}\` мс`, inline: true });

            sendDiscordEmbedToChannel(buildAcEmbed('fly', '🚫 ФЛАЙ/ТП-ОБХОД — КИК', player, fields));

            let reason = 'Обход флай-детекта телепортами';
            if (code === 'vertical-fly') reason = 'Флай-хак (непрерывный полёт)';
            else if (code === 'pulse-fly') reason = 'Флай-хак (pulse / прерывистый полёт)';
            else if (code === 'air-shoot') reason = 'Флай-хак (стрельба в воздухе)';
            kickPlayer(player, reason, Math.round(score));
            state.flyScore = 0;
            state.flyScoreAt = 0;
        } else {
            if (score < AC_FLY_SCORE_DISCORD_MIN) return;
            const throttleElapsed = !state.flyScoreLastDiscordAt || (now - state.flyScoreLastDiscordAt) >= AC_FLY_SCORE_DISCORD_THROTTLE_MS;
            if (throttleElapsed) {
                state.flyScoreLastDiscordAt = now;

                notifyAcWatchers(`!{yellow}[AC-FLY-SCORE] !{red}[#${sid}] ${login} !{white}${code} !{DodgerBlue}score=${Math.round(score)}/${AC_FLY_KICK_SCORE_THRESHOLD}`);

                const fields = [
                    { name: '🔍 Тип',      value: `\`${code}\``, inline: true },
                    { name: '📊 Очки',     value: `\`${Math.round(score)} / ${AC_FLY_KICK_SCORE_THRESHOLD}\``, inline: true },
                    { name: '📏 Дистанция', value: `\`${dist}\` м`, inline: true },
                    { name: '💨 Скорость',  value: `\`${speed}\` м/с`, inline: true },
                ];
                if (durMs != null) fields.push({ name: '🪂 Непрерывный полёт', value: `\`${durMs}\` мс`, inline: true });

                sendDiscordEmbedToChannel(buildAcEmbed('fly', '🪂 ФЛАЙ/ТП-ОБХОД — накопление очков', player, fields));
            }
        }
    } catch (e) {}
}

function tickPlayerMovementAc(player) {
    try {
    if (!localAcDetectionsEnabled()) return;
    if (!playerAlive(player)) return;
    if (shouldSkipMovementSample(player)) {
        if (!playerAlive(player)) return;
        player._acLastMoveSample = null;
        player._acMoveBootStartedAt = null;
        resetFlyContinuity(player, { bankPulse: false });
        resetFlyPulse(player);
        const state = getAcState(player);
        if (state) {
            state.airStreak = 0;
            state.consecutiveAirTicks = 0;
            state.airStartTime = 0;
            decayFlyViolations(player);
        }
        return;
    }

    const pos = safePosition(player);
    if (!pos) return;

    const now = Date.now();
    const dim = player.dimension;

    if (player._acLastMoveDim !== undefined && player._acLastMoveDim !== dim) {
        player._acMoveDimGraceUntil = now + AC_MOVE_DIM_GRACE_MS;
        resetFlyContinuity(player, { bankPulse: false });
        resetFlyPulse(player);
    }
    player._acLastMoveDim = dim;
    if (player._acMoveDimGraceUntil && now < player._acMoveDimGraceUntil) {
        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        return;
    }

    if (!player._acMoveBootStartedAt) {
        player._acMoveBootStartedAt = now;
        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        return;
    }
    if (now - player._acMoveBootStartedAt < AC_MOVE_BOOT_GRACE_MS) {
        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        return;
    }

    const last = player._acLastMoveSample;
    if (!last) {
        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        return;
    }

    let dt = (now - last.t) / 1000;
    if (dt < 0.3) return;
    if (dt > 5) {
        resetFlyContinuity(player, { bankPulse: false });
        resetFlyPulse(player);
        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        const state = getAcState(player);
        if (state) { state.airStreak = 0; state.consecutiveAirTicks = 0; state.airStartTime = 0; }
        return;
    }

    const dx = pos.x - last.x;
    const dy = pos.y - last.y;
    const dz = pos.z - last.z;
    const horiz = Math.sqrt(dx * dx + dy * dy);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const speed = dist / dt;
    const vSpeed = Math.abs(dz) / dt;

    const isFalling = dz < -3;
    const absDz = Math.abs(dz);
    const standingStill = absDz < 0.5 && speed < 2.6 && horiz < 1.1;
    if (standingStill) {
        resetFlyContinuity(player, { bankPulse: false });
        resetFlyPulse(player);
        const idleState = getAcState(player);
        if (idleState) {
            idleState.airStreak = 0;
            idleState.consecutiveAirTicks = 0;
            idleState.airStartTime = 0;
            if (idleState.flyScore) {
                idleState.flyScore *= 0.35;
                if (idleState.flyScore < 3) idleState.flyScore = 0;
            }
        }
        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        return;
    }
    // Tower jump / freefall: big downward move must not score as teleport
    const isFreefallSnap =
        dz <= -2.5 &&
        (absDz >= horiz * 0.75 || (dz <= -12 && horiz < absDz * 0.9) || (dz <= -4 && absDz / Math.max(dist, 0.01) >= 0.82));

    // --- Телепорт / рывок дистанции ---
    // См. п.2 шапки файла. Сначала проверяем самопродлевающуюся защиту
    // от логина/создания персонажа (см. AC_SNAP_GRACE_*): если она ещё
    // активна — снап полностью игнорируется и лишь продлевает защиту
    // (в пределах жёсткого потолка). Если защиты уже нет (истекла или
    // не выдавалась) — работает обычный плавный счёт подозрения с
    // затуханием: одиночный редкий ТП почти не добавляет очков и
    // растворяется за десятки секунд, а частые ТП в любом ритме
    // накапливаются быстрее, чем тают, и рано или поздно пересекают порог.
    if (dist >= AC_MOVE_SNAP_DIST_M && dt < 2.0) {
        // Freefall from height (вышка) — not a teleport cheat
        if (isFreefallSnap || isFalling) {
            player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
            resetFlyContinuity(player, { bankPulse: false });
            resetFlyPulse(player);
            return;
        }

        const snapState = getAcState(player);

        // Фикс-грейс без продления: 30 сек от входа на сервер (playerAuth).
        // Внутри окна снапы вообще не считаются в очки. Никакого продления
        // не происходит — сколько бы снапов ни было, защита снимается
        // ровно через 30 сек после логина.
        if (snapState && snapState.snapGraceUntil && now < snapState.snapGraceUntil) {
            player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
            resetFlyContinuity(player, { bankPulse: false });
            return;
        }

        if (snapState) {
            const lastAt = snapState.flyScoreAt || 0;
            const gapMs = lastAt ? (now - lastAt) : Infinity;
            const effectiveGapMs = Number.isFinite(gapMs) ? Math.max(gapMs, 250) : AC_TP_SCORE_REF_GAP_MS * 100;

            // ТП-рывок: резкий скачок дистанции, который затем ОСТАНАВЛИВАЕТСЯ
            // (в отличие от сустейн-полёта ниже) — вклад в очки небольшой,
            // откалиброван под ~4 ТП за 10 сек без кика (см. константы выше).
            const contribution = Math.min(
                AC_TP_SCORE_MAX_ADD,
                AC_TP_SCORE_BASE * (AC_TP_SCORE_REF_GAP_MS / effectiveGapMs)
            );

            const score = addFlyScore(player, contribution);

            maybeReportFlyScore(player, 'teleport-fly-pattern', {
                dist, speed, vSpeed, dz, dt,
                gapMs: Number.isFinite(gapMs) ? Math.round(gapMs) : null,
            }, score);
        }

        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        resetFlyContinuity(player, { bankPulse: false });
        return;
    }

    // --- Спидхак ---
    if (speed >= AC_MOVE_MAX_SPEED_MPS && dt < 2.5 && !isFalling) {
        reportMovementAnomaly(player, 'speed-anomaly', { dist, speed, vSpeed, dz, dt });
        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        return;
    }

    // --- Резкая вертикальная скорость (мгновенный триггер, не требует непрерывности) ---
    let inVeh = false;
    try { inVeh = !!player.vehicle; } catch (_veh) { inVeh = false; }
    if (vSpeed >= AC_MAX_VERTICAL_SPEED && dt < 2.0 && !inVeh && !isFalling) {
        reportMovementAnomaly(player, 'vertical-speed', { dist, speed, vSpeed, dz, dt });
        player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
        return;
    }

    // ==========================================================
    //  ФЛАЙ: сигнал полёта детектится на каждом тике, триггерим,
    //  когда сигнал держится непрерывно AC_FLY_MIN_DURATION_MS
    //  (теперь 600мс вместо 1500), допуская разрывы сигнала не
    //  длиннее AC_FLY_GAP_TOLERANCE_MS (400мс).
    // ==========================================================
    const flyClassicSignal  = dz > AC_MOVE_MAX_UP_DELTA_M * 0.7 && horiz < AC_MOVE_HORIZ_FOR_UP_CHECK && dt < 2.0;
    const flyDiagonalSignal = dz >= AC_MOVE_FLY_DIAG_DZ_MIN && horiz >= 2 && dz > horiz * AC_MOVE_FLY_DIAG_RATIO && speed >= AC_MOVE_FLY_DIAG_SPEED_MIN;
    const flySustainedSignal = dz > 0 && (dz > AC_MOVE_FLY_STREAK_DZ_MIN || vSpeed > AC_MOVE_FLY_STREAK_SPEED_MIN) && !isFalling;

    const flySignal = flyClassicSignal || flyDiagonalSignal || flySustainedSignal;

    if (flySignal) {
        if (!player._acFlyStreakStartAt) player._acFlyStreakStartAt = now;
        player._acFlyLastSignalAt = now;
    } else if (player._acFlyStreakStartAt) {
        // Сбрасываем непрерывность, только если разрыв сигнала больше допуска
        const gap = now - (player._acFlyLastSignalAt || now);
        if (gap > AC_FLY_GAP_TOLERANCE_MS) {
            // bank → pulse, затем сброс streak (анти-пульс)
            resetFlyContinuity(player);
            maybeScoreFlyPulse(player, { dist, speed, vSpeed, dz, dt });
        }
    } else {
        // Пауза между вспышками — всё равно проверяем долю air в окне
        maybeScoreFlyPulse(player, { dist, speed, vSpeed, dz, dt });
    }

    if (player._acFlyStreakStartAt) {
        const flyDurationMs = now - player._acFlyStreakStartAt;
        const gapNow = now - (player._acFlyLastSignalAt || now);
        if (flyDurationMs >= AC_FLY_MIN_DURATION_MS && gapNow <= AC_FLY_GAP_TOLERANCE_MS) {
            // Непрерывный полёт — очки копятся КАЖДЫЙ тик, пока сигнал
            // держится (а не один раз при первом обнаружении), поэтому
            // реальный флай-хак добивает до кика быстро (~1.5-2 сек
            // сустейн-полёта), в отличие от одиночных ТП-рывков выше.
            const score = addFlyScore(player, AC_FLY_SCORE_PER_TICK);
            maybeReportFlyScore(player, 'vertical-fly', { dist, speed, vSpeed, dz, dt, durationMs: flyDurationMs }, score);
            player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
            return;
        }
    }

    updateGroundedState(player, dz, speed);
    const state = getAcState(player);
    if (state && state.airStartTime && (now - state.airStartTime) > AC_NOCLIP_MAX_AIR_TIME_MS) {
        if ((state.airStreak || 0) >= 4 && Math.abs(dz) < 1.2 && speed >= 0.4 && speed < 6 && horiz >= 0.5) {
            reportMovementAnomaly(player, 'noclip-hover', { dist, speed, vSpeed, dz, dt });
            state.airStartTime = now;
            player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
            return;
        }
        if ((state.airStreak || 0) < 2) {
            state.airStartTime = 0;
        }
    }

    decayFlyViolations(player);

    if (state) {
        const looksNormal = Math.abs(dz) < 3 && speed < 16 && (state.airStreak || 0) < 3;
        if (looksNormal) state.lastGoodPos = { x: pos.x, y: pos.y, z: pos.z };
    }
    if (!playerAlive(player)) return;
    player._acLastMoveSample = { x: pos.x, y: pos.y, z: pos.z, t: now };
    } catch (_tick) {}
}

// ============================================================
//  ИНТЕРВАЛЫ
// ============================================================

setInterval(() => {
    try {
        if (!localAcDetectionsEnabled()) return;
        mp.players.forEach(tickPlayerMovementAc);
        mp.players.forEach((player) => {
            if (!mp.players.exists(player)) return;
            const state = getAcState(player);
            if (!state || state.flyScore <= 0) return;
            // Пока летит (сигнал полёта активен) — очки не тают
            if (player._acFlyStreakStartAt) return;
            const now = Date.now();
            // Анти-пульс: пока в окне ещё много air — тоже не таем
            try {
                if (getPulseAirMs(player, now) >= AC_FLY_PULSE_MIN_AIR_MS * 0.5) return;
            } catch (_e) {}
            const lastAt = state.flyScoreAt || 0;
            if (!lastAt) return;
            const elapsedMs = now - lastAt;
            if (elapsedMs < 1000) return;
            const decay = Math.pow(0.5, elapsedMs / AC_FLY_KICK_SCORE_HALFLIFE_MS);
            state.flyScore = state.flyScore * decay;
            state.flyScoreAt = now;
            if (state.flyScore < 1) { state.flyScore = 0; state.flyScoreAt = 0; }
        });
    } catch (e) {}
}, AC_MOVE_TICK_MS);

setInterval(() => {
    try {
        if (!localAcDetectionsEnabled()) return;
        mp.players.forEach(player => {
            if (!playerAlive(player)) return;
            if (!player.getVariable('auth')) return;
            if (getPlayerAdminLevel(player) >= 1 && global.metaAcDetectAdmins !== true) return;

            const weapons = getPlayerAllWeapons(player);
            for (const weapon of weapons) {
                if (weapon == null || weapon === 0) continue;
if (isBlacklistedWeapon(weapon)) {
            const wName = getBlacklistedWeaponName(weapon) || weapon;
            stripIllegalWeapons(player);
            notifyAcWatchers(`!{red}[AC-BLACKLIST] !{yellow}[#${player.static}] ${player.login} !{white}обнаружен с запрещённым оружием: ${wName}`);

            kickPlayer(player, `Запрещённое оружие: ${wName}`, 1, true);
        }
            }
        });
    } catch (e) {}
}, AC_WEAPON_CHECK_INTERVAL_MS);

// ============================================================
//  СОБЫТИЯ
// ============================================================

mp.events.add('playerQuit', (player) => {
    try {
        if (player && player.static != null) {
            if (playerClicks[player.static]) delete playerClicks[player.static];
            clearAcState(player.static);
        }
    } catch (_e) {}
});

mp.events.add('playerExitVehicle', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        player._acJustExitedVehicleUntil = Date.now() + 6000;
    } catch (_) {}
});

// ⚠️ Событие телепорта — КЛЮЧЕВОЕ исключение для админ-ТП игроков.
// Грейс увеличен с 5000 до 7000мс (было указано в шапке файла, пункт 3),
// чтобы ускоренный фаст-кик по флаю не зацепил игрока сразу после
// того, как его телепортировал админ.
mp.events.add('playerTeleport', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        player._acJustTeleportedUntil = Date.now() + 7000;
        player._acLastMoveSample = null;
        resetFlyContinuity(player, { bankPulse: false });
        resetFlyPulse(player);
    } catch (_) {}
});

mp.events.add('playerWeaponChange', (player, oldWeapon, newWeapon) => {
    try {
        if (!localAcDetectionsEnabled()) return;
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (getPlayerAdminLevel(player) >= 1 && global.metaAcDetectAdmins !== true) return;

        if (oldWeapon != null && oldWeapon !== 0 && isBlacklistedWeapon(oldWeapon)) {
            const wName = getBlacklistedWeaponName(oldWeapon) || oldWeapon;
            stripIllegalWeapons(player);
            notifyAcWatchers(`!{red}[AC-BLACKLIST] !{yellow}[#${player.static}] ${player.login} !{white}имел ЗАПРЕЩЁННОЕ оружие (старое): ${wName}`);
            kickPlayer(player, `Запрещённое оружие: ${wName}`, 1, true);
            return;
        }

        if (newWeapon === 0 || newWeapon === undefined) return;

        if (isBlacklistedWeapon(newWeapon)) {
            const wName = getBlacklistedWeaponName(newWeapon) || newWeapon;
            stripIllegalWeapons(player);
            notifyAcWatchers(`!{red}[AC-BLACKLIST] !{yellow}[#${player.static}] ${player.login} !{white}попытка взять ЗАПРЕЩЁННОЕ оружие: ${wName}`);
            kickPlayer(player, `Запрещённое оружие: ${wName}`, 1, true);
        }
    } catch (e) {}
});

// ⚠️ Спавн — грейс увеличен с 5000 до 6000мс (см. пункт 3 шапки файла).
mp.events.add('playerSpawn', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        const state = getAcState(player);
        const now = Date.now();
        if (state) {
            state.recentKills = 0;
            state.flyViolations = 0;
            state.flySuspectUntil = 0;
            state.airStreak = 0;
            state.consecutiveAirTicks = 0;
            state.airStartTime = 0;
            state.moveViolations = [];
            // Снап-грейс теперь фиксированный (30 сек от playerAuth, без
            // продления) — на playerSpawn его больше не трогаем, см.
            // playerAuth ниже и константу AC_SNAP_GRACE_MS.
        }
        resetFlyContinuity(player, { bankPulse: false });
        resetFlyPulse(player);
        player._acJustSpawnedUntil = now + 6000;
        try { player.removeAllWeapons(); } catch(_) {}
    } catch (e) {}
});

// ⚠️ Авторизация — грейс увеличен с 8000 до 9000мс (см. пункт 3 шапки файла).
mp.events.add('playerAuth', (player) => {
    try {
        if (!mp.players.exists(player)) return;
        const state = getAcState(player);
        const now = Date.now();
        if (state) {
            state.flyViolations = 0;
            state.airStreak = 0;
            state.consecutiveAirTicks = 0;
            state.airStartTime = 0;
            state.moveViolations = [];
            state.weaponViolations = [];
            state.flyScore = 0;
            state.flyScoreAt = 0;
            state.flyScoreLastDiscordAt = 0;

            // Фиксированное окно защиты от снапов — ровно 30 сек от входа
            // на сервер, БЕЗ продления (см. AC_SNAP_GRACE_MS выше). Весь
            // цикл логина/создания персонажа должен уложиться в это окно.
            state.snapGraceUntil = now + AC_SNAP_GRACE_MS;
        }
        resetFlyContinuity(player, { bankPulse: false });
        resetFlyPulse(player);
        player._acJustSpawnedUntil = now + 9000;
    } catch (e) {}
});

mp.events.add('playerDeath', (player, reason, killer) => {
    try {
        if (!killer || !mp.players.exists(killer) || !killer.getVariable('auth')) return;
        if (getPlayerAdminLevel(killer) >= 1 && global.metaAcDetectAdmins !== true) return;

        const kState = getAcState(killer);
        if (kState) {
            const now = Date.now();
            if (now - kState.lastKillAt < 60000) kState.recentKills = (kState.recentKills || 0) + 1;
            else kState.recentKills = 1;
            kState.lastKillAt = now;
        }

        if (isFlyingSuspect(killer)) {
            const login = killer.login || '?';
            const sid = killer.static != null ? killer.static : '?';
            const victimLogin = (player && player.login) || '?';
            const vSid = (player && player.static != null) ? player.static : '?';

            notifyAcWatchers(`!{yellow}[AC-KILL-FLY] !{red}[#${sid}] ${login} !{white}убил в полёте !{red}[#${vSid}] ${victimLogin}`);

            sendDiscordEmbedToChannel(buildAcEmbed('kill', '💀 УБИЙСТВО В ПОЛЁТЕ', killer, [
                { name: '💀 Жертва',         value: `\`${victimLogin}\` (#${vSid})`, inline: true },
                { name: '📊 Убийств за 60с', value: `\`${kState ? kState.recentKills : '?'}\``, inline: true },
                { name: '🪂 В полёте?',      value: '✅', inline: true },
            ]));
        }
    } catch (e) {}
});

// ============================================================
//  WALLBANG — УДАЛЁН ПО ЗАПРОСУ
// ============================================================

// --- Стрельба в воздухе: хит по игроку, пока shooter в fly/air ---
mp.events.add('hitmarker:notify', (victim, shooterRemoteId, damage) => {
    try {
        const shooterId = parseInt(shooterRemoteId, 10);
        if (!Number.isFinite(shooterId) || shooterId < 0) return;
        const shooter = mp.players.at(shooterId);
        if (!shooter || !mp.players.exists(shooter)) return;
        let dist = null;
        try {
            if (victim && mp.players.exists(victim) && shooter.dist) {
                dist = shooter.dist(victim.position);
            }
        } catch (_e) {}
        noteAirShoot(shooter, { dist, damage });
    } catch (_e) {}
});

mp.events.add('playerDamage', (player, healthLoss, armorLoss, attacker) => {
    try {
        if (!attacker || !mp.players.exists(attacker)) return;
        const hl = Number(healthLoss) || 0;
        const al = Number(armorLoss) || 0;
        if (hl <= 0 && al <= 0) return;
        let dist = null;
        try {
            if (player && mp.players.exists(player) && attacker.dist) {
                dist = attacker.dist(player.position);
            }
        } catch (_e) {}
        noteAirShoot(attacker, { dist });
    } catch (_e) {}
});

// ============================================================
//  ГЛОБАЛЬНЫЕ ЭКСПОРТЫ
// ============================================================

global.acGiveWeapon     = acGiveWeapon;
global.acClearWeapons   = acClearWeapons;
global.isWeaponAllowed  = isWeaponAllowed;
global.sendAcDiscordEmbed = sendDiscordEmbedToChannel;
global.handleVanishAutoDetection = handleVanishAutoDetection;

setTimeout(function () {
    const token = getDiscordToken();
    const ch = getAcChannelId();
    if (!token || !ch) {
        console.log('[anticheat] Discord AC отключён: задайте DISCORD_BOT_TOKEN и DISCORD_AC_CHANNEL_ID в discord_env.json');
        return;
    }
    console.log('[anticheat] Discord AC логи → канал ' + ch);
    discordApi.probeChannel(ch)
        .then(function (info) {
            const name = info && info.name ? info.name : '?';
            console.log('[anticheat] Канал ac-flags OK: #' + name + ' (' + ch + ')');
        })
        .catch(function (err) {
            console.log('[anticheat] Канал ac-flags НЕДОСТУПЕН: ' + (err.message || err));
            console.log('[anticheat] Проверь: бот на сервере Discord + права на канал ac-flags + верный ID канала.');
        });
}, 1500);
