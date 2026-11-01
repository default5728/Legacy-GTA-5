'use strict';

require('./lsc_globals.js');

const rpc = global.rpc;
if (!rpc) {
    mp.console.logWarning('[casino_menu] global.rpc missing — load after casino_rpc.js');
} else {
    const MENU_BROWSER_URL = 'package://cef/PlayerMenu/Menu/__menu.html';
    const menuBrowser = mp.browsers.new(MENU_BROWSER_URL);
    menuBrowser.active = false;
    const menuMap = new Map();
    let menuCursorCounter = 0;

    function pushMenuManagerOpen(page, data) {
        if (!menuBrowser || !mp.browsers.exists(menuBrowser)) return;
        menuBrowser.active = true;
        const payload = { menu: page, data };
        rpc.triggerBrowser(menuBrowser, 'menuManager_menu_open', payload);
        const dataJson = JSON.stringify(data).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const applyLoad = () => {
            if (!mp.browsers.exists(menuBrowser)) return;
            try {
                menuBrowser.execute(
                    `try{var m=typeof menuManagerMap!=='undefined'&&menuManagerMap.get('${page}');` +
                    `if(m){m.vue.loaded=false;m.load(JSON.parse('${dataJson}'));}}catch(e){}`
                );
            } catch (_e) {}
        };
        applyLoad();
        setTimeout(applyLoad, 350);
    }

    function setCasinoHudHidden(hidden) {
        const on = !!hidden;
        global.__casinoUiOpen = on;
        try { mp.events.callRemote('setvarc', on); } catch (_e) {}
        try {
            if (typeof global.hideUI === 'function') global.hideUI(on);
            else {
                mp.events.call('hud', !on);
                mp.game.ui.displayRadar(!on);
                mp.gui.chat.show(!on);
            }
        } catch (_e2) {}
    }

    function openMenu(menu, data) {
        menu.params = data;
        menu.beforeOpen(data);
        pushMenuManagerOpen(menu.page, data);
        if (menu.enableCursor && !menu.isOpen) {
            if (menuCursorCounter === 0) {
                global.showCursor(true);
                mp.events.add('render', blockMapKey);
            }
            menuCursorCounter++;
        }
        menu.isOpen = true;
        if (menu.page === 'casinoMenu') setCasinoHudHidden(true);
        menu.afterOpen(data);
    }

    function deactivateMenuBrowserIfIdle() {
        if (menuCursorCounter > 0) return;
        if (menuBrowser && mp.browsers.exists(menuBrowser)) menuBrowser.active = false;
    }

    function closeMenu(menu) {
        if (!menu || !menu.isOpen) return;
        const wasCasino = menu.page === 'casinoMenu';
        rpc.triggerBrowser(menuBrowser, 'menuManager_menu_close', menu.page);
        menu.onClose();
        menu.isOpen = false;
        if (wasCasino) setCasinoHudHidden(false);
        if (menu.enableCursor) {
            menuCursorCounter--;
            if (menuCursorCounter <= 0) {
                menuCursorCounter = 0;
                global.showCursor(false);
                mp.events.remove('render', blockMapKey);
                deactivateMenuBrowserIfIdle();
            }
        } else {
            deactivateMenuBrowserIfIdle();
        }
    }

    function forceCloseMenu(menu) {
        if (!menu) return;
        const wasCasino = menu.page === 'casinoMenu' && (menu.isOpen || global.__casinoUiOpen);
        if (menu.isOpen) closeMenu(menu);
        else {
            try { rpc.triggerBrowser(menuBrowser, 'menuManager_menu_close', menu.page); } catch (_e) {}
            menu.isOpen = false;
            if (wasCasino) setCasinoHudHidden(false);
        }
        if (menuCursorCounter > 0) {
            menuCursorCounter = 0;
            if (typeof global.forceHideAllCursors === 'function') global.forceHideAllCursors();
            else global.showCursor(false);
            try { mp.events.remove('render', blockMapKey); } catch (_e2) {}
        }
        if (menuBrowser && mp.browsers.exists(menuBrowser)) menuBrowser.active = false;
    }

    const blockMapKey = () => {
        mp.game.controls.disableControlAction(0, 156, true);
        mp.game.controls.disableControlAction(0, 199, true);
        mp.game.controls.disableControlAction(0, 200, true);
    };

    mp.events.add('client_menuManager_taskClose', (page) => {
        const menu = menuMap.get(page);
        if (menu && menu.isOpen) closeMenu(menu);
    });

    class Menu {
        constructor(page) {
            this.page = page;
            this.params = null;
            this.isOpen = false;
            this.enableCursor = true;
            menuMap.set(page, this);
        }
        beforeOpen() {}
        afterOpen() {}
        onClose() {}
    }

    /* Не затирать LSC Menu/openMenu/menuBrowser — казино только через casino* globals. */
    global.CasinoMenu = Menu;
    global.casinoMenuBrowser = menuBrowser;
    global.casinoOpenMenu = openMenu;
    global.casinoCloseMenu = closeMenu;
    global.forceCloseCasinoMenu = forceCloseMenu;
    if (!global.Menu) global.Menu = Menu;
    if (!global.openMenu) global.openMenu = openMenu;
    if (!global.closeMenu) global.closeMenu = closeMenu;
    if (!global.forceCloseMenu) global.forceCloseMenu = forceCloseMenu;
    if (!global.menuBrowser) global.menuBrowser = menuBrowser;

    global.tryCloseCasinoEsc = function tryCloseCasinoEsc() {
        const menu = menuMap.get('casinoMenu');
        if (!menu || !menu.isOpen) return false;
        const type = menu.params && menu.params.type;
        switch (type) {
            case 'slot':
                mp.events.callRemote('server_casino_exitSlot');
                break;
            case 'dice':
                mp.events.callRemote('server_casino_exitDice');
                break;
            case 'roulette':
                mp.events.callRemote('server_casino_exitRoulette');
                break;
            case 'poker':
                mp.events.callRemote('server_casino_exitPoker');
                break;
            case 'convert':
                closeMenu(menu);
                break;
            default:
                closeMenu(menu);
        }
        return true;
    };

    global.tryCloseRouletteEsc = function tryCloseRouletteEsc() {
        return global.tryCloseCasinoEsc();
    };

    if (typeof global.registerWorldUiOverlayCheck === 'function') {
        global.registerWorldUiOverlayCheck(() => !!global.__casinoUiOpen);
    } else {
        global.__pendingWorldUiOverlayChecks = global.__pendingWorldUiOverlayChecks || [];
        global.__pendingWorldUiOverlayChecks.push(() => !!global.__casinoUiOpen);
    }

    mp.console.logInfo('[casino_menu] Diamond Casino UI bridge loaded');
}
