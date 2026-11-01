kostr = mp.browsers.new('package://browsers/kost/index.html');
kostr.active = false;

mp.events.add('showkost', (login, sum) => {
    kostr.active = true;
    kostr.execute(`show()`);
    kostr.execute(`document.getElementById('login').innerText = '${login}';`);
    kostr.execute(`document.getElementById('sumkost').innerText = '${sum}';`);
});

mp.events.add('hidekost', () => {
    kostr.active = false;
    kostr.execute(`hide()`);
    mp.gui.cursor.show(false, false);
});

mp.events.add('otvetkost', (otvet, amount) => {
    kostr.active = false;
    kostr.execute(`hide()`);
    mp.gui.cursor.show(false, false);
    mp.events.callRemote('otvetkost:server', otvet, amount);
});
