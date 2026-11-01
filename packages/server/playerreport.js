const reportHistory=require('./legacy/report-history');
function canManageReports(p,permission){return require('./legacy/access').hasPermission(p,permission)&&(!global.adminSessionIsGated(p)||p._adminSession===true);}
/**
 * Репорты игроков: чат с администрацией, синхронизация с UI и /report.
 * global.reportThreads[staticId] = { login, messages: [{ role, text, author, ts }] }
 */

global.reportThreads = global.reportThreads || {};

const REPORT_CREATE_CD_MS = 5 * 60 * 1000;
const REPORT_MSG_CD_MS = 60 * 1000;
const REPORT_MIN_TEXT_LENGTH = 6;

global.REPORT_MIN_TEXT_LENGTH = REPORT_MIN_TEXT_LENGTH;

function reportCdText(msLeft) {
    const sec = Math.max(1, Math.ceil(msLeft / 1000));
    if (sec >= 60) {
        const min = Math.ceil(sec / 60);
        return min + ' мин.';
    }
    return sec + ' сек.';
}

function reportCheckCreateCd(player) {
    const until = player.reportCreateCdUntil || 0;
    const left = until - Date.now();
    if (left <= 0) return true;
    if (typeof isNotify === 'function') {
        isNotify(player, 2, 'top-mid', 'Новый репорт можно через ' + reportCdText(left) + '.', 3500);
    }
    return false;
}

function reportLastMessageIsAdmin(player) {
    const st = player.static;
    const th = global.reportThreads[st];
    if (!th || !Array.isArray(th.messages) || !th.messages.length) return false;
    const last = th.messages[th.messages.length - 1];
    return !!(last && last.role === 'admin');
}

function reportCheckMsgCd(player) {
    /* Админ уже ответил — игрок может сразу писать в тикет, КД только между своими сообщениями. */
    if (reportLastMessageIsAdmin(player)) return true;

    let left = 0;
    const until = player.reportMsgCdUntil || 0;
    if (until > Date.now()) left = until - Date.now();

    const st = player.static;
    const th = global.reportThreads[st];
    if (th && Array.isArray(th.messages)) {
        for (let i = th.messages.length - 1; i >= 0; i--) {
            const m = th.messages[i];
            if (m && m.role === 'user' && m.ts) {
                const msgLeft = (Number(m.ts) + REPORT_MSG_CD_MS) - Date.now();
                if (msgLeft > left) left = msgLeft;
                break;
            }
        }
    }

    if (left <= 0) return true;
    if (typeof isNotify === 'function') {
        isNotify(player, 2, 'top-mid', 'Следующее сообщение в репорте через ' + reportCdText(left) + '.', 3500);
    }
    return false;
}

function stampReportMsgCd(player) {
    player.reportMsgCdUntil = Date.now() + REPORT_MSG_CD_MS;
}

/** Игрок может пользоваться репортом; админы 1–7 — нет, с 8 уровня — да. */
function isReportBlockedForAdmin(player) { return false; }

function reportThreadPayload(staticId) {
    const th = global.reportThreads[staticId];
    if (!th || !th.messages || !th.messages.length) {
        return JSON.stringify({ open: false, messages: [] });
    }
    return JSON.stringify({
        open: true,
        static: staticId,
        login: th.login,
        messages: th.messages
    });
}

function syncReportUi(player) {
    if(global.reportThreads[player.static])reportHistory.persist(player.static,global.reportThreads[player.static]);
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    try {
        player.call('report:ui:sync', [reportThreadPayload(player.static)]);
    } catch (e) {}
}

global.syncReportUi = syncReportUi;

function reportUserMessageMeta(player) {
    return {
        role: 'user',
        text: '',
        author: player.login,
        ts: Date.now(),
        isMedia: typeof global.playerHasMedia === 'function' && global.playerHasMedia(player)
    };
}

global.buildAdminReportPayload = function buildAdminReportPayload(playerStatic, login, text, isMedia) {
    const th = global.reportThreads[playerStatic];
    const msgs = th && Array.isArray(th.messages) && th.messages.length
        ? th.messages
        : [{ role: 'user', text: String(text || ''), author: login || ('#' + playerStatic), ts: Date.now() }];
    return JSON.stringify({
        static: playerStatic,
        login: login || ('#' + playerStatic),
        text: String(text || ''),
        isMedia: !!isMedia,
        messages: msgs
    });
}

function notifyAdminsReportMessage(playerStatic, msgObj) {
    const payload = JSON.stringify(msgObj);
    mp.players.forEach((p) => {
        if (!canManageReports(p,'reports.read')) return;
        try { p.call('adminPanel:appendReportMsg', [playerStatic, payload]); } catch (_e) {}
    });
}

function notifyAdminsNewReport(playerStatic, login, text, isMedia) {
    reportHistory.persist(playerStatic,global.reportThreads[playerStatic]);
    const mediaTag = isMedia ? ' !{#22c55e}[MEDIA]' : '';
    const payload = buildAdminReportPayload(playerStatic, login, text, isMedia);
    mp.players.forEach((p) => {
        if (!canManageReports(p,'reports.read')) return;
        try { p.call('adminPanel:addReportPayload', [payload]); } catch (_e) {}

    });
}

function notifyAdminsReportRemoved(playerStatic) {
    mp.players.forEach((p) => {
        if (!canManageReports(p,'reports.read')) return;
        p.call('adminPanel:removeReport', [playerStatic]);
    });
}

/** Создание репорта (из UI или /report) */
global.playerReportCreate = function (player, text) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    if (isReportBlockedForAdmin(player)) {
        return isNotify(player, 2, 'top-mid', 'Репорты с админ-аккаунта доступны с 8 уровня.', 4000);
    }
    let t = String(text || '').trim();
    if (typeof global.sanitizeChatUserText === 'function') {
        t = global.sanitizeChatUserText(t, player);
    }
    if (!t) return;
    if (t.length < REPORT_MIN_TEXT_LENGTH) {
        return isNotify(player, 2, 'top-mid', `Слишком короткое сообщение. Минимум ${REPORT_MIN_TEXT_LENGTH} символов.`, 4000);
    }
    if (t.length > 600) return isNotify(player, 2, 'top-mid', 'Сообщение слишком длинное.', 3000);
    if (player.getVariable('report') != null) {
        return isNotify(player, 2, 'top-mid', 'У вас уже есть открытый репорт.', 3000);
    }
    if (!reportCheckCreateCd(player)) return;
    const st = player.static;
    const userMeta = reportUserMessageMeta(player);
    userMeta.text = t;
    global.reportThreads[st] = {
        login: player.login,
        messages: [userMeta]
    };
    const preview = t.length > 200 ? t.slice(0, 200) + '…' : t;
    player.setVariable('report', preview);
    player.reportCreateCdUntil = Date.now() + REPORT_CREATE_CD_MS;
    global.sendDiscordLog(
        `Отправка репорта!\n\nИгрок - ${player.login} [#${st}]\nРепорт - ${t}`,
        '1266460550217338962'
    );
    notifyAdminsNewReport(st, player.login, preview, userMeta.isMedia);
    syncReportUi(player);
    stampReportMsgCd(player);
    try {
        pushChatLineToPlayer(player, `!{#dc2626}[Репорт] !{#e8e8e8}Тикет открыт: !{#f5f5f5}${preview}`);
    } catch (_e) {}
};

global.playerReportAppendUser = function (player, text) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    if (isReportBlockedForAdmin(player)) {
        return isNotify(player, 2, 'top-mid', 'Репорты с админ-аккаунта доступны с 8 уровня.', 4000);
    }
    let t = String(text || '').trim();
    if (typeof global.sanitizeChatUserText === 'function') {
        t = global.sanitizeChatUserText(t, player);
    }
    if (!t) return;
    if (t.length < REPORT_MIN_TEXT_LENGTH) {
        return isNotify(player, 2, 'top-mid', `Слишком короткое сообщение. Минимум ${REPORT_MIN_TEXT_LENGTH} символов.`, 4000);
    }
    if (t.length > 600) return isNotify(player, 2, 'top-mid', 'Сообщение слишком длинное.', 3000);
    if (player.getVariable('report') == null) {
        return isNotify(player, 2, 'top-mid', 'Нет открытого репорта. Создайте новый.', 3000);
    }
    if (!reportCheckMsgCd(player)) return;
    const st = player.static;
    const th = global.reportThreads[st];
    const userMeta = reportUserMessageMeta(player);
    userMeta.text = t;
    if (!th) {
        global.reportThreads[st] = {
            login: player.login,
            messages: [userMeta]
        };
    } else {
        th.messages.push(userMeta);
    }
    const mediaTag = typeof global.playerHasMedia === 'function' && global.playerHasMedia(player) ? ' !{#22c55e}[MEDIA]' : '';
    mp.players.forEach((p) => {
        if (!canManageReports(p,'reports.read')) return;
        if (p.static === player.static) return;
        if (typeof global.pushChatBox === 'function') {
            global.pushChatBox(p, `!{#ff6666}[Репорт #${st}]${mediaTag} ${player.login}: !{#FFF} ${t}`);
        } else {
            p.outputChatBox(`!{#ff6666}[Репорт #${st}]${mediaTag} ${player.login}: !{#FFF} ${t}`);
        }
    });
    notifyAdminsReportMessage(st, userMeta);
    syncReportUi(player);
    stampReportMsgCd(player);
    try {
        const clip = t.length > 220 ? t.slice(0, 220) + '…' : t;
        pushChatLineToPlayer(player, `!{#dc2626}[Репорт] !{#e8e8e8}Вы: !{#f5f5f5}${clip}`);
    } catch (_e) {}
};

/** Закрытие репорта игроком */
global.playerReportCloseByPlayer = function (player) {
    if (!mp.players.exists(player) || !player.getVariable('auth')) return;
    if (player.getVariable('report') == null) return;
    const st = player.static;
    reportHistory.persist(st,global.reportThreads[st],'closed');
    delete global.reportThreads[st];
    player.setVariable('report', null);
    notifyAdminsReportRemoved(st);
    syncReportUi(player);
    player.call('report:ui:closed', ['player']);
};

/** Ответ админа: сообщение в чат тикета, затем закрытие как в /arep */
global.playerReportAppendAdminAndClose = function (targetPlayer, adminLogin, adminStatic, replyText) {
    if (!mp.players.exists(targetPlayer)) return;
    const st = targetPlayer.static;
    let th = global.reportThreads[st];
    const msg = String(replyText || '').trim();
    const prevText = targetPlayer.getVariable('report');
    if (!th && prevText != null && msg) {
        th = {
            login: targetPlayer.login,
            messages: [{ role: 'user', text: String(prevText), author: targetPlayer.login, ts: Date.now() }]
        };
        global.reportThreads[st] = th;
    }
    if (th && msg) {
        th.messages.push({ role: 'admin', text: msg, author: adminLogin, ts: Date.now() });
        syncReportUi(targetPlayer);
    }
    targetPlayer.call('report:ui:closed', ['admin']);
    reportHistory.persist(st,global.reportThreads[st],'closed');
    delete global.reportThreads[st];
    targetPlayer.setVariable('report', null);
    notifyAdminsReportRemoved(st);
};

/** Ответ админа в тикет без закрытия (PM по-прежнему шлёт клиент из панели). */
global.playerReportAppendAdminNoClose = function (targetPlayer, adminLogin, text) {
    if (!mp.players.exists(targetPlayer)) return false;
    const msg = String(text || '').trim();
    if (!msg || msg.length > 600) return false;
    if (targetPlayer.getVariable('report') == null) return false;
    const st = targetPlayer.static;
    let th = global.reportThreads[st];
    const prevText = targetPlayer.getVariable('report');
    if (!th && prevText != null) {
        th = {
            login: targetPlayer.login,
            messages: [{ role: 'user', text: String(prevText), author: targetPlayer.login, ts: Date.now() }]
        };
        global.reportThreads[st] = th;
    }
    if (!th) return false;
    th.messages.push({ role: 'admin', text: msg, author: adminLogin, ts: Date.now() });
    targetPlayer.reportMsgCdUntil = 0;
    syncReportUi(targetPlayer);
    notifyAdminsReportMessage(st, { role: 'admin', text: msg, author: adminLogin, ts: Date.now() });
    try {
        const clip = msg.length > 220 ? msg.slice(0, 220) + '…' : msg;
        const nick = String(adminLogin || 'Админ');
        pushChatLineToPlayer(targetPlayer, `!{#dc2626}[Репорт] !{#e8e8e8}Ответ[A] ${nick}: !{#f5f5f5}${clip}`);
    } catch (_e) {}
    return true;
};

mp.events.add('report:ui:setOpen', (player, open) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        player.setVariable('reportui', !!open);
    } catch (e) {}
});

mp.events.add('report:ui:requestState', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        syncReportUi(player);
    } catch (e) {}
});

mp.events.add('report:ui:create', (player, text) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        global.playerReportCreate(player, text);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('report:ui:send', (player, text) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        global.playerReportAppendUser(player, text);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('report:ui:close', (player) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        global.playerReportCloseByPlayer(player);
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('s:report:load', (player) => {
    try {
        if (mp.players.exists(player) && player.getVariable('auth')) {
            syncReportUi(player);
        }
    } catch (e) {}
});

/** Ответ из F6-панели: текст в тикет игрока, репорт остаётся открытым. PM отправляет клиент (как и «закрыть»). */
mp.events.add('report:admin:replyOnly', (player, payload) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !canManageReports(player,'reports.reply')) return;
        let data;
        try {
            data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        } catch (e) {
            return;
        }
        const st = parseInt(data.s, 10);
        const text = String(data.t || '').trim();
        if (!Number.isFinite(st) || st <= 0) return;
        if (!text) return isNotify(player, 2, 'top-mid', 'Введите текст ответа.', 2000);
        if (text.length > 600) return isNotify(player, 2, 'top-mid', 'Слишком длинное сообщение.', 3000);
        const target = mp.players.toArray().find((p) => p.static === st);
        if (!target || !mp.players.exists(target)) {
            return isNotify(player, 2, 'top-mid', 'Игрок не в сети.', 3000);
        }
        if (typeof global.playerReportAppendAdminNoClose === 'function' && global.playerReportAppendAdminNoClose(target, player.login, text)) {
            isNotify(player, 3, 'top-mid', 'Ответ отправлен игроку.', 2800);
            const clip = text.length > 80 ? text.slice(0, 80) + '…' : text;
            const adminNick = String(player.login || 'Админ');
            isNotify(target, 3, 'bottom-mid', `Ответ[A] ${adminNick}: ${clip}`, 4500);
        } else {
            isNotify(player, 2, 'top-mid', 'У игрока нет открытого репорта.', 3000);
        }
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('report:admin:getThread:s', (player, staticRaw) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth') || !canManageReports(player,'reports.read')) return;
        const st = parseInt(staticRaw, 10);
        if (!Number.isFinite(st) || st <= 0) return;
        const target = mp.players.toArray().find((p) => p.static === st);
        const th = global.reportThreads[st];
        let messages = th && Array.isArray(th.messages) ? th.messages.slice() : [];
        if (!messages.length && target && target.getVariable('report') != null) {
            messages = [{
                role: 'user',
                text: String(target.getVariable('report')),
                author: target.login,
                ts: Date.now()
            }];
        }
        const payload = JSON.stringify({
            static: st,
            login: (th && th.login) || (target && target.login) || ('#' + st),
            messages: messages
        });
        player.call('adminPanel:setReportThread', [payload]);
    } catch (e) {
        console.log(e);
    }
});

/** Админ закрыл тикет из панели — у игрока репорт сбрасывается и UI закрывается. */
mp.events.add('report:admin:closeTicket', (player, targetStatic) => {
    try {
        if (!mp.players.exists(player) || !player.getVariable('auth')) return;
        if (!canManageReports(player,'reports.reply')) return;
        const st = parseInt(targetStatic, 10);
        if (!Number.isFinite(st) || st <= 0) return;
        const target = mp.players.toArray().find((p) => p.static === st);
        if (!target || !mp.players.exists(target)) {
            return isNotify(player, 2, 'top-mid', 'Игрок не в сети.', 3000);
        }
        if (target.getVariable('report') == null) {
            return isNotify(player, 2, 'top-mid', 'У игрока нет открытого репорта.', 2500);
        }
        reportHistory.persist(st,global.reportThreads[st],'closed');
    delete global.reportThreads[st];
        target.setVariable('report', null);
        syncReportUi(target);
        target.call('report:ui:closed', ['admin_panel']);
        notifyAdminsReportRemoved(st);
        isNotify(player, 3, 'top-mid', `Репорт игрока #${st} закрыт.`, 2500);
    } catch (e) {
        console.log(e);
    }
});
