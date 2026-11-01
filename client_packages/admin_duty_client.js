/** Дежурный режим после /offnc: оружие в руках недоступно (только кулаки). */
const UNARMED = mp.game.joaat('weapon_unarmed');
let _lastDutyDisarmMs = 0;

mp.events.add('render', () => {
    try {
        if (mp.players.local.getVariable('adminDutyNoWeapon') !== true) return;
        if (mp.players.local.getVariable('auth') !== true) return;
        const w = mp.players.local.weapon;
        if (w !== UNARMED && w !== 0) {
            const now = Date.now();
            if (now - _lastDutyDisarmMs > 120) {
                _lastDutyDisarmMs = now;
                try {
                    mp.players.local.giveWeapon(UNARMED, 0, true);
                } catch (_e2) {}
            }
        }
        if ((w>>>0)===(UNARMED>>>0)||w===0) return;
        const b = mp.game.controls;
        b.disableControlAction(0, 24, true);
        b.disableControlAction(0, 25, true);
        b.disableControlAction(0, 37, true);
        b.disableControlAction(2, 257, true);
        b.disableControlAction(0, 99, true);
        b.disableControlAction(0, 100, true);
        b.disableControlAction(0, 140, true);
        b.disableControlAction(0, 141, true);
        b.disableControlAction(0, 142, true);
        b.disableControlAction(0, 143, true);
        b.disableControlAction(0, 263, true);
        b.disableControlAction(0, 264, true);
    } catch (_e) {}
});
