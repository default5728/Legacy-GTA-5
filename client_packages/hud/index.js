let hudBrowser = null;
let lastStreet = "";
let lastZone = "";
let isLoaded = false;

// Инициализация браузера худа по правильному пути в вашей структуре
mp.events.add('guiReady', () => {
    if (!hudBrowser) {
        hudBrowser = mp.browsers.new('package://hud/index.html');
    }
});

// Событие готовности DOM от HTML
mp.events.add('client:hud:ready', () => {
    isLoaded = true;
});

// Синхронизация данных от сервера (если сервер шлет эвент)
mp.events.add('client:hud:setData', (dataJson) => {
    if (hudBrowser) {
        hudBrowser.execute(`window.hudAPI && window.hudAPI.updatePlayerData('${dataJson}');`);
    }
});

// Отслеживание микрофона
mp.events.add('playerStartTalking', () => {
    if (hudBrowser) hudBrowser.execute(`window.hudAPI && window.hudAPI.setMic(true);`);
});

mp.events.add('playerStopTalking', () => {
    if (hudBrowser) hudBrowser.execute(`window.hudAPI && window.hudAPI.setMic(false);`);
});

// Рендер каждого кадра
mp.events.add('render', () => {
    // 1. Скрываем ненужные стандартные элементы GTA
    mp.game.ui.hideHudComponentThisFrame(2);  // Оружие
    mp.game.ui.hideHudComponentThisFrame(3);  // Наличные
    mp.game.ui.hideHudComponentThisFrame(4);  // MP Наличные
    mp.game.ui.hideHudComponentThisFrame(6);  // Название ТС
    mp.game.ui.hideHudComponentThisFrame(7);  // Район
    mp.game.ui.hideHudComponentThisFrame(8);  // ТС подпись
    mp.game.ui.hideHudComponentThisFrame(9);  // Улица
    mp.game.ui.hideHudComponentThisFrame(13); // Изменение наличных

    if (!hudBrowser) return;

    const player = mp.players.local;

    // Скрываем HUD в меню паузы (ESC)
    if (mp.game.ui.isPauseMenuActive()) {
        hudBrowser.execute(`document.body.style.display = 'none';`);
        return;
    } else {
        hudBrowser.execute(`document.body.style.display = 'block';`);
    }

    // 2. Координаты, район и улица
    const pos = player.position;
    const zoneRaw = mp.game.zone.getNameOfZone(pos.x, pos.y, pos.z);
    const zoneName = mp.game.ui.getLabelText(zoneRaw) || "Los Santos";

    const getStreet = mp.game.pathfind.getStreetNameAtCoord(pos.x, pos.y, pos.z, 0, 0);
    const streetName = mp.game.ui.getStreetNameFromHashKey(getStreet.streetName) || "San Andreas";

    if (zoneName !== lastZone || streetName !== lastStreet) {
        lastZone = zoneName;
        lastStreet = streetName;
        hudBrowser.execute(`window.hudAPI && window.hudAPI.setLocation(${JSON.stringify(zoneName)}, ${JSON.stringify(streetName)});`);
    }

    // 3. Здоровье и Броня
    const hp = player.getHealth();
    const armour = player.getArmour();
    hudBrowser.execute(`window.hudAPI && window.hudAPI.setHealthAndArmor(${hp}, ${armour});`);

    // 4. Локальные данные (ID, имя, деньги из переменных Legacy)
    const playerId = player.remoteId;
    const playerName = player.name || "Player";
    const cash = player.getVariable('money') || player.getVariable('cash') || 0;
    const bank = player.getVariable('bank') || 0;
    const online = mp.players.length;

    hudBrowser.execute(`window.hudAPI && window.hudAPI.setBasicInfo(${playerId}, ${JSON.stringify(playerName)}, ${online}, ${cash}, ${bank});`);
});
