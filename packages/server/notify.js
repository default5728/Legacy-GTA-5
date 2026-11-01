global.isNotify = (player, type, pos, message, duration) => {
    try {
        if (!mp.players.exists(player)) return;
        player.call('notify:client', [type, pos, message, duration]);
    } catch (error) {
        console.log(error);
    }
};

global.notification = (player, type, title, message) => {
    try {
        if (!mp.players.exists(player)) return;
        const t = parseInt(type, 10);
        let notifyType = 1;
        if (t === 2 || String(type).toLowerCase() === 'error') notifyType = 2;
        else if (t === 3 || String(type).toLowerCase() === 'success') notifyType = 3;
        global.isNotify(player, notifyType, 'top-mid', message || title || '', 3000);
    } catch (error) {
        console.log(error);
    }
};
