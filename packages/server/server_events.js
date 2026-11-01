/**
 * Серверные переключатели: X2-события (PayDay, убийства, AirDrop).
 */

global.serverX2EventActive = false;

global.getServerX2Multiplier = function getServerX2Multiplier() {
    return global.serverX2EventActive ? 2 : 1;
};

global.applyServerX2Amount = function applyServerX2Amount(amount) {
    const n = parseInt(amount, 10) || 0;
    if (n <= 0) return 0;
    return Math.floor(n * global.getServerX2Multiplier());
};

function parseOnOffArg(arg) {
    const a = String(arg || '').trim().toLowerCase();
    if (!a) return null;
    if (a === '1' || a === 'on' || a === 'true' || a === 'вкл' || a === 'да') return true;
    if (a === '0' || a === 'off' || a === 'false' || a === 'выкл' || a === 'нет') return false;
    return undefined;
}

global.setServerX2EventActive = function setServerX2EventActive(active, actor) {
    global.serverX2EventActive = !!active;
    const on = global.serverX2EventActive;
    const actorName = actor && actor.login ? actor.login : 'Система';
    mp.players.broadcast(
        on
            ? `!{#ffffff}[Сервер] !{#ef4444}X2-события включены!{#ffffff} PayDay, деньги за убийство и AirDrop.`
            : `!{#ffffff}[Сервер] !{#ef4444}X2-события отключены!{#ffffff} PayDay, деньги за убийство и AirDrop.`
    );
    if (actor && mp.players.exists(actor)) {
        actor.outputChatBox(
            on
                ? '!{#22c55e}X2-события включены (PayDay, убийства, AirDrop).'
                : '!{#ef4444}X2-события отключены.'
        );
    }
    try {
        global.sendDiscordLog(
            `**X2-события** ${on ? 'включены' : 'отключены'} администратором ${actorName}.`,
            '1274413578665066719'
        );
    } catch (_e) {}
};

mp.events.addCommand('setx2', (player, _full, arg) => {
    try {
        const adminlvl = Number(player.adminlvl) || Number(player.getVariable('adminlvl')) || 0;
        if (adminlvl < 7) {
            return player.outputChatBox('!{#ef4444}Команда /setx2 доступна с 7 уровня админки.');
        }
        let parsed = parseOnOffArg(arg);
        if (parsed === undefined) {
            return player.outputChatBox('!{#888888}Использование: /setx2 [on|off] — X2 PayDay, убийства, AirDrop.');
        }
        if (parsed === null) {
            parsed = !global.serverX2EventActive;
        }
        global.setServerX2EventActive(parsed, player);
    } catch (e) {
        console.log(e);
    }
});
