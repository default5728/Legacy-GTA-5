global.bindGameplayKey(0x45, true, () => {
    if (mp.game.ui.isPauseMenuActive()) return;
    if (mp.players.local.isTypingInTextChat) return;
    if (mp.players.local.vehicle) return;
    if (mp.players.local.getVariable('dead') === true) return;
    if (mp.players.local.getVariable('currentWeaponColshape')) return;
    if (!mp.players.local.getVariable('gangwar')) return;
    mp.events.callRemote('collectDrop');
});
