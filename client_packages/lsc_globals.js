/**
 * Минимальные глобалы для LSC (без перехвата курсора Flow).
 * Не определяем global.showCursor / releaseUiCursor — иначе ломается
 * toggle курсора и залипает lock после spawnselect/rent/autosalon.
 */
(function () {
    if (typeof global.hideUI !== 'function') {
        global.hideUI = (hide) => {
            try {
                if (hide) {
                    if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();
                    else {
                        mp.gui.chat.show(false);
                        mp.game.ui.displayRadar(false);
                        mp.events.call('hud', false);
                    }
                } else {
                    mp.gui.chat.show(true);
                    mp.gui.chat.activate(true);
                    mp.game.ui.displayRadar(true);
                    mp.events.call('hud', true);
                    mp.events.call('help', true);
                    mp.events.call('minimap', true);
                }
            } catch (_e) {}
        };
    }

    if (typeof global.discordUpdate !== 'function') {
        global.discordUpdate = (status) => {
            try { mp.events.call('dstatus', status || 'Играет на flow DM', 'discord.gg/flowdm'); } catch (_e) {}
        };
    }

    if (typeof global.resetCamera !== 'function') {
        global.resetCamera = (transMs) => {
            const blendMs = typeof transMs === 'number' && transMs >= 0 ? transMs : 0;
            try { mp.game.cam.renderScriptCams(false, true, blendMs, true, false); } catch (_e) {}
        };
    }

    if (typeof global.getVehicleSpeedDataByModel !== 'function') {
        global.getVehicleSpeedDataByModel = () => ({ maxSpeed: 999 });
    }

    global.notifyKeyHelpShow = () => {};
    global.notifyKeyHelpHide = () => {};

    if (typeof global.disableAllAction === 'undefined') {
        global.disableAllAction = false;
    }

    /** Локальный курсор только для LSC — не трогает global.showCursor Flow. */
    global.__lscSetCursor = (on) => {
        try {
            mp.gui.cursor.show(!!on, !!on);
            mp.gui.cursor.visible = !!on;
        } catch (_e) {}
    };

    mp.events.add('render', () => {
        if (global.disableAllAction) {
            mp.game.controls.disableAllControlActions(0);
            mp.game.controls.disableAllControlActions(1);
            mp.game.controls.disableAllControlActions(2);
        }
    });
})();
