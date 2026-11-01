'use strict';

let inSpectrumClothesShop = false;

mp.events.add('spectrum:colshape', (status) => {
    inSpectrumClothesShop = status === true;
});

global.bindGameplayKey(0x45, true, () => {
    if (!inSpectrumClothesShop) return;
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    if (mp.players.local.getVariable('targetmenu')) return;
    if (typeof global.requestFlowClothesShopEntry === 'function') {
        global.requestFlowClothesShopEntry('spectrum');
    }
});
