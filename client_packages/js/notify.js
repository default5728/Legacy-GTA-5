/**
 * Уведомления Phantom DM — GTA5RP Notify (downtown ChatAndUI/Notify).
 * Совместимость: notify (Phantom) + notify:client (legacy bloody-dm isNotify).
 */

let notifyBrowser = null;
let notifyDomReady = false;

function ensureNotifyBrowser() {
    if (notifyBrowser === null) {
        notifyBrowser = mp.browsers.new('package://browsers/notify/index.html?v=3');
        if (notifyBrowser) {
            notifyBrowser.active = true;
            notifyBrowser.orderId = 2000;
            global.notifyr = notifyBrowser;
        }
    }
    return notifyBrowser;
}

mp.events.add('browserDomReady', (browser) => {
    if (browser === notifyBrowser) notifyDomReady = true;
});

function mapNotifyType(type) {
    const t = String(type || 'info').toLowerCase();
    if (t === '1' || t === 'info') return 'info';
    if (t === '2' || t === 'error') return 'error';
    if (t === '3' || t === 'success' || t === 'true') return 'success';
    if (t === 'alert' || t === 'warning') return 'warning';
    if (t === 'money' || t === 'money+' || t === 'moneyplus') return 'money+';
    if (t === 'money-' || t === 'money_minus' || t === 'moneyminus') return 'money-';
    if (t === 'bank+' || t === 'bankplus') return 'bank+';
    if (t === 'bank-' || t === 'bankminus') return 'bank-';
    if (t === 'gold') return 'gold';
    return 'info';
}

function formatNotifyText(title, message) {
    const ti = String(title || '').trim();
    const msg = String(message || '').trim();
    if (ti && msg) {
        if (msg.toLowerCase().startsWith(ti.toLowerCase())) return msg;
        if (ti === 'Уведомление' || ti === 'Ошибка' || ti === 'Успешно' || ti === 'Информация') return msg;
        return `${ti}: ${msg}`;
    }
    return msg || ti || '';
}

function decodeNotifyText(str) {
    let s = String(str || '').replace(/\r/g, '').replace(/\n/g, ' ');
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
        try {
            const decoded = decodeURIComponent(s.replace(/\+/g, ' '));
            if (decoded) s = decoded;
        } catch (_e) {}
    }
    return s;
}

function escapeNotifyPayload(str) {
    return decodeNotifyText(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}

function shouldShowGameplayNotify() {
    try {
        if (typeof global.isPreAuthUiBlockingGameplay === 'function' && global.isPreAuthUiBlockingGameplay()) {
            return false;
        }
        if (mp.players.local.getVariable('auth') !== true) return false;
    } catch (_e) {
        return false;
    }
    return true;
}

function setNotifyBrowserActive(active) {
    const browser = ensureNotifyBrowser();
    if (browser && mp.browsers.exists(browser)) {
        browser.active = !!active;
    }
}

function sendHudNotify(type, title, message) {
    if (!shouldShowGameplayNotify()) return;
    const browser = ensureNotifyBrowser();
    if (!browser) return;
    setNotifyBrowserActive(true);

    const notifyType = mapNotifyType(type);
    const text = escapeNotifyPayload(formatNotifyText(title, message));

    const run = () => {
        try {
            browser.execute(`UI_notify_send('${notifyType}', '${text}');`);
        } catch (e) {
            try {
                mp.gui.chat.push(`!{#ff5555}[${notifyType}] ${formatNotifyText(title, message)}`);
            } catch (err) {}
        }
    };

    if (notifyDomReady) {
        run();
    } else {
        setTimeout(run, 300);
    }
}

function dispatchNotify(type, title, message) {
    sendHudNotify(type, title, message);
}

function legacyTypeToTitle(type) {
    switch (parseInt(type, 10)) {
        case 1:
            return 'Информация';
        case 2:
            return 'Ошибка';
        case 3:
            return 'Успешно';
        default:
            return 'Уведомление';
    }
}

mp.events.add('notify:client', (type, pos, message, duration) => {
    void pos;
    void duration;
    sendHudNotify(type, legacyTypeToTitle(type), message);
});

mp.events.add('clientFunc_notify', (type, text) => {
    sendHudNotify(type, '', text);
});

mp.events.add('clientFunc_notifyError', (text) => {
    mp.events.call('clientFunc_notify', 'error', text);
});

mp.events.add('clientFunc_notifySuccess', (text) => {
    mp.events.call('clientFunc_notify', 'success', text);
});

mp.events.add('notify', (type, title, message) => {
    dispatchNotify(type, title, message);
});

mp.events.add('sound:client', () => {
    if (!shouldShowGameplayNotify()) return;
    /* Звук встроен в анимацию Phantom notify — отдельные mp3 не требуются. */
});

global.phantomNotify = dispatchNotify;

mp.events.add('preworldChromeEnforceHidden', () => {
    // В игре (магазин, инвентарь…) HUD прячется, но покупки/ошибки должны оставаться на экране.
    if (shouldShowGameplayNotify()) return;
    setNotifyBrowserActive(false);
});

mp.events.add('AuthShow', () => {
    setNotifyBrowserActive(false);
});

mp.events.add('hideLogin', () => {
    setNotifyBrowserActive(false);
});


function syncNotifyBrowserVisibility() {
    setNotifyBrowserActive(shouldShowGameplayNotify());
}

mp.events.add('lobbySpawnComplete', () => {
    syncNotifyBrowserVisibility();
});

mp.events.addDataHandler('auth', (entity, value) => {
    try {
        if (entity !== mp.players.local) return;
        if (value === true) syncNotifyBrowserVisibility();
        else setNotifyBrowserActive(false);
    } catch (_e) {}
});

mp.events.add('worldUiLockReset', () => {
    setNotifyBrowserActive(false);
});

ensureNotifyBrowser();
setNotifyBrowserActive(false);

mp.events.add('legacy:world:toast',(kind,remainingMs)=>{
 if(!shouldShowGameplayNotify())return;
 const br=ensureNotifyBrowser();br.active=true;
 const run=()=>{if(br&&mp.browsers.exists(br))br.execute('window.UI_purchase_notify&&UI_purchase_notify('+JSON.stringify(kind)+','+Math.max(0,Math.min(30000,Number(remainingMs)||0))+')');};
 if(notifyDomReady)run();else setTimeout(run,300);
});
