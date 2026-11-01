let adminCheckBrowser = null;

function ensureAdminCheckBrowser() {
    if (!adminCheckBrowser || !mp.browsers.exists(adminCheckBrowser)) {
        adminCheckBrowser = mp.browsers.new('package://browsers/admin_check/index.html');
        adminCheckBrowser.active = true;
        return true;
    }
    return false;
}

function adminCheckRunOpen(payloadJson) {
    try {
        const raw = payloadJson == null ? '{}' : String(payloadJson);
        const arg = JSON.stringify(raw);
        adminCheckBrowser.execute(`adminCheckOpen(${arg})`);
        mp.gui.cursor.visible = true;
    } catch (_e) {}
}

mp.events.add('adminCheck:show', (payloadJson) => {
    try {
        const isNew = ensureAdminCheckBrowser();
        if (isNew) {
            setTimeout(() => adminCheckRunOpen(payloadJson), 500);
        } else {
            adminCheckRunOpen(payloadJson);
        }
    } catch (_e) {}
});

mp.events.add('adminCheck:hide', () => {
    try {
        if (adminCheckBrowser && mp.browsers.exists(adminCheckBrowser)) {
            adminCheckBrowser.execute('adminCheckClose();');
        }
        mp.gui.cursor.visible = false;
    } catch (_e) {}
});
