'use strict';

/**
 * Глобальный CEF-мост:
 * - патчит mp.browsers.new / browser.execute / destroy
 * - очередь команд до готовности DOM
 * - browserExecWhen ждёт появления API (Vue/app), не только DOM
 *
 * Должен подключаться ПЕРВЫМ в index.js, до любых mp.browsers.new.
 */

const _registry = new Map();
let _tokenSeq = 0;
let _patched = false;

const POLL_MS = 100;
/**
 * CEF может не успеть создать страницу, когда при входе одновременно стартуют
 * десятки браузеров. Нельзя считать такой браузер готовым по таймауту: иначе
 * очередь команд очищается в пустую страницу и меню остаётся сломанным до
 * перезахода. После таймаута пробуем штатный reload и продолжаем ждать реальный
 * DOM ready.
 */
const RECOVERY_AFTER = 150; // ~15с
const MAX_AUTO_RELOADS = 2;
/** Ожидание API в CEF: 250 * 40ms ≈ 10с */
const WHEN_MAX_TRIES = 250;
const WHEN_INTERVAL_MS = 40;

function browserKey(browser) {
    return browser;
}

function getEntry(browser) {
    if (!browser) return null;
    return _registry.get(browserKey(browser)) || null;
}

function stopPoll(entry) {
    if (!entry || !entry.pollTimer) return;
    clearInterval(entry.pollTimer);
    entry.pollTimer = null;
}

function rawExecute(browser, code) {
    if (!browser) return false;
    try {
        if (typeof browser.__cefOrigExecute === 'function') {
            browser.__cefOrigExecute(String(code));
        } else {
            browser.execute(String(code));
        }
        return true;
    } catch (_e) {
        return false;
    }
}

function flushQueue(entry) {
    if (!entry || !entry.queue.length) return;
    const q = entry.queue.splice(0);
    q.forEach((code) => {
        if (code == null || code === '') return;
        rawExecute(entry.browser, code);
    });
}

function markReady(browser) {
    const entry = getEntry(browser);
    if (!entry || entry.ready) return;
    entry.ready = true;
    stopPoll(entry);
    flushQueue(entry);
}

function resetForReload(entry) {
    if (!entry) return;
    entry.ready = false;
    entry.pollAttempts = 0;
    entry.pollToken = 'cef' + (++_tokenSeq);
    entry.nextRecoveryAt = Date.now() + 12000;
}

function tryRecover(entry) {
    if (!entry || entry.reloading || entry.reloadCount >= MAX_AUTO_RELOADS) return false;
    const browser = entry.browser;
    if (!browser || !mp.browsers.exists(browser)) return false;
    if (Date.now() < (entry.nextRecoveryAt || 0)) return false;

    entry.reloading = true;
    entry.reloadCount += 1;
    resetForReload(entry);
    try {
        if (typeof browser.reload === 'function') {
            browser.reload(true);
            setTimeout(() => {
                if (entry && !entry.ready) entry.reloading = false;
            }, 5000);
            return true;
        }
    } catch (_e) {}
    entry.reloading = false;
    return false;
}

function isBridgeProbeCode(code) {
    const s = String(code || '');
    return (
        s.indexOf('cef:bridge:ready') !== -1 ||
        s.indexOf('__cefBridgeToken') !== -1 ||
        s.indexOf('cef:appReady') !== -1
    );
}

function wrapBrowserExecute(browser) {
    if (!browser || browser.__cefExecWrapped) return;
    if (typeof browser.execute !== 'function') return;

    browser.__cefExecWrapped = true;
    const orig = browser.execute.bind(browser);
    browser.__cefOrigExecute = orig;

    browser.execute = function cefQueuedExecute(code) {
        if (!mp.browsers.exists(browser)) return false;
        const entry = getEntry(browser) || registerBrowser(browser, '');
        if (!entry) return rawExecute(browser, code);

        if (entry.ready || isBridgeProbeCode(code)) {
            return rawExecute(browser, code);
        }

        const s = String(code);
        if (s) entry.queue.push(s);
        if (!entry.pollTimer) startPoll(entry);
        return true;
    };
}

function wrapBrowserDestroy(browser) {
    if (!browser || browser.__cefDestroyWrapped) return;
    if (typeof browser.destroy !== 'function') return;

    browser.__cefDestroyWrapped = true;
    const origDestroy = browser.destroy.bind(browser);
    browser.__cefOrigDestroy = origDestroy;

    browser.destroy = function cefTrackedDestroy() {
        try {
            unregisterBrowser(browser);
        } catch (_e) {}
        try {
            return origDestroy();
        } catch (_e2) {
            return undefined;
        }
    };
}

function startPoll(entry) {
    if (!entry || entry.ready || entry.pollTimer) return;
    entry.pollAttempts = 0;
    if (!entry.pollToken) entry.pollToken = 'cef' + (++_tokenSeq);

    const tick = () => {
        const b = entry.browser;
        if (!b || !mp.browsers.exists(b)) {
            stopPoll(entry);
            _registry.delete(browserKey(b));
            return;
        }
        if (entry.ready) {
            stopPoll(entry);
            return;
        }

        entry.pollAttempts += 1;
        if (entry.pollAttempts >= RECOVERY_AFTER) {
            tryRecover(entry);
        }

        const token = entry.pollToken;
        rawExecute(
            b,
            "(function(){try{" +
                "window.__cefBridgeToken='" +
                token +
                "';" +
                "var rs=document.readyState;" +
                "if(rs==='complete'||rs==='interactive'){mp.trigger('cef:bridge:ready','" +
                token +
                "');}" +
                "}catch(_e){}})();"
        );
    };

    entry.pollTimer = setInterval(tick, POLL_MS);
    setTimeout(tick, 30);
}

function registerBrowser(browser, url) {
    if (!browser) return null;
    wrapBrowserExecute(browser);
    wrapBrowserDestroy(browser);

    let entry = getEntry(browser);
    if (entry) {
        if (url) entry.url = String(url);
        if (!entry.ready) startPoll(entry);
        return entry;
    }

    entry = {
        browser: browser,
        url: String(url || ''),
        ready: false,
        queue: [],
        pollTimer: null,
        pollAttempts: 0,
        pollToken: 'cef' + (++_tokenSeq),
        reloadCount: 0,
        reloading: false,
        // Разносим восстановление браузеров по времени, чтобы снова не
        // перегрузить CEF одновременными reload.
        nextRecoveryAt: Date.now() + 15000 + ((_tokenSeq % 20) * 250)
    };
    _registry.set(browserKey(browser), entry);
    rawExecute(
        browser,
        "(function(){try{window.__cefBridgeToken='" + entry.pollToken + "';}catch(_e){}})();"
    );
    startPoll(entry);
    return entry;
}

function unregisterBrowser(browser) {
    const entry = getEntry(browser);
    if (entry) stopPoll(entry);
    if (browser) _registry.delete(browserKey(browser));
}

function patchBrowsersApi() {
    if (_patched) return;
    if (!mp || !mp.browsers || typeof mp.browsers.new !== 'function') return;
    _patched = true;

    const origNew = mp.browsers.new.bind(mp.browsers);
    mp.browsers.new = function cefManagedNew(url) {
        const b = origNew(url);
        if (b) registerBrowser(b, url);
        return b;
    };
}

patchBrowsersApi();

mp.events.add('cef:bridge:ready', (token) => {
    if (!token) return;
    const t = String(token);
    for (const entry of _registry.values()) {
        if (entry.pollToken === t && !entry.ready) {
            markReady(entry.browser);
            return;
        }
    }
});

// Нативное событие надёжнее JS-пробы и срабатывает даже у страниц без bridge-кода.
mp.events.add('browserDomReady', (browser) => {
    const entry = getEntry(browser);
    if (!entry) return;
    entry.reloading = false;
    markReady(browser);
});

/** Страница сообщила, что app API уже есть (после Vue mount). */
mp.events.add('cef:appReady', (token) => {
    if (token) {
        const t = String(token);
        for (const entry of _registry.values()) {
            if (entry.pollToken === t && !entry.ready) {
                markReady(entry.browser);
                return;
            }
        }
        return;
    }
    const pending = [];
    for (const entry of _registry.values()) {
        if (!entry.ready && entry.browser && mp.browsers.exists(entry.browser)) {
            pending.push(entry);
        }
    }
    if (pending.length === 1) markReady(pending[0].browser);
});

/** Без токена — только если ровно один кандидат (иначе ждём poll). */
mp.events.add('cef:pageReady', (token) => {
    if (token) {
        const t = String(token);
        for (const entry of _registry.values()) {
            if (entry.pollToken === t && !entry.ready) {
                markReady(entry.browser);
                return;
            }
        }
        return;
    }
    const pending = [];
    for (const entry of _registry.values()) {
        if (!entry.ready && entry.browser && mp.browsers.exists(entry.browser)) {
            pending.push(entry);
        }
    }
    if (pending.length === 1) markReady(pending[0].browser);
});

global.browserExec = function browserExec(browser, code) {
    if (!browser || !mp.browsers.exists(browser)) return false;
    const entry = registerBrowser(browser, '');
    if (!code && code !== 0) return true;
    if (entry.ready) {
        rawExecute(browser, code);
    } else {
        entry.queue.push(String(code));
    }
    return true;
};

/**
 * Выполнить код только когда в CEF уже есть нужный API (authMain/SpawnSelect/...).
 * DOM ready недостаточно — Vue/скрипты инициализируются позже.
 */
global.browserExecWhen = function browserExecWhen(browser, waitExpr, code) {
    const wait = String(waitExpr || 'true');
    const body = String(code || '');
    const max = WHEN_MAX_TRIES;
    const iv = WHEN_INTERVAL_MS;
    const wrapped =
        '(function(){var __n=0;function __run(){try{' +
        'if(' +
        wait +
        '){' +
        body +
        ';return;}' +
        'if(++__n>' +
        max +
        ')return;setTimeout(__run,' +
        iv +
        ');' +
        '}catch(_e){if(++__n>' +
        max +
        ')return;setTimeout(__run,' +
        iv +
        ');}}__run();})();';
    return global.browserExec(browser, wrapped);
};

global.browserExecMany = function browserExecMany(browser, codes) {
    if (!Array.isArray(codes)) return global.browserExec(browser, codes);
    codes.forEach((c) => global.browserExec(browser, c));
    return true;
};

global.openManagedCefWhen = function openManagedCefWhen(browser, waitExpr, codes, makeActive) {
    if (!browser || !mp.browsers.exists(browser)) return false;
    registerBrowser(browser, '');
    if (makeActive !== false) {
        try {
            browser.active = true;
        } catch (_e) {}
    }
    const list = Array.isArray(codes) ? codes : [codes];
    list.forEach((c) => global.browserExecWhen(browser, waitExpr, c));
    return true;
};

global.ensureManagedBrowser = function ensureManagedBrowser(current, url) {
    if (current && mp.browsers.exists(current)) {
        registerBrowser(current, url);
        return current;
    }
    let b = null;
    try {
        b = mp.browsers.new(String(url));
    } catch (_e) {}
    if (!b) return current || null;
    try {
        b.active = false;
    } catch (_e2) {}
    registerBrowser(b, url);
    return b;
};

global.recreateManagedBrowser = function recreateManagedBrowser(current, url) {
    if (current && mp.browsers.exists(current)) {
        unregisterBrowser(current);
        try {
            if (typeof current.__cefOrigDestroy === 'function') current.__cefOrigDestroy();
            else current.destroy();
        } catch (_e) {}
    }
    let b = null;
    try {
        b = mp.browsers.new(String(url));
    } catch (_e2) {}
    if (!b) return null;
    try {
        b.active = false;
    } catch (_e3) {}
    registerBrowser(b, url);
    return b;
};

global.isManagedBrowserReady = function isManagedBrowserReady(browser) {
    const entry = getEntry(browser);
    return !!(entry && entry.ready);
};

/**
 * Открыть CEF. Если передан waitExpr — ждёт API.
 * Без waitExpr ведёт себя как раньше (только DOM-очередь) — для простых страниц.
 */
global.openManagedCef = function openManagedCef(browser, codes, makeActive, waitExpr) {
    if (!browser || !mp.browsers.exists(browser)) return false;
    if (waitExpr) {
        return global.openManagedCefWhen(browser, waitExpr, codes, makeActive);
    }
    registerBrowser(browser, '');
    if (makeActive !== false) {
        try {
            browser.active = true;
        } catch (_e) {}
    }
    return global.browserExecMany(browser, Array.isArray(codes) ? codes : [codes]);
};

global.ensureShopBrowserHealthy = function ensureShopBrowserHealthy(current, relPath) {
    const url = global.shopCefUrl(relPath);
    if (current && mp.browsers.exists(current)) {
        const entry = getEntry(current);
        if (!entry || !entry.ready) registerBrowser(current, url);
        return current;
    }
    return global.ensureManagedBrowser(null, url);
};

global.registerCefBrowser = registerBrowser;
global.unregisterCefBrowser = unregisterBrowser;
