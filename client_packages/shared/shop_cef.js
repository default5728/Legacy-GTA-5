'use strict';

/** Без query-string в package:// — RAGE CEF их не поддерживает и падает с fatal error. */
global.shopCefUrl = function shopCefUrl(relPath) {
    const clean = String(relPath || '').replace(/^\/+/, '');
    return 'package://browsers/' + clean;
};

global.ensureShopBrowser = function ensureShopBrowser(current, relPath) {
    const url = global.shopCefUrl(relPath);
    if (typeof global.ensureManagedBrowser === 'function') {
        return global.ensureManagedBrowser(current, url);
    }
    if (current && typeof mp.browsers.exists === 'function' && mp.browsers.exists(current)) {
        return current;
    }
    const b = mp.browsers.new(url);
    if (!b) return current || null;
    b.active = false;
    return b;
};

/** Не пересоздаёт рабочий браузер — только если его нет или он «завис». */
global.refreshShopBrowser = function refreshShopBrowser(current, relPath) {
    if (typeof global.ensureShopBrowserHealthy === 'function') {
        return global.ensureShopBrowserHealthy(current, relPath);
    }
    return global.ensureShopBrowser(current, relPath);
};
