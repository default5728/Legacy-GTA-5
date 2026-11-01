/** Каждое brawl:канал: → маркер [[BRWLJ]]…[[/BRWLJ]] (в CEF — только 👪, клик). Остальной текст сообщения сохраняется. */
global.brawlChatEmbedForBroadcast = function brawlChatEmbedForBroadcast(text) {
	const raw = String(text || '');
	return raw.replace(/brawl:([^:]+):/gi, (full, g1) => {
		const ch = String(g1 || '').trim();
		if (!ch) return full;
		return `[[BRWLJ]]${encodeURIComponent(ch)}[[/BRWLJ]]`;
	});
}

const CHAT_MESSAGE_COOLDOWN_MS = 3000;
const AUTO_MUTE_FORBIDDEN_WORDS_SECONDS = 24 * 60 * 60;
const AUTO_MUTE_ADMIN_NAME = 'Система';
const AUTO_MUTE_REASON = 'Автомут: запрещённые слова в чате (24 ч.)';
const playerLastChatMessageAt = new Map();

const BANNED_CHAT_PHRASES = [
	'shade dm',
	'bloody dm',
	'phantom dm',
	'lite dm',
	'mell dm',
	'galaxy dm',
	'shadow dm',
	'lord dm',
	'phoenix dm',
	'blade dm'
];

function getChatCooldownKey(player) {
	if (!player) return '';
	if (player.static != null && player.static !== '') return String(player.static);
	return String(player.id != null ? player.id : '');
}

function normalizeChatForBanCheck(text) {
	return String(text || '')
		.toLowerCase()
		.replace(/[\s_\-\.·,;:!?()[\]{}'"`~|\\/+=@#$%^&*<>]+/g, '');
}

function messageHasBannedPhrase(text) {
	const raw = String(text || '').toLowerCase();
	const compact = normalizeChatForBanCheck(text);
	for (const phrase of BANNED_CHAT_PHRASES) {
		if (raw.includes(phrase)) return true;
		const compactPhrase = normalizeChatForBanCheck(phrase);
		if (compactPhrase && compact.includes(compactPhrase)) return true;
	}
	return false;
}

function isChatCooldownExempt(player) {
	return getPlayerAdminLevelForChat(player) >= 1;
}

function checkChatMessageCooldown(player) {
	if (isChatCooldownExempt(player)) return true;
	const key = getChatCooldownKey(player);
	if (!key) return true;
	const now = Date.now();
	const last = playerLastChatMessageAt.get(key) || 0;
	if (now - last < CHAT_MESSAGE_COOLDOWN_MS) {
		const secondsLeft = Math.ceil((CHAT_MESSAGE_COOLDOWN_MS - (now - last)) / 1000);
		isNotify(player, 2, 'top-mid', `Подождите ${secondsLeft} сек. перед следующим сообщением.`, 2500);
		return false;
	}
	playerLastChatMessageAt.set(key, now);
	return true;
}

function getPlayerAdminLevelForChat(player) {
	if (!player) return 0;
	const a = Number(player.adminlvl);
	if (!Number.isNaN(a) && a > 0) return a;
	try {
		const v = Number(player.getVariable('adminlvl'));
		return Number.isNaN(v) ? 0 : v;
	} catch (_e) {
		return 0;
	}
}

function startOnlineMuteCountdown(player, staticId, initialSeconds) {
	let remainingTime = Math.max(1, Number(initialSeconds) || 0);
	const interval = setInterval(() => {
		if (!mp.players.exists(player)) {
			clearInterval(interval);
			return;
		}
		if (player.getVariable('mute') === false) {
			clearInterval(interval);
			return;
		}
		remainingTime -= 1;
		global.DB.query('UPDATE mute SET seconds = ? WHERE static = ?', [remainingTime, staticId], () => {});
		if (remainingTime <= 0) {
			clearInterval(interval);
			global.DB.query('DELETE FROM mute WHERE static = ?', [staticId], () => {
				if (!mp.players.exists(player)) return;
				player.setVariable('mute', false);
				player.outputChatBox('!{#00FF00}Время мута истекло.');
			});
		}
	}, 1000);
}

function applyAutoMuteForBannedWords(player, originalMessage) {
	if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
	if (player.static == null || player.static === '') return;

	if (getPlayerAdminLevelForChat(player) >= 1) {
		isNotify(player, 2, 'top-mid', 'Сообщение содержит запрещённые слова.', 3000);
		return;
	}

	const staticId = player.static;
	const login = player.login || '?';

	global.DB.query('SELECT seconds FROM mute WHERE static = ?', [staticId], (err, results) => {
		if (err) return console.log(err);
		if (results && results.length > 0) {
			isNotify(player, 2, 'top-mid', 'Сообщение содержит запрещённые слова.', 3000);
			return;
		}

		const seconds = AUTO_MUTE_FORBIDDEN_WORDS_SECONDS;
		global.DB.query(
			'INSERT INTO mute (static, seconds, admin, login, reason) VALUES (?, ?, ?, ?, ?)',
			[staticId, seconds, AUTO_MUTE_ADMIN_NAME, login, AUTO_MUTE_REASON],
			(insErr) => {
				if (insErr) return console.log(insErr);
				if (!mp.players.exists(player)) return;

				player.setVariable('mute', true);
				try { player.call('stopVoice'); } catch (_eVoice) {}

				isNotify(player, 2, 'top-mid', 'Вы получили мут на 24 часа за запрещённые слова в чате.', 5000);
				player.outputChatBox(`!{red}Автомут на 24 часа. Причина: ${AUTO_MUTE_REASON}`);
				try {
					mp.players.broadcast(`!{#ff0000}[Система] !{#fff}Игрок [#${staticId}] ${login} получил автомут на 24 часа за запрещённые слова в чате.`);
				} catch (_eBc) {}

				if (typeof global.sendDiscordLog === 'function') {
					global.sendDiscordLog(
						`Автомут за запрещённые слова (24 ч.)!\n\nИгрок - ${login} (#${staticId})\nСообщение - ${String(originalMessage || '').slice(0, 200)}`,
						'1266445805355532368'
					);
				}

				startOnlineMuteCountdown(player, staticId, seconds);
			}
		);
	});
}

const CHAT_MAX_USER_LEN = 200;
const CHAT_DANGEROUS_MARKUP_RE = /<\s*\/?\s*(audio|video|img|picture|iframe|embed|object|source|track|svg|script|link|meta|base|form|input|button|marquee|bgsound|style|font|div|body|html|canvas|portal|template|slot|dialog|applet|frame|frameset)\b/i;
const CHAT_ENCODED_TAG_HINT_RE = /(?:&lt;|&gt;|&#0*60;|&#0*62;|&#x0*3c;|&#x0*3e;|%3c|%3e|\\u003c|\\u003e|\\x3c|\\x3e)/i;

function normalizeChatSuspiciousChars(text) {
	return String(text || '')
		.replace(/[\uFF1C\u2039\u00AB]/g, '<')
		.replace(/[\uFF1E\u203A\u00BB]/g, '>')
		.replace(/\\u003c/gi, '<')
		.replace(/\\u003e/gi, '>')
		.replace(/\\x3c/gi, '<')
		.replace(/\\x3e/gi, '>');
}

function decodeHtmlEntitiesForChat(text) {
	let t = normalizeChatSuspiciousChars(text);
	for (let i = 0; i < 4; i++) {
		const prev = t;
		t = t
			.replace(/&lt;/gi, '<')
			.replace(/&gt;/gi, '>')
			.replace(/&quot;/gi, '"')
			.replace(/&#0*60;/gi, '<')
			.replace(/&#x0*3c;/gi, '<')
			.replace(/&#0*62;/gi, '>')
			.replace(/&#x0*3e;/gi, '>')
			.replace(/&amp;/gi, '&');
		if (t === prev) break;
	}
	return t;
}

function chatTextHasDangerousMarkup(text) {
	const raw = String(text || '');
	const decoded = decodeHtmlEntitiesForChat(raw);
	return (
		CHAT_DANGEROUS_MARKUP_RE.test(decoded) ||
		/<[^>]+>/i.test(decoded) ||
		/<\s*\/?\s*[a-z][^>]*/i.test(decoded) ||
		/javascript:/i.test(decoded) ||
		/on\w+\s*=/i.test(decoded) ||
		/data:\s*(?:text\/html|audio|video|image)/i.test(decoded) ||
		CHAT_ENCODED_TAG_HINT_RE.test(raw) ||
		/url\s*\(/i.test(decoded) ||
		/expression\s*\(/i.test(decoded)
	);
}

function stripChatDangerousMarkup(text) {
	let s = decodeHtmlEntitiesForChat(text);
	s = s
		.replace(/<[^>]*>/gi, '')
		.replace(/<\s*\/?\s*[a-z][^>]*/gi, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+\s*=/gi, '')
		.replace(/data:\s*(?:text\/html|audio|video|image)[^;\s"']*/gi, '')
		.replace(/url\s*\([^)]*\)/gi, '')
		.replace(/expression\s*\([^)]*\)/gi, '')
		.replace(/&lt;/gi, '')
		.replace(/&gt;/gi, '')
		.replace(/&#0*60;/gi, '')
		.replace(/&#x0*3c;/gi, '')
		.replace(/&#0*62;/gi, '')
		.replace(/&#x0*3e;/gi, '')
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
	return s;
}

global.stripChatDangerousMarkup = stripChatDangerousMarkup;

function logChatMarkupAttempt(player, raw) {
	try {
		if (!player || !mp.players.exists(player)) return;
		const login = player.login || '?';
		const staticId = player.static != null ? player.static : '?';
		const sample = String(raw || '').replace(/\s+/g, ' ').slice(0, 160);
		console.log('[chat-xss-blocked]', login, staticId, sample);
		if (typeof global.sendDiscordLog === 'function') {
			global.sendDiscordLog(
				`Чат XSS/HTML!\n\nИгрок: ${login} (#${staticId})\nТекст: ${sample}`,
				'1266445805355532368'
			);
		}
	} catch (_e) {}
}

/** Убирает HTML/скрипты/медиа из пользовательского текста (XSS, screamer, звуки через <audio>). */
global.sanitizeChatUserText = function sanitizeChatUserText(text, player) {
	const raw = String(text || '');
	if (chatTextHasDangerousMarkup(raw)) {
		logChatMarkupAttempt(player, raw);
	}
	const s = stripChatDangerousMarkup(raw);
	return s.trim().slice(0, CHAT_MAX_USER_LEN);
};

/** Финальный фильтр перед отправкой строки в CEF (репорты, broadcast и т.д.). */
global.sanitizeChatOutgoingLine = function sanitizeChatOutgoingLine(text) {
	return stripChatDangerousMarkup(text).trim();
};

function sanitizeChatUserMessage(text, player) {
	return global.sanitizeChatUserText(text, player);
}

function guardPlayerChatMessage(player, text) {
	const msg = sanitizeChatUserMessage(text, player).trim();
	if (!msg) return false;
	if (messageHasBannedPhrase(msg)) {
		applyAutoMuteForBannedWords(player, msg);
		return false;
	}
	if (!checkChatMessageCooldown(player)) return false;
	return msg;
}

mp.events.add('playerQuit', (player) => {
	try {
		const key = getChatCooldownKey(player);
		if (key) playerLastChatMessageAt.delete(key);
	} catch (_e) {}
});

global.getRemainingMuteTime = function(staticId) {
	try {
		return new Promise((resolve, reject) => {
			global.DB.query('SELECT seconds FROM mute WHERE static = ?', [staticId], (err, results) => {
				if (err) {
					reject(err);
				} else {
					resolve(results.length > 0 ? results[0].seconds : 0);
				}
			});
		});
	} catch (error) {
        console.log(error);
    }
};

function handleGlobalChatFromPlayer(player, text) {
	try {
		if (!mp.players.exists(player)) return;
		if (typeof global.tryAdminSessionPasswordChat === 'function' && global.tryAdminSessionPasswordChat(player, text)) return;
		if (player.getVariable('anticheat') === true) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, "top-mid", `Включен глобальный мут чата.`, 3000);
		let static = player.static;
		let login = player.login;
		let adminlvl = player.adminlvl;
		let redname = player.getVariable('redname')
		let prefix = player.prefix || '';
		if(!player.getVariable('auth')) return;
		const safeText = guardPlayerChatMessage(player, text);
		if (!safeText) return;

		let currentTime = Date.now();
        let lastBuyTime = 0;

		for (let [family, time] of global.familyBuys) {
            if (time > lastBuyTime) {
                lastBuyTime = time;
            }
        }
        let chatCooldown = 15000;
        if (!isChatCooldownExempt(player) && currentTime - lastBuyTime < chatCooldown) {
            let secondsLeft = Math.ceil((chatCooldown - (currentTime - lastBuyTime)) / 1000);
            return player.outputChatBox(`Подождите ${secondsLeft} секунд, последнее объявление отправлено недавно.`);
        }

		global.getRemainingMuteTime(static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, "top-mid", `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				} else {
					const textOut = brawlChatEmbedForBroadcast(safeText);
					const adminChatTag = typeof global.hasAdminSessionPrivileges === 'function' && global.hasAdminSessionPrivileges(player);
					const mediaTag = typeof global.getMediaChatTagRage === 'function' ? global.getMediaChatTagRage(player) : '';

					global.DB.query(
						'INSERT INTO logschat (static, message, ipadr, time) VALUES (?, ?, ?, NOW())', 
						[player.static, safeText, player.ip], 
						(err, result) => {
							if (err) return console.log(err);
						}
					);

					const pushGlobalLine = (buildLine) => {
						broadcastInRangeCitizen(player, player.position, 15, buildLine);
					};

					if(adminChatTag && redname === true) {
						if (player.viplvl >= 1 && player.viplvl <= 3) {
							pushGlobalLine((viewer, speaker) => {
								const disp = typeof global.citizenDisplayLogin === 'function'
									? global.citizenDisplayLogin(viewer, speaker)
								 : login;
								let line = `!{#FFF}[#${static}]${mediaTag} !{#FF211A}[ADMIN] !{purple}[VIP] !{#FFF}${disp} (${player.id}): ${textOut}`;
								if (prefix) line = line.replace('[VIP]', `[VIP] !{#FFA500}[${prefix}]`);
								return line;
							});
							global.sendDiscordLog(`[#${static}] [ADMIN] [VIP] ${login} (${player.id}): ${safeText}`, '1259089622424617071')
							return;
						}
						global.sendDiscordLog(`[ADMIN] [#${static}] ${login} (${player.id}): ${safeText}`, '1259089622424617071')
						pushGlobalLine((viewer, speaker) => {
							const disp = typeof global.citizenDisplayLogin === 'function'
								? global.citizenDisplayLogin(viewer, speaker)
								: login;
							let line = `!{#FFF}[#${static}]${mediaTag} !{#FF211A}[ADMIN] !{#FFF}${disp} (${player.id}): ${textOut}`;
							if (prefix) line = line.replace('[ADMIN]', `[ADMIN] !{#FFA500}[${prefix}]`);
							return line;
						});
						return;
					}
					if (player.viplvl >= 1 && player.viplvl <= 3) {
						pushGlobalLine((viewer, speaker) => {
							const disp = typeof global.citizenDisplayLogin === 'function'
								? global.citizenDisplayLogin(viewer, speaker)
								: login;
							let line = `!{#FFF}[#${static}]${mediaTag} !{purple}[VIP] !{#FFF}${disp} (${player.id}): ${textOut}`;
							if (prefix) line = line.replace('[VIP]', `[VIP] !{#FFA500}[${prefix}]`);
							return line;
						});
						global.sendDiscordLog(`[#${static}] [VIP] ${login} (${player.id}): ${safeText}`, '1259089622424617071')
						return;
					}
					pushGlobalLine((viewer, speaker) => {
						const disp = typeof global.citizenDisplayLogin === 'function'
							? global.citizenDisplayLogin(viewer, speaker)
							: login;
						let line = `!{#FFF}${disp} (${player.id}): ${textOut}`;
						if (prefix) {
							line = `!{#FFF}[#${static}]${mediaTag} !{#FFA500}[${prefix}] ` + line;
						} else {
							line = `!{#FFF}[#${static}]${mediaTag} ` + line;
						}
						return line;
					});
					const discordLogMessage = prefix
						? `[#${static}] [${prefix}] ${login} (${player.id}): ${safeText}`
						: `[#${static}] ${login} (${player.id}): ${safeText}`;
					global.sendDiscordLog(discordLogMessage, '1259089622424617071');
				}
			})
			.catch((err) => {
				return
			});
	} catch (error) {
		return
	}
}

/** Нативный ввод (если включён) и общий CEF-чат */
mp.events.add("playerChat", handleGlobalChatFromPlayer);
/** Явный вызов с клиента из кастомного чата (callRemote) */
mp.events.add("chat:cefSay", handleGlobalChatFromPlayer);

function pushChatLineToPlayer(player, text) {
	try {
		if (!player || !mp.players.exists(player)) return;
		const safeLine = typeof global.sanitizeChatOutgoingLine === 'function'
			? global.sanitizeChatOutgoingLine(text)
			: String(text || '');
		if (!safeLine) return;
		player.call('chat:pushLine', [safeLine]);
	} catch (_e) {}
}

function isPlayerAuthedForChat(player) {
	try {
		if (!player || !mp.players.exists(player)) return false;
		const v = player.getVariable('auth');
		if (v === true || v === 1 || v === '1' || v === 'true') return true;
		if (player.static != null && player.static !== '') return true;
		return false;
	} catch (_e) {
		return false;
	}
}

/** Ответы команд и системные строки — нативный outputChatBox → markAsChat → CEF. */
global.pushChatBox = function pushChatBox(player, text) {
	try {
		if (!player || !mp.players.exists(player)) return;
		const line = typeof global.sanitizeChatOutgoingLine === 'function'
			? global.sanitizeChatOutgoingLine(text)
			: String(text || '');
		if (!line) return;
		player.outputChatBox(line);
	} catch (_e) {}
};

/** Системное сообщение в CEF-чат: белый текст + красное выделение + белый хвост. */
global.pushSystemChatLine = function pushSystemChatLine(player, whiteText, redHighlight, whiteSuffix) {
	const before = String(whiteText || '');
	const mid = String(redHighlight || '');
	const after = String(whiteSuffix || '');
	pushChatLineToPlayer(player, `!{#ffffff}${before}!{#ef4444}${mid}!{#ffffff}${after}`);
};

/** Глобальный чат в CEF (нативный чат отключён на клиенте). */
function pushChatLineToAllAuth(text) {
	try {
		mp.players.forEach((p) => {
			if (isPlayerAuthedForChat(p)) pushChatLineToPlayer(p, text);
		});
	} catch (_e) {}
}

/** Пуш строки в CEF-чат всем в радиусе (нативный broadcastInRange не виден в CEF). */
function pushChatLineInRange(origin, range, text) {
	try {
		if (!origin || !mp.players.exists(origin)) return;
		const pos = origin.position;
		const dim = origin.dimension;
		const r2 = range * range;
		const safeLine = typeof global.sanitizeChatOutgoingLine === 'function'
			? global.sanitizeChatOutgoingLine(text)
			: String(text || '');
		if (!safeLine) return;
		mp.players.forEach((p) => {
			if (!p || !mp.players.exists(p) || !isPlayerAuthedForChat(p)) return;
			if (p.dimension !== dim) return;
			const pp = p.position;
			const dx = pp.x - pos.x, dy = pp.y - pos.y, dz = pp.z - pos.z;
			if (dx * dx + dy * dy + dz * dz <= r2) {
				pushChatLineToPlayer(p, safeLine);
			}
		});
	} catch (_e) {}
}
global.pushChatLineInRange = pushChatLineInRange;

function citizenChatLogin(viewer, speaker) {
	if (typeof global.citizenDisplayLogin === 'function') {
		return global.citizenDisplayLogin(viewer, speaker);
	}
	return speaker && speaker.login ? speaker.login : 'Гражданин';
}

function broadcastInRangeCitizen(speaker, pos, range, buildLine) {
	mp.players.forEach((viewer) => {
		if (!viewer || !mp.players.exists(viewer)) return;
		try {
			if (!isPlayerAuthedForChat(viewer) || viewer.dimension !== speaker.dimension) return;
			if (viewer.dist(pos) > range) return;
			const line = buildLine(viewer, speaker);
			pushChatLineToPlayer(viewer, line);
		} catch (_e) {}
	});
}

/** Ближний радиус (крик) — без RP-отыгровок. */
function proximityChatCommand(player, message, range, builder) {
	try {
		if (!player.getVariable('auth')) return;
		if (player.getVariable('anticheat') === true) return;
		const msg = guardPlayerChatMessage(player, message);
		if (!msg) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, 'top-mid', `Включен глобальный мут чата.`, 3000);
		global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, 'top-mid', `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				}
				const name = citizenChatLogin(player, player);
				pushChatLineInRange(player, range, builder(name, msg, player));
			})
			.catch(() => {});
	} catch (error) {
		console.log(error);
	}
}

function localRpChat(player, command, text) {
	const msg = String(text || '').trim();
	if (!msg) return player.outputChatBox(`/${command} [текст]`);
	const name = citizenChatLogin(player, player);
	const idTag = `!{#FFF}[#${player.static}] `;
	if (command === 'me') return proximityChatCommand(player, msg, 15, (_n, body) => `${idTag}* ${name} ${body}`);
	if (command === 'do') return proximityChatCommand(player, msg, 15, (_n, body) => `${idTag}${body} (${name})`);
	if (command === 'b') return proximityChatCommand(player, msg, 15, (_n, body) => `!{#9ca3af}(( ${name}: ${body} ))`);
	if (command === 'todo') {
		const parts = msg.split(/\s*\*\s*/);
		if (parts.length < 2 || !parts[0] || !parts[1]) return player.outputChatBox('/todo [действие] * [текст]');
		return proximityChatCommand(player, msg, 15, (_n, body) => {
			const [action, phrase] = body.split(/\s*\*\s*/);
			return `${idTag}${name} ${phrase} * ${action}`;
		});
	}
	if (command === 'try') return proximityChatCommand(player, msg, 15, (_n, body) => `${idTag}${name} ${body} (${Math.random() < 0.5 ? 'Удачно' : 'Неудачно'})`);
}

['me', 'do', 'b', 'todo', 'try'].forEach((command) => {
	mp.events.addCommand(command, (player, _fullText, ...words) => localRpChat(player, command, words.join(' ') || _fullText));
});

mp.events.addCommand('s', (player, fullText) => {
	if (!String(fullText || '').trim()) return player.outputChatBox('/s [текст] — крик');
	proximityChatCommand(player, fullText, 30, (name, msg, p) => `!{#FFF}[#${p.static}] ${name} кричит: !{#e8e8e8}${msg}`);
});

function broadcastFractionChat(player, msg, nrp) {
	const fr = player.getVariable('fraction');
	if (fr == null || fr === '' || Number(fr) === 0) {
		return isNotify(player, 2, 'top-mid', 'Вы не во фракции.', 2500);
	}
	const staticId = player.static;
	const textOut = brawlChatEmbedForBroadcast(msg);
	const login = player.login;
	const fk = String(fr);
	const fn = typeof global.getFracName === 'function' ? global.getFracName(Number(fr)) : null;
	const fl = fn ? `!{#e8e8e8}[${fn}] ` : '';
	const fracColorMap = { 1:'#8b21c9',2:'#16a34a',3:'#dc2626',4:'#ca8a04',5:'#0891b2',6:'#9ca3af' };
	const fracColor = fracColorMap[Number(fr)] || '#dc2626';
	const fpx = player.fraction_prefix ? ` !{${fracColor}}[${player.fraction_prefix}]` : '';
	const tag = nrp ? `[Рация NRP]` : `[Фракция]`;
	const body = nrp
		? `!{#9ca3af}(( !{${fracColor}}${tag} ${fl}!{#FFF}${login}${fpx} (${player.id}): ${textOut} ))`
		: `!{#FFF}[#${staticId}] !{${fracColor}}${tag} ${fl}!{#FFF}${login}${fpx} (${player.id}): ${textOut}`;
	mp.players.forEach((p) => {
		if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
		if (String(p.getVariable('fraction') ?? '') !== fk) return;
		pushChatLineToPlayer(p, body);
	});
}

function broadcastDepartmentChat(player, msg) {
	const fr = Number(player.getVariable('fraction')) || 0;
	if (fr <= 0) return isNotify(player, 2, 'top-mid', 'Вы не во фракции.', 2500);
	const textOut = brawlChatEmbedForBroadcast(msg);
	const login = player.login;
	const line = `!{#FFF}[#${player.static}] !{#0891b2}[Департамент] !{#FFF}${login} (${player.id}): ${textOut}`;
	mp.players.forEach((p) => {
		if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
		if ((Number(p.getVariable('fraction')) || 0) <= 0) return;
		pushChatLineToPlayer(p, line);
	});
}

function broadcastFamilyChat(player, msg, nrp) {
	const fam = player.family || player.getVariable('family');
	if (!fam || String(fam).trim() === '') return isNotify(player, 2, 'top-mid', 'Вы не в организации.', 2500);
	const textOut = brawlChatEmbedForBroadcast(msg);
	const login = player.login;
	const line = nrp
		? `!{#9ca3af}(( !{#dc2626}[Организация] !{#e8e8e8}[${fam}] !{#FFF}${login} (${player.id}): ${textOut} ))`
		: `!{#FFF}[#${player.static}] !{#dc2626}[Организация] !{#e8e8e8}[${fam}] !{#FFF}${login} (${player.id}): ${textOut}`;
	mp.players.forEach((p) => {
		if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
		const pf = p.family || p.getVariable('family');
		if (pf !== fam) return;
		pushChatLineToPlayer(p, line);
	});
}

/** Очистить CEF-чат у всех авторизованных; опционально — системная строка в чат. */
global.clearChatForAllAuth = function clearChatForAllAuth(announceLine) {
	try {
		mp.players.forEach((p) => {
			if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
			p.call('server:clearChat');
		});
		const line = announceLine != null ? String(announceLine).trim() : '';
		if (!line) return;
		setTimeout(() => pushChatLineToAllAuth(line), 150);
	} catch (_e) {}
};

/** Чат из CEF: admin | fraction | family | media (общий — playerChat). */
mp.events.add('chat:sendChannel', (player, mode, text) => {
	try {
		if (!mp.players.exists(player)) return;
		if (player.getVariable('anticheat') === true) return;
		if (!player.getVariable('auth')) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, 'top-mid', `Включен глобальный мут чата.`, 3000);

		const m = String(mode || '').toLowerCase();
		const safeMsg = guardPlayerChatMessage(player, text);
		if (!safeMsg) return;

		if (m !== 'admin' && m !== 'fraction' && m !== 'fraction_nrp' && m !== 'department' && m !== 'family' && m !== 'family_nrp' && m !== 'media') return;

		let currentTime = Date.now();
		let lastBuyTime = 0;
		for (let [family, time] of global.familyBuys) {
			if (time > lastBuyTime) lastBuyTime = time;
		}
		const chatCooldown = 15000;
		if (!isChatCooldownExempt(player) && currentTime - lastBuyTime < chatCooldown) {
			const secondsLeft = Math.ceil((chatCooldown - (currentTime - lastBuyTime)) / 1000);
			return player.outputChatBox(`Подождите ${secondsLeft} секунд, последнее объявление отправлено недавно.`);
		}

		global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, 'top-mid', `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				}
				const static = player.static;
				const login = player.login;
				const textOut = brawlChatEmbedForBroadcast(safeMsg);

				if (m === 'admin') {
					if (typeof global.hasAdminSessionPrivileges === 'function' && !global.hasAdminSessionPrivileges(player)) {
						return isNotify(player, 2, 'top-mid', 'Нет доступа к админ-чату.', 2500);
					}
					if (Number(player.adminlvl) < 1) return isNotify(player, 2, 'top-mid', 'Нет доступа к админ-чату.', 2500);
					const line = `!{#FFF}[#${static}] !{#FF211A}[Админ] !{#FFF}${login} (${player.id}): ${textOut}`;
					mp.players.forEach((p) => {
						if (p && mp.players.exists(p) && p.getVariable('auth') && typeof global.hasAdminSessionPrivileges === 'function' && global.hasAdminSessionPrivileges(p)) {
							pushChatLineToPlayer(p, line);
						}
					});
					return;
				}

			if (m === 'fraction') {
				broadcastFractionChat(player, safeMsg, false);
				return;
			}

			if (m === 'fraction_nrp') {
				broadcastFractionChat(player, safeMsg, true);
				return;
			}

			if (m === 'department') {
				broadcastDepartmentChat(player, safeMsg);
				return;
			}

				if (m === 'family') {
					broadcastFamilyChat(player, safeMsg, false);
					return;
				}

				if (m === 'family_nrp') {
					broadcastFamilyChat(player, safeMsg, true);
					return;
				}

				if (m === 'media') {
					if (typeof global.playerHasMedia !== 'function' || !global.playerHasMedia(player)) {
						return isNotify(player, 2, 'top-mid', 'Нет доступа к медиа-чату.', 2500);
					}
					const line = `!{#FFF}[#${static}] !{#22c55e}[Медиа] !{#FFF}${login} (${player.id}): ${textOut}`;
					mp.players.forEach((p) => {
						if (!p || !mp.players.exists(p) || !p.getVariable('auth')) return;
						if (typeof global.playerHasMedia !== 'function' || !global.playerHasMedia(p)) return;
						pushChatLineToPlayer(p, line);
					});
				}
			})
			.catch(() => {});
	} catch (_e) {}
});

function fractionChatCommand(player, fullText, nrp) {
	try {
		if (!player.getVariable('auth')) return;
		const msg = String(fullText || '').trim();
		if (!msg) return player.outputChatBox(nrp ? '/fb [сообщение]' : '/f [сообщение]');
		if (player.getVariable('anticheat') === true) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, 'top-mid', `Включен глобальный мут чата.`, 3000);
		global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, 'top-mid', `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				}
				const safeMsg = guardPlayerChatMessage(player, msg);
				if (!safeMsg) return;
				broadcastFractionChat(player, safeMsg, nrp);
			})
			.catch(() => {});
	} catch (_e) {}
}

['f', 'r'].forEach((cmd) => {
	mp.events.addCommand(cmd, (player, fullText) => fractionChatCommand(player, fullText, false));
});
['fb', 'rb'].forEach((cmd) => {
	mp.events.addCommand(cmd, (player, fullText) => fractionChatCommand(player, fullText, true));
});

mp.events.addCommand('d', (player, fullText) => {
	try {
		if (!player.getVariable('auth')) return;
		const msg = String(fullText || '').trim();
		if (!msg) return player.outputChatBox('/d [сообщение]');
		if (player.getVariable('anticheat') === true) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, 'top-mid', `Включен глобальный мут чата.`, 3000);
		global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, 'top-mid', `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				}
				const safeMsg = guardPlayerChatMessage(player, msg);
				if (!safeMsg) return;
				broadcastDepartmentChat(player, safeMsg);
			})
			.catch(() => {});
	} catch (_e) {}
});

function fractionChatCommand(player, fullText, nrp) {
	try {
		if (!player.getVariable('auth')) return;
		const msg = String(fullText || '').trim();
		if (!msg) return player.outputChatBox(nrp ? '/fb [сообщение]' : '/f [сообщение]');
		if (player.getVariable('anticheat') === true) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, 'top-mid', `Включен глобальный мут чата.`, 3000);
		global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, 'top-mid', `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				}
				const safeMsg = guardPlayerChatMessage(player, msg);
				if (!safeMsg) return;
				broadcastFractionChat(player, safeMsg, nrp);
			})
			.catch(() => {});
	} catch (_e) {}
}

['f', 'r'].forEach((cmd) => {
	mp.events.addCommand(cmd, (player, fullText) => fractionChatCommand(player, fullText, false));
});
['fb', 'rb'].forEach((cmd) => {
	mp.events.addCommand(cmd, (player, fullText) => fractionChatCommand(player, fullText, true));
});

mp.events.addCommand('d', (player, fullText) => {
	try {
		if (!player.getVariable('auth')) return;
		const msg = String(fullText || '').trim();
		if (!msg) return player.outputChatBox('/d [сообщение]');
		if (player.getVariable('anticheat') === true) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, 'top-mid', `Включен глобальный мут чата.`, 3000);
		global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, 'top-mid', `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				}
				const safeMsg = guardPlayerChatMessage(player, msg);
				if (!safeMsg) return;
				broadcastDepartmentChat(player, safeMsg);
			})
			.catch(() => {});
	} catch (_e) {}
});

mp.events.addCommand('g', (player, fullText, ...args) => {
	try {
		if (!player.getVariable('auth')) return;
		if (player.getVariable('anticheat') === true) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, 'top-mid', `Включен глобальный мут чата.`, 3000);
		const msg = args.join(' ').trim();
		if (!msg) return player.outputChatBox('/g [сообщение] — чат канала Brawl');
		const safeMsg = guardPlayerChatMessage(player, msg);
		if (!safeMsg) return;
		global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, 'top-mid', `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				}
				if (typeof global.brawlSendGroupChat === 'function' && global.brawlSendGroupChat(player, safeMsg)) return;
				player.outputChatBox('!{#888888}Вы не в голосовом канале Brawl. Создайте или вступите в канал в телефоне.');
			})
			.catch(() => {});
	} catch (error) {
		console.log(error);
	}
});

function hideChat(player) { 
	player.call('hideChatServer')
}

function showChat(player) {
	player.call('showChatServer')
}

global.showPlayerCefChat = showChat;

global.pushLoginWelcomeChat = function pushLoginWelcomeChat(player) {
	try {
		if (!isPlayerAuthedForChat(player)) return;
		if (player.getVariable('charCreating') === true) return;
		if (player._loginWelcomeChatDone === true) return;
		player._loginWelcomeChatPending = true;
		tryDeliverLoginWelcomeChat(player);
	} catch (_e) {}
};

function buildLoginWelcomeLines() {
	return [
		'!{FFA500}Добро пожаловать на FLOW DM',
		'!{FFA500}Донат через сайт:',
		'!{FFA500}Discord проекта: discord.gg/flowdm',
		'!{FFA500}Возникли вопросы/увидел нарушение? Сообщи администрации командой /report'
	];
}

global.tryDeliverLoginWelcomeChat = function tryDeliverLoginWelcomeChat(player) {
	try {
		if (!isPlayerAuthedForChat(player)) return;
		if (player.getVariable('charCreating') === true) return;
		if (player._loginWelcomeChatDone === true) return;
		if (player._loginWelcomeChatPending !== true) return;
		if (player._spawnSelectActive === true) return;

		player._loginWelcomeChatDone = true;
		player._loginWelcomeChatPending = false;

		const welcome = buildLoginWelcomeLines();
		welcome.forEach((line) => player.outputChatBox(line));
	} catch (_e) {}
};

mp.events.add('chat:requestWelcome:s', (player) => {
	try {
		if (!mp.players.exists(player) || !player.getVariable('auth')) return;
		if (player._loginWelcomeChatDone === true) return;
		player._loginWelcomeChatPending = true;
		global.tryDeliverLoginWelcomeChat(player);
	} catch (_e) {}
});

mp.events.add('showChatCleint', (player) => {
	try {
		if (!mp.players.exists(player)) return;
		showChat(player)
	} catch (error) {
        console.log(error);
    }
})

mp.events.add('hideChatClient', (player) => {
	try {
		if (!mp.players.exists(player)) return;
		hideChat(player)
	} catch (error) {
        console.log(error);
    }
})

mp.events.addCommand("c", (player) => {
	try {
		if(!player.getVariable('auth')) return;
		player.call('server:clearChat');
		setTimeout(() => {
			if (player && mp.players.exists(player)) {
				const welcome = buildLoginWelcomeLines();
				welcome.forEach((line) => player.outputChatBox(line));
			}
		}, 250);
	} catch (error) {
        console.log(error);
    }
});

mp.events.addCommand("w", (player, fullText, ...message) => {
	try {
		if(!player.getVariable('auth')) return;
		if (global.chatstatus == false && player.adminlvl == 0) return isNotify(player, 2, "top-mid", `Включен глобальный мут чата.`, 3000);
		if (!message.length) return player.outputChatBox('/w [message]');
		if (player.getVariable('anticheat') === true) return;
		global.getRemainingMuteTime(player.static)
			.then((remainingMuteTime) => {
				if (remainingMuteTime > 0) {
					isNotify(player, 2, "top-mid", `У вас мут! До окончания ${remainingMuteTime} секунд.`, 3000);
					return;
				} else {
					let adminlvl = player.adminlvl;
					let redname = player.getVariable('redname')
					let pos = player.position;
					const msgText = message.join(' ');
					if(adminlvl >= 1 && redname === true) {
						if (player.viplvl >= 1 && player.viplvl <= 3) {
							broadcastInRangeCitizen(player, pos, 1, (viewer, speaker) =>
								`[#${speaker.static}] !{#FF211A}[ADMIN] !{purple}[VIP] !{white}${citizenChatLogin(viewer, speaker)} (${speaker.id}) шепчет: ${msgText}`);
							global.sendDiscordLog(`[#${player.static}] [ADMIN] [VIP] ${player.login} (${player.id}) шепчет: ${msgText}`, '1259089622424617071')
							return;
						}
						broadcastInRangeCitizen(player, pos, 1, (viewer, speaker) =>
							`[#${speaker.static}] !{#FF211A}[ADMIN] !{white}${citizenChatLogin(viewer, speaker)} (${speaker.id}) шепчет: ${msgText}`);
						global.sendDiscordLog(`[#${player.static}] [ADMIN] ${player.login} (${player.id}) шепчет: ${msgText}`, '1259089622424617071')
					} else {
						if (player.viplvl >= 1 && player.viplvl <= 3) {
							broadcastInRangeCitizen(player, pos, 1, (viewer, speaker) =>
								`[#${speaker.static}] !{purple}[VIP] !{white}${citizenChatLogin(viewer, speaker)} (${speaker.id}) шепчет: ${msgText}`);
							global.sendDiscordLog(`[#${player.static}] [VIP] ${player.login} (${player.id}) шепчет: ${msgText}`, '1259089622424617071')
							return;
						}
						broadcastInRangeCitizen(player, pos, 1, (viewer, speaker) =>
							`[#${speaker.static}] ${citizenChatLogin(viewer, speaker)} (${speaker.id}) шепчет: ${msgText}`);
						global.sendDiscordLog(`[#${player.static}] ${player.login} (${player.id}) шепчет: ${msgText}`, '1259089622424617071')
					}
				}
			})
			.catch((err) => {
				return
			});
	} catch (error) {
        console.log(error);
    }
});
