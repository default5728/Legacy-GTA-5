/**
 * RPC для F10 «Прицел» (Life5 playermenu).
 * Подключать ПОСЛЕ playermenu_reticle.js и после инициализации global.rpc (rage-rpc).
 */
(function () {
    function apiOk(data) {
        return { error: false, data: data };
    }

    function apiErr(errorText) {
        return { error: true, errorText: String(errorText || 'Ошибка') };
    }

    function f10ReticleGetList() {
        try {
            if (typeof global.__f10Reticle !== 'undefined' && typeof global.__f10Reticle.buildReticleListForUi === 'function') {
                return apiOk(global.__f10Reticle.buildReticleListForUi());
            }
        } catch (_eList) {}
        return apiOk([]);
    }

    function f10ReticleSet(payload) {
        try {
            if (typeof global.__f10Reticle !== 'undefined' && typeof global.__f10Reticle.setReticleFromPayload === 'function') {
                const result = global.__f10Reticle.setReticleFromPayload(payload);
                if (result && result.ok) {
                    mp.events.call('notify:client', 3, 'top-mid', 'Прицел сохранён.', 2200);
                    return apiOk(true);
                }
                return apiErr((result && result.err) || 'Не удалось сохранить прицел');
            }
        } catch (_eSet) {}
        return apiErr('Модуль прицела недоступен');
    }

    function registerReticleRpc() {
        const rpc = global.rpc;
        if (!rpc || typeof rpc.register !== 'function') return false;

        rpc.register('client_hud_reticle_getList', () => f10ReticleGetList());
        rpc.register('client_hud_reticle_set', (payload) => f10ReticleSet(payload));
        rpc.register('api.client_hud_reticle_getList', () => f10ReticleGetList());
        rpc.register('api.client_hud_reticle_set', (payload) => f10ReticleSet(payload));
        return true;
    }

    if (!registerReticleRpc()) {
        let tries = 0;
        const timer = setInterval(() => {
            tries += 1;
            if (registerReticleRpc() || tries > 40) clearInterval(timer);
        }, 250);
    }
})();
