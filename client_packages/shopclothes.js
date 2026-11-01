'use strict';

let inRegularClothesShop = false;

mp.events.add('updateColshapeStatus', (status) => {
    inRegularClothesShop = status === true;
});

global.bindGameplayKey(0x45, true, () => {
    if(typeof global.isWorldNpcNearby==='function'&&global.isWorldNpcNearby())return;
    if (!inRegularClothesShop) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (typeof global.requestFlowClothesShopEntry === 'function') {
        global.requestFlowClothesShopEntry('regular');
    }
});
