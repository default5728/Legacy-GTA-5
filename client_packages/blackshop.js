setTimeout(() => {
    let sellGunsr = mp.browsers.new('package://browsers/blackshop/index.html?v=6');
    sellGunsr.active = false;

    let talknpc1r = mp.browsers.new('package://browsers/blackshop/dialognew/index.html?v=4');
    talknpc1r.active = false;

    let blackShopTalkModalOpen = false;
    let blackShopSellModalOpen = false;

    function blackShopAnyModalOpen() {
        return blackShopTalkModalOpen || blackShopSellModalOpen;
    }

    function openBlackShopTalkModal() {
        if (blackShopTalkModalOpen) return;
        blackShopTalkModalOpen = true;
        if (typeof global.openNpcDialogModal === 'function') global.openNpcDialogModal({ freeze: true });
        else if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();
    }

    function closeBlackShopTalkModal() {
        if (!blackShopTalkModalOpen) return;
        blackShopTalkModalOpen = false;
        if (!blackShopAnyModalOpen()) {
            if (typeof global.closeNpcDialogModal === 'function') global.closeNpcDialogModal({ unfreeze: true });
            else if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
        }
    }

    function openBlackShopSellModal() {
        if (blackShopSellModalOpen) return;
        blackShopSellModalOpen = true;
        if (typeof global.openNpcDialogModal === 'function') global.openNpcDialogModal({ freeze: false });
        else if (typeof global.hideWorldUiForModal === 'function') global.hideWorldUiForModal();
    }

    function closeBlackShopSellModal() {
        if (!blackShopSellModalOpen) return;
        blackShopSellModalOpen = false;
        if (!blackShopAnyModalOpen()) {
            if (typeof global.closeNpcDialogModal === 'function') global.closeNpcDialogModal({ unfreeze: true });
            else if (typeof global.showWorldUiAfterModal === 'function') global.showWorldUiAfterModal();
        }
    }

    function executeBlackShopShow() {
        if (!blackShopSellModalOpen) return;
        try {
            sellGunsr.execute('if (typeof window.show === "function") window.show();');
        } catch (_e) {}
    }

    function openBlackhopMenu() {
        sellGunsr.active = true;
        openBlackShopSellModal();
        executeBlackShopShow();
        setTimeout(() => {
            if (blackShopSellModalOpen) executeBlackShopShow();
        }, 200);
    }

    mp.events.add('openBlackShopMenu', () => {
        talknpc1r.active = false;
        closeBlackShopTalkModal();
        openBlackhopMenu();
    });

    mp.events.add('closeBlackShopMenu', () => {
        try {
            sellGunsr.execute('if (typeof window.hide === "function") window.hide(true);');
        } catch (_e) {}
        sellGunsr.active = false;
        talknpc1r.active = false;

        const hadTalk = blackShopTalkModalOpen;
        const hadSell = blackShopSellModalOpen;
        blackShopTalkModalOpen = false;
        blackShopSellModalOpen = false;

        if (hadTalk || hadSell) {
            if (typeof global.forceCloseNpcDialogModal === 'function') {
                global.forceCloseNpcDialogModal({ unfreeze: true });
            } else if (typeof global.showWorldUiAfterModal === 'function') {
                global.showWorldUiAfterModal();
            }
        } else {
            try { mp.gui.cursor.show(false, false); } catch (_eCur) {}
            try { mp.players.local.freezePosition(false); } catch (_eFr) {}
        }

        mp.events.callRemote('setvarb', false);
    });

    mp.events.add('blackshop:ready', () => {
        if (blackShopSellModalOpen) executeBlackShopShow();
    });

    global.bindGameplayKey(0x45, true, () => {
        if (mp.game.ui.isPauseMenuActive()) return;
        if (mp.players.local.isTypingInTextChat) return;
        if (mp.players.local.vehicle) return;
        if (mp.players.local.getVariable('dead') === true) return;
        if (!mp.players.local.getVariable('gangwar')) return;
        if (mp.players.local.getVariable('targetmenu')) return;
        if (typeof global.isNpcDialogModalOpen === 'function' && global.isNpcDialogModalOpen() && !blackShopAnyModalOpen()) return;

        const player = mp.players.local;
        if (player.getVariable('black') == true) {
            if (!sellGunsr.active && !talknpc1r.active) {
                sellGunsr.active = false;
                talknpc1r.execute(`NPCDialog.changelocalName('${mp.players.local.getVariable('login')}');`);
                talknpc1r.active = true;
                openBlackShopTalkModal();
                mp.events.callRemote('setvarb', true);
            }
        }
    });

    mp.events.add('sellgun', (sellgun) => {
        if (new Date().getTime() - mp.players.local.clicked < 1000) return mp.events.call('notify:client', 2, 'top-mid', 'Не так часто.', 1500);
        mp.players.local.clicked = new Date().getTime();
        mp.events.callRemote('sellgun:SERVER', String(sellgun || ''));
    });

    mp.events.add('render', () => {
        if (!blackShopSellModalOpen) return;
        try {
            if (!mp.gui.cursor.visible) mp.gui.cursor.show(true, true);
        } catch (_e) {}
    });

    if (typeof global !== 'undefined') {
        global.tryCloseBlackShopEsc = () => {
            if (!sellGunsr.active && !talknpc1r.active) return false;
            mp.events.call('closeBlackShopMenu');
            return true;
        };
    }
}, 2000);
