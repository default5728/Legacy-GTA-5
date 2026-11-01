const moment = require('moment-timezone');

let _dailyRestartDayKey = '';

function performScheduledServerRestart() {
    setTimeout(() => {
        mp.players.forEach((player) => {
            player.outputChatBox("!{red}Системный рестарт! К серверу вас переподключит автоматически");
            player.outputChatBox("!{red}Системный рестарт! К серверу вас переподключит автоматически");
            player.outputChatBox("!{red}Системный рестарт! К серверу вас переподключит автоматически");
        });
    }, 5000);
    setTimeout(() => {
        const exitServer = () => {
            setTimeout(() => process.exit(0), 300);
        };
        if (typeof global.flushAllPlayerLastPositions === 'function') {
            global.flushAllPlayerLastPositions(exitServer);
        } else {
            mp.players.forEach((player) => {
                if (typeof global.savePlayerLastPosition === 'function') global.savePlayerLastPosition(player, true);
            });
            exitServer();
        }
    }, 10000);
}

function checkTimeAndSendMessages() {
    try {
        const moscowTime = moment.tz("Europe/Moscow");
        const dayKey = moscowTime.format('YYYY-MM-DD');

        const currentHour = moscowTime.hour();
        const currentMinute = moscowTime.minute();
        const currentSecond = moscowTime.second();

        if (currentHour === 6 && currentMinute === 0 && currentSecond === 0) {
            mp.players.forEach(player => {
                player.outputChatBox("!{red}Системный рестарт через 1 час!");
                player.outputChatBox("!{red}Системный рестарт через 1 час!");
                player.outputChatBox("!{red}Системный рестарт через 1 час!");
            });
        }
        else if (currentHour === 6 && currentMinute === 30 && currentSecond === 0) {
            mp.players.forEach(player => {
                player.outputChatBox("!{red}Системный рестарт через 30 минут!");
                player.outputChatBox("!{red}Системный рестарт через 30 минут!");
                player.outputChatBox("!{red}Системный рестарт через 30 минут!");
            });
        }
        else if (currentHour === 6 && currentMinute === 55 && currentSecond === 0) {
            mp.players.forEach(player => {
                player.outputChatBox("!{red}Системный рестарт через 5 минут!");
                player.outputChatBox("!{red}Системный рестарт через 5 минут!");
                player.outputChatBox("!{red}Системный рестарт через 5 минут!");
            });
        }
        else if (currentHour === 7 && currentMinute === 0 && currentSecond === 0) {
            if (_dailyRestartDayKey !== dayKey) {
                _dailyRestartDayKey = dayKey;
                performScheduledServerRestart();
            }
        }
    } catch (error) {
        console.log(error);
    }
}

setInterval(checkTimeAndSendMessages, 1000);

let date = '';
let lastDateHud = '';
function updateDate() {
    const now = moment().tz('Europe/Moscow');
    const next = now.format('DD.MM.YYYY');
    if (next === lastDateHud) return;
    lastDateHud = next;
    date = next;
    mp.players.forEach((player) => {
        try {
            if (!player || !mp.players.exists(player)) return;
            player.call('setDateHud', [date]);
        } catch (_e) {}
    });
}

let timeToHud = '';
let lastTimeToHud = '';
function updateTime() {
    const moscowTime = moment().tz('Europe/Moscow');
    const hours = moscowTime.hours();
    const minutes = moscowTime.minutes();
    const seconds = moscowTime.seconds();
    const next = moscowTime.format('HH:mm');
    if (next !== lastTimeToHud) {
        lastTimeToHud = next;
        timeToHud = next;
        mp.players.forEach((p) => {
            try {
                if (!p || !mp.players.exists(p)) return;
                p.call('setTimeHud', [timeToHud]);
            } catch (_e) {}
        });
    }
    mp.players.forEach(player => {
        try {
            if (!player || !mp.players.exists(player)) return;
            if (!player.getVariable('auth')) return;
            if (!player.getVariable('time')) {
                player.call('setWorldTime', [hours, minutes, seconds]);
            } else {
                player.call('setWorldTime', [Number(player.getVariable('time')), 0, 0]);
            }
        } catch (_e) {}
    });
}

mp.events.add('settime:s', (player, toogle) => {
    try {
        time = toogle === 0 ? false : toogle;
        player.setVariable('time', time)
    } catch (error) {
        console.log(error);
    }
});

setInterval(updateDate, 1000);
setInterval(updateTime, 1000);
updateDate();
updateTime();

function pushHudClockToPlayer(player) {
    if (!player || !mp.players.exists(player)) return;
    try {
        const now = moment().tz('Europe/Moscow');
        const d = date || now.format('DD.MM.YYYY');
        const t = timeToHud || now.format('HH:mm');
        player.call('setDateHud', [d]);
        player.call('setTimeHud', [t]);
    } catch (_e) {}
}

global.pushHudClockToPlayer = pushHudClockToPlayer;

mp.events.add('hud:clock:request:s', (player) => {
    try {
        if (!player || !mp.players.exists(player)) return;
        pushHudClockToPlayer(player);
    } catch (_e) {}
});

/* ─── Серверные «часы» для телефона (актуальное MSK без зависимости от open-meteo) ─── */
function pushServerClockToPhones() {
    try {
        const m = moment().tz('Europe/Moscow');
        const payload = {
            hour: m.hours(),
            minute: m.minutes(),
            second: m.seconds(),
            ts: Date.now()
        };
        const json = JSON.stringify(payload);
        mp.players.forEach((p) => {
            try {
                if (!p || !mp.players.exists(p)) return;
                if (!p.getVariable || !p.getVariable('auth')) return;
                p.call('phone:clock:sync:c', [json]);
            } catch (_e) {}
        });
    } catch (_e) {}
}
/* Раз в 30 секунд достаточно, у клиента «тикер» по 1 сек прибавляет минуты сам. */
setInterval(pushServerClockToPhones, 30 * 1000);
/* Первый push через 5 сек после старта модуля */
setTimeout(pushServerClockToPhones, 5000);

mp.events.add('phone:clock:request:c', (player) => {
    try {
        if (!player || !mp.players.exists(player) || !player.getVariable('auth')) return;
        const m = moment().tz('Europe/Moscow');
        player.call('phone:clock:sync:c', [JSON.stringify({
            hour: m.hours(),
            minute: m.minutes(),
            ts: Date.now()
        })]);
    } catch (_e) {}
});