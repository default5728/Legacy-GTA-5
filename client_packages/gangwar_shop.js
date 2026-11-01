'use strict';

/** CEF (barbershop / menunew) → клиент → сервер */
mp.events.add('gangwarShopBuyItem', (gameItemId, countRaw) => {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.getVariable('dead') === true) return;

    const now = Date.now();
    if (now - (mp.players.local.clicked || 0) < 500) {
        mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
        return;
    }
    mp.players.local.clicked = now;

    const cnt = parseInt(countRaw, 10);
    mp.events.callRemote('gangwarShopBuyItem:s', gameItemId, Number.isFinite(cnt) && cnt > 0 ? cnt : 1);
});
