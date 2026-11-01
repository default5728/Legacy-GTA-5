'use strict';

/** Регистрация всех CEF-оверлеев для блокировки HUD (подключается последним в index.js). */
setTimeout(() => {
    if (typeof global.registerActiveBrowserOverlay !== 'function') return;

    const getters = [
        () => (typeof topr !== 'undefined' ? topr : null),
        () => (typeof global.getAutosalonBrowser === 'function' ? global.getAutosalonBrowser() : null),
        () => (typeof tatto !== 'undefined' ? tatto : null),
        () => (typeof global.getSpawnSelectBrowser === 'function' ? global.getSpawnSelectBrowser() : null),
        () => (typeof brrs !== 'undefined' ? brrs : null),
        () => (typeof global.isFracInteractOpen === 'function' && global.isFracInteractOpen() ? (typeof global.__fracInteractBrowser === 'function' ? global.__fracInteractBrowser() : null) : null),
        () => (typeof inventoryBrowserr !== 'undefined' && typeof global.isLocalInventoryModalOpen === 'function' && global.isLocalInventoryModalOpen() ? inventoryBrowserr : null),
        () => (typeof sellGunsr !== 'undefined' ? sellGunsr : null),
        () => (typeof talknpc1r !== 'undefined' ? talknpc1r : null),
        () => (typeof ems !== 'undefined' ? ems : null),
        () => (typeof targetMenu !== 'undefined' ? targetMenu : null),
        () => (typeof ccBrowser !== 'undefined' ? ccBrowser : null),
        () => (typeof global.getRentCarBrowser === 'function' ? global.getRentCarBrowser() : null),
        () => (typeof global.getMbaParkerDialogBrowser === 'function' ? global.getMbaParkerDialogBrowser() : null),
        () => (typeof global.getYgonTalkBrowser === 'function' ? global.getYgonTalkBrowser() : null),
        () => (typeof global.getYgonFinalBrowser === 'function' ? global.getYgonFinalBrowser() : null),
        () => (typeof buyGunsr !== 'undefined' ? buyGunsr : null),
        () => (typeof fibArmorBrowser !== 'undefined' ? fibArmorBrowser : null),
        () => (typeof global.getPortJobBrowser === 'function' ? global.getPortJobBrowser() : null),
        () => (typeof coburaSellBrowser !== 'undefined' ? coburaSellBrowser : null),
        () => (typeof global.getFlowClothesShopBrowser === 'function' ? global.getFlowClothesShopBrowser() : null),
        () => (typeof kostr !== 'undefined' ? kostr : null),
        () => (typeof reportbr !== 'undefined' ? reportbr : null),
        () => (typeof acceptmenu !== 'undefined' ? acceptmenu : null),
        () => (typeof famBrowser !== 'undefined' ? famBrowser : null),
        () => (typeof fracBrowser !== 'undefined' ? fracBrowser : null),
        () => (typeof bizBrowser !== 'undefined' ? bizBrowser : null),
        () => (typeof global.casinoMenuBrowser !== 'undefined' ? global.casinoMenuBrowser : null),
        () => (typeof global.casinoBrowser !== 'undefined' ? global.casinoBrowser : null),
        () => (typeof minigamebr !== 'undefined' ? minigamebr : null),
        () => (typeof banScreenBrowser !== 'undefined' ? banScreenBrowser : null),
        () => (typeof welcomeBrowser !== 'undefined' ? welcomeBrowser : null),
        () => {
            try {
                if (typeof loginBrowserr === 'undefined' || !loginBrowserr) return null;
                if (!mp.browsers.exists(loginBrowserr) || !loginBrowserr.active) return null;
                if (global.__authMenuOpen !== true) return null;
                return loginBrowserr;
            } catch (_e) {
                return null;
            }
        },
        () => (typeof hubExitBrowser !== 'undefined' ? hubExitBrowser : null),
        () => (typeof global.__warMapBrowser === 'function' ? global.__warMapBrowser() : null),
        () => (typeof global.getMoonvitoBrowser === 'function' ? global.getMoonvitoBrowser() : null),
        () => {
            try {
                if (typeof global.getClothesEditorBrowser === 'function') return global.getClothesEditorBrowser();
            } catch (_e) {}
            return null;
        }
    ];

    getters.forEach((getBrowser) => global.registerActiveBrowserOverlay(getBrowser));
}, 0);
