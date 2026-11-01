coburaSellBrowser = mp.browsers.new('package://browsers/coburaSell/index.html');
coburaSellBrowser.active = false;

mp.events.add('showCoburaSell', (sellerLogin, coburaName, price) => {
    const safeLogin = String(sellerLogin || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
    const safeName = String(coburaName || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
    const safePrice = String(price || '0').replace(/'/g, "\\'");
    coburaSellBrowser.execute(`setData('${safeLogin}', '${safeName}', '${safePrice}');`);
    coburaSellBrowser.execute(`show();`);
    coburaSellBrowser.active = true;
    mp.gui.cursor.show(true, true);
});

mp.events.add('hideCoburaSell', () => {
    coburaSellBrowser.execute(`hide();`);
    coburaSellBrowser.active = false;
    mp.gui.cursor.show(false, false);
});

mp.events.add('otvetCoburaSell', (otvet) => {
    coburaSellBrowser.execute(`hide();`);
    coburaSellBrowser.active = false;
    mp.gui.cursor.show(false, false);
    mp.events.callRemote('otvetCoburaSell:server', otvet);
});

global.tryCloseCoburaSellEsc = function() {
    if (!coburaSellBrowser || !coburaSellBrowser.active) return false;
    mp.events.call('hideCoburaSell');
    return true;
};
