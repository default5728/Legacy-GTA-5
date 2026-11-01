/**
 * Регистрация точек крепления + отслеживание смены оружия (серверный playerWeaponChange в JS часто не вызывается).
 */
let _wbLastWeapon = -1;
let _wbLastModel = -1;
let _wbReady = false;

mp.events.add('registerWeaponAttachments', (json) => {
    try {
        const data = JSON.parse(json);
        for (const key of Object.keys(data)) {
            const row = data[key];
            if (!row || !row.AttachName || !row.AttachModel) continue;
            mp.attachmentMngr.register(
                row.AttachName,
                row.AttachModel,
                row.AttachBone,
                row.AttachPosition,
                row.AttachRotation
            );
        }
        _wbReady = true;
        if (mp.players.local) {
            const w = mp.players.local.weapon | 0;
            _wbLastWeapon = w;
            /* Сразу передаём хеш с клиента на сервер + полный sync (иначе player.weapon на сервере часто врёт — кобура скрыта). */
            mp.events.callRemote('attachment:weaponChange', w, w);
        } else {
            mp.events.callRemote('attachment:syncWeaponBody');
        }
    } catch (e) {
        console.log(e);
    }
});

mp.events.add('render', () => {
    try {
        if (!_wbReady || !mp.players.local) return;
        if (!mp.players.local.getVariable('auth')) return;

        const modelNow = mp.players.local.model | 0;
        if (_wbLastModel === -1) {
            _wbLastModel = modelNow;
        } else if (modelNow !== _wbLastModel) {
            _wbLastModel = modelNow;
            const w = mp.players.local.weapon | 0;
            _wbLastWeapon = w;
            mp.events.callRemote('attachment:weaponChange', w, w);
            return;
        }

        const w = mp.players.local.weapon | 0;
        if (w === _wbLastWeapon) return;

        const prev = _wbLastWeapon;
        _wbLastWeapon = w;
        mp.events.callRemote('attachment:weaponChange', prev, w);
    } catch (e) {
        /* ignore */
    }
});
