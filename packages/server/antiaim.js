const antiAimList = new Map();

function getPlayerByStatic(staticId) {
    return mp.players.toArray().find(p => String(p.getVariable('static')) === String(staticId)) || null;
}

function addAntiAim(target, admin) {
    // Просто включаем синхронизируемую переменную
    target.setVariable('antiAimActive', true);
    
    const entry = { target, admin: admin.name, static: target.getVariable('static'), time: Date.now() };
    antiAimList.set(target.id, entry);
}

function removeAntiAim(target) {
    target.setVariable('antiAimActive', false);
    antiAimList.delete(target.id);
}

function showAntiAimList(player) {
    if (antiAimList.size === 0) {
        player.outputChatBox('!{#FFFF00}Нет активных антиаимов.');
    } else {
        player.outputChatBox('!{#FFFF00}Активные антиаимы:');
        antiAimList.forEach((entry) => {
            player.outputChatBox(`!{#FFFFFF}${entry.target.name} — Static: ${entry.static} — Выдал: ${entry.admin}`);
        });
    }
}

mp.events.addCommand('antiaim', (player, fullText) => {
    const lvl = Number(player.adminlvl) || 0;
    if (lvl < 10) {
        player.outputChatBox('!{#FF5555}У вас нет прав на использование этой команды.');
        return;
    }

    const args = fullText.trim().split(/\s+/);
    const par1 = (args[0] || '').toLowerCase();
    const par2 = (args[1] || '').toLowerCase();

    if (!par1 || par1 === 'list') {
        showAntiAimList(player);
        return;
    }

    if (par1 === 'off') {
        if (antiAimList.has(player.id)) {
            removeAntiAim(player);
            player.outputChatBox('!{#55FF55}Вы выключили для себя антиаим.');
        } else {
            player.outputChatBox('!{#FFFF00}У вас нет активного антиаима.');
        }
        return;
    }

    if (!par2 || (par2 !== 'on' && par2 !== 'off')) {
        player.outputChatBox('!{#FFFFFF}Использование: /antiaim [staticId] [on/off]');
        return;
    }

    const staticId = args[0];
    const status = par2;

    if (status === 'on') {
        const target = getPlayerByStatic(staticId);
        if (!target) {
            player.outputChatBox('!{#FF5555}Игрок с таким Static ID не найден.');
            return;
        }
        if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, target, 'antiaim')) return;
        if (antiAimList.has(target.id)) {
            player.outputChatBox(`!{#FFFF00}У игрока ${target.name} (${staticId}) уже включен антиаим.`);
            return;
        }
        addAntiAim(target, player);
        player.outputChatBox(`!{#55FF55}Вы включили антиаим для игрока ${target.name} (${staticId}).`);
        target.outputChatBox('!{#FF5555}Администратор включил для вас антиаим.');
        return;
    }

    if (status === 'off') {
        const target = getPlayerByStatic(staticId);
        if (!target) {
            player.outputChatBox('!{#FF5555}Игрок с таким Static ID не найден.');
            return;
        }
        if (typeof global.canAdminTargetPlayer === 'function' && !global.canAdminTargetPlayer(player, target, 'antiaim')) return;
        if (!antiAimList.has(target.id)) {
            player.outputChatBox(`!{#FFFF00}У игрока ${target.name} (${staticId}) и так нет антиаима.`);
            return;
        }
        removeAntiAim(target);
        player.outputChatBox(`!{#55FF55}Вы выключили антиаим для игрока ${target.name} (${staticId}).`);
        target.outputChatBox('!{#55FF55}Администратор выключил для вас антиаим.');
    }
});

mp.events.add('playerQuit', (player) => {
    if (antiAimList.has(player.id)) {
        removeAntiAim(player);
    }
});