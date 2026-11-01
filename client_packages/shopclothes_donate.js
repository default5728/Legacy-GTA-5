'use strict';

let inDonateClothesShop = false;

mp.events.add('updateColshapeStatusDonate', (status) => {
    inDonateClothesShop = status === true;
});

global.bindGameplayKey(0x45, true, () => {
    if (!inDonateClothesShop) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (typeof global.requestFlowClothesShopEntry === 'function') {
        global.requestFlowClothesShopEntry('donate');
    }
});
